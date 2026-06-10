const jwt = require("jsonwebtoken");

const VerifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token found" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            role: decoded.role || "User"
        };

        next();

    } catch (error) {
        console.error("VerifyToken error:", error.message);
        return res.status(403).json({ message: "Invalid token" });
    }
};

module.exports = VerifyToken;