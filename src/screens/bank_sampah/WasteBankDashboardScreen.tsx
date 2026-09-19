import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Building2,
  Scale,
  Sparkles,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  LogOut,
  RefreshCw,
  Search,
  Tag,
  DollarSign,
  Phone,
  MapPin,
  X,
  Check,
  User,
  ShieldCheck,
  Calendar,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { useRecycle } from "../../context/RecycleContext";
import {
  getBankDeposits,
  getWasteBanks,
  getWasteBankPrices,
  getWasteDepositById,
  updateWasteBankOperational,
} from "../../services/recycleService";
import { WasteBankUI, WasteDepositUI, WasteCategoryPriceUI } from "../../types/recycleTypes";
import { rp } from "../../utils/formatters";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

type TabQueue = "WEIGHING" | "WAITING" | "COMPLETED";

const PRESET_HOURS = [
  "Senin - Sabtu, 08:00 - 16:00",
  "Setiap Hari, 07:30 - 17:00",
  "Senin - Jumat, 08:30 - 15:30",
  "Senin - Minggu, 08:00 - 17:00",
];

export const WasteBankDashboardScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const { setSelectedDeposit, setSelectedBank } = useRecycle();
  const [bank, setBank] = useState<WasteBankUI | null>(null);
  const [deposits, setDeposits] = useState<WasteDepositUI[]>([]);
  const [activeQueue, setActiveQueue] = useState<TabQueue>("WEIGHING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search by code
  const [searchCode, setSearchCode] = useState("");
  const [searchError, setSearchError] = useState("");

  // Price Catalog View Modal (Read-only standardized prices)
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [priceCatalog, setPriceCatalog] = useState<WasteCategoryPriceUI[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Operating Hours Management Modal
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [inputHours, setInputHours] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSuccessMsg, setHoursSuccessMsg] = useState("");

  // Logout Confirm Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Find bank belonging to this owner / officer or fallback to first active bank
      const banksRes = await getWasteBanks();
      if (banksRes.success && Array.isArray(banksRes.data) && banksRes.data.length > 0) {
        const userEmail = (authAccount?.email || "").toLowerCase().trim();
        const userName = (authAccount?.name || "").toLowerCase().trim();
        const roleUnit = (authAccount?.roleData?.nama_unit || "").toLowerCase().trim();
        const userId = authAccount?.id;

        let myBank = banksRes.data.find(
          (b) =>
            (userId && b.ownerId === userId) ||
            (userId && b.officerIds && Array.isArray(b.officerIds) && b.officerIds.includes(userId)) ||
            (userEmail && b.officerEmails && Array.isArray(b.officerEmails) && b.officerEmails.includes(userEmail))
        );

        if (!myBank && roleUnit) {
          myBank = banksRes.data.find(
            (b) =>
              b.name.toLowerCase() === roleUnit ||
              roleUnit.includes(b.name.toLowerCase()) ||
              b.name.toLowerCase().includes(roleUnit)
          );
        }

        if (!myBank && userName) {
          myBank = banksRes.data.find(
            (b) =>
              userName.includes(b.name.toLowerCase()) ||
              b.name.toLowerCase().includes(userName)
          );
        }

        if (!myBank && userEmail) {
          if (userEmail.includes("sumurbandung") || userEmail.includes("merdeka")) {
            myBank = banksRes.data.find((b) => b.name.toLowerCase().includes("merdeka"));
          } else if (userEmail.includes("bandung") || userEmail.includes("dago") || userEmail.includes("coblong")) {
            myBank = banksRes.data.find((b) => b.name.toLowerCase().includes("hijau") || b.name.toLowerCase().includes("dago"));
          } else if (userEmail.includes("garutkota") || userEmail.includes("cimanuk")) {
            myBank = banksRes.data.find((b) => b.name.toLowerCase().includes("berkah") || b.name.toLowerCase().includes("cimanuk"));
          } else if (userEmail.includes("kamojang") || userEmail.includes("banksampah@geoverse")) {
            myBank = banksRes.data.find((b) => b.name.toLowerCase().includes("kamojang"));
          }
        }

        if (!myBank) {
          myBank = banksRes.data[0];
        }

        setBank(myBank);
        setSelectedBank(myBank);
        if (!inputHours) {
          setInputHours(myBank.openingHours || "Senin - Sabtu, 08:00 - 16:00");
          setPickupEnabled(myBank.acceptsPickup !== false);
        }

        const depRes = await getBankDeposits(myBank._id);
        if (depRes.success && Array.isArray(depRes.data)) {
          setDeposits(depRes.data);
        }
      }
    } catch (err) {
      console.error("loadDashboard error:", err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    // Auto refresh every 3 seconds to catch newly created customer tickets instantly
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 3000);

    const onWindowFocus = () => {
      loadDashboard(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", onWindowFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onWindowFocus);
      }
    };
  }, [authAccount?.id, authAccount?.email]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleOpenPriceModal = async () => {
    if (!bank) return;
    setPriceModalVisible(true);
    setLoadingPrices(true);
    try {
      const res = await getWasteBankPrices(bank._id);
      if (res.success && Array.isArray(res.data)) {
        setPriceCatalog(res.data);
      }
    } catch (err) {
      console.error("fetch prices error:", err);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleOpenHoursModal = () => {
    if (bank) {
      setInputHours(bank.openingHours || "Senin - Sabtu, 08:00 - 16:00");
      setPickupEnabled(bank.acceptsPickup !== false);
    }
    setHoursSuccessMsg("");
    setHoursModalVisible(true);
  };

  const handleSaveOperatingHours = async () => {
    if (!bank) return;
    const hours = inputHours.trim();
    if (!hours) return;

    setSavingHours(true);
    setHoursSuccessMsg("");
    try {
      const res = await updateWasteBankOperational(bank._id, {
        openingHours: hours,
        acceptsPickup: pickupEnabled,
      });
      if (res.success && res.data) {
        setBank(res.data);
        setSelectedBank(res.data);
        setHoursSuccessMsg("Jam operasional & layanan berhasil diperbarui!");
        setTimeout(() => {
          setHoursModalVisible(false);
          setHoursSuccessMsg("");
        }, 1200);
      }
    } catch (err) {
      console.error("save operating hours error:", err);
    } finally {
      setSavingHours(false);
    }
  };

  // Quick ticket search
  const handleSearchTicket = async () => {
    setSearchError("");
    const query = searchCode.trim().toUpperCase();
    if (!query) return;

    let matched = deposits.find(
      (d) => d.depositCode.toUpperCase().includes(query) || d._id.includes(query)
    );

    if (!matched) {
      try {
        const res = await getWasteDepositById(query);
        if (res.success && res.data) {
          matched = res.data;
        }
      } catch (e) {
        console.error("search api error:", e);
      }
    }

    if (matched) {
      setSelectedDeposit(matched);
      setSearchCode("");
      navigate("bank_sampah_weighing");
    } else {
      setSearchError(`Tiket "${query}" tidak ditemukan dalam antrean aktif unit ini.`);
    }
  };

  // Metrics
  const waitingWeighing = deposits.filter((d) =>
    ["REQUESTED", "ACCEPTED", "PICKED_UP", "AT_BANK", "WEIGHING"].includes(d.status)
  );
  const waitingCustomerConfirm = deposits.filter(
    (d) => d.status === "WAITING_CUSTOMER_CONFIRMATION"
  );
  const completedDeposits = deposits.filter(
    (d) => d.status === "COMPLETED" || d.status === "POINT_ISSUED"
  );
  const totalKg = deposits.reduce(
    (sum, d) => sum + (d.actualTotalWeightKg || d.estimatedTotalWeightKg || 0),
    0
  );
  const totalPointsIssued = completedDeposits.reduce((sum, d) => sum + (d.finalPoint || 0), 0);

  const getFilteredQueue = () => {
    switch (activeQueue) {
      case "WEIGHING":
        return waitingWeighing;
      case "WAITING":
        return waitingCustomerConfirm;
      case "COMPLETED":
        return completedDeposits;
      default:
        return [];
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Top App Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("role")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerMainTitle}>Panel Bank Sampah</Text>
          <Text style={styles.headerSubUnit} numberOfLines={1}>
            {bank?.name || "Unit Bank Sampah"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => onRefresh()}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color="#15803D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSwitchCustomer}
            onPress={() => navigate("c_home")}
            activeOpacity={0.7}
          >
            <User size={13} color="#15803D" />
            <Text style={styles.btnSwitchCustomerText}>Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.7}
          >
            <LogOut size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />
        }
      >
        {/* Officer & Unit Profile Card */}
        <View style={styles.unitCard}>
          <View style={styles.unitCardTop}>
            <View style={styles.unitAvatar}>
              <Building2 size={22} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.unitTagRow}>
                <View style={styles.statusLivePill}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.statusLiveText}>Menerima Setoran</Text>
                </View>
                {bank?.acceptsPickup && (
                  <View style={styles.pickupPill}>
                    <Truck size={10} color="#0284C7" />
                    <Text style={styles.pickupPillText}>Pickup Aktif</Text>
                  </View>
                )}
              </View>
              <Text style={styles.unitFullName} numberOfLines={2}>
                {bank?.name || "Bank Sampah Induk"}
              </Text>
              <Text style={styles.officerName} numberOfLines={1}>
                Petugas: {authAccount?.name || "Pengelola Bank Sampah"}
              </Text>
            </View>
          </View>

          <View style={styles.unitDetailsRow}>
            <View style={styles.unitDetailItem}>
              <MapPin size={12} color="#64748B" />
              <Text style={styles.unitDetailText} numberOfLines={1}>
                {bank?.address || "Garut, Jawa Barat"}
              </Text>
            </View>
            <View style={styles.unitDetailItem}>
              <Clock size={12} color="#15803D" />
              <Text style={[styles.unitDetailText, { color: "#15803D", fontWeight: "700" }]} numberOfLines={1}>
                Jam Operasional: {bank?.openingHours || "Senin - Sabtu, 08:00 - 16:00"}
              </Text>
            </View>
          </View>

          {/* Quick Action Buttons: Atur Jam & Lihat Katalog Harga */}
          <View style={styles.unitActionGrid}>
            <TouchableOpacity
              style={[styles.unitActionBtn, { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" }]}
              onPress={handleOpenHoursModal}
              activeOpacity={0.8}
            >
              <Clock size={13} color="#15803D" />
              <Text style={[styles.unitActionBtnText, { color: "#15803D" }]}>Atur Jam Buka-Tutup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.unitActionBtn}
              onPress={handleOpenPriceModal}
              activeOpacity={0.8}
            >
              <Tag size={13} color="#0284C7" />
              <Text style={[styles.unitActionBtnText, { color: "#0284C7" }]}>Katalog Harga</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Search Ticket by Code */}
        <View style={styles.searchSection}>
          <Text style={styles.searchSectionTitle}>Cari & Timbang Tiket Nasabah</Text>
          <View style={styles.searchBox}>
            <Search size={16} color="#64748B" style={{ marginLeft: 4 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Masukkan kode setor (cth: DEP-...)"
              placeholderTextColor="#94A3B8"
              value={searchCode}
              onChangeText={(text) => {
                setSearchCode(text);
                if (searchError) setSearchError("");
              }}
              onSubmitEditing={handleSearchTicket}
              autoCapitalize="characters"
            />
            {searchCode.length > 0 && (
              <TouchableOpacity
                style={styles.btnSearchAction}
                onPress={handleSearchTicket}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSearchActionText}>Timbang</Text>
                <ChevronRight size={13} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          {searchError ? <Text style={styles.searchErrorText}>{searchError}</Text> : null}
        </View>

        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Scale size={16} color="#15803D" />
            </View>
            <Text style={styles.metricVal}>{totalKg.toFixed(1)} kg</Text>
            <Text style={styles.metricLabel}>Total Sampah</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: "#FEF08A" }]}>
              <Sparkles size={16} color="#CA8A04" />
            </View>
            <Text style={styles.metricVal}>{totalPointsIssued.toLocaleString("id-ID")}</Text>
            <Text style={styles.metricLabel}>Poin Disalurkan</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: "#FFEDD5" }]}>
              <Clock size={16} color="#EA580C" />
            </View>
            <Text style={styles.metricVal}>{waitingWeighing.length}</Text>
            <Text style={styles.metricLabel}>Perlu Ditimbang</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: "#EFF6FF", borderColor: "#DBEAFE" }]}>
            <View style={[styles.metricIconCircle, { backgroundColor: "#DBEAFE" }]}>
              <CheckCircle2 size={16} color="#2563EB" />
            </View>
            <Text style={styles.metricVal}>{completedDeposits.length}</Text>
            <Text style={styles.metricLabel}>Setoran Selesai</Text>
          </View>
        </View>

        {/* Queue Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Antrean & Penimbangan Sampah</Text>
          <Text style={styles.sectionBadge}>{deposits.length} Total</Text>
        </View>

        {/* Segmented Queue Tabs (Single Line, No Wrap) */}
        <View style={styles.queueTabBar}>
          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "WEIGHING" && styles.queueTabActive]}
            onPress={() => setActiveQueue("WEIGHING")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.queueTabText,
                activeQueue === "WEIGHING" && styles.queueTabTextActive,
              ]}
              numberOfLines={1}
            >
              Timbang ({waitingWeighing.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "WAITING" && styles.queueTabActive]}
            onPress={() => setActiveQueue("WAITING")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.queueTabText,
                activeQueue === "WAITING" && styles.queueTabTextActive,
              ]}
              numberOfLines={1}
            >
              Menunggu ({waitingCustomerConfirm.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "COMPLETED" && styles.queueTabActive]}
            onPress={() => setActiveQueue("COMPLETED")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.queueTabText,
                activeQueue === "COMPLETED" && styles.queueTabTextActive,
              ]}
              numberOfLines={1}
            >
              Selesai ({completedDeposits.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Queue Items */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#15803D" />
            <Text style={{ marginTop: 10, color: "#64748B", fontSize: 12 }}>
              Memuat antrean setoran...
            </Text>
          </View>
        ) : getFilteredQueue().length === 0 ? (
          <View style={styles.emptyQueueCard}>
            <CheckCircle2 size={32} color="#9CA3AF" />
            <Text style={styles.emptyQueueText}>
              {activeQueue === "WEIGHING"
                ? "Belum ada antrean setoran yang perlu ditimbang."
                : activeQueue === "WAITING"
                ? "Tidak ada setoran yang menunggu persetujuan nasabah."
                : "Belum ada riwayat setoran selesai."}
            </Text>
          </View>
        ) : (
          getFilteredQueue().map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.depositCard}
              onPress={() => {
                setSelectedDeposit(item);
                navigate("bank_sampah_weighing");
              }}
              activeOpacity={0.85}
            >
              <View style={styles.depositCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.codeRow}>
                    <Text style={styles.depositCode}>{item.depositCode}</Text>
                    <View
                      style={[
                        styles.methodBadge,
                        item.method === "PICKUP" ? styles.methodBadgePickup : styles.methodBadgeDropOff,
                      ]}
                    >
                      {item.method === "PICKUP" ? (
                        <Truck size={10} color="#047857" />
                      ) : (
                        <MapPin size={10} color="#0284C7" />
                      )}
                      <Text
                        style={[
                          styles.methodBadgeText,
                          item.method === "PICKUP"
                            ? styles.methodBadgeTextPickup
                            : styles.methodBadgeTextDropOff,
                        ]}
                      >
                        {item.method === "PICKUP" ? "Pickup" : "Antar"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.customerRow}>
                    <User size={11} color="#64748B" />
                    <Text style={styles.customerName} numberOfLines={1}>
                      {typeof item.customerId === "object"
                        ? item.customerId?.name || "Nasabah GEOVERSE"
                        : "Nasabah GEOVERSE"}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                      ? styles.statusPillGreen
                      : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                      ? styles.statusPillAmber
                      : styles.statusPillBlue,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                        ? styles.statusPillTextGreen
                        : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                        ? styles.statusPillTextAmber
                        : styles.statusPillTextBlue,
                    ]}
                  >
                    {item.status === "WAITING_CUSTOMER_CONFIRMATION"
                      ? "Menunggu"
                      : item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                      ? "Poin Terbit"
                      : "Perlu Timbang"}
                  </Text>
                </View>
              </View>

              {/* Categories list */}
              <View style={styles.categoryTagsWrap}>
                {(item.categories || []).map((cat, idx) => (
                  <View key={`${cat.category}-${idx}`} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {cat.category}: {cat.actualWeightKg ? `${cat.actualWeightKg} kg` : `~${cat.estimatedWeightKg || 0} kg`}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.depositCardFooter}>
                <View>
                  <Text style={styles.footerWeightLabel}>
                    {item.actualTotalWeightKg ? "Total Aktual:" : "Estimasi Nasabah:"}
                  </Text>
                  <Text style={styles.footerWeightVal}>
                    {(item.actualTotalWeightKg || item.estimatedTotalWeightKg || 0).toFixed(1)} kg
                  </Text>
                  {item.finalPoint > 0 && (
                    <Text style={styles.footerPointVal}>+{item.finalPoint.toLocaleString("id-ID")} Pts</Text>
                  )}
                </View>

                <View
                  style={[
                    styles.btnTimbangAction,
                    item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                      ? { backgroundColor: "#047857" }
                      : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                      ? { backgroundColor: "#D97706" }
                      : { backgroundColor: "#15803D" },
                  ]}
                >
                  <Scale size={13} color="#FFFFFF" />
                  <Text style={styles.btnTimbangActionText}>
                    {item.status === "WAITING_CUSTOMER_CONFIRMATION"
                      ? "Lihat Hasil"
                      : item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                      ? "Rincian"
                      : "Timbang"}
                  </Text>
                  <ChevronRight size={13} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Operating Hours Modal (Atur Jam Buka-Tutup) */}
        <Modal
          visible={hoursModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHoursModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Atur Jam Operasional Unit</Text>
                  <Text style={styles.modalSub}>
                    Sesuaikan jam buka-tutup agar nasabah mengetahui waktu setor sampah
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setHoursModalVisible(false)}
                >
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputSectionLabel}>Jam Buka - Tutup Setoran:</Text>
              <View style={styles.inputHoursBox}>
                <Clock size={16} color="#15803D" style={{ marginLeft: 4 }} />
                <TextInput
                  style={styles.hoursInput}
                  placeholder="Contoh: Senin - Sabtu, 08:00 - 16:00"
                  placeholderTextColor="#94A3B8"
                  value={inputHours}
                  onChangeText={setInputHours}
                />
              </View>

              <Text style={styles.presetSectionLabel}>Pilih Cepat Jadwal Standar:</Text>
              <View style={styles.presetWrap}>
                {PRESET_HOURS.map((preset, idx) => {
                  const isSelected = inputHours === preset;
                  return (
                    <TouchableOpacity
                      key={`preset-hour-${idx}`}
                      style={[styles.presetHourPill, isSelected && styles.presetHourPillActive]}
                      onPress={() => setInputHours(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetHourPillText, isSelected && styles.presetHourPillTextActive]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Toggle Pickup Service */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Terima Penjemputan (Pickup Driver)</Text>
                  <Text style={styles.toggleSub}>Aktifkan jika unit Anda menerima pesanan jemput dari kurir/driver</Text>
                </View>
                <Switch
                  value={pickupEnabled}
                  onValueChange={setPickupEnabled}
                  trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                  thumbColor={pickupEnabled ? "#15803D" : "#94A3B8"}
                />
              </View>

              {hoursSuccessMsg ? (
                <View style={styles.successMessageBox}>
                  <CheckCircle2 size={16} color="#15803D" />
                  <Text style={styles.successMessageText}>{hoursSuccessMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btnSaveHours, savingHours && { opacity: 0.7 }]}
                onPress={handleSaveOperatingHours}
                disabled={savingHours}
                activeOpacity={0.85}
              >
                {savingHours ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.btnSaveHoursText}>Simpan Jam Operasional</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Read-Only Official Price Catalog Modal */}
        <Modal
          visible={priceModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPriceModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.modalTitle}>Katalog Harga Resmi</Text>
                    <View style={styles.badgeAdminOfficial}>
                      <ShieldCheck size={11} color="#047857" />
                      <Text style={styles.badgeAdminOfficialText}>Standar Admin</Text>
                    </View>
                  </View>
                  <Text style={styles.modalSub}>
                    Harga seragam di seluruh unit Bank Sampah GEOVERSE. (1 Poin = Rp 1)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setPriceModalVisible(false)}
                >
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {loadingPrices ? (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#15803D" />
                  <Text style={{ marginTop: 8, fontSize: 12, color: "#64748B" }}>
                    Memuat katalog harga resmi...
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {priceCatalog.map((p) => (
                    <View key={p._id} style={styles.priceCatalogRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.priceCategoryName}>{p.category}</Text>
                        <Text style={styles.priceSubName}>{p.subCategory}</Text>
                      </View>

                      <View style={styles.priceOfficialPill}>
                        <Text style={styles.priceOfficialValue}>{rp(p.pricePerKg)}/kg</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.btnCloseCatalog}
                onPress={() => setPriceModalVisible(false)}
              >
                <Text style={styles.btnCloseCatalogText}>Tutup Katalog</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Logout / Switch Role Modal */}
        <Modal
          visible={logoutModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { paddingBottom: 24 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Keluar / Ganti Peran</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
                Pilih aksi yang ingin Anda lakukan untuk sesi akun ini:
              </Text>

              <TouchableOpacity
                style={styles.modalMenuActionBtn}
                onPress={() => {
                  setLogoutModalVisible(false);
                  navigate("role");
                }}
              >
                <Building2 size={16} color="#15803D" />
                <Text style={styles.modalMenuActionText}>Pilih Peran Lain (Role Switcher)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalMenuActionBtn}
                onPress={() => {
                  setLogoutModalVisible(false);
                  navigate("c_home");
                }}
              >
                <User size={16} color="#0284C7" />
                <Text style={styles.modalMenuActionText}>Beralih ke Dashboard Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalMenuActionBtn, { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }]}
                onPress={() => {
                  setLogoutModalVisible(false);
                  navigate("login");
                }}
              >
                <LogOut size={16} color="#DC2626" />
                <Text style={[styles.modalMenuActionText, { color: "#DC2626", fontWeight: "800" }]}>
                  Logout dan Masuk dengan Akun Lain
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  headerMainTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSubUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  btnSwitchCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  btnSwitchCustomerText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  // Unit Card
  unitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  unitCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  unitAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  unitTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  statusLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  statusLiveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
  pickupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E0F2FE",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  pickupPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0284C7",
  },
  unitFullName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 18,
  },
  officerName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  unitDetailsRow: {
    flexDirection: "column",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  unitDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unitDetailText: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  unitActionGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  unitActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    borderRadius: 8,
  },
  unitActionBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  // Search section
  searchSection: {
    marginBottom: 14,
  },
  searchSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 5,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  btnSearchAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#15803D",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  btnSearchActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  searchErrorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
  },
  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: "48.5%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "flex-start",
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionBadge: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#15803D",
    backgroundColor: "#DCFCE7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  queueTabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  queueTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  queueTabActive: {
    backgroundColor: "#15803D",
  },
  queueTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  queueTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  emptyQueueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyQueueText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
  },
  // Deposit Card
  depositCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  depositCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  depositCode: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0F172A",
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
  methodBadgePickup: {
    backgroundColor: "#DCFCE7",
  },
  methodBadgeDropOff: {
    backgroundColor: "#E0F2FE",
  },
  methodBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  methodBadgeTextPickup: {
    color: "#047857",
  },
  methodBadgeTextDropOff: {
    color: "#0284C7",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  customerName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  statusPill: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  statusPillBlue: {
    backgroundColor: "#E0F2FE",
  },
  statusPillAmber: {
    backgroundColor: "#FEF3C7",
  },
  statusPillGreen: {
    backgroundColor: "#DCFCE7",
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  statusPillTextBlue: {
    color: "#0369A1",
  },
  statusPillTextAmber: {
    color: "#B45309",
  },
  statusPillTextGreen: {
    color: "#15803D",
  },
  categoryTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  depositCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerWeightLabel: {
    fontSize: 9.5,
    color: "#64748B",
  },
  footerWeightVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  footerPointVal: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#15803D",
  },
  btnTimbangAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  btnTimbangActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  inputSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 6,
  },
  inputHoursBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  hoursInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  presetSectionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  presetWrap: {
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
  },
  presetHourPill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  presetHourPillActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  presetHourPillText: {
    fontSize: 11.5,
    color: "#334155",
    fontWeight: "600",
  },
  presetHourPillTextActive: {
    color: "#15803D",
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginBottom: 10,
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  toggleSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  successMessageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  successMessageText: {
    fontSize: 11.5,
    color: "#15803D",
    fontWeight: "700",
  },
  btnSaveHours: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  btnSaveHoursText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  badgeAdminOfficial: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeAdminOfficialText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#047857",
  },
  priceCatalogRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  priceCategoryName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  priceSubName: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  priceOfficialPill: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  priceOfficialValue: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#15803D",
  },
  btnCloseCatalog: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  btnCloseCatalogText: {
    color: "#475569",
    fontSize: 12.5,
    fontWeight: "800",
  },
  modalMenuActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  modalMenuActionText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
});
