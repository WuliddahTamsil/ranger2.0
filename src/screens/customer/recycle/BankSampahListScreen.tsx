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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  Star,
  Truck,
  ChevronRight,
  Filter,
  Sparkles,
  Recycle,
  ShieldCheck,
  Building2,
  Navigation,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getWasteBanks } from "../../../services/recycleService";
import { WasteBankUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";
import { checkBankOperationalStatus } from "../../../utils/bankOperationalUtils";

export const BankSampahListScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { setSelectedBank } = useRecycle();
  const [banks, setBanks] = useState<WasteBankUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"nearby" | "best_price" | "pickup" | "open">("nearby");
  const [searchQuery, setSearchQuery] = useState("");

  const loadBanks = async (filterKey: string) => {
    setLoading(true);
    try {
      const res = await getWasteBanks(-7.15, 107.8, filterKey);
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
    loadBanks(activeFilter);
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBanks(activeFilter);
  };

  const filteredBanks = banks.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "open") {
      return checkBankOperationalStatus(b.openingHours).isOpen;
    }
    return true;
  });

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
            <Text style={styles.headerTitle}>Pilih Mitra Bank Sampah</Text>
            <Text style={styles.headerSub}>Mitra resmi berlisensi & terverifikasi GEOVERSE</Text>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={[styles.mainWrapper, isWide && styles.mainWrapperWide]}>
        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={16} color="#059669" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama bank sampah atau lokasi..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "nearby" && styles.filterChipActive]}
              onPress={() => setActiveFilter("nearby")}
              activeOpacity={0.75}
            >
              <Navigation size={12} color={activeFilter === "nearby" ? "#FFFFFF" : "#64748B"} />
              <Text style={[styles.filterChipText, activeFilter === "nearby" && styles.filterChipTextActive]}>
                Terdekat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "best_price" && styles.filterChipActive]}
              onPress={() => setActiveFilter("best_price")}
              activeOpacity={0.75}
            >
              <Sparkles size={12} color={activeFilter === "best_price" ? "#FFFFFF" : "#64748B"} />
              <Text style={[styles.filterChipText, activeFilter === "best_price" && styles.filterChipTextActive]}>
                Harga Terbaik
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "pickup" && styles.filterChipActive]}
              onPress={() => setActiveFilter("pickup")}
              activeOpacity={0.75}
            >
              <Truck size={12} color={activeFilter === "pickup" ? "#FFFFFF" : "#64748B"} />
              <Text style={[styles.filterChipText, activeFilter === "pickup" && styles.filterChipTextActive]}>
                Layanan Pickup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === "open" && styles.filterChipActive]}
              onPress={() => setActiveFilter("open")}
              activeOpacity={0.75}
            >
              <Clock size={12} color={activeFilter === "open" ? "#FFFFFF" : "#64748B"} />
              <Text style={[styles.filterChipText, activeFilter === "open" && styles.filterChipTextActive]}>
                Buka Sekarang
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Bank List */}
        <ScrollView
          contentContainerStyle={[styles.listContent, isWide && styles.listContentWide]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
          ) : filteredBanks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Recycle size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Tidak ada mitra Bank Sampah ditemukan</Text>
              <Text style={styles.emptySub}>Coba sesuaikan kata kunci pencarian atau ganti filter.</Text>
            </View>
          ) : (
            <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
              {filteredBanks.map((bank) => {
                const bStatus = checkBankOperationalStatus(bank.openingHours);
                return (
                  <TouchableOpacity
                    key={bank._id}
                    style={[styles.bankCard, isWide && styles.bankCardWide]}
                    onPress={() => {
                      setSelectedBank(bank);
                      navigate("c_recycle_bank_detail");
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Text style={styles.cardBankName}>{bank.name}</Text>
                          <ShieldCheck size={14} color="#059669" />
                        </View>
                        <View style={styles.ratingDistanceRow}>
                          <View
                            style={[
                              styles.openStatusTag,
                              { backgroundColor: bStatus.isOpen ? "#ECFDF5" : "#FEF2F2" },
                            ]}
                          >
                            <View
                              style={[
                                styles.openStatusDot,
                                { backgroundColor: bStatus.isOpen ? "#10B981" : "#EF4444" },
                              ]}
                            />
                            <Text
                              style={[
                                styles.openStatusText,
                                { color: bStatus.isOpen ? "#059669" : "#DC2626" },
                              ]}
                            >
                              {bStatus.isOpen ? "Buka" : "Tutup"}
                            </Text>
                          </View>

                          <View style={styles.ratingBadge}>
                            <Star size={11} color="#EAB308" fill="#EAB308" />
                            <Text style={styles.ratingText}>{bank.rating?.toFixed(1) || "5.0"}</Text>
                          </View>

                          <Text style={styles.metaDot}>•</Text>
                          <Navigation size={10} color="#059669" />
                          <Text style={styles.distanceText}>
                            {bank.distanceKm !== undefined && bank.distanceKm !== null
                              ? `${bank.distanceKm.toFixed(1)} km`
                              : "Area Kamojang"}
                          </Text>
                        </View>
                      </View>

                      {bank.acceptsPickup && (
                        <View style={styles.pickupPill}>
                          <Truck size={10} color="#059669" />
                          <Text style={styles.pickupPillText}>Pickup Ready</Text>
                        </View>
                      )}
                    </View>

                    {/* Operational info & Address */}
                    <View style={styles.infoRow}>
                      <Clock size={12} color="#64748B" />
                      <Text style={styles.infoText}>{bStatus.hoursText}</Text>
                    </View>

                    <Text style={styles.addressText} numberOfLines={2}>
                      {bank.address}
                    </Text>

                    {/* Price & Action Row */}
                    <View style={styles.priceHighlightRow}>
                      <View>
                        <Text style={styles.highlightLabel}>Harga Sampah Hingga</Text>
                        <Text style={styles.highlightPrice}>
                          {bank.maxPrice ? `${rp(bank.maxPrice)}/kg` : "Rp 6.500/kg"}
                        </Text>
                      </View>

                      <View style={styles.btnDetailMini}>
                        <Text style={styles.btnDetailMiniText}>Pilih Bank</Text>
                        <ChevronRight size={13} color="#059669" />
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
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
  filterRow: {
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
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
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  bankCardWide: {
    width: "48.8%",
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardBankName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratingDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
  },
  openStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 2,
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
  distanceText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
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
  },
  pickupPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  infoText: {
    fontSize: 11,
    color: "#64748B",
  },
  addressText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 15,
  },
  priceHighlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
  },
  highlightPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
    marginTop: 1,
  },
  btnDetailMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnDetailMiniText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 3,
    paddingHorizontal: 24,
  },
});
