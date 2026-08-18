const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kost",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    roomNumber: {
      type: String,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
    },
    customerKtpUrl: {
      type: String, // Google Drive URL
    },
    entryDate: {
      type: Date,
      required: true,
    },
    durationMonths: {
      type: Number,
      default: 1,
    },
    monthlyPrice: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    dpAmount: {
      type: Number,
      required: true,
    },
    dpProofImage: {
      type: String, // Google Drive URL
    },
    dpPaidAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending_dp", "dp_submitted", "dp_verified", "rejected", "active", "completed", "cancelled"],
      default: "dp_submitted",
    },
    rejectionReason: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
