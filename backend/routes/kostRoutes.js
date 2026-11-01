const express = require("express");
const {
  getAllKosts,
  getKostById,
  createKost,
  updateKost,
  getKostsByOwner,
  getKostProperty,
  updateKostProperty,
  getRoomsByOwner,
  addRoom,
  updateRoom,
  deleteRoom,
  getTenantsByOwner,
  addTenant,
  updateTenant,
  deleteTenant,
} = require("../controllers/kostController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const ownerGuard = [requireAuth, requireRole("pemilik_kos", "admin")];

// Specific routes MUST come before generic /:id
router.get("/property/:ownerId", ...ownerGuard, getKostProperty);
router.put("/property/:ownerId", ...ownerGuard, updateKostProperty);

router.get("/rooms/:ownerId", ...ownerGuard, getRoomsByOwner);
router.post("/rooms/:ownerId", ...ownerGuard, addRoom);
router.put("/rooms/:ownerId/:roomId", ...ownerGuard, updateRoom);
router.delete("/rooms/:ownerId/:roomId", ...ownerGuard, deleteRoom);

router.get("/tenants/:ownerId", ...ownerGuard, getTenantsByOwner);
router.post("/tenants/:ownerId", ...ownerGuard, addTenant);
router.put("/tenants/:ownerId/:tenantId", ...ownerGuard, updateTenant);
router.delete("/tenants/:ownerId/:tenantId", ...ownerGuard, deleteTenant);

router.get("/owner/:ownerId", ...ownerGuard, getKostsByOwner);
router.get("/", getAllKosts);
router.get("/:id", getKostById);
router.post("/", ...ownerGuard, createKost);
router.put("/:id", ...ownerGuard, updateKost);

module.exports = router;
