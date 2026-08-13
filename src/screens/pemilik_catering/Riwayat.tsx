import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { rp } from "../../utils/formatters";

export interface HistoryItem {
  id: string;
  customerName: string;
  itemSummary: string;
  total: number;
  time: string;
  status: "Selesai" | "Dibatalkan";
}

interface RiwayatProps {
  orders: any[]; // dynamic orders from parent
}

export const Riwayat: React.FC<RiwayatProps> = ({ orders }) => {
  const [filter, setFilter] = useState<"Semua" | "Selesai" | "Dibatalkan">("Semua");

  // 1. Flutter native mock data
  const mockHistory: HistoryItem[] = [
    {
      id: "CAT-2401",
      customerName: "Deni Kurniawan",
      itemSummary: "Box Nasi Timbel Komplit (10x)",
      total: 250000,
      time: "Hari ini, 08:30",
      status: "Selesai",
    },
    {
      id: "CAT-2399",
      customerName: "Ayu Lestari",
      itemSummary: "Nasi Tumpeng Mini (2x) & Es Jeruk (20x)",
      total: 460000,
      time: "Kemarin, 16:10",
      status: "Selesai",
    },
    {
      id: "CAT-2394",
      customerName: "Rizky Maulana",
      itemSummary: "Box Ayam Bakar Madu (30x)",
      total: 840000,
      time: "05 Agu, 11:30",
      status: "Dibatalkan",
    },
  ];

  // 2. Parse completed/cancelled orders from global state
  const completedOrCancelledOrders = orders
    .filter((o) => o.status === "Selesai" || o.status === "Dibatalkan")
    .map((o) => {
      const itemSummary = o.items
        .map((item: any) => `${item.name} (${item.quantity}x)`)
        .join(" & ");
      return {
        id: o.id,
        customerName: o.customer,
        itemSummary: itemSummary || "Menu Catering",
        total: o.total,
        time: `Hari ini, ${o.time}`,
        status: o.status as "Selesai" | "Dibatalkan",
      };
    });

  // Combine both sets of data
  const combinedHistory = [...completedOrCancelledOrders, ...mockHistory];

  // Filter based on active filter tab
  const visibleHistory = combinedHistory.filter(
    (item) => filter === "Semua" || item.status === filter
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Riwayat Transaksi</Text>
        <Text style={styles.subtitle}>Temukan pesanan catering selesai dan dibatalkan.</Text>

        {/* Filter Tab Row */}
        <View style={styles.filterRow}>
          {(["Semua", "Selesai", "Dibatalkan"] as const).map((tab) => {
            const isSelected = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterChip,
                  isSelected ? styles.filterChipSelected : styles.filterChipUnselected,
                ]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextSelected : styles.filterChipTextUnselected,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* History List */}
        <View style={styles.listContainer}>
          {visibleHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Tidak ada riwayat</Text>
              <Text style={styles.emptySubtitle}>Belum ada transaksi dengan status ini.</Text>
            </View>
          ) : (
            visibleHistory.map((item) => {
              const isCanceled = item.status === "Dibatalkan";
              const statusBg = isCanceled ? "#FEE2E2" : "#E8F5EE";
              const statusColor = isCanceled ? "#B91C1C" : "#1B7A4E";

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardId}>#{item.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.itemSummary}>{item.itemSummary}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.totalPrice}>{rp(item.total)}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                </View>
              );
            })
          )}
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
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  filterChipUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
  },
  filterChipTextUnselected: {
    color: "#374151",
  },
  listContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  itemSummary: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 14,
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
