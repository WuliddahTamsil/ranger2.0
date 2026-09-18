import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  Package,
  Camera,
  ShieldCheck,
  ChevronRight,
  Info,
  X,
  Plus,
  Minus,
  User,
  Phone,
  MessageSquare,
  FileText,
  Coffee,
  Shirt,
  Smartphone,
  Box,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Nav, SendPackageCategory } from "../../../types";
import { useSendContext } from "../../../context/SendContext";
import { SendProgressIndicator } from "../../../components/send/SendProgressIndicator";
import { uploadFileToBackend } from "../../../services/api";

interface SendPackageDetailScreenProps extends Nav {}

const CATEGORIES: { id: SendPackageCategory; label: string; icon: any }[] = [
  { id: "Dokumen", label: "Dokumen", icon: FileText },
  { id: "Makanan", label: "Makanan", icon: Coffee },
  { id: "Pakaian", label: "Pakaian", icon: Shirt },
  { id: "Elektronik", label: "Elektronik", icon: Smartphone },
  { id: "Paket kecil", label: "Dus / Box", icon: Package },
  { id: "Lainnya", label: "Lainnya", icon: Box },
];

const WEIGHT_PRESETS = [1, 3, 5, 10];

export const SendPackageDetailScreen: React.FC<SendPackageDetailScreenProps> = ({
  navigate,
}) => {
  const { recipient, setRecipient, packageData, setPackageData } = useSendContext();

  // Recipient form state
  const [recipientName, setRecipientName] = useState(recipient.name || "");
  const [recipientPhone, setRecipientPhone] = useState(recipient.phone || "");
  const [driverNotes, setDriverNotes] = useState(recipient.notes || "");

  // Package form state
  const [packageName, setPackageName] = useState(packageData.name || "");
  const [category, setCategory] = useState<SendPackageCategory>(packageData.category || "Dokumen");
  const [weightKg, setWeightKg] = useState<number>(packageData.weightKg || 1);
  const [lengthCm, setLengthCm] = useState(String(packageData.lengthCm || 15));
  const [widthCm, setWidthCm] = useState(String(packageData.widthCm || 15));
  const [heightCm, setHeightCm] = useState(String(packageData.heightCm || 10));
  const [fragile, setFragile] = useState(Boolean(packageData.fragile));
  const [specialHandling, setSpecialHandling] = useState(Boolean(packageData.specialHandling));
  const [declaredValue, setDeclaredValue] = useState(
    packageData.declaredValue > 0 ? String(packageData.declaredValue) : ""
  );
  const [packageNotes, setPackageNotes] = useState(packageData.notes || "");
  const [photos, setPhotos] = useState<string[]>(packageData.photoUrls || []);

  // UI accordion for dimensions & extra handling
  const [showDimensionSection, setShowDimensionSection] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Inline Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!recipientName.trim()) {
      errs.recipientName = "Nama penerima wajib diisi.";
    }
    if (!recipientPhone.trim() || recipientPhone.length < 9) {
      errs.recipientPhone = "Nomor WhatsApp penerima tidak valid.";
    }
    if (!packageName.trim()) {
      errs.packageName = "Nama barang wajib diisi.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePickPhoto = async () => {
    if (photos.length >= 3) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingPhoto(true);
        const url = await uploadFileToBackend(
          result.assets[0].uri,
          `pkg-${Date.now()}.jpg`,
          "image/jpeg"
        );
        setPhotos((prev) => [...prev, url || result.assets[0].uri]);
      }
    } catch (e) {
      console.warn("Photo pick error:", e);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProceed = () => {
    if (!validateForm()) return;

    // Save recipient data
    setRecipient((prev) => ({
      ...prev,
      name: recipientName.trim(),
      phone: recipientPhone.trim(),
      notes: driverNotes.trim(),
    }));

    // Save package data
    setPackageData((prev) => ({
      ...prev,
      name: packageName.trim(),
      category,
      weightKg,
      lengthCm: Math.max(5, Number(lengthCm) || 15),
      widthCm: Math.max(5, Number(widthCm) || 15),
      heightCm: Math.max(5, Number(heightCm) || 10),
      fragile,
      specialHandling,
      declaredValue: Number(declaredValue.replace(/[^0-9]/g, "")) || 0,
      photoUrls: photos,
      notes: packageNotes.trim(),
    }));

    // Navigate to Tahap 3: Review & Bayar
    navigate("c_send_fare");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate("c_send")} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Detail Penerima & Barang</Text>
          <Text style={styles.headerSub}>Tahap 2 dari 3 pengiriman</Text>
        </View>
      </View>

      {/* Progress Indicator: 1 Rute -> 2 Barang -> 3 Review */}
      <SendProgressIndicator currentStep={2} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Informasi Penerima */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <User size={16} color="#059669" />
            <Text style={styles.cardTitle}>Informasi Penerima</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Nama penerima *</Text>
            <TextInput
              style={[styles.inputField, errors.recipientName && styles.inputFieldError]}
              placeholder="Contoh: Siti Nurhaliza"
              placeholderTextColor="#94A3B8"
              value={recipientName}
              onChangeText={(txt) => {
                setRecipientName(txt);
                if (errors.recipientName) setErrors((prev) => ({ ...prev, recipientName: "" }));
              }}
            />
            {errors.recipientName ? <Text style={styles.inlineErrorText}>{errors.recipientName}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Nomor WhatsApp penerima *</Text>
            <TextInput
              style={[styles.inputField, errors.recipientPhone && styles.inputFieldError]}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={recipientPhone}
              onChangeText={(txt) => {
                setRecipientPhone(txt);
                if (errors.recipientPhone) setErrors((prev) => ({ ...prev, recipientPhone: "" }));
              }}
            />
            {errors.recipientPhone ? <Text style={styles.inlineErrorText}>{errors.recipientPhone}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Catatan untuk driver (Opsional)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Contoh: titip di satpam jika tidak ada orang"
              placeholderTextColor="#94A3B8"
              value={driverNotes}
              onChangeText={setDriverNotes}
            />
          </View>
        </View>

        {/* Section 2: Detail Barang */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Package size={16} color="#059669" />
            <Text style={styles.cardTitle}>Detail Barang yang Dikirim</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Nama barang *</Text>
            <TextInput
              style={[styles.inputField, errors.packageName && styles.inputFieldError]}
              placeholder="Contoh: Baju 3 pcs, Dokumen arsip"
              placeholderTextColor="#94A3B8"
              value={packageName}
              onChangeText={(txt) => {
                setPackageName(txt);
                if (errors.packageName) setErrors((prev) => ({ ...prev, packageName: "" }));
              }}
            />
            {errors.packageName ? <Text style={styles.inlineErrorText}>{errors.packageName}</Text> : null}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>Kategori barang</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => setCategory(cat.id)}
                >
                  <IconComp size={14} color={isSelected ? "#FFFFFF" : "#059669"} />
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Berat Paket Stepper */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Perkiraan berat paket</Text>
          <View style={styles.weightStepperBox}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setWeightKg((prev) => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
            >
              <Minus size={16} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.weightDisplay}>
              <Text style={styles.weightNum}>{weightKg}</Text>
              <Text style={styles.weightUnit}>Kg</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setWeightKg((prev) => Math.min(20, Number((prev + 0.5).toFixed(1))))}
            >
              <Plus size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.presetWeightRow}>
            {WEIGHT_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[styles.presetWeightBtn, weightKg === preset && styles.presetWeightBtnActive]}
                onPress={() => setWeightKg(preset)}
              >
                <Text style={[styles.presetWeightText, weightKg === preset && styles.presetWeightTextActive]}>
                  {preset} Kg
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 3: Keamanan & Pengamanan */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.cardTitle}>Keamanan & Perlindungan</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchTitle}>Barang mudah pecah (Fragile)</Text>
              <Text style={styles.switchSubtitle}>Perlindungan ekstra handling bubble wrap (+Rp2.500)</Text>
            </View>
            <Switch
              value={fragile}
              onValueChange={setFragile}
              trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
              thumbColor={fragile ? "#059669" : "#F8FAFC"}
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 12 }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchTitle}>Butuh perlakuan khusus</Text>
              <Text style={styles.switchSubtitle}>Penempatan khusus di tas/bagasi motor driver</Text>
            </View>
            <Switch
              value={specialHandling}
              onValueChange={setSpecialHandling}
              trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
              thumbColor={specialHandling ? "#059669" : "#F8FAFC"}
            />
          </View>

          <View style={[styles.fieldGroup, { marginTop: 14 }]}>
            <Text style={styles.inputLabel}>Estimasi nilai barang (Opsional Asuransi)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Contoh: 500000 (premi 0.2%)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={declaredValue}
              onChangeText={setDeclaredValue}
            />
          </View>

          {/* Foto Paket (Max 3) */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Foto paket (Maksimal 3 foto)</Text>
          <View style={styles.photosGrid}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoThumbWrapper}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => handleRemovePhoto(idx)}>
                  <X size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < 3 && (
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <>
                    <Camera size={20} color="#059669" />
                    <Text style={styles.addPhotoText}>Tambah</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section Collapsible: Ukuran Dimensi (Opsional) */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setShowDimensionSection(!showDimensionSection)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.accordionTitle}>Ukuran Dimensi Paket (Opsional)</Text>
              <Text style={styles.accordionSub}>Default 15x15x10 cm (Ukuran standar)</Text>
            </View>
            {showDimensionSection ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
          </TouchableOpacity>

          {showDimensionSection && (
            <View style={styles.dimensionInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dimLabel}>P (cm)</Text>
                <TextInput
                  style={styles.dimInput}
                  keyboardType="numeric"
                  value={lengthCm}
                  onChangeText={setLengthCm}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dimLabel}>L (cm)</Text>
                <TextInput
                  style={styles.dimInput}
                  keyboardType="numeric"
                  value={widthCm}
                  onChangeText={setWidthCm}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dimLabel}>T (cm)</Text>
                <TextInput
                  style={styles.dimInput}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Primary Sticky CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryCta} onPress={handleProceed} activeOpacity={0.88}>
          <Text style={styles.primaryCtaText}>Lanjut ke Review Pengiriman</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  inputFieldError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inlineErrorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
    fontWeight: "600",
  },

  // Category Selector
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: "#059669",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  categoryPillTextSelected: {
    color: "#FFFFFF",
  },

  // Weight Stepper
  weightStepperBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginVertical: 10,
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderRadius: 14,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  weightNum: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  presetWeightRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  presetWeightBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  presetWeightBtnActive: {
    backgroundColor: "#059669",
  },
  presetWeightText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  presetWeightTextActive: {
    color: "#FFFFFF",
  },

  // Switches
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  switchSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  // Photos
  photosGrid: {
    flexDirection: "row",
    gap: 10,
  },
  photoThumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoDeleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    borderStyle: "dashed",
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  // Dimension Accordion
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  accordionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  dimensionInputsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dimLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  dimInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    textAlign: "center",
  },

  // Bottom CTA
  bottomBar: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  primaryCta: {
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
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
