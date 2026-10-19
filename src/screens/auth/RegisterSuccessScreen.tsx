import React from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CheckCircle2, Clock3, ArrowRight, LogIn, Sparkles } from "lucide-react-native";
import { AuthAccount } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { Nav } from "../../types";
import { AuthBrand } from "./components/AuthBrand";

interface Props extends Nav {
  account: AuthAccount;
  onContinue: () => void;
}

export const RegisterSuccessScreen: React.FC<Props> = ({ navigate, account, onContinue }) => {
  const isCustomer = account.role === "customer";
  const firstName = account.name.split(" ")[0];

  return (
    <ResponsiveSafeAreaView style={authStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          <View style={styles.brandHeader}>
            <AuthBrand size={40} />
          </View>

          <View style={styles.successIconWrap}>
            <CheckCircle2 size={40} color={authColors.primary} />
          </View>

          <View style={styles.statusBadge}>
            <Sparkles size={13} color={authColors.primaryDark} />
            <Text style={styles.statusBadgeText}>Registrasi Berhasil</Text>
          </View>

          <Text style={styles.title}>Selamat Datang, {firstName}!</Text>
          <Text style={styles.subtitle}>
            Akun Anda ({account.email}) telah terdaftar dalam sistem GEOVERSE 2.0 sebagai{" "}
            <Text style={{ fontWeight: "700", color: authColors.ink }}>
              {isCustomer ? "Pelanggan" : "Mitra"}
            </Text>
            .
          </Text>

          {isCustomer ? (
            <View style={styles.verifiedBox}>
              <CheckCircle2 size={18} color={authColors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedTitle}>Akun Langsung Aktif</Text>
                <Text style={styles.verifiedSub}>
                  Anda dapat langsung menjelajah UMKM, memesan ride/send, katering, atau mengumpulkan reward poin sampah.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.pendingBox}>
              <Clock3 size={18} color={authColors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Verifikasi Dokumen Diproses</Text>
                <Text style={styles.pendingSub}>
                  Admin GEOVERSE sedang meninjau data dan dokumen pendaftaran Anda. Status verifikasi dapat dipantau di akun.
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={onContinue}
            style={[authStyles.primaryButton, styles.primaryBtn]}
            activeOpacity={0.85}
          >
            <Text style={authStyles.primaryButtonText}>
              {isCustomer ? "Mulai Jelajahi Aplikasi" : "Lihat Dashboard Akun"}
            </Text>
            <ArrowRight size={17} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate("login")}
            style={[authStyles.secondaryButton, styles.secondaryBtn]}
            activeOpacity={0.8}
          >
            <LogIn size={16} color={authColors.muted} />
            <Text style={styles.secondaryBtnText}>Kembali ke Halaman Masuk</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: Platform.OS === "web" ? 28 : 20,
    paddingVertical: 28,
    alignItems: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
      } as any,
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      },
    }),
  },
  brandHeader: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  successIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  statusBadgeText: {
    color: authColors.primaryDark,
    fontSize: 11.5,
    fontWeight: "700",
  },
  title: {
    color: authColors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  verifiedBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  verifiedTitle: {
    color: "#166534",
    fontSize: 12.5,
    fontWeight: "700",
  },
  verifiedSub: {
    color: "#15803D",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  pendingBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  pendingTitle: {
    color: "#92400E",
    fontSize: 12.5,
    fontWeight: "700",
  },
  pendingSub: {
    color: "#B45309",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  secondaryBtn: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: {
    color: authColors.inkSecondary,
    fontSize: 13.5,
    fontWeight: "600",
  },
});
