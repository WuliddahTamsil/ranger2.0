const PointWallet = require("../models/PointWallet");
const PointLedger = require("../models/PointLedger");
const PointRedemption = require("../models/PointRedemption");
const Voucher = require("../models/Voucher");
const Notification = require("../models/Notification");
const { getOrCreateWallet, debitPoints, reversePoints } = require("../services/pointWalletService");

/**
 * 1. Get Point Wallet for authenticated user
 * GET /api/points/wallet
 */
const getWallet = async (req, res) => {
  try {
    const userId = req.authUser._id;
    const wallet = await getOrCreateWallet(userId);

    return res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    console.error("getWallet error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat saldo GEOVERSE Point." });
  }
};

/**
 * 2. Get Point Ledger (Buku Tabungan Digital Mutasi)
 * GET /api/points/ledger
 */
const getLedger = async (req, res) => {
  try {
    const userId = req.authUser._id;
    const { type, limit = 50, page = 1 } = req.query;

    const filter = { userId };
    if (type && type !== "ALL") {
      filter.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [ledgers, total] = await Promise.all([
      PointLedger.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      PointLedger.countDocuments(filter),
    ]);

    const wallet = await getOrCreateWallet(userId);

    return res.status(200).json({
      success: true,
      data: {
        wallet,
        ledgers,
        pagination: {
          total,
          page: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("getLedger error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat buku tabungan poin." });
  }
};

/**
 * 3. Create Point Redemption (Voucher or Cash / Transfer)
 * POST /api/points/redemptions
 */
const createRedemption = async (req, res) => {
  try {
    const userId = req.authUser._id;
    const {
      type = "VOUCHER",
      points,
      bankSampahId,
      payoutDestination = {},
      voucherId,
      idempotencyKey,
    } = req.body;

    const safePoints = Math.round(Number(points) || 0);
    if (safePoints <= 0) {
      return res.status(400).json({ success: false, message: "Jumlah poin yang ditukarkan tidak valid." });
    }

    // Check idempotency
    if (idempotencyKey) {
      const existing = await PointRedemption.findOne({ idempotencyKey }).lean();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Penukaran poin sudah diproses sebelumnya.",
          data: existing,
        });
      }
    }

    let voucherDoc = null;
    if (type === "VOUCHER") {
      if (!voucherId) {
        return res.status(400).json({ success: false, message: "Voucher yang ingin ditukarkan wajib dipilih." });
      }
      voucherDoc = await Voucher.findById(voucherId);
      if (!voucherDoc || voucherDoc.status !== "ACTIVE") {
        return res.status(404).json({ success: false, message: "Voucher tidak tersedia atau sudah habis." });
      }
      if (voucherDoc.pointsCost !== safePoints) {
        return res.status(400).json({ success: false, message: "Biaya poin voucher tidak sesuai konfigurasi." });
      }
    }

    const redemptionCode = `RNG-RDM-${Date.now().toString().slice(-8)}`;

    // Atomically debit points from wallet and record in ledger
    const debitResult = await debitPoints({
      userId,
      points: safePoints,
      type: type === "VOUCHER" ? "REDEEM_VOUCHER" : "REDEEM_CASH",
      sourceType: type === "VOUCHER" ? "VOUCHER" : "CASH_REDEMPTION",
      sourceId: redemptionCode,
      notes: type === "VOUCHER" ? `Tukar voucher ${voucherDoc?.title}` : `Tukar kas Rp ${safePoints.toLocaleString("id-ID")}`,
      actorId: userId,
    });

    const isInstantVoucher = type === "VOUCHER";
    const initialStatus = isInstantVoucher ? "APPROVED" : "REQUESTED";

    const redemption = await PointRedemption.create({
      redemptionCode,
      userId,
      bankSampahId: bankSampahId || undefined,
      type,
      points: safePoints,
      rupiahValue: safePoints, // 1 Point = Rp 1
      fee: 0,
      payoutDestination: {
        channel: payoutDestination.channel || (isInstantVoucher ? "VOUCHER_WALLET" : "CASH_AT_BANK"),
        accountNumber: payoutDestination.accountNumber || "",
        accountName: payoutDestination.accountName || req.authUser.name,
      },
      voucherId: voucherDoc ? voucherDoc._id : undefined,
      voucherCode: voucherDoc ? voucherDoc.voucherCode : "",
      voucherDetails: voucherDoc
        ? {
            title: voucherDoc.title,
            service: voucherDoc.service,
            discountValue: voucherDoc.discountValue,
          }
        : undefined,
      status: initialStatus,
      paidAt: isInstantVoucher ? new Date() : null,
      idempotencyKey: idempotencyKey || undefined,
    });

    // If voucher, claim to user in voucher document
    if (voucherDoc) {
      voucherDoc.claimedBy.push({
        userId,
        claimedAt: new Date(),
        used: false,
      });
      voucherDoc.usedCount += 1;
      await voucherDoc.save();
    }

    await Notification.create({
      userId,
      title: isInstantVoucher ? "Voucher Berhasil Ditukarkan!" : "Permintaan Penukaran Kas Diterima",
      message: isInstantVoucher
        ? `Voucher '${voucherDoc?.title}' siap digunakan pada pesanan Anda.`
        : `Permintaan penukaran ${safePoints.toLocaleString("id-ID")} poin sedang diproses.`,
      type: "points",
      relatedId: redemption._id,
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: isInstantVoucher
        ? "Voucher berhasil ditukarkan dan ditambahkan ke dompet Anda!"
        : "Permintaan penukaran kas berhasil diajukan.",
      data: redemption,
      wallet: debitResult.wallet,
    });
  } catch (error) {
    console.error("createRedemption error:", error);
    return res.status(500).json({ success: false, message: error.message || "Gagal memproses penukaran poin." });
  }
};

/**
 * 4. Get Customer Redemptions
 * GET /api/points/redemptions/customer/:customerId
 */
const getCustomerRedemptions = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const redemptions = await PointRedemption.find({ userId: customerId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: redemptions,
    });
  } catch (error) {
    console.error("getCustomerRedemptions error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat riwayat penukaran." });
  }
};

/**
 * 5. Approve & Pay Cash Redemption (Bank Sampah / Admin)
 * POST /api/points/redemptions/:id/pay
 */
const payRedemption = async (req, res) => {
  try {
    const redemption = await PointRedemption.findById(req.params.id);
    if (!redemption) {
      return res.status(404).json({ success: false, message: "Penukaran tidak ditemukan." });
    }

    redemption.status = "PAID";
    redemption.paidAt = new Date();
    redemption.reviewedBy = req.authUser._id;
    await redemption.save();

    await Notification.create({
      userId: redemption.userId,
      title: "Pencairan Kas Berhasil!",
      message: `Dana penukaran kas sebesar Rp ${redemption.rupiahValue.toLocaleString("id-ID")} telah berhasil dibayarkan.`,
      type: "points",
      relatedId: redemption._id,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Penukaran kas berhasil dibayarkan.",
      data: redemption,
    });
  } catch (error) {
    console.error("payRedemption error:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses pembayaran kas." });
  }
};

/**
 * 6. Reject Redemption -> Reverses Points Back to Customer Wallet!
 * POST /api/points/redemptions/:id/reject
 */
const rejectRedemption = async (req, res) => {
  try {
    const { reason = "Penukaran kas ditolak oleh petugas." } = req.body;
    const redemption = await PointRedemption.findById(req.params.id);

    if (!redemption) {
      return res.status(404).json({ success: false, message: "Penukaran tidak ditemukan." });
    }

    if (redemption.status === "REJECTED" || redemption.status === "PAID") {
      return res.status(400).json({ success: false, message: `Status penukaran sudah ${redemption.status}.` });
    }

    redemption.status = "REJECTED";
    redemption.rejectionReason = reason;
    redemption.reviewedBy = req.authUser._id;
    await redemption.save();

    // Reversal: restore deducted points
    const reversalResult = await reversePoints({
      userId: redemption.userId,
      points: redemption.points,
      sourceType: "CASH_REDEMPTION",
      sourceId: redemption.redemptionCode,
      notes: `Pengembalian poin penukaran #${redemption.redemptionCode} (Ditolak: ${reason})`,
      actorId: req.authUser._id,
    });

    await Notification.create({
      userId: redemption.userId,
      title: "Penukaran Poin Ditolak",
      message: `Penukaran #${redemption.redemptionCode} ditolak (${reason}). Saldo ${redemption.points} poin telah dikembalikan utuh ke dompet Anda.`,
      type: "points",
      relatedId: redemption._id,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Penukaran berhasil ditolak dan poin telah dikembalikan ke customer.",
      data: redemption,
      wallet: reversalResult?.wallet,
    });
  } catch (error) {
    console.error("rejectRedemption error:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses penolakan penukaran." });
  }
};

module.exports = {
  getWallet,
  getLedger,
  createRedemption,
  getCustomerRedemptions,
  payRedemption,
  rejectRedemption,
};
