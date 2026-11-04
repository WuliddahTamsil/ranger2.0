/**
 * AdminGeoDirectSection.tsx
 * Comprehensive Admin Management Section for Geo Direct Use
 * Covers Stats, Equipment CRUD & Parameter Config, Pricing Config,
 * Payment Methods (QRIS & Banks), Bookings Table, Payment Verification,
 * and Approval / Rejection with DP Credit Ledger Integrity.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  Platform,
} from "react-native";
import {
  Flame,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  Coins,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  Cpu,
  X,
  Check,
  Info,
} from "lucide-react-native";
import {
  fetchAdminGeoStats,
  fetchAdminGeoBookings,
  fetchEquipments,
  fetchPaymentMethods,
  adminCreateEquipment,
  adminUpdateEquipment,
  adminDeleteEquipment,
  adminUpdatePaymentMethods,
  adminVerifyPayment,
  adminRejectPayment,
  adminApproveBooking,
  adminRejectBooking,
  fetchAdminDpLedgers,
  GeoDirectEquipment,
  GeoDirectBooking,
  GeoDirectDashboardStats,
  GeoPaymentMethodsConfig,
  GeoDirectDpLedgerItem,
  GeoBankAccount,
} from "../services/geoDirectService";
import { rp } from "../utils/formatters";
import { GeoDirectInvoiceModal } from "../screens/customer/geo_direct/GeoDirectInvoiceModal";

export const AdminGeoDirectSection: React.FC = () => {
  // Navigation Sub-tab: "OVERVIEW" | "EQUIPMENT" | "BOOKINGS" | "PAYMENT_CONFIG" | "DP_LEDGER"
  const [subTab, setSubTab] = useState<
    "OVERVIEW" | "EQUIPMENT" | "BOOKINGS" | "PAYMENT_CONFIG" | "DP_LEDGER"
  >("OVERVIEW");

  // State
  const [stats, setStats] = useState<GeoDirectDashboardStats | null>(null);
  const [equipments, setEquipments] = useState<GeoDirectEquipment[]>([]);
  const [bookings, setBookings] = useState<GeoDirectBooking[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<GeoPaymentMethodsConfig | null>(null);
  const [dpLedgers, setDpLedgers] = useState<GeoDirectDpLedgerItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [bookingStatusFilter, setBookingStatusFilter] = useState("ALL");
  const [bookingSearch, setBookingSearch] = useState("");

  // Modals
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<GeoDirectBooking | null>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<GeoDirectBooking | null>(null);

  // Equipment Form Modal
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [editingEquipId, setEditingEquipId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSpec, setFormSpec] = useState("");
  const [formFunc, setFormFunc] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formBasePrice, setFormBasePrice] = useState("0");
  const [formPricingUnit, setFormPricingUnit] = useState("per_hari");
  const [formDpPercent, setFormDpPercent] = useState("30");
  const [formFormula, setFormFormula] = useState("STANDARD_DAILY");
  const [formImgUrl, setFormImgUrl] = useState("");
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [savingEquip, setSavingEquip] = useState(false);

  // Reject / Reason Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"REJECT_PAYMENT" | "REJECT_BOOKING" | "APPROVE_BOOKING">("APPROVE_BOOKING");
  const [targetBookingId, setTargetBookingId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Payment Config Form
  const [qrisEnabled, setQrisEnabled] = useState(false);
  const [qrisImgUrl, setQrisImgUrl] = useState("");
  const [qrisMerchant, setQrisMerchant] = useState("");
  const [qrisNmid, setQrisNmid] = useState("");
  const [bankAccountsList, setBankAccountsList] = useState<GeoBankAccount[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Load All Section Data
  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, equipData, bookingsData, payData, ledgerData] = await Promise.all([
        fetchAdminGeoStats().catch(() => null),
        fetchEquipments().catch(() => []),
        fetchAdminGeoBookings({ status: bookingStatusFilter, search: bookingSearch }).catch(() => ({
          bookings: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 1,
        })),
        fetchPaymentMethods().catch(() => null),
        fetchAdminDpLedgers().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setEquipments(equipData);
      setBookings(bookingsData.bookings);
      if (payData) {
        setPaymentConfig(payData);
        setQrisEnabled(payData.qrisEnabled);
        setQrisImgUrl(payData.qrisImageUrl || "");
        setQrisMerchant(payData.qrisMerchantName || "");
        setQrisNmid(payData.qrisNmid || "");
        setBankAccountsList(payData.bankAccounts || []);
      }
      setDpLedgers(ledgerData);
    } catch (err) {
      console.warn("Failed to load admin Geo Direct data:", err);
    } finally {
      setLoading(false);
    }
  }, [bookingStatusFilter, bookingSearch]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Open Add/Edit Equipment
  const openEquipmentModal = (item?: GeoDirectEquipment) => {
    if (item) {
      setEditingEquipId(item._id);
      setFormCode(item.code);
      setFormName(item.name);
      setFormDesc(item.description || "");
      setFormSpec(item.specification || "");
      setFormFunc(item.function || "");
      setFormCapacity(item.capacity || "");
      setFormTerms(item.rentalTerms || "");
      setFormBasePrice(String(item.basePrice || 0));
      setFormPricingUnit(item.pricingUnit || "per_hari");
      setFormDpPercent(String(item.dpPercentage || 30));
      setFormFormula(item.pricingFormulaType || "STANDARD_DAILY");
      setFormImgUrl(item.imageUrl || "");
      setFormIsAvailable(item.isAvailable !== false);
      setFormIsActive(item.isActive !== false);
    } else {
      setEditingEquipId(null);
      setFormCode(`EQ-0${equipments.length + 1}`);
      setFormName(`Equipment 0${equipments.length + 1}`);
      setFormDesc("Layanan penyewaan alat PGE Center of Excellence Kamojang.");
      setFormSpec("Spesifikasi teknis dapat disesuaikan.");
      setFormFunc("Pemanfaatan langsung energi panas bumi.");
      setFormCapacity("Sesuai standar operasional PGE.");
      setFormTerms("1. Mematuhi SOP Keselamatan PGE.\n2. Wajib membawa Nota Persetujuan.");
      setFormBasePrice("0");
      setFormPricingUnit("per_hari");
      setFormDpPercent("30");
      setFormFormula("STANDARD_DAILY");
      setFormImgUrl("");
      setFormIsAvailable(true);
      setFormIsActive(true);
    }
    setIsEquipModalOpen(true);
  };

  const handleSaveEquipment = async () => {
    if (!formCode.trim() || !formName.trim()) {
      Alert.alert("Perhatian", "Kode alat dan Nama alat wajib diisi.");
      return;
    }

    try {
      setSavingEquip(true);
      const payload: Partial<GeoDirectEquipment> = {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        description: formDesc.trim(),
        specification: formSpec.trim(),
        function: formFunc.trim(),
        capacity: formCapacity.trim(),
        rentalTerms: formTerms.trim(),
        basePrice: Math.max(0, parseFloat(formBasePrice) || 0),
        pricingUnit: formPricingUnit,
        dpPercentage: Math.min(100, Math.max(0, parseFloat(formDpPercent) || 30)),
        pricingFormulaType: formFormula,
        imageUrl: formImgUrl.trim(),
        isAvailable: formIsAvailable,
        isActive: formIsActive,
      };

      if (editingEquipId) {
        await adminUpdateEquipment(editingEquipId, payload);
        Alert.alert("Berhasil", "Data alat berhasil diperbarui.");
      } else {
        await adminCreateEquipment(payload);
        Alert.alert("Berhasil", "Alat baru berhasil ditambahkan.");
      }

      setIsEquipModalOpen(false);
      refreshAll();
    } catch (err: any) {
      Alert.alert("Gagal Menyimpan", err.message || "Terjadi kesalahan.");
    } finally {
      setSavingEquip(false);
    }
  };

  const handleDeleteEquipment = (id: string, name: string) => {
    Alert.alert("Konfirmasi Hapus", `Apakah Anda yakin ingin menghapus atau menonaktifkan '${name}'?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await adminDeleteEquipment(id);
            refreshAll();
          } catch (err: any) {
            Alert.alert("Gagal", err.message || "Gagal menghapus alat.");
          }
        },
      },
    ]);
  };

  // Save Payment Configuration
  const handleSavePaymentConfig = async () => {
    try {
      setSavingConfig(true);
      await adminUpdatePaymentMethods({
        qrisEnabled,
        qrisImageUrl: qrisImgUrl.trim(),
        qrisMerchantName: qrisMerchant.trim(),
        qrisNmid: qrisNmid.trim(),
        bankAccounts: bankAccountsList,
      });
      Alert.alert("Berhasil", "Konfigurasi QRIS & Rekening Bank berhasil disimpan.");
      refreshAll();
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal menyimpan konfigurasi.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Add Bank Account item
  const handleAddBankAccount = () => {
    setBankAccountsList([
      ...bankAccountsList,
      {
        bankName: "Bank Mandiri",
        accountNumber: "131-00-XXXX-X",
        accountHolder: "PT Pertamina Geothermal Energy Tbk",
        branch: "Kamojang",
        isActive: true,
      },
    ]);
  };

  const handleUpdateBankField = (index: number, field: keyof GeoBankAccount, value: any) => {
    const updated = [...bankAccountsList];
    updated[index] = { ...updated[index], [field]: value };
    setBankAccountsList(updated);
  };

  const handleRemoveBank = (index: number) => {
    const updated = [...bankAccountsList];
    updated.splice(index, 1);
    setBankAccountsList(updated);
  };

  // Action Triggers: Approve, Reject Payment, Reject Booking
  const triggerVerifyPayment = async (b: GeoDirectBooking) => {
    Alert.alert(
      "Verifikasi Pembayaran DP",
      `Konfirmasi bahwa transfer DP sebesar ${rp(b.pricingSnapshot.requiredDpAmount)} telah diterima secara valid di rekening/QRIS PGE?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Verifikasi Sekarang",
          onPress: async () => {
            try {
              await adminVerifyPayment(b._id);
              Alert.alert("Sukses", "Pembayaran DP berhasil diverifikasi.");
              refreshAll();
              setSelectedBookingForDetail(null);
            } catch (err: any) {
              Alert.alert("Gagal", err.message || "Gagal memverifikasi pembayaran.");
            }
          },
        },
      ]
    );
  };

  const openActionModal = (
    type: "REJECT_PAYMENT" | "REJECT_BOOKING" | "APPROVE_BOOKING",
    bookingId: string
  ) => {
    setActionType(type);
    setTargetBookingId(bookingId);
    setActionReason(
      type === "APPROVE_BOOKING"
        ? "Disetujui oleh Administrator PGE Kamojang."
        : ""
    );
    setIsActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!targetBookingId) return;
    if (
      (actionType === "REJECT_PAYMENT" || actionType === "REJECT_BOOKING") &&
      !actionReason.trim()
    ) {
      Alert.alert("Wajib Diisi", "Alasan / catatan penolakan wajib dicantumkan.");
      return;
    }

    try {
      setSubmittingAction(true);
      if (actionType === "APPROVE_BOOKING") {
        await adminApproveBooking(targetBookingId, actionReason.trim());
        Alert.alert("Penyewaan Disetujui! 🍃", "Nota resmi berhasil diterbitkan untuk customer.");
      } else if (actionType === "REJECT_PAYMENT") {
        await adminRejectPayment(targetBookingId, actionReason.trim());
        Alert.alert("Sukses", "Bukti pembayaran ditolak dengan catatan.");
      } else if (actionType === "REJECT_BOOKING") {
        await adminRejectBooking(targetBookingId, actionReason.trim());
        Alert.alert(
          "Pengajuan Ditolak",
          "Catatan revisi telah dikirim ke customer. Saldo DP terverifikasi (jika ada) otomatis dicatat di deposit kredit customer."
        );
      }

      setIsActionModalOpen(false);
      setSelectedBookingForDetail(null);
      refreshAll();
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Terjadi kesalahan.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Section Header */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderTitleRow}>
          <View style={styles.headerIconWrap}>
            <Flame size={20} color="#0D7A53" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Manajemen Geo Direct Use</Text>
            <Text style={styles.headerSubtitle}>
              Penyewaan Alat PGE Center of Excellence Area Kamojang
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={refreshAll} style={styles.refreshBtn} activeOpacity={0.75}>
          <RefreshCw size={14} color="#0D7A53" />
          <Text style={styles.refreshBtnText}>Perbarui</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Tabs Navigator */}
      <View style={styles.subTabsRow}>
        {[
          { key: "OVERVIEW", label: "Statistik", icon: TrendingUp },
          { key: "EQUIPMENT", label: "Katalog Alat", icon: Layers },
          { key: "BOOKINGS", label: "Pengajuan & Approval", icon: FileText },
          { key: "PAYMENT_CONFIG", label: "Metode Bayar", icon: QrCode },
          { key: "DP_LEDGER", label: "Ledger Saldo DP", icon: Coins },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTabBtn, active && styles.subTabBtnActive]}
              onPress={() => setSubTab(tab.key as any)}
              activeOpacity={0.8}
            >
              <Icon size={14} color={active ? "#0D7A53" : "#64748B"} />
              <Text style={[styles.subTabBtnText, active && styles.subTabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color="#0D7A53" />
          <Text style={styles.inlineLoadingText}>Menyelaraskan data...</Text>
        </View>
      )}

      {/* SUB-TAB 1: OVERVIEW */}
      {subTab === "OVERVIEW" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
          {/* Key Metric Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Alat CoE</Text>
              <Text style={styles.statVal}>{stats?.totalEquipments || equipments.length}</Text>
              <Text style={styles.statSub}>Placeholder & Aktif</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Pengajuan</Text>
              <Text style={styles.statVal}>{stats?.totalBookings || bookings.length}</Text>
              <Text style={styles.statSub}>Seluruh Transaksi</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Text style={[styles.statLabel, { color: "#92400E" }]}>Review Pembayaran</Text>
              <Text style={[styles.statVal, { color: "#B45309" }]}>
                {stats?.paymentReviewCount || 0}
              </Text>
              <Text style={[styles.statSub, { color: "#B45309" }]}>Perlu Verifikasi Bukti</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
              <Text style={[styles.statLabel, { color: "#1E40AF" }]}>Menunggu Approval</Text>
              <Text style={[styles.statVal, { color: "#1D4ED8" }]}>
                {stats?.waitingApprovalCount || 0}
              </Text>
              <Text style={[styles.statSub, { color: "#1D4ED8" }]}>DP Terverifikasi</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
              <Text style={[styles.statLabel, { color: "#166534" }]}>Disetujui (Approved)</Text>
              <Text style={[styles.statVal, { color: "#15803D" }]}>
                {stats?.approvedCount || 0}
              </Text>
              <Text style={[styles.statSub, { color: "#15803D" }]}>Nota Diterbitkan</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Text style={[styles.statLabel, { color: "#991B1B" }]}>Ditolak (Revisi)</Text>
              <Text style={[styles.statVal, { color: "#DC2626" }]}>
                {stats?.rejectedCount || 0}
              </Text>
              <Text style={[styles.statSub, { color: "#DC2626" }]}>DP Disimpan di Ledger</Text>
            </View>
          </View>

          {/* Financial Summary */}
          <View style={styles.financialBanner}>
            <View style={styles.finBannerCol}>
              <Text style={styles.finBannerLabel}>TOTAL ESTIMASI TRANSAKSI (GMV)</Text>
              <Text style={styles.finBannerVal}>{rp(stats?.totalGmv || 0)}</Text>
            </View>
            <View style={styles.finBannerDivider} />
            <View style={styles.finBannerCol}>
              <Text style={styles.finBannerLabel}>TOTAL DP TERVERIFIKASI</Text>
              <Text style={[styles.finBannerVal, { color: "#0D7A53" }]}>
                {rp(stats?.totalVerifiedDp || 0)}
              </Text>
            </View>
          </View>

          {/* Quick Guidance Box */}
          <View style={styles.guidanceBox}>
            <Text style={styles.guidanceTitle}>Panduan Operasional Admin PGE Kamojang:</Text>
            <Text style={styles.guidanceText}>
              1. Empat alat awal (Equipment 01–04) adalah placeholder dinamis. Anda dapat mengubah nama, spesifikasi,
              kapasitas, dan harga dasar di tab "Katalog Alat" kapan pun spesifikasi resmi PGE ditetapkan.{"\n"}
              2. Unggah gambar QRIS PGE dan nomor rekening bank di tab "Metode Bayar" agar customer dapat mentransfer DP.{"\n"}
              3. Ketika customer mengunggah bukti transfer, verifikasi pembayarannya terlebih dahulu sebelum memberikan
              persetujuan (approval) sewa.{"\n"}
              4. Jika pengajuan ditolak karena kesalahan jadwal atau dokumen, DP yang sudah diverifikasi tidak hilang,
              melainkan tersimpan di tab "Ledger Saldo DP" untuk digunakan saat customer mengajukan revisi.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* SUB-TAB 2: EQUIPMENT MANAGEMENT */}
      {subTab === "EQUIPMENT" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
          <View style={styles.actionHeaderRow}>
            <Text style={styles.actionHeaderTitle}>Daftar Alat CoE ({equipments.length})</Text>
            <TouchableOpacity style={styles.btnAdd} onPress={() => openEquipmentModal()} activeOpacity={0.8}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.btnAddText}>Tambah Alat</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableCard}>
            {equipments.map((eq) => (
              <View key={eq._id} style={styles.equipRow}>
                <View style={styles.equipInfoCol}>
                  <View style={styles.equipCodeBadge}>
                    <Text style={styles.equipCodeBadgeText}>{eq.code}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.equipName}>{eq.name}</Text>
                    <Text style={styles.equipSub} numberOfLines={1}>
                      {eq.description}
                    </Text>
                    <View style={styles.equipMetaRow}>
                      <Text style={styles.equipMetaPrice}>
                        {eq.basePrice > 0 ? `${rp(eq.basePrice)}/${eq.pricingUnit}` : "Harga: Menunggu PGE"}
                      </Text>
                      <Text style={styles.equipMetaDp}>DP: {eq.dpPercentage}%</Text>
                      <Text style={[styles.equipMetaStatus, { color: eq.isAvailable ? "#16A34A" : "#DC2626" }]}>
                        {eq.isAvailable ? "Tersedia" : "Digunakan"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.equipActions}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => openEquipmentModal(eq)}
                    activeOpacity={0.75}
                  >
                    <Edit2 size={15} color="#0D7A53" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => handleDeleteEquipment(eq._id, eq.name)}
                    activeOpacity={0.75}
                  >
                    <Trash2 size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* SUB-TAB 3: BOOKINGS & APPROVALS */}
      {subTab === "BOOKINGS" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
          {/* Search & Filter Bar */}
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={bookingSearch}
                onChangeText={setBookingSearch}
                placeholder="Cari kode booking atau nama customer..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPills}>
              {["ALL", "WAITING_PAYMENT", "PAYMENT_REVIEW", "WAITING_APPROVAL", "APPROVED", "REJECTED"].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterPill, bookingStatusFilter === st && styles.filterPillActive]}
                  onPress={() => setBookingStatusFilter(st)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterPillText, bookingStatusFilter === st && styles.filterPillTextActive]}>
                    {st === "ALL"
                      ? "Semua"
                      : st === "WAITING_PAYMENT"
                      ? "Menunggu DP"
                      : st === "PAYMENT_REVIEW"
                      ? "Verifikasi DP"
                      : st === "WAITING_APPROVAL"
                      ? "Siap Approve"
                      : st === "APPROVED"
                      ? "Disetujui"
                      : "Ditolak/Revisi"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bookings List */}
          <View style={styles.bookingsTable}>
            {bookings.length === 0 ? (
              <View style={styles.emptyTableBox}>
                <Text style={styles.emptyTableText}>Tidak ada transaksi booking pada filter ini.</Text>
              </View>
            ) : (
              bookings.map((b) => (
                <View key={b._id} style={styles.bookingTableRow}>
                  <View style={styles.bookingRowHeader}>
                    <View>
                      <Text style={styles.tableBookingCode}>{b.bookingCode}</Text>
                      <Text style={styles.tableCustomerName}>
                        {b.customerSnapshot.name} ({b.customerSnapshot.company || "Pribadi"})
                      </Text>
                    </View>
                    <View style={styles.tableBadges}>
                      <View
                        style={[
                          styles.tableStatusBadge,
                          {
                            backgroundColor:
                              b.bookingStatus === "APPROVED"
                                ? "#DCFCE7"
                                : b.bookingStatus === "REJECTED"
                                ? "#FEE2E2"
                                : "#FEF3C7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tableStatusBadgeText,
                            {
                              color:
                                b.bookingStatus === "APPROVED"
                                  ? "#15803D"
                                  : b.bookingStatus === "REJECTED"
                                  ? "#B91C1C"
                                  : "#B45309",
                            },
                          ]}
                        >
                          {b.bookingStatus}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tableRowDetails}>
                    <Text style={styles.tableDetailText}>
                      Alat: <Text style={{ fontWeight: "700" }}>{b.equipmentSnapshot.name}</Text> • Durasi:{" "}
                      {b.rentalSchedule.durationDays} Hari
                    </Text>
                    <Text style={styles.tableDetailText}>
                      Biaya: {rp(b.pricingSnapshot.totalRentalCost)} • DP ({b.pricingSnapshot.dpPercentage}%):{" "}
                      {rp(b.pricingSnapshot.requiredDpAmount)} (Status DP: {b.paymentStatus})
                    </Text>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.tableActionRow}>
                    <TouchableOpacity
                      style={styles.btnDetailSmall}
                      onPress={() => setSelectedBookingForDetail(b)}
                      activeOpacity={0.75}
                    >
                      <Eye size={13} color="#0D7A53" />
                      <Text style={styles.btnDetailSmallText}>Lihat Detail & Bukti</Text>
                    </TouchableOpacity>

                    {b.bookingStatus === "APPROVED" ? (
                      <TouchableOpacity
                        style={styles.btnInvoiceSmall}
                        onPress={() => setSelectedBookingForInvoice(b)}
                        activeOpacity={0.75}
                      >
                        <FileText size={13} color="#FFFFFF" />
                        <Text style={styles.btnInvoiceSmallText}>Nota Resmi (PDF)</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {b.paymentStatus === "WAITING_VERIFICATION" && (
                          <TouchableOpacity
                            style={styles.btnVerifySmall}
                            onPress={() => triggerVerifyPayment(b)}
                            activeOpacity={0.75}
                          >
                            <CheckCircle2 size={13} color="#FFFFFF" />
                            <Text style={styles.btnVerifySmallText}>Verifikasi DP</Text>
                          </TouchableOpacity>
                        )}

                        {b.paymentStatus === "VERIFIED" && (
                          <TouchableOpacity
                            style={styles.btnApproveSmall}
                            onPress={() => openActionModal("APPROVE_BOOKING", b._id)}
                            activeOpacity={0.75}
                          >
                            <ShieldCheck size={13} color="#FFFFFF" />
                            <Text style={styles.btnApproveSmallText}>Approve</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.btnRejectSmall}
                          onPress={() => openActionModal("REJECT_BOOKING", b._id)}
                          activeOpacity={0.75}
                        >
                          <XCircle size={13} color="#DC2626" />
                          <Text style={styles.btnRejectSmallText}>Tolak/Revisi</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* SUB-TAB 4: PAYMENT CONFIGURATION */}
      {subTab === "PAYMENT_CONFIG" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
          <View style={styles.configCard}>
            <Text style={styles.configCardTitle}>Pengaturan QRIS PGE Area Kamojang</Text>
            <View style={styles.configSwitchRow}>
              <Text style={styles.configSwitchLabel}>Aktifkan Pembayaran QRIS</Text>
              <Switch
                value={qrisEnabled}
                onValueChange={setQrisEnabled}
                trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                thumbColor={qrisEnabled ? "#0D7A53" : "#F1F5F9"}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>URL Gambar QRIS Resmi</Text>
              <TextInput
                style={styles.formInput}
                value={qrisImgUrl}
                onChangeText={setQrisImgUrl}
                placeholder="https://... URL gambar QRIS PGE"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nama Merchant QRIS</Text>
              <TextInput
                style={styles.formInput}
                value={qrisMerchant}
                onChangeText={setQrisMerchant}
                placeholder="PGE Area Kamojang - Geo Direct Use"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NMID QRIS</Text>
              <TextInput
                style={styles.formInput}
                value={qrisNmid}
                onChangeText={setQrisNmid}
                placeholder="ID NMID resmi"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Bank Accounts List */}
          <View style={styles.configCard}>
            <View style={styles.actionHeaderRow}>
              <Text style={styles.configCardTitle}>Daftar Rekening Bank Transfer PGE</Text>
              <TouchableOpacity style={styles.btnAddSmall} onPress={handleAddBankAccount} activeOpacity={0.8}>
                <Plus size={14} color="#0D7A53" />
                <Text style={styles.btnAddSmallText}>Tambah Rekening</Text>
              </TouchableOpacity>
            </View>

            {bankAccountsList.map((bank, idx) => (
              <View key={idx} style={styles.bankFormItem}>
                <View style={styles.bankFormHeader}>
                  <Text style={styles.bankFormIndex}>Rekening #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemoveBank(idx)}>
                    <Trash2 size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.formLabelSmall}>Nama Bank</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      value={bank.bankName}
                      onChangeText={(v) => handleUpdateBankField(idx, "bankName", v)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.formLabelSmall}>Nomor Rekening</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      value={bank.accountNumber}
                      onChangeText={(v) => handleUpdateBankField(idx, "accountNumber", v)}
                    />
                  </View>
                </View>

                <View style={[styles.formRow, { marginTop: 6 }]}>
                  <View style={{ flex: 1.5, marginRight: 8 }}>
                    <Text style={styles.formLabelSmall}>Atas Nama (Pemilik)</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      value={bank.accountHolder}
                      onChangeText={(v) => handleUpdateBankField(idx, "accountHolder", v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabelSmall}>Cabang</Text>
                    <TextInput
                      style={styles.formInputSmall}
                      value={bank.branch}
                      onChangeText={(v) => handleUpdateBankField(idx, "branch", v)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.btnSaveConfig, savingConfig && styles.btnDisabled]}
              onPress={handleSavePaymentConfig}
              disabled={savingConfig}
              activeOpacity={0.85}
            >
              {savingConfig ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnSaveConfigText}>Simpan Konfigurasi Pembayaran</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* SUB-TAB 5: DP BALANCE LEDGER */}
      {subTab === "DP_LEDGER" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
          <View style={styles.guidanceBox}>
            <Text style={styles.guidanceTitle}>Audit Trail Saldo DP Customer (Financial Integrity)</Text>
            <Text style={styles.guidanceText}>
              Setiap penolakan booking yang DP-nya sudah diverifikasi otomatis dikreditkan ke saldo customer di bawah ini.
              Saat customer mengajukan perbaikan, saldo langsung didebit dengan aman dan tanpa risiko double-crediting.
            </Text>
          </View>

          <View style={styles.tableCard}>
            {dpLedgers.length === 0 ? (
              <View style={styles.emptyTableBox}>
                <Text style={styles.emptyTableText}>Belum ada catatan mutasi deposit DP.</Text>
              </View>
            ) : (
              dpLedgers.map((item) => (
                <View key={item._id} style={styles.ledgerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerCustomer}>Customer ID: {String(item.customer).slice(-8)}</Text>
                    <Text style={styles.ledgerNote}>{item.notes}</Text>
                    <Text style={styles.ledgerDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.ledgerAmount,
                        { color: item.transactionType.includes("CREDIT") ? "#16A34A" : "#DC2626" },
                      ]}
                    >
                      {item.transactionType.includes("CREDIT") ? "+" : "-"} {rp(item.amount)}
                    </Text>
                    <Text style={styles.ledgerBalanceAfter}>Saldo: {rp(item.balanceAfter)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Equipment Add/Edit Modal */}
      <Modal visible={isEquipModalOpen} animationType="slide" transparent onRequestClose={() => setIsEquipModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEquipId ? "Edit Alat CoE" : "Tambah Alat Baru"}</Text>
              <TouchableOpacity onPress={() => setIsEquipModalOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody}>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Kode Alat *</Text>
                  <TextInput style={styles.formInput} value={formCode} onChangeText={setFormCode} placeholder="EQ-01" />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.formLabel}>Nama Alat *</Text>
                  <TextInput style={styles.formInput} value={formName} onChangeText={setFormName} placeholder="Equipment 01" />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Harga Dasar Pokok (IDR) - 0 jika menunggu PGE</Text>
                <TextInput
                  style={styles.formInput}
                  value={formBasePrice}
                  onChangeText={setFormBasePrice}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Satuan Harga</Text>
                  <TextInput style={styles.formInput} value={formPricingUnit} onChangeText={setFormPricingUnit} placeholder="per_hari" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Persentase DP (%)</Text>
                  <TextInput style={styles.formInput} value={formDpPercent} onChangeText={setFormDpPercent} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Deskripsi Singkat</Text>
                <TextInput style={[styles.formInput, { height: 50 }]} value={formDesc} onChangeText={setFormDesc} multiline />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Spesifikasi Teknis</Text>
                <TextInput style={[styles.formInput, { height: 50 }]} value={formSpec} onChangeText={setFormSpec} multiline />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fungsi / Kegunaan</Text>
                <TextInput style={[styles.formInput, { height: 50 }]} value={formFunc} onChangeText={setFormFunc} multiline />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kapasitas Alat</Text>
                <TextInput style={styles.formInput} value={formCapacity} onChangeText={setFormCapacity} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ketentuan & SOP Sewa</Text>
                <TextInput style={[styles.formInput, { height: 60 }]} value={formTerms} onChangeText={setFormTerms} multiline />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URL Foto Alat</Text>
                <TextInput style={styles.formInput} value={formImgUrl} onChangeText={setFormImgUrl} placeholder="https://..." />
              </View>

              <View style={styles.configSwitchRow}>
                <Text style={styles.configSwitchLabel}>Status Ketersediaan (Tersedia / Booking)</Text>
                <Switch value={formIsAvailable} onValueChange={setFormIsAvailable} />
              </View>

              <View style={styles.configSwitchRow}>
                <Text style={styles.configSwitchLabel}>Tampilkan di Katalog Customer (Aktif)</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnSaveModal, savingEquip && styles.btnDisabled]}
                onPress={handleSaveEquipment}
                disabled={savingEquip}
                activeOpacity={0.85}
              >
                {savingEquip ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnSaveModalText}>Simpan Alat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Booking Detail Modal with Payment Proof View */}
      <Modal visible={!!selectedBookingForDetail} animationType="slide" transparent onRequestClose={() => setSelectedBookingForDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Booking {selectedBookingForDetail?.bookingCode}</Text>
              <TouchableOpacity onPress={() => setSelectedBookingForDetail(null)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedBookingForDetail && (
              <ScrollView style={styles.modalScrollBody}>
                {/* Proof Preview */}
                {selectedBookingForDetail.paymentProof?.fileUrl ? (
                  <View style={styles.detailProofBox}>
                    <Text style={styles.detailProofTitle}>Bukti Transfer Pembayaran Customer:</Text>
                    <Image
                      source={{ uri: selectedBookingForDetail.paymentProof.fileUrl }}
                      style={styles.detailProofImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.detailProofDate}>
                      Diupload: {formatDate(selectedBookingForDetail.paymentProof.uploadedAt)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.detailNoProofBox}>
                    <Info size={16} color="#94A3B8" />
                    <Text style={styles.detailNoProofText}>Customer belum mengunggah bukti pembayaran.</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Data Customer</Text>
                  <Text style={styles.detailText}>Nama: {selectedBookingForDetail.customerSnapshot.name}</Text>
                  <Text style={styles.detailText}>Kontak: {selectedBookingForDetail.customerSnapshot.phone}</Text>
                  <Text style={styles.detailText}>Instansi: {selectedBookingForDetail.customerSnapshot.company || "-"}</Text>
                  <Text style={styles.detailText}>Alamat: {selectedBookingForDetail.customerSnapshot.address || "-"}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Informasi Sewa</Text>
                  <Text style={styles.detailText}>
                    Alat: {selectedBookingForDetail.equipmentSnapshot.name} ({selectedBookingForDetail.equipmentSnapshot.code})
                  </Text>
                  <Text style={styles.detailText}>
                    Jadwal: {formatDate(selectedBookingForDetail.rentalSchedule.startDate)} -{" "}
                    {formatDate(selectedBookingForDetail.rentalSchedule.endDate)} ({selectedBookingForDetail.rentalSchedule.durationDays} Hari)
                  </Text>
                  <Text style={styles.detailText}>Tujuan: {selectedBookingForDetail.usagePurpose}</Text>
                  <Text style={styles.detailText}>Lokasi: {selectedBookingForDetail.usageLocation}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSecTitle}>Rincian Finansial</Text>
                  <Text style={styles.detailText}>Total Biaya Sewa: {rp(selectedBookingForDetail.pricingSnapshot.totalRentalCost)}</Text>
                  <Text style={styles.detailText}>Down Payment: {rp(selectedBookingForDetail.pricingSnapshot.requiredDpAmount)}</Text>
                  <Text style={styles.detailText}>Status Pembayaran: {selectedBookingForDetail.paymentStatus}</Text>
                  <Text style={styles.detailText}>Status Pengajuan: {selectedBookingForDetail.bookingStatus}</Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooterActions}>
              {selectedBookingForDetail?.paymentStatus === "WAITING_VERIFICATION" && (
                <TouchableOpacity
                  style={styles.modalActionVerify}
                  onPress={() => triggerVerifyPayment(selectedBookingForDetail)}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={15} color="#FFFFFF" />
                  <Text style={styles.modalActionText}>Verifikasi DP</Text>
                </TouchableOpacity>
              )}

              {selectedBookingForDetail?.paymentStatus === "VERIFIED" &&
                selectedBookingForDetail?.bookingStatus !== "APPROVED" && (
                  <TouchableOpacity
                    style={styles.modalActionApprove}
                    onPress={() => openActionModal("APPROVE_BOOKING", selectedBookingForDetail._id)}
                    activeOpacity={0.8}
                  >
                    <ShieldCheck size={15} color="#FFFFFF" />
                    <Text style={styles.modalActionText}>Approve Pengajuan</Text>
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                style={styles.modalActionReject}
                onPress={() => openActionModal("REJECT_BOOKING", selectedBookingForDetail!._id)}
                activeOpacity={0.8}
              >
                <XCircle size={15} color="#DC2626" />
                <Text style={[styles.modalActionText, { color: "#DC2626" }]}>Tolak / Minta Revisi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action / Reason Prompt Modal */}
      <Modal visible={isActionModalOpen} animationType="fade" transparent onRequestClose={() => setIsActionModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardSmall}>
            <Text style={styles.modalSmallTitle}>
              {actionType === "APPROVE_BOOKING"
                ? "Persetujuan Penyewaan Alat"
                : actionType === "REJECT_PAYMENT"
                ? "Alasan Penolakan Bukti Pembayaran"
                : "Alasan Penolakan / Catatan Revisi"}
            </Text>

            <TextInput
              style={[styles.formInput, { height: 80, marginTop: 12 }]}
              value={actionReason}
              onChangeText={setActionReason}
              placeholder="Tuliskan catatan untuk customer..."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={styles.modalSmallFooter}>
              <TouchableOpacity style={styles.btnCancelSmall} onPress={() => setIsActionModalOpen(false)}>
                <Text style={styles.btnCancelSmallText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnConfirmSmall,
                  actionType === "APPROVE_BOOKING" ? styles.bgGreen : styles.bgRed,
                ]}
                onPress={handleExecuteAction}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnConfirmSmallText}>
                    {actionType === "APPROVE_BOOKING" ? "Setujui & Terbitkan Nota" : "Kirim Keputusan"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invoice PDF Modal */}
      <GeoDirectInvoiceModal
        visible={!!selectedBookingForInvoice}
        onClose={() => setSelectedBookingForInvoice(null)}
        booking={selectedBookingForInvoice}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
  },
  subTabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 6,
  },
  subTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  subTabBtnActive: {
    backgroundColor: "#EAF8F0",
  },
  subTabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  subTabBtnTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
  },
  inlineLoadingText: {
    fontSize: 11,
    color: "#0D7A53",
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  statVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 10,
    color: "#94A3B8",
  },
  financialBanner: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  finBannerCol: {
    flex: 1,
  },
  finBannerDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 14,
  },
  finBannerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  finBannerVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  guidanceBox: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 4,
    borderLeftColor: "#0D7A53",
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
    marginBottom: 4,
  },
  guidanceText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 18,
  },
  actionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  actionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnAddText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnAddSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnAddSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  equipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  equipInfoCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  equipCodeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 2,
  },
  equipCodeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },
  equipName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  equipSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  equipMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  equipMetaPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  equipMetaDp: {
    fontSize: 10,
    color: "#64748B",
  },
  equipMetaStatus: {
    fontSize: 10,
    fontWeight: "700",
  },
  equipActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionIconBtn: {
    padding: 7,
    borderRadius: 6,
    backgroundColor: "#EAF8F0",
  },
  filterBar: {
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
  },
  filterPills: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: "#0D7A53",
  },
  filterPillText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bookingsTable: {
    gap: 12,
  },
  emptyTableBox: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTableText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  bookingTableRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bookingRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tableBookingCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  tableCustomerName: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  tableBadges: {
    alignItems: "flex-end",
  },
  tableStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tableStatusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tableRowDetails: {
    marginVertical: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  tableDetailText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
  },
  tableActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  btnDetailSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btnDetailSmallText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0D7A53",
  },
  btnInvoiceSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnInvoiceSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnVerifySmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnVerifySmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnApproveSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnApproveSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnRejectSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnRejectSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  configCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  configCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  configSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  configSwitchLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  formGroup: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0F172A",
  },
  formRow: {
    flexDirection: "row",
  },
  bankFormItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bankFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bankFormIndex: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  formLabelSmall: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 2,
  },
  formInputSmall: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
  },
  btnSaveConfig: {
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  btnSaveConfigText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  ledgerCustomer: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  ledgerNote: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  ledgerDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: "800",
  },
  ledgerBalanceAfter: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCardLarge: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalScrollBody: {
    marginBottom: 12,
  },
  modalFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  btnSaveModal: {
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSaveModalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCardSmall: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  modalSmallTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSmallFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  btnCancelSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  btnCancelSmallText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  btnConfirmSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnConfirmSmallText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bgGreen: {
    backgroundColor: "#0D7A53",
  },
  bgRed: {
    backgroundColor: "#DC2626",
  },
  detailProofBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  detailProofTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  detailProofImg: {
    width: "100%",
    height: 180,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  detailProofDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
  },
  detailNoProofBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailNoProofText: {
    fontSize: 11,
    color: "#B45309",
  },
  detailSection: {
    marginBottom: 10,
  },
  detailSecTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  modalFooterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalActionVerify: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalActionApprove: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalActionReject: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
});
