const mongoose = require("mongoose");

const rideComplaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RideOrder",
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: "",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    driverId: {
      type: String,
      default: null,
    },
    driverName: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Tarif tidak sesuai",
        "Driver tidak datang",
        "Driver berperilaku buruk",
        "Lokasi tidak sesuai",
        "Barang atau kendaraan bermasalah",
        "Pembayaran bermasalah",
        "Perjalanan belum selesai tetapi sudah ditutup",
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
      type: String,
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

rideComplaintSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("RideComplaint", rideComplaintSchema);
