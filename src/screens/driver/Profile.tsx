import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  Switch,
  Alert,
} from "react-native";
import {
  User,
  Bike,
  FileText,
  CreditCard,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  X,
  CheckCircle2,
  Camera,
} from "lucide-react-native";

interface ProfileProps {
  driverInfo: {
    name: string;
    phone: string;
    email: string;
    rating: number;
    avatarLetter: string;
    vehicle: {
      type: string;
      brand: string;
      plate: string;
      year: string;
      verified: boolean;
    };
    documents: {
      ktp: "Terverifikasi" | "Menunggu Verifikasi" | "Belum Lengkap";
      sim: "Terverifikasi" | "Menunggu Verifikasi" | "Belum Lengkap";
      stnk: "Terverifikasi" | "Menunggu Verifikasi" | "Belum Lengkap";
      skck: "Terverifikasi" | "Menunggu Verifikasi" | "Belum Lengkap";
    };
    payment: {
      bankName: string;
      accountNo: string;
      holderName: string;
      gopayNo: string;
    };
  };
  setDriverInfo: (info: any) => void;
  navigate: (screen: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ driverInfo, setDriverInfo, navigate }) => {
  // Modal states
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [prefModalVisible, setPrefModalVisible] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState(driverInfo.name);
  const [editPhone, setEditPhone] = useState(driverInfo.phone);

  const [editBrand, setEditBrand] = useState(driverInfo.vehicle.brand);
  const [editPlate, setEditPlate] = useState(driverInfo.vehicle.plate);
  const [editYear, setEditYear] = useState(driverInfo.vehicle.year);

  const [editBank, setEditBank] = useState(driverInfo.payment.bankName);
  const [editAccNo, setEditAccNo] = useState(driverInfo.payment.accountNo);
  const [editHolder, setEditHolder] = useState(driverInfo.payment.holderName);
  const [editGopay, setEditGopay] = useState(driverInfo.payment.gopayNo);

  // Preference switches
  const [pushNotif, setPushNotif] = useState(true);
  const [soundNotif, setSoundNotif] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  // Actions
  const handleSaveProfile = () => {
    if (editName.trim() === "" || editPhone.trim() === "") {
      Alert.alert("Error", "Nama dan Nomor HP tidak boleh kosong");
      return;
    }
    setDriverInfo({
      ...driverInfo,
      name: editName.trim(),
      phone: editPhone.trim(),
      avatarLetter: editName.trim().substring(0, 1).toUpperCase(),
    });
    setProfileModalVisible(false);
    Alert.alert("Sukses", "Data profil driver berhasil disimpan");
  };

  const handleSaveVehicle = () => {
    if (editBrand.trim() === "" || editPlate.trim() === "" || editYear.trim() === "") {
      Alert.alert("Error", "Semua kolom kendaraan wajib diisi");
      return;
    }
    setDriverInfo({
      ...driverInfo,
      vehicle: {
        ...driverInfo.vehicle,
        brand: editBrand.trim(),
        plate: editPlate.trim(),
        year: editYear.trim(),
      },
    });
    setVehicleModalVisible(false);
    Alert.alert("Sukses", "Informasi kendaraan berhasil diperbarui");
  };

  const handleSavePayment = () => {
    if (editBank.trim() === "" || editAccNo.trim() === "" || editHolder.trim() === "") {
      Alert.alert("Error", "Nama Bank, Nomor Rekening, dan Nama Pemilik wajib diisi");
      return;
    }
    setDriverInfo({
      ...driverInfo,
      payment: {
        bankName: editBank.trim(),
        accountNo: editAccNo.trim(),
        holderName: editHolder.trim(),
        gopayNo: editGopay.trim(),
      },
    });
    setPaymentModalVisible(false);
    Alert.alert("Sukses", "Metode pencairan dana berhasil diperbarui");
  };

  const handleLogout = () => navigate("login");

  const getDocStatusColor = (status: string) => {
    switch (status) {
      case "Terverifikasi": return "#1B7A4E";
      case "Menunggu Verifikasi": return "#D97706";
      default: return "#B91C1C";
    }
  };

  const getDocStatusBg = (status: string) => {
    switch (status) {
      case "Terverifikasi": return "#E8F5EE";
      case "Menunggu Verifikasi": return "#FEF3C7";
      default: return "#FEE2E2";
    }
  };

  const renderMenuIcon = (icon: React.ReactNode, backgroundColor: string) => (
    <View style={[styles.menuIconBg, { backgroundColor }]}>{icon}</View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header - mengikuti pola halaman profil customer */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBg}>
              <Text style={styles.avatarText}>{driverInfo.avatarLetter || "?"}</Text>
            </View>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.8}
            >
              <Camera size={14} color="#1B7A4E" />
            </TouchableOpacity>
          </View>

          <Text style={styles.driverName} numberOfLines={1}>{driverInfo.name || "Nama Driver"}</Text>
          <Text style={styles.vehicleInfo} numberOfLines={1}>
            {driverInfo.vehicle.type} - {driverInfo.vehicle.brand} ({driverInfo.vehicle.plate})
          </Text>
          <Text style={styles.driverPhone} numberOfLines={1}>
            {driverInfo.phone || "Nomor belum diatur"}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{driverInfo.rating}</Text>
              <Text style={styles.statLbl}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{driverInfo.vehicle.verified ? "Ya" : "Proses"}</Text>
              <Text style={styles.statLbl}>Kendaraan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>
                {Object.values(driverInfo.documents).filter((status) => status === "Terverifikasi").length}/4
              </Text>
              <Text style={styles.statLbl}>Dokumen</Text>
            </View>
          </View>
        </View>

        {/* Menu Groups */}
        <Text style={styles.groupTitle}>AKUN</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setProfileModalVisible(true)}>
            {renderMenuIcon(<User size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Edit Profil</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {driverInfo.phone} · {driverInfo.email}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setVehicleModalVisible(true)}>
            {renderMenuIcon(<Bike size={16} color="#1685E5" />, "#E3F2FF")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Data Kendaraan</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {driverInfo.vehicle.brand} · {driverInfo.vehicle.plate}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setDocModalVisible(true)}>
            {renderMenuIcon(<FileText size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Dokumen Driver</Text>
              <Text style={styles.menuItemSubtitle}>KTP, SIM C, STNK, SKCK</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setPaymentModalVisible(true)}>
            {renderMenuIcon(<CreditCard size={16} color="#AE35C7" />, "#F5E4F8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Rekening & E-Wallet</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {driverInfo.payment.bankName} · {driverInfo.payment.accountNo}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.groupTitle}>LAINNYA</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setPrefModalVisible(true)}>
            {renderMenuIcon(<Bell size={16} color="#FF9F00" />, "#FFF5D8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Preferensi Driver</Text>
              <Text style={styles.menuItemSubtitle}>Auto-accept, suara, notifikasi push</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert("Bantuan", "Gunakan tab Beranda untuk menerima orderan, dan tab Keuangan untuk mengelola dana saldo Anda.")}
          >
            {renderMenuIcon(<HelpCircle size={16} color="#FF9F00" />, "#FFF5D8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Bantuan</Text>
              <Text style={styles.menuItemSubtitle}>Pusat bantuan mitra Driver</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert("Tentang Aplikasi", "Rangers App 2.0 - Driver Edition")}
          >
            {renderMenuIcon(<Info size={16} color="#607D8B" />, "#E9EEF0")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Tentang Aplikasi</Text>
              <Text style={styles.menuItemSubtitle}>Informasi versi dan lisensi aplikasi</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.logoutIconBg}>
            <LogOut size={16} color="#B91C1C" />
          </View>
          <Text style={styles.logoutBtnText}>Keluar</Text>
        </TouchableOpacity>
        <Text style={styles.footerVersion}>Rangers App 2.0 - Driver</Text>
      </ScrollView>

      {/* Modals Section */}
      {/* 1. Edit Profile Modal */}
      <Modal visible={profileModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Profil Driver</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nama Lengkap Driver</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nama Lengkap"
              />

              <Text style={styles.inputLabel}>Nomor Handphone</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Nomor HP"
                keyboardType="phone-pad"
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setProfileModalVisible(false)}
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
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Edit Vehicle Modal */}
      <Modal visible={vehicleModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Data Kendaraan Driver</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Merek Kendaraan</Text>
              <TextInput
                style={styles.textInput}
                value={editBrand}
                onChangeText={setEditBrand}
                placeholder="Contoh: Honda Beat, Yamaha NMax"
              />

              <Text style={styles.inputLabel}>Nomor Polisi (Plat)</Text>
              <TextInput
                style={styles.textInput}
                value={editPlate}
                onChangeText={setEditPlate}
                placeholder="Contoh: D 4521 ABC"
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Tahun Pembuatan</Text>
              <TextInput
                style={styles.textInput}
                value={editYear}
                onChangeText={setEditYear}
                placeholder="Contoh: 2021"
                keyboardType="numeric"
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setVehicleModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSaveVehicle}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Driver Documents Status Modal */}
      <Modal visible={docModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Dokumen Driver</Text>
              <TouchableOpacity onPress={() => setDocModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.checklistContainer}>
              {Object.entries(driverInfo.documents).map(([key, value]) => (
                <View key={key} style={styles.checkRow}>
                  <View style={styles.checkRowInfo}>
                    <Text style={styles.docName}>{key.toUpperCase()}</Text>
                    <Text style={styles.docDesc}>Dokumen persyaratan utama kemitraan driver.</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getDocStatusBg(value) }]}>
                    <Text style={[styles.statusBadgeText, { color: getDocStatusColor(value) }]}>
                      {value}
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.sheetBtnClose}
                onPress={() => setDocModalVisible(false)}
              >
                <Text style={styles.sheetBtnCloseText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Payment details Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Rekening & E-Wallet</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Bank</Text>
              <TextInput
                style={styles.textInput}
                value={editBank}
                onChangeText={setEditBank}
                placeholder="Contoh: BCA, Mandiri"
              />

              <Text style={styles.inputLabel}>Nomor Rekening Bank</Text>
              <TextInput
                style={styles.textInput}
                value={editAccNo}
                onChangeText={setEditAccNo}
                placeholder="Nomor Rekening"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Nama Lengkap Pemilik Rekening</Text>
              <TextInput
                style={styles.textInput}
                value={editHolder}
                onChangeText={setEditHolder}
                placeholder="Nama Pemilik"
              />

              <Text style={styles.inputLabel}>Nomor GoPay Driver (Opsional)</Text>
              <TextInput
                style={styles.textInput}
                value={editGopay}
                onChangeText={setEditGopay}
                placeholder="Nomor HP GoPay"
                keyboardType="phone-pad"
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setPaymentModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSavePayment}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Driver Preferences Modal */}
      <Modal visible={prefModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Preferensi Driver</Text>
              <TouchableOpacity onPress={() => setPrefModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.switchList}>
              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Notifikasi Push</Text>
                  <Text style={styles.switchDesc}>Aktifkan suara dan popup saat layar terkunci</Text>
                </View>
                <Switch 
                  value={pushNotif} 
                  onValueChange={setPushNotif}
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
                  thumbColor={pushNotif ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Suara Keras</Text>
                  <Text style={styles.switchDesc}>Gunakan suara peringatan saat ada orderan masuk</Text>
                </View>
                <Switch 
                  value={soundNotif} 
                  onValueChange={setSoundNotif}
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
                  thumbColor={soundNotif ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Auto Terima Order (Auto-Accept)</Text>
                  <Text style={styles.switchDesc}>Terima orderan masuk otomatis tanpa konfirmasi</Text>
                </View>
                <Switch 
                  value={autoAccept} 
                  onValueChange={setAutoAccept}
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
                  thumbColor={autoAccept ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <TouchableOpacity 
                style={styles.sheetBtnClose}
                onPress={() => setPrefModalVisible(false)}
              >
                <Text style={styles.sheetBtnCloseText}>Simpan Preferensi</Text>
              </TouchableOpacity>
            </View>
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
  driverPhone: {
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
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  avatarContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1B7A4E",
  },
  avatarText: {
    color: "#1B7A4E",
    fontSize: 28,
    fontWeight: "900",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  vehicleInfo: {
    fontSize: 12,
    color: "#E8F5EE",
    marginTop: 2,
    paddingHorizontal: 20,
    textAlign: "center",
  },
  ratingBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4B5563",
  },
  badgeActive: {
    backgroundColor: "#E8F5EE",
  },
  badgeTextActive: {
    color: "#1B7A4E",
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 16,
    overflow: "hidden",
  },
  menuItem: {
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
  menuItemBody: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
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
    borderColor: "#FEE2E2",
    borderWidth: 1,
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
  footerVersion: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 24,
  },
  logoutBtnText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 12,
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
  formContainer: {
    gap: 12,
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
    marginBottom: 4,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
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
  checklistContainer: {
    gap: 12,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  checkRowInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  docDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
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
  switchList: {
    gap: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  switchRowInfo: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  switchDesc: {
    fontSize: 11,
    color: "#6B7280",
  },
});
