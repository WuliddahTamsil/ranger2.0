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

const router = express.Router();

// Specific routes MUST come before generic /:id
router.get("/property/:ownerId", getKostProperty);
router.put("/property/:ownerId", updateKostProperty);

router.get("/rooms/:ownerId", getRoomsByOwner);
router.post("/rooms/:ownerId", addRoom);
router.put("/rooms/:ownerId/:roomId", updateRoom);
router.delete("/rooms/:ownerId/:roomId", deleteRoom);

router.get("/tenants/:ownerId", getTenantsByOwner);
router.post("/tenants/:ownerId", addTenant);
router.put("/tenants/:ownerId/:tenantId", updateTenant);
router.delete("/tenants/:ownerId/:tenantId", deleteTenant);

router.get("/owner/:ownerId", getKostsByOwner);
router.get("/", getAllKosts);
router.get("/:id", getKostById);
router.post("/", createKost);
router.put("/:id", updateKost);

module.exports = router;
