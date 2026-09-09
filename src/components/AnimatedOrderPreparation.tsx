import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import {
  Flame,
  ChefHat,
  Truck,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Clock,
  UserCheck,
  ChevronRight,
  PackageCheck,
  Navigation,
} from "lucide-react-native";

export type OrderStageStatus =
  | "Menunggu"
  | "Diproses"
  | "Siap"
  | "Menuju Pickup"
  | "Sampai Pickup"
  | "Diambil"
  | "Mengantar"
  | "Selesai"
  | "Dibatalkan";

export interface DriverData {
  id?: string;
  name: string;
  phone?: string;
  vehicle?: string;
  plateNumber?: string;
  rating?: number;
  stage?: string;
  distance?: string;
  eta?: string;
}

export interface AvailableDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string;
  plateNumber?: string;
}

interface AnimatedOrderPreparationProps {
  status: OrderStageStatus | string;
  orderType: "Catering" | "Marketplace";
  orderCode?: string;
  customerName?: string;
  driver?: DriverData | null;
  availableDrivers?: AvailableDriver[];
  onAssignDriver?: (driverId: string) => void;
  onOpenChat?: (target: "customer" | "driver") => void;
  isAssigningDriver?: boolean;
}

export const AnimatedOrderPreparation: React.FC<AnimatedOrderPreparationProps> = ({
  status,
  orderType,
  orderCode,
  customerName,
  driver,
  availableDrivers = [],
  onAssignDriver,
  onOpenChat,
  isAssigningDriver = false,
}) => {
  const isWeb = Platform.OS === "web";
  const useNative = !isWeb;

  // Normalized status for UI stages
  const normalizedStatus = React.useMemo(() => {
    if (status === "Menuju Pickup" || status === "Sampai Pickup") return "Siap";
    if (status === "Mengantar" || status === "Dikirim") return "Diambil";
    return status;
  }, [status]);

  // --- ANIMATIONS ---
  // 1. Cooking steam animations
  const steam1Y = useRef(new Animated.Value(0)).current;
  const steam1Op = useRef(new Animated.Value(0.8)).current;
  const steam2Y = useRef(new Animated.Value(0)).current;
  const steam2Op = useRef(new Animated.Value(0.8)).current;
  const steam3Y = useRef(new Animated.Value(0)).current;
  const steam3Op = useRef(new Animated.Value(0.8)).current;

  // 2. Cooking pan sizzle / pulse
  const panScale = useRef(new Animated.Value(1)).current;
  const flameGlow = useRef(new Animated.Value(0.6)).current;

  // 3. Radar ripple wave animations (waiting driver)
  const radarWave1 = useRef(new Animated.Value(0)).current;
  const radarWave2 = useRef(new Animated.Value(0)).current;
  const radarWave3 = useRef(new Animated.Value(0)).current;
  const driverPulse = useRef(new Animated.Value(1)).current;

  // 4. Delivery transit animation (driving)
  const transitX = useRef(new Animated.Value(0)).current;
  const transitBounce = useRef(new Animated.Value(0)).current;

  // 5. Alert pulse for "Menunggu"
  const alertPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // --- Steam loops ---
    const createSteamAnim = (yVal: Animated.Value, opVal: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(yVal, {
              toValue: -24,
              duration: 1600,
              easing: Easing.out(Easing.quad),
              useNativeDriver: useNative,
            }),
            Animated.sequence([
              Animated.timing(opVal, {
                toValue: 0.9,
                duration: 600,
                useNativeDriver: useNative,
              }),
              Animated.timing(opVal, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: useNative,
              }),
            ]),
          ]),
          Animated.timing(yVal, {
            toValue: 0,
            duration: 0,
            useNativeDriver: useNative,
          }),
        ])
      );
    };

    const steamAnim1 = createSteamAnim(steam1Y, steam1Op, 0);
    const steamAnim2 = createSteamAnim(steam2Y, steam2Op, 500);
    const steamAnim3 = createSteamAnim(steam3Y, steam3Op, 1000);

    // --- Sizzle loop ---
    const sizzleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(panScale, {
          toValue: 1.05,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
        Animated.timing(panScale, {
          toValue: 0.98,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
        Animated.timing(panScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: useNative,
        }),
      ])
    );

    const flameAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(flameGlow, {
          toValue: 1,
          duration: 600,
          useNativeDriver: useNative,
        }),
        Animated.timing(flameGlow, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: useNative,
        }),
      ])
    );

    // --- Radar loops ---
    const createRadarAnim = (waveVal: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(waveVal, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: useNative,
          }),
          Animated.timing(waveVal, {
            toValue: 0,
            duration: 0,
            useNativeDriver: useNative,
          }),
        ])
      );
    };

    const radarAnim1 = createRadarAnim(radarWave1, 0);
    const radarAnim2 = createRadarAnim(radarWave2, 650);
    const radarAnim3 = createRadarAnim(radarWave3, 1300);

    const driverPulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(driverPulse, {
          toValue: 1.12,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
        Animated.timing(driverPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
      ])
    );

    // --- Transit loop ---
    const transitAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(transitX, {
            toValue: 18,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: useNative,
          }),
          Animated.sequence([
            Animated.timing(transitBounce, {
              toValue: -3,
              duration: 300,
              useNativeDriver: useNative,
            }),
            Animated.timing(transitBounce, {
              toValue: 0,
              duration: 300,
              useNativeDriver: useNative,
            }),
            Animated.timing(transitBounce, {
              toValue: -2,
              duration: 300,
              useNativeDriver: useNative,
            }),
            Animated.timing(transitBounce, {
              toValue: 0,
              duration: 300,
              useNativeDriver: useNative,
            }),
          ]),
        ]),
        Animated.timing(transitX, {
          toValue: -18,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useNative,
        }),
      ])
    );

    // --- Alert pulse loop ---
    const alertAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(alertPulse, {
          toValue: 1.15,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
        Animated.timing(alertPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useNative,
        }),
      ])
    );

    steamAnim1.start();
    steamAnim2.start();
    steamAnim3.start();
    sizzleAnim.start();
    flameAnim.start();
    radarAnim1.start();
    radarAnim2.start();
    radarAnim3.start();
    driverPulseAnim.start();
    transitAnim.start();
    alertAnim.start();

    return () => {
      steamAnim1.stop();
      steamAnim2.stop();
      steamAnim3.stop();
      sizzleAnim.stop();
      flameAnim.stop();
      radarAnim1.stop();
      radarAnim2.stop();
      radarAnim3.stop();
      driverPulseAnim.stop();
      transitAnim.stop();
      alertAnim.stop();
    };
  }, [useNative]);

  const handlePhoneCall = (phoneNumber?: string) => {
    if (!phoneNumber) return;
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    void Linking.openURL(`tel:${cleanNumber}`);
  };

  // --- RENDER VISUAL SCENE ---
  const renderVisualScene = () => {
    if (normalizedStatus === "Diproses") {
      // 1. COOKING / PREPARING ANIMATION SCENE
      return (
        <View style={styles.sceneContainer}>
          {/* Flame aura background */}
          <Animated.View
            style={[
              styles.flameGlowCircle,
              {
                opacity: flameGlow,
                transform: [{ scale: panScale }],
              },
            ]}
          />

          {/* Steam puffs */}
          <View style={styles.steamContainer}>
            <Animated.View
              style={[
                styles.steamPuff,
                styles.steamLeft,
                {
                  opacity: steam1Op,
                  transform: [{ translateY: steam1Y }],
                },
              ]}
            >
              <Text style={styles.steamEmoji}>♨️</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.steamPuff,
                styles.steamCenter,
                {
                  opacity: steam2Op,
                  transform: [{ translateY: steam2Y }],
                },
              ]}
            >
              <Text style={styles.steamEmoji}>♨️</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.steamPuff,
                styles.steamRight,
                {
                  opacity: steam3Op,
                  transform: [{ translateY: steam3Y }],
                },
              ]}
            >
              <Text style={styles.steamEmoji}>♨️</Text>
            </Animated.View>
          </View>

          {/* Cooking Pot / Pan Center */}
          <Animated.View
            style={[
              styles.iconCircleCooking,
              {
                transform: [{ scale: panScale }],
              },
            ]}
          >
            {orderType === "Catering" ? (
              <ChefHat size={34} color="#D97706" />
            ) : (
              <PackageCheck size={34} color="#D97706" />
            )}
            <View style={styles.flameBadge}>
              <Flame size={14} color="#DC2626" />
            </View>
          </Animated.View>

          {/* Status Text Info */}
          <View style={styles.sceneContent}>
            <View style={styles.badgeRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBadgeText}>
                {orderType === "Catering" ? "DAPUR SEDANG MEMASAK" : "SEDANG DISIAPKAN & DIKEMAS"}
              </Text>
            </View>
            <Text style={styles.sceneTitle}>
              {orderType === "Catering"
                ? "Dapur Menyiapkan Pesanan Lezat"
                : "Produk Sedang Dikemas Rapi"}
            </Text>
            <Text style={styles.sceneSubtitle}>
              {orderType === "Catering"
                ? "Bumbu & porsi diracik higienis sesuai pesanan customer. Driver dapat ditugaskan sekarang."
                : "Barang dicek dan dibungkus aman sebelum diserahkan ke driver."}
            </Text>
          </View>
        </View>
      );
    }

    if (normalizedStatus === "Siap") {
      // 2. WAITING FOR DRIVER / RADAR ANIMATION SCENE
      const wave1Scale = radarWave1.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 2.4],
      });
      const wave1Opacity = radarWave1.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0.8, 0.5, 0],
      });

      const wave2Scale = radarWave2.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 2.4],
      });
      const wave2Opacity = radarWave2.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0.8, 0.5, 0],
      });

      return (
        <View style={styles.sceneContainerRadar}>
          {/* Radar ripple rings */}
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: wave1Scale }],
                opacity: wave1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              styles.radarRingSecondary,
              {
                transform: [{ scale: wave2Scale }],
                opacity: wave2Opacity,
              },
            ]}
          />

          {/* Center Driver Courier Icon */}
          <Animated.View
            style={[
              styles.iconCircleRadar,
              {
                transform: [{ scale: driverPulse }],
              },
            ]}
          >
            <Truck size={32} color="#7E22CE" />
            <View style={styles.radarPingDot}>
              <Navigation size={12} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Status Text */}
          <View style={styles.sceneContent}>
            <View style={[styles.badgeRow, styles.badgePurple]}>
              <View style={[styles.livePulseDot, styles.dotPurple]} />
              <Text style={[styles.liveBadgeText, styles.textPurple]}>
                {driver ? "DRIVER DITUGASKAN" : "MENUNGGU DRIVER PENJEMPUT"}
              </Text>
            </View>
            <Text style={styles.sceneTitle}>
              {driver
                ? `${driver.name} Sedang Menuju Lokasi`
                : "Pesanan Siap! Menunggu Driver"}
            </Text>
            <Text style={styles.sceneSubtitle}>
              {driver
                ? `Driver sedang dalam perjalanan menuju gerai Anda (${driver.plateNumber || driver.vehicle || "Motor"}).`
                : "Tugaskan salah satu driver yang tersedia di bawah agar pesanan segera diantar."}
            </Text>
          </View>
        </View>
      );
    }

    if (normalizedStatus === "Diambil") {
      // 3. IN TRANSIT / DELIVERING SCENE
      return (
        <View style={styles.sceneContainerTransit}>
          <View style={styles.roadTrack}>
            <View style={styles.roadDashLine} />
          </View>

          <Animated.View
            style={[
              styles.iconCircleTransit,
              {
                transform: [
                  { translateX: transitX },
                  { translateY: transitBounce },
                ],
              },
            ]}
          >
            <Truck size={32} color="#0891B2" />
          </Animated.View>

          <View style={styles.sceneContent}>
            <View style={[styles.badgeRow, styles.badgeCyan]}>
              <View style={[styles.livePulseDot, styles.dotCyan]} />
              <Text style={[styles.liveBadgeText, styles.textCyan]}>
                SEDANG DIANTAR KURIR
              </Text>
            </View>
            <Text style={styles.sceneTitle}>Dalam Perjalanan ke Customer</Text>
            <Text style={styles.sceneSubtitle}>
              {driver ? `${driver.name} ` : "Kurir "}
              sedang mengantarkan pesanan dengan aman menuju alamat {customerName || "customer"}.
            </Text>
          </View>
        </View>
      );
    }

    if (normalizedStatus === "Selesai") {
      // 4. COMPLETED SUCCESS SCENE
      return (
        <View style={styles.sceneContainerSuccess}>
          <View style={styles.iconCircleSuccess}>
            <CheckCircle2 size={34} color="#15803D" />
            <View style={styles.sparkleBadge}>
              <Sparkles size={14} color="#EAB308" />
            </View>
          </View>
          <View style={styles.sceneContent}>
            <View style={[styles.badgeRow, styles.badgeGreen]}>
              <Text style={[styles.liveBadgeText, styles.textGreen]}>
                PESANAN SELESAI
              </Text>
            </View>
            <Text style={styles.sceneTitle}>Pesanan Berhasil Diserahkan</Text>
            <Text style={styles.sceneSubtitle}>
              Customer telah menerima pesanan dengan baik. Dana transaksi telah masuk ke saldo toko Anda.
            </Text>
          </View>
        </View>
      );
    }

    if (normalizedStatus === "Dibatalkan") {
      // 5. CANCELLED SCENE
      return (
        <View style={styles.sceneContainerCancelled}>
          <View style={styles.iconCircleCancelled}>
            <AlertCircle size={32} color="#B91C1C" />
          </View>
          <View style={styles.sceneContent}>
            <Text style={styles.sceneTitle}>Pesanan Dibatalkan</Text>
            <Text style={styles.sceneSubtitle}>
              Pesanan ini telah dibatalkan. Tidak ada tindakan lebih lanjut yang diperlukan.
            </Text>
          </View>
        </View>
      );
    }

    // 6. DEFAULT: MENUNGGU (ORDER BARU MASUK)
    return (
      <View style={styles.sceneContainerWaiting}>
        <Animated.View
          style={[
            styles.iconCircleWaiting,
            {
              transform: [{ scale: alertPulse }],
            },
          ]}
        >
          <Clock size={32} color="#D97706" />
        </Animated.View>
        <View style={styles.sceneContent}>
          <View style={[styles.badgeRow, styles.badgeAmber]}>
            <View style={[styles.livePulseDot, styles.dotAmber]} />
            <Text style={[styles.liveBadgeText, styles.textAmber]}>
              PESANAN BARU MASUK
            </Text>
          </View>
          <Text style={styles.sceneTitle}>Menunggu Konfirmasi Anda</Text>
          <Text style={styles.sceneSubtitle}>
            Segera terima pesanan ini agar dapur/toko dapat segera memproses dan customer tidak menunggu.
          </Text>
        </View>
      </View>
    );
  };

  // --- MODERN STEPPER PROGRESS BAR ---
  const stages = [
    { key: "Menunggu", label: "Diterima", icon: Clock },
    { key: "Diproses", label: orderType === "Catering" ? "Dimasak" : "Dikemas", icon: ChefHat },
    { key: "Siap", label: "Siap Ambil", icon: PackageCheck },
    { key: "Diambil", label: "Diantar", icon: Truck },
    { key: "Selesai", label: "Selesai", icon: CheckCircle2 },
  ];

  const getStageIndex = (st: string) => {
    if (st === "Menunggu") return 0;
    if (st === "Diproses") return 1;
    if (st === "Siap" || st === "Menuju Pickup" || st === "Sampai Pickup") return 2;
    if (st === "Diambil" || st === "Mengantar" || st === "Dikirim") return 3;
    if (st === "Selesai") return 4;
    return -1;
  };

  const currentIdx = getStageIndex(status);

  return (
    <View style={styles.container}>
      {/* 1. Animated Visual Card */}
      {renderVisualScene()}

      {/* 2. Modern Interactive Stepper */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperTrack}>
          {stages.map((stage, idx) => {
            const isCompleted = currentIdx > idx;
            const isActive = currentIdx === idx;
            const IconComponent = stage.icon;

            return (
              <React.Fragment key={stage.key}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} color="#FFFFFF" />
                    ) : (
                      <IconComponent
                        size={15}
                        color={isActive ? "#FFFFFF" : "#9CA3AF"}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCompleted && styles.stepLabelCompleted,
                      isActive && styles.stepLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {stage.label}
                  </Text>
                </View>

                {idx < stages.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      currentIdx > idx && styles.stepConnectorActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* 3. Driver Section (Assignment or Live Card) */}
      {driver ? (
        // LIVE DRIVER ASSIGNED CARD
        <View style={styles.driverActiveCard}>
          <View style={styles.driverHeader}>
            <View style={styles.driverAvatarBg}>
              <Truck size={22} color="#1B7A4E" />
            </View>
            <View style={styles.driverInfoCol}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverNameText}>{driver.name}</Text>
                <View style={styles.verifiedDriverPill}>
                  <UserCheck size={11} color="#15803D" />
                  <Text style={styles.verifiedDriverText}>Driver Aktif</Text>
                </View>
              </View>
              <Text style={styles.driverSubText}>
                {driver.vehicle || "Motor"} · {driver.plateNumber || "Plat terdaftar"}
              </Text>
              <View style={styles.driverStagePill}>
                <View style={styles.driverStageDot} />
                <Text style={styles.driverStageText}>
                  {driver.stage ||
                    (normalizedStatus === "Diambil"
                      ? "Sedang mengantar ke customer"
                      : "Sedang menuju gerai")}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Action Buttons for Driver */}
          <View style={styles.driverActionsRow}>
            {driver.phone ? (
              <TouchableOpacity
                style={[styles.driverActionBtn, styles.btnCall]}
                onPress={() => handlePhoneCall(driver.phone)}
                activeOpacity={0.8}
              >
                <Phone size={15} color="#15803D" />
                <Text style={styles.btnCallText}>Telepon</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.driverActionBtn, styles.btnChat]}
              onPress={() => onOpenChat?.("driver")}
              activeOpacity={0.8}
            >
              <MessageSquare size={15} color="#1B7A4E" />
              <Text style={styles.btnChatText}>Chat Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : normalizedStatus !== "Selesai" && normalizedStatus !== "Dibatalkan" ? (
        // TUGASKAN DRIVER SECTION (if no driver assigned yet)
        <View style={styles.assignDriverCard}>
          <View style={styles.assignHeader}>
            <View style={styles.assignIconBg}>
              <Truck size={18} color="#7E22CE" />
            </View>
            <View style={styles.assignHeaderTextCol}>
              <Text style={styles.assignTitle}>Tugaskan Driver Pengantar</Text>
              <Text style={styles.assignSub}>
                Pilih driver mitra untuk menjemput dan mengantar orderan ini
              </Text>
            </View>
          </View>

          {availableDrivers.length > 0 ? (
            <View style={styles.driverList}>
              {availableDrivers.map((drv) => (
                <TouchableOpacity
                  key={drv.id}
                  style={styles.driverOptionRow}
                  onPress={() => onAssignDriver?.(drv.id)}
                  disabled={isAssigningDriver}
                  activeOpacity={0.7}
                >
                  <View style={styles.driverAvatarSmall}>
                    <Truck size={16} color="#4B5563" />
                  </View>
                  <View style={styles.driverOptionDetails}>
                    <Text style={styles.driverOptionName}>{drv.name}</Text>
                    <Text style={styles.driverOptionPhone}>
                      {drv.phone || "No HP belum tersedia"}
                    </Text>
                  </View>
                  <View style={styles.selectDriverBtn}>
                    <Text style={styles.selectDriverBtnText}>Tugaskan</Text>
                    <ChevronRight size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyDriversBox}>
              <AlertCircle size={18} color="#9CA3AF" />
              <Text style={styles.emptyDriversText}>
                Belum ada driver mitra online saat ini. Pesanan tetap dapat ditandai siap diambil.
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  // --- SCENE CONTAINERS ---
  sceneContainer: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    padding: 16,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sceneContainerRadar: {
    backgroundColor: "#FAF5FF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
    padding: 16,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#7E22CE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sceneContainerTransit: {
    backgroundColor: "#ECFEFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#A5F3FC",
    padding: 16,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0891B2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sceneContainerSuccess: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    padding: 16,
    alignItems: "center",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sceneContainerWaiting: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    padding: 16,
    alignItems: "center",
  },
  sceneContainerCancelled: {
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    padding: 16,
    alignItems: "center",
  },

  // --- COOKING ANIMATION GRAPHICS ---
  flameGlowCircle: {
    position: "absolute",
    top: 6,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(254, 215, 170, 0.45)",
  },
  steamContainer: {
    flexDirection: "row",
    height: 22,
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 2,
    width: 80,
  },
  steamPuff: {
    marginHorizontal: 4,
  },
  steamLeft: {},
  steamCenter: {
    marginBottom: 3,
  },
  steamRight: {},
  steamEmoji: {
    fontSize: 14,
  },
  iconCircleCooking: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF3C7",
    borderWidth: 2.5,
    borderColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  flameBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: "#F87171",
  },

  // --- RADAR RIPPLE GRAPHICS ---
  radarRing: {
    position: "absolute",
    top: 25,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#A855F7",
    backgroundColor: "rgba(168, 85, 247, 0.08)",
  },
  radarRingSecondary: {
    borderColor: "#C084FC",
  },
  iconCircleRadar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F3E8FF",
    borderWidth: 2.5,
    borderColor: "#9333EA",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9333EA",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  radarPingDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#7E22CE",
    borderRadius: 10,
    padding: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  // --- TRANSIT ROAD GRAPHICS ---
  roadTrack: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: "#CFFAFE",
  },
  roadDashLine: {
    height: 2,
    backgroundColor: "#06B6D4",
    opacity: 0.4,
  },
  iconCircleTransit: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E0F2FE",
    borderWidth: 2.5,
    borderColor: "#0284C7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  // --- SUCCESS & WAITING ICONS ---
  iconCircleSuccess: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    borderWidth: 2.5,
    borderColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FEF08A",
    borderRadius: 10,
    padding: 3,
  },
  iconCircleWaiting: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEF3C7",
    borderWidth: 2,
    borderColor: "#D97706",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleCancelled: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FEE2E2",
    borderWidth: 2,
    borderColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },

  // --- SCENE TEXT CONTENT ---
  sceneContent: {
    alignItems: "center",
    marginTop: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  badgePurple: {
    backgroundColor: "#F3E8FF",
  },
  badgeCyan: {
    backgroundColor: "#CFFAFE",
  },
  badgeGreen: {
    backgroundColor: "#DCFCE7",
  },
  badgeAmber: {
    backgroundColor: "#FEF3C7",
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#D97706",
    marginRight: 6,
  },
  dotPurple: {
    backgroundColor: "#7E22CE",
  },
  dotCyan: {
    backgroundColor: "#0891B2",
  },
  dotGreen: {
    backgroundColor: "#15803D",
  },
  dotAmber: {
    backgroundColor: "#D97706",
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  textPurple: {
    color: "#7E22CE",
  },
  textCyan: {
    color: "#0891B2",
  },
  textGreen: {
    color: "#15803D",
  },
  textAmber: {
    color: "#B45309",
  },
  sceneTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  sceneSubtitle: {
    fontSize: 12.5,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // --- STEPPER PROGRESS BAR ---
  stepperContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  stepperTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    width: 58,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleCompleted: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  stepCircleActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  stepConnector: {
    flex: 1,
    height: 2.5,
    backgroundColor: "#E5E7EB",
    marginTop: -18,
    marginHorizontal: 2,
  },
  stepConnectorActive: {
    backgroundColor: "#1B7A4E",
  },
  stepLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
  },
  stepLabelCompleted: {
    color: "#1B7A4E",
  },
  stepLabelActive: {
    color: "#059669",
    fontWeight: "700",
  },

  // --- ACTIVE DRIVER CARD ---
  driverActiveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    shadowColor: "#1B7A4E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverAvatarBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverInfoCol: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginRight: 8,
  },
  verifiedDriverPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedDriverText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 3,
  },
  driverSubText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  driverStagePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  driverStageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 5,
  },
  driverStageText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  driverActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  driverActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnCall: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  btnCallText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 6,
  },
  btnChat: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A7F3D0",
  },
  btnChatText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B7A4E",
    marginLeft: 6,
  },

  // --- TUGASKAN DRIVER CARD ---
  assignDriverCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
    shadowColor: "#7E22CE",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  assignHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  assignIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  assignHeaderTextCol: {
    flex: 1,
  },
  assignTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  assignSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  driverList: {
    gap: 8,
    marginTop: 4,
  },
  driverOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  driverAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  driverOptionDetails: {
    flex: 1,
  },
  driverOptionName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1F2937",
  },
  driverOptionPhone: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 1,
  },
  selectDriverBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectDriverBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 2,
  },
  emptyDriversBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyDriversText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
