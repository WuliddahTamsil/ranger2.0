const mongoose = require("mongoose");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { syncConversationForOrder } = require("../services/conversationService");
const { getMarketplaceOrderActorRole, getMarketplaceTransition, isValidDeliveryProofUrl, getMarketplaceStatusNotification } = require("../utils/marketplaceOrderLifecycle");

const isValidUserId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));
const emitToUser = (io, userId, event, payload) => {
  if (userId) io?.to(`user:${String(userId)}`).emit(event, payload);
};

const createNotificationsForStatus = async (session, order, status) => {
  const specification = getMarketplaceStatusNotification(status, order.orderCode, order.driverName || "Driver");
  if (!specification) return [];
  const recipients = new Set();
  if (specification.recipients.includes("owner") && isValidUserId(order.ownerId)) recipients.add(String(order.ownerId));
  if (specification.recipients.includes("customer") && isValidUserId(order.customerId)) recipients.add(String(order.customerId));
  const documents = [...recipients].map((userId) => ({
    userId,
    title: specification.title,
    message: specification.message,
    type: "order_status",
    relatedId: order._id,
  }));
  if (documents.length) await Notification.create(documents, { session, ordered: true });
  return documents;
};

const createOrder = async (req, res) => {
  try {
    const { ownerId, customerId, customerName, customerPhone, address, addressSnapshot, notes, items, deliveryFee, serviceFee, driverTip, voucherId, discount, paymentMethod, paymentStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(ownerId) || !customerId || !customerName || customerName === "Customer Rangers" || customerName === "Customer GEOVERSE" || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Data pesanan marketplace belum lengkap" });
    }
    const products = await MarketplaceProduct.find({ _id: { $in: items.map((item) => item.productId) }, ownerId, isActive: true });
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const orderItems = items.map((item) => {
      const product = productMap.get(String(item.productId));
      if (!product || product.stock < Number(item.quantity)) throw new Error(`Produk ${item.name || item.productId} tidak tersedia`);
      return { productId: product._id, name: product.name, quantity: Number(item.quantity), price: product.price, notes: String(item.notes || "").trim().slice(0, 120) };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const ownerProfile = await User.findById(ownerId).select("name address roleData");
    const order = await MarketplaceOrder.create({
      orderCode: `RNG-MKT-${Date.now().toString().slice(-8)}`, ownerId, storeId: String(ownerId), customerId,
      customerName, customerPhone: customerPhone || "", address, addressSnapshot: addressSnapshot || null, notes: notes || "",
      items: orderItems, storeName: ownerProfile?.roleData?.businessName || ownerProfile?.name || "",
      storeAddress: ownerProfile?.roleData?.businessAddress || ownerProfile?.roleData?.address || ownerProfile?.address || "",
      subtotal, deliveryFee: Number(deliveryFee || 0), serviceFee: Number(serviceFee || 0), driverTip: Number(driverTip || 0),
      voucherId: voucherId || "", discount: Number(discount || 0),
      totalAmount: subtotal + Number(deliveryFee || 0) + Number(serviceFee || 0) + Number(driverTip || 0) - Number(discount || 0),
      paymentMethod: paymentMethod || "cod", paymentStatus: paymentStatus || "Menunggu pembayaran di tempat",
    });
    await syncConversationForOrder(order, "marketplace");
    await Promise.all(orderItems.map((item) => MarketplaceProduct.updateOne({ _id: item.productId, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity, sold: item.quantity } })));
    const recipients = [customerId, ownerId].filter(isValidUserId);
    await Notification.create(recipients.map((userId) => ({ userId, title: "Pesanan Marketplace dibuat", message: `Pesanan ${order.orderCode} telah diteruskan ke toko.`, type: "order_new", relatedId: order._id })));
    emitToUser(req.io, ownerId, "order_created", order);
    emitToUser(req.io, customerId, "order_created", order);
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Create marketplace order error:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal membuat pesanan marketplace" });
  }
};

const getOrdersByOwner = async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({
      ownerId: req.authUser._id,
      customerId: { $regex: /^[a-fA-F0-9]{24}$/ },
    }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get marketplace orders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pesanan marketplace" });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({ customerId: String(req.authUser._id) }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get customer marketplace orders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pesanan customer" });
  }
};

const updateOrderStatus = async (req, res) => {
  let session;
  try {
    const authUser = req.authUser;
    const nextStatus = req.body?.status;
    const deliveryProofUrl = String(req.body?.deliveryProofUrl || "").trim();
    if (!authUser) return res.status(401).json({ success: false, message: "Silakan masuk kembali untuk memperbarui pesanan." });
    const current = await MarketplaceOrder.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    const actorRole = getMarketplaceOrderActorRole(authUser._id, current);
    if (!actorRole) {
      return res.status(403).json({ success: false, message: "Akun ini bukan driver yang ditugaskan atau pemilik toko pada pesanan tersebut." });
    }
    if (!getMarketplaceTransition(actorRole, current.status, nextStatus)) {
      return res.status(409).json({ success: false, message: `Perubahan status ${current.status} ke ${nextStatus || "(kosong)"} tidak diizinkan.` });
    }
    if (actorRole === "driver" && nextStatus === "Selesai" && !isValidDeliveryProofUrl(deliveryProofUrl)) {
      return res.status(400).json({ success: false, message: "Foto bukti pengantaran wajib diunggah sebelum pesanan diselesaikan." });
    }

    session = await mongoose.startSession();
    let order;
    let notifiedDrivers = [];
    let notificationRecipients = [];
    await session.withTransaction(async () => {
      const filter = { _id: current._id, status: current.status };
      if (actorRole === "driver") filter.driverId = String(authUser._id);
      else filter.ownerId = authUser._id;
      const update = { status: nextStatus };
      if (actorRole === "driver" && nextStatus === "Selesai") update.deliveryProofUrl = deliveryProofUrl;
      order = await MarketplaceOrder.findOneAndUpdate(filter, update, { new: true, runValidators: true, session });
      if (!order) {
        const error = new Error("Status pesanan sudah berubah. Muat ulang lalu coba lagi."); error.statusCode = 409; throw error;
      }
      if (nextStatus === "Siap" && !order.driverId) {
        const drivers = await User.find({ role: "driver", status: { $ne: "rejected" } }).select("_id").session(session);
        notifiedDrivers = drivers.map((driver) => String(driver._id));
        notificationRecipients = notifiedDrivers;
        if (notifiedDrivers.length) await Notification.create(notifiedDrivers.map((userId) => ({
          userId, title: "Pesanan Siap Dijemput", message: `${order.storeName || "Toko"} telah menyiapkan pesanan ${order.orderCode}.`, type: "order_new", relatedId: order._id,
        })), { session, ordered: true });
      } else {
        const notifications = await createNotificationsForStatus(session, order, nextStatus);
        notificationRecipients = notifications.map((notification) => String(notification.userId));
      }
    });
    await session.endSession(); session = null;

    void syncConversationForOrder(order, "marketplace").catch((error) => console.error("Marketplace conversation sync error:", error));
    [order.ownerId, order.customerId, order.driverId].forEach((userId) => emitToUser(req.io, userId, "order_status_updated", order));
    if (nextStatus === "Siap") notifiedDrivers.forEach((userId) => emitToUser(req.io, userId, "order_assigned", order));
    notificationRecipients.forEach((userId) => emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: nextStatus === "Siap" ? "order_new" : "order_status" }));
    return res.json({ success: true, message: "Status pesanan berhasil diperbarui.", data: order });
  } catch (error) {
    if (session) await session.endSession().catch(() => undefined);
    console.error("Update marketplace order error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Status pesanan belum berhasil diperbarui." });
  }
};

const getOrdersByDriver = async (req, res) => {
  try {
    const driverId = String(req.authUser._id);
    if (req.params.driverId && String(req.params.driverId) !== driverId) return res.status(403).json({ success: false, message: "Anda hanya dapat melihat order untuk akun driver sendiri." });
    const orders = await MarketplaceOrder.find({
      customerId: { $regex: /^[a-fA-F0-9]{24}$/ },
      $or: [
        { driverId },
        { status: "Siap", driverId: { $in: ["", null] }, declinedByDrivers: { $nin: [driverId] } },
        { status: "Siap", driverId: { $exists: false }, declinedByDrivers: { $nin: [driverId] } },
      ],
    }).populate("ownerId", "name address roleData").sort({ createdAt: -1 }).lean();
    const data = orders.map((order) => ({ ...order, ownerId: order.ownerId?._id || order.ownerId, storeName: order.storeName || order.ownerId?.roleData?.businessName || order.ownerId?.name || "", storeAddress: order.storeAddress || order.ownerId?.roleData?.businessAddress || order.ownerId?.roleData?.address || order.ownerId?.address || "" }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Get driver marketplace orders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil order driver" });
  }
};

const acceptDriverOrder = async (req, res) => {
  let session;
  try {
    const driver = req.authUser;
    session = await mongoose.startSession();
    let order;
    let replay = false;
    await session.withTransaction(async () => {
      order = await MarketplaceOrder.findOneAndUpdate(
        { _id: req.params.id, status: "Siap", driverId: { $in: ["", null] }, declinedByDrivers: { $nin: [String(driver._id)] } },
        { $set: { driverId: String(driver._id), driverName: driver.name, driverPhone: driver.phone || "", status: "Menuju Pickup" } },
        { new: true, runValidators: true, session }
      );
      if (!order) {
        const existing = await MarketplaceOrder.findById(req.params.id).session(session);
        if (!existing) { const error = new Error("Pesanan tidak ditemukan."); error.statusCode = 404; throw error; }
        if (String(existing.driverId) === String(driver._id) && ["Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Selesai"].includes(existing.status)) { order = existing; replay = true; return; }
        const error = new Error(existing.driverId ? "Pesanan sudah diterima driver lain." : "Pesanan tidak lagi tersedia untuk diterima."); error.statusCode = 409; throw error;
      }
      await createNotificationsForStatus(session, order, "Menuju Pickup");
    });
    await session.endSession(); session = null;
    if (!replay) {
      void syncConversationForOrder(order, "marketplace").catch((error) => console.error("Marketplace conversation sync error:", error));
      [order.ownerId, order.customerId].forEach((userId) => {
        emitToUser(req.io, userId, "order_status_updated", order);
        emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: "order_status" });
      });
    }
    return res.json({ success: true, message: replay ? "Pesanan sudah ditugaskan kepada Anda." : "Pesanan berhasil diterima.", data: order });
  } catch (error) {
    if (session) await session.endSession().catch(() => undefined);
    console.error("Accept marketplace order error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Gagal menerima pesanan." });
  }
};

const declineDriverOrder = async (req, res) => {
  try {
    const order = await MarketplaceOrder.findOneAndUpdate(
      { _id: req.params.id, status: "Siap", driverId: { $in: ["", null] } },
      { $addToSet: { declinedByDrivers: String(req.authUser._id) } },
      { new: true }
    );
    if (!order) return res.status(409).json({ success: false, message: "Pesanan tidak lagi tersedia untuk ditolak." });
    return res.json({ success: true, message: "Pesanan dihapus dari daftar Anda.", data: order });
  } catch (error) {
    console.error("Decline marketplace order error:", error);
    return res.status(500).json({ success: false, message: "Pesanan belum berhasil ditolak." });
  }
};

const assignDriver = async (req, res) => {
  let session;
  try {
    const ownerId = String(req.authUser._id);
    const current = await MarketplaceOrder.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    if (String(current.ownerId) !== ownerId) return res.status(403).json({ success: false, message: "Pesanan ini bukan milik toko Anda." });
    const driver = await User.findOne({ _id: req.body?.driverId, role: "driver", status: { $ne: "rejected" } }).select("_id name phone");
    if (!driver) return res.status(400).json({ success: false, message: "Driver tidak valid." });
    if (current.status !== "Siap" || current.driverId) return res.status(409).json({ success: false, message: "Pesanan harus berstatus Siap dan belum ditugaskan ke driver." });

    session = await mongoose.startSession();
    let order;
    await session.withTransaction(async () => {
      order = await MarketplaceOrder.findOneAndUpdate(
        { _id: req.params.id, ownerId, status: "Siap", driverId: { $in: ["", null] } },
        { $set: { driverId: String(driver._id), driverName: driver.name, driverPhone: driver.phone || "", status: "Menuju Pickup" } },
        { new: true, runValidators: true, session }
      );
      if (!order) { const error = new Error("Pesanan sudah diterima atau ditugaskan ke driver lain."); error.statusCode = 409; throw error; }
      await createNotificationsForStatus(session, order, "Menuju Pickup");
      await Notification.create([{
        userId: driver._id,
        title: "Pesanan Ditugaskan",
        message: `Anda ditugaskan mengantar pesanan ${order.orderCode}. Status saat ini: Menuju Pickup.`,
        type: "order_status",
        relatedId: order._id,
      }], { session, ordered: true });
    });
    await session.endSession(); session = null;
    void syncConversationForOrder(order, "marketplace").catch((error) => console.error("Marketplace conversation sync error:", error));
    [driver._id, order.ownerId, order.customerId].forEach((userId) => emitToUser(req.io, userId, userId === driver._id ? "order_assigned" : "order_status_updated", order));
    [driver._id, order.ownerId, order.customerId].forEach((userId) => emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: "order_status" }));
    return res.json({ success: true, message: "Driver berhasil ditugaskan.", data: order });
  } catch (error) {
    if (session) await session.endSession().catch(() => undefined);
    console.error("Assign marketplace driver error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Gagal menugaskan driver." });
  }
};

/**
 * POST /api/marketplace/orders/:id/cancel
 * Cancel order by Customer (if Menunggu) or Pemilik (if Menunggu/Diproses)
 * Restores product stock and triggers refund if paid
 */
const cancelMarketplaceOrder = async (req, res) => {
  let session;
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Silakan masuk untuk membatalkan pesanan." });
    }

    const { id } = req.params;
    const { reason = "Dibatalkan oleh pengguna" } = req.body || {};

    const order = await MarketplaceOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    const isCustomer = String(order.customerId) === String(authUser._id);
    const isOwner = String(order.ownerId) === String(authUser._id);

    if (!isCustomer && !isOwner) {
      return res.status(403).json({ success: false, message: "Anda tidak berhak membatalkan pesanan ini." });
    }

    if (order.status === "Dibatalkan") {
      return res.status(409).json({ success: false, message: "Pesanan ini sudah dibatalkan sebelumnya." });
    }

    if (isCustomer && order.status !== "Menunggu") {
      return res.status(409).json({
        success: false,
        message: "Pesanan yang sudah diproses atau disiapkan toko tidak dapat dibatalkan secara sepihak.",
      });
    }

    if (isOwner && !["Menunggu", "Diproses"].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message: "Pesanan yang sudah siap atau dalam pengantaran kurir tidak dapat dibatalkan.",
      });
    }

    const cancelledBy = isCustomer ? "customer" : "pemilik_marketplace";
    const isPaidOnline = order.paymentStatus === "Lunas" || order.paymentStatus === "PAID";

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // 1. Restore product stocks
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.productId) {
            await MarketplaceProduct.updateOne(
              { _id: item.productId },
              { $inc: { stock: Number(item.quantity || 1), sold: -Number(item.quantity || 1) } },
              { session }
            );
          }
        }
      }

      // 2. Update order status and cancellation details
      order.status = "Dibatalkan";
      order.cancellation = {
        reason: String(reason).trim(),
        cancelledBy,
        cancelledAt: new Date(),
      };

      if (isPaidOnline) {
        order.paymentStatus = "Refund";
        order.refund = {
          status: "Diproses",
          amount: order.totalAmount,
          reason: `Pengembalian dana pembatalan (${reason})`,
          refundedAt: null,
        };
      }

      await order.save({ session });

      // 3. If Payment record exists, update to REFUNDED / FAILED
      if (order.paymentId) {
        await Payment.findOneAndUpdate(
          { paymentId: order.paymentId },
          {
            status: isPaidOnline ? "REFUNDED" : "FAILED",
            refundedAt: isPaidOnline ? new Date() : null,
            cancellationReason: reason,
          },
          { session }
        );
      }

      // 4. Notifications
      const notifMsgCustomer = isCustomer
        ? `Pesanan ${order.orderCode} berhasil Anda batalkan.${isPaidOnline ? " Pengembalian dana sedang diproses." : ""}`
        : `Pesanan ${order.orderCode} dibatalkan oleh toko: ${reason}.${isPaidOnline ? " Pengembalian dana sedang diproses." : ""}`;

      const notifMsgOwner = isCustomer
        ? `Pesanan ${order.orderCode} dibatalkan oleh pelanggan (${reason}). Stok produk telah dikembalikan otomatis.`
        : `Pesanan ${order.orderCode} telah Anda batalkan. Stok produk telah dikembalikan otomatis.`;

      await Notification.create(
        [
          {
            userId: order.customerId,
            title: "Pesanan Dibatalkan",
            message: notifMsgCustomer,
            type: "order_status",
            relatedId: order._id,
          },
          {
            userId: order.ownerId,
            title: "Pesanan Dibatalkan",
            message: notifMsgOwner,
            type: "order_status",
            relatedId: order._id,
          },
          ...(order.driverId ? [{
            userId: order.driverId,
            title: "Pesanan Dibatalkan",
            message: `Pesanan ${order.orderCode} telah dibatalkan. Pengantaran tidak perlu dilanjutkan.`,
            type: "order_status",
            relatedId: order._id,
          }] : []),
        ],
        { session, ordered: true }
      );
    });

    await session.endSession();
    session = null;

    // Realtime socket notifications
    [order.ownerId, order.customerId, order.driverId].filter(Boolean).forEach((userId) => {
      emitToUser(req.io, userId, "order_status_updated", order);
      emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: "order_status" });
    });

    return res.json({
      success: true,
      message: `Pesanan berhasil dibatalkan.${isPaidOnline ? " Pengembalian dana sedang diproses sistem." : ""}`,
      data: order,
    });
  } catch (error) {
    if (session) await session.endSession().catch(() => undefined);
    console.error("Cancel marketplace order error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal membatalkan pesanan.",
    });
  }
};

/**
 * POST /api/marketplace/orders/:id/complaint
 * Customer submits complaint for completed or in-transit order
 */
const submitOrderComplaint = async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Silakan masuk untuk mengajukan komplain." });
    }

    const { id } = req.params;
    const {
      reason,
      detail = "",
      photos = [],
      solutionRequested = "Pengembalian Dana (Refund Penuh)",
      bankDetails = null,
    } = req.body || {};

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Pilih alasan kendala pesanan Anda." });
    }

    const order = await MarketplaceOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    if (String(order.customerId) !== String(authUser._id)) {
      return res.status(403).json({ success: false, message: "Anda bukan pemilik pesanan ini." });
    }

    if (!["Selesai", "Mengantar", "Diambil"].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message: "Komplain hanya dapat diajukan untuk pesanan yang sudah selesai atau sedang diantar.",
      });
    }

    const photoList = Array.isArray(photos) ? photos.filter((p) => typeof p === "string" && p.trim()) : [];

    order.complaint = {
      status: "Diajukan",
      reason: reason.trim(),
      detail: String(detail || "").trim(),
      photos: photoList,
      solutionRequested: String(solutionRequested || "Refund").trim(),
      resolutionNotes: "",
      createdAt: new Date(),
    };

    if (bankDetails && typeof bankDetails === "object") {
      order.refund = {
        status: "Menunggu",
        amount: order.totalAmount,
        reason: reason.trim(),
        bankName: bankDetails.bankName || "",
        accountNumber: bankDetails.accountNumber || "",
        accountName: bankDetails.accountName || "",
        refundedAt: null,
      };
    }

    await order.save();

    await Notification.create([
      {
        userId: order.ownerId,
        title: "Komplain Pesanan Masuk",
        message: `Pelanggan ${order.customerName} mengajukan komplain pada pesanan ${order.orderCode} (${reason}). Harap segera tinjau.`,
        type: "order_status",
        relatedId: order._id,
      },
      {
        userId: order.customerId,
        title: "Komplain Terkirim",
        message: `Komplain pesanan ${order.orderCode} telah terkirim ke pemilik toko untuk ditinjau.`,
        type: "order_status",
        relatedId: order._id,
      },
    ]).catch(() => undefined);

    [order.ownerId, order.customerId].forEach((userId) => {
      emitToUser(req.io, userId, "order_status_updated", order);
      emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: "order_status" });
    });

    return res.json({
      success: true,
      message: "Komplain berhasil diajukan dan diteruskan ke pemilik toko.",
      data: order,
    });
  } catch (error) {
    console.error("Submit marketplace complaint error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengajukan komplain pesanan." });
  }
};

/**
 * POST /api/marketplace/orders/:id/complaint/respond
 * Store owner approves or rejects complaint
 */
const respondOrderComplaint = async (req, res) => {
  try {
    const authUser = req.authUser;
    const { id } = req.params;
    const { action, resolutionNotes = "", refundAmount } = req.body || {};

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Tindakan harus 'approve' atau 'reject'." });
    }

    const order = await MarketplaceOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    if (String(order.ownerId) !== String(authUser._id)) {
      return res.status(403).json({ success: false, message: "Anda bukan pemilik toko untuk pesanan ini." });
    }

    if (!order.complaint || order.complaint.status !== "Diajukan") {
      return res.status(409).json({ success: false, message: "Tidak ada komplain aktif yang menunggu respons." });
    }

    const isApprove = action === "approve";
    order.complaint.status = isApprove ? "Disetujui" : "Ditolak";
    order.complaint.resolutionNotes = String(resolutionNotes || "").trim() || (isApprove ? "Komplain disetujui toko." : "Komplain ditolak oleh toko.");
    order.complaint.resolvedAt = new Date();

    if (isApprove) {
      const finalRefund = Number(refundAmount) > 0 ? Number(refundAmount) : order.totalAmount;
      order.paymentStatus = "Refund";
      order.refund = {
        ...(order.refund || {}),
        status: "Selesai",
        amount: finalRefund,
        refundedAt: new Date(),
        reason: order.complaint.reason || "Komplain disetujui",
      };
    } else {
      if (order.refund) {
        order.refund.status = "Ditolak";
      }
    }

    await order.save();

    await Notification.create({
      userId: order.customerId,
      title: isApprove ? "Komplain Disetujui Toko" : "Komplain Ditolak Toko",
      message: isApprove
        ? `Toko menyetujui komplain pesanan ${order.orderCode}.${order.refund?.amount ? ` Pengembalian dana Rp ${order.refund.amount.toLocaleString("id-ID")} diproses.` : ""}`
        : `Toko menolak komplain pesanan ${order.orderCode}. Catatan: ${order.complaint.resolutionNotes}`,
      type: "order_status",
      relatedId: order._id,
    }).catch(() => undefined);

    [order.ownerId, order.customerId].forEach((userId) => {
      emitToUser(req.io, userId, "order_status_updated", order);
      emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: "order_status" });
    });

    return res.json({
      success: true,
      message: isApprove ? "Komplain berhasil disetujui." : "Komplain telah ditolak.",
      data: order,
    });
  } catch (error) {
    console.error("Respond marketplace complaint error:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses respons komplain." });
  }
};

/**
 * POST /api/marketplace/orders/:id/simulate-payment
 * Simulate instant digital payment success (Dev/Testing/Demo)
 */
const simulateMarketplacePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await MarketplaceOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    order.paymentStatus = "Lunas";
    order.paymentDetails = {
      ...(order.paymentDetails || {}),
      paidAt: new Date(),
    };
    await order.save();

    if (order.paymentId) {
      await Payment.findOneAndUpdate(
        { paymentId: order.paymentId },
        { status: "PAID", paidAt: new Date() }
      ).catch(() => undefined);
    }

    await Notification.create([
      {
        userId: order.ownerId,
        title: "Pembayaran Diterima!",
        message: `Pembayaran pesanan ${order.orderCode} sebesar Rp ${order.totalAmount.toLocaleString("id-ID")} telah lunas. Pesanan siap diproses.`,
        type: "order_status",
        relatedId: order._id,
      },
      {
        userId: order.customerId,
        title: "Pembayaran Berhasil",
        message: `Pembayaran pesanan ${order.orderCode} sebesar Rp ${order.totalAmount.toLocaleString("id-ID")} berhasil diverifikasi.`,
        type: "order_status",
        relatedId: order._id,
      },
    ]).catch(() => undefined);

    [order.ownerId, order.customerId].forEach((userId) => {
      emitToUser(req.io, userId, "order_status_updated", order);
      emitToUser(req.io, userId, "notification:new", { relatedId: String(order._id), type: "order_status" });
    });

    return res.json({
      success: true,
      message: "Pembayaran berhasil diverifikasi (Simulasi Sandbox).",
      data: order,
    });
  } catch (error) {
    console.error("Simulate marketplace payment error:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses simulasi pembayaran." });
  }
};

module.exports = {
  createOrder,
  getOrdersByOwner,
  getOrdersByCustomer,
  getOrdersByDriver,
  acceptDriverOrder,
  declineDriverOrder,
  assignDriver,
  updateOrderStatus,
  cancelMarketplaceOrder,
  submitOrderComplaint,
  respondOrderComplaint,
  simulateMarketplacePayment,
};

