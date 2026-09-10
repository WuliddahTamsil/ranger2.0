import React, { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Nav } from "../../types";
import { OnboardingVisual, OnboardingVisualKind } from "./components/OnboardingVisual";

const SLIDES: Array<{ title: string; desc: string; visual: OnboardingVisualKind }> = [
  {
    title: "Belanja Lokal, Dukung UMKM",
    desc: "Jelajahi aneka produk berkualitas dari para pelaku UMKM lokal dan jadilah bagian dari pertumbuhan ekonomi masyarakat.",
    visual: "local",
  },
  {
    title: "Semua Layanan\ndi Satu Tempat",
    desc: "Marketplace, catering, laundry, dan kos tersedia dalam satu aplikasi. Praktis dan mudah!",
    visual: "ecosystem",
  },
  {
    title: "Bergabung &\nBerpenghasilan",
    desc: "Daftar sebagai driver atau mitra GEOVERSE 2.0 dan mulai berpenghasilan dari komunitas Anda sendiri.",
    visual: "mobility",
  },
];

export const OnboardingScreen: React.FC<Nav> = ({ navigate }) => {
  const [slide, setSlide] = useState(0);
  const currentSlide = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const next = () => {
    if (isLast) navigate("login");
    else setSlide((current) => current + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundArcTop} />
      <View pointerEvents="none" style={styles.backgroundArcBottom} />

      <View style={styles.topBar}>
        <View style={styles.miniBrand}>
          <View style={styles.miniMark}><Text style={styles.miniMarkText}>G</Text></View>
          <Text style={styles.miniBrandText}>GEOVERSE <Text style={styles.miniBrandVersion}>2.0</Text></Text>
        </View>
        <TouchableOpacity onPress={() => navigate("login")} activeOpacity={0.7}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.visualFrame}>
          <OnboardingVisual kind={currentSlide.visual} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.desc}>{currentSlide.desc}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination} accessibilityLabel={`Halaman ${slide + 1} dari ${SLIDES.length}`}>
          {SLIDES.map((_, index) => <View key={index} style={[styles.indicator, index === slide ? styles.indicatorActive : styles.indicatorInactive]} />)}
        </View>
        <Pressable onPress={next} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>{isLast ? "Mulai sekarang" : "Lanjut"} {"\u2192"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F8", overflow: "hidden" },
  backgroundArcTop: { position: "absolute", width: 330, height: 180, borderRadius: 180, borderWidth: 1, borderColor: "rgba(8, 122, 75, 0.055)", top: -108, right: -128, transform: [{ rotate: "-18deg" }] },
  backgroundArcBottom: { position: "absolute", width: 420, height: 220, borderRadius: 220, borderWidth: 1, borderColor: "rgba(20, 34, 56, 0.04)", bottom: -150, left: -168, transform: [{ rotate: "16deg" }] },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 12 },
  miniBrand: { flexDirection: "row", alignItems: "center" },
  miniMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#087A4B", alignItems: "center", justifyContent: "center", marginRight: 8 },
  miniMarkText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  miniBrandText: { color: "#142238", fontSize: 11, fontWeight: "800", letterSpacing: 1.05 },
  miniBrandVersion: { color: "#718096", fontWeight: "600" },
  skipText: { color: "#667085", fontSize: 13, fontWeight: "600" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  visualFrame: { width: "100%", height: 218, maxWidth: 360, alignSelf: "center", justifyContent: "center", marginBottom: 34 },
  copy: { width: "100%", maxWidth: 480, alignSelf: "center", alignItems: "center" },
  title: { color: "#142238", fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.55, marginBottom: 13, textAlign: "center" },
  desc: { color: "#667085", fontSize: 15, lineHeight: 23, maxWidth: 480, textAlign: "center" },
  footer: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 12, alignItems: "center" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 10, marginBottom: 21 },
  indicator: { height: 4, borderRadius: 2 },
  indicatorActive: { width: 24, backgroundColor: "#087A4B" },
  indicatorInactive: { width: 5, backgroundColor: "#CDD6D1" },
  button: { width: "100%", alignSelf: "stretch", backgroundColor: "#087A4B", minHeight: 52, borderRadius: 11, alignItems: "center", justifyContent: "center", shadowColor: "#075B3A", shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
});
