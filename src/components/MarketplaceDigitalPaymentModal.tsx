import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import {
  X,
  QrCode,
  Wallet,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Clock,
  RefreshCw,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Banknote,
  Check,
} from "lucide-react-native";
import Svg, { Rect } from "react-native-svg";
import { toQR } from "toqr";
import * as Clipboard from "expo-clipboard";
import { rp } from "../utils/formatters";
import { simulateMarketplacePayment } from "../services/api";
import { simulateShopPayment } from "../services/shopService";
import { updateOrderPaymentMethod } from "../services/paymentService";
import { ToastBanner, ToastType } from "./CustomDialog";
import { AuthAccount } from "../screens/auth/authTypes";

interface MarketplaceDigitalPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  onPaymentSuccess?: (updatedOrder: any) => void;
  authAccount?: AuthAccount | null;
}

type ModalView = "DETAIL" | "METHOD_PICKER" | "INSTRUCTION";

interface PaymentOption {
  id: string;
  name: string;
  desc: string;
  category: "QRIS" | "VA" | "EWALLET" | "CASH";
  color: string;
}

const AVAILABLE_PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "qris",
    name: "QRIS Nasional",
    desc: "Scan QR lewat BCA, Mandiri, GoPay, OVO, DANA, ShopeePay",
    category: "QRIS",
    color: "#E11D48",
  },
  {
    id: "bca_va",
    name: "BCA Virtual Account",
    desc: "Transfer via BCA Mobile, KlikBCA, atau ATM BCA",
    category: "VA",
    color: "#0060AF",
  },
  {
    id: "mandiri_va",
    name: "Mandiri Virtual Account",
    desc: "Transfer via Livin' by Mandiri atau ATM Mandiri",
    category: "VA",
    color: "#003366",
  },
  {
    id: "gopay",
    name: "GoPay / E-Wallet",
    desc: "Pembayaran instan langsung lewat aplikasi GoPay",
    category: "EWALLET",
    color: "#00AED6",
  },
  {
    id: "cash",
    name: "Bayar di Tempat (COD / Tunai)",
    desc: "Bayar tunai kepada kurir saat barang sampai",
    category: "CASH",
    color: "#10B981",
  },
];

export const MarketplaceDigitalPaymentModal: React.FC<MarketplaceDigitalPaymentModalProps> = ({
  visible,
  onClose,
  order,
  onPaymentSuccess,
  authAccount,
}) => {
  const [currentView, setCurrentView] = useState<ModalView>("DETAIL");
  const [selectedMethod, setSelectedMethod] = useState<string>("qris");
  const [tempSelectedMethod, setTempSelectedMethod] = useState<string>("qris");
  const [updatingMethod, setUpdatingMethod] = useState<boolean>(false);

  const [secondsRemaining, setSecondsRemaining] = useState(900); // 15 minutes
  const [copied, setCopied] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [activeInstructionTab, setActiveInstructionTab] = useState<"mbanking" | "atm" | "qris">("mbanking");
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; type: ToastType; title: string; message: string }>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showToast = (type: ToastType, title: string, message: string) => {
    setToastConfig({ visible: true, type, title, message });
  };
  const timerRef = useRef<any>(null);

  const orderCode = order?.orderCode || order?.id || "RNG-MKT";
  const amount = Number(order?.totalAmount || order?.total || 0);

  // Initialize and countdown timer
  useEffect(() => {
    if (visible) {
      const initialMethod = String(order?.paymentMethod || "qris").toLowerCase();
      setSelectedMethod(initialMethod);
      setTempSelectedMethod(initialMethod);
      setCurrentView("DETAIL");
      setIsPaid(order?.paymentStatus === "Lunas" || order?.paymentStatus === "PAID");
      setSecondsRemaining(900);
      setCopied(null);
      setIsSimulating(false);
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, order]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      showToast("info", "Disalin", text);
    }
  };

  // 1. Open method picker (strictly decouples changing method from initiating payment)
  const handleOpenMethodPicker = () => {
    setTempSelectedMethod(selectedMethod);
    setCurrentView("METHOD_PICKER");
  };

  // 2. Confirm method update WITHOUT starting payment
  const handleConfirmMethodChange = async () => {
    if (!tempSelectedMethod) {
      showToast("error", "Pilih Metode", "Silakan pilih salah satu metode pembayaran.");
      return;
    }
    if (updatingMethod) return;

    try {
      setUpdatingMethod(true);
      const targetId = order?._id || order?.id || order?.orderCode;
      const orderType =
        order?.orderType ||
        (String(order?.orderCode || "").includes("SHOP") ? "KANYAAH_SHOP" : "MARKETPLACE");

      if (targetId) {
        const updateRes = await updateOrderPaymentMethod(
          {
            orderId: String(targetId),
            orderType,
            paymentMethod: tempSelectedMethod,
          },
          authAccount?.id
        );

        if (!updateRes?.success) {
          throw new Error(updateRes?.message || "Gagal memperbarui metode pembayaran di server.");
        }
      }

      // Update state
      setSelectedMethod(tempSelectedMethod);
      if (order) {
        order.paymentMethod = tempSelectedMethod;
      }
      setCurrentView("DETAIL");
      showToast("success", "Metode Diperbarui", "Metode pembayaran berhasil diubah.");
    } catch (err: any) {
      showToast("error", "Gagal Mengubah Metode", err?.message || "Terjadi kesalahan saat memperbarui metode pembayaran.");
    } finally {
      setUpdatingMethod(false);
    }
  };

  // Cancel picker and keep previous method
  const handleCancelMethodPicker = () => {
    setTempSelectedMethod(selectedMethod);
    setCurrentView("DETAIL");
  };

  // 3. Explicit payment execution button "Lakukan Pembayaran"
  const handleExecutePayment = () => {
    if (!selectedMethod) {
      showToast("error", "Pilih Metode", "Silakan pilih metode pembayaran terlebih dahulu.");
      return;
    }
    if (amount <= 0) {
      showToast("error", "Nominal Tidak Valid", "Total tagihan harus lebih dari Rp 0.");
      return;
    }

    if (selectedMethod === "cash" || selectedMethod === "cod") {
      Alert.alert(
        "Konfirmasi Pembayaran COD",
        `Pesanan #${orderCode} akan dibayar tunai sebesar ${rp(amount)} saat barang diantar. Lanjutkan?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Konfirmasi COD",
            onPress: () => {
              if (onPaymentSuccess) {
                onPaymentSuccess({ ...order, paymentMethod: "cash", paymentStatus: "Menunggu pembayaran di tempat" });
              }
              onClose();
            },
          },
        ]
      );
      return;
    }

    // Digital payment -> reveal payment instructions (QR/VA/E-wallet)
    setCurrentView("INSTRUCTION");
  };

  const handleSimulatePayment = async () => {
    if (isSimulating || isPaid) return;
    try {
      setIsSimulating(true);
      const targetId = order._id || order.id || order.orderCode;

      const isShopOrder =
        order.orderType === "KANYAAH_SHOP" ||
        order.orderType === "SHOP" ||
        String(order.orderCode || "").includes("SHOP") ||
        Boolean(order.storeId && (order.items || order.deliverySlot));

      let result: any;
      if (isShopOrder) {
        result = await simulateShopPayment(targetId);
      } else {
        result = await simulateMarketplacePayment(targetId, authAccount?.id);
      }

      if (!result?.success && String(result?.message || "").includes("tidak ditemukan")) {
        result = isShopOrder
          ? await simulateMarketplacePayment(targetId, authAccount?.id)
          : await simulateShopPayment(targetId);
      }

      if (result.success) {
        setIsPaid(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (onPaymentSuccess) {
          onPaymentSuccess(result.data || { ...order, paymentStatus: "PAID", orderStatus: "WAITING_STORE_CONFIRMATION" });
        }
      } else {
        showToast("error", "Simulasi Gagal", result.message || "Gagal memproses simulasi.");
      }
    } catch (err: any) {
      showToast("error", "Gagal", err?.message || "Terjadi kendala saat simulasi.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenEwallet = async () => {
    const paymentDetails = order?.paymentDetails || {};
    const deepLink = paymentDetails.deepLinkUrl;
    if (deepLink) {
      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
          return;
        }
      } catch {
        // Fallback
      }
    }
    showToast("info", "Aplikasi E-Wallet", `Buka aplikasi ${selectedMethod.toUpperCase()} di ponsel Anda untuk membayar sebesar ${rp(amount)}.`);
  };

  // Render SVG QR representation
  const renderQrisMatrix = (qrPayload: string) => {
    try {
      if (!qrPayload) return null;
      const qrData = toQR(qrPayload);
      if (!qrData || !Array.isArray(qrData)) return null;

      const size = 230;
      const matrixSize = qrData.length;
      const cellSize = size / matrixSize;

      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {qrData.map((row: any, r: number) =>
            row.map((cell: any, c: number) => {
              if (cell) {
                return (
                  <Rect
                    key={`${r}-${c}`}
                    x={c * cellSize}
                    y={r * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="#111827"
                  />
                );
              }
              return null;
            })
          )}
        </Svg>
      );
    } catch {
      return (
        <Image
          source={{ uri: order?.paymentDetails?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload || orderCode)}` }}
          style={styles.qrFallbackImage}
          resizeMode="contain"
        />
      );
    }
  };

  const qrString = order?.paymentDetails?.qrString || `00020101021226580016ID.CO.GEOVERSE.WWW0118936009990000010001520454115303360540${String(amount).length}${amount}5802ID5916GEOVERSE RANGERS6008BANDUNG61054013262070703A016304${orderCode}`;
  const vaNumber = order?.paymentDetails?.vaNumber || `12899${String(orderCode).replace(/\D/g, "").slice(-8) || "89201923"}`;
  const bankName = selectedMethod.includes("mandiri") ? "Mandiri" : "BCA";

  const isQris = selectedMethod === "qris";
  const isVa = selectedMethod.includes("va") || selectedMethod.includes("bca") || selectedMethod.includes("mandiri");
  const isEwallet = ["gopay", "dana", "ovo", "shopeepay"].includes(selectedMethod);
  const isCash = selectedMethod === "cash" || selectedMethod === "cod";

  const selectedMethodObj =
    AVAILABLE_PAYMENT_OPTIONS.find((m) => m.id === selectedMethod) || AVAILABLE_PAYMENT_OPTIONS[0];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              {currentView === "METHOD_PICKER" && (
                <TouchableOpacity style={styles.backBtn} onPress={handleCancelMethodPicker} activeOpacity={0.7}>
                  <ArrowLeft size={18} color="#0F172A" />
                </TouchableOpacity>
              )}
              <View style={styles.headerInfo}>
                <View style={styles.headerBadge}>
                  <ShieldCheck size={13} color="#0D7A53" />
                  <Text style={styles.headerBadgeText}>Pembayaran Aman Terenkripsi</Text>
                </View>
                <Text style={styles.headerTitle}>
                  {currentView === "DETAIL"
                    ? "Detail Pembayaran"
                    : currentView === "METHOD_PICKER"
                    ? "Pilih Metode Pembayaran"
                    : "Instruksi Pembayaran"}
                </Text>
                <Text style={styles.headerSubtitle}>Order #{orderCode}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* ================================================================= */}
          {/* SUCCESS STATE                                                    */}
          {/* ================================================================= */}
          {isPaid ? (
            <View style={styles.paidContentBox}>
              <View style={styles.paidIconBox}>
                <CheckCircle2 size={48} color="#0D7A53" />
              </View>
              <Text style={styles.paidTitle}>Pembayaran Berhasil Diverifikasi!</Text>
              <Text style={styles.paidSubtitle}>
                Terima kasih, pembayaran sebesar {rp(amount)} telah lunas dan terverifikasi otomatis. Pesanan segera disiapkan oleh toko.
              </Text>
              <TouchableOpacity
                style={styles.paidCloseBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.paidCloseBtnText}>Tutup & Cek Status Pesanan</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ================================================================= */}
              {/* VIEW 1: DETAIL PEMBAYARAN (Decoupled screen)                     */}
              {/* ================================================================= */}
              {currentView === "DETAIL" && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
                  {/* Total Tagihan Card */}
                  <View style={styles.amountCard}>
                    <Text style={styles.amountLabel}>Total Tagihan Pesanan</Text>
                    <Text style={styles.amountValue}>{rp(amount)}</Text>
                    <Text style={styles.amountSubtext}>Harga sudah termasuk ongkos kirim dan biaya layanan</Text>
                  </View>

                  {/* Order Line Summary Card */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Toko / Merchant</Text>
                      <Text style={styles.summaryValue}>{order?.storeName || "Toko GEOVERSE"}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Kode Pesanan</Text>
                      <Text style={styles.summaryValue}>{orderCode}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { fontWeight: "700", color: "#111827" }]}>Total Pembayaran</Text>
                      <Text style={styles.summaryTotalVal}>{rp(amount)}</Text>
                    </View>
                  </View>

                  {/* Selected Payment Method Card with "Ganti Metode Pembayaran" */}
                  <View style={styles.methodSection}>
                    <Text style={styles.sectionHeading}>Metode Pembayaran</Text>
                    <View style={styles.selectedMethodBox}>
                      <View style={[styles.methodIconBadge, { backgroundColor: selectedMethodObj.color + "15" }]}>
                        {selectedMethodObj.category === "QRIS" ? (
                          <QrCode size={22} color={selectedMethodObj.color} />
                        ) : selectedMethodObj.category === "VA" ? (
                          <Building2 size={22} color={selectedMethodObj.color} />
                        ) : selectedMethodObj.category === "EWALLET" ? (
                          <Wallet size={22} color={selectedMethodObj.color} />
                        ) : (
                          <Banknote size={22} color={selectedMethodObj.color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedMethodTitle}>{selectedMethodObj.name}</Text>
                        <Text style={styles.selectedMethodSubtitle} numberOfLines={2}>
                          {selectedMethodObj.desc}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeMethodSmallBtn}
                        onPress={handleOpenMethodPicker}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.changeMethodSmallBtnText}>Ganti</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.changeMethodLinkRow}
                      onPress={handleOpenMethodPicker}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeMethodLinkText}>Ganti Metode Pembayaran</Text>
                      <ArrowRight size={14} color="#0D7A53" />
                    </TouchableOpacity>
                  </View>

                  {/* Decouple Explanation Notice */}
                  <View style={styles.decoupleNoticeBox}>
                    <ShieldCheck size={16} color="#0D7A53" />
                    <Text style={styles.decoupleNoticeText}>
                      Mengganti metode pembayaran hanya memperbarui opsi tagihan tanpa memicu transaksi baru. Pembayaran baru dimulai saat Anda menekan tombol di bawah.
                    </Text>
                  </View>

                  {/* Primary CTA: "Lakukan Pembayaran" */}
                  <View style={styles.footerActionContainer}>
                    <TouchableOpacity
                      style={styles.primaryPayBtn}
                      onPress={handleExecutePayment}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.primaryPayBtnText}>
                        Lakukan Pembayaran • {rp(amount)}
                      </Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}

              {/* ================================================================= */}
              {/* VIEW 2: METHOD PICKER (Select new method + Lanjutkan Ubah)       */}
              {/* ================================================================= */}
              {currentView === "METHOD_PICKER" && (
                <View style={{ flex: 1 }}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerListContent}>
                    <Text style={styles.pickerInstructionText}>
                      Pilih metode pembayaran baru untuk pesanan #{orderCode}. Tagihan Anda akan diperbarui sesuai pilihan:
                    </Text>

                    {AVAILABLE_PAYMENT_OPTIONS.map((item) => {
                      const isSelected = tempSelectedMethod === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.pickerItemCard, isSelected && styles.pickerItemCardSelected]}
                          onPress={() => setTempSelectedMethod(item.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.methodIconBadge, { backgroundColor: item.color + "15" }]}>
                            {item.category === "QRIS" ? (
                              <QrCode size={22} color={item.color} />
                            ) : item.category === "VA" ? (
                              <Building2 size={22} color={item.color} />
                            ) : item.category === "EWALLET" ? (
                              <Wallet size={22} color={item.color} />
                            ) : (
                              <Banknote size={22} color={item.color} />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickerItemName}>{item.name}</Text>
                            <Text style={styles.pickerItemDesc} numberOfLines={2}>
                              {item.desc}
                            </Text>
                          </View>

                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Footer with "Lanjutkan Ubah Metode Pembayaran" */}
                  <View style={styles.pickerFooterBox}>
                    <TouchableOpacity
                      style={[styles.confirmMethodChangeBtn, updatingMethod && { opacity: 0.7 }]}
                      onPress={handleConfirmMethodChange}
                      disabled={updatingMethod}
                      activeOpacity={0.88}
                    >
                      {updatingMethod ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.confirmMethodChangeBtnText}>Lanjutkan Ubah Metode Pembayaran</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelPickerBtn}
                      onPress={handleCancelMethodPicker}
                      disabled={updatingMethod}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelPickerBtnText}>Batal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ================================================================= */}
              {/* VIEW 3: INSTRUCTION (Only shown after "Lakukan Pembayaran" clicked) */}
              {/* ================================================================= */}
              {currentView === "INSTRUCTION" && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.instructionScrollContent}>
                  {/* Countdown Timer */}
                  <View style={styles.timerBanner}>
                    <View style={styles.timerRow}>
                      <Clock size={16} color="#D97706" />
                      <Text style={styles.timerLabel}>Sisa Waktu Pembayaran:</Text>
                    </View>
                    <View style={styles.timerDigitsBadge}>
                      <Text style={styles.timerDigitsText}>{formatTimer(secondsRemaining)}</Text>
                    </View>
                  </View>

                  {/* QRIS SECTION */}
                  {isQris && (
                    <View style={styles.qrisSection}>
                      <View style={styles.qrisHeader}>
                        <View style={styles.qrisLogoTag}>
                          <Text style={styles.qrisLogoText}>QRIS</Text>
                        </View>
                        <Text style={styles.qrisSubtitle}>Standard Pembayaran Nasional</Text>
                      </View>

                      <View style={styles.qrCodeBox}>
                        {renderQrisMatrix(qrString)}
                        <View style={styles.qrGpnBadge}>
                          <Text style={styles.qrGpnText}>GPN • GEOVERSE</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() => handleCopy(qrString, "qr")}
                        activeOpacity={0.7}
                      >
                        <Copy size={16} color="#0D7A53" />
                        <Text style={styles.actionBtnOutlineText}>
                          {copied === "qr" ? "Kode QRIS Tersalin!" : "Salin Kode QRIS"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionHeading}>Cara Bayar via QRIS:</Text>
                        <Text style={styles.instructionStep}>1. Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-wallet (GoPay, OVO, DANA, ShopeePay).</Text>
                        <Text style={styles.instructionStep}>2. Pilih menu Bayar / Scan QR.</Text>
                        <Text style={styles.instructionStep}>3. Arahkan kamera ke QR code di atas atau salin kode QRIS.</Text>
                        <Text style={styles.instructionStep}>4. Periksa nama merchant (GEOVERSE) dan nominal ({rp(amount)}).</Text>
                        <Text style={styles.instructionStep}>5. Konfirmasi pembayaran dan simpan struk transfer Anda.</Text>
                      </View>
                    </View>
                  )}

                  {/* VIRTUAL ACCOUNT SECTION */}
                  {isVa && (
                    <View style={styles.vaSection}>
                      <View style={styles.vaCardHeader}>
                        <View style={styles.vaBankBadge}>
                          <Text style={styles.vaBankBadgeText}>{bankName}</Text>
                        </View>
                        <Text style={styles.vaBankTitle}>Virtual Account {bankName}</Text>
                      </View>

                      <View style={styles.vaBox}>
                        <Text style={styles.vaBoxLabel}>Nomor Virtual Account</Text>
                        <View style={styles.vaNumberRow}>
                          <Text style={styles.vaNumberText}>{vaNumber}</Text>
                          <TouchableOpacity
                            style={styles.vaCopyBtn}
                            onPress={() => handleCopy(vaNumber, "va")}
                            activeOpacity={0.8}
                          >
                            <Copy size={16} color="#FFFFFF" />
                            <Text style={styles.vaCopyBtnText}>
                              {copied === "va" ? "Tersalin" : "Salin"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.vaHolderName}>Nama Akun: GEOVERSE - {order.customerName || "CUSTOMER"}</Text>
                      </View>

                      {/* Instructions */}
                      <View style={styles.tabsRow}>
                        <TouchableOpacity
                          style={[styles.instructionTab, activeInstructionTab === "mbanking" && styles.instructionTabActive]}
                          onPress={() => setActiveInstructionTab("mbanking")}
                        >
                          <Text style={[styles.instructionTabText, activeInstructionTab === "mbanking" && styles.instructionTabTextActive]}>
                            m-Banking
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.instructionTab, activeInstructionTab === "atm" && styles.instructionTabActive]}
                          onPress={() => setActiveInstructionTab("atm")}
                        >
                          <Text style={[styles.instructionTabText, activeInstructionTab === "atm" && styles.instructionTabTextActive]}>
                            ATM
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.instructionsContainer}>
                        {activeInstructionTab === "mbanking" ? (
                          <>
                            <Text style={styles.instructionStep}>1. Buka aplikasi Mobile Banking {bankName}.</Text>
                            <Text style={styles.instructionStep}>2. Pilih menu Transfer {">"} Virtual Account.</Text>
                            <Text style={styles.instructionStep}>3. Masukkan nomor VA: {vaNumber}.</Text>
                            <Text style={styles.instructionStep}>4. Pastikan tagihan sesuai ({rp(amount)}) dan konfirmasi PIN Anda.</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.instructionStep}>1. Masukkan kartu ATM {bankName} dan PIN Anda.</Text>
                            <Text style={styles.instructionStep}>2. Pilih menu Transaksi Lainnya {">"} Transfer {">"} Virtual Account.</Text>
                            <Text style={styles.instructionStep}>3. Masukkan nomor {vaNumber} lalu tekan Benar.</Text>
                            <Text style={styles.instructionStep}>4. Periksa rincian pembayaran dan selesaikan transaksi.</Text>
                          </>
                        )}
                      </View>
                    </View>
                  )}

                  {/* E-WALLET SECTION */}
                  {isEwallet && (
                    <View style={styles.ewalletSection}>
                      <View style={styles.ewalletHeader}>
                        <Wallet size={20} color="#0D7A53" />
                        <Text style={styles.ewalletTitle}>Pembayaran via {selectedMethod.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.ewalletDesc}>
                        Ketuk tombol di bawah untuk membuka aplikasi {selectedMethod.toUpperCase()} langsung dari ponsel Anda.
                      </Text>

                      <TouchableOpacity
                        style={styles.openEwalletBtn}
                        onPress={handleOpenEwallet}
                        activeOpacity={0.85}
                      >
                        <ExternalLink size={18} color="#FFFFFF" />
                        <Text style={styles.openEwalletBtnText}>Buka Aplikasi {selectedMethod.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Change Method Button from Instruction View */}
                  <TouchableOpacity
                    style={styles.changeMethodFromInstructionBtn}
                    onPress={handleOpenMethodPicker}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeMethodFromInstructionText}>Ganti Metode Pembayaran</Text>
                  </TouchableOpacity>

                  {/* Sandbox Instant Simulation */}
                  <View style={styles.sandboxBox}>
                    <View style={styles.sandboxHeader}>
                      <Sparkles size={16} color="#8B5CF6" />
                      <Text style={styles.sandboxTitle}>Sandbox Mode / Pengujian Cepat</Text>
                    </View>
                    <Text style={styles.sandboxDesc}>
                      Uji alur pesanan tanpa transfer sungguhan dengan menekan tombol di bawah:
                    </Text>
                    <TouchableOpacity
                      style={styles.sandboxBtn}
                      onPress={handleSimulatePayment}
                      disabled={isSimulating}
                      activeOpacity={0.8}
                    >
                      {isSimulating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Zap size={16} color="#FFFFFF" />
                          <Text style={styles.sandboxBtnText}>Simulasikan Bayar Berhasil (Instant Lunas)</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </>
          )}

          {/* Footer Close / Bayar Nanti */}
          <View style={styles.footer}>
            {!isPaid && (
              <TouchableOpacity
                style={styles.footerSecondaryBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.footerSecondaryBtnText}>Tutup (Selesaikan Nanti di Pesanan)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ToastBanner
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    padding: 20,
    gap: 16,
  },
  amountCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
  },
  amountValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 4,
  },
  amountSubtext: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 4,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  summaryTotalVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D7A53",
  },
  methodSection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  selectedMethodBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
    gap: 12,
  },
  methodIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedMethodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  selectedMethodSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  changeMethodSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
  },
  changeMethodSmallBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  changeMethodLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  changeMethodLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D7A53",
  },
  decoupleNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  decoupleNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 16,
  },
  footerActionContainer: {
    marginTop: 8,
  },
  primaryPayBtn: {
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPayBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pickerListContent: {
    padding: 20,
    gap: 12,
  },
  pickerInstructionText: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
    lineHeight: 18,
  },
  pickerItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  pickerItemCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  pickerItemDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#0D7A53",
  },
  pickerFooterBox: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  confirmMethodChangeBtn: {
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmMethodChangeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelPickerBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPickerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  instructionScrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  timerBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  timerDigitsBadge: {
    backgroundColor: "#D97706",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timerDigitsText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  qrisSection: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  qrisHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  qrisLogoTag: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrisLogoText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  qrisSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  qrCodeBox: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  qrFallbackImage: {
    width: 220,
    height: 220,
  },
  qrGpnBadge: {
    marginTop: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrGpnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  instructionsContainer: {
    width: "100%",
    marginTop: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  instructionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  instructionStep: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
  vaSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  vaCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  vaBankBadge: {
    backgroundColor: "#003C93",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vaBankBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  vaBankTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  vaBox: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  vaBoxLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  vaNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  vaNumberText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 1.2,
  },
  vaCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  vaCopyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  vaHolderName: {
    fontSize: 12,
    color: "#6B7280",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  instructionTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  instructionTabActive: {
    backgroundColor: "#0D7A53",
  },
  instructionTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  instructionTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  ewalletSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    alignItems: "center",
    gap: 10,
  },
  ewalletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ewalletTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  ewalletDesc: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  openEwalletBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 6,
  },
  openEwalletBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  changeMethodFromInstructionBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  changeMethodFromInstructionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D7A53",
  },
  sandboxBox: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  sandboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sandboxTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },
  sandboxDesc: {
    fontSize: 11,
    color: "#7C3AED",
    lineHeight: 16,
  },
  sandboxBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  sandboxBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paidContentBox: {
    padding: 30,
    alignItems: "center",
    gap: 12,
  },
  paidIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  paidTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  paidSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
  },
  paidCloseBtn: {
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  paidCloseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerSecondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerSecondaryBtnText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
});
