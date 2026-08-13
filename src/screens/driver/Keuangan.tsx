import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Coins,
  History,
  X,
  CheckCircle2,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";

export interface TransactionRecord {
  id: string;
  type: "in" | "out";
  title: string;
  description: string;
  amount: number;
  time: string;
  status: "Sukses" | "Diproses" | "Gagal";
}

interface KeuanganProps {
  balance: number;
  setBalance: (bal: number) => void;
  transactions: TransactionRecord[];
  setTransactions: (txs: TransactionRecord[]) => void;
}

export const Keuangan: React.FC<KeuanganProps> = ({
  balance,
  setBalance,
  transactions,
  setTransactions,
}) => {
  // Modal states
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

  // Form states
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState<"bank" | "gopay" | "ovo" | "dana">("bank");

  const [drawAmount, setDrawAmount] = useState("");
  const [drawBank, setDrawBank] = useState("");
  const [drawAccNo, setDrawAccNo] = useState("");
  const [drawHolder, setDrawHolder] = useState("");

  const handleTopup = () => {
    const amountNum = parseInt(topupAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Nominal Top Up harus lebih dari 0.");
      return;
    }
    
    // Add to balance
    setBalance(balance + amountNum);
    
    // Log transaction
    const newTx: TransactionRecord = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: "in",
      title: "Top Up Saldo",
      description: `Via ${topupMethod.toUpperCase()}`,
      amount: amountNum,
      time: "Hari ini, Baru saja",
      status: "Sukses",
    };
    setTransactions([newTx, ...transactions]);

    setTopupModalVisible(false);
    setTopupAmount("");
    Alert.alert("Sukses", `Top Up sebesar ${rp(amountNum)} berhasil ditambahkan.`);
  };

  const handleWithdraw = () => {
    const amountNum = parseInt(drawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Nominal penarikan harus lebih dari 0.");
      return;
    }
    if (amountNum > balance) {
      Alert.alert("Error", "Saldo tidak mencukupi untuk penarikan.");
      return;
    }
    if (drawBank.trim() === "" || drawAccNo.trim() === "" || drawHolder.trim() === "") {
      Alert.alert("Error", "Mohon lengkapi semua kolom rekening tujuan.");
      return;
    }

    // Deduct from balance
    setBalance(balance - amountNum);

    // Log transaction
    const newTx: TransactionRecord = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: "out",
      title: "Tarik Saldo Driver",
      description: `Ke ${drawBank.toUpperCase()} (${drawAccNo})`,
      amount: amountNum,
      time: "Hari ini, Baru saja",
      status: "Diproses",
    };
    setTransactions([newTx, ...transactions]);

    setWithdrawModalVisible(false);
    setDrawAmount("");
    setDrawBank("");
    setDrawAccNo("");
    setDrawHolder("");

    Alert.alert(
      "Sukses",
      `Pengajuan penarikan sebesar ${rp(amountNum)} sedang diproses oleh admin.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Dompet Keuangan</Text>
        <Text style={styles.subtitle}>Kelola saldo, penarikan pendapatan, dan top up deposit.</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SALDO TERSEDIA</Text>
          <Text style={styles.balanceValue}>{rp(balance)}</Text>
          
          <View style={styles.balanceActionsRow}>
            <TouchableOpacity 
              style={styles.balanceBtn}
              onPress={() => setTopupModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#1B7A4E" />
              <Text style={styles.balanceBtnText}>Top Up</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.balanceBtn, styles.balanceBtnSolid]}
              onPress={() => setWithdrawModalVisible(true)}
              activeOpacity={0.8}
            >
              <Coins size={16} color="#FFFFFF" />
              <Text style={[styles.balanceBtnText, styles.balanceBtnTextSolid]}>Tarik Saldo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mutation History Title */}
        <View style={styles.sectionHeader}>
          <History size={18} color="#1B7A4E" />
          <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
        </View>

        {/* Transaction Mutasi List */}
        <View style={styles.mutationCardGroup}>
          {transactions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Wallet size={24} color="#9CA3AF" />
              <Text style={styles.emptyHistoryText}>Belum ada riwayat transaksi</Text>
              <Text style={styles.emptyHistorySub}>Setiap penambahan atau pemotongan saldo akan muncul di sini.</Text>
            </View>
          ) : (
            transactions.map((record, index) => {
              const isIn = record.type === "in";
              const isProcessing = record.status === "Diproses";
              const statusColor = isProcessing ? "#D97706" : isIn ? "#1B7A4E" : "#111827";
              const sign = isIn ? "+" : "-";

              return (
                <View key={record.id}>
                  {index > 0 && <View style={styles.cardDivider} />}
                  <View style={styles.historyRow}>
                    <View style={styles.iconIndicatorCol}>
                      <View style={[styles.indicatorIconBg, { backgroundColor: isIn ? "#E8F5EE" : "#F3F4F6" }]}>
                        {isIn ? (
                          <ArrowDownLeft size={16} color="#1B7A4E" />
                        ) : (
                          <ArrowUpRight size={16} color="#4B5563" />
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>{record.title}</Text>
                      <Text style={styles.historySub}>
                        {record.description} · {record.time}
                      </Text>
                      {isProcessing && (
                        <View style={styles.processingBadge}>
                          <Text style={styles.processingBadgeText}>{record.status}</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.historyAmount, { color: statusColor }]}>
                      {sign} {rp(record.amount)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 1. Top Up Modal */}
      <Modal visible={topupModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Top Up Deposit</Text>
              <TouchableOpacity onPress={() => setTopupModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Pilih Nominal Top Up</Text>
              <View style={styles.presetsRow}>
                {["50000", "100000", "200000", "500000"].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={styles.presetCard}
                    onPress={() => setTopupAmount(preset)}
                  >
                    <Text style={styles.presetCardText}>{rp(parseInt(preset))}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Masukkan Nominal Kustom</Text>
              <TextInput
                style={styles.textInput}
                value={topupAmount}
                onChangeText={setTopupAmount}
                placeholder="Contoh: 150000"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Metode Pembayaran</Text>
              <View style={styles.methodsRow}>
                {(["bank", "gopay", "ovo", "dana"] as const).map((method) => {
                  const selected = topupMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodBtn,
                        selected ? styles.methodBtnSelected : styles.methodBtnUnselected,
                      ]}
                      onPress={() => setTopupMethod(method)}
                    >
                      <Text
                        style={[
                          styles.methodBtnText,
                          selected ? styles.methodBtnTextSelected : styles.methodBtnTextUnselected,
                        ]}
                      >
                        {method.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setTopupModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleTopup}
                >
                  <Text style={styles.sheetBtnTextSolid}>Top Up</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Withdraw Modal */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Tarik Saldo Dompet</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.balanceBanner}>
                <Wallet size={18} color="#1B7A4E" />
                <Text style={styles.balanceBannerLabel}>Saldo tersedia</Text>
                <Text style={styles.balanceBannerValue}>{rp(balance)}</Text>
              </View>

              <Text style={styles.inputLabel}>Jumlah Penarikan</Text>
              <TextInput
                style={styles.textInput}
                value={drawAmount}
                onChangeText={setDrawAmount}
                placeholder="Masukkan nominal"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Nama Bank Penerima</Text>
              <TextInput
                style={styles.textInput}
                value={drawBank}
                onChangeText={setDrawBank}
                placeholder="Contoh: BCA, Mandiri, BRI"
              />

              <Text style={styles.inputLabel}>Nomor Rekening Penerima</Text>
              <TextInput
                style={styles.textInput}
                value={drawAccNo}
                onChangeText={setDrawAccNo}
                placeholder="Nomor Rekening"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Nama Lengkap Pemilik Rekening</Text>
              <TextInput
                style={styles.textInput}
                value={drawHolder}
                onChangeText={setDrawHolder}
                placeholder="Nama Pemilik Rekening"
              />

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setWithdrawModalVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleWithdraw}
                >
                  <Text style={styles.sheetBtnTextSolid}>Tarik Dana</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1B7A4E",
    marginTop: 8,
  },
  balanceActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  balanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#1B7A4E",
    borderWidth: 1.5,
    borderRadius: 14,
    flex: 1,
    height: 44,
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  balanceBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  balanceBtnText: {
    color: "#1B7A4E",
    fontSize: 13,
    fontWeight: "800",
  },
  balanceBtnTextSolid: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  mutationCardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 10,
  },
  emptyHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  emptyHistorySub: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  iconIndicatorCol: {
    marginRight: 12,
  },
  indicatorIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  historySub: {
    fontSize: 11,
    color: "#6B7280",
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  processingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  processingBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#D97706",
  },
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  formContainer: {
    maxHeight: 380,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  presetCard: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    width: "48%",
  },
  presetCardText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },
  methodsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  methodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    alignItems: "center",
  },
  methodBtnSelected: {
    backgroundColor: "#E8F5EE",
    borderColor: "#1B7A4E",
  },
  methodBtnUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  methodBtnTextSelected: {
    color: "#1B7A4E",
  },
  methodBtnTextUnselected: {
    color: "#374151",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnOutline: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sheetBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  sheetBtnTextOutline: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "800",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  balanceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 9,
  },
  balanceBannerLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#1B7A4E",
  },
  balanceBannerValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  switchList: {
    gap: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  switchRowInfo: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  switchDesc: {
    fontSize: 11,
    color: "#6B7280",
  },
  sheetBtnClose: {
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  sheetBtnCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
