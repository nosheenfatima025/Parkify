
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, token missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let account;

        if (decoded.role === "Admin") {
            account = await Admin.findById(decoded.id).select("-passwordHash");
        } else {
            account = await User.findById(decoded.id).select("-passwordHash");
        }

        if (!account) {
            return res.status(401).json({ message: "User not found" });
        }

        // 🔥 UNIFIED USER OBJECT (IMPORTANT FIX)
        req.user = {
            id: account._id,
            role: decoded.role,
            data: account
        };

        next();

    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

exports.adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== "Admin") {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};