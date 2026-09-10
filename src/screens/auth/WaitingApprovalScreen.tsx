import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator,
  Animated,
} from "react-native";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  RefreshCw,
  LogOut,
  FileText,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react-native";
import { Nav, Role } from "../../types";
import { AuthAccount, ROLE_LABELS } from "./authTypes";
import { getApiUrl } from "../../services/api";
import { roleToScreen } from "./authNavigation";
import { updateCachedAccount } from "./authService";

interface WaitingApprovalScreenProps extends Nav {
  authAccount: AuthAccount | null;
  onRefreshAccount?: (updated: AuthAccount) => void;
}

export const WaitingApprovalScreen: React.FC<WaitingApprovalScreenProps> = ({
  navigate,
  authAccount,
  onRefreshAccount,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<"pending" | "verified" | "rejected">(
    authAccount?.status || "pending"
  );
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(
    authAccount?.rejectionReason
  );

  // Pulse animation for pending badge
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const checkStatusLive = async () => {
    if (!authAccount?.id) return;
    setIsChecking(true);
    try {
      const res = await fetch(getApiUrl(`/auth/profile/${authAccount.id}`));
      const result = await res.json();
      if (result.success && result.data) {
        const newStatus = result.data.status;
        setCurrentStatus(newStatus);
        setRejectionReason(result.data.rejectionReason);

        const updatedAccount: AuthAccount = {
          ...authAccount,
          status: newStatus,
          rejectionReason: result.data.rejectionReason,
        };
        await updateCachedAccount(updatedAccount);
        if (onRefreshAccount) onRefreshAccount(updatedAccount);

        if (newStatus === "verified") {
          // Immediately redirect to approved dashboard
          navigate(roleToScreen(authAccount.role));
        }
      }
    } catch (err) {
      console.warn("Check status error:", err);
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-poll status every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      checkStatusLive();
    }, 10000);
    return () => clearInterval(timer);
  }, [authAccount?.id]);

  const handleContactAdmin = () => {
    const phone = "6281122334455";
    const roleText = (authAccount?.role && ROLE_LABELS[authAccount.role as keyof typeof ROLE_LABELS]) || "Mitra";
    const text = `Halo Admin GEOVERSE, saya ${authAccount?.name || "Mitra"} (${roleText}). Ingin menanyakan status verifikasi pendaftaran akun saya dengan email: ${authAccount?.email}. Terima kasih!`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`).catch(() => {});
  };

  const roleLabel = (authAccount?.role && ROLE_LABELS[authAccount.role as keyof typeof ROLE_LABELS]) || "Mitra Usaha";
  const businessName =
    authAccount?.roleData?.businessName || authAccount?.name || "Usaha Mitra";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <ShieldCheck size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>GEOVERSE VERIFIKASI</Text>
            <Text style={styles.brandSub}>Portal Pendaftaran Mitra</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnLogout}
          onPress={() => navigate("login")}
          activeOpacity={0.7}
        >
          <LogOut size={14} color="#DC2626" />
          <Text style={styles.btnLogoutText}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Card Banner */}
        {currentStatus === "rejected" ? (
          <View style={[styles.statusCard, styles.statusCardRejected]}>
            <View style={styles.statusHeaderRow}>
              <View style={styles.rejectedBadge}>
                <XCircle size={14} color="#DC2626" />
                <Text style={styles.rejectedBadgeText}>PENDAFTARAN PERLU REVISI</Text>
              </View>
            </View>

            <Text style={styles.statusTitle}>Dokumen Belum Disetujui</Text>
            <Text style={styles.statusSub}>
              Pendaftaran Anda belum dapat diverifikasi oleh Tim Admin. Silakan periksa catatan alasan di bawah ini:
            </Text>

            {/* Reason Box */}
            <View style={styles.reasonBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <AlertCircle size={14} color="#B45309" />
                <Text style={styles.reasonTitle}>Catatan dari Admin:</Text>
              </View>
              <Text style={styles.reasonText}>
                {rejectionReason || "Dokumen KTP atau foto tempat usaha kurang jelas / belum memenuhi syarat standar."}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              <Animated.View style={[styles.pendingBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Clock size={14} color="#D97706" />
                <Text style={styles.pendingBadgeText}>MENUNGGU VERIFIKASI ADMIN</Text>
              </Animated.View>
            </View>

            <Text style={styles.statusTitle}>Pendaftaran Anda Sedang Ditinjau</Text>
            <Text style={styles.statusSub}>
              Tim Administrator GEOVERSE sedang memeriksa kelengkapan identitas dan dokumen usaha Anda. Kami akan mengirimkan email konfirmasi saat akun Anda selesai di-ACC.
            </Text>

            {/* Estimated Time Banner */}
            <View style={styles.estimateBanner}>
              <Clock size={16} color="#0D7A53" />
              <View style={{ flex: 1 }}>
                <Text style={styles.estimateTitle}>Estimasi Verifikasi: 1 × 24 Jam</Text>
                <Text style={styles.estimateSub}>Pemeriksaan berkas dilakukan secara teliti demi keamanan ekosistem.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Data Akun yang Diajukan */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Rincian Data Pendaftaran</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Building2 size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Nama Usaha / Properti</Text>
              <Text style={styles.infoVal}>{businessName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <User size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Nama Lengkap Pemilik</Text>
              <Text style={styles.infoVal}>{authAccount?.name || "-"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <ShieldCheck size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Role Mitra</Text>
              <Text style={styles.infoVal}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Mail size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Email Notifikasi</Text>
              <Text style={styles.infoVal}>{authAccount?.email || "-"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Phone size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Nomor WhatsApp / HP</Text>
              <Text style={styles.infoVal}>{authAccount?.phone || "-"}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBg}>
              <MapPin size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Alamat Lokasi</Text>
              <Text style={styles.infoVal}>{authAccount?.address || "Garut, Jawa Barat"}</Text>
            </View>
          </View>
        </View>

        {/* Dokumen Terunggah Checklist */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Status Dokumen Terunggah</Text>

          <View style={styles.docItemRow}>
            <View style={styles.docIconBg}>
              <FileText size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>Kartu Tanda Penduduk (KTP)</Text>
              <Text style={styles.docSub}>Identitas resmi pemilik usaha</Text>
            </View>
            <View style={styles.docStatusBadge}>
              <CheckCircle2 size={12} color="#0D7A53" />
              <Text style={styles.docStatusBadgeText}>Terunggah</Text>
            </View>
          </View>

          <View style={styles.docItemRow}>
            <View style={styles.docIconBg}>
              <FileText size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>Surat Izin / Legalitas Usaha</Text>
              <Text style={styles.docSub}>Bukti hak operasional tempat</Text>
            </View>
            <View style={styles.docStatusBadge}>
              <CheckCircle2 size={12} color="#0D7A53" />
              <Text style={styles.docStatusBadgeText}>Terunggah</Text>
            </View>
          </View>

          <View style={[styles.docItemRow, { borderBottomWidth: 0 }]}>
            <View style={styles.docIconBg}>
              <FileText size={16} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>Foto Tempat Usaha / Outlet</Text>
              <Text style={styles.docSub}>Dokumentasi lokasi fisik</Text>
            </View>
            <View style={styles.docStatusBadge}>
              <CheckCircle2 size={12} color="#0D7A53" />
              <Text style={styles.docStatusBadgeText}>Terunggah</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={checkStatusLive}
            disabled={isChecking}
            activeOpacity={0.85}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>Cek Status Verifikasi</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleContactAdmin}
            activeOpacity={0.8}
          >
            <MessageCircle size={16} color="#0D7A53" />
            <Text style={styles.btnSecondaryText}>Hubungi Admin via WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Sistem akan otomatis mengarahkan Anda ke Dashboard utama saat status disetujui.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  btnLogout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  btnLogoutText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusCardRejected: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FFFDFD",
  },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.3,
  },
  rejectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6,
  },
  statusSub: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  estimateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 10,
    padding: 12,
  },
  estimateTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  estimateSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
  },
  reasonBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991B1B",
  },
  reasonText: {
    fontSize: 12.5,
    color: "#7F1D1D",
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  docItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  docIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  docName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  docSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  docStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  footerNote: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});
