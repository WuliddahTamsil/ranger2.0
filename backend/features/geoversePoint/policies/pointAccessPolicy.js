/**
 * pointAccessPolicy.js
 * Authorization checks for GEOVERSE Point operations
 */

function enforceWalletOwner(req, res, next) {
  if (!req.authUser || !req.authUser._id) {
    return res.status(401).json({ success: false, message: "Autentikasi diperlukan." });
  }

  // Prevent customer from accessing another user's wallet via query/body parameter
  const targetUserId = req.params.userId || req.query.userId || req.body.userId;
  if (targetUserId && String(targetUserId) !== String(req.authUser._id) && req.authUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda hanya dapat mengakses dompet poin milik Anda sendiri.",
    });
  }

  next();
}

function enforceStaffOrAdmin(req, res, next) {
  if (!req.authUser || !req.authUser._id) {
    return res.status(401).json({ success: false, message: "Autentikasi diperlukan." });
  }

  const allowedRoles = ["admin", "bank_sampah"];
  if (!allowedRoles.includes(req.authUser.role)) {
    return res.status(403).json({
      success: false,
      message: "Hanya petugas Bank Sampah atau Admin yang berwenang melakukan tindakan ini.",
    });
  }

  next();
}

module.exports = {
  enforceWalletOwner,
  enforceStaffOrAdmin,
};
