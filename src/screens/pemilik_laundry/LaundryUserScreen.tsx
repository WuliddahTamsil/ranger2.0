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
  Users,
  Search,
  Plus,
  Home,
  Package,
  Wallet,
  User as UserIcon,
  X,
  Phone,
  ShoppingBag,
  UserCheck,
} from "lucide-react-native";

interface LaundryUserItem {
  id: string;
  name: string;
  phone: string;
  roleOrOrders: string;
  type: "customer" | "staff";
}

export const LaundryUserScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState<"customer" | "staff">("customer");
  const [searchQuery, setSearchQuery] = useState("");

  const [users, setUsers] = useState<LaundryUserItem[]>([
    { id: "1", name: "Siti Aminah", phone: "081234567890", roleOrOrders: "12 Order", type: "customer" },
    { id: "2", name: "Ahmad Faisal", phone: "081324681357", roleOrOrders: "8 Order", type: "customer" },
    { id: "3", name: "Dewi Lestari", phone: "081987654321", roleOrOrders: "15 Order", type: "customer" },
    { id: "4", name: "Mas Anton (Kurir)", phone: "081555444333", roleOrOrders: "Staf Penjemputan", type: "staff" },
    { id: "5", name: "Mbok Yem (Operator)", phone: "081777888999", roleOrOrders: "Staf Cuci & Setrika", type: "staff" },
  ]);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState("");

  const handleAddUser = () => {
    if (!newUserName) return;
    const item: LaundryUserItem = {
      id: Date.now().toString(),
      name: newUserName,
      phone: newUserPhone || "08123456789",
      roleOrOrders: activeTab === "staff" ? (newUserRole || "Staf Laundry") : "0 Order",
      type: activeTab,
    };
    setUsers([...users, item]);
    setIsAddUserModalOpen(false);
    setNewUserName("");
    setNewUserPhone("");
    setNewUserRole("");
  };

  const filteredUsers = users.filter(
    (u) =>
      u.type === activeTab &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery))
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Manajemen User</Text>
            <Text style={styles.headerSub}>Kelola data pelanggan & staf laundry Anda</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setIsAddUserModalOpen(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Tambah User</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector (Pelanggan vs Staf Laundry) */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === "customer" && styles.toggleBtnActive]}
            onPress={() => setActiveTab("customer")}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, activeTab === "customer" && styles.toggleTextActive]}>
              Pelanggan ({users.filter((u) => u.type === "customer").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === "staff" && styles.toggleBtnActive]}
            onPress={() => setActiveTab("staff")}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, activeTab === "staff" && styles.toggleTextActive]}>
              Staf Laundry ({users.filter((u) => u.type === "staff").length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Cari nama ${activeTab === "customer" ? "pelanggan" : "staf"}...`}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* User List Cards */}
        <View style={styles.userList}>
          {filteredUsers.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.avatarCircle}>
                <UserIcon size={20} color="#0D7A53" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.userNameText}>{u.name}</Text>
                <View style={styles.userSubRow}>
                  <Phone size={12} color="#6B7280" />
                  <Text style={styles.userSubText}>{u.phone}</Text>
                </View>
              </View>

              <View style={styles.roleBadge}>
                {u.type === "customer" ? (
                  <ShoppingBag size={12} color="#0D7A53" />
                ) : (
                  <UserCheck size={12} color="#2563EB" />
                )}
                <Text style={[styles.roleBadgeText, u.type === "staff" && { color: "#2563EB" }]}>
                  {u.roleOrOrders}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Nav Footer */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_home")}>
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_order")}>
          <Package size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab(activeTab)}>
          <Users size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_pendapatan")}>
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_laundry_profil")}>
          <UserIcon size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Add User */}
      <Modal visible={isAddUserModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Tambah {activeTab === "customer" ? "Pelanggan" : "Staf Laundry"} Baru
              </Text>
              <TouchableOpacity onPress={() => setIsAddUserModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              value={newUserName}
              onChangeText={setNewUserName}
              placeholder="Nama"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>No. Telepon / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={newUserPhone}
              onChangeText={setNewUserPhone}
              placeholder="08123456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            {activeTab === "staff" && (
              <>
                <Text style={styles.label}>Peran / Tanggung Jawab Staf</Text>
                <TextInput
                  style={styles.input}
                  value={newUserRole}
                  onChangeText={setNewUserRole}
                  placeholder="Cth: Operator Cuci / Kurir Antar-Jemput"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleAddUser} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Simpan User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addBtnText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },

  tabToggleRow: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  toggleTextActive: {
    color: "#0D7A53",
  },

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

  userList: { gap: 12 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  userNameText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  userSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  userSubText: { fontSize: 12, color: "#6B7280" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 11, fontWeight: "800", color: "#0D7A53" },

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

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  dragHandle: { width: 36, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  label: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 14, height: 46, fontSize: 13, color: "#111827" },
  btnPrimary: { height: 48, backgroundColor: "#0D7A53", borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 },
  btnPrimaryText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});
