const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const RideOrder = require("../models/RideOrder");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const LaundryOrder = require("../models/LaundryOrder");
const SendOrder = require("../models/SendOrder");
const Notification = require("../models/Notification");
const paymentGateway = require("../services/paymentGateway");

const getOrderPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ orderId: req.params.orderId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: payments });
  } catch (error) {
    console.error("getOrderPayments error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat riwayat pembayaran." });
  }
};

/**
 * Sync status to underlying order
 */
const syncOrderPaymentStatus = async (orderId, orderType, paymentStatus, paymentMethod, io) => {
  try {
    const isPaid = paymentStatus === "PAID";
    const mappedStatus = isPaid ? "Lunas" : paymentStatus;
    const query = {
      $or: [
        ...(mongoose.Types.ObjectId.isValid(orderId) ? [{ _id: orderId }] : []),
        { orderCode: orderId },
        { paymentId: orderId },
      ],
    };

    if (orderType === "RIDE") {
      await RideOrder.findOneAndUpdate(query, { paymentStatus: mappedStatus, paymentMethod });
    } else if (orderType === "MARKETPLACE") {
      const order = await MarketplaceOrder.findOneAndUpdate(
        query,
        {
          paymentStatus: mappedStatus,
          paymentMethod: String(paymentMethod).toLowerCase(),
          ...(isPaid ? { "paymentDetails.paidAt": new Date() } : {}),
        },
        { new: true }
      );
      if (order && isPaid) {
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

        if (io) {
          io.to(`user:${String(order.ownerId)}`).emit("order_status_updated", order);
          io.to(`user:${String(order.customerId)}`).emit("order_status_updated", order);
          [order.ownerId, order.customerId].forEach((userId) =>
            io.to(`user:${String(userId)}`).emit("notification:new", { relatedId: String(order._id), type: "order_status" })
          );
        }
      }
    } else if (orderType === "CATERING") {
      await CateringOrder.findOneAndUpdate(query, { paymentStatus: mappedStatus, paymentMethod });
    } else if (orderType === "LAUNDRY") {
      await LaundryOrder.findOneAndUpdate(query, { paymentStatus: mappedStatus, paymentMethod });
    } else if (orderType === "SEND" || orderType === "KANYAAH_SEND") {
      const existingOrder = await SendOrder.findOne(query);
      if (existingOrder) {
        existingOrder.paymentStatus = isPaid ? "PAID" : paymentStatus;
        if (paymentMethod) existingOrder.paymentMethod = paymentMethod;

        if (isPaid && existingOrder.status === "PAYMENT_PENDING") {
          existingOrder.status = "SEARCHING_DRIVER";
          existingOrder.statusHistory.push({
            status: "SEARCHING_DRIVER",
            actorRole: "system",
            note: "Pembayaran digital berhasil diverifikasi. Sistem mulai mencari driver terdekat.",
            createdAt: new Date(),
          });
        }
        await existingOrder.save();

        if (io) {
          io.to(`send:${String(existingOrder._id)}`).emit("send:payment_updated", existingOrder);
          io.to(`user:${String(existingOrder.customerId)}`).emit("send:payment_updated", existingOrder);
          if (isPaid) {
            io.emit("send:order_available", existingOrder);
          }
        }
      }
    }
  } catch (error) {
    console.error(`⚠️ Failed to sync order payment status for ${orderId}:`, error);
  }
};

/**
 * POST /api/payments/create
 */
const createPayment = async (req, res) => {
  try {
    const {
      orderId,
      orderCode,
      orderType = "RIDE",
      orderCategory = "RIDE",
      amount,
      paymentMethod = "QRIS",
    } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "orderId dan amount wajib diisi",
      });
    }

    const customerId = req.authUser ? String(req.authUser._id) : req.body.customerId || "anonymous";
    const customerName = req.authUser?.name || req.body.customerName || "Pelanggan";
    const customerPhone = req.authUser?.phone || req.body.customerPhone || "";

    const gatewayResult = await paymentGateway.createPayment({
      orderId,
      orderCode,
      orderType,
      orderCategory,
      customerId,
      customerName,
      customerPhone,
      amount: Number(amount),
      paymentMethod,
    });

    const paymentRecord = await Payment.create({
      paymentId: gatewayResult.paymentId,
      orderId,
      orderCode,
      orderType,
      orderCategory,
      customerId,
      customerName,
      customerPhone,
      amount: Number(amount),
      paymentMethod: gatewayResult.paymentMethod,
      paymentCategory: gatewayResult.paymentCategory,
      status: gatewayResult.status,
      gateway: gatewayResult.gateway,
      qrString: gatewayResult.qrString,
      qrCodeUrl: gatewayResult.qrCodeUrl,
      deepLinkUrl: gatewayResult.deepLinkUrl,
      virtualAccount: gatewayResult.virtualAccount,
      expiredAt: gatewayResult.expiryTime,
    });

    return res.status(201).json({
      success: true,
      message: "Sesi pembayaran digital berhasil dibuat",
      data: paymentRecord,
    });
  } catch (error) {
    console.error("❌ createPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat sesi pembayaran",
      error: error.message,
    });
  }
};

/**
 * GET /api/payments/:paymentId/status
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findOne({
      $or: [{ paymentId }, { orderId: paymentId }],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Data pembayaran tidak ditemukan",
      });
    }

    const checkResult = await paymentGateway.checkStatus(payment);
    if (checkResult.status !== payment.status) {
      payment.status = checkResult.status;
      if (checkResult.status === "PAID" && !payment.paidAt) {
        payment.paidAt = new Date();
      }
      await payment.save();
      await syncOrderPaymentStatus(payment.orderId, payment.orderType, payment.status, payment.paymentMethod, req.io);
      if (req.io) {
        req.io.emit("payment:update", {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          status: payment.status,
        });
      }
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("❌ getPaymentStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memeriksa status pembayaran",
      error: error.message,
    });
  }
};

/**
 * POST /api/payments/webhook
 */
const handlePaymentWebhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log("🔔 Incoming payment gateway webhook payload:", payload);

    const verified = await paymentGateway.handleWebhook(payload);
    const payment = await Payment.findOne({ paymentId: verified.paymentId });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    payment.status = verified.status;
    if (verified.status === "PAID") {
      payment.paidAt = verified.paidAt || new Date();
    }
    await payment.save();

    await syncOrderPaymentStatus(payment.orderId, payment.orderType, payment.status, payment.paymentMethod, req.io);

    if (req.io) {
      req.io.emit("payment:update", {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        status: payment.status,
      });
    }

    return res.json({
      success: true,
      message: "Webhook processed successfully",
      status: payment.status,
    });
  } catch (error) {
    console.error("❌ handlePaymentWebhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memproses webhook pembayaran",
      error: error.message,
    });
  }
};

/**
 * POST /api/payments/:paymentId/simulate
 * Development endpoint to simulate customer completing digital payment
 */
const simulatePaymentWebhook = async (req, res) => {
  try {
    const paymentId = req.params.paymentId || req.body.paymentId;
    const { status = "PAID" } = req.body;

    const payment = await Payment.findOne({
      $or: [{ paymentId }, { orderId: paymentId }],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Data pembayaran tidak ditemukan",
      });
    }

    payment.status = status;
    if (status === "PAID") {
      payment.paidAt = new Date();
    }
    await payment.save();

    await syncOrderPaymentStatus(payment.orderId, payment.orderType, payment.status, payment.paymentMethod, req.io);

    if (req.io) {
      req.io.emit("payment:update", {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        status: payment.status,
      });
    }

    return res.json({
      success: true,
      message: `Status pembayaran berhasil disimulasikan menjadi ${status}`,
      data: payment,
    });
  } catch (error) {
    console.error("❌ simulatePaymentWebhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mensimulasikan pembayaran",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getOrderPayments,
  getPaymentStatus,
  handlePaymentWebhook,
  simulatePaymentWebhook,
};
