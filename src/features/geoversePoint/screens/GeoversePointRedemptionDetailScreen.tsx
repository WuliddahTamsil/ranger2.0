import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Copy,
  Building,
  Banknote,
  Smartphone,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useGeoversePoint } from "../hooks/useGeoversePoint";
import { fetchRedemptionDetail, cancelRedemption } from "../services/geoversePointService";
import { PointRedemptionUI } from "../types/pointTypes";

interface GeoversePointRedemptionDetailScreenProps extends Nav {
  redemptionId?: string;
}

export const GeoversePointRedemptionDetailScreen: React.FC<
  GeoversePointRedemptionDetailScreenProps
> = ({ navigate, redemptionId }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { formatPoint, formatRupiah, refreshWallet, refreshLedger } = useGeoversePoint();

  const [redemption, setRedemption] = useState<PointRedemptionUI | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancelling, setCancelling] = useState<boolean>(false);

  const loadDetail = async () => {
    if (!redemptionId) return;
    setLoading(true);
    try {
      const res = await fetchRedemptionDetail(redemptionId);
      if (res.success && res.data) {
        setRedemption(res.data);
      }
    } catch (err) {
      console.error("loadDetail error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [redemptionId]);

  const handleCancel = () => {
    if (!redemption) return;
    Alert.alert(
      "Batalkan Penarikan?",
      "Poin Anda akan dikembalikan seutuhnya ke dompet GEOVERSE Point.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await cancelRedemption(redemption._id, "Dibatalkan oleh nasabah.");
              if (res.success) {
                Alert.alert("Dibatalkan", "Permintaan berhasil dibatalkan dan poin telah dikembalikan.");
                await Promise.all([refreshWallet(), refreshLedger()]);
                navigate("c_point_home");
              } else {
                Alert.alert("Gagal", res.message || "Gagal membatalkan.");
              }
            } catch (err: any) {
              Alert.alert("Kesalahan", err?.message || "Terjadi kesalahan.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return {
          label: "Selesai / Sudah Dibayar",
          color: "#059669",
          bg: "#ECFDF5",
          icon: CheckCircle2,
        };
      case "APPROVED":
        return {
          label: "Disetujui, Menunggu Pembayaran",
          color: "#15803D",
          bg: "#DCFCE7",
          icon: CheckCircle2,
        };
      case "REVIEWING":
        return {
          label: "Sedang Ditinjau Petugas",
          color: "#D97706",
          bg: "#FEF3C7",
          icon: Clock,
        };
      case "REJECTED":
        return {
          label: "Ditolak (Poin Telah Dikembalikan)",
          color: "#DC2626",
          bg: "#FEE2E2",
          icon: XCircle,
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan (Poin Telah Dikembalikan)",
          color: "#64748B",
          bg: "#F1F5F9",
          icon: XCircle,
        };
      default:
        return {
          label: "Menunggu Verifikasi",
          color: "#B45309",
          bg: "#FEF3C7",
          icon: Clock,
        };
    }
  };

  const statusObj = getStatusBadge(redemption?.status || "REQUESTED");
  const StatusIcon = statusObj.icon;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_point_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Detail Penarikan</Text>
          <Text style={styles.headerSubtitle}>Status & bukti permohonan</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#15803D" />
            <Text style={styles.loadingText}>Memuat rincian penarikan...</Text>
          </View>
        ) : redemption ? (
          <>
            {/* Status Hero Card */}
            <View style={styles.statusCard}>
              <View style={[styles.statusIconBg, { backgroundColor: statusObj.bg }]}>
                <StatusIcon size={28} color={statusObj.color} />
              </View>
              <Text style={[styles.statusTitle, { color: statusObj.color }]}>
                {statusObj.label}
              </Text>
              <Text style={styles.amountRupiah}>
                {formatRupiah(redemption.rupiahValue)}
              </Text>
              <Text style={styles.pointsDeducted}>
                Ditukar dari {formatPoint(redemption.points)}
              </Text>
            </View>

            {/* Rejection Note */}
            {redemption.status === "REJECTED" && redemption.rejectionReason ? (
              <View style={styles.rejectionBox}>
                <AlertCircle size={18} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Alasan Penolakan:</Text>
                  <Text style={styles.rejectionReason}>{redemption.rejectionReason}</Text>
                  <Text style={styles.rejectionFoot}>
                    Saldo poin telah dikembalikan secara otomatis ke dompet Anda.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Details Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Informasi Transaksi</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kode Penarikan</Text>
                <Text style={styles.detailValueCode}>{redemption.redemptionCode}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tanggal Pengajuan</Text>
                <Text style={styles.detailValue}>
                  {new Date(redemption.createdAt).toLocaleString("id-ID")}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Metode Pencairan</Text>
                <Text style={styles.detailValue}>
                  {redemption.payoutDestination?.channel || "TUNAI"}
                </Text>
              </View>

              {redemption.payoutDestination?.accountNumber ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nomor Tujuan</Text>
                  <Text style={styles.detailValue}>
                    {redemption.payoutDestination.accountNumber}
                  </Text>
                </View>
              ) : null}

              {redemption.payoutDestination?.accountName ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Atas Nama</Text>
                  <Text style={styles.detailValue}>
                    {redemption.payoutDestination.accountName}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Biaya Admin</Text>
                <Text style={styles.detailValueFree}>GRATIS (Rp 0)</Text>
              </View>
            </View>

            {/* Action Buttons */}
            {redemption.status === "REQUESTED" && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator color="#DC2626" />
                ) : (
                  <Text style={styles.cancelBtnText}>Batalkan Permohonan</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <AlertCircle size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Data Tidak Ditemukan</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  desktopContainer: {
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  statusIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  amountRupiah: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  pointsDeducted: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  rejectionBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  rejectionReason: {
    fontSize: 12,
    color: "#7F1D1D",
    marginTop: 2,
  },
  rejectionFoot: {
    fontSize: 11,
    color: "#059669",
    marginTop: 6,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  detailValueCode: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  detailValueFree: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF1F2",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
  },
});
