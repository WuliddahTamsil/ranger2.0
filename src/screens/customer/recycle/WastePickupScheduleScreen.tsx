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
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { createWasteDeposit } from "../../../services/recycleService";
import { rp } from "../../../utils/formatters";

interface Props extends Nav {
  authAccount?: any;
}

const TIME_SLOTS = [
  "08:00 - 10:00 WIB",
  "10:00 - 12:00 WIB",
  "13:00 - 15:00 WIB",
  "15:00 - 17:00 WIB",
];

const DATE_OPTIONS = [
  { label: "Hari Ini", offset: 0 },
  { label: "Besok", offset: 1 },
  { label: "Lusa", offset: 2 },
];

export const WastePickupScheduleScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const {
    selectedBank,
    draftDeposit,
    updateDraftDeposit,
    setSelectedDeposit,
  } = useRecycle();

  const [address, setAddress] = useState(
    draftDeposit.pickupAddress || authAccount?.address || "Ring 1 Kamojang, Ibun, Kab. Bandung"
  );
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [driverNotes, setDriverNotes] = useState(draftDeposit.pickupNotes || "");
  const [submitting, setSubmitting] = useState(false);

  // Compute date string
  const getDateString = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const totalWeight = draftDeposit.categories.reduce((sum, c) => sum + (c.estimatedWeightKg || 0), 0);
  const totalRupiah = draftDeposit.categories.reduce(
    (sum, c) => sum + Math.round((c.estimatedWeightKg || 0) * (c.pricePerKg || 0)),
    0
  );

  const handleSubmitPickup = async () => {
    if (!address.trim()) {
      Alert.alert("Alamat Diperlukan", "Masukkan alamat penjemputan sampah Anda.");
      return;
    }

    if (!selectedBank?._id) {
      Alert.alert("Error", "Bank Sampah tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      const scheduleString = `${getDateString(selectedDateIndex)}, Pukul ${selectedSlot}`;
      const payload = {
        bankSampahId: selectedBank._id,
        method: "PICKUP" as const,
        categories: draftDeposit.categories.map((c) => ({
          category: c.category,
          estimatedWeightKg: c.estimatedWeightKg,
        })),
        pickupAddress: address,
        pickupLatitude: -7.15,
        pickupLongitude: 107.8,
        pickupSchedule: scheduleString,
        pickupNotes: driverNotes,
      };

      const res = await createWasteDeposit(payload, `deposit_pickup_${Date.now()}`);
      if (res.success && res.data) {
        setSelectedDeposit(res.data);
        Alert.alert(
          "Permintaan Pickup Berhasil!",
          `Kode Setoran: ${res.data.depositCode}\n\nBank Sampah ${selectedBank.name} dan driver GEOVERSE akan menindaklanjuti jadwal pickup Anda.`,
          [{ text: "Pantau Status", onPress: () => navigate("c_recycle_tracking") }]
        );
      } else {
        Alert.alert("Gagal", res.message || "Gagal membuat jadwal pickup.");
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
          <Text style={styles.headerTitle}>Jadwal Penjemputan</Text>
          <Text style={styles.headerSub}>Pickup sampah dari rumah oleh driver</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={16} color="#15803D" />
            <Text style={styles.cardTitle}>Alamat Penjemputan</Text>
          </View>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Tuliskan alamat lengkap rumah/titik temu..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
          <View style={styles.locationTag}>
            <Text style={styles.locationTagText}>Titik akurat: Ring 1 Kamojang (PGE Geothermal)</Text>
          </View>
        </View>

        {/* Date Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={16} color="#15803D" />
            <Text style={styles.cardTitle}>Pilih Hari Penjemputan</Text>
          </View>
          <View style={styles.dateOptionsRow}>
            {DATE_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dateOptionBtn,
                  selectedDateIndex === idx && styles.dateOptionBtnActive,
                ]}
                onPress={() => setSelectedDateIndex(idx)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateOptionLabel,
                    selectedDateIndex === idx && styles.dateOptionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.dateOptionSub,
                    selectedDateIndex === idx && styles.dateOptionSubActive,
                  ]}
                >
                  {new Date(Date.now() + opt.offset * 86400000).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slot Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={16} color="#15803D" />
            <Text style={styles.cardTitle}>Pilih Slot Waktu</Text>
          </View>
          <View style={styles.slotGrid}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotChip, selectedSlot === slot && styles.slotChipActive]}
                onPress={() => setSelectedSlot(slot)}
                activeOpacity={0.8}
              >
                <Text style={[styles.slotChipText, selectedSlot === slot && styles.slotChipTextActive]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Driver Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Catatan untuk Driver (Opsional)</Text>
          <TextInput
            style={styles.notesInput}
            value={driverNotes}
            onChangeText={setDriverNotes}
            placeholder="Contoh: Pagar abu-abu, sampah sudah di karung depan teras..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Truck size={18} color="#065F46" />
            <Text style={styles.summaryTitle}>Ringkasan Permintaan</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bank Sampah Tujuan:</Text>
            <Text style={styles.summaryVal}>{selectedBank?.name || "-"}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Jumlah Kategori:</Text>
            <Text style={styles.summaryVal}>{draftDeposit.categories.length} jenis</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Estimasi Berat:</Text>
            <Text style={styles.summaryVal}>{totalWeight.toFixed(1)} kg</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryPointLabel}>Estimasi GEOVERSE Point:</Text>
            <Text style={styles.summaryPointVal}>+{totalRupiah.toLocaleString("id-ID")} Pts</Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
          onPress={handleSubmitPickup}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Truck size={18} color="#FFFFFF" />
              <Text style={styles.btnSubmitText}>Kirim Permintaan Pickup</Text>
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
    paddingBottom: 100,
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
  },
  locationTag: {
    marginTop: 6,
  },
  locationTagText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
  },
  dateOptionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateOptionBtn: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    alignItems: "center",
  },
  dateOptionBtnActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#15803D",
  },
  dateOptionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  dateOptionLabelActive: {
    color: "#15803D",
  },
  dateOptionSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  dateOptionSubActive: {
    color: "#15803D",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  slotChipActive: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  slotChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
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
  },
  summaryCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 4,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
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
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#4B5563",
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#DCFCE7",
    marginVertical: 8,
  },
  summaryPointLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#854D0E",
  },
  summaryPointVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#15803D",
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
});
