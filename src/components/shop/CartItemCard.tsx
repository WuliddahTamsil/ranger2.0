import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Plus, Minus, Trash2 } from "lucide-react-native";
import { CartLine } from "../../context/ShopCartContext";
import { rp } from "../../utils/formatters";

interface CartItemCardProps {
  item: CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  const { product, quantity } = item;
  const isPromo = product.promoPrice != null && product.promoPrice > 0;
  const unitPrice = isPromo ? product.promoPrice || product.price : product.price;
  const lineSubtotal = unitPrice * quantity;

  return (
    <View style={styles.card}>
      <Image source={{ uri: product.img }} style={styles.image} />

      <View style={styles.contentCol}>
        <View style={styles.topRow}>
          <Text style={styles.nameText} numberOfLines={2}>
            {product.name}
          </Text>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.7}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.unitText}>
          {rp(unitPrice)} / {product.unit || "pcs"}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.subtotalText}>{rp(lineSubtotal)}</Text>

          {/* Stepper */}
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperBtn} onPress={onDecrement} activeOpacity={0.7}>
              <Minus size={14} color="#15803D" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, quantity >= product.stock && styles.stepperDisabled]}
              onPress={onIncrement}
              disabled={quantity >= product.stock}
              activeOpacity={0.7}
            >
              <Plus size={14} color={quantity >= product.stock ? "#9CA3AF" : "#15803D"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    resizeMode: "cover",
  },
  contentCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  nameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    lineHeight: 18,
  },
  removeBtn: {
    padding: 4,
  },
  unitText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  subtotalText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 8,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});
