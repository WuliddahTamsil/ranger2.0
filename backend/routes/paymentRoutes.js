const express = require("express");
const {
  createPayment,
  getPaymentStatus,
  handlePaymentWebhook,
  simulatePaymentWebhook,
  getOrderPayments,
} = require("../controllers/paymentController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Public webhook endpoint from payment gateway provider
router.post("/webhook", handlePaymentWebhook);

// Payment endpoints (support both REST and legacy style routes)
router.post("/", createPayment);
router.post("/create", createPayment);

router.post("/simulate", simulatePaymentWebhook);
router.post("/:paymentId/simulate", simulatePaymentWebhook);

router.get("/order/:orderId", requireAuth, getOrderPayments);

router.get("/:paymentId", getPaymentStatus);
router.get("/:paymentId/status", getPaymentStatus);

module.exports = router;
