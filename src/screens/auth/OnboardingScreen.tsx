import React, { useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight } from "lucide-react-native";
import { Nav } from "../../types";
import { OnboardingVisual, OnboardingVisualKind } from "./components/OnboardingVisual";
import { authColors } from "./authStyles";

const SLIDES: Array<{ title: string; desc: string; visual: OnboardingVisualKind }> = [
  {
    title: "Belanja Lokal,\nDukung UMKM Kamojang",
    desc: "Jelajahi aneka produk berkualitas dari para pelaku UMKM lokal dan jadilah bagian dari pertumbuhan ekonomi masyarakat.",
    visual: "local",
  },
  {
    title: "Semua Layanan Komunitas\ndalam Satu Platform",
    desc: "Kanyaah Ride, Send, Katering, Laundry, Kos/Homestay, dan Bank Sampah terintegrasi secara praktis dan transparan.",
    visual: "ecosystem",
  },
  {
    title: "Tumbuh Bersama\nEkosistem GEOVERSE 2.0",
    desc: "Daftar sebagai driver atau mitra usaha lokal binaan untuk memperluas jangkauan dan meningkatkan penghasilan Anda.",
    visual: "mobility",
  },
];

export const OnboardingScreen: React.FC<Nav> = ({ navigate }) => {
  const [slide, setSlide] = useState(0);
  const currentSlide = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@geoverse_onboarding_completed", "true");
    } catch {}
    navigate("c_home");
  };

  const next = () => {
    if (isLast) {
      void finishOnboarding();
    } else {
      setSlide((current) => current + 1);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Top Action */}
      <View style={styles.topBar}>
        <View style={styles.pgeBadge}>
          <Text style={styles.pgeBadgeText}>GEOVERSE 2.0 • PGE KAMOJANG</Text>
        </View>
        <TouchableOpacity onPress={() => void finishOnboarding()} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.visualFrame}>
          <OnboardingVisual kind={currentSlide.visual} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.desc}>{currentSlide.desc}</Text>
        </View>
      </View>

      {/* Bottom Footer */}
      <View style={styles.footer}>
        <View style={styles.pagination} accessibilityLabel={`Halaman ${slide + 1} dari ${SLIDES.length}`}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === slide ? styles.indicatorActive : styles.indicatorInactive,
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{isLast ? "Mulai Jelajahi" : "Lanjutkan"}</Text>
          <ArrowRight size={17} color="#FFFFFF" />
        </Pressable>
        {isLast && (
          <TouchableOpacity
            onPress={() => navigate("login")}
            activeOpacity={0.7}
            style={styles.loginLinkWrap}
          >
            <Text style={styles.loginLinkText}>
              Sudah memiliki akun? <Text style={styles.loginLinkBold}>Masuk di sini</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pgeBadge: {
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pgeBadgeText: {
    color: authColors.primaryDark,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    color: authColors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  visualFrame: {
    width: "100%",
    height: 220,
    maxWidth: 360,
    alignSelf: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  copy: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    alignItems: "center",
  },
  title: {
    color: authColors.ink,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: "center",
  },
  desc: {
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 440,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    alignItems: "center",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 10,
    marginBottom: 20,
  },
  indicator: {
    height: 4,
    borderRadius: 2,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: authColors.primary,
  },
  indicatorInactive: {
    width: 6,
    backgroundColor: authColors.line,
  },
  button: {
    width: "100%",
    backgroundColor: authColors.primary,
    minHeight: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.22)",
      } as any,
      default: {
        shadowColor: "#059669",
        shadowOpacity: 0.22,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
    }),
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  loginLinkWrap: {
    marginTop: 14,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  loginLinkText: {
    fontSize: 13,
    color: authColors.muted,
  },
  loginLinkBold: {
    color: authColors.primary,
    fontWeight: "700",
  },
});
