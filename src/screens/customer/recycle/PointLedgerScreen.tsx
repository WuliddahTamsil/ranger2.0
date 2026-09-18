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
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sliders,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { getPointLedger } from "../../../services/recycleService";
import { PointLedgerUI } from "../../../types/recycleTypes";

type FilterTab = "ALL" | "EARN" | "REDEEM" | "REVERSAL";

export const PointLedgerScreen: React.FC<Nav> = ({ navigate }) => {
  const [ledgers, setLedgers] = useState<PointLedgerUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const loadLedger = async (tab: FilterTab) => {
    setLoading(true);
    try {
      const typeParam =
        tab === "ALL"
          ? undefined
          : tab === "EARN"
          ? "EARN"
          : tab === "REDEEM"
          ? "REDEEM_VOUCHER"
          : "REVERSAL";

      const res = await getPointLedger({ type: typeParam, limit: 30 });
      if (res.success && res.data?.ledger) {
        setLedgers(res.data.ledger);
      }
    } catch (err) {
      console.error("loadLedger error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLedger(activeTab);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLedger(activeTab);
  };

  const getLedgerTypeLabel = (type: string) => {
    switch (type) {
      case "EARN":
        return "Setor Sampah (Poin Masuk)";
      case "REDEEM_VOUCHER":
        return "Tukar Voucher Belanja";
      case "REDEEM_CASH":
        return "Penarikan Rupiah";
      case "REVERSAL":
        return "Pengembalian Poin (Reversal)";
      case "ADJUSTMENT":
        return "Penyesuaian Admin";
      default:
        return type;
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_wallet")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Buku Kas / Mutasi Poin</Text>
          <Text style={styles.headerSub}>Riwayat audit saldo GEOVERSE Point</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ALL" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ALL")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "ALL" && styles.tabBtnTextActive]}>
            Semua
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "EARN" && styles.tabBtnActive]}
          onPress={() => setActiveTab("EARN")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "EARN" && styles.tabBtnTextActive]}>
            Masuk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "REDEEM" && styles.tabBtnActive]}
          onPress={() => setActiveTab("REDEEM")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "REDEEM" && styles.tabBtnTextActive]}>
            Keluar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "REVERSAL" && styles.tabBtnActive]}
          onPress={() => setActiveTab("REVERSAL")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === "REVERSAL" && styles.tabBtnTextActive]}>
            Reversal
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#15803D" style={{ marginTop: 40 }} />
        ) : ledgers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Belum Ada Riwayat Mutasi</Text>
            <Text style={styles.emptySub}>Semua transaksi perolehan dan penukaran poin akan tercatat di sini.</Text>
          </View>
        ) : (
          ledgers.map((l) => {
            const isEarn = l.type === "EARN" || l.type === "REVERSAL";
            return (
              <View key={l._id || l.ledgerId} style={styles.ledgerCard}>
                <View style={styles.cardTop}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor:
                            l.type === "EARN"
                              ? "#DCFCE7"
                              : l.type === "REVERSAL"
                              ? "#FEF3C7"
                              : "#FEE2E2",
                        },
                      ]}
                    >
                      {l.type === "EARN" ? (
                        <TrendingUp size={14} color="#15803D" />
                      ) : l.type === "REVERSAL" ? (
                        <RotateCcw size={14} color="#B45309" />
                      ) : (
                        <TrendingDown size={14} color="#DC2626" />
                      )}
                      <Text
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              l.type === "EARN"
                                ? "#15803D"
                                : l.type === "REVERSAL"
                                ? "#B45309"
                                : "#DC2626",
                          },
                        ]}
                      >
                        {l.type}
                      </Text>
                    </View>

                    <View style={styles.statusPill}>
                      <CheckCircle2 size={11} color="#059669" />
                      <Text style={styles.statusPillText}>{l.status}</Text>
                    </View>
                  </View>

                  <Text style={[styles.pointsVal, { color: isEarn ? "#15803D" : "#DC2626" }]}>
                    {isEarn ? `+${l.points.toLocaleString("id-ID")}` : `-${l.points.toLocaleString("id-ID")}`} Pts
                  </Text>
                </View>

                <Text style={styles.ledgerDesc}>{getLedgerTypeLabel(l.type)}</Text>
                {l.notes && <Text style={styles.ledgerNotes}>Catatan: {l.notes}</Text>}

                {/* Audit trail: balanceBefore -> balanceAfter */}
                <View style={styles.auditRow}>
                  <Text style={styles.auditText}>
                    Saldo: <Text style={styles.auditNum}>{l.balanceBefore?.toLocaleString("id-ID")}</Text> →{" "}
                    <Text style={styles.auditNumBold}>{l.balanceAfter?.toLocaleString("id-ID")}</Text>
                  </Text>
                  <Text style={styles.timeText}>
                    {new Date(l.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            );
          })
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  tabBtnActive: {
    backgroundColor: "#15803D",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  pointsVal: {
    fontSize: 15,
    fontWeight: "900",
  },
  ledgerDesc: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  ledgerNotes: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  auditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  auditText: {
    fontSize: 11,
    color: "#6B7280",
  },
  auditNum: {
    fontWeight: "600",
    color: "#4B5563",
  },
  auditNumBold: {
    fontWeight: "800",
    color: "#111827",
  },
  timeText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 30,
  },
});
