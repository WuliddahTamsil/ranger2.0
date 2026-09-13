import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Shirt,
  Zap,
  Bike,
  Star,
  MapPin,
  Heart,
  ChevronRight,
  X,
  Sparkles,
  Clock,
  ReceiptText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Scale,
  Package,
  Check,
  Store,
  Navigation,
} from "lucide-react-native";
import {
  fetchLaundryStores,
  fetchCustomerLaundryOrders,
  LaundryStore,
  LaundryOrder,
  setSelectedStore,
  setActiveLaundryOrder,
  getActiveLaundryOrder,
  subscribeLaundry,
  FALLBACK_LAUNDRY_STORES,
} from "../../services/laundryService";

interface CustomerLaundryScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerLaundryScreen: React.FC<CustomerLaundryScreenProps> = ({ navigate, authAccount }) => {
  const [activeCategory, setActiveCategory] = useState<"semua" | "biasa" | "ekspres">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [stores, setStores] = useState<LaundryStore[]>(FALLBACK_LAUNDRY_STORES);
  const [loading, setLoading] = useState<boolean>(true);

  // Customer Orders State
  const [customerOrders, setCustomerOrders] = useState<LaundryOrder[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalTab, setOrderModalTab] = useState<"aktif" | "selesai">("aktif");
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  // Load stores
  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      setLoading(true);
      const data = await fetchLaundryStores(searchQuery);
      if (active) {
        setStores(data);
        setLoading(false);
      }
    };
    loadStores();
    return () => {
      active = false;
    };
  }, [searchQuery]);

  // Load and subscribe customer orders
  const loadOrders = async () => {
    setIsRefreshingOrders(true);
    const customerId = authAccount?.id || authAccount?.email || "cust_active";
    const data = await fetchCustomerLaundryOrders(customerId, authAccount?.phone);
    const activeSingleton = getActiveLaundryOrder();
    if (activeSingleton && !data.some((d) => (d._id || d.id || d.orderCode) === (activeSingleton._id || activeSingleton.id || activeSingleton.orderCode))) {
      data.unshift(activeSingleton);
    }
    setCustomerOrders(data);
    setIsRefreshingOrders(false);
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeLaundry(() => {
      loadOrders();
    });
    return unsub;
  }, [authAccount?.id, authAccount?.phone]);

  const activeOrders = useMemo(() => {
    return customerOrders.filter((o) => o.status !== "SELESAI" && o.status !== "DIBATALKAN");
  }, [customerOrders]);

  const completedOrders = useMemo(() => {
    return customerOrders.filter((o) => o.status === "SELESAI" || o.status === "DIBATALKAN");
  }, [customerOrders]);

  const filteredStores = stores.filter((store) => {
    if (activeCategory === "semua") return true;
    if (activeCategory === "ekspres") {
      return store.services?.some((s) => s.category === "ekspres") || store.storeName.toLowerCase().includes("express") || store.storeName.toLowerCase().includes("kilat");
    }
    if (activeCategory === "biasa") {
      return store.services?.some((s) => s.category === "biasa");
    }
    return true;
  });

  const handleSelectStore = (store: LaundryStore) => {
    setSelectedStore(store);
    navigate("c_laundry_detail");
  };

  const handleOpenTracking = (order: LaundryOrder) => {
    setActiveLaundryOrder(order);
    setIsOrderModalOpen(false);
    navigate("c_laundry_tracking");
  };

  const getMinPrice = (store: LaundryStore) => {
    if (!store.services || store.services.length === 0) return 5000;
    const prices = store.services.map((s) => s.price);
    return Math.min(...prices);
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "MENUNGGU_KONFIRMASI_MITRA":
        return {
          label: "Menunggu ACC Mitra",
          color: "#D97706",
          bg: "#FEF3C7",
          step: 1,
          phaseTitle: "Tahap 1: Konfirmasi Outlet",
          phaseDesc: "Menunggu pemilik outlet menyetujui pesanan Anda.",
        };
      case "MENUNGGU_DRIVER_JEMPUT":
        return {
          label: "Mencari Driver Penjemput",
          color: "#2563EB",
          bg: "#EFF6FF",
          step: 2,
          phaseTitle: "Tahap 2: Penjemputan Baju",
          phaseDesc: "Sistem sedang menghubungkan ke kurir terdekat untuk mengambil pakaian kotor.",
        };
      case "DRIVER_MENUJU_CUSTOMER":
        return {
          label: "Driver Menuju Alamat Anda",
          color: "#0284C7",
          bg: "#E0F2FE",
          step: 2,
          phaseTitle: "Tahap 2: Kurir Sedang Menuju Rumah",
          phaseDesc: "Siapkan pakaian kotor yang akan dihitung/dicuci.",
        };
      case "DRIVER_MENUJU_LAUNDRY":
        return {
          label: "Driver Membawa ke Toko",
          color: "#0891B2",
          bg: "#ECFEFF",
          step: 2,
          phaseTitle: "Tahap 2: Baju Sedang Diantar ke Toko",
          phaseDesc: "Kurir membawa cucian kotor ke outlet mitra laundry.",
        };
      case "TIBA_DI_LAUNDRY":
        return {
          label: "Tiba di Toko (Antre Timbang)",
          color: "#7C3AED",
          bg: "#F3E8FF",
          step: 3,
          phaseTitle: "Tahap 3: Penimbangan & Tagihan",
          phaseDesc: "Pakaian telah sampai di outlet dan sedang dalam proses timbang riil.",
        };
      case "MENUNGGU_PEMBAYARAN":
        return {
          label: "Tagihan Siap Dibayar",
          color: "#EA580C",
          bg: "#FFF7ED",
          step: 3,
          phaseTitle: "Tahap 3: Tagihan Non-Tunai Diterbitkan",
          phaseDesc: "Silakan bayar via QRIS / Transfer Bank toko agar proses cuci segera dikerjakan.",
        };
      case "MENUNGGU_VERIFIKASI_PEMBAYARAN":
        return {
          label: "Verifikasi Pembayaran",
          color: "#D97706",
          bg: "#FEF3C7",
          step: 3,
          phaseTitle: "Tahap 3: Mengecek Bukti Bayar",
          phaseDesc: "Pemilik laundry sedang memverifikasi bukti transfer pembayaran Anda.",
        };
      case "PEMBAYARAN_LUNAS":
      case "SEDANG_DICUCI":
        return {
          label: "Sedang Dicuci & Setrika",
          color: "#0D7A53",
          bg: "#DCFCE7",
          step: 4,
          phaseTitle: "Tahap 4: Proses Cuci Higienis",
          phaseDesc: "Pembayaran lunas! Pakaian sedang dicuci bersih, wangi, dan disetrika rapi.",
        };
      case "SIAP_DIANTAR":
        return {
          label: "Selesai Cuci (Cari Kurir)",
          color: "#2563EB",
          bg: "#EFF6FF",
          step: 5,
          phaseTitle: "Tahap 5: Siap Antar Balik",
          phaseDesc: "Cucian bersih sudah rapi & dipacking, mencari kurir untuk antar ke rumah.",
        };
      case "DRIVER_MENGANTAR_BALIK":
        return {
          label: "Driver Mengantar Baju Bersih",
          color: "#059669",
          bg: "#ECFDF5",
          step: 5,
          phaseTitle: "Tahap 5: Pengantaran Cucian Bersih",
          phaseDesc: "Kurir sedang dalam perjalanan mengantar cucian bersih ke rumah Anda.",
        };
      case "SELESAI":
        return {
          label: "Pesanan Selesai",
          color: "#0D7A53",
          bg: "#E6F7F0",
          step: 6,
          phaseTitle: "Tahap 6: Pesanan Selesai",
          phaseDesc: "Pakaian bersih telah diterima dengan baik. Terima kasih!",
        };
      default:
        return {
          label: "Diproses",
          color: "#6B7280",
          bg: "#F3F4F6",
          step: 1,
          phaseTitle: "Dalam Proses",
          phaseDesc: "Pesanan laundry Anda sedang ditangani mitra.",
        };
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Layanan Laundry</Text>
          <Text style={styles.headerSubTitle}>Pilihan mitra laundry terpercaya di sekitarmu</Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Riwayat & Live Tracking Button with notification badge */}
          <TouchableOpacity
            style={[styles.iconCircleBtn, activeOrders.length > 0 && styles.iconCircleBtnActive]}
            onPress={() => {
              setOrderModalTab(activeOrders.length > 0 ? "aktif" : "selesai");
              setIsOrderModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <ReceiptText size={19} color={activeOrders.length > 0 ? "#0D7A53" : "#374151"} />
            {activeOrders.length > 0 && (
              <View style={styles.activeBadgeCircle}>
                <Text style={styles.activeBadgeText}>{activeOrders.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari toko laundry atau jenis layanan..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {/* Semua */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "semua" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("semua")}
            activeOpacity={0.8}
          >
            <LayoutGrid size={15} color={activeCategory === "semua" ? "#FFFFFF" : "#0D7A53"} />
            <Text style={[styles.pillText, activeCategory === "semua" && styles.pillTextActive]}>
              Semua Mitra
            </Text>
          </TouchableOpacity>

          {/* Reguler / Biasa */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "biasa" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("biasa")}
            activeOpacity={0.8}
          >
            <Shirt size={15} color={activeCategory === "biasa" ? "#FFFFFF" : "#0284C7"} />
            <Text style={[styles.pillText, activeCategory === "biasa" && styles.pillTextActive]}>
              Reguler Kiloan
            </Text>
          </TouchableOpacity>

          {/* Ekspres */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "ekspres" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("ekspres")}
            activeOpacity={0.8}
          >
            <Zap size={15} color={activeCategory === "ekspres" ? "#FFFFFF" : "#EA580C"} />
            <Text style={[styles.pillText, activeCategory === "ekspres" && styles.pillTextActive]}>
              Ekspres Kilat
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Active Order Realtime Quick Tracking Card */}
        {activeOrders.length > 0 && (
          <TouchableOpacity
            style={styles.liveTrackingBannerCard}
            onPress={() => handleOpenTracking(activeOrders[0])}
            activeOpacity={0.88}
          >
            <View style={styles.liveTrackingTopRow}>
              <View style={styles.livePulseGroup}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseTitle}>Pesanan Laundry Sedang Berjalan</Text>
              </View>
              <View style={[styles.orderStatusPill, { backgroundColor: getStatusMeta(activeOrders[0].status).bg }]}>
                <Text style={[styles.orderStatusPillText, { color: getStatusMeta(activeOrders[0].status).color }]}>
                  {getStatusMeta(activeOrders[0].status).label}
                </Text>
              </View>
            </View>

            <View style={styles.liveOrderInfoRow}>
              <View style={styles.liveOrderIconBg}>
                <Shirt size={22} color="#0D7A53" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.liveStoreName}>{activeOrders[0].storeName}</Text>
                <Text style={styles.liveServiceName}>
                  {activeOrders[0].serviceName} • #{activeOrders[0].orderCode}
                </Text>
                {activeOrders[0].actualWeightOrQty ? (
                  <Text style={styles.liveWeightTag}>
                    ⚖️ Berat: {activeOrders[0].actualWeightOrQty} {activeOrders[0].unitType} • Total: Rp {(activeOrders[0].totalAmount || 0).toLocaleString("id-ID")}
                  </Text>
                ) : (
                  <Text style={styles.liveWeightTagPending}>
                    ⏳ Menunggu proses timbangan oleh outlet laundry
                  </Text>
                )}
              </View>
              <View style={styles.liveTrackActionBtn}>
                <Text style={styles.liveTrackActionText}>Lacak</Text>
                <ChevronRight size={16} color="#0D7A53" />
              </View>
            </View>

            {/* Stepper Dots Bar */}
            <View style={styles.liveStepProgressRow}>
              {[1, 2, 3, 4, 5, 6].map((stepNum) => {
                const currentStep = getStatusMeta(activeOrders[0].status).step;
                const isPassed = stepNum <= currentStep;
                return (
                  <View key={stepNum} style={styles.stepTrackWrapper}>
                    <View style={[styles.stepDot, isPassed && styles.stepDotActive]} />
                    {stepNum < 6 && (
                      <View style={[styles.stepLine, stepNum < currentStep && styles.stepLineActive]} />
                    )}
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        )}

        {/* Promo Banner */}
        {isBannerVisible && (
          <View style={styles.promoBanner}>
            <View style={styles.promoLeft}>
              <View style={styles.promoBadge}>
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.promoBadgeText}>GRATIS ONGKIR</Text>
              </View>
              <Text style={styles.promoText}>Driver siap angkut pakaian Anda langsung ke mitra laundry pilihan!</Text>
            </View>
            <View style={styles.promoRight}>
              <Bike size={24} color="#0D7A53" />
              <TouchableOpacity
                onPress={() => setIsBannerVisible(false)}
                activeOpacity={0.7}
                style={{ marginLeft: 8 }}
              >
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={{ marginTop: 10, color: "#6B7280", fontSize: 13 }}>Memuat daftar toko laundry...</Text>
          </View>
        ) : filteredStores.length === 0 ? (
          <View style={{ paddingVertical: 50, alignItems: "center" }}>
            <Shirt size={48} color="#D1D5DB" />
            <Text style={{ marginTop: 12, fontWeight: "700", color: "#374151" }}>Toko laundry tidak ditemukan</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 4 }}>
              Coba cari dengan kata kunci lain.
            </Text>
          </View>
        ) : (
          /* Laundry Cards List */
          <View style={styles.cardsList}>
            {filteredStores.map((item) => {
              const minPrice = getMinPrice(item);
              const isExpress = item.services?.some((s) => s.category === "ekspres");
              return (
                <TouchableOpacity
                  key={item.id || item._id}
                  style={styles.laundryCard}
                  onPress={() => handleSelectStore(item)}
                  activeOpacity={0.9}
                >
                  {/* Image Column */}
                  <View style={styles.cardImageCol}>
                    <Image
                      source={{ uri: item.imageUrl || "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80" }}
                      style={styles.cardImg}
                    />

                    {/* Type Badge */}
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: isExpress ? "#FF6500" : "#0284C7" },
                      ]}
                    >
                      {isExpress ? <Zap size={11} color="#FFFFFF" /> : <Shirt size={11} color="#FFFFFF" />}
                      <Text style={styles.typeBadgeText}>{isExpress ? "EKSPRES" : "REGULER"}</Text>
                    </View>

                    {/* Operating Hours Overlay */}
                    <View style={styles.hoursOverlay}>
                      <Text style={styles.hoursOverlayText}>{item.openingHours || "Buka • Tutup 21.00"}</Text>
                    </View>
                  </View>

                  {/* Info Content Column */}
                  <View style={styles.cardContentCol}>
                    {/* Title & Heart */}
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {item.storeName}
                      </Text>
                      <TouchableOpacity activeOpacity={0.7} style={{ padding: 2 }}>
                        <Heart size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    {/* Rating & Distance */}
                    <View style={styles.ratingRow}>
                      <Star size={13} color="#FBBF24" fill="#FBBF24" />
                      <Text style={styles.ratingText}>{item.rating || 4.9}</Text>
                      <Text style={styles.reviewsCountText}>({item.totalReviews || 10})</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <MapPin size={11} color="#6B7280" />
                      <Text style={styles.distanceText}>{item.distanceText || "0.5 km"}</Text>
                    </View>

                    {/* Service Badges */}
                    <View style={styles.badgesRow}>
                      {(item.badges && item.badges.length > 0 ? item.badges : ["Antar Jemput", "Garansi Bersih"]).slice(0, 2).map((b, idx) => (
                        <View key={idx} style={styles.badgePill}>
                          <Text style={styles.badgeText}>{b}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Price & Select Button */}
                    <View style={styles.cardFooterRow}>
                      <View>
                        <Text style={styles.priceLabel}>Mulai dari</Text>
                        <Text style={styles.priceValue}>Rp {minPrice.toLocaleString("id-ID")} <Text style={styles.priceUnit}>/kg</Text></Text>
                      </View>

                      <View style={styles.selectBtnPill}>
                        <Text style={styles.selectBtnText}>Pilih</Text>
                        <ChevronRight size={13} color="#0D7A53" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL: Riwayat & Live Tracking Pesanan Laundry Customer */}
      <Modal visible={isOrderModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalCard}>
            {/* Modal Drag Handle */}
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBg}>
                  <ReceiptText size={20} color="#0D7A53" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Pesanan Laundry Saya</Text>
                  <Text style={styles.modalSubtitle}>Pantau status cucian & rincian pesanan</Text>
                </View>
              </View>

              <View style={styles.modalHeaderRight}>
                <TouchableOpacity
                  style={styles.btnModalRefresh}
                  onPress={loadOrders}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={15} color={isRefreshingOrders ? "#0D7A53" : "#6B7280"} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnModalClose}
                  onPress={() => setIsOrderModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Sub Tabs (Aktif vs Selesai) */}
            <View style={styles.modalTabBar}>
              <TouchableOpacity
                style={[styles.modalTabBtn, orderModalTab === "aktif" && styles.modalTabBtnActive]}
                onPress={() => setOrderModalTab("aktif")}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalTabBtnText, orderModalTab === "aktif" && styles.modalTabBtnTextActive]}>
                  Sedang Berjalan ({activeOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, orderModalTab === "selesai" && styles.modalTabBtnActive]}
                onPress={() => setOrderModalTab("selesai")}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalTabBtnText, orderModalTab === "selesai" && styles.modalTabBtnTextActive]}>
                  Riwayat Selesai ({completedOrders.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Scroll List Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalListContent}>
              {orderModalTab === "aktif" ? (
                activeOrders.length === 0 ? (
                  <View style={styles.modalEmptyState}>
                    <Shirt size={44} color="#D1D5DB" />
                    <Text style={styles.modalEmptyTitle}>Tidak ada pesanan laundry aktif</Text>
                    <Text style={styles.modalEmptySub}>
                      Pilih toko laundry dan pesan layanan untuk menikmati penjemputan & pengantaran pakaian higienis.
                    </Text>
                  </View>
                ) : (
                  activeOrders.map((ord, idx) => {
                    const statusMeta = getStatusMeta(ord.status);
                    const isAwaitingPayment = ord.status === "MENUNGGU_PEMBAYARAN";
                    const isWeighed = Boolean(ord.actualWeightOrQty);

                    return (
                      <View key={ord._id || ord.id || ord.orderCode || idx} style={styles.orderHistoryItemCard}>
                        {/* 1. Card Top Bar: Order ID & Status Pill */}
                        <View style={styles.historyCardTopRow}>
                          <View style={styles.orderIdBadgePill}>
                            <Text style={styles.orderIdBadgeText}>#{ord.orderCode}</Text>
                          </View>

                          <View style={[styles.statusPillBadge, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.statusPillBadgeText, { color: statusMeta.color }]}>
                              {statusMeta.label}
                            </Text>
                          </View>
                        </View>

                        {/* 2. Store Name Header */}
                        <View style={styles.historyStoreHeaderRow}>
                          <Store size={15} color="#0D7A53" />
                          <Text style={styles.historyStoreNameText} numberOfLines={1}>
                            {ord.storeName}
                          </Text>
                        </View>

                        {/* 3. Service Detail & Price Box */}
                        <View style={styles.historyServiceDetailBox}>
                          <View style={styles.serviceIconCircle}>
                            <Shirt size={18} color="#0D7A53" />
                          </View>

                          <View style={styles.serviceMainInfoCol}>
                            <Text style={styles.historyServiceName}>{ord.serviceName}</Text>
                            <Text style={styles.historyAddressText} numberOfLines={1}>
                              📍 {ord.pickupAddress || "Alamat Kamojang"}
                            </Text>

                            {isWeighed ? (
                              <Text style={styles.historyWeightText}>
                                ⚖️ Berat: <Text style={{ fontWeight: "800", color: "#0D7A53" }}>{ord.actualWeightOrQty} {ord.unitType}</Text>
                              </Text>
                            ) : (
                              <Text style={styles.historyWeightPendingText}>
                                ⏳ Menunggu timbangan outlet
                              </Text>
                            )}
                          </View>

                          <View style={styles.servicePriceCol}>
                            <Text style={styles.historyCostLabel}>Total Tagihan</Text>
                            <Text style={styles.historyCostVal}>
                              {ord.totalAmount ? `Rp ${ord.totalAmount.toLocaleString("id-ID")}` : "Menunggu Timbang"}
                            </Text>
                          </View>
                        </View>

                        {/* 4. Real-Time Tracking Stepper & Status Banner */}
                        <View style={styles.stepperContainerCard}>
                          {/* Phase Header Banner */}
                          <View style={styles.phaseHeaderRow}>
                            <Text style={styles.phaseTitleText}>{statusMeta.phaseTitle}</Text>
                            <Text style={styles.phaseStepNumberText}>Tahap {statusMeta.step} dari 6</Text>
                          </View>

                          <Text style={styles.phaseDescText}>{statusMeta.phaseDesc}</Text>

                          {/* 6-Node Horizontal Visual Timeline */}
                          <View style={styles.stepperNodesRow}>
                            {[1, 2, 3, 4, 5, 6].map((stepNumber, sIdx) => {
                              const isCompleted = stepNumber < statusMeta.step;
                              const isCurrent = stepNumber === statusMeta.step;

                              return (
                                <View key={stepNumber} style={styles.stepNodeItem}>
                                  <View
                                    style={[
                                      styles.stepNodeCircle,
                                      isCompleted && styles.stepNodeCircleCompleted,
                                      isCurrent && styles.stepNodeCircleCurrent,
                                    ]}
                                  >
                                    {isCompleted ? (
                                      <Check size={11} color="#FFFFFF" />
                                    ) : (
                                      <Text style={[styles.stepNodeText, isCurrent && styles.stepNodeTextCurrent]}>
                                        {stepNumber}
                                      </Text>
                                    )}
                                  </View>

                                  {sIdx < 5 && (
                                    <View
                                      style={[
                                        styles.stepNodeConnector,
                                        stepNumber < statusMeta.step && styles.stepNodeConnectorActive,
                                      ]}
                                    />
                                  )}
                                </View>
                              );
                            })}
                          </View>

                          {/* Micro labels below nodes */}
                          <View style={styles.stepperLabelsRow}>
                            <Text style={[styles.microStepLabel, statusMeta.step === 1 && styles.microStepLabelActive]}>ACC</Text>
                            <Text style={[styles.microStepLabel, statusMeta.step === 2 && styles.microStepLabelActive]}>Jemput</Text>
                            <Text style={[styles.microStepLabel, statusMeta.step === 3 && styles.microStepLabelActive]}>Timbang/Bayar</Text>
                            <Text style={[styles.microStepLabel, statusMeta.step === 4 && styles.microStepLabelActive]}>Cuci</Text>
                            <Text style={[styles.microStepLabel, statusMeta.step === 5 && styles.microStepLabelActive]}>Antar</Text>
                            <Text style={[styles.microStepLabel, statusMeta.step === 6 && styles.microStepLabelActive]}>Selesai</Text>
                          </View>

                          {/* Driver assigned info card */}
                          {(ord.driverPickupName || ord.driverDeliveryName) && (
                            <View style={styles.driverAssignedCard}>
                              <View style={styles.driverAvatarCircle}>
                                <Bike size={13} color="#0D7A53" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.driverAssignedLabel}>Kurir Ditugaskan:</Text>
                                <Text style={styles.driverAssignedName}>{ord.driverPickupName || ord.driverDeliveryName}</Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* 5. Action Buttons (Stacked & Full Width for Clean Visuals) */}
                        <View style={styles.cardActionButtonsStack}>
                          {isAwaitingPayment && (
                            <TouchableOpacity
                              style={styles.btnPayNowHighlight}
                              onPress={() => handleOpenTracking(ord)}
                              activeOpacity={0.85}
                            >
                              <CreditCard size={16} color="#FFFFFF" />
                              <Text style={styles.btnPayNowHighlightText}>💳 Bayar Tagihan Sekarang (QRIS / Transfer)</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.btnOpenLiveTrackingPrimary}
                            onPress={() => handleOpenTracking(ord)}
                            activeOpacity={0.85}
                          >
                            <Navigation size={15} color="#FFFFFF" />
                            <Text style={styles.btnOpenLiveTrackingPrimaryText}>Buka Live Tracking Peta & Detail</Text>
                            <ChevronRight size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )
              ) : (
                /* Completed Orders */
                completedOrders.length === 0 ? (
                  <View style={styles.modalEmptyState}>
                    <CheckCircle2 size={44} color="#D1D5DB" />
                    <Text style={styles.modalEmptyTitle}>Belum ada riwayat pesanan selesai</Text>
                    <Text style={styles.modalEmptySub}>
                      Pesanan yang telah selesai diantar dan diterima akan masuk ke daftar ini.
                    </Text>
                  </View>
                ) : (
                  completedOrders.map((ord, idx) => (
                    <View key={ord._id || ord.id || ord.orderCode || idx} style={styles.orderHistoryItemCard}>
                      <View style={styles.historyCardTopRow}>
                        <View style={[styles.orderIdBadgePill, { backgroundColor: "#E6F7F0" }]}>
                          <Text style={[styles.orderIdBadgeText, { color: "#0D7A53" }]}>#{ord.orderCode}</Text>
                        </View>

                        <View style={[styles.statusPillBadge, { backgroundColor: "#DCFCE7" }]}>
                          <Text style={[styles.statusPillBadgeText, { color: "#0D7A53" }]}>
                            Selesai & Lunas
                          </Text>
                        </View>
                      </View>

                      <View style={styles.historyStoreHeaderRow}>
                        <Store size={15} color="#0D7A53" />
                        <Text style={styles.historyStoreNameText} numberOfLines={1}>
                          {ord.storeName}
                        </Text>
                      </View>

                      <View style={styles.historyServiceDetailBox}>
                        <View style={[styles.serviceIconCircle, { backgroundColor: "#E6F7F0" }]}>
                          <CheckCircle2 size={18} color="#0D7A53" />
                        </View>
                        <View style={styles.serviceMainInfoCol}>
                          <Text style={styles.historyServiceName}>{ord.serviceName}</Text>
                          <Text style={styles.historyAddressText}>
                            {ord.actualWeightOrQty ? `${ord.actualWeightOrQty} ${ord.unitType}` : "Pakaian Bersih"} • {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString("id-ID") : "Hari ini"}
                          </Text>
                        </View>
                        <View style={styles.servicePriceCol}>
                          <Text style={styles.historyCostLabel}>Total Bayar</Text>
                          <Text style={[styles.historyCostVal, { color: "#0D7A53" }]}>
                            Rp {(ord.totalAmount || 0).toLocaleString("id-ID")}
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <TouchableOpacity
                          style={styles.btnReorder}
                          onPress={() => {
                            setIsOrderModalOpen(false);
                            const storeTarget = stores.find((s) => (s._id || s.id) === (ord.storeId || ord.ownerId));
                            if (storeTarget) {
                              handleSelectStore(storeTarget);
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.btnReorderText}>Pesan Lagi di Toko Ini</Text>
                          <ChevronRight size={14} color="#0D7A53" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubTitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  headerRightActions: {
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
    position: "relative",
  },
  iconCircleBtnActive: {
    backgroundColor: "#E6F7F0",
    borderWidth: 1.5,
    borderColor: "#0D7A53",
  },
  activeBadgeCircle: {
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
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  activeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  filterPillsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },

  // Interactive Live Tracking Card (Banner on Main Screen)
  liveTrackingBannerCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    elevation: 3,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  liveTrackingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  livePulseGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  livePulseTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  liveOrderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveOrderIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  liveStoreName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  liveServiceName: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 1,
  },
  liveWeightTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
    marginTop: 3,
  },
  liveWeightTagPending: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
    marginTop: 3,
  },
  liveTrackActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#E6F7F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  liveTrackActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  liveStepProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  stepTrackWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
  },
  stepDotActive: {
    backgroundColor: "#0D7A53",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#0D7A53",
  },

  // Promo Banner
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E6F7F0",
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  promoLeft: {
    flex: 1,
  },
  promoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  promoText: {
    fontSize: 11,
    color: "#064E3B",
    fontWeight: "600",
  },
  promoRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  // Store Cards List
  cardsList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  laundryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardImageCol: {
    width: 110,
    height: 140,
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  hoursOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 3,
    alignItems: "center",
  },
  hoursOverlayText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
  cardContentCol: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  merchantName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  reviewsCountText: {
    fontSize: 11,
    color: "#6B7280",
  },
  dotSeparator: {
    color: "#D1D5DB",
    marginHorizontal: 2,
  },
  distanceText: {
    fontSize: 11,
    color: "#6B7280",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  badgePill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  selectBtnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#E6F7F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  selectBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },

  // ================= MODAL STYLES (NEAT & PREMIUM) =================
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  historyModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "70%",
    paddingTop: 8,
  },
  modalDragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalHeaderIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  modalHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnModalRefresh: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  btnModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTabBar: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 3,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 11,
  },
  modalTabBtnActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  modalTabBtnTextActive: {
    color: "#0D7A53",
    fontWeight: "900",
  },
  modalListContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  modalEmptyState: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    marginTop: 12,
  },
  modalEmptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },

  // Refined Order History Card
  orderHistoryItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  historyCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderIdBadgePill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderIdBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },
  statusPillBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  historyStoreHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  historyStoreNameText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  // Service details box
  historyServiceDetailBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceMainInfoCol: {
    flex: 1,
  },
  historyServiceName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  historyAddressText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  historyWeightText: {
    fontSize: 11,
    color: "#374151",
    marginTop: 2,
  },
  historyWeightPendingText: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
    marginTop: 2,
  },
  servicePriceCol: {
    alignItems: "flex-end",
    paddingLeft: 4,
  },
  historyCostLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  historyCostVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 2,
  },

  // Real-Time Stepper Container
  stepperContainerCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  phaseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  phaseTitleText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0D7A53",
  },
  phaseStepNumberText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  phaseDescText: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
    marginBottom: 12,
  },
  stepperNodesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepNodeItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  stepNodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stepNodeCircleCompleted: {
    backgroundColor: "#0D7A53",
  },
  stepNodeCircleCurrent: {
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#DCFCE7",
  },
  stepNodeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
  },
  stepNodeTextCurrent: {
    color: "#FFFFFF",
  },
  stepNodeConnector: {
    position: "absolute",
    top: 10,
    left: "50%",
    width: "100%",
    height: 2.5,
    backgroundColor: "#E5E7EB",
    zIndex: 1,
  },
  stepNodeConnectorActive: {
    backgroundColor: "#0D7A53",
  },
  stepperLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  microStepLabel: {
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
    flex: 1,
  },
  microStepLabelActive: {
    color: "#0D7A53",
    fontWeight: "900",
  },
  driverAssignedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  driverAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAssignedLabel: {
    fontSize: 9,
    color: "#6B7280",
  },
  driverAssignedName: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },

  // Action Buttons Stack
  cardActionButtonsStack: {
    marginTop: 12,
    gap: 8,
  },
  btnPayNowHighlight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EA580C",
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnPayNowHighlightText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnOpenLiveTrackingPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingVertical: 11,
    borderRadius: 14,
  },
  btnOpenLiveTrackingPrimaryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnReorder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E6F7F0",
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnReorderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
});
