const express = require("express");
const {
  createBooking,
  getBookingsByOwner,
  verifyDpBooking,
  settleBookingPayment,
  getBookingsByCustomer,
  getUserNotifications,
  cancelBooking,
} = require("../controllers/bookingController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Customer creates booking
router.post("/", requireAuth, createBooking);

// Owner operations (Protected by role)
router.get("/owner/:ownerId", requireAuth, requireRole("pemilik_kos", "admin"), getBookingsByOwner);
router.put("/:id/verify-dp", requireAuth, requireRole("pemilik_kos", "admin"), verifyDpBooking);
router.put("/:id/settle", requireAuth, requireRole("pemilik_kos", "admin"), settleBookingPayment);

// Customer or Owner operations (Ownership verified in controller)
router.put("/:id/cancel", requireAuth, cancelBooking);
router.get("/customer/:customerId", requireAuth, getBookingsByCustomer);
router.get("/notifications/:userId", requireAuth, getUserNotifications);

module.exports = router;
