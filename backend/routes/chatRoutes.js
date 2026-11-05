const express = require("express");
const multer = require("multer");
const {
  getConversation,
  sendChatMessage,
  getChatMessages,
  getConversations,
  uploadChatAttachment,
  deleteConversation,
  deleteMultipleConversations,
  clearAllConversations,
} = require("../controllers/chatController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

router.use(requireAuth);
router.get("/conversations", getConversations);
router.get("/conversation/:orderId", getConversation);
router.post("/send", sendChatMessage);
router.get("/messages/:orderId", getChatMessages);
router.post("/upload", upload.any(), uploadChatAttachment);
router.delete("/conversation/:orderId", deleteConversation);
router.post("/delete-multiple", deleteMultipleConversations);
router.post("/clear-all", clearAllConversations);

module.exports = router;
