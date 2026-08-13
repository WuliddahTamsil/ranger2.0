import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Nav } from "../../types";

export const SplashScreen: React.FC<Nav> = ({ navigate }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("onboarding");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>R</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Rangers App</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>2.0</Text>
          </View>
          <Text style={styles.subtitle}>by PGE Kamojang</Text>
        </View>
      </View>
      <Text style={styles.tagline}>Untuk Komunitas, Dari Komunitas</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    color: "#A7F3D0",
    fontSize: 14,
    fontWeight: "600",
  },
  tagline: {
    color: "#A7F3D0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
});
