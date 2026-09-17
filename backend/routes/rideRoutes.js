const express = require("express");
const {
  createRideOrder,
  getCustomerRideOrders,
  getActiveCustomerRide,
  getDriverRideOrders,
  getRideOrderById,
  acceptRideOrder,
  declineRideOrder,
  updateRideStatus,
  rateRideOrder,
  estimateRideFare,
} = require("../controllers/rideOrderController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// Fare calculation endpoint (public or authenticated)
router.post("/fare-estimate", estimateRideFare);

// Customer endpoints
router.post("/", optionalAuth, createRideOrder);
router.get("/customer/:customerId", optionalAuth, getCustomerRideOrders);
router.get("/active/customer/:customerId", optionalAuth, getActiveCustomerRide);

// Driver endpoints
router.get("/driver", optionalAuth, getDriverRideOrders);
router.get("/driver/:driverId", optionalAuth, getDriverRideOrders);
router.post("/:id/accept", requireAuth, requireRole("driver"), acceptRideOrder);
router.post("/:id/decline", optionalAuth, declineRideOrder);

// Shared endpoints (Customer & Driver)
router.get("/:id", optionalAuth, getRideOrderById);
router.put("/:id/status", optionalAuth, updateRideStatus);
router.post("/:id/rating", optionalAuth, rateRideOrder);

module.exports = router;
