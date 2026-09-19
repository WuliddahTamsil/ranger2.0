import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
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
  const { addToCart, getItemQuantity, updateQuantity } = useShopCart();
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [note, setNote] = useState("");

  if (!product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : [product.img];

  const currentQty = getItemQuantity(product._id);
  const [localQty, setLocalQty] = useState(currentQty > 0 ? currentQty : 1);

  const isOutOfStock = product.stock <= 0;
  const isPromo = product.promoPrice != null && product.promoPrice > 0;
  const activePrice = isPromo ? product.promoPrice || product.price : product.price;

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
      addToCart({ ...product }, store);
      if (localQty > 1) {
        updateQuantity(product._id, localQty - 1);
      }
    } else {
      const delta = localQty - currentQty;
      if (delta !== 0) {
        updateQuantity(product._id, delta);
      }
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Sheet Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Detail Produk
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Main Image & Carousel Thumbnails */}
            <View style={styles.imageSection}>
              <Image source={{ uri: images[selectedImgIndex] || product.img }} style={styles.mainImage} />

              {/* Badges */}
              <View style={styles.imageBadges}>
                {product.requiresPrescription && (
                  <View style={styles.rxBadge}>
                    <HeartPulse size={12} color="#FFFFFF" />
                    <Text style={styles.rxBadgeText}>Wajib Resep Dokter</Text>
                  </View>
                )}
                {product.isEcoProduct && (
                  <View style={styles.ecoBadge}>
                    <Leaf size={12} color="#15803D" />
                    <Text style={styles.ecoBadgeText}>Organik / Ramah Lingkungan</Text>
                  </View>
                )}
              </View>
            </View>

            {images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                {images.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedImgIndex(idx)}
                    style={[styles.thumbWrapper, selectedImgIndex === idx && styles.activeThumb]}
                  >
                    <Image source={{ uri: img }} style={styles.thumbImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Product Meta */}
            <View style={styles.metaContainer}>
              {product.brand ? <Text style={styles.brandText}>{product.brand}</Text> : null}
              <Text style={styles.nameText}>{product.name}</Text>

              {/* Price Row */}
              <View style={styles.priceRow}>
                <Text style={styles.activePriceText}>{rp(activePrice)}</Text>
                {isPromo && <Text style={styles.strikePriceText}>{rp(product.price)}</Text>}
                <Text style={styles.unitText}>/ {product.unit || "pcs"}</Text>
              </View>

              {/* Ratings and Store */}
              <View style={styles.ratingStoreRow}>
                <View style={styles.ratingBadge}>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{product.rating?.toFixed(1) || "4.9"}</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.storeNameText}>{store.name}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.stockStatusText}>
                  {product.stock > 0 ? `Tersedia ${product.stock} ${product.unit || "pcs"}` : "Stok Habis"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Description */}
            <View style={styles.descContainer}>
              <Text style={styles.sectionHeading}>Deskripsi Produk</Text>
              <Text style={styles.descText}>
                {product.description ||
                  "Kualitas terjamin untuk kebutuhan harian Anda. Produk dipilih langsung dari rak terbaik toko rekanan GEOVERSE."}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Notes to Shopper / Store */}
            <View style={styles.notesContainer}>
              <Text style={styles.sectionHeading}>Catatan Khusus Produk (Opsional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Contoh: Pilih buah yang matang, masa kedaluwarsa panjang..."
                placeholderTextColor="#9CA3AF"
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
                  style={[styles.stepperBtn, localQty <= 1 && styles.stepperBtnDisabled]}
                  onPress={handleDecrement}
                  disabled={localQty <= 1}
                  activeOpacity={0.7}
                >
                  <Minus size={16} color={localQty <= 1 ? "#9CA3AF" : "#15803D"} />
                </TouchableOpacity>
                <Text style={styles.localQtyText}>{localQty}</Text>
                <TouchableOpacity
                  style={[styles.stepperBtn, localQty >= product.stock && styles.stepperBtnDisabled]}
                  onPress={handleIncrement}
                  disabled={localQty >= product.stock}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={localQty >= product.stock ? "#9CA3AF" : "#15803D"} />
                </TouchableOpacity>
              </View>
            )}

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.ctaButton, isOutOfStock && styles.ctaButtonDisabled]}
              onPress={handleAddToCart}
              disabled={isOutOfStock}
              activeOpacity={0.85}
            >
              <ShoppingBag size={18} color="#FFFFFF" />
              <Text style={styles.ctaButtonText}>
                {isOutOfStock
                  ? "Produk Sedang Habis"
                  : `+ Keranjang (${rp(activePrice * localQty)})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    minHeight: 450,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageSection: {
    height: 220,
    backgroundColor: "#F9FAFB",
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    gap: 6,
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
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: "700",
  },
  thumbScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thumbWrapper: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginRight: 8,
    overflow: "hidden",
  },
  activeThumb: {
    borderColor: "#15803D",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  metaContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  nameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 24,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  activePriceText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#15803D",
  },
  strikePriceText: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  unitText: {
    fontSize: 13,
    color: "#6B7280",
  },
  ratingStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  dot: {
    marginHorizontal: 8,
    color: "#D1D5DB",
  },
  storeNameText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  stockStatusText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  descContainer: {
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
  notesContainer: {
    paddingHorizontal: 16,
  },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
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
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },
  ctaButton: {
    flex: 1,
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  ctaButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
