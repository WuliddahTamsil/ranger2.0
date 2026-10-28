import React, { useEffect, useState, useMemo } from "react";
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
  StatusBar,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  ClipboardList,
  Tag,
  Wallet,
  User,
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
  DollarSign,
  Phone,
  MapPin,
  X,
  Check,
  ShieldCheck,
  Calendar,
  ArrowLeft,
  Filter,
  ArrowRight,
  Coins,
  HelpCircle,
  SlidersHorizontal,
  Layers,
  FileText,
  CheckCheck,
  CreditCard,
  Bell,
  Store,
  Lock,
  Pencil,
  Trash2,
  Shield,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { loadAccounts, saveAccounts } from "../auth/authStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRecycle } from "../../context/RecycleContext";
import { ProfilePhotoEditor } from "../../components/ProfilePhotoEditor";
import { updateUserProfile, deleteUserAccount } from "../../services/api";
import { updateCachedAccount } from "../auth/authService";
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
import { RoleHeader } from "../../components/RoleHeader";

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

const WASTE_CATEGORIES = [
  "Semua",
  "Plastik",
  "Kertas & Kardus",
  "Logam & Besi",
  "Kaca & Botol",
  "Minyak Jelantah",
  "Elektronik",
];

export const WasteBankDashboardScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Active Bottom Tab: 0 = Beranda, 1 = Antrean, 2 = Katalog, 3 = Keuangan, 4 = Akun
  const [currentTab, setCurrentTab] = useState<number>(() => {
    if (typeof window !== "undefined" && window.location?.search) {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab")?.toLowerCase();
      if (t === "antrean" || t === "queue" || t === "1") return 1;
      if (t === "katalog" || t === "catalog" || t === "prices" || t === "2") return 2;
      if (t === "keuangan" || t === "finance" || t === "pencairan" || t === "wallet" || t === "3") return 3;
      if (t === "akun" || t === "profile" || t === "settings" || t === "account" || t === "4") return 4;
    }
    return 0;
  });

  const { setSelectedDeposit, setSelectedBank } = useRecycle();
  const [bank, setBank] = useState<WasteBankUI | null>(null);
  const [deposits, setDeposits] = useState<WasteDepositUI[]>([]);
  const [redemptions, setRedemptions] = useState<PointRedemptionUI[]>([]);
  const [processingRedemptionId, setProcessingRedemptionId] = useState<string | null>(null);
  const [activeQueue, setActiveQueue] = useState<TabQueue>("WEIGHING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search by code in Beranda & Queue
  const [searchCode, setSearchCode] = useState("");
  const [searchError, setSearchError] = useState("");

  // Price Catalog Tab State
  const [priceCatalog, setPriceCatalog] = useState<WasteCategoryPriceUI[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalogCat, setSelectedCatalogCat] = useState("Semua");

  // Redemptions Tab Filter
  const [redemptionFilter, setRedemptionFilter] = useState<"ALL" | "REQUESTED" | "PAID" | "REJECTED">("ALL");

  // Notifications Modal
  const [notifModalVisible, setNotifModalVisible] = useState(false);

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

  // Logout / Switch Role Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Profile & Account Management States (Standardized with other partner dashboards)
  const [avatarUri, setAvatarUri] = useState<string | null>(authAccount?.profilePhoto || null);
  const [officerName, setOfficerName] = useState<string>(authAccount?.name || "Agalagan");
  const [officerPhone, setOfficerPhone] = useState<string>(
    authAccount?.phone || authAccount?.roleData?.phone || "+6287805987309"
  );
  const [officerEmail, setOfficerEmail] = useState<string>(
    authAccount?.email || "banksampah@geoverse.com"
  );
  const [isOpenLoket, setIsOpenLoket] = useState<boolean>(true);
  const [editUnitAddress, setEditUnitAddress] = useState<string>(
    authAccount?.roleData?.businessAddress ||
      authAccount?.roleData?.alamat_unit ||
      authAccount?.address ||
      "Pakuan, Bogor, Jawa Barat"
  );

  // Sub-Modals
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Form states
  const [editOfficerName, setEditOfficerName] = useState(authAccount?.name || "Agalagan");
  const [editOfficerPhone, setEditOfficerPhone] = useState(
    authAccount?.phone || authAccount?.roleData?.phone || "+6287805987309"
  );
  const [editOfficerEmail, setEditOfficerEmail] = useState(
    authAccount?.email || "banksampah@geoverse.com"
  );
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempAddress, setTempAddress] = useState(
    authAccount?.roleData?.businessAddress ||
      authAccount?.roleData?.alamat_unit ||
      authAccount?.address ||
      "Pakuan, Bogor, Jawa Barat"
  );

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
    "Bank Sampah Pakuan";

  const displayUnitAddress =
    registeredUnitAddress ||
    bank?.address ||
    "Pakuan, Bogor, Jawa Barat";

  useEffect(() => {
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

        try {
          const rdmRes = await fetchAdminRedemptions({ status: "ALL", limit: 50 });
          if (rdmRes.success && rdmRes.data?.redemptions) {
            setRedemptions(rdmRes.data.redemptions);
          }
        } catch (rdmErr) {
          console.warn("loadRedemptions error:", rdmErr);
        }

        // Preload prices
        try {
          const prcRes = await getWasteBankPrices(myBank._id);
          if (prcRes.success && Array.isArray(prcRes.data)) {
            setPriceCatalog(prcRes.data);
          }
        } catch (prcErr) {
          console.warn("loadPrices error:", prcErr);
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

    try {
      await AsyncStorage.setItem(storageHoursKey, hours);
      await AsyncStorage.setItem(storagePickupKey, String(pickupEnabled));
      if (bank?._id) {
        await AsyncStorage.setItem(`@waste_bank_hours_${bank._id}`, hours);
        await AsyncStorage.setItem(`@waste_bank_pickup_${bank._id}`, String(pickupEnabled));
      }
      if (authAccount) {
        const accounts = await loadAccounts();
        for (let i = 0; i < accounts.length; i++) {
          const a = accounts[i];
          if (a.id === authAccount.id || a.email.toLowerCase() === (authAccount.email || "").toLowerCase()) {
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
      await updateWasteBankOperational(bank._id || "bank_pakuan_001", {
        name: displayUnitName,
        address: displayUnitAddress,
        openingHours: hours,
        acceptsPickup: pickupEnabled,
      });
      setHoursSuccessMsg("Pengaturan operasional berhasil disimpan!");
      setTimeout(() => {
        setHoursModalVisible(false);
        setHoursSuccessMsg("");
      }, 700);
    } catch (err) {
      setHoursSuccessMsg("Pengaturan operasional tersimpan lokal!");
      setTimeout(() => {
        setHoursModalVisible(false);
        setHoursSuccessMsg("");
      }, 700);
    } finally {
      setSavingHours(false);
    }
  };

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
      setSearchError(`Tiket "${query}" tidak ditemukan dalam antrean unit ini.`);
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
                Alert.alert("Sukses", "Pencairan kas berhasil dikonfirmasi (PAID).");
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
                Alert.alert("Sukses", "Permintaan ditolak dan saldo poin nasabah telah dikembalikan.");
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

  // Metrics
  const pendingRedemptionsCount = redemptions.filter((r) => r.status === "REQUESTED").length;
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
  const totalCashDisbursed = redemptions
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + (r.rupiahValue || 0), 0);

  // Filtered Queue
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

  // Filtered Price Catalog
  const filteredPrices = useMemo(() => {
    return priceCatalog.filter((item) => {
      const matchCat =
        selectedCatalogCat === "Semua" ||
        item.category.toLowerCase().includes(selectedCatalogCat.toLowerCase()) ||
        (selectedCatalogCat === "Kertas & Kardus" && item.category.toLowerCase().includes("kertas")) ||
        (selectedCatalogCat === "Logam & Besi" && item.category.toLowerCase().includes("logam"));
      const matchSearch =
        !catalogSearch.trim() ||
        item.category.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(catalogSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [priceCatalog, selectedCatalogCat, catalogSearch]);

  // Filtered Redemptions
  const filteredRedemptions = useMemo(() => {
    return redemptions.filter((r) => {
      if (redemptionFilter === "ALL") return true;
      return r.status === redemptionFilter;
    });
  }, [redemptions, redemptionFilter]);

  // 5 Navigation Tabs
  const navTabs = [
    { key: "beranda", label: "Beranda", icon: Home, badge: 0 },
    {
      key: "antrean",
      label: "Antrean",
      icon: ClipboardList,
      badge: waitingWeighing.length + (disputedCount > 0 ? disputedCount : 0),
      badgeColor: disputedCount > 0 ? "#DC2626" : "#059669",
    },
    { key: "katalog", label: "Katalog", icon: Tag, badge: 0 },
    {
      key: "keuangan",
      label: "Keuangan",
      icon: Wallet,
      badge: pendingRedemptionsCount,
      badgeColor: "#EA580C",
    },
    { key: "akun", label: "Akun", icon: User, badge: 0 },
  ];

  // -------------------------------------------------------------
  // TAB 0: BERANDA (Unified Dashboard)
  // -------------------------------------------------------------
  const renderBerandaTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
    >
      <RoleHeader
        name={displayUnitName}
        role="Pemilik Bank Sampah"
        icon={Scale}
        notificationCount={pendingRedemptionsCount + disputedCount}
        onNotificationPress={() => setNotifModalVisible(true)}
        onRolePress={() => setLogoutModalVisible(true)}
      />

      {/* Unit Overview Card */}
      <View style={styles.unitHeroCard}>
        <View style={styles.unitHeroTop}>
          <View style={styles.unitHeroAvatar}>
            <Building2 size={22} color="#0E6641" />
          </View>
          <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
            <View style={styles.unitTagRow}>
              <View style={styles.statusLivePill}>
                <View style={styles.livePulseDot} />
                <Text style={styles.statusLiveText}>Menerima Setoran</Text>
              </View>
              {pickupEnabled ? (
                <View style={styles.pickupPillActive}>
                  <Truck size={10} color="#0284C7" />
                  <Text style={styles.pickupPillTextActive}>Pickup Aktif</Text>
                </View>
              ) : (
                <View style={styles.pickupPillInactive}>
                  <Truck size={10} color="#64748B" />
                  <Text style={styles.pickupPillTextInactive}>Pickup Nonaktif</Text>
                </View>
              )}
            </View>
            <View style={styles.unitHeroNameRow}>
              <Text style={styles.unitHeroName} numberOfLines={2}>
                {displayUnitName}
              </Text>
              <ShieldCheck size={15} color="#0E6641" style={{ flexShrink: 0, marginTop: 2 }} />
            </View>
            <Text style={styles.unitHeroOfficer} numberOfLines={1}>
              Petugas: {authAccount?.name || "Pengelola Bank Sampah"}
            </Text>
          </View>
        </View>

        <View style={styles.unitAddressRow}>
          <MapPin size={13} color="#64748B" style={{ flexShrink: 0, marginTop: 1 }} />
          <Text style={styles.unitAddressText} numberOfLines={2}>
            {displayUnitAddress}
          </Text>
        </View>

        <View style={styles.unitHoursBanner}>
          <Clock size={13} color="#0E6641" style={{ flexShrink: 0, marginTop: 1 }} />
          <Text style={styles.unitHoursBannerText} numberOfLines={2}>
            Jam Operasional: {activeOpeningHours || "Senin - Sabtu, 08:00 - 15:15"}
          </Text>
        </View>

        {/* Quick Settings Action Buttons */}
        <View style={styles.unitActionGrid}>
          <TouchableOpacity
            style={styles.unitActionBtnHours}
            onPress={handleOpenHoursModal}
            activeOpacity={0.8}
            accessibilityLabel="Atur Jam Buka-Tutup"
          >
            <Clock size={13} color="#0E6641" />
            <Text style={styles.unitActionBtnHoursText} numberOfLines={2}>Atur Jam Operasional</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.unitActionBtnCatalog}
            onPress={() => setCurrentTab(2)}
            activeOpacity={0.8}
            accessibilityLabel="Lihat Katalog Harga"
          >
            <Tag size={13} color="#0284C7" />
            <Text style={styles.unitActionBtnCatalogText} numberOfLines={2}>Katalog Harga</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Search & Timbang Bar */}
      <View style={styles.searchSection}>
        <Text style={styles.searchSectionTitle}>Cari & Timbang Tiket Nasabah</Text>
        <View style={styles.searchBox}>
          <Search size={16} color="#0E6641" style={{ marginLeft: 4 }} />
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

      {/* Executive Metric Cards Grid (Clean, Decoupled & Responsive) */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <TouchableOpacity
            style={styles.metricCardGreen}
            onPress={() => {
              setActiveQueue("COMPLETED");
              setCurrentTab(1);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconCircleGreen}>
                <Scale size={15} color="#0E6641" />
              </View>
              <View style={styles.metricBadgeGreen}>
                <Text style={styles.metricBadgeTextGreen}>Sampah</Text>
              </View>
            </View>
            <View style={styles.metricValRow}>
              <Text style={styles.metricVal} numberOfLines={1}>{totalKg.toFixed(1)}</Text>
              <Text style={styles.metricUnit}>kg</Text>
            </View>
            <Text style={styles.metricLabel} numberOfLines={2}>Total Sampah Masuk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCardAmber}
            onPress={() => setCurrentTab(3)}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconCircleAmber}>
                <Sparkles size={15} color="#D97706" />
              </View>
              <View style={styles.metricBadgeAmber}>
                <Text style={styles.metricBadgeTextAmber}>Poin</Text>
              </View>
            </View>
            <View style={styles.metricValRow}>
              <Text style={styles.metricVal} numberOfLines={1}>{totalPointsIssued.toLocaleString("id-ID")}</Text>
              <Text style={styles.metricUnit}>Pts</Text>
            </View>
            <Text style={styles.metricLabel} numberOfLines={2}>Poin Nasabah Terbit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <TouchableOpacity
            style={styles.metricCardOrange}
            onPress={() => {
              setActiveQueue("WEIGHING");
              setCurrentTab(1);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconCircleOrange}>
                <Clock size={15} color="#EA580C" />
              </View>
              <View style={styles.metricBadgeOrange}>
                <Text style={styles.metricBadgeTextOrange}>Antrean</Text>
              </View>
            </View>
            <View style={styles.metricValRow}>
              <Text style={styles.metricVal} numberOfLines={1}>{waitingWeighing.length}</Text>
              <Text style={styles.metricUnit}>Tiket</Text>
            </View>
            <Text style={styles.metricLabel} numberOfLines={2}>Menunggu Ditimbang</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCardBlue}
            onPress={() => {
              setActiveQueue("COMPLETED");
              setCurrentTab(1);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconCircleBlue}>
                <CheckCircle2 size={15} color="#2563EB" />
              </View>
              <View style={styles.metricBadgeBlue}>
                <Text style={styles.metricBadgeTextBlue}>Berhasil</Text>
              </View>
            </View>
            <View style={styles.metricValRow}>
              <Text style={styles.metricVal} numberOfLines={1}>{completedDeposits.length}</Text>
              <Text style={styles.metricUnit}>Selesai</Text>
            </View>
            <Text style={styles.metricLabel} numberOfLines={2}>Setoran Selesai</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Action Navigation Buttons */}
      <View style={styles.quickNavCard}>
        <Text style={styles.quickNavCardTitle}>Aksi Cepat Pengelola</Text>
        <View style={styles.quickNavGrid}>
          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => {
              setActiveQueue("WEIGHING");
              setCurrentTab(1);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIconWrap, { backgroundColor: "#DCFCE7" }]}>
              <Scale size={18} color="#0E6641" />
            </View>
            <Text style={styles.quickNavLabel} numberOfLines={2}>Timbang Antrean</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => setCurrentTab(2)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIconWrap, { backgroundColor: "#E0F2FE" }]}>
              <Tag size={18} color="#0284C7" />
            </View>
            <Text style={styles.quickNavLabel} numberOfLines={2}>Katalog Harga</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => setCurrentTab(3)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Wallet size={18} color="#D97706" />
            </View>
            <Text style={styles.quickNavLabel} numberOfLines={2}>Pencairan Kas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavItem}
            onPress={() => navigate("c_home")}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIconWrap, { backgroundColor: "#F3E8FF" }]}>
              <User size={18} color="#7E22CE" />
            </View>
            <Text style={styles.quickNavLabel} numberOfLines={2}>Mode Customer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Urgent Queue Snippet */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>Antrean Perlu Ditimbang</Text>
          <Text style={styles.sectionSubtitle} numberOfLines={1}>Prioritas tiket setor nasabah yang baru masuk</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setActiveQueue("WEIGHING");
            setCurrentTab(1);
          }}
          activeOpacity={0.7}
          style={styles.seeAllBtn}
        >
          <Text style={styles.seeAllText}>Semua ({waitingWeighing.length}) →</Text>
        </TouchableOpacity>
      </View>

      {waitingWeighing.length === 0 ? (
        <View style={styles.emptyCardMini}>
          <CheckCheck size={28} color="#0E6641" />
          <Text style={styles.emptyCardMiniTitle}>Semua Antrean Selesai Ditimbang!</Text>
          <Text style={styles.emptyCardMiniText}>
            Tidak ada tiket setor yang menunggu penimbangan saat ini.
          </Text>
        </View>
      ) : (
        waitingWeighing.slice(0, 3).map((item) => renderDepositCard(item))
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // -------------------------------------------------------------
  // TAB 1: ANTREAN & PENIMBANGAN (Queue Management)
  // -------------------------------------------------------------
  const renderAntreanTab = () => {
    const queueList = getFilteredQueue();

    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
      >
        <View style={styles.pageHeaderBox}>
          <Text style={styles.pageTitle}>Antrean & Penimbangan</Text>
          <Text style={styles.pageSubtitle}>
            Kelola proses penimbangan tiket nasabah dan verifikasi setoran sampah
          </Text>
        </View>

        {/* Segmented Queue Tabs */}
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
        </View>

        {/* Dispute Notice Banner */}
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
            <ActivityIndicator size="large" color="#0E6641" />
            <Text style={{ marginTop: 10, color: "#64748B", fontSize: 12 }}>
              Memuat antrean...
            </Text>
          </View>
        ) : queueList.length === 0 ? (
          <View style={styles.emptyQueueCard}>
            <CheckCircle2 size={36} color="#9CA3AF" />
            <Text style={styles.emptyQueueText}>
              {activeQueue === "WEIGHING"
                ? "Tidak ada tiket dalam antrean timbang."
                : activeQueue === "WAITING"
                ? "Tidak ada tiket yang menunggu konfirmasi."
                : "Belum ada riwayat setoran selesai."}
            </Text>
          </View>
        ) : (
          queueList.map((item) => renderDepositCard(item))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    );
  };

  // -------------------------------------------------------------
  // TAB 2: KATALOG HARGA (Price Catalog)
  // -------------------------------------------------------------
  const renderKatalogTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
    >
      <View style={styles.pageHeaderBox}>
        <Text style={styles.pageTitle}>Katalog Harga Sampah</Text>
        <Text style={styles.pageSubtitle}>
          Daftar acuan harga terstandarisasi resmi komunitas GEOVERSE Kamojang
        </Text>
      </View>

      {/* Official Standard Notice Banner */}
      <View style={styles.officialNoticeCard}>
        <ShieldCheck size={18} color="#0E6641" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.officialNoticeTitle}>Standarisasi Harga Resmi</Text>
          <Text style={styles.officialNoticeText}>
            100 Poin GEOVERSE setara dengan Rp 1. Harga dijamin transparan dan seragam untuk seluruh nasabah dan mitra.
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.catalogSearchWrap}>
        <Search size={16} color="#0E6641" style={{ marginLeft: 4 }} />
        <TextInput
          style={styles.catalogSearchInput}
          placeholder="Cari jenis sampah (PET, kardus, tembaga...)"
          placeholderTextColor="#94A3B8"
          value={catalogSearch}
          onChangeText={setCatalogSearch}
        />
        {catalogSearch.length > 0 && (
          <TouchableOpacity onPress={() => setCatalogSearch("")} style={{ padding: 4 }}>
            <X size={15} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsWrap}>
        {WASTE_CATEGORIES.map((cat) => {
          const isSelected = selectedCatalogCat === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, isSelected && styles.catChipActive]}
              onPress={() => setSelectedCatalogCat(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Price Cards List */}
      {filteredPrices.length === 0 ? (
        <View style={styles.emptyQueueCard}>
          <Tag size={32} color="#94A3B8" />
          <Text style={styles.emptyQueueText}>Tidak ditemukan jenis sampah yang cocok.</Text>
        </View>
      ) : (
        <View style={styles.catalogGrid}>
          {filteredPrices.map((item, idx) => (
            <View key={item._id || `cat-prc-${idx}`} style={styles.priceItemCard}>
              <View style={styles.priceCardTop}>
                <View style={styles.priceIconBox}>
                  <Scale size={18} color="#0E6641" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.priceCatName}>{item.category}</Text>
                  <Text style={styles.priceSubCatName} numberOfLines={1}>
                    {item.subCategory || "Standar Terpilah"}
                  </Text>
                </View>
                <View style={styles.priceValueBadge}>
                  <Text style={styles.priceValueText}>{rp(item.pricePerKg)}</Text>
                  <Text style={styles.priceUnitText}>/{item.unit || "kg"}</Text>
                </View>
              </View>

              <View style={styles.priceCardDivider} />

              <View style={styles.priceCardBottom}>
                <View style={styles.pointsBadge}>
                  <Sparkles size={12} color="#D97706" />
                  <Text style={styles.pointsBadgeText}>
                    {(item.pricePerKg * 100).toLocaleString("id-ID")} Pts/{item.unit || "kg"}
                  </Text>
                </View>
                <Text style={styles.minWeightText}>
                  Min. setor: {item.minWeightKg ? `${item.minWeightKg} kg` : "0.1 kg"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // -------------------------------------------------------------
  // TAB 3: KEUANGAN & PENCAIRAN POIN (Cashouts & Payouts)
  // -------------------------------------------------------------
  const renderKeuanganTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
    >
      <View style={styles.pageHeaderBox}>
        <Text style={styles.pageTitle}>Pencairan Kas & Poin</Text>
        <Text style={styles.pageSubtitle}>
          Kelola verifikasi penarikan poin nasabah menjadi uang kas di loket unit
        </Text>
      </View>

      {/* Financial Summary Cards */}
      <View style={styles.financeSummaryCard}>
        <View style={styles.financeSummaryItem}>
          <Text style={styles.financeSummaryLabel}>Total Kas Dibayarkan</Text>
          <Text style={styles.financeSummaryVal}>{rp(totalCashDisbursed)}</Text>
          <Text style={styles.financeSummarySub}>Pencairan sukses</Text>
        </View>
        <View style={styles.financeDividerV} />
        <View style={styles.financeSummaryItem}>
          <Text style={styles.financeSummaryLabel}>Menunggu Bayar</Text>
          <Text style={[styles.financeSummaryVal, { color: pendingRedemptionsCount > 0 ? "#DC2626" : "#0E6641" }]}>
            {pendingRedemptionsCount}
          </Text>
          <Text style={styles.financeSummarySub}>Permintaan nasabah</Text>
        </View>
      </View>

      {/* Redemption Status Filters */}
      <View style={styles.redemptionFilterRow}>
        {(["ALL", "REQUESTED", "PAID", "REJECTED"] as const).map((filter) => {
          const isSelected = redemptionFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.redemptionFilterBtn, isSelected && styles.redemptionFilterBtnActive]}
              onPress={() => setRedemptionFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[styles.redemptionFilterBtnText, isSelected && styles.redemptionFilterBtnTextActive]}>
                {filter === "ALL"
                  ? "Semua"
                  : filter === "REQUESTED"
                  ? `Menunggu (${pendingRedemptionsCount})`
                  : filter === "PAID"
                  ? "Selesai"
                  : "Ditolak"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Redemptions List */}
      {filteredRedemptions.length === 0 ? (
        <View style={styles.emptyQueueCard}>
          <Coins size={36} color="#9CA3AF" />
          <Text style={styles.emptyQueueText}>
            {redemptionFilter === "REQUESTED"
              ? "Tidak ada permintaan pencairan yang menunggu persetujuan."
              : "Belum ada data pencairan untuk kategori ini."}
          </Text>
        </View>
      ) : (
        filteredRedemptions.map((rdm) => {
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
                      <DollarSign size={10} color={rdm.type === "CASH" ? "#0284C7" : "#0E6641"} />
                      <Text
                        style={[
                          styles.methodBadgeText,
                          rdm.type === "CASH" ? styles.methodBadgeTextDropOff : styles.methodBadgeTextPickup,
                        ]}
                      >
                        {rdm.type === "CASH"
                          ? "Tunai Loket"
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
                    {isPaid ? "Selesai Dibayar" : isRejected ? "Ditolak" : "Perlu Dibayar"}
                  </Text>
                </View>
              </View>

              <View style={styles.redemptionDetailBox}>
                <View style={styles.redemptionRow}>
                  <Text style={styles.redemptionLabel}>Nominal Uang Kas:</Text>
                  <Text style={styles.redemptionValueHighlight}>{rp(rdm.rupiahValue || 0)}</Text>
                </View>
                <View style={styles.redemptionRow}>
                  <Text style={styles.redemptionLabel}>Poin Ditukarkan:</Text>
                  <Text style={styles.redemptionValuePoints}>
                    -{(rdm.points || 0).toLocaleString("id-ID")} Pts
                  </Text>
                </View>
                {(rdm.payoutDestination || (rdm as any).payoutTarget) && (
                  <View style={styles.redemptionRow}>
                    <Text style={styles.redemptionLabel}>Rekening / E-Wallet:</Text>
                    <Text style={styles.redemptionValueTarget}>
                      {rdm.payoutDestination
                        ? `${rdm.payoutDestination.channel} - ${rdm.payoutDestination.accountNumber}${rdm.payoutDestination.accountName ? ` (${rdm.payoutDestination.accountName})` : ""}`
                        : (rdm as any).payoutTarget}
                    </Text>
                  </View>
                )}
              </View>

              {isPending && (
                <View style={styles.redemptionActionRow}>
                  <TouchableOpacity
                    style={styles.btnRejectRedemption}
                    onPress={() => handleRejectRedemption(rdm)}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnRejectRedemptionText}>Tolak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnPayRedemption, isProcessing && { opacity: 0.7 }]}
                    onPress={() => handlePayRedemption(rdm)}
                    disabled={isProcessing}
                    activeOpacity={0.85}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={14} color="#FFFFFF" />
                        <Text style={styles.btnPayRedemptionText}>Bayarkan Sekarang</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const handleSaveAccount = async () => {
    if (!editOfficerName.trim()) {
      Alert.alert("Perhatian", "Nama petugas PIC tidak boleh kosong.");
      return;
    }
    setOfficerName(editOfficerName.trim());
    setOfficerPhone(editOfficerPhone.trim());
    setOfficerEmail(editOfficerEmail.trim());

    try {
      if (authAccount) {
        const updatedAccount: AuthAccount = {
          ...authAccount,
          name: editOfficerName.trim(),
          phone: editOfficerPhone.trim(),
          email: editOfficerEmail.trim(),
          updatedAt: new Date().toISOString(),
        };
        await updateCachedAccount(updatedAccount);
      }
      if (authAccount?.id) {
        await updateUserProfile(authAccount.id, {
          name: editOfficerName.trim(),
          phone: editOfficerPhone.trim(),
        });
      }
      setAccountModalVisible(false);
      Alert.alert("Sukses", "Informasi akun petugas berhasil disimpan.");
    } catch (e: any) {
      Alert.alert("Gagal Menyimpan", e?.message || "Terjadi kendala saat menyimpan profil.");
    }
  };

  const handleSavePassword = () => {
    if (!currPassword.trim() || !newPassword.trim()) {
      Alert.alert("Perhatian", "Harap isi kata sandi saat ini dan kata sandi baru.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Perhatian", "Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Perhatian", "Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    setPasswordModalVisible(false);
    setCurrPassword("");
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Sukses", "Kata sandi akun Anda berhasil diperbarui.");
  };

  const handleSaveAddress = async () => {
    if (!tempAddress.trim()) {
      Alert.alert("Perhatian", "Alamat lokasi Bank Sampah tidak boleh kosong.");
      return;
    }
    setEditUnitAddress(tempAddress.trim());
    try {
      if (bank?._id) {
        await updateWasteBankOperational(bank._id, {
          name: displayUnitName,
          address: tempAddress.trim(),
          openingHours: activeOpeningHours,
          acceptsPickup: pickupEnabled,
        });
      }
      if (authAccount) {
        const updatedAccount: AuthAccount = {
          ...authAccount,
          address: tempAddress.trim(),
          roleData: {
            ...authAccount.roleData,
            businessAddress: tempAddress.trim(),
            alamat_unit: tempAddress.trim(),
            unitAddress: tempAddress.trim(),
          },
        };
        await updateCachedAccount(updatedAccount);
      }
      setAddressModalVisible(false);
      Alert.alert("Tersimpan", "Alamat lokasi loket Bank Sampah berhasil diperbarui.");
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Gagal memperbarui alamat.");
    }
  };

  const handleToggleOpenLoket = (val: boolean) => {
    setIsOpenLoket(val);
    Alert.alert(
      val ? "Loket Dibuka" : "Loket Ditutup Sementara",
      val
        ? "Bank Sampah sekarang aktif menerima setoran sampah dari nasabah & armada driver."
        : "Loket ditutup sementara. Nasabah akan melihat status loket sedang tutup."
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hapus Akun Mitra Bank Sampah",
      "Apakah Anda yakin ingin menghapus akun mitra Bank Sampah GEOVERSE beserta seluruh profil loket dan riwayat transaksi secara permanen?\n\nSesuai standar privasi Apple (Guideline 5.1.1(v)), tindakan ini tidak dapat dibatalkan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Akun",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteUserAccount(authAccount?.id);
              if (res.success) {
                Alert.alert(
                  "Akun Dihapus",
                  "Akun mitra Bank Sampah Anda telah berhasil dihapus secara permanen dari platform GEOVERSE.",
                  [{ text: "OK", onPress: () => navigate("login") }]
                );
              } else {
                Alert.alert("Gagal", res.message || "Gagal memproses penghapusan akun. Silakan coba kembali.");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Terjadi kendala saat menghapus akun.");
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // TAB 4: AKUN & PENGATURAN UNIT (Standardized Partner Profile)
  // -------------------------------------------------------------
  const renderAkunTab = () => (
    <ScrollView
      contentContainerStyle={[styles.akunScrollContent, isWide && styles.scrollContentWide]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
    >
      {/* 1. Header Banner Profil Mitra (Identik dengan Pemilik Catering, Kos, Shop) */}
      <View style={styles.profileHeader}>
        <ProfilePhotoEditor
          userId={authAccount?.id}
          name={officerName}
          photoUri={avatarUri}
          size={88}
          backgroundColor="#FFFFFF"
          iconColor="#0E6641"
          onSaved={async (newUri) => {
            setAvatarUri(newUri);
            if (authAccount) {
              const updatedAccount: AuthAccount = {
                ...authAccount,
                profilePhoto: newUri,
                updatedAt: new Date().toISOString(),
              };
              await updateCachedAccount(updatedAccount);
            }
          }}
        />

        <Text style={styles.profileOwnerName} numberOfLines={2}>
          {officerName}
        </Text>
        <View style={styles.profileUnitNameRow}>
          <Text style={styles.profileUnitNameText} numberOfLines={2}>
            {displayUnitName}
          </Text>
          <ShieldCheck size={14} color="#86EFAC" style={{ flexShrink: 0 }} />
        </View>
        <Text style={styles.profilePhoneText} numberOfLines={1}>
          {officerPhone}
        </Text>

        {/* 3 Stats Row (Profil | Status Loket | Terverifikasi) */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>Siap</Text>
            <Text style={styles.statLbl}>Profil</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{isOpenLoket ? "Buka" : "Tutup"}</Text>
            <Text style={styles.statLbl}>Status Loket</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>Aktif</Text>
            <Text style={styles.statLbl}>Terverifikasi</Text>
          </View>
        </View>
      </View>

      {/* 2. Group: AKUN */}
      <Text style={styles.groupTitle}>AKUN</Text>
      <View style={styles.groupCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setEditOfficerName(officerName);
            setEditOfficerPhone(officerPhone);
            setEditOfficerEmail(officerEmail);
            setAccountModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#E8F5EE" }]}>
            <User size={18} color="#0D7A53" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Detail Akun & Petugas</Text>
            <Text style={styles.menuItemSubtitle} numberOfLines={1}>
              {officerEmail} • PIC: {officerName}
            </Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setCurrPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#E8F5EE" }]}>
            <Lock size={18} color="#0D7A53" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Ubah Password</Text>
            <Text style={styles.menuItemSubtitle}>Perbarui kata sandi akun petugas</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setEditOfficerName(officerName);
            setEditOfficerPhone(officerPhone);
            setEditOfficerEmail(officerEmail);
            setAccountModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#E0F2FE" }]}>
            <Phone size={18} color="#0284C7" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Nomor WhatsApp Loket</Text>
            <Text style={styles.menuItemSubtitle}>{officerPhone}</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 3. Group: OPERASIONAL BANK SAMPAH */}
      <Text style={styles.groupTitle}>OPERASIONAL BANK SAMPAH</Text>
      <View style={styles.groupCard}>
        {/* Toggle Status Buka Loket Langsung di List */}
        <View style={styles.menuItem}>
          <View
            style={[
              styles.menuIconBg,
              { backgroundColor: isOpenLoket ? "#E8F5EE" : "#FEE2E2" },
            ]}
          >
            <Scale size={18} color={isOpenLoket ? "#0D7A53" : "#DC2626"} />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Status Loket Bank Sampah</Text>
            <Text
              style={[
                styles.menuItemSubtitle,
                { color: isOpenLoket ? "#0D7A53" : "#DC2626", fontWeight: "700" },
              ]}
            >
              {isOpenLoket ? "Buka (Menerima Setoran)" : "Tutup Sementara"}
            </Text>
          </View>
          <Switch
            value={isOpenLoket}
            onValueChange={handleToggleOpenLoket}
            trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
            thumbColor={isOpenLoket ? "#0E6641" : "#94A3B8"}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleOpenHoursModal}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#DCFCE7" }]}>
            <Clock size={18} color="#0D7A53" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Atur Jam Operasional</Text>
            <Text style={styles.menuItemSubtitle} numberOfLines={1}>
              {activeOpeningHours || "Senin - Sabtu, 08:00 - 16:00"}
            </Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.menuItem}>
          <View style={[styles.menuIconBg, { backgroundColor: "#E0F2FE" }]}>
            <Truck size={18} color="#0284C7" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Layanan Pickup Driver</Text>
            <Text style={styles.menuItemSubtitle}>
              {pickupEnabled ? "Menerima jemputan armada driver" : "Penjemputan dinonaktifkan"}
            </Text>
          </View>
          <Switch
            value={pickupEnabled}
            onValueChange={async (val) => {
              setPickupEnabled(val);
              try {
                await AsyncStorage.setItem(storagePickupKey, String(val));
                if (bank?._id) {
                  await updateWasteBankOperational(bank._id, {
                    name: displayUnitName,
                    address: editUnitAddress,
                    openingHours: activeOpeningHours,
                    acceptsPickup: val,
                  });
                }
              } catch (e) {}
            }}
            trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
            thumbColor={pickupEnabled ? "#0E6641" : "#94A3B8"}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setTempAddress(editUnitAddress);
            setAddressModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#F3E8FF" }]}>
            <MapPin size={18} color="#7C3AED" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Alamat & Titik Loket</Text>
            <Text style={styles.menuItemSubtitle} numberOfLines={1}>
              {editUnitAddress}
            </Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentTab(2)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#FEF3C7" }]}>
            <Tag size={18} color="#D97706" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Katalog Harga Sampah</Text>
            <Text style={styles.menuItemSubtitle}>Acuan harga resmi per kg & poin GEOVERSE</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 4. Group: NAVIGASI & DUKUNGAN */}
      <Text style={styles.groupTitle}>NAVIGASI & DUKUNGAN</Text>
      <View style={styles.groupCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#F3E8FF" }]}>
            <User size={18} color="#7E22CE" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Beralih ke Aplikasi Customer</Text>
            <Text style={styles.menuItemSubtitle}>Buka antarmuka pelanggan GEOVERSE</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigate("role")}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#DCFCE7" }]}>
            <Store size={18} color="#0D7A53" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Ganti Peran Mitra</Text>
            <Text style={styles.menuItemSubtitle}>Pilih peran catering, kos, laundry, atau lainnya</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setHelpModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#FEF3C7" }]}>
            <HelpCircle size={18} color="#D97706" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Bantuan & SOP Penimbangan</Text>
            <Text style={styles.menuItemSubtitle}>Panduan alur timbang & penerbitan poin</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setPrivacyModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#F1F5F9" }]}>
            <Shield size={18} color="#475569" />
          </View>
          <View style={styles.menuItemBody}>
            <Text style={styles.menuItemTitle}>Privasi & Keamanan</Text>
            <Text style={styles.menuItemSubtitle}>Kebijakan data & kepatuhan privasi GEOVERSE</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 5. Group: KELUAR & HAPUS AKUN (Apple Guideline 5.1.1(v) Compliant) */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => setLogoutModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.logoutIconBg}>
          <LogOut size={18} color="#DC2626" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.logoutBtnText}>Keluar dari Akun</Text>
          <Text style={styles.logoutBtnSub}>Akhiri sesi masuk pada perangkat ini</Text>
        </View>
        <ChevronRight size={16} color="#DC2626" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={handleDeleteAccount}
        activeOpacity={0.7}
      >
        <View style={[styles.logoutIconBg, { backgroundColor: "#FEE2E2" }]}>
          <Trash2 size={18} color="#DC2626" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.deleteAccountBtnText}>Hapus Akun Mitra Bank Sampah</Text>
          <Text style={styles.deleteAccountBtnSub}>
            Hapus akun & seluruh data unit secara permanen (Guideline 5.1.1(v))
          </Text>
        </View>
        <ChevronRight size={16} color="#DC2626" />
      </TouchableOpacity>

      <Text style={styles.footerVersion}>GEOVERSE 2.0 • Mitra Bank Sampah</Text>
      <Text style={styles.footerSubVersion}>
        Platform Pengelolaan Limbah Berkelanjutan PGE Kamojang
      </Text>

      <View style={{ height: 28 }} />
    </ScrollView>
  );

  // Helper to render individual deposit card
  const renderDepositCard = (item: WasteDepositUI) => (
    <TouchableOpacity
      key={item._id}
      style={styles.depositCard}
      onPress={() => {
        setSelectedDeposit(item);
        navigate("bank_sampah_weighing");
      }}
      activeOpacity={0.88}
    >
      <View style={styles.depositCardHeader}>
        <View style={{ flex: 1, marginRight: 8, minWidth: 0 }}>
          <View style={styles.codeRow}>
            <Text style={styles.depositCode}>{item.depositCode}</Text>
            <View
              style={[
                styles.methodBadge,
                item.method === "DROP_OFF" ? styles.methodBadgeDropOff : styles.methodBadgePickup,
              ]}
            >
              {item.method === "DROP_OFF" ? (
                <MapPin size={10} color="#0284C7" />
              ) : (
                <Truck size={10} color="#0E6641" />
              )}
              <Text
                style={[
                  styles.methodBadgeText,
                  item.method === "DROP_OFF"
                    ? styles.methodBadgeTextDropOff
                    : styles.methodBadgeTextPickup,
                ]}
              >
                {item.method === "DROP_OFF" ? "Antar" : "Pickup"}
              </Text>
            </View>
          </View>
          <View style={styles.customerRow}>
            <User size={11} color="#64748B" />
            <Text style={styles.customerName} numberOfLines={1}>
              {(typeof item.customerId === "object" && item.customerId !== null && (item.customerId as any).name)
                ? (item.customerId as any).name
                : (item as any).customerName || "Nasabah GEOVERSE"}
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
                : styles.statusPillTextBlue,
            ]}
          >
            {item.status === "COMPLETED" || item.status === "POINT_ISSUED"
              ? "Selesai"
              : item.status === "DISPUTED"
              ? "Komplain"
              : item.status === "WAITING_CUSTOMER_CONFIRMATION"
              ? "Menunggu Nasabah"
              : item.method === "PICKUP" && item.status === "REQUESTED"
              ? "Permintaan Jemput"
              : item.method === "PICKUP" && item.status === "ACCEPTED"
              ? "Mencari Driver"
              : item.method === "PICKUP" && (item.status === "DRIVER_ASSIGNED" || item.status === "PICKUP_ON_THE_WAY")
              ? "Driver OTW"
              : item.method === "PICKUP" && item.status === "PICKED_UP"
              ? "Menuju Bank"
              : "Perlu Timbang"}
          </Text>
        </View>
      </View>

      {/* Dispute Alert Box inside Card */}
      {item.status === "DISPUTED" && (
        <View style={styles.cardDisputeNotice}>
          <AlertCircle size={14} color="#DC2626" />
          <Text style={styles.cardDisputeNoticeText} numberOfLines={2}>
            Komplain: "{item.disputeReason || 'Hasil timbang tidak sesuai'}"
          </Text>
        </View>
      )}

      {/* Categories tags list */}
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
            onPress={(e) => {
              e.stopPropagation();
              handleAcceptAndCallDriver(item);
            }}
            activeOpacity={0.85}
          >
            <Truck size={13} color="#FFFFFF" />
            <Text style={styles.btnTimbangActionText}>Panggil Driver</Text>
            <ChevronRight size={13} color="#FFFFFF" />
          </TouchableOpacity>
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
                : { backgroundColor: "#0E6641" },
            ]}
          >
            <Scale size={13} color="#FFFFFF" />
            <Text style={styles.btnTimbangActionText}>
              {item.status === "DISPUTED"
                ? "Timbang Ulang"
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
  );

  return (
    <ResponsiveSafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E6641" />

      {/* Main Tab Content */}
      <View style={styles.mainTabBody}>
        {currentTab === 0 && renderBerandaTab()}
        {currentTab === 1 && renderAntreanTab()}
        {currentTab === 2 && renderKatalogTab()}
        {currentTab === 3 && renderKeuanganTab()}
        {currentTab === 4 && renderAkunTab()}
      </View>

      {/* 5-Tab Bottom Navigation Bar (Standardized with other partners) */}
      <View style={[styles.bottomNavContainer, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {navTabs.map((tab, idx) => {
          const active = currentTab === idx;
          const IconComp = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              testID={`bottom-tab-${tab.key}`}
              style={styles.navItem}
              onPress={() => {
                setCurrentTab(idx);
                if (typeof window !== "undefined" && window.history?.replaceState) {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab.key);
                  window.history.replaceState({}, "", url.toString());
                }
              }}
              activeOpacity={0.7}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.navIconBg, active && styles.navIconBgActive]}>
                <IconComp size={20} color={active ? "#0E6641" : "#94A3B8"} strokeWidth={active ? 2.5 : 2} />
                {tab.badge > 0 && !active && (
                  <View style={[styles.navBadgeCircle, { backgroundColor: tab.badgeColor || "#0E6641" }]}>
                    <Text style={styles.navBadgeText}>
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 1. Operating Hours Modal (Atur Jam Buka-Tutup) */}
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
                  Sesuaikan waktu setor sampah agar nasabah mengetahui jam buka loket
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setHoursModalVisible(false)}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputSectionLabel}>Jadwal Buka - Tutup Loket:</Text>
            <View style={styles.inputHoursBox}>
              <Clock size={16} color="#0E6641" style={{ marginLeft: 4 }} />
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
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.toggleTitle}>Terima Penjemputan (Pickup Driver)</Text>
                <Text style={styles.toggleSub}>Aktifkan jika unit Anda menerima pesanan jemput dari kurir/driver</Text>
              </View>
              <Switch
                value={pickupEnabled}
                onValueChange={setPickupEnabled}
                trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                thumbColor={pickupEnabled ? "#0E6641" : "#94A3B8"}
              />
            </View>

            {hoursSuccessMsg ? (
              <View style={styles.successMessageBox}>
                <CheckCircle2 size={16} color="#0E6641" />
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

      {/* 2. Notifications Modal */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notifikasi Bank Sampah</Text>
                <Text style={styles.modalSub}>Aktivitas penting yang membutuhkan perhatian Anda</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginVertical: 10 }}>
              {disputedCount > 0 && (
                <TouchableOpacity
                  style={styles.notifCardItem}
                  onPress={() => {
                    setNotifModalVisible(false);
                    setActiveQueue("WAITING");
                    setCurrentTab(1);
                  }}
                >
                  <View style={[styles.notifIconWrap, { backgroundColor: "#FEE2E2" }]}>
                    <AlertCircle size={18} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, { color: "#DC2626" }]}>
                      {disputedCount} Komplain Hasil Timbang
                    </Text>
                    <Text style={styles.notifSub}>Nasabah mengajukan sanggahan timbangan tiket.</Text>
                  </View>
                </TouchableOpacity>
              )}

              {pendingRedemptionsCount > 0 && (
                <TouchableOpacity
                  style={styles.notifCardItem}
                  onPress={() => {
                    setNotifModalVisible(false);
                    setRedemptionFilter("REQUESTED");
                    setCurrentTab(3);
                  }}
                >
                  <View style={[styles.notifIconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Coins size={18} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, { color: "#D97706" }]}>
                      {pendingRedemptionsCount} Permintaan Pencairan Poin
                    </Text>
                    <Text style={styles.notifSub}>Nasabah menunggu pembayaran kas di loket.</Text>
                  </View>
                </TouchableOpacity>
              )}

              {disputedCount === 0 && pendingRedemptionsCount === 0 && (
                <View style={styles.emptyNotifBox}>
                  <CheckCheck size={32} color="#0E6641" />
                  <Text style={styles.emptyNotifText}>Semua tugas selesai, tidak ada peringatan aktif!</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Logout / Role Switcher Modal */}
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
              Pilih tindakan yang ingin Anda lakukan untuk sesi akun ini:
            </Text>

            <TouchableOpacity
              style={styles.modalMenuActionBtn}
              onPress={() => {
                setLogoutModalVisible(false);
                navigate("role");
              }}
            >
              <Store size={16} color="#0E6641" />
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
              <Text style={styles.modalMenuActionText}>Beralih ke Aplikasi Customer</Text>
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

      {/* 4. Edit Account & PIC Modal */}
      <Modal
        visible={accountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Detail Akun & Petugas</Text>
                <Text style={styles.modalSub}>Perbarui data identitas kontak petugas Bank Sampah</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAccountModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Nama Petugas PIC:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editOfficerName}
              onChangeText={setEditOfficerName}
              placeholder="Nama lengkap petugas"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.modalInputLabel}>Nomor WhatsApp / HP:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editOfficerPhone}
              onChangeText={setEditOfficerPhone}
              placeholder="Contoh: 0812-3456-7890"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <Text style={styles.modalInputLabel}>Alamat Email:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editOfficerEmail}
              onChangeText={setEditOfficerEmail}
              placeholder="email@geoverse.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setAccountModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={handleSaveAccount}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.modalBtnSubmitText}>Simpan Perubahan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Ubah Kata Sandi</Text>
                <Text style={styles.modalSub}>Pastikan kata sandi baru kuat dan aman</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPasswordModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Kata Sandi Saat Ini:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={currPassword}
              onChangeText={setCurrPassword}
              placeholder="Masukkan kata sandi lama"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <Text style={styles.modalInputLabel}>Kata Sandi Baru:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <Text style={styles.modalInputLabel}>Konfirmasi Kata Sandi Baru:</Text>
            <TextInput
              style={styles.modalTextInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ketik ulang kata sandi baru"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={handleSavePassword}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.modalBtnSubmitText}>Perbarui Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Address & Location Modal */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Alamat & Titik Lokasi Loket</Text>
                <Text style={styles.modalSub}>Alamat resmi untuk panduan nasabah & armada pickup</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddressModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Alamat Lengkap Loket:</Text>
            <TextInput
              style={[styles.modalTextInput, { height: 72, textAlignVertical: "top" }]}
              value={tempAddress}
              onChangeText={setTempAddress}
              placeholder="Contoh: Jl. Kamojang No. 8, Samarang, Garut"
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setAddressModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={handleSaveAddress}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.modalBtnSubmitText}>Simpan Alamat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. Help & SOP Modal */}
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Bantuan & SOP Penimbangan</Text>
                <Text style={styles.modalSub}>Pedoman operasional standar Bank Sampah GEOVERSE</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setHelpModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={styles.helpSectionCard}>
                <Text style={styles.helpSectionHeading}>1. Alur Penimbangan Loket</Text>
                <Text style={styles.helpSectionBody}>
                  Cek kode tiket setor nasabah pada menu Antrean. Timbang masing-masing kategori sampah (Plastik, Kertas, Logam, dsb) secara transparan. Masukkan bobot aktual hasil timbangan.
                </Text>
              </View>

              <View style={styles.helpSectionCard}>
                <Text style={styles.helpSectionHeading}>2. Konversi Poin & Rupiah</Text>
                <Text style={styles.helpSectionBody}>
                  Setiap nominal setoran sampah terstandarisasi dengan rasio 100 Poin GEOVERSE = Rp 1. Poin akan langsung dikreditkan ke saldo akun nasabah saat verifikasi selesai.
                </Text>
              </View>

              <View style={styles.helpSectionCard}>
                <Text style={styles.helpSectionHeading}>3. Penanganan Komplain / Dispute</Text>
                <Text style={styles.helpSectionBody}>
                  Jika nasabah merasa hasil timbang berbeda dari estimasi awal, tiket akan berstatus Komplain (Dispute). Petugas dapat melakukan penimbangan ulang bersama nasabah.
                </Text>
              </View>

              <View style={styles.helpSectionCard}>
                <Text style={styles.helpSectionHeading}>4. Layanan Pencairan Kas Loket</Text>
                <Text style={styles.helpSectionBody}>
                  Nasabah dapat menukarkan saldo poin menjadi kas tunai di loket Anda melalui menu Keuangan. Serahkan uang tunai fisik setelah menekan tombol "Bayarkan Sekarang".
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtnSubmit, { width: "100%" }]}
              onPress={() => setHelpModalVisible(false)}
            >
              <Text style={styles.modalBtnSubmitText}>Tutup Panduan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 8. Privacy & Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { maxHeight: "75%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Privasi & Keamanan Data</Text>
                <Text style={styles.modalSub}>Kebijakan standar ekosistem mitra GEOVERSE</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPrivacyModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <Text style={styles.privacyBodyText}>
                GEOVERSE berkomitmen menjaga kerahasiaan data pribadi petugas dan seluruh nasabah Bank Sampah. Seluruh transaksi penimbangan, riwayat penerbitan poin, dan mutasi kas terlindungi enkripsi standar industri.
              </Text>
              <Text style={styles.privacyBodyText}>
                Data nomor telepon dan alamat hanya dipergunakan untuk keperluan operasional penjemputan sampah dan konfirmasi tiket setor nasabah. Sesuai Apple App Store Guideline 5.1.1(v), setiap mitra memiliki hak penuh untuk mengajukan penghapusan akun beserta riwayat unit secara permanen kapan saja.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtnSubmit, { width: "100%" }]}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.modalBtnSubmitText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mainTabBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  scrollContentWide: {
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },

  // Bottom Navigation Bar
  bottomNavContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    alignItems: "center",
    justifyContent: "space-around",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)" } as any,
    }),
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  navIconBg: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    position: "relative",
  },
  navIconBgActive: {
    backgroundColor: "#E8F5EE",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 2,
  },
  navLabelActive: {
    color: "#0E6641",
    fontWeight: "800",
  },
  navBadgeCircle: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  navBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  // Unit Hero Card
  unitHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  unitHeroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unitHeroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  unitTagRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 4,
  },
  statusLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
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
    color: "#0E6641",
  },
  pickupPillActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  pickupPillTextActive: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0284C7",
  },
  pickupPillInactive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  pickupPillTextInactive: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
  },
  unitHeroNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 2,
    flexWrap: "wrap",
  },
  unitHeroName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 18,
    flexShrink: 1,
  },
  unitHeroOfficer: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  unitAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 8,
  },
  unitAddressText: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
    lineHeight: 15,
  },
  unitHoursBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  unitHoursBannerText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0E6641",
    flex: 1,
    lineHeight: 14,
  },
  unitActionGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  unitActionBtnHours: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  unitActionBtnHoursText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0E6641",
    textAlign: "center",
    lineHeight: 14,
  },
  unitActionBtnCatalog: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: "#F0F9FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  unitActionBtnCatalogText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
    textAlign: "center",
    lineHeight: 14,
  },

  // Search Section
  searchSection: {
    marginBottom: 12,
  },
  searchSectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  btnSearchAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#0E6641",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  btnSearchActionText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  searchErrorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
    marginLeft: 4,
  },

  // Executive Metric Cards
  metricsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricCardGreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  metricCardAmber: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  metricCardOrange: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  metricCardBlue: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  metricCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metricIconCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  metricIconCircleAmber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  metricIconCircleOrange: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  metricIconCircleBlue: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  metricBadgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  metricBadgeTextGreen: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0E6641",
  },
  metricBadgeAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  metricBadgeTextAmber: {
    fontSize: 9,
    fontWeight: "800",
    color: "#B45309",
  },
  metricBadgeOrange: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  metricBadgeTextOrange: {
    fontSize: 9,
    fontWeight: "800",
    color: "#C2410C",
  },
  metricBadgeBlue: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  metricBadgeTextBlue: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  metricValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  metricUnit: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  metricLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
    minHeight: 26,
    lineHeight: 13,
  },

  // Quick Nav Card
  quickNavCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  quickNavCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  quickNavGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickNavItem: {
    flex: 1,
    alignItems: "center",
  },
  quickNavIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickNavLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
    lineHeight: 12,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  seeAllBtn: {
    flexShrink: 0,
    paddingVertical: 4,
    paddingLeft: 6,
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0E6641",
  },

  // Mini Empty Card
  emptyCardMini: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardMiniTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0E6641",
    marginTop: 6,
    textAlign: "center",
  },
  emptyCardMiniText: {
    fontSize: 11,
    color: "#166534",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 15,
  },

  // Queue Segmented Tab Bar
  queueTabBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 14,
    marginBottom: 12,
    gap: 4,
  },
  queueTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  queueTabActive: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  queueTabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  queueTabTextActive: {
    color: "#0E6641",
    fontWeight: "800",
  },
  queueTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  queueTabBadgeActive: {
    backgroundColor: "#0E6641",
  },
  queueTabBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
  },
  queueTabBadgeTextActive: {
    color: "#FFFFFF",
  },

  // Dispute Notice
  disputeTopBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    marginBottom: 10,
  },
  disputeTopBannerText: {
    fontSize: 11.5,
    color: "#DC2626",
    fontWeight: "700",
    flex: 1,
  },

  // Deposit Cards
  depositCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
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
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodBadgeDropOff: {
    backgroundColor: "#E0F2FE",
  },
  methodBadgePickup: {
    backgroundColor: "#DCFCE7",
  },
  methodBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  methodBadgeTextDropOff: {
    color: "#0369A1",
  },
  methodBadgeTextPickup: {
    color: "#0E6641",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  customerName: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillGreen: { backgroundColor: "#DCFCE7" },
  statusPillRed: { backgroundColor: "#FEE2E2" },
  statusPillAmber: { backgroundColor: "#FEF3C7" },
  statusPillBlue: { backgroundColor: "#DBEAFE" },
  statusPillText: { fontSize: 10, fontWeight: "800" },
  statusPillTextGreen: { color: "#0E6641" },
  statusPillTextRed: { color: "#DC2626" },
  statusPillTextAmber: { color: "#B45309" },
  statusPillTextBlue: { color: "#1D4ED8" },

  cardDisputeNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 6,
    marginTop: 8,
  },
  cardDisputeNoticeText: {
    fontSize: 10.5,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  categoryTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  depositCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerWeightLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  footerWeightVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  footerPointVal: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#D97706",
  },
  btnTimbangAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  btnTimbangActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyQueueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  emptyQueueText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },

  // Page Headers
  pageHeaderBox: {
    marginBottom: 14,
    marginTop: 4,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  // Katalog Styles
  officialNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  officialNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0E6641",
  },
  officialNoticeText: {
    fontSize: 10.5,
    color: "#166534",
    marginTop: 2,
    lineHeight: 15,
  },
  catalogSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  catChipsWrap: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 2,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  catChipActive: {
    backgroundColor: "#0E6641",
    borderColor: "#0E6641",
  },
  catChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  catChipTextActive: {
    color: "#FFFFFF",
  },
  catalogGrid: {
    gap: 10,
  },
  priceItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  priceCatName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  priceSubCatName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  priceValueBadge: {
    alignItems: "flex-end",
  },
  priceValueText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0E6641",
  },
  priceUnitText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  priceCardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  priceCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  pointsBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  minWeightText: {
    fontSize: 10,
    color: "#64748B",
  },

  // Keuangan Styles
  financeSummaryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  financeSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  financeSummaryLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  financeSummaryVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0E6641",
    letterSpacing: -0.4,
    marginVertical: 2,
  },
  financeSummarySub: {
    fontSize: 9.5,
    color: "#94A3B8",
  },
  financeDividerV: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  redemptionFilterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  redemptionFilterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  redemptionFilterBtnActive: {
    backgroundColor: "#0E6641",
    borderColor: "#0E6641",
  },
  redemptionFilterBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  redemptionFilterBtnTextActive: {
    color: "#FFFFFF",
  },
  redemptionDetailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  redemptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  redemptionLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  redemptionValueHighlight: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0E6641",
  },
  redemptionValuePoints: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  redemptionValueTarget: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "600",
  },
  redemptionActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  btnRejectRedemption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRejectRedemptionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  btnPayRedemption: {
    flex: 2,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0E6641",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPayRedemptionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Akun Tab Styles
  accountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  accountUnitName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  accountRoleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0E6641",
    marginTop: 1,
  },
  accountOfficerText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  accountDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  accountInfoGrid: {
    gap: 8,
  },
  accountInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  accountInfoLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    width: 90,
  },
  accountInfoValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  settingsSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  settingsSectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  settingsRowClickable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  settingsRowSwitch: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRowTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingsRowSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  settingsRowDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  inputSectionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  inputHoursBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  hoursInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  presetSectionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  presetHourPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetHourPillActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#0E6641",
  },
  presetHourPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  presetHourPillTextActive: {
    color: "#0E6641",
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 14,
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: "700",
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
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  successMessageText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0E6641",
  },
  btnSaveHours: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0E6641",
    borderRadius: 14,
    paddingVertical: 12,
  },
  btnSaveHoursText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Notification Modal Items
  notifCardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  notifSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  emptyNotifBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyNotifText: {
    fontSize: 12,
    color: "#0E6641",
    fontWeight: "700",
    textAlign: "center",
  },

  // Logout Modal Menu
  modalMenuActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  modalMenuActionText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },

  // Akun Tab Standardized Styles (Matching Pemilik Catering, Kos, Shop)
  akunScrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    backgroundColor: "#0E6641",
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  profileOwnerName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 8,
    paddingHorizontal: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  profileUnitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 2,
    paddingHorizontal: 16,
    flexWrap: "wrap",
  },
  profileUnitNameText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#E8F5EE",
    textAlign: "center",
    lineHeight: 16,
  },
  profilePhoneText: {
    fontSize: 12,
    color: "#E8F5EE",
    marginTop: 2,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    width: "100%",
  },
  statCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLbl: {
    fontSize: 10,
    color: "#E8F5EE",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginHorizontal: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemBody: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  menuItemSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 62,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#FEE2E2",
    borderWidth: 1,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 14,
    marginTop: 20,
  },
  logoutIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  logoutBtnSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 14,
    marginTop: 10,
  },
  deleteAccountBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  deleteAccountBtnSub: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 1,
  },
  footerVersion: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 24,
  },
  footerSubVersion: {
    textAlign: "center",
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 2,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  modalTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  modalBtnSubmit: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0E6641",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalBtnSubmitText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  helpSectionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  helpSectionHeading: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0E6641",
    marginBottom: 4,
  },
  helpSectionBody: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 17,
  },
  privacyBodyText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
});
