/**
 * AdminHomeHeroSection.tsx
 * Management section for Homepage Hero Banners in Admin Dashboard
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from "react-native";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Video,
  ImageIcon,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  X,
  Check,
  Clock,
  Play,
  Film,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  HomeHeroBannerItem,
  CreateHeroPayload,
  fetchAdminHomeHeroes,
  createHomeHero,
  updateHomeHero,
  updateHomeHeroStatus,
  deleteHomeHero,
  uploadHomeHeroMedia,
} from "../services/homeHeroService";
import { HomeHeroBannerView } from "./HomeHeroBannerView";

interface AdminHomeHeroSectionProps {
  onPreviewCustomer?: () => void;
}

export const AdminHomeHeroSection: React.FC<AdminHomeHeroSectionProps> = ({
  onPreviewCustomer,
}) => {
  const [banners, setBanners] = useState<HomeHeroBannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State for Add / Edit Form
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formBadgeText, setFormBadgeText] = useState("");
  const [formMediaType, setFormMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formThumbnailUrl, setFormThumbnailUrl] = useState("");
  const [formCtaLabel, setFormCtaLabel] = useState("");
  const [formCtaAction, setFormCtaAction] = useState<"NONE" | "NAVIGATE" | "OPEN_URL">("NONE");
  const [formCtaTarget, setFormCtaTarget] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formStartAt, setFormStartAt] = useState("");
  const [formEndAt, setFormEndAt] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSingleActive, setFormSingleActive] = useState(true);

  // Readability & Overlay Customization
  const [formOverlayEnabled, setFormOverlayEnabled] = useState(false);
  const [formOverlayColor, setFormOverlayColor] = useState("transparent");
  const [formOverlayOpacity, setFormOverlayOpacity] = useState("0");
  const [formTextColor, setFormTextColor] = useState("#FFFFFF");
  const [formContentAlignment, setFormContentAlignment] = useState<"LEFT" | "CENTER" | "RIGHT">("LEFT");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminHomeHeroes({
        isActive: activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
        search: search.trim() || undefined,
      });
      setBanners(data);
    } catch (err: any) {
      console.warn("Failed to load admin hero banners:", err);
      Alert.alert("Gagal", err.message || "Gagal memuat data hero banner.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [activeFilter]);

  const openCreateModal = () => {
    setEditingBannerId(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormBadgeText("");
    setFormMediaType("IMAGE");
    setFormMediaUrl("");
    setFormThumbnailUrl("");
    setFormCtaLabel("");
    setFormCtaAction("NONE");
    setFormCtaTarget("");
    setFormSortOrder("0");
    setFormStartAt("");
    setFormEndAt("");
    setFormIsActive(true);
    setFormSingleActive(false);
    setFormOverlayEnabled(false);
    setFormOverlayColor("transparent");
    setFormOverlayOpacity("0");
    setFormTextColor("#FFFFFF");
    setFormContentAlignment("LEFT");
    setUploadError("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: HomeHeroBannerItem) => {
    setEditingBannerId(item._id);
    setFormTitle(item.title || "");
    setFormSubtitle(item.subtitle || "");
    setFormBadgeText(item.badgeText || "");
    setFormMediaType(item.mediaType || "IMAGE");
    setFormMediaUrl(item.mediaUrl || "");
    setFormThumbnailUrl(item.thumbnailUrl || "");
    setFormCtaLabel(item.ctaLabel || "");
    setFormCtaAction(item.ctaAction || "NONE");
    setFormCtaTarget(item.ctaTarget || "");
    setFormSortOrder(String(item.sortOrder ?? 0));
    setFormStartAt(item.startAt ? item.startAt.slice(0, 10) : "");
    setFormEndAt(item.endAt ? item.endAt.slice(0, 10) : "");
    setFormIsActive(Boolean(item.isActive));
    setFormSingleActive(false);
    setFormOverlayEnabled(Boolean(item.overlayEnabled));
    setFormOverlayColor(item.overlayColor || "transparent");
    setFormOverlayOpacity(String(item.overlayOpacity !== undefined ? item.overlayOpacity : 0));
    setFormTextColor(item.textColor || "#FFFFFF");
    setFormContentAlignment(item.contentAlignment || "LEFT");
    setUploadError("");
    setIsFormModalOpen(true);
  };

  const processPickedMediaAsset = async (asset: any) => {
    setUploading(true);
    try {
      const uploaded = await uploadHomeHeroMedia({
        uri: asset.uri,
        name: asset.fileName || (formMediaType === "VIDEO" ? "hero_video.mp4" : "hero_img.jpg"),
        type: asset.mimeType || (formMediaType === "VIDEO" ? "video/mp4" : "image/jpeg"),
      });

      setFormMediaUrl(uploaded.secureUrl);
      if (uploaded.thumbnailUrl) {
        setFormThumbnailUrl(uploaded.thumbnailUrl);
      }
      setFormMediaType(uploaded.mediaType);
      Alert.alert("Sukses", "Media berhasil diunggah ke Cloudinary.");
    } catch (err: any) {
      console.error("Upload media error:", err);
      setUploadError(err.message || "Gagal mengunggah media.");
      Alert.alert("Gagal Unggah", err.message || "Terjadi kesalahan saat mengunggah media.");
    } finally {
      setUploading(false);
    }
  };

  const handlePickMedia = async () => {
    setUploadError("");
    if (formMediaType === "VIDEO") {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin Akses", "Aplikasi memerlukan izin galeri untuk memilih video banner.");
          return;
        }
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["videos"],
          allowsEditing: false,
          quality: 0.9,
        });
        if (!pickerResult.canceled && pickerResult.assets?.[0]) {
          await processPickedMediaAsset(pickerResult.assets[0]);
        }
      } catch (err: any) {
        Alert.alert("Gagal Unggah", err.message || "Terjadi kesalahan saat memilih video.");
      }
      return;
    }

    const openCamera = async () => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin Akses", "Aplikasi memerlukan izin kamera untuk mengambil foto banner.");
          return;
        }
        const pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
        });
        if (!pickerResult.canceled && pickerResult.assets?.[0]) {
          await processPickedMediaAsset(pickerResult.assets[0]);
        }
      } catch (err: any) {
        Alert.alert("Gagal Buka Kamera", err.message || "Terjadi kesalahan saat membuka kamera.");
      }
    };

    const openGallery = async () => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Izin Akses", "Aplikasi memerlukan izin galeri untuk memilih foto banner.");
          return;
        }
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
        });
        if (!pickerResult.canceled && pickerResult.assets?.[0]) {
          await processPickedMediaAsset(pickerResult.assets[0]);
        }
      } catch (err: any) {
        Alert.alert("Gagal Buka Galeri", err.message || "Terjadi kesalahan saat membuka galeri.");
      }
    };

    Alert.alert(
      "Pilih Sumber Media Banner",
      "Pilih metode pengambilan gambar untuk banner beranda:",
      [
        { text: "Buka Kamera", onPress: openCamera },
        { text: "Pilih dari Galeri", onPress: openGallery },
        { text: "Batal", style: "cancel" }
      ]
    );
  };

  const handleSaveBanner = async () => {
    // Validations
    if (!formMediaUrl.trim()) {
      Alert.alert("Validasi Gagal", "Pilih dan unggah gambar atau video terlebih dahulu.");
      return;
    }
    if (!/^https?:\/\/.+/i.test(formMediaUrl.trim())) {
      Alert.alert("Validasi Gagal", "URL media harus berupa URL HTTP/HTTPS yang valid.");
      return;
    }

    setSubmitting(true);
    try {
      const mediaTitle =
        formTitle.trim() ||
        (formMediaType === "VIDEO" ? "Video Beranda Customer" : "Gambar Beranda Customer");
      const payload: CreateHeroPayload = {
        title: mediaTitle,
        subtitle: "",
        badgeText: "",
        mediaType: formMediaType,
        mediaUrl: formMediaUrl.trim(),
        thumbnailUrl: formThumbnailUrl.trim() || undefined,
        ctaLabel: "",
        ctaAction: "NONE",
        ctaTarget: "",
        placement: "CUSTOMER_HOME_HERO",
        isActive: formIsActive,
        sortOrder: Number(formSortOrder) || 0,
        startAt: null,
        endAt: null,
        singleActive: false,
        overlayEnabled: false,
        overlayColor: "transparent",
        overlayOpacity: 0,
        textColor: "#FFFFFF",
        contentAlignment: "LEFT",
      };

      if (editingBannerId) {
        await updateHomeHero(editingBannerId, payload);
        Alert.alert("Sukses", "Hero banner berhasil diperbarui.");
      } else {
        await createHomeHero(payload);
        Alert.alert("Sukses", "Hero banner baru berhasil disimpan dan aktif.");
      }

      setIsFormModalOpen(false);
      await loadBanners();
    } catch (err: any) {
      console.error("Save banner error:", err);
      Alert.alert("Gagal", err.message || "Gagal menyimpan hero banner.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: HomeHeroBannerItem) => {
    try {
      const newStatus = !item.isActive;
      await updateHomeHeroStatus(item._id, newStatus, newStatus);
      await loadBanners();
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal mengubah status banner.");
    }
  };

  const handleDeleteBanner = (item: HomeHeroBannerItem) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus banner "${item.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHomeHero(item._id);
              Alert.alert("Sukses", "Hero banner berhasil dihapus.");
              await loadBanners();
            } catch (err: any) {
              Alert.alert("Gagal", err.message || "Gagal menghapus banner.");
            }
          },
        },
      ]
    );
  };

  // Build live preview data
  const currentPreviewBanner: HomeHeroBannerItem = {
    _id: editingBannerId || "preview_id",
    title: formTitle || "Media Beranda Customer",
    subtitle: "",
    badgeText: "",
    mediaType: formMediaType,
    mediaUrl: formMediaUrl,
    thumbnailUrl: formThumbnailUrl || formMediaUrl,
    ctaLabel: "",
    ctaAction: "NONE",
    ctaTarget: "",
    placement: "CUSTOMER_HOME_HERO",
    isActive: true,
    sortOrder: Number(formSortOrder) || 0,
    overlayEnabled: false,
    overlayColor: "transparent",
    overlayOpacity: 0,
    textColor: formTextColor.trim() || "#FFFFFF",
    contentAlignment: formContentAlignment,
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Banner Management */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Sparkles size={20} color="#1B7A4E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Konten Hero Beranda</Text>
            <Text style={styles.headerSubtitle}>
              Atur foto/video promosi yang tampil di Beranda Customer
            </Text>
          </View>
        </View>

        {/* Action Button Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.primaryAddBtn}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.primaryAddBtnText}>Tambah Hero</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => loadBanners()}
            activeOpacity={0.8}
          >
            <RefreshCw size={15} color="#1B7A4E" />
            <Text style={styles.secondaryBtnText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => setIsPreviewModalOpen(true)}
            activeOpacity={0.8}
          >
            <Eye size={15} color="#0284C7" />
            <Text style={styles.previewBtnText}>Preview Beranda</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Filter Bar */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === "ALL" && styles.filterChipActive]}
          onPress={() => setActiveFilter("ALL")}
        >
          <Text style={[styles.filterChipText, activeFilter === "ALL" && styles.filterChipTextActive]}>
            Semua ({banners.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeFilter === "ACTIVE" && styles.filterChipActive]}
          onPress={() => setActiveFilter("ACTIVE")}
        >
          <Text style={[styles.filterChipText, activeFilter === "ACTIVE" && styles.filterChipTextActive]}>
            Aktif Tayang
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeFilter === "INACTIVE" && styles.filterChipActive]}
          onPress={() => setActiveFilter("INACTIVE")}
        >
          <Text style={[styles.filterChipText, activeFilter === "INACTIVE" && styles.filterChipTextActive]}>
            Draft / Nonaktif
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Banner List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1B7A4E" />
          <Text style={styles.loadingText}>Memuat data hero banner...</Text>
        </View>
      ) : banners.length === 0 ? (
        <View style={styles.emptyCard}>
          <Layers size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Belum Ada Banner Hero</Text>
          <Text style={styles.emptySub}>
            Buat banner promosi pertama untuk menyapa warga di Beranda.
          </Text>
          <TouchableOpacity style={styles.emptyCtaBtn} onPress={openCreateModal}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.emptyCtaText}>Tambah Banner Pertama</Text>
          </TouchableOpacity>
        </View>
      ) : (
        banners.map((item) => (
          <View key={item._id} style={styles.bannerItemCard}>
            {/* Thumbnail Preview */}
            <View style={styles.thumbnailCol}>
              {item.thumbnailUrl || (item.mediaType === "IMAGE" && item.mediaUrl) ? (
                <Image
                  source={{ uri: item.thumbnailUrl || item.mediaUrl }}
                  style={styles.thumbnailImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.thumbnailFallback}>
                  {item.mediaType === "VIDEO" ? (
                    <Video size={24} color="#64748B" />
                  ) : (
                    <ImageIcon size={24} color="#64748B" />
                  )}
                </View>
              )}
              <View
                style={[
                  styles.mediaTypeBadge,
                  item.mediaType === "VIDEO" ? { backgroundColor: "#9333EA" } : { backgroundColor: "#0284C7" },
                ]}
              >
                {item.mediaType === "VIDEO" ? (
                  <Video size={10} color="#FFFFFF" />
                ) : (
                  <ImageIcon size={10} color="#FFFFFF" />
                )}
                <Text style={styles.mediaTypeBadgeText}>{item.mediaType}</Text>
              </View>
            </View>

            {/* Info Col */}
            <View style={styles.bannerInfoCol}>
              <View style={styles.badgeRow}>
                {item.badgeText ? (
                  <View style={styles.itemBadgePill}>
                    <Text style={styles.itemBadgeText}>{item.badgeText}</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.statusPill,
                    item.isActive ? styles.statusPillActive : styles.statusPillInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: item.isActive ? "#15803D" : "#94A3B8" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: item.isActive ? "#15803D" : "#64748B" },
                    ]}
                  >
                    {item.isActive ? "Aktif" : "Draft"}
                  </Text>
                </View>
                <Text style={styles.sortOrderText}>#{item.sortOrder}</Text>
              </View>

              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>

              {item.subtitle ? (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}

              {/* Schedule / Target Info */}
              <View style={styles.metaRow}>
                <Clock size={11} color="#64748B" />
                <Text style={styles.metaText}>
                  {item.startAt || item.endAt
                    ? `${item.startAt ? item.startAt.slice(0, 10) : "Awal"} s/d ${item.endAt ? item.endAt.slice(0, 10) : "Seterusnya"}`
                    : "Selalu Tayang"}
                </Text>
              </View>

              {item.ctaAction !== "NONE" && item.ctaLabel ? (
                <View style={styles.metaRow}>
                  <ArrowRight size={11} color="#0D7A53" />
                  <Text style={[styles.metaText, { color: "#0D7A53", fontWeight: "700" }]}>
                    CTA: {item.ctaLabel} ({item.ctaTarget})
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.itemActionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.7}
                >
                  <Edit2 size={13} color="#1E293B" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    item.isActive ? styles.toggleBtnActive : styles.toggleBtnInactive,
                  ]}
                  onPress={() => handleToggleStatus(item)}
                  activeOpacity={0.7}
                >
                  {item.isActive ? (
                    <>
                      <XCircle size={13} color="#D97706" />
                      <Text style={[styles.toggleBtnText, { color: "#D97706" }]}>Nonaktifkan</Text>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={13} color="#15803D" />
                      <Text style={[styles.toggleBtnText, { color: "#15803D" }]}>Aktifkan</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteBanner(item)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={13} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

      {/* ========================================================
          MODAL: FORM TAMBAH / EDIT HERO BANNER
         ======================================================== */}
      <Modal visible={isFormModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingBannerId ? "Edit Hero Banner" : "Tambah Hero Banner Baru"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Atur tampilan promosi visual di Beranda Customer
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsFormModalOpen(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text style={styles.inputLabel}>Media Beranda Customer</Text>
              <Text style={styles.formHintText}>
                Pilih satu gambar atau video. Tidak ada teks, tombol, atau overlay yang ditampilkan di atas media.
              </Text>
              <View style={styles.mediaTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.mediaTypeChoice,
                    formMediaType === "IMAGE" && styles.mediaTypeChoiceActive,
                  ]}
                  onPress={() => setFormMediaType("IMAGE")}
                >
                  <ImageIcon size={16} color={formMediaType === "IMAGE" ? "#FFFFFF" : "#64748B"} />
                  <Text
                    style={[
                      styles.mediaTypeChoiceText,
                      formMediaType === "IMAGE" && styles.mediaTypeChoiceTextActive,
                    ]}
                  >
                    Foto / Gambar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.mediaTypeChoice,
                    formMediaType === "VIDEO" && styles.mediaTypeChoiceActive,
                  ]}
                  onPress={() => setFormMediaType("VIDEO")}
                >
                  <Video size={16} color={formMediaType === "VIDEO" ? "#FFFFFF" : "#64748B"} />
                  <Text
                    style={[
                      styles.mediaTypeChoiceText,
                      formMediaType === "VIDEO" && styles.mediaTypeChoiceTextActive,
                    ]}
                  >
                    Video Promo
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>File Media</Text>
              <View style={styles.uploadBox}>
                {formMediaUrl ? (
                  <View style={styles.uploadedPreviewWrap}>
                    <Image
                      source={{ uri: formThumbnailUrl || formMediaUrl }}
                      style={styles.uploadedPreviewImg}
                      resizeMode="cover"
                    />
                    <View style={styles.uploadedOverlayBadge}>
                      <Text style={styles.uploadedOverlayText}>
                        {formMediaType === "VIDEO" ? "Video Siap" : "Gambar Siap"}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.uploadActionBtn}
                  onPress={handlePickMedia}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#1B7A4E" />
                  ) : (
                    <>
                      <Upload size={16} color="#1B7A4E" />
                      <Text style={styles.uploadActionBtnText}>
                        {formMediaUrl ? "Ganti File Media" : `Pilih & Unggah ${formMediaType}`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.uploadHelperText}>
                  Format: JPG, PNG, WEBP (maks. 10MB) atau MP4, MOV (maks. 600MB, maks. 5 menit)
                </Text>
              </View>
              {uploadError ? <Text style={styles.uploadErrorText}>{uploadError}</Text> : null}

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Tampilkan di Beranda Customer</Text>
                  <Text style={styles.toggleSub}>Media akan langsung diputar otomatis saat aktif.</Text>
                </View>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
                  thumbColor={formIsActive ? "#15803D" : "#94A3B8"}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Urutan Media</Text>
              <TextInput
                style={styles.textInput}
                value={formSortOrder}
                onChangeText={setFormSortOrder}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />

              <Text style={[styles.inputLabel, { marginTop: 18 }]}>Preview Bersih</Text>
              <View style={styles.miniPreviewCard}>
                <HomeHeroBannerView
                  banners={[currentPreviewBanner]}
                  customerLocation=""
                  isPreview
                />
              </View>
            </ScrollView>

            {/* Modal Footer Buttons */}
            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsFormModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveBanner}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {editingBannerId ? "Simpan Perubahan" : "Terbitkan Banner"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL: PREVIEW LIVE BERANDA CUSTOMER
         ======================================================== */}
      <Modal visible={isPreviewModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Preview Beranda Customer</Text>
                <Text style={styles.modalSubtitle}>
                  Simulasi banner aktif yang dilihat oleh customer
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsPreviewModalOpen(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <View style={styles.simulatedHeaderWrap}>
                <Text style={styles.simulatedLabel}>Tampilan Header Hero di Beranda Customer:</Text>
                <HomeHeroBannerView
                  banners={banners.filter((b) => b.isActive)}
                  customerLocation="Jl. Kamojang No. 14, Garut"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  primaryAddBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B7A4E",
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryAddBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  previewBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284C7",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  emptySub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 240,
  },
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  thumbnailCol: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },
  thumbnailFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaTypeBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypeBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerInfoCol: {
    flex: 1,
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  itemBadgePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: "#DCFCE7",
  },
  statusPillInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  sortOrderText: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "700",
    marginLeft: "auto",
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 17,
  },
  itemSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 10,
    color: "#64748B",
  },
  itemActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#FEF3C7",
  },
  toggleBtnInactive: {
    backgroundColor: "#DCFCE7",
  },
  toggleBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    marginLeft: "auto",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
    marginTop: 12,
    marginBottom: 6,
  },
  formHintText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: "#0F172A",
  },
  mediaTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  mediaTypeChoice: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mediaTypeChoiceActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  mediaTypeChoiceText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  mediaTypeChoiceTextActive: {
    color: "#FFFFFF",
  },
  uploadBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  uploadedPreviewWrap: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  uploadedPreviewImg: {
    width: "100%",
    height: "100%",
  },
  uploadedOverlayBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uploadedOverlayText: {
    fontSize: 9.5,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  uploadActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  uploadActionBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#15803D",
  },
  uploadHelperText: {
    fontSize: 9.5,
    color: "#94A3B8",
    textAlign: "center",
  },
  uploadErrorText: {
    width: "100%",
    fontSize: 10.5,
    lineHeight: 15,
    color: "#B91C1C",
    textAlign: "center",
    marginTop: 2,
  },
  ctaActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  ctaChoiceBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ctaChoiceBtnActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  ctaChoiceText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  ctaChoiceTextActive: {
    color: "#FFFFFF",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 12,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  toggleSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  miniPreviewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalFooterRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#64748B",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B7A4E",
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  simulatedHeaderWrap: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  simulatedLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  colorPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 6,
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  colorChipActive: {
    borderColor: "#1B7A4E",
    backgroundColor: "#E8F5E9",
  },
  colorSample: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  colorChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 6,
  },
  segmentedBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  segmentedBtnActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  segmentedBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentedBtnTextActive: {
    color: "#FFFFFF",
  },
});
