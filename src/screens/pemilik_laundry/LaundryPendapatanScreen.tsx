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

  // Modal Tarik Dana
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("BCA");
  const [withdrawAccountNo, setWithdrawAccountNo] = useState("");

  const loadData = async () => {
    setLoading(true);
    if (!authAccount?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const data = await fetchStoreOrders(authAccount.id);
    const active = getActiveLaundryOrder();
    if (
      active &&
      active.ownerId === authAccount.id &&
      !data.some((d) => (d._id || d.id) === (active._id || active.id))
    ) {
      data.unshift(active);
    }
    setOrders(data);
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

  const totalPendapatan = useMemo(() => {
    return paidOrders.reduce((sum, o) => sum + (o.laundryCost || o.totalAmount || 0), 0);
  }, [paidOrders]);

  const totalPengeluaran = useMemo(() => {
    // Estimasi biaya operasional detergen & listrik 20%
    return Math.round(totalPendapatan * 0.2);
  }, [totalPendapatan]);

  const labaBersih = totalPendapatan - totalPengeluaran;

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
        counts[dayIdx] += o.laundryCost || 1;
      });
      const maxVal = Math.max(...counts, 1);
      return days.map((label, idx) => {
        const val = counts[idx];
        const heightPct = totalPendapatan > 0 ? `${Math.max(12, Math.round((val / maxVal) * 90))}%` : "12%";
        return { label, val, heightPct };
      });
    } else {
      const intervals = ["1-5", "6-10", "11-15", "16-20", "21-25", "26-31"];
      const counts = [0, 0, 0, 0, 0, 0];
      paidOrders.forEach((o) => {
        const d = new Date(o.createdAt || Date.now()).getDate();
        const slot = Math.min(5, Math.floor((d - 1) / 5));
        counts[slot] += o.laundryCost || 1;
      });
      const maxVal = Math.max(...counts, 1);
      return intervals.map((label, idx) => {
        const val = counts[idx];
        const heightPct = totalPendapatan > 0 ? `${Math.max(12, Math.round((val / maxVal) * 90))}%` : "12%";
        return { label, val, heightPct };
      });
    }
  }, [chartFilter, paidOrders, totalPendapatan]);

  const handleWithdraw = () => {
    const amt = parseInt(withdrawAmount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amt) || amt < 50000) {
      Alert.alert("Gagal Tarik Dana", "Minimal penarikan saldo adalah Rp 50.000.");
      return;
    }
    if (amt > labaBersih) {
      Alert.alert("Saldo Tidak Cukup", "Jumlah penarikan melebihi saldo laba bersih yang tersedia.");
      return;
    }
    Alert.alert(
      "Permintaan Tarik Dana Terkirim",
      `Permintaan transfer Rp ${amt.toLocaleString("id-ID")} ke rekening ${withdrawBank} (${withdrawAccountNo || "Tersimpan"}) sedang diproses oleh finance.`
    );
    setIsWithdrawModalOpen(false);
    setWithdrawAmount("");
  };

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

        {/* 3 Summary Cards Row (Pendapatan, Pengeluaran, Laba Bersih) */}
        <View style={styles.topThreeRow}>
          {/* Card 1: Pendapatan */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Pendapatan</Text>
            <Text style={[styles.topStatVal, { color: "#0D7A53" }]}>
              Rp{"\n"}{totalPendapatan.toLocaleString("id-ID")}
            </Text>
          </View>

          {/* Card 2: Pengeluaran */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Estimasi Operasional</Text>
            <Text style={[styles.topStatVal, { color: "#DC2626" }]}>
              Rp{"\n"}{totalPengeluaran.toLocaleString("id-ID")}
            </Text>
          </View>

          {/* Card 3: Laba Bersih */}
          <View style={styles.topStatCard}>
            <Text style={styles.topStatTitle}>Laba Bersih</Text>
            <Text style={[styles.topStatVal, { color: "#0E6641" }]}>
              Rp{"\n"}{labaBersih.toLocaleString("id-ID")}
            </Text>
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
                            backgroundColor: totalPendapatan > 0 ? "#0E6641" : "#E5E7EB",
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

        {/* Laba Bersih Banner Card */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Saldo Siap Ditarik (Laba Bersih)</Text>
          <Text style={styles.incomeValue}>Rp {labaBersih.toLocaleString("id-ID")}</Text>

          <View style={styles.growthRow}>
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => setIsWithdrawModalOpen(true)}
              activeOpacity={0.85}
            >
              <Wallet size={16} color="#0E6641" />
              <Text style={styles.withdrawBtnText}>Tarik Dana ke Rekening</Text>
            </TouchableOpacity>
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
              const cost = ord.laundryCost || ord.totalAmount || 0;

              return (
                <View key={ord._id || ord.id || idx} style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]}>
                  <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
                    <ArrowUpRight size={18} color="#0D7A53" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{ord.serviceName || "Layanan Laundry"}</Text>
                    <Text style={styles.itemSub}>
                      {ord.customerName || "Customer"} • {ord.orderCode} • {dateStr}
                    </Text>
                  </View>
                  <Text style={styles.incomeText}>+ Rp {cost.toLocaleString("id-ID")}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Modal Tarik Dana */}
      <Modal visible={isWithdrawModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tarik Saldo Pendapatan</Text>
              <TouchableOpacity onPress={() => setIsWithdrawModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Saldo tersedia: <Text style={{ fontWeight: "800", color: "#0E6641" }}>Rp {labaBersih.toLocaleString("id-ID")}</Text>
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jumlah Penarikan (Rp)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: 100000"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank Tujuan</Text>
              <TextInput
                style={styles.textInput}
                placeholder="BCA / BRI / Mandiri / BNI"
                value={withdrawBank}
                onChangeText={setWithdrawBank}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Rekening</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nomor rekening tujuan transfer"
                keyboardType="numeric"
                value={withdrawAccountNo}
                onChangeText={setWithdrawAccountNo}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsWithdrawModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleWithdraw}
              >
                <Text style={styles.submitBtnText}>Ajukan Penarikan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
