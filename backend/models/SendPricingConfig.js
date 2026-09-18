const mongoose = require("mongoose");

const sendPricingConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "DEFAULT_SEND_CONFIG",
      unique: true,
    },
    baseFare: {
      type: Number,
      default: 8000,
    },
    baseKm: {
      type: Number,
      default: 2,
    },
    pricePerKm: {
      type: Number,
      default: 2500,
    },
    pricePerKg: {
      type: Number,
      default: 1000,
    },
    baseKg: {
      type: Number,
      default: 1,
    },
    sizeFarePer1000Cm3: {
      type: Number,
      default: 500,
    },
    baseCm3: {
      type: Number,
      default: 6000, // 20x20x15 cm standard base box
    },
    serviceFee: {
      type: Number,
      default: 1500,
    },
    fragileFee: {
      type: Number,
      default: 3000,
    },
    minimumFare: {
      type: Number,
      default: 10000,
    },
    cancellationPolicies: {
      searchingDriverFee: { type: Number, default: 0 },
      driverAssignedFee: { type: Number, default: 3000 },
      driverArrivedPickupFee: { type: Number, default: 5000 },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SendPricingConfig", sendPricingConfigSchema);
