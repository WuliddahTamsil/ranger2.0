const express = require("express");
const {
  registerUser,
  loginUser,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
  getMitraAccounts,
  getAllUsers,
  updateMitraStatus,
  getUserProfile,
  updateUserProfile,
  getSystemStats,
  getAllPlatformTransactions,
  getDocumentRequirements,
  adminVerifyDocument,
  deleteAccount,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);
router.delete("/delete-account", requireAuth, deleteAccount);
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

