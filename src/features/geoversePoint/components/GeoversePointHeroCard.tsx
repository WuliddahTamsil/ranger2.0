import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from "react-native";
import { Eye, EyeOff, ArrowRight, Sparkles, ShieldCheck } from "lucide-react-native";
import { PointWalletUI } from "../types/pointTypes";
import { formatNumberSafe } from "../../../utils/formatters";

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
  formatRupiah,
  onViewLedger,
}) => {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const balancePoints = Number(wallet?.balancePoint) || 0;
  const rupiahValue = pointToRupiah(balancePoints);

  return (
    <View style={styles.cardContainer}>
      {/* Decorative ambient background rings */}
      <View style={styles.ambientCircleOne} />
      <View style={styles.ambientCircleTwo} />

      <View style={styles.innerCard}>
        {/* Top Meta Row */}
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <Image
              source={require("../../../../assets/kanyaah-point.png")}
              style={{ width: 16, height: 16, borderRadius: 4 }}
              resizeMode="cover"
            />
            <Text style={styles.badgeText} numberOfLines={1}>
              DOMPET GEOVERSE POINT
            </Text>
          </View>

          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowBalance(!showBalance)}
            accessibilityLabel={showBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
            activeOpacity={0.75}
          >
            {showBalance ? (
              <Eye size={14} color="#E2E8F0" />
            ) : (
              <EyeOff size={14} color="#E2E8F0" />
            )}
            {!isCompact && (
              <Text style={styles.eyeText}>{showBalance ? "Sembunyikan" : "Tampilkan"}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Balance Display Row */}
        <View style={styles.balanceRow}>
          <Text
            style={[styles.pointsText, isCompact && styles.pointsTextCompact]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {showBalance ? formatNumberSafe(balancePoints) : "••••••••"}
          </Text>
          <Text style={styles.pointsUnitText}>Pts</Text>

          {showBalance && (
            <View style={styles.verifiedChip}>
              <ShieldCheck size={11} color="#34D399" />
              <Text style={styles.verifiedChipText}>Aktif</Text>
            </View>
          )}
        </View>

        {/* Bottom Conversion & Action Row */}
        <View style={styles.footerRow}>
          <View style={styles.rupiahContainer}>
            <Text style={styles.rupiahLabel}>Estimasi Nilai Tukar:</Text>
            <Text style={styles.rupiahValue} numberOfLines={1}>
              {showBalance ? formatRupiah(rupiahValue) : "Rp ••••••"}
              <Text style={styles.rateNote}> • 1 Pts = Rp 1</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.ledgerBtn}
            onPress={onViewLedger}
            activeOpacity={0.82}
            accessibilityLabel="Lihat Mutasi Poin"
          >
            <Text style={styles.ledgerBtnText}>Mutasi</Text>
            <ArrowRight size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#062E20",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.22)",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#062E20",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 16,
  },
  ambientCircleOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    top: -70,
    right: -50,
  },
  ambientCircleTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    bottom: -40,
    left: 20,
  },
  innerCard: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FBBF24",
    letterSpacing: 0.6,
  },
  eyeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  eyeText: {
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 16,
  },
  pointsText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  pointsTextCompact: {
    fontSize: 28,
  },
  pointsUnitText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A7F3D0",
  },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
    marginLeft: 4,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#34D399",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
  },
  rupiahContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  rupiahLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 2,
  },
  rupiahValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  rateNote: {
    fontSize: 11,
    fontWeight: "400",
    color: "#64748B",
  },
  ledgerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  ledgerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
