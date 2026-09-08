import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  Image,
} from "react-native";
import Svg, { Path, Circle, Rect, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  fetchOwnerBookings,
  fetchRoomsByOwner,
  fetchTransactionsByOwner,
  createOwnerTransaction,
  deleteOwnerTransaction,
  fetchKostProperty,
  updateKostProperty,
} from "../../services/kostService";
import { uploadFileToBackend } from "../../services/api";
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
  Bed,
  CheckCircle2,
  Receipt,
  Trash2,
  Tag,
  CreditCard,
  QrCode,
  Upload,
  Check,
  Edit3,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react-native";

interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: string;
  type: "income" | "expense";
  rawAmount?: number;
  rawCategory?: string;
  isManual?: boolean;
}

interface LaporanKeuanganProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const LaporanKeuanganScreen: React.FC<LaporanKeuanganProps> = ({ navigate, authAccount }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("keuangan");

  // Selected Month state (Defaults dynamically to current month e.g. September 2026)
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const monthOptions = monthNames.map(m => `${m} ${currentYear}`);
  const [selectedMonth, setSelectedMonth] = useState(`${monthNames[currentMonthIdx]} ${currentYear}`);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // State data dari Database
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [manualTx, setManualTx] = useState<Transaction[]>([]);
  const [kostProperty, setKostProperty] = useState<any>(null);

  // Rekening Bank & QRIS state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"bank" | "qris">("bank");
  const [bankName, setBankName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [qrisImage, setQrisImage] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isUploadingQris, setIsUploadingQris] = useState(false);

  // Search & Filter state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTxFilter, setActiveTxFilter] = useState<"semua" | "pendapatan" | "pengeluaran">("semua");

  // Add Transaction Modal state
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txTitle, setTxTitle] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [isSavingTx, setIsSavingTx] = useState(false);

  const loadFinancialData = async () => {
    try {
      const ownerEmail = authAccount?.email || authAccount?.id || "aisk@gmail.com";
      const [roomsData, bookingsData, txData, propertyData] = await Promise.all([
        fetchRoomsByOwner(ownerEmail),
        fetchOwnerBookings(ownerEmail),
        fetchTransactionsByOwner(ownerEmail),
        fetchKostProperty(ownerEmail),
      ]);
      if (roomsData && roomsData.length > 0) {
        setRooms(roomsData);
      }
      if (bookingsData && bookingsData.length > 0) {
        setBookings(bookingsData);
      }
      if (propertyData) {
        setKostProperty(propertyData);
        if (propertyData.bankAccount) {
          setPaymentType(propertyData.bankAccount.paymentType === "qris" ? "qris" : "bank");
          setBankName(propertyData.bankAccount.bankName || "BCA");
          setAccountNumber(propertyData.bankAccount.accountNumber || "");
          setAccountHolder(propertyData.bankAccount.accountHolder || "");
          setQrisImage(propertyData.bankAccount.qrisImage || "");
        }
      }
      if (txData && Array.isArray(txData)) {
        const formattedTx: Transaction[] = txData.map((t: any) => ({
          id: t._id ? t._id.toString() : (t.id || Date.now().toString()),
          title: t.title || "Transaksi",
          subtitle: `${t.category || "Operasional"} • ${t.date ? new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini"}`,
          date: t.date ? new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini",
          amount: `${t.type === "income" ? "+" : "-"} Rp ${Number(t.amount || 0).toLocaleString("id-ID")}`,
          type: t.type || "expense",
          rawAmount: Number(t.amount || 0),
          rawCategory: t.category || "Operasional",
          isManual: true,
        }));
        setManualTx(formattedTx);
      }
    } catch (err) {
      console.warn("loadFinancialData error:", err);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [authAccount]);

  const handlePickQrisImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setQrisImage(asset.uri);
        setIsUploadingQris(true);
        try {
          const uploadRes = await uploadFileToBackend(
            asset.uri,
            `qris_owner_${Date.now()}.jpg`,
            asset.mimeType || "image/jpeg"
          );
          if (uploadRes?.data?.url) {
            setQrisImage(uploadRes.data.url);
          }
        } catch (uploadErr) {
          console.warn("Upload QRIS error:", uploadErr);
        } finally {
          setIsUploadingQris(false);
        }
      }
    } catch (err) {
      console.log("Pick QRIS error:", err);
    }
  };

  const handleSaveBankAccount = async () => {
    if (paymentType === "bank") {
      if (!accountNumber.trim() || !accountHolder.trim()) {
        alert("Mohon masukkan nomor rekening dan nama pemilik rekening.");
        return;
      }
    } else {
      if (!qrisImage.trim()) {
        alert("Mohon unggah gambar barcode QRIS terlebih dahulu.");
        return;
      }
    }

    setIsSavingBank(true);
    try {
      const ownerEmail = authAccount?.email || authAccount?.id || "aisk@gmail.com";
      await updateKostProperty(ownerEmail, {
        bankAccount: {
          paymentType,
          bankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          qrisImage: qrisImage.trim(),
        },
      });
      setIsBankModalOpen(false);
      await loadFinancialData();
      alert(`Metode pembayaran DP (${paymentType === "qris" ? "Barcode QRIS" : "Transfer Bank"}) berhasil disimpan!`);
    } catch (err: any) {
      console.error("Gagal simpan rekening:", err);
      alert("Gagal simpan rekening: " + (err.message || "Terjadi kesalahan jaringan"));
    } finally {
      setIsSavingBank(false);
    }
  };

  // Kalkulasi Penerimaan DP & Pelunasan dari Customer
  const validBookings = bookings.filter(b => b.status === "dp_verified" || b.status === "dp_submitted" || b.status === "active");
  
  const totalDpCustomer = validBookings.reduce(
    (sum, b) => sum + Number(b.dpAmount || 0),
    0
  );

  const settledBookings = validBookings.filter(b => b.settlementStatus === "settled" || (b.settledAmount && b.settledAmount > 0));
  const totalPelunasanCustomer = settledBookings.reduce(
    (sum, b) => sum + (Number(b.settledAmount) || (Number(b.totalAmount || 0) - Number(b.dpAmount || 0)) || 0),
    0
  );

  const unsettledBookings = validBookings.filter(b => b.settlementStatus !== "settled" && (!b.settledAmount || b.settledAmount === 0));
  const totalPiutangBelumLunas = unsettledBookings.reduce(
    (sum, b) => sum + (Number(b.remainingAmount) || (Number(b.totalAmount || 0) - Number(b.dpAmount || 0)) || 0),
    0
  );

  // Kamar Terisi (okupansi)
  const occupiedRooms = rooms.filter(r => r.status === "terisi" || r.isAvailable === false);

  // Kalkulasi Manual & Pengeluaran
  const manualIncome = manualTx.filter(t => t.type === "income").reduce((sum, t) => sum + (t.rawAmount || parseInt((t.amount || "").replace(/[^0-9]/g, "")) || 0), 0);
  const manualExpense = manualTx.filter(t => t.type === "expense").reduce((sum, t) => sum + (t.rawAmount || parseInt((t.amount || "").replace(/[^0-9]/g, "")) || 0), 0);
  
  const totalPendapatan = totalDpCustomer + totalPelunasanCustomer + manualIncome;
  const totalPengeluaran = manualExpense;
  const labaBersih = totalPendapatan - totalPengeluaran;

  // Generate Real Transactions List (DP & Pelunasan)
  const dpTxs: Transaction[] = validBookings.map((b) => ({
    id: `dp_${b._id}`,
    title: `Penerimaan DP Kamar ${b.roomNumber || "101"}`,
    subtitle: `${b.customerName || "Customer"} • Transfer DP 20%`,
    date: b.verifiedAt ? new Date(b.verifiedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini",
    amount: `+ Rp ${Number(b.dpAmount || 0).toLocaleString("id-ID")}`,
    type: "income" as const,
    rawAmount: Number(b.dpAmount || 0),
    rawCategory: "DP Booking",
    isManual: false,
  }));

  const settlementTxs: Transaction[] = settledBookings.map((b) => ({
    id: `settle_${b._id}`,
    title: `Pelunasan Sewa Kamar ${b.roomNumber || "101"}`,
    subtitle: `${b.customerName || "Customer"} • ${b.settlementPaymentMethod === "cash" ? "Tunai (Cash)" : "Transfer Bank"} Check-in`,
    date: b.settledAt ? new Date(b.settledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini",
    amount: `+ Rp ${(Number(b.settledAmount) || (Number(b.totalAmount || 0) - Number(b.dpAmount || 0)) || 0).toLocaleString("id-ID")}`,
    type: "income" as const,
    rawAmount: (Number(b.settledAmount) || (Number(b.totalAmount || 0) - Number(b.dpAmount || 0)) || 0),
    rawCategory: "Pelunasan Sewa",
    isManual: false,
  }));

  const allTransactions = [...settlementTxs, ...dpTxs, ...manualTx];

  const handleSaveTransaction = async () => {
    const numAmount = parseInt((txAmount || "").replace(/[^0-9]/g, "")) || 0;
    if (numAmount <= 0) {
      alert("Mohon masukkan nominal transaksi");
      return;
    }

    const chosenCat = txCategory.trim() || (txType === "expense" ? "Operasional" : "Pemasukan Lain");
    const finalTitle = txTitle.trim() || (txType === "expense" ? `Biaya ${chosenCat}` : `Pemasukan ${chosenCat}`);

    setIsSavingTx(true);
    try {
      const ownerEmail = authAccount?.email || authAccount?.id || "aisk@gmail.com";

      const res = await createOwnerTransaction({
        title: finalTitle,
        category: chosenCat,
        amount: numAmount,
        type: txType,
        ownerEmail: ownerEmail,
      });

      const saved = res?.data;
      const newTx: Transaction = {
        id: saved?._id ? saved._id.toString() : Date.now().toString(),
        title: finalTitle,
        subtitle: `${chosenCat} • Hari ini`,
        date: "Hari ini",
        amount: `${txType === "income" ? "+" : "-"} Rp ${numAmount.toLocaleString("id-ID")}`,
        type: txType,
        rawAmount: numAmount,
        rawCategory: chosenCat,
        isManual: true,
      };

      setManualTx((prev) => [newTx, ...prev]);
      setIsAddTxModalOpen(false);
      setTxTitle("");
      setTxAmount("");
      setTxCategory("");
      await loadFinancialData();
    } catch (err: any) {
      console.error("Gagal menyimpan transaksi ke database:", err);
      alert("Gagal menyimpan: " + (err.message || "Terjadi kesalahan jaringan"));
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    try {
      await deleteOwnerTransaction(txId);
      setManualTx((prev) => prev.filter((t) => t.id !== txId));
      await loadFinancialData();
    } catch (err) {
      console.error("Gagal menghapus transaksi:", err);
    }
  };

  const filteredTransactions = allTransactions.filter((t: Transaction) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTxFilter === "pendapatan") return matchesSearch && t.type === "income";
    if (activeTxFilter === "pengeluaran") return matchesSearch && t.type === "expense";
    return matchesSearch;
  });

  // Dynamic Komposisi Pengeluaran Breakdown
  const expenseTransactions = manualTx.filter((t) => t.type === "expense");
  const catExpensesMap: { [c: string]: number } = {};
  expenseTransactions.forEach((t) => {
    const cat = t.rawCategory || "Operasional";
    const amt = t.rawAmount || parseInt((t.amount || "").replace(/[^0-9]/g, "")) || 0;
    catExpensesMap[cat] = (catExpensesMap[cat] || 0) + amt;
  });

  const catColors = ["#0B5D3F", "#10B981", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const expenseBreakdown = Object.keys(catExpensesMap).map((cat, idx) => ({
    name: cat,
    amount: catExpensesMap[cat],
    percentage: totalPengeluaran > 0 ? Math.round((catExpensesMap[cat] / totalPengeluaran) * 100) : 0,
    color: catColors[idx % catColors.length],
  }));

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
              <Text style={styles.labaValue}>Rp {labaBersih.toLocaleString("id-ID")}</Text>

              <View style={styles.growthBadgeRow}>
                <View style={[styles.growthPill, labaBersih === 0 && { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <TrendingUp size={12} color={labaBersih === 0 ? "#FFFFFF" : "#0D7A53"} />
                  <Text style={[styles.growthPillText, labaBersih === 0 && { color: "#FFFFFF" }]}>
                    {labaBersih > 0 ? "+100%" : "0%"}
                  </Text>
                </View>
                <Text style={styles.growthSubtext}>
                  {occupiedRooms.length > 0 || validBookings.length > 0
                    ? `${occupiedRooms.length} kamar • ${validBookings.length} booking terdata`
                    : "Belum ada transaksi bulan ini"}
                </Text>
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
            <View style={[styles.statIconBg, { backgroundColor: totalPendapatan > 0 ? "#DCFCE7" : "#F3F4F6" }]}>
              <Wallet size={20} color={totalPendapatan > 0 ? "#0D7A53" : "#9CA3AF"} />
            </View>
            <Text style={styles.statCardLabel}>Pendapatan</Text>
            <Text style={styles.statCardVal}>Rp {totalPendapatan.toLocaleString("id-ID")}</Text>
            <View style={styles.statBadgeRow}>
              <View style={[styles.miniPill, { backgroundColor: totalPendapatan > 0 ? "#DCFCE7" : "#F3F4F6" }]}>
                <Text style={[styles.miniPillText, { color: totalPendapatan > 0 ? "#0D7A53" : "#6B7280" }]}>
                  {totalPendapatan > 0 ? "Kas Masuk" : "Rp 0"}
                </Text>
              </View>
              <Text style={styles.miniPillSub}>
                {totalPendapatan > 0 ? `${settledBookings.length} lunas & ${validBookings.length} DP` : "Belum ada pemasukan"}
              </Text>
            </View>
          </View>

          {/* Card 2: Pengeluaran */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: totalPengeluaran > 0 ? "#FEE2E2" : "#F3F4F6" }]}>
              <ArrowDownRight size={20} color={totalPengeluaran > 0 ? "#DC2626" : "#9CA3AF"} />
            </View>
            <Text style={styles.statCardLabel}>Pengeluaran</Text>
            <Text style={styles.statCardVal}>Rp {totalPengeluaran.toLocaleString("id-ID")}</Text>
            <View style={styles.statBadgeRow}>
              <View style={[styles.miniPill, { backgroundColor: totalPengeluaran > 0 ? "#FEE2E2" : "#F3F4F6" }]}>
                <Text style={[styles.miniPillText, { color: totalPengeluaran > 0 ? "#DC2626" : "#6B7280" }]}>
                  {totalPengeluaran > 0 ? "Rutin" : "Rp 0"}
                </Text>
              </View>
              <Text style={styles.miniPillSub}>
                {totalPengeluaran > 0 ? "Biaya operasional" : "Belum ada pengeluaran"}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Rincian Sumber Pendapatan */}
        <View style={[styles.chartCard, { marginBottom: 14 }]}>
          <Text style={styles.chartCardTitle}>Rincian Sumber Pendapatan</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {/* Item 1: DP Booking Customer */}
            <View style={styles.breakdownItemRow}>
              <View style={styles.breakdownItemLeft}>
                <View style={[styles.statIconBgSmall, { backgroundColor: "#FEF3C7" }]}>
                  <Receipt size={16} color="#D97706" />
                </View>
                <View style={styles.breakdownTextCol}>
                  <Text style={styles.breakdownItemTitle} numberOfLines={1}>Penerimaan DP (20%)</Text>
                  <Text style={styles.breakdownItemSub}>{validBookings.length} booking via transfer</Text>
                </View>
              </View>
              <Text style={[styles.breakdownItemAmount, { color: totalDpCustomer > 0 ? "#D97706" : "#111827" }]} numberOfLines={1}>
                Rp {totalDpCustomer.toLocaleString("id-ID")}
              </Text>
            </View>

            {/* Item 2: Pelunasan Check-in */}
            <View style={styles.breakdownItemRow}>
              <View style={styles.breakdownItemLeft}>
                <View style={[styles.statIconBgSmall, { backgroundColor: "#DCFCE7" }]}>
                  <Building2 size={16} color="#0D7A53" />
                </View>
                <View style={styles.breakdownTextCol}>
                  <Text style={styles.breakdownItemTitle} numberOfLines={1}>Pelunasan Sewa (80%)</Text>
                  <Text style={styles.breakdownItemSub}>{settledBookings.length} check-in lunas</Text>
                </View>
              </View>
              <Text style={[styles.breakdownItemAmount, { color: totalPelunasanCustomer > 0 ? "#0D7A53" : "#111827" }]} numberOfLines={1}>
                Rp {totalPelunasanCustomer.toLocaleString("id-ID")}
              </Text>
            </View>

            {/* Item 3: Sisa Piutang Check-in (jika ada belum lunas) */}
            {totalPiutangBelumLunas > 0 && (
              <View style={styles.breakdownItemRow}>
                <View style={styles.breakdownItemLeft}>
                  <View style={[styles.statIconBgSmall, { backgroundColor: "#FEE2E2" }]}>
                    <AlertTriangle size={16} color="#DC2626" />
                  </View>
                  <View style={styles.breakdownTextCol}>
                    <Text style={styles.breakdownItemTitle} numberOfLines={1}>Sisa Piutang Check-in</Text>
                    <Text style={styles.breakdownItemSub}>{unsettledBookings.length} belum lunas</Text>
                  </View>
                </View>
                <Text style={[styles.breakdownItemAmount, { color: "#DC2626" }]} numberOfLines={1}>
                  Rp {totalPiutangBelumLunas.toLocaleString("id-ID")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section: Rekening Pembayaran & QRIS Pemilik */}
        <View style={[styles.chartCard, { marginBottom: 14 }]}>
          <View style={styles.chartHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 10 }}>
              <View style={[styles.statIconBgSmall, { backgroundColor: "#E8F5EE" }]}>
                {paymentType === "qris" ? (
                  <QrCode size={16} color="#0D7A53" />
                ) : (
                  <CreditCard size={16} color="#0D7A53" />
                )}
              </View>
              <Text style={[styles.chartCardTitle, { flex: 1, fontSize: 14.5 }]} numberOfLines={1}>
                {paymentType === "qris" ? "Metode DP: Barcode QRIS" : "Metode DP: Rekening Bank"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ubahPillBtn}
              onPress={() => setIsBankModalOpen(true)}
              activeOpacity={0.7}
            >
              <Edit3 size={12} color="#0D7A53" />
              <Text style={styles.ubahPillText}>Ubah</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bankAccountDisplayBox}>
            {paymentType === "qris" ? (
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                {qrisImage ? (
                  <TouchableOpacity
                    style={styles.qrisThumbnailWrap}
                    onPress={() => setIsBankModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: qrisImage }} style={styles.qrisThumbImg} />
                    <View style={styles.qrisMiniTag}>
                      <QrCode size={10} color="#FFFFFF" />
                      <Text style={styles.qrisMiniTagText}>QRIS</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.qrisPlaceholderWrap}
                    onPress={() => setIsBankModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <QrCode size={22} color="#9CA3AF" />
                    <Text style={styles.qrisPlaceholderText}>+ Upload QRIS</Text>
                  </TouchableOpacity>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#111827" }}>
                      QRIS All Payment
                    </Text>
                    <View style={styles.verifiedBadgeMini}>
                      <ShieldCheck size={11} color="#0D7A53" />
                      <Text style={styles.verifiedBadgeMiniText}>Aktif</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#0D7A53" }}>
                    a.n. {accountHolder || "Ais Kost Management"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    Customer membayar DP via scan QRIS
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#111827" }}>
                    {bankName || "BCA"}
                  </Text>
                  <View style={styles.verifiedBadgeMini}>
                    <ShieldCheck size={11} color="#0D7A53" />
                    <Text style={styles.verifiedBadgeMiniText}>Aktif</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#0D7A53", letterSpacing: 0.5 }}>
                  {accountNumber || "Belum diatur"}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  a.n. {accountHolder || "Ais Kost Management"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 3: Pendapatan Bulanan Line Chart */}
        {(() => {
          // Dynamic Month Timeline (7 months ending on selectedMonth)
          const selectedMonthName = selectedMonth.split(" ")[0];
          const selMonthIdx = monthNames.indexOf(selectedMonthName) !== -1 ? monthNames.indexOf(selectedMonthName) : currentMonthIdx;
          const chartMonthLabels = Array.from({ length: 7 }, (_, i) => {
            const idx = (selMonthIdx - 6 + i + 12) % 12;
            return monthShortNames[idx];
          });

          // Dynamic Proportional Y-Scale
          let maxScale = 1_000_000;
          let yLabelTop = "1 jt";
          let yLabelMidHigh = "700 rb";
          let yLabelMidLow = "350 rb";

          if (totalPendapatan > 2_000_000) {
            const scaleMil = Math.max(4, Math.ceil(totalPendapatan / 1_000_000));
            maxScale = scaleMil * 1_000_000;
            yLabelTop = `${scaleMil} jt`;
            yLabelMidHigh = `${(scaleMil * 0.66).toFixed(1)} jt`;
            yLabelMidLow = `${(scaleMil * 0.33).toFixed(1)} jt`;
          } else if (totalPendapatan > 1_000_000) {
            maxScale = 2_000_000;
            yLabelTop = "2 jt";
            yLabelMidHigh = "1.4 jt";
            yLabelMidLow = "700 rb";
          } else {
            maxScale = 1_000_000;
            yLabelTop = "1 jt";
            yLabelMidHigh = "700 rb";
            yLabelMidLow = "350 rb";
          }

          const fraction = Math.min(1, Math.max(0, totalPendapatan / maxScale));
          const activeY = totalPendapatan > 0 ? 105 - (fraction * 90) : 105;

          return (
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
                {/* Tooltip Badge dynamically positioned above the active dot */}
                {totalPendapatan > 0 && (
                  <View style={[styles.chartTooltipBadge, { top: Math.max(-10, activeY - 26) }]}>
                    <Text style={styles.chartTooltipText}>Rp {totalPendapatan.toLocaleString("id-ID")}</Text>
                  </View>
                )}

                <Svg height="150" width="100%" viewBox="0 0 300 135">
                  <Defs>
                    <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#0D7A53" stopOpacity={totalPendapatan > 0 ? 0.25 : 0.05} />
                      <Stop offset="100%" stopColor="#0D7A53" stopOpacity="0.0" />
                    </LinearGradient>
                  </Defs>

                  {/* Y Grid lines */}
                  <Path d="M 28 15 L 290 15" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                  <Path d="M 28 45 L 290 45" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                  <Path d="M 28 75 L 290 75" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3 3" />
                  <Path d="M 28 105 L 290 105" stroke="#E5E7EB" strokeWidth="1" />

                  {/* Y Axis Labels (Scaled to actual values) */}
                  <SvgText fontSize="9" fill="#9CA3AF" x="0" y="18" fontWeight="600">
                    {yLabelTop}
                  </SvgText>
                  <SvgText fontSize="9" fill="#9CA3AF" x="0" y="48" fontWeight="600">
                    {yLabelMidHigh}
                  </SvgText>
                  <SvgText fontSize="9" fill="#9CA3AF" x="0" y="78" fontWeight="600">
                    {yLabelMidLow}
                  </SvgText>
                  <SvgText fontSize="9" fill="#9CA3AF" x="0" y="108" fontWeight="600">
                    0
                  </SvgText>

                  {totalPendapatan > 0 ? (
                    <>
                      {/* Area Gradient Fill under Curve */}
                      <Path
                        d={`M 38 105 L 198 105 C 225 105, 255 ${activeY}, 278 ${activeY} L 278 105 L 38 105 Z`}
                        fill="url(#chartGradient)"
                      />
                      {/* Smooth Continuous Line Curve to Proportional Active Dot */}
                      <Path
                        d={`M 38 105 L 198 105 C 225 105, 255 ${activeY}, 278 ${activeY}`}
                        fill="none"
                        stroke="#0D7A53"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Circle cx="38" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="78" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="118" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="158" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="198" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="238" cy={105 - (activeY < 105 ? ((105 - activeY) * 0.3) : 0)} r="3.5" fill="#0D7A53" />
                      <Circle cx="278" cy={activeY} r="6.5" fill="#0D7A53" stroke="#FFFFFF" strokeWidth="2.5" />
                    </>
                  ) : (
                    <>
                      {/* Baseline 0 Line */}
                      <Path
                        d="M 38 105 L 278 105"
                        fill="none"
                        stroke="#0D7A53"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <Circle cx="38" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="78" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="118" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="158" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="198" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="238" cy="105" r="3" fill="#D1D5DB" />
                      <Circle cx="278" cy="105" r="6" fill="#0D7A53" stroke="#FFFFFF" strokeWidth="2" />
                    </>
                  )}

                  {/* X Axis Month Labels precisely centered below each dot (Ending in selected month, e.g. Sep) */}
                  {chartMonthLabels.map((mLabel, mIdx) => {
                    const cx = 38 + mIdx * 40;
                    const isCurrent = mIdx === 6;
                    return (
                      <SvgText
                        key={mIdx}
                        fontSize="10"
                        fill={isCurrent ? "#0D7A53" : "#9CA3AF"}
                        x={cx}
                        y="124"
                        textAnchor="middle"
                        fontWeight={isCurrent ? "800" : "500"}
                      >
                        {mLabel}
                      </SvgText>
                    );
                  })}
                </Svg>
              </View>
            </View>
          );
        })()}

        {/* Section 4: Komposisi Pengeluaran Donut Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Komposisi Pengeluaran</Text>

          <View style={styles.donutRow}>
            {/* SVG Donut Chart */}
            <View style={styles.donutContainer}>
              <Svg height="140" width="140" viewBox="0 0 140 140">
                {totalPengeluaran > 0 && expenseBreakdown.length > 0 ? (
                  (() => {
                    let cumulativeOffset = 0;
                    const circumference = 326.7; // 2 * PI * 52
                    return expenseBreakdown.map((item, idx) => {
                      const strokeLength = Math.max(8, (item.percentage / 100) * circumference);
                      const dashArray = `${strokeLength} ${circumference - strokeLength}`;
                      const currentOffset = cumulativeOffset;
                      cumulativeOffset -= strokeLength;
                      return (
                        <Circle
                          key={idx}
                          cx="70"
                          cy="70"
                          r="52"
                          stroke={item.color}
                          strokeWidth="15"
                          fill="transparent"
                          strokeDasharray={dashArray}
                          strokeDashoffset={currentOffset}
                          strokeLinecap="round"
                        />
                      );
                    });
                  })()
                ) : (
                  <Circle
                    cx="70"
                    cy="70"
                    r="52"
                    stroke="#E5E7EB"
                    strokeWidth="14"
                    fill="transparent"
                  />
                )}
              </Svg>

              {/* Center Donut Label */}
              <View style={styles.donutCenterLabelWrap}>
                <Text style={styles.donutCenterSub}>Total</Text>
                <Text style={styles.donutCenterVal}>Rp {totalPengeluaran.toLocaleString("id-ID")}</Text>
              </View>
            </View>

            {/* Donut Legend Column */}
            <View style={styles.legendCol}>
              {totalPengeluaran > 0 && expenseBreakdown.length > 0 ? (
                expenseBreakdown.map((item, idx) => (
                  <View key={idx} style={styles.legendRowItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabelText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.legendValText}>{item.percentage}%</Text>
                  </View>
                ))
              ) : (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280" }}>Belum Ada Pengeluaran</Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 16 }}>
                    Gunakan tombol (+) untuk mencatat pengeluaran operasional / listrik / air kost Anda.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Section 5: Transaksi Terbaru */}
        <View style={styles.txSectionHeaderRow}>
          <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
          {filteredTransactions.length > 0 && (
            <TouchableOpacity style={styles.seeDetailBtn} activeOpacity={0.7}>
              <Text style={styles.seeDetailText}>Lihat Semua</Text>
              <ChevronRight size={14} color="#0D7A53" />
            </TouchableOpacity>
          )}
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
        {filteredTransactions.length > 0 ? (
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.txTitleText}>{tx.title}</Text>
                    {tx.isManual && (
                      <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", color: "#6B7280" }}>Manual</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.txSubText}>{tx.subtitle}</Text>
                </View>

                <View style={styles.txAmountCol}>
                  <Text style={[styles.txAmountVal, tx.type === "income" ? styles.incomeText : styles.expenseText]}>
                    {tx.amount}
                  </Text>
                  {tx.isManual ? (
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(tx.id)}
                      style={{ padding: 4 }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  ) : (
                    <ChevronRight size={14} color="#D1D5DB" />
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.txCardGroup, { padding: 24, alignItems: "center", justifyContent: "center" }]}>
            <Receipt size={36} color="#D1D5DB" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#4B5563", marginBottom: 4 }}>
              Belum Ada Riwayat Transaksi
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
              Penerimaan DP booking customer atau sewa bulanan otomatis muncul di sini.
            </Text>
          </View>
        )}

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
            <Text style={styles.ringkasanVal}>Rp {totalPendapatan.toLocaleString("id-ID")}</Text>

            <View style={styles.ringkasanSplitRow}>
              <View>
                <Text style={styles.splitSub}>DP (20%)</Text>
                <Text style={styles.splitVal}>Rp {totalDpCustomer.toLocaleString("id-ID")}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.splitSub}>Pelunasan (80%)</Text>
                <Text style={styles.splitVal}>Rp {totalPelunasanCustomer.toLocaleString("id-ID")}</Text>
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
                <Text style={styles.insightItemText}>
                  {totalPendapatan > 0 ? `Kas Masuk Rp ${totalPendapatan.toLocaleString("id-ID")}` : "Belum ada catatan pendapatan"}
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Users size={12} color="#2563EB" />
                <Text style={styles.insightItemText}>
                  Okupansi {rooms.length > 0 ? `${Math.round((occupiedRooms.length / rooms.length) * 100)}%` : "0%"} ({occupiedRooms.length}/{rooms.length} kamar)
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Receipt size={12} color="#D97706" />
                <Text style={styles.insightItemText}>
                  {validBookings.length} booking terdata ({settledBookings.length} lunas)
                </Text>
              </View>
              <View style={styles.insightItem}>
                <CheckCircle2 size={12} color="#0D7A53" />
                <Text style={styles.insightItemText}>
                  {totalPengeluaran === 0 ? "Pengeluaran Rp 0 terkontrol" : `Pengeluaran Rp ${totalPengeluaran.toLocaleString("id-ID")}`}
                </Text>
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

            <Text style={styles.label}>Kategori / Keperluan</Text>
            {/* Quick Category Chips */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {(txType === "expense"
                ? ["Listrik", "Air", "Kebersihan", "Perbaikan", "Operasional", "Lainnya"]
                : ["Sewa Kamar", "DP Booking", "Denda", "Lainnya"]
              ).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.txFilterChip,
                    { paddingHorizontal: 10, paddingVertical: 6, marginBottom: 0 },
                    txCategory === cat && styles.txFilterChipActive,
                  ]}
                  onPress={() => {
                    setTxCategory(cat);
                    if (!txTitle || txTitle.startsWith("Biaya ") || txTitle.startsWith("Pemasukan ")) {
                      setTxTitle(txType === "expense" ? `Biaya ${cat}` : `Pemasukan ${cat}`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.txFilterChipText,
                      { fontSize: 11 },
                      txCategory === cat && styles.txFilterChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={txCategory}
              onChangeText={setTxCategory}
              placeholder="Atau ketik kategori custom..."
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Jumlah (Rp)</Text>
            <TextInput
              style={styles.input}
              value={txAmount}
              onChangeText={(text) => {
                const numeric = text.replace(/[^0-9]/g, "");
                if (numeric) {
                  setTxAmount(Number(numeric).toLocaleString("id-ID"));
                } else {
                  setTxAmount("");
                }
              }}
              placeholder="Cth: 150.000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.btnPrimary, isSavingTx && { opacity: 0.7 }]}
              onPress={handleSaveTransaction}
              disabled={isSavingTx}
              activeOpacity={0.85}
            >
              {isSavingTx ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>Simpan ke Database</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Atur Rekening Pembayaran & QRIS */}
      <Modal visible={isBankModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addTxCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Metode Pembayaran DP</Text>
                <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                  Pilih 1 metode yang ingin digunakan customer untuk transfer DP
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsBankModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Selector Tab: Bank vs QRIS */}
            <Text style={styles.label}>Pilih Metode yang Diterapkan</Text>
            <View style={styles.txTypeRow}>
              <TouchableOpacity
                style={[styles.txTypeBtn, paymentType === "bank" && styles.txTypeBtnIncome]}
                onPress={() => setPaymentType("bank")}
                activeOpacity={0.7}
              >
                <Text style={[styles.txTypeText, paymentType === "bank" && styles.txTypeTextActive]}>
                  🏦 Rekening Bank
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.txTypeBtn, paymentType === "qris" && styles.txTypeBtnIncome]}
                onPress={() => setPaymentType("qris")}
                activeOpacity={0.7}
              >
                <Text style={[styles.txTypeText, paymentType === "qris" && styles.txTypeTextActive]}>
                  📱 Barcode QRIS
                </Text>
              </TouchableOpacity>
            </View>

            {paymentType === "bank" ? (
              <>
                <Text style={styles.label}>Pilih Bank / E-Wallet</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {["BCA", "Mandiri", "BRI", "BNI", "Seabank", "BSI", "Bank Jago", "Dana", "GoPay"].map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.txFilterChip,
                        { paddingHorizontal: 10, paddingVertical: 6, marginBottom: 0 },
                        bankName === b && styles.txFilterChipActive,
                      ]}
                      onPress={() => setBankName(b)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.txFilterChipText,
                          { fontSize: 11 },
                          bankName === b && styles.txFilterChipTextActive,
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Nomor Rekening / No. E-Wallet</Text>
                <TextInput
                  style={styles.input}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Cth: 7720192841"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />

                <Text style={styles.label}>Nama Pemilik Rekening (Atas Nama)</Text>
                <TextInput
                  style={styles.input}
                  value={accountHolder}
                  onChangeText={setAccountHolder}
                  placeholder="Cth: Ais Kost Management"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Upload Foto Barcode QRIS</Text>
                <TouchableOpacity
                  style={styles.qrisUploadBox}
                  onPress={handlePickQrisImage}
                  activeOpacity={0.8}
                >
                  {isUploadingQris ? (
                    <View style={{ alignItems: "center", padding: 14 }}>
                      <ActivityIndicator size="small" color="#0D7A53" />
                      <Text style={{ fontSize: 11, color: "#0D7A53", marginTop: 6, fontWeight: "700" }}>
                        Mengunggah QRIS...
                      </Text>
                    </View>
                  ) : qrisImage ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 8 }}>
                      <Image source={{ uri: qrisImage }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: "#166534" }}>✓ Foto Barcode QRIS Terpilih</Text>
                        <Text style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>Ketuk untuk mengganti foto QRIS</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center", padding: 14 }}>
                      <QrCode size={24} color="#0D7A53" />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#111827", marginTop: 4 }}>
                        Pilih Gambar Barcode QRIS
                      </Text>
                      <Text style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>
                        Format JPG, PNG (Maks 5MB)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Nama Akun QRIS / Nama Usaha</Text>
                <TextInput
                  style={styles.input}
                  value={accountHolder}
                  onChangeText={setAccountHolder}
                  placeholder="Cth: Ais Kost Management"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 16 }, isSavingBank && { opacity: 0.7 }]}
              onPress={handleSaveBankAccount}
              disabled={isSavingBank}
              activeOpacity={0.85}
            >
              {isSavingBank ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  Terapkan {paymentType === "qris" ? "Barcode QRIS" : "Rekening Bank"}
                </Text>
              )}
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
  breakdownItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  breakdownItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 10,
  },
  breakdownTextCol: {
    flex: 1,
  },
  statIconBgSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownItemTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1F2937",
  },
  breakdownItemSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  breakdownItemAmount: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0D7A53",
    textAlign: "right",
    flexShrink: 0,
  },

  // Bank & QRIS Styles
  bankAccountDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 10,
    gap: 12,
  },
  verifiedBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeMiniText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  qrisThumbnailWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    position: "relative",
  },
  qrisThumbImg: {
    width: "100%",
    height: "100%",
  },
  qrisMiniTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(13, 122, 83, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    gap: 2,
  },
  qrisMiniTagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  qrisPlaceholderWrap: {
    width: 80,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  qrisPlaceholderText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 2,
  },
  qrisUploadBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#0D7A53",
    borderRadius: 14,
    overflow: "hidden",
  },
  ubahPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(13, 122, 83, 0.15)",
  },
  ubahPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
});
