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
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  useWindowDimensions,
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
import { loadAccounts, saveAccounts, loadSession, saveSession } from "../auth/authStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRecycle } from "../../context/RecycleContext";
import {
  getBankDeposits,
  getWasteBanks,
  getWasteBankPrices,
  getWasteDepositById,
  updateWasteBankOperational,
  acceptWasteDeposit,
} from "../../services/recycleService";
import { WasteBankUI, WasteDepositUI, WasteCategoryPriceUI } from "../../types/recycleTypes";
import { rp } from "../../utils/formatters";
import {
  fetchAdminRedemptions,
  payRedemption,
  rejectRedemption,
} from "../../features/geoversePoint/services/geoversePointService";
import { PointRedemptionUI } from "../../features/geoversePoint/types/pointTypes";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

type TabQueue = "WEIGHING" | "WAITING" | "COMPLETED" | "REDEMPTIONS";

const PRESET_HOURS = [
  "Senin - Sabtu, 08:00 - 16:00",
  "Setiap Hari, 07:30 - 17:00",
  "Senin - Jumat, 08:30 - 15:30",
  "Senin - Minggu, 08:00 - 17:00",
];

export const WasteBankDashboardScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { setSelectedDeposit, setSelectedBank } = useRecycle();
  const [bank, setBank] = useState<WasteBankUI | null>(null);
  const [deposits, setDeposits] = useState<WasteDepositUI[]>([]);
  const [redemptions, setRedemptions] = useState<PointRedemptionUI[]>([]);
  const [processingRedemptionId, setProcessingRedemptionId] = useState<string | null>(null);
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
  const storageHoursKey = `@waste_bank_hours_${authAccount?.id || authAccount?.email || "default"}`;
  const storagePickupKey = `@waste_bank_pickup_${authAccount?.id || authAccount?.email || "default"}`;
  const registeredHours =
    authAccount?.roleData?.openingHours ||
    authAccount?.roleData?.operationalHours;

  const [activeOpeningHours, setActiveOpeningHours] = useState<string>(registeredHours || "");
  const [inputHours, setInputHours] = useState(registeredHours || "");
  const [pickupEnabled, setPickupEnabled] = useState(
    authAccount?.roleData?.acceptsPickup !== undefined
      ? String(authAccount.roleData.acceptsPickup) === "true"
      : true
  );
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSuccessMsg, setHoursSuccessMsg] = useState("");

  // Logout Confirm Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const registeredUnitName =
    authAccount?.roleData?.businessName ||
    authAccount?.roleData?.nama_unit ||
    authAccount?.roleData?.unitName;

  const registeredUnitAddress =
    authAccount?.roleData?.businessAddress ||
    authAccount?.roleData?.alamat_unit ||
    authAccount?.roleData?.unitAddress ||
    authAccount?.address;

  const displayUnitName =
    registeredUnitName ||
    bank?.name ||
    authAccount?.name ||
    "Bank Sampah Induk";

  const displayUnitAddress =
    registeredUnitAddress ||
    bank?.address ||
    "Garut, Jawa Barat";

  useEffect(() => {
    // 1. Immediately hydrate from AsyncStorage on mount
    const hydrateSettings = async () => {
      try {
        const storedHours = await AsyncStorage.getItem(storageHoursKey);
        if (storedHours) {
          setActiveOpeningHours(storedHours);
          setInputHours(storedHours);
        } else if (registeredHours) {
          setActiveOpeningHours(registeredHours);
          setInputHours(registeredHours);
        }

        const storedPickup = await AsyncStorage.getItem(storagePickupKey);
        if (storedPickup !== null) {
          setPickupEnabled(storedPickup === "true");
        } else if (authAccount?.roleData?.acceptsPickup !== undefined) {
          setPickupEnabled(String(authAccount.roleData.acceptsPickup) === "true");
        }
      } catch (e) {
        console.log("Error loading stored settings:", e);
      }
    };
    hydrateSettings();
  }, [authAccount?.id, authAccount?.email]);

  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Find bank belonging to this owner / officer or fallback to first active bank
      const banksRes = await getWasteBanks();
      if (banksRes.success && Array.isArray(banksRes.data) && banksRes.data.length > 0) {
        const userEmail = (authAccount?.email || "").toLowerCase().trim();
        const userName = (authAccount?.name || "").toLowerCase().trim();
        const roleUnit = (
          authAccount?.roleData?.businessName ||
          authAccount?.roleData?.nama_unit ||
          authAccount?.roleData?.unitName ||
          ""
        ).toLowerCase().trim();
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

        const storedHours = await AsyncStorage.getItem(storageHoursKey);
        const effectiveHours =
          myBank?.openingHours ||
          storedHours ||
          activeOpeningHours ||
          registeredHours ||
          "Senin - Sabtu, 08:00 - 15:15";

        const storedPickup = await AsyncStorage.getItem(storagePickupKey);
        const effectivePickup =
          storedPickup !== null
            ? storedPickup === "true"
            : authAccount?.roleData?.acceptsPickup !== undefined
            ? String(authAccount.roleData.acceptsPickup) === "true"
            : myBank?.acceptsPickup !== false;

        if (!myBank) {
          myBank = {
            ...banksRes.data[0],
            name: displayUnitName,
            address: displayUnitAddress,
            openingHours: effectiveHours,
            acceptsPickup: effectivePickup,
          };
        } else {
          myBank = {
            ...myBank,
            name: registeredUnitName || myBank.name,
            address: registeredUnitAddress || myBank.address,
            openingHours: effectiveHours,
            acceptsPickup: effectivePickup,
          };
        }

        setActiveOpeningHours(effectiveHours);
        setPickupEnabled(effectivePickup);
        setBank(myBank);
        setSelectedBank(myBank);

        if (!inputHours) {
          setInputHours(effectiveHours);
        }

        const depRes = await getBankDeposits(myBank._id);
        if (depRes.success && Array.isArray(depRes.data)) {
          setDeposits(depRes.data);
        }

        // Load point cashout redemptions for this Bank Sampah
        try {
          const rdmRes = await fetchAdminRedemptions({ status: "ALL", limit: 50 });
          if (rdmRes.success && rdmRes.data?.redemptions) {
            setRedemptions(rdmRes.data.redemptions);
          }
        } catch (rdmErr) {
          console.warn("loadRedemptions error:", rdmErr);
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
    let isMounted = true;
    loadDashboard();

    // AppState change listener for React Native
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active" && isMounted) {
        loadDashboard(true);
      }
    });

    const onWindowFocus = () => {
      if (isMounted) {
        loadDashboard(true);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("focus", onWindowFocus);
    }

    // Refresh every 10 seconds to catch tickets without overwhelming the phone
    const interval = setInterval(() => {
      if (isMounted) {
        loadDashboard(true);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      appStateSub.remove();
      if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("focus", onWindowFocus);
      }
    };
  }, [authAccount?.id, authAccount?.email]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleAcceptAndCallDriver = async (item: WasteDepositUI) => {
    try {
      setLoading(true);
      const res = await acceptWasteDeposit(item._id);
      if (res.success) {
        Alert.alert(
          "Driver Dipanggil",
          `Permintaan setor sampah #${item.depositCode} berhasil disetujui. Tugas penjemputan telah disiarkan ke driver.`
        );
        loadDashboard(true);
      } else {
        Alert.alert("Gagal", res.message || "Gagal menyetujui setoran.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
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
    setInputHours(activeOpeningHours || bank?.openingHours || registeredHours || "Senin - Sabtu, 08:00 - 15:15");
    setPickupEnabled(bank?.acceptsPickup !== false);
    setHoursSuccessMsg("");
    setHoursModalVisible(true);
  };

  const handleSaveOperatingHours = async () => {
    if (!bank) return;
    const hours = inputHours.trim();
    if (!hours) return;

    // Immediately update active state and UI
    setActiveOpeningHours(hours);
    const updatedBank: WasteBankUI = {
      ...bank,
      name: displayUnitName,
      address: displayUnitAddress,
      openingHours: hours,
      acceptsPickup: pickupEnabled,
    };
    setBank(updatedBank);
    setSelectedBank(updatedBank);

    // Persist to storage immediately
    try {
      const unitKey = (displayUnitName || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
      const unitKeyRaw = (displayUnitName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      await AsyncStorage.setItem(storageHoursKey, hours);
      await AsyncStorage.setItem(storagePickupKey, String(pickupEnabled));
      if (bank?._id) {
        await AsyncStorage.setItem(`@waste_bank_hours_${bank._id}`, hours);
        await AsyncStorage.setItem(`@waste_bank_pickup_${bank._id}`, String(pickupEnabled));
      }
      if (unitKey) {
        await AsyncStorage.setItem(`@waste_bank_hours_${unitKey}`, hours);
        await AsyncStorage.setItem(`@waste_bank_pickup_${unitKey}`, String(pickupEnabled));
      }
      if (unitKeyRaw) {
        await AsyncStorage.setItem(`@waste_bank_hours_${unitKeyRaw}`, hours);
        await AsyncStorage.setItem(`@waste_bank_pickup_${unitKeyRaw}`, String(pickupEnabled));
      }
      await AsyncStorage.setItem(`@waste_bank_hours_pakuan`, hours);
      await AsyncStorage.setItem(`@waste_bank_pickup_pakuan`, String(pickupEnabled));
      await AsyncStorage.setItem(`@waste_bank_hours_bank_sampah_pakuan`, hours);
      await AsyncStorage.setItem(`@waste_bank_pickup_bank_sampah_pakuan`, String(pickupEnabled));

      if (authAccount?.email) {
        await AsyncStorage.setItem(`@waste_bank_hours_${authAccount.email.toLowerCase()}`, hours);
        await AsyncStorage.setItem(`@waste_bank_pickup_${authAccount.email.toLowerCase()}`, String(pickupEnabled));
      }
      if (authAccount?.id) {
        await AsyncStorage.setItem(`@waste_bank_hours_${authAccount.id}`, hours);
        await AsyncStorage.setItem(`@waste_bank_pickup_${authAccount.id}`, String(pickupEnabled));
      }

      if (authAccount) {
        const accounts = await loadAccounts();
        for (let i = 0; i < accounts.length; i++) {
          const a = accounts[i];
          const isMatch =
            a.id === authAccount.id ||
            a.email.toLowerCase() === (authAccount.email || "").toLowerCase() ||
            a.role === "bank_sampah" ||
            (a.name && a.name.toLowerCase().includes("pakuan")) ||
            (a.roleData?.businessName && a.roleData.businessName.toLowerCase().includes("pakuan"));
          if (isMatch) {
            accounts[i].roleData = {
              ...(accounts[i].roleData || {}),
              openingHours: hours,
              operationalHours: hours,
              acceptsPickup: String(pickupEnabled),
            };
          }
        }
        await saveAccounts(accounts);
      }
    } catch (e) {
      console.log("Error saving hours to storage:", e);
    }

    setSavingHours(true);
    setHoursSuccessMsg("");
    try {
      const res = await updateWasteBankOperational(bank._id || "bank_pakuan_001", {
        name: displayUnitName,
        address: displayUnitAddress,
        openingHours: hours,
        acceptsPickup: pickupEnabled,
      });
      if (res.success && res.data) {
        setBank({
          ...res.data,
          name: displayUnitName,
          address: displayUnitAddress,
          openingHours: hours,
          acceptsPickup: pickupEnabled,
        });
        setSelectedBank({
          ...res.data,
          name: displayUnitName,
          address: displayUnitAddress,
          openingHours: hours,
          acceptsPickup: pickupEnabled,
        });
      }
      setHoursSuccessMsg("Pengaturan operasional berhasil disimpan!");
      setTimeout(() => {
        setHoursModalVisible(false);
        setHoursSuccessMsg("");
      }, 800);
    } catch (err) {
      console.error("save operating hours error:", err);
      setHoursSuccessMsg("Pengaturan operasional tersimpan di unit!");
      setTimeout(() => {
        setHoursModalVisible(false);
        setHoursSuccessMsg("");
      }, 800);
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

  const handlePayRedemption = (redemption: PointRedemptionUI) => {
    Alert.alert(
      "Konfirmasi Pencairan Kas",
      `Apakah Anda yakin telah membayarkan dana penarikan sebesar Rp ${redemption.rupiahValue?.toLocaleString("id-ID")} kepada ${typeof redemption.userId === "object" ? (redemption.userId as any)?.name || "nasabah" : "nasabah"}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Sudah Dibayarkan",
          onPress: async () => {
            setProcessingRedemptionId(redemption._id);
            try {
              const res = await payRedemption(redemption._id);
              if (res.success) {
                Alert.alert("Sukses", "Pencairan kas berhasil dikonfirmasi dan status diperbarui menjadi PAID.");
                loadDashboard(true);
              } else {
                Alert.alert("Gagal", res.message || "Gagal memproses pembayaran.");
              }
            } catch (err: any) {
              Alert.alert("Kesalahan", err?.message || "Terjadi kesalahan pada jaringan.");
            } finally {
              setProcessingRedemptionId(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectRedemption = (redemption: PointRedemptionUI) => {
    Alert.alert(
      "Tolak Pencairan Kas",
      `Apakah Anda yakin ingin menolak permintaan penarikan poin ini? Saldo ${redemption.points?.toLocaleString("id-ID")} poin akan dikembalikan secara utuh ke dompet nasabah.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak & Kembalikan Poin",
          style: "destructive",
          onPress: async () => {
            setProcessingRedemptionId(redemption._id);
            try {
              const res = await rejectRedemption(redemption._id, "Ditolak oleh petugas Bank Sampah.");
              if (res.success) {
                Alert.alert("Sukses", "Permintaan ditolak dan saldo poin nasabah telah dikembalikan utuh.");
                loadDashboard(true);
              } else {
                Alert.alert("Gagal", res.message || "Gagal menolak permintaan.");
              }
            } catch (err: any) {
              Alert.alert("Kesalahan", err?.message || "Terjadi kesalahan pada jaringan.");
            } finally {
              setProcessingRedemptionId(null);
            }
          },
        },
      ]
    );
  };

  const pendingRedemptionsCount = redemptions.filter((r) => r.status === "REQUESTED").length;

  // Metrics
  const waitingWeighing = deposits.filter((d) =>
    ["REQUESTED", "ACCEPTED", "PICKED_UP", "AT_BANK", "WEIGHING"].includes(d.status)
  );
  const waitingCustomerConfirm = deposits.filter(
    (d) => d.status === "WAITING_CUSTOMER_CONFIRMATION" || d.status === "DISPUTED"
  );
  const completedDeposits = deposits.filter(
    (d) => d.status === "COMPLETED" || d.status === "POINT_ISSUED"
  );
  const disputedCount = deposits.filter((d) => d.status === "DISPUTED").length;
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
      {/* Top App Bar with Operations Cockpit Styling */}
      <View style={styles.headerBar}>
        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate("role")}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={styles.headerBadgeRow}>
              <View style={styles.headerLiveDot} />
              <Text style={styles.headerBadgeText}>OFFICER PORTAL</Text>
            </View>
            <Text style={styles.headerMainTitle} numberOfLines={1}>Panel Bank Sampah</Text>
            <Text style={styles.headerSubUnit} numberOfLines={1}>
              {displayUnitName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => onRefresh()}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSwitchCustomer}
              onPress={() => navigate("c_home")}
              activeOpacity={0.7}
            >
              <User size={13} color="#059669" />
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
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />
        }
      >
        {/* Officer & Unit Profile Card */}
        <View style={styles.unitCard}>
          <View style={styles.unitCardTop}>
            <View style={styles.unitAvatar}>
              <Building2 size={24} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.unitTagRow}>
                <View style={styles.statusLivePill}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.statusLiveText}>Menerima Setoran</Text>
                </View>
                {bank?.acceptsPickup !== false ? (
                  <View style={styles.pickupPill}>
                    <Truck size={10} color="#0284C7" />
                    <Text style={styles.pickupPillText}>Pickup Aktif</Text>
                  </View>
                ) : (
                  <View style={[styles.pickupPill, { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }]}>
                    <Truck size={10} color="#64748B" />
                    <Text style={[styles.pickupPillText, { color: "#64748B" }]}>Pickup Nonaktif</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={styles.unitFullName} numberOfLines={1}>
                  {displayUnitName}
                </Text>
                <ShieldCheck size={16} color="#059669" />
              </View>
              <Text style={styles.officerName} numberOfLines={1}>
                Petugas: {authAccount?.name || "Pengelola Bank Sampah"}
              </Text>
            </View>
          </View>

          <View style={styles.unitAddressRow}>
            <MapPin size={13} color="#64748B" />
            <Text style={styles.unitAddressText} numberOfLines={1}>
              {displayUnitAddress}
            </Text>
          </View>

          <View style={styles.unitHoursBanner}>
            <Clock size={13} color="#059669" />
            <Text style={styles.unitHoursBannerText} numberOfLines={1}>
              Jam Operasional: {activeOpeningHours || bank?.openingHours || "Senin - Sabtu, 08:00 - 15:15"}
            </Text>
          </View>

          {/* Quick Action Buttons: Atur Jam & Lihat Katalog Harga */}
          <View style={styles.unitActionGrid}>
            <TouchableOpacity
              style={styles.unitActionBtnHours}
              onPress={handleOpenHoursModal}
              activeOpacity={0.8}
            >
              <Clock size={14} color="#059669" />
              <Text style={styles.unitActionBtnHoursText}>Atur Jam Buka-Tutup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.unitActionBtnCatalog}
              onPress={handleOpenPriceModal}
              activeOpacity={0.8}
            >
              <Tag size={14} color="#0284C7" />
              <Text style={styles.unitActionBtnCatalogText}>Katalog Harga</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Search Ticket by Code */}
        <View style={styles.searchSection}>
          <Text style={styles.searchSectionTitle}>Cari & Timbang Tiket Nasabah</Text>
          <View style={styles.searchBox}>
            <Search size={16} color="#059669" style={{ marginLeft: 4 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Masukkan kode setor (cth: RNG-RCY-...)"
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

        {/* Executive Metric Cards Grid */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <View style={styles.metricCardGreen}>
              <View style={styles.metricCardHeader}>
                <View style={styles.metricIconCircleGreen}>
                  <Scale size={16} color="#059669" />
                </View>
                <View style={styles.metricBadgeGreen}>
                  <Text style={styles.metricBadgeTextGreen}>Sampah</Text>
                </View>
              </View>
              <View style={styles.metricValRow}>
                <Text style={styles.metricVal}>{totalKg.toFixed(1)}</Text>
                <Text style={styles.metricUnit}>kg</Text>
              </View>
              <Text style={styles.metricLabel}>Total Sampah Masuk</Text>
            </View>

            <View style={styles.metricCardAmber}>
              <View style={styles.metricCardHeader}>
                <View style={styles.metricIconCircleAmber}>
                  <Sparkles size={16} color="#D97706" />
                </View>
                <View style={styles.metricBadgeAmber}>
                  <Text style={styles.metricBadgeTextAmber}>Poin</Text>
                </View>
              </View>
              <View style={styles.metricValRow}>
                <Text style={styles.metricVal}>{totalPointsIssued.toLocaleString("id-ID")}</Text>
                <Text style={styles.metricUnit}>Pts</Text>
              </View>
              <Text style={styles.metricLabel}>Poin Nasabah Terbit</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCardOrange}>
              <View style={styles.metricCardHeader}>
                <View style={styles.metricIconCircleOrange}>
                  <Clock size={16} color="#EA580C" />
                </View>
                <View style={styles.metricBadgeOrange}>
                  <Text style={styles.metricBadgeTextOrange}>Antrean</Text>
                </View>
              </View>
              <View style={styles.metricValRow}>
                <Text style={styles.metricVal}>{waitingWeighing.length}</Text>
                <Text style={styles.metricUnit}>Tiket</Text>
              </View>
              <Text style={styles.metricLabel}>Menunggu Ditimbang</Text>
            </View>

            <View style={styles.metricCardBlue}>
              <View style={styles.metricCardHeader}>
                <View style={styles.metricIconCircleBlue}>
                  <CheckCircle2 size={16} color="#2563EB" />
                </View>
                <View style={styles.metricBadgeBlue}>
                  <Text style={styles.metricBadgeTextBlue}>Berhasil</Text>
                </View>
              </View>
              <View style={styles.metricValRow}>
                <Text style={styles.metricVal}>{completedDeposits.length}</Text>
                <Text style={styles.metricUnit}>Selesai</Text>
              </View>
              <Text style={styles.metricLabel}>Setoran Selesai</Text>
            </View>
          </View>
        </View>

        {/* Queue Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Antrean & Penimbangan Sampah</Text>
          <View style={styles.sectionBadgeBox}>
            <Text style={styles.sectionBadge}>{deposits.length} Tiket Aktif</Text>
          </View>
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
              Timbang
            </Text>
            <View style={[styles.queueTabBadge, activeQueue === "WEIGHING" && styles.queueTabBadgeActive]}>
              <Text style={[styles.queueTabBadgeText, activeQueue === "WEIGHING" && styles.queueTabBadgeTextActive]}>
                {waitingWeighing.length}
              </Text>
            </View>
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
              Menunggu
            </Text>
            <View
              style={[
                styles.queueTabBadge,
                activeQueue === "WAITING" && styles.queueTabBadgeActive,
                disputedCount > 0 && { backgroundColor: "#DC2626" },
              ]}
            >
              <Text
                style={[
                  styles.queueTabBadgeText,
                  activeQueue === "WAITING" && styles.queueTabBadgeTextActive,
                  disputedCount > 0 && { color: "#FFFFFF" },
                ]}
              >
                {waitingCustomerConfirm.length}
              </Text>
            </View>
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
              Selesai
            </Text>
            <View style={[styles.queueTabBadge, activeQueue === "COMPLETED" && styles.queueTabBadgeActive]}>
              <Text style={[styles.queueTabBadgeText, activeQueue === "COMPLETED" && styles.queueTabBadgeTextActive]}>
                {completedDeposits.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.queueTab, activeQueue === "REDEMPTIONS" && styles.queueTabActive]}
            onPress={() => setActiveQueue("REDEMPTIONS")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.queueTabText,
                activeQueue === "REDEMPTIONS" && styles.queueTabTextActive,
              ]}
              numberOfLines={1}
            >
              Pencairan
            </Text>
            <View
              style={[
                styles.queueTabBadge,
                activeQueue === "REDEMPTIONS" && styles.queueTabBadgeActive,
                pendingRedemptionsCount > 0 && { backgroundColor: "#F59E0B" },
              ]}
            >
              <Text
                style={[
                  styles.queueTabBadgeText,
                  activeQueue === "REDEMPTIONS" && styles.queueTabBadgeTextActive,
                  pendingRedemptionsCount > 0 && { color: "#FFFFFF" },
                ]}
              >
                {pendingRedemptionsCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Dispute Notice Banner under Tabs if any */}
        {disputedCount > 0 && activeQueue === "WAITING" && (
          <View style={styles.disputeTopBanner}>
            <AlertCircle size={15} color="#DC2626" />
            <Text style={styles.disputeTopBannerText}>
              Ada {disputedCount} tiket komplain nasabah yang perlu ditinjau / ditimbang ulang.
            </Text>
          </View>
        )}

        {/* Queue Items */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#15803D" />
            <Text style={{ marginTop: 10, color: "#64748B", fontSize: 12 }}>
              Memuat antrean...
            </Text>
          </View>
        ) : activeQueue === "REDEMPTIONS" ? (
          redemptions.length === 0 ? (
            <View style={styles.emptyQueueCard}>
              <CheckCircle2 size={32} color="#9CA3AF" />
              <Text style={styles.emptyQueueText}>
                Belum ada permintaan pencairan poin / kas dari nasabah.
              </Text>
            </View>
          ) : (
            redemptions.map((rdm) => {
              const isPending = rdm.status === "REQUESTED";
              const isPaid = rdm.status === "PAID";
              const isRejected = rdm.status === "REJECTED";
              const isProcessing = processingRedemptionId === rdm._id;

              return (
                <View key={rdm._id} style={styles.depositCard}>
                  <View style={styles.depositCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.codeRow}>
                        <Text style={styles.depositCode}>{rdm.redemptionCode}</Text>
                        <View
                          style={[
                            styles.methodBadge,
                            rdm.type === "CASH" ? styles.methodBadgeDropOff : styles.methodBadgePickup,
                          ]}
                        >
                          <DollarSign size={10} color={rdm.type === "CASH" ? "#0284C7" : "#047857"} />
                          <Text
                            style={[
                              styles.methodBadgeText,
                              rdm.type === "CASH" ? styles.methodBadgeTextDropOff : styles.methodBadgeTextPickup,
                            ]}
                          >
                            {rdm.type === "CASH"
                              ? "Tunai Bank Sampah"
                              : rdm.type === "BANK_TRANSFER"
                              ? "Transfer Bank"
                              : "E-Wallet"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.customerRow}>
                        <User size={11} color="#64748B" />
                        <Text style={styles.customerName} numberOfLines={1}>
                          {typeof rdm.userId === "object" ? (rdm.userId as any)?.name || "Nasabah" : "Nasabah"}
                          {typeof rdm.userId === "object" && (rdm.userId as any)?.phone ? ` (${(rdm.userId as any).phone})` : ""}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        isPaid
                          ? styles.statusPillGreen
                          : isRejected
                          ? styles.statusPillRed
                          : styles.statusPillAmber,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isPaid
                            ? styles.statusPillTextGreen
                            : isRejected
                            ? styles.statusPillTextRed
                            : styles.statusPillTextAmber,
                        ]}
                      >
                        {isPaid ? "Selesai / Dibayar" : isRejected ? "Ditolak" : "Menunggu Bayar"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: "#64748B" }}>Tujuan Pencairan:</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#1E293B", marginTop: 2 }}>
                      {rdm.payoutDestination?.channel === "CASH_AT_BANK"
                        ? "Pengambilan Uang Tunai di Lokasi Bank Sampah"
                        : `${rdm.payoutDestination?.channel || "Transfer"} - ${rdm.payoutDestination?.accountNumber || "-"} a/n ${rdm.payoutDestination?.accountName || "-"}`}
                    </Text>
                    {rdm.rejectionReason ? (
                      <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>
                        Alasan penolakan: {rdm.rejectionReason} (Poin telah dikembalikan)
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.depositCardFooter}>
                    <View>
                      <Text style={styles.footerWeightLabel}>Nominal Penarikan:</Text>
                      <Text style={[styles.footerWeightVal, { color: "#15803D" }]}>
                        Rp {rdm.rupiahValue?.toLocaleString("id-ID")}
                      </Text>
                      <Text style={styles.footerPointVal}>
                        {rdm.points?.toLocaleString("id-ID")} Poin
                      </Text>
                    </View>

                    {isPending && (
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <TouchableOpacity
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: "#EF4444",
                            backgroundColor: "#FEF2F2",
                          }}
                          onPress={() => handleRejectRedemption(rdm)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#DC2626" }}>Tolak</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: "#15803D",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onPress={() => handlePayRedemption(rdm)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Check size={13} color="#FFFFFF" />
                              <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#FFFFFF" }}>Konfirmasi Bayar</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )
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
                if (item.method === "PICKUP" && item.status === "REQUESTED") {
                  handleAcceptAndCallDriver(item);
                } else if (
                  item.method === "PICKUP" &&
                  (item.status === "ACCEPTED" || item.status === "DRIVER_ASSIGNED" || item.status === "PICKED_UP")
                ) {
                  Alert.alert(
                    "Status Penjemputan Sampah",
                    `Tiket #${item.depositCode}\nStatus: ${
                      item.status === "ACCEPTED"
                        ? "Menunggu konfirmasi penerimaan oleh driver."
                        : item.status === "DRIVER_ASSIGNED"
                        ? `Driver (${typeof item.driverId === "object" ? item.driverId?.name : "Driver"}) sedang menuju lokasi nasabah.`
                        : "Driver telah mengambil sampah & sedang menuju Bank Sampah."
                    }\n\nSetelah sampah tiba di Bank Sampah, Anda dapat langsung menimbang.`
                  );
                } else {
                  setSelectedDeposit(item);
                  navigate("bank_sampah_weighing");
                }
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
                      : item.status === "DISPUTED"
                      ? styles.statusPillRed
                      : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                      ? styles.statusPillAmber
                      : item.method === "PICKUP" && item.status === "REQUESTED"
                      ? { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }
                      : item.method === "PICKUP" && item.status === "ACCEPTED"
                      ? { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }
                      : item.method === "PICKUP" && (item.status === "DRIVER_ASSIGNED" || item.status === "PICKED_UP")
                      ? { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" }
                      : styles.statusPillBlue,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                        ? styles.statusPillTextGreen
                        : item.status === "DISPUTED"
                        ? styles.statusPillTextRed
                        : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                        ? styles.statusPillTextAmber
                        : item.method === "PICKUP" && item.status === "REQUESTED"
                        ? { color: "#1D4ED8", fontWeight: "700" }
                        : item.method === "PICKUP" && item.status === "ACCEPTED"
                        ? { color: "#15803D", fontWeight: "700" }
                        : item.method === "PICKUP" && item.status === "DRIVER_ASSIGNED"
                        ? { color: "#7E22CE", fontWeight: "700" }
                        : item.method === "PICKUP" && item.status === "PICKED_UP"
                        ? { color: "#9333EA", fontWeight: "700" }
                        : styles.statusPillTextBlue,
                    ]}
                  >
                    {item.status === "DISPUTED"
                      ? "Komplain / Ditolak"
                      : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                      ? "Menunggu ACC"
                      : item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                      ? "Poin Terbit"
                      : item.method === "PICKUP" && item.status === "REQUESTED"
                      ? "Panggil Driver"
                      : item.method === "PICKUP" && item.status === "ACCEPTED"
                      ? "Cari Driver"
                      : item.method === "PICKUP" && item.status === "DRIVER_ASSIGNED"
                      ? "Driver Menuju Nasabah"
                      : item.method === "PICKUP" && item.status === "PICKED_UP"
                      ? "Diantar ke Bank"
                      : item.method === "PICKUP" && item.status === "AT_BANK"
                      ? "Tiba di Bank"
                      : "Perlu Timbang"}
                  </Text>
                </View>
              </View>

              {/* Dispute Alert Box inside Card */}
              {item.status === "DISPUTED" && (
                <View style={styles.cardDisputeNotice}>
                  <AlertCircle size={14} color="#DC2626" />
                  <Text style={styles.cardDisputeNoticeText} numberOfLines={2}>
                    Komplain Nasabah: "{item.disputeReason || 'Hasil timbang tidak sesuai'}"
                  </Text>
                </View>
              )}

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

                {item.method === "PICKUP" && item.status === "REQUESTED" ? (
                  <TouchableOpacity
                    style={[styles.btnTimbangAction, { backgroundColor: "#0284C7" }]}
                    onPress={() => handleAcceptAndCallDriver(item)}
                    activeOpacity={0.85}
                  >
                    <Truck size={13} color="#FFFFFF" />
                    <Text style={styles.btnTimbangActionText}>Setujui & Panggil Driver</Text>
                    <ChevronRight size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : item.method === "PICKUP" && item.status === "ACCEPTED" ? (
                  <View style={[styles.btnTimbangAction, { backgroundColor: "#64748B" }]}>
                    <Clock size={13} color="#FFFFFF" />
                    <Text style={styles.btnTimbangActionText}>Mencari Driver...</Text>
                  </View>
                ) : item.method === "PICKUP" && (item.status === "DRIVER_ASSIGNED" || item.status === "PICKUP_ON_THE_WAY") ? (
                  <View style={[styles.btnTimbangAction, { backgroundColor: "#2563EB" }]}>
                    <Truck size={13} color="#FFFFFF" />
                    <Text style={styles.btnTimbangActionText}>Driver Menjemput</Text>
                  </View>
                ) : item.method === "PICKUP" && item.status === "PICKED_UP" ? (
                  <View style={[styles.btnTimbangAction, { backgroundColor: "#9333EA" }]}>
                    <Truck size={13} color="#FFFFFF" />
                    <Text style={styles.btnTimbangActionText}>Menuju Bank</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.btnTimbangAction,
                      item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                        ? { backgroundColor: "#047857" }
                        : item.status === "DISPUTED"
                        ? { backgroundColor: "#DC2626" }
                        : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                        ? { backgroundColor: "#D97706" }
                        : { backgroundColor: "#059669" },
                    ]}
                  >
                    <Scale size={13} color="#FFFFFF" />
                    <Text style={styles.btnTimbangActionText}>
                      {item.status === "DISPUTED"
                        ? "Tinjau Komplain & Timbang Ulang"
                        : item.status === "WAITING_CUSTOMER_CONFIRMATION"
                        ? "Lihat Hasil"
                        : item.status === "COMPLETED" || item.status === "POINT_ISSUED"
                        ? "Rincian"
                        : "Timbang"}
                    </Text>
                    <ChevronRight size={13} color="#FFFFFF" />
                  </View>
                )}
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
                    Harga seragam di seluruh unit Bank Sampah GEOVERSE. (100 Poin = Rp 1)
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.8,
  },
  headerMainTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  headerSubUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  btnSwitchCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  btnSwitchCustomerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
  },
  scrollContentWide: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  // Unit Card
  unitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  unitCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  unitAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    justifyContent: "center",
    alignItems: "center",
  },
  unitTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statusLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusLiveText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#059669",
  },
  pickupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pickupPillText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0284C7",
  },
  unitFullName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  officerName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  unitAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  unitAddressText: {
    fontSize: 11.5,
    color: "#475569",
    flex: 1,
  },
  unitHoursBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  unitHoursBannerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  unitActionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  unitActionBtnHours: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 10,
    borderRadius: 12,
  },
  unitActionBtnHoursText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
  },
  unitActionBtnCatalog: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 10,
    borderRadius: 12,
  },
  unitActionBtnCatalogText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284C7",
  },
  // Search section
  searchSection: {
    marginBottom: 16,
  },
  searchSectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  btnSearchAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#059669",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  btnSearchActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchErrorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
  },
  // Metrics Grid
  metricsContainer: {
    marginBottom: 18,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricCardGreen: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  metricCardAmber: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 12,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  metricCardOrange: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 12,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  metricCardBlue: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metricBadgeGreen: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  metricBadgeTextGreen: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  metricBadgeAmber: {
    backgroundColor: "#FFFBEB",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  metricBadgeTextAmber: {
    fontSize: 9,
    fontWeight: "800",
    color: "#D97706",
  },
  metricBadgeOrange: {
    backgroundColor: "#FFF7ED",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  metricBadgeTextOrange: {
    fontSize: 9,
    fontWeight: "800",
    color: "#EA580C",
  },
  metricBadgeBlue: {
    backgroundColor: "#EFF6FF",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  metricBadgeTextBlue: {
    fontSize: 9,
    fontWeight: "800",
    color: "#2563EB",
  },
  metricIconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  metricIconCircleAmber: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
  },
  metricIconCircleOrange: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  metricIconCircleBlue: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  metricValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionBadgeBox: {
    backgroundColor: "#ECFDF5",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  queueTabBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  queueTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  queueTabActive: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  queueTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  queueTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  queueTabBadge: {
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  queueTabBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  queueTabBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
  },
  queueTabBadgeTextActive: {
    color: "#FFFFFF",
  },
  tabDisputeDot: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  tabDisputeDotActive: {
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  tabDisputeDotText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  disputeTopBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  disputeTopBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
    lineHeight: 15,
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  methodBadgePickup: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  methodBadgeDropOff: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  methodBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  methodBadgeTextPickup: {
    color: "#059669",
  },
  methodBadgeTextDropOff: {
    color: "#0284C7",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
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
  statusPillRed: {
    backgroundColor: "#FEE2E2",
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  statusPillTextBlue: {
    color: "#0369A1",
  },
  statusPillTextAmber: {
    color: "#B45309",
  },
  statusPillTextGreen: {
    color: "#059669",
  },
  statusPillTextRed: {
    color: "#DC2626",
  },
  cardDisputeNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  cardDisputeNoticeText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: "700",
    color: "#991B1B",
  },
  categoryTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
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
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerWeightLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
  },
  footerWeightVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  footerPointVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
    marginTop: 1,
  },
  btnTimbangAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnTimbangActionText: {
    fontSize: 11.5,
    fontWeight: "700",
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
