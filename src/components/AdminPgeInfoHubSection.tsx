/**
 * AdminPgeInfoHubSection.tsx
 * Admin CMS for PGE Info Hub (Artikel, Acara, Poster, Video, CSR, Profil)
 * Modern, clean, and professional interface with full CRUD and status management.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
} from "react-native";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Tag,
  Upload,
  Video,
  Image as ImageIcon,
  ExternalLink,
  X,
  Layers,
  ChevronDown,
  Building2,
  FileText,
  ShieldCheck,
} from "lucide-react-native";
import {
  PgeInfoHubItem,
  PgeInfoHubCategory,
  PgeInfoHubStatus,
  fetchAdminPgeInfoHub,
  createPgeInfoHubItem,
  updatePgeInfoHubItem,
  updatePgeInfoHubStatus,
  deletePgeInfoHubItem,
  uploadPgeInfoHubMedia,
} from "../services/pgeInfoHubService";

interface AdminPgeInfoHubSectionProps {
  onPreviewCustomer?: () => void;
}

const CATEGORY_OPTIONS: PgeInfoHubCategory[] = [
  "Company Profile",
  "CSR",
  "Acara",
  "Kegiatan Komunitas",
  "Pengumuman",
  "Safety Alert",
];

const CATEGORY_COLORS: Record<PgeInfoHubCategory, { bg: string; text: string; border: string }> = {
  "Company Profile": { bg: "#ECFDF5", text: "#0D7A53", border: "#A7F3D0" },
  CSR: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  Acara: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  "Kegiatan Komunitas": { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  Pengumuman: { bg: "#FDF2F8", text: "#BE185D", border: "#FBCFE8" },
  "Safety Alert": { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
};

export const AdminPgeInfoHubSection: React.FC<AdminPgeInfoHubSectionProps> = ({
  onPreviewCustomer,
}) => {
  const [items, setItems] = useState<PgeInfoHubItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<"Semua" | PgeInfoHubCategory>("Semua");

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PgeInfoHubItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<PgeInfoHubCategory>("Acara");
  const [formDescription, setFormDescription] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formPosterUrl, setFormPosterUrl] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formEventDate, setFormEventDate] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formIsPublished, setFormIsPublished] = useState(true);

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<any>(null);

  // Poster Lightbox
  const [previewPosterUrl, setPreviewPosterUrl] = useState<string | null>(null);

  // Load items from API
  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminPgeInfoHub();
      setItems(data);
    } catch (err: any) {
      Alert.alert("Gagal Memuat Konten", err.message || "Periksa koneksi backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (activeStatusFilter === "PUBLISHED" && !item.isPublished) return false;
      if (activeStatusFilter === "DRAFT" && item.isPublished) return false;

      // Category filter
      if (selectedCategory !== "Semua" && item.category !== selectedCategory) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchLoc = item.location?.toLowerCase().includes(q);
        const matchDept = item.authorOrDept?.toLowerCase().includes(q);
        const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchLoc || matchDept || matchTags;
      }

      return true;
    });
  }, [items, activeStatusFilter, selectedCategory, search]);

  // Stats computation
  const stats = useMemo(() => {
    const total = items.length;
    const published = items.filter((i) => i.isPublished).length;
    const draft = total - published;
    const events = items.filter((i) => i.category === "Acara").length;
    return { total, published, draft, events };
  }, [items]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCategory("Acara");
    setFormDescription("");
    setFormBody("");
    setFormImageUrl("");
    setFormPosterUrl("");
    setFormVideoUrl("");
    setFormLocation("Kamojang, Samarang, Kabupaten Garut");
    setFormEventDate("");
    setFormAuthor("Corporate Communication & CSR PGE Kamojang");
    setFormTags("Acara, Komunitas, Kamojang");
    setFormIsPublished(true);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (item: PgeInfoHubItem) => {
    setEditingItem(item);
    setFormTitle(item.title || "");
    setFormCategory(item.category || "Company Profile");
    setFormDescription(item.description || "");
    setFormBody(item.body || "");
    setFormImageUrl(item.imageUrl || "");
    setFormPosterUrl(item.posterUrl || "");
    setFormVideoUrl(item.videoUrl || "");
    setFormLocation(item.location || "");
    setFormEventDate(item.eventDate || "");
    setFormAuthor(item.authorOrDept || "");
    setFormTags(Array.isArray(item.tags) ? item.tags.join(", ") : "");
    setFormIsPublished(Boolean(item.isPublished));
    setIsFormOpen(true);
  };

  // Submit Save
  const handleSaveItem = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Data Belum Lengkap", "Judul materi wajib diisi.");
      return;
    }
    if (!formDescription.trim()) {
      Alert.alert("Data Belum Lengkap", "Ringkasan / deskripsi wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        description: formDescription.trim(),
        body: formBody.trim(),
        imageUrl: formImageUrl.trim(),
        posterUrl: formPosterUrl.trim() || formImageUrl.trim(),
        videoUrl: formVideoUrl.trim(),
        location: formLocation.trim(),
        eventDate: formEventDate.trim(),
        authorOrDept: formAuthor.trim(),
        tags: tagsArray,
        status: (formIsPublished ? "PUBLISHED" : "DRAFT") as PgeInfoHubStatus,
      };

      if (editingItem) {
        await updatePgeInfoHubItem(editingItem.id || (editingItem as any)._id, payload);
        Alert.alert("Berhasil", "Materi PGE Info Hub berhasil diperbarui.");
      } else {
        await createPgeInfoHubItem(payload);
        Alert.alert("Berhasil", "Materi PGE Info Hub baru berhasil ditambahkan.");
      }

      setIsFormOpen(false);
      await loadItems();
    } catch (err: any) {
      Alert.alert("Gagal Menyimpan", err.message || "Terjadi kesalahan saat menyimpan materi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Quick Status (Publish / Draft)
  const handleToggleStatus = async (item: PgeInfoHubItem) => {
    const nextStatus: PgeInfoHubStatus = item.isPublished ? "DRAFT" : "PUBLISHED";
    const actionLabel = item.isPublished ? "menjadikan Draf" : "mempublikasikan";

    const proceed = () => {
      (async () => {
        try {
          await updatePgeInfoHubStatus(item.id || (item as any)._id, nextStatus);
          // Reactive local update
          setItems((prev) =>
            prev.map((i) =>
              (i.id || (i as any)._id) === (item.id || (item as any)._id)
                ? { ...i, status: nextStatus, isPublished: nextStatus === "PUBLISHED" }
                : i
            )
          );
        } catch (err: any) {
          Alert.alert("Gagal Mengubah Status", err.message);
        }
      })();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Yakin ingin ${actionLabel} materi "${item.title}"?`)) {
        proceed();
      }
    } else {
      Alert.alert(
        "Konfirmasi Status",
        `Yakin ingin ${actionLabel} materi "${item.title}"?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Ya, Lanjutkan", onPress: proceed },
        ]
      );
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: PgeInfoHubItem) => {
    const proceed = () => {
      (async () => {
        try {
          await deletePgeInfoHubItem(item.id || (item as any)._id);
          setItems((prev) =>
            prev.filter((i) => (i.id || (i as any)._id) !== (item.id || (item as any)._id))
          );
          Alert.alert("Berhasil", `Materi "${item.title}" telah dihapus.`);
        } catch (err: any) {
          Alert.alert("Gagal Menghapus", err.message);
        }
      })();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Hapus permanen materi "${item.title}"? Tindakan ini tidak dapat dibatalkan.`)) {
        proceed();
      }
    } else {
      Alert.alert(
        "Konfirmasi Hapus",
        `Hapus permanen materi "${item.title}"?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Hapus", style: "destructive", onPress: proceed },
        ]
      );
    }
  };

  // Handle File Upload on Web
  const handleWebFileSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadPgeInfoHubMedia({
        uri: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
      });

      if (res.mediaType === "VIDEO") {
        setFormVideoUrl(res.url);
        Alert.alert("Upload Sukses", "File video berhasil diunggah.");
      } else {
        setFormImageUrl(res.url);
        setFormPosterUrl(res.url);
        Alert.alert("Upload Sukses", "File gambar/poster berhasil diunggah.");
      }
    } catch (err: any) {
      Alert.alert("Gagal Upload", err.message || "Gagal mengunggah file media.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hidden Web File Input for Poster/Media Upload */}
      {Platform.OS === "web" && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*,video/mp4"
          onChange={handleWebFileSelect}
        />
      )}

      {/* ============================================================ */}
      {/* 1. HEADER CARD & STATS SUMMARY                                */}
      {/* ============================================================ */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerBadge}>
              <Sparkles size={13} color="#0D7A53" />
              <Text style={styles.headerBadgeText}>Pusat Konten Resmi PGE</Text>
            </View>
            <Text style={styles.headerTitle}>PGE Info Hub CMS</Text>
            <Text style={styles.headerSubtitle}>
              Kelola berita acara, artikel, poster kegiatan, CSR, dan materi video resmi PGE Area Kamojang
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleOpenCreate}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Tambah Konten</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={loadItems}
            activeOpacity={0.8}
            disabled={loading}
          >
            <RefreshCw size={15} color="#0D7A53" />
            <Text style={styles.btnSecondaryText}>Refresh</Text>
          </TouchableOpacity>

          {onPreviewCustomer && (
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={onPreviewCustomer}
              activeOpacity={0.8}
            >
              <Eye size={15} color="#2563EB" />
              <Text style={styles.btnOutlineText}>Preview di Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Materi</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#E2E8F0" }]}>
            <Text style={[styles.statNum, { color: "#0D7A53" }]}>{stats.published}</Text>
            <Text style={styles.statLabel}>Tayang Aktif</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#E2E8F0" }]}>
            <Text style={[styles.statNum, { color: "#64748B" }]}>{stats.draft}</Text>
            <Text style={styles.statLabel}>Draf / Arsip</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: "#E2E8F0" }]}>
            <Text style={[styles.statNum, { color: "#D97706" }]}>{stats.events}</Text>
            <Text style={styles.statLabel}>Agenda Acara</Text>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. SEARCH & FILTER CONTROLS                                  */}
      {/* ============================================================ */}
      <View style={styles.filterSection}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color="#0D7A53" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari judul, kategori, lokasi, kata kunci..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Switcher Tabs */}
        <View style={styles.statusTabs}>
          {(["ALL", "PUBLISHED", "DRAFT"] as const).map((st) => {
            const active = activeStatusFilter === st;
            const labels = {
              ALL: `Semua (${stats.total})`,
              PUBLISHED: `Tayang (${stats.published})`,
              DRAFT: `Draf (${stats.draft})`,
            };
            return (
              <TouchableOpacity
                key={st}
                style={[styles.statusTabBtn, active && styles.statusTabBtnActive]}
                onPress={() => setActiveStatusFilter(st)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>
                  {labels[st]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {(["Semua", ...CATEGORY_OPTIONS] as const).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ============================================================ */}
      {/* 3. LIST OF CONTENT CARDS                                     */}
      {/* ============================================================ */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0D7A53" />
          <Text style={styles.loadingText}>Memuat materi PGE Info Hub...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Layers size={44} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Tidak Ada Materi Ditemukan</Text>
          <Text style={styles.emptySubtitle}>
            {search.trim()
              ? `Tidak ada konten yang sesuai dengan kata kunci "${search}".`
              : "Belum ada konten dalam kategori atau status ini. Klik Tambah Konten untuk membuat baru."}
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleOpenCreate}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Buat Materi Baru</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {filteredItems.map((item) => {
            const catStyle = CATEGORY_COLORS[item.category] || {
              bg: "#F1F5F9",
              text: "#334155",
              border: "#CBD5E1",
            };
            const imageSource = item.posterUrl || item.imageUrl;

            return (
              <View key={item.id || (item as any)._id} style={styles.itemCard}>
                {/* Left/Top Media Thumbnail */}
                <View style={styles.itemCardMediaWrap}>
                  {imageSource ? (
                    <Image source={{ uri: imageSource }} style={styles.itemCardMedia} resizeMode="cover" />
                  ) : (
                    <View style={styles.itemCardMediaPlaceholder}>
                      <FileText size={32} color="#94A3B8" />
                    </View>
                  )}

                  {/* Status Overlay Badge */}
                  <View
                    style={[
                      styles.itemStatusBadge,
                      {
                        backgroundColor: item.isPublished ? "#0D7A53" : "#64748B",
                      },
                    ]}
                  >
                    <Text style={styles.itemStatusBadgeText}>
                      {item.isPublished ? "TAYANG" : "DRAF"}
                    </Text>
                  </View>
                </View>

                {/* Content Details */}
                <View style={styles.itemCardBody}>
                  {/* Category Chip & Date */}
                  <View style={styles.itemCardTopMeta}>
                    <View
                      style={[
                        styles.catBadge,
                        {
                          backgroundColor: catStyle.bg,
                          borderColor: catStyle.border,
                        },
                      ]}
                    >
                      <Text style={[styles.catBadgeText, { color: catStyle.text }]}>
                        {item.category}
                      </Text>
                    </View>

                    {item.eventDate ? (
                      <View style={styles.metaPillAmber}>
                        <Calendar size={11} color="#B45309" />
                        <Text style={styles.metaPillAmberText}>{item.eventDate}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>

                  {/* Location & Author */}
                  <View style={styles.itemMetaList}>
                    {item.location && (
                      <View style={styles.metaRowItem}>
                        <MapPin size={12} color="#0D7A53" />
                        <Text style={styles.metaRowText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                    {item.authorOrDept && (
                      <View style={styles.metaRowItem}>
                        <Building2 size={12} color="#64748B" />
                        <Text style={styles.metaRowText} numberOfLines={1}>
                          {item.authorOrDept}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Media links indicator */}
                  <View style={styles.itemMediaBadges}>
                    {item.posterUrl && (
                      <TouchableOpacity
                        style={styles.mediaLinkBtn}
                        onPress={() => setPreviewPosterUrl(item.posterUrl || null)}
                        activeOpacity={0.7}
                      >
                        <ImageIcon size={12} color="#0D7A53" />
                        <Text style={styles.mediaLinkBtnText}>Poster Terpasang</Text>
                      </TouchableOpacity>
                    )}

                    {item.videoUrl && (
                      <TouchableOpacity
                        style={[styles.mediaLinkBtn, { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }]}
                        onPress={() => Linking.openURL(item.videoUrl!)}
                        activeOpacity={0.7}
                      >
                        <Video size={12} color="#2563EB" />
                        <Text style={[styles.mediaLinkBtnText, { color: "#2563EB" }]}>Video Tersedia</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Bottom Action Buttons */}
                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtnEdit}
                      onPress={() => handleOpenEdit(item)}
                      activeOpacity={0.8}
                    >
                      <Edit2 size={13} color="#0D7A53" />
                      <Text style={styles.actionBtnEditText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtnToggle,
                        item.isPublished ? styles.actionBtnDraft : styles.actionBtnPublish,
                      ]}
                      onPress={() => handleToggleStatus(item)}
                      activeOpacity={0.8}
                    >
                      {item.isPublished ? (
                        <>
                          <EyeOff size={13} color="#64748B" />
                          <Text style={styles.actionBtnDraftText}>Jadikan Draf</Text>
                        </>
                      ) : (
                        <>
                          <Eye size={13} color="#0D7A53" />
                          <Text style={styles.actionBtnPublishText}>Tayangkan</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnDelete}
                      onPress={() => handleDeleteItem(item)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL FORM: CREATE / EDIT INFO HUB CONTENT                */}
      {/* ============================================================ */}
      <Modal visible={isFormOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {editingItem ? "Edit Materi PGE Info Hub" : "Tambah Materi PGE Info Hub"}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Atur berita, artikel, agenda acara, poster, atau tautan video resmi
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFormOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content Scroll */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Field 1: Judul Konten */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Judul Materi / Berita Acara <Text style={styles.formRequired}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Festival Geothermal & Pameran UMKM Kamojang 2026"
                  placeholderTextColor="#94A3B8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Field 2: Kategori */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Kategori Materi <Text style={styles.formRequired}>*</Text>
                </Text>
                <View style={styles.categorySelectGrid}>
                  {CATEGORY_OPTIONS.map((cat) => {
                    const active = formCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categorySelectBtn,
                          active && styles.categorySelectBtnActive,
                        ]}
                        onPress={() => setFormCategory(cat)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.categorySelectBtnText,
                            active && styles.categorySelectBtnTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Field 3: Ringkasan / Deskripsi */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Ringkasan / Deskripsi Singkat <Text style={styles.formRequired}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formInput, { height: 75, textAlignVertical: "top" }]}
                  placeholder="Ringkasan isi berita atau materi yang tampil pada kartu beranda..."
                  placeholderTextColor="#94A3B8"
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                />
              </View>

              {/* Field 4: Isi Lengkap Artikel / Berita */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Isi Lengkap / Detail Berita (Opsional)</Text>
                <TextInput
                  style={[styles.formInput, { height: 110, textAlignVertical: "top" }]}
                  placeholder="Teks lengkap artikel, rincian susunan acara, tata cara pendaftaran, dsb..."
                  placeholderTextColor="#94A3B8"
                  value={formBody}
                  onChangeText={setFormBody}
                  multiline
                />
              </View>

              {/* Field 5: Media & Poster Upload */}
              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>Media Poster / Foto Kegiatan</Text>
                  {Platform.OS === "web" && (
                    <TouchableOpacity
                      style={styles.uploadTriggerBtn}
                      onPress={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#0D7A53" />
                      ) : (
                        <>
                          <Upload size={13} color="#0D7A53" />
                          <Text style={styles.uploadTriggerText}>Unggah Berkas</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://images.unsplash.com/... atau URL gambar"
                  placeholderTextColor="#94A3B8"
                  value={formImageUrl}
                  onChangeText={(val) => {
                    setFormImageUrl(val);
                    if (!formPosterUrl) setFormPosterUrl(val);
                  }}
                />

                {/* Poster URL Override if different */}
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.formSublabel}>URL Poster Full-Resolution (Opsional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="URL gambar poster resolusi penuh (jika berbeda dari thumbnail)"
                    placeholderTextColor="#94A3B8"
                    value={formPosterUrl}
                    onChangeText={setFormPosterUrl}
                  />
                </View>

                {/* Preview Image */}
                {(formImageUrl || formPosterUrl) && (
                  <View style={styles.formMediaPreviewBox}>
                    <Image
                      source={{ uri: formPosterUrl || formImageUrl }}
                      style={styles.formMediaPreview}
                      resizeMode="cover"
                    />
                    <Text style={styles.formMediaPreviewCaption}>Preview Poster / Banner</Text>
                  </View>
                )}
              </View>

              {/* Field 6: Video URL */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URL Video Resmi (Opsional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://res.cloudinary.com/... atau YouTube URL"
                  placeholderTextColor="#94A3B8"
                  value={formVideoUrl}
                  onChangeText={setFormVideoUrl}
                />
              </View>

              {/* Field 7: Tanggal Acara & Lokasi */}
              <View style={styles.formRow2}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Tanggal / Jadwal Acara</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Contoh: 25–27 April 2026"
                    placeholderTextColor="#94A3B8"
                    value={formEventDate}
                    onChangeText={setFormEventDate}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Lokasi Kegiatan</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Contoh: Kamojang, Garut"
                    placeholderTextColor="#94A3B8"
                    value={formLocation}
                    onChangeText={setFormLocation}
                  />
                </View>
              </View>

              {/* Field 8: Departemen Penyelenggara & Tags */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Departemen / Humas Penyelenggara</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Corporate Communication & CSR PGE Kamojang"
                  placeholderTextColor="#94A3B8"
                  value={formAuthor}
                  onChangeText={setFormAuthor}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tags / Kata Kunci (Dipisahkan Koma)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Energi Bersih, Geotermal, UMKM"
                  placeholderTextColor="#94A3B8"
                  value={formTags}
                  onChangeText={setFormTags}
                />
              </View>

              {/* Field 9: Status Publikasi Toggle */}
              <View style={styles.publishToggleCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.publishToggleTitle}>Status Publikasi</Text>
                  <Text style={styles.publishToggleSubtitle}>
                    {formIsPublished
                      ? "Materi langsung tayang dan dapat diakses customer di Beranda."
                      : "Materi disimpan sebagai draf privat untuk ditinjau terlebih dahulu."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.publishToggleSwitch,
                    formIsPublished ? styles.switchActive : styles.switchInactive,
                  ]}
                  onPress={() => setFormIsPublished(!formIsPublished)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchText}>
                    {formIsPublished ? "PUBLISHED" : "DRAFT"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsFormOpen(false)}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveItem}
                activeOpacity={0.85}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={16} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>
                      {editingItem ? "Perbarui Materi" : "Simpan Materi"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 5. POSTER LIGHTBOX PREVIEW MODAL                             */}
      {/* ============================================================ */}
      <Modal
        visible={Boolean(previewPosterUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPosterUrl(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <View style={styles.lightboxHeader}>
            <Text style={styles.lightboxTitle}>Preview Poster Resmi</Text>
            <TouchableOpacity
              onPress={() => setPreviewPosterUrl(null)}
              style={styles.lightboxCloseBtn}
              activeOpacity={0.7}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {previewPosterUrl ? (
            <View style={styles.lightboxImageWrap}>
              <Image
                source={{ uri: previewPosterUrl }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <View style={styles.lightboxFooter}>
            <ShieldCheck size={14} color="#A7F3D0" />
            <Text style={styles.lightboxFooterText}>
              Materi Resmi PT Pertamina Geothermal Energy Tbk
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: 36,
  },

  // 1. Header Card & Stats
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2F6EA",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  headerBadgeText: {
    color: "#0D7A53",
    fontSize: 11,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnSecondaryText: {
    color: "#0D7A53",
    fontSize: 12,
    fontWeight: "700",
  },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnOutlineText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },

  // 2. Filter Section
  filterSection: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
  },
  statusTabs: {
    flexDirection: "row",
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  statusTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: "center",
  },
  statusTabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  statusTabTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  categoryScroll: {
    paddingVertical: 10,
    gap: 6,
  },
  categoryChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  categoryChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // 3. Items List
  itemsList: {
    marginHorizontal: 16,
    marginTop: 4,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  itemCardMediaWrap: {
    width: "100%",
    height: 140,
    backgroundColor: "#0F172A",
    position: "relative",
  },
  itemCardMedia: {
    width: "100%",
    height: "100%",
  },
  itemCardMediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  itemStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  itemStatusBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  itemCardBody: {
    padding: 14,
  },
  itemCardTopMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  catBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaPillAmber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  metaPillAmberText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 21,
  },
  itemDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 18,
  },
  itemMetaList: {
    marginTop: 8,
    gap: 4,
  },
  metaRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaRowText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
  },
  itemMediaBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  mediaLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mediaLinkBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  itemActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtnEdit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnEditText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  actionBtnToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnPublish: {
    backgroundColor: "#E8F5EE",
  },
  actionBtnPublishText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  actionBtnDraft: {
    backgroundColor: "#F1F5F9",
  },
  actionBtnDraftText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  actionBtnDelete: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
  },

  // Loading & Empty States
  loadingBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    marginHorizontal: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },

  // 4. Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalHeaderSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 5,
  },
  formSublabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  formRequired: {
    color: "#DC2626",
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: "#0F172A",
  },
  uploadTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  uploadTriggerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  formMediaPreviewBox: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formMediaPreview: {
    width: "100%",
    height: 120,
  },
  formMediaPreviewCaption: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 4,
    backgroundColor: "#F8FAFC",
  },
  categorySelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categorySelectBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categorySelectBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  categorySelectBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  categorySelectBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  formRow2: {
    flexDirection: "row",
    gap: 10,
  },
  publishToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    gap: 10,
  },
  publishToggleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  publishToggleSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  publishToggleSwitch: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 90,
    alignItems: "center",
  },
  switchActive: {
    backgroundColor: "#0D7A53",
  },
  switchInactive: {
    backgroundColor: "#94A3B8",
  },
  switchText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalSaveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // 5. Lightbox Styles
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "space-between",
    padding: 20,
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  lightboxTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImageWrap: {
    flex: 1,
    marginVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 10,
  },
  lightboxFooterText: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "600",
  },
});
