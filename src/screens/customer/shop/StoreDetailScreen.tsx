import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Share,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Bike,
  Heart,
  Share2,
  ShieldCheck,
  HeartPulse,
  ShoppingBag,
  ChevronRight,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchShopStoreDetail,
  fetchStoreProducts,
  ShopStore,
  ShopProduct,
} from "../../../services/shopService";
import { useShopCart } from "../../../context/ShopCartContext";
import { ShopSearchBar } from "../../../components/shop/ShopSearchBar";
import { ProductCard } from "../../../components/shop/ProductCard";
import { ProductDetailSheet } from "../../../components/shop/ProductDetailSheet";
import { ConflictStoreModal } from "../../../components/shop/ConflictStoreModal";
import { EmptyState, LoadingState } from "../../../components/shop/EmptyState";
import { rp } from "../../../utils/formatters";

interface StoreDetailScreenProps extends Nav {
  storeId?: string;
}

export const StoreDetailScreen: React.FC<StoreDetailScreenProps> = ({
  navigate,
  storeId = "",
}) => {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;
  const isDesktop = width >= 1024;

  const { totalItems, subtotal, activeStore } = useShopCart();

  const [store, setStore] = useState<ShopStore | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(["Semua"]);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const storeRes = await fetchShopStoreDetail(storeId);
        if (storeRes.success && storeRes.data) {
          setStore(storeRes.data);
        }
        const prodRes = await fetchStoreProducts(storeId, { category: selectedCategory, query: searchQuery });
        if (prodRes.success && prodRes.data) {
          setProducts(prodRes.data);
          if (prodRes.categories) {
            setCategories(prodRes.categories);
          }
        }
      } catch (e) {
        console.warn("Load store detail error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [storeId, selectedCategory, searchQuery]);

  const handleShare = async () => {
    if (!store) return;
    try {
      await Share.share({
        message: `Belanja kebutuhan harian di ${store.name} lewat GEOVERSE KANYAAH SHOP! Pengantaran instan & lengkap.`,
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  const handleOpenProduct = (prod: ShopProduct) => {
    setSelectedProduct(prod);
    setSheetVisible(true);
  };

  // If this store matches active store in cart, show cart bar
  const isCurrentStoreInCart = activeStore && String(activeStore._id) === String(store?._id);

  if (loading && !store) {
    return (
      <ResponsiveSafeAreaView style={styles.safeArea}>
        <LoadingState message="Memuat katalog toko..." />
      </ResponsiveSafeAreaView>
    );
  }

  if (!store) {
    return (
      <ResponsiveSafeAreaView style={styles.safeArea}>
        <EmptyState
          iconType="error"
          title="Toko Tidak Ditemukan"
          description="Toko ini mungkin sudah tidak beroperasi atau link tidak valid."
          buttonLabel="Kembali ke Beranda Shop"
          onPressButton={() => navigate("c_shop_home")}
        />
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Floating Back Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => navigate("c_shop_discovery")} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.7}
          >
            <Heart size={18} color={isFavorite ? "#DC2626" : "#4B5563"} fill={isFavorite ? "#DC2626" : "none"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.roundBtn} onPress={handleShare} activeOpacity={0.7}>
            <Share2 size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover & Profile Header */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: store.coverImage }} style={styles.coverImg} />
          <View style={styles.heroOverlay} />

          <View style={styles.storeLogoBox}>
            <Image source={{ uri: store.logo }} style={styles.logoImg} />
          </View>
        </View>

        {/* Store Profile Card */}
        <View style={[styles.profileCard, isLarge && { maxWidth: 1100, alignSelf: "center", width: "100%" }]}>
          <View style={styles.storeTitleRow}>
            <Text style={styles.storeName}>{store.name}</Text>
            {store.isVerified && (
              <View style={styles.verifiedTag}>
                <ShieldCheck size={13} color="#15803D" />
                <Text style={styles.verifiedTagText}>Terverifikasi</Text>
              </View>
            )}
          </View>

          {store.isOfficialPharmacy && (
            <View style={styles.pharmacyBadgeRow}>
              <HeartPulse size={14} color="#0284C7" />
              <Text style={styles.pharmacyBadgeText}>Apotek Resmi Berlisensi SIPA</Text>
            </View>
          )}

          <Text style={styles.storeAddress}>{store.address}</Text>

          {/* Meta specs */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Star size={13} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.metaValue}>{store.rating?.toFixed(1) || "4.9"}</Text>
              <Text style={styles.metaSub}>({store.reviewCount || 0}+)</Text>
            </View>

            <Text style={styles.metaDot}>•</Text>

            <View style={styles.metaItem}>
              <Clock size={13} color="#15803D" />
              <Text style={styles.metaValue}>{store.estimatedDeliveryMinutes || 25} mnt</Text>
            </View>

            <Text style={styles.metaDot}>•</Text>

            <View style={styles.metaItem}>
              <Bike size={13} color="#4B5563" />
              <Text style={styles.metaValue}>{rp(store.deliveryFee || 8000)}</Text>
            </View>
          </View>
        </View>

        {/* In-Store Search Bar */}
        <View style={[styles.searchSection, isLarge && { maxWidth: 1100, alignSelf: "center", width: "100%" }]}>
          <ShopSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Cari produk di ${store.name}...`}
          />
        </View>

        {/* Category Tabs inside this store */}
        <View style={styles.catTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catTabsScroll}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catTab, isSelected && styles.activeCatTab]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catTabText, isSelected && styles.activeCatTabText]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={[styles.catalogSection, isLarge && { maxWidth: 1100, alignSelf: "center", width: "100%" }]}>
          {products.length > 0 ? (
            <View style={styles.productGrid}>
              {products.map((p) => (
                <View
                  key={p._id}
                  style={{
                    width: isDesktop ? "25%" : isLarge ? "33.3%" : "50%",
                  }}
                >
                  <ProductCard product={p} store={store} onPressProduct={handleOpenProduct} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              iconType="search"
              title="Produk Tidak Ditemukan"
              description="Tidak ada produk dalam kategori ini atau stok sedang kosong."
            />
          )}
        </View>
      </ScrollView>

      {/* Sticky Cart Bar at Bottom */}
      {isCurrentStoreInCart && totalItems > 0 && (
        <View style={styles.stickyCartBar}>
          <View style={styles.cartBarInfo}>
            <Text style={styles.cartBarItemCount}>{totalItems} Item di Keranjang</Text>
            <Text style={styles.cartBarSubtotal}>{rp(subtotal)}</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBarBtn}
            onPress={() => navigate("c_shop_cart")}
            activeOpacity={0.88}
          >
            <ShoppingBag size={16} color="#FFFFFF" />
            <Text style={styles.cartBarBtnText}>Lihat Keranjang</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        store={store}
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setSelectedProduct(null);
        }}
      />

      {/* Conflict Store Modal */}
      <ConflictStoreModal />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  navActions: {
    flexDirection: "row",
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroWrapper: {
    height: 160,
    position: "relative",
  },
  coverImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  storeLogoBox: {
    position: "absolute",
    bottom: -24,
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logoImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  profileCard: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 14,
  },
  storeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "700",
  },
  pharmacyBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  pharmacyBadgeText: {
    fontSize: 12,
    color: "#0284C7",
    fontWeight: "600",
  },
  storeAddress: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  metaSub: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metaDot: {
    marginHorizontal: 8,
    color: "#D1D5DB",
  },
  searchSection: {
    paddingHorizontal: 4,
  },
  catTabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
    marginTop: 6,
  },
  catTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  activeCatTab: {
    backgroundColor: "#15803D",
  },
  catTabText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  activeCatTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  catalogSection: {
    padding: 12,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  stickyCartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  cartBarInfo: {
    flex: 1,
  },
  cartBarItemCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  cartBarSubtotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  cartBarBtn: {
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cartBarBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
