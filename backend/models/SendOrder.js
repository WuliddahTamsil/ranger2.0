const mongoose = require("mongoose");

const sendOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    serviceType: {
      type: String,
      default: "KANYAAH_SEND",
    },
    orderType: {
      type: String,
      default: "KANYAAH_SEND",
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
      index: true,
    },

    sender: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      notes: { type: String, default: "" },
      locationInstruction: { type: String, default: "" },
    },

    recipient: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      notes: { type: String, default: "" },
      preferredDeliveryTime: { type: String, default: "" },
    },

    package: {
      name: { type: String, required: true },
      category: {
        type: String,
        required: true,
        enum: [
          "Dokumen",
          "Makanan",
          "Pakaian",
          "Elektronik",
          "Barang rumah tangga",
          "Paket kecil",
          "Paket besar",
          "Barang mudah pecah",
          "Lainnya",
        ],
      },
      quantity: { type: Number, default: 1, min: 1 },
      weightKg: { type: Number, default: 1, min: 0.1 },
      lengthCm: { type: Number, default: 10, min: 1 },
      widthCm: { type: Number, default: 10, min: 1 },
      heightCm: { type: Number, default: 10, min: 1 },
      fragile: { type: Boolean, default: false },
      specialHandling: { type: Boolean, default: false },
      declaredValue: { type: Number, default: 0 },
      photoUrls: { type: [String], default: [] },
      notes: { type: String, default: "" },
    },

    pricing: {
      baseFare: { type: Number, default: 8000 },
      distanceFare: { type: Number, default: 0 },
      weightFare: { type: Number, default: 0 },
      sizeFare: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 1500 },
      insuranceFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      estimatedFare: { type: Number, required: true },
      finalFare: { type: Number, default: null },
      driverEarnings: { type: Number, default: 0 },
    },

    distanceKm: { type: Number, default: 0 },
    estimatedDurationMinutes: { type: Number, default: 0 },
    actualDurationMinutes: { type: Number, default: null },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    paymentMethod: {
      type: String,
      default: "QRIS",
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PENDING", "CASH_PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    // Security OTP & Pickup verification (hashes stored, never plain text in production DB)
    pickupCodeHash: { type: String, default: "" },
    pickupCodeSalt: { type: String, default: "" },
    pickupCodeRaw: { type: String, default: "" }, // For in-app customer display
    pickupAttempts: { type: Number, default: 0 },

    deliveryOtpHash: { type: String, default: "" },
    deliveryOtpSalt: { type: String, default: "" },
    deliveryOtpRaw: { type: String, default: "" }, // Sent to recipient/displayed on secure receipt
    deliveryOtpAttempts: { type: Number, default: 0 },

    pickupProofUrls: { type: [String], default: [] },
    deliveryProofUrls: { type: [String], default: [] },

    driverLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "PAYMENT_PENDING",
        "SEARCHING_DRIVER",
        "DRIVER_ASSIGNED",
        "DRIVER_ON_THE_WAY_TO_PICKUP",
        "DRIVER_ARRIVED_AT_PICKUP",
        "PICKUP_VERIFICATION",
        "PICKED_UP",
        "IN_TRANSIT",
        "ARRIVED_AT_DESTINATION",
        "DELIVERY_VERIFICATION",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "DISPUTED",
        "RESOLVED",
      ],
      default: "SEARCHING_DRIVER",
      index: true,
    },

    declinedByDrivers: {
      type: [String],
      default: [],
    },

    cancellation: {
      cancelledBy: { type: String, enum: ["customer", "driver", "system", "admin", null], default: null },
      reason: { type: String, default: "" },
      fee: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      cancelledAt: { type: Date, default: null },
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

    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      review: { type: String, default: "" },
      createdAt: { type: Date, default: null },
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

sendOrderSchema.index({ customerId: 1, createdAt: -1 });
sendOrderSchema.index({ driverId: 1, status: 1 });
sendOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SendOrder", sendOrderSchema);
