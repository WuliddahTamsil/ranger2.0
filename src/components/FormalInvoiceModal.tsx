import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Share,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  X,
  Share2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  Store,
  User,
  Truck,
  Calendar,
  CreditCard,
} from "lucide-react-native";
import { rp } from "../utils/formatters";

export interface InvoiceItemDetail {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber?: string;
  date?: string;
  time?: string;
  status: "Selesai" | "Dibatalkan" | "Lunas" | string;
  orderType?: "Catering" | "Marketplace" | "Laundry" | "Kos" | string;
  
  // Merchant Info
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;

  // Customer Info
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;

  // Courier / Logistics
  driverName?: string;
  driverVehicle?: string;
  driverPlate?: string;

  // Items
  items: InvoiceItemDetail[];

  // Cost breakdown
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

interface FormalInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  data: InvoiceData | null;
}

export const FormalInvoiceModal: React.FC<FormalInvoiceModalProps> = ({
  visible,
  onClose,
  data,
}) => {
  if (!visible || !data) return null;

  const isCanceled = data.status.toLowerCase().includes("batal");
  const cleanId = (data.id || "").replace(/^#/, "");
  const formattedId = cleanId.length >= 8 ? cleanId.slice(-8).toUpperCase() : cleanId.toUpperCase();
  const invoiceNum = data.invoiceNumber || `INV/${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}/RNG-${formattedId}`;
  
  const subtotal = data.subtotal || data.items.reduce((sum, item) => sum + item.total, 0) || data.total;
  const deliveryFee = data.deliveryFee ?? (data.total > subtotal ? data.total - subtotal : 5000);
  const serviceFee = data.serviceFee ?? 1000;
  const discount = data.discount || 0;
  const finalTotal = data.total || (subtotal + deliveryFee + serviceFee - discount);
  const paymentMethod = data.paymentMethod || "QRIS / Transfer Bank BCA";
  const dateStr = data.date || "Hari ini";
  const timeStr = data.time || "14:45 WIB";
  const storeName = data.storeName || (data.orderType === "Catering" ? "Dapur Barokah Catering" : "Toko Marketplace GEOVERSE");
  const storeAddress = data.storeAddress || "Jl. Telang Raya No. 45, Kamal, Bangkalan, Madura";

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Generate Professional HTML Document for PDF Printing & Sharing
  const getFormalInvoiceHTML = () => {
    const itemsHtml = data.items
      .map(
        (item, idx) => `
        <tr>
          <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-size: 12px;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0;">
            <div style="font-weight: 700; color: #0F172A; font-size: 13px;">${item.name}</div>
          </td>
          <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #334155; font-size: 12px;">${item.quantity}x</td>
          <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #E2E8F0; color: #475569; font-size: 12px;">${rp(item.price)}</td>
          <td style="text-align: right; padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 13px;">${rp(item.total)}</td>
        </tr>
      `
      )
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Faktur Resmi - ${invoiceNum}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0F172A;
      background-color: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-wrapper {
      max-width: 760px;
      margin: 0 auto;
      border: 1px solid #DDE9E1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .top-strip {
      height: 4px;
      background-color: ${isCanceled ? "#DC2626" : "#176B49"};
    }
    .content-padded {
      padding: 28px 32px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .header-table td {
      vertical-align: top;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #176B49;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .brand-tagline {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 3px 0;
    }
    .brand-address {
      font-size: 11px;
      color: #94A3B8;
      margin: 0;
    }
    .inv-header-right {
      text-align: right;
    }
    .inv-title-badge {
      display: inline-block;
      background-color: #EAF7EF;
      color: #176B49;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .inv-title-badge.canceled {
      background-color: #FEE2E2;
      color: #DC2626;
    }
    .inv-code {
      font-family: monospace;
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 4px 0;
    }
    .inv-date {
      font-size: 11px;
      color: #64748B;
      margin: 0;
    }
    .stamp-wrap {
      margin-bottom: 24px;
      text-align: center;
    }
    .stamp-box {
      display: inline-block;
      border: 1px solid ${isCanceled ? "#FCA5A5" : "#B9DEC5"};
      background-color: ${isCanceled ? "#FEF2F2" : "#F4FBF6"};
      padding: 8px 24px;
      border-radius: 10px;
    }
    .stamp-title {
      font-size: 13px;
      font-weight: 900;
      color: ${isCanceled ? "#DC2626" : "#0D7A53"};
      letter-spacing: 1px;
      margin: 0;
    }
    .stamp-sub {
      font-size: 9px;
      font-weight: 700;
      color: ${isCanceled ? "#EF4444" : "#16A34A"};
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .parties-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 16px 0;
      margin-left: -16px;
      margin-right: -16px;
      margin-bottom: 24px;
    }
    .party-box {
      width: 50%;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px;
      vertical-align: top;
    }
    .party-heading {
      font-size: 10px;
      font-weight: 800;
      color: #64748B;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .party-detail {
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
    }
    .logistics-bar {
      background-color: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 24px;
      font-size: 11px;
      color: #166534;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background-color: #F0F8F2;
      color: #176B49;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-top: 1px solid #CBD5E1;
      border-bottom: 1px solid #CBD5E1;
    }
    .cost-summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .cost-summary-table td {
      padding: 6px 12px;
      font-size: 12px;
    }
    .cost-label {
      color: #64748B;
      width: 70%;
    }
    .cost-val {
      text-align: right;
      font-weight: 600;
      color: #334155;
    }
    .grand-total-row {
      background-color: #F0FDF4;
      border: 1px solid #86EFAC;
    }
    .grand-total-row td {
      padding: 12px 14px;
    }
    .grand-total-label {
      font-size: 13px;
      font-weight: 800;
      color: #0D7A53;
    }
    .grand-total-val {
      font-size: 16px;
      font-weight: 900;
      color: #0D7A53;
      text-align: right;
    }
    .security-footer {
      border-top: 1px dashed #CBD5E1;
      padding-top: 20px;
      text-align: center;
    }
    .barcode-visual {
      font-family: monospace;
      letter-spacing: 4px;
      font-size: 18px;
      font-weight: 900;
      color: #334155;
      margin-bottom: 4px;
    }
    .barcode-code {
      font-family: monospace;
      font-size: 10px;
      color: #64748B;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .legal-notice {
      font-size: 10px;
      color: #94A3B8;
      max-width: 580px;
      margin: 0 auto;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="top-strip"></div>
    <div class="content-padded">
      <table class="header-table">
        <tr>
          <td>
            <div class="brand-title">GEOVERSE 2.0</div>
            <div class="brand-tagline">Platform Layanan & Mitra Resmi Kampus UTM</div>
            <div class="brand-address">Bangkalan, Jawa Timur • cs@geoverse.id</div>
          </td>
          <td class="inv-header-right">
            <div class="inv-title-badge ${isCanceled ? "canceled" : ""}">FAKTUR RESMI ELEKTRONIK</div>
            <div class="inv-code">${invoiceNum}</div>
            <div class="inv-date">Tanggal: ${dateStr}, ${timeStr}</div>
          </td>
        </tr>
      </table>

      <div class="stamp-wrap">
        <div class="stamp-box">
          <div class="stamp-title">${isCanceled ? "✕ DIBATALKAN" : "✓ LUNAS / PAID"}</div>
          <div class="stamp-sub">DIVERIFIKASI SISTEM PEMBAYARAN GEOVERSE</div>
        </div>
      </div>

      <table class="parties-table">
        <tr>
          <td class="party-box">
            <div class="party-heading">DITERBITKAN OLEH:</div>
            <div class="party-name">${storeName}</div>
            <div class="party-detail">Mitra Terverifikasi GEOVERSE</div>
            <div class="party-detail">${storeAddress}</div>
          </td>
          <td class="party-box">
            <div class="party-heading">DITUJUKAN KEPADA:</div>
            <div class="party-name">${data.customerName}</div>
            ${data.customerPhone ? `<div class="party-detail">Telp: ${data.customerPhone}</div>` : ""}
            <div class="party-detail">${data.customerAddress || "Bangkalan, Madura"}</div>
          </td>
        </tr>
      </table>

      ${data.driverName ? `
      <div class="logistics-bar">
        <strong>Pengantaran Kurir GEOVERSE:</strong> ${data.driverName} • ${data.driverVehicle || "Motor"} ${data.driverPlate ? `(${data.driverPlate})` : ""}
      </div>
      ` : ""}

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: center; width: 40px;">NO</th>
            <th style="text-align: left;">RINCIAN PESANAN</th>
            <th style="text-align: center; width: 60px;">QTY</th>
            <th style="text-align: right; width: 110px;">HARGA</th>
            <th style="text-align: right; width: 120px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <table class="cost-summary-table">
        <tr>
          <td class="cost-label">Subtotal Pembelian</td>
          <td class="cost-val">${rp(subtotal)}</td>
        </tr>
        <tr>
          <td class="cost-label">Biaya Pengiriman (Ongkos Kirim Kurir)</td>
          <td class="cost-val">${rp(deliveryFee)}</td>
        </tr>
        <tr>
          <td class="cost-label">Biaya Layanan & Sistem</td>
          <td class="cost-val">${rp(serviceFee)}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td class="cost-label" style="color: #16A34A;">Potongan Promo / Diskon</td>
          <td class="cost-val" style="color: #16A34A;">-${rp(discount)}</td>
        </tr>
        ` : ""}
        <tr class="grand-total-row">
          <td class="grand-total-label">TOTAL PEMBAYARAN</td>
          <td class="grand-total-val">${rp(finalTotal)}</td>
        </tr>
      </table>

      <div style="font-size: 11px; color: #64748B; margin-bottom: 20px;">
        <strong>Metode Pembayaran:</strong> ${paymentMethod} &bull; 
        <strong>Status:</strong> ${isCanceled ? '<span style="color:#DC2626; font-weight:700;">DIBATALKAN</span>' : '<span style="color:#16A34A; font-weight:700;">LUNAS</span>'}
      </div>

      <div class="security-footer">
        <div class="barcode-visual">||| | || ||| || | ||| || |||| | ||| || ||| |</div>
        <div class="barcode-code">SEC-AUTH-${cleanId.slice(0, 16).toUpperCase()}</div>
        <div class="legal-notice">
          Faktur ini diterbitkan secara elektronik oleh sistem GEOVERSE 2.0 dan merupakan dokumen bukti pembayaran resmi yang sah. Tidak memerlukan tanda tangan basah berdasarkan UU ITE Republik Indonesia.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Generate and Share Actual PDF File
  const handleSharePDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = getFormalInvoiceHTML();

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Bagikan Faktur PDF - ${invoiceNum}`,
        });
      } else {
        const itemsListText = data.items
          .map((i, idx) => `${idx + 1}. ${i.name} (${i.quantity}x) - ${rp(i.total)}`)
          .join("\n");
        const message = `==============================\n📄 FAKTUR RESMI GEOVERSE 2.0\n==============================\nNo. Invoice: ${invoiceNum}\nTanggal: ${dateStr}, ${timeStr}\nStatus: ${isCanceled ? "DIBATALKAN" : "LUNAS"}\n\nMitra: ${storeName}\nPemesan: ${data.customerName}\nTotal: ${rp(finalTotal)}\nFile PDF tersimpan di perangkat.`;
        await Share.share({ message, title: `Invoice ${invoiceNum}` });
      }
    } catch (err: any) {
      console.error("Error generating/sharing PDF:", err);
      Alert.alert(
        "Gagal Memproses PDF",
        "Terjadi kendala saat membuat dokumen PDF faktur. Silakan coba kembali."
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct System Printing / Save as PDF
  const handlePrint = async () => {
    try {
      const html = getFormalInvoiceHTML();
      await Print.printAsync({ html });
    } catch (err) {
      console.error("Error printing invoice:", err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ResponsiveSafeAreaView style={styles.modalBackdrop}>
        <View style={styles.modalWindow}>
          {/* Top Actions Bar */}
          <View style={styles.topActionsBar}>
            <View style={styles.topActionsLeft}>
              <FileText size={18} color="#0D7A53" />
              <Text style={styles.topActionsTitle}>Faktur Transaksi Resmi</Text>
            </View>
            <View style={styles.topActionsRight}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={handleSharePDF}
                disabled={isGeneratingPdf}
                activeOpacity={0.7}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#0D7A53" />
                ) : (
                  <Share2 size={16} color="#0D7A53" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconBtn} onPress={handlePrint} activeOpacity={0.7}>
                <Printer size={16} color="#0D7A53" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeIconBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Printable Formal Invoice Paper Scroll */}
          <ScrollView
            style={styles.invoiceScroll}
            contentContainerStyle={styles.invoiceScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.invoicePaper}>
              {/* Paper Top Accent Line */}
              <View style={[styles.invoiceTopStrip, isCanceled && styles.invoiceTopStripCanceled]} />

              {/* 1. Header Platform & Invoice Identity */}
              <View style={styles.invoiceHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.brandRow}>
                    <ShieldCheck size={20} color="#0D7A53" />
                    <Text style={styles.brandName}>GEOVERSE 2.0</Text>
                  </View>
                  <Text style={styles.brandSubtitle}>Platform Layanan & Mitra Resmi Kampus UTM</Text>
                  <Text style={styles.brandAddress}>Bangkalan, Jawa Timur • cs@geoverse.id</Text>
                </View>

                <View style={styles.invoiceCodeBlock}>
                  <Text style={styles.invoiceTitleBadge}>INVOICE RESMI</Text>
                  <Text style={styles.invoiceNumText}>{invoiceNum}</Text>
                  <Text style={styles.invoiceDateText}>{dateStr}, {timeStr}</Text>
                </View>
              </View>

              {/* Official Rubber Stamp Badge */}
              <View style={styles.stampContainer}>
                <View style={[styles.stampBox, isCanceled ? styles.stampBoxCanceled : styles.stampBoxPaid]}>
                  <Text style={[styles.stampTextMain, isCanceled ? styles.stampTextCanceled : styles.stampTextPaid]}>
                    {isCanceled ? "✕ DIBATALKAN" : "✓ LUNAS / PAID"}
                  </Text>
                  <Text style={[styles.stampTextSub, isCanceled ? styles.stampTextCanceled : styles.stampTextPaid]}>
                    VERIFIKASI SISTEM ELEKTRONIK
                  </Text>
                </View>
              </View>

              <View style={styles.formalDivider} />

              {/* 2. Parties Info Grid: Mitra (Penjual) vs Pemesan (Pembeli) */}
              <View style={styles.partiesGrid}>
                {/* Mitra Column */}
                <View style={styles.partyColumn}>
                  <View style={styles.partyHeader}>
                    <Store size={14} color="#0D7A53" />
                    <Text style={styles.partyHeaderText}>DITERBITKAN OLEH:</Text>
                  </View>
                  <Text style={styles.partyName}>{storeName}</Text>
                  <Text style={styles.partyDesc}>Mitra Terverifikasi GEOVERSE</Text>
                  <View style={styles.partyAddressRow}>
                    <MapPin size={12} color="#64748B" />
                    <Text style={styles.partyAddressText} numberOfLines={2}>
                      {storeAddress}
                    </Text>
                  </View>
                </View>

                <View style={styles.partyVerticalLine} />

                {/* Customer Column */}
                <View style={styles.partyColumn}>
                  <View style={styles.partyHeader}>
                    <User size={14} color="#0D7A53" />
                    <Text style={styles.partyHeaderText}>DITUJUKAN KEPADA:</Text>
                  </View>
                  <Text style={styles.partyName}>{data.customerName}</Text>
                  {data.customerPhone && (
                    <View style={styles.partyAddressRow}>
                      <Phone size={12} color="#64748B" />
                      <Text style={styles.partyAddressText}>{data.customerPhone}</Text>
                    </View>
                  )}
                  <View style={styles.partyAddressRow}>
                    <MapPin size={12} color="#64748B" />
                    <Text style={styles.partyAddressText} numberOfLines={2}>
                      {data.customerAddress || "Bangkalan, Madura"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 3. Logistics & Kurir Delivery Info (Jika ada) */}
              {data.driverName && (
                <View style={styles.logisticsBar}>
                  <View style={styles.logisticsIconBg}>
                    <Truck size={14} color="#0D7A53" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logisticsTitle}>Pengantaran Kurir GEOVERSE</Text>
                    <Text style={styles.logisticsDesc}>
                      Kurir: <Text style={{ fontWeight: "700", color: "#0F172A" }}>{data.driverName}</Text> • {data.driverVehicle || "Motor"} {data.driverPlate ? `(${data.driverPlate})` : ""}
                    </Text>
                  </View>
                  <View style={styles.logisticsBadge}>
                    <Text style={styles.logisticsBadgeText}>Terkirim</Text>
                  </View>
                </View>
              )}

              {/* 4. Itemized Table of Goods / Services */}
              <View style={styles.tableWrap}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { width: 28 }]}>NO</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>RINCIAN ITEM</Text>
                  <Text style={[styles.tableHeaderCell, { width: 38, textAlign: "center" }]}>QTY</Text>
                  <Text style={[styles.tableHeaderCell, { width: 75, textAlign: "right" }]}>HARGA</Text>
                  <Text style={[styles.tableHeaderCell, { width: 85, textAlign: "right" }]}>SUBTOTAL</Text>
                </View>

                {data.items.length === 0 ? (
                  <View style={styles.tableBodyRow}>
                    <Text style={[styles.tableCell, { flex: 1 }]}>Menu / Produk Pesanan</Text>
                    <Text style={[styles.tableCell, { width: 38, textAlign: "center" }]}>1x</Text>
                    <Text style={[styles.tableCell, { width: 75, textAlign: "right" }]}>{rp(data.total)}</Text>
                    <Text style={[styles.tableCellBold, { width: 85, textAlign: "right" }]}>{rp(data.total)}</Text>
                  </View>
                ) : (
                  data.items.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.tableBodyRow,
                        index % 2 === 1 && { backgroundColor: "#F8FAFC" },
                      ]}
                    >
                      <Text style={[styles.tableCell, { width: 28, color: "#94A3B8" }]}>{index + 1}</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: "600", color: "#0F172A" }]} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={[styles.tableCell, { width: 38, textAlign: "center" }]}>{item.quantity}x</Text>
                      <Text style={[styles.tableCell, { width: 75, textAlign: "right" }]}>
                        {rp(item.price || (item.quantity > 0 ? item.total / item.quantity : item.total))}
                      </Text>
                      <Text style={[styles.tableCellBold, { width: 85, textAlign: "right" }]}>
                        {rp(item.total)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* 5. Cost Breakdown & Payment Summary */}
              <View style={styles.breakdownContainer}>
                <View style={styles.breakdownInner}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal Produk</Text>
                    <Text style={styles.breakdownVal}>{rp(subtotal)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Biaya Ongkos Kirim (Kurir)</Text>
                    <Text style={styles.breakdownVal}>{rp(deliveryFee)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Biaya Layanan & Sistem</Text>
                    <Text style={styles.breakdownVal}>{rp(serviceFee)}</Text>
                  </View>
                  {discount > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: "#15803D" }]}>Diskon Promo</Text>
                      <Text style={[styles.breakdownVal, { color: "#15803D" }]}>- {rp(discount)}</Text>
                    </View>
                  )}

                  <View style={styles.breakdownTotalDivider} />

                  <View style={styles.breakdownTotalRow}>
                    <View>
                      <Text style={styles.grandTotalLabel}>TOTAL PEMBAYARAN</Text>
                      <Text style={styles.paymentMethodSub}>{paymentMethod}</Text>
                      <Text style={styles.paymentStatusSub}>{data.paymentStatus || (isCanceled ? "Dibatalkan" : "Lunas")}</Text>
                    </View>
                    <Text style={styles.grandTotalVal}>{rp(finalTotal)}</Text>
                  </View>
                </View>
              </View>

              {/* 6. Official Barcode & Computer Generated Notice */}
              <View style={styles.securityFooter}>
                <View style={styles.barcodeBox}>
                  <Text style={styles.barcodeVisual}>||| | || ||| || | ||| || |||| | ||| || ||| |</Text>
                  <Text style={styles.barcodeNumber}>SEC-AUTH-{cleanId.slice(0, 16).toUpperCase()}</Text>
                </View>
                <Text style={styles.legalNotice}>
                  Faktur ini diterbitkan secara elektronik oleh sistem GEOVERSE 2.0 dan merupakan dokumen bukti pembayaran resmi yang sah. Tidak memerlukan tanda tangan basah.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Sheet Footer */}
          <View style={styles.bottomFooter}>
            <TouchableOpacity
              style={[styles.footerShareBtn, isGeneratingPdf && styles.footerShareBtnDisabled]}
              onPress={handleSharePDF}
              disabled={isGeneratingPdf}
              activeOpacity={0.8}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Share2 size={16} color="#FFFFFF" />
              )}
              <Text style={styles.footerShareBtnText}>
                {isGeneratingPdf ? "Membuat PDF..." : "Bagikan File PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerPrintBtn}
              onPress={handlePrint}
              activeOpacity={0.8}
            >
              <Printer size={15} color="#0D7A53" />
              <Text style={styles.footerPrintBtnText}>Cetak</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.footerCloseBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ResponsiveSafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  modalWindow: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "94%",
    backgroundColor: "#F6F9F7",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  topActionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE8",
  },
  topActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topActionsTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#10251B",
  },
  topActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EAF7EF",
    borderWidth: 1,
    borderColor: "#D6ECDD",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceScroll: {
    flex: 1,
  },
  invoiceScrollContent: {
    padding: 14,
    paddingBottom: 18,
  },
  invoicePaper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DDE9E1",
    position: "relative",
    overflow: "hidden",
  },
  invoiceTopStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#0D7A53",
  },
  invoiceTopStripCanceled: {
    backgroundColor: "#DC2626",
  },
  invoiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 5,
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#176B49",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#476157",
    marginTop: 2,
  },
  brandAddress: {
    fontSize: 9,
    color: "#7A8C82",
    marginTop: 1,
  },
  invoiceCodeBlock: {
    alignItems: "flex-end",
  },
  invoiceTitleBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: "#176B49",
    backgroundColor: "#EAF7EF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  invoiceNumText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
  },
  invoiceDateText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  stampContainer: {
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 0,
  },
  stampBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignItems: "center",
  },
  stampBoxPaid: {
    borderColor: "#B9DEC5",
    backgroundColor: "#F4FBF6",
  },
  stampBoxCanceled: {
    borderColor: "#DC2626",
    backgroundColor: "rgba(254, 226, 226, 0.4)",
  },
  stampTextMain: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  stampTextPaid: {
    color: "#15803D",
  },
  stampTextCanceled: {
    color: "#DC2626",
  },
  stampTextSub: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  formalDivider: {
    height: 1,
    backgroundColor: "#E5EEE8",
    marginVertical: 15,
  },
  partiesGrid: {
    flexDirection: "row",
    gap: 12,
  },
  partyColumn: {
    flex: 1,
  },
  partyVerticalLine: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  partyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  partyHeaderText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#176B49",
    letterSpacing: 0.4,
  },
  partyName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  partyDesc: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  partyAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  partyAddressText: {
    fontSize: 10,
    color: "#475569",
    flex: 1,
    lineHeight: 14,
  },
  logisticsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4FBF6",
    borderWidth: 1,
    borderColor: "#D6ECDD",
    borderRadius: 12,
    padding: 8,
    marginTop: 10,
    gap: 8,
  },
  logisticsIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  logisticsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  logisticsDesc: {
    fontSize: 10,
    color: "#475569",
    marginTop: 1,
  },
  logisticsBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logisticsBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
  tableWrap: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DDE9E1",
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8F2",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "800",
    color: "#176B49",
    letterSpacing: 0.3,
  },
  tableBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F4F1",
  },
  tableCell: {
    fontSize: 10,
    color: "#334155",
  },
  tableCellBold: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
  },
  breakdownContainer: {
    alignItems: "flex-end",
    marginTop: 12,
  },
  breakdownInner: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#F7FAF8",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DDE9E1",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  breakdownVal: {
    fontSize: 10,
    color: "#0F172A",
    fontWeight: "700",
  },
  breakdownTotalDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 6,
  },
  breakdownTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#176B49",
    letterSpacing: 0.4,
  },
  paymentMethodSub: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 1,
  },
  paymentStatusSub: {
    fontSize: 9,
    color: "#15803D",
    marginTop: 2,
    fontWeight: "700",
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  securityFooter: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  barcodeBox: {
    alignItems: "center",
    marginBottom: 6,
  },
  barcodeVisual: {
    fontSize: 14,
    color: "#0F172A",
    letterSpacing: 2,
    fontWeight: "900",
  },
  barcodeNumber: {
    fontSize: 8,
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  legalNotice: {
    fontSize: 8,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 11,
    paddingHorizontal: 12,
  },
  bottomFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "#E5EEE8",
  },
  footerShareBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#176B49",
    paddingVertical: 11,
    borderRadius: 12,
  },
  footerShareBtnDisabled: {
    opacity: 0.7,
  },
  footerShareBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerPrintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F4FBF6",
    borderWidth: 1,
    borderColor: "#B9DEC5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  footerPrintBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  footerCloseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  footerCloseBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
});
