import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { PRODUCTS, RESTAURANTS } from "../../constants/mockData";
import { Stars } from "../../components/Stars";
import { Pill } from "../../components/Pill";
import { rp } from "../../utils/formatters";
import {
  MapPin,
  Bell,
  Search,
  Store,
  Coffee,
  Wind,
  Building2,
  ChevronRight,
  LogOut,
  Bike,
  Package,
  ShoppingBag,
  Sparkles,
  HeartPulse,
  Recycle,
} from "lucide-react-native";

interface CustomerHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerHomeScreen: React.FC<CustomerHomeProps> = ({ navigate, authAccount }) => {
  const row1Categories = [
    { id: "c_marketplace", name: "Kanyaah\nMart", icon: Store, color: "#1B7A4E", bg: "#E8F5EE" },
    { id: "c_catering", name: "Kanyaah\nCatering", icon: Coffee, color: "#EA580C", bg: "#FFEDD5" },
    { id: "c_laundry", name: "Kanyaah\nLaundry", icon: Wind, color: "#0284C7", bg: "#E0F2FE" },
    { id: "c_kos", name: "Kanyaah\nHomestay", icon: Building2, color: "#9333EA", bg: "#F3E8FF" },
  ] as const;

  const row2Categories = [
    { id: "c_ride", name: "Kanyaah\nRide", icon: Bike, color: "#15803D", bg: "#DCFCE7" },
    { id: "c_send", name: "Kanyaah\nSend", icon: Package, color: "#B45309", bg: "#FEF3C7" },
    { id: "c_shop_home", name: "Kanyaah\nShop", icon: ShoppingBag, color: "#15803D", bg: "#E8F5EE" },
    { id: "c_recycle_home", name: "Kanyaah\nRecycle", icon: Recycle, color: "#047857", bg: "#ECFDF5" },
  ] as const;

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.locationContainer}>
          <MapPin size={16} color="#1B7A4E" />
          <Text style={styles.locationLabel}>Lokasi Anda:</Text>
          <Text style={styles.locationValue} numberOfLines={1}>
            {authAccount?.address || "Ring 1 Kamojang"}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigate("login")} activeOpacity={0.7}>
            <LogOut size={18} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Bell size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#9CA3AF" />
            <Text style={styles.searchPlaceholder}>Cari produk, catering, atau layanan...</Text>
          </View>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTextCol}>
            <Pill color="orange">Promo Spesial</Pill>
            <Text style={styles.bannerTitle}>Diskon 20% UMKM Lokal</Text>
            <Text style={styles.bannerSub}>Dukung usaha warga Kamojang</Text>
          </View>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>PGE 2.0</Text>
          </View>
        </View>

        {/* Categories grid (4x2 Grid: 4 di atas & 4 di bawah) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Layanan Utama</Text>
        </View>
        <View style={styles.categoriesGridContainer}>
          {/* Baris 1: 4 Card Di Atas */}
          <View style={styles.categoriesGrid}>
            {row1Categories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryCard}
                  onPress={() => navigate(cat.id as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIconBg, { backgroundColor: cat.bg }]}>
                    <IconComp size={24} color={cat.color} />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Baris 2: 4 Card Di Bawah */}
          <View style={styles.categoriesGrid}>
            {row2Categories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryCard}
                  onPress={() => navigate(cat.id as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIconBg, { backgroundColor: cat.bg }]}>
                    <IconComp size={24} color={cat.color} />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Popular Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produk UMKM Populer</Text>
          <TouchableOpacity onPress={() => navigate("c_marketplace")} style={styles.seeAllRow}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
            <ChevronRight size={16} color="#1B7A4E" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {PRODUCTS.slice(0, 4).map((p) => (
            <TouchableOpacity key={p.id} style={styles.productCard} activeOpacity={0.8}>
              <Image source={{ uri: p.img }} style={styles.productImg} />
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.productStore} numberOfLines={1}>
                  {p.store}
                </Text>
                <View style={styles.productPriceRow}>
                  <Text style={styles.productPrice}>{rp(p.price)}</Text>
                  <Stars rating={p.rating} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Catering recommendations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rekomendasi Catering</Text>
          <TouchableOpacity onPress={() => navigate("c_catering")} style={styles.seeAllRow}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
            <ChevronRight size={16} color="#1B7A4E" />
          </TouchableOpacity>
        </View>

        {RESTAURANTS.slice(0, 3).map((r) => (
          <TouchableOpacity key={r.id} style={styles.restaurantCard} activeOpacity={0.8}>
            <Image source={{ uri: r.img }} style={styles.restaurantImg} />
            <View style={styles.restaurantBody}>
              <View style={styles.restaurantTop}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Stars rating={r.rating} />
              </View>
              <Text style={styles.restaurantCuisine}>{r.cuisine}</Text>
              <View style={styles.tagsRow}>
                {r.tags.map((t, idx) => (
                  <Pill key={idx} color="green">
                    {t}
                  </Pill>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  locationValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  topBarRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  searchHeader: {
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  greetingSubtitle: {
    fontSize: 13,
    color: "#A7F3D0",
    marginTop: 2,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTextCol: {
    gap: 4,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerSub: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  bannerBadge: {
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bannerBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  seeAllRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  categoriesGridContainer: {
    gap: 10,
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 14,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  productImg: {
    width: "100%",
    height: 110,
  },
  productBody: {
    padding: 10,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  productStore: {
    fontSize: 11,
    color: "#6B7280",
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  restaurantCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  restaurantImg: {
    width: 100,
    height: 90,
  },
  restaurantBody: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
    gap: 4,
  },
  restaurantTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: "#6B7280",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  heroDuoRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 14,
  },
  heroHalfCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    minHeight: 155,
  },
  rideHalfCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    shadowColor: "#15803D",
  },
  sendHalfCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    shadowColor: "#B45309",
  },
  heroHalfBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  heroHalfBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  heroHalfTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#064E3B",
  },
  heroHalfSub: {
    fontSize: 10,
    color: "#166534",
    marginTop: 2,
    lineHeight: 14,
  },
  heroHalfBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  heroHalfCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#15803D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroHalfCtaText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroHalfCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  rideHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 14,
    elevation: 3,
    shadowColor: "#15803D",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  rideHeroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  rideHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  rideHeroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  rideHeroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#064E3B",
  },
  rideHeroSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
  },
  rideHeroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15803D",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  rideHeroCtaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rideHeroRight: {
    justifyContent: "center",
    alignItems: "center",
  },
  rideHeroCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#A7F3D0",
  },
  shopFeaturedCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shopCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shopBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  shopInstantChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  shopInstantChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  shopCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#14532D",
    marginBottom: 4,
  },
  shopCardSub: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 17,
    marginBottom: 10,
  },
  shopPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  shopPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
  },
  shopCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
  },
  shopCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15803D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shopCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  shopCardCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
});
