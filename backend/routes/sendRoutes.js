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
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const driverGuard = [requireAuth, requireRole("driver", "admin")];

// 1. Fare calculation (accessible for preview)
router.post("/fare-estimate", estimateFare);

// 2. Customer endpoints (requireAuth enforced)
router.post("/orders", requireAuth, createOrder);
router.post("/", requireAuth, createOrder);

router.get("/orders/customer/:customerId", requireAuth, getCustomerOrders);
router.get("/customer/:customerId", requireAuth, getCustomerOrders);

// 3. Driver endpoints (strictly protected by driverGuard)
router.get("/orders/available", ...driverGuard, getAvailableOrders);
router.get("/available", ...driverGuard, getAvailableOrders);

router.get("/orders/driver", ...driverGuard, getDriverOrders);
router.get("/driver", ...driverGuard, getDriverOrders);
router.get("/driver/:driverId", ...driverGuard, getDriverOrders);
router.get("/orders/driver/:driverId", ...driverGuard, getDriverOrders);

router.post("/orders/:id/accept", ...driverGuard, acceptOrder);
router.post("/:id/accept", ...driverGuard, acceptOrder);

router.post("/orders/:id/decline", ...driverGuard, declineOrder);
router.post("/:id/decline", ...driverGuard, declineOrder);

// 4. Operational & Status endpoints (requireAuth enforced)
router.get("/orders/:id", requireAuth, getOrderById);
router.get("/:id", requireAuth, getOrderById);
router.get("/orders/:id/tracking", requireAuth, getOrderById);
router.get("/:id/tracking", requireAuth, getOrderById);

router.put("/orders/:id/status", requireAuth, updateOrderStatus);
router.put("/:id/status", requireAuth, updateOrderStatus);

router.put("/orders/:id/location", ...driverGuard, updateDriverLocation);
router.put("/:id/location", ...driverGuard, updateDriverLocation);

router.post("/orders/:id/verify-pickup", ...driverGuard, verifyPickup);
router.post("/:id/verify-pickup", ...driverGuard, verifyPickup);

router.post("/orders/:id/verify-delivery", ...driverGuard, verifyDelivery);
router.post("/:id/verify-delivery", ...driverGuard, verifyDelivery);

router.post("/orders/:id/delivery-proof", ...driverGuard, uploadDeliveryProof);
router.post("/:id/delivery-proof", ...driverGuard, uploadDeliveryProof);

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
