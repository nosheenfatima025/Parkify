const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
    addVehicle,
    getAllVehicles,
    getMyVehicles,
    deactivateVehicle
} = require("../controllers/vehicleController");

router.post("/add", protect, addVehicle);
router.get("/all", protect, adminOnly, getAllVehicles);
router.get("/my", protect, getMyVehicles);
router.put("/:id/deactivate", protect, deactivateVehicle);

module.exports = router;