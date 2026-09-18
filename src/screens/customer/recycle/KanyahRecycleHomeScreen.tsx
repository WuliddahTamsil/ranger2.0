import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  Recycle,
  Leaf,
  WalletCards,
  ArrowUpRight,
  Clock,
  MapPin,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  ArrowLeft,
  Truck,
  Scale,
  CheckCircle2,
  TreeDeciduous,
  Wind,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useRecycle } from "../../../context/RecycleContext";
import {
  getWasteBanks,
  getCustomerDeposits,
} from "../../../services/recycleService";
import { WasteBankUI, WasteDepositUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

export const KanyahRecycleHomeScreen: React.FC<Props> = ({ navigate, authAccount }) => {
  const { wallet, refreshWallet, walletLoading, setSelectedBank, setSelectedDeposit } = useRecycle();
  const [nearbyBanks, setNearbyBanks] = useState<WasteBankUI[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<WasteDepositUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [banksRes, depositsRes] = await Promise.all([
        getWasteBanks(-7.15, 107.8), // Kamojang coordinates
        authAccount?.id ? getCustomerDeposits(authAccount.id) : Promise.resolve({ success: false, data: [] }),
      ]);

      if (banksRes.success && Array.isArray(banksRes.data)) {
        setNearbyBanks(banksRes.data.slice(0, 3));
      }
      if (depositsRes.success && Array.isArray(depositsRes.data)) {
        setRecentDeposits(depositsRes.data.slice(0, 3));
      }
    } catch (err) {
      console.error("KanyahRecycleHomeScreen loadData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshWallet();
  }, [authAccount?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshWallet();
    loadData();
  };

  const balance = wallet?.balancePoint || 0;
  const totalKg = wallet?.totalKgDeposited || 0;
  const co2Kg = wallet?.totalCo2ReductionKg || (totalKg * 1.85);
  const treesCount = Math.floor(co2Kg / 22);

  // Active deposit in progress (if any)
  const activeDeposit = recentDeposits.find(
    (d) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(d.status)
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <View style={styles.titleRow}>
            <Recycle size={20} color="#15803D" />
            <Text style={styles.headerTitle}>KANYAAH RECYCLE</Text>
          </View>
          <Text style={styles.headerSubtitle}>Ubah sampah jadi manfaat</Text>
        </View>
        <TouchableOpacity
          style={styles.walletHeaderBtn}
          onPress={() => navigate("c_recycle_wallet")}
          activeOpacity={0.7}
        >
          <WalletCards size={18} color="#15803D" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#15803D"]} />}
      >
        {/* Active Deposit Notification Banner */}
        {activeDeposit && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => {
              setSelectedDeposit(activeDeposit);
              if (activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION") {
                navigate("c_recycle_weighing_result");
              } else {
                navigate("c_recycle_tracking");
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.activeBannerLeft}>
              <Scale size={20} color="#0D9488" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activeBannerTitle}>
                  {activeDeposit.status === "WAITING_CUSTOMER_CONFIRMATION"
                    ? "Timbangan Menunggu Konfirmasi!"
                    : "Setoran Sedang Berjalan"}
                </Text>
                <Text style={styles.activeBannerSub}>
                  Kode: {activeDeposit.depositCode} • Ketuk untuk lihat detail
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#0D9488" />
          </TouchableOpacity>
        )}

        {/* Hero Card: Saldo GEOVERSE Point & Setoran */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroBalanceLabel}>Saldo GEOVERSE Point</Text>
              <View style={styles.heroBalanceRow}>
                <Sparkles size={22} color="#FBBF24" />
                <Text style={styles.heroBalanceVal}>{balance.toLocaleString("id-ID")}</Text>
                <Text style={styles.heroPointUnit}>Point</Text>
              </View>
              <Text style={styles.heroRupiahVal}>≈ {rp(balance)} (1 Point = Rp 1)</Text>
            </View>
            <View style={styles.heroBadgeKg}>
              <Leaf size={14} color="#15803D" />
              <Text style={styles.heroBadgeKgText}>{totalKg.toFixed(1)} kg</Text>
              <Text style={styles.heroBadgeKgSub}>Sampah Disetor</Text>
            </View>
          </View>

          {/* Quick Action Shortcuts */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => navigate("c_recycle_banks")}
              activeOpacity={0.8}
            >
              <Recycle size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnTextPrimary}>Setor Sampah</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => navigate("c_recycle_redemption")}
              activeOpacity={0.8}
            >
              <ArrowUpRight size={18} color="#15803D" />
              <Text style={styles.actionBtnTextSecondary}>Tukar Point</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => navigate("c_recycle_ledger")}
              activeOpacity={0.8}
            >
              <Clock size={18} color="#15803D" />
              <Text style={styles.actionBtnTextSecondary}>Riwayat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Environmental Impact Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Dampak Lingkungan Anda</Text>
          <View style={styles.pillGreen}>
            <Leaf size={12} color="#15803D" />
            <Text style={styles.pillGreenText}>Eco Hero</Text>
          </View>
        </View>

        <View style={styles.impactGrid}>
          <View style={[styles.impactCard, { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" }]}>
            <View style={[styles.impactIconBg, { backgroundColor: "#DCFCE7" }]}>
              <Wind size={20} color="#16A34A" />
            </View>
            <Text style={styles.impactValue}>{co2Kg.toFixed(1)} kg</Text>
            <Text style={styles.impactLabel}>Emisi CO₂ Dicegah</Text>
          </View>

          <View style={[styles.impactCard, { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" }]}>
            <View style={[styles.impactIconBg, { backgroundColor: "#FEF08A" }]}>
              <TreeDeciduous size={20} color="#CA8A04" />
            </View>
            <Text style={styles.impactValue}>{treesCount}</Text>
            <Text style={styles.impactLabel}>Pohon Diselamatkan</Text>
          </View>

          <View style={[styles.impactCard, { backgroundColor: "#F0F9FF", borderColor: "#E0F2FE" }]}>
            <View style={[styles.impactIconBg, { backgroundColor: "#E0F2FE" }]}>
              <Scale size={20} color="#0284C7" />
            </View>
            <Text style={styles.impactValue}>{totalKg.toFixed(1)} kg</Text>
            <Text style={styles.impactLabel}>Diverted dari TPA</Text>
          </View>
        </View>

        {/* Flow Cara Kerja Kanyah Recycle */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Cara Kerja Kanyah Recycle</Text>
          <View style={styles.guideSteps}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Pilih Bank Sampah & kategori</Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Antar langsung / Minta Pickup</Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Timbang & Terima Point</Text>
            </View>
          </View>
        </View>

        {/* Nearby Waste Banks */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Bank Sampah Terdekat</Text>
          <TouchableOpacity onPress={() => navigate("c_recycle_banks")}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#15803D" style={{ marginVertical: 20 }} />
        ) : nearbyBanks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Recycle size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada Bank Sampah di sekitarmu</Text>
          </View>
        ) : (
          nearbyBanks.map((bank) => (
            <TouchableOpacity
              key={bank._id}
              style={styles.bankCard}
              onPress={() => {
                setSelectedBank(bank);
                navigate("c_recycle_bank_detail");
              }}
              activeOpacity={0.8}
            >
              <View style={styles.bankCardHeader}>
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{bank.name}</Text>
                  <View style={styles.bankMetaRow}>
                    <MapPin size={13} color="#6B7280" />
                    <Text style={styles.bankDistance}>
                      {bank.distanceKm ? `${bank.distanceKm.toFixed(1)} km` : "Terdekat"}
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Clock size={13} color="#6B7280" />
                    <Text style={styles.bankHours}>{bank.openingHours}</Text>
                  </View>
                </View>
                {bank.acceptsPickup && (
                  <View style={styles.pickupBadge}>
                    <Truck size={12} color="#047857" />
                    <Text style={styles.pickupBadgeText}>Pickup</Text>
                  </View>
                )}
              </View>

              <View style={styles.bankBottomRow}>
                <View style={styles.bankAddressCol}>
                  <Text style={styles.bankAddress} numberOfLines={1}>
                    {bank.address}
                  </Text>
                </View>
                <View style={styles.btnDetailMini}>
                  <Text style={styles.btnDetailMiniText}>Detail</Text>
                  <ChevronRight size={14} color="#15803D" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent Transactions / Riwayat */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Riwayat Terakhir</Text>
          <TouchableOpacity onPress={() => navigate("c_recycle_ledger")}>
            <Text style={styles.seeAllText}>Buku Tabungan</Text>
          </TouchableOpacity>
        </View>

        {recentDeposits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Clock size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada riwayat setoran sampah</Text>
          </View>
        ) : (
          recentDeposits.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.depositRow}
              onPress={() => {
                setSelectedDeposit(item);
                if (item.status === "WAITING_CUSTOMER_CONFIRMATION") {
                  navigate("c_recycle_weighing_result");
                } else {
                  navigate("c_recycle_tracking");
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.depositIconBg, { backgroundColor: item.finalPoint > 0 ? "#DCFCE7" : "#F3F4F6" }]}>
                <Recycle size={18} color={item.finalPoint > 0 ? "#15803D" : "#6B7280"} />
              </View>
              <View style={styles.depositCol}>
                <Text style={styles.depositCode}>{item.depositCode}</Text>
                <Text style={styles.depositMeta}>
                  {item.method === "PICKUP" ? "Pickup" : "Antar Langsung"} • {new Date(item.createdAt).toLocaleDateString("id-ID")}
                </Text>
              </View>
              <View style={styles.depositRight}>
                <Text style={[styles.depositPoint, { color: item.finalPoint > 0 ? "#15803D" : "#4B5563" }]}>
                  {item.finalPoint > 0 ? `+${item.finalPoint.toLocaleString("id-ID")} Pts` : item.status}
                </Text>
                <ChevronRight size={14} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  walletHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  activeBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F766E",
  },
  activeBannerSub: {
    fontSize: 11,
    color: "#115E59",
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: "#1B7A4E",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#1B7A4E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroGlow: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroBalanceLabel: {
    fontSize: 12,
    color: "#A7F3D0",
    fontWeight: "600",
    marginBottom: 4,
  },
  heroBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBalanceVal: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroPointUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FDE047",
  },
  heroRupiahVal: {
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 2,
  },
  heroBadgeKg: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  heroBadgeKgText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#15803D",
    marginTop: 2,
  },
  heroBadgeKgSub: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: "#F59E0B",
  },
  actionBtnSecondary: {
    backgroundColor: "#FFFFFF",
  },
  actionBtnTextPrimary: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionBtnTextSecondary: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  pillGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  pillGreenText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  impactGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  impactCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  impactIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  impactValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  impactLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  guideSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#15803D",
  },
  stepText: {
    fontSize: 10,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 13,
  },
  stepDivider: {
    width: 16,
    height: 1,
    backgroundColor: "#D1D5DB",
    marginTop: -16,
  },
  bankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bankCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  bankMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  bankDistance: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
  metaDot: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  bankHours: {
    fontSize: 11,
    color: "#6B7280",
  },
  pickupBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pickupBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  bankBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  bankAddressCol: {
    flex: 1,
    marginRight: 10,
  },
  bankAddress: {
    fontSize: 11,
    color: "#6B7280",
  },
  btnDetailMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  btnDetailMiniText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  depositRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  depositIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  depositCol: {
    flex: 1,
  },
  depositCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  depositMeta: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  depositRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  depositPoint: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
});
