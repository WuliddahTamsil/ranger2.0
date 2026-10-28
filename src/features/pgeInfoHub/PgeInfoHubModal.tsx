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
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  RefreshCw,
  MessageSquare,
  Newspaper,
  CheckCircle2,
  Clock,
  ArrowRight,
  Users,
  Bell,
} from "lucide-react-native";
import { PgeInfoHubCategory, PgeInfoHubItem, fetchPublishedPgeInfoHub } from "../../services/pgeInfoHubService";
import { INITIAL_PGE_INFO_HUB_ITEMS } from "./data";

interface PgeInfoHubModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: PgeInfoHubCategory | "Semua";
}

const CATEGORY_ITEMS: Array<{
  id: "Semua" | PgeInfoHubCategory;
  label: string;
  icon: any;
}> = [
  { id: "Semua", label: "Semua", icon: Layers },
  { id: "Company Profile", label: "Company Profile", icon: Building2 },
  { id: "CSR", label: "Program CSR", icon: Sparkles },
  { id: "Acara", label: "Agenda Acara", icon: Calendar },
  { id: "Kegiatan Komunitas", label: "Kegiatan Warga", icon: Users },
  { id: "Pengumuman", label: "Pengumuman", icon: Bell },
  { id: "Safety Alert", label: "Safety Alert", icon: ShieldCheck },
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
  const insets = useSafeAreaInsets();
  const topSafe = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0
  );

  const [selectedCategory, setSelectedCategory] = useState<"Semua" | PgeInfoHubCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosterUrl, setSelectedPosterUrl] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<PgeInfoHubItem | null>(null);
  const [items, setItems] = useState<PgeInfoHubItem[]>(INITIAL_PGE_INFO_HUB_ITEMS as any);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchPublishedPgeInfoHub(undefined, forceRefresh);
      if (Array.isArray(data)) {
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
    if (!isoString) return "Materi Resmi";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("id-ID", {
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
      <View style={styles.safeContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#064E3B" translucent={false} />

        {/* ============================================================ */}
        {/* HERO HEADER: PGE BRAND IDENTITY WITH GENEROUS TOP CLEARANCE   */}
        {/* ============================================================ */}
        <View style={[styles.header, { paddingTop: topSafe + 12 }]}>
          {/* Top Bar: Official Badge + Close Button (Never cram top edge) */}
          <View style={styles.headerTopBar}>
            <View style={styles.officialPill}>
              <ShieldCheck size={13} color="#34D399" />
              <Text style={styles.officialPillText}>Portal Resmi PGE Kamojang</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Hero Identity Block */}
          <View style={styles.heroBrandRow}>
            <View style={styles.logoBadge}>
              <Image
                source={require("../../../assets/geoverse-pge-official.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>PGE Info Hub</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Pusat Agenda, Informasi CSR & Komunitas
              </Text>
              <View style={styles.brandTaglineWrap}>
                <View style={styles.brandDot} />
                <Text style={styles.brandTaglineText} numberOfLines={1}>
                  PT Pertamina Geothermal Energy Tbk
                </Text>
              </View>
            </View>
          </View>

          {/* Search Card */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#0D7A53" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari artikel, agenda, CSR, atau kegiatan..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.searchClearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORY_ITEMS.map((cat) => {
              const active = selectedCategory === cat.id;
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <IconComp size={13} color={active ? "#064E3B" : "#F1F5F9"} />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* MAIN SCROLLABLE CONTENT AREA                                 */}
        {/* ============================================================ */}
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
          {/* Official Bulletin Notice Card */}
          <View style={styles.bannerNotice}>
            <View style={styles.bannerAccentLine} />
            <View style={styles.bannerInner}>
              <View style={styles.bannerTopRow}>
                <View style={styles.bannerTagPill}>
                  <Sparkles size={12} color="#0D7A53" />
                  <Text style={styles.bannerTagText}>Keterbukaan Informasi Publik</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={12} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>Resmi</Text>
                </View>
              </View>

              <Text style={styles.bannerNoticeTitle}>
                Materi Resmi PT Pertamina Geothermal Energy Tbk
              </Text>

              <Text style={styles.bannerNoticeDesc}>
                Seluruh poster kegiatan, dokumentasi video profil, materi safety alert, dan informasi program CSR dikelola langsung oleh tim komunikasi PGE Area Kamojang demi transparansi publik serta kemudahan akses seluruh warga GEOVERSE.
              </Text>
            </View>
          </View>

          {/* Empty State Card */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconOuterRing}>
                <View style={styles.emptyIconMiddleRing}>
                  <View style={styles.emptyIconInnerRing}>
                    <Newspaper size={32} color="#065F46" />
                  </View>
                </View>
              </View>

              <Text style={styles.emptyTitle}>Belum Ada Materi Resmi Terbit</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery.trim()
                  ? `Tidak ada materi atau pengumuman yang sesuai dengan kata kunci "${searchQuery}". Silakan periksa kembali kata kunci Anda.`
                  : selectedCategory !== "Semua"
                  ? `Belum ada materi resmi yang dirilis untuk kategori "${selectedCategory}". Silakan pilih kategori lain atau periksa kembali secara berkala.`
                  : `Admin komunikasi PGE Area Kamojang belum menerbitkan materi atau pengumuman resmi. Seluruh berita, poster agenda, dan dokumentasi program kemitraan akan otomatis tampil di sini saat dirilis.`}
              </Text>

              {/* Action Buttons in Empty State */}
              <View style={styles.emptyActionsRow}>
                <TouchableOpacity
                  style={styles.emptyRefreshBtn}
                  onPress={() => loadData(true)}
                  activeOpacity={0.85}
                >
                  <RefreshCw size={14} color="#FFFFFF" />
                  <Text style={styles.emptyRefreshBtnText}>Segarkan Konten</Text>
                </TouchableOpacity>

                {searchQuery.trim().length > 0 ? (
                  <TouchableOpacity
                    style={styles.emptyResetBtn}
                    onPress={() => {
                      setSearchQuery("");
                      setSelectedCategory("Semua");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyResetBtnText}>Tampilkan Semua</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.emptyCsBtn}
                    onPress={() => {
                      Linking.openURL(
                        "https://wa.me/6281511226089?text=Halo%20Admin%20PGE%20Kamojang%2C%20saya%20ingin%20bertanya%20seputar%20informasi%20resmi%20PGE."
                      ).catch(() => {});
                    }}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#0D7A53" />
                    <Text style={styles.emptyCsBtnText}>Tanya Admin WA</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            filteredItems.map((item) => {
              const catTheme = CATEGORY_COLORS[item.category] || {
                bg: "#ECFDF5",
                text: "#0D7A53",
                border: "#A7F3D0",
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
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: displayMedia }} style={styles.cardImage} resizeMode="cover" />
                      <View style={[styles.floatingCategoryBadge, { backgroundColor: catTheme.bg, borderColor: catTheme.border }]}>
                        <Text style={[styles.floatingCategoryBadgeText, { color: catTheme.text }]}>
                          {item.category}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.cardBody}>
                    <View style={styles.cardMetaRow}>
                      {!displayMedia && (
                        <View style={[styles.categoryBadge, { backgroundColor: catTheme.bg, borderColor: catTheme.border }]}>
                          <Text style={[styles.categoryBadgeText, { color: catTheme.text }]}>{item.category}</Text>
                        </View>
                      )}
                      <View style={styles.dateRow}>
                        <Calendar size={12} color="#0D7A53" />
                        <Text style={styles.cardMetaText}>{formatDate(item.publishedAt)}</Text>
                      </View>
                      {item.eventDate && (
                        <View style={styles.eventDatePill}>
                          <Clock size={11} color="#B45309" />
                          <Text style={styles.eventDatePillText}>{item.eventDate}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {item.description}
                    </Text>

                    {item.location ? (
                      <View style={styles.locRow}>
                        <MapPin size={12} color="#0D7A53" />
                        <Text style={styles.locText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    ) : null}

                    {/* Action Bar */}
                    <View style={styles.actionRow}>
                      {item.posterUrl ? (
                        <TouchableOpacity
                          style={styles.actionBtnSecondary}
                          onPress={() => setSelectedPosterUrl(item.posterUrl || null)}
                          activeOpacity={0.8}
                        >
                          <ImageIcon size={13} color="#0D7A53" />
                          <Text style={styles.actionBtnSecondaryText}>Lihat Poster</Text>
                        </TouchableOpacity>
                      ) : null}

                      {item.videoUrl ? (
                        <TouchableOpacity
                          style={styles.actionBtnVideo}
                          onPress={() => handleOpenVideo(item.videoUrl)}
                          activeOpacity={0.8}
                        >
                          <Video size={13} color="#FFFFFF" />
                          <Text style={styles.actionBtnVideoText}>Tonton Video</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.actionBtnDetail}
                        onPress={() => setSelectedDetailItem(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionBtnDetailText}>Detail Lengkap</Text>
                        <ChevronRight size={14} color="#0D7A53" />
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
          <View style={[styles.detailSafeContainer, { paddingTop: topSafe + 10 }]}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setSelectedDetailItem(null)}
                style={styles.detailBackBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                {selectedDetailItem?.category || "Detail Materi"}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {selectedDetailItem && (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
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

                  <Text style={styles.detailTitle}>{selectedDetailItem.title}</Text>

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

                  {selectedDetailItem.authorOrDept ? (
                    <View style={styles.detailAuthorCard}>
                      <Building2 size={16} color="#0D7A53" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailAuthorLabel}>Dikelola & Diterbitkan Oleh:</Text>
                        <Text style={styles.detailAuthorText}>{selectedDetailItem.authorOrDept}</Text>
                      </View>
                    </View>
                  ) : null}

                  <Text style={styles.detailSectionTitle}>Ringkasan Informasi</Text>
                  <Text style={styles.detailDescription}>{selectedDetailItem.description}</Text>

                  {selectedDetailItem.body ? (
                    <>
                      <Text style={styles.detailSectionTitle}>Rincian Lengkap</Text>
                      <Text style={styles.detailBodyContent}>{selectedDetailItem.body}</Text>
                    </>
                  ) : null}

                  {Array.isArray(selectedDetailItem.tags) && selectedDetailItem.tags.length > 0 ? (
                    <View style={styles.detailTagsWrap}>
                      {selectedDetailItem.tags.map((t, idx) => (
                        <View key={idx} style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>#{t}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

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
          </View>
        </Modal>

        {/* Poster Image Lightbox Modal */}
        <Modal
          visible={Boolean(selectedPosterUrl)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPosterUrl(null)}
        >
          <View style={styles.lightboxBackdrop}>
            <View style={[styles.lightboxSafe, { paddingTop: topSafe + 10 }]}>
              <View style={styles.lightboxHeader}>
                <Text style={styles.lightboxTitle}>Preview Materi Poster Resmi</Text>
                <TouchableOpacity
                  onPress={() => setSelectedPosterUrl(null)}
                  style={styles.lightboxCloseBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ============================================================
  // HERO HEADER
  // ============================================================
  header: {
    backgroundColor: "#064E3B",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 18,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  officialPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(6, 95, 70, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
  },
  officialPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#A7F3D0",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: "#D1FAE5",
    marginTop: 1,
    lineHeight: 16,
  },
  brandTaglineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  brandTaglineText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#A7F3D0",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },

  // Category Chips
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 2,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  categoryChipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  categoryChipTextActive: {
    color: "#064E3B",
    fontWeight: "900",
  },

  // Main list
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

  // Banner Notice Card
  bannerNotice: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerAccentLine: {
    width: 5,
    backgroundColor: "#059669",
  },
  bannerInner: {
    flex: 1,
    padding: 14,
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 6,
  },
  bannerTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bannerTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  bannerNoticeTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#064E3B",
    marginBottom: 4,
    lineHeight: 18,
  },
  bannerNoticeDesc: {
    fontSize: 11.5,
    color: "#047857",
    lineHeight: 17,
    textAlign: "justify",
  },

  // ============================================================
  // EMPTY STATE CARD
  // ============================================================
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 4,
  },
  emptyIconOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIconMiddleRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconInnerRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "justify",
    lineHeight: 18,
    maxWidth: 340,
    marginBottom: 20,
  },
  emptyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emptyRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7A53",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyRefreshBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyResetBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  emptyResetBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    gap: 6,
  },
  emptyCsBtnText: {
    color: "#0D7A53",
    fontSize: 12,
    fontWeight: "800",
  },

  // ============================================================
  // CARD CONTENT ITEM (When published)
  // ============================================================
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  cardImageContainer: {
    width: "100%",
    height: 195,
    backgroundColor: "#0F172A",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  floatingCategoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingCategoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cardBody: {
    padding: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  cardMetaText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  eventDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventDatePillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#B45309",
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
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
    textAlign: "justify",
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  locText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexWrap: "wrap",
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  actionBtnVideo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DC2626",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnVideoText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionBtnDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  actionBtnDetailText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },

  // ============================================================
  // DETAIL MODAL
  // ============================================================
  detailSafeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    fontWeight: "800",
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
    fontWeight: "900",
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
    borderRadius: 14,
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
    marginTop: 14,
    marginBottom: 6,
  },
  detailDescription: {
    fontSize: 13.5,
    color: "#334155",
    lineHeight: 21,
    marginBottom: 10,
    textAlign: "justify",
  },
  detailBodyContent: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 21,
    marginBottom: 14,
    textAlign: "justify",
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

  // ============================================================
  // LIGHTBOX
  // ============================================================
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
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
  },
  lightboxTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  lightboxCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
