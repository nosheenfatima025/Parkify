const jwt = require("jsonwebtoken");

exports.refreshToken = (req, res) => {
    try {
        const token = req.cookies?.jwt;

        if (!token) {
            return res.status(403).json({ message: "No refresh token found" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const newToken = jwt.sign(
            {
                id: decoded.id,
                role: decoded.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h" 
            }
        );

        res.cookie("jwt", newToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        return res.json({
            message: "Token refreshed"
        });

    } catch (error) {
        console.error("refreshToken error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};