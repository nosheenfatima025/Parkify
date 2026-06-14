const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.includes("vercel.app") || origin.includes("localhost")) {
            return callback(null, true);
        }
        return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"]
};

// FIX: "/*" instead of "*" — naye Express mein wildcard aisa likhte hain
app.use(cors(corsOptions));
app.options("/*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/parkingDB")
    .then(() => console.log("✅ MongoDB connected!"))
    .catch((err) => console.log("❌ MongoDB error:", err));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/parking", require("./routes/entryexitRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("/api/fraud", require("./routes/fraudRoutes"));
app.use("/api/rates", require("./routes/ratesRoutes"));

app.get("/", (req, res) => res.json({ message: "Parkify API Running ✅" }));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));