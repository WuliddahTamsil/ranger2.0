/**
 * GeoDirectHomeScreen.tsx
 * Customer Catalog Screen for PGE Geo Direct Use
 * Features 3 Geothermal Facilities:
 * 1. Geothermal Dryhouse (Available / Tersedia - Primary Active Service)
 * 2. Geothermal Dehydrator (Coming Soon - In Research & Development)
 * 3. Geothermal Dry Tube (Coming Soon - In Research & Development)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Modal,
} from "react-native";
import {
  Flame,
  ArrowLeft,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Clock,
  Coins,
  Sparkles,
  Info,
  X,
  Calculator,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchEquipments,
  fetchCustomerDpBalance,
  GeoDirectEquipment,
} from "../../../services/geoDirectService";
import { rp } from "../../../utils/formatters";

interface GeoDirectHomeScreenProps extends Nav {
  authAccount?: any;
}

export const GeoDirectHomeScreen: React.FC<GeoDirectHomeScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const [equipments, setEquipments] = useState<GeoDirectEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dpBalance, setDpBalance] = useState<number>(0);

  // Coming Soon Modal State
  const [comingSoonModal, setComingSoonModal] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [list, balData] = await Promise.all([
        fetchEquipments(),
        authAccount ? fetchCustomerDpBalance().catch(() => ({ balance: 0, history: [] })) : Promise.resolve({ balance: 0, history: [] }),
      ]);

      // Normalize list to ensure the 3 primary facilities are present
      let items = Array.isArray(list) ? [...list] : [];
      if (items.length === 0) {
        items = [
          {
            _id: "EQ-01",
            code: "EQ-01",
            name: "Geothermal Dry House",
            facilityType: "DRYHOUSE",
            comingSoon: false,
            isAvailable: true,
            isActive: true,
            description: "Layanan pemanfaatan fasilitas pengeringan berbasis geothermal yang memungkinkan petani, koperasi, dan pelaku UMKM mengakses teknologi pengeringan secara praktis, terukur, dan efisien melalui pemesanan digital.",
            specification: "Kapasitas 4 unit dryhouse, suhu terkontrol 40-50°C, pemantauan kadar air digital presisi.",
            function: "Pengeringan hasil panen komoditas kopi cherry, biji kakao, dan komoditas perkebunan.",
            capacity: "4 Unit • Maksimal 6.000 kg / batch (Min. 100 kg)",
            rentalTerms: "1. Pemesanan melalui sistem GEOVERSE.\n2. Verifikasi DP 30%.\n3. Mematuhi SOP penerimaan bahan baku.",
            basePrice: 1000,
            pricingUnit: "per_kg",
            dpPercentage: 30,
            pricingFormulaType: "DRYHOUSE_TIERED",
          },
          {
            _id: "EQ-02",
            code: "EQ-02",
            name: "Geothermal Dehydrator",
            facilityType: "DEHYDRATOR",
            comingSoon: true,
            isAvailable: false,
            isActive: true,
            description: "Fasilitas dehidrasi suhu rendah berbasis panas bumi untuk buah, sayuran, dan komoditas hortikultura bernilai tinggi.",
            specification: "Sistem tray berputar, kontrol kelembaban otomatis, sirkulasi termal tertutup.",
            function: "Dehidrasi buah kering, keripik sehat, dan bahan baku herbal herbal.",
            capacity: "Tahap Pengembangan & Validasi Riset",
            rentalTerms: "Layanan masih dalam tahap riset.",
            basePrice: 0,
            pricingUnit: "per_batch",
            dpPercentage: 30,
            pricingFormulaType: "STANDARD_DAILY",
          },
          {
            _id: "EQ-03",
            code: "EQ-03",
            name: "Geothermal Dry Tube",
            facilityType: "DRY_TUBE",
            comingSoon: true,
            isAvailable: false,
            isActive: true,
            description: "Teknologi pengeringan tubular aliran kontinu untuk biji-bijian, rempah, dan komoditas curah dengan efisiensi termal tinggi.",
            specification: "Tabung penghantar panas bumi spiral terisolasi dengan sirkulasi udara bertekanan.",
            function: "Pengeringan rempah, jagung, dan biji-bijian curah.",
            capacity: "Tahap Pengembangan & Validasi Riset",
            rentalTerms: "Layanan masih dalam tahap riset.",
            basePrice: 0,
            pricingUnit: "per_batch",
            dpPercentage: 30,
            pricingFormulaType: "STANDARD_DAILY",
          },
        ];
      }
      setEquipments(items);
      setDpBalance(balData.balance || 0);
    } catch (err) {
      console.warn("Failed to load equipments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authAccount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCardPress = (item: GeoDirectEquipment) => {
    if (item.comingSoon || !item.isAvailable) {
      setComingSoonModal({
        open: true,
        title: item.name,
        description:
          "Fasilitas ini saat ini masih dalam tahap riset dan pengembangan oleh tim PGE Kamojang. Layanan ini akan segera hadir untuk pemanfaatan langsung energi panas bumi.",
      });
    } else {
      navigate("c_geo_direct_detail", { equipmentId: item._id });
    }
  };

  const getEquipmentIllustration = (item: GeoDirectEquipment) => {
    if (item.imageUrl) return { uri: item.imageUrl };
    if (item.facilityType === "DRYHOUSE" || item.code === "EQ-01") {
      return require("../../../../assets/geo-direct.png");
    }
    if (item.facilityType === "DEHYDRATOR" || item.code === "EQ-02") {
      return require("../../../../assets/kanyaah-mart.png");
    }
    return require("../../../../assets/kanyaah-homestay.png");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>Geo Direct Use</Text>
          <Text style={styles.topBarSubtitle}>PGE Center of Excellence Kamojang</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigate("c_geo_direct_history")}
          style={styles.historyBtn}
          activeOpacity={0.75}
        >
          <Clock size={16} color="#0D7A53" />
          <Text style={styles.historyBtnText}>Riwayat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0D7A53"]} />}
      >
        {/* CoE Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Flame size={12} color="#0D7A53" />
              <Text style={styles.heroBadgeText}>PGE CENTER OF EXCELLENCE</Text>
            </View>
            <View style={styles.heroFacilityPill}>
              <ShieldCheck size={12} color="#FFFFFF" />
              <Text style={styles.heroFacilityText}>Area Kamojang</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Fasilitas Pemanfaatan Langsung Panas Bumi</Text>
          <Text style={styles.heroDesc}>
            Akses fasilitas teknologi pengeringan berbasis energi geothermal untuk meningkatkan mutu,
            efisiensi pengolahan hasil pertanian, serta hilirisasi produk UMKM dan kelompok tani.
          </Text>
        </View>

        {/* DP Credit Balance Banner (If Available) */}
        {dpBalance > 0 && (
          <TouchableOpacity
            style={styles.dpBalanceCard}
            onPress={() => navigate("c_geo_direct_history")}
            activeOpacity={0.85}
          >
            <View style={styles.dpBalanceIconCircle}>
              <Coins size={20} color="#D97706" />
            </View>
            <View style={styles.dpBalanceTextBox}>
              <Text style={styles.dpBalanceLabel}>Saldo Deposit DP Tersedia</Text>
              <Text style={styles.dpBalanceValue}>{rp(dpBalance)}</Text>
              <Text style={styles.dpBalanceHint}>
                Dapat langsung digunakan sebagai potongan pembayaran DP pemesanan Dryhouse berikutnya.
              </Text>
            </View>
            <ChevronRight size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Catalog Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Pilih Fasilitas Geothermal</Text>
            <Text style={styles.sectionSubtitle}>
              Fasilitas inovasi energi terbarukan PGE Kamojang
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{equipments.length} Fasilitas</Text>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={styles.loadingText}>Memuat fasilitas PGE CoE...</Text>
          </View>
        )}

        {/* Equipment Cards List */}
        {!loading && (
          <View style={styles.cardList}>
            {equipments.map((item) => {
              const isDryhouse = item.facilityType === "DRYHOUSE" || item.code === "EQ-01";
              const isComingSoon = item.comingSoon || !item.isAvailable;

              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.card, isComingSoon && styles.cardComingSoon]}
                  onPress={() => handleCardPress(item)}
                  activeOpacity={0.88}
                >
                  {/* Card Header & Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardCodeBadge}>
                      <Text style={styles.cardCodeText}>{item.code}</Text>
                    </View>
                    {isComingSoon ? (
                      <View style={styles.comingSoonBadge}>
                        <Clock size={11} color="#B45309" />
                        <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                      </View>
                    ) : (
                      <View style={styles.availBadgeActive}>
                        <View style={styles.statusDotGreen} />
                        <Text style={styles.availTextActive}>Tersedia / Available</Text>
                      </View>
                    )}
                  </View>

                  {/* Profile Row: Facility Icon & Name */}
                  <View style={styles.cardProfileRow}>
                    <View style={[styles.imgWrap, isComingSoon && styles.imgWrapMuted]}>
                      <Image
                        source={getEquipmentIllustration(item)}
                        style={styles.equipmentImg}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.cardTitleBox}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <View style={styles.cardFacilityTypeRow}>
                        <Flame size={11} color={isComingSoon ? "#64748B" : "#0D7A53"} />
                        <Text
                          style={[
                            styles.cardFacilityTypeText,
                            isComingSoon && styles.cardFacilityTypeTextMuted,
                          ]}
                          numberOfLines={1}
                        >
                          {isDryhouse ? "Pengeringan hasil tani berbasis energi panas bumi." : "PGE Center of Excellence"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Body Content: Coming Soon vs Tersedia */}
                  {isComingSoon ? (
                    <View style={styles.comingSoonDevBox}>
                      <Clock size={14} color="#B45309" />
                      <Text style={styles.comingSoonDevText}>
                        Masih dalam tahap riset & pengembangan oleh tim PGE Kamojang.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Full-Width Facility Description */}
                      <Text style={styles.cardDesc}>
                        {item.description}
                      </Text>

                      {/* Full-Width Capacity Badge */}
                      <View style={styles.capacityCardBox}>
                        <Layers size={13} color="#0D7A53" />
                        <Text style={styles.capacityMainText} numberOfLines={1}>
                          {item.capacity || "4 Unit • Maksimal 6.000 kg / batch"}
                        </Text>
                      </View>

                      {/* Pricing Tag */}
                      <View style={styles.priceContainer}>
                        <View style={styles.priceTopRow}>
                          <Text style={styles.priceLabel}>Simulasi Tarif Sewa:</Text>
                          <View style={styles.priceRow}>
                            <Text style={styles.priceValue}>Rp 500 – Rp 1.000</Text>
                            <Text style={styles.priceUnit}>/kg</Text>
                          </View>
                        </View>
                        <View style={styles.discountRow}>
                          <Sparkles size={12} color="#047857" />
                          <Text style={styles.discountHighlight}>
                            Diskon okupansi s.d. 50% sesuai kuota
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Card Action Buttons */}
                  <View style={styles.cardFooter}>
                    {isDryhouse ? (
                      <TouchableOpacity
                        style={styles.btnRent}
                        onPress={() => navigate("c_geo_direct_detail", { equipmentId: item._id })}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.btnRentText}>Selengkapnya</Text>
                        <ChevronRight size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.btnComingSoon}
                        onPress={() => handleCardPress(item)}
                        activeOpacity={0.8}
                      >
                        <Info size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.btnComingSoonText}>Informasi Fasilitas & Riset</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Friendly Coming Soon Modal */}
      <Modal
        visible={comingSoonModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setComingSoonModal({ open: false, title: "", description: "" })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Sparkles size={24} color="#D97706" />
              </View>
              <TouchableOpacity
                onPress={() => setComingSoonModal({ open: false, title: "", description: "" })}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBadgeText}>TAHAP PENGEMBANGAN</Text>
            <Text style={styles.modalTitle}>{comingSoonModal.title}</Text>
            <Text style={styles.modalDescription}>{comingSoonModal.description}</Text>

            <View style={styles.modalCallout}>
              <Info size={16} color="#0D7A53" />
              <Text style={styles.modalCalloutText}>
                Fasilitas ini sedang disiapkan oleh PGE Center of Excellence Kamojang. Untuk kebutuhan
                pengeringan kopi saat ini, Anda dapat langsung memanfaatkan layanan{" "}
                <Text style={{ fontWeight: "700" }}>Geothermal Dryhouse</Text> yang telah beroperasi penuh.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => setComingSoonModal({ open: false, title: "", description: "" })}
              activeOpacity={0.85}
            >
              <Text style={styles.modalActionBtnText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  topBarTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
    letterSpacing: 0.5,
  },
  heroFacilityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroFacilityText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 12,
    color: "#E2E8F0",
    lineHeight: 18,
  },
  dpBalanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  dpBalanceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dpBalanceTextBox: {
    flex: 1,
  },
  dpBalanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  dpBalanceValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#B45309",
    marginTop: 2,
  },
  dpBalanceHint: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  countBadge: {
    flexShrink: 0,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748B",
  },
  cardList: {
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardComingSoon: {
    backgroundColor: "#FAFBFD",
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardCodeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  availBadgeActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  availTextActive: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  cardProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  imgWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    flexShrink: 0,
  },
  imgWrapMuted: {
    opacity: 0.75,
    backgroundColor: "#F1F5F9",
  },
  equipmentImg: {
    width: "80%",
    height: "80%",
  },
  cardTitleBox: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  cardName: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  cardFacilityTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardFacilityTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0D7A53",
    flex: 1,
    letterSpacing: -0.2,
    lineHeight: 14,
  },
  cardFacilityTypeTextMuted: {
    color: "#64748B",
  },
  cardDesc: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  capacityCardBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 10,
    maxWidth: "100%",
  },
  capacityCardBoxMuted: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  capacityMainText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
    flexShrink: 1,
  },
  capacityMainTextMuted: {
    color: "#64748B",
  },
  priceContainer: {
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  priceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0D7A53",
  },
  priceUnit: {
    fontSize: 11,
    color: "#065F46",
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  discountHighlight: {
    fontSize: 10.5,
    color: "#047857",
    fontWeight: "600",
    flexShrink: 1,
  },
  comingSoonDevBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 4,
    marginBottom: 4,
  },
  comingSoonDevText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
    lineHeight: 18,
  },
  comingSoonInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  comingSoonInfoText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnDetail: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#EAF8F0",
    borderRadius: 8,
  },
  btnDetailText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  btnRent: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 11,
    backgroundColor: "#0D7A53",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnComingSoon: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  btnComingSoonText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  modalCallout: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 18,
  },
  modalCalloutText: {
    flex: 1,
    fontSize: 12,
    color: "#065F46",
    lineHeight: 17,
  },
  modalActionBtn: {
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
