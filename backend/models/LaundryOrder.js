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
    addressSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
    weighingProofImage: {
      type: String,
      default: "",
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
    pointDiscount: {
      type: Number,
      default: 0,
    },
    pointsUsed: {
      type: Number,
      default: 0,
    },
    pointRate: {
      type: Number,
      default: 0.01,
    },
    grossAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      default: 0,
    },
    pointRefunded: {
      type: Boolean,
      default: false,
    },
    reversalIdempotencyKey: {
      type: String,
      default: null,
    },
    paymentIdempotencyKey: {
      type: String,
      default: null,
    },

    // Store Payment Snapshot (Bank & QRIS for customer)
    bankName: {
      type: String,
      default: "",
    },
    bankAccountNumber: {
      type: String,
      default: "",
    },
    bankAccountHolder: {
      type: String,
      default: "",
    },
    qrisImageUrl: {
      type: String,
      default: "",
    },

    // Payment Status, Proof & Method
    paymentStatus: {
      type: String,
      enum: ["menunggu_timbangan", "menunggu_pembayaran", "menunggu_verifikasi", "lunas", "ditolak", "batal"],
      default: "menunggu_timbangan",
    },
    paymentMethod: {
      type: String,
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

    // Driver Live Tracking
    driverLiveCoords: {
      type: String,
      default: "",
    },
    driverLiveLat: {
      type: Number,
      default: null,
    },
    driverLiveLng: {
      type: Number,
      default: null,
    },

    // Order Lifecycle Status
    status: {
      type: String,
      enum: [
        "MENUNGGU_KONFIRMASI_MITRA",
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
      default: "MENUNGGU_KONFIRMASI_MITRA",
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

laundryOrderSchema.index({ customerId: 1, createdAt: -1 });
laundryOrderSchema.index({ customerPhone: 1, createdAt: -1 });
laundryOrderSchema.index({ ownerId: 1, createdAt: -1 });
laundryOrderSchema.index({ storeId: 1, createdAt: -1 });
laundryOrderSchema.index({ status: 1, createdAt: -1 });
laundryOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("LaundryOrder", laundryOrderSchema);
