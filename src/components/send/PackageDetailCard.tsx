import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { Package, ShieldAlert, AlertCircle } from "lucide-react-native";
import { SendPackageData } from "../../types";
import { rp } from "../../utils/formatters";

interface PackageDetailCardProps {
  packageData: SendPackageData;
}

export const PackageDetailCard: React.FC<PackageDetailCardProps> = ({ packageData }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Package size={18} color="#15803D" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{packageData.name || "Nama Barang"}</Text>
          <Text style={styles.categoryBadge}>{packageData.category}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Berat</Text>
          <Text style={styles.val}>{packageData.weightKg} kg</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.label}>Dimensi</Text>
          <Text style={styles.val}>
            {packageData.lengthCm}x{packageData.widthCm}x{packageData.heightCm} cm
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.label}>Jumlah</Text>
          <Text style={styles.val}>{packageData.quantity} item</Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.label}>Nilai Barang</Text>
          <Text style={styles.val}>
            {packageData.declaredValue > 0 ? rp(packageData.declaredValue) : "Tidak diasuransikan"}
          </Text>
        </View>
      </View>

      {packageData.fragile ? (
        <View style={styles.fragileWarning}>
          <ShieldAlert size={16} color="#B45309" />
          <Text style={styles.fragileText}>
            Barang mudah pecah / butuh perlakuan ekstra hati-hati (Proteksi diaktifkan).
          </Text>
        </View>
      ) : null}

      {packageData.notes ? (
        <View style={styles.notesBox}>
          <AlertCircle size={14} color="#64748B" />
          <Text style={styles.notesText}>Catatan: {packageData.notes}</Text>
        </View>
      ) : null}

      {packageData.photoUrls && packageData.photoUrls.length > 0 ? (
        <View style={styles.photosSection}>
          <Text style={styles.label}>Foto Barang:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
            {packageData.photoUrls.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  categoryBadge: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  gridItem: {
    width: "46%",
  },
  label: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  val: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  fragileWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  fragileText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
  },
  photosSection: {
    marginTop: 12,
  },
  photosRow: {
    gap: 8,
    marginTop: 6,
  },
  photoThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
});
