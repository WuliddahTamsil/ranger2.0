import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { ShieldCheck, Camera, X, AlertCircle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadFileToBackend } from "../../services/api";

interface DeliveryVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string, proofUrl: string) => Promise<void>;
  recipientName: string;
}

export const DeliveryVerificationModal: React.FC<DeliveryVerificationModalProps> = ({
  visible,
  onClose,
  onVerify,
  recipientName,
}) => {
  const [otp, setOtp] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Izin kamera diperlukan untuk mengambil foto bukti serah terima.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingPhoto(true);
        const uploadedUrl = await uploadFileToBackend(
          result.assets[0].uri,
          `delivery-proof-${Date.now()}.jpg`,
          "image/jpeg"
        );
        setPhotoUri(uploadedUrl || result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Camera pick error:", e);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleConfirm = async () => {
    if (otp.trim().length !== 6) {
      setErrorMsg("Masukkan 6 digit OTP yang diterima oleh penerima.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      await onVerify(otp.trim(), photoUri || "");
      setOtp("");
      setPhotoUri(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Kode OTP salah atau tidak valid.");
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
              <ShieldCheck size={20} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Serah Terima Paket</Text>
              <Text style={styles.sub}>Penerima: {recipientName || "Penerima"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.inputLabel}>Masukkan 6-Digit OTP Penerima:</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 382910"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(val) => {
                setOtp(val);
                setErrorMsg("");
              }}
            />

            <Text style={styles.inputLabel}>Foto Bukti Serah Terima:</Text>
            {photoUri ? (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={handlePickPhoto}
                  disabled={uploadingPhoto}
                >
                  <Text style={styles.retakeText}>Ambil Ulang</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.cameraBox}
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#15803D" />
                ) : (
                  <>
                    <Camera size={24} color="#15803D" />
                    <Text style={styles.cameraText}>Ambil Foto Serah Terima</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {errorMsg ? (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, (otp.length !== 6 || loading) && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnText}>Selesaikan Pengantaran</Text>
              )}
            </TouchableOpacity>
          </View>
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
  cameraBox: {
    height: 80,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    borderStyle: "dashed",
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cameraText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  photoPreviewWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photoPreview: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  retakeBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
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
});
