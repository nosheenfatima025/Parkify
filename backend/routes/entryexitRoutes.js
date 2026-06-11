
const express = require("express");
const router = express.Router();
const multer = require("multer");

const { 
    vehicleEntry, 
    vehicleExit, 
    getAllLogs, 
    detectPlateOnly 
} = require("../controllers/entryExitController");

const { protect } = require("../middleware/authMiddleware");

// Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/entry", upload.single("image"), vehicleEntry);
router.post("/exit", upload.single("image"), vehicleExit);
router.post("/detect", upload.single("image"), detectPlateOnly);

router.get("/logs", protect, getAllLogs);

module.exports = router;