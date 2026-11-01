/**
 * homeHeroRoutes.js
 * Routes for Homepage Hero Banner
 * Mounts:
 * - Customer: GET /api/home-hero/active
 * - Admin: /api/admin/home-hero/*
 */

const express = require("express");
const multer = require("multer");
const {
  getActiveHeroes,
  getAdminHeroes,
  createHero,
  updateHero,
  updateHeroStatus,
  deleteHero,
  uploadHeroMedia,
} = require("../controllers/homeHeroController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Disk storage keeps large video uploads out of Node's heap.
const heroUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, require("os").tmpdir()),
    filename: (req, file, cb) => {
      const safeName = (file.originalname || "hero_media").replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `geoverse-hero-${Date.now()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const adminGuard = [requireAuth, requireRole("admin")];

// Customer Public Route
router.get("/active", getActiveHeroes);

// Admin Routes (When mounted under /api/admin/home-hero or /api/home-hero/admin)
router.get("/", ...adminGuard, getAdminHeroes);
router.post("/", ...adminGuard, createHero);
router.put("/:id", ...adminGuard, updateHero);
router.patch("/:id/status", ...adminGuard, updateHeroStatus);
router.delete("/:id", ...adminGuard, deleteHero);
router.post("/upload", ...adminGuard, heroUpload.single("file"), uploadHeroMedia);

// Also support sub-paths under /admin if router is mounted at /api/home-hero
router.get("/admin", ...adminGuard, getAdminHeroes);
router.post("/admin", ...adminGuard, createHero);
router.put("/admin/:id", ...adminGuard, updateHero);
router.patch("/admin/:id/status", ...adminGuard, updateHeroStatus);
router.delete("/admin/:id", ...adminGuard, deleteHero);
router.post("/admin/upload", ...adminGuard, heroUpload.single("file"), uploadHeroMedia);

module.exports = router;
