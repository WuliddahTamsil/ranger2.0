/**
 * pointWalletService.js
 * Atomic wallet and ledger operations for GEOVERSE Points
 * Features:
 * - 100% backend authoritative calculation & configurable point rate
 * - Atomic conditional debit (balancePoint >= requestedPoints)
 * - Deterministic operation keys & double-issuance / double-debit protection
 * - Deterministic reversal keys (duplicate reversal cannot credit points twice)
 * - Session-aware (MongoDB transactions supported with standalone fallbacks)
 * - Canonical ledger enum & running balance audit logs (balanceBefore -> balanceAfter)
 */

const PointWallet = require("../models/PointWallet");
const PointLedger = require("../models/PointLedger");
const {
  POINT_TO_RUPIAH_RATE,
  MIN_CASH_REDEMPTION_POINTS,
  LEDGER_TYPES,
  SOURCE_TYPES,
  ALLOWED_PAYMENT_SERVICES,
  getPointRate,
  setPointRate,
} = require("../constants/pointConstants");

/**
 * Returns configuration for point calculation and conversion
 */
function getWalletConfig() {
  const rate = getPointRate();
  return {
    pointToRupiahRate: rate,
    minCashRedemptionPoints: MIN_CASH_REDEMPTION_POINTS,
    allowedPaymentServices: ALLOWED_PAYMENT_SERVICES,
  };
}

/**
 * Ensures a PointWallet exists for a user (Race-condition safe via findOneAndUpdate upsert)
 */
async function getOrCreateWallet(userId, session = null) {
  if (!userId) throw new Error("userId wajib disediakan untuk mengakses PointWallet.");

  const options = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  };
  if (session) options.session = session;

  const wallet = await PointWallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        balancePoint: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        totalKgDeposited: 0,
        depositCount: 0,
        totalCo2ReductionKg: 0,
      },
    },
    options
  );
  return wallet;
}

/**
 * Backend Authoritative Quote Calculator
 * Never trusts frontend pointDiscount
 */
async function calculatePaymentQuote({
  service,
  grossAmount = 0,
  voucherDiscount = 0,
  deliveryFee = 0,
  serviceFee = 0,
  requestedPoints = 0,
  userId = null,
  userBalance = null,
}) {
  const normalizedService = String(service || "").toUpperCase();
  const pointRate = getPointRate();

  const subtotal = Math.max(0, Math.round(Number(grossAmount) || 0));
  const vDiscount = Math.max(0, Math.round(Number(voucherDiscount) || 0));
  const dFee = Math.max(0, Math.round(Number(deliveryFee) || 0));
  const sFee = Math.max(0, Math.round(Number(serviceFee) || 0));

  const totalBeforePoints = Math.max(0, subtotal - vDiscount) + dFee + sFee;

  let balance = 0;
  if (userBalance != null && !isNaN(userBalance)) {
    balance = Math.max(0, Number(userBalance));
  } else if (userId) {
    const wallet = await getOrCreateWallet(userId);
    balance = wallet?.balancePoint || 0;
  }

  const reqPoints = Math.max(0, Math.round(Number(requestedPoints) || 0));
  const maxPointsAllowed = Math.floor(totalBeforePoints / pointRate);
  const approvedPoints = Math.min(balance, maxPointsAllowed, reqPoints);
  const pointDiscount = approvedPoints * pointRate;
  const finalAmount = Math.max(0, totalBeforePoints - pointDiscount);
  const remainingWalletBalance = Math.max(0, balance - approvedPoints);

  const paymentMethodOptions = [];
  if (finalAmount === 0) {
    paymentMethodOptions.push("GEOVERSE_POINT");
  } else {
    paymentMethodOptions.push("GEOVERSE_POINT_PLUS_QRIS");
    paymentMethodOptions.push("GEOVERSE_POINT_PLUS_CASH");
    paymentMethodOptions.push("GEOVERSE_POINT_PLUS_BANK_TRANSFER");
  }

  return {
    service: normalizedService,
    pointRate,
    grossAmount: subtotal + dFee + sFee,
    subtotal,
    voucherDiscount: vDiscount,
    deliveryFee: dFee,
    serviceFee: sFee,
    eligibleAmount: totalBeforePoints,
    requestedPoints: reqPoints,
    approvedPoints,
    pointDiscount,
    finalAmount,
    remainingWalletBalance,
    paymentMethodOptions,
  };
}

/**
 * Credits points to customer wallet and records to ledger
 * Idempotent: same (sourceType + sourceId) will not double-credit
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
  operationKey = null,
  idempotencyKey = null,
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Poin yang dikreditkan harus lebih besar dari nol.");
  }

  const opKey = operationKey || idempotencyKey || `EARN-${sourceType}-${sourceId}`;

  // Check if already credited for this specific source / operationKey
  const existingLedgerQuery = PointLedger.findOne({
    $or: [
      { operationKey: opKey },
      { sourceType, sourceId: String(sourceId), type: LEDGER_TYPES.EARN, status: "CONFIRMED" },
    ],
  });
  if (session) existingLedgerQuery.session(session);
  const existingLedger = await existingLedgerQuery;

  if (existingLedger) {
    console.warn(`[pointWalletService] Points already issued for ${sourceType} #${sourceId} (Key: ${opKey})`);
    const wallet = await getOrCreateWallet(userId, session);
    return { wallet, ledger: existingLedger, alreadyProcessed: true };
  }

  // Ensure wallet exists first
  await getOrCreateWallet(userId, session);

  // Atomically increment wallet balance
  const updatePayload = {
    $inc: {
      balancePoint: safePoints,
      lifetimeEarned: safePoints,
    },
  };
  if (kgDeposited > 0) {
    updatePayload.$inc.totalKgDeposited = Math.round(kgDeposited * 10) / 10;
    updatePayload.$inc.depositCount = 1;
  }
  if (co2ReductionKg > 0) {
    updatePayload.$inc.totalCo2ReductionKg = Math.round(co2ReductionKg * 10) / 10;
  }

  const walletOptions = { new: true };
  if (session) walletOptions.session = session;
  const wallet = await PointWallet.findOneAndUpdate({ userId }, updatePayload, walletOptions);

  const balanceAfter = wallet.balancePoint;
  const balanceBefore = balanceAfter - safePoints;

  // Create immutable ledger record
  const ledgerId = `LED-EARN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerDoc = {
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
    operationKey: opKey,
    idempotencyKey: idempotencyKey || opKey,
  };

  const ledgerOptions = session ? [{ session }] : [];
  const createdLedger = await PointLedger.create([ledgerDoc], ...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger, alreadyProcessed: false };
}

/**
 * Debits points from customer wallet for vouchers, cash redemptions, or checkout payments
 * Uses atomic conditional update (balancePoint >= requestedPoints) to prevent negative balance or race conditions.
 * Idempotent: duplicate debit with same (sourceType + sourceId + type) or operationKey returns existing transaction.
 */
async function debitPoints({
  userId,
  points,
  type = LEDGER_TYPES.PAYMENT,
  sourceType,
  sourceId,
  notes = "",
  actorId = null,
  session = null,
  operationKey = null,
  idempotencyKey = null,
}) {
  const safePoints = Math.round(Number(points) || 0);
  if (safePoints <= 0) {
    throw new Error("Poin yang didebit harus lebih besar dari nol.");
  }

  // Canonicalize enum: SHOP_PAYMENT -> PAYMENT
  const canonicalType = type === "SHOP_PAYMENT" ? LEDGER_TYPES.PAYMENT : (LEDGER_TYPES[type] || type);
  if (!Object.values(LEDGER_TYPES).includes(canonicalType)) {
    throw new Error(`Tipe transaksi ledger '${type}' tidak valid.`);
  }

  const opKey = operationKey || idempotencyKey || `DEBIT-${sourceType}-${sourceId}-${canonicalType}`;

  // Idempotency check: if debit already completed, return existing record
  const existingLedgerQuery = PointLedger.findOne({
    $or: [
      { operationKey: opKey },
      { sourceType, sourceId: String(sourceId), type: canonicalType, status: "CONFIRMED" },
    ],
  });
  if (session) existingLedgerQuery.session(session);
  const existingLedger = await existingLedgerQuery;

  if (existingLedger) {
    console.warn(`[pointWalletService] Points already debited for ${sourceType} #${sourceId} (Key: ${opKey})`);
    const wallet = await getOrCreateWallet(userId, session);
    return { wallet, ledger: existingLedger, alreadyProcessed: true };
  }

  // Ensure wallet exists before atomic conditional update
  await getOrCreateWallet(userId, session);

  // Atomic Conditional Update: Only update if balancePoint >= safePoints!
  const updateQuery = {
    userId,
    balancePoint: { $gte: safePoints },
  };
  const updatePayload = {
    $inc: {
      balancePoint: -safePoints,
      lifetimeRedeemed: safePoints,
    },
  };
  const updateOptions = { new: true };
  if (session) updateOptions.session = session;

  const wallet = await PointWallet.findOneAndUpdate(updateQuery, updatePayload, updateOptions);

  if (!wallet) {
    // Determine current balance for informative rejection
    const currentWallet = await PointWallet.findOne({ userId }).session(session || null);
    const available = currentWallet?.balancePoint || 0;
    throw new Error(
      `Saldo GEOVERSE Point tidak mencukupi (Tersedia: ${available}, Dibutuhkan: ${safePoints}).`
    );
  }

  const balanceAfter = wallet.balancePoint;
  const balanceBefore = balanceAfter + safePoints;

  // Create ledger record
  const ledgerId = `LED-DEBIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerDoc = {
    ledgerId,
    userId,
    type: canonicalType,
    sourceType,
    sourceId: String(sourceId),
    points: -safePoints,
    balanceBefore,
    balanceAfter,
    status: "CONFIRMED",
    notes: notes || `Penggunaan poin (${sourceType})`,
    createdBy: actorId || userId,
    operationKey: opKey,
    idempotencyKey: idempotencyKey || opKey,
  };

  const ledgerOptions = session ? [{ session }] : [];
  const createdLedger = await PointLedger.create([ledgerDoc], ...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger, alreadyProcessed: false };
}

/**
 * Reverses previously debited points (e.g. if cash redemption is rejected or order is cancelled)
 * Idempotent: duplicate reversal for same sourceId will NEVER add points twice!
 */
async function reversePoints({
  userId,
  points,
  sourceType = SOURCE_TYPES.REVERSAL,
  sourceId,
  notes = "",
  actorId = null,
  session = null,
  reversalKey = null,
  idempotencyKey = null,
}) {
  const safePoints = Math.round(Math.abs(Number(points) || 0));
  if (safePoints <= 0) return null;

  const revKey = reversalKey || idempotencyKey || `REV-${sourceType}-${sourceId}`;

  // Idempotency check: if reversal already recorded, return existing record without adding points again
  const existingReversalQuery = PointLedger.findOne({
    $or: [
      { operationKey: revKey },
      { sourceType, sourceId: String(sourceId), type: LEDGER_TYPES.REVERSAL },
    ],
  });
  if (session) existingReversalQuery.session(session);
  const existingReversal = await existingReversalQuery;

  if (existingReversal) {
    console.warn(`[pointWalletService] Points already reversed for ${sourceType} #${sourceId} (Key: ${revKey})`);
    const wallet = await getOrCreateWallet(userId, session);
    return { wallet, ledger: existingReversal, alreadyProcessed: true };
  }

  // Ensure wallet exists
  await getOrCreateWallet(userId, session);

  // Atomically increment wallet balance back
  const walletOptions = { new: true };
  if (session) walletOptions.session = session;

  const wallet = await PointWallet.findOneAndUpdate(
    { userId },
    {
      $inc: {
        balancePoint: safePoints,
        lifetimeRedeemed: -safePoints,
      },
    },
    walletOptions
  );

  const balanceAfter = wallet.balancePoint;
  const balanceBefore = balanceAfter - safePoints;

  const ledgerId = `LED-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerDoc = {
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
    operationKey: revKey,
    idempotencyKey: idempotencyKey || revKey,
  };

  const ledgerOptions = session ? [{ session }] : [];
  const createdLedger = await PointLedger.create([ledgerDoc], ...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger, alreadyProcessed: false };
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

  // Ensure wallet exists
  await getOrCreateWallet(userId, session);

  const updateQuery = { userId };
  if (safePoints < 0) {
    updateQuery.balancePoint = { $gte: Math.abs(safePoints) };
  }

  const updatePayload = {
    $inc: {
      balancePoint: safePoints,
      ...(safePoints > 0 ? { lifetimeEarned: safePoints } : { lifetimeRedeemed: Math.abs(safePoints) }),
    },
  };

  const walletOptions = { new: true };
  if (session) walletOptions.session = session;

  const wallet = await PointWallet.findOneAndUpdate(updateQuery, updatePayload, walletOptions);

  if (!wallet) {
    throw new Error("Adjustment tidak dapat menghasilkan saldo negatif.");
  }

  const balanceAfter = wallet.balancePoint;
  const balanceBefore = balanceAfter - safePoints;

  const ledgerId = `LED-ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const ledgerDoc = {
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
    operationKey: `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  const ledgerOptions = session ? [{ session }] : [];
  const createdLedger = await PointLedger.create([ledgerDoc], ...ledgerOptions);
  const ledger = Array.isArray(createdLedger) ? createdLedger[0] : createdLedger;

  return { wallet, ledger };
}

module.exports = {
  getWalletConfig,
  getOrCreateWallet,
  calculatePaymentQuote,
  creditPoints,
  debitPoints,
  reversePoints,
  adjustPoints,
  setPointRate,
  getPointRate,
};
