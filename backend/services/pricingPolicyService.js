/**
 * GEOVERSE Driver & Service Pricing Policy Engine
 * Kebijakan Tarif & Layanan Driver (Kanyaah Ride, Send, Laundry, Sampah, & Makanan)
 */

// Titik Acuan Pusat Wilayah Kamojang (Garut)
const KAMOJANG_COORDINATES = {
  latitude: -7.1452,
  longitude: 107.7891,
  address: "Kamojang, Samarang, Garut, Jawa Barat",
};

// Batas Maksimal Radius Layanan (km)
const MAX_SERVICE_RADIUS_KM = 15;

// Parameter Tarif Dasar
const PRICING_POLICY = {
  // Tarif dasar per km (Rp 2.500 / km, minimal 1 km pertama Rp 2.500)
  RATE_PER_KM: 2500,
  BASE_DISTANCE_FARE: 2500, // Rp 2.500 untuk jarak <= 1 km (seperti 0.6 km)
  MIN_DISTANCE_KM: 1,
  MIN_DISTANCE_FARE: 2500,

  // Biaya Layanan Platform
  SERVICE_FEE: 2000, // Rp 2.000

  // Batas Beban Berat (Kiloan)
  BASE_WEIGHT_MAX_KG: 20, // 0 - 20 kg (Termasuk dalam biaya penjemputan dasar / Rp 0)
  EXTRA_WEIGHT_RATE_PER_KG: 3000, // > 20 kg: Rp 3.000 / kg

  // Kebijakan Bagi Hasil / Komisi Driver
  NEW_DRIVER_SHARE_PERCENT: 80, // 80% untuk driver baru
  PLATFORM_SHARE_PERCENT: 20, // 20% untuk platform/admin
  EXISTING_KEDAI_TERPADU_SHARE_PERCENT: 100, // 100% untuk 5 mitra driver eksisting Kedai Terpadu
};

// Daftar Akun 5 Driver Eksisting Kedai Terpadu
const EXISTING_KEDAI_TERPADU_DRIVERS = new Set([
  "wuliddah@gmail.com",
  "driver_seed_001",
  "driver.kamojang1@geoverse.com",
  "driver.kamojang2@geoverse.com",
  "driver.kamojang3@geoverse.com",
  "driver.kamojang4@geoverse.com",
]);

/**
 * Hitung jarak Haversine (km) antara dua koordinat GPS
 */
const calculateHaversineKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
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

/**
 * Validasi apakah lokasi berada di dalam radius maksimal (15 km) dari Kamojang
 */
const validateKamojangRadius = (location, maxRadiusKm = MAX_SERVICE_RADIUS_KM) => {
  if (!location || location.latitude == null || location.longitude == null) {
    return { valid: true, distanceToKamojangKm: 0 };
  }
  const dist = calculateHaversineKm(
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

/**
 * Validasi rute penjemputan dan pengantaran (maks. 15 km per rute perjalanan)
 */
const validateServiceRoute = (pickup, destination, maxRadiusKm = MAX_SERVICE_RADIUS_KM) => {
  let routeDistanceKm = 0;
  if (
    pickup?.latitude != null &&
    pickup?.longitude != null &&
    destination?.latitude != null &&
    destination?.longitude != null
  ) {
    routeDistanceKm = calculateHaversineKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    );
  }

  const exceedsRouteDistance = routeDistanceKm > maxRadiusKm;
  const isAllowed = !exceedsRouteDistance;

  let message = "Rute dalam jangkauan layanan resmi.";
  if (exceedsRouteDistance) {
    message = `Jarak pengantaran rute (${routeDistanceKm} km) melebihi batas radius maksimal ${maxRadiusKm} km.`;
  }

  return {
    allowed: isAllowed,
    routeDistanceKm,
    maxRadiusKm,
    message,
  };
};

/**
 * Hitung tarif dasar berdasarkan jarak:
 * - Jarak <= 1.0 km (misal 0.6 km): Rp 2.500
 * - Jarak > 1.0 km: Jarak * Rp 2.500/km
 */
const calculateDistanceFare = (distanceKm) => {
  const safeDist = Math.max(0, Number(distanceKm) || 0);
  if (safeDist <= 1.0) {
    return PRICING_POLICY.BASE_DISTANCE_FARE;
  }
  const raw = safeDist * PRICING_POLICY.RATE_PER_KM;
  return Math.ceil(raw / 500) * 500;
};

/**
 * Hitung tarif tambahan berat (kiloan) untuk Paket, Laundry, dan Sampah:
 * - 0 - 20 kg: Rp 0 (sudah termasuk dalam biaya penjemputan dasar)
 * - > 20 kg: Rp 3.000 / kg untuk setiap kg di atas 20 kg
 */
const calculateWeightFare = (weightKg) => {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  if (safeWeight <= PRICING_POLICY.BASE_WEIGHT_MAX_KG) {
    return 0;
  }
  const extraKg = safeWeight - PRICING_POLICY.BASE_WEIGHT_MAX_KG;
  return Math.round(extraKg * PRICING_POLICY.EXTRA_WEIGHT_RATE_PER_KG);
};

/**
 * Cek apakah driver merupakan mitra eksisting program Kedai Terpadu
 */
const isKedaiTerpaduDriver = (driver) => {
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

/**
 * Hitung bagi hasil / komisi driver:
 * - Driver Eksisting Kedai Terpadu: 100% ongkir/tarif pengantaran (0% potongan)
 * - Driver Baru: 80% Driver, 20% Platform/Admin
 * - Biaya Layanan Platform (Rp 2.000) dialokasikan 100% ke Platform/Admin
 */
const calculateDriverRevenueSplit = (deliveryFare, driver = null) => {
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
      totalPlatformFee: PRICING_POLICY.SERVICE_FEE,
      description: "Mitra Driver Eksisting Kedai Terpadu: 100% tarif pengantaran untuk driver (Bebas Potongan Komisi).",
    };
  }

  // Driver Baru: 80% Driver, 20% Admin
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
    totalPlatformFee: platformCommission + PRICING_POLICY.SERVICE_FEE,
    description: "Driver Baru: Bagi hasil 80% driver dan 20% platform admin.",
  };
};

/**
 * Hitung rincian lengkap tarif Kanyaah Ride (Penumpang)
 */
const computeRideFare = ({
  distanceKm,
  durationMinutes = 15,
  vehicleType = "MOTOR",
  discount = 0,
  driver = null,
}) => {
  const safeDist = Math.round((Number(distanceKm) || 0) * 10) / 10;
  const distanceFare = calculateDistanceFare(safeDist);
  const serviceFee = PRICING_POLICY.SERVICE_FEE;
  const safeDiscount = Math.max(0, Number(discount) || 0);

  const subtotalFare = distanceFare;
  const rawFare = subtotalFare + serviceFee - safeDiscount;
  const minimumTotal = PRICING_POLICY.BASE_DISTANCE_FARE + serviceFee;
  const estimatedFare = Math.max(minimumTotal, Math.ceil(rawFare / 500) * 500);

  const revenueSplit = calculateDriverRevenueSplit(distanceFare, driver);

  return {
    serviceType: "KANYAAH_RIDE",
    distanceKm: safeDist,
    estimatedDurationMinutes: Number(durationMinutes) || 15,
    minDistanceKm: PRICING_POLICY.MIN_DISTANCE_KM,
    minDistanceFare: PRICING_POLICY.BASE_DISTANCE_FARE,
    ratePerKm: PRICING_POLICY.RATE_PER_KM,
    baseFare: PRICING_POLICY.BASE_DISTANCE_FARE,
    extraDistanceFare: Math.max(0, distanceFare - PRICING_POLICY.BASE_DISTANCE_FARE),
    distanceFare,
    timeFare: 0,
    serviceFee,
    discount: safeDiscount,
    minimumFare: minimumTotal,
    estimatedFare,
    finalFare: estimatedFare,
    driverEarnings: revenueSplit.driverEarnings,
    revenueSplit,
    currency: "IDR",
    policySummary: {
      under4KmFare: PRICING_POLICY.MIN_DISTANCE_FARE,
      perKmAfter4Km: PRICING_POLICY.RATE_PER_KM,
      serviceFee: PRICING_POLICY.SERVICE_FEE,
      maxRadiusKm: MAX_SERVICE_RADIUS_KM,
    },
  };
};

/**
 * Hitung rincian lengkap tarif Paket (Kanyaah Send), Laundry, dan Sampah
 */
const computeGoodsAndPickupFare = ({
  serviceType = "KANYAAH_SEND", // "KANYAAH_SEND" | "LAUNDRY" | "RECYCLE"
  distanceKm,
  weightKg = 1,
  packageData = {},
  discount = 0,
  driver = null,
}) => {
  const safeDist = Math.round((Number(distanceKm) || 0) * 10) / 10;
  const safeWeight = Math.max(0.1, Number(weightKg) || 1);

  // 1. Komponen Jarak
  const distanceFare = calculateDistanceFare(safeDist);

  // 2. Komponen Berat (Kiloan)
  const weightFare = calculateWeightFare(safeWeight);
  const extraKg = Math.max(0, safeWeight - PRICING_POLICY.BASE_WEIGHT_MAX_KG);

  // 3. Biaya Layanan Platform
  const serviceFee = PRICING_POLICY.SERVICE_FEE;

  // 4. Fitur Khusus Paket (Fragile / Asuransi opsional jika ada)
  const isFragile = Boolean(packageData.fragile);
  const fragileFee = isFragile ? 3000 : 0;
  const declaredValue = Math.max(0, Number(packageData.declaredValue) || 0);
  const insuranceFee = declaredValue > 0 ? Math.max(1000, Math.round(declaredValue * 0.002)) : 0;

  // 5. Total
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const deliverySubtotal = distanceFare + weightFare + fragileFee + insuranceFee;
  const rawTotal = deliverySubtotal + serviceFee - safeDiscount;
  const minimumTotal = PRICING_POLICY.BASE_DISTANCE_FARE + serviceFee;
  const estimatedFare = Math.max(minimumTotal, Math.ceil(rawTotal / 500) * 500);

  // 6. Bagi Hasil Driver
  const revenueSplit = calculateDriverRevenueSplit(deliverySubtotal, driver);

  return {
    serviceType,
    distanceKm: safeDist,
    weightKg: safeWeight,
    minDistanceKm: PRICING_POLICY.MIN_DISTANCE_KM,
    minDistanceFare: PRICING_POLICY.BASE_DISTANCE_FARE,
    ratePerKm: PRICING_POLICY.RATE_PER_KM,
    baseFare: PRICING_POLICY.BASE_DISTANCE_FARE,
    extraDistanceFare: Math.max(0, distanceFare - PRICING_POLICY.BASE_DISTANCE_FARE),
    distanceFare,
    baseWeightMaxKg: PRICING_POLICY.BASE_WEIGHT_MAX_KG,
    extraWeightKg: extraKg,
    extraWeightRatePerKg: PRICING_POLICY.EXTRA_WEIGHT_RATE_PER_KG,
    weightFare,
    fragileFee,
    insuranceFee,
    serviceFee,
    discount: safeDiscount,
    minimumFare: minimumTotal,
    estimatedFare,
    finalFare: estimatedFare,
    driverEarnings: revenueSplit.driverEarnings,
    revenueSplit,
    currency: "IDR",
    policySummary: {
      under4KmFare: PRICING_POLICY.MIN_DISTANCE_FARE,
      perKmAfter4Km: PRICING_POLICY.RATE_PER_KM,
      serviceFee: PRICING_POLICY.SERVICE_FEE,
      weightThresholdKg: PRICING_POLICY.BASE_WEIGHT_MAX_KG,
      overweightPerKg: PRICING_POLICY.EXTRA_WEIGHT_RATE_PER_KG,
      maxRadiusKm: MAX_SERVICE_RADIUS_KM,
    },
  };
};

module.exports = {
  KAMOJANG_COORDINATES,
  MAX_SERVICE_RADIUS_KM,
  PRICING_POLICY,
  EXISTING_KEDAI_TERPADU_DRIVERS,
  calculateHaversineKm,
  validateKamojangRadius,
  validateServiceRoute,
  calculateDistanceFare,
  calculateWeightFare,
  isKedaiTerpaduDriver,
  calculateDriverRevenueSplit,
  computeRideFare,
  computeGoodsAndPickupFare,
};
