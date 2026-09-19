import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ticket, Sparkles, CheckCircle2 } from "lucide-react-native";
import { PointVoucherUI } from "../types/pointTypes";

interface GeoversePointVoucherCardProps {
  voucher: PointVoucherUI;
  canRedeem: boolean;
  onRedeem: (voucher: PointVoucherUI) => void;
  formatPoint: (pts?: number | null) => string;
}

export const GeoversePointVoucherCard: React.FC<GeoversePointVoucherCardProps> = ({
  voucher,
  canRedeem,
  onRedeem,
  formatPoint,
}) => {
  const isClaimed = voucher.isClaimedByUser;

  const getServiceBadge = (svc: string) => {
    switch (svc) {
      case "MARKETPLACE":
        return { label: "Kanyaah Mart", bg: "#E8F5EE", text: "#15803D" };
      case "KANYAAH_SHOP":
      case "SHOP":
        return { label: "Kanyaah Shop", bg: "#E8F5EE", text: "#15803D" };
      case "RIDE":
        return { label: "Kanyaah Ride", bg: "#DCFCE7", text: "#15803D" };
      case "SEND":
        return { label: "Kanyaah Send", bg: "#FEF3C7", text: "#B45309" };
      case "CATERING":
        return { label: "Catering", bg: "#FFEDD5", text: "#EA580C" };
      case "LAUNDRY":
        return { label: "Laundry", bg: "#E0F2FE", text: "#0284C7" };
      default:
        return { label: "Semua Layanan", bg: "#F1F5F9", text: "#475569" };
    }
  };

  const badge = getServiceBadge(voucher.service);

  return (
    <View style={styles.card}>
      <View style={styles.leftAccent} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
          <Text style={styles.pointsCost} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatPoint(voucher.pointsCost)}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {voucher.title}
        </Text>
        <Text style={styles.discountDesc} numberOfLines={2}>
          Potongan {voucher.discountType === "FIXED" ? `Rp ${voucher.discountValue.toLocaleString("id-ID")}` : `${voucher.discountValue}%`}
          {voucher.minTransaction > 0 ? ` · Min. Belanja Rp ${voucher.minTransaction.toLocaleString("id-ID")}` : ""}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.expiryText} numberOfLines={2}>
            Berlaku s/d {new Date(voucher.validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </Text>

          {isClaimed ? (
            <View style={styles.claimedBadge}>
              <CheckCircle2 size={13} color="#059669" />
              <Text style={styles.claimedText}>Sudah Diklaim</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.redeemBtn,
                !canRedeem && styles.redeemBtnDisabled,
              ]}
              disabled={!canRedeem}
              onPress={() => onRedeem(voucher)}
              activeOpacity={0.8}
            >
              <Text style={[styles.redeemBtnText, !canRedeem && styles.redeemBtnTextDisabled]}>
                Tukar Poin
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  leftAccent: {
    width: 6,
    backgroundColor: "#F59E0B",
  },
  content: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    maxWidth: "68%",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  pointsCost: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  discountDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  expiryText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    fontSize: 10,
    color: "#94A3B8",
  },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  claimedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  redeemBtn: {
    backgroundColor: "#15803D",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  redeemBtnDisabled: {
    backgroundColor: "#F1F5F9",
  },
  redeemBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  redeemBtnTextDisabled: {
    color: "#94A3B8",
  },
});
