import { StyleSheet, Platform } from "react-native";

export const authColors = {
  primary: "#059669",        // Modern Emerald 600
  primaryDark: "#047857",    // Emerald 700
  primaryHover: "#065F46",   // Emerald 800
  primaryLight: "#ECFDF5",   // Emerald 50
  primaryBorder: "#A7F3D0",  // Emerald 200
  ink: "#0F172A",            // Slate 900
  inkSecondary: "#334155",   // Slate 700
  muted: "#64748B",          // Slate 500
  subtle: "#94A3B8",         // Slate 400
  line: "#E2E8F0",           // Slate 200
  lineLight: "#F1F5F9",      // Slate 100
  surface: "#FFFFFF",
  background: "#F8FAFC",     // Slate 50
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  warningBorder: "#FDE68A",
  success: "#10B981",
  successBg: "#ECFDF5",
  info: "#0284C7",
  infoBg: "#F0F9FF",
  mint: "#ECFDF5",
  mintBorder: "#A7F3D0",
};

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 44,
  },
  brand: {
    color: authColors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: authColors.ink,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: {
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  card: {
    backgroundColor: authColors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: authColors.line,
    marginTop: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
      } as any,
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      },
    }),
  },
  label: {
    color: authColors.inkSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: authColors.line,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    color: authColors.ink,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: authColors.primary,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.22)",
      } as any,
      default: {
        shadowColor: "#059669",
        shadowOpacity: 0.22,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: authColors.line,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      } as any,
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      },
    }),
  },
  secondaryButtonText: {
    color: authColors.ink,
    fontWeight: "600",
    fontSize: 14,
  },
  error: {
    color: authColors.danger,
    backgroundColor: authColors.dangerBg,
    borderWidth: 1,
    borderColor: authColors.dangerBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    lineHeight: 18,
  },
});
