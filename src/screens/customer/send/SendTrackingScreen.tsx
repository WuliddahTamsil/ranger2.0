import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Clipboard,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Share2,
  X,
  KeyRound,
  ShieldCheck,
  Bike,
  Star,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useSendContext } from "../../../context/SendContext";
import { NativeMapComponent, MapMarkerItem } from "../../../components/NativeMapComponent";
import { ComplaintModal } from "../../../components/send/ComplaintModal";
import { CustomerChatModal } from "../CustomerChatModal";
import { SafeCallModal } from "../../../components/SafeCallModal";
import {
  fetchSendOrderById,
  submitSendRating,
  submitSendComplaint,
} from "../../../services/sendService";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../../../services/api";
import { rp } from "../../../utils/formatters";

interface SendTrackingScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

const STATUS_STEPS = [
  { key: "DRIVER_ASSIGNED", label: "Driver Ditugaskan", desc: "Driver mengonfirmasi pesanan" },
  { key: "DRIVER_ON_THE_WAY_TO_PICKUP", label: "Menuju Pickup", desc: "Driver menuju lokasi jemput" },
  { key: "DRIVER_ARRIVED_AT_PICKUP", label: "Tiba di Pickup", desc: "Driver menunggu serah terima" },
  { key: "PICKED_UP", label: "Paket Diambil", desc: "Verifikasi kode pickup sukses" },
  { key: "IN_TRANSIT", label: "Dalam Pengantaran", desc: "Paket menuju alamat penerima" },
  { key: "ARRIVED_AT_DESTINATION", label: "Sampai Tujuan", desc: "Driver tiba di lokasi penerima" },
  { key: "COMPLETED", label: "Paket Terkirim", desc: "Pengiriman selesai terverifikasi" },
];

export const SendTrackingScreen: React.FC<SendTrackingScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const { activeOrder, setActiveOrder } = useSendContext();

  const [chatVisible, setChatVisible] = useState(false);
  const [callVisible, setCallVisible] = useState(false);
  const [complaintVisible, setComplaintVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const [driverCoord, setDriverCoord] = useState<{ latitude: number; longitude: number } | null>(
    activeOrder?.driverLocation?.latitude
      ? {
          latitude: activeOrder.driverLocation.latitude,
          longitude: activeOrder.driverLocation.longitude,
        }
      : null
  );

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 3000);
  };

  // Socket and Polling for live tracking
  useEffect(() => {
    if (!activeOrder?._id) return;

    const socket = io(API_BASE_URL, { transports: ["websocket", "polling"] });
    socket.emit("join_send_room", { orderId: activeOrder._id, token: authAccount?.token });

    // Live GPS updates from driver
    socket.on("send:driver_location_updated", (payload) => {
      if (payload?.latitude && payload?.longitude) {
        setDriverCoord({ latitude: Number(payload.latitude), longitude: Number(payload.longitude) });
      }
    });

    // Order status lifecycle
    const onStatusUpdate = (updatedOrder: any) => {
      if (updatedOrder) {
        setActiveOrder(updatedOrder);
        if (updatedOrder.status === "COMPLETED") {
          setRatingModalVisible(true);
        }
      }
    };

    socket.on("send:pickup_verified", onStatusUpdate);
    socket.on("send:package_picked_up", onStatusUpdate);
    socket.on("send:delivery_verified", onStatusUpdate);
    socket.on("send:order_completed", onStatusUpdate);
    socket.on("send:status_updated", onStatusUpdate);

    // Backup polling every 3.5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetchSendOrderById(activeOrder._id, authAccount?.id);
        if (res.success && res.data) {
          setActiveOrder(res.data);
          if (res.data.driverLocation?.latitude) {
            setDriverCoord({
              latitude: res.data.driverLocation.latitude,
              longitude: res.data.driverLocation.longitude,
            });
          }
          if (res.data.status === "COMPLETED" && !res.data.rating) {
            setRatingModalVisible(true);
          }
        }
      } catch (e) {
        // silent catch
      }
    }, 3500);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [activeOrder?._id, authAccount?.id, authAccount?.token]);

  // Current order status index in timeline
  const currentStepIndex = useMemo(() => {
    const status = activeOrder?.status || "SEARCHING_DRIVER";
    if (status === "DRIVER_ASSIGNED") return 0;
    if (status === "DRIVER_ON_THE_WAY_TO_PICKUP") return 1;
    if (status === "DRIVER_ARRIVED_AT_PICKUP" || status === "PICKUP_VERIFICATION") return 2;
    if (status === "PICKED_UP") return 3;
    if (status === "IN_TRANSIT") return 4;
    if (status === "ARRIVED_AT_DESTINATION" || status === "DELIVERY_VERIFICATION") return 5;
    if (status === "DELIVERED" || status === "COMPLETED") return 6;
    return 0;
  }, [activeOrder?.status]);

  // Pickup PIN Code
  const pickupPin = (activeOrder as any)?.pickupCode || activeOrder?.pickupCodeRaw || "682914";

  const handleCopyPin = () => {
    Clipboard.setString(pickupPin);
    setCopiedPin(true);
    showToast("Kode PIN penjemputan berhasil disalin!");
    setTimeout(() => setCopiedPin(false), 2500);
  };

  const handleSendRating = async () => {
    if (!activeOrder?._id) return;
    setSubmittingRating(true);
    try {
      const res = await submitSendRating(activeOrder._id, ratingScore, ratingReview, authAccount?.id);
      if (res.success) {
        showToast("Terima kasih! Rating berhasil dikirim.");
        setRatingModalVisible(false);
      }
    } catch {
      showToast("Gagal menyimpan ulasan.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Map markers
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    const list: MapMarkerItem[] = [];

    // Pickup
    if (activeOrder?.sender?.latitude != null && activeOrder?.sender?.longitude != null) {
      list.push({
        id: "pickup",
        coordinate: { latitude: activeOrder.sender.latitude as number, longitude: activeOrder.sender.longitude as number },
        title: "Titik Jemput: " + activeOrder.sender.name,
        description: activeOrder.sender.address,
        pinColor: "#059669",
        type: "pickup",
      });
    }

    // Dropoff
    if (activeOrder?.recipient?.latitude != null && activeOrder?.recipient?.longitude != null) {
      list.push({
        id: "dropoff",
        coordinate: { latitude: activeOrder.recipient.latitude as number, longitude: activeOrder.recipient.longitude as number },
        title: "Titik Antar: " + activeOrder.recipient.name,
        description: activeOrder.recipient.address,
        pinColor: "#E11D48",
        type: "dropoff",
      });
    }

    // Live Driver Location
    if (driverCoord) {
      list.push({
        id: "driver_live",
        coordinate: driverCoord,
        title: "Driver Rangers: " + (activeOrder?.driverId?.name || "Mitra Driver"),
        description: "Sedang dalam perjalanan",
        pinColor: "#0284C7",
        type: "driver",
      });
    }

    return list;
  }, [activeOrder?.sender, activeOrder?.recipient, driverCoord, activeOrder?.driverId]);

  const centerCoord = driverCoord || (activeOrder?.sender?.latitude != null && activeOrder?.sender?.longitude != null
    ? { latitude: activeOrder.sender.latitude as number, longitude: activeOrder.sender.longitude as number }
    : { latitude: -6.9175, longitude: 107.6191 });

  const driverName = activeOrder?.driverId?.name || "Kang Asep Rangers";
  const driverPhone = activeOrder?.driverId?.phone || "081234567890";
  const driverRating = activeOrder?.driverId?.rating || 4.9;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate("c_home")} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pelacakan Pengiriman</Text>
          <Text style={styles.headerSub}>Order #{activeOrder?.orderCode || "RNG-SEND"}</Text>
        </View>
        <TouchableOpacity style={styles.helpBtn} onPress={() => setComplaintVisible(true)}>
          <ShieldCheck size={16} color="#059669" />
          <Text style={styles.helpBtnText}>Bantuan</Text>
        </TouchableOpacity>
      </View>

      {/* In-App Toast */}
      {toastText && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastText}</Text>
        </View>
      )}

      {/* Map Canvas */}
      <View style={styles.mapContainer}>
        <NativeMapComponent
          initialRegion={{
            latitude: centerCoord.latitude,
            longitude: centerCoord.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          markers={mapMarkers}
          interactive={true}
          showRouteLine={true}
        />
      </View>

      {/* Bottom Tracking Sheet */}
      <View style={styles.sheetCard}>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {/* Driver Profile Card */}
          <View style={styles.driverCard}>
            <View style={styles.driverAvatarCircle}>
              <Bike size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driverName}</Text>
              <View style={styles.driverMetaRow}>
                <View style={styles.ratingBadge}>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{driverRating}</Text>
                </View>
                <Text style={styles.driverVehicle}>Honda Vario • D 4589 XYZ</Text>
              </View>
            </View>

            {/* Quick Action: Chat & Call */}
            <View style={styles.driverActionRow}>
              <TouchableOpacity
                style={styles.actionCircleBtn}
                onPress={() => setCallVisible(true)}
              >
                <Phone size={18} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCircleBtn, styles.actionCircleBtnChat]}
                onPress={() => setChatVisible(true)}
              >
                <MessageSquare size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pickup PIN Card (Crucial Security) */}
          <View style={styles.pinCard}>
            <View style={styles.pinHeaderRow}>
              <KeyRound size={16} color="#059669" />
              <Text style={styles.pinTitle}>KODE PIN PENJEMPUTAN</Text>
            </View>
            <Text style={styles.pinDesc}>
              Tunjukkan 6 digit kode ini kepada driver saat driver tiba untuk serah terima paket:
            </Text>
            <View style={styles.pinDisplayBox}>
              <Text style={styles.pinCodeText}>{pickupPin}</Text>
              <TouchableOpacity style={styles.copyPinBtn} onPress={handleCopyPin}>
                {copiedPin ? <Check size={14} color="#059669" /> : <Copy size={14} color="#059669" />}
                <Text style={styles.copyPinBtnText}>{copiedPin ? "Tersalin" : "Salin PIN"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineHeaderTitle}>Status Perjalanan Paket</Text>
            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineIndicatorColumn}>
                    <View
                      style={[
                        styles.timelineDot,
                        isPast && styles.timelineDotPast,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isPast ? (
                        <Check size={10} color="#FFFFFF" />
                      ) : isCurrent ? (
                        <View style={styles.currentInnerDot} />
                      ) : null}
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.timelineBar,
                          isPast && styles.timelineBarActive,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineTextColumn}>
                    <Text
                      style={[
                        styles.timelineStepTitle,
                        (isPast || isCurrent) && styles.timelineStepTitleActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.timelineStepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Real Customer Chat Modal */}
      <CustomerChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        orderId={activeOrder?._id || "send_chat"}
        customerId={authAccount?.id}
        participantName={driverName}
        participantType="driver"
        initialMessage="Halo, saya menunggu di titik penjemputan ya!"
      />

      {/* Real Safe Call Modal */}
      <SafeCallModal
        visible={callVisible}
        onClose={() => setCallVisible(false)}
        targetName={driverName}
        targetRole="Driver Rangers"
        targetPhone={driverPhone}
        orderCode={activeOrder?.orderCode}
      />

      {/* Complaint Modal */}
      <ComplaintModal
        visible={complaintVisible}
        onClose={() => setComplaintVisible(false)}
        orderCode={activeOrder?.orderCode || "RNG-SEND"}
        onSubmit={async (category: string, description: string) => {
          if (activeOrder?._id) {
            await submitSendComplaint(activeOrder._id, { category, description }, authAccount?.id);
            showToast("Komplain berhasil diajukan.");
          }
        }}
      />

      {/* Rating & Review Modal upon completion */}
      <Modal visible={ratingModalVisible} transparent animationType="slide">
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            <View style={styles.ratingHeaderBadge}>
              <Star size={20} color="#F59E0B" fill="#F59E0B" />
            </View>
            <Text style={styles.ratingTitle}>Paket Berhasil Diterima!</Text>
            <Text style={styles.ratingDesc}>
              Bagaimana pengalaman pengiriman dengan {driverName}? Berikan ulasan Anda:
            </Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                  <Star
                    size={32}
                    color="#F59E0B"
                    fill={star <= ratingScore ? "#F59E0B" : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Tulis ulasan untuk driver (opsional)..."
              placeholderTextColor="#94A3B8"
              value={ratingReview}
              onChangeText={setRatingReview}
              multiline
            />

            <View style={styles.ratingActionRow}>
              <TouchableOpacity
                style={styles.ratingSkipBtn}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.ratingSkipBtnText}>Nanti Saja</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ratingSubmitBtn}
                onPress={handleSendRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.ratingSubmitBtnText}>Kirim Ulasan</Text>
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
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  toastBox: {
    position: "absolute",
    top: 64,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "54%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetScroll: {
    padding: 20,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  driverAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  driverVehicle: {
    fontSize: 11,
    color: "#64748B",
  },
  driverActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircleBtnChat: {
    backgroundColor: "#059669",
  },
  pinCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  pinHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  pinTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 0.8,
  },
  pinDesc: {
    fontSize: 11,
    color: "#047857",
    lineHeight: 16,
  },
  pinDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  pinCodeText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 4,
  },
  copyPinBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  copyPinBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  timelineSection: {
    marginTop: 6,
    marginBottom: 24,
  },
  timelineHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineIndicatorColumn: {
    alignItems: "center",
    width: 18,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotPast: {
    backgroundColor: "#059669",
  },
  timelineDotCurrent: {
    backgroundColor: "#059669",
    borderWidth: 2,
    borderColor: "#A7F3D0",
  },
  currentInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  timelineBar: {
    width: 2,
    height: 28,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },
  timelineBarActive: {
    backgroundColor: "#059669",
  },
  timelineTextColumn: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineStepTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  timelineStepTitleActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  timelineStepDesc: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },

  // Rating Modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  ratingCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  ratingHeaderBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ratingTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 18,
  },
  reviewInput: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    height: 72,
    textAlignVertical: "top",
  },
  ratingActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  ratingSkipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingSkipBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  ratingSubmitBtn: {
    flex: 1.5,
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingSubmitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
