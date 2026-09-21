import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Bike,
  Car,
  Clock,
  Home,
  Briefcase,
  Bookmark,
  Banknote,
  Wallet,
  QrCode,
  Building2,
  Crosshair,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
} from "lucide-react-native";
import * as Location from "expo-location";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  createRideBooking,
  calculateRideFare,
  estimateRideFareBreakdown,
  FareEstimateResult,
  RideLocation,
  fetchActiveCustomerRide,
} from "../../services/rideService";
import { fetchDrivingRoute, RideRoute } from "../../services/routeService";
import { CustomerLocationPicker, CustomerLocationValue } from "../../components/CustomerLocationPicker";
import { NativeMapComponent } from "../../components/NativeMapComponent";
import { rp } from "../../utils/formatters";
import { DigitalPaymentModal } from "../../components/DigitalPaymentModal";
import { PaymentMethodType } from "../../services/paymentService";

interface CustomerRideScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerRideScreen: React.FC<CustomerRideScreenProps> = ({
  navigate,
  authAccount,
}) => {
  // Pickup state
  const [pickup, setPickup] = useState<RideLocation>({
    address: authAccount?.address || "",
    placeName: "Lokasi Saya",
    latitude: null,
    longitude: null,
  });

  // Destination state
  const [destination, setDestination] = useState<RideLocation>({
    address: "",
    placeName: "",
    latitude: null,
    longitude: null,
  });

  // Vehicle selection (Motor is available, Car is coming soon)
  const [selectedVehicle, setSelectedVehicle] = useState<"MOTOR" | "CAR">("MOTOR");

  // Driver notes
  const [customerNote, setCustomerNote] = useState("");

  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>("CASH");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [createdOrderForPayment, setCreatedOrderForPayment] = useState<any>(null);

  // Location Picker Modal state
  const [pickerTarget, setPickerTarget] = useState<"pickup" | "destination" | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  // Loading states
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Backend Fare Breakdown State
  const [fareBreakdown, setFareBreakdown] = useState<FareEstimateResult | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Road route state
  const [rideRoute, setRideRoute] = useState<RideRoute | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState("");
  const routeRequestRef = useRef(0);

  // Calculate an actual road route whenever both selected coordinates change.
  useEffect(() => {
    const hasCoordinates = (location: RideLocation) =>
      typeof location.latitude === "number" &&
      Number.isFinite(location.latitude) &&
      typeof location.longitude === "number" &&
      Number.isFinite(location.longitude);
    const hasAddresses = Boolean(pickup.address.trim() && destination.address.trim());
    const pickupPoint = hasCoordinates(pickup)
      ? { latitude: pickup.latitude as number, longitude: pickup.longitude as number }
      : null;
    const destinationPoint = hasCoordinates(destination)
      ? { latitude: destination.latitude as number, longitude: destination.longitude as number }
      : null;
    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;

    setRideRoute(null);
    setRouteError(
      hasAddresses && (!pickupPoint || !destinationPoint)
        ? "Pilih titik pickup dan tujuan dari peta agar rute dapat dihitung."
        : ""
    );

    if (!pickupPoint || !destinationPoint || !hasAddresses) {
      setIsCalculatingRoute(false);
      return;
    }

    let active = true;
    setIsCalculatingRoute(true);

    const timer = setTimeout(async () => {
      try {
        const route = await fetchDrivingRoute(pickupPoint, destinationPoint);
        if (active && routeRequestRef.current === requestId) {
          setRideRoute(route);
          setRouteError("");
        }
      } catch (error) {
        console.warn("Driving route error:", error);
        if (active && routeRequestRef.current === requestId) {
          setRideRoute(null);
          setRouteError("Rute jalan tidak tersedia. Periksa koneksi atau pilih titik lain.");
        }
      } finally {
        if (active && routeRequestRef.current === requestId) setIsCalculatingRoute(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pickup.address, pickup.latitude, pickup.longitude, destination.address, destination.latitude, destination.longitude]);

  // Request the backend fare using the road distance and duration.
  useEffect(() => {
    if (!rideRoute || !pickup.address.trim() || !destination.address.trim()) {
      setFareBreakdown(null);
      setIsCalculatingFare(false);
      return;
    }

    let active = true;
    setIsCalculatingFare(true);
    setFareBreakdown(null);

    const timer = setTimeout(async () => {
      try {
        const res = await estimateRideFareBreakdown({
          pickup: {
            latitude: pickup.latitude,
            longitude: pickup.longitude,
            address: pickup.address,
          },
          destination: {
            latitude: destination.latitude,
            longitude: destination.longitude,
            address: destination.address,
          },
          routeDistanceKm: rideRoute.distanceKm,
          routeDurationMinutes: rideRoute.durationMinutes,
          vehicleType: selectedVehicle === "CAR" ? "MOBIL" : "MOTOR",
        });

        if (active && res.success && res.data) setFareBreakdown(res.data);
      } catch (error) {
        console.warn("Backend fare estimate error:", error);
      } finally {
        if (active) setIsCalculatingFare(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    rideRoute,
    pickup.address,
    pickup.latitude,
    pickup.longitude,
    destination.address,
    destination.latitude,
    destination.longitude,
    selectedVehicle,
  ]);

  // Check if there is already an active ride order; if yes, offer to resume
  useEffect(() => {
    if (!authAccount?.id) return;
    let active = true;
    void fetchActiveCustomerRide(authAccount.id).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        Alert.alert(
          "Perjalanan Sedang Berjalan",
          `Anda memiliki perjalanan aktif (${res.data.status}). Buka pelacakan sekarang?`,
          [
            { text: "Tetap di sini", style: "cancel" },
            { text: "Buka Pelacakan", onPress: () => navigate("c_ride_tracking") },
          ]
        );
      }
    });
    return () => {
      active = false;
    };
  }, [authAccount?.id]);

  // Request current GPS location for pickup
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Ditolak",
          "Aktifkan izin lokasi pada perangkat Anda untuk mendeteksi posisi penjemputan secara otomatis."
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      let detectedAddress = "Lokasi Saya Saat Ini";
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (reverse && reverse.length > 0) {
          const item = reverse[0];
          detectedAddress = [
            item.name && item.name !== item.street ? item.name : "",
            item.street,
            item.district,
            item.city,
          ]
            .filter(Boolean)
            .join(", ") || "Lokasi Saya Saat Ini";
        }
      } catch {
        // Fallback to default label
      }

      setPickup({
        address: detectedAddress,
        placeName: "Lokasi Terdeteksi",
        latitude: lat,
        longitude: lng,
      });
    } catch (err) {
      console.error("Location error:", err);
      Alert.alert("Lokasi Gagal Dibaca", "Tidak dapat membaca GPS saat ini. Silakan tentukan manual.");
    } finally {
      setIsLocating(false);
    }
  };

  // Open Location Picker for pickup or destination
  const openLocationPicker = (target: "pickup" | "destination") => {
    setPickerTarget(target);
    setLocationPickerVisible(true);
  };

  const handleLocationConfirmed = (val: CustomerLocationValue) => {
    const loc: RideLocation = {
      address: val.detectedAddress || `${val.latitude.toFixed(4)}, ${val.longitude.toFixed(4)}`,
      placeName: pickerTarget === "pickup" ? "Lokasi Jemput" : "Tujuan Perjalanan",
      latitude: val.latitude,
      longitude: val.longitude,
    };

    if (pickerTarget === "pickup") {
      setPickup(loc);
    } else {
      setDestination(loc);
    }
    setLocationPickerVisible(false);
    setPickerTarget(null);
  };

  // Quick Location buttons
  const handleSelectQuickLocation = (type: "home" | "office" | "saved") => {
    let targetName = "";
    let targetAddress = "";

    if (type === "home") {
      targetName = "Rumah";
      targetAddress = authAccount?.address || "Jl. Raya Kamojang No. 12, Jawa Barat";
    } else if (type === "office") {
      targetName = "Kantor";
      targetAddress = "Pusat Kegiatan Rangers Kamojang";
    } else {
      targetName = "Tersimpan";
      targetAddress = "Perumahan Kamojang Indah Blok B";
    }

    setDestination({
      address: targetAddress,
      placeName: targetName,
      latitude: null,
      longitude: null,
    });
  };

  // Route metrics come only from the road-routing response.
  const calculatedDistance = useMemo(() => rideRoute?.distanceKm || 0, [rideRoute]);

  const estimatedDuration = useMemo(() => rideRoute?.durationMinutes || 0, [rideRoute]);

  const estimatedFare = useMemo(() => {
    if (fareBreakdown?.estimatedFare) return fareBreakdown.estimatedFare;
    if (!rideRoute) return 0;
    return calculateRideFare(rideRoute.distanceKm);
  }, [fareBreakdown?.estimatedFare, rideRoute]);

  const hasPickupCoordinates =
    typeof pickup.latitude === "number" &&
    Number.isFinite(pickup.latitude) &&
    typeof pickup.longitude === "number" &&
    Number.isFinite(pickup.longitude);
  const hasDestinationCoordinates =
    typeof destination.latitude === "number" &&
    Number.isFinite(destination.latitude) &&
    typeof destination.longitude === "number" &&
    Number.isFinite(destination.longitude);

  const canOrder = Boolean(
    pickup.address.trim() &&
      destination.address.trim() &&
      hasPickupCoordinates &&
      hasDestinationCoordinates &&
      rideRoute &&
      !isCalculatingRoute &&
      !routeError &&
      selectedVehicle === "MOTOR" &&
      !isSubmitting
  );

  const rideMarkers = useMemo(() => {
    const markers: Array<{
      id: string;
      coordinate: { latitude: number; longitude: number };
      title: string;
      pinColor: string;
      type: "pickup" | "dropoff";
    }> = [];

    if (hasPickupCoordinates) {
      markers.push({
        id: "pickup",
        coordinate: { latitude: pickup.latitude as number, longitude: pickup.longitude as number },
        title: "Lokasi Penjemputan",
        pinColor: "#16A34A",
        type: "pickup",
      });
    }
    if (hasDestinationCoordinates) {
      markers.push({
        id: "destination",
        coordinate: { latitude: destination.latitude as number, longitude: destination.longitude as number },
        title: "Tujuan Perjalanan",
        pinColor: "#DC2626",
        type: "dropoff",
      });
    }
    return markers;
  }, [
    hasPickupCoordinates,
    pickup.latitude,
    pickup.longitude,
    hasDestinationCoordinates,
    destination.latitude,
    destination.longitude,
  ]);
  const pickerLocation = pickerTarget === "destination" ? destination : pickup;
  const pickerInitialLocation =
    typeof pickerLocation.latitude === "number" && typeof pickerLocation.longitude === "number"
      ? {
          latitude: pickerLocation.latitude,
          longitude: pickerLocation.longitude,
          detectedAddress: pickerLocation.address,
        }
      : undefined;

  // Submit Order
  const handleOrderRide = async () => {
    if (!pickup.address.trim()) {
      Alert.alert("Lokasi Penjemputan Kosong", "Silakan tentukan lokasi penjemputan.");
      return;
    }
    if (!destination.address.trim()) {
      Alert.alert("Lokasi Tujuan Kosong", "Silakan tentukan lokasi tujuan Anda.");
      return;
    }
    if (selectedVehicle === "CAR") {
      Alert.alert("Kanyaah Car Belum Tersedia", "Layanan Kanyaah Car sedang dalam proses pengembangan.");
      return;
    }
    if (!hasPickupCoordinates || !hasDestinationCoordinates) {
      Alert.alert("Titik Lokasi Belum Lengkap", "Pilih pickup dan tujuan melalui peta agar koordinatnya valid.");
      return;
    }
    if (isCalculatingRoute) {
      Alert.alert("Rute Sedang Dihitung", "Tunggu sampai rute jalan selesai dihitung.");
      return;
    }
    if (!rideRoute || routeError) {
      Alert.alert("Rute Tidak Tersedia", routeError || "Rute jalan belum berhasil ditemukan.");
      return;
    }
    if (pickup.address.trim().toLowerCase() === destination.address.trim().toLowerCase()) {
      Alert.alert("Alamat Tidak Valid", "Lokasi penjemputan dan tujuan tidak boleh sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRideBooking({
        customerId: authAccount?.id,
        customerName: authAccount?.name,
        customerPhone: authAccount?.phone,
        pickup,
        destination,
        customerNote: customerNote.trim(),
        vehicleType: "MOTOR",
        paymentMethod: selectedPaymentMethod,
        estimatedDistance: calculatedDistance,
        estimatedDuration,
        routeDistanceKm: rideRoute.distanceKm,
        routeDurationMinutes: rideRoute.durationMinutes,
        estimatedFare,
      });

      if (!res.success || !res.data) {
        Alert.alert("Gagal Membuat Pesanan", res.message || "Silakan periksa koneksi lalu coba lagi.");
        return;
      }

      // Success -> If cash, go straight to tracking. If digital, open payment modal first
      if (selectedPaymentMethod === "CASH") {
        navigate("c_ride_tracking");
      } else {
        setCreatedOrderForPayment(res.data);
        setPaymentModalVisible(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghubungkan ke server.";
      Alert.alert("Terjadi Kesalahan", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Kanyaah Ride</Text>
          <Text style={styles.headerSub}>Mau pergi ke mana?</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Supporting Text */}
        <View style={styles.bannerBox}>
          <View style={styles.bannerIconBox}>
            <Bike size={24} color="#1B7A4E" />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Kanyaah Ride</Text>
            <Text style={styles.bannerSub}>Perjalanan nyaman bersama Rangers.</Text>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>RUTE PERJALANAN</Text>

          {/* Pickup Field */}
          <View style={styles.locationInputRow}>
            <View style={styles.pinIndicatorCol}>
              <View style={[styles.dotCircle, { backgroundColor: "#1B7A4E" }]} />
              <View style={styles.dottedLine} />
              <View style={[styles.dotCircle, { backgroundColor: "#EA580C" }]} />
            </View>

            <View style={styles.inputsCol}>
              {/* Pickup */}
              <View style={styles.inputGroup}>
                <View style={styles.inputHeaderRow}>
                  <Text style={styles.fieldLabel}>Lokasi Penjemputan</Text>
                  <TouchableOpacity
                    style={styles.detectLocationBtn}
                    onPress={handleUseCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#1B7A4E" />
                    ) : (
                      <>
                        <Crosshair size={13} color="#1B7A4E" />
                        <Text style={styles.detectLocationText}>Lokasi saya saat ini</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.inputBox}
                  onPress={() => openLocationPicker("pickup")}
                  activeOpacity={0.8}
                >
                  <MapPin size={16} color="#1B7A4E" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tentukan lokasi penjemputan"
                    placeholderTextColor="#94A3B8"
                    value={pickup.address}
                    onChangeText={(text) =>
                      setPickup((prev) => ({ ...prev, address: text, latitude: null, longitude: null }))
                    }
                  />
                  <TouchableOpacity onPress={() => openLocationPicker("pickup")}>
                    <Text style={styles.mapPinActionText}>Peta</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>

              {/* Destination */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Mau pergi ke mana?</Text>
                <TouchableOpacity
                  style={[styles.inputBox, !destination.address && styles.inputBoxHighlight]}
                  onPress={() => openLocationPicker("destination")}
                  activeOpacity={0.8}
                >
                  <Navigation size={16} color="#EA580C" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ketik alamat tujuan Anda..."
                    placeholderTextColor="#94A3B8"
                    value={destination.address}
                    onChangeText={(text) =>
                      setDestination((prev) => ({ ...prev, address: text, latitude: null, longitude: null }))
                    }
                  />
                  <TouchableOpacity onPress={() => openLocationPicker("destination")}>
                    <Text style={styles.mapPinActionText}>Peta</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Locations */}
          <View style={styles.quickLocationsSection}>
            <Text style={styles.quickLocationTitle}>Lokasi Cepat</Text>
            <View style={styles.quickLocationsRow}>
              <TouchableOpacity
                style={styles.quickLocationBtn}
                onPress={() => handleSelectQuickLocation("home")}
                activeOpacity={0.7}
              >
                <Home size={15} color="#1B7A4E" />
                <Text style={styles.quickLocationLabel}>Rumah</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLocationBtn}
                onPress={() => handleSelectQuickLocation("office")}
                activeOpacity={0.7}
              >
                <Briefcase size={15} color="#0284C7" />
                <Text style={styles.quickLocationLabel}>Kantor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLocationBtn}
                onPress={() => handleSelectQuickLocation("saved")}
                activeOpacity={0.7}
              >
                <Bookmark size={15} color="#9333EA" />
                <Text style={styles.quickLocationLabel}>Tersimpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Map Preview with selected markers and the routed road geometry */}
        {hasPickupCoordinates && (
          <View style={styles.mapPreviewWrapper}>
            <NativeMapComponent
              markers={rideMarkers}
              routeCoordinates={rideRoute?.coordinates}
              routeColor="#DC2626"
              fitToRoute={Boolean(rideRoute)}
              showRouteLine={Boolean(rideRoute)}
              style={styles.mapPreviewFrame}
            />
            <View style={styles.mapBadge}>
              {isCalculatingRoute ? (
                <View style={styles.mapBadgeRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.mapBadgeText}>Menghitung rute...</Text>
                </View>
              ) : (
                <Text style={styles.mapBadgeText}>
                  {rideRoute ? `${calculatedDistance.toFixed(1)} km · ${estimatedDuration} mnt` : "Pilih tujuan di peta"}
                </Text>
              )}
            </View>
          </View>
        )}
        {routeError && (
          <View style={styles.routeStatusError}>
            <AlertCircle size={16} color="#B91C1C" />
            <Text style={styles.routeStatusText}>{routeError}</Text>
          </View>
        )}

        {/* Section: Pilih Kendaraan */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>PILIH KENDARAAN</Text>

          {/* Vehicle 1: Kanyaah Motor (AVAILABLE) */}
          <TouchableOpacity
            style={[
              styles.vehicleOptionCard,
              selectedVehicle === "MOTOR" && styles.vehicleOptionCardActive,
            ]}
            onPress={() => setSelectedVehicle("MOTOR")}
            activeOpacity={0.8}
          >
            <View style={[styles.vehicleIconBg, { backgroundColor: "#E8F5EE" }]}>
              <Bike size={26} color="#1B7A4E" />
            </View>

            <View style={styles.vehicleInfoCol}>
              <View style={styles.vehicleTitleRow}>
                <Text style={styles.vehicleTitle}>Kanyaah Motor</Text>
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>AVAILABLE</Text>
                </View>
              </View>
              <Text style={styles.vehicleDesc}>Cepat & praktis</Text>
              <View style={styles.vehicleMetricsRow}>
                <Clock size={12} color="#64748B" />
                <Text style={styles.vehicleMetricText}>
                  Tiba ~3-5 mnt · Perjalanan {estimatedDuration > 0 ? `${estimatedDuration} mnt` : "Pilih rute"}
                </Text>
              </View>
            </View>

            <View style={styles.vehiclePriceCol}>
              {estimatedFare > 0 ? (
                <Text style={styles.vehiclePriceText}>{rp(estimatedFare)}</Text>
              ) : (
                <Text style={styles.vehiclePricePlaceholder}>Rp 8.000+</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Vehicle 2: Kanyaah Car (COMING SOON) */}
          <TouchableOpacity
            style={[styles.vehicleOptionCard, styles.vehicleOptionCardDisabled]}
            activeOpacity={1}
            disabled={true}
            onPress={() =>
              Alert.alert("Coming Soon", "Layanan Kanyaah Car saat ini masih dalam persiapan.")
            }
          >
            <View style={[styles.vehicleIconBg, { backgroundColor: "#F1F5F9" }]}>
              <Car size={26} color="#94A3B8" />
            </View>

            <View style={styles.vehicleInfoCol}>
              <View style={styles.vehicleTitleRow}>
                <Text style={[styles.vehicleTitle, { color: "#94A3B8" }]}>Kanyaah Car</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                </View>
              </View>
              <Text style={[styles.vehicleDesc, { color: "#94A3B8" }]}>Nyaman untuk bepergian bersama</Text>
            </View>

            <View style={styles.vehiclePriceCol}>
              <Text style={[styles.vehiclePricePlaceholder, { color: "#CBD5E1" }]}>-</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Catatan Untuk Driver */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>CATATAN UNTUK DRIVER (OPSIONAL)</Text>
          <View style={styles.noteInputBox}>
            <TextInput
              style={styles.noteTextInput}
              placeholder="Contoh: tunggu di depan gerbang / warna jaket hitam"
              placeholderTextColor="#94A3B8"
              value={customerNote}
              onChangeText={setCustomerNote}
              maxLength={150}
            />
            <Text style={styles.charCount}>{customerNote.length}/150</Text>
          </View>
        </View>

        {/* Section: Metode Pembayaran */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.cardSectionLabel}>METODE PEMBAYARAN</Text>
            <TouchableOpacity onPress={() => setPaymentModalVisible(true)} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#1B7A4E" }}>Ubah</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.paymentMethodRow}
            onPress={() => setPaymentModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.paymentMethodIconBg, { backgroundColor: selectedPaymentMethod === "QRIS" ? "#FFE4E6" : selectedPaymentMethod === "CASH" ? "#E8F5EE" : "#E0F2FE" }]}>
              {selectedPaymentMethod === "QRIS" ? (
                <QrCode size={20} color="#E11D48" />
              ) : selectedPaymentMethod === "CASH" ? (
                <Banknote size={20} color="#1B7A4E" />
              ) : selectedPaymentMethod.endsWith("_VA") ? (
                <Building2 size={20} color="#0060AF" />
              ) : (
                <Wallet size={20} color="#0284C7" />
              )}
            </View>
            <View style={styles.paymentMethodBody}>
              <Text style={styles.paymentMethodTitle}>
                {selectedPaymentMethod === "CASH"
                  ? "Bayar Tunai (COD)"
                  : selectedPaymentMethod === "QRIS"
                  ? "QRIS Nasional"
                  : selectedPaymentMethod.endsWith("_VA")
                  ? `Bank Transfer (${selectedPaymentMethod.replace("_VA", "")})`
                  : `E-Wallet ${selectedPaymentMethod}`}
              </Text>
              <Text style={styles.paymentMethodSub}>
                {selectedPaymentMethod === "CASH"
                  ? "Bayar langsung ke driver setelah perjalanan"
                  : "Pembayaran digital instan & otomatis terverifikasi"}
              </Text>
            </View>
            <View style={styles.paymentMethodBadge}>
              <Text style={styles.paymentMethodBadgeText}>
                {selectedPaymentMethod === "CASH" ? "Tunai" : "Digital"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Ringkasan Perjalanan */}
        {destination.address.trim().length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>RINGKASAN PERJALANAN</Text>

            <View style={styles.summaryRoute}>
              <View style={styles.summaryPoint}>
                <Text style={styles.summaryPointLabel}>Penjemputan</Text>
                <Text style={styles.summaryPointText}>{pickup.address}</Text>
              </View>

              <View style={styles.summaryArrow}>
                <ChevronRight size={16} color="#94A3B8" style={{ transform: [{ rotate: "90deg" }] }} />
              </View>

              <View style={styles.summaryPoint}>
                <Text style={styles.summaryPointLabel}>Tujuan</Text>
                <Text style={styles.summaryPointText}>{destination.address}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryDetailsGrid}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kendaraan</Text>
                <Text style={styles.summaryVal}>Kanyaah Motor</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jarak</Text>
                <Text style={styles.summaryVal}>{calculatedDistance} km</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimasi Waktu</Text>
                <Text style={styles.summaryVal}>{estimatedDuration} menit</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Metode Bayar</Text>
                <Text style={styles.summaryVal}>
                  {selectedPaymentMethod === "CASH"
                    ? "Bayar Tunai"
                    : selectedPaymentMethod === "QRIS"
                    ? "QRIS Nasional"
                    : selectedPaymentMethod.endsWith("_VA")
                    ? `Bank Transfer (${selectedPaymentMethod.replace("_VA", "")})`
                    : `E-Wallet ${selectedPaymentMethod}`}
                </Text>
              </View>
              {/* Transparent backend fare breakdown */}
              {fareBreakdown && (
                <View style={styles.fareBreakdownBox}>
                  <Text style={styles.fareBreakdownHeader}>RINCIAN TARIF TRANSPARAN</Text>
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>Tarif Dasar (2 km awal)</Text>
                    <Text style={styles.fareBreakdownVal}>{rp(fareBreakdown.baseFare)}</Text>
                  </View>
                  {fareBreakdown.distanceFare > 0 && (
                    <View style={styles.fareBreakdownRow}>
                      <Text style={styles.fareBreakdownLabel}>Biaya Jarak ({calculatedDistance} km)</Text>
                      <Text style={styles.fareBreakdownVal}>{rp(fareBreakdown.distanceFare)}</Text>
                    </View>
                  )}
                  {fareBreakdown.timeFare > 0 && (
                    <View style={styles.fareBreakdownRow}>
                      <Text style={styles.fareBreakdownLabel}>Estimasi Waktu ({estimatedDuration} mnt)</Text>
                      <Text style={styles.fareBreakdownVal}>{rp(fareBreakdown.timeFare)}</Text>
                    </View>
                  )}
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>Biaya Layanan Platform</Text>
                    <Text style={styles.fareBreakdownVal}>{rp(fareBreakdown.serviceFee)}</Text>
                  </View>
                  {fareBreakdown.discount > 0 && (
                    <View style={styles.fareBreakdownRow}>
                      <Text style={[styles.fareBreakdownLabel, { color: "#15803D" }]}>Diskon Promo</Text>
                      <Text style={[styles.fareBreakdownVal, { color: "#15803D", fontWeight: "700" }]}>-{rp(fareBreakdown.discount)}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.summaryRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
                <View>
                  <Text style={[styles.summaryLabel, { fontWeight: "800", color: "#0F172A", fontSize: 13 }]}>Total Tarif</Text>
                  {isCalculatingFare && <Text style={{ fontSize: 10, color: "#94A3B8" }}>Menghitung tarif resmi...</Text>}
                </View>
                <Text style={[styles.summaryVal, { fontWeight: "900", color: "#1B7A4E", fontSize: 17 }]}>
                  {rp(estimatedFare)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Safety info notice */}
        <View style={styles.safetyCard}>
          <ShieldCheck size={18} color="#15803D" />
          <Text style={styles.safetyText}>
            Driver Rangers telah terverifikasi resmi oleh komunitas lokal GEOVERSE Kamojang.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky Bottom Order Button */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerPriceCol}>
          <Text style={styles.footerPriceLabel}>Estimasi Tarif</Text>
          <Text style={styles.footerPriceVal}>
            {estimatedFare > 0 ? rp(estimatedFare) : "Rp -"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.orderButton, !canOrder && styles.orderButtonDisabled]}
          onPress={handleOrderRide}
          disabled={!canOrder}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Bike size={18} color="#FFFFFF" />
              <Text style={styles.orderButtonText}>Pesan Kanyaah Ride</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Digital Payment Modal */}
      <DigitalPaymentModal
        visible={paymentModalVisible}
        onClose={() => {
          setPaymentModalVisible(false);
          if (createdOrderForPayment) {
            navigate("c_ride_tracking");
          }
        }}
        orderId={createdOrderForPayment?._id || "temp-order-id"}
        amount={estimatedFare > 0 ? estimatedFare : 8000}
        initialMethod={selectedPaymentMethod}
        onPaymentSuccess={(payment) => {
          setSelectedPaymentMethod(payment.paymentMethod);
          setPaymentModalVisible(false);
          if (createdOrderForPayment) {
            navigate("c_ride_tracking");
          }
        }}
      />

      {/* Location Picker Modal */}
      <CustomerLocationPicker
        visible={locationPickerVisible}
        initialLocation={pickerInitialLocation}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={handleLocationConfirmed}
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  bannerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C6E7D4",
    gap: 12,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#064E3B",
  },
  bannerSub: {
    fontSize: 12,
    color: "#166534",
    marginTop: 2,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  locationInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  pinIndicatorCol: {
    alignItems: "center",
    paddingTop: 32,
    width: 16,
  },
  dotCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dottedLine: {
    width: 2,
    height: 60,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  inputsCol: {
    flex: 1,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  detectLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detectLocationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },
  inputBoxHighlight: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  mapPinActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1B7A4E",
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#E8F5EE",
    borderRadius: 6,
  },
  quickLocationsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  quickLocationTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  quickLocationsRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickLocationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  quickLocationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  mapPreviewWrapper: {
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mapPreviewFrame: {
    width: "100%",
    height: "100%",
  },
  mapBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  mapBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeStatusError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  routeStatusText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "600",
  },
  vehicleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 12,
  },
  vehicleOptionCardActive: {
    borderColor: "#1B7A4E",
    backgroundColor: "#F0FDF4",
  },
  vehicleOptionCardDisabled: {
    opacity: 0.6,
    borderColor: "#E2E8F0",
  },
  vehicleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfoCol: {
    flex: 1,
    gap: 2,
  },
  vehicleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  availableBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  availableBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
  comingSoonBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  comingSoonBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
  },
  vehicleDesc: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  vehicleMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  vehicleMetricText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  vehiclePriceCol: {
    alignItems: "flex-end",
  },
  vehiclePriceText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  vehiclePricePlaceholder: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  noteInputBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  noteTextInput: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "500",
    minHeight: 40,
  },
  charCount: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "right",
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  paymentMethodIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodBody: {
    flex: 1,
    gap: 1,
  },
  paymentMethodTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  paymentMethodSub: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
  },
  paymentMethodBadge: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentMethodBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  summaryRoute: {
    gap: 6,
  },
  summaryPoint: {
    gap: 1,
  },
  summaryPointLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  summaryPointText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryArrow: {
    alignItems: "flex-start",
    paddingLeft: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },
  summaryDetailsGrid: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
  safetyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 10,
  },
  safetyText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
    lineHeight: 15,
  },
  stickyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -3 },
  },
  footerPriceCol: {
    gap: 1,
  },
  footerPriceLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  footerPriceVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  orderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  orderButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  orderButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },

  fareBreakdownBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  fareBreakdownHeader: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fareBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareBreakdownLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  fareBreakdownVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
});