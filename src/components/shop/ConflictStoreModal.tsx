import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { AlertTriangle, Store, ArrowRight, X } from "lucide-react-native";
import { useShopCart } from "../../context/ShopCartContext";

export const ConflictStoreModal: React.FC = () => {
  const {
    conflictModal,
    resolveConflictKeepCurrent,
    resolveConflictReplaceStore,
    resolveConflictCancel,
  } = useShopCart();

  if (!conflictModal.visible) return null;

  return (
    <Modal visible={conflictModal.visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={32} color="#D97706" />
          </View>

          <Text style={styles.title}>Ganti Toko Belanja?</Text>
          <Text style={styles.desc}>
            Keranjang kamu saat ini berisi produk dari{" "}
            <Text style={styles.boldText}>{conflictModal.currentStoreName}</Text>. Untuk menjaga kesegaran dan
            efisiensi pengantaran, satu pesanan hanya bisa berasal dari satu toko.
          </Text>

          {conflictModal.newStore && (
            <View style={styles.storeCompareBox}>
              <View style={styles.storeMiniRow}>
                <Store size={16} color="#15803D" />
                <Text style={styles.storeMiniText} numberOfLines={1}>
                  Toko Baru: {conflictModal.newStore.name}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, styles.btnReplace]}
            onPress={resolveConflictReplaceStore}
            activeOpacity={0.8}
          >
            <Text style={styles.btnReplaceText}>Ganti dengan Toko Baru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnKeep]}
            onPress={resolveConflictKeepCurrent}
            activeOpacity={0.8}
          >
            <Text style={styles.btnKeepText}>Pertahankan Keranjang Ini</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnCancel}
            onPress={resolveConflictCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.btnCancelText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: "700",
    color: "#1F2937",
  },
  storeCompareBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 20,
  },
  storeMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  storeMiniText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
    flex: 1,
  },
  btn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  btnReplace: {
    backgroundColor: "#15803D",
  },
  btnReplaceText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  btnKeep: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  btnKeepText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  btnCancel: {
    paddingVertical: 8,
  },
  btnCancelText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
});
