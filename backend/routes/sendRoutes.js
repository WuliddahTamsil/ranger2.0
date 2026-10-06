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
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// 1. Fare calculation (accessible for preview)
router.post("/fare-estimate", estimateFare);

// 2. Customer endpoints (requireAuth enforced)
router.post("/orders", requireAuth, createOrder);
router.post("/", requireAuth, createOrder);

router.get("/orders/customer/:customerId", requireAuth, getCustomerOrders);
router.get("/customer/:customerId", requireAuth, getCustomerOrders);

// 3. Driver endpoints (supports optionalAuth with driverId header/body fallback)
router.get("/orders/available", optionalAuth, getAvailableOrders);
router.get("/available", optionalAuth, getAvailableOrders);

router.get("/orders/driver", optionalAuth, getDriverOrders);
router.get("/driver", optionalAuth, getDriverOrders);
router.get("/driver/:driverId", optionalAuth, getAvailableOrders);
router.get("/orders/driver/:driverId", optionalAuth, getAvailableOrders);

router.post("/orders/:id/accept", optionalAuth, acceptOrder);
router.post("/:id/accept", optionalAuth, acceptOrder);

router.post("/orders/:id/decline", optionalAuth, declineOrder);
router.post("/:id/decline", optionalAuth, declineOrder);

// 4. Operational & Status endpoints
router.get("/orders/:id", optionalAuth, getOrderById);
router.get("/:id", optionalAuth, getOrderById);
router.get("/orders/:id/tracking", optionalAuth, getOrderById);
router.get("/:id/tracking", optionalAuth, getOrderById);

router.put("/orders/:id/status", optionalAuth, updateOrderStatus);
router.put("/:id/status", optionalAuth, updateOrderStatus);

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
