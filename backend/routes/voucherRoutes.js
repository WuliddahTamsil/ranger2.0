const express = require("express");
const {
  getAvailableVouchers,
  getCustomerVouchers,
  validateVoucher,
} = require("../controllers/voucherController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/available", getAvailableVouchers);
router.get("/my-vouchers", requireAuth, getCustomerVouchers);
router.post("/validate", requireAuth, validateVoucher);

module.exports = router;
