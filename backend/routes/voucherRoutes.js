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
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Customer endpoints
router.get("/available", getAvailableVouchers);
router.get("/my-vouchers", requireAuth, getCustomerVouchers);
router.post("/validate", requireAuth, validateVoucher);

// Merchant / Seller endpoints
router.get("/merchant/my-vouchers", requireAuth, getMerchantVouchers);
router.post("/merchant/create", requireAuth, createMerchantVoucher);
router.patch("/merchant/:id/status", requireAuth, toggleMerchantVoucherStatus);
router.delete("/merchant/:id", requireAuth, deleteMerchantVoucher);

module.exports = router;
