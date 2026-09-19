/**
 * pointLedgerService.js
 * Digital Savings Book (Buku Tabungan Digital) query and audit service
 */

const PointLedger = require("../models/PointLedger");
const { getOrCreateWallet } = require("./pointWalletService");

/**
 * Retrieves paginated ledger transactions for a user
 */
async function getLedgerForUser(userId, { type, sourceType, limit = 50, page = 1 } = {}) {
  const filter = { userId };
  if (type && type !== "ALL") {
    filter.type = type;
  }
  if (sourceType) {
    filter.sourceType = sourceType;
  }

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [ledgers, total, wallet] = await Promise.all([
    PointLedger.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    PointLedger.countDocuments(filter),
    getOrCreateWallet(userId),
  ]);

  return {
    wallet,
    ledgers,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

/**
 * Retrieves recent activities (e.g. 5 latest transactions)
 */
async function getRecentActivities(userId, limit = 5) {
  return await PointLedger.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(20, Number(limit) || 5)))
    .lean();
}

module.exports = {
  getLedgerForUser,
  getRecentActivities,
};
