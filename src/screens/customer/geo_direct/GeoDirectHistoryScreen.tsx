/**
 * GeoDirectHistoryScreen.tsx
 * Customer Booking History, Revisions & DP Balance Management
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Coins,
  ChevronRight,
  Flame,
  Calendar,
  X,
  CreditCard,
  RefreshCw,
  Droplets,
  ThermometerSun,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchMyBookings,
  fetchCustomerDpBalance,
  resubmitBooking,
  GeoDirectBooking,
  GeoDirectDpLedgerItem,
  DryingStage,
} from "../../../services/geoDirectService";
import { rp } from "../../../utils/formatters";
import { GeoDirectInvoiceModal } from "./GeoDirectInvoiceModal";
import { GeoDirectProcessingReportModal } from "./GeoDirectProcessingReportModal";

const DRYING_STAGES_LIST: Array<{ key: DryingStage; num: number; label: string }> = [
  { key: "WAITING_CONFIRMATION", num: 1, label: "Menunggu Konfirmasi" },
  { key: "CONFIRMED", num: 2, label: "Dikonfirmasi" },
  { key: "WAITING_COFFEE_RECEIPT", num: 3, label: "Terima Kopi" },
  { key: "DRYING_IN_PROGRESS", num: 4, label: "Pengeringan" },
  { key: "DRYING_COMPLETED", num: 5, label: "Selesai Kering" },
  { key: "READY_FOR_PICKUP", num: 6, label: "Siap Diambil" },
  { key: "COMPLETED", num: 7, label: "Selesai" },
];

interface GeoDirectHistoryScreenProps extends Nav {
  authAccount?: any;
}

export const GeoDirectHistoryScreen: React.FC<GeoDirectHistoryScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const [bookings, setBookings] = useState<GeoDirectBooking[]>([]);
  const [dpBalance, setDpBalance] = useState<number>(0);
  const [dpLedger, setDpLedger] = useState<GeoDirectDpLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Booking for Modals
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<GeoDirectBooking | null>(null);
  const [selectedReportBooking, setSelectedReportBooking] = useState<GeoDirectBooking | null>(null);

  // Resubmit Modal State
  const [resubmitModalVisible, setResubmitModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState<GeoDirectBooking | null>(null);
  const [revStartDate, setRevStartDate] = useState("");
  const [revEndDate, setRevEndDate] = useState("");
  const [revPurpose, setRevPurpose] = useState("");
  const [revLocation, setRevLocation] = useState("");
  const [revNotes, setRevNotes] = useState("");
  const [revSubmitting, setRevSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bookingsData, balanceData] = await Promise.all([
        fetchMyBookings().catch(() => []),
        fetchCustomerDpBalance().catch(() => ({ balance: 0, history: [] })),
      ]);
      setBookings(bookingsData);
      setDpBalance(balanceData.balance || 0);
      setDpLedger(balanceData.history || []);
    } catch (err) {
      console.warn("Failed to load customer booking history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openResubmitModal = (b: GeoDirectBooking) => {
    setEditingBooking(b);
    setRevStartDate(b.rentalSchedule.startDate.slice(0, 10));
    setRevEndDate(b.rentalSchedule.endDate.slice(0, 10));
    setRevPurpose(b.usagePurpose);
    setRevLocation(b.usageLocation);
    setRevNotes(b.notes || "");
    setResubmitModalVisible(true);
  };

  const handleConfirmResubmit = async () => {
    if (!editingBooking) return;
    if (!revPurpose.trim() || !revLocation.trim()) {
      Alert.alert("Perhatian", "Tujuan dan lokasi penggunaan wajib diisi.");
      return;
    }

    try {
      setRevSubmitting(true);
      const updated = await resubmitBooking(editingBooking._id, {
        rentalSchedule: {
          startDate: new Date(revStartDate).toISOString(),
          endDate: new Date(revEndDate).toISOString(),
        },
        usagePurpose: revPurpose.trim(),
        usageLocation: revLocation.trim(),
        notes: revNotes.trim(),
      });

      Alert.alert(
        "Pengajuan Ulang Berhasil! 🍃",
        "Data revisi telah dikirim ke Admin. Saldo deposit DP Anda telah diaplikasikan.",
        [
          {
            text: "OK",
            onPress: () => {
              setResubmitModalVisible(false);
              loadData();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Gagal Mengajukan Ulang", err.message || "Terjadi kesalahan.");
    } finally {
      setRevSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (b: GeoDirectBooking) => {
    switch (b.bookingStatus) {
      case "APPROVED":
        return { label: "Disetujui", bg: "#DCFCE7", text: "#15803D" };
      case "WAITING_APPROVAL":
        return { label: "Menunggu Approval", bg: "#E0E7FF", text: "#4338CA" };
      case "PAYMENT_REVIEW":
        return { label: "Review Pembayaran", bg: "#FEF3C7", text: "#B45309" };
      case "WAITING_PAYMENT":
        return { label: "Menunggu DP", bg: "#FFFBEB", text: "#D97706" };
      case "REJECTED":
        return { label: "Perlu Revisi", bg: "#FEE2E2", text: "#B91C1C" };
      default:
        return { label: b.bookingStatus, bg: "#F1F5F9", text: "#475569" };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate("c_geo_direct")} style={styles.backBtn} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>Riwayat Sewa Geo Direct</Text>
          <Text style={styles.topBarSubtitle}>Pengajuan & Saldo Deposit DP</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.75}>
          <RefreshCw size={16} color="#0D7A53" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0D7A53"]} />}
      >
        {/* DP Balance Header Card */}
        <View style={styles.dpBalanceCard}>
          <View style={styles.dpBalanceHeader}>
            <View style={styles.dpBalanceIcon}>
              <Coins size={22} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dpBalanceTitle}>Saldo Deposit DP Customer</Text>
              <Text style={styles.dpBalanceAmount}>{rp(dpBalance)}</Text>
            </View>
          </View>
          <Text style={styles.dpBalanceExplanation}>
            Kebijakan PGE Kamojang: Jika pengajuan sewa Anda memerlukan revisi, saldo DP yang telah diverifikasi tersimpan
            aman dan otomatis memotong tagihan saat Anda mengajukan ulang.
          </Text>
        </View>

        {/* Bookings List Section */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Daftar Pengajuan ({bookings.length})</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={styles.loadingText}>Memuat riwayat pengajuan...</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <FileText size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Belum Ada Pengajuan Sewa</Text>
            <Text style={styles.emptyDesc}>Pilih alat di katalog Geo Direct Use dan ajukan sewa pertama Anda.</Text>
            <TouchableOpacity style={styles.btnExplore} onPress={() => navigate("c_geo_direct")} activeOpacity={0.8}>
              <Text style={styles.btnExploreText}>Buka Katalog Alat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {bookings.map((b) => {
              const status = getStatusBadge(b);
              const isApproved = b.bookingStatus === "APPROVED";
              const isRejected = b.bookingStatus === "REJECTED";

              return (
                <View key={b._id} style={styles.bookingCard}>
                  {/* Card Header */}
                  <View style={styles.bookingCardHeader}>
                    <View>
                      <Text style={styles.bookingCodeText}>{b.bookingCode}</Text>
                      <Text style={styles.bookingDateText}>Diajukan: {formatDate(b.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Tool & Duration Info */}
                  <View style={styles.bookingInfoRow}>
                    <Text style={styles.toolName}>{b.equipmentSnapshot.name} ({b.equipmentSnapshot.code})</Text>
                    <Text style={styles.durationBadge}>{b.rentalSchedule.durationDays} Hari</Text>
                  </View>

                  <Text style={styles.scheduleText}>
                    Jadwal: {formatDate(b.rentalSchedule.startDate)} - {formatDate(b.rentalSchedule.endDate)}
                  </Text>
                  <Text style={styles.purposeText} numberOfLines={1}>
                    Tujuan: {b.usagePurpose}
                  </Text>

                  {/* Financial Overview */}
                  <View style={styles.finOverviewBox}>
                    <View style={styles.finCol}>
                      <Text style={styles.finLabel}>Total Sewa</Text>
                      <Text style={styles.finVal}>{rp(b.pricingSnapshot.totalRentalCost)}</Text>
                    </View>
                    <View style={styles.finCol}>
                      <Text style={styles.finLabel}>DP ({b.pricingSnapshot.dpPercentage}%)</Text>
                      <Text style={[styles.finVal, { color: "#0D7A53" }]}>
                        {rp(b.pricingSnapshot.requiredDpAmount)}
                      </Text>
                    </View>
                    <View style={styles.finCol}>
                      <Text style={styles.finLabel}>Status DP</Text>
                      <Text
                        style={[
                          styles.finVal,
                          {
                            color:
                              b.paymentStatus === "VERIFIED"
                                ? "#16A34A"
                                : b.paymentStatus === "WAITING_VERIFICATION"
                                ? "#D97706"
                                : "#DC2626",
                          },
                        ]}
                      >
                        {b.paymentStatus === "VERIFIED"
                          ? "LUNAS DP"
                          : b.paymentStatus === "WAITING_VERIFICATION"
                          ? "DIVERIFIKASI"
                          : "BELUM BAYAR"}
                      </Text>
                    </View>
                  </View>

                  {/* Rejection Note Warning (If rejected) */}
                  {isRejected && (
                    <View style={styles.rejectionNotice}>
                      <AlertCircle size={15} color="#DC2626" />
                      <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={styles.rejectionNoticeTitle}>Catatan Revisi dari Admin PGE:</Text>
                        <Text style={styles.rejectionNoticeText}>
                          {b.approvalDetails?.rejectionReason || "Data permohonan memerlukan penyesuaian."}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Drying Progress Tracking Section (For Dryhouse / Any booking with progress) */}
                  {(b.dryingProgress ||
                    b.equipmentSnapshot?.code === "EQ-01" ||
                    b.equipmentSnapshot?.name?.includes("Dryhouse")) && (
                    <View style={styles.dryingProgressCard}>
                      <View style={styles.dryingProgressHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <ThermometerSun size={15} color="#0D7A53" />
                          <Text style={styles.dryingProgressTitle}>Pemantauan Proses Pengeringan</Text>
                        </View>
                        <View style={styles.dryingStageBadge}>
                          <Text style={styles.dryingStageBadgeText}>
                            {DRYING_STAGES_LIST.find((s) => s.key === b.dryingProgress?.currentStage)?.label ||
                              "Menunggu Konfirmasi"}
                          </Text>
                        </View>
                      </View>

                      {/* 7-Stage Stepper Preview */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.stepperContainer}
                      >
                        {DRYING_STAGES_LIST.map((step, sIdx) => {
                          const currentStageKey = b.dryingProgress?.currentStage || "WAITING_CONFIRMATION";
                          const currentIdx = DRYING_STAGES_LIST.findIndex((s) => s.key === currentStageKey);
                          const isDone = sIdx <= currentIdx;
                          const isCurrent = sIdx === currentIdx;

                          return (
                            <View key={step.key} style={styles.stepItemWrapper}>
                              <View
                                style={[
                                  styles.stepCircle,
                                  isDone && styles.stepCircleDone,
                                  isCurrent && styles.stepCircleCurrent,
                                ]}
                              >
                                <Text style={[styles.stepCircleText, isDone && styles.stepCircleTextDone]}>
                                  {step.num}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.stepItemLabel,
                                  isCurrent && styles.stepItemLabelCurrent,
                                ]}
                                numberOfLines={1}
                              >
                                {step.label}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>

                      {/* Measurements Snapshot */}
                      <View style={styles.measurementsRow}>
                        <View style={styles.measureItem}>
                          <Text style={styles.measureLabel}>Berat Awal</Text>
                          <Text style={styles.measureVal}>
                            {b.dryingProgress?.initialWeightKg || b.productionNeeds?.rawMaterialKg || "-"} kg
                          </Text>
                        </View>
                        <View style={styles.measureItem}>
                          <Text style={styles.measureLabel}>Berat Akhir Green Bean</Text>
                          <Text style={styles.measureVal}>
                            {b.dryingProgress?.finalWeightKg !== undefined
                              ? `${b.dryingProgress.finalWeightKg} kg`
                              : "Dalam Proses"}
                          </Text>
                        </View>
                        <View style={styles.measureItem}>
                          <Text style={styles.measureLabel}>Kadar Air (%)</Text>
                          <Text style={styles.measureVal}>
                            {b.dryingProgress?.moistureContentPercent !== undefined
                              ? `${b.dryingProgress.moistureContentPercent}%`
                              : "Target 11%"}
                          </Text>
                        </View>
                      </View>

                      {/* Digital Processing Report CTA */}
                      <TouchableOpacity
                        style={styles.btnOpenReport}
                        onPress={() => setSelectedReportBooking(b)}
                        activeOpacity={0.8}
                      >
                        <FileSpreadsheet size={14} color="#0D7A53" />
                        <Text style={styles.btnOpenReportText}>Laporan Pengolahan Digital</Text>
                        <ChevronRight size={14} color="#0D7A53" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
                    {isApproved ? (
                      <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                        <TouchableOpacity
                          style={[styles.btnActionPdf, { flex: 1 }]}
                          onPress={() => setSelectedInvoiceBooking(b)}
                          activeOpacity={0.8}
                        >
                          <FileText size={14} color="#FFFFFF" />
                          <Text style={styles.btnActionPdfText}>Nota Sewa</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.btnActionReport, { flex: 1.2 }]}
                          onPress={() => setSelectedReportBooking(b)}
                          activeOpacity={0.8}
                        >
                          <FileSpreadsheet size={14} color="#0D7A53" />
                          <Text style={styles.btnActionReportText}>Laporan Digital</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isRejected ? (
                      <TouchableOpacity
                        style={styles.btnActionResubmit}
                        onPress={() => openResubmitModal(b)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.btnActionResubmitText}>Perbaiki & Ajukan Ulang</Text>
                        <ChevronRight size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.btnActionPayment}
                        onPress={() => navigate("c_geo_direct_payment", { bookingId: b._id })}
                        activeOpacity={0.8}
                      >
                        <CreditCard size={15} color="#0D7A53" />
                        <Text style={styles.btnActionPaymentText}>
                          {b.paymentStatus === "UNPAID" ? "Bayar Tagihan DP" : "Lihat Status Pembayaran"}
                        </Text>
                        <ChevronRight size={15} color="#0D7A53" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Invoice Modal */}
      <GeoDirectInvoiceModal
        visible={!!selectedInvoiceBooking}
        onClose={() => setSelectedInvoiceBooking(null)}
        booking={selectedInvoiceBooking}
      />

      {/* Digital Processing Report Modal */}
      <GeoDirectProcessingReportModal
        visible={!!selectedReportBooking}
        onClose={() => setSelectedReportBooking(null)}
        booking={selectedReportBooking}
      />

      {/* Resubmit Modal */}
      <Modal visible={resubmitModalVisible} animationType="slide" transparent onRequestClose={() => setResubmitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Revisi Pengajuan Sewa</Text>
              <TouchableOpacity onPress={() => setResubmitModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalAlert}>
                <Text style={styles.modalAlertText}>
                  Catatan Admin: {editingBooking?.approvalDetails?.rejectionReason}
                </Text>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Tanggal Mulai (YYYY-MM-DD)</Text>
                <TextInput style={styles.modalInput} value={revStartDate} onChangeText={setRevStartDate} />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Tanggal Selesai (YYYY-MM-DD)</Text>
                <TextInput style={styles.modalInput} value={revEndDate} onChangeText={setRevEndDate} />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Tujuan Penggunaan</Text>
                <TextInput style={styles.modalInput} value={revPurpose} onChangeText={setRevPurpose} />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Lokasi Penggunaan</Text>
                <TextInput style={styles.modalInput} value={revLocation} onChangeText={setRevLocation} />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Catatan Perbaikan</Text>
                <TextInput style={[styles.modalInput, { height: 60 }]} value={revNotes} onChangeText={setRevNotes} multiline />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnConfirmResubmit, revSubmitting && styles.btnDisabled]}
                onPress={handleConfirmResubmit}
                disabled={revSubmitting}
                activeOpacity={0.85}
              >
                {revSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnConfirmResubmitText}>Kirim Perbaikan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    paddingBottom: 40,
  },
  dpBalanceCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  dpBalanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  dpBalanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  dpBalanceTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  dpBalanceAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#B45309",
    marginTop: 2,
  },
  dpBalanceExplanation: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },
  sectionTitleRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748B",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  btnExplore: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnExploreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bookingList: {
    gap: 14,
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bookingCodeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  bookingDateText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  bookingInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toolName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D7A53",
  },
  durationBadge: {
    fontSize: 11,
    color: "#475569",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scheduleText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  purposeText: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
  },
  finOverviewBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  finCol: {
    alignItems: "center",
  },
  finLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  finVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  rejectionNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  rejectionNoticeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
  },
  rejectionNoticeText: {
    fontSize: 11,
    color: "#7F1D1D",
    marginTop: 1,
  },
  cardActions: {
    marginTop: 12,
  },
  btnActionPdf: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnActionPdfText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnActionResubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnActionResubmitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnActionPayment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EAF8F0",
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnActionPaymentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalAlert: {
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalAlertText: {
    fontSize: 11,
    color: "#991B1B",
  },
  modalInputGroup: {
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalFooter: {
    paddingTop: 10,
  },
  btnConfirmResubmit: {
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnConfirmResubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
  dryingProgressCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  dryingProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dryingProgressTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  dryingStageBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  dryingStageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
  },
  stepItemWrapper: {
    alignItems: "center",
    width: 72,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepCircleDone: {
    backgroundColor: "#0D7A53",
  },
  stepCircleCurrent: {
    backgroundColor: "#D97706",
    borderWidth: 2,
    borderColor: "#FEF3C7",
  },
  stepCircleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  stepCircleTextDone: {
    color: "#FFFFFF",
  },
  stepItemLabel: {
    fontSize: 9.5,
    color: "#64748B",
    textAlign: "center",
  },
  stepItemLabelCurrent: {
    color: "#B45309",
    fontWeight: "700",
  },
  stepLine: {
    display: "none",
  },
  measurementsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  measureItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  measureLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  measureVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  btnOpenReport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0D7A53",
  },
  btnOpenReportText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  btnActionReport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  btnActionReportText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
});

