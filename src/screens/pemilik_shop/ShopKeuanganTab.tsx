import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  CreditCard,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ShieldCheck,
  Plus,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rp } from "../../utils/formatters";

interface TransactionItem {
  id: string;
  type: "IN" | "OUT";
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status: "Sukses" | "Diproses" | "Ditolak";
}

interface ShopKeuanganTabProps {
  orders: any[];
  storeName?: string;
  ownerId?: string;
}

export const ShopKeuanganTab: React.FC<ShopKeuanganTabProps> = ({
  orders,
  storeName,
  ownerId,
}) => {
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Form states for withdrawal
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<
    "BCA" | "MANDIRI" | "BRI" | "BNI" | "DANA" | "GOPAY" | "OVO"
  >("BCA");
  const [accNumber, setAccNumber] = useState("");
  const [accName, setAccName] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Bank Account default
  const [savedBank, setSavedBank] = useState("BCA");
  const [savedAccNo, setSavedAccNo] = useState("8830192819");
  const [savedAccName, setSavedAccName] = useState("Toko Kanyaah Shop");

  // Local withdrawals list
  const [withdrawals, setWithdrawals] = useState<TransactionItem[]>([]);

  // Calculate earnings from completed orders
  const completedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderStatus === "COMPLETED" || o.orderStatus === "DELIVERED"
    );
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.orderStatus !== "COMPLETED" &&
        o.orderStatus !== "DELIVERED" &&
        o.orderStatus !== "CANCELLED"
    );
  }, [orders]);

  const totalEarnings = useMemo(() => {
    return completedOrders.reduce((sum, o) => {
      const amt = Number(o.subtotal || o.totalAmount || o.totalPrice || 0);
      return sum + amt;
    }, 0);
  }, [completedOrders]);

  const pendingEscrow = useMemo(() => {
    return activeOrders.reduce((sum, o) => {
      const amt = Number(o.subtotal || o.totalAmount || o.totalPrice || 0);
      return sum + amt;
    }, 0);
  }, [activeOrders]);

  // Load saved withdrawal history & account
  useEffect(() => {
    AsyncStorage.getItem(`shop_withdrawals_${ownerId || "default"}`)
      .then((val) => {
        if (val) {
          try {
            setWithdrawals(JSON.parse(val));
          } catch (_) {}
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(`shop_bank_acc_${ownerId || "default"}`)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed.bank) setSavedBank(parsed.bank);
            if (parsed.accNo) setSavedAccNo(parsed.accNo);
            if (parsed.accName) setSavedAccName(parsed.accName);
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, [ownerId]);

  // Total withdrawn
  const totalWithdrawn = useMemo(() => {
    return withdrawals
      .filter((w) => w.status === "Sukses" || w.status === "Diproses")
      .reduce((sum, w) => sum + w.amount, 0);
  }, [withdrawals]);

  // Available balance
  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);

  // Combined mutation transactions
  const transactions = useMemo(() => {
    const list: TransactionItem[] = [];

    // 1. Order Inflows
    completedOrders.forEach((o) => {
      const amt = Number(o.subtotal || o.totalAmount || o.totalPrice || 0);
      list.push({
        id: `ORD-${o._id}`,
        type: "IN",
        title: `Pemasukan Pesanan #${o.orderCode || o._id.slice(-6).toUpperCase()}`,
        subtitle: `${(o.items || []).length} barang • Pembayaran selesai`,
        amount: amt,
        date: new Date(o.createdAt || Date.now()).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Sukses",
      });
    });

    // 2. Withdrawal Outflows
    withdrawals.forEach((w) => {
      list.push(w);
    });

    // Sort by date or id descending
    return list;
  }, [completedOrders, withdrawals]);

  const filteredTransactions = useMemo(() => {
    if (filterType === "IN") return transactions.filter((t) => t.type === "IN");
    if (filterType === "OUT") return transactions.filter((t) => t.type === "OUT");
    return transactions;
  }, [transactions, filterType]);

  const handleOpenWithdraw = () => {
    setWithdrawAmount("");
    setWithdrawMethod((savedBank as any) || "BCA");
    setAccNumber(savedAccNo);
    setAccName(savedAccName);
    setWithdrawModalVisible(true);
  };

  const handleApplyPreset = (amt: number) => {
    setWithdrawAmount(String(amt));
  };

  const handleWithdrawAll = () => {
    setWithdrawAmount(String(availableBalance));
  };

  const handleSubmitWithdraw = async () => {
    const amt = parseInt(withdrawAmount, 10);
    if (!amt || isNaN(amt) || amt < 10000) {
      Alert.alert("Perhatian", "Nominal penarikan dana minimal Rp10.000.");
      return;
    }
    if (amt > availableBalance) {
      Alert.alert(
        "Saldo Kurang",
        `Saldo tersedia Anda adalah ${rp(availableBalance)}.`
      );
      return;
    }
    if (!accNumber.trim() || !accName.trim()) {
      Alert.alert("Lengkapi Data", "Silakan masukkan nomor rekening dan nama pemilik.");
      return;
    }

    try {
      setIsSubmittingWithdraw(true);

      const newRecord: TransactionItem = {
        id: `WD-${Date.now()}`,
        type: "OUT",
        title: `Penarikan ke ${withdrawMethod}`,
        subtitle: `Rekening: ${accNumber} a.n ${accName}`,
        amount: amt,
        date: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Diproses",
      };

      const updated = [newRecord, ...withdrawals];
      setWithdrawals(updated);
      await AsyncStorage.setItem(
        `shop_withdrawals_${ownerId || "default"}`,
        JSON.stringify(updated)
      );

      setWithdrawModalVisible(false);
      Alert.alert(
        "Penarikan Diajukan",
        `Pengajuan penarikan ${rp(amt)} ke ${withdrawMethod} (${accNumber}) berhasil dibuat dan sedang diproses admin.`
      );
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal mengajukan penarikan dana.");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleSaveBankAccount = async () => {
    if (!savedAccNo.trim() || !savedAccName.trim()) {
      Alert.alert("Perhatian", "Nomor rekening dan nama pemilik tidak boleh kosong.");
      return;
    }

    const payload = {
      bank: savedBank,
      accNo: savedAccNo.trim(),
      accName: savedAccName.trim(),
    };

    await AsyncStorage.setItem(
      `shop_bank_acc_${ownerId || "default"}`,
      JSON.stringify(payload)
    );
    setAccountModalVisible(false);
    Alert.alert("Tersimpan", "Informasi rekening pencairan berhasil diperbarui.");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dompet & Keuangan</Text>
          <Text style={styles.headerSub}>
            Kelola saldo hasil penjualan dan pencairan dana toko
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bankSettingBtn}
          onPress={() => setAccountModalVisible(true)}
          activeOpacity={0.8}
        >
          <Building size={15} color="#0D7A53" />
          <Text style={styles.bankSettingText}>Rekening</Text>
        </TouchableOpacity>
      </View>

      {/* Saldo Hero Card */}
      <View style={styles.walletHeroCard}>
        <View style={styles.walletHeroTop}>
          <View style={styles.walletIconCircle}>
            <Wallet size={20} color="#FFFFFF" />
          </View>
          <View style={styles.verifiedEscrowBadge}>
            <ShieldCheck size={12} color="#D1FAE5" />
            <Text style={styles.verifiedEscrowText}>Kanyaah Escrow Aman</Text>
          </View>
        </View>

        <Text style={styles.walletHeroLabel}>SALDO TOKO TERSEDIA</Text>
        <Text style={styles.walletHeroBalance}>{rp(availableBalance)}</Text>

        <View style={styles.escrowRow}>
          <Clock size={13} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.escrowText}>
            Saldo tertahan (pesanan aktif): {rp(pendingEscrow)}
          </Text>
        </View>

        {/* Action Buttons inside Card */}
        <View style={styles.walletHeroActions}>
          <TouchableOpacity
            style={styles.btnWithdraw}
            onPress={handleOpenWithdraw}
            activeOpacity={0.85}
          >
            <ArrowUpRight size={16} color="#0D7A53" />
            <Text style={styles.btnWithdrawText}>Tarik Dana</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSavedAccount}
            onPress={() => setAccountModalVisible(true)}
            activeOpacity={0.85}
          >
            <CreditCard size={15} color="#FFFFFF" />
            <Text style={styles.btnSavedAccountText}>
              {savedBank} • {savedAccNo.slice(-4)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2 Quick Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: "#DCFCE7" }]}>
            <ArrowDownLeft size={16} color="#15803D" />
          </View>
          <Text style={styles.statAmount}>{rp(totalEarnings)}</Text>
          <Text style={styles.statLabel}>Total Pemasukan</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: "#FEF3C7" }]}>
            <ArrowUpRight size={16} color="#D97706" />
          </View>
          <Text style={styles.statAmount}>{rp(totalWithdrawn)}</Text>
          <Text style={styles.statLabel}>Total Dicairkan</Text>
        </View>
      </View>

      {/* Mutasi Filter Tabs */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.sectionTitle}>Riwayat Mutasi Saldo</Text>
          <Text style={styles.countText}>({filteredTransactions.length})</Text>
        </View>

        <View style={styles.filterTabsRow}>
          {(
            [
              { key: "ALL", label: "Semua" },
              { key: "IN", label: "Masuk (+)" },
              { key: "OUT", label: "Keluar (-)" },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.filterTabBtn,
                filterType === t.key && styles.filterTabBtnActive,
              ]}
              onPress={() => setFilterType(t.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabBtnText,
                  filterType === t.key && styles.filterTabBtnTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsContainer}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <History size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum Ada Mutasi</Text>
            <Text style={styles.emptySubtitle}>
              Transaksi pemasukan pesanan atau penarikan dana akan tercatat di sini secara otomatis.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View
                style={[
                  styles.txIconBg,
                  tx.type === "IN" ? styles.txIconBgIn : styles.txIconBgOut,
                ]}
              >
                {tx.type === "IN" ? (
                  <ArrowDownLeft size={18} color="#15803D" />
                ) : (
                  <ArrowUpRight size={18} color="#D97706" />
                )}
              </View>

              <View style={styles.txCenter}>
                <Text style={styles.txTitle} numberOfLines={1}>
                  {tx.title}
                </Text>
                <Text style={styles.txSubtitle} numberOfLines={1}>
                  {tx.subtitle}
                </Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>

              <View style={styles.txRight}>
                <Text
                  style={[
                    styles.txAmount,
                    tx.type === "IN" ? styles.txAmountIn : styles.txAmountOut,
                  ]}
                >
                  {tx.type === "IN" ? "+" : "-"}
                  {rp(tx.amount)}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    tx.status === "Sukses"
                      ? styles.statusPillSuccess
                      : tx.status === "Diproses"
                      ? styles.statusPillPending
                      : styles.statusPillRejected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      tx.status === "Sukses"
                        ? styles.statusPillTextSuccess
                        : tx.status === "Diproses"
                        ? styles.statusPillTextPending
                        : styles.statusPillTextRejected,
                    ]}
                  >
                    {tx.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal Tarik Dana */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Tarik Saldo Toko</Text>
                <Text style={styles.modalSheetSub}>
                  Saldo tersedia: {rp(availableBalance)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Nominal Input */}
              <Text style={styles.inputLabel}>Nominal Penarikan (Rp)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Contoh: 100000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                {[50000, 100000, 250000, 500000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.presetChip}
                    onPress={() => handleApplyPreset(amt)}
                  >
                    <Text style={styles.presetChipText}>{rp(amt)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.presetChip, styles.presetChipAll]}
                  onPress={handleWithdrawAll}
                >
                  <Text style={styles.presetChipTextAll}>Tarik Semua</Text>
                </TouchableOpacity>
              </View>

              {/* Method Selector */}
              <Text style={styles.inputLabel}>Tujuan Bank / E-Wallet</Text>
              <View style={styles.methodsRow}>
                {(["BCA", "MANDIRI", "BRI", "BNI", "DANA", "GOPAY", "OVO"] as const).map(
                  (m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.methodChip,
                        withdrawMethod === m && styles.methodChipActive,
                      ]}
                      onPress={() => setWithdrawMethod(m)}
                    >
                      <Text
                        style={[
                          styles.methodChipText,
                          withdrawMethod === m && styles.methodChipTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Acc Number */}
              <Text style={styles.inputLabel}>Nomor Rekening / No. HP E-Wallet</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nomor rekening tujuan"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={accNumber}
                onChangeText={setAccNumber}
              />

              {/* Acc Name */}
              <Text style={styles.inputLabel}>Nama Pemilik Rekening</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nama lengkap di buku tabungan / e-wallet"
                placeholderTextColor="#94A3B8"
                value={accName}
                onChangeText={setAccName}
              />

              {/* Action Buttons */}
              <View style={styles.modalSheetActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setWithdrawModalVisible(false)}
                >
                  <Text style={styles.btnCancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnSubmit}
                  onPress={handleSubmitWithdraw}
                  disabled={isSubmittingWithdraw}
                >
                  {isSubmittingWithdraw ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnSubmitText}>Ajukan Pencairan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Pengaturan Rekening Utama */}
      <Modal visible={accountModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Rekening Pencairan Utama</Text>
                <Text style={styles.modalSheetSub}>
                  Rekening default untuk penarikan hasil penjualan toko
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Pilih Bank</Text>
            <View style={styles.methodsRow}>
              {(["BCA", "MANDIRI", "BRI", "BNI", "DANA", "GOPAY", "OVO"] as const).map(
                (m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodChip,
                      savedBank === m && styles.methodChipActive,
                    ]}
                    onPress={() => setSavedBank(m)}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        savedBank === m && styles.methodChipTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.inputLabel}>Nomor Rekening</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Masukkan nomor rekening"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={savedAccNo}
              onChangeText={setSavedAccNo}
            />

            <Text style={styles.inputLabel}>Nama Pemilik Rekening</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Nama sesuai rekening"
              placeholderTextColor="#94A3B8"
              value={savedAccName}
              onChangeText={setSavedAccName}
            />

            <View style={styles.modalSheetActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setAccountModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSubmit}
                onPress={handleSaveBankAccount}
              >
                <Text style={styles.btnSubmitText}>Simpan Rekening</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 85,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  bankSettingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bankSettingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  walletHeroCard: {
    backgroundColor: "#0D7A53",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  walletHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedEscrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedEscrowText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  walletHeroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 14,
    letterSpacing: 0.5,
  },
  walletHeroBalance: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  escrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    marginBottom: 16,
  },
  escrowText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
  },
  walletHeroActions: {
    flexDirection: "row",
    gap: 10,
  },
  btnWithdraw: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  btnWithdrawText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0D7A53",
  },
  btnSavedAccount: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnSavedAccountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  filterSection: {
    marginTop: 4,
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  countText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  filterTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 3,
    borderRadius: 10,
    gap: 4,
  },
  filterTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 7,
  },
  filterTabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  filterTabBtnTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
  transactionsContainer: {
    gap: 8,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  txIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txIconBgIn: {
    backgroundColor: "#DCFCE7",
  },
  txIconBgOut: {
    backgroundColor: "#FEF3C7",
  },
  txCenter: {
    flex: 1,
  },
  txTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  txSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  txDate: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 13,
    fontWeight: "900",
  },
  txAmountIn: {
    color: "#15803D",
  },
  txAmountOut: {
    color: "#D97706",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusPillSuccess: {
    backgroundColor: "#DCFCE7",
  },
  statusPillPending: {
    backgroundColor: "#FEF3C7",
  },
  statusPillRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  statusPillTextSuccess: {
    color: "#15803D",
  },
  statusPillTextPending: {
    color: "#D97706",
  },
  statusPillTextRejected: {
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 36,
  },
  modalSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSheetSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 5,
    marginTop: 10,
  },
  amountInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  presetChipAll: {
    backgroundColor: "#E8F5EE",
    borderColor: "#A7F3D0",
  },
  presetChipTextAll: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
  },
  methodsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  methodChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  methodChipTextActive: {
    color: "#FFFFFF",
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: "#0F172A",
  },
  modalSheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  btnCancel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  btnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  btnSubmit: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
  },
  btnSubmitText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
