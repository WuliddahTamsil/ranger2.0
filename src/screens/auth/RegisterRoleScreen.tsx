import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Bike, Building2, ChevronRight, Coffee, ShieldCheck, ShoppingBag, UserRound, WashingMachine } from "lucide-react-native";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { Nav } from "../../types";
import { AuthRegistrationRole, GoogleCredential, GoogleProfile, ROLE_LABELS } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { googleClientIds, googleConfigMessage, hasGoogleClientId } from "./googleAuth";
import { AuthBrand } from "./components/AuthBrand";
import { GoogleLogo } from "./components/GoogleLogo";

interface Props extends Nav {
  googleDraft?: GoogleProfile | null;
  onGoogleConnect?: (credential: GoogleCredential) => Promise<void>;
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
    <ResponsiveSafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={[authStyles.scroll, styles.scroll]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
        <TouchableOpacity onPress={() => navigate("login")} style={styles.back} activeOpacity={0.75}>
          <ArrowLeft size={17} color={authColors.primary} />
          <Text style={styles.backText}>Kembali ke login</Text>
        </TouchableOpacity>
        <AuthBrand />
        <View style={styles.heading}>
          <Text style={authStyles.title}>Pilih jenis akun</Text>
          <Text style={authStyles.subtitle}>Pilih satu peran untuk melanjutkan. Data dan dokumen berikutnya akan menyesuaikan pilihanmu.</Text>
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

        <View style={styles.notice}><ShieldCheck size={17} color={authColors.primary} /><Text style={styles.noticeText}>Satu akun digunakan untuk satu peran.</Text></View>
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
    </ResponsiveSafeAreaView>
  );
};

const GoogleConnectButton: React.FC<{ onConnect: (credential: GoogleCredential) => Promise<void> }> = ({ onConnect }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [request, , promptAsync] = Google.useAuthRequest({
    ...googleClientIds,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    redirectUri: makeRedirectUri({ scheme: "geoverse" }),
  });

  const connect = async () => {
    setError("");
    setLoading(true);
    try {
      if (!request) throw new Error(googleConfigMessage);
      const result = await promptAsync();
      if (result.type === "success") {
        const credential: GoogleCredential = {
          accessToken: result.authentication?.accessToken || result.params?.access_token,
          idToken: result.authentication?.idToken || result.params?.id_token,
        };
        if (credential.accessToken || credential.idToken) await onConnect(credential);
        else throw new Error("Google tidak mengembalikan token autentikasi.");
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
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, justifyContent: "center" },
  card: { width: "100%", maxWidth: 600, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E5E9EE", padding: 28, shadowColor: "#142238", shadowOpacity: 0.035, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, marginBottom: 20 },
  backText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  heading: { marginTop: 26 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F6FAF8", borderRadius: 11, padding: 11, marginTop: 20, borderWidth: 1, borderColor: "#E2EFE7" },
  noticeText: { flex: 1, color: authColors.primaryDark, fontSize: 12 },
  list: { gap: 10, marginTop: 16 },
  option: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: authColors.line, padding: 13, flexDirection: "row", alignItems: "center" },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionText: { flex: 1 },
  optionTitle: { color: authColors.ink, fontSize: 14, fontWeight: "800", letterSpacing: -0.1 },
  optionDescription: { color: authColors.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginLeft: 9 },
  googleAccountBadge: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: authColors.mint, borderWidth: 1, borderColor: "#CDE5D7", borderRadius: 15, padding: 12, marginTop: 18 },
  googleAccountCopy: { flex: 1 },
  googleAccountTitle: { color: authColors.primary, fontSize: 12.5, fontWeight: "800" },
  googleAccountSub: { color: authColors.ink, fontSize: 11.5, marginTop: 2 },
  googleRoleBtn: { flexDirection: "row", gap: 10, marginTop: 18 },
  googleRoleBtnText: { color: authColors.ink, fontSize: 13.5, fontWeight: "700" },
  googleErrorText: { color: "#DC2626", fontSize: 12, marginTop: 6 },
});
