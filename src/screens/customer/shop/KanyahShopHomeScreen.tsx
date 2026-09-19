import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  Sparkles,
  ChevronRight,
  TrendingUp,
  Tag,
  Store,
  Compass,
  FileText,
  ShoppingBag,
  User,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import {
  fetchShopStores,
  fetchStoreProducts,
  fetchShopCategories,
  searchShopCatalog,
  ShopStore,
  ShopProduct,
} from "../../../services/shopService";
import { useShopCart } from "../../../context/ShopCartContext";
import { ShopHeader } from "../../../components/shop/ShopHeader";
import { ShopSearchBar } from "../../../components/shop/ShopSearchBar";
import { CategoryIconCard } from "../../../components/shop/CategoryIconCard";
import { StoreCard } from "../../../components/shop/StoreCard";
import { ProductCard } from "../../../components/shop/ProductCard";
import { ProductDetailSheet } from "../../../components/shop/ProductDetailSheet";
import { ConflictStoreModal } from "../../../components/shop/ConflictStoreModal";
import { EmptyState, LoadingState } from "../../../components/shop/EmptyState";
import { getPrimaryCustomerAddress } from "../../../services/customerAddressService";

interface KanyahShopHomeScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const KanyahShopHomeScreen: React.FC<KanyahShopHomeScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isDesktop = width >= 1024;
  const contentMaxWidth = 1200;

  const { totalItems } = useShopCart();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stores, setStores] = useState<ShopStore[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ShopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ products: any[]; stores: any[] } | null>(null);
  const [searching, setSearching] = useState(false);

  const primaryAddress = getPrimaryCustomerAddress(authAccount);
  const userLat = primaryAddress?.latitude || -7.1475;
  const userLon = primaryAddress?.longitude || 107.8015;

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [storeRes, catRes] = await Promise.all([
        fetchShopStores({ latitude: userLat, longitude: userLon }),
        fetchShopCategories(),
      ]);

      if (storeRes.success && storeRes.data) {
        setStores(storeRes.data);
        // Load products from the top 2 stores for promo & recommendation sections
        if (storeRes.data.length > 0) {
          const topStore = storeRes.data[0];
          const prodRes = await fetchStoreProducts(topStore._id, { limit: 12 });
          if (prodRes.success && prodRes.data) {
            setFeaturedProducts(prodRes.data);
          }
        }
      }

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (e) {
      console.warn("loadHomeData error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [authAccount]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const res = await searchShopCatalog(text);
    setSearching(false);
    if (res.success) {
      setSearchResults({ products: res.products || [], stores: res.stores || [] });
    }
  };

  const handleSelectCategory = (cat: any) => {
    navigate("c_shop_discovery");
  };

  const handleOpenStore = (store: ShopStore) => {
    // Navigate to store detail screen
    (navigate as any)("c_shop_store", { storeId: store._id });
  };

  const handleOpenProductDetail = (product: ShopProduct) => {
    setSelectedProduct(product);
    setDetailSheetVisible(true);
  };

  const currentStoreForSheet =
    stores.find((s) => String(s._id) === String(selectedProduct?.storeId)) ||
    stores[0] ||
    ({} as ShopStore);

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 1. Header */}
      <ShopHeader
        addressName={primaryAddress?.fullAddress || "Kamojang, Garut"}
        onPressAddress={() => navigate("c_addresses")}
        onPressCart={() => navigate("c_shop_cart")}
        onPressBack={() => navigate("c_home")}
        showBack={true}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadHomeData();
            }}
            colors={["#15803D"]}
          />
        }
      >
        <View style={[styles.mainContentContainer, isLargeScreen && { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" }]}>
          {/* 2. Search Bar */}
          <ShopSearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Cari produk, supermarket, atau apotek..."
          />

          {/* If Search Active, Show Results */}
          {searchResults ? (
            <View style={styles.searchResultContainer}>
              <Text style={styles.searchResultTitle}>
                Hasil Pencarian: "{searchQuery}"
              </Text>

              {searchResults.stores.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Toko Terkait</Text>
                  {searchResults.stores.map((s: any) => (
                    <StoreCard key={s._id} store={s} onPress={handleOpenStore} />
                  ))}
                </View>
              )}

              {searchResults.products.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Produk Terkait</Text>
                  <View style={styles.productGrid}>
                    {searchResults.products.map((p: any) => (
                      <View key={p._id} style={{ width: isLargeScreen ? "33.3%" : "50%" }}>
                        <ProductCard
                          product={p}
                          store={stores.find((s) => String(s._id) === String(p.storeId)) || stores[0]}
                          onPressProduct={handleOpenProductDetail}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {searchResults.stores.length === 0 && searchResults.products.length === 0 && (
                <EmptyState
                  iconType="search"
                  title="Tidak Ada Hasil"
                  description="Coba cari dengan kata kunci lain seperti beras, vitamin, atau nama toko."
                />
              )}
            </View>
          ) : (
            <>
              {/* 3. Promo Banner Carousel / Hero Banner */}
              <View style={styles.bannerContainer}>
                <View style={styles.heroBanner}>
                  <View style={styles.bannerBadge}>
                    <Sparkles size={12} color="#FBBF24" />
                    <Text style={styles.bannerBadgeText}>KANYAAH SHOP PROMO</Text>
                  </View>
                  <Text style={styles.bannerTitle}>Belanja Grocery Hemat & Cepat</Text>
                  <Text style={styles.bannerSub}>
                    Gratis ongkir s.d. Rp10.000 dengan kode voucher{" "}
                    <Text style={{ fontWeight: "700", color: "#FDE047" }}>KANYAAHHEMAT</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.bannerCta}
                    onPress={() => navigate("c_shop_discovery")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bannerCtaText}>Jelajahi Toko</Text>
                    <ChevronRight size={14} color="#15803D" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. Quick Category Grid */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Kategori Kebutuhan</Text>
                  <TouchableOpacity onPress={() => navigate("c_shop_discovery")}>
                    <Text style={styles.seeAllText}>Lihat Semua</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.categoriesGrid}>
                  {categories.map((cat) => (
                    <CategoryIconCard
                      key={cat.id}
                      category={cat}
                      onPress={handleSelectCategory}
                    />
                  ))}
                </View>
              </View>

              {/* 5. Section "Toko Terdekat" */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Toko Terdekat di Sekitar Anda</Text>
                  <TouchableOpacity onPress={() => navigate("c_shop_discovery")}>
                    <Text style={styles.seeAllText}>Lihat Semua</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {stores.map((st) => (
                    <StoreCard key={st._id} store={st} onPress={handleOpenStore} horizontal={true} />
                  ))}
                </ScrollView>
              </View>

              {/* 6. Section "Promo Hari Ini" */}
              {featuredProducts.filter((p) => p.promoPrice != null && p.promoPrice > 0).length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.tagBadgeRow}>
                      <Tag size={16} color="#DC2626" />
                      <Text style={[styles.sectionTitle, { color: "#DC2626" }]}>Promo Spesial Hari Ini</Text>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {featuredProducts
                      .filter((p) => p.promoPrice != null && p.promoPrice > 0)
                      .slice(0, 6)
                      .map((p) => (
                        <View key={p._id} style={{ width: 170 }}>
                          <ProductCard
                            product={p}
                            store={stores[0]}
                            onPressProduct={handleOpenProductDetail}
                          />
                        </View>
                      ))}
                  </ScrollView>
                </View>
              )}

              {/* 7. Section "Rekomendasi Untukmu" Grid */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.tagBadgeRow}>
                    <TrendingUp size={16} color="#15803D" />
                    <Text style={styles.sectionTitle}>Rekomendasi Kebutuhan Harian</Text>
                  </View>
                </View>

                <View style={styles.productGrid}>
                  {featuredProducts.map((p) => (
                    <View
                      key={p._id}
                      style={{
                        width: isDesktop ? "25%" : isLargeScreen ? "33.3%" : "50%",
                      }}
                    >
                      <ProductCard
                        product={p}
                        store={stores[0]}
                        onPressProduct={handleOpenProductDetail}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar / Mini Cart Floating Pill if has items */}
      {totalItems > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={styles.floatingCartBtn}
            onPress={() => navigate("c_shop_cart")}
            activeOpacity={0.88}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingBadge}>
                <Text style={styles.floatingBadgeText}>{totalItems}</Text>
              </View>
              <Text style={styles.floatingCartLabel}>Item di Keranjang</Text>
            </View>
            <View style={styles.floatingCartRight}>
              <Text style={styles.floatingCtaText}>Lihat Keranjang</Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        store={currentStoreForSheet}
        visible={detailSheetVisible}
        onClose={() => {
          setDetailSheetVisible(false);
          setSelectedProduct(null);
        }}
      />

      {/* Single-Store Conflict Resolution Modal */}
      <ConflictStoreModal />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 90,
  },
  mainContentContainer: {
    paddingBottom: 20,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroBanner: {
    backgroundColor: "#15803D",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: "#E2E8F0",
    lineHeight: 18,
    marginBottom: 14,
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  bannerCtaText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tagBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  horizontalScroll: {
    paddingRight: 16,
    gap: 12,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  searchResultContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  floatingCartContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  floatingCartBtn: {
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 500,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingCartLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  floatingBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBadgeText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
  },
  floatingCartLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  floatingCartRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  floatingCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
