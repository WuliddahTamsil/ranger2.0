import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MessageSquareWarning, X, Check } from "lucide-react-native";

interface ComplaintModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (category: string, description: string) => Promise<void>;
  orderCode: string;
}

const CATEGORIES = [
  "Barang rusak",
  "Barang hilang",
  "Barang belum sampai",
  "Penerima tidak menerima",
  "Driver bermasalah",
  "Tarif tidak sesuai",
  "Pembayaran bermasalah",
  "Alamat tidak sesuai",
  "Barang dikembalikan",
  "Lainnya",
];

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  visible,
  onClose,
  onSubmit,
  orderCode,
}) => {
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!desc.trim()) {
      alert("Mohon jelaskan detail masalah yang Anda alami.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(selectedCat, desc.trim());
      setDesc("");
      onClose();
    } catch (e: any) {
      alert(e.message || "Gagal mengajukan keluhan.");
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
              <MessageSquareWarning size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Laporkan Masalah Pengiriman</Text>
              <Text style={styles.sub}>Pesanan: {orderCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Pilih Kategori Masalah:</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCat === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedCat(cat)}
                  >
                    {isSelected && <Check size={12} color="#15803D" style={{ marginRight: 4 }} />}
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Penjelasan Masalah:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ceritakan kendala atau kerusakan barang secara detail..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={desc}
              onChangeText={setDesc}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.btn, (!desc.trim() || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!desc.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Kirim Laporan</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  chipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#15803D",
    fontWeight: "800",
  },
  textArea: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 90,
  },
  btn: {
    backgroundColor: "#DC2626",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
