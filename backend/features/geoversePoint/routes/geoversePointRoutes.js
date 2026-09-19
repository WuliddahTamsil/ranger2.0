/**
 * geoversePointRoutes.js
 * Express router for canonical /api/geoverse-points and backward-compatible /api/points
 */

const express = require("express");
const { requireAuth } = require("../../../middleware/authMiddleware");
const {
  getWallet,
  getLedger,
  getRecent,
  getVouchers,
  createRedemption,
  getRedemptions,
  getRedemptionDetail,
  cancelRedemption,
  payRedemption,
  rejectRedemption,
  adminAdjustment,
  getConfig,
} = require("../controllers/geoversePointController");
const { enforceWalletOwner, enforceStaffOrAdmin } = require("../policies/pointAccessPolicy");
const { validateCreateRedemption, validateAdminAdjustment } = require("../validators/geoversePointValidators");

const router = express.Router();

// Public / Authenticated Configuration
router.get("/config", getConfig);

// Digital Wallet & Ledger
router.get("/wallet", requireAuth, enforceWalletOwner, getWallet);
router.get("/ledger", requireAuth, enforceWalletOwner, getLedger);
router.get("/recent-activity", requireAuth, enforceWalletOwner, getRecent);

// Vouchers catalogue
router.get("/vouchers", requireAuth, getVouchers);

// Redemptions (Voucher & Cash)
router.get("/redemptions", requireAuth, getRedemptions);
router.post("/redemptions", requireAuth, validateCreateRedemption, createRedemption);
router.get("/redemptions/:id", requireAuth, getRedemptionDetail);
router.post("/redemptions/:id/cancel", requireAuth, cancelRedemption);

// Compatibility alias for old endpoint
router.get("/redemptions/customer/:customerId", requireAuth, (req, res) => {
  return getRedemptions(req, res);
});

// Staff / Admin Endpoints
router.post("/redemptions/:id/pay", requireAuth, enforceStaffOrAdmin, payRedemption);
router.post("/redemptions/:id/reject", requireAuth, enforceStaffOrAdmin, rejectRedemption);
router.post("/admin/adjust", requireAuth, enforceStaffOrAdmin, validateAdminAdjustment, adminAdjustment);

module.exports = router;
