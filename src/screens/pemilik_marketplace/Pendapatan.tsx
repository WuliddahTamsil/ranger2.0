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
  CalendarDays,
  CalendarRange,
  TrendingUp,
  ShoppingBag,
  PackageCheck,
  History,
  Receipt,
  X,
  ChevronDown,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";

interface WithdrawalRecord {
  id: string;
  amount: number;
  method: string;
  destination: string;
  createdAt: string;
  status: "Diproses" | "Sukses" | "Gagal";
}

interface PendapatanProps {
  orders: any[];
  storeName: string;
  withdrawals: WithdrawalRecord[];
  setWithdrawals: (w: WithdrawalRecord[]) => void;
}

export const Pendapatan: React.FC<PendapatanProps> = ({
  orders,
  storeName,
  withdrawals,
  setWithdrawals,
}) => {
  const [period, setPeriod] = useState<"7 hari" | "30 hari" | "Bulan ini">("7 hari");
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [periodDropdownVisible, setPeriodDropdownVisible] = useState(false);

  // Form states for withdrawal
  const [drawAmount, setDrawAmount] = useState("");
  const [drawMethod, setDrawMethod] = useState<"bank" | "gopay" | "ovo" | "dana">("bank");
  const [bankName, setBankName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accName, setAccName] = useState("");

  // Calculate stats based on orders
  const completedOrders = orders.filter((o) => o.status === "Selesai");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const completedOrderCount = completedOrders.length;

  const todayOrders = orders.filter((o) => o.time !== ""); // simple mock: all are today
  const todayRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0); // mock today revenue
  const weekRevenue = Math.round(totalRevenue * 1.0);
  const monthRevenue = Math.round(totalRevenue * 1.0);
  const todayOrderCount = orders.length;

  // Available Balance: total revenue - successful withdrawals
  const successfulWithdrawalsTotal = withdrawals
    .filter((w) => w.status === "Sukses")
    .reduce((sum, w) => sum + w.amount, 0);
  
  // To make demo active, let's also count processing withdrawals
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "Sukses" || w.status === "Diproses")
    .reduce((sum, w) => sum + w.amount, 0);

  const availableBalance = Math.max(0, totalRevenue - totalWithdrawn);
  const hasRevenue = totalRevenue > 0;

  // Chart data based on selected period
  const chartData = {
    "7 hari": [
      { label: "Sen", value: Math.round(totalRevenue * 0.1) },
      { label: "Sel", value: Math.round(totalRevenue * 0.15) },
      { label: "Rab", value: Math.round(totalRevenue * 0.08) },
      { label: "Kam", value: Math.round(totalRevenue * 0.22) },
      { label: "Jum", value: Math.round(totalRevenue * 0.12) },
      { label: "Sab", value: Math.round(totalRevenue * 0.25) },
      { label: "Min", value: Math.round(totalRevenue * 0.08) },
    ],
    "30 hari": [
      { label: "M1", value: Math.round(totalRevenue * 0.2) },
      { label: "M2", value: Math.round(totalRevenue * 0.3) },
      { label: "M3", value: Math.round(totalRevenue * 0.25) },
      { label: "M4", value: Math.round(totalRevenue * 0.25) },
    ],
    "Bulan ini": [
      { label: "T1", value: Math.round(totalRevenue * 0.35) },
      { label: "T2", value: Math.round(totalRevenue * 0.45) },
      { label: "T3", value: Math.round(totalRevenue * 0.2) },
    ],
  };

  const currentChartPoints = chartData[period];
  const maxChartValue = Math.max(...currentChartPoints.map((p) => p.value), 1);
  const hasChartData = currentChartPoints.some((p) => p.value > 0);

  // Submit withdrawal form
  const handleWithdrawSubmit = () => {
    const amountNum = parseInt(drawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Jumlah penarikan harus lebih dari 0.");
      return;
    }
    if (amountNum > availableBalance) {
      Alert.alert("Error", "Saldo tidak mencukupi.");
      return;
    }
    if (drawMethod === "bank" && bankName.trim() === "") {
      Alert.alert("Error", "Nama bank wajib diisi.");
      return;
    }
    if (accNumber.trim() === "") {
      Alert.alert("Error", "Nomor rekening/HP wajib diisi.");
      return;
    }
    if (accName.trim() === "") {
      Alert.alert("Error", "Nama pemilik wajib diisi.");
      return;
    }

    setWithdrawModalVisible(false);
    setConfirmModalVisible(true);
  };

  const handleConfirmWithdraw = () => {
    const amountNum = parseInt(drawAmount);
    const methodLabel =
      drawMethod === "bank"
        ? `Bank Transfer (${bankName})`
        : drawMethod.toUpperCase();

    const newRecord: WithdrawalRecord = {
      id: `WDR-${Date.now().toString().slice(-4)}`,
      amount: amountNum,
      method: methodLabel,
      destination: accNumber,
      createdAt: "Hari ini, Baru saja",
      status: "Diproses",
    };

    setWithdrawals([newRecord, ...withdrawals]);
    setConfirmModalVisible(false);
    setDrawAmount("");
    setBankName("");
    setAccNumber("");
    setAccName("");

    Alert.alert(
      "Sukses",
      "Pengajuan penarikan dicatat sebagai Diproses. Saldo dikurangi secara lokal untuk peninjauan admin."
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pendapatan</Text>
        <Text style={styles.subtitle}>Pantau performa penjualan outlet Anda.</Text>

        {/* Total Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL PENDAPATAN</Text>
          <Text style={styles.totalValue}>
            {hasRevenue ? rp(totalRevenue) : "Belum ada pendapatan"}
          </Text>
          <Text style={styles.totalCaption}>
            {hasRevenue
              ? `${completedOrderCount} order selesai tercatat`
              : "Pendapatan muncul setelah order selesai."}
          </Text>
        </View>

        {/* Summary Grid */}
        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <CalendarDays size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Hari ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {hasRevenue ? rp(todayRevenue) : "—"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <CalendarRange size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Minggu ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {hasRevenue ? rp(weekRevenue) : "—"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <TrendingUp size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Bulan ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {hasRevenue ? rp(monthRevenue) : "—"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <ShoppingBag size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Order hari ini</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {hasRevenue ? `${todayOrderCount} order` : "Belum ada"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <PackageCheck size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Order selesai</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {hasRevenue ? `${completedOrderCount} order` : "Belum ada"}
            </Text>
          </View>
          <View style={styles.gridCard}>
            <Wallet size={18} color="#1B7A4E" />
            <Text style={styles.gridLabel}>Saldo tersedia</Text>
            <Text style={styles.gridVal} numberOfLines={1}>
              {hasRevenue ? rp(availableBalance) : "—"}
            </Text>
          </View>
        </View>

        {/* Withdrawal Card */}
        <View style={styles.withdrawCard}>
          <View style={styles.withdrawIconBg}>
            <Wallet size={20} color="#1B7A4E" />
          </View>
          <View style={styles.withdrawInfo}>
            <Text style={styles.withdrawLabel}>Saldo tersedia</Text>
            <Text style={styles.withdrawValue}>{hasRevenue ? rp(availableBalance) : "—"}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              availableBalance <= 0 ? styles.withdrawBtnDisabled : null,
            ]}
            onPress={() => setWithdrawModalVisible(true)}
            disabled={availableBalance <= 0}
            activeOpacity={0.8}
          >
            <Text style={styles.withdrawBtnText}>Tarik</Text>
          </TouchableOpacity>
        </View>

        {/* Performance Chart */}
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Performa Pendapatan</Text>
          
          {/* Custom Dropdown Selector */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setPeriodDropdownVisible(!periodDropdownVisible)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownBtnText}>{period}</Text>
            <ChevronDown size={14} color="#374151" />
          </TouchableOpacity>
        </View>

        {periodDropdownVisible && (
          <View style={styles.dropdownMenu}>
            {(["7 hari", "30 hari", "Bulan ini"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownOption}
                onPress={() => {
                  setPeriod(opt);
                  setPeriodDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bar Chart Container */}
        <View style={styles.chartContainer}>
          {hasChartData ? (
            <View style={styles.chartBarsRow}>
              {currentChartPoints.map((pt, idx) => {
                const heightPercent = `${Math.max(5, (pt.value / maxChartValue) * 100)}%`;
                return (
                  <View key={idx} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: heightPercent as any }]} />
                    </View>
                    <Text style={styles.barLabel}>{pt.label}</Text>
                    <Text style={styles.barValText} numberOfLines={1}>
                      {pt.value > 1000 ? `${Math.round(pt.value / 1000)}rb` : pt.value}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <TrendingUp size={28} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Belum ada data pendapatan grafik</Text>
            </View>
          )}
        </View>

        {/* Income Breakdown */}
        <View style={styles.cardGroup}>
          <View style={styles.cardGroupHeader}>
            <Receipt size={18} color="#1B7A4E" />
            <Text style={styles.cardGroupTitle}>Ringkasan Pendapatan</Text>
          </View>
          <View style={styles.cardGroupBody}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Pendapatan transaksi</Text>
              <Text style={styles.breakdownVal}>{hasRevenue ? rp(totalRevenue) : "—"}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Biaya / komisi</Text>
              <Text style={styles.breakdownVal}>Belum tersedia</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.emphasizedText]}>Pendapatan bersih</Text>
              <Text style={[styles.breakdownVal, styles.emphasizedTextPrimary]}>
                Menunggu data komisi
              </Text>
            </View>
            <Text style={styles.breakdownNote}>
              Perhitungan komisi belum tersedia di model transaksi project ini.
            </Text>
          </View>
        </View>

        {/* Withdrawal History */}
        <View style={styles.cardGroup}>
          <View style={styles.cardGroupHeader}>
            <History size={18} color="#1B7A4E" />
            <Text style={styles.cardGroupTitle}>Riwayat Penarikan</Text>
          </View>
          <View style={styles.cardGroupBody}>
            {withdrawals.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Wallet size={24} color="#9CA3AF" />
                <Text style={styles.emptyHistoryText}>Belum ada riwayat penarikan</Text>
                <Text style={styles.emptyHistorySub}>
                  Riwayat pencairan akan muncul setelah pengajuan dibuat.
                </Text>
              </View>
            ) : (
              withdrawals.map((record, index) => {
                return (
                  <View key={record.id}>
                    {index > 0 && <View style={styles.cardDivider} />}
                    <View style={styles.historyRow}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyAmount}>{rp(record.amount)}</Text>
                        <Text style={styles.historySub}>
                          {record.method} · {record.createdAt}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, record.status === "Sukses" ? styles.statusSukses : styles.statusDiproses]}>
                        <Text style={[styles.statusBadgeText, record.status === "Sukses" ? styles.statusTextSukses : styles.statusTextDiproses]}>
                          {record.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Withdrawal Sheet Modal */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Tarik Pendapatan</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceBanner}>
              <Wallet size={18} color="#1B7A4E" />
              <Text style={styles.balanceBannerLabel}>Saldo tersedia</Text>
              <Text style={styles.balanceBannerValue}>{rp(availableBalance)}</Text>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Jumlah Penarikan</Text>
              <TextInput
                style={styles.textInput}
                value={drawAmount}
                onChangeText={setDrawAmount}
                placeholder="Masukkan nominal"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Pilih Metode Pencairan</Text>
              <View style={styles.methodsRow}>
                {(["bank", "gopay", "ovo", "dana"] as const).map((method) => {
                  const selected = drawMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodBtn,
                        selected ? styles.methodBtnSelected : styles.methodBtnUnselected,
                      ]}
                      onPress={() => setDrawMethod(method)}
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

              {drawMethod === "bank" && (
                <>
                  <Text style={styles.inputLabel}>Nama Bank</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Contoh: BCA, Mandiri"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>
                {drawMethod === "bank" ? "Nomor Rekening" : `Nomor HP ${drawMethod.toUpperCase()}`}
              </Text>
              <TextInput
                style={styles.textInput}
                value={accNumber}
                onChangeText={setAccNumber}
                placeholder="Nomor rekening atau HP tujuan"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Nama Lengkap Pemilik Rekening</Text>
              <TextInput
                style={styles.textInput}
                value={accName}
                onChangeText={setAccName}
                placeholder="Nama penerima dana"
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
                  onPress={handleWithdrawSubmit}
                >
                  <Text style={styles.sheetBtnTextSolid}>Tarik Dana</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal Dialog */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.modalBgCenter}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Konfirmasi Penarikan</Text>
            
            <View style={styles.confirmBody}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Jumlah</Text>
                <Text style={styles.confirmValue}>{rp(parseInt(drawAmount) || 0)}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Tujuan</Text>
                <Text style={styles.confirmValue}>
                  {drawMethod === "bank" ? `Transfer Bank (${bankName})` : drawMethod.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.confirmDest}>{accNumber}</Text>
              <Text style={styles.confirmDest}>{accName}</Text>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.confirmBtnTextCancel}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnSolid]}
                onPress={handleConfirmWithdraw}
              >
                <Text style={styles.confirmBtnTextSolid}>Konfirmasi</Text>
              </TouchableOpacity>
            </View>
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
  totalCard: {
    backgroundColor: "#1B7A4E",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  totalLabel: {
    color: "#DCFCE7",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 8,
  },
  totalCaption: {
    fontSize: 12,
    color: "#E8F5EE",
    marginTop: 8,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    width: "48%",
    aspectRatio: 1.4,
    justifyContent: "center",
    gap: 4,
  },
  gridLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  gridVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  withdrawCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  withdrawIconBg: {
    backgroundColor: "#E8F5EE",
    padding: 10,
    borderRadius: 14,
  },
  withdrawInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  withdrawLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  withdrawValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  withdrawBtn: {
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  withdrawBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  withdrawBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
    zIndex: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  dropdownMenu: {
    position: "absolute",
    top: 245,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: 100,
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  dropdownOption: {
    padding: 10,
    alignItems: "center",
  },
  dropdownOptionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 220,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 12,
    marginBottom: 22,
  },
  chartBarsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  barCol: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    height: 120,
    width: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: "#1B7A4E",
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "600",
  },
  barValText: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
    marginTop: 2,
  },
  emptyChart: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyChartText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  cardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 22,
  },
  cardGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardGroupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  cardGroupBody: {
    gap: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  emphasizedText: {
    fontWeight: "800",
    color: "#111827",
  },
  emphasizedTextPrimary: {
    fontWeight: "800",
    color: "#1B7A4E",
  },
  breakdownNote: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  emptyHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 6,
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  emptyHistorySub: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  historyInfo: {
    gap: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  historySub: {
    fontSize: 11,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusSukses: {
    backgroundColor: "#DCFCE7",
  },
  statusTextSukses: {
    color: "#15803D",
  },
  statusDiproses: {
    backgroundColor: "#FEF3C7",
  },
  statusTextDiproses: {
    color: "#B45309",
  },
  // Modal Bottom sheet
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
  balanceBanner: {
    backgroundColor: "#E8F5EE",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceBannerLabel: {
    fontSize: 12,
    color: "#1B7A4E",
    fontWeight: "700",
    marginLeft: 8,
    flex: 1,
  },
  balanceBannerValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  formContainer: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    marginTop: 10,
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
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  methodBtn: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "800",
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
    marginTop: 18,
    marginBottom: 24,
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
    fontWeight: "700",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Dialog confirmation styles
  modalBgCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "85%",
    maxWidth: 320,
    gap: 16,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  confirmBody: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  confirmValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  confirmDest: {
    fontSize: 11,
    color: "#6B7280",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancel: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  confirmBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  confirmBtnTextCancel: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
