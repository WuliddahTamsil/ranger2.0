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
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import {
  getWasteDepositById,
  cancelWasteDeposit,
} from "../../../services/recycleService";
import { WasteDepositStatus, WasteDepositUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

const STATUS_STEPS: Array<{ key: WasteDepositStatus; label: string; desc: string }> = [
  { key: "REQUESTED", label: "Permintaan Dibuat", desc: "Menunggu respons Bank Sampah" },
  { key: "ACCEPTED", label: "Diterima", desc: "Bank Sampah mengonfirmasi jadwal" },
  { key: "DRIVER_ASSIGNED", label: "Driver Ditugaskan", desc: "Kurir siap menjemput" },
  { key: "PICKED_UP", label: "Sampah Diambil", desc: "Sedang diantar ke Bank Sampah" },
  { key: "AT_BANK", label: "Tiba di Bank Sampah", desc: "Menunggu antrean timbang" },
  { key: "WEIGHING", label: "Proses Penimbangan", desc: "Petugas menimbang sampah aktual" },
  { key: "WAITING_CUSTOMER_CONFIRMATION", label: "Menunggu Konfirmasi", desc: "Silakan periksa hasil timbangan" },
  { key: "COMPLETED", label: "Poin Diterbitkan & Selesai", desc: "Poin resmi masuk ke akun Anda" },
];

export const WasteDepositTrackingScreen: React.FC<Nav> = ({ navigate }) => {
  const { selectedDeposit, setSelectedDeposit } = useRecycle();
  const [deposit, setDeposit] = useState<WasteDepositUI | null>(selectedDeposit);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  // Calculate timeline index
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === deposit.status);
  const isWeighingWaiting = deposit.status === "WAITING_CUSTOMER_CONFIRMATION";
  const isCompleted = deposit.status === "COMPLETED" || deposit.status === "POINT_ISSUED";
  const canCancel = deposit.status === "REQUESTED" || deposit.status === "ACCEPTED";

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
        <View style={styles.methodBadge}>
          <Text style={styles.methodBadgeText}>
            {deposit.method === "PICKUP" ? "Pickup" : "Antar Langsung"}
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

          {deposit.pickupSchedule && (
            <View style={styles.scheduleRow}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.scheduleText}>Jadwal: {deposit.pickupSchedule}</Text>
            </View>
          )}

          {deposit.driverId && (
            <View style={styles.driverRow}>
              <User size={14} color="#0284C7" />
              <Text style={styles.driverText}>
                Driver: {typeof deposit.driverId === "object" ? deposit.driverId?.name : "Driver Rangers"}
              </Text>
            </View>
          )}
        </View>

        {/* Categories Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rincian Sampah</Text>
        </View>
        <View style={styles.categoriesCard}>
          {deposit.categories?.map((cat, idx) => (
            <View key={idx} style={styles.categoryItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{cat.category}</Text>
                <Text style={styles.catSub}>
                  Est: {cat.estimatedWeightKg} kg • Rp {cat.pricePerKg?.toLocaleString("id-ID")}/kg
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.catWeight}>
                  {cat.actualWeightKg ? `${cat.actualWeightKg.toFixed(1)} kg` : "Menunggu timbang"}
                </Text>
                {cat.totalPoint > 0 && (
                  <Text style={styles.catPoint}>+{cat.totalPoint.toLocaleString("id-ID")} Pts</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Realtime Status Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Proses Penyetoran</Text>
        </View>
        <View style={styles.timelineCard}>
          {STATUS_STEPS.map((step, idx) => {
            const isDone =
              currentStepIndex > idx ||
              (isCompleted && idx === STATUS_STEPS.length - 1) ||
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
                      <CheckCircle2 size={14} color="#FFFFFF" />
                    ) : (
                      <View style={styles.stepDotInner} />
                    )}
                  </View>
                  {idx < STATUS_STEPS.length - 1 && (
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
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  waitingAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
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
    color: "#92400E",
    marginTop: 2,
  },
  btnActionPulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D97706",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnActionPulseText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  completedCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#15803D",
    marginTop: 6,
  },
  completedPoints: {
    fontSize: 26,
    fontWeight: "900",
    color: "#15803D",
    marginTop: 4,
  },
  completedSub: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  btnViewWallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  btnViewWalletText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  bankName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  bankAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  scheduleText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  driverText: {
    fontSize: 11,
    color: "#0369A1",
    fontWeight: "600",
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  categoriesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  catName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  catSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  catWeight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  catPoint: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timelineStep: {
    flexDirection: "row",
  },
  timelineLeft: {
    alignItems: "center",
    width: 28,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotDone: {
    backgroundColor: "#15803D",
  },
  stepDotCurrent: {
    backgroundColor: "#F59E0B",
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  timelineLine: {
    width: 2,
    height: 36,
    backgroundColor: "#E5E7EB",
  },
  timelineLineDone: {
    backgroundColor: "#15803D",
  },
  timelineRight: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 22,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  stepLabelDone: {
    color: "#111827",
    fontWeight: "700",
  },
  stepLabelCurrent: {
    color: "#D97706",
    fontWeight: "800",
  },
  stepDesc: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  btnCancel: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
