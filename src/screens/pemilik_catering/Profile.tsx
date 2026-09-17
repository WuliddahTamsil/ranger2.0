import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
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
  CreditCard,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Nav } from "../../types";
import { ProfilePhotoEditor } from "../../components/ProfilePhotoEditor";
import { LogoutConfirmModal } from "../../components/LogoutConfirmModal";
import { updateUserProfile, uploadFileToBackend } from "../../services/api";
import { AuthAccount } from "../auth/authTypes";
import { updateCachedAccount } from "../auth/authService";

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
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    qrisImageUrl?: string;
  bankTransferEnabled?: boolean;
  qrisEnabled?: boolean;
};
  setStoreInfo: (info: any) => void;
  userId?: string;
  authAccount?: AuthAccount | null;
  onUpdateAccount?: (account: AuthAccount) => void;
  navigate: (screen: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ storeInfo, setStoreInfo, userId, authAccount, onUpdateAccount, navigate }) => {
  // Modal states
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState(storeInfo.ownerName);
  const [editPhone, setEditPhone] = useState(storeInfo.phone);
  
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [editStoreName, setEditStoreName] = useState(storeInfo.storeName);
  const [editStoreDesc, setEditStoreDesc] = useState(storeInfo.description);
  const [editStoreAddr, setEditStoreAddr] = useState(storeInfo.address);
  const [bankName, setBankName] = useState(storeInfo.bankName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(storeInfo.bankAccountNumber || "");
  const [bankAccountHolder, setBankAccountHolder] = useState(storeInfo.bankAccountHolder || "");
  const [qrisImageUrl, setQrisImageUrl] = useState(storeInfo.qrisImageUrl || "");
  const [bankTransferEnabled, setBankTransferEnabled] = useState(storeInfo.bankTransferEnabled ?? Boolean(storeInfo.bankAccountNumber && storeInfo.bankName && storeInfo.bankAccountHolder));
  const [qrisEnabled, setQrisEnabled] = useState(storeInfo.qrisEnabled ?? Boolean(storeInfo.qrisImageUrl));
  const [savingPayment, setSavingPayment] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);

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
      Alert.alert("Error", "Nama catering tidak boleh kosong");
      return;
    }
    setStoreInfo({
      ...storeInfo,
      storeName: editStoreName,
      description: editStoreDesc,
      address: editStoreAddr,
    });
    setStoreModalVisible(false);
    Alert.alert("Sukses", "Informasi catering berhasil diperbarui");
  };

  const handleToggleStoreStatus = () => {
    const nextStatus = !storeInfo.isOpen;
    Alert.alert(
      nextStatus ? "Buka Dapur?" : "Tutup Dapur?",
      nextStatus 
        ? "Dapur akan kembali menerima pesanan customer." 
        : "Dapur tidak akan menerima pesanan baru selama ditutup.",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: nextStatus ? "Buka Dapur" : "Tutup Dapur",
          onPress: () => {
            setStoreInfo({ ...storeInfo, isOpen: nextStatus });
            Alert.alert("Sukses", nextStatus ? "Dapur sekarang buka." : "Dapur sekarang tutup.");
          }
        }
      ]
    );
  };

  const handleShareStore = () => {
    Alert.alert(
      "Informasi Catering",
      `${storeInfo.storeName}\n${storeInfo.address}\n\n(Informasi catering siap dibagikan)`
    );
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    navigate("login");
  };

  const handlePickQris = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingQris(true);
      const uploaded = await uploadFileToBackend(
        asset.uri,
        asset.fileName || `catering-qris-${Date.now()}.jpg`,
        asset.mimeType || "image/jpeg",
      );
      if (!uploaded?.success || !uploaded.data?.url) throw new Error("QRIS gagal diunggah.");
      setQrisImageUrl(uploaded.data.url);
    } catch (error) {
      Alert.alert("Gagal mengunggah QRIS", error instanceof Error ? error.message : "Coba lagi.");
    } finally {
      setUploadingQris(false);
    }
  };

  const handleSavePayment = async () => {
    if (bankTransferEnabled && bankAccountNumber.trim() && (!bankName.trim() || !bankAccountHolder.trim())) {
      Alert.alert("Data rekening belum lengkap", "Isi nama bank dan nama pemilik rekening.");
      return;
    }
    if (bankTransferEnabled && !bankAccountNumber.trim() && !qrisEnabled) {
      Alert.alert("Metode pembayaran belum aktif", "Aktifkan minimal satu metode pembayaran, lalu isi data yang dibutuhkan.");
      return;
    }
    if (qrisEnabled && !qrisImageUrl.trim()) {
      Alert.alert("QRIS belum siap", "Unggah gambar QRIS sebelum mengaktifkan metode QRIS.");
      return;
    }
    if (!userId) {
      Alert.alert("Akun belum tersinkron", "Masuk kembali ke akun pemilik Catering lalu coba lagi.");
      return;
    }
    setSavingPayment(true);
    try {
      const roleData = {
        cateringBankTransferEnabled: String(bankTransferEnabled),
        cateringQrisEnabled: String(qrisEnabled),
        cateringBankName: bankTransferEnabled && bankAccountNumber.trim() ? bankName.trim() : "",
        cateringBankAccountNumber: bankTransferEnabled ? bankAccountNumber.trim() : "",
        cateringBankAccountHolder: bankTransferEnabled && bankAccountNumber.trim() ? bankAccountHolder.trim() : "",
        cateringQrisImageUrl: qrisEnabled ? qrisImageUrl.trim() : "",
      };
      const result = await updateUserProfile(userId, { roleData });
      if (!result?.success) throw new Error(result?.message || "Metode pembayaran gagal disimpan.");
      if (authAccount) {
        const updatedAccount: AuthAccount = {
          ...authAccount,
          roleData: { ...authAccount.roleData, ...roleData },
          updatedAt: new Date().toISOString(),
        };
        await updateCachedAccount(updatedAccount);
        onUpdateAccount?.(updatedAccount);
      }
      setStoreInfo({ ...storeInfo, ...{
        bankName: roleData.cateringBankName,
        bankAccountNumber: roleData.cateringBankAccountNumber,
        bankAccountHolder: roleData.cateringBankAccountHolder,
        qrisImageUrl: roleData.cateringQrisImageUrl,
        bankTransferEnabled,
        qrisEnabled,
      } });
      setPaymentModalVisible(false);
      Alert.alert("Metode pembayaran tersimpan", bankTransferEnabled || qrisEnabled ? "Customer sekarang dapat memilih metode pembayaran yang Anda aktifkan." : "Semua metode pembayaran telah dinonaktifkan. Customer tidak dapat checkout melalui pembayaran digital.");
    } catch (error) {
      Alert.alert("Gagal menyimpan", error instanceof Error ? error.message : "Coba lagi.");
    } finally {
      setSavingPayment(false);
    }
  };

  const renderMenuIcon = (icon: React.ReactNode, backgroundColor: string) => (
    <View style={[styles.menuIconBg, { backgroundColor }]}>{icon}</View>
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header - mengikuti pola halaman profil customer */}
        <View style={styles.profileHeader}>
          <ProfilePhotoEditor
            userId={userId}
            name={storeInfo.ownerName}
            photoUri={storeInfo.profileImage}
            size={96}
            onSaved={(profileImage) => setStoreInfo({ ...storeInfo, profileImage })}
          />

          <Text style={styles.ownerName} numberOfLines={1}>
            {displayVal(storeInfo.ownerName, "Nama Pemilik")}
          </Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {displayVal(storeInfo.storeName, "Nama catering belum diisi")}
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
              <Text style={styles.statLbl}>Status Dapur</Text>
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
        <Text style={styles.groupTitle}>DAPUR CATERING</Text>
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
              <Text style={styles.menuItemTitle}>Informasi Catering</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {displayVal(storeInfo.storeName, "Nama catering belum diisi")}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {
            setBankName(storeInfo.bankName || "");
            setBankAccountNumber(storeInfo.bankAccountNumber || "");
            setBankAccountHolder(storeInfo.bankAccountHolder || "");
            setQrisImageUrl(storeInfo.qrisImageUrl || "");
            setBankTransferEnabled(storeInfo.bankTransferEnabled ?? Boolean(storeInfo.bankAccountNumber && storeInfo.bankName && storeInfo.bankAccountHolder));
            setQrisEnabled(storeInfo.qrisEnabled ?? Boolean(storeInfo.qrisImageUrl));
            setPaymentModalVisible(true);
          }}>
            {renderMenuIcon(<CreditCard size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Metode Pembayaran</Text>
              <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                {storeInfo.bankTransferEnabled || storeInfo.qrisEnabled ? `${storeInfo.bankTransferEnabled ? "Transfer aktif" : "Transfer nonaktif"}${storeInfo.bankTransferEnabled && storeInfo.qrisEnabled ? " • " : ""}${storeInfo.qrisEnabled ? "QRIS aktif" : "QRIS nonaktif"}` : "Atur rekening bank dan QRIS"}
              </Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleToggleStoreStatus}>
            {storeInfo.isOpen ? (
              renderMenuIcon(<CheckCircle2 size={16} color="#1B7A4E" />, "#E8F5EE")
            ) : (
              renderMenuIcon(<XCircle size={16} color="#B91C1C" />, "#FFF0F0")
            )}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Status Dapur</Text>
              <Text style={[styles.menuItemSubtitle, { color: storeInfo.isOpen ? "#1B7A4E" : "#B91C1C", fontWeight: "700" }]}>
                {storeInfo.isOpen ? "Dapur Buka (Menerima Pesanan)" : "Dapur Tutup"}
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
              <Text style={styles.menuItemTitle}>Bagikan Dapur</Text>
              <Text style={styles.menuItemSubtitle}>Salin informasi catering</Text>
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
            onPress={() => Alert.alert("Keamanan", "Sesi login dapur Anda sedang aktif dan aman.")}
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
            onPress={() => Alert.alert("Bantuan", "Gunakan tab Beranda untuk mengelola menu dapur, tab Order untuk memproses pesanan masuk, dan tab Pendapatan untuk penarikan saldo.")}
          >
            {renderMenuIcon(<HelpCircle size={16} color="#FF9F00" />, "#FFF5D8")}
            <View style={styles.menuItemBody}>
              <Text style={styles.menuItemTitle}>Bantuan</Text>
              <Text style={styles.menuItemSubtitle}>Pusat bantuan pemilik catering</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert("Kebijakan & Ketentuan", "Halaman kebijakan dan syarat penggunaan saat ini menggunakan standar platform GEOVERSE 2.0.")}
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
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.7}>
          <View style={styles.logoutIconBg}>
            <LogOut size={16} color="#B91C1C" />
          </View>
          <Text style={styles.logoutBtnText}>Keluar</Text>
        </TouchableOpacity>
        <Text style={styles.footerVersion}>GEOVERSE 2.0 - PGE Kamojang</Text>
      </ScrollView>

      <LogoutConfirmModal
        visible={logoutModalVisible}
        roleLabel="Pemilik Catering"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={handleLogout}
      />

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
              <Image source={{ uri: storeInfo.profileImage }} style={styles.previewImage as any} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <StoreIcon size={120} color="#1B7A4E" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Edit Account */}
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
              <Text style={styles.sheetTitle}>Edit Informasi Catering</Text>
              <TouchableOpacity onPress={() => setStoreModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollContainer}>
              <Text style={styles.inputLabel}>Nama Bisnis Catering</Text>
              <TextInput 
                style={styles.textInput}
                value={editStoreName}
                onChangeText={setEditStoreName}
                placeholder="Nama Catering"
              />

              <Text style={styles.inputLabel}>Deskripsi Dapur</Text>
              <TextInput 
                style={[styles.textInput, styles.textArea]}
                value={editStoreDesc}
                onChangeText={setEditStoreDesc}
                placeholder="Tulis deskripsi catering Anda..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Alamat Dapur</Text>
              <TextInput 
                style={[styles.textInput, styles.textArea]}
                value={editStoreAddr}
                onChangeText={setEditStoreAddr}
                placeholder="Alamat Lengkap Dapur"
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

      <Modal visible={paymentModalVisible} transparent animationType="slide" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Metode Pembayaran Catering</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}><X size={20} color="#111827" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.formScrollContainer} keyboardShouldPersistTaps="handled">
              <Text style={styles.verifySummaryDesc}>Customer membayar langsung ke rekening atau QRIS yang Anda atur. Pembayaran tidak diproses oleh GEOVERSE.</Text>

              <View style={styles.switchList}>
                <View style={styles.switchRow}>
                  <View style={styles.switchRowInfo}>
                    <Text style={styles.switchTitle}>Transfer Bank</Text>
                    <Text style={styles.switchDesc}>Aktifkan jika mitra menerima transfer bank</Text>
                  </View>
                  <Switch
                    value={bankTransferEnabled}
                    onValueChange={setBankTransferEnabled}
                    trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
                    thumbColor={bankTransferEnabled ? "#1B7A4E" : "#9CA3AF"}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchRowInfo}>
                    <Text style={styles.switchTitle}>QRIS</Text>
                    <Text style={styles.switchDesc}>Aktifkan jika mitra menerima pembayaran QRIS</Text>
                  </View>
                  <Switch
                    value={qrisEnabled}
                    onValueChange={setQrisEnabled}
                    trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
                    thumbColor={qrisEnabled ? "#1B7A4E" : "#9CA3AF"}
                  />
                </View>
              </View>

              {bankTransferEnabled ? (
                <>
                  <Text style={styles.inputLabel}>Nama Bank</Text>
                  <TextInput style={styles.textInput} value={bankName} onChangeText={setBankName} placeholder="Contoh: BCA" />
                  <Text style={styles.inputLabel}>Nomor Rekening</Text>
                  <TextInput style={styles.textInput} value={bankAccountNumber} onChangeText={setBankAccountNumber} placeholder="Nomor rekening" keyboardType="number-pad" />
                  <Text style={styles.inputLabel}>Nama Pemilik Rekening</Text>
                  <TextInput style={styles.textInput} value={bankAccountHolder} onChangeText={setBankAccountHolder} placeholder="Sesuai nama di rekening" />
                </>
              ) : null}

              {qrisEnabled ? (
                <>
                  <Text style={styles.inputLabel}>QRIS Toko</Text>
                  <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnOutline]} onPress={() => void handlePickQris()} disabled={uploadingQris}>
                    <Text style={styles.sheetBtnTextOutline}>{uploadingQris ? "Mengunggah QRIS…" : qrisImageUrl ? "Ganti gambar QRIS" : "Pilih dan unggah gambar QRIS"}</Text>
                  </TouchableOpacity>
                  {qrisImageUrl ? <Image source={{ uri: qrisImageUrl }} style={{ width: 170, height: 170, alignSelf: "center", marginTop: 12, borderRadius: 12 }} resizeMode="contain" /> : null}
                  {qrisImageUrl ? <TouchableOpacity onPress={() => setQrisImageUrl("")}><Text style={{ color: "#B91C1C", textAlign: "center", marginTop: 8, fontWeight: "700" }}>Hapus QRIS</Text></TouchableOpacity> : null}
                </>
              ) : null}

              <View style={styles.sheetActions}>
                <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnOutline]} onPress={() => setPaymentModalVisible(false)}><Text style={styles.sheetBtnTextOutline}>Batal</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnSolid]} onPress={() => void handleSavePayment()} disabled={savingPayment || uploadingQris}><Text style={styles.sheetBtnTextSolid}>{savingPayment ? "Menyimpan…" : "Simpan"}</Text></TouchableOpacity>
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
                  <CheckCircle2 size={18} color="#1B7A4E" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Identitas Pemilik Lengkap</Text>
              </View>
              <View style={styles.checkRow}>
                {storeInfo.phone.trim() !== "" && storeInfo.phone.toLowerCase() !== "belum diisi" ? (
                  <CheckCircle2 size={18} color="#1B7A4E" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Nomor HP Terverifikasi</Text>
              </View>
              <View style={styles.checkRow}>
                {storeInfo.storeName.trim() !== "" ? (
                  <CheckCircle2 size={18} color="#1B7A4E" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Nama Catering Terdaftar</Text>
              </View>
              <View style={styles.checkRow}>
                {storeInfo.address.trim() !== "" ? (
                  <CheckCircle2 size={18} color="#1B7A4E" />
                ) : (
                  <XCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.checkRowText}>Alamat Dapur Tersimpan</Text>
              </View>

              <View style={styles.verifySummary}>
                <Text style={styles.verifySummaryTitle}>
                  {isProfileComplete ? "Profil Anda Siap" : "Profil Belum Lengkap"}
                </Text>
                <Text style={styles.verifySummaryDesc}>
                  Platform GEOVERSE 2.0 mendeteksi kelengkapan data di atas sebagai verifikasi dasar. Silakan lengkapi profil untuk memastikan kelancaran operasional.
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
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
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
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
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
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
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
                  trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
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
    overflow: "hidden",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    marginTop: 2,
    paddingHorizontal: 20,
    textAlign: "center",
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
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewContainer: {
    position: "relative",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
  },
  closeBtn: {
    position: "absolute",
    top: -44,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  previewImage: {
    width: 230,
    height: 230,
    borderRadius: 18,
  },
  previewPlaceholder: {
    width: 230,
    height: 230,
    borderRadius: 18,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
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
  sheetDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 14,
  },
  mockImagesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  mockImageCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    gap: 4,
  },
  mockImgText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  formContainer: {
    gap: 12,
  },
  formScrollContainer: {
    maxHeight: 380,
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
  textArea: {
    textAlignVertical: "top",
    minHeight: 80,
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
    paddingVertical: 4,
  },
  checkRowText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  verifySummary: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  verifySummaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  verifySummaryDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
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
