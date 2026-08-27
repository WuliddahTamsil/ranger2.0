import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  Linking,
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
  Clock,
  Shirt,
  MapPin,
  CheckCircle2,
  Calendar,
} from "lucide-react-native";
import { AuthAccount } from "../auth/authTypes";
import {
  fetchStoreCustomers,
  subscribeLaundry,
  LaundryCustomerSummary,
} from "../../services/laundryService";

interface StaffItem {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface LaundryUserScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const LaundryUserScreen: React.FC<LaundryUserScreenProps> = ({ navigate, authAccount }) => {
  const [activeTab, setActiveTab] = useState<"customer" | "staff">("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<LaundryCustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Staff state
  const [staffList, setStaffList] = useState<StaffItem[]>([
    { id: "1", name: "Mas Anton (Kurir)", phone: "0815-5544-4333", role: "Staf Penjemputan & Antar" },
    { id: "2", name: "Mbok Yem (Operator)", phone: "0817-7788-8999", role: "Staf Cuci & Pengering" },
    { id: "3", name: "Teh Nita", phone: "0819-1122-3344", role: "Staf Setrika Uap & Packing" },
  ]);

  // Modal Detail Riwayat Pelanggan
  const [selectedCustomer, setSelectedCustomer] = useState<LaundryCustomerSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modal Tambah Staf / Pelanggan Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRoleOrAddress, setNewUserRoleOrAddress] = useState("");

  const loadData = async () => {
    setLoading(true);
    const ownerId = authAccount?.id || "all";
    const data = await fetchStoreCustomers(ownerId);
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeLaundry(() => {
      loadData();
    });
    return unsub;
  }, []);

  const handleAddSubmit = () => {
    if (!newUserName) return;

    if (activeTab === "staff") {
      const newStaff: StaffItem = {
        id: Date.now().toString(),
        name: newUserName,
        phone: newUserPhone || "0812-0000-0000",
        role: newUserRoleOrAddress || "Staf Operasional Laundry",
      };
      setStaffList([...staffList, newStaff]);
    } else {
      const newCust: LaundryCustomerSummary = {
        id: `manual_${Date.now()}`,
        customerId: `manual_${Date.now()}`,
        name: newUserName,
        phone: newUserPhone || "0812-0000-0000",
        address: newUserRoleOrAddress || "Datang Langsung ke Toko",
        totalOrders: 1,
        totalSpent: 30000,
        lastOrderCode: `LND-${Math.floor(1000 + Math.random() * 9000)}`,
        lastOrderService: "Cuci Komplit (Cuci + Setrika)",
        lastOrderStatus: "SELESAI",
        lastOrderDate: new Date().toISOString(),
        orders: [
          {
            orderCode: `LND-${Math.floor(1000 + Math.random() * 9000)}`,
            serviceName: "Cuci Komplit (Cuci + Setrika)",
            totalAmount: 30000,
            status: "SELESAI",
            date: new Date().toISOString(),
          },
        ],
      };
      setCustomers([newCust, ...customers]);
    }

    setIsAddModalOpen(false);
    setNewUserName("");
    setNewUserPhone("");
    setNewUserRoleOrAddress("");
  };

  const handleOpenCustomerDetail = (cust: LaundryCustomerSummary) => {
    setSelectedCustomer(cust);
    setIsDetailModalOpen(true);
  };

  const handleCallPhone = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.lastOrderCode && c.lastOrderCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Manajemen User</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Data pelanggan riil & staf operasional toko
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#FFFFFF" />
          <Text style={styles.addBtnText}>
            {activeTab === "customer" ? "Tambah" : "+ Staf"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tab Toggle: Pelanggan Riil vs Staf Laundry */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === "customer" && styles.toggleBtnActive]}
            onPress={() => setActiveTab("customer")}
            activeOpacity={0.7}
          >
            <Users size={16} color={activeTab === "customer" ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.toggleText, activeTab === "customer" && styles.toggleTextActive]}>
              Pelanggan ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === "staff" && styles.toggleBtnActive]}
            onPress={() => setActiveTab("staff")}
            activeOpacity={0.7}
          >
            <UserIcon size={16} color={activeTab === "staff" ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.toggleText, activeTab === "staff" && styles.toggleTextActive]}>
              Staf Laundry ({staffList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              activeTab === "customer"
                ? "Cari nama customer, no hp, atau alamat..."
                : "Cari nama staf atau posisi..."
            }
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Content List */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0D7A53" />
          </View>
        ) : activeTab === "customer" ? (
          /* LIST PELANGGAN RIIL */
          filteredCustomers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Belum ada pelanggan yang order</Text>
              <Text style={styles.emptySub}>
                Customer yang membuat pesanan laundry ke toko Anda akan otomatis tercatat dan terlacak secara real-time di sini.
              </Text>
            </View>
          ) : (
            <View style={styles.userList}>
              {filteredCustomers.map((cust) => (
                <TouchableOpacity
                  key={cust.id || cust.customerId}
                  style={styles.customerCard}
                  onPress={() => handleOpenCustomerDetail(cust)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {cust.name ? cust.name.charAt(0).toUpperCase() : "C"}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={styles.customerName}>{cust.name}</Text>
                        <View style={styles.orderCountBadge}>
                          <ShoppingBag size={12} color="#0D7A53" />
                          <Text style={styles.orderCountBadgeText}>{cust.totalOrders} Order</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.phoneRow}
                        onPress={() => handleCallPhone(cust.phone)}
                        activeOpacity={0.7}
                      >
                        <Phone size={12} color="#6B7280" />
                        <Text style={styles.phoneText}>{cust.phone}</Text>
                      </TouchableOpacity>

                      {cust.address ? (
                        <View style={styles.addressRow}>
                          <MapPin size={12} color="#9CA3AF" />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {cust.address}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Order Footer Info */}
                  <View style={styles.cardBottomRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lastOrderLabel}>Order Terakhir:</Text>
                      <Text style={styles.lastOrderCode}>
                        {cust.lastOrderCode} • {cust.lastOrderService}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.totalSpentLabel}>Total Transaksi:</Text>
                      <Text style={styles.totalSpentValue}>
                        Rp {(cust.totalSpent || 0).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : (
          /* LIST STAF LAUNDRY */
          filteredStaff.length === 0 ? (
            <View style={styles.emptyContainer}>
              <UserIcon size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Belum ada data staf</Text>
              <Text style={styles.emptySub}>Klik tombol "+ Staf" di atas untuk menambahkan tim operasional Anda.</Text>
            </View>
          ) : (
            <View style={styles.userList}>
              {filteredStaff.map((staff) => (
                <View key={staff.id} style={styles.staffCard}>
                  <View style={[styles.avatarCircle, { backgroundColor: "#E0F2FE" }]}>
                    <UserIcon size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.customerName}>{staff.name}</Text>
                    <Text style={styles.staffRoleText}>{staff.role}</Text>
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => handleCallPhone(staff.phone)}
                      activeOpacity={0.7}
                    >
                      <Phone size={12} color="#6B7280" />
                      <Text style={styles.phoneText}>{staff.phone}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Modal Detail Riwayat Pesanan Customer */}
      <Modal visible={isDetailModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.avatarCircleLarge}>
                <Text style={styles.avatarInitialLarge}>
                  {selectedCustomer?.name ? selectedCustomer.name.charAt(0).toUpperCase() : "C"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalCustName}>{selectedCustomer?.name}</Text>
                <Text style={styles.modalCustPhone}>📞 {selectedCustomer?.phone}</Text>
                <Text style={styles.modalCustAddress} numberOfLines={1}>📍 {selectedCustomer?.address}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Summary Box */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Order</Text>
                <Text style={styles.summaryValue}>{selectedCustomer?.totalOrders || 0}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Transaksi</Text>
                <Text style={[styles.summaryValue, { color: "#0D7A53" }]}>
                  Rp {(selectedCustomer?.totalSpent || 0).toLocaleString("id-ID")}
                </Text>
              </View>
            </View>

            {/* Order History */}
            <Text style={styles.historySectionTitle}>Daftar Pesanan di Toko Anda:</Text>
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {selectedCustomer?.orders && selectedCustomer.orders.length > 0 ? (
                selectedCustomer.orders.map((ord, idx) => (
                  <View key={idx} style={styles.historyCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyCode}>{ord.orderCode}</Text>
                      <Text style={styles.historyService}>{ord.serviceName}</Text>
                      <Text style={styles.historyDate}>
                        {ord.date ? new Date(ord.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.historyAmount}>
                        Rp {(ord.totalAmount || 0).toLocaleString("id-ID")}
                      </Text>
                      <View style={styles.historyStatusPill}>
                        <Text style={styles.historyStatusText}>{ord.status.replace(/_/g, " ")}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", paddingVertical: 20 }}>
                  Belum ada riwayat detail.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCloseModal}
              onPress={() => setIsDetailModalOpen(false)}
            >
              <Text style={styles.btnCloseModalText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Staf / Pelanggan Manual */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>
              {activeTab === "staff" ? "Tambah Staf Laundry" : "Tambah Pelanggan Offline"}
            </Text>
            <Text style={styles.modalSub}>
              {activeTab === "staff"
                ? "Daftarkan staf penjemputan, operator cuci, atau setrika."
                : "Catat pelanggan offline/walk-in ke sistem toko Anda."}
            </Text>

            <Text style={styles.inputLabel}>Nama Lengkap <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="Contoh: Siti Aminah / Budi"
              placeholderTextColor="#9CA3AF"
              value={newUserName}
              onChangeText={setNewUserName}
            />

            <Text style={styles.inputLabel}>Nomor WhatsApp / HP</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Contoh: 0812-3456-7890"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={newUserPhone}
              onChangeText={setNewUserPhone}
            />

            <Text style={styles.inputLabel}>
              {activeTab === "staff" ? "Posisi / Tugas Staf" : "Alamat Pelanggan"}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={activeTab === "staff" ? "Contoh: Kurir / Operator Setrika" : "Contoh: Jl. Kamojang No. 12"}
              placeholderTextColor="#9CA3AF"
              value={newUserRoleOrAddress}
              onChangeText={setNewUserRoleOrAddress}
            />

            <TouchableOpacity
              style={styles.btnSubmitAdd}
              onPress={handleAddSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSubmitAddText}>Simpan Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancelAdd}
              onPress={() => setIsAddModalOpen(false)}
            >
              <Text style={styles.btnCancelAddText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
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
          onPress={() => navigate("pemilik_laundry_order")}
          activeOpacity={0.7}
        >
          <Package size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => loadData()}
          activeOpacity={0.7}
        >
          <Users size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>User</Text>
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
          <UserIcon size={22} color="#9CA3AF" />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  headerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7A53",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  tabToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#0D7A53",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  toggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  userList: {
    gap: 10,
  },
  customerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0D7A53",
  },
  customerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  orderCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  orderCountBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  addressText: {
    fontSize: 11,
    color: "#9CA3AF",
    flex: 1,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  lastOrderLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  lastOrderCode: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginTop: 1,
  },
  totalSpentLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  totalSpentValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 1,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  staffRoleText: {
    fontSize: 12,
    color: "#0284C7",
    fontWeight: "700",
    marginTop: 1,
  },

  // Modal Detail
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
    maxHeight: "85%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarCircleLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialLarge: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0D7A53",
  },
  modalCustName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  modalCustPhone: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 1,
  },
  modalCustAddress: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  summaryBox: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  historyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  historyCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  historyService: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 1,
  },
  historyDate: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  historyStatusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  historyStatusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#166534",
  },
  btnCloseModal: {
    backgroundColor: "#F3F4F6",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  btnCloseModalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  // Add Modal
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  modalSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: "#111827",
    marginBottom: 10,
  },
  btnSubmitAdd: {
    backgroundColor: "#0D7A53",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnSubmitAddText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnCancelAdd: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnCancelAddText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },

  // Bottom Nav
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
    color: "#0D7A53",
    fontWeight: "800",
  },
});
