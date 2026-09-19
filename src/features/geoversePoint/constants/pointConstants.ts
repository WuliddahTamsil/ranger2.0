export const GEOVERSE_POINT_THEME = {
  primary: "#15803D", // Main GEOVERSE forest green
  primaryDark: "#14532D",
  primaryLight: "#16A34A",
  mintBg: "#ECFDF5",
  mintBorder: "#A7F3D0",
  mintText: "#047857",
  rewardAmber: "#D97706",
  rewardBg: "#FEF3C7",
  rewardBorder: "#FDE68A",
  dangerRed: "#DC2626",
  dangerBg: "#FEE2E2",
  bgApp: "#F8FAFC",
  cardBg: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  borderLight: "#E2E8F0",
  borderMedium: "#CBD5E1",
};

export const DEFAULT_POINT_RATE = 1; // 1 Point = Rp 1 (authoritative from backend)
export const MIN_CASH_WITHDRAWAL_POINTS = 5000;

export const WITHDRAWAL_CHANNELS = [
  { id: "CASH_AT_BANK", name: "Tunai di Bank Sampah", icon: "banknote", min: 5000 },
  { id: "BCA", name: "Transfer Bank BCA", icon: "building", min: 10000 },
  { id: "MANDIRI", name: "Transfer Bank Mandiri", icon: "building", min: 10000 },
  { id: "BRI", name: "Transfer Bank BRI", icon: "building", min: 10000 },
  { id: "GOPAY", name: "Saldo GoPay", icon: "smartphone", min: 5000 },
  { id: "OVO", name: "Saldo OVO", icon: "smartphone", min: 5000 },
  { id: "DANA", name: "Saldo DANA", icon: "smartphone", min: 5000 },
  { id: "SHOPEEPAY", name: "Saldo ShopeePay", icon: "smartphone", min: 5000 },
] as const;
