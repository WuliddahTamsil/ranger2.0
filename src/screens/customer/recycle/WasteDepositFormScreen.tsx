import React, { useState, useEffect } from "react";
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
  useWindowDimensions,
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
  AlertCircle,
  AlertTriangle,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { createWasteDeposit } from "../../../services/recycleService";
import { WasteDepositUI } from "../../../types/recycleTypes";
import { checkBankOperationalStatus } from "../../../utils/bankOperationalUtils";

export const WasteDepositFormScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

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

  const isPickupAvailable = selectedBank?.acceptsPickup !== false;
  const opStatus = checkBankOperationalStatus(selectedBank?.openingHours);

  useEffect(() => {
    if (!isPickupAvailable && method === "PICKUP") {
      setMethod("DROP_OFF");
    }
  }, [isPickupAvailable, method]);

  const handleProceed = async () => {
    if (!opStatus.isOpen) {
      Alert.alert(
        "Bank Sampah Sedang Tutup",
        `Bank Sampah ${selectedBank?.name || ""} sedang tutup saat ini (${opStatus.reason || `Jam operasional: ${opStatus.hoursText}`}). Layanan setor sampah hanya dapat diakses pada jam buka.`
      );
      return;
    }

    if (!selectedBank?._id) {
      Alert.alert("Error", "Pilih Bank Sampah tujuan terlebih dahulu.");
      return;
    }

    if (method === "PICKUP" && !isPickupAvailable) {
      Alert.alert(
        "Layanan Pickup Nonaktif",
        `${selectedBank.name || "Bank Sampah ini"} sedang menonaktifkan layanan driver pickup. Silakan gunakan metode Antar Langsung.`
      );
      setMethod("DROP_OFF");
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
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate("c_recycle_home")}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Formulir Setor Sampah</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              Mitra Tujuan: {selectedBank?.name || "Bank Sampah Terdekat"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Destination Bank Card */}
        <View style={styles.destinationCard}>
          <View style={styles.destinationTop}>
            <View style={styles.bankIconBg}>
              <Building2 size={20} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.bankLabel}>BANK SAMPAH TUJUAN</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={styles.bankName}>{selectedBank?.name || "Bank Sampah Resmi GEOVERSE"}</Text>
                <ShieldCheck size={14} color="#059669" />
              </View>
            </View>
          </View>

          <View style={styles.bankInfoDivider} />

          <View style={styles.bankDetailsCol}>
            <View style={styles.detailItemRow}>
              <MapPin size={13} color="#64748B" />
              <Text style={styles.detailText} numberOfLines={1}>
                {selectedBank?.address || "Area Layanan Kamojang & Garut"}
              </Text>
            </View>
            <View style={styles.detailItemRow}>
              <Clock size={13} color="#059669" />
              <Text style={[styles.detailText, { color: "#059669", fontWeight: "600" }]}>
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
              <Package size={20} color={method === "DROP_OFF" ? "#059669" : "#64748B"} />
            </View>
            <Text style={[styles.methodTitle, method === "DROP_OFF" && styles.methodTitleActive]}>
              Antar Langsung
            </Text>
            <Text style={styles.methodSub}>Bawa sampah langsung ke lokasi Bank Sampah</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              method === "PICKUP" && isPickupAvailable && styles.methodCardActive,
              !isPickupAvailable && styles.methodCardDisabled,
            ]}
            onPress={() => {
              if (isPickupAvailable) {
                setMethod("PICKUP");
              } else {
                Alert.alert(
                  "Layanan Pickup Nonaktif",
                  `${selectedBank?.name || "Bank Sampah ini"} sedang menonaktifkan layanan driver pickup. Silakan gunakan metode Antar Langsung.`
                );
              }
            }}
            activeOpacity={isPickupAvailable ? 0.85 : 0.6}
          >
            <View
              style={[
                styles.methodIconCircle,
                method === "PICKUP" && isPickupAvailable && styles.methodIconCircleActive,
                !isPickupAvailable && styles.methodIconCircleDisabled,
              ]}
            >
              <Truck size={20} color={!isPickupAvailable ? "#94A3B8" : method === "PICKUP" ? "#059669" : "#64748B"} />
            </View>
            <View style={styles.methodTitleWrap}>
              <Text
                style={[
                  styles.methodTitle,
                  method === "PICKUP" && isPickupAvailable && styles.methodTitleActive,
                  !isPickupAvailable && styles.methodTitleDisabled,
                ]}
              >
                Jemput Driver
              </Text>
              {!isPickupAvailable && (
                <View style={styles.disabledTag}>
                  <Text style={styles.disabledTagText}>Nonaktif</Text>
                </View>
              )}
            </View>
            <Text style={[styles.methodSub, !isPickupAvailable && styles.methodSubDisabled]}>
              {isPickupAvailable
                ? "Kurir driver menjemput sampah ke alamat Anda"
                : "Layanan driver penjemputan sedang nonaktif"}
            </Text>
          </TouchableOpacity>
        </View>

        {!isPickupAvailable && (
          <View style={styles.pickupDisabledNotice}>
            <AlertCircle size={14} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={styles.pickupDisabledNoticeText}>
              Mitra Bank Sampah ini <Text style={{ fontWeight: "700" }}>hanya menerima setoran antar langsung</Text>. Layanan penjemputan driver sedang tidak tersedia.
            </Text>
          </View>
        )}

        {/* How It Works Explainer Banner */}
        <View style={styles.flowBannerCard}>
          <View style={styles.flowBannerHeader}>
            <Sparkles size={15} color="#059669" />
            <Text style={styles.flowBannerTitle}>Alur Setoran & Pencairan Poin Otomatis</Text>
          </View>

          <View style={styles.stepsList}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>Buat Tiket Setoran</Text>
                <Text style={styles.stepDesc}>Dapatkan kode tiket untuk diverifikasi saat serah terima sampah.</Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>Penimbangan Transparan</Text>
                <Text style={styles.stepDesc}>Petugas Bank Sampah menimbang berat sampah di timbangan digital resmi.</Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>Poin GEOVERSE Masuk Otomatis</Text>
                <Text style={styles.stepDesc}>Nilai hasil timbangan (100 Pts = Rp 1) langsung cair ke dompet poin Anda.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        <Text style={styles.sectionTitle}>Catatan Tambahan (Opsional)</Text>
        <View style={styles.notesBox}>
          <TextInput
            style={styles.notesInput}
            placeholder="Contoh: Ada botol plastik & kardus box siap timbang..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Bottom CTA Bar */}
      <View style={styles.bottomBarWrapper}>
        <View style={[styles.bottomBar, isWide && styles.bottomBarWide]}>
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
                <ChevronRight size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
              <CheckCircle2 size={36} color="#059669" />
            </View>
            <Text style={styles.modalSuccessTitle}>Tiket Setoran Berhasil Dibuat!</Text>
            <Text style={styles.modalSuccessSub}>
              Bawa sampah Anda ke Bank Sampah tujuan untuk ditimbang langsung oleh petugas.
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
              <Text style={styles.modalBtnActionText}>Buka Status & Pelacakan</Text>
              <ChevronRight size={15} color="#FFFFFF" />
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
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  scrollContentWide: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  destinationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  destinationTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  bankLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.5,
  },
  bankName: {
    fontSize: 14,
    fontWeight: "700",
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
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
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
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  methodCardDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.8,
  },
  methodIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  methodIconCircleActive: {
    backgroundColor: "#ECFDF5",
  },
  methodIconCircleDisabled: {
    backgroundColor: "#F1F5F9",
  },
  methodTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  methodTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  methodTitleActive: {
    color: "#059669",
  },
  methodTitleDisabled: {
    color: "#94A3B8",
  },
  disabledTag: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  disabledTagText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#DC2626",
  },
  methodSub: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 13,
  },
  methodSubDisabled: {
    color: "#94A3B8",
  },
  pickupDisabledNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  pickupDisabledNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#991B1B",
    lineHeight: 15,
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
  },
  flowBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  stepsList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepNumCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  stepNumText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  stepHead: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  stepDesc: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
    lineHeight: 14,
  },
  notesBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    minHeight: 70,
  },
  notesInput: {
    fontSize: 12,
    color: "#0F172A",
    textAlignVertical: "top",
    padding: 0,
  },
  bottomBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  bottomBarWide: {
    paddingHorizontal: 24,
  },
  btnSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Modal Success
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  modalSuccessTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  modalSuccessSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 15,
  },
  codeSummaryBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginVertical: 14,
    width: "100%",
  },
  codeSummaryLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  codeSummaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
    marginTop: 2,
    letterSpacing: 1,
  },
  modalBtnAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
    width: "100%",
  },
  modalBtnActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
