import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { SafeAreaBottomBar } from "../../components/SafeAreaBottomBar";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Switch,
  Modal,
  Alert,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  Shirt,
  ShoppingBag,
  Wallet,
  CheckSquare,
  TrendingUp,
  ChevronRight,
  Home,
  Package,
  Users,
  User,
  Scale,
  CreditCard,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Store,
  Layers,
  Trash2,
  Plus,
  X,
} from "lucide-react-native";
import { RoleHeader } from "../../components/RoleHeader";
import {
  fetchStoreOrders,
  subscribeLaundry,
  getActiveLaundryOrder,
  updateLaundryOrderStatus,
  getSelectedStore,
  saveMyLaundryStore,
  fetchMyLaundryStore,
  setSelectedStore,
  LaundryOrder,
  LaundryStore,
  LaundryServiceItem,
} from "../../services/laundryService";

interface PemilikLaundryHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const PemilikLaundryHomeScreen: React.FC<PemilikLaundryHomeProps> = ({ navigate, authAccount }) => {
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [storeInfo, setStoreInfo] = useState<LaundryStore | null>(getSelectedStore());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Service Management Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [servicesList, setServicesList] = useState<LaundryServiceItem[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceUnit, setNewServiceUnit] = useState<"kg" | "pcs">("kg");
  const [newServiceCategory, setNewServiceCategory] = useState<"biasa" | "ekspres" | "satuan">("biasa");

  const SERVICE_PRESETS = [
    { name: "Cuci Komplit (Cuci + Setrika)", defaultPrice: 6000, unit: "kg" as const, category: "biasa" as const, desc: "Cuci, kering, setrika uap, pewangi & packing rapi" },
    { name: "Setrika Uap Saja", defaultPrice: 3500, unit: "kg" as const, category: "biasa" as const, desc: "Setrika uap licin dan wangi tahan lama" },
    { name: "Cuci Kering Lipat", defaultPrice: 4500, unit: "kg" as const, category: "biasa" as const, desc: "Cuci higienis & lipat rapi tanpa setrika" },
    { name: "Express 3 Jam (Siap Pakai)", defaultPrice: 10000, unit: "kg" as const, category: "ekspres" as const, desc: "Prioritas khusus pencucian kilat 3 jam selesai" },
    { name: "Cuci Bedcover Besar", defaultPrice: 25000, unit: "pcs" as const, category: "satuan" as const, desc: "Pembersihan menyeluruh bedcover/selimut besar" },
    { name: "Cuci Sepatu Premium", defaultPrice: 30000, unit: "pasang" as const, category: "satuan" as const, desc: "Deep clean sepatu sneakers, canvas, atau kulit" },
  ];

  const handleApplyPreset = (preset: typeof SERVICE_PRESETS[0]) => {
    setNewServiceName(preset.name);
    setNewServicePrice(preset.defaultPrice.toString());
    setNewServiceUnit(preset.unit === "pasang" ? "pcs" : preset.unit);
    setNewServiceCategory(preset.category);
  };

  const handleUpdatePrice = (idx: number, newPriceStr: string) => {
    const priceNum = parseInt(newPriceStr.replace(/\D/g, ""), 10) || 0;
    const updated = [...servicesList];
    updated[idx] = { ...updated[idx], price: priceNum };
    setServicesList(updated);
  };

  const handleAddService = () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) {
      Alert.alert("Input Kurang", "Harap isi nama paket dan harga tarif.");
      return;
    }
    const priceNum = parseInt(newServicePrice.replace(/\D/g, ""), 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Harga Tidak Valid", "Masukkan nominal harga yang benar.");
      return;
    }

    const newItem: LaundryServiceItem = {
      id: `svc_${Date.now()}`,
      name: newServiceName.trim(),
      desc: "Layanan cuci berkualitas",
      price: priceNum,
      unit: newServiceUnit,
      category: newServiceCategory,
      isActive: true,
    };

    const updated = [...servicesList, newItem];
    setServicesList(updated);
    setNewServiceName("");
    setNewServicePrice("");
  };

  const handleDeleteService = (idx: number) => {
    const updated = servicesList.filter((_, i) => i !== idx);
    setServicesList(updated);
  };

  const handleSaveServices = async () => {
    if (!storeInfo) return;
    const updatedStore: LaundryStore = {
      ...storeInfo,
      services: servicesList,
    };
    setStoreInfo(updatedStore);
    setSelectedStore(updatedStore);
    await saveMyLaundryStore(updatedStore);
    setIsServiceModalOpen(false);
    Alert.alert("Berhasil Tersimpan", "Daftar layanan & tarif toko laundry berhasil diperbarui di MongoDB dan langsung aktif di sisi Customer!");
  };

  const loadData = useCallback(async () => {
    if (!authAccount?.id) {
      setOrders([]);
      return;
    }
    const data = await fetchStoreOrders(authAccount.id);
    setOrders(data || []);

    // Fetch and bind actual store for logged in user
    try {
      const currentStore = await fetchMyLaundryStore(authAccount.id);
      const dynamicStoreName =
        authAccount?.roleData?.businessName ||
        (currentStore?.storeName && currentStore.storeName !== "Toko Laundry Saya" && currentStore.storeName !== "Ais laundry" ? currentStore.storeName : null) ||
        (authAccount?.name ? `${authAccount.name} Laundry` : "Outlet Laundry");

      const mergedStore: LaundryStore = {
        ...(currentStore || getSelectedStore()),
        storeName: dynamicStoreName,
        ownerId: authAccount.id,
      };
      setStoreInfo(mergedStore);
      setSelectedStore(mergedStore);
      setServicesList(mergedStore.services || []);
    } catch {
      setStoreInfo(getSelectedStore());
    }
  }, [authAccount?.id, authAccount?.name, authAccount?.roleData?.businessName]);

  useEffect(() => {
    loadData();
    const unsub = subscribeLaundry(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleToggleStoreStatus = async () => {
    if (!storeInfo) return;
    const newStatus = storeInfo.isOpen === false;
    const updated = { ...storeInfo, isOpen: newStatus };
    setStoreInfo(updated);
    setSelectedStore(updated);
    await saveMyLaundryStore(updated);
  };

  const handleQuickAccOrder = async (orderId: string) => {
    await updateLaundryOrderStatus(orderId, "MENUNGGU_DRIVER_JEMPUT");
    await loadData();
  };

  const incomingPendingAccCount = orders.filter((o) => o.status === "MENUNGGU_KONFIRMASI_MITRA").length;
  const needWeighCount = orders.filter((o) => o.status === "TIBA_DI_LAUNDRY" || (!o.actualWeightOrQty && o.status !== "MENUNGGU_KONFIRMASI_MITRA" && o.status !== "SELESAI")).length;
  const verifyingCount = orders.filter((o) => o.paymentStatus === "menunggu_verifikasi" || o.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN").length;
  const inProgressCount = orders.filter((o) => o.status === "SEDANG_DICUCI" || o.status === "PEMBAYARAN_LUNAS").length;
  const completedCount = orders.filter((o) => o.status === "SELESAI" || o.status === "SIAP_DIANTAR" || o.status === "DRIVER_MENGANTAR_BALIK").length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "lunas")
    .reduce((acc, curr) => acc + (curr.laundryCost || curr.totalAmount || 0), 0);

  const totalActiveTasks = incomingPendingAccCount + needWeighCount + verifyingCount;

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#0D7A53"]} />}
      >
        {/* Role Header */}
        <RoleHeader
          name={authAccount?.name || "Pemilik Laundry"}
          role="Pemilik Laundry"
          icon={Shirt}
          fullBleed={false}
          notificationCount={totalActiveTasks}
          onRolePress={() => navigate("role")}
        />

        {/* Store Status Hero Bar */}
        <View style={styles.storeStatusCard}>
          <View style={styles.storeStatusLeft}>
            <View style={[styles.statusDotPulse, { backgroundColor: storeInfo?.isOpen !== false ? "#DCFCE7" : "#FEE2E2" }]}>
              <View style={[styles.statusDotInner, { backgroundColor: storeInfo?.isOpen !== false ? "#16A34A" : "#DC2626" }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeStatusTitle} numberOfLines={1}>
                {storeInfo?.storeName || authAccount?.roleData?.businessName || (authAccount?.name ? `${authAccount.name} Laundry` : "Outlet Laundry")}
              </Text>
              <Text style={styles.storeStatusSub}>
                {storeInfo?.isOpen !== false ? "🟢 Toko Buka • Siap Terima Order" : "🔴 Toko Tutup Sementara"}
              </Text>
            </View>
          </View>

          {/* Toggle Switch */}
          <View style={styles.toggleWrapper}>
            <Switch
              value={storeInfo?.isOpen !== false}
              onValueChange={handleToggleStoreStatus}
              trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
              thumbColor={storeInfo?.isOpen !== false ? "#0D7A53" : "#64748B"}
              ios_backgroundColor="#CBD5E1"
            />
          </View>
        </View>

        {/* Ringkasan Hari Ini Card (Sleek Glass/Card Theme) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} color="#0D7A53" />
              <Text style={styles.summaryTitle}>Ringkasan Hari Ini</Text>
            </View>

            <TouchableOpacity
              style={styles.seeDetailBtn}
              onPress={() => navigate("pemilik_laundry_order")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeDetailText}>Kelola Order</Text>
              <ChevronRight size={14} color="#0D7A53" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardHeaderDivider} />

          {/* 2x2 Grid Stats */}
          <View style={styles.statsGridContainer}>
            {/* Top Row */}
            <View style={styles.statRow}>
              {/* Stat 1: Pesanan Masuk / ACC */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_order")}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconBg, { backgroundColor: incomingPendingAccCount > 0 ? "#FEF3C7" : "#E8F5EE" }]}>
                  <Package size={18} color={incomingPendingAccCount > 0 ? "#D97706" : "#0D7A53"} />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={[styles.statValNum, incomingPendingAccCount > 0 && { color: "#D97706" }]}>
                    {incomingPendingAccCount}
                  </Text>
                  <Text style={styles.statValSub}>Pesanan Masuk</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              {/* Stat 2: Perlu Timbang */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_order")}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconBg, { backgroundColor: needWeighCount > 0 ? "#FEF3C7" : "#E8F5EE" }]}>
                  <Scale size={18} color={needWeighCount > 0 ? "#D97706" : "#0D7A53"} />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={[styles.statValNum, needWeighCount > 0 && { color: "#D97706" }]}>
                    {needWeighCount}
                  </Text>
                  <Text style={styles.statValSub}>Perlu Timbang</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.horizontalDivider} />

            {/* Bottom Row */}
            <View style={styles.statRow}>
              {/* Stat 3: Sedang Proses / Dicuci */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_order")}
                activeOpacity={0.7}
              >
                <View style={styles.statIconBg}>
                  <Shirt size={18} color="#0D7A53" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={styles.statValNum}>{inProgressCount}</Text>
                  <Text style={styles.statValSub}>Sedang Proses</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              {/* Stat 4: Pendapatan Lunas */}
              <TouchableOpacity
                style={styles.statCol}
                onPress={() => navigate("pemilik_laundry_pendapatan")}
                activeOpacity={0.7}
              >
                <View style={styles.statIconBg}>
                  <TrendingUp size={18} color="#0D7A53" />
                </View>
                <View style={styles.statTextGroup}>
                  <Text style={[styles.statValNum, { color: "#0D7A53" }]}>
                    Rp {totalRevenue.toLocaleString("id-ID")}
                  </Text>
                  <Text style={styles.statValSub}>Pendapatan</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Orders Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.sectionTitle}>Pesanan Masuk Real-Time</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.seeDetailBtn}
            onPress={() => navigate("pemilik_laundry_order")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeDetailText}>Lihat Semua</Text>
            <ChevronRight size={14} color="#0D7A53" />
          </TouchableOpacity>
        </View>

        {/* Orders Card Feed */}
        <View style={styles.orderCardGroup}>
          {orders.length === 0 ? (
            <View style={styles.emptyFeedBox}>
              <Store size={36} color="#9CA3AF" />
              <Text style={styles.emptyFeedTitle}>Belum Ada Pesanan Masuk</Text>
              <Text style={styles.emptyFeedSub}>
                Pesanan baru dari customer yang memilih toko Anda akan langsung muncul di sini secara real-time.
              </Text>
            </View>
          ) : (
            orders.slice(0, 5).map((o, idx) => {
              const isLast = idx === Math.min(orders.length, 5) - 1;
              const isWeighed = Boolean(o.actualWeightOrQty);
              const isPendingAcc = o.status === "MENUNGGU_KONFIRMASI_MITRA";
              const isVerifyingTF = o.paymentStatus === "menunggu_verifikasi" || o.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN";
              const isPaid = o.paymentStatus === "lunas";

              return (
                <View key={o.orderCode || idx} style={[styles.orderItemCard, isLast && { borderBottomWidth: 0 }]}>
                  <View style={styles.orderItemMainRow}>
                    <View style={[styles.orderIconBg, { backgroundColor: isPaid ? "#E8F5EE" : isPendingAcc ? "#FEF3C7" : "#EFF6FF" }]}>
                      <Shirt size={20} color={isPaid ? "#0D7A53" : isPendingAcc ? "#D97706" : "#2563EB"} />
                    </View>

                    <View style={styles.orderInfoCol}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.orderIdText}>{o.orderCode}</Text>
                        <View
                          style={[
                            styles.badgePill,
                            isPendingAcc && { backgroundColor: "#FEF3C7" },
                            isVerifyingTF && { backgroundColor: "#FEF3C7" },
                            !isWeighed && !isPendingAcc && { backgroundColor: "#FFF7ED" },
                            isPaid && { backgroundColor: "#DCFCE7" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePillText,
                              isPendingAcc && { color: "#D97706" },
                              isVerifyingTF && { color: "#B45309" },
                              !isWeighed && !isPendingAcc && { color: "#EA580C" },
                              isPaid && { color: "#166534" },
                            ]}
                          >
                            {isPendingAcc
                              ? "📥 Perlu ACC"
                              : isVerifyingTF
                              ? "🔍 Cek TF"
                              : !isWeighed
                              ? "⚖️ Timbang"
                              : isPaid
                              ? "✓ Lunas"
                              : "⏳ Bayar"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.orderCustomerName} numberOfLines={1}>
                        {o.customerName} • <Text style={styles.orderServiceText}>{o.serviceName}</Text>
                      </Text>
                    </View>

                    <View style={styles.orderAmountCol}>
                      <Text style={styles.orderAmountText}>
                        {isWeighed ? `Rp ${(o.totalAmount || 0).toLocaleString("id-ID")}` : "Menunggu Berat"}
                      </Text>
                    </View>
                  </View>

                  {/* 1-Click Quick Action if Pending Action */}
                  {isPendingAcc && (
                    <TouchableOpacity
                      style={styles.quickActionBtnAcc}
                      onPress={() => handleQuickAccOrder(o._id || o.id || "")}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={14} color="#FFFFFF" />
                      <Text style={styles.quickActionBtnAccText}>Terima & Cari Driver Jemput</Text>
                    </TouchableOpacity>
                  )}

                  {isVerifyingTF && (
                    <TouchableOpacity
                      style={styles.quickActionBtnVerify}
                      onPress={() => navigate("pemilik_laundry_order")}
                      activeOpacity={0.8}
                    >
                      <Eye size={14} color="#FFFFFF" />
                      <Text style={styles.quickActionBtnVerifyText}>Lihat Bukti Transfer Customer</Text>
                    </TouchableOpacity>
                  )}

                  {!isWeighed && !isPendingAcc && (
                    <TouchableOpacity
                      style={styles.quickActionBtnWeigh}
                      onPress={() => navigate("pemilik_laundry_order")}
                      activeOpacity={0.8}
                    >
                      <Scale size={14} color="#FFFFFF" />
                      <Text style={styles.quickActionBtnWeighText}>Timbang & Terbitkan Tagihan</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 5-Tab Navigation Footer Bar */}
      <SafeAreaBottomBar absolute style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Home size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_order")}
          activeOpacity={0.7}
        >
          <Package size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_user")}
          activeOpacity={0.7}
        >
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_pendapatan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_profil")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </SafeAreaBottomBar>

      {/* Modal Kelola Paket & Tarif Layanan */}
      <Modal visible={isServiceModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Kelola Layanan & Tarif Toko</Text>
                <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Tersinkronisasi otomatis & real-time ke aplikasi Customer
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsServiceModalOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Template Cepat Layanan */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 6 }}>
                  ✨ PILIH TEMPLATE CEPAT:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {SERVICE_PRESETS.map((preset, pIdx) => (
                    <TouchableOpacity
                      key={pIdx}
                      style={{
                        backgroundColor: "#E8F5EE",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#A7F3D0",
                      }}
                      onPress={() => handleApplyPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#0D7A53" }}>
                        + {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Form Tambah / Edit Layanan Baru */}
              <View style={styles.addServiceBox}>
                <Text style={styles.addServiceTitle}>+ Form Input Layanan & Tarif</Text>

                <TextInput
                  style={styles.inputField}
                  placeholder="Nama Paket (misal: Cuci Komplit / Setrika Saja)"
                  placeholderTextColor="#9CA3AF"
                  value={newServiceName}
                  onChangeText={setNewServiceName}
                />

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TextInput
                    style={[styles.inputField, { flex: 1 }]}
                    placeholder="Tarif (Rp)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={newServicePrice}
                    onChangeText={setNewServicePrice}
                  />

                  {/* Satuan selector */}
                  <TouchableOpacity
                    style={styles.unitSelectorBtn}
                    onPress={() => {
                      const nextUnit = newServiceUnit === "kg" ? "pcs" : "kg";
                      setNewServiceUnit(nextUnit);
                    }}
                  >
                    <Text style={styles.unitSelectorText}>Satuan: /{newServiceUnit}</Text>
                  </TouchableOpacity>
                </View>

                {/* Kategori Selector */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  {(["biasa", "ekspres", "satuan"] as const).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, newServiceCategory === cat && styles.catChipActive]}
                      onPress={() => setNewServiceCategory(cat)}
                    >
                      <Text style={[styles.catChipText, newServiceCategory === cat && styles.catChipTextActive]}>
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.btnAddServiceSubmit} onPress={handleAddService} activeOpacity={0.8}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.btnAddServiceSubmitText}>Tambahkan ke Daftar</Text>
                </TouchableOpacity>
              </View>

              {/* Daftar Layanan Saat Ini dengan Edit Harga Langsung */}
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginTop: 16, marginBottom: 8, letterSpacing: 0.5 }}>
                DAFTAR LAYANAN AKTIF TOKO ({servicesList.length})
              </Text>
              <View style={styles.serviceItemsList}>
                {servicesList.length === 0 ? (
                  <View style={{ padding: 16, backgroundColor: "#F1F5F9", borderRadius: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, color: "#94A3B8" }}>Belum ada layanan. Tambahkan layanan di atas.</Text>
                  </View>
                ) : (
                  servicesList.map((item, idx) => (
                    <View key={idx} style={styles.serviceItemRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.serviceItemName}>{item.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: "#64748B" }}>Rp</Text>
                          <TextInput
                            style={{
                              backgroundColor: "#F1F5F9",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: "800",
                              color: "#0D7A53",
                              minWidth: 60,
                            }}
                            keyboardType="numeric"
                            value={item.price.toString()}
                            onChangeText={(val) => handleUpdatePrice(idx, val)}
                          />
                          <Text style={{ fontSize: 11, color: "#64748B" }}>/{item.unit}</Text>
                          <View style={{ backgroundColor: item.category === "ekspres" ? "#FEF3C7" : "#E8F5EE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: item.category === "ekspres" ? "#D97706" : "#0D7A53", textTransform: "uppercase" }}>
                              {item.category || "biasa"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteService(idx)} style={styles.btnTrash}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnSaveAll} onPress={handleSaveServices} activeOpacity={0.85}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnSaveAllText}>Simpan & Tampilkan ke Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  storeStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  storeStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusDotPulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  storeStatusTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  storeStatusSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "600",
  },
  toggleWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
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
  cardHeaderDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  statsGridContainer: {},
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statTextGroup: {
    flex: 1,
  },
  statValNum: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  statValSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "600",
  },
  verticalDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 12,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  orderCardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  emptyFeedBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyFeedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
  },
  emptyFeedSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  orderItemCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  orderItemMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderInfoCol: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  orderCustomerName: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
    fontWeight: "700",
  },
  orderServiceText: {
    color: "#64748B",
    fontWeight: "500",
  },
  orderAmountCol: {
    alignItems: "flex-end",
  },
  orderAmountText: {
    fontSize: 13,
    color: "#0D7A53",
    fontWeight: "900",
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  quickActionBtnAcc: {
    marginTop: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionBtnAccText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  quickActionBtnVerify: {
    marginTop: 10,
    backgroundColor: "#D97706",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionBtnVerifyText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  quickActionBtnWeigh: {
    marginTop: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionBtnWeighText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  navTab: {
    alignItems: "center",
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "600",
  },
  navTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "85%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  addServiceBox: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  addServiceTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
    marginBottom: 10,
  },
  inputField: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  unitSelectorBtn: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  unitSelectorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  catChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  catChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  catChipTextActive: {
    color: "#FFFFFF",
  },
  btnAddServiceSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  btnAddServiceSubmitText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  serviceItemsList: {
    gap: 8,
  },
  serviceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  serviceItemName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  btnTrash: {
    padding: 6,
  },
  btnSaveAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnSaveAllText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
