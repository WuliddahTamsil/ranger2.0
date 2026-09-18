const crypto = require("crypto");

/**
 * Generate a cryptographically secure 6-digit PIN / OTP string
 */
const generateSixDigitCode = () => {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
};

/**
 * Hash a code with salt using scrypt or sha256
 */
const hashCode = (code, salt) => {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", finalSalt).update(String(code).trim()).digest("hex");
  return { hash, salt: finalSalt };
};

/**
 * Verify a candidate code against stored hash and salt
 */
const verifyCode = (candidateCode, storedHash, salt) => {
  if (!candidateCode || !storedHash || !salt) return false;
  const computedHash = crypto
    .createHmac("sha256", salt)
    .update(String(candidateCode).trim())
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
};

module.exports = {
  generateSixDigitCode,
  hashCode,
  verifyCode,
};
