import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Store,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HeartPulse,
  ChevronRight,
  RefreshCw,
} from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { getApiUrl, getStoredAuthToken } from "../../services/api";
import { rp } from "../../utils/formatters";

interface ShopMerchantOrderScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const ShopMerchantOrderScreen: React.FC<ShopMerchantOrderScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"NEW" | "PREPARING" | "READY" | "PRESCRIPTION">("NEW");

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
        fetch(getApiUrl("/shop/pharmacy/prescriptions"), { headers }).then((r) => r.json()).catch(() => ({ data: [] })),
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
          pharmacistNotes: approve ? "Resep terverifikasi sesuai aturan" : "Ditolak karena tidak memenuhi syarat",
        }),
      }).then((r) => r.json());

      if (res.success) {
        Alert.alert("Resep Diproses", approve ? "Resep disetujui." : "Resep ditolak.");
        loadMerchantData();
      } else {
        Alert.alert("Gagal", res.message || "Gagal memproses resep");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal memproses resep");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "NEW") {
      return ["WAITING_STORE_CONFIRMATION", "PAID", "CREATED"].includes(o.orderStatus);
    }
    if (activeTab === "PREPARING") {
      return ["STORE_ACCEPTED", "PREPARING", "PICKING", "WAITING_SUBSTITUTION"].includes(o.orderStatus);
    }
    if (activeTab === "READY") {
      return ["READY_FOR_PICKUP", "DRIVER_ASSIGNED", "DRIVER_AT_STORE", "PICKED_UP", "DELIVERING"].includes(o.orderStatus);
    }
    return false;
  });

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate("pemilik_marketplace_home")} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Manajemen Pesanan Toko</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadMerchantData} activeOpacity={0.7}>
          <RefreshCw size={16} color="#15803D" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "NEW" && styles.activeTabBtn]}
          onPress={() => setActiveTab("NEW")}
        >
          <Text style={[styles.tabText, activeTab === "NEW" && styles.activeTabText]}>
            Pesanan Baru ({orders.filter((o) => ["WAITING_STORE_CONFIRMATION", "PAID"].includes(o.orderStatus)).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "PREPARING" && styles.activeTabBtn]}
          onPress={() => setActiveTab("PREPARING")}
        >
          <Text style={[styles.tabText, activeTab === "PREPARING" && styles.activeTabText]}>
            Sedang Disiapkan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "READY" && styles.activeTabBtn]}
          onPress={() => setActiveTab("READY")}
        >
          <Text style={[styles.tabText, activeTab === "READY" && styles.activeTabText]}>
            Siap Diambil Kurir
          </Text>
        </TouchableOpacity>

        {prescriptions.length > 0 && (
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "PRESCRIPTION" && styles.activeTabBtn]}
            onPress={() => setActiveTab("PRESCRIPTION")}
          >
            <Text style={[styles.tabText, activeTab === "PRESCRIPTION" && styles.activeTabText]}>
              Resep ({prescriptions.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMerchantData(); }} />
        }
      >
        {activeTab === "PRESCRIPTION" ? (
          /* Prescription List for Pharmacy */
          <View style={styles.listContainer}>
            {prescriptions.map((rx) => (
              <View key={rx._id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <Text style={styles.orderCode}>Resep #{rx.prescriptionCode}</Text>
                  <Text style={styles.customerName}>{rx.customerName}</Text>
                </View>
                <Text style={styles.orderAddress}>Dokter: {rx.doctorName || "Tidak dicantumkan"}</Text>
                {rx.customerNotes ? (
                  <Text style={styles.itemNote}>Catatan: {rx.customerNotes}</Text>
                ) : null}

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#DC2626" }]}
                    onPress={() => handleVerifyPrescription(rx._id, false)}
                  >
                    <Text style={styles.actionBtnText}>Tolak Resep</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#0284C7" }]}
                    onPress={() => handleVerifyPrescription(rx._id, true)}
                  >
                    <Text style={styles.actionBtnText}>Setujui Resep</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : filteredOrders.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredOrders.map((ord) => (
              <View key={ord._id} style={styles.orderCard}>
                {/* Header */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderCode}>#{ord.orderCode}</Text>
                    <Text style={styles.customerName}>{ord.customerName} ({ord.customerPhone || "-"})</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{ord.orderStatus}</Text>
                  </View>
                </View>

                <Text style={styles.orderAddress}>{ord.deliveryAddress}</Text>

                {/* Items Checklist / Picking */}
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsTitle}>Daftar Belanjaan ({ord.items?.length || 0} item):</Text>
                  {ord.items?.map((it: any, i: number) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{it.quantity}x</Text>
                      <Text style={styles.itemName}>{it.productNameSnapshot}</Text>
                      <Text style={styles.itemPrice}>{rp(it.subtotal)}</Text>

                      {/* Out of Stock Button during PREPARING/PICKING */}
                      {["STORE_ACCEPTED", "PREPARING", "PICKING"].includes(ord.orderStatus) && (
                        <TouchableOpacity
                          style={styles.oosBtn}
                          onPress={() => handleOpenSubstitutionModal(ord, it)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.oosBtnText}>Stok Habis</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                {/* Substitution Alert in Card */}
                {ord.orderStatus === "WAITING_SUBSTITUTION" && (
                  <View style={styles.warnBox}>
                    <AlertTriangle size={14} color="#D97706" />
                    <Text style={styles.warnText}>Menunggu persetujuan pelanggan untuk produk pengganti.</Text>
                  </View>
                )}

                {/* Action Buttons depending on status */}
                <View style={styles.btnRow}>
                  {["WAITING_STORE_CONFIRMATION", "PAID", "CREATED"].includes(ord.orderStatus) && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#15803D" }]}
                      onPress={() => handleAcceptOrder(ord._id)}
                    >
                      <Text style={styles.actionBtnText}>Terima & Mulai Siapkan</Text>
                    </TouchableOpacity>
                  )}

                  {ord.orderStatus === "STORE_ACCEPTED" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#0284C7" }]}
                      onPress={() => handleUpdateStatus(ord._id, "PICKING", "Mulai mengambil barang dari rak")}
                    >
                      <Text style={styles.actionBtnText}>Mulai Ambil Barang (Picking)</Text>
                    </TouchableOpacity>
                  )}

                  {["PICKING", "PREPARING"].includes(ord.orderStatus) && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#15803D" }]}
                      onPress={() => handleUpdateStatus(ord._id, "READY_FOR_PICKUP", "Semua barang selesai dikemas rapi")}
                    >
                      <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>Tandai Siap Diambil Kurir</Text>
                    </TouchableOpacity>
                  )}

                  {ord.orderStatus === "READY_FOR_PICKUP" && (
                    <View style={styles.readyBadge}>
                      <Clock size={14} color="#15803D" />
                      <Text style={styles.readyBadgeText}>Menunggu kurir mengambil barang...</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Package size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Tidak Ada Pesanan</Text>
            <Text style={styles.emptySub}>Belum ada pesanan pada tab ini.</Text>
          </View>
        )}
      </ScrollView>

      {/* Substitution Modal */}
      <Modal visible={subModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajukan Produk Pengganti</Text>
            <Text style={styles.modalSub}>
              Produk kosong: <Text style={{ fontWeight: "700" }}>{outOfStockItem?.productNameSnapshot}</Text>
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ketik nama produk pengganti yang tersedia di rak..."
              placeholderTextColor="#9CA3AF"
              value={replacementName}
              onChangeText={setReplacementName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSubModalVisible(false)}>
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
                  <Text style={styles.modalSubmitText}>Kirim ke Pelanggan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  activeTabBtn: {
    backgroundColor: "#15803D",
  },
  tabText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainer: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  orderCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderCode: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  customerName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  orderAddress: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 10,
  },
  itemsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    width: 26,
  },
  itemName: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 8,
  },
  oosBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  oosBtnText: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "700",
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  warnText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  readyBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  readyBadgeText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 50,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmit: {
    backgroundColor: "#15803D",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  itemNote: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 6,
  },
});
