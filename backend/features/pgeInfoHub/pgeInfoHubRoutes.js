const express = require("express");
const {
  getPublished,
  getAdminAll,
  createItem,
  updateStatus,
} = require("./pgeInfoHubController");

const router = express.Router();

// Public routes for Customer App
router.get("/", getPublished);

// Admin CMS routes
router.get("/admin", getAdminAll);
router.post("/", createItem);
router.put("/:id/status", updateStatus);

module.exports = router;
