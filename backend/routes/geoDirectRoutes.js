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
router.post("/calculate", optionalAuth, geoDirectController.calculateRentalPrice);
router.get("/payment-methods", optionalAuth, geoDirectController.getPaymentMethods);

// ==========================================
// 2. CUSTOMER BOOKING & LIFECYCLE
// ==========================================
router.post("/bookings", requireAuth, geoDirectController.createBooking);
router.get("/bookings/my", requireAuth, geoDirectController.getMyBookings);
router.get("/bookings/:id", requireAuth, geoDirectController.getBookingDetail);
router.post("/bookings/:id/payment-proof", requireAuth, geoDirectController.uploadPaymentProof);
router.post("/bookings/:id/resubmit", requireAuth, geoDirectController.resubmitBooking);
router.get("/dp-balance", requireAuth, geoDirectController.getCustomerDpBalanceInfo);

// ==========================================
// 3. ADMIN MANAGEMENT & APPROVALS
// ==========================================
router.get("/admin/stats", requireAuth, requireRole("admin"), geoDirectController.adminGetDashboardStats);
router.get("/admin/bookings", requireAuth, requireRole("admin"), geoDirectController.adminGetAllBookings);
router.post("/admin/equipments", requireAuth, requireRole("admin"), geoDirectController.adminCreateEquipment);
router.put("/admin/equipments/:id", requireAuth, requireRole("admin"), geoDirectController.adminUpdateEquipment);
router.delete("/admin/equipments/:id", requireAuth, requireRole("admin"), geoDirectController.adminDeleteEquipment);
router.put("/admin/payment-methods", requireAuth, requireRole("admin"), geoDirectController.adminUpdatePaymentMethods);
router.post("/admin/bookings/:id/verify-payment", requireAuth, requireRole("admin"), geoDirectController.adminVerifyPayment);
router.post("/admin/bookings/:id/reject-payment", requireAuth, requireRole("admin"), geoDirectController.adminRejectPayment);
router.post("/admin/bookings/:id/approve", requireAuth, requireRole("admin"), geoDirectController.adminApproveBooking);
router.post("/admin/bookings/:id/reject", requireAuth, requireRole("admin"), geoDirectController.adminRejectBooking);
router.get("/admin/dp-ledgers", requireAuth, requireRole("admin"), geoDirectController.adminGetDpLedgers);
router.get("/admin/audit-logs", requireAuth, requireRole("admin"), geoDirectController.adminGetAuditLogs);

module.exports = router;

