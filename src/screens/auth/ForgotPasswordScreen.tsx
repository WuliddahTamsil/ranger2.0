import React, { useEffect, useRef, useState } from "react";
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
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react-native";
import { Nav } from "../../types";
import { authColors, authStyles } from "./authStyles";
import { validateEmail, validatePassword } from "./authValidation";
import { AuthBrand } from "./components/AuthBrand";

interface Props extends Nav {
  onRequestOtp: (email: string) => Promise<{ ok: boolean; error?: string; devOtp?: string }>;
  onVerifyOtp: (email: string, otp: string) => Promise<{ ok: boolean; resetToken?: string; error?: string }>;
  onResetPassword: (email: string, password: string, resetToken?: string) => Promise<{ ok: boolean; error?: string }>;
}

export const ForgotPasswordScreen: React.FC<Props> = ({
  navigate,
  onRequestOtp,
  onVerifyOtp,
  onResetPassword,
}) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [stage, setStage] = useState<"email" | "otp" | "reset" | "success">("email");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpInputRef = useRef<TextInput>(null);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Stage 1: Request OTP
  const handleRequestOtp = async () => {
    setError("");
    setInfoMessage("");
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError("Alamat email wajib diisi.");
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setError("Masukkan alamat email yang valid (contoh: nama@email.com).");
      return;
    }

    setLoading(true);
    try {
      const result = await onRequestOtp(cleanEmail);
      if (result.ok) {
        setStage("otp");
        setResendTimer(60);
        setInfoMessage("Kode OTP telah dikirimkan ke email Anda. Cek kotak masuk atau folder spam.");
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 400);
      } else {
        setError(result.error || "Gagal mengirimkan kode OTP. Pastikan email terdaftar.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Verify OTP
  const handleVerifyOtp = async () => {
    setError("");
    setInfoMessage("");
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setError("Masukkan 6-digit kode OTP lengkap yang diterima di email.");
      return;
    }

    setLoading(true);
    try {
      const result = await onVerifyOtp(email.toLowerCase().trim(), cleanOtp);
      if (result.ok && result.resetToken) {
        setResetToken(result.resetToken);
        setStage("reset");
        setInfoMessage("Verifikasi kode berhasil. Silakan buat kata sandi baru.");
      } else {
        setError(result.error || "Kode OTP tidak cocok atau sudah kadaluarsa.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await onRequestOtp(email.toLowerCase().trim());
      if (result.ok) {
        setResendTimer(60);
        setOtp("");
        setInfoMessage("Kode OTP baru telah dikirimkan ke email Anda.");
      } else {
        setError(result.error || "Gagal mengirim ulang kode OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Stage 3: Submit New Password
  const handleResetPassword = async () => {
    setError("");
    setInfoMessage("");
    if (!password) {
      setError("Kata sandi baru wajib diisi.");
      return;
    }
    if (!validatePassword(password)) {
      setError("Kata sandi minimal 8 karakter dan harus berisi kombinasi huruf serta angka.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi kata sandi belum cocok dengan kata sandi baru.");
      return;
    }

    setLoading(true);
    try {
      const result = await onResetPassword(email.toLowerCase().trim(), password, resetToken);
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
            {/* Top Navigation */}
            <TouchableOpacity
              onPress={() => navigate("login")}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={authColors.muted} />
              <Text style={styles.backBtnText}>Kembali ke halaman masuk</Text>
            </TouchableOpacity>

            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <AuthBrand size={42} />
            </View>

            {/* Stage Title and Icon */}
            <View style={styles.heading}>
              <View style={styles.iconCircle}>
                <KeyRound size={22} color={authColors.primary} />
              </View>
              <Text style={styles.title}>
                {stage === "success"
                  ? "Kata Sandi Berhasil Diperbarui"
                  : stage === "reset"
                  ? "Buat Kata Sandi Baru"
                  : stage === "otp"
                  ? "Verifikasi Kode OTP"
                  : "Pemulihan Akses Akun"}
              </Text>
              <Text style={styles.subtitle}>
                {stage === "success"
                  ? "Akun Anda telah diamankan. Silakan masuk kembali menggunakan kata sandi baru."
                  : stage === "reset"
                  ? "Buat kata sandi baru yang kuat untuk akun GEOVERSE Anda."
                  : stage === "otp"
                  ? `Masukkan 6-digit kode verifikasi yang telah dikirim ke ${email}.`
                  : "Masukkan alamat email terdaftar untuk menerima kode verifikasi OTP pemulihan kata sandi."}
              </Text>
            </View>

            {/* Info Message Banner */}
            {infoMessage ? (
              <View style={styles.infoBox}>
                <ShieldCheck size={16} color={authColors.primary} />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            ) : null}

            {/* STAGE 1: Email Input */}
            {stage === "email" && (
              <View style={styles.form}>
                <Text style={authStyles.label}>Alamat Email Terdaftar</Text>
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
                    editable={!loading}
                  />
                </View>
                {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}
                <TouchableOpacity
                  onPress={() => void handleRequestOtp()}
                  disabled={loading}
                  style={[authStyles.primaryButton, styles.submitBtn]}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={authStyles.primaryButtonText}>Kirim Kode OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE 2: OTP Input */}
            {stage === "otp" && (
              <View style={styles.form}>
                <TouchableOpacity
                  onPress={() => {
                    setStage("email");
                    setError("");
                    setInfoMessage("");
                  }}
                  style={styles.emailBadge}
                  activeOpacity={0.7}
                >
                  <Mail size={15} color={authColors.primary} />
                  <Text style={[styles.emailBadgeText, { flex: 1 }]}>{email}</Text>
                  <Text style={styles.emailBadgeChange}>Ganti</Text>
                </TouchableOpacity>

                <Text style={authStyles.label}>6-Digit Kode Verifikasi (OTP)</Text>
                
                {/* Visual OTP Boxes - Clickable to focus input */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => otpInputRef.current?.focus()}
                  style={styles.otpBoxesRow}
                  accessibilityRole="button"
                  accessibilityLabel="Kotak kode verifikasi OTP"
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otp[index] || "";
                    const isFocused = otp.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          digit ? styles.otpBoxFilled : null,
                          isFocused ? styles.otpBoxFocused : null,
                        ]}
                      >
                        <Text style={[styles.otpBoxText, !digit && styles.otpPlaceholderDot]}>
                          {digit || "•"}
                        </Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                {/* Direct Accessible Input Field */}
                <View style={styles.otpInputFieldContainer}>
                  <KeyRound size={17} color={authColors.muted} />
                  <TextInput
                    ref={otpInputRef}
                    value={otp}
                    onChangeText={(val) => {
                      const numericOnly = val.replace(/[^0-9]/g, "").slice(0, 6);
                      setOtp(numericOnly);
                    }}
                    style={styles.otpRealInputField}
                    placeholder="Masukkan 6-digit OTP (cth: 570687)"
                    placeholderTextColor={authColors.subtle}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    selectTextOnFocus
                  />
                  {otp.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setOtp("");
                        otpInputRef.current?.focus();
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.clearBtnText}>Hapus</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}

                {/* Resend Action */}
                <View style={styles.resendWrap}>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendCountdown}>
                      Kirim ulang kode dalam <Text style={{ fontWeight: "700" }}>{resendTimer} detik</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => void handleResendOtp()}
                      disabled={loading}
                      style={styles.resendBtn}
                      activeOpacity={0.7}
                    >
                      <RefreshCw size={14} color={authColors.primary} />
                      <Text style={styles.resendBtnText}>Kirim Ulang Kode OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => void handleVerifyOtp()}
                  disabled={loading || otp.length < 6}
                  style={[
                    authStyles.primaryButton,
                    styles.submitBtn,
                    otp.length < 6 && { opacity: 0.6 },
                  ]}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={authStyles.primaryButtonText}>Verifikasi & Lanjutkan</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE 3: New Password */}
            {stage === "reset" && (
              <View style={styles.form}>
                <View style={styles.emailBadge}>
                  <ShieldCheck size={16} color={authColors.primary} />
                  <Text style={[styles.emailBadgeText, { flex: 1 }]}>Akun Terverifikasi: {email}</Text>
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
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={authColors.muted} />
                    ) : (
                      <Eye size={18} color={authColors.muted} />
                    )}
                  </TouchableOpacity>
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
                    secureTextEntry={!showConfirm}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showConfirm ? (
                      <EyeOff size={18} color={authColors.muted} />
                    ) : (
                      <Eye size={18} color={authColors.muted} />
                    )}
                  </TouchableOpacity>
                </View>

                {error ? <Text style={[authStyles.error, styles.errorSpacing]}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={() => void handleResetPassword()}
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

            {/* STAGE 4: Success */}
            {stage === "success" && (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={40} color="#0D7A53" />
                </View>
                <Text style={styles.successTitle}>Akses Berhasil Dipulihkan</Text>
                <Text style={styles.successSub}>
                  Kata sandi baru Anda telah aktif. Anda dapat langsung masuk ke aplikasi menggunakan kredensial baru.
                </Text>
                <TouchableOpacity
                  onPress={() => navigate("login")}
                  style={[authStyles.primaryButton, styles.submitBtn, { width: "100%" }]}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.primaryButtonText}>Masuk ke Akun Sekarang</Text>
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
    paddingHorizontal: Platform.OS === "web" ? 32 : 22,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    color: "#166534",
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
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
    marginTop: 20,
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
  emailBadgeChange: {
    color: authColors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  otpBox: {
    flex: 1,
    height: 54,
    maxWidth: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: authColors.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: authColors.primary,
    backgroundColor: "#F0FDF4",
  },
  otpBoxFocused: {
    borderColor: authColors.primary,
    borderWidth: 2,
    backgroundColor: "#F8FAFC",
  },
  otpBoxText: {
    fontSize: 22,
    fontWeight: "800",
    color: authColors.ink,
  },
  otpPlaceholderDot: {
    color: "#CBD5E1",
    fontSize: 24,
    fontWeight: "400",
  },
  otpInputFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: authColors.line,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 13,
    gap: 10,
    marginBottom: 4,
  },
  otpRealInputField: {
    flex: 1,
    color: authColors.ink,
    fontSize: 15,
    fontWeight: "700",
    height: 46,
    paddingVertical: 0,
    letterSpacing: 2,
  },
  clearBtnText: {
    color: authColors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  resendWrap: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  resendCountdown: {
    fontSize: 12.5,
    color: authColors.muted,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  resendBtnText: {
    fontSize: 13,
    color: authColors.primaryDark,
    fontWeight: "700",
  },
  successBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    color: authColors.ink,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  successSub: {
    color: authColors.muted,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 8,
  },
});
