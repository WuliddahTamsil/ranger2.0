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
      if (prescriptionDoc.status === "REJECTED") {
        return res.status(400).json({
          success: false,
          message: `Resep ditolak oleh apoteker: ${prescriptionDoc.rejectionReason || "Tidak valid"}`,
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
    if (voucherCode && voucherCode.trim()) {
      const v = await Voucher.findOne({
        voucherCode: voucherCode.trim().toUpperCase(),
        status: "ACTIVE",
        service: { $in: ["ALL", "MARKETPLACE", "KANYAAH_SHOP", "SHOP"] },
      });
      if (v) {
        if (calculatedSubtotal >= v.minTransaction) {
          if (v.discountType === "PERCENTAGE") {
            const rawDiscount = (calculatedSubtotal * v.discountValue) / 100;
            voucherDiscount = v.maxDiscount ? Math.min(rawDiscount, v.maxDiscount) : rawDiscount;
          } else {
            voucherDiscount = v.discountValue;
          }
          validatedVoucherCode = v.voucherCode;
        }
      }
    }

    // GEOVERSE Points deduction validation
    let pointDiscount = 0;
    const safePoints = Math.round(Number(pointsToUse) || 0);
    if (usePoints && safePoints > 0) {
      const wallet = await pointWalletService.getOrCreateWallet(customerId);
      const usablePoints = Math.min(wallet.balancePoint, safePoints, calculatedSubtotal);
      if (usablePoints > 0) {
        pointDiscount = usablePoints;
      }
    }

    const totalAmount = Math.max(
      0,
      calculatedSubtotal + deliveryFee + serviceFee + tip - voucherDiscount - pointDiscount
    );

    const orderCode = `RNG-SHOP-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Payment Intent creation via paymentGateway
    const isCash = paymentMethod.toUpperCase() === "CASH" || paymentMethod.toUpperCase() === "COD";
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
        paymentMethod: paymentMethod.toUpperCase(),
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

    // Deduct points from wallet atomically if used
    if (pointDiscount > 0) {
      await pointWalletService.debitPoints({
        userId: customerId,
        points: pointDiscount,
        type: "SHOP_PAYMENT",
        sourceType: "KANYAAH_SHOP",
        sourceId: orderCode,
        notes: `Pembayaran pesanan Kanyaah Shop #${orderCode}`,
        actorId: customerId,
      });
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
      pointDiscount,
      deliveryFee,
      serviceFee,
      driverTip: tip,
      totalAmount,
      paymentId,
      paymentMethod: paymentMethod.toUpperCase(),
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
    const orders = await ShopOrder.find({ customerId })
      .populate("storeId", "name logo coverImage address storeType")
      .sort({ createdAt: -1 })
      .lean();

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

    // Reverse points if used
    if (order.pointDiscount > 0) {
      await pointWalletService.reversePoints({
        userId: order.customerId,
        points: order.pointDiscount,
        sourceType: "KANYAAH_SHOP",
        sourceId: order.orderCode,
        notes: `Pengembalian poin karena pembatalan pesanan #${order.orderCode}`,
        actorId: authUser?._id,
      });
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

// ==================== MERCHANT FLOW ====================

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
    const authUser = req.authUser;
    // Available to take: READY_FOR_PICKUP and no driver assigned yet
    const availableOrders = await ShopOrder.find({
      orderStatus: "READY_FOR_PICKUP",
      driverId: null,
    })
      .populate("storeId", "name logo address latitude longitude")
      .sort({ createdAt: 1 })
      .lean();

    // Active order assigned to this driver
    const activeOrder = await ShopOrder.findOne({
      driverId: authUser._id,
      orderStatus: { $in: ["DRIVER_ASSIGNED", "DRIVER_AT_STORE", "PICKED_UP", "DELIVERING", "ARRIVED"] },
    })
      .populate("storeId", "name logo address latitude longitude")
      .lean();

    return res.json({
      success: true,
      data: {
        availableOrders,
        activeOrder,
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

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    if (order.orderStatus !== "READY_FOR_PICKUP" || (order.driverId && String(order.driverId) !== String(authUser._id))) {
      return res.status(409).json({ success: false, message: "Pesanan sudah diambil oleh driver lain atau belum siap" });
    }

    order.driverId = authUser._id;
    order.driverName = authUser.name;
    order.driverPhone = authUser.phone || "";
    order.driverPhoto = authUser.profilePhoto || "";
    order.orderStatus = "DRIVER_ASSIGNED";
    order.statusHistory.push({
      status: "DRIVER_ASSIGNED",
      actorId: String(authUser._id),
      actorRole: "driver",
      note: `Driver ${authUser.name} menerima tugas pengantaran.`,
      timestamp: new Date(),
    });
    await order.save();

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);

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
    const { status, note = "" } = req.body;
    const authUser = req.authUser;

    const allowed = ["DRIVER_AT_STORE", "PICKED_UP", "DELIVERING", "ARRIVED", "COMPLETED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid untuk driver" });
    }

    const order = await ShopOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });

    if (String(order.driverId) !== String(authUser._id) && authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Anda bukan driver yang ditugaskan untuk pesanan ini" });
    }

    order.orderStatus = status;
    if (status === "COMPLETED") {
      order.completedAt = new Date();
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

    emitToRoom(req.io, `shop:${String(order._id)}`, "shop:order_updated", order);
    emitToUser(req.io, order.customerId, "shop:order_updated", order);

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
