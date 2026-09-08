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
  Image,
  ActivityIndicator,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { Linking } from "react-native";
import {
  fetchTenantsByOwner,
  addTenantToKost,
  updateTenantInKost,
  deleteTenantFromKost,
  settleKostBooking,
} from "../../services/kostService";
import {
  Search,
  Plus,
  Minus,
  X,
  Phone,
  Calendar,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Home,
  Building2,
  Users,
  Wallet,
  User,
  CheckSquare,
  AlertCircle,
  ChevronDown,
  DollarSign,
  Pencil,
  Trash2,
  MessageCircle,
  CheckCircle2,
  CreditCard,
  Banknote,
  Receipt,
  Check,
  Camera,
  UploadCloud,
  Eye,
  Maximize2,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react-native";

interface TenantData {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  name: string;
  avatar: string;
  status: "aktif" | "akan_keluar";
  roomNumber: string;
  roomType: string;
  phone: string;
  entryDate: string;
  daysLeft: number;
  priceMonth: string;
  totalAmount?: number;
  dpAmount?: number;
  settledAmount?: number;
  remainingAmount?: number;
  isSettled?: boolean;
  settlementMethod?: "transfer" | "cash";
  settledAt?: string;
  settlementNotes?: string;
  settlementProofImage?: string;
  dpProofImage?: string;
  dpPaidAt?: string;
  dpVerifiedAt?: string;
  customerEmail?: string;
  durationMonths?: number;
}

interface ManajemenPenghuniProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const ManajemenPenghuniScreen: React.FC<ManajemenPenghuniProps> = ({ navigate, authAccount }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("penghuni");

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter Chip State
  const [activeFilter, setActiveFilter] = useState<"semua" | "aktif" | "akan_keluar">("semua");

  // State for Options Bottom Sheet
  const [selectedTenantForOptions, setSelectedTenantForOptions] = useState<TenantData | null>(null);

  // State for Check-in Settlement Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlingTenant, setSettlingTenant] = useState<TenantData | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<"transfer" | "cash">("transfer");
  const [settlementAmountInput, setSettlementAmountInput] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [settlementProofImage, setSettlementProofImage] = useState<string | null>(null);
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  // State for Receipt & Payment History Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [viewingReceiptTenant, setViewingReceiptTenant] = useState<TenantData | null>(null);
  const [fullImagePreviewUrl, setFullImagePreviewUrl] = useState<string | null>(null);

  // State for Add/Edit Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Form States for Modal
  const [namaLengkap, setNamaLengkap] = useState("");
  const [noHp, setNoHp] = useState("");
  const [nomorKamar, setNomorKamar] = useState("");
  const [tipeKamar, setTipeKamar] = useState("Tipe AC");
  const [tanggalMasuk, setTanggalMasuk] = useState("10/08/26");
  const [hargaSewa, setHargaSewa] = useState("1.200.000");
  const [durasiSewa, setDurasiSewa] = useState("1");

  // Dropdown Picker State
  const [isTipeKamarDropdownOpen, setIsTipeKamarDropdownOpen] = useState(false);
  const tipeKamarOptions = ["Tipe AC", "Tipe Standar", "Tipe VIP", "Tipe Deluxe"];

  // Date Picker Modal State (Material 3 style)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(7); // 0-indexed: 7 = August
  const [calYear, setCalYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(13);

  const monthNamesEng = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeekEng = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthShortEng = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const getFormattedHeaderDate = (day: number, month: number, year: number) => {
    const d = new Date(year, month, day);
    const dayName = daysOfWeekEng[d.getDay()];
    const monthName = monthShortEng[month];
    return `${dayName}, ${monthName} ${day}`;
  };

  const handleConfirmDate = (day: number, month: number, year: number) => {
    const dd = String(day).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    const yy = String(year).slice(-2);
    setTanggalMasuk(`${dd}/${mm}/${yy}`);
    setIsDatePickerOpen(false);
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantData[]>([]);

  const ownerEmail = authAccount?.email || authAccount?.id || "aisk@gmail.com";

  const loadTenantsFromBackend = async () => {
    setLoading(true);
    try {
      const data = await fetchTenantsByOwner(ownerEmail);
      setTenants(data || []);
    } catch (err) {
      console.warn("Using offline tenants:", err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantsFromBackend();
  }, [authAccount]);

  const handleSendWhatsAppReminder = (tenant: TenantData) => {
    const cleanPhone = (tenant.phone || "081234567890").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const rawPrice = (tenant.priceMonth || "700.000").replace(/^Rp\s*/, "");
    const formattedPrice = `Rp ${rawPrice}`;
    const duration = tenant.durationMonths || 1;

    let msg = "";
    if (duration > 1) {
      // Sewa > 1 bulan: Pengingat tagihan sewa bulanan / sisa periode berjalan
      msg = `Halo Kak *${tenant.name}*,\n\nKami dari pengelola *Ais Kost Exclusive* ingin menginformasikan tagihan sewa kamar *${tenant.roomNumber}* sebesar *${formattedPrice}*.\nSisa periode sewa Anda: *${tenant.daysLeft} hari lagi*.\n\nPembayaran dapat ditransfer ke rekening bank/QRIS pemilik kos. Jika sudah transfer, mohon kirimkan bukti pembayarannya ya Kak. Terima kasih! 🙏`;
    } else {
      // Sewa 1 bulan: Masa sewa akan habis, konfirmasi apakah mau memperpanjang atau checkout
      msg = `Halo Kak *${tenant.name}*,\n\nKami dari pengelola *Ais Kost Exclusive* ingin menginformasikan bahwa masa sewa kamar *${tenant.roomNumber}* Anda tersisa *${tenant.daysLeft} hari lagi*.\n\nApakah Kakak berencana untuk *memperpanjang sewa* untuk bulan berikutnya atau *selesai (checkout)* di akhir periode ini?\n\n• *Jika ingin memperpanjang*: Kakak dapat melakukan transfer sewa sebesar *${formattedPrice}* ke rekening pemilik kos dan kirim bukti transfernya ke sini.\n• *Jika selesai sewa*: Mohon konfirmasikan tanggal & jam rencana checkout Kakak agar kami dapat mempersiapkan proses serah terima kamar.\n\nTerima kasih banyak atas kerjasamanya! 🙏✨`;
    }

    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingTenantId(null);
    setNamaLengkap("");
    setNoHp("");
    setNomorKamar("");
    setTipeKamar("Tipe AC");
    setTanggalMasuk("10/08/26");
    setHargaSewa("1.200.000");
    setDurasiSewa("1");
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (t: TenantData) => {
    setModalMode("edit");
    setEditingTenantId(t.id);
    setNamaLengkap(t.name);
    setNoHp(t.phone);
    setNomorKamar(t.roomNumber);
    setTipeKamar(t.roomType);
    setTanggalMasuk(t.entryDate);
    setHargaSewa(t.priceMonth.replace("Rp ", "").replace(".", ""));
    setDurasiSewa(String(t.durationMonths || 1));
    setSelectedTenantForOptions(null);
    setIsAddModalOpen(true);
  };

  // Save Tenant Handler
  const handleSaveTenant = async () => {
    if (!namaLengkap) return;
    const months = parseInt(durasiSewa) || 1;
    const cleanPrice = hargaSewa ? `Rp ${hargaSewa}` : "Rp 700.000";

    if (modalMode === "edit" && editingTenantId) {
      const existingTenant = tenants.find((t) => t.id === editingTenantId);
      let newDaysLeft = existingTenant?.daysLeft || (months * 30);
      try {
        const now = new Date();
        const targetDueDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
        newDaysLeft = Math.max(0, Math.ceil((targetDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } catch {}

      setTenants(
        tenants.map((t) =>
          t.id === editingTenantId
            ? {
                ...t,
                name: namaLengkap,
                phone: noHp || t.phone,
                roomNumber: nomorKamar || t.roomNumber,
                roomType: tipeKamar,
                entryDate: tanggalMasuk || t.entryDate,
                priceMonth: cleanPrice,
                durationMonths: months,
                daysLeft: newDaysLeft,
                status: newDaysLeft <= 10 ? "akan_keluar" : "aktif",
              }
            : t
        )
      );

      try {
        await updateTenantInKost(ownerEmail, editingTenantId, {
          name: namaLengkap,
          phone: noHp,
          roomNumber: nomorKamar,
          roomType: tipeKamar,
          entryDate: tanggalMasuk,
          priceMonthly: hargaSewa,
          durationMonths: months,
        });
      } catch (e) {
        console.log("Offline update tenant:", e);
      }
    } else {
      const newTenant: TenantData = {
        id: Date.now().toString(),
        name: namaLengkap,
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
        status: "aktif",
        roomNumber: nomorKamar || "101",
        roomType: tipeKamar,
        phone: noHp || "081299998888",
        entryDate: tanggalMasuk || "10 Ags 2026",
        daysLeft: months * 30,
        priceMonth: cleanPrice,
        durationMonths: months,
      };
      setTenants([newTenant, ...tenants]);
      try {
        await addTenantToKost(ownerEmail, {
          name: namaLengkap,
          phone: noHp,
          roomNumber: nomorKamar || "101",
          entryDate: new Date().toISOString(),
          durationMonths: months,
        });
      } catch (e) {
        console.log("Offline add tenant:", e);
      }
    }
    setIsAddModalOpen(false);
  };

  // Delete Tenant
  const handleDeleteTenant = async (id: string) => {
    setTenants(tenants.filter((t) => t.id !== id));
    setSelectedTenantForOptions(null);
    try {
      await deleteTenantFromKost(ownerEmail, id);
    } catch (e) {
      console.log("Offline delete tenant:", e);
    }
  };

  // Check-in Settlement Handlers
  const handlePickProofImage = () => {
    if (typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setSettlementProofImage(base64);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handleOpenSettlementModal = (tenant: TenantData) => {
    setSelectedTenantForOptions(null);
    setSettlingTenant(tenant);
    const total = tenant.totalAmount || parseInt((tenant.priceMonth || "").replace(/[^0-9]/g, "")) || 700000;
    const dp = tenant.dpAmount !== undefined ? tenant.dpAmount : Math.round(total * 0.2);
    const rem = tenant.remainingAmount !== undefined ? tenant.remainingAmount : (total - dp);
    setSettlementAmountInput(rem.toString());
    setSettlementMethod("transfer");
    setSettlementNotes("Pelunasan sewa check-in hari pertama");
    setSettlementProofImage(null);
    setIsSettlementModalOpen(true);
  };

  const handleConfirmSettlement = async () => {
    if (!settlingTenant) return;
    setIsSubmittingSettlement(true);
    try {
      const amountNum = parseInt(settlementAmountInput.replace(/[^0-9]/g, "")) || settlingTenant.remainingAmount || 0;
      if (settlingTenant.bookingId) {
        await settleKostBooking(settlingTenant.bookingId, {
          paymentMethod: settlementMethod,
          settledAmount: amountNum,
          notes: settlementNotes,
          proofImage: settlementProofImage || undefined,
        });
      }
      setTenants((prev) =>
        prev.map((t) =>
          t.id === settlingTenant.id
            ? {
                ...t,
                isSettled: true,
                settledAmount: amountNum,
                remainingAmount: 0,
                settlementMethod: settlementMethod,
                settledAt: new Date().toISOString(),
                settlementProofImage: settlementProofImage || undefined,
              }
            : t
        )
      );
      setIsSettlementModalOpen(false);
      await loadTenantsFromBackend();
    } catch (err) {
      console.error("Settlement error:", err);
      setTenants((prev) =>
        prev.map((t) =>
          t.id === settlingTenant.id
            ? {
                ...t,
                isSettled: true,
                remainingAmount: 0,
                settlementMethod: settlementMethod,
                settlementProofImage: settlementProofImage || undefined,
              }
            : t
        )
      );
      setIsSettlementModalOpen(false);
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Dynamic Counters
  const totalPenghuni = tenants.length;
  const aktifCount = tenants.filter((t) => t.status === "aktif").length;
  const akanKeluarCount = tenants.filter((t) => t.status === "akan_keluar").length;
  const aktifPercentage = totalPenghuni > 0 ? Math.round((aktifCount / totalPenghuni) * 100) : 0;
  const akanKeluarPercentage = totalPenghuni > 0 ? Math.round((akanKeluarCount / totalPenghuni) * 100) : 0;

  // Real Cash In & Pending Check-in Settlement
  const totalReceivedCash = tenants.reduce((acc, t) => {
    const total = t.totalAmount || parseInt((t.priceMonth || "").replace(/[^0-9]/g, "")) || 0;
    const dp = t.dpAmount !== undefined ? t.dpAmount : Math.round(total * 0.2);
    if (t.isSettled) {
      return acc + (t.settledAmount ? (dp + t.settledAmount) : total);
    }
    return acc + dp;
  }, 0);

  const totalPendingSettlement = tenants.reduce((acc, t) => {
    if (t.isSettled) return acc;
    const total = t.totalAmount || parseInt((t.priceMonth || "").replace(/[^0-9]/g, "")) || 0;
    const dp = t.dpAmount !== undefined ? t.dpAmount : Math.round(total * 0.2);
    const rem = t.remainingAmount !== undefined ? t.remainingAmount : (total - dp);
    return acc + rem;
  }, 0);

  // Filtered Tenant List
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery);

    if (activeFilter === "aktif") return matchesSearch && t.status === "aktif";
    if (activeFilter === "akan_keluar") return matchesSearch && t.status === "akan_keluar";
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
            <Text style={styles.headerTitle}>Manajemen Penghuni</Text>
            <Text style={styles.headerSubtitle}>Kelola semua penghuni kos Anda</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconCircleBtn, isSearchVisible && { backgroundColor: "#E8F5EE" }]}
              onPress={() => setIsSearchVisible(!isSearchVisible)}
              activeOpacity={0.7}
            >
              <Search size={20} color={isSearchVisible ? "#0D7A53" : "#374151"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addCircleBtn}
              onPress={handleOpenAddModal}
              activeOpacity={0.8}
            >
              <Plus size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input Bar */}
        {isSearchVisible && (
          <View style={{ marginBottom: 16 }}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari nama, kamar, no HP..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* 3 Summary Cards */}
        <View style={styles.summaryRow}>
          {/* Card 1: Total Penghuni */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Penghuni</Text>
            <Text style={styles.summaryVal}>{totalPenghuni}</Text>
            <Text style={styles.summarySubtext}>Orang</Text>
          </View>

          {/* Card 2: Aktif */}
          <View style={styles.summaryCard}>
            <View style={styles.labelWithDot}>
              <Text style={[styles.summaryLabel, { color: "#0D7A53" }]}>Aktif</Text>
              <CheckSquare size={12} color="#0D7A53" style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.summaryVal, { color: "#0D7A53" }]}>{aktifCount}</Text>
            <Text style={[styles.summarySubtext, { color: "#0D7A53" }]}>{aktifPercentage}%</Text>
          </View>

          {/* Card 3: Akan Keluar */}
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: "#DC2626" }]}>Akan Keluar</Text>
            <Text style={[styles.summaryVal, { color: "#DC2626" }]}>{akanKeluarCount}</Text>
            <Text style={[styles.summarySubtext, { color: "#DC2626" }]}>{akanKeluarPercentage}%</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "semua" && styles.filterChipActive]}
            onPress={() => setActiveFilter("semua")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "semua" && styles.filterChipTextActive]}>
              Semua ({totalPenghuni})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "aktif" && styles.filterChipActive]}
            onPress={() => setActiveFilter("aktif")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "aktif" && styles.filterChipTextActive]}>
              Aktif ({aktifCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "akan_keluar" && styles.filterChipActive]}
            onPress={() => setActiveFilter("akan_keluar")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === "akan_keluar" && styles.filterChipTextActive]}>
              Akan Keluar ({akanKeluarCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tenant Cards List or Empty State */}
        {tenants.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: "#FFFFFF", borderRadius: 16, marginTop: 8, marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
              <Users size={32} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 }}>
              Belum Ada Penghuni
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", paddingHorizontal: 16, lineHeight: 20 }}>
              Daftar penghuni kos Anda akan otomatis terisi saat pesanan booking customer Anda verifikasi, atau Anda dapat menambahkannya secara manual.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2563EB", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 }}
              onPress={handleOpenAddModal}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Tambah Penghuni Manual</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tenantList}>
            {filteredTenants.map((t) => (
              <View key={t.id} style={styles.tenantCard}>
                <View style={styles.tenantTopRow}>
                  {/* Avatar */}
                  <Image source={{ uri: t.avatar }} style={styles.avatarImg} />

                  {/* Info Column */}
                  <View style={styles.tenantInfoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.tenantNameTitle}>{t.name}</Text>
                      <View style={t.status === "aktif" ? styles.badgeGreen : styles.badgeRed}>
                        <Text style={t.status === "aktif" ? styles.badgeGreenText : styles.badgeRedText}>
                          {t.status === "aktif" ? "Aktif" : "Akan Keluar"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.roomTypeSub}>
                      {t.roomNumber} • {t.roomType}
                    </Text>

                    <View style={styles.detailMetaRow}>
                      <Phone size={13} color="#9CA3AF" />
                      <Text style={styles.detailMetaText}>{t.phone}</Text>
                    </View>

                    <View style={styles.detailMetaRow}>
                      <Calendar size={13} color="#9CA3AF" />
                      <Text style={styles.detailMetaText}>Masuk: {t.entryDate}</Text>
                    </View>
                  </View>

                  {/* Right Options & Price Column */}
                  <View style={styles.tenantRightCol}>
                    <TouchableOpacity
                      style={styles.moreOptionsBtn}
                      onPress={() => setSelectedTenantForOptions(t)}
                      activeOpacity={0.7}
                    >
                      <MoreVertical size={18} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.leasePriceWrap}>
                      <Text style={styles.leaseLabel}>Sisa Sewa</Text>
                      <Text style={[styles.leaseDaysText, t.daysLeft <= 10 && { color: "#EA580C" }]}>
                        {t.daysLeft} hari lagi
                      </Text>
                      <Text style={styles.tenantPriceVal}>{t.priceMonth}</Text>
                      <Text style={styles.tenantPriceUnit}>/ bulan</Text>
                    </View>
                  </View>
                </View>

                {/* Settlement Status Banner / Action */}
                {t.isSettled ? (
                  <TouchableOpacity
                    style={styles.settlementBannerSuccess}
                    onPress={() => {
                      setViewingReceiptTenant(t);
                      setIsReceiptModalOpen(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.settlementBannerLeft}>
                      <CheckCircle2 size={15} color="#0D7A53" />
                      <Text style={styles.settlementBannerSuccessText}>
                        Lunas Check-in • {t.settlementMethod === "cash" ? "Tunai (Cash)" : "Transfer Bank"}
                      </Text>
                    </View>
                    <View style={styles.settlementBannerRightLink}>
                      <Text style={styles.settlementBannerSuccessDate}>
                        Lihat Bukti
                      </Text>
                      <ChevronRight size={13} color="#0D7A53" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.settlementBannerPending}>
                    <View style={styles.settlementBannerTopRow}>
                      <View style={styles.settlementPendingBadge}>
                        <Text style={styles.settlementPendingBadgeText}>Belum Lunas Check-in</Text>
                      </View>
                      <Text style={styles.settlementBreakdownText}>
                        DP: Rp {(t.dpAmount !== undefined ? t.dpAmount : Math.round((t.totalAmount || 700000) * 0.2)).toLocaleString("id-ID")} • Sisa: Rp {(t.remainingAmount !== undefined ? t.remainingAmount : (t.totalAmount || 700000) - (t.dpAmount || 140000)).toLocaleString("id-ID")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inputSettlementActionBtn}
                      onPress={() => handleOpenSettlementModal(t)}
                      activeOpacity={0.85}
                    >
                      <Banknote size={15} color="#FFFFFF" />
                      <Text style={styles.inputSettlementActionBtnText}>Input Pelunasan (TF / Cash)</Text>
                      <ChevronRight size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Bottom Financial Summary Row (Pendapatan & Tunggakan) */}
        <View style={styles.financialSummaryRow}>
          {/* Card 1: Pendapatan (Real Cash Received) */}
          <TouchableOpacity
            style={[styles.finCard, { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" }]}
            onPress={() => navigate("pemilik_kos_laporan_keuangan")}
            activeOpacity={0.8}
          >
            <View style={styles.finHeaderRow}>
              <View style={[styles.finIconCircle, { backgroundColor: "#0D7A53" }]}>
                <DollarSign size={15} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.finLabel}>Pendapatan</Text>
                <Text style={[styles.finVal, { color: "#0D7A53" }]}>
                  Rp {totalReceivedCash.toLocaleString("id-ID")}
                </Text>
              </View>
              <ChevronRight size={15} color="#0D7A53" />
            </View>
          </TouchableOpacity>

          {/* Card 2: Tunggakan (Pending Check-in Settlement) */}
          <TouchableOpacity
            style={[styles.finCard, { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" }]}
            onPress={() => navigate("pemilik_kos_laporan_keuangan")}
            activeOpacity={0.8}
          >
            <View style={styles.finHeaderRow}>
              <View style={[styles.finIconCircle, { backgroundColor: "#DC2626" }]}>
                <AlertCircle size={15} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.finLabel}>Tunggakan</Text>
                <Text style={[styles.finVal, { color: "#DC2626" }]}>
                  Rp {totalPendingSettlement.toLocaleString("id-ID")}
                </Text>
              </View>
              <ChevronRight size={15} color="#DC2626" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
          onPress={() => setActiveNavTab("penghuni")}
          activeOpacity={0.7}
        >
          <Users size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Penghuni</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_laporan_keuangan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
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

      {/* MODAL 1: Tambah / Edit Penghuni Baru (Image 2) */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            {/* Modal Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "edit" ? `Edit Data ${namaLengkap}` : "Tambah Penghuni Baru"}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsAddModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Field 1: Nama Lengkap Penghuni */}
              <Text style={styles.label}>Nama Lengkap Penghuni</Text>
              <TextInput
                style={styles.input}
                value={namaLengkap}
                onChangeText={setNamaLengkap}
                placeholder="Masukkan Nama Lengkap"
                placeholderTextColor="#9CA3AF"
              />

              {/* Field 2: No. WhatsApp / HP */}
              <Text style={styles.label}>No. WhatsApp / HP</Text>
              <TextInput
                style={styles.input}
                value={noHp}
                onChangeText={setNoHp}
                placeholder="Contoh: 081234567890"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />

              {/* Field Row 3: Nomor Kamar & Tipe Kamar */}
              <View style={styles.fieldRow50}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nomor Kamar</Text>
                  <TextInput
                    style={styles.input}
                    value={nomorKamar}
                    onChangeText={setNomorKamar}
                    placeholder="Cth: Kamar 1A"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tipe Kamar</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setIsTipeKamarDropdownOpen(!isTipeKamarDropdownOpen)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownBtnText}>{tipeKamar}</Text>
                    <ChevronDown size={16} color="#374151" />
                  </TouchableOpacity>

                  {/* Dropdown Options (Image 3) */}
                  {isTipeKamarDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {tipeKamarOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[
                            styles.dropdownMenuItem,
                            tipeKamar === opt && styles.dropdownMenuItemActive,
                          ]}
                          onPress={() => {
                            setTipeKamar(opt);
                            setIsTipeKamarDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownMenuText,
                              tipeKamar === opt && styles.dropdownMenuTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Field Row 4: Tanggal Masuk & Harga Sewa / Bulan */}
              <View style={styles.fieldRow50}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tanggal Masuk</Text>
                  <View style={styles.dateInputWrap}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                      value={tanggalMasuk}
                      onChangeText={setTanggalMasuk}
                      placeholder="10/08/26"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={styles.calendarIconBg}
                      onPress={() => setIsDatePickerOpen(true)}
                      activeOpacity={0.7}
                    >
                      <Calendar size={18} color="#0D7A53" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Harga Sewa / Bulan</Text>
                  <TextInput
                    style={styles.input}
                    value={hargaSewa}
                    onChangeText={setHargaSewa}
                    placeholder="1.200.000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Field 5: Durasi Sewa (Bulan) */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={styles.label}>Durasi Sewa</Text>
                  {modalMode === "edit" && (
                    <Text style={{ fontSize: 11, color: "#0D7A53", fontWeight: "700" }}>
                      *Edit durasi jika perpanjang
                    </Text>
                  )}
                </View>

                <View style={styles.durationInputRow}>
                  <TouchableOpacity
                    style={styles.durationStepperBtn}
                    onPress={() => setDurasiSewa(Math.max(1, (parseInt(durasiSewa) || 1) - 1).toString())}
                    activeOpacity={0.7}
                  >
                    <Minus size={16} color="#0D7A53" />
                  </TouchableOpacity>

                  <View style={styles.durationInputWrap}>
                    <TextInput
                      style={styles.durationTextInput}
                      value={durasiSewa}
                      onChangeText={(val) => setDurasiSewa(val.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      placeholder="1"
                    />
                    <Text style={styles.durationUnitText}>Bulan</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.durationStepperBtn}
                    onPress={() => setDurasiSewa(((parseInt(durasiSewa) || 1) + 1).toString())}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color="#0D7A53" />
                  </TouchableOpacity>
                </View>

                {/* Quick Selection Chips */}
                <View style={styles.quickDurationChipsRow}>
                  {["1", "2", "3", "6", "12"].map((m) => {
                    const isSelected = durasiSewa === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.quickDurationChip, isSelected && styles.quickDurationChipActive]}
                        onPress={() => setDurasiSewa(m)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.quickDurationChipText, isSelected && styles.quickDurationChipTextActive]}>
                          {m} Bln
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSaveTenant}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>
                  {modalMode === "edit" ? "Simpan Perubahan" : "Simpan Penghuni Baru"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Opsi Penghuni Bottom Sheet */}
      <Modal visible={selectedTenantForOptions !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTenantForOptions(null)}
        >
          <View style={styles.bottomSheetCard} onStartShouldSetResponder={() => true}>
            <View style={styles.dragHandle} />
            <Text style={styles.optionsTitle}>Opsi Penghuni: {selectedTenantForOptions?.name}</Text>
            <Text style={styles.optionsSubtitle}>
              {selectedTenantForOptions?.roomNumber} • {selectedTenantForOptions?.phone}
            </Text>

            <View style={styles.optionsList}>
              {selectedTenantForOptions?.isSettled ? (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    if (selectedTenantForOptions) {
                      const t = selectedTenantForOptions;
                      setSelectedTenantForOptions(null);
                      setViewingReceiptTenant(t);
                      setIsReceiptModalOpen(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBg, { backgroundColor: "#DCFCE7" }]}>
                    <Receipt size={18} color="#0D7A53" />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionItemTitle}>Riwayat & Bukti Pembayaran</Text>
                    <Text style={styles.optionItemSub}>Lihat kwitansi pelunasan & bukti transfer</Text>
                  </View>
                  <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    if (selectedTenantForOptions) {
                      handleOpenSettlementModal(selectedTenantForOptions);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBg, { backgroundColor: "#FEF3C7" }]}>
                    <Banknote size={18} color="#D97706" />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionItemTitle}>Input Pelunasan Sewa (Check-in)</Text>
                    <Text style={styles.optionItemSub}>Input sisa DP saat penghuni masuk (TF / Cash)</Text>
                  </View>
                  <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedTenantForOptions) {
                    handleSendWhatsAppReminder(selectedTenantForOptions);
                    setSelectedTenantForOptions(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#DCFCE7" }]}>
                  <MessageCircle size={18} color="#0D7A53" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Kirim Pengingat Sewa (WhatsApp)</Text>
                  <Text style={styles.optionItemSub}>Kirim pesan invoice tagihan ke no WA penghuni</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => selectedTenantForOptions && handleOpenEditModal(selectedTenantForOptions)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#F0FDF4" }]}>
                  <Pencil size={18} color="#0D7A53" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Edit Data Penghuni</Text>
                  <Text style={styles.optionItemSub}>Ubah data nama, kamar, atau tanggal masuk</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedTenantForOptions) {
                    handleDeleteTenant(selectedTenantForOptions.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#FEE2E2" }]}>
                  <Trash2 size={18} color="#EF4444" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Keluarkan Penghuni</Text>
                  <Text style={styles.optionItemSub}>Hapus penghuni ini dari kos Anda</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setSelectedTenantForOptions(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 3: Material Design 3 Interactive Date Picker Modal */}
      <Modal visible={isDatePickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.m3DatePickerOverlay}
          activeOpacity={1}
          onPress={() => setIsDatePickerOpen(false)}
        >
          <View style={styles.m3CalendarCard} onStartShouldSetResponder={() => true}>
            {/* Header Section */}
            <View style={styles.m3HeaderSection}>
              <View style={styles.m3HeaderTopRow}>
                <Text style={styles.m3SelectLabel}>Select date</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Pencil size={18} color="#444746" />
                </TouchableOpacity>
              </View>
              <Text style={styles.m3SelectedDateText}>
                {getFormattedHeaderDate(selectedDay, calMonth, calYear)}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.m3Divider} />

            {/* Calendar Body */}
            <View style={styles.m3CalendarBody}>
              {/* Month & Nav Row */}
              <View style={styles.m3MonthNavRow}>
                <TouchableOpacity
                  style={styles.m3MonthDropdownBtn}
                  onPress={handleNextMonth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.m3MonthTitleText}>
                    {monthNamesEng[calMonth]} {calYear}
                  </Text>
                  <ChevronDown size={16} color="#444746" />
                </TouchableOpacity>

                <View style={styles.m3NavArrowsRow}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.m3NavIconBtn} activeOpacity={0.7}>
                    <ChevronLeft size={20} color="#444746" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextMonth} style={styles.m3NavIconBtn} activeOpacity={0.7}>
                    <ChevronRight size={20} color="#444746" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Headers Row (S M T W T F S) */}
              <View style={styles.m3DayHeadersRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                  <Text key={idx} style={styles.m3DayHeaderText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Grid of Days (with empty offset for 1st day of month) */}
              <View style={styles.m3DaysGrid}>
                {/* Blank padding cells */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <View key={`blank-${idx}`} style={styles.m3DayCell} />
                ))}

                {/* Day cells */}
                {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => {
                  const isSelected = selectedDay === dayNum;
                  const isSecondary = dayNum === 27;
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        styles.m3DayCell,
                        isSelected && styles.m3DayCellSelected,
                        !isSelected && isSecondary && styles.m3DayCellSecondary,
                      ]}
                      onPress={() => setSelectedDay(dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.m3DayCellText,
                          isSelected && styles.m3DayCellTextSelected,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Footer Actions (Cancel / OK) */}
            <View style={styles.m3FooterRow}>
              <TouchableOpacity
                style={styles.m3ActionBtn}
                onPress={() => setIsDatePickerOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.m3ActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.m3ActionBtn}
                onPress={() => handleConfirmDate(selectedDay, calMonth, calYear)}
                activeOpacity={0.7}
              >
                <Text style={styles.m3ActionBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 4: Input Pelunasan Check-in Modal */}
      <Modal visible={isSettlementModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Input Pelunasan Check-in</Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  Pembayaran sisa sewa hari pertama menempati kost
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsSettlementModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Tenant Summary Banner */}
              {settlingTenant && (
                <View style={styles.settleTenantBanner}>
                  <View style={styles.settleTenantHeader}>
                    <Image source={{ uri: settlingTenant.avatar }} style={styles.settleAvatar} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.settleTenantName}>{settlingTenant.name}</Text>
                      <Text style={styles.settleTenantRoom}>
                        {settlingTenant.roomNumber} • {settlingTenant.roomType}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.settlePriceDivider} />

                  <View style={styles.settlePriceRow}>
                    <Text style={styles.settlePriceLabel}>Total Sewa Bulan ke-1</Text>
                    <Text style={styles.settlePriceVal}>
                      Rp {(settlingTenant.totalAmount || parseInt((settlingTenant.priceMonth || "").replace(/[^0-9]/g, "")) || 700000).toLocaleString("id-ID")}
                    </Text>
                  </View>

                  <View style={styles.settlePriceRow}>
                    <Text style={[styles.settlePriceLabel, { color: "#0D7A53" }]}>DP Sudah Dibayar (20%)</Text>
                    <Text style={[styles.settlePriceVal, { color: "#0D7A53" }]}>
                      - Rp {(settlingTenant.dpAmount !== undefined ? settlingTenant.dpAmount : Math.round((settlingTenant.totalAmount || 700000) * 0.2)).toLocaleString("id-ID")}
                    </Text>
                  </View>

                  <View style={[styles.settlePriceRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#E5E7EB" }]}>
                    <Text style={[styles.settlePriceLabel, { fontWeight: "700", color: "#111827" }]}>
                      Sisa Wajib Pelunasan (80%)
                    </Text>
                    <Text style={[styles.settlePriceVal, { fontWeight: "800", color: "#EA580C", fontSize: 15 }]}>
                      Rp {(settlingTenant.remainingAmount !== undefined ? settlingTenant.remainingAmount : (settlingTenant.totalAmount || 700000) - (settlingTenant.dpAmount || 140000)).toLocaleString("id-ID")}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Method Selector (Transfer vs Cash) */}
              <Text style={[styles.label, { marginTop: 14 }]}>Metode Pembayaran Pelunasan</Text>
              <View style={styles.methodChoiceRow}>
                {/* Option 1: Transfer */}
                <TouchableOpacity
                  style={[
                    styles.methodChoiceCard,
                    settlementMethod === "transfer" && styles.methodChoiceCardActive,
                  ]}
                  onPress={() => setSettlementMethod("transfer")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.methodIconWrap, settlementMethod === "transfer" && styles.methodIconWrapActive]}>
                    <CreditCard size={15} color={settlementMethod === "transfer" ? "#0D7A53" : "#6B7280"} />
                  </View>
                  <View style={styles.methodTextCol}>
                    <Text style={[styles.methodChoiceTitle, settlementMethod === "transfer" && styles.methodChoiceTitleActive]}>
                      Transfer Bank / QRIS
                    </Text>
                    <Text style={styles.methodChoiceSub}>Via rekening pemilik</Text>
                  </View>
                  {settlementMethod === "transfer" && (
                    <View style={styles.methodSelectedCheck}>
                      <Check size={9} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Option 2: Tunai / Cash */}
                <TouchableOpacity
                  style={[
                    styles.methodChoiceCard,
                    settlementMethod === "cash" && styles.methodChoiceCardActive,
                  ]}
                  onPress={() => setSettlementMethod("cash")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.methodIconWrap, settlementMethod === "cash" && styles.methodIconWrapActive]}>
                    <Banknote size={15} color={settlementMethod === "cash" ? "#0D7A53" : "#6B7280"} />
                  </View>
                  <View style={styles.methodTextCol}>
                    <Text style={[styles.methodChoiceTitle, settlementMethod === "cash" && styles.methodChoiceTitleActive]}>
                      Tunai / Cash Langsung
                    </Text>
                    <Text style={styles.methodChoiceSub}>Diterima saat check-in</Text>
                  </View>
                  {settlementMethod === "cash" && (
                    <View style={styles.methodSelectedCheck}>
                      <Check size={9} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <Text style={[styles.label, { marginTop: 12 }]}>Jumlah Pelunasan (Rp)</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.amountPrefix}>Rp</Text>
                <TextInput
                  style={styles.amountInput}
                  value={settlementAmountInput}
                  onChangeText={setSettlementAmountInput}
                  placeholder="560000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              {/* Proof of Payment Upload (Optional) */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={styles.label}>Bukti Pembayaran</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>Opsional</Text>
                  </View>
                </View>

                {settlementProofImage ? (
                  <View style={styles.proofPreviewCard}>
                    <Image source={{ uri: settlementProofImage }} style={styles.proofPreviewImg} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.proofPreviewTitle}>Bukti Foto Terlampir</Text>
                      <Text style={styles.proofPreviewSub}>Struk / kwitansi pembayaran siap disimpan</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.proofRemoveBtn}
                      onPress={() => setSettlementProofImage(null)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.proofUploadBox}
                    onPress={handlePickProofImage}
                    activeOpacity={0.75}
                  >
                    <View style={styles.proofUploadIconBg}>
                      <Camera size={16} color="#0D7A53" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.proofUploadText}>Upload Bukti / Struk Pelunasan</Text>
                      <Text style={styles.proofUploadSub}>Format JPG, PNG (opsional untuk tracking)</Text>
                    </View>
                    <View style={styles.proofUploadAddBtn}>
                      <Plus size={14} color="#0D7A53" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Notes */}
              <Text style={[styles.label, { marginTop: 12 }]}>Catatan Pembayaran (Opsional)</Text>
              <TextInput
                style={[styles.input, { height: 52, textAlignVertical: "top", paddingTop: 8 }]}
                value={settlementNotes}
                onChangeText={setSettlementNotes}
                placeholder="Cth: Diterima tunai saat serah terima kunci kamar"
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.btnConfirmSettlement, isSubmittingSettlement && { opacity: 0.7 }]}
                onPress={handleConfirmSettlement}
                disabled={isSubmittingSettlement}
                activeOpacity={0.85}
              >
                {isSubmittingSettlement ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnConfirmContent}>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnConfirmText} numberOfLines={1}>
                      Konfirmasi Pelunasan & Simpan
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Riwayat & Bukti Pembayaran Modal */}
      <Modal visible={isReceiptModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.addModalCard, { maxHeight: "90%" }]}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Riwayat & Bukti Pembayaran</Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  Kwitansi resmi pelunasan sewa kamar
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsReceiptModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {viewingReceiptTenant && (
                <>
                  {/* Status Banner */}
                  <View style={styles.receiptTopStatusCard}>
                    <View style={styles.receiptStatusBadgeRow}>
                      <View style={styles.receiptStatusBadgeGreen}>
                        <CheckCircle2 size={13} color="#0D7A53" />
                        <Text style={styles.receiptStatusBadgeGreenText}>LUNAS CHECK-IN (100%)</Text>
                      </View>
                      <Text style={styles.receiptBookingCode}>
                        {viewingReceiptTenant.bookingCode ? `#${viewingReceiptTenant.bookingCode}` : "#BOOK-KST"}
                      </Text>
                    </View>

                    <Text style={styles.receiptTotalLabel}>Total Nilai Sewa</Text>
                    <Text style={styles.receiptTotalAmount}>
                      Rp {(viewingReceiptTenant.totalAmount || parseInt((viewingReceiptTenant.priceMonth || "").replace(/[^0-9]/g, "")) || 700000).toLocaleString("id-ID")}
                    </Text>

                    <View style={styles.receiptTenantInfoRow}>
                      <Image source={{ uri: viewingReceiptTenant.avatar }} style={styles.receiptAvatar} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.receiptTenantName}>{viewingReceiptTenant.name}</Text>
                        <Text style={styles.receiptTenantSub}>
                          Kamar {viewingReceiptTenant.roomNumber} • {viewingReceiptTenant.roomType}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 11, color: "#6B7280" }}>Tanggal Masuk</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#111827" }}>
                          {viewingReceiptTenant.entryDate}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Section Title */}
                  <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Rincian Tahapan Pembayaran</Text>

                  {/* Stage 1: DP 20% */}
                  <View style={styles.paymentStageCard}>
                    <View style={styles.paymentStageHeader}>
                      <View style={[styles.paymentStageStepBg, { backgroundColor: "#FEF3C7" }]}>
                        <Text style={[styles.paymentStageStepText, { color: "#D97706" }]}>1</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={styles.paymentStageTitle}>Pembayaran DP (20%)</Text>
                          <View style={styles.verifiedMiniPill}>
                            <CheckCircle2 size={11} color="#0D7A53" />
                            <Text style={styles.verifiedMiniPillText}>Terverifikasi</Text>
                          </View>
                        </View>
                        <Text style={styles.paymentStageSub}>Dibayar customer saat pemesanan kamar</Text>
                      </View>
                    </View>

                    <View style={styles.stageAmountRow}>
                      <Text style={styles.stageAmountLabel}>Nominal DP</Text>
                      <Text style={[styles.stageAmountVal, { color: "#D97706" }]}>
                        Rp {(viewingReceiptTenant.dpAmount !== undefined ? viewingReceiptTenant.dpAmount : Math.round((viewingReceiptTenant.totalAmount || 700000) * 0.2)).toLocaleString("id-ID")}
                      </Text>
                    </View>

                    <View style={styles.stageMetaRow}>
                      <Text style={styles.stageMetaLabel}>Metode Transaksi</Text>
                      <Text style={styles.stageMetaVal}>Transfer Bank (Online)</Text>
                    </View>

                    {viewingReceiptTenant.dpPaidAt && (
                      <View style={styles.stageMetaRow}>
                        <Text style={styles.stageMetaLabel}>Waktu Pembayaran</Text>
                        <Text style={styles.stageMetaVal}>
                          {new Date(viewingReceiptTenant.dpPaidAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </Text>
                      </View>
                    )}

                    {/* DP Proof Image Preview if available */}
                    {viewingReceiptTenant.dpProofImage ? (
                      <View style={styles.proofAttachmentCard}>
                        <View style={styles.proofAttachmentLeft}>
                          <Image source={{ uri: viewingReceiptTenant.dpProofImage }} style={styles.proofThumbImg} />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={styles.proofAttachmentTitle}>Bukti Transfer DP</Text>
                            <Text style={styles.proofAttachmentSub}>Klik untuk melihat gambar penuh</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.btnViewFullProof}
                          onPress={() => viewingReceiptTenant.dpProofImage && setFullImagePreviewUrl(viewingReceiptTenant.dpProofImage)}
                          activeOpacity={0.7}
                        >
                          <Eye size={14} color="#0D7A53" />
                          <Text style={styles.btnViewFullProofText}>Lihat</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noProofInfoBox}>
                        <FileText size={14} color="#9CA3AF" />
                        <Text style={styles.noProofInfoText}>Bukti transfer DP diverifikasi melalui sistem</Text>
                      </View>
                    )}
                  </View>

                  {/* Stage 2: Pelunasan Check-in 80% */}
                  <View style={[styles.paymentStageCard, { marginTop: 12, borderColor: "#DCFCE7" }]}>
                    <View style={styles.paymentStageHeader}>
                      <View style={[styles.paymentStageStepBg, { backgroundColor: "#DCFCE7" }]}>
                        <Text style={[styles.paymentStageStepText, { color: "#0D7A53" }]}>2</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={styles.paymentStageTitle}>Pelunasan Check-in (80%)</Text>
                          <View style={styles.verifiedMiniPill}>
                            <CheckCircle2 size={11} color="#0D7A53" />
                            <Text style={styles.verifiedMiniPillText}>Diterima</Text>
                          </View>
                        </View>
                        <Text style={styles.paymentStageSub}>Diserahkan saat hari pertama masuk kost</Text>
                      </View>
                    </View>

                    <View style={styles.stageAmountRow}>
                      <Text style={styles.stageAmountLabel}>Nominal Pelunasan</Text>
                      <Text style={[styles.stageAmountVal, { color: "#0D7A53" }]}>
                        Rp {(viewingReceiptTenant.settledAmount || (viewingReceiptTenant.totalAmount || 700000) - (viewingReceiptTenant.dpAmount || 140000)).toLocaleString("id-ID")}
                      </Text>
                    </View>

                    <View style={styles.stageMetaRow}>
                      <Text style={styles.stageMetaLabel}>Metode Pelunasan</Text>
                      <Text style={[styles.stageMetaVal, { fontWeight: "700", color: "#111827" }]}>
                        {viewingReceiptTenant.settlementMethod === "cash" ? "💵 Tunai / Cash Langsung" : "💳 Transfer Bank / QRIS"}
                      </Text>
                    </View>

                    <View style={styles.stageMetaRow}>
                      <Text style={styles.stageMetaLabel}>Waktu Pelunasan</Text>
                      <Text style={styles.stageMetaVal}>
                        {viewingReceiptTenant.settledAt
                          ? new Date(viewingReceiptTenant.settledAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Hari Pertama Check-in"}
                      </Text>
                    </View>

                    {viewingReceiptTenant.settlementNotes ? (
                      <View style={styles.stageNotesBox}>
                        <Text style={styles.stageNotesLabel}>Catatan:</Text>
                        <Text style={styles.stageNotesVal}>{viewingReceiptTenant.settlementNotes}</Text>
                      </View>
                    ) : null}

                    {/* Settlement Proof Image Preview if available */}
                    {viewingReceiptTenant.settlementProofImage ? (
                      <View style={[styles.proofAttachmentCard, { backgroundColor: "#FFFFFF" }]}>
                        <View style={styles.proofAttachmentLeft}>
                          <Image source={{ uri: viewingReceiptTenant.settlementProofImage }} style={styles.proofThumbImg} />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={styles.proofAttachmentTitle}>Bukti Foto / Kwitansi</Text>
                            <Text style={styles.proofAttachmentSub}>Klik untuk memperbesar gambar</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.btnViewFullProof}
                          onPress={() => viewingReceiptTenant.settlementProofImage && setFullImagePreviewUrl(viewingReceiptTenant.settlementProofImage)}
                          activeOpacity={0.7}
                        >
                          <Eye size={14} color="#0D7A53" />
                          <Text style={styles.btnViewFullProofText}>Lihat</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noProofInfoBox}>
                        <CheckCircle2 size={14} color="#0D7A53" />
                        <Text style={styles.noProofInfoText}>
                          {viewingReceiptTenant.settlementMethod === "cash"
                            ? "Pelunasan tunai telah dikonfirmasi langsung oleh pemilik kos"
                            : "Pelunasan transfer telah dikonfirmasi oleh pemilik kos"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Close Action */}
                  <TouchableOpacity
                    style={[styles.btnConfirmSettlement, { marginTop: 20 }]}
                    onPress={() => setIsReceiptModalOpen(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnConfirmText}>Tutup Rincian Kwitansi</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: Fullscreen Image Preview Modal */}
      <Modal visible={!!fullImagePreviewUrl} transparent animationType="fade">
        <View style={styles.fullImageOverlay}>
          <SafeAreaView style={styles.fullImageSafeArea}>
            <View style={styles.fullImageHeader}>
              <Text style={styles.fullImageTitle}>Bukti Pembayaran</Text>
              <TouchableOpacity
                style={styles.fullImageCloseBtn}
                onPress={() => setFullImagePreviewUrl(null)}
                activeOpacity={0.7}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.fullImageWrap}>
              {fullImagePreviewUrl ? (
                <Image
                  source={{ uri: fullImagePreviewUrl }}
                  style={styles.fullImageContent}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: "#111827",
  },

  // Summary Cards Row
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  labelWithDot: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  summarySubtext: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Filter Chips Row
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  // Tenant List
  tenantList: {
    gap: 12,
    marginBottom: 20,
  },
  tenantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  tenantTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  tenantInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  tenantNameTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  badgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeGreenText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0D7A53",
  },
  badgeRed: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeRedText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#DC2626",
  },
  roomTypeSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  detailMetaText: {
    fontSize: 11,
    color: "#6B7280",
  },
  tenantRightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  moreOptionsBtn: {
    padding: 2,
  },
  leasePriceWrap: {
    alignItems: "flex-end",
  },
  leaseLabel: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  leaseDaysText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
    marginBottom: 4,
  },
  tenantPriceVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
  },
  tenantPriceUnit: {
    fontSize: 9,
    color: "#9CA3AF",
  },

  // Financial Summary Cards
  financialSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  finCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  finHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  finIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  finLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  finVal: {
    fontSize: 12,
    fontWeight: "800",
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  addModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
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
  fieldRow50: {
    flexDirection: "row",
    gap: 12,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  dropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 99,
    overflow: "hidden",
  },
  dropdownMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownMenuItemActive: {
    backgroundColor: "#E5E7EB",
  },
  dropdownMenuText: {
    fontSize: 13,
    color: "#374151",
  },
  dropdownMenuTextActive: {
    fontWeight: "700",
    color: "#111827",
  },
  dateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarIconBg: {
    width: 46,
    height: 46,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 0,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    height: 48,
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Options Sheet
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  optionsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  optionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextCol: {
    flex: 1,
  },
  optionItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  optionItemSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  btnCancel: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  // Material 3 Date Picker Modal Styles (Matching User Image)
  m3DatePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  m3CalendarCard: {
    width: "100%",
    maxWidth: 330,
    backgroundColor: "#EAEFE9",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  m3HeaderSection: {
    marginBottom: 12,
  },
  m3HeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  m3SelectLabel: {
    fontSize: 12,
    color: "#444746",
    fontWeight: "500",
  },
  m3SelectedDateText: {
    fontSize: 30,
    fontWeight: "400",
    color: "#1F1F1F",
  },
  m3Divider: {
    height: 1,
    backgroundColor: "#DCE3DC",
    marginBottom: 16,
  },
  m3CalendarBody: {
    marginBottom: 12,
  },
  m3MonthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  m3MonthDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  m3MonthTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  m3NavArrowsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  m3NavIconBtn: {
    padding: 4,
  },
  m3DayHeadersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  m3DayHeaderText: {
    width: 36,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: "#444746",
  },
  m3DaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    paddingHorizontal: 4,
  },
  m3DayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  m3DayCellSelected: {
    backgroundColor: "#0D7A53",
  },
  m3DayCellSecondary: {
    backgroundColor: "#D9E3DA",
  },
  m3DayCellText: {
    fontSize: 14,
    color: "#1F1F1F",
    fontWeight: "400",
  },
  m3DayCellTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  m3FooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 8,
  },
  m3ActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  m3ActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Check-in Settlement Card & Banner Styles
  settlementBannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  settlementBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settlementBannerRightLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  settlementBannerSuccessText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  settlementBannerSuccessDate: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
  },
  settlementBannerPending: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  settlementBannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  settlementPendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settlementPendingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  settlementBreakdownText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  inputSettlementActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D7A53",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  inputSettlementActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Check-in Settlement Modal Styles
  settleTenantBanner: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  settleTenantHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  settleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  settleTenantName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  settleTenantRoom: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  settlePriceDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  settlePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 2,
  },
  settlePriceLabel: {
    fontSize: 12,
    color: "#4B5563",
  },
  settlePriceVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  // Payment Method Selection Cards (Slim Compact Style)
  methodChoiceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  methodChoiceCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  methodChoiceCardActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#0D7A53",
  },
  methodIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  methodIconWrapActive: {
    backgroundColor: "#DCFCE7",
  },
  methodTextCol: {
    flex: 1,
  },
  methodChoiceTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#374151",
  },
  methodChoiceTitleActive: {
    color: "#0D7A53",
  },
  methodChoiceSub: {
    fontSize: 9.5,
    color: "#9CA3AF",
    marginTop: 1,
  },
  methodSelectedCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },

  // Amount Input Wrap
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    height: 44,
  },
  amountPrefix: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  // Proof of Payment Upload Styles
  optionalBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  proofUploadBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  proofUploadIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  proofUploadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  proofUploadSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  proofUploadAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  proofPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 10,
    padding: 8,
  },
  proofPreviewImg: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  proofPreviewTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  proofPreviewSub: {
    fontSize: 10,
    color: "#15803D",
    marginTop: 1,
  },
  proofRemoveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },

  // Confirm Settlement Button
  btnConfirmSettlement: {
    backgroundColor: "#0D7A53",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    elevation: 2,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    paddingHorizontal: 16,
  },
  btnConfirmContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Receipt Modal Styles
  receiptTopStatusCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 16,
    padding: 14,
  },
  receiptStatusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  receiptStatusBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptStatusBadgeGreenText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
  },
  receiptBookingCode: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  receiptTotalLabel: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 10,
  },
  receiptTotalAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 2,
  },
  receiptTenantInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  receiptAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
  },
  receiptTenantName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  receiptTenantSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  paymentStageCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
  },
  paymentStageHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentStageStepBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentStageStepText: {
    fontSize: 12,
    fontWeight: "800",
  },
  paymentStageTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  paymentStageSub: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 1,
  },
  verifiedMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedMiniPillText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  stageAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  stageAmountLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  stageAmountVal: {
    fontSize: 14,
    fontWeight: "800",
  },
  stageMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  stageMetaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  stageMetaVal: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  stageNotesBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stageNotesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
  },
  stageNotesVal: {
    fontSize: 11,
    color: "#374151",
    marginTop: 2,
  },
  proofAttachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  proofAttachmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  proofThumbImg: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  proofAttachmentTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#111827",
  },
  proofAttachmentSub: {
    fontSize: 9.5,
    color: "#6B7280",
    marginTop: 1,
  },
  btnViewFullProof: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  btnViewFullProofText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  noProofInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  noProofInfoText: {
    fontSize: 10.5,
    color: "#6B7280",
    flex: 1,
  },

  // Full Image Modal
  fullImageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  fullImageSafeArea: {
    flex: 1,
  },
  fullImageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fullImageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fullImageCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullImageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  fullImageContent: {
    width: "100%",
    height: "100%",
  },

  // Duration input styles
  durationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  durationStepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  durationInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
    paddingHorizontal: 12,
  },
  durationTextInput: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    minWidth: 40,
  },
  durationUnitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    marginLeft: 4,
  },
  quickDurationChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickDurationChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickDurationChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  quickDurationChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4B5563",
  },
  quickDurationChipTextActive: {
    color: "#FFFFFF",
  },
});
