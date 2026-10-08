import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
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
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  MapPin,
  LayoutGrid,
  User,
  Users,
  Percent,
  Star,
  Heart,
  ChevronRight,
  ChevronDown,
  X,
  Wifi,
  Laptop,
  ShowerHead,
  Utensils,
  Car,
  Shirt,
  ShieldCheck,
  Headphones,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Building2,
  Calendar,
  FileText,
  Check,
  Hotel,
  Ticket,
  Sparkles,
  Compass,
  TreePine,
  Waves,
  Coffee,
  Gift,
  Zap,
} from "lucide-react-native";
import { Nav } from "../../types";
import { fetchAllKosts, fetchCustomerBookings } from "../../services/kostService";
import {
  setSelectedKost,
  getActiveCustomerBooking,
  subscribeCustomerBooking,
  ActiveCustomerBooking,
  LodgingCategoryType,
  SelectedKost,
} from "./customerKosStore";
import {
  MOCK_HOTELS_AND_VILLAS,
  MOCK_TOURIST_ATTRACTIONS,
  TravelDestinationUI,
} from "../../services/lodgingTravelService";
import { AuthAccount } from "../auth/authTypes";
import { Linking } from "react-native";
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

const setBannerRestoredInStorage = (bookingId?: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage && bookingId) {
      const dismissedList = JSON.parse(window.localStorage.getItem(DISMISSED_BOOKING_KEY) || "[]");
      const updated = dismissedList.filter((id: string) => id !== bookingId);
      window.localStorage.setItem(DISMISSED_BOOKING_KEY, JSON.stringify(updated));
    }
  } catch (e) {}
};

const PROMO_DEALS = [
  {
    id: "p1",
    tag: "MAHASISWA & KOST",
    title: "Diskon 20% Kos Baru",
    sub: "Potongan sewa bulan pertama untuk mahasiswa baru & civitas akademika",
    code: "MABARANGER",
    color: "#0D7A53",
    bgLight: "#E8F5EE",
  },
  {
    id: "p2",
    tag: "STAYCATION HOTEL",
    title: "Weekend Cashback 50k",
    sub: "Booking Hotel & Resort Cipanas/Kamojang dapat Cashback Poin",
    code: "STAYWEEKEND",
    color: "#0284C7",
    bgLight: "#E0F2FE",
  },
  {
    id: "p3",
    tag: "TIKET WISATA & RIDE",
    title: "Bundling Wisata + Ride",
    sub: "Beli tiket Sabda Alam / Kamojang gratis voucher Kanyaah Ride",
    code: "WISATARIDE",
    color: "#D97706",
    bgLight: "#FEF3C7",
  },
];

const AREA_CHIPS = [
  "Semua Area",
  "Garut Kota",
  "Cipanas / Tarogong",
  "Kamojang / Samarang",
  "Bandung Dago",
  "Dekat Kampus",
];

export const CustomerKosScreen: React.FC<CustomerKosScreenProps> = ({ navigate, authAccount }) => {
  // Main Category Mode (Traveloka style): kost | hotel | wisata
  const [mainCategory, setMainCategory] = useState<LodgingCategoryType>("kost");

  // Sub filters
  const [selectedArea, setSelectedArea] = useState("Semua Area");
  const [activeKostGender, setActiveKostGender] = useState<"semua" | "putra" | "putri" | "campur">("semua");
  const [hotelTypeFilter, setHotelTypeFilter] = useState("Semua");
  const [wisataTypeFilter, setWisataTypeFilter] = useState("Semua");

  const [searchQuery, setSearchQuery] = useState("");
  const [isPromoVisible, setIsPromoVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dbKosts, setDbKosts] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<ActiveCustomerBooking | null>(null);
  const [isBookingBannerVisible, setIsBookingBannerVisible] = useState(true);
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
            const categoryType: LodgingCategoryType = (k.categoryType as LodgingCategoryType) || "kost";
            const hotelPrices = Array.isArray(k.hotelRooms) ? k.hotelRooms.map((hr: any) => Number(hr.pricePerNight) || 0).filter((p: number) => p > 0) : [];
            const ticketPrices = Array.isArray(k.wisataTickets) ? k.wisataTickets.map((wt: any) => Number(wt.price) || 0).filter((p: number) => p > 0) : [];
            
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

            // Calculate distance using GPS coordinates (Default center: Garut Kota -7.2278, 107.9087)
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
              location: k.address || k.city || "Alamat Kost",
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
              facilities: uniqueFacilities.length > 0 ? uniqueFacilities : ["WiFi", "KM Dalam", "Kasur", "Lemari"],
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

        // Fetch customer's real bookings ONLY if logged-in account is a customer
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
              durationMonths: latest.durationMonths || 1,
              monthlyPrice: latest.monthlyPrice || 1500000,
              totalAmount: latest.totalAmount || 1500000,
              dpAmount: latest.dpAmount || 300000,
              dpProofImage: latest.dpProofImage,
              status: latest.status || "dp_submitted",
              rejectionReason: latest.rejectionReason,
              verifiedAt: latest.verifiedAt,
              createdAt: latest.createdAt,
              ownerPhone: latest.ownerId?.phone || "087805987309",
              ownerName: latest.ownerId?.name || "Pemilik Kos",
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

  // Merge items according to currently selected mainCategory
  const currentItemsList = React.useMemo(() => {
    const matchingFromDb = (dbKosts || [])
      .filter((k) => (k?.categoryType || "kost") === mainCategory)
      .map((k) => {
        let sanitizedType = k.type;
        let sanitizedFacilities = Array.isArray(k.facilities) ? [...k.facilities] : [];
        if (mainCategory === "wisata") {
          if (!sanitizedType || ["campur", "putri", "putra"].includes(String(sanitizedType).toLowerCase())) {
            sanitizedType = "Wisata Rekreasi";
          }
          const ticketFacs = Array.from(
            new Set(
              (Array.isArray(k.wisataTickets) ? k.wisataTickets : [])
                .flatMap((t: any) => t.includedFacilities || t.facilities || [])
            )
          ).filter(Boolean);
          if (ticketFacs.length > 0) {
            sanitizedFacilities = ticketFacs;
          } else if (sanitizedFacilities.length > 0) {
            sanitizedFacilities = sanitizedFacilities.filter(
              (f: string) => !["Kasur", "KM Dalam", "Lemari", "Meja"].includes(f)
            );
          }
        } else if (mainCategory === "hotel") {
          if (!sanitizedType || ["campur", "putri", "putra"].includes(String(sanitizedType).toLowerCase())) {
            sanitizedType = "Hotel & Villa";
          }
          const hotelFacs = Array.from(
            new Set(
              (Array.isArray(k.hotelRooms) ? k.hotelRooms : [])
                .flatMap((r: any) => r.facilities || [])
            )
          ).filter(Boolean);
          if (hotelFacs.length > 0) {
            sanitizedFacilities = hotelFacs;
          } else if (sanitizedFacilities.length > 0) {
            sanitizedFacilities = sanitizedFacilities.filter(
              (f: string) => !["Kasur", "KM Dalam"].includes(f)
            );
          }
        }

        return {
          ...k,
          type: sanitizedType,
          facilities: sanitizedFacilities,
          categoryType: mainCategory,
          status: mainCategory === "wisata" ? "Buka Hari Ini" : "Tersedia",
          img: (k.images && k.images[0]) ? k.images[0] : (mainCategory === "wisata" ? "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80" : mainCategory === "hotel" ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"),
          photoCount: (k.images && k.images.length) ? k.images.length : 1,
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
        name: h.name || "Hotel & Villa",
        type: h.type || "Hotel",
        status: "Tersedia",
        location: h.address || h.city || "Garut",
        city: h.city || "Garut",
        areaTag: h.areaTag || "Garut Kota",
        badgeTag: h.badgeTag,
        rating: h.rating || 4.8,
        reviews: h.reviewCount || 100,
        price: h.price || 500000,
        cashbackPoints: h.cashbackPoints || 25000,
        facilities: h.facilities || [],
        img: (h.images && h.images[0]) ? h.images[0] : "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        images: h.images || [],
        photoCount: (h.images && h.images.length) ? h.images.length : 3,
        stars: typeof h.stars === "number" ? Math.min(5, Math.max(1, Math.round(h.stars))) : 4,
        raw: h,
      }));
    } else {
      return (MOCK_TOURIST_ATTRACTIONS || []).map((w) => ({
        id: w.id || w._id,
        _id: w._id || w.id,
        categoryType: "wisata" as LodgingCategoryType,
        name: w.name || "Tiket Wisata",
        type: w.type || "Wisata",
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
        facilities: w.facilities || [],
        img: (w.images && w.images[0]) ? w.images[0] : "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80",
        images: w.images || [],
        photoCount: (w.images && w.images.length) ? w.images.length : 3,
        raw: w,
      }));
    }
  }, [mainCategory, dbKosts]);

  // Filter items based on search query, area chip, and specific subcategory
  const filteredList = React.useMemo(() => {
    return (currentItemsList || []).filter((item: any) => {
      if (!item) return false;
      const itemLocation = (item.location || item.address || "").toLowerCase();
      const itemCity = (item.city || "").toLowerCase();
      const areaQuery = (selectedArea || "").toLowerCase();

      // Area match
      const matchesArea =
        selectedArea === "Semua Area" ||
        item.areaTag === selectedArea ||
        itemLocation.includes(areaQuery) ||
        itemCity.includes(areaQuery);

      // Specific Sub-category match
      let matchesSub = true;
      const itemType = (item.type || "").toLowerCase();
      if (mainCategory === "kost") {
        matchesSub =
          activeKostGender === "semua" ||
          itemType === activeKostGender.toLowerCase();
      } else if (mainCategory === "hotel") {
        matchesSub =
          hotelTypeFilter === "Semua" ||
          itemType.includes(hotelTypeFilter.toLowerCase());
      } else if (mainCategory === "wisata") {
        matchesSub =
          wisataTypeFilter === "Semua" ||
          itemType.includes(wisataTypeFilter.toLowerCase());
      }

      // Search text match
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

  const handleOpenWhatsAppOwner = (phone?: string, name?: string, roomNumber?: string) => {
    const cleanPhone = (phone || "087805987309").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg = `Halo Pengelola ${name || "Properti"}, saya ingin konfirmasi perihal pemesanan ${roomNumber ? `No. ${roomNumber}` : ""} saya di aplikasi GEOVERSE.`;
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
        price: item.price || 950000,
        dpAmount: Math.round((item.price || 950000) * 0.2),
        facilities: item.facilities || ["WiFi", "AC"],
        images: item.images || [item.img],
        rating: item.rating,
        reviewCount: item.reviews,
      });
    }
    navigate("c_kos_detail");
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Main Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Kanyaah Kost & Travel</Text>
          <Text style={styles.headerSubTitle}>Kost, Hotel, Villa & Tiket Wisata Garut - Bandung</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ============================================================ */}
        {/* TRAVELOKA STYLE 3-PILL MAIN SWITCHER                         */}
        {/* ============================================================ */}
        <View style={styles.mainSwitcherCard}>
          <View style={styles.switcherPillContainer}>
            {/* Tab 1: Kost */}
            <TouchableOpacity
              style={[
                styles.switcherTab,
                mainCategory === "kost" && styles.switcherTabActiveKost,
              ]}
              onPress={() => setMainCategory("kost")}
              activeOpacity={0.85}
            >
              <Building2
                size={16}
                color={mainCategory === "kost" ? "#0D7A53" : "#64748B"}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.switcherTabText,
                  mainCategory === "kost" && styles.switcherTabTextActiveKost,
                ]}
              >
                Kost & Coliving
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Hotel & Villa */}
            <TouchableOpacity
              style={[
                styles.switcherTab,
                mainCategory === "hotel" && styles.switcherTabActiveHotel,
              ]}
              onPress={() => setMainCategory("hotel")}
              activeOpacity={0.85}
            >
              <Hotel
                size={16}
                color={mainCategory === "hotel" ? "#0284C7" : "#64748B"}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.switcherTabText,
                  mainCategory === "hotel" && styles.switcherTabTextActiveHotel,
                ]}
              >
                Hotel & Villa
              </Text>
            </TouchableOpacity>

            {/* Tab 3: Wisata & Atraksi */}
            <TouchableOpacity
              style={[
                styles.switcherTab,
                mainCategory === "wisata" && styles.switcherTabActiveWisata,
              ]}
              onPress={() => setMainCategory("wisata")}
              activeOpacity={0.85}
            >
              <Ticket
                size={16}
                color={mainCategory === "wisata" ? "#D97706" : "#64748B"}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.switcherTabText,
                  mainCategory === "wisata" && styles.switcherTabTextActiveWisata,
                ]}
              >
                Tiket Wisata
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Customer Booking Status Banner (If Any) */}
        {activeBooking && activeBooking._id && authAccount?.role === "customer" && isBookingBannerVisible && (
          <View
            style={[
              styles.activeBookingCard,
              activeBooking.status === "dp_verified"
                ? styles.bookingCardVerified
                : activeBooking.status === "rejected"
                ? styles.bookingCardRejected
                : styles.bookingCardPending,
            ]}
          >
            <View style={styles.bookingCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                <View style={styles.bookingCodePill}>
                  <Building2 size={13} color="#0D7A53" />
                  <Text style={styles.bookingCodeText}>{activeBooking.bookingCode}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadgePill,
                    activeBooking.status === "dp_verified"
                      ? { backgroundColor: "#DCFCE7" }
                      : activeBooking.status === "rejected"
                      ? { backgroundColor: "#FEE2E2" }
                      : { backgroundColor: "#FEF3C7" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgePillText,
                      activeBooking.status === "dp_verified"
                        ? { color: "#166534" }
                        : activeBooking.status === "rejected"
                        ? { color: "#DC2626" }
                        : { color: "#D97706" },
                    ]}
                  >
                    {activeBooking.status === "dp_verified"
                      ? "✓ Terverifikasi (Siap Pakai)"
                      : activeBooking.status === "rejected"
                      ? "❌ Pembayaran Ditolak"
                      : "⏳ Menunggu Konfirmasi"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (activeBooking) {
                    setBannerDismissedInStorage(activeBooking._id || activeBooking.bookingCode);
                  }
                  setIsBookingBannerVisible(false);
                }}
                style={styles.closeBookingBannerBtn}
                activeOpacity={0.7}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.bookingKostTitle}>{activeBooking.kostName}</Text>
            <Text style={styles.bookingRoomSub}>
              {activeBooking.roomNumber ? `Kamar ${activeBooking.roomNumber} • ` : ""}
              Tgl: {activeBooking.entryDate}
            </Text>

            <View style={styles.bookingDivider} />

            <View style={styles.bookingDetailRow}>
              <Text style={styles.bookingDpLabel}>Uang Muka / Terbayar:</Text>
              <Text style={styles.bookingDpValue}>{rp(activeBooking.dpAmount || activeBooking.totalAmount)}</Text>
            </View>

            <View style={{ gap: 8, marginTop: 14 }}>
              {(activeBooking.status === "dp_verified" || activeBooking.status === "completed") && (
                <TouchableOpacity
                  style={styles.btnDownloadNota}
                  onPress={() => setIsNotaModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <FileText size={16} color="#0D7A53" />
                  <Text style={styles.btnDownloadNotaText}>Unduh / Lihat E-Receipt Nota</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.btnChatOwnerWa}
                onPress={() => handleOpenWhatsAppOwner(activeBooking.ownerPhone, activeBooking.kostName, activeBooking.roomNumber)}
                activeOpacity={0.85}
              >
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={styles.btnChatOwnerWaText}>Chat Pengelola via WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search Bar with Near Me Button */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              mainCategory === "kost"
                ? "Cari nama kos, area kampus, atau fasilitas..."
                : mainCategory === "hotel"
                ? "Cari hotel, resort, villa, atau staycation..."
                : "Cari tempat wisata, waterpark, kawah, danau..."
            }
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.nearMePill} activeOpacity={0.8}>
            <MapPin size={13} color="#0D7A53" />
            <Text style={styles.nearMeText}>Dekat saya</Text>
          </TouchableOpacity>
        </View>

        {/* Area Destination Filter Pills */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Destinasi & Lokasi Populer</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.areaChipsRow}
          >
            {AREA_CHIPS.map((area, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.areaChip,
                  selectedArea === area && styles.areaChipActive,
                ]}
                onPress={() => setSelectedArea(area)}
                activeOpacity={0.8}
              >
                <Compass
                  size={13}
                  color={selectedArea === area ? "#FFFFFF" : "#4B5563"}
                />
                <Text
                  style={[
                    styles.areaChipText,
                    selectedArea === area && styles.areaChipTextActive,
                  ]}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sub-Category Specific Filter Pills */}
        {mainCategory === "kost" && (
          <View style={styles.subFilterSection}>
            <Text style={styles.filterSectionTitle}>Tipe Kos-Kosan</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              <TouchableOpacity
                style={[styles.pillBtn, activeKostGender === "semua" && styles.pillBtnActive]}
                onPress={() => setActiveKostGender("semua")}
                activeOpacity={0.8}
              >
                <LayoutGrid size={15} color={activeKostGender === "semua" ? "#FFFFFF" : "#0D7A53"} />
                <Text style={[styles.pillText, activeKostGender === "semua" && styles.pillTextActive]}>
                  Semua Tipe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillBtn, activeKostGender === "putra" && styles.pillBtnActive]}
                onPress={() => setActiveKostGender("putra")}
                activeOpacity={0.8}
              >
                <User size={15} color={activeKostGender === "putra" ? "#FFFFFF" : "#0284C7"} />
                <Text style={[styles.pillText, activeKostGender === "putra" && styles.pillTextActive]}>
                  Kos Putra
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillBtn, activeKostGender === "putri" && styles.pillBtnActive]}
                onPress={() => setActiveKostGender("putri")}
                activeOpacity={0.8}
              >
                <User size={15} color={activeKostGender === "putri" ? "#FFFFFF" : "#DB2777"} />
                <Text style={[styles.pillText, activeKostGender === "putri" && styles.pillTextActive]}>
                  Kos Putri
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillBtn, activeKostGender === "campur" && styles.pillBtnActive]}
                onPress={() => setActiveKostGender("campur")}
                activeOpacity={0.8}
              >
                <Users size={15} color={activeKostGender === "campur" ? "#FFFFFF" : "#EA580C"} />
                <Text style={[styles.pillText, activeKostGender === "campur" && styles.pillTextActive]}>
                  Kos Campur
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {mainCategory === "hotel" && (
          <View style={styles.subFilterSection}>
            <Text style={styles.filterSectionTitle}>Kategori Penginapan</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {["Semua", "Hotel Bintang 4", "Resort", "Villa"].map((type, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.pillBtnHotel, hotelTypeFilter === type && styles.pillBtnHotelActive]}
                  onPress={() => setHotelTypeFilter(type)}
                  activeOpacity={0.8}
                >
                  <Hotel size={14} color={hotelTypeFilter === type ? "#FFFFFF" : "#0284C7"} />
                  <Text style={[styles.pillTextHotel, hotelTypeFilter === type && styles.pillTextHotelActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {mainCategory === "wisata" && (
          <View style={styles.subFilterSection}>
            <Text style={styles.filterSectionTitle}>Kategori Wisata</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {["Semua", "Waterpark", "Wisata Alam", "Danau"].map((wType, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.pillBtnWisata, wisataTypeFilter === wType && styles.pillBtnWisataActive]}
                  onPress={() => setWisataTypeFilter(wType)}
                  activeOpacity={0.8}
                >
                  {wType === "Waterpark" ? (
                    <Waves size={14} color={wisataTypeFilter === wType ? "#FFFFFF" : "#D97706"} />
                  ) : wType === "Wisata Alam" ? (
                    <TreePine size={14} color={wisataTypeFilter === wType ? "#FFFFFF" : "#D97706"} />
                  ) : (
                    <Compass size={14} color={wisataTypeFilter === wType ? "#FFFFFF" : "#D97706"} />
                  )}
                  <Text style={[styles.pillTextWisata, wisataTypeFilter === wType && styles.pillTextWisataActive]}>
                    {wType}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Promo & Flash Deals Carousel */}
        {isPromoVisible && (
          <View style={styles.promoSection}>
            <View style={styles.promoHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} color="#D97706" />
                <Text style={styles.promoSectionTitle}>Promo & Cashback Eksklusif</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPromoVisible(false)}>
                <X size={15} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoCardsScroll}>
              {PROMO_DEALS.map((promo) => (
                <View key={promo.id} style={[styles.promoDealCard, { borderColor: promo.color }]}>
                  <View style={[styles.promoDealTag, { backgroundColor: promo.bgLight }]}>
                    <Text style={[styles.promoDealTagText, { color: promo.color }]}>{promo.tag}</Text>
                  </View>
                  <Text style={styles.promoDealTitle}>{promo.title}</Text>
                  <Text style={styles.promoDealSub}>{promo.sub}</Text>
                  <View style={styles.promoDealFooter}>
                    <Text style={styles.promoDealCodeLabel}>KODE:</Text>
                    <View style={styles.promoDealCodeBadge}>
                      <Text style={styles.promoDealCodeText}>{promo.code}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Listing Cards List */}
        <View style={styles.cardsList}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              {mainCategory === "kost"
                ? "Daftar Hunian Kos Pilihan"
                : mainCategory === "hotel"
                ? "Hotel & Villa Terbaik di Garut & Bandung"
                : "Destinasi & Tiket Wisata Populer"}
            </Text>
            <Text style={styles.listHeaderCount}>
              {filteredList.length} Ditemukan
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0D7A53" />
              <Text style={styles.loadingText}>Memuat rekomendasi terbaik untuk Anda...</Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <Compass size={40} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>Tidak ada listing ditemukan</Text>
              <Text style={styles.emptyStateSub}>
                Coba ubah kata kunci pencarian atau filter lokasi area Anda.
              </Text>
            </View>
          ) : (
            filteredList.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.kosCard}
                onPress={() => handleSelectCard(item)}
                activeOpacity={0.9}
              >
                {/* Image Box */}
                <View style={styles.cardImgBox}>
                  <Image source={{ uri: item.img }} style={styles.cardImg} />

                  {/* Photo Count Badge */}
                  <View style={styles.photoCountBadge}>
                    <Text style={styles.photoCountText}>📷 {item.photoCount} Foto</Text>
                  </View>

                  {/* Special Badge Tag (e.g. TERPOPULER, PRIVATE ONSEN) */}
                  {item.badgeTag && (
                    <View style={styles.specialBadge}>
                      <Zap size={11} color="#FFFFFF" />
                      <Text style={styles.specialBadgeText}>{item.badgeTag}</Text>
                    </View>
                  )}

                  {/* Heart Action */}
                  <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7}>
                    <Heart size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Card Details */}
                <View style={styles.cardBody}>
                  {/* Badges Row */}
                  <View style={styles.cardBadgesRow}>
                    <View
                      style={[
                        styles.typeBadge,
                        item.categoryType === "hotel"
                          ? styles.typeHotel
                          : item.categoryType === "wisata"
                          ? styles.typeWisata
                          : item.type === "Putri"
                          ? styles.typePutri
                          : item.type === "Putra"
                          ? styles.typePutra
                          : styles.typeCampur,
                      ]}
                    >
                      {item.categoryType === "hotel" ? (
                        <Hotel size={11} color="#0284C7" />
                      ) : item.categoryType === "wisata" ? (
                        <Ticket size={11} color="#D97706" />
                      ) : (
                        <User
                          size={11}
                          color={
                            item.type === "Putri"
                              ? "#DB2777"
                              : item.type === "Putra"
                              ? "#0284C7"
                              : "#EA580C"
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              item.categoryType === "hotel"
                                ? "#0284C7"
                                : item.categoryType === "wisata"
                                ? "#D97706"
                                : item.type === "Putri"
                                ? "#DB2777"
                                : item.type === "Putra"
                                ? "#0284C7"
                                : "#EA580C",
                          },
                        ]}
                      >
                        {item.categoryType === "wisata"
                          ? (item.type && !["campur", "putri", "putra"].includes(item.type.toLowerCase()) ? item.type : "Wisata Rekreasi")
                          : item.categoryType === "hotel"
                          ? (item.type && !["campur", "putri", "putra"].includes(item.type.toLowerCase()) ? item.type : "Hotel & Villa")
                          : item.type}
                      </Text>
                    </View>

                    {typeof item.stars === "number" && item.stars > 0 ? (
                      <View style={styles.starsBadge}>
                        {Array.from({ length: Math.min(5, Math.max(1, Math.round(item.stars))) }).map((_, i) => (
                          <Star key={i} size={11} color="#FBBF24" fill="#FBBF24" />
                        ))}
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.statusBadge,
                        item.status === "Tersedia" || item.status === "Buka Hari Ini"
                          ? styles.statusGreen
                          : styles.statusRed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              item.status === "Tersedia" || item.status === "Buka Hari Ini"
                                ? "#0D7A53"
                                : "#DC2626",
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Location */}
                  <Text style={styles.kosTitle} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <View style={styles.locationRow}>
                    <MapPin size={13} color="#0D7A53" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.distance ? (
                        <Text style={{ fontWeight: "700", color: "#0D7A53" }}>
                          {item.distance} •{" "}
                        </Text>
                      ) : null}
                      {item.location}
                    </Text>
                  </View>

                  {/* Rating & Review */}
                  <View style={styles.ratingRow}>
                    <Star size={13} color="#EAB308" fill="#EAB308" />
                    <Text style={styles.ratingVal}>{item.rating}</Text>
                    <Text style={styles.reviewsText}>
                      ({item.reviews > 0 ? `${item.reviews} ulasan` : "Terverifikasi"})
                    </Text>
                  </View>

                  {/* Highlights of options (Paket Tiket / Tipe Kamar) */}
                  {item.categoryType === "wisata" && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, gap: 4 }}>
                        <Ticket size={11} color="#D97706" />
                        <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#B45309" }}>
                          {Array.isArray(item.wisataTickets) && item.wisataTickets.length > 0
                            ? `${item.wisataTickets.length} Pilihan Paket Tiket`
                            : "Tersedia Tiket Masuk"}
                        </Text>
                      </View>
                    </View>
                  )}

                  {item.categoryType === "hotel" && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#E0F2FE", paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, gap: 4 }}>
                        <Hotel size={11} color="#0284C7" />
                        <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#0369A1" }}>
                          {Array.isArray(item.hotelRooms) && item.hotelRooms.length > 0
                            ? `${item.hotelRooms.length} Tipe Kamar & Villa`
                            : "Tipe Kamar Tersedia"}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Facility Chips Row */}
                  <View style={styles.facilitiesRow}>
                    {item.facilities &&
                      item.facilities.slice(0, 4).map((f: string, idx: number) => (
                        <View key={idx} style={styles.facilityChip}>
                          <Text style={styles.facilityText}>{f}</Text>
                        </View>
                      ))}
                  </View>

                  {/* Cashback Poin Callout */}
                  {item.cashbackPoints ? (
                    <View style={styles.cashbackRow}>
                      <Gift size={12} color="#D97706" />
                      <Text style={styles.cashbackText}>
                        Cashback +{item.cashbackPoints.toLocaleString("id-ID")} GEOVERSE Point
                      </Text>
                    </View>
                  ) : null}

                  {/* Footer Price & Chevron */}
                  <View style={styles.cardFooterRow}>
                    <View>
                      <Text style={styles.startFromText}>
                        {mainCategory === "kost"
                          ? "Mulai dari sewa bulanan"
                          : mainCategory === "hotel"
                          ? "Mulai dari per malam"
                          : "Mulai dari per tiket"}
                      </Text>
                      <Text style={styles.priceValText}>
                        {rp(item.price)}{" "}
                        <Text style={styles.unitText}>
                          {mainCategory === "kost"
                            ? "/bulan"
                            : mainCategory === "hotel"
                            ? "/malam"
                            : "/tiket"}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.chevronCircleGreen}>
                      <ChevronRight size={16} color="#0D7A53" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Footer Guarantee Info Row */}
        <View style={styles.footerGuaranteeRow}>
          <View style={styles.guaranteeItem}>
            <ShieldCheck size={16} color="#0D7A53" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Aman & Terverifikasi</Text>{"\n"}
              Listing telah disurvei resmi
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Sparkles size={16} color="#0284C7" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Poin GEOVERSE</Text>{"\n"}
              Bisa pakai poin Bank Sampah
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Headphones size={16} color="#EA580C" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Layanan 24/7</Text>{"\n"}
              Bantuan pelanggan siap siaga
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal E-Receipt Nota */}
      <Modal visible={isNotaModalOpen} transparent animationType="slide">
        <View style={styles.notaModalOverlay}>
          <View style={styles.notaModalContent}>
            <View style={styles.notaModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.notaHeaderIconBg}>
                  <FileText size={18} color="#0D7A53" />
                </View>
                <Text style={styles.notaModalHeaderTitle}>
                  {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                    ? "E-Tiket Resmi Wisata"
                    : activeBooking?.categoryType === "hotel" || String(activeBooking?.bookingCode || "").startsWith("HTL") || activeBooking?.durationNights
                    ? "Voucher Reservasi Hotel"
                    : "Nota Resmi Pemesanan"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.notaCloseBtn}
                onPress={() => setIsNotaModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.notaScrollArea}>
              <View style={styles.receiptCard}>
                <View style={styles.receiptTopBanner}>
                  <Text style={styles.receiptBrand}>GEOVERSE</Text>
                  <Text style={styles.receiptSubBrand}>
                    {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                      ? "E-Tiket & Bukti Masuk Wisata"
                      : activeBooking?.categoryType === "hotel" || String(activeBooking?.bookingCode || "").startsWith("HTL") || activeBooking?.durationNights
                      ? "Voucher & Konfirmasi Hotel"
                      : "E-Receipt & Konfirmasi Pemesanan"}
                  </Text>
                  <View style={styles.receiptVerifiedBadge}>
                    <Check size={13} color="#0D7A53" strokeWidth={3} />
                    <Text style={styles.receiptVerifiedText}>TERVERIFIKASI RESMI</Text>
                  </View>
                </View>

                <View style={styles.receiptBody}>
                  <View style={styles.receiptCodeBox}>
                    <View>
                      <Text style={styles.receiptCodeLabel}>NO. NOTA / KODE BOOKING</Text>
                      <Text style={styles.receiptCodeVal}>{activeBooking?.bookingCode || "GEO-ONLINE"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.receiptCodeLabel}>TGL TERBIT</Text>
                      <Text style={styles.receiptDateVal}>
                        {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.receiptSectionHeader}>DATA PEMESAN</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Nama Pemesan</Text>
                    <Text style={styles.receiptValBold}>{activeBooking?.customerName || authAccount?.name || "Customer"}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>No. WhatsApp</Text>
                    <Text style={styles.receiptVal}>{activeBooking?.customerPhone || authAccount?.phone || "-"}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Email</Text>
                    <Text style={styles.receiptVal}>{activeBooking?.customerEmail || authAccount?.email || "customer@geoverse.id"}</Text>
                  </View>

                  <Text style={styles.receiptSectionHeader}>
                    {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                      ? "DETAIL TIKET WISATA"
                      : activeBooking?.categoryType === "hotel" || String(activeBooking?.bookingCode || "").startsWith("HTL") || activeBooking?.durationNights
                      ? "DETAIL RESERVASI HOTEL"
                      : "DETAIL PROPERTI / KOS"}
                  </Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Nama Tempat</Text>
                    <Text style={styles.receiptValBoldGreen}>{activeBooking?.kostName || "Properti"}</Text>
                  </View>
                  {activeBooking?.roomNumber && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>
                        {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                          ? "Paket Tiket"
                          : activeBooking?.categoryType === "hotel" || String(activeBooking?.bookingCode || "").startsWith("HTL") || activeBooking?.durationNights
                          ? "Tipe Kamar"
                          : "Kamar"}
                      </Text>
                      <Text style={styles.receiptVal}>
                        {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                          ? String(activeBooking.roomNumber).replace(/^(Kamar\s*)+/gi, "")
                          : activeBooking?.categoryType === "hotel"
                          ? `${activeBooking.roomNumber} (${activeBooking.roomType || "Standard"})`
                          : `Kamar ${activeBooking.roomNumber} (${activeBooking.roomType || "Standar"})`}
                      </Text>
                    </View>
                  )}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                        ? "Tanggal Kunjungan"
                        : activeBooking?.categoryType === "hotel"
                        ? "Tanggal Check-in"
                        : "Tgl Masuk (Check-in)"}
                    </Text>
                    <Text style={styles.receiptVal}>{activeBooking?.entryDate || "-"}</Text>
                  </View>

                  <View style={styles.receiptTotalBox}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={styles.receiptTotalLabel}>
                        {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                          ? "Pembayaran Tiket"
                          : activeBooking?.categoryType === "hotel"
                          ? "DP Terbayar (50%)"
                          : "Uang Muka / Terbayar"}
                      </Text>
                      <Text style={styles.receiptTotalVal}>{rp(activeBooking?.dpAmount || activeBooking?.totalAmount || 0)} (LUNAS ✓)</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#166534" }}>
                      {activeBooking?.categoryType === "wisata" || String(activeBooking?.bookingCode || "").startsWith("WST") || activeBooking?.ticketCount
                        ? "Tunjukkan e-tiket digital ini kepada petugas saat tiba di lokasi."
                        : "Tunjukkan nota digital ini saat tiba di lokasi."}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubTitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Main Switcher (Traveloka 3-Pill Switcher)
  mainSwitcherCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  switcherPillContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  switcherTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
    gap: 5,
  },
  switcherTabActiveKost: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  switcherTabActiveHotel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  switcherTabActiveWisata: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  switcherTabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  switcherTabTextActiveKost: {
    color: "#0D7A53",
    fontWeight: "800",
  },
  switcherTabTextActiveHotel: {
    color: "#0284C7",
    fontWeight: "800",
  },
  switcherTabTextActiveWisata: {
    color: "#D97706",
    fontWeight: "800",
  },

  // Active Booking Card
  activeBookingCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  bookingCardVerified: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  bookingCardRejected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  bookingCardPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingCodePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bookingCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgePillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  closeBookingBannerBtn: {
    padding: 4,
  },
  bookingKostTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  bookingRoomSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  bookingDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingDpLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  bookingDpValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },
  btnDownloadNota: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  btnDownloadNotaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  btnChatOwnerWa: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  btnChatOwnerWaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
  },
  nearMePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  nearMeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Filter Sections
  filterSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  subFilterSection: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  filterSectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  areaChipsRow: {
    gap: 8,
    paddingRight: 16,
  },
  areaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 6,
  },
  areaChipActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  areaChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  areaChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterPillsRow: {
    gap: 8,
    paddingRight: 16,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  pillBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  pillBtnHotel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  pillBtnHotelActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  pillTextHotel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  pillTextHotelActive: {
    color: "#FFFFFF",
  },
  pillBtnWisata: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  pillBtnWisataActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  pillTextWisata: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  pillTextWisataActive: {
    color: "#FFFFFF",
  },

  // Promo Section
  promoSection: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  promoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  promoSectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  promoCardsScroll: {
    gap: 10,
    paddingRight: 16,
  },
  promoDealCard: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  promoDealTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoDealTagText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  promoDealTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  promoDealSub: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 14,
  },
  promoDealFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  promoDealCodeLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
  },
  promoDealCodeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promoDealCodeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.5,
  },

  // Listing Cards
  cardsList: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  listHeaderCount: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyStateSub: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
  },
  kosCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImgBox: {
    height: 160,
    width: "100%",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
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
  specialBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97706",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  specialBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 12,
  },
  cardBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  typePutri: {
    backgroundColor: "#FCE7F3",
  },
  typePutra: {
    backgroundColor: "#E0F2FE",
  },
  typeCampur: {
    backgroundColor: "#FFEDD5",
  },
  typeHotel: {
    backgroundColor: "#E0F2FE",
  },
  typeWisata: {
    backgroundColor: "#FEF3C7",
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  starsBadge: {
    flexDirection: "row",
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusGreen: {
    backgroundColor: "#DCFCE7",
  },
  statusRed: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  kosTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 19,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 11.5,
    color: "#64748B",
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingVal: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  reviewsText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
  },
  facilityChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  facilityText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  cashbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  cashbackText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  startFromText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  priceValText: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#0D7A53",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  chevronCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer Guarantees
  footerGuaranteeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  guaranteeItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  guaranteeText: {
    fontSize: 9.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 12,
  },

  // Modal Nota
  notaModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  notaModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    maxHeight: "85%",
    overflow: "hidden",
  },
  notaModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  notaHeaderIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  notaModalHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  notaCloseBtn: {
    padding: 4,
  },
  notaScrollArea: {
    padding: 16,
  },
  receiptCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptTopBanner: {
    backgroundColor: "#0D7A53",
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  receiptBrand: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  receiptSubBrand: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
  },
  receiptVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    gap: 4,
  },
  receiptVerifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
  },
  receiptBody: {
    padding: 14,
    gap: 8,
  },
  receiptCodeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptCodeLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
  },
  receiptCodeVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  receiptDateVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  receiptSectionHeader: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 8,
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
  receiptVal: {
    fontSize: 11.5,
    color: "#0F172A",
    fontWeight: "600",
  },
  receiptValBold: {
    fontSize: 11.5,
    color: "#0F172A",
    fontWeight: "800",
  },
  receiptValBoldGreen: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "800",
  },
  receiptTotalBox: {
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  receiptTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#166534",
  },
  receiptTotalVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#166534",
  },
});
