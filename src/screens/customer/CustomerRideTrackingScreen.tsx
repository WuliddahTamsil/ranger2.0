import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  fetchActiveCustomerRide,
  fetchCustomerRides,
  updateRideStatus,
  rateRide,
  cancelRide,
  submitRideComplaint,
  RideOrderData,
} from "../../services/rideService";
import { Modal } from "react-native";
import { CustomerChatModal } from "./CustomerChatModal";
import { SafeCallModal } from "../../components/SafeCallModal";
import { DigitalPaymentModal } from "../../components/DigitalPaymentModal";
import { NativeMapComponent } from "../../components/NativeMapComponent";
import { rp } from "../../utils/formatters";
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

  // Cancel ride handler with tiered cancellation policy
  const handleCancelRide = () => {
    if (!currentRide) return;

    if (currentRide.status === "TRIP_STARTED") {
      Alert.alert(
        "Tidak Dapat Membatalkan",
        "Perjalanan sudah dimulai bersama driver dan tidak dapat dibatalkan dari aplikasi penumpang."
      );
      return;
    }

    let policyMessage = "Apakah Anda yakin ingin membatalkan perjalanan ini?";
    if (currentRide.status === "SEARCHING_DRIVER") {
      policyMessage = "Driver belum ditugaskan. Pembatalan ini GRATIS tanpa biaya.";
    } else if (currentRide.status === "DRIVER_ASSIGNED" || currentRide.status === "DRIVER_ON_THE_WAY") {
      policyMessage = "Driver sudah menerima order dan dalam perjalanan. Pembatalan dikenakan biaya kompensasi Rp 3.000.";
    } else if (currentRide.status === "DRIVER_ARRIVED") {
      policyMessage = "Driver sudah tiba di titik penjemputan. Pembatalan dikenakan biaya kompensasi Rp 5.000.";
    }

    Alert.alert(
      "Batalkan Perjalanan?",
      policyMessage,
      [
        { text: "Kembali", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            setIsCancelling(true);
            try {
              const res = await cancelRide(currentRide._id, {
                reason: "Dibatalkan oleh customer",
                cancelledBy: "CUSTOMER",
              });
              if (res.success && res.data) {
                setCurrentRide(res.data);
                const feeText = res.data.cancellation?.fee ? ` Biaya pembatalan: Rp ${res.data.cancellation.fee.toLocaleString("id-ID")}.` : "";
                Alert.alert("Perjalanan Dibatalkan", `Pesanan Anda telah dibatalkan.${feeText}`);
              } else {
                Alert.alert("Gagal Membatalkan", res.message || "Periksa koneksi lalu coba lagi.");
              }
            } catch (err: any) {
              Alert.alert("Gagal", err.message || "Terjadi kesalahan.");
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  // Submit Complaint handler
  const handleSubmitComplaint = async () => {
    if (!currentRide) return;
    if (!complaintDescription.trim()) {
      Alert.alert("Deskripsi Kosong", "Silakan ceritakan detail masalah yang Anda alami.");
      return;
    }
    setIsSubmittingComplaint(true);
    try {
      const res = await submitRideComplaint(currentRide._id, {
        category: complaintCategory,
        description: complaintDescription.trim(),
      });
      if (res.success) {
        setComplaintSubmitted(true);
        setComplaintTicketId(res.data?.ticketId || "RNG-TKT");
        Alert.alert(
          "Komplain Diterima",
          `Tiket pengaduan Anda #${res.data?.ticketId || ""} telah terdaftar dan akan ditindaklanjuti oleh tim admin Rangers.`
        );
      } else {
        Alert.alert("Gagal Mengajukan", res.message || "Silakan coba lagi.");
      }
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Terjadi kesalahan saat mengirim pengaduan.");
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
        {/* STATUS BANNER */}
        {/* ========================================================================= */}

        {isSearching && (
          <View style={[styles.statusBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
            <ActivityIndicator size="small" color="#D97706" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#92400E" }]}>
                Mencari Driver Rangers...
              </Text>
              <Text style={[styles.statusBannerSub, { color: "#B45309" }]}>
                Mohon tunggu sebentar, sistem sedang menghubungkan ke driver terdekat.
              </Text>
            </View>
          </View>
        )}

        {status === "DRIVER_ASSIGNED" && (
          <View style={[styles.statusBanner, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Bike size={22} color="#2563EB" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#1E40AF" }]}>Driver ditemukan</Text>
              <Text style={[styles.statusBannerSub, { color: "#3B82F6" }]}>
                Driver sedang bersiap menuju lokasi penjemputan Anda.
              </Text>
            </View>
          </View>
        )}

        {status === "DRIVER_ON_THE_WAY" && (
          <View style={[styles.statusBanner, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Navigation size={22} color="#2563EB" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#1E40AF" }]}>
                Driver menuju lokasi Anda
              </Text>
              <Text style={[styles.statusBannerSub, { color: "#3B82F6" }]}>
                Perkiraan tiba dalam 3-5 menit. Silakan bersiap di lokasi penjemputan.
              </Text>
            </View>
          </View>
        )}

        {status === "DRIVER_ARRIVED" && (
          <View style={[styles.statusBanner, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}>
            <MapPin size={22} color="#7E22CE" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#6B21A8" }]}>Driver telah sampai</Text>
              <Text style={[styles.statusBannerSub, { color: "#9333EA" }]}>
                Silakan temui driver di lokasi penjemputan.
              </Text>
            </View>
          </View>
        )}

        {status === "TRIP_STARTED" && (
          <View style={[styles.statusBanner, { backgroundColor: "#ECFEFF", borderColor: "#A5F3FC" }]}>
            <Bike size={22} color="#0891B2" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#155E75" }]}>
                Perjalanan sedang berlangsung
              </Text>
              <Text style={[styles.statusBannerSub, { color: "#0E7490" }]}>
                Menuju ke {currentRide.destination.placeName || currentRide.destination.address}. Selamat menikmati perjalanan!
              </Text>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={[styles.statusBanner, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
            <CheckCircle size={22} color="#15803D" />
            <View style={styles.statusBannerTextCol}>
              <Text style={[styles.statusBannerTitle, { color: "#14532D" }]}>Perjalanan Selesai</Text>
              <Text style={[styles.statusBannerSub, { color: "#166534" }]}>
                Terima kasih telah menggunakan Kanyaah Ride.
              </Text>
            </View>
          </View>
        )}

        {isCancelled && (
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
        )}

        {/* ========================================================================= */}
        {/* DRIVER INFO CARD (Visible once driver is assigned) */}
        {/* ========================================================================= */}
        {hasDriver && currentRide.driverName && (
          <View style={styles.driverCard}>
            <View style={styles.driverHeaderRow}>
              {currentRide.driverPhoto ? (
                <Image source={{ uri: currentRide.driverPhoto }} style={styles.driverAvatarImg} />
              ) : (
                <View style={styles.driverAvatarLetter}>
                  <Text style={styles.driverAvatarLetterText}>
                    {currentRide.driverName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.driverInfoBody}>
                <View style={styles.driverNameRow}>
                  <Text style={styles.driverNameText}>{currentRide.driverName}</Text>
                  <View style={styles.ratingBadge}>
                    <Star size={11} color="#D97706" fill="#D97706" />
                    <Text style={styles.ratingBadgeText}>
                      {currentRide.driverRating ? currentRide.driverRating.toFixed(1) : "4.9"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.driverVehicleText}>
                  {currentRide.driverVehicle || "Sepeda Motor"}
                  {currentRide.driverPlate ? ` · ` : ""}
                  {currentRide.driverPlate ? (
                    <Text style={styles.driverPlateText}>{currentRide.driverPlate}</Text>
                  ) : null}
                </Text>
              </View>
            </View>

            {/* Actions: Chat & Phone */}
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
          </View>
        )}

        {/* Map View */}
        {currentRide.pickup.latitude && currentRide.pickup.longitude && (
          <View style={styles.mapContainer}>
            <NativeMapComponent
              pin={{
                latitude: currentRide.pickup.latitude,
                longitude: currentRide.pickup.longitude,
              }}
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
                <Text style={styles.routeVal}>{currentRide.pickup.address}</Text>
              </View>
            </View>

            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: "#EA580C" }]} />
              <View style={styles.routeItemBody}>
                <Text style={styles.routeLabel}>Lokasi Tujuan</Text>
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
        {isCompleted && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>PENILAIAN PERJALANAN</Text>

            {ratingSubmitted || currentRide.rating ? (
              <View style={styles.ratingSuccessBox}>
                <CheckCircle size={24} color="#15803D" />
                <Text style={styles.ratingSuccessTitle}>Penilaian Terkirim</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => {
                    const currentScore = typeof currentRide.rating === "number" ? currentRide.rating : currentRide.rating?.score || ratingVal;
                    return (
                      <Star
                        key={s}
                        size={20}
                        color={s <= currentScore ? "#D97706" : "#E2E8F0"}
                        fill={s <= currentScore ? "#D97706" : "transparent"}
                      />
                    );
                  })}
                </View>
                <Text style={styles.ratingSuccessSub}>Terima kasih atas ulasan Anda!</Text>
              </View>
            ) : (
              <View style={styles.ratingFormWrap}>
                <Text style={styles.ratingPromptText}>Bagaimana pengalaman perjalanan Anda?</Text>
                <View style={styles.starSelectRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setRatingVal(s)}
                      style={styles.starBtn}
                      activeOpacity={0.7}
                    >
                      <Star
                        size={28}
                        color={s <= ratingVal ? "#D97706" : "#CBD5E1"}
                        fill={s <= ratingVal ? "#D97706" : "transparent"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reviewTextInput}
                  placeholder="Tulis ulasan perjalanan (opsional)..."
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
                    <Text style={styles.submitRatingBtnText}>Kirim Penilaian</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Cancel Button (Available before trip starts) */}
        {(isSearching || status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY" || status === "DRIVER_ARRIVED") && (
          <TouchableOpacity
            style={styles.cancelTripBtn}
            onPress={handleCancelRide}
            disabled={isCancelling}
            activeOpacity={0.8}
          >
            {isCancelling ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.cancelTripBtnText}>Batalkan Perjalanan</Text>
            )}
          </TouchableOpacity>
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

        {/* Return to Home button if completed or cancelled */}
        {(isCompleted || isCancelled) && (
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => navigate("c_home")}
            activeOpacity={0.85}
          >
            <Text style={styles.backHomeBtnText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Realtime Chat Modal with Driver */}
      {currentRide && (
        <CustomerChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          orderId={currentRide._id}
          participantType="driver"
          participantName={currentRide.driverName || "Driver Rangers"}
          customerId={authAccount?.id}
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
  driverVehicleText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
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
    height: 150,
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
  routeVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
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
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  starRow: {
    flexDirection: "row",
    gap: 4,
  },
  ratingSuccessSub: {
    fontSize: 11.5,
    color: "#64748B",
  },
  ratingFormWrap: {
    gap: 12,
  },
  ratingPromptText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  starSelectRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 4,
  },
  starBtn: {
    padding: 4,
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
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitRatingBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
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