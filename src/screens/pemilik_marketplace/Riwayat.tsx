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

  // Default hardcoded history from Dart
  const defaultHistory: HistoryItem[] = [
    {
      id: "MKT-2401",
      customerName: "Deni Kurniawan",
      itemSummary: "Nasi Timbel Komplit (2x)",
      total: 50000,
      time: "Hari ini, 08:30",
      status: "Selesai",
    },
    {
      id: "MKT-2399",
      customerName: "Ayu Lestari",
      itemSummary: "Es Jeruk Peras (3x)",
      total: 24000,
      time: "Kemarin, 16:10",
      status: "Selesai",
    },
    {
      id: "MKT-2394",
      customerName: "Rizky Maulana",
      itemSummary: "Ayam Bakar Madu",
      total: 28000,
      time: "05 Agu, 11:30",
      status: "Dibatalkan",
    },
  ];

  // Convert parent orders that are completed or cancelled to history format
  const dynamicHistory: HistoryItem[] = orders
    .filter((o) => o.status === "Selesai" || o.status === "Dibatalkan")
    .map((o) => ({
      id: o.id,
      customerName: o.customer,
      itemSummary: o.items.map((i: any) => `${i.name} (${i.quantity}x)`).join(", "),
      total: o.total,
      time: `Hari ini, ${o.time}`,
      status: o.status as "Selesai" | "Dibatalkan",
    }));

  // Combine both, avoiding duplicates (if any ID matches)
  const combinedHistory = [...dynamicHistory, ...defaultHistory].filter(
    (item, index, self) => self.findIndex((t) => t.id === item.id) === index
  );

  const visibleHistory = combinedHistory.filter(
    (item) => filter === "Semua" || item.status === filter
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Riwayat Transaksi</Text>
        <Text style={styles.subtitle}>Temukan pesanan selesai dan dibatalkan.</Text>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {(["Semua", "Selesai", "Dibatalkan"] as const).map((opt) => {
            const selected = filter === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipUnselected,
                ]}
                onPress={() => setFilter(opt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected ? styles.chipTextSelected : styles.chipTextUnselected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* History Cards */}
        <View style={styles.listContainer}>
          {visibleHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Tidak ada riwayat untuk filter ini</Text>
            </View>
          ) : (
            visibleHistory.map((item) => {
              const isCanceled = item.status === "Dibatalkan";
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardId}>#{item.id}</Text>
                    <Text
                      style={[
                        styles.statusText,
                        isCanceled ? styles.statusCanceled : styles.statusSuccess,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.itemSummary}>{item.itemSummary}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.totalText}>{rp(item.total)}</Text>
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
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  chipUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  chipTextUnselected: {
    color: "#111827",
  },
  listContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  cardId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusSuccess: {
    color: "#15803D",
  },
  statusCanceled: {
    color: "#B91C1C",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  itemSummary: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  timeText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
  },
});
