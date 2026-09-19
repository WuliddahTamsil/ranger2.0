import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Ticket, CheckCircle2, Copy } from "lucide-react-native";
import { Nav } from "../../../types";
import { useGeoversePoint } from "../hooks/useGeoversePoint";
import { GeoversePointVoucherCard } from "../components/GeoversePointVoucherCard";
import { createRedemption, fetchAvailableVouchers } from "../services/geoversePointService";
import { PointVoucherUI } from "../types/pointTypes";

export const GeoversePointVoucherScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    wallet,
    refreshWallet,
    availableVouchers,
    vouchersLoading,
    refreshVouchers,
    myRedemptions,
    refreshRedemptions,
    formatPoint,
  } = useGeoversePoint();

  const [activeTab, setActiveTab] = useState<"CATALOG" | "MY_VOUCHERS">("CATALOG");
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [claimingVoucherId, setClaimingVoucherId] = useState<string | null>(null);

  const serviceFilters = [
    { id: "ALL", label: "Semua" },
    { id: "SHOP", label: "Kanyaah Shop" },
    { id: "RIDE", label: "Ride" },
    { id: "SEND", label: "Send" },
    { id: "CATERING", label: "Catering" },
    { id: "LAUNDRY", label: "Laundry" },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshWallet(),
      refreshVouchers(selectedService === "ALL" ? undefined : selectedService),
      refreshRedemptions(),
    ]);
    setRefreshing(false);
  };

  const handleClaim = async (voucher: PointVoucherUI) => {
    const currentPoints = wallet?.balancePoint || 0;
    if (currentPoints < voucher.pointsCost) {
      Alert.alert(
        "Poin Tidak Cukup",
        `Voucher ini membutuhkan ${formatPoint(voucher.pointsCost)}, saldo Anda ${formatPoint(currentPoints)}.`
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Tukar Voucher",
      `Gunakan ${formatPoint(voucher.pointsCost)} untuk menukar "${voucher.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tukarkan",
          onPress: async () => {
            setClaimingVoucherId(voucher._id);
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
                  "Berhasil Ditukarkan! 🎉",
                  `Kode Voucher: ${res.data?.voucherCode || "Aktif"}.\nVoucher otomatis tersimpan di tab "Voucher Saya".`
                );
                await refreshWallet();
                await refreshVouchers();
                await refreshRedemptions();
              } else {
                Alert.alert("Gagal", res.message || "Gagal menukarkan voucher.");
              }
            } catch (err: any) {
              Alert.alert("Kesalahan", err?.message || "Terjadi kesalahan.");
            } finally {
              setClaimingVoucherId(null);
            }
          },
        },
      ]
    );
  };

  // Filter vouchers
  const filteredVouchers = availableVouchers.filter((v) => {
    if (selectedService === "ALL") return true;
    if (selectedService === "SHOP") return v.service === "SHOP" || v.service === "KANYAAH_SHOP" || v.service === "MARKETPLACE";
    return v.service === selectedService;
  });

  // Filter claimed vouchers from myRedemptions
  const myClaimedVouchers = myRedemptions.filter((r) => r.type === "VOUCHER");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_point_home")}
          activeOpacity={0.7}
          accessibilityLabel="Kembali"
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Katalog Voucher</Text>
          <Text style={styles.headerSubtitle}>Tukar poin dengan potongan transaksi</Text>
        </View>

        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>{formatPoint(wallet?.balancePoint || 0)}</Text>
        </View>
      </View>

      <View style={[styles.container, isDesktop && styles.desktopContainer]}>
        {/* Main Tabs */}
        <View style={styles.mainTabsRow}>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === "CATALOG" && styles.mainTabActive]}
            onPress={() => setActiveTab("CATALOG")}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.mainTabText, activeTab === "CATALOG" && styles.mainTabTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Katalog Voucher
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTab, activeTab === "MY_VOUCHERS" && styles.mainTabActive]}
            onPress={() => setActiveTab("MY_VOUCHERS")}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.mainTabText, activeTab === "MY_VOUCHERS" && styles.mainTabTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Voucher Saya ({myClaimedVouchers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "CATALOG" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.serviceFilters}
            contentContainerStyle={styles.serviceFiltersScroll}
          >
            {serviceFilters.map((sf) => (
              <TouchableOpacity
                key={sf.id}
                style={[
                  styles.serviceFilterBtn,
                  selectedService === sf.id && styles.serviceFilterBtnActive,
                ]}
                onPress={() => setSelectedService(sf.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.serviceFilterText,
                    selectedService === sf.id && styles.serviceFilterTextActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {sf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
          {activeTab === "CATALOG" ? (
            vouchersLoading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#15803D" />
                <Text style={styles.loadingText}>Memuat katalog voucher...</Text>
              </View>
            ) : filteredVouchers.length > 0 ? (
              filteredVouchers.map((voucher) => (
                <GeoversePointVoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  canRedeem={
                    (wallet?.balancePoint || 0) >= voucher.pointsCost &&
                    claimingVoucherId !== voucher._id
                  }
                  onRedeem={handleClaim}
                  formatPoint={formatPoint}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ticket size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Belum ada voucher tersedia</Text>
                <Text style={styles.emptySubtitle}>
                  Voucher untuk kategori ini akan segera hadir. Cek kembali secara berkala!
                </Text>
              </View>
            )
          ) : (
            /* MY VOUCHERS TAB */
            myClaimedVouchers.length > 0 ? (
              myClaimedVouchers.map((item) => (
                <View key={item._id} style={styles.myVoucherCard}>
                  <View style={styles.myVoucherTop}>
                    <View style={styles.myVoucherBadge}>
                      <Ticket size={12} color="#D97706" />
                      <Text style={styles.myVoucherBadgeText}>Voucher Aktif</Text>
                    </View>
                    <Text style={styles.myVoucherDate}>
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>

                  <Text style={styles.myVoucherTitle}>
                    {item.voucherDetails?.title || "Voucher Diskon"}
                  </Text>
                  <Text style={styles.myVoucherCode}>
                    Kode: {item.voucherCode || item.redemptionCode}
                  </Text>

                  <View style={styles.myVoucherFooter}>
                    <Text style={styles.myVoucherPoints}>
                      Ditukar dengan {formatPoint(item.points)}
                    </Text>
                    <View style={styles.readyTag}>
                      <CheckCircle2 size={13} color="#059669" />
                      <Text style={styles.readyTagText}>Siap Digunakan</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ticket size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Belum ada voucher yang ditukar</Text>
                <Text style={styles.emptySubtitle}>
                  Buka tab Katalog Voucher dan tukarkan GEOVERSE Point Anda dengan penawaran menarik!
                </Text>
              </View>
            )
          )}
        </ScrollView>
      </View>
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
  balanceBadge: {
    flexShrink: 0,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  balanceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  desktopContainer: {
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  mainTabsRow: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  mainTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mainTabText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  mainTabTextActive: {
    color: "#15803D",
    fontWeight: "700",
  },
  serviceFilters: {
    flexGrow: 0,
    height: 44,
  },
  serviceFiltersScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
    paddingTop: 2,
  },
  serviceFilterBtn: {
    minHeight: 34,
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  serviceFilterBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#15803D",
  },
  serviceFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  serviceFilterTextActive: {
    color: "#15803D",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  myVoucherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 10,
  },
  myVoucherTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  myVoucherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  myVoucherBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  myVoucherDate: {
    fontSize: 10,
    color: "#94A3B8",
  },
  myVoucherTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  myVoucherCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  myVoucherFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  myVoucherPoints: {
    fontSize: 11,
    color: "#64748B",
  },
  readyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readyTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
});
