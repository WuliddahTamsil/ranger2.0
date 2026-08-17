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
  Compass,
  Layers,
} from "lucide-react-native";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";

export const CustomerLaundryDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("komplit");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  
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

  const services = [
    {
      id: "komplit",
      name: "Cuci Komplit",
      desc: "Cuci, kering, setrika, dan lipat",
      price: 6000,
      unit: "kg",
      icon: Shirt,
      color: "#0D7A53",
    },
    {
      id: "setrika",
      name: "Setrika Saja",
      desc: "Setrika rapi siap pakai",
      price: 4000,
      unit: "kg",
      icon: Zap,
      color: "#EA580C",
    },
    {
      id: "kering",
      name: "Cuci Kering",
      desc: "Cuci kering tanpa disetrika",
      price: 5000,
      unit: "kg",
      icon: Wind,
      color: "#0284C7",
    },
    {
      id: "sepatu",
      name: "Cuci Sepatu",
      desc: "Bersih menyeluruh, cepat kering",
      price: 25000,
      unit: "pasang",
      icon: Package,
      color: "#8B5CF6",
    },
  ];

  const currentServiceObj = services.find((s) => s.id === selectedService) || services[0];
  const estimatedCost = currentServiceObj.price * 2; // assumption 2kg/unit

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image & Top Floating Actions */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
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
                <Text style={styles.badgeOrangeText}>EKSPRES 3 JAM</Text>
              </View>

              <View style={styles.badgeDarkPill}>
                <Bike size={12} color="#4ADE80" />
                <Text style={styles.badgeDarkText}>
                  GRATIS ANTAR JEMPUT <Text style={styles.badgeDarkSub}>(Min. order Rp30.000)</Text>
                </Text>
              </View>
            </View>

            <View style={styles.heroRatingPill}>
              <Star size={13} color="#EAB308" fill="#EAB308" />
              <Text style={styles.heroRatingVal}>4.8</Text>
              <Text style={styles.heroRatingSub}>(256 ulasan)</Text>
            </View>
          </View>

          {/* Carousel Dots */}
          <View style={styles.carouselDotsRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Merchant Info Body */}
        <View style={styles.merchantInfoCard}>
          <View style={styles.merchantTitleRow}>
            <Text style={styles.merchantTitle}>Laundry Express Pak Dedi</Text>
            <CheckCircle2 size={20} color="#0D7A53" />
          </View>

          <View style={styles.merchantAddressRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.merchantAddressText}>
              Jl. Raya Kamojang No. 12 • <Text style={{ fontWeight: "700" }}>0.5 km</Text>
            </Text>
          </View>
        </View>

        {/* 4 Feature Highlights Grid */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
              <Bike size={20} color="#0D7A53" />
            </View>
            <Text style={styles.featureLabel}>Gratis Antar{"\n"}Jemput</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
              <Clock size={20} color="#0D7A53" />
            </View>
            <Text style={styles.featureLabel}>Express 3 Jam</Text>
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
            <Text style={styles.featureLabel}>Bersih & Rapi</Text>
          </View>
        </View>

        {/* Section: Pilih Layanan */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pilih Layanan</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.linkRow}>
            <Text style={styles.linkText}>Lihat semua</Text>
            <ChevronRight size={14} color="#0D7A53" />
          </TouchableOpacity>
        </View>

        {/* Services Grid (2 Columns) */}
        <View style={styles.servicesGrid}>
          {services.map((item) => {
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.serviceGridCard}
                onPress={() => {
                  setSelectedService(item.id);
                  setIsBottomSheetOpen(true);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.serviceIconCircle, { backgroundColor: "#E8F5EE" }]}>
                  <IconComp size={22} color={item.color} />
                </View>

                <Text style={styles.serviceName}>{item.name}</Text>
                <Text style={styles.serviceDesc}>{item.desc}</Text>

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
        <TouchableOpacity style={styles.garansiBanner} activeOpacity={0.85}>
          <ShieldCheck size={24} color="#0D7A53" style={styles.garansiIcon} />
          <View style={styles.garansiTextCol}>
            <Text style={styles.garansiTitle}>Garansi Pakaian Aman</Text>
            <Text style={styles.garansiSub}>
              Jika pakaian rusak atau hilang, kami ganti 100%
            </Text>
          </View>
          <ChevronRight size={18} color="#0D7A53" />
        </TouchableOpacity>

        {/* Footer Guarantee Info Row */}
        <View style={styles.footerGuaranteeRow}>
          <View style={styles.guaranteeItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.guaranteeText}>
              Buka Setiap Hari{"\n"}
              <Text style={{ fontWeight: "700" }}>07.00 - 21.00</Text>
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
              <Text style={styles.btnPickupTitle}>Pesan Pickup Sekarang</Text>
              <Text style={styles.btnPickupSub}>Gratis antar jemput ke lokasi Anda</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Modal: Order Pickup (Image 5) */}
      <Modal visible={isBottomSheetOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.bottomSheetCard}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomSheetContent}>
              <Text style={styles.sheetTitle}>Pilih Layanan</Text>

              {/* Service Selection Radio List */}
              <View style={styles.sheetRadioList}>
                {services.map((s) => {
                  const isSelected = selectedService === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.sheetRadioCard,
                        isSelected && styles.sheetRadioCardSelected,
                      ]}
                      onPress={() => setSelectedService(s.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.sheetRadioLeft}>
                        <View
                          style={[
                            styles.sheetCheckCircle,
                            isSelected && styles.sheetCheckCircleSelected,
                          ]}
                        >
                          {isSelected && <CheckCircle2 size={18} color="#0D7A53" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sheetItemName}>{s.name}</Text>
                          <Text style={styles.sheetItemDesc}>{s.desc}</Text>
                        </View>
                      </View>

                      <Text style={styles.sheetItemPrice}>
                        Rp {s.price.toLocaleString("id-ID")}
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
                        Bantu kurir jemput tepat di depan rumah atau lokasi Anda
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#0D7A53" />
                </TouchableOpacity>
              )}

              {addressError ? (
                <Text style={styles.addressErrorText}>{addressError}</Text>
              ) : null}

              <View
                style={[
                  styles.addressInputContainer,
                  addressError ? styles.addressInputError : null,
                ]}
              >
                <TextInput
                  style={styles.addressInput}
                  placeholder="Detail patokan (Contoh: Rumah pagar hitam, sebelah warung Bu Siti, RT 01/02)"
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

              {/* Estimasi Biaya Row */}
              <View style={styles.estimatedCostRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.estimatedLabel}>Estimasi Biaya</Text>
                  <Text style={styles.estimatedSub}>*Berdasarkan asumsi berat 2kg per layanan</Text>
                </View>
                <Text style={styles.estimatedValText}>
                  Rp {estimatedCost.toLocaleString("id-ID")}
                </Text>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={styles.btnConfirmOrder}
                onPress={() => {
                  if (!address.trim()) {
                    setAddressError("Alamat penjemputan wajib diisi!");
                    return;
                  }
                  setAddressError("");
                  setIsBottomSheetOpen(false);
                  const order: OrderItem = {
                    id: `RNG-LAU-${Date.now().toString().slice(-6)}`,
                    type: "Laundry",
                    iconName: "Wind",
                    color: "#0284C7",
                    item: currentServiceObj.name,
                    detail: "Laundry Express Pak Dedi • 2 kg estimasi",
                    status: "Diproses",
                    statusColor: "blue",
                    date: "Hari ini",
                    total: estimatedCost,
                    deliveryFee: 0,
                    paymentStatus: "Pembayaran saat selesai",
                    paidAmount: 0,
                    remainingAmount: 0,
                    address,
                  };
                  addCustomerOrder(order);
                  setIsSuccessModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnConfirmOrderText}>Konfirmasi & Pesan</Text>
                <CheckCircle2 size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Google Maps Location Picker Modal */}
      <Modal visible={isMapModalOpen} animationType="slide" transparent>
        <View style={styles.mapModalOverlay}>
          <SafeAreaView style={styles.mapModalSafeArea}>
            {/* Map Modal Header */}
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
                <Text style={styles.mapHeaderSub}>Geser peta atau pilih lokasi penjemputan</Text>
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

            {/* Map Search Input */}
            <View style={styles.mapSearchBarBox}>
              <Search size={16} color="#6B7280" />
              <TextInput
                style={styles.mapSearchInput}
                placeholder="Cari lokasi, jalan, atau patokan..."
                placeholderTextColor="#9CA3AF"
                value={mapSearchQuery}
                onChangeText={setMapSearchQuery}
              />
              {mapSearchQuery ? (
                <TouchableOpacity onPress={() => setMapSearchQuery("")}>
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Map Canvas Simulation */}
            <View style={styles.mapCanvas}>
              {/* Stylized Google Maps Background Patterns */}
              <View style={styles.mapBackground}>
                {/* Park / Greenery Areas */}
                <View style={styles.mapParkArea1} />
                <View style={styles.mapParkArea2} />
                {/* Water / Lake */}
                <View style={styles.mapLakeArea} />

                {/* Major Highways & Roads */}
                <View style={styles.mapRoadMajorH} />
                <View style={styles.mapRoadMajorV} />
                <View style={styles.mapRoadSecondary1} />
                <View style={styles.mapRoadSecondary2} />
                <View style={styles.mapRoadDiagonal} />

                {/* Road Labels */}
                <Text style={styles.mapRoadLabel1}>Jl. Raya Kamojang</Text>
                <Text style={styles.mapRoadLabel2}>Jl. Mawar</Text>
                <Text style={styles.mapRoadLabel3}>Kawasan PGE Kamojang</Text>

                {/* Interactive Points / POIs */}
                {mapPresets.map((preset, idx) => {
                  const isSelected = tempMapLocation.title === preset.title;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.mapPoiPin,
                        idx === 0
                          ? { top: "35%", left: "45%" }
                          : idx === 1
                          ? { top: "58%", left: "68%" }
                          : idx === 2
                          ? { top: "25%", left: "22%" }
                          : { top: "65%", left: "25%" },
                        isSelected && styles.mapPoiPinActive,
                      ]}
                      onPress={() => setTempMapLocation(preset)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.poiDot} />
                      <Text style={styles.poiLabelText} numberOfLines={1}>
                        {preset.title.split(",")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Center Map Pin (Google Maps Dropped Pin) */}
              <View style={styles.centerPinContainer} pointerEvents="none">
                {/* Floating Tooltip */}
                <View style={styles.pinTooltip}>
                  <Text style={styles.pinTooltipTitle}>{tempMapLocation.title.split(",")[0]}</Text>
                  <Text style={styles.pinTooltipSub}>📍 Titik Penjemputan</Text>
                </View>
                {/* Red Pin Marker */}
                <View style={styles.pinMarkerIcon}>
                  <MapPin size={38} color="#EA4335" fill="#EA4335" />
                </View>
                {/* Shadow / Pulse */}
                <View style={styles.pinShadowPulse} />
              </View>

              {/* Floating Controls (Top Right) */}
              <View style={styles.mapFloatingControls}>
                <TouchableOpacity style={styles.mapControlBtn} activeOpacity={0.7}>
                  <Layers size={18} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapControlBtn} activeOpacity={0.7}>
                  <Compass size={18} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapControlBtn, { backgroundColor: "#0D7A53" }]}
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
                  <Navigation size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Sheet Details & Presets */}
            <View style={styles.mapBottomSheet}>
              {/* Presets Horizontal Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mapPresetChipsRow}
              >
                {mapPresets
                  .filter(
                    (p) =>
                      !mapSearchQuery ||
                      p.title.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                      p.address.toLowerCase().includes(mapSearchQuery.toLowerCase())
                  )
                  .map((preset, idx) => {
                    const isSelected = tempMapLocation.title === preset.title;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetLocationChip,
                          isSelected && styles.presetLocationChipSelected,
                        ]}
                        onPress={() => setTempMapLocation(preset)}
                        activeOpacity={0.8}
                      >
                        <MapPin
                          size={12}
                          color={isSelected ? "#FFFFFF" : "#0D7A53"}
                        />
                        <Text
                          style={[
                            styles.presetLocationChipText,
                            isSelected && styles.presetLocationChipTextSelected,
                          ]}
                        >
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
                    <Text style={styles.mapSelectedCardAddress}>
                      {tempMapLocation.address}
                    </Text>
                  </View>
                </View>

                {/* Coords & Accuracy Row */}
                <View style={styles.coordsInfoRow}>
                  <View style={styles.coordBadge}>
                    <Text style={styles.coordBadgeText}>Lat/Long: {tempMapLocation.coords}</Text>
                  </View>
                  <Text style={styles.accuracyText}>✓ Akurat (Google Maps)</Text>
                </View>
              </View>

              {/* Confirm Button */}
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

            <Text style={styles.dialogTitle}>Pesanan Pickup Berhasil!</Text>

            <Text style={styles.dialogDesc}>
              Pesanan laundry <Text style={{ fontWeight: "800", color: "#111827" }}>{currentServiceObj.name}</Text> telah diteruskan ke mitra <Text style={{ fontWeight: "800", color: "#111827" }}>Laundry Express Pak Dedi</Text>. Driver akan segera menuju lokasi Anda.
            </Text>

            <TouchableOpacity
              style={styles.btnDialogGreen}
              onPress={() => {
                setIsSuccessModalOpen(false);
                navigate("c_laundry_tracking");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnDialogGreenText}>Lacak Pesanan (Live Demo)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <CustomerChatModal visible={chatVisible} onClose={() => setChatVisible(false)} orderId="LAUNDRY-EXPRESS-PAK-DEDI" participantName="Laundry Express Pak Dedi" participantType="merchant" initialMessage="Halo Kak, silakan tanyakan layanan atau status laundry di sini." />
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

  // Hero Container
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
    bottom: 24,
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
    gap: 4,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  badgeDarkText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  badgeDarkSub: {
    fontSize: 9,
    fontWeight: "500",
    color: "#D1D5DB",
  },

  heroRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroRatingVal: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroRatingSub: {
    fontSize: 9,
    color: "#D1D5DB",
  },

  carouselDotsRow: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    width: 16,
    backgroundColor: "#0D7A53",
  },

  // Merchant Info
  merchantInfoCard: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  merchantTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  merchantTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  merchantAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  merchantAddressText: {
    fontSize: 13,
    color: "#6B7280",
  },

  // 4 Features Row
  featuresRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  featureItem: {
    alignItems: "center",
    width: "22%",
  },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    lineHeight: 14,
  },

  // Section Pilih Layanan
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },

  // Services Grid
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 12,
  },
  serviceGridCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "space-between",
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  serviceDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 16,
    minHeight: 32,
  },
  servicePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  servicePriceVal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D7A53",
  },
  servicePriceUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  // Garansi Banner
  garansiBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 12,
  },
  garansiIcon: {
    marginTop: 2,
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
    color: "#0D7A53",
    marginTop: 2,
    opacity: 0.9,
  },

  // Guarantee Footer Row
  footerGuaranteeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  guaranteeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  guaranteeText: {
    fontSize: 10,
    color: "#6B7280",
    lineHeight: 14,
  },

  // Fixed Bottom Bar
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  btnChatSquare: {
    width: 64,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  btnChatText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 2,
  },
  btnPesanPickup: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPickupTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  btnPickupSub: {
    fontSize: 10,
    color: "#D1FAE5",
  },

  // Bottom Sheet Modal
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: "82%",
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
  },
  sheetRadioList: {
    gap: 10,
  },
  sheetRadioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  sheetRadioCardSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  sheetRadioLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sheetCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
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
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginLeft: 8,
  },

  sheetSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  sheetSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  addressErrorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  addressInputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  addressInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  addressInput: {
    fontSize: 13,
    color: "#111827",
    minHeight: 70,
    textAlignVertical: "top",
  },

  estimatedCostRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 18,
  },
  estimatedLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  estimatedSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  estimatedValText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0D7A53",
  },

  btnConfirmOrder: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmOrderText: {
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

  // Map Picker Trigger & Address Badges
  btnOpenMapPin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  btnOpenMapPinText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  mapPromptBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  mapPromptLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  mapPromptIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPromptTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  mapPromptSub: {
    fontSize: 10,
    color: "#4B5563",
    marginTop: 2,
  },
  selectedMapBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#0D7A53",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  selectedMapLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  mapPinCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  pinTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  selectedMapTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  coordsPill: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  coordsPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#374151",
  },
  selectedMapAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  btnChangeMapPin: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    marginLeft: 8,
  },
  btnChangeMapPinText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Google Maps Fullscreen Modal
  mapModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  mapModalSafeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  mapBackBtn: {
    padding: 6,
    marginRight: 10,
  },
  mapHeaderTitleCol: {
    flex: 1,
  },
  mapHeaderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  mapHeaderSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  gpsQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  gpsQuickBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  mapSearchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
  },

  // Interactive Map Canvas Simulation
  mapCanvas: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E5E3DF", // Google Maps background tone
  },
  mapBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#E5E3DF",
  },
  mapParkArea1: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 140,
    height: 120,
    backgroundColor: "#CCEADA",
    borderRadius: 24,
    opacity: 0.8,
  },
  mapParkArea2: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 160,
    height: 140,
    backgroundColor: "#CCEADA",
    borderRadius: 30,
    opacity: 0.8,
  },
  mapLakeArea: {
    position: "absolute",
    top: "30%",
    right: "10%",
    width: 90,
    height: 70,
    backgroundColor: "#AADAFF",
    borderRadius: 35,
    opacity: 0.8,
  },
  mapRoadMajorH: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F7D57F",
  },
  mapRoadMajorV: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#F7D57F",
  },
  mapRoadSecondary1: {
    position: "absolute",
    top: "22%",
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#FFFFFF",
  },
  mapRoadSecondary2: {
    position: "absolute",
    top: "70%",
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#FFFFFF",
  },
  mapRoadDiagonal: {
    position: "absolute",
    top: "10%",
    left: "15%",
    width: 200,
    height: 6,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "35deg" }],
  },
  mapRoadLabel1: {
    position: "absolute",
    top: "46%",
    left: 16,
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
  },
  mapRoadLabel2: {
    position: "absolute",
    left: "53%",
    top: 30,
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
  },
  mapRoadLabel3: {
    position: "absolute",
    bottom: 50,
    right: 30,
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  mapPoiPin: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  mapPoiPinActive: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  poiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA4335",
  },
  poiLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F2937",
    maxWidth: 120,
  },

  // Center Dropped Pin
  centerPinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -60 }, { translateY: -70 }],
    width: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pinTooltip: {
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinTooltipTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pinTooltipSub: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  pinMarkerIcon: {
    zIndex: 10,
  },
  pinShadowPulse: {
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
    marginTop: -4,
  },

  // Floating map buttons
  mapFloatingControls: {
    position: "absolute",
    top: 14,
    right: 14,
    gap: 8,
  },
  mapControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // Map Bottom Sheet
  mapBottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mapPresetChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  presetLocationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  presetLocationChipSelected: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
  },
  presetLocationChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  presetLocationChipTextSelected: {
    color: "#FFFFFF",
  },
  mapSelectedCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  mapSelectedCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  mapSelectedIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  mapSelectedCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  mapSelectedCardAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15,
  },
  coordsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  coordBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  coordBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
  },
  accuracyText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  btnConfirmMapLocation: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0D7A53",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmMapLocationText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
