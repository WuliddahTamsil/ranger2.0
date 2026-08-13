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
  Image,
} from "react-native";
import { Nav } from "../../types";
import {
  Search,
  Plus,
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
} from "lucide-react-native";

interface TenantData {
  id: string;
  name: string;
  avatar: string;
  status: "aktif" | "akan_keluar";
  roomNumber: string;
  roomType: string;
  phone: string;
  entryDate: string;
  daysLeft: number;
  priceMonth: string;
}

export const ManajemenPenghuniScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("penghuni");

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter Chip State
  const [activeFilter, setActiveFilter] = useState<"semua" | "aktif" | "akan_keluar">("semua");

  // State for Options Bottom Sheet
  const [selectedTenantForOptions, setSelectedTenantForOptions] = useState<TenantData | null>(null);

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

  // Sample Tenant List matching Image 1
  const [tenants, setTenants] = useState<TenantData[]>([
    {
      id: "1",
      name: "Budi Santoso",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      status: "aktif",
      roomNumber: "Kamar 1A",
      roomType: "Tipe AC",
      phone: "081234567890",
      entryDate: "15/01/26",
      daysLeft: 20,
      priceMonth: "Rp 1.200.000",
    },
    {
      id: "2",
      name: "Dewi Lestari",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
      status: "aktif",
      roomNumber: "Kamar 2C",
      roomType: "Tipe AC",
      phone: "081324681357",
      entryDate: "10/02/26",
      daysLeft: 16,
      priceMonth: "Rp 1.300.000",
    },
    {
      id: "3",
      name: "Ahmad Faisal",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      status: "aktif",
      roomNumber: "Kamar 3B",
      roomType: "Tipe Standar",
      phone: "081987654321",
      entryDate: "01/03/26",
      daysLeft: 7,
      priceMonth: "Rp 950.000",
    },
  ]);

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
    setSelectedTenantForOptions(null);
    setIsAddModalOpen(true);
  };

  // Save Tenant Handler
  const handleSaveTenant = () => {
    if (!namaLengkap) return;

    if (modalMode === "edit" && editingTenantId) {
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
                priceMonth: `Rp ${hargaSewa || "1.200.000"}`,
              }
            : t
        )
      );
    } else {
      const newTenant: TenantData = {
        id: Date.now().toString(),
        name: namaLengkap,
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
        status: "aktif",
        roomNumber: nomorKamar || "Kamar 1B",
        roomType: tipeKamar,
        phone: noHp || "081299998888",
        entryDate: tanggalMasuk || "10 Ags 2026",
        daysLeft: 30,
        priceMonth: `Rp ${hargaSewa || "1.200.000"}`,
      };
      setTenants([newTenant, ...tenants]);
    }
    setIsAddModalOpen(false);
  };

  // Delete Tenant
  const handleDeleteTenant = (id: string) => {
    setTenants(tenants.filter((t) => t.id !== id));
    setSelectedTenantForOptions(null);
  };

  // Dynamic Counters
  const totalPenghuni = tenants.length;
  const aktifCount = tenants.filter((t) => t.status === "aktif").length;
  const akanKeluarCount = tenants.filter((t) => t.status === "akan_keluar").length;
  const aktifPercentage = totalPenghuni > 0 ? Math.round((aktifCount / totalPenghuni) * 100) : 0;
  const akanKeluarPercentage = totalPenghuni > 0 ? Math.round((akanKeluarCount / totalPenghuni) * 100) : 0;

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

        {/* Tenant Cards List */}
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
            </View>
          ))}
        </View>

        {/* Bottom Financial Summary Row (Pendapatan & Tunggakan) */}
        <View style={styles.financialSummaryRow}>
          {/* Card 1: Pendapatan */}
          <TouchableOpacity style={[styles.finCard, { backgroundColor: "#ECFDF5" }]} activeOpacity={0.8}>
            <View style={styles.finHeaderRow}>
              <View style={[styles.finIconCircle, { backgroundColor: "#0D7A53" }]}>
                <DollarSign size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.finLabel}>Pendapatan</Text>
                <Text style={[styles.finVal, { color: "#0D7A53" }]}>Rp 12.500.000</Text>
              </View>
              <ChevronRight size={16} color="#0D7A53" />
            </View>
          </TouchableOpacity>

          {/* Card 2: Tunggakan */}
          <TouchableOpacity style={[styles.finCard, { backgroundColor: "#FEF2F2" }]} activeOpacity={0.8}>
            <View style={styles.finHeaderRow}>
              <View style={[styles.finIconCircle, { backgroundColor: "#DC2626" }]}>
                <AlertCircle size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.finLabel}>Tunggakan</Text>
                <Text style={[styles.finVal, { color: "#DC2626" }]}>Rp 1.500.000</Text>
              </View>
              <ChevronRight size={16} color="#DC2626" />
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
    gap: 10,
    marginBottom: 16,
  },
  finCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
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
});
