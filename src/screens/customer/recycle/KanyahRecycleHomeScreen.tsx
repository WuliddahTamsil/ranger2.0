import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Recycle,
  Leaf,
  WalletCards,
  ArrowUpRight,
  Clock,
  MapPin,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  ArrowLeft,
  Truck,
  Scale,
  CheckCircle2,
  TreeDeciduous,
  Wind,
  Building2,
  Navigation,
  X,
  Check,
  Coins,
  Info,
  Search,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Layers,
  Zap,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useRecycle } from "../../../context/RecycleContext";
import { useGeoversePoint } from "../../../features/geoversePoint/hooks/useGeoversePoint";
import {
  getWasteBanks,
  getCustomerDeposits,
} from "../../../services/recycleService";
import { WasteBankUI, WasteDepositUI } from "../../../types/recycleTypes";
import { rp, formatNumberSafe, formatDateSafe } from "../../../utils/formatters";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

export const KanyahRecycleHomeScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isWide = width >= 768;

  const {
    wallet: recycleWallet,
    refreshWallet: refreshRecycleWallet,
    walletLoading,
    setSelectedBank,
    setSelectedDeposit,
    updateDraftDeposit,
  } = useRecycle();

  const { wallet: pointWallet, refreshWallet: refreshPointWallet } = useGeoversePoint();
  const wallet = pointWallet || recycleWallet;
  const [nearbyBanks, setNearbyBanks] = useState<WasteBankUI[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<WasteDepositUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Address & Location state & Persistence Key
  const RECYCLE_LOCATION_STORAGE_KEY = "@geoverse_recycle_selected_location";

  const initialAddr =
    authAccount?.address && authAccount.address !== "BGR" && authAccount.address.length > 5
      ? authAccount.address
      : "Jl. Kamojang No. 8, Samarang, Garut";
  const [userAddress, setUserAddress] = useState(initialAddr);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: -7.145, lng: 107.789 });
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState("");

  // Verified active partner bank locations (all corresponding to real registered user accounts in MongoDB)
  const baseLocations = [
    {
      id: "6ac1002378c866d3600036fa",
      label: "Pakuan (Bogor)",
      address: "Pakuan, Bogor, Jawa Barat",
      lat: -6.5976,
      lng: 106.8062,
      bankName: "Bank Sampah Pakuan",
      officerEmail: "agalagan@gmail.com",
    },
    {
      id: "6aadbb8c5513afda4c34d9a0",
      label: "Kamojang (Samarang, Garut)",
      address: "Jl. Kamojang No. 8, Samarang, Garut",
      lat: -7.1452,
      lng: 107.7891,
      bankName: "Bank Sampah Induk Kamojang Asri",
      officerEmail: "banksampah@geoverse.com",
    },
    {
      id: "6aadbb8c5513afda4c34d9b4",
      label: "Garut Kota",
      address: "Jl. Cimanuk No. 42, Garut Kota",
      lat: -7.2185,
      lng: 107.9022,
      bankName: "Bank Sampah Berkah Mandiri Garut",
      officerEmail: "banksampah.garutkota@geoverse.com",
    },
    {
      id: "6aadbb8d5513afda4c34d9c1",
      label: "Coblong / Dago (Bandung)",
      address: "Jl. Dago No. 120, Coblong, Bandung",
      lat: -6.885,
      lng: 107.614,
      bankName: "Bank Sampah Hijau Lestari Bandung",
      officerEmail: "banksampah.bandung@geoverse.com",
    },
    {
      id: "6aadbb8d5513afda4c34d9ce",
      label: "Sumur Bandung",
      address: "Jl. Merdeka No. 64, Sumur Bandung",
      lat: -6.912,
      lng: 107.6105,
      bankName: "Bank Sampah Merdeka Bersih",
      officerEmail: "banksampah.merdeka@geoverse.com",
    },
  ];

  // Dynamically include any other registered bank addresses from real API data
  const allServiceLocations = useMemo(() => {
    if (nearbyBanks && nearbyBanks.length > 0) {
      return nearbyBanks.map((b) => {
        const bAddr = String(b.address || "");
        const bName = String(b.name || "Bank Sampah");
        let label = bName;
        const lowerName = bName.toLowerCase();
        const lowerAddr = bAddr.toLowerCase();
        if (lowerName.includes("pakuan") || lowerAddr.includes("pakuan")) {
          label = "Pakuan (Bogor)";
        } else if (lowerName.includes("kamojang") || lowerAddr.includes("kamojang")) {
          label = "Kamojang (Samarang, Garut)";
        } else if (lowerName.includes("garut") || lowerAddr.includes("cimanuk")) {
          label = "Garut Kota";
        } else if (lowerName.includes("dago") || lowerAddr.includes("coblong")) {
          label = "Coblong / Dago (Bandung)";
        } else if (lowerName.includes("merdeka") || lowerAddr.includes("sumur bandung")) {
          label = "Sumur Bandung";
        } else {
          label = `${bName} (${bAddr.split(",")[0] || bAddr})`;
        }
        return {
          id: b._id,
          label,
          address: bAddr,
          lat: Number(b.latitude) || -7.145,
          lng: Number(b.longitude) || 107.789,
          bankName: bName,
        };
      });
    }
    return baseLocations;
  }, [nearbyBanks]);

  const filteredPresetLocations = useMemo(() => {
    const queryLower = (searchLocationQuery || "").toLowerCase().trim();
    if (!queryLower) return allServiceLocations;
    return allServiceLocations.filter(
      (p) =>
        (p.label || "").toLowerCase().includes(queryLower) ||
        (p.address || "").toLowerCase().includes(queryLower) ||
        (p.bankName && p.bankName.toLowerCase().includes(queryLower))
    );
  }, [allServiceLocations, searchLocationQuery]);

  const loadData = async (coords = userCoords) => {
    try {
      const [banksRes, depositsRes] = await Promise.all([
        getWasteBanks(coords.lat, coords.lng),
        authAccount?.id ? getCustomerDeposits(authAccount.id) : Promise.resolve({ success: false, data: [] }),
      ]);

      if (banksRes && banksRes.success && Array.isArray(banksRes.data)) {
        setNearbyBanks(banksRes.data);
      }
      if (depositsRes && depositsRes.success && Array.isArray(depositsRes.data)) {
        setRecentDeposits(depositsRes.data.slice(0, 5));
      }
    } catch (err) {
      console.error("KanyahRecycleHomeScreen loadData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Restore saved location from AsyncStorage on mount so it persists across refreshes
  useEffect(() => {
    let isMounted = true;

    const restoreSavedLocationAndLoad = async () => {
      let activeCoords = userCoords;
      try {
        const userKey = authAccount?.id ? `${RECYCLE_LOCATION_STORAGE_KEY}_${authAccount.id}` : null;
        let savedRaw = userKey ? await AsyncStorage.getItem(userKey) : null;
        if (!savedRaw) {
          savedRaw = await AsyncStorage.getItem(RECYCLE_LOCATION_STORAGE_KEY);
        }

        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (
            parsed &&
            parsed.address &&
            parsed.coords &&
            typeof parsed.coords.lat === "number" &&
            typeof parsed.coords.lng === "number"
          ) {
            if (isMounted) {
              setUserAddress(parsed.address);
              setUserCoords(parsed.coords);
              activeCoords = parsed.coords;
            }
          }
        }
      } catch (err) {
        console.warn("KanyahRecycleHomeScreen restore saved location error:", err);
      } finally {
        if (isMounted) {
          loadData(activeCoords);
          refreshRecycleWallet().catch(() => {});
        }
      }
    };

    restoreSavedLocationAndLoad();

    return () => {
      isMounted = false;
    };
  }, [authAccount?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshRecycleWallet().catch(() => {});
    loadData(userCoords);
  };

  const handleSaveAddress = (newAddress: string, newCoords?: { lat: number; lng: number }) => {
    const finalAddress = newAddress.trim() || userAddress;
    const finalCoords = newCoords || userCoords;
    setUserAddress(finalAddress);
    setUserCoords(finalCoords);
    setAddressModalVisible(false);
    loadData(finalCoords);

    // Persist to AsyncStorage so selected location stays even after refresh
    const payload = JSON.stringify({
      address: finalAddress,
      coords: finalCoords,
      savedAt: Date.now(),
    });
    AsyncStorage.setItem(RECYCLE_LOCATION_STORAGE_KEY, payload).catch((e) =>
      console.warn("AsyncStorage save error:", e)
    );
    if (authAccount?.id) {
      AsyncStorage.setItem(`${RECYCLE_LOCATION_STORAGE_KEY}_${authAccount.id}`, payload).catch(() => {});
    }
  };

  const handleStartDepositToBank = (bank: WasteBankUI) => {
    setSelectedBank(bank);
    updateDraftDeposit({
      bankSampahId: bank._id,
      bankSampahName: bank.name,
      pickupAddress: userAddress,
      pickupLatitude: userCoords.lat,
      pickupLongitude: userCoords.lng,
    });
    navigate("c_recycle_deposit_form");
  };

  const balance = Number(wallet?.balancePoint) || 0;
  const totalKg = Number(wallet?.totalKgDeposited) || 0;
  const co2Kg = Number(wallet?.totalCo2ReductionKg) || totalKg * 1.85;
  const treesCount = Math.floor(co2Kg / 22);

  const activeDeposit = recentDeposits.find(
    (d) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(d.status)
  );

  const nearestBank = useMemo(() => {
    if (!nearbyBanks || nearbyBanks.length === 0) return null;
    const lower = (userAddress || "").toLowerCase();
    const exactMatch = nearbyBanks.find((b) => {
      if (!b) return false;
      const bAddr = (b.address || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      if (lower.includes("pakuan") || lower.includes("bogor")) {
        return bName.includes("pakuan") || bAddr.includes("pakuan") || bAddr.includes("bogor");
      }
      if (lower.includes("kamojang") || lower.includes("samarang")) {
        return bName.includes("kamojang") || bAddr.includes("kamojang") || bAddr.includes("samarang");
      }
      if (lower.includes("cimanuk") || lower.includes("garut kota")) {
        return bName.includes("berkah") || bAddr.includes("cimanuk") || bAddr.includes("garut kota");
      }
      if (lower.includes("dago") || lower.includes("coblong")) {
        return bName.includes("hijau") || bAddr.includes("dago") || bAddr.includes("coblong");
      }
      if (lower.includes("merdeka") || lower.includes("sumur bandung")) {
        return bName.includes("merdeka") || bAddr.includes("merdeka") || bAddr.includes("sumur bandung");
      }
      return bAddr.includes(lower) || lower.includes(bAddr);
    });
    return exactMatch || nearbyBanks[0];
  }, [nearbyBanks, userAddress]);

  // Sub-components for clean responsive composition
  const locationSelectorCard = (
    <TouchableOpacity
      style={styles.locationSelectorCard}
      onPress={() => {
        setSearchLocationQuery("");
        setAddressModalVisible(true);
      }}
      activeOpacity={0.75}
    >
      <View style={styles.locationIconBox}>
        <MapPin size={15} color="#059669" />
      </View>
      <View style={styles.locationInfoCol}>
        <Text style={styles.locationOverline}>LOKASI PENYETORAN</Text>
        <Text style={styles.locationCurrentAddress} numberOfLines={1}>
          {userAddress}
        </Text>
      </View>
      <View style={styles.locationChangeButton}>
        <Text style={styles.locationChangeButtonText}>Ubah</Text>
        <ChevronRight size={13} color="#059669" />
      </View>
    </TouchableOpacity>
  );

  const heroWalletCard = (
    <View style={styles.heroWalletContainer}>
      <View style={styles.heroGradientBg}>
        <View style={styles.heroSubtleCircleOne} />
        <View style={styles.heroSubtleCircleTwo} />

        <View style={styles.heroContentTop}>
          <View style={styles.heroPointsCol}>
            <View style={styles.heroPointBadge}>
              <Image
                source={require("../../../../assets/kanyaah-point.png")}
                style={{ width: 14, height: 14, borderRadius: 3 }}
                resizeMode="cover"
              />
              <Text style={styles.heroPointBadgeLabel}>SALDO GEOVERSE POINT</Text>
            </View>
            <View style={styles.heroBalanceMainRow}>
              <Text style={styles.heroBalanceNumber}>{formatNumberSafe(balance)}</Text>
              <Text style={styles.heroBalanceUnit}>Pts</Text>
            </View>
            <Text style={styles.heroRupiahConversion}>
              ≈ {rp(balance)} <Text style={styles.heroConversionSub}>• 1 Pts = Rp 1</Text>
            </Text>
          </View>

          <View style={styles.heroWeightWidget}>
            <View style={styles.heroWeightIconCircle}>
              <Leaf size={14} color="#059669" />
            </View>
            <Text style={styles.heroWeightVal}>{totalKg.toFixed(1)} kg</Text>
            <Text style={styles.heroWeightLabel}>Total Disetor</Text>
          </View>
        </View>

        {/* Docked Action Bar: Quick Primary Interactions */}
        <View style={styles.actionDock}>
          <TouchableOpacity
            style={styles.actionDockItem}
            onPress={() => navigate("c_recycle_banks")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionDockIconBg, { backgroundColor: "#ECFDF5" }]}>
              <Image
                source={require("../../../../assets/kanyaah-recycle.png")}
                style={{ width: 22, height: 22, borderRadius: 6 }}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.actionDockTitle}>Setor Sampah</Text>
            <Text style={styles.actionDockSub}>Pilih Mitra</Text>
          </TouchableOpacity>

          <View style={styles.actionDockDivider} />

          <TouchableOpacity
            style={styles.actionDockItem}
            onPress={() => navigate("c_recycle_redemption")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionDockIconBg, { backgroundColor: "#FFFBEB" }]}>
              <Image
                source={require("../../../../assets/kanyaah-point.png")}
                style={{ width: 20, height: 20, borderRadius: 5 }}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.actionDockTitle}>Tukar Poin</Text>
            <Text style={styles.actionDockSub}>Voucher & Hadiah</Text>
          </TouchableOpacity>

          <View style={styles.actionDockDivider} />

          <TouchableOpacity
            style={styles.actionDockItem}
            onPress={() => navigate("c_recycle_ledger")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionDockIconBg, { backgroundColor: "#F0F9FF" }]}>
              <WalletCards size={18} color="#0284C7" />
            </View>
            <Text style={styles.actionDockTitle}>Buku Tabungan</Text>
            <Text style={styles.actionDockSub}>Mutasi & Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const activeBannerCard = activeDeposit ? (
    <TouchableOpacity
      style={[
        styles.activeBannerCard,
        activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" && styles.activeBannerCardAlert,
      ]}
      onPress={() => {
        setSelectedDeposit(activeDeposit);
        if (activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION") {
          navigate("c_recycle_weighing_result");
        } else {
          navigate("c_recycle_tracking");
        }
      }}
      activeOpacity={0.85}
    >
      <View style={styles.activeBannerLeft}>
        <View
          style={[
            styles.activeBannerIconContainer,
            activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" && styles.activeBannerIconContainerAlert,
          ]}
        >
          <Scale
            size={16}
            color={activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" ? "#D97706" : "#059669"}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[
              styles.activeBannerHeadline,
              activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" && styles.activeBannerHeadlineAlert,
            ]}
          >
            {activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION"
              ? "Timbangan Menunggu Konfirmasi!"
              : "Setoran Sampah Sedang Berjalan"}
          </Text>
          <Text style={styles.activeBannerSubtitle}>
            Tiket #{activeDeposit.depositCode} • Ketuk untuk pantau
          </Text>
        </View>
      </View>
      <ChevronRight
        size={16}
        color={activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" ? "#D97706" : "#64748B"}
      />
    </TouchableOpacity>
  ) : null;

  const nearestBankCard = nearestBank ? (
    <View style={styles.partnerCard}>
      <View style={styles.partnerCardHeader}>
        <View style={styles.partnerStatusTag}>
          <View style={styles.partnerLiveDot} />
          <Text style={styles.partnerStatusTagText}>Mitra Bank Sampah Terdekat</Text>
        </View>
        {nearestBank.distanceKm != null && (
          <View style={styles.partnerDistanceBadge}>
            <Navigation size={10} color="#059669" />
            <Text style={styles.partnerDistanceBadgeText}>
              {Number(nearestBank.distanceKm || 0).toFixed(1)} km
            </Text>
          </View>
        )}
      </View>

      <View style={styles.partnerInfoRow}>
        <View style={styles.partnerIconBox}>
          <Building2 size={20} color="#059669" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={styles.partnerNameText}>{nearestBank.name}</Text>
            <ShieldCheck size={14} color="#059669" />
          </View>
          <Text style={styles.partnerAddressText} numberOfLines={1}>
            {nearestBank.address}
          </Text>

          <View style={styles.partnerMetaTagsRow}>
            <View style={styles.partnerMetaItem}>
              <Clock size={11} color="#64748B" />
              <Text style={styles.partnerMetaItemText}>{nearestBank.openingHours}</Text>
            </View>
            {(nearestBank.maxPrice || 0) > 0 && (
              <View style={styles.partnerPriceBadge}>
                <Sparkles size={10} color="#B45309" />
                <Text style={styles.partnerPriceBadgeText}>
                  Hingga {rp(nearestBank.maxPrice || 0)}/kg
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Accepted Categories Chips */}
      {nearestBank.acceptedCategories && nearestBank.acceptedCategories.length > 0 && (
        <View style={styles.categoryChipsContainer}>
          {nearestBank.acceptedCategories.slice(0, 4).map((catName, idx) => (
            <View key={`${catName}-${idx}`} style={styles.categoryChipItem}>
              <Text style={styles.categoryChipItemText}>{catName}</Text>
            </View>
          ))}
          {nearestBank.acceptedCategories.length > 4 && (
            <View style={[styles.categoryChipItem, styles.categoryChipItemMore]}>
              <Text style={styles.categoryChipItemMoreText}>
                +{nearestBank.acceptedCategories.length - 4} jenis
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Direct Action Row */}
      <View style={styles.partnerActionRow}>
        <TouchableOpacity
          style={styles.partnerPrimaryButton}
          onPress={() => handleStartDepositToBank(nearestBank)}
          activeOpacity={0.85}
        >
          <Text style={styles.partnerPrimaryButtonText}>Setor ke Bank Ini</Text>
          <ArrowRight size={15} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.partnerSecondaryButton}
          onPress={() => navigate("c_recycle_banks")}
          activeOpacity={0.7}
        >
          <Text style={styles.partnerSecondaryButtonText}>Lihat Semua</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const impactSection = (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kontribusi Lingkungan</Text>
        <View style={styles.ecoLevelBadge}>
          <Leaf size={11} color="#059669" />
          <Text style={styles.ecoLevelBadgeText}>Eco Hero</Text>
        </View>
      </View>

      <View style={styles.impactCardsRow}>
        <View style={styles.modernImpactCard}>
          <View style={[styles.modernImpactIconBox, { backgroundColor: "#ECFDF5" }]}>
            <Wind size={16} color="#059669" />
          </View>
          <Text style={styles.modernImpactValue}>
            {co2Kg.toFixed(1)} <Text style={styles.modernImpactUnit}>kg</Text>
          </Text>
          <Text style={styles.modernImpactLabel}>Emisi CO₂ Dicegah</Text>
        </View>

        <View style={styles.modernImpactCard}>
          <View style={[styles.modernImpactIconBox, { backgroundColor: "#F0FDF4" }]}>
            <TreeDeciduous size={16} color="#15803D" />
          </View>
          <Text style={styles.modernImpactValue}>
            {treesCount} <Text style={styles.modernImpactUnit}>pohon</Text>
          </Text>
          <Text style={styles.modernImpactLabel}>Pohon Diselamatkan</Text>
        </View>

        <View style={styles.modernImpactCard}>
          <View style={[styles.modernImpactIconBox, { backgroundColor: "#F0FDFA" }]}>
            <Scale size={16} color="#0D9488" />
          </View>
          <Text style={styles.modernImpactValue}>
            {totalKg.toFixed(1)} <Text style={styles.modernImpactUnit}>kg</Text>
          </Text>
          <Text style={styles.modernImpactLabel}>Diverted dari TPA</Text>
        </View>
      </View>
    </View>
  );

  const guideSection = (
    <View style={styles.guideCardContainer}>
      <Text style={styles.guideCardTitle}>Cara Kerja Kanyaah Recycle</Text>
      <View style={styles.guideStepsRow}>
        <View style={styles.guideStepColumn}>
          <View style={styles.guideStepNumberBadge}>
            <Text style={styles.guideStepNumberText}>1</Text>
          </View>
          <Text style={styles.guideStepTitle}>Pilih Mitra</Text>
          <Text style={styles.guideStepDesc}>Pilih bank sampah & jenis anorganik</Text>
        </View>

        <View style={styles.guideStepConnector} />

        <View style={styles.guideStepColumn}>
          <View style={styles.guideStepNumberBadge}>
            <Text style={styles.guideStepNumberText}>2</Text>
          </View>
          <Text style={styles.guideStepTitle}>Penyetoran</Text>
          <Text style={styles.guideStepDesc}>Antar langsung atau gunakan pickup</Text>
        </View>

        <View style={styles.guideStepConnector} />

        <View style={styles.guideStepColumn}>
          <View style={styles.guideStepNumberBadge}>
            <Text style={styles.guideStepNumberText}>3</Text>
          </View>
          <Text style={styles.guideStepTitle}>Terima Poin</Text>
          <Text style={styles.guideStepDesc}>Timbang resmi & poin langsung cair</Text>
        </View>
      </View>
    </View>
  );

  const recentTransactionsSection = (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Riwayat Setoran</Text>
        <TouchableOpacity onPress={() => navigate("c_recycle_ledger")}>
          <Text style={styles.seeAllLinkText}>Lihat Semua</Text>
        </TouchableOpacity>
      </View>

      {recentDeposits.length === 0 ? (
        <View style={styles.emptyActivityCard}>
          <Clock size={24} color="#94A3B8" />
          <Text style={styles.emptyActivityTitle}>Belum Ada Riwayat Setoran</Text>
          <Text style={styles.emptyActivitySub}>
            Mulai setorkan sampah anorganikmu ke mitra terdekat untuk mengumpulkan saldo poin.
          </Text>
        </View>
      ) : (
        recentDeposits.map((item) => {
          const hasPoint = Number(item.finalPoint || 0) > 0;
          return (
            <TouchableOpacity
              key={item._id}
              style={styles.transactionCard}
              onPress={() => {
                setSelectedDeposit(item);
                if (item.status === "WAITING_CUSTOMER_CONFIRMATION") {
                  navigate("c_recycle_weighing_result");
                } else {
                  navigate("c_recycle_tracking");
                }
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.transactionIconBg, { backgroundColor: hasPoint ? "#ECFDF5" : "#F1F5F9" }]}>
                <Recycle size={16} color={hasPoint ? "#059669" : "#64748B"} />
              </View>

              <View style={styles.transactionDetailsCol}>
                <Text style={styles.transactionCodeText}>#{item.depositCode}</Text>
                <Text style={styles.transactionMetaText}>
                  {item.method === "PICKUP" ? "Dijemput Driver" : "Antar Mandiri"} •{" "}
                  {formatDateSafe(item.createdAt)}
                </Text>
              </View>

              <View style={styles.transactionStatusCol}>
                {hasPoint ? (
                  <Text style={styles.transactionPointGreen}>
                    +{formatNumberSafe(item.finalPoint)} Pts
                  </Text>
                ) : (
                  <View style={styles.transactionStatusBadge}>
                    <Text style={styles.transactionStatusBadgeText}>
                      {item.status === "REQUESTED" || (item.status as string) === "PENDING"
                        ? "Menunggu"
                        : item.status === "ACCEPTED"
                        ? "Dijemput"
                        : item.status}
                    </Text>
                  </View>
                )}
                <ChevronRight size={14} color="#94A3B8" style={{ marginTop: 2 }} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Sleek Responsive Header */}
      <View style={styles.headerBarWrapper}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate("c_home")}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#1E293B" />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image
              source={require("../../../../assets/kanyaah-recycle.png")}
              style={{ width: 34, height: 34, borderRadius: 10 }}
              resizeMode="cover"
            />
            <View style={styles.headerCenterCol}>
              <View style={styles.headerBadgePill}>
                <View style={styles.headerBadgeDot} />
                <Text style={styles.headerBadgeText}>GEOVERSE RECYCLE</Text>
              </View>
              <Text style={styles.headerTitle}>Kanyaah Recycle</Text>
            </View>
          </View>

          {/* Right spacer to keep center title balanced */}
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
      >
        {isWide ? (
          /* ========================================================== */
          /* WIDE SCREEN LAYOUT: 2-COLUMN BALANCED DASHBOARD (Tablet/PC)*/
          /* ========================================================== */
          <View style={styles.wideGridRow}>
            {/* Left Column: Wallet, Actions, Bank Partner */}
            <View style={styles.wideColumnLeft}>
              {locationSelectorCard}
              {heroWalletCard}
              {activeBannerCard}
              {nearestBankCard}
            </View>

            {/* Right Column: Sustainability Impact, Guide, Ledger */}
            <View style={styles.wideColumnRight}>
              {impactSection}
              {guideSection}
              {recentTransactionsSection}
            </View>
          </View>
        ) : (
          /* ========================================================== */
          /* MOBILE STREAM LAYOUT: Single fluid column                  */
          /* ========================================================== */
          <View style={styles.mobileColumn}>
            {locationSelectorCard}
            {heroWalletCard}
            {activeBannerCard}
            {nearestBankCard}
            {impactSection}
            {guideSection}
            {recentTransactionsSection}
          </View>
        )}

        {/* Address Selection Modal (Responsive: Bottom Sheet on Mobile, Centered Dialog on Tablet/Desktop) */}
        <Modal
          visible={addressModalVisible}
          transparent
          animationType={isWide ? "fade" : "slide"}
          onRequestClose={() => {
            setAddressModalVisible(false);
            setSearchLocationQuery("");
          }}
        >
          <View style={[styles.modalOverlay, isWide && styles.modalOverlayWide]}>
            <View style={[styles.modalSheetContainer, isWide && styles.modalDialogWide]}>
              {!isWide && <View style={styles.modalDragHandle} />}

              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSheetTitle}>Pilih Wilayah Penyetoran</Text>
                  <Text style={styles.modalSheetSub}>
                    Pilih wilayah layanan aktif mitra Bank Sampah resmi GEOVERSE
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalSheetCloseBtn}
                  onPress={() => {
                    setAddressModalVisible(false);
                    setSearchLocationQuery("");
                  }}
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Search Available Location */}
              <View style={styles.modalSearchBox}>
                <Search size={15} color="#059669" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Cari wilayah (Pakuan, Garut, Dago...)"
                  placeholderTextColor="#94A3B8"
                  value={searchLocationQuery}
                  onChangeText={setSearchLocationQuery}
                />
                {searchLocationQuery ? (
                  <TouchableOpacity onPress={() => setSearchLocationQuery("")}>
                    <X size={14} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.modalListSectionTitle}>
                Wilayah Layanan Tersedia ({filteredPresetLocations.length}):
              </Text>

              <ScrollView style={{ maxHeight: isWide ? 360 : 300 }} showsVerticalScrollIndicator={false}>
                <View style={styles.modalLocationList}>
                  {filteredPresetLocations.length === 0 ? (
                    <View style={styles.emptyLocationBox}>
                      <MapPin size={20} color="#94A3B8" />
                      <Text style={styles.emptyLocationTitle}>Wilayah Tidak Ditemukan</Text>
                      <Text style={styles.emptyLocationSub}>
                        Penyetoran saat ini hanya aktif pada wilayah mitra terdaftar.
                      </Text>
                    </View>
                  ) : (
                    filteredPresetLocations.map((p, idx) => {
                      const isSelected =
                        userAddress.toLowerCase() === p.address.toLowerCase() ||
                        userAddress.toLowerCase().includes(p.address.toLowerCase()) ||
                        p.address.toLowerCase().includes(userAddress.toLowerCase()) ||
                        (nearestBank && nearestBank.name === p.bankName);
                      return (
                        <TouchableOpacity
                          key={`preset-${idx}`}
                          style={[styles.modalLocationItem, isSelected && styles.modalLocationItemActive]}
                          onPress={() => {
                            handleSaveAddress(p.address, { lat: p.lat, lng: p.lng });
                            setSearchLocationQuery("");
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.modalLocationDot, isSelected && styles.modalLocationDotActive]} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={[styles.modalLocationLabel, isSelected && styles.modalLocationLabelActive]}>
                                {p.label}
                              </Text>
                              <View style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 9, fontWeight: "700", color: "#059669" }}>Aktif</Text>
                              </View>
                            </View>
                            <Text style={styles.modalLocationAddress} numberOfLines={1}>
                              {p.address}
                            </Text>
                          </View>
                          {isSelected ? (
                            <CheckCircle2 size={16} color="#059669" />
                          ) : (
                            <ChevronRight size={14} color="#CBD5E1" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </ScrollView>
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
  // Responsive Header Wrapper
  headerBarWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  headerCenterCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBadgeDot: {
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  // Scroll Content & Responsive Layout
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
  mobileColumn: {
    width: "100%",
  },
  wideGridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
    width: "100%",
  },
  wideColumnLeft: {
    flex: 1.1,
  },
  wideColumnRight: {
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  // Location Selector Bar
  locationSelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  locationIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  locationInfoCol: {
    flex: 1,
  },
  locationOverline: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.6,
  },
  locationCurrentAddress: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 1,
  },
  locationChangeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 2,
    marginLeft: 8,
  },
  locationChangeButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  // Hero Wallet Container (Fintech ESG Aesthetic)
  heroWalletContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  heroGradientBg: {
    backgroundColor: "#064E3B",
    padding: 18,
    position: "relative",
    overflow: "hidden",
  },
  heroSubtleCircleOne: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  heroSubtleCircleTwo: {
    position: "absolute",
    left: -30,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  heroContentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroPointsCol: {
    flex: 1,
  },
  heroPointBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  heroPointBadgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A7F3D0",
    letterSpacing: 0.6,
  },
  heroBalanceMainRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroBalanceNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroBalanceUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FBBF24",
  },
  heroRupiahConversion: {
    fontSize: 11,
    color: "#D1FAE5",
    marginTop: 2,
    fontWeight: "500",
  },
  heroConversionSub: {
    color: "rgba(209, 250, 229, 0.7)",
  },
  heroWeightWidget: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 84,
  },
  heroWeightIconCircle: {
    marginBottom: 2,
  },
  heroWeightVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
  },
  heroWeightLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  // Docked Action Bar
  actionDock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionDockItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  actionDockIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  actionDockTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  actionDockSub: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 1,
  },
  actionDockDivider: {
    width: 1,
    height: 26,
    backgroundColor: "#F1F5F9",
  },
  // Active Order Notification Banner
  activeBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activeBannerCardAlert: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  activeBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activeBannerIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  activeBannerIconContainerAlert: {
    backgroundColor: "#FEF3C7",
  },
  activeBannerHeadline: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  activeBannerHeadlineAlert: {
    color: "#B45309",
  },
  activeBannerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  // Nearest Bank Partner Card
  partnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  partnerStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  partnerLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  partnerStatusTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  partnerDistanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  partnerDistanceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  partnerInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  partnerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  partnerNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  partnerAddressText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  partnerMetaTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
    flexWrap: "wrap",
  },
  partnerMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F8FAFC",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  partnerMetaItemText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  partnerPriceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFBEB",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  partnerPriceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#B45309",
  },
  categoryChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  categoryChipItem: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  categoryChipItemText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#475569",
  },
  categoryChipItemMore: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  categoryChipItemMoreText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  partnerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  partnerPrimaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  partnerPrimaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  partnerSecondaryButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerSecondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  // Section Headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  seeAllLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  ecoLevelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 12,
  },
  ecoLevelBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  // Impact Cards Grid
  impactCardsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modernImpactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  modernImpactIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  modernImpactValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  modernImpactUnit: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
  },
  modernImpactLabel: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 12,
  },
  // Guide / Onboarding Card
  guideCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  guideCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  guideStepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  guideStepColumn: {
    flex: 1,
    alignItems: "center",
  },
  guideStepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  guideStepNumberText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  guideStepTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 2,
  },
  guideStepDesc: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 12,
  },
  guideStepConnector: {
    width: 12,
    height: 1,
    backgroundColor: "#CBD5E1",
    marginTop: 11,
  },
  // Activity / Transaction Rows
  emptyActivityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  emptyActivityTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 6,
  },
  emptyActivitySub: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  transactionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  transactionDetailsCol: {
    flex: 1,
  },
  transactionCodeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  transactionMetaText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  transactionStatusCol: {
    alignItems: "flex-end",
  },
  transactionPointGreen: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  transactionStatusBadge: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  transactionStatusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  // Address Modal (Responsive: Bottom Sheet on Mobile, Centered Dialog on Tablet/Desktop)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalOverlayWide: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  modalDialogWide: {
    borderRadius: 20,
    maxWidth: 540,
    width: "100%",
    padding: 24,
    paddingBottom: 24,
    maxHeight: "80%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalSheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSheetSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  modalSheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    padding: 0,
  },
  modalListSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  modalLocationList: {
    gap: 6,
  },
  emptyLocationBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyLocationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  emptyLocationSub: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 2,
  },
  modalLocationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  modalLocationItemActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  modalLocationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  modalLocationDotActive: {
    backgroundColor: "#059669",
  },
  modalLocationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  modalLocationLabelActive: {
    color: "#059669",
    fontWeight: "700",
  },
  modalLocationAddress: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
});
