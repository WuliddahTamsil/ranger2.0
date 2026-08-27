import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  Shirt,
  ShoppingBag,
  Wallet,
  CheckSquare,
  TrendingUp,
  ChevronRight,
  Home,
  Package,
  Users,
  User,
  Scale,
  CreditCard,
} from "lucide-react-native";
import { RoleHeader } from "../../components/RoleHeader";
import {
  fetchStoreOrders,
  subscribeLaundry,
  getActiveLaundryOrder,
  LaundryOrder,
} from "../../services/laundryService";

interface PemilikLaundryHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const PemilikLaundryHomeScreen: React.FC<PemilikLaundryHomeProps> = ({ navigate, authAccount }) => {
  const [orders, setOrders] = useState<LaundryOrder[]>([]);

  const loadData = async () => {
    const data = await fetchStoreOrders("all");
    const active = getActiveLaundryOrder();
    if (active && !data.some((d) => (d._id || d.id) === (active._id || active.id))) {
      data.unshift(active);
    }
    setOrders(data);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeLaundry(() => {
      loadData();
    });
    return unsub;
  }, []);

  const newOrdersCount = orders.filter((o) => !o.actualWeightOrQty || o.status === "MENUNGGU_DRIVER_JEMPUT" || o.status === "TIBA_DI_LAUNDRY").length;
  const inProgressCount = orders.filter((o) => o.status === "SEDANG_DICUCI" || o.status === "MENUNGGU_PEMBAYARAN").length;
  const completedCount = orders.filter((o) => o.status === "SELESAI" || o.status === "SIAP_DIANTAR").length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "lunas")
    .reduce((acc, curr) => acc + (curr.laundryCost || curr.totalAmount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Scroll Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <RoleHeader
          name={authAccount?.name || "Pak Dedi Kurniawan"}
          role="Pemilik Laundry"
          icon={Shirt}
          fullBleed={false}
          notificationCount={newOrdersCount}
          onRolePress={() => navigate("role")}
        />

        {/* Ringkasan Hari Ini Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View>
              <Text style={styles.summaryTitle}>Ringkasan Hari Ini</Text>
              <Text style={styles.summarySubtitle}>Mitra Laundry Rangers App</Text>
            </View>

            <TouchableOpacity
              style={styles.seeDetailBtn}
              onPress={() => navigate("pemilik_laundry_order")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeDetailText}>Kelola Order</Text>
              <ChevronRight size={14} color="#0E6641" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardHeaderDivider} />

          {/* 2x2 Grid Stats */}
          <View style={styles.statsGridContainer}>
            {/* Top Row */}
            <View style={styles.statRow}>
              {/* Stat 1: Pesanan Baru / Perlu Timbang */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_order")}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconBg, { backgroundColor: newOrdersCount > 0 ? "#FEF3C7" : "#E8F5EE" }]}>
                  <Scale size={18} color={newOrdersCount > 0 ? "#D97706" : "#0E6641"} />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>{newOrdersCount}</Text>
                  <Text style={styles.statValSub}>Perlu Timbang</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              {/* Stat 2: Sedang Dikerjakan */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_order")}
                activeOpacity={0.7}
              >
                <View style={styles.statIconBg}>
                  <Shirt size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>{inProgressCount}</Text>
                  <Text style={styles.statValSub}>Sedang Proses</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.horizontalDivider} />

            {/* Bottom Row */}
            <View style={styles.statRow}>
              {/* Stat 3: Selesai Hari Ini */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_order")}
                activeOpacity={0.7}
              >
                <View style={styles.statIconBg}>
                  <CheckSquare size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>{completedCount}</Text>
                  <Text style={styles.statValSub}>Selesai / Antar</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              {/* Stat 4: Pendapatan */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_pendapatan")}
                activeOpacity={0.7}
              >
                <View style={styles.statIconBg}>
                  <TrendingUp size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>Rp {totalRevenue.toLocaleString("id-ID")}</Text>
                  <Text style={styles.statValSub}>Pendapatan</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Banner: Alur Timbangan & Pembayaran */}
        <TouchableOpacity
          style={styles.actionBanner}
          onPress={() => navigate("pemilik_laundry_order")}
          activeOpacity={0.85}
        >
          <View style={styles.actionBannerLeft}>
            <View style={styles.actionBannerIconBg}>
              <Scale size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionBannerTitle}>Timbang & Setor Tagihan</Text>
              <Text style={styles.actionBannerSub}>Customer bayar setelah ditimbang sebelum baju diantar</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#0E6641" />
        </TouchableOpacity>

        {/* Pesanan Terbaru Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pesanan Masuk Terbaru</Text>
          <TouchableOpacity
            style={styles.seeDetailBtn}
            onPress={() => navigate("pemilik_laundry_order")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeDetailText}>Lihat Semua</Text>
            <ChevronRight size={14} color="#0E6641" />
          </TouchableOpacity>
        </View>

        {/* Orders Card Group */}
        <View style={styles.orderCardGroup}>
          {orders.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Belum ada pesanan masuk hari ini.</Text>
            </View>
          ) : (
            orders.slice(0, 4).map((o, idx) => {
              const isLast = idx === Math.min(orders.length, 4) - 1;
              const isWeighed = Boolean(o.actualWeightOrQty);
              const isPaid = o.paymentStatus === "lunas";

              return (
                <TouchableOpacity
                  key={o.orderCode || idx}
                  style={[styles.orderItemRow, isLast && { borderBottomWidth: 0 }]}
                  onPress={() => navigate("pemilik_laundry_order")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.orderIconBg, { backgroundColor: isPaid ? "#E6F7F0" : "#FFF7ED" }]}>
                    <Shirt size={20} color={isPaid ? "#0E6641" : "#EA580C"} />
                  </View>

                  <View style={styles.orderInfoCol}>
                    <Text style={styles.orderIdText}>{o.orderCode}</Text>
                    <Text style={styles.orderOwnerText} numberOfLines={1}>
                      {o.customerName} • {o.serviceName}
                    </Text>
                  </View>

                  <View style={styles.orderRightCol}>
                    <View
                      style={[
                        styles.badgePill,
                        { backgroundColor: !isWeighed ? "#FEF3C7" : !isPaid ? "#FFF7ED" : "#E6F7F0" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgePillText,
                          { color: !isWeighed ? "#D97706" : !isPaid ? "#EA580C" : "#0E6641" },
                        ]}
                      >
                        {!isWeighed ? "Timbang" : !isPaid ? "Tunggu Bayar" : "Lunas"}
                      </Text>
                    </View>
                    <Text style={styles.orderAmountText}>
                      {isWeighed ? `Rp ${(o.totalAmount || 0).toLocaleString("id-ID")}` : "-"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 5-Tab Navigation Footer Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Home size={22} color="#0E6641" />
          <Text style={[styles.navText, styles.navTextActive]}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_order")}
          activeOpacity={0.7}
        >
          <Package size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_user")}
          activeOpacity={0.7}
        >
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_pendapatan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_profil")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  summarySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  seeDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0E6641",
  },
  cardHeaderDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  statsGridContainer: {},
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statTextGroup: {
    flex: 1,
  },
  statValNum: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  statValSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5EE",
    padding: 14,
    borderRadius: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  actionBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  actionBannerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  actionBannerSub: {
    fontSize: 11,
    color: "#166534",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  orderCardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderInfoCol: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  orderOwnerText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  orderRightCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  orderAmountText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "800",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  navTab: {
    alignItems: "center",
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },
  navTextActive: {
    color: "#0E6641",
    fontWeight: "800",
  },
});
