const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String, required: true }, // e.g. "Bank Mandiri", "BRI", "BNI", "BCA"
    accountNumber: { type: String, required: true },
    accountHolder: { type: String, required: true },
    branch: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const geoDirectPaymentMethodSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "DEFAULT_SETTINGS",
      unique: true,
    },
    // QRIS Config
    qrisEnabled: {
      type: Boolean,
      default: false,
    },
    qrisImageUrl: {
      type: String,
      default: "",
    },
    qrisMerchantName: {
      type: String,
      default: "PGE Area Kamojang - Geo Direct Use",
    },
    qrisNmid: {
      type: String,
      default: "",
    },
    // Bank Transfer Accounts
    bankAccounts: [bankAccountSchema],
    // Instructions / Guidelines
    paymentInstructions: {
      type: String,
      default: "1. Transfer sesuai nominal DP yang tertera.\n2. Simpan bukti transfer.\n3. Unggah bukti transfer pada form pembayaran.\n4. Tunggu verifikasi oleh Admin PGE.",
    },
    paymentDeadlineHours: {
      type: Number,
      default: 24, // 24 hours deadline
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "GeoDirectPaymentMethod",
  geoDirectPaymentMethodSchema
);

