import React, { useState } from "react";
import { Alert, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { FileText, ImagePlus, Camera, Trash2, RefreshCw, CheckCircle2, Clock3 } from "lucide-react-native";
import { AuthDocument } from "../authTypes";
import { authColors } from "../authStyles";
import { fileIsAllowed } from "../authValidation";

interface Props {
  documentKey: string;
  label: string;
  description: string;
  required?: boolean;
  document?: AuthDocument;
  onChange: (document?: AuthDocument) => void;
  compact?: boolean;
}

const buildDocument = (key: string, label: string, uri: string, name?: string, mimeType?: string, size?: number): AuthDocument => ({
  key,
  label,
  uri,
  name,
  mimeType,
  size,
  status: "pending",
  progress: 100,
});

export const DocumentUploadCard: React.FC<Props> = ({ documentKey, label, description, required, document, onChange, compact }) => {
  const [uploading, setUploading] = useState(false);
  const [sourceMenuVisible, setSourceMenuVisible] = useState(false);

  const accept = async (source: "gallery" | "camera" | "file") => {
    setSourceMenuVisible(false);
    setUploading(true);
    try {
      if (source === "file") {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["image/jpeg", "image/png", "application/pdf"],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const selected = buildDocument(documentKey, label, asset.uri, asset.name, asset.mimeType, asset.size);
        if (!fileIsAllowed(selected)) {
          Alert.alert("Format tidak didukung", "Gunakan JPG, JPEG, PNG, atau PDF maksimal 10 MB.");
          return;
        }
        onChange(selected);
        return;
      }

      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Izin dibutuhkan", "Izinkan akses kamera atau galeri untuk mengunggah dokumen.");
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const selected = buildDocument(documentKey, label, asset.uri, asset.fileName || undefined, asset.mimeType, asset.fileSize);
      if (!fileIsAllowed(selected)) {
        Alert.alert("File terlalu besar", "Gunakan gambar JPG, JPEG, atau PNG maksimal 10 MB.");
        return;
      }
      onChange(selected);
    } finally {
      setUploading(false);
    }
  };

  const chooseSource = () => {
    // React Native Web does not execute action callbacks from Alert.alert.
    // Open the browser/device picker directly so the upload button always works.
    if (Platform.OS === "web") {
      void accept("file");
      return;
    }
    setSourceMenuVisible(true);
  };

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.headingRow}>
        <View style={styles.icon}><FileText size={18} color={authColors.primary} /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>{label} {required ? <Text style={styles.required}>*</Text> : <Text style={styles.optional}>Opsional</Text>}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      {document ? (
        <View style={styles.fileRow}>
          {document.mimeType === "application/pdf" ? <View style={styles.pdfPreview}><FileText size={24} color={authColors.primary} /></View> : <Image source={{ uri: document.uri }} style={styles.preview} />}
          <View style={styles.fileInfo}>
            <Text numberOfLines={1} style={styles.fileName}>{document.name || "Dokumen terpilih"}</Text>
            <View style={styles.statusRow}><CheckCircle2 size={14} color={authColors.primary} /><Text style={styles.statusText}>Siap diverifikasi</Text></View>
          </View>
          <TouchableOpacity onPress={() => onChange(undefined)} style={styles.iconButton}><Trash2 size={18} color={authColors.danger} /></TouchableOpacity>
          <TouchableOpacity onPress={chooseSource} style={styles.iconButton}><RefreshCw size={18} color={authColors.primary} /></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={chooseSource} style={styles.uploadButton} disabled={uploading} activeOpacity={0.75}>
          <View style={styles.uploadIcon}><ImagePlus size={20} color={authColors.primary} /></View>
          <View style={styles.uploadText}><Text style={styles.uploadTitle}>{uploading ? "Mengunggah..." : "Pilih atau ambil dokumen"}</Text><Text style={styles.uploadHint}>JPG, JPEG, PNG, PDF · maks. 10 MB</Text></View>
          <Camera size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
      {document && document.status === "pending" && <View style={styles.reviewRow}><Clock3 size={13} color={authColors.warning} /><Text style={styles.reviewText}>Status: Menunggu verifikasi admin</Text></View>}

      <Modal visible={sourceMenuVisible} transparent animationType="fade" onRequestClose={() => setSourceMenuVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sourceSheet}>
            <Text style={styles.sourceTitle}>Unggah {label}</Text>
            <Text style={styles.sourceDescription}>Pilih sumber berkas yang ingin digunakan.</Text>
            <TouchableOpacity style={styles.sourceOption} onPress={() => void accept("file")} activeOpacity={0.8}>
              <View style={styles.sourceIcon}><FileText size={19} color={authColors.primary} /></View>
              <View style={styles.sourceText}><Text style={styles.sourceOptionTitle}>Berkas / PDF</Text><Text style={styles.sourceOptionHint}>Pilih dari penyimpanan perangkat</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceOption} onPress={() => void accept("gallery")} activeOpacity={0.8}>
              <View style={styles.sourceIcon}><ImagePlus size={19} color={authColors.primary} /></View>
              <View style={styles.sourceText}><Text style={styles.sourceOptionTitle}>Galeri</Text><Text style={styles.sourceOptionHint}>Pilih foto dokumen dari galeri</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceOption} onPress={() => void accept("camera")} activeOpacity={0.8}>
              <View style={styles.sourceIcon}><Camera size={19} color={authColors.primary} /></View>
              <View style={styles.sourceText}><Text style={styles.sourceOptionTitle}>Kamera</Text><Text style={styles.sourceOptionHint}>Ambil foto dokumen sekarang</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelOption} onPress={() => setSourceMenuVisible(false)} activeOpacity={0.8}><Text style={styles.cancelText}>Batal</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: authColors.line, padding: 14, marginTop: 12 },
  compact: { marginTop: 8, padding: 12 },
  headingRow: { flexDirection: "row", alignItems: "flex-start" },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginRight: 10 },
  headingText: { flex: 1 },
  title: { color: authColors.ink, fontSize: 14, fontWeight: "800" },
  required: { color: authColors.danger },
  optional: { color: "#6B7280", fontSize: 11, fontWeight: "500" },
  description: { color: authColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  uploadButton: { minHeight: 62, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#A7D8BE", backgroundColor: "#FAFFFC", marginTop: 12, padding: 10, flexDirection: "row", alignItems: "center" },
  uploadIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginRight: 10 },
  uploadText: { flex: 1 },
  uploadTitle: { color: authColors.primaryDark, fontSize: 13, fontWeight: "800" },
  uploadHint: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  fileRow: { flexDirection: "row", alignItems: "center", marginTop: 12, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 8 },
  preview: { width: 52, height: 52, borderRadius: 9, backgroundColor: "#E5E7EB" },
  pdfPreview: { width: 52, height: 52, borderRadius: 9, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1, marginHorizontal: 10 },
  fileName: { color: authColors.ink, fontSize: 12, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  statusText: { color: authColors.primary, fontSize: 11 },
  iconButton: { padding: 7 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  reviewText: { color: authColors.warning, fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", justifyContent: "flex-end" },
  sourceSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  sourceTitle: { color: authColors.ink, fontSize: 18, fontWeight: "800" },
  sourceDescription: { color: authColors.muted, fontSize: 13, marginTop: 5, marginBottom: 12 },
  sourceOption: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: authColors.line, borderRadius: 14, padding: 12, marginTop: 9 },
  sourceIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: authColors.mint, alignItems: "center", justifyContent: "center", marginRight: 11 },
  sourceText: { flex: 1 },
  sourceOptionTitle: { color: authColors.ink, fontSize: 14, fontWeight: "800" },
  sourceOptionHint: { color: authColors.muted, fontSize: 11, marginTop: 3 },
  cancelOption: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { color: authColors.danger, fontSize: 14, fontWeight: "800" },
});
