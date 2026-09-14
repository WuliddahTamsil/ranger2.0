import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  TrendingUp,
  Wallet,
  Home,
  Package,
  Users,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  CheckCircle2,
  X,
  CreditCard,
} from "lucide-react-native";
import {
  fetchStoreOrders,
  subscribeLaundry,
  LaundryOrder,
  getActiveLaundryOrder,
} from "../../services/laundryService";

interface LaundryPendapatanProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const LaundryPendapatanScreen: React.FC<LaundryPendapatanProps> = ({ navigate, authAccount }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "order" | "user" | "keuangan" | "profil">("keuangan");
  const [chartFilter, setChartFilter] = useState<"minggu" | "bulan">("minggu");
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    if (!authAccount?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const data = await fetchStoreOrders(authAccount.id);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeLaundry(() => {
      loadData();
    });
    return unsub;
  }, [authAccount?.id]);

  // Real financial calculations
  const paidOrders = useMemo(() => {
    return orders.filter((o) => o.paymentStatus === "lunas" || o.status === "SELESAI");
  }, [orders]);

  // 1. Biaya Laundry (Laba Bersih Toko = Harga Layanan x Berat/Jumlah)
  const totalLabaBersihLaundry = useMemo(() => {
    return paidOrders.reduce((sum, o) => {
      const cost = o.laundryCost || (o.pricePerUnit && o.actualWeightOrQty ? Math.round(o.pricePerUnit * o.actualWeightOrQty) : o.totalAmount) || 0;
      return sum + cost;
    }, 0);
  }, [paidOrders]);

  // 2. Biaya Ongkir Driver (1 KM = Rp 1.000)
  const totalOngkirDriver = useMemo(() => {
    return paidOrders.reduce((sum, o) => {
      const ongkir = (o.deliveryFeePickup || 0) + (o.deliveryFeeDrop || 0);
      return sum + ongkir;
    }, 0);
  }, [paidOrders]);

  // 3. Total Tagihan Keseluruhan Masuk dari Customer
  const totalOmsetTransaksi = totalLabaBersihLaundry + totalOngkirDriver;

  const totalKg = useMemo(() => {
    return orders
      .filter((o) => o.unitType === "kg" && o.actualWeightOrQty)
      .reduce((sum, o) => sum + (o.actualWeightOrQty || 0), 0);
  }, [orders]);

  const totalPcs = useMemo(() => {
    return orders
      .filter((o) => (o.unitType === "pcs" || o.unitType === "pasang") && o.actualWeightOrQty)
      .reduce((sum, o) => sum + (o.actualWeightOrQty || 0), 0);
  }, [orders]);

  // Chart data calculation
  const barData = useMemo(() => {
    if (chartFilter === "minggu") {
      const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
      const counts = [0, 0, 0, 0, 0, 0, 0];
      paidOrders.forEach((o) => {
        const d = new Date(o.createdAt || Date.now());
        const dayIdx = (d.getDay() + 6) % 7;
        const c = o.laundryCost || (o.pricePerUnit && o.actualWeightOrQty ? o.pricePerUnit * o.actualWeightOrQty : o.totalAmount) || 1;
        counts[dayIdx] += c;
      });
      const maxVal = Math.max(...counts, 1);
      return days.map((label, idx) => {
        const val = counts[idx];
        const heightPct = totalLabaBersihLaundry > 0 ? `${Math.max(12, Math.round((val / maxVal) * 90))}%` : "12%";
        return { label, val, heightPct };
      });
    } else {
      const intervals = ["1-5", "6-10", "11-15", "16-20", "21-25", "26-31"];
      const counts = [0, 0, 0, 0, 0, 0];
      paidOrders.forEach((o) => {
        const d = new Date(o.createdAt || Date.now()).getDate();
        const slot = Math.min(5, Math.floor((d - 1) / 5));
        const c = o.laundryCost || (o.pricePerUnit && o.actualWeightOrQty ? o.pricePerUnit * o.actualWeightOrQty : o.totalAmount) || 1;
        counts[slot] += c;
      });
      const maxVal = Math.max(...counts, 1);
      return intervals.map((label, idx) => {
        const val = counts[idx];
        const heightPct = totalLabaBersihLaundry > 0 ? `${Math.max(12, Math.round((val / maxVal) * 90))}%` : "12%";
        return { label, val, heightPct };
      });
    }
  }, [chartFilter, paidOrders, totalLabaBersihLaundry]);

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Laporan Keuangan & Pendapatan</Text>
          <Text style={styles.headerSub}>
            {authAccount?.roleData?.businessName
              ? `Rekapitulasi Keuangan ${authAccount.roleData.businessName}`
              : "Ringkasan pemasukan & pengeluaran usaha Anda"}
          </Text>
        </View>

        {/* 3 Summary Cards Row (Laba Bersih Toko, Ongkir Kurir, Total Transaksi) */}
        <View style={styles.topThreeRow}>
          {/* Card 1: Laba Bersih Toko */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Laba Bersih Toko</Text>
            <Text style={[styles.topStatVal, { color: "#0D7A53" }]}>
              Rp{"\n"}{totalLabaBersihLaundry.toLocaleString("id-ID")}
            </Text>
            <Text style={{ fontSize: 9, color: "#6B7280", marginTop: 2 }}>Harga x Berat</Text>
          </View>

          {/* Card 2: Ongkir Driver */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Ongkir Driver</Text>
            <Text style={[styles.topStatVal, { color: "#0284C7" }]}>
              Rp{"\n"}{totalOngkirDriver.toLocaleString("id-ID")}
            </Text>
            <Text style={{ fontSize: 9, color: "#6B7280", marginTop: 2 }}>Rp 1.000 / KM</Text>
          </View>

          {/* Card 3: Total Transaksi */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Total Masuk</Text>
            <Text style={[styles.topStatVal, { color: "#111827" }]}>
              Rp{"\n"}{totalOmsetTransaksi.toLocaleString("id-ID")}
            </Text>
            <Text style={{ fontSize: 9, color: "#6B7280", marginTop: 2 }}>Cuci + Ongkir</Text>
          </View>
        </View>

        {/* Grafik Pendapatan Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Grafik Omset Laundry</Text>

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
                <Text style={styles.yAxisText}>Maks</Text>
                <View style={styles.gridLine} />
              </View>
              <View style={styles.gridLineRow}>
                <Text style={styles.yAxisText}>50%</Text>
                <View style={styles.gridLine} />
              </View>
              <View style={styles.gridLineRow}>
                <Text style={styles.yAxisText}>0</Text>
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
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: b.heightPct as any,
                            backgroundColor: totalLabaBersihLaundry > 0 ? "#0E6641" : "#E5E7EB",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.xAxisText}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Info Direct Payment Card (No withdraw button needed!) */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Pemasukan Langsung Masuk ke Rekening / QRIS Toko</Text>
          <Text style={styles.incomeValue}>Rp {totalLabaBersihLaundry.toLocaleString("id-ID")}</Text>

          <View style={{ marginTop: 8, backgroundColor: "rgba(255, 255, 255, 0.15)", borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 11, color: "#D1FAE5", lineHeight: 16 }}>
              ✅ Semua uang pembayaran customer langsung masuk 100% ke rekening bank / QRIS toko Anda. Tidak ada penahanan dana ataupun potongan perantara sistem.
            </Text>
          </View>
        </View>

        {/* Volume Stats */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Kiloan (Kg)</Text>
            <Text style={styles.statVal}>{totalKg} kg</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Satuan (Pcs)</Text>
            <Text style={styles.statVal}>{totalPcs} pcs</Text>
          </View>
        </View>

        {/* Recent Income Log List */}
        <Text style={styles.sectionTitle}>Pemasukan Pesanan Terkini</Text>
        <View style={styles.listCard}>
          {paidOrders.length === 0 ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Wallet size={36} color="#D1D5DB" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#6B7280", marginTop: 8 }}>
                Belum ada transaksi pendapatan
              </Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 2 }}>
                Saat customer selesai membayar pesanan laundry, transaksi pemasukan akan tercatat otomatis di sini.
              </Text>
            </View>
          ) : (
            paidOrders.slice(0, 10).map((ord, idx) => {
              const isLast = idx === Math.min(paidOrders.length, 10) - 1;
              const dateStr = ord.createdAt
                ? new Date(ord.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Hari ini";
              const laundryCost = ord.laundryCost || (ord.pricePerUnit && ord.actualWeightOrQty ? Math.round(ord.pricePerUnit * ord.actualWeightOrQty) : ord.totalAmount) || 0;
              const ongkir = (ord.deliveryFeePickup || 0) + (ord.deliveryFeeDrop || 0);

              return (
                <View key={ord._id || ord.id || idx} style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]}>
                  <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
                    <ArrowUpRight size={18} color="#0D7A53" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{ord.serviceName || "Layanan Laundry"}</Text>
                    <Text style={styles.itemSub}>
                      {ord.customerName || "Customer"} • #{ord.orderCode} • {dateStr}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                      Cuci: Rp {laundryCost.toLocaleString("id-ID")} {ongkir > 0 ? `• Ongkir Kurir: Rp ${ongkir.toLocaleString("id-ID")}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.incomeText}>+ Rp {laundryCost.toLocaleString("id-ID")}</Text>
                    <Text style={{ fontSize: 9, color: "#0D7A53", fontWeight: "700" }}>Laba Bersih</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 90 }} />
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
    </ResponsiveSafeAreaView>
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
    width: 30,
    fontSize: 10,
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
    width: 38,
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
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  withdrawBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0E6641",
  },

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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  modalSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  submitBtn: {
    flex: 2,
    backgroundColor: "#0E6641",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Bottom Navigation
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
