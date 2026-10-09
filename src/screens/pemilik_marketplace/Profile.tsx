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
  Platform,
  ActivityIndicator,
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
  MapPin,
  Map as MapIcon,
  Navigation as NavigationIcon,
  Compass,
  Crosshair,
  Truck,
  Info,
} from "lucide-react-native";
import { ProfilePhotoEditor } from "../../components/ProfilePhotoEditor";
import { LogoutConfirmModal } from "../../components/LogoutConfirmModal";
import { ToastBanner, ToastType, ConfirmDialog } from "../../components/CustomDialog";
import { CustomerLocationValue, CustomerLocationPicker } from "../../components/CustomerLocationPicker";
import { safeReverseGeocode, getCurrentUserCoordinates } from "../../utils/geocoding";
import { updateUserProfile } from "../../services/api";

export interface StoreInfoData {
  ownerName: string;
  storeName: string;
  phone: string;
  email: string;
  address: string;
  addressDetails?: string;
  districtCity?: string;
  addressNote?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  isOpen: boolean;
  isVerified: boolean;
  profileImage: string | null;
}

interface ProfileProps {
  storeInfo: StoreInfoData;
  setStoreInfo: (info: any) => void;
  userId?: string;
  navigate: (screen: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ storeInfo, setStoreInfo, userId, navigate }) => {
  // Toast & Confirm states (No browser native popups)
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    type: ToastType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showToast = (type: ToastType, title: string, message: string) => {
    setToastConfig({ visible: true, type, title, message });
  };

  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "danger" | "warning" | "success" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => {},
  });

  const showConfirm = (params: {
    title: string;
    message: string;
    type?: "danger" | "warning" | "success" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmDialogConfig({
      visible: true,
      ...params,
    });
  };

  // Modal states
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
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
  const [editStoreAddressDetails, setEditStoreAddressDetails] = useState(storeInfo.addressDetails || storeInfo.address || "");
  const [editStoreDistrictCity, setEditStoreDistrictCity] = useState(storeInfo.districtCity || "");
  const [editStoreAddressNote, setEditStoreAddressNote] = useState(storeInfo.addressNote || "");
  const [editStoreLat, setEditStoreLat] = useState<number>(storeInfo.latitude ?? -6.5962);
  const [editStoreLng, setEditStoreLng] = useState<number>(storeInfo.longitude ?? 106.8040);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);

  const openStoreModal = () => {
    setEditStoreName(storeInfo.storeName);
    setEditStoreDesc(storeInfo.description);
    setEditStoreAddr(storeInfo.address);
    setEditStoreAddressDetails(storeInfo.addressDetails || storeInfo.address || "");
    setEditStoreDistrictCity(storeInfo.districtCity || "");
    setEditStoreAddressNote(storeInfo.addressNote || "");
    setEditStoreLat(storeInfo.latitude ?? -6.5962);
    setEditStoreLng(storeInfo.longitude ?? 106.8040);
    setStoreModalVisible(true);
  };

  const handleLocationPicked = async (loc: CustomerLocationValue) => {
    setEditStoreLat(loc.latitude);
    setEditStoreLng(loc.longitude);
    setLocationPickerVisible(false);

    let detected = loc.detectedAddress || "";
    if (!detected) {
      const rev = await safeReverseGeocode(loc.latitude, loc.longitude);
      if (rev?.formattedAddress) {
        detected = rev.formattedAddress;
      }
    }

    if (detected) {
      setEditStoreAddr(detected);
      if (!editStoreAddressDetails || editStoreAddressDetails.length < 5) {
        setEditStoreAddressDetails(detected);
      }
    }
    showToast(
      "success",
      "Titik Maps Terpasang",
      `Koordinat: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
    );
  };

  const handleUseCurrentGps = async () => {
    setIsGettingGps(true);
    try {
      const loc = await getCurrentUserCoordinates();
      if (loc && loc.latitude && loc.longitude) {
        setEditStoreLat(loc.latitude);
        setEditStoreLng(loc.longitude);
        if (loc.address) {
          setEditStoreAddr(loc.address);
          if (!editStoreAddressDetails || editStoreAddressDetails.length < 5) {
            setEditStoreAddressDetails(loc.address);
          }
        }
        showToast(
          "success",
          "Lokasi GPS Terpasang",
          `Akurasi tinggi (${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)})`
        );
      } else {
        showToast(
          "warning",
          "GPS Belum Terdeteksi",
          "Mohon izinkan akses lokasi pada browser/perangkat Anda."
        );
      }
    } catch {
      showToast(
        "error",
        "Gagal GPS",
        "Gagal mengambil koordinat saat ini. Silakan pilih di Maps."
      );
    } finally {
      setIsGettingGps(false);
    }
  };

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
      showToast("error", "Error", "Nama pemilik tidak boleh kosong");
      return;
    }
    setStoreInfo({ ...storeInfo, ownerName: editName, phone: editPhone });
    setAccountModalVisible(false);
    showToast("success", "Sukses", "Informasi akun berhasil diperbarui");
  };

  const handleSavePassword = () => {
    if (currPassword.trim() === "" || newPassword.trim() === "") {
      showToast("error", "Error", "Password tidak boleh kosong");
      return;
    }
    setCurrPassword("");
    setNewPassword("");
    setPasswordModalVisible(false);
    showToast("success", "Sukses", "Password berhasil diperbarui");
  };

  const handleSavePhone = () => {
    setStoreInfo({ ...storeInfo, phone: editPhone });
    setPhoneModalVisible(false);
    showToast("success", "Sukses", "Nomor HP berhasil diperbarui");
  };

  const handleSaveStore = async () => {
    if (editStoreName.trim() === "") {
      showToast("error", "Error", "Nama toko tidak boleh kosong");
      return;
    }
    const street = editStoreAddressDetails.trim() || editStoreAddr.trim();
    if (street === "") {
      showToast("error", "Error", "Alamat spesifik toko wajib diisi untuk penjemputan driver.");
      return;
    }

    setIsSavingStore(true);
    const combinedAddress = [street, editStoreDistrictCity.trim()].filter(Boolean).join(", ");

    const updated: StoreInfoData = {
      ...storeInfo,
      storeName: editStoreName.trim(),
      description: editStoreDesc.trim(),
      address: combinedAddress,
      addressDetails: street,
      districtCity: editStoreDistrictCity.trim(),
      addressNote: editStoreAddressNote.trim(),
      latitude: editStoreLat,
      longitude: editStoreLng,
    };

    setStoreInfo(updated);
    setStoreModalVisible(false);

    if (userId) {
      try {
        await updateUserProfile(userId, {
          address: combinedAddress,
          roleData: {
            businessName: editStoreName.trim(),
            businessDescription: editStoreDesc.trim(),
            businessAddress: combinedAddress,
            addressDetails: street,
            districtCity: editStoreDistrictCity.trim(),
            addressNote: editStoreAddressNote.trim(),
            latitude: editStoreLat,
            longitude: editStoreLng,
          },
        });
        showToast("success", "Sukses", "Informasi & titik Maps toko berhasil disimpan ke sistem.");
      } catch {
        showToast("success", "Tersimpan", "Informasi toko berhasil diperbarui.");
      }
    } else {
      showToast("success", "Sukses", "Informasi toko berhasil diperbarui.");
    }
    setIsSavingStore(false);
  };

  const handleToggleStoreStatus = () => {
    const nextStatus = !storeInfo.isOpen;
    showConfirm({
      title: nextStatus ? "Buka Toko?" : "Tutup Toko?",
      message: nextStatus 
        ? "Toko akan kembali menerima pesanan customer." 
        : "Toko tidak akan menerima pesanan baru selama ditutup.",
      type: nextStatus ? "success" : "warning",
      confirmText: nextStatus ? "Buka Toko" : "Tutup Toko",
      cancelText: "Batal",
      onConfirm: () => {
        setConfirmDialogConfig((prev) => ({ ...prev, visible: false }));
        setStoreInfo({ ...storeInfo, isOpen: nextStatus });
        showToast("success", "Sukses", nextStatus ? "Toko sekarang buka." : "Toko sekarang tutup.");
      },
    });
  };

  const handleShareStore = () => {
    showToast("info", "Informasi Toko", `${storeInfo.storeName} - ${storeInfo.address} (Informasi toko siap dibagikan)`);
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    navigate("login");
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
            onPress={openStoreModal}
            activeOpacity={0.7}
          >
            {renderMenuIcon(<StoreIcon size={16} color="#1B7A4E" />, "#E8F5EE")}
            <View style={styles.menuItemBody}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.menuItemTitle}>Informasi & Alamat Toko</Text>
                <View style={styles.verifiedLocationPill}>
                  <MapPin size={10} color="#15803D" />
                  <Text style={styles.verifiedLocationPillText}>Maps & GPS</Text>
                </View>
              </View>
              <Text style={styles.menuItemSubtitle} numberOfLines={2}>
                {displayVal(storeInfo.storeName, "Nama toko belum diisi")} • {displayVal(storeInfo.address, "Alamat belum diatur")}
              </Text>
              {Boolean(storeInfo.addressNote) && (
                <Text style={styles.driverPatokanNoteText} numberOfLines={1}>
                  Patokan: {storeInfo.addressNote}
                </Text>
              )}
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
            onPress={() => showToast("info", "Keamanan", "Sesi login Anda sedang aktif dan aman.")}
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
            onPress={() => showToast("info", "Bantuan", "Gunakan tab Beranda untuk mengelola menu, tab Order untuk memproses pesanan masuk, dan tab Pendapatan untuk penarikan saldo.")}
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
            onPress={() => showToast("info", "Kebijakan & Ketentuan", "Halaman kebijakan dan syarat penggunaan saat ini menggunakan standar platform GEOVERSE 2.0.")}
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
        <Text style={styles.footerVersion}>GEOVERSE 2.0 - Pemilik Marketplace</Text>
      </ScrollView>

      <LogoutConfirmModal
        visible={logoutModalVisible}
        roleLabel="Pemilik Marketplace"
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
              <Image source={{ uri: storeInfo.profileImage }} style={styles.previewImage} />
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

      {/* 6. Modal Edit Store Info & Specific Location Maps */}
      <Modal visible={storeModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.sheetTitle}>Edit Informasi & Lokasi Toko</Text>
                <Text style={styles.sheetSubtitle}>
                  Atur alamat spesifik & titik peta agar kurir/driver mudah menjemput
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStoreModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.formScrollContainerLarge}
              contentContainerStyle={{ gap: 14, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Nama & Deskripsi Toko */}
              <View style={styles.formFieldGroup}>
                <Text style={styles.inputLabel}>
                  Nama Toko <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput 
                  style={styles.textInput}
                  value={editStoreName}
                  onChangeText={setEditStoreName}
                  placeholder="Misal: Cemilan Serba Ada"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formFieldGroup}>
                <Text style={styles.inputLabel}>Deskripsi Toko</Text>
                <TextInput 
                  style={[styles.textInput, styles.textAreaSmall]}
                  value={editStoreDesc}
                  onChangeText={setEditStoreDesc}
                  placeholder="Deskripsikan ragam produk UMKM yang Anda jual..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* 2. Kartu Maps & Titik Koordinat GPS Penjemputan Driver */}
              <View style={styles.mapCardContainer}>
                <View style={styles.mapCardHeaderRow}>
                  <View style={styles.mapCardTitleRow}>
                    <View style={styles.mapPinBadge}>
                      <MapPin size={16} color="#15803D" />
                    </View>
                    <View>
                      <Text style={styles.mapCardTitle}>Titik Maps Penjemputan (GPS)</Text>
                      <Text style={styles.mapCardSubtitle}>Panduan navigasi akurat kurir ke tokomu</Text>
                    </View>
                  </View>
                  <View style={styles.gpsStatusPill}>
                    <Text style={styles.gpsStatusPillText}>
                      {editStoreLat && editStoreLng ? "🟢 GPS Terpasang" : "⚠️ Belum Diset"}
                    </Text>
                  </View>
                </View>

                {/* Visual Mini Map Preview */}
                <View style={styles.miniMapWrapper}>
                  {Platform.OS === "web" ? (
                    <iframe
                      title="Store Location Map"
                      src={`https://maps.google.com/maps?q=${editStoreLat},${editStoreLng}&z=16&output=embed`}
                      style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                    />
                  ) : (
                    <View style={styles.miniMapPlaceholder}>
                      <MapIcon size={32} color="#16A34A" />
                      <Text style={styles.miniMapPlaceholderTitle}>Peta Titik Penjemputan</Text>
                    </View>
                  )}
                  <View style={styles.miniMapFloatingPill}>
                    <NavigationIcon size={12} color="#15803D" />
                    <Text style={styles.miniMapFloatingPillText}>
                      {editStoreLat.toFixed(5)}, {editStoreLng.toFixed(5)}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons for Map & GPS */}
                <View style={styles.mapButtonsRow}>
                  <TouchableOpacity
                    style={styles.openMapBtn}
                    onPress={() => setLocationPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Compass size={15} color="#FFFFFF" />
                    <Text style={styles.openMapBtnText}>Buka & Pilih di Maps</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.useGpsBtn}
                    onPress={handleUseCurrentGps}
                    disabled={isGettingGps}
                    activeOpacity={0.8}
                  >
                    {isGettingGps ? (
                      <ActivityIndicator size="small" color="#15803D" />
                    ) : (
                      <>
                        <Crosshair size={15} color="#15803D" />
                        <Text style={styles.useGpsBtnText}>GPS Saya</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Detail Alamat Spesifik Toko */}
              <View style={styles.formFieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.inputLabel}>
                    Alamat Lengkap (Nama Jalan, No. Bangunan, RT/RW) <Text style={{ color: "#DC2626" }}>*</Text>
                  </Text>
                </View>
                <TextInput 
                  style={[styles.textInput, styles.textAreaSmall]}
                  value={editStoreAddressDetails}
                  onChangeText={setEditStoreAddressDetails}
                  placeholder="Misal: Jl. Raya Pajajaran No. 88, RT 02 / RW 05"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.formFieldGroup}>
                <Text style={styles.inputLabel}>
                  Kelurahan, Kecamatan & Kota / Kabupaten <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <TextInput 
                  style={styles.textInput}
                  value={editStoreDistrictCity}
                  onChangeText={setEditStoreDistrictCity}
                  placeholder="Misal: Babakan, Bogor Tengah, Kota Bogor"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 4. Patokan Khusus Driver */}
              <View style={styles.driverNoteCard}>
                <View style={styles.driverNoteHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Truck size={16} color="#15803D" />
                    <Text style={styles.driverNoteTitle}>Patokan & Catatan Penjemputan Driver</Text>
                  </View>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Sangat Membantu Driver</Text>
                  </View>
                </View>
                <TextInput 
                  style={[styles.textInput, styles.textAreaMedium, { backgroundColor: "#FFFFFF" }]}
                  value={editStoreAddressNote}
                  onChangeText={setEditStoreAddressNote}
                  placeholder="Misal: Ruko 2 lantai warna toska sebelah Alfamart. Masuk gerbang hitam, toko di sebelah kanan. Driver bisa parkir gratis di depan toko."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.driverNoteHintRow}>
                  <Info size={13} color="#0D9488" />
                  <Text style={styles.driverNoteHintText}>
                    Catatan ini akan otomatis tampil di layar Driver saat mengambil pesanan (Pick-Up), sehingga kurir langsung menemukan toko tanpa perlu telepon tanya-tanya jalan.
                  </Text>
                </View>
              </View>

              {/* 5. Pratinjau Alamat Lengkap Toko */}
              {(editStoreAddressDetails.trim() || editStoreDistrictCity.trim()) && (
                <View style={styles.addressPreviewBox}>
                  <Text style={styles.addressPreviewLabel}>PRATINJAU ALAMAT TOKO:</Text>
                  <Text style={styles.addressPreviewText}>
                    {[editStoreAddressDetails.trim(), editStoreDistrictCity.trim()].filter(Boolean).join(", ")}
                  </Text>
                  {Boolean(editStoreAddressNote.trim()) && (
                    <Text style={styles.addressPreviewNote}>
                      📍 Patokan: {editStoreAddressNote.trim()}
                    </Text>
                  )}
                  <Text style={styles.addressPreviewCoords}>
                    🗺️ Koordinat Maps: {editStoreLat.toFixed(5)}, {editStoreLng.toFixed(5)}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.sheetActions}>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setStoreModalVisible(false)}
                  disabled={isSavingStore}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSaveStore}
                  disabled={isSavingStore}
                >
                  {isSavingStore ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sheetBtnTextSolid}>Simpan Alamat & Lokasi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Interactive CustomerLocationPicker */}
      <CustomerLocationPicker
        visible={locationPickerVisible}
        title="Tentukan Titik Toko Marketplace"
        subtitle="Geser pin atau ketuk peta tepat di depan pintu masuk penjemputan tokomu"
        badgeText="Toko UMKM"
        initialLocation={{
          latitude: editStoreLat,
          longitude: editStoreLng,
          detectedAddress: editStoreAddressDetails || editStoreAddr,
        }}
        onConfirm={handleLocationPicked}
        onClose={() => setLocationPickerVisible(false)}
      />

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
      {/* In-App Toast & Confirm Dialog */}
      <ToastBanner
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />

      <ConfirmDialog
        visible={confirmDialogConfig.visible}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        type={confirmDialogConfig.type}
        confirmText={confirmDialogConfig.confirmText}
        cancelText={confirmDialogConfig.cancelText}
        onConfirm={confirmDialogConfig.onConfirm}
        onCancel={() => setConfirmDialogConfig((prev) => ({ ...prev, visible: false }))}
      />
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

  sheetSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },
  formScrollContainerLarge: {
    maxHeight: Platform.OS === "web" ? 520 : 460,
  },
  formFieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textAreaSmall: {
    textAlignVertical: "top",
    minHeight: 56,
  },
  textAreaMedium: {
    textAlignVertical: "top",
    minHeight: 76,
  },
  mapCardContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    padding: 14,
    gap: 10,
  },
  mapCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  mapPinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#14532D",
  },
  mapCardSubtitle: {
    fontSize: 10.5,
    color: "#166534",
  },
  gpsStatusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  gpsStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  miniMapWrapper: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  miniMapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
  },
  miniMapPlaceholderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  miniMapFloatingPill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  miniMapFloatingPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  mapButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  openMapBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  openMapBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  useGpsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  useGpsBtnText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
  },
  driverNoteCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 8,
  },
  driverNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  driverNoteTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  recommendedBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#B45309",
  },
  driverNoteHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F0FDFA",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  driverNoteHintText: {
    flex: 1,
    fontSize: 10.5,
    color: "#0F766E",
    lineHeight: 15,
  },
  addressPreviewBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  addressPreviewLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  addressPreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 17,
  },
  addressPreviewNote: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
    marginTop: 2,
  },
  addressPreviewCoords: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  verifiedLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedLocationPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803D",
  },
  driverPatokanNoteText: {
    fontSize: 10.5,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
});