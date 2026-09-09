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
  FileText,
  Check,
  X,
  RefreshCw,
  Eye,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Utensils,
  Shirt,
  Home,
  Truck,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount, ROLE_LABELS } from "../auth/authTypes";
import { getDocumentRequirements } from "../auth/authValidation";
import { loadMitraAccounts, updateAccountStatus, fetchAdminStats, fetchAdminTransactions } from "../auth/authService";

const getRoleMeta = (role: string) => {
  switch (role) {
    case "pemilik_kos":
      return { label: "Pemilik Kos", icon: Home, color: "#0D7A53", bg: "#DCFCE7", border: "#BBF7D0" };
    case "pemilik_laundry":
      return { label: "Pemilik Laundry", icon: Shirt, color: "#2563EB", bg: "#DBEAFE", border: "#BFDBFE" };
    case "pemilik_catering":
      return { label: "Pemilik Catering", icon: Utensils, color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" };
    case "pemilik_marketplace":
      return { label: "Pemilik Toko", icon: ShoppingBag, color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" };
    case "driver":
      return { label: "Driver Ranger", icon: Truck, color: "#0284C7", bg: "#E0F2FE", border: "#BAE6FD" };
    default:
      return { label: "Mitra Usaha", icon: Users, color: "#475569", bg: "#F1F5F9", border: "#E2E8F0" };
  }
};

export const AdminHomeScreen: React.FC<Nav> = ({ navigate }) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"verifikasi" | "monitoring" | "transaksi" | "users">("verifikasi");

  // State Data
  const [mitraAccounts, setMitraAccounts] = useState<AuthAccount[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters for Verification Tab
  const [statusFilter, setStatusFilter] = useState<"semua" | "pending" | "verified" | "rejected">("pending");
  const [roleFilter, setRoleFilter] = useState<string>("semua");

  // Modal State for Full Registration Detail (Where ACC & Reject Buttons Live)
  const [selectedMitraForDetail, setSelectedMitraForDetail] = useState<AuthAccount | null>(null);

  // Modal State for Rejecting Mitra with Reason Input
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingMitra, setRejectingMitra] = useState<AuthAccount | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Fullscreen Preview Image Modal State
  const [previewImageModal, setPreviewImageModal] = useState<{
    visible: boolean;
    url: string;
    title: string;
    isPdf?: boolean;
  }>({
    visible: false,
    url: "",
    title: "",
    isPdf: false,
  });

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

  // Action: Approve / ACC Mitra (inside detail modal)
  const handleApproveMitra = async (account: AuthAccount) => {
    setIsSubmittingAction(true);
    try {
      await updateAccountStatus(account.id, "verified");
      await refreshData();
      setSelectedMitraForDetail(null);
      Alert.alert(
        "✅ Mitra Berhasil Disetujui (ACC)",
        `Pendaftaran ${account.name} sebagai ${ROLE_LABELS[account.role as keyof typeof ROLE_LABELS] || "Mitra"} telah berhasil di-ACC.\n\nEmail konfirmasi resmi telah dikirim ke ${account.email} dari aisyahputriharmelia@gmail.com.`
      );
    } catch (err) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyetujui akun.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Open Reject Modal from detail modal
  const handleOpenRejectModal = (account: AuthAccount) => {
    setRejectingMitra(account);
    setRejectionReasonInput("Foto KTP atau dokumen bukti kepemilikan/izin usaha kurang jelas. Mohon unggah ulang foto yang jelas dan terbaca.");
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
        "⚠️ Pendaftaran Ditolak",
        `Pendaftaran ${rejectingMitra.name} telah ditolak dengan alasan:\n"${rejectionReasonInput.trim()}".\n\nEmail alasan penolakan telah dikirimkan ke ${rejectingMitra.email} dari aisyahputriharmelia@gmail.com.`
      );
    } catch (err) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menolak pendaftaran.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Filtered Mitra List
  const filteredMitra = mitraAccounts.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.roleData?.businessName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    const matchesStatus = statusFilter === "semua" ? true : m.status === statusFilter;
    const matchesRole = roleFilter === "semua" ? true : m.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingCount = mitraAccounts.filter((m) => m.status === "pending").length;
  const approvedCount = mitraAccounts.filter((m) => m.status === "verified").length;
  const rejectedCount = mitraAccounts.filter((m) => m.status === "rejected").length;

  const totalRevenue = stats?.totalTransactionsAmount || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.adminProfileRow}>
          <View style={styles.avatarWrap}>
            <ShieldCheck size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.adminTitle} numberOfLines={1}>ADMINISTRATOR</Text>
              <View style={styles.livePulseBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.adminEmail} numberOfLines={1}>
              aisyahputriharmelia@gmail.com • Super Admin
            </Text>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={refreshData}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RefreshCw size={14} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => navigate("login")}
            activeOpacity={0.7}
          >
            <LogOut size={13} color="#EF4444" />
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs Bar */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "verifikasi" && styles.tabButtonActive]}
            onPress={() => setActiveTab("verifikasi")}
            activeOpacity={0.8}
          >
            <ShieldCheck size={14} color={activeTab === "verifikasi" ? "#0D7A53" : "#64748B"} />
            <Text style={[styles.tabButtonText, activeTab === "verifikasi" && styles.tabButtonTextActive]}>
              Verifikasi Mitra
            </Text>
            {pendingCount > 0 && (
              <View style={styles.pendingCounterBadge}>
                <Text style={styles.pendingCounterText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "monitoring" && styles.tabButtonActive]}
            onPress={() => setActiveTab("monitoring")}
            activeOpacity={0.8}
          >
            <TrendingUp size={14} color={activeTab === "monitoring" ? "#0D7A53" : "#64748B"} />
            <Text style={[styles.tabButtonText, activeTab === "monitoring" && styles.tabButtonTextActive]}>
              Monitoring Real-time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "transaksi" && styles.tabButtonActive]}
            onPress={() => setActiveTab("transaksi")}
            activeOpacity={0.8}
          >
            <DollarSign size={14} color={activeTab === "transaksi" ? "#0D7A53" : "#64748B"} />
            <Text style={[styles.tabButtonText, activeTab === "transaksi" && styles.tabButtonTextActive]}>
              Transaksi ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "users" && styles.tabButtonActive]}
            onPress={() => setActiveTab("users")}
            activeOpacity={0.8}
          >
            <Users size={14} color={activeTab === "users" ? "#0D7A53" : "#64748B"} />
            <Text style={[styles.tabButtonText, activeTab === "users" && styles.tabButtonTextActive]}>
              Mitra ({mitraAccounts.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ================= TAB 1: VERIFIKASI PENDAFTARAN MITRA ================= */}
        {activeTab === "verifikasi" && (
          <View>
            {/* Search Input */}
            <View style={styles.searchBarWrap}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchBarInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari nama usaha, pemilik, atau nomor HP..."
                placeholderTextColor="#94A3B8"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Status Filter Chips */}
            <View style={styles.filterChipRow}>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === "pending" && styles.filterChipPendingActive]}
                onPress={() => setStatusFilter("pending")}
                activeOpacity={0.7}
              >
                <View style={[styles.filterDot, { backgroundColor: "#D97706" }]} />
                <Text style={[styles.filterChipText, statusFilter === "pending" && styles.filterChipTextPendingActive]}>
                  Menunggu ({pendingCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, statusFilter === "verified" && styles.filterChipSuccessActive]}
                onPress={() => setStatusFilter("verified")}
                activeOpacity={0.7}
              >
                <View style={[styles.filterDot, { backgroundColor: "#0D7A53" }]} />
                <Text style={[styles.filterChipText, statusFilter === "verified" && styles.filterChipTextSuccessActive]}>
                  Disetujui ({approvedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, statusFilter === "rejected" && styles.filterChipDangerActive]}
                onPress={() => setStatusFilter("rejected")}
                activeOpacity={0.7}
              >
                <View style={[styles.filterDot, { backgroundColor: "#DC2626" }]} />
                <Text style={[styles.filterChipText, statusFilter === "rejected" && styles.filterChipTextDangerActive]}>
                  Ditolak ({rejectedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, statusFilter === "semua" && styles.filterChipActive]}
                onPress={() => setStatusFilter("semua")}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, statusFilter === "semua" && styles.filterChipTextActive]}>
                  Semua ({mitraAccounts.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Role Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleFilterRow}>
              {[
                { key: "semua", label: "Semua", icon: Users },
                { key: "pemilik_kos", label: "Kost", icon: Home },
                { key: "pemilik_laundry", label: "Laundry", icon: Shirt },
                { key: "pemilik_catering", label: "Catering", icon: Utensils },
                { key: "pemilik_marketplace", label: "Marketplace", icon: ShoppingBag },
                { key: "driver", label: "Driver", icon: Truck },
              ].map((rf) => {
                const IconComp = rf.icon;
                const isActive = roleFilter === rf.key;
                return (
                  <TouchableOpacity
                    key={rf.key}
                    style={[styles.roleChip, isActive && styles.roleChipActive]}
                    onPress={() => setRoleFilter(rf.key)}
                    activeOpacity={0.7}
                  >
                    <IconComp size={12} color={isActive ? "#FFFFFF" : "#64748B"} />
                    <Text style={[styles.roleChipText, isActive && styles.roleChipTextActive]}>
                      {rf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Mitra Cards List */}
            {filteredMitra.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle2 size={32} color="#0D7A53" />
                <Text style={styles.emptyTitle}>Tidak Ada Pendaftaran</Text>
                <Text style={styles.emptySub}>
                  {statusFilter === "pending"
                    ? "Semua pendaftaran mitra telah diverifikasi."
                    : "Tidak ada data pendaftaran dengan filter saat ini."}
                </Text>
              </View>
            ) : (
              filteredMitra.map((mitra) => {
                const businessName = mitra.roleData?.businessName || mitra.name || "Usaha Mitra";
                const roleMeta = getRoleMeta(mitra.role);
                const RoleIcon = roleMeta.icon;
                const initial = (mitra.name || "M")[0].toUpperCase();
                const docsCount = mitra.documents ? Object.keys(mitra.documents).length : 0;

                return (
                  <View key={mitra.id} style={styles.mitraCard}>
                    {/* Header: Role & Status */}
                    <View style={styles.mitraCardHeader}>
                      <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border }]}>
                        <RoleIcon size={12} color={roleMeta.color} />
                        <Text style={[styles.roleBadgeText, { color: roleMeta.color }]}>{roleMeta.label}</Text>
                      </View>

                      {mitra.status === "verified" ? (
                        <View style={styles.badgeSuccess}>
                          <CheckCircle2 size={11} color="#0D7A53" />
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
                          <Text style={styles.badgePendingText}>MENUNGGU VERIFIKASI</Text>
                        </View>
                      )}
                    </View>

                    {/* Mitra Identity Row */}
                    <View style={styles.mitraMainRow}>
                      <View style={[styles.mitraAvatarCircle, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border }]}>
                        <Text style={[styles.mitraAvatarInitial, { color: roleMeta.color }]}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mitraBusinessTitle} numberOfLines={1}>{businessName}</Text>
                        <Text style={styles.mitraOwnerName} numberOfLines={1}>Pemilik: {mitra.name}</Text>
                      </View>
                    </View>

                    {/* Metadata Grid (Compact, Clean, Organized) */}
                    <View style={styles.mitraMetaGrid}>
                      <View style={styles.mitraMetaItem}>
                        <Mail size={12} color="#64748B" />
                        <Text style={styles.mitraMetaItemText} numberOfLines={1}>{mitra.email}</Text>
                      </View>
                      <View style={styles.mitraMetaItem}>
                        <Phone size={12} color="#64748B" />
                        <Text style={styles.mitraMetaItemText} numberOfLines={1}>{mitra.phone || "-"}</Text>
                      </View>
                      <View style={[styles.mitraMetaItem, { width: "100%" }]}>
                        <MapPin size={12} color="#64748B" />
                        <Text style={styles.mitraMetaItemText} numberOfLines={1}>
                          {mitra.address || (mitra.roleData as any)?.businessAddress || (mitra.roleData as any)?.city || "Indonesia"}
                        </Text>
                      </View>
                    </View>

                    {/* Single Main Action: Periksa Detail Form & Berkas */}
                    <View style={styles.mitraCardFooter}>
                      <TouchableOpacity
                        style={styles.btnInspectMain}
                        onPress={() => setSelectedMitraForDetail(mitra)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Eye size={15} color="#FFFFFF" />
                          <Text style={styles.btnInspectMainText}>
                            Periksa Formulir & Berkas Dokumen
                          </Text>
                        </View>
                        <ChevronRight size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ================= TAB 2: MONITORING & METRIK ================= */}
        {activeTab === "monitoring" && (
          <View>
            {/* Master Financial Banner */}
            <View style={styles.masterFinCard}>
              <Text style={styles.masterFinLabel}>Total Transaksi Platform (Real-time Live)</Text>
              <Text style={styles.masterFinValue}>Rp {totalRevenue.toLocaleString("id-ID")}</Text>

              <View style={styles.masterFinGrid}>
                <View style={styles.masterFinStat}>
                  <Text style={styles.masterFinStatVal}>{stats?.totalCustomers || 0}</Text>
                  <Text style={styles.masterFinStatLbl}>Customer Aktif</Text>
                </View>
                <View style={styles.masterFinDivider} />
                <View style={styles.masterFinStat}>
                  <Text style={styles.masterFinStatVal}>{stats?.totalMitra || mitraAccounts.length}</Text>
                  <Text style={styles.masterFinStatLbl}>Mitra Terdaftar</Text>
                </View>
                <View style={styles.masterFinDivider} />
                <View style={styles.masterFinStat}>
                  <Text style={styles.masterFinStatVal}>{stats?.totalDrivers || 0}</Text>
                  <Text style={styles.masterFinStatLbl}>Driver Rangers</Text>
                </View>
              </View>
            </View>

            {/* Service Breakdown Cards */}
            <Text style={styles.sectionHeaderTitle}>Volume Transaksi per Layanan</Text>
            <View style={styles.serviceBreakdownGrid}>
              <View style={styles.serviceCard}>
                <View style={[styles.serviceIconBg, { backgroundColor: "#E8F5EE" }]}>
                  <Home size={20} color="#0D7A53" />
                </View>
                <Text style={styles.serviceCardTitle}>Kost & Kamar</Text>
                <Text style={styles.serviceCardAmount}>
                  Rp {(stats?.breakdown?.kost?.total || 0).toLocaleString("id-ID")}
                </Text>
                <Text style={styles.serviceCardSub}>
                  {stats?.breakdown?.kost?.count || 0} Booking • {stats?.totalKostProps || 1} Properti Kost
                </Text>
              </View>

              <View style={styles.serviceCard}>
                <View style={[styles.serviceIconBg, { backgroundColor: "#EFF6FF" }]}>
                  <Shirt size={20} color="#2563EB" />
                </View>
                <Text style={styles.serviceCardTitle}>Laundry Mitra</Text>
                <Text style={styles.serviceCardAmount}>
                  Rp {(stats?.breakdown?.laundry?.total || 0).toLocaleString("id-ID")}
                </Text>
                <Text style={styles.serviceCardSub}>
                  {stats?.breakdown?.laundry?.count || 0} Order • {stats?.totalLaundryStores || 1} Toko Outlet
                </Text>
              </View>

              <View style={styles.serviceCard}>
                <View style={[styles.serviceIconBg, { backgroundColor: "#FEF3C7" }]}>
                  <Utensils size={20} color="#D97706" />
                </View>
                <Text style={styles.serviceCardTitle}>Dapur Catering</Text>
                <Text style={styles.serviceCardAmount}>
                  Rp {(stats?.breakdown?.catering?.total || 0).toLocaleString("id-ID")}
                </Text>
                <Text style={styles.serviceCardSub}>
                  {stats?.breakdown?.catering?.count || 0} Pesanan
                </Text>
              </View>

              <View style={styles.serviceCard}>
                <View style={[styles.serviceIconBg, { backgroundColor: "#F3E8FF" }]}>
                  <ShoppingBag size={20} color="#9333EA" />
                </View>
                <Text style={styles.serviceCardTitle}>Marketplace UMKM</Text>
                <Text style={styles.serviceCardAmount}>
                  Rp {(stats?.breakdown?.marketplace?.total || 0).toLocaleString("id-ID")}
                </Text>
                <Text style={styles.serviceCardSub}>
                  {stats?.breakdown?.marketplace?.count || 0} Transaksi
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 3: SEMUA TRANSAKSI ================= */}
        {activeTab === "transaksi" && (
          <View>
            <View style={styles.txHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Aliran Transaksi Global Platform</Text>
              <Text style={{ fontSize: 12, color: "#64748B" }}>Total {transactions.length} transaksi</Text>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <DollarSign size={32} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Belum Ada Transaksi</Text>
                <Text style={styles.emptySub}>Semua transaksi yang terjadi di aplikasi akan otomatis tercatat di sini.</Text>
              </View>
            ) : (
              transactions.map((tx, idx) => (
                <View key={tx.id || idx} style={styles.txCard}>
                  <View style={styles.txCardHeader}>
                    <View style={styles.txServiceBadge}>
                      <Text style={styles.txServiceBadgeText}>{tx.service}</Text>
                    </View>
                    <Text style={styles.txCodeText}>{tx.code}</Text>
                  </View>

                  <Text style={styles.txTitleText}>{tx.title}</Text>
                  <Text style={styles.txCustomerText}>Customer: {tx.customer}</Text>

                  <View style={styles.txCardFooter}>
                    <Text style={styles.txDateText}>
                      {tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Baru saja"}
                    </Text>
                    <Text style={styles.txAmountVal}>Rp {Number(tx.amount || 0).toLocaleString("id-ID")}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ================= TAB 4: MANAJEMEN USER ================= */}
        {activeTab === "users" && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Daftar Seluruh Mitra & Akun Terdaftar</Text>
            {mitraAccounts.map((user) => (
              <View key={user.id} style={styles.userCardRow}>
                <View style={styles.userAvatarBg}>
                  <Text style={styles.userAvatarInitial}>{(user.name || "U")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.userNameText}>{user.name}</Text>
                  <Text style={styles.userRoleSub}>{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role} • {user.email}</Text>
                  <Text style={styles.userPhoneSub}>{user.phone || "-"}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={user.status === "verified" ? styles.badgeSuccess : user.status === "rejected" ? styles.badgeDanger : styles.badgePending}>
                    <Text style={user.status === "verified" ? styles.badgeSuccessText : user.status === "rejected" ? styles.badgeDangerText : styles.badgePendingText}>
                      {user.status === "verified" ? "Aktif" : user.status === "rejected" ? "Ditolak" : "Pending"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL LENGKAP: DETAIL FORMULIR & BERKAS MITRA ================= */}
      <Modal visible={selectedMitraForDetail !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Detail Lengkap Formulir Pendaftaran</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedMitraForDetail?.name} • {ROLE_LABELS[selectedMitraForDetail?.role as keyof typeof ROLE_LABELS] || "Mitra"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedMitraForDetail(null)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {selectedMitraForDetail && (() => {
                const roleData = selectedMitraForDetail.roleData || {};
                const docs = selectedMitraForDetail.documents || {};

                return (
                  <>
                    {/* Status Overview Banner */}
                    <View style={styles.modalStatusBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalStatusLabel}>Status Verifikasi Akun:</Text>
                        <Text style={styles.modalStatusValue}>
                          {selectedMitraForDetail.status === "verified"
                            ? "✅ Sudah Disetujui (Aktif)"
                            : selectedMitraForDetail.status === "rejected"
                            ? "❌ Ditolak (Perlu Revisi)"
                            : "⏳ Menunggu Verifikasi Admin"}
                        </Text>
                      </View>
                      {selectedMitraForDetail.status === "rejected" && selectedMitraForDetail.rejectionReason && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 11.5, color: "#991B1B", fontWeight: "700" }}>
                            Alasan: {selectedMitraForDetail.rejectionReason}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Section 1: Data Identitas Pemilik */}
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
                        <Text style={styles.detailLabel}>No. WhatsApp / HP:</Text>
                        <Text style={styles.detailVal}>{selectedMitraForDetail.phone || "-"}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Alamat Domisili:</Text>
                        <Text style={styles.detailVal}>{selectedMitraForDetail.address || "-"}</Text>
                      </View>
                    </View>

                    {/* Section 2: Data Usaha / Properti */}
                    <Text style={styles.formSectionHeader}>2. Informasi Usaha & Properti</Text>
                    <View style={styles.detailBox}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nama Usaha / Brand:</Text>
                        <Text style={styles.detailVal}>{roleData.businessName || selectedMitraForDetail.name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Kategori Role:</Text>
                        <Text style={styles.detailVal}>{ROLE_LABELS[selectedMitraForDetail.role as keyof typeof ROLE_LABELS] || selectedMitraForDetail.role}</Text>
                      </View>
                      {roleData.propertyType && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Tipe Properti / Layanan:</Text>
                          <Text style={styles.detailVal}>{roleData.propertyType}</Text>
                        </View>
                      )}
                      {roleData.businessAddress && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Alamat Tempat Usaha:</Text>
                          <Text style={styles.detailVal}>{roleData.businessAddress}</Text>
                        </View>
                      )}
                      {roleData.city && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Kota / Wilayah:</Text>
                          <Text style={styles.detailVal}>{roleData.city}</Text>
                        </View>
                      )}
                    </View>

                    {/* Section 3: Berkas Dokumen Terunggah */}
                    {(() => {
                      // Fallback representative images for realistic previews
                      const fallbackImages: Record<string, string> = {
                        ktp: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&auto=format&fit=crop&q=80",
                        sim: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80",
                        stnk: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
                        vehicle_front: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80",
                        vehicle_side: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80",
                        vehicle_plate: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80",
                        property_document: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
                        property_photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80",
                        business_license: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
                        store_photo: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800&auto=format&fit=crop&q=80",
                        kitchen_photo: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80",
                        halal_or_health: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
                        profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
                      };

                      const docList: {
                        key: string;
                        label: string;
                        description: string;
                        uri: string;
                        name?: string;
                        mimeType?: string;
                        size?: number;
                        isRealUploaded: boolean;
                        isPdf: boolean;
                      }[] = [];

                      // 1. Profile photo
                      if (selectedMitraForDetail.profilePhoto) {
                        docList.push({
                          key: "profile_photo",
                          label: "Foto Profil / Pasfoto Pemilik",
                          description: "Foto resmi pengelola akun",
                          uri: selectedMitraForDetail.profilePhoto,
                          isRealUploaded: true,
                          isPdf: false,
                        });
                      }

                      // 2. Requirements for the role
                      const reqs = getDocumentRequirements(selectedMitraForDetail.role as any) || [];
                      reqs.forEach((req) => {
                        const uploaded = (docs as any)[req.key];
                        const uploadedUri = uploaded?.uri || (roleData as any)[req.key];
                        const isPdf = Boolean(
                          uploaded?.mimeType?.includes("pdf") ||
                          uploaded?.name?.toLowerCase().endsWith(".pdf") ||
                          uploadedUri?.toLowerCase().endsWith(".pdf") ||
                          uploadedUri?.toLowerCase().includes(".pdf")
                        );
                        const uri = uploadedUri || fallbackImages[req.key] || fallbackImages.ktp;
                        docList.push({
                          key: req.key,
                          label: req.label,
                          description: req.description,
                          uri: uri,
                          name: uploaded?.name || (isPdf ? `${req.label}.pdf` : undefined),
                          mimeType: uploaded?.mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
                          size: uploaded?.size,
                          isRealUploaded: Boolean(uploadedUri),
                          isPdf: isPdf,
                        });
                      });

                      // 3. Extra docs in documents map
                      Object.keys(docs).forEach((key) => {
                        if (!reqs.some((r) => r.key === key) && key !== "profile_photo") {
                          const d = (docs as any)[key];
                          if (d && (d.uri || typeof d === "string")) {
                            const uri = typeof d === "string" ? d : d.uri;
                            const isPdf = Boolean(
                              d?.mimeType?.includes("pdf") ||
                              d?.name?.toLowerCase().endsWith(".pdf") ||
                              uri?.toLowerCase().endsWith(".pdf") ||
                              uri?.toLowerCase().includes(".pdf")
                            );
                            docList.push({
                              key,
                              label: d.label || key.toUpperCase(),
                              description: "Berkas lampiran dokumen pendukung",
                              uri: uri,
                              name: d.name || (isPdf ? `${d.label || key}.pdf` : undefined),
                              mimeType: d.mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
                              size: d.size,
                              isRealUploaded: true,
                              isPdf: isPdf,
                            });
                          }
                        }
                      });

                      // 4. Default if empty
                      if (docList.length === 0) {
                        docList.push({
                          key: "ktp",
                          label: "Kartu Tanda Penduduk (KTP)",
                          description: "Foto resmi KTP pemilik usaha",
                          uri: (docs as any)?.ktp?.uri || fallbackImages.ktp,
                          isRealUploaded: Boolean((docs as any)?.ktp?.uri),
                          isPdf: false,
                        });
                        docList.push({
                          key: "property_document",
                          label: "Surat Izin / Bukti Tempat Usaha",
                          description: "Legalitas operasional tempat usaha",
                          uri: (docs as any)?.property_document?.uri || fallbackImages.property_document,
                          isRealUploaded: Boolean((docs as any)?.property_document?.uri),
                          isPdf: false,
                        });
                      }

                      // Helper to normalize image/pdf preview URLs (Cloudinary converts PDF to high-res JPG on-the-fly)
                      const getNormalizedDocPreviewUrl = (rawUri: string, fallbackKey: string) => {
                        if (!rawUri) return fallbackImages[fallbackKey] || fallbackImages.ktp;
                        if (rawUri.includes("cloudinary.com") && rawUri.toLowerCase().includes(".pdf")) {
                          return rawUri.replace(/\.pdf(\?.*)?$/i, ".jpg$1");
                        }
                        return rawUri;
                      };

                      return (
                        <View style={{ marginTop: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <Text style={[styles.formSectionHeader, { marginTop: 0, marginBottom: 0 }]}>3. Berkas Dokumen Terunggah</Text>
                            <View style={styles.badgeInfo}>
                              <Text style={styles.badgeInfoText}>{docList.length} Berkas</Text>
                            </View>
                          </View>

                          {docList.map((docItem, idx) => {
                            const previewUri = getNormalizedDocPreviewUrl(docItem.uri, docItem.key);

                            return (
                              <View key={`${docItem.key}-${idx}`} style={styles.docItemCard}>
                                <View style={styles.docHeaderRow}>
                                  <FileText size={16} color={docItem.isPdf ? "#DC2626" : "#0D7A53"} />
                                  <Text style={styles.docItemTitle}>{docItem.label}</Text>
                                  <View style={docItem.isRealUploaded ? styles.badgeSuccess : styles.badgeSample}>
                                    <Text style={docItem.isRealUploaded ? styles.badgeSuccessText : styles.badgeSampleText}>
                                      {docItem.isRealUploaded ? (docItem.isPdf ? "PDF Terverifikasi" : "Terlampir") : "Preview Format"}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.docItemSub}>{docItem.description}</Text>

                                {/* Visual Image Container with Full Preview on Tap (Works for JPG, PNG, and Cloudinary PDF) */}
                                <TouchableOpacity
                                  style={styles.docImageContainer}
                                  activeOpacity={0.88}
                                  onPress={() => setPreviewImageModal({ visible: true, url: previewUri, title: docItem.label, isPdf: false })}
                                >
                                  <Image
                                    source={{ uri: previewUri }}
                                    style={styles.docImageThumbnail}
                                    resizeMode="cover"
                                  />
                                  <View style={styles.docImageOverlayBar}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                      <Eye size={14} color="#FFFFFF" />
                                      <Text style={styles.docImageOverlayText}>
                                        {docItem.isPdf ? "Ketuk untuk Memperbesar Dokumen PDF" : "Ketuk untuk Memperbesar / Fullscreen"}
                                      </Text>
                                    </View>
                                    <ExternalLink size={14} color="#FFFFFF" />
                                  </View>
                                </TouchableOpacity>

                                {docItem.isPdf && docItem.name && (
                                  <View style={styles.pdfMetaBar}>
                                    <FileText size={13} color="#991B1B" />
                                    <Text style={styles.pdfMetaText} numberOfLines={1}>
                                      Berkas: {docItem.name} {docItem.size ? `(${(docItem.size / 1024 / 1024).toFixed(2)} MB)` : ""}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}

                    {/* Decision Action Buttons at the Bottom of Detail Modal */}
                    <View style={styles.decisionActionsCard}>
                      <Text style={styles.decisionTitle}>Keputusan Verifikasi Administrator:</Text>
                      <Text style={styles.decisionSub}>
                        Email notifikasi resmi akan otomatis dikirimkan ke <strong>{selectedMitraForDetail.email}</strong> dari <strong>aisyahputriharmelia@gmail.com</strong>.
                      </Text>

                      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                        {selectedMitraForDetail.status !== "verified" && (
                          <TouchableOpacity
                            style={[styles.btnApproveAction, isSubmittingAction && { opacity: 0.7 }]}
                            onPress={() => handleApproveMitra(selectedMitraForDetail)}
                            disabled={isSubmittingAction}
                            activeOpacity={0.85}
                          >
                            {isSubmittingAction ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Check size={16} color="#FFFFFF" />
                                <Text style={styles.btnApproveActionText}>ACC & Buka Akses Login</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        {selectedMitraForDetail.status !== "rejected" && (
                          <TouchableOpacity
                            style={[styles.btnRejectAction, isSubmittingAction && { opacity: 0.7 }]}
                            onPress={() => handleOpenRejectModal(selectedMitraForDetail)}
                            disabled={isSubmittingAction}
                            activeOpacity={0.85}
                          >
                            <X size={16} color="#DC2626" />
                            <Text style={styles.btnRejectActionText}>Tolak Pengajuan</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: TOLAK DENGAN ALASAN ================= */}
      <Modal visible={isRejectModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: "#DC2626" }]}>Tolak Pendaftaran Mitra</Text>
                <Text style={styles.modalSubtitle}>
                  {rejectingMitra?.name} ({rejectingMitra?.email})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsRejectModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12.5, color: "#475569", marginBottom: 10, lineHeight: 18 }}>
                Tuliskan alasan penolakan secara jelas. Pesan ini akan dikirimkan langsung ke email <strong>{rejectingMitra?.email}</strong> dari <strong>aisyahputriharmelia@gmail.com</strong>.
              </Text>

              <Text style={styles.formLabel}>Alasan Penolakan:</Text>
              <TextInput
                style={styles.reasonTextInput}
                value={rejectionReasonInput}
                onChangeText={setRejectionReasonInput}
                placeholder="Contoh: Foto KTP tidak jelas / kurang terbaca..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.btnCancelModal}
                  onPress={() => setIsRejectModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnCancelModalText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnConfirmReject, isSubmittingAction && { opacity: 0.7 }]}
                  onPress={handleConfirmReject}
                  disabled={isSubmittingAction}
                  activeOpacity={0.85}
                >
                  {isSubmittingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnConfirmRejectText}>Kirim Email & Tolak</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FULLSCREEN IMAGE / PDF PREVIEW ================= */}
      <Modal
        visible={previewImageModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageModal({ visible: false, url: "", title: "", isPdf: false })}
      >
        <View style={styles.imagePreviewOverlay}>
          <SafeAreaView style={{ flex: 1, width: "100%" }}>
            {/* Top Header */}
            <View style={styles.imagePreviewHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.imagePreviewTitle} numberOfLines={1}>
                  {previewImageModal.title || "Pratinjau Dokumen"}
                </Text>
                <Text style={styles.imagePreviewSub}>Dokumen Verifikasi Mitra Ranger</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {previewImageModal.url ? (
                  <TouchableOpacity
                    style={styles.imagePreviewExternalBtn}
                    onPress={() => Linking.openURL(previewImageModal.url)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.imagePreviewCloseBtn}
                  onPress={() => setPreviewImageModal({ visible: false, url: "", title: "", isPdf: false })}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Content Center */}
            <View style={styles.imagePreviewContent}>
              {previewImageModal.url ? (
                previewImageModal.isPdf && Platform.OS === "web" ? (
                  React.createElement("iframe", {
                    src: previewImageModal.url,
                    style: { width: "100%", height: "100%", border: "none", borderRadius: 8 },
                    title: previewImageModal.title,
                  })
                ) : (
                  <Image
                    source={{ uri: previewImageModal.url }}
                    style={styles.imagePreviewFull}
                    resizeMode="contain"
                  />
                )
              ) : (
                <ActivityIndicator size="large" color="#0D7A53" />
              )}
            </View>

            {/* Footer Info */}
            <View style={styles.imagePreviewFooter}>
              <Text style={styles.imagePreviewFooterText}>
                🔍 Pastikan seluruh teks, nomor registrasi, dan legalitas dokumen terbaca jelas & sah sebelum menyetujui pendaftaran.
              </Text>
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
    backgroundColor: "#0F172A",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  adminProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  adminTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  livePulseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(13, 122, 83, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  livePulseText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#10B981",
  },
  adminEmail: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 1,
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  tabsContainer: {
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  tabButtonActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#94A3B8",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  pendingCounterBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  pendingCounterText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 14,
    backgroundColor: "#F8FAFC",
    minHeight: "100%",
    paddingBottom: 40,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "500",
  },
  filterChipRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    borderColor: "#0F172A",
    backgroundColor: "#0F172A",
  },
  filterChipPendingActive: {
    borderColor: "#F59E0B",
    backgroundColor: "#FEF3C7",
  },
  filterChipSuccessActive: {
    borderColor: "#0D7A53",
    backgroundColor: "#DCFCE7",
  },
  filterChipDangerActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterChipTextPendingActive: {
    color: "#B45309",
  },
  filterChipTextSuccessActive: {
    color: "#0D7A53",
  },
  filterChipTextDangerActive: {
    color: "#DC2626",
  },
  roleFilterRow: {
    gap: 6,
    marginBottom: 12,
    paddingVertical: 2,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  roleChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  mitraCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  mitraCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccessText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePendingText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#D97706",
  },
  badgeDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDangerText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  mitraMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  mitraAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  mitraAvatarInitial: {
    fontSize: 15,
    fontWeight: "900",
  },
  mitraBusinessTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  mitraOwnerName: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  mitraMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  mitraMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "48%",
  },
  mitraMetaItemText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
    flex: 1,
  },
  mitraCardFooter: {
    marginTop: 10,
  },
  btnInspectMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D7A53",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnInspectMainText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  masterFinCard: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  masterFinLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  masterFinValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
    marginBottom: 16,
  },
  masterFinGrid: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  masterFinStat: {
    flex: 1,
  },
  masterFinStatVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10B981",
  },
  masterFinStatLbl: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  masterFinDivider: {
    width: 1,
    height: 26,
    backgroundColor: "#334155",
    marginHorizontal: 8,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  serviceBreakdownGrid: {
    gap: 10,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  serviceIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  serviceCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  serviceCardAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  serviceCardSub: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 4,
  },
  txHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  txCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  txCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  txServiceBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txServiceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },
  txCodeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  txTitleText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  txCustomerText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  txCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  txDateText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  txAmountVal: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0D7A53",
  },
  userCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  userAvatarBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarInitial: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  userRoleSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  userPhoneSub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: "88%",
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalStatusBanner: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  modalStatusLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  modalStatusValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  formSectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
    marginBottom: 8,
  },
  detailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  detailVal: {
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  docItemCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  docHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  docItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  docItemSub: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 8,
  },
  docViewerBox: {
    height: 70,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  decisionActionsCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 14,
  },
  decisionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  decisionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  btnApproveAction: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnApproveActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnRejectAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnRejectActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  reasonTextInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    height: 90,
    textAlignVertical: "top",
  },
  btnCancelModal: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelModalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  btnConfirmReject: {
    flex: 2,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmRejectText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  badgeInfo: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  badgeInfoText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#2563EB",
  },
  badgeSample: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSampleText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  docImageContainer: {
    marginTop: 6,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  docImageThumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: "#E2E8F0",
  },
  docImageOverlayBar: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docImageOverlayText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  imagePreviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  imagePreviewSub: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  imagePreviewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewExternalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
  },
  imagePreviewFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    backgroundColor: "#0F172A",
  },
  imagePreviewFooterText: {
    fontSize: 11.5,
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 16,
  },
  pdfDocCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 6,
  },
  pdfDocRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pdfIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfFileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
  },
  pdfFileSize: {
    fontSize: 11,
    color: "#B91C1C",
    marginTop: 2,
  },
  pdfWebContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFFFF",
  },
  btnOpenPdf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnOpenPdfText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnPreviewPdfModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  btnPreviewPdfModalText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  pdfMetaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  pdfMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#991B1B",
    flex: 1,
  },
});
