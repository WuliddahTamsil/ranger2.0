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
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
  Building2,
  Tv,
  Wind,
  Bed,
  CheckCircle2,
  Upload,
  Copy,
} from "lucide-react-native";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";
import { createKostBooking, fetchAllKosts } from "../../services/kostService";
import { getSelectedKost, SelectedKost } from "./customerKosStore";

export const CustomerKosDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const [kostData, setKostData] = useState<SelectedKost | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>("bca_va");
  const [chatVisible, setChatVisible] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [proofImage, setProofImage] = useState<string>("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResponse, setBookingResponse] = useState<any>(null);

  // Form Booking State
  const [tenantName, setTenantName] = useState("Aisyah Putri");
  const [phone, setPhone] = useState("081298765432");
  const [email, setEmail] = useState("aisyahphr@gmail.com");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [durationMonths, setDurationMonths] = useState("1");

  useEffect(() => {
    const initKost = async () => {
      const stored = getSelectedKost();
      if (stored) {
        setKostData(stored);
        if (stored.rooms && stored.rooms.length > 0) {
          const avail = stored.rooms.find((r) => r.isAvailable) || stored.rooms[0];
          setSelectedRoom(avail);
        }
      } else {
        try {
          const list = await fetchAllKosts();
          if (list && list.length > 0) {
            setKostData(list[0]);
            if (list[0].rooms && list[0].rooms.length > 0) {
              const avail = list[0].rooms.find((r: any) => r.isAvailable) || list[0].rooms[0];
              setSelectedRoom(avail);
            }
          }
        } catch (err) {
          console.warn("Error fetching kost detail:", err);
        }
      }
    };
    initKost();
  }, []);

  const pricePerMonth = selectedRoom ? selectedRoom.priceMonthly : (kostData?.price || 950000);
  const durationNum = parseInt(durationMonths) || 1;
  const totalPrice = pricePerMonth * durationNum;
  const dpAmount = Math.round(totalPrice * 0.2); // 20% DP

  const handlePickProofImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImage(result.assets[0].uri);
      }
    } catch (err) {
      console.log("Using default sample proof:", err);
    }
  };

  const saveKosOrder = async () => {
    if (orderCreated) return;
    setIsSubmitting(true);

    const paymentName = selectedPayment === "bca_va" ? "BCA Transfer (Ais Kost Management)" : selectedPayment === "qris" ? "QRIS AIS KOST" : selectedPayment === "gopay" ? "GoPay" : "ShopeePay";

    const orderId = `RNG-KOS-${Date.now().toString().slice(-6)}`;
    const order: OrderItem = {
      id: orderId,
      type: "Kos",
      iconName: "Building2",
      color: "#0D7A53",
      item: kostData?.name || "Ais Kost Exclusive",
      detail: `${selectedRoom?.roomNumber ? `Kamar ${selectedRoom.roomNumber} (${selectedRoom.roomType})` : "Kamar Pilihan"} • ${durationNum} Bulan`,
      status: "Menunggu Verifikasi DP",
      statusColor: "orange",
      date: "Hari ini",
      total: totalPrice,
      paymentMethod: paymentName,
      paymentStatus: "DP 20% Terkirim",
      paidAmount: dpAmount,
      remainingAmount: totalPrice - dpAmount,
      paymentDueDate: `${startDate} (sebelum masuk kos)`,
      paymentReminder: `Sisa ${formatRupiah(totalPrice - dpAmount)} perlu dilunasi sebelum tanggal masuk kos.`,
      paymentReference: `PAY-${Date.now().toString().slice(-8)}`,
      paymentHistory: [{ type: "DP 20%", amount: dpAmount, method: paymentName, date: "Hari ini" }],
      address: kostData?.address || "Jl. Kaliurang KM 7 No. 15, Sleman",
    };
    addCustomerOrder(order);

    // Sync to MongoDB Atlas backend
    try {
      const result = await createKostBooking({
        customerId: "aisyahphr@gmail.com",
        kostId: kostData?._id || "66b1a0000000000000000002",
        roomId: selectedRoom?._id,
        roomNumber: selectedRoom?.roomNumber || "101",
        customerName: tenantName,
        customerPhone: phone,
        customerEmail: email,
        entryDate: startDate,
        durationMonths: durationNum,
        monthlyPrice: pricePerMonth,
        totalAmount: totalPrice,
        dpAmount: dpAmount,
        dpProofImage: proofImage,
      });
      setBookingResponse(result?.data);
    } catch (apiErr) {
      console.log("Offline or mocked booking synced locally:", apiErr);
    } finally {
      setIsSubmitting(false);
      setOrderCreated(true);
      setIsReceiptModalOpen(true);
    }
  };

  const roomsList = kostData?.rooms || [
    {
      _id: "r1",
      roomNumber: "101",
      roomType: "Tipe AC Exclusive Single",
      floor: 1,
      priceMonthly: 1500000,
      isAvailable: true,
      facilities: ["AC", "WiFi Cepat", "KM Dalam", "Water Heater", "Meja Kerja"],
    },
    {
      _id: "r2",
      roomNumber: "102",
      roomType: "Tipe Deluxe Balcony",
      floor: 1,
      priceMonthly: 1800000,
      isAvailable: true,
      facilities: ["AC", "WiFi", "Balkon", "KM Dalam", "Smart TV"],
    },
    {
      _id: "r3",
      roomNumber: "103",
      roomType: "Tipe AC Standar Plus",
      floor: 2,
      priceMonthly: 1200000,
      isAvailable: true,
      facilities: ["AC", "WiFi", "KM Dalam", "Meja Belajar"],
    },
    {
      _id: "r4",
      roomNumber: "104",
      roomType: "Tipe VIP King Suite",
      floor: 2,
      priceMonthly: 2200000,
      isAvailable: false,
      facilities: ["AC Inverter", "King Size Bed", "Bathtub"],
    },
    {
      _id: "r5",
      roomNumber: "105",
      roomType: "Tipe Cozy Minimalist",
      floor: 2,
      priceMonthly: 950000,
      isAvailable: true,
      facilities: ["Kipas Angin", "WiFi", "KM Luar"],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Header */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: (kostData?.images && kostData.images.length > 0) ? kostData.images[0] : "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
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
                <Building2 size={11} color="#FFFFFF" />
                <Text style={styles.badgePutraText}>{kostData?.type || "Campur"}</Text>
              </View>

              <View style={styles.badgeSisaKamar}>
                <Text style={styles.badgeSisaKamarText}>
                  {roomsList.filter(r => r.isAvailable).length} Kamar Tersedia
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{kostData?.name || "Ais Kost Exclusive"}</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.bodyContainer}>
          {/* Location & Rating */}
          <View style={styles.locationRow}>
            <MapPin size={15} color="#6B7280" />
            <Text style={styles.locationText}>{kostData?.address || "Jl. Kaliurang KM 7 No. 15, Sleman, Yogyakarta"}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Star size={15} color="#EAB308" fill="#EAB308" />
            <Text style={styles.ratingVal}>4.9</Text>
            <Text style={styles.reviewsText}>(128 ulasan)</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.responsiveOwnerText}>Pemilik Terverifikasi (aisk@gmail.com)</Text>
            </TouchableOpacity>
          </View>

          {/* PILIHAN TIPE KAMAR SECTION */}
          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Pilihan Tipe Kamar</Text>
              <Text style={{ fontSize: 12, color: "#0D7A53", fontWeight: "700" }}>{roomsList.length} Tipe Kamar</Text>
            </View>

            <View style={{ gap: 10 }}>
              {roomsList.map((room: any) => {
                const isSelected = selectedRoom?.roomNumber === room.roomNumber;
                return (
                  <TouchableOpacity
                    key={room.roomNumber}
                    style={[
                      styles.roomCard,
                      isSelected && styles.roomCardSelected,
                      !room.isAvailable && styles.roomCardDisabled,
                    ]}
                    onPress={() => {
                      if (room.isAvailable) {
                        setSelectedRoom(room);
                      }
                    }}
                    activeOpacity={room.isAvailable ? 0.85 : 1}
                  >
                    <View style={styles.roomCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Text style={styles.roomNumberTag}>Kamar {room.roomNumber}</Text>
                          <Text style={[styles.roomTypeTitle, isSelected && { color: "#0D7A53" }]}>
                            {room.roomType}
                          </Text>
                        </View>
                        <Text style={styles.roomFloorText}>Lantai {room.floor} • Termasuk Listrik & Air</Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.roomPriceVal}>
                          Rp {Number(room.priceMonthly).toLocaleString("id-ID")}
                        </Text>
                        <Text style={styles.roomPriceUnit}>/ bulan</Text>
                      </View>
                    </View>

                    {/* Facilities Preview */}
                    {room.facilities && (
                      <View style={styles.roomFacsRow}>
                        {room.facilities.slice(0, 4).map((fac: string, idx: number) => (
                          <View key={idx} style={styles.roomFacChip}>
                            <Text style={styles.roomFacChipText}>{fac}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Availability Tag */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                      <View style={[styles.availBadge, room.isAvailable ? styles.availGreen : styles.availRed]}>
                        <Text style={[styles.availText, { color: room.isAvailable ? "#0D7A53" : "#DC2626" }]}>
                          {room.isAvailable ? "● Kamar Tersedia" : "● Penuh / Terisi"}
                        </Text>
                      </View>

                      {room.isAvailable && (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: isSelected ? "#0D7A53" : "#6B7280" }}>
                          {isSelected ? "✓ Kamar Dipilih" : "Pilih Kamar Ini"}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fasilitas Kos Section */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Fasilitas Kos Utama</Text>
            <View style={styles.facilitiesGrid}>
              {[
                { id: "1", name: "WiFi Cepat", icon: Wifi },
                { id: "2", name: "AC & Kamar Mandi", icon: ShowerHead },
                { id: "3", name: "Dapur Bersama", icon: Utensils },
                { id: "4", name: "Parkir Luas", icon: Building2 },
              ].map((fac) => {
                const IconComp = fac.icon;
                return (
                  <View key={fac.id} style={styles.facilityCard}>
                    <View style={styles.facilityIconCircle}>
                      <IconComp size={20} color="#0D7A53" />
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
              {kostData?.description || "Kost exclusive bersih dan nyaman di kawasan strategis dekat kampus. Fasilitas lengkap dengan akses keamanan 24 jam dan manajemen profesional."}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>
            Kamar {selectedRoom?.roomNumber || "Pilihan"}
          </Text>
          <Text style={styles.bottomPriceVal}>
            Rp {Number(pricePerMonth).toLocaleString("id-ID")}{" "}
            <Text style={styles.bottomPriceUnit}>/ bln</Text>
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

      {/* Form Booking Kos Modal (Bottom Sheet) */}
      <Modal visible={isBookingModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.sheetCard}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Form Booking Kamar Kos</Text>
                <Text style={styles.sheetSub}>Amankan kamar pilihan dengan DP 20%</Text>
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
              {/* Selected Room Summary Box */}
              <View style={styles.merchantSummaryBox}>
                <View style={styles.merchantThumbBox}>
                  <Building2 size={24} color="#0D7A53" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantSummaryTitle}>{kostData?.name || "Ais Kost Exclusive"}</Text>
                  <Text style={styles.merchantSummaryRoomText}>
                    Kamar {selectedRoom?.roomNumber || "101"} ({selectedRoom?.roomType || "AC Exclusive"})
                  </Text>
                  <Text style={styles.merchantSummaryPrice}>
                    Rp {Number(pricePerMonth).toLocaleString("id-ID")} / bulan
                  </Text>
                </View>
              </View>

              {/* Field 1: Nama Penyewa */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Lengkap Penyewa</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={tenantName}
                    onChangeText={setTenantName}
                    placeholder="Nama lengkap"
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

              {/* Field 3: Email Customer */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Akun Customer</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="aisyahphr@gmail.com"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Field 4 & 5 Grid (Tanggal Masuk & Durasi) */}
              <View style={styles.gridTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Tgl. Masuk Kos</Text>
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Calendar size={16} color="#374151" />
                  </View>
                </View>

                <View style={{ width: 110 }}>
                  <Text style={styles.fieldLabel}>Durasi Sewa</Text>
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={durationMonths}
                      onChangeText={setDurationMonths}
                      keyboardType="number-pad"
                    />
                    <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700" }}>Bulan</Text>
                  </View>
                </View>
              </View>

              {/* Price Calculation Box */}
              <View style={styles.priceCalcBlock}>
                <View style={styles.priceCalcRow}>
                  <Text style={styles.calcLabel}>Total Biaya Sewa ({durationNum} bln)</Text>
                  <Text style={styles.calcVal}>Rp {totalPrice.toLocaleString("id-ID")}</Text>
                </View>

                {/* DP 20% Highlight Green Box */}
                <View style={styles.dpBoxGreen}>
                  <View style={styles.dpBoxLeft}>
                    <Wallet size={18} color="#0D7A53" />
                    <Text style={styles.dpBoxLabel}>DP Wajib (20%)</Text>
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
                  Lanjut Transfer DP: Rp {dpAmount.toLocaleString("id-ID")}
                </Text>
                <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: "180deg" }] }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pilih Pembayaran & Upload Bukti DP Modal */}
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
              <Text style={styles.sheetTitle}>Pembayaran DP Pemilik Kos</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              {/* Info Rekening Pemilik */}
              <View style={styles.bankAccountCard}>
                <Text style={styles.bankAccountHeader}>Transfer Rekening Pemilik (aisk@gmail.com):</Text>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>BCA (Bank Central Asia)</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>No. Rekening</Text>
                  <Text style={[styles.bankValue, { color: "#0D7A53", fontSize: 16, fontWeight: "900" }]}>
                    7720192841
                  </Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Atas Nama</Text>
                  <Text style={styles.bankValue}>Ais Kost Management</Text>
                </View>
                <View style={[styles.bankDetailRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                  <Text style={styles.bankLabel}>Jumlah DP</Text>
                  <Text style={[styles.bankValue, { color: "#0D7A53", fontWeight: "900" }]}>
                    Rp {dpAmount.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>

              {/* Upload Struk Bukti DP Section */}
              <View style={styles.uploadProofSection}>
                <Text style={styles.uploadProofTitle}>Unggah Bukti Transfer / Resi DP</Text>
                <Text style={styles.uploadProofSub}>
                  Bukti ini akan langsung diverifikasi secara real-time oleh akun pemilik kos.
                </Text>

                <TouchableOpacity
                  style={styles.uploadImageBox}
                  onPress={handlePickProofImage}
                  activeOpacity={0.8}
                >
                  {proofImage ? (
                    <Image source={{ uri: proofImage }} style={styles.uploadedPreviewImg} />
                  ) : (
                    <View style={{ alignItems: "center", padding: 20 }}>
                      <Upload size={32} color="#0D7A53" />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 8 }}>
                        Pilih Foto Bukti Transfer
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                        Format JPG, PNG (Maks 5MB)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeProofBtn}
                  onPress={handlePickProofImage}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeProofText}>📷 Ganti Foto Bukti Transfer</Text>
                </TouchableOpacity>
              </View>

              {/* Lanjutkan Pembayaran Button */}
              <TouchableOpacity
                style={styles.btnLanjutkan}
                onPress={() => {
                  setIsPaymentModalOpen(false);
                  saveKosOrder();
                }}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnLanjutkanText}>Kirim DP & Ajukan Verifikasi</Text>
                    <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: "180deg" }] }} />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* E-Receipt / Booking Berhasil Bottom Sheet Modal */}
      <Modal visible={isReceiptModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.receiptSheetCard}>
            {/* Success Header Banner */}
            <View style={styles.receiptSuccessBanner}>
              <View style={styles.receiptCheckCircle}>
                <Check size={28} color="#0D7A53" strokeWidth={3} />
              </View>
              <Text style={styles.receiptSuccessTitle}>Booking & DP Terkirim!</Text>
              <Text style={styles.receiptSuccessSub}>
                Notifikasi instan telah masuk ke akun pemilik kos (aisk@gmail.com).
              </Text>
            </View>

            {/* Dashed Divider */}
            <View style={styles.dashedDivider} />

            {/* E-Receipt Details */}
            <View style={styles.eReceiptBlock}>
              <Text style={styles.eReceiptLabel}>E-RECEIPT PEMESANAN KOST</Text>
              <Text style={styles.eReceiptInvNumber}>
                {bookingResponse?.bookingCode || `KST-${Date.now().toString().slice(-6)}`}
              </Text>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Nama Kos</Text>
                <Text style={styles.receiptVal}>{kostData?.name || "Ais Kost Exclusive"}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Kamar</Text>
                <Text style={styles.receiptVal}>
                  Kamar {selectedRoom?.roomNumber || "101"} ({selectedRoom?.roomType || "AC Exclusive"})
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Penyewa</Text>
                <Text style={styles.receiptVal}>{tenantName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Tanggal Masuk</Text>
                <Text style={styles.receiptVal}>{startDate}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Status DP</Text>
                <Text style={[styles.receiptVal, { color: "#EA580C", fontWeight: "800" }]}>
                  Menunggu Verifikasi Pemilik
                </Text>
              </View>

              {/* DP Highlight Row */}
              <View style={styles.receiptDpRow}>
                <Text style={styles.receiptDpKey}>Total DP 20% Dibayar</Text>
                <Text style={styles.receiptDpVal}>Rp {dpAmount.toLocaleString("id-ID")}</Text>
              </View>
            </View>

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
                <Text style={styles.btnSelesaiKembaliText}>Selesai & Ke Beranda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomerChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        orderId={bookingResponse?.bookingCode || "KOS-AIS-EXCLUSIVE"}
        participantName="Ais Kost (aisk@gmail.com)"
        participantType="merchant"
        initialMessage="Halo Kak Aisyah, bukti DP sudah diterima dan sedang diverifikasi ya."
      />
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
    height: 280,
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
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Body Container
  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  ratingVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  reviewsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  dotSeparator: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  responsiveOwnerText: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "700",
  },

  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  descText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
    marginTop: 8,
  },

  // Room Cards
  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  roomCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  roomCardDisabled: {
    opacity: 0.5,
    backgroundColor: "#F9FAFB",
  },
  roomCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  roomNumberTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roomTypeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  roomFloorText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  roomPriceVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  roomPriceUnit: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
  },
  roomFacsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  roomFacChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomFacChipText: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "600",
  },
  availBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availGreen: {
    backgroundColor: "#DCFCE7",
  },
  availRed: {
    backgroundColor: "#FEE2E2",
  },
  availText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Facilities Grid
  facilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  facilityCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  facilityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  facilityCardName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  bottomPriceVal: {
    fontSize: 18,
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
    gap: 10,
    alignItems: "center",
  },
  btnChatSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
  },
  btnBookingDp: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBookingDpText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // Modal Sheet Base
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },

  merchantSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  merchantThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  merchantSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  merchantSummaryRoomText: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "700",
    marginTop: 2,
  },
  merchantSummaryPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
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
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: "center",
  },
  inputContainerRow: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  gridTwoCols: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  priceCalcBlock: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },
  priceCalcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calcLabel: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  calcVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  dpBoxGreen: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 10,
  },
  dpBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    backgroundColor: "#0D7A53",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPayDpText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // Bank Account & Upload
  bankAccountCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
  },
  bankAccountHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
    marginBottom: 8,
  },
  bankDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#DCFCE7",
  },
  bankLabel: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  bankValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },
  uploadProofSection: {
    marginBottom: 20,
  },
  uploadProofTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  uploadProofSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 10,
  },
  uploadImageBox: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadedPreviewImg: {
    width: "100%",
    height: "100%",
  },
  changeProofBtn: {
    marginTop: 8,
    alignSelf: "center",
  },
  changeProofText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  btnLanjutkan: {
    backgroundColor: "#0D7A53",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  btnLanjutkanText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // E-Receipt Card
  receiptSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  receiptSuccessBanner: {
    alignItems: "center",
    marginBottom: 16,
  },
  receiptCheckCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  receiptSuccessTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  receiptSuccessSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    marginVertical: 14,
  },
  eReceiptBlock: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  eReceiptLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1,
  },
  eReceiptInvNumber: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  receiptKey: {
    fontSize: 12,
    color: "#6B7280",
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  receiptDpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  receiptDpKey: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  receiptDpVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  receiptBottomRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  btnChatPemilik: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnChatPemilikText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  btnSelesaiKembali: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSelesaiKembaliText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

