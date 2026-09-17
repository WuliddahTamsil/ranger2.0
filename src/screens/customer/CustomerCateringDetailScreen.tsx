import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from "react-native";
import { getSelectedCateringShop } from "./customerCateringStore";
import { getCateringProducts, createCateringOrder } from "../../services/api";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  ShieldAlert,
  X,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { CustomerAddress, Nav, CateringPaymentOption, OrderItem } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { addCustomerOrder } from "./customerOrderStore";
import { getPrimaryCustomerAddress } from "../../services/customerAddressService";
import { CustomerAddressSelector } from "../../components/CustomerAddressSelector";

interface CustomerCateringDetailProps extends Nav {
  authAccount?: AuthAccount | null;
}

type FormStep = "form" | "checkout";
const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
type CateringPayMethod = "bank_transfer" | "qris";
const paymentMethodLabel: Record<CateringPayMethod, string> = {
  bank_transfer: "Transfer Bank",
  qris: "QRIS",
};

const formatDate = (date: Date) => `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
const isSameDate = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
const addDays = (baseDate: Date, dayOffset: number) => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + dayOffset);
  return nextDate;
};

export const CustomerCateringDetailScreen: React.FC<CustomerCateringDetailProps> = ({ navigate, authAccount }) => {
  const selectedCateringShop = getSelectedCateringShop();
  const bankName = selectedCateringShop?.bankName || "";
  const bankAccountNumber = selectedCateringShop?.bankAccountNumber || "";
  const bankAccountHolder = selectedCateringShop?.bankAccountHolder || "";
  const qrisImageUrl = selectedCateringShop?.qrisImageUrl || "";
  const hasBankTransferDetails = Boolean(bankName && bankAccountNumber && bankAccountHolder);
  const bankTransferEnabled = typeof selectedCateringShop?.bankTransferEnabled === "boolean"
    ? selectedCateringShop.bankTransferEnabled
    : hasBankTransferDetails;
  const qrisEnabled = typeof selectedCateringShop?.qrisEnabled === "boolean"
    ? selectedCateringShop.qrisEnabled
    : Boolean(qrisImageUrl);
  const [step, setStep] = useState<FormStep>("form");
  const [menus, setMenus] = useState<any[]>([]);
  const [menuError, setMenuError] = useState("");
  const [menuReloadKey, setMenuReloadKey] = useState(0);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [portions, setPortions] = useState(20);
  const minSelectableDate = useMemo(() => addDays(new Date(), 2), []);
  const [poDate, setPoDate] = useState(() => formatDate(addDays(new Date(), 2)));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(minSelectableDate.getFullYear(), minSelectableDate.getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date(minSelectableDate));
  const [deliveryTime, setDeliveryTime] = useState("11:00");
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | undefined>();
  const [paymentOption, setPaymentOption] = useState<CateringPaymentOption>("lunas");
  const [paymentMethod, setPaymentMethod] = useState<CateringPayMethod>("bank_transfer");
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchMenus = async () => {
      setLoading(true);
      setMenuError("");
      if (!selectedCateringShop?.ownerId) {
        setMenus([]);
        setMenuError("Mitra Catering tidak ditemukan. Kembali dan pilih mitra yang tersedia.");
        setLoading(false);
        return;
      }
      const res = await getCateringProducts(selectedCateringShop.ownerId);
      if (!active) return;
      if (res.success && res.data && res.data.length > 0) {
        const mapped = res.data.map((m: any) => ({
          id: m._id,
          name: m.name,
          description: m.description || "",
          price: m.price,
          stock: Number(m.stock || 0),
          img: m.img,
          images: Array.isArray(m.images) && m.images.length > 0 ? m.images : (m.img ? [m.img] : []),
        }));
        setMenus(mapped);
        setSelectedMenu(mapped[0]);
      } else {
        setMenus([]);
        setSelectedMenu(null);
        setMenuError(res.success ? "Mitra belum menyediakan menu aktif." : "Menu belum dapat dimuat. Periksa koneksi lalu coba lagi.");
      }
      setLoading(false);
    };
    void fetchMenus();
    return () => { active = false; };
  }, [selectedCateringShop?.ownerId, menuReloadKey]);

  useEffect(() => {
    const primary = getPrimaryCustomerAddress(authAccount);
    setSelectedAddress(primary);
    setAddress(primary?.fullAddress || "");
  }, [authAccount]);

  const calendarOptions = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells: Array<{ date: Date | null; inMonth: boolean }> = [];

    for (let index = firstWeekday - 1; index >= 0; index -= 1) {
      const date = new Date(year, month - 1, prevMonthDays - index);
      cells.push({ date, inMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(year, month, day), inMonth: true });
    }

    while (cells.length < 42) {
      const nextDay = cells.length - (firstWeekday + daysInMonth) + 1;
      cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    }

    return cells;
  }, [calendarMonth]);

  const paymentOptions = useMemo(() => {
    const items: Array<{ id: CateringPayMethod; title: string; description: string; badge: string; accent: string }> = [
      ...(bankTransferEnabled && hasBankTransferDetails ? [{ id: "bank_transfer" as const, title: "Transfer Bank", description: `${bankName} •••• ${bankAccountNumber.slice(-4)}`, badge: "BANK", accent: "#0D7A53" }] : []),
      ...(qrisEnabled && qrisImageUrl ? [{ id: "qris" as const, title: "QRIS", description: "Scan QRIS milik pemilik Catering.", badge: "QR", accent: "#DB2777" }] : []),
    ];
    return items;
  }, [bankAccountNumber, bankName, bankTransferEnabled, hasBankTransferDetails, qrisEnabled, qrisImageUrl]);

  useEffect(() => {
    if (paymentOptions.length > 0 && !paymentOptions.some((method) => method.id === paymentMethod)) {
      setPaymentMethod(paymentOptions[0].id);
    }
  }, [paymentMethod, paymentOptions]);

  const deliveryFee = 15000;
  const serviceFee = 5000;
  const subtotal = selectedMenu ? selectedMenu.price * portions : 0;
  const total = subtotal + deliveryFee + serviceFee;
  const dpPercent = paymentOption === "dp30" ? 30 : paymentOption === "dp50" ? 50 : 100;
  const plannedDeposit = Math.round((total * dpPercent) / 100);
  const remainingAfterPlannedDeposit = total - plannedDeposit;

  const updatePortions = (delta: number) => setPortions((current) => Math.max(10, current + delta));

  const handleSelectPaymentMethod = (method: CateringPayMethod) => {
    setPaymentMethod(method);
  };

  const handleCalendarSelect = (date: Date) => {
    if (date < minSelectableDate) {
      return;
    }
    setSelectedCalendarDate(date);
    setPoDate(formatDate(date));
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setDateModalVisible(false);
  };

  const confirmOrder = async () => {
    const showMessage = (title: string, message: string) => {
      if (Platform.OS === "web") alert(`${title}: ${message}`);
      else Alert.alert(title, message);
    };
    if (submitting) return;
    if (!authAccount?.id || !authAccount.name) {
      showMessage("Masuk diperlukan", "Masuk ke akun pelanggan sebelum membuat pesanan Catering.");
      navigate("login");
      return;
    }
    if (!address.trim()) {
      showMessage("Alamat belum tersedia", "Pilih alamat pengiriman sebelum checkout.");
      navigate("c_addresses");
      return;
    }
    if (!selectedCateringShop?.ownerId || !selectedMenu?.id) {
      showMessage("Menu belum tersedia", "Kembali dan pilih mitra serta menu yang masih aktif.");
      return;
    }
    if (!paymentOptions.some((method) => method.id === paymentMethod)) {
      showMessage("Metode pembayaran belum tersedia", "Mitra Catering belum mengatur Transfer Bank atau QRIS. Hubungi mitra atau pilih mitra lain.");
      return;
    }
    if (paymentMethod === "bank_transfer" && (!bankTransferEnabled || !bankName || !bankAccountNumber || !bankAccountHolder)) {
      showMessage("Rekening belum tersedia", "Detail rekening transfer pemilik Catering belum aktif atau belum lengkap. Pilih QRIS atau hubungi pemilik.");
      return;
    }
    if (paymentMethod === "qris" && (!qrisEnabled || !qrisImageUrl)) {
      showMessage("QRIS belum tersedia", "Pemilik Catering belum mengaktifkan atau mengunggah QRIS. Pilih metode pembayaran lain.");
      return;
    }

    setSubmitting(true);
    try {
      const addressSnapshot = selectedAddress || getPrimaryCustomerAddress(authAccount);
      const orderPayload = {
        customerId: authAccount.id,
        ownerId: selectedCateringShop.ownerId,
        productId: selectedMenu.id,
        portions,
        address: address.trim(),
        addressSnapshot: addressSnapshot || null,
        paymentOption,
        paymentMethod,
        cateringDate: poDate,
        cateringTime: deliveryTime,
        notes: "Pesanan catering terjadwal",
      };
      const signature = JSON.stringify(orderPayload);
      if (idempotencyKey.current?.signature !== signature) {
        idempotencyKey.current = {
          signature,
          key: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`,
        };
      }
      const res = await createCateringOrder(orderPayload, idempotencyKey.current.key);

      if (!res.success || !res.data) {
        showMessage("Pesanan belum dibuat", res.message || "Periksa koneksi lalu coba lagi.");
        return;
      }

      const order: OrderItem = {
        id: res.data._id,
        type: "Catering",
        iconName: "Coffee",
        color: "#1B7A4E",
        item: res.data.menuName,
        detail: `${res.data.storeName || selectedCateringShop.name} · ${res.data.portions} porsi`,
        status: res.data.status,
        statusColor: "orange",
        date: "Hari ini",
        total: res.data.totalAmount,
        deliveryFee: res.data.deliveryFee,
        serviceFee: res.data.serviceFee,
        paymentMethod: res.data.paymentMethod,
        paymentStatus: res.data.paymentStatus,
        paymentOption: res.data.paymentOption,
        paymentBankName: res.data.paymentBankName,
        paymentAccountNumber: res.data.paymentAccountNumber,
        paymentAccountHolder: res.data.paymentAccountHolder,
        paymentQrisImageUrl: res.data.paymentQrisImageUrl,
        paidAmount: res.data.paidAmount,
        remainingAmount: res.data.remainingAmount,
        paymentReminder: `Bayar ${paymentOption === "lunas" ? "lunas" : `DP ${dpPercent}%`} melalui ${paymentMethodLabel[paymentMethod]} lalu ajukan konfirmasi kepada pemilik Catering.`,
        cateringDate: res.data.cateringDate,
        cateringPortions: res.data.portions,
        cateringTime: res.data.cateringTime,
        address: res.data.address,
        notes: res.data.notes,
      };

      addCustomerOrder(order);
      idempotencyKey.current = null;
      if (paymentMethod === "qris") {
        navigate("c_catering_qris");
      } else {
        navigate("c_catering_tracking");
      }
    } catch {
      showMessage("Status pesanan belum diketahui", "Koneksi terputus. Coba lagi untuk memeriksa hasil; permintaan yang sama tidak akan menggandakan pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "checkout") {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Checkout Catering" onBack={() => setStep("form")} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.checkoutBanner}><ReceiptText size={22} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.checkoutBannerTitle}>Pesanan catering terjadwal</Text><Text style={styles.checkoutBannerText}>Pastikan tanggal PO dan jumlah porsi sudah benar.</Text></View></View>

          <Text style={styles.sectionTitle}>Detail Pesanan</Text>
          <View style={styles.card}>
            <Text style={styles.menuTitle}>{selectedMenu?.name}</Text>
          <Text style={styles.mutedText}>{portions} pax • {selectedCateringShop?.name || "Mitra Catering"}</Text>
            <View style={styles.detailRow}><CalendarDays size={17} color="#1B7A4E" /><Text style={styles.detailText}>PO: {poDate}</Text></View>
            <View style={styles.detailRow}><Clock3 size={17} color="#1B7A4E" /><Text style={styles.detailText}>Estimasi kirim: {deliveryTime}</Text></View>
            <View style={styles.detailRow}><MapPin size={17} color="#1B7A4E" /><Text style={styles.detailText}>{address}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
          <View style={styles.card}>
            <View style={styles.paymentSummaryRow}><Text style={styles.mutedText}>Total pesanan</Text><Text style={styles.totalText}>{formatRupiah(total)}</Text></View>
            <>
              <View style={styles.paymentSummaryRow}><Text style={styles.mutedText}>{paymentOption === "lunas" ? "Dibayar sebelum pengiriman" : `DP sesuai pilihan (${dpPercent}%)`}</Text><Text style={styles.paidText}>{formatRupiah(plannedDeposit)}</Text></View>
              <View style={styles.paymentSummaryRow}><Text style={styles.mutedText}>Perkiraan sisa pembayaran</Text><Text style={styles.totalText}>{formatRupiah(remainingAfterPlannedDeposit)}</Text></View>
            </>
            <View style={styles.reminderBox}>
              <Text style={styles.reminderTitle}>{paymentMethodLabel[paymentMethod]}</Text>
              <Text style={styles.reminderText}>{paymentMethod === "bank_transfer" ? `Transfer ke ${bankName} ${bankAccountNumber} a.n. ${bankAccountHolder}. Setelah transfer, ajukan konfirmasi pembayaran.` : "Scan QRIS pemilik Catering setelah pesanan tercatat, lalu ajukan konfirmasi pembayaran."}</Text>
              {paymentMethod === "qris" && qrisImageUrl ? <Image source={{ uri: qrisImageUrl }} style={{ width: 180, height: 180, alignSelf: "center", marginTop: 10, borderRadius: 12 }} resizeMode="contain" /> : null}
            </View>
          </View>

          <View style={styles.secureNote}><ShieldAlert size={17} color="#B45309" /><Text style={styles.mutedText}>DP 30% atau 50% masih diperbolehkan untuk memulai persiapan. Sistem akan mengingatkan bila sisa pembayaran belum selesai. Kurir baru akan mengambil dan mengantar setelah pembayaran terverifikasi 100% dan pemilik Catering menandai pesanan siap.</Text></View>
          <TouchableOpacity style={[styles.primaryButton, submitting && { opacity: 0.65 }]} disabled={submitting} onPress={confirmOrder}><Text style={styles.primaryButtonText}>{submitting ? "Mengirim pesanan…" : "Buat Pesanan Catering"}</Text><ChevronRight size={18} color="#FFFFFF" /></TouchableOpacity>
        </ScrollView>
      </ResponsiveSafeAreaView>
    );
  }

  if (loading) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Pesan Catering" onBack={() => navigate("c_catering")} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1B7A4E" />
          <Text style={styles.loadingText}>Memuat menu...</Text>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  if (menuError || menus.length === 0) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Pesan Catering" onBack={() => navigate("c_catering")} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{menuError || "Mitra belum menyediakan menu aktif."}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setMenuReloadKey((key) => key + 1)}>
            <Text style={styles.primaryButtonText}>Coba Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <BackHeader title="Pesan Catering" onBack={() => navigate("c_catering")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {selectedCateringShop?.profilePhoto ? <Image source={{ uri: selectedCateringShop.profilePhoto }} style={styles.cover} /> : <View style={styles.coverPlaceholder}><ReceiptText size={30} color="#1B7A4E" /><Text style={styles.placeholderText}>Foto mitra belum tersedia</Text></View>}
        <Text style={styles.title}>{selectedCateringShop?.name || "Nama mitra belum tersedia"}</Text>
        <Text style={styles.subtitle}>{selectedCateringShop?.description || "Deskripsi belum tersedia."}</Text>
        <TouchableOpacity style={styles.chatOwnerButton} onPress={() => Alert.alert("Chat setelah order", "Chat pemilik tersedia dari detail pesanan setelah checkout berhasil.")}><MessageCircle size={17} color="#1B7A4E" /><Text style={styles.chatOwnerText}>Chat Pemilik Catering</Text></TouchableOpacity>

        <Text style={styles.sectionTitle}>Pilih Menu</Text>
        {menus.map((menu) => {
          const selected = selectedMenu?.id === menu.id;
          return <TouchableOpacity key={menu.id} style={[styles.menuCard, selected && styles.menuCardSelected]} onPress={() => setSelectedMenu(menu)}><View style={{ flex: 1 }}><Text style={styles.menuTitle}>{menu.name}</Text><Text style={styles.menuDescription}>{menu.description}</Text><Text style={styles.menuPrice}>{formatRupiah(menu.price)} / pax</Text></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View></TouchableOpacity>;
        })}

        <Text style={styles.sectionTitle}>Jumlah Porsi</Text>
        <View style={styles.counterCard}><View><Text style={styles.menuTitle}>{portions} pax</Text><Text style={styles.mutedText}>Minimal pemesanan 10 pax</Text></View><View style={styles.counter}><TouchableOpacity style={styles.counterButton} onPress={() => updatePortions(-5)}><Minus size={16} color="#1B7A4E" /></TouchableOpacity><Text style={styles.counterValue}>{portions}</Text><TouchableOpacity style={styles.counterButton} onPress={() => updatePortions(5)}><Plus size={16} color="#1B7A4E" /></TouchableOpacity></View></View>

        <Text style={styles.sectionTitle}>Tanggal PO & Pengiriman</Text>
        <TouchableOpacity style={styles.inputCard} onPress={() => setDateModalVisible(true)}><CalendarDays size={20} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Tanggal pesanan (PO)</Text><Text style={styles.inputValue}>{poDate}</Text></View><ChevronRight size={18} color="#9CA3AF" /></TouchableOpacity>
        <View style={styles.timeRow}>{["11:00", "14:00", "18:00"].map((time) => <TouchableOpacity key={time} style={[styles.timeChip, deliveryTime === time && styles.timeChipSelected]} onPress={() => setDeliveryTime(time)}><Clock3 size={14} color={deliveryTime === time ? "#FFFFFF" : "#1B7A4E"} /><Text style={[styles.timeText, deliveryTime === time && styles.timeTextSelected]}>{time}</Text></TouchableOpacity>)}</View>

        <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
        <CustomerAddressSelector
          authAccount={authAccount}
          selectedAddress={selectedAddress}
          onChange={(nextAddress) => { setSelectedAddress(nextAddress); setAddress(nextAddress.fullAddress); }}
          onManageAddresses={() => navigate("c_addresses")}
        />

        <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
        <View style={styles.paymentMethodWrap}>
          {paymentOptions.map((method) => {
            const selected = paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => handleSelectPaymentMethod(method.id)}
                style={[styles.paymentMethodCard, selected && styles.paymentMethodCardSelected]}
                activeOpacity={0.9}
              >
                <View style={[styles.paymentMethodBadge, { backgroundColor: `${method.accent}1A`, borderColor: `${method.accent}33` }]}>
                  <Text style={[styles.paymentMethodBadgeText, { color: method.accent }]}>{method.badge}</Text>
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[styles.paymentMethodName, selected && styles.paymentMethodNameSelected]}>{method.title}</Text>
                  <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                </View>
                <View style={[styles.paymentMethodRadio, selected && styles.paymentMethodRadioSelected]}>
                  {selected ? <View style={styles.paymentMethodRadioInner} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
          {paymentOptions.length === 0 ? <View style={styles.paymentUnavailable}><ShieldAlert size={17} color="#B45309" /><Text style={styles.paymentUnavailableText}>Mitra belum mengatur Transfer Bank atau QRIS. Checkout belum dapat dilanjutkan.</Text></View> : null}
        </View>
        <>
          <Text style={styles.sectionTitle}>Jumlah Pembayaran Awal</Text>
          <View style={styles.dpGrid}>{(["dp30", "dp50", "lunas"] as CateringPaymentOption[]).map((option) => { const percent = option === "dp30" ? 30 : option === "dp50" ? 50 : 100; const selected = paymentOption === option; return <TouchableOpacity key={option} style={[styles.dpCard, selected && styles.dpCardSelected]} onPress={() => setPaymentOption(option)}><Text style={[styles.dpPercent, selected && styles.dpTextSelected]}>{percent}%</Text><Text style={[styles.dpLabel, selected && styles.dpTextSelected]}>{option === "lunas" ? "Lunas" : `DP ${percent}%`}</Text><Text style={[styles.dpAmount, selected && styles.dpTextSelected]}>{formatRupiah(Math.round((total * percent) / 100))}</Text></TouchableOpacity>; })}</View>
          <View style={styles.dpInfo}><ShieldAlert size={17} color="#B45309" /><Text style={styles.mutedText}>Pembayaran dilakukan langsung kepada mitra. GEOVERSE tidak menarik uang atau menandai pembayaran sebagai lunas.</Text></View>
        </>

        <View style={styles.totalCard}><View><Text style={styles.mutedText}>Total estimasi</Text><Text style={styles.totalText}>{formatRupiah(total)}</Text></View><TouchableOpacity style={styles.primaryButtonSmall} onPress={() => {
          if (!selectedMenu) {
            Alert.alert("Pilih Menu", "Pilih menu yang masih tersedia terlebih dahulu.");
            return;
          }
          if (paymentOptions.length === 0) {
            Alert.alert("Metode pembayaran belum tersedia", "Mitra Catering belum mengatur Transfer Bank atau QRIS. Silakan aktifkan metode pembayaran mitra terlebih dahulu.");
            return;
          }
          setStep("checkout");
        }}><Text style={styles.primaryButtonText}>Lanjut Checkout</Text><ChevronRight size={17} color="#FFFFFF" /></TouchableOpacity></View>
      </ScrollView>

      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pilih Tanggal PO</Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}><X size={20} color="#111827" /></TouchableOpacity>
            </View>
            <Text style={styles.mutedText}>Pilih tanggal acara minimal H+2 agar mitra dapat menyiapkan pesanan.</Text>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <ChevronLeft size={18} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>{months[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <ChevronRight size={18} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekdays}>
              {weekdays.map((day) => (
                <Text key={day} style={styles.calendarWeekday}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarOptions.map(({ date, inMonth }, index) => {
                if (!date) {
                  return <View key={`placeholder-${index}`} style={styles.calendarDayPlaceholder} />;
                }
                const disabled = date < minSelectableDate;
                const selected = isSameDate(date, selectedCalendarDate);
                return (
                  <TouchableOpacity
                    key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                    disabled={disabled}
                    onPress={() => handleCalendarSelect(date)}
                    style={[
                      styles.calendarDay,
                      !inMonth && styles.calendarDayMuted,
                      selected && styles.calendarDaySelected,
                      disabled && styles.calendarDayDisabled,
                    ]}
                  >
                    <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected, disabled && styles.calendarDayTextDisabled]}>{date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 34 },
  cover: { width: "100%", height: 190, borderRadius: 18, marginBottom: 16 },
  coverPlaceholder: { width: "100%", height: 190, borderRadius: 18, marginBottom: 16, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#E8F5EE" },
  placeholderText: { color: "#4B5563", fontSize: 11 },
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
  paymentMethodWrap: { gap: 10 },
  paymentMethodCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 11 },
  paymentMethodCardSelected: { borderColor: "#1B7A4E", backgroundColor: "#E8F5EE" },
  paymentMethodBadge: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  paymentMethodBadgeText: { fontSize: 13, fontWeight: "900" },
  paymentMethodInfo: { flex: 1, marginLeft: 12 },
  paymentMethodName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  paymentMethodNameSelected: { color: "#0F766E" },
  paymentMethodDescription: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  paymentMethodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  paymentMethodRadioSelected: { borderColor: "#1B7A4E", backgroundColor: "#FFFFFF" },
  paymentMethodRadioInner: { width: 8, height: 8, borderRadius: 6, backgroundColor: "#1B7A4E" },
  dpGrid: { flexDirection: "row", gap: 8 },
  dpCard: { flex: 1, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 13 },
  dpCardSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  dpPercent: { color: "#1B7A4E", fontSize: 21, fontWeight: "900" },
  dpLabel: { color: "#374151", fontSize: 11, fontWeight: "800", marginTop: 2 },
  dpAmount: { color: "#6B7280", fontSize: 10, marginTop: 5 },
  dpTextSelected: { color: "#FFFFFF" },
  dpInfo: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 10 },
  paymentUnavailable: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF7ED", borderRadius: 12, borderWidth: 1, borderColor: "#FED7AA", padding: 12 },
  paymentUnavailableText: { flex: 1, color: "#9A3412", fontSize: 11, lineHeight: 16 },
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
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 10 },
  calendarMonthLabel: { color: "#111827", fontSize: 15, fontWeight: "900" },
  calendarWeekdays: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  calendarWeekday: { flex: 1, textAlign: "center", color: "#6B7280", fontSize: 10, fontWeight: "700" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  calendarDay: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, marginBottom: 6 },
  calendarDayMuted: { opacity: 0.35 },
  calendarDaySelected: { backgroundColor: "#1B7A4E" },
  calendarDayDisabled: { opacity: 0.35 },
  calendarDayPlaceholder: { width: `${100 / 7}%`, aspectRatio: 1 },
  calendarDayText: { color: "#1F2937", fontSize: 12, fontWeight: "700" },
  calendarDayTextSelected: { color: "#FFFFFF" },
  calendarDayTextDisabled: { color: "#9CA3AF" },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 12, marginBottom: 9 },
  paymentOptionSelected: { backgroundColor: "#E8F5EE", borderColor: "#1B7A4E" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: "#4B5563", fontSize: 13, lineHeight: 19, textAlign: "center", paddingHorizontal: 24 },
  loadingText: { color: "#6B7280", fontSize: 13, marginTop: 10 },
});
