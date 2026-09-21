import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, Crosshair, MapPin, Search, X } from "lucide-react-native";
import { NativeMapComponent, Region, MapPressEvent } from "./NativeMapComponent";
import { PlaceSuggestion, safeForwardGeocode, searchPlacesSmart } from "../utils/geocoding";

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
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const searchDebounceRef = useRef<Parameters<typeof clearTimeout>[0] | undefined>(undefined);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchRequestRef.current += 1;
    setSuggestions([]);
    setShowSuggestions(false);
    setSearching(false);
    if (!visible) return;

    setRegion(initialRegion);
    setPin({ latitude: initialRegion.latitude, longitude: initialRegion.longitude });
    setDetectedAddress(initialLocation?.detectedAddress || "");
    setSearchText("");
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
    const coordinate = event?.nativeEvent?.coordinate;
    if (coordinate) {
      movePin(coordinate.latitude, coordinate.longitude);
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    clearTimeout(searchDebounceRef.current);

    const requestId = ++searchRequestRef.current;
    const query = text.trim();
    if (query.length < 2) {
      setSearching(false);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const list = await searchPlacesSmart(query, {
            lat: pin.latitude,
            lon: pin.longitude,
            limit: 6,
          });
          if (requestId !== searchRequestRef.current) return;
          setSuggestions(list);
          setShowSuggestions(list.length > 0);
        } catch {
          if (requestId === searchRequestRef.current) {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } finally {
          if (requestId === searchRequestRef.current) setSearching(false);
        }
      })();
    }, 300);
  };

  const selectSuggestion = (item: PlaceSuggestion) => {
    const address = item.formattedAddress || [item.name, item.subtitle].filter(Boolean).join(", ");
    setSearchText(item.name);
    setSuggestions([]);
    setShowSuggestions(false);
    movePin(item.latitude, item.longitude);
    setRegion((current) => ({
      ...current,
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }));
    setDetectedAddress(address);
  };

  const handleSearch = async () => {
    const query = searchText.trim();
    if (!query) return;

    setShowSuggestions(false);
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
      return;
    }

    setSearching(true);
    try {
      const match = await safeForwardGeocode(query, {
        lat: pin.latitude,
        lon: pin.longitude,
      });

      if (!match) {
        Alert.alert(
          "Lokasi tidak ditemukan",
          "Coba gunakan nama tempat, jalan, kelurahan, atau kota yang lebih lengkap.",
        );
        return;
      }

      movePin(match.latitude, match.longitude);
      setRegion((current) => ({
        ...current,
        latitude: match.latitude,
        longitude: match.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }));
      setDetectedAddress(match.formattedAddress || query);
    } catch {
      Alert.alert(
        "Pencarian tidak tersedia",
        "Periksa koneksi internet lalu coba lagi.",
      );
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

          <View style={styles.searchArea}>
            <View style={styles.searchRow}>
              <Search size={17} color="#64748B" />
              <TextInput
                value={searchText}
                onChangeText={handleSearchTextChange}
                onSubmitEditing={() => void handleSearch()}
                placeholder="Cari tempat, jalan, atau area"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searching ? (
                <ActivityIndicator size="small" color="#1B7A4E" />
              ) : searchText.length > 0 ? (
                <TouchableOpacity
                  onPress={() => handleSearchTextChange("")}
                  accessibilityLabel="Hapus pencarian"
                  activeOpacity={0.7}
                >
                  <X size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView
                  style={styles.suggestionsList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item.id || `suggestion-${index}`}
                      style={[
                        styles.suggestionItem,
                        index === suggestions.length - 1 && styles.suggestionItemLast,
                      ]}
                      onPress={() => selectSuggestion(item)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.suggestionIconBox}>
                        <MapPin size={15} color="#059669" />
                      </View>
                      <View style={styles.suggestionTextBox}>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggestionSubtitle} numberOfLines={2}>
                          {item.subtitle || item.formattedAddress}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.mapWrap}>
            <NativeMapComponent
              googleMapsUrl={googleMapsUrl}
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={handleMapPress}
              pin={pin}
              onPinDragEnd={(coord: { latitude: number; longitude: number }) => movePin(coord.latitude, coord.longitude)}
            />
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
  searchArea: { position: "relative", zIndex: 20, elevation: 20 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, paddingHorizontal: 12, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", zIndex: 2 },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 12 },
  suggestionsContainer: { position: "absolute", top: 62, left: 12, right: 12, maxHeight: 280, borderRadius: 16, backgroundColor: "#FFFFFF", overflow: "hidden", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 12, zIndex: 30 },
  suggestionsList: { maxHeight: 280 },
  suggestionItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  suggestionItemLast: { borderBottomWidth: 0 },
  suggestionIconBox: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#ECFDF5" },
  suggestionTextBox: { flex: 1, gap: 2 },
  suggestionName: { color: "#0F172A", fontSize: 12.5, fontWeight: "800" },
  suggestionSubtitle: { color: "#64748B", fontSize: 10.5, lineHeight: 14 },
  mapWrap: { flex: 1, minHeight: 260, position: "relative", backgroundColor: "#E2E8F0" },
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
