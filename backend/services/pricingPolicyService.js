/**
 * GEOVERSE Driver & Service Pricing Policy Engine
 * Kebijakan Tarif & Layanan Driver (Kanyaah Ride, Send, Laundry, Sampah, & Makanan)
 * Terintegrasi dengan Wilayah Kamojang (PGE) dan Program Kedai Terpadu
 */

// Titik Acuan Pusat Wilayah Kamojang (Garut)
const KAMOJANG_COORDINATES = {
  latitude: -7.1452,
  longitude: 107.7891,
  address: "Kamojang, Samarang, Garut, Jawa Barat",
};

// Batas Maksimal Radius Layanan Kamojang (km)
const MAX_SERVICE_RADIUS_KM = 15;

/**
 * Catatan Mismatch Jumlah Mitra Eksisting Kedai Terpadu:
 * Dokumen client menyebutkan 5 driver eksisting Kedai Terpadu.
 * Codebase warisan (legacy) memiliki 6 identifier (4 email geoverse, 1 wuliddah, 1 driver_seed_001).
 * Sistem kini memprioritaskan database field (partnerProgram, isExistingDriver, commissionTier)
 * dengan backward compatibility ke daftar legacy.
 */
const KEDAI_TERPADU_COUNT_MISMATCH_NOTE =
  "Client document specifies 5 existing drivers for Kedai Terpadu, while legacy codebase records 6 identifiers. Supported dynamically via partnerProgram/isExistingDriver/commissionTier with legacy email/ID fallback.";

// Konfigurasi Bisnis Terpadu
const PRICING_POLICY = {
  // Jangkauan Layanan Operasional (Seluruh Indonesia)
  isNationwide: true,
  enforceKamojangRadius: false,
  maxRouteDistanceKm: 50, // Batas maksimal rute perjalanan motor per order

  // Tarif dasar per km (Rp 2.500/km)
  ratePerKm: 2500,
  RATE_PER_KM: 2500,

  // Biaya Layanan Platform (Rp 2.000)
  serviceFee: 2000,
  SERVICE_FEE: 2000,

  // Jarak minimum dan tarif minimum jarak
  minimumDistanceKm: 1,
  MIN_DISTANCE_KM: 1,
  minimumDistanceFare: 2500,
  MIN_DISTANCE_FARE: 2500,
  BASE_DISTANCE_FARE: 2500,

  // Ambang batas dokumen client: "Minimal (<4 km) Rp9.500"
  // Catatan: 3 km * Rp2.500 = Rp7.500 + service fee Rp2.000 = Rp9.500.
  // Mode default: "distance_plus_service_fee" untuk backward compatibility fungsi kalkulasi murni,
  // atau "flat_total_under_threshold" untuk memaksakan minimal total Rp 9.500 bagi perjalanan < 4 km.
  minimumTotalFare: 9500,
  minimumFareThresholdKm: 4,
  minimumFareMode: "distance_plus_service_fee", // "distance_plus_service_fee" | "flat_total_under_threshold"

  // Beban Berat Standar (Paket, Laundry, Sampah)
  baseWeightIncludedKg: 20, // 0 - 20 kg (termasuk biaya dasar)
  BASE_WEIGHT_MAX_KG: 20,
  extraWeightRatePerKg: 3000, // > 20 kg: Rp 3.000/kg
  EXTRA_WEIGHT_RATE_PER_KG: 3000,
  weightEnforcementMode: "surcharge", // "surcharge" | "strict_reject"
  maxAllowedWeightKg: 20, // Batas kaku jika strict_reject aktif

  // Batas radius layanan legacy Kamojang
  maxServiceRadiusKm: MAX_SERVICE_RADIUS_KM,

  // Bagi hasil komisi
  regularDriverSharePercent: 80, // 80% Driver Baru
  NEW_DRIVER_SHARE_PERCENT: 80,
  platformSharePercent: 20, // 20% Platform/Admin
  PLATFORM_SHARE_PERCENT: 20,
  existingPartnerDriverSharePercent: 100, // 100% Driver Eksisting Kedai Terpadu
  EXISTING_KEDAI_TERPADU_SHARE_PERCENT: 100,
};

// Daftar Akun Warisan Driver Eksisting Kedai Terpadu (Backward Compatibility)
const EXISTING_KEDAI_TERPADU_DRIVERS = new Set([
  "wuliddah@gmail.com",
  "driver_seed_001",
  "driver.kamojang1@geoverse.com",
  "driver.kamojang2@geoverse.com",
  "driver.kamojang3@geoverse.com",
  "driver.kamojang4@geoverse.com",
]);

// Official Confirmed 5 Drivers list (Configurable at runtime)
let officialKedaiTerpaduDrivers = new Set();
const setOfficialKedaiTerpaduDrivers = (driverIdentifiers = []) => {
  officialKedaiTerpaduDrivers = new Set(
    driverIdentifiers.map((id) => String(id).trim().toLowerCase())
  );
  return Array.from(officialKedaiTerpaduDrivers);
};

const setPricingPolicy = (newPolicy = {}) => {
  Object.assign(PRICING_POLICY, newPolicy);
  return { ...PRICING_POLICY };
};

const getPricingPolicy = () => ({ ...PRICING_POLICY });

/**
 * Validasi batasan berat paket/kargo motor
 */
const validateWeightAllowed = (
  weightKg,
  mode = PRICING_POLICY.weightEnforcementMode,
  maxKg = PRICING_POLICY.maxAllowedWeightKg
) => {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  if (mode === "strict_reject" && safeWeight > maxKg) {
    return {
      allowed: false,
      weightKg: safeWeight,
      maxAllowedWeightKg: maxKg,
      message: `Beban paket (${safeWeight} kg) melebihi batas maksimal kendaraan roda dua (${maxKg} kg). Pesanan ditolak demi keselamatan berkendara.`,
    };
  }
  return {
    allowed: true,
    weightKg: safeWeight,
    maxAllowedWeightKg: maxKg,
    message: "Beban paket memenuhi batas ketentuan operasional.",
  };
};

/**
 * Validasi apakah nilai koordinat angka valid
 */
const isValidCoordinateValue = (val) =>
  typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val);

/**
 * Hitung jarak Haversine (km) antara dua koordinat GPS
 */
const calculateHaversineKm = (lat1, lon1, lat2, lon2) => {
  if (
    !isValidCoordinateValue(Number(lat1)) ||
    !isValidCoordinateValue(Number(lon1)) ||
    !isValidCoordinateValue(Number(lat2)) ||
    !isValidCoordinateValue(Number(lon2))
  ) {
    return 0;
  }
  const R = 6371; // Radius bumi dalam km
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
 * Validasi apakah lokasi berada di dalam radius maksimal (15 km) dari titik pusat Kamojang
 */
const validateKamojangRadius = (location, maxRadiusKm = MAX_SERVICE_RADIUS_KM) => {
  if (
    !location ||
    !isValidCoordinateValue(Number(location.latitude)) ||
    !isValidCoordinateValue(Number(location.longitude))
  ) {
    return {
      valid: false,
      distanceToKamojangKm: null,
      maxRadiusKm,
      message: "Koordinat lokasi tidak valid atau tidak lengkap untuk layanan resmi Kamojang.",
    };
  }

  const dist = calculateHaversineKm(
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

/**
 * Validasi cakupan operasional layanan di seluruh Indonesia (Nationwide)
 * Batas geografis Indonesia: Lintang -11.5° s/d 6.5°, Bujur 94.5° s/d 141.5°
 */
const validateServiceCoverage = (location, options = {}) => {
  if (
    !location ||
    !isValidCoordinateValue(Number(location.latitude)) ||
    !isValidCoordinateValue(Number(location.longitude))
  ) {
    return {
      valid: false,
      isWithinIndonesia: false,
      message: "Koordinat lokasi tidak valid atau tidak lengkap.",
    };
  }

  const lat = Number(location.latitude);
  const lon = Number(location.longitude);

  const isWithinIndonesia = lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5;

  if (!isWithinIndonesia && !options.allowWorldwide) {
    return {
      valid: false,
      isWithinIndonesia: false,
      message: `Koordinat (${lat.toFixed(4)}, ${lon.toFixed(4)}) berada di luar wilayah Republik Indonesia. Layanan GEOVERSE beroperasi di seluruh Indonesia.`,
    };
  }

  return {
    valid: true,
    isWithinIndonesia: true,
    message: "Lokasi berada dalam cakupan jangkauan layanan GEOVERSE di seluruh Indonesia.",
  };
};

/**
 * Validasi rute penjemputan dan pengantaran (maksimal rute per perjalanan)
 */
const validateServiceRoute = (pickup, destination, maxRadiusKm = PRICING_POLICY.maxRouteDistanceKm || 50) => {
  if (
    !pickup ||
    !isValidCoordinateValue(Number(pickup.latitude)) ||
    !isValidCoordinateValue(Number(pickup.longitude))
  ) {
    return {
      allowed: false,
      routeDistanceKm: null,
      maxRadiusKm,
      message: "Koordinat titik penjemputan (pickup) tidak valid atau belum ditentukan.",
    };
  }

  if (
    !destination ||
    !isValidCoordinateValue(Number(destination.latitude)) ||
    !isValidCoordinateValue(Number(destination.longitude))
  ) {
    return {
      allowed: false,
      routeDistanceKm: null,
      maxRadiusKm,
      message: "Koordinat titik tujuan (destination) tidak valid atau belum ditentukan.",
    };
  }

  const routeDistanceKm = calculateHaversineKm(
    pickup.latitude,
    pickup.longitude,
    destination.latitude,
    destination.longitude
  );

  const exceedsRouteDistance = routeDistanceKm > maxRadiusKm;
  const isAllowed = !exceedsRouteDistance;

  return {
    allowed: isAllowed,
    routeDistanceKm,
    maxRadiusKm,
    message: isAllowed
      ? "Rute dalam jangkauan operasional layanan."
      : `Jarak rute perjalanan (${routeDistanceKm} km) melebihi batas maksimal ${maxRadiusKm} km.`,
  };
};

/**
 * Hitung tarif dasar berdasarkan jarak:
 * - Jarak <= 1.0 km (misal 0.6 km): Rp 2.500
 * - Jarak > 1.0 km: Jarak * Rp 2.500/km (dibulatkan per 500)
 */
const calculateDistanceFare = (distanceKm, mode = PRICING_POLICY.minimumFareMode) => {
  const safeDist = Math.max(0, Number(distanceKm) || 0);

  if (mode === "flat_total_under_threshold" && safeDist < PRICING_POLICY.minimumFareThresholdKm) {
    // Jika mode flat total aktif: total min 9500 (dikurangi service fee 2000 = jarak 7500)
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

/**
 * Hitung tarif tambahan berat (kiloan) untuk Paket, Laundry, dan Sampah:
 * - 0 - 20 kg: Rp 0 (sudah termasuk dalam biaya penjemputan dasar)
 * - > 20 kg: Rp 3.000 / kg untuk setiap kg di atas 20 kg
 */
const calculateWeightFare = (weightKg) => {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  if (safeWeight <= PRICING_POLICY.baseWeightIncludedKg) {
    return 0;
  }
  const extraKg = safeWeight - PRICING_POLICY.baseWeightIncludedKg;
  return Math.round(extraKg * PRICING_POLICY.extraWeightRatePerKg);
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
  const commissionTier = String(
    driver.roleData?.commissionTier || driver.commissionTier || ""
  ).toUpperCase();
  const isExistingFlag =
    String(driver.roleData?.isExistingDriver || driver.isExistingDriver || "") === "true" ||
    Boolean(driver.roleData?.isExistingDriver || driver.isExistingDriver);

  return (
    (officialKedaiTerpaduDrivers.size > 0 &&
      (officialKedaiTerpaduDrivers.has(idStr) || officialKedaiTerpaduDrivers.has(emailStr))) ||
    EXISTING_KEDAI_TERPADU_DRIVERS.has(idStr) ||
    EXISTING_KEDAI_TERPADU_DRIVERS.has(emailStr) ||
    partnerProgram === "KEDAI_TERPADU" ||
    commissionTier === "KEDAI_TERPADU_EKSISTING" ||
    isExistingFlag
  );
};

/**
 * Hitung bagi hasil / komisi driver:
 * - Driver Eksisting Kedai Terpadu: 100% ongkir/tarif pengantaran (0% potongan komisi)
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
      commissionTier: "KEDAI_TERPADU_EKSISTING",
      driverSharePercent: PRICING_POLICY.existingPartnerDriverSharePercent,
      platformSharePercent: 0,
      driverEarnings: fare,
      platformCommission: 0,
      serviceFee: PRICING_POLICY.serviceFee,
      totalPlatformFee: PRICING_POLICY.serviceFee,
      description:
        "Mitra Driver Eksisting Kedai Terpadu: 100% tarif pengantaran untuk driver (Bebas Potongan Komisi).",
    };
  }

  // Driver Baru: 80% Driver, 20% Platform
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

/**
 * Buat snapshot revenue split untuk disimpan di order saat diselesaikan
 */
const createRevenueSplitSnapshot = (deliveryFare, driver = null) => {
  const split = calculateDriverRevenueSplit(deliveryFare, driver);
  return {
    grossDeliveryFare: Math.max(0, Number(deliveryFare) || 0),
    serviceFee: split.serviceFee,
    driverEarnings: split.driverEarnings,
    platformCommission: split.platformCommission,
    driverSharePercent: split.driverSharePercent,
    platformSharePercent: split.platformSharePercent,
    commissionTier: split.commissionTier,
    isKedaiTerpadu: split.isKedaiTerpadu,
    splitCalculatedAt: new Date(),
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
  fareMode = PRICING_POLICY.minimumFareMode,
}) => {
  const safeDist = Math.round((Number(distanceKm) || 0) * 10) / 10;
  const distanceFare = calculateDistanceFare(safeDist, fareMode);
  const serviceFee = PRICING_POLICY.serviceFee;
  const safeDiscount = Math.max(0, Number(discount) || 0);

  const subtotalFare = distanceFare;
  const rawFare = subtotalFare + serviceFee - safeDiscount;
  const minimumTotal =
    fareMode === "flat_total_under_threshold" && safeDist < PRICING_POLICY.minimumFareThresholdKm
      ? PRICING_POLICY.minimumTotalFare
      : PRICING_POLICY.minimumDistanceFare + serviceFee;

  const estimatedFare = Math.max(minimumTotal, Math.ceil(rawFare / 500) * 500);
  const revenueSplit = calculateDriverRevenueSplit(distanceFare, driver);

  return {
    serviceType: "KANYAAH_RIDE",
    distanceKm: safeDist,
    estimatedDurationMinutes: Number(durationMinutes) || 15,
    minDistanceKm: PRICING_POLICY.minimumDistanceKm,
    minDistanceFare: PRICING_POLICY.minimumDistanceFare,
    ratePerKm: PRICING_POLICY.ratePerKm,
    baseFare: PRICING_POLICY.minimumDistanceFare,
    extraDistanceFare: Math.max(0, distanceFare - PRICING_POLICY.minimumDistanceFare),
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
      under4KmFare: PRICING_POLICY.minimumDistanceFare,
      perKmAfter4Km: PRICING_POLICY.ratePerKm,
      serviceFee: PRICING_POLICY.serviceFee,
      maxRadiusKm: MAX_SERVICE_RADIUS_KM,
      minimumFareMode: fareMode,
      minimumTotalFare: PRICING_POLICY.minimumTotalFare,
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
  fareMode = PRICING_POLICY.minimumFareMode,
}) => {
  const safeDist = Math.round((Number(distanceKm) || 0) * 10) / 10;
  const safeWeight = Math.max(0.1, Number(weightKg) || 1);

  // 1. Komponen Jarak
  const distanceFare = calculateDistanceFare(safeDist, fareMode);

  // 2. Komponen Berat (Kiloan)
  const weightFare = calculateWeightFare(safeWeight);
  const extraKg = Math.max(0, safeWeight - PRICING_POLICY.baseWeightIncludedKg);

  // 3. Biaya Layanan Platform
  const serviceFee = PRICING_POLICY.serviceFee;

  // 4. Fitur Khusus Paket (Fragile / Asuransi opsional jika ada)
  const isFragile = Boolean(packageData.fragile);
  const fragileFee = isFragile ? 3000 : 0;
  const declaredValue = Math.max(0, Number(packageData.declaredValue) || 0);
  const insuranceFee = declaredValue > 0 ? Math.max(1000, Math.round(declaredValue * 0.002)) : 0;

  // 5. Total
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const deliverySubtotal = distanceFare + weightFare + fragileFee + insuranceFee;
  const rawTotal = deliverySubtotal + serviceFee - safeDiscount;
  const minimumTotal =
    fareMode === "flat_total_under_threshold" && safeDist < PRICING_POLICY.minimumFareThresholdKm
      ? PRICING_POLICY.minimumTotalFare
      : PRICING_POLICY.minimumDistanceFare + serviceFee;

  const estimatedFare = Math.max(minimumTotal, Math.ceil(rawTotal / 500) * 500);

  // 6. Bagi Hasil Driver
  const revenueSplit = calculateDriverRevenueSplit(deliverySubtotal, driver);

  const weightValidation = validateWeightAllowed(
    safeWeight,
    PRICING_POLICY.weightEnforcementMode,
    PRICING_POLICY.maxAllowedWeightKg
  );

  return {
    serviceType,
    distanceKm: safeDist,
    weightKg: safeWeight,
    minDistanceKm: PRICING_POLICY.minimumDistanceKm,
    minDistanceFare: PRICING_POLICY.minimumDistanceFare,
    ratePerKm: PRICING_POLICY.ratePerKm,
    baseFare: PRICING_POLICY.minimumDistanceFare,
    extraDistanceFare: Math.max(0, distanceFare - PRICING_POLICY.minimumDistanceFare),
    distanceFare,
    baseWeightMaxKg: PRICING_POLICY.baseWeightIncludedKg,
    extraWeightKg: extraKg,
    extraWeightRatePerKg: PRICING_POLICY.extraWeightRatePerKg,
    weightFare,
    weightValidation,
    isOverweightAllowed: weightValidation.allowed,
    deliverySubtotal,
    deliveryFare: deliverySubtotal,
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
      under4KmFare: PRICING_POLICY.minimumDistanceFare,
      perKmAfter4Km: PRICING_POLICY.ratePerKm,
      serviceFee: PRICING_POLICY.serviceFee,
      weightThresholdKg: PRICING_POLICY.baseWeightIncludedKg,
      overweightPerKg: PRICING_POLICY.extraWeightRatePerKg,
      maxRadiusKm: MAX_SERVICE_RADIUS_KM,
      minimumFareMode: fareMode,
      minimumTotalFare: PRICING_POLICY.minimumTotalFare,
      weightEnforcementMode: PRICING_POLICY.weightEnforcementMode,
      maxAllowedWeightKg: PRICING_POLICY.maxAllowedWeightKg,
    },
  };
};

module.exports = {
  KAMOJANG_COORDINATES,
  MAX_SERVICE_RADIUS_KM,
  KEDAI_TERPADU_COUNT_MISMATCH_NOTE,
  PRICING_POLICY,
  EXISTING_KEDAI_TERPADU_DRIVERS,
  calculateHaversineKm,
  validateKamojangRadius,
  validateServiceCoverage,
  validateServiceRoute,
  calculateDistanceFare,
  calculateWeightFare,
  validateWeightAllowed,
  setPricingPolicy,
  getPricingPolicy,
  setOfficialKedaiTerpaduDrivers,
  isKedaiTerpaduDriver,
  calculateDriverRevenueSplit,
  createRevenueSplitSnapshot,
  computeRideFare,
  computeGoodsAndPickupFare,
};

