const express = require("express");
const { sendChatMessage, getChatMessages } = require("../controllers/chatController");

const router = express.Router();

router.post("/send", sendChatMessage);
router.get("/messages/:orderId", getChatMessages);

module.exports = router;
