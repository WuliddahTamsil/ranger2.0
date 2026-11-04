const mongoose = require("mongoose");

const geoDirectDpLedgerSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ["CREDIT_FROM_REJECTION", "DEBIT_APPLIED_TO_BOOKING", "MANUAL_ADJUSTMENT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    sourceBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoDirectBooking",
    },
    targetBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoDirectBooking",
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

geoDirectDpLedgerSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model("GeoDirectDpLedger", geoDirectDpLedgerSchema);

