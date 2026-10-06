import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Building2,
  Zap,
  ShieldCheck,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { createWasteDeposit } from "../../../services/recycleService";
import { WasteDepositUI } from "../../../types/recycleTypes";
import { checkBankOperationalStatus } from "../../../utils/bankOperationalUtils";

interface Props extends Nav {
  authAccount?: any;
}

export const WastePickupScheduleScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const {
    selectedBank,
    draftDeposit,
    setSelectedDeposit,
  } = useRecycle();

  const [address, setAddress] = useState(
    draftDeposit.pickupAddress || authAccount?.address || selectedBank?.address || "Pakuan, Bogor, Jawa Barat"
  );
  const [driverNotes, setDriverNotes] = useState(draftDeposit.pickupNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [createdSuccessDeposit, setCreatedSuccessDeposit] = useState<WasteDepositUI | null>(null);

  const opStatus = checkBankOperationalStatus(selectedBank?.openingHours);

  const totalWeight = draftDeposit.categories.reduce((sum, c) => sum + (c.estimatedWeightKg || 0), 0);
  const totalRupiah = draftDeposit.categories.reduce(
    (sum, c) => sum + Math.round((c.estimatedWeightKg || 0) * (c.pricePerKg || 0)),
    0
  );

  const handleSubmitPickup = async () => {
    if (!opStatus.isOpen) {
      Alert.alert(
        "Bank Sampah Sedang Tutup",
        `Bank Sampah ${selectedBank?.name || ""} sedang tutup saat ini (${opStatus.reason || `Jam buka: ${opStatus.hoursText}`}). Layanan penjemputan hanya aktif pada jam operasional.`
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert("Alamat Diperlukan", "Masukkan alamat penjemputan sampah Anda.");
      return;
    }

    if (!selectedBank?._id) {
      Alert.alert("Error", "Bank Sampah tujuan tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bankSampahId: selectedBank._id,
        method: "PICKUP" as const,
        categories: [],
        pickupAddress: address.trim(),
        pickupLatitude: -7.15,
        pickupLongitude: 107.8,
        pickupNotes: driverNotes.trim(),
      };

      const res = await createWasteDeposit(payload, `deposit_pickup_${Date.now()}`);
      if (res.success && res.data) {
        setSelectedDeposit(res.data);
        setCreatedSuccessDeposit(res.data);
      } else {
        Alert.alert("Gagal", res.message || "Gagal membuat permohonan pickup.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kendala pada koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_deposit_form")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Penjemputan Sampah</Text>
          <Text style={styles.headerSub}>Layanan penjemputan real-time oleh driver</Text>
        </View>
        <View style={styles.badgeRealtime}>
          <Zap size={11} color="#15803D" />
          <Text style={styles.badgeRealtimeText}>Real-time</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Operational Hours Alert Banner if Closed */}
        {!opStatus.isOpen && (
          <View style={styles.closedAlertCard}>
            <AlertCircle size={22} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.closedAlertTitle}>Bank Sampah Sedang Tutup</Text>
              <Text style={styles.closedAlertSub}>
                {opStatus.reason || `Layanan hanya dapat diakses pada jam operasional: ${opStatus.hoursText}`}
              </Text>
            </View>
          </View>
        )}

        {/* Bank Sampah Info Card */}
        <View style={styles.bankCard}>
          <View style={styles.bankCardTop}>
            <View style={styles.bankAvatar}>
              <Building2 size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.bankCardLabel}>Bank Sampah Tujuan:</Text>
              <Text style={styles.bankCardName}>{selectedBank?.name || "Bank Sampah Mitra"}</Text>
            </View>
            <View
              style={[
                styles.opStatusPill,
                opStatus.isOpen ? styles.opStatusPillOpen : styles.opStatusPillClosed,
              ]}
            >
              <View
                style={[
                  styles.opStatusDot,
                  opStatus.isOpen ? styles.opStatusDotOpen : styles.opStatusDotClosed,
                ]}
              />
              <Text
                style={[
                  styles.opStatusText,
                  opStatus.isOpen ? styles.opStatusTextOpen : styles.opStatusTextClosed,
                ]}
              >
                {opStatus.isOpen ? "Buka Sekarang" : "Tutup"}
              </Text>
            </View>
          </View>

          <View style={styles.bankDetailsRow}>
            <Clock size={12} color="#64748B" />
            <Text style={styles.bankHoursText}>
              Jam Operasional: {opStatus.hoursText}
            </Text>
          </View>
        </View>

        {/* Real-time Pickup Flow Explanation Card */}
        <View style={styles.flowCard}>
          <View style={styles.flowHeader}>
            <Zap size={16} color="#047857" />
            <Text style={styles.flowTitle}>Sistem Penjemputan Langsung (Real-time)</Text>
          </View>
          <Text style={styles.flowDesc}>
            Setelah Anda mengirim permintaan penjemputan, Bank Sampah akan langsung menyetujui dan sistem menyiarkan tugas ke driver terdekat untuk mengambil sampah di lokasi Anda.
          </Text>
          <View style={styles.flowStepsRow}>
            <View style={styles.flowStepItem}>
              <Text style={styles.flowStepNum}>1</Text>
              <Text style={styles.flowStepLabel}>Kirim Order</Text>
            </View>
            <ChevronRight size={14} color="#9CA3AF" />
            <View style={styles.flowStepItem}>
              <Text style={styles.flowStepNum}>2</Text>
              <Text style={styles.flowStepLabel}>ACC Bank</Text>
            </View>
            <ChevronRight size={14} color="#9CA3AF" />
            <View style={styles.flowStepItem}>
              <Text style={styles.flowStepNum}>3</Text>
              <Text style={styles.flowStepLabel}>Driver Jemput</Text>
            </View>
            <ChevronRight size={14} color="#9CA3AF" />
            <View style={styles.flowStepItem}>
              <Text style={styles.flowStepNum}>4</Text>
              <Text style={styles.flowStepLabel}>Timbang & Poin</Text>
            </View>
          </View>
        </View>

        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={16} color="#15803D" />
            <Text style={styles.cardTitle}>Alamat Penjemputan Sampah</Text>
          </View>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Tuliskan alamat lengkap rumah, nomor rumah, atau patokan penjemputan..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Driver Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Catatan untuk Driver (Opsional)</Text>
          <TextInput
            style={styles.notesInput}
            value={driverNotes}
            onChangeText={setDriverNotes}
            placeholder="Contoh: Pagar hitam, sampah sudah dimasukkan dalam kardus/karung di depan teras..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Truck size={18} color="#065F46" />
            <Text style={styles.summaryTitle}>Ringkasan Penjemputan</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Waktu Penjemputan:</Text>
            <Text style={[styles.summaryVal, { color: "#15803D", fontWeight: "800" }]}>
              Langsung / Real-time
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bank Sampah Tujuan:</Text>
            <Text style={styles.summaryVal}>{selectedBank?.name || "Bank Sampah Terdekat"}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryPointLabel}>Status Penimbangan:</Text>
            <Text style={styles.summaryPointVal}>Ditimbang di Bank Sampah</Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.btnSubmit,
            (!opStatus.isOpen || submitting) && styles.btnSubmitDisabled,
          ]}
          onPress={handleSubmitPickup}
          disabled={!opStatus.isOpen || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Truck size={18} color="#FFFFFF" />
              <Text style={styles.btnSubmitText}>
                {opStatus.isOpen ? "Panggil Driver Sekarang" : "Bank Sampah Tutup"}
              </Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={Boolean(createdSuccessDeposit)}
        transparent
        animationType="fade"
        onRequestClose={() => setCreatedSuccessDeposit(null)}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#15803D" />
            </View>
            <Text style={styles.successModalTitle}>Permintaan Pickup Berhasil Dikirim!</Text>
            <Text style={styles.successModalSubtitle}>
              Bank Sampah {selectedBank?.name || "Mitra"} akan segera menyetujui dan memanggil driver untuk menjemput sampah Anda.
            </Text>

            <View style={styles.successCodeBox}>
              <Text style={styles.successCodeLabel}>KODE TIKET SETORAN ANDA</Text>
              <Text style={styles.successCodeText}>{createdSuccessDeposit?.depositCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.btnViewTracking}
              onPress={() => {
                setCreatedSuccessDeposit(null);
                navigate("c_recycle_tracking");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnViewTrackingText}>Buka Status & Pelacakan Tiket</Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnBackHome}
              onPress={() => {
                setCreatedSuccessDeposit(null);
                navigate("c_recycle_home");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.btnBackHomeText}>Kembali ke Beranda Recycle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  headerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  badgeRealtime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  badgeRealtimeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  closedAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  closedAlertTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#B91C1C",
  },
  closedAlertSub: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
    lineHeight: 15,
  },
  bankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bankCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  bankCardLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  bankCardName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#111827",
    marginTop: 1,
  },
  opStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  opStatusPillOpen: {
    backgroundColor: "#DCFCE7",
  },
  opStatusPillClosed: {
    backgroundColor: "#FEE2E2",
  },
  opStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  opStatusDotOpen: {
    backgroundColor: "#15803D",
  },
  opStatusDotClosed: {
    backgroundColor: "#DC2626",
  },
  opStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  opStatusTextOpen: {
    color: "#15803D",
  },
  opStatusTextClosed: {
    color: "#DC2626",
  },
  bankDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bankHoursText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  flowCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  flowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  flowTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#166534",
  },
  flowDesc: {
    fontSize: 11,
    color: "#15803D",
    lineHeight: 16,
    marginBottom: 12,
  },
  flowStepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  flowStepItem: {
    alignItems: "center",
  },
  flowStepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#15803D",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 2,
  },
  flowStepLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#374151",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  addressInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 10,
    fontSize: 12,
    color: "#111827",
    textAlignVertical: "top",
    minHeight: 60,
  },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 10,
    fontSize: 12,
    color: "#111827",
    textAlignVertical: "top",
    marginTop: 8,
    minHeight: 50,
  },
  summaryCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#047857",
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#064E3B",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#A7F3D0",
    marginVertical: 8,
  },
  summaryPointLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  summaryPointVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  btnSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803D",
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnSubmitDisabled: {
    backgroundColor: "#9CA3AF",
  },
  btnSubmitText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  successModalSubtitle: {
    fontSize: 11.5,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16,
  },
  successCodeBox: {
    width: "100%",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  successCodeLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  successCodeText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#166534",
    marginTop: 2,
    letterSpacing: 1,
  },
  btnViewTracking: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
  },
  btnViewTrackingText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnBackHome: {
    paddingVertical: 8,
  },
  btnBackHomeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#6B7280",
  },
});
