import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import {
  Store,
  HeartPulse,
  ShoppingBag,
  Wheat,
  Coffee,
  Cookie,
  Activity,
  Baby,
  Sparkles,
  Home,
  Smile,
  Gift,
} from "lucide-react-native";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  bg: string;
  desc?: string;
}

interface CategoryIconCardProps {
  category: CategoryItem;
  isSelected?: boolean;
  onPress: (category: CategoryItem) => void;
  style?: StyleProp<ViewStyle>;
}

const renderIcon = (iconName: string, color: string, size = 22) => {
  switch (iconName) {
    case "Store":
      return <Store size={size} color={color} />;
    case "HeartPulse":
      return <HeartPulse size={size} color={color} />;
    case "ShoppingBag":
      return <ShoppingBag size={size} color={color} />;
    case "Wheat":
      return <Wheat size={size} color={color} />;
    case "Coffee":
      return <Coffee size={size} color={color} />;
    case "Cookie":
      return <Cookie size={size} color={color} />;
    case "Activity":
      return <Activity size={size} color={color} />;
    case "Baby":
      return <Baby size={size} color={color} />;
    case "Sparkles":
      return <Sparkles size={size} color={color} />;
    case "Home":
      return <Home size={size} color={color} />;
    case "Smile":
      return <Smile size={size} color={color} />;
    case "Gift":
      return <Gift size={size} color={color} />;
    default:
      return <Store size={size} color={color} />;
  }
};

export const CategoryIconCard: React.FC<CategoryIconCardProps> = ({
  category,
  isSelected = false,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer, style]}
      onPress={() => onPress(category)}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: category.bg },
          isSelected && { borderColor: category.color, borderWidth: 2 },
        ]}
      >
        {renderIcon(category.icon, category.color, 24)}
      </View>
      <Text style={[styles.name, isSelected && { color: category.color, fontWeight: "700" }]} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "20%",
    marginVertical: 4,
    paddingHorizontal: 2,
  },
  selectedContainer: {
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  name: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 14,
  },
});
