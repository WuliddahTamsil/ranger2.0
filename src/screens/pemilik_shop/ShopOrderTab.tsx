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

  // Substitution Modal
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [selectedOrderForSub, setSelectedOrderForSub] = useState<any | null>(null);
  const [outOfStockItem, setOutOfStockItem] = useState<any | null>(null);
  const [replacementName, setReplacementName] = useState("");
  const [submittingSub, setSubmittingSub] = useState(false);

  const getHeaders = async () => {
    const token = await getStoredAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadMerchantData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMerchantData();
  }, []);

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
        loadMerchantData();
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

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    currentList = currentList.filter(
      (item) =>
        (item.orderCode || "").toLowerCase().includes(q) ||
        (item.customerName || item.customerId?.name || "").toLowerCase().includes(q)
    );
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
          onPress={loadMerchantData}
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
              <View key={order._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardCode}>
                      #{order.orderCode || order._id.slice(-8).toUpperCase()}
                    </Text>
                    <Text style={styles.cardDate}>
                      {new Date(order.createdAt).toLocaleString("id-ID")}
                    </Text>
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
              </View>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  customerName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  customerAddr: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
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
});
