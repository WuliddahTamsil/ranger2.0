const express = require("express");
const {
  estimateFare,
  createOrder,
  getCustomerOrders,
  getOrderById,
  getAvailableOrders,
  getDriverOrders,
  acceptOrder,
  declineOrder,
  updateDriverLocation,
  verifyPickup,
  verifyDelivery,
  uploadDeliveryProof,
  updateOrderStatus,
  cancelOrder,
  submitRating,
  submitComplaint,
  adminGetOrders,
  adminUpdatePricing,
} = require("../controllers/sendOrderController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// 1. Fare calculation (accessible for preview)
router.post("/fare-estimate", estimateFare);

// 2. Customer endpoints (requireAuth enforced)
router.post("/orders", requireAuth, createOrder);
router.post("/", requireAuth, createOrder);

router.get("/orders/customer/:customerId", requireAuth, getCustomerOrders);
router.get("/customer/:customerId", requireAuth, getCustomerOrders);

// 3. Driver endpoints (requireAuth enforced)
router.get("/orders/available", requireAuth, getAvailableOrders);
router.get("/available", requireAuth, getAvailableOrders);

router.get("/orders/driver", requireAuth, getDriverOrders);
router.get("/driver", requireAuth, getDriverOrders);

router.post("/orders/:id/accept", requireAuth, acceptOrder);
router.post("/:id/accept", requireAuth, acceptOrder);

router.post("/orders/:id/decline", requireAuth, declineOrder);
router.post("/:id/decline", requireAuth, declineOrder);

// 4. Operational & Status endpoints (requireAuth enforced)
router.get("/orders/:id", requireAuth, getOrderById);
router.get("/:id", requireAuth, getOrderById);
router.get("/orders/:id/tracking", requireAuth, getOrderById);
router.get("/:id/tracking", requireAuth, getOrderById);

router.put("/orders/:id/status", requireAuth, updateOrderStatus);
router.put("/:id/status", requireAuth, updateOrderStatus);

router.put("/orders/:id/location", requireAuth, updateDriverLocation);
router.put("/:id/location", requireAuth, updateDriverLocation);

router.post("/orders/:id/verify-pickup", requireAuth, verifyPickup);
router.post("/:id/verify-pickup", requireAuth, verifyPickup);

router.post("/orders/:id/verify-delivery", requireAuth, verifyDelivery);
router.post("/:id/verify-delivery", requireAuth, verifyDelivery);

router.post("/orders/:id/delivery-proof", requireAuth, uploadDeliveryProof);
router.post("/:id/delivery-proof", requireAuth, uploadDeliveryProof);

router.post("/orders/:id/cancel", requireAuth, cancelOrder);
router.post("/:id/cancel", requireAuth, cancelOrder);

router.post("/orders/:id/rating", requireAuth, submitRating);
router.post("/:id/rating", requireAuth, submitRating);

router.post("/orders/:id/complaints", requireAuth, submitComplaint);
router.post("/:id/complaints", requireAuth, submitComplaint);

// 5. Admin endpoints
router.get("/admin/orders", requireAuth, requireRole("admin"), adminGetOrders);
router.put("/admin/pricing", requireAuth, requireRole("admin"), adminUpdatePricing);

module.exports = router;
