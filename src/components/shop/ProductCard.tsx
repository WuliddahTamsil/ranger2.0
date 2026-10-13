import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Plus, Minus, HeartPulse, AlertCircle } from "lucide-react-native";
import { ShopProduct, ShopStore } from "../../services/shopService";
import { useShopCart } from "../../context/ShopCartContext";
import { rp } from "../../utils/formatters";

interface ProductCardProps {
  product: ShopProduct;
  store: ShopStore;
  onPressProduct: (product: ShopProduct) => void;
  accentColor?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  store,
  onPressProduct,
  accentColor = "#16A34A",
}) => {
  const { addToCart, updateQuantity, getItemQuantity } = useShopCart();
  const quantity = getItemQuantity(product._id);
  const isOutOfStock = product.stock <= 0;
  const isPromo = product.promoPrice != null && product.promoPrice > 0 && product.promoPrice < product.price;
  const discountPercent = isPromo
    ? Math.round(((product.price - (product.promoPrice || product.price)) / product.price) * 100)
    : 0;

  const handleAdd = (e?: any) => {
    e?.stopPropagation?.();
    if (isOutOfStock) return;
    addToCart(product, store);
  };

  const handleIncrement = (e?: any) => {
    e?.stopPropagation?.();
    if (quantity >= product.stock) return;
    updateQuantity(product._id, 1);
  };

  const handleDecrement = (e?: any) => {
    e?.stopPropagation?.();
    updateQuantity(product._id, -1);
  };

  // Determine unit pill text
  const unitBadgeText = product.weight && product.weight > 0
    ? `${product.weight}g`
    : product.unit || "pcs";

  const [imgError, setImgError] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPressProduct(product)}
      activeOpacity={0.88}
    >
      {/* Product Image Container */}
      <View style={styles.imageWrapper}>
        {product.img && !imgError ? (
          <Image
            source={{ uri: product.img }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>Kanyaah Shop</Text>
          </View>
        )}

        {/* Top-Left: Populer or Promo Discount Badge */}
        {isPromo && discountPercent > 0 ? (
          <View style={styles.promoDiscountBadge}>
            <Text style={styles.promoDiscountText}>-{discountPercent}%</Text>
          </View>
        ) : (
          <View style={styles.populerBadge}>
            <Text style={styles.populerBadgeText}>Populer</Text>
          </View>
        )}

        {/* Top-Right: 21+ or Resep Badges */}
        <View style={styles.topRightBadges}>
          {product.requiresAgeVerification && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>21+</Text>
            </View>
          )}

          {product.requiresPrescription && (
            <View style={styles.rxBadge}>
              <HeartPulse size={9} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.rxBadgeText}>Resep</Text>
            </View>
          )}
        </View>

        {/* Out of Stock Overlay */}
        {isOutOfStock ? (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Habis</Text>
          </View>
        ) : quantity === 0 ? (
          /* Bottom-Right: Circular (+) Add Button (Inspired by reference screenshots) */
          <TouchableOpacity
            style={[styles.floatingAddBtn, { backgroundColor: accentColor }]}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        ) : (
          /* Bottom-Right: Interactive Stepper pill */
          <View style={styles.floatingStepper}>
            <TouchableOpacity
              style={styles.stepperSubBtn}
              onPress={handleDecrement}
              activeOpacity={0.7}
            >
              <Minus size={12} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.stepperCountText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.stepperSubBtn}
              onPress={handleIncrement}
              activeOpacity={0.7}
              disabled={quantity >= product.stock}
            >
              <Plus size={12} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Details Container */}
      <View style={styles.details}>
        {/* Unit & Characteristic Pills */}
        <View style={styles.pillsRow}>
          <View style={styles.unitPill}>
            <Text style={styles.unitPillText}>{unitBadgeText}</Text>
          </View>

          {product.requiresAgeVerification && (
            <View style={[styles.unitPill, styles.specialPill]}>
              <Text style={styles.specialPillText}>21+</Text>
            </View>
          )}
        </View>

        {/* Brand name if available */}
        {product.brand ? (
          <Text style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}

        {/* Product Name */}
        <Text style={styles.nameText} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Pricing Area */}
        <View style={styles.priceContainer}>
          <Text style={[styles.activePrice, isPromo && styles.promoActivePrice]}>
            {rp(isPromo ? product.promoPrice || product.price : product.price)}
          </Text>

          {isPromo && (
            <View style={styles.oldPriceRow}>
              <Text style={styles.strikePrice}>{rp(product.price)}</Text>
              <View style={styles.miniDiscountPill}>
                <Text style={styles.miniDiscountText}>{discountPercent}%</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
    margin: 5,
    justifyContent: "space-between",
  },
  imageWrapper: {
    height: 140,
    width: "100%",
    backgroundColor: "#F8FAFC",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  image: {
    width: "88%",
    height: "88%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  populerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  populerBadgeText: {
    color: "#0284C7",
    fontSize: 10,
    fontWeight: "700",
  },
  promoDiscountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  promoDiscountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  topRightBadges: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
  },
  ageBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  ageBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  rxBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
  },
  rxBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  floatingAddBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingStepper: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  stepperSubBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    minWidth: 14,
    textAlign: "center",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  details: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  unitPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  specialPill: {
    backgroundColor: "#DCFCE7",
  },
  specialPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  brandText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  nameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 6,
  },
  priceContainer: {
    marginTop: "auto",
  },
  activePrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  promoActivePrice: {
    color: "#DC2626",
  },
  oldPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  strikePrice: {
    fontSize: 10,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  miniDiscountPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniDiscountText: {
    color: "#DC2626",
    fontSize: 9,
    fontWeight: "800",
  },
});
