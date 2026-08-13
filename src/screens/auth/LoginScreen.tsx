import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react-native";
import { Nav } from "../../types";
import { authColors, authStyles } from "./authStyles";
import { googleClientIds, hasGoogleClientId } from "./googleAuth";

WebBrowser.maybeCompleteAuthSession();

interface Props extends Nav {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onGoogleLogin: (accessToken?: string) => Promise<void>;
}

export const LoginScreen: React.FC<Props> = ({ navigate, onLogin, onGoogleLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await onLogin(email, password);
      if (!result.ok) setError(result.error || "Email atau password belum benar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaViewWrapper>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.logo}><Text style={styles.logoText}>R</Text></View>
            <View><Text style={authStyles.brand}>The Ranger</Text><Text style={styles.heroTitle}>Selamat datang kembali</Text></View>
          </View>
          <Text style={authStyles.subtitle}>Masuk dengan akunmu untuk melanjutkan layanan komunitas PGE Kamojang.</Text>

          <View style={authStyles.card}>
            <View style={styles.secureRow}><ShieldCheck size={17} color={authColors.primary} /><Text style={styles.secureText}>Akses aman · Role mengikuti akun terdaftar</Text></View>
            <Field label="Email" icon={<Mail size={18} color="#6B7280" />} value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password" icon={<LockKeyhole size={18} color="#6B7280" />} value={password} onChangeText={setPassword} placeholder="Masukkan password" secureTextEntry={!showPassword} right={<TouchableOpacity onPress={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} color="#6B7280" /> : <Eye size={18} color="#6B7280" />}</TouchableOpacity>} />
            {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}
            <TouchableOpacity onPress={submit} disabled={loading || googleLoading} style={[authStyles.primaryButton, styles.submit]} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={authStyles.primaryButtonText}>Masuk ke akun</Text><ArrowRight size={18} color="#FFFFFF" /></>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate("auth_forgot_password")} style={styles.forgot}><KeyRound size={15} color={authColors.primary} /><Text style={styles.forgotText}>Lupa password?</Text></TouchableOpacity>
          </View>

          <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>atau</Text><View style={styles.dividerLine} /></View>
          <GoogleLoginButton disabled={loading} loading={googleLoading} onBusyChange={setGoogleLoading} onLogin={onGoogleLogin} onError={setError} />

          <TouchableOpacity onPress={() => navigate("auth_register_role")} style={styles.registerButton}><UserPlus size={17} color={authColors.primary} /><Text style={styles.registerText}>Belum punya akun? Daftar sekarang</Text></TouchableOpacity>
          <Text style={styles.legal}>Dengan masuk, kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi The Ranger.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
};

const SafeAreaViewWrapper: React.FC<React.PropsWithChildren> = ({ children }) => <View style={authStyles.container}>{children}</View>;

interface GoogleLoginButtonProps {
  disabled: boolean;
  loading: boolean;
  onBusyChange: (busy: boolean) => void;
  onLogin: (accessToken?: string) => Promise<void>;
  onError: (message: string) => void;
}

// Keep the OAuth hook out of the initial login render. Without a configured
// Google Client ID, some Expo runtimes throw while creating the auth request.
const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = (props) => {
  if (!hasGoogleClientId) {
    return (
      <TouchableOpacity
        onPress={() => props.onError("Login Google belum aktif. Tambahkan Google Client ID di environment aplikasi.")}
        disabled={props.disabled}
        style={[authStyles.secondaryButton, styles.googleButton]}
        activeOpacity={0.8}
      >
        <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
        <Text style={authStyles.secondaryButtonText}>Lanjutkan dengan Google</Text>
      </TouchableOpacity>
    );
  }

  return <ConfiguredGoogleLoginButton {...props} />;
};

const ConfiguredGoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ disabled, loading, onBusyChange, onLogin, onError }) => {
  const [request, , promptAsync] = Google.useAuthRequest(googleClientIds);

  const submit = async () => {
    onError("");
    onBusyChange(true);
    try {
      if (!request) throw new Error("Konfigurasi Google belum siap. Coba lagi.");
      const result = await promptAsync();
      if (result.type === "success") await onLogin(result.authentication?.accessToken);
      else if (result.type === "error") onError("Login Google ditolak. Coba lagi atau gunakan email dan password.");
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Login Google belum dapat diproses.");
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <TouchableOpacity onPress={() => void submit()} disabled={disabled || loading} style={[authStyles.secondaryButton, styles.googleButton]} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color={authColors.primary} /> : <><View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View><Text style={authStyles.secondaryButtonText}>Lanjutkan dengan Google</Text></>}
    </TouchableOpacity>
  );
};

const Field: React.FC<React.ComponentProps<typeof TextInput> & { label: string; icon: React.ReactNode; right?: React.ReactNode }> = ({ label, icon, right, ...props }) => (
  <View style={styles.fieldGroup}><Text style={authStyles.label}>{label}</Text><View style={styles.inputShell}>{icon}<TextInput {...props} style={[authStyles.input, styles.input]} placeholderTextColor="#9CA3AF" /></View>{right ? <View style={styles.inputRight}>{right}</View> : null}</View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: authColors.primary, alignItems: "center", justifyContent: "center", marginRight: 13 },
  logoText: { color: "#FFFFFF", fontSize: 29, fontWeight: "900" },
  heroTitle: { color: authColors.ink, fontSize: 22, fontWeight: "800", marginTop: 3 },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: authColors.mint, borderRadius: 10, padding: 10, marginBottom: 18 },
  secureText: { color: authColors.primaryDark, fontSize: 12, fontWeight: "700" },
  fieldGroup: { marginBottom: 15 },
  inputShell: { flexDirection: "row", alignItems: "center", position: "relative" },
  input: { flex: 1, marginLeft: -28, paddingLeft: 42 },
  inputRight: { position: "absolute", right: 14, bottom: 15 },
  errorSpacing: { marginBottom: 12 },
  submit: { flexDirection: "row", gap: 9, marginTop: 4 },
  forgot: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 17 },
  forgotText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: authColors.line },
  dividerText: { color: "#9CA3AF", fontSize: 12 },
  googleButton: { flexDirection: "row", gap: 10 },
  googleMark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  googleMarkText: { color: "#4285F4", fontWeight: "900", fontSize: 15 },
  registerButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 24 },
  registerText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  legal: { textAlign: "center", color: "#9CA3AF", fontSize: 11, lineHeight: 16, marginTop: 20, paddingHorizontal: 15 },
});
