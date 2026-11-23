/**
 * geoDirectRoutes.js
 * Express Routes for Geo Direct Use Feature
 */

const express = require("express");
const router = express.Router();
const geoDirectController = require("../controllers/geoDirectController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/authMiddleware");

// ==========================================
// 1. PUBLIC / CUSTOMER BROWSING & PRICING
// ==========================================
router.get("/catalog", optionalAuth, geoDirectController.getEquipments);
router.get("/catalog/:id", optionalAuth, geoDirectController.getEquipmentDetail);
router.get("/dryhouse/availability", optionalAuth, geoDirectController.getDryhouseAvailability);
router.post("/calculate", optionalAuth, geoDirectController.calculateRentalPrice);
router.get("/payment-methods", optionalAuth, geoDirectController.getPaymentMethods);

// ==========================================
// 2. CUSTOMER BOOKING & LIFECYCLE
// ==========================================
router.post("/bookings", requireAuth, geoDirectController.createBooking);
router.get("/bookings/my", requireAuth, geoDirectController.getMyBookings);
router.get("/bookings/:id", optionalAuth, geoDirectController.getBookingDetail);
router.get("/bookings/:id/report", optionalAuth, geoDirectController.getDigitalProcessingReport);
router.post("/bookings/:id/payment-proof", requireAuth, geoDirectController.uploadPaymentProof);
router.post("/bookings/:id/resubmit", requireAuth, geoDirectController.resubmitBooking);
router.get("/dp-balance", requireAuth, geoDirectController.getCustomerDpBalanceInfo);

// ==========================================
// 3. ADMIN MANAGEMENT & APPROVALS
// ==========================================
router.get("/admin/stats", optionalAuth, geoDirectController.adminGetDashboardStats);
router.get("/admin/bookings", optionalAuth, geoDirectController.adminGetAllBookings);
router.post("/admin/equipments", optionalAuth, geoDirectController.adminCreateEquipment);
router.put("/admin/equipments/:id", optionalAuth, geoDirectController.adminUpdateEquipment);
router.delete("/admin/equipments/:id", optionalAuth, geoDirectController.adminDeleteEquipment);
router.put("/admin/payment-methods", optionalAuth, geoDirectController.adminUpdatePaymentMethods);
router.post("/admin/bookings/:id/verify-payment", optionalAuth, geoDirectController.adminVerifyPayment);
router.post("/admin/bookings/:id/reject-payment", optionalAuth, geoDirectController.adminRejectPayment);
router.post("/admin/bookings/:id/approve", optionalAuth, geoDirectController.adminApproveBooking);
router.post("/admin/bookings/:id/reject", optionalAuth, geoDirectController.adminRejectBooking);
router.post("/admin/bookings/:id/drying-progress", optionalAuth, geoDirectController.adminUpdateDryingProgress);
router.get("/admin/dp-ledgers", optionalAuth, geoDirectController.adminGetDpLedgers);
router.get("/admin/audit-logs", optionalAuth, geoDirectController.adminGetAuditLogs);

module.exports = router;

