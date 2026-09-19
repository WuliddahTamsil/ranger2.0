/**
 * pointConstants.js
 * Central business rules and configuration for GEOVERSE Point
 */

module.exports = {
  // Conversion configuration (authoritative on backend)
  POINT_TO_RUPIAH_RATE: 1, // 1 GEOVERSE Point = Rp 1
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

  // Ledger transaction types
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
    REVERSAL: "REVERSAL",
  },

  // Services that accept GEOVERSE Point payments/discounts
  ALLOWED_PAYMENT_SERVICES: [
    "KANYAAH_SHOP",
    "KANYAAH_RIDE",
    "KANYAAH_SEND",
    "CATERING",
    "LAUNDRY",
  ],
};
