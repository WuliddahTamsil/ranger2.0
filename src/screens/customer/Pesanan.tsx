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
  TextInput,
  Alert,
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
} from "lucide-react-native";
import { OrderItem } from "../../types";
import { rp } from "../../utils/formatters";
import { CustomerChatModal } from "./CustomerChatModal";
import { AuthAccount } from "../auth/authTypes";
import { LiveOrderTrackingMap } from "../../components/LiveOrderTrackingMap";
import { FormalInvoiceModal, InvoiceData, InvoiceItemDetail } from "../../components/FormalInvoiceModal";

interface PesananProps {
  orders: OrderItem[];
  setOrders: (orders: OrderItem[]) => void;
  reviews: any[];
  setReviews: (reviews: any[]) => void;
  authAccount?: AuthAccount | null;
}

export const Pesanan: React.FC<PesananProps> = ({
  orders,
  setOrders,
  reviews,
  setReviews,
  authAccount,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [chatTarget, setChatTarget] = useState<{ orderId: string; participantName: string; participantType: "driver" | "merchant" } | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  // Review states
  const [ratingVal, setRatingVal] = useState(5);
  const [commentText, setCommentText] = useState("");

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
    } else {
      return { icon: Truck, fg: "#D97706", bg: "#FEF3C7" };
    }
  };

  const getStatusColors = (status: string) => {
    const s = status.toLowerCase();
    if (s === "dikirim") {
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
    setReviewModalVisible(true);
  };

  const handleSaveReview = () => {
    if (!selectedOrder) return;

    const newReview = {
      id: `REV-${Date.now().toString().slice(-4)}`,
      orderId: selectedOrder.id,
      rating: ratingVal,
      comment: commentText.trim(),
    };

    setReviews([newReview, ...reviews]);
    setReviewModalVisible(false);
    Alert.alert("Terima Kasih", "Ulasan Anda berhasil disimpan.");
  };

  const handleOpenTracking = (order: OrderItem) => {
    setSelectedOrder(order);
    setTrackModalVisible(true);
  };

  const handleOpenChat = (order: OrderItem, targetType: "driver" | "merchant" = "merchant") => {
    const normalizedType = order.type.toLowerCase();
    const isLaundryDriver = normalizedType.includes("laund") && order.status.toLowerCase().includes("kirim");
    const resolvedType = targetType === "driver" || isLaundryDriver ? "driver" : "merchant";
    
    let participantName = "";
    if (resolvedType === "driver") {
      participantName = (order as any).driverName
        ? `${(order as any).driverName} (Kurir)`
        : "Kurir GEOVERSE";
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
          name: order.item || "Pesanan GEOVERSE",
          quantity: qty,
          price: itemPrice > 0 ? itemPrice : order.total,
          total: itemPrice > 0 ? itemPrice * qty : order.total,
        },
      ];
    }

    const customerAddressStr = typeof order.address === "string"
      ? order.address
      : order.address?.fullAddress || "Area Kampus UTM Kamal, Bangkalan";

    const isCanceled = order.status.toLowerCase().includes("batal");

    const invoiceData: InvoiceData = {
      id: order.id,
      invoiceNumber: `INV/20260909/GEO-${formattedId}`,
      date: order.date || "09 Sep 2026",
      time: raw.time || "14:45 WIB",
      status: order.status,
      orderType: order.type,
      storeName: raw.storeName || raw.store || (order.type.toLowerCase().includes("cater") ? "Dapur Barokah Catering" : "Mitra Toko GEOVERSE"),
      storeAddress: raw.storeAddress || "Jl. Raya Telang No. 45, Kamal, Bangkalan",
      customerName: authAccount?.name || raw.customer || "Customer GEOVERSE",
      customerPhone: authAccount?.phone || raw.customerPhone || "0812-3456-7890",
      customerAddress: customerAddressStr,
      driverName: raw.driverName || (raw.driver?.name ? raw.driver.name : "Wuwu (Kurir GEOVERSE)"),
      driverVehicle: raw.driverVehicle || (raw.driver?.vehicle ? raw.driver.vehicle : "Motor"),
      driverPlate: raw.driverPlate || (raw.driver?.plateNumber ? raw.driver.plateNumber : "M 4128 AA"),
      items: parsedItems,
      subtotal: raw.subtotal || (order.total - (order.deliveryFee || 5000) - (order.serviceFee || 1000) + (order.discount || 0)),
      deliveryFee: order.deliveryFee ?? 5000,
      serviceFee: order.serviceFee ?? 1000,
      discount: order.discount || 0,
      total: order.total,
      paymentMethod: order.paymentMethod || "QRIS / Transfer Bank BCA",
      paymentStatus: isCanceled ? "Dibatalkan" : "Lunas",
    };

    setSelectedInvoice(invoiceData);
    setInvoiceModalVisible(true);
  };

  const currentList = getFilteredOrders();

  return (
    <SafeAreaView style={styles.container}>
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
            (item as any).driverId ||
            ["Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim"].includes(item.status)
          );

          return (
            <TouchableOpacity
              style={styles.orderCard}
              activeOpacity={0.92}
              onPress={() => handleOpenInvoice(item)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.serviceIconBg, { backgroundColor: config.bg }]}>
                  <IconComp size={20} color={config.fg} />
                </View>

                <View style={styles.cardHeaderBody}>
                  <Text style={styles.orderTitle} numberOfLines={1}>
                    #{item.id} · {item.type}
                  </Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.item}
                  </Text>
                  <Text style={styles.itemDetail} numberOfLines={1}>
                    {item.detail}
                  </Text>
                </View>

                <View style={styles.cardHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.fg }]}>
                      {item.status}
                    </Text>
                  </View>
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

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutlineGray]}
                        onPress={() => handleOpenChat(item, "merchant")}
                      >
                        <Store size={13} color="#4B5563" />
                        <Text style={styles.actionBtnTextGray}>Chat Toko</Text>
                      </TouchableOpacity>

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

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutlineGray]}
                        onPress={() => handleOpenChat(item, "merchant")}
                      >
                        <Store size={13} color="#4B5563" />
                        <Text style={styles.actionBtnTextGray}>Chat Toko</Text>
                      </TouchableOpacity>
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

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnSolid]}
                        onPress={() => handleOpenTracking(item)}
                      >
                        <Navigation size={13} color="#FFFFFF" />
                        <Text style={styles.actionBtnTextSolid}>Lacak</Text>
                      </TouchableOpacity>
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
              {activeTab === 0 ? "Belum ada pesanan aktif" : activeTab === 1 ? "Belum ada pesanan selesai" : "Belum ada pesanan dibatalkan"}
            </Text>
            <Text style={styles.emptySubtitle}>
              Semua orderan dari layanan yang Anda pesan akan terpantau statusnya di halaman ini.
            </Text>
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
          <SafeAreaView style={styles.fullPageContainer}>
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
                  #{selectedOrder.id} • {selectedOrder.item}
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
                  storeName={selectedOrder.detail.split(" • ")[0] || "Mitra Toko"}
                  storeAddress={selectedOrder.address || "Kamal, Bangkalan, Madura"}
                  customerAddress={selectedOrder.address || "Telang, Kamal, Bangkalan"}
                  driverName={(selectedOrder as any).driverName}
                  driverVehicle={(selectedOrder as any).driverVehicle}
                  orderStatus={selectedOrder.status}
                  height={280}
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
                        {(selectedOrder as any).driverName || "Kurir GEOVERSE"}
                      </Text>
                      <View style={styles.driverRoleTag}>
                        <Text style={styles.driverRoleTagText}>Kurir</Text>
                      </View>
                    </View>
                    <Text style={styles.driverHighlightSub}>
                      {(selectedOrder as any).driverVehicle || "Honda Beat • M 4589 XZ"}
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
                <Text style={styles.timelineCardTitle}>Status Pengiriman Real-time</Text>

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
          </SafeAreaView>
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
          <SafeAreaView style={styles.fullPageContainer}>
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

              {/* Submit CTA */}
              <TouchableOpacity
                style={styles.submitReviewBtn}
                onPress={handleSaveReview}
                activeOpacity={0.8}
              >
                <Text style={styles.submitReviewBtnText}>Kirim Ulasan Sekarang</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
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
});
