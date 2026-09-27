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
  Building2,
  Tv,
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
  Shirt,
  Car,
  ShieldCheck,
  Search,
  Zap,
  Droplets,
  Snowflake,
  Fan,
  DoorClosed,
  Table,
  Armchair,
  Bath,
  CupSoda,
  Hotel,
  Ticket,
  Clock,
  Bike,
  Sparkles,
  TreePine,
  Waves,
  Gift,
} from "lucide-react-native";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";
import { createKostBooking, fetchAllKosts, fetchKostById } from "../../services/kostService";
import {
  getSelectedKost,
  SelectedKost,
  setActiveCustomerBooking,
  setSelectedKost,
  HotelRoomOption,
  WisataTicketOption,
  LodgingCategoryType,
} from "./customerKosStore";
import { AuthAccount } from "../auth/authTypes";
import { uploadFileToBackend } from "../../services/api";
import { rp } from "../../utils/formatters";

interface CustomerKosDetailProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const CustomerKosDetailScreen: React.FC<CustomerKosDetailProps> = ({ navigate, authAccount }) => {
  const [kostData, setKostData] = useState<SelectedKost | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedHotelRoom, setSelectedHotelRoom] = useState<HotelRoomOption | null>(null);
  const [selectedWisataTicket, setSelectedWisataTicket] = useState<WisataTicketOption | null>(null);

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
  const [nightCount, setNightCount] = useState("1");
  const [ticketCount, setTicketCount] = useState("1");

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
        if (stored.hotelRooms && stored.hotelRooms.length > 0) {
          setSelectedHotelRoom(stored.hotelRooms[0]);
        }
        if (stored.wisataTickets && stored.wisataTickets.length > 0) {
          setSelectedWisataTicket(stored.wisataTickets[0]);
        }
      }

      // Fetch fresh data from MongoDB backend if it's a kost ID
      try {
        const targetId = stored?._id || stored?.id;
        let freshKost = null;
        if (targetId && String(targetId).match(/^[0-9a-fA-F]{24}$/)) {
          freshKost = await fetchKostById(String(targetId));
        }

        if (freshKost) {
          setKostData((prev) => ({ ...prev, ...freshKost }));
          setSelectedKost({ ...(stored || {}), ...freshKost });
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

  const categoryType: LodgingCategoryType = kostData?.categoryType || "kost";

  // Compute all available gallery images
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
    if (name.includes("ac") || name.includes("panas")) return Snowflake;
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

  const sharedFacilities = React.useMemo(() => {
    return Array.isArray(kostData?.facilities) ? kostData.facilities.filter(Boolean) : [];
  }, [kostData]);

  const kosRules = React.useMemo(() => {
    return Array.isArray(kostData?.rules) ? kostData.rules.filter(Boolean) : [];
  }, [kostData]);

  // Price calculations according to category type
  const pricePerMonth = selectedRoom ? selectedRoom.priceMonthly : (kostData?.price || 950000);
  const durationNum = parseInt(durationMonths) || 1;
  const nightsNum = parseInt(nightCount) || 1;
  const ticketsNum = parseInt(ticketCount) || 1;

  const currentUnitCost =
    categoryType === "hotel"
      ? (selectedHotelRoom?.pricePerNight || kostData?.price || 685000)
      : categoryType === "wisata"
      ? (selectedWisataTicket?.price || kostData?.price || 45000)
      : pricePerMonth;

  const totalPrice =
    categoryType === "hotel"
      ? currentUnitCost * nightsNum
      : categoryType === "wisata"
      ? currentUnitCost * ticketsNum
      : pricePerMonth * durationNum;

  const dpAmount =
    categoryType === "wisata"
      ? totalPrice // 100% full payment for tickets
      : categoryType === "hotel"
      ? Math.round(totalPrice * 0.5) // 50% DP / booking guarantee for hotel
      : Math.round(totalPrice * 0.2); // 20% DP for kost

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
            setProofImage(uploadRes.data.url);
          }
        } catch (uploadErr) {
          console.warn("Upload proof error:", uploadErr);
        } finally {
          setIsUploadingProof(false);
        }
      }
    } catch (err) {
      console.log("Pick image error:", err);
    }
  };

  const saveBookingOrder = async () => {
    if (orderCreated) return;
    if (!proofImage) {
      Alert.alert(
        "Unggah Bukti Pembayaran",
        "Silakan unggah foto struk atau resi bukti transfer pembayaran terlebih dahulu."
      );
      return;
    }
    setIsSubmitting(true);

    const paymentName =
      selectedPayment === "bca_va"
        ? `BCA Transfer (${kostData?.bankAccount?.accountHolder || "GEOVERSE Management"})`
        : selectedPayment === "qris"
        ? "QRIS GEOVERSE"
        : selectedPayment === "gopay"
        ? "GoPay"
        : "ShopeePay";

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
        console.warn("Fallback upload error:", uploadErr);
      }
    }

    const orderPrefix = categoryType === "hotel" ? "HTL" : categoryType === "wisata" ? "WST" : "KOS";
    const orderId = `RNG-${orderPrefix}-${Date.now().toString().slice(-6)}`;
    const orderDetailText =
      categoryType === "hotel"
        ? `${selectedHotelRoom?.roomName || "Kamar Hotel"} • ${nightsNum} Malam`
        : categoryType === "wisata"
        ? `${selectedWisataTicket?.ticketName || "Tiket Wisata"} • ${ticketsNum} Tiket`
        : `${selectedRoom?.roomNumber ? `Kamar ${selectedRoom.roomNumber} (${selectedRoom.roomType})` : "Kamar Pilihan"} • ${durationNum} Bulan`;

    const order: OrderItem = {
      id: orderId,
      type: categoryType === "hotel" ? "Hotel" : categoryType === "wisata" ? "Wisata" : "Kos",
      iconName: categoryType === "hotel" ? "Hotel" : categoryType === "wisata" ? "Ticket" : "Building2",
      color: categoryType === "hotel" ? "#0284C7" : categoryType === "wisata" ? "#D97706" : "#0D7A53",
      item: kostData?.name || "Layanan GEOVERSE",
      detail: orderDetailText,
      status: "Pembayaran Terverifikasi",
      statusColor: "green",
      date: "Hari ini",
      total: totalPrice,
      paymentMethod: paymentName,
      paymentStatus: categoryType === "wisata" ? "Lunas" : "DP Terkirim",
      paidAmount: dpAmount,
      remainingAmount: totalPrice - dpAmount,
      address: kostData?.address || "Garut, Jawa Barat",
    };
    addCustomerOrder(order);

    // Save to customerKosStore active booking state for live customer tracking
    const activeObj = {
      _id: `booking_${Date.now()}`,
      bookingCode: `${orderPrefix}-${Date.now().toString().slice(-6)}`,
      categoryType: categoryType,
      customerName: tenantName || authAccount?.name || "Customer",
      customerPhone: phone || authAccount?.phone || "081234567890",
      customerEmail: email || authAccount?.email || "customer@geoverse.id",
      kostId: kostData?._id || "",
      kostName: kostData?.name || "Properti Pilihan",
      kostAddress: kostData?.address,
      kostImage: currentImage,
      roomNumber:
        categoryType === "hotel"
          ? selectedHotelRoom?.roomName || "Deluxe Room"
          : categoryType === "wisata"
          ? selectedWisataTicket?.ticketName || "Tiket Masuk"
          : selectedRoom?.roomNumber || "101",
      roomType:
        categoryType === "hotel"
          ? `${nightsNum} Malam`
          : categoryType === "wisata"
          ? `${ticketsNum} Tiket / Orang`
          : selectedRoom?.roomType || "AC Exclusive",
      entryDate: startDate,
      durationMonths: durationNum,
      durationNights: nightsNum,
      ticketCount: ticketsNum,
      monthlyPrice: currentUnitCost,
      totalAmount: totalPrice,
      dpAmount: dpAmount,
      dpProofImage: finalProofUrl,
      status: "dp_verified" as const,
      createdAt: new Date().toISOString(),
      ownerPhone: kostData?.bankAccount?.accountNumber || "087805987309",
      ownerName: kostData?.bankAccount?.accountHolder || kostData?.name || "Pengelola",
    };
    setActiveCustomerBooking(activeObj);
    setBookingResponse(activeObj);

    // Persist real booking to backend MongoDB database if kostId exists
    if (kostData?._id) {
      createKostBooking({
        customerId: authAccount?.id || authAccount?.email || "customer_1",
        kostId: String(kostData._id),
        categoryType: categoryType,
        roomId: selectedRoom?._id || selectedHotelRoom?.roomId || selectedWisataTicket?.ticketId,
        roomNumber: activeObj.roomNumber,
        customerName: activeObj.customerName,
        customerPhone: activeObj.customerPhone,
        customerEmail: activeObj.customerEmail,
        entryDate: startDate || new Date().toISOString(),
        durationMonths: durationNum,
        durationNights: nightsNum,
        ticketCount: ticketsNum,
        monthlyPrice: currentUnitCost,
        totalAmount: totalPrice,
        dpAmount: dpAmount,
        dpProofImage: finalProofUrl,
        notes: "",
      }).then((res) => {
        if (res && res.data) {
          const synced = { ...activeObj, _id: res.data._id, bookingCode: res.data.bookingCode };
          setActiveCustomerBooking(synced);
          setBookingResponse(synced);
        }
      }).catch((err) => {
        console.warn("Realtime DB Booking sync (handled):", err);
      });
    }

    setIsSubmitting(false);
    setOrderCreated(true);
    setIsReceiptModalOpen(true);
  };

  const roomsList = Array.isArray(kostData?.rooms) ? kostData.rooms : [];
  const hotelRoomsList = Array.isArray(kostData?.hotelRooms) ? kostData.hotelRooms : [];
  const wisataTicketsList = Array.isArray(kostData?.wisataTickets) ? kostData.wisataTickets : [];

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
              <View
                style={[
                  styles.badgePutra,
                  categoryType === "hotel"
                    ? { backgroundColor: "#0284C7" }
                    : categoryType === "wisata"
                    ? { backgroundColor: "#D97706" }
                    : { backgroundColor: "#0D7A53" },
                ]}
              >
                {categoryType === "hotel" ? (
                  <Hotel size={11} color="#FFFFFF" />
                ) : categoryType === "wisata" ? (
                  <Ticket size={11} color="#FFFFFF" />
                ) : (
                  <Building2 size={11} color="#FFFFFF" />
                )}
                <Text style={styles.badgePutraText}>
                  {categoryType === "hotel"
                    ? kostData?.type || "Hotel Bintang 4"
                    : categoryType === "wisata"
                    ? kostData?.type || "Wisata & Rekreasi"
                    : kostData?.type || "Campur"}
                </Text>
              </View>

              {kostData?.stars ? (
                <View style={styles.heroStarsBadge}>
                  {[...Array(kostData.stars)].map((_, i) => (
                    <Star key={i} size={11} color="#FBBF24" fill="#FBBF24" />
                  ))}
                </View>
              ) : null}

              {categoryType === "wisata" && kostData?.openHours ? (
                <View style={styles.heroOpenHoursBadge}>
                  <Clock size={11} color="#FFFFFF" />
                  <Text style={styles.heroOpenHoursText}>{kostData.openHours}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.heroTitle}>{kostData?.name || "Properti Pilihan"}</Text>
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
            <Text style={styles.locationText}>{kostData?.address || "Alamat Lokasi"}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Star size={15} color="#EAB308" fill="#EAB308" />
            <Text style={styles.ratingVal}>{kostData?.rating || "4.8"}</Text>
            <Text style={styles.reviewsText}>
              ({(kostData?.reviewCount ?? 0) > 0 ? `${kostData?.reviewCount} ulasan` : "Terverifikasi"})
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.responsiveOwnerText}>Mitra Resmi GEOVERSE</Text>
            </TouchableOpacity>
          </View>

          {/* ============================================================ */}
          {/* SECTIONS ADAPTED PER CATEGORY TYPE                           */}
          {/* ============================================================ */}

          {/* 1. HOTEL & VILLA ROOM CHOICES */}
          {categoryType === "hotel" && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Hotel size={18} color="#0284C7" />
                  <Text style={styles.sectionTitle}>Pilihan Kamar & Villa</Text>
                </View>
                <Text style={{ fontSize: 12, color: "#0284C7", fontWeight: "700" }}>
                  {hotelRoomsList.length} Pilihan Kamar
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {hotelRoomsList.map((hRoom, idx) => {
                  const isSelected = selectedHotelRoom?.roomName === hRoom.roomName;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.hotelRoomCard, isSelected && styles.hotelRoomCardSelected]}
                      onPress={() => setSelectedHotelRoom(hRoom)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.hotelRoomHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.hotelRoomTitle, isSelected && { color: "#0284C7" }]}>
                            {hRoom.roomName}
                          </Text>
                          <Text style={styles.hotelRoomSub}>
                            🛏️ {hRoom.bedType} • 👥 Kapasitas {hRoom.capacity} Tamu
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.hotelRoomPriceVal}>{rp(hRoom.pricePerNight)}</Text>
                          <Text style={styles.hotelRoomPriceUnit}>/ malam</Text>
                        </View>
                      </View>

                      {hRoom.breakfastIncluded && (
                        <View style={styles.breakfastBadge}>
                          <Utensils size={11} color="#15803D" />
                          <Text style={styles.breakfastBadgeText}>Termasuk Sarapan Gratis</Text>
                        </View>
                      )}

                      <View style={styles.hotelFacilitiesRow}>
                        {hRoom.facilities.map((fac, fIdx) => (
                          <View key={fIdx} style={styles.hotelFacChip}>
                            <Text style={styles.hotelFacChipText}>{fac}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.hotelRoomFooter}>
                        <View
                          style={[
                            styles.btnSelectHotelRoom,
                            isSelected && styles.btnSelectHotelRoomActive,
                          ]}
                        >
                          <Check size={14} color={isSelected ? "#FFFFFF" : "#0284C7"} />
                          <Text
                            style={[
                              styles.btnSelectHotelRoomText,
                              isSelected && { color: "#FFFFFF" },
                            ]}
                          >
                            {isSelected ? "Kamar Terpilih" : "Pilih Kamar Ini"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 2. WISATA TICKET PACKAGES & RIDE CTA */}
          {categoryType === "wisata" && (
            <>
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ticket size={18} color="#D97706" />
                    <Text style={styles.sectionTitle}>Pilihan Paket Tiket Masuk</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: "#D97706", fontWeight: "700" }}>
                    {wisataTicketsList.length} Paket Tiket
                  </Text>
                </View>

                <View style={{ gap: 10 }}>
                  {wisataTicketsList.map((tkt, idx) => {
                    const isSelected = selectedWisataTicket?.ticketName === tkt.ticketName;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.wisataTicketCard, isSelected && styles.wisataTicketCardSelected]}
                        onPress={() => setSelectedWisataTicket(tkt)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.ticketCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.ticketTypePill}>
                              <Text style={styles.ticketTypePillText}>{tkt.ticketType.toUpperCase()}</Text>
                            </View>
                            <Text style={[styles.ticketNameTitle, isSelected && { color: "#D97706" }]}>
                              {tkt.ticketName}
                            </Text>
                            <Text style={styles.ticketDescText}>{tkt.description}</Text>
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.ticketPriceVal}>{rp(tkt.price)}</Text>
                            <Text style={styles.ticketPriceUnit}>/ orang</Text>
                          </View>
                        </View>

                        <View style={styles.ticketFacsRow}>
                          {tkt.includedFacilities.map((inc, iIdx) => (
                            <View key={iIdx} style={styles.ticketFacChip}>
                              <CheckCircle2 size={11} color="#D97706" />
                              <Text style={styles.ticketFacChipText}>{inc}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.ticketCardFooter}>
                          <View
                            style={[
                              styles.btnSelectTicket,
                              isSelected && styles.btnSelectTicketActive,
                            ]}
                          >
                            <Check size={14} color={isSelected ? "#FFFFFF" : "#D97706"} />
                            <Text
                              style={[
                                styles.btnSelectTicketText,
                                isSelected && { color: "#FFFFFF" },
                              ]}
                            >
                              {isSelected ? "Tiket Terpilih" : "Pilih Paket Tiket Ini"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Seamless Kanyaah Ride Integration Banner */}
              <View style={styles.rideIntegrationCard}>
                <View style={styles.rideIconCircle}>
                  <Bike size={24} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rideCardTitle}>Butuh Antar-Jemput ke Lokasi?</Text>
                  <Text style={styles.rideCardSub}>
                    Pesan driver Kanyaah Ride langsung dari rumah Anda menuju {kostData?.name} dengan tarif hemat!
                  </Text>
                  <TouchableOpacity
                    style={styles.btnOrderRideNow}
                    onPress={() => navigate("c_ride")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnOrderRideNowText}>Pesan Kanyaah Ride Sekarang</Text>
                    <ChevronRight size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* 3. KOST ROOMS LIST (STANDARD KOST FLOW) */}
          {categoryType === "kost" && (
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
                />
                {roomSearchQuery.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={() => setRoomSearchQuery("")}
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
                    Kamar Tersedia
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18 }}>
                    Kamar standar nyaman dengan kasur, lemari, WiFi, dan kamar mandi dalam.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {filteredRoomsList.map((room: any) => {
                    const cleanRoomNum = String(room.roomNumber || "101").replace(/^(Kamar\s*)+/gi, "").trim() || "101";
                    const isSelected = selectedRoom?.roomNumber === room.roomNumber || selectedRoom?.roomNumber === cleanRoomNum;
                    const isAvail = room.isAvailable !== false;
                    const roomFacs: string[] = Array.isArray(room.facilities) ? room.facilities : [];

                    return (
                      <View
                        key={room._id || room.roomNumber || cleanRoomNum}
                        style={[
                          styles.thinRoomCard,
                          isSelected && styles.thinRoomCardSelected,
                          !isAvail && styles.thinRoomCardDisabled,
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => {
                            if (isAvail) setSelectedRoom(room);
                            setExpandedRoomNumber((prev) => (prev === cleanRoomNum ? null : cleanRoomNum));
                          }}
                          style={styles.thinRoomCardHeader}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <View style={[styles.thinRoomTag, !isAvail && { backgroundColor: "#FEE2E2" }]}>
                                <Text style={[styles.thinRoomTagText, !isAvail && { color: "#DC2626" }]}>
                                  Kamar {cleanRoomNum}
                                </Text>
                              </View>
                              <Text style={[styles.thinRoomTypeTitle, isSelected && { color: "#0D7A53" }]}>
                                {room.roomType || "Standard"}
                              </Text>
                            </View>

                            {roomFacs.length > 0 && (
                              <View style={styles.thinFacRow}>
                                {roomFacs.slice(0, 3).map((fac: any, idx: number) => (
                                  <View key={idx} style={styles.thinFacChip}>
                                    <Text style={styles.thinFacChipText}>{fac}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>

                          <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
                            <Text style={styles.thinPriceVal}>
                              {rp(room.priceMonthly || kostData?.price || 0)}
                            </Text>
                            <Text style={styles.thinPriceUnit}>/ bulan</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* FASILITAS BERSAMA SECTION */}
          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Fasilitas & Layanan Unggulan</Text>
              <Text style={{ fontSize: 12, color: "#0D7A53", fontWeight: "700" }}>{sharedFacilities.length} Fasilitas</Text>
            </View>

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
          </View>

          {/* Deskripsi */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Deskripsi</Text>
            <Text style={styles.descText}>
              {kostData?.description || "Akomodasi dan destinasi terverifikasi resmi oleh tim GEOVERSE untuk kenyamanan dan keamanan Anda."}
            </Text>
          </View>

          {/* Lokasi & Alamat */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Lokasi</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <MapPin size={16} color="#0D7A53" />
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600" }}>{kostData?.address || "Garut, Jawa Barat"}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <SafeAreaBottomBar absolute style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>
            {categoryType === "hotel"
              ? selectedHotelRoom?.roomName || "Kamar Hotel"
              : categoryType === "wisata"
              ? selectedWisataTicket?.ticketName || "Tiket Masuk"
              : `Kamar ${String(selectedRoom?.roomNumber || "Pilihan").replace(/^(Kamar\s*)+/gi, "")}`}
          </Text>
          <Text style={styles.bottomPriceVal}>
            {rp(currentUnitCost)}{" "}
            <Text style={styles.bottomPriceUnit}>
              {categoryType === "hotel" ? "/ malam" : categoryType === "wisata" ? "/ tiket" : "/ bln"}
            </Text>
          </Text>
        </View>

        <View style={styles.bottomActionsRight}>
          <TouchableOpacity
            style={styles.btnChatSquare}
            onPress={() => setChatVisible(true)}
            activeOpacity={0.8}
          >
            <MessageCircle size={20} color="#0D7A53" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnBookingDp,
              categoryType === "hotel" && { backgroundColor: "#0284C7" },
              categoryType === "wisata" && { backgroundColor: "#D97706" },
            ]}
            onPress={() => setIsBookingModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnBookingDpText}>
              {categoryType === "hotel"
                ? "Pesan Kamar Hotel"
                : categoryType === "wisata"
                ? "Beli Tiket Masuk"
                : "Booking & DP"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaBottomBar>

      {/* Form Booking Modal (Bottom Sheet) */}
      <Modal visible={isBookingModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {categoryType === "hotel"
                    ? "Form Reservasi Hotel"
                    : categoryType === "wisata"
                    ? "Form Pembelian Tiket Wisata"
                    : "Form Booking Kamar Kos"}
                </Text>
                <Text style={styles.sheetSub}>Konfirmasi instan & aman lewat aplikasi GEOVERSE</Text>
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
              {/* Summary Box */}
              <View style={styles.merchantSummaryBox}>
                <View style={styles.merchantThumbBox}>
                  {categoryType === "hotel" ? (
                    <Hotel size={24} color="#0284C7" />
                  ) : categoryType === "wisata" ? (
                    <Ticket size={24} color="#D97706" />
                  ) : (
                    <Building2 size={24} color="#0D7A53" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantSummaryTitle}>{kostData?.name || "Properti Pilihan"}</Text>
                  <Text style={styles.merchantSummaryRoomText}>
                    {categoryType === "hotel"
                      ? selectedHotelRoom?.roomName || "Superior Room"
                      : categoryType === "wisata"
                      ? selectedWisataTicket?.ticketName || "Tiket Masuk"
                      : `Kamar ${selectedRoom?.roomNumber || "101"} (${selectedRoom?.roomType || "Standar"})`}
                  </Text>
                  <Text style={styles.merchantSummaryPrice}>
                    {rp(currentUnitCost)}{" "}
                    {categoryType === "hotel" ? "/ malam" : categoryType === "wisata" ? "/ tiket" : "/ bulan"}
                  </Text>
                </View>
              </View>

              {/* Field: Nama Pemesan */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Lengkap Pemesan</Text>
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

              {/* Field: No WhatsApp */}
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

              {/* Field: Tanggal & Durasi/Jumlah */}
              <View style={styles.gridTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    {categoryType === "hotel"
                      ? "Tgl Check-in"
                      : categoryType === "wisata"
                      ? "Tgl Kunjungan"
                      : "Tgl Masuk Kos"}
                  </Text>
                  <TouchableOpacity
                    style={styles.datePickerInputBtn}
                    onPress={() => setIsDatePickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.datePickerInputText}>{startDate || "Pilih Tanggal"}</Text>
                    <Calendar size={15} color="#0D7A53" />
                  </TouchableOpacity>
                </View>

                <View style={{ width: 120 }}>
                  <Text style={styles.fieldLabel}>
                    {categoryType === "hotel"
                      ? "Durasi Malam"
                      : categoryType === "wisata"
                      ? "Jumlah Tiket"
                      : "Durasi Sewa"}
                  </Text>
                  <View style={styles.inputContainerRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={
                        categoryType === "hotel"
                          ? nightCount
                          : categoryType === "wisata"
                          ? ticketCount
                          : durationMonths
                      }
                      onChangeText={(t) => {
                        if (categoryType === "hotel") setNightCount(t);
                        else if (categoryType === "wisata") setTicketCount(t);
                        else setDurationMonths(t);
                      }}
                      keyboardType="number-pad"
                    />
                    <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700" }}>
                      {categoryType === "hotel" ? "Malam" : categoryType === "wisata" ? "Tiket" : "Bulan"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Price Calculation Box */}
              <View style={styles.priceCalcBlock}>
                <View style={styles.priceCalcRow}>
                  <Text style={styles.calcLabel}>Total Pembayaran</Text>
                  <Text style={styles.calcVal}>{rp(totalPrice)}</Text>
                </View>

                <View style={styles.dpBoxGreen}>
                  <View style={styles.dpBoxLeft}>
                    <Wallet size={18} color="#0D7A53" />
                    <Text style={styles.dpBoxLabel}>
                      {categoryType === "wisata" ? "Total Bayar (Lunas)" : "Uang Muka / DP"}
                    </Text>
                  </View>
                  <Text style={styles.dpBoxVal}>{rp(dpAmount)}</Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.btnPayDp}
                onPress={() => {
                  setIsBookingModalOpen(false);
                  setIsPaymentModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPayDpText}>
                  Lanjut Bayar: {rp(dpAmount)}
                </Text>
                <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: "180deg" }] }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment & Proof Upload Modal */}
      <Modal visible={isPaymentModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.sheetCard}>
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
              <Text style={styles.sheetTitle}>Pembayaran Resmi</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <View style={styles.bankAccountCard}>
                <Text style={styles.bankAccountHeader}>Transfer Rekening / Virtual Account:</Text>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{kostData?.bankAccount?.bankName || "BCA (Bank Central Asia)"}</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>No. Rekening</Text>
                  <Text style={[styles.bankValue, { color: "#0D7A53", fontSize: 16, fontWeight: "900" }]}>
                    {kostData?.bankAccount?.accountNumber || "8472910394"}
                  </Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Atas Nama</Text>
                  <Text style={styles.bankValue}>{kostData?.bankAccount?.accountHolder || "GEOVERSE INDONESIA"}</Text>
                </View>
                <View style={[styles.bankDetailRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                  <Text style={styles.bankLabel}>Nominal Pembayaran</Text>
                  <Text style={[styles.bankValue, { color: "#0D7A53", fontWeight: "900", fontSize: 16 }]}>
                    {rp(dpAmount)}
                  </Text>
                </View>
              </View>

              {/* Upload Struk Proof */}
              <View style={styles.uploadProofSection}>
                <Text style={styles.uploadProofTitle}>Unggah Bukti Transfer / Resi</Text>
                <TouchableOpacity
                  style={styles.uploadImageBox}
                  onPress={handlePickProofImage}
                  activeOpacity={0.8}
                >
                  {isUploadingProof ? (
                    <ActivityIndicator size="small" color="#0D7A53" />
                  ) : proofImage ? (
                    <Image source={{ uri: proofImage }} style={{ width: "100%", height: 140, borderRadius: 10 }} />
                  ) : (
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <Upload size={24} color="#0D7A53" />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#0D7A53" }}>
                        Ketuk untuk Pilih Foto Bukti Transfer
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.btnPayDp, isSubmitting && { opacity: 0.7 }]}
                onPress={saveBookingOrder}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPayDpText}>Konfirmasi Pembayaran</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt / E-Ticket Modal */}
      <Modal visible={isReceiptModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {categoryType === "wisata" ? "E-Ticket Masuk Wisata" : "Bukti Pemesanan Resmi"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsReceiptModalOpen(false);
                  navigate("c_kos");
                }}
                style={styles.sheetCloseBtn}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <View style={styles.receiptBox}>
                <View style={styles.receiptTopHeader}>
                  <Text style={styles.receiptBrand}>GEOVERSE</Text>
                  <Text style={styles.receiptTypeBadge}>
                    ✓ {categoryType === "wisata" ? "E-TICKET RESMI" : "PEMESANAN TERVERIFIKASI"}
                  </Text>
                </View>

                <View style={styles.receiptDetails}>
                  <Text style={styles.receiptPlaceTitle}>{kostData?.name}</Text>
                  <Text style={styles.receiptSubInfo}>
                    {categoryType === "hotel"
                      ? `${selectedHotelRoom?.roomName} • ${nightsNum} Malam`
                      : categoryType === "wisata"
                      ? `${selectedWisataTicket?.ticketName} • ${ticketsNum} Tiket`
                      : `Kamar ${selectedRoom?.roomNumber} • ${durationNum} Bulan`}
                  </Text>
                  <Text style={styles.receiptDateInfo}>Tgl: {startDate}</Text>
                  <Text style={styles.receiptCustomerInfo}>Pemesan: {tenantName}</Text>

                  <View style={styles.receiptPriceHighlight}>
                    <Text style={{ fontSize: 12, color: "#166534", fontWeight: "700" }}>Total Terbayar:</Text>
                    <Text style={{ fontSize: 16, color: "#166534", fontWeight: "900" }}>{rp(dpAmount)}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnPayDp}
                onPress={() => {
                  setIsReceiptModalOpen(false);
                  navigate("c_kos");
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPayDpText}>Selesai & Kembali ke Beranda</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lightbox Modal */}
      <Modal visible={isImageModalOpen} transparent animationType="fade">
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setIsImageModalOpen(false)}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Image source={{ uri: currentImage }} style={styles.lightboxImage} resizeMode="contain" />
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={isDatePickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.m3DatePickerOverlay}
          activeOpacity={1}
          onPress={() => setIsDatePickerOpen(false)}
        >
          <View style={styles.m3CalendarCard} onStartShouldSetResponder={() => true}>
            <View style={styles.m3HeaderSection}>
              <Text style={styles.m3SelectLabel}>Pilih Tanggal</Text>
              <Text style={styles.m3SelectedDateText}>
                {selectedDay} {monthNamesInd[calMonth]} {calYear}
              </Text>
            </View>

            <View style={styles.m3CalendarBody}>
              <View style={styles.m3MonthNavRow}>
                <Text style={styles.m3MonthTitleText}>
                  {monthNamesInd[calMonth]} {calYear}
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity onPress={handlePrevMonth}><ChevronLeft size={20} color="#374151" /></TouchableOpacity>
                  <TouchableOpacity onPress={handleNextMonth}><ChevronRight size={20} color="#374151" /></TouchableOpacity>
                </View>
              </View>

              <View style={styles.m3DaysGrid}>
                {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => (
                  <TouchableOpacity
                    key={dayNum}
                    style={[styles.m3DayCell, selectedDay === dayNum && styles.m3DayCellSelected]}
                    onPress={() => setSelectedDay(dayNum)}
                  >
                    <Text style={[styles.m3DayNumText, selectedDay === dayNum && styles.m3DayNumTextSelected]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.m3ActionsRow}>
              <TouchableOpacity onPress={() => setIsDatePickerOpen(false)}>
                <Text style={styles.m3CancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.m3ActionBtnPrimary}
                onPress={() => handleConfirmDate(selectedDay, calMonth, calYear)}
              >
                <Text style={styles.m3OkText}>Pilih</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Realtime In-App Chat Modal with Landlord / Property */}
      <CustomerChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        orderId={String(kostData?._id || "kost_chat_inquiry")}
        customerId={authAccount?.id || authAccount?.email}
        participantName={kostData?.name || "Pemilik Kos & Homestay"}
        participantType="pemilik_kos"
        initialMessage={`Halo, saya ingin bertanya mengenai properti ${kostData?.name || ""}. Apakah masih ada kamar/tiket yang tersedia?`}
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 20,
  },
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
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topRightActions: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  topCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryNavBtnLeft: {
    position: "absolute",
    top: "45%",
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryNavBtnRight: {
    position: "absolute",
    top: "45%",
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 80,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  photoCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  heroOverlayContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  heroBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  badgePutra: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgePutraText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  heroStarsBadge: {
    flexDirection: "row",
    gap: 2,
  },
  heroOpenHoursBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  heroOpenHoursText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  thumbStripContainer: {
    backgroundColor: "#0F172A",
    paddingVertical: 8,
  },
  thumbStripScroll: {
    gap: 8,
    paddingHorizontal: 16,
  },
  thumbItemBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    opacity: 0.6,
  },
  thumbItemBoxActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: "#0D7A53",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbActiveBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#0D7A53",
    borderRadius: 6,
    padding: 2,
  },
  thumbIdxTag: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  thumbIdxTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  bodyContainer: {
    padding: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  ratingVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewsText: {
    fontSize: 12,
    color: "#64748B",
  },
  dotSeparator: {
    color: "#CBD5E1",
  },
  responsiveOwnerText: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "700",
  },
  sectionBlock: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Hotel Room Cards
  hotelRoomCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  hotelRoomCardSelected: {
    borderColor: "#0284C7",
    backgroundColor: "#F0F9FF",
  },
  hotelRoomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hotelRoomTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  hotelRoomSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  hotelRoomPriceVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0284C7",
  },
  hotelRoomPriceUnit: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  breakfastBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: "flex-start",
  },
  breakfastBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#15803D",
  },
  hotelFacilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  hotelFacChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hotelFacChipText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  hotelRoomFooter: {
    marginTop: 4,
  },
  btnSelectHotelRoom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  btnSelectHotelRoomActive: {
    backgroundColor: "#0284C7",
  },
  btnSelectHotelRoomText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284C7",
  },

  // Wisata Ticket Cards
  wisataTicketCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    gap: 8,
  },
  wisataTicketCardSelected: {
    borderColor: "#D97706",
    backgroundColor: "#FEF3C7",
  },
  ticketCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ticketTypePill: {
    backgroundColor: "#D97706",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  ticketTypePillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  ticketNameTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  ticketDescText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  ticketPriceVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#D97706",
  },
  ticketPriceUnit: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  ticketFacsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ticketFacChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ticketFacChipText: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "600",
  },
  ticketCardFooter: {
    marginTop: 4,
  },
  btnSelectTicket: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  btnSelectTicketActive: {
    backgroundColor: "#D97706",
  },
  btnSelectTicketText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
  },

  // Ride Integration Card
  rideIntegrationCard: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#FFEDD5",
    gap: 12,
    alignItems: "center",
  },
  rideIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  rideCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C2410C",
  },
  rideCardSub: {
    fontSize: 11,
    color: "#7C2D12",
    lineHeight: 14,
    marginTop: 2,
  },
  btnOrderRideNow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  btnOrderRideNowText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  // Kost Thin Rooms
  roomSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  roomSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
  },
  thinRoomCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
  },
  thinRoomCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  thinRoomCardDisabled: {
    opacity: 0.6,
  },
  thinRoomCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  thinRoomTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thinRoomTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  thinRoomTypeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  thinFacRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  thinFacChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thinFacChipText: {
    fontSize: 9.5,
    color: "#64748B",
  },
  thinPriceVal: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  thinPriceUnit: {
    fontSize: 9.5,
    color: "#64748B",
  },

  // Facilities Grid
  facilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  facilityCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  facilityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  facilityCardName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    flex: 1,
  },
  descText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  bottomPriceLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  bottomPriceVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  bottomPriceUnit: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  bottomActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnChatSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBookingDp: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBookingDpText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Sheet & Modals
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  sheetSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetContent: {
    padding: 16,
    gap: 12,
  },
  merchantSummaryBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    alignItems: "center",
  },
  merchantThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  merchantSummaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  merchantSummaryRoomText: {
    fontSize: 11.5,
    color: "#64748B",
  },
  merchantSummaryPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  inputContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  inputContainerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  textInput: {
    fontSize: 12.5,
    color: "#0F172A",
  },
  gridTwoCols: {
    flexDirection: "row",
    gap: 10,
  },
  datePickerInputBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  datePickerInputText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  priceCalcBlock: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  priceCalcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calcLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  calcVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  dpBoxGreen: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 8,
  },
  dpBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dpBoxLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
  },
  dpBoxVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#166534",
  },
  btnPayDp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D7A53",
    height: 46,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  btnPayDpText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },

  // Bank & Proof
  bankAccountCard: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 12,
    gap: 8,
  },
  bankAccountHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  bankDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bankLabel: {
    fontSize: 11.5,
    color: "#64748B",
  },
  bankValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  uploadProofSection: {
    marginTop: 14,
    gap: 6,
  },
  uploadProofTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  uploadImageBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#0D7A53",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
  },

  // Receipt
  receiptBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  receiptTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#DCFCE7",
    paddingBottom: 8,
  },
  receiptBrand: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  receiptTypeBadge: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#166534",
  },
  receiptDetails: {
    gap: 4,
  },
  receiptPlaceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  receiptSubInfo: {
    fontSize: 12,
    color: "#475569",
  },
  receiptDateInfo: {
    fontSize: 11.5,
    color: "#64748B",
  },
  receiptCustomerInfo: {
    fontSize: 11.5,
    color: "#64748B",
  },
  receiptPriceHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },

  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 24,
    right: 20,
    zIndex: 10,
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },

  // Date picker
  m3DatePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  m3CalendarCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  m3HeaderSection: {
    backgroundColor: "#0D7A53",
    padding: 16,
  },
  m3SelectLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  m3SelectedDateText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  m3CalendarBody: {
    padding: 14,
  },
  m3MonthNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  m3MonthTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  m3DaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  m3DayCell: {
    width: "14.28%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  m3DayCellSelected: {
    backgroundColor: "#0D7A53",
  },
  m3DayNumText: {
    fontSize: 12,
    color: "#0F172A",
  },
  m3DayNumTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  m3ActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 12,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  m3CancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  m3ActionBtnPrimary: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  m3OkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
