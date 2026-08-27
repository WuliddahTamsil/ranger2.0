const mongoose = require("mongoose");

const laundryServiceItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  desc: {
    type: String,
    trim: true,
    default: "",
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    enum: ["kg", "pcs", "pasang", "meter"],
    default: "kg",
  },
  durationHours: {
    type: Number,
    default: 24,
  },
  category: {
    type: String,
    enum: ["biasa", "ekspres", "satuan"],
    default: "biasa",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const laundryStoreSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "Mitra Laundry Resmi Rangers App",
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    openingHours: {
      type: String,
      default: "08.00 - 21.00",
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    distanceText: {
      type: String,
      default: "0.8 km",
    },
    imageUrl: {
      type: String,
      default: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
    },
    badges: {
      type: [String],
      default: ["Antar Jemput", "Bergaransi Bersih"],
    },
    services: [laundryServiceItemSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LaundryStore", laundryStoreSchema);
