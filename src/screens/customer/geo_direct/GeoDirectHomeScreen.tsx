/**
 * GeoDirectHomeScreen.tsx
 * Customer Catalog Screen for PGE Geo Direct Use
 * Features 4 PGE CoE Equipments (Equipment 01 - 04)
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
} from "react-native";
import {
  Flame,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Info,
  Clock,
  Coins,
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [list, balData] = await Promise.all([
        fetchEquipments(),
        authAccount ? fetchCustomerDpBalance().catch(() => ({ balance: 0, history: [] })) : Promise.resolve({ balance: 0, history: [] }),
      ]);
      setEquipments(list);
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

  const getEquipmentPlaceholderIllustration = (code: string) => {
    switch (code) {
      case "EQ-01":
        return require("../../../../assets/kanyaah-mart.png");
      case "EQ-02":
        return require("../../../../assets/kanyaah-homestay.png");
      case "EQ-03":
        return require("../../../../assets/kanyaah-point.png");
      default:
        return require("../../../../assets/kanyaah-more.png");
    }
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
          <Text style={styles.heroTitle}>Layanan Sewa Peralatan Direct Use Panas Bumi</Text>
          <Text style={styles.heroDesc}>
            Manfaatkan langsung energi panas bumi untuk efisiensi pengeringan, produksi hasil tani, komoditas pangan,
            dan riset operasional berkualitas tinggi.
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
                Dapat langsung digunakan sebagai potongan DP pengajuan baru / revisi.
              </Text>
            </View>
            <ChevronRight size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Catalog Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Katalog Alat Tersedia</Text>
            <Text style={styles.sectionSubtitle}>Pilih alat sesuai kebutuhan pengolahan & durasi Anda</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{equipments.length} Alat</Text>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={styles.loadingText}>Memuat katalog alat PGE CoE...</Text>
          </View>
        )}

        {/* Equipment Cards List */}
        {!loading && (
          <View style={styles.cardList}>
            {equipments.map((item) => {
              const hasConfiguredPrice = item.basePrice > 0;

              return (
                <View key={item._id} style={styles.card}>
                  {/* Card Header & Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardCodeBadge}>
                      <Text style={styles.cardCodeText}>{item.code}</Text>
                    </View>
                    <View
                      style={[
                        styles.availBadge,
                        item.isAvailable ? styles.availBadgeActive : styles.availBadgeInactive,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.isAvailable ? "#16A34A" : "#DC2626" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.availText,
                          { color: item.isAvailable ? "#15803D" : "#991B1B" },
                        ]}
                      >
                        {item.isAvailable ? "Tersedia" : "Sedang Digunakan"}
                      </Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <View style={styles.cardBody}>
                    <View style={styles.imgWrap}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.equipmentImg} resizeMode="cover" />
                      ) : (
                        <Image
                          source={getEquipmentPlaceholderIllustration(item.code)}
                          style={styles.equipmentImg}
                          resizeMode="contain"
                        />
                      )}
                    </View>

                    <View style={styles.cardMainInfo}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.description}
                      </Text>

                      {/* Pricing Tag */}
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Biaya Sewa Pokok:</Text>
                        {hasConfiguredPrice ? (
                          <View style={styles.priceRow}>
                            <Text style={styles.priceValue}>{rp(item.basePrice)}</Text>
                            <Text style={styles.priceUnit}>/{item.pricingUnit.replace("per_", "")}</Text>
                          </View>
                        ) : (
                          <View style={styles.waitingPriceTag}>
                            <Info size={12} color="#D97706" />
                            <Text style={styles.waitingPriceText}>Menunggu konfigurasi PGE</Text>
                          </View>
                        )}
                        <Text style={styles.dpPercentInfo}>Ketentuan DP: {item.dpPercentage}%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Action Buttons */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.btnDetail}
                      onPress={() => navigate("c_geo_direct_detail", { equipmentId: item._id })}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.btnDetailText}>Lihat Detail</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnRent, !item.isAvailable && styles.btnDisabled]}
                      onPress={() => {
                        if (item.isAvailable) {
                          navigate("c_geo_direct_booking", { equipmentId: item._id });
                        }
                      }}
                      disabled={!item.isAvailable}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnRentText}>Sewa Sekarang</Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    alignItems: "flex-end",
    marginBottom: 12,
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
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  availBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  availBadgeInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    flexDirection: "row",
    gap: 14,
  },
  imgWrap: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  equipmentImg: {
    width: "100%",
    height: "100%",
  },
  cardMainInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 8,
  },
  priceContainer: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
  },
  priceLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 2,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0D7A53",
  },
  priceUnit: {
    fontSize: 11,
    color: "#64748B",
  },
  waitingPriceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  waitingPriceText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
  },
  dpPercentInfo: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnDetail: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDetailText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  btnRent: {
    flex: 1.3,
    flexDirection: "row",
    gap: 4,
    paddingVertical: 10,
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
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
});

