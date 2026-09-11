import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import type { MapPressEvent, Region } from "react-native-maps";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, Crosshair, MapPin, Search, X } from "lucide-react-native";

// react-native-maps is a native-only view. Do not initialize it on Expo Web,
// otherwise the whole app can fail before the first screen is rendered.
const nativeMaps = Platform.OS === "web" ? null : (require("react-native-maps") as typeof import("react-native-maps"));
const NativeMapView = nativeMaps?.default;
const NativeMarker = nativeMaps?.Marker;

export interface CustomerLocationValue {
  latitude: number;
  longitude: number;
  detectedAddress?: string;
}

interface CustomerLocationPickerProps {
  visible: boolean;
  initialLocation?: CustomerLocationValue;
  onClose: () => void;
  onConfirm: (location: CustomerLocationValue) => void;
}

const DEFAULT_REGION: Region = {
  latitude: -6.9175,
  longitude: 107.6191,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const formatReverseGeocode = (items: Location.LocationGeocodedAddress[]) => {
  const item = items[0];
  if (!item) return "";
  return [
    item.street,
    item.name && item.name !== item.street ? item.name : "",
    item.district,
    item.subregion,
    item.city,
    item.region,
    item.postalCode,
  ].filter(Boolean).join(", ");
};

export const CustomerLocationPicker: React.FC<CustomerLocationPickerProps> = ({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const initialRegion = useMemo<Region>(() => ({
    latitude: initialLocation?.latitude ?? DEFAULT_REGION.latitude,
    longitude: initialLocation?.longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  }), [initialLocation]);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [pin, setPin] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
  });
  const [detectedAddress, setDetectedAddress] = useState(initialLocation?.detectedAddress || "");
  const [webMapQuery, setWebMapQuery] = useState(
    initialLocation ? `${initialLocation.latitude},${initialLocation.longitude}` : `${DEFAULT_REGION.latitude},${DEFAULT_REGION.longitude}`,
  );
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRegion(initialRegion);
    setPin({ latitude: initialRegion.latitude, longitude: initialRegion.longitude });
    setDetectedAddress(initialLocation?.detectedAddress || "");
    setWebMapQuery(initialLocation ? `${initialLocation.latitude},${initialLocation.longitude}` : `${initialRegion.latitude},${initialRegion.longitude}`);
  }, [visible, initialRegion, initialLocation]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = formatReverseGeocode(result);
      if (address) setDetectedAddress(address);
    } catch {
      // Reverse geocoding is best effort; coordinates remain valid when provider is unavailable.
    }
  };

  const movePin = (latitude: number, longitude: number) => {
    setPin({ latitude, longitude });
    setRegion((current) => ({ ...current, latitude, longitude }));
    setWebMapQuery(`${latitude},${longitude}`);
    void reverseGeocode(latitude, longitude);
  };

  const handleMapPress = (event: MapPressEvent) => {
    const coordinate = event.nativeEvent.coordinate;
    movePin(coordinate.latitude, coordinate.longitude);
  };

  const handleSearch = async () => {
    const query = searchText.trim();
    if (!query) return;
    setSearching(true);
    if (Platform.OS === "web") {
      // Google Maps iframe handles the search query on Web. The native path
      // still uses Expo Location geocoding and updates the draggable marker.
      setWebMapQuery(query);
      setDetectedAddress(query);
      setSearching(false);
      return;
    }
    try {
      const result = await Location.geocodeAsync(query);
      const match = result[0];
      if (!match) {
        Alert.alert("Lokasi tidak ditemukan", "Coba gunakan nama jalan, kelurahan, atau kota yang lebih lengkap.");
        return;
      }
      movePin(match.latitude, match.longitude);
      setRegion((current) => ({ ...current, latitude: match.latitude, longitude: match.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }));
    } catch {
      Alert.alert("Pencarian tidak tersedia", "Periksa koneksi internet atau tentukan titik dengan mengetuk peta.");
    } finally {
      setSearching(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              movePin(position.coords.latitude, position.coords.longitude);
              setRegion((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }));
              resolve();
            },
            reject,
            { enableHighAccuracy: true, timeout: 12000 },
          );
        });
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert("Izin lokasi diperlukan", "Izinkan akses lokasi agar titik rumah dapat diposisikan secara otomatis.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      movePin(current.coords.latitude, current.coords.longitude);
      setRegion((currentRegion) => ({ ...currentRegion, latitude: current.coords.latitude, longitude: current.coords.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }));
    } catch {
      Alert.alert("Lokasi tidak tersedia", "Pastikan GPS aktif. Anda tetap dapat menentukan titik dengan mengetuk atau menggeser pin di peta.");
    } finally {
      setLocating(false);
    }
  };

  const confirmLocation = () => onConfirm({ ...pin, detectedAddress });
  const googleMapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(webMapQuery)}&z=17&output=embed`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ResponsiveSafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Pilih Lokasi di Maps</Text>
              <Text style={styles.subtitle}>Geser pin atau ketuk peta tepat di lokasi rumah</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Tutup peta">
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Search size={17} color="#64748B" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => void handleSearch()}
              placeholder="Cari jalan, kelurahan, atau kota"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchButton} onPress={() => void handleSearch()} disabled={searching}>
              {searching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.searchButtonText}>Cari</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.mapWrap}>
            {Platform.OS === "web" ? (
              <iframe
                key={googleMapsUrl}
                title="Google Maps Lokasi Rumah"
                src={googleMapsUrl}
                style={styles.webMapFrame as any}
                loading="lazy"
              />
            ) : !NativeMapView || !NativeMarker ? (
              <View style={styles.webMapFallback}>
                <MapPin size={38} color="#1B7A4E" />
                <Text style={styles.webMapTitle}>Google Maps belum tersedia</Text>
                <Text style={styles.webMapText}>Silakan gunakan build Android/iOS dengan konfigurasi Maps.</Text>
              </View>
            ) : (
              <NativeMapView
                style={StyleSheet.absoluteFill}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton={false}
                loadingEnabled
              >
                <NativeMarker
                  coordinate={pin}
                  draggable
                  onDragEnd={(event: any) => {
                    const coordinate = event.nativeEvent.coordinate;
                    movePin(coordinate.latitude, coordinate.longitude);
                  }}
                  title="Lokasi rumah"
                  description="Geser pin ke titik rumah yang paling tepat"
                />
              </NativeMapView>
            )}
            <View style={styles.mapBadge}><MapPin size={13} color="#1B7A4E" /><Text style={styles.mapBadgeText}>Pin rumah</Text></View>
            <TouchableOpacity style={styles.gpsButton} onPress={() => void useCurrentLocation()} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color="#1B7A4E" /> : <Crosshair size={18} color="#1B7A4E" />}
              <Text style={styles.gpsButtonText}>{locating ? "Mencari..." : "Gunakan lokasi saya"}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.bottomPanel, { paddingBottom: Math.max(16, insets.bottom + 10) }]}>
            <View style={styles.locationSummary}>
              <View style={styles.pinIcon}><MapPin size={18} color="#1B7A4E" /></View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>Lokasi rumah</Text>
                <Text style={styles.summaryAddress} numberOfLines={2}>{detectedAddress || "Alamat akan terdeteksi setelah pin dipindahkan"}</Text>
                <Text style={styles.coordinates}>Lat {pin.latitude.toFixed(6)} · Lng {pin.longitude.toFixed(6)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Konfirmasi Lokasi</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ResponsiveSafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  headerCopy: { flex: 1 },
  title: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  subtitle: { color: "#64748B", fontSize: 11, marginTop: 3 },
  closeButton: { width: 35, height: 35, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, paddingHorizontal: 12, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 12 },
  searchButton: { minWidth: 48, minHeight: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#1B7A4E", paddingHorizontal: 9 },
  searchButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  mapWrap: { flex: 1, minHeight: 260, position: "relative", backgroundColor: "#E2E8F0" },
  webMapFrame: { width: "100%", height: "100%", borderWidth: 0 },
  webMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#EAF7EF" },
  webMapTitle: { color: "#166534", fontSize: 14, fontWeight: "900", marginTop: 10, textAlign: "center" },
  webMapText: { color: "#4D7C5B", fontSize: 11, textAlign: "center", marginTop: 5 },
  mapBadge: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.96)" },
  mapBadgeText: { color: "#166534", fontSize: 10, fontWeight: "800" },
  gpsButton: { position: "absolute", right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, backgroundColor: "#FFFFFF", shadowColor: "#0F172A", shadowOpacity: 0.16, shadowRadius: 7, elevation: 4 },
  gpsButtonText: { color: "#166534", fontSize: 10, fontWeight: "800" },
  bottomPanel: { paddingHorizontal: 16, paddingTop: 13, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  locationSummary: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 },
  pinIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  summaryAddress: { color: "#475569", fontSize: 11, lineHeight: 16, marginTop: 2 },
  coordinates: { color: "#1B7A4E", fontSize: 10, marginTop: 3, fontWeight: "700" },
  confirmButton: { minHeight: 46, borderRadius: 14, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  confirmButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
