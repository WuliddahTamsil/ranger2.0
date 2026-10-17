/**
 * GEOVERSE Driver & Service Pricing Policy (Client Engine)
 * Kebijakan Tarif & Layanan Driver (Kanyaah Ride, Send, Laundry, Sampah, Makanan)
 * Terintegrasi dengan Wilayah Kamojang (PGE) dan Program Kedai Terpadu
 */

export const KAMOJANG_COORDINATES = {
  latitude: -7.1452,
  longitude: 107.7891,
  address: "Kamojang, Samarang, Garut, Jawa Barat",
};

export const MAX_SERVICE_RADIUS_KM = 15;

export const KEDAI_TERPADU_COUNT_MISMATCH_NOTE =
  "Client document specifies 5 existing drivers for Kedai Terpadu, while legacy codebase records 6 identifiers. Supported dynamically via partnerProgram/isExistingDriver/commissionTier with legacy email/ID fallback.";

export const PRICING_POLICY = {
  // Tarif dasar per km (Rp 2.500 / km)
  ratePerKm: 2500,
  RATE_PER_KM: 2500,

  // Biaya Layanan Platform (Rp 2.000)
  serviceFee: 2000,
  SERVICE_FEE: 2000,

  // Jarak minimum dan tarif jarak minimum (Rp 2.500 untuk jarak <= 1 km)
  minimumDistanceKm: 1,
  MIN_DISTANCE_KM: 1,
  minimumDistanceFare: 2500,
  MIN_DISTANCE_FARE: 2500,
  BASE_DISTANCE_FARE: 2500,

  // Ambang batas dokumen client: "Minimal (<4 km) Rp9.500"
  minimumTotalFare: 9500,
  minimumFareThresholdKm: 4,
  minimumFareMode: "distance_plus_service_fee" as "distance_plus_service_fee" | "flat_total_under_threshold",

  // Batas Maksimal Beban Standar Kiloan (0 - 20 kg termasuk biaya dasar penjemputan)
  baseWeightIncludedKg: 20,
  BASE_WEIGHT_MAX_KG: 20,
  extraWeightRatePerKg: 3000, // > 20 kg: Rp 3.000 / kg
  EXTRA_WEIGHT_RATE_PER_KG: 3000,

  // Batas radius layanan Kamojang
  maxServiceRadiusKm: MAX_SERVICE_RADIUS_KM,

  // Persentase Bagi Hasil Driver
  regularDriverSharePercent: 80, // 80% Driver Baru
  NEW_DRIVER_SHARE_PERCENT: 80,
  platformSharePercent: 20, // 20% Platform/Admin
  PLATFORM_SHARE_PERCENT: 20,
  existingPartnerDriverSharePercent: 100, // 100% 5 Driver Eksisting Kedai Terpadu
  EXISTING_KEDAI_TERPADU_SHARE_PERCENT: 100,
};

export const EXISTING_KEDAI_TERPADU_DRIVERS = new Set([
  "wuliddah@gmail.com",
  "driver_seed_001",
  "driver.kamojang1@geoverse.com",
  "driver.kamojang2@geoverse.com",
  "driver.kamojang3@geoverse.com",
  "driver.kamojang4@geoverse.com",
]);

export const calculateHaversineDistanceKm = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number => {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    !Number.isFinite(Number(lat1)) ||
    !Number.isFinite(Number(lon1)) ||
    !Number.isFinite(Number(lat2)) ||
    !Number.isFinite(Number(lon2))
  ) {
    return 0;
  }
  const R = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const validateKamojangRadius = (
  location?: { latitude?: number | null; longitude?: number | null } | null,
  maxRadiusKm = MAX_SERVICE_RADIUS_KM
) => {
  if (
    !location ||
    location.latitude == null ||
    location.longitude == null ||
    !Number.isFinite(Number(location.latitude)) ||
    !Number.isFinite(Number(location.longitude))
  ) {
    return {
      valid: false,
      distanceToKamojangKm: null,
      maxRadiusKm,
      message: "Koordinat lokasi tidak valid atau tidak lengkap untuk layanan resmi Kamojang.",
    };
  }

  const dist = calculateHaversineDistanceKm(
    location.latitude,
    location.longitude,
    KAMOJANG_COORDINATES.latitude,
    KAMOJANG_COORDINATES.longitude
  );

  const isInside = dist <= maxRadiusKm;

  return {
    valid: isInside,
    distanceToKamojangKm: dist,
    maxRadiusKm,
    message: isInside
      ? "Lokasi berada di dalam jangkauan layanan resmi Kamojang."
      : `Lokasi (${dist} km) melebihi batas radius maksimal layanan Kamojang (${maxRadiusKm} km).`,
  };
};

export const validateServiceRoute = (
  pickup?: { latitude?: number | null; longitude?: number | null } | null,
  destination?: { latitude?: number | null; longitude?: number | null } | null,
  maxRadiusKm = MAX_SERVICE_RADIUS_KM
) => {
  if (
    !pickup ||
    pickup.latitude == null ||
    pickup.longitude == null ||
    !Number.isFinite(Number(pickup.latitude)) ||
    !Number.isFinite(Number(pickup.longitude))
  ) {
    return {
      allowed: false,
      routeDistanceKm: null,
      maxRadiusKm,
      message: "Titik penjemputan belum valid atau tidak memiliki koordinat.",
    };
  }

  if (
    !destination ||
    destination.latitude == null ||
    destination.longitude == null ||
    !Number.isFinite(Number(destination.latitude)) ||
    !Number.isFinite(Number(destination.longitude))
  ) {
    return {
      allowed: false,
      routeDistanceKm: null,
      maxRadiusKm,
      message: "Titik tujuan belum valid atau tidak memiliki koordinat.",
    };
  }

  const routeDistanceKm = calculateHaversineDistanceKm(
    pickup.latitude,
    pickup.longitude,
    destination.latitude,
    destination.longitude
  );

  const isAllowed = routeDistanceKm <= maxRadiusKm;

  return {
    allowed: isAllowed,
    routeDistanceKm,
    maxRadiusKm,
    message: isAllowed
      ? "Rute perjalanan dalam batas layanan Kamojang."
      : `Jarak rute pengantaran (${routeDistanceKm} km) melebihi batas maksimal ${maxRadiusKm} km.`,
  };
};

export const calculateDistanceFare = (
  distanceKm: number,
  mode: "distance_plus_service_fee" | "flat_total_under_threshold" = PRICING_POLICY.minimumFareMode
): number => {
  const safeDist = Math.max(0, Number(distanceKm) || 0);

  if (mode === "flat_total_under_threshold" && safeDist < PRICING_POLICY.minimumFareThresholdKm) {
    return Math.max(
      PRICING_POLICY.minimumDistanceFare,
      PRICING_POLICY.minimumTotalFare - PRICING_POLICY.serviceFee
    );
  }

  if (safeDist <= 1.0) {
    return PRICING_POLICY.minimumDistanceFare;
  }
  const raw = safeDist * PRICING_POLICY.ratePerKm;
  return Math.ceil(raw / 500) * 500;
};

export const calculateWeightFare = (weightKg: number): number => {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  if (safeWeight <= PRICING_POLICY.baseWeightIncludedKg) {
    return 0;
  }
  const extraKg = safeWeight - PRICING_POLICY.baseWeightIncludedKg;
  return Math.round(extraKg * PRICING_POLICY.extraWeightRatePerKg);
};

export const isKedaiTerpaduDriver = (driver: any): boolean => {
  if (!driver) return false;
  const idStr = String(driver._id || driver.id || "");
  const emailStr = String(driver.email || "").toLowerCase();
  const partnerProgram = String(
    driver.roleData?.partnerProgram || driver.partnerProgram || ""
  ).toUpperCase();
  const commissionTier = String(
    driver.roleData?.commissionTier || driver.commissionTier || ""
  ).toUpperCase();
  const isExistingFlag =
    String(driver.roleData?.isExistingDriver || driver.isExistingDriver || "") === "true" ||
    Boolean(driver.roleData?.isExistingDriver || driver.isExistingDriver);

  return (
    EXISTING_KEDAI_TERPADU_DRIVERS.has(idStr) ||
    EXISTING_KEDAI_TERPADU_DRIVERS.has(emailStr) ||
    partnerProgram === "KEDAI_TERPADU" ||
    commissionTier === "KEDAI_TERPADU_EKSISTING" ||
    isExistingFlag
  );
};

export const calculateDriverRevenueSplit = (deliveryFare: number, driver?: any) => {
  const isPartner = isKedaiTerpaduDriver(driver);
  const fare = Math.max(0, Number(deliveryFare) || 0);

  if (isPartner) {
    return {
      isKedaiTerpadu: true,
      partnerTier: "KEDAI_TERPADU_EKSISTING",
      commissionTier: "KEDAI_TERPADU_EKSISTING",
      driverSharePercent: PRICING_POLICY.existingPartnerDriverSharePercent,
      platformSharePercent: 0,
      driverEarnings: fare,
      platformCommission: 0,
      serviceFee: PRICING_POLICY.serviceFee,
      totalPlatformFee: PRICING_POLICY.serviceFee,
      description: "100% Hak Driver Mitra Eksisting Kedai Terpadu (Bebas Potongan Komisi)",
    };
  }

  const driverEarnings = Math.round(
    fare * (PRICING_POLICY.regularDriverSharePercent / 100)
  );
  const platformCommission = fare - driverEarnings;

  return {
    isKedaiTerpadu: false,
    partnerTier: "DRIVER_REGULER_BARU",
    commissionTier: "DRIVER_REGULER_BARU",
    driverSharePercent: PRICING_POLICY.regularDriverSharePercent,
    platformSharePercent: PRICING_POLICY.platformSharePercent,
    driverEarnings,
    platformCommission,
    serviceFee: PRICING_POLICY.serviceFee,
    totalPlatformFee: platformCommission + PRICING_POLICY.serviceFee,
    description: "Driver Baru: Bagi hasil 80% driver dan 20% platform admin.",
  };
};

export interface RideFareBreakdownResult {
  distanceKm: number;
  minDistanceKm: number;
  minDistanceFare: number;
  ratePerKm: number;
  baseFare: number;
  extraDistanceFare: number;
  distanceFare: number;
  serviceFee: number;
  discount: number;
  minimumFare: number;
  estimatedFare: number;
  driverEarnings: number;
  revenueSplit: {
    isKedaiTerpadu: boolean;
    partnerTier: string;
    commissionTier: string;
    driverSharePercent: number;
    platformSharePercent: number;
    driverEarnings: number;
    platformCommission: number;
    serviceFee: number;
  };
}

export const computeRideFareBreakdown = (
  distanceKm: number,
  discount: number = 0,
  driver?: any,
  fareMode: "distance_plus_service_fee" | "flat_total_under_threshold" = PRICING_POLICY.minimumFareMode
): RideFareBreakdownResult => {
  const safeDist = Math.round((Number(distanceKm) || 0) * 10) / 10;
  const distanceFare = calculateDistanceFare(safeDist, fareMode);
  const baseFare = PRICING_POLICY.minimumDistanceFare;
  const extraDistanceFare = Math.max(0, distanceFare - baseFare);
  const serviceFee = PRICING_POLICY.serviceFee;
  const safeDiscount = Math.max(0, Number(discount) || 0);

  const rawFare = distanceFare + serviceFee - safeDiscount;
  const minimumTotal =
    fareMode === "flat_total_under_threshold" && safeDist < PRICING_POLICY.minimumFareThresholdKm
      ? PRICING_POLICY.minimumTotalFare
      : PRICING_POLICY.minimumDistanceFare + serviceFee;

  const estimatedFare = Math.max(minimumTotal, Math.ceil(rawFare / 500) * 500);
  const split = calculateDriverRevenueSplit(distanceFare, driver);

  return {
    distanceKm: safeDist,
    minDistanceKm: PRICING_POLICY.minimumDistanceKm,
    minDistanceFare: PRICING_POLICY.minimumDistanceFare,
    ratePerKm: PRICING_POLICY.ratePerKm,
    baseFare,
    extraDistanceFare,
    distanceFare,
    serviceFee,
    discount: safeDiscount,
    minimumFare: minimumTotal,
    estimatedFare,
    driverEarnings: split.driverEarnings,
    revenueSplit: {
      isKedaiTerpadu: split.isKedaiTerpadu,
      partnerTier: split.partnerTier,
      commissionTier: split.commissionTier,
      driverSharePercent: split.driverSharePercent,
      platformSharePercent: split.platformSharePercent,
      driverEarnings: split.driverEarnings,
      platformCommission: split.platformCommission,
      serviceFee: split.serviceFee,
    },
  };
};
