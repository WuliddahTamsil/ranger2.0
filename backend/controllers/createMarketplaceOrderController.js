const { createHash, randomUUID } = require("crypto");
const mongoose = require("mongoose");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const paymentGateway = require("../services/paymentGateway");
const { syncConversationForOrder } = require("../services/conversationService");
const { PRICING_POLICY, validateKamojangRadius, MAX_SERVICE_RADIUS_KM } = require("../services/pricingPolicyService");

const pointWalletService = require("../features/geoversePoint/services/pointWalletService");

const ALLOWED_PAYMENT_METHODS = [
  "cod", "qris", "gopay", "dana", "ovo", "shopeepay", "bca_va", "bni_va", "bri_va", "mandiri_va",
  "geoverse_point", "geoverse_point_plus_qris", "geoverse_point_plus_cash"
];

const mapToGatewayPaymentMethod = (method) => {
  const m = String(method || "cod").toLowerCase();
  switch (m) {
    case "qris": return "QRIS";
    case "gopay": return "GOPAY";
    case "dana": return "DANA";
    case "ovo": return "OVO";
    case "shopeepay": return "SHOPEEPAY";
    case "bca_va": return "BCA_VA";
    case "bni_va": return "BNI_VA";
    case "bri_va": return "BRI_VA";
    case "mandiri_va": return "MANDIRI_VA";
    default: return "CASH";
  }
};

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
    paymentMethod: String(body.paymentMethod || "cod").toLowerCase(),
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
  const idempotencyKey = String(req.get("Idempotency-Key") || req.get("x-idempotency-key") || "").trim();
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

    const normalizedPaymentMethod = String(paymentMethod || "cod").toLowerCase();

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
    if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
      return res.status(400).json({ success: false, message: "Metode pembayaran tidak valid." });
    }
    if (normalizedItems.some((item) => !mongoose.Types.ObjectId.isValid(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return res.status(400).json({ success: false, message: "Produk atau jumlah pesanan tidak valid" });
    }

    // Validasi radius maksimal 15 km dari Kamojang
    const deliveryLat = addressSnapshot?.latitude ?? body.latitude;
    const deliveryLon = addressSnapshot?.longitude ?? body.longitude;
    if (deliveryLat != null && deliveryLon != null && Number.isFinite(Number(deliveryLat)) && Number.isFinite(Number(deliveryLon))) {
      const radiusCheck = validateKamojangRadius({ latitude: Number(deliveryLat), longitude: Number(deliveryLon) }, MAX_SERVICE_RADIUS_KM || 15);
      if (!radiusCheck.valid) {
        return res.status(400).json({
          success: false,
          message: radiusCheck.message || "Alamat pengantaran marketplace melebihi batas radius maksimal Kamojang (15 km).",
          radiusValidation: radiusCheck,
        });
      }
    }

    if (await respondWithExistingOrder(res, idempotencyKey, requestHash)) return;

    const [owner, customer] = await Promise.all([
      User.findById(ownerId).select("name role status roleData"),
      User.findById(customerId).select("name phone role"),
    ]);
    if (!owner || owner.role !== "pemilik_marketplace" || owner.status !== "verified") {
      return res.status(409).json({ success: false, message: "Toko Marketplace belum diverifikasi oleh admin atau tidak aktif" });
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
    const deliveryFee = splitAmount(PRICING_POLICY.MIN_DISTANCE_FARE, groupCount, groupIndex);
    const serviceFee = splitAmount(PRICING_POLICY.SERVICE_FEE, groupCount, groupIndex);
    const safeDriverTip = splitAmount(driverTip, groupCount, groupIndex);
    const discount = voucherId === "LOKAL20" ? splitAmount(5000, groupCount, groupIndex) : 0;
    const grossAmount = subtotal + deliveryFee + serviceFee + safeDriverTip;

    // Backend authoritative point quote calculation
    const requestedPoints = Math.max(0, Math.round(Number(body.pointsUsed) || Number(body.pointDiscount) || 0));
    const quote = await pointWalletService.calculatePaymentQuote({
      service: "MARKETPLACE",
      grossAmount,
      voucherDiscount: discount,
      requestedPoints,
      userId: customerId,
    });

    const totalAmount = quote.finalAmount;
    const storeName = owner.roleData?.businessName || owner.name || "";
    const baseStoreAddr = owner.roleData?.businessAddress || owner.roleData?.address || "";
    const storePatokan = owner.roleData?.addressNote ? ` (Patokan: ${owner.roleData.addressNote})` : "";
    const storeAddress = `${baseStoreAddr}${storePatokan}`.trim();

    const isCod = normalizedPaymentMethod === "cod" || normalizedPaymentMethod === "geoverse_point_plus_cash";
    const resolvedPaymentMethod =
      totalAmount === 0
        ? "GEOVERSE_POINT"
        : quote.approvedPoints > 0
        ? isCod
          ? "GEOVERSE_POINT_PLUS_CASH"
          : "GEOVERSE_POINT_PLUS_QRIS"
        : normalizedPaymentMethod;

    const initialPaymentStatus =
      totalAmount === 0
        ? "Lunas"
        : isCod
        ? "Menunggu pembayaran di tempat"
        : "Menunggu Pembayaran";
    const orderCode = `RNG-MKT-${randomUUID().slice(0, 8).toUpperCase()}`;

    let debitedPoints = 0;
    if (quote.approvedPoints > 0 && customerId) {
      await pointWalletService.debitPoints({
        userId: customerId,
        points: quote.approvedPoints,
        type: "PAYMENT",
        sourceType: "MARKETPLACE",
        sourceId: orderCode,
        operationKey: `DEBIT-MKT-${orderCode}`,
        notes: `Pembayaran pesanan Marketplace #${orderCode} dengan ${quote.approvedPoints} GEOVERSE Point`,
        actorId: customerId,
      });
      debitedPoints = quote.approvedPoints;
    }

    try {
      // Create payment gateway session if digital payment
      let gatewayResult = null;
      if (!isCod && totalAmount > 0) {
        gatewayResult = await paymentGateway.createPayment({
          orderId: orderCode,
          orderCode,
          orderType: "MARKETPLACE",
          orderCategory: "DELIVERY",
          customerId: String(customerId),
          customerName: customer.name,
          customerPhone: customer.phone || "",
          amount: totalAmount,
          paymentMethod: mapToGatewayPaymentMethod(resolvedPaymentMethod),
        });
      }

      const paymentDetails = gatewayResult ? {
        qrString: gatewayResult.qrString || "",
        qrCodeUrl: gatewayResult.qrCodeUrl || "",
        vaNumber: gatewayResult.virtualAccount?.vaNumber || "",
        bank: gatewayResult.virtualAccount?.bank || "",
        deepLinkUrl: gatewayResult.deepLinkUrl || "",
        expiryTime: gatewayResult.expiryTime || null,
      } : {};

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
          orderCode,
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
          pointDiscount: quote.pointDiscount,
          pointsUsed: quote.approvedPoints,
          pointRate: quote.pointRate,
          grossAmount: quote.grossAmount,
          finalAmount: totalAmount,
          totalAmount,
          paymentMethod: resolvedPaymentMethod,
          paymentStatus: initialPaymentStatus,
          paymentId: gatewayResult?.paymentId || "",
          paymentDetails,
        }], { session });
        order = created;
      });
      await session.endSession();
      session = null;
    } catch (orderCreateErr) {
      if (debitedPoints > 0) {
        await pointWalletService.reversePoints({
          userId: customerId,
          points: debitedPoints,
          sourceType: "MARKETPLACE",
          sourceId: orderCode,
          reversalKey: `ROLLBACK-MKT-${orderCode}`,
          notes: `Rollback pembuatan order Marketplace #${orderCode}`,
          actorId: customerId,
        }).catch((rbErr) => console.error("Rollback marketplace points error:", rbErr));
      }
      throw orderCreateErr;
    }

    // Create Payment record in DB if digital
    if (gatewayResult && order) {
      await Payment.create({
        paymentId: gatewayResult.paymentId,
        orderId: String(order._id),
        orderCode: order.orderCode,
        orderType: "MARKETPLACE",
        orderCategory: "DELIVERY",
        customerId: String(customerId),
        customerName: customer.name,
        customerPhone: customer.phone || "",
        amount: totalAmount,
        paymentMethod: gatewayResult.paymentMethod,
        paymentCategory: gatewayResult.paymentCategory,
        status: gatewayResult.status || "PENDING",
        gateway: gatewayResult.gateway || "GEOVERSE_GATEWAY",
        qrString: gatewayResult.qrString,
        qrCodeUrl: gatewayResult.qrCodeUrl,
        deepLinkUrl: gatewayResult.deepLinkUrl,
        virtualAccount: gatewayResult.virtualAccount,
        expiredAt: gatewayResult.expiryTime,
      }).catch((err) => console.error("Create Payment record error:", err));
    }

    const notifMessage = isCod
      ? `Pesanan ${order.orderCode} telah diteruskan ke toko. Pembayaran dilakukan saat pesanan diterima.`
      : `Pesanan ${order.orderCode} berhasil dibuat. Selesaikan pembayaran sebelum batas waktu berakhir.`;

    await Promise.allSettled([
      syncConversationForOrder(order, "marketplace"),
      Notification.create({ userId: customerId, title: "Pesanan berhasil dibuat", message: notifMessage, type: "order_new", relatedId: order._id }),
      Notification.create({ userId: ownerId, title: "Pesanan baru masuk", message: `${customer.name} membuat pesanan ${order.orderCode} (${normalizedPaymentMethod.toUpperCase()}).`, type: "order_new", relatedId: order._id }),
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
