import React, { useState } from "react";
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
} from "lucide-react-native";
import { rp } from "../../utils/formatters";

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
}

interface OrderProps {
  orders: DriverOrder[];
  setOrders: (orders: DriverOrder[]) => void;
  balance: number;
  setBalance: (bal: number) => void;
  transactions: any[];
  setTransactions: (txs: any[]) => void;
  isOnline: boolean;
}

interface ChatMessage {
  sender: "driver" | "customer";
  text: string;
  time: string;
}

export const Order: React.FC<OrderProps> = ({
  orders,
  setOrders,
  balance,
  setBalance,
  transactions,
  setTransactions,
  isOnline,
}) => {
  const [activeTab, setActiveTab] = useState<"Masuk" | "Aktif" | "Selesai" | "Batal">("Masuk");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);
  
  // Chat simulator states
  const [typedMessage, setTypedMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    "ORD-201": [
      { sender: "customer", text: "Pak, tolong sesuai alamat ya. Rumah pagar hitam.", time: "11:05" },
    ],
  });

  const handleUpdateStatus = (orderId: string, nextStatus: DriverOrder["status"]) => {
    let alertMsg = "";
    let isFinished = false;
    let earnedAmount = 0;

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        earnedAmount = o.driverShare;
        if (nextStatus === "Menuju Pickup") {
          alertMsg = "Perjalanan menjemput pesanan dimulai.";
        } else if (nextStatus === "Sampai Pickup") {
          alertMsg = "Anda telah tiba di lokasi merchant/penjemputan.";
        } else if (nextStatus === "Mengantar") {
          alertMsg = "Pesanan diambil. Memulai pengantaran ke customer.";
        } else if (nextStatus === "Selesai") {
          alertMsg = `Pesanan selesai diantar. Pendapatan ${rp(o.driverShare)} masuk ke saldo Anda.`;
          isFinished = true;
        } else if (nextStatus === "Dibatalkan") {
          alertMsg = "Pesanan ditolak.";
        }
        return { ...o, status: nextStatus };
      }
      return o;
    });

    setOrders(updated);

    // Sync selected order in details modal
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus });
    }

    if (isFinished) {
      setBalance(balance + earnedAmount);
      // Log transaction mutasi
      const newTx = {
        id: `TX-${Date.now().toString().slice(-4)}`,
        type: "in" as const,
        title: `Penyelesaian ${orderId}`,
        description: "Pendapatan jasa kurir pengiriman",
        amount: earnedAmount,
        time: "Hari ini, Baru saja",
        status: "Sukses" as const,
      };
      setTransactions([newTx, ...transactions]);
    }

    Alert.alert("Status Diperbarui", alertMsg);
  };

  const handleAcceptOrder = (orderId: string) => {
    handleUpdateStatus(orderId, "Menuju Pickup");
  };

  const handleDeclineOrder = (orderId: string) => {
    handleUpdateStatus(orderId, "Dibatalkan");
  };

  // Open Chat Room
  const openChatRoom = (order: DriverOrder) => {
    setSelectedOrder(order);
    setChatModalVisible(true);
  };

  // Send message simulator
  const handleSendMessage = () => {
    if (typedMessage.trim() === "" || !selectedOrder) return;

    const chatKey = selectedOrder.id;
    const newMsg: ChatMessage = {
      sender: "driver",
      text: typedMessage.trim(),
      time: "Baru saja",
    };

    const currentHistory = chatMessages[chatKey] || [];
    const updatedHistory = [...currentHistory, newMsg];

    setChatMessages({
      ...chatMessages,
      [chatKey]: updatedHistory,
    });
    setTypedMessage("");

    // Simulate reply
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        sender: "customer",
        text: "Baik Pak, saya tunggu di depan teras ya.",
        time: "Baru saja",
      };
      setChatMessages((prev) => ({
        ...prev,
        [chatKey]: [...updatedHistory, replyMsg],
      }));
    }, 2000);
  };

  // Filters based on tab selection
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
      case "Selesai": return "#1B7A4E";
      default: return "#B91C1C";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "Menunggu": return "#FEF3C7";
      case "Menuju Pickup": return "#EFF6FF";
      case "Sampai Pickup": return "#F3E8FF";
      case "Mengantar": return "#ECFEFF";
      case "Selesai": return "#E8F5EE";
      default: return "#FEE2E2";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daftar Orderan</Text>
        <Text style={styles.subtitle}>Kelola pengantaran dan penerimaan order secara dinamis.</Text>
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
                  <View style={[styles.badge, { backgroundColor: getStatusBg(item.status) }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Service Tag */}
                <View style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{item.type} Delivery</Text>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>

                {/* Pickup & Destination Map Route representation */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <View style={styles.dotPickup} />
                    <Text style={styles.routeText} numberOfLines={1}>Pickup: {item.from}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeRow}>
                    <View style={styles.dotDest} />
                    <Text style={styles.routeText} numberOfLines={1}>Antar: {item.to}</Text>
                  </View>
                </View>

                {/* Price and distance info */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.distanceText}>{item.dist} · Pendapatan Bersih</Text>
                    <Text style={styles.earningsValue}>{rp(item.driverShare)}</Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              {/* Action Buttons at bottom of card */}
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
                    <Text style={styles.actionBtnTextSolid}>Terima Order</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isOngoing && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnOutline]}
                    onPress={() => openChatRoom(item)}
                  >
                    <MessageSquare size={14} color="#1B7A4E" />
                    <Text style={styles.actionBtnTextOutline}>Chat Customer</Text>
                  </TouchableOpacity>

                  {item.status === "Menuju Pickup" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSolid]}
                      onPress={() => handleUpdateStatus(item.id, "Sampai Pickup")}
                    >
                      <Text style={styles.actionBtnTextSolid}>Tiba di Pickup</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === "Sampai Pickup" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSolid]}
                      onPress={() => handleUpdateStatus(item.id, "Mengantar")}
                    >
                      <Text style={styles.actionBtnTextSolid}>Mulai Antar</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === "Mengantar" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSolid]}
                      onPress={() => handleUpdateStatus(item.id, "Selesai")}
                    >
                      <Text style={styles.actionBtnTextSolid}>Selesai Antar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {activeTab === "Masuk" && !isOnline 
                ? "Aktifkan status ONLINE untuk menerima orderan" 
                : "Tidak ada orderan dengan status ini"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "Masuk" && !isOnline 
                ? "Silakan nyalakan switch online di tab Beranda." 
                : "Orderan baru akan langsung muncul ketika tersedia."}
            </Text>
          </View>
        }
      />

      {/* 1. Modal Detail Order */}
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
                <View style={styles.detailHeaderRow}>
                  <Text style={styles.detailTime}>Dibuat {selectedOrder.time}</Text>
                  <View style={[styles.badge, { backgroundColor: getStatusBg(selectedOrder.status) }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(selectedOrder.status) }]}>
                      {selectedOrder.status}
                    </Text>
                  </View>
                </View>

                {/* Customer card */}
                <Text style={styles.detailSecTitle}>Customer</Text>
                <View style={styles.customerDetailCard}>
                  <View style={styles.avatarBgLarge}>
                    <Text style={styles.avatarTextLarge}>{selectedOrder.customer.substring(0, 1)}</Text>
                  </View>
                  <View style={styles.customerDetailCardBody}>
                    <Text style={styles.customerDetailCardName}>{selectedOrder.customer}</Text>
                    <Text style={styles.customerDetailCardSub}>{selectedOrder.phone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.chatIconBtn}
                    onPress={() => {
                      setDetailModalVisible(false);
                      openChatRoom(selectedOrder);
                    }}
                  >
                    <MessageSquare size={16} color="#1B7A4E" />
                  </TouchableOpacity>
                </View>

                {/* Route Information */}
                <Text style={styles.detailSecTitle}>Rute Perjalanan</Text>
                <View style={styles.routeDetailCard}>
                  <View style={styles.routeDetailItem}>
                    <View style={[styles.indicatorIconBg, { backgroundColor: "#E8F5EE" }]}>
                      <MapPin size={16} color="#1B7A4E" />
                    </View>
                    <View style={styles.routeDetailTextCol}>
                      <Text style={styles.routeDetailLabel}>LOKASI PENJEMPUTAN (PICKUP)</Text>
                      <Text style={styles.routeDetailVal}>{selectedOrder.from}</Text>
                    </View>
                  </View>

                  <View style={styles.routeDetailDivider} />

                  <View style={styles.routeDetailItem}>
                    <View style={[styles.indicatorIconBg, { backgroundColor: "#FFF3E0" }]}>
                      <Navigation size={16} color="#D97706" />
                    </View>
                    <View style={styles.routeDetailTextCol}>
                      <Text style={styles.routeDetailLabel}>LOKASI PENGANTARAN (TUJUAN)</Text>
                      <Text style={styles.routeDetailVal}>{selectedOrder.to}</Text>
                    </View>
                  </View>
                </View>

                {/* Price breakdown */}
                <Text style={styles.detailSecTitle}>Rincian Tarif</Text>
                <View style={styles.routeDetailCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Total Biaya Layanan</Text>
                    <Text style={styles.priceVal}>{rp(selectedOrder.pay)}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Komisi Platform (0%)</Text>
                    <Text style={styles.priceVal}>Rp0</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, styles.emphasizedText]}>Pendapatan Bersih Driver</Text>
                    <Text style={[styles.priceVal, styles.emphasizedTextPrimary]}>
                      {rp(selectedOrder.driverShare)}
                    </Text>
                  </View>
                </View>

                {/* Progress status update CTAs */}
                <View style={styles.detailActionsRow}>
                  {selectedOrder.status === "Menunggu" && isOnline && (
                    <View style={styles.dualActionsRow}>
                      <TouchableOpacity 
                        style={[styles.sheetBtn, styles.sheetBtnOutline, { borderColor: "#FEE2E2" }]}
                        onPress={() => handleDeclineOrder(selectedOrder.id)}
                      >
                        <Text style={[styles.sheetBtnTextOutline, { color: "#B91C1C" }]}>Tolak</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.sheetBtn, styles.sheetBtnSolid]}
                        onPress={() => handleAcceptOrder(selectedOrder.id)}
                      >
                        <Text style={styles.sheetBtnTextSolid}>Terima Order</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedOrder.status === "Menuju Pickup" && (
                    <TouchableOpacity 
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { width: "100%" }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Sampai Pickup")}
                    >
                      <Text style={styles.sheetBtnTextSolid}>Tiba di Lokasi Pickup</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder.status === "Sampai Pickup" && (
                    <TouchableOpacity 
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { width: "100%" }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Mengantar")}
                    >
                      <Text style={styles.sheetBtnTextSolid}>Mulai Mengantar</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder.status === "Mengantar" && (
                    <TouchableOpacity 
                      style={[styles.sheetBtn, styles.sheetBtnSolid, { width: "100%" }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, "Selesai")}
                    >
                      <Text style={styles.sheetBtnTextSolid}>Selesaikan Pengantaran</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. Chat Modal */}
      {selectedOrder && (
        <Modal visible={chatModalVisible} transparent animationType="slide">
          <View style={styles.modalBgBottom}>
            <View style={styles.chatSheetContainer}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Chat: {selectedOrder.customer}</Text>
                  <Text style={styles.chatHeaderSubtitle}>Order #{selectedOrder.id}</Text>
                </View>
                <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                  <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Chat Message List */}
              <FlatList
                data={chatMessages[selectedOrder.id] || []}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.chatListContent}
                renderItem={({ item }) => {
                  const isDriver = item.sender === "driver";
                  return (
                    <View style={[styles.chatBubbleContainer, isDriver ? styles.chatBubbleRight : styles.chatBubbleLeft]}>
                      <View style={[styles.chatBubble, isDriver ? styles.chatBubbleDriver : styles.chatBubbleCust]}>
                        <Text style={[styles.chatText, isDriver ? styles.chatTextDriver : styles.chatTextCust]}>
                          {item.text}
                        </Text>
                      </View>
                      <Text style={styles.chatTime}>{item.time}</Text>
                    </View>
                  );
                }}
              />

              {/* Input field */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={typedMessage}
                  onChangeText={setTypedMessage}
                  placeholder="Ketik pesan..."
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                  <Send size={16} color="#FFFFFF" />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
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
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginVertical: 12,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  tabBtnUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  tabBtnTextSelected: {
    color: "#FFFFFF",
  },
  tabBtnTextUnselected: {
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
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
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  serviceTag: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  serviceTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  routeContainer: {
    marginTop: 12,
    gap: 4,
    position: "relative",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1B7A4E",
  },
  dotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
  },
  routeLine: {
    width: 1.5,
    height: 12,
    backgroundColor: "#E5E7EB",
    marginLeft: 3,
  },
  routeText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  distanceText: {
    fontSize: 11,
    color: "#6B7280",
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1B7A4E",
    marginTop: 2,
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
    flexDirection: "row",
    gap: 6,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: "#1B7A4E",
    backgroundColor: "#FFFFFF",
  },
  actionBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  actionBtnTextOutline: {
    color: "#1B7A4E",
    fontSize: 12,
    fontWeight: "800",
  },
  actionBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 54,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 28,
  },
  // Modal details
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
    marginBottom: 12,
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
  customerDetailCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 18,
    fontWeight: "900",
  },
  customerDetailCardBody: {
    flex: 1,
    marginLeft: 12,
  },
  customerDetailCardName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  customerDetailCardSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  chatIconBtn: {
    backgroundColor: "#E8F5EE",
    padding: 10,
    borderRadius: 12,
  },
  routeDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 8,
  },
  routeDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indicatorIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  routeDetailTextCol: {
    flex: 1,
    gap: 2,
  },
  routeDetailLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  routeDetailVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  routeDetailDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
    marginLeft: 48,
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
  detailDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  emphasizedText: {
    fontWeight: "800",
    color: "#111827",
  },
  emphasizedTextPrimary: {
    fontWeight: "900",
    color: "#1B7A4E",
    fontSize: 15,
  },
  detailActionsRow: {
    marginTop: 18,
    marginBottom: 8,
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
  // Chat styles
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
  chatBubbleDriver: {
    backgroundColor: "#1B7A4E",
    borderBottomRightRadius: 4,
  },
  chatBubbleCust: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatTextDriver: {
    color: "#FFFFFF",
  },
  chatTextCust: {
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
});
