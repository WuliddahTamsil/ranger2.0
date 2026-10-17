const express = require("express");
const {
  registerUser,
  loginUser,
  getMitraAccounts,
  getAllUsers,
  updateMitraStatus,
  getUserProfile,
  updateUserProfile,
  getSystemStats,
  getAllPlatformTransactions,
  getDocumentRequirements,
  adminVerifyDocument,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/mitra", getMitraAccounts);
router.get("/users", getAllUsers);
router.put("/mitra/:id/status", updateMitraStatus);
router.get("/profile/:id", getUserProfile);
router.put("/profile/:id", updateUserProfile);
router.get("/admin/stats", getSystemStats);
router.get("/admin/transactions", getAllPlatformTransactions);
router.get("/document-requirements", getDocumentRequirements);
router.put("/admin/verify-document", adminVerifyDocument);

module.exports = router;

