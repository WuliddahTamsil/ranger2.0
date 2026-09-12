const express = require("express");
const { getNotifications, markNotificationRead } = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:userId", requireAuth, getNotifications);
router.patch("/:id/read", requireAuth, markNotificationRead);
router.put("/:id/read", requireAuth, markNotificationRead);

module.exports = router;
