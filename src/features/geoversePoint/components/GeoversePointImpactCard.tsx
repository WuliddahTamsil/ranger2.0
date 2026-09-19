import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Scale, Wind, PackageCheck } from "lucide-react-native";
import { PointWalletUI } from "../types/pointTypes";

interface GeoversePointImpactCardProps {
  wallet: PointWalletUI | null;
}

export const GeoversePointImpactCard: React.FC<GeoversePointImpactCardProps> = ({ wallet }) => {
  const totalKg = (wallet?.totalKgDeposited || 0).toFixed(1);
  const totalCo2 = (wallet?.totalCo2ReductionKg || 0).toFixed(1);
  const depositCount = wallet?.depositCount || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dampak Lingkungan Anda</Text>
        <Text style={styles.subtitle}>Kontribusi nyata dari sampah yang berhasil didaur ulang</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
            <Scale size={18} color="#059669" />
          </View>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{totalKg} kg</Text>
          <Text style={styles.statLabel} numberOfLines={2}>Sampah Daur Ulang</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: "#E0F2FE" }]}>
            <Wind size={18} color="#0284C7" />
          </View>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{totalCo2} kg</Text>
          <Text style={styles.statLabel} numberOfLines={2}>Reduksi Emisi CO₂</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
            <PackageCheck size={18} color="#D97706" />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>{depositCount}</Text>
          <Text style={styles.statLabel} numberOfLines={2}>Total Setoran</Text>
        </View>
      </View>
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
    marginBottom: 12,
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
  },
});
