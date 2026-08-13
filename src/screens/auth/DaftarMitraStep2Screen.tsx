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
import { ArrowLeft, Building2 } from "lucide-react-native";

export const DaftarMitraStep2Screen: React.FC<Nav> = ({ navigate }) => {
  const [namaUsaha, setNamaUsaha] = useState("");
  const [alamatUsaha, setAlamatUsaha] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("daftar_mitra_step1")}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Mitra</Text>
      </View>

      {/* Progress Bar (Step 2 of 2: 100%) */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Daftar Mitra Rangers App</Text>
        <Text style={styles.subtitle}>
          Lengkapi data untuk membuat akun mitra usaha Anda.
        </Text>

        {/* Detail Usaha Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardSectionTitle}>Detail Usaha</Text>
          <Text style={styles.cardSectionSub}>
            Lengkapi informasi usaha laundry Anda.
          </Text>

          {/* Nama Usaha / Laundry */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Usaha / Laundry</Text>
            <TextInput
              style={styles.input}
              value={namaUsaha}
              onChangeText={setNamaUsaha}
              placeholder="h"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Nomor Telepon */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nomor Telepon</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          {/* Alamat Lengkap */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Alamat Lengkap</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={alamatUsaha}
              onChangeText={setAlamatUsaha}
              placeholder="h"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Upload KTP Pemilik */}
          <View style={styles.formGroup}>
            <TouchableOpacity style={styles.uploadCard} activeOpacity={0.8}>
              <View style={styles.uploadRow}>
                <View style={styles.uploadIconCircle}>
                  <Building2 size={20} color="#6B7280" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>Upload KTP Pemilik</Text>
                  <Text style={styles.uploadSub}>Unggah KTP pemilik usaha untuk verifikasi.</Text>
                </View>
                <Building2 size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Button DAFTAR SEKARANG */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigate("daftar_mitra_step3")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>DAFTAR SEKARANG</Text>
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
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: "#111827",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  uploadCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    padding: 14,
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
