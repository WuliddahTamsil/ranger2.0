import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  Modal,
  Alert,
} from "react-native";
import {
  Search,
  X,
  Store,
  Coffee,
  Wind,
  Building,
  Truck,
  Tag,
  Star,
  ShoppingBag,
} from "lucide-react-native";
import { Product } from "../../types";
import { rp } from "../../utils/formatters";

interface JelajahProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
  onOpenMarketplace: () => void;
  onOpenCatering: () => void;
  onOpenLaundry: () => void;
  onOpenKos: () => void;
}

export const Jelajah: React.FC<JelajahProps> = ({
  products,
  onAddToCart,
  onOpenMarketplace,
  onOpenCatering,
  onOpenLaundry,
  onOpenKos,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const popularSearches = [
    "Nasi Box",
    "Catering 50 Pax",
    "Laundry Kiloan",
    "Kos Dekat Kantor PGE",
    "Batik Kamojang",
    "Kopi Lokal",
  ];

  const handleOpenProductDetail = (p: Product) => {
    setSelectedProduct(p);
    setDetailModalVisible(true);
  };

  const handleAddProductToCart = () => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct);
    setDetailModalVisible(false);
    Alert.alert("Sukses", `${selectedProduct.name} ditambahkan ke keranjang.`);
  };

  const filtered = searchQuery.trim() === ""
    ? []
    : products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cat.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Jelajah Layanan</Text>
        <Text style={styles.subtitle}>Temukan semua yang Anda butuhkan di kawasan Kamojang.</Text>

        {/* Search input field */}
        <View style={styles.searchBarRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.textInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari makanan, laundry, kos..."
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Layanan Utama Section */}
        <Text style={styles.sectionLabel}>SEMUA LAYANAN</Text>
        <View style={styles.servicesGrid}>
          {/* Marketplace */}
          <TouchableOpacity style={styles.serviceCard} onPress={onOpenMarketplace}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#E8F5EE" }]}>
              <Store size={22} color="#1B7A4E" />
            </View>
            <Text style={styles.serviceLabel}>Marketplace</Text>
          </TouchableOpacity>

          {/* Catering */}
          <TouchableOpacity style={styles.serviceCard} onPress={onOpenCatering}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#FFEDD5" }]}>
              <Coffee size={22} color="#EA580C" />
            </View>
            <Text style={styles.serviceLabel}>Catering</Text>
          </TouchableOpacity>

          {/* Laundry */}
          <TouchableOpacity style={styles.serviceCard} onPress={onOpenLaundry}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#E0F2FE" }]}>
              <Wind size={22} color="#0284C7" />
            </View>
            <Text style={styles.serviceLabel}>Laundry</Text>
          </TouchableOpacity>

          {/* Kos */}
          <TouchableOpacity style={styles.serviceCard} onPress={onOpenKos}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#F3E8FF" }]}>
              <Building size={22} color="#9333EA" />
            </View>
            <Text style={styles.serviceLabel}>Kos</Text>
          </TouchableOpacity>

          {/* Delivery */}
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => Alert.alert("Rangers Delivery", "Layanan kurir pengiriman barang siap melayani Anda di kawasan Kamojang.")}
          >
            <View style={[styles.serviceIconBg, { backgroundColor: "#FFF4D8" }]}>
              <Truck size={22} color="#D97706" />
            </View>
            <Text style={styles.serviceLabel}>Rangers Delivery</Text>
          </TouchableOpacity>

          {/* Voucher */}
          <TouchableOpacity 
            style={styles.serviceCard}
            onPress={() => Alert.alert("Voucher & Promo", "Voucher PG 2.0 aktif. Klaim di checkout pesanan.")}
          >
            <View style={[styles.serviceIconBg, { backgroundColor: "#FFE4EF" }]}>
              <Tag size={22} color="#E91E63" />
            </View>
            <Text style={styles.serviceLabel}>Voucher</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Searches */}
        <Text style={styles.sectionLabel}>PENCARIAN POPULER</Text>
        <View style={styles.popularWrap}>
          {popularSearches.map((term, index) => (
            <TouchableOpacity
              key={index}
              style={styles.chip}
              onPress={() => setSearchQuery(term)}
            >
              <Search size={11} color="#1B7A4E" />
              <Text style={styles.chipText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Results list */}
        {searchQuery.trim().length > 0 && (
          <View style={styles.resultsWrapper}>
            <Text style={styles.sectionLabel}>HASIL PENCARIAN ({filtered.length})</Text>
            
            {filtered.length === 0 ? (
              <View style={styles.emptyResultsCard}>
                <Search size={28} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
                <Text style={styles.emptySub}>Coba dengan kata kunci lain.</Text>
              </View>
            ) : (
              filtered.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handleOpenProductDetail(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.img }} style={styles.resultImg as any} />
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultStore}>{item.store}</Text>
                    <View style={styles.resultFooter}>
                      <Text style={styles.resultPrice}>{rp(item.price)}</Text>
                      <View style={styles.starRow}>
                        <Star size={12} color="#D97706" fill="#D97706" />
                        <Text style={styles.starVal}>{item.rating}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Detail Produk */}
      {selectedProduct && (
        <Modal visible={detailModalVisible} transparent animationType="slide">
          <View style={styles.modalBgBottom}>
            <View style={styles.sheetContainer}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Detail Produk</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                <Image source={{ uri: selectedProduct.img }} style={styles.detailImg as any} />
                
                <Text style={styles.detailName}>{selectedProduct.name}</Text>
                <Text style={styles.detailStore}>Toko: {selectedProduct.store} · Kategori: {selectedProduct.cat}</Text>
                
                <View style={styles.detailRatingRow}>
                  <Star size={14} color="#D97706" fill="#D97706" />
                  <Text style={styles.detailRatingText}>{selectedProduct.rating} ({selectedProduct.sold} terjual)</Text>
                </View>

                <Text style={styles.detailSecTitle}>Deskripsi Produk</Text>
                <Text style={styles.detailDescText}>
                  Produk UMKM berkualitas unggulan Ring 1 binaan PGE Kamojang. Diproses bersih, higienis, dan terpercaya.
                </Text>

                <View style={styles.divider} />

                <View style={styles.detailFooterPriceRow}>
                  <View>
                    <Text style={styles.detailPriceLabel}>Harga Produk</Text>
                    <Text style={styles.detailPriceVal}>{rp(selectedProduct.price)}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.addToCartBtn}
                    onPress={handleAddProductToCart}
                  >
                    <ShoppingBag size={16} color="#FFFFFF" />
                    <Text style={styles.addToCartBtnText}>Tambah Keranjang</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 46,
    gap: 10,
    marginBottom: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  serviceCard: {
    width: "30.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  serviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  popularWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
  },
  resultsWrapper: {
    marginTop: 8,
  },
  emptyResultsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  emptySub: {
    fontSize: 11,
    color: "#6B7280",
  },
  resultItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 10,
  },
  resultImg: {
    width: 62,
    height: 62,
    borderRadius: 10,
  },
  resultBody: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  resultName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  resultStore: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  resultFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  resultPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  // Product Detail Modal Specific Styles
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "92%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sheetScroll: {
    maxHeight: 460,
  },
  detailImg: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    marginBottom: 14,
  },
  detailName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  detailStore: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  detailRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  detailRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  detailSecTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  detailDescText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  detailFooterPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailPriceLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  detailPriceVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1B7A4E",
    marginTop: 2,
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 12,
    gap: 8,
  },
  addToCartBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
