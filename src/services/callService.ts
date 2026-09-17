import { Linking, Alert } from "react-native";

export const maskPhoneNumber = (phone?: string): string => {
  if (!phone) return "+62 812-****-****";
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.length < 7) return "+62 812-****-****";

  // E.g. +6281234567890 or 081234567890
  const prefix = cleaned.startsWith("+62")
    ? "+62 " + cleaned.slice(3, 6)
    : cleaned.startsWith("62")
    ? "+62 " + cleaned.slice(2, 5)
    : cleaned.startsWith("0")
    ? "+62 " + cleaned.slice(1, 4)
    : "+62 " + cleaned.slice(0, 3);

  const suffix = cleaned.slice(-4);
  return `${prefix}-****-${suffix}`;
};

export const cleanPhoneNumber = (phone?: string): string => {
  if (!phone) return "";
  return phone.replace(/[^0-9+]/g, "");
};

export const toWaNumber = (phone?: string): string => {
  if (!phone) return "";
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (!digits.startsWith("62")) {
    digits = "62" + digits;
  }
  return digits;
};

export const callPhone = async (phone?: string): Promise<boolean> => {
  if (!phone) {
    Alert.alert("Informasi", "Nomor telepon tidak tersedia.");
    return false;
  }
  const clean = cleanPhoneNumber(phone);
  const url = `tel:${clean}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert("Perangkat Tidak Mendukung", "Fitur panggilan telepon tidak didukung di perangkat ini.");
      return false;
    }
  } catch (err: any) {
    Alert.alert("Gagal Melakukan Panggilan", err?.message || "Terjadi kesalahan saat memanggil nomor telepon.");
    return false;
  }
};

export const openWhatsApp = async (phone?: string, text?: string): Promise<boolean> => {
  if (!phone) {
    Alert.alert("Informasi", "Nomor WhatsApp tidak tersedia.");
    return false;
  }
  const waNumber = toWaNumber(phone);
  const message = text ? `?text=${encodeURIComponent(text)}` : "";
  const url = `https://wa.me/${waNumber}${message}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch (err: any) {
    Alert.alert("Gagal Membuka WhatsApp", "Aplikasi WhatsApp tidak terpasang atau gagal dibuka.");
    return false;
  }
};
