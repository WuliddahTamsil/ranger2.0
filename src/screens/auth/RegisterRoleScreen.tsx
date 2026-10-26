import React, { useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Users,
  WashingMachine,
} from "lucide-react-native";
import * as Google from "expo-auth-session/providers/google";
import { Nav } from "../../types";
import { AuthRegistrationRole, GoogleCredential, GoogleProfile } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { getGoogleRedirectUri, googleClientIds, hasGoogleClientId } from "./googleAuth";
import { AuthBrand } from "./components/AuthBrand";
import { GoogleLogo } from "./components/GoogleLogo";

interface Props extends Nav {
  googleDraft?: GoogleProfile | null;
  onGoogleConnect?: (credential: GoogleCredential) => Promise<void>;
  onSelect: (role: AuthRegistrationRole) => void;
}

interface PartnerOption {
  role: AuthRegistrationRole;
  title: string;
  badge: string;
  description: string;
  requirement: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const partnerOptions: PartnerOption[] = [
  {
    role: "driver",
    title: "Driver Kanyaah (Ride & Send)",
    badge: "Mobilitas & Kirim",
    description: "Layanan ojek antar-jemput penumpang, kurir barang kilat, dan armada jemput sampah.",
    requirement: "Syarat: KTP, SIM aktif, STNK, foto kendaraan (SKCK opsional)",
    icon: Bike,
  },
  {
    role: "pemilik_marketplace",
    title: "Pemilik Marketplace (Kanyaah Mart)",
    badge: "Kanyaah Mart & UMKM",
    description: "Jual produk UMKM lokal, kerajinan, olahan makanan, fashion, & komoditas warga.",
    requirement: "Syarat simpel: KTP pemilik & foto produk/toko (NIB opsional)",
    icon: ShoppingBag,
  },
  {
    role: "pemilik_shop",
    title: "Kanyaah Shop (Toko & Apotek)",
    badge: "Retail & Apotek",
    description: "Minimarket, toko kelontong, retail harian, atau apotek penanggung jawab obat.",
    requirement: "Syarat: KTP & foto toko (SIPA/SIA khusus apotek)",
    icon: Store,
  },
  {
    role: "pemilik_catering",
    title: "Kanyaah Catering (Kuliner)",
    badge: "Kuliner & Katering",
    description: "Terima pesanan nasi box, prasmanan, kue & aneka kuliner lokal Kamojang.",
    requirement: "Syarat: KTP & foto dapur usaha (NIB & Halal opsional perintis)",
    icon: Coffee,
  },
  {
    role: "pemilik_laundry",
    title: "Kanyaah Laundry (Cuci & Setrika)",
    badge: "Layanan Laundry",
    description: "Layanan cuci kiloan, satuan, dry clean, dan antar jemput cucian warga.",
    requirement: "Syarat: KTP & foto outlet (NIB & Halal opsional perintis)",
    icon: WashingMachine,
  },
  {
    role: "pemilik_kos",
    title: "Homestay, Kos & Wisata",
    badge: "Hunian & Wisata",
    description: "Kelola kamar kos putri/putra, sewa homestay/villa, serta reservasi tiket wisata.",
    requirement: "Syarat: KTP, bukti kepemilikan/pengelolaan properti, foto kamar & fasilitas",
    icon: Building2,
  },
  {
    role: "bank_sampah",
    title: "Kanyaah Recycle (Bank Sampah)",
    badge: "Unit Daur Ulang",
    description: "Unit penimbangan sampah anorganik warga & pencairan saldo reward (Rp 1.000 = 10 Pts).",
    requirement: "Syarat: KTP pengelola & foto unit bank sampah",
    icon: Scale,
  },
];

export const RegisterRoleScreen: React.FC<Props> = ({
  navigate,
  googleDraft,
  onGoogleConnect,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<"customer" | "partner">("customer");

  return (
    <ResponsiveSafeAreaView style={authStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Top Bar with Back Button */}
          <TouchableOpacity
            onPress={() => navigate("login")}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={authColors.muted} />
            <Text style={styles.backBtnText}>Kembali ke halaman masuk</Text>
          </TouchableOpacity>

          {/* Header Brand */}
          <View style={styles.brandHeader}>
            <AuthBrand size={42} />
          </View>

          {/* Title & Introduction */}
          <View style={styles.heading}>
            <Text style={styles.title}>Pilih Jenis Akun</Text>
            <Text style={styles.subtitle}>
              Pilih peran Anda untuk mulai menjelajah atau bermitra dalam ekosistem GEOVERSE 2.0.
            </Text>
          </View>

          {/* Google Connected Status / Action (Hidden on iOS to comply with Apple Guideline 4.8 without Apple Sign In) */}
          {Platform.OS !== "ios" && (
            googleDraft ? (
              <View style={styles.googleConnectedBox}>
                <GoogleLogo size={19} />
                <View style={styles.googleConnectedTextWrap}>
                  <Text style={styles.googleConnectedTitle}>Terhubung Akun Google</Text>
                  <Text style={styles.googleConnectedSub}>
                    {googleDraft.name} ({googleDraft.email})
                  </Text>
                </View>
                <ShieldCheck size={17} color={authColors.primary} />
              </View>
            ) : onGoogleConnect && hasGoogleClientId ? (
              <GoogleConnectSection onConnect={onGoogleConnect} />
            ) : null
          )}

          {/* Modern Interactive Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab("customer")}
              style={[styles.tabBtn, activeTab === "customer" && styles.tabBtnActive]}
              activeOpacity={0.8}
            >
              <UserRound
                size={16}
                color={activeTab === "customer" ? authColors.primaryDark : authColors.muted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "customer" && styles.tabBtnTextActive,
                ]}
              >
                Akun Pelanggan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("partner")}
              style={[styles.tabBtn, activeTab === "partner" && styles.tabBtnActive]}
              activeOpacity={0.8}
            >
              <Users
                size={16}
                color={activeTab === "partner" ? authColors.primaryDark : authColors.muted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "partner" && styles.tabBtnTextActive,
                ]}
              >
                Mitra Usaha & Driver
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: AKUN PELANGGAN (HERO CARD YANG RAMAH & CEPAT) */}
          {activeTab === "customer" && (
            <View style={styles.customerHeroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconWrap}>
                  <UserRound size={26} color={authColors.primary} />
                </View>
                <View style={styles.heroBadge}>
                  <Sparkles size={12} color={authColors.primaryDark} />
                  <Text style={styles.heroBadgeText}>Daftar Cepat Tanpa Dokumen</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Pelanggan / Warga Komunitas</Text>
              <Text style={styles.heroDesc}>
                Akses semua kebutuhan harian, transportasi, dan layanan lokal Kamojang dalam satu aplikasi:
              </Text>

              <View style={styles.benefitList}>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={15} color={authColors.primary} />
                  <Text style={styles.benefitText}>
                    Belanja produk & sembako segar dari para pelaku UMKM lokal
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={15} color={authColors.primary} />
                  <Text style={styles.benefitText}>
                    Pesan ojek & antar barang praktis via Kanyaah Ride / Send
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={15} color={authColors.primary} />
                  <Text style={styles.benefitText}>
                    Pesan katering harian, laundry bersih, & sewa homestay
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={15} color={authColors.primary} />
                  <Text style={styles.benefitText}>
                    Setor sampah anorganik & kumpulkan saldo reward aplikasi
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onSelect("customer")}
                style={[authStyles.primaryButton, styles.heroCtaBtn]}
                activeOpacity={0.85}
              >
                <Text style={authStyles.primaryButtonText}>Daftar sebagai Pelanggan</Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: MITRA USAHA & DRIVER (DAFTAR OPSI MITRA LENGKAP & JELAS) */}
          {activeTab === "partner" && (
            <View style={styles.partnerSection}>
              <Text style={styles.partnerHint}>
                Pilih bidang usaha atau layanan yang Anda sediakan:
              </Text>

              <View style={styles.partnerGrid}>
                {partnerOptions.map((opt) => {
                  const IconComp = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.role}
                      onPress={() => onSelect(opt.role)}
                      activeOpacity={0.8}
                      style={styles.partnerCard}
                    >
                      <View style={styles.partnerIconWrap}>
                        <IconComp size={20} color={authColors.primary} />
                      </View>
                      <View style={styles.partnerContent}>
                        <View style={styles.partnerTitleRow}>
                          <Text style={styles.partnerTitle}>{opt.title}</Text>
                          <View style={styles.partnerBadge}>
                            <Text style={styles.partnerBadgeText}>{opt.badge}</Text>
                          </View>
                        </View>
                        <Text style={styles.partnerDesc}>{opt.description}</Text>
                        <Text style={styles.partnerReq}>{opt.requirement}</Text>
                      </View>
                      <View style={styles.chevronWrap}>
                        <ChevronRight size={17} color={authColors.muted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Professional Bottom Note */}
          <View style={styles.footerNote}>
            <ShieldCheck size={14} color={authColors.primary} />
            <Text style={styles.footerNoteText}>
              Satu akun terikat pada satu peran utama untuk menjaga keamanan data dan akurasi verifikasi admin.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const GoogleConnectSection: React.FC<{
  onConnect: (credential: GoogleCredential) => Promise<void>;
}> = ({ onConnect }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [request, , promptAsync] = Google.useAuthRequest({
    ...googleClientIds,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    redirectUri: getGoogleRedirectUri(),
  });

  const connect = async () => {
    setError("");
    setLoading(true);
    try {
      if (!request) {
        setError("Konfigurasi Google Cloud sedang memuat. Silakan periksa koneksi Anda.");
        return;
      }
      const result = await promptAsync();
      if (result.type === "success") {
        const credential: GoogleCredential = {
          accessToken: result.authentication?.accessToken || result.params?.access_token,
          idToken: result.authentication?.idToken || result.params?.id_token,
        };
        if (credential.accessToken || credential.idToken) {
          await onConnect(credential);
        } else {
          throw new Error("Token autentikasi Google tidak ditemukan.");
        }
      } else if (result.type === "error") {
        const errorCode = result.params?.error || "";
        const desc = result.params?.error_description || "";
        const userMsg =
          errorCode === "redirect_uri_mismatch"
            ? "Redirect URI sedang dalam proses penyesuaian di Google Cloud Console."
            : errorCode === "disabled_client"
            ? "Klien Google OAuth dinonaktifkan di Google Cloud Console."
            : `Pendaftaran Google dialihkan (${errorCode || "error"}).`;
        setError(desc ? `${userMsg} (${desc})` : userMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyambungkan akun Google.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.googleConnectWrap}>
      <TouchableOpacity
        style={[authStyles.secondaryButton, styles.googleRoleBtn]}
        onPress={() => void connect()}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={authColors.primary} size="small" />
        ) : (
          <>
            <GoogleLogo size={19} />
            <Text style={styles.googleRoleBtnText}>Daftar Lebih Cepat dengan Google</Text>
          </>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.googleErrorText}>{error}</Text> : null}
    </View>
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
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: Platform.OS === "web" ? 26 : 18,
    paddingVertical: 26,
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: authColors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  brandHeader: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heading: {
    marginBottom: 16,
  },
  title: {
    color: authColors.ink,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  googleConnectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 12,
    padding: 11,
    marginBottom: 16,
  },
  googleConnectedTextWrap: {
    flex: 1,
  },
  googleConnectedTitle: {
    color: authColors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  googleConnectedSub: {
    color: authColors.inkSecondary,
    fontSize: 11.5,
    marginTop: 1,
  },
  googleConnectWrap: {
    marginBottom: 16,
  },
  googleRoleBtn: {
    flexDirection: "row",
    gap: 10,
  },
  googleRoleBtnText: {
    color: authColors.ink,
    fontSize: 13.5,
    fontWeight: "600",
  },
  googleErrorText: {
    color: authColors.danger,
    fontSize: 12,
    marginTop: 6,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: authColors.lineLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      } as any,
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      },
    }),
  },
  tabBtnText: {
    color: authColors.muted,
    fontSize: 12.5,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: authColors.primaryDark,
    fontWeight: "700",
  },
  customerHeroCard: {
    backgroundColor: "#FBFCFD",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    padding: 16,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: authColors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBadgeText: {
    color: authColors.primaryDark,
    fontSize: 10.5,
    fontWeight: "700",
  },
  heroTitle: {
    color: authColors.ink,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  heroDesc: {
    color: authColors.muted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  benefitList: {
    gap: 8,
    marginBottom: 18,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  benefitText: {
    flex: 1,
    color: authColors.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  heroCtaBtn: {
    flexDirection: "row",
    gap: 8,
  },
  partnerSection: {
    marginBottom: 14,
  },
  partnerHint: {
    color: authColors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  partnerGrid: {
    gap: 8,
  },
  partnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.line,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  partnerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    flexShrink: 0,
  },
  partnerContent: {
    flex: 1,
    minWidth: 0,
  },
  partnerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  partnerTitle: {
    color: authColors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  partnerBadge: {
    backgroundColor: authColors.lineLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  partnerBadgeText: {
    color: authColors.inkSecondary,
    fontSize: 9.5,
    fontWeight: "700",
  },
  partnerDesc: {
    color: authColors.muted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  partnerReq: {
    color: authColors.primaryDark,
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 3,
    fontWeight: "600",
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    flexShrink: 0,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: authColors.lineLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  footerNoteText: {
    flex: 1,
    color: authColors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
});
