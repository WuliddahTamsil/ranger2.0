import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Nav } from "../../types";

const SLIDES = [
  {
    title: "Belanja Lokal, Dukung UMKM",
    desc: "Jelajahi aneka produk berkualitas dari para pelaku UMKM lokal dan jadilah bagian dari pertumbuhan ekonomi masyarakat.",
    icon: "🛒",
  },
  {
    title: "Semua Layanan\ndi Satu Tempat",
    desc: "Marketplace, catering, laundry, dan kos tersedia dalam satu aplikasi. Praktis dan mudah!",
    icon: "🍱",
  },
  {
    title: "Bergabung &\nBerpenghasilan",
    desc: "Daftar sebagai driver atau mitra Rangers App 2.0 dan mulai berpenghasilan dari komunitas Anda sendiri.",
    icon: "🚴",
  },
];

export const OnboardingScreen: React.FC<Nav> = ({ navigate }) => {
  const [slide, setSlide] = useState(0);
  const currentSlide = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={() => navigate("login")} activeOpacity={0.7}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{currentSlide.icon}</Text>
        </View>
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.desc}>{currentSlide.desc}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === slide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => (isLast ? navigate("login") : setSlide(slide + 1))}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLast ? "Mulai Sekarang" : "Lanjut"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconText: {
    fontSize: 64,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 28,
    paddingHorizontal: 4,
  },
  desc: {
    fontSize: 13.5,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#1B7A4E",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#E5E7EB",
  },
  button: {
    backgroundColor: "#1B7A4E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
