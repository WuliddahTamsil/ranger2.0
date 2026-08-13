import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CalendarDays, Check, CheckCircle2, Clock3, MapPin, MessageCircle, ReceiptText, ShieldAlert, Truck, Wallet } from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { Nav, OrderItem } from "../../types";
import { getLatestCateringOrder, subscribeCustomerOrders } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export const CustomerCateringTrackingScreen: React.FC<Nav> = ({ navigate }) => {
  const [order, setOrder] = useState<OrderItem | undefined>(getLatestCateringOrder());
  const [chatVisible, setChatVisible] = useState(false);

  useEffect(() => subscribeCustomerOrders((orders) => setOrder(orders.find((item) => item.type.toLowerCase().includes("cater")))), []);

  const remaining = order?.remainingAmount || 0;
  const progress = [
    { title: "Pesanan diterima", text: "Detail pesanan sudah dikonfirmasi", icon: CheckCircle2, active: true },
    { title: "Sedang disiapkan", text: "Mitra catering menyiapkan menu", icon: Clock3, active: true },
    { title: "Menunggu tanggal PO", text: order?.cateringDate || "Tanggal PO belum dipilih", icon: CalendarDays, active: true },
    { title: "Diantar ke lokasi", text: "Driver akan mengantar sesuai jadwal", icon: Truck, active: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusHero}><View style={styles.statusIcon}><Check size={28} color="#FFFFFF" strokeWidth={3} /></View><Text style={styles.statusTitle}>Pesanan Catering Diproses</Text><Text style={styles.statusSubtitle}>Mitra sudah menerima pesanan dan akan menyiapkannya sesuai tanggal PO.</Text></View>

        {order && <View style={styles.orderCard}><View style={styles.orderHeader}><View><Text style={styles.orderLabel}>NOMOR PESANAN</Text><Text style={styles.orderId}>{order.id}</Text></View><ReceiptText size={24} color="#1B7A4E" /></View><View style={styles.divider} /><Text style={styles.itemTitle}>{order.item}</Text><Text style={styles.itemSub}>{order.detail}</Text><View style={styles.detailRow}><CalendarDays size={16} color="#1B7A4E" /><Text style={styles.detailText}>PO {order.cateringDate} • {order.cateringTime}</Text></View><View style={styles.detailRow}><MapPin size={16} color="#1B7A4E" /><Text style={styles.detailText}>{String(order.address || "Alamat pengiriman customer")}</Text></View></View>}

        <Text style={styles.sectionTitle}>Status Pesanan</Text>
        <View style={styles.timeline}>{progress.map((item, index) => { const Icon = item.icon; return <View key={item.title} style={styles.timelineRow}><View style={styles.timelineRail}>{<View style={[styles.timelineDot, item.active && styles.timelineDotActive]}><Icon size={15} color={item.active ? "#FFFFFF" : "#9CA3AF"} /></View>}{index < progress.length - 1 && <View style={[styles.timelineLine, item.active && styles.timelineLineActive]} />}</View><View style={styles.timelineCopy}><Text style={[styles.timelineTitle, !item.active && styles.inactiveText]}>{item.title}</Text><Text style={styles.timelineText}>{item.text}</Text></View></View>; })}</View>

        {order && <View style={styles.paymentCard}><View style={styles.paymentHeader}><Wallet size={19} color="#1B7A4E" /><Text style={styles.sectionTitleNoMargin}>Status Pembayaran</Text></View><View style={styles.paymentRow}><Text style={styles.paymentLabel}>Total pesanan</Text><Text style={styles.paymentValue}>{formatRupiah(order.total)}</Text></View><View style={styles.paymentRow}><Text style={styles.paymentLabel}>{order.paymentStatus || "Pembayaran"}</Text><Text style={styles.paidValue}>{formatRupiah(order.paidAmount || 0)}</Text></View><View style={styles.paymentRow}><Text style={styles.paymentLabel}>Sisa pelunasan</Text><Text style={[styles.paymentValue, remaining > 0 && styles.warningText]}>{formatRupiah(remaining)}</Text></View>{remaining > 0 ? <View style={styles.reminderBox}><ShieldAlert size={18} color="#166534" /><View style={{ flex: 1 }}><Text style={styles.reminderTitle}>Ada pembayaran yang harus dilunasi</Text><Text style={styles.reminderText}>{order.paymentReminder}</Text><Text style={styles.dueText}>Batas pelunasan: {order.paymentDueDate}</Text></View></View> : <View style={styles.paidBox}><CheckCircle2 size={18} color="#1B7A4E" /><Text style={styles.paidBoxText}>Pembayaran sudah lunas.</Text></View>}</View>}

        <TouchableOpacity style={styles.chatButton} onPress={() => setChatVisible(true)}><MessageCircle size={17} color="#1B7A4E" /><Text style={styles.chatButtonText}>Chat Driver Catering</Text></TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigate("c_home")}><Text style={styles.primaryButtonText}>Kembali ke Beranda</Text></TouchableOpacity>
      </ScrollView>
      <CustomerChatModal visible={chatVisible} onClose={() => setChatVisible(false)} orderId={order?.id || "CATERING-TRACKING"} participantName="Driver Catering" participantType="driver" initialMessage="Halo Kak, driver akan mengantar pesanan catering sesuai jadwal PO." />
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
});
