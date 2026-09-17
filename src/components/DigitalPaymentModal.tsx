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
  Pressable,
} from "react-native";
import {
  X,
  QrCode,
  Wallet,
  Building2,
  Banknote,
  CheckCircle2,
  Copy,
  ExternalLink,
  Clock,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import {
  PaymentMethodType,
  PaymentDetails,
  createPayment,
  getPaymentStatus,
  simulatePaymentSuccess,
} from "../services/paymentService";

let setClipboardStringAsync: ((text: string) => Promise<boolean>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoClipboard = require("expo-clipboard");
  if (ExpoClipboard?.setStringAsync) {
    setClipboardStringAsync = ExpoClipboard.setStringAsync;
  }
} catch {
  // Fallback handled gracefully
}

interface DigitalPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderModel?: "RideOrder" | "Order";
  amount: number;
  onPaymentSuccess: (payment: PaymentDetails) => void;
  initialMethod?: PaymentMethodType;
}

interface MethodOption {
  id: PaymentMethodType;
  name: string;
  desc: string;
  category: "EWALLET" | "QRIS" | "VA" | "CASH";
  badgeColor: string;
  icon: "wallet" | "qris" | "bank" | "cash";
}

const PAYMENT_METHODS: MethodOption[] = [
  // QRIS
  {
    id: "QRIS",
    name: "QRIS Nasional",
    desc: "Scan QR lewat BCA, Mandiri, GoPay, OVO, DANA, ShopeePay dll.",
    category: "QRIS",
    badgeColor: "#E11D48",
    icon: "qris",
  },
  // E-Wallets
  {
    id: "GOPAY",
    name: "GoPay",
    desc: "Pembayaran instan langsung lewat aplikasi GoPay",
    category: "EWALLET",
    badgeColor: "#00AED6",
    icon: "wallet",
  },
  {
    id: "OVO",
    name: "OVO",
    desc: "Pembayaran digital via dompet OVO",
    category: "EWALLET",
    badgeColor: "#4C3494",
    icon: "wallet",
  },
  {
    id: "DANA",
    name: "DANA",
    desc: "Pembayaran instan lewat aplikasi DANA Dompet Digital",
    category: "EWALLET",
    badgeColor: "#118EEA",
    icon: "wallet",
  },
  {
    id: "SHOPEEPAY",
    name: "ShopeePay / SPayLater",
    desc: "Pembayaran lewat akun Shopee / ShopeePay",
    category: "EWALLET",
    badgeColor: "#EE4D2D",
    icon: "wallet",
  },
  // Virtual Accounts
  {
    id: "BCA_VA",
    name: "BCA Virtual Account",
    desc: "Transfer via BCA Mobile, KlikBCA, atau ATM BCA",
    category: "VA",
    badgeColor: "#0060AF",
    icon: "bank",
  },
  {
    id: "BNI_VA",
    name: "BNI Virtual Account",
    desc: "Transfer via BNI Mobile Banking, Internet Banking, ATM BNI",
    category: "VA",
    badgeColor: "#F15A24",
    icon: "bank",
  },
  {
    id: "BRI_VA",
    name: "BRI Virtual Account (BRIVA)",
    desc: "Transfer via BRImo, Internet Banking, atau ATM BRI",
    category: "VA",
    badgeColor: "#00529C",
    icon: "bank",
  },
  {
    id: "MANDIRI_VA",
    name: "Mandiri Virtual Account",
    desc: "Transfer via Livin' by Mandiri atau ATM Mandiri",
    category: "VA",
    badgeColor: "#003366",
    icon: "bank",
  },
  {
    id: "PERMATA_VA",
    name: "Permata Virtual Account",
    desc: "Transfer via PermataMobile X atau ATM Permata",
    category: "VA",
    badgeColor: "#84BD00",
    icon: "bank",
  },
  // Cash
  {
    id: "CASH",
    name: "Tunai (Bayar di Tempat)",
    desc: "Bayar tunai langsung kepada Driver Rangers saat perjalanan",
    category: "CASH",
    badgeColor: "#10B981",
    icon: "cash",
  },
];

export const DigitalPaymentModal: React.FC<DigitalPaymentModalProps> = ({
  visible,
  onClose,
  orderId,
  orderModel = "RideOrder",
  amount,
  onPaymentSuccess,
  initialMethod = "QRIS",
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(initialMethod);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "QRIS" | "EWALLET" | "VA" | "CASH">("ALL");
  const [loading, setLoading] = useState<boolean>(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins default
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setSelectedMethod(initialMethod);
      setPaymentDetails(null);
      setCopied(false);
      setSecondsRemaining(900);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible, initialMethod]);

  // Countdown timer for pending invoice
  useEffect(() => {
    if (paymentDetails && paymentDetails.status === "PENDING") {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [paymentDetails]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProceedPayment = async () => {
    if (!orderId) {
      Alert.alert("Perhatian", "ID Order belum tersedia.");
      return;
    }

    try {
      setLoading(true);
      const res = await createPayment({
        orderId,
        orderModel,
        paymentMethod: selectedMethod,
        amount,
      });
      setPaymentDetails(res);

      if (res.status === "PAID" || selectedMethod === "CASH") {
        onPaymentSuccess(res);
      }
    } catch (err: any) {
      Alert.alert("Gagal Membuat Pembayaran", err.message || "Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!paymentDetails?.paymentId) return;
    try {
      setCheckingStatus(true);
      const res = await getPaymentStatus(paymentDetails.paymentId);
      setPaymentDetails(res);
      if (res.status === "PAID") {
        Alert.alert("Pembayaran Berhasil", "Terima kasih! Pembayaran Anda telah terverifikasi.");
        onPaymentSuccess(res);
      } else {
        Alert.alert("Status Pembayaran", `Status saat ini: ${res.status}. Harap selesaikan pembayaran.`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Gagal memeriksa status pembayaran.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSimulatePaid = async () => {
    if (!paymentDetails?.paymentId) return;
    try {
      setCheckingStatus(true);
      const res = await simulatePaymentSuccess(paymentDetails.paymentId);
      setPaymentDetails(res);
      Alert.alert("Simulasi Berhasil", "Pembayaran telah berhasil disimulasikan sebagai LUNAS.");
      onPaymentSuccess(res);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Gagal simulasi pembayaran.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCopyVa = async (text?: string) => {
    if (!text) return;
    try {
      if (setClipboardStringAsync) {
        await setClipboardStringAsync(text);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert("Nomor VA Disalin", text);
    }
  };

  const handleOpenDeepLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Aplikasi Belum Terpasang", `Silakan buka aplikasi e-wallet Anda untuk menyelesaikan pembayaran.`);
      }
    } catch {
      Alert.alert("Informasi", `Membuka aplikasi pembayaran...`);
    }
  };

  const filteredMethods = PAYMENT_METHODS.filter((m) => {
    if (activeCategory === "ALL") return true;
    return m.category === activeCategory;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {paymentDetails ? "Detail Pembayaran" : "Pilih Metode Pembayaran"}
              </Text>
              <Text style={styles.headerSubtitle}>
                Total Tagihan: <Text style={styles.amountText}>Rp {amount.toLocaleString("id-ID")}</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* INVOICE VIEW */}
          {paymentDetails ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.invoiceContent}>
              <View style={styles.statusBadgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    paymentDetails.status === "PAID"
                      ? styles.statusPaid
                      : paymentDetails.status === "PENDING"
                      ? styles.statusPending
                      : styles.statusFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      paymentDetails.status === "PAID"
                        ? styles.statusPaidText
                        : paymentDetails.status === "PENDING"
                        ? styles.statusPendingText
                        : styles.statusFailedText,
                    ]}
                  >
                    {paymentDetails.status === "PAID"
                      ? "PEMBAYARAN LUNAS"
                      : paymentDetails.status === "PENDING"
                      ? "MENUNGGU PEMBAYARAN"
                      : paymentDetails.status}
                  </Text>
                </View>

                {paymentDetails.status === "PENDING" && (
                  <View style={styles.timerRow}>
                    <Clock size={14} color="#DC2626" />
                    <Text style={styles.timerText}>{formatTimer(secondsRemaining)}</Text>
                  </View>
                )}
              </View>

              {/* QRIS SPECIFIC VIEW */}
              {paymentDetails.paymentMethod === "QRIS" && (
                <View style={styles.qrisBox}>
                  <Text style={styles.qrisTitle}>Scan Kode QRIS di Bawah Ini</Text>
                  <Text style={styles.qrisSub}>Bisa di-scan dari BCA, Mandiri, GoPay, OVO, DANA, ShopeePay</Text>
                  <View style={styles.qrContainer}>
                    {paymentDetails.qrCodeUrl ? (
                      <Image
                        source={{ uri: paymentDetails.qrCodeUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.qrPlaceholder}>
                        <QrCode size={120} color="#0F172A" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.orderIdLabel}>ID Transaksi: {paymentDetails.paymentId}</Text>
                </View>
              )}

              {/* VIRTUAL ACCOUNT SPECIFIC VIEW */}
              {Boolean(paymentDetails.vaNumber || paymentDetails.virtualAccount?.vaNumber) && (
                <View style={styles.vaBox}>
                  <Text style={styles.vaBankName}>
                    {paymentDetails.bankName || paymentDetails.virtualAccount?.bank || "Bank Virtual Account"}
                  </Text>
                  <Text style={styles.vaLabel}>Nomor Virtual Account:</Text>
                  <View style={styles.vaNumberRow}>
                    <Text style={styles.vaNumberText}>
                      {paymentDetails.vaNumber || paymentDetails.virtualAccount?.vaNumber}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() =>
                        handleCopyVa(paymentDetails.vaNumber || paymentDetails.virtualAccount?.vaNumber)
                      }
                      activeOpacity={0.8}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={16} color="#059669" />
                          <Text style={styles.copiedText}>Tersalin</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={16} color="#0284C7" />
                          <Text style={styles.copyBtnText}>Salin</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionTitle}>Petunjuk Pembayaran:</Text>
                    <Text style={styles.instructionStep}>1. Buka aplikasi Mobile Banking atau ATM bank Anda.</Text>
                    <Text style={styles.instructionStep}>2. Pilih menu Transfer atau Pembayaran Virtual Account.</Text>
                    <Text style={styles.instructionStep}>3. Masukkan nomor VA di atas dan verifikasi nominal Rp {amount.toLocaleString("id-ID")}.</Text>
                    <Text style={styles.instructionStep}>4. Selesaikan transaksi dan simpan bukti pembayaran.</Text>
                  </View>
                </View>
              )}

              {/* EWALLET SPECIFIC VIEW */}
              {["GOPAY", "OVO", "DANA", "SHOPEEPAY"].includes(paymentDetails.paymentMethod) && (
                <View style={styles.ewalletBox}>
                  <Wallet size={40} color="#0284C7" />
                  <Text style={styles.ewalletTitle}>Pembayaran {paymentDetails.paymentMethod}</Text>
                  <Text style={styles.ewalletDesc}>
                    Silakan buka aplikasi {paymentDetails.paymentMethod} Anda untuk mengonfirmasi pembayaran tagihan sebesar Rp {amount.toLocaleString("id-ID")}.
                  </Text>
                  {Boolean(paymentDetails.deepLink || paymentDetails.deepLinkUrl) && (
                    <TouchableOpacity
                      style={styles.deepLinkBtn}
                      onPress={() => handleOpenDeepLink(paymentDetails.deepLink || paymentDetails.deepLinkUrl)}
                      activeOpacity={0.85}
                    >
                      <ExternalLink size={18} color="#FFFFFF" />
                      <Text style={styles.deepLinkBtnText}>Buka Aplikasi {paymentDetails.paymentMethod}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ACTION BUTTONS */}
              <View style={styles.invoiceActions}>
                {paymentDetails.status !== "PAID" && (
                  <>
                    <TouchableOpacity
                      style={styles.checkStatusBtn}
                      onPress={handleCheckStatus}
                      disabled={checkingStatus}
                    >
                      {checkingStatus ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <RefreshCw size={18} color="#FFFFFF" />
                          <Text style={styles.checkStatusText}>Cek Status Pembayaran</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Developer / Sandbox quick bypass */}
                    <TouchableOpacity
                      style={styles.simulateBtn}
                      onPress={handleSimulatePaid}
                      disabled={checkingStatus}
                    >
                      <Sparkles size={16} color="#059669" />
                      <Text style={styles.simulateText}>Simulasi Bayar Berhasil (Instant Test)</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.changeMethodBtn}
                  onPress={() => setPaymentDetails(null)}
                >
                  <Text style={styles.changeMethodText}>Ganti Metode Pembayaran</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* SELECTION VIEW */
            <>
              {/* Filter Tabs */}
              <View style={styles.categoryTabs}>
                {(["ALL", "QRIS", "EWALLET", "VA", "CASH"] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
                    onPress={() => setActiveCategory(cat)}
                  >
                    <Text style={[styles.catTabText, activeCategory === cat && styles.catTabTextActive]}>
                      {cat === "ALL"
                        ? "Semua"
                        : cat === "QRIS"
                        ? "QRIS"
                        : cat === "EWALLET"
                        ? "E-Wallet"
                        : cat === "VA"
                        ? "Virtual Account"
                        : "Tunai"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Methods list */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.methodsList}>
                {filteredMethods.map((item) => {
                  const isSelected = selectedMethod === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                      onPress={() => setSelectedMethod(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.methodIconBox, { backgroundColor: item.badgeColor + "15" }]}>
                        {item.icon === "qris" ? (
                          <QrCode size={22} color={item.badgeColor} />
                        ) : item.icon === "wallet" ? (
                          <Wallet size={22} color={item.badgeColor} />
                        ) : item.icon === "bank" ? (
                          <Building2 size={22} color={item.badgeColor} />
                        ) : (
                          <Banknote size={22} color={item.badgeColor} />
                        )}
                      </View>

                      <View style={styles.methodInfo}>
                        <View style={styles.methodTitleRow}>
                          <Text style={styles.methodName}>{item.name}</Text>
                          <View style={[styles.catBadge, { backgroundColor: item.badgeColor + "20" }]}>
                            <Text style={[styles.catBadgeText, { color: item.badgeColor }]}>
                              {item.category}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.methodDesc} numberOfLines={2}>
                          {item.desc}
                        </Text>
                      </View>

                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Footer Pay Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.payButton, loading && styles.payButtonDisabled]}
                  onPress={handleProceedPayment}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.payButtonText}>
                      Lanjutkan Pembayaran • Rp {amount.toLocaleString("id-ID")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  amountText: {
    fontWeight: "700",
    color: "#059669",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  categoryTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  catTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  catTabActive: {
    backgroundColor: "#059669",
  },
  catTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  catTabTextActive: {
    color: "#FFFFFF",
  },
  methodsList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  methodCardSelected: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  methodDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#059669",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#059669",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  payButton: {
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  invoiceContent: {
    padding: 20,
    gap: 16,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusPendingText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPaid: {
    backgroundColor: "#DCFCE7",
  },
  statusPaidText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },
  statusFailed: {
    backgroundColor: "#FEE2E2",
  },
  statusFailedText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  qrisBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  qrisTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  qrisSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
  },
  qrContainer: {
    width: 220,
    height: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  orderIdLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 12,
  },
  vaBox: {
    backgroundColor: "#F8FAFC",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vaBankName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  vaLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  vaNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 16,
  },
  vaNumberText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  copiedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  instructionsBox: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 2,
  },
  instructionStep: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  ewalletBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  ewalletTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  ewalletDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  deepLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0284C7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  deepLinkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  invoiceActions: {
    gap: 10,
    marginTop: 4,
  },
  checkStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 14,
  },
  checkStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 12,
    borderRadius: 14,
  },
  simulateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  changeMethodBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  changeMethodText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});
