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
} from "react-native";
import { Nav, OrderItem } from "../../types";
import {
  ArrowLeft,
  Heart,
  Share2,
  Zap,
  Bike,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Shirt,
  Wind,
  Package,
  ChevronRight,
  MessageCircle,
  X,
  Sparkles,
  Navigation,
  Crosshair,
  Search,
} from "lucide-react-native";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";
import {
  getSelectedStore,
  createLaundryOrder,
  subscribeLaundry,
  LaundryStore,
  LaundryServiceItem,
} from "../../services/laundryService";

export const CustomerLaundryDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const [store, setStore] = useState<LaundryStore>(getSelectedStore());
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Maps Pin Picker state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState<{
    title: string;
    address: string;
    coords: string;
    tag: string;
  } | null>(null);
  const [tempMapLocation, setTempMapLocation] = useState({
    title: "Jl. Mawar No. 12, Kamojang",
    address: "Jl. Mawar No. 12, RT 01/RW 02, Desa Laksana, Ibun, Garut",
    coords: "-7.1432, 107.7845",
    tag: "Dekat Kantor PGE",
  });
  const [mapSearchQuery, setMapSearchQuery] = useState("");

  const mapPresets = [
    {
      title: "Jl. Mawar No. 12, Kamojang",
      address: "Jl. Mawar No. 12, RT 01/RW 02, Desa Laksana, Ibun, Garut",
      coords: "-7.1432, 107.7845",
      tag: "Dekat Kantor PGE",
    },
    {
      title: "Komplek Perumahan PGE Kamojang",
      address: "Blok B3 No. 8, Kamojang, Kec. Ibun, Garut",
      coords: "-7.1480, 107.7910",
      tag: "Perumahan",
    },
    {
      title: "Jl. Raya Kamojang No. 20",
      address: "Jl. Raya Kamojang No. 20, Depan Masjid Al-Ikhlas",
      coords: "-7.1415, 107.7820",
      tag: "Jalan Utama",
    },
    {
      title: "Area Wisata Kawah Kamojang",
      address: "Jl. Lapang Panas Bumi, Kawah Kamojang, Garut",
      coords: "-7.1520, 107.8012",
      tag: "Kawasan Wisata",
    },
  ];

  useEffect(() => {
    const unsub = subscribeLaundry(() => {
      setStore(getSelectedStore());
    });
    setStore(getSelectedStore());
    return unsub;
  }, []);

  const storeServices: LaundryServiceItem[] =
    store.services && store.services.length > 0
      ? store.services
      : [
          { id: "s1", name: "Cuci Komplit (Cuci + Setrika)", desc: "Cuci, kering, setrika, dan lipat rapi", price: 6000, unit: "kg", category: "biasa" },
          { id: "s2", name: "Express 3 Jam", desc: "Prioritas kilat selesai dalam 3 jam siap pakai", price: 10000, unit: "kg", category: "ekspres" },
          { id: "s3", name: "Cuci Kering Lipat", desc: "Cuci bersih & lipat rapi tanpa setrika", price: 4500, unit: "kg", category: "biasa" },
          { id: "s4", name: "Setrika Uap Saja", desc: "Setrika uap licin dan wangi tahan lama", price: 3500, unit: "kg", category: "biasa" },
        ];

  const activeSelectedService =
    storeServices.find((s) => (s._id || s.id) === selectedServiceId) || storeServices[0];

  const estimatedCost = (activeSelectedService?.price || 6000) * 2; // Estimasi 2 kg/item

  const handleConfirmOrder = async () => {
    if (!address.trim()) {
      setAddressError("Alamat penjemputan wajib diisi!");
      return;
    }
    setAddressError("");
    setIsSubmitting(true);

    try {
      const payload = {
        customerId: "cust_demo",
        customerName: "Pelanggan Rangers",
        customerPhone: "081234567890",
        pickupAddress: address,
        pickupCoords: selectedMapPin?.coords || "-7.1432, 107.7845",
        deliveryAddress: address,
        deliveryCoords: selectedMapPin?.coords || "-7.1432, 107.7845",
        storeId: (store._id || store.id) as any,
        storeName: store.storeName,
        ownerId: store.ownerId || "owner_dedi",
        serviceId: activeSelectedService._id || activeSelectedService.id || "s1",
        serviceName: activeSelectedService.name,
        pricePerUnit: activeSelectedService.price,
        unitType: activeSelectedService.unit,
        notes: "Tolong hati-hati dengan pakaian bahan sutra/katun tipis.",
      };

      const newOrder = await createLaundryOrder(payload);

      // Save to general customerOrderStore as well
      const orderItem: OrderItem = {
        id: newOrder.orderCode || `RNG-LAU-${Date.now().toString().slice(-6)}`,
        type: "Laundry",
        iconName: "Wind",
        color: "#0284C7",
        item: activeSelectedService.name,
        detail: `${store.storeName} • Estimasi ${activeSelectedService.unit}`,
        status: "Diproses",
        statusColor: "blue",
        date: "Hari ini",
        total: estimatedCost,
        deliveryFee: 4000,
        paymentStatus: "Menunggu Penimbangan",
        paidAmount: 0,
        remainingAmount: estimatedCost,
        address,
      };
      addCustomerOrder(orderItem);

      setIsBottomSheetOpen(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Order error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image & Top Floating Actions */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: store.imageUrl || "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
            }}
            style={styles.heroImg}
            resizeMode="cover"
          />

          {/* Top Floating Buttons */}
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              onPress={() => navigate("c_laundry")}
              style={styles.floatBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#111827" />
            </TouchableOpacity>

            <View style={styles.rightFloatRow}>
              <TouchableOpacity style={styles.floatBtn} activeOpacity={0.7}>
                <Heart size={20} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.floatBtn} activeOpacity={0.7}>
                <Share2 size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Overlay Badges */}
          <View style={styles.heroOverlayBadgesRow}>
            <View style={styles.heroOverlayLeft}>
              <View style={styles.badgeOrangePill}>
                <Zap size={12} color="#FFFFFF" />
                <Text style={styles.badgeOrangeText}>DRIVER JEMPUT ANTAR</Text>
              </View>

              <View style={styles.badgeDarkPill}>
                <Bike size={12} color="#4ADE80" />
                <Text style={styles.badgeDarkText}>
                  {store.openingHours || "Buka • Tutup 21.00"}
                </Text>
              </View>
            </View>

            <View style={styles.heroRatingPill}>
              <Star size={13} color="#EAB308" fill="#EAB308" />
              <Text style={styles.heroRatingVal}>{store.rating || 4.8}</Text>
              <Text style={styles.heroRatingSub}>({store.totalReviews || 120})</Text>
            </View>
          </View>
        </View>

        {/* Merchant Info Body */}
        <View style={styles.merchantInfoCard}>
          <View style={styles.merchantTitleRow}>
            <Text style={styles.merchantTitle}>{store.storeName}</Text>
            <CheckCircle2 size={20} color="#0D7A53" />
          </View>

          <View style={styles.merchantAddressRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.merchantAddressText}>
              {store.address} • <Text style={{ fontWeight: "700" }}>{store.distanceText || "0.8 km"}</Text>
            </Text>
          </View>

          <Text style={styles.merchantDescription}>
            {store.description || "Mitra Laundry Resmi Rangers App dengan garansi bersih & wangi tahan lama."}
          </Text>
        </View>

        {/* 4 Feature Highlights Grid */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
              <Bike size={20} color="#0D7A53" />
            </View>
            <Text style={styles.featureLabel}>Driver Angkut{"\n"}dari Rumah</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
              <Clock size={20} color="#0D7A53" />
            </View>
            <Text style={styles.featureLabel}>Timbang Pas{"\n"}& Transparan</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
              <ShieldCheck size={20} color="#0D7A53" />
            </View>
            <Text style={styles.featureLabel}>Pakaian Aman{"\n"}& Wangi</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
              <Shirt size={20} color="#0D7A53" />
            </View>
            <Text style={styles.featureLabel}>Live Tracking{"\n"}Real-time</Text>
          </View>
        </View>

        {/* Section: Pilih Layanan */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Daftar Layanan Tersedia</Text>
          <Text style={styles.sectionSubtitle}>{storeServices.length} Paket Pilihan</Text>
        </View>

        {/* Services Grid */}
        <View style={styles.servicesGrid}>
          {storeServices.map((item) => {
            const isExpress = item.category === "ekspres";
            const serviceId = item._id || item.id || "";
            return (
              <TouchableOpacity
                key={serviceId}
                style={styles.serviceGridCard}
                onPress={() => {
                  setSelectedServiceId(serviceId);
                  setIsBottomSheetOpen(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.serviceIconCircle, { backgroundColor: isExpress ? "#FFF7ED" : "#E8F5EE" }]}>
                  {isExpress ? <Zap size={22} color="#EA580C" /> : <Shirt size={22} color="#0D7A53" />}
                </View>

                <Text style={styles.serviceName}>{item.name}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>{item.desc || "Layanan cuci higienis"}</Text>

                <View style={styles.servicePriceRow}>
                  <Text style={styles.servicePriceVal}>
                    Rp {item.price.toLocaleString("id-ID")}{" "}
                    <Text style={styles.servicePriceUnit}>/{item.unit}</Text>
                  </Text>
                  <View style={styles.chevronCircle}>
                    <ChevronRight size={14} color="#6B7280" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Garansi Banner */}
        <View style={styles.garansiBanner}>
          <ShieldCheck size={24} color="#0D7A53" style={styles.garansiIcon} />
          <View style={styles.garansiTextCol}>
            <Text style={styles.garansiTitle}>Garansi Bersih & Transparan</Text>
            <Text style={styles.garansiSub}>
              Pakaian ditimbang langsung oleh pemilik laundry di depan sistem, tagihan diterbitkan otomatis sebelum dicuci.
            </Text>
          </View>
        </View>

        {/* Footer Guarantee Info Row */}
        <View style={styles.footerGuaranteeRow}>
          <View style={styles.guaranteeItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.guaranteeText}>
              Buka Setiap Hari{"\n"}
              <Text style={{ fontWeight: "700" }}>{store.openingHours || "07.00 - 21.00"}</Text>
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <CheckCircle2 size={14} color="#0D7A53" />
            <Text style={styles.guaranteeText}>
              +1000{"\n"}
              <Text style={{ fontWeight: "700" }}>Pelanggan Puas</Text>
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <ShieldCheck size={14} color="#6B7280" />
            <Text style={styles.guaranteeText}>
              Aman & Terpercaya{"\n"}
              <Text style={{ fontWeight: "700" }}>Berpengalaman</Text>
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity style={styles.btnChatSquare} onPress={() => setChatVisible(true)} activeOpacity={0.8}>
          <MessageCircle size={22} color="#0D7A53" />
          <Text style={styles.btnChatText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnPesanPickup}
          onPress={() => setIsBottomSheetOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.btnPickupLeft}>
            <View style={styles.pickupBikeCircle}>
              <Bike size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.btnPickupTitle}>Pesan Antar-Jemput</Text>
              <Text style={styles.btnPickupSub}>Driver jemput pakaian ke rumah</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal: Order Pickup */}
      <Modal visible={isBottomSheetOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.dragHandle} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomSheetContent}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={styles.sheetTitle}>Pilih Layanan Laundry</Text>
                <TouchableOpacity onPress={() => setIsBottomSheetOpen(false)} activeOpacity={0.7}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Service Selection Radio List */}
              <View style={styles.sheetRadioList}>
                {storeServices.map((s) => {
                  const sId = s._id || s.id || "";
                  const isSelected = (activeSelectedService._id || activeSelectedService.id) === sId;
                  return (
                    <TouchableOpacity
                      key={sId}
                      style={[styles.sheetRadioCard, isSelected && styles.sheetRadioCardSelected]}
                      onPress={() => setSelectedServiceId(sId)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.sheetRadioLeft}>
                        <View style={[styles.sheetCheckCircle, isSelected && styles.sheetCheckCircleSelected]}>
                          {isSelected && <CheckCircle2 size={18} color="#0D7A53" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sheetItemName}>{s.name}</Text>
                          <Text style={styles.sheetItemDesc}>{s.desc}</Text>
                        </View>
                      </View>

                      <Text style={styles.sheetItemPrice}>
                        Rp {s.price.toLocaleString("id-ID")}/{s.unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section: Alamat Penjemputan */}
              <View style={styles.sheetSectionTitleRow}>
                <Text style={styles.sheetSectionTitle}>
                  Alamat Penjemputan <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.btnOpenMapPin}
                  onPress={() => setIsMapModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <MapPin size={13} color="#0D7A53" />
                  <Text style={styles.btnOpenMapPinText}>Tandai di Maps</Text>
                </TouchableOpacity>
              </View>

              {/* Map Pin Badge Indicator */}
              {selectedMapPin ? (
                <View style={styles.selectedMapBadge}>
                  <View style={styles.selectedMapLeft}>
                    <View style={styles.mapPinCircleGreen}>
                      <MapPin size={16} color="#0D7A53" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pinTagRow}>
                        <Text style={styles.selectedMapTitle}>{selectedMapPin.title}</Text>
                        <View style={styles.coordsPill}>
                          <Text style={styles.coordsPillText}>📍 {selectedMapPin.coords}</Text>
                        </View>
                      </View>
                      <Text style={styles.selectedMapAddress} numberOfLines={2}>
                        {selectedMapPin.address}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsMapModalOpen(true)}
                    style={styles.btnChangeMapPin}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnChangeMapPinText}>Ubah</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.mapPromptBanner}
                  onPress={() => setIsMapModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.mapPromptLeft}>
                    <View style={styles.mapPromptIconBg}>
                      <Navigation size={16} color="#0D7A53" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mapPromptTitle}>Tandai Titik di Google Maps</Text>
                      <Text style={styles.mapPromptSub}>
                        Bantu driver jemput tepat di depan rumah atau kos Anda
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#0D7A53" />
                </TouchableOpacity>
              )}

              {addressError ? <Text style={styles.addressErrorText}>{addressError}</Text> : null}

              <View style={[styles.addressInputContainer, addressError ? styles.addressInputError : null]}>
                <TextInput
                  style={styles.addressInput}
                  placeholder="Detail patokan (Contoh: Rumah pagar hitam, kamar kos No. 3, RT 01/02)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={address}
                  onChangeText={(val) => {
                    setAddress(val);
                    if (val.trim()) setAddressError("");
                  }}
                />
              </View>

              {/* Estimasi Biaya & Info Penimbangan */}
              <View style={styles.estimatedCostRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.estimatedLabel}>Estimasi Biaya Cuci</Text>
                  <Text style={styles.estimatedSub}>
                    *Total final dihitung setelah ditimbang oleh pemilik laundry
                  </Text>
                </View>
                <Text style={styles.estimatedValText}>
                  Rp {estimatedCost.toLocaleString("id-ID")}
                </Text>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.btnConfirmOrder, isSubmitting && { opacity: 0.7 }]}
                onPress={handleConfirmOrder}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.btnConfirmOrderText}>Panggil Driver Jemput</Text>
                    <CheckCircle2 size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Google Maps Location Picker Modal */}
      <Modal visible={isMapModalOpen} animationType="slide" transparent>
        <View style={styles.mapModalOverlay}>
          <SafeAreaView style={styles.mapModalSafeArea}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity
                onPress={() => setIsMapModalOpen(false)}
                style={styles.mapBackBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft size={22} color="#111827" />
              </TouchableOpacity>

              <View style={styles.mapHeaderTitleCol}>
                <Text style={styles.mapHeaderTitle}>Tentukan Titik di Maps</Text>
                <Text style={styles.mapHeaderSub}>Pilih lokasi penjemputan pakaian</Text>
              </View>

              <TouchableOpacity
                style={styles.gpsQuickBtn}
                onPress={() => {
                  setTempMapLocation({
                    title: "Lokasi GPS Anda Saat Ini",
                    address: "Jl. Lapangan Panas Bumi No. 5, Kamojang, Garut",
                    coords: "-7.1448, 107.7862",
                    tag: "GPS Akurat",
                  });
                }}
                activeOpacity={0.7}
              >
                <Crosshair size={16} color="#0D7A53" />
                <Text style={styles.gpsQuickBtnText}>GPS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainerSimulation}>
              {/* Presets List */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapPresetsRow}>
                {mapPresets.map((preset, idx) => {
                  const isSelected = tempMapLocation.title === preset.title;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.presetLocationChip, isSelected && styles.presetLocationChipSelected]}
                      onPress={() => setTempMapLocation(preset)}
                      activeOpacity={0.8}
                    >
                      <MapPin size={12} color={isSelected ? "#FFFFFF" : "#0D7A53"} />
                      <Text style={[styles.presetLocationChipText, isSelected && styles.presetLocationChipTextSelected]}>
                        {preset.title.split(",")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected Location Card */}
              <View style={styles.mapSelectedCard}>
                <View style={styles.mapSelectedCardHeader}>
                  <View style={styles.mapSelectedIconCircle}>
                    <MapPin size={18} color="#0D7A53" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapSelectedCardTitle}>{tempMapLocation.title}</Text>
                    <Text style={styles.mapSelectedCardAddress}>{tempMapLocation.address}</Text>
                  </View>
                </View>

                <View style={styles.coordsInfoRow}>
                  <View style={styles.coordBadge}>
                    <Text style={styles.coordBadgeText}>📍 {tempMapLocation.coords}</Text>
                  </View>
                  <Text style={styles.accuracyText}>✓ Akurat (Google Maps)</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnConfirmMapLocation}
                onPress={() => {
                  setSelectedMapPin(tempMapLocation);
                  setAddress(tempMapLocation.address);
                  setAddressError("");
                  setIsMapModalOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnConfirmMapLocationText}>Pasang Titik Lokasi Ini</Text>
                <CheckCircle2 size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Success Confirmation Modal */}
      <Modal visible={isSuccessModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.dialogCard}>
            <View style={styles.circleIconGreen}>
              <Sparkles size={36} color="#0D7A53" />
            </View>

            <Text style={styles.dialogTitle}>Pesanan Berhasil Dibuat!</Text>

            <Text style={styles.dialogDesc}>
              Driver Rangers sedang ditugaskan untuk menjemput pakaian Anda ke mitra{" "}
              <Text style={{ fontWeight: "800", color: "#111827" }}>{store.storeName}</Text>. Setelah sampai, pemilik akan menimbang dan menerbitkan tagihan pembayaran.
            </Text>

            <TouchableOpacity
              style={styles.btnDialogGreen}
              onPress={() => {
                setIsSuccessModalOpen(false);
                navigate("c_laundry_tracking");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnDialogGreenText}>Buka Live Tracking Pesanan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomerChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        orderId={store.storeName}
        participantName={store.storeName}
        participantType="merchant"
        initialMessage="Halo Kak, silakan tanyakan ketersediaan layanan atau status laundry di sini."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    backgroundColor: "#FFFFFF",
  },
  heroContainer: {
    width: "100%",
    height: 240,
    position: "relative",
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  topActionsRow: {
    position: "absolute",
    top: 44,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rightFloatRow: {
    flexDirection: "row",
    gap: 10,
  },
  floatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  heroOverlayBadgesRow: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroOverlayLeft: {
    gap: 6,
    flex: 1,
  },
  badgeOrangePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF6500",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  badgeOrangeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  badgeDarkPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  badgeDarkText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  heroRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  heroRatingVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  heroRatingSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  merchantInfoCard: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  merchantTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  merchantTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    flex: 1,
  },
  merchantAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  merchantAddressText: {
    fontSize: 13,
    color: "#6B7280",
  },
  merchantDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 10,
    lineHeight: 18,
  },
  featuresRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#0D7A53",
    fontWeight: "700",
  },
  servicesGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  serviceGridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  serviceDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },
  servicePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  servicePriceVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  servicePriceUnit: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  garansiBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C6E7D6",
  },
  garansiIcon: {
    marginRight: 12,
  },
  garansiTextCol: {
    flex: 1,
  },
  garansiTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
  },
  garansiSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
    lineHeight: 15,
  },
  footerGuaranteeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  guaranteeItem: {
    alignItems: "center",
  },
  guaranteeText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  btnChatSquare: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  btnChatText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
    marginTop: 2,
  },
  btnPesanPickup: {
    flex: 1,
    height: 50,
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  btnPickupLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickupBikeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPickupTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  btnPickupSub: {
    color: "#E8F5EE",
    fontSize: 10,
  },

  // Modal Bottom Sheet
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: "85%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  bottomSheetContent: {
    paddingBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sheetRadioList: {
    gap: 10,
    marginBottom: 16,
  },
  sheetRadioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  sheetRadioCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#E8F5EE",
  },
  sheetRadioLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  sheetCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCheckCircleSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
  },
  sheetItemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  sheetItemDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  sheetItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
    marginLeft: 8,
  },
  sheetSectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  btnOpenMapPin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#E8F5EE",
    borderRadius: 8,
  },
  btnOpenMapPinText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  selectedMapBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 10,
  },
  selectedMapLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 8,
  },
  mapPinCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  pinTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedMapTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  coordsPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  coordsPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#166534",
  },
  selectedMapAddress: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
  },
  btnChangeMapPin: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btnChangeMapPinText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  mapPromptBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  mapPromptLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  mapPromptIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPromptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  mapPromptSub: {
    fontSize: 10,
    color: "#6B7280",
  },
  addressErrorText: {
    color: "#EF4444",
    fontSize: 11,
    marginBottom: 4,
  },
  addressInputContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  addressInputError: {
    borderColor: "#EF4444",
  },
  addressInput: {
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
    minHeight: 50,
  },
  estimatedCostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  estimatedLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D7A53",
  },
  estimatedSub: {
    fontSize: 10,
    color: "#166534",
    marginTop: 2,
  },
  estimatedValText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  btnConfirmOrder: {
    height: 48,
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmOrderText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // Map Modal
  mapModalOverlay: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mapModalSafeArea: {
    flex: 1,
  },
  mapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  mapBackBtn: {
    padding: 4,
    marginRight: 10,
  },
  mapHeaderTitleCol: {
    flex: 1,
  },
  mapHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  mapHeaderSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  gpsQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  gpsQuickBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  mapContainerSimulation: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  mapPresetsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  presetLocationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  presetLocationChipSelected: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  presetLocationChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  presetLocationChipTextSelected: {
    color: "#FFFFFF",
  },
  mapSelectedCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 20,
  },
  mapSelectedCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  mapSelectedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  mapSelectedCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  mapSelectedCardAddress: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
    lineHeight: 16,
  },
  coordsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  coordBadge: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coordBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0D7A53",
  },
  btnConfirmMapLocation: {
    height: 50,
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnConfirmMapLocationText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // Modal Dialog Center
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  circleIconGreen: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  dialogDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 20,
  },
  btnDialogGreen: {
    width: "100%",
    height: 48,
    backgroundColor: "#0D7A53",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDialogGreenText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
