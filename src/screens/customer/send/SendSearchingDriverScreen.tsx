import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  MapPin,
  X,
  ArrowLeft,
  Navigation,
  ShieldCheck,
  Package,
  AlertTriangle,
  Clock,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useSendContext } from "../../../context/SendContext";
import { NativeMapComponent, MapMarkerItem } from "../../../components/NativeMapComponent";
import { cancelSendOrder, fetchSendOrderById } from "../../../services/sendService";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../../../services/api";

interface SendSearchingDriverScreenProps extends Nav {}

export const SendSearchingDriverScreen: React.FC<SendSearchingDriverScreenProps> = ({
  navigate,
}) => {
  const { activeOrder, setActiveOrder } = useSendContext();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [cancelling, setCancelling] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(35);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Pulse animation for radar effect
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.45,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Countdown search estimation
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchSeconds((prev) => (prev > 1 ? prev - 1 : 40));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Realtime Socket listener & Poll status
  useEffect(() => {
    if (!activeOrder?._id) return;

    const socket = io(API_BASE_URL, { transports: ["websocket", "polling"] });
    socket.emit("join_send_room", { orderId: activeOrder._id });

    const handleAssigned = (updatedOrder: any) => {
      if (updatedOrder) {
        setActiveOrder(updatedOrder);
        navigate("c_send_tracking");
      }
    };

    socket.on("send:driver_assigned", handleAssigned);
    socket.on("send:status_updated", (order) => {
      if (order && order.status !== "SEARCHING_DRIVER" && order.status !== "PAYMENT_PENDING") {
        setActiveOrder(order);
        navigate("c_send_tracking");
      }
    });

    // Backup polling every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchSendOrderById(activeOrder._id);
        if (res.success && res.data) {
          if (res.data.status !== "SEARCHING_DRIVER" && res.data.status !== "PAYMENT_PENDING" && res.data.status !== "CREATED") {
            setActiveOrder(res.data);
            clearInterval(pollInterval);
            navigate("c_send_tracking");
          }
        }
      } catch {}
    }, 3000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [activeOrder?._id]);

  const confirmCancel = async () => {
    if (!activeOrder?._id) return;
    setCancelling(true);
    try {
      const res = await cancelSendOrder(activeOrder._id, "Dibatalkan oleh customer saat mencari driver.");
      if (res.success) {
        setShowCancelModal(false);
        navigate("c_send");
      }
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  };

  const mapMarkers: MapMarkerItem[] = [];
  if (activeOrder?.sender?.latitude != null && activeOrder?.sender?.longitude != null) {
    mapMarkers.push({
      id: "sender_point",
      coordinate: { latitude: activeOrder.sender.latitude as number, longitude: activeOrder.sender.longitude as number },
      title: "Penjemputan: " + activeOrder.sender.name,
      description: activeOrder.sender.address,
      pinColor: "#059669",
      type: "pickup",
    });
  }
  if (activeOrder?.recipient?.latitude != null && activeOrder?.recipient?.longitude != null) {
    mapMarkers.push({
      id: "recipient_point",
      coordinate: { latitude: activeOrder.recipient.latitude as number, longitude: activeOrder.recipient.longitude as number },
      title: "Tujuan: " + activeOrder.recipient.name,
      description: activeOrder.recipient.address,
      pinColor: "#E11D48",
      type: "dropoff",
    });
  }

  const centerCoord = (activeOrder?.sender?.latitude != null && activeOrder?.sender?.longitude != null)
    ? { latitude: activeOrder.sender.latitude as number, longitude: activeOrder.sender.longitude as number }
    : { latitude: -6.9175, longitude: 107.6191 };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate("c_send")} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mencari Driver Rangers</Text>
          <Text style={styles.headerSub}>Order #{activeOrder?.orderCode || "RNG-SEND"}</Text>
        </View>
      </View>

      {/* Map Canvas Background */}
      <View style={styles.mapContainer}>
        <NativeMapComponent
          initialRegion={{
            latitude: centerCoord.latitude,
            longitude: centerCoord.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          markers={mapMarkers}
          interactive={false}
          showRouteLine={true}
        />
      </View>

      {/* Floating Bottom Card */}
      <View style={styles.sheetCard}>
        {/* Radar Pulse Animation */}
        <View style={styles.radarWrapper}>
          <Animated.View
            style={[
              styles.radarRipple,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.45],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <View style={styles.radarCore}>
            <Package size={28} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.sheetTitle}>Menghubungkan ke Driver Terdekat</Text>
        <Text style={styles.sheetSubtitle}>
          Sistem sedang mengirim permintaan pengiriman Anda ke mitra driver GEOVERSE di sekitar lokasi pickup.
        </Text>

        {/* Route Preview */}
        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <View style={styles.dotEmerald} />
            <Text style={styles.routeText} numberOfLines={1}>
              {activeOrder?.sender?.address || "Lokasi Penjemputan"}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={styles.dotRose} />
            <Text style={styles.routeText} numberOfLines={1}>
              {activeOrder?.recipient?.address || "Lokasi Tujuan"}
            </Text>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowCancelModal(true)}
          disabled={cancelling}
        >
          <Text style={styles.cancelButtonText}>Batalkan Pencarian</Text>
        </TouchableOpacity>
      </View>

      {/* Friendly In-App Cancellation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <AlertTriangle size={24} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Batalkan Pesanan Pengiriman?</Text>
            <Text style={styles.modalDesc}>
              Pembatalan pada tahap pencarian driver bebas biaya. Anda dapat memesan kembali kapan saja.
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalStayBtn}
                onPress={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                <Text style={styles.modalStayBtnText}>Tetap Cari</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Ya, Batalkan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
    zIndex: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  radarWrapper: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  radarRipple: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#A7F3D0",
  },
  radarCore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  routeBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginVertical: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: "#CBD5E1",
    marginLeft: 3,
    marginVertical: 2,
  },
  dotEmerald: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },
  dotRose: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E11D48",
  },
  routeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  // In-App Cancel Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  modalStayBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalStayBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
