const mongoose = require("mongoose");
const RideOrder = require("../models/RideOrder");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const { syncConversationForOrder } = require("../services/conversationService");

const isValidUserId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const emitToUser = (io, userId, event, payload) => {
  if (userId) io?.to(`user:${String(userId)}`).emit(event, payload);
};

// Haversine formula to compute distance in km
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
};

// Calculate fare: Base Rp 8.000 for first 2 km, + Rp 2.500 per additional km
const calculateRideFare = (distanceKm) => {
  const safeDist = Math.max(0.5, Number(distanceKm) || 2);
  const baseKm = 2;
  const baseFare = 8000;
  const ratePerKm = 2500;

  let fare = baseFare;
  if (safeDist > baseKm) {
    fare += Math.round((safeDist - baseKm) * ratePerKm);
  }
  // Round to nearest 1000
  fare = Math.ceil(fare / 1000) * 1000;
  return fare;
};

// Create a new Kanyaah Ride Order
const createRideOrder = async (req, res) => {
  try {
    const customerId = String(req.authUser?._id || req.body.customerId);
    const customerName = req.authUser?.name || req.body.customerName || "Pelanggan Rangers";
    const customerPhone = req.authUser?.phone || req.body.customerPhone || "";

    const { pickup, destination, customerNote, vehicleType = "MOTOR", paymentMethod = "Bayar Tunai" } = req.body;

    if (!pickup?.address || !destination?.address) {
      return res.status(400).json({
        success: false,
        message: "Lokasi penjemputan dan tujuan wajib diisi.",
      });
    }

    // Vehicle check: Only MOTOR is allowed right now
    if (vehicleType === "CAR") {
      return res.status(400).json({
        success: false,
        message: "Layanan Kanyaah Car sedang dalam tahap pengembangan (Coming Soon).",
      });
    }

    // Compute distance
    let distanceKm = Number(req.body.estimatedDistance || 0);
    if (!distanceKm && pickup.latitude && pickup.longitude && destination.latitude && destination.longitude) {
      distanceKm = calculateDistanceKm(
        pickup.latitude,
        pickup.longitude,
        destination.latitude,
        destination.longitude
      );
    }
    if (!distanceKm || distanceKm <= 0) {
      distanceKm = 2.5; // default fallback if coordinates are missing
    }

    const estimatedDuration = Math.round(distanceKm * 3.5) + 5; // e.g. ~12 mins for 2 km
    const estimatedFare = Number(req.body.estimatedFare) || calculateRideFare(distanceKm);
    const totalAmount = estimatedFare;
    // Driver share: 80%
    const driverEarnings = Math.round(totalAmount * 0.8);

    const orderCode = `RNG-RIDE-${Date.now().toString().slice(-8)}`;

    const rideOrder = await RideOrder.create({
      orderCode,
      orderType: "KANYAAH_RIDE",
      serviceType: "RIDE",
      customerId,
      customerName,
      customerPhone,
      vehicleType: "MOTOR",
      pickup: {
        address: pickup.address,
        latitude: pickup.latitude || null,
        longitude: pickup.longitude || null,
        placeName: pickup.placeName || "",
      },
      destination: {
        address: destination.address,
        latitude: destination.latitude || null,
        longitude: destination.longitude || null,
        placeName: destination.placeName || "",
      },
      customerNote: (customerNote || "").slice(0, 150),
      estimatedDistance: distanceKm,
      estimatedDuration,
      estimatedFare,
      totalAmount,
      driverEarnings,
      paymentMethod,
      paymentStatus: "Menunggu Pembayaran",
      status: "SEARCHING_DRIVER",
    });

    // Create Notification for customer
    if (isValidUserId(customerId)) {
      await Notification.create({
        userId: customerId,
        title: "Kanyaah Ride Dipesan",
        message: `Mencari Driver Rangers untuk perjalanan Anda (${pickup.placeName || pickup.address} → ${destination.placeName || destination.address}).`,
        type: "order_new",
        relatedId: rideOrder._id,
      });
    }

    // Broadcast to online drivers via socket.io
    req.io?.emit("ride:new_available", rideOrder);
    req.io?.emit("order_created", rideOrder);

    if (process.env.NODE_ENV !== "production") {
      console.log("[Ride Created]", {
        orderId: rideOrder.orderCode,
        serviceType: rideOrder.serviceType,
        orderCategory: rideOrder.orderType,
        status: rideOrder.status,
        customerId: rideOrder.customerId,
        driverId: rideOrder.driverId,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Pesanan Kanyaah Ride berhasil dibuat. Sedang mencari driver.",
      data: rideOrder,
    });
  } catch (error) {
    console.error("createRideOrder error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal membuat pesanan Kanyaah Ride",
    });
  }
};

// Get all ride orders for a customer
const getCustomerRideOrders = async (req, res) => {
  try {
    const customerId = String(req.params.customerId || req.authUser?._id || "");
    const authId = req.authUser?._id ? String(req.authUser._id) : "";
    const candidateIds = [...new Set([customerId, authId].filter(Boolean))];

    const query = candidateIds.length > 0
      ? { customerId: { $in: candidateIds } }
      : {};
    const orders = await RideOrder.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getCustomerRideOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesanan Kanyaah Ride" });
  }
};

// Get active ride for a customer (if any)
const getActiveCustomerRide = async (req, res) => {
  try {
    const customerId = String(req.params.customerId || req.authUser?._id || "");
    const authId = req.authUser?._id ? String(req.authUser._id) : "";
    const candidateIds = [...new Set([customerId, authId].filter(Boolean))];

    const activeOrder = await RideOrder.findOne({
      ...(candidateIds.length > 0 ? { customerId: { $in: candidateIds } } : {}),
      status: { $in: ["SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ON_THE_WAY", "DRIVER_ARRIVED", "TRIP_STARTED"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: activeOrder || null });
  } catch (error) {
    console.error("getActiveCustomerRide error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengecek perjalanan aktif" });
  }
};

// Get ride orders for Driver (both incoming available and assigned/completed)
const getDriverRideOrders = async (req, res) => {
  try {
    const driverId = String(req.authUser?._id || req.params.driverId || "");

    const query = {
      $or: [
        // Available incoming rides not declined by this driver
        { status: "SEARCHING_DRIVER", declinedByDrivers: { $nin: [driverId] } },
        // Rides assigned to this driver
        ...(driverId ? [{ driverId }] : []),
      ],
    };

    const orders = await RideOrder.find(query).sort({ createdAt: -1 }).lean();

    if (process.env.NODE_ENV !== "production") {
      console.log("[Driver Incoming Query]", {
        driverId,
        driverStatus: req.authUser?.driverAvailability || "AVAILABLE",
        acceptedCategories: ["RIDE", "DELIVERY"],
        orderCount: orders.length,
      });
      orders.forEach((o) => {
        if (o.status === "SEARCHING_DRIVER") {
          console.log("[Incoming Ride Found]", { orderId: o._id, orderCode: o.orderCode });
        }
      });
    }

    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getDriverRideOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat order driver" });
  }
};

// Get single ride order by ID
const getRideOrderById = async (req, res) => {
  try {
    const order = await RideOrder.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan Kanyaah Ride tidak ditemukan" });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("getRideOrderById error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat detail pesanan" });
  }
};

// Accept a Ride Order (Driver accepts atomic)
const acceptRideOrder = async (req, res) => {
  let session;
  try {
    const driver = req.authUser;
    if (!driver || driver.role !== "driver") {
      return res.status(403).json({ success: false, message: "Hanya akun Driver Rangers yang dapat menerima pesanan." });
    }

    const driverId = String(driver._id);
    const vehicleBrand =
      driver.roleData?.get?.("vehicleBrand") ||
      driver.roleData?.vehicleBrand ||
      driver.roleData?.get?.("brand") ||
      driver.roleData?.brand ||
      "Honda Beat";
    const plateNumber =
      driver.roleData?.get?.("plateNumber") ||
      driver.roleData?.plateNumber ||
      driver.roleData?.get?.("plate") ||
      driver.roleData?.plate ||
      "";
    const driverPhone = driver.phone || "";
    const driverPhoto = driver.profilePhoto || "";
    const driverRating = typeof driver.driverRating === "number" && driver.driverRating > 0 ? driver.driverRating : 4.9;

    // Atomic find and update to prevent race conditions
    session = await mongoose.startSession();
    let order;
    let replay = false;

    await session.withTransaction(async () => {
      order = await RideOrder.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "SEARCHING_DRIVER",
          driverId: null,
          declinedByDrivers: { $nin: [driverId] },
        },
        {
          $set: {
            driverId,
            driverName: driver.name,
            driverPhone,
            driverPhoto,
            driverRating,
            driverVehicle: vehicleBrand,
            driverPlate: plateNumber,
            status: "DRIVER_ASSIGNED",
          },
        },
        { new: true, runValidators: true, session }
      );

      if (!order) {
        const existing = await RideOrder.findById(req.params.id).session(session);
        if (!existing) {
          const err = new Error("Pesanan tidak ditemukan.");
          err.statusCode = 404;
          throw err;
        }
        if (
          String(existing.driverId) === driverId &&
          ["DRIVER_ASSIGNED", "DRIVER_ON_THE_WAY", "DRIVER_ARRIVED", "TRIP_STARTED", "COMPLETED"].includes(existing.status)
        ) {
          order = existing;
          replay = true;
          return;
        }
        const err = new Error(existing.driverId ? "Pesanan sudah diambil oleh driver lain." : "Pesanan sudah tidak tersedia.");
        err.statusCode = 409;
        throw err;
      }

      // Notify customer
      if (isValidUserId(order.customerId)) {
        await Notification.create(
          [
            {
              userId: order.customerId,
              title: "Driver Ditemukan!",
              message: `${driver.name} (${vehicleBrand} - ${plateNumber}) sedang bersiap menjemput Anda.`,
              type: "order_status",
              relatedId: order._id,
            },
          ],
          { session, ordered: true }
        );
      }
    });

    await session.endSession();
    session = null;

    // Sync conversation for live in-app chat between customer and driver
    void syncConversationForOrder(order, "ride").catch((err) =>
      console.error("Sync conversation ride error:", err)
    );

    // Update driver availability to BUSY
    try {
      await User.findByIdAndUpdate(driverId, { driverAvailability: "BUSY" });
    } catch (err) {
      console.warn("Could not update driver availability to BUSY:", err.message);
    }

    // Broadcast realtime event
    if (req.io) {
      req.io.emit("ride:status_changed", { orderId: order._id, status: order.status, driverId });
      req.io.emit("order_status_updated", order);
      emitToUser(req.io, order.customerId, "ride_driver_assigned", order);
      emitToUser(req.io, order.customerId, "ride_status_updated", order);
      emitToUser(req.io, order.customerId, "order_status_updated", order);
    }
    emitToUser(req.io, order.customerId, "notification:new", {
      relatedId: String(order._id),
      type: "order_status",
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[Driver Accepted Ride]", {
        orderId: order.orderCode,
        driverId,
        driverName: driver.name,
        status: order.status,
      });
    }

    return res.json({
      success: true,
      message: replay ? "Pesanan sudah ditugaskan kepada Anda." : "Pesanan berhasil diterima!",
      data: order,
    });
  } catch (error) {
    if (session) await session.endSession().catch(() => undefined);
    console.error("acceptRideOrder error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Gagal menerima pesanan Kanyaah Ride",
    });
  }
};

// Decline a Ride Order (Driver declines)
const declineRideOrder = async (req, res) => {
  try {
    const driverId = String(req.authUser?._id || req.body.driverId || "");
    const order = await RideOrder.findOneAndUpdate(
      { _id: req.params.id, status: "SEARCHING_DRIVER" },
      { $addToSet: { declinedByDrivers: driverId } },
      { new: true }
    );
    if (!order) {
      return res.status(409).json({ success: false, message: "Pesanan tidak lagi tersedia untuk ditolak." });
    }
    return res.json({ success: true, message: "Pesanan dihapus dari daftar Anda.", data: order });
  } catch (error) {
    console.error("declineRideOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menolak pesanan" });
  }
};

// Update Ride Status (Driver transitions & Cancel)
const updateRideStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const authUser = req.authUser;
    const orderId = req.params.id;

    const current = await RideOrder.findById(orderId);
    if (!current) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    // Cancellation logic
    if (status === "CANCELLED") {
      if (["COMPLETED", "CANCELLED"].includes(current.status)) {
        return res.status(400).json({ success: false, message: "Perjalanan sudah selesai atau dibatalkan sebelumnya." });
      }
      const cancelledBy = authUser?.role === "driver" ? "driver" : "customer";
      current.status = "CANCELLED";
      current.paymentStatus = "Dibatalkan";
      current.cancelledBy = cancelledBy;
      current.cancelReason = cancelReason || "Dibatalkan oleh pengguna";
      await current.save();

      if (current.driverId && isValidUserId(current.driverId)) {
        await User.findByIdAndUpdate(current.driverId, { driverAvailability: "AVAILABLE" }).catch(() => {});
      }

      // Notify other party
      const notifyUserId = cancelledBy === "driver" ? current.customerId : current.driverId;
      if (isValidUserId(notifyUserId)) {
        await Notification.create({
          userId: notifyUserId,
          title: "Perjalanan Dibatalkan",
          message: `Perjalanan ${current.orderCode} telah dibatalkan (${cancelledBy === "driver" ? "oleh driver" : "oleh customer"}).`,
          type: "order_status",
          relatedId: current._id,
        });
        emitToUser(req.io, notifyUserId, "ride_status_updated", current);
        emitToUser(req.io, notifyUserId, "order_status_updated", current);
      }

      return res.json({ success: true, message: "Perjalanan berhasil dibatalkan", data: current });
    }

    // Driver workflow status transitions
    const validTransitions = {
      DRIVER_ASSIGNED: ["DRIVER_ON_THE_WAY", "DRIVER_ARRIVED"],
      DRIVER_ON_THE_WAY: ["DRIVER_ARRIVED"],
      DRIVER_ARRIVED: ["TRIP_STARTED"],
      TRIP_STARTED: ["COMPLETED"],
    };

    const allowedNext = validTransitions[current.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Transisi status tidak valid dari ${current.status} ke ${status}.`,
      });
    }

    current.status = status;
    let notifTitle = "";
    let notifMessage = "";

    if (status === "DRIVER_ON_THE_WAY") {
      notifTitle = "Driver Menuju Lokasi";
      notifMessage = `${current.driverName} sedang menuju ke lokasi penjemputan Anda.`;
    } else if (status === "DRIVER_ARRIVED") {
      notifTitle = "Driver Telah Sampai";
      notifMessage = `Driver telah tiba di lokasi penjemputan. Silakan temui driver Anda.`;
    } else if (status === "TRIP_STARTED") {
      notifTitle = "Perjalanan Dimulai";
      notifMessage = `Perjalanan menuju ${current.destination.placeName || current.destination.address} sedang berlangsung. Selamat menikmati perjalanan!`;
    } else if (status === "COMPLETED") {
      current.paymentStatus = "Lunas";
      notifTitle = "Perjalanan Selesai";
      notifMessage = `Terima kasih telah menggunakan Kanyaah Ride. Total pembayaran: Rp ${current.totalAmount.toLocaleString("id-ID")}.`;

      // Record driver transaction
      try {
        if (isValidUserId(current.driverId)) {
          await Transaction.create({
            userId: current.driverId,
            type: "in",
            title: `Pendapatan Ride ${current.orderCode}`,
            description: `Perjalanan Kanyaah Ride selesai (${current.pickup.address} → ${current.destination.address})`,
            amount: current.driverEarnings,
            referenceId: current._id,
            status: "Sukses",
          });
          await User.findByIdAndUpdate(current.driverId, { driverAvailability: "AVAILABLE" });
        }
      } catch (txErr) {
        console.warn("Failed to create transaction or reset driver availability for ride:", txErr);
      }
    }

    await current.save();

    // Create Notification for Customer
    if (isValidUserId(current.customerId) && notifTitle) {
      await Notification.create({
        userId: current.customerId,
        title: notifTitle,
        message: notifMessage,
        type: "order_status",
        relatedId: current._id,
      });
      emitToUser(req.io, current.customerId, "ride_status_updated", current);
      emitToUser(req.io, current.customerId, "order_status_updated", current);
      emitToUser(req.io, current.customerId, "notification:new", {
        relatedId: String(current._id),
        type: "order_status",
      });
    }

    if (req.io) {
      req.io.emit("ride:status_changed", { orderId: current._id, status: current.status, driverId: current.driverId });
      req.io.emit("order_status_updated", current);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[Ride Status Updated]", {
        orderId: current.orderCode,
        status: current.status,
        driverId: current.driverId,
      });
    }

    return res.json({ success: true, message: "Status perjalanan diperbarui", data: current });
  } catch (error) {
    console.error("updateRideStatus error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status perjalanan" });
  }
};

// Rate a completed Ride Order (Customer)
const rateRideOrder = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: "Rating harus berupa angka antara 1 sampai 5." });
    }

    const order = await RideOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    order.rating = numericRating;
    order.review = String(review || "").trim();
    await order.save();

    return res.json({ success: true, message: "Terima kasih atas penilaian Anda!", data: order });
  } catch (error) {
    console.error("rateRideOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan penilaian." });
  }
};

// Estimate Fare & Distance
const estimateRideFare = async (req, res) => {
  try {
    const { pickup, destination } = req.body;
    let distanceKm = 0;
    if (pickup?.latitude && pickup?.longitude && destination?.latitude && destination?.longitude) {
      distanceKm = calculateDistanceKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
    }
    if (!distanceKm || distanceKm <= 0) {
      distanceKm = 2.5;
    }
    const estimatedDuration = Math.round(distanceKm * 3.5) + 5;
    const fare = calculateRideFare(distanceKm);

    return res.json({
      success: true,
      data: {
        distanceKm,
        estimatedDuration,
        estimatedFare: fare,
        formattedFare: `Rp ${fare.toLocaleString("id-ID")}`,
      },
    });
  } catch (error) {
    console.error("estimateRideFare error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghitung estimasi tarif." });
  }
};

module.exports = {
  createRideOrder,
  getCustomerRideOrders,
  getActiveCustomerRide,
  getDriverRideOrders,
  getRideOrderById,
  acceptRideOrder,
  declineRideOrder,
  updateRideStatus,
  rateRideOrder,
  estimateRideFare,
};
