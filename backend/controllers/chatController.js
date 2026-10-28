const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { uploadToCloudinary } = require("../config/cloudinary");
const {
  findOrderByIdentifier,
  getOrderParticipants,
  resolveParticipant,
  resolveReceiverId,
  resolveChatChannel,
  normalizeRole,
  isArchivedStatus,
  ownerRoles,
  clearCachedOrder,
} = require("../utils/chatAccess");

const roomForOrder = (orderId) => `conversation:${String(orderId)}`;

const getAuthorizedConversation = async (req, orderId, { forWrite = false } = {}) => {
  const record = await findOrderByIdentifier(orderId);
  if (!record) return { error: "Order chat tidak ditemukan", status: 404 };
  const participant = await resolveParticipant(req.authUser, record);
  if (!participant) return { error: "Akun tidak terhubung dengan order ini", status: 403 };

  // For read operations, if a conversation document already exists, return it immediately without a slow DB write!
  if (!forWrite && record.conversation) {
    return { record, participant, conversation: record.conversation };
  }

  const participants = getOrderParticipants(record);

  // If already in DB and not a forced write, check if Conversation is already saved
  if (!forWrite) {
    const existing = await Conversation.findOne({ orderId: String(record.order._id) }).lean();
    if (existing) {
      return { record, participant, conversation: existing };
    }
  }

  const conversation = await Conversation.findOneAndUpdate(
    { orderId: String(record.order._id) },
    {
      $set: {
        orderType: record.orderType,
        orderCode: participants.orderCode,
        customerId: participant.customerId || participants.customerId,
        ownerId: participant.ownerId || participants.ownerId,
        storeId: participants.storeId,
        driverId: participant.driverId || participants.driverId,
        driverIds: (participant.driverIds && participant.driverIds.length > 0) ? participant.driverIds : participants.driverIds,
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
    const result = await getAuthorizedConversation(req, req.params.orderId, { forWrite: false });
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });

    const convObj = typeof result.conversation.toObject === "function"
      ? result.conversation.toObject()
      : result.conversation;

    // Resolve profile photos and names for all participants
    const userIds = [convObj.customerId, convObj.driverId, convObj.ownerId].filter(
      (id) => id && mongoose.Types.ObjectId.isValid(id)
    );
    const users = await User.find({ _id: { $in: userIds } }).select("name profilePhoto phone role").lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const custUser = userMap.get(String(convObj.customerId));
    const drvUser = userMap.get(String(convObj.driverId));
    const ownerUser = userMap.get(String(convObj.ownerId));

    const callerRole = result.participant.role;
    let participantName = "Mitra GEOVERSE";
    let participantPhoto = "";

    if (callerRole === "customer") {
      if (convObj.driverId && drvUser) {
        participantName = drvUser.name || "Driver GEOVERSE";
        participantPhoto = drvUser.profilePhoto || "";
      } else if (ownerUser) {
        participantName = ownerUser.name || "Pemilik Toko";
        participantPhoto = ownerUser.profilePhoto || "";
      }
    } else if (callerRole === "driver") {
      participantName = custUser?.name || "Pelanggan";
      participantPhoto = custUser?.profilePhoto || "";
    } else {
      // owner
      participantName = custUser?.name || "Pelanggan";
      participantPhoto = custUser?.profilePhoto || "";
    }

    return res.json({
      success: true,
      data: {
        ...convObj,
        participantRole: result.participant.role,
        canSend: !isArchivedStatus(convObj.status),
        customerName: custUser?.name || "Pelanggan",
        customerPhoto: custUser?.profilePhoto || "",
        driverName: drvUser?.name || "Driver GEOVERSE",
        driverPhoto: drvUser?.profilePhoto || "",
        ownerName: ownerUser?.name || "Pemilik",
        ownerPhoto: ownerUser?.profilePhoto || "",
        participantName,
        participantPhoto,
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

    const result = await getAuthorizedConversation(req, orderId, { forWrite: true });
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { record, participant, conversation } = result;

    if (isArchivedStatus(conversation.status)) {
      return res.status(409).json({ success: false, message: "Percakapan order ini sudah diarsipkan dan hanya dapat dibaca." });
    }
    if (conversationId && String(conversation._id) !== String(conversationId)) {
      return res.status(403).json({ success: false, message: "Conversation tidak sesuai dengan order." });
    }

    let normalizedTarget = normalizeRole(target) || (participant.role === "driver" ? "customer" : "owner");
    if (record.orderType === "send" || record.orderType === "ride") {
      normalizedTarget = participant.role === "driver" ? "customer" : "driver";
    }
    const receiverId = resolveReceiverId(participant, normalizedTarget);
    if (!receiverId) return res.status(409).json({ success: false, message: "Penerima chat belum tersedia untuk order ini." });

    const channel = (record.orderType === "send" || record.orderType === "ride")
      ? "customer_driver"
      : resolveChatChannel(participant.role, normalizedTarget);

    // Process attachment: If image is base64 or local URI, auto-upload to Cloudinary permanently!
    let processedAttachment = attachment ? { ...attachment } : null;
    if (processedAttachment) {
      const rawUri = String(processedAttachment.uri || "");
      const isBase64 = rawUri.startsWith("data:") || Boolean(processedAttachment.base64);

      if (isBase64) {
        try {
          const rawPayload = processedAttachment.base64 || rawUri;
          const match = rawPayload.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          const mimeType = match ? match[1] : (processedAttachment.mimeType || "image/jpeg");
          const base64Data = match ? match[2] : rawPayload;
          const fileBuffer = Buffer.from(base64Data, "base64");
          const hostUrl = req.hostUrl || `http://localhost:${process.env.PORT || 5000}`;
          const uploadRes = await uploadToCloudinary(
            fileBuffer,
            processedAttachment.name || `chat_${Date.now()}.jpg`,
            mimeType,
            hostUrl
          );
          if (uploadRes && uploadRes.viewUrl) {
            processedAttachment.uri = uploadRes.viewUrl;
            processedAttachment.thumbnailUrl = uploadRes.viewUrl;
            delete processedAttachment.base64; // Don't store multi-megabyte base64 in MongoDB
          }
        } catch (uploadErr) {
          console.warn("Auto-upload chat attachment to Cloudinary fallback:", uploadErr.message);
        }
      }
    }

    const senderPhoto = req.authUser?.profilePhoto || "";
    const senderName = req.authUser?.name || (participant.role === "driver" ? "Driver GEOVERSE" : participant.role === "customer" ? "Pelanggan" : "Toko");

    const message = await ChatMessage.create({
      conversationId: conversation._id,
      orderId: String(record.order._id),
      channel,
      sender: participant.role,
      senderId: String(req.authUser._id),
      senderName,
      senderPhoto,
      receiverId,
      customerId: participant.customerId,
      ownerId: participant.ownerId,
      storeId: participant.storeId,
      target: normalizedTarget,
      text: String(text || "").trim(),
      attachment: processedAttachment || undefined,
    });

    const lastText = text || (processedAttachment ? "📷 Lampiran foto" : "Pesan baru");
    // Update conversation metadata
    Conversation.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessageAt: new Date(),
        lastMessageText: lastText,
      },
    }).catch((err) => console.warn("Update conversation lastMessage error:", err.message));

    // Non-blocking notification creation
    if (mongoose.Types.ObjectId.isValid(receiverId)) {
      Notification.create({
        userId: receiverId,
        title: `Pesan baru dari ${senderName}`,
        message: text ? (text.length > 60 ? `${text.slice(0, 57)}...` : text) : (processedAttachment ? "📷 Mengirim lampiran foto" : "Ada pesan baru terkait pesanan."),
        type: "general",
        relatedId: mongoose.Types.ObjectId.isValid(String(record.order._id)) ? record.order._id : undefined,
      }).catch((err) => console.warn("Chat notification error:", err.message));
    }

    // Realtime broadcast via Socket.io
    if (req.io) {
      const orderRoomId = String(record.order._id);
      req.io.to(roomForOrder(orderRoomId)).emit("chat:message", message);
      req.io.to(`${roomForOrder(orderRoomId)}:${channel}`).emit("chat:message", message);
      if (orderId && String(orderId) !== orderRoomId) {
        req.io.to(roomForOrder(orderId)).emit("chat:message", message);
        req.io.to(`${roomForOrder(orderId)}:${channel}`).emit("chat:message", message);
      }
      if (participant.orderCode && participant.orderCode !== orderRoomId) {
        req.io.to(roomForOrder(participant.orderCode)).emit("chat:message", message);
        req.io.to(`${roomForOrder(participant.orderCode)}:${channel}`).emit("chat:message", message);
      }
      if (receiverId) {
        req.io.to(`user:${String(receiverId)}`).emit("chat:message", message);
        req.io.to(`user:${String(receiverId)}`).emit("chat:notification", {
          orderId: orderRoomId,
          orderCode: participant.orderCode,
          message,
        });
      }
    }

    return res.status(201).json({ success: true, data: message, conversationId: conversation._id });
  } catch (error) {
    console.error("Send chat message error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim pesan", error: error.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const result = await getAuthorizedConversation(req, req.params.orderId, { forWrite: false });
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });

    const callerRole = normalizeRole(req.query.role || result.participant.role);
    let targetRole = req.query.target ? normalizeRole(req.query.target) : undefined;
    if (result.record.orderType === "send" || result.record.orderType === "ride") {
      targetRole = callerRole === "driver" ? "customer" : "driver";
    }
    let requestedChannel = req.query.channel;

    if (result.record.orderType === "send" || result.record.orderType === "ride") {
      requestedChannel = "customer_driver";
    } else if (!requestedChannel && targetRole) {
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
              ...(requestedChannel === "customer_driver"
                ? [
                    { channel: { $in: [null, "general", "driver_owner"] }, sender: "customer", target: "driver" },
                    { channel: { $in: [null, "general", "driver_owner"] }, sender: "driver" },
                    { channel: { $exists: false }, sender: "customer", target: "driver" },
                    { channel: { $exists: false }, sender: "driver" },
                    ...(result.record.orderType === "send" || result.record.orderType === "ride"
                      ? [{ channel: "driver_owner" }]
                      : []),
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

    // Fast indexed query with lean()
    const messages = await ChatMessage.find(query).sort({ createdAt: 1 }).lean();

    // Batch resolve sender profile photos for any messages that don't have senderPhoto stored
    const missingSenderIds = Array.from(
      new Set(
        messages
          .filter((m) => !m.senderPhoto && m.senderId && mongoose.Types.ObjectId.isValid(m.senderId))
          .map((m) => String(m.senderId))
      )
    );

    let senderMap = new Map();
    if (missingSenderIds.length > 0) {
      const senders = await User.find({ _id: { $in: missingSenderIds } }).select("name profilePhoto role").lean();
      senderMap = new Map(senders.map((u) => [String(u._id), u]));
    }

    const enrichedMessages = messages.map((m) => {
      const user = senderMap.get(String(m.senderId));
      return {
        ...m,
        senderName: m.senderName || user?.name || (m.sender === "driver" ? "Driver GEOVERSE" : m.sender === "customer" ? "Pelanggan" : "Toko"),
        senderPhoto: m.senderPhoto || user?.profilePhoto || "",
      };
    });

    return res.json({
      success: true,
      count: enrichedMessages.length,
      channel: requestedChannel || "all",
      conversationId: result.conversation._id,
      data: enrichedMessages,
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesan", error: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = String(req.authUser._id);
    const userRole = req.authUser.role;

    const baseOr = [
      { ownerId: userId },
      { customerId: userId },
      { driverId: userId },
      { driverIds: userId },
    ];

    if (ownerRoles.has(userRole) || userRole === "admin") {
      const roleServiceMap = {
        pemilik_kos: "kos",
        pemilik_laundry: "laundry",
        pemilik_catering: "catering",
        pemilik_marketplace: "marketplace",
        pemilik_shop: "shop",
        bank_sampah: "waste",
      };
      const serviceType = roleServiceMap[userRole];
      if (serviceType) {
        baseOr.push({ orderType: serviceType });
        baseOr.push({ orderType: "inquiry" });
        baseOr.push({ orderType: "general" });
      }
    }

    const conversations = await Conversation.find({ $or: baseOr })
      .sort({ updatedAt: -1, lastMessageAt: -1 })
      .limit(60)
      .lean();

    // Also look for distinct orders in ChatMessage where user is owner or receiver
    const existingOrderIds = new Set(conversations.map((c) => String(c.orderId || c._id)));
    const msgOrderIds = await ChatMessage.distinct("orderId", {
      $or: [{ ownerId: userId }, { receiverId: userId }],
    });

    for (const ordId of msgOrderIds) {
      if (ordId && !existingOrderIds.has(String(ordId))) {
        const extraConv = await Conversation.findOne({ orderId: ordId }).lean();
        if (extraConv) {
          conversations.push(extraConv);
          existingOrderIds.add(String(ordId));
        }
      }
    }

    // High performance batch user lookup (1 query instead of 120 sequential User.findById queries!)
    const allUserIds = new Set();
    conversations.forEach((conv) => {
      if (conv.customerId && mongoose.Types.ObjectId.isValid(conv.customerId)) allUserIds.add(String(conv.customerId));
      if (conv.driverId && mongoose.Types.ObjectId.isValid(conv.driverId)) allUserIds.add(String(conv.driverId));
      if (conv.ownerId && mongoose.Types.ObjectId.isValid(conv.ownerId)) allUserIds.add(String(conv.ownerId));
    });

    const userList = await User.find({ _id: { $in: Array.from(allUserIds) } }).select("name email phone profilePhoto role").lean();
    const userMap = new Map(userList.map((u) => [String(u._id), u]));

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await ChatMessage.findOne({
          $or: [{ conversationId: conv._id }, { orderId: conv.orderId }],
        })
          .sort({ createdAt: -1 })
          .lean();

        let effectiveCustId = conv.customerId;
        if (!effectiveCustId && lastMsg?.customerId) {
          effectiveCustId = String(lastMsg.customerId);
        }
        if (!effectiveCustId && lastMsg?.sender === "customer" && lastMsg?.senderId) {
          effectiveCustId = String(lastMsg.senderId);
        }

        const custUser = userMap.get(String(effectiveCustId));
        const drvUser = userMap.get(String(conv.driverId));
        const ownerUser = userMap.get(String(conv.ownerId));

        const customerName = custUser?.name || "Pelanggan";
        const customerPhoto = custUser?.profilePhoto || "";
        const driverName = drvUser?.name || "Driver GEOVERSE";
        const driverPhoto = drvUser?.profilePhoto || "";
        const ownerName = ownerUser?.name || "Pemilik Toko";
        const ownerPhoto = ownerUser?.profilePhoto || "";

        let participantName = customerName;
        let participantPhoto = customerPhoto;

        if (userRole === "customer") {
          if (conv.driverId && drvUser) {
            participantName = driverName;
            participantPhoto = driverPhoto;
          } else if (ownerUser) {
            participantName = ownerName;
            participantPhoto = ownerPhoto;
          }
        }

        return {
          id: String(conv._id),
          orderId: conv.orderId,
          orderCode: conv.orderCode || conv.orderId,
          orderType: conv.orderType || "general",
          customerId: conv.customerId || effectiveCustId,
          customerName,
          customerPhoto,
          driverId: conv.driverId,
          driverName,
          driverPhoto,
          ownerId: conv.ownerId,
          ownerName,
          ownerPhoto,
          participantName,
          participantPhoto,
          status: conv.status || "active",
          lastMessage: lastMsg?.text || (lastMsg?.attachment ? "📷 Lampiran foto" : conv.lastMessageText || "Mulai percakapan"),
          lastMessageTime: lastMsg?.createdAt
            ? new Date(lastMsg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
            : "",
          lastMessageDate: lastMsg?.createdAt || conv.lastMessageAt || conv.updatedAt || new Date(),
          unreadCount: 0,
        };
      })
    );

    result.sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    return res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat daftar percakapan" });
  }
};

const uploadChatAttachment = async (req, res) => {
  try {
    let fileBuffer = null;
    let originalName = "chat_attachment.jpg";
    let mimeType = "image/jpeg";

    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname || "chat_attachment.jpg";
      mimeType = req.file.mimetype || "image/jpeg";
    } else if (req.files && req.files.length > 0) {
      fileBuffer = req.files[0].buffer;
      originalName = req.files[0].originalname || "chat_attachment.jpg";
      mimeType = req.files[0].mimetype || "image/jpeg";
    } else if (req.body && (req.body.base64 || req.body.image || req.body.dataUrl)) {
      const rawBase64 = String(req.body.base64 || req.body.image || req.body.dataUrl);
      const match = rawBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        mimeType = req.body.mimeType || "image/jpeg";
        fileBuffer = Buffer.from(rawBase64, "base64");
      }
      originalName = req.body.name || req.body.fileName || `chat_${Date.now()}.jpg`;
    } else {
      return res.status(400).json({ success: false, message: "Tidak ada file atau foto yang diunggah" });
    }

    const hostUrl = req.hostUrl || `http://localhost:${process.env.PORT || 5000}`;
    const result = await uploadToCloudinary(fileBuffer, originalName, mimeType, hostUrl);

    return res.status(200).json({
      success: true,
      message: "Lampiran berhasil diunggah",
      data: {
        fileId: result.fileId,
        fileName: result.name,
        url: result.viewUrl,
        viewUrl: result.viewUrl,
        storage: result.storage,
      },
    });
  } catch (error) {
    console.error("Upload chat attachment error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengunggah lampiran chat", error: error.message });
  }
};

module.exports = {
  getConversation,
  sendChatMessage,
  getChatMessages,
  getConversations,
  uploadChatAttachment,
  roomForOrder,
};
