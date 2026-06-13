// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const dotenv = require("dotenv");
// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors({
//     origin: function(origin, callback) {
//         callback(null, true);
//     },
//     credentials: true,
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/parkingDB")
//     .then(() => console.log("✅ MongoDB connected!"))
//     .catch((err) => console.log("❌ MongoDB error:", err));

// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/vehicles", require("./routes/vehicleRoutes"));
// app.use("/api/wallet", require("./routes/walletRoutes"));
// app.use("/api/parking", require("./routes/entryexitRoutes"));
// app.use("/api/admin", require("./routes/adminRoutes"));
// app.use("/api/notification", require("./routes/notificationRoutes"));
// app.use("/api/fraud", require("./routes/fraudRoutes"));
// app.use("/api/rates", require("./routes/ratesRoutes"));

// const FLASK_URL = "https://unmisanthropically-supranaturalistic-lorretta.ngrok-free.dev";
// app.set('flaskUrl', FLASK_URL);

// app.get("/", (req, res) => res.json({ message: "Parkify API Running ✅" }));

// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// FIX: vercel ke sare URLs allow karo wildcard se
app.use(cors({
    origin: function (origin, callback) {
        // Koi bhi vercel.app URL allow karo + localhost
        if (!origin) return callback(null, true);
        if (
            origin.includes("vercel.app") ||
            origin.includes("localhost") ||
            origin.includes("127.0.0.1")
        ) {
            return callback(null, true);
        }
        return callback(new Error("CORS not allowed: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"]
}));

app.options("*", cors());

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