const mongoose = require("mongoose");

const depositCategoryItemSchema = new mongoose.Schema(
  {
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
    },
    subCategory: {
      type: String,
      default: "Standard",
    },
    estimatedWeightKg: {
      type: Number,
      required: true,
      min: 0,
    },
    actualWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
    totalRupiah: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPoint: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const wasteDepositSchema = new mongoose.Schema(
  {
    depositCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bankSampahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WasteBank",
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    method: {
      type: String,
      enum: ["DROP_OFF", "PICKUP"],
      required: true,
      default: "DROP_OFF",
    },

    // Pickup details (if method === PICKUP)
    pickupAddress: {
      type: String,
      default: "",
    },
    pickupLatitude: {
      type: Number,
      default: null,
    },
    pickupLongitude: {
      type: Number,
      default: null,
    },
    pickupSchedule: {
      type: Date,
      default: null,
    },
    pickupNotes: {
      type: String,
      default: "",
    },

    // Categories array
    categories: {
      type: [depositCategoryItemSchema],
      default: [],
    },

    // Aggregates & Points
    estimatedTotalWeightKg: {
      type: Number,
      default: 0,
    },
    actualTotalWeightKg: {
      type: Number,
      default: 0,
    },
    estimatedPoint: {
      type: Number,
      default: 0,
    },
    finalPoint: {
      type: Number,
      default: 0,
    },
    estimatedRupiah: {
      type: Number,
      default: 0,
    },
    finalRupiah: {
      type: Number,
      default: 0,
    },

    // Photos & Proof
    customerPhotos: {
      type: [String],
      default: [],
    },
    weighingProofPhotos: {
      type: [String],
      default: [],
    },
    weighingNotes: {
      type: String,
      default: "",
    },
    weighedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerConfirmedAt: {
      type: Date,
      default: null,
    },

    // Dispute / Complaint
    disputeReason: {
      type: String,
      default: "",
    },
    disputeResolvedAt: {
      type: Date,
      default: null,
    },

    // Status Lifecycle
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "ACCEPTED",
        "DRIVER_ASSIGNED",
        "PICKUP_ON_THE_WAY",
        "PICKED_UP",
        "AT_BANK",
        "WEIGHING",
        "WAITING_CUSTOMER_CONFIRMATION",
        "POINT_ISSUED",
        "COMPLETED",
        "DISPUTED",
        "RESOLVED",
        "CANCELLED",
        "REJECTED",
      ],
      default: "REQUESTED",
      index: true,
    },

    statusHistory: [
      {
        status: { type: String, required: true },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        actorRole: { type: String, default: "customer" },
        note: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Environmental Impact metrics
    environmentalImpact: {
      co2ReductionKg: { type: Number, default: 0 },
      treesEquivalent: { type: Number, default: 0 },
      landfillDivertedKg: { type: Number, default: 0 },
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

wasteDepositSchema.index({ customerId: 1, createdAt: -1 });
wasteDepositSchema.index({ bankSampahId: 1, status: 1 });

module.exports = mongoose.model("WasteDeposit", wasteDepositSchema);
