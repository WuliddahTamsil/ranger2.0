import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { Filter, Check, ArrowLeft } from "lucide-react-native";
import { Nav } from "../../../types";
import { fetchShopStores, ShopStore } from "../../../services/shopService";
import { ShopHeader } from "../../../components/shop/ShopHeader";
import { ShopSearchBar } from "../../../components/shop/ShopSearchBar";
import { StoreCard } from "../../../components/shop/StoreCard";
import { EmptyState, LoadingState } from "../../../components/shop/EmptyState";
import { ConflictStoreModal } from "../../../components/shop/ConflictStoreModal";

const STORE_TABS = [
  { label: "Semua", value: "ALL" },
  { label: "Supermarket", value: "SUPERMARKET" },
  { label: "Apotek", value: "PHARMACY" },
  { label: "Minimarket", value: "MINIMARKET" },
  { label: "Kesehatan", value: "HEALTH" },
  { label: "Ibu & Bayi", value: "BABY" },
  { label: "UMKM Lokal", value: "UMKM" },
];

const SORT_OPTIONS: Array<{ label: string; value: "nearest" | "fastest" | "rating" | "cheapest_fee" }> = [
  { label: "Terdekat", value: "nearest" },
  { label: "Tercepat", value: "fastest" },
  { label: "Rating Terbaik", value: "rating" },
  { label: "Ongkir Termurah", value: "cheapest_fee" },
];

export const StoreDiscoveryScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [activeTab, setActiveTab] = useState("ALL");
  const [activeSort, setActiveSort] = useState<"nearest" | "fastest" | "rating" | "cheapest_fee">("nearest");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stores, setStores] = useState<ShopStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await fetchShopStores({
        storeType: activeTab,
        query: searchQuery,
        openNow: openNowOnly,
        sortBy: activeSort,
      });
      if (res.success && res.data) {
        setStores(res.data);
      }
    } catch (e) {
      console.warn("loadStores error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [activeTab, activeSort, openNowOnly]);

  const handleSearchSubmit = () => {
    loadStores();
  };

  const handleOpenStore = (store: ShopStore) => {
    (navigate as any)("c_shop_store", { storeId: store._id });
  };

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      <ShopHeader
        title="Jelajah Toko & Supermarket"
        showBack={true}
        onPressBack={() => navigate("c_shop_home")}
        onPressCart={() => navigate("c_shop_cart")}
      />

      {/* Search Input */}
      <ShopSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={handleSearchSubmit}
        placeholder="Cari nama toko, supermarket, atau apotek..."
      />

      {/* Store Category Tabs (Horizontal) */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {STORE_TABS.map((tab) => {
            const isSelected = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tabChip, isSelected && styles.activeTabChip]}
                onPress={() => setActiveTab(tab.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabChipText, isSelected && styles.activeTabChipText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Secondary Filter Chips (Sort & Open Now) */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SORT_OPTIONS.map((opt) => {
            const isSortActive = activeSort === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, isSortActive && styles.activeFilterChip]}
                onPress={() => setActiveSort(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSortActive && styles.activeFilterChipText]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.filterChip, openNowOnly && styles.activeFilterChip]}
            onPress={() => setOpenNowOnly(!openNowOnly)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, openNowOnly && styles.activeFilterChipText]}>
              Buka Sekarang
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Stores List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStores();
            }}
            colors={["#15803D"]}
          />
        }
      >
        <View style={[styles.contentContainer, isLargeScreen && styles.largeContainer]}>
          {loading ? (
            <LoadingState message="Mencari toko terdekat..." />
          ) : stores.length > 0 ? (
            <View style={styles.storeListGrid}>
              {stores.map((s) => (
                <View key={s._id} style={{ width: isLargeScreen ? "50%" : "100%", paddingHorizontal: 4 }}>
                  <StoreCard store={s} onPress={handleOpenStore} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              iconType="search"
              title="Toko Tidak Ditemukan"
              description="Tidak ada toko yang sesuai dengan filter pencarian Anda. Coba atur ulang filter atau kata kunci."
              buttonLabel="Reset Filter"
              onPressButton={() => {
                setActiveTab("ALL");
                setActiveSort("nearest");
                setOpenNowOnly(false);
                setSearchQuery("");
              }}
            />
          )}
        </View>
      </ScrollView>

      <ConflictStoreModal />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  activeTabChip: {
    backgroundColor: "#15803D",
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  activeTabChipText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterRow: {
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  activeFilterChip: {
    borderColor: "#15803D",
    backgroundColor: "#DCFCE7",
  },
  filterChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  activeFilterChipText: {
    color: "#15803D",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  contentContainer: {
    width: "100%",
  },
  largeContainer: {
    maxWidth: 1200,
    alignSelf: "center",
  },
  storeListGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
});
