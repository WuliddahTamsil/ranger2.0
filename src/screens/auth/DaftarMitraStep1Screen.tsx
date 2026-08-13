import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import { ArrowLeft, Camera, CheckCircle2 } from "lucide-react-native";

export const DaftarMitraStep1Screen: React.FC<Nav> = ({ navigate }) => {
  const [nama, setNama] = useState("Budi Santoso");
  const [nik, setNik] = useState("320xxxxxxxxxxxxx");
  const [ktpUploaded, setKtpUploaded] = useState(false);

  const handleUploadKtp = () => {
    setKtpUploaded(!ktpUploaded);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("role")}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Mitra</Text>
      </View>

      {/* Progress Bar (Step 1 of 2: 50%) */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: "50%" }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Daftar Mitra Rangers App</Text>
        <Text style={styles.subtitle}>
          Lengkapi data untuk membuat akun mitra usaha Anda.
        </Text>

        {/* Data Diri & Akun Card Container */}
        <View style={styles.formCard}>
          <Text style={styles.cardSectionTitle}>Data Diri & Akun</Text>
          <Text style={styles.cardSectionSub}>
            Pastikan data sesuai dengan kartu identitas Anda yang berlaku.
          </Text>

          {/* Input Nama */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Lengkap Sesuai KTP</Text>
            <TextInput
              style={styles.input}
              value={nama}
              onChangeText={setNama}
              placeholder="Budi Santoso"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Input NIK */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nomor Induk Kependudukan (NIK)</Text>
            <TextInput
              style={styles.input}
              value={nik}
              onChangeText={setNik}
              placeholder="320xxxxxxxxxxxxx"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </View>

          {/* Input Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Alamat Email</Text>
            <TextInput
              style={styles.input}
              placeholder="nama@domain.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
            />
          </View>

          {/* Input Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password Akun Mitra</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          {/* Upload Foto KTP */}
          <View style={styles.formGroup}>
            <TouchableOpacity
              style={[
                styles.uploadCard,
                ktpUploaded && styles.uploadCardSuccess,
              ]}
              onPress={handleUploadKtp}
              activeOpacity={0.8}
            >
              <View style={styles.uploadRow}>
                <View style={styles.uploadIconCircle}>
                  <Camera size={20} color="#6B7280" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>Upload Foto KTP</Text>
                  <Text style={styles.uploadSub}>Unggah foto KTP yang jelas dan tidak buram.</Text>
                </View>
                <Camera size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Button Lanjutkan */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigate("daftar_mitra_step2")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>LANJUTKAN</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  progressBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0D7A53",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardSectionSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#111827",
  },
  uploadCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    padding: 14,
  },
  uploadCardSuccess: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  uploadSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  btnPrimary: {
    height: 52,
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    elevation: 2,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
