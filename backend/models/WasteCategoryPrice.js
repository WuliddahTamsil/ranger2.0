const mongoose = require("mongoose");

const wasteCategoryPriceSchema = new mongoose.Schema(
  {
    bankSampahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WasteBank",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Plastik",
        "Kertas & Kardus",
        "Logam & Besi",
        "Kaca & Botol",
        "Elektronik",
        "Minyak Jelantah",
        "Organik",
        "Lainnya",
      ],
      index: true,
    },
    subCategory: {
      type: String,
      default: "Campur / Standard",
      trim: true,
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
    minWeightKg: {
      type: Number,
      default: 0.1,
      min: 0.01,
    },
    unit: {
      type: String,
      default: "kg",
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveUntil: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    priceSource: {
      type: String,
      default: "Pengepul Rekanan Kamojang",
    },
    collectorName: {
      type: String,
      default: "",
    },
    priceVersion: {
      type: String,
      default: "v1.0",
    },
    approvedBy: {
      type: String,
      default: "",
    },
    priceAuditLog: [
      {
        pricePerKg: { type: Number, required: true },
        priceSource: { type: String, default: "" },
        collectorName: { type: String, default: "" },
        reason: { type: String, default: "" },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

wasteCategoryPriceSchema.index({ bankSampahId: 1, category: 1, isActive: 1 });

module.exports = mongoose.model("WasteCategoryPrice", wasteCategoryPriceSchema);
