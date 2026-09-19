const mongoose = require("mongoose");

const shopOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceProduct",
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
    },
    productImageSnapshot: {
      type: String,
      default: "",
    },
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 200,
    },
    requestedSubstitution: {
      type: String,
      enum: ["DONT_SUBSTITUTE", "SAME_CATEGORY", "CONTACT_ME", "AUTO_PRICE_LIMIT"],
      default: "CONTACT_ME",
    },
    actualAvailability: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "SUBSTITUTED"],
      default: "AVAILABLE",
    },
    replacementProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceProduct",
      default: null,
    },
    replacementProductName: {
      type: String,
      default: "",
    },
    adjustmentAmount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const shopOrderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    actorId: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      default: "system",
    },
    note: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const shopOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    requestHash: {
      type: String,
      default: "",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceStore",
      required: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    storeAddress: {
      type: String,
      default: "",
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true,
      default: null,
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
    driverPlateNumber: {
      type: String,
      default: "",
    },
    items: {
      type: [shopOrderItemSchema],
      required: true,
      validate: [(val) => val.length > 0, "Pesanan harus memiliki minimal 1 item"],
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryLatitude: {
      type: Number,
      default: -7.1475,
    },
    deliveryLongitude: {
      type: Number,
      default: 107.8015,
    },
    deliveryNotes: {
      type: String,
      default: "",
    },
    deliverySlot: {
      type: {
        type: String,
        enum: ["INSTANT", "SCHEDULED"],
        default: "INSTANT",
      },
      scheduledDate: { type: String, default: "" },
      timeSlot: { type: String, default: "" },
    },
    substitutionPolicy: {
      type: String,
      enum: ["DONT_SUBSTITUTE", "SAME_CATEGORY", "CONTACT_ME", "AUTO_PRICE_LIMIT"],
      default: "CONTACT_ME",
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    voucherCode: {
      type: String,
      default: "",
    },
    voucherDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 8000,
      min: 0,
    },
    serviceFee: {
      type: Number,
      default: 2000,
      min: 0,
    },
    driverTip: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentId: {
      type: String,
      default: "",
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "QRIS",
    },
    paymentStatus: {
      type: String,
      enum: [
        "CREATED",
        "PENDING",
        "PAID",
        "FAILED",
        "EXPIRED",
        "CANCELLED",
        "REFUND_PENDING",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
      default: "CREATED",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "CREATED",
        "PAYMENT_PENDING",
        "PAID",
        "WAITING_STORE_CONFIRMATION",
        "STORE_ACCEPTED",
        "PREPARING",
        "PICKING",
        "WAITING_SUBSTITUTION",
        "READY_FOR_PICKUP",
        "DRIVER_ASSIGNED",
        "DRIVER_AT_STORE",
        "PICKED_UP",
        "DELIVERING",
        "ARRIVED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      default: "CREATED",
      index: true,
    },
    statusHistory: {
      type: [shopOrderStatusHistorySchema],
      default: [],
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      default: null,
    },
    substitutionProposal: {
      items: { type: Array, default: [] },
      customerApproved: { type: Boolean, default: null },
      proposedAt: { type: Date, default: null },
      respondedAt: { type: Date, default: null },
    },
    pickupProofUrl: {
      type: String,
      default: "",
    },
    deliveryProofUrl: {
      type: String,
      default: "",
    },
    driverLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    cancellation: {
      reason: { type: String, default: "" },
      cancelledBy: { type: String, default: "" },
      cancelledAt: { type: Date, default: null },
    },
    complaint: {
      status: {
        type: String,
        enum: ["NONE", "SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"],
        default: "NONE",
      },
      reason: { type: String, default: "" },
      detail: { type: String, default: "" },
      photos: { type: [String], default: [] },
      solutionRequested: { type: String, default: "REFUND" },
      createdAt: { type: Date, default: null },
      resolvedAt: { type: Date, default: null },
    },
    refund: {
      status: {
        type: String,
        enum: ["NONE", "PENDING", "PROCESSING", "COMPLETED", "REJECTED"],
        default: "NONE",
      },
      amount: { type: Number, default: 0 },
      reason: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      accountName: { type: String, default: "" },
      refundedAt: { type: Date, default: null },
    },
    rating: {
      stars: { type: Number, min: 1, max: 5, default: null },
      review: { type: String, default: "" },
      ratedAt: { type: Date, default: null },
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

shopOrderSchema.index({ customerId: 1, createdAt: -1 });
shopOrderSchema.index({ storeId: 1, orderStatus: 1, createdAt: -1 });
shopOrderSchema.index({ driverId: 1, orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model("ShopOrder", shopOrderSchema);
