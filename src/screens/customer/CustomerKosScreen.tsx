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
  Map,
  MapPin,
  LayoutGrid,
  User,
  Users,
  Percent,
  Star,
  Heart,
  ChevronRight,
  X,
  Wifi,
  Laptop,
  ShowerHead,
  Utensils,
  Car,
  Shirt,
  ShieldCheck,
  Headphones,
} from "lucide-react-native";

export const CustomerKosScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeCategory, setActiveCategory] = useState<"semua" | "putra" | "putri" | "campur">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  const kosList = [
    {
      id: "1",
      name: "Kos Putri Melati",
      type: "Putri",
      status: "Tersedia",
      location: "Jl. Aster No. 7, Kamojang",
      rating: 4.8,
      reviews: 120,
      price: "750.000",
      facilities: ["WiFi", "AC", "KM Dalam", "Parkir"],
      img: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "2",
      name: "Kos Putra Garuda",
      type: "Putra",
      status: "Tersedia",
      location: "Jl. Raya Kamojang No. 20",
      rating: 4.8,
      reviews: 120,
      price: "600.000",
      facilities: ["WiFi", "KM Dalam", "Dapur"],
      img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "3",
      name: "Kos Campur Harmoni",
      type: "Campur",
      status: "Penuh",
      location: "Jl. Mawar No. 15",
      rating: 4.8,
      reviews: 120,
      price: "900.000",
      facilities: ["WiFi", "AC", "KM Dalam", "Laundry"],
      img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const filteredKosList = kosList.filter((item) => {
    const matchesCategory =
      activeCategory === "semua" || item.type.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.facilities.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

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
          <Text style={styles.headerTitle}>Kos-kosan</Text>
          <Text style={styles.headerSubTitle}>Temukan kos terbaik sesuai kebutuhanmu</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
            <Map size={18} color="#374151" />
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
            placeholder="Cari lokasi, nama kos, atau fasilitas..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.nearMePill} activeOpacity={0.8}>
            <MapPin size={13} color="#0D7A53" />
            <Text style={styles.nearMeText}>Dekat saya</Text>
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

          {/* Putra */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "putra" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("putra")}
            activeOpacity={0.8}
          >
            <User size={15} color={activeCategory === "putra" ? "#FFFFFF" : "#0284C7"} />
            <Text style={[styles.pillText, activeCategory === "putra" && styles.pillTextActive]}>
              Putra
            </Text>
          </TouchableOpacity>

          {/* Putri */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "putri" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("putri")}
            activeOpacity={0.8}
          >
            <User size={15} color={activeCategory === "putri" ? "#FFFFFF" : "#DB2777"} />
            <Text style={[styles.pillText, activeCategory === "putri" && styles.pillTextActive]}>
              Putri
            </Text>
          </TouchableOpacity>

          {/* Campur */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "campur" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("campur")}
            activeOpacity={0.8}
          >
            <Users size={15} color={activeCategory === "campur" ? "#FFFFFF" : "#EA580C"} />
            <Text style={[styles.pillText, activeCategory === "campur" && styles.pillTextActive]}>
              Campur
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Promo Banner */}
        {isBannerVisible && (
          <View style={styles.promoBanner}>
            <View style={styles.promoIconSquare}>
              <Percent size={22} color="#0D7A53" />
            </View>

            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Diskon Spesial!</Text>
              <Text style={styles.promoSub}>
                Dapatkan potongan harga hingga 15% untuk pemesanan bulan ini
              </Text>

              <TouchableOpacity style={styles.btnLihatPromo} activeOpacity={0.8}>
                <Text style={styles.btnLihatPromoText}>Lihat Promo</Text>
                <ChevronRight size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIsBannerVisible(false)}
              activeOpacity={0.7}
              style={styles.closePromoBtn}
            >
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Kos Cards List */}
        <View style={styles.cardsList}>
          {filteredKosList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Tidak ada kos ditemukan</Text>
              <Text style={styles.emptyStateSub}>
                Coba ubah filter atau kata kunci pencarian Anda.
              </Text>
            </View>
          ) : (
            filteredKosList.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.kosCard}
              onPress={() => navigate("c_kos_detail")}
              activeOpacity={0.9}
            >
              {/* Image Box */}
              <View style={styles.cardImgBox}>
                <Image source={{ uri: item.img }} style={styles.cardImg} />

                {/* Photo Count Badge */}
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountText}>📷 8 Foto</Text>
                </View>

                {/* Heart Action */}
                <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7}>
                  <Heart size={18} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Image Dots */}
                <View style={styles.imageDotsRow}>
                  <View style={[styles.imgDot, styles.imgDotActive]} />
                  <View style={styles.imgDot} />
                  <View style={styles.imgDot} />
                </View>
              </View>

              {/* Card Details */}
              <View style={styles.cardBody}>
                {/* Badges Row */}
                <View style={styles.cardBadgesRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      item.type === "Putri"
                        ? styles.typePutri
                        : item.type === "Putra"
                        ? styles.typePutra
                        : styles.typeCampur,
                    ]}
                  >
                    <User
                      size={11}
                      color={
                        item.type === "Putri"
                          ? "#DB2777"
                          : item.type === "Putra"
                          ? "#0284C7"
                          : "#EA580C"
                      }
                    />
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color:
                            item.type === "Putri"
                              ? "#DB2777"
                              : item.type === "Putra"
                              ? "#0284C7"
                              : "#EA580C",
                        },
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "Tersedia" ? styles.statusGreen : styles.statusRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: item.status === "Tersedia" ? "#0D7A53" : "#DC2626" },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Title & Location */}
                <Text style={styles.kosTitle}>{item.name}</Text>

                <View style={styles.locationRow}>
                  <MapPin size={13} color="#6B7280" />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>

                {/* Rating Row */}
                <View style={styles.ratingRow}>
                  <Star size={13} color="#EAB308" fill="#EAB308" />
                  <Text style={styles.ratingVal}>{item.rating}</Text>
                  <Text style={styles.reviewsText}>({item.reviews} ulasan)</Text>
                </View>

                {/* Facility Chips Row */}
                <View style={styles.facilitiesRow}>
                  {item.facilities.map((f, idx) => (
                    <View key={idx} style={styles.facilityChip}>
                      {f === "WiFi" ? (
                        <Wifi size={11} color="#6B7280" />
                      ) : f === "AC" ? (
                        <Laptop size={11} color="#6B7280" />
                      ) : f === "KM Dalam" ? (
                        <ShowerHead size={11} color="#6B7280" />
                      ) : f === "Dapur" ? (
                        <Utensils size={11} color="#6B7280" />
                      ) : f === "Parkir" ? (
                        <Car size={11} color="#6B7280" />
                      ) : (
                        <Shirt size={11} color="#6B7280" />
                      )}
                      <Text style={styles.facilityText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {/* Footer Price & Chevron */}
                <View style={styles.cardFooterRow}>
                  <View>
                    <Text style={styles.startFromText}>Mulai dari</Text>
                    <Text style={styles.priceValText}>
                      Rp {item.price} <Text style={styles.unitText}>/bulan</Text>
                    </Text>
                  </View>

                  <View style={styles.chevronCircleGreen}>
                    <ChevronRight size={16} color="#0D7A53" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )))}
        </View>

        {/* Footer Guarantee Info Row */}
        <View style={styles.footerGuaranteeRow}>
          <View style={styles.guaranteeItem}>
            <ShieldCheck size={16} color="#0D7A53" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Aman & Terverifikasi</Text>{"\n"}
              Semua kos telah diverifikasi
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Users size={16} color="#0284C7" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>+2.000 Kos</Text>{"\n"}
              Pilihan terbaik untukmu
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Headphones size={16} color="#EA580C" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Layanan 24/7</Text>{"\n"}
              Kami siap membantu
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  nearMePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  nearMeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
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
    alignItems: "flex-start",
    backgroundColor: "#E8F5EE",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
    position: "relative",
  },
  promoIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  promoTextCol: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  promoSub: {
    fontSize: 11,
    color: "#0D7A53",
    marginTop: 2,
    lineHeight: 16,
    opacity: 0.9,
  },
  btnLihatPromo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  btnLihatPromoText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  closePromoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },

  // Kos Cards List
  cardsList: {
    gap: 16,
  },
  kosCard: {
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
  cardImgBox: {
    width: 120,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 12,
    left: 8,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  photoCountText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageDotsRow: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    flexDirection: "row",
    gap: 4,
  },
  imgDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  imgDotActive: {
    width: 10,
    backgroundColor: "#FFFFFF",
  },

  cardBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typePutri: {
    backgroundColor: "#FCE7F3",
  },
  typePutra: {
    backgroundColor: "#E0F2FE",
  },
  typeCampur: {
    backgroundColor: "#FFEDD5",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusGreen: {
    backgroundColor: "#DCFCE7",
  },
  statusRed: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  kosTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: "#6B7280",
  },

  ratingRow: {
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
  reviewsText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  facilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  facilityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
  },

  cardFooterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 8,
  },
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
  chevronCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Guarantee Footer Row
  footerGuaranteeRow: {
    flexDirection: "column",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  guaranteeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guaranteeText: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  emptyState: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
