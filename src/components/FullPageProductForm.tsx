import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  Star,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { rp } from "../utils/formatters";
import { uploadFileToBackend } from "../services/api";

export interface ProductFormData {
  id?: string | number;
  name: string;
  description: string;
  cat: string;
  price: number;
  stock: number;
  isActive: boolean;
  img: string;
  images: string[];
}

interface FullPageProductFormProps {
  title: string;
  subtitle?: string;
  isEdit?: boolean;
  initialData?: Partial<ProductFormData>;
  categories: string[];
  priceLabel?: string;
  pricePlaceholder?: string;
  stockLabel?: string;
  stockPlaceholder?: string;
  themeColor?: string;
  onCancel: () => void;
  onSave: (data: ProductFormData) => Promise<void> | void;
  onDelete?: () => void;
}

export const FullPageProductForm: React.FC<FullPageProductFormProps> = ({
  title,
  subtitle,
  isEdit = false,
  initialData,
  categories,
  priceLabel = "Harga (Rp)",
  pricePlaceholder = "Contoh: 25000",
  stockLabel = "Jumlah Stok",
  stockPlaceholder = "Contoh: 20",
  themeColor = "#1B7A4E",
  onCancel,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [cat, setCat] = useState(initialData?.cat || categories[0] || "Umum");
  const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : "");
  const [stock, setStock] = useState(initialData?.stock !== undefined ? initialData.stock.toString() : "10");
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);

  // Multi-image state
  const [images, setImages] = useState<string[]>(() => {
    if (Array.isArray(initialData?.images) && initialData.images.length > 0) {
      return initialData.images;
    }
    if (initialData?.img && initialData.img.trim() !== "") {
      return [initialData.img];
    }
    return [];
  });

  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const showAlert = (alertTitle: string, message: string) => {
    if (Platform.OS === "web") {
      alert(`${alertTitle}: ${message}`);
    } else {
      Alert.alert(alertTitle, message);
    }
  };

  // Add multiple images from gallery
  const handlePickFromGallery = async () => {
    if (images.length >= 6) {
      showAlert("Batas Maksimal", "Maksimal 6 foto per produk.");
      return;
    }

    try {
      if (Platform.OS === "web") {
        const docRes = await DocumentPicker.getDocumentAsync({
          type: ["image/*"],
          multiple: true,
        });

        if (!docRes.canceled && docRes.assets && docRes.assets.length > 0) {
          setIsUploading(true);
          setUploadStatus("Mengunggah foto...");
          const slotsLeft = 6 - images.length;
          const selected = docRes.assets.slice(0, slotsLeft);

          for (const asset of selected) {
            try {
              const res = await uploadFileToBackend(
                asset.uri,
                asset.name || `foto_${Date.now()}.jpg`,
                asset.mimeType || "image/jpeg"
              );
              if (res?.success && res?.data?.url) {
                setImages((prev) => (prev.length < 6 ? [...prev, res.data.url] : prev));
              } else if (asset.uri) {
                setImages((prev) => (prev.length < 6 ? [...prev, asset.uri] : prev));
              }
            } catch {
              if (asset.uri) {
                setImages((prev) => (prev.length < 6 ? [...prev, asset.uri] : prev));
              }
            }
          }
          setIsUploading(false);
          setUploadStatus("");
        }
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Izin akses galeri diperlukan untuk memilih foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6 - images.length,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        setUploadStatus("Memproses foto...");
        const slotsLeft = 6 - images.length;
        const selectedAssets = result.assets.slice(0, slotsLeft);

        for (const asset of selectedAssets) {
          try {
            const res = await uploadFileToBackend(
              asset.uri,
              asset.fileName || `product_${Date.now()}.jpg`,
              asset.mimeType || "image/jpeg"
            );
            if (res?.success && res?.data?.url) {
              setImages((prev) => (prev.length < 6 ? [...prev, res.data.url] : prev));
            } else if (asset.uri) {
              setImages((prev) => (prev.length < 6 ? [...prev, asset.uri] : prev));
            }
          } catch {
            if (asset.uri) {
              setImages((prev) => (prev.length < 6 ? [...prev, asset.uri] : prev));
            }
          }
        }
        setIsUploading(false);
        setUploadStatus("");
      }
    } catch (err) {
      console.log("Error pick gallery:", err);
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  // Add single image from camera
  const handleTakePhoto = async () => {
    if (images.length >= 6) {
      showAlert("Batas Maksimal", "Maksimal 6 foto per produk.");
      return;
    }

    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Ditolak", "Izin kamera diperlukan untuk mengambil foto.");
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);
        setUploadStatus("Mengunggah foto kamera...");
        try {
          const res = await uploadFileToBackend(
            asset.uri,
            asset.fileName || `camera_${Date.now()}.jpg`,
            asset.mimeType || "image/jpeg"
          );
          if (res?.success && res?.data?.url) {
            setImages((prev) => (prev.length < 6 ? [...prev, res.data.url] : prev));
          } else if (asset.uri) {
            setImages((prev) => (prev.length < 6 ? [...prev, asset.uri] : prev));
          }
        } catch {
          if (asset.uri) {
            setImages((prev) => (prev.length < 6 ? [...prev, asset.uri] : prev));
          }
        }
        setIsUploading(false);
        setUploadStatus("");
      }
    } catch (err) {
      console.log("Error camera photo:", err);
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  // Add image via URL
  const handleAddUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image")) {
      showAlert("URL Tidak Valid", "Pastikan URL gambar dimulai dengan https:// atau http://");
      return;
    }
    if (images.length >= 6) {
      showAlert("Batas Maksimal", "Maksimal 6 foto per produk.");
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setUrlInput("");
  };

  // Set specific image as cover (primary / index 0)
  const handleSetPrimaryImage = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const selected = copy.splice(indexToPrimary, 1)[0];
      return [selected, ...copy];
    });
  };

  // Remove specific image
  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Save product
  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("Form Belum Lengkap", "Silakan masukkan nama produk/menu.");
      return;
    }

    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      showAlert("Harga Tidak Valid", "Harga harus berupa angka lebih dari 0.");
      return;
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      showAlert("Stok Tidak Valid", "Jumlah stok tidak boleh bernilai negatif.");
      return;
    }

    setIsSaving(true);
    try {
      const primaryImg = images.length > 0 ? images[0] : "";
      await onSave({
        id: initialData?.id,
        name: name.trim(),
        description: description.trim(),
        cat,
        price: priceNum,
        stock: stockNum,
        isActive,
        img: primaryImg,
        images,
      });
    } catch (err: any) {
      showAlert("Gagal Menyimpan", err?.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const priceNum = parseInt(price, 10);
  const formattedPricePreview = !isNaN(priceNum) && priceNum > 0 ? rp(priceNum) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleCenter}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.quickSaveBtn, { backgroundColor: themeColor }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.quickSaveBtnText}>Simpan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Multi-Photo Uploader */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.sectionTitle}>Foto Menu / Produk</Text>
                <View style={[styles.counterBadge, { backgroundColor: images.length > 0 ? "#E8F5EE" : "#F3F4F6" }]}>
                  <Text style={[styles.counterBadgeText, { color: images.length > 0 ? themeColor : "#6B7280" }]}>
                    {images.length}/6 Foto
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionDesc}>
                Bisa menambahkan lebih dari 1 gambar. Foto pertama otomatis menjadi foto sampul utama (Cover).
              </Text>
            </View>
          </View>

          {/* Photos Grid / List */}
          {images.length > 0 && (
            <View style={styles.imagesGrid}>
              {images.map((imgUri, index) => {
                const isPrimary = index === 0;
                return (
                  <View key={`${imgUri}-${index}`} style={[styles.imageCard, isPrimary && styles.primaryImageCard]}>
                    <Image source={{ uri: imgUri }} style={styles.imageThumbnail} resizeMode="cover" />

                    {/* Primary Badge */}
                    {isPrimary ? (
                      <View style={[styles.primaryBadge, { backgroundColor: themeColor }]}>
                        <Star size={11} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.primaryBadgeText}>Foto Utama</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.setPrimaryBtn}
                        onPress={() => handleSetPrimaryImage(index)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.setPrimaryBtnText}>Jadikan Utama</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={styles.deletePhotoBtn}
                      onPress={() => handleRemoveImage(index)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <View style={styles.uploadingBox}>
              <ActivityIndicator size="small" color={themeColor} />
              <Text style={[styles.uploadingText, { color: themeColor }]}>
                {uploadStatus || "Memproses foto..."}
              </Text>
            </View>
          )}

          {/* Upload Action Buttons */}
          <View style={styles.uploadActionsContainer}>
            <View style={styles.uploadButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtnSolid, { backgroundColor: themeColor }]}
                onPress={handlePickFromGallery}
                disabled={isUploading || images.length >= 6}
                activeOpacity={0.8}
              >
                <ImageIcon size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnSolidText}>Buka Galeri Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnOutline, { borderColor: themeColor }]}
                onPress={handleTakePhoto}
                disabled={isUploading || images.length >= 6}
                activeOpacity={0.8}
              >
                <Camera size={18} color={themeColor} />
                <Text style={[styles.actionBtnOutlineText, { color: themeColor }]}>Kamera HP</Text>
              </TouchableOpacity>
            </View>

            {/* URL Input */}
            <View style={styles.urlInputRow}>
              <TextInput
                style={styles.urlInput}
                placeholder="Atau masukkan URL link foto (https://...)"
                placeholderTextColor="#9CA3AF"
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[
                  styles.addUrlBtn,
                  { backgroundColor: urlInput.trim() ? themeColor : "#E5E7EB" },
                ]}
                onPress={handleAddUrlImage}
                disabled={!urlInput.trim() || images.length >= 6}
                activeOpacity={0.8}
              >
                <Plus size={16} color={urlInput.trim() ? "#FFFFFF" : "#9CA3AF"} />
                <Text
                  style={[
                    styles.addUrlBtnText,
                    { color: urlInput.trim() ? "#FFFFFF" : "#9CA3AF" },
                  ]}
                >
                  Tambah
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 2: Product Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informasi Produk</Text>

          {/* Nama Produk */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Nama Produk / Menu</Text>
              <Text style={styles.requiredMark}>*</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Contoh: Paket Nasi Ayam Bakar Komplit"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Kategori */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Kategori</Text>
              <Text style={styles.requiredMark}>*</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPillsRow}>
              {categories.map((category) => {
                const isSelected = cat === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryPill,
                      isSelected && {
                        backgroundColor: themeColor,
                        borderColor: themeColor,
                      },
                    ]}
                    onPress={() => setCat(category)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Deskripsi */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Deskripsi Lengkap</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Jelaskan porsi, lauk pauk, rasa, keunggulan, atau catatan penyajian..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Section 3: Pricing & Stock */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Harga & Stok</Text>

          <View style={styles.twoColRow}>
            {/* Harga */}
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{priceLabel}</Text>
                <Text style={styles.requiredMark}>*</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder={pricePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              {formattedPricePreview && (
                <Text style={[styles.pricePreviewText, { color: themeColor }]}>
                  {formattedPricePreview}
                </Text>
              )}
            </View>

            {/* Stok */}
            <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{stockLabel}</Text>
                <Text style={styles.requiredMark}>*</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder={stockPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
              />
              <Text style={styles.fieldHint}>Tersedia untuk dipesan</Text>
            </View>
          </View>

          {/* Availability Switch */}
          <View style={styles.switchCard}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Menu Tersedia / Aktif</Text>
              <Text style={styles.switchDesc}>
                {isActive
                  ? "Menu aktif dan langsung tampil di halaman customer."
                  : "Menu dinonaktifkan sementara. Customer tidak dapat melihat atau memesan."}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#D1D5DB", true: "#C7E8D8" }}
              thumbColor={isActive ? themeColor : "#9CA3AF"}
            />
          </View>
        </View>

        {/* Delete button (If Edit Mode) */}
        {isEdit && onDelete && (
          <TouchableOpacity
            style={styles.deleteMenuCard}
            onPress={() => {
              if (Platform.OS === "web") {
                const confirmed = window.confirm("Hapus Menu ini secara permanen dari daftar?");
                if (confirmed) onDelete();
              } else {
                Alert.alert(
                  "Hapus Menu?",
                  "Menu ini akan dihapus permanen dari sistem.",
                  [
                    { text: "Batal", style: "cancel" },
                    { text: "Hapus Permanen", style: "destructive", onPress: onDelete },
                  ]
                );
              }
            }}
            activeOpacity={0.8}
          >
            <Trash2 size={18} color="#DC2626" />
            <Text style={styles.deleteMenuCardText}>Hapus Menu Ini</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Batal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: themeColor }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.submitButtonText}>
                {isEdit ? "Simpan Perubahan" : "Simpan Menu Baru"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBar: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 10,
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitleText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  quickSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    gap: 5,
  },
  quickSaveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sectionDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  imageCard: {
    width: "48%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  primaryImageCard: {
    borderWidth: 2,
    borderColor: "#1B7A4E",
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
  },
  primaryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  primaryBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  setPrimaryBtn: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  deletePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  uploadActionsContainer: {
    gap: 10,
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnSolid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnSolidText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: "700",
  },
  urlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  urlInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    color: "#1E293B",
  },
  addUrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  addUrlBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  formGroup: {
    marginTop: 14,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  requiredMark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
    marginLeft: 3,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 88,
    paddingTop: 10,
  },
  categoryPillsRow: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  twoColRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pricePreviewText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  switchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  switchDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  deleteMenuCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  deleteMenuCardText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  submitButton: {
    flex: 2,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
