import React from "react";
import { ScrollView, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bike, Building2, Coffee, ShoppingBag, UserRound, WashingMachine, ChevronRight, ShieldCheck } from "lucide-react-native";
import { Nav } from "../../types";
import { AuthRegistrationRole, ROLE_LABELS } from "./authTypes";
import { authColors, authStyles } from "./authStyles";

interface Props extends Nav {
  onSelect: (role: AuthRegistrationRole) => void;
}

const options: Array<{ role: AuthRegistrationRole; description: string; icon: React.ComponentType<{ size?: number; color?: string }> ; color: string }> = [
  { role: "customer", description: "Belanja produk, catering, laundry, dan layanan lokal.", icon: UserRound, color: "#1B7A4E" },
  { role: "driver", description: "Antarkan pesanan dan dapatkan penghasilan fleksibel.", icon: Bike, color: "#EA580C" },
  { role: "pemilik_marketplace", description: "Jual produk UMKM dan kelola toko online.", icon: ShoppingBag, color: "#059669" },
  { role: "pemilik_catering", description: "Terima pesanan catering dan kelola menu usaha.", icon: Coffee, color: "#D97706" },
  { role: "pemilik_laundry", description: "Kelola order laundry dan status pengerjaan.", icon: WashingMachine, color: "#0284C7" },
  { role: "pemilik_kos", description: "Kelola kamar kos dan pengajuan penghuni baru.", icon: Building2, color: "#7C3AED" },
];

export const RegisterRoleScreen: React.FC<Props> = ({ navigate, onSelect }) => (
  <SafeAreaView style={authStyles.container}>
    <ScrollView contentContainerStyle={authStyles.scroll} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigate("login")} style={styles.back}><Text style={styles.backText}>‹ Kembali ke login</Text></TouchableOpacity>
      <Text style={authStyles.brand}>The Ranger · Registrasi</Text>
      <Text style={authStyles.title}>Mulai dari peranmu</Text>
      <Text style={authStyles.subtitle}>Pilih jenis akun yang sesuai. Data dan dokumen yang diminta akan menyesuaikan peran ini.</Text>

      <View style={styles.notice}><ShieldCheck size={18} color={authColors.primary} /><Text style={styles.noticeText}>Satu akun hanya menggunakan satu peran agar akses dashboard dan verifikasi tetap aman.</Text></View>
      <View style={styles.list}>
        {options.map(({ role, description, icon: Icon, color }) => (
          <TouchableOpacity key={role} onPress={() => onSelect(role)} activeOpacity={0.8} style={styles.option}>
            <View style={[styles.icon, { backgroundColor: `${color}18` }]}><Icon size={25} color={color} /></View>
            <View style={styles.optionText}><Text style={styles.optionTitle}>{ROLE_LABELS[role]}</Text><Text style={styles.optionDescription}>{description}</Text></View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  back: { paddingVertical: 4, marginBottom: 24 },
  backText: { color: authColors.primary, fontSize: 13, fontWeight: "700" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: authColors.mint, borderRadius: 13, padding: 13, marginTop: 20 },
  noticeText: { flex: 1, color: authColors.primaryDark, fontSize: 12, lineHeight: 18 },
  list: { gap: 11, marginTop: 18 },
  option: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: authColors.line, padding: 15, flexDirection: "row", alignItems: "center" },
  icon: { width: 49, height: 49, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionText: { flex: 1 },
  optionTitle: { color: authColors.ink, fontSize: 15, fontWeight: "800" },
  optionDescription: { color: authColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
});
