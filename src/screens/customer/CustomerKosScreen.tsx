import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  Heart,
  ChevronRight,
  X,
  ShieldCheck,
  Building2,
  Hotel,
  Ticket,
  Sparkles,
  Gift,
  Check,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Clock,
  Compass,
  Home,
} from "lucide-react-native";
import { Nav } from "../../types";
import { fetchAllKosts, fetchCustomerBookings } from "../../services/kostService";
import {
  setSelectedKost,
  getActiveCustomerBooking,
  subscribeCustomerBooking,
  ActiveCustomerBooking,
  LodgingCategoryType,
} from "./customerKosStore";
import {
  MOCK_HOTELS_AND_VILLAS,
  MOCK_TOURIST_ATTRACTIONS,
} from "../../services/lodgingTravelService";
import { AuthAccount } from "../auth/authTypes";
import { rp } from "../../utils/formatters";

interface CustomerKosScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

const DISMISSED_BOOKING_KEY = "ranger_dismissed_booking_banners";

const getIsBannerDismissed = (bookingId?: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage && bookingId) {
      const dismissedList = JSON.parse(window.localStorage.getItem(DISMISSED_BOOKING_KEY) || "[]");
      return dismissedList.includes(bookingId);
    }
  } catch (e) {}
  return false;
};

const setBannerDismissedInStorage = (bookingId?: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage && bookingId) {
      const dismissedList = JSON.parse(window.localStorage.getItem(DISMISSED_BOOKING_KEY) || "[]");
      if (!dismissedList.includes(bookingId)) {
        dismissedList.push(bookingId);
        window.localStorage.setItem(DISMISSED_BOOKING_KEY, JSON.stringify(dismissedList));
      }
    }
  } catch (e) {}
};

const AREA_CHIPS = [
  "Semua Area",
  "Garut Kota",
  "Cipanas / Tarogong",
  "Kamojang / Samarang",
  "Bandung Dago",
  "Dekat Kampus",
];

export const CustomerKosScreen: React.FC<CustomerKosScreenProps> = ({ navigate, authAccount }) => {
  // Default to 'hotel' (Homestay, Villa & Resort) since feature is Kanyaah Homestay
  const [mainCategory, setMainCategory] = useState<LodgingCategoryType>("hotel");

  // Filters
  const [selectedArea, setSelectedArea] = useState("Semua Area");
  const [activeKostGender, setActiveKostGender] = useState<"semua" | "putra" | "putri" | "campur">("semua");
  const [hotelTypeFilter, setHotelTypeFilter] = useState("Semua");
  const [wisataTypeFilter, setWisataTypeFilter] = useState("Semua");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dbKosts, setDbKosts] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<ActiveCustomerBooking | null>(null);
  const [isBookingBannerVisible, setIsBookingBannerVisible] = useState(true);
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);

  useEffect(() => {
    const loadKosts = async () => {
      setLoading(true);
      try {
        const data = await fetchAllKosts();
        if (data && data.length > 0) {
          const mapped = data.map((k: any) => {
            const allRooms = Array.isArray(k.rooms) ? k.rooms : [];
            const roomPrices = allRooms
              .map((r: any) => Number(r.priceMonthly) || 0)
              .filter((p: number) => p > 0);
            const categoryType: LodgingCategoryType = (k.categoryType as LodgingCategoryType) || "kost";
            const hotelPrices = Array.isArray(k.hotelRooms)
              ? k.hotelRooms.map((hr: any) => Number(hr.pricePerNight) || 0).filter((p: number) => p > 0)
              : [];
            const ticketPrices = Array.isArray(k.wisataTickets)
              ? k.wisataTickets.map((wt: any) => Number(wt.price) || 0).filter((p: number) => p > 0)
              : [];

            let finalPrice = Number(k.price || 0);
            if (roomPrices.length > 0) {
              finalPrice = Math.min(...roomPrices);
            } else if (hotelPrices.length > 0) {
              finalPrice = Math.min(...hotelPrices);
            } else if (ticketPrices.length > 0) {
              finalPrice = Math.min(...ticketPrices);
            }

            const roomPhotos = allRooms
              .flatMap((r: any) => (Array.isArray(r.images) ? r.images : []))
              .filter(Boolean);
            const kostPhotos = (Array.isArray(k.images) ? k.images : []).filter(Boolean);
            const allPhotos = roomPhotos.length > 0 ? roomPhotos : kostPhotos;
            const primaryImg =
              allPhotos[0] ||
              (categoryType === "wisata"
                ? "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80"
                : categoryType === "hotel"
                ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
                : "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80");

            const roomFacilities = allRooms.flatMap((r: any) => (Array.isArray(r.facilities) ? r.facilities : []));
            const uniqueFacilities = Array.from(new Set([...roomFacilities, ...(k.facilities || [])])).slice(0, 5);

            let distanceStr = "";
            if (k.latitude && k.longitude) {
              const lat1 = Number(k.latitude);
              const lon1 = Number(k.longitude);
              const lat2 = -7.2278;
              const lon2 = 107.9087;
              const dLat = (lat2 - lat1) * (Math.PI / 180);
              const dLon = (lon2 - lon1) * (Math.PI / 180);
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const d = 6371 * c;
              distanceStr = d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
            }

            return {
              id: k._id || k.id,
              _id: k._id || k.id,
              categoryType,
              name: k.name,
              type: k.type || "Campur",
              status: categoryType === "wisata" ? "Buka Hari Ini" : allRooms.length === 0 ? "Tersedia" : allRooms.some((r: any) => r.isAvailable) ? "Tersedia" : "Penuh",
              location: k.address || k.city || "Alamat Kos",
              distance: distanceStr,
              city: k.city || "Garut",
              areaTag: k.address?.toLowerCase().includes("cipanas")
                ? "Cipanas / Tarogong"
                : k.address?.toLowerCase().includes("kamojang") || k.address?.toLowerCase().includes("samarang")
                ? "Kamojang / Samarang"
                : k.address?.toLowerCase().includes("dago") || k.address?.toLowerCase().includes("bandung")
                ? "Bandung Dago"
                : k.address?.toLowerCase().includes("kampus") || k.address?.toLowerCase().includes("uniga") || k.address?.toLowerCase().includes("itg")
                ? "Dekat Kampus"
                : "Garut Kota",
              rating: k.rating || (categoryType === "hotel" ? 4.8 : categoryType === "wisata" ? 4.7 : 4.9),
              reviews: k.reviewCount || 45,
              price: finalPrice,
              cashbackPoints: k.cashbackPoints || Math.round(finalPrice * 0.03),
              openHours: k.openHours || (categoryType === "wisata" ? "07:00 - 18:00 WIB" : undefined),
              stars: k.stars || (categoryType === "hotel" ? 4 : undefined),
              facilities: uniqueFacilities.length > 0 ? uniqueFacilities : ["WiFi Cepat", "Kamar Mandi Dalam", "Water Heater", "Parkir"],
              img: primaryImg,
              images: allPhotos.length > 0 ? allPhotos : [primaryImg],
              photoCount: allPhotos.length > 0 ? allPhotos.length : 3,
              raw: {
                ...k,
                categoryType,
                price: finalPrice,
                images: allPhotos.length > 0 ? allPhotos : [primaryImg],
                facilities: uniqueFacilities,
              },
            };
          });
          setDbKosts(mapped);
        } else {
          setDbKosts([]);
        }

        if (authAccount?.email && authAccount.role === "customer") {
          const myBookings = await fetchCustomerBookings(authAccount.email);
          if (myBookings && myBookings.length > 0) {
            const latest = myBookings[0];
            const activeObj: ActiveCustomerBooking = {
              _id: latest._id,
              bookingCode: latest.bookingCode,
              categoryType: latest.categoryType || "kost",
              customerName: latest.customerName,
              customerPhone: latest.customerPhone,
              customerEmail: latest.customerEmail,
              kostId: latest.kostId?._id || latest.kostId,
              kostName: latest.kostId?.name || "Kost Pilihan",
              kostAddress: latest.kostId?.address,
              roomNumber: latest.roomNumber || "101",
              roomType: latest.roomType || "AC",
              entryDate: latest.entryDate ? new Date(latest.entryDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Segera",
              checkOutDate: latest.checkOutDate ? new Date(latest.checkOutDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : undefined,
              guestCount: latest.guestCount,
              durationMonths: latest.durationMonths || 1,
              durationNights: latest.durationNights,
              ticketCount: latest.ticketCount,
              monthlyPrice: latest.monthlyPrice || 1500000,
              totalAmount: latest.totalAmount || 1500000,
              dpAmount: latest.dpAmount || 300000,
              dpProofImage: latest.dpProofImage,
              status: latest.status || "dp_submitted",
              rejectionReason: latest.rejectionReason,
              verifiedAt: latest.verifiedAt,
              createdAt: latest.createdAt,
              ownerPhone: latest.ownerId?.phone || "087805987309",
              ownerName: latest.ownerId?.name || "Pengelola Properti",
            };
            setActiveBooking(activeObj);
            const isDismissed = getIsBannerDismissed(activeObj._id || activeObj.bookingCode);
            setIsBookingBannerVisible(!isDismissed);
          } else {
            setActiveBooking(null);
          }
        } else {
          setActiveBooking(null);
        }
      } catch (err) {
        console.warn("loadKosts error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadKosts();
    const unsub = subscribeCustomerBooking(() => {
      if (authAccount?.role === "customer") {
        const active = getActiveCustomerBooking();
        if (active && active.customerEmail === authAccount.email) {
          setActiveBooking(active);
          const isDismissed = getIsBannerDismissed(active._id || active.bookingCode);
          setIsBookingBannerVisible(!isDismissed);
        } else {
          setActiveBooking(null);
        }
      } else {
        setActiveBooking(null);
      }
    });
    return unsub;
  }, [authAccount]);

  const currentItemsList = useMemo(() => {
    const matchingFromDb = (dbKosts || [])
      .filter((k) => (k?.categoryType || "kost") === mainCategory)
      .map((k) => {
        let sanitizedType = k.type;
        let sanitizedFacilities = Array.isArray(k.facilities) ? [...k.facilities] : [];
        if (mainCategory === "wisata") {
          if (!sanitizedType || ["campur", "putri", "putra"].includes(String(sanitizedType).toLowerCase())) {
            sanitizedType = "Wisata Alam & Rekreasi";
          }
        } else if (mainCategory === "hotel") {
          if (!sanitizedType || ["campur", "putri", "putra"].includes(String(sanitizedType).toLowerCase())) {
            sanitizedType = "Homestay & Villa";
          }
        }

        return {
          ...k,
          type: sanitizedType,
          facilities: sanitizedFacilities,
          categoryType: mainCategory,
          status: mainCategory === "wisata" ? "Buka Hari Ini" : "Tersedia",
          img: (k.images && k.images[0]) ? k.images[0] : (mainCategory === "wisata" ? "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80" : mainCategory === "hotel" ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"),
          photoCount: (k.images && k.images.length) ? k.images.length : 3,
          raw: k,
        };
      });

    if (matchingFromDb.length > 0) {
      return matchingFromDb;
    }

    if (mainCategory === "kost") {
      return (dbKosts || []).filter((k) => !k?.categoryType || k.categoryType === "kost");
    } else if (mainCategory === "hotel") {
      return (MOCK_HOTELS_AND_VILLAS || []).map((h) => ({
        id: h.id || h._id,
        _id: h._id || h.id,
        categoryType: "hotel" as LodgingCategoryType,
        name: h.name || "Homestay & Villa",
        type: h.type || "Homestay",
        status: "Tersedia",
        location: h.address || h.city || "Garut",
        city: h.city || "Garut",
        areaTag: h.areaTag || "Garut Kota",
        badgeTag: h.badgeTag,
        rating: h.rating || 4.85,
        reviews: h.reviewCount || 120,
        price: h.price || 650000,
        cashbackPoints: h.cashbackPoints || 25000,
        facilities: h.facilities || ["WiFi Cepat", "Kolam Air Panas", "Dapur Bersama", "Parkir"],
        img: (h.images && h.images[0]) ? h.images[0] : "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        images: h.images || [],
        photoCount: (h.images && h.images.length) ? h.images.length : 4,
        stars: typeof h.stars === "number" ? Math.min(5, Math.max(1, Math.round(h.stars))) : 4,
        raw: h,
      }));
    } else {
      return (MOCK_TOURIST_ATTRACTIONS || []).map((w) => ({
        id: w.id || w._id,
        _id: w._id || w.id,
        categoryType: "wisata" as LodgingCategoryType,
        name: w.name || "Tiket Wisata Garut",
        type: w.type || "Wisata Alam",
        status: "Buka Hari Ini",
        location: w.address || w.city || "Garut",
        city: w.city || "Garut",
        areaTag: w.areaTag || "Garut Kota",
        badgeTag: w.badgeTag,
        rating: w.rating || 4.8,
        reviews: w.reviewCount || 150,
        price: w.price || 40000,
        cashbackPoints: w.cashbackPoints || 5000,
        openHours: w.openHours || "08:00 - 17:00 WIB",
        facilities: w.facilities || ["Spot Foto Estetik", "Mushola", "Parkir Luas"],
        img: (w.images && w.images[0]) ? w.images[0] : "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80",
        images: w.images || [],
        photoCount: (w.images && w.images.length) ? w.images.length : 3,
        raw: w,
      }));
    }
  }, [mainCategory, dbKosts]);

  const filteredList = useMemo(() => {
    return (currentItemsList || []).filter((item: any) => {
      if (!item) return false;
      const itemLocation = (item.location || item.address || "").toLowerCase();
      const itemCity = (item.city || "").toLowerCase();
      const areaQuery = (selectedArea || "").toLowerCase();

      const matchesArea =
        selectedArea === "Semua Area" ||
        item.areaTag === selectedArea ||
        itemLocation.includes(areaQuery) ||
        itemCity.includes(areaQuery);

      let matchesSub = true;
      const itemType = (item.type || "").toLowerCase();
      if (mainCategory === "kost") {
        matchesSub =
          activeKostGender === "semua" ||
          itemType === activeKostGender.toLowerCase();
      } else if (mainCategory === "hotel") {
        if (hotelTypeFilter === "Semua") {
          matchesSub = true;
        } else if (hotelTypeFilter === "Homestay") {
          const itemDesc = ((item.raw?.description || "") as string).toLowerCase();
          matchesSub =
            itemType.includes("homestay") ||
            (item.name || "").toLowerCase().includes("homestay") ||
            itemDesc.includes("homestay");
        } else if (hotelTypeFilter === "Villa") {
          matchesSub = itemType.includes("villa") || (item.name || "").toLowerCase().includes("villa");
        } else if (hotelTypeFilter === "Hotel") {
          matchesSub = itemType.includes("hotel") && !itemType.includes("homestay");
        } else {
          matchesSub = itemType.includes(hotelTypeFilter.toLowerCase());
        }
      } else if (mainCategory === "wisata") {
        matchesSub =
          wisataTypeFilter === "Semua" ||
          itemType.includes(wisataTypeFilter.toLowerCase());
      }

      const query = searchQuery.trim().toLowerCase();
      const itemName = (item.name || "").toLowerCase();
      const matchesSearch =
        query === "" ||
        itemName.includes(query) ||
        itemLocation.includes(query) ||
        (Array.isArray(item.facilities) &&
          item.facilities.some((f: string) => f && typeof f === "string" && f.toLowerCase().includes(query)));

      return matchesArea && matchesSub && matchesSearch;
    });
  }, [currentItemsList, selectedArea, activeKostGender, hotelTypeFilter, wisataTypeFilter, searchQuery, mainCategory]);

  const handleOpenWhatsAppOwner = (
    phone?: string,
    name?: string,
    roomNumber?: string,
    categoryType?: LodgingCategoryType,
    bookingCode?: string
  ) => {
    const cleanPhone = (phone || "087805987309").replace(/[^0-9]/g, "").replace(/^0/, "62");
    let msg = "";
    if (categoryType === "wisata") {
      msg = `Halo Pengelola ${name || "Wisata"}, saya ingin konfirmasi perihal tiket wisata ${roomNumber ? `(${roomNumber})` : ""} dengan kode booking ${bookingCode || ""} di Kanyaah.`;
    } else if (categoryType === "hotel") {
      msg = `Halo Pengelola ${name || "Homestay"}, saya ingin konfirmasi perihal reservasi unit ${roomNumber || ""} dengan kode booking ${bookingCode || ""} di Kanyaah Homestay.`;
    } else {
      msg = `Halo Pengelola ${name || "Kos"}, saya ingin konfirmasi perihal booking sewa Kamar ${roomNumber ? `No. ${roomNumber}` : ""} dengan kode booking ${bookingCode || ""} di Kanyaah Kos.`;
    }
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const handleSelectCard = (item: any) => {
    if (item.raw) {
      setSelectedKost({
        ...item.raw,
        categoryType: mainCategory,
      });
    } else {
      setSelectedKost({
        id: item.id,
        _id: item.id,
        categoryType: mainCategory,
        name: item.name,
        type: item.type,
        address: item.location,
        city: item.city,
        price: item.price || 650000,
        dpAmount: Math.round((item.price || 650000) * 0.2),
        facilities: item.facilities || ["WiFi Cepat", "Water Heater", "Parkir"],
        images: item.images || [item.img],
        rating: item.rating,
        reviewCount: item.reviews,
      });
    }
    navigate("c_kos_detail");
  };

  const toggleFavorite = (id: string, e: any) => {
    e.stopPropagation?.();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ============================================================ */}
      {/* 1. MINIMALIST LUXURY HEADER                                 */}
      {/* ============================================================ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerBrandCol}>
          <View style={styles.headerBadgeRow}>
            <View style={styles.goldDot} />
            <Text style={styles.headerSuperTag}>KANYAAH STAYS</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {mainCategory === "hotel"
              ? "Homestay & Villa"
              : mainCategory === "kost"
              ? "Kost & Coliving"
              : "Wisata & Destinasi"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setSelectedArea("Semua Area")}
            activeOpacity={0.7}
          >
            <Compass size={18} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ============================================================ */}
        {/* 2. REFINED 3-SEGMENTED CONTROL (APPLE / AIRBNB LUXE STYLE)  */}
        {/* ============================================================ */}
        <View style={styles.switcherContainer}>
          <View style={styles.switcherTrack}>
            <TouchableOpacity
              style={[
                styles.switcherPill,
                mainCategory === "hotel" && styles.switcherPillActive,
              ]}
              onPress={() => setMainCategory("hotel")}
              activeOpacity={0.85}
            >
              <Hotel
                size={15}
                color={mainCategory === "hotel" ? "#0F172A" : "#64748B"}
              />
              <Text
                style={[
                  styles.switcherLabel,
                  mainCategory === "hotel" && styles.switcherLabelActive,
                ]}
              >
                Homestay & Villa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.switcherPill,
                mainCategory === "kost" && styles.switcherPillActive,
              ]}
              onPress={() => setMainCategory("kost")}
              activeOpacity={0.85}
            >
              <Building2
                size={15}
                color={mainCategory === "kost" ? "#0F172A" : "#64748B"}
              />
              <Text
                style={[
                  styles.switcherLabel,
                  mainCategory === "kost" && styles.switcherLabelActive,
                ]}
              >
                Kost & Living
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.switcherPill,
                mainCategory === "wisata" && styles.switcherPillActive,
              ]}
              onPress={() => setMainCategory("wisata")}
              activeOpacity={0.85}
            >
              <Ticket
                size={15}
                color={mainCategory === "wisata" ? "#0F172A" : "#64748B"}
              />
              <Text
                style={[
                  styles.switcherLabel,
                  mainCategory === "wisata" && styles.switcherLabelActive,
                ]}
              >
                Tiket Wisata
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. ACTIVE BOOKING SUMMARY CARD (IF ANY)                      */}
        {/* ============================================================ */}
        {activeBooking && isBookingBannerVisible && (
          <View style={styles.activeBookingCard}>
            <View style={styles.bookingTopRow}>
              <View style={styles.bookingStatusBadge}>
                <View style={styles.activeGreenDot} />
                <Text style={styles.bookingStatusText}>
                  {activeBooking.status === "dp_verified" || activeBooking.status === "active" || (activeBooking.status as string) === "verified"
                    ? (activeBooking.categoryType === "wisata"
                        ? "TIKET TERKONFIRMASI"
                        : activeBooking.categoryType === "hotel"
                        ? "RESERVASI TERKONFIRMASI"
                        : "BOOKING KOS TERKONFIRMASI")
                    : (activeBooking.categoryType === "wisata"
                        ? "MENUNGGU PEMBAYARAN"
                        : "MENUNGGU VERIFIKASI")}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setBannerDismissedInStorage(activeBooking._id || activeBooking.bookingCode);
                  setIsBookingBannerVisible(false);
                }}
                style={styles.dismissBtn}
                activeOpacity={0.7}
              >
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.bookingContentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingTitle} numberOfLines={1}>
                  {activeBooking.kostName}
                </Text>
                <Text style={styles.bookingSub}>
                  {activeBooking.categoryType === "wisata"
                    ? `Kode: ${activeBooking.bookingCode} • Kunjungan: ${activeBooking.entryDate || "Hari Ini"} (${activeBooking.ticketCount || 1} Tiket)`
                    : activeBooking.categoryType === "hotel"
                    ? `Kode: ${activeBooking.bookingCode} • Check-in: ${activeBooking.entryDate || "Segera"}${activeBooking.durationNights ? ` (${activeBooking.durationNights} Malam)` : ""}`
                    : `Kode: ${activeBooking.bookingCode} • Masuk Kos: ${activeBooking.entryDate || "Segera"}${activeBooking.roomNumber ? ` (Kamar ${activeBooking.roomNumber})` : ""}`}
                </Text>
              </View>

              <Text style={styles.bookingPrice}>
                {rp(activeBooking.categoryType === "wisata" ? (activeBooking.totalAmount || activeBooking.dpAmount) : (activeBooking.dpAmount || activeBooking.totalAmount))}
              </Text>
            </View>

            <View style={styles.bookingActionsRow}>
              <TouchableOpacity
                style={styles.bookingBtnSecondary}
                onPress={() => setIsNotaModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookingBtnSecondaryText}>
                  {activeBooking.categoryType === "wisata"
                    ? "Lihat E-Ticket"
                    : activeBooking.categoryType === "hotel"
                    ? "Lihat Reservasi"
                    : "Lihat E-Receipt DP"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bookingBtnPrimary}
                onPress={() =>
                  handleOpenWhatsAppOwner(
                    activeBooking.ownerPhone,
                    activeBooking.kostName,
                    activeBooking.roomNumber
                  )
                }
                activeOpacity={0.8}
              >
                <MessageCircle size={14} color="#FFFFFF" />
                <Text style={styles.bookingBtnPrimaryText}>WhatsApp Pengelola</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* 4. AIRBNB-INSPIRED SEARCH & LOCATION BAR                    */}
        {/* ============================================================ */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder={
                mainCategory === "hotel"
                  ? "Cari homestay, villa, atau resort..."
                  : mainCategory === "kost"
                  ? "Cari nama kost, fasilitas, atau kampus..."
                  : "Cari tiket rekreasi, alam, atau waterpark..."
              }
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ============================================================ */}
        {/* 5. LOCATION DESTINATION CHIPS (HORIZONTAL MINIMALIST)       */}
        {/* ============================================================ */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.areaScrollContent}
          >
            {AREA_CHIPS.map((area) => {
              const isActive = selectedArea === area;
              return (
                <TouchableOpacity
                  key={area}
                  style={[styles.areaPill, isActive && styles.areaPillActive]}
                  onPress={() => setSelectedArea(area)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.areaPillText, isActive && styles.areaPillTextActive]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 6. SUB-CATEGORY FILTER BAR (REFINED & MODERN)               */}
        {/* ============================================================ */}
        <View style={styles.subFilterBar}>
          {mainCategory === "hotel" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFilterScroll}>
              {["Semua", "Homestay", "Villa", "Hotel"].map((t) => {
                const isActive = hotelTypeFilter === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.subPill, isActive && styles.subPillActive]}
                    onPress={() => setHotelTypeFilter(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.subPillText, isActive && styles.subPillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {mainCategory === "kost" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFilterScroll}>
              {["semua", "putri", "putra", "campur"].map((g) => {
                const isActive = activeKostGender === g;
                const label = g === "semua" ? "Semua Tipe" : `Khusus ${g.charAt(0).toUpperCase() + g.slice(1)}`;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.subPill, isActive && styles.subPillActive]}
                    onPress={() => setActiveKostGender(g as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.subPillText, isActive && styles.subPillTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {mainCategory === "wisata" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFilterScroll}>
              {["Semua", "Wisata Alam", "Air Panas", "Waterpark"].map((w) => {
                const isActive = wisataTypeFilter === w;
                return (
                  <TouchableOpacity
                    key={w}
                    style={[styles.subPill, isActive && styles.subPillActive]}
                    onPress={() => setWisataTypeFilter(w)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.subPillText, isActive && styles.subPillTextActive]}>
                      {w}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ============================================================ */}
        {/* 7. KANYAAH PRIVILEGE CLUB BANNER (LUXURY EXECUTIVE)          */}
        {/* ============================================================ */}
        <View style={styles.privilegeCardContainer}>
          <View style={styles.privilegeCard}>
            <View style={styles.privilegeBadgeRow}>
              <Sparkles size={12} color="#F59E0B" />
              <Text style={styles.privilegeBadgeText}>KANYAAH PRIVILEGE</Text>
            </View>
            <Text style={styles.privilegeTitle}>
              {mainCategory === "hotel"
                ? "Staycation Garut & Bandung Lebih Hemat"
                : mainCategory === "kost"
                ? "Sewa Kos Tanpa Ribet dengan Survei Resmi"
                : "Akses Wisata Tanpa Antre & Cashback Poin"}
            </Text>
            <Text style={styles.privilegeSubtitle}>
              Gunakan voucher <Text style={{ color: "#FDE68A", fontWeight: "800" }}>STAYCATION</Text> untuk potongan harga langsung & akumulasi Poin GEOVERSE.
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 8. LISTING PROPERTY CARDS (AIRBNB EDITORIAL LUXURY)          */}
        {/* ============================================================ */}
        <View style={styles.listingSection}>
          <View style={styles.listingHeaderRow}>
            <Text style={styles.listingTitle}>
              {mainCategory === "hotel"
                ? "Pilihan Homestay & Penginapan Unggulan"
                : mainCategory === "kost"
                ? "Rekomendasi Kost & Coliving Strategis"
                : "Destinasi Wisata Populer Jawa Barat"}
            </Text>
            <Text style={styles.listingCount}>{filteredList.length} Properti</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0F172A" />
              <Text style={styles.loadingText}>Menyiapkan kurasi properti terbaik...</Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Hotel size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Tidak ada properti ditemukan</Text>
              <Text style={styles.emptySub}>
                Coba sesuaikan kata kunci pencarian atau ubah filter area destinasi.
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedArea("Semua Area");
                  setHotelTypeFilter("Semua");
                  setActiveKostGender("semua");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyResetBtnText}>Reset Semua Filter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredList.map((item: any) => {
              const isFav = !!favorites[item.id || item._id];
              return (
                <TouchableOpacity
                  key={item.id || item._id}
                  style={styles.propertyCard}
                  onPress={() => handleSelectCard(item)}
                  activeOpacity={0.92}
                >
                  {/* Hero Photo with Overlays */}
                  <View style={styles.cardImageContainer}>
                    <Image source={{ uri: item.img }} style={styles.cardImage} />

                    {/* Top-Left Category Badge */}
                    <View style={styles.cardBadgePill}>
                      <Text style={styles.cardBadgeText}>
                        {mainCategory === "wisata"
                          ? "TIKET WISATA"
                          : (item.type || "HOMESTAY").toUpperCase()}
                      </Text>
                    </View>

                    {/* Top-Right Heart Button */}
                    <TouchableOpacity
                      style={styles.cardHeartBtn}
                      onPress={(e) => toggleFavorite(item.id || item._id, e)}
                      activeOpacity={0.8}
                    >
                      <Heart
                        size={17}
                        color={isFav ? "#EF4444" : "#FFFFFF"}
                        fill={isFav ? "#EF4444" : "transparent"}
                      />
                    </TouchableOpacity>

                    {/* Bottom-Right Photo Count */}
                    <View style={styles.photoCountTag}>
                      <Text style={styles.photoCountText}>{item.photoCount || 3} Foto</Text>
                    </View>

                    {/* Special Highlights if Available */}
                    {item.badgeTag && (
                      <View style={styles.specialHighlightTag}>
                        <Text style={styles.specialHighlightText}>{item.badgeTag}</Text>
                      </View>
                    )}
                  </View>

                  {/* Card Editorial Details */}
                  <View style={styles.cardContent}>
                    {/* Location & Rating Header */}
                    <View style={styles.cardMetaRow}>
                      <View style={styles.cardLocationCol}>
                        <MapPin size={13} color="#64748B" />
                        <Text style={styles.cardLocationText} numberOfLines={1}>
                          {item.distance ? `${item.distance} • ` : ""}{item.location}
                        </Text>
                      </View>

                      <View style={styles.cardRatingRow}>
                        <Star size={13} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.cardRatingScore}>{item.rating}</Text>
                        <Text style={styles.cardReviewsCount}>({item.reviews || 48})</Text>
                      </View>
                    </View>

                    {/* Property Title */}
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>

                    {/* Curated Amenity Tags */}
                    {Array.isArray(item.facilities) && item.facilities.length > 0 && (
                      <View style={styles.amenitiesRow}>
                        {item.facilities.slice(0, 4).map((amenity: string, idx: number) => (
                          <View key={idx} style={styles.amenityTag}>
                            <Text style={styles.amenityTagText}>{amenity}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* GEOVERSE Points Cashback Reward */}
                    {item.cashbackPoints ? (
                      <View style={styles.cashbackPill}>
                        <Gift size={12} color="#059669" />
                        <Text style={styles.cashbackPillText}>
                          +{item.cashbackPoints.toLocaleString("id-ID")} Poin GEOVERSE
                        </Text>
                      </View>
                    ) : null}

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Price & CTA Row */}
                    <View style={styles.cardPriceRow}>
                      <View>
                        <Text style={styles.priceLeadText}>
                          {mainCategory === "kost"
                            ? "Sewa bulanan mulai dari"
                            : mainCategory === "hotel"
                            ? "Mulai dari per malam"
                            : "Harga tiket masuk"}
                        </Text>
                        <View style={styles.priceValueRow}>
                          <Text style={styles.priceMainVal}>{rp(item.price)}</Text>
                          <Text style={styles.priceUnitVal}>
                            {mainCategory === "kost"
                              ? "/bln"
                              : mainCategory === "hotel"
                              ? "/mlm"
                              : "/org"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.viewDetailBtn}>
                        <Text style={styles.viewDetailBtnText}>Lihat Detail</Text>
                        <ChevronRight size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ============================================================ */}
        {/* 9. BRAND TRUST & GUARANTEE ASSURANCE ROW                     */}
        {/* ============================================================ */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <ShieldCheck size={20} color="#0F172A" />
            <Text style={styles.trustTitle}>Survei Terverifikasi</Text>
            <Text style={styles.trustDesc}>Listing foto nyata & disurvei langsung oleh tim Kanyaah.</Text>
          </View>
          <View style={styles.trustItem}>
            <Sparkles size={20} color="#0F172A" />
            <Text style={styles.trustTitle}>Ekosistem Poin</Text>
            <Text style={styles.trustDesc}>Tukar poin pilah sampah untuk diskon menginap.</Text>
          </View>
          <View style={styles.trustItem}>
            <CheckCircle2 size={20} color="#0F172A" />
            <Text style={styles.trustTitle}>Jaminan Pemesanan</Text>
            <Text style={styles.trustDesc}>Reservasi aman dengan e-receipt resmi terbit instan.</Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* 10. OFFICIAL E-RECEIPT NOTA MODAL                            */}
      {/* ============================================================ */}
      <Modal visible={isNotaModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {activeBooking?.categoryType === "wisata"
                    ? "E-Ticket Masuk Wisata Resmi"
                    : activeBooking?.categoryType === "hotel"
                    ? "E-Receipt Reservasi Homestay"
                    : "E-Receipt Sewa Kamar Kos"}
                </Text>
                <Text style={styles.modalHeaderSub}>
                  {activeBooking?.categoryType === "wisata"
                    ? "Tiket resmi & bukti pembayaran lunas"
                    : activeBooking?.categoryType === "hotel"
                    ? "Bukti pemesanan kamar resmi Kanyaah Homestay"
                    : "Bukti tanda jadi (DP) sewa kamar resmi Kanyaah Kos"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsNotaModalOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.receiptScroll}>
              <View style={styles.receiptCard}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptBrand}>
                    {activeBooking?.categoryType === "wisata"
                      ? "KANYAAH WISATA"
                      : activeBooking?.categoryType === "hotel"
                      ? "KANYAAH HOMESTAY"
                      : "KANYAAH KOST LIVING"}
                  </Text>
                  <Text style={styles.receiptMeta}>
                    {activeBooking?.categoryType === "wisata" ? "Kode Tiket" : "Kode Booking"}: {activeBooking?.bookingCode || "GEO-ONLINE"}
                  </Text>
                  <View style={styles.receiptVerifiedBadge}>
                    <Check size={12} color="#059669" strokeWidth={3} />
                    <Text style={styles.receiptVerifiedText}>
                      {activeBooking?.categoryType === "wisata"
                        ? "E-TICKET RESMI TERVERIFIKASI"
                        : "DOKUMEN RESMI TERVERIFIKASI"}
                    </Text>
                  </View>
                </View>

                {activeBooking?.categoryType === "wisata" && (
                  <View style={styles.barcodeContainer}>
                    <Text style={styles.barcodeSubLabel}>SCAN DI LOKET WISATA</Text>
                    <View style={styles.barcodeLinesRow}>
                      {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3].map((w, idx) => (
                        <View
                          key={idx}
                          style={{
                            width: w,
                            height: 34,
                            backgroundColor: "#0F172A",
                            marginHorizontal: 1.5,
                          }}
                        />
                      ))}
                    </View>
                    <Text style={styles.barcodeCodeLabel}>{activeBooking?.bookingCode || "WST-ONLINE"}</Text>
                    <Text style={styles.barcodeSubLabel}>Tunjukkan kode barcode ini kepada petugas loket wisata</Text>
                  </View>
                )}

                <View style={styles.receiptContent}>
                  <Text style={styles.receiptSectionTitle}>DATA PEMESAN</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {activeBooking?.categoryType === "wisata"
                        ? "Nama Pengunjung"
                        : activeBooking?.categoryType === "hotel"
                        ? "Nama Tamu"
                        : "Nama Calon Penghuni"}
                    </Text>
                    <Text style={styles.receiptValueBold}>
                      {activeBooking?.customerName || authAccount?.name || "Customer"}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>No. Kontak</Text>
                    <Text style={styles.receiptValue}>
                      {activeBooking?.customerPhone || authAccount?.phone || "-"}
                    </Text>
                  </View>

                  <Text style={styles.receiptSectionTitle}>
                    {activeBooking?.categoryType === "wisata"
                      ? "RINCIAN TIKET WISATA"
                      : activeBooking?.categoryType === "hotel"
                      ? "RINCIAN RESERVASI"
                      : "RINCIAN SEWA KAMAR"}
                  </Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {activeBooking?.categoryType === "wisata"
                        ? "Destinasi Wisata"
                        : activeBooking?.categoryType === "hotel"
                        ? "Nama Homestay"
                        : "Nama Properti"}
                    </Text>
                    <Text style={styles.receiptValueBoldGreen}>
                      {activeBooking?.kostName || "Properti Pilihan"}
                    </Text>
                  </View>

                  {activeBooking?.categoryType === "wisata" ? (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Tanggal Kunjungan</Text>
                        <Text style={styles.receiptValue}>{activeBooking?.entryDate || "-"}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Jumlah Tiket</Text>
                        <Text style={styles.receiptValue}>{activeBooking?.ticketCount || 1} Tiket (Orang)</Text>
                      </View>
                    </>
                  ) : activeBooking?.categoryType === "hotel" ? (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Tanggal Check-in</Text>
                        <Text style={styles.receiptValue}>{activeBooking?.entryDate || "-"}</Text>
                      </View>
                      {Boolean(activeBooking?.checkOutDate) && (
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Tanggal Check-out</Text>
                          <Text style={styles.receiptValue}>{activeBooking?.checkOutDate}</Text>
                        </View>
                      )}
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Durasi Menginap</Text>
                        <Text style={styles.receiptValue}>{activeBooking?.durationNights || 1} Malam</Text>
                      </View>
                      {Boolean(activeBooking?.guestCount) && (
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Jumlah Tamu</Text>
                          <Text style={styles.receiptValue}>{activeBooking?.guestCount} Orang</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Tanggal Masuk Kos</Text>
                        <Text style={styles.receiptValue}>{activeBooking?.entryDate || "-"}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>No. Kamar & Tipe</Text>
                        <Text style={styles.receiptValue}>Kamar {activeBooking?.roomNumber || "101"} ({activeBooking?.roomType || "AC"})</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Durasi Sewa</Text>
                        <Text style={styles.receiptValue}>{activeBooking?.durationMonths || 1} Bulan</Text>
                      </View>
                    </>
                  )}

                  <View style={styles.receiptTotalContainer}>
                    <View style={styles.receiptTotalRow}>
                      <Text style={styles.receiptTotalLabel}>
                        {activeBooking?.categoryType === "wisata" ? "Total Bayar Tiket" : "Uang Muka / Terbayar"}
                      </Text>
                      <Text style={styles.receiptTotalVal}>
                        {rp(activeBooking?.categoryType === "wisata" ? (activeBooking?.totalAmount || activeBooking?.dpAmount || 0) : (activeBooking?.dpAmount || activeBooking?.totalAmount || 0))} (LUNAS ✓)
                      </Text>
                    </View>
                    <Text style={styles.receiptTotalNote}>
                      {activeBooking?.categoryType === "wisata"
                        ? "Tunjukkan barcode e-ticket ini kepada petugas loket saat kunjungan ke destinasi wisata."
                        : activeBooking?.categoryType === "hotel"
                        ? "Tunjukkan e-receipt ini kepada staf saat proses check-in di homestay."
                        : "Tunjukkan e-receipt tanda jadi DP ini kepada pemilik kos saat survei atau serah terima kunci."}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerBrandCol: {
    flex: 1,
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  headerSuperTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // 2. Segmented Switcher
  switcherContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  switcherTrack: {
    flexDirection: "row",
    backgroundColor: "#EEF2F6",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  switcherPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 6,
  },
  switcherPillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  switcherLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  switcherLabelActive: {
    color: "#0F172A",
    fontWeight: "800",
  },

  // 3. Active Booking Card
  activeBookingCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bookingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  dismissBtn: {
    padding: 4,
  },
  bookingContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  bookingSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  bookingPrice: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#059669",
  },
  bookingActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  bookingBtnSecondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  bookingBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  bookingBtnPrimary: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#059669",
    gap: 6,
  },
  bookingBtnPrimaryText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 4. Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  clearSearchBtn: {
    padding: 4,
  },

  // 5. Area Pills
  filterSection: {
    marginTop: 12,
  },
  areaScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  areaPill: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  areaPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  areaPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  areaPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // 6. Sub Filter Bar
  subFilterBar: {
    marginTop: 10,
  },
  subFilterScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  subPill: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  subPillActive: {
    backgroundColor: "#059669",
  },
  subPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  subPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // 7. Privilege Banner
  privilegeCardContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  privilegeCard: {
    backgroundColor: "#064E3B",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  privilegeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  privilegeBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FDE68A",
    letterSpacing: 0.6,
  },
  privilegeTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 4,
  },
  privilegeSubtitle: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 16,
  },

  // 8. Listings
  listingSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  listingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
    flex: 1,
  },
  listingCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: "#64748B",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
  },
  emptyResetBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0F172A",
  },
  emptyResetBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Property Card
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    height: 190,
    width: "100%",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardBadgePill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  cardHeartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCountTag: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  specialHighlightTag: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "#D97706",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specialHighlightText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cardContent: {
    padding: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardLocationCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardLocationText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },
  cardRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardRatingScore: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardReviewsCount: {
    fontSize: 11,
    color: "#94A3B8",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 8,
  },
  amenityTag: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  amenityTagText: {
    fontSize: 10.5,
    color: "#475569",
    fontWeight: "600",
  },
  cashbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  cashbackPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#059669",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLeadText: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
  },
  priceValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  priceMainVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  priceUnitVal: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  viewDetailBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  // 9. Trust Badges
  trustSection: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  trustItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 2,
  },
  trustDesc: {
    fontSize: 9.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 13,
  },

  // 10. E-Receipt Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalHeaderSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  receiptScroll: {
    padding: 18,
  },
  receiptCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptHeader: {
    backgroundColor: "#064E3B",
    padding: 18,
    alignItems: "center",
    gap: 4,
  },
  receiptBrand: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },
  receiptMeta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  receiptVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    gap: 4,
  },
  receiptVerifiedText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#064E3B",
  },
  receiptContent: {
    padding: 16,
    gap: 8,
  },
  receiptSectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#064E3B",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptLabel: {
    fontSize: 11.5,
    color: "#64748B",
  },
  receiptValue: {
    fontSize: 11.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  receiptValueBold: {
    fontSize: 11.5,
    color: "#0F172A",
    fontWeight: "800",
  },
  receiptValueBoldGreen: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "800",
  },
  receiptTotalContainer: {
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  receiptTotalLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#065F46",
  },
  receiptTotalVal: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#065F46",
  },
  receiptTotalNote: {
    fontSize: 10.5,
    color: "#047857",
    marginTop: 2,
  },
  barcodeContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  barcodeLinesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    marginVertical: 6,
  },
  barcodeCodeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 2,
  },
  barcodeSubLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
});
