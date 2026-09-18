import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  Building2,
  Scale,
  Sparkles,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LogOut,
  RefreshCw,
  Plus,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { useRecycle } from "../../context/RecycleContext";
import {
  getBankDeposits,
  getWasteBanks,
} from "../../services/recycleService";
import { WasteBankUI, WasteDepositUI } from "../../types/recycleTypes";
import { rp } from "../../utils/formatters";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

type TabQueue = "WEIGHING" | "WAITING" | "COMPLETED";

export const WasteBankDashboardScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const { setSelectedDeposit, setSelectedBank } = useRecycle();
  const [bank, setBank] = useState<WasteBankUI | null>(null);
  const [deposits, setDeposits] = useState<WasteDepositUI[]>([]);
  const [activeQueue, setActiveQueue] = useState<TabQueue>("WEIGHING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      // Find bank belonging to this owner or fallback to first active bank
      const banksRes = await getWasteBanks();
      if (banksRes.success && Array.isArray(banksRes.data) && banksRes.data.length > 0) {
        const myBank =
          banksRes.data.find((b) => b.ownerId === authAccount?.id) || banksRes.data[0];
        setBank(myBank);
        setSelectedBank(myBank);

        const depRes = await getBankDeposits(myBank._id);
        if (depRes.success && Array.isArray(depRes.data)) {
          setDeposits(depRes.data);
        }
      }
    } catch (err) {
      console.error("loadDashboard error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [authAccount?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // Metrics
  const totalDeposits = deposits.length;
  const waitingWeighing = deposits.filter((d) =>
    ["REQUESTED", "ACCEPTED", "PICKED_UP", "AT_BANK", "WEIGHING"].includes(d.status)
  );
  const waitingCustomerConfirm = deposits.filter(
    (d) => d.status === "WAITING_CUSTOMER_CONFIRMATION"
  );
  const completedDeposits = deposits.filter(
    (d) => d.status === "COMPLETED" || d.status === "POINT_ISSUED"
  );
  const totalKg = deposits.reduce((sum, d) => sum + (d.actualTotalWeightKg || d.estimatedTotalWeightKg || 0), 0);
  const totalPointsIssued = completedDeposits.reduce((sum, d) => sum + (d.finalPoint || 0), 0);

  const getFilteredQueue = () => {
    switch (activeQueue) {
      case "WEIGHING":
        return waitingWeighing;
      case "WAITING":
        return waitingCustomerConfirm;
      case "COMPLETED":
        return completedDeposits;
      default:
        return [];
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Building2 size={22} color="#15803D" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>{bank?.name || "Dashboard Bank Sampah"}</Text>
            <Text style={styles.headerSubtitle}>
              Petugas: {authAccount?.name || "Admin Sampah"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnCustomerMode}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <Text style={styles.btnCustomerModeText}>Mode Customer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Scale size={20} color="#15803D" />
            <Text style={styles.metricVal}>{totalKg.toFixed(1)} kg</Text>
            <Text style={styles.metricLabel}>Total Sampah</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" }]}>
            <Sparkles size={20} color="#CA8A04" />
            <Text style={styles.metricVal}>{totalPointsIssued.toLocaleString("id-ID")}</Text>
            <Text style={styles.metricLabel}>Poin Diterbitkan</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
            <Clock size={20} color="#EA580C" />
            <Text style={styles.metricVal}>{waitingWeighing.length}</Text>
            <Text style={styles.metricLabel}>Perlu Ditimbang</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
            <CheckCircle2 size={20} color="#2563EB" />
            <Text style={styles.metricVal}>{completedDeposits.length}</Text>
            <Text style={styles.metricLabel}>Setoran Selesai</Text>
          </View>
        </View>

        {/* Queue Tabs */}
        <View style={styles.queueTabBar}>
          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "WEIGHING" && styles.queueTabActive]}
            onPress={() => setActiveQueue("WEIGHING")}
          >
            <Text style={[styles.queueTabText, activeQueue === "WEIGHING" && styles.queueTabTextActive]}>
              Antrean Timbang ({waitingWeighing.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "WAITING" && styles.queueTabActive]}
            onPress={() => setActiveQueue("WAITING")}
          >
            <Text style={[styles.queueTabText, activeQueue === "WAITING" && styles.queueTabTextActive]}>
              Menunggu User ({waitingCustomerConfirm.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "COMPLETED" && styles.queueTabActive]}
            onPress={() => setActiveQueue("COMPLETED")}
          >
            <Text style={[styles.queueTabText, activeQueue === "COMPLETED" && styles.queueTabTextActive]}>
              Selesai ({completedDeposits.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Queue Items */}
        {loading ? (
          <ActivityIndicator size="large" color="#15803D" style={{ marginTop: 30 }} />
        ) : getFilteredQueue().length === 0 ? (
          <View style={styles.emptyQueueCard}>
            <CheckCircle2 size={36} color="#9CA3AF" />
            <Text style={styles.emptyQueueText}>Tidak ada antrean dalam kategori ini.</Text>
          </View>
        ) : (
          getFilteredQueue().map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.depositCard}
              onPress={() => {
                setSelectedDeposit(item);
                navigate("bank_sampah_weighing");
              }}
              activeOpacity={0.85}
            >
              <View style={styles.depositCardHeader}>
                <View>
                  <Text style={styles.depositCode}>{item.depositCode}</Text>
                  <Text style={styles.customerName}>
                    {typeof item.customerId === "object" ? item.customerId?.name : "Customer GEOVERSE"}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.depositMetaRow}>
                <Text style={styles.depositMeta}>
                  Metode: {item.method === "PICKUP" ? "Pickup Driver" : "Antar Langsung"}
                </Text>
                <Text style={styles.depositMeta}>•</Text>
                <Text style={styles.depositMeta}>
                  {item.categories?.length || 0} Kategori Sampah
                </Text>
              </View>

              <View style={styles.depositCardFooter}>
                <View>
                  <Text style={styles.footerWeightLabel}>Estimasi Berat:</Text>
                  <Text style={styles.footerWeightVal}>{item.estimatedTotalWeightKg || 0} kg</Text>
                </View>

                <View style={styles.btnTimbangAction}>
                  <Scale size={14} color="#FFFFFF" />
                  <Text style={styles.btnTimbangActionText}>
                    {item.status === "WAITING_CUSTOMER_CONFIRMATION" ? "Lihat Hasil" : "Input Timbangan"}
                  </Text>
                  <ChevronRight size={14} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  btnCustomerMode: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnCustomerModeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "flex-start",
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  queueTabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  queueTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  queueTabActive: {
    backgroundColor: "#15803D",
  },
  queueTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  queueTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  depositCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  depositCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  depositCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  customerName: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B45309",
  },
  depositMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  depositMeta: {
    fontSize: 11,
    color: "#6B7280",
  },
  depositCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerWeightLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  footerWeightVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  btnTimbangAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15803D",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnTimbangActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyQueueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyQueueText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
});
