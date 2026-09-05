const mongoose = require("mongoose");

const marketplaceProductSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    cat: { type: String, required: true, default: "Makanan" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    img: { type: String, default: "" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    sold: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

marketplaceProductSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model("MarketplaceProduct", marketplaceProductSchema);
