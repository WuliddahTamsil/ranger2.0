import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Image,
  Platform,
  Linking,
} from "react-native";
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Search,
  X,
  FileText,
  User,
  MapPin,
  Boxes,
  Check,
  ArrowLeft,
  Phone,
  MessageCircle,
  Truck,
  CreditCard,
  ShieldCheck,
  Info,
  Bike,
} from "lucide-react-native";
import { rp, normalizeImageUrl } from "../../utils/formatters";
import { getApiUrl, getStoredAuthToken } from "../../services/api";
import { AuthAccount } from "../auth/authTypes";

interface ShopOrderTabProps {
  authAccount?: AuthAccount | null;
  onNavigateToCatalog?: () => void;
}

export const ShopOrderTab: React.FC<ShopOrderTabProps> = ({
  authAccount,
  onNavigateToCatalog,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "NEW" | "PREPARING" | "READY" | "PRESCRIPTION" | "COMPLETED"
  >("NEW");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Order for Full Page View
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Substitution Modal
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [selectedOrderForSub, setSelectedOrderForSub] = useState<any | null>(null);
  const [outOfStockItem, setOutOfStockItem] = useState<any | null>(null);
  const [replacementName, setReplacementName] = useState("");
  const [submittingSub, setSubmittingSub] = useState(false);

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "WAITING_STORE_CONFIRMATION":
      case "WAITING_MERCHANT_CONFIRMATION":
      case "STORE_PENDING":
      case "CREATED":
      case "PAID":
      case "PENDING":
        return {
          label: "Pesanan Masuk",
          badgeText: "MENUNGGU KONFIRMASI",
          color: "#D97706",
          bgColor: "#FEF3C7",
          stepIndex: 0,
          stepTitle: "Pesanan Baru Masuk",
          stepDesc: "Pelanggan telah membuat pesanan dan menunggu konfirmasi tokomu. Silakan periksa barang belanjaan dan segera terima pesanan.",
        };
      case "STORE_ACCEPTED":
        return {
          label: "Diterima Toko",
          badgeText: "PESANAN DITERIMA",
          color: "#2563EB",
          bgColor: "#DBEAFE",
          stepIndex: 1,
          stepTitle: "Pesanan Berhasil Diterima",
          stepDesc: "Pesanan sudah kamu terima. Langkah berikutnya adalah mengambil barang dari etalase dan mulai menyiapkan kemasan.",
        };
      case "PREPARING":
      case "PICKING":
        return {
          label: "Sedang Disiapkan",
          badgeText: "SEDANG DIKEMAS",
          color: "#059669",
          bgColor: "#D1FAE5",
          stepIndex: 1,
          stepTitle: "Barang Sedang Disiapkan & Dikemas",
          stepDesc: "Staf toko sedang mengumpulkan barang pesanan. Jika ada stok yang habis, kamu bisa mengajukan produk pengganti via tombol Ganti Stok.",
        };
      case "WAITING_SUBSTITUTION":
        return {
          label: "Menunggu Substitusi",
          badgeText: "SUBSTITUSI DIAJUKAN",
          color: "#D97706",
          bgColor: "#FEF3C7",
          stepIndex: 1,
          stepTitle: "Menunggu Respon Pelanggan",
          stepDesc: "Usulan barang pengganti telah dikirimkan ke pelanggan. Menunggu pelanggan menyetujui produk pengganti.",
        };
      case "READY_FOR_PICKUP":
        return {
          label: "Siap Kirim",
          badgeText: "SIAP DIJEMPUT KURIR",
          color: "#0D7A53",
          bgColor: "#E8F5EE",
          stepIndex: 2,
          stepTitle: "Paket Siap di Kasir",
          stepDesc: "Semua barang telah dikemas rapi dan siap di kasir. Sistem GEOVERSE sedang mencarikan kurir terdekat untuk menjemput.",
        };
      case "DRIVER_ASSIGNED":
      case "DRIVER_HEADING_TO_STORE":
      case "DRIVER_ON_THE_WAY_TO_STORE":
      case "DRIVER_AT_STORE":
        return {
          label: "Kurir Menuju / Tiba",
          badgeText: "KURIR DITUGASKAN",
          color: "#7C3AED",
          bgColor: "#EDE9FE",
          stepIndex: 3,
          stepTitle: "Kurir Menjemput Paket",
          stepDesc: "Kurir telah ditugaskan dan sedang menuju/tiba di tokomu. Serahkan paket dan pastikan nomor pesanan cocok.",
        };
      case "PICKED_UP":
      case "DELIVERING":
      case "ARRIVED":
        return {
          label: "Dalam Pengantaran",
          badgeText: "SEDANG DIANTAR",
          color: "#0284C7",
          bgColor: "#E0F2FE",
          stepIndex: 3,
          stepTitle: "Kurir Mengantar ke Pelanggan",
          stepDesc: "Kurir sedang dalam perjalanan menuju alamat pelanggan. Kamu dapat menghubungi kurir atau pelanggan jika ada kendala.",
        };
      case "COMPLETED":
        return {
          label: "Pesanan Selesai",
          badgeText: "SELESAI",
          color: "#15803D",
          bgColor: "#DCFCE7",
          stepIndex: 4,
          stepTitle: "Pesanan Telah Selesai",
          stepDesc: "Barang belanjaan telah berhasil diserahkan ke pelanggan dengan aman. Transaksi selesai dan dana masuk ke saldo.",
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          badgeText: "DIBATALKAN",
          color: "#DC2626",
          bgColor: "#FEE2E2",
          stepIndex: -1,
          stepTitle: "Pesanan Dibatalkan",
          stepDesc: "Pesanan telah dibatalkan. Stok barang yang sebelumnya dipesan telah dikembalikan ke tokomu secara otomatis.",
        };
      default:
        return {
          label: status,
          badgeText: status,
          color: "#64748B",
          bgColor: "#F1F5F9",
          stepIndex: 0,
          stepTitle: "Status Pesanan",
          stepDesc: "Pesanan sedang dalam proses penanganan sistem.",
        };
    }
  };

  const handleOpenWhatsApp = (phone: string, customerName = "") => {
    if (!phone) {
      Alert.alert("Informasi", "Nomor telepon belum terdaftar.");
      return;
    }
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    const orderCode = selectedOrder?.orderCode || selectedOrder?._id?.slice(-8).toUpperCase() || "";
    const storeName = selectedOrder?.storeName || "Kanyaah Shop";
    const msg = `Halo ${customerName || "Kak"}, saya dari toko ${storeName} perihal pesanan #${orderCode}.`;
    Linking.openURL(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert("Gagal", "Tidak dapat membuka aplikasi WhatsApp");
    });
  };

  const handleCallPhone = (phone: string) => {
    if (!phone) {
      Alert.alert("Informasi", "Nomor telepon belum terdaftar.");
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`).catch(() => {
      Alert.alert("Gagal", "Tidak dapat melakukan panggilan telepon");
    });
  };

  const getHeaders = async () => {
    const token = await getStoredAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadMerchantData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const headers = await getHeaders();
      const [orderRes, rxRes] = await Promise.all([
        fetch(getApiUrl("/shop/merchant/orders"), { headers }).then((r) => r.json()),
        fetch(getApiUrl("/shop/pharmacy/prescriptions"), { headers })
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
      ]);

      if (orderRes.success && orderRes.data) {
        setOrders(orderRes.data);
      }
      if (rxRes.success && rxRes.data) {
        setPrescriptions(rxRes.data);
      }
    } catch (e) {
      console.warn("loadMerchantData error:", e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMerchantData(false);
    const interval = setInterval(() => {
      loadMerchantData(true);
    }, 5000); // Live poll merchant orders every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      const fresh = orders.find((o) => o._id === selectedOrder._id);
      if (fresh) setSelectedOrder(fresh);
    }
  }, [orders]);

  const handleRejectOrder = (orderId: string) => {
    Alert.alert(
      "Tolak Pesanan",
      "Apakah Anda yakin ingin menolak pesanan ini? Stok produk akan dikembalikan ke etalase toko.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak Pesanan",
          style: "destructive",
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const res = await fetch(getApiUrl(`/shop/orders/${orderId}/cancel`), {
                method: "POST",
                headers,
                body: JSON.stringify({ reason: "Toko menolak pesanan (stok kosong / gerai sibuk)" }),
              }).then((r) => r.json());

              if (res.success) {
                Alert.alert("Pesanan Dibatalkan", "Pesanan telah berhasil ditolak.");
                loadMerchantData();
              } else {
                Alert.alert("Gagal", res.message || "Gagal membatalkan pesanan");
              }
            } catch (e: any) {
              Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
            }
          },
        },
      ]
    );
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(getApiUrl(`/shop/orders/${orderId}/accept`), {
        method: "POST",
        headers,
      }).then((r) => r.json());

      if (res.success) {
        Alert.alert("Berhasil", "Pesanan telah diterima.");
        loadMerchantData();
      } else {
        Alert.alert("Gagal", res.message || "Gagal menerima pesanan");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string, note = "") => {
    try {
      const headers = await getHeaders();
      const res = await fetch(getApiUrl(`/shop/orders/${orderId}/status`), {
        method: "PUT",
        headers,
        body: JSON.stringify({ status, note }),
      }).then((r) => r.json());

      if (res.success) {
        Alert.alert("Status Diperbarui", `Pesanan diubah menjadi ${status}.`);
        if (res.data) {
          setSelectedOrder(res.data);
        }
        loadMerchantData(true);
      } else {
        Alert.alert("Gagal", res.message || "Gagal memperbarui status");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    }
  };

  const handleOpenSubstitutionModal = (order: any, item: any) => {
    setSelectedOrderForSub(order);
    setOutOfStockItem(item);
    setReplacementName("");
    setSubModalVisible(true);
  };

  const handleSubmitSubstitution = async () => {
    if (!selectedOrderForSub || !outOfStockItem || !replacementName.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan nama produk pengganti.");
      return;
    }

    try {
      setSubmittingSub(true);
      const headers = await getHeaders();
      const res = await fetch(getApiUrl(`/shop/orders/${selectedOrderForSub._id}/substitution`), {
        method: "POST",
        headers,
        body: JSON.stringify({
          outOfStockProductId: outOfStockItem.productId,
          replacementProductName: replacementName.trim(),
        }),
      }).then((r) => r.json());

      if (res.success) {
        Alert.alert("Terkirim", "Pengajuan produk pengganti telah dikirim ke pelanggan.");
        setSubModalVisible(false);
        loadMerchantData();
      } else {
        Alert.alert("Gagal", res.message || "Gagal mengajukan substitusi");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleVerifyPrescription = async (prescriptionId: string, approve: boolean) => {
    try {
      const headers = await getHeaders();
      const endpoint = approve
        ? `/shop/prescriptions/${prescriptionId}/approve`
        : `/shop/prescriptions/${prescriptionId}/reject`;

      const res = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers,
        body: JSON.stringify({
          pharmacistNotes: approve
            ? "Resep terverifikasi sesuai aturan"
            : "Ditolak karena tidak memenuhi syarat",
        }),
      }).then((r) => r.json());

      if (res.success) {
        Alert.alert(approve ? "Resep Disetujui" : "Resep Ditolak", "Status resep telah diperbarui.");
        loadMerchantData();
      } else {
        Alert.alert("Gagal", res.message || "Gagal memproses resep");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server");
    }
  };

  // Filter orders
  const newOrders = orders.filter(
    (o) =>
      o.orderStatus === "PENDING" ||
      o.orderStatus === "PAID" ||
      o.orderStatus === "WAITING_STORE_CONFIRMATION" ||
      o.orderStatus === "WAITING_MERCHANT_CONFIRMATION" ||
      o.orderStatus === "STORE_PENDING" ||
      o.orderStatus === "CREATED"
  );
  const preparingOrders = orders.filter(
    (o) =>
      o.orderStatus === "STORE_ACCEPTED" ||
      o.orderStatus === "PREPARING" ||
      o.orderStatus === "PICKING" ||
      o.orderStatus === "WAITING_SUBSTITUTION"
  );
  const readyOrders = orders.filter(
    (o) =>
      o.orderStatus === "READY_FOR_PICKUP" ||
      o.orderStatus === "DRIVER_ASSIGNED" ||
      o.orderStatus === "DRIVER_HEADING_TO_STORE" ||
      o.orderStatus === "DRIVER_ON_THE_WAY_TO_STORE" ||
      o.orderStatus === "DRIVER_AT_STORE" ||
      o.orderStatus === "PICKED_UP" ||
      o.orderStatus === "DELIVERING" ||
      o.orderStatus === "ARRIVED" ||
      o.orderStatus === "ON_DELIVERY"
  );
  const completedOrders = orders.filter(
    (o) => o.orderStatus === "COMPLETED" || o.orderStatus === "DELIVERED"
  );

  let currentList: any[] = [];
  if (activeTab === "NEW") currentList = newOrders;
  else if (activeTab === "PREPARING") currentList = preparingOrders;
  else if (activeTab === "READY") currentList = readyOrders;
  else if (activeTab === "COMPLETED") currentList = completedOrders;
  else if (activeTab === "PRESCRIPTION") currentList = prescriptions;

  const renderFullPageOrderDetail = () => {
    if (!selectedOrder) return null;
    const meta = getStatusMeta(selectedOrder.orderStatus);
    const items = selectedOrder.items || [];
    const statusHistory = selectedOrder.statusHistory || [];
    const customerPhone = selectedOrder.customerPhone || selectedOrder.customerId?.phone || "";
    const driverPhone = selectedOrder.driverPhone || selectedOrder.driverId?.phone || "";

    const STEPS = [
      { label: "Masuk", icon: Package },
      { label: "Disiapkan", icon: Boxes },
      { label: "Siap Kirim", icon: CheckCircle2 },
      { label: "Pengantaran", icon: Truck },
      { label: "Selesai", icon: Check },
    ];

    return (
      <View style={styles.fullPageContainer}>
        {/* Sticky Header */}
        <View style={styles.fullPageHeader}>
          <TouchableOpacity
            style={styles.fullPageBackBtn}
            onPress={() => setSelectedOrder(null)}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#0F172A" />
            <Text style={styles.fullPageBackText}>Daftar Order</Text>
          </TouchableOpacity>

          <View style={styles.fullPageHeaderRight}>
            <Text style={styles.fullPageOrderCode}>
              #{selectedOrder.orderCode || selectedOrder._id.slice(-8).toUpperCase()}
            </Text>
            <TouchableOpacity
              style={styles.fullPageRefreshBtn}
              onPress={() => void loadMerchantData()}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color="#0D7A53" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.fullPageScroll}
          contentContainerStyle={styles.fullPageScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Status Hero Card with Stepper */}
          <View style={[styles.statusHeroCard, { borderColor: meta.bgColor }]}>
            <View style={styles.statusHeroTopRow}>
              <View style={[styles.statusHeroIconBg, { backgroundColor: meta.bgColor }]}>
                {selectedOrder.orderStatus === "COMPLETED" ? (
                  <CheckCircle2 size={24} color={meta.color} />
                ) : selectedOrder.orderStatus === "READY_FOR_PICKUP" ? (
                  <CheckCircle2 size={24} color={meta.color} />
                ) : selectedOrder.orderStatus === "DELIVERING" || selectedOrder.orderStatus === "PICKED_UP" ? (
                  <Truck size={24} color={meta.color} />
                ) : selectedOrder.orderStatus === "PREPARING" || selectedOrder.orderStatus === "STORE_ACCEPTED" ? (
                  <Boxes size={24} color={meta.color} />
                ) : selectedOrder.orderStatus === "CANCELLED" ? (
                  <AlertTriangle size={24} color={meta.color} />
                ) : (
                  <Clock size={24} color={meta.color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.statusTitleRow}>
                  <Text style={styles.statusHeroTitle}>{meta.stepTitle}</Text>
                  <View style={[styles.statusHeroBadge, { backgroundColor: meta.bgColor }]}>
                    <Text style={[styles.statusHeroBadgeText, { color: meta.color }]}>
                      {meta.badgeText}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusHeroDesc}>{meta.stepDesc}</Text>
              </View>
            </View>

            {/* Stepper Progres Horizontal */}
            {selectedOrder.orderStatus !== "CANCELLED" && (
              <View style={styles.stepperWrapper}>
                <View style={styles.stepperRow}>
                  {STEPS.map((step, idx) => {
                    const isDone = idx < meta.stepIndex || selectedOrder.orderStatus === "COMPLETED";
                    const isCurrent = idx === meta.stepIndex && selectedOrder.orderStatus !== "COMPLETED";
                    const StepIcon = step.icon;

                    return (
                      <React.Fragment key={idx}>
                        <View style={styles.stepItemCol}>
                          <View
                            style={[
                              styles.stepNode,
                              isDone && styles.stepNodeDone,
                              isCurrent && styles.stepNodeCurrent,
                            ]}
                          >
                            {isDone ? (
                              <Check size={12} color="#FFFFFF" strokeWidth={3} />
                            ) : (
                              <StepIcon size={12} color={isCurrent ? "#0D7A53" : "#94A3B8"} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.stepNodeLabel,
                              (isDone || isCurrent) && styles.stepNodeLabelActive,
                            ]}
                          >
                            {step.label}
                          </Text>
                        </View>
                        {idx < STEPS.length - 1 && (
                          <View
                            style={[
                              styles.stepConnector,
                              (idx < meta.stepIndex || selectedOrder.orderStatus === "COMPLETED") &&
                                styles.stepConnectorActive,
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 2. Customer & Delivery Info Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <User size={16} color="#0D7A53" />
              <Text style={styles.sectionTitle}>Informasi Pemesan & Pengantaran</Text>
            </View>

            <View style={styles.customerDetailBox}>
              <View style={styles.customerInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerDetailName}>
                    {selectedOrder.customerName || selectedOrder.customerId?.name || "Pelanggan"}
                  </Text>
                  <Text style={styles.customerDetailPhone}>
                    {customerPhone || "Nomor telepon tidak dicantumkan"}
                  </Text>
                </View>
                {customerPhone ? (
                  <View style={styles.quickContactRow}>
                    <TouchableOpacity
                      style={styles.btnWa}
                      onPress={() => handleOpenWhatsApp(customerPhone, selectedOrder.customerName)}
                      activeOpacity={0.7}
                    >
                      <MessageCircle size={14} color="#16A34A" />
                      <Text style={styles.btnWaText}>WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnCall}
                      onPress={() => handleCallPhone(customerPhone)}
                      activeOpacity={0.7}
                    >
                      <Phone size={14} color="#0284C7" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <View style={styles.divider} />

              <View style={styles.addressRow}>
                <MapPin size={16} color="#EF4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>Alamat Pengantaran</Text>
                  <Text style={styles.addressText}>{selectedOrder.deliveryAddress || "Alamat tidak tersedia"}</Text>
                  {selectedOrder.deliveryNotes ? (
                    <View style={styles.notesPill}>
                      <Text style={styles.notesPillLabel}>Catatan:</Text>
                      <Text style={styles.notesPillText}>{selectedOrder.deliveryNotes}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.subInfoGrid}>
                <View style={styles.subInfoCol}>
                  <Text style={styles.subInfoLabel}>Jenis Pengiriman</Text>
                  <Text style={styles.subInfoValue}>
                    {selectedOrder.deliverySlot?.type === "SCHEDULED" ? "Terjadwal" : "Instan (Express)"}
                  </Text>
                </View>
                <View style={styles.subInfoCol}>
                  <Text style={styles.subInfoLabel}>Opsi Barang Kosong</Text>
                  <Text style={styles.subInfoValue}>
                    {selectedOrder.substitutionPolicy === "DONT_SUBSTITUTE"
                      ? "Jangan Diganti"
                      : selectedOrder.substitutionPolicy === "SAME_CATEGORY"
                      ? "Rekomendasi Toko"
                      : selectedOrder.substitutionPolicy === "AUTO_PRICE_LIMIT"
                      ? "Otomatis Sesuai Harga"
                      : "Hubungi Saya"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Items Ordered Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Package size={16} color="#0D7A53" />
              <Text style={styles.sectionTitle}>
                Daftar Produk ({items.length} Barang)
              </Text>
            </View>

            <View style={styles.itemsList}>
              {items.map((it: any, idx: number) => {
                const img = it.productImageSnapshot || it.coverImageSnapshot || it.image || "";
                return (
                  <View key={idx} style={styles.detailItemRow}>
                    {img ? (
                      <Image
                        source={{ uri: normalizeImageUrl(img) }}
                        style={styles.detailItemThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.detailItemFallback}>
                        <Package size={18} color="#94A3B8" />
                      </View>
                    )}

                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.detailItemName}>
                        {it.productNameSnapshot || it.name || "Produk"}
                      </Text>
                      <Text style={styles.detailItemSub}>
                        {it.quantity} x {rp(it.priceSnapshot || it.price || 0)}
                      </Text>
                      {it.notes ? (
                        <Text style={styles.detailItemNote}>Catatan: {it.notes}</Text>
                      ) : null}
                      {it.replacementProductName ? (
                        <Text style={styles.replacementTag}>
                          Pengganti: {it.replacementProductName}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.detailItemTotal}>
                        {rp(it.subtotal || (it.priceSnapshot || 0) * (it.quantity || 1))}
                      </Text>

                      {(selectedOrder.orderStatus === "STORE_ACCEPTED" ||
                        selectedOrder.orderStatus === "PREPARING") && (
                        <TouchableOpacity
                          style={styles.detailBtnSub}
                          onPress={() => handleOpenSubstitutionModal(selectedOrder, it)}
                        >
                          <Boxes size={11} color="#2563EB" />
                          <Text style={styles.detailBtnSubText}>Ganti Stok</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 4. Kurir / Pengantaran (Driver) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Truck size={16} color="#0D7A53" />
              <Text style={styles.sectionTitle}>Kurir Pengantar</Text>
            </View>

            {selectedOrder.driverName || selectedOrder.driverId ? (
              <View style={styles.driverBox}>
                <View style={styles.driverTopRow}>
                  <View style={styles.driverAvatar}>
                    <User size={18} color="#0D7A53" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverNameText}>{selectedOrder.driverName || "Driver GEOVERSE"}</Text>
                    <Text style={styles.driverPlateText}>
                      {selectedOrder.driverPlateNumber ? `Plat: ${selectedOrder.driverPlateNumber}` : "Kurir Kanyaah Shop"}
                    </Text>
                  </View>
                  {driverPhone ? (
                    <View style={styles.quickContactRow}>
                      <TouchableOpacity
                        style={styles.btnWa}
                        onPress={() => handleOpenWhatsApp(driverPhone, selectedOrder.driverName)}
                        activeOpacity={0.7}
                      >
                        <MessageCircle size={14} color="#16A34A" />
                        <Text style={styles.btnWaText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnCall}
                        onPress={() => handleCallPhone(driverPhone)}
                        activeOpacity={0.7}
                      >
                        <Phone size={14} color="#0284C7" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {/* Bukti foto jika ada */}
                {selectedOrder.deliveryProofPhoto ? (
                  <View style={styles.proofBox}>
                    <Text style={styles.proofLabel}>Foto Bukti Pengantaran:</Text>
                    <Image
                      source={{ uri: normalizeImageUrl(selectedOrder.deliveryProofPhoto) }}
                      style={styles.proofImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.noDriverBox}>
                <Clock size={20} color="#94A3B8" />
                <Text style={styles.noDriverTitle}>Belum Ada Kurir Ditugaskan</Text>
                <Text style={styles.noDriverSub}>
                  {selectedOrder.orderStatus === "READY_FOR_PICKUP"
                    ? "Pesanan sudah siap di kasir. Sistem GEOVERSE sedang mencari kurir terdekat."
                    : "Selesaikan penyiapan barang dan tekan 'Siap Diambil Kurir' untuk memanggil kurir."}
                </Text>
              </View>
            )}
          </View>

          {/* 5. Payment Details Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={16} color="#0D7A53" />
              <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
            </View>

            <View style={styles.paymentBox}>
              <View style={styles.paymentMethodRow}>
                <Text style={styles.paymentMethodLabel}>Metode Pembayaran</Text>
                <View style={styles.paymentMethodBadge}>
                  <Text style={styles.paymentMethodText}>
                    {selectedOrder.paymentMethod || "QRIS"}
                  </Text>
                  <View
                    style={[
                      styles.paymentStatusDot,
                      {
                        backgroundColor:
                          selectedOrder.paymentStatus === "PAID" ? "#16A34A" : "#D97706",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.paymentStatusText,
                      {
                        color:
                          selectedOrder.paymentStatus === "PAID" ? "#16A34A" : "#D97706",
                      },
                    ]}
                  >
                    {selectedOrder.paymentStatus === "PAID" ? "Lunas" : "Belum Bayar (COD/Transfer)"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal Produk</Text>
                <Text style={styles.summaryVal}>
                  {rp(selectedOrder.subtotal || selectedOrder.totalAmount - (selectedOrder.deliveryFee || 8000))}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ongkos Kirim Kurir</Text>
                <Text style={styles.summaryVal}>{rp(selectedOrder.deliveryFee || 8000)}</Text>
              </View>

              {selectedOrder.discount ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Diskon Voucher</Text>
                  <Text style={[styles.summaryVal, { color: "#16A34A" }]}>
                    -{rp(selectedOrder.discount)}
                  </Text>
                </View>
              ) : null}

              {selectedOrder.pointsDeduction ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kanyaah Poin</Text>
                  <Text style={[styles.summaryVal, { color: "#16A34A" }]}>
                    -{rp(selectedOrder.pointsDeduction)}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabelLarge}>Total Transaksi</Text>
                <Text style={styles.totalValLarge}>
                  {rp(selectedOrder.totalAmount || selectedOrder.totalPrice || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* 6. Status History Card */}
          {statusHistory.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Clock size={16} color="#0D7A53" />
                <Text style={styles.sectionTitle}>Riwayat & Linimasa Pesanan</Text>
              </View>

              <View style={styles.historyList}>
                {statusHistory.map((h: any, idx: number) => (
                  <View key={idx} style={styles.historyItemRow}>
                    <View style={styles.historyDotCol}>
                      <View style={styles.historyDot} />
                      {idx < statusHistory.length - 1 && <View style={styles.historyLine} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14 }}>
                      <View style={styles.historyMetaRow}>
                        <Text style={styles.historyStatusText}>{h.status}</Text>
                        <Text style={styles.historyTimeText}>
                          {new Date(h.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </Text>
                      </View>
                      <Text style={styles.historyNoteText}>{h.note}</Text>
                      {h.actorRole ? (
                        <Text style={styles.historyActorText}>Oleh: {h.actorRole}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky Action Bar at Bottom */}
        <View style={styles.fullPageBottomBar}>
          {selectedOrder.orderStatus === "PAID" ||
          selectedOrder.orderStatus === "PENDING" ||
          selectedOrder.orderStatus === "WAITING_STORE_CONFIRMATION" ||
          selectedOrder.orderStatus === "WAITING_MERCHANT_CONFIRMATION" ||
          selectedOrder.orderStatus === "STORE_PENDING" ||
          selectedOrder.orderStatus === "CREATED" ? (
            <View style={styles.actionButtonRow}>
              <TouchableOpacity
                style={styles.btnRejectFull}
                onPress={() => handleRejectOrder(selectedOrder._id)}
                activeOpacity={0.8}
              >
                <X size={16} color="#DC2626" />
                <Text style={styles.btnRejectFullText}>Tolak</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnAcceptFull}
                onPress={() => handleAcceptOrder(selectedOrder._id)}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnAcceptFullText}>Terima Pesanan</Text>
              </TouchableOpacity>
            </View>
          ) : selectedOrder.orderStatus === "STORE_ACCEPTED" ? (
            <TouchableOpacity
              style={styles.btnFullAction}
              onPress={() =>
                handleUpdateStatus(selectedOrder._id, "PREPARING", "Pesanan sedang dikemas oleh toko")
              }
              activeOpacity={0.8}
            >
              <Boxes size={18} color="#FFFFFF" />
              <Text style={styles.btnFullActionText}>Mulai Siapkan Barang</Text>
            </TouchableOpacity>
          ) : selectedOrder.orderStatus === "PREPARING" || selectedOrder.orderStatus === "PICKING" ? (
            <TouchableOpacity
              style={[styles.btnFullAction, { backgroundColor: "#059669" }]}
              onPress={() =>
                handleUpdateStatus(selectedOrder._id, "READY_FOR_PICKUP", "Pesanan siap diambil kurir")
              }
              activeOpacity={0.8}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.btnFullActionText}>Tandai Siap Diambil Kurir</Text>
            </TouchableOpacity>
          ) : selectedOrder.orderStatus === "READY_FOR_PICKUP" ? (
            <View style={styles.waitingDriverBar}>
              <Clock size={16} color="#0D7A53" />
              <Text style={styles.waitingDriverText}>
                Paket Siap di Kasir • Menunggu Kurir Mengambil
              </Text>
            </View>
          ) : selectedOrder.orderStatus === "DRIVER_ASSIGNED" ||
            selectedOrder.orderStatus === "DRIVER_HEADING_TO_STORE" ||
            selectedOrder.orderStatus === "DRIVER_ON_THE_WAY_TO_STORE" ? (
            <View style={[styles.waitingDriverBar, { backgroundColor: "#EDE9FE" }]}>
              <Bike size={16} color="#7C3AED" />
              <Text style={[styles.waitingDriverText, { color: "#7C3AED" }]}>
                Kurir Ditugaskan: {selectedOrder.driverName || "Kurir"} • Sedang Menuju Toko
              </Text>
            </View>
          ) : selectedOrder.orderStatus === "DRIVER_AT_STORE" ? (
            <View style={[styles.waitingDriverBar, { backgroundColor: "#EDE9FE" }]}>
              <Truck size={16} color="#7C3AED" />
              <Text style={[styles.waitingDriverText, { color: "#7C3AED" }]}>
                Kurir Sudah Tiba di Toko • Serahkan Paket
              </Text>
            </View>
          ) : selectedOrder.orderStatus === "DELIVERING" || selectedOrder.orderStatus === "PICKED_UP" ? (
            <View style={[styles.waitingDriverBar, { backgroundColor: "#E0F2FE" }]}>
              <Truck size={16} color="#0284C7" />
              <Text style={[styles.waitingDriverText, { color: "#0284C7" }]}>
                Kurir Sedang Mengantar ke Alamat Pelanggan
              </Text>
            </View>
          ) : selectedOrder.orderStatus === "COMPLETED" ? (
            <View style={[styles.waitingDriverBar, { backgroundColor: "#DCFCE7" }]}>
              <CheckCircle2 size={16} color="#15803D" />
              <Text style={[styles.waitingDriverText, { color: "#15803D" }]}>
                Pesanan Telah Selesai Diterima
              </Text>
            </View>
          ) : null}
        </View>

        {/* Modal Substitusi Barang Kosong */}
        <Modal visible={subModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tawarkan Produk Pengganti</Text>
                <TouchableOpacity onPress={() => setSubModalVisible(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                Barang yang stoknya habis:{" "}
                <Text style={{ fontWeight: "800", color: "#DC2626" }}>
                  {outOfStockItem?.productNameSnapshot || "Produk"}
                </Text>
              </Text>

              <Text style={styles.inputLabel}>Nama Produk Pengganti / Rekomendasi:</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Misal: Indomie Goreng diganti Sedaap Goreng"
                placeholderTextColor="#94A3B8"
                value={replacementName}
                onChangeText={setReplacementName}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setSubModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={handleSubmitSubstitution}
                  disabled={submittingSub}
                >
                  {submittingSub ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Kirim Usulan ke Pelanggan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  if (selectedOrder) {
    return renderFullPageOrderDetail();
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manajemen Pesanan Toko</Text>
          <Text style={styles.headerSub}>
            Pantau pesanan masuk, penyiapan barang, dan resep apotek
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => void loadMerchantData()}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color="#0D7A53" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nomor pesanan # atau nama pelanggan..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "NEW" && styles.tabBtnActive]}
            onPress={() => setActiveTab("NEW")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === "NEW" && styles.tabBtnTextActive]}>
              Masuk ({newOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "PREPARING" && styles.tabBtnActive]}
            onPress={() => setActiveTab("PREPARING")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === "PREPARING" && styles.tabBtnTextActive]}>
              Disiapkan ({preparingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "READY" && styles.tabBtnActive]}
            onPress={() => setActiveTab("READY")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === "READY" && styles.tabBtnTextActive]}>
              Siap Kirim ({readyOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "COMPLETED" && styles.tabBtnActive]}
            onPress={() => setActiveTab("COMPLETED")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === "COMPLETED" && styles.tabBtnTextActive]}>
              Selesai ({completedOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "PRESCRIPTION" && styles.tabBtnActive]}
            onPress={() => setActiveTab("PRESCRIPTION")}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabBtnText, activeTab === "PRESCRIPTION" && styles.tabBtnTextActive]}
            >
              Resep Obat ({prescriptions.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMerchantData();
            }}
          />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={styles.loadingText}>Memuat pesanan toko...</Text>
          </View>
        ) : currentList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Package size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Tidak ada pesanan</Text>
            <Text style={styles.emptyDesc}>
              {activeTab === "NEW"
                ? "Belum ada pesanan baru masuk dari pelanggan."
                : activeTab === "PREPARING"
                ? "Tidak ada pesanan yang sedang disiapkan."
                : activeTab === "READY"
                ? "Tidak ada pesanan siap dijemput kurir."
                : activeTab === "COMPLETED"
                ? "Belum ada riwayat pesanan yang selesai."
                : "Belum ada resep obat yang diajukan."}
            </Text>
          </View>
        ) : activeTab === "PRESCRIPTION" ? (
          // Render Prescriptions
          currentList.map((rx) => (
            <View key={rx._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardCode}>RESEP #{rx._id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(rx.createdAt).toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={styles.badgePrescription}>
                  <Text style={styles.badgePrescriptionText}>{rx.status}</Text>
                </View>
              </View>

              <View style={styles.customerRow}>
                <User size={14} color="#64748B" />
                <Text style={styles.customerName}>
                  Pasien: {rx.customerId?.name || "Pelanggan"}
                </Text>
              </View>

              {rx.doctorName && (
                <Text style={styles.rxDoctorText}>Dokter: {rx.doctorName}</Text>
              )}
              {rx.customerNotes && (
                <Text style={styles.rxNotesText}>Catatan: {rx.customerNotes}</Text>
              )}

              {/* Prescription Images */}
              {rx.imageUrls && rx.imageUrls.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.rxImagesRow}
                >
                  {rx.imageUrls.map((url: string, idx: number) => (
                    <Image
                      key={idx}
                      source={{ uri: normalizeImageUrl(url) }}
                      style={styles.rxThumb}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              )}

              {rx.status === "PENDING_VERIFICATION" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnReject]}
                    onPress={() => handleVerifyPrescription(rx._id, false)}
                  >
                    <Text style={styles.btnRejectText}>Tolak Resep</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnApprove]}
                    onPress={() => handleVerifyPrescription(rx._id, true)}
                  >
                    <Text style={styles.btnApproveText}>Setujui Resep</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          // Render Orders
          currentList.map((order) => {
            const items = order.items || [];
            return (
              <TouchableOpacity
                key={order._id}
                style={styles.card}
                onPress={() => setSelectedOrder(order)}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View>
                      <Text style={styles.cardCode}>
                        #{order.orderCode || order._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.cardDate}>
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </Text>
                    </View>
                    <ChevronRight size={15} color="#94A3B8" />
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      order.orderStatus === "COMPLETED"
                        ? styles.statusBadgeCompleted
                        : order.orderStatus === "PREPARING" ||
                          order.orderStatus === "STORE_ACCEPTED"
                        ? styles.statusBadgePreparing
                        : styles.statusBadgeNew,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        order.orderStatus === "COMPLETED"
                          ? styles.statusBadgeTextCompleted
                          : order.orderStatus === "PREPARING" ||
                            order.orderStatus === "STORE_ACCEPTED"
                          ? styles.statusBadgeTextPreparing
                          : styles.statusBadgeTextNew,
                      ]}
                    >
                      {order.orderStatus}
                    </Text>
                  </View>
                </View>

                {/* Customer & Address */}
                <View style={styles.customerRow}>
                  <User size={14} color="#64748B" />
                  <Text style={styles.customerName}>
                    {order.customerName || order.customerId?.name || "Pelanggan"}
                  </Text>
                  {order.deliveryAddress && (
                    <Text style={styles.customerAddr} numberOfLines={1}>
                      • {order.deliveryAddress}
                    </Text>
                  )}
                </View>

                {/* Items */}
                <View style={styles.itemsBox}>
                  {items.map((it: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>
                          {it.quantity}x {it.productNameSnapshot || it.name || "Produk"}
                        </Text>
                        {it.notes ? (
                          <Text style={styles.itemNote}>Catatan: {it.notes}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.itemPrice}>
                        {rp(it.priceSnapshot * it.quantity || it.subtotal || 0)}
                      </Text>

                      {/* Substitution option if still preparing */}
                      {(order.orderStatus === "STORE_ACCEPTED" ||
                        order.orderStatus === "PREPARING") && (
                        <TouchableOpacity
                          style={styles.btnSubstitusi}
                          onPress={() => handleOpenSubstitutionModal(order, it)}
                        >
                          <Boxes size={11} color="#2563EB" />
                          <Text style={styles.btnSubstitusiText}>Ganti Stok</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                {/* Total & Action Footer */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Total Belanja</Text>
                    <Text style={styles.totalAmount}>
                      {rp(order.totalAmount || order.totalPrice || 0)}
                    </Text>
                  </View>

                  {/* Actions depending on status */}
                  {order.orderStatus === "PAID" ||
                  order.orderStatus === "PENDING" ||
                  order.orderStatus === "WAITING_STORE_CONFIRMATION" ||
                  order.orderStatus === "WAITING_MERCHANT_CONFIRMATION" ||
                  order.orderStatus === "STORE_PENDING" ||
                  order.orderStatus === "CREATED" ? (
                    <TouchableOpacity
                      style={styles.btnPrimary}
                      onPress={() => handleAcceptOrder(order._id)}
                      activeOpacity={0.8}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <Text style={styles.btnPrimaryText}>Terima Pesanan</Text>
                    </TouchableOpacity>
                  ) : order.orderStatus === "STORE_ACCEPTED" ? (
                    <TouchableOpacity
                      style={styles.btnPrimary}
                      onPress={() => handleUpdateStatus(order._id, "PREPARING", "Pesanan sedang dikemas")}
                      activeOpacity={0.8}
                    >
                      <Boxes size={14} color="#FFFFFF" />
                      <Text style={styles.btnPrimaryText}>Mulai Siapkan</Text>
                    </TouchableOpacity>
                  ) : order.orderStatus === "PREPARING" || order.orderStatus === "PICKING" ? (
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: "#059669" }]}
                      onPress={() =>
                        handleUpdateStatus(
                          order._id,
                          "READY_FOR_PICKUP",
                          "Pesanan siap diambil kurir"
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={14} color="#FFFFFF" />
                      <Text style={styles.btnPrimaryText}>Siap Diambil Kurir</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal Substitusi Barang Kosong */}
      <Modal visible={subModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tawarkan Produk Pengganti</Text>
              <TouchableOpacity onPress={() => setSubModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Barang yang stoknya habis:{" "}
              <Text style={{ fontWeight: "800", color: "#DC2626" }}>
                {outOfStockItem?.productNameSnapshot || "Produk"}
              </Text>
            </Text>

            <Text style={styles.inputLabel}>Nama Produk Pengganti / Rekomendasi:</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Misal: Indomie Goreng diganti Sedaap Goreng"
              placeholderTextColor="#94A3B8"
              value={replacementName}
              onChangeText={setReplacementName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSubModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={handleSubmitSubstitution}
                disabled={submittingSub}
              >
                {submittingSub ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Kirim Usulan ke Pelanggan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    padding: 0,
  },
  tabsContainer: {
    height: 40,
    marginBottom: 6,
  },
  tabsScrollView: {
    flexGrow: 0,
    height: 40,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  tabBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  ordersScrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 11,
    color: "#64748B",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 22,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
    maxWidth: 240,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 8,
  },
  cardCode: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  cardDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeNew: {
    backgroundColor: "#EFF6FF",
  },
  statusBadgePreparing: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeCompleted: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusBadgeTextNew: {
    color: "#2563EB",
  },
  statusBadgeTextPreparing: {
    color: "#D97706",
  },
  statusBadgeTextCompleted: {
    color: "#15803D",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  customerName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    flexShrink: 1,
  },
  customerAddr: {
    fontSize: 11,
    color: "#64748B",
    flexShrink: 1,
  },
  itemsBox: {
    paddingVertical: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  itemNote: {
    fontSize: 10,
    color: "#DC2626",
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  btnSubstitusi: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  btnSubstitusiText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  badgePrescription: {
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePrescriptionText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
  },
  rxDoctorText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
  },
  rxNotesText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  rxImagesRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  rxThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  btnAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnReject: {
    backgroundColor: "#FEF2F2",
  },
  btnRejectText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  btnApprove: {
    backgroundColor: "#0D7A53",
  },
  btnApproveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0F172A",
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  modalSubmit: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },
  modalSubmitText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Full Page Order Details Styles
  fullPageContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  fullPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  fullPageBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  fullPageBackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  fullPageHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fullPageOrderCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullPageRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  fullPageScroll: {
    flex: 1,
  },
  fullPageScrollContent: {
    padding: 16,
    gap: 14,
    maxWidth: 680,
    alignSelf: "center",
    width: "100%",
  },

  // 1. Status Hero Card & Stepper
  statusHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusHeroIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  statusHeroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  statusHeroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusHeroBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  statusHeroDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 17,
  },
  stepperWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItemCol: {
    alignItems: "center",
    flex: 1,
    zIndex: 2,
  },
  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNodeDone: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  stepNodeCurrent: {
    backgroundColor: "#DCFCE7",
    borderColor: "#0D7A53",
    transform: [{ scale: 1.1 }],
  },
  stepNodeLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
  stepNodeLabelActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: -6,
    marginBottom: 16,
  },
  stepConnectorActive: {
    backgroundColor: "#0D7A53",
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Customer Card
  customerDetailBox: {
    gap: 10,
  },
  customerInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerDetailName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  customerDetailPhone: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  quickContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnWa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnWaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  btnCall: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 12.5,
    color: "#1E293B",
    lineHeight: 18,
  },
  notesPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  notesPillLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#92400E",
  },
  notesPillText: {
    fontSize: 11,
    color: "#78350F",
    flex: 1,
  },
  subInfoGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 12,
  },
  subInfoCol: {
    flex: 1,
  },
  subInfoLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  subInfoValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  // Items List
  itemsList: {
    gap: 10,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginRight: 10,
  },
  detailItemFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  detailItemName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailItemSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  detailItemNote: {
    fontSize: 11,
    color: "#D97706",
    fontStyle: "italic",
    marginTop: 2,
  },
  replacementTag: {
    fontSize: 10.5,
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 2,
  },
  detailItemTotal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailBtnSub: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  detailBtnSubText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },

  // Driver Card
  driverBox: {
    gap: 10,
  },
  driverTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  driverNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  driverPlateText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  proofBox: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  proofLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  proofImg: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  noDriverBox: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    gap: 6,
  },
  noDriverTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  noDriverSub: {
    fontSize: 11.5,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
  },

  // Payment Breakdown
  paymentBox: {
    gap: 8,
  },
  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  paymentMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentMethodText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  paymentStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  totalLabelLarge: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalValLarge: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },

  // History Timeline
  historyList: {
    marginTop: 4,
  },
  historyItemRow: {
    flexDirection: "row",
    gap: 10,
  },
  historyDotCol: {
    alignItems: "center",
    width: 16,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0D7A53",
    marginTop: 3,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },
  historyMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  historyTimeText: {
    fontSize: 10.5,
    color: "#94A3B8",
  },
  historyNoteText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  historyActorText: {
    fontSize: 10,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 1,
  },

  // Sticky Bottom Action Bar
  fullPageBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonRow: {
    flexDirection: "row",
    gap: 10,
    maxWidth: 680,
    alignSelf: "center",
    width: "100%",
  },
  btnRejectFull: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnRejectFullText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
  btnAcceptFull: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnAcceptFullText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnFullAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 13,
    borderRadius: 10,
    maxWidth: 680,
    alignSelf: "center",
    width: "100%",
  },
  btnFullActionText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  waitingDriverBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F5EE",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    maxWidth: 680,
    alignSelf: "center",
    width: "100%",
  },
  waitingDriverText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
});
