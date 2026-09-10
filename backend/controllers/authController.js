const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendMitraApprovalEmail, sendMitraRejectionEmail } = require("../services/emailService");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "rangers_app_secret", {
    expiresIn: "30d",
  });
};

// Register
const registerUser = async (req, res) => {
  try {
    const { role, name, email, phone, address, profilePhoto, password, googleProfile, roleData, documents } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ success: false, message: "Nama, email, dan role wajib diisi" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar. Silakan login." });
    }

    let passwordHash = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const finalRoleData = { ...roleData };
    if (role === "pemilik_catering" && finalRoleData.isDapurOpen === undefined) {
      finalRoleData.isDapurOpen = "true";
    }

    const user = await User.create({
      role,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      profilePhoto: profilePhoto || googleProfile?.photo || "",
      passwordHash,
      googleLinked: Boolean(googleProfile),
      status: role === "customer" || role === "admin" ? "verified" : "pending",
      roleData: finalRoleData,
      documents: documents || {},
    });

    if (role === "pemilik_laundry") {
      const LaundryStore = require("../models/LaundryStore");
      const storeName = finalRoleData?.businessName || user.name || "Toko Laundry Mitra";
      await LaundryStore.create({
        ownerId: user._id,
        storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
        description: finalRoleData?.description || "Layanan laundry profesional, cepat, bersih higienis, dan terpercaya.",
        address: user.address || finalRoleData?.businessAddress || "Jl. Kamojang, Garut",
        phone: user.phone || "",
        openingHours: "Buka • Tutup 21.00",
        isOpen: true,
        rating: 4.9,
        totalReviews: 10,
        distanceText: "0.5 km",
        imageUrl: user.profilePhoto || "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
        badges: ["Antar Jemput", "Ekspres 3 Jam", "Garansi Bersih"],
        services: [
          { name: "Cuci Komplit (Cuci + Setrika)", price: 6000, unit: "kg", desc: "Cuci, kering, setrika uap, pewangi & packing rapi", category: "biasa", durationHours: 24, isActive: true },
          { name: "Express 3 Jam (Siap Pakai)", price: 10000, unit: "kg", desc: "Prioritas khusus selesai dalam 3 jam", category: "ekspres", durationHours: 3, isActive: true },
          { name: "Cuci Kering Lipat", price: 4500, unit: "kg", desc: "Cuci higienis & lipat rapi tanpa setrika", category: "biasa", durationHours: 24, isActive: true },
          { name: "Setrika Uap Saja", price: 3500, unit: "kg", desc: "Setrika uap licin dan wangi tahan lama", category: "biasa", durationHours: 12, isActive: true },
          { name: "Cuci Bedcover Besar", price: 25000, unit: "pcs", desc: "Pembersihan menyeluruh bedcover/selimut besar", category: "satuan", durationHours: 48, isActive: true },
        ],
      }).catch(err => console.warn("Auto LaundryStore creation note:", err.message));
    }

    if (role === "pemilik_kos") {
      const Kost = require("../models/Kost");
      const kostName = finalRoleData?.businessName || user.name || "Kost Nyaman Eksklusif";
      let kostType = "Campur";
      if (finalRoleData?.propertyType?.toLowerCase().includes("putri")) kostType = "Putri";
      else if (finalRoleData?.propertyType?.toLowerCase().includes("putra")) kostType = "Putra";

      await Kost.create({
        ownerId: user._id,
        name: kostName.charAt(0).toUpperCase() + kostName.slice(1),
        type: kostType,
        address: user.address || finalRoleData?.businessAddress || "Jl. Kamojang No. 12, Garut",
        city: "Garut",
        district: "Kamojang",
        description: "Kos eksklusif nyaman, bersih, aman, dan berfasilitas lengkap untuk mahasiswa & pekerja.",
        price: 1200000,
        dpAmount: 300000,
        facilities: ["WiFi", "AC", "KM Dalam", "Kasur", "Lemari", "Meja Belajar", "Dapur Bersama", "Parkir Motor"],
        rules: ["Akses 24 Jam", "Dilarang Merokok di Kamar", "Tamu Lawan Jenis Maks Pukul 21.00"],
        images: [
          user.profilePhoto || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
        ],
        rooms: [
          { roomNumber: "101", type: "AC", price: 1200000, isAvailable: true, status: "tersedia" },
          { roomNumber: "102", type: "AC", price: 1200000, isAvailable: true, status: "tersedia" },
          { roomNumber: "103", type: "Non-AC", price: 800000, isAvailable: true, status: "tersedia" },
          { roomNumber: "104", type: "Non-AC", price: 800000, isAvailable: true, status: "tersedia" },
        ],
      }).catch(err => console.warn("Auto Kost creation note:", err.message));
    }

    return res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil",
      data: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
        googleLinked: user.googleLinked,
        status: user.status,
        roleData: user.roleData,
        documents: user.documents,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    return res.status(500).json({ success: false, message: "Gagal mendaftarkan akun", error: error.message });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password, googleProfile } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "Akun dengan email tersebut tidak ditemukan." });
    }

    // Google Login check
    if (googleProfile) {
      // Auto-link Google if not already linked
      let updated = false;
      if (!user.googleLinked) {
        user.googleLinked = true;
        updated = true;
      }
      if (!user.profilePhoto && googleProfile.photo) {
        user.profilePhoto = googleProfile.photo;
        updated = true;
      }
      if (updated) {
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Login berhasil dengan Google",
        data: {
          id: user._id,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          profilePhoto: user.profilePhoto,
          status: user.status,
          rejectionReason: user.rejectionReason,
          roleData: user.roleData,
          documents: user.documents,
          token: generateToken(user._id),
        },
      });
    }

    // Password check
    if (!password) {
      return res.status(400).json({ success: false, message: "Password wajib diisi." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Password salah. Silakan coba lagi." });
    }

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
        status: user.status,
        rejectionReason: user.rejectionReason,
        roleData: user.roleData,
        documents: user.documents,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ success: false, message: "Gagal login", error: error.message });
  }
};

// Admin: Get all mitra accounts (or include customer/user when requested)
const getMitraAccounts = async (req, res) => {
  try {
    const { role, status, includeCustomers } = req.query;
    let filter = {};

    if (role === "customer") {
      filter.role = "customer";
    } else if (includeCustomers === "true") {
      filter.role = { $ne: "admin" };
    } else if (role && role !== "semua") {
      filter.role = role;
    } else {
      filter.role = { $ne: "customer" };
    }

    if (status && status !== "semua") filter.status = status;

    const mitras = await User.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: mitras.length, data: mitras });
  } catch (error) {
    console.error("❌ Get mitra error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data mitra", error: error.message });
  }
};

// Admin: Get all platform users including customers & partners
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { role: { $ne: "admin" } };
    if (role && role !== "semua") filter.role = role;
    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error("❌ Get all users error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data pengguna", error: error.message });
  }
};

// Admin: Update mitra status (verified/rejected) & trigger email notification
const updateMitraStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Mitra tidak ditemukan." });
    }

    user.status = status;
    if (status === "rejected") {
      user.rejectionReason = rejectionReason || "Dokumen belum memenuhi persyaratan verifikasi.";
    } else {
      user.rejectionReason = undefined;
    }

    await user.save();

    // Trigger email notification automatically in the background
    if (status === "verified") {
      sendMitraApprovalEmail({
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch(err => console.warn("Email approval background error:", err));
    } else if (status === "rejected") {
      sendMitraRejectionEmail({
        email: user.email,
        name: user.name,
        role: user.role,
        reason: user.rejectionReason,
      }).catch(err => console.warn("Email rejection background error:", err));
    }

    return res.status(200).json({
      success: true,
      message: `Status mitra berhasil diubah menjadi ${status}. Notifikasi email telah dikirimkan ke ${user.email}.`,
      data: user,
    });
  } catch (error) {
    console.error("❌ Update mitra status error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengupdate status mitra", error: error.message });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan (Format ID tidak valid / Akun lokal)" });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil profil", error: error.message });
  }
};

// Update User Profile / roleData
const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Gagal: Akun ini disimpan secara lokal di browser Anda." 
      });
    }
    const { name, phone, address, profilePhoto, roleData } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

    if (roleData) {
      Object.keys(roleData).forEach((key) => {
        user.roleData.set(key, roleData[key]);
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: user,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui profil", error: error.message });
  }
};

// Admin System Stats (100% Real-time Live from MongoDB)
const getSystemStats = async (req, res) => {
  try {
    const MarketplaceOrder = require("../models/MarketplaceOrder");
    const CateringOrder = require("../models/CateringOrder");
    const LaundryOrder = require("../models/LaundryOrder");
    const Booking = require("../models/Booking");
    const Kost = require("../models/Kost");
    const LaundryStore = require("../models/LaundryStore");

    const [
      totalMitra,
      totalDrivers,
      totalCustomers,
      pendingMitra,
      approvedMitra,
      rejectedMitra,
      totalKostProps,
      totalLaundryStores,
      marketplaceOrders,
      cateringOrders,
      laundryOrders,
      bookings
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["pemilik_catering", "pemilik_marketplace", "pemilik_laundry", "pemilik_kos"] } }),
      User.countDocuments({ role: "driver" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ status: "pending", role: { $ne: "customer", $ne: "admin" } }),
      User.countDocuments({ status: "verified", role: { $in: ["pemilik_catering", "pemilik_marketplace", "pemilik_laundry", "pemilik_kos", "driver"] } }),
      User.countDocuments({ status: "rejected", role: { $ne: "customer", $ne: "admin" } }),
      Kost.countDocuments(),
      LaundryStore.countDocuments(),
      MarketplaceOrder.find({ status: { $ne: "Dibatalkan" } }).select("totalAmount createdAt orderNumber customerName storeName"),
      CateringOrder.find({ status: { $ne: "Dibatalkan" } }).select("totalAmount createdAt orderNumber customerName restaurantName"),
      LaundryOrder.find({ status: { $ne: "DIBATALKAN" } }).select("totalAmount createdAt orderCode customerName storeName serviceName"),
      Booking.find({ status: { $nin: ["rejected", "cancelled"] } }).select("totalAmount dpAmount createdAt bookingCode customerName kostName roomNumber status verifiedAt"),
    ]);

    const sumAmounts = (list) => list.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    const totalTransactionsAmount =
      sumAmounts(marketplaceOrders) +
      sumAmounts(cateringOrders) +
      sumAmounts(laundryOrders) +
      sumAmounts(bookings);

    const totalOrdersCount = marketplaceOrders.length + cateringOrders.length + laundryOrders.length + bookings.length;

    return res.status(200).json({
      success: true,
      data: {
        totalMitra,
        totalDrivers,
        totalCustomers,
        pendingMitra,
        approvedMitra,
        rejectedMitra,
        totalKostProps,
        totalLaundryStores,
        totalTransactionsAmount,
        totalOrdersCount,
        breakdown: {
          kost: { count: bookings.length, total: sumAmounts(bookings) },
          laundry: { count: laundryOrders.length, total: sumAmounts(laundryOrders) },
          catering: { count: cateringOrders.length, total: sumAmounts(cateringOrders) },
          marketplace: { count: marketplaceOrders.length, total: sumAmounts(marketplaceOrders) },
        },
      },
    });
  } catch (error) {
    console.error("❌ Get system stats error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil statistik sistem", error: error.message });
  }
};

// Admin: Get all transactions across platform
const getAllPlatformTransactions = async (req, res) => {
  try {
    const MarketplaceOrder = require("../models/MarketplaceOrder");
    const CateringOrder = require("../models/CateringOrder");
    const LaundryOrder = require("../models/LaundryOrder");
    const Booking = require("../models/Booking");

    const [marketplaceOrders, cateringOrders, laundryOrders, bookings] = await Promise.all([
      MarketplaceOrder.find().sort({ createdAt: -1 }).limit(30),
      CateringOrder.find().sort({ createdAt: -1 }).limit(30),
      LaundryOrder.find().sort({ createdAt: -1 }).limit(30),
      Booking.find().sort({ createdAt: -1 }).limit(30),
    ]);

    const allTx = [
      ...bookings.map(b => ({
        id: b._id,
        code: b.bookingCode || "BOOK-KST",
        service: "Kost",
        title: `Sewa Kost - ${b.kostName || "Kost"} (Kmr ${b.roomNumber || "101"})`,
        customer: b.customerName || "Customer",
        amount: Number(b.totalAmount || 0),
        status: b.status,
        date: b.createdAt,
        type: "booking",
      })),
      ...laundryOrders.map(l => ({
        id: l._id,
        code: l.orderCode || "LND-ORD",
        service: "Laundry",
        title: `Laundry - ${l.storeName || "Toko Laundry"} (${l.serviceName || "Cuci"})`,
        customer: l.customerName || "Customer",
        amount: Number(l.totalAmount || 0),
        status: l.status,
        date: l.createdAt,
        type: "laundry",
      })),
      ...cateringOrders.map(c => ({
        id: c._id,
        code: c.orderNumber || "CTR-ORD",
        service: "Catering",
        title: `Catering - ${c.restaurantName || "Dapur Catering"}`,
        customer: c.customerName || "Customer",
        amount: Number(c.totalAmount || 0),
        status: c.status,
        date: c.createdAt,
        type: "catering",
      })),
      ...marketplaceOrders.map(m => ({
        id: m._id,
        code: m.orderNumber || "MKT-ORD",
        service: "Marketplace",
        title: `Marketplace - ${m.storeName || "Toko Mitra"}`,
        customer: m.customerName || "Customer",
        amount: Number(m.totalAmount || 0),
        status: m.status,
        date: m.createdAt,
        type: "marketplace",
      })),
    ];

    // Sort newest first
    allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json({
      success: true,
      count: allTx.length,
      data: allTx,
    });
  } catch (error) {
    console.error("❌ Get all transactions error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil transaksi platform", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMitraAccounts,
  getAllUsers,
  updateMitraStatus,
  getUserProfile,
  updateUserProfile,
  getSystemStats,
  getAllPlatformTransactions,
};
