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
  Camera,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown,
  Check,
  Package,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setActiveCateringPaymentOrder, setActiveCateringTrackingOrderId } from "./customerCateringStore";

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
  onOpenCateringTracking?: (order?: OrderItem) => void;
  onOpenCateringQris?: () => void;
  navigate?: (screen: any, params?: any) => void;
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
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | "SHOP" | "MART" | "RIDE" | "SEND" | "LAUNDRY" | "CATERING"
  >("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "HIGHEST_PRICE" | "LOWEST_PRICE">("NEWEST");
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const SERVICE_CATEGORIES = [
    { key: "ALL", label: "Semua", icon: ShoppingBag, color: "#0D7A53" },
    { key: "SHOP", label: "Shop", icon: ShoppingBag, color: "#2563EB" },
    { key: "MART", label: "Mart", icon: Store, color: "#1B7A4E" },
    { key: "RIDE", label: "Ride", icon: Bike, color: "#16A34A" },
    { key: "SEND", label: "Send", icon: Truck, color: "#0284C7" },
    { key: "LAUNDRY", label: "Laundry", icon: Wind, color: "#0284C7" },
    { key: "CATERING", label: "Catering", icon: Coffee, color: "#EA580C" },
  ] as const;

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

  const currentStatusOrders = orders.filter((o) => {
    if (activeTab === 0) return o.status !== "Selesai" && !o.status.toLowerCase().includes("batal");
    if (activeTab === 1) return o.status === "Selesai";
    return o.status.toLowerCase().includes("batal");
  });

  const getCategoryCount = (key: string) => {
    if (key === "ALL") return currentStatusOrders.length;
    return currentStatusOrders.filter((o) => {
      const t = (o.type || "").toLowerCase();
      switch (key) {
        case "SHOP": return t.includes("shop");
        case "MART": return t.includes("market") || t.includes("mart");
        case "RIDE": return t.includes("ride");
        case "SEND": return t.includes("send");
        case "LAUNDRY": return t.includes("laund");
        case "CATERING": return t.includes("cater");
        default: return true;
      }
    }).length;
  };

  const getFilteredOrders = () => {
    let list = currentStatusOrders;

    if (selectedCategory !== "ALL") {
      list = list.filter((o) => {
        const t = (o.type || "").toLowerCase();
        switch (selectedCategory) {
          case "SHOP": return t.includes("shop");
          case "MART": return t.includes("market") || t.includes("mart");
          case "RIDE": return t.includes("ride");
          case "SEND": return t.includes("send");
          case "LAUNDRY": return t.includes("laund");
          case "CATERING": return t.includes("cater");
          default: return true;
        }
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === "NEWEST") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      } else if (sortBy === "OLDEST") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      } else if (sortBy === "HIGHEST_PRICE") {
        return (Number(b.total) || 0) - (Number(a.total) || 0);
      } else if (sortBy === "LOWEST_PRICE") {
        return (Number(a.total) || 0) - (Number(b.total) || 0);
      }
      return 0;
    });
  };

  const getServiceIcon = (type: string) => {
    const normalized = (type || "").toLowerCase();
    if (normalized.includes("shop")) {
      return { icon: ShoppingBag, fg: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" };
    } else if (normalized.includes("market") || normalized.includes("mart")) {
      return { icon: Store, fg: "#0D7A53", bg: "#ECFDF5", border: "#A7F3D0" };
    } else if (normalized.includes("cater")) {
      return { icon: Coffee, fg: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" };
    } else if (normalized.includes("laund")) {
      return { icon: Wind, fg: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" };
    } else if (normalized.includes("kos")) {
      return { icon: Building, fg: "#9333EA", bg: "#FAF5FF", border: "#E9D5FF" };
    } else if (normalized.includes("ride")) {
      return { icon: Bike, fg: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" };
    } else if (normalized.includes("send")) {
      return { icon: Truck, fg: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" };
    } else {
      return { icon: Package, fg: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
    }
  };

  const getStatusColors = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "dikirim" || s.includes("menuju") || s.includes("perjalanan") || s.includes("mencari") || s.includes("sampai") || s.includes("antar")) {
      return { fg: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" };
    } else if (s.includes("batal")) {
      return { fg: "#DC2626", bg: "#FEF2F2", border: "#FECACA" };
    } else if (s === "selesai" || s === "aktif" || s === "lunas") {
      return { fg: "#0D7A53", bg: "#ECFDF5", border: "#A7F3D0" };
    } else if (s.includes("siap") || s.includes("proses") || s.includes("kemas")) {
      return { fg: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
    }
    return { fg: "#0D7A53", bg: "#ECFDF5", border: "#A7F3D0" };
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
      void AsyncStorage.setItem("selected_ride_tracking_id", order.id);
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
      {/* Modern Clean Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Riwayat Pesanan</Text>
          <Text style={styles.subtitle}>Pantau status pengiriman & histori transaksi Anda</Text>
        </View>
        <View style={styles.headerStatsBadge}>
          <Text style={styles.headerStatsNum}>{orders.length}</Text>
          <Text style={styles.headerStatsLabel}>Total</Text>
        </View>
      </View>

      {/* Segmented Status Tabs (Aktif, Selesai, Dibatalkan) */}
      <View style={styles.segmentedTabsContainer}>
        <View style={styles.segmentedTabsTrack}>
          {[
            {
              label: "Aktif",
              idx: 0,
              count: orders.filter((o) => o.status !== "Selesai" && !o.status.toLowerCase().includes("batal")).length,
            },
            {
              label: "Selesai",
              idx: 1,
              count: orders.filter((o) => o.status === "Selesai").length,
            },
            {
              label: "Dibatalkan",
              idx: 2,
              count: orders.filter((o) => o.status.toLowerCase().includes("batal")).length,
            },
          ].map((tab) => {
            const active = activeTab === tab.idx;
            return (
              <TouchableOpacity
                key={tab.idx}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setActiveTab(tab.idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.segmentCountBadge, active && styles.segmentCountBadgeActive]}>
                  <Text style={[styles.segmentCountText, active && styles.segmentCountTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Category Filter Horizontal Scroll */}
      <View style={styles.categoryScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {SERVICE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const count = getCategoryCount(cat.key);
            const CatIcon = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.key as any)}
                activeOpacity={0.7}
              >
                <CatIcon
                  size={13}
                  color={isSelected ? "#FFFFFF" : cat.color || "#475569"}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    isSelected && styles.categoryBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      isSelected && styles.categoryBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sub Filter & Sort Row */}
      <View style={styles.subFilterBar}>
        <View style={styles.subFilterCountWrap}>
          <ShoppingBag size={13} color="#0D7A53" />
          <Text style={styles.subFilterCountText}>
            <Text style={styles.subFilterCountBold}>{currentList.length}</Text> Pesanan Ditemukan
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.7}
        >
          <ArrowUpDown size={12} color="#0D7A53" />
          <Text style={styles.sortBtnText}>
            {sortBy === "NEWEST"
              ? "Terbaru"
              : sortBy === "OLDEST"
              ? "Terlama"
              : sortBy === "HIGHEST_PRICE"
              ? "Nominal Terbesar"
              : "Nominal Terkecil"}
          </Text>
        </TouchableOpacity>
      </View>

      {ordersLoadError ? (
        <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }}>
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
                const t = item.type.toLowerCase();
                if (t.includes("shop")) {
                  if (navigate) {
                    navigate("c_shop_order_detail", { orderId: item.id });
                  } else {
                    handleOpenInvoice(item);
                  }
                } else if (t.includes("ride") && !isCompleted && !item.status.toLowerCase().includes("batal") && onOpenRideTracking) {
                  onOpenRideTracking();
                } else if (t.includes("cater")) {
                  setActiveCateringTrackingOrderId(String(item.id));
                  if (onOpenCateringTracking) {
                    onOpenCateringTracking(item);
                  } else if (navigate) {
                    navigate("c_catering_tracking");
                  }
                } else {
                  handleOpenInvoice(item);
                }
              }}
            >
              {/* Tier 1 Header: Service Chip (Left) & Status Badges (Right) */}
              <View style={styles.cardHeaderTopRow}>
                <View style={[styles.serviceChip, { backgroundColor: config.bg, borderColor: config.border }]}>
                  <IconComp size={12} color={config.fg} />
                  <Text style={[styles.serviceChipText, { color: config.fg }]} numberOfLines={1}>
                    {item.type}
                  </Text>
                </View>

                <View style={styles.cardHeaderRightBadges}>
                  {item.type.toLowerCase().includes("market") && (
                    <View style={[styles.paymentMethodPill, {
                      backgroundColor: ((item as any).paymentMethod === "cod" || item.paymentStatus === "Lunas") ? "#ECFDF5" : "#FEF3C7",
                      borderColor: ((item as any).paymentMethod === "cod" || item.paymentStatus === "Lunas") ? "#A7F3D0" : "#FDE68A",
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

                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]} numberOfLines={1}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tier 2: Order Code & Order Date */}
              <View style={styles.cardHeaderSubRow}>
                <Text style={styles.orderCodeText} numberOfLines={1}>
                  {item.orderCode ? item.orderCode : `#${item.id}`}
                </Text>
                <View style={styles.cardTimeRow}>
                  <Clock size={11} color="#94A3B8" />
                  <Text style={styles.cardTimeText} numberOfLines={1}>
                    {item.date || "Hari ini"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardSubDivider} />

              {/* Card Body */}
              <View style={styles.cardBody}>
                <View style={styles.cardMainInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.item}
                  </Text>
                  <Text style={styles.itemDetail} numberOfLines={item.type.toLowerCase().includes("ride") ? 2 : 1}>
                    {item.detail}
                  </Text>
                </View>

                {/* Ride route preview if coordinates/places available */}
                {item.type.toLowerCase().includes("ride") && (item.pickup || item.destination) ? (
                  <View style={styles.rideMiniRouteBox}>
                    <View style={styles.rideMiniRouteRow}>
                      <View style={[styles.miniRouteDot, { backgroundColor: "#2563EB" }]} />
                      <Text style={styles.miniRouteText} numberOfLines={1}>
                        {item.pickup?.placeName || item.pickup?.address || "Titik Penjemputan"}
                      </Text>
                    </View>
                    <View style={styles.miniRouteLine} />
                    <View style={styles.rideMiniRouteRow}>
                      <View style={[styles.miniRouteDot, { backgroundColor: "#EA580C" }]} />
                      <Text style={styles.miniRouteText} numberOfLines={1}>
                        {item.destination?.placeName || item.destination?.address || "Titik Tujuan"}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

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

              {/* Delivery Proof Thumbnail Banner */}
              {isCompleted && item.deliveryProofUrl ? (
                <TouchableOpacity
                  style={styles.cardProofBanner}
                  onPress={() => {
                    if (item.type.toLowerCase().includes("cater")) {
                      setActiveCateringTrackingOrderId(String(item.id));
                      if (onOpenCateringTracking) {
                        onOpenCateringTracking(item);
                      } else if (navigate) {
                        navigate("c_catering_tracking");
                      }
                    } else {
                      handleOpenTracking(item);
                    }
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Lihat bukti foto pengantaran kurir"
                >
                  <Image
                    source={{ uri: item.deliveryProofUrl }}
                    style={styles.cardProofThumb}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <Camera size={12} color="#15803D" />
                      <Text style={styles.cardProofTitle}>Foto Bukti Pengantaran</Text>
                      <View style={styles.cardProofBadgeDone}>
                        <ShieldCheck size={9} color="#15803D" />
                        <Text style={styles.cardProofBadgeText}>Terverifikasi</Text>
                      </View>
                    </View>
                    <Text style={styles.cardProofSub} numberOfLines={1}>
                      {item.deliveryProofTimestamp
                        ? item.deliveryProofTimestamp
                        : item.deliveredAt
                        ? `Diserahkan: ${new Date(item.deliveredAt).toLocaleDateString("id-ID")}`
                        : "Kurir telah mengunggah bukti serah terima"}
                    </Text>
                  </View>
                  <ChevronRight size={14} color="#15803D" />
                </TouchableOpacity>
              ) : null}

              {/* Total Price & Footer Actions */}
              <View style={styles.cardFooterDivider} />

              <View style={styles.cardPriceRow}>
                <View style={styles.priceLabelBox}>
                  <Text style={styles.totalLabel}>Total Pembayaran</Text>
                  {item.paymentMethod ? (
                    <Text style={styles.paymentMethodLabel}>via {item.paymentMethod.toUpperCase()}</Text>
                  ) : null}
                </View>
                <Text style={styles.totalValue}>{rp(item.total)}</Text>
              </View>

              <View style={styles.actionBtnRow}>
                {isCompleted ? (
                  // === TAB SELESAI ===
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnInvoice]}
                      onPress={() => handleOpenInvoice(item)}
                      activeOpacity={0.8}
                    >
                      <FileText size={13} color="#0D7A53" />
                      <Text style={styles.actionBtnTextInvoice}>Lihat Faktur</Text>
                    </TouchableOpacity>

                    {item.type.toLowerCase().includes("shop") && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnShop]}
                        onPress={(event) => {
                          event.stopPropagation();
                          if (navigate) {
                            navigate("c_shop_order_detail", { orderId: item.id });
                          } else {
                            handleOpenInvoice(item);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <ShoppingBag size={13} color="#2563EB" />
                        <Text style={styles.actionBtnTextShop}>Detail Order</Text>
                      </TouchableOpacity>
                    )}

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
                        <Text style={styles.actionBtnTextProof}>{item.deliveryProofUrl ? "Bukti Foto" : "Lacak Pesanan"}</Text>
                      </TouchableOpacity>
                    )}

                    {item.type.toLowerCase().includes("cater") && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnProof]}
                          onPress={(event) => {
                            event.stopPropagation();
                            setActiveCateringTrackingOrderId(String(item.id));
                            if (onOpenCateringTracking) {
                              onOpenCateringTracking(item);
                            } else if (navigate) {
                              navigate("c_catering_tracking");
                            }
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={item.deliveryProofUrl ? "Lihat foto bukti pengantaran kurir" : "Lacak pesanan catering"}
                        >
                          <Camera size={13} color="#0D7A53" />
                          <Text style={styles.actionBtnTextProof}>{item.deliveryProofUrl ? "Bukti Foto" : "Lacak & Bukti"}</Text>
                        </TouchableOpacity>

                        {Number(item.remainingAmount || 0) > 0 && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPay]}
                            onPress={(event) => {
                              event.stopPropagation();
                              setActiveCateringPaymentOrder(item);
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
                            <QrCode size={13} color="#FFFFFF" />
                            <Text style={styles.actionBtnTextPay}>Bayar QRIS</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {item.type.toLowerCase().includes("ride") ? (
                      hasDriver && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnChat]}
                          onPress={() => handleOpenChat(item, "driver")}
                        >
                          <Bike size={13} color="#334155" />
                          <Text style={styles.actionBtnTextChat}>Chat Driver</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnChat]}
                        onPress={() => handleOpenChat(item, "merchant")}
                      >
                        <Store size={13} color="#334155" />
                        <Text style={styles.actionBtnTextChat}>Chat Toko</Text>
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
                  // === TAB DIBATALKAN ===
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
                          style={[styles.actionBtn, styles.actionBtnChat]}
                          onPress={() => handleOpenChat(item, "driver")}
                        >
                          <Bike size={13} color="#334155" />
                          <Text style={styles.actionBtnTextChat}>Chat Driver</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnChat]}
                        onPress={() => handleOpenChat(item, "merchant")}
                      >
                        <Store size={13} color="#334155" />
                        <Text style={styles.actionBtnTextChat}>Chat Toko</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  // === TAB AKTIF ===
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
                            style={[styles.actionBtn, styles.actionBtnChat]}
                            onPress={() => handleOpenChat(item, "driver")}
                          >
                            <Bike size={13} color="#334155" />
                            <Text style={styles.actionBtnTextChat}>Chat Driver</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnPrimary]}
                          onPress={() => {
                            if (onOpenRideTracking) {
                              onOpenRideTracking();
                            } else {
                              handleOpenTracking(item);
                            }
                          }}
                        >
                          <Navigation size={13} color="#FFFFFF" />
                          <Text style={styles.actionBtnTextPrimary}>Lacak Perjalanan</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {hasDriver ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnChat]}
                            onPress={() => handleOpenChat(item, "driver")}
                          >
                            <Bike size={13} color="#334155" />
                            <Text style={styles.actionBtnTextChat}>Chat Kurir</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnChat]}
                            onPress={() => handleOpenChat(item, "merchant")}
                          >
                            <Store size={13} color="#334155" />
                            <Text style={styles.actionBtnTextChat}>Chat Toko</Text>
                          </TouchableOpacity>
                        )}

                        {item.type.toLowerCase().includes("market") && (item as any).paymentMethod !== "cod" && item.paymentStatus !== "Lunas" && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPay]}
                            onPress={() => handleOpenMarketplacePayment(item)}
                            activeOpacity={0.85}
                          >
                            <Wallet size={13} color="#FFFFFF" />
                            <Text style={styles.actionBtnTextPay}>Bayar</Text>
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
                          style={[
                            styles.actionBtn,
                            styles.actionBtnPrimary,
                            item.type.toLowerCase().includes("shop") && { backgroundColor: "#2563EB" },
                          ]}
                          onPress={() => {
                            if (item.type.toLowerCase().includes("shop")) {
                              if (navigate) {
                                navigate("c_shop_order_detail", { orderId: item.id });
                              } else {
                                handleOpenInvoice(item);
                              }
                            } else if (item.type.toLowerCase().includes("cater")) {
                              setActiveCateringTrackingOrderId(String(item.id));
                              if (onOpenCateringTracking) {
                                onOpenCateringTracking(item);
                              } else if (navigate) {
                                navigate("c_catering_tracking");
                              }
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
                          <Text style={styles.actionBtnTextPrimary}>
                            {item.type.toLowerCase().includes("cater") && Number(item.remainingAmount || 0) > 0
                              ? "Lunasi & Lacak"
                              : item.type.toLowerCase().includes("shop")
                              ? "Lacak Pesanan"
                              : "Lacak"}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <ShoppingBag size={34} color="#0D7A53" />
            </View>
            <Text style={styles.emptyTitle}>
              {ordersLoading
                ? "Memuat riwayat pesanan…"
                : activeTab === 0
                ? "Belum ada pesanan aktif"
                : activeTab === 1
                ? "Belum ada pesanan selesai"
                : "Belum ada pesanan dibatalkan"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {ordersLoadError && !ordersLoading
                ? "Riwayat belum berhasil diambil dari server. Periksa koneksi Anda dan coba lagi."
                : "Semua pesanan dari berbagai layanan (Shop, Mart, Ride, Send, Laundry, Catering) akan tercatat rapi di sini."}
            </Text>
            {ordersLoadError && !ordersLoading && onRetryOrders ? (
              <TouchableOpacity
                onPress={onRetryOrders}
                style={styles.emptyRetryBtn}
                activeOpacity={0.8}
              >
                <RotateCcw size={14} color="#FFFFFF" />
                <Text style={styles.emptyRetryText}>Coba Lagi</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {/* Modal Urutkan Pesanan (Sort Modal) */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortModalContent}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Urutkan Pesanan</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { key: "NEWEST", label: "Terbaru (Waktu Order)" },
              { key: "OLDEST", label: "Terlama (Waktu Order)" },
              { key: "HIGHEST_PRICE", label: "Nominal Tertinggi (Total Belanja)" },
              { key: "LOWEST_PRICE", label: "Nominal Terendah (Total Belanja)" },
            ].map((opt) => {
              const isSelected = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortOptionItem,
                    isSelected && styles.sortOptionItemActive,
                  ]}
                  onPress={() => {
                    setSortBy(opt.key as any);
                    setSortModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      isSelected && styles.sortOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={16} color="#0D7A53" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

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
                  storeName={
                    selectedOrder.type === "Kanyaah Ride"
                      ? (selectedOrder.pickup?.placeName || "Titik Penjemputan")
                      : ((selectedOrder as any).storeName || selectedOrder.detail.split(" • ")[0] || "Mitra Toko")
                  }
                  storeAddress={
                    selectedOrder.type === "Kanyaah Ride"
                      ? (selectedOrder.pickup?.address || "")
                      : ((selectedOrder as any).storeAddress || "")
                  }
                  customerAddress={
                    selectedOrder.type === "Kanyaah Ride"
                      ? (selectedOrder.destination?.address || "")
                      : (typeof selectedOrder.address === "string" ? selectedOrder.address : selectedOrder.address?.fullAddress || "")
                  }
                  pickupCoordinates={selectedOrder.pickup}
                  destinationCoordinates={selectedOrder.destination}
                  orderType={selectedOrder.type}
                  distance={selectedOrder.estimatedDistance ? `${selectedOrder.estimatedDistance} km` : undefined}
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

              {(selectedOrder.type === "Marketplace" || selectedOrder.type === "Catering") && selectedOrder.deliveryProofUrl ? (
                <View style={styles.deliveryProofCard}>
                  <Text style={styles.deliveryProofTitle}>Bukti Foto Pengantaran Kurir</Text>
                  <Image
                    source={{ uri: selectedOrder.deliveryProofUrl }}
                    style={styles.deliveryProofImage}
                    resizeMode="cover"
                    accessibilityLabel="Foto bukti pesanan telah diterima customer"
                  />
                  {selectedOrder.deliveryProofTimestamp ? (
                    <Text style={{ fontSize: 11, color: "#166534", fontWeight: "700", marginTop: 6 }}>
                      Waktu Serah Terima: {selectedOrder.deliveryProofTimestamp}
                    </Text>
                  ) : null}
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
                    "Rasa Enak",
                    "Porsi Pas",
                    "Pengemasan Rapi",
                    "Pengiriman Cepat",
                    "Sesuai Pesanan",
                    "Pelayanan Ramah",
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  headerStatsBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerStatsNum: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  headerStatsLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
    textTransform: "uppercase",
  },
  segmentedTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  segmentedTabsTrack: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentBtnTextActive: {
    color: "#0D7A53",
    fontWeight: "900",
  },
  segmentCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  segmentCountBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  segmentCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  segmentCountTextActive: {
    color: "#15803D",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 1,
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cardHeaderRightBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    justifyContent: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 150,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  paymentMethodPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  paymentMethodPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardHeaderSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  orderCodeText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  cardTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardTimeText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  cardSubDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  cardBody: {
    gap: 6,
  },
  cardMainInfo: {
    gap: 2,
  },
  itemName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  itemDetail: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },
  rideMiniRouteBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 3,
  },
  rideMiniRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  miniRouteDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  miniRouteLine: {
    width: 1.5,
    height: 7,
    backgroundColor: "#CBD5E1",
    marginLeft: 2.5,
  },
  miniRouteText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  paymentReminderBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
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
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },
  paymentReminderDue: {
    color: "#9A3412",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  cardProofBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  cardProofThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  cardProofTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#166534",
  },
  cardProofBadgeDone: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardProofBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803D",
  },
  cardProofSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  cardFooterDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 10,
    marginBottom: 8,
  },
  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceLabelBox: {
    gap: 1,
  },
  totalLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  paymentMethodLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  actionBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    minHeight: 35,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  actionBtnInvoice: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  actionBtnTextInvoice: {
    color: "#0D7A53",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnPrimary: {
    backgroundColor: "#0D7A53",
  },
  actionBtnTextPrimary: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnChat: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionBtnTextChat: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnShop: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  actionBtnTextShop: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnProof: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  actionBtnTextProof: {
    color: "#0D7A53",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnPay: {
    backgroundColor: "#0D7A53",
  },
  actionBtnTextPay: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnCancel: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  actionBtnTextCancel: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnComplaint: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  actionBtnTextComplaint: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },
  actionBtnReview: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
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
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  reviewedBadgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#C6E7D4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
  },
  emptyRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#0D7A53",
  },
  emptyRetryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
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
  categoryScrollWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 10,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  categoryBadgeTextActive: {
    color: "#FFFFFF",
  },
  subFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  subFilterCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subFilterCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  subFilterCountBold: {
    fontWeight: "900",
    color: "#0F172A",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sortModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sortModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sortOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  sortOptionItemActive: {
    backgroundColor: "#F0FDF4",
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
  },
  sortOptionTextActive: {
    fontWeight: "700",
    color: "#0D7A53",
  },
});
