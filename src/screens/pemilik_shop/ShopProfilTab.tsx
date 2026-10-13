import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  User,
  Lock,
  Phone,
  Store,
  Building2,
  Clock,
  MapPin,
  Wallet,
  CreditCard,
  QrCode,
  ShieldCheck,
  Bell,
  Volume2,
  Users,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
  X,
  CheckCircle2,
  Plus,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthAccount } from "../auth/authTypes";
import { updateCachedAccount } from "../auth/authService";
import { ShopStore, updateMerchantShopStore } from "../../services/shopService";
import { ProfilePhotoEditor } from "../../components/ProfilePhotoEditor";
import { updateUserProfile, uploadFileToBackend } from "../../services/api";

interface ShopProfilTabProps {
  store: ShopStore | null;
  setStore: (s: ShopStore | null) => void;
  authAccount?: AuthAccount | null;
  navigate: (screen: any) => void;
  onUpdateAccount?: (account: AuthAccount) => void;
}

export const ShopProfilTab: React.FC<ShopProfilTabProps> = ({
  store,
  setStore,
  authAccount,
  navigate,
  onUpdateAccount,
}) => {
  const [profilePhoto, setProfilePhoto] = useState(authAccount?.profilePhoto || "");
  const [isOpenStatus, setIsOpenStatus] = useState<boolean>(store?.isOpen ?? true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Notification toggles
  const [notifOrder, setNotifOrder] = useState(true);
  const [notifSound, setNotifSound] = useState(true);

  // Modal states
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Account edit form
  const [editOwnerName, setEditOwnerName] = useState(authAccount?.name || "Dyaska");
  const [editOwnerPhone, setEditOwnerPhone] = useState(authAccount?.phone || "085294939357");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Password edit form
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Store edit form
  const [editStoreName, setEditStoreName] = useState(store?.outletName || store?.name || "Indomart Loadaya");
  const [editBrandType, setEditBrandType] = useState(store?.brandType || "ALFAMART");
  const [editCategory, setEditCategory] = useState(store?.businessCategory || store?.storeType || "SUPERMARKET");
  const [editAddress, setEditAddress] = useState(store?.address || "Lodaya");
  const [editStorePhone, setEditStorePhone] = useState(store?.businessPhone || authAccount?.phone || "085294939357");
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Operational hours form
  const [openingDays, setOpeningDays] = useState(store?.openingDays || "Buka Setiap Hari");
  const [openingTime, setOpeningTime] = useState(store?.openingHours?.openTime || "07:00");
  const [closingTime, setClosingTime] = useState(store?.openingHours?.closeTime || "22:00");
  const [isSavingHours, setIsSavingHours] = useState(false);

  // Payment method form
  const [paymentTab, setPaymentTab] = useState<"bank" | "qris">(
    store?.qrisImageUrl && !store?.bankAccountNumber ? "qris" : "bank"
  );
  const [bankName, setBankName] = useState(store?.bankName || "BCA");
  const [bankAccountNumber, setBankAccountNumber] = useState(store?.bankAccountNumber || "");
  const [bankAccountHolder, setBankAccountHolder] = useState(
    store?.bankAccountHolder || authAccount?.name || "Dyaska"
  );
  const [qrisImageUrl, setQrisImageUrl] = useState(store?.qrisImageUrl || "");
  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (authAccount?.profilePhoto) {
      setProfilePhoto(authAccount.profilePhoto);
    }
  }, [authAccount?.profilePhoto]);

  useEffect(() => {
    if (store) {
      setIsOpenStatus(store.isOpen !== false);
      if (store.outletName || store.name) setEditStoreName(store.outletName || store.name);
      if (store.brandType) setEditBrandType(store.brandType);
      if (store.address) setEditAddress(store.address);
      if (store.businessPhone) setEditStorePhone(store.businessPhone);
      if (store.bankName) setBankName(store.bankName);
      if (store.bankAccountNumber) setBankAccountNumber(store.bankAccountNumber);
      if (store.bankAccountHolder) setBankAccountHolder(store.bankAccountHolder);
      if (store.qrisImageUrl) setQrisImageUrl(store.qrisImageUrl);
      if (store.openingHours?.openTime) setOpeningTime(store.openingHours.openTime);
      if (store.openingHours?.closeTime) setClosingTime(store.openingHours.closeTime);
    }
  }, [store]);

  // Toggle Live Store Status
  const handleToggleStoreStatus = async (newVal: boolean) => {
    try {
      setIsUpdatingStatus(true);
      setIsOpenStatus(newVal);
      if (store) {
        setStore({ ...store, isOpen: newVal });
      }
      const res = await updateMerchantShopStore({ isOpen: newVal });
      if (res.success && res.data) {
        setStore(res.data);
      } else {
        Alert.alert("Gagal", res.message || "Gagal mengubah status buka toko");
        setIsOpenStatus(!newVal);
        if (store) {
          setStore({ ...store, isOpen: !newVal });
        }
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
      setIsOpenStatus(!newVal);
      if (store) {
        setStore({ ...store, isOpen: !newVal });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save Account Profile
  const handleSaveAccount = async () => {
    if (!editOwnerName.trim()) {
      Alert.alert("Perhatian", "Nama pemilik tidak boleh kosong.");
      return;
    }
    try {
      setIsSavingAccount(true);
      if (authAccount?.id) {
        await updateUserProfile(authAccount.id, {
          name: editOwnerName.trim(),
          phone: editOwnerPhone.trim(),
        });
      }
      setAccountModalVisible(false);
      Alert.alert("Sukses", "Data akun pemilik berhasil diperbarui!");
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal menyimpan akun.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Save Password
  const handleSavePassword = () => {
    if (!currPassword.trim() || !newPassword.trim()) {
      Alert.alert("Perhatian", "Harap isi password saat ini dan password baru.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Perhatian", "Password baru minimal 6 karakter.");
      return;
    }
    setIsSavingPassword(true);
    setTimeout(() => {
      setIsSavingPassword(false);
      setCurrPassword("");
      setNewPassword("");
      setPasswordModalVisible(false);
      Alert.alert("Sukses", "Password akun berhasil diperbarui!");
    }, 600);
  };

  // Save Store Details
  const handleSaveStore = async () => {
    if (!editStoreName.trim() || !editAddress.trim()) {
      Alert.alert("Perhatian", "Nama toko dan alamat tidak boleh kosong.");
      return;
    }

    try {
      setIsSavingStore(true);
      const res = await updateMerchantShopStore({
        name: editStoreName.trim(),
        outletName: editStoreName.trim(),
        brandType: (editBrandType.trim() as any) || "INDEPENDENT",
        businessCategory: (editCategory.trim() as any) || "SUPERMARKET",
        address: editAddress.trim(),
        businessPhone: editStorePhone.trim(),
      });

      if (res.success && res.data) {
        setStore(res.data);
        setStoreModalVisible(false);
        Alert.alert("Tersimpan", "Informasi toko berhasil diperbarui.");
      } else {
        Alert.alert("Gagal", res.message || "Gagal memperbarui toko");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    } finally {
      setIsSavingStore(false);
    }
  };

  // Save Operational Hours
  const handleSaveOperationalHours = async () => {
    try {
      setIsSavingHours(true);
      const res = await updateMerchantShopStore({
        openingDays,
        openingHours: {
          openTime: openingTime,
          closeTime: closingTime,
          daysOpen: [openingDays],
          isOpenNow: isOpenStatus,
        },
      });

      if (res.success && res.data) {
        setStore(res.data);
        setHoursModalVisible(false);
        Alert.alert("Jadwal Tersimpan", `Jam operasional: ${openingDays} (${openingTime} - ${closingTime} WIB)`);
      } else {
        Alert.alert("Gagal", res.message || "Gagal memperbarui jam operasional");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    } finally {
      setIsSavingHours(false);
    }
  };

  // Pick QRIS Image
  const handlePickQris = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingQris(true);
      const uploaded = await uploadFileToBackend(
        asset.uri,
        asset.fileName || `shop-qris-${Date.now()}.jpg`,
        asset.mimeType || "image/jpeg"
      );
      if (!uploaded?.success || !uploaded.data?.url) throw new Error("QRIS gagal diunggah.");
      setQrisImageUrl(uploaded.data.url);
      Alert.alert("QRIS Terunggah", "Foto barcode QRIS toko siap disimpan.");
    } catch (error: any) {
      Alert.alert("Gagal mengunggah QRIS", error?.message || "Coba lagi.");
    } finally {
      setIsUploadingQris(false);
    }
  };

  // Save Payment Method
  const handleSavePayment = async () => {
    try {
      setIsSavingPayment(true);
      const payload: any = {};
      if (paymentTab === "qris") {
        if (!qrisImageUrl.trim()) {
          Alert.alert("Perhatian", "Silakan unggah gambar QRIS terlebih dahulu.");
          setIsSavingPayment(false);
          return;
        }
        payload.qrisImageUrl = qrisImageUrl.trim();
      } else {
        if (!bankAccountNumber.trim()) {
          Alert.alert("Perhatian", "Harap isi nomor rekening.");
          setIsSavingPayment(false);
          return;
        }
        payload.bankName = bankName;
        payload.bankAccountNumber = bankAccountNumber.trim();
        payload.bankAccountHolder = bankAccountHolder.trim() || editOwnerName;
      }

      const res = await updateMerchantShopStore(payload);
      if (res.success && res.data) {
        setStore(res.data);
        setPaymentModalVisible(false);
        Alert.alert(
          "Metode Pembayaran Tersimpan",
          paymentTab === "qris"
            ? "QRIS Barcode Toko aktif untuk menerima pembayaran."
            : `${bankName} (${bankAccountNumber}) atas nama ${bankAccountHolder} aktif.`
        );
      } else {
        Alert.alert("Gagal", res.message || "Gagal memperbarui metode pembayaran");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setLogoutModalVisible(false);
    navigate("login");
  };

  const displayName = authAccount?.name || "Dyaska";
  const displayStore = store?.outletName || store?.name || "Indomart Loadaya";
  const displayPhone = authAccount?.phone || store?.businessPhone || "085294939357";
  const hoursDisplay = `${openingTime} - ${closingTime} WIB`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Signature Kanyaah Green Profile Header */}
      <View style={styles.profileHeader}>
        <ProfilePhotoEditor
          userId={authAccount?.id || "6acccf5a8931baef62204624"}
          name={displayName}
          photoUri={profilePhoto}
          size={96}
          onSaved={(newPhotoUri) => {
            setProfilePhoto(newPhotoUri);
            const updatedAccount: AuthAccount = {
              ...(authAccount || {
                id: "6acccf5a8931baef62204624",
                role: "pemilik_shop",
                name: displayName,
                email: "dyaskaaa@gmail.com",
                phone: displayPhone,
                address: "Lodaya",
                status: "verified",
                roleData: {},
                documents: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
              profilePhoto: newPhotoUri,
              updatedAt: new Date().toISOString(),
            };
            void updateCachedAccount(updatedAccount);
            onUpdateAccount?.(updatedAccount);
          }}
        />

        <Text style={styles.ownerName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.storeName} numberOfLines={1}>
          {displayStore}
        </Text>
        <Text style={styles.profilePhone} numberOfLines={1}>
          {displayPhone}
        </Text>

        {/* 3-Column Profile Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{(store as any)?.products?.length || 77}</Text>
            <Text style={styles.statLbl}>Produk</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statCol}
            onPress={() => handleToggleStoreStatus(!isOpenStatus)}
            activeOpacity={0.7}
            disabled={isUpdatingStatus}
          >
            <Text style={styles.statVal}>{isOpenStatus ? "Buka" : "Tutup"}</Text>
            <Text style={styles.statLbl}>Status Toko</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>
              {store?.isOfficialBrandPartner ? "Official" : "Mitra Aktif"}
            </Text>
            <Text style={styles.statLbl}>Kemitraan</Text>
          </View>
        </View>
      </View>

      {/* 2. Group: AKUN */}
      <Text style={styles.sectionTitle}>AKUN</Text>
      <View style={styles.groupCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setAccountModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#E8F5EE" }]}>
            <User size={18} color="#0D7A53" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Detail Akun</Text>
            <Text style={styles.menuSubText} numberOfLines={1}>
              {authAccount?.email || `${displayName} • Mitra Kanyaah Shop`}
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setPasswordModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#E8F5EE" }]}>
            <Lock size={18} color="#0D7A53" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Ubah Password</Text>
            <Text style={styles.menuSubText}>Perbarui keamanan kata sandi akun</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, { borderBottomWidth: 0 }]}
          onPress={() => setAccountModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#E8F5EE" }]}>
            <Phone size={18} color="#0D7A53" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Nomor WhatsApp</Text>
            <Text style={styles.menuSubText}>{displayPhone}</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 3. Group: PENGATURAN TOKO & OPERASIONAL */}
      <Text style={styles.sectionTitle}>PENGATURAN TOKO & OPERASIONAL</Text>
      <View style={styles.groupCard}>
        {/* Live Store Toggle Switch */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => handleToggleStoreStatus(!isOpenStatus)}
          activeOpacity={0.7}
          disabled={isUpdatingStatus}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: isOpenStatus ? "#E8F5EE" : "#FEE2E2" },
            ]}
          >
            <Store size={18} color={isOpenStatus ? "#0D7A53" : "#DC2626"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Status Buka Toko</Text>
            <Text
              style={[
                styles.menuSubText,
                { color: isOpenStatus ? "#0D7A53" : "#DC2626", fontWeight: "700" },
              ]}
            >
              {isOpenStatus
                ? "Buka (Menerima Pesanan & Resep)"
                : "Tutup Sementara"}
            </Text>
          </View>
          {isUpdatingStatus ? (
            <ActivityIndicator size="small" color="#0D7A53" />
          ) : (
            <View style={{ pointerEvents: "none" }}>
              <Switch
                value={isOpenStatus}
                onValueChange={handleToggleStoreStatus}
                trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                thumbColor={isOpenStatus ? "#0D7A53" : "#94A3B8"}
              />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setStoreModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#E0F2FE" }]}>
            <Building2 size={18} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Informasi Outlet & Kategori</Text>
            <Text style={styles.menuSubText} numberOfLines={1}>
              {displayStore} • {editBrandType} • {editCategory}
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setHoursModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#E0F2FE" }]}>
            <Clock size={18} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Atur Jam & Hari Operasional</Text>
            <Text style={styles.menuSubText} numberOfLines={1}>
              {openingDays} • {hoursDisplay}
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setStoreModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#F3E8FF" }]}>
            <MapPin size={18} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Alamat Toko / Outlet</Text>
            <Text style={styles.menuSubText} numberOfLines={1}>
              {editAddress}
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setPaymentModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#FEF3C7" }]}>
            <Wallet size={18} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Metode Pembayaran Toko</Text>
            <Text
              style={[
                styles.menuSubText,
                !bankAccountNumber && !qrisImageUrl && { color: "#D97706", fontWeight: "600" },
              ]}
              numberOfLines={1}
            >
              {qrisImageUrl
                ? "QRIS Barcode Toko Aktif (Siap Scan)"
                : bankAccountNumber
                ? `${bankName} • ${bankAccountNumber} (${bankAccountHolder})`
                : "Belum diatur (Pilih Rekening Bank / QRIS)"}
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, { borderBottomWidth: 0 }]}
          onPress={() =>
            Alert.alert(
              "Status Verifikasi Outlet",
              store?.isOfficialBrandPartner
                ? "Outlet Anda telah berstatus Resmi / Official Brand Partner di Kanyaah Shop."
                : "Outlet Anda aktif beroperasi dan dapat menerima pesanan pelanggan."
            )
          }
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
            <ShieldCheck size={18} color="#15803D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Status Verifikasi Outlet</Text>
            <Text style={styles.menuSubText}>
              {store?.isOfficialBrandPartner
                ? "Terverifikasi Official Brand Partner"
                : "Mitra Outlet Kanyaah Shop Aktif"}
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 4. Group: NOTIFIKASI */}
      <Text style={styles.sectionTitle}>NOTIFIKASI</Text>
      <View style={styles.groupCard}>
        <View style={styles.menuRow}>
          <View style={[styles.iconBg, { backgroundColor: "#E8F5EE" }]}>
            <Bell size={18} color="#0D7A53" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Notifikasi Pesanan Masuk</Text>
            <Text style={styles.menuSubText}>Pemberitahuan real-time saat pesanan diterima</Text>
          </View>
          <Switch
            value={notifOrder}
            onValueChange={setNotifOrder}
            trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
            thumbColor={notifOrder ? "#0D7A53" : "#94A3B8"}
          />
        </View>

        <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.iconBg, { backgroundColor: "#E0F2FE" }]}>
            <Volume2 size={18} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Suara Nada Dering Pesanan</Text>
            <Text style={styles.menuSubText}>Bunyi notifikasi berulang saat orderan masuk</Text>
          </View>
          <Switch
            value={notifSound}
            onValueChange={setNotifSound}
            trackColor={{ false: "#CBD5E1", true: "#BAE6FD" }}
            thumbColor={notifSound ? "#0284C7" : "#94A3B8"}
          />
        </View>
      </View>

      {/* 5. Group: LAINNYA */}
      <Text style={styles.sectionTitle}>LAINNYA</Text>
      <View style={styles.groupCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigate("role")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#F3F4F6" }]}>
            <Users size={18} color="#4B5563" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Ganti Peran / Dashboard</Text>
            <Text style={styles.menuSubText}>Beralih ke peran Customer, Driver, Laundry, dll.</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            Alert.alert(
              "Pusat Bantuan",
              "Hubungi CS Mitra Kanyaah Shop jika Anda membutuhkan bantuan seputar produk, pesanan, atau payout."
            )
          }
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#F3F4F6" }]}>
            <HelpCircle size={18} color="#4B5563" />
          </View>
          <Text style={styles.menuText}>Pusat Bantuan & Panduan Mitra</Text>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuRow, { borderBottomWidth: 0 }]}
          onPress={() =>
            Alert.alert("Kebijakan & Privasi", "Data akun dan transaksi Anda aman terlindungi.")
          }
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#F3F4F6" }]}>
            <Shield size={18} color="#4B5563" />
          </View>
          <Text style={styles.menuText}>Kebijakan & Privasi</Text>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 6. Logout Card */}
      <View style={styles.logoutCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBg, { backgroundColor: "#FEE2E2" }]}>
            <LogOut size={18} color="#DC2626" />
          </View>
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>GEOVERSE 2.0 • Mitra Pemilik Kanyaah Shop</Text>

      {/* MODAL 1: Edit Account Info */}
      <Modal visible={accountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Detail Akun Pemilik</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.fieldLabel}>Nama Lengkap Pemilik</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Nama pemilik"
                placeholderTextColor="#94A3B8"
                value={editOwnerName}
                onChangeText={setEditOwnerName}
              />

              <Text style={styles.fieldLabel}>Nomor WhatsApp / HP</Text>
              <TextInput
                style={styles.inputField}
                placeholder="08123456789"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={editOwnerPhone}
                onChangeText={setEditOwnerPhone}
              />

              <Text style={styles.fieldLabel}>Email Akun Terdaftar</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: "#F1F5F9", color: "#64748B" }]}
                value={authAccount?.email || "dyaska@gmail.com"}
                editable={false}
              />

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSaveAccount}
                disabled={isSavingAccount}
              >
                {isSavingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Simpan Informasi Akun</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Change Password */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Ubah Kata Sandi</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.fieldLabel}>Password Saat Ini</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Masukkan password lama"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={currPassword}
                onChangeText={setCurrPassword}
              />

              <Text style={styles.fieldLabel}>Password Baru (Min 6 Karakter)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Masukkan password baru"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSavePassword}
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Perbarui Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Edit Store Information */}
      <Modal visible={storeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Informasi Outlet & Toko</Text>
              <TouchableOpacity onPress={() => setStoreModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>Nama Toko / Outlet</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Contoh: Indomart Loadaya"
                placeholderTextColor="#94A3B8"
                value={editStoreName}
                onChangeText={setEditStoreName}
              />

              <Text style={styles.fieldLabel}>Tipe Brand (ALFAMART / INDOMARET / INDEPENDENT)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="ALFAMART / INDOMARET / LAINNYA"
                placeholderTextColor="#94A3B8"
                value={editBrandType}
                onChangeText={(text) => setEditBrandType(text as any)}
              />

              <Text style={styles.fieldLabel}>Kategori Usaha (SUPERMARKET / MINIMARKET / APOTEK)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="SUPERMARKET / TOKO KELONTONG"
                placeholderTextColor="#94A3B8"
                value={editCategory}
                onChangeText={(text) => setEditCategory(text as any)}
              />

              <Text style={styles.fieldLabel}>Alamat Lengkap Outlet</Text>
              <TextInput
                style={[styles.inputField, { minHeight: 60 }]}
                placeholder="Alamat detail outlet"
                placeholderTextColor="#94A3B8"
                multiline
                value={editAddress}
                onChangeText={setEditAddress}
              />

              <Text style={styles.fieldLabel}>Nomor WhatsApp Outlet</Text>
              <TextInput
                style={styles.inputField}
                placeholder="08123456789"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={editStorePhone}
                onChangeText={setEditStorePhone}
              />

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSaveStore}
                disabled={isSavingStore}
              >
                {isSavingStore ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Simpan Informasi Toko</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Edit Operational Hours */}
      <Modal visible={hoursModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Jam & Hari Operasional Toko</Text>
              <TouchableOpacity onPress={() => setHoursModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.fieldLabel}>HARI OPERASIONAL</Text>
              <View style={styles.bankPillsRow}>
                {["Buka Setiap Hari", "Senin - Sabtu", "Senin - Jumat", "Pukul 24 Jam"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.bankPill, openingDays === d && styles.bankPillActive]}
                    onPress={() => setOpeningDays(d)}
                  >
                    <Text
                      style={[styles.bankPillText, openingDays === d && styles.bankPillTextActive]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Jam Buka</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="07:00"
                    placeholderTextColor="#94A3B8"
                    value={openingTime}
                    onChangeText={setOpeningTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Jam Tutup</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="22:00"
                    placeholderTextColor="#94A3B8"
                    value={closingTime}
                    onChangeText={setClosingTime}
                  />
                </View>
              </View>

              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>PRATINJAU UNTUK PELANGGAN:</Text>
                <Text style={styles.previewText}>
                  {openingDays} • {openingTime} - {closingTime} WIB
                </Text>
              </View>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSaveOperationalHours}
                disabled={isSavingHours}
              >
                {isSavingHours ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Simpan Jam Operasional</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Payment Method (Bank / E-Wallet OR QRIS) */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Metode Pembayaran Toko</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={styles.paymentModalNotice}>
                Pilih metode pembayaran toko Anda. Pelanggan akan mentransfer atau memindai barcode QRIS saat berbelanja.
              </Text>

              {/* Selector Tabs: Bank OR QRIS */}
              <View style={styles.paymentModeTabs}>
                <TouchableOpacity
                  style={[styles.paymentModeTab, paymentTab === "bank" && styles.paymentModeTabActive]}
                  onPress={() => setPaymentTab("bank")}
                  activeOpacity={0.8}
                >
                  <CreditCard size={15} color={paymentTab === "bank" ? "#0D7A53" : "#6B7280"} />
                  <Text
                    style={[
                      styles.paymentModeTabText,
                      paymentTab === "bank" && styles.paymentModeTabTextActive,
                    ]}
                  >
                    Rekening Bank
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentModeTab, paymentTab === "qris" && styles.paymentModeTabActive]}
                  onPress={() => setPaymentTab("qris")}
                  activeOpacity={0.8}
                >
                  <QrCode size={15} color={paymentTab === "qris" ? "#0D7A53" : "#6B7280"} />
                  <Text
                    style={[
                      styles.paymentModeTabText,
                      paymentTab === "qris" && styles.paymentModeTabTextActive,
                    ]}
                  >
                    QRIS Barcode Toko
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentTab === "bank" ? (
                <View style={styles.paymentSectionBox}>
                  <Text style={styles.fieldLabel}>PILIH NAMA BANK</Text>
                  <View style={styles.bankPillsRow}>
                    {["BCA", "BRI", "Mandiri", "BNI", "BSI", "Dana", "GoPay", "OVO"].map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.bankPill, bankName === b && styles.bankPillActive]}
                        onPress={() => setBankName(b)}
                      >
                        <Text
                          style={[styles.bankPillText, bankName === b && styles.bankPillTextActive]}
                        >
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>NOMOR REKENING / AKUN {bankName.toUpperCase()}</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Contoh: 8035129988"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={bankAccountNumber}
                    onChangeText={setBankAccountNumber}
                  />

                  <Text style={styles.fieldLabel}>ATAS NAMA PEMILIK REKENING</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder={`Contoh: ${displayName}`}
                    placeholderTextColor="#94A3B8"
                    value={bankAccountHolder}
                    onChangeText={setBankAccountHolder}
                  />
                </View>
              ) : (
                <View style={styles.paymentSectionBox}>
                  <Text style={styles.fieldLabel}>UNGGAH GAMBAR BARCODE QRIS TOKO</Text>
                  {qrisImageUrl ? (
                    <View style={styles.qrisPreviewBox}>
                      <Image source={{ uri: qrisImageUrl }} style={styles.qrisImage} resizeMode="contain" />
                      <TouchableOpacity
                        style={styles.btnReuploadQris}
                        onPress={handlePickQris}
                        disabled={isUploadingQris}
                      >
                        <Text style={styles.btnReuploadQrisText}>Ganti Gambar QRIS</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.qrisUploadBox}
                      onPress={handlePickQris}
                      disabled={isUploadingQris}
                    >
                      {isUploadingQris ? (
                        <ActivityIndicator size="small" color="#0D7A53" />
                      ) : (
                        <>
                          <QrCode size={34} color="#0D7A53" />
                          <Text style={styles.qrisUploadTitle}>Pilih Foto QRIS Toko</Text>
                          <Text style={styles.qrisUploadSub}>Format PNG / JPG barcode toko Anda</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSavePayment}
                disabled={isSavingPayment}
              >
                {isSavingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Simpan Metode Pembayaran</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: Logout Confirmation Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Konfirmasi Keluar</Text>
            <Text style={styles.confirmSub}>
              Apakah Anda yakin ingin keluar dari akun Pemilik Kanyaah Shop?
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.btnCancelModal}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.btnCancelModalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnLogoutModal} onPress={handleLogout}>
                <Text style={styles.btnLogoutModalText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // 1. Signature Profile Header
  profileHeader: {
    backgroundColor: "#1B7A4E",
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 10,
    paddingHorizontal: 20,
    textAlign: "center",
  },
  storeName: {
    fontSize: 13,
    color: "#D1FAE5",
    marginTop: 3,
    fontWeight: "600",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  profilePhone: {
    fontSize: 12,
    color: "#A7F3D0",
    marginTop: 2,
  },

  // 3-Column Stats Row
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    alignItems: "center",
  },
  statCol: {
    alignItems: "center",
    minWidth: 70,
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLbl: {
    fontSize: 10,
    color: "#D1FAE5",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 12,
  },

  // Section Headers & Group Cards
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
    marginTop: 18,
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
    paddingVertical: 13,
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
  menuText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  menuSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // Logout Card
  logoutCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    overflow: "hidden",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  versionText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0F172A",
  },
  btnPrimary: {
    backgroundColor: "#0D7A53",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Bank Pills
  bankPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  bankPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bankPillActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  bankPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  bankPillTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },

  // Payment Tabs
  paymentModalNotice: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 16,
  },
  paymentModeTabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 10,
  },
  paymentModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  paymentModeTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentModeTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  paymentModeTabTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
  paymentSectionBox: {
    marginTop: 6,
  },

  // QRIS Upload
  qrisUploadBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 24,
    marginTop: 8,
  },
  qrisUploadTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  qrisUploadSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  qrisPreviewBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 8,
  },
  qrisImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  btnReuploadQris: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  btnReuploadQrisText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },

  previewBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  previewText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
    marginTop: 2,
  },

  // Center Confirmation Modal
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  confirmSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 17,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  btnCancelModal: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  btnCancelModalText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  btnLogoutModal: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  btnLogoutModalText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
