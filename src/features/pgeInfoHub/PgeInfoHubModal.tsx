import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Linking,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  Search,
  Video,
  Image as ImageIcon,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Building2,
  Share2,
  FileText,
} from "lucide-react-native";
import { PgeInfoHubCategory, PgeInfoHubItem, fetchPublishedPgeInfoHub } from "../../services/pgeInfoHubService";
import { INITIAL_PGE_INFO_HUB_ITEMS } from "./data";

interface PgeInfoHubModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: PgeInfoHubCategory | "Semua";
}

const CATEGORIES: Array<"Semua" | PgeInfoHubCategory> = [
  "Semua",
  "Acara",
  "Company Profile",
  "CSR",
  "Kegiatan Komunitas",
  "Pengumuman",
  "Safety Alert",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Company Profile": { bg: "#ECFDF5", text: "#0D7A53", border: "#A7F3D0" },
  CSR: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  Acara: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
  "Kegiatan Komunitas": { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  Pengumuman: { bg: "#FDF2F8", text: "#BE185D", border: "#FBCFE8" },
  "Safety Alert": { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
};

export const PgeInfoHubModal: React.FC<PgeInfoHubModalProps> = ({
  visible,
  onClose,
  initialCategory = "Semua",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<"Semua" | PgeInfoHubCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosterUrl, setSelectedPosterUrl] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<PgeInfoHubItem | null>(null);
  const [items, setItems] = useState<PgeInfoHubItem[]>(INITIAL_PGE_INFO_HUB_ITEMS as any);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchPublishedPgeInfoHub(undefined, forceRefresh);
      if (Array.isArray(data) && data.length > 0) {
        setItems(data);
      }
    } catch (err) {
      console.warn("PGE Info Hub live fetch note: fallback to current items", err);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData(true);
    }
  }, [visible, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.isPublished) return false;
      if (selectedCategory !== "Semua" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchBody = item.body?.toLowerCase().includes(query);
        const matchDept = item.authorOrDept?.toLowerCase().includes(query);
        const matchLoc = item.location?.toLowerCase().includes(query);
        const matchTag = item.tags?.some((t) => t.toLowerCase().includes(query));
        return matchTitle || matchDesc || matchBody || matchDept || matchLoc || matchTag;
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  const handleOpenVideo = async (videoUrl?: string) => {
    if (!videoUrl) {
      Alert.alert("Video Belum Tersedia", "Materi video resmi untuk konten ini sedang disiapkan.");
      return;
    }

    try {
      if (!videoUrl.startsWith("https://") && !videoUrl.startsWith("http://")) {
        Alert.alert("Tautan Tidak Aman", "URL video harus menggunakan protokol web yang aman.");
        return;
      }

      const supported = await Linking.canOpenURL(videoUrl);
      if (supported) {
        await Linking.openURL(videoUrl);
      } else {
        Alert.alert("Gagal Membuka Video", "Perangkat tidak memiliki aplikasi untuk membuka tautan ini.");
      }
    } catch (err) {
      console.error("Error opening video URL:", err);
      Alert.alert("Gagal Membuka Video", "Terjadi kesalahan saat memuat materi video.");
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require("../../../assets/geoverse-pge-official.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerTitle}>PGE Info Hub</Text>
              <Text style={styles.headerSubtitle}>Pusat Informasi & Kegiatan Komunitas Kamojang</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#0D7A53" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari acara, profil, kegiatan CSR, poster..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
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

        {/* Content List */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0D7A53"]}
              tintColor="#0D7A53"
            />
          }
        >
          {/* Info Banner */}
          <View style={styles.bannerNotice}>
            <Info size={16} color="#0D7A53" style={{ marginTop: 2, marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerNoticeTitle}>Materi Resmi PT Pertamina Geothermal Energy Tbk</Text>
              <Text style={styles.bannerNoticeDesc}>
                Semua poster kegiatan, video profil, dan informasi CSR dikelola langsung oleh tim PGE Kamojang untuk keterbukaan informasi warga.
              </Text>
            </View>
          </View>

          {/* Empty State */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Layers size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Belum Ada Konten Ditemukan</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery.trim()
                  ? `Tidak ada materi yang sesuai dengan pencarian "${searchQuery}". Coba kata kunci lain.`
                  : `Materi untuk kategori "${selectedCategory}" sedang dalam proses penyusunan oleh pengelola PGE.`}
              </Text>
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("Semua");
                  }}
                >
                  <Text style={styles.resetFilterBtnText}>Tampilkan Semua Konten</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredItems.map((item) => {
              const catTheme = CATEGORY_COLORS[item.category] || {
                bg: "#F1F5F9",
                text: "#475569",
                border: "#CBD5E1",
              };
              const displayMedia = item.imageUrl || item.posterUrl;

              return (
                <TouchableOpacity
                  key={item.id || (item as any)._id}
                  style={styles.card}
                  activeOpacity={0.92}
                  onPress={() => setSelectedDetailItem(item)}
                >
                  {displayMedia ? (
                    <Image source={{ uri: displayMedia }} style={styles.cardImage} resizeMode="cover" />
                  ) : null}

                  <View style={styles.cardBody}>
                    {/* Category Badge & Date */}
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: catTheme.bg,
                            borderColor: catTheme.border,
                          },
                        ]}
                      >
                        <Text style={[styles.categoryBadgeText, { color: catTheme.text }]}>
                          {item.category}
                        </Text>
                      </View>
                      <View style={styles.dateRow}>
                        <Calendar size={12} color="#64748B" />
                        <Text style={styles.dateText}>{formatDate(item.publishedAt)}</Text>
                      </View>
                    </View>

                    {/* Title & Description */}
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {item.description}
                    </Text>

                    {/* Metadata: Location / EventDate */}
                    <View style={styles.metaRow}>
                      {item.location ? (
                        <View style={styles.metaItem}>
                          <MapPin size={12} color="#0D7A53" />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {item.location}
                          </Text>
                        </View>
                      ) : null}
                      {item.eventDate ? (
                        <View style={styles.metaItem}>
                          <Sparkles size={12} color="#D97706" />
                          <Text style={[styles.metaText, { color: "#D97706", fontWeight: "700" }]}>
                            {item.eventDate}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Action Buttons: Video & Poster */}
                    <View style={styles.actionRow}>
                      {item.posterUrl ? (
                        <TouchableOpacity
                          style={styles.actionBtnSecondary}
                          onPress={() => setSelectedPosterUrl(item.posterUrl || null)}
                          activeOpacity={0.7}
                        >
                          <ImageIcon size={14} color="#0D7A53" />
                          <Text style={styles.actionBtnSecondaryText}>Lihat Poster</Text>
                        </TouchableOpacity>
                      ) : null}

                      {item.videoUrl ? (
                        <TouchableOpacity
                          style={styles.actionBtnPrimary}
                          onPress={() => handleOpenVideo(item.videoUrl)}
                          activeOpacity={0.8}
                        >
                          <Video size={14} color="#FFFFFF" />
                          <Text style={styles.actionBtnPrimaryText}>Tonton Video</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.actionBtnDetail}
                        onPress={() => setSelectedDetailItem(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionBtnDetailText}>Detail</Text>
                        <ChevronRight size={14} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* ============================================================ */}
        {/* ARTICLE / EVENT DETAIL MODAL                                 */}
        {/* ============================================================ */}
        <Modal
          visible={Boolean(selectedDetailItem)}
          animationType="slide"
          onRequestClose={() => setSelectedDetailItem(null)}
        >
          <SafeAreaView style={styles.detailSafeContainer} edges={["top", "bottom"]}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setSelectedDetailItem(null)}
                style={styles.detailBackBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                {selectedDetailItem?.category || "Detail Materi"}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {selectedDetailItem && (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {/* Header Image */}
                {(selectedDetailItem.posterUrl || selectedDetailItem.imageUrl) && (
                  <View style={styles.detailImageWrap}>
                    <Image
                      source={{
                        uri: selectedDetailItem.posterUrl || selectedDetailItem.imageUrl,
                      }}
                      style={styles.detailImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.detailBody}>
                  {/* Category Chip & Date */}
                  <View style={styles.detailBadgeRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor:
                            CATEGORY_COLORS[selectedDetailItem.category]?.bg || "#ECFDF5",
                          borderColor:
                            CATEGORY_COLORS[selectedDetailItem.category]?.border || "#A7F3D0",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          {
                            color:
                              CATEGORY_COLORS[selectedDetailItem.category]?.text || "#0D7A53",
                          },
                        ]}
                      >
                        {selectedDetailItem.category}
                      </Text>
                    </View>

                    <View style={styles.dateRow}>
                      <Calendar size={13} color="#64748B" />
                      <Text style={styles.dateText}>{formatDate(selectedDetailItem.publishedAt)}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.detailTitle}>{selectedDetailItem.title}</Text>

                  {/* Location & Agenda Pills */}
                  <View style={styles.detailPillsRow}>
                    {selectedDetailItem.location ? (
                      <View style={styles.detailPill}>
                        <MapPin size={13} color="#0D7A53" />
                        <Text style={styles.detailPillText}>{selectedDetailItem.location}</Text>
                      </View>
                    ) : null}

                    {selectedDetailItem.eventDate ? (
                      <View style={[styles.detailPill, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                        <Sparkles size={13} color="#D97706" />
                        <Text style={[styles.detailPillText, { color: "#B45309", fontWeight: "700" }]}>
                          {selectedDetailItem.eventDate}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Author / Department Info */}
                  {selectedDetailItem.authorOrDept ? (
                    <View style={styles.detailAuthorCard}>
                      <Building2 size={16} color="#0D7A53" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailAuthorLabel}>Dikelola & Diterbitkan Oleh:</Text>
                        <Text style={styles.detailAuthorText}>{selectedDetailItem.authorOrDept}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Description / Summary */}
                  <Text style={styles.detailSectionTitle}>Ringkasan</Text>
                  <Text style={styles.detailDescription}>{selectedDetailItem.description}</Text>

                  {/* Full Body Content if present */}
                  {selectedDetailItem.body ? (
                    <>
                      <Text style={styles.detailSectionTitle}>Rincian Lengkap</Text>
                      <Text style={styles.detailBodyContent}>{selectedDetailItem.body}</Text>
                    </>
                  ) : null}

                  {/* Tags */}
                  {Array.isArray(selectedDetailItem.tags) && selectedDetailItem.tags.length > 0 ? (
                    <View style={styles.detailTagsWrap}>
                      {selectedDetailItem.tags.map((t, idx) => (
                        <View key={idx} style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>#{t}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Action Buttons in Detail */}
                  <View style={styles.detailActionsRow}>
                    {selectedDetailItem.posterUrl ? (
                      <TouchableOpacity
                        style={styles.detailActionBtnSecondary}
                        onPress={() => setSelectedPosterUrl(selectedDetailItem.posterUrl || null)}
                        activeOpacity={0.8}
                      >
                        <ImageIcon size={16} color="#0D7A53" />
                        <Text style={styles.detailActionBtnSecondaryText}>Buka Poster Resolusi Penuh</Text>
                      </TouchableOpacity>
                    ) : null}

                    {selectedDetailItem.videoUrl ? (
                      <TouchableOpacity
                        style={styles.detailActionBtnPrimary}
                        onPress={() => handleOpenVideo(selectedDetailItem.videoUrl)}
                        activeOpacity={0.8}
                      >
                        <Video size={16} color="#FFFFFF" />
                        <Text style={styles.detailActionBtnPrimaryText}>Tonton Video Resmi</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* Poster Image Lightbox Modal */}
        <Modal
          visible={Boolean(selectedPosterUrl)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPosterUrl(null)}
        >
          <View style={styles.lightboxBackdrop}>
            <SafeAreaView style={styles.lightboxSafe}>
              <View style={styles.lightboxHeader}>
                <Text style={styles.lightboxTitle}>Preview Materi Poster Resmi</Text>
                <TouchableOpacity
                  onPress={() => setSelectedPosterUrl(null)}
                  style={styles.lightboxCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {selectedPosterUrl ? (
                <View style={styles.lightboxImageWrap}>
                  <Image
                    source={{ uri: selectedPosterUrl }}
                    style={styles.lightboxImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              <View style={styles.lightboxFooter}>
                <ShieldCheck size={14} color="#A7F3D0" />
                <Text style={styles.lightboxFooterText}>
                  Hak Cipta PT Pertamina Geothermal Energy Tbk & Komunitas GEOVERSE
                </Text>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  bannerNotice: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  bannerNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 2,
  },
  bannerNoticeDesc: {
    fontSize: 11,
    color: "#047857",
    lineHeight: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  cardImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#0F172A",
  },
  cardBody: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#64748B",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionBtnDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  actionBtnDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  resetFilterBtn: {
    marginTop: 8,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetFilterBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Detail Modal
  detailSafeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailScroll: {
    flex: 1,
  },
  detailImageWrap: {
    width: "100%",
    height: 240,
    backgroundColor: "#0F172A",
  },
  detailImage: {
    width: "100%",
    height: "100%",
  },
  detailBody: {
    padding: 20,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  detailBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 28,
    marginBottom: 12,
  },
  detailPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  detailPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
  },
  detailAuthorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailAuthorLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  detailAuthorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 6,
  },
  detailDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 10,
  },
  detailBodyContent: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 21,
    marginBottom: 14,
  },
  detailTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  tagBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  detailActionsRow: {
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailActionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 12,
    borderRadius: 14,
  },
  detailActionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  detailActionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 14,
  },
  detailActionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  lightboxSafe: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  lightboxTitle: {
    color: "#FFFFFF",
    fontSize: 14,
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
    paddingBottom: 8,
  },
  lightboxFooterText: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "600",
  },
});
