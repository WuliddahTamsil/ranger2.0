/**
 * HomeHeroBannerView.tsx
 * Homepage Hero Component for GEOVERSE
 *
 * Architecture:
 * 1. GreenHeader: Solid brand green background with safe area, official logo,
 *    PGE Info Hub button, and rounded white search bar + profile button.
 * 2. VideoHeroCard: Separate floating card below GreenHeader with 16:9 aspect ratio,
 *    16px border radius, autoplay loop muted video with small play/pause toggle.
 *    Clean and clear without promotional text or dark overlays.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import {
  Sparkles,
  Search,
  Star,
  User as UserIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { HomeHeroBannerItem } from "../services/homeHeroService";
import { useVideoPlayer, VideoView } from "expo-video";

const HeroNativeVideo: React.FC<{
  uri: string;
  poster?: string;
  paused: boolean;
  muted: boolean;
}> = ({ uri, poster, paused, muted }) => {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = muted;
    videoPlayer.volume = 1.0;
    videoPlayer.play();
  });

  useEffect(() => {
    player.muted = muted;
    if (!muted) {
      player.volume = 1.0;
    }
  }, [muted, player]);

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
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
  const [isMuted, setIsMuted] = useState(true);
  const webVideoRef = useRef<any>(null);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (webVideoRef.current) {
        webVideoRef.current.muted = nextMuted;
        if (!nextMuted) {
          webVideoRef.current.volume = 1.0;
          webVideoRef.current.play().catch(() => {});
        }
      }
      return nextMuted;
    });
  };

  // If in preview mode with an override, use the override banner
  const effectiveBanners: HomeHeroBannerItem[] =
    isPreview && previewBannerOverride
      ? [
          {
            _id: "preview_hero",
            title: previewBannerOverride.title || "Judul Banner Promosi",
            subtitle: previewBannerOverride.subtitle || "",
            badgeText: previewBannerOverride.badgeText || "",
            mediaType: previewBannerOverride.mediaType || "VIDEO",
            mediaUrl: previewBannerOverride.mediaUrl || "",
            thumbnailUrl: previewBannerOverride.thumbnailUrl || "",
            ctaLabel: "",
            ctaAction: "NONE",
            ctaTarget: "",
            placement: "CUSTOMER_HOME_HERO",
            isActive: true,
            sortOrder: 0,
            overlayEnabled: false,
            overlayColor: "transparent",
            overlayOpacity: 0,
            textColor: "#FFFFFF",
            contentAlignment: "LEFT",
          },
        ]
      : banners;

  const hasBanners = Array.isArray(effectiveBanners) && effectiveBanners.length > 0;
  const currentBanner = hasBanners
    ? effectiveBanners[activeIndex] || effectiveBanners[0]
    : null;

  // Auto-cycle through multiple media if more than one banner exists
  useEffect(() => {
    if (isPreview || effectiveBanners.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex((index) => (index + 1) % effectiveBanners.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [effectiveBanners.length, isPreview]);

  useEffect(() => {
    if (activeIndex >= effectiveBanners.length && effectiveBanners.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, effectiveBanners.length]);

  const currentMediaUrl = currentBanner?.mediaUrl || "";
  const isVideo = currentBanner?.mediaType === "VIDEO";
  const isMediaError = Boolean(currentBanner && mediaErrorMap[currentBanner._id]);
  const isPaused = Boolean(currentBanner && videoPausedMap[currentBanner._id]);

  return (
    <View style={styles.container}>
      {/* ============================================================ */}
      {/* 1. GREEN HEADER (Branding & Search inside Solid Green)       */}
      {/* ============================================================ */}
      <View style={styles.greenHeader}>
        {/* Subtle decorative circles for modern premium finish */}
        <View style={styles.headerDecoCircle1} pointerEvents="none" />
        <View style={styles.headerDecoCircle2} pointerEvents="none" />

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

        {/* ROW 2: White Search Bar & Profile Avatar with ample breathing space */}
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
              <Image
                source={{ uri: customerProfilePhoto }}
                style={styles.headerProfileImg}
              />
            ) : (
              <UserIcon size={20} color="#FFFFFF" />
            )}
            {unreadNotifCount > 0 && <View style={styles.headerProfileDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. VIDEO HERO CARD (Clean separate card below GreenHeader)   */}
      {/* ============================================================ */}
      {hasBanners && !isMediaError && currentMediaUrl ? (
        <View style={styles.videoCardWrapper}>
          <View style={styles.videoHeroCard}>
            {isVideo ? (
              Platform.OS === "web" ? (
                <video
                  ref={(el: any) => {
                    webVideoRef.current = el;
                    if (el) {
                      el.muted = isMuted;
                      if (!isPaused) el.play().catch(() => {});
                    }
                  }}
                  src={currentMediaUrl}
                  poster={currentBanner?.thumbnailUrl || undefined}
                  autoPlay={!isPaused}
                  muted={isMuted}
                  loop
                  playsInline
                  preload="auto"
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
                    setMediaErrorMap((prev) => ({
                      ...prev,
                      [currentBanner._id]: true,
                    }))
                  }
                />
              ) : (
                <HeroNativeVideo
                  key={currentBanner?._id || currentMediaUrl}
                  uri={currentMediaUrl}
                  poster={currentBanner?.thumbnailUrl}
                  paused={isPaused}
                  muted={isMuted}
                />
              )
            ) : (
              <Image
                source={{ uri: currentMediaUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onError={() =>
                  currentBanner &&
                  setMediaErrorMap((prev) => ({
                    ...prev,
                    [currentBanner._id]: true,
                  }))
                }
              />
            )}

            {/* Unmute badge on top-left of video */}
            {isVideo && isMuted && (
              <TouchableOpacity
                style={styles.unmuteBadge}
                onPress={toggleMute}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Aktifkan suara video"
              >
                <VolumeX size={12} color="#FFFFFF" />
                <Text style={styles.unmuteBadgeText}>Ketuk untuk suara</Text>
              </TouchableOpacity>
            )}

            {/* Control buttons cluster on bottom-right of video (Sound + Play/Pause) */}
            {isVideo && currentBanner && (
              <View style={styles.videoControlsCluster}>
                <TouchableOpacity
                  style={styles.videoControlBtn}
                  onPress={toggleMute}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={isMuted ? "Aktifkan suara video" : "Bisukan suara video"}
                >
                  {isMuted ? (
                    <VolumeX size={13} color="#FFFFFF" />
                  ) : (
                    <Volume2 size={13} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

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
                  {isPaused ? (
                    <Play size={12} color="#FFFFFF" />
                  ) : (
                    <Pause size={12} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Small subtle pagination dots if multiple media exist */}
            {effectiveBanners.length > 1 && (
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
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "transparent",
  },

  // 1. Solid Green Header
  greenHeader: {
    width: "100%",
    backgroundColor: "#0D7A53",
    paddingTop:
      Platform.OS === "ios"
        ? 48
        : Platform.OS === "web"
        ? 20
        : StatusBar.currentHeight
        ? StatusBar.currentHeight + 10
        : 24,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: "relative",
    overflow: "hidden",
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

  // Row 1: Brand
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
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
  },
  headerBrandSubtitle: {
    fontSize: 10,
    color: "#E2F6EA",
    fontWeight: "600",
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

  // Row 2: Search & Profile with comfortable spacing
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  // 2. Separate Video Hero Card
  videoCardWrapper: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  videoHeroCard: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  unmuteBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    zIndex: 5,
  },
  unmuteBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  videoControlsCluster: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 5,
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
  paginationRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 4,
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
    backgroundColor: "rgba(255,255,255,0.45)",
  },
});
