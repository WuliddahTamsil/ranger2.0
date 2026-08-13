import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface PillProps {
  children: React.ReactNode;
  color?: "green" | "orange" | "blue" | "purple" | "red" | "gray" | string;
}

export const Pill: React.FC<PillProps> = ({ children, color = "green" }) => {
  const getStyle = () => {
    switch (color) {
      case "green":
        return { bg: "#DCFCE7", text: "#15803D" };
      case "orange":
        return { bg: "#FFEDD5", text: "#C2410C" };
      case "blue":
        return { bg: "#DBEAFE", text: "#1D4ED8" };
      case "purple":
        return { bg: "#F3E8FF", text: "#7E22CE" };
      case "red":
        return { bg: "#FEE2E2", text: "#B91C1C" };
      case "gray":
      default:
        return { bg: "#F3F4F6", text: "#4B5563" };
    }
  };

  const styleConfig = getStyle();

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg }]}>
      <Text style={[styles.text, { color: styleConfig.text }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
  },
});
