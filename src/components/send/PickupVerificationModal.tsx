import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { KeyRound, X, AlertCircle } from "lucide-react-native";

interface PickupVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  isDriver?: boolean;
  pickupCodeDisplay?: string;
}

export const PickupVerificationModal: React.FC<PickupVerificationModalProps> = ({
  visible,
  onClose,
  onVerify,
  isDriver = false,
  pickupCodeDisplay = "",
}) => {
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (inputCode.trim().length !== 6) {
      setErrorMsg("Masukkan 6 digit kode verifikasi pickup.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      await onVerify(inputCode.trim());
      setInputCode("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Kode pickup tidak cocok.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <KeyRound size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Verifikasi Pengambilan Paket</Text>
              <Text style={styles.sub}>
                {isDriver
                  ? "Minta kode pickup dari pengirim barang"
                  : "Berikan kode ini ke driver saat penjemputan"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isDriver ? (
            <View style={styles.body}>
              <Text style={styles.inputLabel}>Masukkan 6 Digit Kode Pickup:</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 849201"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={inputCode}
                onChangeText={(val) => {
                  setInputCode(val);
                  setErrorMsg("");
                }}
              />

              {errorMsg ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={14} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btn, (!inputCode || loading) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!inputCode || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>Konfirmasi Pickup</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.customerBody}>
              <Text style={styles.codeSubtitle}>KODE PICKUP ANDA</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{pickupCodeDisplay || "------"}</Text>
              </View>
              <Text style={styles.hintText}>
                Tunjukkan kode ini kepada Driver saat mengambil barang untuk keamanan.
              </Text>
              <TouchableOpacity style={styles.btnDone} onPress={onClose}>
                <Text style={styles.btnDoneText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    height: 52,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8,
    color: "#0F172A",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  btn: {
    backgroundColor: "#15803D",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  customerBody: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  codeSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1,
  },
  codeBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#86EFAC",
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 6,
  },
  hintText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 280,
  },
  btnDone: {
    backgroundColor: "#F1F5F9",
    width: "100%",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDoneText: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
  },
});
