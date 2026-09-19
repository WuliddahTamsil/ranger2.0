/**
 * pointWalletService.js
 * Atomic wallet and ledger operations for GEOVERSE Points
 * Features:
 * - 100% backend authoritative calculation
 * - Idempotency & double-issuance protection
 * - Audit logs with running balance (balanceBefore -> balanceAfter)
 * - Safe reversals when redemptions/orders are rejected/cancelled
 * - Admin adjustment capability with mandatory reason
 */

const PointWallet = require("../models/PointWallet");
const PointLedger = require("../models/PointLedger");
const {
  POINT_TO_RUPIAH_RATE,
  MIN_CASH_REDEMPTION_POINTS,
  LEDGER_TYPES,
  SOURCE_TYPES,
  ALLOWED_PAYMENT_SERVICES,
} = require("../constants/pointConstants");

/**
 * Returns configuration for point calculation and conversion
 */
function getWalletConfig() {
  return {
    pointToRupiahRate: POINT_TO_RUPIAH_RATE,
    minCashRedemptionPoints: MIN_CASH_REDEMPTION_POINTS,
    allowedPaymentServices: ALLOWED_PAYMENT_SERVICES,
  };
}

/**
 * Ensures a PointWallet exists for a user
 */
async function getOrCreateWallet(userId, session = null) {
  const query = PointWallet.findOne({ userId });
  if (session) query.session(session);
  let wallet = await query;

  if (!wallet) {
    const createOptions = session ? [{ userId }, { session }] : [{ userId }];
    const created = await PointWallet.create(...createOptions);
    wallet = Array.isArray(created) ? created[0] : created;
  }
  return wallet;
}

/**
 * Credits points to customer wallet and records to ledger
 */
async function creditPoints({
  userId,
  points,
  sourceType = SOURCE_TYPES.WASTE_DEPOSIT,
  sourceId,
  notes = "",
  actorId = null,
  kgDeposited = 0,
  co2ReductionKg = 0,
  session = null,
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Poin yang dikreditkan harus lebih besar dari nol.");
  }

  // Double-credit prevention: Check if already credited for this specific source
  const existingLedgerQuery = PointLedger.findOne({
    sourceType,
    sourceId: String(sourceId),
    type: LEDGER_TYPES.EARN,
    status: "CONFIRMED",
  });
  if (session) existingLedgerQuery.session(session);
  const existingLedger = await existingLedgerQuery;

  if (existingLedger) {
    console.warn(`[pointWalletService] Points already issued for ${sourceType} #${sourceId}`);
    const wallet = await getOrCreateWallet(userId, session);
    return { wallet, ledger: existingLedger, alreadyProcessed: true };
  }

  const wallet = await getOrCreateWallet(userId, session);
  const balanceBefore = wallet.balancePoint;
  const balanceAfter = balanceBefore + safePoints;

  // Atomically update wallet
  wallet.balancePoint = balanceAfter;
  wallet.lifetimeEarned += safePoints;
  if (kgDeposited > 0) {
    wallet.totalKgDeposited = Math.round((wallet.totalKgDeposited + kgDeposited) * 10) / 10;
    wallet.depositCount += 1;
  }
  if (co2ReductionKg > 0) {
    wallet.totalCo2ReductionKg = Math.round((wallet.totalCo2ReductionKg + co2ReductionKg) * 10) / 10;
  }
  await wallet.save({ session });

  // Create immutable ledger record
  const ledgerId = `LED-EARN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerOptions = [
    {
      ledgerId,
      userId,
      type: LEDGER_TYPES.EARN,
      sourceType,
      sourceId: String(sourceId),
      points: safePoints,
      balanceBefore,
      balanceAfter,
      status: "CONFIRMED",
      notes: notes || `Poin diperoleh dari ${sourceType}`,
      createdBy: actorId || userId,
    },
  ];
  if (session) ledgerOptions.push({ session });
  const createdLedger = await PointLedger.create(...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger, alreadyProcessed: false };
}

/**
 * Debits points from customer wallet for vouchers, cash redemptions, or checkout payments
 */
async function debitPoints({
  userId,
  points,
  type = LEDGER_TYPES.REDEEM_VOUCHER,
  sourceType,
  sourceId,
  notes = "",
  actorId = null,
  session = null,
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Poin yang didebit harus lebih besar dari nol.");
  }

  const wallet = await getOrCreateWallet(userId, session);
  if (wallet.balancePoint < safePoints) {
    throw new Error(
      `Saldo GEOVERSE Point tidak mencukupi (Tersedia: ${wallet.balancePoint}, Dibutuhkan: ${safePoints}).`
    );
  }

  const balanceBefore = wallet.balancePoint;
  const balanceAfter = balanceBefore - safePoints;

  // Atomically deduct
  wallet.balancePoint = balanceAfter;
  wallet.lifetimeRedeemed += safePoints;
  await wallet.save({ session });

  // Create ledger record
  const ledgerId = `LED-DEBIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerOptions = [
    {
      ledgerId,
      userId,
      type,
      sourceType,
      sourceId: String(sourceId),
      points: -safePoints,
      balanceBefore,
      balanceAfter,
      status: "CONFIRMED",
      notes: notes || `Penggunaan poin (${sourceType})`,
      createdBy: actorId || userId,
    },
  ];
  if (session) ledgerOptions.push({ session });
  const createdLedger = await PointLedger.create(...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger };
}

/**
 * Reverses previously debited points (e.g. if cash redemption is rejected or order is cancelled)
 */
async function reversePoints({
  userId,
  points,
  sourceType = SOURCE_TYPES.REVERSAL,
  sourceId,
  notes = "",
  actorId = null,
  session = null,
}) {
  const safePoints = Math.round(Math.abs(Number(points) || 0));
  if (safePoints <= 0) return null;

  const wallet = await getOrCreateWallet(userId, session);
  const balanceBefore = wallet.balancePoint;
  const balanceAfter = balanceBefore + safePoints;

  wallet.balancePoint = balanceAfter;
  wallet.lifetimeRedeemed = Math.max(0, wallet.lifetimeRedeemed - safePoints);
  await wallet.save({ session });

  const ledgerId = `LED-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerOptions = [
    {
      ledgerId,
      userId,
      type: LEDGER_TYPES.REVERSAL,
      sourceType,
      sourceId: String(sourceId),
      points: safePoints,
      balanceBefore,
      balanceAfter,
      status: "REVERSED",
      notes: notes || `Pengembalian poin (Reversal ${sourceType})`,
      createdBy: actorId || userId,
    },
  ];
  if (session) ledgerOptions.push({ session });
  const createdLedger = await PointLedger.create(...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger };
}

/**
 * Admin adjustment for points (positive or negative) with mandatory audit reason
 */
async function adjustPoints({
  userId,
  points,
  reason,
  actorId,
  session = null,
}) {
  const safePoints = Math.round(Number(points));
  if (isNaN(safePoints) || safePoints === 0) {
    throw new Error("Nominal adjustment tidak valid.");
  }
  if (!reason || reason.trim().length < 5) {
    throw new Error("Alasan adjustment wajib diisi minimal 5 karakter.");
  }

  const wallet = await getOrCreateWallet(userId, session);
  const balanceBefore = wallet.balancePoint;
  const balanceAfter = balanceBefore + safePoints;

  if (balanceAfter < 0) {
    throw new Error("Adjustment tidak dapat menghasilkan saldo negatif.");
  }

  wallet.balancePoint = balanceAfter;
  if (safePoints > 0) {
    wallet.lifetimeEarned += safePoints;
  } else {
    wallet.lifetimeRedeemed += Math.abs(safePoints);
  }
  await wallet.save({ session });

  const ledgerId = `LED-ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerOptions = [
    {
      ledgerId,
      userId,
      type: LEDGER_TYPES.ADJUSTMENT,
      sourceType: SOURCE_TYPES.ADMIN,
      sourceId: `ADJUSTMENT-${Date.now()}`,
      points: safePoints,
      balanceBefore,
      balanceAfter,
      status: "CONFIRMED",
      notes: `Adjustment admin: ${reason}`,
      createdBy: actorId,
    },
  ];
  if (session) ledgerOptions.push({ session });
  const createdLedger = await PointLedger.create(...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger };
}

module.exports = {
  getWalletConfig,
  getOrCreateWallet,
  creditPoints,
  debitPoints,
  reversePoints,
  adjustPoints,
};
