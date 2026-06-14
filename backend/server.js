const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        callback(null, true);
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/parkingDB")
    .then(() => console.log("✅ MongoDB connected!"))
    .catch((err) => console.log("❌ MongoDB error:", err));


    const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

const createDefaultAdmin = async () => {
    try {
        const existing = await Admin.findOne({
            email: process.env.ADMIN_EMAIL
        });

        if (existing) {
            console.log("Admin already exists");
            return;
        }

        const hashedPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD,
            10
        );

        await Admin.create({
            name: "Super Admin",
            email: process.env.ADMIN_EMAIL,
            passwordHash: hashedPassword,
            role: "Admin"
        });

        console.log("Default admin created");
    } catch (err) {
        console.log("Admin init error:", err.message);
    }
};

createDefaultAdmin();

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/parking", require("./routes/entryexitRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("/api/fraud", require("./routes/fraudRoutes"));
app.use("/api/rates", require("./routes/ratesRoutes"));

const FLASK_URL = "https://unmisanthropically-supranaturalistic-lorretta.ngrok-free.dev";
app.set('flaskUrl', FLASK_URL);

app.get("/", (req, res) => res.json({ message: "Parkify API Running ✅" }));

module.exports = app;