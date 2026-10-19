import React, { useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react-native";
import { Nav } from "../../types";
import { authColors, authStyles } from "./authStyles";
import { validateEmail, validatePassword } from "./authValidation";
import { AuthBrand } from "./components/AuthBrand";

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
    if (!validateEmail(email)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    setStage("reset");
  };

  const reset = async () => {
    setError("");
    if (!validatePassword(password)) {
      setError("Kata sandi minimal 8 karakter dan harus berisi kombinasi huruf serta angka.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi kata sandi belum cocok.");
      return;
    }
    setLoading(true);
    try {
      const result = await onResetPassword(email, password);
      if (result.ok) {
        setStage("success");
      } else {
        setError(result.error || "Gagal memperbarui kata sandi. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.viewport}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => navigate("login")}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={authColors.muted} />
              <Text style={styles.backBtnText}>Kembali ke halaman masuk</Text>
            </TouchableOpacity>

            <View style={styles.brandHeader}>
              <AuthBrand size={42} />
            </View>

            <View style={styles.heading}>
              <View style={styles.iconCircle}>
                <KeyRound size={22} color={authColors.primary} />
              </View>
              <Text style={styles.title}>
                {stage === "success" ? "Kata Sandi Berhasil Diubah" : "Pemulihan Akses Akun"}
              </Text>
              <Text style={styles.subtitle}>
                {stage === "success"
                  ? "Akun Anda telah diamankan. Silakan masuk kembali menggunakan kata sandi baru."
                  : stage === "reset"
                  ? "Buat kata sandi baru yang aman untuk akun GEOVERSE Anda."
                  : "Masukkan alamat email terdaftar untuk menerima petunjuk pemulihan kata sandi."}
              </Text>
            </View>

            {stage === "email" && (
              <View style={styles.form}>
                <Text style={authStyles.label}>Alamat Email</Text>
                <View style={styles.inputBox}>
                  <Mail size={18} color={authColors.muted} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={styles.textInput}
                    placeholder="nama@email.com"
                    placeholderTextColor={authColors.subtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}
                <TouchableOpacity
                  onPress={submitEmail}
                  style={[authStyles.primaryButton, styles.submitBtn]}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.primaryButtonText}>Lanjutkan Pemulihan</Text>
                </TouchableOpacity>
              </View>
            )}

            {stage === "reset" && (
              <View style={styles.form}>
                <View style={styles.emailBadge}>
                  <ShieldCheck size={16} color={authColors.primary} />
                  <Text style={styles.emailBadgeText}>Email: {email}</Text>
                </View>

                <Text style={authStyles.label}>Kata Sandi Baru</Text>
                <View style={styles.inputBox}>
                  <LockKeyhole size={18} color={authColors.muted} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.textInput}
                    placeholder="Minimal 8 karakter (huruf & angka)"
                    placeholderTextColor={authColors.subtle}
                    secureTextEntry
                  />
                </View>

                <Text style={[authStyles.label, { marginTop: 14 }]}>Konfirmasi Kata Sandi Baru</Text>
                <View style={styles.inputBox}>
                  <LockKeyhole size={18} color={authColors.muted} />
                  <TextInput
                    value={confirmation}
                    onChangeText={setConfirmation}
                    style={styles.textInput}
                    placeholder="Ketik ulang kata sandi baru"
                    placeholderTextColor={authColors.subtle}
                    secureTextEntry
                  />
                </View>

                {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={() => void reset()}
                  disabled={loading}
                  style={[authStyles.primaryButton, styles.submitBtn]}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={authStyles.primaryButtonText}>Simpan Kata Sandi Baru</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {stage === "success" && (
              <View style={styles.successBox}>
                <CheckCircle2 size={36} color={authColors.primary} />
                <Text style={styles.successTitle}>Akses Berhasil Dipulihkan</Text>
                <Text style={styles.successSub}>
                  Kata sandi baru Anda telah aktif. Anda dapat langsung masuk ke aplikasi.
                </Text>
                <TouchableOpacity
                  onPress={() => navigate("login")}
                  style={[authStyles.primaryButton, styles.submitBtn, { width: "100%" }]}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.primaryButtonText}>Masuk ke Akun</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  viewport: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: Platform.OS === "web" ? 32 : 24,
    paddingVertical: 32,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
      } as any,
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      },
    }),
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: authColors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  brandHeader: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heading: {
    marginBottom: 20,
  },
  title: {
    color: authColors.ink,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: authColors.muted,
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 6,
  },
  form: {
    width: "100%",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: authColors.line,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 13,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: authColors.ink,
    fontSize: 14,
    height: 48,
    paddingVertical: 0,
  },
  errorSpacing: {
    marginTop: 12,
  },
  submitBtn: {
    marginTop: 18,
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.primaryBorder,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  emailBadgeText: {
    color: authColors.primaryDark,
    fontSize: 12.5,
    fontWeight: "600",
  },
  successBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  successTitle: {
    color: authColors.ink,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  successSub: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 8,
  },
});
