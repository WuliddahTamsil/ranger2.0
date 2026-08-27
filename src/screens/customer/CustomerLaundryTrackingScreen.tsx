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
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { CustomerChatModal } from "./CustomerChatModal";
import {
  getActiveLaundryOrder,
  subscribeLaundry,
  payLaundryOrder,
  updateLaundryOrderStatus,
  weighAndBillLaundryOrder,
  verifyLaundryPayment,
  LaundryOrder,
  LaundryOrderStatus,
} from "../../services/laundryService";

export const CustomerLaundryTrackingScreen: React.FC<Nav> = ({ navigate }) => {
  const [order, setOrder] = useState<LaundryOrder | null>(getActiveLaundryOrder());
  const [chatVisible, setChatVisible] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"QRIS" | "Transfer Bank">("QRIS");
  const [proofImageUri, setProofImageUri] = useState<string>("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  useEffect(() => {
    const unsub = subscribeLaundry(() => {
      setOrder(getActiveLaundryOrder());
    });
    setOrder(getActiveLaundryOrder());
    return unsub;
  }, []);

  const getStepNumber = (status?: LaundryOrderStatus): number => {
    if (!status) return 1;
    switch (status) {
      case "MENUNGGU_DRIVER_JEMPUT":
      case "DRIVER_MENUJU_CUSTOMER":
        return 1;
      case "DRIVER_MENUJU_LAUNDRY":
      case "TIBA_DI_LAUNDRY":
        return 2;
      case "MENUNGGU_PEMBAYARAN":
        return 3;
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
      title: "Penjemputan oleh Driver",
      subtitle: "Driver sedang menuju ke lokasi Anda untuk mengambil pakaian",
      activeText: "Driver Menuju Lokasi",
      activeSub: "Siapkan pakaian kotor yang akan dicuci...",
      icon: Bike,
    },
    {
      stepNum: 2,
      title: "Pakaian Tiba di Laundry",
      subtitle: "Pakaian telah sampai di toko dan sedang dalam antrean timbang",
      activeText: "Pakaian Diterima Mitra",
      activeSub: "Pemilik laundry sedang menimbang pakaian...",
      icon: Scale,
    },
    {
      stepNum: 3,
      title: "Penimbangan & Pembayaran",
      subtitle: "Tagihan diterbitkan berdasarkan berat riil, bayar via TF/QRIS & upload bukti",
      activeText: order?.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" ? "Menunggu Verifikasi Pembayaran" : "Menunggu Pembayaran Anda",
      activeSub: order?.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" ? "Pemilik toko sedang mengecek bukti transfer Anda..." : "Silakan bayar & unggah bukti transfer di bawah...",
      icon: CreditCard,
    },
    {
      stepNum: 4,
      title: "Proses Pencucian & Setrika",
      subtitle: "Pakaian sedang dicuci bersih, wangi, dan disetrika rapi",
      activeText: "Sedang Dicuci",
      activeSub: "Mitra memproses pakaian dengan pewangi khusus...",
      icon: Shirt,
    },
    {
      stepNum: 5,
      title: "Pengantaran Balik",
      subtitle: "Driver mengantarkan pakaian bersih kembali ke alamat Anda",
      activeText: "Dalam Perjalanan Antar",
      activeSub: "Driver membawa pakaian harum ke rumah Anda...",
      icon: Bike,
    },
  ];

  const handlePickProofImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Akses Galeri", "Mohon berikan izin akses galeri foto untuk mengunggah bukti pembayaran.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Picker error:", err);
      // Fallback demo proof image if on web / simulator
      setProofImageUri("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80");
    }
  };

  const handleSendPaymentProof = async () => {
    if (!order) return;
    if (!proofImageUri) {
      Alert.alert("Bukti Transfer Wajib", "Harap unggah foto bukti transfer atau resi pembayaran QRIS sebelum melanjutkan.");
      return;
    }

    setIsSubmittingProof(true);
    try {
      const orderId = order._id || order.id || "temp";
      await payLaundryOrder(orderId, selectedPaymentMethod, proofImageUri);
      setIsPaymentModalOpen(false);
      Alert.alert("Bukti Terkirim", "Bukti pembayaran berhasil diunggah dan masuk ke Pemilik Laundry untuk diverifikasi.");
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Simulator helper
  const handleNextStepDemo = async () => {
    if (!order) return;
    const orderId = order._id || order.id || "temp";
    if (currentStep === 1) {
      await updateLaundryOrderStatus(orderId, "TIBA_DI_LAUNDRY");
    } else if (currentStep === 2) {
      await weighAndBillLaundryOrder(orderId, 3.8);
    } else if (currentStep === 3) {
      if (order.status === "MENUNGGU_PEMBAYARAN") {
        setIsPaymentModalOpen(true);
      } else {
        // Otomatis verifikasi lunas oleh owner
        await verifyLaundryPayment(orderId, "approve");
      }
    } else if (currentStep === 4) {
      await updateLaundryOrderStatus(orderId, "DRIVER_MENGANTAR_BALIK");
    } else if (currentStep === 5) {
      await updateLaundryOrderStatus(orderId, "SELESAI");
    } else {
      await updateLaundryOrderStatus(orderId, "MENUNGGU_DRIVER_JEMPUT");
    }
  };

  const handleResetDemo = async () => {
    if (!order) return;
    const orderId = order._id || order.id || "temp";
    await updateLaundryOrderStatus(orderId, "MENUNGGU_DRIVER_JEMPUT");
  };

  const storeName = order?.storeName || "Ais Laundry";
  const serviceName = order?.serviceName || "Cuci Komplit (Cuci + Setrika)";
  const weight = order?.actualWeightOrQty ? `${order.actualWeightOrQty} ${order.unitType || "kg"}` : "Menunggu Ditimbang";
  const laundryPrice = order?.laundryCost || (order?.actualWeightOrQty ? order.actualWeightOrQty * (order.pricePerUnit || 6000) : 0);
  const deliveryPickup = order?.deliveryFeePickup || 4000;
  const deliveryDrop = order?.deliveryFeeDrop || 4000;
  const serviceFee = order?.serviceFee || 1000;
  const totalBill = order?.totalAmount || (laundryPrice > 0 ? laundryPrice + deliveryPickup + deliveryDrop + serviceFee : 0);

  const isVerifying = order?.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" || order?.paymentStatus === "menunggu_verifikasi";
  const isPaid = order?.paymentStatus === "lunas";
  const isRejected = order?.paymentStatus === "ditolak";

  return (
    <SafeAreaView style={styles.container}>
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

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Berat Cucian</Text>
              <Text style={styles.billValueHighlight}>{weight}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Biaya Cuci ({weight} × Rp {order?.pricePerUnit?.toLocaleString("id-ID") || "6.000"})</Text>
              <Text style={styles.billValue}>Rp {laundryPrice.toLocaleString("id-ID")}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Ongkir Driver (Jemput & Antar)</Text>
              <Text style={styles.billValue}>Rp {(deliveryPickup + deliveryDrop).toLocaleString("id-ID")}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Biaya Layanan</Text>
              <Text style={styles.billValue}>Rp {serviceFee.toLocaleString("id-ID")}</Text>
            </View>

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

        {/* Demo Simulation Controls */}
        <View style={styles.simCard}>
          <Text style={styles.simTitle}>⚡ Simulator Alur Real-time</Text>
          <Text style={styles.simSub}>
            Uji alur: Jemput ➔ Timbang ➔ Upload Bukti Bayar ➔ Verifikasi Owner ➔ Antar:
          </Text>
          <View style={styles.simButtonsRow}>
            <TouchableOpacity style={styles.btnSimNext} onPress={handleNextStepDemo} activeOpacity={0.8}>
              <Play size={14} color="#FFFFFF" />
              <Text style={styles.btnSimNextText}>Langkah Berikutnya</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSimReset} onPress={handleResetDemo} activeOpacity={0.8}>
              <RotateCcw size={14} color="#374151" />
              <Text style={styles.btnSimResetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
                <Text style={styles.modalTotalLabel}>Total yang Harus Dibayar</Text>
                <Text style={styles.modalTotalValue}>Rp {totalBill.toLocaleString("id-ID")}</Text>
                <Text style={styles.modalWeightDetail}>Berat: {weight} • {serviceName}</Text>
              </View>

              {/* 2 Payment Methods Only: QRIS & Transfer Bank */}
              <Text style={styles.sectionMethodTitle}>Pilih Metode Pembayaran</Text>
              <View style={styles.methodList}>
                {/* Opsi 1: QRIS */}
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
                      <Text style={styles.methodName}>QRIS All Payment</Text>
                      <Text style={styles.methodSub}>BCA Mobile, GoPay, OVO, Dana, ShopeePay</Text>
                    </View>
                  </View>
                  <View style={[styles.radioCircle, selectedPaymentMethod === "QRIS" && styles.radioCircleSelected]}>
                    {selectedPaymentMethod === "QRIS" && <View style={styles.radioInnerDot} />}
                  </View>
                </TouchableOpacity>

                {/* Opsi 2: Transfer Bank */}
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
                      <Text style={styles.methodSub}>BCA, Mandiri, BNI, BRI</Text>
                    </View>
                  </View>
                  <View style={[styles.radioCircle, selectedPaymentMethod === "Transfer Bank" && styles.radioCircleSelected]}>
                    {selectedPaymentMethod === "Transfer Bank" && <View style={styles.radioInnerDot} />}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Payment Details Container */}
              {selectedPaymentMethod === "QRIS" ? (
                <View style={styles.qrisContainer}>
                  <Text style={styles.qrisTitle}>Scan Barcode QRIS Mitra</Text>
                  <Image
                    source={{ uri: "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=RANGERS-LAUNDRY-PAYMENT-AIS-LAUNDRY" }}
                    style={styles.qrisImage}
                  />
                  <Text style={styles.qrisStoreName}>NMID: ID1020304050 • {storeName}</Text>
                  <Text style={styles.qrisNote}>Simpan/screenshot QRIS di atas untuk membayar lewat aplikasi m-banking atau e-wallet Anda.</Text>
                </View>
              ) : (
                <View style={styles.bankContainer}>
                  <Text style={styles.bankTitle}>Nomor Rekening Tujuan:</Text>
                  <View style={styles.bankCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bankName}>Bank BCA</Text>
                      <Text style={styles.bankAccountNum}>8735 0982 1140</Text>
                      <Text style={styles.bankHolder}>a.n. Mitra {storeName}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnCopy}
                      onPress={() => Alert.alert("Tersalin", "Nomor rekening berhasil disalin.")}
                    >
                      <Copy size={16} color="#0D7A53" />
                      <Text style={styles.btnCopyText}>Salin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Upload Proof Section (MANDATORY) */}
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
            </ScrollView>

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
                  <Text style={styles.btnSubmitPaymentText}>Kirim Bukti Pembayaran</Text>
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomerChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        orderId={order?.orderCode || "LND-2026"}
        participantName={storeName}
        participantType="merchant"
        initialMessage="Halo Kak, ada yang bisa kami bantu terkait pesanan laundry Anda?"
      />
    </SafeAreaView>
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  paymentModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
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
});
