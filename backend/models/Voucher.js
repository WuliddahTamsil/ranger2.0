const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    voucherCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    service: {
      type: String,
      enum: ["ALL", "MARKETPLACE", "RIDE", "SEND", "LAUNDRY", "CATERING", "KANYAAH_SHOP", "SHOP"],
      default: "ALL",
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    discountType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE"],
      default: "FIXED",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minTransaction: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null,
    },
    pointsCost: {
      type: Number,
      required: true,
      min: 1,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    userUsageLimit: {
      type: Number,
      default: 1,
    },
    claimedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        claimedAt: { type: Date, default: Date.now },
        used: { type: Boolean, default: false },
        usedAt: { type: Date, default: null },
      },
    ],
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Voucher", voucherSchema);
