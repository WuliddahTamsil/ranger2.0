import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import {
  X,
  Plus,
  Minus,
  Star,
  ShieldCheck,
  HeartPulse,
  Leaf,
  ShoppingBag,
  Store,
  CheckCircle2,
  Package,
} from "lucide-react-native";
import { ShopProduct, ShopStore } from "../../services/shopService";
import { useShopCart } from "../../context/ShopCartContext";
import { rp } from "../../utils/formatters";

interface ProductDetailSheetProps {
  product: ShopProduct | null;
  store: ShopStore;
  visible: boolean;
  onClose: () => void;
  onSelectRelated?: (product: ShopProduct) => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  product,
  store,
  visible,
  onClose,
  onSelectRelated,
}) => {
  // Unconditionally call ALL hooks at the top of the component
  const { addToCart, getItemQuantity, updateQuantity } = useShopCart();
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [note, setNote] = useState("");
  const [localQty, setLocalQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Synchronize local state whenever product or visibility changes
  useEffect(() => {
    if (product && visible) {
      const currentQty = getItemQuantity(product._id);
      setLocalQty(currentQty > 0 ? currentQty : 1);
      setSelectedImgIndex(0);
      setNote("");
      setImgError(false);
      setAddedSuccess(false);
    }
  }, [product?._id, visible]);

  // Safe early return only after ALL hooks have been invoked
  if (!visible || !product) {
    return null;
  }

  const currentQty = getItemQuantity(product._id);
  const isOutOfStock = product.stock <= 0;
  const isPromo =
    product.promoPrice != null &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price;
  const activePrice = isPromo ? product.promoPrice || product.price : product.price;
  const discountPercent = isPromo
    ? Math.round(((product.price - activePrice) / product.price) * 100)
    : 0;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.img
      ? [product.img]
      : [];

  const currentImageUri = images[selectedImgIndex] || product.img;

  const handleIncrement = () => {
    if (localQty < product.stock) {
      setLocalQty((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (localQty > 1) {
      setLocalQty((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (currentQty === 0) {
      addToCart({ ...product }, store || ({} as ShopStore));
      if (localQty > 1) {
        updateQuantity(product._id, localQty - 1);
      }
    } else {
      const delta = localQty - currentQty;
      if (delta !== 0) {
        updateQuantity(product._id, delta);
      }
    }
    setAddedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Pop-up Top Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.sheetHandleBar} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Detail Produk
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Main Product Showcase Highlight Card */}
            <View style={styles.imageSection}>
              {!imgError && currentImageUri ? (
                <Image
                  source={{ uri: currentImageUri }}
                  style={styles.mainImage}
                  resizeMode="contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <View style={styles.placeholderBox}>
                  <Package size={44} color="#94A3B8" />
                  <Text style={styles.placeholderTitle} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.placeholderSubtitle}>Kanyaah Shop</Text>
                </View>
              )}

              {/* Floating Badges on Image */}
              <View style={styles.imageBadges}>
                {isPromo && discountPercent > 0 && (
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>HEMAT {discountPercent}%</Text>
                  </View>
                )}
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Populer</Text>
                </View>
                {product.requiresPrescription && (
                  <View style={styles.rxBadge}>
                    <HeartPulse size={12} color="#FFFFFF" />
                    <Text style={styles.rxBadgeText}>Wajib Resep</Text>
                  </View>
                )}
                {product.isEcoProduct && (
                  <View style={styles.ecoBadge}>
                    <Leaf size={12} color="#15803D" />
                    <Text style={styles.ecoBadgeText}>Organik</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Thumbnail Selector if Multiple Images */}
            {images.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbScroll}
              >
                {images.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setSelectedImgIndex(idx);
                      setImgError(false);
                    }}
                    style={[
                      styles.thumbWrapper,
                      selectedImgIndex === idx && styles.activeThumb,
                    ]}
                  >
                    <Image
                      source={{ uri: img }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Product Meta Highlight Section */}
            <View style={styles.metaContainer}>
              <View style={styles.brandRow}>
                <Text style={styles.brandText}>
                  {product.brand
                    ? product.brand.toUpperCase()
                    : product.category
                    ? product.category.toUpperCase()
                    : "KANYAAH SHOP"}
                </Text>
                {product.stock > 0 ? (
                  <View style={styles.stockPill}>
                    <View style={styles.stockDot} />
                    <Text style={styles.stockText}>
                      Stok: {product.stock} {product.unit || "pcs"}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.stockPill, styles.stockPillEmpty]}>
                    <Text style={styles.stockTextEmpty}>Stok Habis</Text>
                  </View>
                )}
              </View>

              <Text style={styles.nameText}>{product.name}</Text>

              {/* Price Row */}
              <View style={styles.priceRow}>
                <Text style={styles.activePriceText}>{rp(activePrice)}</Text>
                {isPromo && (
                  <Text style={styles.strikePriceText}>{rp(product.price)}</Text>
                )}
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>
                    {product.weight && product.weight > 0
                      ? `${product.weight}g`
                      : product.unit || "pcs"}
                  </Text>
                </View>
              </View>

              {/* Rating & Outlet Store Info */}
              <View style={styles.ratingStoreRow}>
                <View style={styles.ratingBadge}>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {product.rating?.toFixed(1) || "4.9"}
                  </Text>
                  <Text style={styles.ratingCount}>• 50+ terjual</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <View style={styles.storeBadge}>
                  <Store size={12} color="#16A34A" />
                  <Text style={styles.storeNameText} numberOfLines={1}>
                    {store?.name || "Kanyaah Shop"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Description */}
            <View style={styles.descContainer}>
              <Text style={styles.sectionHeading}>Deskripsi Produk</Text>
              <Text style={styles.descText}>
                {product.description ||
                  "Kualitas terjamin untuk kebutuhan harian Anda. Produk dipilih langsung dari rak terbaik toko rekanan resmi Kanyaah Shop GEOVERSE."}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Notes to Shopper / Store */}
            <View style={styles.notesContainer}>
              <Text style={styles.sectionHeading}>Catatan Khusus (Opsional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Contoh: Pilih kemasan rapi, expired masih lama..."
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
                maxLength={150}
              />
            </View>
          </ScrollView>

          {/* Sticky CTA Bottom Bar */}
          <View style={styles.footerBar}>
            {/* Quantity Stepper */}
            {!isOutOfStock && (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    localQty <= 1 && styles.stepperBtnDisabled,
                  ]}
                  onPress={handleDecrement}
                  disabled={localQty <= 1}
                  activeOpacity={0.7}
                >
                  <Minus size={16} color={localQty <= 1 ? "#94A3B8" : "#16A34A"} />
                </TouchableOpacity>
                <Text style={styles.localQtyText}>{localQty}</Text>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    localQty >= product.stock && styles.stepperBtnDisabled,
                  ]}
                  onPress={handleIncrement}
                  disabled={localQty >= product.stock}
                  activeOpacity={0.7}
                >
                  <Plus
                    size={16}
                    color={localQty >= product.stock ? "#94A3B8" : "#16A34A"}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Add to Cart / Update Button */}
            <TouchableOpacity
              style={[
                styles.ctaButton,
                isOutOfStock && styles.ctaButtonDisabled,
                addedSuccess && styles.ctaButtonSuccess,
              ]}
              onPress={handleAddToCart}
              disabled={isOutOfStock}
              activeOpacity={0.88}
            >
              {addedSuccess ? (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.ctaButtonText}>Berhasil Ditambahkan!</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={18} color="#FFFFFF" />
                  <Text style={styles.ctaButtonText}>
                    {isOutOfStock
                      ? "Stok Habis"
                      : currentQty > 0
                      ? `Perbarui (${rp(activePrice * localQty)})`
                      : `+ Keranjang (${rp(activePrice * localQty)})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: "center",
    padding: Platform.OS === "web" ? 16 : 0,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderRadius: Platform.OS === "web" ? 24 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetHandleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageSection: {
    height: 240,
    backgroundColor: "#F8FAFC",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 16,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
  },
  placeholderSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  imageBadges: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  promoBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  popularBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  rxBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rxBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  ecoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ecoBadgeText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "700",
  },
  thumbScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  thumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    marginRight: 8,
    overflow: "hidden",
  },
  activeThumb: {
    borderColor: "#16A34A",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  metaContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockPillEmpty: {
    backgroundColor: "#FEF2F2",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  stockText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  stockTextEmpty: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  nameText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 25,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 10,
  },
  activePriceText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#16A34A",
  },
  strikePriceText: {
    fontSize: 14,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  unitBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  ratingStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratingCount: {
    fontSize: 12,
    color: "#64748B",
  },
  dot: {
    marginHorizontal: 4,
    color: "#CBD5E1",
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  storeNameText: {
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  descContainer: {
    paddingHorizontal: 20,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  notesContainer: {
    paddingHorizontal: 20,
  },
  notesInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  localQtyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    minWidth: 20,
    textAlign: "center",
  },
  ctaButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  ctaButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  ctaButtonSuccess: {
    backgroundColor: "#059669",
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
