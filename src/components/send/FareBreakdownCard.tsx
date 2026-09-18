import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck, Info, Tag } from "lucide-react-native";
import { SendFareBreakdown } from "../../types";
import { rp } from "../../utils/formatters";

interface FareBreakdownCardProps {
  fare: SendFareBreakdown;
}

export const FareBreakdownCard: React.FC<FareBreakdownCardProps> = ({ fare }) => {
  return (
    <View style={styles.card}>
      <View style={styles.summaryHeader}>
        <Text style={styles.headerTitle}>Rincian Biaya Pengiriman</Text>
        <Text style={styles.headerSub}>
          {fare.distanceKm} km • ~{fare.estimatedDurationMinutes} menit
        </Text>
      </View>

      <View style={styles.lineRow}>
        <Text style={styles.lineLabel}>Tarif Dasar (termasuk 2 km pertama)</Text>
        <Text style={styles.lineVal}>{rp(fare.baseFare)}</Text>
      </View>

      {fare.distanceFare > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Tarif Tambahan Jarak</Text>
          <Text style={styles.lineVal}>{rp(fare.distanceFare)}</Text>
        </View>
      ) : null}

      {fare.weightFare > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Biaya Bobot Tambahan</Text>
          <Text style={styles.lineVal}>{rp(fare.weightFare)}</Text>
        </View>
      ) : null}

      {fare.sizeFare > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Biaya Dimensi Volume</Text>
          <Text style={styles.lineVal}>{rp(fare.sizeFare)}</Text>
        </View>
      ) : null}

      {fare.fragileFee > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Proteksi Pecah Belah</Text>
          <Text style={styles.lineVal}>{rp(fare.fragileFee)}</Text>
        </View>
      ) : null}

      {fare.insuranceFee > 0 ? (
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Asuransi Nilai Barang</Text>
          <Text style={styles.lineVal}>{rp(fare.insuranceFee)}</Text>
        </View>
      ) : null}

      <View style={styles.lineRow}>
        <Text style={styles.lineLabel}>Biaya Layanan Aplikasi</Text>
        <Text style={styles.lineVal}>{rp(fare.serviceFee)}</Text>
      </View>

      {fare.discount > 0 ? (
        <View style={styles.lineRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Tag size={12} color="#15803D" />
            <Text style={[styles.lineLabel, { color: "#15803D", fontWeight: "700" }]}>
              Diskon Promo
            </Text>
          </View>
          <Text style={[styles.lineVal, { color: "#15803D", fontWeight: "800" }]}>
            -{rp(fare.discount)}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total Estimasi Biaya</Text>
          <Text style={styles.guaranteeText}>Termasuk asuransi standar</Text>
        </View>
        <Text style={styles.totalVal}>{rp(fare.estimatedFare)}</Text>
      </View>

      <View style={styles.disclaimerBox}>
        <Info size={14} color="#0369A1" />
        <Text style={styles.disclaimerText}>
          Tarif dihitung akurat oleh sistem backend. Jika terjadi perbedaan berat/ukuran fisik saat penjemputan, penyesuaian biaya memerlukan konfirmasi Anda terlebih dahulu.
        </Text>
      </View>
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
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "700",
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  lineLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  lineVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  guaranteeText: {
    fontSize: 11,
    color: "#64748B",
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 16,
  },
});
