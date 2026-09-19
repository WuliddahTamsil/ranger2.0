import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  ShoppingBag,
  Ticket,
  Banknote,
  Recycle,
} from "lucide-react-native";
import { PointLedgerUI } from "../types/pointTypes";

interface GeoversePointLedgerItemProps {
  item: PointLedgerUI;
  formatPoint: (pts?: number | null) => string;
}

export const GeoversePointLedgerItem: React.FC<GeoversePointLedgerItemProps> = ({
  item,
  formatPoint,
}) => {
  const isCredit = item.type === "EARN" || (item.type === "REVERSAL" && item.points > 0);
  const isPending = item.status === "PENDING";
  const isReversed = item.status === "REVERSED";

  const getSourceDetails = () => {
    switch (item.sourceType) {
      case "WASTE_DEPOSIT":
        return {
          title: "Setor Sampah",
          icon: Recycle,
          color: "#059669",
          bg: "#ECFDF5",
        };
      case "VOUCHER":
        return {
          title: "Tukar Voucher",
          icon: Ticket,
          color: "#D97706",
          bg: "#FEF3C7",
        };
      case "CASH_REDEMPTION":
        return {
          title: "Tarik Rupiah",
          icon: Banknote,
          color: "#0284C7",
          bg: "#E0F2FE",
        };
      case "KANYAAH_SHOP":
        return {
          title: "Belanja Kanyaah Shop",
          icon: ShoppingBag,
          color: "#15803D",
          bg: "#DCFCE7",
        };
      case "REVERSAL":
        return {
          title: "Pengembalian Poin",
          icon: RefreshCw,
          color: "#2563EB",
          bg: "#DBEAFE",
        };
      case "ADMIN":
        return {
          title: "Penyesuaian Admin",
          icon: Sliders,
          color: "#7C3AED",
          bg: "#F5F3FF",
        };
      default:
        return {
          title: item.notes || "Transaksi Poin",
          icon: isCredit ? ArrowDownLeft : ArrowUpRight,
          color: isCredit ? "#059669" : "#64748B",
          bg: isCredit ? "#ECFDF5" : "#F1F5F9",
        };
    }
  };

  const details = getSourceDetails();
  const IconComponent = details.icon;

  const dateFormatted = new Date(item.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: details.bg }]}>
        <IconComponent size={20} color={details.color} />
      </View>

      <View style={styles.mainInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {details.title}
          </Text>
          {isPending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>Menunggu</Text></View>}
          {isReversed && <View style={styles.reversedBadge}><Text style={styles.reversedText}>Dibatalkan</Text></View>}
        </View>

        {item.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{dateFormatted}</Text>
          <Text style={styles.balanceAfterText}>
            Sisa: {formatPoint(item.balanceAfter)}
          </Text>
        </View>
      </View>

      <View style={styles.pointsCol}>
        <Text
          style={[
            styles.pointsText,
            isCredit ? styles.creditPoints : styles.debitPoints,
            isReversed && styles.reversedPoints,
          ]}
        >
          {isCredit ? `+${formatPoint(item.points)}` : `-${formatPoint(item.points)}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B45309",
  },
  reversedBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reversedText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#DC2626",
  },
  notes: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  dateText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  balanceAfterText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  pointsCol: {
    alignItems: "flex-end",
    paddingLeft: 8,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: "700",
  },
  creditPoints: {
    color: "#15803D",
  },
  debitPoints: {
    color: "#475569",
  },
  reversedPoints: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
});
