import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Clock,
  Navigation,
  ChevronRight,
  AlertCircle,
  FileText,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useSendContext } from "../../../context/SendContext";

interface SendRecipientFormScreenProps extends Nav {}

export const SendRecipientFormScreen: React.FC<SendRecipientFormScreenProps> = ({
  navigate,
}) => {
  const { recipient, setRecipient, setPickerTarget } = useSendContext();

  const [name, setName] = useState(recipient.name || "");
  const [phone, setPhone] = useState(recipient.phone || "");
  const [notes, setNotes] = useState(recipient.notes || "");
  const [preferredTime, setPreferredTime] = useState(recipient.preferredDeliveryTime || "Sekarang (Langsung Diantar)");
  const [errorPhone, setErrorPhone] = useState("");
  const [errorAddress, setErrorAddress] = useState("");
  const [errorName, setErrorName] = useState("");

  const validatePhone = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 14) {
      return false;
    }
    return cleaned.startsWith("08") || cleaned.startsWith("628");
  };

  const handlePickMap = () => {
    setRecipient((prev) => ({
      ...prev,
      name,
      phone,
      notes,
      preferredDeliveryTime: preferredTime,
    }));
    setPickerTarget("recipient");
    navigate("c_send_location");
  };

  const handleNext = () => {
    let hasError = false;

    if (!name.trim()) {
      setErrorName("Nama penerima wajib diisi.");
      hasError = true;
    } else {
      setErrorName("");
    }

    if (!phone.trim() || !validatePhone(phone.trim())) {
      setErrorPhone("Nomor telepon tidak valid (Contoh: 081234567890).");
      hasError = true;
    } else {
      setErrorPhone("");
    }

    if (!recipient.address.trim()) {
      setErrorAddress("Alamat tujuan belum dipilih dari peta.");
      hasError = true;
    } else {
      setErrorAddress("");
    }

    if (hasError) return;

    setRecipient((prev) => ({
      ...prev,
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      preferredDeliveryTime: preferredTime,
    }));

    navigate("c_send_package");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigate("c_send")} style={styles.backBtn}>
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerStep}>LANGKAH 1 DARI 3</Text>
            <Text style={styles.headerTitle}>Informasi Penerima Paket</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Alamat Tujuan */}
          <Text style={styles.sectionTitle}>Alamat Tujuan Barang</Text>
          <TouchableOpacity
            style={styles.addressCard}
            onPress={handlePickMap}
            activeOpacity={0.7}
          >
            <View style={styles.addressIconBg}>
              <Navigation size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>TITIK PENGANTARAN PETA</Text>
              <Text
                style={[
                  styles.addressValue,
                  !recipient.address && { color: "#94A3B8", fontStyle: "italic" },
                ]}
                numberOfLines={2}
              >
                {recipient.address || "Sentuh untuk memilih alamat dari peta..."}
              </Text>
              {recipient.notes ? (
                <Text style={styles.addressSubnotes}>Detail: {recipient.notes}</Text>
              ) : null}
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          {errorAddress ? (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color="#DC2626" />
              <Text style={styles.errorText}>{errorAddress}</Text>
            </View>
          ) : null}

          {/* Form Penerima */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Data Kontak Penerima</Text>
          <Text style={styles.sectionSubtitle}>
            Nomor telepon aktif diperlukan untuk verifikasi serah terima paket (OTP).
          </Text>

          {/* Nama Penerima */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap Penerima *</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Contoh: Bpk. Hendi Gunawan"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  setErrorName("");
                }}
              />
            </View>
            {errorName ? <Text style={styles.fieldError}>{errorName}</Text> : null}
          </View>

          {/* Nomor HP */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor WhatsApp / Telepon *</Text>
            <View style={styles.inputWrapper}>
              <Phone size={16} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  setErrorPhone("");
                }}
              />
            </View>
            {errorPhone ? <Text style={styles.fieldError}>{errorPhone}</Text> : null}
          </View>

          {/* Catatan untuk Driver */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instruksi Pengantaran (Opsional)</Text>
            <View style={[styles.inputWrapper, { alignItems: "flex-start", paddingTop: 10 }]}>
              <FileText size={16} color="#64748B" style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                placeholder="Cth: Titip di pos satpam jika tidak ada orang di rumah"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>

          {/* Waktu Pengantaran */}
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Pilihan Waktu Pengantaran</Text>
          <View style={styles.timeOptions}>
            {[
              "Sekarang (Langsung Diantar)",
              "Sore Hari (15:00 - 18:00)",
              "Malam Hari (18:30 - 21:00)",
            ].map((timeOption) => {
              const active = preferredTime === timeOption;
              return (
                <TouchableOpacity
                  key={timeOption}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => setPreferredTime(timeOption)}
                >
                  <Clock size={14} color={active ? "#15803D" : "#64748B"} />
                  <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                    {timeOption}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.ctaBtnText}>Lanjut ke Detail Barang</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerStep: {
    fontSize: 10,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  addressIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  addressValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  addressSubnotes: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 13,
    color: "#0F172A",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  fieldError: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
    fontWeight: "600",
  },
  timeOptions: {
    gap: 8,
    marginTop: 4,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  timeChipActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  timeChipTextActive: {
    color: "#15803D",
    fontWeight: "800",
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  ctaBtn: {
    backgroundColor: "#15803D",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 3,
    shadowColor: "#15803D",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
