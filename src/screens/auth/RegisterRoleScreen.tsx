import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Bike, Building2, ChevronRight, Coffee, ShieldCheck, ShoppingBag, UserRound, WashingMachine } from "lucide-react-native";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { Nav } from "../../types";
import { AuthRegistrationRole, GoogleProfile, ROLE_LABELS } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { googleClientIds, googleConfigMessage, hasGoogleClientId } from "./googleAuth";
import { AuthBrand } from "./components/AuthBrand";
import { GoogleLogo } from "./components/GoogleLogo";

interface Props extends Nav {
  googleDraft?: GoogleProfile | null;
  onGoogleConnect?: (accessToken?: string) => Promise<void>;
  onSelect: (role: AuthRegistrationRole) => void;
}

const options: Array<{ role: AuthRegistrationRole; description: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = [
  { role: "customer", description: "Belanja produk, catering, laundry, dan layanan lokal.", icon: UserRound, color: "#1B7A4E" },
  { role: "driver", description: "Antarkan pesanan dan dapatkan penghasilan fleksibel.", icon: Bike, color: "#EA580C" },
  { role: "pemilik_marketplace", description: "Jual produk UMKM dan kelola toko online.", icon: ShoppingBag, color: "#059669" },
  { role: "pemilik_catering", description: "Terima pesanan catering dan kelola menu usaha.", icon: Coffee, color: "#D97706" },
  { role: "pemilik_laundry", description: "Kelola order laundry dan status pengerjaan.", icon: WashingMachine, color: "#0284C7" },
  { role: "pemilik_kos", description: "Kelola kamar kos dan pengajuan penghuni baru.", icon: Building2, color: "#7C3AED" },
];

export const RegisterRoleScreen: React.FC<Props> = ({ navigate, googleDraft, onGoogleConnect, onSelect }) => {
  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={[authStyles.scroll, styles.scroll]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
        <TouchableOpacity onPress={() => navigate("login")} style={styles.back} activeOpacity={0.75}>
          <ArrowLeft size={17} color={authColors.primary} />
          <Text style={styles.backText}>Kembali ke login</Text>
        </TouchableOpacity>
        <AuthBrand />
        <View style={styles.heading}>
          <Text style={authStyles.title}>Mulai dari peranmu</Text>
          <Text style={authStyles.subtitle}>Pilih jenis akun yang sesuai. Data dan dokumen yang diminta akan menyesuaikan peran ini.</Text>
        </View>

        {googleDraft ? (
          <View style={styles.googleAccountBadge}>
            <GoogleLogo size={22} />
            <View style={styles.googleAccountCopy}>
              <Text style={styles.googleAccountTitle}>Terhubung Akun Google</Text>
              <Text style={styles.googleAccountSub}>{googleDraft.name} ({googleDraft.email})</Text>
            </View>
            <ShieldCheck size={18} color={authColors.primary} />
          </View>
        ) : onGoogleConnect && hasGoogleClientId ? <GoogleConnectButton onConnect={onGoogleConnect} /> : null}

        <View style={styles.notice}><ShieldCheck size={18} color={authColors.primary} /><Text style={styles.noticeText}>Satu akun hanya menggunakan satu peran agar akses dashboard dan verifikasi berkas tetap aman.</Text></View>
        <View style={styles.list}>
          {options.map(({ role, description, icon: Icon, color }) => (
            <TouchableOpacity key={role} onPress={() => onSelect(role)} activeOpacity={0.8} style={styles.option}>
              <View style={[styles.icon, { backgroundColor: `${color}18` }]}><Icon size={25} color={color} /></View>
              <View style={styles.optionText}><Text style={styles.optionTitle}>{ROLE_LABELS[role]}</Text><Text style={styles.optionDescription}>{description}</Text></View>
              <View style={styles.chevron}><ChevronRight size={17} color={authColors.primary} /></View>
            </TouchableOpacity>
          ))}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const GoogleConnectButton: React.FC<{ onConnect: (accessToken?: string) => Promise<void> }> = ({ onConnect }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [request, , promptAsync] = Google.useAuthRequest({ ...googleClientIds, redirectUri: makeRedirectUri({ scheme: "geoverse" }) });

  const connect = async () => {
    setError("");
    setLoading(true);
    try {
      if (!request) throw new Error(googleConfigMessage);
      const result = await promptAsync();
      if (result.type === "success") {
        const token = result.authentication?.accessToken || result.params?.id_token || result.params?.access_token;
        if (token) await onConnect(token);
      } else if (result.type === "error") {
        setError(result.params?.error === "disabled_client"
          ? "Google OAuth Client sedang dinonaktifkan. Ganti Client ID aktif di file .env."
          : "Login Google ditolak atau dibatalkan. Coba lagi.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyambungkan Google.");
    } finally {
      setLoading(false);
    }
  };

  return <><TouchableOpacity style={[authStyles.secondaryButton, styles.googleRoleBtn]} onPress={() => void connect()} disabled={loading} activeOpacity={0.8}>{loading ? <ActivityIndicator color={authColors.primary} /> : <><GoogleLogo size={22} /><Text style={styles.googleRoleBtnText}>Daftar lebih cepat dengan Google</Text></>}</TouchableOpacity>{error ? <Text style={styles.googleErrorText}>{error}</Text> : null}</>;
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 38, justifyContent: "center" },
  card: { width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E5E9EE", padding: 36, shadowColor: "#142238", shadowOpacity: 0.07, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, marginBottom: 28 },
  backText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  heading: { marginTop: 30 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: authColors.mint, borderRadius: 15, padding: 14, marginTop: 22 },
  noticeText: { flex: 1, color: authColors.primaryDark, fontSize: 12, lineHeight: 18 },
  list: { gap: 12, marginTop: 18 },
  option: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: authColors.line, padding: 15, flexDirection: "row", alignItems: "center", shadowColor: "#132238", shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  icon: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 13 },
  optionText: { flex: 1 },
  optionTitle: { color: authColors.ink, fontSize: 15, fontWeight: "800", letterSpacing: -0.1 },
  optionDescription: { color: authColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  chevron: { width: 30, height: 30, borderRadius: 15, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginLeft: 9 },
  googleAccountBadge: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: authColors.mint, borderWidth: 1, borderColor: "#CDE5D7", borderRadius: 15, padding: 12, marginTop: 18 },
  googleAccountCopy: { flex: 1 },
  googleAccountTitle: { color: authColors.primary, fontSize: 12.5, fontWeight: "800" },
  googleAccountSub: { color: authColors.ink, fontSize: 11.5, marginTop: 2 },
  googleRoleBtn: { flexDirection: "row", gap: 10, marginTop: 18 },
  googleRoleBtnText: { color: authColors.ink, fontSize: 13.5, fontWeight: "700" },
  googleErrorText: { color: "#DC2626", fontSize: 12, marginTop: 6 },
});
