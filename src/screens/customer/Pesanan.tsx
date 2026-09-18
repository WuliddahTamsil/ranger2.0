import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from "react-native";
import {
  ShoppingBag,
  Store,
  Coffee,
  Wind,
  Building,
  Truck,
  Star,
  MapPin,
  Clock,
  X,
  Navigation,
  Bike,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  PlayCircle,
  Plus,
  Wallet,
  QrCode,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  DollarSign,
  CheckCircle,
} from "lucide-react-native";
import { OrderItem } from "../../types";
import { rp } from "../../utils/formatters";
import { CustomerChatModal } from "./CustomerChatModal";
import { AuthAccount } from "../auth/authTypes";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";
import { FormalInvoiceModal, InvoiceData, InvoiceItemDetail } from "../../components/FormalInvoiceModal";
import * as ImagePicker from "expo-image-picker";
import {
  cancelMarketplaceOrder,
  createCustomerReview,
  submitMarketplaceComplaint,
  uploadFileToBackend,
} from "../../services/api";
import { MarketplaceDigitalPaymentModal } from "../../components/MarketplaceDigitalPaymentModal";

interface PesananProps {
  orders: OrderItem[];
  setOrders: (orders: OrderItem[]) => void;
  reviews: any[];
  setReviews: (reviews: any[]) => void;
  authAccount?: AuthAccount | null;
  ordersLoading?: boolean;
  ordersLoadError?: string;
  onRetryOrders?: () => void;
  onOpenRideTracking?: () => void;
  onOpenCateringTracking?: () => void;
  onOpenCateringQris?: () => void;
  navigate?: (screen: any) => void;
}

interface ReviewMediaDraft {
  uri: string;
  type: "image" | "video";
  name: string;
  mimeType?: string;
}

export const Pesanan: React.FC<PesananProps> = ({
  orders,
  setOrders,
  reviews,
  setReviews,
  authAccount,
  ordersLoading = false,
  ordersLoadError = "",
  onRetryOrders,
  onOpenRideTracking,
  onOpenCateringTracking,
  onOpenCateringQris,
  navigate,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [chatTarget, setChatTarget] = useState<{ orderId: string; participantName: string; participantType: "driver" | "merchant" } | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  useEffect(() => {
    if (!selectedOrder) return;
    const latestOrder = orders.find((order) => order.id === selectedOrder.id);
    if (latestOrder && JSON.stringify(latestOrder) !== JSON.stringify(selectedOrder)) {
      setSelectedOrder(latestOrder);
    }
  }, [orders, selectedOrder?.id]);

  // Review states
  const [ratingVal, setRatingVal] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [reviewMedia, setReviewMedia] = useState<ReviewMediaDraft[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Cancellation states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<OrderItem | null>(null);
  const [cancelReason, setCancelReason] = useState("Ingin mengubah rincian pesanan");
  const [cancelDetail, setCancelDetail] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Complaint states
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [orderToComplain, setOrderToComplain] = useState<OrderItem | null>(null);
  const [complaintReason, setComplaintReason] = useState("Barang Rusak / Cacat");
  const [complaintDetail, setComplaintDetail] = useState("");
  const [complaintPhotos, setComplaintPhotos] = useState<string[]>([]);
  const [complaintBank, setComplaintBank] = useState("BCA");
  const [complaintAccount, setComplaintAccount] = useState("");
  const [complaintHolder, setComplaintHolder] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Digital payment modal states
  const [digitalPaymentModalVisible, setDigitalPaymentModalVisible] = useState(false);
  const [digitalPaymentOrder, setDigitalPaymentOrder] = useState<any | null>(null);

  const handleOpenMarketplacePayment = (order: OrderItem) => {
    const raw = order as any;
    setDigitalPaymentOrder({
      id: order.id,
      _id: order.id,
      orderCode: order.orderCode || `#${order.id}`,
      totalAmount: order.total,
      total: order.total,
      paymentMethod: raw.paymentMethod || "qris",
      paymentDetails: raw.paymentDetails || {},
      storeName: raw.storeName || order.item,
    });
    setDigitalPaymentModalVisible(true);
  };

  const handleOpenCancelModal = (order: OrderItem) => {
    setOrderToCancel(order);
    setCancelReason("Ingin mengubah rincian pesanan");
    setCancelDetail("");
    setCancelModalVisible(true);
  };

  const handleCancelMarketplaceOrder = async () => {
    if (!orderToCancel) return;
    const finalReason = cancelDetail.trim() ? `${cancelReason} - ${cancelDetail.trim()}` : cancelReason;
    setSubmittingCancel(true);
    try {
      const res = await cancelMarketplaceOrder(orderToCancel.id, finalReason, authAccount?.id);
      if (!res.success) {
        throw new Error(res.message || "Gagal membatalkan pesanan");
      }
      setOrders(orders.map((o) => o.id === orderToCancel.id ? {
        ...o,
        status: "Dibatalkan",
        cancellation: res.data?.cancellation || { reason: finalReason, cancelledBy: "customer", cancelledAt: new Date() },
        refund: res.data?.refund,
        paymentStatus: res.data?.paymentStatus || o.paymentStatus,
      } : o));
      setCancelModalVisible(false);
      setOrderToCancel(null);
      const isRefunded = res.data?.refund?.status === "REFUNDED" || res.data?.refund?.status === "PENDING";
      Alert.alert(
        "Pesanan Dibatalkan",
        isRefunded
          ? `Pesanan berhasil dibatalkan dan stok produk telah dikembalikan otomatis. Refund otomatis sebesar ${rp(res.data?.refund?.amount || orderToCancel.total)} sedang diproses.`
          : "Pesanan berhasil dibatalkan dan stok produk telah dikembalikan otomatis."
      );
      if (onRetryOrders) onRetryOrders();
    } catch (err: any) {
      Alert.alert("Gagal Membatalkan", err?.message || "Terjadi kesalahan saat membatalkan pesanan.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleOpenComplaintModal = (order: OrderItem) => {
    setOrderToComplain(order);
    setComplaintReason("Barang Rusak / Cacat");
    setComplaintDetail("");
    setComplaintPhotos([]);
    setComplaintBank("BCA");
    setComplaintAccount("");
    setComplaintHolder(authAccount?.name || "");
    setComplaintModalVisible(true);
  };

  const handlePickComplaintPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Akses", "Aplikasi membutuhkan izin galeri untuk memilih foto bukti.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        const fileName = `complaint-${Date.now()}.jpg`;
        const mimeType = "image/jpeg";
        const uploadRes = await uploadFileToBackend(uri, fileName, mimeType);
        if (uploadRes.success && uploadRes.data?.url) {
          setComplaintPhotos((prev) => [...prev, uploadRes.data.url]);
        } else {
          Alert.alert("Gagal Upload", uploadRes.message || "Gagal mengunggah foto bukti.");
        }
      }
    } catch (e: any) {
      Alert.alert("Gagal Memilih Foto", e?.message || "Terjadi kendala.");
    }
  };

  const handleSubmitComplaint = async () => {
    if (!orderToComplain) return;
    if (!complaintDetail.trim()) {
      Alert.alert("Detail Wajib Diisi", "Mohon jelaskan secara rinci permasalahan barang atau pengiriman.");
      return;
    }
    setSubmittingComplaint(true);
    try {
      const res = await submitMarketplaceComplaint(orderToComplain.id, {
        reason: complaintReason,
        detail: complaintDetail.trim(),
        photos: complaintPhotos,
        solutionRequested: "refund",
        bankDetails: {
          bankName: complaintBank,
          accountNumber: complaintAccount.trim(),
          accountHolder: complaintHolder.trim(),
        },
      }, authAccount?.id);
      if (!res.success) {
        throw new Error(res.message || "Gagal mengajukan komplain");
      }
      setOrders(orders.map((o) => o.id === orderToComplain.id ? {
        ...o,
        complaint: res.data?.complaint || {
          status: "Diajukan",
          reason: complaintReason,
          detail: complaintDetail.trim(),
          photos: complaintPhotos,
          createdAt: new Date(),
        },
      } : o));
      setComplaintModalVisible(false);
      setOrderToComplain(null);
      Alert.alert("Komplain Terkirim", "Komplain Anda berhasil diteruskan ke pemilik toko untuk diverifikasi.");
      if (onRetryOrders) onRetryOrders();
    } catch (err: any) {
      Alert.alert("Gagal Mengajukan Komplain", err?.message || "Terjadi kesalahan jaringan.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 0: // Aktif
        return orders.filter(
          (o) => o.status !== "Selesai" && !o.status.toLowerCase().includes("batal")
        );
      case 1: // Selesai
        return orders.filter((o) => o.status === "Selesai");
      case 2: // Dibatalkan
        return orders.filter((o) => o.status.toLowerCase().includes("batal"));
      default:
        return orders;
    }
  };

  const getServiceIcon = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("market")) {
      return { icon: Store, fg: "#1B7A4E", bg: "#E8F5EE" };
    } else if (normalized.includes("cater")) {
      return { icon: Coffee, fg: "#EA580C", bg: "#FFEDD5" };
    } else if (normalized.includes("laund")) {
      return { icon: Wind, fg: "#0284C7", bg: "#E0F2FE" };
    } else if (normalized.includes("kos")) {
      return { icon: Building, fg: "#9333EA", bg: "#F3E8FF" };
    } else if (normalized.includes("ride")) {
      return { icon: Bike, fg: "#1B7A4E", bg: "#E8F5EE" };
    } else {
      return { icon: Truck, fg: "#D97706", bg: "#FEF3C7" };
    }
  };

  const getStatusColors = (status: string) => {
    const s = status.toLowerCase();
    if (s === "dikirim" || s.includes("menuju") || s.includes("perjalanan") || s.includes("mencari") || s.includes("sampai")) {
      return { fg: "#2563EB", bg: "#EFF6FF" };
    } else if (s.includes("batal")) {
      return { fg: "#B91C1C", bg: "#FEE2E2" };
    } else if (s === "selesai" || s === "aktif") {
      return { fg: "#1B7A4E", bg: "#E8F5EE" };
    }
    return { fg: "#D97706", bg: "#FEF3C7" };
  };

  const handleOpenReview = (order: OrderItem) => {
    setSelectedOrder(order);
    setRatingVal(5);
    setCommentText("");
    setReviewMedia([]);
    setReviewModalVisible(true);
  };

  const pickReviewMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri untuk menambahkan foto atau video ke ulasan.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (result.canceled) return;
    const selected = result.assets.map((asset, index) => ({
      uri: asset.uri,
      type: asset.type === "video" ? "video" as const : "image" as const,
      name: asset.fileName || `review-${Date.now()}-${index}.${asset.type === "video" ? "mp4" : "jpg"}`,
      mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
    }));
    setReviewMedia((current) => [...current, ...selected].slice(0, 5));
  };

  const removeReviewMedia = (index: number) => {
    setReviewMedia((current) => current.filter((_, mediaIndex) => mediaIndex !== index));
  };

  const handleSaveReview = async () => {
    if (!selectedOrder || !authAccount?.id || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const uploadedMedia: Array<{ url: string; type: "image" | "video"; name: string }> = [];
      for (const [index, media] of reviewMedia.entries()) {
        const uploadResult = await uploadFileToBackend(media.uri, media.name || `review-${Date.now()}-${index}`, media.mimeType || "image/jpeg");
        if (!uploadResult.success || !uploadResult.data?.url) {
          throw new Error(uploadResult.message || "Media ulasan gagal diunggah");
        }
        uploadedMedia.push({ url: uploadResult.data.url, type: media.type, name: media.name });
      }

      const result = await createCustomerReview({
        orderId: selectedOrder.id,
        orderType: selectedOrder.type,
        customerId: authAccount.id,
        customerName: authAccount.name,
        rating: ratingVal,
        comment: commentText.trim(),
        media: uploadedMedia,
        productIds: (selectedOrder.items || []).map((item: any) => item.productId).filter(Boolean),
      });
      if (!result.success) throw new Error(result.message || "Ulasan gagal disimpan");

      const savedReview = { ...result.data, id: result.data?._id || result.data?.id || `REV-${Date.now()}` };
      setReviews([savedReview, ...reviews]);
      setReviewModalVisible(false);
      Alert.alert("Terima Kasih", "Ulasan dan media berhasil disimpan secara permanen.");
    } catch (error: any) {
      Alert.alert("Ulasan belum tersimpan", error?.message || "Periksa koneksi internet lalu coba lagi.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenTracking = (order: OrderItem) => {
    if (order.type?.toLowerCase().includes("ride")) {
      if (navigate) {
        navigate("c_ride_tracking");
        return;
      }
      if (onOpenRideTracking) {
        onOpenRideTracking();
        return;
      }
    }
    setSelectedOrder(order);
    setTrackModalVisible(true);
  };

  const handleOpenChat = (order: OrderItem, targetType: "driver" | "merchant" = "merchant") => {
    const normalizedType = order.type.toLowerCase();
    const isRide = normalizedType.includes("ride");
    const isLaundryDriver = normalizedType.includes("laund") && order.status.toLowerCase().includes("kirim");
    const resolvedType = targetType === "driver" || isLaundryDriver || isRide ? "driver" : "merchant";
    
    let participantName = "";
    if (resolvedType === "driver") {
      participantName = (order as any).driverName
        ? (isRide ? `${(order as any).driverName} (Driver Kanyaah Ride)` : `${(order as any).driverName} (Kurir)`)
        : (isRide ? "Driver Kanyaah Ride" : "Kurir GEOVERSE");
    } else {
      participantName = normalizedType.includes("kos")
        ? "Pemilik Kos"
        : (order as any).storeName || order.detail.split(" • ")[0] || order.item || order.type;
    }

    setChatTarget({
      orderId: order.id,
      participantName,
      participantType: resolvedType,
    });
  };

  const handleOpenInvoice = (order: OrderItem) => {
    const raw = order as any;
    const cleanId = (order.id || "").replace(/^#/, "");
    const formattedId = cleanId.length >= 8 ? cleanId.slice(-8).toUpperCase() : cleanId.toUpperCase();

    // Map items
    let parsedItems: InvoiceItemDetail[] = [];
    if (raw.items && Array.isArray(raw.items) && raw.items.length > 0) {
      parsedItems = raw.items.map((i: any) => ({
        name: i.name || i.title || order.item,
        quantity: Number(i.quantity || i.qty) || 1,
        price: Number(i.price) || (order.total / (Number(i.quantity || i.qty) || 1)),
        total: (Number(i.quantity || i.qty) || 1) * (Number(i.price) || order.total),
      }));
    } else {
      let qty = 1;
      const qtyMatch = order.detail?.match(/\((\d+)x\)/);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
      }
      const itemPrice = qty > 0 ? Math.round((order.total - (order.deliveryFee || 0) - (order.serviceFee || 0)) / qty) : order.total;
      
      parsedItems = [
        {
          name: order.type.toLowerCase().includes("ride") ? "Layanan Kanyaah Ride" : order.item || "Pesanan GEOVERSE",
          quantity: qty,
          price: itemPrice > 0 ? itemPrice : order.total,
          total: itemPrice > 0 ? itemPrice * qty : order.total,
        },
      ];
    }

    const customerAddressStr = typeof order.address === "string"
      ? order.address
      : order.address?.fullAddress || undefined;

    const isCanceled = order.status.toLowerCase().includes("batal");

    const invoiceData: InvoiceData = {
      id: order.id,
      invoiceNumber: `INV/GEO-${formattedId}`,
      date: order.date || undefined,
      time: raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : undefined,
      status: order.status,
      orderType: order.type,
      storeName: raw.storeName || raw.store || (order.type.toLowerCase().includes("cater") ? "Mitra Catering" : "Mitra Marketplace"),
      storeAddress: raw.storeAddress || undefined,
      customerName: authAccount?.name || raw.customer || "Pelanggan",
      customerPhone: authAccount?.phone || raw.customerPhone || undefined,
      customerAddress: customerAddressStr,
      driverName: raw.driverName || raw.driver?.name || undefined,
      driverVehicle: raw.driverVehicle || raw.driver?.vehicle || undefined,
      driverPlate: raw.driverPlate || raw.driver?.plateNumber || undefined,
      items: parsedItems,
      subtotal: Number(raw.subtotal ?? (order.total - (order.deliveryFee || 0) - (order.serviceFee || 0) + (order.discount || 0))),
      deliveryFee: Number(order.deliveryFee ?? 0),
      serviceFee: Number(order.serviceFee ?? 0),
      discount: Number(order.discount ?? 0),
      total: order.total,
      paymentMethod: order.paymentMethod || undefined,
      paymentStatus: order.paymentStatus || (isCanceled ? "Dibatalkan" : undefined),
    };

    setSelectedInvoice(invoiceData);
    setInvoiceModalVisible(true);
  };

  const currentList = getFilteredOrders();

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header title */}
      <View style={styles.header}>
        <Text style={styles.title}>Pesanan Saya</Text>
      </View>

      {/* Tabs selectors row */}
      <View style={styles.tabsRow}>
        {["Aktif", "Selesai", "Dibatalkan"].map((tabLabel, idx) => {
          const active = activeTab === idx;
          const count = 
            idx === 0 ? orders.filter((o) => o.status !== "Selesai" && !o.status.toLowerCase().includes("batal")).length :
            idx === 1 ? orders.filter((o) => o.status === "Selesai").length :
            orders.filter((o) => o.status.toLowerCase().includes("batal")).length;

          return (
            <TouchableOpacity
              key={idx}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(idx)}
            >
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                {tabLabel} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {ordersLoadError ? (
        <View style={{ marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }}>
          <Text style={{ color: "#9A3412", fontSize: 12, lineHeight: 17 }}>{orders.length ? "Pesanan belum berhasil diperbarui. Data terakhir tetap ditampilkan." : ordersLoadError}</Text>
          {onRetryOrders ? <TouchableOpacity onPress={onRetryOrders} style={{ alignSelf: "flex-start", marginTop: 8 }}><Text style={{ color: "#C2410C", fontSize: 12, fontWeight: "700" }}>Coba lagi</Text></TouchableOpacity> : null}
        </View>
      ) : null}

      {/* FlatList of orders */}
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const config = getServiceIcon(item.type);
          const IconComp = config.icon;
          const statusStyle = getStatusColors(item.status);
          const isCompleted = item.status === "Selesai";
          const hasReviewed = reviews.some((r) => r.orderId === item.id);
          const hasDriver = Boolean(
            (item as any).driverName ||
            (item as any).driverId
          );

          return (
            <TouchableOpacity
              style={styles.orderCard}
              activeOpacity={0.92}
              onPress={() => {
                if (item.type.toLowerCase().includes("ride") && !isCompleted && !item.status.toLowerCase().includes("batal") && onOpenRideTracking) {
                  onOpenRideTracking();
                } else {
                  handleOpenInvoice(item);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.serviceIconBg, { backgroundColor: config.bg }]}>
                  <IconComp size={20} color={config.fg} />
                </View>

                <View style={styles.cardHeaderBody}>
                  <Text style={styles.orderTitle} numberOfLines={1}>
                    {item.orderCode ? item.orderCode : `#${item.id}`} · {item.type}
                  </Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.item}
                  </Text>
                  <Text style={styles.itemDetail} numberOfLines={item.type.toLowerCase().includes("ride") ? 2 : 1}>
                    {item.detail}
                  </Text>
                </View>

                <View style={styles.cardHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                      {item.status}
                    </Text>
                  </View>
                  {item.type.toLowerCase().includes("market") && (
                    <View style={[styles.paymentMethodPill, {
                      backgroundColor: ((item as any).paymentMethod === "cod" || item.paymentStatus === "Lunas") ? "#ECFDF5" : "#FEF3C7"
                    }]}>
                      <Text style={[styles.paymentMethodPillText, {
                        color: ((item as any).paymentMethod === "cod" || item.paymentStatus === "Lunas") ? "#059669" : "#D97706"
                      }]}>
                        {(item as any).paymentMethod === "cod"
                          ? "COD"
                          : item.paymentStatus === "Lunas"
                          ? "Lunas"
                          : "Belum Bayar"}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.invoiceHintPill}
                    onPress={() => handleOpenInvoice(item)}
                    activeOpacity={0.7}
                  >
                    <FileText size={10} color="#0D7A53" />
                    <Text style={styles.invoiceHintText}>Lihat Faktur</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Complaint Banner for Marketplace */}
              {item.type.toLowerCase().includes("market") && (item as any).complaint && (item as any).complaint.status && (item as any).complaint.status !== "None" && (
                <View style={[
                  styles.complaintBanner,
                  (item as any).complaint.status === "Disetujui"
                    ? styles.complaintBannerApproved
                    : (item as any).complaint.status === "Ditolak"
                    ? styles.complaintBannerRejected
                    : styles.complaintBannerPending
                ]}>
                  <View style={styles.complaintBannerHeader}>
                    <AlertTriangle size={14} color={
                      (item as any).complaint.status === "Disetujui"
                        ? "#059669"
                        : (item as any).complaint.status === "Ditolak"
                        ? "#DC2626"
                        : "#D97706"
                    } />
                    <Text style={[styles.complaintBannerTitle, {
                      color: (item as any).complaint.status === "Disetujui"
                        ? "#059669"
                        : (item as any).complaint.status === "Ditolak"
                        ? "#DC2626"
                        : "#D97706"
                    }]}>
                      {(item as any).complaint.status === "Disetujui"
                        ? "Komplain Diterima · Refund Diproses"
                        : (item as any).complaint.status === "Ditolak"
                        ? "Komplain Ditolak Toko"
                        : "Komplain Sedang Ditinjau Toko"}
                    </Text>
                  </View>
                  <Text style={styles.complaintBannerText} numberOfLines={2}>
                    {(item as any).complaint.reason || "Pengajuan komplain"}
                    {(item as any).complaint.resolutionNotes ? ` • Solusi: ${(item as any).complaint.resolutionNotes}` : ""}
                  </Text>
                  {(item as any).refund?.amount ? (
                    <Text style={styles.complaintRefundAmount}>
                      Nominal Refund: {rp((item as any).refund.amount)} ({(item as any).refund.status || "Diproses"})
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Cancellation Banner for Marketplace */}
              {item.type.toLowerCase().includes("market") && item.status.toLowerCase().includes("batal") && (item as any).cancellation && (
                <View style={styles.cancellationBanner}>
                  <View style={styles.cancellationHeader}>
                    <RotateCcw size={13} color="#DC2626" />
                    <Text style={styles.cancellationTitle}>
                      Dibatalkan oleh {(item as any).cancellation.cancelledBy === "owner" ? "Pemilik Toko" : "Pelanggan"}
                    </Text>
                  </View>
                  <Text style={styles.cancellationReason}>
                    Alasan: {(item as any).cancellation.reason || "Dibatalkan"}
                  </Text>
                  {(item as any).refund && (item as any).refund.status !== "None" && (
                    <View style={styles.refundInfoRow}>
                      <DollarSign size={13} color="#059669" />
                      <Text style={styles.refundInfoText}>
                        Refund: {rp((item as any).refund.amount || item.total)} ({(item as any).refund.status === "REFUNDED" ? "Lunas" : "Diproses"})
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {Boolean(item.remainingAmount && item.remainingAmount > 0) && (
                <View style={styles.paymentReminderBox}>
                  <View style={styles.paymentReminderHeader}>
                    <Text style={styles.paymentReminderTitle}>Belum lunas</Text>
                    <Text style={styles.paymentReminderAmount}>Sisa {rp(item.remainingAmount || 0)}</Text>
                  </View>
                  <Text style={styles.paymentReminderText}>
                    {item.paymentReminder || "Segera lunasi sisa pembayaran sebelum pesanan dikirim."}
                  </Text>
                  {item.paymentDueDate && <Text style={styles.paymentReminderDue}>Batas pelunasan: {item.paymentDueDate}</Text>}
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.cardPriceRow}>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateLabel}>Tanggal Pesanan</Text>
                    <Text style={styles.dateText}>{item.date}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.totalLabel}>Total Bayar</Text>
                    <Text style={styles.totalValue}>{rp(item.total)}</Text>
                  </View>
                </View>

                <View style={styles.cardActionDivider} />

                <View style={styles.actionBtnRow}>
                  {isCompleted ? (
                    // === TAB SELESAI (Completed Orders) ===
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnInvoice]}
                        onPress={() => handleOpenInvoice(item)}
                        activeOpacity={0.8}
                      >
                        <FileText size={13} color="#0D7A53" />
                        <Text style={styles.actionBtnTextInvoice}>Lihat Faktur</Text>
                      </TouchableOpacity>

                      {item.type.toLowerCase().includes("market") && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnProof]}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleOpenTracking(item);
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={item.deliveryProofUrl ? "Lihat foto bukti pengantaran" : "Lihat status pesanan"}
                        >
                          <ImageIcon size={13} color="#0D7A53" />
                          <Text style={styles.actionBtnTextInvoice}>{item.deliveryProofUrl ? "Bukti Foto" : "Lacak Pesanan"}</Text>
                        </TouchableOpacity>
                      )}

                      {item.type.toLowerCase().includes("cater") && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnProof]}
                          onPress={(event) => {
                            event.stopPropagation();
                            if (onOpenCateringQris) {
                              onOpenCateringQris();
                            } else if (navigate) {
                              navigate("c_catering_qris");
                            }
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel="Buka halaman pembayaran QRIS"
                        >
                          <QrCode size={13} color="#0D7A53" />
                          <Text style={styles.actionBtnTextInvoice}>Bayar QRIS</Text>
                        </TouchableOpacity>
                      )}

                      {item.type.toLowerCase().includes("ride") ? (
                        hasDriver && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutlineGray]}
                            onPress={() => handleOpenChat(item, "driver")}
                          >
                            <Bike size={13} color="#4B5563" />
                            <Text style={styles.actionBtnTextGray}>Chat Driver</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnOutlineGray]}
                          onPress={() => handleOpenChat(item, "merchant")}
                        >
                          <Store size={13} color="#4B5563" />
                          <Text style={styles.actionBtnTextGray}>Chat Toko</Text>
                        </TouchableOpacity>
                      )}

                      {item.type.toLowerCase().includes("market") && (!(item as any).complaint || (item as any).complaint?.status === "None") && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnComplaint]}
                          onPress={() => handleOpenComplaintModal(item)}
                          activeOpacity={0.8}
                        >
                          <ShieldAlert size={13} color="#D97706" />
                          <Text style={styles.actionBtnTextComplaint}>Komplain</Text>
                        </TouchableOpacity>
                      )}

                      {!hasReviewed ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnReview]}
                          onPress={() => handleOpenReview(item)}
                        >
                          <Star size={13} color="#D97706" />
                          <Text style={styles.actionBtnTextReview}>Beri Ulasan</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.reviewedBadge}>
                          <Star size={12} color="#16A34A" />
                          <Text style={styles.reviewedBadgeText}>Sudah Diulas</Text>
                        </View>
                      )}
                    </>
                  ) : item.status.toLowerCase().includes("batal") ? (
                    // === TAB DIBATALKAN (Cancelled Orders) ===
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnInvoice]}
                        onPress={() => handleOpenInvoice(item)}
                        activeOpacity={0.8}
                      >
                        <FileText size={13} color="#0D7A53" />
                        <Text style={styles.actionBtnTextInvoice}>Lihat Faktur</Text>
                      </TouchableOpacity>

                      {item.type.toLowerCase().includes("ride") ? (
                        hasDriver && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutlineGray]}
                            onPress={() => handleOpenChat(item, "driver")}
                          >
                            <Bike size={13} color="#4B5563" />
                            <Text style={styles.actionBtnTextGray}>Chat Driver</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnOutlineGray]}
                          onPress={() => handleOpenChat(item, "merchant")}
                        >
                          <Store size={13} color="#4B5563" />
                          <Text style={styles.actionBtnTextGray}>Chat Toko</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    // === TAB AKTIF (Active Orders in Progress) ===
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnInvoice]}
                        onPress={() => handleOpenInvoice(item)}
                        activeOpacity={0.8}
                      >
                        <FileText size={13} color="#0D7A53" />
                        <Text style={styles.actionBtnTextInvoice}>Lihat Faktur</Text>
                      </TouchableOpacity>

                      {item.type.toLowerCase().includes("ride") ? (
                        <>
                          {hasDriver && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnDriver]}
                              onPress={() => handleOpenChat(item, "driver")}
                            >
                              <Bike size={13} color="#1B7A4E" />
                              <Text style={styles.actionBtnTextDriver}>Chat Driver</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSolid]}
                            onPress={() => {
                              if (onOpenRideTracking) {
                                onOpenRideTracking();
                              } else {
                                handleOpenTracking(item);
                              }
                            }}
                          >
                            <Navigation size={13} color="#FFFFFF" />
                            <Text style={styles.actionBtnTextSolid}>Lacak Perjalanan</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          {hasDriver ? (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnDriver]}
                              onPress={() => handleOpenChat(item, "driver")}
                            >
                              <Bike size={13} color="#1B7A4E" />
                              <Text style={styles.actionBtnTextDriver}>Chat Kurir</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnMerchantActive]}
                              onPress={() => handleOpenChat(item, "merchant")}
                            >
                              <Store size={13} color="#EA580C" />
                              <Text style={styles.actionBtnTextMerchantActive}>Chat Toko</Text>
                            </TouchableOpacity>
                          )}

                          {item.type.toLowerCase().includes("market") && (item as any).paymentMethod !== "cod" && item.paymentStatus !== "Lunas" && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnPayNow]}
                              onPress={() => handleOpenMarketplacePayment(item)}
                              activeOpacity={0.85}
                            >
                              <Wallet size={13} color="#FFFFFF" />
                              <Text style={styles.actionBtnTextPayNow}>Bayar</Text>
                            </TouchableOpacity>
                          )}

                          {item.type.toLowerCase().includes("market") && item.status === "Menunggu" && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnCancel]}
                              onPress={() => handleOpenCancelModal(item)}
                              activeOpacity={0.8}
                            >
                              <RotateCcw size={13} color="#DC2626" />
                              <Text style={styles.actionBtnTextCancel}>Batalkan</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSolid]}
                            onPress={() => {
                              if (item.type.toLowerCase().includes("cater") && onOpenCateringTracking) {
                                onOpenCateringTracking();
                              } else {
                                handleOpenTracking(item);
                              }
                            }}
                          >
                            {item.type.toLowerCase().includes("cater") && Number(item.remainingAmount || 0) > 0 ? (
                              <Wallet size={13} color="#FFFFFF" />
                            ) : (
                              <Navigation size={13} color="#FFFFFF" />
                            )}
                            <Text style={styles.actionBtnTextSolid}>
                              {item.type.toLowerCase().includes("cater") && Number(item.remainingAmount || 0) > 0 ? "Lunasi & Lacak" : "Lacak"}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {ordersLoading ? "Memuat pesanan…" : activeTab === 0 ? "Belum ada pesanan aktif" : activeTab === 1 ? "Belum ada pesanan selesai" : "Belum ada pesanan dibatalkan"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {ordersLoadError && !ordersLoading ? "Riwayat belum berhasil diambil dari server. Coba lagi setelah koneksi tersedia." : "Semua orderan dari layanan yang Anda pesan akan terpantau statusnya di halaman ini."}
            </Text>
            {ordersLoadError && !ordersLoading && onRetryOrders ? <TouchableOpacity onPress={onRetryOrders} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: "#1B7A4E" }}><Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>Coba lagi</Text></TouchableOpacity> : null}
          </View>
        }
      />

      {/* 1. Lacak Order Full Page */}
      {selectedOrder && (
        <Modal 
          visible={trackModalVisible} 
          transparent={false} 
          animationType="slide"
          onRequestClose={() => setTrackModalVisible(false)}
        >
          <ResponsiveSafeAreaView style={styles.fullPageContainer}>
            {/* Full Page Header */}
            <View style={styles.fullPageHeader}>
              <TouchableOpacity 
                style={styles.fullPageBackBtn} 
                onPress={() => setTrackModalVisible(false)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.fullPageHeaderCopy}>
                <Text style={styles.fullPageHeaderTitle}>Lacak Pesanan</Text>
                <Text style={styles.fullPageHeaderSubtitle} numberOfLines={1}>
                  {(selectedOrder as any).orderCode || `#${selectedOrder.id}`} • {selectedOrder.item}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColors(selectedOrder.status).bg }]}>
                <Text style={[styles.statusBadgeText, { color: getStatusColors(selectedOrder.status).fg }]}>
                  {selectedOrder.status}
                </Text>
              </View>
            </View>

            <ScrollView 
              style={styles.fullPageScroll} 
              contentContainerStyle={styles.fullPageScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Real Interactive Google Maps (Spacious full width & 280 height) */}
              <View style={styles.mapCardWrapper}>
                <LiveOrderTrackingMap
                  storeName={(selectedOrder as any).storeName || selectedOrder.detail.split(" • ")[0] || "Mitra Toko"}
                  storeAddress={(selectedOrder as any).storeAddress || ""}
                  customerAddress={typeof selectedOrder.address === "string" ? selectedOrder.address : selectedOrder.address?.fullAddress || ""}
                  driverName={(selectedOrder as any).driverName}
                  driverVehicle={(selectedOrder as any).driverVehicle}
                  orderStatus={selectedOrder.status}
                  height={280}
                  marketplaceMode={selectedOrder.type.toLowerCase().includes("market")}
                />
              </View>

              {/* Courier Info Card (if driver assigned) */}
              {Boolean((selectedOrder as any).driverName || (selectedOrder as any).driverId || ["Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim"].includes(selectedOrder.status)) && (
                <View style={styles.driverHighlightCard}>
                  <View style={styles.driverAvatarCircle}>
                    <Bike size={22} color="#1B7A4E" />
                  </View>
                  <View style={styles.driverInfoBody}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.driverHighlightName}>
                        {(selectedOrder as any).driverName || (selectedOrder.type === "Kanyaah Ride" ? "Driver Kanyaah Ride" : "Kurir GEOVERSE")}
                      </Text>
                      <View style={styles.driverRoleTag}>
                        <Text style={styles.driverRoleTagText}>
                          {selectedOrder.type === "Kanyaah Ride" ? "Driver Ride" : "Kurir"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.driverHighlightSub}>
                      {[(selectedOrder as any).driverVehicle, (selectedOrder as any).driverPlate].filter(Boolean).join(" • ") || "Kendaraan Driver"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.driverQuickChatBtn}
                    onPress={() => {
                      setTrackModalVisible(false);
                      handleOpenChat(selectedOrder, "driver");
                    }}
                    activeOpacity={0.8}
                  >
                    <Bike size={14} color="#FFFFFF" />
                    <Text style={styles.driverQuickChatBtnText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Dynamic Timeline status list */}
              <View style={styles.timelineCard}>
                <Text style={styles.timelineCardTitle}>Status Pengiriman</Text>

                {/* Step 1: Diterima */}
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, styles.timelineDotActive]}>
                    <CheckCircle2 size={12} color="#FFFFFF" />
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineTitle}>Pesanan Diterima</Text>
                    <Text style={styles.timelineDesc}>Pesanan telah masuk ke sistem dan dikonfirmasi.</Text>
                  </View>
                </View>
                
                <View style={[styles.timelineLine, ["Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) && styles.timelineLineActive]} />

                {/* Step 2: Disiapkan */}
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, ["Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) && styles.timelineDotActive]}>
                    {["Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) ? (
                      <CheckCircle2 size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineTitle}>Sedang Dipersiapkan</Text>
                    <Text style={styles.timelineDesc}>Mitra toko sedang memproses dan menyiapkan pesanan Anda.</Text>
                  </View>
                </View>

                <View style={[styles.timelineLine, ["Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) && styles.timelineLineActive]} />

                {/* Step 3: Siap / Kurir Menuju Dapur */}
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, ["Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) && styles.timelineDotActive]}>
                    {["Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) ? (
                      <CheckCircle2 size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineTitle}>Pesanan Siap & Alokasi Kurir</Text>
                    <Text style={styles.timelineDesc}>
                      {selectedOrder.status === "Siap"
                        ? "Pesanan sudah siap di outlet! Menunggu kurir mengambil."
                        : ["Menuju Pickup", "Sampai Pickup"].includes(selectedOrder.status)
                        ? `Kurir ${(selectedOrder as any).driverName || "GEOVERSE"} sedang menuju toko penjemputan.`
                        : "Kurir telah ditugaskan."}
                    </Text>
                  </View>
                </View>

                <View style={[styles.timelineLine, ["Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) && styles.timelineLineActive]} />

                {/* Step 4: Diantar */}
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, ["Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) && styles.timelineDotActive]}>
                    {["Diambil", "Mengantar", "Dikirim", "Selesai"].includes(selectedOrder.status) ? (
                      <CheckCircle2 size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineTitle}>Sedang Diantar Kurir</Text>
                    <Text style={styles.timelineDesc}>
                      {["Diambil", "Mengantar", "Dikirim"].includes(selectedOrder.status)
                        ? `Kurir ${(selectedOrder as any).driverName || "GEOVERSE"} sedang dalam perjalanan membawa pesanan ke lokasimu.`
                        : selectedOrder.status === "Selesai"
                        ? "Pengantaran telah diselesaikan."
                        : "Menunggu kurir memulai perjalanan."}
                    </Text>
                  </View>
                </View>

                <View style={[styles.timelineLine, selectedOrder.status === "Selesai" && styles.timelineLineActive]} />

                {/* Step 5: Selesai */}
                <View style={styles.timelineRow}>
                  <View style={[styles.timelineDot, selectedOrder.status === "Selesai" && styles.timelineDotActive]}>
                    {selectedOrder.status === "Selesai" ? <CheckCircle2 size={12} color="#FFFFFF" /> : null}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineTitle}>Pesanan Sampai di Tujuan</Text>
                    <Text style={styles.timelineDesc}>
                      {selectedOrder.status === "Selesai"
                        ? "Pesanan telah diterima. Terima kasih telah memesan!"
                        : "Kurir akan menyelesaikan pesanan saat sampai di tujuan."}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedOrder.type === "Marketplace" && selectedOrder.deliveryProofUrl ? (
                <View style={styles.deliveryProofCard}>
                  <Text style={styles.deliveryProofTitle}>Bukti Foto Pengantaran</Text>
                  <Image
                    source={{ uri: selectedOrder.deliveryProofUrl }}
                    style={styles.deliveryProofImage}
                    resizeMode="cover"
                    accessibilityLabel="Foto bukti pesanan telah diterima customer"
                  />
                </View>
              ) : null}

              {/* Actions Row */}
              <View style={styles.fullPageActionRow}>
                <TouchableOpacity
                  style={[styles.fullPageActionBtn, styles.fullPageActionBtnDriver]}
                  onPress={() => {
                    setTrackModalVisible(false);
                    handleOpenChat(selectedOrder, "driver");
                  }}
                  activeOpacity={0.8}
                >
                  <Bike size={16} color="#1B7A4E" />
                  <Text style={styles.fullPageActionBtnDriverText}>Chat Kurir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fullPageActionBtn, styles.fullPageActionBtnMerchant]}
                  onPress={() => {
                    setTrackModalVisible(false);
                    handleOpenChat(selectedOrder, "merchant");
                  }}
                  activeOpacity={0.8}
                >
                  <Store size={16} color="#EA580C" />
                  <Text style={styles.fullPageActionBtnMerchantText}>Chat Toko</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ResponsiveSafeAreaView>
        </Modal>
      )}

      {/* 2. Rating & Ulasan Full Page */}
      {selectedOrder && (
        <Modal 
          visible={reviewModalVisible} 
          transparent={false} 
          animationType="slide" 
          onRequestClose={() => setReviewModalVisible(false)}
        >
          <ResponsiveSafeAreaView style={styles.fullPageContainer}>
            {/* Full Page Header */}
            <View style={styles.fullPageHeader}>
              <TouchableOpacity 
                style={styles.fullPageBackBtn} 
                onPress={() => setReviewModalVisible(false)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.fullPageHeaderCopy}>
                <Text style={styles.fullPageHeaderTitle}>Beri Ulasan</Text>
                <Text style={styles.fullPageHeaderSubtitle} numberOfLines={1}>
                  Order #{selectedOrder.id}
                </Text>
              </View>
            </View>

            <ScrollView 
              style={styles.fullPageScroll} 
              contentContainerStyle={styles.fullPageScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Order Info Card */}
              <View style={styles.reviewOrderCard}>
                <View style={styles.reviewOrderIconBg}>
                  <ShoppingBag size={24} color="#1B7A4E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewItemName}>{selectedOrder.item}</Text>
                  <Text style={styles.reviewItemDetail}>{selectedOrder.detail}</Text>
                  <Text style={styles.reviewItemPrice}>{rp(selectedOrder.total)}</Text>
                </View>
              </View>

              {/* Rating Section Card */}
              <View style={styles.reviewRatingCard}>
                <Text style={styles.reviewRatingHeading}>Bagaimana pesanan Anda?</Text>
                <Text style={styles.reviewRatingSubheading}>
                  Ketuk bintang untuk memberi penilaian
                </Text>

                <View style={styles.starsPickerRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRatingVal(star)}
                      activeOpacity={0.7}
                      style={styles.starTouchItem}
                    >
                      <Star
                        size={40}
                        color={star <= ratingVal ? "#F59E0B" : "#D1D5DB"}
                        fill={star <= ratingVal ? "#F59E0B" : "none"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Rating description tag */}
                <View style={styles.ratingCaptionPill}>
                  <Text style={styles.ratingCaptionText}>
                    {ratingVal === 5
                      ? "⭐⭐⭐⭐⭐ Luar Biasa / Sangat Puas!"
                      : ratingVal === 4
                      ? "⭐⭐⭐⭐ Puas & Enak"
                      : ratingVal === 3
                      ? "⭐⭐⭐ Cukup / Standar"
                      : ratingVal === 2
                      ? "⭐⭐ Kurang Puas"
                      : "⭐ Sangat Kecewa"}
                  </Text>
                </View>
              </View>

              {/* Quick Tag Chips */}
              <View style={styles.reviewTagsCard}>
                <Text style={styles.reviewSectionTitle}>Pilihan Cepat (Bisa dipilih):</Text>
                <View style={styles.reviewTagGrid}>
                  {[
                    "Rasa Enak 😋",
                    "Porsi Pas 👍",
                    "Pengemasan Rapi 📦",
                    "Pengiriman Cepat ⚡",
                    "Sesuai Pesanan ✨",
                    "Pelayanan Ramah 😊",
                  ].map((tag, idx) => {
                    const isSelected = commentText.includes(tag);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.feedbackChip, isSelected && styles.feedbackChipSelected]}
                        onPress={() => {
                          if (isSelected) {
                            setCommentText(commentText.replace(tag, "").trim());
                          } else {
                            setCommentText((prev) => (prev ? `${prev}, ${tag}` : tag));
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.feedbackChipText, isSelected && styles.feedbackChipTextSelected]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Comment Text Area */}
              <View style={styles.reviewInputCard}>
                <Text style={styles.reviewSectionTitle}>Ulasan & Saran Anda</Text>
                <TextInput
                  style={styles.reviewTextArea}
                  multiline
                  numberOfLines={5}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Ceritakan detail pengalaman Anda mengenai rasa makanan, kebersihan kemasan, atau pelayanan kurir..."
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.reviewMediaCard}>
                <Text style={styles.reviewSectionTitle}>Tambahkan foto atau video</Text>
                <Text style={styles.reviewMediaHint}>Bantu pengguna lain melihat pengalamanmu secara lebih nyata.</Text>
                {reviewMedia.length > 0 && (
                  <View style={styles.reviewMediaGrid}>
                    {reviewMedia.map((media, index) => (
                      <View key={`${media.uri}-${index}`} style={styles.reviewMediaItem}>
                        {media.type === "image" ? <Image source={{ uri: media.uri }} style={styles.reviewMediaPreview} /> : <View style={styles.reviewVideoPreview}><PlayCircle size={25} color="#FFFFFF" /><Text style={styles.reviewVideoLabel}>VIDEO</Text></View>}
                        <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeReviewMedia(index)}><X size={13} color="#FFFFFF" /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {reviewMedia.length < 5 && (
                  <TouchableOpacity style={styles.addReviewMediaButton} onPress={pickReviewMedia} activeOpacity={0.8}>
                    <Plus size={17} color="#1B7A4E" />
                    <Text style={styles.addReviewMediaText}>{reviewMedia.length > 0 ? "Tambah media lagi" : "Pilih dari perangkat"}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.reviewMediaLimit}>Maksimal 5 foto/video · video maksimal 30 detik</Text>
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                style={[styles.submitReviewBtn, isSubmittingReview && styles.submitReviewBtnDisabled]}
                onPress={handleSaveReview}
                disabled={isSubmittingReview}
                activeOpacity={0.8}
              >
                <Text style={styles.submitReviewBtnText}>{isSubmittingReview ? "Menyimpan Ulasan..." : "Kirim Ulasan Sekarang"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </ResponsiveSafeAreaView>
        </Modal>
      )}

      {chatTarget && (
        <CustomerChatModal
          visible={Boolean(chatTarget)}
          onClose={() => setChatTarget(null)}
          orderId={chatTarget.orderId}
          customerId={authAccount?.id}
          participantName={chatTarget.participantName}
          participantType={chatTarget.participantType}
          initialMessage={
            chatTarget.participantType === "driver"
              ? "Halo Pak Kurir, saya customer pesanan ini."
              : "Halo Toko, ada yang ingin saya tanyakan mengenai pesanan ini."
          }
        />
      )}

      <FormalInvoiceModal
        visible={invoiceModalVisible}
        onClose={() => setInvoiceModalVisible(false)}
        data={selectedInvoice}
      />

      {/* Marketplace Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Batalkan Pesanan</Text>
                <Text style={styles.sheetSubtitle}>
                  {orderToCancel ? `Pesanan ${orderToCancel.orderCode || `#${orderToCancel.id}`}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Pilih Alasan Pembatalan:</Text>
              {[
                "Ingin mengubah rincian pesanan",
                "Alamat pengiriman salah",
                "Waktu pengantaran terlalu lama",
                "Menemukan harga lebih murah",
                "Lainnya",
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, cancelReason === reason && styles.reasonOptionSelected]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text style={[styles.reasonOptionText, cancelReason === reason && styles.reasonOptionTextSelected]}>
                    {reason}
                  </Text>
                  {cancelReason === reason && <CheckCircle2 size={16} color="#1B7A4E" />}
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Catatan Tambahan (Opsional):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Berikan detail tambahan jika ada..."
                placeholderTextColor="#9CA3AF"
                value={cancelDetail}
                onChangeText={setCancelDetail}
                multiline
                numberOfLines={3}
              />

              <View style={styles.warningBox}>
                <AlertTriangle size={16} color="#B45309" />
                <Text style={styles.warningBoxText}>
                  Stok barang akan otomatis dikembalikan ke etalase toko. Jika sudah bayar non-tunai, refund otomatis akan diteruskan ke metode pembayaran Anda.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.destructiveBtn, submittingCancel && { opacity: 0.6 }]}
                onPress={handleCancelMarketplaceOrder}
                disabled={submittingCancel}
              >
                <RotateCcw size={16} color="#FFFFFF" />
                <Text style={styles.destructiveBtnText}>
                  {submittingCancel ? "Membatalkan..." : "Konfirmasi Batalkan Pesanan"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Marketplace Complaint Modal */}
      <Modal
        visible={complaintModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComplaintModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContainer, { maxHeight: "90%" }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Ajukan Komplain & Refund</Text>
                <Text style={styles.sheetSubtitle}>
                  {orderToComplain ? `Pesanan ${orderToComplain.orderCode || `#${orderToComplain.id}`}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setComplaintModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.inputLabel}>Jenis Kendala / Alasan Komplain:</Text>
              {[
                "Barang Rusak / Cacat",
                "Barang tidak sesuai deskripsi",
                "Jumlah pesanan kurang",
                "Makanan / Minuman basi",
                "Paket tidak pernah sampai",
                "Lainnya",
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, complaintReason === reason && styles.reasonOptionSelected]}
                  onPress={() => setComplaintReason(reason)}
                >
                  <Text style={[styles.reasonOptionText, complaintReason === reason && styles.reasonOptionTextSelected]}>
                    {reason}
                  </Text>
                  {complaintReason === reason && <CheckCircle2 size={16} color="#1B7A4E" />}
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Penjelasan Kendala Detail: *</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 80 }]}
                placeholder="Jelaskan kondisi barang saat diterima, kekurangan barang, atau keluhan lainnya..."
                placeholderTextColor="#9CA3AF"
                value={complaintDetail}
                onChangeText={setComplaintDetail}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Foto Bukti Kendala:</Text>
              <View style={styles.photoUploadRow}>
                {complaintPhotos.map((url, idx) => (
                  <View key={idx} style={styles.photoThumbWrapper}>
                    <Image source={{ uri: url }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => setComplaintPhotos(complaintPhotos.filter((_, i) => i !== idx))}
                    >
                      <X size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {complaintPhotos.length < 4 && (
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickComplaintPhoto}>
                    <Plus size={20} color="#1B7A4E" />
                    <Text style={styles.addPhotoText}>Unggah Foto</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Rekening / E-Wallet untuk Refund:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nama Bank / E-Wallet (BCA/Mandiri/GoPay/DANA)"
                placeholderTextColor="#9CA3AF"
                value={complaintBank}
                onChangeText={setComplaintBank}
              />
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                placeholder="Nomor Rekening / No. HP E-Wallet"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={complaintAccount}
                onChangeText={setComplaintAccount}
              />
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                placeholder="Nama Pemilik Rekening / Akun E-Wallet"
                placeholderTextColor="#9CA3AF"
                value={complaintHolder}
                onChangeText={setComplaintHolder}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, submittingComplaint && { opacity: 0.6 }, { marginTop: 20 }]}
                onPress={handleSubmitComplaint}
                disabled={submittingComplaint}
              >
                <ShieldAlert size={16} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>
                  {submittingComplaint ? "Mengirimkan Komplain..." : "Kirim Pengajuan Komplain"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Marketplace Digital Payment Modal */}
      <MarketplaceDigitalPaymentModal
        visible={digitalPaymentModalVisible}
        onClose={() => setDigitalPaymentModalVisible(false)}
        order={digitalPaymentOrder}
        onPaymentSuccess={() => {
          setDigitalPaymentModalVisible(false);
          if (onRetryOrders) onRetryOrders();
        }}
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#1B7A4E",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabBtnTextActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    elevation: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  serviceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardHeaderBody: {
    flex: 1,
    gap: 2,
  },
  orderTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  itemDetail: {
    fontSize: 11,
    color: "#6B7280",
  },
  cardHeaderRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  invoiceHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  invoiceHintText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  paymentReminderBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 11,
    marginBottom: 4,
  },
  paymentReminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentReminderTitle: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "900",
  },
  paymentReminderAmount: {
    color: "#C2410C",
    fontSize: 11,
    fontWeight: "900",
  },
  paymentReminderText: {
    color: "#C2410C",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  paymentReminderDue: {
    color: "#9A3412",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
  },
  cardFooter: {
    marginTop: 8,
  },
  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateCol: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  dateText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "700",
  },
  priceCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  totalLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },
  actionBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: "#1B7A4E",
    backgroundColor: "#FFFFFF",
  },
  actionBtnOutlineGray: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  actionBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  actionBtnDriver: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  actionBtnMerchantActive: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  actionBtnReview: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  actionBtnTextOutline: {
    color: "#1B7A4E",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnTextGray: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnTextDriver: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnTextMerchantActive: {
    color: "#C2410C",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnTextReview: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
  },
  reviewedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  reviewedBadgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnInvoice: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  actionBtnProof: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  actionBtnInvoiceOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0D7A53",
  },
  actionBtnTextInvoice: {
    color: "#0D7A53",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 36,
    lineHeight: 16,
  },
  // Full Page Layout Styles (Lacak, Ulasan, Chat)
  fullPageContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  fullPageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  fullPageBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  fullPageHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  fullPageHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  fullPageHeaderSubtitle: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  fullPageScroll: {
    flex: 1,
  },
  fullPageScrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  mapCardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  driverHighlightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  driverAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfoBody: {
    flex: 1,
    gap: 3,
  },
  driverHighlightName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  driverRoleTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  driverRoleTagText: {
    color: "#166534",
    fontSize: 9,
    fontWeight: "800",
  },
  driverHighlightSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  driverQuickChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  driverQuickChatBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  deliveryProofCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    padding: 14,
    gap: 10,
  },
  deliveryProofTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  deliveryProofImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  timelineCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotActive: {
    backgroundColor: "#1B7A4E",
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  timelineDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginLeft: 10,
    marginVertical: 2,
  },
  timelineLineActive: {
    backgroundColor: "#1B7A4E",
  },
  fullPageActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  fullPageActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  fullPageActionBtnDriver: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  fullPageActionBtnDriverText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
  },
  fullPageActionBtnMerchant: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  fullPageActionBtnMerchantText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800",
  },
  // Review Full Page Styles
  reviewOrderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewOrderIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewItemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewItemDetail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  reviewItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
    marginTop: 4,
  },
  reviewRatingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewRatingHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewRatingSubheading: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
  },
  starsPickerRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  starTouchItem: {
    padding: 4,
  },
  ratingCaptionPill: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingCaptionText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewTagsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  reviewTagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackChip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  feedbackChipSelected: {
    backgroundColor: "#E8F5EE",
    borderColor: "#1B7A4E",
  },
  feedbackChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  feedbackChipTextSelected: {
    color: "#166534",
    fontWeight: "800",
  },
  reviewInputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewTextArea: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 110,
    lineHeight: 18,
  },
  reviewMediaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reviewMediaHint: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
    marginTop: -5,
    marginBottom: 12,
  },
  reviewMediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  reviewMediaItem: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E8F5EE",
    position: "relative",
  },
  reviewMediaPreview: {
    width: "100%",
    height: "100%",
  },
  reviewVideoPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B7A4E",
    gap: 3,
  },
  reviewVideoLabel: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  removeMediaButton: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  addReviewMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#B9DEC5",
    borderRadius: 12,
    backgroundColor: "#F4FBF6",
  },
  addReviewMediaText: {
    color: "#1B7A4E",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewMediaLimit: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
  },
  submitReviewBtn: {
    backgroundColor: "#1B7A4E",
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    elevation: 2,
    shadowColor: "#1B7A4E",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  submitReviewBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  submitReviewBtnDisabled: {
    opacity: 0.65,
  },
  paymentMethodPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  paymentMethodPillText: {
    fontSize: 9,
    fontWeight: "800",
  },
  complaintBanner: {
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  complaintBannerPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  complaintBannerApproved: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  complaintBannerRejected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  complaintBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  complaintBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  complaintBannerText: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
  },
  complaintRefundAmount: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "700",
    marginTop: 4,
  },
  cancellationBanner: {
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancellationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  cancellationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
  cancellationReason: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  refundInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  refundInfoText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "700",
  },
  actionBtnComplaint: {
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  actionBtnTextComplaint: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnPayNow: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
  },
  actionBtnTextPayNow: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnCancel: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  actionBtnTextCancel: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sheetSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 8,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 7,
    backgroundColor: "#F8FAFC",
  },
  reasonOptionSelected: {
    borderColor: "#1B7A4E",
    backgroundColor: "#ECFDF5",
  },
  reasonOptionText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  reasonOptionTextSelected: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  warningBoxText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },
  destructiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    height: 48,
    borderRadius: 14,
  },
  destructiveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  photoUploadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  photoThumbWrapper: {
    position: "relative",
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 3,
  },
  addPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1B7A4E",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  addPhotoText: {
    fontSize: 8,
    color: "#1B7A4E",
    fontWeight: "800",
    marginTop: 2,
  },
  bankInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
