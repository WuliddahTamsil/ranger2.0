const SendPricingConfig = require("../models/SendPricingConfig");
const {
  KAMOJANG_COORDINATES,
  MAX_SERVICE_RADIUS_KM,
  PRICING_POLICY,
  calculateHaversineKm,
  validateKamojangRadius,
  validateServiceCoverage,
  validateServiceRoute,
  calculateDistanceFare,
  calculateWeightFare,
  validateWeightAllowed,
  calculateDriverRevenueSplit,
} = require("./pricingPolicyService");

// Default fallback pricing matching client policy
const DEFAULT_CONFIG = {
  baseFare: PRICING_POLICY.MIN_DISTANCE_FARE, // Minimal (<4 km) Rp 9.500
  baseKm: PRICING_POLICY.MIN_DISTANCE_KM, // 4 km
  pricePerKm: PRICING_POLICY.RATE_PER_KM, // Rp 2.500 / km
  pricePerKg: PRICING_POLICY.EXTRA_WEIGHT_RATE_PER_KG, // Rp 3.000 / kg (> 20 kg)
  baseKg: PRICING_POLICY.BASE_WEIGHT_MAX_KG, // 0 - 20 kg disamakan dengan biaya penjemputan dasar
  weightEnforcementMode: PRICING_POLICY.weightEnforcementMode,
  maxAllowedWeightKg: PRICING_POLICY.maxAllowedWeightKg,
  sizeFarePer1000Cm3: 500,
  baseCm3: 6000,
  serviceFee: PRICING_POLICY.SERVICE_FEE, // Rp 2.000
  fragileFee: 3000,
  minimumFare: PRICING_POLICY.MIN_DISTANCE_FARE + PRICING_POLICY.SERVICE_FEE, // Rp 11.500
  maxServiceRadiusKm: MAX_SERVICE_RADIUS_KM, // 15 km dari Kamojang
};

// List of prohibited item keywords to reject automatically on backend
const PROHIBITED_KEYWORDS = [
  "narkoba",
  "senjata",
  "mesiu",
  "peledak",
  "bom",
  "bensin",
  "racun",
  "sianida",
  "ganja",
  "sabu",
  "miras ilegal",
  "amunisi",
  "bahan kimia berbahaya",
];

const isProhibitedItem = (name = "", notes = "") => {
  const text = `${name} ${notes}`.toLowerCase();
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (text.includes(keyword)) {
      return { prohibited: true, keyword };
    }
  }
  return { prohibited: false };
};

const mongoose = require("mongoose");

/**
 * Fetch active pricing config or return default
 */
const getPricingConfig = async () => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const config = await SendPricingConfig.findOne({ configKey: "DEFAULT_SEND_CONFIG" }).lean();
      if (config) return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (err) {
    console.warn("⚠️ Using default send pricing config due to db query error:", err.message);
  }
  return DEFAULT_CONFIG;
};

/**
 * Compute send fare breakdown according to client policy:
 * - Antar jemput paket: Minimal (<4 km) Rp 9.500, tarif dasar Rp 2.500/km berikutnya, biaya layanan Rp 2.000
 * - Kiloan: 0 - 20 kg (Rp 0 / disamakan sama biaya dasar), lebih dari 20 kg Rp 3.000/kg
 * - Batas maksimal radius Kamojang: 15 km
 * - Bagi hasil: 80% Driver Baru / 100% Mitra Eksisting Kedai Terpadu
 */
const computeSendFare = async ({
  pickup,
  destination,
  packageData = {},
  discount = 0,
  driver = null,
  fareMode = null,
}) => {
  const config = await getPricingConfig();
  const effectiveFareMode = fareMode || config.minimumFareMode || PRICING_POLICY.minimumFareMode;

  // 1. Calculate distance (km)
  let distanceKm = 0;
  if (
    pickup?.latitude != null &&
    pickup?.longitude != null &&
    destination?.latitude != null &&
    destination?.longitude != null
  ) {
    distanceKm = calculateHaversineKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    );
  }
  if (!distanceKm || isNaN(distanceKm) || distanceKm < 0) {
    distanceKm = 0;
  }

  // 2. Duration estimate (approx 3.5 min/km + 8 min handling buffer)
  const estimatedDurationMinutes = Math.round(distanceKm * 3.5) + 8;

  // 3. Radius Validation (Nationwide Seluruh Indonesia / Kamojang configurable)
  const isKamojangOnly = Boolean(config.enforceKamojangRadius || PRICING_POLICY.enforceKamojangRadius);
  const maxRadius = isKamojangOnly
    ? (config.maxServiceRadiusKm || MAX_SERVICE_RADIUS_KM)
    : (config.maxRouteDistanceKm || PRICING_POLICY.maxRouteDistanceKm || 50);

  const pickupRadiusCheck = isKamojangOnly
    ? validateKamojangRadius(pickup, maxRadius)
    : validateServiceCoverage(pickup);
  const destRadiusCheck = isKamojangOnly
    ? validateKamojangRadius(destination, maxRadius)
    : validateServiceCoverage(destination);
  const routeValidation = validateServiceRoute(pickup, destination, maxRadius);

  const isAllowedRadius = pickupRadiusCheck.valid && destRadiusCheck.valid && routeValidation.allowed;
  let radiusErrorMessage = "Rute dalam jangkauan operasional layanan seluruh Indonesia.";
  if (!pickupRadiusCheck.valid) radiusErrorMessage = `Titik penjemputan: ${pickupRadiusCheck.message}`;
  else if (!destRadiusCheck.valid) radiusErrorMessage = `Titik tujuan: ${destRadiusCheck.message}`;
  else if (!routeValidation.allowed) radiusErrorMessage = routeValidation.message;

  const combinedRadiusValidation = {
    allowed: isAllowedRadius,
    pickupRadius: pickupRadiusCheck,
    destinationRadius: destRadiusCheck,
    routeDistanceKm: routeValidation.routeDistanceKm,
    maxRadiusKm: maxRadius,
    message: radiusErrorMessage,
  };

  // 4. Distance Fare (< 4 km Rp 9.500, per km berikutnya Rp 2.500)
  const distanceFare = calculateDistanceFare(distanceKm, effectiveFareMode);
  const baseFare = config.baseFare || PRICING_POLICY.MIN_DISTANCE_FARE;

  // 5. Weight Fare (0 - 20 kg Rp 0, > 20 kg Rp 3.000 / kg)
  const weightKg = Math.max(0.1, Number(packageData.weightKg) || 1);
  const weightValidation = validateWeightAllowed(
    weightKg,
    config.weightEnforcementMode || PRICING_POLICY.weightEnforcementMode,
    config.maxAllowedWeightKg || PRICING_POLICY.maxAllowedWeightKg
  );
  const weightFare = calculateWeightFare(weightKg);
  const extraKg = Math.max(0, weightKg - (config.baseKg || PRICING_POLICY.BASE_WEIGHT_MAX_KG));

  // 6. Size / Dimension Fare (Volume calculation: L x W x H in cm3)
  const lengthCm = Math.max(1, Number(packageData.lengthCm) || 10);
  const widthCm = Math.max(1, Number(packageData.widthCm) || 10);
  const heightCm = Math.max(1, Number(packageData.heightCm) || 10);
  const volumeCm3 = lengthCm * widthCm * heightCm;
  const extraCm3 = Math.max(0, volumeCm3 - (config.baseCm3 || 6000));
  const sizeFare = Math.round((extraCm3 / 1000) * (config.sizeFarePer1000Cm3 || 500));

  // 7. Fragile Protection / Special Handling Fee
  const isFragile = Boolean(packageData.fragile);
  const fragileFee = isFragile ? (config.fragileFee || 3000) : 0;

  // 8. Insurance Fee (Protection for declared value, 0.2%, min Rp 1.000 if declared)
  const declaredValue = Math.max(0, Number(packageData.declaredValue) || 0);
  const insuranceFee = declaredValue > 0 ? Math.max(1000, Math.round(declaredValue * 0.002)) : 0;

  // 9. Service Fee (Biaya Layanan Platform Rp 2.000)
  const serviceFee = config.serviceFee || PRICING_POLICY.SERVICE_FEE;

  // 10. Total Fare calculation
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const deliverySubtotal = distanceFare + weightFare + sizeFare + fragileFee + insuranceFee;
  const rawFare = deliverySubtotal + serviceFee - safeDiscount;

  const minFareRequirement =
    effectiveFareMode === "flat_total_under_threshold" && distanceKm < PRICING_POLICY.minimumFareThresholdKm
      ? PRICING_POLICY.minimumTotalFare
      : (config.minimumFare || (PRICING_POLICY.MIN_DISTANCE_FARE + PRICING_POLICY.SERVICE_FEE));
  const estimatedFare = Math.max(minFareRequirement, Math.ceil(rawFare / 500) * 500);

  // 11. Driver Revenue Sharing (80% Driver Baru vs 100% Mitra Eksisting Kedai Terpadu)
  const revenueSplit = calculateDriverRevenueSplit(deliverySubtotal, driver);

  return {
    distanceKm,
    estimatedDurationMinutes,
    baseFare,
    distanceFare,
    weightKg,
    extraWeightKg: extraKg,
    weightFare,
    weightValidation,
    isOverweightAllowed: weightValidation.allowed,
    isAllowedOrder: isAllowedRadius && weightValidation.allowed,
    sizeFare,
    fragileFee,
    insuranceFee,
    serviceFee,
    discount: safeDiscount,
    minimumFare: minFareRequirement,
    estimatedFare,
    finalFare: estimatedFare,
    driverEarnings: revenueSplit.driverEarnings,
    revenueSplit,
    withinServiceRadius: isAllowedRadius,
    radiusValidation: combinedRadiusValidation,
    currency: "IDR",
    policySummary: {
      under4KmFare: PRICING_POLICY.MIN_DISTANCE_FARE,
      perKmAfter4Km: PRICING_POLICY.RATE_PER_KM,
      serviceFee: PRICING_POLICY.SERVICE_FEE,
      weightThresholdKg: PRICING_POLICY.BASE_WEIGHT_MAX_KG,
      overweightPerKg: PRICING_POLICY.EXTRA_WEIGHT_RATE_PER_KG,
      maxRadiusKm: config.maxServiceRadiusKm || MAX_SERVICE_RADIUS_KM,
      weightEnforcementMode: config.weightEnforcementMode || PRICING_POLICY.weightEnforcementMode,
      maxAllowedWeightKg: config.maxAllowedWeightKg || PRICING_POLICY.maxAllowedWeightKg,
    },
    breakdownNote: "Tarif dihitung berdasarkan jarak (<4km Rp9.500, +Rp2.500/km), bobot (0-20kg Rp0, >20kg +Rp3.000/kg), dan biaya layanan Rp2.000.",
  };
};

module.exports = {
  calculateHaversineKm,
  computeSendFare,
  isProhibitedItem,
  getPricingConfig,
  DEFAULT_CONFIG,
};
