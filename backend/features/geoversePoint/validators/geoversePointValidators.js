/**
 * geoversePointValidators.js
 * Payload validation for point redemptions and adjustments
 */

const { REDEMPTION_TYPES } = require("../constants/pointConstants");

function validateCreateRedemption(req, res, next) {
  const { type = "VOUCHER", points } = req.body;

  if (!REDEMPTION_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Tipe penukaran '${type}' tidak valid. Pilihan: ${REDEMPTION_TYPES.join(", ")}.`,
    });
  }

  const safePoints = Math.round(Number(points));
  if (isNaN(safePoints) || safePoints <= 0) {
    return res.status(400).json({
      success: false,
      message: "Jumlah poin yang ditukarkan harus berupa angka positif lebih dari nol.",
    });
  }

  if (type === "VOUCHER" && !req.body.voucherId) {
    return res.status(400).json({
      success: false,
      message: "Voucher yang ingin ditukarkan wajib dipilih.",
    });
  }

  next();
}

function validateAdminAdjustment(req, res, next) {
  const { points, reason } = req.body;

  const safePoints = Math.round(Number(points));
  if (isNaN(safePoints) || safePoints === 0) {
    return res.status(400).json({
      success: false,
      message: "Nominal adjustment poin harus berupa angka tidak nol.",
    });
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: "Alasan adjustment wajib diisi minimal 5 karakter untuk audit trail.",
    });
  }

  next();
}

module.exports = {
  validateCreateRedemption,
  validateAdminAdjustment,
};
