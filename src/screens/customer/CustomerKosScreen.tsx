import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
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
  ActivityIndicator,
  Modal,
  Alert,
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
  Download,
  Printer,
  Share2,
  Check,
} from "lucide-react-native";
import { Nav } from "../../types";
import { fetchAllKosts, fetchCustomerBookings } from "../../services/kostService";
import { setSelectedKost, getActiveCustomerBooking, subscribeCustomerBooking, ActiveCustomerBooking } from "./customerKosStore";
import { AuthAccount } from "../auth/authTypes";
import { Linking } from "react-native";

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

export const CustomerKosScreen: React.FC<CustomerKosScreenProps> = ({ navigate, authAccount }) => {
  const [activeCategory, setActiveCategory] = useState<"semua" | "putra" | "putri" | "campur">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBannerVisible, setIsBannerVisible] = useState(true);
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
              .filter((p: number) => p > 0);
            const minPrice = roomPrices.length > 0 ? Math.min(...roomPrices) : Number(k.price || 0);

            // Photos: prioritize owner's uploaded room photos
            const roomPhotos = allRooms
              .flatMap((r: any) => (Array.isArray(r.images) ? r.images : []))
              .filter(Boolean);
            const kostPhotos = (Array.isArray(k.images) ? k.images : []).filter(Boolean);
            const allPhotos = roomPhotos.length > 0 ? roomPhotos : kostPhotos;
            const primaryImg =
              allPhotos[0] ||
              "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";

            // Facilities from rooms or kost
            const roomFacilities = allRooms.flatMap((r: any) => (Array.isArray(r.facilities) ? r.facilities : []));
            const uniqueFacilities = Array.from(new Set([...roomFacilities, ...(k.facilities || [])])).slice(0, 5);

            return {
              id: k._id || k.id,
              name: k.name,
              type: k.type || "Campur",
              status: allRooms.length === 0 ? "Tersedia" : allRooms.some((r: any) => r.isAvailable) ? "Tersedia" : "Penuh",
              location: k.address || k.city || "Alamat Kost",
              rating: k.rating || 5.0,
              reviews: k.reviewCount || 0,
              price: minPrice.toLocaleString("id-ID"),
              facilities: uniqueFacilities,
              img: primaryImg,
              photoCount: allPhotos.length > 0 ? allPhotos.length : 1,
              raw: {
                ...k,
                price: minPrice,
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
              customerName: latest.customerName,
              customerPhone: latest.customerPhone,
              customerEmail: latest.customerEmail,
              kostId: latest.kostId?._id || latest.kostId,
              kostName: latest.kostId?.name || "Kost Pilihan",
              kostAddress: latest.kostId?.address,
              roomNumber: latest.roomNumber || "101",
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
              ownerName: latest.ownerId?.name || "Pemilik Kost",
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

  const kosList = dbKosts;

  const filteredKosList = kosList.filter((item) => {
    const matchesCategory =
      activeCategory === "semua" || item.type.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.facilities.some((f: string) => f.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleOpenWhatsAppOwner = (phone?: string, kostName?: string, roomNumber?: string) => {
    const cleanPhone = (phone || "087805987309").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const msg = `Halo Pemilik ${kostName || "Kost"}, saya ingin konfirmasi perihal booking kamar No. ${roomNumber || ""} saya di aplikasi GEOVERSE.`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const handleShareReceiptWa = () => {
    if (!activeBooking) return;
    const cleanPhone = (activeBooking.ownerPhone || "087805987309").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const sisaBayar = Number(activeBooking.totalAmount || 700000) - Number(activeBooking.dpAmount || 140000);
    const msg = `*BUKTI NOTA KONFIRMASI PEMESANAN KOST*\n` +
      `*GEOVERSE App*\n\n` +
      `📄 No. Nota / Booking: *${activeBooking.bookingCode}*\n` +
      `🏠 Nama Kos: *${activeBooking.kostName}*\n` +
      `🚪 Kamar: *${activeBooking.roomNumber}* (${activeBooking.roomType || "AC"})\n` +
      `📅 Tgl Masuk: *${activeBooking.entryDate}*\n` +
      `👤 Penghuni: *${activeBooking.customerName || authAccount?.name || "Customer"}*\n` +
      `📱 No HP: *${activeBooking.customerPhone || authAccount?.phone || "-"}*\n\n` +
      `💰 Total Sewa (${activeBooking.durationMonths || 1} bln): Rp ${Number(activeBooking.totalAmount || 700000).toLocaleString("id-ID")}\n` +
      `✅ *DP 20% Terbayar: Rp ${Number(activeBooking.dpAmount || 140000).toLocaleString("id-ID")} (LUNAS)*\n` +
      `⏳ Sisa Pelunasan Saat Masuk: Rp ${sisaBayar.toLocaleString("id-ID")}\n\n` +
      `_Status: Kamar Resmi Terkunci & Siap Ditempati._`;

    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const handlePrintOrDownloadPdf = () => {
    if (!activeBooking) return;
    setIsDownloading(true);

    try {
      if (typeof window !== "undefined") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          const sisaBayar = Number(activeBooking.totalAmount || 700000) - Number(activeBooking.dpAmount || 140000);
          const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nota Konfirmasi Pemesanan - ${activeBooking.bookingCode || "GEOVERSE"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
      color: #1f2937;
      background: #f3f4f6;
    }
    .ticket {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.1);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #0D7A53 0%, #15803D 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
      position: relative;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.92;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      margin-top: 14px;
      background: #ffffff;
      color: #0D7A53;
      padding: 6px 16px;
      border-radius: 30px;
      font-weight: 800;
      font-size: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.12);
    }
    .body {
      padding: 28px;
    }
    .code-box {
      background: #f9fafb;
      border: 1.5px dashed #0D7A53;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .code-title {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .code-val {
      font-size: 16px;
      font-weight: 800;
      color: #0D7A53;
      margin-top: 2px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0D7A53;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 1.5px solid #e5e7eb;
      padding-bottom: 6px;
      margin: 22px 0 12px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .label {
      color: #6b7280;
      font-weight: 500;
    }
    .val {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }
    .total-box {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 14px;
      padding: 16px 18px;
      margin-top: 20px;
    }
    .instructions {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 16px;
      margin-top: 24px;
      font-size: 12.5px;
      color: #1e40af;
      line-height: 1.6;
    }
    .footer {
      text-align: center;
      padding: 18px;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      background: #fafafa;
    }
    @media print {
      body { background: transparent; padding: 0; }
      .ticket { box-shadow: none; border: 1px solid #ccc; max-width: 100%; border-radius: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>GEOVERSE</h1>
      <p>Bukti Resmi Konfirmasi Pemesanan & Pembayaran DP Kos</p>
      <div class="badge">✓ RESMI TERVERIFIKASI & KAMAR TERKUNCI</div>
    </div>
    <div class="body">
      <div class="code-box">
        <div>
          <div class="code-title">Nomor Nota / Kode Pemesanan</div>
          <div class="code-val">${activeBooking.bookingCode || "KST-ONLINE"}</div>
        </div>
        <div style="text-align: right;">
          <div class="code-title">Tanggal Terbit</div>
          <div style="font-size: 12px; font-weight: 700; color: #374151; margin-top: 2px;">
            ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <div class="section-title">Informasi Penghuni</div>
      <div class="row">
        <span class="label">Nama Calon Penghuni</span>
        <span class="val">${activeBooking.customerName || authAccount?.name || "Customer"}</span>
      </div>
      <div class="row">
        <span class="label">No. WhatsApp / HP</span>
        <span class="val">${activeBooking.customerPhone || authAccount?.phone || "-"}</span>
      </div>
      <div class="row">
        <span class="label">Email</span>
        <span class="val">${activeBooking.customerEmail || authAccount?.email || "aisyahphr@gmail.com"}</span>
      </div>

      <div class="section-title">Detail Hunian & Kamar</div>
      <div class="row">
        <span class="label">Nama Kos</span>
        <span class="val" style="color: #0D7A53; font-weight: 800;">${activeBooking.kostName || "Kost"}</span>
      </div>
      <div class="row">
        <span class="label">Nomor Kamar</span>
        <span class="val">Kamar ${activeBooking.roomNumber || "101"} (${activeBooking.roomType || "AC"})</span>
      </div>
      <div class="row">
        <span class="label">Tanggal Masuk (Check-in)</span>
        <span class="val">${activeBooking.entryDate || "-"}</span>
      </div>
      <div class="row">
        <span class="label">Durasi Sewa</span>
        <span class="val">${activeBooking.durationMonths || 1} Bulan</span>
      </div>

      <div class="section-title">Rincian Pembayaran DP & Sewa</div>
      <div class="row">
        <span class="label">Biaya Sewa Bulanan</span>
        <span class="val">Rp ${Number(activeBooking.monthlyPrice || 700000).toLocaleString("id-ID")}</span>
      </div>
      <div class="row">
        <span class="label">Total Biaya Sewa (${activeBooking.durationMonths || 1} Bulan)</span>
        <span class="val">Rp ${Number(activeBooking.totalAmount || 700000).toLocaleString("id-ID")}</span>
      </div>
      <div class="total-box">
        <div class="row" style="margin-bottom: 6px;">
          <span style="font-weight: 800; color: #166534; font-size: 13px;">Uang Muka (DP 20%) - DIBAYAR</span>
          <span style="font-weight: 800; color: #166534; font-size: 16px;">Rp ${Number(activeBooking.dpAmount || 140000).toLocaleString("id-ID")} (LUNAS ✓)</span>
        </div>
        <div class="row" style="margin-bottom: 0;">
          <span style="font-size: 12px; color: #4b5563; font-weight: 600;">Sisa Pelunasan Saat Check-in:</span>
          <span style="font-weight: 800; color: #b45309; font-size: 14px;">Rp ${sisaBayar.toLocaleString("id-ID")}</span>
        </div>
      </div>

      <div class="instructions">
        <strong>📌 Petunjuk Serah Terima Kunci:</strong><br/>
        Simpan atau cetak nota ini sebagai tanda bukti sah pemesanan kamar Anda. Tunjukkan nota digital/cetak ini kepada pemilik kos saat tiba di lokasi untuk serah terima kunci kamar dan pelunasan sisa sewa.
      </div>
    </div>
    <div class="footer">
      Diterbitkan secara otomatis oleh Sistem GEOVERSE App • Terverifikasi Real-Time
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
          `;
          printWindow.document.open();
          printWindow.document.write(receiptHtml);
          printWindow.document.close();
        }
      }
    } catch (e) {
      console.warn("Print error:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Kanyaah Homestay / Kos</Text>
          <Text style={styles.headerSubTitle}>Temukan hunian nyaman & strategis</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Customer Booking Status Card (Only for verified customer bookings) */}
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
                      ? "✓ DP Diterima (Siap Huni)"
                      : activeBooking.status === "rejected"
                      ? "❌ DP Ditolak"
                      : "⏳ Menunggu Verifikasi DP"}
                  </Text>
                </View>
              </View>

              {/* Tombol Close untuk Menutup Badge / Banner DP Diterima */}
              <TouchableOpacity
                onPress={() => {
                  if (activeBooking) {
                    setBannerDismissedInStorage(activeBooking._id || activeBooking.bookingCode);
                  }
                  setIsBookingBannerVisible(false);
                }}
                style={styles.closeBookingBannerBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.bookingKostTitle}>{activeBooking.kostName}</Text>
            <Text style={styles.bookingRoomSub}>
              Kamar {activeBooking.roomNumber} ({activeBooking.roomType || "AC"}) • Masuk: {activeBooking.entryDate}
            </Text>

            <View style={styles.bookingDivider} />

            <View style={styles.bookingDetailRow}>
              <Text style={styles.bookingDpLabel}>DP 20% Terkirim:</Text>
              <Text style={styles.bookingDpValue}>Rp {activeBooking.dpAmount.toLocaleString("id-ID")}</Text>
            </View>

            {activeBooking.status === "dp_verified" ? (
              <View style={styles.verifiedNoticeBox}>
                <CheckCircle2 size={16} color="#166534" />
                <Text style={styles.verifiedNoticeText}>
                  Kamar Anda sudah terkunci dan siap ditempati. Hubungi pemilik untuk serah terima kunci kamar.
                </Text>
              </View>
            ) : activeBooking.status === "rejected" ? (
              <View style={styles.rejectedNoticeBox}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.rejectedNoticeText}>
                  {activeBooking.rejectionReason || "Bukti transfer tidak sesuai. Silakan hubungi pemilik kos."}
                </Text>
              </View>
            ) : (
              <View style={styles.pendingNoticeBox}>
                <Clock size={16} color="#D97706" />
                <Text style={styles.pendingNoticeText}>
                  Pemilik kos sedang mencocokkan mutasi transfer DP Anda. Kamar otomatis terkunci saat disetujui.
                </Text>
              </View>
            )}

            {/* Quick Actions (Nota & WhatsApp) */}
            <View style={{ gap: 8, marginTop: 14 }}>
              {/* Button 1: Download / Lihat Nota Konfirmasi Booking (Hanya muncul jika DP sudah di-ACC / Diterima) */}
              {(activeBooking.status === "dp_verified" || activeBooking.status === "completed") && (
                <TouchableOpacity
                  style={styles.btnDownloadNota}
                  onPress={() => setIsNotaModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <FileText size={16} color="#0D7A53" />
                  <Text style={styles.btnDownloadNotaText}>Unduh / Lihat Nota Konfirmasi</Text>
                </TouchableOpacity>
              )}

              {/* Button 2: WhatsApp Chat */}
              <TouchableOpacity
                style={styles.btnChatOwnerWa}
                onPress={() => handleOpenWhatsAppOwner(activeBooking.ownerPhone, activeBooking.kostName, activeBooking.roomNumber)}
                activeOpacity={0.85}
              >
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={styles.btnChatOwnerWaText}>Chat WhatsApp Pemilik Kos</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Mini History / Tracking Widget (Ketika banner ditutup oleh customer) */}
        {activeBooking && activeBooking._id && authAccount?.role === "customer" && !isBookingBannerVisible && (
          <View style={styles.miniTrackingBar}>
            <TouchableOpacity
              style={styles.miniTrackingLeft}
              onPress={() => {
                if (activeBooking) {
                  setBannerRestoredInStorage(activeBooking._id || activeBooking.bookingCode);
                }
                setIsBookingBannerVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.miniTrackingIconBg}>
                <Building2 size={13} color="#0D7A53" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.miniTrackingCode}>{activeBooking.bookingCode}</Text>
                  <Text
                    style={[
                      styles.miniTrackingStatus,
                      activeBooking.status === "dp_verified"
                        ? { color: "#166534" }
                        : activeBooking.status === "rejected"
                        ? { color: "#DC2626" }
                        : { color: "#D97706" },
                    ]}
                  >
                    {activeBooking.status === "dp_verified"
                      ? "• DP Diterima"
                      : activeBooking.status === "rejected"
                      ? "• DP Ditolak"
                      : "• Menunggu Verifikasi"}
                  </Text>
                </View>
                <Text style={styles.miniTrackingSub} numberOfLines={1}>
                  {activeBooking.kostName} (Kamar {activeBooking.roomNumber})
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {(activeBooking.status === "dp_verified" || activeBooking.status === "completed") && (
                <TouchableOpacity
                  style={styles.miniTrackingNotaBtn}
                  onPress={() => setIsNotaModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <FileText size={12} color="#0D7A53" />
                  <Text style={styles.miniTrackingNotaText}>Nota</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.miniTrackingExpandBtn}
                onPress={() => setIsBookingBannerVisible(true)}
                activeOpacity={0.7}
              >
                <ChevronDown size={14} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari lokasi, nama kos, atau fasilitas..."
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

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {/* Semua */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "semua" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("semua")}
            activeOpacity={0.8}
          >
            <LayoutGrid size={15} color={activeCategory === "semua" ? "#FFFFFF" : "#0D7A53"} />
            <Text style={[styles.pillText, activeCategory === "semua" && styles.pillTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>

          {/* Putra */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "putra" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("putra")}
            activeOpacity={0.8}
          >
            <User size={15} color={activeCategory === "putra" ? "#FFFFFF" : "#0284C7"} />
            <Text style={[styles.pillText, activeCategory === "putra" && styles.pillTextActive]}>
              Putra
            </Text>
          </TouchableOpacity>

          {/* Putri */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "putri" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("putri")}
            activeOpacity={0.8}
          >
            <User size={15} color={activeCategory === "putri" ? "#FFFFFF" : "#DB2777"} />
            <Text style={[styles.pillText, activeCategory === "putri" && styles.pillTextActive]}>
              Putri
            </Text>
          </TouchableOpacity>

          {/* Campur */}
          <TouchableOpacity
            style={[styles.pillBtn, activeCategory === "campur" && styles.pillBtnActive]}
            onPress={() => setActiveCategory("campur")}
            activeOpacity={0.8}
          >
            <Users size={15} color={activeCategory === "campur" ? "#FFFFFF" : "#EA580C"} />
            <Text style={[styles.pillText, activeCategory === "campur" && styles.pillTextActive]}>
              Campur
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Promo Banner */}
        {isBannerVisible && (
          <View style={styles.promoBanner}>
            <View style={styles.promoIconSquare}>
              <Percent size={22} color="#0D7A53" />
            </View>

            <View style={styles.promoTextCol}>
              <Text style={styles.promoTitle}>Diskon Spesial!</Text>
              <Text style={styles.promoSub}>
                Dapatkan potongan harga hingga 15% untuk pemesanan bulan ini
              </Text>

              <TouchableOpacity style={styles.btnLihatPromo} activeOpacity={0.8}>
                <Text style={styles.btnLihatPromoText}>Lihat Promo</Text>
                <ChevronRight size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setIsBannerVisible(false)}
              activeOpacity={0.7}
              style={styles.closePromoBtn}
            >
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Kos Cards List */}
        <View style={styles.cardsList}>
          {filteredKosList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Tidak ada kos ditemukan</Text>
              <Text style={styles.emptyStateSub}>
                Coba ubah filter atau kata kunci pencarian Anda.
              </Text>
            </View>
          ) : (
            filteredKosList.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.kosCard}
              onPress={() => {
                if (item.raw) {
                  setSelectedKost(item.raw);
                } else {
                  setSelectedKost({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    address: item.location,
                    price: 950000,
                    dpAmount: 250000,
                    facilities: item.facilities,
                    images: [item.img],
                  });
                }
                navigate("c_kos_detail");
              }}
              activeOpacity={0.9}
            >
              {/* Image Box */}
              <View style={styles.cardImgBox}>
                <Image source={{ uri: item.img }} style={styles.cardImg} />

                {/* Photo Count Badge */}
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountText}>📷 {item.photoCount} Foto</Text>
                </View>

                {/* Heart Action */}
                <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7}>
                  <Heart size={18} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Image Dots */}
                <View style={styles.imageDotsRow}>
                  <View style={[styles.imgDot, styles.imgDotActive]} />
                  <View style={styles.imgDot} />
                  <View style={styles.imgDot} />
                </View>
              </View>

              {/* Card Details */}
              <View style={styles.cardBody}>
                {/* Badges Row */}
                <View style={styles.cardBadgesRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      item.type === "Putri"
                        ? styles.typePutri
                        : item.type === "Putra"
                        ? styles.typePutra
                        : styles.typeCampur,
                    ]}
                  >
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
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color:
                            item.type === "Putri"
                              ? "#DB2777"
                              : item.type === "Putra"
                              ? "#0284C7"
                              : "#EA580C",
                        },
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "Tersedia" ? styles.statusGreen : styles.statusRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: item.status === "Tersedia" ? "#0D7A53" : "#DC2626" },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Title & Location */}
                <Text style={styles.kosTitle}>{item.name}</Text>

                <View style={styles.locationRow}>
                  <MapPin size={13} color="#6B7280" />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>

                {/* Rating Row */}
                <View style={styles.ratingRow}>
                  <Star size={13} color="#EAB308" fill="#EAB308" />
                  <Text style={styles.ratingVal}>{item.rating}</Text>
                  <Text style={styles.reviewsText}>
                    ({item.reviews > 0 ? `${item.reviews} ulasan` : "Belum ada ulasan"})
                  </Text>
                </View>

                {/* Facility Chips Row */}
                <View style={styles.facilitiesRow}>
                  {item.facilities.map((f: string, idx: number) => (
                    <View key={idx} style={styles.facilityChip}>
                      {f === "WiFi" ? (
                        <Wifi size={11} color="#6B7280" />
                      ) : f === "AC" ? (
                        <Laptop size={11} color="#6B7280" />
                      ) : f === "KM Dalam" ? (
                        <ShowerHead size={11} color="#6B7280" />
                      ) : f === "Dapur" ? (
                        <Utensils size={11} color="#6B7280" />
                      ) : f === "Parkir" ? (
                        <Car size={11} color="#6B7280" />
                      ) : (
                        <Shirt size={11} color="#6B7280" />
                      )}
                      <Text style={styles.facilityText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {/* Footer Price & Chevron */}
                <View style={styles.cardFooterRow}>
                  <View>
                    <Text style={styles.startFromText}>Mulai dari</Text>
                    <Text style={styles.priceValText}>
                      Rp {item.price} <Text style={styles.unitText}>/bulan</Text>
                    </Text>
                  </View>

                  <View style={styles.chevronCircleGreen}>
                    <ChevronRight size={16} color="#0D7A53" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )))}
        </View>

        {/* Footer Guarantee Info Row */}
        <View style={styles.footerGuaranteeRow}>
          <View style={styles.guaranteeItem}>
            <ShieldCheck size={16} color="#0D7A53" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Aman & Terverifikasi</Text>{"\n"}
              Semua kos telah diverifikasi
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Users size={16} color="#0284C7" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>
                {dbKosts.length > 0 ? `${dbKosts.length} Properti Kos` : "Pilihan Kos"}
              </Text>{"\n"}
              Pilihan terbaik untukmu
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Headphones size={16} color="#EA580C" />
            <Text style={styles.guaranteeText}>
              <Text style={{ fontWeight: "800", color: "#111827" }}>Layanan 24/7</Text>{"\n"}
              Kami siap membantu
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Nota Konfirmasi & Bukti Pembayaran DP */}
      <Modal visible={isNotaModalOpen} transparent animationType="slide">
        <View style={styles.notaModalOverlay}>
          <View style={styles.notaModalContent}>
            {/* Modal Header */}
            <View style={styles.notaModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.notaHeaderIconBg}>
                  <FileText size={18} color="#0D7A53" />
                </View>
                <Text style={styles.notaModalHeaderTitle}>Nota Resmi Pemesanan</Text>
              </View>
              <TouchableOpacity
                style={styles.notaCloseBtn}
                onPress={() => setIsNotaModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Receipt Body */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.notaScrollArea}>
              <View style={styles.receiptCard}>
                {/* Top Green Banner */}
                <View style={styles.receiptTopBanner}>
                  <Text style={styles.receiptBrand}>GEOVERSE</Text>
                  <Text style={styles.receiptSubBrand}>E-Receipt & Konfirmasi Sewa Kos</Text>
                  <View style={styles.receiptVerifiedBadge}>
                    <Check size={13} color="#0D7A53" strokeWidth={3} />
                    <Text style={styles.receiptVerifiedText}>DP TERVERIFIKASI • RESMI</Text>
                  </View>
                </View>

                {/* Receipt Details */}
                <View style={styles.receiptBody}>
                  {/* Code & Date */}
                  <View style={styles.receiptCodeBox}>
                    <View>
                      <Text style={styles.receiptCodeLabel}>NO. NOTA / KODE BOOKING</Text>
                      <Text style={styles.receiptCodeVal}>{activeBooking?.bookingCode || "KST-ONLINE"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.receiptCodeLabel}>TGL TERBIT</Text>
                      <Text style={styles.receiptDateVal}>
                        {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>

                  {/* Section 1: Penghuni */}
                  <Text style={styles.receiptSectionHeader}>DATA PENGHUNI</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Nama Calon Penghuni</Text>
                    <Text style={styles.receiptValBold}>{activeBooking?.customerName || authAccount?.name || "Customer"}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>No. WhatsApp</Text>
                    <Text style={styles.receiptVal}>{activeBooking?.customerPhone || authAccount?.phone || "-"}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Email</Text>
                    <Text style={styles.receiptVal}>{activeBooking?.customerEmail || authAccount?.email || "aisyahphr@gmail.com"}</Text>
                  </View>

                  {/* Section 2: Hunian & Kamar */}
                  <Text style={styles.receiptSectionHeader}>RINCIAN HUNIAN</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Nama Kos</Text>
                    <Text style={[styles.receiptValBold, { color: "#0D7A53" }]}>{activeBooking?.kostName || "Kost"}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Nomor Kamar</Text>
                    <Text style={styles.receiptValBold}>Kamar {activeBooking?.roomNumber || "101"} ({activeBooking?.roomType || "AC"})</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Tgl Masuk (Check-in)</Text>
                    <Text style={styles.receiptValBold}>{activeBooking?.entryDate || "-"}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Durasi Sewa</Text>
                    <Text style={styles.receiptVal}>{activeBooking?.durationMonths || 1} Bulan</Text>
                  </View>

                  {/* Section 3: Pembayaran */}
                  <Text style={styles.receiptSectionHeader}>RINCIAN PEMBAYARAN</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Harga Sewa Bulanan</Text>
                    <Text style={styles.receiptVal}>Rp {Number(activeBooking?.monthlyPrice || 700000).toLocaleString("id-ID")}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Total Biaya Sewa ({activeBooking?.durationMonths || 1} Bulan)</Text>
                    <Text style={styles.receiptValBold}>Rp {Number(activeBooking?.totalAmount || 700000).toLocaleString("id-ID")}</Text>
                  </View>

                  {/* Highlight DP Box */}
                  <View style={styles.receiptDpBox}>
                    <View style={styles.receiptRow}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#166534" }}>DP Terbayar (20%)</Text>
                      <Text style={{ fontSize: 15, fontWeight: "900", color: "#166534" }}>
                        Rp {Number(activeBooking?.dpAmount || 140000).toLocaleString("id-ID")} (LUNAS ✓)
                      </Text>
                    </View>
                    <View style={[styles.receiptRow, { marginTop: 4, marginBottom: 0 }]}>
                      <Text style={{ fontSize: 11, color: "#6B7280" }}>Sisa Saat Check-in</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#B45309" }}>
                        Rp {Number((activeBooking?.totalAmount || 700000) - (activeBooking?.dpAmount || 140000)).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </View>

                  {/* Petunjuk */}
                  <View style={styles.receiptNoticeBox}>
                    <Text style={styles.receiptNoticeTitle}>📌 Petunjuk Serah Terima Kunci:</Text>
                    <Text style={styles.receiptNoticeText}>
                      Tunjukkan nota / bukti digital ini kepada pemilik kos saat check-in di lokasi untuk serah terima kunci kamar Anda.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Modal Bottom Buttons */}
            <View style={styles.notaBottomActions}>
              <TouchableOpacity
                style={styles.btnCetakPdf}
                onPress={handlePrintOrDownloadPdf}
                activeOpacity={0.85}
              >
                <Printer size={16} color="#FFFFFF" />
                <Text style={styles.btnCetakPdfText}>Cetak / Simpan PDF Nota</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnKirimWaNota}
                onPress={handleShareReceiptWa}
                activeOpacity={0.85}
              >
                <Share2 size={15} color="#0D7A53" />
                <Text style={styles.btnKirimWaNotaText}>Kirim via WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubTitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Active Booking Card
  activeBookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardPending: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
  },
  bookingCardVerified: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  bookingCardRejected: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  closeBookingBannerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  // Mini History / Tracking Widget (Pill Bar Kecil)
  miniTrackingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  miniTrackingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  miniTrackingIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  miniTrackingCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  miniTrackingStatus: {
    fontSize: 11,
    fontWeight: "700",
  },
  miniTrackingSub: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
    marginTop: 1,
  },
  miniTrackingNotaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  miniTrackingNotaText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  miniTrackingExpandBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingCodePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
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
    fontSize: 11,
    fontWeight: "800",
  },
  bookingKostTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  bookingRoomSub: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  bookingDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingDpLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  bookingDpValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  verifiedNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  verifiedNoticeText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "700",
    flex: 1,
  },
  rejectedNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  rejectedNoticeText: {
    fontSize: 11,
    color: "#991B1B",
    fontWeight: "700",
    flex: 1,
  },
  pendingNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  pendingNoticeText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "700",
    flex: 1,
  },
  btnChatOwnerWa: {
    backgroundColor: "#0D7A53",
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnChatOwnerWaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  nearMePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  nearMeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Filter Pills
  filterPillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  pillBtnActive: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },

  // Promo Banner
  promoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E8F5EE",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
    position: "relative",
  },
  promoIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  promoTextCol: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  promoSub: {
    fontSize: 11,
    color: "#0D7A53",
    marginTop: 2,
    lineHeight: 16,
    opacity: 0.9,
  },
  btnLihatPromo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  btnLihatPromoText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  closePromoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },

  // Kos Cards List
  cardsList: {
    gap: 16,
  },
  kosCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardImgBox: {
    width: 120,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 12,
    left: 8,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  photoCountText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageDotsRow: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    flexDirection: "row",
    gap: 4,
  },
  imgDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  imgDotActive: {
    width: 10,
    backgroundColor: "#FFFFFF",
  },

  cardBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
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
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusGreen: {
    backgroundColor: "#DCFCE7",
  },
  statusRed: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  kosTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: "#6B7280",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  reviewsText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  facilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  facilityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
  },

  cardFooterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 8,
  },
  startFromText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  priceValText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0D7A53",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  chevronCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Guarantee Footer Row
  footerGuaranteeRow: {
    flexDirection: "column",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  guaranteeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guaranteeText: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
  emptyState: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Nota & E-Receipt Action Buttons & Modal Styles
  btnDownloadNota: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E6F4EA",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#0D7A53",
  },
  btnDownloadNotaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },

  notaModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  notaModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingBottom: 24,
  },
  notaModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notaHeaderIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E6F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  notaModalHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  notaCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  notaScrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  receiptTopBanner: {
    backgroundColor: "#0D7A53",
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  receiptBrand: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  receiptSubBrand: {
    fontSize: 11,
    color: "#E6F4EA",
    marginTop: 2,
  },
  receiptVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  receiptVerifiedText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0D7A53",
  },
  receiptBody: {
    padding: 18,
  },
  receiptCodeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#0D7A53",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  receiptCodeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  receiptCodeVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
    marginTop: 2,
  },
  receiptDateVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginTop: 2,
  },
  receiptSectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  receiptLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  receiptValBold: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  receiptDpBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  receiptNoticeBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  receiptNoticeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 2,
  },
  receiptNoticeText: {
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 16,
  },
  notaBottomActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  btnCetakPdf: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnCetakPdfText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnKirimWaNota: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E6F4EA",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0D7A53",
  },
  btnKirimWaNotaText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
});
