const mongoose = require("mongoose");

const marketplaceStoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storeType: {
      type: String,
      required: true,
      enum: [
        "SUPERMARKET",
        "MINIMARKET",
        "PHARMACY",
        "HEALTH",
        "BABY",
        "BEAUTY",
        "HOUSEHOLD",
        "UMKM",
        "OTHER",
      ],
      default: "SUPERMARKET",
      index: true,
    },
    logo: {
      type: String,
      default: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300",
    },
    coverImage: {
      type: String,
      default: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    },
    description: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
      default: -7.1475,
    },
    longitude: {
      type: Number,
      required: true,
      default: 107.8015,
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingHours: {
      openTime: { type: String, default: "07:00" },
      closeTime: { type: String, default: "22:00" },
      daysOpen: { type: [String], default: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] },
      isOpenNow: { type: Boolean, default: true },
    },
    minimumOrder: {
      type: Number,
      default: 10000,
      min: 0,
    },
    deliveryRadiusKm: {
      type: Number,
      default: 20,
      min: 1,
    },
    acceptsInstantDelivery: {
      type: Boolean,
      default: true,
    },
    acceptsScheduledDelivery: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isOfficialPharmacy: {
      type: Boolean,
      default: false,
    },
    pharmacistName: {
      type: String,
      default: "",
    },
    pharmacistSipa: {
      type: String,
      default: "",
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

marketplaceStoreSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model("MarketplaceStore", marketplaceStoreSchema);
