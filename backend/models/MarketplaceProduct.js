const mongoose = require("mongoose");

const marketplaceProductSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceStore",
      index: true,
      sparse: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "", trim: true },
    category: { type: String, default: "General", trim: true },
    cat: { type: String, required: true, default: "Makanan" }, // Legacy compatibility
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    promoPrice: { type: Number, default: null, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: "pcs" }, // e.g. "pcs", "kg", "pack", "strip", "botol"
    weight: { type: Number, default: 250 }, // in grams
    isActive: { type: Boolean, default: true },
    requiresPrescription: { type: Boolean, default: false },
    requiresAgeVerification: { type: Boolean, default: false },
    isEcoProduct: { type: Boolean, default: false },
    providerId: { type: String, default: "" },
    providerProductId: { type: String, default: "" },
    lastSyncAt: { type: Date, default: null },
    img: { type: String, default: "" },
    images: { type: [String], default: [] },
    imageUrls: { type: [String], default: [] },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    sold: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

marketplaceProductSchema.index({ ownerId: 1, createdAt: -1 });
marketplaceProductSchema.index({ storeId: 1, isActive: 1, category: 1 });

module.exports = mongoose.model("MarketplaceProduct", marketplaceProductSchema);
