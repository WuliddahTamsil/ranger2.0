import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import {
  CheckCircle2,
  Star,
  Package,
  ShieldCheck,
  Home,
  Clock,
  User,
  CreditCard,
  AlertCircle,
  FileText,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useSendContext } from "../../../context/SendContext";
import { submitSendRating } from "../../../services/sendService";
import { ComplaintModal } from "../../../components/send/ComplaintModal";
import { rp } from "../../../utils/formatters";

interface SendDeliveryDetailScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const SendDeliveryDetailScreen: React.FC<SendDeliveryDetailScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const { activeOrder, resetSendFlow } = useSendContext();

  const [ratingScore, setRatingScore] = useState(activeOrder?.rating?.score || 5);
  const [reviewText, setReviewText] = useState(activeOrder?.rating?.review || "");
  const [ratingSubmitted, setRatingSubmitted] = useState(Boolean(activeOrder?.rating?.score));
  const [submittingRating, setSubmittingRating] = useState(false);
  const [complaintVisible, setComplaintVisible] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 3000);
  };

  const handleSendRating = async () => {
    if (!activeOrder?._id) return;
    setSubmittingRating(true);
    try {
      const res = await submitSendRating(activeOrder._id, ratingScore, reviewText, authAccount?.id);
      if (res.success) {
        setRatingSubmitted(true);
        showToast("Terima kasih atas ulasan dan rating Anda!");
      } else {
        showToast(res.message || "Gagal mengirimkan rating.");
      }
    } catch (e: any) {
      showToast("Koneksi gagal saat mengirim rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleFinish = () => {
    resetSendFlow();
    navigate("c_home");
  };

  const deliveredDate = activeOrder?.deliveredAt || activeOrder?.updatedAt || new Date().toISOString();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detail Pengiriman Selesai</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => setComplaintVisible(true)}>
          <ShieldCheck size={16} color="#059669" />
          <Text style={styles.helpBtnText}>Laporkan Masalah</Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {toastText && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastText}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIconCircle}>
            <CheckCircle2 size={40} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Barang Berhasil Dikirim</Text>
          <Text style={styles.orderCode}>#{activeOrder?.orderCode || "RNG-SEND"}</Text>
          <Text style={styles.deliveryTimestamp}>
            Diterima pada{" "}
            {new Date(deliveredDate).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* Recipient & Proof Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bukti Serah Terima</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nama Penerima:</Text>
            <Text style={styles.infoVal}>{activeOrder?.recipient?.name || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status OTP Penerima:</Text>
            <View style={styles.otpBadge}>
              <CheckCircle2 size={12} color="#059669" />
              <Text style={styles.otpBadgeText}>Terverifikasi</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Pembayaran:</Text>
            <Text style={[styles.infoVal, { color: "#059669" }]}>
              {activeOrder?.paymentStatus === "PAID" ? "Lunas" : activeOrder?.paymentStatus || "Lunas"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tarif Final:</Text>
            <Text style={[styles.infoVal, { fontSize: 15, fontWeight: "900", color: "#059669" }]}>
              {rp(activeOrder?.pricing?.finalFare || 0)}
            </Text>
          </View>

          {/* Delivery Proof Photos */}
          {activeOrder?.deliveryProofUrls && activeOrder.deliveryProofUrls.length > 0 && (
            <View style={styles.proofSection}>
              <Text style={styles.proofLabel}>Foto Bukti Penyerahan:</Text>
              <View style={styles.proofGrid}>
                {activeOrder.deliveryProofUrls.map((url, idx) => (
                  <Image key={idx} source={{ uri: url }} style={styles.proofPhoto} />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Rating Driver Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Penilaian Mitra Driver</Text>
          <Text style={styles.ratingSubtitle}>
            Berikan rating untuk driver {activeOrder?.driverId?.name || "Rangers"}:
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => !ratingSubmitted && setRatingScore(star)}
                disabled={ratingSubmitted}
              >
                <Star
                  size={32}
                  color="#F59E0B"
                  fill={star <= ratingScore ? "#F59E0B" : "transparent"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {!ratingSubmitted ? (
            <View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Tulis ulasan pengalaman pengiriman (opsional)..."
                placeholderTextColor="#94A3B8"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
              />
              <TouchableOpacity
                style={styles.ratingSubmitBtn}
                onPress={handleSendRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.ratingSubmitBtnText}>Kirim Penilaian</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ratingSubmittedBadge}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.ratingSubmittedText}>Penilaian Anda telah tersimpan. Terima kasih!</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.homeBtn} onPress={handleFinish} activeOpacity={0.88}>
          <Home size={18} color="#FFFFFF" />
          <Text style={styles.homeBtnText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Complaint Modal */}
      <ComplaintModal
        visible={complaintVisible}
        onClose={() => setComplaintVisible(false)}
        orderCode={activeOrder?.orderCode || "RNG-SEND"}
        onSubmit={async () => {
          showToast("Laporan masalah telah diteruskan ke tim support.");
        }}
      />
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  toastBox: {
    position: "absolute",
    top: 64,
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
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  successBanner: {
    alignItems: "center",
    marginVertical: 16,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  orderCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
    marginTop: 4,
  },
  deliveryTimestamp: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  otpBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  otpBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  proofSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  proofLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  proofGrid: {
    flexDirection: "row",
    gap: 10,
  },
  proofPhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  ratingSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginVertical: 10,
  },
  reviewInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    height: 64,
    textAlignVertical: "top",
    marginTop: 10,
  },
  ratingSubmitBtn: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  ratingSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  ratingSubmittedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  ratingSubmittedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  homeBtn: {
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
    marginTop: 8,
  },
  homeBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
