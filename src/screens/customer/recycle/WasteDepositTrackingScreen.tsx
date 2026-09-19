import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Scale,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  User,
  Phone,
  Package,
  MapPin,
  Camera,
  Eye,
  X,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import {
  getWasteDepositById,
  cancelWasteDeposit,
} from "../../../services/recycleService";
import { WasteDepositStatus, WasteDepositUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

const DROP_OFF_STEPS: Array<{ key: WasteDepositStatus; label: string; desc: string }> = [
  { key: "REQUESTED", label: "Tiket Setoran Dibuat", desc: "Silakan bawa sampah Anda ke Bank Sampah" },
  { key: "AT_BANK", label: "Tiba di Bank Sampah", desc: "Sampah diserahkan ke petugas" },
  { key: "WEIGHING", label: "Proses Penimbangan", desc: "Petugas menimbang berat aktual sampah" },
  { key: "WAITING_CUSTOMER_CONFIRMATION", label: "Konfirmasi Hasil Timbang", desc: "Silakan periksa & setujui koin poin" },
  { key: "COMPLETED", label: "Poin Diterbitkan & Selesai", desc: "Koin resmi masuk ke saldo Anda" },
];

const PICKUP_STEPS: Array<{ key: WasteDepositStatus; label: string; desc: string }> = [
  { key: "REQUESTED", label: "Permintaan Pickup Dibuat", desc: "Menunggu konfirmasi Bank Sampah" },
  { key: "ACCEPTED", label: "Diterima Bank Sampah", desc: "Jadwal penjemputan dikonfirmasi" },
  { key: "DRIVER_ASSIGNED", label: "Driver Ditugaskan", desc: "Kurir siap menjemput sampah" },
  { key: "PICKED_UP", label: "Sampah Dijemput Driver", desc: "Sedang diantar ke Bank Sampah" },
  { key: "AT_BANK", label: "Tiba di Bank Sampah", desc: "Sampah siap ditimbang petugas" },
  { key: "WEIGHING", label: "Proses Penimbangan", desc: "Petugas menimbang berat aktual" },
  { key: "WAITING_CUSTOMER_CONFIRMATION", label: "Konfirmasi Hasil Timbang", desc: "Silakan periksa & setujui koin poin" },
  { key: "COMPLETED", label: "Poin Diterbitkan & Selesai", desc: "Poin resmi masuk ke saldo Anda" },
];

export const WasteDepositTrackingScreen: React.FC<Nav> = ({ navigate }) => {
  const { selectedDeposit, setSelectedDeposit } = useRecycle();
  const [deposit, setDeposit] = useState<WasteDepositUI | null>(selectedDeposit);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

  const fetchLatest = async () => {
    if (!deposit?._id) return;
    try {
      const res = await getWasteDepositById(deposit._id);
      if (res.success && res.data) {
        setDeposit(res.data);
        setSelectedDeposit(res.data);
      }
    } catch (err) {
      console.error("fetchLatest tracking error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatest();

    // Auto-polling every 3 seconds to catch status updates from Bank Sampah in realtime
    const timer = setInterval(() => {
      fetchLatest();
    }, 3000);

    return () => clearInterval(timer);
  }, [deposit?._id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLatest();
  };

  const handleCancel = () => {
    Alert.alert(
      "Batalkan Setoran",
      "Apakah Anda yakin ingin membatalkan permohonan setoran sampah ini?",
      [
        { text: "Kembali", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            if (!deposit?._id) return;
            setCancelling(true);
            try {
              const res = await cancelWasteDeposit(deposit._id, "Dibatalkan oleh customer");
              if (res.success) {
                Alert.alert("Sukses", "Permohonan setoran berhasil dibatalkan.");
                fetchLatest();
              } else {
                Alert.alert("Gagal", res.message || "Gagal membatalkan.");
              }
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Terjadi kesalahan.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (!deposit) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyTitle}>Data setoran tidak ditemukan</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate("c_recycle_home")}>
            <Text style={styles.backButtonText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  // Dynamic steps based on method
  const isPickup = deposit.method === "PICKUP";
  const activeSteps = isPickup ? PICKUP_STEPS : DROP_OFF_STEPS;

  let currentStepIndex = activeSteps.findIndex((s) => s.key === deposit.status);
  if (currentStepIndex === -1) {
    if (deposit.status === "POINT_ISSUED" || deposit.status === "COMPLETED") {
      currentStepIndex = activeSteps.length - 1;
    } else if (deposit.status === "ACCEPTED" && !isPickup) {
      currentStepIndex = 0;
    }
  }

  const isWeighingWaiting = deposit.status === "WAITING_CUSTOMER_CONFIRMATION";
  const isCompleted = deposit.status === "COMPLETED" || deposit.status === "POINT_ISSUED";
  const canCancel = deposit.status === "REQUESTED" || deposit.status === "ACCEPTED";

  // Check if categories have been weighed
  const hasWeighedCategories =
    Array.isArray(deposit.categories) &&
    deposit.categories.some((c) => (c.actualWeightKg || 0) > 0);

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Status Setoran</Text>
          <Text style={styles.headerSub}>Kode: {deposit.depositCode}</Text>
        </View>
        <View
          style={[
            styles.methodBadge,
            isPickup ? styles.methodBadgePickup : styles.methodBadgeDropOff,
          ]}
        >
          {isPickup ? (
            <Truck size={11} color="#047857" style={{ marginRight: 3 }} />
          ) : (
            <MapPin size={11} color="#0284C7" style={{ marginRight: 3 }} />
          )}
          <Text
            style={[
              styles.methodBadgeText,
              isPickup ? styles.methodBadgeTextPickup : styles.methodBadgeTextDropOff,
            ]}
          >
            {isPickup ? "Pickup Driver" : "Antar Langsung"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {/* Waiting Confirmation Alert CTA */}
        {isWeighingWaiting && (
          <TouchableOpacity
            style={styles.waitingAlertCard}
            onPress={() => navigate("c_recycle_weighing_result")}
            activeOpacity={0.88}
          >
            <View style={styles.waitingAlertLeft}>
              <Scale size={24} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.waitingAlertTitle}>Hasil Timbangan Siap Dikonfirmasi!</Text>
                <Text style={styles.waitingAlertSub}>
                  Total: {deposit.actualTotalWeightKg?.toFixed(1) || "-"} kg •{" "}
                  +{deposit.finalPoint?.toLocaleString("id-ID") || "-"} Points
                </Text>
              </View>
            </View>
            <View style={styles.btnActionPulse}>
              <Text style={styles.btnActionPulseText}>Tinjau</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Completed Points Celebration Card */}
        {isCompleted && (
          <View style={styles.completedCard}>
            <Sparkles size={28} color="#FBBF24" />
            <Text style={styles.completedTitle}>Poin Berhasil Diterbitkan!</Text>
            <Text style={styles.completedPoints}>
              +{deposit.finalPoint?.toLocaleString("id-ID") || 0} Points
            </Text>
            <Text style={styles.completedSub}>
              Nilai: {rp(deposit.finalRupiah || 0)} (1 Point = Rp 1)
            </Text>
            <TouchableOpacity
              style={styles.btnViewWallet}
              onPress={() => navigate("c_recycle_wallet")}
            >
              <Text style={styles.btnViewWalletText}>Buka Dompet Point</Text>
              <ChevronRight size={14} color="#15803D" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bank Sampah Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardRow}>
            <View style={styles.avatarMini}>
              <Building2 size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankName}>
                {typeof deposit.bankSampahId === "object"
                  ? deposit.bankSampahId?.name
                  : "Bank Sampah Mitra"}
              </Text>
              <Text style={styles.bankAddress} numberOfLines={1}>
                {typeof deposit.bankSampahId === "object"
                  ? deposit.bankSampahId?.address
                  : "Kamojang, Kab. Bandung"}
              </Text>
            </View>
          </View>

          {isPickup && deposit.pickupSchedule && (
            <View style={styles.scheduleRow}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.scheduleText}>Jadwal Pickup: {deposit.pickupSchedule}</Text>
            </View>
          )}

          {isPickup && deposit.driverId && (
            <View style={styles.driverRow}>
              <User size={14} color="#0284C7" />
              <Text style={styles.driverText}>
                Driver: {typeof deposit.driverId === "object" ? deposit.driverId?.name : "Driver GEOVERSE"}
              </Text>
            </View>
          )}
        </View>

        {/* Categories Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rincian Sampah</Text>
        </View>

        {!hasWeighedCategories ? (
          <View style={styles.pendingWeighCard}>
            <Scale size={20} color="#15803D" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pendingWeighTitle}>Menunggu Penimbangan Petugas</Text>
              <Text style={styles.pendingWeighSub}>
                Rincian jenis sampah dan berat kg riil akan otomatis muncul setelah ditimbang di Bank Sampah.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.categoriesCard}>
            {deposit.categories
              ?.filter((cat) => (cat.actualWeightKg || 0) > 0)
              .map((cat, idx) => (
                <View key={idx} style={styles.categoryItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.subCategory || cat.category}</Text>
                    <Text style={styles.catSub}>
                      {cat.subCategory ? `${cat.category} • ` : ""}Tertimbang: {cat.actualWeightKg?.toFixed(1)} kg • Rp {cat.pricePerKg?.toLocaleString("id-ID")}/kg
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.catWeight}>{cat.actualWeightKg?.toFixed(1)} kg</Text>
                    {cat.totalPoint > 0 && (
                      <Text style={styles.catPoint}>+{cat.totalPoint.toLocaleString("id-ID")} Pts</Text>
                    )}
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Weighing Proof Scale Photos (if available) */}
        {deposit.weighingProofPhotos && deposit.weighingProofPhotos.length > 0 && (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <Camera size={15} color="#15803D" />
              <Text style={styles.proofTitle}>Foto Bukti Penimbangan Petugas</Text>
            </View>
            <Text style={styles.proofSub}>
              Ketuk foto untuk melihat bukti timbangan ukuran penuh (zoom).
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

        {/* Realtime Status Timeline (Adapted to Method) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Proses Penyetoran</Text>
        </View>

        <View style={styles.timelineCard}>
          {activeSteps.map((step, idx) => {
            const isDone =
              currentStepIndex > idx ||
              (isCompleted && idx === activeSteps.length - 1) ||
              deposit.status === step.key;
            const isCurrent = deposit.status === step.key;

            return (
              <View key={step.key} style={styles.timelineStep}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.stepDot,
                      isDone && styles.stepDotDone,
                      isCurrent && styles.stepDotCurrent,
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={13} color="#FFFFFF" />
                    ) : (
                      <View style={styles.stepDotInner} />
                    )}
                  </View>
                  {idx < activeSteps.length - 1 && (
                    <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                  )}
                </View>
                <View style={styles.timelineRight}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isCurrent && styles.stepLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Cancel Button if applicable */}
        {canCancel && (
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.8}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={styles.btnCancelText}>Batalkan Permohonan Setoran</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

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
          <Text style={styles.lightboxCaption}>Foto Bukti Timbangan Resmi</Text>
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
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  methodBadgePickup: {
    backgroundColor: "#DCFCE7",
  },
  methodBadgeDropOff: {
    backgroundColor: "#E0F2FE",
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  methodBadgeTextPickup: {
    color: "#15803D",
  },
  methodBadgeTextDropOff: {
    color: "#0284C7",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  waitingAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  waitingAlertLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  waitingAlertTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
  },
  waitingAlertSub: {
    fontSize: 11,
    color: "#78350F",
    marginTop: 2,
  },
  btnActionPulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#D97706",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnActionPulseText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  completedCard: {
    backgroundColor: "#15803D",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 6,
  },
  completedPoints: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FDE047",
    marginVertical: 4,
  },
  completedSub: {
    fontSize: 11,
    color: "#DCFCE7",
  },
  btnViewWallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  btnViewWalletText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
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
    fontWeight: "800",
    color: "#111827",
  },
  proofSub: {
    fontSize: 10.5,
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
    width: 90,
    height: 90,
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
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  bankName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  bankAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  scheduleText: {
    fontSize: 11,
    color: "#4B5563",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  driverText: {
    fontSize: 11,
    color: "#0284C7",
    fontWeight: "600",
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  pendingWeighCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  pendingWeighTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#15803D",
  },
  pendingWeighSub: {
    fontSize: 10.5,
    color: "#475569",
    marginTop: 2,
    lineHeight: 14,
  },
  categoriesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  catName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#111827",
  },
  catSub: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 1,
  },
  catWeight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  catPoint: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
    marginTop: 1,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: "row",
    minHeight: 52,
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
    marginRight: 12,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotDone: {
    backgroundColor: "#15803D",
  },
  stepDotCurrent: {
    backgroundColor: "#EA580C",
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: "#15803D",
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#4B5563",
  },
  stepLabelDone: {
    color: "#15803D",
  },
  stepLabelCurrent: {
    color: "#EA580C",
    fontWeight: "800",
  },
  stepDesc: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 2,
  },
  btnCancel: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
