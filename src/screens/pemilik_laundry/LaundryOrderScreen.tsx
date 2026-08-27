import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Nav } from "../../types";
import {
  Shirt,
  Search,
  Plus,
  Home,
  Package,
  Users,
  Wallet,
  User,
  X,
  CheckCircle2,
  Scale,
  CreditCard,
  Bike,
  Sparkles,
  ShieldCheck,
  Clock,
  Eye,
  AlertCircle,
  Check,
} from "lucide-react-native";
import { AuthAccount } from "../auth/authTypes";
import {
  fetchStoreOrders,
  weighAndBillLaundryOrder,
  verifyLaundryPayment,
  updateLaundryOrderStatus,
  subscribeLaundry,
  LaundryOrder,
  getActiveLaundryOrder,
} from "../../services/laundryService";

interface LaundryOrderScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const LaundryOrderScreen: React.FC<LaundryOrderScreenProps> = ({ navigate, authAccount }) => {
  const [activeFilter, setActiveFilter] = useState<"semua" | "perlu_timbang" | "verifikasi_bayar" | "diproses" | "selesai">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Weigh & Bill
  const [isWeighModalOpen, setIsWeighModalOpen] = useState(false);
  const [selectedOrderForWeigh, setSelectedOrderForWeigh] = useState<LaundryOrder | null>(null);
  const [inputWeight, setInputWeight] = useState("");
  const [isWeighing, setIsWeighing] = useState(false);

  // Modal Verify Payment Proof
  const [isVerifyProofModalOpen, setIsVerifyProofModalOpen] = useState(false);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<LaundryOrder | null>(null);
  const [isVerifyingAction, setIsVerifyingAction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Modal Add Manual Offline Order
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [service, setService] = useState("Cuci Komplit");
  const [weightManual, setWeightManual] = useState("");
  const [priceVal, setPriceVal] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    const data = await fetchStoreOrders("all");
    const active = getActiveLaundryOrder();
    if (active && !data.some((d) => (d._id || d.id) === (active._id || active.id))) {
      data.unshift(active);
    }
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeLaundry(() => {
      loadOrders();
    });
    return unsub;
  }, []);

  const handleOpenWeighModal = (ord: LaundryOrder) => {
    setSelectedOrderForWeigh(ord);
    setInputWeight(ord.actualWeightOrQty ? String(ord.actualWeightOrQty) : "3.8");
    setIsWeighModalOpen(true);
  };

  const handleConfirmWeighAndBill = async () => {
    if (!selectedOrderForWeigh) return;
    const weightNum = parseFloat(inputWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert("Input Tidak Valid", "Masukkan angka berat yang valid (contoh: 3.8).");
      return;
    }

    setIsWeighing(true);
    try {
      const ordId = selectedOrderForWeigh._id || selectedOrderForWeigh.id || "";
      await weighAndBillLaundryOrder(ordId, weightNum);
      setIsWeighModalOpen(false);
      await loadOrders();
      Alert.alert("Tagihan Terkirim", `Tagihan sebesar ${(weightNum * (selectedOrderForWeigh.pricePerUnit || 6000) + 9000).toLocaleString("id-ID")} telah dikirim ke Customer.`);
    } catch (err) {
      console.error("Weigh error:", err);
    } finally {
      setIsWeighing(false);
    }
  };

  const handleOpenVerifyProofModal = (ord: LaundryOrder) => {
    setSelectedOrderForProof(ord);
    setRejectionReason("");
    setIsVerifyProofModalOpen(true);
  };

  const handleVerifyPaymentAction = async (action: "approve" | "reject") => {
    if (!selectedOrderForProof) return;
    setIsVerifyingAction(true);
    try {
      const ordId = selectedOrderForProof._id || selectedOrderForProof.id || "";
      await verifyLaundryPayment(ordId, action, rejectionReason);
      setIsVerifyProofModalOpen(false);
      await loadOrders();
      if (action === "approve") {
        Alert.alert("Pembayaran Terverifikasi", "Status pembayaran LUNAS. Cucian siap diproses cuci!");
      } else {
        Alert.alert("Bukti Ditolak", "Customer telah diberitahu untuk mengunggah ulang bukti transfer.");
      }
    } catch (err) {
      console.error("Verify error:", err);
    } finally {
      setIsVerifyingAction(false);
    }
  };

  const handleStartWashing = async (ord: LaundryOrder) => {
    const ordId = ord._id || ord.id || "";
    await updateLaundryOrderStatus(ordId, "SEDANG_DICUCI");
    loadOrders();
  };

  const handleFinishWashingAndCallDriver = async (ord: LaundryOrder) => {
    if (ord.paymentStatus !== "lunas") {
      Alert.alert(
        "Peringatan Pembayaran",
        "Pakaian TIDAK DAPAT diantar ke customer sebelum customer membayar dan Anda memverifikasi bukti transfernya!"
      );
      return;
    }

    const ordId = ord._id || ord.id || "";
    await updateLaundryOrderStatus(ordId, "SIAP_DIANTAR");
    loadOrders();
    Alert.alert("Driver Pengantaran Dipanggil", "Pakaian selesai dicuci & pembayaran sudah lunas. Driver terdekat telah ditugaskan untuk mengantar pakaian bersih ke customer!");
  };

  const handleCreateOfflineOrder = () => {
    if (!custName) return;
    const wNum = parseFloat(weightManual) || 3;
    const pNum = parseFloat(priceVal) || 6000;
    const newOrd: LaundryOrder = {
      _id: `manual_${Date.now()}`,
      orderCode: `LND-${Math.floor(100 + Math.random() * 900)}`,
      customerId: "offline_cust",
      customerName: custName,
      pickupAddress: "Datang ke Toko",
      deliveryAddress: "Ambil di Toko",
      storeId: "1",
      storeName: "Ais Laundry",
      ownerId: "owner_ais",
      serviceId: "s1",
      serviceName: service,
      pricePerUnit: pNum,
      unitType: "kg",
      actualWeightOrQty: wNum,
      laundryCost: wNum * pNum,
      deliveryFeePickup: 0,
      deliveryFeeDrop: 0,
      serviceFee: 0,
      totalAmount: wNum * pNum,
      paymentStatus: "lunas",
      status: "SEDANG_DICUCI",
      createdAt: new Date().toISOString(),
    };
    setOrders([newOrd, ...orders]);
    setIsAddModalOpen(false);
    setCustName("");
    setWeightManual("");
    setPriceVal("");
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "perlu_timbang") {
      return matchesSearch && (!o.actualWeightOrQty || o.status === "MENUNGGU_DRIVER_JEMPUT" || o.status === "TIBA_DI_LAUNDRY");
    }
    if (activeFilter === "verifikasi_bayar") {
      return matchesSearch && (o.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN" || o.paymentStatus === "menunggu_verifikasi");
    }
    if (activeFilter === "diproses") {
      return matchesSearch && (o.status === "SEDANG_DICUCI" || (o.paymentStatus === "lunas" && o.status !== "SELESAI"));
    }
    if (activeFilter === "selesai") {
      return matchesSearch && (o.status === "SIAP_DIANTAR" || o.status === "DRIVER_MENGANTAR_BALIK" || o.status === "SELESAI");
    }
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Manajemen Order Laundry</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Timbang • Verifikasi TF • Cuci • Antar</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#FFFFFF" />
          <Text style={styles.addBtnHeaderText}>Order Manual</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari No. Order atau nama customer..."
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "semua" && styles.filterChipActive]}
            onPress={() => setActiveFilter("semua")}
          >
            <Text style={[styles.filterChipText, activeFilter === "semua" && styles.filterChipTextActive]}>
              Semua ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "perlu_timbang" && styles.filterChipActive]}
            onPress={() => setActiveFilter("perlu_timbang")}
          >
            <Text style={[styles.filterChipText, activeFilter === "perlu_timbang" && styles.filterChipTextActive]}>
              ⚖️ Timbang ({orders.filter((o) => !o.actualWeightOrQty).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "verifikasi_bayar" && styles.filterChipActive]}
            onPress={() => setActiveFilter("verifikasi_bayar")}
          >
            <Text style={[styles.filterChipText, activeFilter === "verifikasi_bayar" && styles.filterChipTextActive]}>
              🔍 Cek Bukti Bayar ({orders.filter((o) => o.paymentStatus === "menunggu_verifikasi" || o.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "diproses" && styles.filterChipActive]}
            onPress={() => setActiveFilter("diproses")}
          >
            <Text style={[styles.filterChipText, activeFilter === "diproses" && styles.filterChipTextActive]}>
              🧺 Sedang Dicuci ({orders.filter((o) => o.status === "SEDANG_DICUCI").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === "selesai" && styles.filterChipActive]}
            onPress={() => setActiveFilter("selesai")}
          >
            <Text style={[styles.filterChipText, activeFilter === "selesai" && styles.filterChipTextActive]}>
              🚚 Antar / Selesai ({orders.filter((o) => o.status === "SIAP_DIANTAR" || o.status === "SELESAI").length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Order Items List */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0D7A53" />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Shirt size={44} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Tidak ada pesanan di kategori ini</Text>
            <Text style={styles.emptySub}>Pesanan baru dari customer akan langsung muncul di sini secara real-time.</Text>
          </View>
        ) : (
          <View style={styles.orderList}>
            {filteredOrders.map((o) => {
              const isWeighed = Boolean(o.actualWeightOrQty);
              const isVerifying = o.paymentStatus === "menunggu_verifikasi" || o.status === "MENUNGGU_VERIFIKASI_PEMBAYARAN";
              const isPaid = o.paymentStatus === "lunas";
              const isRejected = o.paymentStatus === "ditolak";
              const isWashing = o.status === "SEDANG_DICUCI";
              const isReadyToDeliver = o.status === "SIAP_DIANTAR" || o.status === "DRIVER_MENGANTAR_BALIK";
              const isCompleted = o.status === "SELESAI";

              return (
                <View key={o.orderCode || o._id} style={styles.orderCard}>
                  {/* Card Header Row */}
                  <View style={styles.orderTopRow}>
                    <View style={styles.orderIdBadge}>
                      <Shirt size={14} color="#0D7A53" />
                      <Text style={styles.orderIdText}>{o.orderCode}</Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        !isWeighed && { backgroundColor: "#FEF3C7" },
                        isWeighed && !isPaid && !isVerifying && { backgroundColor: "#FFF7ED" },
                        isVerifying && { backgroundColor: "#FEF3C7" },
                        isPaid && !isReadyToDeliver && !isCompleted && { backgroundColor: "#DCFCE7" },
                        isReadyToDeliver && { backgroundColor: "#DBEAFE" },
                        isCompleted && { backgroundColor: "#F3F4F6" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          !isWeighed && { color: "#D97706" },
                          isWeighed && !isPaid && !isVerifying && { color: "#EA580C" },
                          isVerifying && { color: "#B45309" },
                          isPaid && !isReadyToDeliver && !isCompleted && { color: "#166534" },
                          isReadyToDeliver && { color: "#2563EB" },
                          isCompleted && { color: "#4B5563" },
                        ]}
                      >
                        {!isWeighed
                          ? "Perlu Ditimbang"
                          : isVerifying
                          ? "🔍 Cek Bukti Transfer"
                          : !isPaid
                          ? "Menunggu Bayar"
                          : isWashing
                          ? "Sedang Dicuci"
                          : isReadyToDeliver
                          ? "Siap Diantar"
                          : "Selesai"}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Info */}
                  <Text style={styles.custName}>{o.customerName}</Text>
                  <Text style={styles.serviceDetail}>
                    {o.serviceName} • {isWeighed ? `${o.actualWeightOrQty} ${o.unitType || "kg"}` : "Estimasi Kiloan"}
                  </Text>
                  <Text style={styles.orderAddress} numberOfLines={1}>
                    📍 {o.pickupAddress}
                  </Text>

                  {/* Price & Billing Info */}
                  <View style={styles.priceBreakdownRow}>
                    <View>
                      <Text style={styles.priceLabelText}>Total Tagihan:</Text>
                      <Text style={styles.orderPrice}>
                        Rp {(o.totalAmount || (o.pricePerUnit * 2 + 9000)).toLocaleString("id-ID")}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.paymentBadge,
                        isPaid
                          ? styles.paymentBadgePaid
                          : isVerifying
                          ? styles.paymentBadgeVerifying
                          : styles.paymentBadgeUnpaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentBadgeText,
                          isPaid
                            ? styles.paymentBadgeTextPaid
                            : isVerifying
                            ? styles.paymentBadgeTextVerifying
                            : styles.paymentBadgeTextUnpaid,
                        ]}
                      >
                        {isPaid ? "✓ Lunas" : isVerifying ? "⏳ Ada Bukti Bayar" : "Belum Lunas"}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons based on Workflow Stage */}
                  <View style={styles.cardActionsRow}>
                    {/* Action 1: Timbang & Buat Tagihan */}
                    {!isWeighed || o.status === "TIBA_DI_LAUNDRY" || o.status === "MENUNGGU_DRIVER_JEMPUT" ? (
                      <TouchableOpacity
                        style={styles.actionBtnWeigh}
                        onPress={() => handleOpenWeighModal(o)}
                        activeOpacity={0.85}
                      >
                        <Scale size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnWeighText}>Timbang & Kirim Tagihan</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Action 2: Customer sudah upload bukti bayar ➔ Pemilik verifikasi */}
                    {isVerifying && (
                      <TouchableOpacity
                        style={styles.actionBtnCheckProof}
                        onPress={() => handleOpenVerifyProofModal(o)}
                        activeOpacity={0.85}
                      >
                        <Eye size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnCheckProofText}>Lihat & Verifikasi Bukti Pembayaran</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action 3: Menunggu Customer bayar (belum upload) */}
                    {isWeighed && !isPaid && !isVerifying && (
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={styles.actionBtnReWeigh}
                          onPress={() => handleOpenWeighModal(o)}
                          activeOpacity={0.8}
                        >
                          <Scale size={14} color="#0D7A53" />
                          <Text style={styles.actionBtnReWeighText}>Ubah Berat</Text>
                        </TouchableOpacity>

                        <View style={styles.waitingCustPayBanner}>
                          <Clock size={14} color="#EA580C" />
                          <Text style={styles.waitingCustPayText}>Menunggu Customer Bayar TF/QRIS</Text>
                        </View>
                      </View>
                    )}

                    {/* Action 4: Pembayaran Lunas & Sedang Dicuci ➔ Selesai Cuci & Panggil Driver Antar */}
                    {isPaid && (isWashing || o.status === "PEMBAYARAN_LUNAS") && (
                      <TouchableOpacity
                        style={styles.actionBtnFinish}
                        onPress={() => handleFinishWashingAndCallDriver(o)}
                        activeOpacity={0.85}
                      >
                        <Bike size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnFinishText}>Selesai Cuci ➔ Panggil Driver Antar</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action 5: Sedang diantar driver */}
                    {isReadyToDeliver && (
                      <View style={styles.driverDeliveringBanner}>
                        <Bike size={16} color="#2563EB" />
                        <Text style={styles.driverDeliveringText}>Driver sedang mengantar ke customer</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Modal: Timbang & Terbitkan Tagihan */}
      <Modal visible={isWeighModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.weighModalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.weighModalHeader}>
              <View style={styles.weighIconCircle}>
                <Scale size={24} color="#0D7A53" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weighModalTitle}>Timbang & Setor Tagihan</Text>
                <Text style={styles.weighModalSub}>Order: {selectedOrderForWeigh?.orderCode} • {selectedOrderForWeigh?.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsWeighModalOpen(false)}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Masukkan Hasil Timbangan (kg / pcs) <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <View style={styles.weightInputBox}>
              <TextInput
                style={styles.weightInput}
                keyboardType="numeric"
                placeholder="Contoh: 3.8"
                placeholderTextColor="#9CA3AF"
                value={inputWeight}
                onChangeText={setInputWeight}
              />
              <Text style={styles.weightUnitText}>{selectedOrderForWeigh?.unitType || "kg"}</Text>
            </View>

            {parseFloat(inputWeight) > 0 && selectedOrderForWeigh ? (
              <View style={styles.calcPreviewBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Tarif ({selectedOrderForWeigh.serviceName})</Text>
                  <Text style={styles.calcVal}>Rp {selectedOrderForWeigh.pricePerUnit?.toLocaleString("id-ID")}/{selectedOrderForWeigh.unitType}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Biaya Cuci ({parseFloat(inputWeight)} × Rp {selectedOrderForWeigh.pricePerUnit?.toLocaleString("id-ID")})</Text>
                  <Text style={styles.calcVal}>Rp {(parseFloat(inputWeight) * selectedOrderForWeigh.pricePerUnit).toLocaleString("id-ID")}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Ongkir Driver (Jemput & Antar)</Text>
                  <Text style={styles.calcVal}>Rp 8.000</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Biaya Layanan</Text>
                  <Text style={styles.calcVal}>Rp 1.000</Text>
                </View>
                <View style={styles.calcDivider} />
                <View style={styles.calcTotalRow}>
                  <Text style={styles.calcTotalLabel}>Total Tagihan ke Customer:</Text>
                  <Text style={styles.calcTotalVal}>
                    Rp {(parseFloat(inputWeight) * selectedOrderForWeigh.pricePerUnit + 9000).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btnSubmitWeigh, isWeighing && { opacity: 0.7 }]}
              onPress={handleConfirmWeighAndBill}
              disabled={isWeighing}
              activeOpacity={0.85}
            >
              {isWeighing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CreditCard size={18} color="#FFFFFF" />
                  <Text style={styles.btnSubmitWeighText}>Kirim Tagihan ke Customer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Verifikasi Bukti Pembayaran / Struk Transfer */}
      <Modal visible={isVerifyProofModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.weighModalCard}>
            <View style={styles.dragHandle} />
            <View style={styles.weighModalHeader}>
              <View style={[styles.weighIconCircle, { backgroundColor: "#DCFCE7" }]}>
                <Eye size={24} color="#0D7A53" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weighModalTitle}>Verifikasi Bukti Pembayaran</Text>
                <Text style={styles.weighModalSub}>Order: {selectedOrderForProof?.orderCode} • {selectedOrderForProof?.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsVerifyProofModalOpen(false)}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {/* Detail Tagihan */}
              <View style={styles.verifyDetailBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Metode Bayar:</Text>
                  <Text style={[styles.calcVal, { fontWeight: "800", color: "#0D7A53" }]}>
                    {selectedOrderForProof?.paymentMethod || "Transfer Bank / QRIS"}
                  </Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Total Nominal Harus Diterima:</Text>
                  <Text style={[styles.calcVal, { fontSize: 14, fontWeight: "900", color: "#111827" }]}>
                    Rp {(selectedOrderForProof?.totalAmount || 0).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>

              {/* Tampilan Gambar Bukti Transfer */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Foto Struk / Bukti Transfer Customer:</Text>
              <View style={styles.proofImageBox}>
                <Image
                  source={{
                    uri:
                      selectedOrderForProof?.paymentProofUrl ||
                      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80",
                  }}
                  style={styles.proofImageFull}
                  resizeMode="contain"
                />
              </View>

              {/* Alasan Penolakan jika ingin menolak */}
              <TextInput
                style={[styles.textInputRegular, { marginTop: 10 }]}
                placeholder="Catatan penolakan (opsional jika ditolak)"
                placeholderTextColor="#9CA3AF"
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />
            </ScrollView>

            {/* 2 Action Buttons: Tolak & Terima */}
            <View style={styles.verifyActionRow}>
              <TouchableOpacity
                style={styles.btnRejectPayment}
                onPress={() => handleVerifyPaymentAction("reject")}
                disabled={isVerifyingAction}
                activeOpacity={0.8}
              >
                <Text style={styles.btnRejectPaymentText}>Tolak / Minta Upload Ulang</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnApprovePayment}
                onPress={() => handleVerifyPaymentAction("approve")}
                disabled={isVerifyingAction}
                activeOpacity={0.85}
              >
                {isVerifyingAction ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnApprovePaymentText}>Terima & Lunas</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Tambah Order Offline Baru */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.weighModalCard}>
            <View style={styles.dragHandle} />
            <Text style={styles.weighModalTitle}>Input Order Pelanggan Datang</Text>

            <Text style={styles.inputLabel}>Nama Pelanggan</Text>
            <TextInput
              style={styles.textInputRegular}
              placeholder="Contoh: Bu Ratna"
              value={custName}
              onChangeText={setCustName}
            />

            <Text style={styles.inputLabel}>Jenis Layanan</Text>
            <TextInput
              style={styles.textInputRegular}
              placeholder="Contoh: Cuci Komplit / Express"
              value={service}
              onChangeText={setService}
            />

            <Text style={styles.inputLabel}>Berat (kg)</Text>
            <TextInput
              style={styles.textInputRegular}
              placeholder="Contoh: 4.0"
              keyboardType="numeric"
              value={weightManual}
              onChangeText={setWeightManual}
            />

            <TouchableOpacity
              style={styles.btnSubmitWeigh}
              onPress={handleCreateOfflineOrder}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSubmitWeighText}>Simpan Pesanan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancel} onPress={() => setIsAddModalOpen(false)}>
              <Text style={styles.btnCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_home")}
          activeOpacity={0.7}
        >
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => loadOrders()}
          activeOpacity={0.7}
        >
          <Package size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_user")}
          activeOpacity={0.7}
        >
          <Users size={22} color="#9CA3AF" />
          <Text style={styles.navText}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_pendapatan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_laundry_profil")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  headerSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D7A53",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnHeaderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },
  filterChipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 260,
  },
  orderList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  custName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  serviceDetail: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  orderAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  priceBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceLabelText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentBadgePaid: {
    backgroundColor: "#DCFCE7",
  },
  paymentBadgeVerifying: {
    backgroundColor: "#FEF3C7",
  },
  paymentBadgeUnpaid: {
    backgroundColor: "#FEE2E2",
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  paymentBadgeTextPaid: {
    color: "#166534",
  },
  paymentBadgeTextVerifying: {
    color: "#92400E",
  },
  paymentBadgeTextUnpaid: {
    color: "#991B1B",
  },
  cardActionsRow: {
    marginTop: 12,
  },
  actionBtnWeigh: {
    backgroundColor: "#0D7A53",
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnWeighText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnCheckProof: {
    backgroundColor: "#D97706",
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnCheckProofText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnReWeigh: {
    borderWidth: 1,
    borderColor: "#0D7A53",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionBtnReWeighText: {
    color: "#0D7A53",
    fontSize: 12,
    fontWeight: "700",
  },
  waitingCustPayBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  waitingCustPayText: {
    fontSize: 11,
    color: "#C2410C",
    fontWeight: "700",
  },
  actionBtnFinish: {
    backgroundColor: "#0D7A53",
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnFinishText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  driverDeliveringBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  driverDeliveringText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "700",
  },

  // Weigh Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  weighModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  weighModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  weighIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  weighModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  weighModalSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  weightInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#0D7A53",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 14,
  },
  weightInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  weightUnitText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D7A53",
  },
  textInputRegular: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
  },
  calcPreviewBox: {
    backgroundColor: "#E8F5EE",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  verifyDetailBox: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 11,
    color: "#166534",
  },
  calcVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  calcDivider: {
    height: 1,
    backgroundColor: "#C6E7D6",
    marginVertical: 6,
  },
  calcTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
  },
  calcTotalVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  proofImageBox: {
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  proofImageFull: {
    width: "100%",
    height: "100%",
  },
  verifyActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  btnRejectPayment: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRejectPaymentText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  btnApprovePayment: {
    flex: 1.2,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnApprovePaymentText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  btnSubmitWeigh: {
    backgroundColor: "#0D7A53",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  btnSubmitWeighText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  btnCancel: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnCancelText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  navTab: {
    alignItems: "center",
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },
  navTextActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
});
