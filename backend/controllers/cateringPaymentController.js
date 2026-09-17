const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const CateringOrder = require("../models/CateringOrder");
const Notification = require("../models/Notification");
const {
  getPaymentPlan,
  getPaymentReminder,
  getPaymentStatusLabel,
} = require("../utils/cateringOrderLifecycle");

const isUserId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const emitOrderUpdate = (req, order) => {
  const ids = [order.customerId, order.ownerId, order.driverId].filter(Boolean);
  ids.forEach((id) => {
    req.io?.to(`user:${id}`).emit("order_status_updated", order);
    req.io?.to(`customer:${id}`).emit("order_status_updated", order);
    req.io?.to(`owner:${id}`).emit("order_status_updated", order);
    req.io?.to(`driver:${id}`).emit("order_status_updated", order);
  });
};

const notify = async (userId, title, message, relatedId) => {
  if (!isUserId(userId)) return;
  await Notification.create({ userId, title, message, type: "reminder", relatedId });
};

const submitCateringPayment = async (req, res) => {
  try {
    const order = await CateringOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan Catering tidak ditemukan." });
    if (String(order.customerId) !== String(req.authUser._id)) return res.status(403).json({ success: false, message: "Pembayaran hanya dapat diajukan oleh customer pemilik pesanan." });
    if (order.status === "Dibatalkan") return res.status(409).json({ success: false, message: "Pesanan sudah dibatalkan." });
    if (Number(order.remainingAmount) <= 0) return res.status(409).json({ success: false, message: "Pesanan ini sudah lunas." });

    const amount = Math.round(Number(req.body?.amount));
    const reference = String(req.body?.reference || "").trim().slice(0, 120);
    const proofUrl = String(req.body?.proofUrl || "").trim().slice(0, 500);
    const requiresProof = String(order.paymentMethod || "").toLowerCase() !== "cash";
    if (requiresProof && (!proofUrl || typeof proofUrl !== "string" || !proofUrl.trim())) {
      return res.status(400).json({ success: false, message: "Bukti pembayaran wajib diunggah untuk pembayaran non-tunai." });
    }
    const pending = (order.paymentHistory || []).filter((item) => item.status === "MENUNGGU_VERIFIKASI");
    const pendingAmount = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const available = Math.max(0, Number(order.remainingAmount) - pendingAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > available) {
      return res.status(400).json({ success: false, message: `Nominal pembayaran harus di antara Rp 1 dan ${available.toLocaleString("id-ID")}.` });
    }

    const paymentId = `CAT-PAY-${randomUUID().slice(0, 12).toUpperCase()}`;
    order.paymentHistory.push({
      paymentId,
      type: Number(order.paidAmount || 0) === 0 && pendingAmount === 0 ? "DP" : "PELUNASAN",
      amount,
      method: order.paymentMethod,
      status: "MENUNGGU_VERIFIKASI",
      reference,
      proofUrl,
    });
    order.paymentProofUrl = proofUrl;
    order.paymentStatus = "Menunggu Verifikasi";
    await order.save();

    await notify(order.ownerId, "Konfirmasi pembayaran Catering", `${order.customerName} mengajukan pembayaran Rp ${amount.toLocaleString("id-ID")} untuk ${order.orderCode}.`, order._id);
    req.io?.to(`user:${order.ownerId}`).emit("notification:new", { relatedId: String(order._id), type: "reminder" });
    emitOrderUpdate(req, order);
    return res.status(201).json({ success: true, data: order, paymentId });
  } catch (error) {
    console.error("submitCateringPayment error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengajukan pembayaran Catering." });
  }
};

const verifyCateringPayment = async (req, res) => {
  try {
    const order = await CateringOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan Catering tidak ditemukan." });
    if (String(order.ownerId) !== String(req.authUser._id)) return res.status(403).json({ success: false, message: "Hanya pemilik Catering pesanan ini yang dapat memverifikasi pembayaran." });

    const payment = (order.paymentHistory || []).find((item) => String(item.paymentId) === String(req.params.paymentId));
    if (!payment) return res.status(404).json({ success: false, message: "Riwayat pembayaran tidak ditemukan." });

    const action = req.body?.action === "reject" ? "reject" : "verify";

    // Idempotency: if already in the desired state, return success immediately
    if (action === "verify" && payment.status === "TERVERIFIKASI") {
      return res.json({ success: true, data: order, message: "Pembayaran ini sudah terverifikasi sebelumnya." });
    }
    if (action === "reject" && payment.status === "DITOLAK") {
      return res.json({ success: true, data: order, message: "Pembayaran ini sudah ditolak sebelumnya." });
    }

    if (action === "reject") {
      const wasVerified = payment.status === "TERVERIFIKASI";
      payment.status = "DITOLAK";
      payment.rejectionReason = String(req.body?.reason || "Bukti pembayaran belum dapat diverifikasi.").trim().slice(0, 200);

      if (wasVerified) {
        // Revert paidAmount if previously verified
        const validPaid = (order.paymentHistory || [])
          .filter((item) => item.status === "TERVERIFIKASI" && String(item.paymentId) !== String(payment.paymentId))
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        order.paidAmount = validPaid;
        order.remainingAmount = Math.max(0, Number(order.totalAmount || 0) - validPaid);
      }

      order.paymentStatus = "Pembayaran Ditolak";
      order.paymentRejectionReason = payment.rejectionReason;
      await order.save();
      await notify(order.customerId, "Pembayaran perlu diperiksa", `Pembayaran ${payment.paymentId} untuk ${order.orderCode} ditolak. ${payment.rejectionReason}`, order._id);
      emitOrderUpdate(req, order);
      return res.json({ success: true, data: order });
    }

    const alreadyPaid = (order.paymentHistory || [])
      .filter((item) => item.status === "TERVERIFIKASI" && String(item.paymentId) !== String(payment.paymentId))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = Number(order.totalAmount || 0);
    if (alreadyPaid + Number(payment.amount) > total) return res.status(409).json({ success: false, message: "Total pembayaran melebihi nilai pesanan." });

    payment.status = "TERVERIFIKASI";
    payment.verifiedBy = String(req.authUser._id);
    payment.verifiedAt = new Date();
    payment.rejectionReason = "";
    order.paidAmount = alreadyPaid + Number(payment.amount);
    order.remainingAmount = Math.max(0, total - order.paidAmount);
    order.paymentStatus = order.remainingAmount <= 0 ? "Lunas" : "Pembayaran Terverifikasi";
    order.paymentRejectionReason = "";
    order.paymentReminder = getPaymentReminder(order);
    await order.save();

    const isPaid = order.remainingAmount <= 0;
    await notify(order.customerId, isPaid ? "Pesanan Catering lunas" : "DP Catering terverifikasi", isPaid
      ? `Pelunasan ${order.orderCode} sudah diverifikasi. Driver dapat mengantar setelah pesanan siap.`
      : `Pembayaran ${payment.paymentId} untuk ${order.orderCode} sudah diverifikasi. ${order.paymentReminder}`, order._id);
    if (isPaid) {
      await notify(order.ownerId, "Pelunasan Catering diterima", `Pesanan ${order.orderCode} telah lunas 100%. Segera selesaikan masakan dan tandai siap agar driver dapat mengantar.`, order._id);
      req.io?.to(`user:${order.ownerId}`).emit("notification:new", { relatedId: String(order._id), type: "order_status" });
    }
    if (!isPaid) await notify(order.customerId, "Pengingat pelunasan Catering", order.paymentReminder, order._id);
    emitOrderUpdate(req, order);
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("verifyCateringPayment error:", error);
    return res.status(500).json({ success: false, message: "Gagal memverifikasi pembayaran Catering." });
  }
};

const sendCateringPaymentReminder = async (req, res) => {
  try {
    const order = await CateringOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Pesanan Catering tidak ditemukan." });
    if (String(order.ownerId) !== String(req.authUser._id)) return res.status(403).json({ success: false, message: "Hanya pemilik Catering pesanan ini yang dapat mengirim pengingat." });
    if (Number(order.remainingAmount) <= 0) return res.status(409).json({ success: false, message: "Pesanan ini sudah lunas." });

    const reminder = getPaymentReminder(order);
    await notify(order.customerId, "Pengingat pelunasan Catering", `${reminder} Pemilik Catering meminta Anda menyelesaikan pembayaran sebelum jadwal pengiriman.`, order._id);
    req.io?.to(`user:${order.customerId}`).emit("notification:new", { relatedId: String(order._id), type: "reminder" });
    return res.json({ success: true, message: "Pengingat pembayaran telah dikirim ke notifikasi customer." });
  } catch (error) {
    console.error("sendCateringPaymentReminder error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim pengingat pembayaran Catering." });
  }
};

module.exports = { submitCateringPayment, verifyCateringPayment, sendCateringPaymentReminder };
