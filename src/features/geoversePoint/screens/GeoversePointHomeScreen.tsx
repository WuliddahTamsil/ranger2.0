import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Bell, Sparkles, User, RefreshCw, Ticket } from "lucide-react-native";
import { Nav } from "../../../types";
import { useGeoversePoint } from "../hooks/useGeoversePoint";
import { GeoversePointHeroCard } from "../components/GeoversePointHeroCard";
import { GeoversePointQuickActions } from "../components/GeoversePointQuickActions";
import { GeoversePointContributionBanner } from "../components/GeoversePointContributionBanner";
import { GeoversePointImpactCard } from "../components/GeoversePointImpactCard";
import { GeoversePointRecentActivity } from "../components/GeoversePointRecentActivity";
import { GeoversePointVoucherCard } from "../components/GeoversePointVoucherCard";
import { GeoversePointSkeleton } from "../components/GeoversePointSkeleton";
import { PointVoucherUI } from "../types/pointTypes";
import { createRedemption } from "../services/geoversePointService";

export const GeoversePointHomeScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isTabletOrDesktop = width >= 768;

  const {
    wallet,
    walletLoading,
    walletError,
    refreshWallet,
    ledger,
    ledgerLoading,
    refreshLedger,
    availableVouchers,
    vouchersLoading,
    refreshVouchers,
    refreshRedemptions,
    pointToRupiah,
    formatPoint,
    formatRupiah,
  } = useGeoversePoint();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [redeemingVoucherId, setRedeemingVoucherId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refreshWallet(),
      refreshLedger({ limit: 10 }),
      refreshVouchers(),
      refreshRedemptions(),
    ]);
    setRefreshing(false);
  };

  // Automatically fetch and sync points whenever screen mounts or is displayed
  useEffect(() => {
    onRefresh();

    // Auto-refresh interval while on the point wallet screen
    const interval = setInterval(() => {
      refreshWallet().catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleRedeemVoucher = async (voucher: PointVoucherUI) => {
    const currentPoints = wallet?.balancePoint || 0;
    if (currentPoints < voucher.pointsCost) {
      Alert.alert(
        "Poin Tidak Cukup",
        `Voucher ini membutuhkan ${formatPoint(voucher.pointsCost)}. Saldo Anda saat ini ${formatPoint(currentPoints)}.`
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Tukar Voucher",
      `Tukarkan ${formatPoint(voucher.pointsCost)} untuk "${voucher.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tukarkan",
          onPress: async () => {
            setRedeemingVoucherId(voucher._id);
            try {
              const res = await createRedemption(
                {
                  type: "VOUCHER",
                  points: voucher.pointsCost,
                  voucherId: voucher._id,
                },
                `vchr-claim-${Date.now()}`
              );

              if (res.success) {
                Alert.alert(
                  "Voucher Berhasil Ditukar! 🎉",
                  `Kode voucher: ${res.data?.voucherCode || "Lihat di riwayat"}. Anda dapat menggunakannya saat checkout.`,
                  [
                    {
                      text: "Lihat Riwayat",
                      onPress: () => navigate("c_point_ledger"),
                    },
                    { text: "OK" },
                  ]
                );
                await refreshWallet();
                await refreshVouchers();
                await refreshLedger({ limit: 10 });
              } else {
                Alert.alert("Gagal Tukar Voucher", res.message || "Terjadi kesalahan.");
              }
            } catch (err: any) {
              Alert.alert("Kesalahan", err?.message || "Gagal memproses penukaran.");
            } finally {
              setRedeemingVoucherId(null);
            }
          },
        },
      ]
    );
  };

  // Top vouchers for recommendations
  const topVouchers = availableVouchers.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* App Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_home")}
          accessibilityLabel="Kembali ke Beranda"
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>GEOVERSE Point</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>Loyalty Dompet Lingkungan</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Muat Ulang Saldo"
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTabletOrDesktop && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#15803D"]}
            tintColor="#15803D"
          />
        }
      >
        {walletLoading && !wallet ? (
          <GeoversePointSkeleton />
        ) : (
          <>
            {walletError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{walletError}</Text>
                <TouchableOpacity onPress={() => refreshWallet()}>
                  <Text style={styles.retryText}>Coba Lagi</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Desktop / Tablet Two-Column Layout */}
            {isTabletOrDesktop ? (
              <View style={styles.twoColumnGrid}>
                {/* Left Column */}
                <View style={styles.columnLeft}>
                  <GeoversePointHeroCard
                    wallet={wallet}
                    pointToRupiah={pointToRupiah}
                    formatPoint={formatPoint}
                    formatRupiah={formatRupiah}
                    onViewLedger={() => navigate("c_point_ledger")}
                  />
                  <GeoversePointQuickActions
                    onRedeemVoucher={() => navigate("c_point_vouchers")}
                    onRedeemCash={() => navigate("c_point_redeem_cash")}
                    onViewHistory={() => navigate("c_point_ledger")}
                    onHowItWorks={() => navigate("c_point_how_it_works")}
                  />
                  <GeoversePointImpactCard wallet={wallet} />
                </View>

                {/* Right Column */}
                <View style={styles.columnRight}>
                  <GeoversePointContributionBanner
                    onDepositPress={() => navigate("c_recycle_deposit_form")}
                  />

                  {/* Voucher Recommendations */}
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <Ticket size={16} color="#D97706" />
                      <Text style={styles.sectionTitle}>Rekomendasi Voucher</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => navigate("c_point_vouchers")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.seeAllText}>Semua Voucher</Text>
                    </TouchableOpacity>
                  </View>

                  {topVouchers.map((voucher) => (
                    <GeoversePointVoucherCard
                      key={voucher._id}
                      voucher={voucher}
                      canRedeem={(wallet?.balancePoint || 0) >= voucher.pointsCost}
                      onRedeem={handleRedeemVoucher}
                      formatPoint={formatPoint}
                    />
                  ))}

                  <GeoversePointRecentActivity
                    ledger={ledger}
                    loading={ledgerLoading}
                    formatPoint={formatPoint}
                    onViewAll={() => navigate("c_point_ledger")}
                    onEarnFirstPoint={() => navigate("c_recycle_banks")}
                  />
                </View>
              </View>
            ) : (
              /* Mobile Single-Column Layout */
              <View>
                <GeoversePointHeroCard
                  wallet={wallet}
                  pointToRupiah={pointToRupiah}
                  formatPoint={formatPoint}
                  formatRupiah={formatRupiah}
                  onViewLedger={() => navigate("c_point_ledger")}
                />

                <GeoversePointQuickActions
                  onRedeemVoucher={() => navigate("c_point_vouchers")}
                  onRedeemCash={() => navigate("c_point_redeem_cash")}
                  onViewHistory={() => navigate("c_point_ledger")}
                  onHowItWorks={() => navigate("c_point_how_it_works")}
                />

                <GeoversePointContributionBanner
                  onDepositPress={() => navigate("c_recycle_deposit_form")}
                />

                <GeoversePointImpactCard wallet={wallet} />

                {/* Voucher Recommendations */}
                {topVouchers.length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionTitleRow}>
                        <Ticket size={16} color="#D97706" />
                        <Text style={styles.sectionTitle}>Rekomendasi Voucher</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => navigate("c_point_vouchers")}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.seeAllText}>Lihat Semua</Text>
                      </TouchableOpacity>
                    </View>

                    {topVouchers.map((voucher) => (
                      <GeoversePointVoucherCard
                        key={voucher._id}
                        voucher={voucher}
                        canRedeem={(wallet?.balancePoint || 0) >= voucher.pointsCost}
                        onRedeem={handleRedeemVoucher}
                        formatPoint={formatPoint}
                      />
                    ))}
                  </View>
                )}

                <GeoversePointRecentActivity
                  ledger={ledger}
                  loading={ledgerLoading}
                  formatPoint={formatPoint}
                  onViewAll={() => navigate("c_point_ledger")}
                  onEarnFirstPoint={() => navigate("c_recycle_banks")}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  desktopContainer: {
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 20,
  },
  columnLeft: {
    flex: 5,
  },
  columnRight: {
    flex: 6,
  },
  errorBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
    marginLeft: 8,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
});
