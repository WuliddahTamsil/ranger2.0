import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
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
  History,
  Info,
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
import { rp } from "../../../utils/formatters";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

export const KanyahRecycleHomeScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const { wallet: recycleWallet, refreshWallet: refreshRecycleWallet, walletLoading, setSelectedBank, setSelectedDeposit, updateDraftDeposit } = useRecycle();
  const { wallet: pointWallet, refreshWallet: refreshPointWallet } = useGeoversePoint();
  const wallet = pointWallet || recycleWallet;
  const [nearbyBanks, setNearbyBanks] = useState<WasteBankUI[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<WasteDepositUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Address & Location state
  const initialAddr = authAccount?.address && authAccount.address !== "BGR" && authAccount.address.length > 5
    ? authAccount.address
    : "Jl. Kamojang No. 12, Samarang, Garut";
  const [userAddress, setUserAddress] = useState(initialAddr);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: -7.145, lng: 107.789 });
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [inputAddress, setInputAddress] = useState(initialAddr);

  const presetLocations = [
    { label: "Kamojang (Samarang, Garut)", address: "Jl. Kamojang No. 8, Samarang, Garut", lat: -7.145, lng: 107.789 },
    { label: "Garut Kota", address: "Jl. Cimanuk No. 42, Garut Kota", lat: -7.218, lng: 107.902 },
    { label: "Coblong / Dago (Bandung)", address: "Jl. Dago No. 120, Coblong, Bandung", lat: -6.885, lng: 107.614 },
    { label: "Sumur Bandung", address: "Jl. Merdeka No. 64, Sumur Bandung", lat: -6.912, lng: 107.610 },
  ];

  const loadData = async (coords = userCoords) => {
    try {
      const [banksRes, depositsRes] = await Promise.all([
        getWasteBanks(coords.lat, coords.lng),
        authAccount?.id ? getCustomerDeposits(authAccount.id) : Promise.resolve({ success: false, data: [] }),
      ]);

      if (banksRes.success && Array.isArray(banksRes.data)) {
        setNearbyBanks(banksRes.data);
      }
      if (depositsRes.success && Array.isArray(depositsRes.data)) {
        setRecentDeposits(depositsRes.data.slice(0, 5));
      }
    } catch (err) {
      console.error("KanyahRecycleHomeScreen loadData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(userCoords);
    refreshRecycleWallet().catch(() => {});
    refreshPointWallet().catch(() => {});
  }, [authAccount?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshRecycleWallet().catch(() => {});
    refreshPointWallet().catch(() => {});
    loadData(userCoords);
  };

  const handleSaveAddress = (newAddress: string, newCoords?: { lat: number; lng: number }) => {
    const finalAddress = newAddress.trim() || userAddress;
    const finalCoords = newCoords || userCoords;
    setUserAddress(finalAddress);
    setUserCoords(finalCoords);
    setAddressModalVisible(false);
    loadData(finalCoords);
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

  const balance = wallet?.balancePoint || 0;
  const totalKg = wallet?.totalKgDeposited || 0;
  const co2Kg = wallet?.totalCo2ReductionKg || (totalKg * 1.85);
  const treesCount = Math.floor(co2Kg / 22);

  // Active deposit in progress (if any)
  const activeDeposit = recentDeposits.find(
    (d) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(d.status)
  );

  const nearestBank = nearbyBanks.length > 0 ? nearbyBanks[0] : null;

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <View style={styles.titleRow}>
            <View style={styles.headerBadgeIcon}>
              <Recycle size={15} color="#15803D" />
            </View>
            <Text style={styles.headerTitle}>KANYAAH RECYCLE</Text>
          </View>
          <Text style={styles.headerSubtitle}>Tukar Sampah Jadi Saldo & Koin Poin</Text>
        </View>
        <TouchableOpacity
          style={styles.walletHeaderBtn}
          onPress={() => navigate("c_recycle_wallet")}
          activeOpacity={0.7}
        >
          <WalletCards size={18} color="#15803D" />
        </TouchableOpacity>
      </View>

      {/* Address & Location Bar (Interactive Entry) */}
      <TouchableOpacity
        style={styles.locationBar}
        onPress={() => {
          setInputAddress(userAddress);
          setAddressModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.locationIconBg}>
          <MapPin size={15} color="#15803D" />
        </View>
        <View style={styles.locationTextCol}>
          <Text style={styles.locationLabel}>Lokasi Penyetoran Anda</Text>
          <Text style={styles.locationVal} numberOfLines={1}>
            {userAddress}
          </Text>
        </View>
        <View style={styles.changeLocationPill}>
          <Text style={styles.changeLocationText}>Ubah</Text>
          <ChevronRight size={12} color="#15803D" />
        </View>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {/* Nearest Connected Bank Sampah Card (Highlight) */}
        {nearestBank && (
          <View style={styles.connectedBankCard}>
            <View style={styles.connectedHeaderRow}>
              <View style={styles.connectedStatusTag}>
                <View style={styles.livePulseDot} />
                <Text style={styles.connectedStatusText}>TERHUBUNG BANK SAMPAH TERDEKAT</Text>
              </View>
              {nearestBank.distanceKm != null && (
                <View style={styles.distanceBadge}>
                  <Navigation size={11} color="#15803D" />
                  <Text style={styles.distanceBadgeText}>{nearestBank.distanceKm.toFixed(1)} km</Text>
                </View>
              )}
            </View>

            <View style={styles.connectedBody}>
              <View style={styles.connectedIconCircle}>
                <Building2 size={22} color="#15803D" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.connectedBankName}>{nearestBank.name}</Text>
                <Text style={styles.connectedBankAddress} numberOfLines={1}>
                  {nearestBank.address}
                </Text>
                <View style={styles.connectedMetaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={11} color="#4B5563" />
                    <Text style={styles.metaItemText}>{nearestBank.openingHours}</Text>
                  </View>
                  {(nearestBank.maxPrice || 0) > 0 && (
                    <View style={styles.metaItemHighlight}>
                      <Sparkles size={11} color="#B45309" />
                      <Text style={styles.metaItemHighlightText}>Maks {rp(nearestBank.maxPrice || 0)}/kg</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Categories Chips */}
            {nearestBank.acceptedCategories && nearestBank.acceptedCategories.length > 0 && (
              <View style={styles.categoryPillsWrap}>
                {nearestBank.acceptedCategories.slice(0, 4).map((catName, idx) => (
                  <View key={`${catName}-${idx}`} style={styles.categoryMiniPill}>
                    <Text style={styles.categoryMiniPillText}>{catName}</Text>
                  </View>
                ))}
                {nearestBank.acceptedCategories.length > 4 && (
                  <View style={[styles.categoryMiniPill, styles.categoryMiniPillMore]}>
                    <Text style={styles.categoryMiniPillMoreText}>+{nearestBank.acceptedCategories.length - 4} jenis</Text>
                  </View>
                )}
              </View>
            )}

            {/* Direct Connect Action Button */}
            <TouchableOpacity
              style={styles.connectDepositBtn}
              onPress={() => handleStartDepositToBank(nearestBank)}
              activeOpacity={0.88}
            >
              <View style={styles.connectDepositBtnLeft}>
                <Recycle size={18} color="#FFFFFF" />
                <Text style={styles.connectDepositBtnText}>Setor Sampah Sekarang</Text>
              </View>
              <View style={styles.connectDepositBtnArrow}>
                <ChevronRight size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Deposit Notification Banner */}
        {activeDeposit && (
          <TouchableOpacity
            style={[
              styles.activeBanner,
              activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" && styles.activeBannerHighlight,
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
                  styles.activeBannerIconBox,
                  activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" && styles.activeBannerIconBoxAmber,
                ]}
              >
                <Scale
                  size={18}
                  color={activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" ? "#B45309" : "#0D9488"}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={[
                    styles.activeBannerTitle,
                    activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" && styles.activeBannerTitleAmber,
                  ]}
                >
                  {activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION"
                    ? "Timbangan Menunggu Konfirmasi!"
                    : "Setoran Sedang Berjalan"}
                </Text>
                <Text style={styles.activeBannerSub}>
                  Kode: {activeDeposit.depositCode} • Ketuk untuk pantau
                </Text>
              </View>
            </View>
            <View style={styles.activeBannerArrow}>
              <ChevronRight
                size={16}
                color={activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION" ? "#B45309" : "#0D9488"}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Hero Card: Saldo GEOVERSE Point & Setoran */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowSmall} />
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.pointHeaderLabelRow}>
                <Coins size={14} color="#FDE047" />
                <Text style={styles.heroBalanceLabel}>Saldo GEOVERSE Point</Text>
              </View>
              <View style={styles.heroBalanceRow}>
                <Text style={styles.heroBalanceVal}>{balance.toLocaleString("id-ID")}</Text>
                <Text style={styles.heroPointUnit}>Pts</Text>
              </View>
              <Text style={styles.heroRupiahVal}>≈ {rp(balance)} (1 Point = Rp 1)</Text>
            </View>
            <View style={styles.heroBadgeKg}>
              <View style={styles.heroBadgeKgIcon}>
                <Leaf size={14} color="#15803D" />
              </View>
              <Text style={styles.heroBadgeKgText}>{totalKg.toFixed(1)} kg</Text>
              <Text style={styles.heroBadgeKgSub}>Sampah Disetor</Text>
            </View>
          </View>

          {/* Quick Action Shortcuts */}
          <View style={styles.actionGridContainer}>
            <TouchableOpacity
              style={styles.actionGridItem}
              onPress={() => navigate("c_recycle_banks")}
              activeOpacity={0.8}
            >
              <View style={[styles.actionGridIconBg, { backgroundColor: "#DCFCE7" }]}>
                <Recycle size={18} color="#15803D" />
              </View>
              <Text style={styles.actionGridLabelPrimary} numberOfLines={1}>Setor Sampah</Text>
            </TouchableOpacity>

            <View style={styles.actionGridDivider} />

            <TouchableOpacity
              style={styles.actionGridItem}
              onPress={() => navigate("c_recycle_redemption")}
              activeOpacity={0.8}
            >
              <View style={[styles.actionGridIconBg, { backgroundColor: "#FEF3C7" }]}>
                <Coins size={18} color="#B45309" />
              </View>
              <Text style={styles.actionGridLabel} numberOfLines={1}>Tukar Poin</Text>
            </TouchableOpacity>

            <View style={styles.actionGridDivider} />

            <TouchableOpacity
              style={styles.actionGridItem}
              onPress={() => navigate("c_recycle_ledger")}
              activeOpacity={0.8}
            >
              <View style={[styles.actionGridIconBg, { backgroundColor: "#F1F5F9" }]}>
                <History size={18} color="#475569" />
              </View>
              <Text style={styles.actionGridLabel} numberOfLines={1}>Riwayat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Environmental Impact Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Dampak Lingkungan Anda</Text>
          <View style={styles.pillGreen}>
            <Leaf size={12} color="#15803D" />
            <Text style={styles.pillGreenText}>Eco Hero</Text>
          </View>
        </View>

        <View style={styles.impactGrid}>
          <View style={[styles.impactCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View style={[styles.impactIconBg, { backgroundColor: "#DCFCE7" }]}>
              <Wind size={18} color="#16A34A" />
            </View>
            <Text style={styles.impactValue}>{co2Kg.toFixed(1)} kg</Text>
            <Text style={styles.impactLabel}>Emisi CO₂ Dicegah</Text>
          </View>

          <View style={[styles.impactCard, { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" }]}>
            <View style={[styles.impactIconBg, { backgroundColor: "#FEF08A" }]}>
              <TreeDeciduous size={18} color="#CA8A04" />
            </View>
            <Text style={styles.impactValue}>{treesCount}</Text>
            <Text style={styles.impactLabel}>Pohon Diselamatkan</Text>
          </View>

          <View style={[styles.impactCard, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
            <View style={[styles.impactIconBg, { backgroundColor: "#E0F2FE" }]}>
              <Scale size={18} color="#0284C7" />
            </View>
            <Text style={styles.impactValue}>{totalKg.toFixed(1)} kg</Text>
            <Text style={styles.impactLabel}>Diverted dari TPA</Text>
          </View>
        </View>

        {/* Flow Cara Kerja Kanyah Recycle */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Cara Kerja Kanyaah Recycle</Text>
          <View style={styles.guideSteps}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepTitle}>Pilih Lokasi</Text>
              <Text style={styles.stepText}>Bank Sampah & jenis sampah</Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepTitle}>Setor</Text>
              <Text style={styles.stepText}>Antar langsung / Dijemput</Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepTitle}>Terima Poin</Text>
              <Text style={styles.stepText}>Timbang & cairkan koin</Text>
            </View>
          </View>
        </View>


        {/* Recent Transactions / Riwayat */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Riwayat Setoran</Text>
          <TouchableOpacity onPress={() => navigate("c_recycle_ledger")}>
            <Text style={styles.seeAllText}>Buku Tabungan</Text>
          </TouchableOpacity>
        </View>

        {recentDeposits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Clock size={28} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada riwayat setoran sampah</Text>
          </View>
        ) : (
          recentDeposits.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.depositRow}
              onPress={() => {
                setSelectedDeposit(item);
                if (item.status === "WAITING_CUSTOMER_CONFIRMATION") {
                  navigate("c_recycle_weighing_result");
                } else {
                  navigate("c_recycle_tracking");
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.depositIconBg, { backgroundColor: item.finalPoint > 0 ? "#DCFCE7" : "#F3F4F6" }]}>
                <Recycle size={18} color={item.finalPoint > 0 ? "#15803D" : "#6B7280"} />
              </View>
              <View style={styles.depositCol}>
                <Text style={styles.depositCode}>{item.depositCode}</Text>
                <Text style={styles.depositMeta}>
                  {item.method === "PICKUP" ? "Pickup" : "Antar Langsung"} • {new Date(item.createdAt).toLocaleDateString("id-ID")}
                </Text>
              </View>
              <View style={styles.depositRight}>
                <Text style={[styles.depositPoint, { color: item.finalPoint > 0 ? "#15803D" : "#4B5563" }]}>
                  {item.finalPoint > 0 ? `+${item.finalPoint.toLocaleString("id-ID")} Pts` : item.status}
                </Text>
                <ChevronRight size={14} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Address & Area Selection Modal */}
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
                  <Text style={styles.modalTitle}>Pilih Lokasi Penyetoran</Text>
                  <Text style={styles.modalSub}>Sistem akan menghubungkan dengan Bank Sampah terdekat</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setAddressModalVisible(false)}
                >
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Custom Input */}
              <View style={styles.inputAddressBox}>
                <MapPin size={18} color="#15803D" style={{ marginTop: 2 }} />
                <TextInput
                  style={styles.addressInput}
                  placeholder="Ketik alamat lengkap atau patokan..."
                  placeholderTextColor="#9CA3AF"
                  value={inputAddress}
                  onChangeText={setInputAddress}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={styles.btnSaveCustomAddress}
                onPress={() => handleSaveAddress(inputAddress)}
                activeOpacity={0.85}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnSaveCustomAddressText}>Gunakan Alamat Ini</Text>
              </TouchableOpacity>

              <Text style={styles.presetSectionLabel}>Atau Pilih Preset Lokasi:</Text>
              <View style={styles.presetList}>
                {presetLocations.map((p, idx) => {
                  const isSelected = userAddress.toLowerCase().includes(p.label.toLowerCase()) || userAddress === p.address;
                  return (
                    <TouchableOpacity
                      key={`preset-${idx}`}
                      style={[styles.presetItem, isSelected && styles.presetItemActive]}
                      onPress={() => handleSaveAddress(p.address, { lat: p.lat, lng: p.lng })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.presetDot, isSelected && styles.presetDotActive]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.presetLabel, isSelected && styles.presetLabelActive]}>{p.label}</Text>
                        <Text style={styles.presetAddressText} numberOfLines={1}>{p.address}</Text>
                      </View>
                      {isSelected && <CheckCircle2 size={16} color="#15803D" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBadgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  walletHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Location & Address Bar
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DCFCE7",
  },
  locationIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  locationTextCol: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  locationVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 1,
  },
  changeLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 2,
  },
  changeLocationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  // Connected Nearest Bank Card
  connectedBankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  connectedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  connectedStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  connectedStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    letterSpacing: 0.4,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  connectedBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  connectedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  connectedBankName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  connectedBankAddress: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  connectedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItemText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  metaItemHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  metaItemHighlightText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  categoryPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  categoryMiniPill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryMiniPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  categoryMiniPillMore: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  categoryMiniPillMoreText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  connectDepositBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#15803D",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  connectDepositBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectDepositBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  connectDepositBtnArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Active Deposit Banner
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  activeBannerHighlight: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  activeBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activeBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#CCFBF1",
    justifyContent: "center",
    alignItems: "center",
  },
  activeBannerIconBoxAmber: {
    backgroundColor: "#FEF3C7",
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F766E",
  },
  activeBannerTitleAmber: {
    color: "#B45309",
  },
  activeBannerSub: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  activeBannerArrow: {
    paddingLeft: 8,
  },
  // Hero Point Card
  heroCard: {
    backgroundColor: "#166534",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  heroGlowSmall: {
    position: "absolute",
    left: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  pointHeaderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  heroBalanceLabel: {
    fontSize: 12,
    color: "#BBF7D0",
    fontWeight: "700",
  },
  heroBalanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroBalanceVal: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroPointUnit: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FDE047",
  },
  heroRupiahVal: {
    fontSize: 12,
    color: "#E2E8F0",
    marginTop: 2,
  },
  heroBadgeKg: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 90,
  },
  heroBadgeKgIcon: {
    marginBottom: 2,
  },
  heroBadgeKgText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#15803D",
  },
  heroBadgeKgSub: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "600",
    marginTop: 1,
  },
  // Hero Micro-Actions Grid
  actionGridContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionGridItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  actionGridIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionGridLabelPrimary: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  actionGridLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  actionGridDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  pillGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  pillGreenText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  impactGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  impactCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
  },
  impactIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  impactValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  impactLabel: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 12,
  },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12,
  },
  guideSteps: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 2,
  },
  stepText: {
    fontSize: 9,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 12,
  },
  stepDivider: {
    width: 14,
    height: 1,
    backgroundColor: "#CBD5E1",
    marginTop: 12,
  },
  bankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bankCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  bankMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  bankDistance: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  metaDot: {
    fontSize: 11,
    color: "#94A3B8",
  },
  bankHours: {
    fontSize: 11,
    color: "#64748B",
  },
  pickupBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D1FAE5",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  pickupBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#047857",
  },
  bankBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    marginTop: 4,
  },
  bankAddressCol: {
    flex: 1,
    marginRight: 10,
  },
  bankAddress: {
    fontSize: 11,
    color: "#64748B",
  },
  btnDetailMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  btnDetailMiniText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  depositRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  depositIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  depositCol: {
    flex: 1,
  },
  depositCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  depositMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  depositRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  depositPoint: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  inputAddressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#15803D",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  addressInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 48,
    textAlignVertical: "top",
  },
  btnSaveCustomAddress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#15803D",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginBottom: 16,
  },
  btnSaveCustomAddressText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  presetSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8,
  },
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  presetItemActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  presetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  presetDotActive: {
    backgroundColor: "#15803D",
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  presetLabelActive: {
    color: "#15803D",
  },
  presetAddressText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
});
