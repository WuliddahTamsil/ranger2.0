import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Linking,
  Image,
  Platform,
} from "react-native";
import {
  ShoppingBag,
  Clock,
  Search,
  SlidersHorizontal,
  X,
  MessageSquare,
  MapPin,
  Map,
  Truck,
  Store,
  CheckCircle,
  ChevronRight,
  Send,
  User,
  ArrowLeft,
  Phone,
  Navigation,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Camera,
  Maximize2,
  Package,
  Flame,
  AlertCircle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { rp } from "../../utils/formatters";
import { isCateringPaymentFullyPaid } from "../../utils/cateringPayment";
import { updateCateringOrderStatus, getChatMessages, sendChatMessage, verifyCateringPayment, sendCateringPaymentReminder } from "../../services/api";
import { subscribeToChatRealtime } from "../../services/chatRealtime";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";
import { AnimatedOrderPreparation } from "../../components/AnimatedOrderPreparation";

// Data types matching the approved design
export interface DriverProfile {
  name: string;
  vehicle: string;
  plateNumber: string;
  rating: number;
  stage: string;
  distance: string;
  eta: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderData {
  id: string;
  customer: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  deliveryFee: number;
  time: string;
  status:
    | "Menunggu"
    | "Diproses"
    | "Siap"
    | "Menuju Pickup"
    | "Sampai Pickup"
    | "Diambil"
    | "Mengantar"
    | "Dikirim"
    | "Selesai"
    | "Dibatalkan";
  driver: DriverProfile | null;
  unreadCustomerMessages: number;
  unreadDriverMessages: number;
  address?: string;
  storeName?: string;
  storeAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentOption?: string;
  paidAmount?: number;
  remainingAmount?: number;
  paymentBankName?: string;
  paymentAccountNumber?: string;
  paymentAccountHolder?: string;
  paymentQrisImageUrl?: string;
  paymentHistory?: { paymentId: string; type: string; amount: number; status: string; reference?: string; proofUrl?: string }[];
  paymentDueAt?: string;
  paymentReminder?: string;
  paymentProofUrl?: string;
  paymentRejectionReason?: string;
}

interface OrderProps {
  orders: OrderData[];
  setOrders: (orders: OrderData[]) => void;
  ownerId?: string;
  drivers?: { id: string; name: string; phone: string; vehicleType?: string; plateNumber?: string }[];
  onAssignDriver?: (orderId: string, driverId: string) => Promise<boolean>;
}

interface ChatMessage {
  sender: "owner" | "other";
  text: string;
  time: string;
  attachment?: {
    type: "image" | "file";
    uri: string;
    name?: string;
    size?: string;
  };
}

export const Order: React.FC<OrderProps> = ({ orders, setOrders, ownerId, drivers = [], onAssignDriver }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sheet states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [chatTarget, setChatTarget] = useState<"customer" | "driver">("customer");
  const [typedMessage, setTypedMessage] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{
    type: "image" | "file";
    uri: string;
    name?: string;
    size?: string;
  } | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  // Payment Validation & Rejection Modals State
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [activePaymentForAction, setActivePaymentForAction] = useState<any>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [selectedPresetReason, setSelectedPresetReason] = useState("Bukti pembayaran tidak jelas");

  // Chat memory locally
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});

  // Route map mode state: "store" (Kurir ke Dapur) | "customer" (Kurir ke Customer) | "overview" (Semua)
  const [mapRouteMode, setMapRouteMode] = useState<"store" | "customer" | "overview">("overview");

  const handlePaymentVerification = async (paymentId: string, action: "verify" | "reject", reason = "") => {
    if (!selectedOrder) return;
    const isRealBackendOrder = /^[a-f\d]{24}$/i.test(String(selectedOrder.id));
    if (isRealBackendOrder) {
      const result = await verifyCateringPayment(selectedOrder.id, paymentId, action, reason);
      if (!result.success || !result.data) {
        if (
          String(result.message || "").toLowerCase().includes("sudah diproses") ||
          String(result.message || "").toLowerCase().includes("terverifikasi")
        ) {
          const updated = orders.find((order) => order.id === selectedOrder.id);
          const next: OrderData = {
            ...(updated || selectedOrder),
            paymentStatus: action === "verify" ? "Pembayaran Terverifikasi" : "Pembayaran Ditolak",
            paymentHistory: (selectedOrder.paymentHistory || []).map((p) =>
              p.paymentId === paymentId ? { ...p, status: action === "verify" ? "TERVERIFIKASI" : "DITOLAK" } : p
            ),
          };
          setOrders(orders.map((order) => order.id === selectedOrder.id ? next : order));
          setSelectedOrder(next);
          Alert.alert(
            action === "verify" ? "Pembayaran Terverifikasi" : "Pembayaran Ditolak",
            "Pembayaran ini sudah berhasil diproses di sistem."
          );
          return;
        }
        Alert.alert("Belum berhasil", result.message || "Status pembayaran belum dapat diperbarui.");
        return;
      }
      const updated = orders.find((order) => order.id === selectedOrder.id);
      const next: OrderData = {
        ...(updated || selectedOrder),
        paymentHistory: result.data.paymentHistory || [],
        paidAmount: result.data.paidAmount,
        remainingAmount: result.data.remainingAmount,
        paymentStatus: result.data.paymentStatus,
        paymentReminder: result.data.paymentReminder,
        paymentProofUrl: result.data.paymentProofUrl || (selectedOrder as any).paymentProofUrl,
        paymentRejectionReason: result.data.paymentRejectionReason,
      };
      setOrders(orders.map((order) => order.id === selectedOrder.id ? next : order));
      setSelectedOrder(next);
      Alert.alert(
        action === "verify" ? "Pembayaran Terverifikasi" : "Pembayaran Ditolak",
        action === "verify" ? "Pembayaran customer berhasil diverifikasi." : "Pengajuan pembayaran customer telah ditolak."
      );
      return;
    }

    // Local / fallback for test orders
    const targetAmount = activePaymentForAction?.amount || 156000;
    const nextPaid = action === "verify" ? (selectedOrder.paidAmount || 0) + targetAmount : (selectedOrder.paidAmount || 0);
    const nextRemaining = Math.max(0, (selectedOrder.total || 520000) - nextPaid);
    const nextStatus = action === "reject" ? "Pembayaran Ditolak" : nextRemaining <= 0 ? "Lunas" : "Pembayaran Terverifikasi";
    const next: OrderData = {
      ...selectedOrder,
      paidAmount: nextPaid,
      remainingAmount: nextRemaining,
      paymentStatus: nextStatus,
      paymentRejectionReason: action === "reject" ? reason : "",
      paymentHistory: (selectedOrder.paymentHistory || []).map((p) => p.paymentId === paymentId ? {
        ...p,
        status: action === "verify" ? "TERVERIFIKASI" : "DITOLAK",
        rejectionReason: action === "reject" ? reason : "",
      } : p),
    };
    setOrders(orders.map((order) => order.id === selectedOrder.id ? next : order));
    setSelectedOrder(next);
    Alert.alert(
      action === "verify" ? "Pembayaran Terverifikasi" : "Pembayaran Ditolak",
      action === "verify" ? "Pembayaran customer berhasil diverifikasi." : "Pengajuan pembayaran customer telah ditolak."
    );
  };

  const openValidatePaymentModal = (payment: any) => {
    setActivePaymentForAction(payment);
    setVerifyModalVisible(true);
  };

  const openRejectPaymentModal = (payment: any) => {
    setActivePaymentForAction(payment);
    setRejectionReasonText("");
    setSelectedPresetReason("Bukti pembayaran tidak jelas");
    setRejectModalVisible(true);
  };

  const confirmValidatePayment = async () => {
    if (!activePaymentForAction) return;
    const pay = activePaymentForAction;
    setVerifyModalVisible(false);
    await handlePaymentVerification(pay.paymentId, "verify");
  };

  const confirmRejectPayment = async () => {
    if (!activePaymentForAction) return;
    const pay = activePaymentForAction;
    const finalReason = rejectionReasonText.trim() || selectedPresetReason;
    setRejectModalVisible(false);
    await handlePaymentVerification(pay.paymentId, "reject", finalReason);
  };

  const sendPaymentReminderViaWhatsApp = async () => {
    if (!selectedOrder) return;
    const notificationResult = await sendCateringPaymentReminder(selectedOrder.id);
    if (!notificationResult.success) {
      Alert.alert("Notifikasi belum terkirim", notificationResult.message || "Pengingat WhatsApp tetap dapat dibuka.");
    }
    const rawPhone = String(selectedOrder.customerPhone || "").replace(/\D/g, "");
    if (!rawPhone) {
      Alert.alert("Nomor WhatsApp belum tersedia", "Tambahkan nomor telepon customer pada data pesanan terlebih dahulu.");
      return;
    }

    const phone = rawPhone.startsWith("0") ? `62${rawPhone.slice(1)}` : rawPhone;
    const dueDate = selectedOrder.paymentDueAt
      ? new Date(selectedOrder.paymentDueAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
      : "sebelum jadwal pengiriman";
    const message = [
      `Halo ${selectedOrder.customer || "Kak"}, ini pengingat pembayaran pesanan Catering ${selectedOrder.id}.`,
      `Total pesanan: ${rp(selectedOrder.total)}.`,
      `Sisa pelunasan: ${rp(selectedOrder.remainingAmount || 0)}.`,
      `Mohon dilunasi paling lambat ${dueDate}. Setelah transfer, silakan ajukan konfirmasi pembayaran di aplikasi GEOVERSE agar dapat kami verifikasi.`,
      "Terima kasih.",
    ].join("\n");

    try {
      await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert("WhatsApp tidak dapat dibuka", "Silakan salin pesan pengingat dan kirimkan secara manual.");
    }
  };

  // Sync selectedOrder with incoming updates from parent orders prop (e.g. status changes by driver)
  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((o) => o.id === selectedOrder.id);
    if (fresh && fresh !== selectedOrder) {
      setSelectedOrder(fresh);
    }
  }, [orders]);

  // Automatically adapt route mode according to the delivery stage
  useEffect(() => {
    if (!selectedOrder) return;
    if (["Menuju Pickup", "Sampai Pickup", "Siap"].includes(selectedOrder.status)) {
      setMapRouteMode("store");
    } else if (["Diambil", "Mengantar", "Dikirim"].includes(selectedOrder.status)) {
      setMapRouteMode("customer");
    } else {
      setMapRouteMode("overview");
    }
  }, [selectedOrder?.id, selectedOrder?.status]);

  // Tracking animation mock state
  const [trackingProgress, setTrackingProgress] = useState(1);

  useEffect(() => {
    let interval: any;
    if (trackingModalVisible) {
      interval = setInterval(() => {
        setTrackingProgress((prev) => (prev >= 3 ? 1 : prev + 1));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [trackingModalVisible]);

  useEffect(() => {
    if (!chatModalVisible || !selectedOrder) return;

    const loadMessages = async () => {
      const res = await getChatMessages(selectedOrder.id, chatTarget, "owner");
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((m: any) => ({
          sender: m.sender === "owner" ? ("owner" as const) : ("other" as const),
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          attachment: m.attachment,
        }));

        const chatKey = `${selectedOrder.id}-${chatTarget}`;
        setChatMessages((prev) => ({
          ...prev,
          [chatKey]: mapped,
        }));
      }
    };

    void loadMessages();
    const interval = setInterval(loadMessages, 3000);
    let unsubscribeRealtime: () => void = () => undefined;
    void subscribeToChatRealtime(selectedOrder.id, () => void loadMessages()).then((unsubscribe) => {
      unsubscribeRealtime = unsubscribe;
    });

    return () => {
      clearInterval(interval);
      unsubscribeRealtime();
    };
  }, [chatModalVisible, selectedOrder, chatTarget]);

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Galeri", "Mohon izinkan akses galeri untuk mengirim foto.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileSize = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "Foto Galeri";
        setSelectedAttachment({
          type: "image",
          uri: asset.uri,
          name: asset.fileName || `foto_${Date.now()}.jpg`,
          size: fileSize,
        });
      }
    } catch (err) {
      console.log("Pick image err:", err);
    }
  };

  const handlePickCamera = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Kamera", "Mohon izinkan akses kamera untuk mengambil foto.");
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedAttachment({
          type: "image",
          uri: asset.uri,
          name: `camera_${Date.now()}.jpg`,
          size: "Foto Kamera",
        });
      }
    } catch (err) {
      console.log("Camera err:", err);
    }
  };

  // Handler update status pesanan
  const handleUpdateStatus = async (
    orderId: string,
    nextStatus:
      | "Menunggu"
      | "Diproses"
      | "Siap"
      | "Menuju Pickup"
      | "Sampai Pickup"
      | "Diambil"
      | "Mengantar"
      | "Dikirim"
      | "Selesai"
      | "Dibatalkan"
  ) => {
    let messageText = "";

    if (nextStatus === "Diproses") {
      messageText = "Pesanan catering diterima dan mulai dimasak.";
    } else if (nextStatus === "Siap") {
      messageText = "Pesanan selesai disiapkan. Menunggu penjemputan kurir.";
    } else if (nextStatus === "Menuju Pickup") {
      messageText = "Kurir sedang dalam perjalanan menuju dapur catering.";
    } else if (nextStatus === "Sampai Pickup") {
      messageText = "Kurir telah tiba di lokasi dapur catering.";
    } else if (nextStatus === "Mengantar" || nextStatus === "Diambil") {
      messageText = "Pesanan telah diserahkan ke kurir. Kurir berangkat mengantar ke customer.";
    } else if (nextStatus === "Selesai") {
      messageText = "Pesanan selesai diantar ke alamat customer.";
    } else if (nextStatus === "Dibatalkan") {
      messageText = "Pesanan catering dibatalkan.";
    }

    // Update status in MongoDB if valid ObjectId
    const isObjectId = /^[a-f\d]{24}$/i.test(String(orderId || ""));
    if (isObjectId) {
      const result = await updateCateringOrderStatus(orderId, nextStatus);
      if (!result.success) {
        if (Platform.OS === "web") {
          window.alert(result.message || "Pesanan belum berhasil diperbarui. Silakan coba lagi.");
        } else {
          Alert.alert(
            "Status belum diperbarui",
            result.message || "Pesanan belum berhasil diperbarui. Silakan coba lagi.",
          );
        }
        return;
      }
    }

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: nextStatus,
        };
      }
      return o;
    });

    setOrders(updated);

    // Sync state for detailed modal view
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        status: nextStatus,
      });
    }

    if (Platform.OS === "web") {
      window.alert(`Sukses: ${messageText}`);
    } else {
      Alert.alert("Sukses", messageText);
    }
  };

  const confirmOrderStatus = (orderId: string, nextStatus: "Diproses" | "Dibatalkan") => {
    const isRejecting = nextStatus === "Dibatalkan";
    const title = isRejecting ? "Tolak pesanan?" : "Terima & Mulai Masak?";
    const message = isRejecting
      ? "Pesanan akan ditolak dan customer akan menerima pemberitahuan."
      : "Pesanan akan diterima dan status dapur akan berubah ke proses memasak.";

    if (Platform.OS === "web") {
      const confirmed = typeof window !== "undefined" ? window.confirm(`${title}\n\n${message}`) : true;
      if (confirmed) {
        void handleUpdateStatus(orderId, nextStatus);
      }
      return;
    }

    Alert.alert(
      title,
      message,
      [
        { text: "Batal", style: "cancel" },
        {
          text: isRejecting ? "Ya, Tolak" : "Ya, Terima & Masak",
          style: isRejecting ? "destructive" : "default",
          onPress: () => {
            void handleUpdateStatus(orderId, nextStatus);
          },
        },
      ],
    );
  };

  // Open Chat Room
  const openChat = (order: OrderData, target: "customer" | "driver") => {
    setSelectedOrder(order);
    setChatTarget(target);
    setChatModalVisible(true);

    // Mark as read locally
    const updated = orders.map((o) => {
      if (o.id === order.id) {
        return {
          ...o,
          unreadCustomerMessages: target === "customer" ? 0 : o.unreadCustomerMessages,
          unreadDriverMessages: target === "driver" ? 0 : o.unreadDriverMessages,
        };
      }
      return o;
    });
    setOrders(updated);
  };

  // Send Chat message
  const handleSendMessage = async () => {
    const text = typedMessage.trim();
    if (!text && !selectedAttachment) return;
    if (!selectedOrder) return;

    const chatKey = `${selectedOrder.id}-${chatTarget}`;
    const newMsg: ChatMessage = {
      sender: "owner",
      text: text || (selectedAttachment?.type === "image" ? "📷 Foto terkirim" : "📎 File terlampir"),
      time: "Baru saja",
      attachment: selectedAttachment ? { ...selectedAttachment } : undefined,
    };

    // Save locally for instant feedback
    const currentHistory = chatMessages[chatKey] || [];
    setChatMessages({
      ...chatMessages,
      [chatKey]: [...currentHistory, newMsg],
    });
    setTypedMessage("");
    const attachmentToSend = selectedAttachment;
    setSelectedAttachment(null);

    // Save in database
    const result = await sendChatMessage(
      selectedOrder.id,
      "owner",
      newMsg.text,
      attachmentToSend,
      ownerId,
      chatTarget === "driver" ? "driver" : "customer"
    );
    if (!result.success) {
      Alert.alert("Gagal mengirim", result.message || "Pesan belum tersimpan.");
    }
  };

  // Open Tracking map directly by opening full page view
  const openTracking = (order: OrderData) => {
    setSelectedOrder(order);
  };

  // Status colors & labels helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Menunggu": return "#D97706";
      case "Diproses": return "#2563EB";
      case "Siap": return "#7E22CE";
      case "Menuju Pickup": return "#15803D";
      case "Sampai Pickup": return "#0D7A53";
      case "Diambil":
      case "Mengantar":
      case "Dikirim": return "#0891B2";
      case "Selesai": return "#1B7A4E";
      case "Dibatalkan": return "#B91C1C";
      default: return "#6B7280";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "Menunggu": return "#FEF3C7";
      case "Diproses": return "#EFF6FF";
      case "Siap": return "#F3E8FF";
      case "Menuju Pickup": return "#DCFCE7";
      case "Sampai Pickup": return "#E8F5EE";
      case "Diambil":
      case "Mengantar":
      case "Dikirim": return "#ECFEFF";
      case "Selesai": return "#E8F5EE";
      case "Dibatalkan": return "#FEE2E2";
      default: return "#F3F4F6";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Menunggu": return "Pesanan Masuk";
      case "Diproses": return "Sedang Disiapkan";
      case "Siap": return "Siap Diambil Kurir";
      case "Menuju Pickup": return "Kurir Menuju Dapur";
      case "Sampai Pickup": return "Kurir Tiba di Dapur";
      case "Diambil":
      case "Mengantar":
      case "Dikirim": return "Kurir OTW Customer";
      case "Selesai": return "Pesanan Selesai";
      case "Dibatalkan": return "Dibatalkan";
      default: return status;
    }
  };

  const renderChatModal = () => {
    if (!selectedOrder) return null;
    return (
      <>
        <Modal visible={chatModalVisible} transparent animationType="slide">
          <View style={styles.modalBgBottom}>
            <View style={styles.chatSheetContainer}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>
                    Chat: {chatTarget === "customer" ? selectedOrder.customer : (selectedOrder.driver?.name || "Driver")}
                  </Text>
                  <Text style={styles.chatHeaderSubtitle}>Order #{selectedOrder.id}</Text>
                </View>
                <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                  <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Message List */}
              <FlatList
                data={chatMessages[`${selectedOrder.id}-${chatTarget}`] || []}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.chatListContent}
                renderItem={({ item }) => {
                  const isOwner = item.sender === "owner";
                  const hasAttachment = Boolean(item.attachment?.uri);

                  return (
                    <View style={[styles.chatBubbleContainer, isOwner ? styles.chatBubbleRight : styles.chatBubbleLeft]}>
                      <View style={[styles.chatBubble, isOwner ? styles.chatBubbleOwner : styles.chatBubbleClient]}>
                        {hasAttachment && (
                          <TouchableOpacity
                            onPress={() => setPreviewImageUri(item.attachment?.uri || null)}
                            activeOpacity={0.9}
                            style={styles.bubbleImgWrap}
                          >
                            <Image
                              source={{ uri: item.attachment?.uri }}
                              style={styles.bubbleImage}
                              resizeMode="cover"
                            />
                            <View style={styles.bubbleZoomBadge}>
                              <Maximize2 size={12} color="#FFFFFF" />
                              <Text style={styles.bubbleZoomText}>Perbesar</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        {item.text && item.text !== "📷 Foto terkirim" ? (
                          <Text style={[styles.chatText, isOwner ? styles.chatTextOwner : styles.chatTextClient]}>
                            {item.text}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.chatTime}>{item.time}</Text>
                    </View>
                  );
                }}
              />

              {/* Attachment Preview */}
              {selectedAttachment && (
                <View style={styles.attachmentPreviewBar}>
                  <Image source={{ uri: selectedAttachment.uri }} style={styles.previewThumb} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.previewFileName} numberOfLines={1}>
                      {selectedAttachment.name || "Foto Terpilih"}
                    </Text>
                    <Text style={styles.previewFileSize}>{selectedAttachment.size}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeAttachBtn}
                    onPress={() => setSelectedAttachment(null)}
                  >
                    <X size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Chat Input Field with Image/Camera Actions */}
              <View style={styles.chatInputRow}>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} activeOpacity={0.7}>
                  <ImageIcon size={20} color="#1B7A4E" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickCamera} activeOpacity={0.7}>
                  <Camera size={20} color="#1B7A4E" />
                </TouchableOpacity>
                <TextInput
                  style={styles.chatInput}
                  value={typedMessage}
                  onChangeText={setTypedMessage}
                  placeholder="Ketik pesan atau kirim foto..."
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (typedMessage.trim() || selectedAttachment) ? styles.sendBtnActive : styles.sendBtnDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={!typedMessage.trim() && !selectedAttachment}
                  activeOpacity={0.8}
                >
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Fullscreen Image Preview */}
        {previewImageUri && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.imageViewerBg}>
              <ResponsiveSafeAreaView style={styles.imageViewerHeader}>
                <Text style={styles.imageViewerTitle}>Pratinjau Foto Lampiran</Text>
                <TouchableOpacity
                  style={styles.imageViewerCloseBtn}
                  onPress={() => setPreviewImageUri(null)}
                >
                  <X size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </ResponsiveSafeAreaView>
              <View style={styles.imageViewerBody}>
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.fullPreviewImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Modal Validasi Pembayaran */}
        <Modal
          visible={verifyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVerifyModalVisible(false)}
        >
          <View style={styles.paymentModalOverlay}>
            <View style={styles.paymentModalBox}>
              <View style={[styles.paymentModalIconCircle, { backgroundColor: "#DCFCE7" }]}>
                <CheckCircle size={26} color="#15803D" />
              </View>
              <Text style={styles.paymentModalTitle}>Validasi Pembayaran?</Text>
              <Text style={styles.paymentModalSubtitle}>
                Pastikan bukti pembayaran sudah sesuai sebelum melakukan validasi.
              </Text>
              <View style={styles.paymentModalAmountBox}>
                <Text style={styles.paymentModalAmountText}>
                  {rp(activePaymentForAction?.amount || 156000)}
                </Text>
              </View>
              <View style={styles.paymentModalBtnRow}>
                <TouchableOpacity
                  style={styles.paymentModalBtnCancel}
                  onPress={() => setVerifyModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paymentModalBtnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentModalBtnSubmit, { backgroundColor: "#15803D" }]}
                  onPress={() => void confirmValidatePayment()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paymentModalBtnSubmitText}>Ya, Validasi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Tolak Pembayaran */}
        <Modal
          visible={rejectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectModalVisible(false)}
        >
          <View style={styles.paymentModalOverlay}>
            <View style={styles.paymentModalBox}>
              <View style={[styles.paymentModalIconCircle, { backgroundColor: "#FEE2E2" }]}>
                <X size={26} color="#DC2626" />
              </View>
              <Text style={styles.paymentModalTitle}>Tolak Bukti Pembayaran?</Text>
              <Text style={styles.paymentModalSubtitle}>
                Beri tahu customer alasan penolakan bukti pembayaran:
              </Text>

              <Text style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: "700", color: "#334155", marginTop: 12, marginBottom: 6 }}>
                Pilih Alasan Cepat:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12, width: "100%" }}>
                {[
                  "Bukti pembayaran tidak jelas",
                  "Nominal tidak sesuai",
                  "Bukti pembayaran tidak valid",
                  "Pembayaran belum diterima",
                ].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: selectedPresetReason === reason ? "#FEF2F2" : "#F1F5F9",
                      borderWidth: 1,
                      borderColor: selectedPresetReason === reason ? "#F87171" : "#E2E8F0",
                    }}
                    onPress={() => {
                      setSelectedPresetReason(reason);
                      setRejectionReasonText(reason);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: selectedPresetReason === reason ? "#B91C1C" : "#475569" }}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 4 }}>
                Alasan Penolakan:
              </Text>
              <TextInput
                style={{
                  width: "100%",
                  borderWidth: 1,
                  borderColor: "#CBD5E1",
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  color: "#0F172A",
                  backgroundColor: "#F8FAFC",
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
                multiline
                placeholder="Tulis alasan penolakan..."
                placeholderTextColor="#94A3B8"
                value={rejectionReasonText}
                onChangeText={setRejectionReasonText}
              />

              <View style={[styles.paymentModalBtnRow, { marginTop: 18 }]}>
                <TouchableOpacity
                  style={styles.paymentModalBtnCancel}
                  onPress={() => setRejectModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paymentModalBtnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentModalBtnSubmit, { backgroundColor: "#DC2626" }]}
                  onPress={() => void confirmRejectPayment()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paymentModalBtnSubmitText}>Tolak Pembayaran</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  // If an order is selected, render the FULL PAGE View (no popups!)
  if (selectedOrder) {
    return (
      <ResponsiveSafeAreaView style={styles.fullPageContainer}>
        {/* Sticky Header */}
        <View style={styles.fullPageHeader}>
          <View style={styles.fullPageHeaderInner}>
            <TouchableOpacity
              style={styles.fullPageBackBtn}
              onPress={() => setSelectedOrder(null)}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#111827" />
              <Text style={styles.fullPageBackText}>Daftar Order</Text>
            </TouchableOpacity>
            <View style={styles.fullPageHeaderRight}>
              <Text style={styles.fullPageOrderCode} numberOfLines={1}>#{selectedOrder.id.slice(-8)}</Text>
              <View style={[styles.statusChip, { backgroundColor: getStatusBgColor(selectedOrder.status) }]}>
                <Text style={[styles.statusChipText, { color: getStatusColor(selectedOrder.status) }]} numberOfLines={1}>
                  {getStatusLabel(selectedOrder.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.fullPageScroll}
          contentContainerStyle={styles.fullPageScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Sleek Status & Progress Tracker */}
          <View style={styles.statusHeroCard}>
            <View style={styles.statusHeroTopRow}>
              <View style={[styles.statusHeroIconBg, { backgroundColor: getStatusBgColor(selectedOrder.status) }]}>
                {selectedOrder.status === "Menunggu" ? (
                  <Clock size={20} color={getStatusColor(selectedOrder.status)} />
                ) : selectedOrder.status === "Diproses" ? (
                  <Flame size={20} color={getStatusColor(selectedOrder.status)} />
                ) : selectedOrder.status === "Siap" || selectedOrder.status === "Menuju Pickup" || selectedOrder.status === "Sampai Pickup" ? (
                  <Package size={20} color={getStatusColor(selectedOrder.status)} />
                ) : selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim" ? (
                  <Truck size={20} color={getStatusColor(selectedOrder.status)} />
                ) : (
                  <CheckCircle size={20} color={getStatusColor(selectedOrder.status)} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusHeroTitle}>{getStatusLabel(selectedOrder.status)}</Text>
                <Text style={styles.statusHeroSub}>
                  {selectedOrder.status === "Menunggu"
                    ? "Pesanan baru menunggu konfirmasi dapur catering"
                    : selectedOrder.status === "Diproses"
                    ? "Dapur sedang memasak dan menyiapkan pesanan"
                    : selectedOrder.status === "Siap"
                    ? (selectedOrder.driver ? "Pesanan siap, menunggu kurir penjemput" : "Pesanan selesai dimasak, segera tugaskan kurir")
                    : selectedOrder.status === "Menuju Pickup"
                    ? "Kurir sedang dalam perjalanan menuju dapur catering"
                    : selectedOrder.status === "Sampai Pickup"
                    ? "Kurir telah tiba di dapur catering untuk mengambil pesanan"
                    : selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim"
                    ? "Kurir sedang dalam perjalanan mengantarkan ke customer"
                    : selectedOrder.status === "Selesai"
                    ? "Pesanan telah berhasil diterima oleh pemesan"
                    : "Pesanan catering telah dibatalkan"}
                </Text>
              </View>
            </View>

            {/* Simple Elegant 5-Step Horizontal Indicator */}
            {selectedOrder.status !== "Dibatalkan" && (
              <View style={styles.stepperContainer}>
                {(() => {
                  const steps = [
                    { key: "Menunggu", label: "Diterima" },
                    { key: "Diproses", label: "Dimasak" },
                    { key: "Siap", label: "Siap Jemput" },
                    { key: "Mengantar", label: "Diantar" },
                    { key: "Selesai", label: "Selesai" },
                  ];

                  const getStepIndex = (status: string) => {
                    switch (status) {
                      case "Menunggu": return 0;
                      case "Diproses": return 1;
                      case "Siap":
                      case "Menuju Pickup":
                      case "Sampai Pickup": return 2;
                      case "Diambil":
                      case "Mengantar":
                      case "Dikirim": return 3;
                      case "Selesai": return 4;
                      default: return 0;
                    }
                  };

                  const currentIdx = getStepIndex(selectedOrder.status);

                  return (
                    <View style={styles.stepperRow}>
                      {steps.map((step, idx) => {
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                          <React.Fragment key={step.key}>
                            {idx > 0 && (
                              <View
                                style={[
                                  styles.stepperLine,
                                  idx <= currentIdx && styles.stepperLineActive,
                                ]}
                              />
                            )}
                            <View style={styles.stepItem}>
                              <View
                                style={[
                                  styles.stepDot,
                                  isDone && styles.stepDotDone,
                                  isCurrent && styles.stepDotCurrent,
                                ]}
                              >
                                {isDone ? (
                                  <CheckCircle size={11} color="#FFFFFF" />
                                ) : (
                                  <Text style={[styles.stepNum, isCurrent && styles.stepNumCurrent]}>
                                    {idx + 1}
                                  </Text>
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.stepLabel,
                                  isDone && styles.stepLabelDone,
                                  isCurrent && styles.stepLabelCurrent,
                                ]}
                                numberOfLines={1}
                              >
                                {step.label}
                              </Text>
                            </View>
                          </React.Fragment>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>

          {/* Quick Driver Assignment Card when ready & unassigned */}
          {selectedOrder.status === "Siap" && !selectedOrder.driver && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: "#F3E8FF" }]}>
                  <Truck size={18} color="#7E22CE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionCardTitle}>Tugaskan Kurir Penjemput</Text>
                  <Text style={styles.sectionCardSubtitle}>
                    Pilih kurir GEOVERSE yang tersedia di sekitar dapur Anda
                  </Text>
                </View>
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {drivers.map((drv) => (
                  <View key={drv.id} style={styles.assignDriverRow}>
                    <View style={styles.assignDriverAvatar}>
                      <User size={18} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignDriverName}>{drv.name}</Text>
                      <Text style={styles.assignDriverSub}>
                        {drv.vehicleType || "Motor"} • {drv.plateNumber || drv.phone}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.assignDriverBtn}
                      onPress={async () => {
                        if (onAssignDriver) {
                          const ok = await onAssignDriver(selectedOrder.id, drv.id);
                          if (ok) {
                            const newDriver: DriverProfile = {
                              name: drv.name,
                              vehicle: drv.vehicleType || "Motor",
                              plateNumber: drv.plateNumber || drv.phone,
                              rating: 4.9,
                              stage: "Driver menuju outlet catering",
                              distance: "1.2 km",
                              eta: "5 mnt",
                            };
                            setSelectedOrder({
                              ...selectedOrder,
                              status: "Siap",
                              driver: newDriver,
                            });
                          }
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.assignDriverBtnText}>Tugaskan</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 2. Interactive Real-Time Google Maps Tracking & Driver Monitoring */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionIconBg}>
                <Compass size={18} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionCardTitle}>Pelacakan Perjalanan Kurir</Text>
                <Text style={styles.sectionCardSubtitle}>
                  {selectedOrder.status === "Menuju Pickup"
                    ? "Kurir sedang dalam perjalanan menuju dapur catering Anda"
                    : selectedOrder.status === "Sampai Pickup"
                    ? "Kurir telah tiba di dapur catering. Siap serah terima pesanan."
                    : selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim"
                    ? "Kurir sedang mengantarkan pesanan ke alamat customer"
                    : selectedOrder.status === "Siap"
                    ? (selectedOrder.driver ? "Kurir ditugaskan, bersiap menuju dapur catering" : "Pesanan siap. Menunggu penugasan kurir.")
                    : "Pantau rute penjemputan dan pengantaran customer."}
                </Text>
              </View>
            </View>

            {/* Segmented Mode Switcher: Kurir ke Dapur vs Kurir ke Customer */}
            <View style={styles.trackingSegmentRow}>
              <TouchableOpacity
                style={[
                  styles.trackingSegmentBtn,
                  mapRouteMode === "store" && styles.trackingSegmentBtnActiveStore,
                ]}
                onPress={() => setMapRouteMode("store")}
                activeOpacity={0.8}
              >
                <Store size={13} color={mapRouteMode === "store" ? "#FFFFFF" : "#15803D"} />
                <Text
                  style={[
                    styles.trackingSegmentText,
                    mapRouteMode === "store" && styles.trackingSegmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Rute ke Dapur
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.trackingSegmentBtn,
                  mapRouteMode === "customer" && styles.trackingSegmentBtnActiveCust,
                ]}
                onPress={() => setMapRouteMode("customer")}
                activeOpacity={0.8}
              >
                <Navigation size={13} color={mapRouteMode === "customer" ? "#FFFFFF" : "#0D7A53"} />
                <Text
                  style={[
                    styles.trackingSegmentText,
                    mapRouteMode === "customer" && styles.trackingSegmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Rute ke Customer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.trackingSegmentBtn,
                  mapRouteMode === "overview" && styles.trackingSegmentBtnActiveAll,
                ]}
                onPress={() => setMapRouteMode("overview")}
                activeOpacity={0.8}
              >
                <Compass size={13} color={mapRouteMode === "overview" ? "#FFFFFF" : "#475569"} />
                <Text
                  style={[
                    styles.trackingSegmentText,
                    mapRouteMode === "overview" && styles.trackingSegmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Semua Rute
                </Text>
              </TouchableOpacity>
            </View>

            {/* Real-time Driver Journey Status Card */}
            {selectedOrder.driver && (
              <View style={styles.driverJourneyCard}>
                <View style={styles.driverJourneyHeaderRow}>
                  <View style={styles.driverJourneyLiveBadge}>
                    <View style={styles.driverJourneyPulseDot} />
                    <Text style={styles.driverJourneyLiveText}>
                      {selectedOrder.status === "Menuju Pickup"
                        ? "KURIR MENUJU DAPUR (OTW)"
                        : selectedOrder.status === "Sampai Pickup"
                        ? "KURIR TIBA DI DAPUR"
                        : selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim"
                        ? "KURIR MENUJU CUSTOMER"
                        : "KURIR DITUGASKAN"}
                    </Text>
                  </View>
                  <Text style={styles.driverJourneyEta}>
                    {selectedOrder.status === "Sampai Pickup" ? "Sudah di lokasi" : "ETA ~5 mnt"}
                  </Text>
                </View>

                <View style={styles.driverProfileRow}>
                  <View style={styles.driverAvatarWrap}>
                    <User size={18} color="#15803D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverProfileName}>{selectedOrder.driver.name}</Text>
                    <Text style={styles.driverProfileSub}>
                      {selectedOrder.driver.vehicle || "Motor"} • {selectedOrder.driver.plateNumber || "Kurir GEOVERSE"}
                    </Text>
                  </View>
                  <View style={styles.driverQuickActionsRow}>
                    <TouchableOpacity
                      style={styles.driverChatPill}
                      onPress={() => openChat(selectedOrder, "driver")}
                      activeOpacity={0.8}
                    >
                      <MessageSquare size={13} color="#15803D" />
                      <Text style={styles.driverChatPillText}>Chat</Text>
                    </TouchableOpacity>
                    {selectedOrder.driver.plateNumber?.includes("+") || selectedOrder.customerPhone ? (
                      <TouchableOpacity
                        style={styles.driverCallPill}
                        onPress={() => {
                          const phone = selectedOrder.driver?.plateNumber?.includes("+")
                            ? selectedOrder.driver.plateNumber
                            : selectedOrder.customerPhone;
                          if (phone) void Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`);
                        }}
                        activeOpacity={0.8}
                      >
                        <Phone size={13} color="#2563EB" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            {/* Embedded Live Google Maps Tracking */}
            <View style={{ marginTop: 10 }}>
              <LiveOrderTrackingMap
                storeName={selectedOrder.storeName || "Dapur Catering Saya"}
                storeAddress={selectedOrder.storeAddress || "Dapur Catering, Bangkalan"}
                customerAddress={selectedOrder.address || selectedOrder.customer}
                driverName={selectedOrder.driver?.name}
                driverVehicle={selectedOrder.driver?.plateNumber || selectedOrder.driver?.vehicle}
                orderStatus={selectedOrder.status}
                height={270}
                navigationMode={mapRouteMode}
                onNavigationModeChange={(mode) => setMapRouteMode(mode)}
                showTurnInstructions={true}
              />
            </View>
          </View>

          {/* 3. Customer Information Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitleSmall}>Informasi Pemesan</Text>
            <View style={styles.detailCard}>
              <View style={styles.avatarBgLarge}>
                <Text style={styles.avatarTextLarge}>{selectedOrder.customer.substring(0, 1)}</Text>
              </View>
              <View style={styles.detailCardBody}>
                <Text style={styles.detailCardName} numberOfLines={1}>{selectedOrder.customer}</Text>
                <Text style={styles.detailCardSub} numberOfLines={1}>{selectedOrder.customerPhone}</Text>
                <View style={styles.addressRow}>
                  <MapPin size={13} color="#6B7280" style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedOrder.address || selectedOrder.customer}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActionsCol}>
                <TouchableOpacity
                  style={styles.chatIconBtn}
                  onPress={() => openChat(selectedOrder, "customer")}
                  activeOpacity={0.7}
                >
                  <MessageSquare size={16} color="#1B7A4E" />
                </TouchableOpacity>
                {selectedOrder.customerPhone ? (
                  <TouchableOpacity
                    style={[styles.chatIconBtn, { backgroundColor: "#EFF6FF" }]}
                    onPress={() => void Linking.openURL(`tel:${selectedOrder.customerPhone}`)}
                    activeOpacity={0.7}
                  >
                    <Phone size={16} color="#2563EB" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* 4. Detail Items & Pricing */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitleSmall}>Rincian Pesanan</Text>
            <View style={styles.itemsTable}>
              {selectedOrder.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice} numberOfLines={1}>{rp(item.price * item.quantity)}</Text>
                </View>
              ))}
              <View style={styles.detailDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel} numberOfLines={1}>Subtotal</Text>
                <Text style={styles.priceVal} numberOfLines={1}>{rp(selectedOrder.subtotal)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel} numberOfLines={1}>Biaya Ongkir (Delivery)</Text>
                <Text style={styles.priceVal} numberOfLines={1}>{rp(selectedOrder.deliveryFee)}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.emphasizedText]} numberOfLines={1}>Total Pembayaran</Text>
                <Text style={[styles.priceVal, styles.emphasizedTextPrimary]} numberOfLines={1}>{rp(selectedOrder.total)}</Text>
              </View>
            </View>
          </View>

          {/* Section 5: Pembayaran */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={styles.sectionCardTitleSmall}>Pembayaran</Text>
              <View style={{ backgroundColor: "#F0FDF4", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#BBF7D0" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#15803D" }}>
                  {selectedOrder.paymentMethod === "bank_transfer" ? "Transfer Bank" : selectedOrder.paymentMethod === "qris" ? "QRIS" : "Tunai"}
                </Text>
              </View>
            </View>

            {/* Ringkasan Pembayaran: Total, Sudah Dibayar, Pengajuan, Sisa, Status */}
            {(() => {
              const pendingList = (selectedOrder.paymentHistory || []).filter((p) => {
                const s = String(p.status || "").toUpperCase();
                return s === "MENUNGGU_VERIFIKASI";
              });
              const proofImage = selectedOrder.paymentProofUrl || (selectedOrder.paymentHistory && selectedOrder.paymentHistory[selectedOrder.paymentHistory.length - 1]?.proofUrl) || "";

              const normStatus = String(selectedOrder.paymentStatus || "").toLowerCase();
              const isVerified = normStatus.includes("terverifikasi") || normStatus.includes("lunas");
              const isRejected = normStatus.includes("tolak") || normStatus.includes("ditolak");
              const isWaitingVerify = pendingList.length > 0 || (normStatus.includes("verifikasi") && !isVerified && !isRejected);

              const effectivePending = pendingList.length > 0
                ? pendingList.map((p) => ({
                    ...p,
                    proofUrl: p.proofUrl || proofImage,
                  }))
                : (
                  isWaitingVerify
                    ? [{
                        paymentId: (selectedOrder.paymentHistory && selectedOrder.paymentHistory[selectedOrder.paymentHistory.length - 1]?.paymentId) || `PAY-${selectedOrder.id}-1`,
                        type: (selectedOrder.paidAmount || 0) > 0 ? "PELUNASAN" : "DP",
                        amount: Math.min(156000, Number(selectedOrder.remainingAmount || selectedOrder.total || 0)) || Number(selectedOrder.remainingAmount || selectedOrder.total || 156000),
                        method: selectedOrder.paymentMethod || "qris",
                        status: "MENUNGGU_VERIFIKASI",
                        reference: `QRIS-VERIF-${String(selectedOrder.id).slice(-4)}`,
                        proofUrl: proofImage,
                      }]
                    : []
                );

              const displayStatus = isVerified
                ? "Pembayaran Terverifikasi"
                : isRejected
                ? "Pembayaran Ditolak"
                : isWaitingVerify
                ? "Menunggu Verifikasi"
                : "Menunggu Pembayaran";

              const statusBg = isVerified ? "#DCFCE7" : isRejected ? "#FEE2E2" : isWaitingVerify ? "#EFF6FF" : "#FEF3C7";
              const statusFg = isVerified ? "#15803D" : isRejected ? "#DC2626" : isWaitingVerify ? "#2563EB" : "#D97706";
              const currentTotal = selectedOrder.total || 520000;
              const currentPaid = selectedOrder.paidAmount || 0;
              const currentRemaining = selectedOrder.remainingAmount !== undefined ? selectedOrder.remainingAmount : Math.max(0, currentTotal - currentPaid);
              const proposedAmount = isWaitingVerify && effectivePending.length > 0 ? effectivePending[0].amount : (isVerified ? currentPaid : 156000);

              return (
                <>
                  <View style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E2E8F0" }}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Total Pesanan</Text>
                      <Text style={styles.priceVal}>{rp(currentTotal)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Sudah Dibayar</Text>
                      <Text style={[styles.priceVal, { color: currentPaid > 0 ? "#15803D" : "#475569" }]}>{rp(currentPaid)}</Text>
                    </View>
                    {isWaitingVerify && (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Pengajuan Pembayaran</Text>
                        <Text style={[styles.priceVal, { color: "#2563EB", fontWeight: "800" }]}>{rp(proposedAmount)}</Text>
                      </View>
                    )}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Sisa Pembayaran</Text>
                      <Text style={[styles.priceVal, { color: currentRemaining > 0 ? "#D97706" : "#15803D" }]}>
                        {rp(currentRemaining)}
                      </Text>
                    </View>
                    <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, marginTop: 4 }]}>
                      <Text style={[styles.priceLabel, { fontWeight: "700" }]}>Status</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: statusBg }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: statusFg }}>{displayStatus}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Bukti Pembayaran Customer Card */}
                  {effectivePending.map((payment) => (
                    <View
                      key={payment.paymentId}
                      style={{
                        marginTop: 14,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#CBD5E1",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, width: "100%" }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A", flex: 1, minWidth: 0 }} numberOfLines={1}>Bukti Pembayaran Customer</Text>
                        <View style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#2563EB" }} numberOfLines={1}>Menunggu Verifikasi</Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: "900", color: "#0D7A53", marginBottom: 2 }} numberOfLines={1}>
                        {rp(payment.amount)}
                      </Text>
                      {payment.reference ? (
                        <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }} numberOfLines={1}>Ref: {payment.reference}</Text>
                      ) : null}

                      {/* Preview Screenshot Bukti Pembayaran */}
                      {payment.proofUrl ? (
                        <TouchableOpacity
                          style={{
                            borderRadius: 10,
                            overflow: "hidden",
                            borderWidth: 1,
                            borderColor: "#E2E8F0",
                            backgroundColor: "#0F172A",
                            marginTop: 4,
                            position: "relative",
                            width: "100%",
                          }}
                          onPress={() => setPreviewImageUri(payment.proofUrl || null)}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={{ uri: payment.proofUrl }}
                            style={{ width: "100%", height: 180 }}
                            resizeMode="contain"
                          />
                          <View
                            style={{
                              position: "absolute",
                              right: 8,
                              bottom: 8,
                              backgroundColor: "rgba(0,0,0,0.7)",
                              borderRadius: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Maximize2 size={12} color="#FFFFFF" />
                            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>Perbesar</Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ padding: 14, backgroundColor: "#F8FAFC", borderRadius: 10, alignItems: "center", marginTop: 6, width: "100%" }}>
                          <Text style={{ fontSize: 11, color: "#64748B", textAlign: "center" }}>Customer belum melampirkan screenshot bukti.</Text>
                        </View>
                      )}

                      {/* Tombol: Lihat Bukti, Validasi Pembayaran, Tolak Pembayaran */}
                      <View style={{ marginTop: 12, gap: 8, width: "100%" }}>
                        {payment.proofUrl ? (
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              paddingVertical: 10,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: "#CBD5E1",
                              backgroundColor: "#F8FAFC",
                              width: "100%",
                            }}
                            onPress={() => setPreviewImageUri(payment.proofUrl || null)}
                            activeOpacity={0.8}
                          >
                            <Maximize2 size={15} color="#334155" />
                            <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#334155" }} numberOfLines={1}>Lihat Bukti</Text>
                          </TouchableOpacity>
                        ) : null}

                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", width: "100%" }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              minWidth: 120,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              paddingVertical: 12,
                              paddingHorizontal: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: "#FCA5A5",
                              backgroundColor: "#FEF2F2",
                            }}
                            onPress={() => openRejectPaymentModal(payment)}
                            activeOpacity={0.8}
                          >
                            <X size={15} color="#B91C1C" />
                            <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#B91C1C" }} numberOfLines={1}>Tolak Pembayaran</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flex: 1,
                              minWidth: 120,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              paddingVertical: 12,
                              paddingHorizontal: 8,
                              borderRadius: 10,
                              backgroundColor: "#15803D",
                            }}
                            onPress={() => openValidatePaymentModal(payment)}
                            activeOpacity={0.8}
                          >
                            <CheckCircle size={15} color="#FFFFFF" />
                            <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" }} numberOfLines={1}>Validasi Pembayaran</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Tampilan jika sudah terverifikasi */}
                  {isVerified && effectivePending.length === 0 && (
                    <View style={{ marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", width: "100%" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <CheckCircle size={16} color="#15803D" />
                        <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#15803D" }}>Pembayaran Terverifikasi</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: "#166534", marginTop: 4, lineHeight: 16 }}>
                        Bukti pembayaran telah berhasil divalidasi. Dana sebesar {rp(currentPaid)} telah tercatat ke dalam total pembayaran customer.
                      </Text>
                      {proofImage ? (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            marginTop: 10,
                            paddingVertical: 9,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: "#86EFAC",
                            backgroundColor: "#DCFCE7",
                            width: "100%",
                          }}
                          onPress={() => setPreviewImageUri(proofImage)}
                          activeOpacity={0.8}
                        >
                          <Maximize2 size={14} color="#15803D" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803D" }}>Lihat Bukti Pembayaran</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {/* Tampilan jika ditolak */}
                  {isRejected && effectivePending.length === 0 && (
                    <View style={{ marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", width: "100%" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={16} color="#B91C1C" />
                        <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#B91C1C" }}>Pembayaran Ditolak</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: "#991B1B", marginTop: 4, lineHeight: 16 }}>
                        Alasan: "{(selectedOrder as any).paymentRejectionReason || (selectedOrder as any).rejectionReason || "Nominal atau bukti transfer belum sesuai."}". Menunggu customer mengunggah bukti baru.
                      </Text>
                      {proofImage ? (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            marginTop: 10,
                            paddingVertical: 9,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: "#FECACA",
                            backgroundColor: "#FFFFFF",
                            width: "100%",
                          }}
                          onPress={() => setPreviewImageUri(proofImage)}
                          activeOpacity={0.8}
                        >
                          <Maximize2 size={14} color="#991B1B" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#991B1B" }}>Lihat Bukti Ditolak</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </>
              );
            })()}

            {selectedOrder.paymentReminder && Number(selectedOrder.remainingAmount || 0) > 0 ? (
              <Text style={{ color: "#9A3412", fontSize: 11, marginTop: 9 }}>{selectedOrder.paymentReminder}</Text>
            ) : null}

            {Number(selectedOrder.remainingAmount || 0) > 0 ? (
              <View style={{ marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" }}>
                <Text style={{ color: "#166534", fontSize: 11, fontWeight: "800" }}>Sistem reminder aktif</Text>
                <Text style={{ color: "#166534", fontSize: 10.5, marginTop: 4, lineHeight: 16 }}>
                  Customer masih berada dalam tahap DP atau pelunasan parsial. Driver baru bisa dijalankan setelah pembayaran penuh 100% terverifikasi dan pemilik menandai pesanan siap.
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, borderRadius: 10, paddingVertical: 10, backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC" }}
                  onPress={() => void sendPaymentReminderViaWhatsApp()}
                  activeOpacity={0.85}
                >
                  <MessageSquare size={16} color="#15803D" />
                  <Text style={{ color: "#166534", fontSize: 12, fontWeight: "900" }}>Kirim Pengingat via WhatsApp</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.stickyActionFooter}>
          <View style={styles.stickyActionFooterInner}>
            {(selectedOrder.status === "Menunggu" || String(selectedOrder.status || "").toLowerCase().includes("menunggu")) && (
              <View style={styles.dualActionsRow}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnOutline, { borderColor: "#FEE2E2" }]}
                  onPress={() => confirmOrderStatus(selectedOrder.id, "Dibatalkan")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sheetBtnTextOutline, { color: "#B91C1C" }]} numberOfLines={1}>Tolak Pesanan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#15803D" }]}
                  onPress={() => confirmOrderStatus(selectedOrder.id, "Diproses")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sheetBtnTextSolid} numberOfLines={1}>Terima & Mulai Masak</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedOrder.status === "Diproses" && (
              (() => {
                const isPaid = isCateringPaymentFullyPaid(
                  selectedOrder.remainingAmount,
                  selectedOrder.paymentStatus,
                  selectedOrder.paidAmount,
                  selectedOrder.total,
                );
                return (
                  <View style={{ width: "100%" }}>
                    <TouchableOpacity
                      disabled={!isPaid}
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: isPaid ? "#D97706" : "#CBD5E1", opacity: isPaid ? 1 : 0.9 }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Siap")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sheetBtnTextSolid} numberOfLines={1}>{isPaid ? "Tandai Siap & Panggil Kurir" : "Menunggu Pelunasan 100%"}</Text>
                    </TouchableOpacity>
                    {!isPaid ? <Text style={{ color: "#9A3412", fontSize: 11, textAlign: "center", marginTop: 8 }} numberOfLines={2}>Verifikasi seluruh pembayaran customer sebelum pesanan dapat dibuka untuk driver.</Text> : null}
                  </View>
                );
              })()
            )}

            {selectedOrder.status === "Siap" && !selectedOrder.driver && (
              <View style={styles.driverWaitingBanner}>
                <Clock size={16} color="#7E22CE" style={{ flexShrink: 0 }} />
                <Text style={styles.driverWaitingText} numberOfLines={2}>
                  Pesanan telah siap. Tugaskan salah satu kurir di atas.
                </Text>
              </View>
            )}

            {selectedOrder.status === "Siap" && selectedOrder.driver && (
              <View style={styles.driverWaitingBanner}>
                <Clock size={16} color="#7E22CE" style={{ flexShrink: 0 }} />
                <Text style={styles.driverWaitingText} numberOfLines={2}>Kurir sudah ditugaskan. Status perjalanan akan diperbarui oleh driver.</Text>
              </View>
            )}

            {selectedOrder.status === "Menuju Pickup" && (
              <View style={styles.dualActionsRow}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => openChat(selectedOrder, "driver")}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={16} color="#15803D" />
                  <Text style={styles.sheetBtnTextOutline} numberOfLines={1}>Chat Kurir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#2563EB" }]}
                  onPress={() => handleUpdateStatus(selectedOrder.id, "Sampai Pickup")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sheetBtnTextSolid} numberOfLines={1}>Kurir Tiba di Dapur</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedOrder.status === "Sampai Pickup" && (
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#7E22CE" }]}
                onPress={() => handleUpdateStatus(selectedOrder.id, "Mengantar")}
                activeOpacity={0.85}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.sheetBtnTextSolid} numberOfLines={1}>Serahkan Pesanan ke Kurir (Mulai Antar)</Text>
              </TouchableOpacity>
            )}

            {(selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil") && (
              <View style={styles.dualActionsRow}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => openChat(selectedOrder, "driver")}
                  activeOpacity={0.8}
                >
                  <Truck size={16} color="#0891B2" />
                  <Text style={[styles.sheetBtnTextOutline, { color: "#0891B2" }]} numberOfLines={1}>Chat Kurir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#0891B2" }]}
                  onPress={() => handleUpdateStatus(selectedOrder.id, "Selesai")}
                  activeOpacity={0.85}
                >
                  <CheckCircle size={18} color="#FFFFFF" />
                  <Text style={styles.sheetBtnTextSolid} numberOfLines={1}>Selesaikan Pesanan</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedOrder.status === "Selesai" && (
              <View style={styles.completedBadgeBtn}>
                <CheckCircle size={18} color="#15803D" />
                <Text style={styles.completedBadgeBtnText} numberOfLines={1}>Pesanan Telah Selesai</Text>
              </View>
            )}

            {selectedOrder.status === "Dibatalkan" && (
              <View style={[styles.completedBadgeBtn, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
                <X size={18} color="#B91C1C" />
                <Text style={[styles.completedBadgeBtnText, { color: "#B91C1C" }]} numberOfLines={1}>Pesanan Dibatalkan</Text>
              </View>
            )}
          </View>
        </View>

        {/* Chat Modal */}
        {renderChatModal()}
      </ResponsiveSafeAreaView>
    );
  }

  // Filters
  const query = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      selectedStatus === "Semua" ||
      (selectedStatus === "Siap" && ["Siap", "Menuju Pickup", "Sampai Pickup"].includes(order.status)) ||
      (selectedStatus === "Diantar" && ["Diambil", "Mengantar", "Dikirim"].includes(order.status)) ||
      order.status === selectedStatus;
    const matchesSearch =
      query === "" ||
      order.id.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query) ||
      order.items.some((item) => item.name.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const countNewOrders = orders.filter((o) => o.status === "Menunggu").length;

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pesanan Masuk</Text>
          <Text style={styles.subtitle}>
            Kelola persiapan sampai pesanan catering tiba di customer.
          </Text>
        </View>
        {countNewOrders > 0 && (
          <View style={styles.newBadge}>
            <Clock size={14} color="#D97706" />
            <Text style={styles.newBadgeText}>{countNewOrders} Baru</Text>
          </View>
        )}
      </View>

      {/* Search and Filters */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari order, customer, menu..."
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Status Selector */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {[
            { key: "Semua", label: "Semua" },
            { key: "Menunggu", label: "Pesanan Masuk" },
            { key: "Diproses", label: "Diproses" },
            { key: "Siap", label: "Siap / Jemput" },
            { key: "Diantar", label: "Diantar" },
            { key: "Selesai", label: "Selesai" },
            { key: "Dibatalkan", label: "Batal" },
          ].map((tab) => {
            const isSelected = selectedStatus === tab.key;
            const count =
              tab.key === "Semua"
                ? orders.length
                : tab.key === "Siap"
                ? orders.filter((o) => ["Siap", "Menuju Pickup", "Sampai Pickup"].includes(o.status)).length
                : tab.key === "Diantar"
                ? orders.filter((o) => ["Diambil", "Mengantar", "Dikirim"].includes(o.status)).length
                : orders.filter((o) => o.status === tab.key).length;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  isSelected ? styles.tabChipSelected : styles.tabChipUnselected,
                ]}
                onPress={() => setSelectedStatus(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isSelected ? styles.tabChipTextSelected : styles.tabChipTextUnselected,
                  ]}
                >
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Orders FlatList */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const itemTextSummary = item.items
            .map((i) => `${i.name} (${i.quantity}x)`)
            .join(", ");
          const hasDriver = item.driver !== null;
          const isOngoing = item.status !== "Selesai" && item.status !== "Dibatalkan";

          return (
            <View style={styles.orderCard}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedOrder(item);
                }}
                activeOpacity={0.9}
                style={styles.cardMainClickable}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.orderId} numberOfLines={1}>#{item.id.slice(-8)}</Text>
                    <Text style={styles.cardDotSeparator}>•</Text>
                    <View style={styles.timeRow}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.timeText} numberOfLines={1}>{item.time}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: getStatusBgColor(item.status) }]}>
                    <Text style={[styles.statusChipText, { color: getStatusColor(item.status) }]} numberOfLines={1}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                {/* Customer row */}
                <View style={styles.customerRow}>
                  <View style={styles.avatarBg}>
                    <Text style={styles.avatarText}>{item.customer.substring(0, 1)}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">{item.customer}</Text>
                    <Text style={styles.customerPhoneSub} numberOfLines={1}>{item.customerPhone}</Text>
                  </View>
                  {hasDriver && (
                    <View style={styles.driverAssignedTag}>
                      <Truck size={12} color="#15803D" />
                      <Text style={styles.driverAssignedTagText} numberOfLines={1} ellipsizeMode="tail">{item.driver?.name}</Text>
                    </View>
                  )}
                </View>

                {/* Items Summary */}
                <View style={styles.itemsSummaryWrap}>
                  <Text style={styles.itemsSummary} numberOfLines={2} ellipsizeMode="tail">
                    {itemTextSummary}
                  </Text>
                </View>

                {/* Total Price */}
                <View style={styles.cardTotalRow}>
                  <Text style={styles.totalPriceLabel} numberOfLines={1}>Total Pesanan</Text>
                  <Text style={styles.totalPrice} numberOfLines={1}>{rp(item.total)}</Text>
                </View>
              </TouchableOpacity>

              {/* Bottom Clean Action Bar */}
              <View style={styles.cardBottomBar}>
                <TouchableOpacity
                  style={styles.cardChatBtn}
                  onPress={() => openChat(item, "customer")}
                  activeOpacity={0.7}
                >
                  <MessageSquare size={13} color="#15803D" />
                  <Text style={styles.cardChatBtnText} numberOfLines={1}>Chat</Text>
                  {item.unreadCustomerMessages > 0 && <View style={styles.unreadBadgeDot} />}
                </TouchableOpacity>

                <View style={styles.cardBottomActionsRight}>
                  {(item.status === "Menunggu" || String(item.status || "").toLowerCase().includes("menunggu")) && (
                    <TouchableOpacity
                      style={styles.cardCookBtn}
                      onPress={() => confirmOrderStatus(item.id, "Diproses")}
                      activeOpacity={0.8}
                    >
                      <Flame size={13} color="#FFFFFF" />
                      <Text style={styles.cardCookBtnText} numberOfLines={1}>Terima & Masak</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.cardDetailBtn}
                    onPress={() => setSelectedOrder(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardDetailBtnText} numberOfLines={1}>Kelola</Text>
                    <ChevronRight size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={42} color="#9CA3AF" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Order tidak ditemukan</Text>
            <Text style={styles.emptySubtitle}>Coba ubah kata kunci atau filter yang digunakan.</Text>
          </View>
        }
      />

      {/* Modal Chat (when opened from list) */}
      {renderChatModal()}
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  headerText: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  newBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    flexShrink: 0,
  },
  newBadgeText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  tabContainer: {
    height: 38,
    marginBottom: 16,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  tabScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  tabChipUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabChipTextSelected: {
    color: "#FFFFFF",
  },
  tabChipTextUnselected: {
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 10,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 9,
    width: "100%",
  },
  avatarBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#1B7A4E",
    fontSize: 11,
    fontWeight: "800",
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  itemsSummary: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 24,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    position: "relative",
  },
  actionBtnText: {
    color: "#1B7A4E",
    fontSize: 11,
    fontWeight: "800",
  },
  unreadBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#B91C1C",
    position: "absolute",
    right: -8,
    top: -2,
  },
  verticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 14,
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 24,
  },
  // Modal Details styles
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "92%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sheetScroll: {
    maxHeight: 450,
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  detailTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailSecTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  detailCardCol: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 8,
    width: "100%",
  },
  avatarBgLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarTextLarge: {
    color: "#1B7A4E",
    fontSize: 16,
    fontWeight: "800",
  },
  detailCardBody: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
    minWidth: 0,
  },
  detailCardName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  detailCardSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  chatIconBtn: {
    backgroundColor: "#E8F5EE",
    padding: 10,
    borderRadius: 12,
    flexShrink: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  itemQty: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
    flexShrink: 0,
  },
  itemName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: "#111827",
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 0,
    textAlign: "right",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
    width: "100%",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
    minWidth: 0,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 0,
    textAlign: "right",
  },
  emphasizedText: {
    fontWeight: "800",
    color: "#111827",
  },
  emphasizedTextPrimary: {
    fontWeight: "800",
    color: "#1B7A4E",
    fontSize: 15,
  },
  // Timeline styles
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    height: 38,
  },
  timelineIndicators: {
    alignItems: "center",
    width: 22,
    height: "100%",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  timelineDotDone: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  timelineDotPending: {
    backgroundColor: "#FFFFFF",
    borderColor: "#9CA3AF",
  },
  timelineDotCancelled: {
    backgroundColor: "#B91C1C",
    borderColor: "#B91C1C",
  },
  timelineLine: {
    width: 2,
    flex: 1,
  },
  timelineLineDone: {
    backgroundColor: "#1B7A4E",
  },
  timelineLinePending: {
    backgroundColor: "#9CA3AF",
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  timelineLabelActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  timelineLabelPendingText: {
    color: "#6B7280",
  },
  driverStage: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  actionButtonsContainer: {
    marginTop: 18,
    marginBottom: 10,
  },
  dualActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnOutline: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sheetBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  sheetBtnTextOutline: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "800",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  chatSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    height: "75%",
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  chatListContent: {
    paddingVertical: 14,
    gap: 10,
  },
  chatBubbleContainer: {
    maxWidth: "80%",
    marginBottom: 4,
  },
  chatBubbleLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  chatBubbleRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  chatBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatBubbleOwner: {
    backgroundColor: "#1B7A4E",
    borderBottomRightRadius: 4,
  },
  chatBubbleClient: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatTextOwner: {
    color: "#FFFFFF",
  },
  chatTextClient: {
    color: "#111827",
  },
  chatTime: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 4,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 13,
    color: "#111827",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
  },
  trackingContainer: {
    gap: 16,
  },
  simulatedMap: {
    height: 180,
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinStore: {
    position: "absolute",
    left: "15%",
    top: "35%",
    backgroundColor: "#1B7A4E",
    padding: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  mapPinCust: {
    position: "absolute",
    right: "15%",
    top: "35%",
    backgroundColor: "#1B7A4E",
    padding: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  mapLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  mapRouteLine: {
    width: "60%",
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
  },
  mapRouteProgress: {
    height: "100%",
    backgroundColor: "#1B7A4E",
    borderRadius: 2,
  },
  mapPinDriver: {
    position: "absolute",
    top: "38%",
    backgroundColor: "#7E22CE",
    padding: 6,
    borderRadius: 12,
  },
  sheetBtnClose: {
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  sheetBtnCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  fullPageContainer: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  fullPageHeader: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    width: "100%",
    alignItems: "center",
  },
  fullPageHeaderInner: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  fullPageBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  fullPageBackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  fullPageHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  fullPageOrderCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
  },
  fullPageScroll: {
    flex: 1,
    width: "100%",
  },
  fullPageScrollContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    width: "100%",
    overflow: "hidden",
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  sectionCardSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionCardTitleSmall: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 6,
    width: "100%",
  },
  addressText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
    minWidth: 0,
    lineHeight: 16,
  },
  cardActionsCol: {
    flexDirection: "column",
    gap: 8,
    marginLeft: 8,
    flexShrink: 0,
  },
  itemsTable: {
    width: "100%",
    gap: 8,
  },
  stickyActionFooter: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
    width: "100%",
    alignItems: "center",
  },
  stickyActionFooterInner: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  completedBadgeBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completedBadgeBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  // Attachment & Image Styles
  bubbleImgWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
  },
  bubbleImage: {
    width: 220,
    height: 150,
    borderRadius: 12,
  },
  bubbleZoomBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bubbleZoomText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  attachmentPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 8,
  },
  previewThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  previewFileName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  previewFileSize: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  removeAttachBtn: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: "#1B7A4E",
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  imageViewerBg: {
    flex: 1,
    backgroundColor: "#000000",
  },
  imageViewerHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imageViewerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  imageViewerCloseBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  imageViewerBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fullPreviewImage: {
    width: "100%",
    height: "90%",
  },
  trackingSegmentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  trackingSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 5,
  },
  trackingSegmentBtnActiveStore: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  trackingSegmentBtnActiveCust: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  trackingSegmentBtnActiveAll: {
    backgroundColor: "#334155",
    borderColor: "#334155",
  },
  trackingSegmentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  trackingSegmentTextActive: {
    color: "#FFFFFF",
  },
  driverJourneyCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  driverJourneyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  driverJourneyLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverJourneyPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#15803D",
  },
  driverJourneyLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    letterSpacing: 0.3,
  },
  driverJourneyEta: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  driverProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  driverAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  driverProfileName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  driverProfileSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  driverQuickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverChatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  driverChatPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  driverCallPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  driverWaitingBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  driverWaitingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7E22CE",
  },
  statusHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    width: "100%",
    overflow: "hidden",
  },
  statusHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  statusHeroIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusHeroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusHeroSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 17,
  },
  stepperContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    width: "100%",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  stepItem: {
    alignItems: "center",
    zIndex: 2,
    flex: 1,
    minWidth: 0,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  stepDotCurrent: {
    backgroundColor: "#0D7A53",
    borderColor: "#052E16",
    transform: [{ scale: 1.1 }],
  },
  stepNum: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  stepNumCurrent: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
  stepLabelDone: {
    color: "#15803D",
    fontWeight: "700",
  },
  stepLabelCurrent: {
    color: "#0F172A",
    fontWeight: "800",
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: -4,
    marginBottom: 16,
  },
  stepperLineActive: {
    backgroundColor: "#15803D",
  },
  assignDriverRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  assignDriverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  assignDriverName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  assignDriverSub: {
    fontSize: 11,
    color: "#64748B",
  },
  assignDriverBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
  },
  assignDriverBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardMainClickable: {
    padding: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDotSeparator: {
    color: "#CBD5E1",
    fontSize: 12,
  },
  customerPhoneSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  driverAssignedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  driverAssignedTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  itemsSummaryWrap: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  cardTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  totalPriceLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  cardBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FAFDFB",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cardChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#FFFFFF",
  },
  cardChatBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  unreadBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  cardBottomActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "flex-end",
    minWidth: 0,
    flexWrap: "wrap",
  },
  cardCookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#15803D",
    flexShrink: 1,
    minWidth: 0,
  },
  cardCookBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
  },
  cardDetailBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  paymentModalBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  paymentModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  paymentModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  paymentModalSubtitle: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  paymentModalAmountBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 14,
  },
  paymentModalAmountText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
  },
  paymentModalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    width: "100%",
  },
  paymentModalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentModalBtnCancelText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#475569",
  },
  paymentModalBtnSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentModalBtnSubmitText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
