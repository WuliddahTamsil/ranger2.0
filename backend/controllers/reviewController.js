const mongoose = require("mongoose");
const Review = require("../models/Review");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const LaundryOrder = require("../models/LaundryOrder");
const Booking = require("../models/Booking");

const findByIdOrCode = async (Model, id, fields = {}) => {
  if (!id) return null;
  const query = { ...fields };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return Model.findOne({ ...query, _id: id }).lean();
  }
  const codeFields = ["orderCode", "bookingCode"];
  for (const codeField of codeFields) {
    if (Model.schema.path(codeField)) {
      const result = await Model.findOne({ ...query, [codeField]: id }).lean();
      if (result) return result;
    }
  }
  return null;
};

const resolveCompletedOrder = async (orderId, customerId, orderType) => {
  const normalizedType = String(orderType || "").toLowerCase();
  const models = normalizedType.includes("cater")
    ? [[CateringOrder, { customerId }], "Catering"]
    : normalizedType.includes("laund")
      ? [[LaundryOrder, { customerId }], "Laundry"]
      : normalizedType.includes("kos")
        ? [[Booking, { customerId }], "Kos"]
        : [[MarketplaceOrder, { customerId }], "Marketplace"];

  const [modelConfig, resolvedType] = models;
  const [Model, fields] = modelConfig;
  let order = await findByIdOrCode(Model, orderId, fields);
  if (!order && normalizedType === "") {
    for (const [FallbackModel, fallbackFields, fallbackType] of [
      [MarketplaceOrder, { customerId }, "Marketplace"],
      [CateringOrder, { customerId }, "Catering"],
      [LaundryOrder, { customerId }, "Laundry"],
      [Booking, { customerId }, "Kos"],
    ]) {
      order = await findByIdOrCode(FallbackModel, orderId, fallbackFields);
      if (order) return { order, type: fallbackType };
    }
  }
  return order ? { order, type: resolvedType } : null;
};

const isCompleted = (status) => ["selesai", "completed"].includes(String(status || "").toLowerCase());

const getOrderProductIds = (order, type) => {
  if (type === "Marketplace") return (order.items || []).map((item) => String(item.productId)).filter(Boolean);
  if (type === "Catering") return order.productId ? [String(order.productId)] : [];
  if (type === "Laundry") return order.serviceId ? [String(order.serviceId)] : [];
  return order.kostId ? [String(order.kostId)] : [];
};

const createReview = async (req, res) => {
  try {
    const { orderId, orderType, customerId, customerName, rating, comment, media } = req.body;
    if (!orderId || !customerId || !customerName || !rating) {
      return res.status(400).json({ success: false, message: "Data ulasan belum lengkap" });
    }

    const resolved = await resolveCompletedOrder(orderId, customerId, orderType);
    if (!resolved) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    if (!isCompleted(resolved.order.status)) {
      return res.status(400).json({ success: false, message: "Ulasan hanya dapat diberikan setelah pesanan selesai" });
    }

    const existing = await Review.findOne({ orderId: String(orderId), customerId: String(customerId) });
    if (existing) return res.status(409).json({ success: false, message: "Pesanan ini sudah memiliki ulasan" });

    const safeMedia = Array.isArray(media)
      ? media.filter((item) => item && typeof item.url === "string" && item.url.trim()).slice(0, 5).map((item) => ({
        url: item.url.trim(),
        type: item.type === "video" ? "video" : "image",
        name: String(item.name || "").slice(0, 120),
      }))
      : [];
    const orderProductIds = getOrderProductIds(resolved.order, resolved.type);
    const productIds = orderProductIds.length > 0 ? orderProductIds : (Array.isArray(req.body.productIds) ? req.body.productIds.map(String).slice(0, 20) : []);
    const review = await Review.create({
      orderId: String(orderId),
      orderType: resolved.type,
      customerId: String(customerId),
      customerName: String(customerName).trim(),
      merchantId: String(resolved.order.ownerId || resolved.order.storeId || ""),
      merchantName: String(resolved.order.storeName || resolved.order.serviceName || resolved.order.kostName || "").trim(),
      productIds,
      rating: Math.max(1, Math.min(5, Number(rating))),
      comment: String(comment || "").trim().slice(0, 1000),
      media: safeMedia,
    });
    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan ulasan" });
  }
};

const mapReview = (review) => ({
  id: review._id,
  orderId: review.orderId,
  orderType: review.orderType,
  customerId: review.customerId,
  customerName: review.customerName,
  merchantId: review.merchantId,
  merchantName: review.merchantName,
  rating: review.rating,
  comment: review.comment,
  media: review.media || [],
  createdAt: review.createdAt,
});

const getReviewsByProduct = async (req, res) => {
  try {
    const reviews = await Review.find({ productIds: String(req.params.productId) }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, count: reviews.length, data: reviews.map(mapReview) });
  } catch (error) {
    console.error("Get product reviews error:", error);
    return res.status(500).json({ success: false, data: [] });
  }
};

const getReviewsByCustomer = async (req, res) => {
  try {
    const reviews = await Review.find({ customerId: String(req.params.customerId) }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: reviews.length, data: reviews.map(mapReview) });
  } catch (error) {
    console.error("Get customer reviews error:", error);
    return res.status(500).json({ success: false, data: [] });
  }
};

module.exports = { createReview, getReviewsByProduct, getReviewsByCustomer };
