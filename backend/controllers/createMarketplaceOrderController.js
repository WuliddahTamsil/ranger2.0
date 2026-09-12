const { createHash, randomUUID } = require("crypto");
const mongoose = require("mongoose");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { syncConversationForOrder } = require("../services/conversationService");

const splitAmount = (amount, count, index) => Math.floor(amount / count) + (index < amount % count ? 1 : 0);

const makeRequestHash = (body) => {
  const items = (Array.isArray(body.items) ? body.items : []).map((item) => ({
    productId: String(item.productId || ""),
    quantity: Number(item.quantity),
    notes: String(item.notes || "").trim().slice(0, 120),
  }));
  return createHash("sha256").update(JSON.stringify({
    ownerId: String(body.ownerId || ""),
    customerId: String(body.customerId || ""),
    address: String(body.address || "").trim(),
    items,
    driverTip: Number(body.driverTip || 0),
    voucherId: String(body.voucherId || ""),
    paymentMethod: String(body.paymentMethod || "cod"),
    groupCount: Number(body.checkoutGroupCount || 1),
    groupIndex: Number(body.checkoutGroupIndex || 0),
  })).digest("hex");
};

const respondWithExistingOrder = async (res, key, requestHash) => {
  const existingOrder = await MarketplaceOrder.findOne({ idempotencyKey: key });
  if (!existingOrder) return false;
  if (existingOrder.requestHash !== requestHash) {
    res.status(409).json({ success: false, message: "Checkout ini sudah dikirim dengan detail berbeda. Periksa pesanan sebelum mencoba lagi." });
    return true;
  }
  res.status(200).json({ success: true, data: existingOrder, idempotentReplay: true });
  return true;
};

const createMarketplaceOrder = async (req, res) => {
  let session;
  const idempotencyKey = String(req.get("Idempotency-Key") || "").trim();
  const requestHash = makeRequestHash(req.body || {});

  try {
    const body = req.body || {};
    const {
      ownerId, customerId, address, addressSnapshot, notes, items,
      voucherId = "", paymentMethod = "cod", checkoutGroupCount = 1, checkoutGroupIndex = 0,
    } = body;
    const groupCount = Number(checkoutGroupCount);
    const groupIndex = Number(checkoutGroupIndex);
    const driverTip = Number(body.driverTip || 0);
    const normalizedItems = (Array.isArray(items) ? items : []).map((item) => ({
      productId: String(item.productId || ""),
      quantity: Number(item.quantity),
      notes: String(item.notes || "").trim().slice(0, 120),
    }));

    if (!idempotencyKey || idempotencyKey.length > 200) {
      return res.status(400).json({ success: false, message: "Kunci checkout tidak valid. Coba kirim pesanan lagi." });
    }
    if (!mongoose.Types.ObjectId.isValid(ownerId) || !mongoose.Types.ObjectId.isValid(customerId) || !address?.trim() || normalizedItems.length === 0) {
      return res.status(400).json({ success: false, message: "Data pesanan Marketplace belum lengkap" });
    }
    if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 20 || !Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex >= groupCount) {
      return res.status(400).json({ success: false, message: "Pembagian checkout tidak valid" });
    }
    if (![0, 2000, 5000, 10000].includes(driverTip)) {
      return res.status(400).json({ success: false, message: "Pilihan tips tidak valid" });
    }
    if (voucherId && voucherId !== "LOKAL20") {
      return res.status(400).json({ success: false, message: "Kode promo tidak valid" });
    }
    if (paymentMethod !== "cod") {
      return res.status(400).json({ success: false, message: "Pembayaran online belum tersedia. Pilih Bayar di Tempat." });
    }
    if (normalizedItems.some((item) => !mongoose.Types.ObjectId.isValid(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return res.status(400).json({ success: false, message: "Produk atau jumlah pesanan tidak valid" });
    }

    if (await respondWithExistingOrder(res, idempotencyKey, requestHash)) return;

    const [owner, customer] = await Promise.all([
      User.findById(ownerId).select("name role status roleData"),
      User.findById(customerId).select("name phone role"),
    ]);
    if (!owner || owner.role !== "pemilik_marketplace" || owner.status === "rejected") {
      return res.status(409).json({ success: false, message: "Toko Marketplace tidak tersedia" });
    }
    if (!customer || customer.role !== "customer") {
      return res.status(400).json({ success: false, message: "Akun pelanggan tidak valid" });
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await MarketplaceProduct.find({ _id: { $in: productIds }, ownerId, isActive: true }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const stockByProduct = new Map();
    const orderItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        const error = new Error("Salah satu produk sudah tidak tersedia di toko ini");
        error.statusCode = 409;
        throw error;
      }
      stockByProduct.set(item.productId, (stockByProduct.get(item.productId) || 0) + item.quantity);
      return { productId: product._id, name: product.name, quantity: item.quantity, price: product.price, notes: item.notes };
    });
    for (const [productId, quantity] of stockByProduct.entries()) {
      if (productMap.get(productId).stock < quantity) {
        const error = new Error(`Stok ${productMap.get(productId).name} tidak mencukupi`);
        error.statusCode = 409;
        throw error;
      }
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Preserve current MVP pricing until Product confirms the final fee and voucher rules.
    const deliveryFee = splitAmount(8000, groupCount, groupIndex);
    const serviceFee = splitAmount(2000, groupCount, groupIndex);
    const safeDriverTip = splitAmount(driverTip, groupCount, groupIndex);
    const discount = voucherId === "LOKAL20" ? splitAmount(5000, groupCount, groupIndex) : 0;
    const totalAmount = Math.max(0, subtotal + deliveryFee + serviceFee + safeDriverTip - discount);
    const storeName = owner.roleData?.businessName || owner.name || "";
    const storeAddress = owner.roleData?.businessAddress || owner.roleData?.address || "";
    let order;

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      for (const [productId, quantity] of stockByProduct.entries()) {
        const update = await MarketplaceProduct.updateOne(
          { _id: productId, ownerId, isActive: true, stock: { $gte: quantity } },
          { $inc: { stock: -quantity, sold: quantity } },
          { session }
        );
        if (update.modifiedCount !== 1) {
          const error = new Error("Stok berubah saat checkout. Perbarui keranjang lalu coba lagi.");
          error.statusCode = 409;
          throw error;
        }
      }

      const [created] = await MarketplaceOrder.create([{
        orderCode: `RNG-MKT-${randomUUID().slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        requestHash,
        ownerId,
        storeId: String(ownerId),
        customerId: String(customerId),
        customerName: customer.name,
        customerPhone: customer.phone || "",
        address: address.trim(),
        addressSnapshot: addressSnapshot || null,
        notes: String(notes || "").trim().slice(0, 500),
        items: orderItems,
        storeName,
        storeAddress,
        subtotal,
        deliveryFee,
        serviceFee,
        driverTip: safeDriverTip,
        voucherId,
        discount,
        totalAmount,
        paymentMethod: "cod",
        paymentStatus: "Menunggu pembayaran di tempat",
      }], { session });
      order = created;
    });
    await session.endSession();
    session = null;

    await Promise.allSettled([
      syncConversationForOrder(order, "marketplace"),
      Notification.create({ userId: customerId, title: "Pesanan berhasil dibuat", message: `Pesanan ${order.orderCode} telah diteruskan ke toko. Pembayaran dilakukan saat pesanan diterima.`, type: "order_new", relatedId: order._id }),
      Notification.create({ userId: ownerId, title: "Pesanan baru masuk", message: `${customer.name} membuat pesanan ${order.orderCode}.`, type: "order_new", relatedId: order._id }),
    ]);
    req.io?.to(`user:${String(ownerId)}`).emit("order_created", order);
    req.io?.to(`user:${String(customerId)}`).emit("order_created", order);
    [ownerId, customerId].forEach((userId) => req.io?.to(`user:${String(userId)}`).emit("notification:new", { relatedId: String(order._id), type: "order_new" }));
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Create marketplace order error:", error);
    if (session) await session.endSession().catch(() => undefined);
    if (error.code === 11000 && idempotencyKey) {
      if (await respondWithExistingOrder(res, idempotencyKey, requestHash)) return;
    }
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Gagal membuat pesanan Marketplace" });
  }
};

module.exports = { createMarketplaceOrder };
