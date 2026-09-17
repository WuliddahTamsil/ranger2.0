import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Phone, MessageCircle, ShieldCheck, X } from "lucide-react-native";
import { maskPhoneNumber, callPhone, openWhatsApp } from "../services/callService";

interface SafeCallModalProps {
  visible: boolean;
  onClose: () => void;
  targetName: string;
  targetRole?: string; // e.g. "Driver Rangers" or "Customer"
  targetPhone?: string;
  orderCode?: string;
}

export const SafeCallModal: React.FC<SafeCallModalProps> = ({
  visible,
  onClose,
  targetName,
  targetRole = "Driver Rangers",
  targetPhone,
  orderCode,
}) => {
  const maskedPhone = maskPhoneNumber(targetPhone);

  const handleCall = async () => {
    onClose();
    await callPhone(targetPhone);
  };

  const handleWhatsApp = async () => {
    onClose();
    const msg = orderCode
      ? `Halo ${targetName}, saya menghubungi terkait pesanan #${orderCode} di GEOVERSE Rangers.`
      : `Halo ${targetName}, saya menghubungi dari aplikasi GEOVERSE Rangers.`;
    await openWhatsApp(targetPhone, msg);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Phone size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Hubungi {targetRole}</Text>
                <Text style={styles.subtitle}>{targetName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.securityBanner}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.securityText}>
              Nomor terlindungi: <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
            </Text>
          </View>

          <Text style={styles.desc}>
            Pilih cara Anda ingin berkomunikasi dengan {targetName}. Privasi nomor Anda dan pengemudi selalu dijaga.
          </Text>

          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.85}>
              <Phone size={20} color="#FFFFFF" />
              <View style={styles.btnTextWrapper}>
                <Text style={styles.callBtnText}>Panggilan Telepon</Text>
                <Text style={styles.btnSubtext}>Hubungi langsung lewat pulsa / operator</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waButton} onPress={handleWhatsApp} activeOpacity={0.85}>
              <MessageCircle size={20} color="#FFFFFF" />
              <View style={styles.btnTextWrapper}>
                <Text style={styles.waBtnText}>WhatsApp Chat / Call</Text>
                <Text style={styles.btnSubtext}>Hubungi langsung via aplikasi WhatsApp</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Tutup</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  securityText: {
    fontSize: 12,
    color: "#166534",
  },
  phoneHighlight: {
    fontWeight: "700",
  },
  desc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 18,
  },
  actionContainer: {
    gap: 12,
    marginBottom: 16,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  waButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  btnTextWrapper: {
    flex: 1,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  waBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnSubtext: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
});
