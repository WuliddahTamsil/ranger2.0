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

// Public routes for Customer App
router.get("/", getPublished);

// Admin CMS routes
router.get("/admin", getAdminAll);
router.post("/", createItem);
router.put("/:id", updateItem);
router.put("/:id/status", updateStatus);
router.patch("/:id/status", updateStatus);
router.delete("/:id", deleteItem);
router.post("/upload", pgeUpload.single("file"), uploadMedia);

module.exports = router;
