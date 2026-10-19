import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  X,
  Plus,
  Tag,
  Truck,
  Percent,
  CheckCircle2,
  Trash2,
  Calendar,
  AlertCircle,
  Copy,
  Sparkles,
  ShoppingBag,
  Clock,
  Check,
} from "lucide-react-native";
import {
  MerchantVoucher,
  CreateMerchantVoucherPayload,
  VoucherDiscountType,
  fetchMerchantVouchers,
  createMerchantVoucher,
  toggleMerchantVoucherStatus,
  deleteMerchantVoucher,
} from "../services/merchantVoucherService";
import { rp } from "../utils/formatters";

interface Props {
  visible: boolean;
  onClose: () => void;
  merchantId?: string;
  merchantName?: string;
  service?: string; // "SHOP" | "MARKETPLACE" | "CATERING" | etc.
}

export const MerchantVoucherManagementModal: React.FC<Props> = ({
  visible,
  onClose,
  merchantId,
  merchantName = "Toko Saya",
  service = "SHOP",
}) => {
  const [vouchers, setVouchers] = useState<MerchantVoucher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<"ALL" | "FREE_SHIPPING" | "DISCOUNT" | "INACTIVE">("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create Voucher Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<VoucherDiscountType>("FREE_SHIPPING");
  const [discountValue, setDiscountValue] = useState("10000");
  const [minTransaction, setMinTransaction] = useState("25000");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("50");
  const [validDays, setValidDays] = useState<number>(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMerchantVouchers();
      if (res.success && res.data) {
        setVouchers(res.data);
      }
    } catch {
      // handled inside service with mock fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Statistics
  const stats = useMemo(() => {
    const active = vouchers.filter((v) => v.status === "ACTIVE").length;
    const claimed = vouchers.reduce((acc, v) => acc + (v.claimedCount || 0), 0);
    const used = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);
    return { active, claimed, used };
  }, [vouchers]);

  // Filtered List
  const filteredList = useMemo(() => {
    return vouchers.filter((v) => {
      if (filterType === "ALL") return true;
      if (filterType === "FREE_SHIPPING") return v.discountType === "FREE_SHIPPING";
      if (filterType === "DISCOUNT") return v.discountType === "FIXED" || v.discountType === "PERCENTAGE";
      if (filterType === "INACTIVE") return v.status === "INACTIVE" || v.status === "EXPIRED";
      return true;
    });
  }, [vouchers, filterType]);

  const handleCopyCode = (voucherCode: string) => {
    setCopiedCode(voucherCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (item: MerchantVoucher) => {
    const res = await toggleMerchantVoucherStatus(item._id);
    if (res.success) {
      setVouchers((prev) =>
        prev.map((v) =>
          v._id === item._id ? { ...v, status: v.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : v
        )
      );
    } else {
      Alert.alert("Gagal", res.message || "Gagal mengubah status voucher.");
    }
  };

  const handleDelete = (item: MerchantVoucher) => {
    const doDelete = async () => {
      const res = await deleteMerchantVoucher(item._id);
      if (res.success) {
        setVouchers((prev) => prev.filter((v) => v._id !== item._id));
      } else {
        Alert.alert("Gagal", res.message || "Gagal menghapus voucher.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Hapus voucher ${item.voucherCode}?`)) {
        void doDelete();
      }
    } else {
      Alert.alert(
        "Hapus Voucher?",
        `Apakah Anda yakin ingin menghapus voucher "${item.title}" (${item.voucherCode})?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Hapus", style: "destructive", onPress: () => void doDelete() },
        ]
      );
    }
  };

  const resetForm = () => {
    setCode("");
    setTitle("");
    setDescription("");
    setDiscountType("FREE_SHIPPING");
    setDiscountValue("10000");
    setMinTransaction("25000");
    setMaxDiscount("");
    setUsageLimit("50");
    setValidDays(30);
  };

  const handlePresetType = (type: VoucherDiscountType) => {
    setDiscountType(type);
    if (type === "FREE_SHIPPING") {
      setCode("ONGKIRGRATIS");
      setTitle("Gratis Ongkir Toko");
      setDiscountValue("10000");
      setDescription("Subsidi ongkos kirim pengiriman barang.");
    } else if (type === "FIXED") {
      setCode("HEMAT10RB");
      setTitle("Diskon Belanja Rp 10.000");
      setDiscountValue("10000");
      setDescription("Potongan langsung belanja untuk semua produk.");
    } else {
      setCode("DISKON15");
      setTitle("Diskon 15% Spesial");
      setDiscountValue("15");
      setMaxDiscount("25000");
      setDescription("Potongan diskon 15% dengan maksimal Rp 25.000.");
    }
  };

  const handleCreateVoucher = async () => {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleanCode || cleanCode.length < 3) {
      Alert.alert("Kode Tidak Valid", "Kode voucher minimal 3 karakter huruf/angka.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Judul Wajib Diisi", "Berikan judul promo voucher yang menarik untuk pelanggan.");
      return;
    }

    const numDiscountValue = parseInt(discountValue.replace(/[^0-9]/g, ""), 10) || 0;
    if (numDiscountValue <= 0) {
      Alert.alert("Nilai Diskon Tidak Valid", "Masukkan nominal diskon atau persentase yang valid.");
      return;
    }

    if (discountType === "PERCENTAGE" && numDiscountValue > 100) {
      Alert.alert("Persentase Tidak Valid", "Persentase diskon maksimal 100%.");
      return;
    }

    const numMinTx = parseInt(minTransaction.replace(/[^0-9]/g, ""), 10) || 0;
    const numUsageLimit = parseInt(usageLimit.replace(/[^0-9]/g, ""), 10) || 100;
    const numMaxDiscount = maxDiscount ? parseInt(maxDiscount.replace(/[^0-9]/g, ""), 10) : undefined;

    const validUntilDate = new Date(Date.now() + validDays * 86400000).toISOString();

    const payload: CreateMerchantVoucherPayload = {
      voucherCode: cleanCode,
      title: title.trim(),
      description: description.trim() || undefined,
      service,
      discountType,
      discountValue: numDiscountValue,
      minTransaction: numMinTx,
      maxDiscount: numMaxDiscount,
      pointsCost: 0,
      usageLimit: numUsageLimit,
      validUntil: validUntilDate,
    };

    setSubmitting(true);
    try {
      const res = await createMerchantVoucher(payload);
      if (res.success && res.data) {
        Alert.alert(
          "Voucher Berhasil Dibuat!",
          `Kode ${res.data.voucherCode} kini aktif dan dapat diklaim/digunakan oleh pembeli Anda.`
        );
        setShowCreateModal(false);
        resetForm();
        await loadData();
      } else {
        Alert.alert("Gagal Membuat Voucher", res.message || "Terjadi kesalahan sistem.");
      }
    } catch (err: any) {
      Alert.alert("Kesalahan", err?.message || "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Kelola Voucher Toko</Text>
            <Text style={styles.headerSub}>
              {merchantName} • Promo & Subsidi Ongkir
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                resetForm();
                handlePresetType("FREE_SHIPPING");
                setShowCreateModal(true);
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.createBtnText}>Buat Voucher</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Stats Bar */}
          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{stats.active}</Text>
              <Text style={styles.statLabel}>Voucher Aktif</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: "#2563EB" }]}>{stats.claimed}</Text>
              <Text style={styles.statLabel}>Diklaim Pembeli</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: "#16A34A" }]}>{stats.used}</Text>
              <Text style={styles.statLabel}>Digunakan</Text>
            </View>
          </View>

          {/* Highlight Banner */}
          <View style={styles.tipBanner}>
            <View style={styles.tipIconBadge}>
              <Sparkles size={16} color="#0D7A53" />
            </View>
            <View style={styles.tipTextCol}>
              <Text style={styles.tipTitle}>Tingkatkan Penjualan dengan Gratis Ongkir</Text>
              <Text style={styles.tipDesc}>
                Pembeli cenderung membeli hingga 3x lebih banyak jika toko menyediakan voucher Gratis Ongkir atau potongan harga langsung.
              </Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterType === "ALL" && styles.filterChipActive]}
              onPress={() => setFilterType("ALL")}
            >
              <Text style={[styles.filterChipText, filterType === "ALL" && styles.filterChipTextActive]}>
                Semua ({vouchers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterType === "FREE_SHIPPING" && styles.filterChipActive]}
              onPress={() => setFilterType("FREE_SHIPPING")}
            >
              <Truck size={13} color={filterType === "FREE_SHIPPING" ? "#FFFFFF" : "#10B981"} style={{ marginRight: 4 }} />
              <Text style={[styles.filterChipText, filterType === "FREE_SHIPPING" && styles.filterChipTextActive]}>
                Gratis Ongkir
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterType === "DISCOUNT" && styles.filterChipActive]}
              onPress={() => setFilterType("DISCOUNT")}
            >
              <Tag size={13} color={filterType === "DISCOUNT" ? "#FFFFFF" : "#6366F1"} style={{ marginRight: 4 }} />
              <Text style={[styles.filterChipText, filterType === "DISCOUNT" && styles.filterChipTextActive]}>
                Diskon Harga
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterType === "INACTIVE" && styles.filterChipActive]}
              onPress={() => setFilterType("INACTIVE")}
            >
              <Text style={[styles.filterChipText, filterType === "INACTIVE" && styles.filterChipTextActive]}>
                Nonaktif
              </Text>
            </TouchableOpacity>
          </View>

          {/* Voucher List */}
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#0D7A53" />
              <Text style={styles.emptyText}>Memuat voucher promo toko...</Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Tag size={42} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Belum Ada Voucher</Text>
              <Text style={styles.emptyText}>
                Anda belum membuat voucher promo untuk kategori ini. Tekan tombol &quot;+ Buat Voucher&quot; di atas untuk memulai promosi toko Anda.
              </Text>
            </View>
          ) : (
            filteredList.map((item) => {
              const isFreeShipping = item.discountType === "FREE_SHIPPING";
              const isPercentage = item.discountType === "PERCENTAGE";
              const isActive = item.status === "ACTIVE";

              return (
                <View
                  key={item._id}
                  style={[
                    styles.voucherCard,
                    !isActive && styles.voucherCardInactive,
                  ]}
                >
                  <View style={[styles.voucherLeftBorder, { backgroundColor: isFreeShipping ? "#10B981" : isPercentage ? "#F59E0B" : "#3B82F6" }]} />

                  <View style={styles.voucherContent}>
                    {/* Top Row: Type Badge & Switch */}
                    <View style={styles.voucherHeaderRow}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.typeBadge,
                            isFreeShipping
                              ? styles.badgeFreeShipping
                              : isPercentage
                              ? styles.badgePercent
                              : styles.badgeFixed,
                          ]}
                        >
                          {isFreeShipping ? (
                            <Truck size={11} color="#065F46" />
                          ) : isPercentage ? (
                            <Percent size={11} color="#92400E" />
                          ) : (
                            <Tag size={11} color="#1E40AF" />
                          )}
                          <Text
                            style={[
                              styles.typeBadgeText,
                              isFreeShipping
                                ? styles.textFreeShipping
                                : isPercentage
                                ? styles.textPercent
                                : styles.textFixed,
                            ]}
                          >
                            {isFreeShipping
                              ? "GRATIS ONGKIR"
                              : isPercentage
                              ? `DISKON ${item.discountValue}%`
                              : `DISKON ${rp(item.discountValue)}`}
                          </Text>
                        </View>

                        <View style={styles.codePill}>
                          <Text style={styles.codeText}>{item.voucherCode}</Text>
                          <TouchableOpacity
                            onPress={() => handleCopyCode(item.voucherCode)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {copiedCode === item.voucherCode ? (
                              <Check size={12} color="#16A34A" />
                            ) : (
                              <Copy size={12} color="#64748B" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.statusRow}>
                        <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                          {isActive ? "Aktif" : "Nonaktif"}
                        </Text>
                        <Switch
                          value={isActive}
                          onValueChange={() => handleToggleStatus(item)}
                          trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
                          thumbColor={isActive ? "#059669" : "#94A3B8"}
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </View>
                    </View>

                    {/* Voucher Title & Description */}
                    <Text style={styles.voucherTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.voucherDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    {/* Rules & Requirements */}
                    <View style={styles.rulesRow}>
                      <View style={styles.ruleItem}>
                        <ShoppingBag size={12} color="#64748B" />
                        <Text style={styles.ruleText}>
                          Min. Blj: {rp(item.minTransaction || 0)}
                        </Text>
                      </View>

                      {isFreeShipping ? (
                        <View style={styles.ruleItem}>
                          <Truck size={12} color="#64748B" />
                          <Text style={styles.ruleText}>
                            Maks. Subsidi: {rp(item.discountValue)}
                          </Text>
                        </View>
                      ) : null}

                      {isPercentage && item.maxDiscount ? (
                        <View style={styles.ruleItem}>
                          <Tag size={12} color="#64748B" />
                          <Text style={styles.ruleText}>
                            Maks. Diskon: {rp(item.maxDiscount)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer: Usage quota, valid until, & delete */}
                    <View style={styles.voucherFooter}>
                      <View style={styles.usageRow}>
                        <Clock size={12} color="#64748B" />
                        <Text style={styles.usageText}>
                          Terpakai: <Text style={{ fontWeight: "700", color: "#0F172A" }}>{item.usedCount || 0}</Text>/{item.usageLimit || "∞"}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ================= MODAL BUAT VOUCHER ================= */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Buat Voucher Promo Baru</Text>
                  <Text style={styles.modalSubtitle}>Kustomisasi voucher toko Anda</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {/* 1. Tipe Diskon Segment */}
                <Text style={styles.inputLabel}>Tipe Promo Voucher</Text>
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeSelectorBtn,
                      discountType === "FREE_SHIPPING" && styles.typeSelectorBtnActive,
                    ]}
                    onPress={() => handlePresetType("FREE_SHIPPING")}
                  >
                    <Truck size={16} color={discountType === "FREE_SHIPPING" ? "#0D7A53" : "#64748B"} />
                    <Text
                      style={[
                        styles.typeSelectorLabel,
                        discountType === "FREE_SHIPPING" && styles.typeSelectorLabelActive,
                      ]}
                    >
                      Gratis Ongkir
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeSelectorBtn,
                      discountType === "FIXED" && styles.typeSelectorBtnActive,
                    ]}
                    onPress={() => handlePresetType("FIXED")}
                  >
                    <Tag size={16} color={discountType === "FIXED" ? "#0D7A53" : "#64748B"} />
                    <Text
                      style={[
                        styles.typeSelectorLabel,
                        discountType === "FIXED" && styles.typeSelectorLabelActive,
                      ]}
                    >
                      Diskon Flat (Rp)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeSelectorBtn,
                      discountType === "PERCENTAGE" && styles.typeSelectorBtnActive,
                    ]}
                    onPress={() => handlePresetType("PERCENTAGE")}
                  >
                    <Percent size={16} color={discountType === "PERCENTAGE" ? "#0D7A53" : "#64748B"} />
                    <Text
                      style={[
                        styles.typeSelectorLabel,
                        discountType === "PERCENTAGE" && styles.typeSelectorLabelActive,
                      ]}
                    >
                      Persen (%)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Kode Voucher */}
                <Text style={styles.inputLabel}>Kode Voucher (Huruf Kapital & Angka)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Contoh: ONGKIRFREE, HEMAT10"
                  placeholderTextColor="#94A3B8"
                  value={code}
                  onChangeText={(val) => setCode(val.toUpperCase())}
                  autoCapitalize="characters"
                />

                {/* 3. Judul Promo */}
                <Text style={styles.inputLabel}>Judul Promo Voucher</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Contoh: Gratis Ongkir Kamojang s/d Rp 10.000"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />

                {/* 4. Deskripsi / Catatan */}
                <Text style={styles.inputLabel}>Deskripsi / Syarat Ketentuan</Text>
                <TextInput
                  style={[styles.inputField, { height: 60, textAlignVertical: "top" }]}
                  placeholder="Contoh: Berlaku khusus pemesanan produk di toko kami"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                {/* 5. Nilai Diskon / Subsidi Ongkir */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>
                      {discountType === "FREE_SHIPPING"
                        ? "Maks. Subsidi Ongkir (Rp)"
                        : discountType === "PERCENTAGE"
                        ? "Diskon (%)"
                        : "Nominal Diskon (Rp)"}
                    </Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder={discountType === "PERCENTAGE" ? "Contoh: 15" : "Contoh: 10000"}
                      placeholderTextColor="#94A3B8"
                      value={discountValue}
                      onChangeText={setDiscountValue}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Min. Pembelian (Rp)</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Contoh: 25000"
                      placeholderTextColor="#94A3B8"
                      value={minTransaction}
                      onChangeText={setMinTransaction}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* 6. Batas Diskon Maksimal (khusus Persentase) */}
                {discountType === "PERCENTAGE" && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={styles.inputLabel}>Maksimal Potongan Diskon (Rp)</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Contoh: 25000 (Opsional)"
                      placeholderTextColor="#94A3B8"
                      value={maxDiscount}
                      onChangeText={setMaxDiscount}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* 7. Kuota Penggunaan & Durasi */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Kuota Penggunaan</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Contoh: 50"
                      placeholderTextColor="#94A3B8"
                      value={usageLimit}
                      onChangeText={setUsageLimit}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Masa Berlaku</Text>
                    <View style={styles.dayPickerRow}>
                      {[7, 14, 30, 60].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayChip, validDays === d && styles.dayChipActive]}
                          onPress={() => setValidDays(d)}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              validDays === d && styles.dayChipTextActive,
                            ]}
                          >
                            {d}h
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Live Preview Card */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Pratinjau Voucher:</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewLeft}>
                    {discountType === "FREE_SHIPPING" ? (
                      <Truck size={24} color="#059669" />
                    ) : discountType === "PERCENTAGE" ? (
                      <Percent size={24} color="#D97706" />
                    ) : (
                      <Tag size={24} color="#2563EB" />
                    )}
                  </View>
                  <View style={styles.previewRight}>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {title || "Judul Promo Voucher"}
                    </Text>
                    <Text style={styles.previewDesc} numberOfLines={1}>
                      {discountType === "FREE_SHIPPING"
                        ? `Gratis Ongkos Kirim s/d ${rp(parseInt(discountValue, 10) || 0)}`
                        : discountType === "PERCENTAGE"
                        ? `Diskon ${discountValue || "0"}%`
                        : `Potongan Harga ${rp(parseInt(discountValue, 10) || 0)}`}
                    </Text>
                    <Text style={styles.previewFooter}>
                      Kode: {code || "KODE"} • Min. Blj {rp(parseInt(minTransaction, 10) || 0)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer CTA */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.btnDisabled]}
                  onPress={handleCreateVoucher}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Terbitkan Voucher</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
  },
  tipBanner: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 16,
    gap: 10,
    alignItems: "center",
  },
  tipIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  tipTextCol: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
  },
  tipDesc: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  filterChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  voucherCardInactive: {
    opacity: 0.65,
    backgroundColor: "#F8FAFC",
  },
  voucherLeftBorder: {
    width: 5,
  },
  voucherContent: {
    flex: 1,
    padding: 14,
  },
  voucherHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeFreeShipping: {
    backgroundColor: "#D1FAE5",
  },
  badgeFixed: {
    backgroundColor: "#DBEAFE",
  },
  badgePercent: {
    backgroundColor: "#FEF3C7",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textFreeShipping: {
    color: "#065F46",
  },
  textFixed: {
    color: "#1E40AF",
  },
  textPercent: {
    color: "#92400E",
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    color: "#0F172A",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 2,
  },
  statusTextActive: {
    color: "#059669",
  },
  statusTextInactive: {
    color: "#94A3B8",
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  voucherDesc: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    lineHeight: 16,
  },
  rulesRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ruleText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  voucherFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  usageText: {
    fontSize: 11,
    color: "#64748B",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  deleteBtnText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalScrollContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  twoColRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  typeSelectorBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  typeSelectorBtnActive: {
    borderColor: "#0D7A53",
    backgroundColor: "#ECFDF5",
  },
  typeSelectorLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  typeSelectorLabelActive: {
    color: "#0D7A53",
  },
  dayPickerRow: {
    flexDirection: "row",
    gap: 4,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  dayChipActive: {
    borderColor: "#0D7A53",
    backgroundColor: "#ECFDF5",
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  dayChipTextActive: {
    color: "#0D7A53",
  },
  previewCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 12,
  },
  previewLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  previewRight: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  previewDesc: {
    fontSize: 12,
    color: "#166534",
    marginTop: 2,
    fontWeight: "600",
  },
  previewFooter: {
    fontSize: 10,
    color: "#475569",
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
