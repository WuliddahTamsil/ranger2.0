import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, ShieldCheck, UserRound } from "lucide-react-native";
import { Nav } from "../../types";
import { AuthRegistrationRole, RegistrationForm, ROLE_LABELS } from "./authTypes";
import { getDocumentRequirements, getMissingDocuments, validateBaseStep, validateRoleStep } from "./authValidation";
import { authColors, authStyles } from "./authStyles";
import { AuthStepper } from "./components/AuthStepper";
import { DocumentUploadCard } from "./components/DocumentUploadCard";

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

const inputConfig: Record<AuthRegistrationRole, Array<{ key: string; label: string; placeholder: string; multiline?: boolean }>> = {
  customer: [],
  driver: [
    { key: "plateNumber", label: "Plat nomor", placeholder: "Contoh: D 1234 RGR" },
    { key: "vehicleType", label: "Jenis kendaraan", placeholder: "Motor / Mobil" },
    { key: "vehicleBrand", label: "Merek kendaraan", placeholder: "Contoh: Honda Beat" },
    { key: "vehicleYear", label: "Tahun kendaraan", placeholder: "Contoh: 2022" },
  ],
  pemilik_marketplace: [
    { key: "businessName", label: "Nama toko / usaha", placeholder: "Contoh: UMKM Kamojang" },
    { key: "businessCategory", label: "Kategori usaha", placeholder: "Makanan, kerajinan, fashion..." },
    { key: "businessAddress", label: "Alamat toko / operasional", placeholder: "Alamat lengkap usaha", multiline: true },
    { key: "businessDescription", label: "Deskripsi usaha", placeholder: "Ceritakan singkat usaha kamu", multiline: true },
  ],
  pemilik_catering: [
    { key: "businessName", label: "Nama catering", placeholder: "Contoh: Dapur Nani" },
    { key: "businessAddress", label: "Alamat dapur", placeholder: "Alamat lengkap dapur", multiline: true },
    { key: "businessType", label: "Jenis catering", placeholder: "Nasi box / prasmanan / snack box" },
    { key: "menuSpecialty", label: "Menu andalan", placeholder: "Contoh: masakan Sunda" },
  ],
  pemilik_laundry: [
    { key: "businessName", label: "Nama laundry", placeholder: "Contoh: Bersih Laundry" },
    { key: "businessAddress", label: "Alamat outlet", placeholder: "Alamat lengkap outlet", multiline: true },
    { key: "serviceType", label: "Jenis layanan", placeholder: "Kiloan / satuan / express" },
    { key: "operatingHours", label: "Jam operasional", placeholder: "Contoh: 08.00 - 20.00" },
  ],
  pemilik_kos: [
    { key: "businessName", label: "Nama kos", placeholder: "Contoh: Kos Putri Melati" },
    { key: "businessAddress", label: "Alamat properti kos", placeholder: "Alamat lengkap kos", multiline: true },
    { key: "propertyType", label: "Tipe kos", placeholder: "Putri / Putra / Campur" },
    { key: "roomCount", label: "Jumlah kamar", placeholder: "Contoh: 10 kamar" },
  ],
};

export const RegisterFlowScreen: React.FC<Props> = ({ navigate, role, initialEmail, initialName, googleRegistration, onSubmit }) => {
  const [form, setForm] = useState<RegistrationForm>(() => emptyForm(initialEmail, initialName));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requirements = useMemo(() => getDocumentRequirements(role), [role]);
  const labels = ["Akun", role === "customer" ? "Profil" : "Data", "Dokumen", "Review"];

  const update = (key: keyof RegistrationForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateRoleData = (key: string, value: string) => setForm((current) => ({ ...current, roleData: { ...current.roleData, [key]: value } }));

  const next = async () => {
    setError("");
    if (step === 0) {
      const validation = validateBaseStep(form, { allowPasswordless: googleRegistration });
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
    if (step < 3) { setStep((current) => current + 1); return; }
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
    <SafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={back} style={styles.back}><ArrowLeft size={17} color={authColors.primary} /><Text style={styles.backText}>Kembali</Text></TouchableOpacity>
          <Text style={authStyles.brand}>Registrasi {ROLE_LABELS[role]}</Text>
          <Text style={authStyles.title}>Lengkapi data akun</Text>
          <Text style={authStyles.subtitle}>Data yang bertanda bintang wajib diisi. Kamu bisa mengganti dokumen sebelum mengirim pendaftaran.</Text>
          <AuthStepper current={step} labels={labels} />

          {step === 0 && <BaseStep form={form} update={update} googleRegistration={googleRegistration} setProfilePhoto={(document) => setForm((current) => ({ ...current, profilePhoto: document }))} />}
          {step === 1 && <RoleStep role={role} roleData={form.roleData} updateRoleData={updateRoleData} />}
          {step === 2 && <DocumentsStep role={role} requirements={requirements} documents={form.documents} setDocument={(key, document) => setForm((current) => { const documents = { ...current.documents }; if (document) documents[key] = document; else delete documents[key]; return { ...current, documents }; })} />}
          {step === 3 && <ReviewStep form={form} role={role} requirements={requirements} />}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity onPress={() => void next()} disabled={loading} style={[authStyles.primaryButton, styles.next]} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={authStyles.primaryButtonText}>{step === 3 ? "Kirim pendaftaran" : "Lanjutkan"}</Text>{step === 3 ? <ShieldCheck size={18} color="#FFFFFF" /> : <ArrowRight size={18} color="#FFFFFF" />}</>}
          </TouchableOpacity>
          {step === 3 && <Text style={styles.submitHint}>Dengan mengirim, kamu menyetujui verifikasi data dan dokumen oleh admin The Ranger.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const BaseStep: React.FC<{ form: RegistrationForm; update: (key: keyof RegistrationForm, value: string) => void; googleRegistration?: boolean; setProfilePhoto: (document?: RegistrationForm["profilePhoto"]) => void }> = ({ form, update, googleRegistration, setProfilePhoto }) => (
  <View style={authStyles.card}>
    <SectionHeading icon={<UserRound size={18} color={authColors.primary} />} title="Informasi dasar" text="Gunakan data yang sesuai dengan identitas resmi." />
    <TextField label="Nama lengkap *" value={form.name} onChangeText={(value) => update("name", value)} placeholder="Nama sesuai identitas" />
    <TextField label="Email *" value={form.email} onChangeText={(value) => update("email", value)} placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" />
    <TextField label="Nomor WhatsApp *" value={form.phone} onChangeText={(value) => update("phone", value)} placeholder="08xx-xxxx-xxxx" keyboardType="phone-pad" />
    {googleRegistration ? <View style={styles.googleNotice}><ShieldCheck size={17} color={authColors.primary} /><Text style={styles.googleNoticeText}>Akun ini menggunakan keamanan Google. Password The Ranger tidak perlu dibuat lagi.</Text></View> : <><TextField label="Password *" value={form.password} onChangeText={(value) => update("password", value)} placeholder="Minimal 8 karakter, huruf + angka" secureTextEntry /><TextField label="Konfirmasi password *" value={form.passwordConfirmation} onChangeText={(value) => update("passwordConfirmation", value)} placeholder="Ulangi password" secureTextEntry /></>}
    <TextField label="Alamat lengkap *" value={form.address} onChangeText={(value) => update("address", value)} placeholder="Alamat rumah / domisili" multiline icon={<MapPin size={17} color="#6B7280" />} />
    <Text style={styles.photoLabel}>Foto profil <Text style={styles.optional}>Opsional</Text></Text>
    <DocumentUploadCard documentKey="profile_photo" label="Foto profil" description="Tambahkan foto agar mitra/customer lebih mudah dikenali." document={form.profilePhoto} onChange={setProfilePhoto} compact />
  </View>
);

const RoleStep: React.FC<{ role: AuthRegistrationRole; roleData: Record<string, string>; updateRoleData: (key: string, value: string) => void }> = ({ role, roleData, updateRoleData }) => (
  <View style={authStyles.card}>
    <SectionHeading icon={<ShieldCheck size={18} color={authColors.primary} />} title={role === "driver" ? "Data kendaraan" : role === "pemilik_kos" ? "Data properti kos" : "Data usaha"} text={role === "driver" ? "Pastikan data kendaraan sama dengan dokumen yang diunggah." : role === "pemilik_kos" ? "Data properti akan tampil setelah pendaftaran disetujui admin." : "Data ini akan tampil pada profil usaha setelah disetujui."} />
    {inputConfig[role].map((field) => <TextField key={field.key} label={`${field.label}${["businessDescription", "menuSpecialty", "operatingHours"].includes(field.key) ? "" : " *"}`} value={roleData[field.key] || ""} onChangeText={(value) => updateRoleData(field.key, value)} placeholder={field.placeholder} multiline={field.multiline} />)}
  </View>
);

const DocumentsStep: React.FC<{ role: AuthRegistrationRole; requirements: ReturnType<typeof getDocumentRequirements>; documents: RegistrationForm["documents"]; setDocument: (key: string, document?: RegistrationForm["documents"][string]) => void }> = ({ role, requirements, documents, setDocument }) => (
  <View>
    <View style={styles.documentIntro}><Text style={styles.documentTitle}>Verifikasi dokumen</Text><Text style={styles.documentText}>{role === "customer" ? "Customer tidak memerlukan dokumen verifikasi. Lanjutkan ke review." : "Unggah dokumen yang jelas dan tidak terpotong. Admin akan memeriksa satu per satu."}</Text></View>
    {requirements.length === 0 ? <View style={styles.noDocument}><CheckCircle2 size={24} color={authColors.primary} /><Text style={styles.noDocumentText}>Tidak ada dokumen wajib untuk akun Customer.</Text></View> : requirements.map((requirement) => <DocumentUploadCard key={requirement.key} documentKey={requirement.key} label={requirement.label} description={requirement.description} required={requirement.required} document={documents[requirement.key]} onChange={(document) => setDocument(requirement.key, document)} />)}
  </View>
);

const ReviewStep: React.FC<{ form: RegistrationForm; role: AuthRegistrationRole; requirements: ReturnType<typeof getDocumentRequirements> }> = ({ form, role, requirements }) => (
  <View>
    <View style={styles.reviewBanner}><ShieldCheck size={20} color={authColors.primary} /><View style={styles.reviewBannerText}><Text style={styles.reviewBannerTitle}>Siap dikirim untuk verifikasi</Text><Text style={styles.reviewBannerDesc}>Periksa kembali data sebelum pendaftaran diproses.</Text></View></View>
    <ReviewCard title="Akun utama"><ReviewRow label="Nama" value={form.name} /><ReviewRow label="Email" value={form.email} /><ReviewRow label="WhatsApp" value={form.phone} /><ReviewRow label="Alamat" value={form.address} /></ReviewCard>
    {role !== "customer" && <ReviewCard title="Data peran">{Object.entries(form.roleData).filter(([, value]) => value).map(([key, value]) => <ReviewRow key={key} label={key.replace(/([A-Z])/g, " $1")} value={value} />)}</ReviewCard>}
    <ReviewCard title="Dokumen"><ReviewRow label="Dokumen terunggah" value={`${Object.keys(form.documents).length} dari ${requirements.filter((item) => item.required).length} wajib`} /><ReviewRow label="Status awal" value={role === "customer" ? "Terverifikasi" : "Menunggu Verifikasi"} /></ReviewCard>
  </View>
);

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => <View style={styles.sectionHeading}><View style={styles.sectionIcon}>{icon}</View><View style={styles.sectionText}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDescription}>{text}</Text></View></View>;

const TextField: React.FC<React.ComponentProps<typeof TextInput> & { label: string; icon?: React.ReactNode }> = ({ label, icon, multiline, style, ...props }) => <View style={styles.field}><Text style={authStyles.label}>{label}</Text><View style={[styles.textFieldShell, multiline && styles.multilineShell]}>{icon}{<TextInput {...props} multiline={multiline} style={[authStyles.input, styles.textInput, multiline && styles.multiline, style]} placeholderTextColor="#9CA3AF" />}</View></View>;

const ReviewCard: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => <View style={styles.reviewCard}><Text style={styles.reviewCardTitle}>{title}</Text>{children}</View>;
const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value || "-"}</Text></View>;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, marginBottom: 20 },
  backText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  field: { marginTop: 14 },
  textFieldShell: { flexDirection: "row", alignItems: "center", gap: 7 },
  textInput: { flex: 1 },
  multilineShell: { alignItems: "flex-start" },
  multiline: { minHeight: 82, paddingTop: 13, textAlignVertical: "top" },
  optional: { color: "#6B7280", fontWeight: "500", fontSize: 11 },
  photoLabel: { color: "#374151", fontSize: 13, fontWeight: "700", marginTop: 18, marginBottom: -4 },
  sectionHeading: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sectionText: { flex: 1 },
  sectionTitle: { color: authColors.ink, fontSize: 16, fontWeight: "800" },
  sectionDescription: { color: authColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  googleNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: authColors.mint, padding: 11, borderRadius: 11, marginTop: 14 },
  googleNoticeText: { flex: 1, color: authColors.primaryDark, fontSize: 12, lineHeight: 17 },
  documentIntro: { backgroundColor: authColors.mint, borderRadius: 14, padding: 14 },
  documentTitle: { color: authColors.primaryDark, fontSize: 15, fontWeight: "800" },
  documentText: { color: authColors.primaryDark, fontSize: 12, lineHeight: 18, marginTop: 4 },
  noDocument: { alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: authColors.line, padding: 22, marginTop: 12 },
  noDocumentText: { color: authColors.primaryDark, fontSize: 13, fontWeight: "700", textAlign: "center" },
  reviewBanner: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: authColors.mint, padding: 14, borderRadius: 14 },
  reviewBannerText: { flex: 1 },
  reviewBannerTitle: { color: authColors.primaryDark, fontWeight: "800", fontSize: 14 },
  reviewBannerDesc: { color: authColors.primaryDark, fontSize: 12, marginTop: 3 },
  reviewCard: { backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: authColors.line, padding: 14, marginTop: 12 },
  reviewCardTitle: { color: authColors.ink, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  reviewRow: { flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  reviewLabel: { width: 105, color: authColors.muted, fontSize: 12, textTransform: "capitalize" },
  reviewValue: { flex: 1, color: authColors.ink, fontSize: 12, fontWeight: "700" },
  error: { color: authColors.danger, backgroundColor: authColors.dangerBg, borderRadius: 10, padding: 11, marginTop: 14, fontSize: 13, lineHeight: 18 },
  next: { flexDirection: "row", gap: 8, marginTop: 18 },
  submitHint: { color: "#9CA3AF", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 10 },
});
