const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: { type: String, enum: ["marketplace", "catering", "laundry", "kos"], required: true },
    orderCode: { type: String, default: "" },
    customerId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    storeId: { type: String, default: "" },
    driverId: { type: String, default: "", index: true },
    driverIds: { type: [String], default: [] },
    status: { type: String, default: "" },
    archived: { type: Boolean, default: false },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
