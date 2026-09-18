const express = require("express");
const {
  estimateRideFare,
  createRideOrder,
  getCustomerRideOrders,
  getActiveCustomerRide,
  getDriverRideOrders,
  getRideOrderById,
  acceptRideOrder,
  declineRideOrder,
  updateRideStatus,
  updateDriverLocation,
  cancelRideOrder,
  rateRideOrder,
  submitRideComplaint,
} = require("../controllers/rideOrderController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// Fare calculation endpoint
router.post("/fare-estimate", estimateRideFare);

// Customer endpoints
router.post("/", optionalAuth, createRideOrder);
router.post("/orders", optionalAuth, createRideOrder);

router.get("/customer/:customerId", optionalAuth, getCustomerRideOrders);
router.get("/orders/customer/:customerId", optionalAuth, getCustomerRideOrders);

router.get("/active/customer/:customerId", optionalAuth, getActiveCustomerRide);
router.get("/orders/active/customer/:customerId", optionalAuth, getActiveCustomerRide);

// Driver endpoints
router.get("/available", optionalAuth, getDriverRideOrders);
router.get("/orders/available", optionalAuth, getDriverRideOrders);

router.get("/driver", optionalAuth, getDriverRideOrders);
router.get("/driver/:driverId", optionalAuth, getDriverRideOrders);
router.get("/orders/driver", optionalAuth, getDriverRideOrders);
router.get("/orders/driver/:driverId", optionalAuth, getDriverRideOrders);

router.post("/:id/accept", requireAuth, requireRole("driver"), acceptRideOrder);
router.post("/orders/:id/accept", requireAuth, requireRole("driver"), acceptRideOrder);

router.post("/:id/decline", optionalAuth, declineRideOrder);
router.post("/orders/:id/decline", optionalAuth, declineRideOrder);

// Tracking & Operational endpoints
router.get("/:id", optionalAuth, getRideOrderById);
router.get("/orders/:id", optionalAuth, getRideOrderById);
router.get("/:id/tracking", optionalAuth, getRideOrderById);
router.get("/orders/:id/tracking", optionalAuth, getRideOrderById);

router.put("/:id/status", optionalAuth, updateRideStatus);
router.put("/orders/:id/status", optionalAuth, updateRideStatus);

router.put("/:id/location", optionalAuth, updateDriverLocation);
router.put("/orders/:id/location", optionalAuth, updateDriverLocation);

router.post("/:id/cancel", optionalAuth, cancelRideOrder);
router.post("/orders/:id/cancel", optionalAuth, cancelRideOrder);

router.post("/:id/rating", optionalAuth, rateRideOrder);
router.post("/orders/:id/rating", optionalAuth, rateRideOrder);

router.post("/:id/complaint", optionalAuth, submitRideComplaint);
router.post("/orders/:id/complaint", optionalAuth, submitRideComplaint);

module.exports = router;
