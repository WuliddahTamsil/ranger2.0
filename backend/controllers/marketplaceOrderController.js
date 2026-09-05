const mongoose = require("mongoose");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const User = require("../models/User");
const Notification = require("../models/Notification");

const createOrder = async (req, res) => {
  try {
    const { ownerId, customerId, customerName, customerPhone, address, notes, items, deliveryFee, serviceFee, driverTip, voucherId, discount, paymentMethod, paymentStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(ownerId) || !customerId || !customerName || customerName === "Customer Rangers" || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Data pesanan marketplace belum lengkap" });
    }

    const productIds = items.map((item) => item.productId);
    const products = await MarketplaceProduct.find({ _id: { $in: productIds }, ownerId, isActive: true });
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const orderItems = items.map((item) => {
      const product = productMap.get(String(item.productId));
      if (!product || product.stock < Number(item.quantity)) throw new Error(`Produk ${item.name || item.productId} tidak tersedia`);
      return { productId: product._id, name: product.name, quantity: Number(item.quantity), price: product.price };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const safeDeliveryFee = Number(deliveryFee || 0);
    const safeServiceFee = Number(serviceFee || 0);
    const safeDriverTip = Number(driverTip || 0);
    const safeDiscount = Math.max(0, Number(discount || 0));
    const totalAmount = Math.max(0, subtotal + safeDeliveryFee + safeServiceFee + safeDriverTip - safeDiscount);
    const order = await MarketplaceOrder.create({
      orderCode: `RNG-MKT-${Date.now().toString().slice(-8)}`,
      ownerId, storeId: String(ownerId), customerId: customerId || "", customerName, customerPhone: customerPhone || "", address, notes: notes || "",
      items: orderItems, subtotal, deliveryFee: safeDeliveryFee, serviceFee: safeServiceFee,
      driverTip: safeDriverTip, voucherId: voucherId || "", discount: safeDiscount,
      totalAmount, paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentStatus || (paymentMethod === "cod" ? "Menunggu pembayaran di tempat" : "Berhasil"),
    });
    await Promise.all(orderItems.map((item) => MarketplaceProduct.updateOne(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, sold: item.quantity } }
    )));
    if (mongoose.Types.ObjectId.isValid(customerId)) {
      await Notification.create({
        userId: customerId,
        title: "Pesanan berhasil dibuat",
        message: `Pesanan ${order.orderCode} telah diteruskan ke toko.`,
        type: "payment_confirmed",
        relatedId: order._id,
      });
    }
    const owner = await User.findById(ownerId).select("_id");
    if (owner) {
      await Notification.create({
        userId: owner._id,
        title: "Pesanan baru masuk",
        message: `${customerName} membuat pesanan ${order.orderCode}.`,
        type: "order_new",
        relatedId: order._id,
      });
    }
    req.io?.to(`owner:${ownerId}`).emit("order_created", order);
    req.io?.to(`customer:${customerId}`).emit("order_created", order);
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Create marketplace order error:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal membuat pesanan marketplace" });
  }
};

const getOrdersByOwner = async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({
      ownerId: req.params.ownerId,
      customerId: { $nin: ["", null] },
      customerName: { $ne: "Customer Rangers" },
    }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get marketplace orders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pesanan marketplace" });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({ customerId: req.params.customerId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get customer marketplace orders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pesanan customer" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await MarketplaceOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    if (mongoose.Types.ObjectId.isValid(order.customerId)) {
      await Notification.create({
        userId: order.customerId,
        title: "Status pesanan diperbarui",
        message: `Pesanan ${order.orderCode} sekarang ${order.status}.`,
        type: "order_status",
        relatedId: order._id,
      });
    }
    req.io?.to(`owner:${order.ownerId}`).emit("order_status_updated", order);
    req.io?.to(`customer:${order.customerId}`).emit("order_status_updated", order);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("Update marketplace order error:", error);
    return res.status(400).json({ success: false, message: "Gagal memperbarui status pesanan" });
  }
};

module.exports = { createOrder, getOrdersByOwner, getOrdersByCustomer, updateOrderStatus };
