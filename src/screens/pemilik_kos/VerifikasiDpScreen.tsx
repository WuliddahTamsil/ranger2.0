import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
} from "react-native";
import { Nav } from "../../types";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Search,
  AlertTriangle,
  X,
} from "lucide-react-native";

export const VerifikasiDpScreen: React.FC<Nav> = ({ navigate }) => {
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

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
        <Text style={styles.headerTitle}>Verifikasi DP</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Notice Box */}
        <View style={styles.noticeBoxTop}>
          <CheckCircle2 size={20} color="#0D7A53" style={styles.noticeIcon} />
          <Text style={styles.noticeTextTop}>
            Pastikan DP sesuai dengan jumlah dan bukti pembayaran yang diterima dari penghuni.
          </Text>
        </View>

        {/* Card 1: Detail Booking */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBg}>
              <FileText size={18} color="#0D7A53" />
            </View>
            <Text style={styles.cardTitle}>Detail Booking</Text>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Penghuni</Text>
              <Text style={styles.infoValueBold}>Budi Santoso</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipe Kamar</Text>
              <Text style={styles.infoValueBold}>Kos Putra</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kamar</Text>
              <Text style={styles.infoValueBold}>04 (Ahmad)</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Booking</Text>
              <Text style={styles.infoValueBold}>12 Juli 2026</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Harga</Text>
              <Text style={styles.infoValueBold}>Rp1.500.000</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jumlah DP</Text>
              <Text style={[styles.infoValueBold, { color: "#0D7A53", fontSize: 15 }]}>
                Rp750.000 <Text style={styles.percentText}>(50%)</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Card 2: Detail Pembayaran DP */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBg}>
              <FileText size={18} color="#0D7A53" />
            </View>
            <Text style={styles.cardTitle}>Detail Pembayaran DP</Text>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Transfer</Text>
              <Text style={styles.infoValueBold}>12 Juli 2026, 10:45</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Metode Pembayaran</Text>
              <Text style={styles.infoValueBold}>Transfer Bank (BCA)</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dari Rekening</Text>
              <Text style={styles.infoValueBold}>Budi Santoso</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jumlah Diterima</Text>
              <Text style={styles.infoValueBold}>Rp750.000</Text>
            </View>

            <Text style={styles.proofSubTitle}>Bukti Pembayaran</Text>

            {/* Proof Image Box */}
            <View style={styles.proofImageContainer}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
                }}
                style={styles.proofImage}
                resizeMode="cover"
              />
            </View>

            {/* Button Lihat Bukti */}
            <TouchableOpacity
              style={styles.btnLihatBukti}
              onPress={() => setIsProofModalOpen(true)}
              activeOpacity={0.8}
            >
              <Search size={14} color="#374151" />
              <Text style={styles.btnLihatBuktiText}>Lihat Bukti</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Notice Box */}
        <View style={styles.noticeBoxBottom}>
          <CheckCircle2 size={18} color="#0D7A53" style={{ marginTop: 2 }} />
          <Text style={styles.noticeTextBottom}>
            Setelah verifikasi, status booking akan diperbarui dan kamar akan ditandai sebagai terbooking.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.btnTolakDp}
          onPress={() => setIsRejectModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnTolakDpText}>Tolak DP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnVerifikasiDp}
          onPress={() => setIsSuccessModalOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnVerifikasiDpText}>Verifikasi & Terima DP</Text>
        </TouchableOpacity>
      </View>

      {/* Modal 1: Success Modal (Verifikasi Berhasil) */}
      <Modal visible={isSuccessModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <View style={styles.circleIconGreen}>
              <CheckCircle2 size={36} color="#0D7A53" />
            </View>

            <Text style={styles.dialogTitle}>Verifikasi Berhasil</Text>

            <Text style={styles.dialogDesc}>
              Pembayaran DP atas nama <Text style={{ fontWeight: "800", color: "#111827" }}>Budi Santoso</Text> telah dikonfirmasi. Kamar berhasil dipesan!
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

      {/* Modal 2: Reject Modal (Tolak Pembayaran DP?) */}
      <Modal visible={isRejectModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <View style={styles.circleIconRed}>
              <AlertTriangle size={32} color="#EF4444" />
            </View>

            <Text style={styles.dialogTitle}>Tolak Pembayaran DP?</Text>

            <Text style={styles.dialogDesc}>
              Apakah Anda yakin ingin menolak DP ini? Status pesanan akan dikembalikan menjadi tertunda.
            </Text>

            <TouchableOpacity
              style={styles.btnDialogRed}
              onPress={() => {
                setIsRejectModalOpen(false);
                navigate("pemilik_kos_home");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnDialogRedText}>Ya, Tolak DP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDialogCancel}
              onPress={() => setIsRejectModalOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.btnDialogCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Full Proof Image Modal */}
      <Modal visible={isProofModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenterDark}>
          <TouchableOpacity
            style={styles.closeImageBtn}
            onPress={() => setIsProofModalOpen(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=80",
            }}
            style={styles.fullProofImage}
            resizeMode="contain"
          />
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
    padding: 16,
    paddingBottom: 20,
  },

  // Top Notice Box
  noticeBoxTop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  noticeIcon: {
    marginRight: 10,
  },
  noticeTextTop: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
    lineHeight: 18,
  },

  // Card Layout
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardHeaderIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  // Info List
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  infoValueBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  percentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },

  proofSubTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 8,
  },
  proofImageContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  proofImage: {
    width: "100%",
    height: "100%",
  },

  // Lihat Bukti Button
  btnLihatBukti: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
  },
  btnLihatBuktiText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  // Bottom Notice Box
  noticeBoxBottom: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E8F5EE",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 10,
  },
  noticeTextBottom: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
    lineHeight: 18,
  },

  // Bottom Fixed Action Bar
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  btnTolakDp: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTolakDpText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
  },
  btnVerifikasiDp: {
    flex: 1.4,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnVerifikasiDpText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  // Modal Overlay Centered
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
  circleIconRed: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
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
  btnDialogRed: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDialogRedText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnDialogCancel: {
    marginTop: 14,
    paddingVertical: 6,
  },
  btnDialogCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },

  // Image Modal
  modalOverlayCenterDark: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 8,
  },
  fullProofImage: {
    width: "90%",
    height: "70%",
  },
});
