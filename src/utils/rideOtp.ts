/**
 * Utility to calculate and verify consistent 4-digit Passenger OTP / PIN
 * for Kanyaah Ride passenger pickup verification.
 */
export const getRidePassengerOtp = (order?: {
  id?: string | number;
  orderCode?: string;
  pickupPin?: string;
  otp?: string;
} | null): string => {
  if (!order) return "1234";

  if (order.pickupPin && String(order.pickupPin).trim().length === 4) {
    return String(order.pickupPin).trim();
  }
  if (order.otp && String(order.otp).trim().length === 4) {
    return String(order.otp).trim();
  }

  const rawStr = String(order.orderCode || order.id || "KANYAAH");
  const digits = rawStr.replace(/\D/g, "");
  if (digits.length >= 4) {
    return digits.slice(-4);
  }

  // Deterministic 4-digit hash fallback
  let hash = 0;
  for (let i = 0; i < rawStr.length; i++) {
    hash = (hash * 31 + rawStr.charCodeAt(i)) % 9000;
  }
  return String(1000 + Math.abs(hash));
};
