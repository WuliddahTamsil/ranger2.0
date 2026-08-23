const express = require("express");
const {
  registerUser,
  loginUser,
  getMitraAccounts,
  updateMitraStatus,
  getUserProfile,
  updateUserProfile,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/mitra", getMitraAccounts);
router.put("/mitra/:id/status", updateMitraStatus);
router.get("/profile/:id", getUserProfile);
router.put("/profile/:id", updateUserProfile);

module.exports = router;
