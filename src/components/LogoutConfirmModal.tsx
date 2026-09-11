import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface LogoutConfirmModalProps {
  visible: boolean;
  roleLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ visible, roleLabel, onCancel, onConfirm }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Konfirmasi Keluar</Text>
        <Text style={styles.message}>Yakin Anda akan keluar dari akun {roleLabel}?</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Tidak</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmText}>Ya</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(15, 23, 42, 0.42)" },
  card: { width: "100%", maxWidth: 360, borderRadius: 20, backgroundColor: "#FFFFFF", padding: 22 },
  title: { color: "#0F172A", fontSize: 18, fontWeight: "800", textAlign: "center" },
  message: { color: "#64748B", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancelButton: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  confirmButton: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626" },
  cancelText: { color: "#475569", fontSize: 14, fontWeight: "700" },
  confirmText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
