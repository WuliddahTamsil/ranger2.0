const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: {
      type: String,
      enum: [
        "marketplace",
        "catering",
        "laundry",
        "kos",
        "ride",
        "send",
        "shop",
        "waste",
        "general",
        "inquiry",
        "KANYAAH_RIDE",
        "KANYAAH_SEND",
        "KANYAAH_SHOP",
        "KANYAAH_LAUNDRY",
        "RIDE",
        "SEND",
        "SHOP",
        "LAUNDRY",
        "MARKETPLACE",
        "CATERING",
      ],
      required: true,
    },
    orderCode: { type: String, default: "", index: true },
    customerId: { type: String, default: "", index: true },
    customerName: { type: String, default: "" },
    customerPhoto: { type: String, default: "" },
    ownerId: { type: String, default: "", index: true },
    ownerName: { type: String, default: "" },
    ownerPhoto: { type: String, default: "" },
    storeId: { type: String, default: "" },
    driverId: { type: String, default: "", index: true },
    driverName: { type: String, default: "" },
    driverPhoto: { type: String, default: "" },
    driverIds: { type: [String], default: [] },
    status: { type: String, default: "" },
    archived: { type: Boolean, default: false },
    lastMessageText: { type: String, default: "" },
    lastMessageAt: { type: Date, index: true },
  },
  { timestamps: true }
);

conversationSchema.index({ customerId: 1, updatedAt: -1 });
conversationSchema.index({ ownerId: 1, updatedAt: -1 });
conversationSchema.index({ driverId: 1, updatedAt: -1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
