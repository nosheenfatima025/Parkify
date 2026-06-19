const Wallet = require("../models/Wallet");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");

// Wallet dhundo ya naya banao
const findOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0, lastUpdated: new Date() });
    }
    return wallet;
};

exports.getWallet = async (req, res) => {
    try {
        const wallet = await findOrCreateWallet(req.user._id);
        res.json({ balance: wallet.balance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.rechargeWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

        const wallet = await findOrCreateWallet(req.user._id);
        wallet.balance += Number(amount);
        wallet.lastUpdated = new Date();
        await wallet.save();

        res.json({ message: "Wallet recharged", balance: wallet.balance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllWallets = async (req, res) => {
    try {
        const wallets = await Wallet.find().populate("userId", "name phone email");
        res.json(wallets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.adminTopUp = async (req, res) => {
    try {
        const { plateNumber, amount } = req.body;
        if (!plateNumber || !amount || amount <= 0)
            return res.status(400).json({ message: "plateNumber and amount required" });

        const vehicle = await Vehicle.findOne({ plateNumber });
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        let wallet = await Wallet.findOne({ userId: vehicle.userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId: vehicle.userId, balance: 0, lastUpdated: new Date() });
        }

        wallet.balance += Number(amount);
        wallet.lastUpdated = new Date();
        await wallet.save();

        res.json({ message: `Rs.${amount} added to ${plateNumber}`, balance: wallet.balance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};