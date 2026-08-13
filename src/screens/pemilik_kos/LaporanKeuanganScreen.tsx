import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import Svg, { Path, Circle, Rect, Text as SvgText } from "react-native-svg";
import { Nav } from "../../types";
import {
  Calendar,
  ChevronDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Search,
  Plus,
  X,
  FileText,
  Home,
  Building2,
  Users,
  Wallet,
  User,
  Zap,
  DollarSign,
  AlertTriangle,
} from "lucide-react-native";

interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: string;
  type: "income" | "expense";
}

export const LaporanKeuanganScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("keuangan");

  // Selected Month state
  const [selectedMonth, setSelectedMonth] = useState("Juli 2026");
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthOptions = [
    "Januari 2026",
    "Februari 2026",
    "Maret 2026",
    "April 2026",
    "Mei 2026",
    "Juni 2026",
    "Juli 2026",
    "Agustus 2026",
  ];

  // Search & Filter state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTxFilter, setActiveTxFilter] = useState<"semua" | "pendapatan" | "pengeluaran">("semua");

  // Add Transaction Modal state
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txTitle, setTxTitle] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState("");

  // Sample Transactions List matching Image 2
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      title: "Pembayaran Kamar A-03",
      subtitle: "Budi Santoso • 2 Juli 2026",
      date: "2 Juli 2026",
      amount: "+ Rp 1.500.000",
      type: "income",
    },
    {
      id: "2",
      title: "Bayar Listrik",
      subtitle: "PLN • 5 Juli 2026",
      date: "5 Juli 2026",
      amount: "- Rp 650.000",
      type: "expense",
    },
    {
      id: "3",
      title: "Laundry Bulanan",
      subtitle: "Ayu • 6 Juli 2026",
      date: "6 Juli 2026",
      amount: "+ Rp 250.000",
      type: "income",
    },
  ]);

  const handleSaveTransaction = () => {
    if (!txTitle || !txAmount) return;

    const newTx: Transaction = {
      id: Date.now().toString(),
      title: txTitle,
      subtitle: `${txCategory || "Umum"} • 13 Juli 2026`,
      date: "13 Juli 2026",
      amount: `${txType === "income" ? "+" : "-"} Rp ${txAmount}`,
      type: txType,
    };

    setTransactions([newTx, ...transactions]);
    setIsAddTxModalOpen(false);
    setTxTitle("");
    setTxAmount("");
    setTxCategory("");
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTxFilter === "pendapatan") return matchesSearch && t.type === "income";
    if (activeTxFilter === "pengeluaran") return matchesSearch && t.type === "expense";
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Scroll Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Laporan Keuangan</Text>
            <Text style={styles.headerSubtitle}>Ringkasan pemasukan & pengeluaran</Text>
          </View>

          {/* Month Selector Pill */}
          <TouchableOpacity
            style={styles.monthPillBtn}
            onPress={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
            activeOpacity={0.8}
          >
            <Calendar size={14} color="#0D7A53" />
            <Text style={styles.monthPillText}>{selectedMonth}</Text>
            <ChevronDown size={14} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Card 1: Main Laba Bersih Banner */}
        <View style={styles.labaBersihCard}>
          <View style={styles.labaHeaderRow}>
            <View>
              <Text style={styles.labaLabel}>Laba Bersih</Text>
              <Text style={styles.labaValue}>Rp 8.250.000</Text>

              <View style={styles.growthBadgeRow}>
                <View style={styles.growthPill}>
                  <TrendingUp size={12} color="#0D7A53" />
                  <Text style={styles.growthPillText}>+12%</Text>
                </View>
                <Text style={styles.growthSubtext}>dibanding bulan lalu</Text>
              </View>
            </View>

            {/* Document Watermark SVG */}
            <View style={styles.watermarkContainer}>
              <FileText size={70} color="rgba(255,255,255,0.12)" />
            </View>
          </View>
        </View>

        {/* Row 2: 2 Stat Cards (Pendapatan vs Pengeluaran) */}
        <View style={styles.statCardsRow}>
          {/* Card 1: Pendapatan */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#DCFCE7" }]}>
              <Wallet size={20} color="#0D7A53" />
            </View>
            <Text style={styles.statCardLabel}>Pendapatan</Text>
            <Text style={styles.statCardVal}>Rp 12.500.000</Text>
            <View style={styles.statBadgeRow}>
              <View style={[styles.miniPill, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.miniPillText, { color: "#0D7A53" }]}>+8.5%</Text>
              </View>
              <Text style={styles.miniPillSub}>vs bulan lalu</Text>
            </View>
          </View>

          {/* Card 2: Pengeluaran */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FEE2E2" }]}>
              <ArrowDownRight size={20} color="#DC2626" />
            </View>
            <Text style={styles.statCardLabel}>Pengeluaran</Text>
            <Text style={styles.statCardVal}>Rp 4.250.000</Text>
            <View style={styles.statBadgeRow}>
              <View style={[styles.miniPill, { backgroundColor: "#FEE2E2" }]}>
                <Text style={[styles.miniPillText, { color: "#DC2626" }]}>+5.2%</Text>
              </View>
              <Text style={styles.miniPillSub}>vs bulan lalu</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Pendapatan Bulanan Line Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartCardTitle}>Pendapatan Bulanan</Text>
            <TouchableOpacity style={styles.seeDetailBtn} activeOpacity={0.7}>
              <Text style={styles.seeDetailText}>Lihat Detail</Text>
              <ChevronRight size={14} color="#0D7A53" />
            </TouchableOpacity>
          </View>

          {/* SVG Line Chart Container */}
          <View style={styles.chartContainer}>
            {/* Tooltip Badge Top Right */}
            <View style={styles.chartTooltipBadge}>
              <Text style={styles.chartTooltipText}>Rp 12.500.000</Text>
            </View>

            <Svg height="140" width="100%" viewBox="0 0 300 130">
              {/* Y Grid lines */}
              <Path d="M 30 10 L 290 10" stroke="#F3F4F6" strokeWidth="1" />
              <Path d="M 30 45 L 290 45" stroke="#F3F4F6" strokeWidth="1" />
              <Path d="M 30 80 L 290 80" stroke="#F3F4F6" strokeWidth="1" />
              <Path d="M 30 115 L 290 115" stroke="#F3F4F6" strokeWidth="1" />

              {/* Y Axis Labels */}
              <SvgText fontSize="10" fill="#9CA3AF" x="0" y="14">
                15 jt
              </SvgText>
              <SvgText fontSize="10" fill="#9CA3AF" x="0" y="49">
                10 jt
              </SvgText>
              <SvgText fontSize="10" fill="#9CA3AF" x="0" y="84">
                5 jt
              </SvgText>
              <SvgText fontSize="10" fill="#9CA3AF" x="0" y="119">
                0
              </SvgText>

              {/* Curved Line Path */}
              <Path
                d="M 35 85 C 60 75, 75 70, 95 65 C 115 60, 130 40, 150 45 C 170 50, 185 55, 205 35 C 225 25, 240 20, 260 20 C 275 20, 285 14, 288 12"
                fill="none"
                stroke="#0D7A53"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points circles */}
              <Circle cx="35" cy="85" r="4" fill="#0D7A53" />
              <Circle cx="95" cy="65" r="4" fill="#0D7A53" />
              <Circle cx="150" cy="45" r="4" fill="#0D7A53" />
              <Circle cx="205" cy="55" r="4" fill="#0D7A53" />
              <Circle cx="240" cy="35" r="4" fill="#0D7A53" />
              <Circle cx="260" cy="24" r="4" fill="#0D7A53" />
              <Circle cx="288" cy="12" r="5" fill="#0D7A53" stroke="#FFFFFF" strokeWidth="2" />
            </Svg>

            {/* X Axis Month Labels */}
            <View style={styles.xAxisRow}>
              <Text style={styles.xLabelText}>Jan</Text>
              <Text style={styles.xLabelText}>Feb</Text>
              <Text style={styles.xLabelText}>Mar</Text>
              <Text style={styles.xLabelText}>Apr</Text>
              <Text style={styles.xLabelText}>Mei</Text>
              <Text style={styles.xLabelText}>Jun</Text>
              <Text style={[styles.xLabelText, styles.xLabelActive]}>Jul</Text>
            </View>
          </View>
        </View>

        {/* Section 4: Komposisi Pengeluaran Donut Chart (Image 2) */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Komposisi Pengeluaran</Text>

          <View style={styles.donutRow}>
            {/* SVG Donut Chart */}
            <View style={styles.donutContainer}>
              <Svg height="140" width="140" viewBox="0 0 140 140">
                {/* Segment 1: Operasional 45% (Dark Green #0B5D3F) */}
                <Circle
                  cx="70"
                  cy="70"
                  r="52"
                  stroke="#0B5D3F"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray="326.7"
                  strokeDashoffset="75"
                />
                {/* Segment 2: Listrik 25% (Medium Green #10B981) */}
                <Circle
                  cx="70"
                  cy="70"
                  r="52"
                  stroke="#10B981"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray="326.7"
                  strokeDashoffset="220"
                />
                {/* Segment 3: Air 15% (Blue #3B82F6) */}
                <Circle
                  cx="70"
                  cy="70"
                  r="52"
                  stroke="#2563EB"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray="326.7"
                  strokeDashoffset="300"
                />
                {/* Segment 4: Perawatan 10% (Orange #F59E0B) */}
                <Circle
                  cx="70"
                  cy="70"
                  r="52"
                  stroke="#F59E0B"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray="326.7"
                  strokeDashoffset="340"
                />
                {/* Segment 5: Lainnya 10% (Gray #9CA3AF) */}
                <Circle
                  cx="70"
                  cy="70"
                  r="52"
                  stroke="#9CA3AF"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray="326.7"
                  strokeDashoffset="370"
                />
              </Svg>

              {/* Center Donut Label */}
              <View style={styles.donutCenterLabelWrap}>
                <Text style={styles.donutCenterSub}>Total</Text>
                <Text style={styles.donutCenterVal}>Rp 4.25M</Text>
              </View>
            </View>

            {/* Donut Legend Column */}
            <View style={styles.legendCol}>
              <View style={styles.legendRowItem}>
                <View style={[styles.legendDot, { backgroundColor: "#0B5D3F" }]} />
                <Text style={styles.legendLabelText}>Operasional</Text>
                <Text style={styles.legendValText}>45%</Text>
              </View>

              <View style={styles.legendRowItem}>
                <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.legendLabelText}>Listrik</Text>
                <Text style={styles.legendValText}>25%</Text>
              </View>

              <View style={styles.legendRowItem}>
                <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
                <Text style={styles.legendLabelText}>Air</Text>
                <Text style={styles.legendValText}>15%</Text>
              </View>

              <View style={styles.legendRowItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.legendLabelText}>Perawatan</Text>
                <Text style={styles.legendValText}>10%</Text>
              </View>

              <View style={styles.legendRowItem}>
                <View style={[styles.legendDot, { backgroundColor: "#9CA3AF" }]} />
                <Text style={styles.legendLabelText}>Lainnya</Text>
                <Text style={styles.legendValText}>10%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 5: Transaksi Terbaru (Image 2) */}
        <View style={styles.txSectionHeaderRow}>
          <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
          <TouchableOpacity style={styles.seeDetailBtn} activeOpacity={0.7}>
            <Text style={styles.seeDetailText}>Lihat Semua</Text>
            <ChevronRight size={14} color="#0D7A53" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips & Search Bar */}
        <View style={styles.txFilterRow}>
          <TouchableOpacity
            style={[styles.txSearchBtn, isSearchVisible && { backgroundColor: "#E8F5EE" }]}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
            activeOpacity={0.7}
          >
            <Search size={18} color={isSearchVisible ? "#0D7A53" : "#6B7280"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.txFilterChip, activeTxFilter === "semua" && styles.txFilterChipActive]}
            onPress={() => setActiveTxFilter("semua")}
            activeOpacity={0.7}
          >
            <Text style={[styles.txFilterChipText, activeTxFilter === "semua" && styles.txFilterChipTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.txFilterChip, activeTxFilter === "pendapatan" && styles.txFilterChipActive]}
            onPress={() => setActiveTxFilter("pendapatan")}
            activeOpacity={0.7}
          >
            <Text style={[styles.txFilterChipText, activeTxFilter === "pendapatan" && styles.txFilterChipTextActive]}>
              Pendapatan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.txFilterChip, activeTxFilter === "pengeluaran" && styles.txFilterChipActive]}
            onPress={() => setActiveTxFilter("pengeluaran")}
            activeOpacity={0.7}
          >
            <Text style={[styles.txFilterChipText, activeTxFilter === "pengeluaran" && styles.txFilterChipTextActive]}>
              Pengeluaran
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        {isSearchVisible && (
          <View style={{ marginBottom: 14 }}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari transaksi..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* Transaction Items */}
        <View style={styles.txCardGroup}>
          {filteredTransactions.map((tx) => (
            <View key={tx.id} style={styles.txItemRow}>
              <View style={[styles.txIconCircle, { backgroundColor: tx.type === "income" ? "#DCFCE7" : "#FEE2E2" }]}>
                {tx.type === "income" ? (
                  <ArrowUpRight size={18} color="#0D7A53" />
                ) : (
                  <ArrowDownRight size={18} color="#DC2626" />
                )}
              </View>

              <View style={styles.txTextCol}>
                <Text style={styles.txTitleText}>{tx.title}</Text>
                <Text style={styles.txSubText}>{tx.subtitle}</Text>
              </View>

              <View style={styles.txAmountCol}>
                <Text style={[styles.txAmountVal, tx.type === "income" ? styles.incomeText : styles.expenseText]}>
                  {tx.amount}
                </Text>
                <ChevronRight size={14} color="#D1D5DB" />
              </View>
            </View>
          ))}
        </View>

        {/* Section 6: Bottom Cards (Ringkasan Keuangan & Insight Bulan Ini) */}
        <View style={styles.bottomRowGroup}>
          {/* Card 1: Ringkasan Keuangan */}
          <View style={styles.bottomSmallCard}>
            <View style={styles.bottomCardHeaderRow}>
              <View style={[styles.bottomCardIconBg, { backgroundColor: "#DCFCE7" }]}>
                <Building2 size={16} color="#0D7A53" />
              </View>
              <Text style={styles.bottomCardTitle}>Ringkasan Keuangan</Text>
            </View>

            <Text style={styles.ringkasanSub}>Total Pendapatan</Text>
            <Text style={styles.ringkasanVal}>Rp 12.500.000</Text>

            <View style={styles.ringkasanSplitRow}>
              <View>
                <Text style={styles.splitSub}>Tunai</Text>
                <Text style={styles.splitVal}>Rp 3.500.000</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.splitSub}>Transfer</Text>
                <Text style={styles.splitVal}>Rp 9.000.000</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Insight Bulan Ini */}
          <View style={styles.bottomSmallCard}>
            <View style={styles.bottomCardHeaderRow}>
              <View style={[styles.bottomCardIconBg, { backgroundColor: "#FFEDD5" }]}>
                <Zap size={16} color="#EA580C" />
              </View>
              <Text style={styles.bottomCardTitle}>Insight Bulan Ini</Text>
            </View>

            <View style={styles.insightList}>
              <View style={styles.insightItem}>
                <TrendingUp size={12} color="#0D7A53" />
                <Text style={styles.insightItemText}>Pendapatan meningkat 12%</Text>
              </View>
              <View style={styles.insightItem}>
                <Users size={12} color="#2563EB" />
                <Text style={styles.insightItemText}>Okupansi mencapai 83%</Text>
              </View>
              <View style={styles.insightItem}>
                <Zap size={12} color="#EA580C" />
                <Text style={styles.insightItemText}>Pengeluaran listrik naik 8%</Text>
              </View>
              <View style={styles.insightItem}>
                <AlertTriangle size={12} color="#DC2626" />
                <Text style={styles.insightItemText}>2 penghuni belum membayar sewa</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => setIsAddTxModalOpen(true)}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_home")}
          activeOpacity={0.7}
        >
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_kamar")}
          activeOpacity={0.7}
        >
          <Building2 size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Kamar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_penghuni")}
          activeOpacity={0.7}
        >
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Penghuni</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveNavTab("keuangan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_profil")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Month Picker Dropdown Modal */}
      <Modal visible={isMonthPickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMonthPickerOpen(false)}
        >
          <View style={styles.monthPickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.monthPickerTitle}>Pilih Bulan Laporan</Text>
            {monthOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.monthOptionRow,
                  selectedMonth === opt && styles.monthOptionRowActive,
                ]}
                onPress={() => {
                  setSelectedMonth(opt);
                  setIsMonthPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.monthOptionText, selectedMonth === opt && styles.monthOptionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal visible={isAddTxModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addTxCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Transaksi</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsAddTxModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Type Selector (Pemasukan vs Pengeluaran) */}
            <View style={styles.txTypeRow}>
              <TouchableOpacity
                style={[styles.txTypeBtn, txType === "income" && styles.txTypeBtnIncome]}
                onPress={() => setTxType("income")}
                activeOpacity={0.7}
              >
                <Text style={[styles.txTypeText, txType === "income" && styles.txTypeTextActive]}>
                  + Pemasukan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.txTypeBtn, txType === "expense" && styles.txTypeBtnExpense]}
                onPress={() => setTxType("expense")}
                activeOpacity={0.7}
              >
                <Text style={[styles.txTypeText, txType === "expense" && styles.txTypeTextActive]}>
                  - Pengeluaran
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Judul Transaksi</Text>
            <TextInput
              style={styles.input}
              value={txTitle}
              onChangeText={setTxTitle}
              placeholder="Cth: Pembayaran Sewa Kamar A-01"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Kategori / Keterangan</Text>
            <TextInput
              style={styles.input}
              value={txCategory}
              onChangeText={setTxCategory}
              placeholder="Cth: Listrik / Air / Penghuni"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Jumlah (Rp)</Text>
            <TextInput
              style={styles.input}
              value={txAmount}
              onChangeText={setTxAmount}
              placeholder="1.500.000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleSaveTransaction}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Simpan Transaksi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  monthPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  // Laba Bersih Card
  labaBersihCard: {
    backgroundColor: "#0B5D3F",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    overflow: "hidden",
  },
  labaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  labaLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  labaValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  growthBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  growthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  growthPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  growthSubtext: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  watermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -10,
  },

  // Stat Cards Row
  statCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statCardLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  statCardVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  statBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  miniPillSub: {
    fontSize: 10,
    color: "#9CA3AF",
  },

  // Chart Cards
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  chartCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  seeDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  chartContainer: {
    position: "relative",
  },
  chartTooltipBadge: {
    position: "absolute",
    right: 0,
    top: -10,
    backgroundColor: "#0B5D3F",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  chartTooltipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  xAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 30,
    paddingRight: 10,
    marginTop: 8,
  },
  xLabelText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  xLabelActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },

  // Donut Chart Row
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 16,
  },
  donutContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterLabelWrap: {
    position: "absolute",
    alignItems: "center",
  },
  donutCenterSub: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  donutCenterVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  legendCol: {
    flex: 1,
    gap: 8,
  },
  legendRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabelText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  legendValText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },

  // Transaksi Terbaru
  txSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  txFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  txSearchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  txFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  txFilterChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  txFilterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  txFilterChipTextActive: {
    color: "#FFFFFF",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: "#111827",
  },

  // Transaction Items
  txCardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
    overflow: "hidden",
  },
  txItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 12,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txTextCol: {
    flex: 1,
  },
  txTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  txSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  txAmountCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txAmountVal: {
    fontSize: 13,
    fontWeight: "800",
  },
  incomeText: {
    color: "#0D7A53",
  },
  expenseText: {
    color: "#DC2626",
  },

  // Bottom Group Cards
  bottomRowGroup: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  bottomSmallCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  bottomCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  bottomCardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  ringkasanSub: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  ringkasanVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
    marginBottom: 10,
  },
  ringkasanSplitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  splitSub: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  splitVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  insightList: {
    gap: 6,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightItemText: {
    fontSize: 10,
    color: "#4B5563",
    flex: 1,
  },

  // FAB
  fabBtn: {
    position: "absolute",
    right: 20,
    bottom: 80,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 99,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: "row",
    height: 64,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 3,
  },
  navTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  monthPickerCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  monthPickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  monthOptionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  monthOptionRowActive: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  monthOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  monthOptionTextActive: {
    fontWeight: "700",
    color: "#0D7A53",
  },

  addTxCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  txTypeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  txTypeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  txTypeBtnIncome: {
    backgroundColor: "#DCFCE7",
    borderColor: "#0D7A53",
  },
  txTypeBtnExpense: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },
  txTypeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  txTypeTextActive: {
    color: "#111827",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13,
    color: "#111827",
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
