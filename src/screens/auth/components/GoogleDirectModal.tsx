import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, Mail, User, X, Info } from "lucide-react-native";
import { GoogleLogo } from "./GoogleLogo";
import { authColors } from "../authStyles";
import { createSimulatedGoogleCredential } from "../googleAuth";
import { GoogleCredential } from "../authTypes";

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

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setInputError("Masukkan alamat email Google / Gmail yang valid.");
      return;
    }

    setInputError("");
    setLoading(true);
    try {
      const cred = createSimulatedGoogleCredential(cleanEmail, name);
      await onSuccess(cred);
      onClose();
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Gagal memproses autentikasi Google.");
    } finally {
      setLoading(false);
    }
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
                <Text style={styles.title}>Autentikasi Akun Google</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Masuk atau daftar akun GEOVERSE secara instan dengan identitas Google Anda.
            </Text>

            {errorMessage ? (
              <View style={styles.errorNotice}>
                <Info size={14} color="#B91C1C" />
                <Text style={styles.errorNoticeText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Input Form */}
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email Google (Gmail)</Text>
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
                    placeholder="Contoh: Wuliddah Tamsil"
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
                    <Text style={styles.submitBtnText}>Lanjutkan dengan Akun Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Developer Notice */}
            <View style={styles.devNote}>
              <Text style={styles.devNoteTitle}>Catatan Konfigurasi Google Cloud:</Text>
              <Text style={styles.devNoteText}>
                Untuk login popup otomatis langsung di localhost web, pastikan URL{" "}
                <Text style={styles.codeText}>http://localhost:8081</Text> telah didaftarkan pada{" "}
                <Text style={styles.boldText}>Authorized Redirect URIs</Text> di Google Cloud Console.
              </Text>
            </View>
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 14,
  },
  errorNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#991B1B",
    lineHeight: 15,
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
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#166534",
    borderRadius: 12,
    minHeight: 48,
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  devNote: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  devNoteTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  devNoteText: {
    fontSize: 10.5,
    color: "#64748B",
    lineHeight: 15,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#059669",
    fontWeight: "700",
  },
  boldText: {
    fontWeight: "700",
    color: "#1E293B",
  },
});
