import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import {
  ArrowLeft,
  Search,
  Crosshair,
  MapPin,
  Check,
  Building,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useSendContext } from "../../../context/SendContext";
import { NativeMapComponent, Region, MapMarkerItem } from "../../../components/NativeMapComponent";
import {
  safeReverseGeocode,
  safeForwardGeocode,
  searchPlacesSmart,
  PlaceSuggestion,
  getCurrentUserCoordinates,
  formatDistance,
} from "../../../utils/geocoding";

interface SendLocationPickerScreenProps extends Nav {}

export const SendLocationPickerScreen: React.FC<SendLocationPickerScreenProps> = ({
  navigate,
}) => {
  const { sender, setSender, recipient, setRecipient, pickerTarget } = useSendContext();

  const isSender = pickerTarget === "sender";
  const currentTargetData = isSender ? sender : recipient;

  // Active coordinates
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    currentTargetData.latitude != null && currentTargetData.longitude != null
      ? { latitude: currentTargetData.latitude, longitude: currentTargetData.longitude }
      : null
  );

  // User's own GPS anchor coordinates (used as search proximity center)
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Controlled map region for smooth focusing/panning
  const [mapRegion, setMapRegion] = useState<Region | undefined>(
    currentTargetData.latitude != null && currentTargetData.longitude != null
      ? {
          latitude: currentTargetData.latitude,
          longitude: currentTargetData.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }
      : undefined
  );

  const [addressTitle, setAddressTitle] = useState(currentTargetData.address || "");
  const [houseNumber, setHouseNumber] = useState("");
  const [landmark, setLandmark] = useState(currentTargetData.notes || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Live Smart Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (txt: string) => {
    setToastMsg(txt);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Reverse Geocoding with debounce
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performReverseGeocode = useCallback(async (lat: number, lon: number) => {
    setIsGeocoding(true);
    try {
      const result = await safeReverseGeocode(lat, lon);
      if (result && result.formattedAddress) {
        setAddressTitle(result.formattedAddress);
      }
    } catch (e) {
      console.warn("Geocode error:", e);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const triggerReverseGeocode = (lat: number, lon: number) => {
    setCoords({ latitude: lat, longitude: lon });
    setMapRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performReverseGeocode(lat, lon);
    }, 600);
  };

  // Proximity anchor: strictly uses User GPS -> Selected Pin -> Default Bogor operational center
  const anchorLat = userCoords?.latitude ?? coords?.latitude ?? -6.5962;
  const anchorLng = userCoords?.longitude ?? coords?.longitude ?? 106.8040;

  // Detect GPS Location on mount to initialize user anchor & position
  useEffect(() => {
    (async () => {
      try {
        const userLoc = await getCurrentUserCoordinates();
        if (userLoc) {
          const pos = { latitude: userLoc.latitude, longitude: userLoc.longitude };
          setUserCoords(pos);
          if (!coords) {
            setCoords(pos);
            setMapRegion({
              latitude: pos.latitude,
              longitude: pos.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            });
            setAddressTitle(userLoc.address || "Lokasi Saya");
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const userLoc = await getCurrentUserCoordinates();
      if (!userLoc) {
        showToast("Izin lokasi diperlukan untuk mendeteksi posisi GPS Anda.");
        return;
      }

      const pos = { latitude: userLoc.latitude, longitude: userLoc.longitude };
      setUserCoords(pos);
      setCoords(pos);
      setMapRegion({
        latitude: pos.latitude,
        longitude: pos.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
      setAddressTitle(userLoc.address || "Lokasi Saya");
      showToast("Titik lokasi diperbarui ke koordinat GPS Anda.");
    } catch (e: any) {
      showToast("Gagal mendeteksi lokasi GPS: " + (e.message || ""));
    } finally {
      setIsLocating(false);
    }
  };

  // Live Auto-complete Search with Debounce (Gojek / Grab style anchored to user location)
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const list = await searchPlacesSmart(text.trim(), {
          lat: anchorLat,
          lon: anchorLng,
          limit: 8,
        });
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  // User selects a suggestion: auto-focus map, update pin and populate address
  const handleSelectSuggestion = (item: PlaceSuggestion) => {
    const newCoords = { latitude: item.latitude, longitude: item.longitude };
    setCoords(newCoords);
    setMapRegion({
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
    const full = item.formattedAddress || (item.name + (item.subtitle ? `, ${item.subtitle}` : ""));
    setAddressTitle(full);
    setSearchQuery(item.name);
    setShowSuggestions(false);
    showToast(`Lokasi dipilih: ${item.name}`);
  };

  // Search Address on Enter / Submit
  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    setIsGeocoding(true);
    setShowSuggestions(false);
    try {
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
        return;
      }
      const geocoded = await safeForwardGeocode(searchQuery.trim(), {
        lat: anchorLat,
        lon: anchorLng,
      });
      if (geocoded) {
        const newPos = { latitude: geocoded.latitude, longitude: geocoded.longitude };
        setCoords(newPos);
        setMapRegion({
          latitude: newPos.latitude,
          longitude: newPos.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
        if (geocoded.formattedAddress) {
          setAddressTitle(geocoded.formattedAddress);
        } else {
          performReverseGeocode(geocoded.latitude, geocoded.longitude);
        }
        showToast(`Lokasi ditemukan: ${searchQuery}`);
      } else {
        showToast("Alamat tidak ditemukan. Coba gunakan nama jalan atau area.");
      }
    } catch (e) {
      showToast("Gagal mencari alamat.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Save and Return
  const handleConfirmLocation = async () => {
    let finalCoords = coords;

    if (!finalCoords && addressTitle.trim()) {
      setIsGeocoding(true);
      try {
        const geocoded = await safeForwardGeocode(addressTitle.trim());
        if (geocoded) {
          finalCoords = { latitude: geocoded.latitude, longitude: geocoded.longitude };
        }
      } catch (e) {
        console.warn("Geocode error on confirm:", e);
      } finally {
        setIsGeocoding(false);
      }

      // If geocoding service is unavailable/offline, fallback to center coords to allow manual entry
      if (!finalCoords) {
        finalCoords = { latitude: anchorLat, longitude: anchorLng };
      }
    }

    if (!finalCoords) {
      showToast("Tentukan titik lokasi pada peta atau ketik alamat lengkap.");
      return;
    }

    const finalAddress = [
      houseNumber ? `No. ${houseNumber}` : "",
      addressTitle.trim() || `Titik Lokasi (${finalCoords.latitude.toFixed(4)}, ${finalCoords.longitude.toFixed(4)})`,
    ]
      .filter(Boolean)
      .join(", ");

    if (isSender) {
      setSender((prev) => ({
        ...prev,
        latitude: finalCoords!.latitude,
        longitude: finalCoords!.longitude,
        address: finalAddress,
        notes: landmark || prev.notes,
      }));
    } else {
      setRecipient((prev) => ({
        ...prev,
        latitude: finalCoords!.latitude,
        longitude: finalCoords!.longitude,
        address: finalAddress,
        notes: landmark || prev.notes,
      }));
    }

    navigate("c_send");
  };

  const themeColor = isSender ? "#059669" : "#E11D48";

  // Markers to display on the map: selected pin + search suggestion pins
  const mapMarkers = useMemo(() => {
    const list: MapMarkerItem[] = [];

    // 1. Primary selected point
    if (coords) {
      list.push({
        id: "selected_point",
        coordinate: coords,
        title: isSender ? "Titik Penjemputan" : "Titik Tujuan",
        description: addressTitle || "Lokasi Terpilih",
        pinColor: themeColor,
        type: isSender ? "pickup" : "dropoff",
      });
    }

    // 2. Search suggestions as interactive markers on the map
    if (suggestions.length > 0) {
      suggestions.forEach((item, idx) => {
        // Skip duplicate of active selected coordinates
        if (
          coords &&
          Math.abs(item.latitude - coords.latitude) < 0.0001 &&
          Math.abs(item.longitude - coords.longitude) < 0.0001
        ) {
          return;
        }

        const distText = item.distanceKm != null ? formatDistance(item.distanceKm) : "";
        list.push({
          id: `sugg-${item.id || idx}`,
          coordinate: { latitude: item.latitude, longitude: item.longitude },
          title: item.name,
          description: [distText, item.subtitle || item.formattedAddress]
            .filter(Boolean)
            .join(" • "),
          pinColor: "#2563EB",
          type: "custom",
        });
      });
    }

    return list;
  }, [coords, suggestions, isSender, addressTitle, themeColor]);

  // When user taps a marker on the map: focus & select it
  const handleMarkerPress = (marker: MapMarkerItem) => {
    const matched = suggestions.find(
      (s) =>
        `sugg-${s.id}` === marker.id ||
        (Math.abs(s.latitude - marker.coordinate.latitude) < 0.0001 &&
          Math.abs(s.longitude - marker.coordinate.longitude) < 0.0001)
    );
    if (matched) {
      handleSelectSuggestion(matched);
    } else if (marker.coordinate) {
      triggerReverseGeocode(marker.coordinate.latitude, marker.coordinate.longitude);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Top Bar with Search */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate("c_send")} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchBarBox}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Search size={16} color="#94A3B8" />
          )}
          <TextInput
            style={styles.searchInput}
            placeholder="Cari jalan, gedung, atau patokan..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Floating Smart Autocomplete Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={item.id || `sugg-${idx}`}
                style={[
                  styles.suggestionItem,
                  idx === suggestions.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconBox}>
                  <MapPin size={15} color="#059669" />
                </View>
                <View style={styles.suggestionTextBox}>
                  <View style={styles.suggestionHeaderRow}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.distanceKm != null ? (
                      <View style={styles.distanceBadge}>
                        <Navigation size={10} color="#059669" style={styles.distanceIcon} />
                        <Text style={styles.distanceText}>
                          {formatDistance(item.distanceKm)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {item.subtitle ? (
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* In-App Toast */}
      {toastMsg && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={15} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* 2. Fullscreen Interactive Map */}
      <View style={styles.mapContainer}>
        <NativeMapComponent
          region={mapRegion}
          initialRegion={{
            latitude: anchorLat,
            longitude: anchorLng,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          onPress={(e) => {
            setShowSuggestions(false);
            const coordinate = e.nativeEvent?.coordinate;
            if (coordinate) {
              triggerReverseGeocode(coordinate.latitude, coordinate.longitude);
            }
          }}
          onMarkerPress={handleMarkerPress}
          markers={mapMarkers}
          interactive={true}
        />

        {/* Floating "Gunakan Lokasi Saya" Button */}
        <TouchableOpacity
          style={styles.myLocationFloatingBtn}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
          activeOpacity={0.85}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Navigation size={18} color="#059669" />
          )}
          <Text style={styles.myLocationFloatingText}>Lokasi Saya</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Bottom Sheet Address Details */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.bottomSheetContainer}
      >
        <View style={styles.sheetHeader}>
          <View style={[styles.targetBadge, { backgroundColor: isSender ? "#ECFDF5" : "#FFF1F2" }]}>
            <MapPin size={12} color={themeColor} />
            <Text style={[styles.targetBadgeText, { color: themeColor }]}>
              {isSender ? "TITIK PENJEMPUTAN" : "TITIK TUJUAN"}
            </Text>
          </View>
          {isGeocoding && <ActivityIndicator size="small" color={themeColor} />}
        </View>

        <TextInput
          style={styles.addressTitleInput}
          value={addressTitle}
          onChangeText={setAddressTitle}
          placeholder="Nama jalan atau alamat lengkap..."
          placeholderTextColor="#94A3B8"
          multiline
        />

        <View style={styles.formRow}>
          <TextInput
            style={[styles.inputField, { width: 110 }]}
            placeholder="No. Rumah"
            placeholderTextColor="#94A3B8"
            value={houseNumber}
            onChangeText={setHouseNumber}
          />
          <TextInput
            style={[styles.inputField, { flex: 1 }]}
            placeholder="Patokan lokasi (cth: pagar hitam)"
            placeholderTextColor="#94A3B8"
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: themeColor }]}
          onPress={handleConfirmLocation}
          activeOpacity={0.88}
        >
          <Check size={18} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>Gunakan Lokasi Ini</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
    zIndex: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  toastBox: {
    position: "absolute",
    top: 68,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  myLocationFloatingBtn: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  myLocationFloatingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  addressTitleInput: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    minHeight: 44,
    padding: 0,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  confirmBtn: {
    borderRadius: 16,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  suggestionsContainer: {
    position: "absolute",
    top: 68,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 280,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  suggestionsList: {
    maxHeight: 320,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  suggestionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTextBox: {
    flex: 1,
  },
  suggestionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: 8,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  distanceIcon: {
    marginRight: 3,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
});
