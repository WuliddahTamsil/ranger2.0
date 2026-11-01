const express = require("express");
const multer = require("multer");
const os = require("os");
const {
  getPublished,
  getAdminAll,
  createItem,
  updateItem,
  updateStatus,
  deleteItem,
  uploadMedia,
} = require("./pgeInfoHubController");
const { requireAuth, requireRole } = require("../../middleware/authMiddleware");

const router = express.Router();

const pgeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => {
      const safeName = (file.originalname || "pge_media").replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `geoverse-pge-${Date.now()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

const adminGuard = [requireAuth, requireRole("admin")];

// Public routes for Customer App
router.get("/", getPublished);

// Strictly Protected Admin CMS routes
router.get("/admin", ...adminGuard, getAdminAll);
router.post("/", ...adminGuard, createItem);
router.put("/:id", ...adminGuard, updateItem);
router.put("/:id/status", ...adminGuard, updateStatus);
router.patch("/:id/status", ...adminGuard, updateStatus);
router.delete("/:id", ...adminGuard, deleteItem);
router.post("/upload", ...adminGuard, pgeUpload.single("file"), uploadMedia);

module.exports = router;
