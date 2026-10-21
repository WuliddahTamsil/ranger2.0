const mongoose = require("mongoose");
const SendOrder = require("../models/SendOrder");
const findSendOrder = async (idOrCode) => {
  if (!idOrCode) return null;
  const clean = String(idOrCode).replace(/^#/, "").trim();
  if (mongoose.Types.ObjectId.isValid(clean)) {
    const doc = await SendOrder.findById(clean);
    if (doc) return doc;
  }
  return await SendOrder.findOne({
    $or: [{ orderCode: clean }, { orderCode: `#${clean}` }, { orderCode: String(idOrCode).trim() }],
  });
};


const SendComplaint = require("../models/SendComplaint");
const SendPricingConfig = require("../models/SendPricingConfig");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { computeSendFare, isProhibitedItem, getPricingConfig } = require("../services/sendFareService");
const { calculateDriverRevenueSplit } = require("../services/pricingPolicyService");
const { generateSixDigitCode, hashCode, verifyCode } = require("../utils/sendSecurity");
const paymentGateway = require("../services/paymentGateway");

const resolveDriverId = (req) => {
  return String(
    req.authUser?._id ||
    req.headers["x-driver-id"] ||
    req.headers["x-user-id"] ||
    req.headers["x-account-id"] ||
    req.body?.driverId ||
    req.query?.driverId ||
    ""
  );
};

const emitToSendRoom = (io, orderId, event, payload) => {
  if (io && orderId) {
    const id = (orderId && typeof orderId === "object" && orderId._id) ? String(orderId._id) : String(orderId);
    if (id && id !== "[object Object]") {
      io.to(`send:${id}`).emit(event, payload);
    }
    if (payload?.orderCode) {
      io.to(`send:${String(payload.orderCode)}`).emit(event, payload);
      io.to(`send:#${String(payload.orderCode).replace(/^#/, "")}`).emit(event, payload);
    }
  }
};

const emitToUser = (io, userId, event, payload) => {
  if (io && userId) {
    const id = (userId && typeof userId === "object" && userId._id) ? String(userId._id) : String(userId);
    if (id && id !== "[object Object]") {
      io.to(`user:${id}`).emit(event, payload);
    }
  }
};

const emitToDriver = (io, driverId, event, payload) => {
  if (io && driverId) {
    const id = (driverId && typeof driverId === "object" && driverId._id) ? String(driverId._id) : String(driverId);
    if (id && id !== "[object Object]") {
      io.to(`driver:${id}`).emit(event, payload);
    }
  }
};

// Valid Order Lifecycle Transitions
const VALID_TRANSITIONS = {
  CREATED: ["PAYMENT_PENDING", "SEARCHING_DRIVER", "CANCELLED"],
  PAYMENT_PENDING: ["SEARCHING_DRIVER", "CANCELLED"],
  SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["DRIVER_ON_THE_WAY_TO_PICKUP", "DRIVER_ARRIVED_AT_PICKUP", "IN_TRANSIT", "PICKED_UP", "COMPLETED", "CANCELLED", "SEARCHING_DRIVER"],
  DRIVER_ON_THE_WAY_TO_PICKUP: ["DRIVER_ARRIVED_AT_PICKUP", "PICKUP_VERIFICATION", "PICKED_UP", "IN_TRANSIT", "COMPLETED", "CANCELLED"],
  DRIVER_ARRIVED_AT_PICKUP: ["PICKUP_VERIFICATION", "PICKED_UP", "IN_TRANSIT", "COMPLETED", "CANCELLED"],
  PICKUP_VERIFICATION: ["PICKED_UP", "IN_TRANSIT", "COMPLETED", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "ARRIVED_AT_DESTINATION", "DELIVERY_VERIFICATION", "DELIVERED", "COMPLETED", "RETURN_REQUESTED"],
  IN_TRANSIT: ["ARRIVED_AT_DESTINATION", "DELIVERY_VERIFICATION", "DELIVERED", "COMPLETED", "RETURN_REQUESTED"],
  ARRIVED_AT_DESTINATION: ["DELIVERY_VERIFICATION", "DELIVERED", "COMPLETED", "RETURN_REQUESTED"],
  DELIVERY_VERIFICATION: ["DELIVERED", "COMPLETED", "RETURN_REQUESTED"],
  DELIVERED: ["COMPLETED", "DISPUTED"],
  RETURN_REQUESTED: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["RESOLVED", "COMPLETED"],
  RESOLVED: ["COMPLETED"],
};

/**
 * 1. Calculate Fare Estimate (POST /api/send/fare-estimate)
 */
const estimateFare = async (req, res) => {
  try {
    const { pickup, destination, package: pkg, discount = 0 } = req.body;

    if (!pickup?.address || !destination?.address) {
      return res.status(400).json({
        success: false,
        message: "Alamat pickup dan tujuan wajib diisi.",
      });
    }

    if (
      pickup.latitude == null ||
      pickup.longitude == null ||
      destination.latitude == null ||
      destination.longitude == null
    ) {
      return res.status(400).json({
        success: false,
        message: "Koordinat latitude & longitude penjemputan dan tujuan wajib ditentukan pada peta.",
      });
    }

    // Check prohibited goods
    const check = isProhibitedItem(pkg?.name, pkg?.notes);
    if (check.prohibited) {
      return res.status(400).json({
        success: false,
        message: `Pengiriman ditolak: Barang terindikasi mengandung bahan terlarang (${check.keyword}).`,
      });
    }

    const breakdown = await computeSendFare({
      pickup,
      destination,
      packageData: pkg || {},
      discount,
    });

    if (!breakdown.withinServiceRadius) {
      return res.status(400).json({
        success: false,
        message: breakdown.radiusValidation?.message || "Rute pengiriman melebihi batas radius maksimal 15 km.",
        radiusValidation: breakdown.radiusValidation,
      });
    }

    return res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    console.error("estimateFare error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghitung estimasi tarif pengiriman.",
    });
  }
};

/**
 * 2. Create Send Order (POST /api/send/orders)
 */
const createOrder = async (req, res) => {
  try {
    const customerId = req.authUser?._id;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Otentikasi pelanggan diperlukan.",
      });
    }

    const {
      sender,
      recipient,
      package: pkg,
      paymentMethod = "QRIS",
      discount = 0,
      idempotencyKey,
    } = req.body;

    // Idempotency check to prevent duplicate order submissions
    if (idempotencyKey) {
      const existing = await SendOrder.findOne({ idempotencyKey }).lean();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Pesanan telah dibuat sebelumnya.",
          data: existing,
        });
      }
    }

    // Validate essential fields
    if (!sender?.name || !sender?.phone || !sender?.address) {
      return res.status(400).json({
        success: false,
        message: "Data pengirim (nama, telepon, alamat) tidak lengkap.",
      });
    }
    if (!recipient?.name || !recipient?.phone || !recipient?.address) {
      return res.status(400).json({
        success: false,
        message: "Data penerima (nama, telepon, alamat) tidak lengkap.",
      });
    }
    if (
      sender.latitude == null ||
      sender.longitude == null ||
      recipient.latitude == null ||
      recipient.longitude == null
    ) {
      return res.status(400).json({
        success: false,
        message: "Koordinat lokasi pickup dan tujuan wajib valid.",
      });
    }
    if (!pkg?.name || !pkg?.category) {
      return res.status(400).json({
        success: false,
        message: "Detail barang (nama dan kategori) wajib diisi.",
      });
    }

    // Safety checks for prohibited cargo
    const prohibitedCheck = isProhibitedItem(pkg.name, pkg.notes);
    if (prohibitedCheck.prohibited) {
      return res.status(400).json({
        success: false,
        message: `Barang terlarang tidak dapat dikirim melalui GEOVERSE: ${prohibitedCheck.keyword}.`,
      });
    }

    // Server-side calculated fare breakdown
    const breakdown = await computeSendFare({
      pickup: sender,
      destination: recipient,
      packageData: pkg,
      discount,
    });

    if (!breakdown.withinServiceRadius) {
      return res.status(400).json({
        success: false,
        message: breakdown.radiusValidation?.message || "Rute pengiriman melebihi batas radius maksimal 15 km.",
        radiusValidation: breakdown.radiusValidation,
      });
    }

    // Generate cryptographically secure Pickup Code and Delivery OTP
    const pickupRaw = generateSixDigitCode();
    const deliveryRaw = generateSixDigitCode();

    const { hash: pickupCodeHash, salt: pickupCodeSalt } = hashCode(pickupRaw);
    const { hash: deliveryOtpHash, salt: deliveryOtpSalt } = hashCode(deliveryRaw);

    const orderCode = `RNG-SEND-${Date.now().toString().slice(-8)}`;

    const VALID_CATEGORIES = [
      "Dokumen",
      "Makanan",
      "Pakaian",
      "Elektronik",
      "Barang rumah tangga",
      "Paket kecil",
      "Paket besar",
      "Barang mudah pecah",
      "Lainnya",
    ];
    const safeCategory = VALID_CATEGORIES.includes(pkg.category) ? pkg.category : "Lainnya";

    const isCash =
      paymentMethod === "CASH" ||
      paymentMethod === "Bayar Tunai" ||
      paymentMethod === "TUNAI" ||
      String(paymentMethod).toLowerCase() === "cod";

    const requestedPoints = Math.max(0, Math.round(Number(req.body.pointsUsed) || Number(req.body.pointDiscount) || 0));
    const pointWalletService = require("../features/geoversePoint/services/pointWalletService");

    const quote = await pointWalletService.calculatePaymentQuote({
      service: "KANYAAH_SEND",
      grossAmount: breakdown.finalFare,
      voucherDiscount: 0,
      requestedPoints,
      userId: customerId,
    });

    let debitedPoints = 0;
    if (quote.approvedPoints > 0 && customerId) {
      await pointWalletService.debitPoints({
        userId: customerId,
        points: quote.approvedPoints,
        type: "PAYMENT",
        sourceType: "KANYAAH_SEND",
        sourceId: orderCode,
        operationKey: `DEBIT-SEND-${orderCode}`,
        notes: `Pembayaran Kanyaah Send #${orderCode} dengan ${quote.approvedPoints} GEOVERSE Point`,
        actorId: customerId,
      });
      debitedPoints = quote.approvedPoints;
    }

    try {
      const finalPayableFare = quote.finalAmount;

      const initialStatus = "SEARCHING_DRIVER";
      const initialPaymentStatus = finalPayableFare === 0 ? "PAID" : isCash ? "CASH_PENDING" : "PENDING";
      const resolvedPaymentMethod =
        finalPayableFare === 0
          ? "GEOVERSE_POINT"
          : quote.approvedPoints > 0
          ? isCash
            ? "GEOVERSE_POINT_PLUS_CASH"
            : "GEOVERSE_POINT_PLUS_QRIS"
          : paymentMethod;

      const newOrder = await SendOrder.create({
        orderCode,
        serviceType: "KANYAAH_SEND",
        orderType: "KANYAAH_SEND",
        customerId,
        sender: {
          name: sender.name,
          phone: sender.phone,
          address: sender.address,
          latitude: sender.latitude,
          longitude: sender.longitude,
          notes: sender.notes || "",
          locationInstruction: sender.locationInstruction || "",
        },
        recipient: {
          name: recipient.name,
          phone: recipient.phone,
          address: recipient.address,
          latitude: recipient.latitude,
          longitude: recipient.longitude,
          notes: recipient.notes || "",
          preferredDeliveryTime: recipient.preferredDeliveryTime || "",
        },
        package: {
          name: pkg.name,
          category: safeCategory,
          quantity: Math.max(1, Number(pkg.quantity) || 1),
          weightKg: Math.max(0.1, Number(pkg.weightKg) || 1),
          lengthCm: Math.max(1, Number(pkg.lengthCm) || 10),
          widthCm: Math.max(1, Number(pkg.widthCm) || 10),
          heightCm: Math.max(1, Number(pkg.heightCm) || 10),
          fragile: Boolean(pkg.fragile),
          specialHandling: Boolean(pkg.specialHandling),
          declaredValue: Math.max(0, Number(pkg.declaredValue) || 0),
          photoUrls: Array.isArray(pkg.photoUrls)
            ? pkg.photoUrls
                .map((p) => (typeof p === "string" ? p : p?.data?.url || p?.url || p?.viewUrl || ""))
                .filter(Boolean)
            : [],
          notes: pkg.notes || "",
        },
        pricing: {
          baseFare: breakdown.baseFare,
          distanceFare: breakdown.distanceFare,
          weightFare: breakdown.weightFare,
          sizeFare: breakdown.sizeFare,
          serviceFee: breakdown.serviceFee,
          insuranceFee: breakdown.insuranceFee,
          discount: breakdown.discount,
          pointDiscount: quote.pointDiscount,
          pointsUsed: quote.approvedPoints,
          pointRate: quote.pointRate,
          estimatedFare: breakdown.estimatedFare,
          finalFare: finalPayableFare,
          totalAmount: finalPayableFare,
          driverEarnings: breakdown.driverEarnings,
        },
        totalAmount: finalPayableFare,
        pointDiscount: quote.pointDiscount,
        pointsUsed: quote.approvedPoints,
        pointRate: quote.pointRate,
        grossAmount: breakdown.finalFare,
        finalAmount: finalPayableFare,
        distanceKm: breakdown.distanceKm,
        estimatedDurationMinutes: breakdown.estimatedDurationMinutes,
        paymentMethod: resolvedPaymentMethod,
        paymentStatus: initialPaymentStatus,
        pickupCodeHash,
        pickupCodeSalt,
        deliveryOtpHash,
        deliveryOtpSalt,
        status: initialStatus,
        idempotencyKey: idempotencyKey || undefined,
        statusHistory: [
          {
            status: "CREATED",
            actorId: customerId,
            actorRole: "customer",
            note: "Pesanan pengiriman barang berhasil dibuat oleh customer.",
            createdAt: new Date(),
          },
        ],
      });

      let paymentData = null;

      // If online payment (QRIS / VA) and payable amount > 0, create Payment gateway intent
      if (!isCash && finalPayableFare > 0) {
        try {
          const customer = await User.findById(customerId).lean();
          const gatewayResult = await paymentGateway.createPayment({
            orderId: String(newOrder._id),
            orderCode: newOrder.orderCode,
            orderType: "KANYAAH_SEND",
            orderCategory: "DELIVERY",
            customerId: String(customerId),
            customerName: customer?.name || sender.name,
            customerPhone: customer?.phone || sender.phone,
            amount: finalPayableFare,
            paymentMethod: resolvedPaymentMethod,
          });

          const paymentRecord = await Payment.create({
            paymentId: gatewayResult.paymentId,
            orderId: String(newOrder._id),
            orderCode: newOrder.orderCode,
            orderType: "KANYAAH_SEND",
            orderCategory: "DELIVERY",
            customerId: String(customerId),
            customerName: customer?.name || sender.name,
            customerPhone: customer?.phone || sender.phone,
            amount: finalPayableFare,
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

          paymentData = paymentRecord;
        } catch (payErr) {
          console.warn("⚠️ Failed to auto-generate payment session:", payErr.message);
        }
      }

      // Immediately broadcast to all active drivers in real time
      if (req.io) {
        req.io.emit("send:order_available", newOrder);
      }

      const sanitizedOrder = newOrder.toObject();
      // Provide pickupCode to the customer on order creation
      sanitizedOrder.pickupCode = pickupRaw;

      return res.status(201).json({
        success: true,
        message:
          finalPayableFare === 0
            ? "Pesanan pengiriman lunas menggunakan GEOVERSE Point! Menghubungkan ke driver..."
            : isCash
            ? "Pesanan pengiriman berhasil dibuat! Menghubungkan ke driver..."
            : "Pesanan pengiriman dibuat. Silakan selesaikan pembayaran.",
        data: sanitizedOrder,
        payment: paymentData,
      });
    } catch (orderCreateError) {
      if (debitedPoints > 0) {
        await pointWalletService.reversePoints({
          userId: customerId,
          points: debitedPoints,
          sourceType: "KANYAAH_SEND",
          sourceId: orderCode,
          reversalKey: `ROLLBACK-SEND-${orderCode}`,
          notes: `Rollback pembuatan order Send #${orderCode}`,
          actorId: customerId,
        }).catch((rbErr) => console.error("Failed to rollback send points:", rbErr));
      }
      throw orderCreateError;
    }
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat pesanan pengiriman.",
      error: error.message,
    });
  }
};

/**
 * 3. Customer: Get Own Orders (GET /api/send/orders/customer/:customerId)
 */
const getCustomerOrders = async (req, res) => {
  try {
    const requesterId = String(req.authUser._id);
    const targetCustomerId = String(req.params.customerId);

    // Enforce ownership: customer can only read their own orders (admin can view any)
    if (requesterId !== targetCustomerId && req.authUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin melihat daftar pesanan pengguna ini.",
      });
    }

    const { status, limit = 20, page = 1 } = req.query;
    const query = { customerId: targetCustomerId };
    if (status) query.status = status;

    const orders = await SendOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("driverId", "name phone profilePhoto rating")
      .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash")
      .lean();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("getCustomerOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar order pengiriman." });
  }
};

/**
 * 4. Get Send Order Detail & Tracking (GET /api/send/orders/:id)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = String(req.authUser?._id || resolveDriverId(req) || "");
    const requesterRole = req.authUser?.role || "";

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await SendOrder.findById(id)
        .populate("driverId", "name phone profilePhoto rating roleData")
        .populate("customerId", "name phone profilePhoto")
        .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash")
        .lean()
        .catch(() => null);
    }
    if (!order) {
      order = await SendOrder.findOne({ orderCode: id })
        .populate("driverId", "name phone profilePhoto rating roleData")
        .populate("customerId", "name phone profilePhoto")
        .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash")
        .lean()
        .catch(() => null);
    }
    if (!order && String(id).startsWith("#")) {
      order = await SendOrder.findOne({ orderCode: String(id).replace(/^#/, "") })
        .populate("driverId", "name phone profilePhoto rating roleData")
        .populate("customerId", "name phone profilePhoto")
        .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash")
        .lean()
        .catch(() => null);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan pengiriman tidak ditemukan." });
    }

    const isCustomer = order.customerId && String(order.customerId._id || order.customerId) === requesterId;
    const isDriver = order.driverId && String(order.driverId._id || order.driverId) === requesterId;
    const isAdmin = requesterRole === "admin" || requesterRole === "superadmin";

    // Non-customers / non-admins must never see pickup code beforehand
    if (!isCustomer && !isAdmin) {
      delete order.pickupCodeRaw;
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("getOrderById error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil detail order." });
  }
};

/**
 * 5. Driver: Get Available Orders (GET /api/send/orders/available)
 */

/**
 * 5. Driver: Get Available Orders (GET /api/send/orders/available)
 */
const getAvailableOrders = async (req, res) => {
  try {
    const driverId = resolveDriverId(req);

    const filter = {
      $or: [
        {
          status: { $in: ["SEARCHING_DRIVER", "PAYMENT_PENDING", "CREATED"] },
          driverId: null,
          ...(driverId ? { declinedByDrivers: { $nin: [driverId] } } : {}),
        },
        ...(driverId ? [{ driverId }] : []),
      ],
    };

    const availableOrders = await SendOrder.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(50)
      .populate("customerId", "name phone profilePhoto")
      .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash -pickupCodeRaw -deliveryOtpRaw")
      .lean();

    return res.status(200).json({
      success: true,
      data: availableOrders,
    });
  } catch (error) {
    console.error("getAvailableOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat order pengiriman yang tersedia." });
  }
};

/**
 * 6. Driver: Get Driver Active & Past Orders (GET /api/send/orders/driver)
 */
const getDriverOrders = async (req, res) => {
  try {
    const driverId = resolveDriverId(req);
    const { status, limit = 20 } = req.query;

    const filter = { driverId };
    if (status) filter.status = status;

    const orders = await SendOrder.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(Number(limit) || 50)
      .populate("customerId", "name phone profilePhoto")
      .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash -pickupCodeRaw -deliveryOtpRaw")
      .lean();

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("getDriverOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat riwayat order driver." });
  }
};

/**
 * 7. Driver: Accept Order Atomic Lock (POST /api/send/orders/:id/accept)
 */
const acceptOrder = async (req, res) => {
  try {
    const driverId = resolveDriverId(req);
    if (!driverId) {
      return res.status(401).json({ success: false, message: "Driver ID diperlukan." });
    }

    const driver = req.authUser || await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Data driver tidak ditemukan." });
    }

    // Operational Driver Compliance Check (UU LLAJ & Safety Verification)
    const { validateDriverOperationalStatus } = require("../services/documentMatrixService");
    const opStatus = validateDriverOperationalStatus(driver);
    if (!opStatus.isOperational) {
      return res.status(403).json({
        success: false,
        message: opStatus.reason,
        isTrainee: opStatus.isTrainee,
        missingOrPending: opStatus.missingOrPending,
      });
    }

    // Atomic find and update: only wins if status is SEARCHING_DRIVER and driverId is null
    const order = await SendOrder.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "SEARCHING_DRIVER",
        driverId: null,
      },
      {
        $set: {
          driverId,
          status: "DRIVER_ASSIGNED",
        },
        $push: {
          statusHistory: {
            status: "DRIVER_ASSIGNED",
            actorId: driverId,
            actorRole: "driver",
            note: `Order diterima oleh driver ${driver.name}.`,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("customerId", "name phone profilePhoto")
      .populate("driverId", "name phone profilePhoto rating roleData");

    if (!order) {
      return res.status(409).json({
        success: false,
        message: "Order sudah diambil oleh driver lain atau telah dibatalkan.",
      });
    }

    // Dynamic driver revenue split (100% Kedai Terpadu vs 80% Driver Baru)
    try {
      const deliveryFare = (order.pricing?.distanceFare || 0) + (order.pricing?.weightFare || 0);
      const revenueSplit = calculateDriverRevenueSplit(deliveryFare || Math.max(0, (order.pricing?.estimatedFare || 10000) - 2000), driver);
      if (order.pricing) {
        order.pricing.driverEarnings = revenueSplit.driverEarnings;
      }
      order.driverEarnings = revenueSplit.driverEarnings;
      await order.save();
    } catch (splitErr) {
      console.warn("sendOrder split update error:", splitErr);
    }

    // Notify customer
    await Notification.create({
      userId: order.customerId._id || order.customerId,
      title: "Driver Ditemukan!",
      message: `Driver ${driver.name} telah menerima pesanan pengiriman barang Anda.`,
      type: "order_status",
      relatedId: order._id,
    }).catch(() => {});

    // Socket broadcasts
    emitToSendRoom(req.io, order._id, "send:driver_assigned", order);
    emitToUser(req.io, order.customerId._id || order.customerId, "send:driver_assigned", order);
    emitToDriver(req.io, driverId, "send:driver_assigned", order);
    if (req.io) {
      req.io.emit("send:driver_assigned", order);
      req.io.emit("send:status_updated", order);
    }

    return res.status(200).json({
      success: true,
      message: "Order berhasil diterima.",
      data: order,
    });
  } catch (error) {
    console.error("acceptOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menerima order." });
  }
};

/**
 * 8. Driver: Decline Order (POST /api/send/orders/:id/decline)
 */
const declineOrder = async (req, res) => {
  try {
    const driverId = resolveDriverId(req);
    if (!driverId) {
      return res.status(400).json({ success: false, message: "Driver ID tidak valid." });
    }

    const updated = await SendOrder.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { declinedByDrivers: driverId } },
      { new: true }
    );

    if (req.io) {
      req.io.emit("send:declined", { orderId: req.params.id, driverId });
    }

    return res.status(200).json({ success: true, message: "Order diabaikan.", data: updated });
  } catch (error) {
    console.error("declineOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menolak order." });
  }
};

/**
 * 9. Driver: Update Driver Live GPS Location (PUT /api/send/orders/:id/location)
 */
const updateDriverLocation = async (req, res) => {
  try {
    const driverId = String(req.authUser._id);
    const { latitude, longitude, heading, speed } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "Koordinat latitude & longitude wajib diisi." });
    }

    const order = await findSendOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    // Ownership check: only assigned driver or admin can broadcast driver coordinates
    if (String(order.driverId) !== driverId && req.authUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Hanya driver yang ditugaskan yang dapat memperbarui lokasi pengantaran.",
      });
    }

    order.driverLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading != null ? Number(heading) : null,
      speed: speed != null ? Number(speed) : null,
      updatedAt: new Date(),
    };
    await order.save();

    const payload = {
      orderId: order._id,
      latitude,
      longitude,
      heading,
      speed,
      updatedAt: new Date(),
    };
    emitToSendRoom(req.io, order._id, "send:driver_location_updated", payload);

    return res.status(200).json({
      success: true,
      message: "Lokasi berhasil diperbarui.",
      data: order.driverLocation,
    });
  } catch (error) {
    console.error("updateDriverLocation error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui lokasi driver." });
  }
};

/**
 * 10. Driver: Verify Pickup with Pickup Code (POST /api/send/orders/:id/verify-pickup)
 */
const verifyPickup = async (req, res) => {
  try {
    const driverId = String(req.authUser._id);
    const { pickupCode, proofPhotoUrl } = req.body;

    if (!pickupCode) {
      return res.status(400).json({ success: false, message: "Kode pickup wajib dimasukkan." });
    }

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    // Ownership check
    if (String(order.driverId) !== driverId && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Anda bukan driver yang ditugaskan pada order ini." });
    }

    // Status guard
    if (["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DESTINATION", "DELIVERY_VERIFICATION", "DELIVERED", "COMPLETED"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Penjemputan sudah diverifikasi sebelumnya." });
    }

    // Rate-limit check: max 5 failed attempts
    if (order.pickupAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Batas percobaan kode pickup tercapai (Maks 5x). Hubungi customer service.",
      });
    }

    const isMatch = verifyCode(pickupCode, order.pickupCodeHash, order.pickupCodeSalt);

    if (!isMatch) {
      order.pickupAttempts += 1;
      await order.save();
      return res.status(400).json({
        success: false,
        message: `Kode pickup salah. Percobaan tersisa: ${5 - order.pickupAttempts}.`,
      });
    }

    // Pickup verified successfully
    order.status = "PICKED_UP";
    order.pickedUpAt = new Date();
    if (proofPhotoUrl) {
      order.pickupProofUrls.push(proofPhotoUrl);
    }
    order.statusHistory.push({
      status: "PICKED_UP",
      actorId: order.driverId,
      actorRole: "driver",
      note: "Paket berhasil diverifikasi & diambil oleh driver dari pengirim.",
      createdAt: new Date(),
    });

    await order.save();

    // Notify customer
    await Notification.create({
      userId: order.customerId,
      title: "Paket Telah Diambil!",
      message: `Driver telah memverifikasi kode pickup dan mengambil paket '${order.package.name}'.`,
      type: "order_status",
      relatedId: order._id,
    }).catch(() => {});

    emitToSendRoom(req.io, order._id, "send:pickup_verified", order);
    emitToSendRoom(req.io, order._id, "send:package_picked_up", order);
    emitToSendRoom(req.io, order._id, "send:status_updated", order);
    emitToUser(req.io, order.customerId, "send:pickup_verified", order);
    emitToUser(req.io, order.customerId, "send:status_updated", order);
    if (req.io) {
      req.io.emit("send:pickup_verified", order);
      req.io.emit("send:status_updated", order);
      req.io.emit("order_status_updated", order);
    }

    return res.status(200).json({
      success: true,
      message: "Verifikasi pickup berhasil! Barang telah diambil.",
      data: order,
    });
  } catch (error) {
    console.error("verifyPickup error:", error);
    return res.status(500).json({ success: false, message: "Gagal memverifikasi pickup." });
  }
};

/**
 * 11. Driver: Verify Delivery with OTP & Proof (POST /api/send/orders/:id/verify-delivery)
 */
const verifyDelivery = async (req, res) => {
  try {
    const driverId = String(req.authUser._id);
    const { deliveryOtp, deliveryProofUrl } = req.body;

    if (!deliveryOtp) {
      return res.status(400).json({ success: false, message: "Kode OTP penerima wajib dimasukkan." });
    }

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    // Ownership check
    if (String(order.driverId) !== driverId && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Anda bukan driver yang ditugaskan pada order ini." });
    }

    // Guard against duplicate delivery completion
    if (order.status === "DELIVERED" || order.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Pengantaran pesanan ini sudah diverifikasi selesai sebelumnya.",
      });
    }

    if (order.deliveryOtpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Batas percobaan OTP penerima tercapai (Maks 5x). Hubungi admin.",
      });
    }

    const isMatch = verifyCode(deliveryOtp, order.deliveryOtpHash, order.deliveryOtpSalt);

    if (!isMatch) {
      order.deliveryOtpAttempts += 1;
      await order.save();
      return res.status(400).json({
        success: false,
        message: `Kode OTP delivery salah. Percobaan tersisa: ${5 - order.deliveryOtpAttempts}.`,
      });
    }

    // Delivery verified
    order.status = "COMPLETED";
    order.deliveredAt = new Date();
    order.completedAt = new Date();
    if (order.paymentMethod === "CASH" || order.paymentMethod === "Bayar Tunai" || order.paymentMethod === "TUNAI" || String(order.paymentMethod).toLowerCase() === "cod") {
      order.paymentStatus = "PAID";
    }

    if (deliveryProofUrl) {
      order.deliveryProofUrls.push(deliveryProofUrl);
    }
    order.statusHistory.push({
      status: "DELIVERED",
      actorId: order.driverId,
      actorRole: "driver",
      note: `Paket diserahkan kepada penerima (${order.recipient.name}) dengan verifikasi OTP.`,
      createdAt: new Date(),
    });
    order.statusHistory.push({
      status: "COMPLETED",
      actorId: order.driverId,
      actorRole: "system",
      note: "Pesanan pengiriman selesai secara penuh.",
      createdAt: new Date(),
    });

    // Calculate and save revenue split snapshot
    try {
      const { createRevenueSplitSnapshot } = require("../services/pricingPolicyService");
      let driverObj = null;
      if (order.driverId) {
        driverObj = await User.findById(order.driverId).lean();
      }
      const deliveryFare = (order.pricing?.distanceFare || 0) + (order.pricing?.weightFare || 0);
      const splitSnapshot = createRevenueSplitSnapshot(
        deliveryFare || Math.max(0, (order.pricing?.estimatedFare || 10000) - 2000),
        driverObj
      );
      if (order.pricing) {
        order.pricing.revenueSplitSnapshot = splitSnapshot;
        order.pricing.driverEarnings = splitSnapshot.driverEarnings;
      }
      order.revenueSplitSnapshot = splitSnapshot;
      order.driverEarnings = splitSnapshot.driverEarnings;
    } catch (splitSnapErr) {
      console.warn("sendOrder split snapshot error:", splitSnapErr.message);
    }

    await order.save();

    // Credit driver earnings once
    if (order.driverId && order.pricing?.driverEarnings > 0) {
      await User.findByIdAndUpdate(order.driverId, {
        $inc: { "roleData.balance": order.pricing.driverEarnings },
      }).catch(() => {});
    }

    // Award loyalty cashback points (1% of shipping cost, min 1 point) - exactly once
    const sendAmount = order.pricing?.totalPrice || order.totalAmount || 0;
    if (sendAmount > 0 && order.customerId && !order.cashbackIssued) {
      try {
        const pointWalletService = require("../features/geoversePoint/services/pointWalletService");
        const rewardPoints = Math.max(1, Math.round(sendAmount * 0.01));
        await pointWalletService.creditPoints({
          userId: order.customerId,
          points: rewardPoints,
          sourceType: "KANYAAH_SEND",
          sourceId: order.orderCode,
          operationKey: `EARN-CASHBACK-SEND-${order.orderCode}`,
          notes: `Cashback 1% pengiriman Kanyaah Send #${order.orderCode}`,
          actorId: order.driverId || order.customerId,
        });
        order.cashbackIssued = true;
        await order.save();
      } catch (pointErr) {
        console.warn("[Kanyaah Point] Send cashback error:", pointErr.message);
      }
    }

    // Notify customer
    await Notification.create({
      userId: order.customerId,
      title: "Paket Berhasil Terkirim!",
      message: `Paket '${order.package.name}' telah diterima oleh ${order.recipient.name}. Berikan rating untuk driver!`,
      type: "order_status",
      relatedId: order._id,
    }).catch(() => {});

    emitToSendRoom(req.io, order._id, "send:delivery_verified", order);
    emitToSendRoom(req.io, order._id, "send:order_completed", order);
    emitToSendRoom(req.io, order._id, "send:status_updated", order);
    emitToUser(req.io, order.customerId, "send:delivery_verified", order);
    emitToUser(req.io, order.customerId, "send:order_completed", order);
    if (req.io) {
      req.io.emit("send:delivery_verified", order);
      req.io.emit("send:order_completed", order);
      req.io.emit("send:status_updated", order);
      req.io.emit("order_status_updated", order);
    }

    return res.status(200).json({
      success: true,
      message: "Verifikasi pengantaran berhasil! Pesanan pengiriman selesai.",
      data: order,
    });
  } catch (error) {
    console.error("verifyDelivery error:", error);
    return res.status(500).json({ success: false, message: "Gagal memverifikasi delivery." });
  }
};

/**
 * 12. Upload Delivery Proof Photo (POST /api/send/orders/:id/delivery-proof)
 */
const uploadDeliveryProof = async (req, res) => {
  try {
    const { proofUrl, stage = "delivery" } = req.body;
    if (!proofUrl) {
      return res.status(400).json({ success: false, message: "URL foto bukti wajib disertakan." });
    }

    let order = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await SendOrder.findById(req.params.id);
    }
    if (!order) {
      order = await SendOrder.findOne({ orderCode: req.params.id });
    }
    if (!order && String(req.params.id).startsWith("#")) {
      order = await SendOrder.findOne({ orderCode: String(req.params.id).replace(/^#/, "") });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    const requesterId = String(req.authUser?._id || resolveDriverId(req) || "");
    const role = req.authUser?.role || "driver";
    if (order.driverId && String(order.driverId) !== requesterId && role !== "admin") {
      return res.status(403).json({ success: false, message: "Hanya driver yang ditugaskan yang dapat mengunggah bukti." });
    }

    if (stage === "pickup") {
      if (!Array.isArray(order.pickupProofUrls)) order.pickupProofUrls = [];
      order.pickupProofUrls.push(proofUrl);
    } else {
      if (!Array.isArray(order.deliveryProofUrls)) order.deliveryProofUrls = [];
      order.deliveryProofUrls.push(proofUrl);
    }

    await order.save();
    emitToSendRoom(req.io, order._id, "send:status_updated", order);
    emitToUser(req.io, order.customerId, "send:status_updated", order);
    if (order.driverId) {
      emitToDriver(req.io, order.driverId, "send:status_updated", order);
    }
    return res.status(200).json({ success: true, message: "Foto bukti berhasil disimpan.", data: order });
  } catch (error) {
    console.error("uploadDeliveryProof error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan foto bukti." });
  }
};

/**
 * 13. Update Order Status (PUT /api/send/orders/:id/status)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, deliveryProofUrl, proofUrl } = req.body;
    const actorId = String(req.authUser?._id || resolveDriverId(req) || "");
    const actorRole = req.authUser?.role || "driver";

    const STATUS_ALIAS_MAP = {
      "Menunggu": "SEARCHING_DRIVER",
      "Siap": "DRIVER_ASSIGNED",
      "Menuju Pickup": "DRIVER_ON_THE_WAY_TO_PICKUP",
      "Sampai Pickup": "DRIVER_ARRIVED_AT_PICKUP",
      "Mengantar": "IN_TRANSIT",
      "Selesai": "COMPLETED",
      "Dibatalkan": "CANCELLED",
    };
    const targetStatus = STATUS_ALIAS_MAP[status] || status;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await SendOrder.findById(req.params.id);
    }
    if (!order) {
      order = await SendOrder.findOne({ orderCode: req.params.id });
    }
    if (!order && String(req.params.id).startsWith("#")) {
      order = await SendOrder.findOne({ orderCode: String(req.params.id).replace(/^#/, "") });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    const isCustomer = String(order.customerId) === actorId;
    const isDriver = String(order.driverId) === actorId || !order.driverId;
    const isAdmin = actorRole === "admin";

    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({ success: false, message: "Anda tidak berwenang mengubah status pesanan ini." });
    }

    // State machine check
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(targetStatus) && order.status !== targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Transisi status tidak valid dari '${order.status}' ke '${targetStatus}'.`,
      });
    }

    order.status = targetStatus;
    const finalProofUrl = deliveryProofUrl || proofUrl;
    if (finalProofUrl) {
      if (!Array.isArray(order.deliveryProofUrls)) {
        order.deliveryProofUrls = [];
      }
      if (!order.deliveryProofUrls.includes(finalProofUrl)) {
        order.deliveryProofUrls.push(finalProofUrl);
      }
    }
    if (targetStatus === "COMPLETED" || targetStatus === "DELIVERED") {
      order.deliveredAt = order.deliveredAt || new Date();
      order.completedAt = order.completedAt || new Date();
      if (
        order.paymentMethod === "CASH" ||
        order.paymentMethod === "Bayar Tunai" ||
        order.paymentMethod === "TUNAI" ||
        String(order.paymentMethod).toLowerCase() === "cod"
      ) {
        order.paymentStatus = "PAID";
      }
      if (order.driverId && order.pricing?.driverEarnings > 0) {
        await User.findByIdAndUpdate(order.driverId, {
          $inc: { "roleData.balance": order.pricing.driverEarnings },
        }).catch(() => {});
      }
      await Notification.create({
        userId: order.customerId,
        title: "Paket Berhasil Terkirim!",
        message: `Paket '${order.package.name}' telah tiba di tujuan. Silakan berikan rating untuk driver!`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => {});

      // Award loyalty cashback points (1% of shipping cost, min 1 point) - exactly once
      const sendAmount = order.pricing?.totalPrice || order.totalAmount || 0;
      if (sendAmount > 0 && order.customerId && !order.cashbackIssued) {
        try {
          const pointWalletService = require("../features/geoversePoint/services/pointWalletService");
          const rewardPoints = Math.max(1, Math.round(sendAmount * 0.01));
          await pointWalletService.creditPoints({
            userId: order.customerId,
            points: rewardPoints,
            sourceType: "KANYAAH_SEND",
            sourceId: order.orderCode,
            operationKey: `EARN-CASHBACK-SEND-${order.orderCode}`,
            notes: `Cashback 1% pengiriman Kanyaah Send #${order.orderCode}`,
            actorId: order.driverId || order.customerId,
          });
          order.cashbackIssued = true;
          await order.save();
        } catch (pointErr) {
          console.warn("[Kanyaah Point] Send cashback error:", pointErr.message);
        }
      }
    }

    order.statusHistory.push({
      status: targetStatus,
      actorId: actorId || order.driverId,
      actorRole,
      note: note || `Status diperbarui menjadi ${targetStatus}.`,
      createdAt: new Date(),
    });

    await order.save();

    emitToSendRoom(req.io, order._id, "send:status_updated", order);
    emitToUser(req.io, order.customerId, "send:status_updated", order);
    if (order.driverId) {
      emitToDriver(req.io, order.driverId, "send:status_updated", order);
    }
    if (req.io) {
      req.io.emit("send:status_updated", order);
      req.io.emit("order_status_updated", order);
    }
    if (targetStatus === "COMPLETED" || targetStatus === "DELIVERED") {
      emitToSendRoom(req.io, order._id, "send:order_completed", order);
      emitToUser(req.io, order.customerId, "send:order_completed", order);
      if (req.io) {
        req.io.emit("send:order_completed", order);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Status order berhasil diperbarui ke ${targetStatus}.`,
      data: order,
    });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status order." });
  }
};

/**
 * 14. Cancel Order (POST /api/send/orders/:id/cancel)
 */
const cancelOrder = async (req, res) => {
  try {
    const requesterId = String(req.authUser._id);
    const { reason = "Dibatalkan oleh pengguna" } = req.body;

    const order = await findSendOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    const isCustomer = String(order.customerId) === requesterId;
    const isDriver = String(order.driverId) === requesterId;
    const isAdmin = req.authUser.role === "admin";

    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({ success: false, message: "Anda tidak berwenang membatalkan pesanan ini." });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Pesanan pengiriman sudah dibatalkan sebelumnya." });
    }
    if (order.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Pesanan yang sudah selesai tidak dapat dibatalkan." });
    }

    // Customer can only cancel if not picked up
    if (isCustomer && !isAdmin && ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DESTINATION", "DELIVERED", "COMPLETED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Pesanan yang sudah diambil driver tidak dapat dibatalkan.",
      });
    }

    order.status = "CANCELLED";
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    order.statusHistory.push({
      status: "CANCELLED",
      actorId: requesterId,
      actorRole: req.authUser.role,
      note: `Pesanan dibatalkan: ${reason}`,
      createdAt: new Date(),
    });

    await order.save();

    // Reversal of debited GEOVERSE Points if order was discounted with points (idempotent, max 1 time)
    const refundedPoints = order.pricing?.pointsUsed || order.pricing?.pointDiscount || order.pointsUsed || order.pointDiscount || 0;
    if (refundedPoints > 0 && order.customerId && !order.pointRefunded) {
      order.pointRefunded = true;
      order.reversalIdempotencyKey = `REV-SEND-${order.orderCode}`;
      await order.save();
      try {
        const pointWalletService = require("../features/geoversePoint/services/pointWalletService");
        await pointWalletService.reversePoints({
          userId: order.customerId,
          points: refundedPoints,
          sourceType: "KANYAAH_SEND",
          sourceId: order.orderCode,
          reversalKey: `REV-SEND-${order.orderCode}`,
          notes: `Pengembalian ${refundedPoints} poin karena pembatalan Kanyaah Send #${order.orderCode}`,
          actorId: requesterId,
        });
      } catch (revErr) {
        console.error("Error reversing send points on cancel:", revErr);
      }
    }

    emitToSendRoom(req.io, order._id, "send:order_cancelled", order);
    emitToUser(req.io, order.customerId, "send:order_cancelled", order);
    if (order.driverId) {
      emitToDriver(req.io, order.driverId, "send:order_cancelled", order);
    }

    return res.status(200).json({
      success: true,
      message: "Pesanan pengiriman berhasil dibatalkan.",
      data: order,
    });
  } catch (error) {
    console.error("cancelOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal membatalkan order." });
  }
};

/**
 * 15. Submit Rating (POST /api/send/orders/:id/rating)
 */
const submitRating = async (req, res) => {
  try {
    const customerId = String(req.authUser._id);
    const { score, review = "" } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: "Rating wajib bernilai antara 1 sampai 5 bintang." });
    }

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    // Ownership check: only customer can rate
    if (String(order.customerId) !== customerId && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Hanya pemesan yang dapat memberikan rating." });
    }

    order.rating = {
      score: Number(score),
      review: String(review || "").trim(),
      createdAt: new Date(),
    };
    await order.save();

    // Recalculate driver average rating if driver exists
    if (order.driverId) {
      const ratedOrders = await SendOrder.find({
        driverId: order.driverId,
        "rating.score": { $exists: true, $ne: null },
      }).select("rating.score").lean();

      if (ratedOrders.length > 0) {
        const avg = ratedOrders.reduce((sum, r) => sum + (r.rating?.score || 5), 0) / ratedOrders.length;
        const roundedAvg = Math.round(avg * 10) / 10;
        await User.findByIdAndUpdate(order.driverId, {
          driverRating: roundedAvg,
          driverRatingCount: ratedOrders.length,
          "roleData.rating": roundedAvg,
        }).catch(() => {});
      }

      // Notify driver about new customer rating
      await Notification.create({
        userId: order.driverId,
        title: "Penilaian Pengiriman Baru ⭐",
        message: `Pelanggan memberikan rating ${score} bintang${review ? `: "${review}"` : " untuk pengiriman Anda"}.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => {});

      // Emit real-time updates to driver
      emitToUser(req.io, order.driverId, "notification:new", { relatedId: String(order._id), type: "order_status" });
      emitToUser(req.io, order.driverId, "send:status_updated", order);
      emitToUser(req.io, order.driverId, "order_status_updated", order);
      emitToDriver(req.io, order.driverId, "send:status_updated", order);
      emitToDriver(req.io, order.driverId, "order_status_updated", order);
    }

    emitToSendRoom(req.io, order._id, "send:status_updated", order);
    if (req.io) {
      req.io.emit("send:status_updated", order);
      req.io.emit("order_status_updated", order);
    }

    return res.status(200).json({
      success: true,
      message: "Terima kasih atas ulasan dan rating yang Anda berikan!",
      data: order.rating,
    });
  } catch (error) {
    console.error("submitRating error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan rating." });
  }
};

/**
 * 16. Submit Complaint (POST /api/send/orders/:id/complaints)
 */
const submitComplaint = async (req, res) => {
  try {
    const customerId = String(req.authUser._id);
    const { category, description, attachments = [] } = req.body;

    if (!category || !description) {
      return res.status(400).json({ success: false, message: "Kategori dan deskripsi keluhan wajib diisi." });
    }

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    if (String(order.customerId) !== customerId && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Hanya pemilik pesanan yang dapat mengajukan komplain." });
    }

    const ticketId = `TKT-SEND-${Date.now().toString().slice(-6)}`;

    const complaint = await SendComplaint.create({
      ticketId,
      orderId: order._id,
      customerId,
      driverId: order.driverId || null,
      category,
      description,
      attachments,
      status: "OPEN",
    });

    order.status = "DISPUTED";
    order.statusHistory.push({
      status: "DISPUTED",
      actorId: customerId,
      actorRole: "customer",
      note: `Komplain diajukan (${ticketId}): ${category}.`,
      createdAt: new Date(),
    });
    await order.save();

    return res.status(201).json({
      success: true,
      message: `Tiket komplain ${ticketId} berhasil dibuat. Tim kami akan segera menindaklanjuti.`,
      data: complaint,
    });
  } catch (error) {
    console.error("submitComplaint error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengajukan komplain." });
  }
};

/**
 * 17. Admin: Get all send orders (GET /api/admin/send/orders)
 */
const adminGetOrders = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;

    const orders = await SendOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("customerId", "name phone email")
      .populate("driverId", "name phone")
      .lean();

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("adminGetOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat laporan admin." });
  }
};

/**
 * 18. Admin: Update Pricing Config (PUT /api/admin/send/pricing)
 */
const adminUpdatePricing = async (req, res) => {
  try {
    const updated = await SendPricingConfig.findOneAndUpdate(
      { configKey: "DEFAULT_SEND_CONFIG" },
      { $set: req.body },
      { new: true, upsert: true }
    );
    return res.status(200).json({ success: true, message: "Konfigurasi tarif berhasil diperbarui.", data: updated });
  } catch (error) {
    console.error("adminUpdatePricing error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui tarif admin." });
  }
};

module.exports = {
  estimateFare,
  createOrder,
  getCustomerOrders,
  getOrderById,
  getAvailableOrders,
  getDriverOrders,
  acceptOrder,
  declineOrder,
  updateDriverLocation,
  verifyPickup,
  verifyDelivery,
  uploadDeliveryProof,
  updateOrderStatus,
  cancelOrder,
  submitRating,
  submitComplaint,
  adminGetOrders,
  adminUpdatePricing,
};
