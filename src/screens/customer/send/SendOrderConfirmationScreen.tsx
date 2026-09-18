import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import {
  CheckCircle2,
  Package,
  KeyRound,
  Navigation,
  ChevronRight,
  Home,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useSendContext } from "../../../context/SendContext";
import { rp } from "../../../utils/formatters";

interface SendOrderConfirmationScreenProps extends Nav {}

export const SendOrderConfirmationScreen: React.FC<SendOrderConfirmationScreenProps> = ({
  navigate,
}) => {
  const { activeOrder } = useSendContext();

  const handleGoTracking = () => {
    navigate("c_send_searching");
  };

  const pickupCode =
    (activeOrder as any)?.pickupCode || activeOrder?.pickupCodeRaw || "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon & Heading */}
        <View style={styles.successHeader}>
          <View style={styles.successCircle}>
            <CheckCircle2 size={36} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Pesanan Pengiriman Dibuat!</Text>
          {activeOrder?.orderCode ? (
            <Text style={styles.successCode}>#{activeOrder.orderCode}</Text>
          ) : null}
          <Text style={styles.successSub}>
            Pesanan Anda siap diproses dan diteruskan ke armada driver terdekat.
          </Text>
        </View>

        {/* Pickup Code Display (Only if present) */}
        {pickupCode ? (
          <View style={styles.pickupCodeCard}>
            <View style={styles.pickupCodeHeader}>
              <KeyRound size={16} color="#059669" />
              <Text style={styles.pickupCodeLabel}>KODE PIN PENJEMPUTAN ANDA</Text>
            </View>
            <Text style={styles.codeText}>{pickupCode}</Text>
            <Text style={styles.pickupCodeHint}>
              Tunjukkan kode 6-digit ini kepada Driver saat menyerahkan paket di lokasi penjemputan.
            </Text>
          </View>
        ) : null}

        {/* Delivery Details Card */}
        {activeOrder && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ringkasan Pengiriman</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Barang:</Text>
              <Text style={styles.infoVal}>
                {activeOrder.package?.name} ({activeOrder.package?.category})
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pengirim:</Text>
              <Text style={styles.infoVal}>
                {activeOrder.sender?.name} ({activeOrder.sender?.phone})
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat Jemput:</Text>
              <Text style={[styles.infoVal, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
                {activeOrder.sender?.address}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Penerima:</Text>
              <Text style={styles.infoVal}>
                {activeOrder.recipient?.name} ({activeOrder.recipient?.phone})
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat Tujuan:</Text>
              <Text style={[styles.infoVal, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
                {activeOrder.recipient?.address}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Pembayaran:</Text>
              <Text style={styles.totalVal}>{rp(activeOrder.pricing?.finalFare || 0)}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleGoTracking}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>Lihat Status Pengiriman</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigate("c_home")}
          activeOpacity={0.8}
        >
          <Home size={16} color="#64748B" />
          <Text style={styles.homeBtnText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  successHeader: {
    alignItems: "center",
    marginVertical: 18,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  successCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
    marginTop: 4,
  },
  successSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  pickupCodeCard: {
    width: "100%",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    marginBottom: 16,
  },
  pickupCodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  pickupCodeLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 0.8,
  },
  codeText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 4,
    marginVertical: 4,
  },
  pickupCodeHint: {
    fontSize: 11,
    color: "#047857",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
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
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#059669",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#059669",
    borderRadius: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  homeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
});
