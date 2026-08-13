import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { Nav, CateringPaymentOption, OrderItem } from "../../types";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";

type FormStep = "form" | "checkout";
type PaymentMethod = "qris" | "gopay" | "bca_va" | "ovo";

const menus = [
  { id: "nasi_box", name: "Paket Nasi Box Komplit", description: "Nasi, ayam, sayur, sambal, kerupuk, dan buah", price: 25000 },
  { id: "prasmanan", name: "Paket Prasmanan Acara", description: "Menu rumahan lengkap untuk acara keluarga dan kantor", price: 45000 },
  { id: "snack_box", name: "Snack Box Tradisional", description: "Aneka jajanan pasar dan minuman segar", price: 18000 },
];

const paymentMethods: Array<{ id: PaymentMethod; name: string; subtitle: string; color: string }> = [
  { id: "qris", name: "QRIS", subtitle: "Scan dengan aplikasi pembayaran", color: "#0D7A53" },
  { id: "gopay", name: "GoPay", subtitle: "Bayar instan dengan GoPay", color: "#00AED6" },
  { id: "bca_va", name: "BCA Virtual Account", subtitle: "Transfer otomatis", color: "#003C93" },
  { id: "ovo", name: "OVO", subtitle: "Pembayaran cepat dan aman", color: "#4C3494" },
];

const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const formatDate = (date: Date) => `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

const createDateOptions = () => {
  const options: string[] = [];
  for (let index = 2; index <= 16; index += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    options.push(formatDate(date));
  }
  return options;
};

export const CustomerCateringDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const [step, setStep] = useState<FormStep>("form");
  const [selectedMenu, setSelectedMenu] = useState(menus[0]);
  const [portions, setPortions] = useState(20);
  const [poDate, setPoDate] = useState(() => createDateOptions()[2]);
  const [deliveryTime, setDeliveryTime] = useState("11:00");
  const [address, setAddress] = useState("Rumah - Jl. Raya Kamojang No. 12");
  const [paymentOption, setPaymentOption] = useState<CateringPaymentOption>("dp30");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const dateOptions = useMemo(createDateOptions, []);
  const deliveryFee = 15000;
  const serviceFee = 5000;
  const subtotal = selectedMenu.price * portions;
  const total = subtotal + deliveryFee + serviceFee;
  const dpPercent = paymentOption === "dp30" ? 30 : paymentOption === "dp50" ? 50 : 100;
  const paidAmount = Math.round((total * dpPercent) / 100);
  const remainingAmount = total - paidAmount;
  const selectedPaymentName = paymentMethods.find((method) => method.id === paymentMethod)?.name || "QRIS";

  const updatePortions = (delta: number) => setPortions((current) => Math.max(10, current + delta));

  const confirmPayment = () => {
    const orderId = `RNG-CAT-${Date.now().toString().slice(-6)}`;
    const paymentLabel = paymentOption === "lunas" ? "Lunas" : `DP ${dpPercent}%`;
    const order: OrderItem = {
      id: orderId,
      type: "Catering",
      iconName: "Coffee",
      color: "#1B7A4E",
      item: selectedMenu.name,
      detail: `Catering Bu Haji Nani • ${portions} pax`,
      status: "Diproses",
      statusColor: "orange",
      date: "Hari ini",
      total,
      deliveryFee,
      serviceFee,
      paymentMethod: selectedPaymentName,
      paymentStatus: paymentOption === "lunas" ? "Lunas" : `${paymentLabel} dibayar`,
      paymentOption,
      paidAmount,
      remainingAmount,
      paymentDueDate: remainingAmount > 0 ? `${poDate} (sebelum pengiriman)` : undefined,
      paymentReminder: remainingAmount > 0 ? `Sisa ${formatRupiah(remainingAmount)} wajib dilunasi sebelum pesanan dikirim.` : "Pembayaran sudah lunas.",
      paymentReference: `PAY-${Date.now().toString().slice(-8)}`,
      paymentHistory: [{ type: paymentLabel, amount: paidAmount, method: selectedPaymentName, date: "Hari ini" }],
      cateringDate: poDate,
      cateringPortions: portions,
      cateringTime: deliveryTime,
      address,
      notes: "Pesanan catering terjadwal",
    };

    addCustomerOrder(order);
    setPaymentModalVisible(false);
    navigate("c_catering_tracking");
  };

  if (step === "checkout") {
    return (
      <SafeAreaView style={styles.container}>
        <BackHeader title="Checkout Catering" onBack={() => setStep("form")} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.checkoutBanner}><ReceiptText size={22} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.checkoutBannerTitle}>Pesanan catering terjadwal</Text><Text style={styles.checkoutBannerText}>Pastikan tanggal PO dan jumlah porsi sudah benar.</Text></View></View>

          <Text style={styles.sectionTitle}>Detail Pesanan</Text>
          <View style={styles.card}>
            <Text style={styles.menuTitle}>{selectedMenu.name}</Text>
            <Text style={styles.mutedText}>{portions} pax • Catering Bu Haji Nani</Text>
            <View style={styles.detailRow}><CalendarDays size={17} color="#1B7A4E" /><Text style={styles.detailText}>PO: {poDate}</Text></View>
            <View style={styles.detailRow}><Clock3 size={17} color="#1B7A4E" /><Text style={styles.detailText}>Estimasi kirim: {deliveryTime}</Text></View>
            <View style={styles.detailRow}><MapPin size={17} color="#1B7A4E" /><Text style={styles.detailText}>{address}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Skema Pembayaran</Text>
          <View style={styles.card}>
            <View style={styles.paymentSummaryRow}><Text style={styles.mutedText}>Total pesanan</Text><Text style={styles.totalText}>{formatRupiah(total)}</Text></View>
            <View style={styles.paymentSummaryRow}><Text style={styles.mutedText}>Bayar sekarang ({dpPercent}%)</Text><Text style={styles.paidText}>{formatRupiah(paidAmount)}</Text></View>
            <View style={styles.paymentSummaryRow}><Text style={styles.mutedText}>Sisa pelunasan</Text><Text style={[styles.totalText, remainingAmount > 0 && styles.warningText]}>{formatRupiah(remainingAmount)}</Text></View>
            {remainingAmount > 0 && <View style={styles.reminderBox}><Text style={styles.reminderTitle}>Pengingat pelunasan</Text><Text style={styles.reminderText}>Sisa pembayaran harus dilunasi sebelum {poDate} agar pesanan dapat dikirim tepat waktu.</Text></View>}
          </View>

          <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          <TouchableOpacity style={styles.selectedPaymentCard} onPress={() => setPaymentModalVisible(true)}><View style={styles.paymentIcon}><Wallet size={20} color="#1B7A4E" /></View><View style={{ flex: 1 }}><Text style={styles.paymentName}>{selectedPaymentName}</Text><Text style={styles.mutedText}>Tap untuk mengganti metode pembayaran</Text></View><ChevronRight size={18} color="#6B7280" /></TouchableOpacity>
          <View style={styles.secureNote}><ShieldCheck size={17} color="#1B7A4E" /><Text style={styles.mutedText}>Pembayaran kamu diproses secara aman.</Text></View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setPaymentModalVisible(true)}><Text style={styles.primaryButtonText}>Bayar {formatRupiah(paidAmount)}</Text><ChevronRight size={18} color="#FFFFFF" /></TouchableOpacity>
        </ScrollView>
        {renderPaymentModal(paymentModalVisible, setPaymentModalVisible, paymentMethod, setPaymentMethod, confirmPayment)}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackHeader title="Pesan Catering" onBack={() => navigate("c_catering")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=500&fit=crop&q=85" }} style={styles.cover} />
        <Text style={styles.title}>Catering Bu Haji Nani</Text>
        <Text style={styles.subtitle}>Nasi box, prasmanan, dan paket acara untuk kebutuhan komunitas.</Text>
        <TouchableOpacity style={styles.chatOwnerButton} onPress={() => setChatVisible(true)}><MessageCircle size={17} color="#1B7A4E" /><Text style={styles.chatOwnerText}>Chat Pemilik Catering</Text></TouchableOpacity>

        <Text style={styles.sectionTitle}>Pilih Menu</Text>
        {menus.map((menu) => {
          const selected = selectedMenu.id === menu.id;
          return <TouchableOpacity key={menu.id} style={[styles.menuCard, selected && styles.menuCardSelected]} onPress={() => setSelectedMenu(menu)}><View style={{ flex: 1 }}><Text style={styles.menuTitle}>{menu.name}</Text><Text style={styles.menuDescription}>{menu.description}</Text><Text style={styles.menuPrice}>{formatRupiah(menu.price)} / pax</Text></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View></TouchableOpacity>;
        })}

        <Text style={styles.sectionTitle}>Jumlah Porsi</Text>
        <View style={styles.counterCard}><View><Text style={styles.menuTitle}>{portions} pax</Text><Text style={styles.mutedText}>Minimal pemesanan 10 pax</Text></View><View style={styles.counter}><TouchableOpacity style={styles.counterButton} onPress={() => updatePortions(-5)}><Minus size={16} color="#1B7A4E" /></TouchableOpacity><Text style={styles.counterValue}>{portions}</Text><TouchableOpacity style={styles.counterButton} onPress={() => updatePortions(5)}><Plus size={16} color="#1B7A4E" /></TouchableOpacity></View></View>

        <Text style={styles.sectionTitle}>Tanggal PO & Pengiriman</Text>
        <TouchableOpacity style={styles.inputCard} onPress={() => setDateModalVisible(true)}><CalendarDays size={20} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Tanggal pesanan (PO)</Text><Text style={styles.inputValue}>{poDate}</Text></View><ChevronRight size={18} color="#9CA3AF" /></TouchableOpacity>
        <View style={styles.timeRow}>{["11:00", "14:00", "18:00"].map((time) => <TouchableOpacity key={time} style={[styles.timeChip, deliveryTime === time && styles.timeChipSelected]} onPress={() => setDeliveryTime(time)}><Clock3 size={14} color={deliveryTime === time ? "#FFFFFF" : "#1B7A4E"} /><Text style={[styles.timeText, deliveryTime === time && styles.timeTextSelected]}>{time}</Text></TouchableOpacity>)}</View>

        <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
        <View style={styles.addressCard}><MapPin size={19} color="#1B7A4E" /><TextInput value={address} onChangeText={setAddress} multiline style={styles.addressInput} placeholder="Masukkan alamat pengiriman" /></View>

        <Text style={styles.sectionTitle}>Pilih Pembayaran</Text>
        <View style={styles.dpGrid}>{(["dp30", "dp50", "lunas"] as CateringPaymentOption[]).map((option) => { const percent = option === "dp30" ? 30 : option === "dp50" ? 50 : 100; const selected = paymentOption === option; return <TouchableOpacity key={option} style={[styles.dpCard, selected && styles.dpCardSelected]} onPress={() => setPaymentOption(option)}><Text style={[styles.dpPercent, selected && styles.dpTextSelected]}>{percent}%</Text><Text style={[styles.dpLabel, selected && styles.dpTextSelected]}>{option === "lunas" ? "Lunas" : `DP ${percent}%`}</Text><Text style={[styles.dpAmount, selected && styles.dpTextSelected]}>{formatRupiah(Math.round((total * percent) / 100))}</Text></TouchableOpacity>; })}</View>
        <View style={styles.dpInfo}><CheckCircle2 size={17} color="#1B7A4E" /><Text style={styles.mutedText}>{paymentOption === "lunas" ? "Pesanan langsung lunas dan tidak ada tagihan berikutnya." : `Bayar ${dpPercent}% sekarang, sisa ${formatRupiah(remainingAmount)} dilunasi sebelum tanggal PO.`}</Text></View>

        <View style={styles.totalCard}><View><Text style={styles.mutedText}>Total pesanan</Text><Text style={styles.totalText}>{formatRupiah(total)}</Text></View><TouchableOpacity style={styles.primaryButtonSmall} onPress={() => setStep("checkout")}><Text style={styles.primaryButtonText}>Lanjut Checkout</Text><ChevronRight size={17} color="#FFFFFF" /></TouchableOpacity></View>
      </ScrollView>

      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}><View style={styles.modalOverlay}><View style={styles.sheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Pilih Tanggal PO</Text><TouchableOpacity onPress={() => setDateModalVisible(false)}><X size={20} color="#111827" /></TouchableOpacity></View><Text style={styles.mutedText}>Pilih tanggal acara minimal H+2 agar mitra dapat menyiapkan pesanan.</Text><ScrollView style={styles.dateList}>{dateOptions.map((date) => <TouchableOpacity key={date} style={[styles.dateOption, date === poDate && styles.dateOptionSelected]} onPress={() => { setPoDate(date); setDateModalVisible(false); }}><CalendarDays size={18} color={date === poDate ? "#FFFFFF" : "#1B7A4E"} /><Text style={[styles.dateOptionText, date === poDate && styles.dateOptionTextSelected]}>{date}</Text>{date === poDate && <Check size={17} color="#FFFFFF" />}</TouchableOpacity>)}</ScrollView></View></View></Modal>
      <CustomerChatModal visible={chatVisible} onClose={() => setChatVisible(false)} orderId="CATERING-BU-HAJI-NANI" participantName="Catering Bu Haji Nani" participantType="merchant" initialMessage="Halo Kak, silakan tanyakan menu atau jadwal catering di sini." />
    </SafeAreaView>
  );
};

const renderPaymentModal = (
  visible: boolean,
  setVisible: (visible: boolean) => void,
  selected: PaymentMethod,
  setSelected: (method: PaymentMethod) => void,
  onConfirm: () => void,
) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}><View style={styles.modalOverlay}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Pilih Pembayaran</Text><TouchableOpacity onPress={() => setVisible(false)}><X size={20} color="#111827" /></TouchableOpacity></View>{paymentMethods.map((method) => { const isSelected = selected === method.id; return <TouchableOpacity key={method.id} style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]} onPress={() => setSelected(method.id)}><View style={[styles.paymentIcon, { backgroundColor: `${method.color}15` }]}><Wallet size={20} color={method.color} /></View><View style={{ flex: 1 }}><Text style={styles.paymentName}>{method.name}</Text><Text style={styles.mutedText}>{method.subtitle}</Text></View><View style={[styles.radio, isSelected && styles.radioSelected]}>{isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View></TouchableOpacity>; })}<TouchableOpacity style={styles.primaryButton} onPress={onConfirm}><Text style={styles.primaryButtonText}>Konfirmasi Pembayaran</Text><ChevronRight size={18} color="#FFFFFF" /></TouchableOpacity></View></View></Modal>
);

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 34 },
  cover: { width: "100%", height: 190, borderRadius: 18, marginBottom: 16 },
  title: { color: "#111827", fontSize: 23, fontWeight: "900" },
  subtitle: { color: "#6B7280", fontSize: 13, lineHeight: 19, marginTop: 6 },
  chatOwnerButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#E8F5EE", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 12 },
  chatOwnerText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  menuCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 15, padding: 13, marginBottom: 9 },
  menuCardSelected: { borderColor: "#1B7A4E", backgroundColor: "#E8F5EE" },
  menuTitle: { color: "#111827", fontSize: 13, fontWeight: "800" },
  menuDescription: { color: "#6B7280", fontSize: 11, lineHeight: 16, marginTop: 4 },
  menuPrice: { color: "#1B7A4E", fontSize: 12, fontWeight: "900", marginTop: 7 },
  radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginLeft: 12 },
  radioSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  counterCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 },
  counter: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  counterValue: { color: "#111827", fontSize: 15, fontWeight: "900" },
  inputCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", padding: 13 },
  inputLabel: { color: "#9CA3AF", fontSize: 10 },
  inputValue: { color: "#111827", fontSize: 13, fontWeight: "800", marginTop: 4 },
  timeRow: { flexDirection: "row", gap: 8, marginTop: 9 },
  timeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#A7F3D0", paddingVertical: 10 },
  timeChipSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  timeText: { color: "#1B7A4E", fontSize: 12, fontWeight: "800" },
  timeTextSelected: { color: "#FFFFFF" },
  addressCard: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", padding: 13 },
  addressInput: { flex: 1, color: "#374151", fontSize: 12, minHeight: 38, padding: 0 },
  dpGrid: { flexDirection: "row", gap: 8 },
  dpCard: { flex: 1, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 13 },
  dpCardSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  dpPercent: { color: "#1B7A4E", fontSize: 21, fontWeight: "900" },
  dpLabel: { color: "#374151", fontSize: 11, fontWeight: "800", marginTop: 2 },
  dpAmount: { color: "#6B7280", fontSize: 10, marginTop: 5 },
  dpTextSelected: { color: "#FFFFFF" },
  dpInfo: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 10 },
  totalCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, marginTop: 22 },
  totalText: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 3 },
  primaryButtonSmall: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1B7A4E", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1B7A4E", borderRadius: 13, minHeight: 48, paddingHorizontal: 16, marginTop: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  checkoutBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#E8F5EE", borderRadius: 15, padding: 14 },
  checkoutBannerTitle: { color: "#064E3B", fontSize: 13, fontWeight: "900" },
  checkoutBannerText: { color: "#166534", fontSize: 11, marginTop: 3 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15 },
  mutedText: { color: "#6B7280", fontSize: 11, lineHeight: 17 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  detailText: { flex: 1, color: "#374151", fontSize: 12 },
  paymentSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 5 },
  paidText: { color: "#1B7A4E", fontSize: 13, fontWeight: "900" },
  warningText: { color: "#166534" },
  reminderBox: { backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 11 },
  reminderTitle: { color: "#064E3B", fontSize: 11, fontWeight: "900" },
  reminderText: { color: "#166534", fontSize: 11, lineHeight: 16, marginTop: 3 },
  selectedPaymentCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", padding: 13 },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  paymentName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  secureNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28, maxHeight: "85%" },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  sheetTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  dateList: { marginTop: 14 },
  dateOption: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12, marginBottom: 8 },
  dateOptionSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  dateOptionText: { flex: 1, color: "#374151", fontSize: 12, fontWeight: "700" },
  dateOptionTextSelected: { color: "#FFFFFF" },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 12, marginBottom: 9 },
  paymentOptionSelected: { backgroundColor: "#E8F5EE", borderColor: "#1B7A4E" },
});
