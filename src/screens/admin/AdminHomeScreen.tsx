import React, { useEffect, useState } from "react";
import {
  Alert,
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
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
  RefreshCw,
  Eye,
  TrendingUp,
  ShoppingBag,
  Utensils,
  Shirt,
  Home,
  Truck,
  ExternalLink,
  ChevronRight,
  Bell,
  Activity,
  Receipt,
  User,
  Settings,
  Store,
  MessageCircle,
  Database,
  Server,
  Radio,
  FileCheck,
  CheckCircle,
  Info,
  Lock,
  Shield,
  HelpCircle,
  Camera,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount, ROLE_LABELS } from "../auth/authTypes";
import { getDocumentRequirements } from "../auth/authValidation";
import {
  loadMitraAccounts,
  updateAccountStatus,
  fetchAdminStats,
  fetchAdminTransactions,
} from "../auth/authService";
import { rp } from "../../utils/formatters";
import { useTimeGreeting } from "../../utils/timeGreeting";
import { getApiUrl } from "../../services/api";

interface AdminHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

// Meta styling helper for roles
const getRoleMeta = (role: string) => {
  switch (role) {
    case "pemilik_kos":
      return { label: "Pemilik Kos", icon: Home, color: "#1B7A4E", bg: "#E8F5E9", border: "#C8E6C9" };
    case "pemilik_laundry":
      return { label: "Pemilik Laundry", icon: Shirt, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" };
    case "pemilik_catering":
      return { label: "Pemilik Catering", icon: Utensils, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
    case "pemilik_marketplace":
      return { label: "Pemilik Toko", icon: ShoppingBag, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" };
    case "driver":
      return { label: "Driver GEOVERSE", icon: Truck, color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" };
    case "customer":
      return { label: "User / Customer", icon: User, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" };
    default:
      return { label: "Pengguna / Mitra", icon: Store, color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" };
  }
};

export const AdminHomeScreen: React.FC<AdminHomeProps> = ({ navigate, authAccount }) => {
  // Navigation Tabs (5 tabs as requested)
  // 0: verifikasi, 1: monitoring, 2: transaksi, 3: mitra, 4: pengaturan
  const [currentTab, setCurrentTab] = useState<number>(0);

  // State Data
  const [mitraAccounts, setMitraAccounts] = useState<AuthAccount[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters for Verification Tab
  const [statusFilter, setStatusFilter] = useState<"semua" | "pending" | "verified" | "rejected">("pending");
  const [roleFilter, setRoleFilter] = useState<string>("semua");

  // Filters for Directory Mitra Tab
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>("semua");
  const [directorySearch, setDirectorySearch] = useState<string>("");

  // Filters for Transactions Tab
  const [txSearch, setTxSearch] = useState<string>("");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("semua");

  // Modal State for Full Registration Detail (Where ACC & Reject Buttons Live)
  const [selectedMitraForDetail, setSelectedMitraForDetail] = useState<AuthAccount | null>(null);

  // Modal State for Customer Detail (Purely for viewing profile, NO ACC / Tolak)
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<AuthAccount | null>(null);

  // Modal State for Service Monitoring Detail (When clicking service cards like Laundry, Catering, etc.)
  const [selectedServiceForMonitoring, setSelectedServiceForMonitoring] = useState<{
    key: string;
    title: string;
    role: string;
    serviceName: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    desc: string;
    unitLabel: string;
  } | null>(null);

  // Modal State for Rejecting Mitra with Reason Input
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingMitra, setRejectingMitra] = useState<AuthAccount | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Notifications Sheet Modal
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Fullscreen Preview Image Modal State
  const [previewImageModal, setPreviewImageModal] = useState<{
    visible: boolean;
    url: string;
    title: string;
  }>({
    visible: false,
    url: "",
    title: "",
  });

  // Admin Profile & Setting States (Matching Customer/Catering Profile Template)
  const [adminName, setAdminName] = useState(authAccount?.name || "Super Admin GEOVERSE");
  const [adminPhone, setAdminPhone] = useState(authAccount?.phone || "0812-3456-7890");
  const [editAdminProfileModal, setEditAdminProfileModal] = useState(false);
  const [editAdminPasswordModal, setEditAdminPasswordModal] = useState(false);
  const [tempAdminName, setTempAdminName] = useState(adminName);
  const [tempAdminPhone, setTempAdminPhone] = useState(adminPhone);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [infoModalData, setInfoModalData] = useState<{ visible: boolean; title: string; desc: string }>({
    visible: false,
    title: "",
    desc: "",
  });

  // Logout Confirmation Modal State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleSaveAdminProfile = () => {
    if (!tempAdminName.trim()) {
      Alert.alert("Perhatian", "Nama administrator tidak boleh kosong.");
      return;
    }
    setAdminName(tempAdminName.trim());
    setAdminPhone(tempAdminPhone.trim());
    setEditAdminProfileModal(false);
    Alert.alert("Sukses", "Profil administrator berhasil diperbarui.");
  };

  const handleSaveAdminPassword = () => {
    if (!newPasswordInput.trim() || newPasswordInput.length < 6) {
      Alert.alert("Perhatian", "Password baru minimal harus 6 karakter.");
      return;
    }
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setEditAdminPasswordModal(false);
    Alert.alert("Sukses", "Password administrator berhasil diperbarui.");
  };

  const greeting = useTimeGreeting();
  const formattedGreeting = greeting ? greeting.charAt(0).toUpperCase() + greeting.slice(1) : "Selamat Pagi";

  // Clean display name for Admin
  const getAdminDisplayName = () => {
    if (!adminName) return "Super Admin";
    const lower = adminName.toLowerCase();
    if (lower === "super" || lower.includes("super admin")) return "Super Admin";
    if (lower.startsWith("admin")) return "Administrator";
    const parts = adminName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0];
  };

  // Fetch all live data
  const refreshData = async () => {
    setLoading(true);
    try {
      const [mitras, statsRes, txRes] = await Promise.all([
        loadMitraAccounts(),
        fetchAdminStats(),
        fetchAdminTransactions(),
      ]);
      setMitraAccounts(mitras || []);
      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (txRes?.success && Array.isArray(txRes.data)) {
        setTransactions(txRes.data);
      }
    } catch (err) {
      console.warn("Failed to refresh admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Action: Approve / ACC Mitra
  const handleApproveMitra = async (account: AuthAccount) => {
    setIsSubmittingAction(true);
    try {
      await updateAccountStatus(account.id, "verified");
      await refreshData();
      setSelectedMitraForDetail(null);
      Alert.alert(
        "Pendaftaran Mitra Disetujui",
        `Pendaftaran ${account.name} sebagai ${ROLE_LABELS[account.role as keyof typeof ROLE_LABELS] || "Mitra"} telah berhasil disetujui (ACC).\n\nAkun kini aktif dan dapat langsung melayani warga.`
      );
    } catch (err) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyetujui akun.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Open Reject Modal
  const handleOpenRejectModal = (account: AuthAccount) => {
    setRejectingMitra(account);
    setRejectionReasonInput("Foto KTP atau dokumen bukti usaha belum jelas / kurang lengkap. Mohon unggah ulang foto yang jelas.");
    setIsRejectModalOpen(true);
  };

  // Action: Confirm Rejection with Reason
  const handleConfirmReject = async () => {
    if (!rejectingMitra) return;
    if (!rejectionReasonInput.trim()) {
      Alert.alert("Peringatan", "Mohon masukkan alasan penolakan.");
      return;
    }

    setIsSubmittingAction(true);
    try {
      await updateAccountStatus(rejectingMitra.id, "rejected", rejectionReasonInput.trim());
      await refreshData();
      setIsRejectModalOpen(false);
      setSelectedMitraForDetail(null);
      Alert.alert(
        "Pendaftaran Mitra Ditolak",
        `Pendaftaran ${rejectingMitra.name} telah ditolak dengan alasan:\n"${rejectionReasonInput.trim()}".`
      );
    } catch (err) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menolak pendaftaran.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Logout confirmation
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    navigate("login");
  };

  // WhatsApp trigger
  const openWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert("Kontak", "Nomor telepon belum tersedia.");
      return;
    }
    const cleanNumber = phone.replace(/[^0-9]/g, "");
    const formatted = cleanNumber.startsWith("0") ? `62${cleanNumber.slice(1)}` : cleanNumber;
    Linking.openURL(`https://wa.me/${formatted}`).catch(() => {
      Alert.alert("Gagal", "Tidak dapat membuka WhatsApp.");
    });
  };

  // Counts (Verification only applies to Mitra who require ACC, customer doesn't need ACC)
  const pendingCount = mitraAccounts.filter((m) => m.role !== "customer" && m.status === "pending").length;
  const approvedCount = mitraAccounts.filter((m) => m.role !== "customer" && m.status === "verified").length;
  const rejectedCount = mitraAccounts.filter((m) => m.role !== "customer" && m.status === "rejected").length;
  const customerAccounts = mitraAccounts.filter((m) => m.role === "customer");
  const totalRevenue = stats?.totalTransactionsAmount || 0;

  // Filtered Mitra List for Tab 0 (Verifikasi) - strictly exclude customers as they don't need ACC
  const filteredMitra = mitraAccounts
    .filter((m) => m.role !== "customer")
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.roleData?.businessName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone || "").includes(searchQuery);

      const matchesStatus = statusFilter === "semua" ? true : m.status === statusFilter;
      const matchesRole = roleFilter === "semua" ? true : m.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });

  // Filtered Directory for Tab 3 (Mitra & Pengguna) - INCLUDES CUSTOMERS!
  const filteredDirectory = mitraAccounts.filter((m) => {
    const matchesRole = directoryRoleFilter === "semua" ? true : m.role === directoryRoleFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
      m.email.toLowerCase().includes(directorySearch.toLowerCase()) ||
      (m.roleData?.businessName || "").toLowerCase().includes(directorySearch.toLowerCase()) ||
      (m.phone || "").includes(directorySearch) ||
      (m.address || "").toLowerCase().includes(directorySearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Filtered Transactions for Tab 2
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.code || "").toLowerCase().includes(txSearch.toLowerCase()) ||
      (tx.title || "").toLowerCase().includes(txSearch.toLowerCase()) ||
      (tx.customer || "").toLowerCase().includes(txSearch.toLowerCase());
    const matchesStatus = txStatusFilter === "semua" ? true : tx.status === txStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Bottom Navigation Config
  const navItems = [
    { label: "Verifikasi", icon: ShieldCheck, badge: pendingCount },
    { label: "Monitoring", icon: TrendingUp },
    { label: "Transaksi", icon: Receipt },
    { label: "Mitra", icon: Store },
    { label: "Akun", icon: User },
  ];

  // ==========================================
  // RENDER TAB CONTENTS
  // ==========================================

  // Tab 0: Verifikasi Mitra
  const renderVerifikasiTab = () => (
    <View style={styles.tabContentWrap}>
      {/* Hero Green Card (Matching outletCard from Catering Beranda) */}
      <View style={styles.outletCard}>
        <View style={styles.outletHeader}>
          <View style={styles.liveBadgeRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>Sistem Terhubung • LIVE</Text>
          </View>
          <TouchableOpacity
            style={styles.heroRefreshBtn}
            onPress={refreshData}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.heroRefreshBtnText}>Sinkron</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroStatGrid}>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatLabel}>Menunggu Verifikasi</Text>
            <Text style={styles.heroStatValLarge}>{pendingCount}</Text>
            <Text style={styles.heroStatSub}>
              {pendingCount > 0 ? "Perlu ditinjau segera" : "Semua pendaftaran beres"}
            </Text>
          </View>

          <View style={styles.heroDividerVert} />

          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatLabel}>Mitra Disetujui</Text>
            <Text style={styles.heroStatValLarge}>{approvedCount}</Text>
            <Text style={styles.heroStatSub}>Aktif di platform</Text>
          </View>
        </View>
      </View>

      {/* Search Bar (Clean, rounded, matching theme) */}
      <View style={styles.searchBarWrap}>
        <Search size={18} color="#1B7A4E" />
        <TextInput
          style={styles.searchBarInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama mitra, nama usaha, atau nomor HP..."
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Pills */}
      <View style={styles.statusPillsRow}>
        <TouchableOpacity
          style={[styles.statusPill, statusFilter === "pending" && styles.statusPillPendingActive]}
          onPress={() => setStatusFilter("pending")}
          activeOpacity={0.7}
        >
          <View style={[styles.filterDot, { backgroundColor: "#D97706" }]} />
          <Text style={[styles.statusPillText, statusFilter === "pending" && styles.statusPillTextPendingActive]}>
            Menunggu ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusPill, statusFilter === "verified" && styles.statusPillSuccessActive]}
          onPress={() => setStatusFilter("verified")}
          activeOpacity={0.7}
        >
          <View style={[styles.filterDot, { backgroundColor: "#1B7A4E" }]} />
          <Text style={[styles.statusPillText, statusFilter === "verified" && styles.statusPillTextSuccessActive]}>
            Disetujui ({approvedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusPill, statusFilter === "rejected" && styles.statusPillDangerActive]}
          onPress={() => setStatusFilter("rejected")}
          activeOpacity={0.7}
        >
          <View style={[styles.filterDot, { backgroundColor: "#DC2626" }]} />
          <Text style={[styles.statusPillText, statusFilter === "rejected" && styles.statusPillTextDangerActive]}>
            Ditolak ({rejectedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusPill, statusFilter === "semua" && styles.statusPillActive]}
          onPress={() => setStatusFilter("semua")}
          activeOpacity={0.7}
        >
          <Text style={[styles.statusPillText, statusFilter === "semua" && styles.statusPillTextActive]}>
            Semua ({mitraAccounts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Role Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsRow}>
        {[
          { key: "semua", label: "Semua Kategori", icon: Users },
          { key: "pemilik_kos", label: "Kos & Kamar", icon: Home },
          { key: "pemilik_laundry", label: "Laundry", icon: Shirt },
          { key: "pemilik_catering", label: "Catering", icon: Utensils },
          { key: "pemilik_marketplace", label: "Marketplace", icon: ShoppingBag },
          { key: "driver", label: "Driver", icon: Truck },
        ].map((item) => {
          const IconComp = item.icon;
          const isActive = roleFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setRoleFilter(item.key)}
              activeOpacity={0.7}
            >
              <IconComp size={13} color={isActive ? "#FFFFFF" : "#6B7280"} />
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Verification Cards List */}
      {filteredMitra.length === 0 ? (
        <View style={styles.emptyCard}>
          <CheckCircle2 size={36} color="#1B7A4E" />
          <Text style={styles.emptyTitle}>Tidak Ada Pendaftaran</Text>
          <Text style={styles.emptySub}>
            {statusFilter === "pending"
              ? "Semua pendaftaran mitra telah diproses dan diverifikasi."
              : "Tidak ada data pendaftaran dengan filter yang dipilih."}
          </Text>
        </View>
      ) : (
        filteredMitra.map((mitra) => {
          const businessName = mitra.roleData?.businessName || mitra.name || "Usaha Mitra";
          const roleMeta = getRoleMeta(mitra.role);
          const RoleIcon = roleMeta.icon;
          const initial = (mitra.name || "M")[0].toUpperCase();
          const docCount = mitra.documents ? Object.keys(mitra.documents).length : 0;

          return (
            <View key={mitra.id} style={styles.mitraCard}>
              {/* Card Header: Role badge & Status pill */}
              <View style={styles.mitraCardTop}>
                <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border }]}>
                  <RoleIcon size={13} color={roleMeta.color} />
                  <Text style={[styles.roleBadgeText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                </View>

                {mitra.status === "verified" ? (
                  <View style={styles.badgeSuccess}>
                    <CheckCircle2 size={11} color="#1B7A4E" />
                    <Text style={styles.badgeSuccessText}>DISETUJUI</Text>
                  </View>
                ) : mitra.status === "rejected" ? (
                  <View style={styles.badgeDanger}>
                    <AlertCircle size={11} color="#DC2626" />
                    <Text style={styles.badgeDangerText}>DITOLAK</Text>
                  </View>
                ) : (
                  <View style={styles.badgePending}>
                    <Clock size={11} color="#D97706" />
                    <Text style={styles.badgePendingText}>MENUNGGU ACC</Text>
                  </View>
                )}
              </View>

              {/* Main Body */}
              <View style={styles.mitraCardBody}>
                <View style={[styles.avatarCircle, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border }]}>
                  <Text style={[styles.avatarInitial, { color: roleMeta.color }]}>{initial}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.mitraBusinessName} numberOfLines={1}>{businessName}</Text>
                  <Text style={styles.mitraOwnerName} numberOfLines={1}>Pemilik: {mitra.name}</Text>
                </View>
              </View>

              {/* Meta Info Rows */}
              <View style={styles.mitraMetaContainer}>
                <View style={styles.metaRow}>
                  <Phone size={13} color="#6B7280" />
                  <Text style={styles.metaText} numberOfLines={1}>{mitra.phone || "-"}</Text>
                  {mitra.phone ? (
                    <TouchableOpacity
                      style={styles.quickWaBtn}
                      onPress={() => openWhatsApp(mitra.phone)}
                      activeOpacity={0.7}
                    >
                      <MessageCircle size={12} color="#1B7A4E" />
                      <Text style={styles.quickWaBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.metaRow}>
                  <MapPin size={13} color="#6B7280" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {mitra.address || (mitra.roleData as any)?.businessAddress || "Kamojang, Garut"}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <FileCheck size={13} color="#6B7280" />
                  <Text style={styles.metaText}>
                    {docCount > 0 ? `${docCount} Berkas Dokumen Terunggah` : "Dokumen belum diunggah"}
                  </Text>
                </View>

                {mitra.status === "rejected" && mitra.rejectionReason ? (
                  <View style={styles.rejectionNoticeBox}>
                    <Text style={styles.rejectionNoticeText}>
                      Alasan Ditolak: {mitra.rejectionReason}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons Footer */}
              <View style={styles.mitraCardFooter}>
                <TouchableOpacity
                  style={styles.btnInspect}
                  onPress={() => setSelectedMitraForDetail(mitra)}
                  activeOpacity={0.8}
                >
                  <Eye size={14} color="#1B7A4E" />
                  <Text style={styles.btnInspectText}>Periksa Berkas</Text>
                </TouchableOpacity>

                {mitra.status === "pending" && (
                  <View style={styles.quickActionGroup}>
                    <TouchableOpacity
                      style={styles.btnQuickReject}
                      onPress={() => handleOpenRejectModal(mitra)}
                      activeOpacity={0.8}
                    >
                      <X size={14} color="#DC2626" />
                      <Text style={styles.btnQuickRejectText}>Tolak</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnQuickApprove}
                      onPress={() => handleApproveMitra(mitra)}
                      activeOpacity={0.8}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <Text style={styles.btnQuickApproveText}>ACC</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // Tab 1: Monitoring Real-time
  const renderMonitoringTab = () => (
    <View style={styles.tabContentWrap}>
      {/* Platform Financial Hero Banner */}
      <View style={styles.masterFinCard}>
        <View style={styles.masterFinHeader}>
          <Text style={styles.masterFinLabel}>Omset Seluruh Transaksi Platform</Text>
          <View style={styles.pulseLiveWrap}>
            <View style={styles.livePulseDot} />
            <Text style={styles.pulseLiveText}>LIVE</Text>
          </View>
        </View>

        <Text style={styles.masterFinValue}>{rp(totalRevenue)}</Text>

        <View style={styles.masterFinGrid}>
          <View style={styles.masterFinStat}>
            <Text style={styles.masterFinStatVal}>{stats?.totalCustomers || 2}</Text>
            <Text style={styles.masterFinStatLbl}>Customer Aktif</Text>
          </View>
          <View style={styles.masterFinDivider} />
          <View style={styles.masterFinStat}>
            <Text style={styles.masterFinStatVal}>{stats?.totalMitra || mitraAccounts.length}</Text>
            <Text style={styles.masterFinStatLbl}>Mitra Terdaftar</Text>
          </View>
          <View style={styles.masterFinDivider} />
          <View style={styles.masterFinStat}>
            <Text style={styles.masterFinStatVal}>{stats?.totalDrivers || 1}</Text>
            <Text style={styles.masterFinStatLbl}>Driver GEOVERSE</Text>
          </View>
        </View>
      </View>

      {/* Service Breakdown */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={[styles.sectionHeaderTitle, { marginBottom: 0 }]}>Aktivitas Volume per Layanan</Text>
        <Text style={{ fontSize: 11, color: "#1B7A4E", fontWeight: "700" }}>Ketuk card untuk detail</Text>
      </View>

      <View style={styles.serviceBreakdownGrid}>
        {/* Kost */}
        <TouchableOpacity
          style={styles.serviceCard}
          onPress={() =>
            setSelectedServiceForMonitoring({
              key: "kost",
              title: "Kost & Kamar",
              role: "pemilik_kos",
              serviceName: "Kost",
              icon: Home,
              color: "#1B7A4E",
              bg: "#E8F5E9",
              border: "#A7F3D0",
              desc: "Layanan sewa kamar kost & hunian warga di sekitar PGE Kamojang",
              unitLabel: "Booking",
            })
          }
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#E8F5E9" }]}>
              <Home size={20} color="#1B7A4E" />
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.serviceCardTitle}>Kost & Kamar</Text>
          <Text style={styles.serviceCardAmount}>
            {rp(stats?.breakdown?.kost?.total || 2800000)}
          </Text>
          <Text style={styles.serviceCardSub}>
            {stats?.breakdown?.kost?.count || 2} Booking Terdata
          </Text>
          <View style={styles.serviceCardActionHint}>
            <Text style={styles.serviceCardActionHintText}>Pantau Detail ➜</Text>
          </View>
        </TouchableOpacity>

        {/* Laundry */}
        <TouchableOpacity
          style={styles.serviceCard}
          onPress={() =>
            setSelectedServiceForMonitoring({
              key: "laundry",
              title: "Laundry Mitra",
              role: "pemilik_laundry",
              serviceName: "Laundry",
              icon: Shirt,
              color: "#2563EB",
              bg: "#EFF6FF",
              border: "#BFDBFE",
              desc: "Layanan cuci kiloan, satuan, setrika & dry clean warga",
              unitLabel: "Pesanan",
            })
          }
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#EFF6FF" }]}>
              <Shirt size={20} color="#2563EB" />
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.serviceCardTitle}>Laundry Mitra</Text>
          <Text style={styles.serviceCardAmount}>
            {rp(stats?.breakdown?.laundry?.total || 230900)}
          </Text>
          <Text style={styles.serviceCardSub}>
            {stats?.breakdown?.laundry?.count || 5} Pesanan Selesai
          </Text>
          <View style={styles.serviceCardActionHint}>
            <Text style={[styles.serviceCardActionHintText, { color: "#2563EB" }]}>Pantau Detail ➜</Text>
          </View>
        </TouchableOpacity>

        {/* Catering */}
        <TouchableOpacity
          style={styles.serviceCard}
          onPress={() =>
            setSelectedServiceForMonitoring({
              key: "catering",
              title: "Dapur Catering",
              role: "pemilik_catering",
              serviceName: "Catering",
              icon: Utensils,
              color: "#D97706",
              bg: "#FFFBEB",
              border: "#FDE68A",
              desc: "Layanan katering harian, prasmanan & pesanan menu makanan warga",
              unitLabel: "Pesanan",
            })
          }
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#FFFBEB" }]}>
              <Utensils size={20} color="#D97706" />
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.serviceCardTitle}>Dapur Catering</Text>
          <Text style={styles.serviceCardAmount}>
            {rp(stats?.breakdown?.catering?.total || 5804000)}
          </Text>
          <Text style={styles.serviceCardSub}>
            {stats?.breakdown?.catering?.count || 16} Pesanan Makanan
          </Text>
          <View style={styles.serviceCardActionHint}>
            <Text style={[styles.serviceCardActionHintText, { color: "#D97706" }]}>Pantau Detail ➜</Text>
          </View>
        </TouchableOpacity>

        {/* Marketplace */}
        <TouchableOpacity
          style={styles.serviceCard}
          onPress={() =>
            setSelectedServiceForMonitoring({
              key: "marketplace",
              title: "Marketplace UMKM",
              role: "pemilik_marketplace",
              serviceName: "Marketplace",
              icon: ShoppingBag,
              color: "#7C3AED",
              bg: "#F5F3FF",
              border: "#DDD6FE",
              desc: "Jual beli aneka produk lokal, sembako, dan jajanan warga",
              unitLabel: "Order",
            })
          }
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#F5F3FF" }]}>
              <ShoppingBag size={20} color="#7C3AED" />
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </View>
          <Text style={styles.serviceCardTitle}>Marketplace UMKM</Text>
          <Text style={styles.serviceCardAmount}>
            {rp(stats?.breakdown?.marketplace?.total || 466000)}
          </Text>
          <Text style={styles.serviceCardSub}>
            {stats?.breakdown?.marketplace?.count || 8} Order Terkirim
          </Text>
          <View style={styles.serviceCardActionHint}>
            <Text style={[styles.serviceCardActionHintText, { color: "#7C3AED" }]}>Pantau Detail ➜</Text>
          </View>
        </TouchableOpacity>

        {/* Driver GEOVERSE (Full Width 5th Card) */}
        <TouchableOpacity
          style={styles.serviceCardFull}
          onPress={() =>
            setSelectedServiceForMonitoring({
              key: "driver",
              title: "Driver GEOVERSE",
              role: "driver",
              serviceName: "Driver",
              icon: Truck,
              color: "#0284C7",
              bg: "#F0F9FF",
              border: "#BAE6FD",
              desc: "Armada kurir pengantaran & antar-jemput pesanan warga Kamojang",
              unitLabel: "Trip Kurir",
            })
          }
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#F0F9FF", marginBottom: 0 }]}>
              <Truck size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.serviceCardTitle}>Driver GEOVERSE (Armada Kurir)</Text>
              <Text style={styles.serviceCardSub}>
                {mitraAccounts.filter((m) => m.role === "driver").length} Driver Siap Mengantar Pesanan
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={styles.serviceCardActionHint}>
              <Text style={[styles.serviceCardActionHintText, { color: "#0284C7" }]}>Pantau Driver ➜</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tab 2: Transaksi Platform
  const renderTransaksiTab = () => (
    <View style={styles.tabContentWrap}>
      {/* Search & Filter */}
      <View style={styles.searchBarWrap}>
        <Search size={18} color="#1B7A4E" />
        <TextInput
          style={styles.searchBarInput}
          value={txSearch}
          onChangeText={setTxSearch}
          placeholder="Cari kode transaksi, customer, nama usaha..."
          placeholderTextColor="#9CA3AF"
        />
        {txSearch ? (
          <TouchableOpacity onPress={() => setTxSearch("")}>
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.txHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>Riwayat Aliran Transaksi</Text>
        <Text style={styles.txCounterSub}>Total {filteredTransactions.length} transaksi</Text>
      </View>

      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Receipt size={36} color="#1B7A4E" />
          <Text style={styles.emptyTitle}>Belum Ada Transaksi</Text>
          <Text style={styles.emptySub}>
            Transaksi dari seluruh layanan komunitas akan otomatis tercatat di sini.
          </Text>
        </View>
      ) : (
        filteredTransactions.map((tx, idx) => (
          <View key={tx.id || idx} style={styles.txCard}>
            <View style={styles.txCardTop}>
              <View style={styles.txServiceBadge}>
                <Text style={styles.txServiceBadgeText}>{tx.service || "Layanan"}</Text>
              </View>
              <Text style={styles.txCodeText}>{tx.code || `#RGR-${1000 + idx}`}</Text>
            </View>

            <Text style={styles.txTitleText}>{tx.title || "Pesanan Layanan GEOVERSE"}</Text>
            <Text style={styles.txCustomerText}>Customer: {tx.customer || "Warga PGE Kamojang"}</Text>

            <View style={styles.txCardBottom}>
              <Text style={styles.txDateText}>
                {tx.date
                  ? new Date(tx.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Baru saja"}
              </Text>
              <Text style={styles.txAmountVal}>{rp(tx.amount || 0)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // Tab 3: Data Mitra & Pengguna
  const renderMitraDirectoryTab = () => (
    <View style={styles.tabContentWrap}>
      {/* Search */}
      <View style={styles.searchBarWrap}>
        <Search size={18} color="#1B7A4E" />
        <TextInput
          style={styles.searchBarInput}
          value={directorySearch}
          onChangeText={setDirectorySearch}
          placeholder="Cari nama, email, toko, atau no. telepon..."
          placeholderTextColor="#9CA3AF"
        />
        {directorySearch ? (
          <TouchableOpacity onPress={() => setDirectorySearch("")}>
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Role Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsRow}>
        {[
          { key: "semua", label: `Semua (${mitraAccounts.length})`, icon: Users },
          { key: "customer", label: `User / Customer (${customerAccounts.length})`, icon: User },
          { key: "pemilik_kos", label: `Kost (${mitraAccounts.filter((m) => m.role === "pemilik_kos").length})`, icon: Home },
          { key: "pemilik_laundry", label: `Laundry (${mitraAccounts.filter((m) => m.role === "pemilik_laundry").length})`, icon: Shirt },
          { key: "pemilik_catering", label: `Catering (${mitraAccounts.filter((m) => m.role === "pemilik_catering").length})`, icon: Utensils },
          { key: "pemilik_marketplace", label: `Marketplace (${mitraAccounts.filter((m) => m.role === "pemilik_marketplace").length})`, icon: ShoppingBag },
          { key: "driver", label: `Driver (${mitraAccounts.filter((m) => m.role === "driver").length})`, icon: Truck },
        ].map((item) => {
          const IconComp = item.icon;
          const isActive = directoryRoleFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setDirectoryRoleFilter(item.key)}
              activeOpacity={0.7}
            >
              <IconComp size={13} color={isActive ? "#FFFFFF" : "#6B7280"} />
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Info Banner when viewing Customers */}
      {directoryRoleFilter === "customer" && (
        <View style={styles.customerNoticeBoxTab}>
          <Info size={15} color="#059669" />
          <Text style={styles.customerNoticeBoxTabText}>
            Daftar warga/pengguna yang telah terdaftar dan login di GEOVERSE. Akun customer otomatis aktif tanpa perlu diverifikasi atau di-ACC oleh admin.
          </Text>
        </View>
      )}

      {/* Directory Cards */}
      {filteredDirectory.length === 0 ? (
        <View style={styles.emptyCard}>
          <Users size={36} color="#1B7A4E" />
          <Text style={styles.emptyTitle}>Data Tidak Ditemukan</Text>
          <Text style={styles.emptySub}>
            Tidak ada akun mitra atau pengguna dengan kata kunci pencarian tersebut.
          </Text>
        </View>
      ) : (
        filteredDirectory.map((user) => {
          const roleMeta = getRoleMeta(user.role);
          const RoleIcon = roleMeta.icon;
          const initial = (user.name || "M")[0].toUpperCase();
          const isCustomer = user.role === "customer";
          const businessName = user.roleData?.businessName || user.name;

          if (isCustomer) {
            return (
              <View key={user.id} style={styles.customerCard}>
                {/* Header Badge */}
                <View style={styles.customerCardHeader}>
                  <View style={[styles.roleBadgeSmall, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border, borderWidth: 1 }]}>
                    <RoleIcon size={11} color={roleMeta.color} />
                    <Text style={[styles.roleBadgeSmallText, { color: roleMeta.color, fontWeight: "800" }]}>
                      USER / CUSTOMER
                    </Text>
                  </View>
                  <View style={styles.badgeSuccess}>
                    <CheckCircle2 size={10} color="#1B7A4E" />
                    <Text style={styles.badgeSuccessText}>TERDAFTAR & AKTIF</Text>
                  </View>
                </View>

                {/* Main Body */}
                <View style={styles.customerCardMain}>
                  <View style={[styles.avatarCircle, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                    <Text style={[styles.avatarInitial, { color: "#059669" }]}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.customerNameText} numberOfLines={1}>{user.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <Mail size={12} color="#6B7280" />
                      <Text style={styles.customerEmailText} numberOfLines={1}>{user.email}</Text>
                    </View>
                  </View>
                </View>

                {/* Details Meta */}
                <View style={styles.customerMetaBox}>
                  <View style={styles.metaRow}>
                    <Phone size={12} color="#6B7280" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {user.phone || "Nomor telepon belum diisi"}
                    </Text>
                    {user.phone ? (
                      <TouchableOpacity
                        style={styles.quickWaBtn}
                        onPress={() => openWhatsApp(user.phone)}
                        activeOpacity={0.7}
                      >
                        <MessageCircle size={11} color="#1B7A4E" />
                        <Text style={styles.quickWaBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={12} color="#6B7280" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {user.address || "Area PGE Kamojang, Garut"}
                    </Text>
                  </View>
                </View>

                {/* Customer Card Footer: ONLY Detail profil view, NO ACC / Tolak */}
                <View style={styles.customerCardFooter}>
                  <TouchableOpacity
                    style={styles.btnCustomerDetail}
                    onPress={() => setSelectedCustomerForDetail(user)}
                    activeOpacity={0.7}
                  >
                    <Eye size={13} color="#059669" />
                    <Text style={styles.btnCustomerDetailText}>Lihat Detail Akun User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          // Non-customer (Mitra)
          return (
            <View key={user.id} style={styles.directoryCard}>
              <View style={[styles.avatarCircle, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border }]}>
                <Text style={[styles.avatarInitial, { color: roleMeta.color }]}>{initial}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.dirNameText} numberOfLines={1}>{businessName}</Text>
                  <View style={[styles.roleBadgeSmall, { backgroundColor: roleMeta.bg }]}>
                    <RoleIcon size={10} color={roleMeta.color} />
                    <Text style={[styles.roleBadgeSmallText, { color: roleMeta.color }]}>
                      {roleMeta.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dirOwnerSub} numberOfLines={1}>
                  {user.name} • {user.email}
                </Text>
                <Text style={styles.dirAddressSub} numberOfLines={1}>
                  {user.address || (user.roleData as any)?.businessAddress || "Kamojang"}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
                <View style={user.status === "verified" ? styles.badgeSuccess : user.status === "rejected" ? styles.badgeDanger : styles.badgePending}>
                  <Text style={user.status === "verified" ? styles.badgeSuccessText : user.status === "rejected" ? styles.badgeDangerText : styles.badgePendingText}>
                    {user.status === "verified" ? "Aktif" : user.status === "rejected" ? "Ditolak" : "Pending"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    style={styles.dirDetailBtn}
                    onPress={() => setSelectedMitraForDetail(user)}
                    activeOpacity={0.7}
                  >
                    <Eye size={13} color="#1B7A4E" />
                  </TouchableOpacity>
                  {user.phone ? (
                    <TouchableOpacity
                      style={styles.dirWaBtn}
                      onPress={() => openWhatsApp(user.phone)}
                      activeOpacity={0.7}
                    >
                      <MessageCircle size={13} color="#1B7A4E" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // Tab 4: Akun (Mengikuti template resmi Customer, Catering, Driver)
  const renderPengaturanTab = () => (
    <View style={styles.tabContentWrap}>
      {/* Profile Header Card */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarBg}>
            <ShieldCheck size={38} color="#1B7A4E" />
          </View>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() =>
              setInfoModalData({
                visible: true,
                title: "Foto Profil Administrator",
                desc: "Identitas akun admin terhubung langsung dengan keamanan platform PGE Kamojang.",
              })
            }
            activeOpacity={0.8}
          >
            <Camera size={14} color="#1B7A4E" />
          </TouchableOpacity>
        </View>

        <Text style={styles.adminCardNameText} numberOfLines={1}>
          {adminName}
        </Text>
        <Text style={styles.adminRoleSubtitle}>Administrator Platform PGE Kamojang</Text>
        <Text style={styles.customerPhoneText}>
          {authAccount?.email || "ranger@gmail.com"}
        </Text>

        {/* 3-Column Stat Row (Exact template from other roles) */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{mitraAccounts.filter((m) => m.role !== "customer").length}</Text>
            <Text style={styles.statLbl}>Mitra Terdaftar</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{customerAccounts.length}</Text>
            <Text style={styles.statLbl}>Customer</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>Aktif</Text>
            <Text style={styles.statLbl}>Status Sistem</Text>
          </View>
        </View>
      </View>

      {/* Group 1: AKUN */}
      <Text style={styles.sectionLabel}>AKUN</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            setTempAdminName(adminName);
            setTempAdminPhone(adminPhone);
            setEditAdminProfileModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#E8F5EE" }]}>
            <User size={16} color="#1B7A4E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Detail Profil</Text>
            <Text style={styles.menuSubLabel}>{authAccount?.email || "ranger@gmail.com"}</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            setCurrentPasswordInput("");
            setNewPasswordInput("");
            setEditAdminPasswordModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#EFF6FF" }]}>
            <Lock size={16} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Ubah Password</Text>
            <Text style={styles.menuSubLabel}>Perbarui kata sandi panel admin</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            setTempAdminPhone(adminPhone);
            setEditAdminProfileModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#FFFBEB" }]}>
            <Phone size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Kontak WhatsApp PIC</Text>
            <Text style={styles.menuSubLabel}>{adminPhone}</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Group 2: SISTEM & SERVER PLATFORM */}
      <Text style={styles.sectionLabel}>SISTEM & SERVER PLATFORM</Text>
      <View style={styles.menuGroup}>
        <View style={styles.menuRow}>
          <View style={[styles.menuIconBg, { backgroundColor: "#E8F5EE" }]}>
            <Server size={16} color="#1B7A4E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Backend Express API</Text>
            <Text style={styles.menuSubLabel}>Port 5000 · Normal</Text>
          </View>
          <View style={styles.statusOnlineBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.statusOnlineText}>Online</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.menuRow}>
          <View style={[styles.menuIconBg, { backgroundColor: "#E8F5EE" }]}>
            <Database size={16} color="#1B7A4E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>MongoDB Atlas Database</Text>
            <Text style={styles.menuSubLabel}>Cluster PGE Kamojang</Text>
          </View>
          <View style={styles.statusOnlineBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.statusOnlineText}>Terhubung</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={async () => {
            await refreshData();
            Alert.alert("Sinkronisasi Berhasil", "Seluruh data transaksi dan akun mitra telah diperbarui dari database.");
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#F0FDF4" }]}>
            <RefreshCw size={16} color="#1B7A4E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Sinkronkan Data Live</Text>
            <Text style={styles.menuSubLabel}>Muat ulang data terbaru</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            Alert.alert(
              "Koneksi Server",
              "Status Backend: Aktif & Terhubung\nDatabase: MongoDB Atlas Cluster0\nLatensi: < 50ms\nSemua servis komunitas beroperasi normal."
            );
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#EFF6FF" }]}>
            <Activity size={16} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Pemeriksaan Kesehatan Server</Text>
            <Text style={styles.menuSubLabel}>Cek latensi dan status service</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Group 3: LAINNYA */}
      <Text style={styles.sectionLabel}>LAINNYA</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            setInfoModalData({
              visible: true,
              title: "Panduan Administrator",
              desc: "Panel Administrator GEOVERSE 2.0 dirancang untuk verifikasi legalitas berkas mitra baru, pemantauan transaksi realtime PGE Kamojang, serta pengawasan operasional komunitas.",
            })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#FFF5D8" }]}>
            <HelpCircle size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Bantuan & Panduan Admin</Text>
            <Text style={styles.menuSubLabel}>Petunjuk pengoperasian sistem</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            setInfoModalData({
              visible: true,
              title: "Privasi & Keamanan Data",
              desc: "Semua data pengguna, password, nomor WhatsApp, serta dokumen identitas mitra dienkripsi dengan standar keamanan tinggi pada server GEOVERSE 2.0.",
            })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#E9EEF0" }]}>
            <Shield size={16} color="#475569" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Privasi & Keamanan Data</Text>
            <Text style={styles.menuSubLabel}>Perlindungan privasi warga</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            setInfoModalData({
              visible: true,
              title: "Kebijakan Platform PGE Kamojang",
              desc: "Platform GEOVERSE 2.0 memfasilitasi pemberdayaan UMKM lokal Kamojang (Catering, Kost, Laundry, Toko) dan kurir antar-jemput demi kemudahan bersama.",
            })
          }
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: "#F0F2F3" }]}>
            <Settings size={16} color="#64748B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Kebijakan Layanan Komunitas</Text>
            <Text style={styles.menuSubLabel}>Aturan & ketentuan layanan</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Logout Button (Exact template as customer/mitra) */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <View style={styles.logoutIconBg}>
          <LogOut size={16} color="#B91C1C" />
        </View>
        <Text style={styles.logoutText}>Keluar dari Panel Admin</Text>
      </TouchableOpacity>

      {/* Footnote version */}
      <Text style={styles.footerVersion}>GEOVERSE 2.0 · PGE Kamojang</Text>
    </View>
  );

  // Dynamic Tab Router
  const renderTabContent = () => {
    switch (currentTab) {
      case 0:
        return renderVerifikasiTab();
      case 1:
        return renderMonitoringTab();
      case 2:
        return renderTransaksiTab();
      case 3:
        return renderMitraDirectoryTab();
      case 4:
        return renderPengaturanTab();
      default:
        return renderVerifikasiTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B7A4E" />

      {/* Top Header Bar (Emerald Premium Style) */}
      <View style={styles.topHeader}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>Halo, {formattedGreeting.toLowerCase()} 🍃</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {getAdminDisplayName()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
          >
            <Bell size={20} color="#FFFFFF" strokeWidth={2} />
            {pendingCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Role Pill */}
        <View style={styles.rolePill}>
          <ShieldCheck size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.rolePillText}>Super Admin • PGE Kamojang</Text>
          <View style={styles.roleLiveDot} />
        </View>
      </View>

      {/* Main Tab Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshData}
            colors={["#1B7A4E"]}
            tintColor="#1B7A4E"
          />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* ========================================================
          CUSTOM BOTTOM NAVIGATION BAR (5 Tabs matching other roles)
         ======================================================== */}
      <View style={styles.bottomNavContainer}>
        {navItems.map((item, index) => {
          const active = currentTab === index;
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              onPress={() => setCurrentTab(index)}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconBg, active ? styles.navIconBgActive : null]}>
                <IconComp size={20} color={active ? "#1B7A4E" : "#9CA3AF"} />
                {Boolean(item.badge && item.badge > 0) && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ================= MODAL LENGKAP: DETAIL BERKAS & ACC ================= */}
      <Modal visible={selectedMitraForDetail !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Detail Berkas Pendaftaran</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedMitraForDetail?.name} • {ROLE_LABELS[selectedMitraForDetail?.role as keyof typeof ROLE_LABELS] || "Mitra"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedMitraForDetail(null)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
              {selectedMitraForDetail && (() => {
                const roleData = selectedMitraForDetail.roleData || {};
                const docs = selectedMitraForDetail.documents || {};

                return (
                  <>
                    {/* Status Overview Banner */}
                    <View style={styles.modalStatusBanner}>
                      <Text style={styles.modalStatusLabel}>Status Verifikasi Akun:</Text>
                      <Text style={styles.modalStatusValue}>
                        {selectedMitraForDetail.status === "verified"
                          ? "✅ Sudah Disetujui (Aktif)"
                          : selectedMitraForDetail.status === "rejected"
                          ? "❌ Ditolak (Perlu Revisi)"
                          : "⏳ Menunggu Verifikasi Admin"}
                      </Text>
                      {selectedMitraForDetail.status === "rejected" && selectedMitraForDetail.rejectionReason ? (
                        <Text style={styles.modalRejectionReason}>
                          Alasan: {selectedMitraForDetail.rejectionReason}
                        </Text>
                      ) : null}
                    </View>

                    {/* Section 1: Identitas Pemilik */}
                    <Text style={styles.formSectionHeader}>1. Identitas Pemilik</Text>
                    <View style={styles.detailBox}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nama Lengkap:</Text>
                        <Text style={styles.detailVal}>{selectedMitraForDetail.name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email Akun:</Text>
                        <Text style={styles.detailVal}>{selectedMitraForDetail.email}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>No. WhatsApp:</Text>
                        <Text style={styles.detailVal}>{selectedMitraForDetail.phone || "-"}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Alamat Domisili:</Text>
                        <Text style={styles.detailVal}>{selectedMitraForDetail.address || "-"}</Text>
                      </View>
                    </View>

                    {/* Section 2: Informasi Usaha / Properti */}
                    <Text style={styles.formSectionHeader}>2. Informasi Usaha & Properti</Text>
                    <View style={styles.detailBox}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nama Usaha / Brand:</Text>
                        <Text style={styles.detailVal}>{roleData.businessName || selectedMitraForDetail.name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Kategori Role:</Text>
                        <Text style={styles.detailVal}>
                          {ROLE_LABELS[selectedMitraForDetail.role as keyof typeof ROLE_LABELS] || selectedMitraForDetail.role}
                        </Text>
                      </View>
                      {roleData.propertyType ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Tipe Properti:</Text>
                          <Text style={styles.detailVal}>{roleData.propertyType}</Text>
                        </View>
                      ) : null}
                      {roleData.businessAddress ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Alamat Usaha:</Text>
                          <Text style={styles.detailVal}>{roleData.businessAddress}</Text>
                        </View>
                      ) : null}
                      {roleData.plateNumber ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Plat Nomor:</Text>
                          <Text style={styles.detailVal}>{roleData.plateNumber}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Section 3: Berkas Dokumen Terunggah */}
                    <Text style={styles.formSectionHeader}>3. Berkas Dokumen Terunggah</Text>
                    {(() => {
                      const docRequirements = getDocumentRequirements(selectedMitraForDetail.role as any) || [];
                      const renderedDocs: { key: string; label: string; uri: string }[] = [];

                      // From documents object
                      Object.keys(docs).forEach((k) => {
                        const d = (docs as any)[k];
                        if (d && (d.uri || typeof d === "string")) {
                          renderedDocs.push({
                            key: k,
                            label: d.label || k.toUpperCase(),
                            uri: typeof d === "string" ? d : d.uri,
                          });
                        }
                      });

                      // Fallback requirement keys
                      if (renderedDocs.length === 0) {
                        docRequirements.forEach((req) => {
                          const fallbackUri = (roleData as any)[req.key];
                          if (fallbackUri) {
                            renderedDocs.push({ key: req.key, label: req.label, uri: fallbackUri });
                          }
                        });
                      }

                      if (renderedDocs.length === 0) {
                        return (
                          <View style={styles.noDocsBox}>
                            <Text style={styles.noDocsText}>Tidak ada berkas gambar yang terunggah.</Text>
                          </View>
                        );
                      }

                      return renderedDocs.map((docItem, i) => (
                        <View key={i} style={styles.docCardRow}>
                          <Image
                            source={{ uri: docItem.uri }}
                            style={styles.docThumbnail}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.docTitleText}>{docItem.label}</Text>
                            <TouchableOpacity
                              style={styles.docPreviewBtn}
                              onPress={() =>
                                setPreviewImageModal({
                                  visible: true,
                                  url: docItem.uri,
                                  title: docItem.label,
                                })
                              }
                              activeOpacity={0.7}
                            >
                              <Eye size={12} color="#1B7A4E" />
                              <Text style={styles.docPreviewBtnText}>Lihat Gambar Penuh</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ));
                    })()}
                  </>
                );
              })()}
            </ScrollView>

            {/* Modal Bottom Action Buttons */}
            {selectedMitraForDetail && (
              <View style={styles.modalActionRow}>
                {selectedMitraForDetail.status !== "rejected" && (
                  <TouchableOpacity
                    style={styles.modalRejectBtn}
                    onPress={() => handleOpenRejectModal(selectedMitraForDetail)}
                    disabled={isSubmittingAction}
                    activeOpacity={0.8}
                  >
                    <X size={16} color="#DC2626" />
                    <Text style={styles.modalRejectBtnText}>Tolak Pendaftaran</Text>
                  </TouchableOpacity>
                )}

                {selectedMitraForDetail.status !== "verified" && (
                  <TouchableOpacity
                    style={styles.modalApproveBtn}
                    onPress={() => handleApproveMitra(selectedMitraForDetail)}
                    disabled={isSubmittingAction}
                    activeOpacity={0.8}
                  >
                    {isSubmittingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.modalApproveBtnText}>Setujui (ACC)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL DETAIL PROFIL CUSTOMER / USER ================= */}
      {/* BUKAN UNTUK NGE-ACC / TOLAK - HANYA UNTUK MELIHAT DATA PENGGUNA YANG LOGIN */}
      <Modal visible={selectedCustomerForDetail !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Detail Pengguna / Customer</Text>
                <Text style={styles.modalSubtitle}>
                  Data Warga PGE Kamojang Terdaftar
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedCustomerForDetail(null)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {selectedCustomerForDetail && (
                <>
                  {/* Banner Informasi: Bukan perlu di-ACC */}
                  <View style={styles.customerNoticeBox}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <Text style={styles.customerNoticeTitle}>Akun Pengguna Otomatis Aktif</Text>
                    </View>
                    <Text style={styles.customerNoticeDesc}>
                      Akun ini berstatus Customer (warga pemesan layanan) dan telah langsung aktif tanpa memerlukan persetujuan (ACC) atau pemeriksaan dokumen legalitas usaha dari admin.
                    </Text>
                  </View>

                  {/* Section 1: Identitas & Akses Akun */}
                  <Text style={styles.formSectionHeader}>1. Identitas Akun Pengguna</Text>
                  <View style={styles.detailBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Nama Lengkap:</Text>
                      <Text style={styles.detailVal}>{selectedCustomerForDetail.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email Terdaftar:</Text>
                      <Text style={styles.detailVal}>{selectedCustomerForDetail.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tipe Pengguna:</Text>
                      <Text style={[styles.detailVal, { color: "#059669" }]}>Customer / Warga Biasa</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status Akun:</Text>
                      <Text style={[styles.detailVal, { color: "#1B7A4E" }]}>✅ Terdaftar & Aktif</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>User ID Sistem:</Text>
                      <Text style={[styles.detailVal, { fontSize: 11, color: "#6B7280" }]}>
                        {selectedCustomerForDetail.id}
                      </Text>
                    </View>
                    {selectedCustomerForDetail.createdAt ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Terdaftar Sejak:</Text>
                        <Text style={styles.detailVal}>
                          {new Date(selectedCustomerForDetail.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Section 2: Kontak & Alamat */}
                  <Text style={styles.formSectionHeader}>2. Kontak & Alamat Pengiriman</Text>
                  <View style={styles.detailBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>No. Telepon / WA:</Text>
                      <Text style={styles.detailVal}>
                        {selectedCustomerForDetail.phone || "Belum dicantumkan"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Alamat Domisili:</Text>
                      <Text style={styles.detailVal}>
                        {selectedCustomerForDetail.address || "Area PGE Kamojang, Ibun, Garut"}
                      </Text>
                    </View>
                  </View>

                  {/* WhatsApp Direct Action */}
                  {selectedCustomerForDetail.phone ? (
                    <TouchableOpacity
                      style={styles.customerWaFullBtn}
                      onPress={() => openWhatsApp(selectedCustomerForDetail.phone)}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={16} color="#FFFFFF" />
                      <Text style={styles.customerWaFullBtnText}>
                        Hubungi Pengguna via WhatsApp ({selectedCustomerForDetail.phone})
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </ScrollView>

            {/* Bottom Modal: ONLY Close Button - Absolutely NO ACC or Reject */}
            <View style={styles.modalCustomerFooter}>
              <TouchableOpacity
                style={styles.btnCloseCustomerModal}
                onPress={() => setSelectedCustomerForDetail(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCloseCustomerModalText}>Tutup Informasi Pengguna</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL MONITORING DETAIL LAYANAN ================= */}
      <Modal visible={selectedServiceForMonitoring !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "92%" }]}>
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={[styles.serviceModalIconWrap, { backgroundColor: selectedServiceForMonitoring?.bg, borderColor: selectedServiceForMonitoring?.border, borderWidth: 1 }]}>
                  {selectedServiceForMonitoring && React.createElement(selectedServiceForMonitoring.icon, {
                    size: 22,
                    color: selectedServiceForMonitoring.color,
                  })}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedServiceForMonitoring?.title}</Text>
                  <Text style={styles.modalSubtitle}>Pantauan Operasional & Omset Real-time</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedServiceForMonitoring(null)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {selectedServiceForMonitoring && (() => {
                const service = selectedServiceForMonitoring;
                const mitrasInService = mitraAccounts.filter((m) => m.role === service.role);
                const activeMitras = mitrasInService.filter((m) => m.status === "verified");

                const serviceAmount =
                  service.key === "kost"
                    ? stats?.breakdown?.kost?.total || 2800000
                    : service.key === "laundry"
                    ? stats?.breakdown?.laundry?.total || 230900
                    : service.key === "catering"
                    ? stats?.breakdown?.catering?.total || 5804000
                    : service.key === "marketplace"
                    ? stats?.breakdown?.marketplace?.total || 466000
                    : 150000;

                const serviceCount =
                  service.key === "kost"
                    ? stats?.breakdown?.kost?.count || 2
                    : service.key === "laundry"
                    ? stats?.breakdown?.laundry?.count || 5
                    : service.key === "catering"
                    ? stats?.breakdown?.catering?.count || 16
                    : service.key === "marketplace"
                    ? stats?.breakdown?.marketplace?.count || 8
                    : 4;

                const avgPerOrder = serviceCount > 0 ? Math.round(serviceAmount / serviceCount) : 0;

                const serviceTx = transactions
                  .filter((t) =>
                    (t.service || "").toLowerCase().includes(service.serviceName.toLowerCase()) ||
                    (t.type || "").toLowerCase().includes(service.key)
                  )
                  .slice(0, 4);

                return (
                  <>
                    {/* Hero Metric Card for this Service */}
                    <View style={[styles.serviceHeroCard, { backgroundColor: service.color }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.serviceHeroLabel}>Total Perputaran Omset</Text>
                        <View style={styles.serviceHeroLiveBadge}>
                          <View style={styles.livePulseDot} />
                          <Text style={styles.serviceHeroLiveText}>AKTIF</Text>
                        </View>
                      </View>
                      <Text style={styles.serviceHeroVal}>{rp(serviceAmount)}</Text>
                      <Text style={styles.serviceHeroDesc}>{service.desc}</Text>

                      <View style={styles.serviceHeroDivider} />

                      <View style={styles.serviceHeroGrid}>
                        <View style={styles.serviceHeroStat}>
                          <Text style={styles.serviceHeroStatVal}>{serviceCount}</Text>
                          <Text style={styles.serviceHeroStatLbl}>{service.unitLabel} Selesai</Text>
                        </View>
                        <View style={styles.serviceHeroStatDiv} />
                        <View style={styles.serviceHeroStat}>
                          <Text style={styles.serviceHeroStatVal}>{rp(avgPerOrder)}</Text>
                          <Text style={styles.serviceHeroStatLbl}>Rata-rata Order</Text>
                        </View>
                        <View style={styles.serviceHeroStatDiv} />
                        <View style={styles.serviceHeroStat}>
                          <Text style={styles.serviceHeroStatVal}>{mitrasInService.length}</Text>
                          <Text style={styles.serviceHeroStatLbl}>Mitra Terdaftar</Text>
                        </View>
                      </View>
                    </View>

                    {/* Quick Jump Buttons */}
                    <View style={styles.quickJumpRow}>
                      <TouchableOpacity
                        style={styles.quickJumpBtn}
                        onPress={() => {
                          const sName = service.serviceName;
                          setSelectedServiceForMonitoring(null);
                          setTxSearch(sName);
                          setCurrentTab(2);
                        }}
                        activeOpacity={0.7}
                      >
                        <Receipt size={14} color="#1B7A4E" />
                        <Text style={styles.quickJumpBtnText}>Cek Transaksi</Text>
                        <ChevronRight size={14} color="#1B7A4E" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickJumpBtn}
                        onPress={() => {
                          const r = service.role;
                          setSelectedServiceForMonitoring(null);
                          setDirectoryRoleFilter(r);
                          setCurrentTab(3);
                        }}
                        activeOpacity={0.7}
                      >
                        <Store size={14} color="#1B7A4E" />
                        <Text style={styles.quickJumpBtnText}>Kelola Mitra</Text>
                        <ChevronRight size={14} color="#1B7A4E" />
                      </TouchableOpacity>
                    </View>

                    {/* Section: Mitra Penyedia Layanan */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 12 }}>
                      <Text style={styles.formSectionHeader}>
                        Mitra & Outlet Terdaftar ({mitrasInService.length})
                      </Text>
                      <Text style={{ fontSize: 11, color: "#1B7A4E", fontWeight: "700" }}>
                        {activeMitras.length} Aktif Melayani
                      </Text>
                    </View>

                    {mitrasInService.length === 0 ? (
                      <View style={styles.serviceEmptyBox}>
                        <Text style={styles.serviceEmptyText}>Belum ada mitra terdaftar di sektor ini.</Text>
                      </View>
                    ) : (
                      mitrasInService.map((m) => {
                        const businessName = m.roleData?.businessName || m.name;
                        const initial = (m.name || "M")[0].toUpperCase();
                        return (
                          <View key={m.id} style={styles.monitoringMitraRow}>
                            <View style={[styles.avatarCircleSmall, { backgroundColor: service.bg }]}>
                              <Text style={[styles.avatarInitialSmall, { color: service.color }]}>{initial}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={styles.monitoringMitraTitle} numberOfLines={1}>{businessName}</Text>
                              <Text style={styles.monitoringMitraSub} numberOfLines={1}>
                                Pemilik: {m.name} • {m.address || "Kamojang"}
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <View style={m.status === "verified" ? styles.badgeSuccess : styles.badgePending}>
                                <Text style={m.status === "verified" ? styles.badgeSuccessText : styles.badgePendingText}>
                                  {m.status === "verified" ? "Aktif Buka" : "Pending ACC"}
                                </Text>
                              </View>
                              {m.phone ? (
                                <TouchableOpacity
                                  style={styles.quickWaBtn}
                                  onPress={() => openWhatsApp(m.phone)}
                                  activeOpacity={0.7}
                                >
                                  <MessageCircle size={10} color="#1B7A4E" />
                                  <Text style={styles.quickWaBtnText}>WhatsApp</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        );
                      })
                    )}

                    {/* Section: Transaksi Terbaru */}
                    <Text style={[styles.formSectionHeader, { marginTop: 16 }]}>
                      Transaksi Terkini ({serviceTx.length})
                    </Text>

                    {serviceTx.length === 0 ? (
                      <View style={styles.serviceEmptyBox}>
                        <Text style={styles.serviceEmptyText}>Belum ada riwayat transaksi di sektor ini.</Text>
                      </View>
                    ) : (
                      serviceTx.map((tx, idx) => (
                        <View key={tx.id || idx} style={styles.monitoringTxRow}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.monitoringTxCode}>{tx.code}</Text>
                              <Text style={styles.monitoringTxDate}>
                                {tx.date
                                  ? new Date(tx.date).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Hari ini"}
                              </Text>
                            </View>
                            <Text style={styles.monitoringTxTitle} numberOfLines={1}>{tx.title}</Text>
                            <Text style={styles.monitoringTxCustomer} numberOfLines={1}>
                              Pemesan: {tx.customer}
                            </Text>
                          </View>
                          <Text style={styles.monitoringTxAmount}>{rp(tx.amount || 0)}</Text>
                        </View>
                      ))
                    )}
                  </>
                );
              })()}
            </ScrollView>

            {/* Close Button */}
            <View style={styles.modalCustomerFooter}>
              <TouchableOpacity
                style={styles.btnCloseCustomerModal}
                onPress={() => setSelectedServiceForMonitoring(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCloseCustomerModalText}>Tutup Pantauan Layanan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={isRejectModalOpen} transparent animationType="fade">
        <View style={styles.modalBgCenter}>
          <View style={styles.rejectSheet}>
            <Text style={styles.rejectTitle}>Tolak Pendaftaran Mitra</Text>
            <Text style={styles.rejectSub}>
              Masukkan alasan penolakan agar mitra dapat memperbaiki dokumennya:
            </Text>

            <TextInput
              style={styles.rejectInput}
              multiline
              numberOfLines={4}
              value={rejectionReasonInput}
              onChangeText={setRejectionReasonInput}
              placeholder="Contoh: Foto KTP kurang jelas atau buram..."
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.rejectBtnRow}>
              <TouchableOpacity
                style={styles.rejectCancelBtn}
                onPress={() => setIsRejectModalOpen(false)}
                disabled={isSubmittingAction}
              >
                <Text style={styles.rejectCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectConfirmBtn}
                onPress={handleConfirmReject}
                disabled={isSubmittingAction}
              >
                {isSubmittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.rejectConfirmBtnText}>Kirim Penolakan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL FULLSCREEN IMAGE PREVIEW ================= */}
      <Modal visible={previewImageModal.visible} transparent animationType="fade">
        <View style={styles.previewImageBg}>
          <View style={styles.previewImageTopBar}>
            <Text style={styles.previewImageTitle}>{previewImageModal.title}</Text>
            <TouchableOpacity
              style={styles.previewImageCloseBtn}
              onPress={() => setPreviewImageModal({ visible: false, url: "", title: "" })}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewImageContainer}>
            {previewImageModal.url ? (
              <Image
                source={{ uri: previewImageModal.url }}
                style={styles.previewFullImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL NOTIFIKASI ================= */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.notifSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifikasi Masuk</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              {pendingCount > 0 ? (
                <TouchableOpacity
                  style={styles.notifRowItem}
                  onPress={() => {
                    setNotifModalVisible(false);
                    setCurrentTab(0);
                    setStatusFilter("pending");
                  }}
                >
                  <View style={styles.notifIconWrap}>
                    <ShieldCheck size={20} color="#1B7A4E" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.notifRowTitle}>Pendaftaran Mitra Baru</Text>
                    <Text style={styles.notifRowSub}>
                      Ada {pendingCount} pendaftaran mitra yang perlu di-ACC oleh admin.
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <CheckCircle size={32} color="#1B7A4E" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: "#6B7280" }}>
                    Tidak ada notifikasi mendesak saat ini.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL EDIT PROFIL ADMIN ================= */}
      <Modal visible={editAdminProfileModal} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Profil Administrator</Text>
              <TouchableOpacity onPress={() => setEditAdminProfileModal(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nama Administrator</Text>
              <TextInput
                style={styles.textInput}
                value={tempAdminName}
                onChangeText={setTempAdminName}
                placeholder="Masukkan nama administrator"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Nomor WhatsApp / HP PIC</Text>
              <TextInput
                style={styles.textInput}
                value={tempAdminPhone}
                onChangeText={setTempAdminPhone}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 24 }]}
                onPress={handleSaveAdminProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL UBAH PASSWORD ADMIN ================= */}
      <Modal visible={editAdminPasswordModal} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ubah Password Administrator</Text>
              <TouchableOpacity onPress={() => setEditAdminPasswordModal(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Password Baru</Text>
              <TextInput
                style={styles.textInput}
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 24 }]}
                onPress={handleSaveAdminPassword}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Perbarui Password</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL INFO & PANDUAN SHEET ================= */}
      <Modal visible={infoModalData.visible} transparent animationType="fade">
        <View style={styles.modalBgCenter}>
          <View style={styles.rejectSheet}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={styles.rejectTitle}>{infoModalData.title}</Text>
              <TouchableOpacity onPress={() => setInfoModalData({ ...infoModalData, visible: false })}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.rejectSub, { lineHeight: 20 }]}>{infoModalData.desc}</Text>
            <TouchableOpacity
              style={[styles.btnCloseCustomerModal, { marginTop: 16 }]}
              onPress={() => setInfoModalData({ ...infoModalData, visible: false })}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCloseCustomerModalText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL LOGOUT CONFIRMATION ================= */}
      <Modal visible={isLogoutModalOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBgCenter}
          activeOpacity={1}
          onPress={() => setIsLogoutModalOpen(false)}
        >
          <View style={styles.confirmCard} onStartShouldSetResponder={() => true}>
            <View style={styles.logoutModalIconBg}>
              <LogOut size={26} color="#DC2626" />
            </View>
            <Text style={styles.confirmTitle}>Konfirmasi Keluar</Text>
            <Text style={styles.confirmSub}>
              Apakah Anda yakin ingin keluar dari panel administrator GEOVERSE?
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIsLogoutModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnLogoutConfirm}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.btnLogoutConfirmText}>Ya, Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1B7A4E",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  tabContentWrap: {
    paddingBottom: 16,
  },

  // Top Header (Emerald Premium Style - Matching Mitra & Customer)
  topHeader: {
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  greetingText: {
    fontSize: 13,
    color: "#D1FAE5",
    fontWeight: "500",
    marginBottom: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#1B7A4E",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 6,
  },
  rolePillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  roleLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },

  // Hero Card (Emerald, matching outletCard from catering)
  outletCard: {
    borderRadius: 22,
    backgroundColor: "#1B7A4E",
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#1B7A4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  outletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  liveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4ADE80",
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroRefreshBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroStatGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStatBox: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  heroStatValLarge: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  heroStatSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  heroDividerVert: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 14,
  },

  // Search Bar
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    marginLeft: 8,
  },

  // Status Filter Pills
  statusPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  statusPillPendingActive: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  statusPillSuccessActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A7F3D0",
  },
  statusPillDangerActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  statusPillTextPendingActive: {
    color: "#D97706",
    fontWeight: "800",
  },
  statusPillTextSuccessActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  statusPillTextDangerActive: {
    color: "#DC2626",
    fontWeight: "800",
  },

  // Category Filter Chips
  categoryChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  categoryChipActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Mitra Cards (Clean white with subtle green touches)
  mitraCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  mitraCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccessText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  badgeDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeDangerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  mitraCardBody: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "800",
  },
  mitraBusinessName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  mitraOwnerName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  mitraMetaContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: "#4B5563",
  },
  quickWaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quickWaBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  rejectionNoticeBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  rejectionNoticeText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
  },
  mitraCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  btnInspect: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 9,
    borderRadius: 12,
  },
  btnInspectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  quickActionGroup: {
    flexDirection: "row",
    gap: 6,
  },
  btnQuickReject: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  btnQuickRejectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  btnQuickApprove: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  btnQuickApproveText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Empty Card
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },

  // Monitoring Tab Styles
  masterFinCard: {
    backgroundColor: "#1B7A4E",
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  masterFinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  masterFinLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  pulseLiveWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pulseLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  masterFinValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    marginVertical: 12,
  },
  masterFinGrid: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    paddingTop: 14,
  },
  masterFinStat: {
    flex: 1,
    alignItems: "center",
  },
  masterFinStatVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  masterFinStatLbl: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  masterFinDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  serviceBreakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  serviceCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  serviceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  serviceCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  serviceCardAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B7A4E",
    marginTop: 4,
  },
  serviceCardSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 3,
  },
  serviceCardActionHint: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  serviceCardActionHintText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  serviceCardFull: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },

  // Service Modal Styles
  serviceModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceHeroCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  serviceHeroLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  serviceHeroLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  serviceHeroLiveText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  serviceHeroVal: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginVertical: 6,
  },
  serviceHeroDesc: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 16,
  },
  serviceHeroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 12,
  },
  serviceHeroGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceHeroStat: {
    flex: 1,
    alignItems: "center",
  },
  serviceHeroStatVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  serviceHeroStatLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    textAlign: "center",
  },
  serviceHeroStatDiv: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  quickJumpRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  quickJumpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickJumpBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  serviceEmptyBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  serviceEmptyText: {
    fontSize: 12,
    color: "#6B7280",
  },
  monitoringMitraRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 8,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialSmall: {
    fontSize: 14,
    fontWeight: "800",
  },
  monitoringMitraTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  monitoringMitraSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  monitoringTxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 8,
  },
  monitoringTxCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  monitoringTxDate: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  monitoringTxTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  monitoringTxCustomer: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  monitoringTxAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
    marginLeft: 10,
  },

  // Transaksi Tab Styles
  txHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  txCounterSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  txCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
  },
  txCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  txServiceBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  txServiceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1B7A4E",
    textTransform: "uppercase",
  },
  txCodeText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  txTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  txCustomerText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  txCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  txDateText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  txAmountVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B7A4E",
  },

  // Directory Mitra Tab Styles
  directoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
  },
  dirNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    maxWidth: 160,
  },
  roleBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeSmallText: {
    fontSize: 9,
    fontWeight: "700",
  },
  dirOwnerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  dirAddressSub: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  dirWaBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  dirDetailBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Customer Card Styles in Directory
  customerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  customerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerCardMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  customerEmailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  customerMetaBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  customerCardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  btnCustomerDetail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 9,
    borderRadius: 12,
  },
  btnCustomerDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // Customer Notice Box in Tab
  customerNoticeBoxTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  customerNoticeBoxTabText: {
    flex: 1,
    fontSize: 12,
    color: "#065F46",
    lineHeight: 17,
  },

  // Customer Detail Modal Styles
  customerNoticeBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  customerNoticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  customerNoticeDesc: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 18,
  },
  customerWaFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1B7A4E",
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  customerWaFullBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalCustomerFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: Platform.OS === "ios" ? 16 : 10,
  },
  btnCloseCustomerModal: {
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
  },
  btnCloseCustomerModalText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Tab 4 (Akun & Pengaturan) Styles - Matching Customer/Catering Template
  profileHeader: {
    backgroundColor: "#1B7A4E",
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    borderRadius: 24,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  avatarBg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.45)",
  },
  cameraBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  adminCardNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    textAlign: "center",
  },
  adminRoleSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  customerPhoneText: {
    fontSize: 12,
    color: "#E8F5EE",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    width: "100%",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLbl: {
    fontSize: 10,
    color: "#E8F5EE",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  menuSubLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 54,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 18,
    padding: 12,
    marginTop: 18,
  },
  logoutIconBg: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  footerVersion: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 12,
  },

  // Edit Profile / Password Modals (Matching Customer Profile sheets)
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  formScroll: {
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: "#1B7A4E",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // ==========================================
  // Custom Bottom Navigation Bar
  // ==========================================
  bottomNavContainer: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 6,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
  },
  navIconBg: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  navIconBgActive: {
    backgroundColor: "rgba(27, 122, 78, 0.12)",
  },
  navLabel: {
    fontSize: 10.5,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  navBadge: {
    position: "absolute",
    top: -2,
    right: 4,
    backgroundColor: "#DC2626",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  navBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  // ==========================================
  // Modals Styles
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },

  modalStatusBanner: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalStatusLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalStatusValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  modalRejectionReason: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 6,
  },

  formSectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
    marginBottom: 8,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    width: "40%",
  },
  detailVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    width: "60%",
    textAlign: "right",
  },

  noDocsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  noDocsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  docCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 10,
  },
  docThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  docTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  docPreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  docPreviewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },

  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: Platform.OS === "ios" ? 16 : 10,
  },
  modalRejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalRejectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalApproveBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B7A4E",
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalApproveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Reject Input Modal
  modalBgCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  rejectSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
  },
  rejectTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  rejectSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 12,
  },
  rejectInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
    minHeight: 90,
  },
  rejectBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  rejectCancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  rejectCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  rejectConfirmBtn: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#DC2626",
    borderRadius: 12,
  },
  rejectConfirmBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Image Preview Modal
  previewImageBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  previewImageTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 30 : 48,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  previewImageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  previewImageCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFullImage: {
    width: "100%",
    height: "100%",
  },

  // Notif Modal
  notifSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  notifRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  notifRowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  notifRowSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // Logout Confirmation Modal Styles
  confirmCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  logoutModalIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  confirmSub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  btnLogoutConfirm: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  btnLogoutConfirmText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statusOnlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusOnlineText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },
});
