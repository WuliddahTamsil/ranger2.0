const express = require("express");
const {
  getWallet,
  getLedger,
  createRedemption,
  getCustomerRedemptions,
  payRedemption,
  rejectRedemption,
} = require("../controllers/pointController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Digital Savings Book & Points Wallet
router.get("/wallet", requireAuth, getWallet);
router.get("/ledger", requireAuth, getLedger);

// Redemptions
router.post("/redemptions", requireAuth, createRedemption);
router.get("/redemptions/customer/:customerId", requireAuth, getCustomerRedemptions);
router.post("/redemptions/:id/pay", requireAuth, payRedemption);
router.post("/redemptions/:id/reject", requireAuth, rejectRedemption);

module.exports = router;
