const express = require("express");
const {
  createPayment,
  getPaymentStatus,
  handlePaymentWebhook,
  simulatePaymentWebhook,
  getOrderPayments,
  updateOrderPaymentMethod,
} = require("../controllers/paymentController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Public webhook endpoint from payment gateway provider (Midtrans callback)
router.post("/webhook", handlePaymentWebhook);
router.get("/webhook", (req, res) => {
  return res.status(200).json({ status: "OK", message: "Midtrans Webhook endpoint is active and listening." });
});
router.head("/webhook", (req, res) => res.status(200).end());

// Payment method update (Protected by user authentication)
router.patch("/order/:orderId/method", requireAuth, updateOrderPaymentMethod);
router.post("/update-method", requireAuth, updateOrderPaymentMethod);

// Payment creation (Protected by user authentication)
router.post("/", requireAuth, createPayment);
router.post("/create", requireAuth, createPayment);

// Payment simulation (Strictly protected by admin in development)
router.post("/simulate", requireAuth, requireRole("admin"), simulatePaymentWebhook);
router.post("/:paymentId/simulate", requireAuth, requireRole("admin"), simulatePaymentWebhook);

// Payment query endpoints (Protected by user authentication)
router.get("/order/:orderId", requireAuth, getOrderPayments);
router.get("/:paymentId", requireAuth, getPaymentStatus);
router.get("/:paymentId/status", requireAuth, getPaymentStatus);

module.exports = router;
