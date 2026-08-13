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
} from "react-native";
import {
  Search,
  SlidersHorizontal,
  Bell,
  ShoppingBag,
  Clock,
  MessageSquare,
  Truck,
  MapPin,
  X,
  Send,
  User,
  Map,
  CheckCircle,
  AlertTriangle,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";

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
  status: "Menunggu" | "Diproses" | "Siap" | "Diambil" | "Selesai" | "Dibatalkan";
  driver: DriverProfile | null;
  unreadCustomerMessages: number;
  unreadDriverMessages: number;
}

interface OrderProps {
  orders: OrderData[];
  setOrders: (orders: OrderData[]) => void;
}

export const Order: React.FC<OrderProps> = ({ orders, setOrders }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  
  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatTarget, setChatTarget] = useState<"customer" | "driver">("customer");
  const [chatMessages, setChatMessages] = useState<{ [key: string]: { sender: string; text: string; time: string }[] }>({});
  const [typedMessage, setTypedMessage] = useState("");

  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingProgress, setTrackingProgress] = useState(0); // 0 to 4 steps

  const statuses = ["Semua", "Menunggu", "Diproses", "Siap", "Diambil", "Selesai", "Dibatalkan"];

  // Filter orders based on search and status tab
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === "Semua" || order.status === selectedStatus;
    
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
      case "Menunggu":
        return "#B45309"; // Amber
      case "Diproses":
        return "#1D4ED8"; // Blue
      case "Siap":
        return "#7E22CE"; // Purple
      case "Diambil":
        return "#0891B2"; // Cyan
      case "Selesai":
        return "#15803D"; // Green
      case "Dibatalkan":
        return "#B91C1C"; // Red
      default:
        return "#4B5563";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "Menunggu":
        return "#FEF3C7";
      case "Diproses":
        return "#DBEAFE";
      case "Siap":
        return "#F3E8FF";
      case "Diambil":
        return "#ECFEFF";
      case "Selesai":
        return "#DCFCE7";
      case "Dibatalkan":
        return "#FEE2E2";
      default:
        return "#F3F4F6";
    }
  };

  // Status transitions
  const handleUpdateStatus = (orderId: string, nextStatus: OrderData["status"]) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        let driver = o.driver;
        // Assign a mock driver once order goes to "Diproses" or "Siap"
        if (nextStatus === "Diproses" && !driver) {
          driver = {
            name: "Driver Rangers",
            vehicle: "Motor",
            plateNumber: "B 1234 XYZ",
            rating: 4.9,
            stage: "Driver menuju outlet",
            distance: "1,2 km",
            eta: "5 menit",
          };
        } else if (nextStatus === "Siap" && driver) {
          driver.stage = "Driver sampai di outlet, siap pick-up";
          driver.eta = "1 menit";
        } else if (nextStatus === "Diambil" && driver) {
          driver.stage = "Driver sedang mengantar pesanan";
          driver.distance = "2,5 km";
          driver.eta = "8 menit";
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
    Alert.alert("Status Diperbarui", `Pesanan kini berstatus: ${nextStatus}`);
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

    // Initialize mock messages if none exist
    const chatKey = `${order.id}-${target}`;
    if (!chatMessages[chatKey]) {
      const initialMsgs = target === "customer" 
        ? [
            { sender: "customer", text: "Halo, apakah pesanan saya sudah bisa dibuat?", time: "10:25" },
            { sender: "owner", text: "Halo kak, pesanan sedang kami proses ya. Mohon ditunggu.", time: "10:26" },
          ]
        : [
            { sender: "driver", text: "Saya sudah dekat outlet, mohon siapkan pesanannya ya pak.", time: "10:30" },
          ];
      setChatMessages({ ...chatMessages, [chatKey]: initialMsgs });
    }

    setChatModalVisible(true);
  };

  // Send message in chat
  const handleSendMessage = () => {
    if (typedMessage.trim() === "" || !selectedOrder) return;
    const chatKey = `${selectedOrder.id}-${chatTarget}`;
    const newMsg = {
      sender: "owner",
      text: typedMessage.trim(),
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    const currentMsgs = chatMessages[chatKey] || [];
    const updatedMsgs = [...currentMsgs, newMsg];

    setChatMessages({ ...chatMessages, [chatKey]: updatedMsgs });
    setTypedMessage("");

    // Simulate reply after 1.5 seconds
    setTimeout(() => {
      const reply = {
        sender: chatTarget,
        text: chatTarget === "customer" 
          ? "Baik terima kasih atas infonya ya, mohon dibantu kirim segera." 
          : "Siap pak, saya jalan setelah pesanan siap.",
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => ({
        ...prev,
        [chatKey]: [...updatedMsgs, reply],
      }));
    }, 1500);
  };

  // Open Tracking
  const openTracking = (order: OrderData) => {
    setSelectedOrder(order);
    
    // Set tracking stage depending on status
    if (order.status === "Diambil") {
      setTrackingProgress(2); // On the way
    } else if (order.status === "Siap") {
      setTrackingProgress(1); // Ready to pickup
    } else {
      setTrackingProgress(0); // Preparing
    }

    setTrackingModalVisible(true);
  };

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {statuses.map((status) => {
            const selected = selectedStatus === status;
            const count = status === "Semua" 
              ? orders.length 
              : orders.filter((o) => o.status === status).length;
              
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.tabChip,
                  selected ? styles.tabChipSelected : styles.tabChipUnselected,
                ]}
                onPress={() => setSelectedStatus(status)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    selected ? styles.tabChipTextSelected : styles.tabChipTextUnselected,
                  ]}
                >
                  {status} ({count})
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
                  setDetailModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                {/* ID & Status Row */}
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>#{item.id}</Text>
                  <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusChipText, { color: statusCol }]}>{item.status}</Text>
                  </View>
                </View>

                {/* Customer Row */}
                <View style={styles.customerRow}>
                  <View style={styles.avatarBg}>
                    <Text style={styles.avatarText}>{item.customer.substring(0, 1)}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.customer}</Text>
                  </View>
                  {hasDriver && <Truck size={16} color="#1B7A4E" />}
                </View>

                {/* Items Summary */}
                <Text style={styles.itemsSummary} numberOfLines={2}>
                  {itemsSummary}
                </Text>

                {/* Footer (Time & Total) */}
                <View style={styles.cardFooter}>
                  <View style={styles.timeRow}>
                    <Clock size={14} color="#9CA3AF" />
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <Text style={styles.totalPrice}>{rp(item.total)}</Text>
                </View>
              </TouchableOpacity>

              {/* Action Buttons Footer */}
              <View style={styles.cardDivider} />
              
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => openChat(item, "customer")}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionBtnInner}>
                    <MessageSquare size={14} color="#1B7A4E" />
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
                        <Truck size={14} color="#1B7A4E" />
                        <Text style={styles.actionBtnText}>Driver</Text>
                        {item.unreadDriverMessages > 0 && <View style={styles.unreadBadge} />}
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                {hasDriver && isOngoing && (
                  <>
                    <View style={styles.verticalDivider} />
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => openTracking(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionBtnInner}>
                        <Map size={14} color="#1B7A4E" />
                        <Text style={styles.actionBtnText}>Tracking</Text>
                      </View>
                    </TouchableOpacity>
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
                      { status: "Diambil", label: "Pesanan Diantar Kurir" },
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
                    <Text style={styles.mapLabel}>Outlet</Text>
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
});
