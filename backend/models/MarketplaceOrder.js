const mongoose = require("mongoose");

const marketplaceOrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: "" },
    address: { type: String, required: true },
    notes: { type: String, default: "" },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceProduct" },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    }],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    driverTip: { type: Number, default: 0, min: 0 },
    voucherId: { type: String, default: "" },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: "Menunggu" },
    storeId: { type: String, default: "" },
    storeName: { type: String, default: "" },
    storeAddress: { type: String, default: "" },
    driverId: { type: String, default: "", index: true },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Menunggu", "Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Selesai", "Dibatalkan"],
      default: "Menunggu",
    },
  },
  { timestamps: true }
);

marketplaceOrderSchema.index({ ownerId: 1, createdAt: -1 });
marketplaceOrderSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("MarketplaceOrder", marketplaceOrderSchema);
