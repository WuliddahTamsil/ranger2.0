import React, { useState } from "react";
import { Alert, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { FileText, ImagePlus, Camera, Trash2, RefreshCw, CheckCircle2, Clock3 } from "lucide-react-native";
import { AuthDocument } from "../authTypes";
import { authColors } from "../authStyles";
import { fileIsAllowed } from "../authValidation";
import { uploadFileToBackend } from "../../../services/api";

interface Props {
  documentKey: string;
  label: string;
  description: string;
  required?: boolean;
  document?: AuthDocument;
  onChange: (document?: AuthDocument) => void;
  compact?: boolean;
}

const buildDocument = (
  key: string,
  label: string,
  uri: string,
  name?: string,
  mimeType?: string,
  size?: number
): AuthDocument => ({
  key,
  label,
  uri,
  name,
  mimeType,
  size,
  status: "pending",
  progress: 100,
});

export const DocumentUploadCard: React.FC<Props> = ({
  documentKey,
  label,
  description,
  required,
  document,
  onChange,
  compact,
}) => {
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
        let remoteUri = asset.uri;
        try {
          const uploadRes = await uploadFileToBackend(
            asset.uri,
            asset.name || `${documentKey}.jpg`,
            asset.mimeType || "image/jpeg"
          );
          if (uploadRes?.success && uploadRes?.data?.url) {
            remoteUri = uploadRes.data.url;
          }
        } catch (uploadErr) {
          console.warn("Upload to backend failed, keeping local uri:", uploadErr);
        }

        const selected = buildDocument(
          documentKey,
          label,
          remoteUri,
          asset.name,
          asset.mimeType,
          asset.size
        );
        if (!fileIsAllowed(selected)) {
          Alert.alert("Format tidak didukung", "Gunakan berkas JPG, JPEG, PNG, atau PDF maksimal 10 MB.");
          return;
        }
        onChange(selected);
        return;
      }

      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Izin Dibutuhkan", "Izinkan akses kamera atau galeri untuk mengunggah dokumen Anda.");
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              base64: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              base64: true,
            });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      let remoteUri = "";
      try {
        const uploadRes = await uploadFileToBackend(
          asset.uri,
          asset.fileName || `${documentKey}.jpg`,
          asset.mimeType || "image/jpeg",
          asset.base64 || undefined
        );
        if (uploadRes?.success && uploadRes?.data?.url) {
          remoteUri = uploadRes.data.url;
        }
      } catch (uploadErr) {
        console.warn("Upload to backend note, using local fallback:", uploadErr);
      }
      if (!remoteUri) {
        remoteUri = asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri;
      }

      const selected = buildDocument(
        documentKey,
        label,
        remoteUri,
        asset.fileName || undefined,
        asset.mimeType,
        asset.fileSize
      );
      if (!fileIsAllowed(selected)) {
        Alert.alert("Ukuran File Terlalu Besar", "Gunakan gambar JPG, JPEG, atau PNG maksimal 10 MB.");
        return;
      }
      onChange(selected);
    } finally {
      setUploading(false);
    }
  };

  const chooseSource = () => {
    if (Platform.OS === "web") {
      void accept("file");
      return;
    }
    setSourceMenuVisible(true);
  };

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.headingRow}>
        <View style={styles.icon}>
          <FileText size={17} color={authColors.primary} />
        </View>
        <View style={styles.headingText}>
          <View style={styles.labelRow}>
            <Text style={styles.title}>{label}</Text>
            {required ? (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Wajib</Text>
              </View>
            ) : (
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Opsional</Text>
              </View>
            )}
          </View>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      {document ? (
        <View style={styles.fileRow}>
          {document.mimeType === "application/pdf" ? (
            <View style={styles.pdfPreview}>
              <FileText size={22} color={authColors.primary} />
            </View>
          ) : (
            <Image source={{ uri: document.uri }} style={styles.preview} />
          )}
          <View style={styles.fileInfo}>
            <Text numberOfLines={1} style={styles.fileName}>
              {document.name || `${label}.jpg`}
            </Text>
            <View style={styles.statusRow}>
              <CheckCircle2 size={13} color={authColors.primary} />
              <Text style={styles.statusText}>Dokumen siap diverifikasi</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => onChange(undefined)}
            style={styles.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Trash2 size={17} color={authColors.danger} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={chooseSource}
            style={styles.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <RefreshCw size={17} color={authColors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={chooseSource}
          style={styles.uploadButton}
          disabled={uploading}
          activeOpacity={0.75}
        >
          <View style={styles.uploadIcon}>
            <ImagePlus size={18} color={authColors.primary} />
          </View>
          <View style={styles.uploadText}>
            <Text style={styles.uploadTitle}>
              {uploading ? "Sedang Mengunggah..." : "Pilih / Unggah Berkas"}
            </Text>
            <Text style={styles.uploadHint}>Format JPG, PNG, atau PDF (maksimal 10 MB)</Text>
          </View>
          <Camera size={17} color={authColors.subtle} />
        </TouchableOpacity>
      )}

      {document && document.status === "pending" && (
        <View style={styles.reviewRow}>
          <Clock3 size={12} color={authColors.warning} />
          <Text style={styles.reviewText}>Status: Menunggu verifikasi admin saat pengajuan</Text>
        </View>
      )}

      <Modal
        visible={sourceMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSourceMenuVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sourceSheet}>
            <Text style={styles.sourceTitle}>Unggah {label}</Text>
            <Text style={styles.sourceDescription}>
              Pilih sumber dokumen yang tersedia di perangkat Anda.
            </Text>
            <TouchableOpacity
              style={styles.sourceOption}
              onPress={() => void accept("file")}
              activeOpacity={0.8}
            >
              <View style={styles.sourceIcon}>
                <FileText size={18} color={authColors.primary} />
              </View>
              <View style={styles.sourceText}>
                <Text style={styles.sourceOptionTitle}>Pilih Berkas / Dokumen</Text>
                <Text style={styles.sourceOptionHint}>Unggah dokumen PDF atau foto dari penyimpanan</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sourceOption}
              onPress={() => void accept("gallery")}
              activeOpacity={0.8}
            >
              <View style={styles.sourceIcon}>
                <ImagePlus size={18} color={authColors.primary} />
              </View>
              <View style={styles.sourceText}>
                <Text style={styles.sourceOptionTitle}>Galeri Foto</Text>
                <Text style={styles.sourceOptionHint}>Pilih foto dokumen yang sudah tersimpan di galeri</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sourceOption}
              onPress={() => void accept("camera")}
              activeOpacity={0.8}
            >
              <View style={styles.sourceIcon}>
                <Camera size={18} color={authColors.primary} />
              </View>
              <View style={styles.sourceText}>
                <Text style={styles.sourceOptionTitle}>Ambil Foto dengan Kamera</Text>
                <Text style={styles.sourceOptionHint}>Ambil foto fisik dokumen secara langsung</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOption}
              onPress={() => setSourceMenuVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.line,
    padding: 15,
    marginTop: 10,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
      } as any,
    }),
  },
  compact: {
    marginTop: 8,
    padding: 12,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  headingText: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  title: {
    color: authColors.ink,
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  requiredBadge: {
    backgroundColor: authColors.dangerBg,
    borderWidth: 1,
    borderColor: authColors.dangerBorder,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  requiredBadgeText: {
    color: authColors.danger,
    fontSize: 10,
    fontWeight: "700",
  },
  optionalBadge: {
    backgroundColor: authColors.lineLight,
    borderWidth: 1,
    borderColor: authColors.line,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  optionalBadgeText: {
    color: authColors.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  description: {
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  uploadButton: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.line,
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    marginTop: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  uploadIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  uploadText: {
    flex: 1,
  },
  uploadTitle: {
    color: authColors.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
  uploadHint: {
    color: authColors.subtle,
    fontSize: 11,
    marginTop: 2,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: authColors.line,
    borderRadius: 10,
    padding: 8,
  },
  preview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: authColors.lineLight,
  },
  pdfPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  fileName: {
    color: authColors.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  statusText: {
    color: authColors.primary,
    fontSize: 11,
    fontWeight: "500",
  },
  iconButton: {
    padding: 6,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  reviewText: {
    color: authColors.warning,
    fontSize: 11,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sourceSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 30,
  },
  sourceTitle: {
    color: authColors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  sourceDescription: {
    color: authColors.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: authColors.line,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  sourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: authColors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sourceText: {
    flex: 1,
  },
  sourceOptionTitle: {
    color: authColors.ink,
    fontSize: 13.5,
    fontWeight: "700",
  },
  sourceOptionHint: {
    color: authColors.muted,
    fontSize: 11.5,
    marginTop: 2,
  },
  cancelOption: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  cancelText: {
    color: authColors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
});
