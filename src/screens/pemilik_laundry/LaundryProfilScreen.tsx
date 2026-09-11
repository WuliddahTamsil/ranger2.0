import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { SafeAreaBottomBar } from "../../components/SafeAreaBottomBar";
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
  Alert,
  Image,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { ProfilePhotoEditor } from "../../components/ProfilePhotoEditor";
import {
  Pencil,
  MapPin,
  HelpCircle,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  Home,
  Package,
  Users,
  Wallet,
  User,
  X,
  Shirt,
  Plus,
  CheckCircle2,
  Trash2,
  QrCode,
  Building2,
} from "lucide-react-native";
import {
  getSelectedStore,
  saveMyLaundryStore,
  setSelectedStore,
  fetchMyLaundryStore,
  LaundryStore,
  LaundryServiceItem,
} from "../../services/laundryService";

interface LaundryProfilProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const LaundryProfilScreen: React.FC<LaundryProfilProps> = ({ navigate, authAccount }) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [store, setStore] = useState<LaundryStore>({
    id: authAccount?.id || "my_store",
    ownerId: authAccount?.id || "",
    storeName: authAccount?.roleData?.businessName || authAccount?.name || "Toko Laundry Saya",
    address: authAccount?.address || "Kamojang, Jawa Barat",
    phone: authAccount?.phone || "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
    qrisImageUrl: "",
    services: [],
  });
  const [profilePhoto, setProfilePhoto] = useState(authAccount?.profilePhoto || "");

  // Edit Services Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [servicesList, setServicesList] = useState<LaundryServiceItem[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceUnit, setNewServiceUnit] = useState<"kg" | "pcs">("kg");
  const [newServiceCategory, setNewServiceCategory] = useState<"biasa" | "ekspres" | "satuan">("biasa");

  // Edit Payment (Bank & QRIS) Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");

  const loadStoreData = async () => {
    if (!authAccount?.id) return;
    const currentStore = await fetchMyLaundryStore(authAccount.id);
    if (currentStore) {
      setStore(currentStore);
      setServicesList(currentStore.services || []);
      setBankName(currentStore.bankName || "BCA");
      setBankAccountNumber(currentStore.bankAccountNumber || "");
      setBankAccountHolder(currentStore.bankAccountHolder || authAccount?.name || "");
      setQrisImageUrl(currentStore.qrisImageUrl || "");
    }
  };

  useEffect(() => {
    loadStoreData();
  }, [authAccount?.id]);

  useEffect(() => {
    setProfilePhoto(authAccount?.profilePhoto || "");
  }, [authAccount?.profilePhoto]);

  const displayName = authAccount?.name || "Pemilik Laundry";
  const displayPhone = authAccount?.phone || "0812-xxxx-xxxx";
  const businessName = store.storeName || authAccount?.roleData?.businessName || authAccount?.name || "Toko Laundry Saya";

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    navigate("login");
  };

  const handleSavePaymentSettings = async () => {
    if (!bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      Alert.alert("Input Kurang", "Harap lengkapi nomor rekening dan nama pemilik rekening.");
      return;
    }
    const updatedStore: LaundryStore = {
      ...store,
      ownerId: authAccount?.id || store.ownerId,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountHolder: bankAccountHolder.trim(),
      qrisImageUrl: qrisImageUrl.trim(),
    };
    setSelectedStore(updatedStore);
    setStore(updatedStore);
    await saveMyLaundryStore(updatedStore);
    setIsPaymentModalOpen(false);
    Alert.alert("Berhasil", "Data Rekening Bank & QRIS toko berhasil disimpan. Customer akan langsung melihat metode pembayaran ini saat checkout!");
  };

  const handleAddService = () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) {
      Alert.alert("Input Kurang", "Harap isi nama paket dan harga tarif.");
      return;
    }
    const priceNum = parseInt(newServicePrice.replace(/\D/g, ""), 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Harga Tidak Valid", "Masukkan nominal harga yang benar.");
      return;
    }

    const newItem: LaundryServiceItem = {
      id: `svc_${Date.now()}`,
      name: newServiceName.trim(),
      desc: "Layanan cuci berkualitas",
      price: priceNum,
      unit: newServiceUnit,
      category: newServiceCategory,
      isActive: true,
    };

    const updated = [...servicesList, newItem];
    setServicesList(updated);
    setNewServiceName("");
    setNewServicePrice("");
  };

  const handleDeleteService = (idx: number) => {
    const updated = servicesList.filter((_, i) => i !== idx);
    setServicesList(updated);
  };

  const handleSaveServices = async () => {
    const updatedStore: LaundryStore = {
      ...store,
      services: servicesList,
    };
    setSelectedStore(updatedStore);
    setStore(updatedStore);
    await saveMyLaundryStore(updatedStore);
    setIsServiceModalOpen(false);
    Alert.alert("Berhasil", "Daftar layanan toko laundry berhasil diperbarui dan langsung tampil di pencarian Customer!");
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B7A4E" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <ProfilePhotoEditor
            userId={authAccount?.id}
            name={displayName}
            photoUri={profilePhoto}
            size={96}
            onSaved={setProfilePhoto}
          />
          <Text style={styles.ownerName}>{displayName}</Text>
          <Text style={styles.storeName}>{businessName}</Text>
          <Text style={styles.profilePhone}>{displayPhone}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{store.services?.length || 5}</Text>
              <Text style={styles.statLbl}>Layanan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>4.8</Text>
              <Text style={styles.statLbl}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>Aktif</Text>
              <Text style={styles.statLbl}>Mitra</Text>
            </View>
          </View>
        </View>

        {/* Group TOKO & LAYANAN */}
        <Text style={styles.sectionTitle}>PENGATURAN TOKO & PEMBAYARAN</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setBankName(store.bankName || "BCA");
              setBankAccountNumber(store.bankAccountNumber || "");
              setBankAccountHolder(store.bankAccountHolder || authAccount?.name || "");
              setQrisImageUrl(store.qrisImageUrl || "");
              setIsPaymentModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: "#FEF3C7" }]}>
              <Wallet size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Rekening Bank & QRIS Toko</Text>
              <Text style={[styles.menuSubText, !store.bankAccountNumber && { color: "#D97706", fontWeight: "600" }]}>
                {store.bankAccountNumber
                  ? `${store.bankName || "Bank"} • ${store.bankAccountNumber} (${store.bankAccountHolder || displayName})`
                  : "Belum diatur (Tekan untuk mengatur rekening & QRIS)"}
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setServicesList(store.services || []);
              setIsServiceModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
              <Shirt size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Kelola Paket Layanan & Harga</Text>
              <Text style={styles.menuSubText}>{store.services?.length || 5} paket aktif (Kiloan, Express, dll)</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.iconBg, { backgroundColor: "#DBEAFE" }]}>
              <MapPin size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Alamat & Jam Operasional</Text>
              <Text style={styles.menuSubText}>{store.address}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
            <View style={[styles.iconBg, { backgroundColor: "#F3E8FF" }]}>
              <Pencil size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Edit Nama & Banner Outlet</Text>
              <Text style={styles.menuSubText}>Tampilan di halaman pencarian customer</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Group LAINNYA */}
        <Text style={styles.sectionTitle}>LAINNYA</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.iconBg, { backgroundColor: "#F3F4F6" }]}>
              <HelpCircle size={18} color="#4B5563" />
            </View>
            <Text style={styles.menuText}>Pusat Bantuan & Panduan Mitra</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
            <View style={[styles.iconBg, { backgroundColor: "#F3F4F6" }]}>
              <Shield size={18} color="#4B5563" />
            </View>
            <Text style={styles.menuText}>Kebijakan & Privasi</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Card */}
        <View style={styles.logoutCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => setIsLogoutModalOpen(true)} activeOpacity={0.7}>
            <View style={[styles.iconBg, { backgroundColor: "#FEE2E2" }]}>
              <LogOut size={18} color="#DC2626" />
            </View>
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>GEOVERSE 2.0 • Mitra Pemilik Laundry</Text>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <SafeAreaBottomBar absolute style={styles.bottomNav}>
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

        <TouchableOpacity style={styles.navTab} onPress={() => {}}>
          <User size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Profil</Text>
        </TouchableOpacity>
      </SafeAreaBottomBar>

      {/* Modal: Kelola Layanan & Harga */}
      <Modal visible={isServiceModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Kelola Paket & Tarif Laundry</Text>
              <TouchableOpacity onPress={() => setIsServiceModalOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Form Tambah Layanan Baru */}
              <View style={styles.addServiceBox}>
                <Text style={styles.addServiceTitle}>+ Tambah Paket Layanan Baru</Text>

                <TextInput
                  style={styles.inputField}
                  placeholder="Nama Paket (misal: Cuci Karpet Tebal)"
                  placeholderTextColor="#9CA3AF"
                  value={newServiceName}
                  onChangeText={setNewServiceName}
                />

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TextInput
                    style={[styles.inputField, { flex: 1 }]}
                    placeholder="Tarif (Rp)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={newServicePrice}
                    onChangeText={setNewServicePrice}
                  />

                  {/* Satuan selector */}
                  <TouchableOpacity
                    style={styles.unitSelectorBtn}
                    onPress={() => setNewServiceUnit(newServiceUnit === "kg" ? "pcs" : "kg")}
                  >
                    <Text style={styles.unitSelectorText}>Satuan: /{newServiceUnit}</Text>
                  </TouchableOpacity>
                </View>

                {/* Kategori Selector */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  {(["biasa", "ekspres", "satuan"] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, newServiceCategory === cat && styles.catChipActive]}
                      onPress={() => setNewServiceCategory(cat)}
                    >
                      <Text style={[styles.catChipText, newServiceCategory === cat && styles.catChipTextActive]}>
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.btnAddServiceSubmit} onPress={handleAddService} activeOpacity={0.8}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.btnAddServiceSubmitText}>Tambahkan ke Daftar</Text>
                </TouchableOpacity>
              </View>

              {/* Daftar Layanan Saat Ini */}
              <Text style={[styles.sectionTitle, { marginLeft: 0, marginTop: 14 }]}>DAFTAR LAYANAN AKTIF</Text>
              <View style={styles.serviceItemsList}>
                {servicesList.map((item, idx) => (
                  <View key={idx} style={styles.serviceItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceItemName}>{item.name}</Text>
                      <Text style={styles.serviceItemPrice}>
                        Rp {item.price.toLocaleString("id-ID")}/{item.unit} •{" "}
                        <Text style={{ textTransform: "capitalize", color: "#0D7A53" }}>{item.category || "biasa"}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteService(idx)} style={styles.btnTrash}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnSaveAll} onPress={handleSaveServices} activeOpacity={0.85}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnSaveAllText}>Simpan Perubahan Toko</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Rekening Bank & QRIS Toko */}
      <Modal visible={isPaymentModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Rekening Bank & QRIS Toko</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.paymentModalNotice}>
                Customer wajib membayar non-tunai (Transfer Bank / Scan QRIS Toko Anda) sebelum cucian bersih dapat diantar oleh kurir.
              </Text>

              {/* Pilihan Bank */}
              <Text style={styles.formFieldLabel}>PILIH NAMA BANK</Text>
              <View style={styles.bankPillsRow}>
                {["BCA", "BRI", "Mandiri", "BNI", "BSI"].map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankPill, bankName === b && styles.bankPillActive]}
                    onPress={() => setBankName(b)}
                  >
                    <Text style={[styles.bankPillText, bankName === b && styles.bankPillTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formFieldLabel}>NOMOR REKENING</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Contoh: 8035129988"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
              />

              <Text style={styles.formFieldLabel}>ATAS NAMA (PEMILIK REKENING)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Contoh: Ais Laundry Management"
                placeholderTextColor="#9CA3AF"
                value={bankAccountHolder}
                onChangeText={setBankAccountHolder}
              />

              {/* QRIS Toko Preview */}
              <Text style={styles.formFieldLabel}>URL / PRESET QRIS TOKO</Text>
              <TextInput
                style={styles.inputField}
                placeholder="URL Gambar QRIS Toko"
                placeholderTextColor="#9CA3AF"
                value={qrisImageUrl}
                onChangeText={setQrisImageUrl}
              />

              <View style={styles.qrisPreviewBox}>
                <Text style={styles.qrisPreviewTitle}>Preview QRIS Pembayaran Customer:</Text>
                {qrisImageUrl ? (
                  <Image
                    source={{ uri: qrisImageUrl }}
                    style={styles.qrisImageStyle}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.qrisPlaceholder}>
                    <QrCode size={48} color="#9CA3AF" />
                    <Text style={styles.qrisPlaceholderText}>QRIS Toko Belum Diatur</Text>
                  </View>
                )}
                <Text style={styles.qrisMerchantName}>{store.storeName || "Ais Laundry"}</Text>
                <Text style={styles.qrisNmidText}>NMID: ID1023249012 • Merchant G-Pay / All e-Wallet</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnSaveAll} onPress={handleSavePaymentSettings} activeOpacity={0.85}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnSaveAllText}>Simpan Pengaturan Pembayaran</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={isLogoutModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Konfirmasi Keluar</Text>
            <Text style={styles.confirmSub}>Apakah Anda yakin ingin keluar dari akun Pemilik Laundry?</Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setIsLogoutModalOpen(false)}>
                <Text style={styles.btnCancelText}>Tidak</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
                <Text style={styles.btnLogoutText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingBottom: 20 },
  profileHeader: {
    backgroundColor: "#1B7A4E",
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  ownerName: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  storeName: { fontSize: 13, color: "#D1FAE5", marginTop: 2, fontWeight: "600" },
  profilePhone: { fontSize: 12, color: "#A7F3D0", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: "center",
  },
  statCol: { alignItems: "center", minWidth: 60 },
  statVal: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  statLbl: { fontSize: 11, color: "#D1FAE5", marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: "rgba(255, 255, 255, 0.3)", marginHorizontal: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 20,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  menuSubText: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  logoutCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    overflow: "hidden",
  },
  logoutText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },
  versionText: { fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 20 },
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
  navTab: { alignItems: "center", flex: 1 },
  navText: { fontSize: 10, color: "#9CA3AF", marginTop: 4, fontWeight: "600" },
  navTextActive: { color: "#0D7A53", fontWeight: "800" },

  // Service Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  addServiceBox: { backgroundColor: "#F9FAFB", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  addServiceTitle: { fontSize: 13, fontWeight: "800", color: "#0D7A53", marginBottom: 10 },
  inputField: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: "#111827" },
  unitSelectorBtn: { backgroundColor: "#E8F5EE", borderRadius: 10, paddingHorizontal: 12, justifyContent: "center", alignItems: "center" },
  unitSelectorText: { fontSize: 12, fontWeight: "700", color: "#0D7A53" },
  catChip: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", backgroundColor: "#FFFFFF" },
  catChipActive: { backgroundColor: "#0D7A53", borderColor: "#0D7A53" },
  catChipText: { fontSize: 10, fontWeight: "700", color: "#6B7280" },
  catChipTextActive: { color: "#FFFFFF" },
  btnAddServiceSubmit: { backgroundColor: "#0D7A53", height: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  btnAddServiceSubmitText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  serviceItemsList: { gap: 8, marginTop: 8 },
  serviceItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#F3F4F6" },
  serviceItemName: { fontSize: 13, fontWeight: "800", color: "#111827" },
  serviceItemPrice: { fontSize: 12, color: "#4B5563", marginTop: 2 },
  btnTrash: { padding: 6 },
  btnSaveAll: { backgroundColor: "#0D7A53", height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  btnSaveAllText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  // Payment Modal Specific Styles
  paymentModalNotice: { fontSize: 12, color: "#065F46", backgroundColor: "#D1FAE5", padding: 12, borderRadius: 10, lineHeight: 17, marginBottom: 12, fontWeight: "600" },
  formFieldLabel: { fontSize: 11, fontWeight: "800", color: "#4B5563", marginTop: 12, marginBottom: 6, letterSpacing: 0.5 },
  bankPillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  bankPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  bankPillActive: { backgroundColor: "#0D7A53", borderColor: "#0D7A53" },
  bankPillText: { fontSize: 12, fontWeight: "800", color: "#4B5563" },
  bankPillTextActive: { color: "#FFFFFF" },
  qrisPreviewBox: { marginTop: 14, backgroundColor: "#F9FAFB", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  qrisPreviewTitle: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 10, alignSelf: "flex-start" },
  qrisImageStyle: { width: 170, height: 170, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  qrisPlaceholder: { width: 170, height: 170, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  qrisPlaceholderText: { fontSize: 11, color: "#9CA3AF", marginTop: 6, fontWeight: "600" },
  qrisMerchantName: { fontSize: 13, fontWeight: "800", color: "#111827", marginTop: 8 },
  qrisNmidText: { fontSize: 10, color: "#6B7280", marginTop: 2 },

  // Center Confirm Modal
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, width: "100%", maxWidth: 320, alignItems: "center" },
  confirmTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  confirmSub: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 6, marginBottom: 16 },
  confirmBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  btnCancel: { flex: 1, height: 42, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  btnCancelText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  btnLogout: { flex: 1, height: 42, borderRadius: 10, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  btnLogoutText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});
