import { AuthDocument, AuthDocumentRequirement, AuthRegistrationRole, RegistrationForm } from "./authTypes";
import * as Crypto from "expo-crypto";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

// Passwords are never stored in plain text. The production API should still
// perform server-side hashing, salting, rate limiting, and account recovery.
export const hashSecret = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);

export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
};

export const validateEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export const validatePassword = (value: string) =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

export const getDocumentRequirements = (
  role: AuthRegistrationRole,
  roleData?: Record<string, string>,
): AuthDocumentRequirement[] => {
  if (role === "driver") {
    return [
      { key: "ktp", label: "KTP", description: "Foto KTP asli yang jelas dan tidak terpotong.", required: true },
      { key: "sim", label: "SIM C/A Aktif", description: "SIM C atau A aktif sesuai jenis kendaraan yang digunakan.", required: true },
      { key: "stnk", label: "STNK Kendaraan", description: "Foto STNK kendaraan operasional yang masih berlaku.", required: true },
      { key: "vehicle_photo", label: "Foto Kendaraan", description: "Foto fisik kendaraan tampak depan lengkap dengan plat nomor.", required: true },
      {
        key: "skck",
        label: "SKCK (Opsional)",
        description: "Surat Keterangan Catatan Kepolisian (opsional / tidak wajib untuk pendaftaran awal).",
        required: false,
        isPendingConfirmation: false,
        pendingConfirmationNote: "Konfirmasi Client: Saat ini baru ada 1 driver yang memiliki SIM aktif. SKCK diatur opsional agar pendaftaran awal driver tidak terhambat.",
      },
    ];
  }

  if (role === "pemilik_marketplace") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas KTP pemilik usaha UMKM.", required: true },
      { key: "store_photo", label: "Foto Produk / Toko", description: "Foto produk unggulan atau tempat usaha.", required: true },
    ];
  }

  if (role === "pemilik_shop") {
    const category = String(roleData?.businessCategory || roleData?.storeType || "").toUpperCase();
    const brandType = String(roleData?.brandType || "").toUpperCase();
    const isOfficialPartnerRequested = roleData?.isOfficialPartnerRequested === "true" || roleData?.isOfficialBrandPartner === "true";

    const requirements: AuthDocumentRequirement[] = [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas KTP pemilik atau penanggung jawab usaha.", required: true },
      { key: "store_photo", label: "Foto Toko / Outlet", description: "Foto tampak depan outlet lengkap dengan papan nama toko.", required: true },
      {
        key: "business_license",
        label: "NIB / Izin Usaha (Opsional)",
        description: "Nomor Induk Berusaha (NIB) atau surat izin operasional perdagangan.",
        required: false,
        isPendingConfirmation: false,
        pendingConfirmationNote: "NIB opsional untuk pendaftaran awal toko perintis retail Kamojang.",
      },
    ];

    // Alfamart / Indomaret / Circle K / Official Partner authorization
    if (["ALFAMART", "INDOMARET", "CIRCLE_K"].includes(brandType) || isOfficialPartnerRequested) {
      requirements.push({
        key: "brand_authorization",
        label: "Surat Otorisasi / Perjanjian Franchise",
        description: "Dokumen kerja sama franchise atau bukti kepemilikan/izin brand resmi dari pemilik jaringan.",
        required: true,
      });
    }

    // Apotek specific documents (SIPA wajib sesuai requirement client, SIA & STRA dipertahankan)
    if (category === "PHARMACY") {
      requirements.push(
        {
          key: "pharmacist_sipa",
          label: "SIPA / SIPTTK Apoteker",
          description: "Surat Izin Praktik Apoteker penanggung jawab yang aktif (Wajib).",
          required: true,
        },
        {
          key: "pharmacy_license",
          label: "Surat Izin Apotek (SIA)",
          description: "Surat Izin Operasional Apotek (SIA) yang masih berlaku.",
          required: true,
        },
        {
          key: "pharmacist_identity",
          label: "KTP & STRA Apoteker",
          description: "Identitas KTP dan Surat Tanda Registrasi Apoteker (STRA) penanggung jawab.",
          required: true,
        }
      );
    }

    // Kosmetik conditional document
    if (category === "COSMETICS" || category === "BEAUTY") {
      requirements.push({
        key: "product_legal_document",
        label: "Notifikasi / Izin Edar BPOM",
        description: "Dokumen bukti legalitas atau notifikasi BPOM untuk produk kosmetik & skincare (opsional).",
        required: false,
      });
    }

    return requirements;
  }

  if (role === "pemilik_catering") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas KTP pemilik usaha catering.", required: true },
      { key: "kitchen_photo", label: "Foto Tempat Usaha / Dapur", description: "Foto area dapur atau fasilitas memasak yang representatif.", required: true },
      {
        key: "business_license",
        label: "NIB / Izin Usaha (Opsional)",
        description: "Nomor Induk Berusaha (opsional bagi mitra perintis binaan: Aisyah, Kiki, Dessy, Sari, Ema).",
        required: false,
        isPendingConfirmation: false,
        pendingConfirmationNote: "Konfirmasi Client: NIB opsional bagi UMKM catering perintis agar dapat langsung diverifikasi admin.",
      },
      {
        key: "halal_cert",
        label: "Sertifikat Halal (Opsional)",
        description: "Sertifikat halal BPJPH/MUI (opsional bagi UMKM kuliner lokal binaan).",
        required: false,
        isPendingConfirmation: false,
        pendingConfirmationNote: "Konfirmasi Client: Sertifikasi halal bersifat opsional dalam tahap verifikasi awal.",
      },
    ];
  }

  if (role === "pemilik_laundry") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas KTP pemilik usaha laundry.", required: true },
      { key: "store_photo", label: "Foto Tempat Usaha / Outlet", description: "Foto tampak depan outlet laundry dan area mesin cuci.", required: true },
      {
        key: "business_license",
        label: "NIB / Izin Usaha (Opsional)",
        description: "Nomor Induk Berusaha (opsional bagi mitra perintis: Siti Nurazizah, Gusni Santiana).",
        required: false,
        isPendingConfirmation: false,
        pendingConfirmationNote: "Konfirmasi Client: NIB opsional bagi perintis usaha laundry binaan.",
      },
      {
        key: "halal_cert",
        label: "Sertifikat Halal Deterjen / Laundry (Opsional)",
        description: "Sertifikasi halal operasional (opsional untuk pendaftaran awal).",
        required: false,
        isPendingConfirmation: false,
        pendingConfirmationNote: "Konfirmasi Client: Sertifikasi halal laundry bersifat opsional.",
      },
    ];
  }

  if (role === "pemilik_kos") {
    // Note: Wisata dan Homestay menggunakan requirement kepemilikan/pengelolaan properti yang sama (Client Assumption).
    const isWisata = String(roleData?.propertyCategory || roleData?.businessCategories || "").toLowerCase().includes("wisata");
    return [
      { key: "ktp", label: "KTP Pemilik / Pengelola", description: "Identitas KTP pemilik atau pengelola sah properti.", required: true },
      {
        key: "property_proof",
        label: isWisata ? "Bukti Kepemilikan / Pengelolaan Wisata" : "Bukti Kepemilikan / Pengelolaan Properti",
        description: "Sertifikat, AJB, PBB, atau surat kuasa pengelolaan properti yang sah.",
        required: true,
      },
      { key: "property_photo", label: "Foto Properti / Outlet", description: "Foto tampak depan gerbang atau bangunan properti.", required: true },
      { key: "room_photo", label: isWisata ? "Foto Wahana / Area Utama" : "Foto Kamar / Unit", description: "Foto interior kamar atau area utama yang disewakan.", required: true },
      { key: "facility_photo", label: "Foto Fasilitas", description: "Foto fasilitas pendukung (kamar mandi, parkir, gazebo, dll).", required: true },
    ];
  }

  if (role === "bank_sampah") {
    return [
      { key: "ktp", label: "KTP Pengelola", description: "Identitas KTP pengelola bank sampah yang sah.", required: true },
      { key: "unit_photo", label: "Foto Unit Bank Sampah", description: "Foto tampak depan unit atau plang nama bank sampah.", required: true },
    ];
  }

  return [];
};

export const getMissingDocuments = (
  role: AuthRegistrationRole,
  documents: Record<string, AuthDocument>,
  roleData?: Record<string, string>,
) => getDocumentRequirements(role, roleData)
  .filter((requirement) => requirement.required && !documents[requirement.key])
  .map((requirement) => requirement.label);

export const validateBaseStep = (form: RegistrationForm, options?: { allowPasswordless?: boolean; customer?: boolean }) => {
  if (!form.name.trim()) return "Nama lengkap wajib diisi.";
  if (!validateEmail(form.email)) return "Format email belum benar.";
  if (normalizePhone(form.phone).length < 11) return "Nomor HP belum lengkap.";
  if (!options?.allowPasswordless || form.password || form.passwordConfirmation) {
    if (!validatePassword(form.password)) return "Password minimal 8 karakter dan harus berisi huruf serta angka.";
    if (form.password !== form.passwordConfirmation) return "Konfirmasi password belum sama.";
  }
  if (!options?.customer) {
    if (!form.address.trim()) return "Alamat lengkap wajib diisi.";
  }
  return null;
};

export const validateRoleStep = (role: AuthRegistrationRole, roleData: Record<string, string>) => {
  if (role === "customer") return null;

  if (role === "driver") {
    if (!roleData.plateNumber?.trim()) return "Plat nomor kendaraan wajib diisi.";
    if (!roleData.vehicleType?.trim()) return "Jenis kendaraan wajib diisi.";
    return null;
  }

  if (role === "pemilik_kos") {
    if (!roleData.businessName?.trim()) return "Nama usaha / tempat wisata / properti wajib diisi.";
    if (!roleData.businessAddress?.trim()) return "Alamat lengkap properti wajib diisi.";
    return null;
  }

  if (role === "pemilik_shop") {
    const category = roleData.businessCategory || roleData.storeType;
    if (!category?.trim()) return "Kategori usaha wajib dipilih.";
    if (!roleData.brandType?.trim()) return "Jaringan / brand usaha wajib dipilih.";
    if (roleData.brandType === "OTHER" && !roleData.brandName?.trim()) {
      return "Nama brand / jaringan usaha lainnya wajib diisi.";
    }
    const outletName = roleData.outletName || roleData.businessName;
    if (!outletName?.trim()) return "Nama outlet wajib diisi.";
    if (!roleData.legalBusinessName?.trim() && !roleData.businessName?.trim()) {
      return "Nama legal usaha wajib diisi.";
    }
    if (!roleData.businessAddress?.trim()) return "Alamat lengkap outlet wajib diisi.";
    if (!roleData.businessPhone?.trim()) return "Nomor WhatsApp usaha wajib diisi.";

    if (category.toUpperCase() === "PHARMACY") {
      if (!roleData.pharmacistName?.trim()) return "Nama apoteker penanggung jawab wajib diisi.";
      if (!roleData.pharmacistSipa?.trim()) return "Nomor SIPA / SIPTTK wajib diisi.";
    }
    return null;
  }

  if (!roleData.businessName?.trim()) return "Nama usaha wajib diisi.";
  if (!roleData.businessAddress?.trim()) return "Alamat lengkap usaha wajib diisi.";
  return null;
};

export const fileIsAllowed = (file?: Pick<AuthDocument, "mimeType" | "name" | "size">) => {
  if (!file) return false;
  const extension = file.name?.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  const extensionAllowed = !extension || allowedExtensions.includes(extension);
  const mimeAllowed = !file.mimeType || allowedMimeTypes.includes(file.mimeType);
  const sizeAllowed = !file.size || file.size <= 10 * 1024 * 1024;
  return extensionAllowed && mimeAllowed && sizeAllowed;
};
