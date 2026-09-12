const requireCustomerOrderOwner = (req, res, next) => {
  const authUser = req.authUser;
  const requestedCustomerId = req.params.customerId || req.body?.customerId;
  if (!authUser || authUser.role !== "customer") {
    return res.status(403).json({ success: false, message: "Aksi ini hanya tersedia untuk akun pelanggan." });
  }
  if (requestedCustomerId && String(requestedCustomerId) !== String(authUser._id)) {
    return res.status(403).json({ success: false, message: "Pesanan hanya dapat diakses oleh pemilik akun." });
  }
  if (req.body) req.body.customerId = String(authUser._id);
  return next();
};

module.exports = { requireCustomerOrderOwner };
