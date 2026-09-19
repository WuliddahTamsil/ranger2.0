import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  User,
  Clock,
  ShieldCheck,
  ChevronRight,
  Info,
  Eye,
  X,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { useGeoversePoint } from "../../../features/geoversePoint/hooks/useGeoversePoint";
import {
  confirmWasteDeposit,
  disputeWasteDeposit,
} from "../../../services/recycleService";
import { rp } from "../../../utils/formatters";

export const WeighingResultScreen: React.FC<Nav> = ({ navigate }) => {
  const { selectedDeposit, setSelectedDeposit, refreshWallet: refreshRecycleWallet } = useRecycle();
  const { refreshWallet: refreshPointWallet } = useGeoversePoint();
  const [confirming, setConfirming] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

  if (!selectedDeposit) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>Data timbangan tidak ditemukan.</Text>
          <TouchableOpacity
            style={styles.btnBack}
            onPress={() => navigate("c_recycle_home")}
          >
            <Text style={styles.btnBackText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  const deposit = selectedDeposit;
  const categories = deposit.categories || [];
  const totalActualWeight =
    deposit.actualTotalWeightKg ||
    categories.reduce((sum, c) => sum + (c.actualWeightKg || 0), 0);
  const totalRupiah =
    deposit.finalRupiah ||
    categories.reduce((sum, c) => sum + (c.totalRupiah || 0), 0);
  const totalPoint =
    deposit.finalPoint ||
    categories.reduce((sum, c) => sum + (c.totalPoint || 0), 0);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await confirmWasteDeposit(deposit._id);
      if (res.success && res.data) {
        setSelectedDeposit(res.data);
        await Promise.allSettled([
          refreshRecycleWallet(),
          refreshPointWallet(),
        ]);
        setSuccessModalVisible(true);
      } else {
        Alert.alert("Gagal Konfirmasi", res.message || "Gagal mengonfirmasi hasil timbang.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kesalahan pada server.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      Alert.alert("Alasan Diperlukan", "Tuliskan alasan komplain Anda terhadap hasil timbang.");
      return;
    }

    setDisputing(true);
    try {
      const res = await disputeWasteDeposit(deposit._id, disputeReason);
      if (res.success && res.data) {
        setSelectedDeposit(res.data);
        setDisputeModalVisible(false);
        navigate("c_recycle_tracking");
      } else {
        Alert.alert("Gagal", res.message || "Gagal mengajukan komplain.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kendala jaringan.");
    } finally {
      setDisputing(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_tracking")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Hasil Timbangan Resmi</Text>
          <Text style={styles.headerSub}>Kode: {deposit.depositCode}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Officer & Scale Notice Card */}
        <View style={styles.officerCard}>
          <View style={styles.officerRow}>
            <View style={styles.officerAvatar}>
              <Scale size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.officerTitle}>Ditimbang Resmi Oleh:</Text>
              <Text style={styles.officerName}>
                {typeof deposit.weighedBy === "object"
                  ? deposit.weighedBy?.name
                  : "Petugas Bank Sampah"}
              </Text>
              <View style={styles.officerTimeRow}>
                <Clock size={12} color="#6B7280" />
                <Text style={styles.officerTimeText}>
                  {new Date(deposit.updatedAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Breakdown of Each Waste Category */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rincian Penimbangan per Kategori</Text>
        </View>

        {categories.map((cat, idx) => (
          <View key={idx} style={styles.categoryCard}>
            <View style={styles.catHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                {cat.subCategory && (
                  <View style={{ flexDirection: "row", marginBottom: 2 }}>
                    <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#15803D" }}>{cat.category}</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.catTitle}>{cat.subCategory || cat.category}</Text>
              </View>
              <View style={styles.catPriceBadge}>
                <Text style={styles.catPriceBadgeText}>Rp {cat.pricePerKg?.toLocaleString("id-ID")}/kg</Text>
              </View>
            </View>

            <View style={styles.weightComparisonRow}>
              <View style={styles.weightBox}>
                <Text style={styles.weightLabel}>Estimasi Awal</Text>
                <Text style={styles.weightValMuted}>{cat.estimatedWeightKg || 0} kg</Text>
              </View>
              <View style={styles.arrowBetween}>
                <ChevronRight size={16} color="#9CA3AF" />
              </View>
              <View style={[styles.weightBox, styles.weightBoxActive]}>
                <Text style={styles.weightLabelActive}>Berat Aktual Resmi</Text>
                <Text style={styles.weightValActual}>{cat.actualWeightKg || 0} kg</Text>
              </View>
            </View>

            <View style={styles.catSubtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal Nilai:</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.subtotalRupiah}>{rp(cat.totalRupiah || 0)}</Text>
                <Text style={styles.subtotalPoints}>+{cat.totalPoint?.toLocaleString("id-ID") || 0} Points</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Weighing Proof Scale Photos (if available) */}
        {deposit.weighingProofPhotos && deposit.weighingProofPhotos.length > 0 && (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <Camera size={16} color="#15803D" />
              <Text style={styles.proofTitle}>Foto Bukti Penimbangan Petugas</Text>
            </View>
            <Text style={styles.proofSub}>
              Ketuk foto di bawah untuk melihat bukti timbangan dalam ukuran penuh (zoom).
            </Text>
            <View style={styles.photoContainer}>
              {deposit.weighingProofPhotos.map((url, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.proofImageWrapper}
                  onPress={() => setActiveLightboxUrl(url)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: url }} style={styles.proofImage} />
                  <View style={styles.photoZoomBadge}>
                    <Eye size={11} color="#FFFFFF" />
                    <Text style={styles.photoZoomBadgeText}>Lihat</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Officer Notes if any */}
        {deposit.weighingNotes && (
          <View style={styles.notesBox}>
            <Info size={16} color="#4B5563" />
            <Text style={styles.notesText}>{deposit.weighingNotes}</Text>
          </View>
        )}

        {/* Grand Total Summary */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Berat Aktual:</Text>
            <Text style={styles.totalVal}>{totalActualWeight.toFixed(1)} kg</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Nilai Rupiah:</Text>
            <Text style={styles.totalVal}>{rp(totalRupiah)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={20} color="#FBBF24" />
              <Text style={styles.pointRewardLabel}>GEOVERSE Point Diterima:</Text>
            </View>
            <Text style={styles.pointRewardVal}>+{totalPoint.toLocaleString("id-ID")} Pts</Text>
          </View>
          <Text style={styles.conversionNote}>*1 Point = Rp 1, langsung diterbitkan saat Anda setujui.</Text>
        </View>
      </ScrollView>

      {/* Sticky CTAs */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.btnDispute}
          onPress={() => setDisputeModalVisible(true)}
          activeOpacity={0.8}
        >
          <AlertTriangle size={16} color="#DC2626" />
          <Text style={styles.btnDisputeText}>Ajukan Komplain</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnApprove, confirming && { opacity: 0.7 }]}
          onPress={handleConfirm}
          disabled={confirming}
          activeOpacity={0.85}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnApproveText}>Setujui Hasil Timbang</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Dispute Modal */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.disputeModalCard}>
            <Text style={styles.disputeModalTitle}>Ajukan Komplain Timbangan</Text>
            <Text style={styles.disputeModalSub}>
              Tuliskan keberatan Anda (misal: selisih berat terlalu jauh atau kategori tidak sesuai).
            </Text>

            <TextInput
              style={styles.disputeInput}
              placeholder="Jelaskan alasan komplain Anda secara rinci..."
              placeholderTextColor="#9CA3AF"
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.disputeActions}>
              <TouchableOpacity
                style={styles.btnCancelDispute}
                onPress={() => setDisputeModalVisible(false)}
              >
                <Text style={styles.btnCancelDisputeText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSubmitDispute, disputing && { opacity: 0.7 }]}
                onPress={handleDispute}
                disabled={disputing}
              >
                {disputing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnSubmitDisputeText}>Kirim Komplain</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Points Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Sparkles size={36} color="#15803D" />
            </View>
            <Text style={styles.successModalTitle}>Poin Berhasil Diterbitkan!</Text>
            <Text style={styles.successModalPoints}>+{totalPoint.toLocaleString("id-ID")} Points</Text>
            <Text style={styles.successModalSub}>
              Selamat! Saldo GEOVERSE Point Anda telah bertambah. Poin ini dapat ditukarkan menjadi voucher belanja atau Rupiah kapan saja.
            </Text>

            <TouchableOpacity
              style={styles.btnDone}
              onPress={async () => {
                setSuccessModalVisible(false);
                await refreshPointWallet().catch(() => {});
                navigate("c_recycle_wallet");
              }}
            >
              <Text style={styles.btnDoneText}>Buka Dompet Point</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lightbox / Full-screen Photo Preview Modal */}
      <Modal
        visible={Boolean(activeLightboxUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveLightboxUrl(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setActiveLightboxUrl(null)}
            activeOpacity={0.8}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.lightboxImageWrapper}>
            {activeLightboxUrl ? (
              <Image
                source={{ uri: activeLightboxUrl }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <Text style={styles.lightboxCaption}>Foto Bukti Penimbangan Resmi</Text>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  headerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  officerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  officerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  officerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  officerTitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  officerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  officerTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  officerTimeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  catHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  catTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  catPriceBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  catPriceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  weightComparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  weightBox: {
    flex: 1,
  },
  weightBoxActive: {
    alignItems: "flex-end",
  },
  weightLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  weightLabelActive: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "700",
  },
  weightValMuted: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },
  weightValActual: {
    fontSize: 16,
    color: "#15803D",
    fontWeight: "900",
    marginTop: 2,
  },
  arrowBetween: {
    paddingHorizontal: 6,
  },
  catSubtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  subtotalLabel: {
    fontSize: 11,
    color: "#4B5563",
  },
  subtotalRupiah: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  subtotalPoints: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CA8A04",
  },
  proofCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  proofTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
  },
  proofSub: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 10,
  },
  photoContainer: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  proofImageWrapper: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
  },
  proofImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  photoZoomBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoZoomBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImageWrapper: {
    width: "100%",
    height: "75%",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  lightboxCaption: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    color: "#4B5563",
  },
  totalCard: {
    backgroundColor: "#1B7A4E",
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  totalLabel: {
    fontSize: 12,
    color: "#DCFCE7",
  },
  totalVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  totalDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 10,
  },
  pointRewardLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FDE047",
  },
  pointRewardVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  conversionNote: {
    fontSize: 10,
    color: "#A7F3D0",
    marginTop: 6,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  btnDispute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnDisputeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  btnApprove: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803D",
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnApproveText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  disputeModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  disputeModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  disputeModalSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  disputeInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    fontSize: 12,
    color: "#111827",
    textAlignVertical: "top",
    marginBottom: 16,
  },
  disputeActions: {
    flexDirection: "row",
    gap: 10,
  },
  btnCancelDispute: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  btnCancelDisputeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  btnSubmitDispute: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 10,
  },
  btnSubmitDisputeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
  },
  successModalPoints: {
    fontSize: 32,
    fontWeight: "900",
    color: "#15803D",
    marginVertical: 8,
  },
  successModalSub: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  btnDone: {
    backgroundColor: "#15803D",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  btnDoneText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 14,
  },
  btnBack: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnBackText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
