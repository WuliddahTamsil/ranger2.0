import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Store,
  Trash2,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useShopCart } from "../../../context/ShopCartContext";
import { CartItemCard } from "../../../components/shop/CartItemCard";
import { SubstitutionSelector } from "../../../components/shop/SubstitutionSelector";
import { EmptyState } from "../../../components/shop/EmptyState";
import { ConflictStoreModal } from "../../../components/shop/ConflictStoreModal";
import { rp } from "../../../utils/formatters";

export const ShopCartScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const {
    activeStore,
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    substitutionPolicy,
    setSubstitutionPolicy,
    storeNotes,
    setStoreNotes,
    subtotal,
    estimatedDeliveryFee,
    serviceFee,
    estimatedTotal,
  } = useShopCart();

  if (items.length === 0 || !activeStore) {
    return (
      <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigate("c_shop_home")} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Keranjang Belanja</Text>
          <View style={{ width: 36 }} />
        </View>

        <EmptyState
          iconType="cart"
          title="Keranjang Masih Kosong"
          description="Yuk, pilih kebutuhan harian dari supermarket atau apotek favoritmu."
          buttonLabel="Mulai Belanja"
          onPressButton={() => navigate("c_shop_home")}
        />
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate("c_shop_home")} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Keranjang Belanja</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={clearCart} activeOpacity={0.7}>
          <Trash2 size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isLarge && { maxWidth: 850, alignSelf: "center", width: "100%" }]}
      >
        {/* 1. Store Header Box */}
        <View style={styles.storeHeaderBox}>
          <View style={styles.storeHeaderLeft}>
            <View style={styles.storeIconCircle}>
              <Store size={18} color="#15803D" />
            </View>
            <View style={styles.storeTextCol}>
              <Text style={styles.storeName}>{activeStore.name}</Text>
              <Text style={styles.storeType}>{activeStore.storeType} • {activeStore.isOpen ? "Buka Sekarang" : "Tutup"}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addMoreItemsBtn}
            onPress={() => (navigate as any)("c_shop_store", { storeId: activeStore._id })}
            activeOpacity={0.8}
          >
            <Text style={styles.addMoreItemsText}>+ Tambah Lagi</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Cart Items List */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionHeaderTitle}>Daftar Produk ({items.length})</Text>
          {items.map((it) => (
            <CartItemCard
              key={it.product._id}
              item={it}
              onIncrement={() => updateQuantity(it.product._id, 1)}
              onDecrement={() => updateQuantity(it.product._id, -1)}
              onRemove={() => removeFromCart(it.product._id)}
            />
          ))}
        </View>

        {/* 3. Substitution Policy Selector */}
        <SubstitutionSelector
          selectedPolicy={substitutionPolicy}
          onSelectPolicy={setSubstitutionPolicy}
        />

        {/* 4. Notes to Store / Shopper */}
        <View style={styles.notesBox}>
          <Text style={styles.sectionHeaderTitle}>Catatan untuk Toko & Shopper</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Contoh: Pilih sayur/buah yang masih segar, expired date lebih dari 6 bulan..."
            placeholderTextColor="#9CA3AF"
            value={storeNotes}
            onChangeText={setStoreNotes}
            multiline
            maxLength={200}
          />
        </View>

        {/* 5. Summary Breakdown */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionHeaderTitle}>Ringkasan Pembayaran</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Produk</Text>
            <Text style={styles.summaryVal}>{rp(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimasi Ongkir ({activeStore.deliveryRadiusKm || 15} km)</Text>
            <Text style={styles.summaryVal}>{rp(estimatedDeliveryFee)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan Aplikasi</Text>
            <Text style={styles.summaryVal}>{rp(serviceFee)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Sementara</Text>
            <Text style={styles.totalVal}>{rp(estimatedTotal)}</Text>
          </View>
          <Text style={styles.summaryDisclaimer}>
            Voucher diskon dan penggunaan GEOVERSE Point dapat diterapkan di halaman Checkout.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalCol}>
          <Text style={styles.bottomTotalLabel}>Total Sementara</Text>
          <Text style={styles.bottomTotalVal}>{rp(estimatedTotal)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigate("c_shop_checkout")}
          activeOpacity={0.88}
        >
          <Text style={styles.checkoutBtnText}>Lanjut ke Checkout</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  storeHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  storeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  storeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  storeTextCol: {
    flex: 1,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  storeType: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
  },
  addMoreItemsBtn: {
    backgroundColor: "#FFFFFF",
    borderColor: "#15803D",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addMoreItemsText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "700",
  },
  itemsSection: {
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  notesBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 8,
  },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
    minHeight: 60,
    textAlignVertical: "top",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  summaryDisclaimer: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    lineHeight: 15,
  },
  bottomBar: {
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
  bottomTotalCol: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  bottomTotalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  checkoutBtn: {
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
