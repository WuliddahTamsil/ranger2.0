const mongoose = require("mongoose");
const { randomUUID, createHash } = require("crypto");
const ShopOrder = require("../models/ShopOrder");
const MarketplaceStore = require("../models/MarketplaceStore");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const InventoryLog = require("../models/InventoryLog");
const Prescription = require("../models/Prescription");
const Voucher = require("../models/Voucher");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Payment = require("../models/Payment");
const paymentGateway = require("../services/paymentGateway");
const pointWalletService = require("../services/pointWalletService");

const emitToUser = (io, userId, event, payload) => {
  if (io && userId) {
    io.to(`user:${String(userId)}`).emit(event, payload);
  }
};

const emitToRoom = (io, room, event, payload) => {
  if (io && room) {
    io.to(room).emit(event, payload);
  }
};

const emitToStoreOwner = async (io, storeId, event, payload) => {
  if (!io || !storeId) return;
  try {
    const store = await MarketplaceStore.findById(storeId).select("ownerId");
    if (store?.ownerId) {
      emitToUser(io, store.ownerId, event, payload);
    }
  } catch (err) {
    console.error("emitToStoreOwner error:", err);
  }
};

/**
 * Hash checkout payload for idempotency verification
 */
const makeRequestHash = (body) => {
  const items = (Array.isArray(body.items) ? body.items : []).map((item) => ({
    productId: String(item.productId || ""),
    quantity: Number(item.quantity),
  }));
  return createHash("sha256")
    .update(
      JSON.stringify({
        storeId: String(body.storeId || ""),
        customerId: String(body.customerId || ""),
        address: String(body.deliveryAddress || body.address || "").trim(),
        items,
        paymentMethod: String(body.paymentMethod || "QRIS").toUpperCase(),
      })
    )
    .digest("hex");
};

/**
 * POST /api/shop/orders
 * Create new Kanyaah Shop order
 */
const createShopOrder = async (req, res) => {
  let session = null;
  const idempotencyKey = String(req.get("Idempotency-Key") || req.body.idempotencyKey || "").trim();
  const requestHash = makeRequestHash(req.body || {});

  try {
    const authUser = req.authUser;
    const body = req.body || {};
    const customerId = authUser?._id || body.customerId;
    const customerName = authUser?.name || body.customerName;
    const customerPhone = authUser?.phone || body.customerPhone || "";

    if (!customerId || !customerName) {
      return res.status(401).json({ success: false, message: "Sesi customer tidak valid" });
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = await ShopOrder.findOne({ idempotencyKey });
      if (existing) {
        if (existing.requestHash && existing.requestHash !== requestHash) {
          return res.status(409).json({
            success: false,
            message: "Permintaan checkout ini sudah terdaftar dengan data berbeda.",
          });
        }
        return res.status(200).json({ success: true, data: existing, idempotentReplay: true });
      }
    }

    const {
      storeId,
      items,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryNotes = "",
      deliverySlot = { type: "INSTANT" },
      substitutionPolicy = "CONTACT_ME",
      voucherCode = "",
      usePoints = false,
      pointsToUse = 0,
      paymentMethod = "QRIS",
      prescriptionId = null,
      driverTip = 0,
    } = body;

    if (!storeId || !Array.isArray(items) || items.length === 0 || !deliveryAddress?.trim()) {
      return res.status(400).json({ success: false, message: "Data pesanan tidak lengkap" });
    }

    // Verify store exists and active
    const store = await MarketplaceStore.findById(storeId);
    if (!store || store.status === "INACTIVE") {
      return res.status(404).json({ success: false, message: "Toko tidak tersedia atau sedang tutup" });
    }

    // Step 1: Single-store cart check & product DB fetch
    const productIds = items.map((i) => i.productId);
    const dbProducts = await MarketplaceProduct.find({ _id: { $in: productIds }, isActive: true }).lean();
    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));

    let containsPrescriptionProduct = false;
    const validatedItems = [];
    const stockDeltas = new Map();

    for (const item of items) {
      const p = productMap.get(String(item.productId));
      if (!p) {
        return res.status(400).json({
          success: false,
          message: `Salah satu produk tidak ditemukan atau sudah tidak aktif`,
        });
      }

      // Rule: Single Store Cart enforcement
      if (p.storeId && String(p.storeId) !== String(storeId)) {
        return res.status(400).json({
          success: false,
          message: `Semua produk harus berasal dari satu toko yang sama (${store.name})`,
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: "Jumlah item tidak valid" });
      }

      // Check stock
      if (p.stock < qty) {
        return res.status(409).json({
          success: false,
          message: `Stok produk ${p.name} tidak mencukupi (Tersedia: ${p.stock}, Diminta: ${qty})`,
        });
      }

      if (p.requiresPrescription) {
        containsPrescriptionProduct = true;
      }

      const effectivePrice = p.promoPrice != null && p.promoPrice > 0 ? p.promoPrice : p.price;
      const subtotalItem = effectivePrice * qty;

      stockDeltas.set(String(p._id), (stockDeltas.get(String(p._id)) || 0) + qty);

      validatedItems.push({
        productId: p._id,
        productNameSnapshot: p.name,
        productImageSnapshot: p.img || (p.images && p.images[0]) || "",
        priceSnapshot: effectivePrice,
        quantity: qty,
        subtotal: subtotalItem,
        notes: String(item.notes || "").slice(0, 200),
        requestedSubstitution: item.requestedSubstitution || substitutionPolicy,
        actualAvailability: "AVAILABLE",
        adjustmentAmount: 0,
      });
    }

    // Prescription validation: If requires prescription, must have approved prescription
    let prescriptionDoc = null;
    if (containsPrescriptionProduct) {
      if (!prescriptionId) {
        return res.status(400).json({
          success: false,
          message: "Pesanan ini mengandung obat yang memerlukan resep dokter. Silakan unggah resep terlebih dahulu.",
        });
      }
      prescriptionDoc = await Prescription.findById(prescriptionId);
      if (!prescriptionDoc) {
        return res.status(404).json({ success: false, message: "Resep dokter tidak ditemukan" });
      }
      if (prescriptionDoc.status !== "APPROVED") {
        if (prescriptionDoc.status === "REJECTED") {
          return res.status(400).json({
            success: false,
            message: `Resep ditolak oleh apoteker: ${prescriptionDoc.rejectionReason || "Tidak valid"}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: "Resep dokter Anda masih dalam proses verifikasi oleh apoteker. Checkout baru dapat dilanjutkan setelah resep disetujui.",
        });
      }
    }

    // Step 2: Backend calculation
    const calculatedSubtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Delivery fee calculation
    const userLat = parseFloat(deliveryLatitude) || -7.1475;
    const userLon = parseFloat(deliveryLongitude) || 107.8015;
    const R = 6371;
    const dLat = ((userLat - store.latitude) * Math.PI) / 180;
    const dLon = ((userLon - store.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((store.latitude * Math.PI) / 180) *
        Math.cos((userLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    const deliveryFee = distanceKm <= 3 ? 8000 : Math.round(8000 + (distanceKm - 3) * 2000);
    const serviceFee = 2000;
    const tip = Math.max(0, parseInt(driverTip, 10) || 0);

    // Voucher validation
    let voucherDiscount = 0;
    let validatedVoucherCode = "";
    let validatedVoucherDocId = null;
    if (voucherCode && voucherCode.trim()) {
      const v = await Voucher.findOne({
        voucherCode: voucherCode.trim().toUpperCase(),
        status: "ACTIVE",
        service: { $in: ["ALL", "MARKETPLACE", "KANYAAH_SHOP", "SHOP"] },
      });
      if (v) {
        if (calculatedSubtotal >= v.minTransaction) {
          // If voucher requires points or has claims, verify customer ownership
          if ((v.pointsCost && v.pointsCost > 0) || (v.claimedBy && v.claimedBy.length > 0)) {
            const userClaim = (v.claimedBy || []).find(
              (c) => String(c.userId?._id || c.userId) === String(customerId)
            );
            if (!userClaim) {
              return res.status(403).json({
                success: false,
                message: "Voucher ini diperoleh dari penukaran Kanyaah Point. Anda belum menukarkannya.",
              });
            }
            if (userClaim.used) {
              return res.status(400).json({
                success: false,
                message: "Voucher ini sudah pernah Anda gunakan sebelumnya.",
              });
            }
          }

          if (v.discountType === "PERCENTAGE") {
            const rawDiscount = (calculatedSubtotal * v.discountValue) / 100;
            voucherDiscount = v.maxDiscount ? Math.min(rawDiscount, v.maxDiscount) : rawDiscount;
          } else {
            voucherDiscount = v.discountValue;
          }
          validatedVoucherCode = v.voucherCode;
          validatedVoucherDocId = v._id;
        }
      }
    }

    // Step 2B: Authoritative payment calculation
    const grossAmount = calculatedSubtotal + deliveryFee + serviceFee + tip;
    const safePoints = Math.round(Number(pointsToUse) || 0);

    const quote = await pointWalletService.calculatePaymentQuote({
      service: "KANYAAH_SHOP",
      grossAmount,
      voucherDiscount,
      requestedPoints: usePoints ? safePoints : 0,
      userId: customerId,
    });

    const totalAmount = quote.finalAmount;
    const orderCode = `RNG-SHOP-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Payment Intent creation via paymentGateway
    const isCash = paymentMethod.toUpperCase() === "CASH" || paymentMethod.toUpperCase() === "COD";
    const resolvedPaymentMethod =
      totalAmount === 0
        ? "GEOVERSE_POINT"
        : quote.approvedPoints > 0
        ? isCash
          ? "GEOVERSE_POINT_PLUS_CASH"
          : "GEOVERSE_POINT_PLUS_QRIS"
        : paymentMethod.toUpperCase();

    let gatewayResult = null;
    let paymentId = "";

    if (!isCash && totalAmount > 0) {
      gatewayResult = await paymentGateway.createPayment({
        orderId: orderCode,
        orderCode,
        orderType: "KANYAAH_SHOP",
        orderCategory: "DELIVERY",
        customerId: String(customerId),
        customerName,
        customerPhone,
        amount: totalAmount,
        paymentMethod: resolvedPaymentMethod,
      });
      paymentId = gatewayResult.paymentId;

      await Payment.create({
        paymentId: gatewayResult.paymentId,
        orderId: orderCode,
        orderCode,
        orderType: "KANYAAH_SHOP",
        orderCategory: "DELIVERY",
        customerId: String(customerId),
        customerName,
        customerPhone,
        amount: totalAmount,
        paymentMethod: gatewayResult.paymentMethod,
        paymentCategory: gatewayResult.paymentCategory,
        status: "PENDING",
        gateway: gatewayResult.gateway,
        qrString: gatewayResult.qrString,
        qrCodeUrl: gatewayResult.qrCodeUrl,
        deepLinkUrl: gatewayResult.deepLinkUrl,
        virtualAccount: gatewayResult.virtualAccount,
        expiredAt: gatewayResult.expiryTime,
      });
    }

    const initialOrderStatus =
      containsPrescriptionProduct && (!prescriptionDoc || prescriptionDoc.status === "WAITING_PRESCRIPTION_REVIEW")
        ? "WAITING_STORE_CONFIRMATION"
        : isCash || totalAmount === 0
        ? "WAITING_STORE_CONFIRMATION"
        : "PAYMENT_PENDING";

    const initialPaymentStatus = isCash ? "PENDING" : totalAmount === 0 ? "PAID" : "PENDING";

    let debitedPoints = 0;
    const decrementedStocks = [];

    // Deduct points from wallet atomically if used
    if (quote.approvedPoints > 0) {
        await pointWalletService.debitPoints({
          userId: customerId,
          points: quote.approvedPoints,
          type: "PAYMENT",
          sourceType: "KANYAAH_SHOP",
          sourceId: orderCode,
          operationKey: `DEBIT-SHOP-${orderCode}`,
          notes: `Pembayaran pesanan Kanyaah Shop #${orderCode}`,
          actorId: customerId,
        });
        debitedPoints = quote.approvedPoints;
      }

      // Atomic Stock decrement
      for (const [pId, qty] of stockDeltas.entries()) {
        const updated = await MarketplaceProduct.findOneAndUpdate(
          { _id: pId, stock: { $gte: qty } },
          { $inc: { stock: -qty, sold: qty } },
          { new: true }
        );
        if (!updated) {
          throw new Error("Gagal memproses stok produk. Silakan coba beberapa saat lagi.");
        }
        decrementedStocks.push({ pId, qty });

        await InventoryLog.create({
          productId: pId,
          storeId,
          type: "SALE",
          quantity: -qty,
          beforeStock: updated.stock + qty,
          afterStock: updated.stock,
          sourceOrderId: null,
          createdBy: customerId,
          note: `Penjualan pesanan Kanyaah Shop #${orderCode}`,
        });
      }

      // Create Order Record
      const order = await ShopOrder.create({
        orderCode,
        idempotencyKey: idempotencyKey || undefined,
        requestHash,
        customerId,
        customerName,
        customerPhone,
        storeId,
        storeName: store.name,
        storeAddress: store.address,
        items: validatedItems,
        deliveryAddress,
        deliveryLatitude: userLat,
        deliveryLongitude: userLon,
        deliveryNotes,
        deliverySlot,
        substitutionPolicy,
        subtotal: calculatedSubtotal,
        discount: 0,
        voucherCode: validatedVoucherCode,
        voucherDiscount,
        pointDiscount: quote.pointDiscount,
        pointsUsed: quote.approvedPoints,
        pointRate: quote.pointRate,
        grossAmount: quote.grossAmount,
        finalAmount: totalAmount,
        deliveryFee,
        serviceFee,
        driverTip: tip,
        totalAmount,
        paymentId,
        paymentMethod: resolvedPaymentMethod,
        paymentStatus: initialPaymentStatus,
        orderStatus: initialOrderStatus,
        prescriptionId: prescriptionDoc?._id || null,
        statusHistory: [
          {
            status: initialOrderStatus,
            actorId: String(customerId),
            actorRole: "customer",
            note: "Pesanan berhasil dibuat oleh pelanggan.",
            timestamp: new Date(),
          },
        ],
      });

      // Link prescription if any
      if (prescriptionDoc) {
        prescriptionDoc.orderId = order._id;
        await prescriptionDoc.save();
      }

    // Mark voucher claim as used if applicable
    if (validatedVoucherDocId) {
      await Voucher.updateOne(
        { _id: validatedVoucherDocId, "claimedBy.userId": customerId },
        {
          $set: { "claimedBy.$.used": true, "claimedBy.$.usedAt": new Date() },
          $inc: { usedCount: 1 },
        }
      ).catch((err) => console.warn("Failed to mark voucher used:", err));
    }

    // Send notification
    await Notification.create({
      userId: store.ownerId,
      title: "Pesanan Baru Masuk!",
      message: `Pesanan ${order.orderCode} dari ${customerName} siap diproses.`,
      type: "order_new",
      relatedId: order._id,
    });

    emitToUser(req.io, store.ownerId, "shop:new_order", order);
    emitToUser(req.io, customerId, "shop:order_created", order);

    return res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat",
      data: order,
      paymentDetails: gatewayResult,
    });
  } catch (error) {
    // Rollback any debited points
    if (debitedPoints > 0) {
      await pointWalletService.reversePoints({
        userId: customerId,
        points: debitedPoints,
        sourceType: "KANYAAH_SHOP",
        sourceId: orderCode,
        reversalKey: `ROLLBACK-SHOP-${orderCode}`,
        notes: `Rollback pembuatan order Kanyaah Shop #${orderCode}`,
        actorId: customerId,
      }).catch((rbErr) => console.error("Failed to rollback shop points:", rbErr));
    }
    // Restore any decremented stocks
    for (const { pId, qty } of decrementedStocks) {
      await MarketplaceProduct.findByIdAndUpdate(pId, {
        $inc: { stock: qty, sold: -qty },
      }).catch(() => {});
    }

    console.error("createShopOrder error:", error);
    return res.status(500).json({ success: false, message: error.message || "Gagal membuat pesanan" });
  }
};

/**
 * GET /api/shop/orders/customer/:customerId
 */
const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    const candidateIds = [customerId, String(req.authUser?._id || "")].filter((id) => mongoose.Types.ObjectId.isValid(id));
    const orConditions = [];
    if (candidateIds.length > 0) {
      orConditions.push({ customerId: { $in: candidateIds } });
    }
    if (req.authUser?.email) {
      orConditions.push({ customerEmail: req.authUser.email });
    }
    if (req.authUser?.phone) {
      orConditions.push({ customerPhone: req.authUser.phone });
    }

    const orders = orConditions.length > 0
      ? await ShopOrder.find({ $or: orConditions })
          .populate("storeId", "name logo coverImage address storeType")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getCustomerOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat riwayat pesanan" });
  }
};

/**
 * GET /api/shop/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { orderCode: id };
    const order = await ShopOrder.findOne(query)
      .populate("storeId", "name logo address storeType latitude longitude rating openingHours")
      .populate("driverId", "name phone profilePhoto roleData")
      .populate("prescriptionId")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("getOrderById error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat detail pesanan" });
  }
};

/**
 * POST /api/shop/orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Dibatalkan oleh pelanggan" } = req.body;
    const authUser = req.authUser;

    const order = await ShopOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    const nonCancellableStatuses = [
      "PICKED_UP",
      "DELIVERING",
      "ARRIVED",
      "COMPLETED",
      "CANCELLED",
      "REFUNDED",
    ];
    if (nonCancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Pesanan dalam status ${order.orderStatus} sudah tidak dapat dibatalkan.`,
      });
    }

    // Release stock
    for (const item of order.items) {
      await MarketplaceProduct.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity, sold: -item.quantity },
      });
      await InventoryLog.create({
        productId: item.productId,
        storeId: order.storeId,
        type: "RELEASED",
        quantity: item.quantity,
        beforeStock: 0,
        afterStock: item.quantity,
        sourceOrderId: order._id,
        createdBy: authUser?._id,
        note: `Pengembalian stok dari pembatalan order #${order.orderCode}`,
      });
    }

    // Reverse points if used (idempotent, max 1 time)
    const pointsToRefund = order.pointsUsed || order.pointDiscount || 0;
    if (pointsToRefund > 0 && !order.pointRefunded) {
      order.pointRefunded = true;
      order.reversalIdempotencyKey = `REV-SHOP-${order.orderCode}`;
      await order.save();

      await pointWalletService.reversePoints({
        userId: order.customerId,
        points: pointsToRefund,
        sourceType: "KANYAAH_SHOP",
        sourceId: order.orderCode,
        reversalKey: `REV-SHOP-${order.orderCode}`,
        notes: `Pengembalian poin karena pembatalan pesanan #${order.orderCode}`,
        actorId: authUser?._id,
      });
    }

    // Restore voucher claim if voucher was used
    if (order.voucherCode) {
      await Voucher.updateOne(
        { voucherCode: order.voucherCode, "claimedBy.userId": order.customerId },
        {
          $set: { "claimedBy.$.used": false, "claimedBy.$.usedAt": null },
          $inc: { usedCount: -1 },
        }
      ).catch(() => {});
    }

    order.orderStatus = "CANCELLED";
    order.cancellation = {
      reason,
      cancelledBy: authUser?.role || "customer",
      cancelledAt: new Date(),
    };
    order.statusHistory.push({
      status: "CANCELLED",
      actorId: String(authUser?._id || order.customerId),
      actorRole: authUser?.role || "customer",
      note: `Pesanan dibatalkan: ${reason}`,
      timestamp: new Date(),
    });
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    // Notify other party of cancellation
    const isCustomerCancelling = authUser?.role === "customer" || String(authUser?._id) === String(order.customerId);
    if (isCustomerCancelling) {
      const store = await MarketplaceStore.findById(order.storeId).select("ownerId");
      if (store?.ownerId) {
        await Notification.create({
          userId: store.ownerId,
          title: "Pesanan Dibatalkan Pelanggan!",
          message: `Pesanan #${order.orderCode} telah dibatalkan oleh pelanggan. Alasan: ${reason}`,
          type: "order_status",
          relatedId: order._id,
        }).catch(() => undefined);
      }
    } else {
      await Notification.create({
        userId: order.customerId,
        title: "Pesanan Dibatalkan Toko!",
        message: `Pesanan #${order.orderCode} dibatalkan oleh pihak toko. Alasan: ${reason}`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);
    }

    return res.json({ success: true, message: "Pesanan berhasil dibatalkan", data: order });
  } catch (error) {
    console.error("cancelOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal membatalkan pesanan" });
  }
};

/**
 * POST /api/shop/orders/:id/complaint
 */
const submitComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, detail, photos = [], solutionRequested = "REFUND" } = req.body;

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    order.complaint = {
      status: "SUBMITTED",
      reason: reason || "Keluhan produk/pengiriman",
      detail: detail || "",
      photos,
      solutionRequested,
      createdAt: new Date(),
      resolvedAt: null,
    };
    order.orderStatus = "DISPUTED";
    order.statusHistory.push({
      status: "DISPUTED",
      actorId: String(req.authUser?._id || order.customerId),
      actorRole: "customer",
      note: `Komplain diajukan: ${reason}`,
      timestamp: new Date(),
    });
    await order.save();

    return res.json({ success: true, message: "Komplain berhasil diajukan", data: order });
  } catch (error) {
    console.error("submitComplaint error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengajukan komplain" });
  }
};

/**
 * POST /api/shop/orders/:id/rating
 */
const submitRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { stars, review } = req.body;

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    order.rating = {
      stars: Math.min(5, Math.max(1, parseInt(stars, 10) || 5)),
      review: review || "",
      ratedAt: new Date(),
    };
    await order.save();

    return res.json({ success: true, message: "Rating berhasil dikirim", data: order });
  } catch (error) {
    console.error("submitRating error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim ulasan" });
  }
};

/**
 * POST /api/shop/orders/:id/simulate-payment
 * Instant digital payment simulation for Shop Orders (Sandbox/Testing)
 */
const simulateShopPayment = async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Autentikasi diperlukan." });
    }

    if (process.env.NODE_ENV === "production" && process.env.ENABLE_PAYMENT_SIMULATION !== "true") {
      return res.status(403).json({
        success: false,
        message: "Simulasi pembayaran dinonaktifkan di environment production kecuali flag ENABLE_PAYMENT_SIMULATION diaktifkan secara eksplisit.",
      });
    }

    const { id } = req.params;
    const order =
      (mongoose.Types.ObjectId.isValid(id) ? await ShopOrder.findById(id) : null) ||
      (await ShopOrder.findOne({ orderCode: id }));

    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan Kanyaah Shop tidak ditemukan." });
    }

    const isAuthorized =
      authUser.role === "admin" ||
      String(order.customerId) === String(authUser._id);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak berhak mensimulasikan pembayaran pesanan ini.",
      });
    }

    order.paymentStatus = "PAID";
    if (order.orderStatus === "PAYMENT_PENDING" || order.orderStatus === "CREATED") {
      order.orderStatus = "WAITING_STORE_CONFIRMATION";
    }

    order.statusHistory.push({
      status: "WAITING_STORE_CONFIRMATION",
      actorId: String(authUser._id),
      actorRole: "customer",
      note: "Pembayaran digital (QRIS/E-Wallet) berhasil diverifikasi (Simulasi Sandbox).",
      timestamp: new Date(),
    });
    await order.save();

    if (order.paymentId) {
      await Payment.findOneAndUpdate(
        { paymentId: order.paymentId },
        { status: "PAID", paidAt: new Date() }
      ).catch(() => undefined);
    }

    const store = await MarketplaceStore.findById(order.storeId);
    const ownerId = store?.ownerId;

    await Notification.create([
      {
        userId: order.customerId,
        title: "Pembayaran Kanyaah Shop Berhasil!",
        message: `Pembayaran pesanan #${order.orderCode} sebesar Rp ${order.totalAmount.toLocaleString("id-ID")} telah lunas. Toko segera menyiapkan pesananmu.`,
        type: "order_status",
        relatedId: order._id,
      },
      ...(ownerId
        ? [
            {
              userId: ownerId,
              title: "Pesanan Masuk (Sudah Dibayar)!",
              message: `Pesanan baru #${order.orderCode} sebesar Rp ${order.totalAmount.toLocaleString("id-ID")} telah lunas dan siap diproses!`,
              type: "order_new",
              relatedId: order._id,
            },
          ]
        : []),
    ]).catch(() => undefined);

    if (req.io) {
      req.io.to(`shop:${String(order._id)}`).emit("shop:order_updated", order);
      req.io.to(`user:${String(order.customerId)}`).emit("shop:order_updated", order);
      if (ownerId) {
        req.io.to(`user:${String(ownerId)}`).emit("shop:new_order", order);
      }
    }

    return res.json({
      success: true,
      message: "Pembayaran berhasil diverifikasi (Simulasi Sandbox).",
      data: order,
    });
  } catch (error) {
    console.error("simulateShopPayment error:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses simulasi pembayaran" });
  }
};

// ==================== MERCHANT FLOW ====================

const merchantOwnsOrder = async (order, authUser) => {
  if (authUser?.role === "admin") return true;
  if (!order?.storeId || !authUser?._id) return false;
  const store = await MarketplaceStore.findOne({ _id: order.storeId, ownerId: authUser._id }).select("_id").lean();
  return Boolean(store);
};

/**
 * GET /api/shop/merchant/orders
 */
const getMerchantOrders = async (req, res) => {
  try {
    const authUser = req.authUser;
    // Find stores owned by this merchant
    const stores = await MarketplaceStore.find({ ownerId: authUser._id }).select("_id");
    const storeIds = stores.map((s) => s._id);

    const orders = await ShopOrder.find({ storeId: { $in: storeIds } })
      .populate("customerId", "name phone profilePhoto")
      .populate("driverId", "name phone profilePhoto")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getMerchantOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesanan merchant" });
  }
};

/**
 * POST /api/shop/orders/:id/accept
 */
const merchantAcceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    if (!(await merchantOwnsOrder(order, req.authUser))) return res.status(403).json({ success: false, message: "Anda tidak berwenang mengelola pesanan toko ini" });

    order.orderStatus = "STORE_ACCEPTED";
    order.statusHistory.push({
      status: "STORE_ACCEPTED",
      actorId: String(req.authUser?._id),
      actorRole: "merchant",
      note: "Pesanan diterima oleh toko dan mulai disiapkan.",
      timestamp: new Date(),
    });
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    await Notification.create({
      userId: order.customerId,
      title: "Pesanan Diterima Toko!",
      message: `Toko ${order.storeName} telah menerima pesanan #${order.orderCode} dan mulai menyiapkannya.`,
      type: "order_status",
      relatedId: order._id,
    }).catch(() => undefined);

    return res.json({ success: true, message: "Pesanan telah diterima", data: order });
  } catch (error) {
    console.error("merchantAcceptOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menerima pesanan" });
  }
};

/**
 * PUT /api/shop/orders/:id/status
 * Merchant status transitions: PREPARING, PICKING, READY_FOR_PICKUP
 */
const merchantUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = "" } = req.body;

    const allowed = ["STORE_ACCEPTED", "PREPARING", "PICKING", "READY_FOR_PICKUP", "CANCELLED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak diizinkan untuk merchant" });
    }

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    if (!(await merchantOwnsOrder(order, req.authUser))) return res.status(403).json({ success: false, message: "Anda tidak berwenang mengelola pesanan toko ini" });

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      actorId: String(req.authUser?._id),
      actorRole: "merchant",
      note: note || `Status diperbarui menjadi ${status} oleh merchant.`,
      timestamp: new Date(),
    });
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    if (status === "PREPARING" || status === "PICKING") {
      await Notification.create({
        userId: order.customerId,
        title: "Barang Sedang Disiapkan!",
        message: `Staf toko ${order.storeName} sedang mengemas barang pesananmu #${order.orderCode}.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);
    } else if (status === "READY_FOR_PICKUP") {
      await Notification.create({
        userId: order.customerId,
        title: "Pesanan Siap Diambil Kurir!",
        message: `Pesanan #${order.orderCode} telah selesai dikemas rapi dan siap dijemput oleh kurir.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);
    }

    // If order is READY_FOR_PICKUP, broadcast to available drivers!
    if (status === "READY_FOR_PICKUP" && req.io) {
      req.io.emit("shop:driver_order_available", order);
    }

    return res.json({ success: true, message: "Status berhasil diperbarui", data: order });
  } catch (error) {
    console.error("merchantUpdateStatus error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status" });
  }
};

/**
 * POST /api/shop/orders/:id/substitution
 * Merchant proposes product substitution for out-of-stock item
 */
const merchantProposeSubstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const { outOfStockProductId, replacementProductId, replacementProductName, adjustmentAmount = 0 } = req.body;

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    if (!(await merchantOwnsOrder(order, req.authUser))) return res.status(403).json({ success: false, message: "Anda tidak berwenang mengelola pesanan toko ini" });

    // Mark item
    const item = order.items.find((i) => String(i.productId) === String(outOfStockProductId));
    if (item) {
      item.actualAvailability = "OUT_OF_STOCK";
      item.replacementProductId = replacementProductId;
      item.replacementProductName = replacementProductName;
      item.adjustmentAmount = adjustmentAmount;
    }

    order.orderStatus = "WAITING_SUBSTITUTION";
    order.substitutionProposal = {
      items: [
        {
          outOfStockProductId,
          replacementProductId,
          replacementProductName,
          adjustmentAmount,
        },
      ],
      customerApproved: null,
      proposedAt: new Date(),
      respondedAt: null,
    };

    order.statusHistory.push({
      status: "WAITING_SUBSTITUTION",
      actorId: String(req.authUser?._id),
      actorRole: "merchant",
      note: `Merchant mengajukan produk pengganti: ${replacementProductName}`,
      timestamp: new Date(),
    });

    await order.save();

    await Notification.create({
      userId: order.customerId,
      title: "Persetujuan Produk Pengganti",
      message: `Ada produk kosong pada pesanan #${order.orderCode}. Toko menawarkan pengganti: ${replacementProductName}.`,
      type: "order_status",
      relatedId: order._id,
    });

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);

    return res.json({ success: true, message: "Pengajuan pengganti telah dikirim ke pelanggan", data: order });
  } catch (error) {
    console.error("merchantProposeSubstitution error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengajukan substitusi" });
  }
};

/**
 * POST /api/shop/orders/:id/substitution-response
 * Customer responds to substitution
 */
const customerRespondSubstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    order.substitutionProposal.customerApproved = Boolean(approved);
    order.substitutionProposal.respondedAt = new Date();

    if (approved) {
      order.orderStatus = "PICKING";
      order.statusHistory.push({
        status: "PICKING",
        actorId: String(req.authUser?._id),
        actorRole: "customer",
        note: "Pelanggan menyetujui produk pengganti.",
        timestamp: new Date(),
      });
    } else {
      order.orderStatus = "PICKING";
      order.statusHistory.push({
        status: "PICKING",
        actorId: String(req.authUser?._id),
        actorRole: "customer",
        note: "Pelanggan menolak produk pengganti. Item kosong dilewati.",
        timestamp: new Date(),
      });
    }

    await order.save();
    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);

    return res.json({ success: true, message: "Respon substitusi disimpan", data: order });
  } catch (error) {
    console.error("customerRespondSubstitution error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan respon substitusi" });
  }
};

// ==================== DRIVER FLOW ====================

/**
 * GET /api/shop/driver/orders
 * Available orders for driver to pick up
 */
const getDriverOrders = async (req, res) => {
  try {
    const driverId = String(
      req.authUser?._id ||
      req.params?.driverId ||
      req.headers?.["x-driver-id"] ||
      req.headers?.["x-user-id"] ||
      req.query?.driverId ||
      ""
    );

    // Available to take: READY_FOR_PICKUP and no driver assigned yet
    const availableOrders = await ShopOrder.find({
      orderStatus: "READY_FOR_PICKUP",
      $or: [{ driverId: null }, { driverId: { $exists: false } }],
    })
      .populate("storeId", "name logo address latitude longitude")
      .sort({ createdAt: -1 })
      .lean();

    const isValidDriverId = Boolean(driverId && mongoose.Types.ObjectId.isValid(driverId));
    const driverQuery = isValidDriverId
      ? { $in: [new mongoose.Types.ObjectId(driverId), driverId] }
      : driverId;

    // Active order assigned to this driver
    const activeOrder = isValidDriverId
      ? await ShopOrder.findOne({
          driverId: driverQuery,
          orderStatus: {
            $in: [
              "DRIVER_ASSIGNED",
              "DRIVER_HEADING_TO_STORE",
              "DRIVER_ON_THE_WAY_TO_STORE",
              "DRIVER_AT_STORE",
              "PICKED_UP",
              "DELIVERING",
              "ARRIVED",
            ],
          },
        })
          .populate("storeId", "name logo address latitude longitude")
          .lean()
      : null;

    // All orders assigned to this driver (active + completed)
    const driverOrders = isValidDriverId
      ? await ShopOrder.find({
          driverId: driverQuery,
        })
          .populate("storeId", "name logo address latitude longitude")
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean()
      : [];

    return res.json({
      success: true,
      data: {
        availableOrders,
        activeOrder,
        driverOrders,
      },
    });
  } catch (error) {
    console.error("getDriverOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesanan driver" });
  }
};

/**
 * POST /api/shop/orders/:id/accept-driver
 */
const acceptDriverOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const authUser = req.authUser;

    if (!authUser) {
      return res.status(401).json({ success: false, message: "Sesi driver tidak valid atau belum login" });
    }

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    if (order.orderStatus !== "READY_FOR_PICKUP" || (order.driverId && String(order.driverId) !== String(authUser._id))) {
      return res.status(409).json({ success: false, message: "Pesanan sudah diambil oleh driver lain atau belum siap" });
    }

    order.driverId = authUser._id;
    order.driverName = authUser.name;
    order.driverPhone = authUser.phone || "";
    order.driverPhoto = authUser.profilePhoto || "";
    order.driverPlateNumber = authUser.roleData?.plateNumber || authUser.plateNumber || "";
    order.orderStatus = "DRIVER_ASSIGNED";
    order.statusHistory.push({
      status: "DRIVER_ASSIGNED",
      actorId: String(authUser._id),
      actorRole: "driver",
      note: `Driver ${authUser.name} menerima tugas pengantaran.`,
      timestamp: new Date(),
    });
    await order.save();

    await Notification.create({
      userId: order.customerId,
      title: "Driver Menuju Toko!",
      message: `Driver ${authUser.name} telah menerima pesanan #${order.orderCode} dan sedang menuju toko.`,
      type: "order_status",
      relatedId: order._id,
    }).catch(() => undefined);

    const storeDoc = await MarketplaceStore.findById(order.storeId).select("ownerId");
    if (storeDoc?.ownerId) {
      await Notification.create({
        userId: storeDoc.ownerId,
        title: "Kurir Ditugaskan!",
        message: `Driver ${authUser.name} telah menerima pesanan #${order.orderCode} dan sedang menuju tokomu untuk mengambil paket.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);
    }

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    return res.json({ success: true, message: "Pesanan berhasil diambil", data: order });
  } catch (error) {
    console.error("acceptDriverOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pesanan" });
  }
};

/**
 * PUT /api/shop/orders/:id/status (by driver)
 */
const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = "", proofUrl = "", deliveryProofUrl = "" } = req.body;
    const authUser = req.authUser;

    if (!authUser) {
      return res.status(401).json({ success: false, message: "Sesi driver tidak valid atau belum login" });
    }

    const allowed = [
      "DRIVER_ASSIGNED",
      "DRIVER_HEADING_TO_STORE",
      "DRIVER_ON_THE_WAY_TO_STORE",
      "DRIVER_AT_STORE",
      "PICKED_UP",
      "DELIVERING",
      "ARRIVED",
      "COMPLETED",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid untuk driver" });
    }

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    if (String(order.driverId) !== String(authUser._id) && authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Anda bukan driver yang ditugaskan untuk pesanan ini" });
    }

    order.orderStatus = status;
    const incomingProof = proofUrl || deliveryProofUrl;
    if (incomingProof) {
      order.deliveryProofUrl = incomingProof;
    }

    if (status === "DRIVER_HEADING_TO_STORE" || status === "DRIVER_ON_THE_WAY_TO_STORE") {
      await Notification.create({
        userId: order.customerId,
        title: "Driver Menuju Toko!",
        message: `Driver ${authUser.name} sedang dalam perjalanan menuju ${order.storeName} untuk mengambil pesananmu.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);
    } else if (status === "DRIVER_AT_STORE") {
      await Notification.create({
        userId: order.customerId,
        title: "Driver Tiba di Toko!",
        message: `Driver ${authUser.name} telah tiba di ${order.storeName} dan sedang mengambil pesananmu.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);

      const store = await MarketplaceStore.findById(order.storeId).select("ownerId");
      if (store?.ownerId) {
        await Notification.create({
          userId: store.ownerId,
          title: "Kurir Tiba di Toko!",
          message: `Driver ${authUser.name} telah tiba di tokomu untuk mengambil pesanan #${order.orderCode}.`,
          type: "order_status",
          relatedId: order._id,
        }).catch(() => undefined);
      }
    } else if (status === "PICKED_UP" || status === "DELIVERING") {
      await Notification.create({
        userId: order.customerId,
        title: "Pesanan Sedang Diantar!",
        message: `Driver ${authUser.name} telah mengambil belanjaanmu dan sedang menuju alamat tujuan.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);
    } else if (status === "COMPLETED") {
      order.completedAt = new Date();
      if (order.paymentMethod === "CASH") {
        order.paymentStatus = "PAID";
      }
      await Notification.create({
        userId: order.customerId,
        title: "Pesanan Selesai Diantar!",
        message: `Pesanan #${order.orderCode} telah berhasil diantar oleh driver. Terima kasih telah berbelanja!`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => undefined);

      const store = await MarketplaceStore.findById(order.storeId).select("ownerId");
      if (store?.ownerId) {
        await Notification.create({
          userId: store.ownerId,
          title: "Pesanan Selesai Diantar!",
          message: `Pesanan #${order.orderCode} telah berhasil diantar dengan aman ke pelanggan oleh driver ${authUser.name}.`,
          type: "order_status",
          relatedId: order._id,
        }).catch(() => undefined);
      }

      // Award 1% loyalty point reward for completing shop order
      if (order.subtotal > 0) {
        const rewardPoints = Math.max(1, Math.round(order.subtotal * 0.01));
        await pointWalletService.creditPoints({
          userId: order.customerId,
          points: rewardPoints,
          sourceType: "KANYAAH_SHOP",
          sourceId: order.orderCode,
          notes: `Cashback 1% belanja Kanyaah Shop #${order.orderCode}`,
          actorId: authUser?._id || order.customerId,
        }).catch((err) => console.warn("[Kanyaah Point] Cashback error:", err.message));
      }
    }

    order.statusHistory.push({
      status,
      actorId: String(authUser._id),
      actorRole: "driver",
      note: note || `Driver memperbarui status pesanan menjadi ${status}.`,
      timestamp: new Date(),
    });
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    return res.json({ success: true, message: "Status pengantaran diperbarui", data: order });
  } catch (error) {
    console.error("updateDriverStatus error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status pengantaran" });
  }
};

/**
 * POST /api/shop/orders/:id/pickup-proof
 */
const uploadPickupProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { proofUrl } = req.body;
    if (!proofUrl) return res.status(400).json({ success: false, message: "URL foto bukti wajib diisi" });

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    order.pickupProofUrl = proofUrl;
    order.orderStatus = "PICKED_UP";
    order.statusHistory.push({
      status: "PICKED_UP",
      actorId: String(req.authUser?._id),
      actorRole: "driver",
      note: "Barang telah diambil dari toko dengan bukti foto.",
      timestamp: new Date(),
    });
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    return res.json({ success: true, message: "Bukti pickup berhasil disimpan", data: order });
  } catch (error) {
    console.error("uploadPickupProof error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan bukti pickup" });
  }
};

/**
 * POST /api/shop/orders/:id/delivery-proof
 */
const uploadDeliveryProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { proofUrl } = req.body;
    if (!proofUrl) return res.status(400).json({ success: false, message: "URL foto bukti pengantaran wajib diisi" });

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    order.deliveryProofUrl = proofUrl;
    order.orderStatus = "COMPLETED";
    order.completedAt = new Date();
    order.statusHistory.push({
      status: "COMPLETED",
      actorId: String(req.authUser?._id),
      actorRole: "driver",
      note: "Pesanan berhasil diantar ke customer dengan bukti foto.",
      timestamp: new Date(),
    });
    await order.save();

    // Award 1% loyalty point reward for completing shop order
    if (order.subtotal > 0) {
      const rewardPoints = Math.max(1, Math.round(order.subtotal * 0.01));
      await pointWalletService.creditPoints({
        userId: order.customerId,
        points: rewardPoints,
        sourceType: "KANYAAH_SHOP",
        sourceId: order.orderCode,
        notes: `Cashback 1% belanja Kanyaah Shop #${order.orderCode}`,
        actorId: req.authUser?._id || order.customerId,
      }).catch((err) => console.warn("[Kanyaah Point] Cashback error:", err.message));
    }

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);
    await emitToStoreOwner(req.io, order.storeId, "shop:order_updated", order);

    return res.json({ success: true, message: "Pesanan selesai diantar", data: order });
  } catch (error) {
    console.error("uploadDeliveryProof error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan bukti pengantaran" });
  }
};

/**
 * PUT /api/shop/orders/:id/location
 */
const updateDriverLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    order.driverLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      updatedAt: new Date(),
    };
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:driver_location", {
      orderId: String(order._id),
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    return res.json({ success: true, message: "Lokasi berhasil diperbarui" });
  } catch (error) {
    console.error("updateDriverLocation error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui lokasi" });
  }
};

// ==================== PHARMACY FLOW ====================

/**
 * POST /api/shop/orders/:id/prescription
 */
const submitPrescription = async (req, res) => {
  try {
    const { storeId, doctorName, prescriptionDate, imageUrls, customerNotes } = req.body;
    const authUser = req.authUser;

    if (!storeId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ success: false, message: "storeId dan minimal 1 foto resep wajib diunggah" });
    }

    const prescriptionCode = `RX-${Date.now().toString().slice(-6)}`;
    const prescription = await Prescription.create({
      prescriptionCode,
      customerId: authUser._id,
      customerName: authUser.name,
      customerPhone: authUser.phone || "",
      storeId,
      doctorName: doctorName || "",
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
      imageUrls,
      customerNotes: customerNotes || "",
      status: "WAITING_PRESCRIPTION_REVIEW",
    });

    return res.status(201).json({
      success: true,
      message: "Resep berhasil dikirim untuk verifikasi apoteker",
      data: prescription,
    });
  } catch (error) {
    console.error("submitPrescription error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim resep" });
  }
};

/**
 * GET /api/shop/pharmacy/prescriptions
 */
const getPendingPrescriptions = async (req, res) => {
  try {
    const authUser = req.authUser;
    // Find pharmacies associated with this user
    const stores = await MarketplaceStore.find({ ownerId: authUser._id, storeType: "PHARMACY" }).select("_id");
    const storeIds = stores.map((s) => s._id);

    const prescriptions = await Prescription.find({
      storeId: { $in: storeIds },
      status: "WAITING_PRESCRIPTION_REVIEW",
    })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: prescriptions });
  } catch (error) {
    console.error("getPendingPrescriptions error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat resep apotek" });
  }
};

/**
 * POST /api/shop/prescriptions/:id/approve
 */
const approvePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { pharmacistNotes = "" } = req.body;
    const authUser = req.authUser;

    const prescription = await Prescription.findById(id);
    if (!prescription) return res.status(404).json({ success: false, message: "Resep tidak ditemukan" });

    prescription.status = "APPROVED";
    prescription.pharmacistId = authUser._id;
    prescription.pharmacistName = authUser.name;
    prescription.pharmacistNotes = pharmacistNotes;
    prescription.verifiedAt = new Date();
    await prescription.save();

    await Notification.create({
      userId: prescription.customerId,
      title: "Resep Obat Disetujui",
      message: `Resep ${prescription.prescriptionCode} telah diverifikasi oleh apoteker ${authUser.name}. Anda dapat melanjutkan ke pembayaran.`,
      type: "order_status",
      relatedId: prescription._id,
    });

    emitToUser(req.io, prescription.customerId, "prescription:approved", prescription);

    return res.json({ success: true, message: "Resep berhasil disetujui", data: prescription });
  } catch (error) {
    console.error("approvePrescription error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyetujui resep" });
  }
};

/**
 * POST /api/shop/prescriptions/:id/reject
 */
const rejectPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason = "Resep tidak memenuhi persyaratan apotek" } = req.body;
    const authUser = req.authUser;

    const prescription = await Prescription.findById(id);
    if (!prescription) return res.status(404).json({ success: false, message: "Resep tidak ditemukan" });

    prescription.status = "REJECTED";
    prescription.pharmacistId = authUser._id;
    prescription.pharmacistName = authUser.name;
    prescription.rejectionReason = rejectionReason;
    prescription.verifiedAt = new Date();
    await prescription.save();

    await Notification.create({
      userId: prescription.customerId,
      title: "Resep Obat Ditolak",
      message: `Resep ${prescription.prescriptionCode} ditolak: ${rejectionReason}`,
      type: "order_status",
      relatedId: prescription._id,
    });

    emitToUser(req.io, prescription.customerId, "prescription:rejected", prescription);

    return res.json({ success: true, message: "Resep telah ditolak", data: prescription });
  } catch (error) {
    console.error("rejectPrescription error:", error);
    return res.status(500).json({ success: false, message: "Gagal menolak resep" });
  }
};

module.exports = {
  createShopOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  submitComplaint,
  submitRating,
  simulateShopPayment,
  getMerchantOrders,
  merchantAcceptOrder,
  merchantUpdateStatus,
  merchantProposeSubstitution,
  customerRespondSubstitution,
  getDriverOrders,
  acceptDriverOrder,
  updateDriverStatus,
  uploadPickupProof,
  uploadDeliveryProof,
  updateDriverLocation,
  submitPrescription,
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
};
