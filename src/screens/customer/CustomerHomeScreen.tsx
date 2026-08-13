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
} from "lucide-react-native";

interface CustomerHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerHomeScreen: React.FC<CustomerHomeProps> = ({ navigate, authAccount }) => {
  const categories = [
    { id: "c_marketplace", name: "Marketplace", icon: Store, color: "#1B7A4E", bg: "#E8F5EE" },
    { id: "c_catering", name: "Kanyaah Catering", icon: Coffee, color: "#EA580C", bg: "#FFEDD5" },
    { id: "c_laundry", name: "Kanyaah Laundry", icon: Wind, color: "#0284C7", bg: "#E0F2FE" },
    { id: "c_kos", name: "Kanyaah Homestay", icon: Building2, color: "#9333EA", bg: "#F3E8FF" },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <Text style={styles.greetingTitle}>Halo, {authAccount?.name?.split(" ")[0] || "Warga Kamojang"}! 👋</Text>
          <Text style={styles.greetingSubtitle}>{authAccount ? `Mau pesan apa hari ini, ${authAccount.name.split(" ")[0]}?` : "Mau pesan apa hari ini?"}</Text>

          <TouchableOpacity style={styles.searchBar} onPress={() => navigate("c_laundry")} activeOpacity={0.8}>
            <Search size={18} color="#9CA3AF" />
            <Text style={styles.searchPlaceholder}>Cari produk, catering, laundry...</Text>
          </TouchableOpacity>
        </View>

        {/* Banner Promo */}
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

        {/* Categories grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Layanan Utama</Text>
        </View>
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => {
            const IconComp = cat.icon;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => navigate(cat.id)}
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
    </SafeAreaView>
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
  categoriesGrid: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  categoryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
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
});
