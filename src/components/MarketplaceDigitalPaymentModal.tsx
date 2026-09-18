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
  Sparkles,
} from "lucide-react-native";
import Svg, { Rect } from "react-native-svg";
import { toQR } from "toqr";
import * as Clipboard from "expo-clipboard";
import { rp } from "../utils/formatters";
import { simulateMarketplacePayment } from "../services/api";
import { AuthAccount } from "../screens/auth/authTypes";

interface MarketplaceDigitalPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  onPaymentSuccess?: (updatedOrder: any) => void;
  authAccount?: AuthAccount | null;
}

export const MarketplaceDigitalPaymentModal: React.FC<MarketplaceDigitalPaymentModalProps> = ({
  visible,
  onClose,
  order,
  onPaymentSuccess,
  authAccount,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(900); // 15 minutes
  const [copied, setCopied] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [activeInstructionTab, setActiveInstructionTab] = useState<"mbanking" | "atm" | "qris">("mbanking");
  const timerRef = useRef<any>(null);

  const orderCode = order?.orderCode || order?.id || "RNG-MKT";
  const amount = Number(order?.totalAmount || order?.total || 0);
  const paymentMethod = String(order?.paymentMethod || "qris").toLowerCase();
  const paymentDetails = order?.paymentDetails || {};
  const isQris = paymentMethod === "qris";
  const isVa = paymentMethod.includes("va") || paymentMethod.includes("bca") || paymentMethod.includes("mandiri") || paymentMethod.includes("bni") || paymentMethod.includes("bri");
  const isEwallet = ["gopay", "dana", "ovo", "shopeepay"].includes(paymentMethod);

  // Initialize and countdown timer
  useEffect(() => {
    if (visible) {
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
      Alert.alert("Info", `Disalin: ${text}`);
    }
  };

  const handleSimulatePayment = async () => {
    if (isSimulating || isPaid) return;
    try {
      setIsSimulating(true);
      const targetId = order._id || order.id || order.orderCode;
      const result = await simulateMarketplacePayment(targetId, authAccount?.id);
      if (result.success) {
        setIsPaid(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (onPaymentSuccess) {
          onPaymentSuccess(result.data || { ...order, paymentStatus: "Lunas" });
        }
      } else {
        Alert.alert("Simulasi Gagal", result.message || "Gagal memproses simulasi.");
      }
    } catch (err: any) {
      Alert.alert("Gagal", err?.message || "Terjadi kendala saat simulasi.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenEwallet = async () => {
    const deepLink = paymentDetails.deepLinkUrl;
    if (deepLink) {
      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
          return;
        }
      } catch {
        // Continue to fallback
      }
    }
    Alert.alert(
      "Aplikasi E-Wallet",
      `Buka aplikasi ${paymentMethod.toUpperCase()} di perangkat Anda untuk menyelesaikan pembayaran sebesar ${rp(amount)}.`
    );
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
          source={{ uri: paymentDetails.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload || orderCode)}` }}
          style={styles.qrFallbackImage}
          resizeMode="contain"
        />
      );
    }
  };

  const qrString = paymentDetails.qrString || `00020101021226580016ID.CO.GEOVERSE.WWW0118936009990000010001520454115303360540${String(amount).length}${amount}5802ID5916GEOVERSE RANGERS6008BANDUNG61054013262070703A016304${orderCode}`;
  const vaNumber = paymentDetails.vaNumber || `12899${String(orderCode).replace(/\D/g, "").slice(-8) || "89201923"}`;
  const bankName = paymentDetails.bank || paymentMethod.replace("_va", "").toUpperCase() || "BCA";

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={styles.headerBadge}>
                <ShieldCheck size={13} color="#0D7A53" />
                <Text style={styles.headerBadgeText}>Pembayaran Aman Terenkripsi</Text>
              </View>
              <Text style={styles.headerTitle}>Selesaikan Pembayaran</Text>
              <Text style={styles.headerSubtitle}>Order #{orderCode}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Success Banner if already paid */}
            {isPaid ? (
              <View style={styles.paidSuccessCard}>
                <View style={styles.paidSuccessIconBg}>
                  <CheckCircle2 size={36} color="#0D7A53" />
                </View>
                <Text style={styles.paidSuccessTitle}>Pembayaran Berhasil!</Text>
                <Text style={styles.paidSuccessDesc}>
                  Dana sebesar {rp(amount)} telah diterima toko. Pesanan Anda kini siap diproses oleh merchant.
                </Text>
                <TouchableOpacity style={styles.continueShoppingBtn} onPress={onClose}>
                  <Text style={styles.continueShoppingBtnText}>Tutup & Lihat Pesanan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Countdown Timer Banner */}
                <View style={styles.timerCard}>
                  <View style={styles.timerRow}>
                    <Clock size={16} color="#D97706" />
                    <Text style={styles.timerLabel}>Batas Waktu Pembayaran</Text>
                  </View>
                  <View style={styles.timerDigitsBadge}>
                    <Text style={styles.timerDigitsText}>{formatTimer(secondsRemaining)}</Text>
                  </View>
                </View>

                {/* Amount to Pay Card */}
                <View style={styles.amountCard}>
                  <Text style={styles.amountLabel}>Total Tagihan</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountValue}>{rp(amount)}</Text>
                    <TouchableOpacity
                      style={styles.copyPill}
                      onPress={() => handleCopy(String(amount), "nominal")}
                      activeOpacity={0.7}
                    >
                      <Copy size={13} color="#0D7A53" />
                      <Text style={styles.copyPillText}>
                        {copied === "nominal" ? "Tersalin!" : "Salin Nominal"}
                      </Text>
                    </TouchableOpacity>
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
                        <Text style={styles.qrGpnText}>GPN • GEOVERSE RANGERS</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      onPress={() => handleCopy(qrString, "qris")}
                      activeOpacity={0.7}
                    >
                      <Copy size={15} color="#0D7A53" />
                      <Text style={styles.actionBtnOutlineText}>
                        {copied === "qris" ? "Kode QRIS Disalin!" : "Salin String QRIS"}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.instructionsContainer}>
                      <Text style={styles.instructionHeading}>Cara Pembayaran via QRIS:</Text>
                      <Text style={styles.instructionStep}>1. Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, DANA, ShopeePay).</Text>
                      <Text style={styles.instructionStep}>2. Pilih menu "Scan" atau "Bayar dengan QRIS".</Text>
                      <Text style={styles.instructionStep}>3. Pindai kode QR di atas atau gunakan tangkapan layar.</Text>
                      <Text style={styles.instructionStep}>4. Periksa nama merchant (GEOVERSE RANGERS) dan nominal ({rp(amount)}), lalu masukkan PIN Anda.</Text>
                    </View>
                  </View>
                )}

                {/* VIRTUAL ACCOUNT SECTION */}
                {isVa && (
                  <View style={styles.vaSection}>
                    <View style={styles.vaHeader}>
                      <View style={styles.vaLogoTag}>
                        <Building2 size={16} color="#FFFFFF" />
                        <Text style={styles.vaLogoText}>{bankName} Virtual Account</Text>
                      </View>
                    </View>

                    <View style={styles.vaBox}>
                      <Text style={styles.vaNumberLabel}>Nomor Virtual Account:</Text>
                      <View style={styles.vaNumberRow}>
                        <Text style={styles.vaNumberValue}>{vaNumber}</Text>
                        <TouchableOpacity
                          style={styles.vaCopyBtn}
                          onPress={() => handleCopy(vaNumber, "va")}
                          activeOpacity={0.7}
                        >
                          <Copy size={16} color="#FFFFFF" />
                          <Text style={styles.vaCopyBtnText}>
                            {copied === "va" ? "Tersalin" : "Salin"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.vaHolderName}>Nama Akun: GEOVERSE - {order.customerName || "CUSTOMER"}</Text>
                    </View>

                    {/* Collapsible Accordions for Instructions */}
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
                      <Text style={styles.ewalletTitle}>Pembayaran via {paymentMethod.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.ewalletDesc}>
                      Ketuk tombol di bawah untuk membuka aplikasi {paymentMethod.toUpperCase()} langsung dari ponsel Anda.
                    </Text>

                    <TouchableOpacity
                      style={styles.openEwalletBtn}
                      onPress={handleOpenEwallet}
                      activeOpacity={0.85}
                    >
                      <ExternalLink size={18} color="#FFFFFF" />
                      <Text style={styles.openEwalletBtnText}>Buka Aplikasi {paymentMethod.toUpperCase()}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* DEV / TESTING / SANDBOX SIMULATOR BUTTON */}
                <View style={styles.sandboxBox}>
                  <View style={styles.sandboxHeader}>
                    <Sparkles size={16} color="#8B5CF6" />
                    <Text style={styles.sandboxTitle}>Sandbox Mode / Pengujian Cepat</Text>
                  </View>
                  <Text style={styles.sandboxDesc}>
                    Ingin langsung menguji alur pesanan tanpa transfer sungguhan? Tekan tombol di bawah untuk memverifikasi pembayaran secara instan:
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
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {!isPaid && (
              <TouchableOpacity
                style={styles.footerSecondaryBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.footerSecondaryBtnText}>Bayar Nanti (Cek di Pesanan)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerInfo: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  headerBadgeText: {
    color: "#0D7A53",
    fontSize: 10,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  timerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerLabel: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  timerDigitsBadge: {
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerDigitsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  amountCard: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  amountLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  amountValue: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900",
  },
  copyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  copyPillText: {
    color: "#0D7A53",
    fontSize: 11,
    fontWeight: "700",
  },
  qrisSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  qrisHeader: {
    alignItems: "center",
    marginBottom: 14,
  },
  qrisLogoTag: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  qrisLogoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  qrisSubtitle: {
    color: "#64748B",
    fontSize: 11,
  },
  qrCodeBox: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  qrFallbackImage: {
    width: 230,
    height: 230,
  },
  qrGpnBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
  },
  qrGpnText: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
  },
  actionBtnOutlineText: {
    color: "#0D7A53",
    fontSize: 12,
    fontWeight: "700",
  },
  vaSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vaHeader: {
    marginBottom: 12,
  },
  vaLogoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0060AF",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  vaLogoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  vaBox: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vaNumberLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  vaNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  vaNumberValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  vaCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0060AF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  vaCopyBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  vaHolderName: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 8,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginTop: 14,
  },
  instructionTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  instructionTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  instructionTabText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  instructionTabTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  instructionsContainer: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#0D7A53",
    gap: 6,
  },
  instructionHeading: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  instructionStep: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 16,
  },
  ewalletSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ewalletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  ewalletTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  ewalletDesc: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  openEwalletBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00AED6",
    paddingVertical: 13,
    borderRadius: 14,
  },
  openEwalletBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  sandboxBox: {
    backgroundColor: "#FAF5FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  sandboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sandboxTitle: {
    color: "#6B21A8",
    fontSize: 12,
    fontWeight: "800",
  },
  sandboxDesc: {
    color: "#7E22CE",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  sandboxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 11,
    borderRadius: 12,
  },
  sandboxBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  paidSuccessCard: {
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 8,
  },
  paidSuccessIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  paidSuccessTitle: {
    color: "#0D7A53",
    fontSize: 18,
    fontWeight: "900",
  },
  paidSuccessDesc: {
    color: "#166534",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  continueShoppingBtn: {
    marginTop: 12,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 20,
  },
  continueShoppingBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerSecondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  footerSecondaryBtnText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
});
