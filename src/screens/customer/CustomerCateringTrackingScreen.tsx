import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  ReceiptText,
  ShieldAlert,
  Truck,
  User,
  Wallet,
  Store,
  Phone,
  Bike,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { rp } from "../../utils/formatters";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { CustomerChatModal } from "./CustomerChatModal";
import { getCateringOrdersForCustomer } from "../../services/api";
import { subscribeCustomerOrders } from "./customerOrderStore";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";

interface CustomerCateringTrackingProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerCateringTrackingScreen: React.FC<CustomerCateringTrackingProps> = ({ navigate, authAccount }) => {
  const [order, setOrder] = useState<any>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<"driver" | "merchant">("driver");

  useEffect(() => subscribeCustomerOrders((orders) => {
    const latest = orders.find((item) => item.type.toLowerCase().includes("cater"));
    if (latest) setOrder(latest);
  }), []);

  // Poll live status from backend frequently (every 2.5 seconds)
  useEffect(() => {
    if (!authAccount?.id) return;
    const fetchLive = async () => {
      const res = await getCateringOrdersForCustomer(authAccount.id);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const live = res.data[0]; // Most recent catering order
        setOrder((prev: any) => ({
          ...prev,
          id: live._id || prev?.id,
          orderCode: live.orderCode || prev?.orderCode,
          status: live.status,
          item: live.menuName || prev?.item,
          detail: `${live.portions} pax • ${live.storeName || "Catering Lokal"}`,
          total: live.totalAmount || prev?.total,
          paidAmount: live.paidAmount || prev?.paidAmount,
          remainingAmount: live.remainingAmount !== undefined ? live.remainingAmount : prev?.remainingAmount,
          cateringDate: live.cateringDate || prev?.cateringDate,
          cateringTime: live.cateringTime || prev?.cateringTime,
          address: live.address || prev?.address,
          driverId: live.driverId,
          driverName: live.driverName,
          driverPhone: live.driverPhone,
          driverVehicle: live.driverVehicle,
          storeName: live.storeName,
          storeAddress: live.storeAddress,
        }));
      }
    };
    void fetchLive();
    const interval = setInterval(() => void fetchLive(), 2500);
    return () => clearInterval(interval);
  }, [authAccount?.id]);

  const remaining = order?.remainingAmount || 0;
  const currentStatus = order?.status || "Menunggu";

  // Dynamic status evaluation
  const isReceived = true;
  const isCooking = ["Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(currentStatus);
  const isReady = ["Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(currentStatus);
  const isDriverHeading = ["Menuju Pickup", "Sampai Pickup"].includes(currentStatus);
  const isDelivering = ["Diambil", "Mengantar", "Dikirim"].includes(currentStatus);
  const isFinished = currentStatus === "Selesai";

  const progress = [
    { title: "Pesanan diterima", text: "Detail pesanan sudah dikonfirmasi", icon: CheckCircle2, active: isReceived },
    { title: "Sedang disiapkan", text: "Mitra catering menyiapkan menu masakan", icon: Clock3, active: isCooking },
    {
      title: "Pesanan siap & kurir ditugaskan",
      text: isDriverHeading
        ? `Kurir (${order?.driverName || "Driver"}) sedang menuju dapur`
        : isReady
        ? (order?.driverName ? `Kurir: ${order.driverName} bersiap` : "Pesanan siap! Menugaskan kurir terdekat...")
        : "Menunggu dapur menyelesaikan masakan",
      icon: CalendarDays,
      active: isReady,
    },
    {
      title: "Diantar ke alamat tujuan",
      text: isDelivering
        ? `Kurir ${order?.driverName || "Rangers"} sedang membawa pesanan ke lokasimu`
        : isFinished
        ? "Pesanan telah sampai di tujuan"
        : "Menunggu kurir mulai perjalanan",
      icon: Truck,
      active: isDelivering || isFinished,
    },
  ];

  const handleOpenDriverChat = () => {
    setChatRecipient("driver");
    setChatVisible(true);
  };

  const handleOpenMerchantChat = () => {
    setChatRecipient("merchant");
    setChatVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Hero */}
        <View style={styles.statusHero}>
          <View style={styles.statusIcon}>
            <Check size={28} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.statusTitle}>
            {isFinished
              ? "Pesanan Telah Selesai!"
              : isDelivering
              ? "Kurir Sedang Mengantar"
              : isDriverHeading
              ? "Kurir Menuju Dapur Penjemputan"
              : isReady
              ? "Pesanan Siap Diambil Kurir"
              : isCooking
              ? "Dapur Sedang Memasak Menu"
              : "Pesanan Diterima Dapur"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isFinished
              ? "Pesanan telah tiba di tujuan. Selamat menikmati hidangan Anda!"
              : isDelivering
              ? `Kurir (${order?.driverName || "Rangers Delivery"}) sedang dalam perjalanan ke alamat Anda.`
              : isDriverHeading
              ? `Kurir (${order?.driverName || "Rangers"}) sedang menuju ${order?.storeName || "Dapur Catering"}.`
              : isReady
              ? "Dapur telah selesai menyiapkan pesanan. Menunggu kurir mengambil pesanan."
              : isCooking
              ? "Mitra catering sudah menerima pesanan dan sedang meracik hidangan segar."
              : "Pesanan telah masuk ke antrean dapur mitra."}
          </Text>
        </View>

        {/* Real Interactive Google Maps Tracking */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitleNoMargin}>Peta Pelacakan Real-Time (Google Maps)</Text>
          <Text style={styles.mapSubtitle}>Pantau rute kurir dan lokasi dapur pengantaran</Text>
          <View style={{ marginTop: 8 }}>
            <LiveOrderTrackingMap
              storeName={order?.storeName || "Dapur Barokah Catering"}
              storeAddress={order?.storeAddress || "Jl. Raya Telang No. 12, Kamal"}
              customerAddress={order?.address || "Jl. Telang Indah No. 45, Kamal"}
              driverName={order?.driverName}
              driverVehicle={order?.driverVehicle}
              orderStatus={currentStatus}
              height={260}
            />
          </View>
        </View>

        {/* Kurir Card / Waiting Driver Info */}
        {order?.driverName ? (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Bike size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverLabel}>KURIR PENGANTAR RANGERS</Text>
              <Text style={styles.driverName}>{order.driverName}</Text>
              <Text style={styles.driverPhone}>
                {order.driverPhone || "Rangers Express"} {order.driverVehicle ? `• ${order.driverVehicle}` : ""}
              </Text>
            </View>
            <View style={styles.driverActionBtns}>
              <TouchableOpacity
                style={styles.driverChatBtn}
                onPress={handleOpenDriverChat}
                activeOpacity={0.8}
              >
                <MessageCircle size={18} color="#1B7A4E" />
                <Text style={styles.driverBtnText}>Chat Driver</Text>
              </TouchableOpacity>
              {order.driverPhone ? (
                <TouchableOpacity
                  style={styles.driverCallBtn}
                  onPress={() => void Linking.openURL(`tel:${order.driverPhone}`)}
                  activeOpacity={0.8}
                >
                  <Phone size={16} color="#0284C7" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : isReady ? (
          <View style={styles.waitingDriverCard}>
            <Bike size={20} color="#7E22CE" />
            <View style={{ flex: 1 }}>
              <Text style={styles.waitingDriverTitle}>Menugaskan Kurir</Text>
              <Text style={styles.waitingDriverSub}>
                Makanan telah siap! Sistem sedang mencarikan kurir terdekat untuk mengambil pesanan di dapur.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Store Card & Chat Store Button */}
        <View style={styles.storeCard}>
          <View style={styles.storeAvatar}>
            <Store size={20} color="#EA580C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeLabel}>MITRA DAPUR CATERING</Text>
            <Text style={styles.storeName}>{order?.storeName || "Dapur Barokah Catering"}</Text>
            <Text style={styles.storeSub} numberOfLines={1}>{order?.storeAddress || "Dapur Produksi"}</Text>
          </View>
          <TouchableOpacity
            style={styles.storeChatBtn}
            onPress={handleOpenMerchantChat}
            activeOpacity={0.8}
          >
            <MessageCircle size={16} color="#EA580C" />
            <Text style={styles.storeBtnText}>Chat Dapur</Text>
          </TouchableOpacity>
        </View>

        {order && (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderLabel}>NOMOR PESANAN</Text>
                <Text style={styles.orderId}>{order.orderCode || order.id}</Text>
              </View>
              <ReceiptText size={24} color="#1B7A4E" />
            </View>
            <View style={styles.divider} />
            <Text style={styles.itemTitle}>{order.item}</Text>
            <Text style={styles.itemSub}>{order.detail}</Text>
            <View style={styles.detailRow}>
              <CalendarDays size={16} color="#1B7A4E" />
              <Text style={styles.detailText}>PO {order.cateringDate} • {order.cateringTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#1B7A4E" />
              <Text style={styles.detailText}>{String(order.address || "Alamat pengiriman customer")}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Tahap Pengiriman</Text>
        <View style={styles.timeline}>
          {progress.map((item, index) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, item.active && styles.timelineDotActive]}>
                    <Icon size={15} color={item.active ? "#FFFFFF" : "#9CA3AF"} />
                  </View>
                  {index < progress.length - 1 && (
                    <View style={[styles.timelineLine, item.active && styles.timelineLineActive]} />
                  )}
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={[styles.timelineTitle, !item.active && styles.inactiveText]}>{item.title}</Text>
                  <Text style={styles.timelineText}>{item.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigate("c_home")}>
          <Text style={styles.primaryButtonText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Chat Modal */}
      <CustomerChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        orderId={order?.id || "CATERING-TRACKING"}
        customerId={authAccount?.id}
        participantName={
          chatRecipient === "driver"
            ? (order?.driverName ? `${order.driverName} (Kurir)` : "Kurir Pengantar")
            : (order?.storeName ? `${order.storeName} (Dapur)` : "Mitra Catering")
        }
        participantType={chatRecipient}
        initialMessage={
          chatRecipient === "driver"
            ? "Halo Pak Kurir, saya customer pesanan catering ini."
            : "Halo Dapur Catering, saya ingin menanyakan pesanan saya."
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 32 },
  statusHero: { alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 18, padding: 20 },
  statusIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center" },
  statusTitle: { color: "#064E3B", fontSize: 18, fontWeight: "900", marginTop: 12 },
  statusSubtitle: { color: "#166534", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15, marginTop: 14 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderLabel: { color: "#9CA3AF", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  orderId: { color: "#111827", fontSize: 15, fontWeight: "900", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  itemTitle: { color: "#111827", fontSize: 14, fontWeight: "900" },
  itemSub: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  detailText: { flex: 1, color: "#4B5563", fontSize: 11 },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  sectionTitleNoMargin: { color: "#111827", fontSize: 14, fontWeight: "900" },
  timeline: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#E5E7EB" },
  timelineRow: { flexDirection: "row", minHeight: 58 },
  timelineRail: { width: 30, alignItems: "center" },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  timelineDotActive: { backgroundColor: "#1B7A4E" },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#E5E7EB", marginVertical: 2 },
  timelineLineActive: { backgroundColor: "#86EFAC" },
  timelineCopy: { flex: 1, paddingLeft: 10, paddingBottom: 13 },
  timelineTitle: { color: "#111827", fontSize: 12, fontWeight: "800" },
  timelineText: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  inactiveText: { color: "#9CA3AF" },
  paymentCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15, marginTop: 14 },
  paymentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 5 },
  paymentLabel: { color: "#6B7280", fontSize: 12 },
  paymentValue: { color: "#111827", fontSize: 12, fontWeight: "800" },
  paidValue: { color: "#1B7A4E", fontSize: 12, fontWeight: "900" },
  warningText: { color: "#166534" },
  reminderBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 11 },
  reminderTitle: { color: "#064E3B", fontSize: 11, fontWeight: "900" },
  reminderText: { color: "#166534", fontSize: 11, lineHeight: 16, marginTop: 3 },
  dueText: { color: "#064E3B", fontSize: 10, fontWeight: "800", marginTop: 6 },
  paidBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 11 },
  paidBoxText: { color: "#166534", fontSize: 11, fontWeight: "800" },
  primaryButton: { alignItems: "center", justifyContent: "center", backgroundColor: "#1B7A4E", borderRadius: 13, minHeight: 48, marginTop: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  chatButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#E8F5EE", borderRadius: 13, minHeight: 44, marginTop: 18 },
  chatButtonText: { color: "#1B7A4E", fontSize: 13, fontWeight: "900" },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 14,
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
  },
  driverLabel: {
    color: "#6B7280",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  driverName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  driverPhone: {
    color: "#1B7A4E",
    fontSize: 11,
    marginTop: 1,
    fontWeight: "700",
  },
  driverChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#C6E7D4",
  },
  driverActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  driverBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  driverCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  mapSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 4,
  },
  waitingDriverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAF5FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 14,
    marginTop: 14,
  },
  waitingDriverTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7E22CE",
  },
  waitingDriverSub: {
    fontSize: 11,
    color: "#6B21A8",
    marginTop: 2,
    lineHeight: 16,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 12,
    gap: 12,
  },
  storeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  storeLabel: {
    color: "#9CA3AF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  storeName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  storeSub: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 1,
  },
  storeChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  storeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
});
