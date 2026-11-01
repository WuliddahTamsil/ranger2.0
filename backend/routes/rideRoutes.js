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
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const driverGuard = [requireAuth, requireRole("driver", "admin")];

// Fare calculation endpoint (Public quote calculation)
router.post("/fare-estimate", estimateRideFare);

// Customer endpoints (Require authenticated customer session)
router.post("/", requireAuth, createRideOrder);
router.post("/orders", requireAuth, createRideOrder);

router.get("/customer/:customerId", requireAuth, getCustomerRideOrders);
router.get("/orders/customer/:customerId", requireAuth, getCustomerRideOrders);

router.get("/active/customer/:customerId", requireAuth, getActiveCustomerRide);
router.get("/orders/active/customer/:customerId", requireAuth, getActiveCustomerRide);

// Driver endpoints (Require authenticated driver session)
router.get("/available", ...driverGuard, getDriverRideOrders);
router.get("/orders/available", ...driverGuard, getDriverRideOrders);

router.get("/driver", ...driverGuard, getDriverRideOrders);
router.get("/driver/:driverId", ...driverGuard, getDriverRideOrders);
router.get("/orders/driver", ...driverGuard, getDriverRideOrders);
router.get("/orders/driver/:driverId", ...driverGuard, getDriverRideOrders);

router.post("/:id/accept", ...driverGuard, acceptRideOrder);
router.post("/orders/:id/accept", ...driverGuard, acceptRideOrder);

router.post("/:id/decline", ...driverGuard, declineRideOrder);
router.post("/orders/:id/decline", ...driverGuard, declineRideOrder);

// Tracking & Operational endpoints
router.get("/:id", requireAuth, getRideOrderById);
router.get("/orders/:id", requireAuth, getRideOrderById);
router.get("/:id/tracking", requireAuth, getRideOrderById);
router.get("/orders/:id/tracking", requireAuth, getRideOrderById);

router.put("/:id/status", requireAuth, updateRideStatus);
router.put("/orders/:id/status", requireAuth, updateRideStatus);

router.put("/:id/location", ...driverGuard, updateDriverLocation);
router.put("/orders/:id/location", ...driverGuard, updateDriverLocation);

router.post("/:id/cancel", requireAuth, cancelRideOrder);
router.post("/orders/:id/cancel", requireAuth, cancelRideOrder);

router.post("/:id/rating", requireAuth, rateRideOrder);
router.post("/orders/:id/rating", requireAuth, rateRideOrder);

router.post("/:id/complaint", requireAuth, submitRideComplaint);
router.post("/orders/:id/complaint", requireAuth, submitRideComplaint);

module.exports = router;
