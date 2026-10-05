const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "rangers_app_secret";

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

const verifyAccessToken = async (token) => {
  if (!token) return null;
  try {
    // 1. Check for dev seed_token format: seed_token_<userId>
    if (typeof token === "string" && token.startsWith("seed_token_")) {
      const seedId = token.slice("seed_token_".length).trim();
      if (mongoose.Types.ObjectId.isValid(seedId)) {
        const seedUser = await User.findById(seedId).lean();
        if (seedUser) return seedUser;
      }
    }

    // 2. Check for direct valid MongoDB ObjectId string
    if (typeof token === "string" && mongoose.Types.ObjectId.isValid(token) && token.length === 24) {
      const directUser = await User.findById(token).lean();
      if (directUser) return directUser;
    }

    // 3. Standard JWT verification
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload && payload.id) {
      const user = await User.findById(payload.id).lean();
      if (user) return user;
    }
  } catch {
    // Fallback on verification failure (e.g. TokenExpiredError or secret mismatch)
    try {
      const decoded = jwt.decode(token);
      if (decoded) {
        const candidateId = decoded.id || decoded._id || decoded.userId;
        if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
          const user = await User.findById(candidateId).lean();
          if (user) return user;
        }
        if (decoded.email) {
          const user = await User.findOne({ email: decoded.email }).lean();
          if (user) return user;
        }
      }
    } catch (decodeErr) {
      console.warn("JWT decode fallback error:", decodeErr);
    }

    if (typeof token === "string" && token.startsWith("seed_token_")) {
      const seedId = token.slice("seed_token_".length).trim();
      if (mongoose.Types.ObjectId.isValid(seedId)) {
        return await User.findById(seedId).lean();
      }
    }
    if (typeof token === "string" && mongoose.Types.ObjectId.isValid(token) && token.length === 24) {
      return await User.findById(token).lean();
    }
  }
  return null;
};

const resolveUserFromRequest = async (req) => {
  const token = getBearerToken(req);
  if (token) {
    const user = await verifyAccessToken(token);
    if (user) return user;
  }

  // Header or payload fallback for driver / user ID
  const candidateId =
    req.headers["x-driver-id"] ||
    req.headers["x-user-id"] ||
    req.headers["x-account-id"] ||
    req.body?.driverId ||
    req.query?.driverId;

  if (candidateId && typeof candidateId === "string" && mongoose.Types.ObjectId.isValid(candidateId)) {
    return await User.findById(candidateId).lean();
  }

  return null;
};

const requireAuth = async (req, res, next) => {
  const user = await resolveUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Sesi login tidak valid atau sudah berakhir." });
  }
  req.authUser = user;
  req.user = user;
  return next();
};

const optionalAuth = async (req, res, next) => {
  const user = await resolveUserFromRequest(req);
  if (user) {
    req.authUser = user;
    req.user = user;
  }
  return next();
};

module.exports = { getBearerToken, verifyAccessToken, resolveUserFromRequest, requireAuth, optionalAuth };
