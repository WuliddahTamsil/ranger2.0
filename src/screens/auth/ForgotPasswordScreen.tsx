import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react-native";
import { Nav } from "../../types";
import { authColors, authStyles } from "./authStyles";
import { validateEmail, validatePassword } from "./authValidation";

interface Props extends Nav {
  onResetPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigate, onResetPassword }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [stage, setStage] = useState<"email" | "reset" | "success">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitEmail = () => {
    setError("");
    if (!validateEmail(email)) { setError("Masukkan email yang valid."); return; }
    setStage("reset");
  };

  const reset = async () => {
    setError("");
    if (!validatePassword(password)) { setError("Password minimal 8 karakter dan berisi huruf serta angka."); return; }
    if (password !== confirmation) { setError("Konfirmasi password belum sama."); return; }
    setLoading(true);
    try {
      const result = await onResetPassword(email, password);
      if (result.ok) setStage("success"); else setError(result.error || "Reset password gagal.");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigate("login")} style={styles.back}><ArrowLeft size={17} color={authColors.primary} /><Text style={styles.backText}>Kembali ke login</Text></TouchableOpacity>
        <View style={styles.icon}><KeyRound size={25} color={authColors.primary} /></View>
        <Text style={authStyles.brand}>Pemulihan akun</Text><Text style={authStyles.title}>{stage === "success" ? "Password berhasil diubah" : "Lupa password?"}</Text>
        <Text style={authStyles.subtitle}>{stage === "success" ? "Silakan masuk kembali menggunakan password baru." : "Kami bantu pulihkan akses akunmu dengan proses yang aman."}</Text>
        <View style={authStyles.card}>
          {stage === "email" && <><Text style={styles.info}>Masukkan email yang digunakan saat registrasi untuk melanjutkan.</Text><Text style={authStyles.label}>Email</Text><View style={styles.inputRow}><Mail size={18} color="#6B7280" /><TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="nama@email.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" /></View><ActionButton label="Lanjutkan" onPress={submitEmail} /></>}
          {stage === "reset" && <><View style={styles.secure}><ShieldCheck size={17} color={authColors.primary} /><Text style={styles.secureText}>Email terdaftar: {email}</Text></View><Text style={authStyles.label}>Password baru</Text><TextInput value={password} onChangeText={setPassword} style={authStyles.input} placeholder="Minimal 8 karakter" placeholderTextColor="#9CA3AF" secureTextEntry /><Text style={authStyles.label}>Konfirmasi password</Text><TextInput value={confirmation} onChangeText={setConfirmation} style={authStyles.input} placeholder="Ulangi password baru" placeholderTextColor="#9CA3AF" secureTextEntry /><ActionButton label="Simpan password baru" onPress={() => void reset()} loading={loading} /></>}
          {stage === "success" && <><View style={styles.success}><CheckCircle2 size={28} color={authColors.primary} /><Text style={styles.successTitle}>Akunmu sudah aman kembali.</Text></View><ActionButton label="Masuk sekarang" onPress={() => navigate("login")} /></>}
          {error ? <Text style={[authStyles.error, styles.error]}>{error}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionButton: React.FC<{ label: string; onPress: () => void; loading?: boolean }> = ({ label, onPress, loading }) => <TouchableOpacity onPress={onPress} disabled={loading} style={[authStyles.primaryButton, styles.action]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={authStyles.primaryButtonText}>{label}</Text>}</TouchableOpacity>;

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 26 },
  backText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  icon: { width: 54, height: 54, borderRadius: 17, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  info: { color: authColors.muted, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingHorizontal: 13, marginBottom: 15 },
  input: { flex: 1, minHeight: 48, color: authColors.ink, fontSize: 14 },
  action: { marginTop: 18 },
  secure: { flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: authColors.mint, padding: 10, borderRadius: 10, marginBottom: 18 },
  secureText: { color: authColors.primaryDark, fontSize: 12, fontWeight: "700" },
  success: { alignItems: "center", gap: 10, paddingVertical: 8 },
  successTitle: { color: authColors.primaryDark, fontWeight: "800", fontSize: 15 },
  error: { marginTop: 14 },
});
