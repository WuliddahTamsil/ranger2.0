const express = require("express");
const {
  createBooking,
  getBookingsByOwner,
  verifyDpBooking,
  settleBookingPayment,
  getBookingsByCustomer,
  getUserNotifications,
} = require("../controllers/bookingController");

const router = express.Router();

router.post("/", createBooking);
router.get("/owner/:ownerId", getBookingsByOwner);
router.put("/:id/verify-dp", verifyDpBooking);
router.put("/:id/settle", settleBookingPayment);
router.get("/customer/:customerId", getBookingsByCustomer);
router.get("/notifications/:userId", getUserNotifications);

module.exports = router;
