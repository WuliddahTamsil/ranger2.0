import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, ShieldCheck, UserRound } from "lucide-react-native";
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

const inputConfig: Record<AuthRegistrationRole, Array<{ key: string; label: string; placeholder: string; multiline?: boolean; required?: boolean }>> = {
  customer: [],
  driver: [
    { key: "plateNumber", label: "Plat nomor", placeholder: "Contoh: D 1234 RGR" },
    { key: "vehicleType", label: "Jenis kendaraan", placeholder: "Motor / Mobil" },
    { key: "vehicleBrand", label: "Merek kendaraan", placeholder: "Contoh: Honda Beat", required: false },
  ],
  pemilik_marketplace: [
    { key: "businessName", label: "Nama toko / usaha", placeholder: "Contoh: UMKM Kamojang" },
    { key: "businessAddress", label: "Alamat toko / operasional", placeholder: "Alamat lengkap usaha", multiline: true },
    { key: "businessCategory", label: "Kategori usaha", placeholder: "Makanan, kerajinan, fashion...", required: false },
  ],
  pemilik_catering: [
    { key: "businessName", label: "Nama catering", placeholder: "Contoh: Dapur Nani" },
    { key: "businessAddress", label: "Alamat dapur", placeholder: "Alamat lengkap dapur", multiline: true },
    { key: "businessType", label: "Jenis catering", placeholder: "Nasi box / prasmanan / snack box", required: false },
  ],
  pemilik_laundry: [
    { key: "businessName", label: "Nama laundry", placeholder: "Contoh: Bersih Laundry" },
    { key: "businessAddress", label: "Alamat outlet", placeholder: "Alamat lengkap outlet", multiline: true },
    { key: "serviceType", label: "Jenis layanan", placeholder: "Kiloan / satuan / express", required: false },
  ],
  pemilik_kos: [
    { key: "businessName", label: "Nama kos", placeholder: "Contoh: Kos Putri Melati" },
    { key: "businessAddress", label: "Alamat properti kos", placeholder: "Alamat lengkap kos", multiline: true },
    { key: "propertyType", label: "Tipe kos", placeholder: "Putri / Putra / Campur", required: false },
  ],
  bank_sampah: [
    { key: "businessName", label: "Nama Unit Bank Sampah", placeholder: "Contoh: Bank Sampah Bersih Kamojang" },
    { key: "businessAddress", label: "Alamat Lengkap Unit", placeholder: "Alamat operasional unit bank sampah", multiline: true },
  ],
};

export const RegisterFlowScreen: React.FC<Props> = ({ navigate, role, initialEmail, initialName, googleRegistration, onSubmit }) => {
  const [form, setForm] = useState<RegistrationForm>(() => emptyForm(initialEmail, initialName));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requirements = useMemo(() => getDocumentRequirements(role), [role]);
  const isCustomer = role === "customer";
  const labels = isCustomer ? ["Akun"] : ["Akun", "Profil", "Dokumen"];

  const update = (key: keyof RegistrationForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateRoleData = (key: string, value: string) => setForm((current) => ({ ...current, roleData: { ...current.roleData, [key]: value } }));

  const next = async () => {
    setError("");
    if (step === 0) {
      const validation = validateBaseStep(form, { allowPasswordless: googleRegistration, customer: isCustomer });
      if (validation) { setError(validation); return; }
    }
    if (step === 1) {
      const validation = validateRoleStep(role, form.roleData);
      if (validation) { setError(validation); return; }
    }
    if (step === 2) {
      const missing = getMissingDocuments(role, form.documents);
      if (missing.length) { setError(`Dokumen wajib belum lengkap: ${missing.join(", ")}.`); return; }
    }
    if (step < labels.length - 1) { setStep((current) => current + 1); return; }
    setLoading(true);
    try {
      const result = await onSubmit(form);
      if (!result.ok) setError(result.error || "Registrasi belum dapat disimpan.");
    } catch {
      setError("Registrasi belum dapat disimpan. Periksa koneksi dan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    setError("");
    if (step === 0) navigate("auth_register_role"); else setStep((current) => current - 1);
  };

  return (
    <ResponsiveSafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
          <TouchableOpacity onPress={back} style={styles.back}><ArrowLeft size={17} color={authColors.primary} /><Text style={styles.backText}>Kembali</Text></TouchableOpacity>
          <AuthBrand />
          <Text style={styles.contextLabelClean}>REGISTRASI / {ROLE_LABELS[role].toUpperCase()}</Text>
          <Text style={authStyles.title}>{isCustomer ? "Buat akun" : "Daftar sebagai mitra"}</Text>
          <Text style={authStyles.subtitle}>{isCustomer ? "Isi data singkat untuk mulai menggunakan GEOVERSE." : "Tiga langkah singkat. Siapkan data utama dan dokumen dasar usaha kamu."}</Text>
          <AuthStepper current={step} labels={labels} />

          {step === 0 && <BaseStep form={form} update={update} customer={isCustomer} googleRegistration={googleRegistration} />}
          {!isCustomer && step === 1 && <RoleStep role={role} roleData={form.roleData} updateRoleData={updateRoleData} />}
          {!isCustomer && step === 2 && <DocumentsStep role={role} requirements={requirements} documents={form.documents} setDocument={(key, document) => setForm((current) => { const documents = { ...current.documents }; if (document) documents[key] = document; else delete documents[key]; return { ...current, documents }; })} />}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity onPress={() => void next()} disabled={loading} style={[authStyles.primaryButton, styles.next]} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={authStyles.primaryButtonText}>{!isCustomer && step === 2 ? "Kirim pendaftaran" : isCustomer ? "Buat akun" : "Lanjutkan"}</Text>{!isCustomer && step === 2 ? <ShieldCheck size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}</>}
          </TouchableOpacity>
          {!isCustomer && step === 2 && <Text style={styles.submitHint}>Setelah dikirim, admin akan memeriksa data kamu. Tidak perlu menyiapkan dokumen tambahan sekarang.</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveSafeAreaView>
  );
};

const BaseStep: React.FC<{ form: RegistrationForm; update: (key: keyof RegistrationForm, value: string) => void; customer: boolean; googleRegistration?: boolean }> = ({ form, update, customer, googleRegistration }) => (
  <View style={authStyles.card}>
    <SectionHeading icon={<UserRound size={18} color={authColors.primary} />} title={customer ? "Data akun" : "Data pribadi"} text={customer ? "Masukkan data utama untuk mulai menggunakan layanan GEOVERSE." : "Gunakan nama dan nomor yang mudah dihubungi."} />
    <TextField label="Nama lengkap *" value={form.name} onChangeText={(value) => update("name", value)} placeholder="Nama sesuai identitas" />
    <TextField label="Email *" value={form.email} onChangeText={(value) => update("email", value)} placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" />
    <TextField label={customer ? "Nomor HP *" : "Nomor WhatsApp *"} value={form.phone} onChangeText={(value) => update("phone", value)} placeholder="08xx-xxxx-xxxx" keyboardType="phone-pad" />
    {googleRegistration ? <View style={styles.googleNotice}><ShieldCheck size={17} color={authColors.primary} /><Text style={styles.googleNoticeText}>Akun ini menggunakan keamanan Google. Password GEOVERSE 2.0 tidak perlu dibuat lagi.</Text></View> : <><TextField label="Password *" value={form.password} onChangeText={(value) => update("password", value)} placeholder="Minimal 8 karakter, huruf + angka" secureTextEntry /><TextField label="Konfirmasi password *" value={form.passwordConfirmation} onChangeText={(value) => update("passwordConfirmation", value)} placeholder="Ulangi password" secureTextEntry /></>}
    {!customer && <TextField label="Alamat domisili *" value={form.address} onChangeText={(value) => update("address", value)} placeholder="Alamat rumah / domisili" multiline icon={<MapPin size={17} color="#6B7280" />} />}
  </View>
);

const RoleStep: React.FC<{ role: AuthRegistrationRole; roleData: Record<string, string>; updateRoleData: (key: string, value: string) => void }> = ({ role, roleData, updateRoleData }) => {
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
      if (updated.length === 0) updated = [catId]; // Minimal 1 kategori terpilih
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
      <View style={authStyles.card}>
        <SectionHeading
          icon={<ShieldCheck size={18} color={authColors.primary} />}
          title="Data Usaha Kanyaah Homestay"
          text="Pilih jenis usaha yang Anda miliki (bisa pilih salah satu atau kombinasi/ketiganya)."
        />

        {/* Pilihan Bentuk Usaha (Multi-select / Single-select) */}
        <Text style={[authStyles.label, { marginTop: 14 }]}>
          Jenis Usaha yang Dikelola * <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "normal" }}>(Bisa pilih lebih dari 1)</Text>
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

        {/* Jika tipe Kost aktif: Sub-opsi Putri / Putra / Campur */}
        {selectedCategories.includes("kost") && (
          <View style={{ marginTop: 12 }}>
            <Text style={authStyles.label}>Tipe Penghuni Kost *</Text>
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

        {/* Input Nama Usaha */}
        <TextField
          label="Nama Usaha / Properti *"
          value={roleData.businessName || ""}
          onChangeText={(value) => updateRoleData("businessName", value)}
          placeholder={
            selectedCategories.includes("wisata")
              ? "Contoh: Taman Wisata Air Sabda Alam"
              : selectedCategories.includes("hotel")
              ? "Contoh: Kamojang Green Resort & Villa"
              : "Contoh: Ais Kost Putri Exclusive"
          }
        />

        {/* Input Alamat Lengkap */}
        <TextField
          label="Alamat Lengkap Properti *"
          value={roleData.businessAddress || ""}
          onChangeText={(value) => {
            updateRoleData("businessAddress", value);
            // Smart auto-fill GPS coordinates based on address keywords
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
            } else if (lower.includes("garut kota") || lower.includes("pemberhentian")) {
              updateRoleData("latitude", "-7.2278");
              updateRoleData("longitude", "107.9087");
            }
          }}
          placeholder="Jalan, No, RT/RW, Kelurahan, Kecamatan, Garut"
          multiline
          icon={<MapPin size={17} color="#6B7280" />}
        />

        {/* Quick Area Mapping Chips */}
        <Text style={[authStyles.label, { marginTop: 12 }]}>Pilih Lokasi Cepat di Peta / Wilayah Garut</Text>
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
              <Text style={[styles.areaQuickChipText, roleData.latitude === area.lat && styles.areaQuickChipTextActive]}>
                {area.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Koordinat GPS Card (Clean, Non-overflowing) */}
        <View style={styles.gpsCardWrapper}>
          <Text style={styles.gpsCardTitle}>Titik Koordinat Terpilih (Otomatis dari Peta / Alamat):</Text>
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
        </View>
        <Text style={styles.gpsHint}>
          💡 Koordinat GPS digunakan agar pelanggan dapat melihat jarak presisi (km) ke lokasi properti Anda di peta.
        </Text>
      </View>
    );
  }

  return (
    <View style={authStyles.card}>
      <SectionHeading
        icon={<ShieldCheck size={18} color={authColors.primary} />}
        title={role === "driver" ? "Data kendaraan" : "Data usaha"}
        text={role === "driver" ? "Cukup isi data kendaraan yang digunakan." : "Isi informasi dasar yang akan tampil di profil usaha."}
      />
      {inputConfig[role].map((field) => (
        <TextField
          key={field.key}
          label={`${field.label}${field.required === false ? " (opsional)" : " *"}`}
          value={roleData[field.key] || ""}
          onChangeText={(value) => updateRoleData(field.key, value)}
          placeholder={field.placeholder}
          multiline={field.multiline}
        />
      ))}
    </View>
  );
};

const DocumentsStep: React.FC<{ role: AuthRegistrationRole; requirements: ReturnType<typeof getDocumentRequirements>; documents: RegistrationForm["documents"]; setDocument: (key: string, document?: RegistrationForm["documents"][string]) => void }> = ({ role, requirements, documents, setDocument }) => {
  const requiredCount = requirements.filter((item) => item.required).length;
  const uploadedCount = requirements.filter((item) => item.required && documents[item.key]).length;

  return (
    <View>
      <View style={styles.documentIntro}>
        <View style={styles.documentIntroTop}>
          <View style={styles.documentIntroIcon}><ShieldCheck size={17} color={authColors.primary} /></View>
          <View style={styles.documentIntroCopy}>
            <Text style={styles.documentTitle}>Dokumen dasar</Text>
            <Text style={styles.documentText}>Cukup unggah berkas yang tersedia. Pastikan foto terang dan seluruh bagian dokumen terlihat.</Text>
          </View>
        </View>
        <Text style={styles.documentCount}>{uploadedCount} dari {requiredCount} dokumen siap</Text>
      </View>
      {requirements.length === 0 ? <View style={styles.noDocument}><CheckCircle2 size={24} color={authColors.primary} /><Text style={styles.noDocumentText}>Tidak ada dokumen wajib untuk akun Customer.</Text></View> : requirements.map((requirement) => <DocumentUploadCard key={requirement.key} documentKey={requirement.key} label={requirement.label} description={requirement.description} required={requirement.required} document={documents[requirement.key]} onChange={(document) => setDocument(requirement.key, document)} />)}
      {role !== "customer" && <View style={styles.readyNote}><CheckCircle2 size={16} color={authColors.primary} /><Text style={styles.readyNoteText}>Setelah dikirim, pendaftaran akan masuk ke proses verifikasi admin.</Text></View>}
    </View>
  );
};

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => <View style={styles.sectionHeading}><View style={styles.sectionIcon}>{icon}</View><View style={styles.sectionText}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDescription}>{text}</Text></View></View>;

const TextField: React.FC<React.ComponentProps<typeof TextInput> & { label: string; icon?: React.ReactNode }> = ({ label, icon, multiline, style, ...props }) => <View style={styles.field}><Text style={authStyles.label}>{label}</Text><View style={[styles.textFieldShell, multiline && styles.multilineShell]}>{icon}{<TextInput {...props} multiline={multiline} style={[authStyles.input, styles.textInput, multiline && styles.multiline, style]} placeholderTextColor="#9CA3AF" />}</View></View>;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { width: "100%", maxWidth: 600, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E5E9EE", padding: 28, shadowColor: "#142238", shadowOpacity: 0.035, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, marginBottom: 20 },
  backText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  contextLabelClean: { color: authColors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.05, marginTop: 22 },
  field: { marginTop: 14 },
  textFieldShell: { flexDirection: "row", alignItems: "center", gap: 7 },
  textInput: { flex: 1 },
  multilineShell: { alignItems: "flex-start" },
  multiline: { minHeight: 82, paddingTop: 13, textAlignVertical: "top" },
  optional: { color: "#6B7280", fontWeight: "500", fontSize: 11 },
  sectionHeading: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sectionText: { flex: 1 },
  sectionTitle: { color: authColors.ink, fontSize: 16, fontWeight: "800" },
  sectionDescription: { color: authColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  googleNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: authColors.mint, padding: 11, borderRadius: 11, marginTop: 14 },
  googleNoticeText: { flex: 1, color: authColors.primaryDark, fontSize: 12, lineHeight: 17 },
  documentIntro: { backgroundColor: "#F6FAF8", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#DDEEE4" },
  documentIntroTop: { flexDirection: "row", alignItems: "flex-start" },
  documentIntroIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginRight: 9 },
  documentIntroCopy: { flex: 1 },
  documentTitle: { color: authColors.primaryDark, fontSize: 15, fontWeight: "800" },
  documentText: { color: authColors.primaryDark, fontSize: 12, lineHeight: 18, marginTop: 4 },
  documentCount: { color: authColors.primary, fontSize: 11, fontWeight: "800", marginTop: 11 },
  noDocument: { alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: authColors.line, padding: 22, marginTop: 12 },
  noDocumentText: { color: authColors.primaryDark, fontSize: 13, fontWeight: "700", textAlign: "center" },
  readyNote: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 16, paddingHorizontal: 2 },
  readyNoteText: { flex: 1, color: authColors.muted, fontSize: 11, lineHeight: 16 },
  error: { color: authColors.danger, backgroundColor: authColors.dangerBg, borderRadius: 10, padding: 11, marginTop: 14, fontSize: 13, lineHeight: 18 },
  next: { flexDirection: "row", gap: 8, marginTop: 18 },
  submitHint: { color: "#9CA3AF", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 10 },
  categoryGrid: { gap: 10, marginTop: 8 },
  categoryCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", gap: 10 },
  categoryCardSelected: { borderColor: "#0D7A53", backgroundColor: "#F0FDF4" },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  categoryLabelSelected: { color: "#0D7A53" },
  categorySub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  radioCircleSelected: { borderColor: "#0D7A53" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0D7A53" },
  subTypeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  subTypeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", alignItems: "center" },
  subTypeChipActive: { borderColor: "#0D7A53", backgroundColor: "#0D7A53" },
  subTypeText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  subTypeTextActive: { color: "#FFFFFF" },
  areaChipsScroll: { flexDirection: "row", gap: 8, paddingVertical: 6 },
  areaQuickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  areaQuickChipActive: {
    backgroundColor: "#E8F5EE",
    borderColor: "#0D7A53",
  },
  areaQuickChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#374151",
  },
  areaQuickChipTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  btnDetectLocation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  btnDetectLocationText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  gpsCardWrapper: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  gpsCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
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
    color: "#6B7280",
    marginBottom: 3,
  },
  gpsInputBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  gpsHint: { fontSize: 11, color: "#6B7280", marginTop: 8, lineHeight: 15 },
});
