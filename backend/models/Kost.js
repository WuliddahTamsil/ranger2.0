const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  roomType: { type: String, default: "Standard" }, // e.g. Tipe A (AC + KM Dalam)
  floor: { type: Number, default: 1 },
  priceMonthly: { type: Number, required: true },
  priceYearly: { type: Number },
  isAvailable: { type: Boolean, default: true },
  currentTenant: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
    phone: { type: String },
    entryDate: { type: Date },
    dueDate: { type: Date },
  },
  facilities: [{ type: String }],
  images: [{ type: String }],
});

const kostSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Putra", "Putri", "Campur"],
      default: "Campur",
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      default: "Yogyakarta",
    },
    district: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true, // Starting / main price
    },
    facilities: [{ type: String }],
    rules: [{ type: String }],
    images: [{ type: String }], // Google Drive direct URLs
    rooms: [roomSchema],
    bankAccount: {
      bankName: { type: String, default: "BCA" },
      accountNumber: { type: String, default: "" },
      accountHolder: { type: String, default: "" },
      qrisImage: { type: String, default: "" },
    },
    dpAmount: {
      type: Number,
      default: 200000, // Nominal minimum DP
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for available rooms count
kostSchema.virtual("availableRoomsCount").get(function () {
  if (!this.rooms || this.rooms.length === 0) return 0;
  return this.rooms.filter((r) => r.isAvailable).length;
});

kostSchema.set("toJSON", { virtuals: true });
kostSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Kost", kostSchema);
