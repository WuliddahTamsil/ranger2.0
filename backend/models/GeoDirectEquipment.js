const mongoose = require("mongoose");

const productionParameterSchema = new mongoose.Schema(
  {
    paramKey: { type: String, required: true }, // e.g. "productType", "rawMaterialTons"
    paramLabel: { type: String, required: true }, // e.g. "Jenis Produk", "Jumlah Bahan Baku"
    paramType: {
      type: String,
      enum: ["select", "number", "text"],
      default: "text",
    },
    options: [{ type: String }], // For select type, e.g. ["Teh", "Kopi", "Essential Oil", "Lainnya"]
    unit: { type: String, default: "" }, // e.g. "ton", "kg", "liter"
    required: { type: Boolean, default: false },
    ratePerUnit: { type: Number, default: 0 }, // Additional cost per unit if applicable
    helperText: { type: String, default: "" },
  },
  { _id: true }
);

const geoDirectEquipmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    }, // e.g. "EQ-01", "EQ-02", "EQ-03", "EQ-04"
    name: {
      type: String,
      required: true,
      trim: true,
    }, // e.g. "Equipment 01"
    description: {
      type: String,
      default: "Layanan penyewaan alat PGE Center of Excellence (Menunggu rincian resmi PGE).",
    },
    specification: {
      type: String,
      default: "Spesifikasi teknis dapat diatur melalui Dashboard Admin.",
    },
    function: {
      type: String,
      default: "Pemanfaatan langsung energi panas bumi (Direct Use).",
    },
    capacity: {
      type: String,
      default: "Kapasitas operasional dapat dikonfigurasi melalui Dashboard Admin.",
    },
    rentalTerms: {
      type: String,
      default: "1. Mematuhi SOP PGE Kamojang.\n2. Wajib membawa Nota Persetujuan resmi saat pengambilan alat.\n3. Pembayaran DP diverifikasi oleh Admin.",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    basePrice: {
      type: Number,
      default: 0, // 0 = Menunggu konfigurasi PGE
    },
    pricingUnit: {
      type: String,
      enum: ["per_hari", "per_minggu", "per_bulan", "per_ton", "per_batch"],
      default: "per_hari",
    },
    dpPercentage: {
      type: Number,
      default: 30, // Default 30% Down Payment
      min: 0,
      max: 100,
    },
    pricingFormulaType: {
      type: String,
      enum: ["STANDARD_DAILY", "DAILY_PLUS_CAPACITY", "FIXED"],
      default: "STANDARD_DAILY",
    },
    productionParameters: [productionParameterSchema],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
geoDirectEquipmentSchema.index({ code: 1 });
geoDirectEquipmentSchema.index({ isActive: 1, isAvailable: 1 });

module.exports = mongoose.model("GeoDirectEquipment", geoDirectEquipmentSchema);

