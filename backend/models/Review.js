const mongoose = require("mongoose");

const reviewMediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], default: "image" },
    name: { type: String, default: "" },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    orderType: { type: String, default: "Marketplace" },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    merchantId: { type: String, default: "" },
    merchantName: { type: String, default: "" },
    productIds: { type: [String], default: [] },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", maxlength: 1000 },
    media: { type: [reviewMediaSchema], default: [] },
  },
  { timestamps: true }
);

reviewSchema.index({ productIds: 1, createdAt: -1 });
reviewSchema.index({ merchantId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
