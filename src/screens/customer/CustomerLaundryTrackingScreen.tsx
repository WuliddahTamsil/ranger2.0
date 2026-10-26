import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
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
  Alert,
  Switch,
  Linking,
  Platform,
} from "react-native";
import { Nav } from "../../types";
import {
  ArrowLeft,
  Bike,
  Check,
  MessageCircle,
  Play,
  RotateCcw,
  Scale,
  CreditCard,
  Shirt,
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Copy,
  AlertCircle,
  X,
  Zap,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { CustomerChatModal } from "./CustomerChatModal";
import { AuthAccount } from "../auth/authTypes";
import { useRecycle } from "../../context/RecycleContext";
import { uploadFileToBackend, createDigitalPayment, checkDigitalPaymentStatus } from "../../services/api";
import {
  getActiveLaundryOrder,
  subscribeLaundry,
  payLaundryOrder,
  updateLaundryOrderStatus,
  weighAndBillLaundryOrder,
  verifyLaundryPayment,
  fetchLaundryStoreById,
  fetchMyLaundryStore,
  LaundryOrder,
  LaundryOrderStatus,
  LaundryStore,
} from "../../services/laundryService";

interface CustomerLaundryTrackingProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerLaundryTrackingScreen: React.FC<CustomerLaundryTrackingProps> = ({ navigate, authAccount }) => {
  const [order, setOrder] = useState<LaundryOrder | null>(getActiveLaundryOrder());
  const [storeInfo, setStoreInfo] = useState<LaundryStore | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWeighingPreviewOpen, setIsWeighingPreviewOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"Midtrans" | "Transfer Bank" | "QRIS">("Midtrans");
  const [proofImageUri, setProofImageUri] = useState<string>("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isMidtransLoading, setIsMidtransLoading] = useState(false);

  const { wallet } = useRecycle();
  const [usePoints, setUsePoints] = useState(false);

  const storeName = order?.storeName || "Ais Laundry";
  const serviceName = order?.serviceName || "Cuci Komplit (Cuci + Setrika)";
  const weight = order?.actualWeightOrQty ? `${order.actualWeightOrQty} ${order.unitType || "kg"}` : "Menunggu Ditimbang";
  const laundryPrice = order?.laundryCost || (order?.actualWeightOrQty ? order.actualWeightOrQty * (order.pricePerUnit || 6000) : 0);
  const deliveryPickup = order?.deliveryFeePickup || 4000;
  const deliveryDrop = order?.deliveryFeeDrop || 4000;
  const serviceFee = order?.serviceFee || 1000;
  const totalBill = order?.totalAmount || (laundryPrice > 0 ? laundryPrice + deliveryPickup + deliveryDrop + serviceFee : 0);

  const userPoints = wallet?.balancePoint || 0;
  // 100 Point = Rp 1
  const pointsNeededToCoverBill = Math.ceil(totalBill * 100);
  const maxPointsUsable = Math.min(userPoints, pointsNeededToCoverBill);
  const pointDiscount = usePoints ? Math.floor(maxPointsUsable * 0.01) : 0;
  const pointsToDebit = usePoints ? maxPointsUsable : 0;
  const finalPayableTotal = Math.max(0, totalBill - pointDiscount);

  const loadData = async () => {
    const currentOrder = getActiveLaundryOrder();
    setOrder(currentOrder);
    if (currentOrder) {
      if (currentOrder.storeId) {
        const s = await fetchLaundryStoreById(String(currentOrder.storeId));
        if (s) setStoreInfo(s);
      } else if (currentOrder.ownerId) {
        const s = await fetchMyLaundryStore(currentOrder.ownerId);
        if (s) setStoreInfo(s);
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeLaundry(() => {
      loadData();
    });
    return unsub;
  }, []);

  const getStepNumber = (status?: LaundryOrderStatus): number => {
    if (!status) return 1;
    switch (status) {
      case "MENUNGGU_KONFIRMASI_MITRA":
      case "MENUNGGU_DRIVER_JEMPUT":
      case "DRIVER_MENUJU_CUSTOMER":
        return 1;
      case "DRIVER_MENUJU_LAUNDRY":
      case "TIBA_DI_LAUNDRY":
        return 2;
      case "MENUNGGU_PEMBAYARAN":
      case "MENUNGGU_VERIFIKASI_PEMBAYARAN":
        return 3;
      case "PEMBAYARAN_LUNAS":
      case "SEDANG_DICUCI":
        return 4;
      case "SIAP_DIANTAR":
      case "DRIVER_MENGANTAR_BALIK":
        return 5;
      case "SELESAI":
        return 6;
      default:
        return 1;
    }
  };

  const currentStep = getStepNumber(order?.status);

  const steps = [
    {
      stepNum: 1,
      title: "Konfirmasi & Penjemputan Driver",
      subtitle: "Mitra menyetujui pesanan dan driver terdekat menuju lokasi Anda",
      activeText:
        order?.status === "MENUNGGU_KONFIRMASI_MITRA"
          ? "Menunggu Konfirmasi Mitra"
          : order?.status === "MENUNGGU_DRIVER_JEMPUT"
          ? "Mencari Driver Penjemput"
          : "Driver Menuju Lokasi Anda",
      activeSub:
        order?.status === "MENUNGGU_KONFIRMASI_MITRA"
          ? "Mitra sedang memeriksa ketersediaan slot..."
          : order?.status === "MENUNGGU_DRIVER_JEMPUT"
          ? "Menghubungkan ke mitra kurir terdekat..."
          : `Driver ${order?.driverPickupName || "Kurir"} sedang menuju ke rumah Anda...`,
      icon: Bike,
    },
    {
      stepNum: 2,
      title: "Pakaian Tiba di Laundry",
      subtitle: "Pakaian telah sampai di toko dan sedang dalam antrean timbang",
      activeText: order?.status === "DRIVER_MENUJU_LAUNDRY" ? "Driver Menuju Toko" : "Pakaian Tiba di Outlet",
      activeSub: order?.status === "DRIVER_MENUJU_LAUNDRY" ? "Driver membawa pakaian kotor Anda ke outlet laundry..." : "Pemilik laundry sedang menyiapkan proses penimbangan...",
      icon: Scale,
    },
    {
      stepNum: 3,
      title: "Penimbangan & Pembayaran",
      subtitle: "Tagihan diterbitkan berdasarkan berat riil, bayar via TF/QRIS toko & upload bukti",
      activeText: order?.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" ? "Menunggu Verifikasi Pembayaran" : "Menunggu Pembayaran Anda",
      activeSub: order?.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" ? "Pemilik toko sedang mengecek bukti transfer Anda..." : "Silakan bayar non-tunai & unggah bukti transfer di bawah...",
      icon: CreditCard,
    },
    {
      stepNum: 4,
      title: "Proses Pencucian & Setrika",
      subtitle: "Pakaian sedang dicuci bersih, wangi tahan lama, dan disetrika rapi",
      activeText: "Sedang Dicuci & Disetrika",
      activeSub: "Mitra memproses cucian Anda dengan pewangi higienis...",
      icon: Shirt,
    },
    {
      stepNum: 5,
      title: "Pengantaran Balik",
      subtitle: "Driver mengantarkan pakaian bersih kembali ke alamat Anda",
      activeText: order?.status === "SIAP_DIANTAR" ? "Mencari Driver Pengantar" : "Driver Mengantar Baju Bersih",
      activeSub: order?.status === "SIAP_DIANTAR" ? "Pakaian bersih siap diantar oleh kurir..." : `Driver ${order?.driverDeliveryName || "Kurir"} sedang menuju ke rumah Anda...`,
      icon: Bike,
    },
    {
      stepNum: 6,
      title: "Pesanan Selesai",
      subtitle: "Pakaian bersih telah diterima dengan baik",
      activeText: "Pesanan Selesai",
      activeSub: "Terima kasih telah menggunakan layanan Laundry GEOVERSE!",
      icon: CheckCircle2,
    },
  ];

  const pickProofWithSource = async (source: "camera" | "gallery") => {
    try {
      if (Platform.OS !== "web") {
        const permission =
          source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(
            "Izin Diperlukan",
            source === "camera"
              ? "Mohon berikan izin akses kamera untuk memfoto bukti pembayaran."
              : "Mohon berikan izin akses galeri foto untuk memilih bukti pembayaran."
          );
          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.85,
              base64: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.85,
              base64: true,
            });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
          : asset.uri;
        setProofImageUri(dataUri);

        // Upload to server in background to get permanent host URL
        try {
          const fileName = asset.fileName || `proof-${Date.now()}.jpg`;
          const mimeType = asset.mimeType || "image/jpeg";
          const uploadRes = await uploadFileToBackend(asset.uri, fileName, mimeType, asset.base64 || undefined);
          const finalUrl = uploadRes?.data?.url || uploadRes?.url;
          if (finalUrl) {
            setProofImageUri(finalUrl);
          }
        } catch (uploadErr) {
          console.log("Upload to server fallback to base64 data uri:", uploadErr);
        }
      }
    } catch (err) {
      console.warn("Picker error:", err);
      setProofImageUri("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80");
    }
  };

  const handlePickProofImage = () => {
    if (Platform.OS === "web") {
      void pickProofWithSource("gallery");
      return;
    }
    Alert.alert(
      "Unggah Bukti Pembayaran",
      "Pilih sumber foto bukti pembayaran cucian Anda:",
      [
        { text: "Buka Kamera", onPress: () => void pickProofWithSource("camera") },
        { text: "Pilih dari Galeri", onPress: () => void pickProofWithSource("gallery") },
        { text: "Batal", style: "cancel" },
      ]
    );
  };

  const handlePayWithMidtrans = async () => {
    if (!order) return;
    setIsMidtransLoading(true);
    try {
      const orderId = order._id || order.id || "temp";
      const payload = {
        orderId: String(orderId),
        orderCode: order.orderCode,
        orderType: "LAUNDRY",
        orderCategory: "LAUNDRY",
        amount: finalPayableTotal,
        paymentMethod: "SNAP",
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerId: order.customerId,
      };

      const res = await createDigitalPayment(payload);
      if (res.success && res.data) {
        const redirectUrl = res.data.snapRedirectUrl || res.data.paymentUrl;
        if (redirectUrl) {
          Linking.openURL(redirectUrl).catch(() => {
            Alert.alert("Link Pembayaran", `Buka link berikut di browser:\n${redirectUrl}`);
          });
          Alert.alert(
            "Pembayaran Midtrans Terbuka",
            "Halaman pembayaran Midtrans Snap telah dibuka di browser. Silakan selesaikan pembayaran Anda (BCA VA / ShopeePay / GoPay / QRIS).",
            [
              {
                text: "Sudah Bayar / Cek Status",
                onPress: async () => {
                  if (res.data.paymentId) {
                    const statusRes = await checkDigitalPaymentStatus(res.data.paymentId);
                    if (statusRes.success && (statusRes.data?.status === "PAID" || statusRes.data?.status === "SETTLEMENT")) {
                      setIsPaymentModalOpen(false);
                      Alert.alert("Pembayaran Berhasil!", "Pembayaran laundry Anda telah lunas!");
                      loadData();
                    } else {
                      Alert.alert("Belum Terdeteksi", "Pembayaran belum terkonfirmasi lunas. Silakan selesaikan transaksi atau coba beberapa saat lagi.");
                    }
                  }
                },
              },
              { text: "Tutup", style: "cancel" },
            ]
          );
        } else {
          Alert.alert("Info Pembayaran", "Sesi pembayaran telah dibuat.");
        }
      } else {
        Alert.alert("Gagal Membuat Pembayaran", res.message || "Gagal menghubungi gateway Midtrans.");
      }
    } catch (err: any) {
      console.error("handlePayWithMidtrans error:", err);
      Alert.alert("Error", err.message || "Terjadi kesalahan pembayaran digital.");
    } finally {
      setIsMidtransLoading(false);
    }
  };

  const handleSendPaymentProof = async () => {
    if (!order) return;
    if (finalPayableTotal > 0 && !proofImageUri) {
      Alert.alert("Bukti Transfer Wajib", "Harap unggah foto bukti transfer atau resi pembayaran QRIS untuk sisa tagihan.");
      return;
    }

    setIsSubmittingProof(true);
    try {
      let finalUrl = proofImageUri;
      // If uri is still blob:, attempt upload to avoid cross-browser ERR_FILE_NOT_FOUND
      if (finalUrl && finalUrl.startsWith("blob:")) {
        try {
          const uploadRes = await uploadFileToBackend(finalUrl, `proof-${Date.now()}.jpg`, "image/jpeg");
          if (uploadRes && uploadRes.success && uploadRes.data && uploadRes.data.url) {
            finalUrl = uploadRes.data.url;
          }
        } catch (e) {
          console.warn("Failed blob upload in pay:", e);
        }
      }

      const orderId = order._id || order.id || "temp";
      const resolvedMethod = finalPayableTotal === 0 ? "GEOVERSE_POINT" : selectedPaymentMethod;
      await payLaundryOrder(orderId, resolvedMethod, finalUrl, pointsToDebit);
      setIsPaymentModalOpen(false);
      Alert.alert(
        finalPayableTotal === 0 ? "Lunas dengan Point" : "Bukti Terkirim",
        finalPayableTotal === 0
          ? "Tagihan laundry berhasil dilunasi 100% menggunakan GEOVERSE Point! Cucian segera diproses."
          : "Bukti pembayaran berhasil diunggah dan masuk ke Pemilik Laundry untuk diverifikasi."
      );
    } catch (err) {
      console.error("Payment error:", err);
      Alert.alert("Gagal Kirim Bukti", "Terjadi kesalahan saat mengunggah bukti pembayaran.");
    } finally {
      setIsSubmittingProof(false);
    }
  };


  const isVerifying = order?.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" || order?.paymentStatus === "menunggu_verifikasi";
  const isPaid = order?.paymentStatus === "lunas";
  const isRejected = order?.paymentStatus === "ditolak";

  const effectiveBankName = storeInfo?.bankName || order?.bankName || "Transfer Bank / E-Wallet";
  const effectiveAccountNum = storeInfo?.bankAccountNumber || order?.bankAccountNumber || "";
  const effectiveAccountHolder = storeInfo?.bankAccountHolder || order?.bankAccountHolder || (storeName ? `Mitra ${storeName}` : "Pemilik Toko");
  const effectiveQrisImage = storeInfo?.qrisImageUrl || order?.qrisImageUrl || "";

  if (!order) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigate("c_home")}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Live Tracking Laundry</Text>
            <Text style={styles.headerSubtitle}>Status pesanan cucian Anda</Text>
          </View>
        </View>

        <View style={styles.emptyTrackingContainer}>
          <View style={styles.emptyTrackingIconCircle}>
            <Shirt size={48} color="#0D7A53" />
          </View>
          <Text style={styles.emptyTrackingTitle}>Belum Ada Pesanan Laundry Aktif</Text>
          <Text style={styles.emptyTrackingDesc}>
            Semua riwayat pesanan sebelumnya telah dibersihkan. Silakan buat pesanan baru dari mitra toko laundry untuk mulai uji coba alur secara real-time!
          </Text>

          <TouchableOpacity
            style={styles.btnOrderNewLaundry}
            onPress={() => navigate("c_laundry")}
            activeOpacity={0.85}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.btnOrderNewLaundryText}>Pesan Laundry Sekarang</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnBackHomeSecondary}
            onPress={() => navigate("c_home")}
            activeOpacity={0.8}
          >
            <Text style={styles.btnBackHomeSecondaryText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_laundry")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Live Tracking Laundry</Text>
          <Text style={styles.headerSubtitle}>No. Pesanan: {order?.orderCode || "LND-2026"}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerChatBtn}
          onPress={() => setChatVisible(true)}
          activeOpacity={0.8}
        >
          <MessageCircle size={18} color="#0D7A53" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Merchant & Order Header Card */}
        <View style={styles.trackingCard}>
          <View style={styles.merchantHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.merchantTitle}>{storeName}</Text>
              <Text style={styles.serviceSubtitle}>{serviceName}</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                isPaid
                  ? { backgroundColor: "#DCFCE7" }
                  : isVerifying
                  ? { backgroundColor: "#FEF3C7" }
                  : isRejected
                  ? { backgroundColor: "#FEE2E2" }
                  : { backgroundColor: "#FFF7ED" },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  isPaid
                    ? { color: "#166534" }
                    : isVerifying
                    ? { color: "#D97706" }
                    : isRejected
                    ? { color: "#DC2626" }
                    : { color: "#EA580C" },
                ]}
              >
                {isPaid ? "✓ Lunas" : isVerifying ? "⏳ Verifikasi" : isRejected ? "❌ Bukti Ditolak" : "Perlu Bayar"}
              </Text>
            </View>
          </View>

          {/* Stepper Timeline */}
          <View style={styles.timelineContainer}>
            {steps.map((item, index) => {
              const isActive = item.stepNum === currentStep;
              const isCompleted = item.stepNum < currentStep || currentStep === 6;
              const isLast = index === steps.length - 1;
              const StepIcon = item.icon;

              return (
                <View key={item.stepNum} style={styles.timelineRow}>
                  <View style={styles.timelineIndicatorCol}>
                    <View
                      style={[
                        styles.circleIndicator,
                        isCompleted && styles.circleCompleted,
                        isActive && styles.circleActive,
                      ]}
                    >
                      {isCompleted ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : isActive ? (
                        <StepIcon size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.circleNumText}>{item.stepNum}</Text>
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.stepContentCol}>
                    <Text
                      style={[
                        styles.stepTitle,
                        (isActive || isCompleted) && styles.stepTitleHighlighted,
                      ]}
                    >
                      {item.title}
                    </Text>

                    {isActive ? (
                      <View style={styles.activeBanner}>
                        <View style={styles.activePill}>
                          <Sparkles size={11} color="#FFFFFF" />
                          <Text style={styles.activePillText}>{item.activeText}</Text>
                        </View>
                        <Text style={styles.activeSubText}>{item.activeSub}</Text>
                      </View>
                    ) : (
                      <Text style={styles.stepSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Section: Tagihan & Pembayaran */}
        {order?.actualWeightOrQty || currentStep >= 3 ? (
          <View style={styles.billCard}>
            <View style={styles.billHeaderRow}>
              <View style={styles.scaleIconBg}>
                <Scale size={20} color="#0D7A53" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.billTitle}>Hasil Penimbangan & Tagihan</Text>
                <Text style={styles.billSubtitle}>Ditimbang oleh mitra {storeName}</Text>
              </View>
            </View>

            <View style={styles.billDivider} />

            {/* Foto Bukti Timbangan dari Mitra (Jika Tersedia) */}
            {order?.weighingProofImage ? (
              <View style={{ marginBottom: 12, backgroundColor: "#F0FDF4", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#BBF7D0" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Scale size={15} color="#15803D" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803D" }}>Foto Bukti Timbangan dari Mitra</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsWeighingPreviewOpen(true)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803D" }}>🔍 Perbesar</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setIsWeighingPreviewOpen(true)} activeOpacity={0.85}>
                  <Image source={{ uri: order.weighingProofImage }} style={{ width: "100%", height: 140, borderRadius: 8 }} resizeMode="cover" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Berat Cucian</Text>
              <Text style={styles.billValueHighlight}>{weight}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Biaya Cuci ({weight} × Rp {order?.pricePerUnit?.toLocaleString("id-ID") || "6.000"})</Text>
              <Text style={styles.billValue}>Rp {laundryPrice.toLocaleString("id-ID")}</Text>
            </View>

            {/* Rincian Transparan Ongkir Perjalanan Ganda (2x Trip Motor) */}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>• Ongkir Jemput Baju Kotor (Trip 1 - Motor)</Text>
              <Text style={styles.billValue}>Rp {deliveryPickup.toLocaleString("id-ID")}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>• Ongkir Antar Baju Bersih (Trip 2 - Motor)</Text>
              <Text style={styles.billValue}>Rp {deliveryDrop.toLocaleString("id-ID")}</Text>
            </View>

            {order?.actualWeightOrQty && order.actualWeightOrQty > 20 ? (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: "#C2410C", fontWeight: "600" }]}>
                  • Biaya Kelebihan Beban Motor (&gt;20 kg)
                </Text>
                <Text style={[styles.billValue, { color: "#C2410C", fontWeight: "700" }]}>
                  Rp {(((order.actualWeightOrQty - 20) * 3000)).toLocaleString("id-ID")}
                </Text>
              </View>
            ) : null}

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Biaya Layanan Platform</Text>
              <Text style={styles.billValue}>Rp {serviceFee.toLocaleString("id-ID")}</Text>
            </View>

            {order?.pointDiscount && order.pointDiscount > 0 ? (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: "#166534", fontWeight: "600" }]}>
                  Diskon GEOVERSE Point ({order.pointsUsed || order.pointDiscount} pts)
                </Text>
                <Text style={[styles.billValue, { color: "#166534", fontWeight: "700" }]}>
                  - Rp {order.pointDiscount.toLocaleString("id-ID")}
                </Text>
              </View>
            ) : null}

            <View style={styles.billDivider} />

            <View style={styles.billTotalRow}>
              <Text style={styles.billTotalLabel}>Total Tagihan</Text>
              <Text style={styles.billTotalValue}>Rp {totalBill.toLocaleString("id-ID")}</Text>
            </View>

            {/* Status Feedback Banners */}
            {isPaid ? (
              <View style={styles.paidSuccessBanner}>
                <CheckCircle2 size={20} color="#166534" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paidSuccessTitle}>Pembayaran Telah Diverifikasi Lunas</Text>
                  <Text style={styles.paidSuccessSub}>
                    Mitra telah mencocokkan bukti {order?.paymentMethod || "Transfer"}. Pakaian Anda sedang diproses cuci higienis.
                  </Text>
                </View>
              </View>
            ) : isVerifying ? (
              <View style={styles.verifyingBanner}>
                <Clock size={20} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifyingTitle}>Bukti Pembayaran Sedang Dicek</Text>
                  <Text style={styles.verifyingSub}>
                    Bukti transfer Anda telah diterima pemilik laundry. Cucian akan langsung diproses dan diantar setelah diverifikasi.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.unpaidActionSection}>
                {isRejected && (
                  <View style={styles.rejectNotice}>
                    <AlertCircle size={16} color="#DC2626" />
                    <Text style={styles.rejectNoticeText}>
                      Bukti Ditolak: {order?.paymentRejectionReason || "Nominal atau bukti transfer belum sesuai."}
                    </Text>
                  </View>
                )}

                <View style={styles.warningNotice}>
                  <ShieldCheck size={16} color="#EA580C" />
                  <Text style={styles.warningNoticeText}>
                    Pembayaran hanya melalui **Transfer Bank** atau **QRIS**. Wajib unggah bukti transfer.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.btnPayNow}
                  onPress={() => setIsPaymentModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Upload size={18} color="#FFFFFF" />
                  <Text style={styles.btnPayNowText}>
                    {isRejected ? "Upload Ulang Bukti Pembayaran" : `Bayar & Upload Bukti (Rp ${totalBill.toLocaleString("id-ID")})`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.waitingWeightBanner}>
            <Clock size={20} color="#0D7A53" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.waitingWeightTitle}>Menunggu Pakaian Tiba di Laundry</Text>
              <Text style={styles.waitingWeightSub}>
                Driver sedang membawa pakaian ke toko. Pemilik laundry akan menimbang dan menerbitkan tagihan di sini.
              </Text>
            </View>
          </View>
        )}



        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full Preview Modal Foto Bukti Timbangan */}
      <Modal
        visible={isWeighingPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsWeighingPreviewOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 40, right: 20, zIndex: 10, padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 }}
            onPress={() => setIsWeighingPreviewOpen(false)}
            activeOpacity={0.8}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {order?.weighingProofImage ? (
            <Image
              source={{ uri: order.weighingProofImage }}
              style={{ width: "100%", height: "70%", borderRadius: 12 }}
              resizeMode="contain"
            />
          ) : null}
          <Text style={{ color: "#FFFFFF", marginTop: 12, fontSize: 13, fontWeight: "700" }}>
            Foto Bukti Timbangan Resmi dari Mitra
          </Text>
        </View>
      </Modal>

      {/* Payment & Upload Proof Modal */}
      <Modal visible={isPaymentModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalCard}>
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.modalTitle}>Pembayaran Tagihan Laundry</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Pilih metode (QRIS / Transfer Bank) dan unggah bukti transfer.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Total Amount Box */}
              <View style={styles.modalTotalBox}>
                <Text style={styles.modalTotalLabel}>Total Tagihan Riil</Text>
                <Text style={styles.modalTotalValue}>Rp {totalBill.toLocaleString("id-ID")}</Text>
                <Text style={styles.modalWeightDetail}>Berat: {weight} • {serviceName}</Text>
              </View>

              {/* GEOVERSE Point Card */}
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: 14,
                  padding: 14,
                  marginVertical: 12,
                  borderWidth: 1.5,
                  borderColor: usePoints ? "#0D7A53" : "#BBF7D0",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Sparkles size={20} color="#0D7A53" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>Tukar GEOVERSE Point</Text>
                      <Text style={{ fontSize: 11, color: "#4B5563" }}>
                        Saldo: <Text style={{ fontWeight: "700", color: "#0D7A53" }}>{userPoints.toLocaleString("id-ID")} pts</Text> (100 pt = Rp 1)
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={usePoints}
                    onValueChange={(val) => {
                      if (val && userPoints <= 0) {
                        Alert.alert("Poin Tidak Mencukupi", "Anda belum memiliki GEOVERSE Point. Dapatkan poin dari setor Kanyaah Sampah!");
                        return;
                      }
                      setUsePoints(val);
                    }}
                    thumbColor={usePoints ? "#0D7A53" : "#F3F4F6"}
                    trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
                  />
                </View>
                {usePoints && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#DCFCE7", flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#166534", fontWeight: "600" }}>Potongan Poin</Text>
                    <Text style={{ fontSize: 12, color: "#166534", fontWeight: "700" }}>- Rp {pointDiscount.toLocaleString("id-ID")}</Text>
                  </View>
                )}
              </View>

              {usePoints && (
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Sisa Pembayaran Tunai/Transfer</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#0D7A53" }}>
                    Rp {finalPayableTotal.toLocaleString("id-ID")}
                  </Text>
                </View>
              )}

              {finalPayableTotal === 0 ? (
                <View
                  style={{
                    backgroundColor: "#DCFCE7",
                    borderRadius: 14,
                    padding: 16,
                    alignItems: "center",
                    marginVertical: 12,
                    borderWidth: 1,
                    borderColor: "#86EFAC",
                  }}
                >
                  <CheckCircle2 size={36} color="#166534" />
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#166534", marginTop: 8 }}>
                    Lunas 100% dengan GEOVERSE Point!
                  </Text>
                  <Text style={{ fontSize: 12, color: "#15803D", textAlign: "center", marginTop: 4 }}>
                    Seluruh tagihan cucian sebesar Rp {totalBill.toLocaleString("id-ID")} berhasil tercover oleh poin Anda ({pointsToDebit.toLocaleString("id-ID")} pts). Anda tidak perlu melakukan transfer bank atau upload bukti bayar.
                  </Text>
                </View>
              ) : (
                <>
                  {/* 3 Payment Methods: Midtrans Snap, QRIS & Transfer Bank */}
                  <Text style={styles.sectionMethodTitle}>Pilih Metode Pembayaran</Text>
                  <View style={styles.methodList}>
                    {/* Opsi 1: Midtrans Snap Gateway (RECOMMENDED) */}
                    <TouchableOpacity
                      style={[styles.methodItem, selectedPaymentMethod === "Midtrans" && styles.methodItemSelected]}
                      onPress={() => setSelectedPaymentMethod("Midtrans")}
                      activeOpacity={0.85}
                    >
                      <View style={styles.methodLeft}>
                        <View style={[styles.methodIconBg, selectedPaymentMethod === "Midtrans" && { backgroundColor: "#DCFCE7" }]}>
                          <Zap size={20} color="#0D7A53" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.methodName}>Midtrans Snap Gateway</Text>
                            <View style={{ backgroundColor: "#0D7A53", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: "800", color: "#FFFFFF" }}>OTOMATIS</Text>
                            </View>
                          </View>
                          <Text style={styles.methodSub}>BCA VA, Mandiri, BRI, ShopeePay, GoPay, QRIS</Text>
                        </View>
                      </View>
                      <View style={[styles.radioCircle, selectedPaymentMethod === "Midtrans" && styles.radioCircleSelected]}>
                        {selectedPaymentMethod === "Midtrans" && <View style={styles.radioInnerDot} />}
                      </View>
                    </TouchableOpacity>

                    {/* Opsi 2: QRIS Toko Manual */}
                    <TouchableOpacity
                      style={[styles.methodItem, selectedPaymentMethod === "QRIS" && styles.methodItemSelected]}
                      onPress={() => setSelectedPaymentMethod("QRIS")}
                      activeOpacity={0.85}
                    >
                      <View style={styles.methodLeft}>
                        <View style={[styles.methodIconBg, selectedPaymentMethod === "QRIS" && { backgroundColor: "#DCFCE7" }]}>
                          <QrCode size={20} color="#0D7A53" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.methodName}>QRIS Toko (Manual)</Text>
                          <Text style={styles.methodSub}>Scan QRIS Toko lalu unggah bukti transfer</Text>
                        </View>
                      </View>
                      <View style={[styles.radioCircle, selectedPaymentMethod === "QRIS" && styles.radioCircleSelected]}>
                        {selectedPaymentMethod === "QRIS" && <View style={styles.radioInnerDot} />}
                      </View>
                    </TouchableOpacity>

                    {/* Opsi 3: Transfer Bank Manual */}
                    <TouchableOpacity
                      style={[styles.methodItem, selectedPaymentMethod === "Transfer Bank" && styles.methodItemSelected]}
                      onPress={() => setSelectedPaymentMethod("Transfer Bank")}
                      activeOpacity={0.85}
                    >
                      <View style={styles.methodLeft}>
                        <View style={[styles.methodIconBg, selectedPaymentMethod === "Transfer Bank" && { backgroundColor: "#DCFCE7" }]}>
                          <CreditCard size={20} color="#0D7A53" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.methodName}>Transfer Bank Manual</Text>
                          <Text style={styles.methodSub}>BCA, Mandiri, BNI, BRI (Wajib upload struk)</Text>
                        </View>
                      </View>
                      <View style={[styles.radioCircle, selectedPaymentMethod === "Transfer Bank" && styles.radioCircleSelected]}>
                        {selectedPaymentMethod === "Transfer Bank" && <View style={styles.radioInnerDot} />}
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Payment Details Container */}
                  {selectedPaymentMethod === "Midtrans" ? (
                    <View style={{ backgroundColor: "#F0FDF4", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#BBF7D0", marginVertical: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <ShieldCheck size={20} color="#0D7A53" />
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#166534" }}>Verifikasi Instan Tanpa Upload Resi</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: "#15803D", lineHeight: 16 }}>
                        Pilih metode favorit Anda di Midtrans (BCA Virtual Account, ShopeePay, GoPay, QRIS, dll). Setelah pembayaran selesai di m-banking, pesanan langsung otomatis tercatat lunas dan mitra laundry segera mencuci pakaian Anda.
                      </Text>
                    </View>
                  ) : selectedPaymentMethod === "QRIS" ? (
                    <View style={styles.qrisContainer}>
                      <Text style={styles.qrisTitle}>Scan Barcode QRIS Toko {storeName}</Text>
                      {effectiveQrisImage ? (
                        <Image
                          source={{ uri: effectiveQrisImage }}
                          style={styles.qrisImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.qrisPlaceholderCustomer}>
                          <QrCode size={56} color="#9CA3AF" />
                          <Text style={styles.qrisPlaceholderCustomerTitle}>QRIS Belum Diunggah Pemilik Toko</Text>
                          <Text style={styles.qrisPlaceholderCustomerSub}>
                            Silakan gunakan opsi Transfer Bank Manual atau Midtrans di atas untuk menyelesaikan pembayaran.
                          </Text>
                          <TouchableOpacity
                            style={styles.btnSwitchToBank}
                            onPress={() => setSelectedPaymentMethod("Midtrans")}
                            activeOpacity={0.8}
                          >
                            <Zap size={14} color="#FFFFFF" />
                            <Text style={styles.btnSwitchToBankText}>Pilih Pembayaran Midtrans</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={styles.qrisStoreName}>{storeName}</Text>
                      <Text style={styles.qrisNote}>
                        Simpan / screenshot QRIS di atas untuk membayar melalui BCA Mobile, Livin, BRImo, GoPay, OVO, Dana, ShopeePay.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.bankContainer}>
                      <Text style={styles.bankTitle}>Nomor Rekening / Akun Tujuan Toko:</Text>
                      <View style={styles.bankCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bankName}>{effectiveBankName}</Text>
                          <Text style={styles.bankAccountNum}>
                            {effectiveAccountNum || "Belum diatur oleh pemilik toko"}
                          </Text>
                          <Text style={styles.bankHolder}>a.n. {effectiveAccountHolder}</Text>
                        </View>
                        {effectiveAccountNum ? (
                          <TouchableOpacity
                            style={styles.btnCopy}
                            onPress={() => Alert.alert("Tersalin", `Nomor ${effectiveBankName} (${effectiveAccountNum}) berhasil disalin.`)}
                          >
                            <Copy size={16} color="#0D7A53" />
                            <Text style={styles.btnCopyText}>Salin</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* Upload Proof Section (Only for Manual QRIS & Bank Transfer) */}
                  {selectedPaymentMethod !== "Midtrans" && (
                    <View style={styles.uploadSection}>
                      <Text style={styles.uploadTitle}>
                        Upload Bukti Transfer / Resi <Text style={{ color: "#EF4444" }}>*</Text>
                      </Text>
                      <Text style={styles.uploadSub}>Wajib lampirkan screenshot struk transfer untuk diverifikasi pemilik laundry.</Text>

                      {proofImageUri ? (
                        <View style={styles.proofPreviewCard}>
                          <Image source={{ uri: proofImageUri }} style={styles.proofPreviewImg} />
                          <View style={styles.proofPreviewInfo}>
                            <Text style={styles.proofSuccessText}>✓ Foto Bukti Terpasang</Text>
                            <TouchableOpacity style={styles.btnChangeProof} onPress={handlePickProofImage}>
                              <Text style={styles.btnChangeProofText}>Ganti Foto</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.uploadPlaceholderBtn} onPress={handlePickProofImage} activeOpacity={0.8}>
                          <View style={styles.uploadIconCircle}>
                            <Upload size={22} color="#0D7A53" />
                          </View>
                          <Text style={styles.uploadPlaceholderTitle}>Pilih Foto Bukti Transfer</Text>
                          <Text style={styles.uploadPlaceholderSub}>Format JPG, PNG (Maks 10MB)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {selectedPaymentMethod === "Midtrans" && finalPayableTotal > 0 ? (
              <TouchableOpacity
                style={[styles.btnSubmitPayment, isMidtransLoading && { opacity: 0.7 }]}
                onPress={handlePayWithMidtrans}
                disabled={isMidtransLoading}
                activeOpacity={0.85}
              >
                {isMidtransLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Zap size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnSubmitPaymentText}>
                      Buka Pembayaran Midtrans (Rp {finalPayableTotal.toLocaleString("id-ID")})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnSubmitPayment, isSubmittingProof && { opacity: 0.7 }]}
                onPress={handleSendPaymentProof}
                disabled={isSubmittingProof}
                activeOpacity={0.85}
              >
                {isSubmittingProof ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.btnSubmitPaymentText}>
                      {finalPayableTotal === 0
                        ? `Konfirmasi Pelunasan Poin (${pointsToDebit.toLocaleString("id-ID")} pts)`
                        : "Kirim Bukti Pembayaran ke Toko"}
                    </Text>
                    <CheckCircle2 size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <CustomerChatModal
        visible={chatVisible && Boolean(order?.orderCode)}
        onClose={() => setChatVisible(false)}
        orderId={order?.orderCode || ""}
        participantName={storeName}
        participantType="merchant"
        initialMessage="Halo Kak, ada yang bisa kami bantu terkait pesanan laundry Anda?"
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  headerChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 20, gap: 16 },
  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  merchantHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 14,
    marginBottom: 16,
  },
  merchantTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  serviceSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  timelineContainer: { paddingVertical: 4 },
  timelineRow: { flexDirection: "row", minHeight: 68 },
  timelineIndicatorCol: { alignItems: "center", width: 32, marginRight: 12 },
  circleIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: { backgroundColor: "#0D7A53" },
  circleCompleted: { backgroundColor: "#0D7A53" },
  circleNumText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
  timelineLineCompleted: { backgroundColor: "#0D7A53" },
  stepContentCol: { flex: 1, paddingBottom: 14 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: "#9CA3AF" },
  stepTitleHighlighted: { color: "#111827", fontWeight: "800" },
  stepSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 16 },
  activeBanner: {
    backgroundColor: "#E8F5EE",
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7A53",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 4,
  },
  activePillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  activeSubText: { fontSize: 12, color: "#166534", lineHeight: 16 },
  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#C6E7D6",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  billHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scaleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  billTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  billSubtitle: { fontSize: 12, color: "#6B7280" },
  billDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  billLabel: { fontSize: 12, color: "#4B5563", flex: 1 },
  billValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
  billValueHighlight: { fontSize: 14, color: "#0D7A53", fontWeight: "900" },
  billTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  billTotalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  billTotalValue: { fontSize: 18, fontWeight: "900", color: "#0D7A53" },
  paidSuccessBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 10,
  },
  paidSuccessTitle: { fontSize: 13, fontWeight: "800", color: "#166534" },
  paidSuccessSub: { fontSize: 11, color: "#166534", marginTop: 2, lineHeight: 15 },
  verifyingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  verifyingTitle: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  verifyingSub: { fontSize: 11, color: "#92400E", marginTop: 2, lineHeight: 15 },
  unpaidActionSection: { marginTop: 14 },
  rejectNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
  },
  rejectNoticeText: { fontSize: 11, color: "#991B1B", fontWeight: "700", flex: 1 },
  warningNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    gap: 6,
    marginBottom: 12,
  },
  warningNoticeText: { fontSize: 11, color: "#C2410C", fontWeight: "600", flex: 1 },
  btnPayNow: {
    backgroundColor: "#0D7A53",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPayNowText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  waitingWeightBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  waitingWeightTitle: { fontSize: 13, fontWeight: "800", color: "#0D7A53" },
  waitingWeightSub: { fontSize: 11, color: "#166534", marginTop: 2, lineHeight: 15 },
  simCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  simTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  simSub: { fontSize: 11, color: "#6B7280", marginTop: 2, marginBottom: 10 },
  simButtonsRow: { flexDirection: "row", gap: 10 },
  btnSimNext: {
    flex: 1,
    backgroundColor: "#0D7A53",
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnSimNextText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  btnSimReset: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnSimResetText: { color: "#374151", fontSize: 12, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  paymentModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 480,
  },
  dragHandle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  modalSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 12 },
  modalTotalBox: {
    backgroundColor: "#E8F5EE",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  modalTotalLabel: { fontSize: 12, color: "#166534", fontWeight: "600" },
  modalTotalValue: { fontSize: 22, fontWeight: "900", color: "#0D7A53", marginVertical: 2 },
  modalWeightDetail: { fontSize: 11, color: "#166534", fontWeight: "700" },
  sectionMethodTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 8 },
  methodList: { gap: 8, marginBottom: 14 },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  methodItemSelected: { borderColor: "#0D7A53", backgroundColor: "#F0FDF4" },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  methodIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  methodName: { fontSize: 13, fontWeight: "800", color: "#111827" },
  methodSub: { fontSize: 10, color: "#6B7280", marginTop: 1 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: { borderColor: "#0D7A53" },
  radioInnerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0D7A53" },
  qrisContainer: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  qrisTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 8 },
  qrisImage: { width: 150, height: 150, borderRadius: 8, backgroundColor: "#FFFFFF" },
  qrisStoreName: { fontSize: 11, fontWeight: "700", color: "#374151", marginTop: 8 },
  qrisNote: { fontSize: 10, color: "#6B7280", textAlign: "center", marginTop: 4, maxWidth: 260 },
  bankContainer: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  bankTitle: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 },
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bankName: { fontSize: 12, fontWeight: "700", color: "#1E40AF" },
  bankAccountNum: { fontSize: 16, fontWeight: "900", color: "#111827", marginVertical: 2 },
  bankHolder: { fontSize: 11, color: "#6B7280" },
  btnCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnCopyText: { fontSize: 11, fontWeight: "700", color: "#0D7A53" },
  uploadSection: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  uploadTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  uploadSub: { fontSize: 11, color: "#6B7280", marginTop: 2, marginBottom: 10 },
  uploadPlaceholderBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#C6E7D6",
    borderStyle: "dashed",
    backgroundColor: "#F0FDF4",
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  uploadPlaceholderTitle: { fontSize: 13, fontWeight: "800", color: "#0D7A53" },
  uploadPlaceholderSub: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  proofPreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    overflow: "hidden",
    backgroundColor: "#F0FDF4",
  },
  proofPreviewImg: { width: "100%", height: 160, resizeMode: "cover" },
  proofPreviewInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  proofSuccessText: { fontSize: 12, fontWeight: "800", color: "#166534" },
  btnChangeProof: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  btnChangeProofText: { fontSize: 11, fontWeight: "700", color: "#0D7A53" },
  btnSubmitPayment: {
    backgroundColor: "#0D7A53",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnSubmitPaymentText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  // Empty State Tracking
  emptyTrackingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTrackingIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTrackingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyTrackingDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  btnOrderNewLaundry: {
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    marginBottom: 12,
  },
  btnOrderNewLaundryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnBackHomeSecondary: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackHomeSecondaryText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },

  // QRIS Customer Fallback
  qrisPlaceholderCustomer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginVertical: 10,
  },
  qrisPlaceholderCustomerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    marginTop: 10,
    marginBottom: 4,
  },
  qrisPlaceholderCustomerSub: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 16,
  },
  btnSwitchToBank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnSwitchToBankText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});


