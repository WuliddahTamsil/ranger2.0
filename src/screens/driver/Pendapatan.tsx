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

export const Pendapatan: React.FC<PendapatanProps> = ({ orders }) => {
  const [period, setPeriod] = useState<"Hari" | "Minggu" | "Bulan">("Hari");
  const [periodDropdownVisible, setPeriodDropdownVisible] = useState(false);

  // Calculate order metrics
  const completedOrders = orders.filter((o) => o.status === "Selesai");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.driverShare, 0);
  const completedCount = completedOrders.length;

  const todayRevenue = totalRevenue;
  const weekRevenue = totalRevenue * 5;
  const monthRevenue = totalRevenue * 22;

  // Chart data based on selected filter
  const chartData = {
    "Hari": [
      { label: "Sen", value: Math.round(totalRevenue * 0.4) },
      { label: "Sel", value: Math.round(totalRevenue * 0.8) },
      { label: "Rab", value: Math.round(totalRevenue * 0.5) },
      { label: "Kam", value: Math.round(totalRevenue * 1.1) },
      { label: "Jum", value: Math.round(totalRevenue * 0.7) },
      { label: "Sab", value: Math.round(totalRevenue * 1.3) },
      { label: "Min", value: Math.round(totalRevenue * 0.6) },
    ],
    "Minggu": [
      { label: "Minggu 1", value: Math.round(totalRevenue * 3.5) },
      { label: "Minggu 2", value: Math.round(totalRevenue * 4.2) },
      { label: "Minggu 3", value: Math.round(totalRevenue * 5.0) },
      { label: "Minggu 4", value: Math.round(totalRevenue * 4.8) },
    ],
    "Bulan": [
      { label: "Mei", value: Math.round(totalRevenue * 18.0) },
      { label: "Jun", value: Math.round(totalRevenue * 21.0) },
      { label: "Jul", value: Math.round(totalRevenue * 24.0) },
    ],
  };

  const currentChartPoints = chartData[period];
  const maxChartValue = Math.max(...currentChartPoints.map((p) => p.value), 1);
  const hasChartData = currentChartPoints.some((p) => p.value > 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Performa Pendapatan</Text>
        <Text style={styles.subtitle}>Pantau performa penghasilan dan bonus Anda sebagai Driver.</Text>

        {/* Today Summary Banner */}
        <View style={styles.revenueBanner}>
          <Text style={styles.revenueBannerLabel}>PENDAPATAN DRIVER HARI INI</Text>
          <Text style={styles.revenueBannerValue}>
            {todayRevenue > 0 ? rp(todayRevenue) : "Rp0"}
          </Text>
          <Text style={styles.revenueBannerSub}>
            {completedCount} order selesai diselesaikan hari ini.
          </Text>
        </View>

        {/* Ringkasan Grid Cards */}
        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <CalendarDays size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Hari Ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {todayRevenue > 0 ? rp(todayRevenue) : "—"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <CalendarRange size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Minggu Ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {todayRevenue > 0 ? rp(weekRevenue) : "—"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <Calendar size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Bulan Ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {todayRevenue > 0 ? rp(monthRevenue) : "—"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <CheckCircle size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Total Selesai</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {completedCount > 0 ? `${completedCount} Order` : "Belum ada"}
            </Text>
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
                      {pt.value > 1000 ? `${Math.round(pt.value / 1000)}rb` : pt.value}
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

        {/* Extra info cards */}
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Performa & Bonus Driver</Text>
          <Text style={styles.insightText}>
            Skema poin bonus harian saat ini aktif. Selesaikan minimal 5 order per hari dengan rating di atas 4.8 untuk mendapatkan bonus tambahan Rp50.000.
          </Text>
          <Text style={[styles.insightText, { color: "#6B7280", marginTop: 8 }]}>
            Informasi bonus akan langsung dicairkan ke Dompet Keuangan Anda setelah masa perhitungan harian selesai.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
});
