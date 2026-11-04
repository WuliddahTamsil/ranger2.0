/**
 * geoDirectController.js
 * Comprehensive Controller for PGE Geo Direct Use Service
 * Handles Catalog, Pricing Engine, Booking, Payments, Ledger, and Admin Approvals.
 */

const mongoose = require("mongoose");
const GeoDirectEquipment = require("../models/GeoDirectEquipment");
const GeoDirectBooking = require("../models/GeoDirectBooking");
const GeoDirectPaymentMethod = require("../models/GeoDirectPaymentMethod");
const GeoDirectDpLedger = require("../models/GeoDirectDpLedger");
const GeoDirectAuditLog = require("../models/GeoDirectAuditLog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { calculateRentalCost } = require("../services/geoDirectPricingEngine");

// Helper: Seed Default 4 Placeholder Equipments
async function ensureDefaultEquipments() {
  const count = await GeoDirectEquipment.countDocuments();
  if (count === 0) {
    const defaultList = [
      {
        code: "EQ-01",
        name: "Equipment 01",
        description:
          "Layanan penyewaan alat PGE Center of Excellence Kamojang (Menunggu spesifikasi teknis resmi dari PGE).",
        specification:
          "Spesifikasi teknis alat dapat dikonfigurasi melalui Dashboard Admin PGE.",
        function: "Pemanfaatan langsung energi panas bumi (Direct Use).",
        capacity: "Kapasitas operasional ditentukan oleh konfigurasi Admin PGE.",
        rentalTerms:
          "1. Penggunaan alat wajib mematuhi SOP Keselamatan Kerja PGE Kamojang.\n2. Customer wajib membawa Nota Sewa Resmi yang disetujui.\n3. Pembayaran DP wajib diverifikasi oleh Admin.",
        imageUrl: "",
        isAvailable: true,
        isActive: true,
        basePrice: 0,
        pricingUnit: "per_hari",
        dpPercentage: 30,
        pricingFormulaType: "STANDARD_DAILY",
        productionParameters: [
          {
            paramKey: "productType",
            paramLabel: "Jenis Produk / Komoditas",
            paramType: "select",
            options: ["Teh", "Kopi", "Essential Oil", "Jamur", "Lainnya"],
            required: true,
            helperText: "Pilih komoditas yang akan diolah",
          },
          {
            paramKey: "rawMaterialTons",
            paramLabel: "Kapasitas Bahan Baku (Ton)",
            paramType: "number",
            unit: "ton",
            required: true,
            ratePerUnit: 0,
            helperText: "Estimasi volume bahan baku yang diproses",
          },
        ],
      },
      {
        code: "EQ-02",
        name: "Equipment 02",
        description:
          "Layanan penyewaan alat PGE Center of Excellence Kamojang (Menunggu spesifikasi teknis resmi dari PGE).",
        specification:
          "Spesifikasi teknis alat dapat dikonfigurasi melalui Dashboard Admin PGE.",
        function: "Pemanfaatan langsung energi panas bumi (Direct Use).",
        capacity: "Kapasitas operasional ditentukan oleh konfigurasi Admin PGE.",
        rentalTerms:
          "1. Mematuhi standar K3 PGE Area Kamojang.\n2. Wajib verifikasi identitas dan nota booking.",
        imageUrl: "",
        isAvailable: true,
        isActive: true,
        basePrice: 0,
        pricingUnit: "per_hari",
        dpPercentage: 30,
        pricingFormulaType: "STANDARD_DAILY",
        productionParameters: [
          {
            paramKey: "productType",
            paramLabel: "Jenis Produk",
            paramType: "select",
            options: ["Teh", "Kopi", "Pengeringan Pangan", "Lainnya"],
            required: true,
          },
          {
            paramKey: "rawMaterialTons",
            paramLabel: "Volume Bahan (Ton)",
            paramType: "number",
            unit: "ton",
            required: true,
          },
        ],
      },
      {
        code: "EQ-03",
        name: "Equipment 03",
        description:
          "Layanan penyewaan alat PGE Center of Excellence Kamojang (Menunggu spesifikasi teknis resmi dari PGE).",
        specification:
          "Spesifikasi teknis alat dapat dikonfigurasi melalui Dashboard Admin PGE.",
        function: "Pemanfaatan langsung energi panas bumi (Direct Use).",
        capacity: "Kapasitas operasional ditentukan oleh konfigurasi Admin PGE.",
        rentalTerms:
          "1. Mematuhi standar K3 PGE Area Kamojang.\n2. Wajib verifikasi identitas dan nota booking.",
        imageUrl: "",
        isAvailable: true,
        isActive: true,
        basePrice: 0,
        pricingUnit: "per_hari",
        dpPercentage: 30,
        pricingFormulaType: "STANDARD_DAILY",
        productionParameters: [
          {
            paramKey: "productType",
            paramLabel: "Komoditas",
            paramType: "text",
            required: true,
          },
          {
            paramKey: "rawMaterialTons",
            paramLabel: "Kapasitas (Ton)",
            paramType: "number",
            unit: "ton",
            required: true,
          },
        ],
      },
      {
        code: "EQ-04",
        name: "Equipment 04",
        description:
          "Layanan penyewaan alat PGE Center of Excellence Kamojang (Menunggu spesifikasi teknis resmi dari PGE).",
        specification:
          "Spesifikasi teknis alat dapat dikonfigurasi melalui Dashboard Admin PGE.",
        function: "Pemanfaatan langsung energi panas bumi (Direct Use).",
        capacity: "Kapasitas operasional ditentukan oleh konfigurasi Admin PGE.",
        rentalTerms:
          "1. Mematuhi standar K3 PGE Area Kamojang.\n2. Wajib verifikasi identitas dan nota booking.",
        imageUrl: "",
        isAvailable: true,
        isActive: true,
        basePrice: 0,
        pricingUnit: "per_hari",
        dpPercentage: 30,
        pricingFormulaType: "STANDARD_DAILY",
        productionParameters: [
          {
            paramKey: "productType",
            paramLabel: "Komoditas",
            paramType: "text",
            required: true,
          },
          {
            paramKey: "rawMaterialTons",
            paramLabel: "Kapasitas (Ton)",
            paramType: "number",
            unit: "ton",
            required: true,
          },
        ],
      },
    ];

    await GeoDirectEquipment.insertMany(defaultList);
  }
}

// Helper: Get or Init Payment Methods
async function getOrCreatePaymentSettings() {
  let settings = await GeoDirectPaymentMethod.findOne({
    key: "DEFAULT_SETTINGS",
  });
  if (!settings) {
    settings = await GeoDirectPaymentMethod.create({
      key: "DEFAULT_SETTINGS",
      qrisEnabled: false,
      qrisImageUrl: "",
      qrisMerchantName: "PGE Area Kamojang - Geo Direct Use",
      bankAccounts: [
        {
          bankName: "Bank Mandiri",
          accountNumber: "131-00-1234567-8",
          accountHolder: "PT Pertamina Geothermal Energy Tbk",
          branch: "Area Kamojang",
          isActive: true,
        },
      ],
      paymentInstructions:
        "1. Lakukan transfer DP sesuai nominal yang tertera.\n2. Pastikan nominal dan nomor rekening tujuan tepat.\n3. Simpan dan unggah bukti transfer yang jelas.\n4. Tim Admin PGE akan melakukan verifikasi berkas dan pembayaran.",
      paymentDeadlineHours: 24,
    });
  }
  return settings;
}

// Helper: Calculate Customer DP Balance from Ledger
async function calculateCustomerDpBalance(customerId) {
  if (!customerId) return 0;
  const entries = await GeoDirectDpLedger.find({ customer: customerId }).sort({
    createdAt: 1,
  });
  let balance = 0;
  for (const entry of entries) {
    if (entry.transactionType === "CREDIT_FROM_REJECTION" || entry.transactionType === "MANUAL_ADJUSTMENT") {
      balance += entry.amount;
    } else if (entry.transactionType === "DEBIT_APPLIED_TO_BOOKING") {
      balance = Math.max(0, balance - entry.amount);
    }
  }
  return balance;
}

// Helper: Send in-app notification
async function sendSystemNotification({ userId, title, message, relatedId }) {
  try {
    if (!userId) return;
    await Notification.create({
      userId,
      title,
      message,
      type: "booking_new",
      relatedId,
      isRead: false,
    });
  } catch (err) {
    console.warn("⚠️ Failed to send in-app notification:", err.message);
  }
}

// ==========================================
// 1. CATALOG & EQUIPMENT CONTROLLERS
// ==========================================

exports.getEquipments = async (req, res) => {
  try {
    await ensureDefaultEquipments();
    const query = req.authUser?.role === "admin" ? {} : { isActive: true };
    const equipments = await GeoDirectEquipment.find(query).sort({ code: 1 });
    return res.status(200).json({
      success: true,
      data: equipments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat katalog alat Geo Direct Use: " + error.message,
    });
  }
};

exports.getEquipmentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    let equipment = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      equipment = await GeoDirectEquipment.findById(id);
    } else {
      equipment = await GeoDirectEquipment.findOne({
        code: String(id).toUpperCase(),
      });
    }

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Alat Geo Direct Use tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat detail alat: " + error.message,
    });
  }
};

exports.adminCreateEquipment = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      specification,
      function: funcText,
      capacity,
      rentalTerms,
      imageUrl,
      basePrice,
      pricingUnit,
      dpPercentage,
      pricingFormulaType,
      productionParameters,
      isAvailable,
      isActive,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Kode alat dan Nama alat wajib diisi.",
      });
    }

    const existing = await GeoDirectEquipment.findOne({
      code: String(code).trim().toUpperCase(),
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Alat dengan kode '${code}' sudah terdaftar.`,
      });
    }

    const equipment = await GeoDirectEquipment.create({
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      description,
      specification,
      function: funcText,
      capacity,
      rentalTerms,
      imageUrl: imageUrl || "",
      basePrice: Number(basePrice) || 0,
      pricingUnit: pricingUnit || "per_hari",
      dpPercentage: Number(dpPercentage) !== undefined ? Number(dpPercentage) : 30,
      pricingFormulaType: pricingFormulaType || "STANDARD_DAILY",
      productionParameters: Array.isArray(productionParameters) ? productionParameters : [],
      isAvailable: isAvailable !== false,
      isActive: isActive !== false,
      updatedBy: req.authUser?._id,
    });

    await GeoDirectAuditLog.create({
      action: "EQUIPMENT_CREATED",
      actor: req.authUser?._id,
      actorRole: "admin",
      actorName: req.authUser?.name || "Admin PGE",
      notes: `Alat ${equipment.code} - ${equipment.name} berhasil dibuat.`,
      metadata: { equipmentId: equipment._id, code: equipment.code },
    });

    return res.status(201).json({
      success: true,
      message: "Alat baru berhasil ditambahkan.",
      data: equipment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal membuat alat: " + error.message,
    });
  }
};

exports.adminUpdateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: req.authUser?._id };
    if (updateData.code) {
      updateData.code = String(updateData.code).trim().toUpperCase();
    }

    const equipment = await GeoDirectEquipment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Alat tidak ditemukan.",
      });
    }

    await GeoDirectAuditLog.create({
      action: "EQUIPMENT_UPDATED",
      actor: req.authUser?._id,
      actorRole: "admin",
      actorName: req.authUser?.name || "Admin PGE",
      notes: `Konfigurasi alat ${equipment.code} diperbarui oleh Admin.`,
      metadata: { equipmentId: equipment._id, updates: updateData },
    });

    return res.status(200).json({
      success: true,
      message: "Data alat berhasil diperbarui.",
      data: equipment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui alat: " + error.message,
    });
  }
};

exports.adminDeleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const equipment = await GeoDirectEquipment.findById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Alat tidak ditemukan.",
      });
    }

    // Check if bookings exist for this equipment
    const activeBookings = await GeoDirectBooking.countDocuments({
      equipment: equipment._id,
      bookingStatus: { $in: ["WAITING_PAYMENT", "PAYMENT_REVIEW", "WAITING_APPROVAL", "APPROVED"] },
    });

    if (activeBookings > 0) {
      // Soft delete / deactivate instead of hard delete
      equipment.isActive = false;
      equipment.isAvailable = false;
      await equipment.save();
      return res.status(200).json({
        success: true,
        message: "Alat memiliki transaksi aktif. Status alat dinonaktifkan.",
        data: equipment,
      });
    }

    await GeoDirectEquipment.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Alat berhasil dihapus.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus alat: " + error.message,
    });
  }
};

// ==========================================
// 2. PRICING ENGINE CONTROLLER
// ==========================================

exports.calculateRentalPrice = async (req, res) => {
  try {
    const { equipmentId, durationDays, productionNeeds } = req.body;
    if (!equipmentId) {
      return res.status(400).json({
        success: false,
        message: "Pilih alat terlebih dahulu.",
      });
    }

    const equipment = await GeoDirectEquipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Alat tidak ditemukan.",
      });
    }

    let customerDpBalance = 0;
    if (req.authUser?._id) {
      customerDpBalance = await calculateCustomerDpBalance(req.authUser._id);
    }

    const calculation = calculateRentalCost(equipment, {
      durationDays,
      productionNeeds,
      customerDpBalance,
    });

    return res.status(200).json({
      success: true,
      data: {
        equipment: {
          id: equipment._id,
          code: equipment.code,
          name: equipment.name,
          basePrice: equipment.basePrice,
          dpPercentage: equipment.dpPercentage,
          pricingUnit: equipment.pricingUnit,
        },
        calculation,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghitung kalkulasi harga: " + error.message,
    });
  }
};

// ==========================================
// 3. PAYMENT METHODS CONTROLLERS
// ==========================================

exports.getPaymentMethods = async (req, res) => {
  try {
    const settings = await getOrCreatePaymentSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat metode pembayaran: " + error.message,
    });
  }
};

exports.adminUpdatePaymentMethods = async (req, res) => {
  try {
    const {
      qrisEnabled,
      qrisImageUrl,
      qrisMerchantName,
      qrisNmid,
      bankAccounts,
      paymentInstructions,
      paymentDeadlineHours,
    } = req.body;

    let settings = await getOrCreatePaymentSettings();
    if (qrisEnabled !== undefined) settings.qrisEnabled = Boolean(qrisEnabled);
    if (qrisImageUrl !== undefined) settings.qrisImageUrl = qrisImageUrl;
    if (qrisMerchantName !== undefined) settings.qrisMerchantName = qrisMerchantName;
    if (qrisNmid !== undefined) settings.qrisNmid = qrisNmid;
    if (Array.isArray(bankAccounts)) settings.bankAccounts = bankAccounts;
    if (paymentInstructions !== undefined) settings.paymentInstructions = paymentInstructions;
    if (paymentDeadlineHours !== undefined)
      settings.paymentDeadlineHours = Math.max(1, Number(paymentDeadlineHours) || 24);
    settings.updatedBy = req.authUser?._id;

    await settings.save();

    await GeoDirectAuditLog.create({
      action: "PAYMENT_METHOD_CONFIG_UPDATED",
      actor: req.authUser?._id,
      actorRole: "admin",
      actorName: req.authUser?.name || "Admin PGE",
      notes: "Konfigurasi metode pembayaran QRIS & rekening bank diperbarui.",
    });

    return res.status(200).json({
      success: true,
      message: "Metode pembayaran berhasil diperbarui.",
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui metode pembayaran: " + error.message,
    });
  }
};

// ==========================================
// 4. BOOKING & DP FLOW CONTROLLERS
// ==========================================

exports.createBooking = async (req, res) => {
  try {
    const customerId = req.authUser?._id;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi diperlukan untuk melakukan booking.",
      });
    }

    const {
      equipmentId,
      customerSnapshot,
      rentalSchedule,
      usagePurpose,
      usageLocation,
      notes,
      productionNeeds,
      applyDpCredit,
    } = req.body;

    if (!equipmentId) {
      return res.status(400).json({
        success: false,
        message: "Alat yang dipilih wajib dicantumkan.",
      });
    }

    if (!usagePurpose || !usageLocation) {
      return res.status(400).json({
        success: false,
        message: "Tujuan dan lokasi penggunaan wajib diisi.",
      });
    }

    if (!rentalSchedule?.startDate || !rentalSchedule?.endDate) {
      return res.status(400).json({
        success: false,
        message: "Tanggal mulai dan selesai sewa wajib diisi.",
      });
    }

    const start = new Date(rentalSchedule.startDate);
    const end = new Date(rentalSchedule.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({
        success: false,
        message: "Rentang tanggal sewa tidak valid.",
      });
    }

    const diffMs = end.getTime() - start.getTime();
    const durationDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1);

    const equipment = await GeoDirectEquipment.findById(equipmentId);
    if (!equipment || !equipment.isActive) {
      return res.status(404).json({
        success: false,
        message: "Alat tidak ditemukan atau sedang tidak aktif.",
      });
    }

    // Resolve Customer DP Balance
    const availableCredit = await calculateCustomerDpBalance(customerId);
    const useCredit = applyDpCredit !== false && availableCredit > 0;

    // Run backend calculation engine
    const calculation = calculateRentalCost(equipment, {
      durationDays,
      productionNeeds,
      customerDpBalance: useCredit ? availableCredit : 0,
    });

    // Generate unique Booking Code
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `GDU-${todayStr}-${randomSuffix}`;

    // Resolve Customer Profile snapshot
    const user = await User.findById(customerId).lean();
    const resolvedCustomer = {
      name: customerSnapshot?.name || user?.name || "Customer PGE",
      email: customerSnapshot?.email || user?.email || "",
      phone: customerSnapshot?.phone || user?.phone || user?.phoneNumber || "",
      company: customerSnapshot?.company || user?.company || "",
      address: customerSnapshot?.address || user?.address || "",
    };

    if (!resolvedCustomer.phone) {
      return res.status(400).json({
        success: false,
        message: "Nomor telepon customer wajib dicantumkan.",
      });
    }

    // Determine initial booking and payment status
    let initialBookingStatus = "WAITING_PAYMENT";
    let initialPaymentStatus = "UNPAID";
    let appliedLedgerAmount = 0;

    if (calculation.netDpDue === 0 && calculation.dpCreditApplied > 0) {
      // DP fully covered by verified balance from rejected booking!
      initialBookingStatus = "WAITING_APPROVAL";
      initialPaymentStatus = "VERIFIED";
      appliedLedgerAmount = calculation.dpCreditApplied;
    }

    // Create Booking
    const booking = await GeoDirectBooking.create({
      bookingCode,
      customer: customerId,
      customerSnapshot: resolvedCustomer,
      equipment: equipment._id,
      equipmentSnapshot: {
        code: equipment.code,
        name: equipment.name,
        description: equipment.description,
        imageUrl: equipment.imageUrl,
        basePrice: equipment.basePrice,
        pricingUnit: equipment.pricingUnit,
      },
      rentalSchedule: {
        startDate: start,
        endDate: end,
        durationDays,
      },
      usagePurpose,
      usageLocation,
      notes: notes || "",
      productionNeeds: productionNeeds || {},
      pricingSnapshot: {
        basePrice: calculation.basePrice,
        durationDays: calculation.durationDays,
        subtotalBase: calculation.subtotalBase,
        productionAddonRate: calculation.productionAddonRate,
        productionAddonTotal: calculation.productionAddonTotal,
        totalRentalCost: calculation.totalRentalCost,
        dpPercentage: calculation.dpPercentage,
        requiredDpAmount: calculation.requiredDpAmount,
        dpCreditApplied: calculation.dpCreditApplied,
        netDpDue: calculation.netDpDue,
        remainingBalance: calculation.remainingBalance,
        formulaApplied: calculation.formulaApplied,
      },
      bookingStatus: initialBookingStatus,
      paymentStatus: initialPaymentStatus,
      paymentProof:
        initialPaymentStatus === "VERIFIED"
          ? {
              fileUrl: "",
              fileName: "DP_CREDIT_LEDGER",
              fileType: "LEDGER_CREDIT",
              uploadedAt: new Date(),
              paymentMethodType: "DP_BALANCE",
            }
          : { paymentMethodType: "NONE" },
    });

    // If DP Credit was applied, deduct from Ledger
    if (appliedLedgerAmount > 0) {
      const remainingCustBalance = availableCredit - appliedLedgerAmount;
      await GeoDirectDpLedger.create({
        customer: customerId,
        transactionType: "DEBIT_APPLIED_TO_BOOKING",
        amount: appliedLedgerAmount,
        targetBooking: booking._id,
        balanceAfter: remainingCustBalance,
        notes: `Penggunaan saldo DP kredit untuk booking ${booking.bookingCode}`,
        performedBy: customerId,
        idempotencyKey: `DEBIT_${booking._id}_${appliedLedgerAmount}`,
      });
    }

    // Audit Log
    await GeoDirectAuditLog.create({
      action: "BOOKING_CREATED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: customerId,
      actorRole: "customer",
      actorName: resolvedCustomer.name,
      newStatus: {
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
      },
      notes: `Booking diajukan oleh customer. Net DP: Rp ${calculation.netDpDue}`,
      metadata: { calculation },
    });

    // Notify Customer
    await sendSystemNotification({
      userId: customerId,
      title: "Booking Geo Direct Use Berhasil Dibuat",
      message: `Booking ${booking.bookingCode} berhasil diajukan. Nominal DP: Rp ${calculation.netDpDue.toLocaleString(
        "id-ID"
      )}.`,
      relatedId: booking._id,
    });

    return res.status(201).json({
      success: true,
      message: "Pengajuan sewa alat berhasil dibuat.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal membuat booking: " + error.message,
    });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const customerId = req.authUser?._id;
    const bookings = await GeoDirectBooking.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate("equipment");

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat riwayat booking: " + error.message,
    });
  }
};

exports.getBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    let booking = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      booking = await GeoDirectBooking.findById(id).populate("equipment");
    } else {
      booking = await GeoDirectBooking.findOne({ bookingCode: id }).populate("equipment");
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    // Authorization: customer can only view their own booking
    if (
      req.authUser?.role !== "admin" &&
      String(booking.customer) !== String(req.authUser?._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak berhak melihat transaksi ini.",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat detail booking: " + error.message,
    });
  }
};

exports.uploadPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.authUser?._id;
    const { fileUrl, fileName, fileType, paymentMethodType, transferToBank } = req.body;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Bukti transfer pembayaran wajib diunggah.",
      });
    }

    const booking = await GeoDirectBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    if (String(booking.customer) !== String(customerId) && req.authUser?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    if (booking.bookingStatus === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Booking sudah disetujui, bukti pembayaran tidak dapat diubah.",
      });
    }

    const prevBookingStatus = booking.bookingStatus;
    const prevPaymentStatus = booking.paymentStatus;

    // Update Payment Proof
    booking.paymentProof = {
      fileUrl,
      fileName: fileName || "bukti_pembayaran.jpg",
      fileType: fileType || "image/jpeg",
      uploadedAt: new Date(),
      paymentMethodType: paymentMethodType || "BANK_TRANSFER",
      transferToBank: transferToBank || "",
    };

    booking.paymentStatus = "WAITING_VERIFICATION";
    booking.bookingStatus = "PAYMENT_REVIEW";
    await booking.save();

    await GeoDirectAuditLog.create({
      action: "PAYMENT_PROOF_UPLOADED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: customerId,
      actorRole: "customer",
      actorName: req.authUser?.name || "Customer",
      previousStatus: { bookingStatus: prevBookingStatus, paymentStatus: prevPaymentStatus },
      newStatus: { bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus },
      notes: "Customer mengunggah bukti pembayaran DP.",
    });

    // Notify Customer
    await sendSystemNotification({
      userId: customerId,
      title: "Bukti Pembayaran DP Terkirim",
      message: `Bukti transfer untuk booking ${booking.bookingCode} berhasil dikirim. Menunggu verifikasi tim Admin PGE.`,
      relatedId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Bukti pembayaran berhasil diunggah. Menunggu verifikasi Admin.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengunggah bukti pembayaran: " + error.message,
    });
  }
};

exports.resubmitBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.authUser?._id;
    const {
      rentalSchedule,
      usagePurpose,
      usageLocation,
      notes,
      productionNeeds,
    } = req.body;

    const booking = await GeoDirectBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    if (String(booking.customer) !== String(customerId)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    if (booking.bookingStatus !== "REJECTED") {
      return res.status(400).json({
        success: false,
        message: "Hanya booking dengan status REJECTED yang dapat diajukan ulang.",
      });
    }

    const equipment = await GeoDirectEquipment.findById(booking.equipment);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Data alat tidak ditemukan.",
      });
    }

    // Save previous snapshot into revision history
    booking.revisionHistory.push({
      revisionIndex: (booking.revisionHistory.length || 0) + 1,
      rejectionReason: booking.approvalDetails?.rejectionReason || "Revisi formulir",
      rejectedAt: booking.approvalDetails?.approvedAt || new Date(),
      rejectedByName: booking.approvalDetails?.approvedByName || "Admin PGE",
      resubmittedAt: new Date(),
      previousSnapshot: {
        rentalSchedule: booking.rentalSchedule,
        usagePurpose: booking.usagePurpose,
        usageLocation: booking.usageLocation,
        productionNeeds: booking.productionNeeds,
        pricingSnapshot: booking.pricingSnapshot,
      },
    });

    // Re-calculate
    let durationDays = booking.rentalSchedule.durationDays;
    if (rentalSchedule?.startDate && rentalSchedule?.endDate) {
      const start = new Date(rentalSchedule.startDate);
      const end = new Date(rentalSchedule.endDate);
      booking.rentalSchedule.startDate = start;
      booking.rentalSchedule.endDate = end;
      durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1);
      booking.rentalSchedule.durationDays = durationDays;
    }

    if (usagePurpose) booking.usagePurpose = usagePurpose;
    if (usageLocation) booking.usageLocation = usageLocation;
    if (notes !== undefined) booking.notes = notes;
    if (productionNeeds) booking.productionNeeds = productionNeeds;

    // Check customer available DP balance
    const availableCredit = await calculateCustomerDpBalance(customerId);
    const calculation = calculateRentalCost(equipment, {
      durationDays,
      productionNeeds: booking.productionNeeds,
      customerDpBalance: availableCredit,
    });

    booking.pricingSnapshot = {
      basePrice: calculation.basePrice,
      durationDays: calculation.durationDays,
      subtotalBase: calculation.subtotalBase,
      productionAddonRate: calculation.productionAddonRate,
      productionAddonTotal: calculation.productionAddonTotal,
      totalRentalCost: calculation.totalRentalCost,
      dpPercentage: calculation.dpPercentage,
      requiredDpAmount: calculation.requiredDpAmount,
      dpCreditApplied: calculation.dpCreditApplied,
      netDpDue: calculation.netDpDue,
      remainingBalance: calculation.remainingBalance,
      formulaApplied: calculation.formulaApplied,
    };

    if (calculation.netDpDue === 0 && calculation.dpCreditApplied > 0) {
      booking.bookingStatus = "WAITING_APPROVAL";
      booking.paymentStatus = "VERIFIED";

      // Deduct applied amount from ledger
      const remaining = availableCredit - calculation.dpCreditApplied;
      await GeoDirectDpLedger.create({
        customer: customerId,
        transactionType: "DEBIT_APPLIED_TO_BOOKING",
        amount: calculation.dpCreditApplied,
        targetBooking: booking._id,
        balanceAfter: remaining,
        notes: `Penggunaan saldo DP kredit untuk revisi pengajuan ${booking.bookingCode}`,
        performedBy: customerId,
        idempotencyKey: `RESUBMIT_${booking._id}_${Date.now()}`,
      });
    } else {
      booking.bookingStatus = "WAITING_PAYMENT";
      booking.paymentStatus = "UNPAID";
    }

    await booking.save();

    await GeoDirectAuditLog.create({
      action: "BOOKING_RESUBMITTED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: customerId,
      actorRole: "customer",
      actorName: req.authUser?.name || "Customer",
      newStatus: { bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus },
      notes: "Customer mengajukan perbaikan data booking.",
    });

    return res.status(200).json({
      success: true,
      message: "Pengajuan revisi berhasil dikirim.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengajukan ulang: " + error.message,
    });
  }
};

// ==========================================
// 5. CUSTOMER DP LEDGER CONTROLLERS
// ==========================================

exports.getCustomerDpBalanceInfo = async (req, res) => {
  try {
    const customerId = req.authUser?._id;
    const balance = await calculateCustomerDpBalance(customerId);
    const ledger = await GeoDirectDpLedger.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate("sourceBooking targetBooking");

    return res.status(200).json({
      success: true,
      data: {
        balance,
        history: ledger,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat saldo DP: " + error.message,
    });
  }
};

// ==========================================
// 6. ADMIN DASHBOARD & APPROVAL CONTROLLERS
// ==========================================

exports.adminGetDashboardStats = async (req, res) => {
  try {
    const [
      totalEquipments,
      totalBookings,
      waitingPaymentCount,
      paymentReviewCount,
      waitingApprovalCount,
      approvedCount,
      rejectedCount,
    ] = await Promise.all([
      GeoDirectEquipment.countDocuments(),
      GeoDirectBooking.countDocuments(),
      GeoDirectBooking.countDocuments({ bookingStatus: "WAITING_PAYMENT" }),
      GeoDirectBooking.countDocuments({ bookingStatus: "PAYMENT_REVIEW" }),
      GeoDirectBooking.countDocuments({ bookingStatus: "WAITING_APPROVAL" }),
      GeoDirectBooking.countDocuments({ bookingStatus: "APPROVED" }),
      GeoDirectBooking.countDocuments({ bookingStatus: "REJECTED" }),
    ]);

    // Financial calculations: GMV & Verified DP
    const financialAggregation = await GeoDirectBooking.aggregate([
      {
        $group: {
          _id: null,
          totalGmv: { $sum: "$pricingSnapshot.totalRentalCost" },
          totalVerifiedDp: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "VERIFIED"] },
                "$pricingSnapshot.requiredDpAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = {
      totalEquipments,
      totalBookings,
      waitingPaymentCount,
      paymentReviewCount,
      waitingApprovalCount,
      approvedCount,
      rejectedCount,
      totalGmv: financialAggregation[0]?.totalGmv || 0,
      totalVerifiedDp: financialAggregation[0]?.totalVerifiedDp || 0,
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat statistik Geo Direct Use: " + error.message,
    });
  }
};

exports.adminGetAllBookings = async (req, res) => {
  try {
    const { status, paymentStatus, search, equipmentId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "ALL") {
      query.bookingStatus = status;
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      query.paymentStatus = paymentStatus;
    }
    if (equipmentId) {
      query.equipment = equipmentId;
    }
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { bookingCode: regex },
        { "customerSnapshot.name": regex },
        { "customerSnapshot.company": regex },
        { "customerSnapshot.phone": regex },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [bookings, totalCount] = await Promise.all([
      GeoDirectBooking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("equipment"),
      GeoDirectBooking.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        totalCount,
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat daftar booking: " + error.message,
    });
  }
};

exports.adminVerifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.authUser?._id;
    const adminName = req.authUser?.name || "Administrator PGE";

    const booking = await GeoDirectBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    if (!booking.paymentProof?.fileUrl && booking.pricingSnapshot.netDpDue > 0) {
      return res.status(400).json({
        success: false,
        message: "Customer belum mengunggah bukti transfer pembayaran.",
      });
    }

    const prevBookingStatus = booking.bookingStatus;
    const prevPaymentStatus = booking.paymentStatus;

    booking.paymentStatus = "VERIFIED";
    booking.bookingStatus = "WAITING_APPROVAL";
    booking.verificationDetails = {
      verifiedBy: adminId,
      verifiedByName: adminName,
      verifiedAt: new Date(),
      rejectionReason: "",
    };

    await booking.save();

    await GeoDirectAuditLog.create({
      action: "PAYMENT_VERIFIED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: adminId,
      actorRole: "admin",
      actorName: adminName,
      previousStatus: { bookingStatus: prevBookingStatus, paymentStatus: prevPaymentStatus },
      newStatus: { bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus },
      notes: "Pembayaran DP diverifikasi oleh Admin PGE.",
    });

    await sendSystemNotification({
      userId: booking.customer,
      title: "Pembayaran DP Terverifikasi",
      message: `Pembayaran DP untuk booking ${booking.bookingCode} telah diverifikasi. Menunggu persetujuan (approval) sewa.`,
      relatedId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Pembayaran DP berhasil diverifikasi.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memverifikasi pembayaran: " + error.message,
    });
  }
};

exports.adminRejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.authUser?._id;
    const adminName = req.authUser?.name || "Administrator PGE";

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan bukti pembayaran wajib diisi.",
      });
    }

    const booking = await GeoDirectBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    const prevBookingStatus = booking.bookingStatus;
    const prevPaymentStatus = booking.paymentStatus;

    booking.paymentStatus = "REJECTED";
    booking.bookingStatus = "WAITING_PAYMENT";
    booking.verificationDetails = {
      verifiedBy: adminId,
      verifiedByName: adminName,
      verifiedAt: new Date(),
      rejectionReason: reason.trim(),
    };

    await booking.save();

    await GeoDirectAuditLog.create({
      action: "PAYMENT_REJECTED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: adminId,
      actorRole: "admin",
      actorName: adminName,
      previousStatus: { bookingStatus: prevBookingStatus, paymentStatus: prevPaymentStatus },
      newStatus: { bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus },
      notes: `Bukti transfer ditolak: ${reason.trim()}`,
    });

    await sendSystemNotification({
      userId: booking.customer,
      title: "Bukti Pembayaran Ditolak",
      message: `Bukti transfer untuk booking ${booking.bookingCode} tidak valid. Catatan: ${reason.trim()}`,
      relatedId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Bukti pembayaran ditolak.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menolak pembayaran: " + error.message,
    });
  }
};

exports.adminApproveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.authUser?._id;
    const adminName = req.authUser?.name || "Administrator PGE";

    const booking = await GeoDirectBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    // Must be verified payment first
    if (booking.paymentStatus !== "VERIFIED") {
      return res.status(400).json({
        success: false,
        message: "Booking tidak dapat disetujui sebelum pembayaran DP diverifikasi.",
      });
    }

    const prevBookingStatus = booking.bookingStatus;

    // Issue Formal Invoice / Nota ID
    const today = new Date();
    const yr = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, "0");
    const da = String(today.getDate()).padStart(2, "0");
    const invoiceNum = `NOTA-GDU/${yr}${mo}${da}/${booking.bookingCode.slice(-4)}`;

    booking.bookingStatus = "APPROVED";
    booking.approvalDetails = {
      approvedBy: adminId,
      approvedByName: adminName,
      approvedAt: new Date(),
      approvalNotes: notes || "Disetujui oleh Administrator PGE Kamojang.",
      rejectionReason: "",
    };

    booking.invoice = {
      invoiceNumber: invoiceNum,
      status: "ISSUED",
      issuedAt: new Date(),
      pdfUrl: "",
      revisionCount: (booking.invoice?.revisionCount || 0) + 1,
    };

    await booking.save();

    await GeoDirectAuditLog.create({
      action: "BOOKING_APPROVED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: adminId,
      actorRole: "admin",
      actorName: adminName,
      previousStatus: { bookingStatus: prevBookingStatus, paymentStatus: booking.paymentStatus },
      newStatus: { bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus },
      notes: `Pengajuan sewa disetujui. Nota diterbitkan: ${invoiceNum}`,
      metadata: { invoiceNumber: invoiceNum },
    });

    await sendSystemNotification({
      userId: booking.customer,
      title: "Pengajuan Sewa Disetujui! 🍃",
      message: `Penyewaan ${booking.equipmentSnapshot.name} (${booking.bookingCode}) telah disetujui! Nota resmi ${invoiceNum} telah diterbitkan dan siap diunduh.`,
      relatedId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: "Pengajuan sewa berhasil disetujui dan Nota resmi diterbitkan.",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menyetujui booking: " + error.message,
    });
  }
};

exports.adminRejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.authUser?._id;
    const adminName = req.authUser?.name || "Administrator PGE";

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan / catatan revisi wajib dicantumkan.",
      });
    }

    const booking = await GeoDirectBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Data booking tidak ditemukan.",
      });
    }

    if (booking.bookingStatus === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Booking yang sudah disetujui tidak dapat ditolak.",
      });
    }

    const prevBookingStatus = booking.bookingStatus;
    const prevPaymentStatus = booking.paymentStatus;

    booking.bookingStatus = "REJECTED";
    booking.approvalDetails = {
      approvedBy: adminId,
      approvedByName: adminName,
      approvedAt: new Date(),
      approvalNotes: "",
      rejectionReason: reason.trim(),
    };

    // FINANCIAL INTEGRITY (Phase 6):
    // If the customer already paid DP and payment was VERIFIED, credit that verified amount to customer DP Balance Ledger
    let creditedAmount = 0;
    if (prevPaymentStatus === "VERIFIED") {
      const verifiedAmount = booking.pricingSnapshot.requiredDpAmount || 0;
      if (verifiedAmount > 0) {
        // Idempotency check: Ensure we don't credit twice for this booking rejection
        const existingCredit = await GeoDirectDpLedger.findOne({
          sourceBooking: booking._id,
          transactionType: "CREDIT_FROM_REJECTION",
        });

        if (!existingCredit) {
          const currentBal = await calculateCustomerDpBalance(booking.customer);
          const newBal = currentBal + verifiedAmount;

          await GeoDirectDpLedger.create({
            customer: booking.customer,
            transactionType: "CREDIT_FROM_REJECTION",
            amount: verifiedAmount,
            sourceBooking: booking._id,
            balanceAfter: newBal,
            notes: `Saldo DP dari penolakan booking ${booking.bookingCode}. Alasan: ${reason.trim()}`,
            performedBy: adminId,
            idempotencyKey: `CREDIT_REJECT_${booking._id}`,
          });

          creditedAmount = verifiedAmount;
        }
      }
    }

    await booking.save();

    await GeoDirectAuditLog.create({
      action: "BOOKING_REJECTED",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      actor: adminId,
      actorRole: "admin",
      actorName: adminName,
      previousStatus: { bookingStatus: prevBookingStatus, paymentStatus: prevPaymentStatus },
      newStatus: { bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus },
      notes: `Pengajuan ditolak dengan alasan: ${reason.trim()}. Kredit DP tersimpan: Rp ${creditedAmount}`,
      metadata: { creditedAmount },
    });

    await sendSystemNotification({
      userId: booking.customer,
      title: "Pengajuan Sewa Memerlukan Revisi",
      message: `Pengajuan ${booking.bookingCode} memerlukan revisi. Catatan Admin: ${reason.trim()}. Saldo DP yang telah dibayar aman dan dapat digunakan untuk pengajuan ulang.`,
      relatedId: booking._id,
    });

    return res.status(200).json({
      success: true,
      message: `Pengajuan sewa ditolak dengan catatan revisi.${
        creditedAmount > 0
          ? ` Saldo DP Rp ${creditedAmount.toLocaleString("id-ID")} tersimpan di deposit kredit customer.`
          : ""
      }`,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menolak booking: " + error.message,
    });
  }
};

exports.adminGetDpLedgers = async (req, res) => {
  try {
    const { customerId } = req.query;
    const filter = customerId ? { customer: customerId } : {};
    const ledgers = await GeoDirectDpLedger.find(filter)
      .sort({ createdAt: -1 })
      .populate("customer", "name email phone")
      .populate("sourceBooking targetBooking");

    return res.status(200).json({
      success: true,
      data: ledgers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat ledger DP: " + error.message,
    });
  }
};

exports.adminGetAuditLogs = async (req, res) => {
  try {
    const { bookingId } = req.query;
    const filter = bookingId ? { bookingId } : {};
    const logs = await GeoDirectAuditLog.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat audit log: " + error.message,
    });
  }
};

