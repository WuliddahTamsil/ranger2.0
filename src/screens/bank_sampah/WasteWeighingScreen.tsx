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
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Scale,
  Camera,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronRight,
  User,
} from "lucide-react-native";
import { Nav } from "../../types";
import { useRecycle } from "../../context/RecycleContext";
import { weighWasteDeposit } from "../../services/recycleService";
import { rp } from "../../utils/formatters";

export const WasteWeighingScreen: React.FC<Nav> = ({ navigate }) => {
  const { selectedDeposit, setSelectedDeposit } = useRecycle();
  const [actualWeights, setActualWeights] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState(
    "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500"
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedDeposit?.categories) return;
    const initial: Record<string, number> = {};
    selectedDeposit.categories.forEach((c) => {
      // Default actual weight to customer estimate or current actual
      initial[c.category] = c.actualWeightKg || c.estimatedWeightKg || 1;
    });
    setActualWeights(initial);
    if (selectedDeposit.weighingNotes) {
      setNotes(selectedDeposit.weighingNotes);
    }
  }, [selectedDeposit?._id]);

  if (!selectedDeposit) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>Data setoran tidak dipilih.</Text>
          <TouchableOpacity style={styles.btnBack} onPress={() => navigate("bank_sampah_dashboard")}>
            <Text style={styles.btnBackText}>Kembali ke Antrean</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  const deposit = selectedDeposit;

  const handleUpdateWeight = (catName: string, text: string) => {
    const val = parseFloat(text.replace(",", ".")) || 0;
    setActualWeights((prev) => ({ ...prev, [catName]: val }));
  };

  // Live calculations
  let totalActualKg = 0;
  let totalActualRupiah = 0;

  deposit.categories.forEach((cat) => {
    const w = actualWeights[cat.category] !== undefined ? actualWeights[cat.category] : (cat.estimatedWeightKg || 0);
    totalActualKg += w;
    totalActualRupiah += Math.round(w * cat.pricePerKg);
  });

  const totalActualPoints = totalActualRupiah; // 1 Point = Rp 1

  const handleSubmitWeighing = async () => {
    if (totalActualKg <= 0) {
      Alert.alert("Input Berat", "Masukkan berat aktual hasil timbangan timbangan.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        categories: deposit.categories.map((c) => ({
          category: c.category,
          actualWeightKg: actualWeights[c.category] || c.estimatedWeightKg || 0,
        })),
        weighingProofPhotos: proofPhotoUrl ? [proofPhotoUrl] : [],
        weighingNotes: notes || "Ditimbang resmi oleh petugas Bank Sampah.",
      };

      const res = await weighWasteDeposit(deposit._id, payload);
      if (res.success && res.data) {
        setSelectedDeposit(res.data);
        Alert.alert(
          "Hasil Timbang Berhasil Disimpan!",
          `Status kini: Menunggu Konfirmasi Customer.\nTotal: ${totalActualKg.toFixed(1)} kg (${rp(totalActualRupiah)} / ${totalActualPoints.toLocaleString("id-ID")} Points).`,
          [{ text: "Kembali ke Dashboard", onPress: () => navigate("bank_sampah_dashboard") }]
        );
      } else {
        Alert.alert("Gagal", res.message || "Gagal menyimpan hasil timbangan.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kesalahan pada server.");
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
          onPress={() => navigate("bank_sampah_dashboard")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Input Timbangan Aktual</Text>
          <Text style={styles.headerSub}>Kode: {deposit.depositCode}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Customer & Method Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User size={16} color="#15803D" />
            <Text style={styles.infoCustomer}>
              Customer: {typeof deposit.customerId === "object" ? deposit.customerId?.name : "Pengguna"}
            </Text>
          </View>
          <Text style={styles.infoMethod}>
            Metode: {deposit.method === "PICKUP" ? "Pickup Driver" : "Setor Langsung ke Bank"}
          </Text>
        </View>

        {/* Categories Input Form */}
        <Text style={styles.sectionTitle}>Input Berat per Kategori</Text>
        {deposit.categories.map((cat, idx) => {
          const currentActual = actualWeights[cat.category] !== undefined ? actualWeights[cat.category] : (cat.estimatedWeightKg || 0);
          const subtotalRp = Math.round(currentActual * cat.pricePerKg);

          return (
            <View key={idx} style={styles.catCard}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>{cat.category}</Text>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>Rp {cat.pricePerKg.toLocaleString("id-ID")}/kg</Text>
                </View>
              </View>

              <Text style={styles.estLabel}>Estimasi Customer: {cat.estimatedWeightKg || 0} kg</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputTitle}>Berat Aktual Skala</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.weightTextInput}
                      keyboardType="numeric"
                      value={String(currentActual)}
                      onChangeText={(t) => handleUpdateWeight(cat.category, t)}
                    />
                    <Text style={styles.unitText}>kg</Text>
                  </View>
                </View>

                <View style={styles.subtotalCol}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalVal}>{rp(subtotalRp)}</Text>
                  <Text style={styles.subtotalPoint}>+{subtotalRp.toLocaleString("id-ID")} Pts</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Proof Photo URL Mock / Input */}
        <View style={styles.proofCard}>
          <View style={styles.proofHeader}>
            <Camera size={16} color="#15803D" />
            <Text style={styles.proofTitle}>Foto Bukti Timbangan (URL)</Text>
          </View>
          <TextInput
            style={styles.urlInput}
            value={proofPhotoUrl}
            onChangeText={setProofPhotoUrl}
            placeholder="https://link-foto-timbangan.jpg"
          />
        </View>

        {/* Officer Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Catatan Petugas</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tuliskan catatan kondisi timbangan / sampah..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Total Summary */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Berat Aktual:</Text>
            <Text style={styles.totalVal}>{totalActualKg.toFixed(1)} kg</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Rupiah:</Text>
            <Text style={styles.totalVal}>{rp(totalActualRupiah)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={18} color="#FBBF24" />
              <Text style={styles.pointRewardLabel}>GEOVERSE Point Siap Terbit:</Text>
            </View>
            <Text style={styles.pointRewardVal}>+{totalActualPoints.toLocaleString("id-ID")} Pts</Text>
          </View>
          <Text style={styles.note}>
            *Customer akan menerima pemberitahuan untuk menyetujui hasil timbang ini.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
          onPress={handleSubmitWeighing}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnSubmitText}>Kirim Hasil Timbang ke Customer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoCustomer: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  infoMethod: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  catCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  catName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  pricePill: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  estLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputTitle: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
  },
  weightTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    paddingVertical: 8,
  },
  unitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  subtotalCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  subtotalLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  subtotalVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  subtotalPoint: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CA8A04",
  },
  proofCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  proofTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  urlInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    color: "#111827",
  },
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
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
  },
  totalCard: {
    backgroundColor: "#1B7A4E",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  totalLabel: {
    fontSize: 12,
    color: "#DCFCE7",
  },
  totalVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  totalDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 10,
  },
  pointRewardLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FDE047",
  },
  pointRewardVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  note: {
    fontSize: 10,
    color: "#A7F3D0",
    marginTop: 6,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  btnSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#15803D",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnSubmitText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 14,
  },
  btnBack: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnBackText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
