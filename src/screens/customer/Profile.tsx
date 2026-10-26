import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import {
  User,
  MapPin,
  CreditCard,
  Gift,
  HelpCircle,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Trash2,
  ExternalLink,
} from "lucide-react-native";
import { ProfilePhotoEditor } from "../../components/ProfilePhotoEditor";
import { LogoutConfirmModal } from "../../components/LogoutConfirmModal";
import { AuthAccount } from "../auth/authTypes";
import { deleteUserAccount, API_BASE_URL } from "../../services/api";

interface ProfileProps {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  customerLocation: string;
  setCustomerLocation: (location: string) => void;
  orderCount: number;
  wishlistCount: number;
  reviewCount: string;
  authAccount?: AuthAccount | null;
  profilePhoto?: string;
  setProfilePhoto?: (photoUri: string) => void;
  navigate: (screen: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  customerLocation,
  setCustomerLocation,
  orderCount,
  wishlistCount,
  reviewCount,
  authAccount,
  profilePhoto,
  setProfilePhoto,
  navigate,
}) => {
  // Dialog modal visibility states
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const triggerInfoSheet = (title: string, msg: string) => {
    setInfoTitle(title);
    setInfoMessage(msg);
    setInfoModalVisible(true);
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    navigate("login");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hapus Akun Pengguna",
      "Apakah Anda yakin ingin menghapus akun GEOVERSE beserta seluruh data profil dan riwayat pesanan Anda secara permanen?\n\nSesuai standar privasi Apple, tindakan ini tidak dapat dibatalkan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Akun",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              const res = await deleteUserAccount(authAccount?.id);
              setIsDeletingAccount(false);
              if (res.success) {
                setSettingsModalVisible(false);
                Alert.alert(
                  "Akun Dihapus",
                  "Akun Anda telah berhasil dihapus secara permanen dari basis data GEOVERSE.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        navigate("login");
                      },
                    },
                  ]
                );
              } else {
                Alert.alert("Gagal", res.message || "Gagal memproses penghapusan akun. Silakan coba kembali.");
              }
            } catch (err: any) {
              setIsDeletingAccount(false);
              Alert.alert("Error", err.message || "Terjadi kendala saat menghapus akun.");
            }
          },
        },
      ]
    );
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Green Header */}
        <View style={styles.profileHeader}>
          <ProfilePhotoEditor
            userId={authAccount?.id}
            name={customerName}
            photoUri={profilePhoto || authAccount?.profilePhoto}
            size={96}
            onSaved={(photoUri) => setProfilePhoto?.(photoUri)}
          />

          <Text style={styles.customerNameText} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.customerPhoneText}>{customerPhone || "Nomor belum diatur"}</Text>

          {/* Stat Row details */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{orderCount}</Text>
              <Text style={styles.statLbl}>Pesanan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{wishlistCount}</Text>
              <Text style={styles.statLbl}>Wishlist</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{reviewCount}</Text>
              <Text style={styles.statLbl}>Ulasan</Text>
            </View>
          </View>
        </View>

        {/* Section Label: Akun */}
        <Text style={styles.sectionLabel}>AKUN</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => navigate("c_addresses")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#E8F5EE" }]}>
              <User size={16} color="#1B7A4E" />
            </View>
            <Text style={styles.menuLabel}>Edit Profil</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => navigate("c_addresses")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#E3F2FF" }]}>
              <MapPin size={16} color="#1685E5" />
            </View>
            <Text style={styles.menuLabel}>Alamat Saya</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => triggerInfoSheet("Metode Pembayaran", "Metode pembayaran akan mengikuti layanan pembayaran yang terhubung di checkout.")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F5E4F8" }]}>
              <CreditCard size={16} color="#AE35C7" />
            </View>
            <Text style={styles.menuLabel}>Metode Pembayaran</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Section Label: Lainnya */}
        <Text style={styles.sectionLabel}>LAINNYA</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => triggerInfoSheet("Voucher & Promo", "Voucher dan promo menarik dapat Anda temukan di banner halaman Beranda.")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FFF0DF" }]}>
              <Gift size={16} color="#FF7043" />
            </View>
            <Text style={styles.menuLabel}>Voucher & Promo</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => triggerInfoSheet("Bantuan & FAQ", "Pusat Bantuan & Layanan Pelanggan GEOVERSE:\n\n• Email Dukungan: support@geoverse.id\n• Hotline/WhatsApp: +62 878-0598-7309\n• Jam Operasional: 24 Jam Setiap Hari\n• Area Layanan: Kawasan PGE Kamojang, Ibun, Paseh, Majalaya & Sekitarnya.\n\nTim kami siap membantu kendala perjalanan ojek, pesanan kuliner, maupun reservasi penginapan Anda.")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FFF5D8" }]}>
              <HelpCircle size={16} color="#FF9F00" />
            </View>
            <Text style={styles.menuLabel}>Bantuan & FAQ</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => triggerInfoSheet("Privasi & Keamanan", "Kebijakan Privasi & Perlindungan Data GEOVERSE:\n\n• Seluruh data akun & transaksi dienkripsi dengan standar keamanan tinggi.\n• Izin lokasi & kamera hanya digunakan saat Anda melakukan pemesanan aktif atau mengunggah bukti dokumen/foto.\n• Pengguna memiliki hak penuh untuk meminta penghapusan akun beserta data pribadi secara permanen melalui menu Pengaturan.")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#E9EEF0" }]}>
              <Shield size={16} color="#607D8B" />
            </View>
            <Text style={styles.menuLabel}>Privasi & Keamanan</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => setSettingsModalVisible(true)}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F0F2F3" }]}>
              <Settings size={16} color="#78909C" />
            </View>
            <Text style={styles.menuLabel}>Pengaturan</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.7}>
          <View style={styles.logoutIconBg}>
            <LogOut size={16} color="#B91C1C" />
          </View>
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>

        {/* Footnote version */}
        <Text style={styles.footerVersion}>GEOVERSE 2.0 · PGE Kamojang</Text>
      </ScrollView>

      <LogoutConfirmModal
        visible={logoutModalVisible}
        roleLabel="Customer"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={handleLogout}
      />

      {/* Modal Info Bottom Sheet */}
      <Modal visible={infoModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{infoTitle}</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.infoMessageText}>{infoMessage}</Text>

            <TouchableOpacity 
              style={styles.sheetBtnClose}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.sheetBtnCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Settings & Account Deletion (Apple Guideline 5.1.1(v) Compliant) */}
      <Modal visible={settingsModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pengaturan Akun</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Account summary box */}
              <View style={styles.settingsSectionBox}>
                <Text style={styles.settingsSectionTitle}>Informasi Akun</Text>
                <View style={styles.settingsItemRow}>
                  <Text style={styles.settingsItemLabel}>Nama Pengguna</Text>
                  <Text style={styles.settingsItemValue}>{customerName || "-"}</Text>
                </View>
                <View style={styles.settingsItemRow}>
                  <Text style={styles.settingsItemLabel}>Email Akun</Text>
                  <Text style={styles.settingsItemValue}>{authAccount?.email || "customer@geoverse.id"}</Text>
                </View>
                <View style={styles.settingsItemRow}>
                  <Text style={styles.settingsItemLabel}>Nomor Telepon</Text>
                  <Text style={styles.settingsItemValue}>{customerPhone || "Belum diatur"}</Text>
                </View>
                <View style={styles.settingsItemRow}>
                  <Text style={styles.settingsItemLabel}>Tipe Akun</Text>
                  <Text style={[styles.settingsItemValue, { color: "#1B7A4E", fontWeight: "700" }]}>Pengguna (Customer)</Text>
                </View>
              </View>

              {/* Legal & Policy Links */}
              <View style={styles.settingsSectionBox}>
                <Text style={styles.settingsSectionTitle}>Legalitas & Kebijakan</Text>
                <TouchableOpacity
                  style={styles.settingsLinkRow}
                  onPress={() => {
                    const url = `${API_BASE_URL}/privacy`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert("Kebijakan Privasi", `Kunjungi kebijakan privasi kami di ${url}`);
                    });
                  }}
                >
                  <Text style={styles.settingsLinkText}>Kebijakan Privasi GEOVERSE</Text>
                  <ExternalLink size={16} color="#1B7A4E" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsLinkRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    const url = `${API_BASE_URL}/support`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert("Bantuan & Dukungan", `Kunjungi laman dukungan kami di ${url}`);
                    });
                  }}
                >
                  <Text style={styles.settingsLinkText}>Dukungan & Layanan Pengguna</Text>
                  <ExternalLink size={16} color="#1B7A4E" />
                </TouchableOpacity>
              </View>

              {/* Apple Guideline 5.1.1(v) Compliant Account Deletion Box */}
              <View style={styles.dangerZoneBox}>
                <View style={styles.dangerZoneHeader}>
                  <View style={styles.dangerIconBg}>
                    <Trash2 size={16} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dangerZoneTitle}>Hapus Akun Pengguna</Text>
                    <Text style={styles.dangerZoneDesc}>
                      Sesuai pedoman privasi App Store, Anda berhak menghapus akun beserta seluruh data pribadi secara permanen.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  activeOpacity={0.7}
                >
                  {isDeletingAccount ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.deleteAccountBtnText}>Hapus Akun Secara Permanen</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.sheetBtnClose}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.sheetBtnCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    paddingBottom: 28,
  },
  profileHeader: {
    backgroundColor: "#1B7A4E",
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.45)",
  },
  cameraBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  customerNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  customerPhoneText: {
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
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLbl: {
    fontSize: 10,
    color: "#E8F5EE",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 16,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 60,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 12,
    marginTop: 20,
  },
  logoutIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B91C1C",
    marginLeft: 12,
  },
  footerVersion: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 24,
  },
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  formScroll: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnOutline: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sheetBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  sheetBtnTextOutline: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "800",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  infoMessageText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginVertical: 12,
  },
  sheetBtnClose: {
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  sheetBtnCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  settingsSectionBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  settingsItemLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  settingsItemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  settingsLinkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  settingsLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1B7A4E",
  },
  dangerZoneBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 10,
  },
  dangerZoneHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dangerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
  },
  dangerZoneDesc: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 16,
    marginTop: 2,
  },
  deleteAccountBtn: {
    backgroundColor: "#DC2626",
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAccountBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
