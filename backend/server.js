const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// ===== PORT =====
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== MONGO DB (LOCAL) =====
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/parkingDB";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((err) => console.log("❌ MongoDB error:", err));

// ===== ROUTES =====
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/parking", require("./routes/entryexitRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("/api/fraud", require("./routes/fraudRoutes"));
app.use("/api/rates", require("./routes/ratesRoutes"));

// ===== FLASK LOCAL =====
const FLASK_URL = process.env.FLASK_URL || "http://127.0.0.1:5000";
app.set("flaskUrl", FLASK_URL);

// ===== HOME ROUTE =====
app.get("/", (req, res) => {
    res.json({ message: "🚀 Parkify API Running on Localhost" });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

module.exports = app;