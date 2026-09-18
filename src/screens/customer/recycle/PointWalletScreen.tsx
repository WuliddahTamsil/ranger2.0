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
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Scale,
  Ticket,
  Banknote,
  BookOpen,
  Leaf,
  Wind,
  TreeDeciduous,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getPointLedger } from "../../../services/recycleService";
import { PointLedgerUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

export const PointWalletScreen: React.FC<Nav> = ({ navigate }) => {
  const { wallet, refreshWallet, walletLoading } = useRecycle();
  const [recentLedgers, setRecentLedgers] = useState<PointLedgerUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecentLedgers = async () => {
    try {
      const res = await getPointLedger({ limit: 4 });
      if (res.success && res.data?.ledger) {
        setRecentLedgers(res.data.ledger);
      }
    } catch (err) {
      console.error("loadRecentLedgers error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshWallet();
    loadRecentLedgers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    refreshWallet();
    loadRecentLedgers();
  };

  const balance = wallet?.balancePoint || 0;
  const lifetimeEarned = wallet?.lifetimeEarned || 0;
  const lifetimeRedeemed = wallet?.lifetimeRedeemed || 0;
  const totalKg = wallet?.totalKgDeposited || 0;
  const co2ReductionKg = wallet?.totalCo2ReductionKg || (totalKg * 1.85);
  const treesEquivalent = Math.floor(co2ReductionKg / 22);

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
          <Text style={styles.headerTitle}>Buku Tabungan Sampah</Text>
          <Text style={styles.headerSub}>GEOVERSE Point Digital Wallet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {/* Main Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View>
              <Text style={styles.walletLabel}>Saldo Aktif</Text>
              <View style={styles.balanceRow}>
                <Sparkles size={24} color="#FBBF24" />
                <Text style={styles.balanceVal}>{balance.toLocaleString("id-ID")}</Text>
                <Text style={styles.balanceUnit}>Pts</Text>
              </View>
              <Text style={styles.balanceRupiah}>≈ {rp(balance)} (1 Point = Rp 1)</Text>
            </View>
            <View style={styles.badgePassbook}>
              <BookOpen size={16} color="#15803D" />
              <Text style={styles.badgePassbookText}>Rek. Sampah</Text>
            </View>
          </View>

          {/* Quick Redemption Buttons */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigate("c_recycle_redemption")}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBg, { backgroundColor: "#FEF3C7" }]}>
                <Ticket size={20} color="#D97706" />
              </View>
              <Text style={styles.actionBtnLabel}>Tukar Voucher</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigate("c_recycle_redemption")}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBg, { backgroundColor: "#DCFCE7" }]}>
                <Banknote size={20} color="#15803D" />
              </View>
              <Text style={styles.actionBtnLabel}>Tukar Rupiah</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigate("c_recycle_ledger")}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconBg, { backgroundColor: "#E0F2FE" }]}>
                <BookOpen size={20} color="#0284C7" />
              </View>
              <Text style={styles.actionBtnLabel}>Lihat Ledger</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#DCFCE7" }]}>
              <TrendingUp size={16} color="#15803D" />
            </View>
            <Text style={styles.statVal}>+{lifetimeEarned.toLocaleString("id-ID")}</Text>
            <Text style={styles.statLabel}>Total Diperoleh</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FEE2E2" }]}>
              <TrendingDown size={16} color="#DC2626" />
            </View>
            <Text style={styles.statVal}>-{lifetimeRedeemed.toLocaleString("id-ID")}</Text>
            <Text style={styles.statLabel}>Total Digunakan</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}>
              <Scale size={16} color="#CA8A04" />
            </View>
            <Text style={styles.statVal}>{totalKg.toFixed(1)} kg</Text>
            <Text style={styles.statLabel}>Total Sampah</Text>
          </View>
        </View>

        {/* Environmental Impact Tracker */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Leaf size={18} color="#15803D" />
            <Text style={styles.impactTitle}>Kontribusi Lingkungan Anda</Text>
          </View>
          <View style={styles.impactDetailsRow}>
            <View style={styles.impactItem}>
              <Wind size={18} color="#0284C7" />
              <Text style={styles.impactItemVal}>{co2ReductionKg.toFixed(1)} kg</Text>
              <Text style={styles.impactItemSub}>Emisi CO₂ Dicegah</Text>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.impactItem}>
              <TreeDeciduous size={18} color="#15803D" />
              <Text style={styles.impactItemVal}>{treesEquivalent} Pohon</Text>
              <Text style={styles.impactItemSub}>Pohon Terselamatkan</Text>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.impactItem}>
              <Scale size={18} color="#D97706" />
              <Text style={styles.impactItemVal}>{totalKg.toFixed(1)} kg</Text>
              <Text style={styles.impactItemSub}>Diverted dari TPA</Text>
            </View>
          </View>
        </View>

        {/* Recent Mutations Preview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mutasi Rekening Terakhir</Text>
          <TouchableOpacity onPress={() => navigate("c_recycle_ledger")}>
            <Text style={styles.seeAllText}>Buka Ledger Penuh</Text>
          </TouchableOpacity>
        </View>

        {recentLedgers.length === 0 ? (
          <View style={styles.emptyLedger}>
            <Clock size={28} color="#9CA3AF" />
            <Text style={styles.emptyLedgerText}>Belum ada riwayat transaksi mutasi</Text>
          </View>
        ) : (
          recentLedgers.map((l) => (
            <View key={l._id} style={styles.ledgerRow}>
              <View
                style={[
                  styles.ledgerIconBg,
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
                  <TrendingUp size={16} color="#15803D" />
                ) : l.type === "REVERSAL" ? (
                  <Sparkles size={16} color="#B45309" />
                ) : (
                  <TrendingDown size={16} color="#DC2626" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerTitle}>
                  {l.type === "EARN"
                    ? "Setor Sampah"
                    : l.type === "REDEEM_VOUCHER"
                    ? "Tukar Voucher Belanja"
                    : l.type === "REDEEM_CASH"
                    ? "Penarikan Rupiah"
                    : l.type === "REVERSAL"
                    ? "Pengembalian Poin"
                    : "Penyesuaian"}
                </Text>
                <Text style={styles.ledgerDate}>
                  {new Date(l.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    styles.ledgerPoints,
                    {
                      color:
                        l.type === "EARN" || l.type === "REVERSAL"
                          ? "#15803D"
                          : "#DC2626",
                    },
                  ]}
                >
                  {l.type === "EARN" || l.type === "REVERSAL" ? `+${l.points}` : `-${l.points}`} Pts
                </Text>
                <Text style={styles.ledgerBalanceAfter}>
                  Saldo: {l.balanceAfter?.toLocaleString("id-ID")}
                </Text>
              </View>
            </View>
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
    paddingBottom: 40,
  },
  walletCard: {
    backgroundColor: "#1B7A4E",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#1B7A4E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  walletHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  walletLabel: {
    fontSize: 12,
    color: "#A7F3D0",
    fontWeight: "600",
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceVal: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  balanceUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FDE047",
  },
  balanceRupiah: {
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 2,
  },
  badgePassbook: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgePassbookText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    paddingTop: 14,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  impactCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 18,
  },
  impactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },
  impactDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  impactItem: {
    flex: 1,
    alignItems: "center",
  },
  impactItemVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginTop: 4,
  },
  impactItemSub: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 1,
    textAlign: "center",
  },
  impactDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#BBF7D0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ledgerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  ledgerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  ledgerDate: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  ledgerPoints: {
    fontSize: 13,
    fontWeight: "800",
  },
  ledgerBalanceAfter: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  emptyLedger: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyLedgerText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
  },
});
