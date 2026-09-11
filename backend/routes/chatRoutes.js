const express = require("express");
const { getConversation, sendChatMessage, getChatMessages } = require("../controllers/chatController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.get("/conversation/:orderId", getConversation);
router.post("/send", sendChatMessage);
router.get("/messages/:orderId", getChatMessages);

module.exports = router;
