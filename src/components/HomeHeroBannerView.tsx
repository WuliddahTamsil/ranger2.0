/**
 * HomeHeroBannerView.tsx
 * Full-Bleed Homepage Hero Banner Header Component for GEOVERSE
 * 
 * Layout Architecture (Super-app Modern Header):
 * <View style={styles.heroHeader}>
 *   <MediaBackground />    <-- Absolute 100% width/height background (Image / Video)
 *   <Overlay />            <-- Configurable color, opacity, and scrim gradient
 *   <SafeAreaView>
 *     <BrandRow />         <-- GEOVERSE branding & PGE Info Hub button
 *     <SearchRow />        <-- Search bar & Profile avatar
 *     <HeroContent />      <-- Dynamic badge, title, subtitle, CTA button, alignment
 *     <LocationPill />     <-- Customer delivery location pill
 *   </SafeAreaView>
 * </View>
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from "react-native";
import {
  Sparkles,
  MapPin,
  ChevronRight,
  Search,
  User as UserIcon,
  ArrowRight,
  Play,
  Pause,
} from "lucide-react-native";
import { HomeHeroBannerItem } from "../services/homeHeroService";
import { useVideoPlayer, VideoView } from "expo-video";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HeroNativeVideo: React.FC<{
  uri: string;
  poster?: string;
  paused: boolean;
}> = ({ uri, poster, paused }) => {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
};

export interface HomeHeroHeaderProps {
  banners: HomeHeroBannerItem[];
  loading?: boolean;
  customerLocation?: string;
  customerProfilePhoto?: string | null;
  unreadNotifCount?: number;
  onPressProfile?: () => void;
  onPressSearch?: () => void;
  onPressInfoHub?: () => void;
  onNavigateLocation?: () => void;
  onNavigate?: (route: string) => void;
  // Admin preview mode flag
  isPreview?: boolean;
  previewBannerOverride?: Partial<HomeHeroBannerItem>;
}

export const HomeHeroBannerView: React.FC<HomeHeroHeaderProps> = ({
  banners,
  loading = false,
  customerLocation,
  customerProfilePhoto,
  unreadNotifCount = 0,
  onPressProfile,
  onPressSearch,
  onPressInfoHub,
  onNavigateLocation,
  onNavigate,
  isPreview = false,
  previewBannerOverride,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoPausedMap, setVideoPausedMap] = useState<Record<string, boolean>>({});
  const [mediaErrorMap, setMediaErrorMap] = useState<Record<string, boolean>>({});

  // If in preview mode with an override, use the override banner
  const effectiveBanners: HomeHeroBannerItem[] = isPreview && previewBannerOverride
    ? [
        {
          _id: "preview_hero",
          title: previewBannerOverride.title || "Judul Banner Promosi",
          subtitle: previewBannerOverride.subtitle || "Subjudul penjelas promosi di Beranda Customer",
          badgeText: previewBannerOverride.badgeText || "PROMO",
          mediaType: previewBannerOverride.mediaType || "IMAGE",
          mediaUrl: previewBannerOverride.mediaUrl || "",
          thumbnailUrl: previewBannerOverride.thumbnailUrl || "",
          ctaLabel: previewBannerOverride.ctaLabel || "Lihat Promo",
          ctaAction: previewBannerOverride.ctaAction || "NAVIGATE",
          ctaTarget: previewBannerOverride.ctaTarget || "c_shop_home",
          placement: "CUSTOMER_HOME_HERO",
          isActive: true,
          sortOrder: 0,
          overlayEnabled: previewBannerOverride.overlayEnabled !== false,
          overlayColor: previewBannerOverride.overlayColor || "#064E3B",
          overlayOpacity:
            previewBannerOverride.overlayOpacity !== undefined
              ? previewBannerOverride.overlayOpacity
              : 0.35,
          textColor: previewBannerOverride.textColor || "#FFFFFF",
          contentAlignment: previewBannerOverride.contentAlignment || "LEFT",
        },
      ]
    : banners;

  const hasBanners = Array.isArray(effectiveBanners) && effectiveBanners.length > 0;
  const currentBanner = hasBanners ? effectiveBanners[activeIndex] || effectiveBanners[0] : null;

  // Handle CTA Navigation safely
  const handleCtaPress = (banner: HomeHeroBannerItem) => {
    if (isPreview) return; // Prevent navigation in preview mode
    if (!banner.ctaAction || banner.ctaAction === "NONE" || !banner.ctaTarget) return;

    if (banner.ctaAction === "NAVIGATE") {
      if (onNavigate && typeof onNavigate === "function") {
        try {
          onNavigate(banner.ctaTarget.trim());
        } catch (err) {
          console.warn("Hero CTA navigation error:", err);
        }
      }
    } else if (banner.ctaAction === "OPEN_URL") {
      const url = banner.ctaTarget.trim();
      if (/^https?:\/\//i.test(url)) {
        Linking.openURL(url).catch((err) => console.warn("Failed to open CTA URL:", err));
      }
    }
  };

  // Check media validity
  const currentMediaUrl = currentBanner?.mediaUrl || "";
  const isVideo = currentBanner?.mediaType === "VIDEO";
  const isMediaError = Boolean(currentBanner && mediaErrorMap[currentBanner._id]);
  const isPaused = Boolean(currentBanner && videoPausedMap[currentBanner._id]);

  // Visual overlay styling
  const overlayEnabled = currentBanner?.overlayEnabled !== false;
  const overlayColor = currentBanner?.overlayColor || "#064E3B";
  const overlayOpacity =
    currentBanner?.overlayOpacity !== undefined ? currentBanner.overlayOpacity : 0.35;
  const textColor = currentBanner?.textColor || "#FFFFFF";
  const alignment = currentBanner?.contentAlignment || "LEFT";

  const alignStyle = {
    alignItems:
      alignment === "CENTER"
        ? ("center" as const)
        : alignment === "RIGHT"
        ? ("flex-end" as const)
        : ("flex-start" as const),
    textAlign:
      alignment === "CENTER"
        ? ("center" as const)
        : alignment === "RIGHT"
        ? ("right" as const)
        : ("left" as const),
  };

  return (
    <View style={styles.heroHeader}>
      {/* ============================================================ */}
      {/* 1. MEDIA BACKGROUND (Full-bleed absolute) */}
      {/* ============================================================ */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {hasBanners && !isMediaError && currentMediaUrl ? (
          isVideo ? (
            Platform.OS === "web" ? (
              <video
                src={currentMediaUrl}
                poster={currentBanner?.thumbnailUrl || undefined}
                autoPlay={!isPaused}
                muted
                loop
                playsInline
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={() =>
                  currentBanner &&
                  setMediaErrorMap((prev) => ({ ...prev, [currentBanner._id]: true }))
                }
              />
            ) : (
              <HeroNativeVideo
                uri={currentMediaUrl}
                poster={currentBanner?.thumbnailUrl}
                paused={isPaused}
              />
            )
          ) : (
            <Image
              source={{ uri: currentMediaUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() =>
                currentBanner &&
                setMediaErrorMap((prev) => ({ ...prev, [currentBanner._id]: true }))
              }
            />
          )
        ) : (
          // Fallback classic GEOVERSE green background with subtle decorative circles
          <View style={styles.fallbackBgContainer}>
            <View style={styles.headerDecoCircle1} />
            <View style={styles.headerDecoCircle2} />
          </View>
        )}
      </View>

      {/* ============================================================ */}
      {/* 2. OVERLAY & READABILITY SCRIM */}
      {/* ============================================================ */}
      {overlayEnabled && hasBanners && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: overlayColor,
              opacity: overlayOpacity,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Subtle permanent dark gradient scrim (top & bottom) for logo & text legibility */}
      {hasBanners && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.topScrim} />
          <View style={styles.bottomScrim} />
        </View>
      )}

      {/* ============================================================ */}
      {/* 3. HEADER CONTENT (BrandRow, SearchRow, HeroContent, LocationPill) */}
      {/* ============================================================ */}
      <View style={styles.headerInnerContent}>
        {/* ROW 1: Official Branding & PGE Info Hub Button */}
        <View style={styles.headerBrandRow}>
          <View style={styles.headerBrandLeft}>
            <View style={styles.headerBrandLogoContainer}>
              <Image
                source={require("../../assets/geoverse-pge-official.png")}
                style={styles.headerBrandLogo}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.headerBrandTitle}>GEOVERSE</Text>
              <Text style={styles.headerBrandSubtitle}>PGE Area Kamojang</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerInfoHubBtn}
            onPress={onPressInfoHub}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Buka PGE Info Hub"
          >
            <Sparkles size={13} color="#0D7A53" />
            <Text style={styles.headerInfoHubBtnText}>PGE Info Hub</Text>
          </TouchableOpacity>
        </View>

        {/* ROW 2: Search Bar & Profile Avatar */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerSearchBar}
            onPress={onPressSearch}
            activeOpacity={0.9}
            accessibilityRole="search"
            accessibilityLabel="Cari kuliner, mart, laundry, ojek"
          >
            <Search size={18} color="#0D7A53" />
            <Text style={styles.headerSearchPlaceholder} numberOfLines={1}>
              Cari kuliner, mart, laundry, ojek...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerProfileBtn}
            onPress={onPressProfile}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Profil Saya"
          >
            {customerProfilePhoto ? (
              <Image source={{ uri: customerProfilePhoto }} style={styles.headerProfileImg} />
            ) : (
              <UserIcon size={20} color="#FFFFFF" />
            )}
            {unreadNotifCount > 0 && <View style={styles.headerProfileDot} />}
          </TouchableOpacity>
        </View>

        {/* ROW 3: Dynamic Hero Content or Classic Fallback */}
        <View style={styles.heroContentArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingText}>Memuat rekomendasi Beranda...</Text>
            </View>
          ) : hasBanners && currentBanner ? (
            // DYNAMIC CMS HERO CONTENT
            <View style={[styles.bannerContentCol, { alignItems: alignStyle.alignItems }]}>
              {/* Badge Text */}
              {Boolean(currentBanner.badgeText) && (
                <View style={styles.headerChip}>
                  <Sparkles size={11} color={textColor} />
                  <Text style={[styles.headerChipText, { color: textColor }]}>
                    {currentBanner.badgeText}
                  </Text>
                </View>
              )}

              {/* Title */}
              <Text
                style={[
                  styles.headerHeroTitle,
                  {
                    color: textColor,
                    textAlign: alignStyle.textAlign,
                  },
                ]}
                numberOfLines={2}
              >
                {currentBanner.title}
              </Text>

              {/* Subtitle */}
              {Boolean(currentBanner.subtitle) && (
                <Text
                  style={[
                    styles.headerHeroSubtitle,
                    {
                      color: textColor,
                      textAlign: alignStyle.textAlign,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {currentBanner.subtitle}
                </Text>
              )}

              {/* CTA Button & Video Pause/Play controls */}
              <View style={styles.ctaRow}>
                {Boolean(currentBanner.ctaAction !== "NONE" && currentBanner.ctaLabel) && (
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => handleCtaPress(currentBanner)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={currentBanner.ctaLabel}
                  >
                    <Text style={styles.ctaButtonText}>{currentBanner.ctaLabel}</Text>
                    <ArrowRight size={13} color="#0D7A53" strokeWidth={2.5} />
                  </TouchableOpacity>
                )}

                {/* Video Play/Pause toggle if Video */}
                {isVideo && (
                  <TouchableOpacity
                    style={styles.videoControlBtn}
                    onPress={() =>
                      currentBanner &&
                      setVideoPausedMap((prev) => ({
                        ...prev,
                        [currentBanner._id]: !prev[currentBanner._id],
                      }))
                    }
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={isPaused ? "Putar video" : "Jeda video"}
                  >
                    {isPaused ? <Play size={12} color="#FFFFFF" /> : <Pause size={12} color="#FFFFFF" />}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            // FALLBACK CLASSIC GEOVERSE HERO
            <View style={styles.fallbackContentCol}>
              <View style={styles.headerChip}>
                <Sparkles size={10} color="#DDF4E7" />
                <Text style={styles.headerChipText}>Fresh & Fast</Text>
              </View>
              <Text style={styles.headerHeroTitle}>
                Pilihan Tepat{"\n"}buat semua kebutuhan
              </Text>
              <View style={styles.headerTagRow}>
                <View style={styles.headerTagPill}>
                  <Text style={styles.headerTagText}>Gratis antar</Text>
                </View>
                <View style={styles.headerTagPill}>
                  <Text style={styles.headerTagText}>Siap 24 jam</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Carousel Pagination Dots (if multi-banner) */}
        {hasBanners && effectiveBanners.length > 1 && (
          <View style={styles.paginationRow}>
            {effectiveBanners.map((bannerItem, dotIdx) => (
              <TouchableOpacity
                key={bannerItem._id || dotIdx}
                onPress={() => setActiveIndex(dotIdx)}
                activeOpacity={0.7}
                style={[
                  styles.dot,
                  dotIdx === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}

        {/* ROW 4: Location Pill */}
        <TouchableOpacity
          style={styles.headerLocationPill}
          onPress={onNavigateLocation}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Ubah alamat pengiriman"
        >
          <MapPin size={11} color="#DDF4E7" />
          <Text style={styles.headerLocationText} numberOfLines={1}>
            {customerLocation || "Jl. Kamojang No. 14, Garut"}
          </Text>
          <ChevronRight size={11} color="#DDF4E7" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main full-bleed hero header
  heroHeader: {
    width: "100%",
    minHeight: 280,
    backgroundColor: "#0D7A53",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: "relative",
    overflow: "hidden",
  },

  // Fallback background decoration
  fallbackBgContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0D7A53",
  },
  headerDecoCircle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -50,
    right: -40,
  },
  headerDecoCircle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -30,
    left: -20,
  },

  // Gradient scrims for high readability
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  bottomScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "rgba(0,0,0,0.40)",
  },

  // Safe area content container
  headerInnerContent: {
    paddingTop: Platform.OS === "ios" ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 280,
    zIndex: 2,
  },

  // Row 1: Brand
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerBrandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBrandLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  headerBrandLogo: {
    width: 28,
    height: 28,
  },
  headerBrandTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerBrandSubtitle: {
    fontSize: 10,
    color: "#E2F6EA",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerInfoHubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FDFDFD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerInfoHubBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Row 2: Search & Profile
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerSearchPlaceholder: {
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  headerProfileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerProfileImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerProfileDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  // Row 3: Hero Content Area
  heroContentArea: {
    marginVertical: 4,
    minHeight: 90,
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },

  // Dynamic Content Styles
  bannerContentCol: {
    width: "100%",
  },
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  headerChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerHeroTitle: {
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 27,
    letterSpacing: -0.3,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  headerHeroSubtitle: {
    fontSize: 12,
    lineHeight: 16.5,
    fontWeight: "500",
    marginTop: 4,
    color: "rgba(255,255,255,0.92)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  videoControlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Fallback Content Styles
  fallbackContentCol: {
    alignItems: "flex-start",
  },
  headerTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  headerTagPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  headerTagText: {
    fontSize: 11,
    color: "#DDF4E7",
    fontWeight: "600",
  },

  // Carousel Dots
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: 4,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 16,
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  // Row 4: Location Pill
  headerLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  headerLocationText: {
    fontSize: 11.5,
    color: "#FFFFFF",
    fontWeight: "600",
    maxWidth: 260,
  },
});
