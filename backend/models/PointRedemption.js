const mongoose = require("mongoose");

const pointRedemptionSchema = new mongoose.Schema(
  {
    redemptionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bankSampahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WasteBank",
      default: null,
    },
    type: {
      type: String,
      enum: ["VOUCHER", "CASH", "BANK_TRANSFER", "E_WALLET"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 1,
    },
    rupiahValue: {
      type: Number,
      required: true,
      min: 1,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    payoutDestination: {
      channel: { type: String, default: "" }, // e.g. "BCA", "GOPAY", "TUNAI_DI_BANK"
      accountNumber: { type: String, default: "" },
      accountName: { type: String, default: "" },
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
    voucherCode: {
      type: String,
      default: "",
    },
    voucherDetails: {
      title: { type: String, default: "" },
      service: { type: String, default: "" },
      discountValue: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["REQUESTED", "REVIEWING", "APPROVED", "PAID", "REJECTED", "CANCELLED"],
      default: "REQUESTED",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

pointRedemptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PointRedemption", pointRedemptionSchema);
