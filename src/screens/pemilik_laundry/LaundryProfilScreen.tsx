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
  ActivityIndicator,
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
  Upload,
  Image as ImageIcon,
  Camera,
  RefreshCw,
  CreditCard,
  Smartphone,
  Sparkles,
  Clock,
  Calendar,
  Power,
  Sun,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadFileToBackend } from "../../services/api";

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
    openingDays: "Buka Setiap Hari",
    openingTime: "07:00",
    closingTime: "21:00",
    openingHours: "07.00 - 21.00",
    isOpen: true,
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

  // Edit Payment (Bank, E-Wallet OR QRIS) Modal - STRICTLY SINGLE CHOICE
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"bank" | "qris">("bank");
  const [bankName, setBankName] = useState("BCA");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [isUploadingQris, setIsUploadingQris] = useState(false);

  // Operational Hours & Days Modal
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [openingDays, setOpeningDays] = useState("Buka Setiap Hari");
  const [openingTime, setOpeningTime] = useState("07:00");
  const [closingTime, setClosingTime] = useState("21:00");
  const [isStoreOpenStatus, setIsStoreOpenStatus] = useState(true);
  const [isSavingHours, setIsSavingHours] = useState(false);

  const loadStoreData = async () => {
    if (!authAccount?.id) return;
    const currentStore = await fetchMyLaundryStore(authAccount.id);
    if (currentStore) {
      const dynamicStoreName =
        authAccount?.roleData?.businessName ||
        (currentStore.storeName && currentStore.storeName !== "Toko Laundry Saya" && currentStore.storeName !== "Ais laundry" ? currentStore.storeName : null) ||
        (authAccount?.name ? `${authAccount.name} Laundry` : "Outlet Laundry");
      const updated = { ...currentStore, storeName: dynamicStoreName };
      setStore(updated);
      setServicesList(updated.services || []);
      setBankName(updated.bankName || "BCA");
      setBankAccountNumber(updated.bankAccountNumber || "");
      setBankAccountHolder(updated.bankAccountHolder || authAccount?.name || "");
      setQrisImageUrl(updated.qrisImageUrl || "");
      setOpeningDays(updated.openingDays || "Buka Setiap Hari");
      setOpeningTime(updated.openingTime || "07:00");
      setClosingTime(updated.closingTime || "21:00");
      setIsStoreOpenStatus(updated.isOpen !== false);

      // Strictly single choice selection:
      if (updated.qrisImageUrl && !updated.bankAccountNumber) {
        setPaymentTab("qris");
      } else {
        setPaymentTab("bank");
      }
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

  const convertBlobToBase64 = async (uri: string): Promise<string> => {
    if (!uri || !uri.startsWith("blob:")) return uri;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            resolve(uri);
          }
        };
        reader.onerror = () => resolve(uri);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("convertBlobToBase64 error:", e);
      return uri;
    }
  };

  const handlePickQrisImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Galeri Diperlukan",
          "Aplikasi memerlukan izin untuk memilih foto QRIS dari galeri Anda."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingQris(true);
        let immediateDataUri = asset.uri;

        if (asset.base64) {
          immediateDataUri = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
        } else if (asset.uri.startsWith("blob:")) {
          immediateDataUri = await convertBlobToBase64(asset.uri);
        }

        // 1. Tampilkan langsung di preview secara instan agar tidak pernah blank / putih
        setQrisImageUrl(immediateDataUri);

        // 2. Upload permanen ke server / Cloudinary
        try {
          const fileName = asset.fileName || `qris-${Date.now()}.jpg`;
          const mimeType = asset.mimeType || "image/jpeg";
          const uploadRes = await uploadFileToBackend(asset.uri, fileName, mimeType);
          if (uploadRes && uploadRes.success && uploadRes.data && uploadRes.data.url) {
            setQrisImageUrl(uploadRes.data.url);
          }
        } catch (uploadErr) {
          console.log("QRIS upload fallback to base64 data uri:", uploadErr);
        } finally {
          setIsUploadingQris(false);
        }
      }
    } catch (err) {
      setIsUploadingQris(false);
      console.error("Error picking QRIS image:", err);
      Alert.alert("Gagal Memuat Foto", "Terjadi kesalahan saat memilih gambar.");
    }
  };

  const handleSavePaymentSettings = async () => {
    if (paymentTab === "bank") {
      if (!bankAccountNumber.trim()) {
        Alert.alert("Input Kurang", "Harap masukkan nomor rekening bank atau nomor HP e-wallet toko Anda.");
        return;
      }
    } else if (paymentTab === "qris") {
      if (!qrisImageUrl.trim()) {
        Alert.alert("Foto QRIS Diperlukan", "Harap pilih dan unggah foto barcode QRIS toko Anda.");
        return;
      }
    }

    let finalQrisUrl = "";
    if (paymentTab === "qris") {
      finalQrisUrl = qrisImageUrl.trim();
      if (finalQrisUrl.startsWith("blob:")) {
        finalQrisUrl = await convertBlobToBase64(finalQrisUrl);
      }
    }

    const finalBankName = paymentTab === "bank" ? (bankName.trim() || "BCA") : "";
    const finalBankAccountNumber = paymentTab === "bank" ? bankAccountNumber.trim() : "";
    const finalBankAccountHolder = paymentTab === "bank" ? (bankAccountHolder.trim() || store.storeName || displayName) : "";

    const updatedStore: LaundryStore = {
      ...store,
      ownerId: authAccount?.id || store.ownerId,
      bankName: finalBankName,
      bankAccountNumber: finalBankAccountNumber,
      bankAccountHolder: finalBankAccountHolder,
      qrisImageUrl: finalQrisUrl,
    };
    setSelectedStore(updatedStore);
    setStore(updatedStore);
    await saveMyLaundryStore(updatedStore);
    setIsPaymentModalOpen(false);
    Alert.alert(
      "Berhasil Disimpan",
      paymentTab === "bank"
        ? `Metode pembayaran berhasil diatur ke Transfer Bank/E-Wallet (${finalBankName} - ${finalBankAccountNumber}).`
        : "Metode pembayaran berhasil diatur ke Barcode QRIS Toko."
    );
  };


  const SERVICE_PRESETS = [
    { name: "Cuci Komplit (Cuci + Setrika)", defaultPrice: 6000, unit: "kg" as const, category: "biasa" as const, desc: "Cuci, kering, setrika uap, pewangi & packing rapi" },
    { name: "Setrika Uap Saja", defaultPrice: 3500, unit: "kg" as const, category: "biasa" as const, desc: "Setrika uap licin dan wangi tahan lama" },
    { name: "Cuci Kering Lipat", defaultPrice: 4500, unit: "kg" as const, category: "biasa" as const, desc: "Cuci higienis & lipat rapi tanpa setrika" },
    { name: "Express 3 Jam (Siap Pakai)", defaultPrice: 10000, unit: "kg" as const, category: "ekspres" as const, desc: "Prioritas khusus pencucian kilat 3 jam selesai" },
    { name: "Cuci Bedcover Besar", defaultPrice: 25000, unit: "pcs" as const, category: "satuan" as const, desc: "Pembersihan menyeluruh bedcover/selimut besar" },
    { name: "Cuci Sepatu Premium", defaultPrice: 30000, unit: "pasang" as const, category: "satuan" as const, desc: "Deep clean sepatu sneakers, canvas, atau kulit" },
  ];

  const handleApplyPreset = (preset: typeof SERVICE_PRESETS[0]) => {
    setNewServiceName(preset.name);
    setNewServicePrice(preset.defaultPrice.toString());
    setNewServiceUnit(preset.unit === "pasang" ? "pcs" : preset.unit);
    setNewServiceCategory(preset.category);
  };

  const handleUpdatePrice = (idx: number, newPriceStr: string) => {
    const priceNum = parseInt(newPriceStr.replace(/\D/g, ""), 10) || 0;
    const updated = [...servicesList];
    updated[idx] = { ...updated[idx], price: priceNum };
    setServicesList(updated);
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
    Alert.alert("Berhasil Tersimpan", "Daftar layanan & tarif toko laundry berhasil diperbarui di MongoDB dan langsung aktif di sisi Customer!");
  };

  const handleSaveOperationalHours = async () => {
    setIsSavingHours(true);
    try {
      const formattedHours = `${openingTime} - ${closingTime}`;
      const updatedStore: LaundryStore = {
        ...store,
        openingDays,
        openingTime,
        closingTime,
        openingHours: formattedHours,
        isOpen: isStoreOpenStatus,
      };
      setSelectedStore(updatedStore);
      setStore(updatedStore);
      await saveMyLaundryStore(updatedStore);
      setIsHoursModalOpen(false);
      Alert.alert(
        "Jadwal Tersimpan",
        `Jadwal operasional toko laundry berhasil diperbarui di MongoDB dan langsung tampil di sisi Customer:\n\n📅 ${openingDays}\n⏰ ${formattedHours}\nStatus: ${isStoreOpenStatus ? "🟢 Buka (Menerima Pesanan)" : "🔴 Tutup Sementara"}`
      );
    } catch (err) {
      console.error("Save hours error:", err);
      Alert.alert("Gagal Menyimpan", "Terjadi kesalahan saat menyimpan jam operasional.");
    } finally {
      setIsSavingHours(false);
    }
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
              if (store.qrisImageUrl && !store.bankAccountNumber) {
                setPaymentTab("qris");
              } else {
                setPaymentTab("bank");
              }
              setIsPaymentModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: "#FEF3C7" }]}>
              <Wallet size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Metode Pembayaran Toko</Text>
              <Text style={[styles.menuSubText, (!store.bankAccountNumber && !store.qrisImageUrl) && { color: "#D97706", fontWeight: "600" }]}>
                {store.qrisImageUrl
                  ? "📱 QRIS Barcode Toko Aktif (Siap Scan)"
                  : store.bankAccountNumber
                  ? `💳 ${store.bankName || "Bank"} • ${store.bankAccountNumber} (${store.bankAccountHolder || displayName})`
                  : "⚠️ Belum diatur (Pilih Rekening Bank / QRIS)"}
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

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setOpeningDays(store.openingDays || "Buka Setiap Hari");
              setOpeningTime(store.openingTime || "07:00");
              setClosingTime(store.closingTime || "21:00");
              setIsStoreOpenStatus(store.isOpen !== false);
              setIsHoursModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: "#E0F2FE" }]}>
              <Clock size={18} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Atur Jam & Hari Operasional Toko</Text>
              <Text style={styles.menuSubText}>
                {store.openingDays || "Buka Setiap Hari"} • {store.openingHours || `${store.openingTime || "07:00"} - ${store.closingTime || "21:00"}`} • {store.isOpen !== false ? "🟢 Buka" : "🔴 Tutup Sementara"}
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
            <View style={[styles.iconBg, { backgroundColor: "#F3E8FF" }]}>
              <MapPin size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Alamat Toko Laundry</Text>
              <Text style={styles.menuSubText}>{store.address}</Text>
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

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Template Cepat Layanan */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 6 }}>
                  ✨ PILIH TEMPLATE CEPAT:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {SERVICE_PRESETS.map((preset, pIdx) => (
                    <TouchableOpacity
                      key={pIdx}
                      style={{
                        backgroundColor: "#E8F5EE",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#A7F3D0",
                      }}
                      onPress={() => handleApplyPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D7A53" }}>
                        + {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Form Tambah / Edit Layanan Baru */}
              <View style={styles.addServiceBox}>
                <Text style={styles.addServiceTitle}>+ Form Input Layanan & Tarif</Text>

                <TextInput
                  style={styles.inputField}
                  placeholder="Nama Paket (misal: Cuci Komplit / Setrika Saja)"
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
                    onPress={() => {
                      const nextUnit = newServiceUnit === "kg" ? "pcs" : "kg";
                      setNewServiceUnit(nextUnit);
                    }}
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

              {/* Daftar Layanan Saat Ini dengan Edit Harga Langsung */}
              <Text style={[styles.sectionTitle, { marginLeft: 0, marginTop: 16, marginBottom: 8 }]}>
                DAFTAR LAYANAN AKTIF TOKO ({servicesList.length})
              </Text>
              <View style={styles.serviceItemsList}>
                {servicesList.length === 0 ? (
                  <View style={{ padding: 16, backgroundColor: "#F9FAFB", borderRadius: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Belum ada layanan. Tambahkan layanan di atas.</Text>
                  </View>
                ) : (
                  servicesList.map((item, idx) => (
                    <View key={idx} style={styles.serviceItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.serviceItemName}>{item.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: "#6B7280" }}>Rp</Text>
                          <TextInput
                            style={{
                              backgroundColor: "#F3F4F6",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: "800",
                              color: "#0D7A53",
                              minWidth: 60,
                            }}
                            keyboardType="numeric"
                            value={item.price.toString()}
                            onChangeText={(val) => handleUpdatePrice(idx, val)}
                          />
                          <Text style={{ fontSize: 11, color: "#6B7280" }}>/{item.unit}</Text>
                          <View style={{ backgroundColor: item.category === "ekspres" ? "#FEF3C7" : "#E8F5EE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: item.category === "ekspres" ? "#D97706" : "#0D7A53", textTransform: "uppercase" }}>
                              {item.category || "biasa"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteService(idx)} style={styles.btnTrash}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnSaveAll} onPress={handleSaveServices} activeOpacity={0.85}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnSaveAllText}>Simpan & Tampilkan ke Customer</Text>
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
              <Text style={styles.modalTitle}>Metode Pembayaran Toko</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={styles.paymentModalNotice}>
                Pilih metode pembayaran yang Anda sediakan. Customer akan langsung melihat dan mentransfer tagihan ke rekening / scan barcode QRIS toko Anda.
              </Text>

              {/* Selector Mode Pembayaran: Strictly 1 Choice (Bank / E-Wallet OR QRIS Barcode) */}
              <Text style={styles.formFieldLabel}>PILIH SALAH SATU METODE PEMBAYARAN</Text>
              <View style={styles.paymentModeTabs}>
                <TouchableOpacity
                  style={[styles.paymentModeTab, paymentTab === "bank" && styles.paymentModeTabActive]}
                  onPress={() => setPaymentTab("bank")}
                  activeOpacity={0.8}
                >
                  <CreditCard size={14} color={paymentTab === "bank" ? "#0D7A53" : "#6B7280"} />
                  <Text style={[styles.paymentModeTabText, paymentTab === "bank" && styles.paymentModeTabTextActive]}>
                    Rekening / E-Wallet
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentModeTab, paymentTab === "qris" && styles.paymentModeTabActive]}
                  onPress={() => setPaymentTab("qris")}
                  activeOpacity={0.8}
                >
                  <QrCode size={14} color={paymentTab === "qris" ? "#0D7A53" : "#6B7280"} />
                  <Text style={[styles.paymentModeTabText, paymentTab === "qris" && styles.paymentModeTabTextActive]}>
                    QRIS Barcode Toko
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bagian Rekening Bank & E-Wallet */}
              {paymentTab === "bank" && (
                <View style={styles.paymentSectionBox}>
                  <Text style={styles.sectionHeaderInside}>
                    PENGATURAN REKENING & E-WALLET
                  </Text>

                  <Text style={styles.formFieldLabel}>PILIH BANK ATAU E-WALLET</Text>
                  <View style={styles.bankPillsRow}>
                    {["BCA", "BRI", "Mandiri", "BNI", "BSI", "Dana", "GoPay", "OVO", "ShopeePay"].map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.bankPill, bankName === b && styles.bankPillActive]}
                        onPress={() => setBankName(b)}
                      >
                        <Text style={[styles.bankPillText, bankName === b && styles.bankPillTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formFieldLabel}>
                    {["Dana", "GoPay", "OVO", "ShopeePay"].includes(bankName)
                      ? `NOMOR HP / AKUN ${bankName.toUpperCase()}`
                      : `NOMOR REKENING ${bankName.toUpperCase()}`}
                  </Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder={
                      ["Dana", "GoPay", "OVO", "ShopeePay"].includes(bankName)
                        ? "Contoh: 081234567890"
                        : "Contoh: 8035129988"
                    }
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={bankAccountNumber}
                    onChangeText={setBankAccountNumber}
                  />

                  <Text style={styles.formFieldLabel}>ATAS NAMA (PEMILIK REKENING / E-WALLET)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder={`Contoh: ${displayName}`}
                    placeholderTextColor="#9CA3AF"
                    value={bankAccountHolder}
                    onChangeText={setBankAccountHolder}
                  />
                </View>
              )}

              {/* Bagian QRIS Barcode */}
              {paymentTab === "qris" && (
                <View style={styles.paymentSectionBox}>
                  <View style={styles.qrisSectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionHeaderInside}>
                        FOTO / BARCODE QRIS TOKO
                      </Text>
                      <Text style={styles.qrisUploadSubHint}>
                        Customer akan memindai barcode ini langsung saat melakukan pembayaran tagihan.
                      </Text>
                    </View>
                  </View>

                  {qrisImageUrl ? (
                    <View style={styles.qrisPreviewBox}>
                      <View style={styles.qrisPreviewHeaderRow}>
                        <View style={styles.qrisActiveIndicatorBadge}>
                          <CheckCircle2 size={13} color="#166534" />
                          <Text style={styles.qrisActiveIndicatorText}>QRIS Toko Aktif</Text>
                        </View>

                        <View style={styles.qrisActionButtonsRow}>
                          <TouchableOpacity
                            style={styles.btnChangeQris}
                            onPress={handlePickQrisImage}
                            activeOpacity={0.8}
                            disabled={isUploadingQris}
                          >
                            {isUploadingQris ? (
                              <ActivityIndicator size="small" color="#0D7A53" />
                            ) : (
                              <>
                                <Upload size={13} color="#0D7A53" />
                                <Text style={styles.btnChangeQrisText}>Ganti Foto</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.btnRemoveQris}
                            onPress={() => setQrisImageUrl("")}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={13} color="#DC2626" />
                            <Text style={styles.btnRemoveQrisText}>Hapus</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Image
                        source={{ uri: qrisImageUrl }}
                        style={styles.qrisImageStyle}
                        resizeMode="contain"
                      />
                      <Text style={styles.qrisMerchantName}>{store.storeName || businessName}</Text>
                      <Text style={styles.qrisNmidText}>Siap dipindai: BCA Mobile, Livin, BRImo, GoPay, OVO, ShopeePay, Dana</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadQrisPlaceholderBtn}
                      onPress={handlePickQrisImage}
                      activeOpacity={0.85}
                      disabled={isUploadingQris}
                    >
                      {isUploadingQris ? (
                        <View style={{ alignItems: "center", paddingVertical: 10 }}>
                          <ActivityIndicator size="large" color="#0D7A53" />
                          <Text style={[styles.uploadQrisPlaceholderTitle, { marginTop: 10 }]}>Mengunggah Barcode QRIS...</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.uploadQrisIconBg}>
                            <Upload size={24} color="#0D7A53" />
                          </View>
                          <Text style={styles.uploadQrisPlaceholderTitle}>
                            Pilih & Unggah Foto Barcode QRIS Toko
                          </Text>
                          <Text style={styles.uploadQrisPlaceholderSub}>
                            Ambil dari Galeri (JPG, PNG, WebP) agar customer bisa langsung scan
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.btnSaveAll} onPress={handleSavePaymentSettings} activeOpacity={0.85}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnSaveAllText}>Simpan Pengaturan Pembayaran</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Operational Hours & Days Modal */}
      <Modal visible={isHoursModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "88%" }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={18} color="#0284C7" />
                </View>
                <Text style={styles.modalTitle}>Jam & Hari Operasional Toko</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHoursModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.paymentModalNotice}>
                Atur jadwal hari kerja dan jam buka tutup toko laundry Anda. Informasi ini akan langsung muncul secara real-time di halaman pencarian & detail toko customer.
              </Text>

              {/* Status Toko Switch */}
              <View style={styles.paymentSectionBox}>
                <Text style={styles.sectionHeaderInside}>STATUS BUKA TOKO SAAT INI</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.hoursStatusBtn, isStoreOpenStatus && styles.hoursStatusBtnOpenActive]}
                    onPress={() => setIsStoreOpenStatus(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isStoreOpenStatus ? "#10B981" : "#9CA3AF" }} />
                    <Text style={[styles.hoursStatusBtnText, isStoreOpenStatus && { color: "#065F46", fontWeight: "800" }]}>
                      🟢 Buka (Terima Pesanan)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hoursStatusBtn, !isStoreOpenStatus && styles.hoursStatusBtnClosedActive]}
                    onPress={() => setIsStoreOpenStatus(false)}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: !isStoreOpenStatus ? "#EF4444" : "#9CA3AF" }} />
                    <Text style={[styles.hoursStatusBtnText, !isStoreOpenStatus && { color: "#991B1B", fontWeight: "800" }]}>
                      🔴 Tutup Sementara
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hari Operasional */}
              <View style={styles.paymentSectionBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Calendar size={15} color="#0D7A53" />
                  <Text style={styles.sectionHeaderInside}>HARI OPERASIONAL TOKO</Text>
                </View>
                <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 10 }}>Pilih jadwal hari kerja atau ketik kustom:</Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {[
                    "Buka Setiap Hari",
                    "Senin - Sabtu",
                    "Senin - Jumat",
                    "Setiap Hari (24 Jam)",
                  ].map((dayPreset) => (
                    <TouchableOpacity
                      key={dayPreset}
                      style={[styles.dayPresetChip, openingDays === dayPreset && styles.dayPresetChipActive]}
                      onPress={() => setOpeningDays(dayPreset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayPresetChipText, openingDays === dayPreset && styles.dayPresetChipTextActive]}>
                        {dayPreset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formFieldLabel}>Atau Ketik Hari Operasional Kustom</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Misal: Buka Setiap Hari / Selasa - Minggu"
                  placeholderTextColor="#9CA3AF"
                  value={openingDays}
                  onChangeText={setOpeningDays}
                />
              </View>

              {/* Jam Buka & Jam Tutup */}
              <View style={styles.paymentSectionBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Sun size={15} color="#0D7A53" />
                  <Text style={styles.sectionHeaderInside}>JAM BUKA & JAM TUTUP</Text>
                </View>
                <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 10 }}>Tentukan jam awal buka dan jam batas tutup:</Text>

                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formFieldLabel}>Jam Buka</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="07:00"
                      placeholderTextColor="#9CA3AF"
                      value={openingTime}
                      onChangeText={setOpeningTime}
                    />
                  </View>
                  <Text style={{ fontSize: 18, color: "#9CA3AF", marginTop: 22, fontWeight: "700" }}>-</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formFieldLabel}>Jam Tutup</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="21:00"
                      placeholderTextColor="#9CA3AF"
                      value={closingTime}
                      onChangeText={setClosingTime}
                    />
                  </View>
                </View>

                {/* Quick Time Presets */}
                <Text style={[styles.formFieldLabel, { marginTop: 12 }]}>Preset Waktu Cepat</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "07:00 - 21:00", open: "07:00", close: "21:00" },
                    { label: "08:00 - 20:00", open: "08:00", close: "20:00" },
                    { label: "06:00 - 22:00", open: "06:00", close: "22:00" },
                    { label: "24 Jam Penuh", open: "00:00", close: "23:59" },
                  ].map((tp) => (
                    <TouchableOpacity
                      key={tp.label}
                      style={[styles.dayPresetChip, openingTime === tp.open && closingTime === tp.close && styles.dayPresetChipActive]}
                      onPress={() => {
                        setOpeningTime(tp.open);
                        setClosingTime(tp.close);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayPresetChipText, openingTime === tp.open && closingTime === tp.close && styles.dayPresetChipTextActive]}>
                        {tp.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview Live di Customer */}
              <View style={{ backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#065F46", marginBottom: 4 }}>👀 PRATINJAU TAMPILAN DI SISI CUSTOMER:</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#047857" }}>
                  🏪 {store.storeName || businessName}
                </Text>
                <Text style={{ fontSize: 12, color: "#065F46", marginTop: 2 }}>
                  📅 {openingDays || "Buka Setiap Hari"} • ⏰ {openingTime || "07:00"} - {closingTime || "21:00"}
                </Text>
                <Text style={{ fontSize: 11, color: isStoreOpenStatus ? "#059669" : "#DC2626", fontWeight: "700", marginTop: 2 }}>
                  Status: {isStoreOpenStatus ? "🟢 Buka • Siap Jemput & Terima Pesanan" : "🔴 Sedang Tutup Sementara"}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnSaveAll} onPress={handleSaveOperationalHours} activeOpacity={0.85} disabled={isSavingHours}>
              {isSavingHours ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.btnSaveAllText}>Simpan Jam & Hari Operasional</Text>
                </>
              )}
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
  paymentModeTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  paymentModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  paymentModeTabActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paymentModeTabText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },
  paymentModeTabTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
  paymentSectionBox: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  sectionHeaderInside: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0D7A53",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formFieldLabel: { fontSize: 11, fontWeight: "800", color: "#4B5563", marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
  bankPillsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  bankPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  bankPillActive: { backgroundColor: "#0D7A53", borderColor: "#0D7A53" },
  bankPillText: { fontSize: 12, fontWeight: "800", color: "#4B5563" },
  bankPillTextActive: { color: "#FFFFFF" },

  // QRIS Section Styles
  qrisSectionHeaderRow: {
    marginTop: 14,
    marginBottom: 8,
  },
  qrisUploadSubHint: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },
  uploadQrisPlaceholderBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  uploadQrisIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  uploadQrisPlaceholderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
    textAlign: "center",
    marginBottom: 4,
  },
  uploadQrisPlaceholderSub: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  qrisPreviewBox: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  qrisPreviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  qrisActiveIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qrisActiveIndicatorText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  qrisActionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnChangeQris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnChangeQrisText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  btnRemoveQris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnRemoveQrisText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  qrisImageStyle: {
    width: 200,
    height: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrisPlaceholder: { width: 170, height: 170, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  qrisPlaceholderText: { fontSize: 11, color: "#9CA3AF", marginTop: 6, fontWeight: "600" },
  qrisMerchantName: { fontSize: 14, fontWeight: "900", color: "#111827", marginTop: 10 },
  qrisNmidText: { fontSize: 10, color: "#6B7280", marginTop: 2, textAlign: "center" },

  // Operational Hours Specific Styles
  hoursStatusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  hoursStatusBtnOpenActive: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  hoursStatusBtnClosedActive: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  hoursStatusBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  dayPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  dayPresetChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  dayPresetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  dayPresetChipTextActive: {
    color: "#FFFFFF",
  },

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

