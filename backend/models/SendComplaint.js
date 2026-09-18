const mongoose = require("mongoose");

const sendComplaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SendOrder",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Barang rusak",
        "Barang hilang",
        "Barang belum sampai",
        "Penerima tidak menerima",
        "Driver bermasalah",
        "Tarif tidak sesuai",
        "Pembayaran bermasalah",
        "Alamat tidak sesuai",
        "Barang dikembalikan",
        "Lainnya",
      ],
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["OPEN", "INVESTIGATING", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolution: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sendComplaintSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("SendComplaint", sendComplaintSchema);
