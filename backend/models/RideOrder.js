const mongoose = require("mongoose");

const rideOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    orderType: {
      type: String,
      default: "KANYAAH_RIDE",
    },
    serviceType: {
      type: String,
      default: "RIDE",
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

    // Driver Information
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
      default: "F 1234 ABC",
    },

    // Vehicle Type
    vehicleType: {
      type: String,
      enum: ["MOTOR", "CAR"],
      default: "MOTOR",
    },

    // Pickup & Destination
    pickup: {
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      placeName: { type: String, default: "" },
    },
    destination: {
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      placeName: { type: String, default: "" },
    },

    customerNote: {
      type: String,
      default: "",
      maxlength: 150,
    },

    // Distance, Timing & Pricing
    estimatedDistance: {
      type: Number,
      default: 0, // in km
    },
    estimatedDuration: {
      type: Number,
      default: 0, // in minutes
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
    driverEarnings: {
      type: Number,
      default: 0,
    },

    // Payment Information
    paymentMethod: {
      type: String,
      default: "Bayar Tunai",
    },
    paymentStatus: {
      type: String,
      enum: ["Menunggu Pembayaran", "Lunas", "Dibatalkan"],
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
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      default: "",
    },

    // Cancellation details
    cancelledBy: {
      type: String,
      enum: ["customer", "driver", null],
      default: null,
    },
    cancelReason: {
      type: String,
      default: "",
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
