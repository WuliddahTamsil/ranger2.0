const mongoose = require("mongoose");

const marketplaceWithdrawalSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storeName: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 10000,
    },
    method: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Diproses", "Sukses", "Ditolak"],
      default: "Diproses",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

marketplaceWithdrawalSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model("MarketplaceWithdrawal", marketplaceWithdrawalSchema);
