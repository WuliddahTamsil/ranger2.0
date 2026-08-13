import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
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
  Camera,
  X,
} from "lucide-react-native";

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
  rating: string;
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
  rating,
  navigate,
}) => {
  // Dialog modal visibility states
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Edit fields temp states
  const [tempName, setTempName] = useState(customerName);
  const [tempAddress, setTempAddress] = useState(customerAddress);
  const [tempLocation, setTempLocation] = useState(customerLocation);
  const [tempPhone, setTempPhone] = useState(customerPhone);

  const triggerInfoSheet = (title: string, msg: string) => {
    setInfoTitle(title);
    setInfoMessage(msg);
    setInfoModalVisible(true);
  };

  const handleSaveProfile = () => {
    if (tempName.trim() === "" || tempAddress.trim() === "" || tempLocation.trim() === "") {
      Alert.alert("Error", "Semua kolom wajib diisi.");
      return;
    }
    setCustomerName(tempName.trim());
    setCustomerAddress(tempAddress.trim());
    setCustomerLocation(tempLocation.trim());
    setCustomerPhone(tempPhone.trim());
    setEditProfileVisible(false);
    Alert.alert("Sukses", "Profil customer berhasil diperbarui.");
  };

  const handleLogout = () => navigate("login");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Green Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBg}>
              <User size={38} color="#1B7A4E" />
            </View>
            <TouchableOpacity 
              style={styles.cameraBtn}
              onPress={() => triggerInfoSheet("Foto Profil", "Fitur penggantian foto profil siap dihubungkan ke storage akun.")}
              activeOpacity={0.8}
            >
              <Camera size={14} color="#1B7A4E" />
            </TouchableOpacity>
          </View>

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
              <Text style={styles.statVal}>{rating}</Text>
              <Text style={styles.statLbl}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Section Label: Akun */}
        <Text style={styles.sectionLabel}>AKUN</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => {
              setTempName(customerName);
              setTempAddress(customerAddress);
              setTempLocation(customerLocation);
              setTempPhone(customerPhone);
              setEditProfileVisible(true);
            }}
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
            onPress={() => {
              setTempName(customerName);
              setTempAddress(customerAddress);
              setTempLocation(customerLocation);
              setTempPhone(customerPhone);
              setEditProfileVisible(true);
            }}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#E3F2FF" }]}>
              <MapPin size={16} color="#1685E5" />
            </View>
            <Text style={styles.menuLabel}>Alamat Tersimpan</Text>
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
            onPress={() => triggerInfoSheet("Bantuan & FAQ", "Pusat bantuan akan menampilkan FAQ dan kanal Customer Care setelah service terhubung.")}
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
            onPress={() => triggerInfoSheet("Privasi & Keamanan", "Data profil dan riwayat transaksi customer disimpan aman pada storage akun aplikasi Rangers.")}
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
            onPress={() => triggerInfoSheet("Pengaturan", "Pengaturan preferensi akun Anda akan tersedia pada update build berikutnya.")}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#F0F2F3" }]}>
              <Settings size={16} color="#78909C" />
            </View>
            <Text style={styles.menuLabel}>Pengaturan</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.logoutIconBg}>
            <LogOut size={16} color="#B91C1C" />
          </View>
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>

        {/* Footnote version */}
        <Text style={styles.footerVersion}>Rangers App v2.0 · PGE Kamojang</Text>
      </ScrollView>

      {/* 1. Modal Edit Profil / Alamat */}
      <Modal visible={editProfileVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Perbarui Profil & Alamat</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Lengkap Customer</Text>
              <TextInput
                style={styles.textInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Nama Lengkap"
              />

              <Text style={styles.inputLabel}>Nomor Telepon</Text>
              <TextInput
                style={styles.textInput}
                value={tempPhone}
                onChangeText={setTempPhone}
                placeholder="Nomor HP"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Alamat Pengiriman Lengkap</Text>
              <TextInput
                style={styles.textInput}
                value={tempAddress}
                onChangeText={setTempAddress}
                placeholder="Nama Jalan, Rt/Rw, Kelurahan, Kecamatan"
              />

              <Text style={styles.inputLabel}>Lokasi Singkat (Sektor / Ring)</Text>
              <TextInput
                style={styles.textInput}
                value={tempLocation}
                onChangeText={setTempLocation}
                placeholder="Contoh: Ring 1 Kamojang"
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setEditProfileVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Info Bottom Sheet */}
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
    </SafeAreaView>
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
    width: 80,
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
});
