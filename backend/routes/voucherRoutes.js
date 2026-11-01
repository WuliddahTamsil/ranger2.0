const express = require("express");
const {
  getAvailableVouchers,
  getCustomerVouchers,
  validateVoucher,
  createMerchantVoucher,
  getMerchantVouchers,
  toggleMerchantVoucherStatus,
  deleteMerchantVoucher,
} = require("../controllers/voucherController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const merchantRoles = [
  "pemilik_marketplace",
  "pemilik_shop",
  "pemilik_catering",
  "pemilik_laundry",
  "admin",
];

// Customer endpoints
router.get("/available", getAvailableVouchers);
router.get("/my-vouchers", requireAuth, getCustomerVouchers);
router.post("/validate", requireAuth, validateVoucher);

// Merchant / Seller endpoints (Protected by auth and role)
router.get("/merchant/my-vouchers", requireAuth, requireRole(...merchantRoles), getMerchantVouchers);
router.post("/merchant/create", requireAuth, requireRole(...merchantRoles), createMerchantVoucher);
router.patch("/merchant/:id/status", requireAuth, requireRole(...merchantRoles), toggleMerchantVoucherStatus);
router.delete("/merchant/:id", requireAuth, requireRole(...merchantRoles), deleteMerchantVoucher);

module.exports = router;
