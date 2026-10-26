const isMatchingCustomer = (requestedId, authUser) => {
  if (!requestedId || !authUser) return false;
  const role = String(authUser?.role || "").trim().toLowerCase();
  if (role === "admin" || role === "super_admin") return true;

  const reqStr = String(requestedId).trim();
  const authId = String(authUser._id || "").trim();
  const authEmail = String(authUser.email || "").trim().toLowerCase();
  const authPhone = String(authUser.phone || "").trim();

  if (reqStr === "me" || reqStr === "current") return true;
  if (reqStr === authId) return true;
  if (reqStr.toLowerCase() === authEmail) return true;
  if (authPhone && reqStr === authPhone) return true;

  // Support seed alias mapping
  if (reqStr === "customer_seed_001" && (authEmail === "wuliddahtamsilbarokah19@gmail.com" || authId === "6a85892d8d27c7d42a0d8ba8")) {
    return true;
  }
  if (authId === "customer_seed_001" && (reqStr === "6a85892d8d27c7d42a0d8ba8" || reqStr.toLowerCase() === "wuliddahtamsilbarokah19@gmail.com")) {
    return true;
  }
  return false;
};

const requireCustomerOrderOwner = (req, res, next) => {
  const authUser = req.authUser;
  const requestedCustomerId = req.params.customerId || req.body?.customerId;
  const role = String(authUser?.role || "").trim().toLowerCase();
  const isCustomerRole = role === "customer" || role === "pelanggan" || role === "user" || role === "pengguna" || role === "admin" || role === "super_admin";
  if (!authUser || !isCustomerRole) {
    return res.status(403).json({ success: false, message: "Aksi ini hanya tersedia untuk akun pelanggan." });
  }
  if (requestedCustomerId && !isMatchingCustomer(requestedCustomerId, authUser)) {
    return res.status(403).json({ success: false, message: "Pesanan hanya dapat diakses oleh pemilik akun." });
  }
  if (req.body && !req.body.customerId) {
    req.body.customerId = String(authUser._id);
  }
  return next();
};

module.exports = { requireCustomerOrderOwner, isMatchingCustomer };

