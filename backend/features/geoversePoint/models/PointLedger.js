const mongoose = require("mongoose");
const { LEDGER_TYPES, SOURCE_TYPES } = require("../constants/pointConstants");

if (mongoose.models.PointLedger) {
  module.exports = mongoose.models.PointLedger;
} else {
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
        enum: Object.values(LEDGER_TYPES),
        required: true,
        index: true,
      },
      sourceType: {
        type: String,
        enum: Object.values(SOURCE_TYPES),
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
}
