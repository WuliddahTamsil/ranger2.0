const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const RideOrder = require("../models/RideOrder");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const LaundryOrder = require("../models/LaundryOrder");
const SendOrder = require("../models/SendOrder");
const ShopOrder = require("../models/ShopOrder");
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
      const laundryOrder = await LaundryOrder.findOneAndUpdate(
        query,
        {
          paymentStatus: isPaid ? "lunas" : "menunggu_pembayaran",
          paymentMethod: paymentMethod || "Midtrans Digital",
          ...(isPaid
            ? {
                paidAt: new Date(),
                status: "PEMBAYARAN_LUNAS",
              }
            : {}),
        },
        { new: true }
      );

      if (laundryOrder && isPaid) {
        await Notification.create([
          {
            userId: laundryOrder.ownerId,
            title: "Pembayaran Laundry Lunas!",
            message: `Pembayaran cucian #${laundryOrder.orderCode} sebesar Rp ${(laundryOrder.totalAmount || laundryOrder.finalAmount || 0).toLocaleString("id-ID")} telah lunas via ${paymentMethod || "Midtrans"}. Cucian siap diproses.`,
            type: "laundry",
            relatedId: laundryOrder._id,
          },
          {
            userId: laundryOrder.customerId,
            title: "Pembayaran Laundry Berhasil!",
            message: `Pembayaran pesanan laundry #${laundryOrder.orderCode} berhasil diverifikasi. Pakaian Anda segera diproses oleh mitra.`,
            type: "laundry",
            relatedId: laundryOrder._id,
          },
        ]).catch(() => undefined);

        if (io) {
          io.emit("laundry_order_updated", laundryOrder);
          io.to(`user:${String(laundryOrder.ownerId)}`).emit("laundry_order_updated", laundryOrder);
          io.to(`user:${String(laundryOrder.customerId)}`).emit("laundry_order_updated", laundryOrder);
        }
      }
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
          io.emit("send:payment_updated", existingOrder);
          io.emit("send:status_updated", existingOrder);
          if (isPaid) {
            io.emit("send:order_available", existingOrder);
          }
        }
      }
    } else if (orderType === "KANYAAH_SHOP" || orderType === "SHOP") {
      const shopOrder = await ShopOrder.findOne(query);
      if (shopOrder) {
        shopOrder.paymentStatus = isPaid ? "PAID" : paymentStatus;
        if (paymentMethod) shopOrder.paymentMethod = String(paymentMethod).toUpperCase();

        if (isPaid && (shopOrder.orderStatus === "PAYMENT_PENDING" || shopOrder.orderStatus === "CREATED")) {
          shopOrder.orderStatus = "WAITING_STORE_CONFIRMATION";
          shopOrder.statusHistory.push({
            status: "WAITING_STORE_CONFIRMATION",
            actorRole: "system",
            note: "Pembayaran berhasil diverifikasi. Pesanan diteruskan ke toko untuk diproses.",
            timestamp: new Date(),
          });
        }
        await shopOrder.save();

        if (isPaid) {
          const MarketplaceStore = require("../models/MarketplaceStore");
          const store = await MarketplaceStore.findById(shopOrder.storeId);
          const ownerId = store?.ownerId;

          await Notification.create([
            {
              userId: shopOrder.customerId,
              title: "Pembayaran Kanyaah Shop Berhasil!",
              message: `Pembayaran pesanan #${shopOrder.orderCode} sebesar Rp ${shopOrder.totalAmount.toLocaleString("id-ID")} telah lunas. Toko segera menyiapkan pesananmu.`,
              type: "order_status",
              relatedId: shopOrder._id,
            },
            ...(ownerId
              ? [
                  {
                    userId: ownerId,
                    title: "Pesanan Telah Dibayar!",
                    message: `Pesanan #${shopOrder.orderCode} sebesar Rp ${shopOrder.totalAmount.toLocaleString("id-ID")} telah lunas dan siap diproses.`,
                    type: "order_new",
                    relatedId: shopOrder._id,
                  },
                ]
              : []),
          ]).catch(() => undefined);

          if (io) {
            io.to(`shop:${String(shopOrder._id)}`).emit("shop:order_updated", shopOrder);
            io.to(`user:${String(shopOrder.customerId)}`).emit("shop:order_updated", shopOrder);
            if (ownerId) {
              io.to(`user:${String(ownerId)}`).emit("shop:new_order", shopOrder);
            }
          }
        }
      }
    } else if (["KOS", "HOTEL", "WISATA", "HOMESTAY", "BOOKING"].includes(orderType)) {
      const Booking = require("../models/Booking");
      const Kost = require("../models/Kost");
      const bookingQuery = {
        $or: [
          ...(mongoose.Types.ObjectId.isValid(orderId) ? [{ _id: orderId }] : []),
          { bookingCode: orderId },
        ],
      };
      const booking = await Booking.findOne(bookingQuery);
      if (booking) {
        if (isPaid) {
          booking.status = "dp_verified";
          booking.dpPaidAt = new Date();
          booking.verifiedAt = new Date();
          if (booking.categoryType === "wisata") {
            booking.settlementStatus = "settled";
            booking.settledAmount = booking.totalAmount;
            booking.settledAt = new Date();
            booking.settlementPaymentMethod = paymentMethod || "Midtrans Digital";
          }
          await booking.save();

          if (booking.kostId) {
            const tenantData = {
              userId: booking.customerId,
              name: booking.customerName,
              phone: booking.customerPhone,
              entryDate: booking.entryDate,
              dueDate: new Date(new Date(booking.entryDate).setMonth(new Date(booking.entryDate).getMonth() + (booking.durationMonths || 1))),
            };
            let updateRes = { matchedCount: 0 };
            if (booking.roomId) {
              updateRes = await Kost.updateOne(
                { _id: booking.kostId, "rooms._id": booking.roomId },
                { $set: { "rooms.$.isAvailable": false, "rooms.$.currentTenant": tenantData } }
              );
              if (updateRes.matchedCount === 0) {
                await Kost.updateOne(
                  { _id: booking.kostId, "hotelRooms._id": booking.roomId },
                  { $set: { "hotelRooms.$.isAvailable": false } }
                );
              }
            }
            if (updateRes.matchedCount === 0 && booking.roomNumber) {
              const res2 = await Kost.updateOne(
                { _id: booking.kostId, "rooms.roomNumber": booking.roomNumber },
                { $set: { "rooms.$.isAvailable": false, "rooms.$.currentTenant": tenantData } }
              );
              if (res2.matchedCount === 0) {
                await Kost.updateOne(
                  { _id: booking.kostId, "hotelRooms.roomName": booking.roomNumber },
                  { $set: { "hotelRooms.$.isAvailable": false } }
                );
              }
            }
          }

          const isWisata = booking.categoryType === "wisata";
          const isHotel = booking.categoryType === "hotel" || booking.categoryType === "homestay";
          await Notification.create([
            {
              userId: booking.ownerId,
              title: isWisata ? "🎟️ Tiket Wisata Terbayar!" : isHotel ? "🏨 Reservasi Hotel/Homestay Terbayar!" : "🏠 Pembayaran DP Kost Diterima!",
              message: `Pembayaran ${isWisata ? "tiket wisata" : "DP"} #${booking.bookingCode} sebesar Rp ${booking.dpAmount.toLocaleString("id-ID")} telah lunas via ${paymentMethod || "Midtrans"}.`,
              type: "booking_new",
              relatedId: booking._id,
            },
            {
              userId: booking.customerId,
              title: isWisata ? "🎉 E-Ticket Wisata Terbit!" : isHotel ? "🎉 Reservasi Terkonfirmasi!" : "✅ DP Kost Berhasil Diverifikasi!",
              message: `Pembayaran #${booking.bookingCode} sebesar Rp ${booking.dpAmount.toLocaleString("id-ID")} berhasil diverifikasi via ${paymentMethod || "Midtrans"}.`,
              type: "dp_verified",
              relatedId: booking._id,
            },
          ]).catch(() => undefined);

          if (io) {
            io.emit("booking:update", booking);
            io.to(`user:${String(booking.ownerId)}`).emit("booking:update", booking);
            io.to(`user:${String(booking.customerId)}`).emit("booking:update", booking);
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
    const customerEmail = req.authUser?.email || req.body.customerEmail || "customer@kanyaah.com";

    // Cancel previous pending payment records for this order so no duplicate active payment sessions remain
    await Payment.updateMany(
      {
        $or: [
          { orderId },
          { orderCode: orderId },
          ...(orderCode ? [{ orderId: orderCode }, { orderCode }] : []),
        ],
        status: "PENDING",
      },
      { $set: { status: "CANCELLED", cancellationReason: "Digantikan oleh sesi pembayaran baru" } }
    ).catch(() => undefined);

    const gatewayResult = await paymentGateway.createPayment({
      orderId,
      orderCode,
      orderType,
      orderCategory,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
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
      snapToken: gatewayResult.snapToken,
      snapRedirectUrl: gatewayResult.snapRedirectUrl,
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
    const payload = req.body || {};
    console.log("🔔 Incoming payment gateway webhook payload:", payload);

    // If test ping or validation from Midtrans Dashboard (e.g. empty body or test order)
    if (
      !payload ||
      Object.keys(payload).length === 0 ||
      payload.order_id?.startsWith("test-") ||
      payload.order_id === "test" ||
      (!payload.order_id && !payload.paymentId)
    ) {
      return res.status(200).json({
        success: true,
        message: "Midtrans webhook ping verified successfully",
      });
    }

    const verified = await paymentGateway.handleWebhook(payload);
    const payment = await Payment.findOne({
      $or: [{ paymentId: verified.paymentId }, { orderId: verified.paymentId }],
    });

    if (!payment) {
      console.warn("⚠️ Webhook received for unrecorded payment:", verified.paymentId);
      // Midtrans requires 200 OK to acknowledge receipt
      return res.status(200).json({
        success: true,
        message: "Webhook acknowledged, payment record not found",
        paymentId: verified.paymentId,
      });
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

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      status: payment.status,
    });
  } catch (error) {
    console.error("❌ handlePaymentWebhook error:", error);
    return res.status(200).json({
      success: false,
      message: "Webhook processed with warnings",
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
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_PAYMENT_SIMULATION !== "true") {
      return res.status(403).json({
        success: false,
        message: "Simulasi pembayaran dinonaktifkan di environment production kecuali flag ENABLE_PAYMENT_SIMULATION diaktifkan secara eksplisit.",
      });
    }

    const paymentId = req.params.paymentId || req.body.paymentId || req.body.orderId;
    const { status = "PAID", orderId, orderType = "KANYAAH_SEND" } = req.body;

    const payment = await Payment.findOne({
      $or: [{ paymentId }, { orderId: paymentId }, ...(orderId ? [{ orderId }] : [])],
    });

    if (!payment) {
      const targetOrderId = orderId || paymentId;
      if (targetOrderId) {
        await syncOrderPaymentStatus(targetOrderId, orderType, status, req.body.paymentMethod || "QRIS", req.io);
        return res.json({
          success: true,
          message: `Status order ${targetOrderId} berhasil disimulasikan menjadi ${status}`,
        });
      }
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

/**
 * PATCH /api/payments/order/:orderId/method
 * POST /api/payments/update-method
 * Updates paymentMethod on the pending bill/order without generating gateway transactions or payment sessions.
 * Deactivates any prior pending digital payment session to prevent duplicate active instructions.
 */
const updateOrderPaymentMethod = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    const { orderType, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "orderId dan paymentMethod wajib disertakan.",
      });
    }

    const normalizedOrderType = String(orderType || "").toUpperCase();
    const query = {
      $or: [
        ...(mongoose.Types.ObjectId.isValid(orderId) ? [{ _id: orderId }] : []),
        { orderCode: orderId },
        { bookingCode: orderId },
      ],
    };

    // 1. Cancel previous pending payment records for this order to prevent multiple active instructions
    await Payment.updateMany(
      {
        $or: [
          { orderId },
          { orderCode: orderId },
          ...(mongoose.Types.ObjectId.isValid(orderId) ? [{ orderId: String(orderId) }] : []),
        ],
        status: "PENDING",
      },
      { $set: { status: "CANCELLED", notes: `Payment method changed to ${paymentMethod}` } }
    ).catch(() => undefined);

    let updatedOrder = null;
    let orderAmount = 0;

    // 2. Update order payment method according to orderType or attempt matching models
    if (normalizedOrderType === "RIDE") {
      updatedOrder = await RideOrder.findOneAndUpdate(
        query,
        { paymentMethod },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.totalAmount || updatedOrder.finalAmount || updatedOrder.fare || updatedOrder.estimatedFare || 0;
    } else if (normalizedOrderType === "MARKETPLACE") {
      updatedOrder = await MarketplaceOrder.findOneAndUpdate(
        query,
        { paymentMethod: String(paymentMethod).toLowerCase() },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.totalAmount || 0;
    } else if (normalizedOrderType === "CATERING") {
      updatedOrder = await CateringOrder.findOneAndUpdate(
        query,
        { paymentMethod: String(paymentMethod).toLowerCase() },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.remainingAmount || updatedOrder.totalAmount || 0;
    } else if (normalizedOrderType === "LAUNDRY") {
      updatedOrder = await LaundryOrder.findOneAndUpdate(
        query,
        { paymentMethod },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.totalAmount || updatedOrder.finalAmount || 0;
    } else if (normalizedOrderType === "SEND" || normalizedOrderType === "KANYAAH_SEND") {
      updatedOrder = await SendOrder.findOneAndUpdate(
        query,
        { paymentMethod },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.pricing?.finalFare || updatedOrder.totalAmount || 0;
    } else if (normalizedOrderType === "KANYAAH_SHOP" || normalizedOrderType === "SHOP") {
      updatedOrder = await ShopOrder.findOneAndUpdate(
        query,
        { paymentMethod: String(paymentMethod).toUpperCase() },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.totalAmount || 0;
    } else if (["KOS", "HOTEL", "WISATA", "HOMESTAY", "BOOKING"].includes(normalizedOrderType)) {
      const Booking = require("../models/Booking");
      updatedOrder = await Booking.findOneAndUpdate(
        query,
        { paymentMethod },
        { new: true }
      );
      if (updatedOrder) orderAmount = updatedOrder.dpAmount || updatedOrder.totalAmount || 0;
    } else {
      // Auto-detect fallback across models
      const [ride, mkt, send, shop, cat, lau] = await Promise.all([
        RideOrder.findOneAndUpdate(query, { paymentMethod }, { new: true }),
        MarketplaceOrder.findOneAndUpdate(query, { paymentMethod: String(paymentMethod).toLowerCase() }, { new: true }),
        SendOrder.findOneAndUpdate(query, { paymentMethod }, { new: true }),
        ShopOrder.findOneAndUpdate(query, { paymentMethod: String(paymentMethod).toUpperCase() }, { new: true }),
        CateringOrder.findOneAndUpdate(query, { paymentMethod: String(paymentMethod).toLowerCase() }, { new: true }),
        LaundryOrder.findOneAndUpdate(query, { paymentMethod }, { new: true }),
      ]);
      updatedOrder = ride || mkt || send || shop || cat || lau;
      if (updatedOrder) {
        orderAmount = updatedOrder.totalAmount || updatedOrder.pricing?.finalFare || updatedOrder.fare || updatedOrder.estimatedFare || 0;
      }
    }

    if (!updatedOrder && orderId !== "temp-order-id") {
      return res.status(404).json({
        success: false,
        message: "Pesanan atau tagihan tidak ditemukan di sistem. Metode pembayaran belum dapat diperbarui.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Metode pembayaran berhasil diperbarui.",
      data: {
        orderId,
        orderType: normalizedOrderType || (updatedOrder ? "DETECTED" : "UNKNOWN"),
        paymentMethod,
        orderAmount,
        updatedOrder,
      },
    });
  } catch (error) {
    console.error("❌ updateOrderPaymentMethod error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui metode pembayaran.",
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
  updateOrderPaymentMethod,
};
