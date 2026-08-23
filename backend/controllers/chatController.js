const ChatMessage = require("../models/ChatMessage");

// Send a chat message
const sendChatMessage = async (req, res) => {
  try {
    const { orderId, sender, text, attachment } = req.body;

    if (!orderId || !sender) {
      return res.status(400).json({ success: false, message: "orderId dan sender harus diisi" });
    }

    const message = await ChatMessage.create({
      orderId,
      sender,
      text: text || "",
      attachment,
    });

    // Notify socket.io room if applicable
    if (req.io) {
      req.io.to(`room_${orderId}`).emit("new_message", message);
    }

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("❌ Send chat message error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim pesan", error: error.message });
  }
};

// Get chat history by orderId
const getChatMessages = async (req, res) => {
  try {
    const { orderId } = req.params;
    const messages = await ChatMessage.find({ orderId }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("❌ Get chat messages error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesan", error: error.message });
  }
};

module.exports = {
  sendChatMessage,
  getChatMessages,
};
