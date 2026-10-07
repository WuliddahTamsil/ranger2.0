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
  TextInput,
} from "react-native";
import { getSelectedCateringShop } from "./customerCateringStore";
import { getCateringProducts, createCateringOrder } from "../../services/api";
import {
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileText,
  Info,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  WalletCards,
  Wallet,
  ShieldCheck,
  Banknote,
  Building2,
  QrCode,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import * as Clipboard from "expo-clipboard";
import { CustomerAddress, Nav, CateringPaymentOption, OrderItem } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { addCustomerOrder } from "./customerOrderStore";
import { getPrimaryCustomerAddress } from "../../services/customerAddressService";
import { CustomerAddressSelector } from "../../components/CustomerAddressSelector";

interface CustomerCateringDetailProps extends Nav {
  authAccount?: AuthAccount | null;
}

type FormStep = "form" | "checkout";
type MenuViewMode = "horizontal" | "grid" | "list";

const PRESET_PORTIONS = [10, 15, 20, 30, 50, 100];
const fallbackMenuUri = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80";
const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
type CateringPayMethod = "qris" | "gopay" | "bca_va" | "mandiri_va" | "cod" | "bank_transfer";

interface CateringPaymentMethodItem {
  id: CateringPayMethod;
  name: string;
  subtitle: string;
  badge: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const CATERING_PAYMENT_METHODS: CateringPaymentMethodItem[] = [
  {
    id: "qris",
    name: "QRIS Instan",
    subtitle: "Scan QR via BCA, Mandiri, GoPay, OVO, DANA, ShopeePay",
    badge: "Scan QR",
    color: "#0D9488",
    bgColor: "#CCFBF1",
    icon: QrCode,
  },
  {
    id: "bca_va",
    name: "BCA Virtual Account",
    subtitle: "Verifikasi instan via BCA Mobile, myBCA, atau ATM BCA",
    badge: "VA Otomatis",
    color: "#00529C",
    bgColor: "#DBEAFE",
    icon: Building2,
  },
  {
    id: "mandiri_va",
    name: "Mandiri Virtual Account",
    subtitle: "Verifikasi instan via Livin' by Mandiri atau ATM Mandiri",
    badge: "VA Otomatis",
    color: "#0284C7",
    bgColor: "#E0F2FE",
    icon: Building2,
  },
  {
    id: "gopay",
    name: "GoPay / E-Wallet",
    subtitle: "Pembayaran instan langsung dari saldo dompet digital",
    badge: "E-Wallet",
    color: "#00AED6",
    bgColor: "#ECFEFF",
    icon: Wallet,
  },
  {
    id: "cod",
    name: "Bayar di Tempat (COD / Tunai)",
    subtitle: "Bayar tunai kepada kurir saat pesanan catering sampai",
    badge: "Tunai",
    color: "#16A34A",
    bgColor: "#DCFCE7",
    icon: Banknote,
  },
];

const paymentMethodLabel: Record<CateringPayMethod, string> = {
  qris: "QRIS Instan",
  bca_va: "BCA Virtual Account",
  mandiri_va: "Mandiri Virtual Account",
  gopay: "GoPay / E-Wallet",
  cod: "Bayar di Tempat (COD / Tunai)",
  bank_transfer: "Transfer Bank",
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
  const bankName = selectedCateringShop?.bankName || "BCA Virtual Account";
  const bankAccountNumber = selectedCateringShop?.bankAccountNumber || "82770812345678";
  const bankAccountHolder = selectedCateringShop?.bankAccountHolder || "GEOVERSE Official Escrow";
  const qrisImageUrl = selectedCateringShop?.qrisImageUrl || "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226670016ID.CO.GEOVERSE.WWW011893600998000001000102150000000000000005204581253033605802ID5917GEOVERSE_CATERING6005BOGOR61051614362070703A016304";
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [step, setStep] = useState<FormStep>("form");
  const [menus, setMenus] = useState<any[]>([]);
  const [menuError, setMenuError] = useState("");
  const [menuReloadKey, setMenuReloadKey] = useState(0);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);

  // Portion State: Starts from 10 pax (minimum allowed), NOT 20!
  const [portions, setPortions] = useState(10);
  const [portionsInput, setPortionsInput] = useState("10");
  const [menuViewMode, setMenuViewMode] = useState<MenuViewMode>("horizontal");
  const [detailModalMenu, setDetailModalMenu] = useState<any | null>(null);
  const [modalPortions, setModalPortions] = useState<number>(10);
  const [modalPortionsInput, setModalPortionsInput] = useState("10");
  const [orderNotes, setOrderNotes] = useState("");

  const handlePortionsTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setPortionsInput(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 10) {
      setPortions(num);
    }
  };

  const handlePortionsBlur = () => {
    const num = parseInt(portionsInput, 10);
    if (isNaN(num) || num < 10) {
      setPortions(10);
      setPortionsInput("10");
    } else {
      setPortions(num);
      setPortionsInput(num.toString());
    }
  };

  const handleQuickPortionsSelect = (num: number) => {
    setPortions(num);
    setPortionsInput(num.toString());
  };

  const updatePortions = (delta: number) => {
    setPortions((curr) => {
      const next = Math.max(10, curr + delta);
      setPortionsInput(next.toString());
      return next;
    });
  };

  const handleModalPortionsTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setModalPortionsInput(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 10) {
      setModalPortions(num);
    }
  };

  const handleModalPortionsBlur = () => {
    const num = parseInt(modalPortionsInput, 10);
    if (isNaN(num) || num < 10) {
      setModalPortions(10);
      setModalPortionsInput("10");
    } else {
      setModalPortions(num);
      setModalPortionsInput(num.toString());
    }
  };

  const handleModalQuickPortionsSelect = (num: number) => {
    setModalPortions(num);
    setModalPortionsInput(num.toString());
  };

  const updateModalPortions = (delta: number) => {
    setModalPortions((curr) => {
      const next = Math.max(10, curr + delta);
      setModalPortionsInput(next.toString());
      return next;
    });
  };

  const openMenuPopup = (menu: any) => {
    setDetailModalMenu(menu);
    const initial = selectedMenu?.id === menu.id ? portions : (portions || 10);
    setModalPortions(initial);
    setModalPortionsInput(initial.toString());
  };

  const handleSelectFromPopup = () => {
    if (detailModalMenu) {
      const finalPortions = Math.max(10, modalPortions);
      setSelectedMenu(detailModalMenu);
      setPortions(finalPortions);
      setPortionsInput(finalPortions.toString());
      setDetailModalMenu(null);
    }
  };

  const minSelectableDate = useMemo(() => addDays(new Date(), 2), []);
  const [poDate, setPoDate] = useState(() => formatDate(addDays(new Date(), 2)));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(minSelectableDate.getFullYear(), minSelectableDate.getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date(minSelectableDate));

  const quickPoDates = useMemo(() => [
    { label: "H+2 (Paling Cepat)", date: addDays(new Date(), 2) },
    { label: "H+3", date: addDays(new Date(), 3) },
    { label: "H+4", date: addDays(new Date(), 4) },
  ], []);

  const handleSelectQuickDate = (targetDate: Date) => {
    setSelectedCalendarDate(targetDate);
    setPoDate(formatDate(targetDate));
    setCalendarMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
  };
  const [deliveryTime, setDeliveryTime] = useState("11:00");
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | undefined>();
  const [paymentOption, setPaymentOption] = useState<CateringPaymentOption>("lunas");
  const [paymentMethod, setPaymentMethod] = useState<CateringPayMethod>("qris");
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

  const paymentOptions = CATERING_PAYMENT_METHODS;
  const selectedPaymentObj = CATERING_PAYMENT_METHODS.find((method) => method.id === paymentMethod) || CATERING_PAYMENT_METHODS[0];

  const deliveryFee = 15000;
  const serviceFee = 5000;
  const subtotal = selectedMenu ? selectedMenu.price * portions : 0;
  const total = subtotal + deliveryFee + serviceFee;
  const dpPercent = paymentOption === "dp30" ? 30 : paymentOption === "dp50" ? 50 : 100;
  const plannedDeposit = Math.round((total * dpPercent) / 100);
  const remainingAfterPlannedDeposit = total - plannedDeposit;

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

    setSubmitting(true);
    try {
      const addressSnapshot = selectedAddress || getPrimaryCustomerAddress(authAccount);
      const orderPayload = {
        customerId: authAccount.id,
        ownerId: selectedCateringShop.ownerId,
        productId: selectedMenu.id,
        portions: Math.max(10, portions),
        address: address.trim(),
        addressSnapshot: addressSnapshot || null,
        paymentOption,
        paymentMethod,
        cateringDate: poDate,
        cateringTime: deliveryTime,
        notes: orderNotes.trim() || "Pesanan catering terjadwal",
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
    const handleCopyAccount = async () => {
      if (bankAccountNumber) {
        await Clipboard.setStringAsync(bankAccountNumber);
        Alert.alert("Tersalin", `Nomor rekening ${bankAccountNumber} berhasil disalin ke clipboard.`);
      }
    };

    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Checkout Catering" onBack={() => setStep("form")} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.checkoutBanner}>
            <ReceiptText size={22} color="#1B7A4E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkoutBannerTitle}>Konfirmasi Pesanan Pre-Order (PO)</Text>
              <Text style={styles.checkoutBannerText}>
                Periksa menu, jumlah porsi, jadwal acara, dan skema pembayaran sebelum membuat pesanan.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Detail Pesanan</Text>
          <View style={styles.card}>
            <Text style={styles.menuTitle}>{selectedMenu?.name}</Text>
            <Text style={styles.mutedText}>
              {portions} pax • {selectedCateringShop?.name || "Mitra Catering"}
            </Text>
            <View style={styles.detailRow}>
              <CalendarDays size={17} color="#1B7A4E" />
              <Text style={styles.detailText}>Tanggal Acara (PO): {poDate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Clock3 size={17} color="#1B7A4E" />
              <Text style={styles.detailText}>Estimasi Kirim: {deliveryTime} WIB</Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={17} color="#1B7A4E" />
              <Text style={styles.detailText}>{address}</Text>
            </View>
            {orderNotes.trim() ? (
              <View style={styles.detailRow}>
                <FileText size={17} color="#1B7A4E" />
                <Text style={styles.detailText}>Catatan: "{orderNotes.trim()}"</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
          <View style={styles.card}>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.mutedText}>
                Subtotal Menu ({portions} pax × {formatRupiah(selectedMenu?.price || 0)})
              </Text>
              <Text style={styles.totalText}>{formatRupiah(subtotal)}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.mutedText}>Ongkir Pengantaran</Text>
              <Text style={styles.totalText}>{formatRupiah(deliveryFee)}</Text>
            </View>
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.mutedText}>Biaya Layanan & Kemasan</Text>
              <Text style={styles.totalText}>{formatRupiah(serviceFee)}</Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.paymentSummaryRow}>
              <Text style={styles.financialTotalLabel}>Total Nilai Pesanan</Text>
              <Text style={styles.financialTotalValue}>{formatRupiah(total)}</Text>
            </View>

            {/* Deposit Section */}
            <View style={styles.checkoutDepositBox}>
              <View style={styles.paymentSummaryRow}>
                <View>
                  <Text style={styles.checkoutDepositTitle}>
                    Wajib Dibayar Sekarang ({paymentOption === "lunas" ? "Lunas" : `DP ${dpPercent}%`})
                  </Text>
                  <Text style={styles.checkoutDepositSubtitle}>
                    {paymentOption === "lunas"
                      ? "Pembayaran penuh langsung lunas"
                      : "Uang muka untuk persiapan dapur"}
                  </Text>
                </View>
                <Text style={styles.checkoutDepositAmount}>{formatRupiah(plannedDeposit)}</Text>
              </View>
            </View>

            {remainingAfterPlannedDeposit > 0 ? (
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.mutedText}>Sisa Pelunasan Nanti (Sebelum Pengiriman)</Text>
                <Text style={styles.remainingAfterText}>
                  {formatRupiah(remainingAfterPlannedDeposit)}
                </Text>
              </View>
            ) : null}

            <View style={styles.reminderBox}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.paymentSelectedIconWrapSmall, { backgroundColor: selectedPaymentObj.bgColor }]}>
                    {React.createElement(selectedPaymentObj.icon || Wallet, { size: 16, color: selectedPaymentObj.color, strokeWidth: 2.2 })}
                  </View>
                  <Text style={styles.reminderTitle}>{selectedPaymentObj.name}</Text>
                </View>
                <View style={[styles.paymentBadgePill, { backgroundColor: selectedPaymentObj.bgColor }]}>
                  <Text style={[styles.paymentBadgePillText, { color: selectedPaymentObj.color }]}>
                    {selectedPaymentObj.badge}
                  </Text>
                </View>
              </View>

              {paymentMethod === "bca_va" ? (
                <>
                  <Text style={styles.reminderText}>
                    Nomor Virtual Account BCA:{" "}
                    <Text style={{ fontWeight: "800", color: "#064E3B" }}>8277 0812 3456 7890</Text> a.n.{" "}
                    <Text style={{ fontWeight: "800" }}>GEOVERSE Catering Official</Text>.
                  </Text>
                  <TouchableOpacity
                    style={styles.copyAccountBtn}
                    onPress={async () => {
                      await Clipboard.setStringAsync("8277081234567890");
                      Alert.alert("Tersalin", "Nomor Virtual Account BCA berhasil disalin.");
                    }}
                    activeOpacity={0.8}
                  >
                    <Copy size={14} color="#1B7A4E" />
                    <Text style={styles.copyAccountBtnText}>Salin No. Virtual Account</Text>
                  </TouchableOpacity>
                </>
              ) : paymentMethod === "mandiri_va" ? (
                <>
                  <Text style={styles.reminderText}>
                    Nomor Virtual Account Mandiri:{" "}
                    <Text style={{ fontWeight: "800", color: "#064E3B" }}>8890 8123 4567 890</Text> a.n.{" "}
                    <Text style={{ fontWeight: "800" }}>GEOVERSE Catering Official</Text>.
                  </Text>
                  <TouchableOpacity
                    style={styles.copyAccountBtn}
                    onPress={async () => {
                      await Clipboard.setStringAsync("889081234567890");
                      Alert.alert("Tersalin", "Nomor Virtual Account Mandiri berhasil disalin.");
                    }}
                    activeOpacity={0.8}
                  >
                    <Copy size={14} color="#1B7A4E" />
                    <Text style={styles.copyAccountBtnText}>Salin No. Virtual Account</Text>
                  </TouchableOpacity>
                </>
              ) : paymentMethod === "gopay" ? (
                <Text style={styles.reminderText}>
                  Pembayaran instan langsung diverifikasi otomatis melalui sistem GEOVERSE.
                </Text>
              ) : paymentMethod === "cod" ? (
                <Text style={styles.reminderText}>
                  Siapkan uang tunai pas untuk dibayarkan kepada kurir saat pesanan catering sampai di lokasi Anda.
                </Text>
              ) : paymentMethod === "bank_transfer" ? (
                <>
                  <Text style={styles.reminderText}>
                    Transfer ke <Text style={{ fontWeight: "800" }}>{bankName}</Text> no. rek:{" "}
                    <Text style={{ fontWeight: "800", color: "#064E3B" }}>{bankAccountNumber}</Text> a.n.{" "}
                    <Text style={{ fontWeight: "800" }}>{bankAccountHolder}</Text>.
                  </Text>
                  <TouchableOpacity
                    style={styles.copyAccountBtn}
                    onPress={handleCopyAccount}
                    activeOpacity={0.8}
                  >
                    <Copy size={14} color="#1B7A4E" />
                    <Text style={styles.copyAccountBtnText}>Salin No. Rekening</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.reminderText}>
                    Scan QRIS Nasional melalui aplikasi m-Banking atau E-Wallet (BCA, Mandiri, GoPay, OVO, DANA) setelah pesanan dibuat.
                  </Text>
                  {qrisImageUrl ? (
                    <Image
                      source={{ uri: qrisImageUrl }}
                      style={{ width: 180, height: 180, alignSelf: "center", marginTop: 10, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  ) : null}
                </>
              )}
            </View>
          </View>

          <View style={styles.secureNote}>
            <ShieldAlert size={17} color="#B45309" />
            <Text style={styles.mutedText}>
              DP 30% atau 50% memulai persiapan dapur. Sistem akan mengingatkan bila sisa pembayaran belum selesai. Kurir baru akan mengambil dan mengantar setelah pembayaran terverifikasi dan dapur menandai pesanan siap.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, submitting && { opacity: 0.65 }]}
            disabled={submitting}
            onPress={confirmOrder}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Memproses pesanan…" : "Konfirmasi & Buat Pesanan Catering"}
            </Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
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
        {(() => {
          const coverUri =
            selectedCateringShop?.coverImage ||
            (menus.length > 0 && menus[0]?.img) ||
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80";

          return (
            <View style={styles.coverWrapper}>
              <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
              {selectedCateringShop?.topMenuName ? (
                <View style={styles.topMenuDetailBadge}>
                  <Sparkles size={12} color="#FEF08A" />
                  <Text style={styles.topMenuDetailBadgeText} numberOfLines={1}>
                    Menu Unggulan: {selectedCateringShop.topMenuName}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })()}
        <View style={styles.headerInfoContainer}>
          <View style={styles.headerOwnerRow}>
            {selectedCateringShop?.profilePhoto ? (
              <Image source={{ uri: selectedCateringShop.profilePhoto }} style={styles.ownerAvatar} />
            ) : (
              <View style={styles.ownerAvatarPlaceholder}>
                <ChefHat size={18} color="#1B7A4E" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{selectedCateringShop?.name || "Nama mitra belum tersedia"}</Text>
              <Text style={styles.subtitle}>{selectedCateringShop?.description || "Deskripsi belum tersedia."}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.chatOwnerButton} onPress={() => Alert.alert("Chat setelah order", "Chat pemilik tersedia dari detail pesanan setelah checkout berhasil.")}><MessageCircle size={17} color="#1B7A4E" /><Text style={styles.chatOwnerText}>Chat Pemilik Catering</Text></TouchableOpacity>
        </View>

        {/* Header Pilih Menu & View Switcher */}
        <View style={styles.menuHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Pilih Menu</Text>
            <Text style={styles.menuSubtitle}>{menus.length} pilihan menu tersedia</Text>
          </View>
          <View style={styles.viewModeSwitcher}>
            <TouchableOpacity
              style={[styles.viewModeBtn, menuViewMode === "horizontal" && styles.viewModeBtnActive]}
              onPress={() => setMenuViewMode("horizontal")}
              activeOpacity={0.8}
            >
              <SlidersHorizontal size={13} color={menuViewMode === "horizontal" ? "#FFFFFF" : "#4B5563"} />
              <Text style={[styles.viewModeText, menuViewMode === "horizontal" && styles.viewModeTextActive]}>Mendatar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, menuViewMode === "grid" && styles.viewModeBtnActive]}
              onPress={() => setMenuViewMode("grid")}
              activeOpacity={0.8}
            >
              <LayoutGrid size={13} color={menuViewMode === "grid" ? "#FFFFFF" : "#4B5563"} />
              <Text style={[styles.viewModeText, menuViewMode === "grid" && styles.viewModeTextActive]}>Grid</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, menuViewMode === "list" && styles.viewModeBtnActive]}
              onPress={() => setMenuViewMode("list")}
              activeOpacity={0.8}
            >
              <ListIcon size={13} color={menuViewMode === "list" ? "#FFFFFF" : "#4B5563"} />
              <Text style={[styles.viewModeText, menuViewMode === "list" && styles.viewModeTextActive]}>List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Layout 1: Mendatar (Horizontal Carousel) */}
        {menuViewMode === "horizontal" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollList}
          >
            {menus.map((menu) => {
              const isSelected = selectedMenu?.id === menu.id;
              const isTopMenu = selectedCateringShop?.topMenuName && (
                menu.name.toLowerCase().includes(selectedCateringShop.topMenuName.toLowerCase()) ||
                selectedCateringShop.topMenuName.toLowerCase().includes(menu.name.toLowerCase())
              );
              return (
                <View
                  key={menu.id}
                  style={[styles.horizontalCard, isSelected && styles.horizontalCardSelected]}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => openMenuPopup(menu)}
                    style={styles.horizontalImageWrap}
                  >
                    <Image
                      source={{ uri: menu.img || fallbackMenuUri }}
                      style={styles.horizontalImage}
                      resizeMode="cover"
                    />
                    {isTopMenu ? (
                      <View style={styles.cardTopBadge}>
                        <Sparkles size={11} color="#D97706" />
                        <Text style={styles.cardTopBadgeText}>Favorit</Text>
                      </View>
                    ) : null}
                    <View style={styles.previewDetailChip}>
                      <Eye size={12} color="#FFFFFF" />
                      <Text style={styles.previewDetailChipText}>Detail</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.horizontalCardContent}>
                    <Text style={styles.horizontalMenuName} numberOfLines={1}>{menu.name}</Text>
                    <Text style={styles.horizontalMenuDesc} numberOfLines={2}>
                      {menu.description || "Menu catering higienis & lezat dari mitra terpercaya."}
                    </Text>
                    <Text style={styles.horizontalMenuPrice}>
                      {formatRupiah(menu.price)} <Text style={styles.unitText}>/ pax</Text>
                    </Text>

                    <View style={styles.horizontalActionsRow}>
                      <TouchableOpacity
                        style={styles.actionDetailOutlineBtn}
                        onPress={() => openMenuPopup(menu)}
                      >
                        <Eye size={12} color="#1B7A4E" />
                        <Text style={styles.actionDetailOutlineText}>Detail</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionSelectBtn, isSelected && styles.actionSelectBtnActive]}
                        onPress={() => setSelectedMenu(menu)}
                      >
                        {isSelected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                        <Text style={[styles.actionSelectBtnText, isSelected && styles.actionSelectBtnTextActive]}>
                          {isSelected ? "Dipilih" : "Pilih"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Layout 2: Grid (2-Column Grid) */}
        {menuViewMode === "grid" && (
          <View style={styles.gridListWrap}>
            {menus.map((menu) => {
              const isSelected = selectedMenu?.id === menu.id;
              const isTopMenu = selectedCateringShop?.topMenuName && (
                menu.name.toLowerCase().includes(selectedCateringShop.topMenuName.toLowerCase()) ||
                selectedCateringShop.topMenuName.toLowerCase().includes(menu.name.toLowerCase())
              );
              return (
                <View
                  key={menu.id}
                  style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => openMenuPopup(menu)}
                    style={styles.gridImageWrap}
                  >
                    <Image
                      source={{ uri: menu.img || fallbackMenuUri }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                    {isTopMenu ? (
                      <View style={styles.cardTopBadge}>
                        <Sparkles size={11} color="#D97706" />
                        <Text style={styles.cardTopBadgeText}>Favorit</Text>
                      </View>
                    ) : null}
                    <View style={styles.gridEyePill}>
                      <Eye size={11} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.gridCardContent}>
                    <Text style={styles.gridMenuName} numberOfLines={1}>{menu.name}</Text>
                    <Text style={styles.gridMenuPrice}>
                      {formatRupiah(menu.price)} <Text style={styles.unitText}>/pax</Text>
                    </Text>
                    <Text style={styles.gridMenuDesc} numberOfLines={2}>
                      {menu.description || "Menu hidangan pilihan."}
                    </Text>

                    <View style={styles.gridActionsRow}>
                      <TouchableOpacity
                        style={styles.gridDetailBtn}
                        onPress={() => openMenuPopup(menu)}
                      >
                        <Eye size={11} color="#1B7A4E" />
                        <Text style={styles.gridDetailBtnText}>Detail</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gridSelectBtn, isSelected && styles.gridSelectBtnActive]}
                        onPress={() => setSelectedMenu(menu)}
                      >
                        {isSelected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                        <Text style={[styles.gridSelectBtnText, isSelected && styles.gridSelectBtnTextActive]}>
                          {isSelected ? "Terpilih" : "Pilih"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Layout 3: List (Vertical List) */}
        {menuViewMode === "list" && (
          <View style={styles.verticalListWrap}>
            {menus.map((menu) => {
              const isSelected = selectedMenu?.id === menu.id;
              const isTopMenu = selectedCateringShop?.topMenuName && (
                menu.name.toLowerCase().includes(selectedCateringShop.topMenuName.toLowerCase()) ||
                selectedCateringShop.topMenuName.toLowerCase().includes(menu.name.toLowerCase())
              );
              return (
                <TouchableOpacity
                  key={menu.id}
                  activeOpacity={0.9}
                  style={[styles.listCard, isSelected && styles.listCardSelected]}
                  onPress={() => openMenuPopup(menu)}
                >
                  <View style={styles.listThumbWrap}>
                    <Image
                      source={{ uri: menu.img || fallbackMenuUri }}
                      style={styles.listThumb}
                      resizeMode="cover"
                    />
                    {isTopMenu ? (
                      <View style={styles.listTopBadge}>
                        <Sparkles size={10} color="#D97706" />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.listContent}>
                    <Text style={styles.listMenuName} numberOfLines={1}>{menu.name}</Text>
                    <Text style={styles.listMenuDesc} numberOfLines={2}>
                      {menu.description || "Menu lezat siap saji."}
                    </Text>
                    <View style={styles.listBottomRow}>
                      <Text style={styles.listMenuPrice}>
                        {formatRupiah(menu.price)} <Text style={styles.unitText}>/ pax</Text>
                      </Text>
                      <View style={styles.listActionRight}>
                        <TouchableOpacity
                          style={styles.listDetailChip}
                          onPress={(e) => {
                            e.stopPropagation();
                            openMenuPopup(menu);
                          }}
                        >
                          <Eye size={12} color="#1B7A4E" />
                          <Text style={styles.listDetailChipText}>Detail</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.listRadioCheck, isSelected && styles.listRadioCheckActive]}
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedMenu(menu);
                          }}
                        >
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 2. JUMLAH PORSI (PAX) */}
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Jumlah Porsi Pesanan</Text>
          <Text style={styles.sectionSubtitle}>Tentukan porsi sesuai kebutuhan acara Anda (Minimal 10 pax)</Text>
        </View>

        <View style={styles.portionControlCard}>
          <View style={styles.portionInputRow}>
            <View style={styles.portionLabelCol}>
              <View style={styles.portionLabelRow}>
                <Text style={styles.portionInputLabel}>Pilih Jumlah Porsi</Text>
                <View style={styles.minPaxBadge}>
                  <Text style={styles.minPaxBadgeText}>Min. 10</Text>
                </View>
              </View>
              <Text style={styles.portionSubtotalInfo}>
                {selectedMenu ? `${formatRupiah(selectedMenu.price)} / pax` : "Pilih menu di atas"}
              </Text>
            </View>

            {/* Stepper with Fixed Width & Zero Shrink */}
            <View style={styles.portionInputBox}>
              <TouchableOpacity
                style={[styles.stepperBtn, portions <= 10 && styles.stepperBtnDisabled]}
                onPress={() => updatePortions(-1)}
                disabled={portions <= 10}
                activeOpacity={0.7}
              >
                <Minus size={16} color={portions <= 10 ? "#94A3B8" : "#1B7A4E"} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={styles.paxInputWrapper}>
                <TextInput
                  style={styles.paxTextInput}
                  value={portionsInput}
                  onChangeText={handlePortionsTextChange}
                  onBlur={handlePortionsBlur}
                  keyboardType="number-pad"
                  maxLength={4}
                  selectTextOnFocus
                />
                <Text style={styles.paxInputSuffix}>pax</Text>
              </View>

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => updatePortions(1)}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#1B7A4E" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Preset Portions */}
          <Text style={styles.quickPresetTitle}>Pilihan Cepat Porsi:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetChipsRow}>
            {PRESET_PORTIONS.map((preset) => {
              const isSelected = portions === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetChip, isSelected && styles.presetChipActive]}
                  onPress={() => handleQuickPortionsSelect(preset)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                    {preset} pax
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.portionSubtotalRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color="#15803D" />
              <Text style={styles.portionSubtotalLabel}>Subtotal Menu ({portions} pax):</Text>
            </View>
            <Text style={styles.portionSubtotalValue}>{formatRupiah(subtotal)}</Text>
          </View>
        </View>

        {/* 3. JADWAL PRE-ORDER (PO) & PENGIRIMAN */}
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Jadwal Pre-Order (PO) & Pengiriman</Text>
          <Text style={styles.sectionSubtitle}>Masakan dimasak segar dan diantar tepat waktu</Text>
        </View>

        {/* Banner Penjelasan PO */}
        <View style={styles.poBanner}>
          <Clock3 size={18} color="#065F46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.poBannerTitle}>Sistem Pre-Order (Minimal H+2)</Text>
            <Text style={styles.poBannerText}>
              Hidangan catering dibuat segar khusus untuk pesanan Anda. Pemesanan memerlukan waktu persiapan minimal 2 hari agar kualitas bahan terjaga.
            </Text>
          </View>
        </View>

        {/* Quick Date Chips */}
        <View style={styles.quickDateRow}>
          {quickPoDates.map((item) => {
            const isMatch = isSameDate(item.date, selectedCalendarDate);
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickDateChip, isMatch && styles.quickDateChipActive]}
                onPress={() => handleSelectQuickDate(item.date)}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickDateChipText, isMatch && styles.quickDateChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tanggal Terpilih & Tombol Kalender */}
        <TouchableOpacity
          style={styles.inputCard}
          onPress={() => setDateModalVisible(true)}
          activeOpacity={0.85}
        >
          <CalendarDays size={20} color="#1B7A4E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Tanggal Pengantaran (PO Acara)</Text>
            <Text style={styles.inputValue}>{poDate}</Text>
          </View>
          <View style={styles.calendarPickBadge}>
            <Calendar size={13} color="#1B7A4E" />
            <Text style={styles.calendarPickBadgeText}>Pilih Kalender</Text>
          </View>
        </TouchableOpacity>

        {/* Waktu Pengantaran */}
        <Text style={styles.subFieldLabel}>Estimasi Waktu Tiba Makanan:</Text>
        <View style={styles.timeRow}>
          {[
            { time: "11:00", label: "Makan Siang" },
            { time: "14:00", label: "Acara Sore" },
            { time: "18:00", label: "Makan Malam" },
          ].map(({ time, label }) => {
            const isSelected = deliveryTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeChipNew, isSelected && styles.timeChipNewSelected]}
                onPress={() => setDeliveryTime(time)}
                activeOpacity={0.8}
              >
                <Clock3 size={13} color={isSelected ? "#FFFFFF" : "#1B7A4E"} />
                <View style={{ alignItems: "center" }}>
                  <Text style={[styles.timeChipNewText, isSelected && styles.timeChipNewTextSelected]}>
                    {time}
                  </Text>
                  <Text style={[styles.timeChipSubText, isSelected && styles.timeChipSubTextSelected]}>
                    {label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Catatan Khusus Dapur */}
        <Text style={styles.subFieldLabel}>Catatan Khusus untuk Dapur / Driver (Opsional):</Text>
        <View style={styles.notesInputCard}>
          <FileText size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
          <TextInput
            style={styles.notesInput}
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder="Contoh: Sambal dipisah, makanan sudah harus tiba pukul 11:15 untuk konsumsi rapat."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* 4. ALAMAT PENGIRIMAN */}
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
          <Text style={styles.sectionSubtitle}>Lokasi acara atau pengantaran makanan</Text>
        </View>
        <CustomerAddressSelector
          authAccount={authAccount}
          selectedAddress={selectedAddress}
          onChange={(nextAddress) => {
            setSelectedAddress(nextAddress);
            setAddress(nextAddress.fullAddress);
          }}
          onManageAddresses={() => navigate("c_addresses")}
        />

        {/* 5. SKEMA PEMBAYARAN (BISA DP ATAU LUNAS) */}
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Skema Pembayaran (Bisa DP Dulu atau Lunas)</Text>
          <Text style={styles.sectionSubtitle}>Pilih skema yang paling nyaman untuk anggaran acara Anda</Text>
        </View>

        <View style={styles.dpSchemeContainer}>
          {[
            {
              option: "dp30" as const,
              percent: 30,
              title: "DP 30%",
              tag: "Uang Muka 30%",
              description: "Kunci slot jadwal dapur. Sisa 70% dilunasi sebelum pengiriman.",
            },
            {
              option: "dp50" as const,
              percent: 50,
              title: "DP 50%",
              tag: "Uang Muka 50%",
              description: "Bahan baku langsung dipersiapkan. Sisa 50% dilunasi sebelum pengiriman.",
            },
            {
              option: "lunas" as const,
              percent: 100,
              title: "Lunas 100%",
              tag: "Bayar Penuh Sekaligus",
              description: "Bayar penuh sekarang, praktis dan bebas tanggungan saat hari H.",
            },
          ].map(({ option, percent, title, tag, description }) => {
            const isSelected = paymentOption === option;
            const depositAmount = Math.round((total * percent) / 100);
            return (
              <TouchableOpacity
                key={option}
                style={[styles.dpSchemeCard, isSelected && styles.dpSchemeCardSelected]}
                onPress={() => setPaymentOption(option)}
                activeOpacity={0.88}
              >
                <View style={styles.dpSchemeHeader}>
                  <View style={[styles.dpSchemeBadge, isSelected && styles.dpSchemeBadgeSelected]}>
                    <Text style={[styles.dpSchemeBadgeText, isSelected && styles.dpSchemeBadgeTextSelected]}>
                      {percent}%
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.dpSchemeTitle, isSelected && styles.dpSchemeTitleSelected]}>
                        {title}
                      </Text>
                      <View style={[styles.dpTagPill, isSelected && styles.dpTagPillSelected]}>
                        <Text style={[styles.dpTagPillText, isSelected && styles.dpTagPillTextSelected]}>
                          {tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dpSchemeDesc}>{description}</Text>
                  </View>
                  <View style={[styles.dpSchemeRadio, isSelected && styles.dpSchemeRadioSelected]}>
                    {isSelected && <View style={styles.dpSchemeRadioInner} />}
                  </View>
                </View>

                <View style={styles.dpSchemeBottomRow}>
                  <Text style={styles.dpSchemeAmountLabel}>Yang Dibayar Sekarang:</Text>
                  <Text style={[styles.dpSchemeAmount, isSelected && styles.dpSchemeAmountSelected]}>
                    {formatRupiah(depositAmount)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Penjelasan Skema yang Dipilih */}
        <View style={styles.dpExplanationBanner}>
          <Info size={16} color="#065F46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dpExplanationTitle}>
              {paymentOption === "lunas"
                ? "Pembayaran Lunas Sekaligus"
                : `Anda Memilih Skema ${paymentOption === "dp30" ? "DP 30%" : "DP 50%"}`}
            </Text>
            <Text style={styles.dpExplanationText}>
              {paymentOption === "lunas"
                ? `Pesanan dibayar lunas sekarang sebesar ${formatRupiah(total)}. Hidangan akan diproses dan diantar tanpa perlu pembayaran tambahan saat pengiriman.`
                : `Cukup bayar ${formatRupiah(plannedDeposit)} sekarang untuk konfirmasi pesanan. Sisa tagihan sebesar ${formatRupiah(remainingAfterPlannedDeposit)} dapat dilunasi paling lambat H-1 sebelum hidangan diantar.`}
            </Text>
          </View>
        </View>

        {/* 6. PILIHAN METODE PEMBAYARAN (Marketplace & Send Style) */}
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          <Text style={styles.sectionSubtitle}>Pilih metode pembayaran yang tersedia</Text>
        </View>

        {/* Selected Payment Card (Opens Bottom Sheet Modal) */}
        {(() => {
          const SelectedIcon = selectedPaymentObj.icon || Wallet;
          return (
            <TouchableOpacity
              style={styles.paymentSelectedCard}
              onPress={() => setPaymentModalVisible(true)}
              activeOpacity={0.88}
            >
              <View style={[styles.paymentSelectedIconWrap, { backgroundColor: selectedPaymentObj.bgColor }]}>
                <SelectedIcon size={22} color={selectedPaymentObj.color} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.paymentSelectedName} numberOfLines={1}>{selectedPaymentObj.name}</Text>
                  <View style={[styles.paymentBadgePill, { backgroundColor: selectedPaymentObj.bgColor }]}>
                    <Text style={[styles.paymentBadgePillText, { color: selectedPaymentObj.color }]}>
                      {selectedPaymentObj.badge}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentSelectedSub} numberOfLines={1}>{selectedPaymentObj.subtitle}</Text>
              </View>
              <View style={styles.changeMethodBtn}>
                <Text style={styles.changeMethodText}>Ganti</Text>
                <ChevronRight size={15} color="#1B7A4E" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* Security & Escrow Guarantee */}
        <View style={styles.secureEscrowBox}>
          <ShieldCheck size={16} color="#0D7A53" strokeWidth={2.2} />
          <Text style={styles.secureEscrowText}>
            {paymentMethod === "cod"
              ? "Pembayaran tunai dilakukan langsung kepada kurir saat hidangan catering tiba di lokasi."
              : `Pembayaran ${selectedPaymentObj.name} terverifikasi otomatis melalui sistem escrow GEOVERSE.`}
          </Text>
        </View>

        {/* 7. RINCIAN BIAYA TRANSPARAN */}
        <View style={styles.sectionHeaderSpacing}>
          <Text style={styles.sectionTitle}>Rincian Biaya Transparan</Text>
          <Text style={styles.sectionSubtitle}>Detail lengkap sebelum konfirmasi pesanan</Text>
        </View>

        <View style={styles.financialCard}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>
              Harga Menu ({portions} pax × {formatRupiah(selectedMenu?.price || 0)})
            </Text>
            <Text style={styles.financialValue}>{formatRupiah(subtotal)}</Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Ongkir Pengantaran Kurir</Text>
            <Text style={styles.financialValue}>{formatRupiah(deliveryFee)}</Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Biaya Layanan & Kemasan Higienis</Text>
            <Text style={styles.financialValue}>{formatRupiah(serviceFee)}</Text>
          </View>

          <View style={styles.financialDivider} />

          <View style={styles.financialRow}>
            <Text style={styles.financialTotalLabel}>Total Nilai Pesanan</Text>
            <Text style={styles.financialTotalValue}>{formatRupiah(total)}</Text>
          </View>

          {/* Highlight Pembayaran Sekarang */}
          <View style={styles.depositHighlightBox}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.depositHighlightLabel}>
                  Wajib Dibayar Sekarang ({paymentOption === "lunas" ? "Lunas" : `DP ${dpPercent}%`})
                </Text>
                <View style={styles.nowBadge}>
                  <Text style={styles.nowBadgeText}>BAYAR SEKARANG</Text>
                </View>
              </View>
              <Text style={styles.depositHighlightValue}>{formatRupiah(plannedDeposit)}</Text>
            </View>
          </View>

          {remainingAfterPlannedDeposit > 0 ? (
            <View style={styles.remainingBox}>
              <Text style={styles.remainingLabel}>Sisa Pelunasan Nanti (Sebelum Pengiriman):</Text>
              <Text style={styles.remainingValue}>{formatRupiah(remainingAfterPlannedDeposit)}</Text>
            </View>
          ) : null}
        </View>

        {/* Floating Bottom Bar */}
        <View style={styles.floatingBottomBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.floatingMuted}>
              {portions} pax • {paymentOption === "lunas" ? "Lunas" : `DP ${dpPercent}%`}
            </Text>
            <Text style={styles.floatingPrice}>{formatRupiah(plannedDeposit)}</Text>
            <Text style={styles.floatingSub}>
              {remainingAfterPlannedDeposit > 0
                ? `Sisa ${formatRupiah(remainingAfterPlannedDeposit)} dilunasi nanti`
                : "Sudah lunas penuh 100%"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => {
              if (!selectedMenu) {
                Alert.alert("Pilih Menu", "Pilih menu catering yang diinginkan terlebih dahulu.");
                return;
              }
              if (portions < 10) {
                Alert.alert("Minimal Porsi", "Minimal pemesanan catering adalah 10 pax.");
                return;
              }
              setStep("checkout");
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.floatingButtonText}>Lanjut Checkout</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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

      {/* Modal Bottom Sheet: Pilih Metode Pembayaran (Marketplace Style) */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Pilih Pembayaran</Text>
                <Text style={styles.mutedText}>Metode pembayaran resmi terverifikasi GEOVERSE</Text>
              </View>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
              {CATERING_PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.id;
                const MethodIcon = method.icon;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[styles.paymentMethodCard, selected && styles.paymentMethodCardSelected]}
                    onPress={() => {
                      setPaymentMethod(method.id);
                      setPaymentModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.paymentMethodIconWrap,
                        { backgroundColor: method.bgColor },
                      ]}
                    >
                      <MethodIcon size={22} color={method.color} strokeWidth={2.2} />
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.paymentMethodName, selected && styles.paymentMethodNameSelected]}>
                          {method.name}
                        </Text>
                        <View style={[styles.paymentBadgePill, { backgroundColor: method.bgColor }]}>
                          <Text style={[styles.paymentBadgePillText, { color: method.color }]}>
                            {method.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.paymentMethodDescription}>{method.subtitle}</Text>
                    </View>
                    <View style={[styles.paymentMethodRadio, selected && styles.paymentMethodRadioSelected]}>
                      {selected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Popup Modal Detail Menu */}
      <Modal
        visible={Boolean(detailModalMenu)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalMenu(null)}
      >
        <View style={styles.popupModalOverlay}>
          <View style={styles.popupSheet}>
            <View style={styles.popupHandle} />
            <View style={styles.popupHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.popupHeaderTitle}>Detail Menu Catering</Text>
                <Text style={styles.popupHeaderSubtitle}>{selectedCateringShop?.name || "Mitra Catering"}</Text>
              </View>
              <TouchableOpacity
                style={styles.popupCloseBtn}
                onPress={() => setDetailModalMenu(null)}
              >
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {detailModalMenu ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.popupScrollContent}>
                <View style={styles.popupImageWrap}>
                  <Image
                    source={{ uri: detailModalMenu.img || fallbackMenuUri }}
                    style={styles.popupImage}
                    resizeMode="cover"
                  />
                  {selectedCateringShop?.topMenuName && (
                    detailModalMenu.name.toLowerCase().includes(selectedCateringShop.topMenuName.toLowerCase()) ||
                    selectedCateringShop.topMenuName.toLowerCase().includes(detailModalMenu.name.toLowerCase())
                  ) ? (
                    <View style={styles.popupBadgeSpecial}>
                      <Sparkles size={12} color="#FEF08A" />
                      <Text style={styles.popupBadgeSpecialText}>Menu Unggulan</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.popupBody}>
                  <View style={styles.popupPriceRow}>
                    <Text style={styles.popupTitle}>{detailModalMenu.name}</Text>
                    <Text style={styles.popupPrice}>{formatRupiah(detailModalMenu.price)} <Text style={styles.unitText}>/ pax</Text></Text>
                  </View>

                  <View style={styles.popupPillsRow}>
                    <View style={styles.popupPillGreen}>
                      <Sparkles size={12} color="#065F46" />
                      <Text style={styles.popupPillGreenText}>Menu Segar Dibuat Harian</Text>
                    </View>
                    <View style={styles.popupPillGray}>
                      <Text style={styles.popupPillGrayText}>Min. 10 pax</Text>
                    </View>
                  </View>

                  <Text style={styles.popupDescLabel}>Deskripsi Hidangan</Text>
                  <Text style={styles.popupDescription}>
                    {detailModalMenu.description || "Hidangan catering higienis, dibuat dari bahan-bahan segar pilihan dengan cita rasa khas Nusantara."}
                  </Text>

                  {/* Portion selection inside Popup */}
                  <View style={styles.portionControlCard}>
                    <View style={styles.portionInputRow}>
                      <View style={styles.portionLabelCol}>
                        <View style={styles.portionLabelRow}>
                          <Text style={styles.portionInputLabel}>Pilih Jumlah Porsi</Text>
                          <View style={styles.minPaxBadge}>
                            <Text style={styles.minPaxBadgeText}>Min. 10</Text>
                          </View>
                        </View>
                        <Text style={styles.portionSubtotalInfo}>
                          {formatRupiah(detailModalMenu.price)} / pax
                        </Text>
                      </View>

                      <View style={styles.portionInputBox}>
                        <TouchableOpacity
                          style={[styles.stepperBtn, modalPortions <= 10 && styles.stepperBtnDisabled]}
                          onPress={() => updateModalPortions(-1)}
                          disabled={modalPortions <= 10}
                          activeOpacity={0.7}
                        >
                          <Minus size={16} color={modalPortions <= 10 ? "#94A3B8" : "#1B7A4E"} strokeWidth={2.5} />
                        </TouchableOpacity>

                        <View style={styles.paxInputWrapper}>
                          <TextInput
                            style={styles.paxTextInput}
                            keyboardType="numeric"
                            value={modalPortionsInput}
                            onChangeText={handleModalPortionsTextChange}
                            onBlur={handleModalPortionsBlur}
                            maxLength={4}
                            selectTextOnFocus
                          />
                          <Text style={styles.paxInputSuffix}>pax</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateModalPortions(1)}
                          activeOpacity={0.7}
                        >
                          <Plus size={16} color="#1B7A4E" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Quick Preset Chips in Modal */}
                    <Text style={styles.quickPresetTitle}>Pilihan Cepat:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetChipsRow}>
                      {PRESET_PORTIONS.map((preset) => {
                        const active = modalPortions === preset;
                        return (
                          <TouchableOpacity
                            key={`modal-preset-${preset}`}
                            style={[styles.presetChip, active && styles.presetChipActive]}
                            onPress={() => handleModalQuickPortionsSelect(preset)}
                          >
                            <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                              {preset} pax
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.popupSubtotalRow}>
                    <Text style={styles.popupSubtotalLabel}>Estimasi Subtotal ({modalPortions} pax)</Text>
                    <Text style={styles.popupSubtotalValue}>{formatRupiah(detailModalMenu.price * modalPortions)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.popupActionBtn,
                      selectedMenu?.id === detailModalMenu.id && styles.popupActionBtnSelected,
                    ]}
                    onPress={handleSelectFromPopup}
                  >
                    <CheckCircle2 size={18} color="#FFFFFF" />
                    <Text style={styles.popupActionBtnText}>
                      Gunakan Menu Ini ({modalPortions} pax) • {formatRupiah(detailModalMenu.price * modalPortions)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 16, paddingBottom: 40 },
  coverWrapper: { position: "relative", width: "100%", height: 190, borderRadius: 18, overflow: "hidden", marginBottom: 16, backgroundColor: "#E2E8F0" },
  cover: { width: "100%", height: "100%" },
  topMenuDetailBadge: { position: "absolute", bottom: 10, left: 12, backgroundColor: "rgba(17, 24, 39, 0.85)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, maxWidth: "90%", flexDirection: "row", alignItems: "center", gap: 5 },
  topMenuDetailBadgeText: { color: "#FEF08A", fontSize: 11, fontWeight: "800" },
  headerInfoContainer: { marginBottom: 10 },
  headerOwnerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: "#D1FAE5", backgroundColor: "#E2E8F0", marginTop: 2 },
  ownerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#D1FAE5", marginTop: 2 },
  coverPlaceholder: { width: "100%", height: 190, borderRadius: 18, marginBottom: 16, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#E8F5EE" },
  placeholderText: { color: "#4B5563", fontSize: 11 },
  title: { color: "#111827", fontSize: 23, fontWeight: "900" },
  subtitle: { color: "#6B7280", fontSize: 13, lineHeight: 19, marginTop: 6 },
  chatOwnerButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#E8F5EE", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 12 },
  chatOwnerText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },

  // Menu Header & View Switcher
  menuHeaderRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900" },
  menuSubtitle: { color: "#6B7280", fontSize: 11, marginTop: 2 },
  viewModeSwitcher: { flexDirection: "row", backgroundColor: "#E2E8F0", borderRadius: 10, padding: 3, gap: 2 },
  viewModeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  viewModeBtnActive: { backgroundColor: "#1B7A4E" },
  viewModeText: { color: "#4B5563", fontSize: 11, fontWeight: "700" },
  viewModeTextActive: { color: "#FFFFFF" },

  // Mendatar (Horizontal Scroll) Styles
  horizontalScrollList: { paddingVertical: 4, paddingRight: 16, gap: 12 },
  horizontalCard: { width: 250, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E5E7EB", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  horizontalCardSelected: { borderColor: "#1B7A4E", backgroundColor: "#F0FDF4" },
  horizontalImageWrap: { position: "relative", width: "100%", height: 135, backgroundColor: "#E2E8F0" },
  horizontalImage: { width: "100%", height: "100%" },
  cardTopBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(17, 24, 39, 0.8)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  cardTopBadgeText: { color: "#FEF08A", fontSize: 10, fontWeight: "800" },
  previewDetailChip: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(15, 23, 42, 0.75)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  previewDetailChipText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  horizontalCardContent: { padding: 12 },
  horizontalMenuName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  horizontalMenuDesc: { color: "#6B7280", fontSize: 11, lineHeight: 16, marginTop: 4, minHeight: 32 },
  horizontalMenuPrice: { color: "#1B7A4E", fontSize: 13, fontWeight: "900", marginTop: 6 },
  unitText: { fontSize: 10, fontWeight: "600", color: "#6B7280" },
  horizontalActionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  actionDetailOutlineBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 8, paddingVertical: 6, backgroundColor: "#FFFFFF" },
  actionDetailOutlineText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },
  actionSelectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#E2E8F0", borderRadius: 8, paddingVertical: 6 },
  actionSelectBtnActive: { backgroundColor: "#1B7A4E" },
  actionSelectBtnText: { color: "#374151", fontSize: 11, fontWeight: "800" },
  actionSelectBtnTextActive: { color: "#FFFFFF" },

  // Grid Styles (2 Columns)
  gridListWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  gridCard: { width: "48.5%", backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1.5, borderColor: "#E5E7EB", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  gridCardSelected: { borderColor: "#1B7A4E", backgroundColor: "#F0FDF4" },
  gridImageWrap: { position: "relative", width: "100%", height: 115, backgroundColor: "#E2E8F0" },
  gridImage: { width: "100%", height: "100%" },
  gridEyePill: { position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(15, 23, 42, 0.7)", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gridCardContent: { padding: 10 },
  gridMenuName: { color: "#111827", fontSize: 12, fontWeight: "800" },
  gridMenuPrice: { color: "#1B7A4E", fontSize: 12, fontWeight: "900", marginTop: 4 },
  gridMenuDesc: { color: "#6B7280", fontSize: 10, lineHeight: 14, marginTop: 4, minHeight: 28 },
  gridActionsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  gridDetailBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 7, paddingVertical: 5, backgroundColor: "#FFFFFF" },
  gridDetailBtnText: { color: "#1B7A4E", fontSize: 10, fontWeight: "800" },
  gridSelectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: "#E2E8F0", borderRadius: 7, paddingVertical: 5 },
  gridSelectBtnActive: { backgroundColor: "#1B7A4E" },
  gridSelectBtnText: { color: "#374151", fontSize: 10, fontWeight: "800" },
  gridSelectBtnTextActive: { color: "#FFFFFF" },

  // List Styles (Vertical)
  verticalListWrap: { gap: 10 },
  listCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1.5, borderColor: "#E5E7EB", padding: 11, alignItems: "center" },
  listCardSelected: { borderColor: "#1B7A4E", backgroundColor: "#F0FDF4" },
  listThumbWrap: { position: "relative", width: 72, height: 72, borderRadius: 12, overflow: "hidden", backgroundColor: "#E2E8F0", marginRight: 12 },
  listThumb: { width: "100%", height: "100%" },
  listTopBadge: { position: "absolute", top: 4, left: 4, backgroundColor: "rgba(17, 24, 39, 0.8)", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  listTopBadgeText: { color: "#FEF08A", fontSize: 9, fontWeight: "800" },
  listContent: { flex: 1 },
  listMenuName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  listMenuDesc: { color: "#6B7280", fontSize: 11, lineHeight: 16, marginTop: 3 },
  listBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  listMenuPrice: { color: "#1B7A4E", fontSize: 12, fontWeight: "900" },
  listActionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  listDetailChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5EE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  listDetailChipText: { color: "#1B7A4E", fontSize: 10, fontWeight: "800" },
  listRadioCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  listRadioCheckActive: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },

  // Portions Counter
  counterCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, marginTop: 12 },
  counter: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  counterValue: { color: "#111827", fontSize: 15, fontWeight: "900" },
  menuTitle: { color: "#111827", fontSize: 13, fontWeight: "800" },

  // Inputs & Time
  inputCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5E7EB", padding: 13 },
  inputLabel: { color: "#9CA3AF", fontSize: 10 },
  inputValue: { color: "#111827", fontSize: 13, fontWeight: "800", marginTop: 4 },
  timeRow: { flexDirection: "row", gap: 8, marginTop: 9 },
  timeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#A7F3D0", paddingVertical: 10 },
  timeChipSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  timeText: { color: "#1B7A4E", fontSize: 12, fontWeight: "800" },
  timeTextSelected: { color: "#FFFFFF" },


  // DP Grid
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

  // Bottom Checkout Bar
  totalCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, marginTop: 22 },
  totalText: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 3 },
  primaryButtonSmall: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1B7A4E", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1B7A4E", borderRadius: 13, minHeight: 48, paddingHorizontal: 16, marginTop: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },

  // Checkout Screen
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
  secureNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },

  // Date Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28, maxHeight: "85%" },
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

  // Center / Loading / Empty
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: "#4B5563", fontSize: 13, lineHeight: 19, textAlign: "center", paddingHorizontal: 24 },
  loadingText: { color: "#6B7280", fontSize: 13, marginTop: 10 },

  // Popup Modal Detail Menu Styles
  popupModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.55)" },
  popupSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, maxHeight: "88%" },
  popupHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 12 },
  popupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  popupHeaderTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  popupHeaderSubtitle: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  popupCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  popupScrollContent: { paddingBottom: 20 },
  popupImageWrap: { position: "relative", width: "100%", height: 210, borderRadius: 16, overflow: "hidden", backgroundColor: "#E2E8F0", marginBottom: 16 },
  popupImage: { width: "100%", height: "100%" },
  popupBadgeSpecial: { position: "absolute", bottom: 12, left: 12, backgroundColor: "rgba(17, 24, 39, 0.85)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  popupBadgeSpecialText: { color: "#FEF08A", fontSize: 11, fontWeight: "800" },
  popupBody: { gap: 14 },
  popupPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  popupTitle: { flex: 1, color: "#111827", fontSize: 19, fontWeight: "900", lineHeight: 25 },
  popupPrice: { color: "#1B7A4E", fontSize: 18, fontWeight: "900" },
  popupPillsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  popupPillGreen: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#D1FAE5", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  popupPillGreenText: { color: "#065F46", fontSize: 11, fontWeight: "800" },
  popupPillGray: { backgroundColor: "#F1F5F9", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  popupPillGrayText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  popupDescLabel: { color: "#374151", fontSize: 13, fontWeight: "800", marginTop: 4 },
  popupDescription: { color: "#4B5563", fontSize: 13, lineHeight: 20 },
  popupPortionBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 14, marginTop: 4 },
  popupPortionTitle: { color: "#111827", fontSize: 13, fontWeight: "800" },
  popupPortionSubtitle: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  popupCounter: { flexDirection: "row", alignItems: "center", gap: 12 },
  popupCounterBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  popupCounterValue: { color: "#111827", fontSize: 15, fontWeight: "900" },
  popupSubtotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  popupSubtotalLabel: { color: "#065F46", fontSize: 12, fontWeight: "700" },
  popupSubtotalValue: { color: "#1B7A4E", fontSize: 16, fontWeight: "900" },
  popupActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1B7A4E", borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  popupActionBtnSelected: { backgroundColor: "#0F766E" },
  popupActionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },

  // New Enhanced Portion Styles
  sectionHeaderSpacing: { marginTop: 22, marginBottom: 12 },
  sectionSubtitle: { color: "#6B7280", fontSize: 11, marginTop: 2 },
  quickPresetTitle: { fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 12, marginBottom: 6 },
  portionControlCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 16, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  portionInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  portionLabelCol: { flex: 1, minWidth: 120, justifyContent: "center" },
  portionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  portionInputLabel: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  minPaxBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  minPaxBadgeText: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  portionSubtotalInfo: { color: "#1B7A4E", fontSize: 12, fontWeight: "700", marginTop: 3 },
  portionInputBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 4, borderWidth: 1.5, borderColor: "#E2E8F0", flexShrink: 0 },
  stepperBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  stepperBtnDisabled: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0", opacity: 0.45 },
  paxInputWrapper: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 8, paddingHorizontal: 6, height: 34, width: 72, borderWidth: 1, borderColor: "#CBD5E1" },
  paxTextInput: { width: 34, textAlign: "center", fontSize: 15, fontWeight: "900", color: "#0F172A", padding: 0, margin: 0 },
  paxInputSuffix: { fontSize: 11, fontWeight: "700", color: "#64748B", marginLeft: 1 },
  presetChipsRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  presetChipActive: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  presetChipText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  presetChipTextActive: { color: "#FFFFFF" },
  portionSubtotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F0FDF4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, borderWidth: 1, borderColor: "#BBF7D0" },
  portionSubtotalLabel: { color: "#166534", fontSize: 12, fontWeight: "700" },
  portionSubtotalValue: { color: "#1B7A4E", fontSize: 15, fontWeight: "900" },

  // Enhanced PO & Date/Time Styles
  poBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 14, padding: 12, marginTop: 4, marginBottom: 12 },
  poBannerTitle: { color: "#1E40AF", fontSize: 12, fontWeight: "800" },
  poBannerText: { color: "#2563EB", fontSize: 11, lineHeight: 16, marginTop: 2 },
  quickDateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 10 },
  quickDateChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0" },
  quickDateChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  quickDateText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  quickDateTextActive: { color: "#FFFFFF" },
  quickDateChipText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  quickDateChipTextActive: { color: "#FFFFFF" },
  calendarPickBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  calendarPickBadgeText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },
  subFieldLabel: { color: "#475569", fontSize: 12, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  timeChipNew: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", paddingVertical: 10, paddingHorizontal: 6, alignItems: "center" },
  timeChipNewSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  timeChipNewText: { color: "#1B7A4E", fontSize: 14, fontWeight: "900" },
  timeChipNewTextSelected: { color: "#FFFFFF" },
  timeChipSubText: { color: "#64748B", fontSize: 10, fontWeight: "600", marginTop: 2 },
  timeChipSubTextSelected: { color: "#D1FAE5" },
  notesInputCard: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 10, minHeight: 64 },
  notesInput: { color: "#1E293B", fontSize: 12, lineHeight: 18, padding: 0 },

  // Enhanced DP Scheme Cards
  dpSchemeContainer: { gap: 10, marginTop: 4 },
  dpSchemeCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 14 },
  dpSchemeCardSelected: { borderColor: "#1B7A4E", backgroundColor: "#F0FDF4" },
  dpSchemeHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  dpSchemeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#F1F5F9" },
  dpSchemeBadgeSelected: { backgroundColor: "#1B7A4E" },
  dpSchemeBadgeText: { fontSize: 11, fontWeight: "900", color: "#475569" },
  dpSchemeBadgeTextSelected: { color: "#FFFFFF" },
  dpSchemeTitle: { fontSize: 13, fontWeight: "800", color: "#1E293B" },
  dpSchemeTitleSelected: { color: "#0F766E" },
  dpTagPill: { backgroundColor: "#E2E8F0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dpTagPillSelected: { backgroundColor: "#D1FAE5" },
  dpTagPillText: { fontSize: 9, fontWeight: "700", color: "#475569" },
  dpTagPillTextSelected: { color: "#065F46" },
  dpSchemeDesc: { color: "#64748B", fontSize: 11, lineHeight: 16, marginTop: 8 },
  dpSchemeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  dpSchemeRadioSelected: { borderColor: "#1B7A4E", backgroundColor: "#FFFFFF" },
  dpSchemeRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1B7A4E" },
  dpSchemeBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  dpSchemeAmountLabel: { fontSize: 11, color: "#64748B" },
  dpSchemeAmount: { fontSize: 13, fontWeight: "800", color: "#334155" },
  dpSchemeAmountSelected: { color: "#1B7A4E", fontWeight: "900" },
  dpExplanationBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 11, marginTop: 10 },
  dpExplanationTitle: { color: "#334155", fontSize: 11, fontWeight: "800" },
  dpExplanationText: { color: "#64748B", fontSize: 10, lineHeight: 15, marginTop: 2 },

  // Enhanced Financial Breakdown
  financialCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 15, marginTop: 6 },
  financialRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 4 },
  financialLabel: { color: "#64748B", fontSize: 12 },
  financialValue: { color: "#1E293B", fontSize: 12, fontWeight: "700" },
  financialDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  financialTotalLabel: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  financialTotalValue: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  depositHighlightBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: "#A7F3D0" },
  depositHighlightLabel: { color: "#065F46", fontSize: 12, fontWeight: "800" },
  depositHighlightValue: { color: "#1B7A4E", fontSize: 16, fontWeight: "900" },
  nowBadge: { backgroundColor: "#1B7A4E", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 6 },
  nowBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  remainingBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 12, padding: 10, marginTop: 6, borderWidth: 1, borderColor: "#FDE68A" },
  remainingLabel: { color: "#92400E", fontSize: 11, fontWeight: "700" },
  remainingValue: { color: "#B45309", fontSize: 12, fontWeight: "800" },

  // Bottom Floating Bar
  floatingBottomBar: { position: "relative", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 14, marginTop: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  floatingMuted: { color: "#64748B", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  floatingPrice: { color: "#1B7A4E", fontSize: 18, fontWeight: "900", marginTop: 1 },
  floatingSub: { color: "#94A3B8", fontSize: 10, marginTop: 1 },
  floatingButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1B7A4E", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  floatingButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  // Checkout Screen Extensions
  checkoutDepositBox: { backgroundColor: "#E8F5EE", borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1.5, borderColor: "#A7F3D0" },
  checkoutDepositTitle: { color: "#065F46", fontSize: 13, fontWeight: "900" },
  checkoutDepositSubtitle: { color: "#047857", fontSize: 11, marginTop: 2 },
  checkoutDepositAmount: { color: "#1B7A4E", fontSize: 20, fontWeight: "900", marginTop: 6 },
  remainingAfterText: { color: "#065F46", fontSize: 11, marginTop: 4 },
  copyAccountBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5EE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  copyAccountBtnText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },

  // Unified Clean Payment Styles (Marketplace, Ride, Send style)
  paymentSelectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 15,
    paddingVertical: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentSelectedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentSelectedIconWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentSelectedName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  paymentSelectedSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  paymentBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  paymentBadgePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  changeMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeMethodText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  secureEscrowBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  secureEscrowText: {
    flex: 1,
    color: "#166534",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  paymentSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "80%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  paymentMethodCardSelected: {
    borderColor: "#1B7A4E",
    backgroundColor: "#F0FDF4",
  },
  paymentMethodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodInfo: {
    flex: 1,
    minWidth: 0,
  },
  paymentMethodName: {
    color: "#0F172A",
    fontSize: 13.5,
    fontWeight: "800",
  },
  paymentMethodNameSelected: {
    color: "#065F46",
  },
  paymentMethodDescription: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  paymentMethodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  paymentMethodRadioSelected: {
    borderColor: "#1B7A4E",
    backgroundColor: "#1B7A4E",
  },
});

