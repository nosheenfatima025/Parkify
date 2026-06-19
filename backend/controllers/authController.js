const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Wallet = require("../models/Wallet");
const Vehicle = require("../models/Vehicle");
const QRCode = require("qrcode");

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.userRegister = async (req, res) => {
    try {
        const { name, phone, email, password, plateNumber } = req.body;
        if (!name || !phone || !email || !password || !plateNumber)
            return res.status(400).json({ message: "All fields required" });
        const exists = await User.findOne({ $or: [{ phone }, { email }] });
        if (exists) return res.status(400).json({ message: "User already exists" });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, phone, email, passwordHash });
        await Wallet.create({ userId: user._id });
        const qrData = JSON.stringify({ userId: user._id, plateNumber });
        const qrCode = await QRCode.toDataURL(qrData);
        await Vehicle.create({ userId: user._id, plateNumber, qrCode });
        res.status(201).json({
            message: "User registered successfully",
            user: { _id: user._id, name: user.name, phone: user.phone, email: user.email },
            token: generateToken(user._id, user.role),
            qrCode
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
        res.json({
            message: "Login successful",
            user: { _id: user._id, name: user.name, phone: user.phone, email: user.email },
            token: generateToken(user._id, user.role)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: "Admin not found" });
        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
        res.json({
            message: "Admin login successful",
            admin: { _id: admin._id, email: admin.email, role: admin.role },
            token: generateToken(admin._id, admin.role)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
