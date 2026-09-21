const mongoose = require("mongoose");
const RideOrder = require("../models/RideOrder");
const RideComplaint = require("../models/RideComplaint");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const { syncConversationForOrder } = require("../services/conversationService");

const isValidUserId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const emitToUser = (io, userId, event, payload) => {
  if (userId) io?.to(`user:${String(userId)}`).emit(event, payload);
};

const emitToRideRoom = (io, orderId, event, payload) => {
  if (orderId) {
    io?.to(`ride:${String(orderId)}`).emit(event, payload);
  }
};

// Master Fare Pricing Engine Configuration
const RIDE_FARE_CONFIG = {
  MOTOR: {
    baseFare: 8000,
    baseKm: 2,
    pricePerKm: 2500,
    pricePerMinute: 500,
    minimumFare: 10000,
    serviceFee: 1000,
  },
  MOBIL: {
    baseFare: 15000,
    baseKm: 2,
    pricePerKm: 4500,
    pricePerMinute: 800,
    minimumFare: 20000,
    serviceFee: 2000,
  },
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

// Compute detailed fare breakdown according to platform formula
const computeFareBreakdown = (distanceKm, durationMinutes, vehicleType = "MOTOR", discount = 0) => {
  const safeType = vehicleType === "MOBIL" || vehicleType === "CAR" ? "MOBIL" : "MOTOR";
  const cfg = RIDE_FARE_CONFIG[safeType];
  const safeDist = Math.max(0.1, Number(distanceKm) || 2);
  const safeDuration = Math.max(1, Number(durationMinutes) || Math.round(safeDist * 3.5) + 5);

  const baseFare = cfg.baseFare;
  const extraKm = Math.max(0, safeDist - cfg.baseKm);
  const distanceFare = Math.round(extraKm * cfg.pricePerKm);
  const timeFare = Math.round(safeDuration * cfg.pricePerMinute);
  const serviceFee = cfg.serviceFee;
  const rawFare = baseFare + distanceFare + timeFare + serviceFee - (Number(discount) || 0);
  const estimatedFare = Math.max(cfg.minimumFare, Math.ceil(rawFare / 1000) * 1000);

  return {
    distanceKm: Math.round(safeDist * 10) / 10,
    estimatedDurationMinutes: safeDuration,
    baseFare,
    distanceFare,
    timeFare,
    serviceFee,
    discount: Number(discount) || 0,
    minimumFare: cfg.minimumFare,
    estimatedFare,
    currency: "IDR",
  };
};

// 1. Calculate & Estimate Fare
const estimateRideFare = async (req, res) => {
  try {
    const {
      pickup,
      destination,
      vehicleType = "MOTOR",
      discount = 0,
      routeDistanceKm,
      routeDurationMinutes,
    } = req.body;
    const requestedDistance = Number(routeDistanceKm);
    let distanceKm =
      Number.isFinite(requestedDistance) && requestedDistance > 0
        ? Math.round(requestedDistance * 10) / 10
        : 0;
    if (!distanceKm && pickup?.latitude != null && pickup?.longitude != null && destination?.latitude != null && destination?.longitude != null) {
      distanceKm = calculateDistanceKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
    }
    if (!distanceKm || distanceKm <= 0) distanceKm = 2.5;

    const requestedDuration = Number(routeDurationMinutes);
    const estimatedDuration =
      Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.max(1, Math.round(requestedDuration))
        : Math.round(distanceKm * 3.5) + 5;
    const breakdown = computeFareBreakdown(distanceKm, estimatedDuration, vehicleType, discount);
    return res.json({
      success: true,
      data: {
        ...breakdown,
        estimatedDuration: breakdown.estimatedDurationMinutes,
        estimatedDistance: breakdown.distanceKm,
        formattedFare: `Rp ${breakdown.estimatedFare.toLocaleString("id-ID")}`,
      },
    });
  } catch (error) {
    console.error("estimateRideFare error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghitung estimasi tarif." });
  }
};

// 2. Create a new Kanyaah Ride Order
const createRideOrder = async (req, res) => {
  try {
    const customerId = String(req.authUser?._id || req.body.customerId || "");
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Otentikasi pengguna diperlukan untuk memesan ride." });
    }

    const customerName = req.authUser?.name || req.body.customerName || "Pelanggan Rangers";
    const customerPhone = req.authUser?.phone || req.body.customerPhone || "";

    const {
      pickup,
      destination,
      customerNote,
      vehicleType = "MOTOR",
      paymentMethod = "Bayar Tunai",
      discount = 0,
      routeDistanceKm,
      routeDurationMinutes,
    } = req.body;

    if (!pickup?.address || !destination?.address) {
      return res.status(400).json({
        success: false,
        message: "Lokasi penjemputan dan tujuan perjalanan wajib diisi.",
      });
    }

    if (vehicleType === "CAR" || vehicleType === "MOBIL") {
      return res.status(400).json({
        success: false,
        message: "Layanan Kanyaah Mobil sedang dalam tahap pengembangan (Segera Hadir).",
      });
    }

    // Prefer the road route calculated by the client; fall back to coordinates
    // when older clients do not send routed metrics.
    const routedDistance = Number(routeDistanceKm);
    let distanceKm =
      Number.isFinite(routedDistance) && routedDistance > 0
        ? Math.round(routedDistance * 10) / 10
        : Number(req.body.estimatedDistance || req.body.estimatedDistanceKm || 0);
    if (!routedDistance && pickup.latitude != null && pickup.longitude != null && destination.latitude != null && destination.longitude != null) {
      const computed = calculateDistanceKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
      if (computed > 0) distanceKm = computed;
    }
    if (!distanceKm || distanceKm <= 0) distanceKm = 2.5;

    const routedDuration = Number(routeDurationMinutes);
    const estimatedDuration =
      Number.isFinite(routedDuration) && routedDuration > 0
        ? Math.max(1, Math.round(routedDuration))
        : Math.round(distanceKm * 3.5) + 5;
    const breakdown = computeFareBreakdown(distanceKm, estimatedDuration, vehicleType, discount);
    const estimatedFare = breakdown.estimatedFare;
    const totalAmount = estimatedFare;
    // Driver gets 80% of total fare
    const driverEarnings = Math.round(totalAmount * 0.8);

    const orderCode = `RNG-RIDE-${Date.now().toString().slice(-8)}`;

    const rideOrder = await RideOrder.create({
      orderCode,
      orderType: "KANYAAH_RIDE",
      serviceType: "KANYAAH_RIDE",
      customerId,
      customerName,
      customerPhone,
      vehicleType: "MOTOR",
      pickup: {
        address: pickup.address,
        latitude: pickup.latitude || null,
        longitude: pickup.longitude || null,
        placeName: pickup.placeName || "",
        notes: pickup.notes || "",
      },
      destination: {
        address: destination.address,
        latitude: destination.latitude || null,
        longitude: destination.longitude || null,
        placeName: destination.placeName || "",
        notes: destination.notes || "",
      },
      customerNote: (customerNote || "").slice(0, 250),
      estimatedDistanceKm: breakdown.distanceKm,
      estimatedDurationMinutes: breakdown.estimatedDurationMinutes,
      estimatedDistance: breakdown.distanceKm,
      estimatedDuration: breakdown.estimatedDurationMinutes,
      baseFare: breakdown.baseFare,
      distanceFare: breakdown.distanceFare,
      timeFare: breakdown.timeFare,
      serviceFee: breakdown.serviceFee,
      discount: breakdown.discount,
      estimatedFare,
      totalAmount,
      driverEarnings,
      paymentMethod,
      paymentStatus: "Menunggu Pembayaran",
      status: "SEARCHING_DRIVER",
      statusHistory: [
        {
          status: "SEARCHING_DRIVER",
          actorId: customerId,
          actorRole: "customer",
          note: "Pesanan Kanyaah Ride dibuat oleh customer",
          createdAt: new Date(),
        },
      ],
    });

    // Create Notification for customer
    if (isValidUserId(customerId)) {
      await Notification.create({
        userId: customerId,
        title: "Kanyaah Ride Dipesan",
        message: `Mencari Driver Rangers untuk perjalanan Anda (${pickup.placeName || pickup.address} → ${destination.placeName || destination.address}).`,
        type: "order_new",
        relatedId: rideOrder._id,
      }).catch(() => {});
    }

    // Broadcast to online drivers via socket.io
    req.io?.emit("ride:new_available", rideOrder);
    req.io?.emit("order_created", rideOrder);

    return res.status(201).json({
      success: true,
      message: "Pesanan Kanyaah Ride berhasil dibuat. Sistem sedang mencari driver terdekat.",
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

// 3. Get customer ride orders history
const getCustomerRideOrders = async (req, res) => {
  try {
    const customerId = String(req.authUser?._id || req.params.customerId || "");
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Akses tidak diizinkan." });
    }

    const orders = await RideOrder.find({ customerId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getCustomerRideOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat pesanan Kanyaah Ride" });
  }
};

// 4. Get currently active ride for customer
const getActiveCustomerRide = async (req, res) => {
  try {
    const customerId = String(req.authUser?._id || req.params.customerId || "");
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Akses tidak diizinkan." });
    }

    const activeOrder = await RideOrder.findOne({
      customerId,
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

// 5. Get ride orders for Driver (available incoming and assigned)
const getDriverRideOrders = async (req, res) => {
  try {
    const driverId = String(req.authUser?._id || req.params.driverId || "");

    const query = {
      $or: [
        { status: "SEARCHING_DRIVER", declinedByDrivers: { $nin: [driverId] } },
        ...(driverId ? [{ driverId }] : []),
      ],
    };

    const orders = await RideOrder.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getDriverRideOrders error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat order driver" });
  }
};

// 6. Get single ride detail
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

// 7. Atomic Driver Acceptance
const acceptRideOrder = async (req, res) => {
  try {
    const driver = req.authUser;
    if (!driver || driver.role !== "driver") {
      return res.status(403).json({ success: false, message: "Hanya akun Driver Rangers yang dapat menerima pesanan." });
    }

    const driverId = String(driver._id);

    // Ensure driver does not already have another active ride in progress
    const activeRide = await RideOrder.findOne({
      driverId,
      status: { $in: ["DRIVER_ASSIGNED", "DRIVER_ON_THE_WAY", "DRIVER_ARRIVED", "TRIP_STARTED"] },
      _id: { $ne: req.params.id },
    }).lean();

    if (activeRide) {
      return res.status(400).json({
        success: false,
        message: "Anda masih memiliki perjalanan aktif. Selesaikan perjalanan saat ini terlebih dahulu.",
      });
    }

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

    const driverSnapshot = {
      name: driver.name,
      phone: driverPhone,
      photo: driverPhoto,
      vehicleType: vehicleBrand,
      vehiclePlate: plateNumber,
      rating: driverRating,
    };

    // Atomic conditional update
    const order = await RideOrder.findOneAndUpdate(
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
          driverSnapshot,
          status: "DRIVER_ASSIGNED",
        },
        $push: {
          statusHistory: {
            status: "DRIVER_ASSIGNED",
            actorId: driverId,
            actorRole: "driver",
            note: `Driver ${driver.name} menerima pesanan`,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!order) {
      const existing = await RideOrder.findById(req.params.id).lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
      }
      if (String(existing.driverId) === driverId) {
        return res.json({ success: true, message: "Pesanan sudah ditugaskan kepada Anda.", data: existing });
      }
      return res.status(409).json({
        success: false,
        message: existing.driverId ? "Pesanan sudah diambil oleh driver lain." : "Pesanan sudah tidak tersedia.",
      });
    }

    // Mark driver as BUSY
    await User.findByIdAndUpdate(driverId, { driverAvailability: "BUSY" }).catch(() => {});

    // Notify customer
    if (isValidUserId(order.customerId)) {
      await Notification.create({
        userId: order.customerId,
        title: "Driver Ditemukan!",
        message: `${driver.name} (${vehicleBrand} - ${plateNumber}) sedang bersiap menjemput Anda.`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => {});
    }

    // Sync live in-app chat
    void syncConversationForOrder(order, "ride").catch(() => {});

    // Broadcast Realtime Events
    if (req.io) {
      req.io.emit("ride:status_changed", { orderId: order._id, status: order.status, driverId });
      emitToUser(req.io, order.customerId, "ride:driver_assigned", order);
      emitToUser(req.io, order.customerId, "ride_status_updated", order);
      emitToUser(req.io, order.customerId, "order_status_updated", order);
      emitToRideRoom(req.io, order._id, "ride:status_changed", order);
    }

    return res.json({
      success: true,
      message: "Pesanan berhasil diterima!",
      data: order,
    });
  } catch (error) {
    console.error("acceptRideOrder error:", error);
    return res.status(500).json({ success: false, message: error.message || "Gagal menerima pesanan" });
  }
};

// 8. Driver declines an order
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
    return res.json({ success: true, message: "Pesanan dilewati.", data: order });
  } catch (error) {
    console.error("declineRideOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menolak pesanan" });
  }
};

// 9. Update Ride Status (Operational Workflow)
const updateRideStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const authUser = req.authUser;
    const orderId = req.params.id;

    const current = await RideOrder.findById(orderId);
    if (!current) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    // Cancellation delegate
    if (status === "CANCELLED") {
      return cancelRideOrder(req, res);
    }

    // Valid state transitions machine
    const validTransitions = {
      DRIVER_ASSIGNED: ["DRIVER_ON_THE_WAY", "DRIVER_ARRIVED"],
      DRIVER_ON_THE_WAY: ["DRIVER_ARRIVED"],
      DRIVER_ARRIVED: ["TRIP_STARTED"],
      TRIP_STARTED: ["COMPLETED", "DISPUTED"],
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
      notifMessage = `Driver telah tiba di titik penjemputan. Silakan temui driver Anda.`;
    } else if (status === "TRIP_STARTED") {
      notifTitle = "Perjalanan Dimulai";
      notifMessage = `Perjalanan menuju ${current.destination.placeName || current.destination.address} sedang berlangsung. Hati-hati di jalan!`;
    } else if (status === "COMPLETED") {
      current.paymentStatus = "Lunas";
      current.completedAt = new Date();
      current.finalFare = current.totalAmount;
      current.actualDistanceKm = current.estimatedDistanceKm || current.estimatedDistance;
      current.actualDurationMinutes = current.estimatedDurationMinutes || current.estimatedDuration;

      notifTitle = "Perjalanan Selesai";
      notifMessage = `Terima kasih telah menggunakan Kanyaah Ride. Total tarif: Rp ${current.totalAmount.toLocaleString("id-ID")}.`;

      // Record driver earnings
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
        console.warn("Driver transaction error:", txErr);
      }
    }

    current.statusHistory.push({
      status,
      actorId: String(authUser?._id || current.driverId || ""),
      actorRole: authUser?.role || "driver",
      note: `Status diubah menjadi ${status}`,
      createdAt: new Date(),
    });

    await current.save();

    // Notify customer
    if (isValidUserId(current.customerId) && notifTitle) {
      await Notification.create({
        userId: current.customerId,
        title: notifTitle,
        message: notifMessage,
        type: "order_status",
        relatedId: current._id,
      }).catch(() => {});

      emitToUser(req.io, current.customerId, "ride_status_updated", current);
      emitToUser(req.io, current.customerId, "order_status_updated", current);
      emitToRideRoom(req.io, current._id, "ride:status_changed", current);
    }

    return res.json({ success: true, message: "Status perjalanan diperbarui", data: current });
  } catch (error) {
    console.error("updateRideStatus error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status perjalanan" });
  }
};

// 10. Update Driver GPS Location during active ride
const updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude, heading, speed } = req.body;
    const orderId = req.params.id;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "Koordinat latitude dan longitude wajib dikirim." });
    }

    const order = await RideOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    order.driverLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading != null ? Number(heading) : null,
      speed: speed != null ? Number(speed) : null,
      updatedAt: new Date(),
    };

    await order.save();

    const locPayload = {
      orderId: order._id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading,
      speed,
      updatedAt: new Date(),
    };

    emitToUser(req.io, order.customerId, "ride:driver_location_updated", locPayload);
    emitToRideRoom(req.io, order._id, "ride:driver_location_updated", locPayload);

    return res.json({ success: true, data: locPayload });
  } catch (error) {
    console.error("updateDriverLocation error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui lokasi driver" });
  }
};

// 11. Structured Cancellation
const cancelRideOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason, reasonDetail } = req.body;
    const authUser = req.authUser;

    const order = await RideOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Perjalanan sudah selesai atau dibatalkan sebelumnya." });
    }

    const cancelledBy = authUser?.role === "driver" ? "driver" : "customer";

    // Strict Rule: Customer cannot cancel after trip has started
    if (cancelledBy === "customer" && order.status === "TRIP_STARTED") {
      return res.status(400).json({
        success: false,
        message: "Perjalanan yang sudah dimulai tidak dapat dibatalkan secara sepihak. Hubungi bantuan darurat jika ada kendala.",
      });
    }

    // Cancellation fee rule
    let fee = 0;
    if (cancelledBy === "customer") {
      if (order.status === "SEARCHING_DRIVER") {
        fee = 0; // Free cancellation while searching
      } else if (order.status === "DRIVER_ASSIGNED" || order.status === "DRIVER_ON_THE_WAY") {
        fee = 3000; // Small cancellation fee for driver dispatch
      } else if (order.status === "DRIVER_ARRIVED") {
        fee = 5000; // Driver already arrived
      }
    }

    const finalReason = reasonDetail ? `${reason} - ${reasonDetail}` : (reason || "Dibatalkan oleh pengguna");

    order.status = "CANCELLED";
    order.paymentStatus = "Dibatalkan";
    order.cancellation = {
      cancelledBy,
      reason: finalReason,
      fee,
      refundAmount: order.paymentStatus === "Lunas" ? Math.max(0, order.totalAmount - fee) : 0,
      cancelledAt: new Date(),
    };
    order.cancelledBy = cancelledBy;
    order.cancelReason = finalReason;

    order.statusHistory.push({
      status: "CANCELLED",
      actorId: String(authUser?._id || ""),
      actorRole: cancelledBy,
      note: `Perjalanan dibatalkan (${cancelledBy}). Alasan: ${finalReason}. Denda: Rp ${fee}`,
      createdAt: new Date(),
    });

    await order.save();

    // Release driver if assigned
    if (order.driverId && isValidUserId(order.driverId)) {
      await User.findByIdAndUpdate(order.driverId, { driverAvailability: "AVAILABLE" }).catch(() => {});
    }

    // Notify parties
    const notifyUserId = cancelledBy === "driver" ? order.customerId : order.driverId;
    if (isValidUserId(notifyUserId)) {
      await Notification.create({
        userId: notifyUserId,
        title: "Perjalanan Dibatalkan",
        message: `Perjalanan ${order.orderCode} telah dibatalkan (${cancelledBy === "driver" ? "oleh driver" : "oleh customer"}).`,
        type: "order_status",
        relatedId: order._id,
      }).catch(() => {});

      emitToUser(req.io, notifyUserId, "ride_status_updated", order);
      emitToUser(req.io, notifyUserId, "order_status_updated", order);
    }
    emitToRideRoom(req.io, order._id, "ride:status_changed", order);

    return res.json({
      success: true,
      message: "Perjalanan berhasil dibatalkan.",
      data: order,
    });
  } catch (error) {
    console.error("cancelRideOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal membatalkan perjalanan" });
  }
};

// 12. Rate Ride Order
const rateRideOrder = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: "Rating harus bernilai 1 sampai 5." });
    }

    const order = await RideOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    order.rating = {
      score: numericRating,
      review: String(review || "").trim(),
      createdAt: new Date(),
    };
    await order.save();

    // Update driver cumulative rating
    if (order.driverId && isValidUserId(order.driverId)) {
      try {
        const ratedOrders = await RideOrder.find({
          driverId: order.driverId,
          "rating.score": { $ne: null },
        }).lean();
        if (ratedOrders.length > 0) {
          const avg = ratedOrders.reduce((sum, o) => sum + (o.rating?.score || 5), 0) / ratedOrders.length;
          await User.findByIdAndUpdate(order.driverId, { driverRating: Math.round(avg * 10) / 10 });
        }
      } catch (rateErr) {
        console.warn("Update driver rating error:", rateErr);
      }
    }

    return res.json({ success: true, message: "Terima kasih atas ulasan perjalanan Anda!", data: order });
  } catch (error) {
    console.error("rateRideOrder error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan ulasan" });
  }
};

// 13. Submit Ride Complaint
const submitRideComplaint = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { category, description, attachments = [] } = req.body;
    const authUser = req.authUser;

    if (!category || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Kategori dan deskripsi pengaduan wajib diisi.",
      });
    }

    const order = await RideOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    const ticketId = `CMP-RIDE-${Date.now().toString().slice(-6)}`;

    const complaint = await RideComplaint.create({
      ticketId,
      orderId: order._id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      driverId: order.driverId,
      driverName: order.driverName,
      category,
      description: description.trim(),
      attachments,
      status: "OPEN",
    });

    order.status = "DISPUTED";
    order.statusHistory.push({
      status: "DISPUTED",
      actorId: String(authUser?._id || order.customerId),
      actorRole: "customer",
      note: `Komplain diajukan (#${ticketId}): ${category}`,
      createdAt: new Date(),
    });
    await order.save();

    return res.status(201).json({
      success: true,
      message: `Komplain berhasil didaftarkan (#${ticketId}). Tim dukungan kami akan menindaklanjuti.`,
      data: complaint,
    });
  } catch (error) {
    console.error("submitRideComplaint error:", error);
    return res.status(500).json({ success: false, message: "Gagal mendaftarkan komplain." });
  }
};

module.exports = {
  estimateRideFare,
  createRideOrder,
  getCustomerRideOrders,
  getActiveCustomerRide,
  getDriverRideOrders,
  getRideOrderById,
  acceptRideOrder,
  declineRideOrder,
  updateRideStatus,
  updateDriverLocation,
  cancelRideOrder,
  rateRideOrder,
  submitRideComplaint,
};
