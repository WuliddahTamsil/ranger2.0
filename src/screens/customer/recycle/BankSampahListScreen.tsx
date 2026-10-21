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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  Star,
  Truck,
  Sparkles,
  Recycle,
  ShieldCheck,
  Building2,
  Navigation,
  X,
  ArrowRight,
  Layers,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getWasteBanks } from "../../../services/recycleService";
import { WasteBankUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";
import { checkBankOperationalStatus } from "../../../utils/bankOperationalUtils";

const RECYCLE_LOCATION_STORAGE_KEY = "@geoverse_recycle_selected_location";

export const BankSampahListScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { setSelectedBank, updateDraftDeposit } = useRecycle();
  const [banks, setBanks] = useState<WasteBankUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "nearby" | "best_price" | "pickup" | "open">("nearby");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocationAddress, setUserLocationAddress] = useState<string>("Pakuan, Bogor, Jawa Barat");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: -6.5976, lng: 106.8062 });

  const loadBanks = async (filterKey: string, lat = userCoords.lat, lng = userCoords.lng) => {
    setLoading(true);
    try {
      const apiFilter = filterKey === "all" ? undefined : filterKey;
      const res = await getWasteBanks(lat, lng, apiFilter);
      if (res.success && Array.isArray(res.data)) {
        setBanks(res.data);
      }
    } catch (err) {
      console.error("loadBanks error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initScreen = async () => {
      let activeCoords = userCoords;
      try {
        const savedRaw = await AsyncStorage.getItem(RECYCLE_LOCATION_STORAGE_KEY);
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
              setUserLocationAddress(parsed.address);
              setUserCoords(parsed.coords);
              activeCoords = parsed.coords;
            }
          }
        }
      } catch (err) {
        console.warn("BankSampahListScreen init error:", err);
      } finally {
        if (isMounted) {
          loadBanks(activeFilter, activeCoords.lat, activeCoords.lng);
        }
      }
    };

    initScreen();

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBanks(activeFilter, userCoords.lat, userCoords.lng);
  };

  const handleFilterChange = (filterKey: "all" | "nearby" | "best_price" | "pickup" | "open") => {
    setActiveFilter(filterKey);
  };

  const filteredBanks = useMemo(() => {
    let list = banks.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.acceptedCategories && b.acceptedCategories.some((c) => c.toLowerCase().includes(q)));
      if (!matchesSearch) return false;

      if (activeFilter === "pickup") {
        return Boolean(b.acceptsPickup);
      }
      if (activeFilter === "open") {
        return checkBankOperationalStatus(b.openingHours).isOpen;
      }
      return true;
    });

    if (activeFilter === "nearby") {
      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else if (activeFilter === "best_price") {
      list.sort((a, b) => (b.maxPrice || 0) - (a.maxPrice || 0));
    }

    return list;
  }, [banks, searchQuery, activeFilter]);

  const handleSelectBank = (bank: WasteBankUI) => {
    setSelectedBank(bank);
    updateDraftDeposit({
      bankSampahId: bank._id,
      bankSampahName: bank.name,
      pickupAddress: userLocationAddress,
      pickupLatitude: userCoords.lat,
      pickupLongitude: userCoords.lng,
    });
    navigate("c_recycle_bank_detail");
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate("c_recycle_home")}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={styles.headerBadgePill}>
              <View style={styles.headerBadgeDot} />
              <Text style={styles.headerBadgeText}>GEOVERSE PARTNER NETWORK</Text>
            </View>
            <Text style={styles.headerTitle}>Pilih Mitra Bank Sampah</Text>
            <Text style={styles.headerSub}>Mitra resmi berlisensi & terverifikasi GEOVERSE</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={[styles.mainWrapper, isWide && styles.mainWrapperWide]}>
        {/* Reference Location Context Bar */}
        <View style={styles.locationContextCard}>
          <View style={styles.locationContextIconBox}>
            <MapPin size={14} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationContextLabel}>LOKASI ACUAN PENYETORAN</Text>
            <Text style={styles.locationContextAddress} numberOfLines={1}>
              {userLocationAddress}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.locationChangeBtn}
            onPress={() => navigate("c_recycle_home")}
            activeOpacity={0.7}
          >
            <Text style={styles.locationChangeBtnText}>Ubah</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={16} color="#059669" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama bank, wilayah (Pakuan, Garut, Dago...)"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Chips Bar */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "nearby" && styles.filterChipActive]}
              onPress={() => handleFilterChange("nearby")}
              activeOpacity={0.75}
            >
              <Navigation size={12} color={activeFilter === "nearby" ? "#FFFFFF" : "#059669"} />
              <Text style={[styles.filterChipText, activeFilter === "nearby" && styles.filterChipTextActive]}>
                Terdekat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "all" && styles.filterChipActive]}
              onPress={() => handleFilterChange("all")}
              activeOpacity={0.75}
            >
              <Layers size={12} color={activeFilter === "all" ? "#FFFFFF" : "#64748B"} />
              <Text style={[styles.filterChipText, activeFilter === "all" && styles.filterChipTextActive]}>
                Semua Mitra
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "best_price" && styles.filterChipActive]}
              onPress={() => handleFilterChange("best_price")}
              activeOpacity={0.75}
            >
              <Sparkles size={12} color={activeFilter === "best_price" ? "#FFFFFF" : "#D97706"} />
              <Text style={[styles.filterChipText, activeFilter === "best_price" && styles.filterChipTextActive]}>
                Harga Terbaik
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "pickup" && styles.filterChipActive]}
              onPress={() => handleFilterChange("pickup")}
              activeOpacity={0.75}
            >
              <Truck size={12} color={activeFilter === "pickup" ? "#FFFFFF" : "#059669"} />
              <Text style={[styles.filterChipText, activeFilter === "pickup" && styles.filterChipTextActive]}>
                Layanan Pickup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "open" && styles.filterChipActive]}
              onPress={() => handleFilterChange("open")}
              activeOpacity={0.75}
            >
              <Clock size={12} color={activeFilter === "open" ? "#FFFFFF" : "#64748B"} />
              <Text style={[styles.filterChipText, activeFilter === "open" && styles.filterChipTextActive]}>
                Buka Sekarang
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Results Header Count */}
        <View style={styles.resultsMetaRow}>
          <Text style={styles.resultsCountText}>
            Ditemukan <Text style={{ fontWeight: "700", color: "#0F172A" }}>{filteredBanks.length}</Text> Mitra Bank Sampah
          </Text>
          <View style={styles.verifiedNetworkTag}>
            <ShieldCheck size={11} color="#059669" />
            <Text style={styles.verifiedNetworkTagText}>Resmi & Berlisensi</Text>
          </View>
        </View>

        {/* Bank Cards List */}
        <ScrollView
          contentContainerStyle={[styles.listContent, isWide && styles.listContentWide]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingText}>Memuat mitra Bank Sampah resmi...</Text>
            </View>
          ) : filteredBanks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Recycle size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Mitra Tidak Ditemukan</Text>
              <Text style={styles.emptySub}>
                Coba sesuaikan kata kunci pencarian wilayah atau ubah opsi filter di atas.
              </Text>
            </View>
          ) : (
            <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
              {filteredBanks.map((bank) => {
                const bStatus = checkBankOperationalStatus(bank.openingHours);
                const acceptedCategories =
                  bank.acceptedCategories && bank.acceptedCategories.length > 0
                    ? bank.acceptedCategories
                    : ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol"];

                return (
                  <TouchableOpacity
                    key={bank._id}
                    style={[styles.bankCard, isWide && styles.bankCardWide]}
                    onPress={() => handleSelectBank(bank)}
                    activeOpacity={0.85}
                  >
                    {/* Top Identity Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.bankAvatarBox}>
                        <Building2 size={22} color="#059669" />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.cardTitleLine}>
                          <Text style={styles.cardBankName} numberOfLines={1}>
                            {bank.name}
                          </Text>
                          <ShieldCheck size={15} color="#059669" />
                        </View>

                        <View style={styles.ratingDistanceRow}>
                          {/* Open / Closed Status Tag */}
                          <View
                            style={[
                              styles.openStatusTag,
                              {
                                backgroundColor: bStatus.isOpen ? "#ECFDF5" : "#F8FAFC",
                                borderColor: bStatus.isOpen ? "#A7F3D0" : "#E2E8F0",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.openStatusDot,
                                { backgroundColor: bStatus.isOpen ? "#10B981" : "#94A3B8" },
                              ]}
                            />
                            <Text
                              style={[
                                styles.openStatusText,
                                { color: bStatus.isOpen ? "#059669" : "#64748B" },
                              ]}
                            >
                              {bStatus.isOpen ? "Buka" : "Tutup"}
                            </Text>
                          </View>

                          {/* Rating Badge */}
                          <View style={styles.ratingBadge}>
                            <Star size={11} color="#EAB308" fill="#EAB308" />
                            <Text style={styles.ratingText}>{bank.rating?.toFixed(1) || "4.9"}</Text>
                          </View>

                          <Text style={styles.metaDot}>•</Text>

                          {/* Distance Tag */}
                          <View style={styles.distanceBadge}>
                            <Navigation size={10} color="#059669" />
                            <Text style={styles.distanceText}>
                              {bank.distanceKm !== undefined && bank.distanceKm !== null
                                ? `${bank.distanceKm.toFixed(1)} km`
                                : "Area Terdaftar"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Pickup Badge */}
                      {bank.acceptsPickup ? (
                        <View style={styles.pickupPill}>
                          <Truck size={10} color="#059669" />
                          <Text style={styles.pickupPillText}>Pickup Ready</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Operational Info & Address */}
                    <View style={styles.infoRow}>
                      <Clock size={12} color="#64748B" />
                      <Text style={styles.infoText}>
                        {bStatus.hoursText || bank.openingHours || "Senin - Sabtu, 08:00 - 16:00"}
                      </Text>
                    </View>

                    <View style={styles.addressRow}>
                      <MapPin size={12} color="#94A3B8" style={{ marginTop: 1 }} />
                      <Text style={styles.addressText} numberOfLines={2}>
                        {bank.address}
                      </Text>
                    </View>

                    {/* Accepted Waste Category Chips */}
                    <View style={styles.categoryChipsRow}>
                      {acceptedCategories.slice(0, 4).map((cat, cIdx) => (
                        <View key={`cat-${cIdx}`} style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>{cat}</Text>
                        </View>
                      ))}
                      {acceptedCategories.length > 4 ? (
                        <View style={styles.categoryChipMore}>
                          <Text style={styles.categoryChipMoreText}>
                            +{acceptedCategories.length - 4} jenis
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Price & Primary CTA Row */}
                    <View style={styles.priceHighlightRow}>
                      <View>
                        <Text style={styles.highlightLabel}>Harga Sampah Hingga</Text>
                        <View style={styles.priceNumberRow}>
                          <Text style={styles.highlightPrice}>
                            {bank.maxPrice ? rp(bank.maxPrice) : "Rp 12.000"}
                          </Text>
                          <Text style={styles.highlightPriceUnit}>/kg</Text>
                        </View>
                      </View>

                      <View style={styles.btnSelectBank}>
                        <Text style={styles.btnSelectBankText}>Pilih Bank</Text>
                        <ArrowRight size={13} color="#FFFFFF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  header: {
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
  headerTitleCol: {
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
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  mainWrapper: {
    flex: 1,
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
  },
  mainWrapperWide: {
    paddingHorizontal: 16,
  },
  // Location Context Card
  locationContextCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  locationContextIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  locationContextLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.6,
  },
  locationContextAddress: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 1,
  },
  locationChangeBtn: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationChangeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  // Search section
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    padding: 0,
  },
  // Filter tabs
  filterRow: {
    paddingVertical: 6,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  // Results count row
  resultsMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  resultsCountText: {
    fontSize: 11,
    color: "#64748B",
  },
  verifiedNetworkTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  verifiedNetworkTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  // Cards List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  listContentWide: {
    paddingHorizontal: 0,
  },
  cardGrid: {
    width: "100%",
  },
  cardGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  bankCard: {
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
  bankCardWide: {
    width: "48.8%",
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bankAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardBankName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },
  ratingDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
    flexWrap: "wrap",
  },
  openStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  openStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  openStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  metaDot: {
    fontSize: 10,
    color: "#CBD5E1",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  distanceText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "700",
  },
  pickupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  pickupPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  infoText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
    flex: 1,
  },
  categoryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 10,
  },
  categoryChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#475569",
  },
  categoryChipMore: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  categoryChipMoreText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  priceHighlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.2,
  },
  priceNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 1,
  },
  highlightPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: -0.3,
  },
  highlightPriceUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  btnSelectBank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSelectBankText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  emptySub: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 24,
    lineHeight: 16,
  },
});
