import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import { Check } from "lucide-react-native";

export const DaftarMitraStep3Screen: React.FC<Nav> = ({ navigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar Mitra</Text>
      </View>

      <View style={styles.contentContainer}>
        {/* Success Circle Icon */}
        <View style={styles.circleBg}>
          <Check size={44} color="#0D7A53" strokeWidth={3} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Pendaftaran Disetujui!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Selamat! Akun Mitra Anda sudah aktif. Anda sekarang dapat mengelola bisnis Anda melalui Dashboard Rangers App.
        </Text>

        {/* Button Buka Dashboard Pemilik Kos */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigate("pemilik_kos_home")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>MASUK DASHBOARD PEMILIK KOS</Text>
        </TouchableOpacity>

        {/* Button Buka Dashboard Pemilik Laundry */}
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: "#2563EB", marginTop: 12 }]}
          onPress={() => navigate("pemilik_laundry_home")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>MASUK DASHBOARD PEMILIK LAUNDRY</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  circleBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  boldText: {
    fontWeight: "700",
    color: "#111827",
  },
  btnPrimary: {
    width: "100%",
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
