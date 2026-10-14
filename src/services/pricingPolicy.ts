/**
 * GEOVERSE Driver & Service Pricing Policy (Client Engine)
 * Kebijakan Tarif & Layanan Driver (Kanyaah Ride, Send, Laundry, Sampah, Makanan)
 */

export const KAMOJANG_COORDINATES = {
  latitude: -7.1452,
  longitude: 107.7891,
  address: "Kamojang, Samarang, Garut, Jawa Barat",
};

export const MAX_SERVICE_RADIUS_KM = 15;

export const PRICING_POLICY = {
  // Tarif dasar per km (Rp 2.500 / km, minimal 1 km pertama Rp 2.500)
  RATE_PER_KM: 2500,
  BASE_DISTANCE_FARE: 2500, // Rp 2.500 untuk jarak <= 1 km (seperti 0.6 km)
  MIN_DISTANCE_KM: 1,
  MIN_DISTANCE_FARE: 2500,

  // Biaya Layanan Platform
  SERVICE_FEE: 2000, // Rp 2.000

  // Batas Maksimal Beban Standar (Kiloan)
  BASE_WEIGHT_MAX_KG: 20, // 0 - 20 kg (Termasuk dalam biaya penjemputan dasar / Rp 0)
  EXTRA_WEIGHT_RATE_PER_KG: 3000, // > 20 kg: Rp 3.000 / kg

  // Persentase Bagi Hasil Driver
  NEW_DRIVER_SHARE_PERCENT: 80, // 80% Driver Baru
  PLATFORM_SHARE_PERCENT: 20, // 20% Platform/Admin
  EXISTING_KEDAI_TERPADU_SHARE_PERCENT: 100, // 100% 5 Driver Eksisting Kedai Terpadu
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
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
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
  if (!location || location.latitude == null || location.longitude == null) {
    return { valid: true, distanceToKamojangKm: 0, maxRadiusKm, message: "" };
  }

  const dist = calculateHaversineDistanceKm(
    location.latitude,
    location.longitude,
    KAMOJANG_COORDINATES.latitude,
    KAMOJANG_COORDINATES.longitude
  );

  return {
    valid: dist <= maxRadiusKm,
    distanceToKamojangKm: dist,
    maxRadiusKm,
    message:
      dist > maxRadiusKm
        ? `Lokasi (${dist} km) melebihi batas radius maksimal layanan Kamojang (${maxRadiusKm} km).`
        : "Lokasi berada di dalam jangkauan layanan.",
  };
};

export const calculateDistanceFare = (distanceKm: number): number => {
  const safeDist = Math.max(0, Number(distanceKm) || 0);
  if (safeDist <= 1.0) {
    return PRICING_POLICY.BASE_DISTANCE_FARE;
  }
  const raw = safeDist * PRICING_POLICY.RATE_PER_KM;
  return Math.ceil(raw / 500) * 500;
};

export const calculateWeightFare = (weightKg: number): number => {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  if (safeWeight <= PRICING_POLICY.BASE_WEIGHT_MAX_KG) {
    return 0;
  }
  const extraKg = safeWeight - PRICING_POLICY.BASE_WEIGHT_MAX_KG;
  return Math.round(extraKg * PRICING_POLICY.EXTRA_WEIGHT_RATE_PER_KG);
};

export const isKedaiTerpaduDriver = (driver: any): boolean => {
  if (!driver) return false;
  const idStr = String(driver._id || driver.id || "");
  const emailStr = String(driver.email || "").toLowerCase();
  const partnerProgram = String(
    driver.roleData?.partnerProgram || driver.partnerProgram || ""
  ).toUpperCase();
  const isExistingFlag = String(driver.roleData?.isExistingDriver || "") === "true";

  return (
    EXISTING_KEDAI_TERPADU_DRIVERS.has(idStr) ||
    EXISTING_KEDAI_TERPADU_DRIVERS.has(emailStr) ||
    partnerProgram === "KEDAI_TERPADU" ||
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
      driverSharePercent: 100,
      platformSharePercent: 0,
      driverEarnings: fare,
      platformCommission: 0,
      serviceFee: PRICING_POLICY.SERVICE_FEE,
      description: "100% Hak Driver Mitra Eksisting Kedai Terpadu (Bebas Komisi)",
    };
  }

  const driverEarnings = Math.round(fare * (PRICING_POLICY.NEW_DRIVER_SHARE_PERCENT / 100));
  const platformCommission = fare - driverEarnings;

  return {
    isKedaiTerpadu: false,
    partnerTier: "DRIVER_REGULER_BARU",
    driverSharePercent: 80,
    platformSharePercent: 20,
    driverEarnings,
    platformCommission,
    serviceFee: PRICING_POLICY.SERVICE_FEE,
    description: "Driver Baru: 80% Driver, 20% Platform Admin",
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
}

export const computeRideFareBreakdown = (
  distanceKm: number,
  discount: number = 0,
  driver?: any
): RideFareBreakdownResult => {
  const safeDist = Math.round((Number(distanceKm) || 0) * 10) / 10;
  const distanceFare = calculateDistanceFare(safeDist);
  const baseFare = PRICING_POLICY.MIN_DISTANCE_FARE;
  const extraDistanceFare = Math.max(0, distanceFare - baseFare);
  const serviceFee = PRICING_POLICY.SERVICE_FEE;
  const safeDiscount = Math.max(0, Number(discount) || 0);

  const rawFare = distanceFare + serviceFee - safeDiscount;
  const minimumTotal = PRICING_POLICY.MIN_DISTANCE_FARE + serviceFee;
  const estimatedFare = Math.max(minimumTotal, Math.ceil(rawFare / 500) * 500);
  const split = calculateDriverRevenueSplit(distanceFare, driver);

  return {
    distanceKm: safeDist,
    minDistanceKm: PRICING_POLICY.MIN_DISTANCE_KM,
    minDistanceFare: PRICING_POLICY.MIN_DISTANCE_FARE,
    ratePerKm: PRICING_POLICY.RATE_PER_KM,
    baseFare,
    extraDistanceFare,
    distanceFare,
    serviceFee,
    discount: safeDiscount,
    minimumFare: minimumTotal,
    estimatedFare,
    driverEarnings: split.driverEarnings,
  };
};
