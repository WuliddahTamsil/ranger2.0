import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import {
  User,
  Lock,
  Phone,
  Store as StoreIcon,
  CheckCircle2,
  XCircle,
  FileCheck,
  Share2,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Camera,
  X,
} from "lucide-react-native";

interface ProfileProps {
  storeInfo: {
    ownerName: string;
    storeName: string;
    phone: string;
    email: string;
    address: string;
    description: string;
    isOpen: boolean;
    isVerified: boolean;
    profileImage: string | null;
  };
  setStoreInfo: (info: any) => void;
  navigate: (screen: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ storeInfo, setStoreInfo, navigate }) => {
  // Modal states
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState(storeInfo.ownerName);
  const [editPhone, setEditPhone] = useState(storeInfo.phone);
  
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [editStoreName, setEditStoreName] = useState(storeInfo.storeName);
  const [editStoreDesc, setEditStoreDesc] = useState(storeInfo.description);
  const [editStoreAddr, setEditStoreAddr] = useState(storeInfo.address);

  // Notification toggles
  const [orderNotif, setOrderNotif] = useState(true);
  const [chatNotif, setChatNotif] = useState(true);
  const [incomeNotif, setIncomeNotif] = useState(true);
  const [promoNotif, setPromoNotif] = useState(false);

  // Check if profile is complete
  const isProfileComplete = 
    storeInfo.ownerName.trim() !== "" &&
    storeInfo.storeName.trim() !== "" &&
    storeInfo.address.trim() !== "" &&
    storeInfo.phone.trim() !== "" &&
    storeInfo.phone.toLowerCase() !== "belum diisi";

  // Mock list of profile images
  const mockImages = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&q=80",
    null
  ];

  // Helper for displaying values
  const displayVal = (val: string, fallback: string) => {
    return val.trim() === "" || val.toLowerCase() === "belum diisi" ? fallback : val;
  };

  // Actions
  const handleSaveAccount = () => {
    if (editName.trim() === "") {
      Alert.alert("Error", "Nama pemilik tidak boleh kosong");
      return;
    }
    setStoreInfo({ ...storeInfo, ownerName: editName, phone: editPhone });
    setAccountModalVisible(false);
    Alert.alert("Sukses", "Informasi akun berhasil diperbarui");
  };

  const handleSavePassword = () => {
    if (currPassword.trim() === "" || newPassword.trim() === "") {
      Alert.alert("Error", "Password tidak boleh kosong");
      return;
    }
    setCurrPassword("");
    setNewPassword("");
    setPasswordModalVisible(false);
    Alert.alert("Sukses", "Password berhasil diperbarui");
  };

  const handleSavePhone = () => {
    setStoreInfo({ ...storeInfo, phone: editPhone });
    setPhoneModalVisible(false);
    Alert.alert("Sukses", "Nomor HP berhasil diperbarui");
  };

  const handleSaveStore = () => {
    if (editStoreName.trim() === "") {
      Alert.alert("Error", "Nama toko tidak boleh kosong");
      return;
    }
    setStoreInfo({
      ...storeInfo,
      storeName: editStoreName,
      description: editStoreDesc,
      address: editStoreAddr,
    });
    setStoreModalVisible(false);
    Alert.alert("Sukses", "Informasi toko berhasil diperbarui");
  };

  const handleToggleStoreStatus = () => {
    const nextStatus = !storeInfo.isOpen;
    Alert.alert(
      nextStatus ? "Buka Toko?" : "Tutup Toko?",
      nextStatus 
        ? "Toko akan kembali menerima pesanan customer." 
        : "Toko tidak akan menerima pesanan baru selama ditutup.",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: nextStatus ? "Buka Toko" : "Tutup Toko",
          onPress: () => {
            setStoreInfo({ ...storeInfo, isOpen: nextStatus });
            Alert.alert("Sukses", nextStatus ? "Toko sekarang buka." : "Toko sekarang tutup.");
          }
        }
      ]
    );
  };

  const handleShareStore = () => {
    Alert.alert("Informasi Toko", `${storeInfo.storeName}\n${storeInfo.address}\n\n(Informasi toko siap dibagikan)`);
  };

  const handleLogout = () => navigate("login");

  const renderMenuIcon = (icon: React.ReactNode, backgroundColor: string) => (
    <View style={[styles.menuIconBg, { backgroundColor }]}>{icon}</View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header - mengikuti pola halaman profil customer */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={() => setAvatarPreviewVisible(true)} activeOpacity={0.9}>
              <View style={styles.avatarBg}>
              {storeInfo.profileImage ? (
                <Image source={{ uri: storeInfo.profileImage }} style={styles.avatarImage} />
              ) : (
                <StoreIcon size={38} color="#1B7A4E" />
              )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => setAvatarPickerVisible(true)}
              activeOpacity={0.8}
            >
                <Camera size={14} color="#1B7A4E" />
              </TouchableOpacity>
          </View>

          <Text style={styles.ownerName} numberOfLines={1}>
            {displayVal(storeInfo.ownerName, "Nama Pemilik")}
          </Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {displayVal(storeInfo.storeName, "Nama toko belum diisi")}
          </Text>
          <Text style={styles.ownerPhone} numberOfLines={1}>
            {displayVal(storeInfo.phone, "Nomor belum diatur")}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{isProfileComplete ? "Siap" : "-"}</Text>
              <Text style={styles.statLbl}>Profil</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{storeInfo.isOpen ? "Buka" : "Tutup"}</Text>
              <Text style={styles.statLbl}>Status Toko</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{storeInfo.isVerified ? "Ya" : "Proses"}</Text>
              <Text style={styles.statLbl}>Terverifikasi</Text>
            </View>
          </View>
        </View>

        {/* Account Menu Group */}
        <Text style={styles.groupTitle}>AKUN</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              setEditName(storeInfo.ownerName);
              setEditPhone(storeInfo.phone);
              setAccountModalVisible(true);
            }}
          >
            {renderMenuIcon(<User size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Detail Akun</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {storeInfo.email || "Informasi akun belum lengkap"}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModalVisible(true)}>
            {renderMenuIcon(<Lock size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Ubah Password</Text>
              <Text style={styles.menuItemSubtitle}>Perbarui keamanan akun</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              setEditPhone(storeInfo.phone);
              setPhoneModalVisible(true);
            }}
          >
            {renderMenuIcon(<Phone size={16} color="#1B7A4E" />, "#E3F2FF")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Nomor HP</Text>
              <Text style={styles.menuItemSubtitle}>
                {displayVal(storeInfo.phone, "Belum diisi")}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Store Menu Group */}
        <Text style={styles.groupTitle}>INFORMASI TOKO</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setEditStoreName(storeInfo.storeName);
              setEditStoreDesc(storeInfo.description);
              setEditStoreAddr(storeInfo.address);
              setStoreModalVisible(true);
            }}
          >
            {renderMenuIcon(<StoreIcon size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Informasi Toko</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {displayVal(storeInfo.storeName, "Nama toko belum diisi")}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleToggleStoreStatus}>
            {storeInfo.isOpen ? (
              renderMenuIcon(<CheckCircle2 size={16} color="#15803D" />, "#E8F5EE")
            ) : (
              renderMenuIcon(<XCircle size={16} color="#B91C1C" />, "#FFF0F0")
            )}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Status Toko</Text>
              <Text style={[styles.menuItemSubtitle, { color: storeInfo.isOpen ? "#15803D" : "#B91C1C", fontWeight: "700" }]}>
                {storeInfo.isOpen ? "Toko Buka" : "Toko Tutup"}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setVerifyModalVisible(true)}>
            {renderMenuIcon(<FileCheck size={16} color="#1B7A4E" />, "#E3F2FF")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Status Verifikasi</Text>
              <Text style={styles.menuItemSubtitle}>
                {isProfileComplete ? "Data profil lengkap" : "Data profil perlu dilengkapi"}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleShareStore}>
            {renderMenuIcon(<Share2 size={16} color="#1B7A4E" />, "#F5E4F8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Bagikan Toko</Text>
              <Text style={styles.menuItemSubtitle}>Salin informasi toko</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* General Settings */}
        <Text style={styles.groupTitle}>LAINNYA</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setNotifModalVisible(true)}>
            {renderMenuIcon(<Bell size={16} color="#1B7A4E" />, "#FFF5D8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Notifikasi</Text>
              <Text style={styles.menuItemSubtitle}>Pesanan, chat, pendapatan, promosi</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert("Keamanan", "Sesi login Anda sedang aktif dan aman.")}
          >
            {renderMenuIcon(<Shield size={16} color="#607D8B" />, "#E9EEF0")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Keamanan</Text>
              <Text style={styles.menuItemSubtitle}>Password, nomor HP, dan status login</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert("Bantuan", "Gunakan tab Beranda untuk mengelola menu, tab Order untuk memproses pesanan masuk, dan tab Pendapatan untuk penarikan saldo.")}
          >
            {renderMenuIcon(<HelpCircle size={16} color="#FF9F00" />, "#FFF5D8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Bantuan</Text>
              <Text style={styles.menuItemSubtitle}>Pusat bantuan pemilik marketplace</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert("Kebijakan & Ketentuan", "Halaman kebijakan dan syarat penggunaan saat ini menggunakan standar platform Rangers App 2.0.")}
          >
            {renderMenuIcon(<FileText size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Kebijakan & Ketentuan</Text>
              <Text style={styles.menuItemSubtitle}>Privasi dan syarat penggunaan</Text>
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
        <Text style={styles.footerVersion}>Rangers App 2.0 - Pemilik Marketplace</Text>
      </ScrollView>

      {/* 1. Modal Avatar Preview */}
      <Modal visible={avatarPreviewVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.previewContainer}>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setAvatarPreviewVisible(false)}
            >
              <X size={20} color="#111827" />
            </TouchableOpacity>
            {storeInfo.profileImage ? (
              <Image source={{ uri: storeInfo.profileImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <StoreIcon size={120} color="#1B7A4E" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. Modal Avatar Picker */}
      <Modal visible={avatarPickerVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ubah Foto Profil</Text>
              <TouchableOpacity onPress={() => setAvatarPickerVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetDesc}>Pilih salah satu dari gallery mock kami:</Text>
            
            <View style={styles.mockImagesRow}>
              {mockImages.map((imgUrl, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.mockImageCard}
                  onPress={() => {
                    setStoreInfo({ ...storeInfo, profileImage: imgUrl });
                    setAvatarPickerVisible(false);
                    Alert.alert("Sukses", "Foto profil berhasil diperbarui");
                  }}
                >
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.mockImg} />
                  ) : (
                    <View style={styles.mockImgPlaceholder}>
                      <StoreIcon size={20} color="#9CA3AF" />
                      <Text style={styles.mockImgText}>Reset</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Modal Edit Account */}
      <Modal visible={accountModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Akun Saya</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nama Pemilik</Text>
              <TextInput 
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nama Pemilik"
              />

              <Text style={styles.inputLabel}>Nomor HP</Text>
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
                  onPress={() => setAccountModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSaveAccount}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Modal Edit Password */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ubah Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Password Saat Ini</Text>
              <TextInput 
                style={styles.textInput}
                value={currPassword}
                onChangeText={setCurrPassword}
                placeholder="Masukkan password lama"
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Password Baru</Text>
              <TextInput 
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Masukkan password baru"
                secureTextEntry
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setPasswordModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSavePassword}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Modal Edit Phone */}
      <Modal visible={phoneModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ubah Nomor HP</Text>
              <TouchableOpacity onPress={() => setPhoneModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nomor HP</Text>
              <TextInput 
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Nomor HP Baru"
                keyboardType="phone-pad"
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setPhoneModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSavePhone}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Modal Edit Store Info */}
      <Modal visible={storeModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Informasi Toko</Text>
              <TouchableOpacity onPress={() => setStoreModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollContainer}>
              <Text style={styles.inputLabel}>Nama Toko</Text>
              <TextInput 
                style={styles.textInput}
                value={editStoreName}
                onChangeText={setEditStoreName}
                placeholder="Nama Toko"
              />

              <Text style={styles.inputLabel}>Deskripsi Toko</Text>
              <TextInput 
                style={[styles.textInput, styles.textArea]}
                value={editStoreDesc}
                onChangeText={setEditStoreDesc}
                placeholder="Tulis deskripsi toko Anda..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Alamat Toko</Text>
              <TextInput 
                style={[styles.textInput, styles.textArea]}
                value={editStoreAddr}
                onChangeText={setEditStoreAddr}
                placeholder="Alamat Lengkap Toko"
                multiline
                numberOfLines={3}
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setStoreModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSaveStore}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 7. Modal Verification Checklist */}
      <Modal visible={verifyModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Status Verifikasi Profil</Text>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.checklistContainer}>
              <View style={styles.checkRow}>
                {storeInfo.ownerName.trim() !== "" ? (
                  <CheckCircle2 size={18} color="#15803D" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Identitas Pemilik Lengkap</Text>
              </View>
              <View style={styles.checkRow}>
                {storeInfo.phone.trim() !== "" && storeInfo.phone.toLowerCase() !== "belum diisi" ? (
                  <CheckCircle2 size={18} color="#15803D" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Nomor HP Terverifikasi</Text>
              </View>
              <View style={styles.checkRow}>
                {storeInfo.storeName.trim() !== "" ? (
                  <CheckCircle2 size={18} color="#15803D" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Nama Toko Terdaftar</Text>
              </View>
              <View style={styles.checkRow}>
                {storeInfo.address.trim() !== "" ? (
                  <CheckCircle2 size={18} color="#15803D" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Alamat Toko Tersimpan</Text>
              </View>

              <View style={styles.verifySummary}>
                <Text style={styles.verifySummaryTitle}>
                  {isProfileComplete ? "Profil Anda Siap" : "Profil Belum Lengkap"}
                </Text>
                <Text style={styles.verifySummaryDesc}>
                  Platform Rangers App 2.0 mendeteksi kelengkapan data di atas sebagai verifikasi dasar. Silakan lengkapi profil untuk memastikan kelancaran operasional.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.sheetBtnClose}
                onPress={() => setVerifyModalVisible(false)}
              >
                <Text style={styles.sheetBtnCloseText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 8. Modal Notifications Settings */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifikasi</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.switchList}>
              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Notifikasi Pesanan</Text>
                  <Text style={styles.switchDesc}>Pemberitahuan untuk pesanan masuk baru</Text>
                </View>
                <Switch 
                  value={orderNotif} 
                  onValueChange={setOrderNotif}
                  trackColor={{ false: "#D1D5DB", true: "#DCFCE7" }}
                  thumbColor={orderNotif ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Notifikasi Chat</Text>
                  <Text style={styles.switchDesc}>Pemberitahuan pesan masuk dari pelanggan/kurir</Text>
                </View>
                <Switch 
                  value={chatNotif} 
                  onValueChange={setChatNotif}
                  trackColor={{ false: "#D1D5DB", true: "#DCFCE7" }}
                  thumbColor={chatNotif ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Notifikasi Pendapatan</Text>
                  <Text style={styles.switchDesc}>Pemberitahuan saldo masuk dari pesanan selesai</Text>
                </View>
                <Switch 
                  value={incomeNotif} 
                  onValueChange={setIncomeNotif}
                  trackColor={{ false: "#D1D5DB", true: "#DCFCE7" }}
                  thumbColor={incomeNotif ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchRowInfo}>
                  <Text style={styles.switchTitle}>Notifikasi Promosi</Text>
                  <Text style={styles.switchDesc}>Info promo, kupon diskon dan event partner</Text>
                </View>
                <Switch 
                  value={promoNotif} 
                  onValueChange={setPromoNotif}
                  trackColor={{ false: "#D1D5DB", true: "#DCFCE7" }}
                  thumbColor={promoNotif ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <TouchableOpacity 
                style={styles.sheetBtnClose}
                onPress={() => setNotifModalVisible(false)}
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
    overflow: "hidden",
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
  ownerPhone: {
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
    marginBottom: 18,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: "#1B7A4E",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    marginLeft: 13,
    flex: 1,
    gap: 3,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  storeName: {
    fontSize: 13,
    color: "#E8F5EE",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
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
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 60,
    marginHorizontal: 0,
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
  // Modal Backdrop styles
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  // Avatar Preview Modal styles
  previewContainer: {
    width: 250,
    height: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 15,
    padding: 5,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  previewPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  // Bottom Sheets styles
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
  sheetDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  mockImagesRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 8,
  },
  mockImageCard: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  mockImg: {
    width: "100%",
    height: "100%",
  },
  mockImgPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  mockImgText: {
    fontSize: 8,
    color: "#6B7280",
    fontWeight: "700",
  },
  // Form styles
  formContainer: {
    gap: 12,
  },
  formScrollContainer: {
    maxHeight: 350,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
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
  },
  textArea: {
    textAlignVertical: "top",
    minHeight: 80,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 10,
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
    fontWeight: "700",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetBtnClose: {
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  sheetBtnCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Checklist verification styles
  checklistContainer: {
    gap: 12,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
  },
  checkRowText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  verifySummary: {
    backgroundColor: "#E8F5EE",
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
    gap: 4,
  },
  verifySummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  verifySummaryDesc: {
    fontSize: 11,
    color: "#1B7A4E",
    lineHeight: 16,
  },
  // Switch settings styles
  switchList: {
    gap: 14,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchRowInfo: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  switchDesc: {
    fontSize: 11,
    color: "#6B7280",
  },
});
