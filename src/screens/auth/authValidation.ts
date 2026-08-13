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

export const getDocumentRequirements = (role: AuthRegistrationRole): AuthDocumentRequirement[] => {
  if (role === "driver") {
    return [
      { key: "ktp", label: "KTP", description: "Foto KTP yang jelas dan tidak terpotong.", required: true },
      { key: "sim", label: "SIM", description: "SIM aktif sesuai jenis kendaraan.", required: true },
      { key: "stnk", label: "STNK", description: "STNK kendaraan yang digunakan.", required: true },
      { key: "vehicle_front", label: "Foto Kendaraan Depan", description: "Tampak depan kendaraan.", required: true },
      { key: "vehicle_side", label: "Foto Kendaraan Samping", description: "Tampak samping kendaraan.", required: true },
      { key: "vehicle_plate", label: "Foto Plat Nomor", description: "Plat nomor harus terbaca.", required: true },
    ];
  }

  if (role === "pemilik_marketplace") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas pemilik usaha.", required: true },
      { key: "business_license", label: "NIB / Surat Usaha", description: "Dokumen legalitas usaha.", required: true },
      { key: "store_photo", label: "Foto Toko / Produk", description: "Foto lokasi atau produk utama.", required: true },
    ];
  }

  if (role === "pemilik_catering") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas pemilik catering.", required: true },
      { key: "business_license", label: "NIB / Surat Usaha", description: "Dokumen legalitas usaha.", required: true },
      { key: "halal_or_health", label: "Sertifikat Halal / PIRT", description: "Jika tersedia, unggah dokumen yang relevan.", required: false },
      { key: "kitchen_photo", label: "Foto Dapur", description: "Foto area produksi catering.", required: true },
    ];
  }

  if (role === "pemilik_laundry") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas pemilik laundry.", required: true },
      { key: "business_license", label: "NIB / Surat Usaha", description: "Dokumen legalitas usaha.", required: true },
      { key: "store_photo", label: "Foto Lokasi Laundry", description: "Foto tempat usaha laundry.", required: true },
    ];
  }

  if (role === "pemilik_kos") {
    return [
      { key: "ktp", label: "KTP Pemilik", description: "Identitas pemilik kos yang jelas dan tidak terpotong.", required: true },
      { key: "property_document", label: "Bukti Kepemilikan / Izin", description: "Bukti kepemilikan, izin pengelolaan, atau surat usaha kos.", required: true },
      { key: "property_photo", label: "Foto Properti Kos", description: "Foto tampak depan dan area utama kos.", required: true },
    ];
  }

  return [];
};

export const getMissingDocuments = (
  role: AuthRegistrationRole,
  documents: Record<string, AuthDocument>,
) => getDocumentRequirements(role)
  .filter((requirement) => requirement.required && !documents[requirement.key])
  .map((requirement) => requirement.label);

export const validateBaseStep = (form: RegistrationForm, options?: { allowPasswordless?: boolean }) => {
  if (!form.name.trim()) return "Nama lengkap wajib diisi.";
  if (!validateEmail(form.email)) return "Format email belum benar.";
  if (normalizePhone(form.phone).length < 11) return "Nomor WhatsApp belum lengkap.";
  if (!options?.allowPasswordless || form.password || form.passwordConfirmation) {
    if (!validatePassword(form.password)) return "Password minimal 8 karakter dan harus berisi huruf serta angka.";
    if (form.password !== form.passwordConfirmation) return "Konfirmasi password belum sama.";
  }
  if (!form.address.trim()) return "Alamat lengkap wajib diisi.";
  return null;
};

export const validateRoleStep = (role: AuthRegistrationRole, roleData: Record<string, string>) => {
  if (role === "customer") return null;
  const requiredFields = role === "driver"
    ? ["plateNumber", "vehicleType", "vehicleBrand", "vehicleYear"]
    : role === "pemilik_marketplace"
      ? ["businessName", "businessCategory", "businessAddress"]
      : role === "pemilik_catering"
        ? ["businessName", "businessAddress", "businessType"]
        : role === "pemilik_kos"
          ? ["businessName", "businessAddress", "propertyType", "roomCount"]
        : ["businessName", "businessAddress", "serviceType"];

  const missing = requiredFields.find((field) => !roleData[field]?.trim());
  if (missing) return "Lengkapi semua data usaha/kendaraan yang wajib.";
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
