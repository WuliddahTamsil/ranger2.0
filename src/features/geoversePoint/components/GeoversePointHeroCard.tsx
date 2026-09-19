import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react-native";
import { PointWalletUI } from "../types/pointTypes";
import { GEOVERSE_POINT_THEME } from "../constants/pointConstants";

interface GeoversePointHeroCardProps {
  wallet: PointWalletUI | null;
  pointToRupiah: (pts?: number | null) => number;
  formatPoint: (pts?: number | null) => string;
  formatRupiah: (amt?: number | null) => string;
  onViewLedger: () => void;
}

export const GeoversePointHeroCard: React.FC<GeoversePointHeroCardProps> = ({
  wallet,
  pointToRupiah,
  formatPoint,
  formatRupiah,
  onViewLedger,
}) => {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const balancePoints = wallet?.balancePoint || 0;
  const rupiahValue = pointToRupiah(balancePoints);

  return (
    <View style={styles.cardContainer}>
      {/* Decorative gradient / background accent */}
      <View style={styles.topAccentBar} />

      <View style={styles.innerCard}>
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
              SALDO GEOVERSE POINT
            </Text>
          </View>
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowBalance(!showBalance)}
            accessibilityLabel={showBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
            activeOpacity={0.7}
          >
            {showBalance ? (
              <Eye size={16} color="#475569" />
            ) : (
              <EyeOff size={16} color="#475569" />
            )}
            {!isCompact && (
              <Text style={styles.eyeText}>{showBalance ? "Sembunyikan" : "Tampilkan"}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Balance Display */}
        <View style={styles.balanceRow}>
          <Text style={[styles.pointsText, isCompact && styles.pointsTextCompact]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {showBalance ? formatPoint(balancePoints) : "••••••••"}
          </Text>
          {balancePoints > 0 && showBalance && (
            <View style={styles.sparkleChip}>
              <Sparkles size={13} color="#D97706" />
              <Text style={styles.sparkleChipText}>Aktif</Text>
            </View>
          )}
        </View>

        {/* Rupiah Equivalent */}
        <View style={styles.footerRow}>
          <View style={styles.rupiahContainer}>
            <Text style={styles.rupiahLabel} numberOfLines={1}>Estimasi nilai tukar:</Text>
            <Text style={styles.rupiahValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {showBalance ? formatRupiah(rupiahValue) : "Rp ••••••"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.ledgerBtn}
            onPress={onViewLedger}
            activeOpacity={0.8}
            accessibilityLabel="Lihat Mutasi Poin"
          >
            <Text style={styles.ledgerBtnText} numberOfLines={1}>Lihat Mutasi</Text>
            <ArrowRight size={14} color="#15803D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  topAccentBar: {
    height: 4,
    backgroundColor: GEOVERSE_POINT_THEME.primary,
  },
  innerCard: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badgeRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  eyeBtn: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  eyeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pointsText: {
    flexShrink: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  pointsTextCompact: {
    fontSize: 25,
  },
  sparkleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  sparkleChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B45309",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  rupiahContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    marginRight: 10,
  },
  rupiahLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  rupiahValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
    marginTop: 1,
  },
  ledgerBtn: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  ledgerBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
});
