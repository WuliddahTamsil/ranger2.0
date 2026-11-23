const mongoose = require("mongoose");

const revisionItemSchema = new mongoose.Schema(
  {
    revisionIndex: { type: Number, default: 1 },
    rejectionReason: { type: String, default: "" },
    rejectedAt: { type: Date },
    rejectedByName: { type: String, default: "" },
    resubmittedAt: { type: Date },
    previousSnapshot: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: true }
);

const dryingProgressSchema = new mongoose.Schema(
  {
    currentStage: {
      type: String,
      enum: [
        "WAITING_CONFIRMATION",     // 1. Menunggu konfirmasi
        "CONFIRMED",                // 2. Pesanan dikonfirmasi
        "WAITING_COFFEE_RECEIPT",   // 3. Menunggu penerimaan kopi
        "DRYING_IN_PROGRESS",       // 4. Proses pengeringan
        "DRYING_COMPLETED",         // 5. Pengeringan selesai
        "READY_FOR_PICKUP",         // 6. Siap diambil
        "COMPLETED",                // 7. Selesai
      ],
      default: "WAITING_CONFIRMATION",
    },
    coffeeType: {
      type: String,
      default: "Arabika",
    },
    dryingMethod: {
      type: String,
      enum: [
        "GEOTHERMAL_WASH",
        "HONEY_SKIN_CONTACT",
        "NATURAL_QUICK_DRY",
        "OTHER",
        "Geothermal Wash",
        "Honey Skin Contact",
        "Natural Quick Dry",
        "Other",
      ],
      default: "GEOTHERMAL_WASH",
    },
    dryingMethodName: {
      type: String,
      default: "Geothermal Wash",
    },
    initialWeightKg: {
      type: Number,
      default: 0,
    },
    finalWeightKg: {
      type: Number,
      default: null,
    },
    moistureContentPercent: {
      type: Number,
      default: null,
    },
    occupancyTier: {
      type: String,
      default: "0–30%",
    },
    discountPercent: {
      type: Number,
      default: 50,
    },
    appliedRatePerKg: {
      type: Number,
      default: 500,
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    operatorNotes: { type: String, default: "" },
    operatorName: { type: String, default: "" },
    stageHistory: [
      {
        stage: { type: String, required: true },
        stageLabel: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: "" },
        updatedBy: { type: String, default: "" },
      },
    ],
  },
  { _id: false }
);

const geoDirectBookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, required: true },
      email: { type: String, default: "" },
      phone: { type: String, required: true },
      company: { type: String, default: "" }, // Instansi / Perusahaan
      address: { type: String, default: "" },
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoDirectEquipment",
      required: true,
      index: true,
    },
    equipmentSnapshot: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      basePrice: { type: Number, default: 0 },
      pricingUnit: { type: String, default: "per_hari" },
    },
    rentalSchedule: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      durationDays: { type: Number, required: true, min: 1 },
    },
    usagePurpose: {
      type: String,
      required: true,
      trim: true,
    },
    usageLocation: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
    },
    productionNeeds: {
      productType: { type: String, default: "" }, // e.g. Teh, Kopi, etc.
      rawMaterialKg: { type: Number, default: 0 },
      rawMaterialTons: { type: Number, default: 0 },
      processRequirements: { type: String, default: "" },
      customParameters: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    pricingSnapshot: {
      basePrice: { type: Number, required: true, default: 0 },
      durationDays: { type: Number, required: true, default: 1 },
      subtotalBase: { type: Number, required: true, default: 0 },
      productionAddonRate: { type: Number, default: 0 },
      productionAddonTotal: { type: Number, default: 0 },
      totalRentalCost: { type: Number, required: true, default: 0 },
      dpPercentage: { type: Number, required: true, default: 30 },
      requiredDpAmount: { type: Number, required: true, default: 0 },
      dpCreditApplied: { type: Number, default: 0 }, // From DP Balance Ledger
      netDpDue: { type: Number, required: true, default: 0 },
      remainingBalance: { type: Number, required: true, default: 0 },
      formulaApplied: { type: String, default: "STANDARD_DAILY" },
    },
    bookingStatus: {
      type: String,
      enum: [
        "DRAFT",
        "WAITING_PAYMENT",
        "PAYMENT_REVIEW",
        "WAITING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "WAITING_PAYMENT",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "WAITING_VERIFICATION", "VERIFIED", "REJECTED"],
      default: "UNPAID",
      index: true,
    },
    paymentProof: {
      fileUrl: { type: String, default: "" },
      fileName: { type: String, default: "" },
      fileType: { type: String, default: "" },
      uploadedAt: { type: Date },
      paymentMethodType: {
        type: String,
        enum: ["QRIS", "BANK_TRANSFER", "DP_BALANCE", "NONE"],
        default: "NONE",
      },
      transferToBank: { type: String, default: "" },
    },
    verificationDetails: {
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verifiedByName: { type: String, default: "" },
      verifiedAt: { type: Date },
      rejectionReason: { type: String, default: "" },
    },
    approvalDetails: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedByName: { type: String, default: "" },
      approvedAt: { type: Date },
      approvalNotes: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
    },
    invoice: {
      invoiceNumber: { type: String, default: "" },
      status: {
        type: String,
        enum: ["NOT_ISSUED", "ISSUED", "REVISED"],
        default: "NOT_ISSUED",
      },
      issuedAt: { type: Date },
      pdfUrl: { type: String, default: "" },
      revisionCount: { type: Number, default: 0 },
    },
    dryingProgress: {
      type: dryingProgressSchema,
      default: () => ({}),
    },
    revisionHistory: [revisionItemSchema],
    previousBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoDirectBooking",
    },
  },
  {
    timestamps: true,
  }
);

geoDirectBookingSchema.index({ customer: 1, createdAt: -1 });
geoDirectBookingSchema.index({ bookingStatus: 1, paymentStatus: 1 });

module.exports = mongoose.model("GeoDirectBooking", geoDirectBookingSchema);

