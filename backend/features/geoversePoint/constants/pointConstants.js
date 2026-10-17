/**
 * pointConstants.js
 * Central business rules and configuration for GEOVERSE Point
 */

let dynamicPointRate = Number(process.env.GEOVERSE_POINT_RATE) || 1;

module.exports = {
  // Conversion configuration (authoritative on backend, configurable)
  get POINT_TO_RUPIAH_RATE() {
    return dynamicPointRate;
  },
  setPointRate(rate) {
    const parsed = Number(rate);
    if (!isNaN(parsed) && parsed > 0) {
      dynamicPointRate = parsed;
    }
  },
  getPointRate() {
    return dynamicPointRate;
  },

  // Presets to satisfy Client Decision D13
  POINT_CONVERSION_RATIO_PRESETS: {
    ONE_TO_ONE: { name: "1 Rupiah = 1 Poin", rate: 1, description: "Setara langsung nilai rupiah" },
    TEN_PER_THOUSAND: { name: "Rp 1.000 = 10 Poin", rate: 100, description: "1 Poin = Rp 100" },
    ONE_PER_HUNDRED: { name: "Rp 100 = 1 Poin", rate: 100, description: "1 Poin = Rp 100" },
  },

  convertRupiahToPoints(rupiahAmount, pointRate = dynamicPointRate) {
    const r = Number(pointRate) || 1;
    return Math.floor((Number(rupiahAmount) || 0) / r);
  },

  convertPointsToRupiah(pointsAmount, pointRate = dynamicPointRate) {
    const r = Number(pointRate) || 1;
    return Math.round((Number(pointsAmount) || 0) * r);
  },

  MIN_CASH_REDEMPTION_POINTS: 10000, // Min 10,000 points (Rp 10.000) for cash withdrawal

  // Supported redemption channels
  REDEMPTION_TYPES: ["VOUCHER", "CASH", "BANK_TRANSFER", "E_WALLET"],
  
  // Redemption lifecycle statuses
  REDEMPTION_STATUSES: {
    REQUESTED: "REQUESTED",
    REVIEWING: "REVIEWING",
    APPROVED: "APPROVED",
    PAID: "PAID",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
  },

  // Ledger transaction types (Canonical Enum)
  LEDGER_TYPES: {
    EARN: "EARN",
    REDEEM_VOUCHER: "REDEEM_VOUCHER",
    REDEEM_CASH: "REDEEM_CASH",
    PAYMENT: "PAYMENT",
    REVERSAL: "REVERSAL",
    ADJUSTMENT: "ADJUSTMENT",
  },

  // Source types linking to various services
  SOURCE_TYPES: {
    WASTE_DEPOSIT: "WASTE_DEPOSIT",
    VOUCHER: "VOUCHER",
    CASH_REDEMPTION: "CASH_REDEMPTION",
    ADMIN: "ADMIN",
    KANYAAH_SHOP: "KANYAAH_SHOP",
    KANYAAH_RIDE: "KANYAAH_RIDE",
    KANYAAH_SEND: "KANYAAH_SEND",
    CATERING: "CATERING",
    LAUNDRY: "LAUNDRY",
    MARKETPLACE: "MARKETPLACE",
    REVERSAL: "REVERSAL",
  },

  // Services that accept GEOVERSE Point payments/discounts
  ALLOWED_PAYMENT_SERVICES: [
    "KANYAAH_SHOP",
    "KANYAAH_RIDE",
    "KANYAAH_SEND",
    "CATERING",
    "LAUNDRY",
    "MARKETPLACE",
  ],
};
