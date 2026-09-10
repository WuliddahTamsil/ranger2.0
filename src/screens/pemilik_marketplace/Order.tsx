import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Linking,
  Image,
  Platform,
} from "react-native";
import {
  Search,
  SlidersHorizontal,
  Bell,
  ShoppingBag,
  Clock,
  MessageSquare,
  Truck,
  Store,
  MapPin,
  X,
  Send,
  User,
  Map,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Phone,
  Navigation,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Camera,
  Maximize2,
  ChevronRight,
  Package,
  Flame,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { rp } from "../../utils/formatters";
import { getChatMessages, sendChatMessage } from "../../services/api";
import { AnimatedOrderPreparation } from "../../components/AnimatedOrderPreparation";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";

interface OrderItemDetail {
  name: string;
  quantity: number;
  price: number;
}

interface DriverProfile {
  name: string;
  vehicle: string;
  plateNumber: string;
  rating: number;
  stage: string;
  distance: string;
  eta: string;
}

export interface OrderData {
  id: string;
  customer: string;
  customerPhone: string;
  items: OrderItemDetail[];
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
}

interface OrderProps {
  orders: OrderData[];
  setOrders: (orders: OrderData[]) => void;
  onStatusChange?: (orderId: string, status: OrderData["status"]) => Promise<boolean>;
  ownerId?: string;
  drivers?: { id: string; name: string; phone: string; vehicleType?: string; plateNumber?: string }[];
  onAssignDriver?: (orderId: string, driverId: string) => Promise<boolean>;
}

export const Order: React.FC<OrderProps> = ({ orders, setOrders, onStatusChange, ownerId, drivers = [], onAssignDriver }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  
  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatTarget, setChatTarget] = useState<"customer" | "driver">("customer");
  const [chatMessages, setChatMessages] = useState<{
    [key: string]: {
      sender: string;
      text: string;
      time: string;
      attachment?: {
        type: "image" | "file";
        uri: string;
        name?: string;
        size?: string;
      };
    }[];
  }>({});
  const [typedMessage, setTypedMessage] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{
    type: "image" | "file";
    uri: string;
    name?: string;
    size?: string;
  } | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  // Route map mode state: "store" (Kurir ke Toko) | "customer" (Kurir ke Customer) | "overview" (Semua)
  const [mapRouteMode, setMapRouteMode] = useState<"store" | "customer" | "overview">("overview");

  // Sync selectedOrder with incoming updates from parent orders prop (e.g. status changes by driver)
  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((o) => o.id === selectedOrder.id);
    if (fresh && fresh.status !== selectedOrder.status) {
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

  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingProgress, setTrackingProgress] = useState(0); // 0 to 4 steps

  useEffect(() => {
    if (!chatModalVisible || !selectedOrder) return;
    const chatKey = `${selectedOrder.id}-${chatTarget}`;
    const loadChat = async () => {
      const result = await getChatMessages(selectedOrder.id, chatTarget, "owner");
      if (result.success && Array.isArray(result.data)) {
        setChatMessages((previous) => ({
          ...previous,
          [chatKey]: result.data.map((message: any) => ({
            sender: message.sender,
            text: message.text,
            time: new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            attachment: message.attachment,
          })),
        }));
      }
    };
    void loadChat();
    const interval = setInterval(() => void loadChat(), 3000);
    return () => clearInterval(interval);
  }, [chatModalVisible, chatTarget, selectedOrder]);

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

  const statuses = ["Semua", "Menunggu", "Diproses", "Siap", "Diambil", "Selesai", "Dibatalkan"];

  // Filter orders based on search and status tab
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      selectedStatus === "Semua" ||
      (selectedStatus === "Siap" && ["Siap", "Menuju Pickup", "Sampai Pickup"].includes(order.status)) ||
      (selectedStatus === "Diantar" && ["Diambil", "Mengantar", "Dikirim"].includes(order.status)) ||
      order.status === selectedStatus;
    
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      order.id.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query) ||
      order.items.some((item) => item.name.toLowerCase().includes(query)) ||
      (order.driver && order.driver.name.toLowerCase().includes(query));
      
    return matchesStatus && matchesSearch;
  });

  const newOrdersCount = orders.filter((o) => o.status === "Menunggu").length;

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
      case "Diproses": return "Sedang Dikemas";
      case "Siap": return "Siap Diambil Kurir";
      case "Menuju Pickup": return "Kurir Menuju Toko";
      case "Sampai Pickup": return "Kurir Tiba di Toko";
      case "Diambil":
      case "Mengantar":
      case "Dikirim": return "Kurir OTW Customer";
      case "Selesai": return "Pesanan Selesai";
      case "Dibatalkan": return "Dibatalkan";
      default: return status;
    }
  };

  // Status transitions
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderData["status"]) => {
    if (onStatusChange && !(await onStatusChange(orderId, nextStatus))) return;
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        let driver = o.driver;
        if (nextStatus === "Siap" && driver) {
          driver.stage = "Pesanan siap, menunggu kurir penjemput";
          driver.eta = "1 menit";
        } else if (nextStatus === "Menuju Pickup" && driver) {
          driver.stage = "Kurir sedang menuju ke toko Anda";
          driver.eta = "5 menit";
        } else if (nextStatus === "Sampai Pickup" && driver) {
          driver.stage = "Kurir telah tiba di outlet toko";
          driver.eta = "Sudah di lokasi";
        } else if ((nextStatus === "Diambil" || nextStatus === "Mengantar") && driver) {
          driver.stage = "Kurir sedang mengantar pesanan ke customer";
          driver.distance = "2.4 km";
          driver.eta = "7 menit";
        } else if (nextStatus === "Selesai" && driver) {
          driver.stage = "Pesanan selesai diantar";
          driver.distance = "0 km";
          driver.eta = "Selesai";
        }

        const newOrder = { ...o, status: nextStatus, driver };
        // Sync selectedOrder if it is currently open in detail modal
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(newOrder);
        }
        return newOrder;
      }
      return o;
    });

    setOrders(updated);
    Alert.alert("Status Diperbarui", `Pesanan kini: ${getStatusLabel(nextStatus)}`);
  };

  // Open Chat
  const openChat = (order: OrderData, target: "customer" | "driver") => {
    setSelectedOrder(order);
    setChatTarget(target);
    
    // Clear unread messages count locally
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

    const chatKey = `${order.id}-${target}`;
    void getChatMessages(order.id, target, "owner").then((result) => {
      if (result.success && Array.isArray(result.data)) {
        setChatMessages((previous) => ({
          ...previous,
          [chatKey]: result.data.map((message: any) => ({
            sender: message.sender,
            text: message.text,
            time: new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            attachment: message.attachment,
          })),
        }));
      }
    });

    setChatModalVisible(true);
  };

  // Send message in chat
  const handleSendMessage = async () => {
    const text = typedMessage.trim();
    if (!text && !selectedAttachment) return;
    if (!selectedOrder) return;

    const chatKey = `${selectedOrder.id}-${chatTarget}`;
    const newMsg = {
      sender: "owner",
      text: text || (selectedAttachment?.type === "image" ? "📷 Foto terkirim" : "📎 File terlampir"),
      time: "Baru saja",
      attachment: selectedAttachment ? { ...selectedAttachment } : undefined,
    };

    const currentMsgs = chatMessages[chatKey] || [];
    const updatedMsgs = [...currentMsgs, newMsg];
    setChatMessages({ ...chatMessages, [chatKey]: updatedMsgs });
    setTypedMessage("");
    const attachmentToSend = selectedAttachment;
    setSelectedAttachment(null);

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
      return;
    }
  };

  // Open Tracking
  const openTracking = (order: OrderData) => {
    setSelectedOrder(order);
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

              {/* Attachment Preview Bar */}
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
              <SafeAreaView style={styles.imageViewerHeader}>
                <Text style={styles.imageViewerTitle}>Pratinjau Foto Lampiran</Text>
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
      </>
    );
  };

  // If an order is selected, render the FULL PAGE View (no popups!)
  if (selectedOrder) {
    return (
      <SafeAreaView style={styles.fullPageContainer}>
        {/* Sticky Header */}
        <View style={styles.fullPageHeader}>
          <TouchableOpacity
            style={styles.fullPageBackBtn}
            onPress={() => setSelectedOrder(null)}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#111827" />
            <Text style={styles.fullPageBackText}>Daftar Order</Text>
          </TouchableOpacity>
          <View style={styles.fullPageHeaderRight}>
            <Text style={styles.fullPageOrderCode}>#{selectedOrder.id.slice(-8)}</Text>
            <View style={[styles.statusChip, { backgroundColor: getStatusBgColor(selectedOrder.status) }]}>
              <Text style={[styles.statusChipText, { color: getStatusColor(selectedOrder.status) }]}>
                {getStatusLabel(selectedOrder.status)}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.fullPageScroll}
          contentContainerStyle={styles.fullPageScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Animated Preparation & Stepper Section */}
          {/* 1. Sleek Status & Progress Tracker */}
          <View style={styles.statusHeroCard}>
            <View style={styles.statusHeroTopRow}>
              <View style={[styles.statusHeroIconBg, { backgroundColor: getStatusBgColor(selectedOrder.status) }]}>
                {selectedOrder.status === "Menunggu" ? (
                  <Clock size={20} color={getStatusColor(selectedOrder.status)} />
                ) : selectedOrder.status === "Diproses" ? (
                  <Package size={20} color={getStatusColor(selectedOrder.status)} />
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
                    ? "Pesanan baru menunggu konfirmasi toko"
                    : selectedOrder.status === "Diproses"
                    ? "Toko sedang mengemas dan menyiapkan produk"
                    : selectedOrder.status === "Siap"
                    ? (selectedOrder.driver ? "Paket siap, menunggu kurir penjemput" : "Paket dikemas rapi, segera tugaskan kurir")
                    : selectedOrder.status === "Menuju Pickup"
                    ? "Kurir sedang dalam perjalanan menuju toko Anda"
                    : selectedOrder.status === "Sampai Pickup"
                    ? "Kurir telah tiba di toko untuk mengambil paket"
                    : selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim"
                    ? "Kurir sedang dalam perjalanan mengantarkan ke customer"
                    : selectedOrder.status === "Selesai"
                    ? "Pesanan telah berhasil diterima oleh pemesan"
                    : "Pesanan telah dibatalkan"}
                </Text>
              </View>
            </View>

            {/* Simple Elegant 5-Step Horizontal Indicator */}
            {selectedOrder.status !== "Dibatalkan" && (
              <View style={styles.stepperContainer}>
                {(() => {
                  const steps = [
                    { key: "Menunggu", label: "Diterima" },
                    { key: "Diproses", label: "Dikemas" },
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
                    Pilih kurir GEOVERSE yang tersedia di sekitar toko Anda
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
                              rating: 5,
                              stage: "Driver menuju outlet penjemputan",
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

          {/* 2. Interactive Animated Google Maps Tracking */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionIconBg}>
                <Compass size={18} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionCardTitle}>Peta Pelacakan Real-Time</Text>
                <Text style={styles.sectionCardSubtitle}>
                  {selectedOrder.status === "Menuju Pickup"
                    ? "Kurir sedang dalam perjalanan menuju outlet toko Anda"
                    : selectedOrder.status === "Sampai Pickup"
                    ? "Kurir telah tiba di outlet toko Anda untuk penjemputan"
                    : selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim"
                    ? "Kurir sedang mengantar pesanan langsung ke customer"
                    : selectedOrder.status === "Siap"
                    ? (selectedOrder.driver ? "Kurir ditugaskan, bersiap menuju toko" : "Pesanan dikemas rapi, menunggu penugasan kurir")
                    : "Pantau rute penjemputan toko dan pengantaran ke customer."}
                </Text>
              </View>
            </View>

            {/* Segmented Mode Switcher: Kurir ke Toko vs Kurir ke Customer vs Semua */}
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
                  Rute ke Toko
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
                        ? "KURIR MENUJU TOKO (OTW)"
                        : selectedOrder.status === "Sampai Pickup"
                        ? "KURIR TIBA DI TOKO"
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
                storeName={selectedOrder.storeName || "Toko Marketplace Saya"}
                storeAddress={selectedOrder.storeAddress || "Toko Marketplace, Bangkalan"}
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
                <Text style={styles.detailCardName}>{selectedOrder.customer}</Text>
                <Text style={styles.detailCardSub}>{selectedOrder.customerPhone}</Text>
                <View style={styles.addressRow}>
                  <MapPin size={13} color="#6B7280" />
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
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{rp(item.price * item.quantity)}</Text>
                </View>
              ))}
              <View style={styles.detailDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceVal}>{rp(selectedOrder.subtotal)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Biaya Ongkir (Delivery)</Text>
                <Text style={styles.priceVal}>{rp(selectedOrder.deliveryFee)}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.emphasizedText]}>Total Pembayaran</Text>
                <Text style={[styles.priceVal, styles.emphasizedTextPrimary]}>{rp(selectedOrder.total)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.stickyActionFooter}>
          {selectedOrder.status === "Menunggu" && (
            <View style={styles.dualActionsRow}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnOutline, { borderColor: "#FEE2E2" }]}
                onPress={() => handleUpdateStatus(selectedOrder.id, "Dibatalkan")}
                activeOpacity={0.8}
              >
                <Text style={[styles.sheetBtnTextOutline, { color: "#B91C1C" }]}>Tolak Pesanan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#15803D" }]}
                onPress={() => handleUpdateStatus(selectedOrder.id, "Diproses")}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetBtnTextSolid}>Terima & Kemas Produk</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedOrder.status === "Diproses" && (
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#D97706" }]}
              onPress={() => handleUpdateStatus(selectedOrder.id, "Siap")}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetBtnTextSolid}>Tandai Siap & Panggil Kurir</Text>
            </TouchableOpacity>
          )}

          {selectedOrder.status === "Siap" && !selectedOrder.driver && (
            <View style={styles.driverWaitingBanner}>
              <Clock size={16} color="#7E22CE" />
              <Text style={styles.driverWaitingText}>
                Pesanan dikemas rapi. Tugaskan salah satu kurir di atas.
              </Text>
            </View>
          )}

          {selectedOrder.status === "Siap" && selectedOrder.driver && (
            <View style={styles.dualActionsRow}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnOutline]}
                onPress={() => openChat(selectedOrder, "driver")}
                activeOpacity={0.8}
              >
                <MessageSquare size={16} color="#15803D" />
                <Text style={styles.sheetBtnTextOutline}>Chat Kurir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#0D7A53" }]}
                onPress={() => handleUpdateStatus(selectedOrder.id, "Menuju Pickup")}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetBtnTextSolid}>Kurir Menuju Toko</Text>
              </TouchableOpacity>
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
                <Text style={styles.sheetBtnTextOutline}>Chat Kurir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#2563EB" }]}
                onPress={() => handleUpdateStatus(selectedOrder.id, "Sampai Pickup")}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetBtnTextSolid}>Kurir Tiba di Toko</Text>
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
              <Text style={styles.sheetBtnTextSolid}>Serahkan Pesanan ke Kurir (Mulai Antar)</Text>
            </TouchableOpacity>
          )}

          {(selectedOrder.status === "Mengantar" || selectedOrder.status === "Diambil" || selectedOrder.status === "Dikirim") && (
            <View style={styles.dualActionsRow}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnOutline]}
                onPress={() => openChat(selectedOrder, "driver")}
                activeOpacity={0.8}
              >
                <Truck size={16} color="#0891B2" />
                <Text style={[styles.sheetBtnTextOutline, { color: "#0891B2" }]}>Chat Kurir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnSolid, { backgroundColor: "#0891B2" }]}
                onPress={() => handleUpdateStatus(selectedOrder.id, "Selesai")}
                activeOpacity={0.85}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.sheetBtnTextSolid}>Selesaikan Pesanan</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedOrder.status === "Selesai" && (
            <View style={styles.completedBadgeBtn}>
              <CheckCircle size={18} color="#1B7A4E" />
              <Text style={styles.completedBadgeBtnText}>Pesanan Telah Selesai</Text>
            </View>
          )}

          {selectedOrder.status === "Dibatalkan" && (
            <View style={[styles.completedBadgeBtn, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <X size={18} color="#B91C1C" />
              <Text style={[styles.completedBadgeBtnText, { color: "#B91C1C" }]}>Pesanan Dibatalkan</Text>
            </View>
          )}
        </View>

        {/* Chat Modal */}
        {renderChatModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pesanan Masuk</Text>
          <Text style={styles.subtitle}>Kelola persiapan sampai pesanan tiba di customer.</Text>
        </View>
        {newOrdersCount > 0 && (
          <View style={styles.newBadge}>
            <Bell size={12} color="#B45309" />
            <Text style={styles.newBadgeText}>{newOrdersCount} baru</Text>
          </View>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari order, customer, menu, driver..."
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Filter Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {[
            { key: "Semua", label: "Semua" },
            { key: "Menunggu", label: "Pesanan Masuk" },
            { key: "Diproses", label: "Dikemas" },
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

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const hasDriver = item.driver !== null;
          const isOngoing = item.status !== "Selesai" && item.status !== "Dibatalkan";
          const statusCol = getStatusColor(item.status);
          const statusBg = getStatusBgColor(item.status);

          const itemsSummary = item.items.map((i) => `${i.name} (${i.quantity}x)`).join(", ");

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
                    <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
                    <Text style={styles.cardDotSeparator}>•</Text>
                    <View style={styles.timeRow}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusChipText, { color: statusCol }]}>
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
                    <Text style={styles.customerName}>{item.customer}</Text>
                    <Text style={styles.customerPhoneSub}>{item.customerPhone}</Text>
                  </View>
                  {hasDriver && (
                    <View style={styles.driverAssignedTag}>
                      <Truck size={12} color="#15803D" />
                      <Text style={styles.driverAssignedTagText}>{item.driver?.name}</Text>
                    </View>
                  )}
                </View>

                {/* Items Summary */}
                <View style={styles.itemsSummaryWrap}>
                  <Text style={styles.itemsSummary} numberOfLines={2}>
                    {itemsSummary}
                  </Text>
                </View>

                {/* Total Price */}
                <View style={styles.cardTotalRow}>
                  <Text style={styles.totalPriceLabel}>Total Pesanan</Text>
                  <Text style={styles.totalPrice}>{rp(item.total)}</Text>
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
                  <Text style={styles.cardChatBtnText}>Chat</Text>
                  {item.unreadCustomerMessages > 0 && <View style={styles.unreadBadgeDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cardDetailBtn}
                  onPress={() => setSelectedOrder(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cardDetailBtnText}>Kelola & Lacak</Text>
                  <ChevronRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
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
    </SafeAreaView>
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
  },
  newBadgeText: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  avatarBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#1B7A4E",
    fontSize: 11,
    fontWeight: "800",
  },
  customerInfo: {
    flex: 1,
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
  },
  detailCardCol: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 8,
  },
  avatarBgLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
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
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  priceVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
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
    color: "#B45309",
    fontWeight: "600",
    marginTop: 2,
  },
  actionButtonsContainer: {
    marginTop: 18,
    marginBottom: 20,
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
    fontWeight: "700",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetBtnClose: {
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  sheetBtnCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Chat Modal Sheet styles
  chatSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    height: "85%",
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  chatListContent: {
    paddingVertical: 10,
    gap: 10,
  },
  chatBubbleContainer: {
    maxWidth: "80%",
    marginBottom: 6,
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
    marginTop: 3,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    gap: 8,
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
    backgroundColor: "#1B7A4E",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  // Map simulated styles
  trackingContainer: {
    gap: 16,
  },
  simulatedMap: {
    height: 180,
    backgroundColor: "#E5F2EB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1E7DD",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mapPinStore: {
    position: "absolute",
    left: "10%",
    top: "35%",
    backgroundColor: "#1B7A4E",
    padding: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinCust: {
    position: "absolute",
    right: "10%",
    top: "35%",
    backgroundColor: "#B91C1C",
    padding: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinDriver: {
    position: "absolute",
    top: "45%",
    backgroundColor: "#B45309",
    padding: 6,
    borderRadius: 12,
  },
  mapLabel: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 2,
  },
  mapRouteLine: {
    height: 4,
    backgroundColor: "#D1D5DB",
    width: "70%",
    position: "absolute",
    top: "50%",
    left: "15%",
  },
  mapRouteProgress: {
    height: "100%",
    backgroundColor: "#1B7A4E",
  },
  // Dialog confirmation box
  confirmBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "85%",
    maxWidth: 320,
    gap: 16,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  confirmBody: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  confirmValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  confirmDest: {
    fontSize: 11,
    color: "#6B7280",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancel: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  confirmBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  confirmBtnTextCancel: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  fullPageContainer: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  fullPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
  },
  fullPageOrderCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
  },
  fullPageScroll: {
    flex: 1,
  },
  fullPageScrollContent: {
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
  },
  addressText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
    lineHeight: 16,
  },
  cardActionsCol: {
    flexDirection: "column",
    gap: 8,
    marginLeft: 8,
  },
  itemsTable: {
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
  },
  statusHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusHeroIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    zIndex: 2,
    minWidth: 44,
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
});
