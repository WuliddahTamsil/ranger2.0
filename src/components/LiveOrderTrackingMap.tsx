import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Store,
  Bike,
  Clock,
  Compass,
  RefreshCw,
} from "lucide-react-native";

interface LiveOrderTrackingMapProps {
  storeName?: string;
  storeAddress?: string;
  customerAddress?: string;
  driverName?: string;
  driverVehicle?: string;
  orderStatus: string;
  height?: number;
}

export const LiveOrderTrackingMap: React.FC<LiveOrderTrackingMapProps> = ({
  storeName = "Dapur Catering",
  storeAddress = "Kamal, Bangkalan, Madura",
  customerAddress = "Telang Indah, Bangkalan, Madura",
  driverName,
  driverVehicle,
  orderStatus,
  height = 280,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Status mapping for real-time tracking display
  const isCooking = orderStatus === "Diproses";
  const isReady = orderStatus === "Siap";
  const isPickedUp = ["Menuju Pickup", "Sampai Pickup"].includes(orderStatus);
  const isDelivering = ["Diambil", "Mengantar", "Dikirim"].includes(orderStatus);
  const isFinished = orderStatus === "Selesai";

  const statusLabel = isFinished
    ? "Pesanan Telah Tiba di Tujuan"
    : isDelivering
    ? `Kurir (${driverName || "Driver"}) Sedang Mengantar`
    : isPickedUp
    ? `Kurir Menuju Dapur (${storeName})`
    : isReady
    ? "Pesanan Siap • Menunggu Kurir"
    : isCooking
    ? "Dapur Sedang Memasak Menu"
    : "Menunggu Konfirmasi Dapur";

  const statusBadgeColor = isFinished
    ? "#16A34A"
    : isDelivering
    ? "#0284C7"
    : isReady
    ? "#7E22CE"
    : isCooking
    ? "#EA580C"
    : "#6B7280";

  // Google Maps search query: center between destination and origin
  const queryLocation = isDelivering
    ? customerAddress
    : isPickedUp || isReady || isCooking
    ? storeAddress
    : customerAddress;

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    queryLocation
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // Open real navigation in Google Maps app / web
  const handleOpenGoogleMaps = () => {
    const origin = encodeURIComponent(storeAddress);
    const dest = encodeURIComponent(customerAddress);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=two_wheeler`;
    void Linking.openURL(mapsUrl);
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Real Interactive Google Maps Container */}
      <View style={styles.mapFrame}>
        {Platform.OS === "web" ? (
          <iframe
            key={refreshKey}
            title="Google Maps Tracking"
            src={mapEmbedUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            } as any}
            onLoad={() => setMapLoaded(true)}
          />
        ) : (
          // Fallback for native runtime if webview is not directly mounted
          <View style={styles.nativeFallback}>
            <Compass size={40} color="#1B7A4E" />
            <Text style={styles.fallbackTitle}>Google Maps Real-Time Active</Text>
            <Text style={styles.fallbackSub}>
              {storeAddress} ➔ {customerAddress}
            </Text>
            <TouchableOpacity style={styles.openMapsBtn} onPress={handleOpenGoogleMaps}>
              <ExternalLink size={16} color="#FFFFFF" />
              <Text style={styles.openMapsBtnText}>Buka di Aplikasi Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading overlay for iframe */}
        {!mapLoaded && Platform.OS === "web" && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="small" color="#1B7A4E" />
            <Text style={styles.loaderText}>Memuat Google Maps...</Text>
          </View>
        )}
      </View>

      {/* Floating Status Banner */}
      <View style={styles.topHud}>
        <View style={[styles.statusPill, { backgroundColor: statusBadgeColor }]}>
          {isDelivering ? (
            <Bike size={14} color="#FFFFFF" />
          ) : isReady ? (
            <Navigation size={14} color="#FFFFFF" />
          ) : (
            <Store size={14} color="#FFFFFF" />
          )}
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setMapLoaded(false);
            setRefreshKey((k) => k + 1);
          }}
          activeOpacity={0.8}
        >
          <RefreshCw size={13} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Bottom Floating Route Info Card */}
      <View style={styles.bottomHud}>
        <View style={styles.routeRow}>
          <View style={styles.routeCol}>
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: "#1B7A4E" }]} />
              <Text style={styles.pointText} numberOfLines={1}>
                {storeName} ({storeAddress})
              </Text>
            </View>
            <View style={styles.pointLine} />
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.pointText} numberOfLines={1}>
                {customerAddress}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.externalMapsBtn} onPress={handleOpenGoogleMaps} activeOpacity={0.85}>
            <ExternalLink size={14} color="#1B7A4E" />
            <Text style={styles.externalMapsBtnText}>Google Maps</Text>
          </TouchableOpacity>
        </View>

        {driverName && (
          <View style={styles.driverInfoBar}>
            <View style={styles.driverBadge}>
              <Bike size={13} color="#1B7A4E" />
              <Text style={styles.driverBadgeName}>{driverName}</Text>
              {Boolean(driverVehicle) && (
                <Text style={styles.driverBadgeVehicle}>({driverVehicle})</Text>
              )}
            </View>
            <View style={styles.etaBadge}>
              <Clock size={12} color="#166534" />
              <Text style={styles.etaText}>
                {isDelivering ? "Est. 10-15 mnt" : isReady ? "Menunggu pickup" : "Dalam persiapan"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mapFrame: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "500",
  },
  nativeFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#F0FDF4",
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
    marginTop: 8,
  },
  fallbackSub: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
    textAlign: "center",
  },
  openMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  openMapsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  topHud: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  refreshBtn: {
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomHud: {
    position: "absolute",
    bottom: 8,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  routeCol: {
    flex: 1,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  pointLine: {
    width: 2,
    height: 10,
    backgroundColor: "#D1D5DB",
    marginLeft: 3,
    marginVertical: 1,
  },
  externalMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C6E7D4",
  },
  externalMapsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  driverInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  driverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  driverBadgeName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  driverBadgeVehicle: {
    fontSize: 11,
    color: "#6B7280",
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  etaText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
});
