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
  Modal,
} from "react-native";
import { Nav } from "../../types";
import {
  Shirt,
  Search,
  Plus,
  ChevronRight,
  Home,
  Package,
  Users,
  Clock,
  Wallet,
  User,
  X,
  CheckCircle,
} from "lucide-react-native";

interface LaundryOrder {
  id: string;
  customerName: string;
  serviceType: string;
  weightOrQty: string;
  price: string;
  status: "baru" | "diproses" | "selesai";
  date: string;
}

export const LaundryOrderScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "order" | "riwayat" | "pendapatan" | "profil">("order");
  const [activeFilter, setActiveFilter] = useState<"semua" | "baru" | "diproses" | "selesai">("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Orders State
  const [orders, setOrders] = useState<LaundryOrder[]>([
    {
      id: "LND-924",
      customerName: "Siti Aminah",
      serviceType: "Express 3 Jam",
      weightOrQty: "3.5 kg",
      price: "Rp 35.000",
      status: "baru",
      date: "14 Juli 2026",
    },
    {
      id: "LND-923",
      customerName: "Ahmad Faisal",
      serviceType: "Cuci Komplit",
      weightOrQty: "5.0 kg",
      price: "Rp 40.000",
      status: "diproses",
      date: "14 Juli 2026",
    },
    {
      id: "LND-922",
      customerName: "Dewi Lestari",
      serviceType: "Cuci Lipat",
      weightOrQty: "4.0 kg",
      price: "Rp 28.000",
      status: "selesai",
      date: "13 Juli 2026",
    },
  ]);

  // Modal Add Order
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [service, setService] = useState("Cuci Komplit");
  const [weight, setWeight] = useState("");
  const [priceVal, setPriceVal] = useState("");

  const handleCreateOrder = () => {
    if (!custName) return;
    const newOrd: LaundryOrder = {
      id: `LND-${Math.floor(100 + Math.random() * 900)}`,
      customerName: custName,
      serviceType: service,
      weightOrQty: weight ? `${weight} kg` : "Kiloan",
      price: priceVal ? `Rp ${priceVal}` : "Rp 30.000",
      status: "baru",
      date: "14 Juli 2026",
    };
    setOrders([newOrd, ...orders]);
    setIsAddModalOpen(false);
    setCustName("");
    setWeight("");
    setPriceVal("");
  };

  const handleUpdateStatus = (id: string, nextStatus: "diproses" | "selesai") => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: nextStatus } : o))
    );
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "baru") return matchesSearch && o.status === "baru";
    if (activeFilter === "diproses") return matchesSearch && o.status === "diproses";
    if (activeFilter === "selesai") return matchesSearch && o.status === "selesai";
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Manajemen Order Laundry</Text>
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addBtnHeaderText}>Order Baru</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari ID pesanan atau nama pelanggan..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "semua" && styles.filterChipActive]}
            onPress={() => setActiveFilter("semua")}
          >
            <Text style={[styles.filterChipText, activeFilter === "semua" && styles.filterChipTextActive]}>
              Semua ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "baru" && styles.filterChipActive]}
            onPress={() => setActiveFilter("baru")}
          >
            <Text style={[styles.filterChipText, activeFilter === "baru" && styles.filterChipTextActive]}>
              Baru ({orders.filter((o) => o.status === "baru").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "diproses" && styles.filterChipActive]}
            onPress={() => setActiveFilter("diproses")}
          >
            <Text style={[styles.filterChipText, activeFilter === "diproses" && styles.filterChipTextActive]}>
              Diproses ({orders.filter((o) => o.status === "diproses").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "selesai" && styles.filterChipActive]}
            onPress={() => setActiveFilter("selesai")}
          >
            <Text style={[styles.filterChipText, activeFilter === "selesai" && styles.filterChipTextActive]}>
              Selesai ({orders.filter((o) => o.status === "selesai").length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Order Items */}
        <View style={styles.orderList}>
          {filteredOrders.map((o) => (
            <View key={o.id} style={styles.orderCard}>
              <View style={styles.orderTopRow}>
                <View style={styles.orderIdBadge}>
                  <Shirt size={16} color="#0D7A53" />
                  <Text style={styles.orderIdText}>#{o.id}</Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    o.status === "baru" && { backgroundColor: "#DCFCE7" },
                    o.status === "diproses" && { backgroundColor: "#DBEAFE" },
                    o.status === "selesai" && { backgroundColor: "#F3F4F6" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      o.status === "baru" && { color: "#0D7A53" },
                      o.status === "diproses" && { color: "#2563EB" },
                      o.status === "selesai" && { color: "#4B5563" },
                    ]}
                  >
                    {o.status === "baru"
                      ? "Order Baru"
                      : o.status === "diproses"
                      ? "Sedang Dicuci"
                      : "Selesai"}
                  </Text>
                </View>
              </View>

              <Text style={styles.custName}>{o.customerName}</Text>
              <Text style={styles.serviceDetail}>
                {o.serviceType} • {o.weightOrQty}
              </Text>
              <Text style={styles.orderDate}>{o.date}</Text>

              <View style={styles.orderFooterRow}>
                <Text style={styles.orderPrice}>{o.price}</Text>

                {o.status === "baru" && (
                  <TouchableOpacity
                    style={styles.actionBtnProcess}
                    onPress={() => handleUpdateStatus(o.id, "diproses")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnProcessText}>Proses Cuci</Text>
                  </TouchableOpacity>
                )}

                {o.status === "diproses" && (
                  <TouchableOpacity
                    style={styles.actionBtnDone}
                    onPress={() => handleUpdateStatus(o.id, "selesai")}
                    activeOpacity={0.8}
                  >
                    <CheckCircle size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnDoneText}>Tandai Selesai</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_home")}
          activeOpacity={0.7}
        >
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveNavTab("order")}
          activeOpacity={0.7}
        >
          <Package size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Order</Text>
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

      {/* Add Order Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Baru Laundry</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nama Pelanggan</Text>
            <TextInput
              style={styles.input}
              value={custName}
              onChangeText={setCustName}
              placeholder="Nama Pelanggan"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Tipe Layanan</Text>
            <TextInput
              style={styles.input}
              value={service}
              onChangeText={setService}
              placeholder="Cuci Komplit / Express 3 Jam"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Berat (Kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="3.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Total Harga (Rp)</Text>
            <TextInput
              style={styles.input}
              value={priceVal}
              onChangeText={setPriceVal}
              placeholder="35.000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateOrder} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Buat Pesanan Laundry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addBtnHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#111827",
  },

  filterChipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  orderList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  custName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  serviceDetail: {
    fontSize: 12,
    color: "#6B7280",
  },
  orderDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  orderFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  actionBtnProcess: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBtnProcessText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionBtnDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBtnDoneText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

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
    color: "#0D7A53",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13,
    color: "#111827",
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
