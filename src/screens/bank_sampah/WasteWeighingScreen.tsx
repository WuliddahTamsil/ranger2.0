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
  Image,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Scale,
  Camera,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronRight,
  User,
  Building2,
  Tag,
  Coins,
  Trash2,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  X,
  ExternalLink,
  Clock,
} from "lucide-react-native";
import { Nav } from "../../types";
import { useRecycle } from "../../context/RecycleContext";
import { weighWasteDeposit, getWasteBankPrices } from "../../services/recycleService";
import { WasteCategoryPriceUI, WasteDepositUI } from "../../types/recycleTypes";
import { uploadFileToBackend } from "../../services/api";
import { rp } from "../../utils/formatters";

export const WasteWeighingScreen: React.FC<Nav> = ({ navigate }) => {
  const { selectedDeposit, setSelectedDeposit } = useRecycle();
  const [actualWeights, setActualWeights] = useState<Record<string, number>>({});
  const [availablePrices, setAvailablePrices] = useState<WasteCategoryPriceUI[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [notes, setNotes] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState(
    "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500"
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successWeighedDeposit, setSuccessWeighedDeposit] = useState<WasteDepositUI | null>(null);

  const getItemKey = (cat: WasteCategoryPriceUI) => {
    return cat._id || `${cat.category}:::${cat.subCategory || "Standard"}`;
  };

  useEffect(() => {
    if (!selectedDeposit?._id) return;

    let active = true;
    setLoadingPrices(true);

    getWasteBankPrices(selectedDeposit.bankSampahId)
      .then((res) => {
        if (!active) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // De-duplicate by category + subCategory
          const seen = new Set<string>();
          const uniquePrices = res.data.filter((item) => {
            const sig = `${(item.category || "").trim().toLowerCase()}:::${(item.subCategory || "").trim().toLowerCase()}`;
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
          });
          setAvailablePrices(uniquePrices);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoadingPrices(false);
      });

    // Populate existing weights if previously weighed
    const initial: Record<string, number> = {};
    if (Array.isArray(selectedDeposit.categories)) {
      selectedDeposit.categories.forEach((c) => {
        if (c.actualWeightKg && c.actualWeightKg > 0) {
          const key = c._id || `${c.category}:::${c.subCategory || "Standard"}`;
          initial[key] = c.actualWeightKg;
          initial[c.category] = c.actualWeightKg;
        }
      });
    }
    setActualWeights(initial);

    if (selectedDeposit.weighingNotes) {
      setNotes(selectedDeposit.weighingNotes);
    }

    if (Array.isArray(selectedDeposit.weighingProofPhotos) && selectedDeposit.weighingProofPhotos.length > 0) {
      setProofPhotoUrl(selectedDeposit.weighingProofPhotos[0]);
    }

    return () => {
      active = false;
    };
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

  const handleUpdateWeight = (key: string, text: string) => {
    const clean = text.replace(",", ".");
    const val = parseFloat(clean);
    setActualWeights((prev) => ({
      ...prev,
      [key]: isNaN(val) ? 0 : val,
    }));
  };

  // Image Upload Handlers
  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        setProofPhotoUrl(asset.uri);
        setUploadingPhoto(true);
        try {
          const uploaded = await uploadFileToBackend(
            asset.uri,
            asset.fileName || `weighing-proof-${Date.now()}.jpg`,
            asset.mimeType || "image/jpeg"
          );
          if (uploaded?.success && uploaded?.data?.url) {
            setProofPhotoUrl(uploaded.data.url);
          }
        } catch (uploadErr) {
          console.warn("Upload file to backend error, fallback to local uri:", uploadErr);
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Galeri", err?.message || "Gagal membuka galeri foto.");
    }
  };

  const handleTakeFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Kamera", "Izin akses kamera diperlukan untuk mengambil foto bukti timbangan.");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        setProofPhotoUrl(asset.uri);
        setUploadingPhoto(true);
        try {
          const uploaded = await uploadFileToBackend(
            asset.uri,
            asset.fileName || `weighing-camera-${Date.now()}.jpg`,
            asset.mimeType || "image/jpeg"
          );
          if (uploaded?.success && uploaded?.data?.url) {
            setProofPhotoUrl(uploaded.data.url);
          }
        } catch (uploadErr) {
          console.warn("Upload file to backend error, fallback to local uri:", uploadErr);
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Kamera", err?.message || "Gagal mengambil foto dari kamera.");
    }
  };

  // Live calculations
  let totalActualKg = 0;
  let totalActualRupiah = 0;

  availablePrices.forEach((cat) => {
    const key = getItemKey(cat);
    const w = actualWeights[key] || actualWeights[cat.category] || 0;
    if (w > 0) {
      totalActualKg += w;
      totalActualRupiah += Math.round(w * cat.pricePerKg);
    }
  });

  const totalActualPoints = totalActualRupiah; // 1 Point = Rp 1

  const handleSubmitWeighing = async () => {
    if (totalActualKg <= 0) {
      Alert.alert("Input Berat", "Masukkan berat aktual penimbangan (kg) pada setidaknya 1 kategori sampah.");
      return;
    }

    setSubmitting(true);
    try {
      const activeWeighedCats = availablePrices
        .filter((cat) => (actualWeights[getItemKey(cat)] || actualWeights[cat.category] || 0) > 0)
        .map((cat) => ({
          category: cat.category,
          subCategory: cat.subCategory || "Standard",
          pricePerKg: cat.pricePerKg,
          actualWeightKg: actualWeights[getItemKey(cat)] || actualWeights[cat.category] || 0,
        }));

      const payload = {
        categories: activeWeighedCats,
        weighingProofPhotos: proofPhotoUrl ? [proofPhotoUrl] : [],
        weighingNotes: notes || "Ditimbang resmi oleh petugas Bank Sampah.",
      };

      const res = await weighWasteDeposit(deposit._id, payload);
      if (res.success && res.data) {
        setSelectedDeposit(res.data);
        setSuccessWeighedDeposit(res.data);
      } else {
        Alert.alert("Gagal", res.message || "Gagal menyimpan hasil timbangan.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kesalahan pada server.");
    } finally {
      setSubmitting(false);
    }
  };

  const isWeighed = deposit.status === "WAITING_CUSTOMER_CONFIRMATION";
  const isCompleted = deposit.status === "COMPLETED" || deposit.status === "POINT_ISSUED";
  const isFinished = isWeighed || isCompleted;

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("bank_sampah_dashboard")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Penimbangan Sampah</Text>
          <Text style={styles.headerSub}>Tiket: {deposit.depositCode}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Finished / Waiting Banner */}
        {isCompleted ? (
          <View style={styles.statusBannerCompleted}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.statusBannerTextCompleted}>
              Setoran Selesai • Poin telah resmi diterbitkan ke dompet nasabah
            </Text>
          </View>
        ) : isWeighed ? (
          <View style={styles.statusBannerWaiting}>
            <Clock size={16} color="#D97706" />
            <Text style={styles.statusBannerTextWaiting}>
              Penimbangan Selesai • Menunggu persetujuan / konfirmasi dari nasabah
            </Text>
          </View>
        ) : null}

        {/* Customer & Ticket Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User size={15} color="#15803D" />
            <Text style={styles.infoCustomer}>
              Nasabah: {typeof deposit.customerId === "object" ? deposit.customerId?.name || "Nasabah GEOVERSE" : "Nasabah GEOVERSE"}
            </Text>
          </View>
          <Text style={styles.infoMethod}>
            Metode Setor: {deposit.method === "PICKUP" ? "Dijemput Driver (Pickup)" : "Diantar Langsung ke Bank Sampah"}
          </Text>
          {deposit.pickupNotes ? (
            <Text style={styles.infoNotes}>Catatan: "{deposit.pickupNotes}"</Text>
          ) : null}
        </View>

        {/* Category Scale Input Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {isFinished ? "Rincian Berat Sampah Tertimbang (kg)" : "Input Berat Timbangan Aktual (kg)"}
          </Text>
          <Text style={styles.sectionSub}>
            {isFinished ? "Data terkunci resmi" : "Sistem auto-generate Poin"}
          </Text>
        </View>

        {loadingPrices ? (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#15803D" />
            <Text style={{ marginTop: 8, fontSize: 12, color: "#64748B" }}>
              Memuat katalog harga kategori...
            </Text>
          </View>
        ) : (
          availablePrices.map((cat, idx) => {
            const itemKey = getItemKey(cat);
            const currentWeight = actualWeights[itemKey] !== undefined ? actualWeights[itemKey] : (actualWeights[cat.category] || 0);
            const subtotalRp = Math.round(currentWeight * cat.pricePerKg);
            const isFilled = currentWeight > 0;

            return (
              <View
                key={`cat-${itemKey}-${idx}`}
                style={[styles.catCard, isFilled && styles.catCardFilled]}
              >
                <View style={styles.catHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.catBadgeRow}>
                      <View style={styles.catGroupPill}>
                        <Tag size={9.5} color="#15803D" />
                        <Text style={styles.catGroupPillText}>{cat.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.catItemName}>
                      {cat.subCategory || cat.category}
                    </Text>
                  </View>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillText}>{rp(cat.pricePerKg)}/kg</Text>
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputTitle}>Berat Skala Timbangan:</Text>
                    <View style={[styles.inputBox, isFilled && styles.inputBoxFilled, isFinished && styles.inputBoxDisabled]}>
                      <TextInput
                        style={[styles.weightTextInput, isFinished && styles.weightTextInputDisabled]}
                        keyboardType="numeric"
                        placeholder="0.0"
                        placeholderTextColor="#94A3B8"
                        value={currentWeight > 0 ? String(currentWeight) : ""}
                        onChangeText={(t) => handleUpdateWeight(itemKey, t)}
                        editable={!isFinished}
                      />
                      <Text style={styles.unitText}>kg</Text>
                    </View>
                  </View>

                  <View style={styles.subtotalCol}>
                    <Text style={styles.subtotalLabel}>Koin Diterbitkan:</Text>
                    <Text style={[styles.subtotalPoint, isFilled && { color: "#15803D" }]}>
                      +{subtotalRp.toLocaleString("id-ID")} Pts
                    </Text>
                    <Text style={styles.subtotalVal}>({rp(subtotalRp)})</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Proof Photo Upload Section */}
        <View style={styles.proofCard}>
          <View style={styles.proofHeader}>
            <Camera size={16} color="#15803D" />
            <Text style={styles.proofTitle}>Foto Bukti Timbangan & Sampah</Text>
          </View>
          <Text style={styles.proofSubtitle}>
            {isFinished
              ? "Foto bukti timbangan resmi yang telah tersimpan."
              : "Foto timbangan riil akan dikirim dan dapat dilihat langsung oleh nasabah."}
          </Text>

          {proofPhotoUrl ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: proofPhotoUrl }} style={styles.photoPreviewImage} />
              
              {uploadingPhoto && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadingText}>Mengunggah ke server...</Text>
                </View>
              )}

              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.btnPhotoView}
                  onPress={() => setPreviewModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Eye size={13} color="#1E293B" />
                  <Text style={styles.btnPhotoViewText}>Lihat Penuh</Text>
                </TouchableOpacity>

                {!isFinished && (
                  <>
                    <TouchableOpacity
                      style={styles.btnPhotoChange}
                      onPress={handleTakeFromCamera}
                      activeOpacity={0.8}
                    >
                      <Camera size={13} color="#15803D" />
                      <Text style={styles.btnPhotoChangeText}>Kamera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnPhotoChange}
                      onPress={handlePickFromGallery}
                      activeOpacity={0.8}
                    >
                      <ImageIcon size={13} color="#15803D" />
                      <Text style={styles.btnPhotoChangeText}>Galeri</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnPhotoDelete}
                      onPress={() => setProofPhotoUrl("")}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ) : !isFinished ? (
            <View style={styles.dropzoneCard}>
              <View style={styles.dropzoneIcon}>
                <UploadCloud size={24} color="#15803D" />
              </View>
              <Text style={styles.dropzoneTitle}>Unggah Foto Bukti Timbangan</Text>
              <Text style={styles.dropzoneSub}>Ambil foto langsung timbangan atau pilih dari galeri</Text>

              <View style={styles.dropzoneBtnRow}>
                <TouchableOpacity
                  style={styles.btnPickCamera}
                  onPress={handleTakeFromCamera}
                  activeOpacity={0.85}
                >
                  <Camera size={15} color="#FFFFFF" />
                  <Text style={styles.btnPickCameraText}>Buka Kamera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnPickGallery}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.85}
                >
                  <ImageIcon size={15} color="#15803D" />
                  <Text style={styles.btnPickGalleryText}>Pilih Galeri</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Toggle manual URL input (only if not finished) */}
          {!isFinished && (
            <>
              <TouchableOpacity
                style={styles.btnToggleUrl}
                onPress={() => setShowUrlInput(!showUrlInput)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnToggleUrlText}>
                  {showUrlInput ? "- Sembunyikan Input Link URL" : "+ Input Link Gambar URL Manual"}
                </Text>
              </TouchableOpacity>

              {showUrlInput && (
                <TextInput
                  style={styles.urlInput}
                  value={proofPhotoUrl}
                  onChangeText={setProofPhotoUrl}
                  placeholder="https://link-foto-timbangan.jpg"
                  placeholderTextColor="#94A3B8"
                />
              )}
            </>
          )}
        </View>

        {/* Officer Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Catatan Petugas (Opsional)</Text>
          <TextInput
            style={[styles.notesInput, isFinished && styles.notesInputDisabled]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tuliskan catatan kondisi sampah / timbangan..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
            editable={!isFinished}
          />
        </View>

        {/* Total Summary */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Berat Aktual:</Text>
            <Text style={styles.totalVal}>{totalActualKg.toFixed(1)} kg</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Nilai Rupiah:</Text>
            <Text style={styles.totalVal}>{rp(totalActualRupiah)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={18} color="#FBBF24" />
              <Text style={styles.pointRewardLabel}>Poin GEOVERSE Siap Diterbitkan:</Text>
            </View>
            <Text style={styles.pointRewardVal}>+{totalActualPoints.toLocaleString("id-ID")} Pts</Text>
          </View>
          <Text style={styles.note}>
            *Koin poin akan otomatis terbit dan masuk ke akun nasabah setelah dikonfirmasi.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Action */}
      <View style={styles.bottomBar}>
        {isFinished ? (
          <TouchableOpacity
            style={styles.btnSubmitFinished}
            disabled={true}
            activeOpacity={1}
          >
            <CheckCircle2 size={18} color="#15803D" />
            <Text style={styles.btnSubmitFinishedText}>Selesai</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnSubmit, (submitting || totalActualKg <= 0) && { opacity: 0.7 }]}
            onPress={handleSubmitWeighing}
            disabled={submitting || totalActualKg <= 0}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.btnSubmitText}>
                  Simpan & Terbitkan Hasil Timbang
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Lightbox / Full-screen Photo Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setPreviewModalVisible(false)}
            activeOpacity={0.8}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.lightboxImageWrapper}>
            {proofPhotoUrl ? (
              <Image
                source={{ uri: proofPhotoUrl }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <Text style={styles.lightboxCaption}>Bukti Timbangan Resmi Bank Sampah</Text>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={Boolean(successWeighedDeposit)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessWeighedDeposit(null);
          navigate("bank_sampah_dashboard");
        }}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#15803D" />
            </View>
            <Text style={styles.successModalTitle}>Hasil Timbang Berhasil Disimpan!</Text>
            <Text style={styles.successModalSubtitle}>
              Total berat dan konversi poin otomatis telah dikirim ke nasabah.
            </Text>

            <View style={styles.successSummaryBox}>
              <View style={styles.successSummaryRow}>
                <Text style={styles.successSummaryLabel}>Total Berat:</Text>
                <Text style={styles.successSummaryVal}>{totalActualKg.toFixed(1)} kg</Text>
              </View>
              <View style={styles.successSummaryRow}>
                <Text style={styles.successSummaryLabel}>Total Nilai Rupiah:</Text>
                <Text style={styles.successSummaryVal}>{rp(totalActualRupiah)}</Text>
              </View>
              <View style={styles.successSummaryRow}>
                <Text style={styles.successSummaryLabel}>Poin Terbit:</Text>
                <Text style={styles.successSummaryValHighlight}>+{totalActualPoints.toLocaleString("id-ID")} Pts</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnBackDashboard}
              onPress={() => {
                setSuccessWeighedDeposit(null);
                navigate("bank_sampah_dashboard");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnBackDashboardText}>Kembali ke Antrean Dashboard</Text>
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
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoCustomer: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  infoMethod: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 4,
  },
  infoNotes: {
    fontSize: 11,
    color: "#15803D",
    fontStyle: "italic",
    marginTop: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSub: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
  },
  catCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  catCardFilled: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  catBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  catGroupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#BBF7D0",
  },
  catGroupPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803D",
  },
  catItemName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  catName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  catSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  pricePill: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputCol: {
    flex: 1.2,
  },
  inputTitle: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
  },
  inputBoxFilled: {
    backgroundColor: "#FFFFFF",
    borderColor: "#15803D",
  },
  weightTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    paddingVertical: 6,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  subtotalCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  subtotalLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  subtotalPoint: {
    fontSize: 13,
    fontWeight: "900",
    color: "#475569",
    marginTop: 1,
  },
  subtotalVal: {
    fontSize: 10.5,
    color: "#64748B",
  },
  proofCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  proofTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  proofSubtitle: {
    fontSize: 10.5,
    color: "#64748B",
    marginBottom: 10,
  },
  photoPreviewContainer: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    backgroundColor: "#F8FAFC",
  },
  photoPreviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#0F172A",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  uploadingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  photoActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: "#F0FDF4",
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
  },
  btnPhotoView: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnPhotoViewText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  btnPhotoChange: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnPhotoChangeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#15803D",
  },
  btnPhotoDelete: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 6,
  },
  dropzoneCard: {
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  dropzoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dropzoneTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#15803D",
    marginBottom: 2,
  },
  dropzoneSub: {
    fontSize: 10.5,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 12,
  },
  dropzoneBtnRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  btnPickCamera: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnPickCameraText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnPickGallery: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnPickGalleryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  btnToggleUrl: {
    paddingVertical: 6,
    alignItems: "center",
  },
  btnToggleUrlText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  urlInput: {
    fontSize: 12,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImageWrapper: {
    width: "100%",
    height: "75%",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  lightboxCaption: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
  },
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  notesInput: {
    fontSize: 12,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlignVertical: "top",
    minHeight: 45,
  },
  totalCard: {
    backgroundColor: "#166534",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: "#BBF7D0",
    fontWeight: "600",
  },
  totalVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  totalDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 8,
  },
  pointRewardLabel: {
    fontSize: 12.5,
    color: "#FDE047",
    fontWeight: "800",
  },
  pointRewardVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  note: {
    fontSize: 10,
    color: "#86EFAC",
    marginTop: 8,
    fontStyle: "italic",
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
  statusBannerCompleted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  statusBannerTextCompleted: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#15803D",
    flex: 1,
  },
  statusBannerWaiting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  statusBannerTextWaiting: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#B45309",
    flex: 1,
  },
  inputBoxDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  weightTextInputDisabled: {
    color: "#64748B",
  },
  notesInputDisabled: {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
  },
  btnSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  btnSubmitFinished: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnSubmitFinishedText: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  btnBack: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnBackText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  // Success Modal
  successModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  successModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  successModalSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  successSummaryBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginVertical: 14,
    gap: 6,
  },
  successSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  successSummaryLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  successSummaryVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  successSummaryValHighlight: {
    fontSize: 13,
    fontWeight: "900",
    color: "#15803D",
  },
  btnBackDashboard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 12,
    width: "100%",
  },
  btnBackDashboardText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
