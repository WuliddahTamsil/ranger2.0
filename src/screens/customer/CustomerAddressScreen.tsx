import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, ChevronLeft, MapPin, Navigation, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { AddressAccessType, AddressLabel, CustomerAddress, Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  buildFullAddress,
  isValidCoordinatePair,
  parseCustomerAddresses,
  saveCustomerProfile,
  saveCustomerAddresses,
} from "../../services/customerAddressService";
import { useResponsiveLayout } from "../../utils/responsive";
import { CustomerLocationPicker, CustomerLocationValue } from "../../components/CustomerLocationPicker";

// Keep the native map module out of the Expo Web startup path.
const nativeMaps = Platform.OS === "web" ? null : (require("react-native-maps") as typeof import("react-native-maps"));
const NativeMapView = nativeMaps?.default;
const NativeMarker = nativeMaps?.Marker;

interface CustomerAddressScreenProps extends Nav {
  authAccount?: AuthAccount | null;
  onUpdateAccount: (account: AuthAccount) => Promise<void>;
}

type AddressForm = Omit<CustomerAddress, "id" | "isMain" | "updatedAt" | "fullAddress"> & {
  id?: string;
  isMain?: boolean;
  latitudeText: string;
  longitudeText: string;
  detectedAddress?: string;
};

const LABELS: AddressLabel[] = ["Rumah", "Kos", "Kantor", "Lainnya"];
const ACCESS_TYPES: AddressAccessType[] = [
  "Gang sempit",
  "Bisa dilalui mobil",
  "Hanya bisa dilalui motor",
  "Jalan utama",
  "Perlu masuk gang",
  "Hanya kendaraan tertentu",
];

const emptyForm = (account?: AuthAccount | null): AddressForm => ({
  label: "Rumah",
  receiverName: account?.name || "",
  phoneNumber: account?.phone || "",
  province: "",
  city: "",
  district: "",
  village: "",
  postalCode: "",
  street: "",
  houseNumber: "",
  rt: "",
  rw: "",
  notes: "",
  accessType: "Bisa dilalui mobil",
  latitudeText: "",
  longitudeText: "",
  detectedAddress: "",
});

const formFromAddress = (address: CustomerAddress): AddressForm => ({
  id: address.id,
  label: address.label,
  receiverName: address.receiverName,
  phoneNumber: address.phoneNumber,
  province: address.province || "",
  city: address.city || "",
  district: address.district || "",
  village: address.village || "",
  postalCode: address.postalCode || "",
  street: address.street || "",
  houseNumber: address.houseNumber || "",
  rt: address.rt || "",
  rw: address.rw || "",
  notes: address.notes || "",
  accessType: address.accessType || "Bisa dilalui mobil",
  latitudeText: address.latitude === undefined ? "" : String(address.latitude),
  longitudeText: address.longitude === undefined ? "" : String(address.longitude),
  detectedAddress: address.detectedAddress || "",
  isMain: address.isMain,
});

const toAddress = (form: AddressForm, isMain: boolean): CustomerAddress => {
  const latitude = form.latitudeText.trim() ? Number(form.latitudeText.replace(",", ".")) : undefined;
  const longitude = form.longitudeText.trim() ? Number(form.longitudeText.replace(",", ".")) : undefined;
  const address = {
    id: form.id || `addr_${Date.now()}`,
    label: form.label,
    receiverName: form.receiverName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    province: form.province?.trim() || "",
    city: form.city?.trim() || "",
    district: form.district?.trim() || "",
    village: form.village?.trim() || "",
    postalCode: form.postalCode?.trim() || "",
    street: form.street?.trim() || "",
    houseNumber: form.houseNumber?.trim() || "",
    rt: form.rt?.trim() || "",
    rw: form.rw?.trim() || "",
    notes: form.notes?.trim() || "",
    accessType: form.accessType,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    detectedAddress: form.detectedAddress?.trim() || "",
    fullAddress: "",
    isMain,
  } satisfies CustomerAddress;
  return { ...address, fullAddress: buildFullAddress(address) };
};

export const CustomerAddressScreen: React.FC<CustomerAddressScreenProps> = ({ navigate, authAccount, onUpdateAccount }) => {
  const { gutter } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<CustomerAddress[]>(() => parseCustomerAddresses(authAccount));
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<AddressForm>(() => emptyForm(authAccount));
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState(authAccount?.name || "");
  const [profilePhone, setProfilePhone] = useState(authAccount?.phone || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  useEffect(() => {
    setAddresses(parseCustomerAddresses(authAccount));
    setProfileName(authAccount?.name || "");
    setProfilePhone(authAccount?.phone || "");
  }, [authAccount]);

  const primaryAddress = useMemo(() => addresses.find((address) => address.isMain), [addresses]);
  const selectedLocation = useMemo<CustomerLocationValue | undefined>(() => {
    const latitude = Number(form.latitudeText.replace(",", "."));
    const longitude = Number(form.longitudeText.replace(",", "."));
    if (!form.latitudeText || !form.longitudeText || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
    return { latitude, longitude, detectedAddress: form.detectedAddress || "" };
  }, [form.latitudeText, form.longitudeText, form.detectedAddress]);

  const openNewForm = () => {
    if (addresses.length >= 3) {
      Alert.alert("Batas alamat tercapai", "Anda dapat menyimpan maksimal 3 alamat. Edit atau hapus alamat lama untuk menambahkan alamat baru.");
      return;
    }
    setForm(emptyForm(authAccount));
    setFormVisible(true);
  };

  const openEditForm = (address: CustomerAddress) => {
    setForm(formFromAddress(address));
    setFormVisible(true);
  };

  const updateForm = <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfileInfo = async () => {
    if (!authAccount) return;
    if (!profileName.trim() || !profilePhone.trim()) {
      Alert.alert("Data belum lengkap", "Nama lengkap dan nomor telepon wajib diisi.");
      return;
    }
    setProfileSaving(true);
    try {
      const result = await saveCustomerProfile(authAccount, profileName, profilePhone);
      await onUpdateAccount(result.account);
      Alert.alert("Profil tersimpan", result.savedToServer ? "Informasi customer berhasil diperbarui." : "Informasi tersimpan di perangkat.");
    } catch (error) {
      Alert.alert("Gagal menyimpan profil", error instanceof Error ? error.message : "Coba lagi beberapa saat.");
    } finally {
      setProfileSaving(false);
    }
  };

  const openLocationPicker = () => setLocationPickerVisible(true);

  const handleLocationConfirmed = (location: CustomerLocationValue) => {
    updateForm("latitudeText", String(location.latitude));
    updateForm("longitudeText", String(location.longitude));
    updateForm("detectedAddress", location.detectedAddress || "");
    setLocationPickerVisible(false);
  };

  const openSavedLocation = (address: CustomerAddress) => {
    if (address.latitude === undefined || address.longitude === undefined) {
      Alert.alert("Lokasi belum tersedia", "Alamat ini belum memiliki titik koordinat.");
      return;
    }
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`);
  };

  const saveForm = async () => {
    if (!authAccount) return;
    if (!form.receiverName.trim() || !form.phoneNumber.trim() || !form.city?.trim() || !form.street?.trim()) {
      Alert.alert("Data belum lengkap", "Nama penerima, nomor telepon, kota/kabupaten, dan nama jalan wajib diisi.");
      return;
    }
    const hasLatitude = form.latitudeText.trim().length > 0;
    const hasLongitude = form.longitudeText.trim().length > 0;
    if (hasLatitude !== hasLongitude) {
      Alert.alert("Titik peta belum lengkap", "Isi latitude dan longitude sekaligus, atau kosongkan keduanya.");
      return;
    }
    const latitude = hasLatitude ? Number(form.latitudeText.replace(",", ".")) : undefined;
    const longitude = hasLongitude ? Number(form.longitudeText.replace(",", ".")) : undefined;
    if ((hasLatitude || hasLongitude) && !isValidCoordinatePair(latitude, longitude)) {
      Alert.alert("Koordinat tidak valid", "Latitude harus berada di antara -90 sampai 90 dan longitude -180 sampai 180.");
      return;
    }

    const editing = Boolean(form.id);
    const isMain = form.isMain || !primaryAddress || (!editing && addresses.length === 0);
    const nextAddress = toAddress(form, isMain);
    const nextAddresses = editing
      ? addresses.map((address) => address.id === form.id ? nextAddress : address)
      : [...addresses, nextAddress];

    setSaving(true);
    try {
      const result = await saveCustomerAddresses(authAccount, nextAddresses);
      setAddresses(parseCustomerAddresses(result.account));
      await onUpdateAccount(result.account);
      setFormVisible(false);
      Alert.alert("Alamat tersimpan", result.savedToServer ? "Alamat berhasil disimpan ke akun Anda." : "Alamat tersimpan di perangkat. Akan disinkronkan saat server tersedia.");
    } catch (error) {
      Alert.alert("Gagal menyimpan", error instanceof Error ? error.message : "Coba lagi beberapa saat.");
    } finally {
      setSaving(false);
    }
  };

  const setPrimaryAddress = async (address: CustomerAddress) => {
    if (!authAccount || address.isMain) return;
    const nextAddresses = addresses.map((item) => ({ ...item, isMain: item.id === address.id }));
    setSaving(true);
    try {
      const result = await saveCustomerAddresses(authAccount, nextAddresses);
      setAddresses(parseCustomerAddresses(result.account));
      await onUpdateAccount(result.account);
    } catch (error) {
      Alert.alert("Gagal mengubah alamat utama", error instanceof Error ? error.message : "Coba lagi beberapa saat.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = (address: CustomerAddress) => {
    if (!authAccount) return;
    if (address.isMain && addresses.length > 1) {
      Alert.alert("Pilih alamat utama baru", "Jadikan alamat lain sebagai alamat utama sebelum menghapus alamat ini.");
      return;
    }
    Alert.alert("Hapus alamat?", `Alamat ${address.label} akan dihapus dari akun Anda.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              const result = await saveCustomerAddresses(authAccount, addresses.filter((item) => item.id !== address.id));
              setAddresses(parseCustomerAddresses(result.account));
              await onUpdateAccount(result.account);
            } catch (error) {
              Alert.alert("Gagal menghapus", error instanceof Error ? error.message : "Coba lagi beberapa saat.");
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const openMapSearch = async () => {
    const query = buildFullAddress(form);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "Indonesia")}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Peta tidak tersedia", "Silakan isi koordinat secara manual dari aplikasi peta di perangkat Anda.");
    }
  };

  const field = (key: keyof AddressForm, label: string, placeholder: string, options?: { keyboardType?: "default" | "phone-pad" | "numeric"; multiline?: boolean }) => (
    <View style={styles.fieldBlock} key={String(key)}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={String(form[key] ?? "")}
        onChangeText={(value) => updateForm(key, value as AddressForm[typeof key])}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={options?.keyboardType || "default"}
        multiline={options?.multiline}
        textAlignVertical={options?.multiline ? "top" : "center"}
        style={[styles.input, options?.multiline && styles.multilineInput]}
      />
    </View>
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate("c_home")} style={styles.backButton} accessibilityLabel="Kembali">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Perbarui Profil & Alamat</Text>
          <Text style={styles.subtitle}>Informasi customer dan alamat pengiriman</Text>
        </View>
        <TouchableOpacity onPress={openNewForm} style={styles.addHeaderButton} accessibilityLabel="Tambah alamat">
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addHeaderText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <MapPin size={18} color="#1B7A4E" />
          <Text style={styles.infoText}>Alamat utama otomatis dipakai saat checkout. Simpan maksimal 3 alamat yang sering digunakan.</Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Informasi Customer</Text>
          <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
          <TextInput value={profileName} onChangeText={setProfileName} placeholder="Nama lengkap customer" placeholderTextColor="#94A3B8" style={styles.input} />
          <Text style={styles.fieldLabel}>Nomor Telepon *</Text>
          <TextInput value={profilePhone} onChangeText={setProfilePhone} placeholder="08xxxxxxxxxx" placeholderTextColor="#94A3B8" keyboardType="phone-pad" style={styles.input} />
          <TouchableOpacity style={[styles.profileSaveButton, profileSaving && styles.disabledButton]} onPress={() => void saveProfileInfo()} disabled={profileSaving}>
            <Text style={styles.profileSaveText}>{profileSaving ? "Menyimpan..." : "Simpan informasi customer"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
            <Text style={styles.sectionHint}>{addresses.length}/3 alamat tersimpan</Text>
          </View>
          <TouchableOpacity onPress={openNewForm} style={styles.compactAddButton}>
            <Plus size={15} color="#1B7A4E" />
            <Text style={styles.compactAddText}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {addresses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><MapPin size={28} color="#1B7A4E" /></View>
            <Text style={styles.emptyTitle}>Belum ada alamat tersimpan</Text>
            <Text style={styles.emptyText}>Tambahkan alamat rumah, kos, kantor, atau lokasi pengantaran lainnya.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openNewForm}>
              <Plus size={17} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Tambah alamat pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressCardTop}>
                <View style={styles.labelRow}>
                  <View style={styles.addressIcon}><MapPin size={17} color="#1B7A4E" /></View>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  {address.isMain && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>UTAMA</Text></View>}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditForm(address)} style={styles.iconButton} accessibilityLabel="Edit alamat">
                    <Pencil size={16} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteAddress(address)} style={styles.iconButton} accessibilityLabel="Hapus alamat">
                    <Trash2 size={16} color="#B91C1C" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.receiver}>{address.receiverName} · {address.phoneNumber}</Text>
              <Text style={styles.fullAddress}>{address.fullAddress || "Alamat belum dilengkapi"}</Text>
              {address.latitude !== undefined && address.longitude !== undefined && (
                <TouchableOpacity style={styles.previewMapWrap} onPress={() => openEditForm(address)} activeOpacity={0.9}>
                  {Platform.OS === "web" ? (
                    <iframe
                      title={`Google Maps ${address.label}`}
                      src={`https://maps.google.com/maps?q=${address.latitude},${address.longitude}&z=16&output=embed`}
                      style={styles.previewMapFrame as any}
                      loading="lazy"
                    />
                  ) : !NativeMapView || !NativeMarker ? (
                    <View style={styles.previewMapFallback}><MapPin size={26} color="#1B7A4E" /><Text style={styles.previewMapFallbackText}>Titik lokasi tersimpan</Text></View>
                  ) : (
                    <NativeMapView
                      style={styles.previewMap}
                      initialRegion={{ latitude: address.latitude, longitude: address.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                    >
                      <NativeMarker coordinate={{ latitude: address.latitude, longitude: address.longitude }} />
                    </NativeMapView>
                  )}
                  <View style={styles.previewMapBadge}><MapPin size={12} color="#1B7A4E" /><Text style={styles.previewMapText}>Lokasi sudah dipilih · Ubah</Text></View>
                </TouchableOpacity>
              )}
              <Text style={styles.accessText}>{address.accessType || "Akses belum diatur"}{address.notes ? ` · ${address.notes}` : ""}</Text>
              {address.latitude !== undefined && address.longitude !== undefined && (
                <View style={styles.pinRow}><Navigation size={13} color="#1B7A4E" /><Text style={styles.pinText}>Titik peta tersimpan · {address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}</Text></View>
              )}
              {address.latitude !== undefined && address.longitude !== undefined && (
                <TouchableOpacity onPress={() => openSavedLocation(address)} style={styles.mapLinkButton}>
                  <Text style={styles.mapLinkText}>Tampilkan di Maps</Text>
                </TouchableOpacity>
              )}
              {!address.isMain && (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => void setPrimaryAddress(address)} disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Jadikan alamat utama</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <Text style={styles.footerHint}>Pastikan alamat dan titik peta sesuai agar driver lebih mudah menemukan lokasi.</Text>
      </ScrollView>

      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView style={styles.formSheet} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Perbarui Profil & Alamat</Text>
                <Text style={styles.sheetSubtitle}>{form.id ? "Edit alamat pengiriman" : "Tambah alamat pengiriman"}</Text>
              </View>
              <TouchableOpacity onPress={() => setFormVisible(false)} style={styles.closeButton}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[styles.formContent, { paddingBottom: Math.max(28, insets.bottom + 16) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Label alamat</Text>
              <View style={styles.chipWrap}>
                {LABELS.map((label) => (
                  <Pressable key={label} onPress={() => updateForm("label", label)} style={[styles.chip, form.label === label && styles.chipActive]}>
                    <Text style={[styles.chipText, form.label === label && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              {field("receiverName", "Nama penerima *", "Contoh: Aisyah Putri")}
              {field("phoneNumber", "Nomor telepon *", "08xxxxxxxxxx", { keyboardType: "phone-pad" })}

              <Text style={styles.sectionTitle}>Detail alamat</Text>
              {field("street", "Nama jalan *", "Contoh: Jl. Raya Kamojang")}
              <View style={styles.twoColumns}>
                <View style={styles.column}>{field("houseNumber", "Nomor rumah", "No. 12")}</View>
                <View style={styles.column}>{field("postalCode", "Kode pos", "40100", { keyboardType: "numeric" })}</View>
              </View>
              <View style={styles.twoColumns}>
                <View style={styles.column}>{field("rt", "RT", "001", { keyboardType: "numeric" })}</View>
                <View style={styles.column}>{field("rw", "RW", "002", { keyboardType: "numeric" })}</View>
              </View>
              {field("village", "Kelurahan / desa", "Nama kelurahan")}
              {field("district", "Kecamatan", "Nama kecamatan")}
              {field("city", "Kota / kabupaten *", "Nama kota atau kabupaten")}
              {field("province", "Provinsi", "Nama provinsi")}

              <Text style={styles.sectionTitle}>Titik lokasi</Text>
              <View style={styles.mapHintCard}>
                <View style={styles.mapHintIcon}><Navigation size={17} color="#1B7A4E" /></View>
                <View style={styles.mapHintCopy}>
                  <Text style={styles.mapHintTitle}>{form.latitudeText && form.longitudeText ? "Lokasi rumah sudah dipilih" : "Pilih titik rumah di Maps"}</Text>
                  <Text style={styles.mapHintText}>{form.detectedAddress || "Gunakan GPS, cari alamat, atau geser pin ke posisi rumah yang tepat."}</Text>
                </View>
                <TouchableOpacity onPress={openLocationPicker} style={styles.mapButton}>
                  <Text style={styles.mapButtonText}>{form.latitudeText && form.longitudeText ? "Ubah lokasi" : "Pilih di Maps"}</Text>
                </TouchableOpacity>
              </View>
              {form.latitudeText && form.longitudeText && <Text style={styles.coordinateText}>Latitude: {form.latitudeText} · Longitude: {form.longitudeText}</Text>}

              <Text style={styles.sectionTitle}>Akses dan catatan driver</Text>
              <View style={styles.chipWrap}>
                {ACCESS_TYPES.map((accessType) => (
                  <Pressable key={accessType} onPress={() => updateForm("accessType", accessType)} style={[styles.chip, form.accessType === accessType && styles.chipActive]}>
                    <Text style={[styles.chipText, form.accessType === accessType && styles.chipTextActive]}>{accessType}</Text>
                  </Pressable>
                ))}
              </View>
              {field("notes", "Detail rumah / patokan", "Contoh: rumah pagar hitam, sebelah minimarket, masuk gang kedua", { multiline: true })}

              <Pressable style={styles.primaryToggle} onPress={() => updateForm("isMain", !form.isMain)}>
                <View style={[styles.checkbox, form.isMain && styles.checkboxActive]}>{form.isMain && <Check size={14} color="#FFFFFF" />}</View>
                <Text style={styles.primaryToggleText}>Jadikan sebagai alamat utama</Text>
              </Pressable>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setFormVisible(false)} disabled={saving}>
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, styles.formSaveButton, saving && styles.disabledButton]} onPress={() => void saveForm()} disabled={saving}>
                  <Text style={styles.primaryButtonText}>{saving ? "Menyimpan..." : "Simpan alamat"}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: Platform.OS === "ios" ? 12 : 4 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <CustomerLocationPicker
        visible={locationPickerVisible}
        initialLocation={selectedLocation}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={handleLocationConfirmed}
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E8EEF2" },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F7F9" },
  headerCopy: { flex: 1, marginLeft: 12 },
  title: { color: "#10251B", fontSize: 17, fontWeight: "900" },
  subtitle: { color: "#718096", fontSize: 11, marginTop: 3 },
  addHeaderButton: { minHeight: 38, borderRadius: 12, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, paddingHorizontal: 11 },
  addHeaderText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  content: { paddingTop: 14, paddingBottom: 34 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 14, backgroundColor: "#F0FAF4", borderWidth: 1, borderColor: "#D6ECDD", marginBottom: 12 },
  infoText: { flex: 1, color: "#35664D", fontSize: 11, lineHeight: 17 },
  profileCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5EBEF", padding: 16, marginBottom: 18 },
  profileSaveButton: { alignSelf: "stretch", minHeight: 40, paddingHorizontal: 13, borderRadius: 11, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center", marginTop: 4 },
  profileSaveText: { color: "#1B7A4E", fontSize: 11, fontWeight: "900" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionHint: { color: "#94A3B8", fontSize: 10, marginTop: -5 },
  compactAddButton: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#B7DEC8", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#F8FCF9" },
  compactAddText: { color: "#1B7A4E", fontSize: 11, fontWeight: "900" },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 22, paddingVertical: 34 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  emptyText: { color: "#64748B", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7, marginBottom: 20 },
  addressCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5EBEF", padding: 15, marginBottom: 12 },
  addressCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  addressIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center" },
  addressLabel: { color: "#10251B", fontSize: 14, fontWeight: "900" },
  primaryBadge: { backgroundColor: "#EAF7EF", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  primaryBadgeText: { color: "#1B7A4E", fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  cardActions: { flexDirection: "row", gap: 5 },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  receiver: { color: "#334155", fontSize: 12, fontWeight: "700", marginTop: 13 },
  fullAddress: { color: "#475569", fontSize: 12, lineHeight: 18, marginTop: 5 },
  previewMapWrap: { height: 112, borderRadius: 14, overflow: "hidden", marginTop: 11, borderWidth: 1, borderColor: "#CBEAD7", position: "relative" },
  previewMap: { flex: 1 },
  previewMapFrame: { width: "100%", height: "100%", borderWidth: 0 },
  previewMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF7EF" },
  previewMapFallbackText: { color: "#166534", fontSize: 10, fontWeight: "800", marginTop: 4 },
  previewMapBadge: { position: "absolute", left: 9, bottom: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.95)" },
  previewMapText: { color: "#166534", fontSize: 9, fontWeight: "900" },
  accessText: { color: "#64748B", fontSize: 11, lineHeight: 17, marginTop: 6 },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  pinText: { color: "#1B7A4E", fontSize: 10, flex: 1 },
  mapLinkButton: { alignSelf: "flex-start", paddingVertical: 5 },
  mapLinkText: { color: "#1B7A4E", fontSize: 10, fontWeight: "900" },
  secondaryButton: { alignSelf: "flex-start", marginTop: 13, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#B7DEC8" },
  secondaryButtonText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },
  footerHint: { color: "#94A3B8", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 8 },
  primaryButton: { minHeight: 46, borderRadius: 14, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  cancelButtonText: { color: "#475569", fontSize: 13, fontWeight: "900" },
  formSaveButton: { flex: 1 },
  disabledButton: { opacity: 0.55 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" },
  formSheet: { maxHeight: "94%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 14, overflow: "hidden" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F4" },
  sheetTitle: { color: "#10251B", fontSize: 17, fontWeight: "900" },
  sheetSubtitle: { color: "#718096", fontSize: 11, marginTop: 4 },
  closeButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#F5F7F9", alignItems: "center", justifyContent: "center" },
  formContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  sectionTitle: { color: "#24362D", fontSize: 12, fontWeight: "900", letterSpacing: 0.3, marginTop: 13, marginBottom: 9 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E0E7EC", backgroundColor: "#FFFFFF" },
  chipActive: { backgroundColor: "#EAF7EF", borderColor: "#80C49C" },
  chipText: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#1B7A4E" },
  fieldBlock: { flex: 1, marginBottom: 10 },
  fieldLabel: { color: "#334155", fontSize: 11, fontWeight: "800", marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#E0E7EC", borderRadius: 11, paddingHorizontal: 12, color: "#10251B", fontSize: 13, backgroundColor: "#FAFCFB" },
  multilineInput: { minHeight: 72, paddingTop: 11 },
  twoColumns: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  mapHintCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 14, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 10 },
  mapHintIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  mapHintCopy: { flex: 1 },
  mapHintTitle: { color: "#166534", fontSize: 11, fontWeight: "900" },
  mapHintText: { color: "#4D7C5B", fontSize: 10, lineHeight: 15, marginTop: 2 },
  mapButton: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, backgroundColor: "#1B7A4E" },
  mapButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  coordinateText: { color: "#1B7A4E", fontSize: 10, fontWeight: "700", marginBottom: 8 },
  primaryToggle: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: "#94A3B8", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  primaryToggleText: { color: "#334155", fontSize: 12, fontWeight: "800" },
});
