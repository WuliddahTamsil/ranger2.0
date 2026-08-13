import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import {
  Bell,
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
} from "lucide-react-native";

export const PemilikLaundryHomeScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "order" | "user" | "keuangan" | "profil">("beranda");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E6641" />

      {/* Main Scroll Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Header Card (Dark Green) */}
        <View style={styles.topHeaderCard}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingText}>Halo, selamat pagi 🌿</Text>
              <Text style={styles.ownerNameText}>Pak Rahman</Text>
            </View>

            {/* Notification Bell with Red Badge */}
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
              <Bell size={20} color="#FFFFFF" />
              <View style={styles.bellBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Role Pill Button */}
        <View style={styles.rolePillContainer}>
          <TouchableOpacity style={styles.rolePillBtn} onPress={() => navigate("role")} activeOpacity={0.85}>
            <Shirt size={16} color="#FFFFFF" />
            <Text style={styles.rolePillText}>Pemilik Laundry</Text>
          </TouchableOpacity>
        </View>

        {/* Ringkasan Hari Ini Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View>
              <Text style={styles.summaryTitle}>Ringkasan Hari Ini</Text>
              <Text style={styles.summarySubtitle}>Selasa, 14 Juli 2026</Text>
            </View>

            <TouchableOpacity style={styles.seeDetailBtn} activeOpacity={0.7}>
              <Text style={styles.seeDetailText}>Lihat Detail</Text>
              <ChevronRight size={14} color="#0E6641" />
            </TouchableOpacity>
          </View>

          {/* Divider line under header */}
          <View style={styles.cardHeaderDivider} />

          {/* 2x2 Grid Stats with vertical & horizontal dividers */}
          <View style={styles.statsGridContainer}>
            {/* Top Row */}
            <View style={styles.statRow}>
              {/* Stat 1: Pesanan Baru */}
              <View style={styles.statCol}>
                <View style={styles.statIconBg}>
                  <ShoppingBag size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>12</Text>
                  <Text style={styles.statValSub}>Pesanan Baru</Text>
                </View>
              </View>

              {/* Vertical Divider */}
              <View style={styles.verticalDivider} />

              {/* Stat 2: Sedang Dikerjakan */}
              <View style={styles.statCol}>
                <View style={styles.statIconBg}>
                  <Wallet size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>18</Text>
                  <Text style={styles.statValSub}>Sedang Dikerjakan</Text>
                </View>
              </View>
            </View>

            {/* Horizontal Divider */}
            <View style={styles.horizontalDivider} />

            {/* Bottom Row */}
            <View style={styles.statRow}>
              {/* Stat 3: Selesai Hari Ini */}
              <View style={styles.statCol}>
                <View style={styles.statIconBg}>
                  <CheckSquare size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>8</Text>
                  <Text style={styles.statValSub}>Selesai Hari Ini</Text>
                </View>
              </View>

              {/* Vertical Divider */}
              <View style={styles.verticalDivider} />

              {/* Stat 4: Pendapatan */}
              <View style={styles.statCol}>
                <View style={styles.statIconBg}>
                  <TrendingUp size={18} color="#0E6641" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>Rp 1.245.000</Text>
                  <Text style={styles.statValSub}>Pendapatan</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Pesanan Terbaru Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
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
          {/* Order 1: #LND-924 */}
          <TouchableOpacity style={styles.orderItemRow} activeOpacity={0.7}>
            <View style={[styles.orderIconBg, { backgroundColor: "#E6F7F0" }]}>
              <Shirt size={20} color="#0E6641" />
            </View>

            <View style={styles.orderInfoCol}>
              <Text style={styles.orderIdText}>#LND-924</Text>
              <Text style={styles.orderOwnerText}>Siti Aminah • Express 3 Jam</Text>
            </View>

            <View style={styles.orderRightCol}>
              <View style={[styles.badgePill, { backgroundColor: "#E6F7F0" }]}>
                <Text style={[styles.badgePillText, { color: "#0E6641" }]}>Baru</Text>
              </View>
              <Text style={styles.orderAmountText}>-</Text>
            </View>
          </TouchableOpacity>

          {/* Order 2: #LND-923 */}
          <TouchableOpacity style={styles.orderItemRow} activeOpacity={0.7}>
            <View style={[styles.orderIconBg, { backgroundColor: "#EBF3FF" }]}>
              <Shirt size={20} color="#2563EB" />
            </View>

            <View style={styles.orderInfoCol}>
              <Text style={styles.orderIdText}>#LND-923</Text>
              <Text style={styles.orderOwnerText}>Ahmad Faisal • Biasa</Text>
            </View>

            <View style={styles.orderRightCol}>
              <View style={[styles.badgePill, { backgroundColor: "#EBF3FF" }]}>
                <Text style={[styles.badgePillText, { color: "#2563EB" }]}>Diproses</Text>
              </View>
              <Text style={[styles.orderAmountText, { color: "#111827", fontWeight: "900" }]}>
                Rp 40.000
              </Text>
            </View>
          </TouchableOpacity>

          {/* Order 3: #LND-922 */}
          <TouchableOpacity style={[styles.orderItemRow, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
            <View style={[styles.orderIconBg, { backgroundColor: "#E6F7F0" }]}>
              <Shirt size={20} color="#0E6641" />
            </View>

            <View style={styles.orderInfoCol}>
              <Text style={styles.orderIdText}>#LND-922</Text>
              <Text style={styles.orderOwnerText}>Dewi Lestari • Cuci Komplit</Text>
            </View>

            <View style={styles.orderRightCol}>
              <View style={[styles.badgePill, { backgroundColor: "#FFF7ED" }]}>
                <Text style={[styles.badgePillText, { color: "#D97706" }]}>Menunggu Harga</Text>
              </View>
              <Text style={styles.orderAmountText}>-</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 5-Tab Navigation Footer Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveNavTab("beranda")}
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
    paddingBottom: 20,
  },

  // Top Header Card (Dark Green)
  topHeaderCard: {
    backgroundColor: "#0E6641",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  ownerNameText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  // Role Pill Container
  rolePillContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  rolePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-start",
    elevation: 3,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginTop: 14,
    marginBottom: 14,
  },

  // Stats Grid 2x2
  statsGridContainer: {},
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  statIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  statTextGroup: {
    flex: 1,
  },
  statValNum: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  statValSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 8,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  // Orders Card Group
  orderCardGroup: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  orderIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfoCol: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 15,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  orderAmountText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Bottom Navigation Bar
  bottomNav: {
    flexDirection: "row",
    height: 64,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 3,
  },
  navTextActive: {
    color: "#0E6641",
    fontWeight: "700",
  },
});
