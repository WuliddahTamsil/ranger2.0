import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  TextInput,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  Bike,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  ChevronRight,
  AlertTriangle,
  X,
  Check,
  Compass,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchActiveCustomerRide,
  fetchCustomerRides,
  fetchRideDetail,
  updateRideStatus,
  rateRide,
  cancelRide,
  submitRideComplaint,
  RideOrderData,
} from "../../services/rideService";
import { CustomerChatModal } from "./CustomerChatModal";
import { SafeCallModal } from "../../components/SafeCallModal";
import { DigitalPaymentModal } from "../../components/DigitalPaymentModal";
import { NativeMapComponent, MapMarkerItem } from "../../components/NativeMapComponent";
import { fetchDrivingRoute } from "../../services/routeService";
import { rp } from "../../utils/formatters";
import { findKnownPoiByText } from "../../utils/geocoding";
import { subscribeToUserRealtime } from "../../services/userRealtime";

interface CustomerRideTrackingScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerRideTrackingScreen: React.FC<CustomerRideTrackingScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const [currentRide, setCurrentRide] = useState<RideOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState("Ingin mengubah alamat penjemputan / tujuan");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [safeCallVisible, setSafeCallVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // Rating states
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Complaint states
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState("Tarif tidak sesuai");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [complaintTicketId, setComplaintTicketId] = useState("");

  // Poll current active ride or most recent ride
  useEffect(() => {
    if (!authAccount?.id) return;
    let active = true;

    const loadRide = async () => {
      try {
        const targetedId = await AsyncStorage.getItem("selected_ride_tracking_id");
        if (targetedId) {
          const detailRes = await fetchRideDetail(targetedId);
          if (!active) return;
          if (detailRes.success && detailRes.data) {
            setCurrentRide(detailRes.data);
            setLoading(false);
            return;
          }
        }

        const activeRes = await fetchActiveCustomerRide(authAccount.id);
        if (!active) return;
        if (activeRes.success && activeRes.data) {
          setCurrentRide(activeRes.data);
          setLoading(false);
          return;
        }

        // If no active ride, get the most recent ride (could be COMPLETED or CANCELLED)
        const historyRes = await fetchCustomerRides(authAccount.id);
        if (!active) return;
        if (historyRes.success && historyRes.data && historyRes.data.length > 0) {
          setCurrentRide(historyRes.data[0]);
        }
      } catch (err) {
        console.error("Load tracking ride error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRide();
    const interval = setInterval(() => void loadRide(), 3000);

    let unsubscribeRealtime: () => void = () => undefined;
    void subscribeToUserRealtime(
      () => void loadRide(),
      (orderUpdate) => {
        void loadRide();
      }
    ).then((unsub) => {
      unsubscribeRealtime = unsub;
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeRealtime();
    };
  }, [authAccount?.id]);

  // Road geometry coordinates for polyline tracking
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }> | null>(null);

  useEffect(() => {
    const pickupPoi =
      currentRide?.pickup?.latitude && currentRide?.pickup?.longitude
        ? { latitude: Number(currentRide.pickup.latitude), longitude: Number(currentRide.pickup.longitude) }
        : findKnownPoiByText(currentRide?.pickup?.placeName) ||
          findKnownPoiByText(currentRide?.pickup?.address) || { latitude: -6.5888, longitude: 106.8068 };

    const destPoi =
      currentRide?.destination?.latitude && currentRide?.destination?.longitude
        ? { latitude: Number(currentRide.destination.latitude), longitude: Number(currentRide.destination.longitude) }
        : findKnownPoiByText(currentRide?.destination?.placeName) ||
          findKnownPoiByText(currentRide?.destination?.address) || { latitude: -6.6008, longitude: 106.8062 };

    if (!pickupPoi || !destPoi) {
      setRouteCoords(null);
      return;
    }

    let active = true;
    void fetchDrivingRoute(
      { latitude: pickupPoi.latitude, longitude: pickupPoi.longitude },
      { latitude: destPoi.latitude, longitude: destPoi.longitude }
    )
      .then((route) => {
        if (active && route?.coordinates) {
          setRouteCoords(route.coordinates);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [
    currentRide?.pickup?.latitude,
    currentRide?.pickup?.longitude,
    currentRide?.pickup?.address,
    currentRide?.pickup?.placeName,
    currentRide?.destination?.latitude,
    currentRide?.destination?.longitude,
    currentRide?.destination?.address,
    currentRide?.destination?.placeName,
  ]);

  // Comprehensive Markers for Live Tracking
  const trackingMarkers: MapMarkerItem[] = React.useMemo(() => {
    const list: MapMarkerItem[] = [];

    const pickupPoi =
      currentRide?.pickup?.latitude && currentRide?.pickup?.longitude
        ? { latitude: Number(currentRide.pickup.latitude), longitude: Number(currentRide.pickup.longitude) }
        : findKnownPoiByText(currentRide?.pickup?.placeName) ||
          findKnownPoiByText(currentRide?.pickup?.address) || { latitude: -6.5888, longitude: 106.8068 };

    const destPoi =
      currentRide?.destination?.latitude && currentRide?.destination?.longitude
        ? { latitude: Number(currentRide.destination.latitude), longitude: Number(currentRide.destination.longitude) }
        : findKnownPoiByText(currentRide?.destination?.placeName) ||
          findKnownPoiByText(currentRide?.destination?.address) || { latitude: -6.6008, longitude: 106.8062 };

    if (pickupPoi) {
      list.push({
        id: "pickup",
        coordinate: {
          latitude: pickupPoi.latitude,
          longitude: pickupPoi.longitude,
        },
        title:
          currentRide?.pickup?.placeName ||
          findKnownPoiByText(currentRide?.pickup?.address)?.placeName ||
          "Titik Jemput",
        description: currentRide?.pickup?.address || "Lokasi Penjemputan",
        pinColor: "#16A34A",
        type: "pickup",
      });
    }

    if (destPoi) {
      list.push({
        id: "destination",
        coordinate: {
          latitude: destPoi.latitude,
          longitude: destPoi.longitude,
        },
        title:
          currentRide?.destination?.placeName ||
          findKnownPoiByText(currentRide?.destination?.address)?.placeName ||
          "Tujuan Perjalanan",
        description: currentRide?.destination?.address || "Lokasi Tujuan",
        pinColor: "#DC2626",
        type: "dropoff",
      });
    }

    if (currentRide?.driverLocation?.latitude && currentRide?.driverLocation?.longitude) {
      list.push({
        id: "driver",
        coordinate: {
          latitude: Number(currentRide.driverLocation.latitude),
          longitude: Number(currentRide.driverLocation.longitude),
        },
        title: currentRide.driverName || "Driver Rangers",
        description: currentRide.driverPlate ? `Motor · ${currentRide.driverPlate}` : "Sedang dalam perjalanan",
        pinColor: "#2563EB",
        type: "driver",
      });
    }
    return list;
  }, [
    currentRide?.pickup?.latitude,
    currentRide?.pickup?.longitude,
    currentRide?.pickup?.placeName,
    currentRide?.pickup?.address,
    currentRide?.destination?.latitude,
    currentRide?.destination?.longitude,
    currentRide?.destination?.placeName,
    currentRide?.destination?.address,
    currentRide?.driverLocation?.latitude,
    currentRide?.driverLocation?.longitude,
    currentRide?.driverName,
    currentRide?.driverPlate,
  ]);

  // Cancel ride handler with tiered cancellation policy
  const handleCancelRide = async () => {
    if (!currentRide) return;

    if (currentRide.status === "TRIP_STARTED") {
      if (Platform.OS === "web") {
        window.alert(
          "Perjalanan sudah dimulai bersama driver dan tidak dapat dibatalkan dari aplikasi penumpang."
        );
      } else {
        Alert.alert(
          "Tidak Dapat Membatalkan",
          "Perjalanan sudah dimulai bersama driver dan tidak dapat dibatalkan dari aplikasi penumpang."
        );
      }
      return;
    }

    if (Platform.OS === "web") {
      const feeNote =
        currentRide.status === "SEARCHING_DRIVER"
          ? "Driver belum ditugaskan. Pembatalan ini GRATIS tanpa biaya."
          : currentRide.status === "DRIVER_ARRIVED"
          ? "Driver sudah tiba di titik jemput. Pembatalan dikenakan biaya Rp 5.000."
          : "Driver sedang menuju lokasi penjemputan. Pembatalan dikenakan biaya Rp 3.000.";

      const confirmed = window.confirm(
        `Batalkan Perjalanan Kanyaah Ride?\n\n${feeNote}\n\nTekan OK untuk membatalkan pesanan sekarang.`
      );
      if (confirmed) {
        await executeCancelRide("Dibatalkan oleh pelanggan via Web");
        return;
      }
      return;
    }

    setCancelModalVisible(true);
  };

  const executeCancelRide = async (overrideReason?: string) => {
    if (!currentRide) return;
    setIsCancelling(true);
    try {
      const reasonToSubmit =
        overrideReason ||
        (selectedCancelReason === "Lainnya" && customCancelReason.trim()
          ? customCancelReason.trim()
          : selectedCancelReason || "Dibatalkan oleh pelanggan");

      const orderTargetId = currentRide._id || (currentRide as any).orderCode;
      const res = await cancelRide(orderTargetId, {
        reason: reasonToSubmit,
        cancelledBy: "CUSTOMER",
      });

      if (res.success) {
        const updated = res.data || {
          ...currentRide,
          status: "CANCELLED" as const,
          cancelReason: reasonToSubmit,
        };
        setCurrentRide(updated);
        setCancelModalVisible(false);
        await AsyncStorage.removeItem("selected_ride_tracking_id").catch(() => {});
        const feeText = updated.cancellation?.fee
          ? ` Biaya pembatalan: Rp ${updated.cancellation.fee.toLocaleString("id-ID")}.`
          : "";
        if (Platform.OS === "web") {
          window.alert(`Pesanan Anda telah dibatalkan.${feeText}`);
        } else {
          Alert.alert("Perjalanan Dibatalkan", `Pesanan Anda telah dibatalkan.${feeText}`);
        }
      } else {
        const errorMsg = res.message || "Gagal membatalkan pesanan. Silakan coba lagi.";
        if (Platform.OS === "web") {
          window.alert(errorMsg);
        } else {
          Alert.alert("Gagal Membatalkan", errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || "Terjadi kesalahan saat membatalkan perjalanan.";
      if (Platform.OS === "web") {
        window.alert(errorMsg);
      } else {
        Alert.alert("Gagal", errorMsg);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Submit Complaint handler
  const handleSubmitComplaint = async () => {
    if (!currentRide) {
      if (Platform.OS === "web") {
        window.alert("Pesanan tidak ditemukan.");
      } else {
        Alert.alert("Gagal", "Pesanan tidak ditemukan.");
      }
      return;
    }

    const resolvedCategory = complaintCategory || "Lainnya";
    const resolvedDescription = complaintDescription.trim() || `Laporan masalah terkait: ${resolvedCategory}`;

    setIsSubmittingComplaint(true);
    try {
      const res = await submitRideComplaint(currentRide._id, {
        category: resolvedCategory,
        description: resolvedDescription,
      });
      if (res.success) {
        setComplaintSubmitted(true);
        setComplaintTicketId(res.data?.ticketId || "RNG-TKT");
      } else {
        const errorMsg = res.message || "Silakan coba lagi.";
        if (Platform.OS === "web") {
          window.alert(errorMsg);
        } else {
          Alert.alert("Gagal Mengajukan", errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || "Terjadi kesalahan saat mengirim pengaduan.";
      if (Platform.OS === "web") {
        window.alert(errorMsg);
      } else {
        Alert.alert("Gagal", errorMsg);
      }
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Call driver via Phone app
  const handleCallDriver = () => {
    setSafeCallVisible(true);
  };

  // Submit Driver Rating
  const handleSubmitRating = async () => {
    if (!currentRide) return;
    setIsSubmittingRating(true);
    try {
      const res = await rateRide(currentRide._id, ratingVal, reviewText.trim());
      if (res.success) {
        setRatingSubmitted(true);
        Alert.alert("Terima Kasih", "Penilaian Anda berhasil disimpan!");
      } else {
        Alert.alert("Gagal", res.message || "Penilaian belum tersimpan.");
      }
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Terjadi kesalahan saat mengirim rating.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1B7A4E" />
          <Text style={styles.loadingText}>Memuat status perjalanan...</Text>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  if (!currentRide) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate("c_home")}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Status Perjalanan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Bike size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Tidak ada perjalanan aktif</Text>
          <Text style={styles.emptySub}>Mulai pesan Kanyaah Ride untuk bepergian.</Text>
          <TouchableOpacity
            style={styles.orderNowBtn}
            onPress={() => navigate("c_ride")}
            activeOpacity={0.8}
          >
            <Text style={styles.orderNowBtnText}>Pesan Sekarang</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  const status = currentRide.status;
  const isSearching = status === "SEARCHING_DRIVER";
  const hasDriver = [
    "DRIVER_ASSIGNED",
    "DRIVER_ON_THE_WAY",
    "DRIVER_ARRIVED",
    "TRIP_STARTED",
  ].includes(status);
  const isCompleted = status === "COMPLETED";
  const isCancelled = status === "CANCELLED";

  const plateNumber = currentRide.driverPlate || (currentRide as any).driverSnapshot?.vehiclePlate || "";
  const vehicleName = currentRide.driverVehicle || (currentRide as any).driverSnapshot?.vehicleType || "Sepeda Motor";
  const driverName = currentRide.driverName || (currentRide as any).driverSnapshot?.name || "";
  const showDriverCard = (hasDriver || isCompleted) && Boolean(driverName || currentRide.driverId);

  const stepIdx = isSearching
    ? 0
    : status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY"
    ? 1
    : status === "DRIVER_ARRIVED"
    ? 2
    : status === "TRIP_STARTED"
    ? 3
    : isCompleted
    ? 4
    : 0;

  const rideSteps = [
    {
      key: "SEARCHING",
      shortLabel: "Cari",
      title: "Mencari Driver...",
      desc: "Mohon tunggu sebentar, sistem sedang menghubungkan ke driver terdekat.",
      Icon: Compass,
      color: "#D97706",
      bgColor: "#FEF3C7",
      borderColor: "#FDE68A",
    },
    {
      key: "ON_THE_WAY",
      shortLabel: "Menuju",
      title: status === "DRIVER_ASSIGNED" ? "Driver Ditemukan" : "Driver Menuju Lokasi Anda",
      desc: status === "DRIVER_ASSIGNED"
        ? "Driver sedang bersiap menuju lokasi penjemputan Anda."
        : "Perkiraan tiba dalam 3-5 menit. Silakan bersiap di lokasi penjemputan.",
      Icon: status === "DRIVER_ASSIGNED" ? Bike : Navigation,
      color: "#2563EB",
      bgColor: "#EFF6FF",
      borderColor: "#BFDBFE",
    },
    {
      key: "ARRIVED",
      shortLabel: "Sampai",
      title: "Driver Telah Sampai",
      desc: "Silakan temui driver di lokasi penjemputan.",
      Icon: MapPin,
      color: "#7E22CE",
      bgColor: "#F3E8FF",
      borderColor: "#E9D5FF",
    },
    {
      key: "IN_TRIP",
      shortLabel: "Jalan",
      title: "Perjalanan Sedang Berlangsung",
      desc: `Menuju ke ${currentRide.destination.placeName || currentRide.destination.address}. Selamat menikmati perjalanan!`,
      Icon: Bike,
      color: "#0891B2",
      bgColor: "#ECFEFF",
      borderColor: "#A5F3FC",
    },
    {
      key: "COMPLETED",
      shortLabel: "Selesai",
      title: "Perjalanan Selesai",
      desc: "Terima kasih telah menggunakan layanan Kanyaah Ride.",
      Icon: CheckCircle,
      color: "#15803D",
      bgColor: "#DCFCE7",
      borderColor: "#BBF7D0",
    },
  ];

  const currentStep = rideSteps[stepIdx] || rideSteps[0];

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
          <Text style={styles.headerSub}>#{currentRide.orderCode}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* STEP TITIK KE TITIK STATUS TRACKER CARD */}
        {/* ========================================================================= */}

        {isCancelled ? (
          <View style={[styles.statusBanner, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
            <XCircle size={22} color="#DC2626" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#991B1B" }]}>
                Perjalanan Dibatalkan
              </Text>
              <Text style={[styles.statusBannerSub, { color: "#B91C1C" }]}>
                {currentRide.cancelReason || "Pesanan telah dibatalkan."}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.stepProgressCard}>
            {/* Header: Status Title & Step Badge */}
            <View style={styles.stepCardHeader}>
              <View style={styles.stepHeaderLeft}>
                <View style={[styles.stepLiveDot, { backgroundColor: currentStep.color }]} />
                <Text style={styles.stepHeaderTitle}>STATUS PERJALANAN</Text>
              </View>
              <View style={[styles.stepPillBadge, { backgroundColor: currentStep.bgColor, borderColor: currentStep.borderColor }]}>
                <Text style={[styles.stepPillBadgeText, { color: currentStep.color }]}>
                  {isCompleted ? "Perjalanan Selesai" : `Langkah ${stepIdx + 1} dari ${rideSteps.length}`}
                </Text>
              </View>
            </View>

            {/* Active Status Highlight Box */}
            <View style={[styles.activeStatusBox, { backgroundColor: currentStep.bgColor, borderColor: currentStep.borderColor }]}>
              <View style={[styles.activeStatusIconBox, { backgroundColor: currentStep.color }]}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <currentStep.Icon size={18} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.activeStatusTextCol}>
                <Text style={[styles.activeStatusTitle, { color: currentStep.color }]}>
                  {currentStep.title}
                </Text>
                <Text style={[styles.activeStatusSub, { color: currentStep.color }]}>
                  {currentStep.desc}
                </Text>
              </View>
            </View>

            {/* Titik ke Titik Connected Stepper */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperTrackRow}>
                {rideSteps.map((stepItem, idx) => {
                  const isDone = idx < stepIdx || isCompleted;
                  const isCurrent = idx === stepIdx && !isCompleted;
                  const isPending = idx > stepIdx;

                  return (
                    <React.Fragment key={stepItem.key}>
                      {/* Node Circle */}
                      <View style={styles.nodeWrapper}>
                        <View
                          style={[
                            styles.nodeCircle,
                            isDone && styles.nodeCircleDone,
                            isCurrent && [styles.nodeCircleCurrent, { borderColor: stepItem.color }],
                            isPending && styles.nodeCirclePending,
                          ]}
                        >
                          {isDone ? (
                            <Check size={11} color="#FFFFFF" strokeWidth={3.5} />
                          ) : isCurrent ? (
                            <View style={[styles.nodeInnerDot, { backgroundColor: stepItem.color }]} />
                          ) : (
                            <View style={styles.nodePendingDot} />
                          )}
                        </View>
                        {isCurrent && (
                          <View style={[styles.nodePulseRing, { borderColor: stepItem.color }]} />
                        )}
                      </View>

                      {/* Connecting Line */}
                      {idx < rideSteps.length - 1 && (
                        <View style={styles.lineContainer}>
                          <View
                            style={[
                              styles.connectorLine,
                              idx < stepIdx || isCompleted
                                ? styles.connectorLineDone
                                : idx === stepIdx
                                ? [styles.connectorLineActive, { backgroundColor: currentStep.borderColor }]
                                : styles.connectorLinePending,
                            ]}
                          />
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Step Labels */}
              <View style={styles.stepperLabelsRow}>
                {rideSteps.map((stepItem, idx) => {
                  const isDone = idx < stepIdx || isCompleted;
                  const isCurrent = idx === stepIdx && !isCompleted;

                  return (
                    <View key={stepItem.key} style={styles.stepLabelCol}>
                      <Text
                        style={[
                          styles.stepLabelText,
                          isDone && styles.stepLabelTextDone,
                          isCurrent && [styles.stepLabelTextCurrent, { color: stepItem.color }],
                        ]}
                        numberOfLines={1}
                      >
                        {stepItem.shortLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* DRIVER INFO CARD (Visible once driver is assigned or completed) */}
        {/* ========================================================================= */}
        {showDriverCard && (
          <View style={styles.driverCard}>
            <View style={styles.driverHeaderRow}>
              {currentRide.driverPhoto ? (
                <Image source={{ uri: currentRide.driverPhoto }} style={styles.driverAvatarImg} />
              ) : (
                <View style={styles.driverAvatarLetter}>
                  <Text style={styles.driverAvatarLetterText}>
                    {(driverName || "D").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.driverInfoBody}>
                <View style={styles.driverNameRow}>
                  <Text style={styles.driverNameText}>{driverName}</Text>
                  <View style={styles.ratingBadge}>
                    <Star size={11} color="#D97706" fill="#D97706" />
                    <Text style={styles.ratingBadgeText}>
                      {currentRide.driverRating ? currentRide.driverRating.toFixed(1) : "4.9"}
                    </Text>
                  </View>
                </View>
                <View style={styles.driverVehicleRow}>
                  <Text style={styles.driverVehicleText}>
                    {vehicleName}
                  </Text>
                  {Boolean(plateNumber) && (
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateBadgeText}>{plateNumber}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Actions: Chat & Phone (available during active ride) */}
            {hasDriver && (
              <View style={styles.driverActionRow}>
                <TouchableOpacity
                  style={[styles.driverActionBtn, styles.driverActionBtnChat]}
                  onPress={() => setChatModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={16} color="#1B7A4E" />
                  <Text style={styles.driverActionTextChat}>Chat Driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.driverActionBtn, styles.driverActionBtnPhone]}
                  onPress={handleCallDriver}
                  activeOpacity={0.8}
                >
                  <Phone size={16} color="#0284C7" />
                  <Text style={styles.driverActionTextPhone}>Telepon</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Interactive Route & Driver Map */}
        {trackingMarkers.length > 0 && (
          <View style={styles.mapContainer}>
            <NativeMapComponent
              markers={trackingMarkers}
              routeCoordinates={routeCoords || undefined}
              routeColor="#16A34A"
              fitToRoute={trackingMarkers.length > 1}
              showRouteLine={Boolean(routeCoords)}
              style={styles.mapFrame}
            />
          </View>
        )}

        {/* ========================================================================= */}
        {/* RIDE DETAILS CARD */}
        {/* ========================================================================= */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>INFORMASI PERJALANAN</Text>

          <View style={styles.routeCol}>
            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: "#1B7A4E" }]} />
              <View style={styles.routeItemBody}>
                <Text style={styles.routeLabel}>Lokasi Penjemputan</Text>
                {currentRide.pickup.placeName && currentRide.pickup.placeName !== "Lokasi Jemput" && currentRide.pickup.placeName !== currentRide.pickup.address ? (
                  <Text style={styles.routePlaceName}>{currentRide.pickup.placeName}</Text>
                ) : null}
                <Text style={styles.routeVal}>{currentRide.pickup.address}</Text>
              </View>
            </View>

            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: "#EA580C" }]} />
              <View style={styles.routeItemBody}>
                <Text style={styles.routeLabel}>Lokasi Tujuan</Text>
                {currentRide.destination.placeName && currentRide.destination.placeName !== "Tujuan Perjalanan" && currentRide.destination.placeName !== currentRide.destination.address ? (
                  <Text style={styles.routePlaceName}>{currentRide.destination.placeName}</Text>
                ) : null}
                <Text style={styles.routeVal}>{currentRide.destination.address}</Text>
              </View>
            </View>
          </View>

          {currentRide.customerNote ? (
            <View style={styles.noteWrap}>
              <Text style={styles.noteWrapLabel}>Catatan:</Text>
              <Text style={styles.noteWrapText}>{currentRide.customerNote}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kendaraan</Text>
              <Text style={styles.summaryVal}>Kanyaah Motor</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Jarak Tempuh</Text>
              <Text style={styles.summaryVal}>{currentRide.estimatedDistance || 2.5} km</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimasi Durasi</Text>
              <Text style={styles.summaryVal}>{currentRide.estimatedDuration || 15} menit</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Metode Pembayaran</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.summaryVal}>{currentRide.paymentMethod || "Bayar Tunai"}</Text>
                <View style={{
                  backgroundColor: currentRide.paymentStatus === "PAID" ? "#DCFCE7" : "#FEF3C7",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  marginTop: 3,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: currentRide.paymentStatus === "PAID" ? "#15803D" : "#D97706",
                  }}>
                    {currentRide.paymentStatus === "PAID" ? "LUNAS" : "MENUNGGU PEMBAYARAN"}
                  </Text>
                </View>
              </View>
            </View>
            {currentRide.paymentStatus !== "PAID" && (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#F0FDF4",
                  borderWidth: 1,
                  borderColor: "#BBF7D0",
                  borderRadius: 10,
                  paddingVertical: 8,
                  marginTop: 6,
                  marginBottom: 2,
                }}
                onPress={() => setPaymentModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#166534" }}>
                  💳 Bayar Non-Tunai (QRIS / E-Wallet / VA)
                </Text>
              </TouchableOpacity>
            )}
            <View style={[styles.summaryRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
              <Text style={[styles.summaryLabel, { fontWeight: "800", color: "#0F172A" }]}>
                Total Biaya
              </Text>
              <Text style={[styles.summaryVal, { fontWeight: "900", color: "#1B7A4E", fontSize: 16 }]}>
                {rp(currentRide.totalAmount || currentRide.estimatedFare)}
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* RATING & REVIEW CARD (Once completed) */}
        {/* ========================================================================= */}
        {isCompleted && (() => {
          const hasUserRated = ratingSubmitted || Boolean(
            typeof currentRide.rating === "number"
              ? currentRide.rating > 0
              : (currentRide.rating?.score != null && Number(currentRide.rating.score) > 0)
          );
          const finalScore = typeof currentRide.rating === "number"
            ? currentRide.rating
            : (currentRide.rating?.score != null && Number(currentRide.rating.score) > 0)
            ? Number(currentRide.rating.score)
            : ratingVal;
          const finalReview = (typeof currentRide.rating === "object" && currentRide.rating?.review)
            ? currentRide.rating.review
            : reviewText;

          const ratingLabels: Record<number, string> = {
            5: "Sangat Puas ⭐⭐⭐⭐⭐",
            4: "Puas ⭐⭐⭐⭐",
            3: "Cukup ⭐⭐⭐",
            2: "Kurang ⭐⭐",
            1: "Kecewa ⭐",
          };

          const quickTags = [
            "Driver Ramah 👍",
            "Perjalanan Nyaman 🛵",
            "Tepat Waktu ⏱️",
            "Kendaraan Bersih ✨",
            "Mengemudi Aman 🛡️",
          ];

          return (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>PENILAIAN PERJALANAN</Text>

              {hasUserRated ? (
                <View style={styles.ratingSuccessBox}>
                  <CheckCircle size={28} color="#15803D" />
                  <Text style={styles.ratingSuccessTitle}>Penilaian Terkirim</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={22}
                        color={s <= finalScore ? "#D97706" : "#E2E8F0"}
                        fill={s <= finalScore ? "#D97706" : "transparent"}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingScoreDesc}>{ratingLabels[finalScore] || `${finalScore} / 5`}</Text>
                  {Boolean(finalReview) && (
                    <View style={styles.reviewQuoteBox}>
                      <Text style={styles.reviewQuoteText}>"{finalReview}"</Text>
                    </View>
                  )}
                  <Text style={styles.ratingSuccessSub}>
                    Terima kasih atas ulasan Anda! Penilaian Anda membantu menjaga kualitas mitra driver.
                  </Text>
                </View>
              ) : (
                <View style={styles.ratingFormWrap}>
                  <View style={styles.ratingDriverHeader}>
                    <View style={styles.ratingDriverAvatar}>
                      <Bike size={20} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ratingDriverName}>{currentRide.driverName || "Driver Rangers"}</Text>
                      <Text style={styles.ratingDriverSub}>
                        {currentRide.driverVehicle || "Kanyaah Motor"} • {currentRide.driverPlate || "Plat Terverifikasi"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ratingPromptText}>Bagaimana pengalaman perjalanan Anda?</Text>
                  
                  {/* Interactive Star Buttons */}
                  <View style={styles.starSelectRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setRatingVal(s)}
                        style={styles.starBtn}
                        activeOpacity={0.7}
                      >
                        <Star
                          size={32}
                          color={s <= ratingVal ? "#D97706" : "#CBD5E1"}
                          fill={s <= ratingVal ? "#D97706" : "transparent"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Emotion Label */}
                  <Text style={styles.ratingEmotionText}>
                    {ratingLabels[ratingVal] || `${ratingVal} dari 5`}
                  </Text>

                  {/* Quick Review Feedback Tags */}
                  <View style={styles.quickTagsWrap}>
                    {quickTags.map((tag) => {
                      const isSelected = reviewText.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.quickTagChip, isSelected && styles.quickTagChipActive]}
                          onPress={() => {
                            if (isSelected) {
                              setReviewText((prev) => prev.replace(tag, "").replace(/,\s*,/g, ",").trim());
                            } else {
                              setReviewText((prev) => (prev ? `${prev}, ${tag}` : tag));
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.quickTagText, isSelected && styles.quickTagTextActive]}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    style={styles.reviewTextInput}
                    placeholder="Tulis ulasan tambahan untuk driver (opsional)..."
                    placeholderTextColor="#94A3B8"
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={3}
                  />

                  <TouchableOpacity
                    style={styles.submitRatingBtn}
                    onPress={handleSubmitRating}
                    disabled={isSubmittingRating}
                    activeOpacity={0.85}
                  >
                    {isSubmittingRating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitRatingBtnText}>Kirim Penilaian ({ratingVal} ★)</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}

        {/* Cancel Button (Available before trip starts) */}
        {(isSearching || status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY" || status === "DRIVER_ARRIVED") && (
          <Pressable
            style={({ pressed }) => [
              styles.cancelTripBtn,
              pressed && { opacity: 0.75 },
              Platform.OS === "web" && ({ cursor: "pointer", userSelect: "none" } as any),
            ]}
            onPress={() => void handleCancelRide()}
            disabled={isCancelling}
            accessibilityRole="button"
          >
            {isCancelling ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.cancelTripBtnText}>Batalkan Perjalanan</Text>
            )}
          </Pressable>
        )}

        {/* Complaint / Report issue button for completed or cancelled trips */}
        {(isCompleted || isCancelled) && (
          <TouchableOpacity
            style={styles.reportComplaintBtn}
            onPress={() => setComplaintModalVisible(true)}
            activeOpacity={0.8}
          >
            <AlertTriangle size={16} color="#EA580C" />
            <Text style={styles.reportComplaintBtnText}>Laporkan Masalah Perjalanan</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons if cancelled: Order Again or Return Home */}
        {isCancelled && (
          <TouchableOpacity
            style={[styles.backHomeBtn, { backgroundColor: "#1B7A4E", marginBottom: 10 }]}
            onPress={() => {
              AsyncStorage.removeItem("selected_ride_tracking_id").catch(() => {});
              navigate("c_ride");
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.backHomeBtnText, { color: "#FFFFFF" }]}>Pesan Perjalanan Baru</Text>
          </TouchableOpacity>
        )}

        {/* Return to Home button if completed or cancelled */}
        {(isCompleted || isCancelled) && (
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => {
              AsyncStorage.removeItem("selected_ride_tracking_id").catch(() => {});
              navigate("c_home");
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.backHomeBtnText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Friendly In-App Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isCancelling && setCancelModalVisible(false)}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={styles.cancelModalCard}>
            <View style={styles.cancelModalHeader}>
              <View style={styles.cancelIconWrap}>
                <AlertTriangle size={24} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cancelModalTitle}>Batalkan Perjalanan?</Text>
                <Text style={styles.cancelModalSubtitle}>
                  {currentRide?.status === "SEARCHING_DRIVER"
                    ? "Driver belum ditugaskan. Pembatalan ini GRATIS tanpa biaya."
                    : currentRide?.status === "DRIVER_ARRIVED"
                    ? "Driver sudah tiba di titik jemput. Pembatalan dikenakan biaya Rp 5.000."
                    : "Driver sedang menuju lokasi. Pembatalan dikenakan biaya Rp 3.000."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !isCancelling && setCancelModalVisible(false)}
                style={styles.cancelModalCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelReasonLabel}>Pilih Alasan Pembatalan:</Text>
            <View style={styles.reasonList}>
              {[
                "Ingin mengubah alamat penjemputan / tujuan",
                "Waktu tunggu driver terlalu lama",
                "Salah pilih kendaraan atau metode bayar",
                "Menemukan tumpangan alternatif",
                "Lainnya",
              ].map((reasonItem) => (
                <TouchableOpacity
                  key={reasonItem}
                  style={[
                    styles.reasonChip,
                    selectedCancelReason === reasonItem && styles.reasonChipActive,
                  ]}
                  onPress={() => setSelectedCancelReason(reasonItem)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.reasonRadio,
                      selectedCancelReason === reasonItem && styles.reasonRadioActive,
                    ]}
                  >
                    {selectedCancelReason === reasonItem && (
                      <View style={styles.reasonRadioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.reasonText,
                      selectedCancelReason === reasonItem && styles.reasonTextActive,
                    ]}
                  >
                    {reasonItem}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedCancelReason === "Lainnya" && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Tuliskan alasan pembatalan Anda..."
                placeholderTextColor="#94A3B8"
                value={customCancelReason}
                onChangeText={setCustomCancelReason}
                multiline
              />
            )}

            <View style={styles.cancelModalActionRow}>
              <TouchableOpacity
                style={styles.cancelModalKeepBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={isCancelling}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalKeepText}>Lanjutkan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelModalConfirmBtn, isCancelling && { opacity: 0.7 }]}
                onPress={() => void executeCancelRide()}
                disabled={isCancelling}
                activeOpacity={0.8}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.cancelModalConfirmText}>Ya, Batalkan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Realtime Chat Modal with Driver */}
      {currentRide && (
        <CustomerChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          orderId={currentRide._id}
          participantType="driver"
          participantName={currentRide.driverName || "Driver Rangers"}
          customerId={authAccount?.id}
          orderType="RIDE"
          serviceType="KANYAAH_RIDE"
        />
      )}

      {/* Safe Call Modal */}
      {currentRide && (
        <SafeCallModal
          visible={safeCallVisible}
          onClose={() => setSafeCallVisible(false)}
          targetName={currentRide.driverName || "Driver Rangers"}
          targetRole="Driver Rangers"
          targetPhone={currentRide.driverPhone || "+6281200000000"}
          orderCode={currentRide.orderCode}
        />
      )}

      {/* Digital Payment Modal */}
      {currentRide && (
        <DigitalPaymentModal
          visible={paymentModalVisible}
          onClose={() => setPaymentModalVisible(false)}
          orderId={currentRide._id}
          orderModel="RideOrder"
          amount={currentRide.totalAmount || currentRide.estimatedFare || 8000}
          onPaymentSuccess={(payment) => {
            setCurrentRide((prev: any) => prev ? { ...prev, paymentStatus: payment.status, paymentMethod: payment.paymentMethod } : prev);
            setPaymentModalVisible(false);
          }}
        />
      )}

      {/* Ride Complaint / Dispute Modal */}
      <Modal
        visible={complaintModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComplaintModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.complaintModalCard}>
            <View style={styles.complaintModalHeader}>
              <View>
                <Text style={styles.complaintModalTitle}>Laporkan Masalah</Text>
                <Text style={styles.complaintModalSub}>#{currentRide?.orderCode || "Pesanan"}</Text>
              </View>
              <TouchableOpacity onPress={() => setComplaintModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={{ fontSize: 18, color: "#64748B", fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {complaintSubmitted ? (
                <View style={styles.complaintSuccessWrap}>
                  <CheckCircle size={36} color="#15803D" />
                  <Text style={styles.complaintSuccessTitle}>Komplain Berhasil Dikirim</Text>
                  <Text style={styles.complaintSuccessCode}>Nomor Tiket: #{complaintTicketId}</Text>
                  <Text style={styles.complaintSuccessSub}>
                    Tim operasional Rangers akan memeriksa rekaman perjalanan dan segera menghubungi Anda.
                  </Text>
                  <TouchableOpacity
                    style={styles.complaintCloseBtn}
                    onPress={() => setComplaintModalVisible(false)}
                  >
                    <Text style={styles.complaintCloseBtnText}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 14, paddingTop: 10 }}>
                  <Text style={styles.complaintFieldLabel}>PILIH KATEGORI MASALAH</Text>
                  <View style={styles.categoryPillsWrap}>
                    {[
                      "Tarif tidak sesuai",
                      "Driver tidak datang",
                      "Driver berperilaku buruk",
                      "Lokasi tidak sesuai",
                      "Barang atau kendaraan bermasalah",
                      "Pembayaran bermasalah",
                      "Perjalanan belum selesai tetapi sudah ditutup",
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryPill,
                          complaintCategory === cat && styles.categoryPillActive,
                        ]}
                        onPress={() => setComplaintCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            complaintCategory === cat && styles.categoryPillTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.complaintFieldLabel}>DETAIL KELUHAN</Text>
                  <TextInput
                    style={styles.complaintInput}
                    placeholder="Jelaskan secara detail apa yang terjadi selama perjalanan..."
                    placeholderTextColor="#94A3B8"
                    value={complaintDescription}
                    onChangeText={setComplaintDescription}
                    multiline
                    numberOfLines={4}
                  />

                  <TouchableOpacity
                    style={styles.submitComplaintBtn}
                    onPress={handleSubmitComplaint}
                    disabled={isSubmittingComplaint}
                    activeOpacity={0.85}
                  >
                    {isSubmittingComplaint ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitComplaintBtnText}>Kirim Pengaduan</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cancelModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cancelModalCard: {
    width: "90%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cancelIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cancelModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 16,
  },
  cancelModalCloseBtn: {
    padding: 4,
  },
  cancelReasonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  reasonList: {
    gap: 6,
    marginBottom: 14,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reasonChipActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  reasonRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reasonRadioActive: {
    borderColor: "#DC2626",
  },
  reasonRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  reasonText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },
  reasonTextActive: {
    color: "#991B1B",
    fontWeight: "700",
  },
  customReasonInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: "#0F172A",
    height: 60,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  cancelModalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelModalKeepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  cancelModalKeepText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  cancelModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
  },
  cancelModalConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  orderNowBtn: {
    marginTop: 12,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  orderNowBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
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
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  statusBannerTextCol: {
    flex: 1,
    gap: 2,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  statusBannerSub: {
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 16,
  },
  stepProgressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepHeaderTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  stepPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepPillBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  activeStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  activeStatusIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activeStatusTextCol: {
    flex: 1,
    gap: 2,
  },
  activeStatusTitle: {
    fontSize: 13.5,
    fontWeight: "900",
  },
  activeStatusSub: {
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 16,
    opacity: 0.9,
  },
  stepperContainer: {
    paddingTop: 4,
    paddingBottom: 2,
    gap: 6,
  },
  stepperTrackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  nodeWrapper: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  nodeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  nodeCircleDone: {
    backgroundColor: "#10B981",
  },
  nodeCircleCurrent: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
  },
  nodeCirclePending: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  nodeInnerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  nodePendingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
  },
  nodePulseRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    opacity: 0.35,
    zIndex: 1,
  },
  lineContainer: {
    flex: 1,
    height: 3,
    justifyContent: "center",
  },
  connectorLine: {
    height: 2.5,
    borderRadius: 1.5,
  },
  connectorLineDone: {
    backgroundColor: "#10B981",
  },
  connectorLineActive: {
    backgroundColor: "#93C5FD",
  },
  connectorLinePending: {
    backgroundColor: "#E2E8F0",
  },
  stepperLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepLabelCol: {
    width: 44,
    alignItems: "center",
  },
  stepLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textAlign: "center",
  },
  stepLabelTextDone: {
    color: "#0F172A",
    fontWeight: "800",
  },
  stepLabelTextCurrent: {
    fontWeight: "900",
  },
  driverCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  driverHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  driverAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  driverAvatarLetter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarLetterText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  driverInfoBody: {
    flex: 1,
    gap: 2,
  },
  driverNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
  },
  driverVehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  driverVehicleText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  plateBadge: {
    backgroundColor: "#0F172A",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#334155",
  },
  plateBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  driverPlateText: {
    color: "#0F172A",
    fontWeight: "800",
  },
  driverActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  driverActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  driverActionBtnChat: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#C6E7D4",
  },
  driverActionTextChat: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  driverActionBtnPhone: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  driverActionTextPhone: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0284C7",
  },
  mapContainer: {
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mapFrame: {
    width: "100%",
    height: "100%",
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
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  routeCol: {
    gap: 12,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  routeItemBody: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#94A3B8",
  },
  routePlaceName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  routeVal: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 16,
  },
  noteWrap: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  noteWrapLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  noteWrapText: {
    fontSize: 11.5,
    color: "#334155",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 2,
  },
  summaryGrid: {
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
  ratingSuccessBox: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
  },
  ratingSuccessTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#15803D",
  },
  starRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 4,
  },
  ratingScoreDesc: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },
  reviewQuoteBox: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#15803D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
    width: "100%",
  },
  reviewQuoteText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 18,
  },
  ratingSuccessSub: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
  ratingFormWrap: {
    gap: 12,
  },
  ratingDriverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  ratingDriverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDriverName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingDriverSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  ratingPromptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  starSelectRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 6,
  },
  starBtn: {
    padding: 4,
  },
  ratingEmotionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
    textAlign: "center",
    marginTop: -4,
  },
  quickTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginVertical: 4,
  },
  quickTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickTagChipActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  quickTagText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  quickTagTextActive: {
    color: "#15803D",
    fontWeight: "800",
  },
  reviewTextInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 12,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 70,
  },
  submitRatingBtn: {
    backgroundColor: "#1B7A4E",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#1B7A4E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitRatingBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  cancelTripBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelTripBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
  backHomeBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
  },
  backHomeBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },

  reportComplaintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  reportComplaintBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EA580C",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  complaintModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  complaintModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  complaintModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  complaintModalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  complaintFieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  categoryPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  categoryPillText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  categoryPillTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  complaintInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 90,
  },
  submitComplaintBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitComplaintBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  complaintSuccessWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  complaintSuccessTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  complaintSuccessCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  complaintSuccessSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  complaintCloseBtn: {
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  complaintCloseBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});