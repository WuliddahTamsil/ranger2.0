import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import { uploadFileToBackend } from "../services/api";
import { saveProfilePhoto } from "../screens/auth/authService";
import { useResponsiveLayout } from "../utils/responsive";

interface ProfilePhotoEditorProps {
  userId?: string;
  name?: string;
  photoUri?: string | null;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  onSaved: (photoUri: string) => void;
}

export const ProfilePhotoEditor: React.FC<ProfilePhotoEditorProps> = ({
  userId,
  name,
  photoUri,
  size = 96,
  backgroundColor = "#E8F5EE",
  iconColor = "#1B7A4E",
  onSaved,
}) => {
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { bottomInset } = useResponsiveLayout();
  const initial = name?.trim().charAt(0).toUpperCase() || "?";

  const showError = (message: string) => {
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert("Foto profil", message);
  };

  const selectPhoto = async (source: "gallery" | "camera") => {
    setSourceModalVisible(false);
    try {
      if (source === "gallery") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showError("Izin galeri diperlukan untuk memilih foto profil.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showError("Izin kamera diperlukan untuk mengambil foto profil.");
          return;
        }
      }

      const result = source === "gallery"
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setIsUploading(true);
      const extension = asset.fileName?.split(".").pop() || "jpg";
      const fileName = `profile-${userId || Date.now()}.${extension}`;
      const uploadResult = await uploadFileToBackend(asset.uri, fileName, asset.mimeType || "image/jpeg");
      const uploadedUri = uploadResult?.data?.url || uploadResult?.url;
      if (!uploadedUri) throw new Error("URL foto dari server tidak tersedia.");

      if (userId) {
        const saved = await saveProfilePhoto(userId, uploadedUri);
        if (!saved.success && !saved.savedLocally) {
          throw new Error(saved.message || "Foto gagal disimpan ke database.");
        }
        if (!saved.success && saved.savedLocally) {
          onSaved(uploadedUri);
          showError("Server belum tersambung. Foto disimpan di perangkat, tetapi belum masuk database.");
          return;
        }
      }

      onSaved(uploadedUri);
      if (Platform.OS === "web") window.alert("Foto profil berhasil diperbarui.");
      else Alert.alert("Berhasil", "Foto profil berhasil diperbarui.");
    } catch (error) {
      console.error("Profile photo upload error:", error);
      showError(error instanceof Error ? error.message : "Foto profil gagal disimpan.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <View style={[styles.wrapper, { width: size, height: size }]}>
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
          ) : (
            <Text style={[styles.initial, { color: iconColor, fontSize: size * 0.38 }]}>{initial}</Text>
          )}
          {isUploading && (
            <View style={[styles.loadingOverlay, { borderRadius: size / 2 }]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.cameraButton, { backgroundColor: "#FFFFFF", borderColor: iconColor }]}
          onPress={() => setSourceModalVisible(true)}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          <Camera size={14} color={iconColor} />
        </TouchableOpacity>
      </View>

      <Modal visible={sourceModalVisible} transparent animationType="fade" onRequestClose={() => setSourceModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { paddingBottom: 26 + bottomInset }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ubah foto profil</Text>
              <TouchableOpacity onPress={() => setSourceModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSubtitle}>Pilih foto dari perangkat atau ambil foto baru.</Text>
            <TouchableOpacity style={styles.option} onPress={() => void selectPhoto("gallery")} activeOpacity={0.8}>
              <View style={styles.optionIcon}><ImageIcon size={18} color="#1B7A4E" /></View>
              <Text style={styles.optionText}>Pilih dari galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => void selectPhoto("camera")} activeOpacity={0.8}>
              <View style={styles.optionIcon}><Camera size={18} color="#1B7A4E" /></View>
              <Text style={styles.optionText}>Ambil dengan kamera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: "relative", alignItems: "center", justifyContent: "center" },
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initial: { fontWeight: "800" },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15, 23, 42, 0.48)" },
  cameraButton: { position: "absolute", right: -2, bottom: -1, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.38)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  sheetSubtitle: { color: "#64748B", fontSize: 13, marginTop: 6, marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 14, marginTop: 10 },
  optionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  optionText: { color: "#1E293B", fontSize: 14, fontWeight: "700" },
});
