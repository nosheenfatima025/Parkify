
const express = require("express");
const router = express.Router();
const { userRegister, userLogin, adminLogin } = require("../controllers/authController");

router.post("/register", userRegister);
router.post("/login", userLogin);
router.post("/admin/login", adminLogin);

module.exports = router;
