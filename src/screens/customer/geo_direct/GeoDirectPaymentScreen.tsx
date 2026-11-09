/**
 * GeoDirectPaymentScreen.tsx
 * Down Payment & Proof Upload Screen for Geo Direct Use
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Clipboard,
  StatusBar,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  QrCode,
  CreditCard,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  Flame,
  FileText,
  RefreshCw,
  Info,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchBookingDetail,
  fetchPaymentMethods,
  uploadPaymentProof,
  GeoDirectBooking,
  GeoPaymentMethodsConfig,
} from "../../../services/geoDirectService";
import { getApiUrl, getStoredAuthToken, uploadFileToBackend } from "../../../services/api";
import { rp } from "../../../utils/formatters";
import { GeoDirectInvoiceModal } from "./GeoDirectInvoiceModal";

interface GeoDirectPaymentScreenProps extends Nav {
  routeParams?: {
    bookingId?: string;
  };
}

export const GeoDirectPaymentScreen: React.FC<GeoDirectPaymentScreenProps> = ({
  navigate,
  routeParams,
}) => {
  const bookingId = routeParams?.bookingId;

  const [booking, setBooking] = useState<GeoDirectBooking | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<GeoPaymentMethodsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMethod, setActiveMethod] = useState<"BANK" | "QRIS">("BANK");

  // Proof Upload State
  const [uploading, setUploading] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [selectedProofUri, setSelectedProofUri] = useState<string | null>(null);
  const [selectedProofBase64, setSelectedProofBase64] = useState<string | null>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string>("");
  const [selectedBankName, setSelectedBankName] = useState<string>("");

  // Invoice Modal
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const [bookingData, methodsData] = await Promise.all([
        fetchBookingDetail(bookingId),
        fetchPaymentMethods().catch(() => null),
      ]);
      setBooking(bookingData);
      setPaymentConfig(methodsData);

      if (bookingData.paymentProof?.fileUrl) {
        setUploadedProofUrl(bookingData.paymentProof.fileUrl);
      }

      if (methodsData?.bankAccounts && methodsData.bankAccounts.length > 0) {
        setSelectedBankName(methodsData.bankAccounts[0].bankName);
      }
    } catch (err) {
      console.warn("Failed to load payment screen:", err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert("Tersalin", `${label} '${text}' berhasil disalin ke clipboard.`);
  };

  const handlePickProof = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Aplikasi memerlukan izin galeri untuk memilih bukti transfer.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedProofUri(asset.uri);
        setSelectedProofBase64(asset.base64 || null);
        await uploadImageFile(asset.uri, asset.base64 || undefined);
      }
    } catch (err: any) {
      Alert.alert("Gagal Memilih Berkas", err.message || "Gagal mengambil gambar.");
    }
  };

  const uploadImageFile = async (uri: string, base64?: string): Promise<string | null> => {
    try {
      setUploading(true);
      const filename = uri.split("/").pop() || `payment_proof_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      const uploadRes = await uploadFileToBackend(uri, filename, type, base64);
      const finalUrl = uploadRes?.data?.url || uploadRes?.url;

      if (uploadRes?.success && finalUrl) {
        setUploadedProofUrl(finalUrl);
        Alert.alert("Unggah Berhasil", "Bukti transfer berhasil diproses dan siap dikirimkan untuk verifikasi.");
        return finalUrl;
      } else {
        throw new Error(uploadRes?.message || "Gagal mengunggah gambar.");
      }
    } catch (err: any) {
      Alert.alert("Gagal Mengunggah", err.message || "Pastikan koneksi internet aktif.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitProof = async () => {
    let finalUrl = uploadedProofUrl;

    // If customer selected an image but upload hasn't finished / failed, attempt on-the-fly upload
    if (!finalUrl && selectedProofUri) {
      finalUrl = (await uploadImageFile(selectedProofUri, selectedProofBase64 || undefined)) || "";
    }

    if (!finalUrl) {
      Alert.alert("Bukti Belum Diunggah", "Silakan pilih dan unggah foto bukti transfer terlebih dahulu.");
      return;
    }

    if (!booking) return;

    try {
      setSubmittingProof(true);
      const updated = await uploadPaymentProof(booking._id, {
        fileUrl: finalUrl,
        fileName: "bukti_transfer_dp.jpg",
        paymentMethodType: activeMethod === "QRIS" ? "QRIS" : "BANK_TRANSFER",
        transferToBank: selectedBankName,
      });

      setBooking(updated);
      Alert.alert(
        "Bukti Terkirim! 🍃",
        "Bukti pembayaran Anda berhasil dikirim ke Admin PGE. Status booking kini dalam proses verifikasi."
      );
    } catch (err: any) {
      Alert.alert("Gagal Mengirim Bukti", err.message || "Terjadi kesalahan.");
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D7A53" />
        <Text style={styles.loadingText}>Memuat tagihan sewa alat...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={40} color="#DC2626" />
        <Text style={styles.notFoundText}>Booking tidak ditemukan</Text>
        <TouchableOpacity style={styles.backBtnSolid} onPress={() => navigate("c_geo_direct")}>
          <Text style={styles.backBtnSolidText}>Kembali ke Katalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isApproved = booking.bookingStatus === "APPROVED";
  const isWaitingVerification = booking.paymentStatus === "WAITING_VERIFICATION";
  const isVerified = booking.paymentStatus === "VERIFIED";
  const isPaymentRejected = booking.paymentStatus === "REJECTED";
  const isBookingRejected = booking.bookingStatus === "REJECTED";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate("c_geo_direct_history")} style={styles.backBtn} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>Pembayaran DP</Text>
          <Text style={styles.topBarSubtitle}>{booking.bookingCode}</Text>
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn} activeOpacity={0.75}>
          <RefreshCw size={16} color="#0D7A53" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* Status Alert Banner */}
        {isApproved ? (
          <View style={styles.approvedBanner}>
            <CheckCircle2 size={24} color="#15803D" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.approvedBannerTitle}>Penyewaan Disetujui! 🍃</Text>
              <Text style={styles.approvedBannerText}>
                Pengajuan sewa telah disetujui Admin. Nota resmi telah diterbitkan dan wajib dibawa saat serah terima alat.
              </Text>
              <TouchableOpacity
                style={styles.btnOpenInvoice}
                onPress={() => setInvoiceModalVisible(true)}
                activeOpacity={0.8}
              >
                <FileText size={15} color="#FFFFFF" />
                <Text style={styles.btnOpenInvoiceText}>Buka Nota Sewa Resmi (PDF)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isVerified ? (
          <View style={styles.verifiedBanner}>
            <CheckCircle2 size={20} color="#0D7A53" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.verifiedBannerTitle}>Pembayaran DP Terverifikasi</Text>
              <Text style={styles.verifiedBannerText}>
                Admin PGE sedang memproses persetujuan (approval) jadwal dan operasional alat Anda.
              </Text>
            </View>
          </View>
        ) : isWaitingVerification ? (
          <View style={styles.waitingBanner}>
            <Clock size={20} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.waitingBannerTitle}>Menunggu Verifikasi Admin</Text>
              <Text style={styles.waitingBannerText}>
                Bukti transfer telah diterima dan sedang diperiksa oleh tim Admin PGE Kamojang.
              </Text>
            </View>
          </View>
        ) : isBookingRejected ? (
          <View style={styles.rejectedBanner}>
            <AlertCircle size={20} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.rejectedBannerTitle}>Pengajuan Memerlukan Revisi</Text>
              <Text style={styles.rejectedBannerText}>
                Catatan Admin: {booking.approvalDetails?.rejectionReason || "Silakan sesuaikan data permohonan."}
              </Text>
              <TouchableOpacity
                style={styles.btnResubmit}
                onPress={() => navigate("c_geo_direct_history")}
                activeOpacity={0.8}
              >
                <Text style={styles.btnResubmitText}>Buka Form Revisi & Saldo DP</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Bill Summary Card */}
        <View style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <View>
              <Text style={styles.billLabel}>Tagihan Down Payment (DP)</Text>
              <Text style={styles.billAmount}>{rp(booking.pricingSnapshot.netDpDue)}</Text>
            </View>
            <View style={styles.toolBadge}>
              <Text style={styles.toolBadgeText}>{booking.equipmentSnapshot.code}</Text>
            </View>
          </View>

          <View style={styles.billDivider} />

          <View style={styles.billDetailRows}>
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>Alat CoE</Text>
              <Text style={styles.billRowVal}>{booking.equipmentSnapshot.name}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>Durasi Sewa</Text>
              <Text style={styles.billRowVal}>{booking.rentalSchedule.durationDays} Hari</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>Total Biaya Sewa</Text>
              <Text style={styles.billRowVal}>{rp(booking.pricingSnapshot.totalRentalCost)}</Text>
            </View>
            {booking.pricingSnapshot.dpCreditApplied > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billRowLabel, { color: "#16A34A" }]}>Potongan Kredit DP</Text>
                <Text style={[styles.billRowVal, { color: "#16A34A" }]}>
                  - {rp(booking.pricingSnapshot.dpCreditApplied)}
                </Text>
              </View>
            )}
            <View style={styles.billRow}>
              <Text style={styles.billRowLabel}>Sisa Pelunasan</Text>
              <Text style={styles.billRowValBold}>{rp(booking.pricingSnapshot.remainingBalance)}</Text>
            </View>
          </View>
        </View>

        {/* If DP is already settled or verified, don't show transfer form */}
        {!isApproved && !isVerified && (
          <>
            {/* Method Switcher */}
            <View style={styles.methodSwitcher}>
              <TouchableOpacity
                style={[styles.methodTab, activeMethod === "BANK" && styles.methodTabActive]}
                onPress={() => setActiveMethod("BANK")}
                activeOpacity={0.8}
              >
                <CreditCard size={16} color={activeMethod === "BANK" ? "#0D7A53" : "#64748B"} />
                <Text style={[styles.methodTabText, activeMethod === "BANK" && styles.methodTabTextActive]}>
                  Transfer Bank
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, activeMethod === "QRIS" && styles.methodTabActive]}
                onPress={() => setActiveMethod("QRIS")}
                activeOpacity={0.8}
              >
                <QrCode size={16} color={activeMethod === "QRIS" ? "#0D7A53" : "#64748B"} />
                <Text style={[styles.methodTabText, activeMethod === "QRIS" && styles.methodTabTextActive]}>
                  QRIS PGE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Method 1: Bank Transfer */}
            {activeMethod === "BANK" && (
              <View style={styles.methodCard}>
                <Text style={styles.methodCardTitle}>Rekening Resmi PGE Kamojang</Text>
                {paymentConfig?.bankAccounts && paymentConfig.bankAccounts.length > 0 ? (
                  paymentConfig.bankAccounts.map((b) => (
                    <View key={b._id || b.accountNumber} style={styles.bankAccountBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bankName}>{b.bankName}</Text>
                        <Text style={styles.accountNumber}>{b.accountNumber}</Text>
                        <Text style={styles.accountHolder}>a.n. {b.accountHolder}</Text>
                        {b.branch ? <Text style={styles.branchText}>Cabang: {b.branch}</Text> : null}
                      </View>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => copyToClipboard(b.accountNumber, "Nomor Rekening")}
                        activeOpacity={0.75}
                      >
                        <Copy size={14} color="#0D7A53" />
                        <Text style={styles.copyBtnText}>Salin</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyMethodBox}>
                    <Info size={18} color="#D97706" />
                    <Text style={styles.emptyMethodText}>
                      Rekening bank resmi belum dikonfigurasi oleh Admin PGE. Silakan hubungi pengelola.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Method 2: QRIS */}
            {activeMethod === "QRIS" && (
              <View style={styles.methodCard}>
                <Text style={styles.methodCardTitle}>Scan QRIS PGE Area Kamojang</Text>
                {paymentConfig?.qrisEnabled && paymentConfig.qrisImageUrl ? (
                  <View style={styles.qrisImageWrap}>
                    <Image source={{ uri: paymentConfig.qrisImageUrl }} style={styles.qrisImg} resizeMode="contain" />
                    <Text style={styles.qrisMerchant}>{paymentConfig.qrisMerchantName || "PGE Area Kamojang"}</Text>
                    {paymentConfig.qrisNmid ? <Text style={styles.qrisNmid}>NMID: {paymentConfig.qrisNmid}</Text> : null}
                  </View>
                ) : (
                  <View style={styles.emptyMethodBox}>
                    <Info size={18} color="#D97706" />
                    <Text style={styles.emptyMethodText}>
                      Pembayaran QRIS resmi belum diaktifkan oleh Admin PGE. Silakan gunakan metode transfer bank.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Upload Payment Proof Card */}
            <View style={styles.uploadCard}>
              <Text style={styles.uploadCardTitle}>Unggah Bukti Pembayaran DP</Text>
              <Text style={styles.uploadCardDesc}>
                Unggah tangkapan layar (screenshot) struk ATM, bukti m-Banking, atau struk QRIS yang valid.
              </Text>

              {/* Preview Box */}
              {selectedProofUri || uploadedProofUrl ? (
                <View style={styles.proofPreviewBox}>
                  <Image source={{ uri: selectedProofUri || uploadedProofUrl }} style={styles.proofPreviewImg} resizeMode="contain" />
                  {uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#0D7A53" />
                      <Text style={styles.uploadingOverlayText}>Memproses unggahan bukti...</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.btnChangeProof}
                    onPress={handlePickProof}
                    activeOpacity={0.75}
                    disabled={uploading || submittingProof}
                  >
                    <Text style={styles.btnChangeProofText}>
                      {uploading ? "Sedang Mengunggah..." : uploadedProofUrl ? "Ganti Gambar" : "Coba Unggah Ulang"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.dropZone}
                  onPress={handlePickProof}
                  activeOpacity={0.8}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#0D7A53" />
                  ) : (
                    <>
                      <Upload size={28} color="#0D7A53" />
                      <Text style={styles.dropZoneText}>Pilih Foto Bukti Transfer</Text>
                      <Text style={styles.dropZoneSub}>Format: JPG, PNG (Maks 10MB)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Submit Proof Button */}
              <TouchableOpacity
                style={[
                  styles.btnSubmitProof,
                  (!uploadedProofUrl && !selectedProofUri || submittingProof || uploading) && styles.btnDisabled,
                ]}
                onPress={handleSubmitProof}
                disabled={(!uploadedProofUrl && !selectedProofUri) || submittingProof || uploading}
                activeOpacity={0.85}
              >
                {submittingProof || uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnSubmitProofText}>Kirim Bukti Pembayaran</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Formal PDF Invoice Modal */}
      <GeoDirectInvoiceModal
        visible={invoiceModalVisible}
        onClose={() => setInvoiceModalVisible(false)}
        booking={booking}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  notFoundText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  backBtnSolid: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 8,
  },
  backBtnSolidText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  topBarTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#EAF8F0",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 60,
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#DCFCE7",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#86EFAC",
    marginBottom: 16,
  },
  approvedBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  approvedBannerText: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 10,
  },
  btnOpenInvoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  btnOpenInvoiceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF8F0",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 16,
  },
  verifiedBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  verifiedBannerText: {
    fontSize: 12,
    color: "#065F46",
    marginTop: 2,
  },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  waitingBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  waitingBannerText: {
    fontSize: 12,
    color: "#92400E",
    marginTop: 2,
  },
  rejectedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 16,
  },
  rejectedBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
  },
  rejectedBannerText: {
    fontSize: 12,
    color: "#7F1D1D",
    marginTop: 2,
    marginBottom: 8,
  },
  btnResubmit: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  btnResubmitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  billCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  billLabel: {
    fontSize: 11,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  billAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 2,
  },
  toolBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toolBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  billDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  billDetailRows: {
    gap: 6,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  billRowLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  billRowVal: {
    fontSize: 12,
    color: "#0F172A",
  },
  billRowValBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  methodSwitcher: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  methodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  methodTabActive: {
    backgroundColor: "#FFFFFF",
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  methodTabTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  methodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  methodCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  bankAccountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bankName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 1,
    marginVertical: 2,
  },
  accountHolder: {
    fontSize: 12,
    color: "#475569",
  },
  branchText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  emptyMethodBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 8,
  },
  emptyMethodText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
  },
  qrisImageWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  qrisImg: {
    width: 220,
    height: 220,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  qrisMerchant: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  qrisNmid: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  uploadCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  uploadCardDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 14,
  },
  dropZone: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#0D7A53",
    borderRadius: 12,
    paddingVertical: 28,
    backgroundColor: "#F0FDF4",
  },
  dropZoneText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  dropZoneSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  proofPreviewBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  proofPreviewImg: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  uploadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#EAF8F0",
    borderRadius: 8,
  },
  uploadingOverlayText: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "600",
  },
  btnChangeProof: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
  },
  btnChangeProofText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  btnSubmitProof: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  btnSubmitProofText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
});
