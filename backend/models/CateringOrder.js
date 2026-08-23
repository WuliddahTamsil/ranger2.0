const mongoose = require("mongoose");

const cateringOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    menuName: {
      type: String,
      required: true,
    },
    portions: {
      type: Number,
      required: true,
      min: 10,
    },
    price: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    serviceFee: {
      type: Number,
      default: 0,
    },
    paymentOption: {
      type: String,
      enum: ["dp30", "dp50", "lunas"],
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    paidAmount: {
      type: Number,
      required: true,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    cateringDate: {
      type: String,
      required: true,
    },
    cateringTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Menunggu", "Diproses", "Dikirim", "Selesai", "Dibatalkan"],
      default: "Menunggu",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CateringOrder", cateringOrderSchema);
