const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    storeId: { type: String, default: "" },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    sender: {
      type: String,
      enum: ["customer", "owner", "driver", "other"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    attachment: {
      type: {
        type: String,
        enum: ["image", "file"],
      },
      uri: String,
      name: String,
      size: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
