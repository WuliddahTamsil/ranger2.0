import React, { useEffect, useState } from "react";
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
  Package,
  Truck,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
  Camera,
  ChevronRight,
  CheckCircle2,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getWasteBankPrices, createWasteDeposit } from "../../../services/recycleService";
import { WasteCategory, WasteCategoryPriceUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

interface SelectedCategoryItem {
  category: WasteCategory;
  subCategory: string;
  pricePerKg: number;
  estimatedWeightKg: number;
}

export const WasteDepositFormScreen: React.FC<Nav> = ({ navigate }) => {
  const {
    selectedBank,
    draftDeposit,
    updateDraftDeposit,
    setSelectedDeposit,
  } = useRecycle();

  const [availablePrices, setAvailablePrices] = useState<WasteCategoryPriceUI[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [method, setMethod] = useState<"DROP_OFF" | "PICKUP">(draftDeposit.method || "DROP_OFF");
  const [items, setItems] = useState<SelectedCategoryItem[]>([]);
  const [notes, setNotes] = useState(draftDeposit.pickupNotes || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedBank?._id) return;
    let active = true;
    setLoadingPrices(true);
    getWasteBankPrices(selectedBank._id)
      .then((res) => {
        if (!active) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setAvailablePrices(res.data);
          // Pre-populate with first category if empty
          if (items.length === 0) {
            setItems([
              {
                category: res.data[0].category,
                subCategory: res.data[0].subCategory || "",
                pricePerKg: res.data[0].pricePerKg,
                estimatedWeightKg: 2,
              },
            ]);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoadingPrices(false);
      });
    return () => {
      active = false;
    };
  }, [selectedBank?._id]);

  const handleAddCategory = () => {
    if (availablePrices.length === 0) return;
    // Pick the next category not yet added, or fallback to first
    const unusedPrice =
      availablePrices.find((p) => !items.some((i) => i.category === p.category)) ||
      availablePrices[0];
    setItems((prev) => [
      ...prev,
      {
        category: unusedPrice.category,
        subCategory: unusedPrice.subCategory || "",
        pricePerKg: unusedPrice.pricePerKg,
        estimatedWeightKg: 1,
      },
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    if (items.length <= 1) {
      Alert.alert("Perhatian", "Minimal sertakan 1 kategori sampah.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateWeight = (index: number, val: string) => {
    const num = parseFloat(val.replace(",", ".")) || 0;
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, estimatedWeightKg: num } : item))
    );
  };

  const handleChangeCategory = (index: number, categoryName: WasteCategory) => {
    const priceObj = availablePrices.find((p) => p.category === categoryName);
    if (!priceObj) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              category: priceObj.category,
              subCategory: priceObj.subCategory || "",
              pricePerKg: priceObj.pricePerKg,
            }
          : item
      )
    );
  };

  // Estimations
  const totalWeight = items.reduce((sum, item) => sum + (item.estimatedWeightKg || 0), 0);
  const totalRupiah = items.reduce(
    (sum, item) => sum + Math.round((item.estimatedWeightKg || 0) * item.pricePerKg),
    0
  );
  const totalPoint = totalRupiah; // 1 Point = Rp 1

  const handleProceed = async () => {
    if (totalWeight <= 0) {
      Alert.alert("Berat Kosong", "Masukkan estimasi berat sampah terlebih dahulu.");
      return;
    }

    if (!selectedBank?._id) {
      Alert.alert("Error", "Pilih Bank Sampah terlebih dahulu.");
      return;
    }

    // Save items to draft
    updateDraftDeposit({
      method,
      categories: items,
      pickupNotes: notes,
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
          categories: items.map((item) => ({
            category: item.category,
            estimatedWeightKg: item.estimatedWeightKg,
          })),
          pickupNotes: notes,
        };
        const res = await createWasteDeposit(payload, `deposit_dropoff_${Date.now()}`);
        if (res.success && res.data) {
          setSelectedDeposit(res.data);
          Alert.alert(
            "Tiket Setor Berhasil Dibuat!",
            `Kode Setoran Anda: ${res.data.depositCode}\n\nSilakan bawa sampah Anda ke ${selectedBank.name}. Petugas akan menimbang di lokasi.`,
            [{ text: "Buka Status", onPress: () => navigate("c_recycle_tracking") }]
          );
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
          onPress={() => navigate("c_recycle_bank_detail")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Formulir Setor Sampah</Text>
          <Text style={styles.headerSub}>{selectedBank?.name || "Bank Sampah"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Method Toggle: Drop Off vs Pickup */}
        <Text style={styles.sectionLabel}>Metode Penyetoran</Text>
        <View style={styles.methodToggleRow}>
          <TouchableOpacity
            style={[styles.methodCard, method === "DROP_OFF" && styles.methodCardActive]}
            onPress={() => setMethod("DROP_OFF")}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIconBg, method === "DROP_OFF" && styles.methodIconBgActive]}>
              <Package size={20} color={method === "DROP_OFF" ? "#FFFFFF" : "#15803D"} />
            </View>
            <Text style={[styles.methodTitle, method === "DROP_OFF" && styles.methodTitleActive]}>
              Antar Langsung
            </Text>
            <Text style={styles.methodDesc}>Datang langsung ke Bank Sampah</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              method === "PICKUP" && styles.methodCardActive,
              !selectedBank?.acceptsPickup && styles.methodCardDisabled,
            ]}
            onPress={() => {
              if (selectedBank?.acceptsPickup) setMethod("PICKUP");
              else Alert.alert("Informasi", "Bank sampah ini belum melayani pickup.");
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIconBg, method === "PICKUP" && styles.methodIconBgActive]}>
              <Truck size={20} color={method === "PICKUP" ? "#FFFFFF" : "#047857"} />
            </View>
            <Text style={[styles.methodTitle, method === "PICKUP" && styles.methodTitleActive]}>
              Minta Pickup
            </Text>
            <Text style={styles.methodDesc}>Dijemput driver ke rumah</Text>
          </TouchableOpacity>
        </View>

        {/* Category Items List */}
        <View style={styles.categorySectionHeader}>
          <Text style={styles.sectionLabel}>Pilih Kategori & Estimasi Berat</Text>
          <TouchableOpacity
            style={styles.btnAddCategory}
            onPress={handleAddCategory}
            activeOpacity={0.7}
          >
            <Plus size={14} color="#15803D" />
            <Text style={styles.btnAddCategoryText}>Tambah Jenis</Text>
          </TouchableOpacity>
        </View>

        {loadingPrices ? (
          <ActivityIndicator size="small" color="#15803D" style={{ marginVertical: 20 }} />
        ) : (
          items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View style={styles.itemIndexPill}>
                  <Text style={styles.itemIndexText}>#{index + 1}</Text>
                </View>
                <Text style={styles.itemTitle}>{item.category}</Text>
                {items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveCategory(index)}
                    style={styles.btnDelete}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Picker Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChips}
              >
                {availablePrices.map((catPrice) => (
                  <TouchableOpacity
                    key={catPrice._id}
                    style={[
                      styles.categoryChip,
                      item.category === catPrice.category && styles.categoryChipActive,
                    ]}
                    onPress={() => handleChangeCategory(index, catPrice.category)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        item.category === catPrice.category && styles.categoryChipTextActive,
                      ]}
                    >
                      {catPrice.category} ({rp(catPrice.pricePerKg)}/kg)
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Weight Input Row */}
              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Estimasi Berat</Text>
                  <View style={styles.weightInputBox}>
                    <TextInput
                      style={styles.weightInput}
                      keyboardType="numeric"
                      value={item.estimatedWeightKg ? String(item.estimatedWeightKg) : ""}
                      onChangeText={(val) => handleUpdateWeight(index, val)}
                      placeholder="0.0"
                    />
                    <Text style={styles.weightUnit}>kg</Text>
                  </View>
                </View>

                <View style={styles.calcPreviewCol}>
                  <Text style={styles.calcPreviewLabel}>Estimasi Perolehan</Text>
                  <Text style={styles.calcPreviewRupiah}>
                    {rp(Math.round((item.estimatedWeightKg || 0) * item.pricePerKg))}
                  </Text>
                  <Text style={styles.calcPreviewPoint}>
                    ≈ {Math.round((item.estimatedWeightKg || 0) * item.pricePerKg).toLocaleString("id-ID")} Pts
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Notes Input */}
        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Catatan Tambahan (Opsional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Contoh: Kardus sudah diikat rapi, botol sudah bersih..."
          placeholderTextColor="#9CA3AF"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Calculation Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Estimasi Berat:</Text>
            <Text style={styles.summaryValBold}>{totalWeight.toFixed(1)} kg</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Estimasi Nilai:</Text>
            <Text style={styles.summaryValBold}>{rp(totalRupiah)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={18} color="#CA8A04" />
              <Text style={styles.summaryPointLabel}>Estimasi GEOVERSE Point:</Text>
            </View>
            <Text style={styles.summaryPointVal}>+{totalPoint.toLocaleString("id-ID")} Pts</Text>
          </View>
        </View>

        {/* Mandatory Disclaimer Alert */}
        <View style={styles.disclaimerBox}>
          <Info size={18} color="#D97706" style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            <Text style={{ fontWeight: "800" }}>PENTING: </Text>
            Nilai final mengikuti hasil timbang petugas Bank Sampah. Point hanya diterbitkan setelah Anda menyetujui hasil timbangan resmi.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.btnProceed, submitting && { opacity: 0.7 }]}
          onPress={handleProceed}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.btnProceedText}>
                {method === "PICKUP" ? "Lanjut Pilih Jadwal Pickup" : "Buat Tiket Setor Sekarang"}
              </Text>
              <ChevronRight size={18} color="#FFFFFF" />
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
    paddingBottom: 110,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
  },
  methodToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  methodCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  methodCardActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  methodIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  methodIconBgActive: {
    backgroundColor: "#15803D",
  },
  methodTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  methodTitleActive: {
    color: "#15803D",
  },
  methodDesc: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  categorySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  btnAddCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnAddCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  itemIndexPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  itemIndexText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4B5563",
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  btnDelete: {
    padding: 4,
  },
  categoryChips: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 4,
  },
  weightInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
  },
  weightInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    paddingVertical: 8,
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  calcPreviewCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  calcPreviewLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  calcPreviewRupiah: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  calcPreviewPoint: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CA8A04",
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    fontSize: 12,
    color: "#111827",
    textAlignVertical: "top",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#374151",
  },
  summaryValBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#DCFCE7",
    marginVertical: 8,
  },
  summaryPointLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#854D0E",
  },
  summaryPointVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#15803D",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 12,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
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
  btnProceed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#15803D",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnProceedText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
