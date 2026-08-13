import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import {
  Shirt,
  Search,
  CheckCircle,
  Home,
  Package,
  Clock,
  Wallet,
  User,
} from "lucide-react-native";

export const LaundryRiwayatScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "order" | "riwayat" | "pendapatan" | "profil">("riwayat");
  const [searchQuery, setSearchQuery] = useState("");

  const historyItems = [
    { id: "LND-920", customer: "Budi Santoso", type: "Cuci Komplit (4.0 kg)", date: "12 Juli 2026", price: "Rp 32.000" },
    { id: "LND-919", customer: "Dewi Lestari", type: "Express 3 Jam (2.5 kg)", date: "11 Juli 2026", price: "Rp 25.000" },
    { id: "LND-918", customer: "Ahmad Faisal", type: "Cuci Lipat (6.0 kg)", date: "10 Juli 2026", price: "Rp 42.000" },
  ];

  const filteredHistory = historyItems.filter((h) =>
    h.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Riwayat Transaksi Laundry</Text>
          <Text style={styles.headerSub}>Pesanan yang telah selesai dikerjakan</Text>
        </View>

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
          {filteredHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyTopRow}>
                <View style={styles.idBadge}>
                  <Shirt size={16} color="#0D7A53" />
                  <Text style={styles.idText}>#{item.id}</Text>
                </View>
                <View style={styles.successPill}>
                  <CheckCircle size={12} color="#0D7A53" />
                  <Text style={styles.successText}>Selesai</Text>
                </View>
              </View>

              <Text style={styles.custName}>{item.customer}</Text>
              <Text style={styles.itemType}>{item.type}</Text>
              <Text style={styles.itemDate}>{item.date}</Text>

              <View style={styles.footerRow}>
                <Text style={styles.priceText}>{item.price}</Text>
              </View>
            </View>
          ))}
        </View>
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

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveNavTab("riwayat")}>
          <Clock size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Riwayat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_pendapatan")}>
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Pendapatan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_profil")}>
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: "#111827" },
  historyList: { gap: 12 },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  idBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  idText: { fontSize: 15, fontWeight: "900", color: "#111827" },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successText: { fontSize: 11, fontWeight: "800", color: "#0D7A53" },
  custName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  itemType: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  itemDate: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  footerRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceText: { fontSize: 15, fontWeight: "900", color: "#0D7A53" },

  bottomNav: {
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
