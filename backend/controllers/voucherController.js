const Voucher = require("../models/Voucher");

/**
 * 1. Get Available Vouchers for Point Redemption
 * GET /api/vouchers/available
 */
const getAvailableVouchers = async (req, res) => {
  try {
    const { service } = req.query;
    const filter = {
      status: "ACTIVE",
      validUntil: { $gte: new Date() },
    };

    if (service && service !== "ALL") {
      filter.$or = [{ service: "ALL" }, { service }];
    }

    const vouchers = await Voucher.find(filter)
      .sort({ pointsCost: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: vouchers,
    });
  } catch (error) {
    console.error("getAvailableVouchers error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat katalog voucher." });
  }
};

/**
 * 2. Get Vouchers Owned by Customer
 * GET /api/vouchers/my-vouchers
 */
const getCustomerVouchers = async (req, res) => {
  try {
    const customerId = req.authUser._id;
    const vouchers = await Voucher.find({
      "claimedBy.userId": customerId,
    }).lean();

    const formatted = vouchers.map((v) => {
      const claim = v.claimedBy.find((c) => String(c.userId) === String(customerId));
      const isExpired = new Date(v.validUntil) < new Date();
      return {
        ...v,
        isUsed: Boolean(claim?.used),
        usedAt: claim?.usedAt,
        claimedAt: claim?.claimedAt,
        isExpired,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getCustomerVouchers error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat voucher saya." });
  }
};

/**
 * 3. Validate Voucher for Checkout
 * POST /api/vouchers/validate
 */
const validateVoucher = async (req, res) => {
  try {
    const customerId = req.authUser._id;
    const { voucherCode, service = "ALL", transactionAmount = 0, deliveryFee = 0 } = req.body;

    if (!voucherCode) {
      return res.status(400).json({ success: false, message: "Kode voucher wajib diisi." });
    }

    const voucher = await Voucher.findOne({
      voucherCode: voucherCode.toUpperCase().trim(),
      status: "ACTIVE",
    });

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Kode voucher tidak valid atau sudah tidak aktif." });
    }

    if (new Date(voucher.validUntil) < new Date()) {
      return res.status(400).json({ success: false, message: "Masa berlaku voucher sudah habis." });
    }

    if (voucher.service !== "ALL" && voucher.service !== service) {
      return res.status(400).json({ success: false, message: `Voucher ini hanya berlaku untuk layanan ${voucher.service}.` });
    }

    if (transactionAmount < voucher.minTransaction) {
      return res.status(400).json({
        success: false,
        message: `Minimal transaksi untuk voucher ini adalah Rp ${voucher.minTransaction.toLocaleString("id-ID")}.`,
      });
    }

    let userClaim = voucher.claimedBy.find((c) => String(c.userId) === String(customerId));
    if (!userClaim) {
      // Auto-claim if voucher is public/free promo (pointsCost === 0)
      if ((voucher.pointsCost === 0 || !voucher.pointsCost) && (voucher.usageLimit || 1000) > (voucher.usedCount || 0)) {
        voucher.claimedBy.push({ userId: customerId, claimedAt: new Date(), used: false });
        await voucher.save();
        userClaim = voucher.claimedBy[voucher.claimedBy.length - 1];
      } else {
        return res.status(403).json({ success: false, message: "Anda belum menukarkan voucher ini dari GEOVERSE Point." });
      }
    }

    if (userClaim.used) {
      return res.status(400).json({ success: false, message: "Voucher ini sudah pernah Anda gunakan." });
    }

    let discount = voucher.discountValue;
    if (voucher.discountType === "PERCENTAGE") {
      discount = Math.round((transactionAmount * voucher.discountValue) / 100);
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else if (voucher.discountType === "FREE_SHIPPING") {
      const activeDeliveryFee = Number(deliveryFee) || 10000;
      discount = Math.min(activeDeliveryFee, voucher.discountValue);
    }

    return res.status(200).json({
      success: true,
      message: voucher.discountType === "FREE_SHIPPING" ? "Voucher Gratis Ongkir berhasil diterapkan!" : "Voucher diskon berhasil diterapkan!",
      data: {
        voucherCode: voucher.voucherCode,
        title: voucher.title,
        discountType: voucher.discountType,
        discountAmount: discount,
        discountValue: voucher.discountValue,
        minTransaction: voucher.minTransaction,
      },
    });
  } catch (error) {
    console.error("validateVoucher error:", error);
    return res.status(500).json({ success: false, message: "Gagal memvalidasi voucher." });
  }
};

/**
 * 4. Seller/Merchant Create Voucher
 * POST /api/vouchers/merchant/create
 */
const createMerchantVoucher = async (req, res) => {
  try {
    const merchantId = req.authUser._id;
    const merchantName = req.authUser.name || req.authUser.storeName || "Mitra Kamojang";
    const {
      voucherCode,
      title,
      description,
      service = "ALL",
      discountType = "FIXED",
      discountValue,
      minTransaction = 0,
      maxDiscount = null,
      pointsCost = 0,
      validUntil,
      usageLimit = 100,
    } = req.body;

    if (!voucherCode || !title || discountValue === undefined) {
      return res.status(400).json({ success: false, message: "Kode voucher, judul, dan nilai diskon wajib diisi." });
    }

    const cleanCode = voucherCode.trim().toUpperCase();
    const existing = await Voucher.findOne({ voucherCode: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Kode voucher ${cleanCode} sudah digunakan. Silakan gunakan kode lain.` });
    }

    const parsedExpiry = validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 86400000);

    const voucher = new Voucher({
      voucherCode: cleanCode,
      title: title.trim(),
      description: (description || "").trim(),
      service,
      merchantId,
      merchantName,
      discountType,
      discountValue: Number(discountValue) || 0,
      minTransaction: Number(minTransaction) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      pointsCost: Number(pointsCost) || 0,
      validUntil: parsedExpiry,
      usageLimit: Number(usageLimit) || 100,
      status: "ACTIVE",
    });

    await voucher.save();

    return res.status(201).json({
      success: true,
      message: `Voucher ${cleanCode} berhasil dibuat dan aktif!`,
      data: voucher,
    });
  } catch (error) {
    console.error("createMerchantVoucher error:", error);
    return res.status(500).json({ success: false, message: error.message || "Gagal membuat voucher toko." });
  }
};

/**
 * 5. Get Merchant Vouchers
 * GET /api/vouchers/merchant/my-vouchers
 */
const getMerchantVouchers = async (req, res) => {
  try {
    const merchantId = req.authUser._id;
    const vouchers = await Voucher.find({ merchantId })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = vouchers.map((v) => ({
      ...v,
      claimedCount: Array.isArray(v.claimedBy) ? v.claimedBy.length : 0,
      usedCount: Array.isArray(v.claimedBy) ? v.claimedBy.filter((c) => c.used).length : (v.usedCount || 0),
      isExpired: new Date(v.validUntil) < new Date(),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getMerchantVouchers error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat voucher toko." });
  }
};

/**
 * 6. Toggle Merchant Voucher Active Status
 * PATCH /api/vouchers/merchant/:id/status
 */
const toggleMerchantVoucherStatus = async (req, res) => {
  try {
    const merchantId = req.authUser._id;
    const { id } = req.params;

    const voucher = await Voucher.findOne({ _id: id, merchantId });
    if (!voucher) {
      return res.status(404).json({ success: false, message: "Voucher tidak ditemukan atau bukan milik Anda." });
    }

    voucher.status = voucher.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: `Status voucher berhasil diubah menjadi ${voucher.status}.`,
      data: voucher,
    });
  } catch (error) {
    console.error("toggleMerchantVoucherStatus error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status voucher." });
  }
};

/**
 * 7. Delete Merchant Voucher
 * DELETE /api/vouchers/merchant/:id
 */
const deleteMerchantVoucher = async (req, res) => {
  try {
    const merchantId = req.authUser._id;
    const { id } = req.params;

    const deleted = await Voucher.findOneAndDelete({ _id: id, merchantId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Voucher tidak ditemukan." });
    }

    return res.status(200).json({
      success: true,
      message: "Voucher berhasil dihapus.",
    });
  } catch (error) {
    console.error("deleteMerchantVoucher error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus voucher." });
  }
};

module.exports = {
  getAvailableVouchers,
  getCustomerVouchers,
  validateVoucher,
  createMerchantVoucher,
  getMerchantVouchers,
  toggleMerchantVoucherStatus,
  deleteMerchantVoucher,
};
