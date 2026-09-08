const express = require("express");
const { getNotifications, markNotificationRead } = require("../controllers/notificationController");

const router = express.Router();

router.get("/:userId", getNotifications);
router.patch("/:id/read", markNotificationRead);
router.put("/:id/read", markNotificationRead);

module.exports = router;
