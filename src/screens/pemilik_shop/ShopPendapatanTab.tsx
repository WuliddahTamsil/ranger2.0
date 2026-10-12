import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import {
  TrendingUp,
  ShoppingBag,
  Award,
  Calendar,
  PackageCheck,
  ChevronRight,
  ArrowUpRight,
  Boxes,
} from "lucide-react-native";
import { rp, normalizeImageUrl } from "../../utils/formatters";
import { ShopProduct } from "../../services/shopService";

interface ShopPendapatanTabProps {
  orders: any[];
  products: ShopProduct[];
  storeName?: string;
  onNavigateToOrders?: () => void;
}

export const ShopPendapatanTab: React.FC<ShopPendapatanTabProps> = ({
  orders,
  products,
  storeName,
  onNavigateToOrders,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "TODAY" | "7DAYS" | "30DAYS" | "MONTH"
  >("7DAYS");

  const now = new Date();

  // Filter orders by period & completed status
  const completedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderStatus === "COMPLETED" || o.orderStatus === "DELIVERED"
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return completedOrders.filter((o) => {
      const orderDate = new Date(o.createdAt || Date.now());
      if (selectedPeriod === "TODAY") {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (selectedPeriod === "7DAYS") {
        const diffDays =
          (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (selectedPeriod === "30DAYS") {
        const diffDays =
          (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (selectedPeriod === "MONTH") {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [completedOrders, selectedPeriod, now]);

  // Total Omset for the selected period
  const totalOmset = useMemo(() => {
    return filteredOrders.reduce((acc, o) => {
      const amt = Number(o.subtotal || o.totalAmount || o.totalPrice || 0);
      return acc + amt;
    }, 0);
  }, [filteredOrders]);

  // Average Order Value
  const aov = useMemo(() => {
    if (filteredOrders.length === 0) return 0;
    return Math.round(totalOmset / filteredOrders.length);
  }, [totalOmset, filteredOrders]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        const cat = it.category || "Umum";
        const val = Number(it.priceSnapshot * it.quantity || it.subtotal || 0);
        map[cat] = (map[cat] || 0) + val;
      });
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5);
  }, [filteredOrders]);

  // Top products
  const topProducts = useMemo(() => {
    // If orders have item data, calculate from orders
    const map: Record<string, { name: string; qty: number; revenue: number; img?: string }> =
      {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        const name = it.productNameSnapshot || it.name || "Produk";
        const qty = Number(it.quantity || 1);
        const rev = Number(it.priceSnapshot * qty || it.subtotal || 0);
        if (!map[name]) {
          map[name] = { name, qty: 0, revenue: 0, img: it.productImageSnapshot };
        }
        map[name].qty += qty;
        map[name].revenue += rev;
      });
    });

    const list = Object.values(map).sort((a, b) => b.qty - a.qty);
    if (list.length > 0) return list.slice(0, 5);

    // Fallback to product catalog sorted by sold
    return [...products]
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        qty: p.sold || 0,
        revenue: (p.sold || 0) * p.price,
        img: p.img || (p.images ? p.images[0] : undefined),
      }));
  }, [filteredOrders, products]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Performa Pendapatan</Text>
          <Text style={styles.headerSub}>
            Laporan omset dan analitik penjualan {storeName || "Kanyaah Shop"}
          </Text>
        </View>
        <View style={styles.growthBadge}>
          <TrendingUp size={14} color="#0D7A53" />
          <Text style={styles.growthBadgeText}>Live Analytics</Text>
        </View>
      </View>

      {/* Period Selector Tabs */}
      <View style={styles.periodRow}>
        {(
          [
            { key: "TODAY", label: "Hari Ini" },
            { key: "7DAYS", label: "7 Hari" },
            { key: "30DAYS", label: "30 Hari" },
            { key: "MONTH", label: "Bulan Ini" },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.periodBtn,
              selectedPeriod === tab.key && styles.periodBtnActive,
            ]}
            onPress={() => setSelectedPeriod(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodBtnText,
                selectedPeriod === tab.key && styles.periodBtnTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Revenue Banner Card */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueCardTop}>
          <Text style={styles.revenueCardLabel}>TOTAL OMSET PENJUALAN</Text>
          <View style={styles.revenueCardPeriodPill}>
            <Calendar size={11} color="#E8F5EE" />
            <Text style={styles.revenueCardPeriodText}>
              {selectedPeriod === "TODAY"
                ? "Hari Ini"
                : selectedPeriod === "7DAYS"
                ? "7 Hari Terakhir"
                : selectedPeriod === "30DAYS"
                ? "30 Hari Terakhir"
                : "Bulan Ini"}
            </Text>
          </View>
        </View>

        <Text style={styles.revenueValue}>{rp(totalOmset)}</Text>
        <Text style={styles.revenueSub}>
          Dari {filteredOrders.length} transaksi selesai
        </Text>

        <View style={styles.revenueStatsRow}>
          <View style={styles.revenueStatCol}>
            <Text style={styles.revenueStatLabel}>Order Berhasil</Text>
            <Text style={styles.revenueStatValue}>{filteredOrders.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.revenueStatCol}>
            <Text style={styles.revenueStatLabel}>Rata-rata Order (AOV)</Text>
            <Text style={styles.revenueStatValue}>{rp(aov)}</Text>
          </View>
        </View>
      </View>

      {/* 2 Quick Metric Cards */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={[styles.metricIconBg, { backgroundColor: "#EFF6FF" }]}>
            <ShoppingBag size={18} color="#2563EB" />
          </View>
          <Text style={styles.metricCardVal}>{completedOrders.length}</Text>
          <Text style={styles.metricCardLabel}>Total Transaksi Selesai</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconBg, { backgroundColor: "#ECFDF5" }]}>
            <PackageCheck size={18} color="#0D7A53" />
          </View>
          <Text style={styles.metricCardVal}>{products.length}</Text>
          <Text style={styles.metricCardLabel}>Katalog Produk Aktif</Text>
        </View>
      </View>

      {/* Category Contribution Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Penjualan per Kategori</Text>
        <Text style={styles.sectionSub}>Kontribusi omset dari masing-masing kategori</Text>

        {categoryStats.length === 0 ? (
          <View style={styles.emptyNotice}>
            <Boxes size={28} color="#CBD5E1" />
            <Text style={styles.emptyNoticeText}>
              Belum ada data penjualan pada periode ini
            </Text>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categoryStats.map(([cat, val], idx) => {
              const pct = totalOmset > 0 ? Math.round((val / totalOmset) * 100) : 0;
              const barColors = [
                "#0D7A53",
                "#2563EB",
                "#D97706",
                "#7C3AED",
                "#059669",
              ];
              const color = barColors[idx % barColors.length];
              return (
                <View key={cat} style={styles.categoryRow}>
                  <View style={styles.categoryTextRow}>
                    <Text style={styles.categoryName}>{cat}</Text>
                    <Text style={styles.categoryAmount}>
                      {rp(val)} ({pct}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${pct}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Top 5 Best Sellers */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Produk Terlaris</Text>
            <Text style={styles.sectionSub}>Paling sering dibeli oleh pelanggan</Text>
          </View>
          <Award size={20} color="#D97706" />
        </View>

        {topProducts.length === 0 ? (
          <View style={styles.emptyNotice}>
            <Award size={28} color="#CBD5E1" />
            <Text style={styles.emptyNoticeText}>Belum ada data penjualan produk</Text>
          </View>
        ) : (
          <View style={styles.topProductsList}>
            {topProducts.map((p, idx) => (
              <View key={idx} style={styles.topProductRow}>
                <View
                  style={[
                    styles.rankBadge,
                    idx === 0
                      ? styles.rankGold
                      : idx === 1
                      ? styles.rankSilver
                      : idx === 2
                      ? styles.rankBronze
                      : styles.rankDefault,
                  ]}
                >
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>

                {p.img ? (
                  <Image
                    source={{ uri: normalizeImageUrl(p.img) }}
                    style={styles.topProductThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.topProductThumbPlaceholder}>
                    <ShoppingBag size={14} color="#94A3B8" />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.topProductName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.topProductQty}>{p.qty} pcs terjual</Text>
                </View>

                <Text style={styles.topProductRevenue}>{rp(p.revenue)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent Completed Orders */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Riwayat Transaksi Terbaru</Text>
          {onNavigateToOrders && (
            <TouchableOpacity onPress={onNavigateToOrders}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {completedOrders.length === 0 ? (
          <View style={styles.emptyNotice}>
            <ShoppingBag size={28} color="#CBD5E1" />
            <Text style={styles.emptyNoticeText}>
              Belum ada pesanan yang terselesaikan
            </Text>
          </View>
        ) : (
          <View style={styles.recentOrdersList}>
            {completedOrders.slice(0, 5).map((order) => (
              <View key={order._id} style={styles.recentOrderRow}>
                <View style={styles.recentOrderIcon}>
                  <PackageCheck size={16} color="#0D7A53" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentOrderCode}>
                    #{order.orderCode || order._id.slice(-6).toUpperCase()}
                  </Text>
                  <Text style={styles.recentOrderDate}>
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <Text style={styles.recentOrderAmount}>
                  {rp(order.totalAmount || order.totalPrice || 0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 85,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
  },
  periodRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  periodBtnTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
  revenueCard: {
    backgroundColor: "#0D7A53",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  revenueCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revenueCardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.5,
  },
  revenueCardPeriodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  revenueCardPeriodText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 8,
  },
  revenueSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    marginBottom: 14,
  },
  revenueStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  revenueStatCol: {
    flex: 1,
  },
  revenueStatLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
  },
  revenueStatValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricCardVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  metricCardLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  emptyNotice: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyNoticeText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
  },
  categoryList: {
    marginTop: 12,
    gap: 10,
  },
  categoryRow: {
    gap: 4,
  },
  categoryTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  categoryAmount: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  topProductsList: {
    marginTop: 8,
    gap: 8,
  },
  topProductRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  rankGold: { backgroundColor: "#FEF3C7" },
  rankSilver: { backgroundColor: "#E2E8F0" },
  rankBronze: { backgroundColor: "#FFEDD5" },
  rankDefault: { backgroundColor: "#F1F5F9" },
  rankText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F172A",
  },
  topProductThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  topProductThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topProductName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  topProductQty: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  topProductRevenue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  recentOrdersList: {
    marginTop: 4,
    gap: 8,
  },
  recentOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  recentOrderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  recentOrderCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  recentOrderDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },
  recentOrderAmount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },
});
