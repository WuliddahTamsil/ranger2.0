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
router.get("/bookings/:id", requireAuth, geoDirectController.getBookingDetail);
router.get("/bookings/:id/report", requireAuth, geoDirectController.getDigitalProcessingReport);
router.post("/bookings/:id/payment-proof", requireAuth, geoDirectController.uploadPaymentProof);
router.post("/bookings/:id/resubmit", requireAuth, geoDirectController.resubmitBooking);
router.get("/dp-balance", requireAuth, geoDirectController.getCustomerDpBalanceInfo);

// ==========================================
// 3. ADMIN MANAGEMENT & APPROVALS
// ==========================================
const adminRoles = ["admin", "superadmin", "super_admin"];
router.get("/admin/stats", requireAuth, requireRole(adminRoles), geoDirectController.adminGetDashboardStats);
router.get("/admin/bookings", requireAuth, requireRole(adminRoles), geoDirectController.adminGetAllBookings);
router.post("/admin/equipments", requireAuth, requireRole(adminRoles), geoDirectController.adminCreateEquipment);
router.put("/admin/equipments/:id", requireAuth, requireRole(adminRoles), geoDirectController.adminUpdateEquipment);
router.delete("/admin/equipments/:id", requireAuth, requireRole(adminRoles), geoDirectController.adminDeleteEquipment);
router.put("/admin/payment-methods", requireAuth, requireRole(adminRoles), geoDirectController.adminUpdatePaymentMethods);
router.post("/admin/bookings/:id/verify-payment", requireAuth, requireRole(adminRoles), geoDirectController.adminVerifyPayment);
router.post("/admin/bookings/:id/reject-payment", requireAuth, requireRole(adminRoles), geoDirectController.adminRejectPayment);
router.post("/admin/bookings/:id/approve", requireAuth, requireRole(adminRoles), geoDirectController.adminApproveBooking);
router.post("/admin/bookings/:id/reject", requireAuth, requireRole(adminRoles), geoDirectController.adminRejectBooking);
router.post("/admin/bookings/:id/drying-progress", requireAuth, requireRole(adminRoles), geoDirectController.adminUpdateDryingProgress);
router.get("/admin/dp-ledgers", requireAuth, requireRole(adminRoles), geoDirectController.adminGetDpLedgers);
router.get("/admin/audit-logs", requireAuth, requireRole(adminRoles), geoDirectController.adminGetAuditLogs);

module.exports = router;

