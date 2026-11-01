import React, { useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowRight, Users } from "lucide-react-native";
import { Nav, Screen } from "../../types";
import { OnboardingVisual, OnboardingVisualKind } from "./components/OnboardingVisual";
import { authColors } from "./authStyles";
import { clamp } from "../../utils/responsive";

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
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isShort = height < 680;
  const isVeryShort = height < 600;
  const isNarrow = width < 360;

  // Responsive visual sizing
  const visualHeight = clamp(Math.round(height * (isVeryShort ? 0.20 : (isShort ? 0.23 : 0.27))), 120, 220);
  const titleFontSize = isVeryShort ? 19 : (isShort ? 22 : 26);
  const titleLineHeight = isVeryShort ? 25 : (isShort ? 28 : 33);
  const descFontSize = isVeryShort ? 12.5 : 14;
  const descLineHeight = isVeryShort ? 18 : 22;

  const finishOnboarding = async (targetScreen: Screen = "c_home", params?: Record<string, any>) => {
    try {
      await AsyncStorage.setItem("@geoverse_onboarding_completed", "true");
    } catch {}
    navigate(targetScreen, params);
  };

  const next = () => {
    if (isLast) {
      void finishOnboarding("c_home");
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
        <TouchableOpacity onPress={() => void finishOnboarding("c_home")} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: Math.max(height - (insets.top + (isShort ? 45 : 60)), 380) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Main Content */}
        <View style={[styles.content, isShort && { paddingVertical: 8 }]}>
          <View style={[styles.visualFrame, { height: visualHeight, marginBottom: isShort ? 14 : 28 }]}>
            <OnboardingVisual kind={currentSlide.visual} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
              {currentSlide.title}
            </Text>
            <Text style={[styles.desc, { fontSize: descFontSize, lineHeight: descLineHeight }]}>
              {currentSlide.desc}
            </Text>
          </View>
        </View>

        {/* Bottom Footer */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, isShort ? 14 : 28),
              paddingTop: isShort ? 8 : 12,
            },
          ]}
        >
          <View
            style={[styles.pagination, isShort && { marginBottom: 12 }]}
            accessibilityLabel={`Halaman ${slide + 1} dari ${SLIDES.length}`}
          >
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

          {isLast ? (
            <View style={styles.lastSlideActions}>
              <Pressable
                onPress={() => void finishOnboarding("c_home")}
                style={({ pressed }) => [styles.button, isShort && styles.buttonCompact, pressed && styles.buttonPressed]}
              >
                <Text style={[styles.buttonText, isNarrow && { fontSize: 13.5 }]} numberOfLines={1}>
                  Mulai Jelajahi Aplikasi
                </Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </Pressable>

              <TouchableOpacity
                onPress={() => void finishOnboarding("auth_register_role", { roleTab: "partner" })}
                activeOpacity={0.8}
                style={[styles.partnerOutlineBtn, isShort && styles.partnerOutlineBtnCompact]}
              >
                <Users size={16} color={authColors.primary} />
                <Text style={[styles.partnerOutlineBtnText, isNarrow && { fontSize: 13 }]} numberOfLines={1}>
                  Daftar Mitra Usaha / Driver
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigate("login")}
                activeOpacity={0.7}
                style={[styles.loginLinkWrap, isShort && { marginTop: 2 }]}
              >
                <Text style={styles.loginLinkText}>
                  Sudah memiliki akun? <Text style={styles.loginLinkBold}>Masuk di sini</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Pressable
              onPress={next}
              style={({ pressed }) => [styles.button, isShort && styles.buttonCompact, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>Lanjutkan</Text>
              <ArrowRight size={17} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
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
    maxWidth: 360,
    alignSelf: "center",
    justifyContent: "center",
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
  buttonCompact: {
    minHeight: 44,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  lastSlideActions: {
    width: "100%",
    gap: 8,
    alignItems: "center",
  },
  partnerOutlineBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: authColors.primary,
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  partnerOutlineBtnCompact: {
    minHeight: 42,
  },
  partnerOutlineBtnText: {
    color: authColors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  loginLinkWrap: {
    marginTop: 6,
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
