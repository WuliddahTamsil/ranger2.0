/**
 * geoversePointController.js
 * Controller for all canonical GEOVERSE Point endpoints
 */

const { getOrCreateWallet, getWalletConfig, adjustPoints } = require("../services/pointWalletService");
const { getLedgerForUser, getRecentActivities } = require("../services/pointLedgerService");
const pointRedemptionService = require("../services/pointRedemptionService");
const Voucher = require("../../../models/Voucher");

/**
 * 1. GET /api/geoverse-points/wallet
 * Returns current authenticated user's wallet and config
 */
async function getWallet(req, res) {
  try {
    const userId = req.authUser._id;
    const wallet = await getOrCreateWallet(userId);
    const config = getWalletConfig();

    return res.status(200).json({
      success: true,
      data: wallet,
      config,
    });
  } catch (error) {
    console.error("geoversePoint getWallet error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat saldo GEOVERSE Point.",
    });
  }
}

/**
 * 2. GET /api/geoverse-points/ledger
 * Returns paginated digital savings book / mutations
 */
async function getLedger(req, res) {
  try {
    const userId = req.authUser._id;
    const { type, sourceType, limit, page } = req.query;

    const result = await getLedgerForUser(userId, { type, sourceType, limit, page });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("geoversePoint getLedger error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat mutasi buku tabungan poin.",
    });
  }
}

/**
 * 3. GET /api/geoverse-points/recent-activity
 * Returns recent activity transactions
 */
async function getRecent(req, res) {
  try {
    const userId = req.authUser._id;
    const limit = req.query.limit || 5;
    const activities = await getRecentActivities(userId, limit);

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("geoversePoint getRecent error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat aktivitas terbaru.",
    });
  }
}

/**
 * 4. GET /api/geoverse-points/vouchers
 * Returns active, non-expired vouchers available for point redemption
 */
async function getVouchers(req, res) {
  try {
    const { service } = req.query;
    const filter = {
      status: "ACTIVE",
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: null },
        { validUntil: { $gte: new Date() } },
      ],
    };

    if (service && service !== "ALL") {
      filter.service = service;
    }

    const vouchers = await Voucher.find(filter).sort({ pointsCost: 1, createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: vouchers,
    });
  } catch (error) {
    console.error("geoversePoint getVouchers error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat katalog voucher.",
    });
  }
}

/**
 * 5. POST /api/geoverse-points/redemptions
 * Create a voucher or cash withdrawal redemption
 */
async function createRedemption(req, res) {
  try {
    const userId = req.authUser._id;
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;
    const { type, points, bankSampahId, payoutDestination, voucherId } = req.body;

    const result = await pointRedemptionService.createRedemption({
      userId,
      type,
      points,
      bankSampahId,
      payoutDestination,
      voucherId,
      idempotencyKey,
      userName: req.authUser.name,
    });

    return res.status(201).json({
      success: true,
      message:
        type === "VOUCHER"
          ? "Voucher berhasil ditukarkan dan siap digunakan!"
          : "Permintaan penarikan kas berhasil dibuat dan sedang diproses.",
      data: result.redemption,
      wallet: result.wallet,
    });
  } catch (error) {
    console.error("geoversePoint createRedemption error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal memproses penukaran poin.",
    });
  }
}

/**
 * 6. GET /api/geoverse-points/redemptions
 * Get redemptions for current user
 */
async function getRedemptions(req, res) {
  try {
    const userId = req.authUser._id;
    const redemptions = await pointRedemptionService.getRedemptionsForUser(userId);

    return res.status(200).json({
      success: true,
      data: redemptions,
    });
  } catch (error) {
    console.error("geoversePoint getRedemptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat riwayat penukaran poin.",
    });
  }
}

/**
 * 7. GET /api/geoverse-points/redemptions/:id
 * Get redemption detail
 */
async function getRedemptionDetail(req, res) {
  try {
    const userId = req.authUser._id;
    const role = req.authUser.role;
    const redemption = await pointRedemptionService.getRedemptionById(req.params.id, userId, role);

    return res.status(200).json({
      success: true,
      data: redemption,
    });
  } catch (error) {
    console.error("geoversePoint getRedemptionDetail error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "Penukaran tidak ditemukan.",
    });
  }
}

/**
 * 8. POST /api/geoverse-points/redemptions/:id/cancel
 * Customer cancels requested redemption
 */
async function cancelRedemption(req, res) {
  try {
    const userId = req.authUser._id;
    const { reason } = req.body;
    const result = await pointRedemptionService.cancelRedemption(req.params.id, userId, reason);

    return res.status(200).json({
      success: true,
      message: "Penukaran poin berhasil dibatalkan.",
      data: result.redemption,
      wallet: result.wallet,
    });
  } catch (error) {
    console.error("geoversePoint cancelRedemption error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal membatalkan penukaran poin.",
    });
  }
}

/**
 * 9. POST /api/geoverse-points/redemptions/:id/pay
 * Staff/Admin confirms payment of cash redemption
 */
async function payRedemption(req, res) {
  try {
    const reviewerId = req.authUser._id;
    const redemption = await pointRedemptionService.payRedemption(req.params.id, reviewerId);

    return res.status(200).json({
      success: true,
      message: "Pencairan kas berhasil dibayarkan kepada customer.",
      data: redemption,
    });
  } catch (error) {
    console.error("geoversePoint payRedemption error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal memproses pembayaran pencairan kas.",
    });
  }
}

/**
 * 10. POST /api/geoverse-points/redemptions/:id/reject
 * Staff/Admin rejects cash redemption and reverses points
 */
async function rejectRedemption(req, res) {
  try {
    const reviewerId = req.authUser._id;
    const { reason } = req.body;
    const result = await pointRedemptionService.rejectRedemption(req.params.id, reviewerId, reason);

    return res.status(200).json({
      success: true,
      message: "Penukaran kas ditolak dan poin telah dikembalikan utuh ke saldo customer.",
      data: result.redemption,
      wallet: result.wallet,
    });
  } catch (error) {
    console.error("geoversePoint rejectRedemption error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal menolak penukaran kas.",
    });
  }
}

/**
 * 11. POST /api/geoverse-points/admin/adjust
 * Admin point adjustment with mandatory reason
 */
async function adminAdjustment(req, res) {
  try {
    const { targetUserId, points, reason } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Target userId wajib ditentukan." });
    }

    const result = await adjustPoints({
      userId: targetUserId,
      points,
      reason,
      actorId: req.authUser._id,
    });

    return res.status(200).json({
      success: true,
      message: "Adjustment poin berhasil diterapkan.",
      data: result,
    });
  } catch (error) {
    console.error("geoversePoint adminAdjustment error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal melakukan adjustment poin.",
    });
  }
}

/**
 * 12. GET /api/geoverse-points/config
 * Returns current point configuration
 */
async function getConfig(req, res) {
  return res.status(200).json({
    success: true,
    data: getWalletConfig(),
  });
}

module.exports = {
  getWallet,
  getLedger,
  getRecent,
  getVouchers,
  createRedemption,
  getRedemptions,
  getRedemptionDetail,
  cancelRedemption,
  payRedemption,
  rejectRedemption,
  adminAdjustment,
  getConfig,
};
