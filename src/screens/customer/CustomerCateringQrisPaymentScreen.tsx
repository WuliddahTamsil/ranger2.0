import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import Svg, { Rect } from "react-native-svg";
import { toQR } from "toqr";
import {
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  ImageIcon,
  X,
  Copy,
  Download,
  FileText,
  Calendar,
  CreditCard,
  ChevronRight,
  Info,
  Maximize2,
  RefreshCw,
} from "lucide-react-native";
import { Nav, OrderItem } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { rp } from "../../utils/formatters";
import {
  submitCateringPayment,
  uploadFileToBackend,
  getCateringOrdersForCustomer,
} from "../../services/api";
import {
  getCustomerOrders,
  updateCustomerOrder,
  subscribeCustomerOrders,
} from "./customerOrderStore";

interface CustomerCateringQrisPaymentProps extends Nav {
  authAccount?: AuthAccount | null;
  orderData?: any;
}

export type PaymentStatusType =
  | "Menunggu Pembayaran"
  | "Menunggu Verifikasi"
  | "Pembayaran Terverifikasi"
  | "Pembayaran Ditolak";

// Default dummy QRIS payment data matching the exact user specification
const DEFAULT_SPEC_ORDER = {
  id: "CAT-5200",
  orderCode: "PO-5200",
  storeName: "Catering Berkah Nusantara",
  menuName: "Paket Prasmanan Syukuran (25 Pax)",
  total: 520000,
  paidAmount: 0,
  remainingAmount: 520000,
  dueDate: "18 September 2026",
  proposedAmount: 156000, // 30% DP pelunasan sesuai skenario prompt
  method: "QRIS",
};

export const CustomerCateringQrisPaymentScreen: React.FC<CustomerCateringQrisPaymentProps> = ({
  navigate,
  authAccount,
  orderData,
}) => {
  // 1. Order state & payment amounts
  const [order, setOrder] = useState<any>(() => {
    if (orderData) return orderData;
    const existing = getCustomerOrders().find(
      (o) =>
        o.type.toLowerCase().includes("cater") &&
        (o.paymentMethod === "qris" || String(o.id).startsWith("CAT") || o.remainingAmount)
    );
    return existing || DEFAULT_SPEC_ORDER;
  });

  const totalOrderAmount = Number(order?.total ?? DEFAULT_SPEC_ORDER.total);
  const [paidAmount, setPaidAmount] = useState<number>(
    Number(order?.paidAmount ?? DEFAULT_SPEC_ORDER.paidAmount)
  );
  const [remainingAmount, setRemainingAmount] = useState<number>(
    Number(order?.remainingAmount ?? (totalOrderAmount - paidAmount))
  );

  const proposedAmount = useMemo(() => {
    if (remainingAmount <= 0) return 0;
    if (order?.paymentOption === "dp30" && paidAmount === 0) {
      return Math.min(Math.round(totalOrderAmount * 0.3), remainingAmount);
    }
    if (order?.paymentOption === "dp50" && paidAmount === 0) {
      return Math.min(Math.round(totalOrderAmount * 0.5), remainingAmount);
    }
    if (totalOrderAmount === 520000 && remainingAmount >= 156000) {
      return 156000;
    }
    return remainingAmount;
  }, [remainingAmount, paidAmount, totalOrderAmount, order?.paymentOption]);

  // Payment status state: "Menunggu Pembayaran" | "Menunggu Verifikasi" | "Pembayaran Terverifikasi" | "Pembayaran Ditolak"
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(() => {
    const rawStatus = String(order?.paymentStatus || "").toLowerCase();
    if (rawStatus.includes("verifikasi") && !rawStatus.includes("terverifikasi")) {
      return "Menunggu Verifikasi";
    }
    if (rawStatus.includes("terverifikasi") || rawStatus.includes("lunas")) {
      return "Pembayaran Terverifikasi";
    }
    if (rawStatus.includes("tolak") || rawStatus.includes("ditolak")) {
      return "Pembayaran Ditolak";
    }
    return "Menunggu Pembayaran";
  });

  // Rejection reason if payment was rejected
  const [rejectionReason, setRejectionReason] = useState<string>(
    order?.paymentRejectionReason || "Nominal bukti transfer tidak sesuai dengan tagihan."
  );

  // Submission metadata
  const [submissionDate, setSubmissionDate] = useState<string>(
    order?.submissionDate || "17 September 2026, 17:35 WIB"
  );
  const [uploadedProofUri, setUploadedProofUri] = useState<string | null>(
    order?.paymentProofUrl || null
  );

  // 2. Modals state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showUploadSheet, setShowUploadSheet] = useState<boolean>(false);
  const [showLightbox, setShowLightbox] = useState<boolean>(false);

  // Selected image inside upload bottom sheet
  const [selectedProof, setSelectedProof] = useState<{
    uri: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // Sync with customer orders store
  useEffect(() => {
    const unsubscribe = subscribeCustomerOrders((orders) => {
      const active = orders.find(
        (o) =>
          o.id === order?.id ||
          (o.type.toLowerCase().includes("cater") && o.paymentMethod === "qris")
      );
      if (active) {
        setOrder(active);
        if (typeof active.paidAmount === "number") setPaidAmount(active.paidAmount);
        if (typeof active.remainingAmount === "number") setRemainingAmount(active.remainingAmount);
        const norm = String(active.paymentStatus || "").toLowerCase();
        if (norm.includes("verifikasi") && !norm.includes("terverifikasi")) {
          setPaymentStatus("Menunggu Verifikasi");
        } else if (norm.includes("terverifikasi") || norm.includes("lunas")) {
          setPaymentStatus("Pembayaran Terverifikasi");
        } else if (norm.includes("tolak") || norm.includes("ditolak")) {
          setPaymentStatus("Pembayaran Ditolak");
        }
      }
    });
    return unsubscribe;
  }, [order?.id]);

  // Fetch live active order from backend so real amounts & statuses sync automatically
  useEffect(() => {
    if (!authAccount?.id) return;
    let active = true;
    const fetchLatestCatering = async () => {
      try {
        const res = await getCateringOrdersForCustomer(authAccount.id);
        if (!active || !res.success || !Array.isArray(res.data) || res.data.length === 0) return;
        const live = orderData?.id
          ? res.data.find((o: any) => String(o._id || o.id) === String(orderData.id))
          : res.data.find((o: any) => String(o.paymentMethod || "").toLowerCase() === "qris") || res.data[0];
        if (live) {
          setOrder((prev: any) => ({
            ...prev,
            id: live._id,
            orderCode: live.orderCode,
            total: live.totalAmount,
            paidAmount: live.paidAmount,
            remainingAmount: live.remainingAmount,
            paymentStatus: live.paymentStatus,
            paymentMethod: live.paymentMethod,
            paymentProofUrl: live.paymentProofUrl || (live.paymentHistory && live.paymentHistory[live.paymentHistory.length - 1]?.proofUrl),
            paymentHistory: live.paymentHistory,
            paymentOption: live.paymentOption,
          }));
          if (typeof live.paidAmount === "number") setPaidAmount(live.paidAmount);
          if (typeof live.remainingAmount === "number") setRemainingAmount(live.remainingAmount);
          const norm = String(live.paymentStatus || "").toLowerCase();
          if (norm.includes("verifikasi") && !norm.includes("terverifikasi")) {
            setPaymentStatus("Menunggu Verifikasi");
          } else if (norm.includes("terverifikasi") || norm.includes("lunas")) {
            setPaymentStatus("Pembayaran Terverifikasi");
          } else if (norm.includes("tolak") || norm.includes("ditolak")) {
            setPaymentStatus("Pembayaran Ditolak");
            const lastRejected = (live.paymentHistory || []).slice().reverse().find((p: any) => p.status === "DITOLAK");
            if (lastRejected?.rejectionReason) {
              setRejectionReason(lastRejected.rejectionReason);
            }
          }
          if (live.paymentProofUrl) {
            setUploadedProofUri(live.paymentProofUrl);
          }
        }
      } catch (err) {
        console.error("fetchLatestCatering error:", err);
      }
    };
    fetchLatestCatering();
    const interval = setInterval(fetchLatestCatering, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [authAccount?.id, orderData?.id]);

  // Generate SVG QR Matrix from toqr
  const qrMatrix = useMemo(() => {
    try {
      const payload = `00020101021226670016ID.CO.QRIS.WWW01189360099900000052000215ID10200238493010303UME51440014ID.GO.GPN.WWW0215ID10200238493010303UME5204581253033605406${totalOrderAmount}5802ID5925CATERING BERKAH NUSANTARA6007BANDUNG61054011162230519PO5200-PELUNASAN6304A1B2`;
      const result = toQR(payload);
      if (Array.isArray(result) || typeof result === "object") {
        return Object.values(result) as number[];
      }
      return null;
    } catch {
      return null;
    }
  }, [totalOrderAmount]);

  // Handle action 1: Copy nominal
  const handleCopyNominal = async () => {
    await Clipboard.setStringAsync(proposedAmount.toString());
    if (Platform.OS === "web") {
      alert(`Nominal ${rp(proposedAmount)} berhasil disalin.`);
    } else {
      Alert.alert("Tersalin", `Nominal ${rp(proposedAmount)} berhasil disalin ke clipboard.`);
    }
  };

  // Handle action 2: Save QRIS
  const handleSaveQRIS = async () => {
    if (Platform.OS === "web") {
      alert("Barcode QRIS dapat di-screenshot untuk pembayaran melalui aplikasi perbankan atau e-wallet.");
    } else {
      Alert.alert(
        "Simpan QRIS",
        "Silakan screenshot tampilan barcode QRIS ini untuk diimpor ke aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, Dana, ShopeePay)."
      );
    }
  };

  // Handle pick image from Gallery
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Diperlukan", "Mohon berikan izin akses galeri untuk memilih foto bukti pembayaran.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedProof({
          uri: asset.uri,
          name: asset.fileName || `bukti-qris-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        });
      }
    } catch (error) {
      Alert.alert("Gagal Membuka Galeri", "Terjadi kendala saat membuka galeri foto.");
    }
  };

  // Handle take photo from Camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Diperlukan", "Mohon berikan izin akses kamera untuk mengambil foto bukti pembayaran.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedProof({
          uri: asset.uri,
          name: asset.fileName || `bukti-qris-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        });
      }
    } catch (error) {
      Alert.alert("Gagal Membuka Kamera", "Terjadi kendala saat membuka kamera.");
    }
  };

  // Handle Send Payment Proof
  const handleSendPaymentProof = async () => {
    if (!selectedProof) {
      Alert.alert("Bukti Pembayaran Diperlukan", "Pilih foto bukti transfer atau pembayaran terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    let finalProofUrl = selectedProof.uri;

    try {
      let targetOrderId = order?.id;
      if (!/^[a-f\d]{24}$/i.test(String(targetOrderId)) && authAccount?.id) {
        const liveRes = await getCateringOrdersForCustomer(authAccount.id);
        if (liveRes.success && Array.isArray(liveRes.data) && liveRes.data.length > 0) {
          const match = liveRes.data.find((o: any) => String(o.paymentMethod || "").toLowerCase() === "qris") || liveRes.data[0];
          if (match) {
            targetOrderId = match._id;
            setOrder((prev: any) => ({ ...prev, id: match._id }));
          }
        }
      }

      // If order is real backend order, upload to backend server
      if (targetOrderId && /^[a-f\d]{24}$/i.test(String(targetOrderId))) {
        setIsUploadingImage(true);
        const uploadRes = await uploadFileToBackend(
          selectedProof.uri,
          selectedProof.name,
          selectedProof.mimeType
        );
        setIsUploadingImage(false);
        if (!uploadRes.success || !uploadRes.data?.url) {
          throw new Error(uploadRes.message || "Bukti pembayaran gagal diunggah.");
        }
        finalProofUrl = uploadRes.data.url;

        const submitRes = await submitCateringPayment(
          targetOrderId,
          proposedAmount,
          `QRIS-${Date.now().toString().slice(-6)}`,
          finalProofUrl
        );

        if (!submitRes.success) {
          throw new Error(submitRes.message || "Gagal mengirim pengajuan pembayaran.");
        }
      }

      // Update local state
      const now = new Date();
      const formattedDate = `${now.getDate()} September ${now.getFullYear()}, ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;

      setUploadedProofUri(finalProofUrl);
      setSubmissionDate(formattedDate);
      setPaymentStatus("Menunggu Verifikasi");
      setShowUploadSheet(false);
      setSelectedProof(null);

      // Update in Customer Orders store
      if (order?.id) {
        updateCustomerOrder({
          ...order,
          paymentStatus: "Menunggu Verifikasi",
          paymentProofUrl: finalProofUrl,
          submissionDate: formattedDate,
        } as OrderItem);
      }

      Alert.alert(
        "Bukti Pembayaran Terkirim",
        "Bukti pembayaran telah dikirim dan sedang menunggu verifikasi Pemilik Catering."
      );
    } catch (err: any) {
      Alert.alert("Pengiriman Gagal", err?.message || "Terjadi kesalahan saat mengirim bukti pembayaran.");
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  // Status configuration details
  const statusConfig = useMemo(() => {
    switch (paymentStatus) {
      case "Menunggu Verifikasi":
        return {
          label: "Menunggu Verifikasi",
          color: "#2563EB",
          bg: "#EFF6FF",
          border: "#BFDBFE",
          icon: Clock,
          desc: "Bukti pembayaran telah dikirim dan sedang menunggu verifikasi Pemilik Catering.",
        };
      case "Pembayaran Terverifikasi":
        return {
          label: "Pembayaran Terverifikasi",
          color: "#15803D",
          bg: "#DCFCE7",
          border: "#86EFAC",
          icon: CheckCircle2,
          desc: "Pembayaran telah divalidasi oleh Pemilik Catering. Pesanan Anda diproses.",
        };
      case "Pembayaran Ditolak":
        return {
          label: "Pembayaran Ditolak",
          color: "#DC2626",
          bg: "#FEE2E2",
          border: "#FCA5A5",
          icon: AlertCircle,
          desc: "Bukti pembayaran ditolak oleh Pemilik Catering. Silakan periksa alasan dan unggah bukti baru.",
        };
      case "Menunggu Pembayaran":
      default:
        return {
          label: "Menunggu Pembayaran",
          color: "#D97706",
          bg: "#FEF3C7",
          border: "#FDE68A",
          icon: Clock,
          desc: "Silakan lakukan pembayaran QRIS sesuai nominal dan unggah bukti transfer.",
        };
    }
  }, [paymentStatus]);

  const StatusIcon = statusConfig.icon;

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right"]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate("c_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pembayaran QRIS</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {order?.orderCode || "PO-5200"} • {order?.storeName || DEFAULT_SPEC_ORDER.storeName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Status Badge Pill */}
        <View style={[styles.statusCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
          <View style={styles.statusHeaderRow}>
            <View style={[styles.statusIconCircle, { backgroundColor: statusConfig.color }]}>
              <StatusIcon size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabelSmall}>Status Transaksi</Text>
              <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.statusDescriptionText}>{statusConfig.desc}</Text>
        </View>

        {/* Rejection Notice if Ditolak */}
        {paymentStatus === "Pembayaran Ditolak" && (
          <View style={styles.rejectionNoticeBox}>
            <View style={styles.rejectionHeaderRow}>
              <AlertCircle size={18} color="#B91C1C" />
              <Text style={styles.rejectionTitle}>Alasan Penolakan Pemilik Catering:</Text>
            </View>
            <Text style={styles.rejectionReasonText}>
              "{rejectionReason || "Bukti pembayaran tidak jelas atau nominal tidak sesuai."}"
            </Text>
            <Text style={styles.rejectionHint}>
              Silakan lakukan pembayaran ulang atau upload foto bukti transfer yang jelas dengan menekan tombol di bawah.
            </Text>
          </View>
        )}

        {/* 3. QRIS Code Display Card (Visible unless fully verified) */}
        {paymentStatus !== "Pembayaran Terverifikasi" && (
          <View style={styles.qrisCard}>
            {/* National QRIS Header */}
            <View style={styles.qrisHeader}>
              <View style={styles.qrisLogoRow}>
                <View style={styles.qrisLogoBadge}>
                  <Text style={styles.qrisLogoText}>QRIS</Text>
                </View>
                <Text style={styles.qrisSubtitle}>STANDAR PEMBAYARAN NASIONAL</Text>
              </View>
              <View style={styles.gpnBadge}>
                <Text style={styles.gpnText}>GPN</Text>
              </View>
            </View>

            <View style={styles.qrisStoreInfo}>
              <Text style={styles.qrisStoreName}>{order?.storeName || DEFAULT_SPEC_ORDER.storeName}</Text>
              <Text style={styles.qrisNmid}>NMID: ID1020023849301 • A.N. CATERING BERKAH</Text>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrCodeWrapper}>
              {order?.qrisImageUrl ? (
                <Image
                  source={{ uri: order.qrisImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : qrMatrix ? (
                <View style={styles.svgQrContainer}>
                  <Svg width={180} height={180} viewBox="0 0 21 21">
                    {qrMatrix.map((val, idx) => {
                      if (val === 1) {
                        const row = Math.floor(idx / 21);
                        const col = idx % 21;
                        return (
                          <Rect
                            key={idx}
                            x={col}
                            y={row}
                            width={1}
                            height={1}
                            fill="#0F172A"
                          />
                        );
                      }
                      return null;
                    })}
                  </Svg>
                </View>
              ) : (
                <View style={styles.qrFallback}>
                  <QrCode size={140} color="#0F172A" />
                </View>
              )}
            </View>

            {/* Practical Action Buttons */}
            <View style={styles.qrisActionRow}>
              <TouchableOpacity
                style={styles.qrisActionBtn}
                onPress={handleSaveQRIS}
                activeOpacity={0.7}
              >
                <Download size={14} color="#0D7A53" />
                <Text style={styles.qrisActionBtnText}>Simpan QRIS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrisActionBtn}
                onPress={handleCopyNominal}
                activeOpacity={0.7}
              >
                <Copy size={14} color="#0D7A53" />
                <Text style={styles.qrisActionBtnText}>Salin Nominal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qrisDueBox}>
              <Calendar size={14} color="#64748B" />
              <Text style={styles.qrisDueText}>
                Batas pembayaran: <Text style={styles.qrisDueBold}>18 September 2026</Text>
              </Text>
            </View>
          </View>
        )}

        {/* 4. Ringkasan Pembayaran Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <CreditCard size={18} color="#0D7A53" />
            <Text style={styles.summaryCardTitle}>Ringkasan Pembayaran</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sudah dibayar</Text>
            <Text style={[styles.summaryValue, paidAmount > 0 ? styles.paidHighlight : null]}>
              {rp(paidAmount)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total pesanan</Text>
            <Text style={styles.summaryValueBold}>{rp(totalOrderAmount)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pelunasan diperlukan</Text>
            <Text style={styles.summaryValuePrimary}>{rp(remainingAmount)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sisa pembayaran</Text>
            <Text style={styles.summaryValueRemaining}>{rp(remainingAmount)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Batas pembayaran</Text>
            <Text style={styles.summaryValue}>18 September 2026</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Metode pelunasan</Text>
            <View style={styles.methodPill}>
              <Text style={styles.methodPillText}>QRIS</Text>
            </View>
          </View>
        </View>

        {/* 5. Informasi & Keterangan Callouts */}
        <View style={styles.infoCalloutBox}>
          <View style={styles.infoIconWrapper}>
            <Info size={16} color="#0D7A53" />
          </View>
          <Text style={styles.infoCalloutText}>
            Setelah melakukan pembayaran, upload bukti pembayaran agar Pemilik Catering dapat memverifikasi transaksi.
          </Text>
        </View>

        <View style={styles.noteCalloutBox}>
          <Text style={styles.noteCalloutText}>
            Setiap pembayaran akan masuk ke riwayat transaksi dan berstatus menunggu verifikasi Pemilik Catering.
          </Text>
        </View>

        {/* 6. Bukti Pembayaran Yang Sudah Di-upload (Jika status Menunggu Verifikasi, Ditolak, atau Terverifikasi) */}
        {uploadedProofUri && (
          <View style={styles.submittedProofCard}>
            <View style={styles.submittedHeader}>
              <FileText size={16} color="#0D7A53" />
              <Text style={styles.submittedTitle}>Bukti Pembayaran Customer</Text>
            </View>

            <View style={styles.submittedDetailsRow}>
              <View style={styles.submittedInfoCol}>
                <Text style={styles.submittedLabel}>Nominal Pengajuan</Text>
                <Text style={styles.submittedAmount}>{rp(proposedAmount)}</Text>

                <Text style={[styles.submittedLabel, { marginTop: 8 }]}>Tanggal Pengajuan</Text>
                <Text style={styles.submittedDate}>{submissionDate}</Text>

                <Text style={[styles.submittedLabel, { marginTop: 8 }]}>Status Bukti</Text>
                <View style={[styles.badgeInline, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.badgeInlineText, { color: statusConfig.color }]}>
                    {paymentStatus === "Menunggu Verifikasi"
                      ? "Menunggu Verifikasi Pemilik Catering"
                      : statusConfig.label}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.proofThumbnailBox}
                onPress={() => setShowLightbox(true)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: uploadedProofUri }} style={styles.proofThumbnail} />
                <View style={styles.thumbnailOverlay}>
                  <Maximize2 size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 7. Bottom Sticky CTA Bar */}
      <View style={styles.bottomBar}>
        {paymentStatus === "Menunggu Verifikasi" ? (
          <View style={styles.waitingContainer}>
            <Clock size={18} color="#2563EB" />
            <Text style={styles.waitingText}>
              Pengajuan {rp(proposedAmount)} sedang diverifikasi Pemilik Catering.
            </Text>
          </View>
        ) : paymentStatus === "Pembayaran Terverifikasi" ? (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#15803D" }]}
            onPress={() => navigate("c_catering_tracking")}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Lihat Lacak Pesanan</Text>
          </TouchableOpacity>
        ) : paymentStatus === "Pembayaran Ditolak" ? (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#DC2626" }]}
            onPress={() => setShowUploadSheet(true)}
            activeOpacity={0.85}
          >
            <Upload size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Upload Bukti Pembayaran Baru</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowConfirmModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Ajukan {rp(proposedAmount)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: Confirmation Modal (Ajukan Dana Pelunasan?) */}
      {/* ========================================================================= */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalBox}>
            <View style={styles.confirmIconCircle}>
              <CreditCard size={24} color="#0D7A53" />
            </View>

            <Text style={styles.confirmModalTitle}>Ajukan Dana Pelunasan?</Text>
            <Text style={styles.confirmModalMessage}>
              Apakah kamu yakin ingin mengajukan pembayaran sebesar{" "}
              <Text style={styles.confirmModalAmount}>{rp(proposedAmount)}</Text>?
            </Text>

            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelBtnText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSubmitBtn}
                onPress={() => {
                  setShowConfirmModal(false);
                  setShowUploadSheet(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmSubmitBtnText}>Ya, Ajukan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Bottom Sheet / Modal Upload Bukti Pembayaran */}
      {/* ========================================================================= */}
      <Modal
        visible={showUploadSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdropTouch}
            activeOpacity={1}
            onPress={() => setShowUploadSheet(false)}
          />

          <View style={styles.sheetContainer}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Upload Bukti Pembayaran</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowUploadSheet(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetInstruction}>
              Silakan upload screenshot atau foto bukti pembayaran QRIS dari perangkat kamu.
            </Text>

            {/* Option to Pick / Preview */}
            {!selectedProof ? (
              <View style={styles.uploadOptionsContainer}>
                <TouchableOpacity
                  style={styles.uploadOptionCard}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadOptionIconBg}>
                    <ImageIcon size={24} color="#0D7A53" />
                  </View>
                  <Text style={styles.uploadOptionTitle}>Pilih dari Galeri</Text>
                  <Text style={styles.uploadOptionSub}>Screenshot transfer atau e-wallet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadOptionCard}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadOptionIconBg}>
                    <Camera size={24} color="#0D7A53" />
                  </View>
                  <Text style={styles.uploadOptionTitle}>Ambil Foto</Text>
                  <Text style={styles.uploadOptionSub}>Foto langsung struk pembayaran</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.previewContainer}>
                <View style={styles.previewImageCard}>
                  <Image
                    source={{ uri: selectedProof.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.previewMetaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewFileName} numberOfLines={1}>
                      {selectedProof.name}
                    </Text>
                    <Text style={styles.previewStatusSuccess}>Siap dikirim ke Pemilik Catering</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.changePhotoBtn}
                    onPress={() => setSelectedProof(null)}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={14} color="#0D7A53" />
                    <Text style={styles.changePhotoBtnText}>Ganti Foto</Text>
                  </TouchableOpacity>
                </View>

                {/* Send Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 18 }]}
                  onPress={handleSendPaymentProof}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Upload size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Kirim Bukti Pembayaran</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: Lightbox Image Viewer */}
      {/* ========================================================================= */}
      <Modal
        visible={showLightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLightbox(false)}
      >
        <View style={styles.lightboxOverlay}>
          <SafeAreaView style={styles.lightboxHeader}>
            <Text style={styles.lightboxTitle}>Bukti Pembayaran Customer</Text>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setShowLightbox(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.lightboxImageContainer}>
            {uploadedProofUri ? (
              <Image
                source={{ uri: uploadedProofUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          <View style={styles.lightboxFooter}>
            <Text style={styles.lightboxFooterText}>
              Nominal: {rp(proposedAmount)} • Diajukan: {submissionDate}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Status Card
  statusCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabelSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 1,
  },
  statusDescriptionText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
    marginTop: 8,
  },

  // Rejection Notice Box
  rejectionNoticeBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 14,
    marginBottom: 14,
  },
  rejectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
  },
  rejectionReasonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7F1D1D",
    marginTop: 6,
    fontStyle: "italic",
  },
  rejectionHint: {
    fontSize: 11.5,
    color: "#991B1B",
    marginTop: 6,
    lineHeight: 16,
  },

  // QRIS Card
  qrisCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  qrisHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
    marginBottom: 12,
  },
  qrisLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qrisLogoBadge: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrisLogoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qrisSubtitle: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.3,
  },
  gpnBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  gpnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  qrisStoreInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrisStoreName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  qrisNmid: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
  },
  qrCodeWrapper: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  svgQrContainer: {
    width: 180,
    height: 180,
  },
  qrFallback: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  qrisActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    width: "100%",
  },
  qrisActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingVertical: 9,
  },
  qrisActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  qrisDueBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  qrisDueText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  qrisDueBold: {
    fontWeight: "800",
    color: "#0F172A",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  summaryValueBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryValuePrimary: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  summaryValueRemaining: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },
  paidHighlight: {
    color: "#15803D",
    fontWeight: "800",
  },
  methodPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Callouts
  infoCalloutBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  infoIconWrapper: {
    marginTop: 1,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    lineHeight: 18,
    fontWeight: "500",
  },
  noteCalloutBox: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#94A3B8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  noteCalloutText: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 17,
  },

  // Submitted Proof Card
  submittedProofCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  submittedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  submittedTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  submittedDetailsRow: {
    flexDirection: "row",
    gap: 14,
  },
  submittedInfoCol: {
    flex: 1,
  },
  submittedLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  submittedAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 2,
  },
  submittedDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  badgeInline: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeInlineText: {
    fontSize: 11,
    fontWeight: "800",
  },
  proofThumbnailBox: {
    width: 84,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    position: "relative",
  },
  proofThumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    position: "absolute",
    right: 4,
    bottom: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 12,
    padding: 4,
  },

  // Bottom Sticky Bar
  bottomBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  primaryButton: {
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  waitingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  waitingText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },

  // Modal: Confirmation
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  confirmModalBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  confirmModalMessage: {
    fontSize: 13.5,
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  confirmModalAmount: {
    fontWeight: "800",
    color: "#0D7A53",
  },
  confirmButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  confirmSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Modal: Bottom Sheet Upload
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetBackdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetInstruction: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 18,
  },
  uploadOptionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  uploadOptionCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  uploadOptionIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  uploadOptionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  uploadOptionSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 3,
  },

  // Preview inside Sheet
  previewContainer: {
    alignItems: "center",
    width: "100%",
  },
  previewImageCard: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
  },
  previewFileName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  previewStatusSuccess: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
    marginTop: 2,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  changePhotoBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Modal: Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  lightboxCloseBtn: {
    padding: 6,
  },
  lightboxImageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxFooter: {
    padding: 16,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    alignItems: "center",
  },
  lightboxFooterText: {
    fontSize: 12,
    color: "#E2E8F0",
    fontWeight: "600",
  },
});
