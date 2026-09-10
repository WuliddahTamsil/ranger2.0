import { StyleSheet } from "react-native";

export const authColors = {
  primary: "#087A4B",
  primaryDark: "#075B3A",
  mint: "#E8F5EE",
  ink: "#142238",
  muted: "#718096",
  line: "#E5E9EE",
  surface: "#FFFFFF",
  background: "#FBFCFE",
  danger: "#B91C1C",
  dangerBg: "#FEF2F2",
  warning: "#B45309",
  warningBg: "#FFFBEB",
};

export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: authColors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 42 },
  brand: { color: authColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.15, textTransform: "uppercase" },
  title: { color: authColors.ink, fontSize: 30, lineHeight: 37, fontWeight: "800", letterSpacing: -0.45, marginTop: 9 },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  card: {
    backgroundColor: authColors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: authColors.line,
    marginTop: 20,
    shadowColor: "#132238",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  label: { color: authColors.ink, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 14, minHeight: 52, paddingHorizontal: 14, color: authColors.ink, fontSize: 14 },
  primaryButton: { backgroundColor: authColors.primary, minHeight: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, shadowColor: "#075B3A", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  secondaryButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D6DDE6", minHeight: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: authColors.ink, fontWeight: "700", fontSize: 14 },
  error: { color: authColors.danger, backgroundColor: authColors.dangerBg, borderRadius: 10, padding: 11, fontSize: 13, lineHeight: 18 },
});
