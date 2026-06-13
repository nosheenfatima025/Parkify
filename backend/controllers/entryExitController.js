const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const QRCode = require("qrcode");

exports.addVehicle = async (req, res) => {
    try {
        const { plateNumber } = req.body;
        const userId = req.user.id;

        if (!plateNumber) {
            return res.status(400).json({ message: "plateNumber required" });
        }

        // Plate already registered check
        const plateExists = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
        if (plateExists) {
            return res.status(400).json({ message: "Vehicle already registered" });
        }

        const qrCode = await QRCode.toDataURL(
            JSON.stringify({ plateNumber: plateNumber.toUpperCase(), userId })
        );

        const vehicle = await Vehicle.create({
            userId,
            plateNumber: plateNumber.toUpperCase(),
            qrCode
        });

        res.status(201).json({ message: "Vehicle added successfully", vehicle });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllVehicles = async (req, res) => {
    try {
        if (req.user.role !== "Admin") {
            return res.status(403).json({ message: "Access denied" });
        }
        const vehicles = await Vehicle.find()
            .populate("userId", "name phone email")
            .sort({ createdAt: -1 });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ userId: req.user.id });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deactivateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        if (vehicle.userId.toString() !== req.user.id && req.user.role !== "Admin") {
            return res.status(403).json({ message: "Not allowed" });
        }
        vehicle.isActive = false;
        await vehicle.save();
        res.json({ message: "Vehicle deactivated" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};