const express = require("express");
const {
  createPayment,
  getPaymentStatus,
  handlePaymentWebhook,
  simulatePaymentWebhook,
  getOrderPayments,
  updateOrderPaymentMethod,
} = require("../controllers/paymentController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Public webhook endpoint from payment gateway provider (supports POST notification, GET ping, and HEAD check)
router.post("/webhook", handlePaymentWebhook);
router.get("/webhook", (req, res) => {
  return res.status(200).json({ status: "OK", message: "Midtrans Webhook endpoint is active and listening." });
});
router.head("/webhook", (req, res) => res.status(200).end());

// Payment method update (decoupled from payment execution)
router.patch("/order/:orderId/method", optionalAuth, updateOrderPaymentMethod);
router.post("/update-method", optionalAuth, updateOrderPaymentMethod);

// Payment endpoints (support both REST and legacy style routes)
router.post("/", createPayment);
router.post("/create", createPayment);

router.post("/simulate", simulatePaymentWebhook);
router.post("/:paymentId/simulate", simulatePaymentWebhook);

router.get("/order/:orderId", requireAuth, getOrderPayments);

router.get("/:paymentId", getPaymentStatus);
router.get("/:paymentId/status", getPaymentStatus);

module.exports = router;
