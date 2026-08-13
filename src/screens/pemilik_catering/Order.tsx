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
  CheckCircle,
  ChevronRight,
  Send,
  User,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";

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
  status: "Menunggu" | "Diproses" | "Siap" | "Diambil" | "Selesai" | "Dibatalkan";
  driver: DriverProfile | null;
  unreadCustomerMessages: number;
  unreadDriverMessages: number;
}

interface OrderProps {
  orders: OrderData[];
  setOrders: (orders: OrderData[]) => void;
}

interface ChatMessage {
  sender: "owner" | "other";
  text: string;
  time: string;
}

export const Order: React.FC<OrderProps> = ({ orders, setOrders }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sheet states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [chatTarget, setChatTarget] = useState<"customer" | "driver">("customer");
  const [typedMessage, setTypedMessage] = useState("");

  // Chat memory locally
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    "CAT-2408-customer": [
      { sender: "other", text: "Halo, apakah pesanan catering saya sudah diterima?", time: "10:25" },
    ],
    "CAT-2407-driver": [
      { sender: "other", text: "Saya sudah di dekat dapur catering, Bu. Sedang bersiap ambil box.", time: "09:49" },
    ],
  });

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

  // Handler update status pesanan
  const handleUpdateStatus = (
    orderId: string,
    nextStatus: "Menunggu" | "Diproses" | "Siap" | "Diambil" | "Selesai" | "Dibatalkan"
  ) => {
    let messageText = "";
    let driverData: DriverProfile | null = null;

    if (nextStatus === "Diproses") {
      messageText = "Pesanan catering diterima dan mulai dimasak.";
    } else if (nextStatus === "Siap") {
      messageText = "Pesanan selesai dimasak dan siap diantar.";
      driverData = {
        name: "Driver Rangers",
        vehicle: "Motor",
        plateNumber: "B 1234 XYZ",
        rating: 4.9,
        stage: "Driver menuju catering",
        distance: "1.2 km",
        eta: "5 mnt",
      };
    } else if (nextStatus === "Diambil") {
      messageText = "Pesanan diserahkan ke driver untuk pengiriman.";
      driverData = {
        name: "Driver Rangers",
        vehicle: "Motor",
        plateNumber: "B 1234 XYZ",
        rating: 4.9,
        stage: "Pesanan sedang dikirim",
        distance: "0.8 km",
        eta: "10 mnt",
      };
    } else if (nextStatus === "Selesai") {
      messageText = "Pesanan selesai diantar ke alamat customer.";
      driverData = {
        name: "Driver Rangers",
        vehicle: "Motor",
        plateNumber: "B 1234 XYZ",
        rating: 4.9,
        stage: "Pesanan selesai",
        distance: "0 km",
        eta: "-",
      };
    } else if (nextStatus === "Dibatalkan") {
      messageText = "Pesanan catering dibatalkan.";
    }

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: nextStatus,
          driver: driverData !== null ? driverData : o.driver,
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
        driver: driverData !== null ? driverData : selectedOrder.driver,
      });
    }

    Alert.alert("Sukses", messageText);
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
  const handleSendMessage = () => {
    if (typedMessage.trim() === "" || !selectedOrder) return;

    const chatKey = `${selectedOrder.id}-${chatTarget}`;
    const newMsg: ChatMessage = {
      sender: "owner",
      text: typedMessage.trim(),
      time: "Hari ini",
    };

    const currentHistory = chatMessages[chatKey] || [];
    const updatedHistory = [...currentHistory, newMsg];

    setChatMessages({
      ...chatMessages,
      [chatKey]: updatedHistory,
    });
    setTypedMessage("");

    // Simulator Auto Reply
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        sender: "other",
        text: 
          chatTarget === "customer" 
            ? "Baik, terima kasih atas infonya. Saya tunggu kiriman cateringnya ya." 
            : "Siap, Bu. Saya segera meluncur ke lokasi.",
        time: "Baru saja",
      };
      setChatMessages((prev) => ({
        ...prev,
        [chatKey]: [...updatedHistory, replyMsg],
      }));
    }, 2500);
  };

  // Open Tracking map
  const openTracking = (order: OrderData) => {
    if (!order.driver) {
      Alert.alert("Info", "Peta tracking tersedia setelah driver dialokasikan.");
      return;
    }
    setSelectedOrder(order);
    setTrackingModalVisible(true);
  };

  // Status colors helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Menunggu": return "#D97706";
      case "Diproses": return "#2563EB";
      case "Siap": return "#7E22CE";
      case "Diambil": return "#0891B2";
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
      case "Diambil": return "#ECFEFF";
      case "Selesai": return "#E8F5EE";
      case "Dibatalkan": return "#FEE2E2";
      default: return "#F3F4F6";
    }
  };

  // Filters
  const query = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === "Semua" || order.status === selectedStatus;
    const matchesSearch =
      query === "" ||
      order.id.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query) ||
      order.items.some((item) => item.name.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const countNewOrders = orders.filter((o) => o.status === "Menunggu").length;

  return (
    <SafeAreaView style={styles.container}>
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
          {["Semua", "Menunggu", "Diproses", "Siap", "Diambil", "Selesai", "Dibatalkan"].map((status) => {
            const isSelected = selectedStatus === status;
            const count = status === "Semua"
              ? orders.length
              : orders.filter((o) => o.status === status).length;
            
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.tabChip,
                  isSelected ? styles.tabChipSelected : styles.tabChipUnselected,
                ]}
                onPress={() => setSelectedStatus(status)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    isSelected ? styles.tabChipTextSelected : styles.tabChipTextUnselected,
                  ]}
                >
                  {status} ({count})
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
                  setDetailModalVisible(true);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>#{item.id}</Text>
                  <View style={[styles.statusChip, { backgroundColor: getStatusBgColor(item.status) }]}>
                    <Text style={[styles.statusChipText, { color: getStatusColor(item.status) }]}>
                      {item.status}
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
                  </View>
                  {hasDriver && <Truck size={16} color="#1B7A4E" />}
                </View>

                <Text style={styles.itemsSummary} numberOfLines={2}>
                  {itemTextSummary}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.timeRow}>
                    <Clock size={13} color="#9CA3AF" />
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <Text style={styles.totalPrice}>{rp(item.total)}</Text>
                </View>
              </TouchableOpacity>

              {/* Bottom Quick Buttons */}
              <View style={styles.cardDivider} />
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openChat(item, "customer")}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionBtnInner}>
                    <MessageSquare size={13} color="#1B7A4E" />
                    <Text style={styles.actionBtnText}>Customer</Text>
                    {item.unreadCustomerMessages > 0 && <View style={styles.unreadBadge} />}
                  </View>
                </TouchableOpacity>

                {hasDriver && (
                  <>
                    <View style={styles.verticalDivider} />
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openChat(item, "driver")}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionBtnInner}>
                        <MessageSquare size={13} color="#1B7A4E" />
                        <Text style={styles.actionBtnText}>Driver</Text>
                        {item.unreadDriverMessages > 0 && <View style={styles.unreadBadge} />}
                      </View>
                    </TouchableOpacity>

                    {isOngoing && (
                      <>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => openTracking(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.actionBtnInner}>
                            <Map size={13} color="#1B7A4E" />
                            <Text style={styles.actionBtnText}>Tracking</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
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

      {/* 1. Modal Detail Pesanan */}
      {selectedOrder && (
        <Modal visible={detailModalVisible} transparent animationType="slide">
          <View style={styles.modalBgBottom}>
            <View style={styles.sheetContainer}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Order #{selectedOrder.id}</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                {/* Header detail info */}
                <View style={styles.detailHeaderRow}>
                  <View>
                    <Text style={styles.detailTime}>Dibuat hari ini, {selectedOrder.time}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: getStatusBgColor(selectedOrder.status) }]}>
                    <Text style={[styles.statusChipText, { color: getStatusColor(selectedOrder.status) }]}>
                      {selectedOrder.status}
                    </Text>
                  </View>
                </View>

                {/* Customer card */}
                <Text style={styles.detailSecTitle}>Customer</Text>
                <View style={styles.detailCard}>
                  <View style={styles.avatarBgLarge}>
                    <Text style={styles.avatarTextLarge}>{selectedOrder.customer.substring(0, 1)}</Text>
                  </View>
                  <View style={styles.detailCardBody}>
                    <Text style={styles.detailCardName}>{selectedOrder.customer}</Text>
                    <Text style={styles.detailCardSub}>{selectedOrder.customerPhone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.chatIconBtn} 
                    onPress={() => {
                      setDetailModalVisible(false);
                      openChat(selectedOrder, "customer");
                    }}
                    activeOpacity={0.7}
                  >
                    <MessageSquare size={16} color="#1B7A4E" />
                  </TouchableOpacity>
                </View>

                {/* Order items list */}
                <Text style={styles.detailSecTitle}>Detail Pesanan</Text>
                <View style={styles.detailCardCol}>
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
                    <Text style={styles.priceLabel}>Delivery Fee</Text>
                    <Text style={styles.priceVal}>{rp(selectedOrder.deliveryFee)}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, styles.emphasizedText]}>Total</Text>
                    <Text style={[styles.priceVal, styles.emphasizedTextPrimary]}>{rp(selectedOrder.total)}</Text>
                  </View>
                </View>

                {/* Timeline */}
                <Text style={styles.detailSecTitle}>Perjalanan Order</Text>
                <View style={styles.detailCardCol}>
                  {(() => {
                    const stages = [
                      { status: "Menunggu", label: "Pesanan Diterima" },
                      { status: "Diproses", label: "Pesanan Sedang Dipersiapkan" },
                      { status: "Siap", label: "Pesanan Siap Diambil Driver" },
                      { status: "Diambil", label: "Pesanan Diantar ke Customer" },
                      { status: "Selesai", label: "Pesanan Selesai" },
                    ];

                    // Find index of current status
                    const currentIdx = stages.findIndex((s) => s.status === selectedOrder.status);
                    
                    return stages.map((stage, idx) => {
                      const isCompleted = currentIdx >= idx;
                      const isActive = currentIdx === idx;
                      const isCancelled = selectedOrder.status === "Dibatalkan" && idx > 0;

                      return (
                        <View key={idx} style={styles.timelineRow}>
                          <View style={styles.timelineIndicators}>
                            <View 
                              style={[
                                styles.timelineDot,
                                isCancelled 
                                  ? styles.timelineDotCancelled 
                                  : isCompleted 
                                    ? styles.timelineDotDone 
                                    : styles.timelineDotPending
                              ]}
                            >
                              {isCompleted && !isCancelled && <CheckCircle size={10} color="#FFFFFF" />}
                              {isCancelled && <X size={10} color="#FFFFFF" />}
                            </View>
                            {idx < stages.length - 1 && (
                              <View 
                                style={[
                                  styles.timelineLine,
                                  currentIdx > idx ? styles.timelineLineDone : styles.timelineLinePending
                                ]}
                              />
                            )}
                          </View>
                          <Text 
                            style={[
                              styles.timelineLabel, 
                              isActive ? styles.timelineLabelActive : styles.timelineLabelPendingText
                            ]}
                          >
                            {stage.label}
                          </Text>
                        </View>
                      );
                    });
                  })()}
                </View>

                {/* Driver card */}
                {selectedOrder.driver && (
                  <>
                    <Text style={styles.detailSecTitle}>Driver / Kurir</Text>
                    <View style={styles.detailCard}>
                      <View style={styles.avatarBgLarge}>
                        <Truck size={20} color="#1B7A4E" />
                      </View>
                      <View style={styles.detailCardBody}>
                        <Text style={styles.detailCardName}>{selectedOrder.driver.name}</Text>
                        <Text style={styles.detailCardSub}>
                          {selectedOrder.driver.plateNumber} · {selectedOrder.driver.vehicle}
                        </Text>
                        <Text style={styles.driverStage}>{selectedOrder.driver.stage}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.chatIconBtn}
                        onPress={() => {
                          setDetailModalVisible(false);
                          openChat(selectedOrder, "driver");
                        }}
                        activeOpacity={0.7}
                      >
                        <MessageSquare size={16} color="#1B7A4E" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Status action buttons */}
                <View style={styles.actionButtonsContainer}>
                  {selectedOrder.status === "Menunggu" && (
                    <View style={styles.dualActionsRow}>
                      <TouchableOpacity 
                        style={[styles.sheetBtn, styles.sheetBtnOutline, { borderColor: "#FEE2E2" }]}
                        onPress={() => handleUpdateStatus(selectedOrder.id, "Dibatalkan")}
                      >
                        <Text style={[styles.sheetBtnTextOutline, { color: "#B91C1C" }]}>Tolak</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.sheetBtn, styles.sheetBtnSolid]}
                        onPress={() => handleUpdateStatus(selectedOrder.id, "Diproses")}
                      >
                        <Text style={styles.sheetBtnTextSolid}>Terima Pesanan</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedOrder.status === "Diproses" && (
                    <TouchableOpacity 
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { width: "100%" }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Siap")}
                    >
                      <Text style={styles.sheetBtnTextSolid}>Tandai Siap Diambil</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder.status === "Siap" && (
                    <TouchableOpacity 
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { width: "100%", backgroundColor: "#7E22CE" }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Diambil")}
                    >
                      <Text style={styles.sheetBtnTextSolid}>Pick-up oleh Driver</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder.status === "Diambil" && (
                    <TouchableOpacity 
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { width: "100%", backgroundColor: "#0891B2" }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Selesai")}
                    >
                      <Text style={styles.sheetBtnTextSolid}>Selesaikan Pesanan</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. Modal Chat */}
      {selectedOrder && (
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
                  return (
                    <View style={[styles.chatBubbleContainer, isOwner ? styles.chatBubbleRight : styles.chatBubbleLeft]}>
                      <View style={[styles.chatBubble, isOwner ? styles.chatBubbleOwner : styles.chatBubbleClient]}>
                        <Text style={[styles.chatText, isOwner ? styles.chatTextOwner : styles.chatTextClient]}>
                          {item.text}
                        </Text>
                      </View>
                      <Text style={styles.chatTime}>{item.time}</Text>
                    </View>
                  );
                }}
              />

              {/* Chat Input Field */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={typedMessage}
                  onChangeText={setTypedMessage}
                  placeholder="Ketik pesan..."
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} activeOpacity={0.8}>
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 3. Modal Tracking Map */}
      {selectedOrder && (
        <Modal visible={trackingModalVisible} transparent animationType="slide">
          <View style={styles.modalBgBottom}>
            <View style={styles.sheetContainer}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Tracking Kurir</Text>
                <TouchableOpacity onPress={() => setTrackingModalVisible(false)}>
                  <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.trackingContainer}>
                {/* Simulated Map */}
                <View style={styles.simulatedMap}>
                  <View style={styles.mapPinStore}>
                    <ShoppingBag size={12} color="#FFFFFF" />
                    <Text style={styles.mapLabel}>Dapur</Text>
                  </View>
                  
                  {/* Moving Line */}
                  <View style={styles.mapRouteLine}>
                    <View 
                      style={[
                        styles.mapRouteProgress, 
                        { width: trackingProgress === 2 ? "50%" : trackingProgress >= 3 ? "100%" : "0%" }
                      ]} 
                    />
                  </View>
                  
                  {/* Driver moving pin */}
                  <View 
                    style={[
                      styles.mapPinDriver,
                      { left: trackingProgress === 1 ? "15%" : trackingProgress === 2 ? "50%" : trackingProgress >= 3 ? "85%" : "15%" }
                    ]}
                  >
                    <Truck size={12} color="#FFFFFF" />
                  </View>

                  <View style={styles.mapPinCust}>
                    <MapPin size={12} color="#FFFFFF" />
                    <Text style={styles.mapLabel}>Customer</Text>
                  </View>
                </View>

                {/* Driver information */}
                {selectedOrder.driver && (
                  <View style={styles.detailCard}>
                    <View style={styles.avatarBgLarge}>
                      <User size={20} color="#1B7A4E" />
                    </View>
                    <View style={styles.detailCardBody}>
                      <Text style={styles.detailCardName}>{selectedOrder.driver.name}</Text>
                      <Text style={styles.detailCardSub}>
                        {selectedOrder.driver.plateNumber} · Jarak: {selectedOrder.driver.distance}
                      </Text>
                      <Text style={[styles.driverStage, { color: "#1B7A4E", fontWeight: "700" }]}>
                        Estimasi tiba: {selectedOrder.driver.eta}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.sheetBtnClose}
                  onPress={() => setTrackingModalVisible(false)}
                >
                  <Text style={styles.sheetBtnCloseText}>Tutup Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    color: "#D97706",
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
});
