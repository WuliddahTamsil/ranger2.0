import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
} from "react-native";
import { Nav, OrderItem } from "../../types";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Star,
  Wifi,
  ShowerHead,
  Utensils,
  MessageCircle,
  X,
  Calendar,
  Wallet,
  Check,
  Download,
  User,
} from "lucide-react-native";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";
import { createKostBooking } from "../../services/kostService";

export const CustomerKosDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>("gopay");
  const [chatVisible, setChatVisible] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  // Form Booking State
  const [tenantName, setTenantName] = useState("Rahman Hakim");
  const [phone, setPhone] = useState("081356789012");
  const [startDate, setStartDate] = useState("07/26/2026");
  const [durationMonths, setDurationMonths] = useState("1");

  const pricePerMonth = 600000;
  const durationNum = parseInt(durationMonths) || 1;
  const totalPrice = pricePerMonth * durationNum;
  const dpAmount = totalPrice * 0.2;

  const saveKosOrder = async () => {
    if (orderCreated) return;
    const paymentName = selectedPayment === "gopay" ? "GoPay" : selectedPayment === "bca_va" ? "BCA Virtual Account" : selectedPayment === "ovo" ? "OVO" : "ShopeePay";
    const order: OrderItem = {
      id: `RNG-KOS-${Date.now().toString().slice(-6)}`,
      type: "Kos",
      iconName: "Building2",
      color: "#9333EA",
      item: "Kos Putra Garuda",
      detail: `${durationNum} bulan • ${tenantName}`,
      status: "Aktif",
      statusColor: "green",
      date: "Hari ini",
      total: totalPrice,
      paymentMethod: paymentName,
      paymentStatus: "DP 20% dibayar",
      paidAmount: dpAmount,
      remainingAmount: totalPrice - dpAmount,
      paymentDueDate: `${startDate} (sebelum masuk kos)`,
      paymentReminder: `Sisa ${formatRupiah(totalPrice - dpAmount)} perlu dilunasi sebelum tanggal masuk kos.`,
      paymentReference: `PAY-${Date.now().toString().slice(-8)}`,
      paymentHistory: [{ type: "DP 20%", amount: dpAmount, method: paymentName, date: "Hari ini" }],
      address: "Jl. Raya Kamojang No. 20",
    };
    addCustomerOrder(order);
    setOrderCreated(true);

    // Sync to MongoDB Atlas backend
    try {
      await createKostBooking({
        customerId: "66b1a0000000000000000001",
        kostId: "66b1a0000000000000000002",
        customerName: tenantName,
        customerPhone: phone,
        entryDate: new Date().toISOString(),
        durationMonths: durationNum,
        monthlyPrice: pricePerMonth,
        totalAmount: totalPrice,
        dpAmount: dpAmount,
        dpProofImage: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DP_PAID",
      });
    } catch (apiErr) {
      console.log("Offline or mocked booking synced locally:", apiErr);
    }
  };


  const facilities = [
    { id: "1", name: "WiFi", icon: Wifi },
    { id: "2", name: "KM Dalam", icon: ShowerHead },
    { id: "3", name: "Dapur", icon: Utensils },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Header */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            }}
            style={styles.heroImg}
          />

          {/* Top Floating Buttons */}
          <TouchableOpacity
            style={styles.topBackBtn}
            onPress={() => navigate("c_kos")}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity style={styles.topCircleBtn} activeOpacity={0.8}>
              <Share2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topCircleBtn} activeOpacity={0.8}>
              <Heart size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Hero Overlay Details (Badges & Title) */}
          <View style={styles.heroOverlayContent}>
            <View style={styles.heroBadgesRow}>
              <View style={styles.badgePutra}>
                <User size={11} color="#FFFFFF" />
                <Text style={styles.badgePutraText}>Putra</Text>
              </View>

              <View style={styles.badgeSisaKamar}>
                <Text style={styles.badgeSisaKamarText}>Sisa 2 Kamar</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Kos Putra Garuda</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.bodyContainer}>
          {/* Location & Rating */}
          <View style={styles.locationRow}>
            <MapPin size={15} color="#6B7280" />
            <Text style={styles.locationText}>Jl. Raya Kamojang No. 20</Text>
          </View>

          <View style={styles.ratingRow}>
            <Star size={15} color="#EAB308" fill="#EAB308" />
            <Text style={styles.ratingVal}>4.8</Text>
            <Text style={styles.reviewsText}>(120 ulasan)</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.responsiveOwnerText}>Pemilik Responsif</Text>
            </TouchableOpacity>
          </View>

          {/* Fasilitas Kos Section */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Fasilitas Kos</Text>

            <View style={styles.facilitiesGrid}>
              {facilities.map((fac) => {
                const IconComp = fac.icon;
                return (
                  <View key={fac.id} style={styles.facilityCard}>
                    <View style={styles.facilityIconCircle}>
                      <IconComp size={22} color="#0D7A53" />
                    </View>
                    <Text style={styles.facilityCardName}>{fac.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Deskripsi Section */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <Text style={styles.descText}>
              Kos Putra eksklusif dengan fasilitas lengkap, bersih, dan aman. Lokasi strategis dekat dengan area perkantoran PGE dan pusat makanan. Harga sudah termasuk air, sampah, dan WiFi.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Harga sewa</Text>
          <Text style={styles.bottomPriceVal}>
            Rp 600.000 <Text style={styles.bottomPriceUnit}>/ bln</Text>
          </Text>
        </View>

        <View style={styles.bottomActionsRight}>
          <TouchableOpacity style={styles.btnChatSquare} onPress={() => setChatVisible(true)} activeOpacity={0.8}>
            <MessageCircle size={20} color="#0D7A53" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnBookingDp}
            onPress={() => setIsBookingModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnBookingDpText}>Booking & DP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Booking Kos Modal (Bottom Sheet - Image 5) */}
      <Modal visible={isBookingModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.sheetCard}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Form Booking Kos</Text>
                <Text style={styles.sheetSub}>Amankan kamar dengan DP 20%</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBookingModalOpen(false)}
                style={styles.sheetCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              {/* Merchant Summary Box */}
              <View style={styles.merchantSummaryBox}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=200&q=80",
                  }}
                  style={styles.merchantThumb}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantSummaryTitle}>Kos Putra Garuda</Text>
                  <Text style={styles.merchantSummaryPrice}>Rp 600.000 / bln</Text>
                </View>
              </View>

              {/* Field 1: Nama Penyewa */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Penyewa</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={tenantName}
                    onChangeText={setTenantName}
                    placeholder="Masukkan nama Anda"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Field 2: No WhatsApp Aktif */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>No WhatsApp Aktif</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="08123456789"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Field 3 & 4 Grid (Tanggal Masuk & Durasi) */}
              <View style={styles.gridTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Tgl. Masuk Kos</Text>
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Calendar size={16} color="#374151" />
                  </View>
                </View>

                <View style={{ width: 100 }}>
                  <Text style={styles.fieldLabel}>Durasi (Bln)</Text>
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={durationMonths}
                      onChangeText={setDurationMonths}
                      keyboardType="number-pad"
                    />
                    <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700" }}>bln</Text>
                  </View>
                </View>
              </View>

              {/* Price Calculation Box */}
              <View style={styles.priceCalcBlock}>
                <View style={styles.priceCalcRow}>
                  <Text style={styles.calcLabel}>Total Harga Sewa</Text>
                  <Text style={styles.calcVal}>Rp {totalPrice.toLocaleString("id-ID")}</Text>
                </View>

                {/* DP 20% Highlight Green Box */}
                <View style={styles.dpBoxGreen}>
                  <View style={styles.dpBoxLeft}>
                    <Wallet size={18} color="#0D7A53" />
                    <Text style={styles.dpBoxLabel}>DP (20%)</Text>
                  </View>
                  <Text style={styles.dpBoxVal}>Rp {dpAmount.toLocaleString("id-ID")}</Text>
                </View>
              </View>

              {/* Submit DP Button */}
              <TouchableOpacity
                style={styles.btnPayDp}
                onPress={() => {
                  setIsBookingModalOpen(false);
                  setIsPaymentModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPayDpText}>
                  Bayar DP Rp {dpAmount.toLocaleString("id-ID")}
                </Text>
                <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: "180deg" }] }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pilih Pembayaran Bottom Sheet Modal (Image 2) */}
      <Modal visible={isPaymentModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.sheetCard}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={() => {
                  setIsPaymentModalOpen(false);
                  setIsBookingModalOpen(true);
                }}
                style={{ padding: 4, marginRight: 12 }}
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Pilih Pembayaran</Text>
            </View>

            {/* Payment Options List */}
            <View style={styles.paymentList}>
              {[
                { id: "gopay", name: "GoPay", sub: "Bayar instan dengan GoPay", color: "#00AED6" },
                { id: "bca_va", name: "BCA Virtual Account", sub: "Transfer otomatis", color: "#003C93" },
                { id: "ovo", name: "OVO", sub: "Cashback hingga 10k", color: "#4C3494" },
                { id: "shopeepay", name: "ShopeePay", sub: "Gratis biaya admin", color: "#EE4D2D" },
              ].map((method) => {
                const isSelected = selectedPayment === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentOptionRow,
                      isSelected && styles.paymentOptionRowSelected,
                    ]}
                    onPress={() => setSelectedPayment(method.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.paymentIconBox, { backgroundColor: method.color + "15" }]}>
                      <Wallet size={20} color={method.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentOptionName}>{method.name}</Text>
                      <Text style={styles.paymentOptionSub}>{method.sub}</Text>
                    </View>
                    <View style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}>
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Lanjutkan Pembayaran Button */}
            <TouchableOpacity
              style={styles.btnLanjutkan}
              onPress={() => {
                setIsPaymentModalOpen(false);
                saveKosOrder();
                setIsReceiptModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnLanjutkanText}>Lanjutkan Pembayaran</Text>
              <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: "180deg" }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* E-Receipt / Booking Berhasil Bottom Sheet Modal (Image 3) */}
      <Modal visible={isReceiptModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.receiptSheetCard}>
            {/* Success Header Banner */}
            <View style={styles.receiptSuccessBanner}>
              <View style={styles.receiptCheckCircle}>
                <Check size={28} color="#0D7A53" strokeWidth={3} />
              </View>
              <Text style={styles.receiptSuccessTitle}>Booking Berhasil!</Text>
              <Text style={styles.receiptSuccessSub}>Kamar Anda telah diamankan.</Text>
            </View>

            {/* Dashed Divider */}
            <View style={styles.dashedDivider} />

            {/* E-Receipt Details */}
            <View style={styles.eReceiptBlock}>
              <Text style={styles.eReceiptLabel}>E-RECEIPT</Text>
              <Text style={styles.eReceiptInvNumber}>INV/KOS/3098</Text>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Kos</Text>
                <Text style={styles.receiptVal}>Kos Putra Garuda</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Tanggal Masuk</Text>
                <Text style={styles.receiptVal}>2026-07-26</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Metode</Text>
                <Text style={styles.receiptVal}>
                  {selectedPayment === "gopay" ? "GoPay" :
                   selectedPayment === "bca_va" ? "BCA Virtual Account" :
                   selectedPayment === "ovo" ? "OVO" : "ShopeePay"}
                </Text>
              </View>

              {/* DP Highlight Row */}
              <View style={styles.receiptDpRow}>
                <Text style={styles.receiptDpKey}>Total DP (20%)</Text>
                <Text style={styles.receiptDpVal}>Rp {dpAmount.toLocaleString("id-ID")}</Text>
              </View>
            </View>

            {/* Unduh Invoice Button */}
            <TouchableOpacity style={styles.btnUnduhInvoice} activeOpacity={0.8}>
              <Download size={16} color="#0D7A53" />
              <Text style={styles.btnUnduhInvoiceText}>Unduh Invoice</Text>
            </TouchableOpacity>

            {/* Bottom Action Row */}
            <View style={styles.receiptBottomRow}>
              <TouchableOpacity style={styles.btnChatPemilik} onPress={() => setChatVisible(true)} activeOpacity={0.8}>
                <MessageCircle size={16} color="#374151" />
                <Text style={styles.btnChatPemilikText}>Chat Pemilik</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSelesaiKembali}
                onPress={() => {
                  setIsReceiptModalOpen(false);
                  navigate("c_home");
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnSelesaiKembaliText}>Selesai & Kembali</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomerChatModal visible={chatVisible} onClose={() => setChatVisible(false)} orderId="KOS-PUTRA-GARUDA" participantName="Pemilik Kos Putra Garuda" participantType="merchant" initialMessage="Halo Kak, ada yang ingin ditanyakan tentang kamar atau booking kos?" />

    </SafeAreaView>
  );
};

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Hero Container
  heroContainer: {
    width: "100%",
    height: 300,
    position: "relative",
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  topBackBtn: {
    position: "absolute",
    top: 40,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  topRightActions: {
    position: "absolute",
    top: 40,
    right: 20,
    flexDirection: "row",
    gap: 10,
  },
  topCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroOverlayContent: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
  },
  heroBadgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  badgePutra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePutraText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  badgeSisaKamar: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeSisaKamarText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Body Content
  bodyContainer: {
    padding: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  ratingVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  reviewsText: {
    fontSize: 13,
    color: "#6B7280",
  },
  dotSeparator: {
    color: "#9CA3AF",
    marginHorizontal: 4,
  },
  responsiveOwnerText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0284C7",
  },

  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
  },

  // Facilities Grid
  facilitiesGrid: {
    flexDirection: "row",
    gap: 12,
  },
  facilityCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  facilityIconCircle: {
    marginBottom: 8,
  },
  facilityCardName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },

  descText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 22,
  },

  // Fixed Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  bottomPriceVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0D7A53",
  },
  bottomPriceUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  bottomActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  btnChatSquare: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBookingDp: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBookingDpText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  // Bottom Sheet Modal
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sheetSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  sheetContent: {
    paddingBottom: 20,
  },

  merchantSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 18,
  },
  merchantThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  merchantSummaryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  merchantSummaryPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
    marginTop: 2,
  },

  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  inputContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
    justifyContent: "center",
  },
  inputContainerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 46,
  },
  textInput: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  gridTwoCols: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  priceCalcBlock: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 14,
    marginBottom: 18,
  },
  priceCalcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calcLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  calcVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  dpBoxGreen: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5EE",
    borderRadius: 14,
    padding: 14,
  },
  dpBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dpBoxLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  dpBoxVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },

  btnPayDp: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPayDpText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Modal Center Success
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  circleIconGreen: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  dialogDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnDialogGreen: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDialogGreenText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Payment Method Modal Styles
  paymentList: {
    gap: 10,
    marginBottom: 20,
  },
  paymentOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  paymentOptionRowSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  paymentIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentOptionName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  paymentOptionSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  btnLanjutkan: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnLanjutkanText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  // E-Receipt Modal Styles
  receiptSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: "90%",
  },
  receiptSuccessBanner: {
    backgroundColor: "#E8F5EE",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  receiptCheckCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#0D7A53",
  },
  receiptSuccessTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  receiptSuccessSub: {
    fontSize: 13,
    color: "#6B7280",
  },
  dashedDivider: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginVertical: 14,
  },
  eReceiptBlock: {
    marginBottom: 16,
  },
  eReceiptLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: "center",
  },
  eReceiptInvNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  receiptKey: {
    fontSize: 13,
    color: "#6B7280",
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  receiptDpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  receiptDpKey: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  receiptDpVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0D7A53",
  },
  btnUnduhInvoice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    backgroundColor: "#E8F5EE",
    marginBottom: 14,
  },
  btnUnduhInvoiceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  receiptBottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnChatPemilik: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  btnChatPemilikText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  btnSelesaiKembali: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSelesaiKembaliText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
