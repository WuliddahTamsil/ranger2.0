import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { SafeAreaBottomBar } from "../../components/SafeAreaBottomBar";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Images,
  Eye,
  Shirt,
  Car,
  ShieldCheck,
  Search,
  Info,
  Zap,
  Droplets,
  Snowflake,
  Fan,
  DoorClosed,
  Table,
  Armchair,
  Bath,
  CupSoda,
} from "lucide-react-native";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";
import { createKostBooking, fetchAllKosts, fetchKostById } from "../../services/kostService";
import { getSelectedKost, SelectedKost, setActiveCustomerBooking, setSelectedKost } from "./customerKosStore";
import { AuthAccount } from "../auth/authTypes";
import { uploadFileToBackend } from "../../services/api";

interface CustomerKosDetailProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerKosDetailScreen: React.FC<CustomerKosDetailProps> = ({ navigate, authAccount }) => {
  const [kostData, setKostData] = useState<SelectedKost | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>("bca_va");
  const [chatVisible, setChatVisible] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [proofImage, setProofImage] = useState<string>("");
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResponse, setBookingResponse] = useState<any>(null);

  // Photo Gallery State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Room Search & Accordion Expand State
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [expandedRoomNumber, setExpandedRoomNumber] = useState<string | null>(null);

  // Form Booking State
  const [tenantName, setTenantName] = useState(authAccount?.name || "Aisyah Putri");
  const [phone, setPhone] = useState(authAccount?.phone || "081298765432");
  const [email, setEmail] = useState(authAccount?.email || "aisyahphr@gmail.com");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [durationMonths, setDurationMonths] = useState("1");

  // Interactive Material 3 Date Picker Calendar State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(8); // September (0-indexed)
  const [selectedDay, setSelectedDay] = useState(1);

  const monthNamesInd = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const daysOfWeekInd = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleConfirmDate = (day: number, month: number, year: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setStartDate(`${year}-${mm}-${dd}`);
    setIsDatePickerOpen(false);
  };

  useEffect(() => {
    if (authAccount) {
      if (authAccount.name) setTenantName(authAccount.name);
      if (authAccount.phone) setPhone(authAccount.phone);
      if (authAccount.email) setEmail(authAccount.email);
    }
  }, [authAccount]);

  useEffect(() => {
    const initKost = async () => {
      const stored = getSelectedKost();
      if (stored) {
        setKostData(stored);
        if (stored.rooms && stored.rooms.length > 0) {
          const avail = stored.rooms.find((r) => r.isAvailable) || stored.rooms[0];
          setSelectedRoom(avail);
        }
      }

      // Always fetch fresh real-time data from MongoDB backend
      try {
        const targetId = stored?._id || stored?.id;
        let freshKost = null;
        if (targetId && String(targetId).match(/^[0-9a-fA-F]{24}$/)) {
          freshKost = await fetchKostById(String(targetId));
        }
        if (!freshKost) {
          const list = await fetchAllKosts();
          if (list && list.length > 0) {
            freshKost = list.find((k: any) => k.name === stored?.name || k._id === targetId) || list[0];
          }
        }

        if (freshKost) {
          setKostData(freshKost);
          setSelectedKost(freshKost);
          if (Array.isArray(freshKost.rooms) && freshKost.rooms.length > 0) {
            const availRoom = freshKost.rooms.find((r: any) => r.isAvailable) || freshKost.rooms[0];
            setSelectedRoom(availRoom);
          }
        }
      } catch (err) {
        console.warn("Error fetching fresh kost detail:", err);
      }
    };
    initKost();
  }, []);

  // Compute all available gallery images (prioritizing uploaded room photos)
  const galleryImages = React.useMemo(() => {
    const roomImgs = Array.isArray(selectedRoom?.images) && selectedRoom.images.length > 0
      ? selectedRoom.images
      : (Array.isArray(kostData?.rooms) ? kostData.rooms : []).flatMap((r: any) => (Array.isArray(r.images) ? r.images : [])).filter(Boolean);
    const kostImgs = (Array.isArray(kostData?.images) ? kostData.images : []).filter(Boolean);
    const merged = Array.from(new Set([...roomImgs, ...kostImgs]));
    return merged.length > 0
      ? merged
      : ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"];
  }, [kostData, selectedRoom]);

  const currentImage = galleryImages[activeImageIndex] || galleryImages[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80";

  // Dynamic icon mapper for facilities
  const getFacilityIcon = (facilityName: string) => {
    const name = (facilityName || "").toLowerCase();
    if (name.includes("wifi") || name.includes("internet")) return Wifi;
    if (name.includes("listrik") || name.includes("pln") || name.includes("token")) return Zap;
    if (name.includes("air") || name.includes("pdam")) return Droplets;
    if (name.includes("ac")) return Snowflake;
    if (name.includes("kipas") || name.includes("fan") || name.includes("angin")) return Fan;
    if (name.includes("km luar") || name.includes("luar")) return Bath;
    if (name.includes("km") || name.includes("mandi") || name.includes("shower") || name.includes("toilet") || name.includes("water heater")) return ShowerHead;
    if (name.includes("kasur") || name.includes("bed") || name.includes("springbed") || name.includes("matras")) return Bed;
    if (name.includes("lemari") || name.includes("wardrobe") || name.includes("pakaian")) return DoorClosed;
    if (name.includes("meja") || name.includes("desk") || name.includes("belajar") || name.includes("kerja")) return Table;
    if (name.includes("kursi") || name.includes("chair") || name.includes("duduk")) return Armchair;
    if (name.includes("tv") || name.includes("televisi")) return Tv;
    if (name.includes("dispenser") || name.includes("minum") || name.includes("kopi")) return CupSoda;
    if (name.includes("dapur") || name.includes("masak") || name.includes("kulkas") || name.includes("makan")) return Utensils;
    if (name.includes("cuci") || name.includes("jemur") || name.includes("laundry") || name.includes("baju")) return Shirt;
    if (name.includes("parkir") || name.includes("motor") || name.includes("mobil") || name.includes("kendaraan")) return Car;
    if (name.includes("cctv") || name.includes("aman") || name.includes("penjaga") || name.includes("satpam") || name.includes("security")) return ShieldCheck;
    if (name.includes("ruang") || name.includes("tamu") || name.includes("santai") || name.includes("gedung") || name.includes("balkon")) return Building2;
    return CheckCircle2;
  };

  // Real shared facilities & rules from MongoDB property settings
  const sharedFacilities = React.useMemo(() => {
    return Array.isArray(kostData?.facilities) ? kostData.facilities.filter(Boolean) : [];
  }, [kostData]);

  const kosRules = React.useMemo(() => {
    return Array.isArray(kostData?.rules) ? kostData.rules.filter(Boolean) : [];
  }, [kostData]);

  const pricePerMonth = selectedRoom ? selectedRoom.priceMonthly : (kostData?.price || 950000);
  const durationNum = parseInt(durationMonths) || 1;
  const totalPrice = pricePerMonth * durationNum;
  const dpAmount = Math.round(totalPrice * 0.2); // 20% DP

  const handlePickProofImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofImage(asset.uri);
        setIsUploadingProof(true);
        try {
          const uploadRes = await uploadFileToBackend(
            asset.uri,
            `bukti_dp_${Date.now()}.jpg`,
            asset.mimeType || "image/jpeg"
          );
          if (uploadRes && uploadRes.data && uploadRes.data.url) {
            const cloudinaryUrl = uploadRes.data.url;
            setProofImage(cloudinaryUrl);
            console.log("✅ Bukti DP berhasil disimpan ke Cloudinary:", cloudinaryUrl);
          }
        } catch (uploadErr) {
          console.warn("Upload bukti DP to Cloudinary error:", uploadErr);
        } finally {
          setIsUploadingProof(false);
        }
      }
    } catch (err) {
      console.log("Pick image error:", err);
    }
  };

  const saveKosOrder = async () => {
    if (orderCreated) return;
    if (!proofImage) {
      Alert.alert(
        "Unggah Bukti Transfer",
        "Silakan unggah foto struk atau resi bukti transfer DP terlebih dahulu."
      );
      return;
    }
    setIsSubmitting(true);

    const paymentName =
      selectedPayment === "bca_va"
        ? "BCA Transfer (Ais Kost Management)"
        : selectedPayment === "qris"
        ? "QRIS AIS KOST"
        : selectedPayment === "gopay"
        ? "GoPay"
        : "ShopeePay";

    // Ensure proof is uploaded to Cloudinary
    let finalProofUrl = proofImage;
    if (proofImage && (proofImage.startsWith("blob:") || proofImage.startsWith("file:"))) {
      try {
        const uploadRes = await uploadFileToBackend(
          proofImage,
          `bukti_dp_${Date.now()}.jpg`,
          "image/jpeg"
        );
        if (uploadRes?.data?.url) {
          finalProofUrl = uploadRes.data.url;
          setProofImage(finalProofUrl);
        }
      } catch (uploadErr) {
        console.warn("Fallback upload in saveKosOrder:", uploadErr);
      }
    }

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
        customerId: authAccount?.id || authAccount?.email || "aisyahphr@gmail.com",
        kostId: kostData?._id || "66b1a0000000000000000002",
        roomId: selectedRoom?._id,
        roomNumber: selectedRoom?.roomNumber || "101",
        customerName: tenantName || authAccount?.name || "aisyahphr",
        customerPhone: phone || authAccount?.phone || "081234567890",
        customerEmail: email || authAccount?.email || "aisyahphr@gmail.com",
        entryDate: startDate,
        durationMonths: durationNum,
        monthlyPrice: pricePerMonth,
        totalAmount: totalPrice,
        dpAmount: dpAmount,
        dpProofImage: finalProofUrl,
      });
      setBookingResponse(result?.data);

      // Save to customerKosStore active booking state for live customer tracking
      const activeObj = {
        _id: result?.data?._id || "temp",
        bookingCode: result?.data?.bookingCode || `KST-${Date.now().toString().slice(-6)}`,
        customerName: tenantName || authAccount?.name || "aisyahphr",
        customerPhone: phone || authAccount?.phone || "081234567890",
        customerEmail: email || authAccount?.email || "aisyahphr@gmail.com",
        kostId: kostData?._id || "",
        kostName: kostData?.name || "Ais Kost Exclusive",
        kostAddress: kostData?.address,
        kostImage: (kostData?.images && kostData.images[0]) || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
        roomNumber: selectedRoom?.roomNumber || "101",
        roomType: selectedRoom?.roomType || "AC Exclusive",
        entryDate: startDate,
        durationMonths: durationNum,
        monthlyPrice: pricePerMonth,
        totalAmount: totalPrice,
        dpAmount: dpAmount,
        dpProofImage: finalProofUrl,
        status: "dp_submitted" as const,
        createdAt: new Date().toISOString(),
      };
      setActiveCustomerBooking(activeObj);
    } catch (apiErr) {
      console.log("Offline or mocked booking synced locally:", apiErr);
      const fallbackObj = {
        _id: "temp_offline",
        bookingCode: `KST-${Date.now().toString().slice(-6)}`,
        customerName: tenantName || "aisyahphr",
        customerPhone: phone || "081234567890",
        customerEmail: email || "aisyahphr@gmail.com",
        kostId: kostData?._id || "",
        kostName: kostData?.name || "Ais Kost Exclusive",
        kostAddress: kostData?.address,
        kostImage: (kostData?.images && kostData.images[0]) || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
        roomNumber: selectedRoom?.roomNumber || "101",
        roomType: selectedRoom?.roomType || "AC Exclusive",
        entryDate: startDate,
        durationMonths: durationNum,
        monthlyPrice: pricePerMonth,
        totalAmount: totalPrice,
        dpAmount: dpAmount,
        dpProofImage: finalProofUrl,
        status: "dp_submitted" as const,
        createdAt: new Date().toISOString(),
      };
      setActiveCustomerBooking(fallbackObj);
    } finally {
      setIsSubmitting(false);
      setOrderCreated(true);
      setIsReceiptModalOpen(true);
    }
  };

  const roomsList = Array.isArray(kostData?.rooms) ? kostData.rooms : [];

  const filteredRoomsList = React.useMemo(() => {
    if (!roomSearchQuery.trim()) return roomsList;
    const q = roomSearchQuery.toLowerCase().trim();
    return roomsList.filter((room: any) => {
      const cleanNum = String(room.roomNumber || "").replace(/^(Kamar\s*)+/gi, "").trim();
      const matchNum = cleanNum.toLowerCase().includes(q) || `kamar ${cleanNum}`.toLowerCase().includes(q);
      const matchType = (room.roomType || "").toLowerCase().includes(q);
      const matchFac = Array.isArray(room.facilities) && room.facilities.some((f: string) => (f || "").toLowerCase().includes(q));
      return matchNum || matchType || matchFac;
    });
  }, [roomsList, roomSearchQuery]);

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image Header with Gallery Navigation & Zoom */}
        <View style={styles.heroContainer}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => setIsImageModalOpen(true)}
            style={{ width: "100%", height: "100%" }}
          >
            <Image
              source={{ uri: currentImage }}
              style={styles.heroImg}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Top Floating Buttons */}
          <TouchableOpacity
            style={styles.topBackBtn}
            onPress={() => navigate("c_kos")}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={styles.topCircleBtn}
              onPress={() => setIsImageModalOpen(true)}
              activeOpacity={0.8}
            >
              <Maximize2 size={17} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topCircleBtn} activeOpacity={0.8}>
              <Share2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topCircleBtn} activeOpacity={0.8}>
              <Heart size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Left & Right Chevron Navigation Buttons */}
          {galleryImages.length > 1 && (
            <>
              <TouchableOpacity
                style={styles.galleryNavBtnLeft}
                onPress={() =>
                  setActiveImageIndex((prev) =>
                    prev > 0 ? prev - 1 : galleryImages.length - 1
                  )
                }
                activeOpacity={0.85}
              >
                <ChevronLeft size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryNavBtnRight}
                onPress={() =>
                  setActiveImageIndex((prev) =>
                    prev < galleryImages.length - 1 ? prev + 1 : 0
                  )
                }
                activeOpacity={0.85}
              >
                <ChevronRight size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}

          {/* Photo Counter Badge */}
          {galleryImages.length > 1 && (
            <TouchableOpacity
              style={styles.photoCountBadge}
              onPress={() => setIsImageModalOpen(true)}
              activeOpacity={0.85}
            >
              <Images size={13} color="#FFFFFF" />
              <Text style={styles.photoCountBadgeText}>
                {activeImageIndex + 1} / {galleryImages.length} Foto
              </Text>
            </TouchableOpacity>
          )}

          {/* Hero Overlay Details (Badges & Title) */}
          <View style={styles.heroOverlayContent}>
            <View style={styles.heroBadgesRow}>
              <View style={styles.badgePutra}>
                <Building2 size={11} color="#FFFFFF" />
                <Text style={styles.badgePutraText}>{kostData?.type || "Campur"}</Text>
              </View>

              <View
                style={[
                  styles.badgeSisaKamar,
                  roomsList.filter((r) => r.isAvailable).length === 0 && {
                    backgroundColor: "#DC2626",
                  },
                ]}
              >
                <Text style={styles.badgeSisaKamarText}>
                  {roomsList.filter((r) => r.isAvailable).length === 0
                    ? "Kamar Penuh"
                    : `${roomsList.filter((r) => r.isAvailable).length} Kamar Tersedia`}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{kostData?.name || "Kost Pilihan"}</Text>
          </View>
        </View>

        {/* Thumbnail Selector Strip (if more than 1 photo) */}
        {galleryImages.length > 1 && (
          <View style={styles.thumbStripContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStripScroll}
            >
              {galleryImages.map((imgUri, idx) => {
                const isActive = idx === activeImageIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setActiveImageIndex(idx)}
                    style={[
                      styles.thumbItemBox,
                      isActive && styles.thumbItemBoxActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: imgUri }} style={styles.thumbImg} />
                    {isActive && (
                      <View style={styles.thumbActiveBadge}>
                        <Check size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <View style={styles.thumbIdxTag}>
                      <Text style={styles.thumbIdxTagText}>{idx + 1}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Content Body */}
        <View style={styles.bodyContainer}>
          {/* Location & Rating */}
          <View style={styles.locationRow}>
            <MapPin size={15} color="#6B7280" />
            <Text style={styles.locationText}>{kostData?.address || "Alamat Kost"}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Star size={15} color="#EAB308" fill="#EAB308" />
            <Text style={styles.ratingVal}>{kostData?.rating || "5.0"}</Text>
            <Text style={styles.reviewsText}>
              ({(kostData?.reviewCount ?? 0) > 0 ? `${kostData?.reviewCount} ulasan` : "Belum ada ulasan"})
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.responsiveOwnerText}>Pemilik Terverifikasi</Text>
            </TouchableOpacity>
          </View>

          {/* PILIHAN TIPE KAMAR SECTION (THIN CARDS + ACCORDION DETAIL + SEARCH) */}
          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Pilihan Tipe Kamar</Text>
              <Text style={{ fontSize: 12, color: "#0D7A53", fontWeight: "700" }}>{filteredRoomsList.length} Tipe Kamar</Text>
            </View>

            {/* Room Search Input Bar */}
            <View style={styles.roomSearchBox}>
              <Search size={16} color="#0D7A53" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.roomSearchInput}
                placeholder="Cari nama / nomor kamar (cth: 1A, 2A) atau fasilitas..."
                placeholderTextColor="#9CA3AF"
                value={roomSearchQuery}
                onChangeText={setRoomSearchQuery}
                clearButtonMode="while-editing"
              />
              {roomSearchQuery.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setRoomSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ padding: 4 }}
                >
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {roomsList.length === 0 ? (
              <View style={{ padding: 20, backgroundColor: "#F9FAFB", borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Building2 size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 4 }}>
                  Belum Ada Kamar Terdaftar
                </Text>
                <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18 }}>
                  Pemilik kost belum menambahkan tipe atau nomor kamar untuk properti ini.
                </Text>
              </View>
            ) : filteredRoomsList.length === 0 ? (
              <View style={{ padding: 20, backgroundColor: "#F9FAFB", borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Search size={28} color="#9CA3AF" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 4 }}>
                  Kamar Tidak Ditemukan
                </Text>
                <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
                  Tidak ada kamar yang cocok dengan kata kunci "{roomSearchQuery}".
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {filteredRoomsList.map((room: any) => {
                  const cleanRoomNum = String(room.roomNumber || "101").replace(/^(Kamar\s*)+/gi, "").trim() || "101";
                  const isSelected = selectedRoom?.roomNumber === room.roomNumber || selectedRoom?.roomNumber === cleanRoomNum;
                  const isExpanded = expandedRoomNumber === cleanRoomNum;
                  const roomImgs = Array.isArray(room.images) ? room.images : [];
                  const isAvail = room.isAvailable !== false;

                  const roomFacs: string[] = Array.isArray(room.facilities) ? room.facilities : [];
                  const hasListrik = roomFacs.some((f) => (f || "").toLowerCase().includes("listrik"));
                  const hasAir = roomFacs.some((f) => (f || "").toLowerCase().includes("air"));

                  let inclusionText = "Belum Termasuk Listrik/Air";
                  if (hasListrik && hasAir) {
                    inclusionText = "Termasuk Listrik & Air";
                  } else if (hasListrik) {
                    inclusionText = "Termasuk Listrik (Air Mandiri)";
                  } else if (hasAir) {
                    inclusionText = "Termasuk Air (Listrik Token/Mandiri)";
                  }

                  return (
                    <View
                      key={room._id || room.roomNumber || cleanRoomNum}
                      style={[
                        styles.thinRoomCard,
                        isSelected && styles.thinRoomCardSelected,
                        !isAvail && styles.thinRoomCardDisabled,
                      ]}
                    >
                      {/* Compact / Thin Header: Always visible */}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => {
                          if (isAvail) {
                            setSelectedRoom(room);
                          }
                          // Toggle accordion expansion on click
                          setExpandedRoomNumber((prev) => (prev === cleanRoomNum ? null : cleanRoomNum));
                          if (roomImgs.length > 0) {
                            const foundIdx = galleryImages.indexOf(roomImgs[0]);
                            if (foundIdx >= 0) setActiveImageIndex(foundIdx);
                          }
                        }}
                        style={styles.thinRoomCardHeader}
                      >
                        {/* Left Side: Room Name, Type, Compact Facilities & Avail Badge */}
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            <View style={[styles.thinRoomTag, !isAvail && { backgroundColor: "#FEE2E2" }]}>
                              <Text style={[styles.thinRoomTagText, !isAvail && { color: "#DC2626" }]}>
                                Kamar {cleanRoomNum}
                              </Text>
                            </View>
                            <Text style={[styles.thinRoomTypeTitle, isSelected && { color: "#0D7A53" }]}>
                              {room.roomType || "Standard"}
                            </Text>
                            <View style={[styles.thinAvailBadge, isAvail ? styles.availGreen : styles.availRed]}>
                              <Text style={[styles.thinAvailText, { color: isAvail ? "#0D7A53" : "#DC2626" }]}>
                                {isAvail ? "● Tersedia" : "● Penuh"}
                              </Text>
                            </View>
                          </View>

                          {/* Minimal Facilities Preview */}
                          {roomFacs.length > 0 && (
                            <View style={styles.thinFacRow}>
                              {roomFacs
                                .slice(0, 3)
                                .map((fac: any, idx: number) => (
                                  <View key={idx} style={styles.thinFacChip}>
                                    <Text style={styles.thinFacChipText}>{fac}</Text>
                                  </View>
                                ))}
                              {roomImgs.length > 0 && (
                                <View style={styles.thinPhotoCountPill}>
                                  <Images size={10} color="#0D7A53" />
                                  <Text style={styles.thinPhotoCountText}>{roomImgs.length} Foto</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>

                        {/* Right Side: Price & Expand Toggle Button */}
                        <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
                          <Text style={styles.thinPriceVal}>
                            Rp {Number(room.priceMonthly || kostData?.price || 0).toLocaleString("id-ID")}
                          </Text>
                          <Text style={styles.thinPriceUnit}>/ bulan</Text>
                          
                          <View style={styles.expandToggleBtn}>
                            <Text style={styles.expandToggleText}>
                              {isExpanded ? "Tutup" : "Detail"}
                            </Text>
                            {isExpanded ? (
                              <ChevronUp size={14} color="#0D7A53" />
                            ) : (
                              <ChevronDown size={14} color="#0D7A53" />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* EXPANDED SECTION (DITAMPILKAN KETIKA KOTAK DIKLIK) */}
                      {isExpanded && (
                        <View style={styles.expandedRoomBody}>
                          <View style={styles.expandedDivider} />

                          {/* Floor & Inclusion Info (REAL DATA) */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <Info size={14} color="#0D7A53" />
                            <Text style={styles.expandedFloorText}>
                              Lantai {room.floor || 1} • {inclusionText} • Siap Huni
                            </Text>
                          </View>

                          {/* Foto-Foto Kamar (Scroll Horizontal + Click to Zoom) */}
                          {roomImgs.length > 0 ? (
                            <View style={{ marginBottom: 12 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <Text style={styles.expandedSubTitle}>Foto Kamar ({roomImgs.length})</Text>
                                <Text style={{ fontSize: 11, color: "#6B7280" }}>Ketuk foto untuk perbesar</Text>
                              </View>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                              >
                                {roomImgs.map((rImg: string, rIdx: number) => (
                                  <TouchableOpacity
                                    key={rIdx}
                                    onPress={() => {
                                      setSelectedRoom(room);
                                      const gIdx = galleryImages.indexOf(rImg);
                                      if (gIdx >= 0) {
                                        setActiveImageIndex(gIdx);
                                      }
                                      setIsImageModalOpen(true);
                                    }}
                                    style={styles.expandedPhotoWrap}
                                    activeOpacity={0.85}
                                  >
                                    <Image source={{ uri: rImg }} style={styles.expandedPhotoImg} />
                                    <View style={styles.expandedZoomTag}>
                                      <Maximize2 size={10} color="#FFFFFF" />
                                    </View>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          ) : (
                            <View style={{ padding: 10, backgroundColor: "#F9FAFB", borderRadius: 8, marginBottom: 10, alignItems: "center" }}>
                              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Tidak ada foto khusus untuk kamar ini.</Text>
                            </View>
                          )}

                          {/* Fasilitas Kamar Lengkap */}
                          {room.facilities && room.facilities.length > 0 && (
                            <View style={{ marginBottom: 14 }}>
                              <Text style={styles.expandedSubTitle}>Fasilitas Kamar</Text>
                              <View style={styles.expandedFacsWrap}>
                                {room.facilities.map((fac: string, fIdx: number) => {
                                  const IconComp = getFacilityIcon(fac);
                                  return (
                                    <View key={fIdx} style={styles.expandedFacBadge}>
                                      <IconComp size={13} color="#0D7A53" />
                                      <Text style={styles.expandedFacBadgeText}>{fac}</Text>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          )}

                          {/* Action Button: Pilih Kamar Ini */}
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            {isAvail ? (
                              <TouchableOpacity
                                style={[
                                  styles.btnSelectThisRoom,
                                  isSelected && styles.btnSelectedRoomActive,
                                ]}
                                onPress={() => {
                                  setSelectedRoom(room);
                                }}
                                activeOpacity={0.85}
                              >
                                <Check size={15} color={isSelected ? "#0D7A53" : "#FFFFFF"} />
                                <Text
                                  style={[
                                    styles.btnSelectThisRoomText,
                                    isSelected && { color: "#0D7A53" },
                                  ]}
                                >
                                  {isSelected ? "Kamar Telah Dipilih" : "Pilih Kamar Ini"}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.badgeRoomFull}>
                                <Text style={styles.badgeRoomFullText}>Kamar Sudah Terisi (Penuh)</Text>
                              </View>
                            )}

                            <TouchableOpacity
                              onPress={() => setExpandedRoomNumber(null)}
                              style={styles.btnCloseExpand}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.btnCloseExpandText}>Tutup</Text>
                              <ChevronUp size={13} color="#6B7280" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* FASILITAS BERSAMA SECTION (REAL DARI PEMILIK KOS) */}
          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Fasilitas Bersama</Text>
              <Text style={{ fontSize: 12, color: "#0D7A53", fontWeight: "700" }}>{sharedFacilities.length} Fasilitas</Text>
            </View>

            {sharedFacilities.length === 0 ? (
              <View style={{ padding: 16, backgroundColor: "#F9FAFB", borderRadius: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Pemilik kos belum menambahkan fasilitas bersama.</Text>
              </View>
            ) : (
              <View style={styles.facilitiesGrid}>
                {sharedFacilities.map((fac: string, idx: number) => {
                  const IconComp = getFacilityIcon(fac);
                  return (
                    <View key={idx} style={styles.facilityCard}>
                      <View style={styles.facilityIconCircle}>
                        <IconComp size={18} color="#0D7A53" />
                      </View>
                      <Text style={styles.facilityCardName} numberOfLines={2}>{fac}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Deskripsi Kos */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Deskripsi Kos</Text>
            <Text style={styles.descText}>
              {kostData?.description || "Kos eksklusif nyaman, bersih, aman, dan berfasilitas lengkap untuk mahasiswa & pekerja."}
            </Text>
          </View>

          {/* PERATURAN KOS (REAL DARI PEMILIK KOS) */}
          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Peraturan Kos</Text>
              <Text style={{ fontSize: 12, color: "#0D7A53", fontWeight: "700" }}>{kosRules.length} Peraturan</Text>
            </View>

            {kosRules.length === 0 ? (
              <View style={{ padding: 16, backgroundColor: "#F9FAFB", borderRadius: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Belum ada peraturan khusus dari pemilik kos.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {kosRules.map((rule: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <Text style={{ fontSize: 12, color: "#0D7A53", fontWeight: "800", marginTop: 1 }}>•</Text>
                    <Text style={{ fontSize: 13, color: "#4B5563", flex: 1, lineHeight: 18 }}>{rule}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Lokasi & Alamat */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Lokasi</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <MapPin size={16} color="#0D7A53" />
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600" }}>{kostData?.address || "Bogor"}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

        {/* Fixed Bottom Action Bar */}
        <SafeAreaBottomBar absolute style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomPriceLabel}>
              Kamar {String(selectedRoom?.roomNumber || "Pilihan").replace(/^(Kamar\s*)+/gi, "")}
            </Text>
            <Text style={styles.bottomPriceVal}>
              Rp {Number(pricePerMonth).toLocaleString("id-ID")}{" "}
              <Text style={styles.bottomPriceUnit}>/ bln</Text>
            </Text>
          </View>

          <View style={styles.bottomActionsRight}>
            <TouchableOpacity style={styles.btnChatSquare} onPress={() => bookingResponse?.bookingCode ? setChatVisible(true) : Alert.alert("Chat setelah booking", "Chat pemilik tersedia setelah booking kos berhasil dibuat.")} activeOpacity={0.8}>
              <MessageCircle size={20} color="#0D7A53" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnBookingDp,
                (!selectedRoom || selectedRoom.isAvailable === false) && { backgroundColor: "#9CA3AF" },
              ]}
              onPress={() => {
                if (!selectedRoom || selectedRoom.isAvailable === false) {
                  Alert.alert(
                    "Kamar Terisi Penuh",
                    "Kamar ini sudah terisi oleh penghuni lain. Silakan pilih tipe kamar yang masih berstatus 'Tersedia'."
                  );
                  return;
                }
                setIsBookingModalOpen(true);
              }}
              disabled={!selectedRoom || selectedRoom.isAvailable === false}
              activeOpacity={0.85}
            >
              <Text style={styles.btnBookingDpText}>
                {!selectedRoom || selectedRoom.isAvailable === false ? "Kamar Penuh" : "Booking & DP"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaBottomBar>

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
                  <TouchableOpacity
                    style={styles.datePickerInputBtn}
                    onPress={() => {
                      if (startDate) {
                        const parts = startDate.split("-");
                        if (parts.length === 3) {
                          setCalYear(parseInt(parts[0]) || 2026);
                          setCalMonth((parseInt(parts[1]) || 9) - 1);
                          setSelectedDay(parseInt(parts[2]) || 1);
                        }
                      }
                      setIsDatePickerOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.datePickerInputText}>
                      {startDate || "Pilih Tanggal"}
                    </Text>
                    <View style={styles.datePickerIconCircle}>
                      <Calendar size={15} color="#0D7A53" />
                    </View>
                  </TouchableOpacity>
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
              {/* Info Pembayaran DP Pemilik (Eksklusif: QRIS atau Rekening Bank) */}
              <View style={styles.bankAccountCard}>
                {kostData?.bankAccount?.paymentType === "qris" && kostData?.bankAccount?.qrisImage ? (
                  <>
                    <Text style={styles.bankAccountHeader}>
                      Scan QRIS Pembayaran DP ({kostData?.ownerId?.email || "aisk@gmail.com"}):
                    </Text>
                    <View style={{ alignItems: "center", backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#DCFCE7", marginVertical: 8 }}>
                      <Image
                        source={{ uri: kostData.bankAccount.qrisImage }}
                        style={{ width: 180, height: 180, borderRadius: 10 }}
                        resizeMode="contain"
                      />
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginTop: 8 }}>
                        a.n. {kostData?.bankAccount?.accountHolder || kostData?.name || "Ais Kost"}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: "#6B7280", marginTop: 2, textAlign: "center" }}>
                        Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay
                      </Text>
                    </View>
                    <View style={[styles.bankDetailRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                      <Text style={styles.bankLabel}>Nominal DP (20%)</Text>
                      <Text style={[styles.bankValue, { color: "#0D7A53", fontWeight: "900", fontSize: 16 }]}>
                        Rp {dpAmount.toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.bankAccountHeader}>
                      Transfer Rekening Pemilik ({kostData?.ownerId?.email || "aisk@gmail.com"}):
                    </Text>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankLabel}>Bank</Text>
                      <Text style={styles.bankValue}>{kostData?.bankAccount?.bankName || "BCA (Bank Central Asia)"}</Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankLabel}>No. Rekening</Text>
                      <Text style={[styles.bankValue, { color: "#0D7A53", fontSize: 16, fontWeight: "900" }]}>
                        {kostData?.bankAccount?.accountNumber || "7720192841"}
                      </Text>
                    </View>
                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankLabel}>Atas Nama</Text>
                      <Text style={styles.bankValue}>
                        {kostData?.bankAccount?.accountHolder || kostData?.name || "Ais Kost Management"}
                      </Text>
                    </View>
                    <View style={[styles.bankDetailRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                      <Text style={styles.bankLabel}>Jumlah DP (20%)</Text>
                      <Text style={[styles.bankValue, { color: "#0D7A53", fontWeight: "900", fontSize: 16 }]}>
                        Rp {dpAmount.toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </>
                )}
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
                  {isUploadingProof ? (
                    <View style={{ alignItems: "center", padding: 25 }}>
                      <ActivityIndicator size="small" color="#0D7A53" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#0D7A53", marginTop: 8 }}>
                        Mengunggah bukti ke Cloudinary...
                      </Text>
                    </View>
                  ) : proofImage ? (
                    <View style={{ width: "100%", alignItems: "center" }}>
                      <Image source={{ uri: proofImage }} style={styles.uploadedPreviewImg} />
                      <View style={styles.proofSuccessTag}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        <Text style={styles.proofSuccessTagText}>Tersimpan di Cloudinary</Text>
                      </View>
                    </View>
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

                {proofImage ? (
                  <TouchableOpacity
                    style={styles.changeProofBtn}
                    onPress={handlePickProofImage}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeProofText}>📷 Ganti Foto Bukti Transfer</Text>
                  </TouchableOpacity>
                ) : null}
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
              <TouchableOpacity style={styles.btnChatPemilik} onPress={() => bookingResponse?.bookingCode ? setChatVisible(true) : Alert.alert("Chat setelah booking", "Chat pemilik tersedia setelah booking kos berhasil dibuat.")} activeOpacity={0.8}>
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

      {/* Full-Screen Gallery Lightbox Modal */}
      <Modal visible={isImageModalOpen} transparent animationType="fade">
        <View style={styles.lightboxModalOverlay}>
          {/* Header Bar */}
          <View style={styles.lightboxHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Images size={18} color="#FFFFFF" />
              <Text style={styles.lightboxHeaderTitle}>
                Foto {activeImageIndex + 1} dari {galleryImages.length}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsImageModalOpen(false)}
              style={styles.lightboxCloseBtn}
              activeOpacity={0.7}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Main Full Image View */}
          <View style={styles.lightboxImageContainer}>
            <Image
              source={{ uri: currentImage }}
              style={styles.lightboxMainImage}
              resizeMode="contain"
            />

            {/* Left & Right Navigation in Modal */}
            {galleryImages.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.lightboxNavBtn, { left: 16 }]}
                  onPress={() =>
                    setActiveImageIndex((prev) =>
                      prev > 0 ? prev - 1 : galleryImages.length - 1
                    )
                  }
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={26} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.lightboxNavBtn, { right: 16 }]}
                  onPress={() =>
                    setActiveImageIndex((prev) =>
                      prev < galleryImages.length - 1 ? prev + 1 : 0
                    )
                  }
                  activeOpacity={0.8}
                >
                  <ChevronRight size={26} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Bottom Thumbnails Strip in Lightbox */}
          <View style={styles.lightboxBottomBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}
            >
              {galleryImages.map((imgUri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveImageIndex(idx)}
                  style={[
                    styles.lightboxThumbItem,
                    idx === activeImageIndex && styles.lightboxThumbItemActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: imgUri }} style={styles.lightboxThumbImg} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Material Design 3 Calendar Modal */}
      <Modal visible={isDatePickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.m3DatePickerOverlay}
          activeOpacity={1}
          onPress={() => setIsDatePickerOpen(false)}
        >
          <View style={styles.m3CalendarCard} onStartShouldSetResponder={() => true}>
            {/* Header Section */}
            <View style={styles.m3HeaderSection}>
              <Text style={styles.m3SelectLabel}>Pilih Tanggal Masuk Kos</Text>
              <Text style={styles.m3SelectedDateText}>
                {selectedDay} {monthNamesInd[calMonth]} {calYear}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.m3Divider} />

            {/* Calendar Body */}
            <View style={styles.m3CalendarBody}>
              {/* Month & Nav Row */}
              <View style={styles.m3MonthNavRow}>
                <Text style={styles.m3MonthTitleText}>
                  {monthNamesInd[calMonth]} {calYear}
                </Text>

                <View style={styles.m3NavArrowsRow}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.m3NavIconBtn} activeOpacity={0.7}>
                    <ChevronLeft size={20} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextMonth} style={styles.m3NavIconBtn} activeOpacity={0.7}>
                    <ChevronRight size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Headers Row (Min Sen Sel Rab Kam Jum Sab) */}
              <View style={styles.m3DayHeadersRow}>
                {daysOfWeekInd.map((d, idx) => (
                  <Text key={idx} style={styles.m3DayHeaderText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Grid of Days */}
              <View style={styles.m3DaysGrid}>
                {/* Blank padding cells */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <View key={`blank-${idx}`} style={styles.m3DayCell} />
                ))}

                {/* Day cells */}
                {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => {
                  const isSelected = selectedDay === dayNum;
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        styles.m3DayCell,
                        isSelected && styles.m3DayCellSelected,
                      ]}
                      onPress={() => setSelectedDay(dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.m3DayNumText,
                          isSelected && styles.m3DayNumTextSelected,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Actions Bar */}
            <View style={styles.m3ActionsRow}>
              <TouchableOpacity
                onPress={() => setIsDatePickerOpen(false)}
                style={styles.m3ActionBtnText}
                activeOpacity={0.7}
              >
                <Text style={styles.m3CancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleConfirmDate(selectedDay, calMonth, calYear)}
                style={styles.m3ActionBtnPrimary}
                activeOpacity={0.85}
              >
                <Text style={styles.m3OkText}>Pilih Tanggal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomerChatModal
        visible={chatVisible && Boolean(bookingResponse?.bookingCode)}
        onClose={() => setChatVisible(false)}
        orderId={bookingResponse?.bookingCode || ""}
        participantName="Ais Kost (aisk@gmail.com)"
        participantType="merchant"
        initialMessage="Halo Kak Aisyah, bukti DP sudah diterima dan sedang diverifikasi ya."
      />
    </ResponsiveSafeAreaView>
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

  // Room Search Bar
  roomSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  roomSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
    paddingVertical: 0,
  },

  // Thin Room Cards
  thinRoomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  thinRoomCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#FAFFFD",
  },
  thinRoomCardDisabled: {
    opacity: 0.65,
    backgroundColor: "#F9FAFB",
  },
  thinRoomCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thinRoomTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  thinRoomTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  thinRoomTypeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  thinAvailBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  thinAvailText: {
    fontSize: 10,
    fontWeight: "700",
  },
  thinFacRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  thinFacChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thinFacChipText: {
    fontSize: 9.5,
    color: "#4B5563",
    fontWeight: "600",
  },
  thinPhotoCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thinPhotoCountText: {
    fontSize: 9.5,
    color: "#0D7A53",
    fontWeight: "700",
  },
  thinPriceVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  thinPriceUnit: {
    fontSize: 9.5,
    color: "#6B7280",
  },
  expandToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F0FDF4",
  },
  expandToggleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Expanded Room Accordion Body
  expandedRoomBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#FCFDFD",
  },
  expandedDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },
  expandedFloorText: {
    fontSize: 11.5,
    color: "#4B5563",
    fontWeight: "600",
  },
  expandedSubTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  expandedPhotoWrap: {
    width: 90,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#E5E7EB",
  },
  expandedPhotoImg: {
    width: "100%",
    height: "100%",
  },
  expandedZoomTag: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 3,
    borderRadius: 4,
  },
  expandedFacsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  expandedFacBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandedFacBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  btnSelectThisRoom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnSelectedRoomActive: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  btnSelectThisRoomText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  badgeRoomFull: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeRoomFullText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  btnCloseExpand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  btnCloseExpandText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
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

  // Gallery Navigation & Badges
  galleryNavBtnLeft: {
    position: "absolute",
    left: 14,
    top: "45%",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  galleryNavBtnRight: {
    position: "absolute",
    right: 14,
    top: "45%",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 80,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    zIndex: 10,
  },
  photoCountBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Horizontal Thumbnail Strip
  thumbStripContainer: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  thumbStripScroll: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: "center",
  },
  thumbItemBox: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  thumbItemBoxActive: {
    borderColor: "#0D7A53",
    transform: [{ scale: 1.05 }],
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbActiveBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbIdxTag: {
    position: "absolute",
    bottom: 2,
    left: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  thumbIdxTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Room Photos Preview in Room Cards
  roomPhotosRow: {
    marginTop: 10,
    marginBottom: 4,
  },
  roomPhotoThumbWrap: {
    width: 68,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#E5E7EB",
  },
  roomPhotoThumb: {
    width: "100%",
    height: "100%",
  },
  roomPhotoCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  roomPhotoCountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Full Screen Lightbox Modal
  lightboxModalOverlay: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  lightboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  lightboxHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImageContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxMainImage: {
    width: "100%",
    height: "100%",
  },
  lightboxNavBtn: {
    position: "absolute",
    top: "45%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  lightboxBottomBar: {
    paddingVertical: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  lightboxThumbItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    opacity: 0.6,
  },
  lightboxThumbItemActive: {
    borderColor: "#10B981",
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  lightboxThumbImg: {
    width: "100%",
    height: "100%",
  },

  // Date Picker Input Button Styles
  datePickerInputBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 48,
  },
  datePickerInputText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  datePickerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  // Material 3 Date Picker Modal Styles
  m3DatePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  m3CalendarCard: {
    width: "100%",
    maxWidth: 330,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
  },
  m3HeaderSection: {
    marginBottom: 12,
  },
  m3SelectLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  m3SelectedDateText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0D7A53",
  },
  m3Divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },
  m3CalendarBody: {
    marginBottom: 12,
  },
  m3MonthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  m3MonthTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  m3NavArrowsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  m3NavIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  m3DayHeadersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  m3DayHeaderText: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  m3DaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  m3DayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginVertical: 2,
  },
  m3DayCellSelected: {
    backgroundColor: "#0D7A53",
    elevation: 2,
  },
  m3DayNumText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  m3DayNumTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  m3ActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  m3ActionBtnText: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  m3CancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  m3ActionBtnPrimary: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  m3OkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Proof Success Tag
  proofSuccessTag: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(13, 122, 83, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  proofSuccessTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

