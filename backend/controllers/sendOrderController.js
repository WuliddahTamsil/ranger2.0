const mongoose = require("mongoose");
const SendOrder = require("../models/SendOrder");
const SendComplaint = require("../models/SendComplaint");
const SendPricingConfig = require("../models/SendPricingConfig");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { computeSendFare, isProhibitedItem, getPricingConfig } = require("../services/sendFareService");
const { generateSixDigitCode, hashCode, verifyCode } = require("../utils/sendSecurity");
const paymentGateway = require("../services/paymentGateway");

const emitToSendRoom = (io, orderId, event, payload) => {
  if (io && orderId) {
    io.to(`send:${String(orderId)}`).emit(event, payload);
  }
};

const emitToUser = (io, userId, event, payload) => {
  if (io && userId) {
    io.to(`user:${String(userId)}`).emit(event, payload);
  }
};

const emitToDriver = (io, driverId, event, payload) => {
  if (io && driverId) {
    io.to(`driver:${String(driverId)}`).emit(event, payload);
  }
};

// Valid Order Lifecycle Transitions
const VALID_TRANSITIONS = {
  CREATED: ["PAYMENT_PENDING", "SEARCHING_DRIVER", "CANCELLED"],
  PAYMENT_PENDING: ["SEARCHING_DRIVER", "CANCELLED"],
  SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["DRIVER_ON_THE_WAY_TO_PICKUP", "CANCELLED", "SEARCHING_DRIVER"],
  DRIVER_ON_THE_WAY_TO_PICKUP: ["DRIVER_ARRIVED_AT_PICKUP", "CANCELLED"],
  DRIVER_ARRIVED_AT_PICKUP: ["PICKUP_VERIFICATION", "CANCELLED"],
  PICKUP_VERIFICATION: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "RETURN_REQUESTED"],
  IN_TRANSIT: ["ARRIVED_AT_DESTINATION", "RETURN_REQUESTED"],
  ARRIVED_AT_DESTINATION: ["DELIVERY_VERIFICATION", "RETURN_REQUESTED"],
  DELIVERY_VERIFICATION: ["DELIVERED", "RETURN_REQUESTED"],
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

    const initialStatus = isCash ? "SEARCHING_DRIVER" : "PAYMENT_PENDING";
    const initialPaymentStatus = isCash ? "CASH_PENDING" : "PENDING";

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
        photoUrls: Array.isArray(pkg.photoUrls) ? pkg.photoUrls : [],
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
        estimatedFare: breakdown.estimatedFare,
        finalFare: breakdown.finalFare,
        driverEarnings: breakdown.driverEarnings,
      },
      distanceKm: breakdown.distanceKm,
      estimatedDurationMinutes: breakdown.estimatedDurationMinutes,
      paymentMethod,
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

    // If online payment (QRIS / VA), create Payment gateway intent
    if (!isCash) {
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
          amount: breakdown.finalFare,
          paymentMethod,
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
          amount: breakdown.finalFare,
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
    } else {
      // If Cash, immediately broadcast to drivers searching
      if (req.io) {
        req.io.emit("send:order_available", newOrder);
      }
    }

    const sanitizedOrder = newOrder.toObject();
    // Provide pickupCode to the customer on order creation
    sanitizedOrder.pickupCode = pickupRaw;

    return res.status(201).json({
      success: true,
      message: isCash
        ? "Pesanan pengiriman berhasil dibuat! Menghubungkan ke driver..."
        : "Pesanan pengiriman dibuat. Silakan selesaikan pembayaran.",
      data: sanitizedOrder,
      payment: paymentData,
    });
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
    const requesterId = String(req.authUser._id);
    const requesterRole = req.authUser.role || "";

    const order = await SendOrder.findById(id)
      .populate("driverId", "name phone profilePhoto rating roleData")
      .populate("customerId", "name phone profilePhoto")
      .select("-pickupCodeSalt -deliveryOtpSalt -deliveryOtpHash")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan pengiriman tidak ditemukan." });
    }

    const isCustomer = order.customerId && String(order.customerId._id || order.customerId) === requesterId;
    const isDriver = order.driverId && String(order.driverId._id || order.driverId) === requesterId;
    const isAdmin = requesterRole === "admin" || requesterRole === "superadmin";

    // Strict ownership verification
    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda bukan pemilik atau driver pesanan ini.",
      });
    }

    // Driver must never see pickup code beforehand; only customer sees it to verify driver
    if (isDriver && !isAdmin) {
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
const getAvailableOrders = async (req, res) => {
  try {
    const driverId = String(req.authUser._id);

    const filter = {
      status: "SEARCHING_DRIVER",
      driverId: null,
      declinedByDrivers: { $ne: driverId },
    };

    const availableOrders = await SendOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
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
    const driverId = String(req.authUser._id);
    const { status, limit = 20 } = req.query;

    const filter = { driverId };
    if (status) filter.status = status;

    const orders = await SendOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
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
    const driverId = String(req.authUser._id);

    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Data driver tidak ditemukan." });
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
    const driverId = String(req.authUser._id);

    await SendOrder.findByIdAndUpdate(req.params.id, {
      $addToSet: { declinedByDrivers: driverId },
    });

    return res.status(200).json({ success: true, message: "Order diabaikan." });
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

    const order = await SendOrder.findById(req.params.id);
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
    emitToUser(req.io, order.customerId, "send:pickup_verified", order);

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

    await order.save();

    // Credit driver earnings once
    if (order.driverId && order.pricing?.driverEarnings > 0) {
      await User.findByIdAndUpdate(order.driverId, {
        $inc: { "roleData.balance": order.pricing.driverEarnings },
      }).catch(() => {});
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
    emitToUser(req.io, order.customerId, "send:delivery_verified", order);

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

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    const requesterId = String(req.authUser._id);
    if (String(order.driverId) !== requesterId && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Hanya driver yang ditugaskan yang dapat mengunggah bukti." });
    }

    if (stage === "pickup") {
      order.pickupProofUrls.push(proofUrl);
    } else {
      order.deliveryProofUrls.push(proofUrl);
    }

    await order.save();
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
    const { status, note } = req.body;
    const actorId = String(req.authUser._id);
    const actorRole = req.authUser.role || "driver";

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    const isCustomer = String(order.customerId) === actorId;
    const isDriver = String(order.driverId) === actorId;
    const isAdmin = actorRole === "admin";

    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({ success: false, message: "Anda tidak berwenang mengubah status pesanan ini." });
    }

    // State machine check
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Transisi status tidak valid dari '${order.status}' ke '${status}'.`,
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      actorId,
      actorRole,
      note: note || `Status diperbarui menjadi ${status}.`,
      createdAt: new Date(),
    });

    await order.save();

    emitToSendRoom(req.io, order._id, "send:status_updated", order);
    emitToUser(req.io, order.customerId, "send:status_updated", order);
    if (order.driverId) {
      emitToDriver(req.io, order.driverId, "send:status_updated", order);
    }

    return res.status(200).json({
      success: true,
      message: `Status order berhasil diperbarui ke ${status}.`,
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

    const order = await SendOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    }

    const isCustomer = String(order.customerId) === requesterId;
    const isDriver = String(order.driverId) === requesterId;
    const isAdmin = req.authUser.role === "admin";

    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({ success: false, message: "Anda tidak berwenang membatalkan pesanan ini." });
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
      review,
      createdAt: new Date(),
    };
    await order.save();

    // Recalculate driver average rating if driver exists
    if (order.driverId) {
      const ratedOrders = await SendOrder.find({
        driverId: order.driverId,
        "rating.score": { $exists: true },
      }).select("rating.score").lean();

      if (ratedOrders.length > 0) {
        const avg = ratedOrders.reduce((sum, r) => sum + (r.rating?.score || 5), 0) / ratedOrders.length;
        await User.findByIdAndUpdate(order.driverId, {
          "roleData.rating": Math.round(avg * 10) / 10,
        }).catch(() => {});
      }
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
