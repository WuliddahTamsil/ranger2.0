import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import {
  MapPin,
  Navigation,
  Store,
  Compass,
  RefreshCw,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Maximize2,
  Bike,
  User,
  Package,
} from "lucide-react-native";

export interface LiveOrderTrackingMapProps {
  storeName?: string;
  storeAddress?: string;
  customerAddress?: string;
  driverName?: string;
  driverVehicle?: string;
  orderStatus: string;
  height?: number;
  navigationMode?: "overview" | "store" | "customer";
  onNavigationModeChange?: (mode: "overview" | "store" | "customer") => void;
  showTurnInstructions?: boolean;
  currentLocationName?: string;
  onToggleFullscreen?: () => void;
  marketplaceMode?: boolean;
  orderType?: "Catering" | "Marketplace" | "Laundry" | "Kanyaah Ride" | "Kanyaah Send" | string;
  pickupCoordinates?: { latitude?: number; longitude?: number };
  destinationCoordinates?: { latitude?: number; longitude?: number };
  driverCoordinates?: { latitude?: number; longitude?: number };
  distance?: string;
  isNavigating?: boolean;
  onToggleNavigation?: (navigating: boolean) => void;
}

const InteractiveLiveOrderTrackingMap: React.FC<LiveOrderTrackingMapProps> = ({
  storeName,
  storeAddress,
  customerAddress,
  driverName = "Driver Rangers",
  driverVehicle = "Motor",
  orderStatus,
  height = 270,
  navigationMode,
  onNavigationModeChange,
  showTurnInstructions = true,
  currentLocationName,
  onToggleFullscreen,
  orderType,
  pickupCoordinates,
  destinationCoordinates,
  driverCoordinates,
  distance,
  isNavigating: isNavigatingProp,
  onToggleNavigation,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGuidanceExpanded, setIsGuidanceExpanded] = useState(false);
  const [internalNavigating, setInternalNavigating] = useState(false);
  const effectiveNavigating = isNavigatingProp !== undefined ? isNavigatingProp : internalNavigating;

  const toggleNavigation = (val: boolean) => {
    setInternalNavigating(val);
    if (onToggleNavigation) onToggleNavigation(val);
  };

  const [navProgress, setNavProgress] = useState(0.28);
  const [simulatedSpeed, setSimulatedSpeed] = useState(34);

  // Animate progress and speed variation when navigating
  useEffect(() => {
    if (!effectiveNavigating) return;
    const interval = setInterval(() => {
      setNavProgress((prev) => {
        if (prev >= 0.88) return 0.20;
        return Number((prev + 0.035).toFixed(3));
      });
      setSimulatedSpeed(Math.floor(28 + Math.random() * 12));
    }, 1300);
    return () => clearInterval(interval);
  }, [effectiveNavigating]);

  const isRide = orderType === "Kanyaah Ride";
  const isSend = orderType === "Kanyaah Send";
  const isCatering = orderType === "Catering";
  const isWaste = orderType === "Setor Sampah";

  // Status mapping
  const isHeadingToPickup =
    ["Menuju Pickup", "Sampai Pickup"].includes(orderStatus) ||
    (orderStatus === "Siap" && Boolean(driverName));
  const isDelivering = ["Diambil", "Mengantar", "Dikirim"].includes(orderStatus);

  // Default mode
  const defaultMode: "overview" | "store" | "customer" = isHeadingToPickup
    ? "store"
    : isDelivering
    ? "customer"
    : "overview";

  const [internalMode, setInternalMode] = useState<"overview" | "store" | "customer">(defaultMode);
  const activeMode = navigationMode || internalMode;

  const handleSelectMode = (mode: "overview" | "store" | "customer") => {
    setInternalMode(mode);
    if (onNavigationModeChange) {
      onNavigationModeChange(mode);
    }
    setMapLoaded(false);
    setRefreshKey((k) => k + 1);
  };

  // Marker coordinates on the map container (percentages)
  const markerPos = useMemo(() => {
    const p = effectiveNavigating ? navProgress : 0.35;
    if (activeMode === "customer") {
      const x = Math.min(84, Math.max(16, 26 + p * 54));
      const y = Math.min(78, Math.max(24, 52 - Math.sin(p * Math.PI) * 14));
      return { x, y };
    } else if (activeMode === "store") {
      const x = Math.min(84, Math.max(16, 22 + p * 56));
      const y = Math.min(78, Math.max(24, 48 + Math.sin(p * Math.PI) * 12));
      return { x, y };
    } else {
      const x = Math.min(80, Math.max(20, 34 + p * 38));
      const y = 50;
      return { x, y };
    }
  }, [activeMode, effectiveNavigating, navProgress]);

  // Helper to convert coordinate or text address to reliable Google Maps query
  const formatLocationQuery = (
    coord?: { latitude?: number; longitude?: number },
    addr?: string,
    name?: string,
    fallback: string = "Indonesia"
  ) => {
    if (
      coord &&
      typeof coord.latitude === "number" &&
      typeof coord.longitude === "number" &&
      !isNaN(coord.latitude) &&
      !isNaN(coord.longitude) &&
      (coord.latitude !== 0 || coord.longitude !== 0)
    ) {
      return `${coord.latitude},${coord.longitude}`;
    }
    const clean = [addr, name].filter(Boolean).join(", ").replace(/[#]/g, "").trim();
    return clean || fallback;
  };

  const pickupQuery = formatLocationQuery(
    pickupCoordinates,
    storeAddress,
    storeName,
    "Titik Penjemputan"
  );
  const destinationQuery = formatLocationQuery(
    destinationCoordinates,
    customerAddress,
    undefined,
    "Titik Tujuan"
  );
  const driverQuery = formatLocationQuery(
    driverCoordinates,
    currentLocationName,
    undefined,
    pickupQuery
  );

  // Google Maps embed URL
  const googleMapsUrl = useMemo(() => {
    if (activeMode === "store") {
      // Heading to pickup: if driver location known, route driver -> pickup; otherwise show pickup location pin directly
      const hasDriverCoord =
        driverCoordinates?.latitude &&
        driverCoordinates?.longitude &&
        driverCoordinates.latitude !== 0;
      if (hasDriverCoord) {
        return `https://maps.google.com/maps?saddr=${encodeURIComponent(driverQuery)}&daddr=${encodeURIComponent(pickupQuery)}&output=embed`;
      }
      return `https://maps.google.com/maps?q=${encodeURIComponent(pickupQuery)}&output=embed`;
    } else if (activeMode === "customer") {
      // Heading to bank sampah / destination
      return `https://maps.google.com/maps?saddr=${encodeURIComponent(pickupQuery)}&daddr=${encodeURIComponent(destinationQuery)}&output=embed`;
    } else {
      // Overview complete route
      return `https://maps.google.com/maps?saddr=${encodeURIComponent(pickupQuery)}&daddr=${encodeURIComponent(destinationQuery)}&output=embed`;
    }
  }, [activeMode, driverQuery, pickupQuery, destinationQuery, driverCoordinates]);

  // Clean labels for guidance display
  const effectivePickupName = isWaste
    ? (storeName || "Rumah Customer (Jemput Sampah)")
    : isRide
    ? "Titik Jemput Penumpang"
    : isSend
    ? "Titik Pengirim"
    : isCatering
    ? (storeName || "Dapur Catering")
    : storeName || "Toko / Mitra";

  const effectivePickupAddress = storeAddress || storeName || "Lokasi penjemputan";
  const effectiveDestAddress = customerAddress || "Lokasi tujuan";
  const pickupShort = effectivePickupAddress.split(",")[0] || "Lokasi Jemput";
  const destShort = effectiveDestAddress.split(",")[0] || "Lokasi Tujuan";

  // Guidance telemetry
  const guidanceData = useMemo(() => {
    if (activeMode === "store") {
      return {
        title: isWaste ? "Rute ke Customer (Jemput)" : isRide ? "Rute ke Penumpang" : isSend ? "Rute ke Pengirim" : isCatering ? "Rute ke Dapur Catering" : "Rute ke Toko",
        targetLabel: isWaste ? "Penjemputan Sampah" : isRide ? "Penjemputan" : isSend ? "Pengirim" : isCatering ? "Dapur Catering" : "Toko / Mitra",
        targetName: isWaste ? (storeName || "Rumah Customer") : effectivePickupName,
        targetAddress: effectivePickupAddress,
        distance: distance || "Menuju titik jemput",
        eta: "Sesuai rute",
        speed: "Navigasi Aktif",
        nextManeuver: isWaste ? `Menuju Rumah Customer (${pickupShort})` : `Menuju ${pickupShort}`,
        maneuverDistance: "Titik Jemput",
        maneuverIcon: isWaste ? "bike" : isRide ? "bike" : "right",
        steps: [
          {
            instruction: isWaste
              ? `Mulai perjalanan menuju rumah customer untuk menjemput sampah`
              : isRide
              ? `Mulai perjalanan menuju lokasi penjemputan penumpang`
              : isSend
              ? `Mulai perjalanan menuju lokasi pengirim paket`
              : isCatering
              ? `Mulai perjalanan menuju dapur catering untuk mengambil pesanan`
              : `Mulai perjalanan menuju ${effectivePickupName}`,
            distance: "Awal",
            type: "straight",
          },
          {
            instruction: `Ikuti rute tercepat ke ${pickupShort}`,
            distance: distance || "Dalam perjalanan",
            type: "right",
          },
          {
            instruction: isWaste
              ? `Tiba di rumah customer: ${effectivePickupAddress}`
              : isRide
              ? `Tiba di titik penjemputan: ${effectivePickupAddress}`
              : isSend
              ? `Tiba di lokasi pengirim: ${effectivePickupAddress}`
              : isCatering
              ? `Tiba di dapur catering: ${effectivePickupAddress}`
              : `Tiba di lokasi penjemputan: ${effectivePickupAddress}`,
            distance: "Tiba",
            type: "dest",
          },
        ],
      };
    } else if (activeMode === "customer") {
      return {
        title: isWaste ? "Rute ke Bank Sampah" : isRide ? "Rute ke Tujuan" : isSend ? "Rute ke Penerima" : isCatering ? "Rute ke Pemesan" : "Rute ke Customer",
        targetLabel: isWaste ? "Tujuan Bank Sampah" : isRide ? "Tujuan Penumpang" : isSend ? "Penerima" : isCatering ? "Pemesan Catering" : "Customer / Penerima",
        targetName: isWaste ? (customerAddress || "Bank Sampah") : isRide ? "Tujuan Penumpang" : isSend ? "Penerima Paket" : isCatering ? "Pemesan Catering" : "Pelanggan",
        targetAddress: effectiveDestAddress,
        distance: distance || "Menuju tujuan",
        eta: "Sesuai rute",
        speed: "Navigasi Aktif",
        nextManeuver: isWaste ? `Menuju Bank Sampah (${destShort})` : `Menuju ${destShort}`,
        maneuverDistance: "Tujuan Akhir",
        maneuverIcon: isWaste ? "store" : "straight",
        steps: [
          {
            instruction: isWaste
              ? `Bawa sampah daur ulang dari customer menuju Bank Sampah`
              : isRide
              ? `Berangkat bersama penumpang dari ${pickupShort}`
              : isSend
              ? `Bawa paket dari pengirim menuju alamat penerima`
              : isCatering
              ? `Bawa pesanan catering dari dapur menuju alamat pemesan`
              : `Bawa pesanan dari toko menuju alamat pengantaran`,
            distance: "Awal",
            type: "straight",
          },
          {
            instruction: `Ikuti jalur lintasan ke ${destShort}`,
            distance: distance || "Dalam perjalanan",
            type: "straight",
          },
          {
            instruction: isWaste
              ? `Tiba di Bank Sampah: ${effectiveDestAddress}`
              : isRide
              ? `Tiba di tujuan penumpang: ${effectiveDestAddress}`
              : isSend
              ? `Tiba di alamat penerima paket: ${effectiveDestAddress}`
              : isCatering
              ? `Tiba di alamat pemesan: ${effectiveDestAddress}`
              : `Tiba di alamat tujuan: ${effectiveDestAddress}`,
            distance: "Tiba",
            type: "dest",
          },
        ],
      };
    } else {
      return {
        title: "Semua Rute",
        targetLabel: isWaste ? "Rute Jemput Customer ➔ Antar Bank Sampah" : isRide ? "Rute Perjalanan Lengkap" : isSend ? "Rute Pengirim ➔ Penerima" : isCatering ? "Rute Dapur ➔ Pemesan" : "Pengantaran Lengkap",
        targetName: `${pickupShort} ➔ ${destShort}`,
        targetAddress: `${effectivePickupAddress} menuju ${effectiveDestAddress}`,
        distance: distance || "Rute Lengkap",
        eta: "Lintasan Peta",
        speed: "Navigasi Aktif",
        nextManeuver: isWaste ? `Jemput ${pickupShort} ➔ Antar ${destShort}` : `Perjalanan ${pickupShort} ke ${destShort}`,
        maneuverDistance: distance || "Jalur Lengkap",
        maneuverIcon: "compass",
        steps: [
          {
            instruction: isWaste ? `Titik Jemput Sampah (Customer): ${effectivePickupAddress}` : `Titik Jemput: ${effectivePickupAddress}`,
            distance: "Jemput",
            type: "store",
          },
          {
            instruction: `Lintasan perjalanan rute (${distance || "Jarak Tempuh"})`,
            distance: distance || "",
            type: "straight",
          },
          {
            instruction: isWaste ? `Titik Tujuan (Bank Sampah): ${effectiveDestAddress}` : `Titik Tujuan: ${effectiveDestAddress}`,
            distance: "Tujuan",
            type: "dest",
          },
        ],
      };
    }
  }, [
    activeMode,
    isWaste,
    isRide,
    isSend,
    effectivePickupName,
    effectivePickupAddress,
    effectiveDestAddress,
    pickupShort,
    destShort,
    distance,
  ]);

  const openExternalGoogleMaps = async () => {
    const dest = activeMode === "store" ? pickupQuery : destinationQuery;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Navigasi tidak tersedia", "Tidak dapat membuka aplikasi peta pada perangkat ini.");
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* 1. Map Container */}
      <View style={[styles.mapContainer, { height }]}>
        {Platform.OS === "web" ? (
          <iframe
            key={`${activeMode}-${refreshKey}`}
            title="Google Maps Navigasi"
            src={googleMapsUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            } as any}
            loading="lazy"
            onLoad={() => setMapLoaded(true)}
          />
        ) : (
          <View style={styles.nativeFallback}>
            <Compass size={36} color="#0D7A53" />
            <Text style={styles.fallbackTitle}>Google Maps Aktif</Text>
            <Text style={styles.fallbackSub}>
              {guidanceData.targetName} • {guidanceData.distance}
            </Text>
          </View>
        )}

        {/* Loading Overlay */}
        {!mapLoaded && Platform.OS === "web" && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="small" color="#0D7A53" />
            <Text style={styles.loaderText}>Memuat peta Google Maps...</Text>
          </View>
        )}

        {/* Live Tracking / Navigation Active Indicator */}
        {(orderStatus === "Menuju Pickup" ||
          orderStatus === "Mengantar" ||
          orderStatus === "Diambil" ||
          orderStatus === "Dikirim" ||
          orderStatus === "Sampai Pickup" ||
          effectiveNavigating) && (
          <View style={[styles.mapLiveBadge, effectiveNavigating && styles.mapLiveBadgeNavigating]}>
            <View style={[styles.mapLiveDot, effectiveNavigating && styles.mapLiveDotNavigating]} />
            <Text style={styles.mapLiveText}>
              {effectiveNavigating ? `NAVIGASI AKTIF • ${simulatedSpeed} KM/J` : "LIVE TRACKING AKTIF"}
            </Text>
          </View>
        )}

        {/* Driver Motorcycle Indicator Overlay - only shown when navigation is active */}
        {effectiveNavigating && (
          <View
            style={[
              styles.motorcycleMarkerOverlay,
              {
                left: `${Math.round(markerPos.x)}%`,
                top: `${Math.round(markerPos.y)}%`,
              },
            ]}
          >
            {/* Glowing Motorcycle Beacon */}
            <View style={[styles.motorcycleBeacon, styles.motorcycleBeaconNavigating]}>
              <Bike size={16} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Floating Navigation Active HUD */}
        {effectiveNavigating && (
          <View style={styles.mapBottomNavHud}>
            <View style={styles.navActiveHudBar}>
              <View style={styles.navActiveHudLeft}>
                <View style={styles.navPulseDotLive} />
                <Text style={styles.navActiveHudStatus}>NAVIGASI AKTIF</Text>
                <View style={styles.navSpeedPill}>
                  <Text style={styles.navActiveHudSpeed}>{simulatedSpeed} km/j</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.navStopBtn}
                onPress={() => toggleNavigation(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.navStopBtnText}>Hentikan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Floating Quick Action Icons */}
        <View style={styles.mapCornerActions}>
          <TouchableOpacity
            style={styles.cornerActionBtn}
            onPress={() => {
              setMapLoaded(false);
              setRefreshKey((k) => k + 1);
            }}
            activeOpacity={0.7}
          >
            <RefreshCw size={13} color="#0D7A53" />
          </TouchableOpacity>

          {onToggleFullscreen && (
            <TouchableOpacity
              style={styles.cornerActionBtn}
              onPress={onToggleFullscreen}
              activeOpacity={0.7}
            >
              <Maximize2 size={13} color="#0D7A53" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Route Segmented Control Tabs */}
      <View style={styles.routeSegmentedBar}>
        <TouchableOpacity
          style={[
            styles.segmentTab,
            activeMode === "store" ? styles.segmentTabActive : styles.segmentTabInactive,
          ]}
          onPress={() => handleSelectMode("store")}
          activeOpacity={0.8}
        >
          {isWaste ? (
            <User size={12} color={activeMode === "store" ? "#FFFFFF" : "#0D7A53"} />
          ) : isRide ? (
            <User size={12} color={activeMode === "store" ? "#FFFFFF" : "#0D7A53"} />
          ) : isSend ? (
            <Package size={12} color={activeMode === "store" ? "#FFFFFF" : "#0D7A53"} />
          ) : (
            <Store size={12} color={activeMode === "store" ? "#FFFFFF" : "#0D7A53"} />
          )}
          <Text
            style={[
              styles.segmentTabText,
              activeMode === "store" && styles.segmentTabTextActive,
            ]}
            numberOfLines={1}
          >
            {isWaste ? "Ke Customer" : isRide ? "Ke Penumpang" : isSend ? "Ke Pengirim" : isCatering ? "Ke Dapur" : "Ke Toko"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentTab,
            activeMode === "customer" ? styles.segmentTabActive : styles.segmentTabInactive,
          ]}
          onPress={() => handleSelectMode("customer")}
          activeOpacity={0.8}
        >
          {isWaste ? (
            <Store size={12} color={activeMode === "customer" ? "#FFFFFF" : "#0D7A53"} />
          ) : (
            <MapPin size={12} color={activeMode === "customer" ? "#FFFFFF" : "#0D7A53"} />
          )}
          <Text
            style={[
              styles.segmentTabText,
              activeMode === "customer" && styles.segmentTabTextActive,
            ]}
            numberOfLines={1}
          >
            {isWaste ? "Bank Sampah" : isRide ? "Ke Tujuan" : isSend ? "Ke Penerima" : isCatering ? "Ke Pemesan" : "Ke Customer"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentTab,
            activeMode === "overview" ? styles.segmentTabActive : styles.segmentTabInactive,
          ]}
          onPress={() => handleSelectMode("overview")}
          activeOpacity={0.8}
        >
          <Layers size={12} color={activeMode === "overview" ? "#FFFFFF" : "#0D7A53"} />
          <Text
            style={[
              styles.segmentTabText,
              activeMode === "overview" && styles.segmentTabTextActive,
            ]}
            numberOfLines={1}
          >
            Semua Rute
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Route Mode Explanation Hint */}
      <View style={styles.activeRouteHintBox}>
        <Compass size={12} color="#0D7A53" />
        <Text style={styles.activeRouteHintText} numberOfLines={1}>
          {isWaste
            ? activeMode === "store"
              ? "🏠 Rute Penjemputan: Menuju Rumah Customer"
              : activeMode === "customer"
              ? "🏛️ Rute Pengantaran: Menuju Bank Sampah"
              : "🗺️ Rute Lengkap: Rumah Customer ➔ Bank Sampah"
            : activeMode === "store"
            ? "Titik Penjemputan"
            : activeMode === "customer"
            ? "Titik Pengantaran"
            : "Rute Keseluruhan"}
        </Text>
      </View>

      {/* 2.5 Live Journey Track Progress Card */}
      {(isHeadingToPickup || isDelivering || effectiveNavigating) && (
        <View style={styles.journeyTrackCard}>
          <View style={styles.journeyTrackEndpoints}>
            <View style={styles.trackEndpointItem}>
              <MapPin size={12} color="#15803D" />
              <Text style={styles.trackEndpointText} numberOfLines={1}>
                {activeMode === "store" ? "Posisi Awal" : pickupShort}
              </Text>
            </View>
            <View style={[styles.trackEndpointItem, { alignItems: "flex-end" }]}>
              <MapPin size={12} color="#D97706" />
              <Text style={styles.trackEndpointText} numberOfLines={1}>
                {activeMode === "store" ? pickupShort : destShort}
              </Text>
            </View>
          </View>

          <View style={styles.trackLineContainer}>
            <View
              style={[
                styles.trackLineFill,
                { width: `${Math.round((effectiveNavigating ? navProgress : 0.35) * 100)}%` },
              ]}
            />
            <View
              style={[
                styles.trackBikeMarker,
                {
                  left: `${Math.min(90, Math.max(8, Math.round((effectiveNavigating ? navProgress : 0.35) * 100)))}%`,
                },
              ]}
            >
              <View style={[styles.trackBikeCircle, effectiveNavigating && styles.trackBikeCircleNavigating]}>
                <Bike size={13} color="#FFFFFF" />
              </View>
              {effectiveNavigating && <View style={styles.trackBikePulse} />}
            </View>
          </View>

          <View style={styles.trackFooterRow}>
            <Text style={styles.trackStatusHint}>
              {effectiveNavigating
                ? `🏍️ Motor driver sedang menuju ${activeMode === "store" ? "penjemputan" : "customer"} (${simulatedSpeed} km/j)`
                : `Klik "Start Navigation" untuk memulai panduan rute & pelacakan motor`}
            </Text>
            <TouchableOpacity
              style={[
                styles.trackToggleMiniBtn,
                effectiveNavigating && styles.trackToggleMiniBtnNavigating,
              ]}
              onPress={() => toggleNavigation(!effectiveNavigating)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.trackToggleMiniBtnText,
                  effectiveNavigating && styles.trackToggleMiniBtnNavigatingText,
                ]}
              >
                {effectiveNavigating ? "Jeda" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Next Turn Maneuver Card */}
      <View style={styles.maneuverCard}>
        <View style={styles.maneuverIconBox}>
          {guidanceData.maneuverIcon === "right" ? (
            <CornerUpRight size={18} color="#FFFFFF" />
          ) : guidanceData.maneuverIcon === "left" ? (
            <CornerUpLeft size={18} color="#FFFFFF" />
          ) : guidanceData.maneuverIcon === "straight" ? (
            <ArrowUp size={18} color="#FFFFFF" />
          ) : guidanceData.maneuverIcon === "bike" ? (
            <Bike size={18} color="#FFFFFF" />
          ) : (
            <Compass size={18} color="#FFFFFF" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.maneuverTitleText} numberOfLines={1}>
            {guidanceData.nextManeuver}
          </Text>
          <Text style={styles.maneuverSubtitleText} numberOfLines={1}>
            {guidanceData.targetAddress}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.etaPill}
          onPress={openExternalGoogleMaps}
          activeOpacity={0.8}
        >
          <Navigation size={12} color="#0D7A53" />
          <Text style={styles.etaPillText}>Maps</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Turn-by-Turn Instruction Accordion */}
      {showTurnInstructions && (
        <View style={styles.guidanceCard}>
          <TouchableOpacity
            style={styles.guidanceHeader}
            onPress={() => setIsGuidanceExpanded(!isGuidanceExpanded)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.guidanceIconBox}>
                <Compass size={13} color="#0D7A53" />
              </View>
              <Text style={styles.guidanceTitle}>Petunjuk Rute ({guidanceData.title})</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={styles.guidanceToggleText}>
                {isGuidanceExpanded ? "Sembunyikan" : "Buka Langkah"}
              </Text>
              {isGuidanceExpanded ? (
                <ChevronUp size={15} color="#0D7A53" />
              ) : (
                <ChevronDown size={15} color="#0D7A53" />
              )}
            </View>
          </TouchableOpacity>

          {isGuidanceExpanded && (
            <View style={styles.stepsList}>
              {guidanceData.steps.map((step, idx) => (
                <View key={idx} style={styles.stepItem}>
                  <View style={styles.stepIconWrap}>
                    {step.type === "right" ? (
                      <CornerUpRight size={12} color="#0D7A53" />
                    ) : step.type === "left" ? (
                      <CornerUpLeft size={12} color="#0D7A53" />
                    ) : step.type === "dest" ? (
                      <MapPin size={12} color="#15803D" />
                    ) : step.type === "store" ? (
                      <Store size={12} color="#0D7A53" />
                    ) : (
                      <ArrowUp size={12} color="#0D7A53" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepInstruction}>{step.instruction}</Text>
                    <Text style={styles.stepDistance}>{step.distance}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const MarketplaceLocationMap: React.FC<LiveOrderTrackingMapProps> = ({
  storeName,
  storeAddress,
  customerAddress,
  orderStatus,
  height = 270,
  navigationMode,
  onNavigationModeChange,
}) => {
  const [internalMode, setInternalMode] = useState<"overview" | "store" | "customer">("store");
  const mode = navigationMode || internalMode;
  const pickup = storeAddress?.trim() || "Alamat toko belum tersedia";
  const delivery = customerAddress?.trim() || "Alamat pelanggan belum tersedia";
  const destination = mode === "customer" ? delivery : pickup;

  const openDirections = async () => {
    if (destination.includes("belum tersedia")) {
      Alert.alert("Alamat belum tersedia", "Navigasi bisa dibuka setelah alamat tujuan tersedia.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Navigasi tidak tersedia", "Tidak dapat membuka aplikasi peta pada perangkat ini.");
    }
  };

  const selectMode = (next: "overview" | "store" | "customer") => {
    setInternalMode(next);
    onNavigationModeChange?.(next);
  };

  const routeButton = (label: string, next: "overview" | "store" | "customer", Icon: typeof Compass) => (
    <TouchableOpacity
      key={next}
      onPress={() => selectMode(next)}
      style={{
        flex: 1,
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        backgroundColor: mode === next ? "#0D7A53" : "#FFFFFF",
        borderWidth: 1,
        borderColor: mode === next ? "#0D7A53" : "#CBD5E1",
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: mode === next }}
    >
      <Icon size={15} color={mode === next ? "#FFFFFF" : "#0D7A53"} />
      <Text style={{ color: mode === next ? "#FFFFFF" : "#0F172A", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        height,
        minHeight: 220,
        padding: 14,
        justifyContent: "space-between",
        gap: 10,
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MapPin size={18} color="#0D7A53" />
        <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "800" }}>Informasi lokasi pesanan</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {routeButton("Ringkasan", "overview", Compass)}
        {routeButton("Toko", "store", Store)}
        {routeButton("Pelanggan", "customer", MapPin)}
      </View>
      {mode === "overview" ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#334155", fontSize: 12 }}>
            <Text style={{ fontWeight: "800" }}>{storeName || "Toko"}: </Text>
            {pickup}
          </Text>
          <Text style={{ color: "#334155", fontSize: 12 }}>
            <Text style={{ fontWeight: "800" }}>Pelanggan: </Text>
            {delivery}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 3 }}>
          <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700" }}>
            {mode === "customer" ? "TUJUAN PENGANTARAN" : "LOKASI PICKUP"}
          </Text>
          <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "700" }}>
            {mode === "customer" ? delivery : `${storeName ? `${storeName} · ` : ""}${pickup}`}
          </Text>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 7,
          padding: 9,
          backgroundColor: "#FFF7ED",
          borderRadius: 9,
        }}
      >
        <Navigation size={15} color="#C2410C" />
        <Text style={{ flex: 1, color: "#9A3412", fontSize: 11, lineHeight: 16 }}>
          {orderStatus === "Selesai"
            ? "Pengantaran selesai."
            : "Lokasi driver belum tersedia. GPS real-time Marketplace belum terhubung."}
        </Text>
      </View>
      {mode !== "overview" && (
        <TouchableOpacity
          onPress={() => void openDirections()}
          style={{
            minHeight: 42,
            borderRadius: 10,
            backgroundColor: "#0D7A53",
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
        >
          <Navigation size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>
            Buka navigasi ke {mode === "customer" ? "pelanggan" : "toko"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const LiveOrderTrackingMap: React.FC<LiveOrderTrackingMapProps> = (props) =>
  props.marketplaceMode ? <MarketplaceLocationMap {...props} /> : <InteractiveLiveOrderTrackingMap {...props} />;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: 10,
  },
  mapContainer: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#C6E7D4",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    fontSize: 12,
    color: "#0D7A53",
    marginTop: 6,
    fontWeight: "700",
  },
  nativeFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#F0FDF4",
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 8,
  },
  fallbackSub: {
    fontSize: 12,
    color: "#475569",
    marginTop: 3,
    textAlign: "center",
  },
  mapLiveBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(13, 122, 83, 0.92)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mapLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  mapLiveText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  mapCornerActions: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
  },
  cornerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    cursor: "pointer" as any,
  },
  routeSegmentedBar: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 12,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    cursor: "pointer" as any,
  },
  segmentTabActive: {
    backgroundColor: "#0D7A53",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabInactive: {
    backgroundColor: "transparent",
  },
  segmentTabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  segmentTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  activeRouteHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  activeRouteHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  maneuverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  maneuverIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  maneuverTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  maneuverSubtitleText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  etaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
    cursor: "pointer" as any,
  },
  etaPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  guidanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  guidanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    cursor: "pointer" as any,
  },
  guidanceIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E2F7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  guidanceToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  stepsList: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    padding: 10,
    gap: 8,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  stepIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepInstruction: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  stepDistance: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  mapLiveBadgeNavigating: {
    backgroundColor: "#15803D",
    borderWidth: 1.5,
    borderColor: "#FEF08A",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  mapLiveDotNavigating: {
    backgroundColor: "#FEF08A",
  },
  motorcycleMarkerOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -40 }, { translateY: -36 }],
    zIndex: 10,
    pointerEvents: "none" as any,
  },
  radarRing1: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "rgba(234, 88, 12, 0.45)",
    backgroundColor: "rgba(254, 240, 138, 0.25)",
  },
  radarRing2: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(234, 88, 12, 0.7)",
    backgroundColor: "rgba(253, 186, 116, 0.35)",
  },
  motorcycleBeacon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#15803D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  motorcycleBeaconNavigating: {
    backgroundColor: "#EA580C",
    borderColor: "#FEF08A",
    borderWidth: 2.5,
  },
  driverCalloutBubble: {
    position: "absolute",
    top: -34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EA580C",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 95,
    justifyContent: "center",
  },
  driverCalloutDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16A34A",
  },
  driverCalloutTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#15803D",
  },
  driverCalloutSub: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  mapBottomNavHud: {
    position: "absolute",
    bottom: 8,
    left: 10,
    right: 10,
    zIndex: 12,
  },
  startNavFloatingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    cursor: "pointer" as any,
  },
  startNavPulseIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  startNavFloatingBtnText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  navActiveHudBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#15803D",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#86EFAC",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  navActiveHudLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navPulseDotLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FEF08A",
  },
  navActiveHudStatus: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  navSpeedPill: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  navActiveHudSpeed: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  navStopBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    cursor: "pointer" as any,
  },
  navStopBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  journeyTrackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  journeyTrackEndpoints: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackEndpointItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "48%",
  },
  trackEndpointText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  trackLineContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E2E8F0",
    position: "relative",
    justifyContent: "center",
    marginVertical: 6,
  },
  trackLineFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#15803D",
  },
  trackBikeMarker: {
    position: "absolute",
    top: -11,
    transform: [{ translateX: -16 }],
    alignItems: "center",
    justifyContent: "center",
  },
  trackBikeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#15803D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  trackBikeCircleNavigating: {
    backgroundColor: "#EA580C",
    borderColor: "#FEF08A",
  },
  trackBikePulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(234, 88, 12, 0.5)",
  },
  trackFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  trackStatusHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    flex: 1,
  },
  trackToggleMiniBtn: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    cursor: "pointer" as any,
  },
  trackToggleMiniBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  trackToggleMiniBtnNavigating: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  trackToggleMiniBtnNavigatingText: {
    color: "#D97706",
  },
});
