const ChatMessage = require("../models/ChatMessage");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const Notification = require("../models/Notification");

// Send a chat message
const sendChatMessage = async (req, res) => {
  try {
    const { orderId, sender, senderId, text, attachment } = req.body;

    if (!orderId || !sender || !senderId) {
      return res.status(400).json({ success: false, message: "orderId dan sender harus diisi" });
    }
    const order = await MarketplaceOrder.findById(orderId).lean()
      .catch(() => null) || await CateringOrder.findById(orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order chat tidak ditemukan" });
    const customerId = String(order.customerId);
    const ownerId = String(order.ownerId);
    const driverId = String(order.driverId || "");
    if (String(senderId) !== customerId && String(senderId) !== ownerId && String(senderId) !== driverId) {
      return res.status(403).json({ success: false, message: "Akun tidak terhubung dengan order ini" });
    }
    const normalizedSender = sender === "owner" ? ownerId : sender === "driver" ? driverId : customerId;
    const receiverId = normalizedSender === ownerId || normalizedSender === driverId ? customerId : ownerId;

    const message = await ChatMessage.create({
      orderId,
      sender,
      senderId: normalizedSender,
      receiverId,
      customerId,
      ownerId,
      storeId: String(order.storeId || ownerId),
      text: text || "",
      attachment,
    });
    if (require("mongoose").Types.ObjectId.isValid(receiverId)) {
      await Notification.create({
        userId: receiverId,
        title: "Pesan baru",
        message: `Ada pesan baru terkait pesanan ${order.orderCode}.`,
        type: "general",
        relatedId: require("mongoose").Types.ObjectId.isValid(orderId) ? order._id : undefined,
      });
    }

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
