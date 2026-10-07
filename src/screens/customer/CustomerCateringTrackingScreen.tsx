import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  MapPin,
  Maximize2,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Truck,
  User,
  Wallet,
  Store,
  Phone,
  Bike,
  ChevronRight,
  QrCode,
  FileText,
  X,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { rp } from "../../utils/formatters";
import { isCateringPaymentFullyPaid } from "../../utils/cateringPayment";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { CustomerChatModal } from "./CustomerChatModal";
import { getCateringOrdersForCustomer } from "../../services/api";
import { subscribeCustomerOrders } from "./customerOrderStore";
import {
  setActiveCateringPaymentOrder,
  setActiveCateringTrackingOrderId,
  getActiveCateringTrackingOrderId,
} from "./customerCateringStore";
import { subscribeToUserRealtime } from "../../services/userRealtime";

interface CustomerCateringTrackingProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerCateringTrackingScreen: React.FC<CustomerCateringTrackingProps> = ({ navigate, authAccount }) => {
  const [order, setOrder] = useState<any>(null);
  const [allCateringOrders, setAllCateringOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const targetOrderId = useRef<string | null>(getActiveCateringTrackingOrderId() || null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<"driver" | "merchant">("driver");
  const [proofModalVisible, setProofModalVisible] = useState(false);

  const applyLiveOrder = (live: any) => {
    setOrder({
      id: live._id || live.id,
      orderCode: live.orderCode || (live._id ? `#RNG-CAT-${String(live._id).slice(-8).toUpperCase()}` : ""),
      status: live.status,
      item: live.menuName || "Menu Catering",
      detail: `${live.portions || 1} pax • ${live.storeName || "Catering Lokal"}`,
      total: live.totalAmount ?? 0,
      paidAmount: live.paidAmount ?? 0,
      remainingAmount: live.remainingAmount !== undefined ? live.remainingAmount : 0,
      cateringDate: live.cateringDate || "",
      cateringTime: live.cateringTime || "",
      address: live.address || "",
      driverId: live.driverId || "",
      driverName: live.driverName || "",
      driverPhone: live.driverPhone || "",
      driverVehicle: live.driverVehicle || "",
      deliveryProofUrl: live.deliveryProofUrl || "",
      deliveryProofTimestamp: live.deliveryProofTimestamp || "",
      deliveredAt: live.deliveredAt || null,
      storeName: live.storeName || "",
      storeAddress: live.storeAddress || "",
      paymentStatus: live.paymentStatus || "",
      paymentMethod: live.paymentMethod || "",
      paymentBankName: live.paymentBankName || "",
      paymentAccountNumber: live.paymentAccountNumber || "",
      paymentAccountHolder: live.paymentAccountHolder || "",
      paymentQrisImageUrl: live.paymentQrisImageUrl || "",
      paymentReminder: live.paymentReminder || "",
      notes: live.notes || "",
      portions: live.portions || 1,
      paymentOption: live.paymentOption || "",
      paymentDueAt: live.paymentDueAt || "",
      paymentHistory: live.paymentHistory || [],
    });
  };

  useEffect(() => subscribeCustomerOrders((orders) => {
    if (!targetOrderId.current) {
      const activeStored = getActiveCateringTrackingOrderId();
      if (activeStored) {
        targetOrderId.current = activeStored;
      } else {
        const latest = orders.find((item) => item.type.toLowerCase().includes("cater") && /^[a-f\d]{24}$/i.test(String(item.id)));
        if (latest) {
          targetOrderId.current = String(latest.id);
          setOrder(latest);
        }
      }
    }
  }), []);

  // Refresh order status at a bounded interval & socket realtime
  useEffect(() => {
    if (!authAccount?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    const fetchLive = async () => {
      try {
        const res = await getCateringOrdersForCustomer(authAccount.id);
        if (!active) return;
        if (!res.success) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        const rawOrders = Array.isArray(res.data) ? res.data : [];
        const sortedOrders = [...rawOrders].sort((a: any, b: any) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setAllCateringOrders(sortedOrders);

        const currentTargetId = targetOrderId.current || getActiveCateringTrackingOrderId();
        let live = currentTargetId
          ? sortedOrders.find((candidate: any) => String(candidate._id || candidate.id) === currentTargetId)
          : null;

        // Smart fallback: Jika order target saat ini belum ada bukti dan masih berstatus Siap/Menunggu tanpa kurir,
        // namun customer punya pesanan catering yang baru selesai dengan bukti foto pengantaran:
        if ((!live || (!live.deliveryProofUrl && ["Siap", "Menunggu"].includes(live.status) && !live.driverId)) && sortedOrders.length > 0) {
          const deliveredWithProof = sortedOrders.find((o: any) => Boolean(o.deliveryProofUrl) && o.status === "Selesai");
          if (deliveredWithProof && (!targetOrderId.current || !live?.driverId)) {
            live = deliveredWithProof;
          }
        }

        if (!live && sortedOrders.length > 0) {
          live = sortedOrders.find((o: any) => Boolean(o.deliveryProofUrl) && o.status === "Selesai")
            || sortedOrders.find((o: any) => ["Mengantar", "Diambil", "Sampai Pickup", "Menuju Pickup", "Siap"].includes(o.status))
            || sortedOrders[0];
        }

        if (live) {
          const liveId = String(live._id || live.id);
          targetOrderId.current = liveId;
          setActiveCateringTrackingOrderId(liveId);
          setLoadError(false);
          applyLiveOrder(live);
        }
        setLoading(false);
      } catch {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      }
    };
    void fetchLive();
    const interval = setInterval(() => void fetchLive(), 4000);

    let unsubscribeRealtime: () => void = () => undefined;
    void subscribeToUserRealtime(
      () => void fetchLive(),
      (updatedOrder) => {
        if (!active || !updatedOrder) return;
        const updatedId = String(updatedOrder._id || updatedOrder.id || "");
        if (updatedId) {
          if (!targetOrderId.current || targetOrderId.current === updatedId || updatedOrder.deliveryProofUrl) {
            targetOrderId.current = updatedId;
            setActiveCateringTrackingOrderId(updatedId);
          }
          void fetchLive();
        }
      }
    ).then((stop) => {
      if (active) unsubscribeRealtime = stop;
      else stop();
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeRealtime();
    };
  }, [authAccount?.id]);

  const remaining = order?.remainingAmount || 0;
  const currentStatus = order?.status || "Menunggu";

  // Dynamic status evaluation
  const isReceived = Boolean(order);
  const isCooking = ["Diproses", "Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(currentStatus);
  const isReady = ["Siap", "Menuju Pickup", "Sampai Pickup", "Diambil", "Mengantar", "Dikirim", "Selesai"].includes(currentStatus);
  const isDriverHeading = ["Menuju Pickup", "Sampai Pickup"].includes(currentStatus);
  const isDelivering = ["Diambil", "Mengantar", "Dikirim"].includes(currentStatus);
  const isFinished = currentStatus === "Selesai";
  const isCanceled = currentStatus === "Dibatalkan";
  const paidAmount = Number(order?.paidAmount || 0);
  const totalAmount = Number(order?.total || 0);
  const isPaymentComplete = isCateringPaymentFullyPaid(remaining, order?.paymentStatus, paidAmount, totalAmount);
  const paymentDueLabel = order?.paymentDueAt
    ? new Date(order.paymentDueAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : "H-1 sebelum pengiriman";
  const paymentMethodLabel = (value?: string) => {
    switch (value) {
      case "bank_transfer": return "Transfer Bank";
      case "bca_va": return "BCA Virtual Account";
      case "mandiri_va": return "Mandiri Virtual Account";
      case "qris": return "QRIS Instan";
      case "gopay": return "GoPay";
      case "dana": return "DANA";
      case "ovo": return "OVO";
      case "shopeepay": return "ShopeePay";
      case "bank_va": return "Bank VA";
      case "cod": return "COD (Bayar di Tempat)";
      case "cash": return "Tunai";
      default: return value || "Pembayaran";
    }
  };

  const verifiedPayments = (order?.paymentHistory || []).filter((item: any) => item.status === "TERVERIFIKASI");
  const latestVerifiedPayment = verifiedPayments[verifiedPayments.length - 1];

  const progress = [
    { title: "Pesanan tercatat", text: "Permintaan pesanan tersimpan dan menunggu proses mitra", icon: CheckCircle2, active: isReceived },
    { title: "Sedang disiapkan", text: "Mitra catering menyiapkan menu masakan", icon: Clock3, active: isCooking },
    {
      title: "Pesanan siap & kurir ditugaskan",
      text: isDriverHeading
        ? `Kurir (${order?.driverName || "Driver"}) sedang menuju dapur`
        : isReady
        ? (order?.driverName ? `Kurir: ${order.driverName} bersiap` : "Pesanan siap! Menugaskan kurir terdekat...")
        : "Menunggu dapur menyelesaikan masakan",
      icon: CalendarDays,
      active: isReady,
    },
    {
      title: "Diantar ke alamat tujuan",
      text: isDelivering
        ? `Kurir ${order?.driverName || "GEOVERSE"} sedang membawa pesanan ke lokasimu`
        : isFinished
        ? (order?.deliveryProofUrl
            ? `Pesanan telah diserahkan oleh ${order?.driverName || "Kurir"}. Bukti foto serah terima terlampir di atas.`
            : "Pesanan telah sampai di tujuan")
        : "Menunggu kurir mulai perjalanan",
      icon: Truck,
      active: isDelivering || isFinished,
    },
  ];

  const handleOpenDriverChat = () => {
    setChatRecipient("driver");
    setChatVisible(true);
  };

  const handleOpenMerchantChat = () => {
    setChatRecipient("merchant");
    setChatVisible(true);
  };

  if (loading && !order) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
        <View style={styles.emptyState}><ActivityIndicator size="large" color="#1B7A4E" /><Text style={styles.emptyStateText}>Memuat status pesanan…</Text></View>
      </ResponsiveSafeAreaView>
    );
  }

  if (!order) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{loadError ? "Status belum dapat dimuat" : "Belum ada pesanan Catering"}</Text>
          <Text style={styles.emptyStateText}>{loadError ? "Periksa koneksi lalu buka kembali halaman ini." : "Pesanan yang berhasil dibuat akan tampil di sini."}</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigate("c_catering")}><Text style={styles.emptyStateButtonText}>Lihat Catering</Text></TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  const otherOrderWithProof = allCateringOrders.find(
    (o) => String(o._id || o.id) !== String(order?.id || order?._id) && Boolean(o.deliveryProofUrl)
  );

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <BackHeader title="Lacak Catering" onBack={() => navigate("c_home")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Switcher Card (ketika customer memiliki lebih dari 1 pesanan catering) */}
        {allCateringOrders.length > 1 && (
          <View style={styles.orderSwitcherCard}>
            <View style={styles.orderSwitcherHeader}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.orderSwitcherTitle}>Daftar Pesanan Catering</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#166534" }}>
                  {allCateringOrders.length} Pesanan
                </Text>
              </View>
              <Text style={styles.orderSwitcherSub}>
                Ketuk kartu untuk beralih pesanan & memantau bukti pengantaran
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orderSwitcherRow}
            >
              {allCateringOrders.map((candidate: any) => {
                const cId = String(candidate._id || candidate.id);
                const isSelected = String(order?.id || order?._id) === cId;
                const hasProof = Boolean(candidate.deliveryProofUrl);
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.orderChip, isSelected && styles.orderChipActive]}
                    onPress={() => {
                      targetOrderId.current = cId;
                      setActiveCateringTrackingOrderId(cId);
                      applyLiveOrder(candidate);
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.orderChipDot,
                        {
                          backgroundColor: isSelected
                            ? "#16A34A"
                            : candidate.status === "Selesai"
                            ? "#22C55E"
                            : "#F59E0B",
                        },
                      ]}
                    />
                    <View style={styles.orderChipContent}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text
                          style={[
                            styles.orderChipCode,
                            isSelected && styles.orderChipCodeActive,
                          ]}
                        >
                          {candidate.orderCode || `#${cId.slice(-8).toUpperCase()}`}
                        </Text>
                        {hasProof && (
                          <View
                            style={{
                              backgroundColor: "#DCFCE7",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Camera size={10} color="#15803D" />
                            <Text style={{ fontSize: 9, fontWeight: "800", color: "#15803D" }}>
                              Bukti Foto
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.orderChipStatus,
                          isSelected && styles.orderChipStatusActive,
                        ]}
                      >
                        {candidate.status === "Selesai"
                          ? "Selesai Diantar"
                          : candidate.status === "Mengantar"
                          ? "Sedang Diantar"
                          : candidate.status === "Siap"
                          ? "Siap Diambil"
                          : candidate.status}
                        {" · "}
                        {candidate.menuName || candidate.item || "Menu"}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.orderChipBadgeActive}>
                        <Check size={9} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Banner pemberitahuan jika bukti foto ada di pesanan catering lainnya */}
        {otherOrderWithProof && !order?.deliveryProofUrl && (
          <TouchableOpacity
            style={styles.otherProofNoticeCard}
            onPress={() => {
              const id = String(otherOrderWithProof._id || otherOrderWithProof.id);
              targetOrderId.current = id;
              setActiveCateringTrackingOrderId(id);
              applyLiveOrder(otherOrderWithProof);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.otherProofNoticeLeft}>
              <View style={styles.otherProofIconWrap}>
                <Camera size={18} color="#15803D" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.otherProofNoticeTitle}>
                  Foto Bukti Pengantaran Tersedia!
                </Text>
                <Text style={styles.otherProofNoticeSub} numberOfLines={2}>
                  Pesanan #{otherOrderWithProof.orderCode || String(otherOrderWithProof._id || otherOrderWithProof.id).slice(-8).toUpperCase()} telah selesai diantar dengan bukti foto dari kurir. Ketuk untuk membuka bukti.
                </Text>
              </View>
            </View>
            <View style={styles.otherProofNoticeBtn}>
              <Text style={styles.otherProofNoticeBtnText}>Buka</Text>
              <ChevronRight size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Status Hero */}
        <View style={styles.statusHero}>
          <View style={styles.statusIcon}>
            <Check size={28} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.statusTitle}>
            {isCanceled
              ? "Pesanan Dibatalkan"
              : isFinished
              ? "Pesanan Telah Selesai!"
              : isDelivering
              ? "Kurir Sedang Mengantar"
              : isDriverHeading
              ? "Kurir Menuju Dapur Penjemputan"
              : isReady
              ? "Pesanan Siap Diambil Kurir"
              : isCooking
              ? "Dapur Sedang Memasak Menu"
              : "Pesanan Tercatat"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isCanceled
              ? "Pesanan ini dibatalkan. Hubungi mitra atau bantuan Geoverse jika Anda memerlukan informasi lebih lanjut."
              : isFinished
              ? "Pesanan telah tiba di tujuan. Selamat menikmati hidangan Anda!"
              : isDelivering
              ? `Kurir (${order?.driverName || "GEOVERSE Delivery"}) sedang dalam perjalanan ke alamat Anda.`
              : isDriverHeading
              ? `Kurir (${order?.driverName || "GEOVERSE"}) sedang menuju ${order?.storeName || "Dapur Catering"}.`
              : isReady
              ? "Dapur telah selesai menyiapkan pesanan. Menunggu kurir mengambil pesanan."
              : isCooking
              ? "Mitra catering sudah menerima pesanan dan sedang meracik hidangan segar."
              : `Pesanan tercatat. Status pembayaran: ${order?.paymentStatus || "menunggu konfirmasi"}.`}
          </Text>
        </View>

        {/* Bukti Pengantaran Kurir (Proof of Delivery / POD) */}
        {order?.deliveryProofUrl ? (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <View style={styles.proofHeaderLeft}>
                <View style={styles.proofIconBadge}>
                  <Camera size={18} color="#15803D" />
                </View>
                <View>
                  <Text style={styles.proofTitle}>Bukti Pengantaran Kurir</Text>
                  <Text style={styles.proofSubTitle}>Foto kamera langsung dari device kurir</Text>
                </View>
              </View>
              <View style={styles.proofVerifiedBadge}>
                <ShieldCheck size={11} color="#15803D" />
                <Text style={styles.proofVerifiedText}>Terverifikasi</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.proofImageWrapper}
              onPress={() => setProofModalVisible(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: order.deliveryProofUrl }}
                style={styles.proofImage}
                resizeMode="cover"
              />
              <View style={styles.proofTimestampRibbon}>
                <View style={styles.proofTimestampLeft}>
                  <Clock size={13} color="#FFFFFF" />
                  <Text style={styles.proofTimestampText}>
                    Waktu Real Serah Terima: {order.deliveryProofTimestamp || (order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("id-ID") : "Tercatat di sistem")}
                  </Text>
                </View>
                <View style={styles.proofZoomHint}>
                  <Maximize2 size={11} color="#FFFFFF" />
                  <Text style={styles.proofZoomHintText}>Perbesar</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.proofDriverMeta}>
              <Text style={styles.proofDriverMetaText}>
                Diserahkan oleh: <Text style={styles.proofDriverMetaName}>{order.driverName || "Kurir GEOVERSE"}</Text>
              </Text>
              <Text style={styles.proofCameraDeviceBadge}>
                {order.driverPhone ? `Telp: ${order.driverPhone}` : "Kurir Terverifikasi"}
              </Text>
            </View>
          </View>
        ) : null}

        {!isFinished && (
          <View style={styles.locationNotice}>
            <MapPin size={18} color="#64748B" />
            <Text style={styles.mapSubtitle}>Lokasi driver belum tersedia. Status pesanan diperbarui berkala.</Text>
          </View>
        )}

        <View style={styles.paymentCard}>
          <View style={styles.paymentHeaderRow}>
            <View style={styles.paymentHeaderTitle}><View style={styles.paymentIcon}><Wallet size={17} color="#1B7A4E" /></View><View style={styles.paymentHeaderCopy}><Text style={styles.paymentTitle}>Pembayaran</Text><Text style={styles.paymentMethod}>{paymentMethodLabel(order.paymentMethod)}</Text></View></View>
            <View style={[styles.paymentStatusPill, isPaymentComplete ? styles.paymentStatusPillDone : styles.paymentStatusPillPending]}><Text style={[styles.paymentStatusText, { color: isPaymentComplete ? "#166534" : "#9A3412" }]} numberOfLines={1}>{isPaymentComplete ? "LUNAS" : (order.paymentStatus || "MENUNGGU")}</Text></View>
          </View>
          <View style={styles.paymentProgressTrack}><View style={[styles.paymentProgressFill, { width: `${Math.min(100, totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0)}%` }]} /></View>
          <View style={styles.paymentAmountRow}><View style={styles.paymentAmountColumn}><Text style={styles.paymentAmountLabel}>Sudah dibayar</Text><Text style={styles.paymentAmountValue}>{rp(paidAmount)}</Text></View><View style={[styles.paymentAmountColumn, styles.paymentAmountColumnRight]}><Text style={styles.paymentAmountLabel}>Total pesanan</Text><Text style={styles.paymentAmountValue}>{rp(totalAmount)}</Text></View></View>
          {Number(order.remainingAmount || 0) > 0 ? (
            <View style={styles.paymentReminderBox}>
              <Text style={styles.paymentReminderTitle}>Pelunasan diperlukan · {rp(remaining)}</Text>
              <Text style={styles.paymentReminderText}>{order.paymentReminder || `Lunasi paling lambat ${paymentDueLabel}.`}</Text>
              <Text style={styles.paymentReminderDue}>Metode pelunasan: {paymentMethodLabel(order.paymentMethod)}. Selesaikan pembayaran dan unggah bukti transfer melalui halaman pembayaran QRIS.</Text>
              <TouchableOpacity
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: "#15803D",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginTop: 12,
                  shadowColor: "#0D7A53",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => {
                  setActiveCateringPaymentOrder(order);
                  navigate("c_catering_qris");
                }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ backgroundColor: "#DCFCE7", padding: 6, borderRadius: 8 }}>
                    <QrCode size={20} color="#15803D" />
                  </View>
                  <View style={styles.qrisButtonCopy}>
                    <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#0F172A" }}>
                      Buka Halaman Pembayaran QRIS
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>
                      Scan barcode, ajukan pelunasan & upload bukti
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#15803D" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.paidInvoiceCard}>
              <View style={styles.paidInvoiceHeader}>
                <View style={styles.paidInvoiceIcon}><CheckCircle2 size={19} color="#166534" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.paidInvoiceTitle}>Invoice Lunas 100%</Text>
                  <Text style={styles.paidInvoiceSubtitle}>Pembayaran terverifikasi oleh pemilik Catering</Text>
                </View>
                <Text style={styles.paidInvoiceStamp}>LUNAS</Text>
              </View>
              <View style={styles.paidInvoiceDivider} />
              <View style={styles.paidInvoiceRow}><Text style={styles.paidInvoiceLabel}>Nomor pesanan</Text><Text style={styles.paidInvoiceValue} numberOfLines={2}>{order.orderCode || `#${String(order.id).slice(-8).toUpperCase()}`}</Text></View>
              <View style={styles.paidInvoiceRow}><Text style={styles.paidInvoiceLabel}>Total pembayaran</Text><Text style={styles.paidInvoiceValue}>{rp(totalAmount)}</Text></View>
              <View style={styles.paidInvoiceRow}><Text style={styles.paidInvoiceLabel}>Metode</Text><Text style={styles.paidInvoiceValue}>{paymentMethodLabel(order.paymentMethod)}</Text></View>
              {latestVerifiedPayment?.verifiedAt ? <Text style={styles.paidInvoiceDate}>Diverifikasi {new Date(latestVerifiedPayment.verifiedAt).toLocaleString("id-ID")}</Text> : null}
              <Text style={styles.paymentCompleteNote}>Pembayaran sudah lunas. Pemilik Catering telah menerima notifikasi untuk menyelesaikan masakan, lalu menandai pesanan siap agar driver dapat mengantar.</Text>
            </View>
          )}
        </View>

        {/* Kurir Card / Waiting Driver Info */}
        {order?.driverName ? (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Bike size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.driverLabel}>KURIR PENGANTAR GEOVERSE</Text>
              <Text style={styles.driverName}>{order.driverName}</Text>
              <Text style={styles.driverPhone}>
                {order.driverPhone || "GEOVERSE Express"} {order.driverVehicle ? `• ${order.driverVehicle}` : ""}
              </Text>
            </View>
            <View style={styles.driverActionBtns}>
              <TouchableOpacity
                style={styles.driverChatBtn}
                onPress={handleOpenDriverChat}
                activeOpacity={0.8}
              >
                <MessageCircle size={18} color="#1B7A4E" />
                <Text style={styles.driverBtnText}>Chat Driver</Text>
              </TouchableOpacity>
              {order.driverPhone ? (
                <TouchableOpacity
                  style={styles.driverCallBtn}
                  onPress={() => void Linking.openURL(`tel:${order.driverPhone}`)}
                  activeOpacity={0.8}
                >
                  <Phone size={16} color="#0284C7" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : isReady ? (
          <View style={styles.waitingDriverCard}>
            <Bike size={20} color="#7E22CE" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.waitingDriverTitle}>Menugaskan Kurir</Text>
              <Text style={styles.waitingDriverSub}>
                Makanan telah siap! Sistem sedang mencarikan kurir terdekat untuk mengambil pesanan di dapur.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Store Card & Chat Store Button */}
        <View style={styles.storeCard}>
          <View style={styles.storeAvatar}>
            <Store size={20} color="#EA580C" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.storeLabel}>MITRA DAPUR CATERING</Text>
            <Text style={styles.storeName}>{order?.storeName || "Nama mitra belum tersedia"}</Text>
            <Text style={styles.storeSub} numberOfLines={1}>{order?.storeAddress || "Alamat mitra belum tersedia"}</Text>
          </View>
          <TouchableOpacity
            style={styles.storeChatBtn}
            onPress={handleOpenMerchantChat}
            activeOpacity={0.8}
          >
            <MessageCircle size={16} color="#EA580C" />
            <Text style={styles.storeBtnText}>Chat Dapur</Text>
          </TouchableOpacity>
        </View>

        {order && (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderLabel}>NOMOR PESANAN</Text>
                <Text style={styles.orderId}>{order.orderCode || order.id}</Text>
              </View>
              <ReceiptText size={24} color="#1B7A4E" />
            </View>
            <View style={styles.divider} />
            <Text style={styles.itemTitle}>{order.item}</Text>
            <Text style={styles.itemSub}>{order.detail}</Text>
            <View style={styles.detailRow}>
              <CalendarDays size={16} color="#1B7A4E" />
              <Text style={styles.detailText}>PO {order.cateringDate} • {order.cateringTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#1B7A4E" />
              <Text style={styles.detailText}>{String(order.address || "Alamat belum tersedia")}</Text>
            </View>
            {order.notes ? (
              <View style={styles.detailRow}>
                <FileText size={16} color="#1B7A4E" />
                <Text style={styles.detailText}>Catatan: {order.notes}</Text>
              </View>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Tahap Pengiriman</Text>
        <View style={styles.timeline}>
          {progress.map((item, index) => {
            const Icon = item.icon;
            return (
              <View key={item.title} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, item.active && styles.timelineDotActive]}>
                    <Icon size={15} color={item.active ? "#FFFFFF" : "#9CA3AF"} />
                  </View>
                  {index < progress.length - 1 && (
                    <View style={[styles.timelineLine, item.active && styles.timelineLineActive]} />
                  )}
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={[styles.timelineTitle, !item.active && styles.inactiveText]}>{item.title}</Text>
                  <Text style={styles.timelineText}>{item.text}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigate("c_home")}>
          <Text style={styles.primaryButtonText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Chat Modal */}
      <CustomerChatModal
        visible={chatVisible && Boolean(order?.id)}
        onClose={() => setChatVisible(false)}
        orderId={order?.id || ""}
        customerId={authAccount?.id}
        participantName={
          chatRecipient === "driver"
            ? (order?.driverName ? `${order.driverName} (Kurir)` : "Kurir Pengantar")
            : (order?.storeName ? `${order.storeName} (Dapur)` : "Mitra Catering")
        }
        participantType={chatRecipient}
        initialMessage={
          chatRecipient === "driver"
            ? "Halo Pak Kurir, saya customer pesanan catering ini."
            : "Halo Dapur Catering, saya ingin menanyakan pesanan saya."
        }
      />

      {/* Fullscreen Photo Lightbox Modal */}
      <Modal
        visible={proofModalVisible && Boolean(order?.deliveryProofUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setProofModalVisible(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setProofModalVisible(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Tutup pratinjau foto"
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.lightboxContent}>
            {order?.deliveryProofUrl ? (
              <Image
                source={{ uri: order.deliveryProofUrl }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
            <View style={styles.lightboxCaption}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Clock size={15} color="#86EFAC" />
                <Text style={styles.lightboxTimestampText}>
                  Waktu Serah Terima: {order?.deliveryProofTimestamp || (order?.deliveredAt ? new Date(order.deliveredAt).toLocaleString("id-ID") : "Tercatat di sistem")}
                </Text>
              </View>
              <Text style={styles.lightboxDriverText}>
                Kurir: {order?.driverName || "GEOVERSE Express"} • Foto kamera langsung dari perangkat
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyStateTitle: { color: "#111827", fontSize: 18, fontWeight: "800", textAlign: "center" },
  emptyStateText: { color: "#6B7280", fontSize: 13, lineHeight: 19, textAlign: "center" },
  emptyStateButton: { backgroundColor: "#1B7A4E", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 6 },
  emptyStateButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  locationNotice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 16 },
  orderSwitcherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  orderSwitcherHeader: {
    marginBottom: 8,
  },
  orderSwitcherTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  orderSwitcherSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  orderSwitcherRow: {
    gap: 8,
    paddingVertical: 2,
  },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  orderChipActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#16A34A",
  },
  orderChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderChipContent: {
    flexDirection: "column",
  },
  orderChipCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  orderChipCodeActive: {
    color: "#166534",
  },
  orderChipStatus: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  orderChipStatusActive: {
    color: "#15803D",
  },
  orderChipBadgeActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  otherProofNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 8,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  otherProofNoticeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  otherProofIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  otherProofNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#14532D",
  },
  otherProofNoticeSub: {
    fontSize: 10.5,
    color: "#166534",
    marginTop: 2,
    lineHeight: 14,
  },
  otherProofNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#15803D",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  otherProofNoticeBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  content: { width: "100%", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  statusHero: { width: "100%", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 18, padding: 16 },
  statusIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center" },
  statusTitle: { alignSelf: "stretch", color: "#064E3B", fontSize: 18, fontWeight: "900", marginTop: 12, textAlign: "center" },
  statusSubtitle: { alignSelf: "stretch", color: "#166534", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
  orderCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15, marginTop: 14 },
  orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderLabel: { color: "#9CA3AF", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  orderId: { color: "#111827", fontSize: 15, fontWeight: "900", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  itemTitle: { color: "#111827", fontSize: 14, fontWeight: "900" },
  itemSub: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  detailText: { flex: 1, minWidth: 0, color: "#4B5563", fontSize: 11 },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  sectionTitleNoMargin: { color: "#111827", fontSize: 14, fontWeight: "900" },
  timeline: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, borderWidth: 1, borderColor: "#E5E7EB" },
  timelineRow: { flexDirection: "row", minHeight: 58 },
  timelineRail: { width: 30, alignItems: "center" },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  timelineDotActive: { backgroundColor: "#1B7A4E" },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#E5E7EB", marginVertical: 2 },
  timelineLineActive: { backgroundColor: "#86EFAC" },
  timelineCopy: { flex: 1, minWidth: 0, paddingLeft: 10, paddingBottom: 13 },
  timelineTitle: { color: "#111827", fontSize: 12, fontWeight: "800", flexWrap: "wrap" },
  timelineText: { color: "#6B7280", fontSize: 11, marginTop: 3, flexWrap: "wrap" },
  inactiveText: { color: "#9CA3AF" },
  paymentCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 15, marginTop: 14 },
  paymentHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  paymentHeaderTitle: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  paymentHeaderCopy: { flex: 1, minWidth: 0 },
  paymentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5EE" },
  paymentTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  paymentMethod: { color: "#1B7A4E", fontSize: 11, fontWeight: "800", marginTop: 2 },
  paymentStatusPill: { maxWidth: "45%", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  paymentStatusPillDone: { backgroundColor: "#DCFCE7" },
  paymentStatusPillPending: { backgroundColor: "#FFEDD5" },
  paymentStatusText: { fontSize: 9, fontWeight: "900" },
  paymentProgressTrack: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 99, overflow: "hidden", marginTop: 15 },
  paymentProgressFill: { height: "100%", backgroundColor: "#1B7A4E", borderRadius: 99 },
  paymentAmountRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 12 },
  paymentAmountColumn: { flex: 1, minWidth: 0 },
  paymentAmountColumnRight: { alignItems: "flex-end" },
  paymentAmountLabel: { color: "#64748B", fontSize: 10 },
  paymentAmountValue: { color: "#0F172A", fontSize: 13, fontWeight: "900", marginTop: 3 },
  paymentAccountBox: { backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 11, marginTop: 12 },
  paymentAccountText: { color: "#334155", fontSize: 11, lineHeight: 18 },
  paymentReminderBox: { backgroundColor: "#FFF7ED", borderRadius: 12, borderWidth: 1, borderColor: "#FED7AA", padding: 11, marginTop: 12 },
  paymentReminderTitle: { color: "#9A3412", fontSize: 12, fontWeight: "900" },
  paymentReminderText: { color: "#9A3412", fontSize: 11, lineHeight: 16, marginTop: 4 },
  paymentReminderDue: { color: "#C2410C", fontSize: 10, fontWeight: "800", marginTop: 6 },
  paymentCompleteNote: { color: "#166534", backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 12, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  paidInvoiceCard: { backgroundColor: "#F0FDF4", borderRadius: 14, borderWidth: 1, borderColor: "#BBF7D0", padding: 12, marginTop: 12 },
  paidInvoiceHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  paidInvoiceIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  paidInvoiceTitle: { color: "#14532D", fontSize: 13, fontWeight: "900" },
  paidInvoiceSubtitle: { color: "#166534", fontSize: 10, marginTop: 2 },
  paidInvoiceStamp: { color: "#15803D", fontSize: 10, fontWeight: "900", borderWidth: 1, borderColor: "#86EFAC", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  paidInvoiceDivider: { height: 1, backgroundColor: "#BBF7D0", marginVertical: 10 },
  paidInvoiceRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 6 },
  paidInvoiceLabel: { flex: 1, minWidth: 0, color: "#4B5563", fontSize: 10 },
  paidInvoiceValue: { flex: 1, minWidth: 0, color: "#14532D", fontSize: 10, fontWeight: "900", textAlign: "right" },
  paidInvoiceDate: { color: "#166534", fontSize: 9, marginTop: 9 },
  paymentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 5 },
  paymentLabel: { color: "#6B7280", fontSize: 12 },
  paymentValue: { color: "#111827", fontSize: 12, fontWeight: "800" },
  paidValue: { color: "#1B7A4E", fontSize: 12, fontWeight: "900" },
  warningText: { color: "#166534" },
  reminderBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 11 },
  reminderTitle: { color: "#064E3B", fontSize: 11, fontWeight: "900" },
  reminderText: { color: "#166534", fontSize: 11, lineHeight: 16, marginTop: 3 },
  dueText: { color: "#064E3B", fontSize: 10, fontWeight: "800", marginTop: 6 },
  paidBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5EE", borderRadius: 12, padding: 11, marginTop: 11 },
  paidBoxText: { color: "#166534", fontSize: 11, fontWeight: "800" },
  primaryButton: { alignItems: "center", justifyContent: "center", backgroundColor: "#1B7A4E", borderRadius: 13, minHeight: 48, marginTop: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  chatButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#E8F5EE", borderRadius: 13, minHeight: 44, marginTop: 18 },
  chatButtonText: { color: "#1B7A4E", fontSize: 13, fontWeight: "900" },
  driverCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
  },
  driverLabel: {
    color: "#6B7280",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  driverName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  driverPhone: {
    color: "#1B7A4E",
    fontSize: 11,
    marginTop: 1,
    fontWeight: "700",
  },
  driverChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#C6E7D4",
  },
  driverActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginLeft: "auto",
    gap: 8,
  },
  driverBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  driverCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  qrisButtonCopy: { flex: 1, minWidth: 0 },
  mapSubtitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 4,
  },
  waitingDriverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAF5FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 14,
    marginTop: 14,
  },
  waitingDriverTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7E22CE",
  },
  waitingDriverSub: {
    fontSize: 11,
    color: "#6B21A8",
    marginTop: 2,
    lineHeight: 16,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 12,
    gap: 10,
  },
  storeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  storeLabel: {
    color: "#9CA3AF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  storeName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  storeSub: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 1,
  },
  storeChatBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  storeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  proofCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    padding: 15,
    marginTop: 14,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  proofHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  proofIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  proofTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  proofSubTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#166534",
    marginTop: 1,
  },
  proofVerifiedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  proofVerifiedText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#166534",
  },
  proofImageWrapper: {
    position: "relative",
    width: "100%",
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  proofImage: {
    width: "100%",
    height: "100%",
  },
  proofTimestampRibbon: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  proofTimestampLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  proofTimestampText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  proofZoomHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 8,
  },
  proofZoomHintText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  proofDriverMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  proofDriverMetaText: {
    fontSize: 11,
    color: "#64748B",
  },
  proofDriverMetaName: {
    fontWeight: "800",
    color: "#0F172A",
  },
  proofCameraDeviceBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxContent: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: "100%",
    height: 380,
    borderRadius: 14,
  },
  lightboxCaption: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
    alignItems: "center",
    gap: 4,
  },
  lightboxTimestampText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  lightboxDriverText: {
    fontSize: 11,
    color: "#94A3B8",
  },
});
