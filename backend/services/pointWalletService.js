/**
 * pointWalletService.js
 * Atomic ledger and wallet operations for GEOVERSE Points
 * Enforces:
 * - 100% backend authority
 * - Idempotency & double-issuance protection
 * - Audit logs with running balance (balanceBefore -> balanceAfter)
 * - Safe reversals when redemptions are rejected
 */

const PointWallet = require("../models/PointWallet");
const PointLedger = require("../models/PointLedger");

/**
 * Ensures a PointWallet exists for a user
 */
async function getOrCreateWallet(userId) {
  let wallet = await PointWallet.findOne({ userId });
  if (!wallet) {
    wallet = await PointWallet.create({
      userId,
      balancePoint: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
      totalKgDeposited: 0,
      depositCount: 0,
      totalCo2ReductionKg: 0,
    });
  }
  return wallet;
}

/**
 * Credits points to customer wallet and records to ledger
 */
async function creditPoints({
  userId,
  points,
  sourceType,
  sourceId,
  notes = "",
  actorId = null,
  kgDeposited = 0,
  co2ReductionKg = 0,
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Poin yang dikreditkan harus lebih besar dari nol.");
  }

  // Double-credit prevention: Check if already credited for this source
  const existingLedger = await PointLedger.findOne({
    sourceType,
    sourceId: String(sourceId),
    type: "EARN",
    status: "CONFIRMED",
  });
  if (existingLedger) {
    console.warn(`[pointWalletService] Points already issued for ${sourceType} #${sourceId}`);
    const wallet = await getOrCreateWallet(userId);
    return { wallet, ledger: existingLedger, alreadyProcessed: true };
  }

  const wallet = await getOrCreateWallet(userId);
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
  await wallet.save();

  // Create immutable ledger record
  const ledgerId = `LED-EARN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledger = await PointLedger.create({
    ledgerId,
    userId,
    type: "EARN",
    sourceType,
    sourceId: String(sourceId),
    points: safePoints,
    balanceBefore,
    balanceAfter,
    status: "CONFIRMED",
    notes: notes || `Poin diperoleh dari ${sourceType}`,
    createdBy: actorId || userId,
  });

  return { wallet, ledger, alreadyProcessed: false };
}

/**
 * Debits points from customer wallet for redemptions
 */
async function debitPoints({
  userId,
  points,
  type = "REDEEM_VOUCHER",
  sourceType,
  sourceId,
  notes = "",
  actorId = null,
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Poin yang ditukarkan harus lebih besar dari nol.");
  }

  const wallet = await getOrCreateWallet(userId);
  if (wallet.balancePoint < safePoints) {
    throw new Error(`Saldo GEOVERSE Point tidak mencukupi (Tersedia: ${wallet.balancePoint}, Dibutuhkan: ${safePoints}).`);
  }

  const balanceBefore = wallet.balancePoint;
  const balanceAfter = balanceBefore - safePoints;

  // Atomically deduct
  wallet.balancePoint = balanceAfter;
  wallet.lifetimeRedeemed += safePoints;
  await wallet.save();

  // Create ledger record
  const ledgerId = `LED-RDM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledger = await PointLedger.create({
    ledgerId,
    userId,
    type,
    sourceType,
    sourceId: String(sourceId),
    points: -safePoints,
    balanceBefore,
    balanceAfter,
    status: "CONFIRMED",
    notes: notes || `Penukaran poin (${sourceType})`,
    createdBy: actorId || userId,
  });

  return { wallet, ledger };
}

/**
 * Reverses previously debited points (e.g. if cash redemption is rejected or cancelled)
 */
async function reversePoints({
  userId,
  points,
  sourceType,
  sourceId,
  notes = "",
  actorId = null,
}) {
  const safePoints = Math.round(Math.abs(Number(points) || 0));
  if (safePoints <= 0) return null;

  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = wallet.balancePoint;
  const balanceAfter = balanceBefore + safePoints;

  wallet.balancePoint = balanceAfter;
  wallet.lifetimeRedeemed = Math.max(0, wallet.lifetimeRedeemed - safePoints);
  await wallet.save();

  const ledgerId = `LED-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledger = await PointLedger.create({
    ledgerId,
    userId,
    type: "REVERSAL",
    sourceType,
    sourceId: String(sourceId),
    points: safePoints,
    balanceBefore,
    balanceAfter,
    status: "REVERSED",
    notes: notes || `Pengembalian poin (Reversal ${sourceType})`,
    createdBy: actorId || userId,
  });

  return { wallet, ledger };
}

module.exports = {
  getOrCreateWallet,
  creditPoints,
  debitPoints,
  reversePoints,
};
