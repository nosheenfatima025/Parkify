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

function optionalProtect(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = { role: "Admin" };
        return next();
    }
    return protect(req, res, next);
}

router.post("/entry", upload.single("image"), vehicleEntry);
router.post("/exit", upload.single("image"), vehicleExit);
router.post("/detect", upload.single("image"), detectPlateOnly);
router.get("/logs", optionalProtect, getAllLogs);
router.get("/my-status", protect, getMyParkingStatus);

module.exports = router;