import React, { useState } from "react";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { exchangeCodeAsync } from "expo-auth-session";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react-native";
import { Nav } from "../../types";
import { GoogleCredential } from "./authTypes";
import { authColors, authStyles } from "./authStyles";
import { getGoogleRedirectUri, googleClientIds } from "./googleAuth";
import { AuthBrand } from "./components/AuthBrand";
import { GoogleLogo } from "./components/GoogleLogo";

WebBrowser.maybeCompleteAuthSession();

interface Props extends Nav {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onGoogleLogin: (credential: GoogleCredential) => Promise<void>;
  loginReason?: string;
  onCancel?: () => void;
}

export const LoginScreen: React.FC<Props> = ({
  navigate,
  onLogin,
  onGoogleLogin,
  loginReason,
  onCancel,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("c_home");
    }
  };

  const submit = async () => {
    setError("");
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail) {
      setError("Email wajib diisi.");
      return;
    }
    if (!cleanPassword) {
      setError("Kata sandi wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const result = await onLogin(cleanEmail, cleanPassword);
      if (!result.ok) {
        setError(result.error || "Email atau kata sandi yang Anda masukkan belum tepat.");
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
          <View style={styles.cardContainer}>
            {/* Top Navigation / Cancellation */}
            <View style={styles.topNavRow}>
              <TouchableOpacity
                onPress={handleCancel}
                activeOpacity={0.7}
                style={styles.cancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke beranda"
              >
                <ArrowLeft size={16} color={authColors.ink} />
                <Text style={styles.cancelBtnText}>Kembali</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancel}
                activeOpacity={0.7}
                style={styles.guestBadgeBtn}
              >
                <Text style={styles.guestBadgeText}>Jelajah Tamu</Text>
              </TouchableOpacity>
            </View>

            {/* Header Brand */}
            <View style={styles.brandHeader}>
              <AuthBrand size={44} />
            </View>

            {/* Contextual Reason Banner when login is prompted */}
            {loginReason ? (
              <View style={styles.reasonCard}>
                <View style={styles.reasonIconBox}>
                  <LockKeyhole size={16} color="#0D7A53" />
                </View>
                <View style={styles.reasonTextBox}>
                  <Text style={styles.reasonTitle}>Fitur Memerlukan Akun</Text>
                  <Text style={styles.reasonBody}>{loginReason}</Text>
                </View>
              </View>
            ) : null}

            {/* Title & Introduction */}
            <View style={styles.heading}>
              <Text style={styles.title}>Masuk ke Akun</Text>
              <Text style={styles.subtitle}>
                Akses terpadu seluruh layanan mobilitas, UMKM, katering, kos, dan daur ulang Kamojang.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
              <Field
                label="Alamat Email"
                icon={<Mail size={18} color={authColors.muted} />}
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Field
                label="Kata Sandi"
                icon={<LockKeyhole size={18} color={authColors.muted} />}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan kata sandi"
                secureTextEntry={!showPassword}
                right={
                  <TouchableOpacity
                    onPress={() => setShowPassword((value) => !value)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={authColors.muted} />
                    ) : (
                      <Eye size={18} color={authColors.muted} />
                    )}
                  </TouchableOpacity>
                }
              />

              <View style={styles.rowForgot}>
                <TouchableOpacity
                  onPress={() => navigate("auth_forgot_password")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Lupa kata sandi?</Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={authStyles.error}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={submit}
                disabled={loading || googleLoading}
                style={({ pressed }) => [
                  authStyles.primaryButton,
                  styles.submitBtn,
                  pressed && styles.pressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={authStyles.primaryButtonText}>Masuk ke Akun</Text>
                    <ArrowRight size={17} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>

            {/* Divider & Google Login (Hidden on iOS to comply with Apple Guideline 4.8 without Apple Sign In) */}
            {Platform.OS !== "ios" && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>atau lanjutkan dengan</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Official Google Button Only */}
                <GoogleLoginButton
                  disabled={loading}
                  loading={googleLoading}
                  onBusyChange={setGoogleLoading}
                  onLogin={onGoogleLogin}
                  onError={setError}
                />
              </>
            )}

            {/* Registration Callout */}
            <View style={styles.registerSection}>
              <Text style={styles.registerPrompt}>Belum memiliki akun?</Text>
              <TouchableOpacity
                onPress={() => navigate("auth_register_role")}
                style={styles.registerLink}
                activeOpacity={0.7}
              >
                <Text style={styles.registerText}>Daftar Sekarang</Text>
                <ArrowRight size={14} color={authColors.primary} />
              </TouchableOpacity>
            </View>

            {/* Guest Exploration Action */}
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.guestActionBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.guestActionText}>Lanjut Menjelajah sebagai Tamu</Text>
            </TouchableOpacity>

            {/* Professional Security Footer */}
            <View style={styles.footerWrap}>
              <View style={styles.securityBadge}>
                <ShieldCheck size={14} color={authColors.primary} />
                <Text style={styles.securityText}>Enkripsi Keamanan Enterprise</Text>
              </View>
              <Text style={styles.legal}>
                Dengan masuk, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi GEOVERSE 2.0.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveSafeAreaView>
  );
};

interface GoogleLoginProps {
  disabled?: boolean;
  loading?: boolean;
  onBusyChange: (busy: boolean) => void;
  onLogin: (credential: GoogleCredential) => Promise<void>;
  onError: (error: string) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginProps> = ({
  disabled,
  loading,
  onBusyChange,
  onLogin,
  onError,
}) => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    ...googleClientIds,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    redirectUri: getGoogleRedirectUri(),
  });

  const handledTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken || response.params?.access_token;
      const idToken = response.authentication?.idToken || response.params?.id_token;
      const tokenKey = `${accessToken || ""}_${idToken || ""}`;
      if ((accessToken || idToken) && handledTokenRef.current !== tokenKey) {
        handledTokenRef.current = tokenKey;
        void onLogin({ accessToken, idToken });
      }
    } else if (response?.type === "error") {
      const errorCode = response.params?.error || "";
      const desc = response.params?.error_description || "";
      const userMsg =
        errorCode === "redirect_uri_mismatch"
          ? "Redirect URI sedang dalam penyesuaian di Google Cloud Console."
          : errorCode === "disabled_client"
          ? "Klien Google OAuth dinonaktifkan di Google Cloud Console."
          : `Login Google dibatalkan (${errorCode || "error"}).`;
      onError(desc ? `${userMsg} (${desc})` : userMsg);
    }
  }, [response, onLogin, onError]);

  const handlePress = async () => {
    onError("");
    onBusyChange(true);
    try {
      if (!request) {
        onError("Konfigurasi Google Cloud sedang memuat. Silakan periksa koneksi Anda.");
        return;
      }
      const result = await promptAsync();
      if (result.type === "success") {
        let accessToken: string | undefined = result.authentication?.accessToken || result.params?.access_token;
        let idToken: string | undefined = result.authentication?.idToken || result.params?.id_token;

        if (!accessToken && !idToken && result.params?.code) {
          try {
            const activeId = Platform.OS === "android"
              ? (googleClientIds.androidClientId || googleClientIds.webClientId)
              : Platform.OS === "ios"
                ? (googleClientIds.iosClientId || googleClientIds.webClientId)
                : googleClientIds.webClientId;
            const tokenResult = await exchangeCodeAsync(
              {
                clientId: activeId,
                code: result.params.code,
                redirectUri: getGoogleRedirectUri(),
                extraParams: {
                  code_verifier: request?.codeVerifier || "",
                },
              },
              Google.discovery
            );
            accessToken = tokenResult.accessToken;
            idToken = tokenResult.idToken;
          } catch (exchangeErr) {
            console.warn("Direct code exchange fallback error:", exchangeErr);
          }
        }

        const tokenKey = `${accessToken || ""}_${idToken || ""}`;
        if (accessToken || idToken) {
          if (handledTokenRef.current !== tokenKey) {
            handledTokenRef.current = tokenKey;
            await onLogin({ accessToken, idToken });
          }
        } else if (!result.params?.code) {
          throw new Error("Token autentikasi Google tidak ditemukan.");
        }
      } else if (result.type === "error") {
        const errorCode = result.params?.error || "";
        const desc = result.params?.error_description || "";
        const userMsg =
          errorCode === "redirect_uri_mismatch"
            ? "Redirect URI sedang dalam penyesuaian di Google Cloud Console."
            : errorCode === "disabled_client"
            ? "Klien Google OAuth dinonaktifkan di Google Cloud Console."
            : `Login Google dibatalkan (${errorCode || "error"}).`;
        onError(desc ? `${userMsg} (${desc})` : userMsg);
      }
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Autentikasi Google belum dapat diproses.";
      onError(msg);
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => void handlePress()}
      disabled={disabled || loading}
      style={[authStyles.secondaryButton, styles.googleBtn]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={authColors.primary} size="small" />
      ) : (
        <>
          <GoogleLogo size={19} />
          <Text style={styles.googleBtnText}>Lanjutkan dengan Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const Field: React.FC<
  React.ComponentProps<typeof TextInput> & {
    label: string;
    icon: React.ReactNode;
    right?: React.ReactNode;
  }
> = ({ label, icon, right, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={authStyles.label}>{label}</Text>
      <View style={[styles.inputBox, isFocused && styles.inputBoxFocused]}>
        <View style={styles.fieldIconWrap}>{icon}</View>
        <TextInput
          {...props}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.textInput}
          placeholderTextColor={authColors.subtle}
        />
        {right ? <View style={styles.fieldRightWrap}>{right}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  viewport: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: Platform.OS === "web" ? 28 : 20,
    paddingVertical: 28,
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
  brandHeader: {
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heading: {
    marginBottom: 20,
  },
  title: {
    color: authColors.ink,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
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
  fieldGroup: {
    marginBottom: 16,
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
  },
  inputBoxFocused: {
    borderColor: authColors.primary,
    backgroundColor: "#FAFFFD",
  },
  fieldIconWrap: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: authColors.ink,
    fontSize: 14,
    height: 48,
    paddingVertical: 0,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  fieldRightWrap: {
    marginLeft: 8,
  },
  rowForgot: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    marginBottom: 18,
  },
  forgotText: {
    color: authColors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  errorContainer: {
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: "row",
    gap: 8,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: authColors.line,
  },
  dividerText: {
    color: authColors.muted,
    fontSize: 12,
    fontWeight: "500",
  },
  googleBtn: {
    flexDirection: "row",
    gap: 10,
  },
  googleBtnText: {
    color: authColors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  registerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: authColors.line,
  },
  registerPrompt: {
    color: authColors.muted,
    fontSize: 13.5,
  },
  registerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  registerText: {
    color: authColors.primary,
    fontSize: 13.5,
    fontWeight: "700",
  },
  footerWrap: {
    marginTop: 20,
    alignItems: "center",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  securityText: {
    color: authColors.muted,
    fontSize: 11.5,
    fontWeight: "600",
  },
  legal: {
    textAlign: "center",
    color: authColors.subtle,
    fontSize: 11,
    lineHeight: 16,
  },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: authColors.ink,
  },
  guestBadgeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  guestBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: authColors.primary,
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  reasonIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  reasonTextBox: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  reasonBody: {
    fontSize: 12,
    lineHeight: 17,
    color: "#15803D",
  },
  guestActionBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  guestActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
});
