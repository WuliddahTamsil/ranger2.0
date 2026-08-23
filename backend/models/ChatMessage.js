const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
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
