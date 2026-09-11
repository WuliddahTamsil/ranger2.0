const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "rangers_app_secret";

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

const verifyAccessToken = async (token) => {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) return null;
    return await User.findById(payload.id).lean();
  } catch {
    return null;
  }
};

const requireAuth = async (req, res, next) => {
  const user = await verifyAccessToken(getBearerToken(req));
  if (!user) {
    return res.status(401).json({ success: false, message: "Sesi login tidak valid atau sudah berakhir." });
  }
  req.authUser = user;
  req.user = user;
  return next();
};

module.exports = { getBearerToken, verifyAccessToken, requireAuth };
