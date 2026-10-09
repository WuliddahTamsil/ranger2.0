const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const {
  findOrderByIdentifier,
  getOrderParticipants,
  resolveParticipant,
  resolveReceiverId,
  resolveChatChannel,
  normalizeRole,
  isArchivedStatus,
} = require("../utils/chatAccess");

const roomForOrder = (orderId) => `conversation:${String(orderId)}`;

const getAuthorizedConversation = async (req, orderId) => {
  const record = await findOrderByIdentifier(orderId);
  if (!record) return { error: "Order chat tidak ditemukan", status: 404 };
  const participant = await resolveParticipant(req.authUser._id, record);
  if (!participant) return { error: "Akun tidak terhubung dengan order ini", status: 403 };

  const participants = getOrderParticipants(record);
  const conversation = await Conversation.findOneAndUpdate(
    { orderId: String(record.order._id) },
    {
      $set: {
        orderType: record.orderType,
        orderCode: participants.orderCode,
        customerId: participants.customerId,
        ownerId: participants.ownerId,
        storeId: participants.storeId,
        driverId: participants.driverId,
        driverIds: participants.driverIds,
        status: participants.status,
        archived: isArchivedStatus(participants.status),
      },
      $setOnInsert: { lastMessageAt: null },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { record, participant, conversation };
};

const getConversation = async (req, res) => {
  try {
    const result = await getAuthorizedConversation(req, req.params.orderId);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    return res.json({
      success: true,
      data: {
        ...result.conversation.toObject(),
        participantRole: result.participant.role,
        canSend: !isArchivedStatus(result.conversation.status),
      },
    });
  } catch (error) {
    console.error("Get chat conversation error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat percakapan" });
  }
};

const sendChatMessage = async (req, res) => {
  try {
    const { orderId, text, attachment, target, conversationId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: "orderId wajib diisi" });

    const result = await getAuthorizedConversation(req, orderId);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { record, participant, conversation } = result;

    if (isArchivedStatus(conversation.status)) {
      return res.status(409).json({ success: false, message: "Percakapan order ini sudah diarsipkan dan hanya dapat dibaca." });
    }
    if (conversationId && String(conversation._id) !== String(conversationId)) {
      return res.status(403).json({ success: false, message: "Conversation tidak sesuai dengan order." });
    }

    const normalizedTarget = normalizeRole(target) || (participant.role === "driver" ? "customer" : "owner");
    const receiverId = resolveReceiverId(participant, normalizedTarget);
    if (!receiverId) return res.status(409).json({ success: false, message: "Penerima chat belum tersedia untuk order ini." });

    const channel = resolveChatChannel(participant.role, normalizedTarget);

    const message = await ChatMessage.create({
      conversationId: conversation._id,
      orderId: String(record.order._id),
      channel,
      sender: participant.role,
      senderId: String(req.authUser._id),
      receiverId,
      customerId: participant.customerId,
      ownerId: participant.ownerId,
      storeId: participant.storeId,
      target: normalizedTarget,
      text: String(text || "").trim(),
      attachment: attachment || undefined,
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();
    if (mongoose.Types.ObjectId.isValid(receiverId)) {
      await Notification.create({
        userId: receiverId,
        title: "Pesan baru",
        message: `Ada pesan baru terkait pesanan ${participant.orderCode || record.order._id}.`,
        type: "general",
        relatedId: mongoose.Types.ObjectId.isValid(String(record.order._id)) ? record.order._id : undefined,
      });
    }
    if (req.io) {
      req.io.to(roomForOrder(record.order._id)).emit("chat:message", message);
      req.io.to(`${roomForOrder(record.order._id)}:${channel}`).emit("chat:message", message);
    }
    return res.status(201).json({ success: true, data: message, conversationId: conversation._id });
  } catch (error) {
    console.error("Send chat message error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim pesan", error: error.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const result = await getAuthorizedConversation(req, req.params.orderId);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });

    const callerRole = normalizeRole(req.query.role || result.participant.role);
    const targetRole = req.query.target ? normalizeRole(req.query.target) : undefined;
    let requestedChannel = req.query.channel;

    if (!requestedChannel && targetRole) {
      requestedChannel = resolveChatChannel(callerRole, targetRole);
    }

    const baseOrderCondition = {
      $or: [
        { conversationId: result.conversation._id },
        { orderId: String(result.record.order._id) },
      ],
    };

    let query = { ...baseOrderCondition };

    if (requestedChannel && requestedChannel !== "all" && !result.participant.isAdmin) {
      query = {
        $and: [
          baseOrderCondition,
          {
            $or: [
              { channel: requestedChannel },
              // Backward compatibility for legacy or unmigrated messages
              ...(requestedChannel === "customer_driver"
                ? [
                    { channel: { $in: [null, "general"] }, sender: "customer", target: "driver" },
                    { channel: { $in: [null, "general"] }, sender: "driver", target: "customer" },
                    { channel: { $exists: false }, sender: "customer", target: "driver" },
                    { channel: { $exists: false }, sender: "driver", target: "customer" },
                  ]
                : []),
              ...(requestedChannel === "driver_owner"
                ? [
                    { channel: { $in: [null, "general"] }, sender: "driver", target: { $in: ["owner", "store"] } },
                    { channel: { $in: [null, "general"] }, sender: "owner", target: "driver" },
                    { channel: { $exists: false }, sender: "driver", target: { $in: ["owner", "store"] } },
                    { channel: { $exists: false }, sender: "owner", target: "driver" },
                  ]
                : []),
              ...(requestedChannel === "customer_owner"
                ? [
                    { channel: { $in: [null, "general"] }, sender: "customer", target: { $in: ["owner", "store"] } },
                    { channel: { $in: [null, "general"] }, sender: "owner", target: "customer" },
                    { channel: { $exists: false }, sender: "customer", target: { $in: ["owner", "store"] } },
                    { channel: { $exists: false }, sender: "owner", target: "customer" },
                  ]
                : []),
            ],
          },
        ],
      };
    }

    const messages = await ChatMessage.find(query).sort({ createdAt: 1 });
    return res.json({
      success: true,
      count: messages.length,
      channel: requestedChannel || "all",
      conversationId: result.conversation._id,
      data: messages,
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesan", error: error.message });
  }
};

module.exports = { getConversation, sendChatMessage, getChatMessages, roomForOrder };
