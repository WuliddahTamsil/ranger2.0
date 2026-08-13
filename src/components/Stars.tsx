import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";

interface StarsProps {
  rating: number;
  size?: number;
}

export const Stars: React.FC<StarsProps> = ({ rating, size = 12 }) => {
  return (
    <View style={styles.container}>
      <Star size={size} color="#F59E0B" fill="#F59E0B" />
      <Text style={styles.text}>{rating}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
});
