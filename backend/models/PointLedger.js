const mongoose = require("mongoose");

const pointLedgerSchema = new mongoose.Schema(
  {
    ledgerId: {
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
    type: {
      type: String,
      enum: ["EARN", "REDEEM_VOUCHER", "REDEEM_CASH", "REVERSAL", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["WASTE_DEPOSIT", "VOUCHER", "CASH_REDEMPTION", "ADMIN"],
      required: true,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "REVERSED"],
      default: "CONFIRMED",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pointLedgerSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PointLedger", pointLedgerSchema);
