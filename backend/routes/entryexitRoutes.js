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
 
// Gate routes
router.post("/entry", upload.single("image"), vehicleEntry);
router.post("/exit", upload.single("image"), vehicleExit);
router.post("/detect", upload.single("image"), detectPlateOnly);
 
// SMART: Admin → sab logs | User → sirf apni gaari ke logs
// Dono same endpoint use karein — backend khud filter karega
router.get("/logs", protect, getAllLogs);
 
// Mobile dashboard ke liye current status
router.get("/my-status", protect, getMyParkingStatus);
 
module.exports = router;