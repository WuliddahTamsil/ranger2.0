import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MapPin, ChevronDown, Bell, ShoppingBag, ArrowLeft } from "lucide-react-native";
import { useShopCart } from "../../context/ShopCartContext";

interface ShopHeaderProps {
  title?: string;
  addressName?: string;
  onPressAddress?: () => void;
  onPressNotifications?: () => void;
  onPressCart?: () => void;
  onPressBack?: () => void;
  showBack?: boolean;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  title,
  addressName = "Alamat Pengiriman Utama",
  onPressAddress,
  onPressNotifications,
  onPressCart,
  onPressBack,
  showBack = false,
}) => {
  const { totalItems } = useShopCart();

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        {showBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onPressBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
        ) : null}

        {title ? (
          <Text style={styles.titleText}>{title}</Text>
        ) : (
          <TouchableOpacity
            style={styles.addressSelector}
            onPress={onPressAddress}
            activeOpacity={0.7}
          >
            <View style={styles.pinBg}>
              <MapPin size={14} color="#15803D" />
            </View>
            <View style={styles.addressTextCol}>
              <Text style={styles.deliveryLabel}>Antar ke:</Text>
              <View style={styles.addressRow}>
                <Text style={styles.addressName} numberOfLines={1}>
                  {addressName}
                </Text>
                <ChevronDown size={14} color="#374151" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.rightActions}>
        {onPressNotifications && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onPressNotifications}
            activeOpacity={0.7}
          >
            <Bell size={20} color="#374151" />
          </TouchableOpacity>
        )}

        {onPressCart && (
          <TouchableOpacity style={styles.iconBtn} onPress={onPressCart} activeOpacity={0.7}>
            <ShoppingBag size={20} color="#374151" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems > 99 ? "99+" : totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  addressSelector: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pinBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  addressTextCol: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addressName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    maxWidth: 200,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
});
