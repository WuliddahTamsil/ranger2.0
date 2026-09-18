const SendPricingConfig = require("../models/SendPricingConfig");

// Earth's radius in km for Haversine
const calculateHaversineKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
};

// Default fallback pricing if DB record is not yet seeded
const DEFAULT_CONFIG = {
  baseFare: 8000,
  baseKm: 2,
  pricePerKm: 2500,
  pricePerKg: 1000,
  baseKg: 1,
  sizeFarePer1000Cm3: 500,
  baseCm3: 6000,
  serviceFee: 1500,
  fragileFee: 3000,
  minimumFare: 10000,
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
 * Compute send fare breakdown
 */
const computeSendFare = async ({
  pickup,
  destination,
  packageData = {},
  discount = 0,
}) => {
  const config = await getPricingConfig();

  // 1. Calculate distance (km)
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

  // 3. Distance Fare
  const baseFare = config.baseFare;
  const extraKm = Math.max(0, distanceKm - config.baseKm);
  const distanceFare = Math.round(extraKm * config.pricePerKm);

  // 4. Weight Fare
  const weightKg = Math.max(0.1, Number(packageData.weightKg) || 1);
  const extraKg = Math.max(0, weightKg - config.baseKg);
  const weightFare = Math.round(extraKg * config.pricePerKg);

  // 5. Size / Dimension Fare (Volume calculation: L x W x H in cm3)
  const lengthCm = Math.max(1, Number(packageData.lengthCm) || 10);
  const widthCm = Math.max(1, Number(packageData.widthCm) || 10);
  const heightCm = Math.max(1, Number(packageData.heightCm) || 10);
  const volumeCm3 = lengthCm * widthCm * heightCm;
  const extraCm3 = Math.max(0, volumeCm3 - config.baseCm3);
  const sizeFare = Math.round((extraCm3 / 1000) * config.sizeFarePer1000Cm3);

  // 6. Fragile Protection / Special Handling Fee
  const isFragile = Boolean(packageData.fragile);
  const fragileFee = isFragile ? config.fragileFee : 0;

  // 7. Insurance Fee (Protection for declared value, 0.2%, min Rp 1.000 if declared)
  const declaredValue = Math.max(0, Number(packageData.declaredValue) || 0);
  const insuranceFee = declaredValue > 0 ? Math.max(1000, Math.round(declaredValue * 0.002)) : 0;

  // 8. Service Fee
  const serviceFee = config.serviceFee;

  // 9. Total Fare with discount and minimum fare clamp
  const safeDiscount = Math.max(0, Number(discount) || 0);
  const rawFare =
    baseFare +
    distanceFare +
    weightFare +
    sizeFare +
    fragileFee +
    insuranceFee +
    serviceFee -
    safeDiscount;

  const estimatedFare = Math.max(config.minimumFare, Math.ceil(rawFare / 1000) * 1000);

  // Driver gets 80% of fare excluding platform service fee
  const platformMargin = serviceFee;
  const driverEarnings = Math.max(8000, Math.round((estimatedFare - platformMargin) * 0.8));

  return {
    distanceKm,
    estimatedDurationMinutes,
    baseFare,
    distanceFare,
    weightFare,
    sizeFare,
    fragileFee,
    insuranceFee,
    serviceFee,
    discount: safeDiscount,
    minimumFare: config.minimumFare,
    estimatedFare,
    finalFare: estimatedFare,
    driverEarnings,
    currency: "IDR",
    breakdownNote: "Tarif dihitung berdasarkan jarak rute, bobot, volume dimensi, dan proteksi barang.",
  };
};

module.exports = {
  calculateHaversineKm,
  computeSendFare,
  isProhibitedItem,
  getPricingConfig,
  DEFAULT_CONFIG,
};
