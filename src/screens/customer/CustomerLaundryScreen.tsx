import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
} from "react-native";
import { Nav } from "../../types";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Mic,
  LayoutGrid,
  Shirt,
  Zap,
  Bike,
  Star,
  MapPin,
  Heart,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react-native";
import {
  fetchLaundryStores,
  LaundryStore,
  setSelectedStore,
  FALLBACK_LAUNDRY_STORES,
} from "../../services/laundryService";

export const CustomerLaundryScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeCategory, setActiveCategory] = useState<"semua" | "biasa" | "ekspres">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [stores, setStores] = useState<LaundryStore[]>(FALLBACK_LAUNDRY_STORES);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      setLoading(true);
      const data = await fetchLaundryStores(searchQuery);
      if (active) {
        setStores(data);
        setLoading(false);
      }
    };
    loadStores();
    return () => {
      active = false;
    };
  }, [searchQuery]);

  const filteredStores = stores.filter((store) => {
    if (activeCategory === "semua") return true;
    if (activeCategory === "ekspres") {
      return store.services?.some((s) => s.category === "ekspres") || store.storeName.toLowerCase().includes("express") || store.storeName.toLowerCase().includes("kilat");
    }
    if (activeCategory === "biasa") {
      return store.services?.some((s) => s.category === "biasa");
    }
    return true;
  });

  const handleSelectStore = (store: LaundryStore) => {
    setSelectedStore(store);
    navigate("c_laundry_detail");
  };

  const getMinPrice = (store: LaundryStore) => {
    if (!store.services || store.services.length === 0) return 5000;
    const prices = store.services.map((s) => s.price);
    return Math.min(...prices);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Layanan Laundry</Text>
          <Text style={styles.headerSubTitle}>Pilihan mitra laundry terpercaya di sekitarmu</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari toko laundry atau jenis layanan..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {/* Semua */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "semua" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("semua")}
            activeOpacity={0.8}
          >
            <LayoutGrid size={15} color={activeCategory === "semua" ? "#FFFFFF" : "#0D7A53"} />
            <Text style={[styles.pillText, activeCategory === "semua" && styles.pillTextActive]}>
              Semua Mitra
            </Text>
          </TouchableOpacity>

          {/* Reguler / Biasa */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "biasa" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("biasa")}
            activeOpacity={0.8}
          >
            <Shirt size={15} color={activeCategory === "biasa" ? "#FFFFFF" : "#0284C7"} />
            <Text style={[styles.pillText, activeCategory === "biasa" && styles.pillTextActive]}>
              Reguler Kiloan
            </Text>
          </TouchableOpacity>

          {/* Ekspres */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "ekspres" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("ekspres")}
            activeOpacity={0.8}
          >
            <Zap size={15} color={activeCategory === "ekspres" ? "#FFFFFF" : "#EA580C"} />
            <Text style={[styles.pillText, activeCategory === "ekspres" && styles.pillTextActive]}>
              Ekspres Kilat
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Promo Banner */}
        {isBannerVisible && (
          <View style={styles.promoBanner}>
            <View style={styles.promoLeft}>
              <View style={styles.promoBadge}>
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.promoBadgeText}>GRATIS ONGKIR</Text>
              </View>
              <Text style={styles.promoText}>Driver siap angkut pakaian Anda langsung ke mitra laundry pilihan!</Text>
            </View>
            <View style={styles.promoRight}>
              <Bike size={24} color="#0D7A53" />
              <TouchableOpacity
                onPress={() => setIsBannerVisible(false)}
                activeOpacity={0.7}
                style={{ marginLeft: 8 }}
              >
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={{ marginTop: 10, color: "#6B7280", fontSize: 13 }}>Memuat daftar toko laundry...</Text>
          </View>
        ) : filteredStores.length === 0 ? (
          <View style={{ paddingVertical: 50, alignItems: "center" }}>
            <Shirt size={48} color="#D1D5DB" />
            <Text style={{ marginTop: 12, fontWeight: "700", color: "#374151" }}>Toko laundry tidak ditemukan</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 4 }}>
              Coba cari dengan kata kunci lain.
            </Text>
          </View>
        ) : (
          /* Laundry Cards List */
          <View style={styles.cardsList}>
            {filteredStores.map((item) => {
              const minPrice = getMinPrice(item);
              const isExpress = item.services?.some((s) => s.category === "ekspres");
              return (
                <TouchableOpacity
                  key={item.id || item._id}
                  style={styles.laundryCard}
                  onPress={() => handleSelectStore(item)}
                  activeOpacity={0.9}
                >
                  {/* Image Column */}
                  <View style={styles.cardImageCol}>
                    <Image
                      source={{ uri: item.imageUrl || "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80" }}
                      style={styles.cardImg}
                    />

                    {/* Type Badge */}
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: isExpress ? "#FF6500" : "#0284C7" },
                      ]}
                    >
                      {isExpress ? <Zap size={11} color="#FFFFFF" /> : <Shirt size={11} color="#FFFFFF" />}
                      <Text style={styles.typeBadgeText}>{isExpress ? "EKSPRES" : "REGULER"}</Text>
                    </View>

                    {/* Operating Hours Overlay */}
                    <View style={styles.hoursOverlay}>
                      <Text style={styles.hoursOverlayText}>{item.openingHours || "Buka • Tutup 21.00"}</Text>
                    </View>
                  </View>

                  {/* Info Content Column */}
                  <View style={styles.cardContentCol}>
                    {/* Title & Heart */}
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {item.storeName}
                      </Text>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Heart size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    {/* Rating & Distance */}
                    <View style={styles.metaRow}>
                      <Star size={13} color="#EAB308" fill="#EAB308" />
                      <Text style={styles.ratingVal}>{item.rating || 4.8}</Text>
                      <Text style={styles.metaSub}>({item.totalReviews || 120})</Text>
                      <Text style={styles.metaDot}>|</Text>
                      <MapPin size={13} color="#6B7280" />
                      <Text style={styles.metaSub}>{item.distanceText || "0.8 km"}</Text>
                    </View>

                    {/* Service Badges */}
                    <View style={styles.badgesRow}>
                      {(item.badges && item.badges.length > 0 ? item.badges : ["Antar Jemput", "Bergaransi"]).map((b, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.badgeChip,
                            {
                              backgroundColor: idx % 2 === 0 ? "#E8F5EE" : "#FFF7ED",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeChipText,
                              { color: idx % 2 === 0 ? "#0D7A53" : "#EA580C" },
                            ]}
                          >
                            {b}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Footer Price & Action */}
                    <View style={styles.cardFooterRow}>
                      <View style={styles.priceCol}>
                        <Text style={styles.startFromText}>Mulai dari</Text>
                        <Text style={styles.priceValText}>
                          Rp {minPrice.toLocaleString("id-ID")}{" "}
                          <Text style={styles.unitText}>/kg</Text>
                        </Text>
                      </View>

                      <View style={styles.btnDetail}>
                        <Text style={styles.btnDetailText}>Pilih</Text>
                        <ChevronRight size={13} color="#0D7A53" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  filterPillsRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  pillBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  pillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5EE",
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  promoLeft: {
    flex: 1,
    marginRight: 12,
  },
  promoBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0D7A53",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    gap: 4,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  promoText: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },
  promoRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardsList: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 14,
  },
  laundryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageCol: {
    width: 105,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  typeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  hoursOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 3,
    alignItems: "center",
  },
  hoursOverlayText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
  cardContentCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  merchantName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  metaSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  metaDot: {
    fontSize: 11,
    color: "#D1D5DB",
    marginHorizontal: 2,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badgeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  priceCol: {},
  startFromText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  priceValText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  btnDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  btnDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
});
