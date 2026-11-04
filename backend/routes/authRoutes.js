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
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Public auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);
router.get("/document-requirements", getDocumentRequirements);

// Authenticated user routes
router.delete("/delete-account", requireAuth, deleteAccount);
router.get("/profile/:id", requireAuth, getUserProfile);
router.put("/profile/:id", requireAuth, updateUserProfile);

// Strictly Protected Admin routes
router.get("/mitra", requireAuth, requireRole("admin", "pemilik_marketplace", "pemilik_catering"), getMitraAccounts);
router.get("/users", requireAuth, requireRole("admin"), getAllUsers);
router.put("/mitra/:id/status", requireAuth, requireRole("admin"), updateMitraStatus);
router.get("/admin/stats", requireAuth, requireRole("admin"), getSystemStats);
router.get("/admin/transactions", requireAuth, requireRole("admin"), getAllPlatformTransactions);
router.put("/admin/verify-document", requireAuth, requireRole("admin"), adminVerifyDocument);

module.exports = router;
