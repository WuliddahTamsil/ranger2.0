import React, { useMemo, useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Bike,
  Building,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Compass,
  Eye,
  EyeOff,
  FileText,
  House,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  Package,
  Phone,
  Pill,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Store,
  Tag,
  UserRound,
  WashingMachine,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthRegistrationRole, RegistrationForm, ROLE_LABELS } from "./authTypes";
import { getDocumentRequirements, getMissingDocuments, validateBaseStep, validateRoleStep } from "./authValidation";
import { authColors, authStyles } from "./authStyles";
import { AuthStepper } from "./components/AuthStepper";
import { DocumentUploadCard } from "./components/DocumentUploadCard";
import { AuthBrand } from "./components/AuthBrand";

interface Props extends Nav {
  role: AuthRegistrationRole;
  initialEmail?: string;
  initialName?: string;
  googleRegistration?: boolean;
  onSubmit: (form: RegistrationForm) => Promise<{ ok: boolean; error?: string }>;
}

const emptyForm = (initialEmail?: string, initialName?: string): RegistrationForm => ({
  name: initialName || "",
  email: initialEmail || "",
  phone: "",
  password: "",
  passwordConfirmation: "",
  address: "",
  roleData: {},
  documents: {},
});

const ROLE_METAS: Record<
  AuthRegistrationRole,
  {
    title: string;
    badge: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
  }
> = {
  customer: { title: "Pelanggan", badge: "Warga Komunitas", icon: UserRound },
  driver: { title: "Driver Kanyaah", badge: "Ride & Send", icon: Bike },
  pemilik_shop: { title: "Kanyaah Shop", badge: "Retail & Apotek", icon: Store },
  pemilik_catering: { title: "Kanyaah Catering", badge: "Kuliner Lokal", icon: Coffee },
  pemilik_laundry: { title: "Kanyaah Laundry", badge: "Cuci & Setrika", icon: WashingMachine },
  pemilik_kos: { title: "Homestay, Kos & Wisata", badge: "Hunian & Rekreasi", icon: Building2 },
  bank_sampah: { title: "Kanyaah Recycle", badge: "Bank Sampah", icon: Scale },
  pemilik_marketplace: { title: "Pemilik Marketplace (Kanyaah Mart)", badge: "Kanyaah Mart / UMKM", icon: ShoppingBag },
};

const inputConfig: Record<
  AuthRegistrationRole,
  Array<{ key: string; label: string; placeholder: string; multiline?: boolean; required?: boolean }>
> = {
  customer: [],
  driver: [
    { key: "plateNumber", label: "Plat nomor kendaraan", placeholder: "Contoh: D 1234 RGR" },
    { key: "vehicleType", label: "Jenis kendaraan", placeholder: "Motor / Mobil" },
    { key: "vehicleBrand", label: "Merek & tipe kendaraan", placeholder: "Contoh: Honda Beat 2022", required: false },
  ],
  pemilik_marketplace: [
    { key: "businessName", label: "Nama toko / usaha UMKM", placeholder: "Contoh: UMKM Berkah Kamojang / Toko Bu Ani" },
    { key: "businessAddress", label: "Alamat toko / operasional UMKM", placeholder: "Alamat lengkap tempat usaha Anda", multiline: true },
    { key: "businessCategory", label: "Kategori produk UMKM", placeholder: "Contoh: Makanan Olahan, Kerajinan, Minuman, Fashion", required: false },
    { key: "businessPhone", label: "No. WhatsApp usaha (opsional)", placeholder: "Contoh: 081234567890", required: false },
  ],
  pemilik_shop: [
    { key: "businessName", label: "Nama toko / apotek", placeholder: "Contoh: Kanyaah Mart / Apotek Sehat" },
    { key: "businessAddress", label: "Alamat outlet", placeholder: "Alamat lengkap outlet toko", multiline: true },
  ],
  pemilik_catering: [
    { key: "businessName", label: "Nama usaha katering / kuliner", placeholder: "Contoh: Catering Aisyah / Dapur Nani" },
    { key: "businessAddress", label: "Alamat dapur operasional", placeholder: "Alamat lengkap dapur katering", multiline: true },
    { key: "businessType", label: "Jenis pesanan & spesialisasi", placeholder: "Nasi box, prasmanan, snack box, dll", required: false },
  ],
  pemilik_laundry: [
    { key: "businessName", label: "Nama usaha laundry", placeholder: "Contoh: Laundry Kanyaah / Bersih Laundry" },
    { key: "businessAddress", label: "Alamat outlet laundry", placeholder: "Alamat lengkap outlet laundry", multiline: true },
    { key: "serviceType", label: "Jenis layanan cucian", placeholder: "Kiloan, satuan, dry clean, express", required: false },
  ],
  pemilik_kos: [
    { key: "businessName", label: "Nama homestay / kos", placeholder: "Contoh: Homestay Kamojang Asri / Kos Putri Melati" },
    { key: "businessAddress", label: "Alamat properti", placeholder: "Alamat lengkap properti", multiline: true },
    { key: "propertyType", label: "Tipe hunian", placeholder: "Putri / Putra / Campur / Villa", required: false },
  ],
  bank_sampah: [
    { key: "businessName", label: "Nama Unit Bank Sampah", placeholder: "Contoh: Bank Sampah Induk Kamojang Asri" },
    { key: "businessAddress", label: "Alamat Lengkap Unit", placeholder: "Alamat operasional unit bank sampah", multiline: true },
  ],
};

export const RegisterFlowScreen: React.FC<Props> = ({
  navigate,
  role,
  initialEmail,
  initialName,
  googleRegistration,
  onSubmit,
}) => {
  const [form, setForm] = useState<RegistrationForm>(() => emptyForm(initialEmail, initialName));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requirements = useMemo(() => getDocumentRequirements(role, form.roleData), [role, form.roleData]);
  const isCustomer = role === "customer";
  const labels = isCustomer ? ["Akun"] : ["Akun & Domisili", "Data Usaha", "Unggah Dokumen"];
  const roleMeta = ROLE_METAS[role] || { title: ROLE_LABELS[role], badge: "Mitra", icon: Store };
  const RoleIconComp = roleMeta.icon;

  const update = (key: keyof RegistrationForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateRoleData = (key: string, value: string) =>
    setForm((current) => ({ ...current, roleData: { ...current.roleData, [key]: value } }));

  const next = async () => {
    setError("");
    if (step === 0) {
      const validation = validateBaseStep(form, { allowPasswordless: googleRegistration, customer: isCustomer });
      if (validation) {
        setError(validation);
        return;
      }
    }
    if (step === 1 && !isCustomer) {
      const validation = validateRoleStep(role, form.roleData);
      if (validation) {
        setError(validation);
        return;
      }
    }
    if (step === 2 && !isCustomer) {
      const missing = getMissingDocuments(role, form.documents, form.roleData);
      if (missing.length) {
        setError(`Dokumen wajib belum lengkap: ${missing.join(", ")}.`);
        return;
      }
    }
    if (step < labels.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit(form);
      if (!result.ok) {
        setError(result.error || "Registrasi belum dapat disimpan.");
      }
    } catch {
      setError("Registrasi belum dapat disimpan. Periksa koneksi dan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    setError("");
    if (step === 0) {
      navigate("auth_register_role");
    } else {
      setStep((current) => current - 1);
    }
  };

  return (
    <ResponsiveSafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {/* Top Bar with Back Button */}
            <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={16} color={authColors.muted} />
              <Text style={styles.backBtnText}>
                {step === 0 ? "Pilih Peran Lain" : "Langkah Sebelumnya"}
              </Text>
            </TouchableOpacity>

            {/* Header Brand */}
            <View style={styles.brandHeader}>
              <AuthBrand size={40} />
            </View>

            {/* Role Header Pill */}
            <View style={styles.roleHeaderPill}>
              <View style={styles.roleHeaderIconWrap}>
                <RoleIconComp size={15} color={authColors.primary} />
              </View>
              <Text style={styles.roleHeaderTitle}>{roleMeta.title}</Text>
              <View style={styles.roleHeaderDot} />
              <Text style={styles.roleHeaderBadge}>{roleMeta.badge}</Text>
            </View>

            {/* Screen Heading */}
            <View style={styles.heading}>
              <Text style={styles.title}>
                {isCustomer ? "Buat Akun Pelanggan" : "Pendaftaran Mitra"}
              </Text>
              <Text style={styles.subtitle}>
                {isCustomer
                  ? "Daftar singkat untuk mulai belanja UMKM, transportasi, katering, dan poin sampah."
                  : "Lengkapi data akun dan berkas dasar untuk diverifikasi oleh admin GEOVERSE."}
              </Text>
            </View>

            {/* Stepper only for multi-step partner registrations */}
            {!isCustomer && <AuthStepper current={step} labels={labels} />}

            {/* Step Content (No nested cards, clean and modern flow) */}
            {step === 0 && (
              <BaseStep
                form={form}
                update={update}
                customer={isCustomer}
                googleRegistration={googleRegistration}
              />
            )}

            {!isCustomer && step === 1 && (
              <RoleStep
                role={role}
                roleData={form.roleData}
                updateRoleData={updateRoleData}
                defaultPhone={form.phone}
              />
            )}

            {!isCustomer && step === 2 && (
              <DocumentsStep
                role={role}
                requirements={requirements}
                documents={form.documents}
                setDocument={(key, document) =>
                  setForm((current) => {
                    const documents = { ...current.documents };
                    if (document) documents[key] = document;
                    else delete documents[key];
                    return { ...current, documents };
                  })
                }
              />
            )}

            {/* Validation / API Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => void next()}
              disabled={loading}
              style={[authStyles.primaryButton, styles.primaryCta]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={authStyles.primaryButtonText}>
                    {isCustomer
                      ? "Daftar sebagai Pelanggan"
                      : step === 2
                      ? "Kirim Pendaftaran Mitra"
                      : step === 1
                      ? "Lanjutkan ke Dokumen"
                      : "Lanjutkan ke Data Usaha"}
                  </Text>
                  {step === 2 && !isCustomer ? (
                    <ShieldCheck size={18} color="#FFFFFF" />
                  ) : (
                    <ArrowRight size={18} color="#FFFFFF" />
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Footer Hint / Switch to Login */}
            {isCustomer ? (
              <View style={styles.loginSwitchRow}>
                <Text style={styles.loginSwitchText}>Sudah memiliki akun GEOVERSE?</Text>
                <TouchableOpacity onPress={() => navigate("login")} activeOpacity={0.7}>
                  <Text style={styles.loginSwitchLink}>Masuk di sini</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.partnerFooterNote}>
                <ShieldCheck size={14} color={authColors.primary} />
                <Text style={styles.partnerFooterNoteText}>
                  {step === 2
                    ? "Setelah dikirim, admin GEOVERSE akan memverifikasi berkas Anda. Status dapat dipantau langsung di aplikasi."
                    : "Data Anda terlindungi oleh sistem enkripsi GEOVERSE 2.0 dan hanya digunakan untuk verifikasi operasional."}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveSafeAreaView>
  );
};

/* -------------------------------------------------------------------------- */
/* STEP 0: DATA AKUN & PRIBADI                                               */
/* -------------------------------------------------------------------------- */
const BaseStep: React.FC<{
  form: RegistrationForm;
  update: (key: keyof RegistrationForm, value: string) => void;
  customer: boolean;
  googleRegistration?: boolean;
}> = ({ form, update, customer, googleRegistration }) => (
  <View style={styles.stepContainer}>
    <SectionHeading
      icon={<UserRound size={17} color={authColors.primary} />}
      title={customer ? "Data Akun Anda" : "Data Pribadi Pemilik / Mitra"}
      text={
        customer
          ? "Isi informasi akun untuk memudahkan pemesanan dan komunikasi kurir."
          : "Gunakan nama sesuai KTP dan nomor telepon aktif yang terhubung WhatsApp."
      }
    />

    <ModernTextField
      label="Nama Lengkap"
      required
      value={form.name}
      onChangeText={(value) => update("name", value)}
      placeholder="Nama lengkap sesuai identitas"
      icon={<UserRound size={18} color={authColors.muted} />}
    />

    <ModernTextField
      label="Alamat Email"
      required
      value={form.email}
      onChangeText={(value) => update("email", value)}
      placeholder="nama@email.com"
      keyboardType="email-address"
      autoCapitalize="none"
      icon={<Mail size={18} color={authColors.muted} />}
    />

    <ModernTextField
      label={customer ? "Nomor WhatsApp / HP" : "Nomor WhatsApp Aktif"}
      required
      value={form.phone}
      onChangeText={(value) => update("phone", value)}
      placeholder="0812-3456-7890"
      keyboardType="phone-pad"
      hint="Nomor digunakan untuk verifikasi login dan koordinasi pengantaran."
      icon={<Phone size={18} color={authColors.muted} />}
    />

    {googleRegistration ? (
      <View style={styles.googleNoticeBox}>
        <ShieldCheck size={18} color={authColors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.googleNoticeTitle}>Terhubung dengan Google</Text>
          <Text style={styles.googleNoticeSub}>
            Akun ini diamankan oleh autentikasi Google. Kata sandi tambahan tidak diperlukan.
          </Text>
        </View>
      </View>
    ) : (
      <>
        <PasswordField
          label="Kata Sandi"
          required
          value={form.password}
          onChangeText={(value) => update("password", value)}
          placeholder="Minimal 8 karakter (huruf & angka)"
          hint="Gunakan kombinasi minimal 8 karakter dengan huruf dan angka."
        />

        <PasswordField
          label="Konfirmasi Kata Sandi"
          required
          value={form.passwordConfirmation}
          onChangeText={(value) => update("passwordConfirmation", value)}
          placeholder="Ulangi kata sandi"
        />
      </>
    )}

    {!customer && (
      <ModernTextField
        label="Alamat Domisili Lengkap"
        required
        value={form.address}
        onChangeText={(value) => update("address", value)}
        placeholder="Alamat rumah tinggal / domisili lengkap (Jalan, RT/RW, Desa, Kecamatan)"
        multiline
        icon={<MapPin size={18} color={authColors.muted} />}
      />
    )}
  </View>
);

/* -------------------------------------------------------------------------- */
/* STEP 1: DATA USAHA / KENDARAAN                                             */
/* -------------------------------------------------------------------------- */
const RoleStep: React.FC<{
  role: AuthRegistrationRole;
  roleData: Record<string, string>;
  updateRoleData: (key: string, value: string) => void;
  defaultPhone?: string;
}> = ({ role, roleData, updateRoleData, defaultPhone }) => {
  if (role === "driver") {
    const selectedVehicleType = roleData.vehicleType || "Motor";
    return (
      <View style={styles.stepContainer}>
        <SectionHeading
          icon={<Bike size={18} color={authColors.primary} />}
          title="Data Kendaraan Operasional"
          text="Informasi kendaraan yang akan digunakan untuk mengantar penumpang, barang kilat, atau jemput sampah."
        />

        <View style={styles.vehicleTypeSelector}>
          <Text style={styles.fieldLabel}>
            Jenis Kendaraan Operasional <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.vehicleTypeRow}>
            {[
              { type: "Motor", label: "Sepeda Motor", desc: "Ride & Kurir Kilat" },
              { type: "Mobil", label: "Mobil", desc: "Kargo & Penumpang" },
            ].map((v) => {
              const isSelected = selectedVehicleType === v.type;
              return (
                <TouchableOpacity
                  key={v.type}
                  onPress={() => updateRoleData("vehicleType", v.type)}
                  style={[
                    styles.vehicleTypeCard,
                    isSelected && styles.vehicleTypeCardSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <Bike size={18} color={isSelected ? authColors.primary : authColors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.vehicleTypeCardLabel,
                        isSelected && styles.vehicleTypeCardLabelSelected,
                      ]}
                    >
                      {v.label}
                    </Text>
                    <Text style={styles.vehicleTypeCardDesc}>{v.desc}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ModernTextField
          label="Plat Nomor Kendaraan"
          required
          value={roleData.plateNumber || ""}
          onChangeText={(value) => updateRoleData("plateNumber", value.toUpperCase())}
          placeholder="Contoh: D 1234 RGR"
          autoCapitalize="characters"
          icon={<Tag size={18} color={authColors.muted} />}
        />

        <ModernTextField
          label="Merek & Tipe Kendaraan"
          optional
          value={roleData.vehicleBrand || ""}
          onChangeText={(value) => updateRoleData("vehicleBrand", value)}
          placeholder="Contoh: Honda Beat 2022 / Vario 160"
          icon={<Bike size={18} color={authColors.muted} />}
        />
      </View>
    );
  }

  if (role === "pemilik_kos") {
    const rawCategories = roleData.businessCategories || roleData.businessCategory || "kost";
    const selectedCategories = rawCategories.split(",").map((c: string) => c.trim()).filter(Boolean);
    const selectedType = roleData.propertyType || "Campur";

    const categories = [
      { id: "kost", label: "Kost & Coliving", sub: "Putri, Putra, atau Campur (Bulanan / Tahunan)", icon: "🏠" },
      { id: "hotel", label: "Penginapan / Villa / Hotel", sub: "Sewa harian, villa privat, resort & homestay", icon: "🏨" },
      { id: "wisata", label: "Destinasi Wisata & Rekreasi", sub: "Tiket wahana, tiket masuk & spot wisata", icon: "🎟️" },
    ];

    const toggleCategory = (catId: string) => {
      let updated = selectedCategories.includes(catId)
        ? selectedCategories.filter((c: string) => c !== catId)
        : [...selectedCategories, catId];
      if (updated.length === 0) updated = [catId];
      updateRoleData("businessCategories", updated.join(","));
      updateRoleData("businessCategory", updated[0]);
      if (!updated.includes("kost") && updated.includes("hotel")) {
        updateRoleData("propertyType", "Villa / Hotel");
      } else if (!updated.includes("kost") && updated.includes("wisata")) {
        updateRoleData("propertyType", "Wisata");
      }
    };

    const kostTypes = ["Putri", "Putra", "Campur"];

    return (
      <View style={styles.stepContainer}>
        <SectionHeading
          icon={<Building2 size={18} color={authColors.primary} />}
          title="Data Usaha Homestay, Kos & Wisata"
          text="Pilih bidang yang Anda kelola (bisa memilih lebih dari satu jenis layanan)."
        />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
          Jenis Layanan Properti <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                    {cat.label}
                  </Text>
                  <Text style={styles.categorySub}>{cat.sub}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedCategories.includes("kost") && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>
              Tipe Penghuni Kost <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.subTypeRow}>
              {kostTypes.map((t) => {
                const isTypeActive = selectedType.toLowerCase().includes(t.toLowerCase());
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.subTypeChip, isTypeActive && styles.subTypeChipActive]}
                    onPress={() => updateRoleData("propertyType", `Kost ${t}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.subTypeText, isTypeActive && styles.subTypeTextActive]}>
                      Kost {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <ModernTextField
          label="Nama Usaha / Properti"
          required
          value={roleData.businessName || ""}
          onChangeText={(value) => updateRoleData("businessName", value)}
          placeholder={
            selectedCategories.includes("wisata")
              ? "Contoh: Taman Wisata Air Sabda Alam"
              : selectedCategories.includes("hotel")
              ? "Contoh: Kamojang Green Resort & Villa"
              : "Contoh: Ais Kost Putri Exclusive"
          }
          icon={<Building size={18} color={authColors.muted} />}
        />

        <ModernTextField
          label="Alamat Lengkap Properti"
          required
          value={roleData.businessAddress || ""}
          onChangeText={(value) => {
            updateRoleData("businessAddress", value);
            const lower = value.toLowerCase();
            if (lower.includes("cipanas") || lower.includes("sabda alam") || lower.includes("tarogong")) {
              updateRoleData("latitude", "-7.1852");
              updateRoleData("longitude", "107.8765");
            } else if (lower.includes("kamojang") || lower.includes("samarang")) {
              updateRoleData("latitude", "-7.2145");
              updateRoleData("longitude", "107.7982");
            } else if (lower.includes("bagendit") || lower.includes("banyuresmi")) {
              updateRoleData("latitude", "-7.1562");
              updateRoleData("longitude", "107.9421");
            } else if (lower.includes("darajat") || lower.includes("pasirwangi")) {
              updateRoleData("latitude", "-7.2341");
              updateRoleData("longitude", "107.7654");
            } else if (lower.includes("garut kota")) {
              updateRoleData("latitude", "-7.2278");
              updateRoleData("longitude", "107.9087");
            }
          }}
          placeholder="Jalan, nomor, RT/RW, kelurahan, kecamatan, Garut"
          multiline
          icon={<MapPin size={18} color={authColors.muted} />}
        />

        {/* Quick Area Mapping Chips */}
        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Pilih Lokasi Cepat di Garut:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaChipsScroll}>
          {[
            { label: "📍 Tarogong / Cipanas", address: "Jl. Raya Cipanas, Tarogong Kaler, Garut", lat: "-7.1852", lng: "107.8765" },
            { label: "📍 Samarang / Kamojang", address: "Jl. Raya Kamojang, Samarang, Garut", lat: "-7.2145", lng: "107.7982" },
            { label: "📍 Garut Kota", address: "Pusat Kota Garut, Jawa Barat", lat: "-7.2278", lng: "107.9087" },
            { label: "📍 Situ Bagendit", address: "Kec. Banyuresmi, Garut", lat: "-7.1562", lng: "107.9421" },
            { label: "📍 Kawah Darajat", address: "Jl. Pasirwangi, Darajat, Garut", lat: "-7.2341", lng: "107.7654" },
          ].map((area, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.areaQuickChip,
                roleData.latitude === area.lat && styles.areaQuickChipActive,
              ]}
              onPress={() => {
                if (!roleData.businessAddress) {
                  updateRoleData("businessAddress", area.address);
                }
                updateRoleData("latitude", area.lat);
                updateRoleData("longitude", area.lng);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.areaQuickChipText,
                  roleData.latitude === area.lat && styles.areaQuickChipTextActive,
                ]}
              >
                {area.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Clean GPS Card */}
        <View style={styles.gpsCardWrapper}>
          <Text style={styles.gpsCardTitle}>Titik Koordinat Peta (Otomatis):</Text>
          <View style={styles.gpsRowClean}>
            <View style={styles.gpsInputCol}>
              <Text style={styles.gpsMiniLabel}>Latitude</Text>
              <TextInput
                style={styles.gpsInputBox}
                value={roleData.latitude || "-7.2278"}
                onChangeText={(value) => updateRoleData("latitude", value)}
                placeholder="-7.2278"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gpsInputCol}>
              <Text style={styles.gpsMiniLabel}>Longitude</Text>
              <TextInput
                style={styles.gpsInputBox}
                value={roleData.longitude || "107.9087"}
                onChangeText={(value) => updateRoleData("longitude", value)}
                placeholder="107.9087"
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={styles.gpsHint}>
            Koordinat GPS digunakan agar pelanggan dapat melihat jarak presisi (km) ke lokasi properti Anda.
          </Text>
        </View>
      </View>
    );
  }

  if (role === "pemilik_shop") {
    return <ShopRoleStep roleData={roleData} updateRoleData={updateRoleData} defaultPhone={defaultPhone} />;
  }

  return (
    <View style={styles.stepContainer}>
      <SectionHeading
        icon={<ShieldCheck size={18} color={authColors.primary} />}
        title={
          role === "pemilik_marketplace"
            ? "Data Toko / Usaha UMKM"
            : role === "pemilik_catering"
            ? "Data Usaha Katering"
            : role === "pemilik_laundry"
            ? "Data Usaha Laundry"
            : role === "bank_sampah"
            ? "Data Unit Bank Sampah"
            : "Data Usaha"
        }
        text={
          role === "pemilik_marketplace"
            ? "Isi informasi sederhana toko/UMKM Anda untuk produk Kanyaah Mart."
            : "Isi informasi operasional dasar yang akan tampil pada profil mitra."
        }
      />
      {inputConfig[role].map((field) => (
        <ModernTextField
          key={field.key}
          label={field.label}
          required={field.required !== false}
          optional={field.required === false}
          value={roleData[field.key] || ""}
          onChangeText={(value) => updateRoleData(field.key, value)}
          placeholder={field.placeholder}
          multiline={field.multiline}
          icon={<Store size={18} color={authColors.muted} />}
        />
      ))}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* STEP 1: KHUSUS KANYAAH SHOP / APOTEK                                       */
/* -------------------------------------------------------------------------- */
const ShopRoleStep: React.FC<{
  roleData: Record<string, string>;
  updateRoleData: (key: string, value: string) => void;
  defaultPhone?: string;
}> = ({ roleData, updateRoleData, defaultPhone }) => {
  React.useEffect(() => {
    if (!roleData.businessPhone && defaultPhone) {
      updateRoleData("businessPhone", defaultPhone);
    }
    if (!roleData.brandType) {
      updateRoleData("brandType", "INDEPENDENT");
    }
    if (!roleData.businessCategory) {
      updateRoleData("businessCategory", "MINIMARKET");
      updateRoleData("storeType", "MINIMARKET");
    }
    if (!roleData.openTime) {
      updateRoleData("openTime", "07:00");
    }
    if (!roleData.closeTime) {
      updateRoleData("closeTime", "22:00");
    }
    if (!roleData.latitude) {
      updateRoleData("latitude", "-7.1475");
      updateRoleData("longitude", "107.8015");
    }
  }, [defaultPhone]);

  const brandOptions = [
    { id: "INDEPENDENT", label: "Toko Independen", icon: Store },
    { id: "ALFAMART", label: "Alfamart", icon: ShoppingBag },
    { id: "INDOMARET", label: "Indomaret", icon: Building2 },
    { id: "CIRCLE_K", label: "Circle K", icon: Coffee },
    { id: "OTHER", label: "Brand Lain", icon: Tag },
  ];

  const primaryCategories = [
    { id: "MINIMARKET", label: "Minimarket", icon: ShoppingBag, color: "#0D7A53", bg: "#E8F5EE" },
    { id: "SUPERMARKET", label: "Supermarket", icon: Building, color: "#2563EB", bg: "#DBEAFE" },
    { id: "PHARMACY", label: "Apotek", icon: Pill, color: "#0284C7", bg: "#E0F2FE" },
    { id: "COSMETICS", label: "Kosmetik", icon: Sparkles, color: "#DB2777", bg: "#FCE7F3" },
  ];

  const secondaryCategories = [
    { id: "BABY", label: "Ibu & Bayi", icon: Baby, color: "#D97706", bg: "#FEF3C7" },
    { id: "HEALTH", label: "Kesehatan", icon: Stethoscope, color: "#059669", bg: "#D1FAE5" },
    { id: "HOUSEHOLD", label: "Rumah Tangga", icon: House, color: "#7C3AED", bg: "#EDE9FE" },
    { id: "OTHER", label: "Retail Lain", icon: Package, color: "#475569", bg: "#F1F5F9" },
  ];

  const selectedBrand = roleData.brandType || "INDEPENDENT";
  const selectedCategory = roleData.businessCategory || roleData.storeType || "MINIMARKET";
  const isChainBrand = ["ALFAMART", "INDOMARET", "CIRCLE_K"].includes(selectedBrand);
  const isPharmacy = selectedCategory === "PHARMACY";

  const isSecondaryActive = secondaryCategories.some((c) => c.id === selectedCategory);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(isSecondaryActive);
  const [showManualGps, setShowManualGps] = useState<boolean>(false);

  const handleSelectCategory = (catId: string) => {
    updateRoleData("businessCategory", catId);
    const catToStoreType: Record<string, string> = {
      COSMETICS: "BEAUTY",
      PHARMACY: "PHARMACY",
      MINIMARKET: "MINIMARKET",
      SUPERMARKET: "SUPERMARKET",
      HEALTH: "HEALTH",
      BABY: "BABY",
      HOUSEHOLD: "HOUSEHOLD",
      OTHER: "OTHER",
    };
    updateRoleData("storeType", catToStoreType[catId] || catId);
  };

  const handleSelectBrand = (brandId: string) => {
    updateRoleData("brandType", brandId);
    if (brandId === "INDEPENDENT") {
      updateRoleData("isOfficialPartnerRequested", "false");
    } else if (brandId !== "OTHER") {
      updateRoleData("isOfficialPartnerRequested", "true");
    }
  };

  const handleNameChange = (val: string) => {
    updateRoleData("outletName", val);
    updateRoleData("businessName", val);
  };

  return (
    <View style={styles.stepContainer}>
      <SectionHeading
        icon={<Store size={18} color={authColors.primary} />}
        title="Profil Toko & Operasional"
        text="Lengkapi informasi outlet Kanyaah Shop atau Apotek penanggung jawab obat."
      />

      {/* 1. Jaringan / Brand Usaha */}
      <View style={styles.simpleSection}>
        <Text style={styles.simpleSectionTitle}>1. Jaringan / Brand Toko *</Text>
        <View style={styles.chipRowWrap}>
          {brandOptions.map((b) => {
            const isSelected = selectedBrand === b.id;
            const IconComp = b.icon;
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.compactChip, isSelected && styles.compactChipSelected]}
                onPress={() => handleSelectBrand(b.id)}
                activeOpacity={0.75}
              >
                <IconComp size={14} color={isSelected ? "#0D7A53" : "#64748B"} />
                <Text style={[styles.compactChipText, isSelected && styles.compactChipTextSelected]}>
                  {b.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedBrand === "OTHER" && (
          <View style={{ marginTop: 8 }}>
            <ModernTextField
              label="Nama Brand / Jaringan Lainnya"
              required
              value={roleData.brandName || ""}
              onChangeText={(val) => updateRoleData("brandName", val)}
              placeholder="Contoh: FamilyMart / Lawson"
              icon={<Tag size={16} color={authColors.primary} />}
            />
          </View>
        )}

        {isChainBrand && (
          <View style={styles.chainCompactBanner}>
            <View style={styles.chainBannerLeft}>
              <ShieldCheck size={15} color="#0D7A53" />
              <Text style={styles.chainBannerText}>Cabang resmi {selectedBrand}?</Text>
            </View>
            <View style={styles.chainPillGroup}>
              <TouchableOpacity
                style={[styles.chainMiniPill, roleData.isOfficialPartnerRequested === "true" && styles.chainMiniPillActive]}
                onPress={() => updateRoleData("isOfficialPartnerRequested", "true")}
                activeOpacity={0.8}
              >
                <Text style={[styles.chainMiniPillText, roleData.isOfficialPartnerRequested === "true" && styles.chainMiniPillTextActive]}>
                  Ya, Resmi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chainMiniPill, roleData.isOfficialPartnerRequested === "false" && styles.chainMiniPillActive]}
                onPress={() => updateRoleData("isOfficialPartnerRequested", "false")}
                activeOpacity={0.8}
              >
                <Text style={[styles.chainMiniPillText, roleData.isOfficialPartnerRequested === "false" && styles.chainMiniPillTextActive]}>
                  Bukan / Mandiri
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 2. Kategori Produk */}
      <View style={styles.simpleSection}>
        <View style={styles.simpleHeaderRow}>
          <Text style={styles.simpleSectionTitle}>2. Kategori Produk *</Text>
          {isSecondaryActive && !showAllCategories && (
            <View style={styles.activePillSmall}>
              <Text style={styles.activePillSmallText}>
                {secondaryCategories.find((c) => c.id === selectedCategory)?.label || "Khusus"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.catGrid2Col}>
          {primaryCategories.map((c) => {
            const isSelected = selectedCategory === c.id;
            const IconComp = c.icon;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catCardCompact, isSelected && styles.catCardCompactSelected]}
                onPress={() => handleSelectCategory(c.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.catIconBoxSmall, { backgroundColor: c.bg }]}>
                  <IconComp size={15} color={c.color} />
                </View>
                <Text numberOfLines={1} style={[styles.catCardLabelCompact, isSelected && styles.catCardLabelCompactSelected]}>
                  {c.label}
                </Text>
                {isSelected && <Check size={13} color="#0D7A53" strokeWidth={3} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.expandToggleBtn}
          onPress={() => setShowAllCategories(!showAllCategories)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            {showAllCategories
              ? "Sembunyikan Kategori Tambahan"
              : "+ Kategori Lainnya (Ibu & Bayi, Alkes, Rumah Tangga, dll)"}
          </Text>
          {showAllCategories ? <ChevronUp size={15} color="#0D7A53" /> : <ChevronDown size={15} color="#0D7A53" />}
        </TouchableOpacity>

        {showAllCategories && (
          <View style={[styles.catGrid2Col, { marginTop: 8 }]}>
            {secondaryCategories.map((c) => {
              const isSelected = selectedCategory === c.id;
              const IconComp = c.icon;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catCardCompact, isSelected && styles.catCardCompactSelected]}
                  onPress={() => handleSelectCategory(c.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIconBoxSmall, { backgroundColor: c.bg }]}>
                    <IconComp size={15} color={c.color} />
                  </View>
                  <Text numberOfLines={1} style={[styles.catCardLabelCompact, isSelected && styles.catCardLabelCompactSelected]}>
                    {c.label}
                  </Text>
                  {isSelected && <Check size={13} color="#0D7A53" strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedCategory === "OTHER" && (
          <View style={{ marginTop: 8 }}>
            <ModernTextField
              label="Spesifikasi Kategori Anda"
              required
              value={roleData.customCategory || ""}
              onChangeText={(val) => updateRoleData("customCategory", val)}
              placeholder="Contoh: Toko ATK / Alat Tulis"
              icon={<Package size={16} color={authColors.primary} />}
            />
          </View>
        )}
      </View>

      {/* 3. Informasi Outlet */}
      <View style={styles.simpleSection}>
        <Text style={styles.simpleSectionTitle}>3. Informasi Outlet *</Text>

        <ModernTextField
          label="Nama Toko / Outlet"
          required
          value={roleData.outletName || roleData.businessName || ""}
          onChangeText={handleNameChange}
          placeholder="Contoh: Toko Berkah / Alfamart Kamojang"
          icon={<Store size={16} color="#0D7A53" />}
        />

        <ModernTextField
          label="Nomor WhatsApp Usaha"
          required
          value={roleData.businessPhone || defaultPhone || ""}
          onChangeText={(val) => updateRoleData("businessPhone", val)}
          placeholder="081234567890"
          keyboardType="phone-pad"
          icon={<Phone size={16} color="#0D7A53" />}
        />

        <ModernTextField
          label="Alamat Lengkap Outlet"
          required
          value={roleData.businessAddress || ""}
          onChangeText={(value) => {
            updateRoleData("businessAddress", value);
            const lower = value.toLowerCase();
            if (lower.includes("cipanas") || lower.includes("tarogong")) {
              updateRoleData("latitude", "-7.1852");
              updateRoleData("longitude", "107.8765");
            } else if (lower.includes("kamojang") || lower.includes("samarang")) {
              updateRoleData("latitude", "-7.2145");
              updateRoleData("longitude", "107.7982");
            } else if (lower.includes("garut kota")) {
              updateRoleData("latitude", "-7.2278");
              updateRoleData("longitude", "107.9087");
            }
          }}
          placeholder="Jalan, nomor, kelurahan, kecamatan, kota"
          multiline
          icon={<MapPin size={16} color="#0D7A53" />}
        />

        {/* Quick Area Chips */}
        <View style={styles.quickAreaWrapper}>
          <Text style={styles.quickAreaLabel}>Pilih Wilayah Cepat:</Text>
          <View style={styles.quickAreaRow}>
            {[
              { label: "Tarogong", address: "Jl. Raya Cipanas, Tarogong Kaler, Garut", lat: "-7.1852", lng: "107.8765" },
              { label: "Kamojang", address: "Jl. Raya Kamojang, Samarang, Garut", lat: "-7.2145", lng: "107.7982" },
              { label: "Garut Kota", address: "Pusat Kota Garut, Jawa Barat", lat: "-7.2278", lng: "107.9087" },
            ].map((area, idx) => {
              const isCurrent = roleData.latitude === area.lat;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.quickAreaPill, isCurrent && styles.quickAreaPillActive]}
                  onPress={() => {
                    if (!roleData.businessAddress) {
                      updateRoleData("businessAddress", area.address);
                    }
                    updateRoleData("latitude", area.lat);
                    updateRoleData("longitude", area.lng);
                  }}
                  activeOpacity={0.8}
                >
                  <MapPin size={11} color={isCurrent ? "#0D7A53" : "#64748B"} />
                  <Text style={[styles.quickAreaPillText, isCurrent && styles.quickAreaPillTextActive]}>
                    {area.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Jam Operasional */}
        <View style={styles.hoursRowCompact}>
          <View style={{ flex: 1 }}>
            <ModernTextField
              label="Jam Buka"
              value={roleData.openTime || "07:00"}
              onChangeText={(val) => updateRoleData("openTime", val)}
              placeholder="07:00"
              icon={<Clock size={15} color="#0D7A53" />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ModernTextField
              label="Jam Tutup"
              value={roleData.closeTime || "22:00"}
              onChangeText={(val) => updateRoleData("closeTime", val)}
              placeholder="22:00"
              icon={<Clock size={15} color="#0D7A53" />}
            />
          </View>
        </View>

        {/* Deskripsi Usaha */}
        <ModernTextField
          label="Deskripsi Singkat Usaha"
          optional
          value={roleData.businessDescription || ""}
          onChangeText={(val) => updateRoleData("businessDescription", val)}
          placeholder="Contoh: Menyediakan sembako, minuman dingin, dan kebutuhan harian."
          multiline
        />

        {/* Subtle GPS coordinates toggle */}
        <TouchableOpacity
          style={styles.gpsSubtleToggle}
          onPress={() => setShowManualGps(!showManualGps)}
          activeOpacity={0.7}
        >
          <Compass size={14} color="#0D7A53" />
          <Text style={styles.gpsSubtleText}>
            GPS: {roleData.latitude || "-7.1475"}, {roleData.longitude || "107.8015"} • {showManualGps ? "Tutup" : "Atur Manual"}
          </Text>
        </TouchableOpacity>

        {showManualGps && (
          <View style={styles.gpsManualRow}>
            <View style={{ flex: 1 }}>
              <ModernTextField
                label="Latitude"
                value={roleData.latitude || "-7.1475"}
                onChangeText={(val) => updateRoleData("latitude", val)}
                placeholder="-7.1475"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <ModernTextField
                label="Longitude"
                value={roleData.longitude || "107.8015"}
                onChangeText={(val) => updateRoleData("longitude", val)}
                placeholder="107.8015"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Data Apoteker jika Pharmacy */}
        {isPharmacy && (
          <View style={styles.pharmacyBoxSimple}>
            <View style={styles.simpleHeaderRow}>
              <Text style={[styles.simpleSectionTitle, { color: "#0284C7" }]}>Penanggung Jawab Apotek *</Text>
              <View style={[styles.activePillSmall, { backgroundColor: "#E0F2FE" }]}>
                <Text style={[styles.activePillSmallText, { color: "#0284C7" }]}>Farmasi</Text>
              </View>
            </View>
            <ModernTextField
              label="Nama Apoteker"
              required
              value={roleData.pharmacistName || ""}
              onChangeText={(val) => updateRoleData("pharmacistName", val)}
              placeholder="apt. Nama Lengkap, S.Farm."
              icon={<UserRound size={16} color="#0284C7" />}
            />
            <ModernTextField
              label="Nomor SIPA / SIPTTK"
              required
              value={roleData.pharmacistSipa || ""}
              onChangeText={(val) => updateRoleData("pharmacistSipa", val)}
              placeholder="Contoh: 19850101/SIPA_32.05/2024/2001"
              icon={<FileText size={16} color="#0284C7" />}
            />
          </View>
        )}
      </View>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* STEP 2: DOKUMEN PERSYARATAN                                                */
/* -------------------------------------------------------------------------- */
const DocumentsStep: React.FC<{
  role: AuthRegistrationRole;
  requirements: ReturnType<typeof getDocumentRequirements>;
  documents: RegistrationForm["documents"];
  setDocument: (key: string, document?: RegistrationForm["documents"][string]) => void;
}> = ({ role, requirements, documents, setDocument }) => {
  const requiredCount = requirements.filter((item) => item.required).length;
  const uploadedCount = requirements.filter((item) => item.required && documents[item.key]).length;

  const renderClientGuidance = () => {
    if (role === "driver") {
      return (
        <View style={styles.clientGuidanceBox}>
          <Info size={16} color={authColors.primary} />
          <Text style={styles.clientGuidanceText}>
            <Text style={{ fontWeight: "700" }}>Kebijakan Verifikasi Driver:</Text> Calon mitra cukup mengunggah <Text style={{ fontWeight: "700" }}>KTP, SIM C/A Aktif, STNK, dan Foto Kendaraan</Text>. Dokumen SKCK diatur <Text style={{ fontWeight: "700" }}>Opsional</Text> agar pendaftaran awal driver tidak terhambat.
          </Text>
        </View>
      );
    }
    if (role === "pemilik_catering" || role === "pemilik_laundry" || role === "pemilik_marketplace") {
      return (
        <View style={styles.clientGuidanceBox}>
          <Info size={16} color={authColors.primary} />
          <Text style={styles.clientGuidanceText}>
            <Text style={{ fontWeight: "700" }}>Kebijakan Mitra UMKM / Marketplace:</Text> Calon mitra cukup mengunggah <Text style={{ fontWeight: "700" }}>KTP Pemilik dan Foto Produk / Toko</Text>. Pendaftaran sangat simpel dan praktis agar UMKM binaan lokal dapat langsung berjualan di Kanyaah Mart.
          </Text>
        </View>
      );
    }
    if (role === "pemilik_kos") {
      return (
        <View style={styles.clientGuidanceBox}>
          <Info size={16} color={authColors.primary} />
          <Text style={styles.clientGuidanceText}>
            <Text style={{ fontWeight: "700" }}>Kebijakan Homestay & Kos:</Text> Calon mitra wajib melampirkan <Text style={{ fontWeight: "700" }}>KTP Pemilik/Pengelola, Bukti Kepemilikan/Pengelolaan Properti, Foto Kamar, dan Foto Fasilitas</Text> untuk persetujuan (ACC) admin.
          </Text>
        </View>
      );
    }
    if (role === "bank_sampah") {
      return (
        <View style={styles.clientGuidanceBox}>
          <Info size={16} color={authColors.primary} />
          <Text style={styles.clientGuidanceText}>
            <Text style={{ fontWeight: "700" }}>Sistem Bank Sampah & Poin:</Text> Driver membawa sampah anorganik terpilah → ditimbang sesuai harga pasar pengepul → nominal langsung masuk saldo aplikasi. Nilai reward komunitas terkonversi otomatis: <Text style={{ fontWeight: "700" }}>Rp 1.000 = 10 Poin GEOVERSE</Text>.
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.stepContainer}>
      <SectionHeading
        icon={<ShieldCheck size={18} color={authColors.primary} />}
        title="Dokumen Persyaratan Mitra"
        text="Unggah dokumen resmi untuk ditinjau oleh Admin. Pastikan foto terbaca jelas dan tidak blur."
      />

      <View style={styles.documentProgressRow}>
        <View style={styles.documentCountBadge}>
          <Text style={styles.documentCountText}>
            {uploadedCount} dari {requiredCount} dokumen wajib siap
          </Text>
        </View>
      </View>

      {renderClientGuidance()}

      {requirements.length === 0 ? (
        <View style={styles.noDocument}>
          <CheckCircle2 size={24} color={authColors.primary} />
          <Text style={styles.noDocumentText}>Tidak ada dokumen wajib untuk akun ini.</Text>
        </View>
      ) : (
        requirements.map((requirement) => (
          <DocumentUploadCard
            key={requirement.key}
            documentKey={requirement.key}
            label={requirement.label}
            description={requirement.description}
            required={requirement.required}
            document={documents[requirement.key]}
            onChange={(document) => setDocument(requirement.key, document)}
          />
        ))
      )}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* REUSABLE UI PRIMITIVES                                                     */
/* -------------------------------------------------------------------------- */
const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({
  icon,
  title,
  text,
}) => (
  <View style={styles.sectionHeadingWrap}>
    <View style={styles.sectionHeadingIcon}>{icon}</View>
    <View style={styles.sectionHeadingContent}>
      <Text style={styles.sectionHeadingTitle}>{title}</Text>
      <Text style={styles.sectionHeadingDesc}>{text}</Text>
    </View>
  </View>
);

interface ModernFieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  hint?: string;
  error?: string;
}

const ModernTextField: React.FC<ModernFieldProps> = ({
  label,
  required,
  optional,
  icon,
  right,
  hint,
  error,
  multiline,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>
          {label}
          {required ? <Text style={styles.requiredStar}> *</Text> : null}
        </Text>
        {optional ? <Text style={styles.optionalBadge}>Opsional</Text> : null}
      </View>

      <View
        style={[
          styles.fieldShell,
          multiline && styles.multilineShell,
          focused && styles.fieldShellFocused,
          Boolean(error) && styles.fieldShellError,
        ]}
      >
        {icon ? (
          <View style={[styles.fieldIcon, multiline && styles.multilineIcon]}>
            {icon}
          </View>
        ) : null}

        <TextInput
          {...props}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.fieldInput, multiline && styles.multilineInput, style]}
          placeholderTextColor="#94A3B8"
        />

        {right ? <View style={styles.fieldRight}>{right}</View> : null}
      </View>

      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
};

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}> = ({ label, value, onChangeText, placeholder, hint, required = true }) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <ModernTextField
      label={label}
      required={required}
      icon={<LockKeyhole size={18} color={authColors.muted} />}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || "Minimal 8 karakter (huruf & angka)"}
      secureTextEntry={!showPassword}
      autoCapitalize="none"
      hint={hint}
      right={
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          {showPassword ? (
            <EyeOff size={18} color={authColors.muted} />
          ) : (
            <Eye size={18} color={authColors.muted} />
          )}
        </TouchableOpacity>
      }
    />
  );
};

/* -------------------------------------------------------------------------- */
/* STYLESHEET                                                                 */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: Platform.OS === "web" ? 28 : 18,
    paddingVertical: 26,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
      } as any,
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      },
    }),
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: authColors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  brandHeader: {
    alignItems: "flex-start",
    marginBottom: 14,
  },
  roleHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
    gap: 6,
  },
  roleHeaderIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  roleHeaderTitle: {
    color: authColors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  roleHeaderDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: authColors.primary,
  },
  roleHeaderBadge: {
    color: authColors.primaryHover,
    fontSize: 11,
    fontWeight: "600",
  },
  heading: {
    marginBottom: 8,
  },
  title: {
    color: authColors.ink,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  stepContainer: {
    width: "100%",
    marginTop: 10,
  },
  sectionHeadingWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionHeadingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadingContent: {
    flex: 1,
  },
  sectionHeadingTitle: {
    color: authColors.ink,
    fontSize: 14.5,
    fontWeight: "700",
  },
  sectionHeadingDesc: {
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  fieldWrap: {
    width: "100%",
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fieldLabel: {
    color: authColors.inkSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  requiredStar: {
    color: authColors.danger,
    fontWeight: "700",
  },
  optionalBadge: {
    color: authColors.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  fieldShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    width: "100%",
  },
  fieldShellFocused: {
    borderColor: authColors.primary,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(5, 150, 105, 0.12)",
      } as any,
    }),
  },
  fieldShellError: {
    borderColor: authColors.danger,
    backgroundColor: authColors.dangerBg,
  },
  fieldIcon: {
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRight: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldInput: {
    flex: 1,
    fontSize: 13.5,
    color: authColors.ink,
    paddingVertical: 10,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  multilineShell: {
    alignItems: "flex-start",
    minHeight: 76,
    paddingTop: 8,
  },
  multilineIcon: {
    marginTop: 4,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  fieldHint: {
    color: authColors.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  fieldErrorText: {
    color: authColors.danger,
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: "600",
  },
  googleNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  googleNoticeTitle: {
    color: authColors.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
  googleNoticeSub: {
    color: "#065F46",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  vehicleTypeSelector: {
    marginBottom: 14,
  },
  vehicleTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  vehicleTypeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  vehicleTypeCardSelected: {
    borderColor: authColors.primary,
    backgroundColor: authColors.primaryLight,
  },
  vehicleTypeCardLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: authColors.ink,
  },
  vehicleTypeCardLabelSelected: {
    color: authColors.primaryDark,
  },
  vehicleTypeCardDesc: {
    fontSize: 10.5,
    color: authColors.muted,
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: authColors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: authColors.primary,
  },
  categoryGrid: {
    gap: 9,
    marginTop: 6,
    marginBottom: 12,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 10,
  },
  categoryCardSelected: {
    borderColor: authColors.primary,
    backgroundColor: authColors.primaryLight,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: authColors.ink,
  },
  categoryLabelSelected: {
    color: authColors.primaryDark,
  },
  categorySub: {
    fontSize: 11,
    color: authColors.muted,
    marginTop: 2,
  },
  subTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  subTypeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  subTypeChipActive: {
    borderColor: authColors.primary,
    backgroundColor: authColors.primary,
  },
  subTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: authColors.inkSecondary,
  },
  subTypeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  areaChipsScroll: {
    flexDirection: "row",
    gap: 7,
    paddingVertical: 6,
    marginBottom: 10,
  },
  areaQuickChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  areaQuickChipActive: {
    backgroundColor: authColors.primaryLight,
    borderColor: authColors.primary,
  },
  areaQuickChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  areaQuickChipTextActive: {
    color: authColors.primaryDark,
    fontWeight: "700",
  },
  gpsCardWrapper: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  gpsCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: authColors.inkSecondary,
    marginBottom: 8,
  },
  gpsRowClean: {
    flexDirection: "row",
    gap: 10,
  },
  gpsInputCol: {
    flex: 1,
  },
  gpsMiniLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: authColors.muted,
    marginBottom: 3,
  },
  gpsInputBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12.5,
    color: authColors.ink,
    fontWeight: "600",
  },
  gpsHint: {
    fontSize: 11,
    color: authColors.muted,
    marginTop: 8,
    lineHeight: 15,
  },
  simpleSection: {
    marginTop: 12,
    width: "100%",
  },
  simpleSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: authColors.ink,
    marginBottom: 6,
  },
  simpleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  chipRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4,
  },
  compactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compactChipSelected: {
    backgroundColor: authColors.primaryLight,
    borderColor: authColors.primary,
  },
  compactChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  compactChipTextSelected: {
    color: authColors.primaryDark,
    fontWeight: "700",
  },
  chainCompactBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  chainBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chainBannerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#92400E",
  },
  chainPillGroup: {
    flexDirection: "row",
    gap: 6,
  },
  chainMiniPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  chainMiniPillActive: {
    backgroundColor: authColors.primary,
    borderColor: authColors.primary,
  },
  chainMiniPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#78350F",
  },
  chainMiniPillTextActive: {
    color: "#FFFFFF",
  },
  activePillSmall: {
    backgroundColor: authColors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  activePillSmallText: {
    fontSize: 10,
    fontWeight: "700",
    color: authColors.primaryDark,
  },
  catGrid2Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  catCardCompact: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  catCardCompactSelected: {
    borderColor: authColors.primary,
    backgroundColor: authColors.primaryLight,
  },
  catIconBoxSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catCardLabelCompact: {
    fontSize: 12,
    fontWeight: "700",
    color: authColors.ink,
    flex: 1,
  },
  catCardLabelCompactSelected: {
    color: authColors.primaryDark,
  },
  expandToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  expandToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: authColors.primary,
  },
  quickAreaWrapper: {
    marginTop: 6,
    marginBottom: 8,
  },
  quickAreaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: authColors.muted,
    marginBottom: 4,
  },
  quickAreaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  quickAreaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickAreaPillActive: {
    backgroundColor: authColors.primaryLight,
    borderColor: authColors.primary,
  },
  quickAreaPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  quickAreaPillTextActive: {
    color: authColors.primaryDark,
    fontWeight: "700",
  },
  hoursRowCompact: {
    flexDirection: "row",
    gap: 10,
  },
  gpsSubtleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  gpsSubtleText: {
    fontSize: 11,
    color: authColors.muted,
    fontWeight: "600",
  },
  gpsManualRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  pharmacyBoxSimple: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  documentProgressRow: {
    marginBottom: 10,
  },
  documentCountBadge: {
    alignSelf: "flex-start",
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  documentCountText: {
    color: authColors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  clientGuidanceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  clientGuidanceText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    lineHeight: 18,
  },
  noDocument: {
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.line,
    padding: 22,
    marginTop: 8,
  },
  noDocumentText: {
    color: authColors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: authColors.dangerBg,
    borderWidth: 1,
    borderColor: authColors.dangerBorder,
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
  },
  errorText: {
    color: authColors.danger,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
  },
  primaryCta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  loginSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  loginSwitchText: {
    color: authColors.muted,
    fontSize: 13,
  },
  loginSwitchLink: {
    color: authColors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  partnerFooterNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  partnerFooterNoteText: {
    flex: 1,
    color: authColors.muted,
    fontSize: 11.5,
    lineHeight: 17,
  },
});
