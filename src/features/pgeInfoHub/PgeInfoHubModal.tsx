import React, { useState, useMemo, useEffect } from "react";
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
} from "lucide-react-native";
import { PgeInfoHubCategory, PgeInfoHubItem } from "./types";
import { INITIAL_PGE_INFO_HUB_ITEMS } from "./data";
import { getApiUrl } from "../../services/api";

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
];

export const PgeInfoHubModal: React.FC<PgeInfoHubModalProps> = ({
  visible,
  onClose,
  initialCategory = "Semua",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<"Semua" | PgeInfoHubCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosterUrl, setSelectedPosterUrl] = useState<string | null>(null);
  const [items, setItems] = useState<PgeInfoHubItem[]>(INITIAL_PGE_INFO_HUB_ITEMS);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    const fetchLiveItems = async () => {
      try {
        const url = getApiUrl("/pge-info-hub");
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0 && isMounted) {
            setItems(json.data);
          }
        }
      } catch (err) {
        // Graceful offline fallback
        console.log("PGE Info Hub live fetch note: using initial items fallback");
      }
    };
    fetchLiveItems();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.isPublished) return false;
      if (selectedCategory !== "Semua" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchDept = item.authorOrDept?.toLowerCase().includes(query);
        const matchTag = item.tags?.some((t) => t.toLowerCase().includes(query));
        return matchTitle || matchDesc || matchDept || matchTag;
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

  const formatDate = (isoString: string) => {
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
            filteredItems.map((item) => (
              <View key={item.id} style={styles.card}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                ) : null}

                <View style={styles.cardBody}>
                  {/* Category Badge & Date */}
                  <View style={styles.badgeRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Calendar size={12} color="#64748B" />
                      <Text style={styles.dateText}>{formatDate(item.publishedAt)}</Text>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.description}</Text>

                  {/* Metadata: Location / Dept */}
                  <View style={styles.metaRow}>
                    {item.location && (
                      <View style={styles.metaItem}>
                        <MapPin size={12} color="#0D7A53" />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                    {item.eventDate && (
                      <View style={styles.metaItem}>
                        <Sparkles size={12} color="#D97706" />
                        <Text style={[styles.metaText, { color: "#D97706", fontWeight: "600" }]}>
                          {item.eventDate}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons: Video & Poster */}
                  <View style={styles.actionRow}>
                    {item.posterUrl && (
                      <TouchableOpacity
                        style={styles.actionBtnSecondary}
                        onPress={() => setSelectedPosterUrl(item.posterUrl || null)}
                        activeOpacity={0.7}
                      >
                        <ImageIcon size={15} color="#0D7A53" />
                        <Text style={styles.actionBtnSecondaryText}>Lihat Poster</Text>
                      </TouchableOpacity>
                    )}

                    {item.videoUrl && (
                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => handleOpenVideo(item.videoUrl)}
                        activeOpacity={0.8}
                      >
                        <Video size={15} color="#FFFFFF" />
                        <Text style={styles.actionBtnPrimaryText}>Tonton Video</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

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
    fontWeight: "700",
    color: "#0F172A",
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
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 10,
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
  },
  bannerNotice: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
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
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#E2E8F0",
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
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
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
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0D7A53",
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0D7A53",
  },
  resetFilterBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },
  lightboxSafe: {
    flex: 1,
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  lightboxTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
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
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  lightboxFooterText: {
    fontSize: 11,
    color: "#CBD5E1",
  },
});
