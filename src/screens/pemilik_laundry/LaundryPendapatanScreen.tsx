import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import {
  TrendingUp,
  Wallet,
  Home,
  Package,
  Users,
  User,
  ArrowUpRight,
} from "lucide-react-native";

export const LaundryPendapatanScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "order" | "user" | "keuangan" | "profil">("keuangan");
  const [chartFilter, setChartFilter] = useState<"minggu" | "bulan">("minggu");

  const barData = [
    { label: "1", val: 18, heightPct: "30%" },
    { label: "5", val: 32, heightPct: "55%" },
    { label: "10", val: 40, heightPct: "72%" },
    { label: "15", val: 24, heightPct: "42%" },
    { label: "20", val: 35, heightPct: "60%" },
    { label: "25", val: 48, heightPct: "92%" },
    { label: "30", val: 34, heightPct: "58%" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Laporan Keuangan & Pendapatan</Text>
          <Text style={styles.headerSub}>Ringkasan pemasukan & pengeluaran usaha Anda</Text>
        </View>

        {/* 3 Summary Cards Row (Pendapatan, Pengeluaran, Laba Bersih) */}
        <View style={styles.topThreeRow}>
          {/* Card 1: Pendapatan */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Pendapatan</Text>
            <Text style={[styles.topStatVal, { color: "#0D7A53" }]}>
              Rp{"\n"}18.750.000
            </Text>
          </View>

          {/* Card 2: Pengeluaran */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Pengeluaran</Text>
            <Text style={[styles.topStatVal, { color: "#DC2626" }]}>
              Rp{"\n"}4.250.000
            </Text>
          </View>

          {/* Card 3: Laba Bersih */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Laba Bersih</Text>
            <Text style={[styles.topStatVal, { color: "#0E6641" }]}>
              Rp{"\n"}14.500.000
            </Text>
          </View>
        </View>

        {/* Grafik Pendapatan Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Grafik Pendapatan</Text>

            {/* Filter Toggle Pill (Minggu vs Bulan) */}
            <View style={styles.filterPillContainer}>
              <TouchableOpacity
                style={[styles.filterPillBtn, chartFilter === "minggu" && styles.filterPillActive]}
                onPress={() => setChartFilter("minggu")}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, chartFilter === "minggu" && styles.filterPillTextActive]}>
                  Minggu
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPillBtn, chartFilter === "bulan" && styles.filterPillActive]}
                onPress={() => setChartFilter("bulan")}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, chartFilter === "bulan" && styles.filterPillTextActive]}>
                  Bulan
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Chart Content Area */}
          <View style={styles.chartBody}>
            {/* Grid Horizontal Lines */}
            <View style={styles.chartGridLines}>
              <View style={styles.gridLineRow}>
                <Text style={styles.yAxisText}>50</Text>
                <View style={styles.gridLine} />
              </View>
              <View style={styles.gridLineRow}>
                <Text style={styles.yAxisText}>30</Text>
                <View style={styles.gridLine} />
              </View>
              <View style={styles.gridLineRow}>
                <Text style={styles.yAxisText}>10</Text>
                <View style={styles.gridLine} />
              </View>
            </View>

            {/* Bars Row */}
            <View style={styles.barsRowContainer}>
              <View style={styles.yAxisOffsetSpacer} />

              <View style={styles.barsFlexRow}>
                {barData.map((b) => (
                  <View key={b.label} style={styles.barColumnItem}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: b.heightPct as any }]} />
                    </View>
                    <Text style={styles.xAxisText}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Laba Bersih Banner Card */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Total Pendapatan Bulan Ini</Text>
          <Text style={styles.incomeValue}>Rp 3.850.000</Text>

          <View style={styles.growthRow}>
            <View style={styles.growthPill}>
              <TrendingUp size={12} color="#0D7A53" />
              <Text style={styles.growthPillText}>+15%</Text>
            </View>
            <Text style={styles.growthSub}>vs bulan lalu</Text>
          </View>
        </View>

        {/* Volume Stats */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Kiloan (Kg)</Text>
            <Text style={styles.statVal}>420 kg</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Satuan (Pcs)</Text>
            <Text style={styles.statVal}>85 pcs</Text>
          </View>
        </View>

        {/* Recent Income Log List */}
        <Text style={styles.sectionTitle}>Pemasukan Terbaru</Text>
        <View style={styles.listCard}>
          <View style={styles.itemRow}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <ArrowUpRight size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Laundry Kiloan 5 kg</Text>
              <Text style={styles.itemSub}>Siti Aminah • 14 Juli 2026</Text>
            </View>
            <Text style={styles.incomeText}>+ Rp 35.000</Text>
          </View>

          <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <ArrowUpRight size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Express 3 Jam</Text>
              <Text style={styles.itemSub}>Ahmad Faisal • 14 Juli 2026</Text>
            </View>
            <Text style={styles.incomeText}>+ Rp 40.000</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_home")}>
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_order")}>
          <Package size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_user")}>
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveNavTab("keuangan")}>
          <Wallet size={22} color="#0E6641" />
          <Text style={[styles.navText, styles.navTextActive]}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_profil")}>
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  // Top Three Stat Cards
  topThreeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  topStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  topStatTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  topStatVal: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },

  // Chart Card
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  filterPillContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    padding: 3,
  },
  filterPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: "#FFFFFF",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#111827",
  },

  // Chart Body & Bar Layout
  chartBody: {
    height: 180,
    justifyContent: "flex-end",
    position: "relative",
    paddingTop: 10,
  },
  chartGridLines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    justifyContent: "space-between",
  },
  gridLineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  yAxisText: {
    width: 24,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginRight: 8,
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  barsRowContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 156,
  },
  yAxisOffsetSpacer: {
    width: 32,
  },
  barsFlexRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: "100%",
  },
  barColumnItem: {
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    flex: 1,
    width: 24,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#0E6641",
    borderRadius: 12,
  },
  xAxisText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
  },

  // Laba Bersih Banner Card
  incomeCard: {
    backgroundColor: "#0E6641",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  incomeLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  incomeValue: { fontSize: 26, fontWeight: "900", color: "#FFFFFF", marginTop: 4, marginBottom: 12 },
  growthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  growthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  growthPillText: { fontSize: 11, fontWeight: "800", color: "#0D7A53" },
  growthSub: { fontSize: 11, color: "rgba(255,255,255,0.7)" },

  // Stats Volume
  statRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statLabel: { fontSize: 11, color: "#6B7280" },
  statVal: { fontSize: 16, fontWeight: "900", color: "#111827", marginTop: 4 },

  // Recent Income List
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  itemSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  incomeText: { fontSize: 13, fontWeight: "800", color: "#0D7A53" },

  // Bottom Navigation
  bottomNav: {
    flexDirection: "row",
    height: 64,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navTab: { alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 10, color: "#9CA3AF", marginTop: 3 },
  navTextActive: { color: "#0E6641", fontWeight: "700" },
});
