const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceProduct",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceStore",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["SALE", "RESTOCK", "ADJUSTMENT", "RESERVED", "RELEASED"],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    beforeStock: {
      type: Number,
      required: true,
    },
    afterStock: {
      type: Number,
      required: true,
    },
    sourceOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopOrder",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

inventoryLogSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
