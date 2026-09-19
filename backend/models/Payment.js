const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    orderCode: {
      type: String,
      index: true,
    },
    orderType: {
      type: String,
      required: true,
      enum: ["RIDE", "MARKETPLACE", "CATERING", "LAUNDRY", "SEND", "KANYAAH_SEND", "KANYAAH_SHOP", "SHOP"],
      index: true,
    },
    orderCategory: {
      type: String,
      required: true,
      enum: ["RIDE", "DELIVERY"],
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: "Pelanggan",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: [
        "QRIS",
        "GOPAY",
        "OVO",
        "DANA",
        "SHOPEEPAY",
        "BCA_VA",
        "BNI_VA",
        "BRI_VA",
        "MANDIRI_VA",
        "PERMATA_VA",
        "VA_BCA",
        "VA_BNI",
        "VA_BRI",
        "VA_MANDIRI",
        "VA_PERMATA",
        "CASH",
        "COD",
      ],
      index: true,
    },
    paymentCategory: {
      type: String,
      enum: ["E_WALLET", "QR_CODE", "VIRTUAL_ACCOUNT", "CASH"],
      required: true,
    },
    status: {
      type: String,
      enum: ["UNPAID", "PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    gateway: {
      type: String,
      default: "GEOVERSE_GATEWAY",
    },
    gatewayTransactionId: {
      type: String,
      default: "",
    },
    qrString: {
      type: String,
      default: "",
    },
    qrCodeUrl: {
      type: String,
      default: "",
    },
    deepLinkUrl: {
      type: String,
      default: "",
    },
    virtualAccount: {
      bank: { type: String, default: "" },
      vaNumber: { type: String, default: "" },
      accountName: { type: String, default: "GEOVERSE RANGERS" },
      expiryTime: { type: Date },
    },
    paidAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
