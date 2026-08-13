import React, { useEffect, useState } from "react";
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
  Image,
  Alert,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  Pencil,
  MapPin,
  CreditCard,
  HelpCircle,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  Camera,
  Home,
  Building2,
  Users,
  Wallet,
  User,
  X,
  Check,
} from "lucide-react-native";

interface PemilikKosProfilProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const PemilikKosProfilScreen: React.FC<PemilikKosProfilProps> = ({ navigate, authAccount }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("profil");

  // User Profile State matching image
  const [name, setName] = useState(authAccount?.name || "");
  const [phone, setPhone] = useState(authAccount?.phone || "");
  const [badgeText, setBadgeText] = useState(authAccount?.roleData.businessName || "Usaha Kos");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<"edit" | "alamat" | "pembayaran" | "bantuan" | "privasi" | "pengaturan" | "logout" | null>(null);

  // Form Edit State
  const [editName, setEditName] = useState(name);
  const [editPhone, setEditPhone] = useState(phone);
  const [alamatKos, setAlamatKos] = useState(authAccount?.roleData.businessAddress || authAccount?.address || "");
  const [metodePembayaran, setMetodePembayaran] = useState("Belum diatur");

  useEffect(() => {
    if (!authAccount) return;
    setName(authAccount.name);
    setPhone(authAccount.phone);
    setBadgeText(authAccount.roleData.businessName || "Usaha Kos");
    setAlamatKos(authAccount.roleData.businessAddress || authAccount.address);
  }, [authAccount]);

  const handleSaveProfile = () => {
    setName(editName);
    setPhone(editPhone);
    setActiveModal(null);
  };

  const handleLogout = () => {
    setActiveModal(null);
    navigate("login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B7A4E" />

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header - mengikuti pola halaman profil customer */}
        <View style={styles.profileHeaderCard}>
          {/* Avatar Container */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <User size={48} color="#1B7A4E" />
              )}
            </View>

            {/* Camera Edit Badge */}
            <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
              <Camera size={14} color="#0D7A53" />
            </TouchableOpacity>
          </View>

          {/* Name & Subtitle */}
          <Text style={styles.profileName}>{name || "Nama Pemilik"}</Text>
          <Text style={styles.businessName}>{badgeText}</Text>
          <Text style={styles.profilePhone}>{phone || "Nomor belum diatur"}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{name.trim() && phone.trim() ? "Siap" : "-"}</Text>
              <Text style={styles.statLbl}>Profil</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{alamatKos.trim() ? "Ada" : "-"}</Text>
              <Text style={styles.statLbl}>Alamat</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>Aktif</Text>
              <Text style={styles.statLbl}>Status</Text>
            </View>
          </View>
        </View>

        {/* Section 1: AKUN */}
        <Text style={styles.sectionHeaderTitle}>AKUN</Text>
        <View style={styles.groupCard}>
          {/* Item 1: Edit Profil */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setEditName(name);
              setEditPhone(phone);
              setActiveModal("edit");
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#DCFCE7" }]}>
              <Pencil size={18} color="#0D7A53" />
            </View>
            <Text style={styles.menuTitle}>Edit Profil</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Item 2: Alamat Kos */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setActiveModal("alamat")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#DBEAFE" }]}>
              <MapPin size={18} color="#2563EB" />
            </View>
            <Text style={styles.menuTitle}>Alamat Kos</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Item 3: Metode Pembayaran */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => setActiveModal("pembayaran")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F3E8FF" }]}>
              <CreditCard size={18} color="#9333EA" />
            </View>
            <Text style={styles.menuTitle}>Metode Pembayaran</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Section 2: LAINNYA */}
        <Text style={styles.sectionHeaderTitle}>LAINNYA</Text>
        <View style={styles.groupCard}>
          {/* Item 1: Bantuan & FAQ */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setActiveModal("bantuan")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FEF3C7" }]}>
              <HelpCircle size={18} color="#D97706" />
            </View>
            <Text style={styles.menuTitle}>Bantuan & FAQ</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Item 2: Privasi & Keamanan */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setActiveModal("privasi")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F3F4F6" }]}>
              <Shield size={18} color="#4B5563" />
            </View>
            <Text style={styles.menuTitle}>Privasi & Keamanan</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Item 3: Pengaturan */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => setActiveModal("pengaturan")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F3F4F6" }]}>
              <Settings size={18} color="#4B5563" />
            </View>
            <Text style={styles.menuTitle}>Pengaturan</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Section 3: Logout Card */}
        <View style={styles.logoutGroupCard}>
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => setActiveModal("logout")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FEE2E2" }]}>
              <LogOut size={18} color="#DC2626" />
            </View>
            <Text style={[styles.menuTitle, styles.logoutText]}>Keluar</Text>
          </TouchableOpacity>
        </View>

        {/* Version Footer */}
        <Text style={styles.versionText}>Rangers App v2.0 • Pemilik Kos</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_home")}
          activeOpacity={0.7}
        >
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_kamar")}
          activeOpacity={0.7}
        >
          <Building2 size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Kamar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_penghuni")}
          activeOpacity={0.7}
        >
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Penghuni</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_laporan_keuangan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveNavTab("profil")}
          activeOpacity={0.7}
        >
          <User size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Edit Profil */}
      <Modal visible={activeModal === "edit"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profil</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nama"
            />

            <Text style={styles.label}>No. Telepon / WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="No. HP"
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveProfile} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Simpan Perubahan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Alamat Kos */}
      <Modal visible={activeModal === "alamat"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alamat Kos</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Alamat Lengkap Kos</Text>
            <TextInput
              style={[styles.input, { height: 80, paddingTop: 10 }]}
              value={alamatKos}
              onChangeText={setAlamatKos}
              multiline
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setActiveModal(null)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Simpan Alamat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Metode Pembayaran */}
      <Modal visible={activeModal === "pembayaran"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Metode Pembayaran</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Rekening Bank / QRIS Pembayaran</Text>
            <TextInput
              style={styles.input}
              value={metodePembayaran}
              onChangeText={setMetodePembayaran}
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setActiveModal(null)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Simpan Metode</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Logout Confirmation */}
      <Modal visible={activeModal === "logout"} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlayCenter}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.confirmCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.confirmTitle}>Konfirmasi Keluar</Text>
            <Text style={styles.confirmSub}>Apakah Anda yakin ingin keluar dari akun Pemilik Kos?</Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setActiveModal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnLogout}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.btnLogoutText}>Ya, Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
    paddingBottom: 20,
  },

  // Profile Header (Dark Green)
  profileHeaderCard: {
    backgroundColor: "#1B7A4E",
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  businessName: {
    fontSize: 13,
    color: "#E8F5EE",
    marginTop: 2,
    paddingHorizontal: 20,
    textAlign: "center",
  },
  profilePhone: {
    fontSize: 12,
    color: "#E8F5EE",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    width: "100%",
  },
  statCol: {
    width: 94,
    alignItems: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLbl: {
    fontSize: 10,
    color: "#E8F5EE",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // Section Titles
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
    letterSpacing: 0.8,
  },

  // Group Cards
  groupCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  logoutGroupCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 14,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  logoutText: {
    color: "#DC2626",
    fontWeight: "800",
  },

  // Footer Version
  versionText: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 24,
  },

  // Bottom Nav
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

  // Modals
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

  // Confirmation Modal
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmSub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  btnLogout: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  btnLogoutText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
