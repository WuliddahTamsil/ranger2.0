import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Check, ChevronRight, MapPin, Plus, X } from "lucide-react-native";
import { CustomerAddress } from "../types";
import { AuthAccount } from "../screens/auth/authTypes";
import { parseCustomerAddresses } from "../services/customerAddressService";

interface CustomerAddressSelectorProps {
  authAccount?: AuthAccount | null;
  selectedAddress?: CustomerAddress;
  onChange: (address: CustomerAddress) => void;
  onManageAddresses: () => void;
}

export const CustomerAddressSelector: React.FC<CustomerAddressSelectorProps> = ({
  authAccount,
  selectedAddress,
  onChange,
  onManageAddresses,
}) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const addresses = useMemo(() => parseCustomerAddresses(authAccount), [authAccount]);

  return (
    <>
      <TouchableOpacity style={styles.selectedCard} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <View style={styles.iconBox}><MapPin size={18} color="#1B7A4E" /></View>
        <View style={styles.selectedCopy}>
          <View style={styles.selectedTitleRow}>
            <Text style={styles.selectedTitle}>{selectedAddress?.label || "Alamat Pengiriman"}</Text>
            {selectedAddress?.isMain && <Text style={styles.mainBadge}>UTAMA</Text>}
          </View>
          <Text style={styles.receiver} numberOfLines={1}>{selectedAddress?.receiverName || "Belum ada alamat tersimpan"}{selectedAddress?.phoneNumber ? ` · ${selectedAddress.phoneNumber}` : ""}</Text>
          <Text style={styles.address} numberOfLines={2}>{selectedAddress?.fullAddress || "Tambahkan alamat untuk melanjutkan pesanan"}</Text>
          {selectedAddress?.latitude !== undefined && selectedAddress.longitude !== undefined && <Text style={styles.locationReady}>● Lokasi peta tersedia</Text>}
        </View>
        <View style={styles.changeAction}><Text style={styles.changeText}>Ubah</Text><ChevronRight size={16} color="#1B7A4E" /></View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <ResponsiveSafeAreaView style={styles.sheet} edges={["bottom"]}>
            <View style={styles.sheetHeader}>
              <View><Text style={styles.sheetTitle}>Pilih Alamat Pengiriman</Text><Text style={styles.sheetSubtitle}>{addresses.length}/3 alamat tersimpan</Text></View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}><X size={19} color="#0F172A" /></TouchableOpacity>
            </View>
            {addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><MapPin size={25} color="#1B7A4E" /></View>
                <Text style={styles.emptyTitle}>Belum ada alamat</Text>
                <Text style={styles.emptyText}>Tambahkan alamat utama sebelum melanjutkan checkout.</Text>
                <TouchableOpacity style={styles.manageButton} onPress={() => { setVisible(false); onManageAddresses(); }}><Plus size={16} color="#FFFFFF" /><Text style={styles.manageButtonText}>Tambah alamat</Text></TouchableOpacity>
              </View>
            ) : (
              <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Math.max(18, insets.bottom + 8) }]} showsVerticalScrollIndicator={false}>
                {addresses.map((address) => {
                  const selected = selectedAddress?.id === address.id;
                  return (
                    <Pressable
                      key={address.id}
                      style={[styles.optionCard, selected && styles.optionCardSelected]}
                      onPress={() => { onChange(address); setVisible(false); }}
                    >
                      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><MapPin size={16} color={selected ? "#FFFFFF" : "#1B7A4E"} /></View>
                      <View style={styles.optionCopy}>
                        <View style={styles.selectedTitleRow}><Text style={styles.optionLabel}>{address.label}</Text>{address.isMain && <Text style={styles.mainBadge}>UTAMA</Text>}</View>
                        <Text style={styles.optionReceiver}>{address.receiverName} · {address.phoneNumber}</Text>
                        <Text style={styles.optionAddress} numberOfLines={3}>{address.fullAddress}</Text>
                        {address.latitude !== undefined && address.longitude !== undefined && <Text style={styles.locationReady}>● Lokasi peta tersedia</Text>}
                      </View>
                      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View>
                    </Pressable>
                  );
                })}
                <TouchableOpacity style={styles.manageLink} onPress={() => { setVisible(false); onManageAddresses(); }}><Plus size={16} color="#1B7A4E" /><Text style={styles.manageLinkText}>Kelola atau tambah alamat</Text></TouchableOpacity>
              </ScrollView>
            )}
          </ResponsiveSafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectedCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#DCE8E1", padding: 13 },
  iconBox: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center" },
  selectedCopy: { flex: 1, minWidth: 0 },
  selectedTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  selectedTitle: { color: "#10251B", fontSize: 13, fontWeight: "900" },
  mainBadge: { color: "#1B7A4E", backgroundColor: "#EAF7EF", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, fontSize: 8, fontWeight: "900", letterSpacing: 0.3 },
  receiver: { color: "#475569", fontSize: 10, fontWeight: "700", marginTop: 5 },
  address: { color: "#64748B", fontSize: 11, lineHeight: 16, marginTop: 3 },
  locationReady: { color: "#1B7A4E", fontSize: 10, fontWeight: "800", marginTop: 5 },
  changeAction: { flexDirection: "row", alignItems: "center", gap: 1, paddingTop: 5 },
  changeText: { color: "#1B7A4E", fontSize: 11, fontWeight: "900" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  sheet: { maxHeight: "78%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 15 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F4" },
  sheetTitle: { color: "#10251B", fontSize: 16, fontWeight: "900" },
  sheetSubtitle: { color: "#718096", fontSize: 10, marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#F5F7F9", alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  optionCard: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: "#E4EBE7", backgroundColor: "#FFFFFF" },
  optionCardSelected: { borderColor: "#77BE94", backgroundColor: "#F4FBF6" },
  optionIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center" },
  optionIconSelected: { backgroundColor: "#1B7A4E" },
  optionCopy: { flex: 1, minWidth: 0 },
  optionLabel: { color: "#10251B", fontSize: 13, fontWeight: "900" },
  optionReceiver: { color: "#475569", fontSize: 10, fontWeight: "700", marginTop: 5 },
  optionAddress: { color: "#64748B", fontSize: 11, lineHeight: 16, marginTop: 3 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginTop: 5 },
  radioSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  manageLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  manageLinkText: { color: "#1B7A4E", fontSize: 12, fontWeight: "900" },
  emptyState: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: "#10251B", fontSize: 15, fontWeight: "900" },
  emptyText: { color: "#718096", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 5, marginBottom: 16 },
  manageButton: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 42, borderRadius: 12, backgroundColor: "#1B7A4E", paddingHorizontal: 15 },
  manageButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
});

