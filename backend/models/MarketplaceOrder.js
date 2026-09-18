const mongoose = require("mongoose");

const marketplaceOrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, default: undefined },
    requestHash: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: "" },
    address: { type: String, required: true },
    addressSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    notes: { type: String, default: "" },
    notes: { type: String, default: "" },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceProduct" },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
      notes: { type: String, default: "" },
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
    paymentId: { type: String, default: "" },
    paymentDetails: {
      qrString: { type: String, default: "" },
      qrCodeUrl: { type: String, default: "" },
      vaNumber: { type: String, default: "" },
      bank: { type: String, default: "" },
      deepLinkUrl: { type: String, default: "" },
      paidAt: { type: Date, default: null },
      expiryTime: { type: Date, default: null },
    },
    cancellation: {
      reason: { type: String, default: "" },
      cancelledBy: { type: String, default: "" }, // "customer" | "pemilik_marketplace" | "system"
      cancelledAt: { type: Date, default: null },
    },
    complaint: {
      status: {
        type: String,
        enum: ["None", "Diajukan", "Ditinjau", "Disetujui", "Ditolak"],
        default: "None",
      },
      reason: { type: String, default: "" },
      detail: { type: String, default: "" },
      photos: { type: [String], default: [] },
      solutionRequested: { type: String, default: "Refund" },
      resolutionNotes: { type: String, default: "" },
      resolvedAt: { type: Date, default: null },
      createdAt: { type: Date, default: null },
    },
    refund: {
      status: {
        type: String,
        enum: ["None", "Menunggu", "Diproses", "Selesai", "Ditolak"],
        default: "None",
      },
      amount: { type: Number, default: 0 },
      reason: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      accountName: { type: String, default: "" },
      refundedAt: { type: Date, default: null },
    },
    storeId: { type: String, default: "" },
    storeName: { type: String, default: "" },
    storeAddress: { type: String, default: "" },
    driverId: { type: String, default: "", index: true },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    deliveryProofUrl: { type: String, default: "" },
    declinedByDrivers: { type: [String], default: [] },
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
marketplaceOrderSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

module.exports = mongoose.model("MarketplaceOrder", marketplaceOrderSchema);
