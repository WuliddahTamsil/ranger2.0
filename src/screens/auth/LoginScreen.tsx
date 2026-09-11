import React, { useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, UserPlus } from "lucide-react-native";
import { Nav } from "../../types";
import { GoogleCredential } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { googleClientIds, googleConfigMessage, hasGoogleClientId } from "./googleAuth";
import { AuthBrand } from "./components/AuthBrand";
import { GoogleLogo } from "./components/GoogleLogo";

WebBrowser.maybeCompleteAuthSession();

interface Props extends Nav {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onGoogleLogin: (credential: GoogleCredential) => Promise<void>;
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
        <ScrollView contentContainerStyle={[authStyles.scroll, styles.viewport]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <AuthBrand />
            <View style={styles.heading}>
              <Text style={authStyles.title}>Selamat datang kembali</Text>
              <Text style={authStyles.subtitle}>Masuk dengan akunmu untuk melanjutkan layanan komunitas PGE Kamojang.</Text>
            </View>

            <View style={styles.form}>
              <Field label="Email" icon={<Mail size={19} color="#718096" />} value={email} onChangeText={setEmail} placeholder="contoh@email.com" keyboardType="email-address" autoCapitalize="none" />
              <Field label="Password" icon={<LockKeyhole size={19} color="#718096" />} value={password} onChangeText={setPassword} placeholder="Masukkan password" secureTextEntry={!showPassword} right={<TouchableOpacity onPress={() => setShowPassword((value) => !value)} hitSlop={8}>{showPassword ? <EyeOff size={19} color="#718096" /> : <Eye size={19} color="#718096" />}</TouchableOpacity>} />
              {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}
              <Pressable onPress={submit} disabled={loading || googleLoading} style={({ pressed }) => [authStyles.primaryButton, styles.submit, pressed && styles.pressed]}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={authStyles.primaryButtonText}>Masuk ke akun</Text><ArrowRight size={18} color="#FFFFFF" /></>}
              </Pressable>
              <TouchableOpacity onPress={() => navigate("auth_forgot_password")} style={styles.forgot} activeOpacity={0.7}><KeyRound size={15} color={authColors.primary} /><Text style={styles.forgotText}>Lupa password?</Text></TouchableOpacity>
            </View>

            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>atau</Text><View style={styles.dividerLine} /></View>
            <GoogleLoginButton disabled={loading} loading={googleLoading} onBusyChange={setGoogleLoading} onLogin={onGoogleLogin} onError={setError} />

            <TouchableOpacity onPress={() => navigate("auth_register_role")} style={styles.registerButton} activeOpacity={0.7}>
              <UserPlus size={17} color={authColors.primary} />
              <Text style={styles.registerPrompt}>Belum punya akun?</Text>
              <Text style={styles.registerText}>Daftar sekarang</Text>
              <ArrowRight size={16} color={authColors.primary} />
            </TouchableOpacity>
            <Text style={styles.legal}>Dengan masuk, kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi GEOVERSE 2.0.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
};

const SafeAreaViewWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ResponsiveSafeAreaView style={authStyles.container}>
    <View pointerEvents="none" style={styles.shapeTop} />
    <View pointerEvents="none" style={styles.shapeBottom} />
    {children}
  </ResponsiveSafeAreaView>
);

interface GoogleLoginButtonProps {
  disabled: boolean;
  loading: boolean;
  onBusyChange: (busy: boolean) => void;
  onLogin: (credential: GoogleCredential) => Promise<void>;
  onError: (message: string) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = (props) => {
  if (!hasGoogleClientId) {
    return <TouchableOpacity onPress={() => props.onError(googleConfigMessage)} disabled={props.disabled} style={[authStyles.secondaryButton, styles.googleButton]} activeOpacity={0.8}><GoogleLogo /><Text style={authStyles.secondaryButtonText}>Lanjutkan dengan Google</Text></TouchableOpacity>;
  }

  return <ConfiguredGoogleLoginButton {...props} />;
};

const ConfiguredGoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ disabled, loading, onBusyChange, onLogin, onError }) => {
  const [request, , promptAsync] = Google.useAuthRequest({
    ...googleClientIds,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    redirectUri: makeRedirectUri({ scheme: "geoverse" }),
  });

  const submit = async () => {
    onError("");
    onBusyChange(true);
    try {
      if (!request) throw new Error("Konfigurasi Google belum siap. Coba lagi beberapa saat.");
      const result = await promptAsync();
      if (result.type === "success") {
        const credential: GoogleCredential = {
          accessToken: result.authentication?.accessToken || result.params?.access_token,
          idToken: result.authentication?.idToken || result.params?.id_token,
        };
        if (!credential.accessToken && !credential.idToken) throw new Error("Google tidak mengembalikan token autentikasi.");
        await onLogin(credential);
      } else if (result.type === "error") {
        const errorCode = result.params?.error;
        onError(errorCode === "disabled_client"
          ? "Google OAuth Client sedang dinonaktifkan. Aktifkan client tersebut di Google Cloud Console atau ganti Client ID aktif di file .env."
          : "Login Google ditolak atau dibatalkan. Coba lagi.");
      }
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Login Google belum dapat diproses.");
    } finally {
      onBusyChange(false);
    }
  };

  return <TouchableOpacity onPress={() => void submit()} disabled={disabled || loading} style={[authStyles.secondaryButton, styles.googleButton]} activeOpacity={0.8}>{loading ? <ActivityIndicator color={authColors.primary} /> : <><GoogleLogo /><Text style={authStyles.secondaryButtonText}>Lanjutkan dengan Google</Text></>}</TouchableOpacity>;
};

const Field: React.FC<React.ComponentProps<typeof TextInput> & { label: string; icon: React.ReactNode; right?: React.ReactNode }> = ({ label, icon, right, ...props }) => (
  <View style={styles.fieldGroup}><Text style={authStyles.label}>{label}</Text><View style={styles.inputShell}>{icon}<TextInput {...props} style={[authStyles.input, styles.input]} placeholderTextColor="#718096" />{right ? <View>{right}</View> : null}</View></View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  viewport: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingTop: 28, paddingBottom: 38 },
  card: { width: "100%", maxWidth: 560, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E5E9EE", paddingHorizontal: 38, paddingTop: 38, paddingBottom: 30, shadowColor: "#142238", shadowOpacity: 0.07, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  shapeTop: { position: "absolute", width: 280, height: 160, borderRadius: 140, borderWidth: 1, borderColor: "rgba(8, 122, 75, 0.06)", top: -80, right: -90, transform: [{ rotate: "-18deg" }] },
  shapeBottom: { position: "absolute", width: 360, height: 190, borderRadius: 190, borderWidth: 1, borderColor: "rgba(20, 34, 56, 0.045)", bottom: -115, left: -140, transform: [{ rotate: "18deg" }] },
  heading: { marginTop: 34 },
  form: { marginTop: 30 },
  fieldGroup: { marginBottom: 18 },
  inputShell: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#F7F9F8", borderWidth: 1, borderColor: "#D6DEE6", borderRadius: 12, minHeight: 54, paddingHorizontal: 15 },
  input: { flex: 1, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0, minHeight: 52 },
  errorSpacing: { marginBottom: 12 },
  submit: { flexDirection: "row", gap: 9, marginTop: 4 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  forgot: { flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 19 },
  forgotText: { color: authColors.primary, fontSize: 13, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: authColors.line },
  dividerText: { color: authColors.muted, fontSize: 12, fontWeight: "600" },
  googleButton: { flexDirection: "row", gap: 11 },
  registerButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28, paddingTop: 23, borderTopWidth: 1, borderTopColor: authColors.line },
  registerPrompt: { color: authColors.muted, fontSize: 13 },
  registerText: { color: authColors.primary, fontSize: 13, fontWeight: "800" },
  legal: { textAlign: "center", color: "#8A98A9", fontSize: 11, lineHeight: 16, marginTop: 20, paddingHorizontal: 15 },
});
