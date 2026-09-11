import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  Shirt,
  Search,
  CheckCircle,
  Home,
  Package,
  Clock,
  Wallet,
  User,
  Users,
  ArrowLeft,
} from "lucide-react-native";
import {
  fetchStoreOrders,
  subscribeLaundry,
  LaundryOrder,
} from "../../services/laundryService";

interface LaundryRiwayatProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const LaundryRiwayatScreen: React.FC<LaundryRiwayatProps> = ({ navigate, authAccount }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    if (!authAccount?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const data = await fetchStoreOrders(authAccount.id);
    const completed = data.filter((o) => o.status === "SELESAI" || o.paymentStatus === "lunas");
    setOrders(completed);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeLaundry(() => {
      loadData();
    });
    return unsub;
  }, [authAccount?.id]);

  const filteredHistory = orders.filter((h) =>
    (h.orderCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.serviceName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate("pemilik_laundry_order")} style={{ padding: 4, marginRight: 8 }}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Riwayat Transaksi Laundry</Text>
          <Text style={styles.headerSub}>Pesanan yang telah selesai dikerjakan</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari riwayat pesanan..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* History Cards */}
        <View style={styles.historyList}>
          {filteredHistory.length === 0 ? (
            <View style={{ padding: 30, alignItems: "center" }}>
              <Shirt size={40} color="#D1D5DB" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#6B7280", marginTop: 8 }}>
                Belum ada riwayat transaksi selesai
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 2 }}>
                Saat cucian customer telah selesai diantar dan berstatus SELESAI, riwayatnya akan otomatis tercatat di sini.
              </Text>
            </View>
          ) : (
            filteredHistory.map((item) => {
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Hari ini";
              const weightStr = item.actualWeightOrQty ? `${item.actualWeightOrQty} ${item.unitType}` : "Selesai";
              const cost = item.laundryCost || item.totalAmount || 0;

              return (
                <View key={item._id || item.id || item.orderCode} style={styles.historyCard}>
                  <View style={styles.historyTopRow}>
                    <View style={styles.idBadge}>
                      <Shirt size={16} color="#0D7A53" />
                      <Text style={styles.idText}>#{item.orderCode}</Text>
                    </View>
                    <View style={styles.successPill}>
                      <CheckCircle size={12} color="#0D7A53" />
                      <Text style={styles.successText}>Selesai</Text>
                    </View>
                  </View>

                  <Text style={styles.custName}>{item.customerName || "Customer"}</Text>
                  <Text style={styles.itemType}>{item.serviceName} ({weightStr})</Text>
                  <Text style={styles.itemDate}>{dateStr}</Text>

                  <View style={styles.footerRow}>
                    <Text style={styles.priceText}>Rp {cost.toLocaleString("id-ID")}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_home")}>
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_order")}>
          <Package size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_user")}>
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_pendapatan")}>
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_profil")}>
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  scrollContent: { padding: 16 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#111827", padding: 0 },

  historyList: { gap: 12 },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idText: { fontSize: 12, fontWeight: "800", color: "#0D7A53" },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successText: { fontSize: 11, fontWeight: "700", color: "#0D7A53" },

  custName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  itemType: { fontSize: 13, color: "#4B5563", marginTop: 2 },
  itemDate: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceText: { fontSize: 15, fontWeight: "900", color: "#0D7A53" },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 64,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navTab: { alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 10, color: "#9CA3AF", marginTop: 3 },
  navTextActive: { color: "#0D7A53", fontWeight: "700" },
});
