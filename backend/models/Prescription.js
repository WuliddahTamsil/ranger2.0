const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionCode: {
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
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: "",
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceStore",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopOrder",
      default: null,
      index: true,
    },
    doctorName: {
      type: String,
      default: "",
    },
    prescriptionDate: {
      type: Date,
      default: Date.now,
    },
    imageUrls: {
      type: [String],
      required: true,
      validate: [(val) => val.length > 0, "Minimal 1 foto lembar resep wajib diunggah"],
    },
    customerNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["WAITING_PRESCRIPTION_REVIEW", "APPROVED", "REJECTED"],
      default: "WAITING_PRESCRIPTION_REVIEW",
      index: true,
    },
    pharmacistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pharmacistName: {
      type: String,
      default: "",
    },
    pharmacistNotes: {
      type: String,
      default: "",
    },
    rejectionReason: {
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

module.exports = mongoose.model("Prescription", prescriptionSchema);
