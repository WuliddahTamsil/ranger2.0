import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Scale, Wind, PackageCheck, Leaf } from "lucide-react-native";
import { PointWalletUI } from "../types/pointTypes";

interface GeoversePointImpactCardProps {
  wallet: PointWalletUI | null;
}

export const GeoversePointImpactCard: React.FC<GeoversePointImpactCardProps> = ({ wallet }) => {
  const totalKg = Number(wallet?.totalKgDeposited || 0).toFixed(1);
  const totalCo2 = Number(wallet?.totalCo2ReductionKg || 0).toFixed(1);
  const depositCount = Number(wallet?.depositCount || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dampak Lingkungan Nyata</Text>
          <Text style={styles.subtitle}>Kontribusi nyata dari sampah yang berhasil didaur ulang</Text>
        </View>
        <View style={styles.ecoBadge}>
          <Leaf size={11} color="#059669" />
          <Text style={styles.ecoBadgeText}>ESG Verified</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
            <Scale size={16} color="#059669" />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>{totalKg} kg</Text>
          <Text style={styles.statLabel} numberOfLines={1}>Didaur Ulang</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: "#E0F2FE" }]}>
            <Wind size={16} color="#0284C7" />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>{totalCo2} kg</Text>
          <Text style={styles.statLabel} numberOfLines={1}>CO₂ Dicegah</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
            <PackageCheck size={16} color="#D97706" />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>{depositCount}x</Text>
          <Text style={styles.statLabel} numberOfLines={1}>Total Setoran</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  ecoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  ecoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
  },
});
