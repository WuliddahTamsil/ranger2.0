import { StyleSheet } from "react-native";

export const authColors = {
  primary: "#1B7A4E",
  primaryDark: "#145C3B",
  mint: "#E8F5EE",
  ink: "#111827",
  muted: "#6B7280",
  line: "#E5E7EB",
  surface: "#FFFFFF",
  background: "#F7FAF8",
  danger: "#B91C1C",
  dangerBg: "#FEF2F2",
  warning: "#B45309",
  warningBg: "#FFFBEB",
};

export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: authColors.background },
  scroll: { padding: 20, paddingBottom: 36 },
  brand: { color: authColors.primary, fontSize: 13, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: authColors.ink, fontSize: 28, fontWeight: "800", marginTop: 8 },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  card: { backgroundColor: authColors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: authColors.line, marginTop: 20 },
  label: { color: "#374151", fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, minHeight: 48, paddingHorizontal: 14, color: authColors.ink, fontSize: 14 },
  primaryButton: { backgroundColor: authColors.primary, minHeight: 50, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: authColors.line, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: authColors.ink, fontWeight: "700", fontSize: 14 },
  error: { color: authColors.danger, backgroundColor: authColors.dangerBg, borderRadius: 10, padding: 11, fontSize: 13, lineHeight: 18 },
});
