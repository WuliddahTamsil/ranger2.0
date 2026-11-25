/**
 * GeoDirectDetailScreen.tsx
 * Comprehensive Detail Screen for GEOVERSE – Geothermal Drying Service (Dryhouse)
 * Features:
 * 1. Informasi dan keunggulan layanan
 * 2. Metode pengeringan yang tersedia (Geothermal Wash, Honey Skin Contact, Natural Quick Dry)
 * 3. Informasi ketersediaan Dryhouse (4 unit, max 6.000 kg, live occupancy)
 * 4. KALKULATOR SEWA DRYHOUSE (PRIORITAS UTAMA - Slider 100–6.000 kg, radio occupancy, HPP Rp 377/kg)
 * 5. Jadwal dan pemesanan fasilitas (CTA direct to booking with calculated volume)
 * 6. Pemantauan proses pengeringan (7 operational stages)
 * 7. Riwayat transaksi dan laporan digital (Digital processing report preview & shortcut)
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  TextInput,
  PanResponder,
  Alert,
} from "react-native";
import {
  ArrowLeft,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  ChevronRight,
  Calculator,
  Percent,
  Check,
  Droplets,
  SunMedium,
  ThermometerSun,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchEquipmentDetail,
  fetchDryhouseAvailability,
  GeoDirectEquipment,
  GeoDirectDryhouseAvailability,
} from "../../../services/geoDirectService";
import { rp } from "../../../utils/formatters";

interface GeoDirectDetailScreenProps extends Nav {
  routeParams?: {
    equipmentId?: string;
    initialTab?: string;
    initialVolumeKg?: number;
  };
}

type OccupancyTierKey = "0_30" | "30_60" | "60_80" | "80_100";

interface OccupancyTierConfig {
  key: OccupancyTierKey;
  label: string;
  rangeText: string;
  discountPercent: number;
  ratePerKg: number;
}

const OCCUPANCY_TIERS: OccupancyTierConfig[] = [
  {
    key: "0_30",
    label: "0% – 30%",
    rangeText: "Okupansi Rendah (0–30%)",
    discountPercent: 50,
    ratePerKg: 500,
  },
  {
    key: "30_60",
    label: ">30% – 60%",
    rangeText: "Okupansi Sedang (>30%–60%)",
    discountPercent: 30,
    ratePerKg: 700,
  },
  {
    key: "60_80",
    label: ">60% – 80%",
    rangeText: "Okupansi Tinggi (>60%–80%)",
    discountPercent: 10,
    ratePerKg: 900,
  },
  {
    key: "80_100",
    label: ">80%",
    rangeText: "Okupansi Penuh (>80%)",
    discountPercent: 0,
    ratePerKg: 1000,
  },
];

const DRYING_METHODS = [
  {
    id: "Geothermal Wash",
    title: "Geothermal Wash",
    badge: "Clean & Bright",
    desc: "Pengeringan biji kopi wash terpadu dengan aliran udara hangat panas bumi stabil. Menghasilkan profil rasa bersih, keasaman jernih, dan masa pengeringan konsisten.",
    tempRange: "40°C – 45°C",
    targetMoisture: "11% – 12%",
  },
  {
    id: "Honey Skin Contact",
    title: "Honey Skin Contact",
    badge: "High Sweetness",
    desc: "Optimalisasi retensi mucilage dengan sirkulasi termal terukur. Menghasilkan profil cup bercita rasa manis intensif, body tebal, dan terbebas dari over-fermentasi.",
    tempRange: "38°C – 44°C",
    targetMoisture: "11% – 12%",
  },
  {
    id: "Natural Quick Dry",
    title: "Natural Quick Dry",
    badge: "Fruity & Exotic",
    desc: "Pengeringan cherry utuh terlindung cuaca dengan sirkulasi udara kering konstan. Mempercepat pengeringan hingga 40% lebih efisien dibanding penjemuran konvensional.",
    tempRange: "42°C – 48°C",
    targetMoisture: "10.5% – 11.5%",
  },
];

const TRACKING_STAGES = [
  { num: 1, title: "Menunggu Konfirmasi", desc: "Pesanan masuk antrean verifikasi teknis PGE" },
  { num: 2, title: "Pesanan Dikonfirmasi", desc: "Kapasitas & jadwal batch telah dialokasikan" },
  { num: 3, title: "Menunggu Penerimaan Kopi", desc: "Pengantaran cherry ke fasilitas PGE Kamojang" },
  { num: 4, title: "Proses Pengeringan", desc: "Pengeringan aktif dengan energi panas bumi" },
  { num: 5, title: "Pengeringan Selesai", desc: "Kadar air target tercapai & uji sampling" },
  { num: 6, title: "Siap Diambil", desc: "Biji kering telah dikemas rapi di pallet CoE" },
  { num: 7, title: "Selesai", desc: "Serah terima selesai & laporan digital diterbitkan" },
];

export const GeoDirectDetailScreen: React.FC<GeoDirectDetailScreenProps> = ({
  navigate,
  routeParams,
}) => {
  const equipmentId = routeParams?.equipmentId || "EQ-01";
  const [equipment, setEquipment] = useState<GeoDirectEquipment | null>(null);
  const [availability, setAvailability] = useState<GeoDirectDryhouseAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  // Drying Method Selection
  const [selectedMethod, setSelectedMethod] = useState<string>("Geothermal Wash");

  // Calculator State (Default 100 kg - Batas Minimal)
  const [volumeKg, setVolumeKg] = useState<number>(() =>
    routeParams?.initialVolumeKg ? Number(routeParams.initialVolumeKg) : 100
  );
  const [volumeInputText, setVolumeInputText] = useState<string>(() =>
    routeParams?.initialVolumeKg ? String(routeParams.initialVolumeKg) : "100"
  );
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [selectedTierKey, setSelectedTierKey] = useState<OccupancyTierKey>("0_30");
  const [sliderWidth, setSliderWidth] = useState<number>(300);

  // Active Tab View: "OVERVIEW" | "CALCULATOR" | "TRACKING" | "REPORT"
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CALCULATOR" | "TRACKING" | "REPORT">(
    "OVERVIEW"
  );

  // Auto-scroll Refs & Section Offsets
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarScrollRef = useRef<ScrollView>(null);
  const isAutoScrolling = useRef(false);
  const autoScrollTimer = useRef<any>(null);

  const sectionOffsets = useRef<Record<string, number>>({
    OVERVIEW: 0,
    CALCULATOR: 680,
    TRACKING: 1550,
    REPORT: 2200,
  });

  const tabOffsetsX = useRef<Record<string, number>>({
    OVERVIEW: 0,
    CALCULATOR: 80,
    TRACKING: 220,
    REPORT: 340,
  });

  const updateSectionOffset = (key: string, y: number) => {
    sectionOffsets.current[key] = y;
  };

  const handleTabPress = (tabKey: "OVERVIEW" | "CALCULATOR" | "TRACKING" | "REPORT") => {
    setActiveTab(tabKey);
    const targetY = sectionOffsets.current[tabKey] ?? 0;

    isAutoScrolling.current = true;
    if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current);
    autoScrollTimer.current = setTimeout(() => {
      isAutoScrolling.current = false;
    }, 700);

    // Scroll vertical page content smoothly to target section
    if (scrollViewRef.current) {
      const finalY = Math.max(0, targetY - 6);
      scrollViewRef.current.scrollTo({ y: finalY, animated: true });
    }

    // Scroll horizontal tab bar to keep active tab comfortably visible
    if (tabBarScrollRef.current) {
      const targetX = tabOffsetsX.current[tabKey] ?? 0;
      tabBarScrollRef.current.scrollTo({ x: Math.max(0, targetX - 20), animated: true });
    }
  };

  const handleScroll = (event: any) => {
    if (isAutoScrolling.current) return;
    const scrollY = event.nativeEvent.contentOffset.y;
    const offsets = sectionOffsets.current;

    // Buffer thresholds to trigger active tab indicator as user scrolls
    const calcY = (offsets.CALCULATOR || 680) - 80;
    const trackY = (offsets.TRACKING || 1550) - 80;
    const repY = (offsets.REPORT || 2200) - 80;

    if (scrollY >= repY && offsets.REPORT) {
      if (activeTab !== "REPORT") setActiveTab("REPORT");
    } else if (scrollY >= trackY && offsets.TRACKING) {
      if (activeTab !== "TRACKING") setActiveTab("TRACKING");
    } else if (scrollY >= calcY && offsets.CALCULATOR) {
      if (activeTab !== "CALCULATOR") setActiveTab("CALCULATOR");
    } else {
      if (activeTab !== "OVERVIEW") setActiveTab("OVERVIEW");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [equipData, availData] = await Promise.all([
          fetchEquipmentDetail(equipmentId).catch(() => null),
          fetchDryhouseAvailability().catch(() => null),
        ]);
        setEquipment(equipData);
        setAvailability(availData);

        // Pre-select tier if availability reports an active tier
        if (availData?.activeOccupancyTier?.tierKey) {
          const matched = OCCUPANCY_TIERS.find(
            (t) => t.key === availData.activeOccupancyTier.tierKey
          );
          if (matched) {
            setSelectedTierKey(matched.key);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch Dryhouse details:", err);
      } finally {
        setLoading(false);
        if (routeParams?.initialTab) {
          setTimeout(() => {
            handleTabPress(routeParams.initialTab as any);
          }, 200);
        }
      }
    })();
  }, [equipmentId]);

  // Synchronized volume text input handler with strict minimum validation
  const handleVolumeTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setVolumeInputText(cleaned);

    if (cleaned === "") {
      setVolumeError(null);
      return;
    }

    const parsed = parseInt(cleaned, 10);
    if (parsed === 0) {
      setVolumeError("Minimal volume pemesanan fasilitas Dry House adalah 100 kg kopi cherry.");
      return;
    }

    if (parsed < 100) {
      setVolumeError(`Volume ${parsed} kg di bawah batas minimal (Minimal 100 kg).`);
      return;
    }

    if (parsed > 6000) {
      setVolumeError(`Volume ${parsed.toLocaleString("id-ID")} kg melebihi kapasitas maksimal fasilitas (6.000 kg).`);
      return;
    }

    setVolumeError(null);
    setVolumeKg(parsed);
  };

  const handleVolumeTextBlur = () => {
    if (volumeInputText.trim() === "") {
      // Allow user to leave it empty; prices and totals will display as "—"
      return;
    }
    const parsed = parseInt(volumeInputText.replace(/[^0-9]/g, ""), 10);
    if (isNaN(parsed) || parsed < 100) {
      Alert.alert(
        "Volume Di Bawah Batas Minimal",
        "Minimal volume pengeringan fasilitas Geothermal Dry House adalah 100 kg kopi cherry.\n\nNilai otomatis disesuaikan ke batas minimal 100 kg."
      );
      setVolumeKg(100);
      setVolumeInputText("100");
      setVolumeError(null);
    } else if (parsed > 6000) {
      Alert.alert(
        "Volume Melebihi Kapasitas Maksimal",
        "Kapasitas total fasilitas Dry House adalah maksimal 6.000 kg per batch.\n\nNilai otomatis disesuaikan ke 6.000 kg."
      );
      setVolumeKg(6000);
      setVolumeInputText("6000");
      setVolumeError(null);
    } else {
      setVolumeKg(parsed);
      setVolumeInputText(String(parsed));
      setVolumeError(null);
    }
  };

  const handleQuickVolumeSelect = (val: number) => {
    setVolumeKg(val);
    setVolumeInputText(String(val));
    setVolumeError(null);
  };

  // Slider Touch / Drag handler for Native & Web
  const updateVolumeFromRatio = (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const rawVal = 100 + clampedRatio * (6000 - 100);
    const stepped = Math.round(rawVal / 50) * 50;
    const finalVal = Math.max(100, Math.min(6000, stepped));
    setVolumeKg(finalVal);
    setVolumeInputText(String(finalVal));
    setVolumeError(null);
  };

  // Proceed booking with alert validation
  const handleProceedBooking = () => {
    if (isVolumeEmpty) {
      Alert.alert(
        "Volume Belum Diisi",
        "Silakan tentukan jumlah berat kopi cherry yang ingin dikeringkan terlebih dahulu (minimal 100 kg)."
      );
      return;
    }

    const parsed = parseInt(volumeInputText.replace(/[^0-9]/g, ""), 10);
    if (isNaN(parsed) || parsed < 100) {
      Alert.alert(
        "Pemesanan Tidak Dapat Dilanjutkan",
        "Minimal volume pengeringan fasilitas Geothermal Dry House adalah 100 kg kopi cherry.\n\nSilakan tentukan minimal 100 kg sebelum memesan.",
        [
          {
            text: "Atur ke 100 kg",
            onPress: () => {
              setVolumeKg(100);
              setVolumeInputText("100");
              setVolumeError(null);
            },
          },
        ]
      );
      return;
    }

    if (parsed > 6000) {
      Alert.alert(
        "Kapasitas Melebihi Batas Maksimal",
        "Maksimal kapasitas pengeringan fasilitas Dry House adalah 6.000 kg per batch. Silakan kurangi volume pesanan."
      );
      return;
    }

    navigate("c_geo_direct_booking", {
      equipmentId: equipment?._id || "EQ-01",
      initialVolumeKg: parsed,
      initialDryingMethod: selectedMethod,
    });
  };

  const isVolumeEmpty = volumeInputText.trim() === "";
  const isVolumeValid = !isVolumeEmpty && !volumeError && volumeKg >= 100 && volumeKg <= 6000;

  // Calculator Math Calculations
  const calculation = useMemo(() => {
    const HPP_PER_KG = 377;
    const tier = OCCUPANCY_TIERS.find((t) => t.key === selectedTierKey) || OCCUPANCY_TIERS[0];
    const ratePerKg = tier.ratePerKg;

    if (isVolumeEmpty) {
      return {
        ratePerKg,
        discountPercent: tier.discountPercent,
        tierLabel: tier.label,
        rangeText: tier.rangeText,
        totalUserPayment: 0,
        dpRequired: 0,
        remainingBalance: 0,
        estimatedOperationalCost: 0,
        estimatedSurplus: 0,
        hppPerKg: HPP_PER_KG,
        hasValue: false,
      };
    }

    const effectiveKg = volumeError ? 100 : Math.max(100, volumeKg);
    const totalUserPayment = effectiveKg * ratePerKg;
    const dpRequired = Math.round(totalUserPayment * 0.3);
    const remainingBalance = Math.max(0, totalUserPayment - dpRequired);
    const estimatedOperationalCost = effectiveKg * HPP_PER_KG;
    const estimatedSurplus = totalUserPayment - estimatedOperationalCost;

    return {
      ratePerKg,
      discountPercent: tier.discountPercent,
      tierLabel: tier.label,
      rangeText: tier.rangeText,
      totalUserPayment,
      dpRequired,
      remainingBalance,
      estimatedOperationalCost,
      estimatedSurplus,
      hppPerKg: HPP_PER_KG,
      hasValue: !volumeError,
    };
  }, [volumeKg, selectedTierKey, volumeError, isVolumeEmpty]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D7A53" />
        <Text style={styles.loadingText}>Memuat layanan Geothermal Dryhouse...</Text>
      </View>
    );
  }

  const sliderFillPercent = isVolumeEmpty
    ? 0
    : ((Math.max(100, Math.min(6000, volumeKg)) - 100) / (6000 - 100)) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate("c_geo_direct")}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>Geothermal Dry House</Text>
          <Text style={styles.topBarSubtitle}>Geo Direct Use • PGE Kamojang</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigate("c_geo_direct_history")}
          style={styles.historyBtn}
          activeOpacity={0.75}
        >
          <Clock size={16} color="#0D7A53" />
          <Text style={styles.historyBtnText}>Riwayat</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Sub-Tabs */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          ref={tabBarScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScrollInner}
        >
          {[
            { key: "OVERVIEW", label: "Layanan & Fasilitas" },
            { key: "CALCULATOR", label: "Kalkulator Tarif (Prioritas)" },
            { key: "TRACKING", label: "Alur Tracking" },
            { key: "REPORT", label: "Laporan Digital" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => handleTabPress(tab.key as any)}
                onLayout={(e) => {
                  tabOffsetsX.current[tab.key] = e.nativeEvent.layout.x;
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* =======================================================
            SECTION 1: INFORMASI & VALUE PROPOSITION LAYANAN
        ======================================================== */}
        <View
          style={styles.heroBanner}
          onLayout={(e) => updateSectionOffset("OVERVIEW", e.nativeEvent.layout.y)}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.categoryPill}>
              <Flame size={12} color="#0D7A53" />
              <Text style={styles.categoryPillText}>GEO DIRECT USE</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDotGreen} />
              <Text style={styles.statusPillText}>Layanan Aktif</Text>
            </View>
          </View>

          <Text style={styles.serviceName}>Geothermal Dry House</Text>
          <Text style={styles.valueProposition}>
            Layanan pemanfaatan fasilitas pengeringan berbasis energi panas bumi yang memungkinkan petani,
            koperasi, dan pelaku UMKM mengakses teknologi pengeringan secara praktis, terukur, dan efisien
            melalui pemesanan digital.
          </Text>

          {/* Key Advantages */}
          <View style={styles.advantagesGrid}>
            <View style={styles.advantageCard}>
              <ThermometerSun size={18} color="#FFFFFF" />
              <Text style={styles.advantageTitle}>Suhu Terkontrol</Text>
              <Text style={styles.advantageDesc}>Suhu konstan 40–50°C tanpa risiko kegosongan</Text>
            </View>
            <View style={styles.advantageCard}>
              <SunMedium size={18} color="#FFFFFF" />
              <Text style={styles.advantageTitle}>Bebas Cuaca</Text>
              <Text style={styles.advantageDesc}>Terlindung dari hujan, debu, & over-fermentasi</Text>
            </View>
            <View style={styles.advantageCard}>
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={styles.advantageTitle}>Mutu Specialty</Text>
              <Text style={styles.advantageDesc}>Meningkatkan cup quality dan keseragaman green bean</Text>
            </View>
          </View>
        </View>

        {/* =======================================================
            SECTION 2: DRY HOUSE AVAILABILITY
        ======================================================== */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <Layers size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Ketersediaan Fasilitas Dry House</Text>
              <Text style={styles.sectionSubtitle}>
                Data okupansi kapasitas batch aktual di PGE CoE Kamojang
              </Text>
            </View>
          </View>

          <View style={styles.availabilityGrid}>
            <View style={styles.availStatCard}>
              <Text style={styles.availStatLabel}>Jumlah Fasilitas</Text>
              <Text style={styles.availStatVal}>{availability?.totalUnits || 4} Unit</Text>
              <Text style={styles.availStatSub}>Dry House terpasang</Text>
            </View>
            <View style={styles.availStatCard}>
              <Text style={styles.availStatLabel}>Kapasitas Maksimal</Text>
              <Text style={styles.availStatVal}>
                {(availability?.maxCapacityKg ?? (availability as any)?.totalMaxCapacityKg ?? 6000).toLocaleString("id-ID")} kg
              </Text>
              <Text style={styles.availStatSub}>Per batch pengeringan</Text>
            </View>
            <View style={styles.availStatCard}>
              <Text style={styles.availStatLabel}>Telah Terisi</Text>
              <Text style={[styles.availStatVal, { color: "#B45309" }]}>
                {(availability?.currentOccupancyKg ?? (availability as any)?.bookedCapacityKg ?? 0).toLocaleString("id-ID")} kg
              </Text>
              <Text style={styles.availStatSub}>
                Okupansi {availability?.occupancyPercent ?? 0}%
              </Text>
            </View>
            <View style={styles.availStatCard}>
              <Text style={styles.availStatLabel}>Sisa Kapasitas</Text>
              <Text style={[styles.availStatVal, { color: "#0D7A53" }]}>
                {(availability?.remainingCapacityKg || 6000).toLocaleString("id-ID")} kg
              </Text>
              <Text style={styles.availStatSub}>Tersedia untuk dipesan</Text>
            </View>
          </View>

          <View style={styles.scheduleInfoPill}>
            <Calendar size={14} color="#0D7A53" />
            <Text style={styles.scheduleInfoText}>
              Status:{" "}
              <Text style={{ fontWeight: "700" }}>
                {availability?.facilityStatus || "Tersedia & Siap Menerima Batch Kopi Cherry"}
              </Text>{" "}
              • Minimal volume per order 100 kg.
            </Text>
          </View>
        </View>

        {/* =======================================================
            SECTION 3: METODE PENGERINGAN YANG TERSEDIA
        ======================================================== */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <Droplets size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Pilihan Metode Pengeringan</Text>
              <Text style={styles.sectionSubtitle}>
                Pilih profil proses pengolahan pascapanen kopi cherry Anda
              </Text>
            </View>
          </View>

          <View style={styles.methodsList}>
            {DRYING_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                  onPress={() => setSelectedMethod(method.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.methodHeader}>
                    <View style={styles.methodRadioRow}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.methodTitle}>{method.title}</Text>
                    </View>
                    <View style={styles.methodBadge}>
                      <Text style={styles.methodBadgeText}>{method.badge}</Text>
                    </View>
                  </View>

                  <Text style={styles.methodDesc}>{method.desc}</Text>

                  <View style={styles.methodMetaRow}>
                    <Text style={styles.methodMetaText}>Suhu: {method.tempRange}</Text>
                    <Text style={styles.methodMetaDivider}>•</Text>
                    <Text style={styles.methodMetaText}>Target Kadar Air: {method.targetMoisture}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* =======================================================
            SECTION 4: KALKULATOR SEWA DRYHOUSE (PRIORITAS UTAMA)
        ======================================================== */}
        <View
          style={[styles.sectionBox, styles.calculatorHighlightBox]}
          onLayout={(e) => updateSectionOffset("CALCULATOR", e.nativeEvent.layout.y)}
        >
          <View style={styles.calculatorHeaderRow}>
            <View style={styles.calculatorIconWrap}>
              <Calculator size={22} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.priorityPill}>
                <Sparkles size={11} color="#B45309" />
                <Text style={styles.priorityPillText}>FITUR PRIORITAS UTAMA</Text>
              </View>
              <Text style={styles.calculatorTitle}>Kalkulator Sewa Dry House</Text>
              <Text style={styles.calculatorSubtitle}>
                Simulasi biaya interaktif dengan slider volume & diskon okupansi
              </Text>
            </View>
          </View>

          {/* Sub A: Input Volume Kopi Cherry */}
          <View style={styles.calcSubSection}>
            <View style={styles.calcLabelRow}>
              <Text style={styles.calcSubTitle}>A. Volume Kopi Cherry</Text>
              <Text
                style={[
                  styles.volumeDisplayBadge,
                  volumeError ? styles.volumeDisplayBadgeError : null,
                ]}
              >
                {volumeError
                  ? "Batas Min. 100 kg"
                  : volumeInputText
                  ? `${volumeKg.toLocaleString("id-ID")} kg`
                  : "— kg"}
              </Text>
            </View>

            {/* Synchronized Number Input Box */}
            <View
              style={[
                styles.volumeInputContainer,
                volumeError ? styles.volumeInputContainerError : null,
              ]}
            >
              <Text style={styles.volumeInputPrefix}>Input Manual:</Text>
              <TextInput
                style={styles.volumeTextInput}
                keyboardType="numeric"
                value={volumeInputText}
                onChangeText={handleVolumeTextChange}
                onBlur={handleVolumeTextBlur}
                placeholder=""
                placeholderTextColor="#94A3B8"
                selectTextOnFocus
              />
              <Text style={styles.volumeInputSuffix}>kg Cherry</Text>
            </View>

            {/* Inline Warning Notice if volume is invalid or below 100 kg */}
            {volumeError && (
              <View style={styles.errorInlineBox}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={styles.errorInlineText}>{volumeError}</Text>
              </View>
            )}

            {/* Interactive Slider Bar */}
            <View
              style={styles.sliderTrackContainer}
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
            >
              {Platform.OS === "web" ? (
                // Web Native Range Input with Clearly Visible Track and Fill
                <input
                  type="range"
                  min="100"
                  max="6000"
                  step="50"
                  value={isVolumeEmpty ? 100 : volumeKg}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setVolumeKg(val);
                    setVolumeInputText(String(val));
                    setVolumeError(null);
                  }}
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 4,
                    appearance: "none",
                    WebkitAppearance: "none",
                    background: isVolumeEmpty
                      ? "#CBD5E1"
                      : `linear-gradient(to right, #0D7A53 0%, #0D7A53 ${sliderFillPercent}%, #CBD5E1 ${sliderFillPercent}%, #CBD5E1 100%)`,
                    outline: "none",
                    cursor: "pointer",
                    accentColor: "#0D7A53",
                  } as any}
                />
              ) : (
                // Cross-Platform Native Slider Fallback
                <TouchableOpacity
                  style={styles.sliderBaseTrack}
                  activeOpacity={1}
                  onPress={(e) => {
                    const touchX = e.nativeEvent.locationX;
                    const ratio = touchX / Math.max(1, sliderWidth);
                    updateVolumeFromRatio(ratio);
                  }}
                >
                  <View style={[styles.sliderFillBar, { width: `${sliderFillPercent}%` }]} />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: Math.max(0, (sliderWidth * sliderFillPercent) / 100 - 10) },
                    ]}
                  />
                </TouchableOpacity>
              )}

              <View style={styles.sliderScaleRow}>
                <Text style={styles.scaleText}>Minimal: 100 kg</Text>
                <Text style={styles.scaleText}>Maksimal: 6.000 kg</Text>
              </View>
            </View>

            {/* Quick Step Buttons */}
            <View style={styles.quickButtonsRow}>
              {[100, 250, 500, 1000, 2500, 6000].map((stepVal) => {
                const isChipActive = volumeInputText !== "" && volumeKg === stepVal;
                return (
                  <TouchableOpacity
                    key={stepVal}
                    style={[
                      styles.quickBtn,
                      isChipActive && styles.quickBtnActive,
                    ]}
                    onPress={() => handleQuickVolumeSelect(stepVal)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.quickBtnText,
                        isChipActive && styles.quickBtnTextActive,
                      ]}
                    >
                      {stepVal >= 1000 ? `${stepVal / 1000} Ton` : `${stepVal} kg`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sub B: Okupansi Fasilitas dan Diskon (Mode Simulasi) */}
          <View style={styles.calcSubSection}>
            <View style={styles.calcLabelRow}>
              <Text style={styles.calcSubTitle}>B. Tingkat Okupansi Fasilitas & Diskon</Text>
              <Text style={styles.modeNoticeText}>(Mode Simulasi)</Text>
            </View>
            <Text style={styles.calcHelperText}>
              Pilih kategori okupansi untuk membandingkan tarif sewa. Pada booking nyata, diskon akan
              diterapkan otomatis dari ketersediaan sistem.
            </Text>

            <View style={styles.tierRadioList}>
              {OCCUPANCY_TIERS.map((tier) => {
                const isTierActive = selectedTierKey === tier.key;
                return (
                  <TouchableOpacity
                    key={tier.key}
                    style={[styles.tierCard, isTierActive && styles.tierCardActive]}
                    onPress={() => setSelectedTierKey(tier.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tierTopRow}>
                      <View style={[styles.radioCircle, isTierActive && styles.radioCircleSelected]}>
                        {isTierActive && <View style={styles.radioDot} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.tierRangeLabel}>{tier.rangeText}</Text>
                        <Text style={styles.tierDiscountText}>
                          {tier.discountPercent > 0
                            ? `Diskon ${tier.discountPercent}% dari tarif dasar (Rp 1.000/kg)`
                            : "Tarif Normal (Tanpa diskon)"}
                        </Text>
                      </View>
                      <View style={styles.tierRateBadge}>
                        <Text style={styles.tierRateVal}>Rp {tier.ratePerKg.toLocaleString("id-ID")}</Text>
                        <Text style={styles.tierRateUnit}>/kg</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sub C & D: Hasil Perhitungan Otomatis */}
          <View style={styles.calcResultsBox}>
            <View style={styles.resultsHeader}>
              <FileSpreadsheet size={18} color="#0D7A53" />
              <Text style={styles.resultsTitle}>Hasil Perhitungan Simulasi</Text>
            </View>

            {/* Results Table */}
            <View style={styles.resultsTable}>
              <View style={styles.tableRow}>
                <Text style={styles.tableColLabel}>Tarif Dasar Fasilitas</Text>
                <Text style={styles.tableColValue}>{rp(1000)}/kg</Text>
              </View>

              {calculation.discountPercent > 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableColLabel}>Diskon Okupansi ({calculation.tierLabel})</Text>
                  <Text style={[styles.tableColValue, { color: "#16A34A", fontWeight: "700" }]}>
                    -{calculation.discountPercent}% ({rp(calculation.ratePerKg)}/kg)
                  </Text>
                </View>
              )}

              <View style={styles.tableRow}>
                <Text style={styles.tableColLabel}>Volume Kopi Cherry</Text>
                <Text style={styles.tableColValue}>
                  {isVolumeEmpty
                    ? "—"
                    : volumeError
                    ? "Batas Min. 100 kg"
                    : `${volumeKg.toLocaleString("id-ID")} kg`}
                </Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowHighlight]}>
                <View>
                  <Text style={styles.tableColLabelHighlight}>Total Biaya Sewa Fasilitas</Text>
                  <Text style={styles.tableColSubHighlight}>
                    {isVolumeEmpty || volumeError
                      ? "—"
                      : `${volumeKg.toLocaleString("id-ID")} kg × ${rp(calculation.ratePerKg)}/kg`}
                  </Text>
                </View>
                <Text style={styles.tableColValHighlight}>
                  {isVolumeEmpty || volumeError ? "—" : rp(calculation.totalUserPayment)}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableColLabel}>Down Payment (DP 30%)</Text>
                <Text style={[styles.tableColValue, { color: "#0D7A53", fontWeight: "700" }]}>
                  {isVolumeEmpty || volumeError ? "—" : rp(calculation.dpRequired)}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableColLabel}>Sisa Pelunasan Batch (70%)</Text>
                <Text style={[styles.tableColValue, { color: "#475569", fontWeight: "700" }]}>
                  {isVolumeEmpty || volumeError ? "—" : rp(calculation.remainingBalance)}
                </Text>
              </View>
            </View>

            {/* Customer Information Note */}
            <View style={styles.disclaimerBox}>
              <Info size={14} color="#64748B" style={{ marginTop: 2 }} />
              <Text style={styles.disclaimerText}>
                Biaya sewa sudah mencakup penggunaan fasilitas Geothermal Dry House, pemantauan suhu otomatis 40–50°C, serta penerbitan Digital Processing Report resmi PGE CoE.
              </Text>
            </View>

            {/* Direct Booking CTA with Calculated Volume */}
            <TouchableOpacity
              style={[
                styles.btnBookCalculated,
                (isVolumeEmpty || volumeError) && styles.btnApplyError,
              ]}
              onPress={handleProceedBooking}
              activeOpacity={0.88}
            >
              <Text style={styles.btnBookCalculatedText}>
                {isVolumeEmpty
                  ? "Tentukan Volume untuk Memesan"
                  : volumeError
                  ? "Batas Minimal 100 kg"
                  : `Pesan Fasilitas dengan Volume ${volumeKg.toLocaleString("id-ID")} kg`}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* =======================================================
            SECTION 5: JADWAL & PEMESANAN FASILITAS
        ======================================================== */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <Calendar size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Jadwal & Prosedur Pemesanan</Text>
              <Text style={styles.sectionSubtitle}>
                Proses terverifikasi dengan validasi kapasitas anti-overbooking
              </Text>
            </View>
          </View>

          <View style={styles.flowStepsContainer}>
            <View style={styles.flowStepItem}>
              <View style={styles.flowStepNumCircle}>
                <Text style={styles.flowStepNum}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowStepTitle}>Pilih Metode & Input Berat Cherry</Text>
                <Text style={styles.flowStepDesc}>
                  Pilih metode pengeringan dan masukkan berat kopi cherry (100–6.000 kg).
                </Text>
              </View>
            </View>

            <View style={styles.flowStepItem}>
              <View style={styles.flowStepNumCircle}>
                <Text style={styles.flowStepNum}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowStepTitle}>Pilih Tanggal Rencana Pengeringan</Text>
                <Text style={styles.flowStepDesc}>
                  Sistem memeriksa ketersediaan live untuk mencegah benturan jadwal dan overbooking.
                </Text>
              </View>
            </View>

            <View style={styles.flowStepItem}>
              <View style={styles.flowStepNumCircle}>
                <Text style={styles.flowStepNum}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowStepTitle}>Pembayaran DP 30%</Text>
                <Text style={styles.flowStepDesc}>
                  Transfer via Bank Mandiri PGE atau QRIS. Saldo deposit DP kredit otomatis dapat digunakan.
                </Text>
              </View>
            </View>

            <View style={styles.flowStepItem}>
              <View style={styles.flowStepNumCircle}>
                <Text style={styles.flowStepNum}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flowStepTitle}>Penerbitan Nota Persetujuan PGE</Text>
                <Text style={styles.flowStepDesc}>
                  Setelah disetujui, bawa nota resmi ke CoE Kamojang untuk serah terima bahan baku.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* =======================================================
            SECTION 6: PEMANTAUAN PROSES PENGERINGAN
        ======================================================== */}
        <View
          style={styles.sectionBox}
          onLayout={(e) => updateSectionOffset("TRACKING", e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <TrendingUp size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Pemantauan Proses Pengeringan (Tracking)</Text>
              <Text style={styles.sectionSubtitle}>
                7 tahapan operasional nyata tercatat oleh tim operator PGE
              </Text>
            </View>
          </View>

          <View style={styles.stagesStepper}>
            {TRACKING_STAGES.map((stg, idx) => (
              <View key={stg.num} style={styles.stageItem}>
                <View style={styles.stageLeftCol}>
                  <View style={styles.stageNumBadge}>
                    <Text style={styles.stageNumText}>{stg.num}</Text>
                  </View>
                  {idx < TRACKING_STAGES.length - 1 && <View style={styles.stageConnectorLine} />}
                </View>
                <View style={styles.stageRightCol}>
                  <Text style={styles.stageTitleText}>{stg.title}</Text>
                  <Text style={styles.stageDescText}>{stg.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => navigate("c_geo_direct_history")}
            activeOpacity={0.8}
          >
            <Clock size={16} color="#0D7A53" />
            <Text style={styles.shortcutBtnText}>Pantau Pesanan Aktif di Riwayat</Text>
            <ChevronRight size={16} color="#0D7A53" />
          </TouchableOpacity>
        </View>

        {/* =======================================================
            SECTION 7: RIWAYAT TRANSAKSI & LAPORAN DIGITAL
        ======================================================== */}
        <View
          style={styles.sectionBox}
          onLayout={(e) => updateSectionOffset("REPORT", e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <FileSpreadsheet size={18} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Digital Processing Report</Text>
              <Text style={styles.sectionSubtitle}>
                Laporan digital resmi pascapengeringan dengan parameter terukur
              </Text>
            </View>
          </View>

          <View style={styles.reportPreviewCard}>
            <Text style={styles.reportCardTitle}>Item Laporan Resmi PGE CoE:</Text>
            <View style={styles.reportPillGrid}>
              <Text style={styles.reportPill}>• Identitas Transaksi & Kode Booking</Text>
              <Text style={styles.reportPill}>• Jenis Kopi & Varietas</Text>
              <Text style={styles.reportPill}>• Metode Pengeringan Geothermal</Text>
              <Text style={styles.reportPill}>• Berat Awal Cherry (kg)</Text>
              <Text style={styles.reportPill}>• Berat Akhir Green Bean (kg)</Text>
              <Text style={styles.reportPill}>• Kadar Air Hasil Pengeringan (%)</Text>
              <Text style={styles.reportPill}>• Tanggal Mulai & Selesai Batch</Text>
              <Text style={styles.reportPill}>• Status Penyelesaian & Verifikasi Operator</Text>
            </View>
            <Text style={styles.reportNotice}>
              *Laporan digital dapat diunduh / dicetak dalam format PDF resmi setelah proses pengeringan
              selesai diverifikasi operator.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => navigate("c_geo_direct_history")}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color="#0D7A53" />
            <Text style={styles.shortcutBtnText}>Buka Riwayat Transaksi & Laporan</Text>
            <ChevronRight size={16} color="#0D7A53" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomBarLabel}>
            {isVolumeEmpty
              ? "Volume Belum Diisi"
              : volumeError
              ? "Batas Minimal Diperlukan"
              : `Simulasi ${volumeKg.toLocaleString("id-ID")} kg Cherry`}
          </Text>
          <Text
            style={[
              styles.bottomBarPrice,
              (isVolumeEmpty || volumeError) && {
                fontSize: isVolumeEmpty ? 22 : 15,
                color: isVolumeEmpty ? "#64748B" : "#DC2626",
              },
            ]}
          >
            {isVolumeEmpty ? "—" : volumeError ? "Minimal 100 kg" : rp(calculation.totalUserPayment)}
          </Text>
          <Text style={styles.bottomBarSub}>
            {isVolumeEmpty
              ? "DP 30%: —"
              : volumeError
              ? "Tarif dasar min: Rp 50.000"
              : `DP 30%: ${rp(calculation.dpRequired)}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btnApply, (isVolumeEmpty || volumeError) && styles.btnApplyError]}
          onPress={handleProceedBooking}
          activeOpacity={0.88}
        >
          <Text style={styles.btnApplyText}>Pesan Fasilitas</Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  topBarTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D7A53",
  },
  tabBarWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabBarScrollInner: {
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#0D7A53",
  },
  tabItemText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  tabItemTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 110,
  },
  heroBanner: {
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  statusPillText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  serviceName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    lineHeight: 25,
  },
  valueProposition: {
    fontSize: 12.5,
    color: "#E2E8F0",
    lineHeight: 18,
    marginBottom: 16,
  },
  advantagesGrid: {
    flexDirection: "row",
    gap: 8,
  },
  advantageCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    padding: 10,
  },
  advantageTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 6,
    marginBottom: 2,
  },
  advantageDesc: {
    fontSize: 10,
    color: "#D1FAE5",
    lineHeight: 14,
  },
  sectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  availabilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  availStatCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  availStatLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  availStatVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  availStatSub: {
    fontSize: 10,
    color: "#94A3B8",
  },
  scheduleInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 8,
  },
  scheduleInfoText: {
    fontSize: 11.5,
    color: "#065F46",
    flex: 1,
    lineHeight: 16,
  },
  methodsList: {
    gap: 10,
  },
  methodCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  methodCardSelected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#0D7A53",
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  methodRadioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#0D7A53",
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#0D7A53",
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  methodBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  methodDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 8,
  },
  methodMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  methodMetaText: {
    fontSize: 11,
    color: "#0D7A53",
    fontWeight: "600",
  },
  methodMetaDivider: {
    color: "#CBD5E1",
  },
  calculatorHighlightBox: {
    borderColor: "#0D7A53",
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  calculatorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  calculatorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  priorityPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  calculatorSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  calcSubSection: {
    marginBottom: 18,
  },
  calcLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calcSubTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  volumeDisplayBadge: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  volumeDisplayBadgeError: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
  },
  volumeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  volumeInputContainerError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  errorInlineBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: -4,
    marginBottom: 12,
  },
  errorInlineText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
    flex: 1,
    lineHeight: 15,
  },
  btnApplyError: {
    backgroundColor: "#94A3B8",
  },
  volumeInputPrefix: {
    fontSize: 12,
    color: "#64748B",
    marginRight: 8,
  },
  volumeTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    paddingVertical: 2,
  },
  volumeInputSuffix: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  sliderTrackContainer: {
    marginVertical: 8,
  },
  sliderBaseTrack: {
    height: 10,
    backgroundColor: "#CBD5E1",
    borderRadius: 5,
    justifyContent: "center",
    position: "relative",
  },
  sliderFillBar: {
    height: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 5,
  },
  sliderThumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0D7A53",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  scaleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  quickButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
  },
  quickBtnActive: {
    backgroundColor: "#0D7A53",
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  quickBtnTextActive: {
    color: "#FFFFFF",
  },
  modeNoticeText: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
  },
  calcHelperText: {
    fontSize: 11.5,
    color: "#64748B",
    marginBottom: 10,
    lineHeight: 16,
  },
  tierRadioList: {
    gap: 8,
  },
  tierCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tierCardActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#0D7A53",
  },
  tierTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tierRangeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tierDiscountText: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  tierRateBadge: {
    alignItems: "flex-end",
  },
  tierRateVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
  },
  tierRateUnit: {
    fontSize: 10,
    color: "#64748B",
  },
  calcResultsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  resultsTable: {
    gap: 8,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  tableRowHighlight: {
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  tableColLabel: {
    fontSize: 12,
    color: "#475569",
  },
  tableColValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tableColLabelHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  tableColSubHighlight: {
    fontSize: 11,
    color: "#047857",
  },
  tableColValHighlight: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D7A53",
  },
  disclaimerBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
    fontStyle: "italic",
  },
  btnBookCalculated: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnBookCalculatedText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  flowStepsContainer: {
    gap: 12,
  },
  flowStepItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  flowStepNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  flowStepNum: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  flowStepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  flowStepDesc: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
    marginTop: 2,
  },
  stagesStepper: {
    gap: 4,
    marginBottom: 12,
  },
  stageItem: {
    flexDirection: "row",
    gap: 12,
  },
  stageLeftCol: {
    alignItems: "center",
    width: 24,
  },
  stageNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  stageNumText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D7A53",
  },
  stageConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 3,
  },
  stageRightCol: {
    flex: 1,
    paddingBottom: 10,
  },
  stageTitleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  stageDescText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  shortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  shortcutBtnText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  reportPreviewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  reportCardTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  reportPillGrid: {
    gap: 4,
  },
  reportPill: {
    fontSize: 11.5,
    color: "#334155",
    lineHeight: 16,
  },
  reportNotice: {
    fontSize: 10.5,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  bottomBarPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D7A53",
  },
  bottomBarSub: {
    fontSize: 10.5,
    color: "#047857",
  },
  btnApply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnApplyText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
