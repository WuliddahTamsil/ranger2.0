import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  Image,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import {
  ShoppingBag,
  MapPin,
  Clock,
  Navigation,
  MessageSquare,
  Phone,
  CheckCircle,
  CheckCircle2,
  Check,
  Banknote,
  X,
  Truck,
  ArrowRight,
  Send,
  ChevronRight,
  Store,
  Bike,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Camera,
  Trash2,
  CheckCheck,
  AlertCircle,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  User,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { rp } from "../../utils/formatters";
import { getChatMessages, sendChatMessage, uploadFileToBackend } from "../../services/api";
import { subscribeToChatRealtime } from "../../services/chatRealtime";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";
import { SafeCallModal } from "../../components/SafeCallModal";
import { sortDriverOrders, isDriverOrderActive } from "./driverOrderUtils";

export type DriverOrderTab =
  | "Semua"
  | "Ride"
  | "Send"
  | "Shop"
  | "Marketplace"
  | "Catering"
  | "Setor Sampah"
  | "Laundry"
  | "Aktif"
  | "Selesai";

export const ORDER_TABS: DriverOrderTab[] = [
  "Semua",
  "Ride",
  "Send",
  "Shop",
  "Marketplace",
  "Catering",
  "Setor Sampah",
  "Laundry",
  "Aktif",
  "Selesai",
];

export interface DriverOrder {
  id: string;
  orderCode?: string;
  orderCategory?: "RIDE" | "DELIVERY";
  serviceType?: string;
  vehicleType?: "MOTOR" | "CAR" | string;
  estimatedDuration?: number;
  driverId?: string | null;
  rawStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  customer: string;
  phone: string;
  type: "Catering" | "Marketplace" | "Laundry" | "Kanyaah Ride" | "Kanyaah Send" | "Setor Sampah" | "Shop";
  time: string;
  createdAt?: string;
  acceptedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  distanceKm?: number;
  from: string;
  to: string;
  dist: string;
  pay: number;
  driverShare: number;
  status: "Menunggu" | "Siap" | "Menuju Pickup" | "Sampai Pickup" | "Mengantar" | "Selesai" | "Dibatalkan";
  items?: { name: string; quantity: number; price: number; notes?: string }[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  ownerId?: string;
  deliveryProofUrl?: string;
  deliveryProofTimestamp?: string;
  deliveredAt?: string;
  notes?: string;
  pickup?: { address: string; latitude: number; longitude: number };
  destination?: { address: string; latitude: number; longitude: number };
  addressSnapshot?: {
    label?: string;
    fullAddress?: string;
    accessType?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  rating?: {
    score: number;
    review?: string;
    createdAt?: string;
  };
}

interface OrderProps {
  orders: DriverOrder[];
  setOrders: React.Dispatch<React.SetStateAction<DriverOrder[]>>;
  balance: number;
  setBalance: (bal: number) => void;
  transactions: any[];
  setTransactions: (txs: any[]) => void;
  isOnline: boolean;
  onStatusChange?: (orderId: string, status: DriverOrder["status"], deliveryProofUrl?: string, deliveryProofTimestamp?: string) => Promise<boolean | DriverOrder>;
  onAcceptOrder?: (orderId: string) => Promise<boolean | DriverOrder>;
  onDeclineOrder?: (orderId: string) => Promise<boolean>;
  driverId?: string;
  driverName?: string;
  driverVehicle?: string;
  driverPlate?: string;
  selectedOrderId?: string | null;
  onClearSelectedOrder?: () => void;
}

interface ChatAttachment {
  type: "image" | "file" | "video";
  uri: string;
  name?: string;
  size?: string;
}

interface DriverChatMessage {
  id?: string;
  sender: "driver" | "customer" | "owner";
  text: string;
  time: string;
  attachment?: ChatAttachment;
}

export const Order: React.FC<OrderProps> = ({
  orders,
  setOrders,
  balance,
  setBalance,
  transactions,
  setTransactions,
  isOnline,
  onStatusChange,
  onAcceptOrder,
  onDeclineOrder,
  driverId,
  driverName,
  driverVehicle,
  driverPlate,
  selectedOrderId,
  onClearSelectedOrder,
}) => {
  const effectiveDriverName = driverName || "Driver Rangers";
  const effectiveDriverVehicle = [driverVehicle, driverPlate].filter(Boolean).join(" • ") || "Sepeda Motor";

  const [activeTab, setActiveTab] = useState<DriverOrderTab>("Semua");
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);

  useEffect(() => {
    if (selectedOrderId) {
      const match = orders.find((o) => o.id === selectedOrderId);
      if (match) {
        setSelectedOrder(match);
      }
    }
  }, [selectedOrderId, orders]);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatTarget, setChatTarget] = useState<"owner" | "customer">("owner");

  const [typedMessage, setTypedMessage] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, DriverChatMessage[]>>({});
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [cardMapExpanded, setCardMapExpanded] = useState<Record<string, boolean>>({});
  const [cardNavMode, setCardNavMode] = useState<Record<string, "overview" | "store" | "customer">>({});
  const [navMode, setNavMode] = useState<"overview" | "store" | "customer">("store");
  const [fullscreenMapVisible, setFullscreenMapVisible] = useState(false);
  const [isNavigatingMap, setIsNavigatingMap] = useState(false);
  const [mutatingOrderId, setMutatingOrderId] = useState<string | null>(null);
  const [proofUploadOrderId, setProofUploadOrderId] = useState<string | null>(null);
  const [proofUploadError, setProofUploadError] = useState<{ orderId: string; message: string } | null>(null);
  const [deliveryProofOrder, setDeliveryProofOrder] = useState<DriverOrder | null>(null);
  const [safeCallVisible, setSafeCallVisible] = useState(false);
  const [safeCallTarget, setSafeCallTarget] = useState<{ name: string; role: string; phone: string; orderCode: string } | null>(null);
  const [dismissedIncomingId, setDismissedIncomingId] = useState<string | null>(null);
  const mutationLockRef = useRef(new Set<string>());
  const proofUploadLockRef = useRef(new Set<string>());

  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((order) => order.id === selectedOrder.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedOrder)) setSelectedOrder(fresh);
  }, [orders, selectedOrder]);

  // Auto load & poll chat messages
  useEffect(() => {
    if (!chatModalVisible || !selectedOrder) return;

    const loadMessages = async () => {
      const result = await getChatMessages(selectedOrder.id, chatTarget, "driver");
      if (result.success && Array.isArray(result.data)) {
        const key = `${selectedOrder.id}-${chatTarget}`;
        setChatMessages((previous) => ({
          ...previous,
          [key]: result.data.map((message: any) => ({
            id: message._id,
            sender: message.sender,
            text: message.text,
            time: new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            attachment: message.attachment,
          })),
        }));
      }
    };

    void loadMessages();
    const interval = setInterval(() => void loadMessages(), 3000);
    let unsubscribeRealtime: () => void = () => undefined;
    void subscribeToChatRealtime(selectedOrder.id, () => void loadMessages()).then((unsubscribe) => {
      unsubscribeRealtime = unsubscribe;
    });
    return () => {
      clearInterval(interval);
      unsubscribeRealtime();
    };
  }, [chatModalVisible, selectedOrder, chatTarget]);

  // 100% In-App Navigation helpers (NEVER redirect outside the app)
  const openNavigationToStore = (order: DriverOrder) => {
    setNavMode("store");
    setCardNavMode((prev) => ({ ...prev, [order.id]: "store" }));
    setSelectedOrder(order);
  };

  const openNavigationToCustomer = (order: DriverOrder) => {
    setNavMode("customer");
    setCardNavMode((prev) => ({ ...prev, [order.id]: "customer" }));
    setSelectedOrder(order);
  };

  const openPhoneCall = (phoneNumber?: string, name?: string, role?: string, order?: DriverOrder) => {
    const targetOrder = order || selectedOrder;
    const phone = phoneNumber || targetOrder?.phone || targetOrder?.storePhone || "";
    setSafeCallTarget({
      name: name || (targetOrder?.type === "Kanyaah Ride" ? targetOrder.customer : targetOrder?.storeName || "Kontak"),
      role: role || (targetOrder?.type === "Kanyaah Ride" ? "Penumpang" : "Customer"),
      phone,
      orderCode: targetOrder?.orderCode || targetOrder?.id || "",
    });
    setSafeCallVisible(true);
  };

  // Image picking helpers
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Akses", "Mohon izinkan akses galeri foto.");
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
      console.log("Image picker error:", err);
    }
  };

    const handlePickVideo = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Akses", "Mohon izinkan akses galeri untuk memilih video.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileSize = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "Video";
        setSelectedAttachment({
          type: "video",
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: fileSize,
        });
      }
    } catch (err) {
      console.log("Video picker error:", err);
    }
  };

  const handlePickCamera = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Kamera", "Mohon izinkan akses kamera.");
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
      console.log("Camera error:", err);
    }
  };

  // Status updates with clean notifications
  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: DriverOrder["status"],
    deliveryProofUrl?: string,
    deliveryProofTimestamp?: string
  ): Promise<boolean> => {
    if (mutationLockRef.current.has(orderId)) return false;
    mutationLockRef.current.add(orderId);
    setMutatingOrderId(orderId);
    try {
      const result = onStatusChange
        ? await onStatusChange(orderId, nextStatus, deliveryProofUrl, deliveryProofTimestamp)
        : true;
      if (result === false) return false;
      const currentOrder = orders.find((order) => order.id === orderId);
      const serverOrder = typeof result === "object" ? result : null;
      const updatedOrder = serverOrder || (currentOrder ? {
        ...currentOrder,
        status: nextStatus,
        ...(deliveryProofUrl ? { deliveryProofUrl } : {}),
        ...(deliveryProofTimestamp ? { deliveryProofTimestamp } : {}),
        acceptedAt: currentOrder.acceptedAt || (nextStatus === "Selesai" ? currentOrder.createdAt : new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        completedAt: nextStatus === "Selesai" ? new Date().toISOString() : currentOrder.completedAt,
        deliveredAt: nextStatus === "Selesai" ? new Date().toISOString() : currentOrder.deliveredAt,
      } : null);
      if (!updatedOrder) return false;
      setOrders((current) => sortDriverOrders(current.map((order) => order.id === orderId ? updatedOrder : order)));
      if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);

      const getArrivalTitle = (order: DriverOrder) => {
        if (order.type === "Kanyaah Ride") return "Tiba di Titik Jemput";
        if (order.type === "Kanyaah Send") return "Tiba di Pengirim";
        if (order.type === "Catering") return "Tiba di Dapur Catering";
        if (order.type === "Setor Sampah") return "Tiba di Rumah Customer";
        return "Tiba di Toko / Resto";
      };

      const getPickupTitle = (order: DriverOrder) => {
        if (order.type === "Kanyaah Ride") return "Perjalanan Dimulai";
        if (order.type === "Kanyaah Send") return "Paket Diambil";
        if (order.type === "Catering") return "Makanan Diambil";
        return "Pesanan Diambil";
      };

      const alertCopy: Record<string, [string, string]> = {
        "Sampai Pickup": [getArrivalTitle(updatedOrder), "Konfirmasi kedatangan tersimpan."],
        Mengantar: [getPickupTitle(updatedOrder), "Dikonfirmasi telah diambil dan status pengantaran diperbarui."],
        Selesai: ["Pengantaran Selesai", `${deliveryProofUrl ? "Bukti foto & timestamp tersimpan. " : ""}Pendapatan ${rp(updatedOrder.driverShare)} ditambahkan ke saldo.`],
      };
      const [title, message] = alertCopy[nextStatus] || ["Status Diperbarui", `Status pesanan sekarang ${nextStatus}.`];
      Alert.alert(title, message);
      return true;
    } catch (error) {
      console.error("Status change error:", error);
      Alert.alert("Status belum diperbarui", "Periksa koneksi lalu coba lagi. Pesanan tetap pada status sebelumnya.");
      return false;
    } finally {
      mutationLockRef.current.delete(orderId);
      setMutatingOrderId((current) => current === orderId ? null : current);
    }
  };

  const completeDeliveryProof = async (order: DriverOrder, source: "camera" | "library") => {
    if (proofUploadLockRef.current.has(order.id) || mutationLockRef.current.has(order.id)) return;
    proofUploadLockRef.current.add(order.id);
    setProofUploadOrderId(order.id);
    setProofUploadError(null);
    try {
      if (Platform.OS !== "web") {
        const permission = source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error(source === "camera" ? "Izinkan akses kamera untuk mengambil foto bukti serah terima." : "Izinkan akses galeri untuk memilih foto bukti serah terima.");
        }
      }

      const selection = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: false });
      if (selection.canceled) return;

      const asset = selection.assets?.[0];
      if (!asset?.uri) throw new Error("Pilih atau ambil satu foto bukti pengantaran.");

      const now = new Date();
      const realTimestamp = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(now) + " WIB";

      const fileName = asset.fileName || `bukti-pengantaran-${order.id}-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || (fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
      const uploadResult = await uploadFileToBackend(asset.uri, fileName, mimeType);
      const proofUrl = uploadResult?.data?.url;
      if (!uploadResult?.success || typeof proofUrl !== "string" || !proofUrl.trim()) {
        throw new Error(uploadResult?.message || "Foto bukti gagal diunggah. Coba ambil foto kembali.");
      }

      const updated = await handleUpdateStatus(order.id, "Selesai", proofUrl, realTimestamp);
      if (!updated) throw new Error("Foto sudah diunggah, tetapi status belum tersimpan. Silakan coba lagi.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Foto bukti gagal diunggah. Periksa koneksi lalu coba lagi.";
      setProofUploadError({ orderId: order.id, message });
    } finally {
      proofUploadLockRef.current.delete(order.id);
      setProofUploadOrderId((current) => current === order.id ? null : current);
    }
  };

  const handleDriverTransition = (order: DriverOrder, nextStatus: DriverOrder["status"]) => {
    if ((order.type === "Marketplace" || order.type === "Catering") && nextStatus === "Selesai") {
      setProofUploadError(null);
      setDeliveryProofOrder(order);
      return;
    }
    if (order.type === "Kanyaah Ride" && nextStatus === "Selesai") {
      if (Platform.OS === "web") {
        void handleUpdateStatus(order.id, "Selesai");
        return;
      }
      Alert.alert(
        "Selesaikan Perjalanan",
        "Pastikan penumpang telah sampai di lokasi tujuan dengan selamat. Selesaikan perjalanan?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Selesai",
            onPress: () => {
              void handleUpdateStatus(order.id, "Selesai");
            },
          },
        ]
      );
      return;
    }
    if (order.type === "Kanyaah Send" && nextStatus === "Selesai") {
      if (Platform.OS === "web") {
        void handleUpdateStatus(order.id, "Selesai");
        return;
      }
      Alert.alert(
        "Selesaikan Pengantaran Paket",
        "Pastikan paket telah diserahkan dengan aman kepada penerima. Selesaikan pesanan pengiriman?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Selesai",
            onPress: () => {
              void handleUpdateStatus(order.id, "Selesai");
            },
          },
        ]
      );
      return;
    }
    void handleUpdateStatus(order.id, nextStatus);
  };

  const renderDeliveryProofPicker = () => {
    if (!deliveryProofOrder) return null;
    const order = deliveryProofOrder;
    const startProofCapture = (source: "camera" | "library") => {
      setDeliveryProofOrder(null);
      void completeDeliveryProof(order, source);
    };

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setDeliveryProofOrder(null)}
      >
        <View style={styles.proofPickerBackdrop}>
          <View style={styles.proofPickerCard}>
            <View style={styles.proofPickerIcon}>
              <Camera size={22} color="#15803D" />
            </View>
            <Text style={styles.proofPickerTitle}>
              {order.type === "Catering" ? "Bukti Serah Terima Catering" : "Foto Bukti Pengantaran"}
            </Text>
            <Text style={styles.proofPickerDescription}>
              Ambil foto pesanan langsung di hadapan customer sebagai bukti serah terima sah. Sistem akan merekam tanggal & jam aktual (WIB) yang akan ditampilkan di halaman customer.
            </Text>
            <Pressable
              style={styles.proofPickerPrimaryButton}
              accessibilityRole="button"
              onPress={() => startProofCapture("camera")}
            >
              <Camera size={17} color="#FFFFFF" />
              <Text style={styles.proofPickerPrimaryText}>Ambil Foto Kamera (Device)</Text>
            </Pressable>
            <Pressable
              style={styles.proofPickerSecondaryButton}
              accessibilityRole="button"
              onPress={() => startProofCapture("library")}
            >
              <ImageIcon size={17} color="#15803D" />
              <Text style={styles.proofPickerSecondaryText}>Pilih dari Galeri / Dokumen</Text>
            </Pressable>
            <Pressable
              style={styles.proofPickerCancelButton}
              accessibilityRole="button"
              onPress={() => setDeliveryProofOrder(null)}
            >
              <Text style={styles.proofPickerCancelText}>Batal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  const handleAcceptOrder = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || mutationLockRef.current.has(orderId)) return;
    mutationLockRef.current.add(orderId);
    setMutatingOrderId(orderId);
    try {
      const result = onAcceptOrder ? await onAcceptOrder(orderId) : true;
      if (result === false) return;

      const now = new Date().toISOString();
      const updatedOrder: DriverOrder = (result && typeof result === "object") ? {
        ...result,
        status: "Menuju Pickup",
        driverId: driverId || result.driverId || order.driverId,
        acceptedAt: now,
        updatedAt: now,
      } : {
        ...order,
        status: (order.type === "Kanyaah Ride" ? "Menuju Pickup" : "Menuju Pickup") as DriverOrder["status"],
        driverId: driverId || order.driverId,
        acceptedAt: now,
        updatedAt: now,
      };

      setOrders((current) => sortDriverOrders([updatedOrder, ...current.filter((item) => item.id !== orderId)]));
      if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);
      setActiveTab("Aktif");
      Alert.alert(
        order.type === "Kanyaah Ride"
          ? "Ride Diterima"
          : order.type === "Kanyaah Send"
          ? "Paket Diterima"
          : order.type === "Catering"
          ? "Catering Diterima"
          : "Pesanan Diterima",
        order.type === "Kanyaah Ride"
          ? "Pesanan berhasil diterima. Silakan bersiap menuju lokasi penjemputan penumpang."
          : order.type === "Kanyaah Send"
          ? "Pesanan berhasil diterima. Silakan menuju ke lokasi pengirim untuk mengambil paket."
          : order.type === "Catering"
          ? "Pesanan berhasil diterima. Silakan menuju ke dapur katering untuk mengambil makanan."
          : "Status pesanan diperbarui. Silakan menuju lokasi toko/resto."
      );
    } catch (error) {
      console.error("Accept order error:", error);
      Alert.alert("Pesanan belum diterima", "Periksa koneksi lalu coba lagi.");
    } finally {
      mutationLockRef.current.delete(orderId);
      setMutatingOrderId((current) => (current === orderId ? null : current));
    }
  };

  const handleDeclineOrder = (orderId: string) => {
    const executeDecline = async () => {
      if (mutationLockRef.current.has(orderId)) return;
      mutationLockRef.current.add(orderId);
      setMutatingOrderId(orderId);
      try {
        if (onDeclineOrder) {
          const success = await onDeclineOrder(orderId);
          if (!success) return;
        }
        setOrders((current) => current.filter((item) => item.id !== orderId));
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
      } catch (err: any) {
        console.error("Decline order error:", err);
        if (Platform.OS !== "web") {
          Alert.alert("Gagal Menolak", err.message || "Periksa koneksi lalu coba lagi.");
        }
      } finally {
        mutationLockRef.current.delete(orderId);
        setMutatingOrderId((current) => (current === orderId ? null : current));
      }
    };

    if (Platform.OS === "web") {
      void executeDecline();
      return;
    }

    Alert.alert(
      "Konfirmasi Penolakan",
      "Apakah Anda ingin menolak pesanan ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak Pesanan",
          style: "destructive",
          onPress: () => void executeDecline(),
        },
      ]
    );
  };

  // Open Chat Room with specific target channel
  const openChatRoom = (order: DriverOrder, target: "owner" | "customer" = "owner") => {
    setSelectedOrder(order);
    setChatTarget(target);
    setChatModalVisible(true);
  };

  // Send message
  const handleSendMessage = async (suggestedText?: string) => {
    const textToSend = (suggestedText || typedMessage).trim();
    if (!textToSend && !selectedAttachment) return;
    if (!selectedOrder) return;

    const chatKey = `${selectedOrder.id}-${chatTarget}`;
    const newMsg: DriverChatMessage = {
      sender: "driver",
      text: textToSend || (selectedAttachment?.type === "image" ? "Foto terkirim" : selectedAttachment?.type === "video" ? "Video terkirim" : "File terlampir"),
      time: "Baru saja",
      attachment: selectedAttachment ? { ...selectedAttachment } : undefined,
    };

    const currentHistory = chatMessages[chatKey] || [];
    setChatMessages({
      ...chatMessages,
      [chatKey]: [...currentHistory, newMsg],
    });

    setTypedMessage("");
    const attachmentToSend = selectedAttachment;
    setSelectedAttachment(null);

    const targetReceiverId = chatTarget === "owner" ? selectedOrder.ownerId : undefined;
    const result = await sendChatMessage(
      selectedOrder.id,
      "driver",
      newMsg.text,
      attachmentToSend,
      driverId,
      chatTarget,
      targetReceiverId
    );

    if (!result.success) {
      Alert.alert("Gagal mengirim", result.message || "Pesan belum tersimpan.");
    }
  };

  // Filter tab and sort: newest accepted orders always at the very top
  const filteredOrders = sortDriverOrders(
    orders.filter((order) => {
      switch (activeTab) {
        case "Ride":
          return order.type === "Kanyaah Ride";
        case "Send":
          return order.type === "Kanyaah Send";
        case "Shop":
          return order.type === "Shop";
        case "Marketplace":
          return order.type === "Marketplace";
        case "Catering":
          return order.type === "Catering";
        case "Setor Sampah":
          return order.type === "Setor Sampah";
        case "Laundry":
          return order.type === "Laundry";
        case "Aktif":
          return isDriverOrderActive(order);
        case "Selesai":
          return order.status === "Selesai";
        case "Semua":
        default:
          return true;
      }
    })
  );

  const getStatusColor = (status: string, order?: DriverOrder) => {
    if (order?.type === "Setor Sampah") {
      if (order.rawStatus === "DISPUTED") return "#DC2626";
      if (order.rawStatus === "WAITING_CUSTOMER_CONFIRMATION" || order.rawStatus === "WEIGHING") return "#D97706";
      if (order.rawStatus === "AT_BANK") return "#0891B2";
      if (order.rawStatus === "COMPLETED" || order.rawStatus === "POINT_ISSUED") return "#15803D";
    }
    switch (status) {
      case "Menunggu": return "#D97706";
      case "Siap": return "#15803D";
      case "Menuju Pickup": return "#2563EB";
      case "Sampai Pickup": return "#7E22CE";
      case "Mengantar": return "#0891B2";
      case "Selesai": return "#15803D";
      default: return "#DC2626";
    }
  };

  const getStatusBg = (status: string, order?: DriverOrder) => {
    if (order?.type === "Setor Sampah") {
      if (order.rawStatus === "DISPUTED") return "#FEE2E2";
      if (order.rawStatus === "WAITING_CUSTOMER_CONFIRMATION" || order.rawStatus === "WEIGHING") return "#FEF3C7";
      if (order.rawStatus === "AT_BANK") return "#ECFEFF";
      if (order.rawStatus === "COMPLETED" || order.rawStatus === "POINT_ISSUED") return "#DCFCE7";
    }
    switch (status) {
      case "Menunggu": return "#FEF3C7";
      case "Siap": return "#DCFCE7";
      case "Menuju Pickup": return "#EFF6FF";
      case "Sampai Pickup": return "#F3E8FF";
      case "Mengantar": return "#ECFEFF";
      case "Selesai": return "#DCFCE7";
      default: return "#FEE2E2";
    }
  };

  const getStatusBadgeLabel = (status: string, order?: DriverOrder) => {
    if (order?.type === "Kanyaah Ride") {
      switch (status) {
        case "Menunggu": return "Order Penumpang Masuk";
        case "Menuju Pickup": return "Menuju Titik Jemput";
        case "Sampai Pickup": return "Sampai di Penjemputan";
        case "Mengantar": return "Sedang Mengantar Penumpang";
        case "Selesai": return "Perjalanan Selesai";
        default: return "Dibatalkan";
      }
    }
    if (order?.type === "Setor Sampah") {
      if (order.rawStatus === "DISPUTED") {
        return "Komplain Timbangan";
      }
      if (order.rawStatus === "WAITING_CUSTOMER_CONFIRMATION" || order.rawStatus === "WEIGHING") {
        return "Menunggu Konfirmasi";
      }
      if (order.rawStatus === "AT_BANK") {
        return "Sampah di Bank";
      }
      if (order.rawStatus === "COMPLETED" || order.rawStatus === "POINT_ISSUED") {
        return "Setoran Selesai";
      }
      switch (status) {
        case "Menunggu": return "Jemput Sampah Daur Ulang";
        case "Menuju Pickup": return "Menuju Rumah Customer";
        case "Sampai Pickup": return "Tiba di Rumah Customer";
        case "Mengantar": return "Antar ke Bank Sampah";
        case "Selesai": return "Sampah Tiba di Bank";
        default: return "Dibatalkan";
      }
    }
    if (order?.type === "Laundry") {
      const isJemput = order.items?.[0]?.name?.includes("Jemput");
      if (isJemput) {
        switch (status) {
          case "Menunggu": return "Jemput Pakaian Kotor";
          case "Menuju Pickup": return "Menuju Rumah Customer";
          case "Sampai Pickup": return "Tiba di Rumah Customer";
          case "Mengantar": return "Antar Cucian ke Toko";
          case "Selesai": return "Cucian Tiba di Toko";
          default: return "Dibatalkan";
        }
      } else {
        switch (status) {
          case "Menunggu": return "Antar Pakaian Bersih";
          case "Menuju Pickup": return "Menuju Toko Laundry";
          case "Sampai Pickup": return "Tiba di Toko Laundry";
          case "Mengantar": return "Antar Bersih ke Customer";
          case "Selesai": return "Selesai Diantar";
          default: return "Dibatalkan";
        }
      }
    }
    if (order?.type === "Kanyaah Send") {
      switch (status) {
        case "Menunggu": return "Mencari Driver";
        case "Siap": return "Siap Dijemput";
        case "Menuju Pickup": return "Menuju Pengirim";
        case "Sampai Pickup": return "Tiba di Pengirim";
        case "Mengantar": return "Mengantar ke Penerima";
        case "Selesai": return "Paket Terkirim";
        default: return "Dibatalkan";
      }
    }
    if (order?.type === "Catering") {
      switch (status) {
        case "Menunggu": return "Order Catering";
        case "Siap": return "Siap Diambil";
        case "Menuju Pickup": return "Menuju Dapur Catering";
        case "Sampai Pickup": return "Tiba di Dapur Catering";
        case "Mengantar": return "Mengantar ke Pemesan";
        case "Selesai": return "Catering Diterima";
        default: return "Dibatalkan";
      }
    }
    switch (status) {
      case "Menunggu": return "Order Masuk";
      case "Siap": return "Siap Dijemput";
      case "Menuju Pickup": return "Menuju Toko / Resto";
      case "Sampai Pickup": return "Tiba di Toko / Resto";
      case "Mengantar": return "Mengantar ke Customer";
      case "Selesai": return "Selesai";
      default: return "Dibatalkan";
    }
  };

  const getServiceBadgeStyle = (type: string) => {
    switch (type) {
      case "Setor Sampah":
        return { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" };
      case "Kanyaah Ride":
        return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
      case "Kanyaah Send":
        return { bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5" };
      case "Shop":
        return { bg: "#EFF6FF", text: "#0284C7", border: "#BAE6FD" };
      case "Catering":
        return { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" };
      case "Laundry":
        return { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" };
      case "Marketplace":
        return { bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5" };
      default:
        return { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" };
    }
  };

  const getOriginLabel = (type: string, item: DriverOrder) => {
    if (type === "Setor Sampah") return "Jemput di Customer";
    if (type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")) return "Jemput di Customer";
    if (type === "Laundry") return "Ambil di Laundry";
    if (type === "Kanyaah Ride") return "Titik Jemput Penumpang";
    if (type === "Kanyaah Send") return "Ambil di Pengirim Paket";
    if (type === "Catering") return "Ambil di Dapur Catering";
    return "Ambil di Toko / Resto";
  };

  const getOriginTitle = (type: string, item: DriverOrder) => {
    if (type === "Setor Sampah" || (type === "Laundry" && item.items?.[0]?.name?.includes("Jemput"))) {
      return item.customer || "Customer";
    }
    if (type === "Kanyaah Ride") {
      return item.customer || "Penumpang";
    }
    if (type === "Kanyaah Send") {
      return item.customer || "Pengirim Paket";
    }
    if (type === "Catering") {
      return item.storeName || "Dapur Catering";
    }
    return (item.storeName || item.from || "Toko").replace(/^Tujuan:\s*/i, "").trim();
  };

  const getDestinationLabel = (type: string, item: DriverOrder) => {
    if (type === "Setor Sampah") return "Antar ke Bank Sampah";
    if (type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")) return "Antar ke Laundry";
    if (type === "Laundry") return "Antar ke Customer";
    if (type === "Kanyaah Ride") return "Lokasi Tujuan Penumpang";
    if (type === "Kanyaah Send") return "Antar ke Penerima Paket";
    if (type === "Catering") return "Antar ke Alamat Pemesan";
    return "Antar ke Customer";
  };

  const getDestinationTitle = (type: string, item: DriverOrder) => {
    if (type === "Setor Sampah" || (type === "Laundry" && item.items?.[0]?.name?.includes("Jemput"))) {
      return (item.storeName || item.to || "Bank Sampah").replace(/^Tujuan:\s*/i, "").trim();
    }
    if (type === "Kanyaah Ride") {
      return item.customer || "Tujuan Penumpang";
    }
    if (type === "Kanyaah Send") {
      return item.to || "Penerima Paket";
    }
    if (type === "Catering") {
      return item.customer || "Pemesan Catering";
    }
    return item.customer || "Customer";
  };

  const getStageStep = (status: string, order?: DriverOrder) => {
    if (order?.type === "Setor Sampah") {
      if (["AT_BANK", "WEIGHING", "WAITING_CUSTOMER_CONFIRMATION", "DISPUTED", "POINT_ISSUED", "COMPLETED"].includes(order.rawStatus || "")) {
        return 4;
      }
      if (order.rawStatus === "PICKED_UP") return 3;
      if (order.rawStatus === "DRIVER_ASSIGNED" || order.rawStatus === "PICKUP_ON_THE_WAY") return 1;
    }
    switch (status) {
      case "Menuju Pickup": return 1;
      case "Sampai Pickup": return 2;
      case "Mengantar": return 3;
      case "Selesai": return 4;
      default: return 0;
    }
  };

  const getQuickMessagesOwner = (order?: DriverOrder | null) => {
    if (order?.type === "Kanyaah Send") {
      return [
        "Saya sedang menuju lokasi pengambilan paket",
        "Saya sudah sampai di lokasi penjemputan",
        "Paket sudah siap untuk diambil?",
        "Paket telah saya ambil, terima kasih",
      ];
    }
    if (order?.type === "Catering") {
      return [
        "Saya sedang menuju dapur catering",
        "Saya sudah sampai di dapur catering",
        "Pesanan katering sudah siap dipickup?",
        "Pesanan telah saya ambil, terima kasih",
      ];
    }
    return [
      "Saya sudah sampai di depan toko",
      "Pesanan atas nama ini apakah sudah siap?",
      "Mohon ditunggu sebentar, saya sedang dalam perjalanan",
      "Pesanan sudah saya ambil, terima kasih",
    ];
  };

  const getQuickMessagesCustomer = (order?: DriverOrder | null) => {
    if (order?.type === "Kanyaah Send") {
      return [
        "Kurir sedang dalam perjalanan mengantar paket Anda",
        "Saya sudah tiba di alamat tujuan penerima",
        "Bisa tolong informasikan patokan rumah penerima?",
        "Paket telah diterima sesuai alamat, terima kasih",
      ];
    }
    if (order?.type === "Kanyaah Ride") {
      return [
        "Driver sedang dalam perjalanan menuju titik jemput",
        "Saya sudah sampai di titik penjemputan",
        "Saya menunggu di titik jemput, helm sudah siap",
        "Terima kasih telah menggunakan Kanyaah Ride",
      ];
    }
    if (order?.type === "Catering") {
      return [
        "Kurir sedang mengantar pesanan catering Anda",
        "Saya sudah sampai di lokasi pengantaran",
        "Bisa tolong konfirmasi penerimaan pesanan?",
        "Pesanan catering telah diserahkan, terima kasih",
      ];
    }
    return [
      "Kurir sedang dalam perjalanan mengantar pesanan Anda",
      "Saya sudah tiba di lokasi alamat Anda",
      "Bisa tolong informasikan patokan rumah atau nomor pagar?",
      "Pesanan telah dititipkan sesuai petunjuk, terima kasih",
    ];
  };

  // =========================================================================
  // RENDER: FULL PAGE VIEW WHEN AN ORDER IS SELECTED (NO POPUPS)
  // =========================================================================
  if (selectedOrder) {
    const step = getStageStep(selectedOrder.status, selectedOrder);

    return (
      <>
      <Modal
        visible={Boolean(selectedOrder)}
        animationType="slide"
        onRequestClose={() => {
          setSelectedOrder(null);
          onClearSelectedOrder?.();
        }}
      >
        <ResponsiveSafeAreaView style={styles.fullPageContainer}>
          {/* Sticky Top Bar */}
          <View style={styles.fullPageHeader}>
            <TouchableOpacity
              style={styles.fullPageBackBtn}
              onPress={() => {
                setSelectedOrder(null);
                onClearSelectedOrder?.();
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#0F172A" />
              <Text style={styles.fullPageBackText}>Kembali</Text>
            </TouchableOpacity>

          <View style={styles.fullPageHeaderRight}>
            <Text style={styles.fullPageOrderCode}>#{selectedOrder.id.slice(-8)}</Text>
            <View style={[styles.badge, { backgroundColor: getStatusBg(selectedOrder.status) }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(selectedOrder.status) }]}>
                {getStatusBadgeLabel(selectedOrder.status, selectedOrder)}
              </Text>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.fullPageScroll}
          contentContainerStyle={styles.fullPageScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Instruction Banner */}
          <View style={[styles.statusNoticeBanner, { backgroundColor: getStatusBg(selectedOrder.status) }]}>
            <AlertCircle size={18} color={getStatusColor(selectedOrder.status)} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusNoticeTitle, { color: getStatusColor(selectedOrder.status) }]}>
                {selectedOrder.type === "Kanyaah Ride" ? `${getStatusBadgeLabel(selectedOrder.status, selectedOrder)} • Antar Jemput Penumpang` : selectedOrder.type === "Setor Sampah" ? `${getStatusBadgeLabel(selectedOrder.status, selectedOrder)} • Kanyaah Recycle` : `${getStatusBadgeLabel(selectedOrder.status, selectedOrder)} • ${selectedOrder.type} Delivery`}
              </Text>
              <Text style={styles.statusNoticeText}>
                {selectedOrder.status === "Siap"
                  ? "Pesanan telah disiapkan dan siap Anda jemput."
                  : selectedOrder.status === "Menuju Pickup"
                  ? selectedOrder.type === "Setor Sampah"
                    ? "Driver sedang menuju ke rumah customer untuk mengambil sampah daur ulang."
                    : selectedOrder.type === "Marketplace"
                    ? "Anda sedang menuju toko. Lokasi GPS real-time belum tersedia di aplikasi."
                    : selectedOrder.type === "Kanyaah Send"
                    ? "Kurir sedang dalam perjalanan menuju lokasi pengirim untuk mengambil paket."
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "Driver sedang dalam perjalanan menuju lokasi penjemputan penumpang."
                    : selectedOrder.type === "Catering"
                    ? "Kurir sedang dalam perjalanan menuju dapur catering untuk mengambil pesanan."
                    : "Kurir sedang dalam perjalanan ke lokasi penjemputan."
                  : selectedOrder.status === "Sampai Pickup"
                  ? selectedOrder.type === "Setor Sampah"
                    ? "Driver telah tiba di rumah customer. Silakan ambil sampah dan bersiap berangkat ke Bank Sampah."
                    : selectedOrder.type === "Kanyaah Send"
                    ? "Kurir telah tiba di lokasi pengirim. Silakan periksa paket dan konfirmasi saat siap berangkat."
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "Driver telah tiba di titik jemput. Harap beri tahu penumpang bahwa Anda sudah sampai."
                    : selectedOrder.type === "Catering"
                    ? "Kurir telah tiba di dapur catering. Silakan periksa pesanan makanan dan konfirmasi saat siap."
                    : "Kurir telah tiba di toko / outlet. Silakan periksa pesanan dan konfirmasi saat siap berangkat."
                  : selectedOrder.status === "Mengantar"
                  ? selectedOrder.type === "Setor Sampah"
                    ? "Sampah telah diambil dari customer. Driver sedang mengantar sampah menuju Bank Sampah tujuan."
                    : selectedOrder.type === "Kanyaah Send"
                    ? "Paket telah diambil. Kurir sedang mengantar paket ke alamat penerima."
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "Perjalanan dimulai. Driver sedang mengantar penumpang ke lokasi tujuan."
                    : selectedOrder.type === "Catering"
                    ? "Pesanan catering telah diambil. Kurir sedang mengantar pesanan ke alamat pemesan."
                    : "Pesanan telah diambil. Kurir sedang mengantar pesanan ke alamat tujuan."
                  : selectedOrder.status === "Selesai"
                  ? selectedOrder.type === "Setor Sampah"
                    ? selectedOrder.rawStatus === "DISPUTED"
                      ? "Customer mengajukan komplain timbangan ke Bank Sampah. Penimbangan ulang sedang ditinjau & diproses oleh pihak Bank Sampah. Driver tidak perlu mengambil tindakan."
                      : selectedOrder.rawStatus === "WAITING_CUSTOMER_CONFIRMATION" || selectedOrder.rawStatus === "WEIGHING"
                      ? "Sampah telah diserahkan di Bank Sampah. Menunggu penyelesaian konfirmasi timbangan customer & bank."
                      : selectedOrder.rawStatus === "COMPLETED" || selectedOrder.rawStatus === "POINT_ISSUED"
                      ? "Setoran sampah telah disetujui customer dan transaksi selesai penuh. Terima kasih!"
                      : "Sampah telah tiba di Bank Sampah dan siap ditimbang oleh petugas."
                    : "Pengantaran telah ditandai selesai."
                  : "Pesanan baru menunggu keputusan Anda."}
              </Text>
            </View>
          </View>

          {/* Prominent Live Tracking Map Card */}
          <View style={styles.fullMapCard}>
            <View style={styles.fullMapHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Compass size={16} color="#0D7A53" />
                <Text style={styles.fullMapTitle}>{selectedOrder.type === "Marketplace" ? "Informasi Lokasi" : "Peta Rute Navigasi"}</Text>
              </View>
              {selectedOrder.type !== "Marketplace" && <View style={styles.distChip}>
                <Text style={styles.distChipText}>{selectedOrder.dist}</Text>
              </View>}
            </View>

            <View style={{ padding: 12 }}>
              <LiveOrderTrackingMap
                storeName={selectedOrder.type === "Setor Sampah" ? selectedOrder.customer : selectedOrder.type === "Kanyaah Ride" ? "Titik Penjemputan" : (selectedOrder.storeName || selectedOrder.from)}
                storeAddress={selectedOrder.type === "Setor Sampah" ? selectedOrder.from : selectedOrder.type === "Kanyaah Ride" ? (selectedOrder.pickup?.address || selectedOrder.from) : (selectedOrder.storeAddress || selectedOrder.from)}
                customerAddress={selectedOrder.to}
                pickupCoordinates={selectedOrder.pickup}
                destinationCoordinates={selectedOrder.destination}
                orderType={selectedOrder.type}
                distance={selectedOrder.dist}
                marketplaceMode={selectedOrder.type === "Marketplace"}
                driverName={effectiveDriverName}
                driverVehicle={effectiveDriverVehicle}
                orderStatus={selectedOrder.status}
                height={260}
                navigationMode={navMode}
                onNavigationModeChange={(mode) => setNavMode(mode)}
                showTurnInstructions={true}
                onToggleFullscreen={() => setFullscreenMapVisible(true)}
                isNavigating={isNavigatingMap}
                onToggleNavigation={(v) => setIsNavigatingMap(v)}
              />

              {/* Interactive Start Journey Navigation Controller */}
              {selectedOrder.type !== "Marketplace" && <View style={styles.startJourneyCard}>
                {/* 1. Mode Rute ke Pickup / Toko / Customer Jemput */}
                {navMode === "store" && (
                  <View style={{ gap: 8 }}>
                    {["Menunggu", "Diproses", "Siap"].includes(selectedOrder.status) ? (
                      <TouchableOpacity
                        style={styles.startTripButton}
                        onPress={async () => {
                          await handleUpdateStatus(selectedOrder.id, "Menuju Pickup");
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.startTripIconPulse}>
                          <Navigation size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.startTripTitle}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "MULAI JEMPUT KE CUSTOMER"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "MULAI JEMPUT PENUMPANG"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "MULAI JALAN KE PENGIRIM"
                              : "MULAI JALAN KE TOKO"}
                          </Text>
                          <Text style={styles.startTripSubtitle}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "Aktifkan rute navigasi menuju rumah customer untuk mengambil sampah"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "Aktifkan rute navigasi menuju lokasi jemput penumpang"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "Aktifkan tracking menuju lokasi pengirim paket"
                              : "Aktifkan tracking & kirim notifikasi ke pemilik toko"}
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : selectedOrder.status === "Menuju Pickup" ? (
                      <View style={styles.tripActiveStatusBox}>
                        <View style={styles.tripLiveRow}>
                          <View style={styles.tripLiveDot} />
                          <Text style={styles.tripLiveText}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "SEDANG MENUJU RUMAH CUSTOMER"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "SEDANG MENUJU PENUMPANG"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "SEDANG MENUJU PENGIRIM"
                              : "SEDANG DALAM PERJALANAN KE TOKO"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.startNavMainButton,
                            isNavigatingMap ? styles.startNavMainButtonActive : null,
                          ]}
                          onPress={() => setIsNavigatingMap(!isNavigatingMap)}
                          activeOpacity={0.85}
                        >
                          <Navigation size={16} color="#FFFFFF" />
                          <Text style={styles.startNavMainButtonText}>
                            {isNavigatingMap
                              ? "Navigasi Berjalan (Ketuk untuk Jeda)"
                              : "Mulai Navigasi (Start Navigation)"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.tripNextActionButton}
                          onPress={() => handleDriverTransition(selectedOrder, "Sampai Pickup")}
                          activeOpacity={0.85}
                        >
                          {selectedOrder.type === "Setor Sampah" || selectedOrder.type === "Kanyaah Ride" || selectedOrder.type === "Kanyaah Send" ? (
                            <MapPin size={15} color="#FFFFFF" />
                          ) : (
                            <Store size={15} color="#FFFFFF" />
                          )}
                          <Text style={styles.tripNextActionText}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "Konfirmasi Tiba di Rumah Customer"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "Konfirmasi Tiba di Lokasi Jemput"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "Konfirmasi Tiba di Pengirim"
                              : selectedOrder.type === "Catering"
                              ? "Konfirmasi Tiba di Dapur Catering"
                              : "Konfirmasi Tiba di Toko / Resto"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.tripCompletedNotice}>
                        <CheckCircle size={15} color="#0D7A53" />
                        <Text style={styles.tripCompletedNoticeText}>
                          {selectedOrder.type === "Setor Sampah"
                            ? "Anda sudah tiba di rumah customer. Ambil sampah daur ulang lalu mulai antar ke Bank Sampah."
                            : selectedOrder.type === "Kanyaah Ride"
                            ? "Anda sudah tiba di lokasi penjemputan. Silakan tunggu penumpang naik."
                            : selectedOrder.type === "Kanyaah Send"
                            ? "Anda sudah di lokasi pengirim. Ambil paket & verifikasi kode pickup."
                            : selectedOrder.type === "Catering"
                            ? "Anda sudah tiba di dapur katering. Silakan periksa pesanan & ambil makanan."
                            : "Anda sudah sampai di toko / resto. Silakan periksa pesanan & ambil barang."}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 2. Mode Rute ke Customer / Bank Sampah / Tujuan */}
                {navMode === "customer" && (
                  <View style={{ gap: 8 }}>
                    {["Menuju Pickup", "Sampai Pickup"].includes(selectedOrder.status) ? (
                      <TouchableOpacity
                        style={styles.startTripButton}
                        onPress={async () => {
                          await handleDriverTransition(selectedOrder, "Mengantar");
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.startTripIconPulse}>
                          <Bike size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.startTripTitle}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "MULAI ANTAR KE BANK SAMPAH"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "MULAI PERJALANAN KE TUJUAN"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "MULAI ANTAR KE PENERIMA"
                              : selectedOrder.type === "Catering"
                              ? "MULAI ANTAR KE PEMESAN"
                              : "MULAI ANTAR KE CUSTOMER"}
                          </Text>
                          <Text style={styles.startTripSubtitle}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "Sampah sudah diambil, mulai perjalanan menuju Bank Sampah tujuan"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "Penumpang sudah naik, mulai perjalanan menuju titik tujuan"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "Paket sudah dibawa, mulai antar menuju alamat penerima"
                              : selectedOrder.type === "Catering"
                              ? "Pesanan catering sudah diambil, mulai antar ke pemesan"
                              : "Aktifkan tracking & kirim notifikasi ke customer"}
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : selectedOrder.status === "Mengantar" ? (
                      <View style={styles.tripActiveStatusBox}>
                        <View style={styles.tripLiveRow}>
                          <View style={styles.tripLiveDot} />
                          <Text style={styles.tripLiveText}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "SEDANG MENGANTAR KE BANK SAMPAH"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "SEDANG MENGANTAR PENUMPANG"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "SEDANG MENGANTAR KE PENERIMA"
                              : selectedOrder.type === "Catering"
                              ? "SEDANG MENGANTAR KE PEMESAN"
                              : "SEDANG MENGANTAR KE CUSTOMER"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.startNavMainButton,
                            isNavigatingMap ? styles.startNavMainButtonActive : null,
                          ]}
                          onPress={() => setIsNavigatingMap(!isNavigatingMap)}
                          activeOpacity={0.85}
                        >
                          <Navigation size={16} color="#FFFFFF" />
                          <Text style={styles.startNavMainButtonText}>
                            {isNavigatingMap
                              ? "Navigasi Berjalan (Ketuk untuk Jeda)"
                              : "Mulai Navigasi (Start Navigation)"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.tripNextActionButton, { backgroundColor: "#15803D" }]}
                          disabled={mutatingOrderId === selectedOrder.id || proofUploadOrderId === selectedOrder.id}
                          onPress={() => handleDriverTransition(selectedOrder, "Selesai")}
                          activeOpacity={0.85}
                        >
                          {mutatingOrderId === selectedOrder.id || proofUploadOrderId === selectedOrder.id
                            ? <ActivityIndicator size="small" color="#FFFFFF" />
                            : <CheckCircle size={15} color="#FFFFFF" />}
                          <Text style={styles.tripNextActionText}>
                            {selectedOrder.type === "Setor Sampah"
                              ? "Tiba di Bank Sampah & Selesaikan"
                              : selectedOrder.type === "Kanyaah Ride"
                              ? "Selesaikan Perjalanan"
                              : selectedOrder.type === "Kanyaah Send"
                              ? "Paket Terkirim & Selesai"
                              : selectedOrder.type === "Catering"
                              ? "Catering Diterima & Selesai"
                              : "Selesaikan Pengantaran"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : selectedOrder.status === "Selesai" ? (
                      <View style={styles.tripCompletedNotice}>
                        <CheckCircle size={15} color="#0D7A53" />
                        <Text style={styles.tripCompletedNoticeText}>
                          {selectedOrder.type === "Setor Sampah"
                            ? "Sampah telah tiba di Bank Sampah dan siap ditimbang. Terima kasih!"
                            : selectedOrder.type === "Kanyaah Ride"
                            ? "Perjalanan telah selesai dengan selamat. Terima kasih!"
                            : selectedOrder.type === "Kanyaah Send"
                            ? "Paket telah diterima oleh penerima. Terima kasih!"
                            : selectedOrder.type === "Catering"
                            ? "Pesanan catering telah diterima pemesan. Terima kasih!"
                            : "Pengantaran selesai dilakukan. Terima kasih!"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* 3. Mode Semua Rute */}
                {navMode === "overview" && (
                  <View style={styles.tripCompletedNotice}>
                    <Compass size={15} color="#0D7A53" />
                    <Text style={styles.tripCompletedNoticeText}>
                      {selectedOrder.type === "Setor Sampah"
                        ? "Menampilkan rute lengkap penjemputan dari rumah customer hingga Bank Sampah tujuan."
                        : selectedOrder.type === "Kanyaah Ride"
                        ? "Menampilkan rute penjemputan hingga ke lokasi tujuan penumpang."
                        : selectedOrder.type === "Kanyaah Send"
                        ? "Menampilkan rute penjemputan dari pengirim hingga ke penerima."
                        : "Menampilkan keseluruhan lintasan penjemputan dari toko hingga ke customer."}
                    </Text>
                  </View>
                )}
              </View>}

              {/* Single Clean Fullscreen Navigation Button (Spacious, No Text Wrap) */}
              <TouchableOpacity
                style={styles.openFullscreenGpsBtn}
                onPress={() => setFullscreenMapVisible(true)}
                activeOpacity={0.8}
              >
                <Maximize2 size={14} color="#0D7A53" />
                <Text style={styles.openFullscreenGpsText}>{selectedOrder.type === "Marketplace" ? "Lihat alamat & opsi navigasi" : "Buka Navigasi Layar Penuh"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stepper Progress */}
          <View style={styles.stepperCard}>
            <Text style={styles.sectionLabel}>
              {selectedOrder.type === "Setor Sampah" ? "TAHAPAN PENJEMPUTAN SAMPAH" : selectedOrder.type === "Kanyaah Ride" ? "TAHAPAN PERJALANAN" : "TAHAPAN PENGANTARAN"}
            </Text>
            <View style={styles.stepperRow}>
              <View style={[styles.stepperDot, step >= 1 && styles.stepperDotActive]}>
                <Bike size={12} color={step >= 1 ? "#FFFFFF" : "#94A3B8"} />
              </View>
              <View style={[styles.stepperLine, step >= 2 && styles.stepperLineActive]} />
              <View style={[styles.stepperDot, step >= 2 && styles.stepperDotActive]}>
                {selectedOrder.type === "Kanyaah Ride" || selectedOrder.type === "Setor Sampah" ? (
                  <MapPin size={12} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                ) : (
                  <Store size={12} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                )}
              </View>
              <View style={[styles.stepperLine, step >= 3 && styles.stepperLineActive]} />
              <View style={[styles.stepperDot, step >= 3 && styles.stepperDotActive]}>
                <Navigation size={12} color={step >= 3 ? "#FFFFFF" : "#94A3B8"} />
              </View>
              <View style={[styles.stepperLine, step >= 4 && styles.stepperLineActive]} />
              <View style={[styles.stepperDot, step >= 4 && styles.stepperDotActive]}>
                <CheckCircle size={12} color={step >= 4 ? "#FFFFFF" : "#94A3B8"} />
              </View>
            </View>
            <View style={styles.stepperLabelsRow}>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 1 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  {selectedOrder.type === "Setor Sampah" ? "Ke Customer" : selectedOrder.type === "Kanyaah Ride" ? "Menuju Penumpang" : selectedOrder.type === "Kanyaah Send" ? "Ke Pengirim" : selectedOrder.type === "Catering" ? "Ke Dapur" : "Ke Toko"}
                </Text>
              </View>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 2 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  {selectedOrder.type === "Setor Sampah" ? "Tiba di Cust" : selectedOrder.type === "Kanyaah Ride" ? "Driver Tiba" : selectedOrder.type === "Kanyaah Send" ? "Tiba Pengirim" : selectedOrder.type === "Catering" ? "Tiba di Dapur" : "Di Toko"}
                </Text>
              </View>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 3 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  {selectedOrder.type === "Setor Sampah" ? "Ke Bank Sampah" : selectedOrder.type === "Kanyaah Ride" ? "Mulai Perjalanan" : selectedOrder.type === "Kanyaah Send" ? "Ke Penerima" : selectedOrder.type === "Catering" ? "Ke Pemesan" : "Ke Customer"}
                </Text>
              </View>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 4 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  {selectedOrder.type === "Setor Sampah" ? "Tiba di Bank" : selectedOrder.type === "Kanyaah Send" ? "Terkirim" : selectedOrder.type === "Catering" ? "Diterima" : "Selesai"}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 1: Lokasi Pickup */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoIconBox}>
                {selectedOrder.type === "Setor Sampah" || selectedOrder.type === "Kanyaah Ride" || selectedOrder.type === "Kanyaah Send" ? (
                  <MapPin size={18} color="#15803D" />
                ) : (
                  <Store size={18} color="#0D7A53" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardType}>
                  {selectedOrder.type === "Setor Sampah"
                    ? "LOKASI JEMPUT SAMPAH (RUMAH CUSTOMER)"
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "LOKASI PENJEMPUTAN (PENUMPANG)"
                    : selectedOrder.type === "Kanyaah Send"
                    ? "LOKASI PENJEMPUTAN (PENGIRIM)"
                    : selectedOrder.type === "Catering"
                    ? "LOKASI PENJEMPUTAN (DAPUR CATERING)"
                    : "LOKASI PENJEMPUTAN (TOKO)"}
                </Text>
                <Text style={styles.infoCardTitle}>
                  {selectedOrder.type === "Setor Sampah" || selectedOrder.type === "Kanyaah Ride" || selectedOrder.type === "Kanyaah Send"
                    ? selectedOrder.customer
                    : (selectedOrder.storeName || selectedOrder.from)}
                </Text>
              </View>
            </View>

            <Text style={styles.infoCardAddress}>
              {selectedOrder.type === "Setor Sampah" || selectedOrder.type === "Kanyaah Ride" || selectedOrder.type === "Kanyaah Send"
                ? selectedOrder.from
                : (selectedOrder.storeAddress || selectedOrder.from)}
            </Text>

            <View style={styles.infoCardActionsRow}>
              {selectedOrder.type === "Setor Sampah" || selectedOrder.type === "Kanyaah Ride" ? (
                <>
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => openChatRoom(selectedOrder, "customer")}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#0D7A53" />
                    <Text style={styles.actionPillText}>{selectedOrder.type === "Kanyaah Ride" ? "Chat Penumpang" : "Chat Customer"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPillOutline}
                    onPress={() => openPhoneCall(selectedOrder.phone, selectedOrder.customer)}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#334155" />
                    <Text style={styles.actionPillOutlineText}>{selectedOrder.type === "Kanyaah Ride" ? "Telepon Penumpang" : "Telepon Customer"}</Text>
                  </TouchableOpacity>
                </>
              ) : selectedOrder.type === "Kanyaah Send" ? (
                <>
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => openChatRoom(selectedOrder, "owner")}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#0D7A53" />
                    <Text style={styles.actionPillText}>Chat Pengirim</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPillOutline}
                    onPress={() => openPhoneCall(selectedOrder.phone || selectedOrder.storePhone, selectedOrder.customer || "Pengirim")}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#334155" />
                    <Text style={styles.actionPillOutlineText}>Telepon Pengirim</Text>
                  </TouchableOpacity>
                </>
              ) : selectedOrder.type === "Catering" ? (
                <>
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => openChatRoom(selectedOrder, "owner")}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#0D7A53" />
                    <Text style={styles.actionPillText}>Chat Dapur Catering</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPillOutline}
                    onPress={() => openPhoneCall(selectedOrder.storePhone, selectedOrder.storeName || "Dapur Catering")}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#334155" />
                    <Text style={styles.actionPillOutlineText}>Telepon Dapur Catering</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => openChatRoom(selectedOrder, "owner")}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#0D7A53" />
                    <Text style={styles.actionPillText}>Chat Toko</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionPillOutline}
                    onPress={() => openPhoneCall(selectedOrder.storePhone, selectedOrder.storeName)}
                    activeOpacity={0.8}
                  >
                    <Phone size={14} color="#334155" />
                    <Text style={styles.actionPillOutlineText}>Telepon Toko</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Section 2: Lokasi Tujuan / Pengantaran */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoIconBox, { backgroundColor: "#EFF6FF" }]}>
                {selectedOrder.type === "Setor Sampah" ? (
                  <Store size={18} color="#15803D" />
                ) : selectedOrder.type === "Kanyaah Ride" ? (
                  <MapPin size={18} color="#D97706" />
                ) : (
                  <User size={18} color="#2563EB" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoCardType, { color: selectedOrder.type === "Setor Sampah" ? "#15803D" : selectedOrder.type === "Kanyaah Ride" ? "#D97706" : "#2563EB" }]}>
                  {selectedOrder.type === "Setor Sampah"
                    ? "LOKASI TUJUAN (BANK SAMPAH)"
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "LOKASI TUJUAN PENUMPANG"
                    : selectedOrder.type === "Kanyaah Send"
                    ? "LOKASI PENGANTARAN (PENERIMA)"
                    : selectedOrder.type === "Catering"
                    ? "LOKASI PENGANTARAN (PEMESAN)"
                    : "LOKASI PENGANTARAN (CUSTOMER)"}
                </Text>
                <Text style={styles.infoCardTitle}>
                  {selectedOrder.type === "Setor Sampah"
                    ? (selectedOrder.storeName || "Bank Sampah")
                    : selectedOrder.type === "Kanyaah Ride"
                    ? selectedOrder.to
                    : selectedOrder.type === "Kanyaah Send"
                    ? (selectedOrder.to || "Penerima Paket")
                    : selectedOrder.customer}
                </Text>
              </View>
            </View>

            <Text style={styles.infoCardAddress}>{selectedOrder.to}</Text>
            {selectedOrder.addressSnapshot && (
              <View style={styles.addressDetailBox}>
                <Text style={styles.addressDetailTitle}>Detail pengantaran</Text>
                {!!selectedOrder.addressSnapshot.accessType && <Text style={styles.addressDetailText}>Akses: {selectedOrder.addressSnapshot.accessType}</Text>}
                {!!selectedOrder.addressSnapshot.notes && <Text style={styles.addressDetailText}>Catatan: {selectedOrder.addressSnapshot.notes}</Text>}
                {selectedOrder.addressSnapshot.latitude !== undefined && selectedOrder.addressSnapshot.longitude !== undefined && (
                  <Text style={styles.addressDetailText}>Pin: {selectedOrder.addressSnapshot.latitude.toFixed(5)}, {selectedOrder.addressSnapshot.longitude.toFixed(5)}</Text>
                )}
              </View>
            )}

            {selectedOrder.type === "Setor Sampah" ? (
              <View style={styles.infoCardActionsRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => openChatRoom(selectedOrder, "owner")}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={14} color="#0D7A53" />
                  <Text style={styles.actionPillText}>Chat Bank Sampah</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPillOutline}
                  onPress={() => openPhoneCall(selectedOrder.storePhone, selectedOrder.storeName || "Bank Sampah")}
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#334155" />
                  <Text style={styles.actionPillOutlineText}>Telepon Bank Sampah</Text>
                </TouchableOpacity>
              </View>
            ) : selectedOrder.type !== "Kanyaah Ride" && (
              <View style={styles.infoCardActionsRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => openChatRoom(selectedOrder, "customer")}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={14} color="#0D7A53" />
                  <Text style={styles.actionPillText}>
                    {selectedOrder.type === "Kanyaah Send"
                      ? "Chat Penerima"
                      : selectedOrder.type === "Catering"
                      ? "Chat Pemesan"
                      : "Chat Customer"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPillOutline}
                  onPress={() => openPhoneCall(selectedOrder.phone, selectedOrder.customer)}
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#334155" />
                  <Text style={styles.actionPillOutlineText}>
                    {selectedOrder.type === "Kanyaah Send"
                      ? "Telepon Penerima"
                      : selectedOrder.type === "Catering"
                      ? "Telepon Pemesan"
                      : "Telepon Customer"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Section 3: Rincian Pesanan */}
          {selectedOrder.items && selectedOrder.items.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>RINCIAN PESANAN</Text>
              <View style={styles.itemsTable}>
                {selectedOrder.items.map((item, idx) => (
                  <View key={`${item.name}-${idx}`} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>{item.quantity} item</Text>
                      {!!item.notes && <Text style={styles.itemNote} numberOfLines={2}>Catatan: {item.notes}</Text>}
                    </View>
                    <Text style={styles.itemPrice}>{rp(item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Section 4: Rincian Pendapatan Driver */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionLabel}>
              {selectedOrder.type === "Kanyaah Ride" ? "RINCIAN TARIF PERJALANAN" : "RINCIAN TARIF & PENDAPATAN"}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {selectedOrder.type === "Kanyaah Ride" ? "Tarif Perjalanan" : "Nilai Belanja Pesanan"}
              </Text>
              <Text style={styles.priceVal}>{rp(selectedOrder.pay)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Potongan Komisi Platform (0%)</Text>
              <Text style={styles.priceVal}>Rp 0</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.emphasizedText}>
                {selectedOrder.type === "Kanyaah Ride" ? "Pendapatan Bersih Driver" : "Pendapatan Bersih Kurir"}
              </Text>
              <Text style={styles.earningsHighlight}>{rp(selectedOrder.driverShare)}</Text>
            </View>
          </View>

          {/* Section 5: Instruksi Pembayaran untuk Driver */}
          <View style={[
            styles.infoCard,
            (selectedOrder.paymentMethod === "COD" || (!selectedOrder.paymentMethod && selectedOrder.paymentStatus !== "Lunas"))
              ? { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }
              : { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }
          ]}>
            <Text style={[
              styles.sectionLabel,
              (selectedOrder.paymentMethod === "COD" || (!selectedOrder.paymentMethod && selectedOrder.paymentStatus !== "Lunas"))
                ? { color: "#92400E" }
                : { color: "#15803D" }
            ]}>
              INSTRUKSI PEMBAYARAN KEPADA PELANGGAN
            </Text>

            {(selectedOrder.paymentMethod === "COD" || (!selectedOrder.paymentMethod && selectedOrder.paymentStatus !== "Lunas")) ? (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#B45309" }}>
                    Tagih Tunai (COD) ke Pelanggan
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: "#78350F", lineHeight: 18 }}>
                  Saat barang diserahkan ke pelanggan, tagih uang tunai sebesar:
                </Text>
                <View style={{ backgroundColor: "#FEF3C7", padding: 10, borderRadius: 10, alignItems: "center", marginVertical: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#B45309" }}>
                    {rp(selectedOrder.pay)}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: "#92400E" }}>
                  * Pastikan jumlah uang tunai yang diterima pas atau berikan kembalian dengan benar.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={18} color="#15803D" />
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#15803D" }}>
                    SUDAH LUNAS ({selectedOrder.paymentMethod || "NON-TUNAI"})
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: "#166534", lineHeight: 18 }}>
                  Pelanggan sudah membayar lunas melalui metode digital.
                </Text>
                <View style={{ backgroundColor: "#DCFCE7", padding: 10, borderRadius: 10, marginVertical: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ShieldCheck size={16} color="#15803D" />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#15803D", textAlign: "center" }}>
                    Pembayaran Lunas — Tidak Perlu Tagih Tunai
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: "#166534" }}>
                  * Cukup serahkan pesanan dan konfirmasi penerimaan di aplikasi.
                </Text>
              </View>
            )}
          </View>

          {/* Rating Recap Card when Selesai */}
          {selectedOrder.status === "Selesai" && (
            <View style={styles.driverRatingRecapCard}>
              <View style={styles.driverRatingRecapHeader}>
                <View style={styles.driverRatingTitleRow}>
                  <Star size={16} color="#D97706" fill="#D97706" />
                  <Text style={styles.driverRatingRecapTitle}>
                    PENILAIAN DARI {selectedOrder.type === "Kanyaah Ride" ? "PENUMPANG" : "PELANGGAN"}
                  </Text>
                </View>
                {selectedOrder.rating?.score ? (
                  <View style={styles.driverRatingScoreBadge}>
                    <Star size={11} color="#B45309" fill="#B45309" />
                    <Text style={styles.driverRatingScoreBadgeText}>{selectedOrder.rating.score}.0</Text>
                  </View>
                ) : (
                  <View style={styles.driverRatingPendingBadge}>
                    <Text style={styles.driverRatingPendingBadgeText}>Menunggu Ulasan</Text>
                  </View>
                )}
              </View>

              {selectedOrder.rating?.score ? (
                <View style={{ gap: 8 }}>
                  <View style={styles.driverRatingStarsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={20}
                        color={s <= (selectedOrder.rating?.score || 0) ? "#D97706" : "#E2E8F0"}
                        fill={s <= (selectedOrder.rating?.score || 0) ? "#D97706" : "transparent"}
                      />
                    ))}
                    <Text style={styles.driverRatingScoreLabel}>
                      {selectedOrder.rating.score === 5
                        ? "Sangat Puas (5/5)"
                        : selectedOrder.rating.score === 4
                        ? "Puas (4/5)"
                        : selectedOrder.rating.score === 3
                        ? "Cukup (3/5)"
                        : `${selectedOrder.rating.score} / 5`}
                    </Text>
                  </View>
                  {Boolean(selectedOrder.rating?.review) ? (
                    <View style={styles.driverRatingReviewBubble}>
                      <Text style={styles.driverRatingReviewText}>
                        "{selectedOrder.rating.review}"
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.driverRatingNoReviewText}>
                      {selectedOrder.type === "Kanyaah Ride" ? "Penumpang" : "Pelanggan"} memberikan {selectedOrder.rating.score} bintang tanpa ulasan tertulis.
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.driverRatingNoticeText}>
                      Rating ini telah diakumulasikan ke profil performa driver Anda.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.driverRatingWaitingWrap}>
                  <Text style={styles.driverRatingWaitingText}>
                    {selectedOrder.type === "Kanyaah Ride" ? "Penumpang" : "Pelanggan"} belum mengisi ulasan bintang. Rekapan akan otomatis terisi saat {selectedOrder.type === "Kanyaah Ride" ? "penumpang" : "pelanggan"} mengirimkan penilaian di aplikasinya.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.stickyActionFooter}>
          {((selectedOrder.status === "Menunggu" && selectedOrder.type !== "Marketplace") || (selectedOrder.status === "Siap" && selectedOrder.type === "Marketplace")) && isOnline && (
            <View style={styles.dualActionsRow}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnOutline]}
                disabled={mutatingOrderId === selectedOrder.id}
                onPress={() => handleDeclineOrder(selectedOrder.id)}
              >
                    {mutatingOrderId === selectedOrder.id ? <ActivityIndicator color="#15803D" /> : <Text style={styles.sheetBtnTextOutline}>Tolak Pesanan</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid]}
                disabled={mutatingOrderId === selectedOrder.id}
                onPress={() => handleAcceptOrder(selectedOrder.id)}
              >
                {mutatingOrderId === selectedOrder.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetBtnTextSolid}>{selectedOrder.type === "Setor Sampah" ? "Terima Penjemputan" : selectedOrder.type === "Kanyaah Ride" ? "Terima Ride" : "Terima Pesanan"}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {selectedOrder.status === "Menuju Pickup" && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#15803D" }]}
              disabled={mutatingOrderId === selectedOrder.id}
              onPress={() => handleDriverTransition(selectedOrder, "Sampai Pickup")}
              activeOpacity={0.85}
            >
              {mutatingOrderId === selectedOrder.id ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MapPin size={18} color="#FFFFFF" />
                  <Text style={styles.sheetBtnTextSolid}>
                    {selectedOrder.type === "Setor Sampah"
                      ? "Tiba di Rumah Customer"
                      : selectedOrder.type === "Kanyaah Ride"
                      ? "Saya Sudah Sampai di Titik Jemput"
                      : selectedOrder.type === "Kanyaah Send"
                      ? "Tiba di Lokasi Pengirim"
                      : selectedOrder.type === "Catering"
                      ? "Tiba di Dapur Catering"
                      : selectedOrder.type === "Marketplace"
                      ? "Saya Sudah Sampai di Toko"
                      : "Tiba di Toko / Outlet"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Sampai Pickup" && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#EA580C" }]}
              disabled={mutatingOrderId === selectedOrder.id}
              onPress={() => handleDriverTransition(selectedOrder, "Mengantar")}
              activeOpacity={0.85}
            >
              {mutatingOrderId === selectedOrder.id ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Bike size={20} color="#FFFFFF" />
                  <Text style={styles.sheetBtnTextSolid}>
                    {selectedOrder.type === "Setor Sampah"
                      ? "Sampah Diambil & OTW ke Bank Sampah"
                      : selectedOrder.type === "Kanyaah Ride"
                      ? "Penumpang Naik & Mulai Perjalanan"
                      : selectedOrder.type === "Kanyaah Send"
                      ? "Paket Diambil & OTW ke Penerima"
                      : selectedOrder.type === "Catering"
                      ? "Makanan Diambil & OTW ke Pemesan"
                      : selectedOrder.type === "Marketplace"
                      ? "Pesanan Sudah Diambil"
                      : "Konfirmasi Ambil & OTW ke Customer"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Mengantar" && (
            selectedOrder.type === "Setor Sampah" && ["AT_BANK", "WEIGHING", "WAITING_CUSTOMER_CONFIRMATION", "DISPUTED"].includes(selectedOrder.rawStatus || "") ? (
              <View style={[
                styles.completedBadgeBtn,
                {
                  backgroundColor: selectedOrder.rawStatus === "DISPUTED" ? "#FEF2F2" : "#F0FDF4",
                  borderColor: selectedOrder.rawStatus === "DISPUTED" ? "#FECACA" : "#BBF7D0",
                }
              ]}>
                {selectedOrder.rawStatus === "DISPUTED" ? (
                  <AlertCircle size={18} color="#DC2626" />
                ) : (
                  <Clock size={18} color="#15803D" />
                )}
                <Text style={[
                  styles.completedBadgeBtnText,
                  { color: selectedOrder.rawStatus === "DISPUTED" ? "#DC2626" : "#15803D" }
                ]}>
                  {selectedOrder.rawStatus === "DISPUTED"
                    ? "Menunggu Peninjauan Komplain Bank Sampah"
                    : selectedOrder.rawStatus === "WAITING_CUSTOMER_CONFIRMATION" || selectedOrder.rawStatus === "WEIGHING"
                    ? "Sampah di Bank • Menunggu Konfirmasi Customer"
                    : "Sampah Telah Tiba di Bank Sampah"}
                </Text>
              </View>
            ) : (
              <Pressable
                style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#15803D", flex: 0, width: "100%", alignSelf: "stretch", minHeight: 50, zIndex: 1 }]}
                disabled={mutatingOrderId === selectedOrder.id || proofUploadOrderId === selectedOrder.id}
                onPress={() => handleDriverTransition(selectedOrder, "Selesai")}
                accessibilityRole="button"
                accessibilityLabel="Selesaikan perjalanan"
                hitSlop={8}
              >
                {mutatingOrderId === selectedOrder.id || proofUploadOrderId === selectedOrder.id ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.sheetBtnTextSolid}>
                      {selectedOrder.type === "Setor Sampah"
                        ? "Tiba di Bank Sampah & Serahkan Sampah"
                        : selectedOrder.type === "Kanyaah Ride"
                        ? "Selesaikan Perjalanan"
                        : selectedOrder.type === "Kanyaah Send"
                        ? "Paket Diserahkan ke Penerima & Selesai"
                        : selectedOrder.type === "Catering"
                        ? "Ambil Foto Bukti & Selesaikan Pengantaran"
                        : selectedOrder.type === "Marketplace"
                        ? "Pesanan Sudah Diterima Customer"
                        : "Selesaikan Pengantaran"}
                    </Text>
                  </>
                )}
              </Pressable>
            )
          )}

          {selectedOrder.status === "Selesai" && selectedOrder.deliveryProofUrl ? (
            <View style={{
              backgroundColor: "#F0FDF4",
              borderWidth: 1,
              borderColor: "#BBF7D0",
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              gap: 8,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Camera size={15} color="#15803D" />
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#166534" }}>
                    Bukti Foto Pengantaran Tersimpan
                  </Text>
                </View>
                <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#166534" }}>TERVERIFIKASI</Text>
                </View>
              </View>
              <Image
                source={{ uri: selectedOrder.deliveryProofUrl }}
                style={{ width: "100%", height: 160, borderRadius: 10, backgroundColor: "#E2E8F0" }}
                resizeMode="cover"
              />
              {selectedOrder.deliveryProofTimestamp ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Clock size={12} color="#15803D" />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#166534" }}>
                    Waktu Real Serah Terima: {selectedOrder.deliveryProofTimestamp}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedOrder.status === "Selesai" && (
            <TouchableOpacity
              style={styles.completedBadgeBtn}
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert(
                  selectedOrder.type === "Setor Sampah"
                    ? "Sampah Telah Tiba di Bank Sampah"
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "Perjalanan Selesai"
                    : "Pengantaran Selesai",
                  selectedOrder.type === "Setor Sampah"
                    ? "Sampah telah sampai di Bank Sampah dan siap ditimbang oleh petugas."
                    : "Pesanan ini telah selesai dijalankan dan bukti serah terima telah tersimpan."
                );
              }}
            >
              <CheckCircle size={18} color="#15803D" />
              <Text style={styles.completedBadgeBtnText}>
                {selectedOrder.type === "Setor Sampah"
                  ? "Sampah Tiba di Bank Sampah"
                  : selectedOrder.type === "Kanyaah Ride"
                  ? "Perjalanan Telah Selesai"
                  : "Pengantaran Telah Selesai"}
              </Text>
            </TouchableOpacity>
          )}
          {proofUploadError?.orderId === selectedOrder.id && (
            <Text style={styles.proofUploadError}>{proofUploadError.message}</Text>
          )}
        </View>

        {/* Render Chat Modal inside Full Page context if triggered */}
        {renderChatModalComponent()}

        {/* Fullscreen In-App GPS Navigation Modal */}
        <Modal
          visible={fullscreenMapVisible && Boolean(selectedOrder)}
          animationType="slide"
          onRequestClose={() => setFullscreenMapVisible(false)}
        >
          <ResponsiveSafeAreaView style={styles.fsGpsContainer}>
            <View style={styles.fsGpsHeader}>
              <TouchableOpacity
                style={styles.fsGpsCircleBtn}
                onPress={() => setFullscreenMapVisible(false)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.fsGpsHeaderTitleBox}>
                <Text style={styles.fsGpsHeaderTitle} numberOfLines={1}>
                  Navigasi Rute Driver
                </Text>
                <Text style={styles.fsGpsHeaderSub} numberOfLines={1}>
                  {navMode === "store"
                    ? (selectedOrder?.type === "Kanyaah Ride"
                        ? "Menuju Titik Penjemputan"
                        : selectedOrder?.type === "Kanyaah Send"
                        ? "Menuju Pengirim"
                        : selectedOrder?.type === "Catering"
                        ? "Menuju Dapur Catering"
                        : selectedOrder?.type === "Setor Sampah"
                        ? "Menuju Rumah Customer"
                        : "Menuju Toko")
                    : navMode === "customer"
                    ? (selectedOrder?.type === "Kanyaah Ride"
                        ? "Menuju Tujuan Penumpang"
                        : selectedOrder?.type === "Kanyaah Send"
                        ? "Menuju Penerima Paket"
                        : selectedOrder?.type === "Catering"
                        ? "Menuju Pemesan Catering"
                        : selectedOrder?.type === "Setor Sampah"
                        ? "Menuju Bank Sampah"
                        : "Menuju Customer")
                    : "Semua Rute"} • #{selectedOrder?.id.slice(-6)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.fsGpsCircleBtn}
                onPress={() => setFullscreenMapVisible(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.fsGpsMapFrame}>
              <LiveOrderTrackingMap
                storeName={selectedOrder?.type === "Kanyaah Ride" ? "Titik Penjemputan" : (selectedOrder?.storeName || selectedOrder?.from)}
                storeAddress={selectedOrder?.type === "Kanyaah Ride" ? (selectedOrder?.pickup?.address || selectedOrder?.from) : (selectedOrder?.storeAddress || selectedOrder?.from)}
                customerAddress={selectedOrder?.to}
                pickupCoordinates={selectedOrder?.pickup}
                destinationCoordinates={selectedOrder?.destination}
                orderType={selectedOrder?.type}
                distance={selectedOrder?.dist}
                marketplaceMode={selectedOrder?.type === "Marketplace"}
                driverName={effectiveDriverName}
                driverVehicle={effectiveDriverVehicle}
                orderStatus={selectedOrder?.status || "Mengantar"}
                height={Platform.OS === "web" ? 480 : 420}
                navigationMode={navMode}
                onNavigationModeChange={(mode) => setNavMode(mode)}
                showTurnInstructions={true}
                isNavigating={isNavigatingMap}
                onToggleNavigation={(v) => setIsNavigatingMap(v)}
              />

              {/* Quick Trip Action Button inside Fullscreen View */}
              {selectedOrder?.type !== "Marketplace" && navMode === "store" && ["Menunggu", "Diproses", "Siap"].includes(selectedOrder?.status || "") && (
                <TouchableOpacity
                  style={[styles.startTripButton, { marginTop: 10 }]}
                  onPress={async () => {
                    if (!selectedOrder) return;
                    await handleUpdateStatus(selectedOrder.id, "Menuju Pickup");
                  }}
                  activeOpacity={0.85}
                >
                  <Navigation size={18} color="#FFFFFF" />
                  <Text style={styles.startTripTitle}>MULAI JALAN KE TOKO</Text>
                </TouchableOpacity>
              )}

              {selectedOrder?.type !== "Marketplace" && navMode === "customer" && ["Menuju Pickup", "Sampai Pickup"].includes(selectedOrder?.status || "") && (
                <TouchableOpacity
                  style={[styles.startTripButton, { marginTop: 10 }]}
                  onPress={async () => {
                    if (!selectedOrder) return;
                    await handleUpdateStatus(selectedOrder.id, "Mengantar");
                  }}
                  activeOpacity={0.85}
                >
                  <Bike size={18} color="#FFFFFF" />
                  <Text style={styles.startTripTitle}>MULAI ANTAR KE CUSTOMER</Text>
                </TouchableOpacity>
              )}
            </View>
          </ResponsiveSafeAreaView>
        </Modal>
        </ResponsiveSafeAreaView>
      </Modal>
      {renderDeliveryProofPicker()}
      {safeCallTarget && (
        <SafeCallModal
          visible={safeCallVisible}
          onClose={() => setSafeCallVisible(false)}
          targetName={safeCallTarget.name}
          targetRole={safeCallTarget.role}
          targetPhone={safeCallTarget.phone}
          orderCode={safeCallTarget.orderCode}
        />
      )}
      </>
    );
  }

  // Helper render chat modal
  function renderChatModalComponent() {
    if (!selectedOrder) return null;

    return (
      <Modal visible={chatModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.chatSheetContainer}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {chatTarget === "owner"
                    ? (selectedOrder.type === "Setor Sampah"
                        ? `Chat Bank Sampah: ${selectedOrder.storeName || "Bank Sampah"}`
                        : selectedOrder.type === "Kanyaah Send"
                        ? `Chat Pengirim: ${selectedOrder.customer || "Pengirim"}`
                        : selectedOrder.type === "Catering"
                        ? `Chat Dapur: ${selectedOrder.storeName || "Dapur Catering"}`
                        : `Chat Toko: ${selectedOrder.storeName || selectedOrder.from}`)
                    : (selectedOrder.type === "Kanyaah Send"
                        ? `Chat Penerima: ${selectedOrder.to || "Penerima"}`
                        : selectedOrder.type === "Kanyaah Ride"
                        ? `Chat Penumpang: ${selectedOrder.customer}`
                        : selectedOrder.type === "Catering"
                        ? `Chat Pemesan: ${selectedOrder.customer}`
                        : `Chat Customer: ${selectedOrder.customer}`)}
                </Text>
                <Text style={styles.chatHeaderSubtitle}>
                  Order #{selectedOrder.id.slice(-8)} • Saluran Langsung
                </Text>
              </View>
              <TouchableOpacity onPress={() => setChatModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Target Channel Segment Switcher (Delivery only) */}
            {selectedOrder?.type !== "Kanyaah Ride" && (
            <View style={styles.channelSwitcherRow}>
              <TouchableOpacity
                style={[
                  styles.channelTab,
                  chatTarget === "owner" ? styles.channelTabActiveOwner : styles.channelTabInactive,
                ]}
                onPress={() => setChatTarget("owner")}
                activeOpacity={0.8}
              >
                <Store size={15} color={chatTarget === "owner" ? "#FFFFFF" : "#64748B"} />
                <Text
                  style={[
                    styles.channelTabText,
                    chatTarget === "owner" ? styles.channelTabTextActive : styles.channelTabTextInactive,
                  ]}
                >
                  {selectedOrder.type === "Setor Sampah"
                    ? "Bank Sampah"
                    : selectedOrder.type === "Kanyaah Send"
                    ? "Pengirim"
                    : selectedOrder.type === "Catering"
                    ? "Dapur Catering"
                    : "Toko / Outlet"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.channelTab,
                  chatTarget === "customer" ? styles.channelTabActiveCustomer : styles.channelTabInactive,
                ]}
                onPress={() => setChatTarget("customer")}
                activeOpacity={0.8}
              >
                <MessageSquare size={15} color={chatTarget === "customer" ? "#FFFFFF" : "#64748B"} />
                <Text
                  style={[
                    styles.channelTabText,
                    chatTarget === "customer" ? styles.channelTabTextActive : styles.channelTabTextInactive,
                  ]}
                >
                  {selectedOrder.type === "Kanyaah Send"
                    ? "Penerima"
                    : selectedOrder.type === "Catering"
                    ? "Pemesan"
                    : "Customer"}
                </Text>
              </TouchableOpacity>
            </View>
            )}

            {/* Quick Preset Message Chips */}
            <View style={styles.quickChipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsContent}>
                {(chatTarget === "owner" ? getQuickMessagesOwner(selectedOrder) : getQuickMessagesCustomer(selectedOrder)).map((msg, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(msg)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chat Message List */}
            <FlatList
              data={chatMessages[`${selectedOrder.id}-${chatTarget}`] || []}
              keyExtractor={(item, index) => item.id || index.toString()}
              contentContainerStyle={styles.chatListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyChatWrap}>
                  <View style={styles.emptyChatIconBg}>
                    {chatTarget === "owner" ? <Store size={24} color="#0D7A53" /> : <MessageSquare size={24} color="#2563EB" />}
                  </View>
                  <Text style={styles.emptyChatTitle}>
                    {chatTarget === "owner"
                      ? (selectedOrder.type === "Setor Sampah"
                          ? "Percakapan dengan Bank Sampah"
                          : selectedOrder.type === "Kanyaah Send"
                          ? "Percakapan dengan Pengirim"
                          : selectedOrder.type === "Catering"
                          ? "Percakapan dengan Dapur Catering"
                          : "Percakapan dengan Toko")
                      : (selectedOrder.type === "Kanyaah Send"
                          ? "Percakapan dengan Penerima"
                          : selectedOrder.type === "Kanyaah Ride"
                          ? "Percakapan dengan Penumpang"
                          : selectedOrder.type === "Catering"
                          ? "Percakapan dengan Pemesan"
                          : "Percakapan dengan Customer")}
                  </Text>
                  <Text style={styles.emptyChatSub}>
                    Kirim pesan teks atau foto langsung dari perangkat Anda.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isMe = item.sender === "driver";
                const hasAttachment = Boolean(item.attachment?.uri);

                return (
                  <View style={[styles.chatBubbleContainer, isMe ? styles.chatBubbleRight : styles.chatBubbleLeft]}>
                    <View style={[styles.chatBubble, isMe ? styles.chatBubbleDriver : styles.chatBubbleOther]}>
                      {/* Image Attachment Render */}
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

                      {/* Text Message */}
                      {item.text && item.text !== "Foto terkirim" && item.text !== "File terlampir" ? (
                        <Text style={[styles.chatText, isMe ? styles.chatTextDriver : styles.chatTextOther]}>
                          {item.text}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.chatMetaRow}>
                      <Text style={styles.chatTime}>{item.time}</Text>
                      {isMe && <CheckCheck size={12} color="#0D7A53" />}
                    </View>
                  </View>
                );
              }}
            />

            {/* Attachment Preview Bar above Input */}
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

            {/* Input field + Image/Camera Picker actions */}
            <View style={styles.chatInputRow}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color="#0D7A53" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickCamera}
                activeOpacity={0.7}
              >
                <Camera size={20} color="#0D7A53" />
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                value={typedMessage}
                onChangeText={setTypedMessage}
                placeholder={
                  chatTarget === "owner"
                    ? selectedOrder.type === "Setor Sampah"
                      ? "Ketik pesan ke bank sampah..."
                      : selectedOrder.type === "Kanyaah Send"
                      ? "Ketik pesan ke pengirim..."
                      : selectedOrder.type === "Catering"
                      ? "Ketik pesan ke dapur catering..."
                      : "Ketik pesan ke toko..."
                    : selectedOrder.type === "Kanyaah Ride"
                    ? "Ketik pesan ke penumpang..."
                    : selectedOrder.type === "Kanyaah Send"
                    ? "Ketik pesan ke penerima..."
                    : selectedOrder.type === "Catering"
                    ? "Ketik pesan ke pemesan..."
                    : "Ketik pesan ke customer..."
                }
                placeholderTextColor="#94A3B8"
                onSubmitEditing={() => handleSendMessage()}
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (typedMessage.trim() || selectedAttachment) ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                onPress={() => handleSendMessage()}
                disabled={!typedMessage.trim() && !selectedAttachment}
                activeOpacity={0.8}
              >
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Fullscreen Image Preview */}
        {previewImageUri && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.imageViewerBg}>
              <ResponsiveSafeAreaView style={styles.imageViewerHeader}>
                <Text style={styles.imageViewerTitle}>Pratinjau Foto</Text>
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
      </Modal>
    );
  }

  // =========================================================================
  // RENDER: ORDER LIST VIEW (DEFAULT SCREEN)
  // =========================================================================
  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {renderDeliveryProofPicker()}
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Daftar Orderan</Text>
          <Text style={styles.subtitle}>Pantau dan kelola pengantaran pesanan secara efisien.</Text>
        </View>
        <View style={[styles.onlinePill, { backgroundColor: isOnline ? "#DCFCE7" : "#FEE2E2" }]}>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? "#15803D" : "#DC2626" }]} />
          <Text style={[styles.onlinePillText, { color: isOnline ? "#15803D" : "#991B1B" }]}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      {/* Tabs Row (Semua, Ride, Send, Shop, Marketplace, Catering, Setor Sampah, Laundry, Aktif, Selesai) */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
          {ORDER_TABS.map((tab) => {
            const isSelected = activeTab === tab;
            const count =
              tab === "Semua" ? orders.length :
              tab === "Ride" ? orders.filter((o) => o.type === "Kanyaah Ride").length :
              tab === "Send" ? orders.filter((o) => o.type === "Kanyaah Send").length :
              tab === "Shop" ? orders.filter((o) => o.type === "Shop").length :
              tab === "Marketplace" ? orders.filter((o) => o.type === "Marketplace").length :
              tab === "Catering" ? orders.filter((o) => o.type === "Catering").length :
              tab === "Setor Sampah" ? orders.filter((o) => o.type === "Setor Sampah").length :
              tab === "Laundry" ? orders.filter((o) => o.type === "Laundry").length :
              tab === "Aktif" ? orders.filter(isDriverOrderActive).length :
              orders.filter((o) => o.status === "Selesai").length;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isSelected ? styles.tabBtnSelected : styles.tabBtnUnselected, { paddingHorizontal: 14 }]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, isSelected ? styles.tabBtnTextSelected : styles.tabBtnTextUnselected]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List content */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPending = item.status === "Menunggu" && item.type !== "Marketplace" || item.status === "Siap" && item.type === "Marketplace";
          const isOngoing = ["Menuju Pickup", "Sampai Pickup", "Mengantar"].includes(item.status);
          const isMapOpen = !!cardMapExpanded[item.id];
          const step = getStageStep(item.status, item);
          const serviceStyle = getServiceBadgeStyle(item.type);
          const originLabel = getOriginLabel(item.type, item);
          const originTitle = getOriginTitle(item.type, item);
          const destLabel = getDestinationLabel(item.type, item);
          const destTitle = getDestinationTitle(item.type, item);
          const isOriginCustomer = item.type === "Setor Sampah" || (item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")) || item.type === "Kanyaah Ride";
          const isDestBankOrLaundry = item.type === "Setor Sampah" || (item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput"));

          return (
            <View style={styles.orderCard}>
              <TouchableOpacity
                onPress={() => setSelectedOrder(item)}
                activeOpacity={0.85}
              >
                {/* Header Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeftGroup}>
                    <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
                    <View
                      style={[
                        styles.serviceChip,
                        {
                          backgroundColor: serviceStyle.bg,
                          borderColor: serviceStyle.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          { color: serviceStyle.text },
                        ]}
                      >
                        {item.type}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {item.status === "Selesai" && Boolean(item.rating?.score) && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#FDE68A" }}>
                        <Star size={11} color="#D97706" fill="#D97706" />
                        <Text style={{ fontSize: 11, fontWeight: "900", color: "#B45309" }}>{item.rating?.score}.0</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: getStatusBg(item.status, item) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: getStatusColor(item.status, item) },
                        ]}
                      >
                        {getStatusBadgeLabel(item.status, item)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Visual Progress Stepper for Ongoing Orders */}
                {isOngoing && (
                  <View style={styles.stepperContainer}>
                    <View style={styles.stepperRow}>
                      <View style={[styles.stepperDot, step >= 1 && styles.stepperDotActive]}>
                        <Bike size={10} color={step >= 1 ? "#FFFFFF" : "#94A3B8"} />
                      </View>
                      <View style={[styles.stepperLine, step >= 2 && styles.stepperLineActive]} />
                      <View style={[styles.stepperDot, step >= 2 && styles.stepperDotActive]}>
                        {item.type === "Kanyaah Ride" || item.type === "Setor Sampah" || item.type === "Kanyaah Send" ? (
                          <MapPin size={10} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                        ) : (
                          <Store size={10} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                        )}
                      </View>
                      <View style={[styles.stepperLine, step >= 3 && styles.stepperLineActive]} />
                      <View style={[styles.stepperDot, step >= 3 && styles.stepperDotActive]}>
                        <Navigation size={10} color={step >= 3 ? "#FFFFFF" : "#94A3B8"} />
                      </View>
                      <View style={[styles.stepperLine, step >= 4 && styles.stepperLineActive]} />
                      <View style={[styles.stepperDot, step >= 4 && styles.stepperDotActive]}>
                        <CheckCircle size={10} color={step >= 4 ? "#FFFFFF" : "#94A3B8"} />
                      </View>
                    </View>
                    <View style={styles.stepperLabelsRow}>
                      <Text style={[styles.stepperLabel, step === 1 && styles.stepperLabelHighlight]}>
                        {item.type === "Kanyaah Ride" ? "Jemput" : item.type === "Setor Sampah" ? "Ke Customer" : item.type === "Kanyaah Send" ? "Ke Pengirim" : item.type === "Catering" ? "Ke Dapur" : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput") ? "Ke Customer" : "Menuju Toko"}
                      </Text>
                      <Text style={[styles.stepperLabel, step === 2 && styles.stepperLabelHighlight]}>
                        {item.type === "Kanyaah Ride" ? "Tiba Jemput" : item.type === "Setor Sampah" ? "Tiba di Cust" : item.type === "Kanyaah Send" ? "Tiba Pengirim" : item.type === "Catering" ? "Tiba Dapur" : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput") ? "Tiba di Cust" : "Tiba di Toko"}
                      </Text>
                      <Text style={[styles.stepperLabel, step === 3 && styles.stepperLabelHighlight]}>
                        {item.type === "Kanyaah Ride" ? "Antar" : item.type === "Setor Sampah" ? "Ke Bank Sampah" : item.type === "Kanyaah Send" ? "Ke Penerima" : item.type === "Catering" ? "Ke Pemesan" : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput") ? "Ke Laundry" : "Ke Customer"}
                      </Text>
                      <Text style={[styles.stepperLabel, step === 4 && styles.stepperLabelHighlight]}>
                        {item.type === "Kanyaah Ride" ? "Selesai" : item.type === "Setor Sampah" ? "Tiba di Bank" : item.type === "Kanyaah Send" ? "Terkirim" : item.type === "Catering" ? "Diterima" : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput") ? "Tiba di Toko" : "Selesai"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Connected Route Timeline Box */}
                <View style={styles.routeJourneyBox}>
                  {/* Origin */}
                  <View style={styles.routeRow}>
                    <View
                      style={[
                        styles.routeIconNode,
                        {
                          backgroundColor: isOriginCustomer ? "#EFF6FF" : "#ECFDF5",
                          borderColor: isOriginCustomer ? "#BFDBFE" : "#A7F3D0",
                        },
                      ]}
                    >
                      {isOriginCustomer ? (
                        <MapPin size={13} color="#2563EB" />
                      ) : (
                        <Store size={13} color="#059669" />
                      )}
                    </View>
                    <View style={styles.routeContent}>
                      <View style={styles.routeHeaderRow}>
                        <Text
                          style={[
                            styles.routeTypeTag,
                            { color: isOriginCustomer ? "#2563EB" : "#059669" },
                          ]}
                        >
                          {originLabel}
                        </Text>
                        <TouchableOpacity
                          style={styles.compactNavBtn}
                          onPress={() => openNavigationToStore(item)}
                          activeOpacity={0.7}
                        >
                          <Compass size={11} color="#0D7A53" />
                          <Text style={styles.compactNavText}>Navigasi</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.routeTitle} numberOfLines={1}>
                        {originTitle}
                      </Text>
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {item.from}
                      </Text>
                    </View>
                  </View>

                  {/* Route Connector Line */}
                  <View style={styles.routeConnectorLine} />

                  {/* Destination */}
                  <View style={styles.routeRow}>
                    <View
                      style={[
                        styles.routeIconNode,
                        {
                          backgroundColor: isDestBankOrLaundry ? "#ECFDF5" : "#EFF6FF",
                          borderColor: isDestBankOrLaundry ? "#A7F3D0" : "#BFDBFE",
                        },
                      ]}
                    >
                      {isDestBankOrLaundry ? (
                        <Store size={13} color="#059669" />
                      ) : (
                        <MapPin size={13} color="#2563EB" />
                      )}
                    </View>
                    <View style={styles.routeContent}>
                      <View style={styles.routeHeaderRow}>
                        <Text
                          style={[
                            styles.routeTypeTag,
                            { color: isDestBankOrLaundry ? "#059669" : "#2563EB" },
                          ]}
                        >
                          {destLabel}
                        </Text>
                        <TouchableOpacity
                          style={styles.compactNavBtn}
                          onPress={() => openNavigationToCustomer(item)}
                          activeOpacity={0.7}
                        >
                          <Navigation size={11} color="#2563EB" />
                          <Text style={[styles.compactNavText, { color: "#2563EB" }]}>
                            Navigasi
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.routeTitle} numberOfLines={1}>
                        {destTitle}
                      </Text>
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {item.to}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price and distance info */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.distanceText}>
                      {item.dist ? `${item.dist} • ` : ""}Pendapatan Bersih
                    </Text>
                    <Text style={styles.earningsValue}>{rp(item.driverShare)}</Text>
                  </View>

                  <View style={styles.cardFooterActions}>
                    {isOngoing && (
                      <TouchableOpacity
                        style={styles.mapToggleChip}
                        onPress={() =>
                          setCardMapExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        activeOpacity={0.8}
                      >
                        <Compass size={12} color="#0D7A53" />
                        <Text style={styles.mapToggleChipText}>
                          {isMapOpen ? "Tutup Peta" : "Peta Rute"}
                        </Text>
                        {isMapOpen ? (
                          <ChevronUp size={12} color="#0D7A53" />
                        ) : (
                          <ChevronDown size={12} color="#0D7A53" />
                        )}
                      </TouchableOpacity>
                    )}
                    <View style={styles.arrowCircle}>
                      <ChevronRight size={15} color="#64748B" />
                    </View>
                  </View>
                </View>

                {/* Driver Payment Instruction Banner */}
                {(item.paymentMethod === "COD" || (!item.paymentMethod && item.paymentStatus !== "Lunas")) ? (
                  <View style={styles.driverPaymentInstructionBoxCod}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Banknote size={14} color="#B45309" />
                        <Text style={styles.driverPaymentInstructionTitleCod}>Tagih Tunai (COD)</Text>
                      </View>
                      <Text style={styles.driverPaymentInstructionAmountCod}>{rp(item.pay)}</Text>
                    </View>
                    <Text style={styles.driverPaymentInstructionSubCod}>
                      Tagih uang tunai langsung ke {item.customer || "pelanggan"}.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.driverPaymentInstructionBoxPaid}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={13} color="#15803D" />
                      <Text style={styles.driverPaymentInstructionTitlePaid}>
                        Sudah Lunas ({item.paymentMethod || "Non-Tunai"})
                      </Text>
                    </View>
                    <Text style={styles.driverPaymentInstructionSubPaid}>
                      Pesanan dibayar digital. Tidak perlu menagih uang tunai ke pelanggan.
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Inline Map Accordion for Active Order */}
              {isOngoing && isMapOpen && (
                <View style={styles.inlineMapBox}>
                  <LiveOrderTrackingMap
                    storeName={item.type === "Kanyaah Ride" ? "Titik Penjemputan" : (item.storeName || item.from)}
                    storeAddress={item.type === "Kanyaah Ride" ? (item.pickup?.address || item.from) : (item.storeAddress || item.from)}
                    customerAddress={item.to}
                    pickupCoordinates={item.pickup}
                    destinationCoordinates={item.destination}
                    orderType={item.type}
                    distance={item.dist}
                    marketplaceMode={item.type === "Marketplace"}
                    driverName="Anda (Driver)"
                    driverVehicle="Motor Driver"
                    orderStatus={item.status}
                    height={230}
                    navigationMode={cardNavMode[item.id] || "overview"}
                    onNavigationModeChange={(mode) =>
                      setCardNavMode((prev) => ({ ...prev, [item.id]: mode }))
                    }
                    showTurnInstructions={true}
                  />
                  <View style={styles.inlineMapActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.mapActionPill,
                        cardNavMode[item.id] === "store"
                          ? { backgroundColor: "#15803D", borderColor: "#15803D" }
                          : { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
                      ]}
                      onPress={() =>
                        setCardNavMode((prev) => ({ ...prev, [item.id]: "store" }))
                      }
                    >
                      {item.type === "Kanyaah Ride" || item.type === "Setor Sampah" || item.type === "Kanyaah Send" ? (
                        <MapPin
                          size={12}
                          color={cardNavMode[item.id] === "store" ? "#FFFFFF" : "#15803D"}
                        />
                      ) : (
                        <Store
                          size={12}
                          color={cardNavMode[item.id] === "store" ? "#FFFFFF" : "#15803D"}
                        />
                      )}
                      {cardNavMode[item.id] === "store" && (
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      )}
                      <Text
                        style={[
                          styles.mapActionPillText,
                          {
                            color:
                              cardNavMode[item.id] === "store" ? "#FFFFFF" : "#15803D",
                          },
                        ]}
                      >
                        {item.type === "Kanyaah Ride"
                          ? "Titik Jemput"
                          : item.type === "Kanyaah Send"
                          ? "Rute Pengirim"
                          : item.type === "Catering"
                          ? "Rute Dapur"
                          : item.type === "Setor Sampah"
                          ? "Rute Customer"
                          : "Navigasi Toko"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.mapActionPill,
                        cardNavMode[item.id] === "customer"
                          ? { backgroundColor: "#0D7A53", borderColor: "#0D7A53" }
                          : { backgroundColor: "#FFFFFF", borderColor: "#C6E7D4" },
                      ]}
                      onPress={() =>
                        setCardNavMode((prev) => ({ ...prev, [item.id]: "customer" }))
                      }
                    >
                      <Navigation
                        size={12}
                        color={cardNavMode[item.id] === "customer" ? "#FFFFFF" : "#0D7A53"}
                      />
                      {cardNavMode[item.id] === "customer" && (
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      )}
                      <Text
                        style={[
                          styles.mapActionPillText,
                          {
                            color:
                              cardNavMode[item.id] === "customer" ? "#FFFFFF" : "#0D7A53",
                          },
                        ]}
                      >
                        {item.type === "Kanyaah Ride"
                          ? "Titik Tujuan"
                          : item.type === "Kanyaah Send"
                          ? "Rute Penerima"
                          : item.type === "Catering"
                          ? "Rute Pemesan"
                          : item.type === "Setor Sampah"
                          ? "Rute Bank"
                          : "Navigasi Customer"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.mapActionPill,
                        { backgroundColor: "#FFFFFF", borderColor: "#C6E7D4" },
                      ]}
                      onPress={() => {
                        setSelectedOrder(item);
                        setNavMode(cardNavMode[item.id] || "store");
                      }}
                    >
                      <Maximize2 size={12} color="#0D7A53" />
                      <Text style={[styles.mapActionPillText, { color: "#0D7A53" }]}>
                        Detail Rute
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Buttons for Pending Orders */}
              {isPending && isOnline && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnOutline]}
                    disabled={mutatingOrderId === item.id}
                    onPress={() => handleDeclineOrder(item.id)}
                  >
                      {mutatingOrderId === item.id ? <ActivityIndicator color="#15803D" /> : <Text style={styles.actionBtnTextOutline}>Tolak</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSolid]}
                    disabled={mutatingOrderId === item.id}
                    onPress={() => handleAcceptOrder(item.id)}
                  >
                    {mutatingOrderId === item.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionBtnTextSolid}>{item.type === "Kanyaah Ride" ? "Terima Ride" : "Terima Pesanan"}</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons & Flow Buttons for Ongoing Orders */}
              {isOngoing && (
                <View style={styles.ongoingActionsColumn}>
                  {/* Quick Chat Row */}
                  {item.type === "Kanyaah Ride" ? (
                    <View style={styles.dualChatRow}>
                      <TouchableOpacity
                        style={styles.chatShortcutBtn}
                        onPress={() => openChatRoom(item, "customer")}
                        activeOpacity={0.8}
                      >
                        <MessageSquare size={14} color="#15803D" />
                        <Text style={[styles.chatShortcutText, { color: "#15803D" }]}>Chat Penumpang</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.chatShortcutBtn, { borderColor: "#BAE6FD" }]}
                        onPress={() => openPhoneCall(item.phone, item.customer)}
                        activeOpacity={0.8}
                      >
                        <Phone size={14} color="#0284C7" />
                        <Text style={[styles.chatShortcutText, { color: "#0284C7" }]}>Telepon Penumpang</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.dualChatRow}>
                      <TouchableOpacity
                        style={styles.chatShortcutBtn}
                        onPress={() => openChatRoom(item, "owner")}
                        activeOpacity={0.8}
                      >
                        <Store size={14} color="#0D7A53" />
                        <Text style={styles.chatShortcutText}>
                          {item.type === "Kanyaah Send"
                            ? "Chat Pengirim"
                            : item.type === "Catering"
                            ? "Chat Dapur Catering"
                            : item.type === "Setor Sampah"
                            ? "Chat Bank Sampah"
                            : "Chat Toko"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.chatShortcutBtn}
                        onPress={() => openChatRoom(item, "customer")}
                        activeOpacity={0.8}
                      >
                        <MessageSquare size={14} color="#2563EB" />
                        <Text style={[styles.chatShortcutText, { color: "#2563EB" }]}>
                          {item.type === "Kanyaah Send"
                            ? "Chat Penerima"
                            : item.type === "Catering"
                            ? "Chat Pemesan"
                            : "Chat Customer"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 0: Ready / Menunggu / Siap -> Action: Mulai Jalan ke Toko */}
                  {["Menunggu", "Diproses", "Siap"].includes(item.status) && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#0D7A53" }]}
                      onPress={() => handleUpdateStatus(item.id, "Menuju Pickup")}
                      activeOpacity={0.85}
                    >
                      <Navigation size={16} color="#FFFFFF" />
                      <Text style={styles.primaryFlowBtnText}>
                        {item.type === "Kanyaah Send"
                          ? "Mulai Jalan ke Pengirim"
                          : item.type === "Catering"
                          ? "Mulai Jalan ke Dapur Catering"
                          : item.type === "Setor Sampah"
                          ? "Mulai Jalan Jemput ke Customer"
                          : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")
                          ? "Mulai Jalan Jemput ke Customer"
                          : "Mulai Jalan ke Toko"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Step 1: Menuju Pickup -> Action: Tiba di Lokasi Penjemputan */}
                  {item.status === "Menuju Pickup" && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#2563EB" }]}
                      disabled={mutatingOrderId === item.id}
                      onPress={() => handleDriverTransition(item, "Sampai Pickup")}
                      activeOpacity={0.85}
                    >
                      {mutatingOrderId === item.id ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <MapPin size={16} color="#FFFFFF" />
                          <Text style={styles.primaryFlowBtnText}>
                            {item.type === "Kanyaah Ride"
                              ? "Saya Sudah Sampai di Penjemputan"
                              : item.type === "Kanyaah Send"
                              ? "Tiba di Lokasi Pengirim"
                              : item.type === "Catering"
                              ? "Tiba di Dapur Catering"
                              : item.type === "Setor Sampah"
                              ? "Tiba di Rumah Customer"
                              : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")
                              ? "Tiba di Rumah Customer"
                              : item.type === "Marketplace"
                              ? "Saya Sudah Sampai"
                              : "Tiba di Toko / Outlet"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Step 2: Sampai Pickup -> Action: Ambil Pesanan & Antar ke Tujuan */}
                  {item.status === "Sampai Pickup" && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#7E22CE" }]}
                      disabled={mutatingOrderId === item.id}
                      onPress={() => handleDriverTransition(item, "Mengantar")}
                      activeOpacity={0.85}
                    >
                      {mutatingOrderId === item.id ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Bike size={18} color="#FFFFFF" />
                          <Text style={styles.primaryFlowBtnText}>
                            {item.type === "Kanyaah Ride"
                              ? "Mulai Perjalanan dengan Penumpang"
                              : item.type === "Kanyaah Send"
                              ? "Paket Diambil & OTW ke Penerima"
                              : item.type === "Catering"
                              ? "Makanan Diambil & OTW ke Pemesan"
                              : item.type === "Setor Sampah"
                              ? "Sampah Diambil & OTW ke Bank Sampah"
                              : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")
                              ? "Baju Kotor Diterima & OTW ke Toko Laundry"
                              : item.type === "Marketplace"
                              ? "Pesanan Sudah Diambil"
                              : "Konfirmasi Ambil & OTW ke Customer"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Step 3: Mengantar -> Action: Tiba di Tujuan */}
                  {item.status === "Mengantar" && (
                    item.type === "Setor Sampah" && ["AT_BANK", "WEIGHING", "WAITING_CUSTOMER_CONFIRMATION", "DISPUTED"].includes(item.rawStatus || "") ? (
                      <View style={[
                        styles.completedBadgeBtn,
                        {
                          backgroundColor: item.rawStatus === "DISPUTED" ? "#FEF2F2" : "#F0FDF4",
                          borderColor: item.rawStatus === "DISPUTED" ? "#FECACA" : "#BBF7D0",
                          marginTop: 4,
                        }
                      ]}>
                        {item.rawStatus === "DISPUTED" ? (
                          <AlertCircle size={15} color="#DC2626" />
                        ) : (
                          <Clock size={15} color="#15803D" />
                        )}
                        <Text style={[
                          styles.completedBadgeBtnText,
                          { color: item.rawStatus === "DISPUTED" ? "#DC2626" : "#15803D", fontSize: 12 }
                        ]}>
                          {item.rawStatus === "DISPUTED"
                            ? "Menunggu Peninjauan Komplain Bank Sampah"
                            : item.rawStatus === "WAITING_CUSTOMER_CONFIRMATION" || item.rawStatus === "WEIGHING"
                            ? "Sampah di Bank • Menunggu Konfirmasi Customer"
                            : "Sampah Telah Tiba di Bank Sampah"}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.primaryFlowBtn, { backgroundColor: "#15803D" }]}
                        disabled={mutatingOrderId === item.id || proofUploadOrderId === item.id}
                        onPress={() => handleDriverTransition(item, "Selesai")}
                        activeOpacity={0.85}
                      >
                        {mutatingOrderId === item.id || proofUploadOrderId === item.id ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <CheckCircle size={18} color="#FFFFFF" />
                            <Text style={styles.primaryFlowBtnText}>
                              {item.type === "Kanyaah Ride"
                                ? "Selesaikan Perjalanan (Tiba di Tujuan)"
                                : item.type === "Kanyaah Send"
                                ? "Paket Diserahkan ke Penerima & Selesai"
                                : item.type === "Catering"
                                ? "Makanan Diserahkan ke Pemesan & Selesai"
                                : item.type === "Setor Sampah"
                                ? "Tiba di Bank Sampah & Serahkan Sampah"
                                : item.type === "Laundry" && item.items?.[0]?.name?.includes("Jemput")
                                ? "Tiba di Toko Laundry & Serahkan Cucian"
                                : item.type === "Marketplace"
                                ? "Upload Bukti & Selesaikan"
                                : "Selesaikan Pengantaran ke Customer"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )
                  )}

                  {proofUploadError?.orderId === item.id && (
                    <Text style={styles.proofUploadError}>{proofUploadError.message}</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={42} color="#94A3B8" />
            <Text style={styles.emptyTitle}>
              {!isOnline
                ? "Aktifkan status ONLINE untuk menerima pesanan baru"
                : "Tidak ada orderan pada kategori ini"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {!isOnline
                ? "Buka tab Beranda dan nyalakan tombol online untuk mulai menerima orderan."
                : "Pesanan yang masuk atau aktif akan ditampilkan secara real-time di sini."}
            </Text>
          </View>
        }
      />
      {safeCallTarget && (
        <SafeCallModal
          visible={safeCallVisible}
          onClose={() => setSafeCallVisible(false)}
          targetName={safeCallTarget.name}
          targetRole={safeCallTarget.role}
          targetPhone={safeCallTarget.phone}
          orderCode={safeCallTarget.orderCode}
        />
      )}
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    marginTop: 4,
    maxWidth: 240,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlinePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 12,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnSelected: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  tabBtnUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  tabBtnTextSelected: {
    color: "#FFFFFF",
  },
  tabBtnTextUnselected: {
    color: "#64748B",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 14,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  serviceChip: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  serviceChipText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  // Stepper
  stepperContainer: {
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDotActive: {
    backgroundColor: "#0D7A53",
  },
  stepperLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 3,
  },
  stepperLineActive: {
    backgroundColor: "#0D7A53",
  },
  stepperLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  stepperLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94A3B8",
    textAlign: "center",
    width: 66,
  },
  stepperLabelHighlight: {
    color: "#0D7A53",
    fontWeight: "900",
  },
  // Route Journey Box (Connected Timeline)
  routeJourneyBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 10,
    marginTop: 10,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  routeIconNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  routeContent: {
    flex: 1,
  },
  routeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  routeTypeTag: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  compactNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  compactNavText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  routeTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  routeAddress: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    lineHeight: 15,
  },
  routeConnectorLine: {
    width: 2,
    height: 12,
    backgroundColor: "#CBD5E1",
    marginLeft: 12,
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cardFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distanceText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  earningsValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 1,
  },
  mapToggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#C6E7D4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  mapToggleChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineMapBox: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  inlineMapActionRow: {
    flexDirection: "row",
    padding: 10,
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mapActionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mapActionPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as any,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: "#DC2626",
    backgroundColor: "#FFFFFF",
  },
  actionBtnSolid: {
    backgroundColor: "#0D7A53",
  },
  actionBtnTextOutline: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  ongoingActionsColumn: {
    marginTop: 14,
    gap: 8,
  },
  dualChatRow: {
    flexDirection: "row",
    gap: 8,
  },
  chatShortcutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 38,
    borderRadius: 10,
  },
  chatShortcutText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  primaryFlowBtn: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryFlowBtnText: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontWeight: "900",
    color: "#0F172A",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 28,
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },

  // =========================================================================
  // FULL PAGE VIEW STYLES
  // =========================================================================
  fullPageContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  fullPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    fontWeight: "800",
    color: "#0F172A",
  },
  fullPageHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullPageOrderCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  fullPageScroll: {
    flex: 1,
  },
  fullPageScrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  statusNoticeBanner: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    gap: 10,
    alignItems: "center",
  },
  statusNoticeTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  statusNoticeText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  fullMapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  fullMapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  fullMapTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  fullMapSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  distChip: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C6E7D4",
  },
  distChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  openFullscreenGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#C6E7D4",
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 10,
  },
  openFullscreenGpsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  // Start Journey Controller Styles
  startJourneyCard: {
    marginTop: 10,
  },
  startTripButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  startTripIconPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  startTripTitle: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  startTripSubtitle: {
    fontSize: 10,
    color: "#D1FAE5",
    marginTop: 2,
    fontWeight: "600",
  },
  tripActiveStatusBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    gap: 8,
  },
  tripLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tripLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  tripLiveText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  tripNextActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingVertical: 9,
    borderRadius: 8,
  },
  tripNextActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  startNavMainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803D",
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    cursor: "pointer" as any,
  },
  startNavMainButtonActive: {
    backgroundColor: "#EA580C",
    shadowColor: "#EA580C",
  },
  startNavMainButtonText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  tripCompletedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  tripCompletedNoticeText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
    flex: 1,
  },
  stepperLabelCol: {
    flex: 1,
    alignItems: "center",
  },
  // Fullscreen In-App Google Maps Modal Styles (Putih-Ijo Theme)
  fsGpsContainer: {
    flex: 1,
    backgroundColor: "#F4F9F6",
  },
  fsGpsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0D7A53",
    borderBottomWidth: 1,
    borderBottomColor: "#0A6343",
  },
  fsGpsCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fsGpsHeaderTitleBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  fsGpsHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    textAlign: "center",
  },
  fsGpsHeaderSub: {
    color: "#D1FAE5",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
    textAlign: "center",
  },
  fsGpsMapFrame: {
    flex: 1,
    padding: 12,
    backgroundColor: "#F4F9F6",
  },
  stepperCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardType: {
    fontSize: 9,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  infoCardAddress: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  addressDetailBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  addressDetailTitle: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 3,
  },
  addressDetailText: {
    color: "#4D7C5B",
    fontSize: 10,
    lineHeight: 16,
  },
  infoCardActionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    height: 36,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  actionPillOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 36,
    borderRadius: 8,
  },
  actionPillOutlineText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  itemsTable: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  itemQuantity: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  itemNote: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
    fontStyle: "italic",
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  priceVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 6,
  },
  emphasizedText: {
    fontWeight: "800",
    color: "#0F172A",
  },
  earningsHighlight: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  stickyActionFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 30,
  },
  dualActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetBtn: {
    flex: 1,
    minWidth: 132,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    cursor: "pointer" as any,
  },
  sheetBtnOutline: {
    borderWidth: 1.5,
    borderColor: "#DC2626",
    backgroundColor: "#FFFFFF",
  },
  sheetBtnSolid: {
    backgroundColor: "#0D7A53",
  },
  sheetBtnTextOutline: {
    flexShrink: 1,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  sheetBtnTextSolid: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center",
  },
  proofUploadError: {
    marginTop: 8,
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  proofPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  proofPickerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  proofPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  proofPickerTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  proofPickerDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 4,
  },
  proofPickerPrimaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  proofPickerPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  proofPickerSecondaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  proofPickerSecondaryText: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "800",
  },
  proofPickerCancelButton: {
    width: "100%",
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  proofPickerCancelText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  completedBadgeBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completedBadgeBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },

  // =========================================================================
  // CHAT MODAL STYLES
  // =========================================================================
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  chatSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    height: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
  },
  channelSwitcherRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  channelTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 10,
  },
  channelTabActiveOwner: {
    backgroundColor: "#0D7A53",
  },
  channelTabActiveCustomer: {
    backgroundColor: "#2563EB",
  },
  channelTabInactive: {
    backgroundColor: "#F1F5F9",
  },
  channelTabText: {
    fontSize: 11,
    fontWeight: "800",
  },
  channelTabTextActive: {
    color: "#FFFFFF",
  },
  channelTabTextInactive: {
    color: "#64748B",
  },
  quickChipsWrap: {
    marginBottom: 8,
  },
  quickChipsContent: {
    gap: 6,
  },
  quickChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  chatListContent: {
    paddingVertical: 10,
    gap: 10,
    flexGrow: 1,
  },
  emptyChatWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyChatIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChatTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyChatSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  chatBubbleContainer: {
    maxWidth: "80%",
  },
  chatBubbleLeft: {
    alignSelf: "flex-start",
  },
  chatBubbleRight: {
    alignSelf: "flex-end",
  },
  chatBubble: {
    borderRadius: 16,
    padding: 10,
  },
  chatBubbleDriver: {
    backgroundColor: "#0D7A53",
    borderBottomRightRadius: 2,
  },
  chatBubbleOther: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 2,
  },
  bubbleImgWrap: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 4,
    position: "relative",
  },
  bubbleImage: {
    width: 200,
    height: 140,
    borderRadius: 10,
  },
  bubbleZoomBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bubbleZoomText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatTextDriver: {
    color: "#FFFFFF",
  },
  chatTextOther: {
    color: "#0F172A",
  },
  chatMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  chatTime: {
    fontSize: 9,
    color: "#94A3B8",
  },
  attachmentPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 8,
  },
  previewThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  previewFileName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  previewFileSize: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  removeAttachBtn: {
    padding: 5,
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 38,
    fontSize: 13,
    color: "#0F172A",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: "#0D7A53",
  },
  sendBtnDisabled: {
    backgroundColor: "#E2E8F0",
  },
  // Full screen Image Viewer
  imageViewerBg: {
    flex: 1,
    backgroundColor: "#000000",
  },
  imageViewerHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imageViewerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  imageViewerCloseBtn: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 18,
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

  driverPaymentInstructionBoxCod: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  driverPaymentInstructionTitleCod: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },
  driverPaymentInstructionAmountCod: {
    fontSize: 11,
    fontWeight: "900",
    color: "#78350F",
  },
  driverPaymentInstructionSubCod: {
    fontSize: 10,
    color: "#78350F",
    marginTop: 1,
  },
  driverPaymentInstructionBoxPaid: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  driverPaymentInstructionTitlePaid: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
  },
  driverPaymentInstructionSubPaid: {
    fontSize: 10,
    color: "#166534",
    marginTop: 1,
  },

  // Driver Rating Recap Card Styles
  driverRatingRecapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  driverRatingRecapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  driverRatingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverRatingRecapTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#92400E",
    letterSpacing: 0.5,
  },
  driverRatingScoreBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  driverRatingScoreBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#B45309",
  },
  driverRatingPendingBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  driverRatingPendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  driverRatingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  driverRatingScoreLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
    marginLeft: 8,
  },
  driverRatingReviewBubble: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  driverRatingReviewText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 18,
  },
  driverRatingNoReviewText: {
    fontSize: 11.5,
    color: "#64748B",
    fontStyle: "italic",
  },
  driverRatingNoticeText: {
    fontSize: 10.5,
    color: "#15803D",
    fontWeight: "600",
  },
  driverRatingWaitingWrap: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
  },
  driverRatingWaitingText: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
  },
});