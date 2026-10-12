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
    // Business category (independent from brand)
    businessCategory: {
      type: String,
      enum: [
        "MINIMARKET",
        "SUPERMARKET",
        "PHARMACY",
        "COSMETICS",
        "BABY",
        "HEALTH",
        "HOUSEHOLD",
        "OTHER",
      ],
      default: "MINIMARKET",
      index: true,
    },
    // Brand / network type
    brandType: {
      type: String,
      enum: ["ALFAMART", "INDOMARET", "CIRCLE_K", "INDEPENDENT", "OTHER"],
      default: "INDEPENDENT",
      index: true,
    },
    brandName: {
      type: String,
      default: "",
      trim: true,
    },
    legalBusinessName: {
      type: String,
      default: "",
      trim: true,
    },
    outletName: {
      type: String,
      default: "",
      trim: true,
    },
    businessDescription: {
      type: String,
      default: "",
    },
    businessPhone: {
      type: String,
      default: "",
      trim: true,
    },
    // Official partner flag: NEVER automatically true, requires admin verification of cooperation docs
    isOfficialBrandPartner: {
      type: Boolean,
      default: false,
      index: true,
    },
    brandVerificationStatus: {
      type: String,
      enum: ["UNVERIFIED", "PENDING_VERIFICATION", "VERIFIED", "REJECTED"],
      default: "UNVERIFIED",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
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
      default: "MINIMARKET",
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
    isOpen: {
      type: Boolean,
      default: true,
      index: true,
    },
    openingDays: {
      type: String,
      default: "Buka Setiap Hari",
    },
    bankName: {
      type: String,
      default: "BCA",
    },
    bankAccountNumber: {
      type: String,
      default: "",
    },
    bankAccountHolder: {
      type: String,
      default: "",
    },
    qrisImageUrl: {
      type: String,
      default: "",
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
      enum: ["PENDING_REVIEW", "ACTIVE", "INACTIVE", "REJECTED", "CLOSED"],
      default: "PENDING_REVIEW",
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
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
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

marketplaceStoreSchema.index({ latitude: 1, longitude: 1 });
marketplaceStoreSchema.index({ businessCategory: 1, status: 1 });
marketplaceStoreSchema.index({ brandType: 1, status: 1 });

marketplaceStoreSchema.pre("save", function (next) {
  if (!this.name && this.outletName) {
    this.name = this.outletName;
  } else if (!this.outletName && this.name) {
    this.outletName = this.name;
  }

  // Synchronize businessCategory with legacy storeType
  const categoryToStoreType = {
    COSMETICS: "BEAUTY",
    PHARMACY: "PHARMACY",
    MINIMARKET: "MINIMARKET",
    SUPERMARKET: "SUPERMARKET",
    HEALTH: "HEALTH",
    BABY: "BABY",
    HOUSEHOLD: "HOUSEHOLD",
    OTHER: "OTHER",
  };

  if (this.businessCategory && (!this.storeType || this.storeType === "OTHER")) {
    this.storeType = categoryToStoreType[this.businessCategory] || "OTHER";
  }

  if (this.businessCategory === "PHARMACY" || this.storeType === "PHARMACY") {
    this.isOfficialPharmacy = true;
  }

  next();
});

module.exports = mongoose.model("MarketplaceStore", marketplaceStoreSchema);
