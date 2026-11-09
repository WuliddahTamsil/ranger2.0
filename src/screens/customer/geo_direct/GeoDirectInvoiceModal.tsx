/**
 * GeoDirectInvoiceModal.tsx
 * Formal Rental Nota / Invoice PDF Viewer & Downloader for PGE Geo Direct Use
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
  Building,
  User,
  Phone,
  Clock,
  Flame,
  FileText,
} from "lucide-react-native";
import { GeoDirectBooking } from "../../../services/geoDirectService";
import { rp } from "../../../utils/formatters";

interface GeoDirectInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  booking: GeoDirectBooking | null;
}

export const GeoDirectInvoiceModal: React.FC<GeoDirectInvoiceModalProps> = ({
  visible,
  onClose,
  booking,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!visible || !booking) return null;

  const invoiceNumber =
    booking.invoice?.invoiceNumber ||
    `NOTA-GDU/${new Date().getFullYear()}/${booking.bookingCode.slice(-4)}`;

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

  const generateHtml = () => {
    const cust = booking.customerSnapshot;
    const equip = booking.equipmentSnapshot;
    const price = booking.pricingSnapshot;
    const approval = booking.approvalDetails;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NOTA PENYEWAAN ALAT GEO DIRECT USE</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 36px 48px;
      color: #1E293B;
      background: #FFFFFF;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0D7A53;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .logo-box {
      font-size: 22px;
      font-weight: 800;
      color: #0D7A53;
      letter-spacing: 0.5px;
    }
    .sub-logo {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 0.5px;
    }
    .doc-number {
      font-size: 13px;
      font-weight: 700;
      color: #0D7A53;
      margin-top: 4px;
    }
    .doc-date {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .badge-approved {
      display: inline-block;
      background: #DCFCE7;
      color: #15803D;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid #86EFAC;
      margin-top: 6px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 20px;
      margin-bottom: 8px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 16px;
    }
    .info-row {
      display: table-row;
    }
    .info-label {
      display: table-cell;
      width: 32%;
      font-size: 12px;
      color: #64748B;
      padding: 4px 0;
    }
    .info-value {
      display: table-cell;
      font-size: 12px;
      font-weight: 600;
      color: #0F172A;
      padding: 4px 0;
    }
    table.cost-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      margin-bottom: 20px;
    }
    table.cost-table th {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-align: left;
    }
    table.cost-table td {
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      font-size: 12px;
      color: #1E293B;
    }
    .total-row td {
      font-weight: 800;
      background: #F1F5F9;
      color: #0F172A;
    }
    .dp-row td {
      font-weight: 700;
      color: #0D7A53;
      background: #F0FDF4;
    }
    .disclaimer-box {
      margin-top: 28px;
      padding: 14px 18px;
      background: #F8FAFC;
      border-left: 4px solid #0D7A53;
      border-radius: 4px;
      font-size: 11px;
      color: #475569;
      line-height: 1.6;
    }
    .sign-section {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .sign-box {
      width: 42%;
      text-align: center;
      font-size: 11px;
      color: #64748B;
    }
    .sign-space {
      height: 60px;
    }
    .sign-name {
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
      border-top: 1px solid #CBD5E1;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-box">PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
      <div class="sub-logo">Area Kamojang • Center of Excellence • Geo Direct Use</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">NOTA PERSETUJUAN SEWA ALAT</div>
      <div class="doc-number">${invoiceNumber}</div>
      <div class="doc-date">Tanggal Terbit: ${formatDate(booking.invoice?.issuedAt || new Date().toISOString())}</div>
      <div class="badge-approved">STATUS: APPROVED / RESMI</div>
    </div>
  </div>

  <div class="section-title">Informasi Penyewa (Customer)</div>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-label">Nama Penyewa</div>
      <div class="info-value">: ${cust.name || "-"}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Instansi / Perusahaan</div>
      <div class="info-value">: ${cust.company || "Pribadi / UMKM"}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Nomor Kontak / WhatsApp</div>
      <div class="info-value">: ${cust.phone || "-"}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Email</div>
      <div class="info-value">: ${cust.email || "-"}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Alamat Lengkap</div>
      <div class="info-value">: ${cust.address || "-"}</div>
    </div>
  </div>

  <div class="section-title">Informasi Sewa & Alat CoE</div>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-label">Kode Booking</div>
      <div class="info-value">: <strong>${booking.bookingCode}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Nama & Kode Alat</div>
      <div class="info-value">: ${equip.name} (${equip.code})</div>
    </div>
    <div class="info-row">
      <div class="info-label">Jadwal Pemakaian</div>
      <div class="info-value">: ${formatDate(booking.rentalSchedule.startDate)} s.d. ${formatDate(booking.rentalSchedule.endDate)} (${booking.rentalSchedule.durationDays} Hari)</div>
    </div>
    <div class="info-row">
      <div class="info-label">Tujuan Penggunaan</div>
      <div class="info-value">: ${booking.usagePurpose}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Lokasi Operasional</div>
      <div class="info-value">: ${booking.usageLocation}</div>
    </div>
    ${
      booking.productionNeeds?.productType
        ? `<div class="info-row">
            <div class="info-label">Komoditas / Bahan Baku</div>
            <div class="info-value">: ${booking.productionNeeds.productType} ${
            (booking.productionNeeds.rawMaterialKg || booking.productionNeeds.rawMaterialTons)
              ? `(${booking.productionNeeds.rawMaterialKg || booking.productionNeeds.rawMaterialTons} kg)`
              : ""
          }</div>
          </div>`
        : ""
    }
  </div>

  <div class="section-title">Rincian Finansial & Pembayaran DP</div>
  <table class="cost-table">
    <thead>
      <tr>
        <th>Deskripsi Komponen</th>
        <th style="text-align: right;">Durasi / Parameter</th>
        <th style="text-align: right;">Nominal (IDR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Biaya Sewa Pokok (${equip.name})</td>
        <td style="text-align: right;">${booking.rentalSchedule.durationDays} Hari</td>
        <td style="text-align: right;">${rp(price.subtotalBase)}</td>
      </tr>
      ${
        price.productionAddonTotal > 0
          ? `<tr>
              <td>Biaya Tambahan Parameter Produksi</td>
              <td style="text-align: right;">${booking.productionNeeds?.rawMaterialKg || booking.productionNeeds?.rawMaterialTons || 0} kg</td>
              <td style="text-align: right;">${rp(price.productionAddonTotal)}</td>
            </tr>`
          : ""
      }
      <tr class="total-row">
        <td>Total Biaya Penyewaan</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right;">${rp(price.totalRentalCost)}</td>
      </tr>
      <tr class="dp-row">
        <td>Down Payment (DP) Telah Dibayar & Terverifikasi (${price.dpPercentage}%)</td>
        <td style="text-align: right;">LUNAS DP</td>
        <td style="text-align: right;">${rp(price.requiredDpAmount)}</td>
      </tr>
      <tr>
        <td>Sisa Pembayaran (Pelunasan saat serah terima)</td>
        <td style="text-align: right;">Sisa</td>
        <td style="text-align: right;"><strong>${rp(price.remainingBalance)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="disclaimer-box">
    <strong>KETENTUAN RESMI PGE AREA KAMOJANG:</strong><br>
    "Nota ini merupakan bukti persetujuan penyewaan alat Geo Direct Use oleh PGE. Customer wajib membawa nota ini saat datang ke PGE Area Kamojang untuk proses penyewaan atau penggunaan alat."
  </div>

  <div class="sign-section">
    <div class="sign-box">
      <div>Penyewa / Customer,</div>
      <div class="sign-space"></div>
      <div class="sign-name">${cust.name || "Customer"}</div>
      <div>${cust.company || "Pemohon"}</div>
    </div>
    <div class="sign-box">
      <div>Disetujui Oleh Administrator PGE,</div>
      <div class="sign-space"></div>
      <div class="sign-name">${approval?.approvedByName || "Admin PGE Kamojang"}</div>
      <div>PGE Area Kamojang • CoE</div>
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
      Alert.alert("Gagal Mencetak", err.message || "Terjadi kesalahan saat memproses cetak.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Nota-Sewa-${booking.bookingCode}`,
        });
      }
    } catch (err: any) {
      Alert.alert("Gagal Menyimpan PDF", err.message || "Terjadi kesalahan saat membuat dokumen PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
            <X size={20} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.topBarTitleBox}>
            <Text style={styles.topBarTitle}>Nota Resmi Geo Direct Use</Text>
            <Text style={styles.topBarSubtitle}>{invoiceNumber}</Text>
          </View>
          <View style={styles.topBarActions}>
            <TouchableOpacity
              onPress={handlePrint}
              style={styles.iconBtn}
              activeOpacity={0.75}
              disabled={isGenerating}
            >
              <Printer size={18} color="#0D7A53" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.iconBtn, styles.shareBtn]}
              activeOpacity={0.75}
              disabled={isGenerating}
            >
              <Share2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {isGenerating && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#0D7A53" />
            <Text style={styles.loadingText}>Menyiapkan berkas dokumen PDF...</Text>
          </View>
        )}

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {/* Paper Container */}
          <View style={styles.paper}>
            {/* PGE Kamojang Branding */}
            <View style={styles.paperHeader}>
              <View>
                <View style={styles.badgePge}>
                  <Flame size={12} color="#0D7A53" />
                  <Text style={styles.badgePgeText}>PERTAMINA GEOTHERMAL ENERGY</Text>
                </View>
                <Text style={styles.pgeAreaText}>Area Kamojang • Center of Excellence</Text>
              </View>
              <View style={styles.approvedPill}>
                <CheckCircle2 size={13} color="#15803D" />
                <Text style={styles.approvedPillText}>APPROVED</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Document Info */}
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.docLabel}>Nomor Nota Sewa</Text>
                <Text style={styles.docValHighlight}>{invoiceNumber}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.docLabel}>Kode Booking</Text>
                <Text style={styles.docVal}>{booking.bookingCode}</Text>
              </View>
            </View>

            {/* Customer Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>INFORMASI CUSTOMER</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nama Pemohon</Text>
                <Text style={styles.detailVal}>{booking.customerSnapshot.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Instansi</Text>
                <Text style={styles.detailVal}>{booking.customerSnapshot.company || "Pribadi / UMKM"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kontak</Text>
                <Text style={styles.detailVal}>{booking.customerSnapshot.phone}</Text>
              </View>
            </View>

            {/* Tool & Schedule Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>RINCIAN SEWA ALAT</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alat Dipilih</Text>
                <Text style={styles.detailValBold}>
                  {booking.equipmentSnapshot.name} ({booking.equipmentSnapshot.code})
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Durasi Sewa</Text>
                <Text style={styles.detailVal}>
                  {formatDate(booking.rentalSchedule.startDate)} - {formatDate(booking.rentalSchedule.endDate)} (
                  {booking.rentalSchedule.durationDays} Hari)
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tujuan</Text>
                <Text style={styles.detailVal}>{booking.usagePurpose}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lokasi</Text>
                <Text style={styles.detailVal}>{booking.usageLocation}</Text>
              </View>
            </View>

            {/* Payment Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>PEMBAYARAN DOWN PAYMENT</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Biaya Sewa</Text>
                <Text style={styles.detailVal}>{rp(booking.pricingSnapshot.totalRentalCost)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DP Terverifikasi ({booking.pricingSnapshot.dpPercentage}%)</Text>
                <Text style={[styles.detailValBold, { color: "#0D7A53" }]}>
                  {rp(booking.pricingSnapshot.requiredDpAmount)} (LUNAS DP)
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sisa Pelunasan</Text>
                <Text style={styles.detailValBold}>{rp(booking.pricingSnapshot.remainingBalance)}</Text>
              </View>
            </View>

            {/* Mandatory Disclaimer */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Catatan Penggunaan:</Text>
              <Text style={styles.noticeText}>
                "Nota ini merupakan bukti persetujuan penyewaan alat Geo Direct Use oleh PGE. Customer wajib membawa nota
                ini saat datang ke PGE Area Kamojang untuk proses penyewaan atau penggunaan alat."
              </Text>
            </View>

            {/* Approval Footer */}
            <View style={styles.approvalStampBox}>
              <Text style={styles.stampText}>
                Disetujui secara elektronik oleh {booking.approvalDetails?.approvedByName || "Admin PGE Kamojang"} pada{" "}
                {formatDate(booking.approvalDetails?.approvedAt || new Date().toISOString())}.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  topBarTitleBox: {
    flex: 1,
    marginHorizontal: 12,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EAF8F0",
  },
  shareBtn: {
    backgroundColor: "#0D7A53",
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#EAF8F0",
  },
  loadingText: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "600",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  paper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  paperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgePge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgePgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
    letterSpacing: 0.5,
  },
  pgeAreaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 2,
  },
  approvedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  approvedPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  docLabel: {
    fontSize: 11,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  docValHighlight: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 2,
  },
  docVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  detailVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "500",
    flex: 1.5,
    textAlign: "right",
  },
  detailValBold: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
    flex: 1.5,
    textAlign: "right",
  },
  noticeBox: {
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    padding: 12,
    borderRadius: 6,
    marginVertical: 12,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },
  approvalStampBox: {
    alignItems: "center",
    paddingTop: 10,
  },
  stampText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    fontStyle: "italic",
  },
});

