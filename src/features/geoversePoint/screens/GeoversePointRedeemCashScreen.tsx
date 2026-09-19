import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Banknote,
  Building,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useGeoversePoint } from "../hooks/useGeoversePoint";
import { createRedemption } from "../services/geoversePointService";
import { WITHDRAWAL_CHANNELS } from "../constants/pointConstants";

export const GeoversePointRedeemCashScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    wallet,
    refreshWallet,
    refreshLedger,
    refreshRedemptions,
    config,
    formatPoint,
    formatRupiah,
    pointToRupiah,
  } = useGeoversePoint();

  const balancePoints = wallet?.balancePoint || 0;
  const minPoints = config.minCashRedemptionPoints || 5000;

  const [pointsInput, setPointsInput] = useState<string>("10000");
  const [selectedChannel, setSelectedChannel] = useState<string>("CASH_AT_BANK");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const parsedPoints = parseInt(pointsInput.replace(/[^0-9]/g, ""), 10) || 0;
  const rupiahValue = pointToRupiah(parsedPoints);

  const presetAmounts = [5000, 10000, 20000, 50000, 100000];

  const currentChannelObj = WITHDRAWAL_CHANNELS.find((c) => c.id === selectedChannel);
  const isCashAtBank = selectedChannel === "CASH_AT_BANK";

  const handleSubmit = async () => {
    if (parsedPoints < minPoints) {
      Alert.alert(
        "Nominal Kurang",
        `Minimal penarikan adalah ${formatPoint(minPoints)} (${formatRupiah(pointToRupiah(minPoints))}).`
      );
      return;
    }

    if (parsedPoints > balancePoints) {
      Alert.alert(
        "Saldo Tidak Cukup",
        `Saldo Anda hanya ${formatPoint(balancePoints)}. Silakan masukkan nominal yang lebih kecil.`
      );
      return;
    }

    if (!isCashAtBank) {
      if (!accountNumber.trim()) {
        Alert.alert("Data Belum Lengkap", "Silakan masukkan nomor rekening atau nomor e-wallet.");
        return;
      }
      if (!accountName.trim()) {
        Alert.alert("Data Belum Lengkap", "Silakan masukkan nama pemilik rekening atau akun e-wallet.");
        return;
      }
    }

    Alert.alert(
      "Konfirmasi Pencairan Saldo",
      `Tarik ${formatPoint(parsedPoints)} menjadi ${formatRupiah(rupiahValue)} via ${currentChannelObj?.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Konfirmasi & Tarik",
          onPress: async () => {
            setSubmitting(true);
            try {
              const type =
                selectedChannel === "CASH_AT_BANK"
                  ? "CASH"
                  : selectedChannel.startsWith("B") || selectedChannel === "MANDIRI"
                  ? "BANK_TRANSFER"
                  : "E_WALLET";

              const res = await createRedemption(
                {
                  type,
                  points: parsedPoints,
                  payoutDestination: {
                    channel: selectedChannel,
                    accountNumber: isCashAtBank ? "TUNAI_BANK_SAMPAH" : accountNumber.trim(),
                    accountName: isCashAtBank ? "PENGAMBILAN_TUNAI" : accountName.trim(),
                  },
                },
                `cash-redeem-${Date.now()}`
              );

              if (res.success && res.data) {
                await Promise.all([refreshWallet(), refreshLedger(), refreshRedemptions()]);
                Alert.alert(
                  "Permintaan Pencairan Berhasil Dibuat! 🚀",
                  `Kode Pencairan: ${res.data.redemptionCode}\n\nStatus saat ini: MENUNGGU VERIFIKASI. Poin Anda telah diamankan sementara.`,
                  [
                    {
                      text: "Lihat Status",
                      onPress: () => navigate("c_point_redemption_detail", { redemptionId: res.data!._id }),
                    },
                    {
                      text: "Selesai",
                      onPress: () => navigate("c_point_home"),
                    },
                  ]
                );
              } else {
                Alert.alert("Gagal Memproses", res.message || "Terjadi kesalahan.");
              }
            } catch (err: any) {
              Alert.alert("Kesalahan", err?.message || "Gagal menghubungi server.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_point_home")}
          activeOpacity={0.7}
          accessibilityLabel="Kembali"
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Tarik Tunai / Transfer</Text>
          <Text style={styles.headerSubtitle}>Cairkan GEOVERSE Point menjadi Rupiah</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.desktopContainer,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Preview Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Saldo Poin Tersedia</Text>
              <Text style={styles.balancePoints}>{formatPoint(balancePoints)}</Text>
              <Text style={styles.balanceRupiah}>
                Setara {formatRupiah(pointToRupiah(balancePoints))}
              </Text>
            </View>
          </View>

          {/* Nominal Input Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Nominal Pencairan</Text>
            <Text style={styles.sectionSubtitle}>
              Minimal penarikan {formatPoint(minPoints)} (1 Pts = Rp 1)
            </Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.ptsPrefix}>Pts</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={pointsInput}
                onChangeText={(val) => setPointsInput(val.replace(/[^0-9]/g, ""))}
                placeholder="5000"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Rupiah Conversion Output */}
            <View style={styles.conversionBox}>
              <Text style={styles.conversionLabel}>Uang yang akan diterima:</Text>
              <Text style={styles.conversionValue}>{formatRupiah(rupiahValue)}</Text>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {presetAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.presetBtn,
                    parsedPoints === amt && styles.presetBtnActive,
                  ]}
                  onPress={() => setPointsInput(String(amt))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      parsedPoints === amt && styles.presetBtnTextActive,
                    ]}
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt} Pts
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  parsedPoints === balancePoints && styles.presetBtnActive,
                ]}
                onPress={() => setPointsInput(String(balancePoints))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetBtnText,
                    parsedPoints === balancePoints && styles.presetBtnTextActive,
                  ]}
                >
                  Maksimal
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Method / Channel Selection */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Metode Pencairan</Text>
            <Text style={styles.sectionSubtitle}>
              Pilih tujuan penerimaan dana tunai atau transfer
            </Text>

            <View style={styles.channelGrid}>
              {WITHDRAWAL_CHANNELS.map((channel) => {
                const isSelected = selectedChannel === channel.id;
                return (
                  <TouchableOpacity
                    key={channel.id}
                    style={[
                      styles.channelItem,
                      isSelected && styles.channelItemActive,
                    ]}
                    onPress={() => setSelectedChannel(channel.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.channelHeader}>
                      <Text
                        style={[
                          styles.channelName,
                          isSelected && styles.channelNameActive,
                        ]}
                      >
                        {channel.name}
                      </Text>
                      {isSelected && (
                        <CheckCircle2 size={16} color="#15803D" />
                      )}
                    </View>
                    <Text style={styles.channelMin}>
                      Min. {channel.min.toLocaleString("id-ID")} Pts
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Account Details (only if not CASH_AT_BANK) */}
          {!isCashAtBank && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Tujuan Rekening / E-Wallet</Text>
              <Text style={styles.sectionSubtitle}>
                Pastikan nama dan nomor terdaftar sesuai identitas Anda
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nomor Rekening / HP E-Wallet</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Contoh: 08123456789 atau 1234567890"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Lengkap Pemilik Akun</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Nama sesuai buku tabungan / e-wallet"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          )}

          {/* Cash At Bank Guide */}
          {isCashAtBank && (
            <View style={styles.guideBox}>
              <HelpCircle size={16} color="#059669" />
              <Text style={styles.guideText}>
                Anda akan mendapatkan Kode Pencairan. Tunjukkan kode tersebut kepada petugas Bank Sampah GEOVERSE saat berkunjung untuk menerima uang tunai langsung.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (parsedPoints < minPoints || parsedPoints > balancePoints || submitting) &&
                styles.submitBtnDisabled,
            ]}
            disabled={parsedPoints < minPoints || parsedPoints > balancePoints || submitting}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                Tarik {formatRupiah(rupiahValue)} Sekarang
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  desktopContainer: {
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  balanceCard: {
    backgroundColor: "#15803D",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  balanceInfo: {
    flexDirection: "column",
  },
  balanceLabel: {
    fontSize: 11,
    color: "#DCFCE7",
    fontWeight: "600",
  },
  balancePoints: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  balanceRupiah: {
    fontSize: 12,
    color: "#A7F3D0",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  ptsPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  conversionBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  conversionLabel: {
    fontSize: 12,
    color: "#047857",
  },
  conversionValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#15803D",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#15803D",
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  presetBtnTextActive: {
    color: "#15803D",
    fontWeight: "700",
  },
  channelGrid: {
    flexDirection: "column",
    gap: 8,
  },
  channelItem: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  channelItemActive: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  channelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  channelNameActive: {
    color: "#15803D",
    fontWeight: "700",
  },
  channelMin: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  guideBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 16,
  },
  guideText: {
    flex: 1,
    fontSize: 11,
    color: "#047857",
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: "#15803D",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
