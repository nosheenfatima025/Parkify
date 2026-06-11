const EntryExitLog = require("../models/EntryExitLog");
const Vehicle = require("../models/Vehicle");
const Wallet = require("../models/Wallet");
const Payment = require("../models/Payment");
const FraudLog = require("../models/FraudLog");
const Notification = require("../models/Notification");
const FormData = require("form-data");
const fetch = require("node-fetch");
 
const RATE_PER_HOUR = 50;
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5000";
 
const detectPlate = async (imageBuffer, mimetype = "image/jpeg") => {
    try {
        const form = new FormData();
        form.append("image", imageBuffer, { filename: "plate.jpg", contentType: mimetype });
        const res = await fetch(`${FLASK_URL}/detect`, {
            method: "POST",
            body: form,
            headers: { ...form.getHeaders(), "ngrok-skip-browser-warning": "true" },
            timeout: 15000
        });
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Flask ANPR error:", err.message);
        return { success: false, plate: null };
    }
};
 
exports.vehicleEntry = async (req, res) => {
    try {
        let plateNumber = req.body.plateNumber;
        const qrCode = req.body.qrCode;
 
        if (req.file) {
            const result = await detectPlate(req.file.buffer, req.file.mimetype);
            if (result.success && result.plate) {
                plateNumber = result.plate;
            } else {
                return res.status(400).json({ message: "Could not detect plate from image" });
            }
        }
 
        if (!plateNumber) return res.status(400).json({ message: "Plate number required" });
 
        const vehicle = await Vehicle.findOne({ plateNumber });
        if (!vehicle || (qrCode && vehicle.qrCode !== qrCode)) {
            await FraudLog.create({
                numberPlate: plateNumber,
                qrCode: qrCode || null,
                reason: "Plate/QR mismatch or unregistered vehicle"
            });
            return res.status(403).json({ message: "Fraud detected — vehicle not recognized" });
        }
 
        const alreadyIn = await EntryExitLog.findOne({ vehicleId: vehicle._id, status: "IN" });
        if (alreadyIn) return res.status(400).json({ message: "Vehicle already inside" });
 
        const log = await EntryExitLog.create({ vehicleId: vehicle._id, entryTime: new Date() });
 
        await Notification.create({
            userId: vehicle.userId,
            title: "Vehicle Entry",
            message: `${plateNumber} entered parking at ${new Date().toLocaleTimeString()}`,
            type: "ENTRY"
        });
 
        res.json({ message: "Entry allowed", plateNumber, log });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
 
exports.vehicleExit = async (req, res) => {
    try {
        let plateNumber = req.body.plateNumber;
 
        if (req.file) {
            const result = await detectPlate(req.file.buffer, req.file.mimetype);
            if (result.success && result.plate) {
                plateNumber = result.plate;
            } else {
                return res.status(400).json({ message: "Could not detect plate from image" });
            }
        }
 
        if (!plateNumber) return res.status(400).json({ message: "Plate number required" });
 
        const vehicle = await Vehicle.findOne({ plateNumber });
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
 
        const log = await EntryExitLog.findOne({ vehicleId: vehicle._id, status: "IN" });
        if (!log) return res.status(400).json({ message: "No active entry found" });
 
        const minutes = Math.ceil((Date.now() - log.entryTime) / 60000);
        const hours = Math.ceil(minutes / 60);
        const amount = hours * RATE_PER_HOUR;
 
        const wallet = await Wallet.findOne({ userId: vehicle.userId });
        if (!wallet || wallet.balance < amount)
            return res.status(400).json({ message: `Insufficient balance. Need Rs.${amount}` });
 
        wallet.balance -= amount;
        await wallet.save();
 
        log.exitTime = new Date();
        log.durationMinutes = minutes;
        log.amountCharged = amount;
        log.status = "OUT";
        await log.save();
 
        await Payment.create({ userId: vehicle.userId, vehicleId: vehicle._id, amount, status: "SUCCESS" });
 
        await Notification.create({
            userId: vehicle.userId,
            title: "Payment Deducted",
            message: `Rs.${amount} deducted for ${hours}h parking`,
        });
 
        res.json({
            message: "Exit successful",
            plateNumber,
            amount,
            duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
 
exports.detectPlateOnly = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Image required" });
        const result = await detectPlate(req.file.buffer, req.file.mimetype);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
 
// SMART: Admin aaye → sab logs, User aaye → sirf apni gaari ke logs
exports.getAllLogs = async (req, res) => {
    try {
        // Admin hai → sab kuch do
        if (req.user.role === "Admin") {
            const logs = await EntryExitLog.find()
                .populate({
                    path: "vehicleId",
                    select: "plateNumber userId",
                    populate: { path: "userId", select: "name phone email" }
                })
                .sort({ createdAt: -1 });
            return res.json(logs);
        }
 
        // User hai → sirf apni garion ke logs
        const myVehicles = await Vehicle.find({ userId: req.user.id }).select("_id");
        if (!myVehicles.length) return res.json([]);
 
        const vehicleIds = myVehicles.map(v => v._id);
        const logs = await EntryExitLog.find({ vehicleId: { $in: vehicleIds } })
            .populate({ path: "vehicleId", select: "plateNumber" })
            .sort({ createdAt: -1 });
 
        return res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
 
// USER: current parking status — mobile dashboard ke liye
exports.getMyParkingStatus = async (req, res) => {
    try {
        const myVehicles = await Vehicle.find({ userId: req.user.id }).select("_id plateNumber");
        if (!myVehicles.length) return res.json({ parked: false, data: null });
 
        const vehicleIds = myVehicles.map(v => v._id);
        const activeLog = await EntryExitLog.findOne({
            vehicleId: { $in: vehicleIds },
            status: "IN"
        }).populate("vehicleId", "plateNumber");
 
        if (!activeLog) return res.json({ parked: false, data: null });
 
        const minutes = Math.ceil((Date.now() - activeLog.entryTime) / 60000);
        const hours = Math.ceil(minutes / 60);
 
        res.json({
            parked: true,
            data: {
                plateNumber: activeLog.vehicleId?.plateNumber,
                entryTime: activeLog.entryTime,
                duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
                estimatedAmount: hours * RATE_PER_HOUR
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};