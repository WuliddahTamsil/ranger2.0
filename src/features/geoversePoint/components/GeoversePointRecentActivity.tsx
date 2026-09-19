import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Clock, ArrowRight, Sparkles } from "lucide-react-native";
import { PointLedgerUI } from "../types/pointTypes";
import { GeoversePointLedgerItem } from "./GeoversePointLedgerItem";

interface GeoversePointRecentActivityProps {
  ledger: PointLedgerUI[];
  loading: boolean;
  formatPoint: (pts?: number | null) => string;
  onViewAll: () => void;
  onEarnFirstPoint: () => void;
}

export const GeoversePointRecentActivity: React.FC<GeoversePointRecentActivityProps> = ({
  ledger,
  loading,
  formatPoint,
  onViewAll,
  onEarnFirstPoint,
}) => {
  const recentItems = ledger.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Clock size={16} color="#15803D" />
          <Text style={styles.title}>Aktivitas Terbaru</Text>
        </View>
        {ledger.length > 0 && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>Lihat Semua</Text>
            <ArrowRight size={13} color="#15803D" />
          </TouchableOpacity>
        )}
      </View>

      {recentItems.length > 0 ? (
        <View style={styles.list}>
          {recentItems.map((item) => (
            <GeoversePointLedgerItem
              key={item._id || item.ledgerId}
              item={item}
              formatPoint={formatPoint}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBg}>
            <Sparkles size={24} color="#15803D" />
          </View>
          <Text style={styles.emptyTitle}>Belum ada aktivitas poin</Text>
          <Text style={styles.emptySubtitle}>
            Setor sampah anorganik pertamamu untuk mulai mengumpulkan GEOVERSE Point!
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={onEarnFirstPoint}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCtaText}>Mulai Setor Sampah</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  list: {
    flexDirection: "column",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
  },
  emptyCta: {
    backgroundColor: "#15803D",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyCtaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
