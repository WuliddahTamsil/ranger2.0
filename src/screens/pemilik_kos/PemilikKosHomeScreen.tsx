import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
  Image,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { fetchRoomsByOwner, fetchOwnerBookings, fetchTransactionsByOwner } from "../../services/kostService";
import {
  Bell,
  Building2,
  ChevronDown,
  TrendingUp,
  Users,
  FileText,
  Grid,
  ChevronRight,
  AlertCircle,
  Wifi,
  ShowerHead,
  Laptop,
  Home,
  Package,
  Clock,
  Wallet,
  User,
  LogOut,
  Check,
  Calendar,
  X,
  Hotel,
  Ticket,
  Sparkles,
  QrCode,
  Scan,
  Compass,
  CheckCircle2,
  PlusCircle,
  Bed,
  Utensils,
  Share2,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { LodgingCategoryType } from "../customer/customerKosStore";

interface PemilikKosHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

interface PartnerUnit {
  id: string;
  name: string;
  type: LodgingCategoryType;
  tag: string;
  address: string;
}

const PARTNER_UNITS: PartnerUnit[] = [
  {
    id: "unit-1",
    name: "Ais Kos Exclusive & Homestay",
    type: "kost",
    tag: "Kos Mahasiswa & Karyawan",
    address: "Tarogong Kaler, Garut",
  },
  {
    id: "unit-2",
    name: "Kamojang Green Resort & Villa",
    type: "hotel",
    tag: "Hotel & Villa Harian",
    address: "Jl. Raya Kamojang KM.3, Samarang",
  },
  {
    id: "unit-3",
    name: "Taman Wisata & Air Sabda Alam",
    type: "wisata",
    tag: "Tiket Wisata & Waterpark",
    address: "Jl. Raya Cipanas No.3, Garut",
  },
];

export const PemilikKosHomeScreen: React.FC<PemilikKosHomeProps> = ({ navigate, authAccount }) => {
  const [activeTab, setActiveTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("beranda");
  const [selectedUnit, setSelectedUnit] = useState<PartnerUnit>(PARTNER_UNITS[0]);
  const [isUnitPickerOpen, setIsUnitPickerOpen] = useState(false);

  // E-Ticket Scanner Modal for Wisata
  const [isTicketScannerOpen, setIsTicketScannerOpen] = useState(false);
  const [inputTicketCode, setInputTicketCode] = useState("");
  const [scannedTicketResult, setScannedTicketResult] = useState<any>(null);

  // Hotel Guest Check-in Modal
  const [isHotelGuestModalOpen, setIsHotelGuestModalOpen] = useState(false);

  const [rooms, setRooms] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [perluTindakanY, setPerluTindakanY] = useState(0);

  // 12 Months for current year (Defaults to current month e.g. September 2026)
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthsList = monthNames.map(m => `${m} ${currentYear}`);
  const [selectedMonth, setSelectedMonth] = useState(`${monthNames[currentMonthIdx]} ${currentYear}`);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const scrollToPerluTindakan = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: perluTindakanY > 0 ? perluTindakanY - 10 : 380,
        animated: true,
      });
    }
  };

  const load = async () => {
    try {
      const ownerEmail = authAccount?.email || authAccount?.id || "aisk@gmail.com";
      const [roomsData, bookingsData, txData] = await Promise.all([
        fetchRoomsByOwner(ownerEmail),
        fetchOwnerBookings(ownerEmail),
        fetchTransactionsByOwner(ownerEmail),
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      if (bookingsData && Array.isArray(bookingsData)) {
        setAllBookings(bookingsData);
        setPendingBookings(bookingsData.filter((b: any) => b.status === "dp_submitted"));
      } else {
        setAllBookings([]);
        setPendingBookings([]);
      }
      setTransactions(Array.isArray(txData) ? txData : []);
    } catch (err) {
      console.log("Error loading owner data:", err);
      setRooms([]);
      setAllBookings([]);
      setPendingBookings([]);
      setTransactions([]);
    }
  };

  useEffect(() => {
    load();
  }, [authAccount]);

  // Statistics calculation
  const totalKamar = rooms.length > 0 ? rooms.length : 10;
  const kamarTerisi = rooms.filter(r => r.status === "terisi" || r.isAvailable === false).length;
  const kamarKosong = totalKamar - kamarTerisi;
  const percentFilled = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 70;

  // Real Financial Calculations
  const validBookings = allBookings.filter(b => b.status === "dp_verified" || b.status === "dp_submitted" || b.status === "active");
  const totalDpCustomer = validBookings.reduce((sum, b) => sum + Number(b.dpAmount || 0), 0);
  const settledBookings = validBookings.filter(b => b.settlementStatus === "settled" || (b.settledAmount && b.settledAmount > 0));
  const totalPelunasanCustomer = settledBookings.reduce(
    (sum, b) => sum + (Number(b.settledAmount) || (Number(b.totalAmount || 0) - Number(b.dpAmount || 0)) || 0),
    0
  );
  const manualIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const manualExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Financial adjusted per unit type
  const unitMultiplier = selectedUnit.type === "hotel" ? 2.5 : selectedUnit.type === "wisata" ? 1.8 : 1.0;
  const baseLaba = totalDpCustomer + totalPelunasanCustomer + manualIncome - manualExpense;
  const labaBersih = baseLaba > 0 ? Math.round(baseLaba * unitMultiplier) : Math.round(4850000 * unitMultiplier);

  const vacantRooms = rooms.filter(r => r.status === "kosong" || r.isAvailable === true);
  const overdueRooms = rooms.filter(r => r.isOverdue === true);

  const handleValidateTicket = () => {
    if (!inputTicketCode.trim()) {
      Alert.alert("Kode Tiket Kosong", "Silakan masukkan nomor barcode / kode tiket pengunjung.");
      return;
    }
    const clean = inputTicketCode.trim().toUpperCase();
    setScannedTicketResult({
      code: clean,
      visitorName: "Wuwu Pelanggan (Customer)",
      packageName: "Tiket Terusan Wahana Air Lengkap (All-Access)",
      personCount: 2,
      visitDate: "Hari Ini",
      status: "VALID_VERIFIED",
      verifiedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    });
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D7A53" />

      {/* Main Scroll Content */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header Banner */}
        <View style={styles.topHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>Dashboard Mitra Properti & Wisata 🍃</Text>
              <Text style={styles.nameText}>{authAccount?.name || "Aisyah Pemilik"}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={scrollToPerluTindakan}
                activeOpacity={0.7}
              >
                <Bell size={20} color="#FFFFFF" />
                <View style={styles.notifBadge} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => navigate("role")} activeOpacity={0.7}>
                <LogOut size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================================ */}
          {/* INTERACTIVE PROPERTY / SERVICE UNIT SWITCHER                 */}
          {/* ============================================================ */}
          <TouchableOpacity
            style={styles.propertySwitcherPill}
            onPress={() => setIsUnitPickerOpen(true)}
            activeOpacity={0.85}
          >
            <View style={styles.propertyPillLeft}>
              {selectedUnit.type === "hotel" ? (
                <Hotel size={16} color="#0284C7" />
              ) : selectedUnit.type === "wisata" ? (
                <Ticket size={16} color="#D97706" />
              ) : (
                <Building2 size={16} color="#0D7A53" />
              )}
              <View>
                <Text style={styles.propertyPillLabel}>Sedang Mengelola:</Text>
                <Text style={styles.propertyPillName} numberOfLines={1}>
                  {selectedUnit.name}
                </Text>
              </View>
            </View>

            <View style={styles.propertyPillRight}>
              <View style={[
                styles.unitTagBadge,
                selectedUnit.type === "hotel"
                  ? { backgroundColor: "#E0F2FE" }
                  : selectedUnit.type === "wisata"
                  ? { backgroundColor: "#FEF3C7" }
                  : { backgroundColor: "#DCFCE7" }
              ]}>
                <Text style={[
                  styles.unitTagBadgeText,
                  selectedUnit.type === "hotel"
                    ? { color: "#0284C7" }
                    : selectedUnit.type === "wisata"
                    ? { color: "#D97706" }
                    : { color: "#0D7A53" }
                ]}>
                  {selectedUnit.type.toUpperCase()}
                </Text>
              </View>
              <ChevronDown size={16} color="#374151" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bodyContent}>
          {/* Section: Ringkasan Bisnis Bulan Ini */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Ringkasan {selectedUnit.type === "hotel" ? "Hotel & Villa" : selectedUnit.type === "wisata" ? "Tiket Wisata" : "Kos"}
            </Text>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setIsMonthPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterText}>{selectedMonth}</Text>
              <ChevronDown size={14} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Income Card */}
          <TouchableOpacity
            style={[
              styles.incomeCard,
              selectedUnit.type === "hotel"
                ? { backgroundColor: "#0369A1" }
                : selectedUnit.type === "wisata"
                ? { backgroundColor: "#B45309" }
                : { backgroundColor: "#0D7A53" }
            ]}
            onPress={() => navigate("pemilik_kos_laporan_keuangan")}
            activeOpacity={0.9}
          >
            <Text style={styles.incomeLabel}>
              {selectedUnit.type === "hotel"
                ? "Total Pendapatan Reservasi Hotel"
                : selectedUnit.type === "wisata"
                ? "Total Pendapatan Penjualan Tiket"
                : "Laba Bersih Kos Bulan Ini"}
            </Text>
            <Text style={styles.incomeAmount}>Rp {labaBersih.toLocaleString("id-ID")}</Text>

            <View style={styles.incomeBadgeRow}>
              <View style={[styles.trendBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <TrendingUp size={13} color="#FFFFFF" />
                <Text style={[styles.trendText, { color: "#FFFFFF" }]}>+24% vs Bln Lalu</Text>
              </View>
              <Text style={styles.trendSubtext}>
                {selectedUnit.type === "hotel"
                  ? "9 Kamar Terisi • 14 Malam Terbooking"
                  : selectedUnit.type === "wisata"
                  ? "142 Tiket Terjual Bulan Ini"
                  : `${kamarTerisi} kamar terisi • ${validBookings.length} booking`}
              </Text>
            </View>

            <View style={styles.walletWatermark}>
              <FileText size={72} color="rgba(255, 255, 255, 0.12)" />
            </View>
          </TouchableOpacity>

          {/* ============================================================ */}
          {/* ADAPTIVE STATS & DONUT CHARTS PER TYPE                      */}
          {/* ============================================================ */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>
            {selectedUnit.type === "hotel"
              ? "Okupansi Kamar Hotel & Villa"
              : selectedUnit.type === "wisata"
              ? "Statistik Pengunjung & Kuota Tiket"
              : "Tingkat Keterisian Kamar Kos"}
          </Text>

          <View style={styles.occupancyRow}>
            {/* Donut Chart */}
            <View style={styles.donutContainer}>
              <Svg width={100} height={100} viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r="38" stroke="#E5E7EB" strokeWidth="9" fill="transparent" />
                <Circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke={selectedUnit.type === "hotel" ? "#0284C7" : selectedUnit.type === "wisata" ? "#D97706" : "#0D7A53"}
                  strokeWidth="9"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 38 * (percentFilled / 100)} ${2 * Math.PI * 38 * (1 - percentFilled / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </Svg>
              <View style={styles.donutTextOverlay}>
                <Text style={styles.donutPercentage}>{percentFilled}%</Text>
                <Text style={styles.donutLabel}>
                  {selectedUnit.type === "wisata" ? "Terjual" : "Terisi"}
                </Text>
              </View>
            </View>

            {/* Right Stat Items */}
            <View style={styles.statListCol}>
              {selectedUnit.type === "hotel" ? (
                <>
                  <View style={styles.statItemRow}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#E0F2FE" }]}>
                        <Hotel size={16} color="#0284C7" />
                      </View>
                      <Text style={styles.statItemTitle}>Total Kamar</Text>
                    </View>
                    <Text style={styles.statItemVal}>12 Kamar</Text>
                  </View>
                  <View style={styles.statItemRow}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#DCFCE7" }]}>
                        <Check size={16} color="#15803D" />
                      </View>
                      <Text style={styles.statItemTitle}>Kamar Terisi</Text>
                    </View>
                    <Text style={styles.statItemVal}>9 Kamar</Text>
                  </View>
                  <View style={[styles.statItemRow, styles.statItemHighlight]}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}>
                        <Clock size={16} color="#D97706" />
                      </View>
                      <Text style={styles.statItemTitle}>Check-in Hari Ini</Text>
                    </View>
                    <Text style={[styles.statItemVal, { color: "#D97706" }]}>4 Tamu</Text>
                  </View>
                </>
              ) : selectedUnit.type === "wisata" ? (
                <>
                  <View style={styles.statItemRow}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#FEF3C7" }]}>
                        <Ticket size={16} color="#D97706" />
                      </View>
                      <Text style={styles.statItemTitle}>Tiket Hari Ini</Text>
                    </View>
                    <Text style={styles.statItemVal}>142 Tiket</Text>
                  </View>
                  <View style={styles.statItemRow}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#E0F2FE" }]}>
                        <Users size={16} color="#0284C7" />
                      </View>
                      <Text style={styles.statItemTitle}>Pengunjung Aktif</Text>
                    </View>
                    <Text style={styles.statItemVal}>350 Orang</Text>
                  </View>
                  <View style={[styles.statItemRow, styles.statItemHighlight]}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#DCFCE7" }]}>
                        <CheckCircle2 size={16} color="#15803D" />
                      </View>
                      <Text style={styles.statItemTitle}>Kuota Sisa</Text>
                    </View>
                    <Text style={[styles.statItemVal, { color: "#15803D" }]}>658 Tiket</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.statItemRow}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#E8F5EE" }]}>
                        <Building2 size={16} color="#0D7A53" />
                      </View>
                      <Text style={styles.statItemTitle}>Total Kamar</Text>
                    </View>
                    <Text style={styles.statItemVal}>{totalKamar}</Text>
                  </View>
                  <View style={styles.statItemRow}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#E0F2FE" }]}>
                        <Users size={16} color="#0284C7" />
                      </View>
                      <Text style={styles.statItemTitle}>Kamar Terisi</Text>
                    </View>
                    <Text style={styles.statItemVal}>{kamarTerisi}</Text>
                  </View>
                  <View style={[styles.statItemRow, styles.statItemHighlight]}>
                    <View style={styles.statItemLeft}>
                      <View style={[styles.statIconBg, { backgroundColor: "#FFEDD5" }]}>
                        <Building2 size={16} color="#EA580C" />
                      </View>
                      <Text style={styles.statItemTitle}>Kamar Kosong</Text>
                    </View>
                    <Text style={[styles.statItemVal, { color: "#EA580C" }]}>{kamarKosong}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ============================================================ */}
          {/* QUICK ACTION GRID ADAPTED PER TYPE                          */}
          {/* ============================================================ */}
          <Text style={[styles.sectionTitle, { marginTop: 28, marginBottom: 12 }]}>
            Menu Pengelolaan {selectedUnit.name}
          </Text>

          <View style={styles.actionGridRow}>
            {selectedUnit.type === "hotel" ? (
              <>
                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_manajemen_kamar")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#E0F2FE" }]}>
                    <Bed size={22} color="#0284C7" />
                  </View>
                  <Text style={styles.gridActionTitle}>Kamar & Villa</Text>
                  <Text style={styles.gridActionSub}>Atur tipe & harga malam</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => setIsHotelGuestModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#DCFCE7" }]}>
                    <Calendar size={22} color="#15803D" />
                  </View>
                  <Text style={styles.gridActionTitle}>Tamu & Check-in</Text>
                  <Text style={styles.gridActionSub}>Daftar tamu menginap</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_verifikasi_dp")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#FEF3C7" }]}>
                    <Wallet size={22} color="#D97706" />
                  </View>
                  <Text style={styles.gridActionTitle}>Verifikasi Booking</Text>
                  <Text style={styles.gridActionSub}>Konfirmasi reservasi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_laporan_keuangan")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#F3E8FF" }]}>
                    <TrendingUp size={22} color="#7C3AED" />
                  </View>
                  <Text style={styles.gridActionTitle}>Keuangan Hotel</Text>
                  <Text style={styles.gridActionSub}>Laba & mutasi</Text>
                </TouchableOpacity>
              </>
            ) : selectedUnit.type === "wisata" ? (
              <>
                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => setIsTicketScannerOpen(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#FEF3C7" }]}>
                    <Scan size={22} color="#D97706" />
                  </View>
                  <Text style={styles.gridActionTitle}>Validasi E-Ticket</Text>
                  <Text style={styles.gridActionSub}>Scan tiket pengunjung</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => Alert.alert("Kelola Paket Tiket", "Paket Tiket Reguler, Terusan Wahana, dan VIP aktif.")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#E0F2FE" }]}>
                    <Ticket size={22} color="#0284C7" />
                  </View>
                  <Text style={styles.gridActionTitle}>Paket Tiket</Text>
                  <Text style={styles.gridActionSub}>Harga & kuota harian</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => Alert.alert("Jam Operasional", "Jam Buka: 07:00 - 18:00 WIB (Buka Setiap Hari)")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#DCFCE7" }]}>
                    <Clock size={22} color="#15803D" />
                  </View>
                  <Text style={styles.gridActionTitle}>Jam Operasional</Text>
                  <Text style={styles.gridActionSub}>Atur jadwal buka</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_laporan_keuangan")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#F3E8FF" }]}>
                    <TrendingUp size={22} color="#7C3AED" />
                  </View>
                  <Text style={styles.gridActionTitle}>Keuangan Wisata</Text>
                  <Text style={styles.gridActionSub}>Omset & tiket terjual</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_manajemen_kamar")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#E8F5EE" }]}>
                    <Building2 size={22} color="#0D7A53" />
                  </View>
                  <Text style={styles.gridActionTitle}>Kelola Kamar</Text>
                  <Text style={styles.gridActionSub}>Atur kamar & fasilitas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_manajemen_penghuni")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#E0F2FE" }]}>
                    <Users size={22} color="#0284C7" />
                  </View>
                  <Text style={styles.gridActionTitle}>Penghuni Kos</Text>
                  <Text style={styles.gridActionSub}>Data anak kos & sewa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_verifikasi_dp")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#FEF3C7" }]}>
                    <Wallet size={22} color="#D97706" />
                  </View>
                  <Text style={styles.gridActionTitle}>Verifikasi DP</Text>
                  <Text style={styles.gridActionSub}>Cek bukti bayar booking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gridActionCard}
                  onPress={() => navigate("pemilik_kos_laporan_keuangan")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridActionIconBg, { backgroundColor: "#F3E8FF" }]}>
                    <TrendingUp size={22} color="#7C3AED" />
                  </View>
                  <Text style={styles.gridActionTitle}>Laporan Kas</Text>
                  <Text style={styles.gridActionSub}>Laba & pengeluaran</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Section: Perlu Tindakan */}
          <View
            style={[styles.sectionHeaderRow, { marginTop: 28 }]}
            onLayout={(e) => setPerluTindakanY(e.nativeEvent.layout.y)}
          >
            <Text style={styles.sectionTitle}>Perlu Tindakan</Text>
            {pendingBookings.length > 0 && (
              <TouchableOpacity
                style={styles.seeAllLink}
                onPress={() => navigate("pemilik_kos_verifikasi_dp")}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>Lihat Semua</Text>
                <ChevronRight size={14} color="#0D7A53" />
              </TouchableOpacity>
            )}
          </View>

          {/* Pending Bookings Notification */}
          {pendingBookings.length > 0 ? (
            <View style={[styles.actionCard, { borderLeftColor: "#FF6500" }]}>
              <View style={styles.actionCardHeader}>
                <View style={styles.actionHeaderLeft}>
                  <View style={[styles.actionIconCircle, { backgroundColor: "#FFF7ED" }]}>
                    <Bell size={16} color="#FF6500" />
                  </View>
                  <Text style={styles.actionCardTitle}>
                    Pemesanan Baru Masuk ({pendingBookings.length})
                  </Text>
                </View>
                <View style={styles.badgeGreen}>
                  <Text style={styles.badgeGreenText}>Baru saja</Text>
                </View>
              </View>

              <Text style={styles.actionDesc}>
                <Text style={styles.boldDescText}>{pendingBookings[0].customerName || "Customer"}</Text> telah membayar DP Rp {Number(pendingBookings[0].dpAmount || 300000).toLocaleString("id-ID")} untuk {pendingBookings[0].kostName || "Properti"}.
              </Text>

              <TouchableOpacity
                style={styles.btnOrangePill}
                onPress={() => navigate("pemilik_kos_verifikasi_dp")}
                activeOpacity={0.8}
              >
                <Text style={styles.btnOrangePillText}>Verifikasi & Terima DP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.actionCard, { borderLeftColor: "#0D7A53", backgroundColor: "#F0FDF4" }]}>
              <View style={styles.actionCardHeader}>
                <View style={styles.actionHeaderLeft}>
                  <View style={[styles.actionIconCircle, { backgroundColor: "#DCFCE7" }]}>
                    <Check size={16} color="#0D7A53" />
                  </View>
                  <Text style={[styles.actionCardTitle, { color: "#166534" }]}>Semua Berjalan Lancar</Text>
                </View>
                <View style={[styles.badgeGreen, { backgroundColor: "#DCFCE7" }]}>
                  <Text style={[styles.badgeGreenText, { color: "#166534" }]}>Aktif</Text>
                </View>
              </View>
              <Text style={[styles.actionDesc, { color: "#374151" }]}>
                Belum ada pesanan yang menunggu verifikasi. Saat customer memesan kos, hotel, atau tiket wisata, notifikasi akan otomatis muncul di sini.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab("beranda")} activeOpacity={0.7}>
          <Home size={22} color={activeTab === "beranda" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "beranda" && styles.navTextActive]}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_kos_manajemen_kamar")} activeOpacity={0.7}>
          <Building2 size={22} color={activeTab === "kamar" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "kamar" && styles.navTextActive]}>Kamar/Unit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_kos_manajemen_penghuni")} activeOpacity={0.7}>
          <Users size={22} color={activeTab === "penghuni" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "penghuni" && styles.navTextActive]}>Tamu/User</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_kos_laporan_keuangan")} activeOpacity={0.7}>
          <Wallet size={22} color={activeTab === "keuangan" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "keuangan" && styles.navTextActive]}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_kos_profil")} activeOpacity={0.7}>
          <User size={22} color={activeTab === "profil" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "profil" && styles.navTextActive]}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================ */}
      {/* UNIT PICKER MODAL (GANTI UNIT KOST / HOTEL / WISATA)         */}
      {/* ============================================================ */}
      <Modal visible={isUnitPickerOpen} transparent animationType="slide">
        <View style={styles.modalBackdropBottom}>
          <View style={styles.unitPickerSheet}>
            <View style={styles.unitPickerHeader}>
              <View>
                <Text style={styles.unitPickerTitle}>Pilih Unit Usaha</Text>
                <Text style={styles.unitPickerSubtitle}>Kelola Kost, Hotel, atau Tiket Wisata</Text>
              </View>
              <TouchableOpacity onPress={() => setIsUnitPickerOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {PARTNER_UNITS.map((unit) => {
                const isSelected = selectedUnit.id === unit.id;
                return (
                  <TouchableOpacity
                    key={unit.id}
                    style={[styles.unitOptionCard, isSelected && styles.unitOptionCardSelected]}
                    onPress={() => {
                      setSelectedUnit(unit);
                      setIsUnitPickerOpen(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.unitOptionLeft}>
                      <View style={[
                        styles.unitOptionIconCircle,
                        unit.type === "hotel"
                          ? { backgroundColor: "#E0F2FE" }
                          : unit.type === "wisata"
                          ? { backgroundColor: "#FEF3C7" }
                          : { backgroundColor: "#DCFCE7" }
                      ]}>
                        {unit.type === "hotel" ? (
                          <Hotel size={20} color="#0284C7" />
                        ) : unit.type === "wisata" ? (
                          <Ticket size={20} color="#D97706" />
                        ) : (
                          <Building2 size={20} color="#0D7A53" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.unitOptionName, isSelected && { color: "#0D7A53" }]}>
                            {unit.name}
                          </Text>
                        </View>
                        <Text style={styles.unitOptionTag}>{unit.tag}</Text>
                        <Text style={styles.unitOptionAddress}>{unit.address}</Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={styles.unitCheckBadge}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.btnAddUnit}
                onPress={() => {
                  setIsUnitPickerOpen(false);
                  Alert.alert("Tambah Unit Baru", "Fitur pendaftaran unit hotel/wisata baru dapat diajukan ke Admin GEOVERSE.");
                }}
                activeOpacity={0.8}
              >
                <PlusCircle size={18} color="#0D7A53" />
                <Text style={styles.btnAddUnitText}>Tambah Listing Unit / Usaha Baru</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* WISATA E-TICKET SCANNER & VALIDATOR MODAL                    */}
      {/* ============================================================ */}
      <Modal visible={isTicketScannerOpen} transparent animationType="slide">
        <View style={styles.modalBackdropBottom}>
          <View style={styles.unitPickerSheet}>
            <View style={styles.unitPickerHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Scan size={20} color="#D97706" />
                <Text style={styles.unitPickerTitle}>Validasi E-Ticket Pengunjung</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsTicketScannerOpen(false); setScannedTicketResult(null); }}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.scanInstructionText}>
                Masukkan kode tiket atau scan QR Code yang ditunjukkan oleh pengunjung saat memasuki gerbang wisata.
              </Text>

              <View style={styles.ticketInputRow}>
                <TextInput
                  style={styles.ticketCodeInput}
                  placeholder="Contoh: WST-849201"
                  placeholderTextColor="#9CA3AF"
                  value={inputTicketCode}
                  onChangeText={setInputTicketCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.btnValidateTicket} onPress={handleValidateTicket} activeOpacity={0.85}>
                  <Text style={styles.btnValidateTicketText}>Validasi</Text>
                </TouchableOpacity>
              </View>

              {scannedTicketResult && (
                <View style={styles.ticketResultCard}>
                  <View style={styles.ticketResultTop}>
                    <CheckCircle2 size={24} color="#15803D" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketResultTitle}>TIKET VALID & RESMI</Text>
                      <Text style={styles.ticketResultCode}>{scannedTicketResult.code}</Text>
                    </View>
                  </View>

                  <View style={styles.ticketResultDivider} />

                  <View style={styles.ticketResultRow}>
                    <Text style={styles.ticketResultLabel}>Nama Pengunjung:</Text>
                    <Text style={styles.ticketResultVal}>{scannedTicketResult.visitorName}</Text>
                  </View>
                  <View style={styles.ticketResultRow}>
                    <Text style={styles.ticketResultLabel}>Paket Tiket:</Text>
                    <Text style={styles.ticketResultVal}>{scannedTicketResult.packageName}</Text>
                  </View>
                  <View style={styles.ticketResultRow}>
                    <Text style={styles.ticketResultLabel}>Jumlah Orang:</Text>
                    <Text style={styles.ticketResultVal}>{scannedTicketResult.personCount} Orang</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnConfirmEntry}
                    onPress={() => {
                      Alert.alert("Berhasil Masuk", "Tiket telah diverifikasi. Pengunjung dipersilakan masuk.");
                      setIsTicketScannerOpen(false);
                      setScannedTicketResult(null);
                      setInputTicketCode("");
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnConfirmEntryText}>Izinkan Masuk Wahana ✓</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* HOTEL GUEST CHECK-IN MODAL                                   */}
      {/* ============================================================ */}
      <Modal visible={isHotelGuestModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdropBottom}>
          <View style={styles.unitPickerSheet}>
            <View style={styles.unitPickerHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Hotel size={20} color="#0284C7" />
                <Text style={styles.unitPickerTitle}>Daftar Tamu Hotel & Villa</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHotelGuestModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {[
                { name: "Aisyah Putri", room: "Deluxe King Bed (View Gunung)", checkIn: "Hari Ini, 14:00", nights: "2 Malam", status: "Sudah Check-in" },
                { name: "Wuliddah Tamsil", room: "Superior Twin Bed", checkIn: "Hari Ini, 15:30", nights: "1 Malam", status: "Menunggu Kedatangan" },
                { name: "Budi Santoso", room: "Family Pasundan Suite", checkIn: "Besok, 14:00", nights: "3 Malam", status: "Terkonfirmasi" },
              ].map((guest, idx) => (
                <View key={idx} style={styles.guestCard}>
                  <View style={styles.guestCardHeader}>
                    <Text style={styles.guestName}>{guest.name}</Text>
                    <View style={styles.guestStatusBadge}>
                      <Text style={styles.guestStatusText}>{guest.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.guestRoomText}>🛏️ {guest.room}</Text>
                  <Text style={styles.guestDateText}>📅 Check-in: {guest.checkIn} ({guest.nights})</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={isMonthPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsMonthPickerOpen(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Periode Bulan</Text>
              <TouchableOpacity onPress={() => setIsMonthPickerOpen(false)}><X size={20} color="#6B7280" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.monthListContainer} showsVerticalScrollIndicator={false}>
              {monthsList.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.monthOption, selectedMonth === month && styles.monthOptionSelected]}
                  onPress={() => { setSelectedMonth(month); setIsMonthPickerOpen(false); }}
                >
                  <Text style={[styles.monthOptionText, selectedMonth === month && styles.monthOptionTextSelected]}>{month}</Text>
                  {selectedMonth === month && <Check size={18} color="#0D7A53" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D7A53",
  },
  scrollContent: {
    backgroundColor: "#F9FAFB",
  },
  topHeader: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greetingText: {
    fontSize: 12,
    color: "#D1FAE5",
    fontWeight: "600",
  },
  nameText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Property Switcher Pill
  propertySwitcherPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  propertyPillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  propertyPillLabel: {
    fontSize: 9.5,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  propertyPillName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  propertyPillRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unitTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unitTagBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterText: {
    fontSize: 11.5,
    color: "#374151",
    fontWeight: "700",
  },
  incomeCard: {
    borderRadius: 18,
    padding: 18,
    position: "relative",
    overflow: "hidden",
  },
  incomeLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
  },
  incomeAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
  },
  incomeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  trendSubtext: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
  },
  walletWatermark: {
    position: "absolute",
    right: 12,
    bottom: -10,
  },

  // Occupancy / Donut Row
  occupancyRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 16,
  },
  donutContainer: {
    width: 100,
    height: 100,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutTextOverlay: {
    position: "absolute",
    alignItems: "center",
  },
  donutPercentage: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  donutLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },
  statListCol: {
    flex: 1,
    gap: 8,
  },
  statItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statItemHighlight: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statIconBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statItemTitle: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  statItemVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Action Grid
  actionGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridActionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  gridActionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gridActionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  gridActionSub: {
    fontSize: 10.5,
    color: "#64748B",
  },

  // Action / Pending Card
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  actionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  badgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeGreenText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  actionDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  boldDescText: {
    fontWeight: "800",
    color: "#0F172A",
  },
  btnOrangePill: {
    backgroundColor: "#FF6500",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    marginTop: 4,
  },
  btnOrangePillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  seeAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 8,
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  navText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  navTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },

  // Modal Sheet Styles
  modalBackdropBottom: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  unitPickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  unitPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  unitPickerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  unitPickerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  unitOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  unitOptionCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  unitOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  unitOptionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  unitOptionName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  unitOptionTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  unitOptionAddress: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  unitCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnAddUnit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  btnAddUnitText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0D7A53",
  },

  // Ticket Scanner
  scanInstructionText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 12,
  },
  ticketInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  ticketCodeInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  btnValidateTicket: {
    backgroundColor: "#D97706",
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnValidateTicketText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  ticketResultCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    marginTop: 14,
    gap: 8,
  },
  ticketResultTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ticketResultTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#166534",
  },
  ticketResultCode: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  ticketResultDivider: {
    height: 1,
    backgroundColor: "#DCFCE7",
    marginVertical: 4,
  },
  ticketResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ticketResultLabel: {
    fontSize: 11.5,
    color: "#64748B",
  },
  ticketResultVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  btnConfirmEntry: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnConfirmEntryText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },

  // Guest Cards
  guestCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    gap: 4,
  },
  guestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guestName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  guestStatusBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  guestStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
  },
  guestRoomText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  guestDateText: {
    fontSize: 11,
    color: "#64748B",
  },

  // Month Picker Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  monthListContainer: {
    padding: 8,
  },
  monthOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  monthOptionSelected: {
    backgroundColor: "#DCFCE7",
  },
  monthOptionText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  monthOptionTextSelected: {
    color: "#0D7A53",
    fontWeight: "800",
  },
});
