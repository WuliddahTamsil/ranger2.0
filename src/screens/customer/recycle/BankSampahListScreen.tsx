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
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getWasteBanks } from "../../../services/recycleService";
import { WasteBankUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

export const BankSampahListScreen: React.FC<Nav> = ({ navigate }) => {
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

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Pilih Bank Sampah</Text>
          <Text style={styles.headerSub}>Mitra resmi terverifikasi GEOVERSE</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama bank sampah atau lokasi..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "nearby" && styles.filterChipActive]}
            onPress={() => setActiveFilter("nearby")}
            activeOpacity={0.7}
          >
            <MapPin size={13} color={activeFilter === "nearby" ? "#FFFFFF" : "#4B5563"} />
            <Text style={[styles.filterChipText, activeFilter === "nearby" && styles.filterChipTextActive]}>
              Terdekat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "best_price" && styles.filterChipActive]}
            onPress={() => setActiveFilter("best_price")}
            activeOpacity={0.7}
          >
            <Sparkles size={13} color={activeFilter === "best_price" ? "#FFFFFF" : "#4B5563"} />
            <Text style={[styles.filterChipText, activeFilter === "best_price" && styles.filterChipTextActive]}>
              Harga Terbaik
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "pickup" && styles.filterChipActive]}
            onPress={() => setActiveFilter("pickup")}
            activeOpacity={0.7}
          >
            <Truck size={13} color={activeFilter === "pickup" ? "#FFFFFF" : "#4B5563"} />
            <Text style={[styles.filterChipText, activeFilter === "pickup" && styles.filterChipTextActive]}>
              Bisa Pickup
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "open" && styles.filterChipActive]}
            onPress={() => setActiveFilter("open")}
            activeOpacity={0.7}
          >
            <Clock size={13} color={activeFilter === "open" ? "#FFFFFF" : "#4B5563"} />
            <Text style={[styles.filterChipText, activeFilter === "open" && styles.filterChipTextActive]}>
              Buka Sekarang
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bank List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#15803D" style={{ marginTop: 40 }} />
        ) : filteredBanks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Recycle size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Tidak ada Bank Sampah ditemukan</Text>
            <Text style={styles.emptySub}>Coba ubah filter pencarian atau kata kunci lokasi Anda.</Text>
          </View>
        ) : (
          filteredBanks.map((bank) => (
            <TouchableOpacity
              key={bank._id}
              style={styles.bankCard}
              onPress={() => {
                setSelectedBank(bank);
                navigate("c_recycle_bank_detail");
              }}
              activeOpacity={0.85}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardBankName}>{bank.name}</Text>
                  <View style={styles.ratingDistanceRow}>
                    <View style={styles.ratingBadge}>
                      <Star size={12} color="#EAB308" fill="#EAB308" />
                      <Text style={styles.ratingText}>{bank.rating?.toFixed(1) || "5.0"}</Text>
                      <Text style={styles.ratingCount}>({bank.ratingCount || 12})</Text>
                    </View>
                    <Text style={styles.dot}>•</Text>
                    <MapPin size={12} color="#6B7280" />
                    <Text style={styles.distanceText}>
                      {bank.distanceKm !== undefined && bank.distanceKm !== null
                        ? `${bank.distanceKm.toFixed(1)} km`
                        : "Ring 1 Kamojang"}
                    </Text>
                  </View>
                </View>

                {bank.acceptsPickup && (
                  <View style={styles.pickupPill}>
                    <Truck size={11} color="#047857" />
                    <Text style={styles.pickupPillText}>Layanan Pickup</Text>
                  </View>
                )}
              </View>

              {/* Operating hours & address */}
              <View style={styles.infoRow}>
                <Clock size={13} color="#6B7280" />
                <Text style={styles.infoText}>{bank.openingHours}</Text>
              </View>

              <Text style={styles.addressText} numberOfLines={2}>
                {bank.address}
              </Text>

              {/* Price Highlight & Categories */}
              <View style={styles.priceHighlightRow}>
                <View style={styles.highlightBadge}>
                  <Text style={styles.highlightLabel}>Harga Hingga</Text>
                  <Text style={styles.highlightPrice}>
                    {bank.maxPrice ? `${rp(bank.maxPrice)}/kg` : "Rp 6.500/kg"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.btnDetail}
                  onPress={() => {
                    setSelectedBank(bank);
                    navigate("c_recycle_bank_detail");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnDetailText}>Lihat Detail</Text>
                  <ChevronRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  headerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },
  filterScrollWrapper: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardBankName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  ratingDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  ratingCount: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  dot: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  distanceText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  pickupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pickupPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  infoText: {
    fontSize: 11,
    color: "#6B7280",
  },
  addressText: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
    lineHeight: 16,
  },
  priceHighlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  highlightBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
  },
  highlightPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
  },
  btnDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15803D",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 30,
  },
});
