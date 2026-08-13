import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CheckCircle2, Clock3, ArrowRight, LogIn } from "lucide-react-native";
import { AuthAccount } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { Nav } from "../../types";

interface Props extends Nav { account: AuthAccount; onContinue: () => void; }

export const RegisterSuccessScreen: React.FC<Props> = ({ navigate, account, onContinue }) => (
  <SafeAreaView style={authStyles.container}>
    <View style={styles.container}>
      <View style={styles.icon}><CheckCircle2 size={46} color={authColors.primary} /></View>
      <Text style={authStyles.brand}>Registrasi berhasil</Text>
      <Text style={authStyles.title}>Halo, {account.name.split(" ")[0]}!</Text>
      <Text style={authStyles.subtitle}>Akun {account.email} sudah dibuat sebagai {account.role === "customer" ? "Customer" : "mitra"}.</Text>
      {account.role === "customer" ? <View style={styles.verified}><CheckCircle2 size={18} color={authColors.primary} /><Text style={styles.verifiedText}>Akun Customer bisa langsung digunakan.</Text></View> : <View style={styles.pending}><Clock3 size={19} color={authColors.warning} /><Text style={styles.pendingText}>Dokumen akan diverifikasi admin. Status saat ini: Menunggu Verifikasi.</Text></View>}
      <TouchableOpacity onPress={onContinue} style={[authStyles.primaryButton, styles.button]}><Text style={authStyles.primaryButtonText}>{account.role === "customer" ? "Masuk ke dashboard" : "Lihat dashboard"}</Text><ArrowRight size={18} color="#FFFFFF" /></TouchableOpacity>
      <TouchableOpacity onPress={() => navigate("login")} style={[authStyles.secondaryButton, styles.button]}><LogIn size={17} color={authColors.primary} /><Text style={authStyles.secondaryButtonText}>Kembali ke login</Text></TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  icon: { width: 86, height: 86, borderRadius: 43, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  verified: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: authColors.mint, borderRadius: 13, padding: 13, marginTop: 24, width: "100%" },
  verifiedText: { flex: 1, color: authColors.primaryDark, fontSize: 13, lineHeight: 18 },
  pending: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: authColors.warningBg, borderRadius: 13, padding: 13, marginTop: 24, width: "100%" },
  pendingText: { flex: 1, color: "#92400E", fontSize: 13, lineHeight: 18 },
  button: { width: "100%", flexDirection: "row", gap: 8, marginTop: 13 },
});
