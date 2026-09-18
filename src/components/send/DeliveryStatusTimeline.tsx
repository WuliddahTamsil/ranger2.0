import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2, Circle, Clock } from "lucide-react-native";

interface DeliveryStatusTimelineProps {
  currentStatus: string;
}

const STEPS = [
  { key: "SEARCHING_DRIVER", label: "Mencari Driver" },
  { key: "DRIVER_ASSIGNED", label: "Driver Ditemukan" },
  { key: "DRIVER_ON_THE_WAY_TO_PICKUP", label: "Driver Menuju Pickup" },
  { key: "DRIVER_ARRIVED_AT_PICKUP", label: "Driver Tiba di Pickup" },
  { key: "PICKED_UP", label: "Barang Berhasil Diambil" },
  { key: "IN_TRANSIT", label: "Barang Sedang Diantar" },
  { key: "DELIVERED", label: "Barang Sudah Diterima" },
  { key: "COMPLETED", label: "Pesanan Selesai" },
];

export const DeliveryStatusTimeline: React.FC<DeliveryStatusTimelineProps> = ({
  currentStatus,
}) => {
  const getStepIndex = (status: string) => {
    switch (status) {
      case "SEARCHING_DRIVER":
      case "CREATED":
      case "PAYMENT_PENDING":
        return 0;
      case "DRIVER_ASSIGNED":
        return 1;
      case "DRIVER_ON_THE_WAY_TO_PICKUP":
        return 2;
      case "DRIVER_ARRIVED_AT_PICKUP":
      case "PICKUP_VERIFICATION":
        return 3;
      case "PICKED_UP":
        return 4;
      case "IN_TRANSIT":
      case "ARRIVED_AT_DESTINATION":
        return 5;
      case "DELIVERY_VERIFICATION":
      case "DELIVERED":
        return 6;
      case "COMPLETED":
        return 7;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Status Pengiriman</Text>

      <View style={styles.timelineList}>
        {STEPS.map((step, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.indicatorCol}>
                {isPast ? (
                  <CheckCircle2 size={18} color="#15803D" />
                ) : isCurrent ? (
                  <Clock size={18} color="#0284C7" />
                ) : (
                  <Circle size={16} color="#CBD5E1" />
                )}
                {idx < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.verticalLine,
                      isPast ? styles.linePast : styles.lineFuture,
                    ]}
                  />
                )}
              </View>

              <View style={styles.contentCol}>
                <Text
                  style={[
                    styles.stepText,
                    isPast && styles.textPast,
                    isCurrent && styles.textCurrent,
                    isFuture && styles.textFuture,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
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
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  timelineList: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  indicatorCol: {
    width: 24,
    alignItems: "center",
  },
  verticalLine: {
    width: 2,
    height: 24,
    marginVertical: 2,
  },
  linePast: {
    backgroundColor: "#15803D",
  },
  lineFuture: {
    backgroundColor: "#E2E8F0",
  },
  contentCol: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  stepText: {
    fontSize: 13,
  },
  textPast: {
    color: "#15803D",
    fontWeight: "700",
  },
  textCurrent: {
    color: "#0284C7",
    fontWeight: "800",
  },
  textFuture: {
    color: "#94A3B8",
    fontWeight: "500",
  },
});
