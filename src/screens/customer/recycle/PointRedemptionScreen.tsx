import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Sparkles,
  Ticket,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Store,
  Bike,
  Package,
  Wind,
  Coffee,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import {
  getAvailableVouchers,
  createPointRedemption,
} from "../../../services/recycleService";
import { VoucherUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

type RedeemTab = "VOUCHERS" | "CASH";

const CASH_AMOUNTS = [10000, 25000, 50000, 100000, 250000];

export const PointRedemptionScreen: React.FC<Nav> = ({ navigate }) => {
  const { wallet, refreshWallet } = useRecycle();
  const [activeTab, setActiveTab] = useState<RedeemTab>("VOUCHERS");
  const [vouchers, setVouchers] = useState<VoucherUI[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  // Cash / Payout Form states
  const [selectedCashAmount, setSelectedCashAmount] = useState<number>(10000);
  const [payoutChannel, setPayoutChannel] = useState<"CASH" | "BANK_TRANSFER" | "E_WALLET">("CASH");
  const [channelName, setChannelName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const balance = wallet?.balancePoint || 0;

  useEffect(() => {
    let active = true;
    setLoadingVouchers(true);
    getAvailableVouchers()
      .then((res) => {
        if (!active) return;
        if (res.success && Array.isArray(res.data)) {
          setVouchers(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoadingVouchers(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleClaimVoucher = async (voucher: VoucherUI) => {
    if (balance < voucher.pointsCost) {
      Alert.alert(
        "Poin Kurang",
        `Anda membutuhkan ${voucher.pointsCost.toLocaleString("id-ID")} Points untuk menukar voucher ini. Saldo Anda saat ini: ${balance.toLocaleString("id-ID")} Points.`
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Penukaran Voucher",
      `Gunakan ${voucher.pointsCost.toLocaleString("id-ID")} Points untuk menukar "${voucher.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Tukar",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await createPointRedemption(
                {
                  type: "VOUCHER",
                  points: voucher.pointsCost,
                  voucherId: voucher._id,
                },
                `redeem_voucher_${voucher._id}_${Date.now()}`
              );

              if (res.success) {
                await refreshWallet();
                setSuccessMessage(`Voucher "${voucher.title}" berhasil ditukarkan dan siap digunakan saat checkout!`);
                setSuccessModalVisible(true);
              } else {
                Alert.alert("Gagal", res.message || "Gagal menukarkan voucher.");
              }
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Terjadi kendala jaringan.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRedeemCash = async () => {
    if (balance < selectedCashAmount) {
      Alert.alert(
        "Poin Kurang",
        `Saldo Anda (${balance.toLocaleString("id-ID")} Points) tidak mencukupi untuk penukaran senilai Rp ${selectedCashAmount.toLocaleString("id-ID")}.`
      );
      return;
    }

    if (payoutChannel !== "CASH" && (!accountNumber.trim() || !accountName.trim())) {
      Alert.alert("Data Diperlukan", "Masukkan nomor rekening/e-wallet dan nama pemilik.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        type: payoutChannel,
        points: selectedCashAmount,
      };

      if (payoutChannel !== "CASH") {
        payload.payoutDestination = {
          channel: channelName,
          accountNumber,
          accountName,
        };
      }

      const res = await createPointRedemption(
        payload,
        `redeem_cash_${Date.now()}`
      );

      if (res.success) {
        await refreshWallet();
        setSuccessMessage(
          payoutChannel === "CASH"
            ? "Permohonan tarik tunai berhasil dibuat! Silakan tunjukkan kode penukaran ke petugas Bank Sampah."
            : `Permohonan transfer senilai Rp ${selectedCashAmount.toLocaleString("id-ID")} ke ${channelName} berhasil diajukan dan sedang diproses!`
        );
        setSuccessModalVisible(true);
      } else {
        Alert.alert("Gagal", res.message || "Gagal memproses penukaran.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "MARKETPLACE":
        return <Store size={18} color="#15803D" />;
      case "RIDE":
        return <Bike size={18} color="#15803D" />;
      case "SEND":
        return <Package size={18} color="#B45309" />;
      case "LAUNDRY":
        return <Wind size={18} color="#0284C7" />;
      case "CATERING":
        return <Coffee size={18} color="#EA580C" />;
      default:
        return <Sparkles size={18} color="#15803D" />;
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_recycle_wallet")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Tukar GEOVERSE Point</Text>
          <Text style={styles.headerSub}>Voucher Belanja & Penarikan Rupiah</Text>
        </View>
      </View>

      {/* Balance Bar */}
      <View style={styles.balanceBar}>
        <View style={styles.balanceLeft}>
          <Text style={styles.balanceLabel}>Point Tersedia</Text>
          <View style={styles.balanceRow}>
            <Sparkles size={20} color="#FBBF24" />
            <Text style={styles.balanceVal}>{balance.toLocaleString("id-ID")}</Text>
            <Text style={styles.balanceUnit}>Pts</Text>
          </View>
        </View>
        <View style={styles.balanceRight}>
          <Text style={styles.rupiahEq}>≈ {rp(balance)}</Text>
          <Text style={styles.rateNote}>1 Point = Rp 1</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "VOUCHERS" && styles.tabBtnActive]}
          onPress={() => setActiveTab("VOUCHERS")}
          activeOpacity={0.8}
        >
          <Ticket size={16} color={activeTab === "VOUCHERS" ? "#FFFFFF" : "#4B5563"} />
          <Text style={[styles.tabBtnText, activeTab === "VOUCHERS" && styles.tabBtnTextActive]}>
            Voucher Belanja
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "CASH" && styles.tabBtnActive]}
          onPress={() => setActiveTab("CASH")}
          activeOpacity={0.8}
        >
          <Banknote size={16} color={activeTab === "CASH" ? "#FFFFFF" : "#4B5563"} />
          <Text style={[styles.tabBtnText, activeTab === "CASH" && styles.tabBtnTextActive]}>
            Tukar Rupiah
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === "VOUCHERS" ? (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Katalog Voucher GEOVERSE</Text>
              <Text style={styles.tabIntroSub}>
                Dapat digunakan langsung di Kanyaah Mart, Ride, Send, Catering, dan Laundry.
              </Text>
            </View>

            {loadingVouchers ? (
              <ActivityIndicator size="large" color="#15803D" style={{ marginTop: 30 }} />
            ) : vouchers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ticket size={36} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Belum ada voucher tersedia</Text>
              </View>
            ) : (
              vouchers.map((v) => (
                <View key={v._id} style={styles.voucherCard}>
                  <View style={styles.voucherLeft}>
                    <View style={styles.serviceIconCircle}>
                      {getServiceIcon(v.service)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.serviceTag}>
                        <Text style={styles.serviceTagText}>{v.service}</Text>
                      </View>
                      <Text style={styles.voucherTitle}>{v.title}</Text>
                      <Text style={styles.voucherDesc}>{v.description}</Text>
                      <Text style={styles.voucherMin}>
                        Min. belanja: {rp(v.minTransaction || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.voucherRight}>
                    <Text style={styles.voucherCost}>
                      {v.pointsCost.toLocaleString("id-ID")}
                    </Text>
                    <Text style={styles.voucherCostUnit}>Points</Text>

                    <TouchableOpacity
                      style={[
                        styles.btnClaim,
                        balance < v.pointsCost && styles.btnClaimDisabled,
                      ]}
                      onPress={() => handleClaimVoucher(v)}
                      disabled={submitting || balance < v.pointsCost}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnClaimText}>Tukar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          /* Tukar Rupiah Form */
          <>
            {/* Amount Presets */}
            <Text style={styles.sectionTitle}>Pilih Nominal Penarikan</Text>
            <View style={styles.presetsGrid}>
              {CASH_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.presetCard,
                    selectedCashAmount === amt && styles.presetCardActive,
                  ]}
                  onPress={() => setSelectedCashAmount(amt)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.presetLabel,
                      selectedCashAmount === amt && styles.presetLabelActive,
                    ]}
                  >
                    {rp(amt)}
                  </Text>
                  <Text
                    style={[
                      styles.presetPoints,
                      selectedCashAmount === amt && styles.presetPointsActive,
                    ]}
                  >
                    {amt.toLocaleString("id-ID")} Points
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payout Channel Options */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Metode Pencairan</Text>
            <View style={styles.channelRow}>
              <TouchableOpacity
                style={[styles.channelCard, payoutChannel === "CASH" && styles.channelCardActive]}
                onPress={() => setPayoutChannel("CASH")}
                activeOpacity={0.8}
              >
                <Banknote size={20} color={payoutChannel === "CASH" ? "#15803D" : "#6B7280"} />
                <Text
                  style={[styles.channelText, payoutChannel === "CASH" && styles.channelTextActive]}
                >
                  Tunai Bank Sampah
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.channelCard,
                  payoutChannel === "BANK_TRANSFER" && styles.channelCardActive,
                ]}
                onPress={() => setPayoutChannel("BANK_TRANSFER")}
                activeOpacity={0.8}
              >
                <Building2 size={20} color={payoutChannel === "BANK_TRANSFER" ? "#15803D" : "#6B7280"} />
                <Text
                  style={[
                    styles.channelText,
                    payoutChannel === "BANK_TRANSFER" && styles.channelTextActive,
                  ]}
                >
                  Transfer Bank
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.channelCard,
                  payoutChannel === "E_WALLET" && styles.channelCardActive,
                ]}
                onPress={() => setPayoutChannel("E_WALLET")}
                activeOpacity={0.8}
              >
                <Smartphone size={20} color={payoutChannel === "E_WALLET" ? "#15803D" : "#6B7280"} />
                <Text
                  style={[styles.channelText, payoutChannel === "E_WALLET" && styles.channelTextActive]}
                >
                  E-Wallet
                </Text>
              </TouchableOpacity>
            </View>

            {/* If Bank or E-Wallet -> Destination Fields */}
            {payoutChannel !== "CASH" && (
              <View style={styles.payoutFormCard}>
                <Text style={styles.inputLabel}>
                  {payoutChannel === "BANK_TRANSFER" ? "Nama Bank" : "Provider E-Wallet"}
                </Text>
                <View style={styles.providerChips}>
                  {(payoutChannel === "BANK_TRANSFER"
                    ? ["BCA", "Mandiri", "BRI", "BNI"]
                    : ["GoPay", "OVO", "Dana", "ShopeePay"]
                  ).map((ch) => (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.providerChip,
                        channelName === ch && styles.providerChipActive,
                      ]}
                      onPress={() => setChannelName(ch)}
                    >
                      <Text
                        style={[
                          styles.providerChipText,
                          channelName === ch && styles.providerChipTextActive,
                        ]}
                      >
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>
                  {payoutChannel === "BANK_TRANSFER" ? "Nomor Rekening" : "Nomor HP / Akun"}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: 1234567890"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                />

                <Text style={styles.inputLabel}>Nama Pemilik Rekening / Akun</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nama sesuai KTP/rekening"
                  placeholderTextColor="#9CA3AF"
                  value={accountName}
                  onChangeText={setAccountName}
                />
              </View>
            )}

            {/* Redemption Summary Card */}
            <View style={styles.redemptionSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Nominal Pencairan:</Text>
                <Text style={styles.summaryVal}>{rp(selectedCashAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Admin:</Text>
                <Text style={[styles.summaryVal, { color: "#15803D" }]}>Rp 0 (Gratis)</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimasi Waktu:</Text>
                <Text style={styles.summaryVal}>
                  {payoutChannel === "CASH" ? "Instan di Bank Sampah" : "Maks 1x24 Jam Kerja"}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Poin Digunakan:</Text>
                <Text style={styles.summaryTotalVal}>
                  -{selectedCashAmount.toLocaleString("id-ID")} Points
                </Text>
              </View>
            </View>

            {/* Action CTA */}
            <TouchableOpacity
              style={[
                styles.btnSubmitRedeem,
                (balance < selectedCashAmount || submitting) && { opacity: 0.6 },
              ]}
              onPress={handleRedeemCash}
              disabled={submitting || balance < selectedCashAmount}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnSubmitRedeemText}>
                  {balance < selectedCashAmount
                    ? "Saldo Poin Tidak Cukup"
                    : `Tarik ${rp(selectedCashAmount)} Sekarang`}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#15803D" />
            </View>
            <Text style={styles.successModalTitle}>Penukaran Berhasil!</Text>
            <Text style={styles.successModalSub}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.btnDone}
              onPress={() => {
                setSuccessModalVisible(false);
                navigate("c_recycle_wallet");
              }}
            >
              <Text style={styles.btnDoneText}>Lihat Dompet Poin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  headerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  balanceBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  balanceLeft: {},
  balanceLabel: {
    fontSize: 11,
    color: "#A7F3D0",
    fontWeight: "600",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  balanceVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  balanceUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FDE047",
  },
  balanceRight: {
    alignItems: "flex-end",
  },
  rupiahEq: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  rateNote: {
    fontSize: 10,
    color: "#A7F3D0",
    marginTop: 2,
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  tabBtnActive: {
    backgroundColor: "#15803D",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabIntro: {
    marginBottom: 14,
  },
  tabIntroTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  tabIntroSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  voucherLeft: {
    flexDirection: "row",
    flex: 1,
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  serviceTag: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  serviceTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4B5563",
  },
  voucherTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  voucherDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15,
  },
  voucherMin: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  voucherRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  voucherCost: {
    fontSize: 15,
    fontWeight: "900",
    color: "#CA8A04",
  },
  voucherCostUnit: {
    fontSize: 10,
    color: "#6B7280",
  },
  btnClaim: {
    backgroundColor: "#15803D",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 6,
  },
  btnClaimDisabled: {
    backgroundColor: "#9CA3AF",
  },
  btnClaimText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  presetCard: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  presetCardActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  presetLabelActive: {
    color: "#15803D",
  },
  presetPoints: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  presetPointsActive: {
    color: "#15803D",
    fontWeight: "600",
  },
  channelRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  channelCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  channelCardActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  channelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    textAlign: "center",
  },
  channelTextActive: {
    color: "#15803D",
  },
  payoutFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
    marginTop: 8,
  },
  providerChips: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  providerChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  providerChipActive: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  providerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  providerChipTextActive: {
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
  },
  redemptionSummaryCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#4B5563",
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#DCFCE7",
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#854D0E",
  },
  summaryTotalVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#DC2626",
  },
  btnSubmitRedeem: {
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnSubmitRedeemText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
  },
  successModalSub: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    marginVertical: 12,
  },
  btnDone: {
    backgroundColor: "#15803D",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  btnDoneText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
  },
});
