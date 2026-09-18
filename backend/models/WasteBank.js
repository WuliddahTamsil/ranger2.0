const mongoose = require("mongoose");

const wasteBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
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
    },
    longitude: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      default: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    openingHours: {
      type: String,
      default: "Senin - Sabtu, 08:00 - 16:00",
    },
    acceptsPickup: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    totalWasteProcessedKg: {
      type: Number,
      default: 0,
    },
    totalPointsIssued: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

wasteBankSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model("WasteBank", wasteBankSchema);
