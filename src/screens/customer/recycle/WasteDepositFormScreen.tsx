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
  Package,
  Truck,
  Building2,
  Clock,
  MapPin,
  Sparkles,
  Scale,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Coins,
  FileText,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { createWasteDeposit } from "../../../services/recycleService";
import { WasteDepositUI } from "../../../types/recycleTypes";

export const WasteDepositFormScreen: React.FC<Nav> = ({ navigate }) => {
  const {
    selectedBank,
    draftDeposit,
    updateDraftDeposit,
    setSelectedDeposit,
  } = useRecycle();

  const [method, setMethod] = useState<"DROP_OFF" | "PICKUP">(draftDeposit.method || "DROP_OFF");
  const [notes, setNotes] = useState(draftDeposit.pickupNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [createdSuccessDeposit, setCreatedSuccessDeposit] = useState<WasteDepositUI | null>(null);

  const handleProceed = async () => {
    if (!selectedBank?._id) {
      Alert.alert("Error", "Pilih Bank Sampah tujuan terlebih dahulu.");
      return;
    }

    // Save method and notes to draft
    updateDraftDeposit({
      method,
      pickupNotes: notes,
      categories: [],
    });

    if (method === "PICKUP") {
      navigate("c_recycle_pickup_schedule");
    } else {
      // DROP_OFF direct submit
      setSubmitting(true);
      try {
        const payload = {
          bankSampahId: selectedBank._id,
          method: "DROP_OFF" as const,
          categories: [],
          pickupNotes: notes,
        };
        const res = await createWasteDeposit(payload, `deposit_dropoff_${Date.now()}`);
        if (res.success && res.data) {
          setSelectedDeposit(res.data);
          setCreatedSuccessDeposit(res.data);
        } else {
          Alert.alert("Gagal", res.message || "Gagal membuat tiket setor.");
        }
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Terjadi kesalahan pada server.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Formulir Setor Sampah</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Tujuan: {selectedBank?.name || "Bank Sampah Terdekat"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Destination Bank Card */}
        <View style={styles.destinationCard}>
          <View style={styles.destinationTop}>
            <View style={styles.bankIconBg}>
              <Building2 size={22} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.bankLabel}>Bank Sampah Tujuan:</Text>
              <Text style={styles.bankName}>{selectedBank?.name || "Bank Sampah Merdeka Bersih"}</Text>
            </View>
          </View>
          <View style={styles.bankInfoDivider} />
          <View style={styles.bankDetailsCol}>
            <View style={styles.detailItemRow}>
              <MapPin size={13} color="#64748B" />
              <Text style={styles.detailText} numberOfLines={1}>
                {selectedBank?.address || "Jl. Merdeka No. 64, Sumur Bandung"}
              </Text>
            </View>
            <View style={styles.detailItemRow}>
              <Clock size={13} color="#15803D" />
              <Text style={[styles.detailText, { color: "#15803D", fontWeight: "700" }]}>
                {selectedBank?.openingHours || "Senin - Sabtu, 08:00 - 16:00"}
              </Text>
            </View>
          </View>
        </View>

        {/* Method Toggle */}
        <Text style={styles.sectionTitle}>Pilih Metode Penyetoran</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodCard, method === "DROP_OFF" && styles.methodCardActive]}
            onPress={() => setMethod("DROP_OFF")}
            activeOpacity={0.85}
          >
            <View style={[styles.methodIconCircle, method === "DROP_OFF" && styles.methodIconCircleActive]}>
              <Package size={22} color={method === "DROP_OFF" ? "#15803D" : "#64748B"} />
            </View>
            <Text style={[styles.methodTitle, method === "DROP_OFF" && styles.methodTitleActive]}>
              Antar Langsung
            </Text>
            <Text style={styles.methodSub}>Datang langsung ke unit Bank Sampah</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, method === "PICKUP" && styles.methodCardActive]}
            onPress={() => setMethod("PICKUP")}
            activeOpacity={0.85}
          >
            <View style={[styles.methodIconCircle, method === "PICKUP" && styles.methodIconCircleActive]}>
              <Truck size={22} color={method === "PICKUP" ? "#15803D" : "#64748B"} />
            </View>
            <Text style={[styles.methodTitle, method === "PICKUP" && styles.methodTitleActive]}>
              Minta Pickup
            </Text>
            <Text style={styles.methodSub}>Dijemput driver kurir ke lokasi Anda</Text>
          </TouchableOpacity>
        </View>

        {/* How It Works Explainer Banner */}
        <View style={styles.flowBannerCard}>
          <View style={styles.flowBannerHeader}>
            <Sparkles size={16} color="#15803D" />
            <Text style={styles.flowBannerTitle}>Alur Setor & Konversi Koin Otomatis</Text>
          </View>

          <View style={styles.stepsList}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>Buat Tiket Setoran</Text>
                <Text style={styles.stepDesc}>Dapatkan kode tiket untuk diserahkan ke petugas atau driver.</Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>Petugas Menimbang Berat</Text>
                <Text style={styles.stepDesc}>Petugas Bank Sampah akan menimbang seluruh sampah Anda secara transparan.</Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>Koin Poin Otomatis Masuk</Text>
                <Text style={styles.stepDesc}>Hasil timbangan dikonversi otomatis (1 Poin = Rp 1) dan langsung cair ke akun Anda.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        <Text style={styles.sectionTitle}>Catatan Tambahan (Opsional)</Text>
        <View style={styles.notesBox}>
          <TextInput
            style={styles.notesInput}
            placeholder="Contoh: Ada botol plastik & kardus box di depan pagar, siap timbang..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Bottom CTA Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
          onPress={handleProceed}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.btnSubmitText}>
                {method === "PICKUP" ? "Lanjut Pilih Alamat Pickup" : "Buat Tiket Setor Sekarang"}
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
        onRequestClose={() => {
          setCreatedSuccessDeposit(null);
          navigate("c_recycle_tracking");
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBg}>
              <CheckCircle2 size={42} color="#15803D" />
            </View>
            <Text style={styles.modalSuccessTitle}>Tiket Setoran Berhasil Dibuat!</Text>
            <Text style={styles.modalSuccessSub}>
              Bawa sampah Anda ke Bank Sampah untuk ditimbang langsung oleh petugas.
            </Text>

            <View style={styles.codeSummaryBox}>
              <Text style={styles.codeSummaryLabel}>KODE TIKET SETORAN:</Text>
              <Text style={styles.codeSummaryValue}>{createdSuccessDeposit?.depositCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalBtnAction}
              onPress={() => {
                setCreatedSuccessDeposit(null);
                navigate("c_recycle_tracking");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnActionText}>Buka Pelacakan & QR Setoran</Text>
              <ChevronRight size={16} color="#FFFFFF" />
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  destinationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  destinationTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  bankLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bankName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 1,
  },
  bankInfoDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  bankDetailsCol: {
    gap: 4,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 11.5,
    color: "#475569",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  methodCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  methodCardActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  methodIconCircleActive: {
    backgroundColor: "#DCFCE7",
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 3,
  },
  methodTitleActive: {
    color: "#15803D",
  },
  methodSub: {
    fontSize: 10.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 14,
  },
  flowBannerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  flowBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  flowBannerTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#15803D",
  },
  stepsList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#15803D",
  },
  stepHead: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepDesc: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
    lineHeight: 14,
  },
  notesBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 10,
  },
  notesInput: {
    fontSize: 12.5,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 65,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    padding: 14,
    paddingBottom: 20,
  },
  btnSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  modalIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalSuccessTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  modalSuccessSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
  },
  codeSummaryBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
    marginVertical: 16,
  },
  codeSummaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  codeSummaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
    marginTop: 2,
    letterSpacing: 0.8,
  },
  modalBtnAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 13,
    width: "100%",
  },
  modalBtnActionText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
});
