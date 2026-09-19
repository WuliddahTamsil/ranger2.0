import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Plus, Minus, Star, HeartPulse, Leaf } from "lucide-react-native";
import { ShopProduct, ShopStore } from "../../services/shopService";
import { useShopCart } from "../../context/ShopCartContext";
import { rp } from "../../utils/formatters";

interface ProductCardProps {
  product: ShopProduct;
  store: ShopStore;
  onPressProduct: (product: ShopProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  store,
  onPressProduct,
}) => {
  const { addToCart, updateQuantity, getItemQuantity } = useShopCart();
  const quantity = getItemQuantity(product._id);
  const isOutOfStock = product.stock <= 0;
  const isPromo = product.promoPrice != null && product.promoPrice > 0;
  const discountPercent = isPromo
    ? Math.round(((product.price - (product.promoPrice || product.price)) / product.price) * 100)
    : 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product, store);
  };

  const handleIncrement = () => {
    if (quantity >= product.stock) return;
    updateQuantity(product._id, 1);
  };

  const handleDecrement = () => {
    updateQuantity(product._id, -1);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPressProduct(product)}
      activeOpacity={0.85}
    >
      {/* Image Container */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: product.img }} style={styles.image} />

        {/* Promo Discount Badge */}
        {isPromo && discountPercent > 0 && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>-{discountPercent}%</Text>
          </View>
        )}

        {/* Prescription Tag */}
        {product.requiresPrescription && (
          <View style={styles.rxBadge}>
            <HeartPulse size={10} color="#FFFFFF" />
            <Text style={styles.rxBadgeText}>Resep</Text>
          </View>
        )}

        {/* Eco Product Tag */}
        {product.isEcoProduct && (
          <View style={styles.ecoBadge}>
            <Leaf size={10} color="#15803D" />
          </View>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Stok Habis</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.details}>
        {product.brand ? <Text style={styles.brandText}>{product.brand}</Text> : null}
        <Text style={styles.nameText} numberOfLines={2}>
          {product.name}
        </Text>

        <Text style={styles.unitText}>{product.unit || "pcs"}</Text>

        {/* Pricing */}
        <View style={styles.priceRow}>
          <Text style={styles.activePrice}>
            {rp(isPromo ? product.promoPrice || product.price : product.price)}
          </Text>
          {isPromo && <Text style={styles.strikePrice}>{rp(product.price)}</Text>}
        </View>

        {/* Stock Alert if low */}
        {product.stock > 0 && product.stock <= 5 && (
          <Text style={styles.lowStockText}>Sisa {product.stock} lagi!</Text>
        )}

        {/* Add / Stepper CTA */}
        <View style={styles.actionRow}>
          {isOutOfStock ? (
            <View style={styles.disabledAddBtn}>
              <Text style={styles.disabledAddText}>Habis</Text>
            </View>
          ) : quantity === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#15803D" />
              <Text style={styles.addBtnText}>Tambah</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepperWrapper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={handleDecrement}
                activeOpacity={0.7}
              >
                <Minus size={13} color="#15803D" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.stepperBtn, quantity >= product.stock && styles.stepperDisabled]}
                onPress={handleIncrement}
                activeOpacity={0.7}
                disabled={quantity >= product.stock}
              >
                <Plus size={13} color={quantity >= product.stock ? "#9CA3AF" : "#15803D"} />
              </TouchableOpacity>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1.5,
    flex: 1,
    margin: 5,
    justifyContent: "space-between",
  },
  imageWrapper: {
    height: 120,
    width: "100%",
    backgroundColor: "#F9FAFB",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  promoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#DC2626",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  rxBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#0284C7",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rxBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  ecoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 3,
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 24, 39, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  details: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  brandText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  nameText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 17,
    minHeight: 34,
  },
  unitText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginVertical: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  activePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
  strikePrice: {
    fontSize: 10,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  lowStockText: {
    fontSize: 10,
    color: "#D97706",
    fontWeight: "600",
    marginTop: 2,
  },
  actionRow: {
    marginTop: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },
  disabledAddBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledAddText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  stepperWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stepperDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
});
