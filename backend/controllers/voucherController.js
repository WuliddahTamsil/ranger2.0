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
      .sort({ pointsCost: 1 })
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
    const { voucherCode, service = "ALL", transactionAmount = 0 } = req.body;

    if (!voucherCode) {
      return res.status(400).json({ success: false, message: "Kode voucher wajib diisi." });
    }

    const voucher = await Voucher.findOne({
      voucherCode: voucherCode.toUpperCase().trim(),
      status: "ACTIVE",
    });

    if (!voucher) {
      return res.status(404).json({ success: false, message: "Kode voucher tidak valid atau sudah kadaluarsa." });
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

    const userClaim = voucher.claimedBy.find((c) => String(c.userId) === String(customerId));
    if (!userClaim) {
      return res.status(403).json({ success: false, message: "Anda belum menukarkan voucher ini dari Kanyaah Recycle." });
    }

    if (userClaim.used) {
      return res.status(400).json({ success: false, message: "Voucher ini sudah pernah digunakan." });
    }

    let discount = voucher.discountValue;
    if (voucher.discountType === "PERCENTAGE") {
      discount = Math.round((transactionAmount * voucher.discountValue) / 100);
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Voucher berhasil diterapkan!",
      data: {
        voucherCode: voucher.voucherCode,
        title: voucher.title,
        discountAmount: discount,
      },
    });
  } catch (error) {
    console.error("validateVoucher error:", error);
    return res.status(500).json({ success: false, message: "Gagal memvalidasi voucher." });
  }
};

module.exports = {
  getAvailableVouchers,
  getCustomerVouchers,
  validateVoucher,
};
