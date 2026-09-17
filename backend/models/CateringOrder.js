const mongoose = require("mongoose");

const cateringOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    idempotencyKey: { type: String, default: undefined },
    requestHash: { type: String, default: "" },
    customerId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    addressSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    storeId: { type: String, default: "" },
    storeName: { type: String, default: "" },
    storeAddress: { type: String, default: "" },
    productId: { type: String, default: "" },
    driverId: { type: String, default: "", index: true },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    declinedByDrivers: { type: [String], default: [] },
    menuName: {
      type: String,
      required: true,
    },
    portions: {
      type: Number,
      required: true,
      min: 10,
    },
    price: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    serviceFee: {
      type: Number,
      default: 0,
    },
    driverTip: { type: Number, default: 0, min: 0 },
    voucherId: { type: String, default: "" },
    discount: { type: Number, default: 0, min: 0 },
    paymentOption: {
      type: String,
      enum: ["dp30", "dp50", "lunas"],
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentBankName: { type: String, default: "" },
    paymentAccountNumber: { type: String, default: "" },
    paymentAccountHolder: { type: String, default: "" },
    paymentQrisImageUrl: { type: String, default: "" },
    paymentProofUrl: { type: String, default: "" },
    paymentRejectionReason: { type: String, default: "" },
    paymentStatus: {
      type: String,
      required: true,
    },
    paidAmount: {
      type: Number,
      required: true,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    paymentDueAt: {
      type: Date,
      default: null,
      index: true,
    },
    paymentReminder: {
      type: String,
      default: "",
    },
    paymentHistory: {
      type: [{
        paymentId: { type: String, required: true },
        type: { type: String, enum: ["DP", "PELUNASAN", "COD"], required: true },
        amount: { type: Number, required: true, min: 0 },
        method: { type: String, required: true },
        status: { type: String, enum: ["MENUNGGU_VERIFIKASI", "TERVERIFIKASI", "DITOLAK"], default: "MENUNGGU_VERIFIKASI" },
        reference: { type: String, default: "" },
        proofUrl: { type: String, default: "" },
        rejectionReason: { type: String, default: "" },
        verifiedBy: { type: String, default: "" },
        verifiedAt: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
    cateringDate: {
      type: String,
      required: true,
    },
    cateringTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Menunggu", "Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai", "Dibatalkan"],
      default: "Menunggu",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

cateringOrderSchema.index({ ownerId: 1, createdAt: -1 });
cateringOrderSchema.index({ customerId: 1, createdAt: -1 });
cateringOrderSchema.index({ driverId: 1, status: 1 });
cateringOrderSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

module.exports = mongoose.model("CateringOrder", cateringOrderSchema);
