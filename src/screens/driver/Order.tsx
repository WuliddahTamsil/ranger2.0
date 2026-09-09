import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
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
} from "react-native";
import {
  ShoppingBag,
  MapPin,
  Clock,
  Navigation,
  MessageSquare,
  Phone,
  CheckCircle,
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
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { rp } from "../../utils/formatters";
import { getChatMessages, sendChatMessage } from "../../services/api";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";

export interface DriverOrder {
  id: string;
  customer: string;
  phone: string;
  type: "Catering" | "Marketplace" | "Laundry";
  time: string;
  from: string;
  to: string;
  dist: string;
  pay: number;
  driverShare: number;
  status: "Menunggu" | "Menuju Pickup" | "Sampai Pickup" | "Mengantar" | "Selesai" | "Dibatalkan";
  items?: { name: string; quantity: number; price: number }[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  ownerId?: string;
}

interface OrderProps {
  orders: DriverOrder[];
  setOrders: (orders: DriverOrder[]) => void;
  balance: number;
  setBalance: (bal: number) => void;
  transactions: any[];
  setTransactions: (txs: any[]) => void;
  isOnline: boolean;
  onStatusChange?: (orderId: string, status: DriverOrder["status"]) => Promise<boolean>;
  onAcceptOrder?: (orderId: string) => Promise<boolean>;
  driverId?: string;
}

interface ChatAttachment {
  type: "image" | "file";
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
  driverId,
}) => {
  const [activeTab, setActiveTab] = useState<"Masuk" | "Aktif" | "Selesai" | "Batal">("Masuk");
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);
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
    return () => clearInterval(interval);
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

  const openPhoneCall = (phoneNumber?: string, name?: string) => {
    if (!phoneNumber) {
      Alert.alert("Telepon", `Nomor telepon untuk ${name || "kontak ini"} belum tersedia.`);
      return;
    }
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert("Panggilan Gagal", `Tidak dapat menghubungi ${phoneNumber}.`);
    });
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
    nextStatus: DriverOrder["status"]
  ): Promise<boolean> => {
    if (onStatusChange) {
      try {
        const success = await onStatusChange(orderId, nextStatus);
        if (!success) return false;
      } catch (err) {
        console.error("Status change error:", err);
        return false;
      }
    }

    let alertTitle = "Status Diperbarui";
    let alertMsg = "";
    let isFinished = false;
    let earnedAmount = 0;

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        earnedAmount = o.driverShare;
        if (nextStatus === "Menuju Pickup") {
          alertTitle = "Menuju Lokasi Toko";
          alertMsg = `Live tracking aktif! Perjalanan menuju toko (${o.storeName || o.from}) telah dimulai. Notifikasi telah dikirim ke pemilik toko.`;
        } else if (nextStatus === "Sampai Pickup") {
          alertTitle = "Tiba di Toko";
          alertMsg = `Anda telah tiba di ${o.storeName || "toko"}. Silakan periksa pesanan ke kasir atau dapur.`;
        } else if (nextStatus === "Mengantar") {
          alertTitle = "Menuju Alamat Customer";
          alertMsg = `Live tracking aktif! Memulai pengantaran ke alamat ${o.customer}. Notifikasi telah dikirim ke customer dan pemilik toko.`;
        } else if (nextStatus === "Selesai") {
          alertTitle = "Pengantaran Selesai";
          alertMsg = `Pesanan berhasil diserahkan. Pendapatan ${rp(o.driverShare)} telah ditambahkan ke saldo Anda.`;
          isFinished = true;
        } else if (nextStatus === "Dibatalkan") {
          alertTitle = "Pesanan Ditolak";
          alertMsg = "Pesanan telah ditolak.";
        }
        return { ...o, status: nextStatus };
      }
      return o;
    });

    setOrders(updated);

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus });
    }

    if (isFinished) {
      setBalance(balance + earnedAmount);
      const newTx = {
        id: `TX-${Date.now().toString().slice(-4)}`,
        type: "in" as const,
        title: `Penyelesaian Order #${orderId.slice(-6)}`,
        description: "Pendapatan jasa kurir pengiriman",
        amount: earnedAmount,
        time: "Hari ini, Baru saja",
        status: "Sukses" as const,
      };
      setTransactions([newTx, ...transactions]);
    }

    Alert.alert(alertTitle, alertMsg);
    return true;
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (onAcceptOrder && !(await onAcceptOrder(orderId))) return;
    await handleUpdateStatus(orderId, "Menuju Pickup");
    setActiveTab("Aktif");
  };

  const handleDeclineOrder = (orderId: string) => {
    Alert.alert(
      "Konfirmasi Penolakan",
      "Apakah Anda ingin menolak pesanan ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak Pesanan",
          style: "destructive",
          onPress: () => {
            handleUpdateStatus(orderId, "Dibatalkan");
            if (selectedOrder?.id === orderId) {
              setSelectedOrder(null);
            }
          },
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
      text: textToSend || (selectedAttachment?.type === "image" ? "Foto terkirim" : "File terlampir"),
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

  // Filter tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "Masuk") {
      return order.status === "Menunggu";
    } else if (activeTab === "Aktif") {
      return (
        order.status === "Menuju Pickup" ||
        order.status === "Sampai Pickup" ||
        order.status === "Mengantar"
      );
    } else if (activeTab === "Selesai") {
      return order.status === "Selesai";
    } else {
      return order.status === "Dibatalkan";
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Menunggu": return "#D97706";
      case "Menuju Pickup": return "#2563EB";
      case "Sampai Pickup": return "#7E22CE";
      case "Mengantar": return "#0891B2";
      case "Selesai": return "#15803D";
      default: return "#DC2626";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "Menunggu": return "#FEF3C7";
      case "Menuju Pickup": return "#EFF6FF";
      case "Sampai Pickup": return "#F3E8FF";
      case "Mengantar": return "#ECFEFF";
      case "Selesai": return "#DCFCE7";
      default: return "#FEE2E2";
    }
  };

  const getStatusBadgeLabel = (status: string) => {
    switch (status) {
      case "Menunggu": return "Order Masuk";
      case "Menuju Pickup": return "Menuju Toko";
      case "Sampai Pickup": return "Tiba di Toko";
      case "Mengantar": return "Mengantar ke Customer";
      case "Selesai": return "Selesai";
      default: return "Dibatalkan";
    }
  };

  // Stepper helper
  const getStageStep = (status: string) => {
    switch (status) {
      case "Menuju Pickup": return 1;
      case "Sampai Pickup": return 2;
      case "Mengantar": return 3;
      case "Selesai": return 4;
      default: return 0;
    }
  };

  const quickMessagesOwner = [
    "Saya sudah sampai di depan toko",
    "Pesanan atas nama ini apakah sudah siap?",
    "Mohon ditunggu sebentar, saya sedang dalam perjalanan",
    "Pesanan sudah saya ambil, terima kasih",
  ];

  const quickMessagesCustomer = [
    "Kurir sedang dalam perjalanan mengantar pesanan Anda",
    "Saya sudah tiba di lokasi alamat Anda",
    "Bisa tolong informasikan patokan rumah atau nomor pagar?",
    "Pesanan telah dititipkan sesuai petunjuk, terima kasih",
  ];

  // =========================================================================
  // RENDER: FULL PAGE VIEW WHEN AN ORDER IS SELECTED (NO POPUPS)
  // =========================================================================
  if (selectedOrder) {
    const step = getStageStep(selectedOrder.status);

    return (
      <Modal
        visible={Boolean(selectedOrder)}
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <SafeAreaView style={styles.fullPageContainer}>
          {/* Sticky Top Bar */}
          <View style={styles.fullPageHeader}>
            <TouchableOpacity
              style={styles.fullPageBackBtn}
              onPress={() => setSelectedOrder(null)}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#0F172A" />
              <Text style={styles.fullPageBackText}>Daftar Orderan</Text>
            </TouchableOpacity>

          <View style={styles.fullPageHeaderRight}>
            <Text style={styles.fullPageOrderCode}>#{selectedOrder.id.slice(-8)}</Text>
            <View style={[styles.badge, { backgroundColor: getStatusBg(selectedOrder.status) }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(selectedOrder.status) }]}>
                {getStatusBadgeLabel(selectedOrder.status)}
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
                {getStatusBadgeLabel(selectedOrder.status)} • {selectedOrder.type} Delivery
              </Text>
              <Text style={styles.statusNoticeText}>
                {selectedOrder.status === "Menuju Pickup"
                  ? "Kurir sedang dalam perjalanan ke alamat toko untuk mengambil pesanan."
                  : selectedOrder.status === "Sampai Pickup"
                  ? "Kurir telah tiba di toko. Silakan periksa barang pesanan dan konfirmasi saat siap berangkat ke customer."
                  : selectedOrder.status === "Mengantar"
                  ? "Pesanan telah diambil dari toko. Kurir sedang mengantar pesanan ke alamat tujuan customer."
                  : selectedOrder.status === "Selesai"
                  ? "Pengantaran selesai dilakukan. Pendapatan telah dikreditkan ke saldo dompet driver."
                  : "Pesanan baru menunggu keputusan Anda."}
              </Text>
            </View>
          </View>

          {/* Prominent Live Tracking Map Card */}
          <View style={styles.fullMapCard}>
            <View style={styles.fullMapHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Compass size={16} color="#0D7A53" />
                <Text style={styles.fullMapTitle}>Peta Rute Navigasi</Text>
              </View>
              <View style={styles.distChip}>
                <Text style={styles.distChipText}>{selectedOrder.dist}</Text>
              </View>
            </View>

            <View style={{ padding: 12 }}>
              <LiveOrderTrackingMap
                storeName={selectedOrder.storeName || selectedOrder.from}
                storeAddress={selectedOrder.storeAddress || selectedOrder.from}
                customerAddress={selectedOrder.to}
                driverName="Anda (Kurir)"
                driverVehicle="Motor Kurir"
                orderStatus={selectedOrder.status}
                height={260}
                navigationMode={navMode}
                onNavigationModeChange={(mode) => setNavMode(mode)}
                showTurnInstructions={true}
                onToggleFullscreen={() => setFullscreenMapVisible(true)}
              />

              {/* Interactive Start Journey Navigation Controller */}
              <View style={styles.startJourneyCard}>
                {/* 1. Mode Rute ke Toko */}
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
                          <Text style={styles.startTripTitle}>MULAI JALAN KE TOKO</Text>
                          <Text style={styles.startTripSubtitle}>
                            Aktifkan tracking & kirim notifikasi ke pemilik toko
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : selectedOrder.status === "Menuju Pickup" ? (
                      <View style={styles.tripActiveStatusBox}>
                        <View style={styles.tripLiveRow}>
                          <View style={styles.tripLiveDot} />
                          <Text style={styles.tripLiveText}>SEDANG DALAM PERJALANAN KE TOKO</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.tripNextActionButton}
                          onPress={() => handleUpdateStatus(selectedOrder.id, "Sampai Pickup")}
                          activeOpacity={0.85}
                        >
                          <Store size={15} color="#FFFFFF" />
                          <Text style={styles.tripNextActionText}>Konfirmasi Tiba di Toko</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.tripCompletedNotice}>
                        <CheckCircle size={15} color="#0D7A53" />
                        <Text style={styles.tripCompletedNoticeText}>
                          Anda sudah sampai di toko. Silakan periksa pesanan & ambil barang.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 2. Mode Rute ke Customer */}
                {navMode === "customer" && (
                  <View style={{ gap: 8 }}>
                    {["Menuju Pickup", "Sampai Pickup"].includes(selectedOrder.status) ? (
                      <TouchableOpacity
                        style={styles.startTripButton}
                        onPress={async () => {
                          await handleUpdateStatus(selectedOrder.id, "Mengantar");
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.startTripIconPulse}>
                          <Bike size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.startTripTitle}>MULAI ANTAR KE CUSTOMER</Text>
                          <Text style={styles.startTripSubtitle}>
                            Aktifkan tracking & kirim notifikasi ke customer
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : selectedOrder.status === "Mengantar" ? (
                      <View style={styles.tripActiveStatusBox}>
                        <View style={styles.tripLiveRow}>
                          <View style={styles.tripLiveDot} />
                          <Text style={styles.tripLiveText}>SEDANG MENGANTAR KE CUSTOMER</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.tripNextActionButton, { backgroundColor: "#15803D" }]}
                          onPress={() => handleUpdateStatus(selectedOrder.id, "Selesai")}
                          activeOpacity={0.85}
                        >
                          <CheckCircle size={15} color="#FFFFFF" />
                          <Text style={styles.tripNextActionText}>Selesaikan Pengantaran</Text>
                        </TouchableOpacity>
                      </View>
                    ) : selectedOrder.status === "Selesai" ? (
                      <View style={styles.tripCompletedNotice}>
                        <CheckCircle size={15} color="#0D7A53" />
                        <Text style={styles.tripCompletedNoticeText}>
                          Pengantaran selesai dilakukan. Terima kasih!
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
                      Menampilkan keseluruhan lintasan penjemputan dari toko hingga ke customer.
                    </Text>
                  </View>
                )}
              </View>

              {/* Single Clean Fullscreen Navigation Button (Spacious, No Text Wrap) */}
              <TouchableOpacity
                style={styles.openFullscreenGpsBtn}
                onPress={() => setFullscreenMapVisible(true)}
                activeOpacity={0.8}
              >
                <Maximize2 size={14} color="#0D7A53" />
                <Text style={styles.openFullscreenGpsText}>Buka Navigasi Layar Penuh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stepper Progress */}
          <View style={styles.stepperCard}>
            <Text style={styles.sectionLabel}>TAHAPAN PENGANTARAN</Text>
            <View style={styles.stepperRow}>
              <View style={[styles.stepperDot, step >= 1 && styles.stepperDotActive]}>
                <Bike size={12} color={step >= 1 ? "#FFFFFF" : "#94A3B8"} />
              </View>
              <View style={[styles.stepperLine, step >= 2 && styles.stepperLineActive]} />
              <View style={[styles.stepperDot, step >= 2 && styles.stepperDotActive]}>
                <Store size={12} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
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
                  Ke Toko
                </Text>
              </View>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 2 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  Di Toko
                </Text>
              </View>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 3 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  Ke Customer
                </Text>
              </View>
              <View style={styles.stepperLabelCol}>
                <Text style={[styles.stepperLabel, step === 4 && styles.stepperLabelHighlight]} numberOfLines={1}>
                  Selesai
                </Text>
              </View>
            </View>
          </View>

          {/* Section 1: Lokasi Toko (Pickup) */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoIconBox}>
                <Store size={18} color="#0D7A53" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardType}>LOKASI PENJEMPUTAN (TOKO)</Text>
                <Text style={styles.infoCardTitle}>{selectedOrder.storeName || selectedOrder.from}</Text>
              </View>
            </View>

            <Text style={styles.infoCardAddress}>{selectedOrder.storeAddress || selectedOrder.from}</Text>

            <View style={styles.infoCardActionsRow}>
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
            </View>
          </View>

          {/* Section 2: Lokasi Customer (Delivery) */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={[styles.infoIconBox, { backgroundColor: "#EFF6FF" }]}>
                <User size={18} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoCardType, { color: "#2563EB" }]}>LOKASI PENGANTARAN (CUSTOMER)</Text>
                <Text style={styles.infoCardTitle}>{selectedOrder.customer}</Text>
              </View>
            </View>

            <Text style={styles.infoCardAddress}>{selectedOrder.to}</Text>

            <View style={styles.infoCardActionsRow}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => openChatRoom(selectedOrder, "customer")}
                activeOpacity={0.8}
              >
                <MessageSquare size={14} color="#0D7A53" />
                <Text style={styles.actionPillText}>Chat Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPillOutline}
                onPress={() => openPhoneCall(selectedOrder.phone, selectedOrder.customer)}
                activeOpacity={0.8}
              >
                <Phone size={14} color="#334155" />
                <Text style={styles.actionPillOutlineText}>Telepon Customer</Text>
              </TouchableOpacity>
            </View>
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
                    </View>
                    <Text style={styles.itemPrice}>{rp(item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Section 4: Rincian Pendapatan Driver */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionLabel}>RINCIAN TARIF & PENDAPATAN</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Nilai Belanja Pesanan</Text>
              <Text style={styles.priceVal}>{rp(selectedOrder.pay)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Potongan Komisi Platform (0%)</Text>
              <Text style={styles.priceVal}>Rp 0</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.emphasizedText}>Pendapatan Bersih Kurir</Text>
              <Text style={styles.earningsHighlight}>{rp(selectedOrder.driverShare)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.stickyActionFooter}>
          {selectedOrder.status === "Menunggu" && isOnline && (
            <View style={styles.dualActionsRow}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnOutline]}
                onPress={() => handleDeclineOrder(selectedOrder.id)}
              >
                <Text style={styles.sheetBtnTextOutline}>Tolak Pesanan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid]}
                onPress={() => handleAcceptOrder(selectedOrder.id)}
              >
                <Text style={styles.sheetBtnTextSolid}>Terima Pesanan</Text>
              </TouchableOpacity>
            </View>
          )}

          {["Siap", "Diproses"].includes(selectedOrder.status) && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#0D7A53" }]}
              onPress={() => handleUpdateStatus(selectedOrder.id, "Menuju Pickup")}
              activeOpacity={0.85}
            >
              <Navigation size={18} color="#FFFFFF" />
              <Text style={styles.sheetBtnTextSolid}>Mulai Jalan ke Toko</Text>
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Menuju Pickup" && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#2563EB" }]}
              onPress={() => handleUpdateStatus(selectedOrder.id, "Sampai Pickup")}
              activeOpacity={0.85}
            >
              <Store size={18} color="#FFFFFF" />
              <Text style={styles.sheetBtnTextSolid}>Tiba di Toko / Outlet</Text>
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Sampai Pickup" && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#7E22CE" }]}
              onPress={() => handleUpdateStatus(selectedOrder.id, "Mengantar")}
              activeOpacity={0.85}
            >
              <Bike size={20} color="#FFFFFF" />
              <Text style={styles.sheetBtnTextSolid}>Konfirmasi Ambil & OTW ke Customer</Text>
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Mengantar" && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#15803D" }]}
              onPress={() => handleUpdateStatus(selectedOrder.id, "Selesai")}
              activeOpacity={0.85}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.sheetBtnTextSolid}>Selesaikan Pengantaran</Text>
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Selesai" && (
            <View style={styles.completedBadgeBtn}>
              <CheckCircle size={18} color="#15803D" />
              <Text style={styles.completedBadgeBtnText}>Pengantaran Selesai</Text>
            </View>
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
          <SafeAreaView style={styles.fsGpsContainer}>
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
                  {navMode === "store" ? "Menuju Toko" : navMode === "customer" ? "Menuju Customer" : "Semua Rute"} • #{selectedOrder?.id.slice(-6)}
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
                storeName={selectedOrder?.storeName || selectedOrder?.from}
                storeAddress={selectedOrder?.storeAddress || selectedOrder?.from}
                customerAddress={selectedOrder?.to}
                driverName="Anda (Kurir)"
                driverVehicle="Motor Kurir"
                orderStatus={selectedOrder?.status || "Mengantar"}
                height={Platform.OS === "web" ? 480 : 420}
                navigationMode={navMode}
                onNavigationModeChange={(mode) => setNavMode(mode)}
                showTurnInstructions={true}
              />

              {/* Quick Trip Action Button inside Fullscreen View */}
              {navMode === "store" && ["Menunggu", "Diproses", "Siap"].includes(selectedOrder?.status || "") && (
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

              {navMode === "customer" && ["Menuju Pickup", "Sampai Pickup"].includes(selectedOrder?.status || "") && (
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
          </SafeAreaView>
        </Modal>
        </SafeAreaView>
      </Modal>
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
                    ? `Chat Toko: ${selectedOrder.storeName || selectedOrder.from}`
                    : `Chat Customer: ${selectedOrder.customer}`}
                </Text>
                <Text style={styles.chatHeaderSubtitle}>
                  Order #{selectedOrder.id.slice(-8)} • Saluran Langsung
                </Text>
              </View>
              <TouchableOpacity onPress={() => setChatModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Target Channel Segment Switcher */}
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
                  Toko / Outlet
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
                  Customer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Preset Message Chips */}
            <View style={styles.quickChipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsContent}>
                {(chatTarget === "owner" ? quickMessagesOwner : quickMessagesCustomer).map((msg, idx) => (
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
                    {chatTarget === "owner" ? "Percakapan dengan Toko" : "Percakapan dengan Customer"}
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
                    ? "Ketik pesan ke toko..."
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
              <SafeAreaView style={styles.imageViewerHeader}>
                <Text style={styles.imageViewerTitle}>Pratinjau Foto</Text>
                <TouchableOpacity
                  style={styles.imageViewerCloseBtn}
                  onPress={() => setPreviewImageUri(null)}
                >
                  <X size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </SafeAreaView>
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
    <SafeAreaView style={styles.container}>
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

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {(["Masuk", "Aktif", "Selesai", "Batal"] as const).map((tab) => {
          const isSelected = activeTab === tab;
          const count =
            tab === "Masuk" ? orders.filter((o) => o.status === "Menunggu").length :
            tab === "Aktif" ? orders.filter((o) => ["Menuju Pickup", "Sampai Pickup", "Mengantar"].includes(o.status)).length :
            tab === "Selesai" ? orders.filter((o) => o.status === "Selesai").length :
            orders.filter((o) => o.status === "Dibatalkan").length;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isSelected ? styles.tabBtnSelected : styles.tabBtnUnselected]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, isSelected ? styles.tabBtnTextSelected : styles.tabBtnTextUnselected]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List content */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPending = item.status === "Menunggu";
          const isOngoing = ["Menuju Pickup", "Sampai Pickup", "Mengantar"].includes(item.status);
          const isMapOpen = !!cardMapExpanded[item.id];
          const step = getStageStep(item.status);

          return (
            <View style={styles.orderCard}>
              <TouchableOpacity
                onPress={() => setSelectedOrder(item)}
                activeOpacity={0.85}
              >
                {/* Header Card */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
                    <View style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{item.type}</Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getStatusBg(item.status) }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                      {getStatusBadgeLabel(item.status)}
                    </Text>
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
                        <Store size={10} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
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
                      <Text style={[styles.stepperLabel, step === 1 && styles.stepperLabelHighlight]}>Menuju Toko</Text>
                      <Text style={[styles.stepperLabel, step === 2 && styles.stepperLabelHighlight]}>Tiba di Toko</Text>
                      <Text style={[styles.stepperLabel, step === 3 && styles.stepperLabelHighlight]}>Ke Customer</Text>
                      <Text style={[styles.stepperLabel, step === 4 && styles.stepperLabelHighlight]}>Selesai</Text>
                    </View>
                  </View>
                )}

                {/* Pickup (Toko) & Delivery (Customer) Cards */}
                <View style={styles.locationsContainer}>
                  {/* Toko / Merchant Card */}
                  <View style={styles.locCard}>
                    <View style={[styles.locIconWrap, { backgroundColor: "#DCFCE7" }]}>
                      <Store size={15} color="#15803D" />
                    </View>
                    <View style={styles.locInfo}>
                      <View style={styles.locHeaderRow}>
                        <Text style={styles.locTypeTag}>LOKASI PENJEMPUTAN (TOKO)</Text>
                        <TouchableOpacity
                          style={styles.inlineNavBtn}
                          onPress={() => openNavigationToStore(item)}
                          activeOpacity={0.7}
                        >
                          <Compass size={11} color="#15803D" />
                          <Text style={styles.inlineNavText}>Navigasi</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.locTitle} numberOfLines={1}>
                        {item.storeName || item.from}
                      </Text>
                      <Text style={styles.locAddress} numberOfLines={2}>
                        {item.storeAddress || item.from}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.locDividerLine}>
                    <View style={styles.locDottedDash} />
                  </View>

                  {/* Customer Card */}
                  <View style={styles.locCard}>
                    <View style={[styles.locIconWrap, { backgroundColor: "#EFF6FF" }]}>
                      <MapPin size={15} color="#2563EB" />
                    </View>
                    <View style={styles.locInfo}>
                      <View style={styles.locHeaderRow}>
                        <Text style={[styles.locTypeTag, { color: "#2563EB" }]}>LOKASI PENGANTARAN (CUSTOMER)</Text>
                        <TouchableOpacity
                          style={styles.inlineNavBtnCustomer}
                          onPress={() => openNavigationToCustomer(item)}
                          activeOpacity={0.7}
                        >
                          <Navigation size={11} color="#2563EB" />
                          <Text style={styles.inlineNavTextCustomer}>Navigasi</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.locTitle} numberOfLines={1}>
                        {item.customer}
                      </Text>
                      <Text style={styles.locAddress} numberOfLines={2}>
                        {item.to}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Price and distance info */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.distanceText}>{item.dist} • Pendapatan Bersih</Text>
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
                        <Compass size={13} color="#0D7A53" />
                        <Text style={styles.mapToggleChipText}>
                          {isMapOpen ? "Tutup Peta" : "Peta Rute"}
                        </Text>
                        {isMapOpen ? <ChevronUp size={13} color="#0D7A53" /> : <ChevronDown size={13} color="#0D7A53" />}
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={18} color="#94A3B8" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Inline Map Accordion for Active Order */}
              {isOngoing && isMapOpen && (
                <View style={styles.inlineMapBox}>
                  <LiveOrderTrackingMap
                    storeName={item.storeName || item.from}
                    storeAddress={item.storeAddress || item.from}
                    customerAddress={item.to}
                    driverName="Anda (Kurir)"
                    driverVehicle="Motor Kurir"
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
                      <Store
                        size={12}
                        color={cardNavMode[item.id] === "store" ? "#FFFFFF" : "#15803D"}
                      />
                      <Text
                        style={[
                          styles.mapActionPillText,
                          {
                            color:
                              cardNavMode[item.id] === "store" ? "#FFFFFF" : "#15803D",
                          },
                        ]}
                      >
                        {cardNavMode[item.id] === "store" ? "✓ Rute Toko" : "Navigasi Toko"}
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
                      <Text
                        style={[
                          styles.mapActionPillText,
                          {
                            color:
                              cardNavMode[item.id] === "customer" ? "#FFFFFF" : "#0D7A53",
                          },
                        ]}
                      >
                        {cardNavMode[item.id] === "customer" ? "✓ Rute Customer" : "Navigasi Customer"}
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
                    onPress={() => handleDeclineOrder(item.id)}
                  >
                    <Text style={styles.actionBtnTextOutline}>Tolak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnSolid]}
                    onPress={() => handleAcceptOrder(item.id)}
                  >
                    <Text style={styles.actionBtnTextSolid}>Terima Pesanan</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons & Flow Buttons for Ongoing Orders */}
              {isOngoing && (
                <View style={styles.ongoingActionsColumn}>
                  {/* Quick Chat Row: Toko and Customer */}
                  <View style={styles.dualChatRow}>
                    <TouchableOpacity
                      style={styles.chatShortcutBtn}
                      onPress={() => openChatRoom(item, "owner")}
                      activeOpacity={0.8}
                    >
                      <Store size={14} color="#0D7A53" />
                      <Text style={styles.chatShortcutText}>Chat Toko</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.chatShortcutBtn}
                      onPress={() => openChatRoom(item, "customer")}
                      activeOpacity={0.8}
                    >
                      <MessageSquare size={14} color="#2563EB" />
                      <Text style={[styles.chatShortcutText, { color: "#2563EB" }]}>Chat Customer</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Step 0: Ready / Menunggu / Siap -> Action: Mulai Jalan ke Toko */}
                  {["Menunggu", "Diproses", "Siap"].includes(item.status) && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#0D7A53" }]}
                      onPress={() => handleUpdateStatus(item.id, "Menuju Pickup")}
                      activeOpacity={0.85}
                    >
                      <Navigation size={16} color="#FFFFFF" />
                      <Text style={styles.primaryFlowBtnText}>Mulai Jalan ke Toko</Text>
                    </TouchableOpacity>
                  )}

                  {/* Step 1: Menuju Pickup -> Action: Tiba di Toko */}
                  {item.status === "Menuju Pickup" && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#2563EB" }]}
                      onPress={() => handleUpdateStatus(item.id, "Sampai Pickup")}
                      activeOpacity={0.85}
                    >
                      <Store size={16} color="#FFFFFF" />
                      <Text style={styles.primaryFlowBtnText}>Tiba di Toko / Outlet</Text>
                    </TouchableOpacity>
                  )}

                  {/* Step 2: Sampai Pickup -> Action: Ambil Pesanan & OTW ke Customer */}
                  {item.status === "Sampai Pickup" && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#7E22CE" }]}
                      onPress={() => handleUpdateStatus(item.id, "Mengantar")}
                      activeOpacity={0.85}
                    >
                      <Bike size={18} color="#FFFFFF" />
                      <Text style={styles.primaryFlowBtnText}>Konfirmasi Ambil & OTW ke Customer</Text>
                    </TouchableOpacity>
                  )}

                  {/* Step 3: Mengantar -> Action: Pesanan Tiba & Selesaikan Pengantaran */}
                  {item.status === "Mengantar" && (
                    <TouchableOpacity
                      style={[styles.primaryFlowBtn, { backgroundColor: "#15803D" }]}
                      onPress={() => handleUpdateStatus(item.id, "Selesai")}
                      activeOpacity={0.85}
                    >
                      <CheckCircle size={18} color="#FFFFFF" />
                      <Text style={styles.primaryFlowBtnText}>Selesaikan Pengantaran</Text>
                    </TouchableOpacity>
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
              {activeTab === "Masuk" && !isOnline
                ? "Aktifkan status ONLINE untuk menerima pesanan baru"
                : "Tidak ada orderan pada status ini"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "Masuk" && !isOnline
                ? "Buka tab Beranda dan nyalakan tombol online untuk mulai menerima pengantaran."
                : "Pesanan yang masuk atau aktif akan ditampilkan secara real-time di sini."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  serviceChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  // Stepper
  stepperContainer: {
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDotActive: {
    backgroundColor: "#0D7A53",
  },
  stepperLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  stepperLineActive: {
    backgroundColor: "#0D7A53",
  },
  stepperLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  stepperLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    textAlign: "center",
    width: 68,
  },
  stepperLabelHighlight: {
    color: "#0D7A53",
    fontWeight: "900",
  },
  // Locations
  locationsContainer: {
    marginTop: 12,
    gap: 8,
  },
  locCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  locIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  locInfo: {
    flex: 1,
  },
  locHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  locTypeTag: {
    fontSize: 9,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  inlineNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineNavText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  inlineNavBtnCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineNavTextCustomer: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },
  locTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  locAddress: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
  },
  locDividerLine: {
    height: 8,
    marginLeft: 26,
    justifyContent: "center",
  },
  locDottedDash: {
    width: 2,
    height: 8,
    backgroundColor: "#CBD5E1",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cardFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  distanceText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 2,
  },
  mapToggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapToggleChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
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
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryFlowBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
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
    elevation: 8,
  },
  dualActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  sheetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
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
});
