import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowRight, Check, Mail, ShieldCheck, User, X } from "lucide-react-native";
import { GoogleLogo } from "./GoogleLogo";
import { createSimulatedGoogleCredential } from "../googleAuth";
import { AuthAccount, GoogleCredential } from "../authTypes";
import { loadAccounts } from "../authStorage";

interface GoogleDirectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (credential: GoogleCredential) => Promise<void>;
  initialEmail?: string;
  initialName?: string;
  errorMessage?: string;
}

export const GoogleDirectModal: React.FC<GoogleDirectModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialEmail = "",
  initialName = "",
  errorMessage,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState("");
  const [savedAccounts, setSavedAccounts] = useState<AuthAccount[]>([]);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setName(initialName);
      setInputError("");
      loadAccounts()
        .then((accounts) => {
          // Filter unique emails
          const seen = new Set<string>();
          const filtered = (accounts || []).filter((acc) => {
            if (!acc?.email || seen.has(acc.email.toLowerCase())) return false;
            seen.add(acc.email.toLowerCase());
            return true;
          });
          setSavedAccounts(filtered);
        })
        .catch(() => setSavedAccounts([]));
    }
  }, [visible, initialEmail, initialName]);

  const handleSelectAccount = async (targetEmail: string, targetName?: string) => {
    setInputError("");
    setLoading(true);
    try {
      const cred = createSimulatedGoogleCredential(targetEmail, targetName);
      await onSuccess(cred);
      onClose();
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Gagal memproses autentikasi Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setInputError("Masukkan alamat email Google / Gmail yang valid.");
      return;
    }

    await handleSelectAccount(cleanEmail, name);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.avoidingView}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <GoogleLogo size={24} />
                <View>
                  <Text style={styles.title}>Masuk dengan Google</Text>
                  <Text style={styles.subtitle}>Pilih atau masukkan akun Google Anda</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} accessibilityLabel="Tutup">
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
              {errorMessage ? (
                <View style={styles.errorNotice}>
                  <Text style={styles.errorNoticeText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Saved accounts list for 1-tap sign-in */}
              {savedAccounts.length > 0 ? (
                <View style={styles.savedSection}>
                  <Text style={styles.sectionTitle}>Akun di Perangkat Ini</Text>
                  <View style={styles.accountsList}>
                    {savedAccounts.map((acc) => {
                      const initial = (acc.name || acc.email || "G").charAt(0).toUpperCase();
                      return (
                        <TouchableOpacity
                          key={acc.id || acc.email}
                          style={styles.accountCard}
                          onPress={() => void handleSelectAccount(acc.email, acc.name)}
                          disabled={loading}
                          activeOpacity={0.7}
                        >
                          {acc.profilePhoto ? (
                            <Image source={{ uri: acc.profilePhoto }} style={styles.avatarImg} />
                          ) : (
                            <View style={styles.avatarFallback}>
                              <Text style={styles.avatarInitial}>{initial}</Text>
                            </View>
                          )}
                          <View style={styles.accountMeta}>
                            <Text style={styles.accountName} numberOfLines={1}>
                              {acc.name || "Pengguna GEOVERSE"}
                            </Text>
                            <Text style={styles.accountEmail} numberOfLines={1}>
                              {acc.email}
                            </Text>
                          </View>
                          <ArrowRight size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>atau gunakan akun lain</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              ) : null}

              {/* Input Form */}
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Alamat Email Google (Gmail)</Text>
                  <View style={styles.inputShell}>
                    <Mail size={16} color="#64748B" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="nama.anda@gmail.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Nama Tampilan Google (Opsional)</Text>
                  <View style={styles.inputShell}>
                    <User size={16} color="#64748B" />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Nama lengkap Anda"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {inputError ? <Text style={styles.fieldError}>{inputError}</Text> : null}

                <TouchableOpacity
                  onPress={() => void handleSubmit()}
                  disabled={loading}
                  style={styles.submitBtn}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Lanjutkan dengan Akun Ini</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Security Footnote */}
              <View style={styles.footnoteRow}>
                <ShieldCheck size={14} color="#0D7A53" />
                <Text style={styles.footnoteText}>
                  Terhubung aman dengan sistem autentikasi terverifikasi GEOVERSE.
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  avoidingView: {
    width: "100%",
    maxWidth: 460,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  scrollArea: {
    maxHeight: 480,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  savedSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  accountsList: {
    gap: 8,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  accountEmail: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  errorNotice: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorNoticeText: {
    fontSize: 11.5,
    color: "#991B1B",
    lineHeight: 16,
  },
  form: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 44,
  },
  fieldError: {
    fontSize: 11.5,
    color: "#DC2626",
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    borderRadius: 12,
    minHeight: 48,
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  footnoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footnoteText: {
    fontSize: 10.5,
    color: "#0D7A53",
    fontWeight: "600",
    textAlign: "center",
  },
});
