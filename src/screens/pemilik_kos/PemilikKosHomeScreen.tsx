import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { fetchRoomsByOwner, fetchOwnerBookings } from "../../services/kostService";
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
} from "lucide-react-native";

interface PemilikKosHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const PemilikKosHomeScreen: React.FC<PemilikKosHomeProps> = ({ navigate, authAccount }) => {
  const [activeTab, setActiveTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("beranda");
  const [rooms, setRooms] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [perluTindakanY, setPerluTindakanY] = useState(0);

  // 12 Months for current year
  const currentYear = new Date().getFullYear();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthsList = monthNames.map(m => `${m} ${currentYear}`);
  const [selectedMonth, setSelectedMonth] = useState(`Agustus ${currentYear}`);
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
      const ownerEmail = authAccount?.email || "aisk@gmail.com";
      const [roomsData, bookingsData] = await Promise.all([
        fetchRoomsByOwner(ownerEmail),
        fetchOwnerBookings(ownerEmail, "dp_submitted"),
      ]);
      if (roomsData && roomsData.length > 0) {
        setRooms(roomsData);
      }
      if (bookingsData && bookingsData.length > 0) {
        setPendingBookings(bookingsData);
      } else {
        setPendingBookings([]);
      }
    } catch (err) {
      console.log("Using default overview stats:", err);
    }
  };

  useEffect(() => {
    load();
  }, [authAccount]);

  const totalKamar = rooms.length > 0 ? rooms.length : 5;
  const kamarTerisi = rooms.length > 0 ? rooms.filter(r => r.status === "terisi" || r.isAvailable === false).length : 2;
  const kamarKosong = totalKamar - kamarTerisi;
  const percentFilled = totalKamar > 0 ? Math.round((kamarTerisi / totalKamar) * 100) : 40;
  const estPendapatan = rooms.length > 0
    ? rooms.reduce((acc, r) => acc + ((r.status === "terisi" || r.isAvailable === false) ? (Number(r.priceMonthly) || parseInt((r.price || "").toString().replace(/[^0-9]/g, "")) || 1500000) : 0), 0)
    : 3300000;
  const vacantRooms = rooms.filter(r => r.status === "kosong" || r.isAvailable === true);

  return (
    <SafeAreaView style={styles.container}>
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
              <Text style={styles.greetingText}>Halo, selamat pagi 🍃</Text>
              <Text style={styles.nameText}>{authAccount?.name ? authAccount.name : "ais kost"}</Text>
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

          {/* Orange Role Pill */}
          <View style={styles.rolePill}>
            <Building2 size={16} color="#FFFFFF" />
            <Text style={styles.rolePillText}>Pemilik Kos</Text>
          </View>
        </View>

        <View style={styles.bodyContent}>
          {/* Section: Ringkasan Bisnis Bulan Ini */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ringkasan Bisnis Bulan Ini</Text>
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
          <View style={styles.incomeCard}>
            <Text style={styles.incomeLabel}>Estimasi Pendapatan</Text>
            <Text style={styles.incomeAmount}>Rp {estPendapatan.toLocaleString("id-ID")}</Text>

            <View style={styles.incomeBadgeRow}>
              <View style={styles.trendBadge}>
                <TrendingUp size={13} color="#0D7A53" />
                <Text style={styles.trendText}>+100%</Text>
              </View>
              <Text style={styles.trendSubtext}>semua kamar aktif</Text>
            </View>

            {/* Wallet Watermark Outline */}
            <View style={styles.walletWatermark}>
              <Wallet size={72} color="rgba(255, 255, 255, 0.08)" />
            </View>
          </View>

          {/* Section: Tingkat Keterisian */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>
            Tingkat Keterisian
          </Text>

          <View style={styles.occupancyRow}>
            {/* Left Donut Chart */}
            <View style={styles.donutContainer}>
              <Svg width={100} height={100} viewBox="0 0 100 100">
                {/* Background Ring */}
                <Circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#E5E7EB"
                  strokeWidth="9"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <Circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#0D7A53"
                  strokeWidth="9"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 38 * (percentFilled / 100)} ${2 * Math.PI * 38 * (1 - percentFilled / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </Svg>
              <View style={styles.donutTextOverlay}>
                <Text style={styles.donutPercentage}>{percentFilled}%</Text>
                <Text style={styles.donutLabel}>Terisi</Text>
              </View>
            </View>

            {/* Right Stat Items */}
            <View style={styles.statListCol}>
              {/* Total Kamar */}
              <View style={styles.statItemRow}>
                <View style={styles.statItemLeft}>
                  <View style={[styles.statIconBg, { backgroundColor: "#E8F5EE" }]}>
                    <Building2 size={16} color="#0D7A53" />
                  </View>
                  <Text style={styles.statItemTitle}>Total Kamar</Text>
                </View>
                <Text style={styles.statItemVal}>{totalKamar}</Text>
              </View>

              {/* Kamar Terisi */}
              <View style={styles.statItemRow}>
                <View style={styles.statItemLeft}>
                  <View style={[styles.statIconBg, { backgroundColor: "#E0F2FE" }]}>
                    <Users size={16} color="#0284C7" />
                  </View>
                  <Text style={styles.statItemTitle}>Kamar Terisi</Text>
                </View>
                <Text style={styles.statItemVal}>{kamarTerisi}</Text>
              </View>

              {/* Kamar Kosong */}
              <View style={[styles.statItemRow, styles.statItemHighlight]}>
                <View style={styles.statItemLeft}>
                  <View style={[styles.statIconBg, { backgroundColor: "#FFEDD5" }]}>
                    <Building2 size={16} color="#EA580C" />
                  </View>
                  <Text style={styles.statItemTitle}>Kamar Kosong</Text>
                </View>
                <Text style={[styles.statItemVal, { color: "#EA580C" }]}>{kamarKosong}</Text>
              </View>
            </View>
          </View>

          {/* Section: Perlu Tindakan */}
          <View
            style={[styles.sectionHeaderRow, { marginTop: 28 }]}
            onLayout={(e) => setPerluTindakanY(e.nativeEvent.layout.y)}
          >
            <Text style={styles.sectionTitle}>Perlu Tindakan</Text>
            <TouchableOpacity style={styles.seeAllLink} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
              <ChevronRight size={14} color="#0D7A53" />
            </TouchableOpacity>
          </View>

          {/* Card 1: Booking Kamar Baru */}
          <View style={[styles.actionCard, { borderLeftColor: "#FF6500" }]}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionHeaderLeft}>
                <View style={[styles.actionIconCircle, { backgroundColor: "#FFF7ED" }]}>
                  <Bell size={16} color="#FF6500" />
                </View>
                <Text style={styles.actionCardTitle}>
                  {pendingBookings.length > 0 ? `Booking Kamar Baru (${pendingBookings.length})` : "Booking Kamar Masuk"}
                </Text>
              </View>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeGreenText}>Baru saja</Text>
              </View>
            </View>

            <Text style={styles.actionDesc}>
              {pendingBookings.length > 0 ? (
                <>
                  <Text style={styles.boldDescText}>{pendingBookings[0].customerName || "Aisyah Putri"}</Text> telah membayar DP Rp {Number(pendingBookings[0].dpAmount || 300000).toLocaleString("id-ID")} untuk Kamar {pendingBookings[0].roomNumber || "101"}.
                </>
              ) : (
                <>
                  <Text style={styles.boldDescText}>Aisyah Putri</Text> telah mengajukan booking untuk kamar kos Anda.
                </>
              )}
            </Text>

            <TouchableOpacity
              style={styles.btnOrangePill}
              onPress={() => navigate("pemilik_kos_verifikasi_dp")}
              activeOpacity={0.8}
            >
              <Text style={styles.btnOrangePillText}>Verifikasi DP</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Tagihan Jatuh Tempo */}
          <View style={[styles.actionCard, { borderLeftColor: "#EF4444" }]}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionHeaderLeft}>
                <View style={[styles.actionIconCircle, { backgroundColor: "#FEE2E2" }]}>
                  <AlertCircle size={16} color="#EF4444" />
                </View>
                <Text style={styles.actionCardTitle}>Tagihan Jatuh Tempo</Text>
              </View>
              <View style={styles.badgeRed}>
                <Text style={styles.badgeRedText}>Hari ini</Text>
              </View>
            </View>

            <Text style={styles.actionDesc}>
              Kamar 04 (Ahmad) jatuh tempo hari ini sebesar <Text style={styles.boldDescText}>Rp 1.500.000</Text>.
            </Text>

            <TouchableOpacity
              style={styles.btnPinkPill}
              onPress={() => navigate("pemilik_kos_kirim_pengingat")}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPinkPillText}>Kirim Pengingat</Text>
            </TouchableOpacity>
          </View>

          {/* Section: Status Kamar Kosong */}
          <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
            <Text style={styles.sectionTitle}>Status Kamar Kosong</Text>
            <TouchableOpacity
              style={styles.seeAllLink}
              onPress={() => navigate("pemilik_kos_manajemen_kamar")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Kelola Kamar</Text>
              <ChevronRight size={14} color="#0D7A53" />
            </TouchableOpacity>
          </View>

          {/* Horizontal Slider of Available Rooms */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomSlider}
          >
            {vacantRooms.length > 0 ? (
              vacantRooms.map((room, idx) => (
                <View key={room.id || idx} style={styles.roomCard}>
                  <View style={styles.roomCardHeader}>
                    <Text style={styles.roomNameTitle}>{room.name}</Text>
                    <View style={styles.badgeGreenSmall}>
                      <Text style={styles.badgeGreenSmallText}>Kosong</Text>
                    </View>
                  </View>
                  <Text style={styles.roomSubtitle}>{room.type || "Tipe Standar"}</Text>

                  <View style={styles.amenitiesRow}>
                    {(room.facilities && room.facilities.length > 0 ? room.facilities.slice(0, 3) : ["AC", "WiFi", "KM Dalam"]).map((fac: string, fIdx: number) => (
                      <View key={fIdx} style={styles.amenityChip}>
                        {fac.toLowerCase().includes("wifi") ? (
                          <Wifi size={12} color="#6B7280" />
                        ) : fac.toLowerCase().includes("km") || fac.toLowerCase().includes("mandi") ? (
                          <ShowerHead size={12} color="#6B7280" />
                        ) : (
                          <Laptop size={12} color="#6B7280" />
                        )}
                        <Text style={styles.amenityText}>{fac}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.roomPriceRow}>
                    <Text style={styles.roomPriceVal}>{typeof room.price === "number" ? `Rp ${room.price.toLocaleString("id-ID")}` : room.price}</Text>
                    <Text style={styles.roomPriceUnit}>/bulan</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.roomCard, { width: 280, justifyContent: "center", alignItems: "center" }]}>
                <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                  Semua kamar terisi penuh.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveTab("beranda")}
          activeOpacity={0.7}
        >
          <Home size={22} color={activeTab === "beranda" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "beranda" && styles.navTextActive]}>
            Beranda
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_kamar")}
          activeOpacity={0.7}
        >
          <Building2 size={22} color={activeTab === "kamar" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "kamar" && styles.navTextActive]}>
            Kamar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_penghuni")}
          activeOpacity={0.7}
        >
          <User size={22} color={activeTab === "penghuni" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "penghuni" && styles.navTextActive]}>
            Penghuni
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_laporan_keuangan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color={activeTab === "keuangan" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "keuangan" && styles.navTextActive]}>
            Keuangan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_profil")}
          activeOpacity={0.7}
        >
          <User size={22} color={activeTab === "profil" ? "#0D7A53" : "#9CA3AF"} />
          <Text style={[styles.navText, activeTab === "profil" && styles.navTextActive]}>
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Picker Modal */}
      <Modal
        visible={isMonthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMonthPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsMonthPickerOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pilih Periode Bulan</Text>
                <Text style={styles.modalSubtitle}>Tahun berjalan {currentYear}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMonthPickerOpen(false)}
                style={styles.closeModalBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.monthListContainer} showsVerticalScrollIndicator={false}>
              {monthsList.map((month) => {
                const isSelected = selectedMonth === month;
                return (
                  <TouchableOpacity
                    key={month}
                    style={[styles.monthOption, isSelected && styles.monthOptionSelected]}
                    onPress={() => {
                      setSelectedMonth(month);
                      setIsMonthPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.monthOptionLeft}>
                      <View style={[styles.monthIconCircle, isSelected && styles.monthIconCircleSelected]}>
                        <Calendar size={15} color={isSelected ? "#FFFFFF" : "#0D7A53"} />
                      </View>
                      <Text style={[styles.monthOptionText, isSelected && styles.monthOptionTextSelected]}>
                        {month}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#0D7A53" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    fontSize: 13,
    color: "#D1FAE5",
    marginBottom: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    position: "absolute",
    top: 9,
    right: 9,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6500",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  rolePillText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  bodyContent: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  incomeCard: {
    backgroundColor: "#0A5237",
    borderRadius: 20,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  incomeLabel: {
    fontSize: 13,
    color: "#A7F3D0",
    fontWeight: "500",
  },
  incomeAmount: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 6,
  },
  incomeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  trendSubtext: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 8,
    opacity: 0.9,
  },
  walletWatermark: {
    position: "absolute",
    right: -10,
    bottom: -10,
  },
  occupancyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  donutTextOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutPercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  donutLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  statListCol: {
    flex: 1,
    gap: 8,
  },
  statItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statItemHighlight: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },
  statItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statItemTitle: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  statItemVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  menuGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 10,
  },
  menuCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  menuIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  menuText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 14,
  },
  seeAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 16,
    marginBottom: 12,
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  badgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeGreenText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  badgeRed: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeRedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
  },
  actionDesc: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  boldDescText: {
    fontWeight: "700",
    color: "#111827",
  },
  btnOrangePill: {
    backgroundColor: "#FF6500",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  btnOrangePillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  btnPinkPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  btnPinkPillText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  roomSlider: {
    gap: 12,
    paddingRight: 20,
  },
  roomCard: {
    width: 210,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  roomCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  roomNameTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  badgeGreenSmall: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeGreenSmallText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0D7A53",
  },
  roomSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  amenitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityText: {
    fontSize: 10,
    color: "#4B5563",
  },
  roomPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  roomPriceVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0D7A53",
  },
  roomPriceUnit: {
    fontSize: 11,
    color: "#6B7280",
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
    marginTop: 3,
  },
  navTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 380,
    maxHeight: 520,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  monthListContainer: {
    maxHeight: 380,
  },
  monthOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F9FAFB",
  },
  monthOptionSelected: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#0D7A53",
  },
  monthOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  monthIconCircleSelected: {
    backgroundColor: "#0D7A53",
  },
  monthOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  monthOptionTextSelected: {
    fontWeight: "700",
    color: "#0D7A53",
  },
});
