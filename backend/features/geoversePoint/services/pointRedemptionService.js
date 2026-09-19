/**
 * pointRedemptionService.js
 * Handles voucher redemption and cash withdrawals with full lifecycle,
 * idempotency, notifications, and reversal on rejection.
 */

const PointRedemption = require("../models/PointRedemption");
const Voucher = require("../../../models/Voucher");
const Notification = require("../../../models/Notification");
const { debitPoints, reversePoints, getOrCreateWallet } = require("./pointWalletService");
const {
  POINT_TO_RUPIAH_RATE,
  MIN_CASH_REDEMPTION_POINTS,
  REDEMPTION_STATUSES,
  REDEMPTION_TYPES,
  SOURCE_TYPES,
  LEDGER_TYPES,
} = require("../constants/pointConstants");

/**
 * Creates a new redemption (VOUCHER or CASH withdrawal)
 */
async function createRedemption({
  userId,
  type = "VOUCHER",
  points,
  bankSampahId,
  payoutDestination = {},
  voucherId,
  idempotencyKey,
  userName = "Customer",
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Jumlah poin yang ditukarkan tidak valid.");
  }

  // Enforce minimum points for cash redemption
  if (type !== "VOUCHER" && safePoints < MIN_CASH_REDEMPTION_POINTS) {
    throw new Error(
      `Minimal penarikan kas adalah ${MIN_CASH_REDEMPTION_POINTS.toLocaleString("id-ID")} GEOVERSE Point.`
    );
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = await PointRedemption.findOne({ idempotencyKey }).lean();
    if (existing) {
      const wallet = await getOrCreateWallet(userId);
      return { redemption: existing, wallet, alreadyProcessed: true };
    }
  }

  let voucherDoc = null;
  if (type === "VOUCHER") {
    if (!voucherId) {
      throw new Error("Voucher yang ingin ditukarkan wajib dipilih.");
    }
    const VoucherModel = require("../../../models/Voucher");
    voucherDoc = await VoucherModel.findById(voucherId);
    if (!voucherDoc || voucherDoc.status !== "ACTIVE") {
      throw new Error("Voucher tidak tersedia atau sudah habis.");
    }
    if (voucherDoc.validUntil && new Date(voucherDoc.validUntil) < new Date()) {
      throw new Error("Masa berlaku voucher telah berakhir.");
    }
    if (voucherDoc.pointsCost !== safePoints) {
      throw new Error("Biaya poin voucher tidak sesuai konfigurasi.");
    }
    // Check user usage / claim limit if configured (supports userUsageLimit or usageLimitPerUser)
    const limitPerUser = voucherDoc.userUsageLimit ?? voucherDoc.usageLimitPerUser ?? 1;
    if (limitPerUser > 0) {
      const claimCount = (voucherDoc.claimedBy || []).filter(
        (claim) => String(claim.userId?._id || claim.userId) === String(userId)
      ).length;
      if (claimCount >= limitPerUser) {
        throw new Error("Anda sudah pernah menukarkan voucher satu-kali-klaim ini.");
      }
    }
  }

  const redemptionCode = `RNG-RDM-${Date.now().toString().slice(-8)}`;

  // Atomically debit points
  const debitResult = await debitPoints({
    userId,
    points: safePoints,
    type: type === "VOUCHER" ? LEDGER_TYPES.REDEEM_VOUCHER : LEDGER_TYPES.REDEEM_CASH,
    sourceType: type === "VOUCHER" ? SOURCE_TYPES.VOUCHER : SOURCE_TYPES.CASH_REDEMPTION,
    sourceId: redemptionCode,
    notes:
      type === "VOUCHER"
        ? `Tukar voucher ${voucherDoc?.title}`
        : `Tukar kas Rp ${(safePoints * POINT_TO_RUPIAH_RATE).toLocaleString("id-ID")}`,
    actorId: userId,
  });

  const isInstantVoucher = type === "VOUCHER";
  const initialStatus = isInstantVoucher ? REDEMPTION_STATUSES.APPROVED : REDEMPTION_STATUSES.REQUESTED;

  const redemption = await PointRedemption.create({
    redemptionCode,
    userId,
    bankSampahId: bankSampahId || undefined,
    type,
    points: safePoints,
    rupiahValue: safePoints * POINT_TO_RUPIAH_RATE,
    fee: 0,
    payoutDestination: {
      channel: payoutDestination.channel || (isInstantVoucher ? "VOUCHER_WALLET" : "CASH_AT_BANK"),
      accountNumber: payoutDestination.accountNumber || "",
      accountName: payoutDestination.accountName || userName,
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

  // If voucher, record claim
  if (voucherDoc) {
    voucherDoc.claimedBy.push({
      userId,
      claimedAt: new Date(),
      used: false,
    });
    voucherDoc.usedCount = (voucherDoc.usedCount || 0) + 1;
    await voucherDoc.save();
  }

  // Create notification
  await Notification.create({
    userId,
    title: isInstantVoucher ? "Voucher Berhasil Ditukarkan!" : "Permintaan Pencairan Diterima",
    message: isInstantVoucher
      ? `Voucher '${voucherDoc?.title}' siap digunakan pada pesanan Anda.`
      : `Permintaan penukaran kas ${safePoints.toLocaleString("id-ID")} poin (Rp ${(safePoints * POINT_TO_RUPIAH_RATE).toLocaleString("id-ID")}) sedang diproses.`,
    type: "points",
    relatedId: redemption._id,
  }).catch(() => {});

  return { redemption, wallet: debitResult.wallet, alreadyProcessed: false };
}

/**
 * Gets redemptions for a customer
 */
async function getRedemptionsForUser(userId) {
  return await PointRedemption.find({ userId }).sort({ createdAt: -1 }).lean();
}

/**
 * Gets redemption by ID
 */
async function getRedemptionById(id, userId, userRole) {
  const redemption = await PointRedemption.findById(id).lean();
  if (!redemption) {
    throw new Error("Penukaran poin tidak ditemukan.");
  }
  // Access check
  if (userRole !== "admin" && userRole !== "bank_sampah" && String(redemption.userId) !== String(userId)) {
    throw new Error("Anda tidak memiliki akses ke penukaran poin ini.");
  }
  return redemption;
}

/**
 * Approves and marks a cash redemption as PAID
 */
async function payRedemption(id, reviewerId) {
  const redemption = await PointRedemption.findById(id);
  if (!redemption) {
    throw new Error("Penukaran tidak ditemukan.");
  }
  if (redemption.status === REDEMPTION_STATUSES.PAID) {
    return redemption;
  }
  if (redemption.status === REDEMPTION_STATUSES.REJECTED || redemption.status === REDEMPTION_STATUSES.CANCELLED) {
    throw new Error(`Tidak dapat membayar penukaran dengan status ${redemption.status}.`);
  }

  redemption.status = REDEMPTION_STATUSES.PAID;
  redemption.paidAt = new Date();
  redemption.reviewedBy = reviewerId;
  await redemption.save();

  await Notification.create({
    userId: redemption.userId,
    title: "Pencairan Kas Berhasil!",
    message: `Dana penukaran kas sebesar Rp ${redemption.rupiahValue.toLocaleString("id-ID")} telah berhasil dicairkan.`,
    type: "points",
    relatedId: redemption._id,
  }).catch(() => {});

  return redemption;
}

/**
 * Rejects a redemption and reverses points atomically back to user wallet
 */
async function rejectRedemption(id, reviewerId, reason = "Penukaran kas ditolak oleh petugas.") {
  const redemption = await PointRedemption.findById(id);
  if (!redemption) {
    throw new Error("Penukaran tidak ditemukan.");
  }
  if (redemption.status === REDEMPTION_STATUSES.REJECTED || redemption.status === REDEMPTION_STATUSES.PAID) {
    throw new Error(`Status penukaran sudah ${redemption.status}.`);
  }

  redemption.status = REDEMPTION_STATUSES.REJECTED;
  redemption.rejectionReason = reason;
  redemption.reviewedBy = reviewerId;
  await redemption.save();

  // Atomically reverse points back to customer
  const reversalResult = await reversePoints({
    userId: redemption.userId,
    points: redemption.points,
    sourceType: SOURCE_TYPES.CASH_REDEMPTION,
    sourceId: redemption.redemptionCode,
    notes: `Pengembalian poin penukaran #${redemption.redemptionCode} (Ditolak: ${reason})`,
    actorId: reviewerId,
  });

  await Notification.create({
    userId: redemption.userId,
    title: "Penukaran Poin Ditolak",
    message: `Penukaran #${redemption.redemptionCode} ditolak (${reason}). Saldo ${redemption.points.toLocaleString("id-ID")} poin telah dikembalikan utuh ke dompet Anda.`,
    type: "points",
    relatedId: redemption._id,
  }).catch(() => {});

  return { redemption, wallet: reversalResult?.wallet };
}

/**
 * Cancels a REQUESTED redemption by customer and reverses points
 */
async function cancelRedemption(id, userId, reason = "Dibatalkan oleh pelanggan.") {
  const redemption = await PointRedemption.findById(id);
  if (!redemption) {
    throw new Error("Penukaran tidak ditemukan.");
  }
  if (String(redemption.userId) !== String(userId)) {
    throw new Error("Hanya pemilik penukaran yang dapat membatalkannya.");
  }
  if (redemption.status !== REDEMPTION_STATUSES.REQUESTED) {
    throw new Error(`Penukaran dengan status ${redemption.status} tidak dapat dibatalkan.`);
  }

  redemption.status = REDEMPTION_STATUSES.CANCELLED;
  redemption.rejectionReason = reason;
  await redemption.save();

  const reversalResult = await reversePoints({
    userId: redemption.userId,
    points: redemption.points,
    sourceType: SOURCE_TYPES.CASH_REDEMPTION,
    sourceId: redemption.redemptionCode,
    notes: `Pembatalan penukaran #${redemption.redemptionCode} oleh pelanggan`,
    actorId: userId,
  });

  return { redemption, wallet: reversalResult?.wallet };
}

module.exports = {
  createRedemption,
  getRedemptionsForUser,
  getRedemptionById,
  payRedemption,
  rejectRedemption,
  cancelRedemption,
};
