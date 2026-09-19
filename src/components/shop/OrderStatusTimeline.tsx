import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, Clock, AlertCircle } from "lucide-react-native";

interface StatusItem {
  key: string;
  label: string;
  sublabel: string;
}

const ORDER_STAGES: StatusItem[] = [
  { key: "ORDER_CREATED", label: "Pesanan Dibuat", sublabel: "Menunggu konfirmasi pembayaran" },
  { key: "STORE_ACCEPTED", label: "Toko Menerima", sublabel: "Pesanan masuk ke antrean toko" },
  { key: "PREPARING", label: "Barang Disiapkan", sublabel: "Staf toko / shopper mengambil barang" },
  { key: "READY_FOR_PICKUP", label: "Siap Diambil Kurir", sublabel: "Barang sudah dikemas rapi" },
  { key: "PICKED_UP", label: "Dalam Pengantaran", sublabel: "Kurir membawa barang ke alamatmu" },
  { key: "COMPLETED", label: "Pesanan Selesai", sublabel: "Barang telah diterima dengan aman" },
];

const getStageIndex = (currentStatus: string): number => {
  switch (currentStatus) {
    case "CREATED":
    case "PAYMENT_PENDING":
      return 0;
    case "PAID":
    case "WAITING_STORE_CONFIRMATION":
    case "STORE_ACCEPTED":
      return 1;
    case "PREPARING":
    case "PICKING":
    case "WAITING_SUBSTITUTION":
      return 2;
    case "READY_FOR_PICKUP":
    case "DRIVER_ASSIGNED":
    case "DRIVER_AT_STORE":
      return 3;
    case "PICKED_UP":
    case "DELIVERING":
    case "ARRIVED":
      return 4;
    case "COMPLETED":
      return 5;
    default:
      return 0;
  }
};

interface OrderStatusTimelineProps {
  currentStatus: string;
  isCancelled?: boolean;
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  currentStatus,
  isCancelled = false,
}) => {
  const activeStage = getStageIndex(currentStatus);

  if (isCancelled || currentStatus === "CANCELLED") {
    return (
      <View style={styles.cancelledBox}>
        <AlertCircle size={20} color="#DC2626" />
        <View style={styles.cancelledTextCol}>
          <Text style={styles.cancelledTitle}>Pesanan Dibatalkan</Text>
          <Text style={styles.cancelledDesc}>Pesanan ini telah dibatalkan dan stok dikembalikan ke toko.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status Progres Pesanan</Text>

      <View style={styles.timeline}>
        {ORDER_STAGES.map((stage, idx) => {
          const isDone = idx < activeStage || currentStatus === "COMPLETED";
          const isCurrent = idx === activeStage && currentStatus !== "COMPLETED";
          const isPending = idx > activeStage;

          return (
            <View key={stage.key} style={styles.stageRow}>
              {/* Indicator Column */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.nodeCircle,
                    isDone && styles.doneNode,
                    isCurrent && styles.currentNode,
                    isPending && styles.pendingNode,
                  ]}
                >
                  {isDone ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : isCurrent ? (
                    <View style={styles.pulseInner} />
                  ) : null}
                </View>

                {idx < ORDER_STAGES.length - 1 && (
                  <View
                    style={[
                      styles.connectorLine,
                      isDone ? styles.doneLine : styles.pendingLine,
                    ]}
                  />
                )}
              </View>

              {/* Text Column */}
              <View style={styles.textCol}>
                <Text
                  style={[
                    styles.stageLabel,
                    isCurrent && styles.currentStageLabel,
                    isPending && styles.pendingStageLabel,
                  ]}
                >
                  {stage.label}
                </Text>
                <Text style={styles.stageSub}>{stage.sublabel}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 4,
  },
  stageRow: {
    flexDirection: "row",
    minHeight: 52,
  },
  indicatorCol: {
    alignItems: "center",
    width: 28,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  doneNode: {
    backgroundColor: "#15803D",
  },
  currentNode: {
    backgroundColor: "#DCFCE7",
    borderColor: "#15803D",
    borderWidth: 2,
  },
  pulseInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#15803D",
  },
  pendingNode: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    borderWidth: 1,
  },
  connectorLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  doneLine: {
    backgroundColor: "#15803D",
  },
  pendingLine: {
    backgroundColor: "#E5E7EB",
  },
  textCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stageLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  currentStageLabel: {
    color: "#15803D",
  },
  pendingStageLabel: {
    color: "#9CA3AF",
    fontWeight: "500",
  },
  stageSub: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
  cancelledBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
  },
  cancelledTextCol: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  cancelledDesc: {
    fontSize: 12,
    color: "#7F1D1D",
    marginTop: 2,
  },
});
