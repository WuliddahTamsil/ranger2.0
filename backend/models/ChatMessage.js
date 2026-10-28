const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video", "file"],
      default: "image",
    },
    uri: { type: String, default: "" },
    url: { type: String, default: "" },
    name: { type: String, default: "" },
    size: { type: String, default: "" },
    duration: { type: Number },
    thumbnailUrl: { type: String, default: "" },
    mimeType: { type: String, default: "" },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: { type: String, default: "", index: true },
    ownerId: { type: String, default: "", index: true },
    storeId: { type: String, default: "" },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, default: "" },
    senderPhoto: { type: String, default: "" },
    receiverId: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ["customer_driver", "driver_owner", "customer_owner", "general"],
      default: "general",
      index: true,
    },
    sender: {
      type: String,
      enum: ["customer", "owner", "driver", "other"],
      required: true,
    },
    target: {
      type: String,
      enum: ["customer", "driver", "owner", "store", "all"],
      default: "all",
      index: true,
    },
    text: {
      type: String,
      default: "",
    },
    attachment: {
      type: attachmentSchema,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed compound indexes for instant chat history querying and zero-lag sorting
chatMessageSchema.index({ orderId: 1, createdAt: 1 });
chatMessageSchema.index({ conversationId: 1, createdAt: 1 });
chatMessageSchema.index({ orderId: 1, channel: 1, createdAt: 1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
