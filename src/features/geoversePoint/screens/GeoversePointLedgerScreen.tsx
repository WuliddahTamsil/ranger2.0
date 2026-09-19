import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, BookOpen, Filter, ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import { Nav } from "../../../types";
import { useGeoversePoint } from "../hooks/useGeoversePoint";
import { GeoversePointLedgerItem } from "../components/GeoversePointLedgerItem";
import { fetchPointLedger } from "../services/geoversePointService";
import { PointLedgerUI } from "../types/pointTypes";

export const GeoversePointLedgerScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { formatPoint, wallet, refreshWallet } = useGeoversePoint();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [ledgerItems, setLedgerItems] = useState<PointLedgerUI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const filterTabs = [
    { id: "ALL", label: "Semua" },
    { id: "EARN", label: "Masuk (+)" },
    { id: "REDEEM", label: "Keluar (-)" },
    { id: "SHOP", label: "Belanja" },
  ];

  const loadLedger = async (tab: string) => {
    setLoading(true);
    try {
      let params: { type?: string; sourceType?: string; limit: number } = { limit: 50 };
      if (tab === "EARN") {
        params.type = "EARN";
      } else if (tab === "REDEEM") {
        params.type = "REDEEM_CASH";
      } else if (tab === "SHOP") {
        params.sourceType = "KANYAAH_SHOP";
      }

      await Promise.allSettled([
        refreshWallet(),
        fetchPointLedger(params).then((res) => {
          if (res.success && res.data?.ledger) {
            setLedgerItems(res.data.ledger);
          }
        }),
      ]);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_point_home")}
          activeOpacity={0.7}
          accessibilityLabel="Kembali"
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Buku Tabungan & Mutasi</Text>
          <Text style={styles.headerSubtitle}>Riwayat perolehan & penggunaan poin</Text>
        </View>
      </View>

      {/* Main Container */}
      <View style={[styles.container, isDesktop && styles.desktopContainer]}>
        {/* Wallet Balance Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Diperoleh</Text>
            <View style={styles.summaryValRow}>
              <ArrowDownLeft size={16} color="#15803D" />
              <Text style={styles.summaryEarned}>
                +{formatPoint(wallet?.lifetimeEarned || 0)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Digunakan</Text>
            <View style={styles.summaryValRow}>
              <ArrowUpRight size={16} color="#DC2626" />
              <Text style={styles.summaryRedeemed}>
                -{formatPoint(wallet?.lifetimeRedeemed || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                activeTab === tab.id && styles.filterTabActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeTab === tab.id && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ledger List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#15803D"]}
              tintColor="#15803D"
            />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#15803D" />
              <Text style={styles.loadingText}>Memuat mutasi buku tabungan...</Text>
            </View>
          ) : ledgerItems.length > 0 ? (
            ledgerItems.map((item) => (
              <GeoversePointLedgerItem
                key={item._id || item.ledgerId}
                item={item}
                formatPoint={formatPoint}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <BookOpen size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Tidak ada mutasi transaksi</Text>
              <Text style={styles.emptySubtitle}>
                Belum ada catatan mutasi untuk kategori filter yang dipilih.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  desktopContainer: {
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  summaryCol: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  summaryValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryEarned: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  summaryRedeemed: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterTabActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#15803D",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterTabTextActive: {
    color: "#15803D",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
});
