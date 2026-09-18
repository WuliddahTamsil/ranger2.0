import React, { useEffect, useState } from "react";
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
} from "react-native";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  User,
  Package,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Clock,
  Navigation,
  WalletCards,
  Check,
  X,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useSendContext } from "../../../context/SendContext";
import { SendProgressIndicator } from "../../../components/send/SendProgressIndicator";
import { estimateSendFare, createSendOrder } from "../../../services/sendService";
import { rp } from "../../../utils/formatters";
import { SafeAreaBottomBar } from "../../../components/SafeAreaBottomBar";
import { AuthAccount } from "../../auth/authTypes";

interface SendFareEstimateScreenProps extends Nav {
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

export const SendFareEstimateScreen: React.FC<SendFareEstimateScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const {
    sender,
    recipient,
    packageData,
    fareEstimate,
    setFareEstimate,
    setActiveOrder,
    paymentMethod,
    setPaymentMethod,
  } = useSendContext();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const selectedPaymentObj =
    paymentMethods.find((m) => m.id === paymentMethod) || paymentMethods[1];

  const fetchFare = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await estimateSendFare({
        pickup: sender,
        destination: recipient,
        package: packageData,
      });

      if (res.success && res.data) {
        setFareEstimate(res.data);
      } else {
        setErrorMsg(res.message || "Gagal menghitung tarif pengiriman.");
      }
    } catch (e: any) {
      setErrorMsg("Koneksi gagal. Periksa jaringan Anda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fareEstimate) {
      fetchFare();
    }
  }, []);

  const handleCheckout = async () => {
    if (!fareEstimate || submitting) return;
    setSubmitting(true);
    try {
      const idempotencyKey = `SEND-${authAccount?.id || "anon"}-${Date.now()}`;
      const payload = {
        sender,
        recipient,
        package: packageData,
        paymentMethod,
        discount: fareEstimate?.discount || 0,
        idempotencyKey,
        customerId: authAccount?.id,
      };

      const res = await createSendOrder(payload, authAccount?.id);
      if (res.success && res.data) {
        setActiveOrder(res.data);
        if (paymentMethod === "CASH") {
          navigate("c_send_searching");
        } else {
          navigate("c_send_payment");
        }
      } else {
        alert(res.message || "Gagal membuat pesanan.");
      }
    } catch (e: any) {
      alert("Terjadi kendala koneksi saat memproses pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate("c_send_package")} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Review Pengiriman</Text>
          <Text style={styles.headerSub}>Tahap 3 dari 3 pengiriman</Text>
        </View>
      </View>

      {/* Progress Indicator: 1 Rute -> 2 Barang -> 3 Review */}
      <SendProgressIndicator currentStep={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Route Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <Navigation size={16} color="#059669" />
              <Text style={styles.cardTitle}>Rute Pengantaran</Text>
            </View>
            <TouchableOpacity onPress={() => navigate("c_send")}>
              <Text style={styles.changeBtnText}>Ubah</Text>
            </TouchableOpacity>
          </View>

          {/* Pickup */}
          <View style={styles.routeItemRow}>
            <View style={styles.dotEmerald} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Lokasi Penjemputan</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>
                {sender.address}
              </Text>
            </View>
          </View>

          <View style={styles.routeConnectorLine} />

          {/* Tujuan */}
          <View style={styles.routeItemRow}>
            <View style={styles.dotRose} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Lokasi Tujuan</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>
                {recipient.address}
              </Text>
            </View>
          </View>

          {fareEstimate && (
            <View style={styles.routeMetaBadgeRow}>
              <View style={styles.metaBadge}>
                <Navigation size={12} color="#059669" />
                <Text style={styles.metaBadgeText}>{fareEstimate.distanceKm} km</Text>
              </View>
              <View style={styles.metaBadge}>
                <Clock size={12} color="#059669" />
                <Text style={styles.metaBadgeText}>~{fareEstimate.estimatedDurationMinutes} menit</Text>
              </View>
            </View>
          )}
        </View>

        {/* 2. Recipient Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <User size={16} color="#059669" />
              <Text style={styles.cardTitle}>Penerima Paket</Text>
            </View>
            <TouchableOpacity onPress={() => navigate("c_send_package")}>
              <Text style={styles.changeBtnText}>Ubah</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nama:</Text>
            <Text style={styles.infoVal}>{recipient.name || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WhatsApp:</Text>
            <Text style={styles.infoVal}>{recipient.phone || "-"}</Text>
          </View>

          {recipient.notes ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Catatan:</Text>
              <Text style={[styles.infoVal, { flex: 1, textAlign: "right" }]}>{recipient.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* 3. Package Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <Package size={16} color="#059669" />
              <Text style={styles.cardTitle}>Detail Paket</Text>
            </View>
            <TouchableOpacity onPress={() => navigate("c_send_package")}>
              <Text style={styles.changeBtnText}>Ubah</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nama Barang:</Text>
            <Text style={styles.infoVal}>{packageData.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kategori:</Text>
            <Text style={styles.infoVal}>{packageData.category}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Berat:</Text>
            <Text style={styles.infoVal}>{packageData.weightKg} kg</Text>
          </View>

          {packageData.fragile && (
            <View style={styles.fragileBadgeRow}>
              <ShieldCheck size={14} color="#059669" />
              <Text style={styles.fragileBadgeText}>Dilindungi proteksi barang mudah pecah</Text>
            </View>
          )}

          {packageData.photoUrls && packageData.photoUrls.length > 0 && (
            <View style={styles.thumbRow}>
              {packageData.photoUrls.map((url, idx) => (
                <Image key={idx} source={{ uri: url }} style={styles.photoMiniThumb} />
              ))}
            </View>
          )}
        </View>

        {/* 4. Metode Pembayaran (Marketplace UI Layout) */}
        <View style={styles.checkoutSectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>4</Text></View>
          <View>
            <Text style={styles.checkoutSectionTitle}>Metode Pembayaran</Text>
            <Text style={styles.checkoutSectionHint}>Pilih metode pembayaran yang tersedia</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.paymentSelectedCard}
          onPress={() => setPaymentModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.paymentIcon, { backgroundColor: `${selectedPaymentObj.color}15` }]}>
            <WalletCards size={20} color={selectedPaymentObj.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.paymentName}>{selectedPaymentObj.name}</Text>
            <Text style={styles.paymentSub}>Ketuk untuk mengganti metode pembayaran</Text>
          </View>
          <ChevronRight size={18} color="#6B7280" />
        </TouchableOpacity>

        {/* 5. Fare Breakdown Card */}
        <View style={styles.checkoutSectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>5</Text></View>
          <View>
            <Text style={styles.checkoutSectionTitle}>Rincian Biaya Pengiriman</Text>
            <Text style={styles.checkoutSectionHint}>Tarif resmi terverifikasi server GEOVERSE</Text>
          </View>
        </View>
        <View style={styles.card}>
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.loadingText}>Menghitung tarif resmi dari server...</Text>
            </View>
          )}

          {errorMsg && !loading && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchFare}>
                <RefreshCw size={13} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          )}

          {fareEstimate && !loading && (
            <View style={{ marginTop: 2 }}>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Biaya Dasar ({fareEstimate.distanceKm <= 2 ? "0-2 km" : "2 km pertama"})</Text>
                <Text style={styles.fareVal}>{rp(fareEstimate.baseFare)}</Text>
              </View>

              {fareEstimate.distanceFare > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Biaya Jarak Tambahan</Text>
                  <Text style={styles.fareVal}>{rp(fareEstimate.distanceFare)}</Text>
                </View>
              )}

              {fareEstimate.weightFare > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Biaya Berat ({packageData.weightKg} kg)</Text>
                  <Text style={styles.fareVal}>{rp(fareEstimate.weightFare)}</Text>
                </View>
              )}

              {fareEstimate.fragileFee > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Biaya Proteksi Fragile</Text>
                  <Text style={styles.fareVal}>{rp(fareEstimate.fragileFee)}</Text>
                </View>
              )}

              {fareEstimate.insuranceFee > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Premi Asuransi Barang</Text>
                  <Text style={styles.fareVal}>{rp(fareEstimate.insuranceFee)}</Text>
                </View>
              )}

              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Biaya Layanan Aplikasi</Text>
                <Text style={styles.fareVal}>{rp(fareEstimate.serviceFee)}</Text>
              </View>

              <View style={styles.fareDivider} />

              <View style={styles.fareTotalRow}>
                <Text style={styles.fareTotalLabel}>Total Pembayaran</Text>
                <Text style={styles.fareTotalVal}>{rp(fareEstimate.finalFare)}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.secureNote}>
          <ShieldCheck size={16} color="#1B7A4E" />
          <Text style={styles.secureNoteText}>
            {paymentMethod === "CASH"
              ? "Pesanan COD/Tunai dibayar langsung ke driver saat paket dijemput atau diantar."
              : `Pembayaran ${selectedPaymentObj.name} diverifikasi instan secara otomatis.`}
          </Text>
        </View>
      </ScrollView>

      {/* Checkout Footer matching Marketplace */}
      <SafeAreaBottomBar absolute style={styles.checkoutFooter}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total pembayaran</Text>
          <Text style={styles.footerTotalValue}>{rp(fareEstimate?.finalFare || 0)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.footerPayButton,
            (!fareEstimate || loading || submitting) && { opacity: 0.7 },
          ]}
          disabled={!fareEstimate || loading || submitting}
          onPress={handleCheckout}
          activeOpacity={0.88}
        >
          <Text style={styles.footerPayText}>
            {submitting
              ? "Memproses…"
              : paymentMethod === "CASH"
              ? `Buat Pesanan · ${rp(fareEstimate?.finalFare || 0)}`
              : `Lanjut Pembayaran · ${rp(fareEstimate?.finalFare || 0)}`}
          </Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaBottomBar>

      {/* Payment Selection Modal matching Marketplace */}
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
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            {paymentMethods.map((method) => {
              const selected = paymentMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  disabled={!method.available || submitting}
                  style={[
                    styles.paymentOption,
                    selected && styles.paymentOptionSelected,
                    !method.available && { opacity: 0.48 },
                  ]}
                  onPress={() => {
                    setPaymentMethod(method.id);
                  }}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: `${method.color}15` }]}>
                    <WalletCards size={20} color={method.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentName}>{method.name}</Text>
                    <Text style={styles.paymentSub}>{method.subtitle}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.modalConfirmButton, submitting && { opacity: 0.65 }]}
              disabled={submitting}
              onPress={() => setPaymentModalVisible(false)}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
  },
  routeItemRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  dotEmerald: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#059669",
    marginTop: 3,
  },
  dotRose: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E11D48",
    marginTop: 3,
  },
  routeConnectorLine: {
    width: 2,
    height: 16,
    backgroundColor: "#E2E8F0",
    marginLeft: 4,
    marginVertical: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  routeAddress: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 1,
  },
  routeMetaBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  fragileBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  fragileBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  photoMiniThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },

  // Fare
  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
  },
  errorBox: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  fareLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  fareVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  fareDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  fareTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  fareTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#059669",
  },

  // Marketplace Payment UI Layout
  checkoutSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 8,
    marginBottom: 9,
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
    marginTop: 0,
    marginBottom: 1,
  },
  checkoutSectionHint: {
    color: "#8A9A91",
    fontSize: 10,
  },
  paymentSelectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5EBEF",
    marginBottom: 14,
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
    marginTop: 3,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  paymentSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 15,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
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
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
