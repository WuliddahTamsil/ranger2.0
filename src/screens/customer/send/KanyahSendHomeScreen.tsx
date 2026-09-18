import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  Package,
  MapPin,
  Navigation,
  ArrowLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react-native";
import * as Location from "expo-location";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useSendContext } from "../../../context/SendContext";
import { NativeMapComponent, MapMarkerItem } from "../../../components/NativeMapComponent";
import { fetchCustomerSendOrders } from "../../../services/sendService";
import { rp } from "../../../utils/formatters";
import { safeReverseGeocode } from "../../../utils/geocoding";

interface KanyahSendHomeScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const KanyahSendHomeScreen: React.FC<KanyahSendHomeScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const { sender, setSender, recipient, setRecipient, setPickerTarget, resetSendFlow } =
    useSendContext();

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Sync auth account info with sender profile if empty
  useEffect(() => {
    if (authAccount) {
      setSender((prev) => ({
        ...prev,
        name: prev.name || authAccount.name || "",
        phone: prev.phone || authAccount.phone || "",
      }));
    }
  }, [authAccount]);

  // Fetch recent orders (max 2)
  useEffect(() => {
    if (authAccount?.id) {
      setLoadingRecent(true);
      fetchCustomerSendOrders(authAccount.id, authAccount.id)
        .then((res) => {
          if (res.success && res.data) {
            setRecentOrders(res.data.slice(0, 2));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingRecent(false));
    }
  }, [authAccount]);

  // Quick action: Use current GPS location for pickup
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("Izin akses lokasi diperlukan untuk mendeteksi koordinat Anda.", "error");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;

      let formattedAddress = "Lokasi Saya Saat Ini";
      try {
        const geo = await safeReverseGeocode(lat, lon);
        if (geo?.formattedAddress) {
          formattedAddress = geo.formattedAddress;
        }
      } catch {}

      setSender((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lon,
        address: formattedAddress,
      }));

      showToast("Titik jemput diatur ke lokasi Anda saat ini.", "success");
    } catch (err: any) {
      showToast("Gagal mendeteksi lokasi GPS: " + (err.message || ""), "error");
    } finally {
      setIsLocating(false);
    }
  };

  // Swap pickup & recipient
  const handleSwapRoute = () => {
    if (!sender.address && !recipient.address) return;
    const tempSender = { ...sender };
    setSender({
      ...sender,
      address: recipient.address,
      latitude: recipient.latitude,
      longitude: recipient.longitude,
      notes: recipient.notes,
    });
    setRecipient({
      ...recipient,
      address: tempSender.address,
      latitude: tempSender.latitude,
      longitude: tempSender.longitude,
      notes: tempSender.notes,
    });
    showToast("Titik penjemputan dan tujuan ditukar.", "info");
  };

  // Tap to pick pickup on map
  const handleOpenPickupPicker = () => {
    setPickerTarget("sender");
    navigate("c_send_location");
  };

  // Tap to pick destination on map
  const handleOpenDestinationPicker = () => {
    setPickerTarget("recipient");
    navigate("c_send_location");
  };

  // Check if both route endpoints are valid
  const isRouteValid = Boolean(
    sender.address.trim() &&
      recipient.address.trim() &&
      sender.latitude != null &&
      sender.longitude != null &&
      recipient.latitude != null &&
      recipient.longitude != null
  );

  // Map markers & route polyline
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    const list: MapMarkerItem[] = [];
    if (sender.latitude != null && sender.longitude != null) {
      list.push({
        id: "sender_point",
        coordinate: { latitude: sender.latitude, longitude: sender.longitude },
        title: "Titik Jemput",
        description: sender.address,
        pinColor: "#059669",
        type: "pickup",
      });
    }
    if (recipient.latitude != null && recipient.longitude != null) {
      list.push({
        id: "recipient_point",
        coordinate: { latitude: recipient.latitude, longitude: recipient.longitude },
        title: "Titik Antar",
        description: recipient.address,
        pinColor: "#E11D48",
        type: "dropoff",
      });
    }
    return list;
  }, [sender.latitude, sender.longitude, sender.address, recipient.latitude, recipient.longitude, recipient.address]);

  const mapCenter = useMemo(() => {
    if (sender.latitude != null && sender.longitude != null) {
      return { latitude: sender.latitude, longitude: sender.longitude };
    }
    if (recipient.latitude != null && recipient.longitude != null) {
      return { latitude: recipient.latitude, longitude: recipient.longitude };
    }
    return { latitude: -6.9175, longitude: 107.6191 };
  }, [sender.latitude, sender.longitude, recipient.latitude, recipient.longitude]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Clean Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <View style={styles.brandBadgeRow}>
            <Package size={14} color="#059669" />
            <Text style={styles.brandBadgeText}>KANYAAH SEND</Text>
          </View>
          <Text style={styles.headerTitle}>Kirim Barang</Text>
          <Text style={styles.headerSub}>Antar barang dengan aman sampai tujuan.</Text>
        </View>
      </View>

      {/* In-App Feedback Toast */}
      {toastMsg && (
        <View
          style={[
            styles.toastBox,
            toastMsg.type === "error"
              ? styles.toastError
              : toastMsg.type === "success"
              ? styles.toastSuccess
              : styles.toastInfo,
          ]}
        >
          {toastMsg.type === "error" ? (
            <AlertTriangle size={15} color="#FFFFFF" />
          ) : toastMsg.type === "success" ? (
            <CheckCircle2 size={15} color="#FFFFFF" />
          ) : (
            <Info size={15} color="#FFFFFF" />
          )}
          <Text style={styles.toastText}>{toastMsg.text}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Map Preview Besar (240px) */}
        <View style={styles.mapCard}>
          <NativeMapComponent
            initialRegion={{
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035,
            }}
            markers={mapMarkers}
            interactive={true}
            showRouteLine={true}
            style={styles.mapElement}
          />

          {/* Empty State Banner if route not complete */}
          {!isRouteValid && (
            <View style={styles.mapEmptyBanner}>
              <Info size={14} color="#059669" />
              <Text style={styles.mapEmptyBannerText}>
                Pilih lokasi pickup dan tujuan untuk melihat rute pengiriman.
              </Text>
            </View>
          )}
        </View>

        {/* 3. Unified Route Card */}
        <View style={styles.routeCard}>
          {/* Pickup Section */}
          <TouchableOpacity
            style={styles.locationItem}
            onPress={handleOpenPickupPicker}
            activeOpacity={0.7}
          >
            <View style={styles.pinCol}>
              <View style={styles.dotEmerald} />
              <View style={styles.verticalConnector} />
            </View>
            <View style={styles.locationInfoCol}>
              <Text style={styles.locationLabelEmerald}>Dari mana barang diambil?</Text>
              <Text
                style={[
                  styles.locationAddressText,
                  !sender.address && styles.locationPlaceholderText,
                ]}
                numberOfLines={2}
              >
                {sender.address || "Pilih lokasi penjemputan..."}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Tujuan Section */}
          <TouchableOpacity
            style={[styles.locationItem, { marginTop: 4 }]}
            onPress={handleOpenDestinationPicker}
            activeOpacity={0.7}
          >
            <View style={styles.pinCol}>
              <View style={styles.dotRose} />
            </View>
            <View style={styles.locationInfoCol}>
              <Text style={styles.locationLabelRose}>Diantar ke mana?</Text>
              <Text
                style={[
                  styles.locationAddressText,
                  !recipient.address && styles.locationPlaceholderText,
                ]}
                numberOfLines={2}
              >
                {recipient.address || "Pilih lokasi tujuan pengantaran..."}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 4. Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Navigation size={14} color="#059669" />
            )}
            <Text style={styles.quickActionBtnText}>Lokasi Saya</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={handleSwapRoute}
            disabled={!sender.address && !recipient.address}
          >
            <ArrowUpDown size={14} color="#059669" />
            <Text style={styles.quickActionBtnText}>Tukar Rute</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders (Max 2 items) */}
        {recentOrders.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentSectionTitle}>Pengiriman Terakhir</Text>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={styles.recentOrderCard}
                onPress={() => {
                  setSender((prev) => ({
                    ...prev,
                    address: order.sender?.address || prev.address,
                    latitude: order.sender?.latitude || prev.latitude,
                    longitude: order.sender?.longitude || prev.longitude,
                  }));
                  setRecipient((prev) => ({
                    ...prev,
                    address: order.recipient?.address || prev.address,
                    latitude: order.recipient?.latitude || prev.latitude,
                    longitude: order.recipient?.longitude || prev.longitude,
                  }));
                  showToast("Alamat pengiriman sebelumnya diterapkan.", "info");
                }}
              >
                <View style={styles.recentIconCircle}>
                  <Clock size={14} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentItemTitle} numberOfLines={1}>
                    {order.package?.name || "Paket"} • {rp(order.pricing?.finalFare || 0)}
                  </Text>
                  <Text style={styles.recentItemSub} numberOfLines={1}>
                    Ke: {order.recipient?.address}
                  </Text>
                </View>
                <Text style={styles.recentUseBtn}>Pakai</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 5. Primary Sticky CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.primaryCta, !isRouteValid && styles.primaryCtaDisabled]}
          disabled={!isRouteValid}
          onPress={() => navigate("c_send_package")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryCtaText}>Lanjutkan ke Detail Barang</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
  },
  brandBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  toastBox: {
    position: "absolute",
    top: 70,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  toastSuccess: { backgroundColor: "#059669" },
  toastError: { backgroundColor: "#DC2626" },
  toastInfo: { backgroundColor: "#0284C7" },
  toastText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", flex: 1 },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },

  // Map Preview Card
  mapCard: {
    height: 240,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  mapElement: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mapEmptyBanner: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mapEmptyBannerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },

  // Route Card
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  pinCol: {
    alignItems: "center",
    width: 16,
  },
  dotEmerald: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#059669",
  },
  verticalConnector: {
    width: 2,
    height: 28,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  dotRose: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E11D48",
  },
  locationInfoCol: {
    flex: 1,
  },
  locationLabelEmerald: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  locationLabelRose: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E11D48",
    letterSpacing: 0.5,
  },
  locationAddressText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  locationPlaceholderText: {
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // Recent Orders Section
  recentSection: {
    marginTop: 22,
  },
  recentSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 10,
  },
  recentOrderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    gap: 10,
  },
  recentIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  recentItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  recentItemSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  recentUseBtn: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
  },

  // Bottom CTA
  bottomBar: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  primaryCta: {
    backgroundColor: "#059669",
    borderRadius: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
