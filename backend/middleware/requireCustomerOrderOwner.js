const isMatchingCustomer = (requestedId, authUser) => {
  if (!requestedId || !authUser) return false;
  const role = String(authUser?.role || "").trim().toLowerCase();
  if (role === "admin" || role === "super_admin") return true;

  const reqStr = String(requestedId).trim();
  const authId = String(authUser._id || "").trim();

  if (reqStr === "me" || reqStr === "current") return true;
  if (reqStr === authId) return true;
  return false;
};

const requireCustomerOrderOwner = (req, res, next) => {
  const authUser = req.authUser;
  if (!authUser) {
    return res.status(401).json({ success: false, message: "Sesi login tidak valid atau sudah berakhir." });
  }

  const role = String(authUser?.role || "").trim().toLowerCase();
  const isCustomerRole = role === "customer" || role === "pelanggan" || role === "user" || role === "pengguna" || role === "admin" || role === "super_admin";
  if (!isCustomerRole) {
    return res.status(403).json({ success: false, message: "Aksi ini hanya tersedia untuk akun pelanggan." });
  }

  const requestedCustomerId = req.params.customerId || req.body?.customerId;
  if (requestedCustomerId && !isMatchingCustomer(requestedCustomerId, authUser)) {
    return res.status(403).json({ success: false, message: "Pesanan hanya dapat diakses oleh pemilik akun." });
  }

  if (req.body && typeof req.body === "object") {
    req.body.customerId = String(authUser._id);
  }
  return next();
};

module.exports = { requireCustomerOrderOwner, isMatchingCustomer };

