const mongoose = require("mongoose");

const laundryOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    // Customer Info
    customerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      default: "",
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    pickupCoords: {
      type: String,
      default: "",
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryCoords: {
      type: String,
      default: "",
    },

    // Store & Service Info
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LaundryStore",
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      default: 6000,
    },
    unitType: {
      type: String,
      default: "kg",
    },

    // Driver Assignment
    driverPickupId: {
      type: String,
      default: null,
    },
    driverPickupName: {
      type: String,
      default: "",
    },
    driverPickupPhone: {
      type: String,
      default: "",
    },
    driverDeliveryId: {
      type: String,
      default: null,
    },
    driverDeliveryName: {
      type: String,
      default: "",
    },
    driverDeliveryPhone: {
      type: String,
      default: "",
    },

    // Weighing & Pricing details
    actualWeightOrQty: {
      type: Number,
      default: null,
    },
    laundryCost: {
      type: Number,
      default: 0,
    },
    deliveryFeePickup: {
      type: Number,
      default: 4000,
    },
    deliveryFeeDrop: {
      type: Number,
      default: 4000,
    },
    serviceFee: {
      type: Number,
      default: 1000,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },

    // Payment Status, Proof & Method
    paymentStatus: {
      type: String,
      enum: ["menunggu_timbangan", "menunggu_pembayaran", "menunggu_verifikasi", "lunas", "ditolak", "batal"],
      default: "menunggu_timbangan",
    },
    paymentMethod: {
      type: String,
      enum: ["QRIS", "Transfer Bank", "QRIS / Transfer Bank", ""],
      default: "QRIS",
    },
    paymentProofUrl: {
      type: String,
      default: "",
    },
    paymentRejectionReason: {
      type: String,
      default: "",
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // Order Lifecycle Status
    status: {
      type: String,
      enum: [
        "MENUNGGU_DRIVER_JEMPUT",
        "DRIVER_MENUJU_CUSTOMER",
        "DRIVER_MENUJU_LAUNDRY",
        "TIBA_DI_LAUNDRY",
        "MENUNGGU_PEMBAYARAN",
        "MENUNGGU_VERIFIKASI_PEMBAYARAN",
        "PEMBAYARAN_LUNAS",
        "SEDANG_DICUCI",
        "SIAP_DIANTAR",
        "DRIVER_MENGANTAR_BALIK",
        "SELESAI",
        "DIBATALKAN",
      ],
      default: "MENUNGGU_DRIVER_JEMPUT",
    },

    notes: {
      type: String,
      default: "",
    },
    estimatedHours: {
      type: Number,
      default: 24,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LaundryOrder", laundryOrderSchema);
