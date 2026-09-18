const mongoose = require("mongoose");

const rideOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderType: {
      type: String,
      default: "KANYAAH_RIDE",
    },
    serviceType: {
      type: String,
      default: "KANYAAH_RIDE",
    },

    // Customer Information
    customerId: {
      type: String,
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

    // Driver Information & Atomic Assignment
    driverId: {
      type: String,
      default: null,
      index: true,
    },
    driverName: {
      type: String,
      default: "",
    },
    driverPhone: {
      type: String,
      default: "",
    },
    driverPhoto: {
      type: String,
      default: "",
    },
    driverRating: {
      type: Number,
      default: 4.9,
    },
    driverVehicle: {
      type: String,
      default: "Honda Beat",
    },
    driverPlate: {
      type: String,
      default: "",
    },

    // Full Driver Snapshot when assigned
    driverSnapshot: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      photo: { type: String, default: "" },
      vehicleType: { type: String, default: "" },
      vehiclePlate: { type: String, default: "" },
      rating: { type: Number, default: 5.0 },
    },

    // Live driver GPS location during active ride
    driverLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    // Vehicle Type
    vehicleType: {
      type: String,
      enum: ["MOTOR", "MOBIL", "CAR"],
      default: "MOTOR",
    },

    // Pickup & Destination Points
    pickup: {
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      placeName: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    destination: {
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      placeName: { type: String, default: "" },
      notes: { type: String, default: "" },
    },

    customerNote: {
      type: String,
      default: "",
      maxlength: 250,
    },

    // Distance, Timing & Pricing Calculations (Backend Enforced)
    estimatedDistanceKm: {
      type: Number,
      default: 0,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
    },
    // Backwards-compatible aliases
    estimatedDistance: {
      type: Number,
      default: 0,
    },
    estimatedDuration: {
      type: Number,
      default: 0,
    },

    baseFare: {
      type: Number,
      default: 8000,
    },
    distanceFare: {
      type: Number,
      default: 0,
    },
    timeFare: {
      type: Number,
      default: 0,
    },
    serviceFee: {
      type: Number,
      default: 1000,
    },
    discount: {
      type: Number,
      default: 0,
    },

    estimatedFare: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    finalFare: {
      type: Number,
      default: null,
    },
    actualDistanceKm: {
      type: Number,
      default: null,
    },
    actualDurationMinutes: {
      type: Number,
      default: null,
    },
    driverEarnings: {
      type: Number,
      default: 0,
    },

    // Payment Information
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    paymentMethod: {
      type: String,
      default: "Bayar Tunai", // "Bayar Tunai" (Cash), "QRIS", "BCA Virtual Account", "GoPay"
    },
    paymentStatus: {
      type: String,
      enum: ["Menunggu Pembayaran", "Lunas", "Dibatalkan", "Refunded"],
      default: "Menunggu Pembayaran",
    },

    // Order Lifecycle Status
    status: {
      type: String,
      enum: [
        "SEARCHING_DRIVER",
        "DRIVER_ASSIGNED",
        "DRIVER_ON_THE_WAY",
        "DRIVER_ARRIVED",
        "TRIP_STARTED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
      ],
      default: "SEARCHING_DRIVER",
      index: true,
    },

    // Drivers who have declined this ride
    declinedByDrivers: {
      type: [String],
      default: [],
    },

    // Rating & Feedback
    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      review: { type: String, default: "" },
      createdAt: { type: Date, default: null },
    },

    // Cancellation details
    cancellation: {
      cancelledBy: { type: String, enum: ["customer", "driver", "system", null], default: null },
      reason: { type: String, default: "" },
      fee: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      cancelledAt: { type: Date, default: null },
    },

    // Backwards-compatible fields
    cancelledBy: {
      type: String,
      default: null,
    },
    cancelReason: {
      type: String,
      default: "",
    },

    // Audit trail of status transitions
    statusHistory: [
      {
        status: { type: String, required: true },
        actorId: { type: String, default: null },
        actorRole: { type: String, default: "system" },
        note: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

rideOrderSchema.index({ customerId: 1, createdAt: -1 });
rideOrderSchema.index({ driverId: 1, status: 1 });
rideOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("RideOrder", rideOrderSchema);
