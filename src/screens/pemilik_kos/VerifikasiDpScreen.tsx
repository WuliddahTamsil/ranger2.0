import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Nav } from "../../types";
import { fetchOwnerBookings, verifyDpBooking } from "../../services/kostService";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Search,
  AlertTriangle,
  X,
  User,
  Phone,
  Calendar,
  Building2,
  RefreshCw,
} from "lucide-react-native";

export const VerifikasiDpScreen: React.FC<Nav> = ({ navigate }) => {
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const bookings = await fetchOwnerBookings("aisk@gmail.com");
      if (bookings && bookings.length > 0) {
        setAllBookings(bookings);
        setSelectedIndex(0);
      } else {
        setAllBookings([]);
      }
    } catch (err) {
      console.log("Using default preview booking:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const currentBooking = allBookings.length > 0 ? allBookings[selectedIndex] : {
    _id: "demo1",
    customerName: "Aisyah Putri (aisyahphr@gmail.com)",
    customerPhone: "081298765432",
    roomNumber: "101",
    kostId: { name: "Ais Kost Exclusive" },
    totalAmount: 1500000,
    dpAmount: 300000,
    status: "dp_submitted",
    createdAt: new Date().toISOString(),
    dpProofImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
  };

  const handleConfirmDp = async () => {
    setIsSubmitting(true);
    try {
      if (currentBooking?._id && currentBooking._id !== "demo1") {
        await verifyDpBooking(currentBooking._id, "dp_verified");
      }
    } catch (err) {
      console.warn("Verify DP API error:", err);
    } finally {
      setIsSubmitting(false);
      setIsSuccessModalOpen(true);
    }
  };

  const handleRejectDp = async () => {
    setIsSubmitting(true);
    try {
      if (currentBooking?._id && currentBooking._id !== "demo1") {
        await verifyDpBooking(currentBooking._id, "rejected", "Bukti transfer tidak valid atau belum masuk.");
      }
    } catch (err) {
      console.warn("Reject DP API error:", err);
    } finally {
      setIsSubmitting(false);
      setIsRejectModalOpen(false);
      loadBookings();
    }
  };

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
        <Text style={styles.headerTitle}>Verifikasi DP Masuk</Text>
        <TouchableOpacity onPress={loadBookings} style={{ padding: 4 }}>
          <RefreshCw size={18} color="#0D7A53" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadBookings} />}
      >
        {/* Top Notice Box */}
        <View style={styles.noticeBoxTop}>
          <CheckCircle2 size={20} color="#0D7A53" style={styles.noticeIcon} />
          <Text style={styles.noticeTextTop}>
            Notifikasi booking & DP masuk dari customer. Verifikasi bukti bayar agar kamar otomatis terisi.
          </Text>
        </View>

        {/* Tab / Selector if Multiple Bookings */}
        {allBookings.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
              {allBookings.map((b, idx) => (
                <TouchableOpacity
                  key={b._id || idx}
                  onPress={() => setSelectedIndex(idx)}
                  style={[
                    styles.bookingTabChip,
                    selectedIndex === idx && styles.bookingTabChipActive,
                  ]}
                >
                  <Text style={[styles.bookingTabChipText, selectedIndex === idx && { color: "#FFFFFF", fontWeight: "800" }]}>
                    {b.customerName?.split(" ")[0]} • Kamar {b.roomNumber || "101"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Card 1: Detail Booking */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBg}>
              <FileText size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Detail Pemesanan Kost</Text>
              <Text style={{ fontSize: 11, color: "#6B7280" }}>
                Kode: {currentBooking.bookingCode || "KST-ONLINE"}
              </Text>
            </View>
            <View style={[styles.statusTag, currentBooking.status === "dp_verified" ? styles.tagGreen : styles.tagOrange]}>
              <Text style={[styles.statusTagText, { color: currentBooking.status === "dp_verified" ? "#0D7A53" : "#EA580C" }]}>
                {currentBooking.status === "dp_verified" ? "Sudah Diverifikasi" : "Menunggu Verifikasi"}
              </Text>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Calon Penghuni</Text>
              <Text style={styles.infoValueBold}>{currentBooking.customerName || "Aisyah Putri"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No. WhatsApp</Text>
              <Text style={styles.infoValueBold}>{currentBooking.customerPhone || "081298765432"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kamar Pilihan</Text>
              <Text style={[styles.infoValueBold, { color: "#0D7A53" }]}>
                Kamar {currentBooking.roomNumber || "101"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Durasi Sewa</Text>
              <Text style={styles.infoValueBold}>{currentBooking.durationMonths || 1} Bulan</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Biaya Sewa</Text>
              <Text style={styles.infoValueBold}>
                Rp {Number(currentBooking.totalAmount || 1500000).toLocaleString("id-ID")}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nominal DP (20%)</Text>
              <Text style={[styles.infoValueBold, { color: "#0D7A53", fontSize: 16 }]}>
                Rp {Number(currentBooking.dpAmount || 300000).toLocaleString("id-ID")}
              </Text>
            </View>
          </View>
        </View>

        {/* Card 2: Detail Pembayaran & Bukti DP */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBg}>
              <FileText size={18} color="#0D7A53" />
            </View>
            <Text style={styles.cardTitle}>Bukti Pembayaran DP Masuk</Text>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tujuan Rekening</Text>
              <Text style={styles.infoValueBold}>BCA - 7720192841 (Ais Kost)</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pengirim</Text>
              <Text style={styles.infoValueBold}>{currentBooking.customerName || "Aisyah Putri"}</Text>
            </View>

            <Text style={styles.proofSubTitle}>Foto Struk / Resi Transfer:</Text>

            {/* Proof Image Box */}
            <TouchableOpacity
              style={styles.proofImageContainer}
              onPress={() => setIsProofModalOpen(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri: currentBooking.dpProofImage || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
                }}
                style={styles.proofImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* Button Lihat Bukti */}
            <TouchableOpacity
              style={styles.btnLihatBukti}
              onPress={() => setIsProofModalOpen(true)}
              activeOpacity={0.8}
            >
              <Search size={14} color="#374151" />
              <Text style={styles.btnLihatBuktiText}>Perbesar Bukti Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Notice Box */}
        <View style={styles.noticeBoxBottom}>
          <CheckCircle2 size={18} color="#0D7A53" style={{ marginTop: 2 }} />
          <Text style={styles.noticeTextBottom}>
            Setelah verifikasi, status kamar {currentBooking.roomNumber || "101"} akan otomatis ditandai sebagai terisi dan akun customer menerima notifikasi real-time.
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
          disabled={isSubmitting}
        >
          <Text style={styles.btnTolakDpText}>Tolak DP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnVerifikasiDp}
          onPress={handleConfirmDp}
          activeOpacity={0.85}
          disabled={isSubmitting || currentBooking.status === "dp_verified"}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.btnVerifikasiDpText}>
              {currentBooking.status === "dp_verified" ? "Sudah Terverifikasi ✓" : "Verifikasi & Terima DP"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal 1: Success Modal (Verifikasi Berhasil) */}
      <Modal visible={isSuccessModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <View style={styles.circleIconGreen}>
              <CheckCircle2 size={36} color="#0D7A53" />
            </View>

            <Text style={styles.dialogTitle}>Verifikasi Berhasil!</Text>

            <Text style={styles.dialogDesc}>
              Pembayaran DP atas nama <Text style={{ fontWeight: "800", color: "#111827" }}>{currentBooking.customerName || "Aisyah Putri"}</Text> untuk Kamar {currentBooking.roomNumber || "101"} telah berhasil dikonfirmasi. Kamar sekarang resmi terbooking!
            </Text>

            <TouchableOpacity
              style={styles.btnDialogGreen}
              onPress={() => {
                setIsSuccessModalOpen(false);
                loadBookings();
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
              Apakah Anda yakin ingin menolak pembayaran DP dari {currentBooking.customerName}?
            </Text>

            <TouchableOpacity
              style={styles.btnDialogRed}
              onPress={handleRejectDp}
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
              uri: currentBooking.dpProofImage || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=80",
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
  bookingTabChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bookingTabChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  bookingTabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagGreen: {
    backgroundColor: "#DCFCE7",
  },
  tagOrange: {
    backgroundColor: "#FFEDD5",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
