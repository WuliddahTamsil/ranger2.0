const mongoose = require("mongoose");

const cateringProductSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
    },
    cat: {
      type: String,
      required: true,
      default: "Nasi Box",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    img: {
      type: String,
      default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80",
    },
  },
  {
    timestamps: true,
  }
);

cateringProductSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model("CateringProduct", cateringProductSchema);
