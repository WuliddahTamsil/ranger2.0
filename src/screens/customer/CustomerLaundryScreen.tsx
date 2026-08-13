import React, { useState } from "react";
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
} from "lucide-react-native";

export const CustomerLaundryScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeCategory, setActiveCategory] = useState<"semua" | "biasa" | "ekspres">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  const laundryList = [
    {
      id: "1",
      name: "Laundry Express Pak Dedi",
      type: "EKSPRES",
      rating: 4.8,
      reviews: "1.2k",
      distance: "0.5 km",
      hours: "Buka – Tutup 21.00",
      badges: [
        { label: "Antar Jemput", type: "green" },
        { label: "Ekspres 3 Jam", type: "orange" },
      ],
      price: "6.000",
      img: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "2",
      name: "Bersih Kilat Laundry",
      type: "EKSPRES",
      rating: 4.6,
      reviews: "1.2k",
      distance: "1.1 km",
      hours: "Buka – Tutup 21.00",
      badges: [
        { label: "Antar Jemput", type: "green" },
        { label: "Ekspres 3 Jam", type: "orange" },
      ],
      price: "7.000",
      img: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "3",
      name: "Laundry Ibu Rohani",
      type: "BIASA",
      rating: 4.9,
      reviews: "1.2k",
      distance: "0.2 km",
      hours: "Buka – Tutup 20.00",
      badges: [{ label: "Antar Jemput", type: "green" }],
      price: "5.000",
      img: "https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=600&q=80",
    },
  ];

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
          <Text style={styles.headerTitle}>Laundry</Text>
          <Text style={styles.headerSubTitle}>Temukan laundry terbaik di sekitarmu</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
            <Search size={18} color="#374151" />
          </TouchableOpacity>
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
            placeholder="Cari laundry terdekat..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity activeOpacity={0.7}>
            <Mic size={18} color="#0D7A53" />
          </TouchableOpacity>
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
              Semua
            </Text>
          </TouchableOpacity>

          {/* Biasa */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "biasa" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("biasa")}
            activeOpacity={0.8}
          >
            <Shirt size={15} color={activeCategory === "biasa" ? "#FFFFFF" : "#0284C7"} />
            <Text style={[styles.pillText, activeCategory === "biasa" && styles.pillTextActive]}>
              Biasa
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
              Ekspres
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Promo Banner */}
        {isBannerVisible && (
          <View style={styles.promoBanner}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoText}>Untuk pesanan di atas Rp30.000</Text>
            </View>
            <View style={styles.promoRight}>
              <Bike size={20} color="#EC4899" />
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

        {/* Laundry Cards List */}
        <View style={styles.cardsList}>
          {laundryList.map((item) => (
            <View key={item.id} style={styles.laundryCard}>
              {/* Image Column */}
              <View style={styles.cardImageCol}>
                <Image source={{ uri: item.img }} style={styles.cardImg} />
                
                {/* Type Badge */}
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: item.type === "EKSPRES" ? "#FF6500" : "#0284C7" },
                  ]}
                >
                  {item.type === "EKSPRES" ? (
                    <Zap size={11} color="#FFFFFF" />
                  ) : (
                    <Shirt size={11} color="#FFFFFF" />
                  )}
                  <Text style={styles.typeBadgeText}>{item.type}</Text>
                </View>

                {/* Operating Hours Overlay */}
                <View style={styles.hoursOverlay}>
                  <Text style={styles.hoursOverlayText}>{item.hours}</Text>
                </View>
              </View>

              {/* Info Content Column */}
              <View style={styles.cardContentCol}>
                {/* Title & Heart */}
                <View style={styles.cardTitleRow}>
                  <Text style={styles.merchantName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Heart size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Rating & Distance */}
                <View style={styles.metaRow}>
                  <Star size={13} color="#EAB308" fill="#EAB308" />
                  <Text style={styles.ratingVal}>{item.rating}</Text>
                  <Text style={styles.metaSub}>({item.reviews})</Text>
                  <Text style={styles.metaDot}>|</Text>
                  <MapPin size={13} color="#6B7280" />
                  <Text style={styles.metaSub}>{item.distance}</Text>
                </View>

                {/* Service Badges */}
                <View style={styles.badgesRow}>
                  {item.badges.map((b, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.badgeChip,
                        {
                          backgroundColor: b.type === "green" ? "#E8F5EE" : "#FFF7ED",
                        },
                      ]}
                    >
                      {b.type === "green" ? (
                        <Bike size={11} color="#0D7A53" />
                      ) : (
                        <Zap size={11} color="#EA580C" />
                      )}
                      <Text
                        style={[
                          styles.badgeChipText,
                          { color: b.type === "green" ? "#0D7A53" : "#EA580C" },
                        ]}
                      >
                        {b.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Footer Price & Action */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.startFromText}>Mulai dari</Text>
                    <Text style={styles.priceValText}>
                      Rp {item.price} <Text style={styles.unitText}>/kg</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnDetail}
                    onPress={() => navigate("c_laundry_detail")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnDetailText}>Lihat Detail</Text>
                    <ChevronRight size={13} color="#0D7A53" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
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
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubTitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },

  // Filter Pills
  filterPillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  pillBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },

  // Promo Banner
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5EE",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
  },
  promoLeft: {
    flex: 1,
  },
  promoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  promoRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Cards List
  cardsList: {
    gap: 16,
  },
  laundryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardImageCol: {
    width: 110,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  hoursOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingVertical: 4,
    alignItems: "center",
  },
  hoursOverlayText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  cardContentCol: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  merchantName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    flex: 1,
    marginRight: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  metaSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  metaDot: {
    fontSize: 11,
    color: "#D1D5DB",
  },

  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: "700",
  },

  cardFooterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
  },
  priceCol: {},
  startFromText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  priceValText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  btnDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "#0D7A53",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  btnDetailText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
});
