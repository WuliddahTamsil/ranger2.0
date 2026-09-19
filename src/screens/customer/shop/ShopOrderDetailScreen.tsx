import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  Bike,
  ShieldCheck,
  CheckCircle2,
  FileText,
  RotateCcw,
  AlertTriangle,
  Star,
  RefreshCw,
  X,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchShopOrderDetail,
  cancelShopOrder,
  submitShopComplaint,
  submitShopRating,
  ShopOrder,
} from "../../../services/shopService";
import { OrderStatusTimeline } from "../../../components/shop/OrderStatusTimeline";
import { DriverInfoCard } from "../../../components/shop/DriverInfoCard";
import { NativeMapComponent } from "../../../components/NativeMapComponent";
import { FormalInvoiceModal, InvoiceData } from "../../../components/FormalInvoiceModal";
import { CustomerChatModal } from "../CustomerChatModal";
import { rp } from "../../../utils/formatters";

interface ShopOrderDetailScreenProps extends Nav {
  orderId?: string;
}

export const ShopOrderDetailScreen: React.FC<ShopOrderDetailScreenProps> = ({
  navigate,
  orderId = "",
}) => {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  // Cancellation Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Complaint Modal
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintDetail, setComplaintDetail] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Rating Modal
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await fetchShopOrderDetail(orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch (e) {
      console.warn("Load shop order detail error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    const interval = setInterval(loadDetail, 8000); // Polling status every 8s
    return () => clearInterval(interval);
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      const res = await cancelShopOrder(order._id, cancelReason || "Dibatalkan oleh pelanggan");
      if (res.success) {
        Alert.alert("Berhasil", "Pesanan telah dibatalkan.");
        setCancelModalVisible(false);
        loadDetail();
      } else {
        Alert.alert("Gagal", res.message || "Pesanan tidak dapat dibatalkan.");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal membatalkan pesanan.");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!order) return;
    try {
      setSubmittingComplaint(true);
      const res = await submitShopComplaint(order._id, {
        reason: complaintReason,
        detail: complaintDetail,
        solutionRequested: "REFUND",
      });
      if (res.success) {
        Alert.alert("Komplain Diterima", "Laporan Anda telah diteruskan ke tim support GEOVERSE.");
        setComplaintModalVisible(false);
        loadDetail();
      } else {
        Alert.alert("Gagal", res.message || "Gagal mengirim komplain.");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal mengirim komplain.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!order) return;
    try {
      setSubmittingRating(true);
      const res = await submitShopRating(order._id, ratingStars, ratingReview);
      if (res.success) {
        Alert.alert("Terima Kasih", "Ulasan Anda sangat berarti bagi toko dan kurir.");
        setRatingModalVisible(false);
        loadDetail();
      } else {
        Alert.alert("Gagal", res.message || "Gagal mengirim ulasan.");
      }
    } catch (e: any) {
      Alert.alert("Kesalahan", e.message || "Gagal mengirim rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading && !order) {
    return (
      <ResponsiveSafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={styles.loadingText}>Memuat detail pesanan...</Text>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  if (!order) {
    return (
      <ResponsiveSafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigate("c_shop_home")} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Pesanan Tidak Ditemukan</Text>
          <View style={{ width: 36 }} />
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  const isCompleted = order.orderStatus === "COMPLETED";
  const isCancelled = order.orderStatus === "CANCELLED";
  const canCancel = [
    "CREATED",
    "PAYMENT_PENDING",
    "PAID",
    "WAITING_STORE_CONFIRMATION",
    "STORE_ACCEPTED",
    "PREPARING",
  ].includes(order.orderStatus);

  const invoiceData: InvoiceData = {
    id: order.orderCode || order._id,
    invoiceNumber: order.orderCode,
    date: new Date(order.createdAt).toLocaleDateString("id-ID"),
    time: new Date(order.createdAt).toLocaleTimeString("id-ID"),
    status: order.orderStatus,
    orderType: "Kanyaah Shop",
    customerName: order.customerName,
    customerPhone: order.customerPhone || "-",
    customerAddress: order.deliveryAddress,
    driverName: order.driverName,
    driverPlate: order.driverPlateNumber,
    items: order.items.map((i) => ({
      name: i.productNameSnapshot,
      quantity: i.quantity,
      price: i.priceSnapshot,
      total: i.subtotal,
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    serviceFee: order.serviceFee,
    discount: (order.voucherDiscount || 0) + (order.pointDiscount || 0),
    total: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    storeName: order.storeName,
  };

  const storeObj = typeof order.storeId === "object" ? order.storeId : null;

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate("c_shop_home")} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.navTitleCol}>
          <Text style={styles.navTitle}>#{order.orderCode}</Text>
          <Text style={styles.navSub}>Status: {order.orderStatus}</Text>
        </View>
        <TouchableOpacity style={styles.invoiceBtn} onPress={() => setInvoiceVisible(true)} activeOpacity={0.7}>
          <FileText size={18} color="#15803D" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isLarge && { maxWidth: 880, alignSelf: "center", width: "100%" }]}
      >
        {/* Map Section if in Delivery Stage */}
        {["DRIVER_ASSIGNED", "DRIVER_AT_STORE", "PICKED_UP", "DELIVERING", "ARRIVED"].includes(order.orderStatus) && (
          <View style={styles.mapCard}>
            <NativeMapComponent
              initialRegion={{
                latitude: order.driverLocation?.latitude || order.deliveryLatitude || -7.1475,
                longitude: order.driverLocation?.longitude || order.deliveryLongitude || 107.8015,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              markers={[
                ...(order.deliveryLatitude && order.deliveryLongitude
                  ? [
                      {
                        id: "dropoff",
                        coordinate: { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude },
                        title: "Alamat Customer",
                        description: order.deliveryAddress,
                        pinColor: "#15803D",
                        type: "dropoff" as const,
                      },
                    ]
                  : []),
                ...(order.driverLocation?.latitude && order.driverLocation?.longitude
                  ? [
                      {
                        id: "driver",
                        coordinate: { latitude: order.driverLocation.latitude, longitude: order.driverLocation.longitude },
                        title: order.driverName || "Kurir",
                        pinColor: "#0284C7",
                        type: "driver" as const,
                      },
                    ]
                  : []),
              ]}
              style={{ height: 220, borderRadius: 16 }}
            />
          </View>
        )}

        {/* Driver Card if Assigned */}
        {order.driverName ? (
          <DriverInfoCard
            driver={{
              name: order.driverName,
              phone: order.driverPhone,
              profilePhoto: order.driverPhoto,
              plateNumber: order.driverPlateNumber,
            }}
            orderStatus={order.orderStatus}
            onPressChat={() => setChatVisible(true)}
          />
        ) : null}

        {/* Substitution Alert Banner if waiting approval */}
        {order.orderStatus === "WAITING_SUBSTITUTION" && (
          <View style={styles.substitutionBanner}>
            <AlertTriangle size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.subBannerTitle}>Persetujuan Produk Pengganti</Text>
              <Text style={styles.subBannerDesc}>
                Staf toko menawarkan produk pengganti untuk barang yang kosong.
              </Text>
            </View>
          </View>
        )}

        {/* Order Status Timeline */}
        <OrderStatusTimeline currentStatus={order.orderStatus} isCancelled={isCancelled} />

        {/* Store & Item Details */}
        <View style={styles.sectionCard}>
          <View style={styles.storeHeader}>
            <View style={styles.storeIconBg}>
              <Store size={18} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeTitle}>{order.storeName}</Text>
              <Text style={styles.storeAddress}>{order.storeAddress || "Garut, Jawa Barat"}</Text>
            </View>
          </View>

          <View style={styles.itemsList}>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemBullet}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                  {item.notes ? <Text style={styles.itemNote}>Catatan: {item.notes}</Text> : null}
                  {item.actualAvailability === "OUT_OF_STOCK" && (
                    <Text style={styles.outOfStockNotice}>Item habis di rak</Text>
                  )}
                  {item.replacementProductName ? (
                    <Text style={styles.replacementNotice}>Pengganti: {item.replacementProductName}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemPrice}>{rp(item.subtotal)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Proof of Delivery / Pickup Photos if available */}
        {(order.pickupProofUrl || order.deliveryProofUrl) && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardHeading}>Dokumentasi Serah Terima Kurir</Text>
            <View style={styles.proofsRow}>
              {order.pickupProofUrl ? (
                <View style={styles.proofItem}>
                  <Image source={{ uri: order.pickupProofUrl }} style={styles.proofImg} />
                  <Text style={styles.proofLabel}>Foto Pickup di Toko</Text>
                </View>
              ) : null}
              {order.deliveryProofUrl ? (
                <View style={styles.proofItem}>
                  <Image source={{ uri: order.deliveryProofUrl }} style={styles.proofImg} />
                  <Text style={styles.proofLabel}>Bukti Serah Terima</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Delivery Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>Alamat & Opsi Pengiriman</Text>
          <View style={styles.detailRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.detailText}>{order.deliveryAddress}</Text>
          </View>
          {order.deliveryNotes ? (
            <Text style={styles.deliveryNoteText}>Patokan: {order.deliveryNotes}</Text>
          ) : null}
        </View>

        {/* Payment Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>Rincian Biaya & Pembayaran</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Metode Pembayaran</Text>
            <Text style={styles.calcVal}>{order.paymentMethod} ({order.paymentStatus})</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal Produk</Text>
            <Text style={styles.calcVal}>{rp(order.subtotal)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Biaya Pengiriman</Text>
            <Text style={styles.calcVal}>{rp(order.deliveryFee)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Biaya Layanan</Text>
            <Text style={styles.calcVal}>{rp(order.serviceFee)}</Text>
          </View>

          {order.voucherDiscount > 0 && (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: "#15803D" }]}>Diskon Voucher</Text>
              <Text style={[styles.calcVal, { color: "#15803D" }]}>-{rp(order.voucherDiscount)}</Text>
            </View>
          )}

          {order.pointDiscount > 0 && (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: "#F59E0B" }]}>Diskon Point</Text>
              <Text style={[styles.calcVal, { color: "#F59E0B" }]}>-{rp(order.pointDiscount)}</Text>
            </View>
          )}

          <View style={styles.calcDivider} />

          <View style={styles.calcRow}>
            <Text style={styles.calcTotalLabel}>Total Tagihan</Text>
            <Text style={styles.calcTotalVal}>{rp(order.totalAmount)}</Text>
          </View>
        </View>

        {/* Actions: Cancel, Review, Complaint */}
        <View style={styles.actionsSection}>
          {isCompleted && !order.rating && (
            <TouchableOpacity
              style={styles.ratingBtn}
              onPress={() => setRatingModalVisible(true)}
              activeOpacity={0.85}
            >
              <Star size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.ratingBtnText}>Beri Ulasan & Bintang Toko</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={styles.cancelOrderBtn}
              onPress={() => setCancelModalVisible(true)}
              activeOpacity={0.8}
            >
              <RotateCcw size={16} color="#DC2626" />
              <Text style={styles.cancelOrderText}>Batalkan Pesanan Ini</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <TouchableOpacity
              style={styles.complaintBtn}
              onPress={() => setComplaintModalVisible(true)}
              activeOpacity={0.8}
            >
              <AlertTriangle size={15} color="#4B5563" />
              <Text style={styles.complaintBtnText}>Ajukan Komplain / Refund</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Invoice Modal */}
      <FormalInvoiceModal
        visible={invoiceVisible}
        onClose={() => setInvoiceVisible(false)}
        data={invoiceData}
      />

      {/* Chat Modal */}
      {chatVisible && (
        <CustomerChatModal
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
          orderId={order._id}
          participantName={order.driverName || "Kurir"}
          participantType="driver"
        />
      )}

      {/* Cancel Order Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Batalkan Pesanan?</Text>
            <Text style={styles.modalSub}>
              Stok produk akan dikembalikan ke toko dan poin yang telah digunakan akan dikembalikan ke saldo Anda.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Alasan pembatalan..."
              placeholderTextColor="#9CA3AF"
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Ya, Batalkan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={ratingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Beri Bintang & Ulasan</Text>
            <Text style={styles.modalSub}>Bagikan kepuasan belanja Anda di {order.storeName}:</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRatingStars(s)}>
                  <Star
                    size={32}
                    color="#F59E0B"
                    fill={s <= ratingStars ? "#F59E0B" : "none"}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Tulis ulasan Anda tentang kualitas barang & pengantaran..."
              placeholderTextColor="#9CA3AF"
              value={ratingReview}
              onChangeText={setRatingReview}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSubmitRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Kirim Ulasan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complaint Modal */}
      <Modal visible={complaintModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajukan Komplain Pesanan</Text>
            <Text style={styles.modalSub}>
              Jelaskan masalah produk (rusak, tidak lengkap, salah kirim) untuk diproses oleh customer service:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Alasan utama komplain..."
              placeholderTextColor="#9CA3AF"
              value={complaintReason}
              onChangeText={setComplaintReason}
            />

            <TextInput
              style={[styles.modalInput, { marginTop: 8, minHeight: 70 }]}
              placeholder="Detail penjelasan masalah..."
              placeholderTextColor="#9CA3AF"
              value={complaintDetail}
              onChangeText={setComplaintDetail}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setComplaintModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleSubmitComplaint}
                disabled={submittingComplaint}
              >
                {submittingComplaint ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Kirim Komplain</Text>
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
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
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
  navTitleCol: {
    alignItems: "center",
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  navSub: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
  },
  invoiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  substitutionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  subBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  subBannerDesc: {
    fontSize: 11,
    color: "#78350F",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  storeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  storeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  storeAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  itemsList: {
    marginTop: 10,
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  itemBullet: {
    width: 24,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemNote: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  outOfStockNotice: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 2,
  },
  replacementNotice: {
    fontSize: 10,
    color: "#0284C7",
    fontWeight: "600",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  proofsRow: {
    flexDirection: "row",
    gap: 12,
  },
  proofItem: {
    flex: 1,
  },
  proofImg: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    resizeMode: "cover",
  },
  proofLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
    lineHeight: 18,
  },
  deliveryNoteText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 6,
    fontStyle: "italic",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  calcVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  calcDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  calcTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  calcTotalVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15803D",
  },
  actionsSection: {
    gap: 8,
    marginTop: 6,
  },
  ratingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    borderRadius: 12,
  },
  ratingBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelOrderText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  complaintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 12,
  },
  complaintBtnText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "500",
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
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 16,
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
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalConfirmBtn: {
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
