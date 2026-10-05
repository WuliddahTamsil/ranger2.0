import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import {
  TrendingUp,
  CalendarDays,
  CalendarRange,
  Calendar,
  CheckCircle,
  ChevronDown,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";

interface PendapatanProps {
  orders: any[];
}

const getCompletedDate = (order: any) => {
  const value = order.completedAt || order.updatedAt || order.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sumOrders = (orders: any[], predicate: (date: Date) => boolean) => orders.reduce((sum, order) => {
  const date = getCompletedDate(order);
  return date && predicate(date) ? sum + Number(order.driverShare || 0) : sum;
}, 0);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date: Date) => {
  const start = startOfDay(date);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
};

export const Pendapatan: React.FC<PendapatanProps> = ({ orders }) => {
  const [period, setPeriod] = useState<"Hari" | "Minggu" | "Bulan">("Hari");
  const [periodDropdownVisible, setPeriodDropdownVisible] = useState(false);

  // Calculate order metrics
  const completedOrders = orders.filter((o) => o.status === "Selesai");
  const completedCount = completedOrders.length;

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const countOrders = (predicate: (date: Date) => boolean) => completedOrders.filter((order) => {
    const date = getCompletedDate(order);
    return date ? predicate(date) : false;
  }).length;

  const todayRevenue = sumOrders(completedOrders, (date) => startOfDay(date).getTime() === todayStart);
  const todayCount = countOrders((date) => startOfDay(date).getTime() === todayStart);

  const weekRevenue = sumOrders(completedOrders, (date) => date.getTime() >= weekStart);
  const weekCount = countOrders((date) => date.getTime() >= weekStart);

  const monthRevenue = sumOrders(completedOrders, (date) => date.getTime() >= monthStart);
  const monthCount = countOrders((date) => date.getTime() >= monthStart);

  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.driverShare || 0), 0);

  const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const currentWeekStart = startOfWeek(now);
  const dailyChart = dayLabels.map((label, index) => {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + index);
    const dayTime = startOfDay(day).getTime();
    return { label, value: sumOrders(completedOrders, (date) => startOfDay(date).getTime() === dayTime) };
  });

  const weeklyChart = Array.from({ length: 4 }, (_, index) => {
    const periodStart = new Date(currentWeekStart);
    periodStart.setDate(periodStart.getDate() - (3 - index) * 7);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
    return { label: `M${index + 1}`, value: sumOrders(completedOrders, (date) => date >= periodStart && date < periodEnd) };
  });

  const monthlyChart = Array.from({ length: 3 }, (_, index) => {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - (2 - index), 1);
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
    return { label: periodStart.toLocaleDateString("id-ID", { month: "short" }), value: sumOrders(completedOrders, (date) => date >= periodStart && date < periodEnd) };
  });

  const chartData = { "Hari": dailyChart, "Minggu": weeklyChart, "Bulan": monthlyChart };

  const currentChartPoints = chartData[period];
  const maxChartValue = Math.max(...currentChartPoints.map((p) => p.value), 1);
  const hasChartData = currentChartPoints.some((p) => p.value > 0);

  const formatBarVal = (val: number) => {
    if (!val || val <= 0) return "0";
    if (val >= 1000) {
      const k = val / 1000;
      return k % 1 === 0 ? `${k}rb` : `${k.toFixed(1).replace(".", ",")}rb`;
    }
    return `${val}`;
  };

  const serviceStats = [
    { type: "Kanyaah Ride", color: "#1B7A4E" },
    { type: "Marketplace", color: "#2563EB" },
    { type: "Kanyaah Send", color: "#EA580C" },
    { type: "Catering", color: "#D97706" },
    { type: "Laundry", color: "#7C3AED" },
  ].map((srv) => {
    const srvOrders = completedOrders.filter((o) => o.type === srv.type);
    const count = srvOrders.length;
    const revenue = srvOrders.reduce((sum, o) => sum + Number(o.driverShare || 0), 0);
    return { ...srv, count, revenue };
  }).filter((srv) => srv.count > 0);

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Performa Pendapatan</Text>
        <Text style={styles.subtitle}>Pantau penghasilan dari order yang sudah selesai.</Text>

        {/* Today Summary Banner */}
        <View style={styles.revenueBanner}>
          <Text style={styles.revenueBannerLabel}>PENDAPATAN DRIVER HARI INI</Text>
          <Text style={styles.revenueBannerValue}>
            {todayRevenue > 0 ? rp(todayRevenue) : "Rp 0"}
          </Text>
          <Text style={styles.revenueBannerSub}>
            {todayCount > 0
              ? `${todayCount} order selesai diselesaikan hari ini.`
              : "Belum ada order yang diselesaikan hari ini."}
          </Text>
        </View>

        {/* Ringkasan Grid Cards */}
        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <CalendarDays size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Hari Ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {rp(todayRevenue)}
            </Text>
            <Text style={styles.gridSubText}>{todayCount} Order</Text>
          </View>
          <View style={styles.gridCard}>
            <CalendarRange size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Minggu Ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {rp(weekRevenue)}
            </Text>
            <Text style={styles.gridSubText}>{weekCount} Order</Text>
          </View>
          <View style={styles.gridCard}>
            <Calendar size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Bulan Ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {rp(monthRevenue)}
            </Text>
            <Text style={styles.gridSubText}>{monthCount} Order</Text>
          </View>
          <View style={styles.gridCard}>
            <CheckCircle size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Total Selesai</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {rp(totalRevenue)}
            </Text>
            <Text style={styles.gridSubText}>{completedCount} Order</Text>
          </View>
        </View>

        {/* Section chart header */}
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Grafik Penghasilan</Text>
          
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setPeriodDropdownVisible(!periodDropdownVisible)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownBtnText}>{period}</Text>
            <ChevronDown size={14} color="#374151" />
          </TouchableOpacity>
        </View>

        {periodDropdownVisible && (
          <View style={styles.dropdownMenu}>
            {(["Hari", "Minggu", "Bulan"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownOption}
                onPress={() => {
                  setPeriod(opt);
                  setPeriodDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bar Chart View */}
        <View style={styles.chartContainer}>
          {hasChartData ? (
            <View style={styles.chartBarsRow}>
              {currentChartPoints.map((pt, idx) => {
                const heightPercent = `${Math.max(5, (pt.value / maxChartValue) * 100)}%`;
                return (
                  <View key={idx} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: heightPercent as any }]} />
                    </View>
                    <Text style={styles.barLabel}>{pt.label}</Text>
                    <Text style={styles.barValText} numberOfLines={1}>
                      {formatBarVal(pt.value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <TrendingUp size={28} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Belum ada data penghasilan terhitung</Text>
            </View>
          )}
        </View>

        {/* Rincian Berdasarkan Layanan */}
        {serviceStats.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownCardTitle}>Rincian Penghasilan Per Layanan</Text>
            <View style={styles.breakdownList}>
              {serviceStats.map((item) => (
                <View key={item.type} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.serviceDot, { backgroundColor: item.color }]} />
                    <View>
                      <Text style={styles.serviceName}>{item.type}</Text>
                      <Text style={styles.serviceCount}>{item.count} order selesai</Text>
                    </View>
                  </View>
                  <Text style={styles.serviceRevenue}>{rp(item.revenue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Extra info cards */}
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Performa & Bonus Driver</Text>
          <Text style={styles.insightText}>
            Data pendapatan di halaman ini dihitung secara transparan dan otomatis dari order yang telah Anda selesaikan.
          </Text>
          <Text style={[styles.insightText, { color: "#6B7280", marginTop: 8 }]}>
            Saldo hasil pesanan langsung tersedia dan dapat ditarik melalui menu Keuangan.
          </Text>
        </View>
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },
  revenueBanner: {
    backgroundColor: "#1B7A4E",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  revenueBannerLabel: {
    color: "#E8F5EE",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  revenueBannerValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 8,
  },
  revenueBannerSub: {
    fontSize: 12,
    color: "#E8F5EE",
    marginTop: 8,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    width: "48%",
    aspectRatio: 1.4,
    justifyContent: "center",
    gap: 4,
  },
  gridLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  gridVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  gridSubText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
    zIndex: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  dropdownMenu: {
    position: "absolute",
    top: 280,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: 100,
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  dropdownOption: {
    padding: 10,
    alignItems: "center",
  },
  dropdownOptionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 220,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 12,
    marginBottom: 20,
  },
  chartBarsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  barCol: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    height: 120,
    width: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#1B7A4E",
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "600",
  },
  barValText: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
    marginTop: 2,
  },
  emptyChart: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyChartText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  insightText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    lineHeight: 18,
  },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  breakdownCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  serviceCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  serviceRevenue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
});
