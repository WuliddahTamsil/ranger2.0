/**
 * GeoDirectProcessingReportModal.tsx
 * Formal Digital Processing Report (Laporan Pengolahan Digital) PDF Viewer & Downloader
 * For GEOVERSE – Geothermal Drying Service (PGE Kamojang Center of Excellence)
 * Uses expo-print & expo-sharing
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  X,
  Share2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Flame,
  FileSpreadsheet,
  ThermometerSun,
  Droplets,
  Clock,
  Layers,
} from "lucide-react-native";
import { GeoDirectBooking, DryingStage } from "../../../services/geoDirectService";

interface GeoDirectProcessingReportModalProps {
  visible: boolean;
  onClose: () => void;
  booking: GeoDirectBooking | null;
}

const STAGE_LABELS: Record<DryingStage | string, string> = {
  WAITING_CONFIRMATION: "Menunggu Konfirmasi",
  CONFIRMED: "Pesanan Dikonfirmasi",
  WAITING_COFFEE_RECEIPT: "Menunggu Penerimaan Kopi",
  DRYING_IN_PROGRESS: "Proses Pengeringan",
  DRYING_COMPLETED: "Pengeringan Selesai",
  READY_FOR_PICKUP: "Siap Diambil",
  COMPLETED: "Selesai",
};

export const GeoDirectProcessingReportModal: React.FC<GeoDirectProcessingReportModalProps> = ({
  visible,
  onClose,
  booking,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!visible || !booking) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const progress = booking.dryingProgress;
  const currentStage = progress?.currentStage || "WAITING_CONFIRMATION";
  const stageLabel = STAGE_LABELS[currentStage] || currentStage;
  const coffeeType =
    progress?.coffeeType ||
    booking.productionNeeds?.productType ||
    booking.productionNeeds?.customParameters?.coffeeType ||
    "Arabika Kamojang";
  const dryingMethod =
    progress?.dryingMethod ||
    booking.productionNeeds?.dryingMethod ||
    booking.productionNeeds?.customParameters?.dryingMethod ||
    "Geothermal Wash";
  const initialWeight =
    progress?.initialWeightKg ||
    booking.productionNeeds?.rawMaterialKg ||
    "-";
  const finalWeight = progress?.finalWeightKg !== undefined ? `${progress.finalWeightKg} kg` : "Sedang dalam proses";
  const moisture =
    progress?.moistureContentPercent !== undefined
      ? `${progress.moistureContentPercent}%`
      : "Sedang dalam proses";
  const operatorNotes =
    progress?.operatorNotes ||
    "Parameter proses pengeringan terpantau stabil dalam rentang suhu 40–50°C berbasis energi panas bumi terbarukan.";

  const generateHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LAPORAN PENGOLAHAN DIGITAL PENGERINGAN PANAS BUMI</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 36px 44px;
      color: #1E293B;
      background: #FFFFFF;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0D7A53;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-title {
      font-size: 20px;
      font-weight: 800;
      color: #0D7A53;
      letter-spacing: 0.5px;
    }
    .company-sub {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .report-badge {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 11px;
      text-align: right;
    }
    .report-title-box {
      text-align: center;
      margin-bottom: 24px;
    }
    .report-title {
      font-size: 16px;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-subtitle {
      font-size: 11px;
      color: #64748B;
      margin-top: 4px;
    }
    .grid-two {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .card-box {
      flex: 1;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px;
      background: #F8FAFC;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      color: #0D7A53;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .data-label {
      color: #64748B;
    }
    .data-value {
      font-weight: 600;
      color: #0F172A;
      text-align: right;
    }
    .table-container {
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #0D7A53;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
    }
    .highlight-row {
      background: #F0FDF4;
      font-weight: bold;
    }
    .notes-box {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 12px;
      background: #FFFFFF;
      margin-bottom: 24px;
      font-size: 11px;
      line-height: 1.6;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding: 0 20px;
    }
    .sign-box {
      text-align: center;
      width: 180px;
      font-size: 11px;
    }
    .sign-line {
      margin-top: 50px;
      border-top: 1px solid #0F172A;
      padding-top: 4px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-title">PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
      <div class="company-sub">Center of Excellence Area Kamojang • Geothermal Direct Use</div>
    </div>
    <div class="report-badge">
      <div>LAPORAN OPERASIONAL</div>
      <div>${booking.bookingCode}</div>
    </div>
  </div>

  <div class="report-title-box">
    <div class="report-title">LAPORAN PENGOLAHAN DIGITAL PENGERINGAN PANAS BUMI</div>
    <div class="report-subtitle">GEOVERSE – Geothermal Dry House (CoE Kamojang)</div>
  </div>

  <div class="grid-two">
    <div class="card-box">
      <div class="card-title">Informasi Pesanan & Pelanggan</div>
      <div class="data-row"><span class="data-label">Nama Pemesan:</span><span class="data-value">${booking.customerSnapshot.name}</span></div>
      <div class="data-row"><span class="data-label">Instansi/Kelompok Tani:</span><span class="data-value">${booking.customerSnapshot.company || "-"}</span></div>
      <div class="data-row"><span class="data-label">Nomor Kontak:</span><span class="data-value">${booking.customerSnapshot.phone}</span></div>
      <div class="data-row"><span class="data-label">Kode Booking:</span><span class="data-value">${booking.bookingCode}</span></div>
    </div>

    <div class="card-box">
      <div class="card-title">Parameter Fasilitas Geothermal</div>
      <div class="data-row"><span class="data-label">Fasilitas:</span><span class="data-value">${booking.equipmentSnapshot.name}</span></div>
      <div class="data-row"><span class="data-label">Lokasi:</span><span class="data-value">${booking.usageLocation}</span></div>
      <div class="data-row"><span class="data-label">Periode Jadwal:</span><span class="data-value">${formatDate(booking.rentalSchedule.startDate)} – ${formatDate(booking.rentalSchedule.endDate)}</span></div>
      <div class="data-row"><span class="data-label">Status Operasional:</span><span class="data-value">${stageLabel}</span></div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>PARAMETER TEKNIS PENGERINGAN</th>
          <th style="text-align: right;">PENGUKURAN & CATATAN</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Jenis Kopi / Varietas Komoditas</td>
          <td style="text-align: right; font-weight: 600;">${coffeeType}</td>
        </tr>
        <tr>
          <td>Metode Pengeringan Panas Bumi Terpadu</td>
          <td style="text-align: right; font-weight: 600;">${dryingMethod}</td>
        </tr>
        <tr>
          <td>Berat Awal Cherry (Input Bahan Baku)</td>
          <td style="text-align: right; font-weight: 600;">${initialWeight} kg</td>
        </tr>
        <tr class="highlight-row">
          <td>Berat Akhir Green Bean Kering (Hasil Pengeringan)</td>
          <td style="text-align: right; color: #0D7A53;">${finalWeight}</td>
        </tr>
        <tr class="highlight-row">
          <td>Kadar Air Hasil Pengeringan (Moisture Meter Digital)</td>
          <td style="text-align: right; color: #0D7A53;">${moisture}</td>
        </tr>
        <tr>
          <td>Rentang Suhu Terkontrol Kamojang</td>
          <td style="text-align: right;">40°C – 50°C (Geothermal Thermal Heat Exchanger)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="notes-box">
    <strong>Catatan Teknis Operator PGE Kamojang:</strong><br>
    ${operatorNotes}
    <div style="margin-top: 6px; font-size: 10px; color: #64748B;">
      *Data ini merupakan catatan operasional resmi dari Center of Excellence PGE Area Kamojang. Hasil pengeringan telah memenuhi SOP penanganan mutu pascapanen berbasis energi terbarukan.
    </div>
  </div>

  <div class="sign-row">
    <div class="sign-box">
      <div>Pemesan / Kelompok Tani</div>
      <div class="sign-line">${booking.customerSnapshot.name}</div>
    </div>
    <div class="sign-box">
      <div>Operator CoE PGE Kamojang</div>
      <div class="sign-line">Tim Operasional PGE CoE</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      const html = generateHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(generateHtml());
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      } else {
        Alert.alert("Gagal Mencetak", err.message || "Gagal mencetak laporan digital.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      } else {
        Alert.alert("Sukses", `Laporan PDF disimpan di: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert("Gagal Berbagi", err.message || "Terjadi kesalahan saat mengekspor laporan.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <FileSpreadsheet size={20} color="#0D7A53" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Digital Processing Report</Text>
                <Text style={styles.headerSubtitle}>{booking.bookingCode}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body Preview */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Flame size={12} color="#0D7A53" />
                <Text style={styles.categoryBadgeText}>PGE KAMOJANG CoE</Text>
              </View>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>{stageLabel}</Text>
              </View>
            </View>

            <Text style={styles.reportMainTitle}>Laporan Pengolahan Pengeringan Panas Bumi</Text>
            <Text style={styles.facilitySubtitle}>
              {booking.equipmentSnapshot.name} • {booking.usageLocation}
            </Text>

            {/* Table of Technical Parameters */}
            <View style={styles.dataCard}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Pemesan / Kelompok Tani</Text>
                <Text style={styles.dataVal}>{booking.customerSnapshot.name}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Jenis Kopi / Varietas</Text>
                <Text style={styles.dataVal}>{coffeeType}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Metode Pengeringan</Text>
                <Text style={styles.dataVal}>{dryingMethod}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Berat Awal Cherry</Text>
                <Text style={styles.dataVal}>{initialWeight} kg</Text>
              </View>
              <View style={[styles.dataRow, styles.dataRowHighlight]}>
                <Text style={styles.dataLabelHighlight}>Berat Akhir Green Bean</Text>
                <Text style={styles.dataValHighlight}>{finalWeight}</Text>
              </View>
              <View style={[styles.dataRow, styles.dataRowHighlight]}>
                <Text style={styles.dataLabelHighlight}>Kadar Air Hasil (%)</Text>
                <Text style={styles.dataValHighlight}>{moisture}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Periode Pengeringan</Text>
                <Text style={styles.dataVal}>
                  {formatDate(booking.rentalSchedule.startDate)} –{" "}
                  {formatDate(booking.rentalSchedule.endDate)}
                </Text>
              </View>
            </View>

            {/* Operator Notes Box */}
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Catatan Teknis Operator CoE:</Text>
              <Text style={styles.notesContent}>{operatorNotes}</Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.btnPrint}
              onPress={handlePrint}
              disabled={isGenerating}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#0D7A53" />
              ) : (
                <>
                  <Printer size={16} color="#0D7A53" />
                  <Text style={styles.btnPrintText}>Cetak Laporan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnShare}
              onPress={handleShare}
              disabled={isGenerating}
              activeOpacity={0.85}
            >
              <Share2 size={16} color="#FFFFFF" />
              <Text style={styles.btnShareText}>Unduh PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  body: {
    flex: 1,
  },
  bodyInner: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
  },
  stageBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#4338CA",
  },
  reportMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  facilitySubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginBottom: 14,
  },
  dataCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    marginBottom: 14,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  dataRowHighlight: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dataLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  dataVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  dataLabelHighlight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  dataValHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  notesBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 10,
  },
  notesTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  btnPrint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0D7A53",
  },
  btnPrintText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  btnShare: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 8,
  },
  btnShareText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
