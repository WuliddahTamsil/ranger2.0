import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  X,
  MapPin,
  Bike,
  Percent,
  Search,
  ShoppingBag,
  ChevronRight,
  LayoutGrid,
  Cookie,
  UtensilsCrossed,
  Plane,
  HeartPulse,
  ShieldAlert,
  Compass,
  Tag,
  FileText,
  Boxes,
  Sparkles,
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
import { StoreCard } from "../../../components/shop/StoreCard";
import { ProductCard } from "../../../components/shop/ProductCard";
import { ProductDetailSheet } from "../../../components/shop/ProductDetailSheet";
import { ConflictStoreModal } from "../../../components/shop/ConflictStoreModal";
import { EmptyState, LoadingState } from "../../../components/shop/EmptyState";
import { getPrimaryCustomerAddress } from "../../../services/customerAddressService";

interface KanyahShopHomeScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

type TabType = "beranda" | "camilan" | "masak" | "travel" | "kesehatan" | "adult_21";

interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  color: string;
  searchPlaceholder: string;
  heroBadge: string;
  heroTitle: string;
  heroSub: string;
  heroGradient: [string, string];
  subcategories: Array<{ title: string; subtitle: string }>;
  sectionTitle: string;
}

const TABS: TabConfig[] = [
  {
    id: "beranda",
    label: "Beranda",
    icon: LayoutGrid,
    color: "#DC2626",
    searchPlaceholder: "Search instant noodles, beras, kopi...",
    heroBadge: "KANYAAH SHOP EXPRESS",
    heroTitle: "Lengkap,\ntinggal dipilih",
    heroSub: "Semua kebutuhan harian sampai dalam 30 menit",
    heroGradient: ["#881337", "#4C0519"],
    subcategories: [
      { title: "Kumpul di rumah", subtitle: "Snack & Minum" },
      { title: "Makan malam", subtitle: "Praktis & Enak" },
      { title: "Layak dicoba", subtitle: "Produk Baru" },
      { title: "Kebutuhan harian", subtitle: "Stok Rumah" },
    ],
    sectionTitle: "Lagi banyak dicari",
  },
  {
    id: "camilan",
    label: "Camilan",
    icon: Cookie,
    color: "#16A34A",
    searchPlaceholder: "Search chips, wafer, es krim, biskuit...",
    heroBadge: "SNACK & COLD DRINKS",
    heroTitle: "Temani momen,\ndengan yang unik",
    heroSub: "Ngemil asik dengan aneka snack dan minuman dingin",
    heroGradient: ["#064E3B", "#022C22"],
    subcategories: [
      { title: "Minuman favorit", subtitle: "Teh & Kopi" },
      { title: "Camilan manis", subtitle: "Biskuit & Wafer" },
      { title: "Camilan gurih", subtitle: "Keripik & Kacang" },
      { title: "Manis & segar", subtitle: "Es Krim & Puding" },
    ],
    sectionTitle: "Paling dicari buat ngemil",
  },
  {
    id: "masak",
    label: "Masak",
    icon: UtensilsCrossed,
    color: "#DC2626",
    searchPlaceholder: "Restock sugar, bumbu dapur, beras, mi...",
    heroBadge: "DAPUR & BAHAN MASAK",
    heroTitle: "Masak lebih cepat,\ntetap istimewa",
    heroSub: "Bumbu, minyak goreng, mi, & protein segar siap olah",
    heroGradient: ["#991B1B", "#450A0A"],
    subcategories: [
      { title: "Bahan masak segar", subtitle: "Sayur & Bumbu" },
      { title: "Beras, mi, & pasta", subtitle: "Karbohidrat" },
      { title: "Bumbu, saus, minyak", subtitle: "Penyedap Rasa" },
      { title: "Protein & siap masak", subtitle: "Lauk Olahan" },
    ],
    sectionTitle: "Paling dicari buat masak",
  },
  {
    id: "travel",
    label: "Travel",
    icon: Plane,
    color: "#EA580C",
    searchPlaceholder: "Shampoo travel size, sabun, tisu basah...",
    heroBadge: "TRAVEL & ESSENTIALS",
    heroTitle: "Lengkap,\nsebelum berangkat",
    heroSub: "Perawatan diri higienis & perbekalan jalan-jalan",
    heroGradient: ["#9A3412", "#431407"],
    subcategories: [
      { title: "Jaga kondisi", subtitle: "Tolak Angin & Meds" },
      { title: "Siap tampil", subtitle: "Face Wash & Lotion" },
      { title: "Perawatan harian", subtitle: "Mandi & Rambut" },
      { title: "Saat pergi", subtitle: "Tisu & Sanitizer" },
    ],
    sectionTitle: "Paling dicari buat travel",
  },
  {
    id: "kesehatan",
    label: "Kesehatan",
    icon: HeartPulse,
    color: "#0284C7",
    searchPlaceholder: "Still have vitamins? Minyak kayu putih, paracetamol...",
    heroBadge: "APOTEK & KESEHATAN 24 JAM",
    heroTitle: "Kebutuhan kesehatan\nsiap 24 jam",
    heroSub: "Vitamin, obat bebas, P3K, dan resep apoteker berlisensi",
    heroGradient: ["#0369A1", "#082F49"],
    subcategories: [
      { title: "Solusi cepat reda", subtitle: "Flu & Demam" },
      { title: "Jaga daya tahan", subtitle: "Vitamin C & Zinc" },
      { title: "Perempuan & ibu", subtitle: "Pembalut & Bayi" },
      { title: "Bersih terlindungi", subtitle: "Antiseptik & Masker" },
    ],
    sectionTitle: "Paling dicari untuk kesehatan",
  },
  {
    id: "adult_21",
    label: "21+",
    icon: ShieldAlert,
    color: "#E11D48",
    searchPlaceholder: "Produk kebutuhan dewasa 21+...",
    heroBadge: "VERIFIKASI USIA 21+",
    heroTitle: "Privasi terjaga,\npengantaran aman",
    heroSub: "Hanya untuk usia dewasa dengan kemasan tertutup rapi",
    heroGradient: ["#9F1239", "#4C0519"],
    subcategories: [
      { title: "Perlindungan prima", subtitle: "Sensitivitas" },
      { title: "Kenyamanan ekstra", subtitle: "Pelumas & Gel" },
      { title: "Perawatan khusus", subtitle: "Hygiene Dewasa" },
      { title: "Keluarga berencana", subtitle: "Pilihan Pasangan" },
    ],
    sectionTitle: "Paling dicari kebutuhan dewasa",
  },
];

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

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("beranda");
  const currentTabConfig = useMemo(
    () => TABS.find((t) => t.id === activeTab) || TABS[0],
    [activeTab]
  );

  const [stores, setStores] = useState<ShopStore[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ products: any[]; stores: any[] } | null>(null);
  const [searching, setSearching] = useState(false);

  // Bottom Nav active state
  const [bottomNav, setBottomNav] = useState<"eksplor" | "promos" | "kategori" | "belanjaan">("eksplor");

  const primaryAddress = getPrimaryCustomerAddress(authAccount);
  const userLat = primaryAddress?.latitude || -7.1475;
  const userLon = primaryAddress?.longitude || 107.8015;

  const loadHomeData = async () => {
    try {
      setLoading(true);
      // fetch strictly ACTIVE stores
      const [storeRes, catRes] = await Promise.all([
        fetchShopStores({ latitude: userLat, longitude: userLon }),
        fetchShopCategories(),
      ]);

      if (storeRes.success && storeRes.data) {
        // Filter strictly ACTIVE stores
        const activeOnlyStores = storeRes.data.filter(
          (s) => s.status === "ACTIVE" || !s.status
        );
        setStores(activeOnlyStores);

        // Fetch products from the top active stores
        if (activeOnlyStores.length > 0) {
          const prodsPromises = activeOnlyStores.slice(0, 3).map((st) =>
            fetchStoreProducts(st._id, { limit: 20 })
          );
          const prodsResults = await Promise.all(prodsPromises);
          const combinedProds: ShopProduct[] = [];
          prodsResults.forEach((res) => {
            if (res.success && res.data) {
              combinedProds.push(...res.data);
            }
          });
          setAllProducts(combinedProds);
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

  const handleOpenStore = (store: ShopStore) => {
    (navigate as any)("c_shop_store", { storeId: store._id });
  };

  const handleOpenProductDetail = (product: ShopProduct) => {
    setSelectedProduct(product);
    setDetailSheetVisible(true);
  };

  // Products filtered based on activeTab
  const tabFilteredProducts = useMemo(() => {
    if (activeTab === "camilan") {
      return allProducts.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        return cat.includes("snack") || cat.includes("minum") || cat.includes("camil");
      });
    }
    if (activeTab === "masak") {
      return allProducts.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        return (
          cat.includes("sembako") ||
          cat.includes("masak") ||
          cat.includes("bumbu") ||
          cat.includes("beras") ||
          cat.includes("mi")
        );
      });
    }
    if (activeTab === "travel") {
      return allProducts.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        return (
          cat.includes("personal") ||
          cat.includes("care") ||
          cat.includes("sabun") ||
          cat.includes("travel")
        );
      });
    }
    if (activeTab === "kesehatan") {
      return allProducts.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        return (
          cat.includes("sehat") ||
          cat.includes("obat") ||
          cat.includes("farmasi") ||
          p.requiresPrescription
        );
      });
    }
    if (activeTab === "adult_21") {
      return allProducts.filter((p) => p.requiresAgeVerification);
    }
    // "beranda": all products
    return allProducts;
  }, [allProducts, activeTab]);

  // If tab has very few specific products, fall back to all products so the UI always feels lively
  const displayProducts = tabFilteredProducts.length > 0 ? tabFilteredProducts : allProducts;

  const currentStoreForSheet =
    stores.find((s) => String(s._id) === String(selectedProduct?.storeId)) ||
    stores[0] ||
    ({} as ShopStore);

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 1. Header Inspired by Reference Screenshots */}
      <View style={styles.header}>
        {/* Back / Close button */}
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <X size={20} color="#1E293B" />
        </TouchableOpacity>

        {/* Location & Delivery ETA Chip */}
        <TouchableOpacity
          style={styles.locationChip}
          onPress={() => navigate("c_addresses")}
          activeOpacity={0.8}
        >
          <View style={styles.locRow}>
            <MapPin size={13} color="#FFFFFF" />
            <Text style={styles.locationText} numberOfLines={1}>
              {primaryAddress?.label || "Rumah"}
            </Text>
          </View>
          <Text style={styles.dotSeparator}>•</Text>
          <View style={styles.etaPill}>
            <Bike size={13} color="#15803D" />
            <Text style={styles.etaText}>30 menit</Text>
          </View>
        </TouchableOpacity>

        {/* Promo Voucher & Cart Action Icons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => navigate("c_shop_discovery")}
            activeOpacity={0.7}
          >
            <Percent size={18} color="#1E293B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, styles.cartBtn]}
            onPress={() => navigate("c_shop_cart")}
            activeOpacity={0.7}
          >
            <ShoppingBag size={18} color="#1E293B" />
            {totalItems > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>
                  {totalItems > 99 ? "99+" : totalItems}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search Bar with Dynamic Contextual Placeholder */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarInner}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={currentTabConfig.searchPlaceholder}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Needs Tabs with Underline/Bar (Beranda, Camilan, Masak, Travel, Kesehatan, 21+) */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
              >
                <TabIcon
                  size={20}
                  color={isActive ? tab.color : "#64748B"}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && { color: tab.color, fontWeight: "800" },
                  ]}
                >
                  {tab.label}
                </Text>
                {isActive && (
                  <View style={[styles.activeIndicator, { backgroundColor: tab.color }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Scroll Content */}
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
            colors={[currentTabConfig.color]}
          />
        }
      >
        <View
          style={[
            styles.mainContentContainer,
            isLargeScreen && { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" },
          ]}
        >
          {/* If Search Active, Show Results */}
          {searchResults ? (
            <View style={styles.searchResultContainer}>
              <Text style={styles.searchResultTitle}>
                Hasil Pencarian: "{searchQuery}"
              </Text>

              {searchResults.stores.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Outlet Terkait</Text>
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
                          store={
                            stores.find((s) => String(s._id) === String(p.storeId)) || stores[0]
                          }
                          onPressProduct={handleOpenProductDetail}
                          accentColor={currentTabConfig.color}
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
                  description="Coba cari dengan kata kunci lain seperti beras, vitamin, atau snack."
                />
              )}
            </View>
          ) : (
            <>
              {/* 4. Themed Hero Banner Matching Active Tab */}
              <View style={styles.bannerContainer}>
                <View
                  style={[
                    styles.heroBanner,
                    { backgroundColor: currentTabConfig.heroGradient[0] },
                  ]}
                >
                  <View style={styles.heroBadge}>
                    <Sparkles size={11} color="#FDE047" />
                    <Text style={styles.heroBadgeText}>{currentTabConfig.heroBadge}</Text>
                  </View>

                  <Text style={styles.bannerTitle}>{currentTabConfig.heroTitle}</Text>
                  <Text style={styles.bannerSub}>{currentTabConfig.heroSub}</Text>

                  <TouchableOpacity
                    style={styles.bannerCta}
                    onPress={() => navigate("c_shop_discovery")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bannerCtaText, { color: currentTabConfig.heroGradient[0] }]}>
                      Jelajah Toko
                    </Text>
                    <ChevronRight size={14} color={currentTabConfig.heroGradient[0]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 5. Quick 4 Subcategory Cards (Matching the reference screenshots) */}
              <View style={styles.subcategoriesRow}>
                {currentTabConfig.subcategories.map((sub, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.subcategoryCard}
                    onPress={() => handleSearch(sub.title)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.subcategoryCardContent}>
                      <Text style={styles.subcategoryCardTitle} numberOfLines={2}>
                        {sub.title}
                      </Text>
                      <Text style={styles.subcategoryCardSub} numberOfLines={1}>
                        {sub.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 6. Section "Paling dicari / Rekomendasi" with "Lihat semua" Pill */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{currentTabConfig.sectionTitle}</Text>
                  <TouchableOpacity
                    style={styles.seeAllPill}
                    onPress={() => navigate("c_shop_discovery")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.seeAllPillText}>Lihat semua</Text>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <LoadingState message="Menyiapkan produk terbaik..." />
                ) : displayProducts.length === 0 ? (
                  <EmptyState
                    iconType="search"
                    title="Produk Segera Hadir"
                    description="Belum ada produk aktif untuk kategori ini di outlet terdekat."
                  />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {displayProducts.slice(0, 8).map((p) => (
                      <View key={p._id} style={styles.horizontalProductWrapper}>
                        <ProductCard
                          product={p}
                          store={
                            stores.find((s) => String(s._id) === String(p.storeId)) || stores[0]
                          }
                          onPressProduct={handleOpenProductDetail}
                          accentColor={currentTabConfig.color}
                        />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* 7. Section "Outlet Kanyaah Shop Terdekat" */}
              {stores.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Outlet Terdekat di Sekitar Anda</Text>
                    <TouchableOpacity
                      style={styles.seeAllPill}
                      onPress={() => navigate("c_shop_discovery")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.seeAllPillText}>Lihat semua</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {stores.map((st) => (
                      <StoreCard
                        key={st._id}
                        store={st}
                        onPress={handleOpenStore}
                        horizontal={true}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 8. Full Product Grid */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Semua Pilihan Produk</Text>
                </View>

                <View style={styles.productGrid}>
                  {displayProducts.map((p) => (
                    <View
                      key={p._id}
                      style={{
                        width: isDesktop ? "25%" : isLargeScreen ? "33.3%" : "50%",
                      }}
                    >
                      <ProductCard
                        product={p}
                        store={
                          stores.find((s) => String(s._id) === String(p.storeId)) || stores[0]
                        }
                        onPressProduct={handleOpenProductDetail}
                        accentColor={currentTabConfig.color}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Cart Pill if user has cart items */}
      {totalItems > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={[styles.floatingCartBtn, { backgroundColor: currentTabConfig.color }]}
            onPress={() => navigate("c_shop_cart")}
            activeOpacity={0.88}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingBadge}>
                <Text style={[styles.floatingBadgeText, { color: currentTabConfig.color }]}>
                  {totalItems}
                </Text>
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

      {/* Bottom Navigation Bar (Inspired by Reference Screenshots: Eksplor, Promos, Kategori, Belanjaan) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => setBottomNav("eksplor")}
          activeOpacity={0.7}
        >
          <Compass
            size={22}
            color={bottomNav === "eksplor" ? "#16A34A" : "#64748B"}
            strokeWidth={bottomNav === "eksplor" ? 2.5 : 2}
          />
          <Text
            style={[
              styles.bottomNavLabel,
              bottomNav === "eksplor" && styles.bottomNavLabelActive,
            ]}
          >
            Eksplor
          </Text>
          {bottomNav === "eksplor" && <View style={styles.bottomNavIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => {
            setBottomNav("promos");
            navigate("c_shop_discovery");
          }}
          activeOpacity={0.7}
        >
          <View style={styles.badgeWrapper}>
            <Tag size={22} color={bottomNav === "promos" ? "#16A34A" : "#64748B"} />
            <View style={styles.redDot} />
          </View>
          <Text
            style={[
              styles.bottomNavLabel,
              bottomNav === "promos" && styles.bottomNavLabelActive,
            ]}
          >
            Promos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => {
            setBottomNav("kategori");
            navigate("c_shop_discovery");
          }}
          activeOpacity={0.7}
        >
          <View style={styles.badgeWrapper}>
            <LayoutGrid size={22} color={bottomNav === "kategori" ? "#16A34A" : "#64748B"} />
            <View style={styles.redDot} />
          </View>
          <Text
            style={[
              styles.bottomNavLabel,
              bottomNav === "kategori" && styles.bottomNavLabelActive,
            ]}
          >
            Kategori
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => {
            setBottomNav("belanjaan");
            navigate("c_shop_cart");
          }}
          activeOpacity={0.7}
        >
          <FileText size={22} color={bottomNav === "belanjaan" ? "#16A34A" : "#64748B"} />
          <Text
            style={[
              styles.bottomNavLabel,
              bottomNav === "belanjaan" && styles.bottomNavLabelActive,
            ]}
          >
            Belanjaan
          </Text>
        </TouchableOpacity>
      </View>

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
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtn: { position: "relative" },
  headerCartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
  },
  headerCartBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 6,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", maxWidth: 100 },
  dotSeparator: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  etaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  etaText: { color: "#15803D", fontSize: 11, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: 8 },
  searchBarWrapper: { paddingHorizontal: 16, paddingVertical: 6 },
  searchBarInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A" },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  tabsScroll: { paddingHorizontal: 12, gap: 4 },
  tabItem: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: "relative",
  },
  tabItemActive: {},
  tabLabel: { fontSize: 11, color: "#64748B", fontWeight: "600", marginTop: 4 },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  scrollContent: { paddingBottom: 110 },
  mainContentContainer: { paddingBottom: 20 },
  bannerContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  heroBanner: {
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  heroBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  bannerTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", lineHeight: 26, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 17, marginBottom: 14 },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  bannerCtaText: { fontSize: 11, fontWeight: "800" },
  subcategoriesRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 10,
  },
  subcategoryCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 70,
    justifyContent: "center",
  },
  subcategoryCardContent: {},
  subcategoryCardTitle: { fontSize: 11, fontWeight: "800", color: "#0F172A", lineHeight: 14 },
  subcategoryCardSub: { fontSize: 9, color: "#64748B", marginTop: 2 },
  section: { marginTop: 14, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  seeAllPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  seeAllPillText: { fontSize: 11, fontWeight: "800", color: "#15803D" },
  horizontalScroll: { paddingRight: 16, gap: 10 },
  horizontalProductWrapper: { width: 170 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  searchResultContainer: { paddingHorizontal: 16, paddingTop: 10 },
  searchResultTitle: { fontSize: 15, fontWeight: "800", color: "#1F2937", marginBottom: 12 },
  floatingCartContainer: {
    position: "absolute",
    bottom: 65,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 10,
  },
  floatingCartBtn: {
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
  floatingCartLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  floatingBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBadgeText: { fontSize: 12, fontWeight: "900" },
  floatingCartLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  floatingCartRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  floatingCtaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 9,
  },
  bottomNavItem: { alignItems: "center", justifyContent: "center", flex: 1, position: "relative" },
  bottomNavLabel: { fontSize: 10, color: "#64748B", fontWeight: "600", marginTop: 2 },
  bottomNavLabelActive: { color: "#16A34A", fontWeight: "800" },
  bottomNavIndicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    backgroundColor: "#16A34A",
    borderRadius: 2,
  },
  badgeWrapper: { position: "relative" },
  redDot: {
    position: "absolute",
    top: -1,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
});
