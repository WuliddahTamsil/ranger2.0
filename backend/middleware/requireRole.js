const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.authUser) {
    return res.status(401).json({ success: false, message: "Sesi login tidak valid atau sudah berakhir." });
  }
  if (!allowedRoles.includes(req.authUser.role)) {
    return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk tindakan ini." });
  }
  return next();
};

module.exports = { requireRole };
