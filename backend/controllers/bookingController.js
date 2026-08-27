const Booking = require("../models/Booking");
const Kost = require("../models/Kost");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Create new Kost Booking (Customer)
const createBooking = async (req, res) => {
  try {
    const {
      customerId,
      kostId,
      roomId,
      roomNumber,
      customerName,
      customerPhone,
      customerEmail,
      customerKtpUrl,
      entryDate,
      durationMonths,
      monthlyPrice,
      totalAmount,
      dpAmount,
      dpProofImage,
      notes,
    } = req.body;

    if (!kostId || !customerName || !customerPhone || !entryDate || !dpAmount) {
      return res.status(400).json({
        success: false,
        message: "Data pemesanan tidak lengkap (Kost, Nama, HP, Tanggal Masuk, DP wajib diisi)",
      });
    }

    const kost = await Kost.findById(kostId);
    if (!kost) {
      return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });
    }

    // Resolve customerId if it is an email or empty
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId || !resolvedCustomerId.match(/^[0-9a-fA-F]{24}$/)) {
      let custUser = await User.findOne({
        $or: [
          { email: customerEmail || "aisyahphr@gmail.com" },
          { email: "aisyahphr@gmail.com" },
          { name: customerName },
        ],
      });
      if (custUser) {
        resolvedCustomerId = custUser._id;
      } else {
        // Fallback to a placeholder user or create one
        resolvedCustomerId = kost.ownerId; // fallback
      }
    }

    const bookingCode = `KST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const booking = await Booking.create({
      bookingCode,
      customerId: resolvedCustomerId,
      ownerId: kost.ownerId,
      kostId,
      roomId: roomId || null,
      roomNumber: roomNumber || "Kamar Pilihan",
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail?.trim() || "aisyahphr@gmail.com",
      customerKtpUrl: customerKtpUrl || "",
      entryDate: new Date(entryDate),
      durationMonths: Number(durationMonths) || 1,
      monthlyPrice: Number(monthlyPrice) || kost.price,
      totalAmount: Number(totalAmount) || (Number(monthlyPrice) || kost.price) * (Number(durationMonths) || 1),
      dpAmount: Number(dpAmount),
      dpProofImage: dpProofImage || "",
      dpPaidAt: dpProofImage ? new Date() : undefined,
      status: dpProofImage ? "dp_submitted" : "pending_dp",
      notes: notes || "",
    });

    // Create Notification for Pemilik Kos
    const notif = await Notification.create({
      userId: kost.ownerId,
      title: "🔔 Pembayaran DP Masuk!",
      message: `${customerName} telah membayar DP Rp ${Number(dpAmount).toLocaleString("id-ID")} untuk kamar ${roomNumber || ""} di '${kost.name}'. Segera verifikasi!`,
      type: "booking_new",
      relatedId: booking._id,
    });

    // Realtime broadcast if socket.io is available
    if (req.io) {
      req.io.emit(`owner_notif_${kost.ownerId}`, {
        type: "NEW_DP_BOOKING",
        booking,
        notification: notif,
      });
      req.io.emit("new_dp_booking", {
        booking,
        kostName: kost.name,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Pemesanan kost berhasil dibuat & DP berhasil dikirim ke pemilik kost",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Create booking error:", error);
    return res.status(500).json({ success: false, message: "Gagal membuat booking", error: error.message });
  }
};

// Get all bookings for Pemilik Kos (Verifikasi DP page)
const getBookingsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { status } = req.query;

    let filter = {};
    if (ownerId && ownerId !== "all") {
      if (ownerId.match(/^[0-9a-fA-F]{24}$/)) {
        filter.ownerId = ownerId;
      } else {
        // Find owner user by email
        const ownerUser = await User.findOne({
          $or: [{ email: ownerId }, { email: "aisk@gmail.com" }, { email: "aisl@gmail.com" }],
        });
        if (ownerUser) {
          filter.ownerId = ownerUser._id;
        }
      }
    }

    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate("kostId", "name address type images bankAccount facilities")
      .populate("customerId", "name email phone profilePhoto")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("❌ Get owner bookings error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar booking", error: error.message });
  }
};

// Verify DP (Accept or Reject) by Pemilik Kos
const verifyDpBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // status: "dp_verified" or "rejected"

    const booking = await Booking.findById(id).populate("kostId");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Pemesanan tidak ditemukan" });
    }

    booking.status = status;
    booking.verifiedAt = new Date();

    if (status === "rejected") {
      booking.rejectionReason = rejectionReason || "Bukti transfer tidak valid atau kamar telah terisi.";
    } else if (status === "dp_verified") {
      booking.rejectionReason = undefined;

      // Update room availability in Kost
      if (booking.kostId) {
        const kostIdToUpdate = booking.kostId._id || booking.kostId;
        const tenantData = {
          userId: booking.customerId,
          name: booking.customerName,
          phone: booking.customerPhone,
          entryDate: booking.entryDate,
          dueDate: new Date(new Date(booking.entryDate).setMonth(new Date(booking.entryDate).getMonth() + (booking.durationMonths || 1))),
        };

        // Try updating by roomId first, then roomNumber
        let updateRes = await Kost.updateOne(
          { _id: kostIdToUpdate, "rooms._id": booking.roomId },
          {
            $set: {
              "rooms.$.isAvailable": false,
              "rooms.$.currentTenant": tenantData,
            },
          }
        );

        if (updateRes.matchedCount === 0 && booking.roomNumber) {
          await Kost.updateOne(
            { _id: kostIdToUpdate, "rooms.roomNumber": booking.roomNumber },
            {
              $set: {
                "rooms.$.isAvailable": false,
                "rooms.$.currentTenant": tenantData,
              },
            }
          );
        }
      }
    }

    await booking.save();

    // Create Notification for Customer
    const notifTitle = status === "dp_verified" ? "✅ DP Kost Dikonfirmasi!" : "❌ DP Kost Ditolak";
    const notifMsg = status === "dp_verified"
      ? `Pembayaran DP Anda untuk ${booking.kostId?.name || "Kost"} telah diterima dan terverifikasi oleh pemilik kost!`
      : `Pembayaran DP Anda ditolak: ${booking.rejectionReason}`;

    const notif = await Notification.create({
      userId: booking.customerId,
      title: notifTitle,
      message: notifMsg,
      type: status === "dp_verified" ? "dp_verified" : "dp_rejected",
      relatedId: booking._id,
    });

    // Realtime broadcast to customer
    if (req.io) {
      req.io.emit(`customer_notif_${booking.customerId}`, {
        type: "DP_STATUS_UPDATE",
        booking,
        notification: notif,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Status DP berhasil diubah menjadi ${status}`,
      data: booking,
    });
  } catch (error) {
    console.error("❌ Verify DP error:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses verifikasi DP", error: error.message });
  }
};

// Get Bookings by Customer ID or Email
const getBookingsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    let query = {};
    if (customerId && customerId.match(/^[0-9a-fA-F]{24}$/)) {
      query = {
        $or: [
          { customerId },
          { customerEmail: customerId },
        ],
      };
    } else {
      query = {
        $or: [
          { customerEmail: customerId },
          { customerName: customerId },
          { customerPhone: customerId },
        ],
      };
    }

    const bookings = await Booking.find(query)
      .populate("kostId", "name address type images bankAccount facilities price")
      .populate("ownerId", "name phone email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("❌ Get customer bookings error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat booking customer", error: error.message });
  }
};

// Get Notifications for User
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(30);

    return res.status(200).json({
      success: true,
      data: notifs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createBooking,
  getBookingsByOwner,
  verifyDpBooking,
  getBookingsByCustomer,
  getUserNotifications,
};
