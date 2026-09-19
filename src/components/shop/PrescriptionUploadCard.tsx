import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Camera, Upload, HeartPulse, CheckCircle2, XCircle, Clock } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadFileToBackend } from "../../services/api";

interface PrescriptionUploadCardProps {
  prescription?: any;
  onUploaded: (prescriptionData: {
    imageUrls: string[];
    doctorName: string;
    customerNotes: string;
  }) => void;
}

export const PrescriptionUploadCard: React.FC<PrescriptionUploadCardProps> = ({
  prescription,
  onUploaded,
}) => {
  const [images, setImages] = useState<string[]>(prescription?.imageUrls || []);
  const [doctorName, setDoctorName] = useState(prescription?.doctorName || "");
  const [notes, setNotes] = useState(prescription?.customerNotes || "");
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Akses", "Izin akses galeri foto diperlukan untuk mengunggah resep.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUploading(true);
        // Upload to backend or use local preview
        const uploadRes = await uploadFileToBackend(uri, "prescription.jpg", "image/jpeg");

        const finalUrl = uploadRes?.url || uri;
        const newImages = [...images, finalUrl];
        setImages(newImages);
        onUploaded({ imageUrls: newImages, doctorName, customerNotes: notes });
      }
    } catch (e: any) {
      console.warn("Upload prescription error:", e);
      Alert.alert("Gagal", "Gagal memproses gambar resep.");
    } finally {
      setUploading(false);
    }
  };

  const status = prescription?.status || (images.length > 0 ? "WAITING_PRESCRIPTION_REVIEW" : "NONE");

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBg}>
          <HeartPulse size={18} color="#0284C7" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Resep Dokter (Wajib untuk Obat Keras)</Text>
          <Text style={styles.sub}>Diverifikasi oleh apoteker berlisensi SIPA resmi.</Text>
        </View>
      </View>

      {/* Status Banner */}
      {status === "APPROVED" && (
        <View style={[styles.statusBox, styles.statusApproved]}>
          <CheckCircle2 size={16} color="#15803D" />
          <Text style={styles.statusApprovedText}>Resep Disetujui oleh {prescription?.pharmacistName || "Apoteker"}</Text>
        </View>
      )}

      {status === "REJECTED" && (
        <View style={[styles.statusBox, styles.statusRejected]}>
          <XCircle size={16} color="#DC2626" />
          <Text style={styles.statusRejectedText}>
            Ditolak: {prescription?.rejectionReason || "Resep tidak valid"}
          </Text>
        </View>
      )}

      {status === "WAITING_PRESCRIPTION_REVIEW" && (
        <View style={[styles.statusBox, styles.statusWaiting]}>
          <Clock size={16} color="#D97706" />
          <Text style={styles.statusWaitingText}>Menunggu Verifikasi Apoteker</Text>
        </View>
      )}

      {/* Image Preview / Upload Area */}
      {images.length > 0 ? (
        <View style={styles.previewRow}>
          {images.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={styles.previewImage} />
          ))}
          <TouchableOpacity style={styles.addMoreBtn} onPress={handlePickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <>
                <Camera size={18} color="#0284C7" />
                <Text style={styles.addMoreText}>+ Foto</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handlePickImage}
          disabled={uploading}
          activeOpacity={0.7}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#0284C7" />
          ) : (
            <>
              <Upload size={24} color="#0284C7" />
              <Text style={styles.uploadTitle}>Unggah Foto Lembar Resep</Text>
              <Text style={styles.uploadSub}>Format JPG/PNG, pastikan tulisan dokter terbaca jelas</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Inputs */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nama Dokter / Rumah Sakit (Opsional)"
          placeholderTextColor="#9CA3AF"
          value={doctorName}
          onChangeText={(val) => {
            setDoctorName(val);
            if (images.length > 0) onUploaded({ imageUrls: images, doctorName: val, customerNotes: notes });
          }}
        />
        <TextInput
          style={[styles.input, { marginTop: 6 }]}
          placeholder="Catatan untuk Apoteker (Keluhan / Alergi)"
          placeholderTextColor="#9CA3AF"
          value={notes}
          onChangeText={(val) => {
            setNotes(val);
            if (images.length > 0) onUploaded({ imageUrls: images, doctorName, customerNotes: val });
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0F2FE",
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0369A1",
  },
  sub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusApproved: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
  },
  statusApprovedText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },
  statusRejected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
  },
  statusRejectedText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  statusWaiting: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
  },
  statusWaitingText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#BAE6FD",
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284C7",
    marginTop: 6,
  },
  uploadSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  previewRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    resizeMode: "cover",
  },
  addMoreBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
  },
  addMoreText: {
    fontSize: 10,
    color: "#0284C7",
    fontWeight: "600",
    marginTop: 2,
  },
  inputContainer: {
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#1E293B",
  },
});
