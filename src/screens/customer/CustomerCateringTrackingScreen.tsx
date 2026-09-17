import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  Truck,
  User,
  Wallet,
  Store,
  Phone,
  Bike,
  ChevronRight,
  QrCode,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { rp } from "../../utils/formatters";
import { isCateringPaymentFullyPaid } from "../../utils/cateringPayment";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { CustomerChatModal } from "./CustomerChatModal";
import { getCateringOrdersForCustomer } from "../../services/api";
import { subscribeCustomerOrders } from "./customerOrderStore";

interface CustomerCateringTrackingProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerCateringTrackingScreen: React.FC<CustomerCateringTrackingProps> = ({ navigate, authAccount }) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const targetOrderId = useRef<string | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<"driver" | "merchant">("driver");

  useEffect(() => subscribeCustomerOrders((orders) => {
    const latest = orders.find((item) => item.type.toLowerCase().includes("cater") && /^[a-f\d]{24}$/i.test(String(item.id)));
    if (latest) {
      targetOrderId.current = String(latest.id);
      setOrder(latest);
    }
  }), []);

  // Refresh order status at a bounded interval; this is not GPS live tracking.
  useEffect(() => {
    if (!authAccount?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    const fetchLive = async () => {
      try {
        const res = await getCateringOrdersForCustomer(authAccount.id);
        if (!active) return;
        if (!res.success) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        const orders = Array.isArray(res.data) ? res.data : [];
        const live = (targetOrderId.current
          ? orders.find((candidate: any) => String(candidate._id || candidate.id) === targetOrderId.current)
          : orders[0]);
        if (live) {
          targetOrderId.current = String(live._id || live.id);
          setLoadError(false);
        setOrder((prev: any) => ({
          ...prev,
          id: live._id || prev?.id,
          orderCode: live.orderCode || prev?.orderCode,
          status: live.status,
          item: live.menuName || prev?.item,
          detail: `${live.portions} pax • ${live.storeName || "Catering Lokal"}`,
          total: live.totalAmount ?? prev?.total,
          paidAmount: live.paidAmount ?? prev?.paidAmount,
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
          paymentStatus: live.paymentStatus,
          paymentMethod: live.paymentMethod || prev?.paymentMethod,
          paymentBankName: live.paymentBankName || prev?.paymentBankName,
          paymentAccountNumber: live.paymentAccountNumber || prev?.paymentAccountNumber,
          paymentAccountHolder: live.paymentAccountHolder || prev?.paymentAccountHolder,
          paymentQrisImageUrl: live.paymentQrisImageUrl || prev?.paymentQrisImageUrl,
          paymentReminder: live.paymentReminder || prev?.paymentReminder,
          paymentOption: live.paymentOption || prev?.paymentOption,
          paymentDueAt: live.paymentDueAt || prev?.paymentDueAt,
          paymentHistory: live.paymentHistory || prev?.paymentHistory,
        }));
        }
        setLoading(false);
      } catch {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      }
    };
    void fetchLive();
    const interval = setInterval(() => void fetchLive(), 15000);
    return () => { active = false; clearInterval(interval); };
  }, [authAccount?.id]);

  const remaining = order?.remainingAmount || 0;
  const currentStatus = order?.status || "Menunggu";

  // Dynamic status evaluation
  const isReceived = Boolean(order);
  const isCooking = ["Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(currentStatus);
  const isReady = ["Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(currentStatus);
  const isDriverHeading = ["Menuju Pickup", "Sampai Pickup"].includes(currentStatus);
  const isDelivering = ["Diambil", "Mengantar", "Dikirim"].includes(currentStatus);
  const isFinished = currentStatus === "Selesai";
  const isCanceled = currentStatus === "Dibatalkan";
  const paidAmount = Number(order?.paidAmount || 0);
  const totalAmount = Number(order?.total || 0);
  const isPaymentComplete = isCateringPaymentFullyPaid(remaining, order?.paymentStatus, paidAmount, totalAmount);
  const paymentDueLabel = order?.paymentDueAt
    ? new Date(order.paymentDueAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : "H-1 sebelum pengiriman";
  const paymentMethodLabel = (value?: string) => {
    switch (value) {
      case "bank_transfer": return "Transfer Bank";
      case "qris": return "QRIS";
      case "gopay": return "GoPay";
      case "dana": return "DANA";
      case "ovo": return "OVO";
      case "shopeepay": return "ShopeePay";
      case "bank_va": return "BANK VA";
      case "cash": return "Tunai";
      default: return "Pembayaran";
    }
  };

  const verifiedPayments = (order?.paymentHistory || []).filter((item: any) => item.status === "TERVERIFIKASI");
  const latestVerifiedPayment = verifiedPayments[verifiedPayments.length - 1];

  const progress = [
    { title: "Pesanan tercatat", text: "Permintaan pesanan tersimpan dan menunggu proses mitra", icon: CheckCircle2, active: isReceived },
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
        ? `Kurir ${order?.driverName || "GEOVERSE"} sedang membawa pesanan ke lokasimu`
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

  if (loading && !order) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
        <View style={styles.emptyState}><ActivityIndicator size="large" color="#1B7A4E" /><Text style={styles.emptyStateText}>Memuat status pesanan…</Text></View>
      </ResponsiveSafeAreaView>
    );
  }

  if (!order) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{loadError ? "Status belum dapat dimuat" : "Belum ada pesanan Catering"}</Text>
          <Text style={styles.emptyStateText}>{loadError ? "Periksa koneksi lalu buka kembali halaman ini." : "Pesanan yang berhasil dibuat akan tampil di sini."}</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigate("c_catering")}><Text style={styles.emptyStateButtonText}>Lihat Catering</Text></TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Hero */}
        <View style={styles.statusHero}>
          <View style={styles.statusIcon}>
            <Check size={28} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.statusTitle}>
            {isCanceled
              ? "Pesanan Dibatalkan"
              : isFinished
              ? "Pesanan Telah Selesai!"
              : isDelivering
              ? "Kurir Sedang Mengantar"
              : isDriverHeading
              ? "Kurir Menuju Dapur Penjemputan"
              : isReady
              ? "Pesanan Siap Diambil Kurir"
              : isCooking
              ? "Dapur Sedang Memasak Menu"
              : "Pesanan Tercatat"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isCanceled
              ? "Pesanan ini dibatalkan. Hubungi mitra atau bantuan Geoverse jika Anda memerlukan informasi lebih lanjut."
              : isFinished
              ? "Pesanan telah tiba di tujuan. Selamat menikmati hidangan Anda!"
              : isDelivering
              ? `Kurir (${order?.driverName || "GEOVERSE Delivery"}) sedang dalam perjalanan ke alamat Anda.`
              : isDriverHeading
              ? `Kurir (${order?.driverName || "GEOVERSE"}) sedang menuju ${order?.storeName || "Dapur Catering"}.`
              : isReady
              ? "Dapur telah selesai menyiapkan pesanan. Menunggu kurir mengambil pesanan."
              : isCooking
              ? "Mitra catering sudah menerima pesanan dan sedang meracik hidangan segar."
              : `Pesanan tercatat. Status pembayaran: ${order?.paymentStatus || "menunggu konfirmasi"}.`}
          </Text>
        </View>

        <View style={styles.locationNotice}>
          <MapPin size={18} color="#64748B" />
          <Text style={styles.mapSubtitle}>Lokasi driver belum tersedia. Status pesanan diperbarui berkala.</Text>
        </View>

        <View style={styles.paymentCard}>
          <View style={styles.paymentHeaderRow}>
            <View style={styles.paymentHeaderTitle}><View style={styles.paymentIcon}><Wallet size={17} color="#1B7A4E" /></View><View style={styles.paymentHeaderCopy}><Text style={styles.paymentTitle}>Pembayaran</Text><Text style={styles.paymentMethod}>{paymentMethodLabel(order.paymentMethod)}</Text></View></View>
            <View style={[styles.paymentStatusPill, isPaymentComplete ? styles.paymentStatusPillDone : styles.paymentStatusPillPending]}><Text style={[styles.paymentStatusText, { color: isPaymentComplete ? "#166534" : "#9A3412" }]} numberOfLines={1}>{isPaymentComplete ? "LUNAS" : (order.paymentStatus || "MENUNGGU")}</Text></View>
          </View>
          <View style={styles.paymentProgressTrack}><View style={[styles.paymentProgressFill, { width: `${Math.min(100, totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0)}%` }]} /></View>
          <View style={styles.paymentAmountRow}><View style={styles.paymentAmountColumn}><Text style={styles.paymentAmountLabel}>Sudah dibayar</Text><Text style={styles.paymentAmountValue}>{rp(paidAmount)}</Text></View><View style={[styles.paymentAmountColumn, styles.paymentAmountColumnRight]}><Text style={styles.paymentAmountLabel}>Total pesanan</Text><Text style={styles.paymentAmountValue}>{rp(totalAmount)}</Text></View></View>
          {Number(order.remainingAmount || 0) > 0 ? (
            <View style={styles.paymentReminderBox}>
              <Text style={styles.paymentReminderTitle}>Pelunasan diperlukan · {rp(remaining)}</Text>
              <Text style={styles.paymentReminderText}>{order.paymentReminder || `Lunasi paling lambat ${paymentDueLabel}.`}</Text>
              <Text style={styles.paymentReminderDue}>Metode pelunasan: {paymentMethodLabel(order.paymentMethod)}. Selesaikan pembayaran dan unggah bukti transfer melalui halaman pembayaran QRIS.</Text>
              <TouchableOpacity
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: "#15803D",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginTop: 12,
                  shadowColor: "#0D7A53",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => navigate("c_catering_qris")}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ backgroundColor: "#DCFCE7", padding: 6, borderRadius: 8 }}>
                    <QrCode size={20} color="#15803D" />
                  </View>
                  <View style={styles.qrisButtonCopy}>
                    <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#0F172A" }}>
                      Buka Halaman Pembayaran QRIS
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>
                      Scan barcode, ajukan pelunasan & upload bukti
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#15803D" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.paidInvoiceCard}>
              <View style={styles.paidInvoiceHeader}>
                <View style={styles.paidInvoiceIcon}><CheckCircle2 size={19} color="#166534" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.paidInvoiceTitle}>Invoice Lunas 100%</Text>
                  <Text style={styles.paidInvoiceSubtitle}>Pembayaran terverifikasi oleh pemilik Catering</Text>
                </View>
                <Text style={styles.paidInvoiceStamp}>LUNAS</Text>
              </View>
              <View style={styles.paidInvoiceDivider} />
              <View style={styles.paidInvoiceRow}><Text style={styles.paidInvoiceLabel}>Nomor pesanan</Text><Text style={styles.paidInvoiceValue} numberOfLines={2}>{order.orderCode || `#${String(order.id).slice(-8).toUpperCase()}`}</Text></View>
              <View style={styles.paidInvoiceRow}><Text style={styles.paidInvoiceLabel}>Total pembayaran</Text><Text style={styles.paidInvoiceValue}>{rp(totalAmount)}</Text></View>
              <View style={styles.paidInvoiceRow}><Text style={styles.paidInvoiceLabel}>Metode</Text><Text style={styles.paidInvoiceValue}>{paymentMethodLabel(order.paymentMethod)}</Text></View>
              {latestVerifiedPayment?.verifiedAt ? <Text style={styles.paidInvoiceDate}>Diverifikasi {new Date(latestVerifiedPayment.verifiedAt).toLocaleString("id-ID")}</Text> : null}
              <Text style={styles.paymentCompleteNote}>Pembayaran sudah lunas. Pemilik Catering telah menerima notifikasi untuk menyelesaikan masakan, lalu menandai pesanan siap agar driver dapat mengantar.</Text>
            </View>
          )}
        </View>

        {/* Kurir Card / Waiting Driver Info */}
        {order?.driverName ? (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Bike size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.driverLabel}>KURIR PENGANTAR GEOVERSE</Text>
              <Text style={styles.driverName}>{order.driverName}</Text>
              <Text style={styles.driverPhone}>
                {order.driverPhone || "GEOVERSE Express"} {order.driverVehicle ? `• ${order.driverVehicle}` : ""}
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
            <View style={{ flex: 1, minWidth: 0 }}>
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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.storeLabel}>MITRA DAPUR CATERING</Text>
            <Text style={styles.storeName}>{order?.storeName || "Nama mitra belum tersedia"}</Text>
            <Text style={styles.storeSub} numberOfLines={1}>{order?.storeAddress || "Alamat mitra belum tersedia"}</Text>
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
              <Text style={styles.detailText}>{String(order.address || "Alamat belum tersedia")}</Text>
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
        visible={chatVisible && Boolean(order?.id)}
        onClose={() => setChatVisible(false)}
        orderId={order?.id || ""}
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
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyStateTitle: { color: "#111827", fontSize: 18, fontWeight: "800", textAlign: "center" },
  emptyStateText: { color: "#6B7280", fontSize: 13, lineHeight: 19, textAlign: "center" },
  emptyStateButton: { backgroundColor: "#1B7A4E", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 6 },
  emptyStateButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  locationNotice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 16 },
  content: { width: "100%", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  statusHero: { width: "100%", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 18, padding: 16 },
  statusIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center" },
  statusTitle: { alignSelf: "stretch", color: "#064E3B", fontSize: 18, fontWeight: "900", marginTop: 12, textAlign: "center" },
  statusSubtitle: { alignSelf: "stretch", color: "#166534", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15, marginTop: 14 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderLabel: { color: "#9CA3AF", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  orderId: { color: "#111827", fontSize: 15, fontWeight: "900", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  itemTitle: { color: "#111827", fontSize: 14, fontWeight: "900" },
  itemSub: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  detailText: { flex: 1, minWidth: 0, color: "#4B5563", fontSize: 11 },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  sectionTitleNoMargin: { color: "#111827", fontSize: 14, fontWeight: "900" },
  timeline: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#E5E7EB" },
  timelineRow: { flexDirection: "row", minHeight: 58 },
  timelineRail: { width: 30, alignItems: "center" },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  timelineDotActive: { backgroundColor: "#1B7A4E" },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#E5E7EB", marginVertical: 2 },
  timelineLineActive: { backgroundColor: "#86EFAC" },
  timelineCopy: { flex: 1, minWidth: 0, paddingLeft: 10, paddingBottom: 13 },
  timelineTitle: { color: "#111827", fontSize: 12, fontWeight: "800", flexWrap: "wrap" },
  timelineText: { color: "#6B7280", fontSize: 11, marginTop: 3, flexWrap: "wrap" },
  inactiveText: { color: "#9CA3AF" },
  paymentCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15, marginTop: 14 },
  paymentHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  paymentHeaderTitle: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  paymentHeaderCopy: { flex: 1, minWidth: 0 },
  paymentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5EE" },
  paymentTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  paymentMethod: { color: "#1B7A4E", fontSize: 11, fontWeight: "800", marginTop: 2 },
  paymentStatusPill: { maxWidth: "45%", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  paymentStatusPillDone: { backgroundColor: "#DCFCE7" },
  paymentStatusPillPending: { backgroundColor: "#FFEDD5" },
  paymentStatusText: { fontSize: 9, fontWeight: "900" },
  paymentProgressTrack: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 99, overflow: "hidden", marginTop: 15 },
  paymentProgressFill: { height: "100%", backgroundColor: "#1B7A4E", borderRadius: 99 },
  paymentAmountRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 12 },
  paymentAmountColumn: { flex: 1, minWidth: 0 },
  paymentAmountColumnRight: { alignItems: "flex-end" },
  paymentAmountLabel: { color: "#64748B", fontSize: 10 },
  paymentAmountValue: { color: "#0F172A", fontSize: 13, fontWeight: "900", marginTop: 3 },
  paymentAccountBox: { backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 11, marginTop: 12 },
  paymentAccountText: { color: "#334155", fontSize: 11, lineHeight: 18 },
  paymentReminderBox: { backgroundColor: "#FFF7ED", borderRadius: 12, borderWidth: 1, borderColor: "#FED7AA", padding: 11, marginTop: 12 },
  paymentReminderTitle: { color: "#9A3412", fontSize: 12, fontWeight: "900" },
  paymentReminderText: { color: "#9A3412", fontSize: 11, lineHeight: 16, marginTop: 4 },
  paymentReminderDue: { color: "#C2410C", fontSize: 10, fontWeight: "800", marginTop: 6 },
  paymentCompleteNote: { color: "#166534", backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 12, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  paidInvoiceCard: { backgroundColor: "#F0FDF4", borderRadius: 14, borderWidth: 1, borderColor: "#BBF7D0", padding: 12, marginTop: 12 },
  paidInvoiceHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  paidInvoiceIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  paidInvoiceTitle: { color: "#14532D", fontSize: 13, fontWeight: "900" },
  paidInvoiceSubtitle: { color: "#166534", fontSize: 10, marginTop: 2 },
  paidInvoiceStamp: { color: "#15803D", fontSize: 10, fontWeight: "900", borderWidth: 1, borderColor: "#86EFAC", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  paidInvoiceDivider: { height: 1, backgroundColor: "#BBF7D0", marginVertical: 10 },
  paidInvoiceRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 6 },
  paidInvoiceLabel: { flex: 1, minWidth: 0, color: "#4B5563", fontSize: 10 },
  paidInvoiceValue: { flex: 1, minWidth: 0, color: "#14532D", fontSize: 10, fontWeight: "900", textAlign: "right" },
  paidInvoiceDate: { color: "#166534", fontSize: 9, marginTop: 9 },
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
    alignItems: "flex-start",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 14,
    gap: 10,
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
    flexWrap: "wrap",
    marginLeft: "auto",
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
  qrisButtonCopy: { flex: 1, minWidth: 0 },
  mapSubtitle: {
    flex: 1,
    minWidth: 0,
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
    alignItems: "flex-start",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 12,
    gap: 10,
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
    marginLeft: "auto",
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
