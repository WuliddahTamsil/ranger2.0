import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from "react-native";
import {
  ArrowLeft,
  X,
  QrCode,
  Building2,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Copy,
  ChevronRight,
  Sparkles,
  WalletCards,
  Check,
  ExternalLink,
} from "lucide-react-native";
import Svg, { Rect } from "react-native-svg";
import { toQR } from "toqr";
import * as Clipboard from "expo-clipboard";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useSendContext } from "../../../context/SendContext";
import { fetchSendOrderById, createSendOrder } from "../../../services/sendService";
import { rp } from "../../../utils/formatters";
import { API_BASE_URL } from "../../../services/api";
import { SafeAreaBottomBar } from "../../../components/SafeAreaBottomBar";
import { io } from "socket.io-client";

interface SendPaymentScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

const paymentMethods: Array<{
  id: string;
  name: string;
  subtitle: string;
  color: string;
  available: boolean;
}> = [
  { id: "CASH", name: "Bayar di Tempat (COD / Tunai)", subtitle: "Bayar tunai ke driver saat paket dijemput/diantar", color: "#D97706", available: true },
  { id: "QRIS", name: "QRIS Instan", subtitle: "Scan QR lewat BCA, Mandiri, GoPay, OVO, DANA, dll.", color: "#0D7A53", available: true },
  { id: "GOPAY", name: "GoPay / E-Wallet", subtitle: "Pembayaran instan langsung via GoPay", color: "#00AED6", available: true },
  { id: "BCA_VA", name: "BCA Virtual Account", subtitle: "Transfer via BCA Mobile, myBCA, atau ATM BCA", color: "#003C93", available: true },
  { id: "MANDIRI_VA", name: "Mandiri Virtual Account", subtitle: "Transfer via Livin' by Mandiri atau ATM Mandiri", color: "#002855", available: true },
];

const SummaryRow: React.FC<{ label: string; value: string; strong?: boolean; green?: boolean }> = ({
  label,
  value,
  strong,
  green,
}) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
    <Text style={[styles.summaryValue, strong && styles.summaryStrong, green && styles.greenText]}>
      {value}
    </Text>
  </View>
);

export const SendPaymentScreen: React.FC<SendPaymentScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const {
    sender,
    recipient,
    packageData,
    fareEstimate,
    activeOrder,
    setActiveOrder,
    paymentMethod,
    setPaymentMethod,
  } = useSendContext();

  const [selectedMethod, setSelectedMethod] = useState<string>(
    activeOrder?.paymentMethod || paymentMethod || "QRIS"
  );
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [simulating, setSimulating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(
    activeOrder?.paymentStatus === "PAID" || activeOrder?.paymentStatus === "Lunas"
  );
  const [activeInstructionTab, setActiveInstructionTab] = useState<"mbanking" | "atm">("mbanking");
  const timerRef = useRef<any>(null);

  const selectedPaymentObj =
    paymentMethods.find((m) => m.id === selectedMethod) || paymentMethods[1];

  const totalAmount =
    activeOrder?.pricing?.finalFare ||
    (activeOrder as any)?.totalAmount ||
    fareEstimate?.finalFare ||
    10000;

  const isOrderActive = Boolean(activeOrder?._id);
  const activeMethod = String(activeOrder?.paymentMethod || selectedMethod).toUpperCase();
  const isVA = activeMethod.includes("VA");
  const isCash = activeMethod === "CASH" || activeMethod === "BAYAR TUNAI" || activeMethod === "COD";
  const isGopay = activeMethod === "GOPAY";
  const isQris = !isVA && !isCash && !isGopay;

  const orderCode = activeOrder?.orderCode || "KNY-SEND";
  const vaBankName = activeMethod.includes("MANDIRI") ? "Mandiri" : "BCA";
  const vaNumber = `8277 08${(activeOrder?._id || "99201923").replace(/\D/g, "").slice(-8) || "89201923"}`;
  const qrString = `00020101021226580016ID.CO.GEOVERSE.WWW0118936009990000010001520454115303360540${String(totalAmount).length}${totalAmount}5802ID5916GEOVERSE RANGERS6008BANDUNG61054013262070703A016304${orderCode}`;

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 3000);
  };

  // 15-minute countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
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
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(label);
      showToast(`${label} disalin ke clipboard!`);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      showToast(`Disalin: ${text}`);
    }
  };

  // Socket & Polling for real-time payment confirmation if activeOrder is created
  useEffect(() => {
    if (!activeOrder?._id) return;

    if (activeOrder.paymentStatus === "PAID" || activeOrder.paymentStatus === "Lunas") {
      setIsPaid(true);
    }

    const socket = io(API_BASE_URL, { transports: ["websocket", "polling"] });
    socket.emit("join_send_room", { orderId: activeOrder._id, token: authAccount?.token });

    const handlePaymentUpdated = (updatedOrder: any) => {
      if (
        updatedOrder &&
        (updatedOrder.paymentStatus === "PAID" ||
          updatedOrder.paymentStatus === "Lunas" ||
          updatedOrder.status === "SEARCHING_DRIVER")
      ) {
        setIsPaid(true);
        setActiveOrder(updatedOrder);
        showToast("Pembayaran berhasil diverifikasi!");
        setTimeout(() => navigate("c_send_searching"), 1200);
      }
    };

    socket.on("send:payment_updated", handlePaymentUpdated);
    socket.on("send:status_updated", handlePaymentUpdated);

    // Polling fallback every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetchSendOrderById(activeOrder._id, authAccount?.id);
        if (res.success && res.data) {
          if (
            res.data.paymentStatus === "PAID" ||
            res.data.paymentStatus === "Lunas" ||
            res.data.status === "SEARCHING_DRIVER"
          ) {
            setIsPaid(true);
            setActiveOrder(res.data);
            clearInterval(interval);
            setTimeout(() => navigate("c_send_searching"), 1200);
          }
        }
      } catch (e) {
        // silent
      }
    }, 3000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [activeOrder?._id, authAccount?.id, authAccount?.token]);

  // Create Order if not created yet
  const handleProceedOrder = async () => {
    setCreatingOrder(true);
    try {
      const idempotencyKey = `SEND-${authAccount?.id || "anon"}-${Date.now()}`;
      const payload = {
        sender,
        recipient,
        package: packageData,
        paymentMethod: selectedMethod,
        discount: fareEstimate?.discount || 0,
        idempotencyKey,
        customerId: authAccount?.id,
      };

      const res = await createSendOrder(payload, authAccount?.id);
      if (res.success && res.data) {
        setActiveOrder(res.data);
        if (selectedMethod === "CASH") {
          navigate("c_send_searching");
        } else {
          showToast("Sesi pembayaran berhasil dibuat.");
        }
      } else {
        showToast(res.message || "Gagal membuat pesanan.");
      }
    } catch (e: any) {
      showToast("Terjadi kendala saat memproses pesanan.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!activeOrder?._id || simulating || isPaid) return;
    setSimulating(true);
    try {
      await fetch(`${API_BASE_URL}/api/payments/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder._id,
          orderType: "KANYAAH_SEND",
          paymentStatus: "PAID",
          status: "PAID",
          transactionStatus: "settlement",
        }),
      });

      setIsPaid(true);
      showToast("Simulasi berhasil! Pembayaran terverifikasi.");
      setTimeout(() => {
        navigate("c_send_searching");
      }, 1400);
    } catch (e) {
      showToast("Simulasi pembayaran gagal terhubung.");
    } finally {
      setSimulating(false);
    }
  };

  // Render SVG QR representation
  const renderQrisMatrix = (payload: string) => {
    try {
      if (!payload) return null;
      const qrData = toQR(payload);
      if (!qrData || !Array.isArray(qrData)) return null;

      const size = 220;
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
          source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}` }}
          style={styles.qrFallbackImage}
          resizeMode="contain"
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (isOrderActive) {
              navigate("c_send_fare");
            } else {
              navigate("c_send_fare");
            }
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.headerBadge}>
            <ShieldCheck size={12} color="#0D7A53" />
            <Text style={styles.headerBadgeText}>Pembayaran Aman Terenkripsi</Text>
          </View>
          <Text style={styles.headerTitle}>
            {isOrderActive ? "Selesaikan Pembayaran" : "Pilih Metode Pembayaran"}
          </Text>
          <Text style={styles.headerSub}>
            {isOrderActive ? `Order #${orderCode}` : "Transaksi aman & terverifikasi resmi"}
          </Text>
        </View>
      </View>

      {/* Toast */}
      {toastText && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={16} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastText}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* STATE 1: SELECTION (Order not created yet, matching Marketplace) */}
        {/* ========================================================= */}
        {!isOrderActive && (
          <View>
            {/* Section 1: Metode Pembayaran */}
            <View style={styles.checkoutSectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>1</Text>
              </View>
              <View>
                <Text style={styles.checkoutSectionTitle}>Metode Pembayaran</Text>
                <Text style={styles.checkoutSectionHint}>Pilih metode pembayaran yang tersedia</Text>
              </View>
            </View>

            {/* Clickable Selected Card opening Bottom Sheet */}
            <TouchableOpacity
              style={styles.paymentSelectedCard}
              onPress={() => setPaymentModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.paymentIcon}>
                <WalletCards size={20} color="#1B7A4E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentName}>{selectedPaymentObj.name}</Text>
                <Text style={styles.paymentSub}>Ketuk untuk mengganti metode pembayaran</Text>
              </View>
              <ChevronRight size={18} color="#6B7280" />
            </TouchableOpacity>

            {/* Section 2: Ringkasan Pembayaran */}
            <View style={styles.checkoutSectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>2</Text>
              </View>
              <View>
                <Text style={styles.checkoutSectionTitle}>Ringkasan Pembayaran</Text>
                <Text style={styles.checkoutSectionHint}>Detail tarif dan biaya layanan pengiriman</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Ringkasan pembayaran</Text>
              <SummaryRow
                label="Tarif Pengiriman"
                value={rp(fareEstimate?.baseFare || totalAmount)}
              />
              <SummaryRow
                label="Biaya Layanan"
                value={rp(fareEstimate?.serviceFee || 0)}
              />
              {Boolean(fareEstimate && fareEstimate.discount) && (
                <SummaryRow
                  label="Diskon Promo"
                  value={`- ${rp(fareEstimate?.discount || 0)}`}
                  green
                />
              )}
              <View style={styles.summaryDivider} />
              <SummaryRow
                label="Total pembayaran"
                value={rp(totalAmount)}
                strong
              />
            </View>

            <View style={styles.secureNote}>
              <ShieldCheck size={16} color="#1B7A4E" />
              <Text style={styles.secureNoteText}>
                {selectedMethod === "CASH"
                  ? "Pesanan COD dibayar tunai saat driver menjemput atau mengantar paket."
                  : `Pembayaran ${selectedPaymentObj.name} diverifikasi instan secara otomatis.`}
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STATE 2: ACTIVE DIGITAL BILL (Order created, exactly like MarketplaceDigitalPaymentModal) */}
        {/* ========================================================= */}
        {isOrderActive && (
          <View style={styles.activeBillContainer}>
            {isPaid ? (
              /* Success Card */
              <View style={styles.paidSuccessCard}>
                <View style={styles.paidSuccessIconBg}>
                  <CheckCircle2 size={40} color="#0D7A53" />
                </View>
                <Text style={styles.paidSuccessTitle}>Pembayaran Berhasil!</Text>
                <Text style={styles.paidSuccessDesc}>
                  Dana sebesar {rp(totalAmount)} telah diverifikasi otomatis. Driver sedang dicarikan untuk pesanan Anda.
                </Text>
                <TouchableOpacity
                  style={styles.continueShoppingBtn}
                  onPress={() => navigate("c_send_searching")}
                  activeOpacity={0.88}
                >
                  <Text style={styles.continueShoppingBtnText}>Lihat Status Pencarian Driver</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
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
                    <Text style={styles.timerDigitsText}>{formatTimer(timeLeft)}</Text>
                  </View>
                </View>

                {/* Amount to Pay Card */}
                <View style={styles.amountCard}>
                  <Text style={styles.amountLabel}>Total Tagihan</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountValue}>{rp(totalAmount)}</Text>
                    <TouchableOpacity
                      style={styles.copyPill}
                      onPress={() => handleCopy(String(totalAmount), "Nominal")}
                      activeOpacity={0.7}
                    >
                      <Copy size={13} color="#0D7A53" />
                      <Text style={styles.copyPillText}>
                        {copied === "Nominal" ? "Tersalin!" : "Salin Nominal"}
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
                      onPress={() => handleCopy(qrString, "QRIS String")}
                      activeOpacity={0.7}
                    >
                      <Copy size={15} color="#0D7A53" />
                      <Text style={styles.actionBtnOutlineText}>
                        {copied === "QRIS String" ? "Kode QRIS Disalin!" : "Salin String QRIS"}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.instructionsContainer}>
                      <Text style={styles.instructionHeading}>Cara Pembayaran via QRIS:</Text>
                      <Text style={styles.instructionStep}>1. Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau E-Wallet (GoPay, OVO, DANA, ShopeePay).</Text>
                      <Text style={styles.instructionStep}>2. Pilih menu "Scan" atau "Bayar dengan QRIS".</Text>
                      <Text style={styles.instructionStep}>3. Pindai kode QR di atas atau gunakan tangkapan layar.</Text>
                      <Text style={styles.instructionStep}>4. Periksa nama merchant (GEOVERSE RANGERS) dan nominal ({rp(totalAmount)}), lalu masukkan PIN Anda.</Text>
                    </View>
                  </View>
                )}

                {/* VIRTUAL ACCOUNT SECTION */}
                {isVA && (
                  <View style={styles.vaSection}>
                    <View style={styles.vaHeader}>
                      <View style={styles.vaLogoTag}>
                        <Building2 size={16} color="#FFFFFF" />
                        <Text style={styles.vaLogoText}>{vaBankName} Virtual Account</Text>
                      </View>
                    </View>

                    <View style={styles.vaBox}>
                      <Text style={styles.vaNumberLabel}>Nomor Virtual Account:</Text>
                      <View style={styles.vaNumberRow}>
                        <Text style={styles.vaNumberValue}>{vaNumber}</Text>
                        <TouchableOpacity
                          style={styles.vaCopyBtn}
                          onPress={() => handleCopy(vaNumber.replace(/\s/g, ""), "Nomor VA")}
                          activeOpacity={0.7}
                        >
                          <Copy size={15} color="#FFFFFF" />
                          <Text style={styles.vaCopyBtnText}>
                            {copied === "Nomor VA" ? "Tersalin" : "Salin"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.vaHolderName}>
                        Nama Akun: GEOVERSE - {authAccount?.name || "CUSTOMER"}
                      </Text>
                    </View>

                    {/* Instruction Tabs */}
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
                          <Text style={styles.instructionStep}>1. Buka aplikasi m-Banking ({vaBankName}).</Text>
                          <Text style={styles.instructionStep}>2. Pilih menu Transfer &gt; Virtual Account.</Text>
                          <Text style={styles.instructionStep}>3. Masukkan nomor VA: {vaNumber}.</Text>
                          <Text style={styles.instructionStep}>4. Periksa nominal tagihan ({rp(totalAmount)}) dan konfirmasi PIN transaksi Anda.</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.instructionStep}>1. Masukkan kartu ATM dan PIN Anda di mesin ATM {vaBankName}.</Text>
                          <Text style={styles.instructionStep}>2. Pilih Transaksi Lainnya &gt; Transfer &gt; Virtual Account.</Text>
                          <Text style={styles.instructionStep}>3. Masukkan nomor Virtual Account: {vaNumber}.</Text>
                          <Text style={styles.instructionStep}>4. Konfirmasi pembayaran dan simpan bukti transaksi.</Text>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* GOPAY / E-WALLET SECTION */}
                {isGopay && (
                  <View style={styles.qrisSection}>
                    <View style={styles.qrisHeader}>
                      <View style={[styles.qrisLogoTag, { backgroundColor: "#00AED6" }]}>
                        <Text style={styles.qrisLogoText}>GoPay</Text>
                      </View>
                      <Text style={styles.qrisSubtitle}>Pembayaran Langsung E-Wallet</Text>
                    </View>
                    <Text style={styles.qrisDesc}>
                      Buka aplikasi Gojek / GoPay di perangkat Anda untuk menyelesaikan pembayaran instan sebesar {rp(totalAmount)}.
                    </Text>
                  </View>
                )}

                {/* COD / Cash Active Info */}
                {isCash && (
                  <View style={styles.amountCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Banknote size={20} color="#D97706" />
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>
                        Metode Bayar di Tempat (COD)
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#6B7280", lineHeight: 18 }}>
                      Siapkan uang pas sebesar {rp(totalAmount)} untuk diserahkan kepada driver saat serah terima barang.
                    </Text>
                    <TouchableOpacity
                      style={[styles.continueShoppingBtn, { marginTop: 14 }]}
                      onPress={() => navigate("c_send_searching")}
                    >
                      <Text style={styles.continueShoppingBtnText}>Lihat Status Pencarian Driver</Text>
                      <ChevronRight size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* DEV / SANDBOX SIMULATION HELPER */}
                {!isCash && (
                  <View style={styles.testHelperCard}>
                    <View style={styles.testHelperHeader}>
                      <Sparkles size={16} color="#0284C7" />
                      <Text style={styles.testHelperTitle}>
                        Simulasi Pembayaran Sukses (Khusus Sandbox)
                      </Text>
                    </View>
                    <Text style={styles.testHelperDesc}>
                      Klik tombol di bawah untuk menyimulasikan konfirmasi pembayaran sukses secara instan dari gateway.
                    </Text>
                    <TouchableOpacity
                      style={styles.simulateBtn}
                      onPress={handleSimulatePayment}
                      disabled={simulating}
                      activeOpacity={0.85}
                    >
                      {simulating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.simulateBtnText}>Simulasi Bayar Sekarang</Text>
                          <ChevronRight size={16} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* FIXED BOTTOM BAR (Only shown when order not created yet) */}
      {/* ========================================================= */}
      {!isOrderActive && (
        <SafeAreaBottomBar absolute style={styles.checkoutFooter}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total pembayaran</Text>
            <Text style={styles.footerTotalValue}>{rp(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.footerPayButton, creatingOrder && { opacity: 0.7 }]}
            disabled={creatingOrder}
            onPress={handleProceedOrder}
            activeOpacity={0.88}
          >
            <Text style={styles.footerPayText}>
              {creatingOrder
                ? "Memproses…"
                : selectedMethod === "CASH"
                ? `Buat Pesanan COD · ${rp(totalAmount)}`
                : `Lanjut Pembayaran · ${rp(totalAmount)}`}
            </Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaBottomBar>
      )}

      {/* ========================================================= */}
      {/* BOTTOM SHEET MODAL: PILIH METODE PEMBAYARAN */}
      {/* Identical to Marketplace modal */}
      {/* ========================================================= */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pilih Pembayaran</Text>
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  disabled={!method.available || creatingOrder}
                  style={[
                    styles.paymentOption,
                    isSelected && styles.paymentOptionSelected,
                    !method.available && { opacity: 0.48 },
                  ]}
                  onPress={() => {
                    setSelectedMethod(method.id);
                    setPaymentMethod(method.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.paymentIcon,
                      { backgroundColor: `${method.color}15` },
                    ]}
                  >
                    <WalletCards size={20} color={method.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentName}>{method.name}</Text>
                    <Text style={styles.paymentSub}>{method.subtitle}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setPaymentModalVisible(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.modalConfirmText}>Gunakan Metode Ini</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  headerBadgeText: {
    color: "#0D7A53",
    fontSize: 10,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  toastBox: {
    position: "absolute",
    top: 64,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },

  // Marketplace Section Headers
  checkoutSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
    marginBottom: 12,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumberText: {
    color: "#1B7A4E",
    fontSize: 11,
    fontWeight: "900",
  },
  checkoutSectionTitle: {
    color: "#10251B",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 1,
  },
  checkoutSectionHint: {
    color: "#8A9A91",
    fontSize: 10,
  },

  // Selected Payment Card (Tap to open sheet)
  paymentSelectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5EBEF",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 6,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  paymentSub: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 8,
  },
  summaryTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "#6B7280",
    fontSize: 12,
  },
  summaryValue: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryStrong: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  greenText: {
    color: "#1B7A4E",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },

  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  secureNoteText: {
    color: "#6B7280",
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },

  // Fixed Bottom Bar
  checkoutFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5EBEF",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    color: "#718096",
    fontSize: 10,
  },
  footerTotalValue: {
    color: "#10251B",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  footerPayButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerPayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  // Modal Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  paymentSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
  },
  paymentOptionSelected: {
    borderColor: "#1B7A4E",
    backgroundColor: "#F0FDF4",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  modalConfirmButton: {
    backgroundColor: "#1B7A4E",
    borderRadius: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Active Bill Styles (Matching MarketplaceDigitalPaymentModal)
  activeBillContainer: {
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
    backgroundColor: "#FFFFFF",
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

  // QRIS Section
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
  qrisDesc: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
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
    width: 220,
    height: 220,
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
  instructionsContainer: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  instructionHeading: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  instructionStep: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 4,
  },

  // Virtual Account Section
  vaSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vaHeader: {
    alignItems: "center",
    marginBottom: 14,
  },
  vaLogoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#003C93",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  vaLogoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  vaBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
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
    marginVertical: 6,
  },
  vaNumberValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  vaCopyBtn: {
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
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
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginTop: 14,
    marginBottom: 10,
  },
  instructionTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  instructionTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  instructionTabText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  instructionTabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },

  // Sandbox Dev Helper
  testHelperCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  testHelperHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  testHelperTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284C7",
  },
  testHelperDesc: {
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 16,
    marginBottom: 12,
  },
  simulateBtn: {
    backgroundColor: "#0284C7",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  simulateBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Paid Success Card
  paidSuccessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  paidSuccessIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paidSuccessTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  paidSuccessDesc: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  continueShoppingBtn: {
    backgroundColor: "#1B7A4E",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
  },
  continueShoppingBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
