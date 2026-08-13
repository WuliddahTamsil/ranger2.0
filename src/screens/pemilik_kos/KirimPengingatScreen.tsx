import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import { Nav } from "../../types";
import {
  ArrowLeft,
  MessageCircle,
  MessageSquare,
  Info,
  CheckCircle2,
} from "lucide-react-native";

export const KirimPengingatScreen: React.FC<Nav> = ({ navigate }) => {
  const [method, setMethod] = useState<"whatsapp" | "sms">("whatsapp");
  const [message, setMessage] = useState(
    "Halo Budi Santoso,\n\nIni adalah pengingat bahwa pembayaran untuk kamar 04 (Ahmad) dengan total Rp1.500.000 telah jatuh tempo hari ini (12 Juli 2026).\n\nMohon segera lakukan pembayaran. Terima kasih!"
  );
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("pemilik_kos_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kirim Pengingat</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section: Pilih Metode Pengiriman */}
        <Text style={styles.sectionTitle}>Pilih Metode Pengiriman</Text>

        <View style={styles.methodList}>
          {/* WhatsApp Option */}
          <TouchableOpacity
            style={[styles.methodCard, method === "whatsapp" && styles.methodCardSelected]}
            onPress={() => setMethod("whatsapp")}
            activeOpacity={0.85}
          >
            <View style={[styles.methodIconBg, method === "whatsapp" && { backgroundColor: "#DCFCE7" }]}>
              <MessageCircle size={22} color={method === "whatsapp" ? "#0D7A53" : "#6B7280"} />
            </View>

            <View style={styles.methodTextCol}>
              <Text style={styles.methodTitle}>WhatsApp</Text>
              <Text style={styles.methodSub}>Kirim pengingat melalui WhatsApp</Text>
            </View>

            <View style={[styles.radioOuter, method === "whatsapp" && styles.radioOuterSelected]}>
              {method === "whatsapp" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* SMS Option */}
          <TouchableOpacity
            style={[styles.methodCard, method === "sms" && styles.methodCardSelected]}
            onPress={() => setMethod("sms")}
            activeOpacity={0.85}
          >
            <View style={[styles.methodIconBg, method === "sms" && { backgroundColor: "#DCFCE7" }]}>
              <MessageSquare size={20} color={method === "sms" ? "#0D7A53" : "#6B7280"} />
            </View>

            <View style={styles.methodTextCol}>
              <Text style={styles.methodTitle}>SMS</Text>
              <Text style={styles.methodSub}>Kirim pengingat melalui SMS</Text>
            </View>

            <View style={[styles.radioOuter, method === "sms" && styles.radioOuterSelected]}>
              {method === "sms" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Pesan Pengingat */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pesan Pengingat</Text>

        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textAreaInput}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.charCountText}>{message.length}/200</Text>
        </View>

        {/* Notice Box Tips */}
        <View style={styles.tipsBox}>
          <Info size={16} color="#D97706" style={{ marginTop: 1 }} />
          <Text style={styles.tipsText}>
            Tips: Pesan akan dikirim secara personal ke penghuni.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.btnKirim}
          onPress={() => setIsSuccessModalOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnKirimText}>Kirim Pengingat</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={isSuccessModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <View style={styles.circleIconGreen}>
              <CheckCircle2 size={36} color="#0D7A53" />
            </View>

            <Text style={styles.dialogTitle}>Pengingat Terkirim!</Text>

            <Text style={styles.dialogDesc}>
              Pesan pengingat tagihan telah berhasil dikirim ke <Text style={{ fontWeight: "800", color: "#111827" }}>Budi Santoso</Text> melalui {method === "whatsapp" ? "WhatsApp" : "SMS"}.
            </Text>

            <TouchableOpacity
              style={styles.btnDialogGreen}
              onPress={() => {
                setIsSuccessModalOpen(false);
                navigate("pemilik_kos_home");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnDialogGreenText}>Kembali ke Dasbor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  methodList: {
    gap: 12,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 14,
  },
  methodCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
  },
  methodIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  methodTextCol: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  methodSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#0D7A53",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0D7A53",
  },

  textAreaContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  textAreaInput: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 22,
    minHeight: 140,
    textAlignVertical: "top",
  },
  charCountText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 8,
  },

  tipsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  btnKirim: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnKirimText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  circleIconGreen: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  dialogDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnDialogGreen: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDialogGreenText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
