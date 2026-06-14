const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
    vehicleEntry,
    vehicleExit,
    getAllLogs,
    detectPlateOnly,
    getMyParkingStatus
} = require("../controllers/entryExitController");

const { protect } = require("../middleware/authMiddleware");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// FIX: optionalProtect pehle define karo, phir use karo
function optionalProtect(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        // Token nahi aaya — web app admin hai
        req.user = { role: "Admin" };
        return next();
    }
    return protect(req, res, next);
}

router.post("/add", addVehicle);
router.get("/all", getAllVehicles);
router.get("/my", getMyVehicles);
router.post("/deactivate/:id", deactivateVehicle);

module.exports = router;