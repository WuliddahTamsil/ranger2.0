/**
 * recycleFareService.js
 * Business logic for GEOVERSE: Kanyaah Recycle & Geoverse Point
 * - Configurable Point to Rupiah conversion rate (Default: 1 Rupiah = 1 Point)
 * - Dynamic price per kg per category based on collector market prices (Pengepul)
 * - Environmental impact metrics (CO2 reduction, trees equivalent, landfill diverted)
 * - Distance calculation via Haversine
 */

const CATEGORY_CO2_FACTORS = {
  Plastik: 1.5,
  "Kertas & Kardus": 1.1,
  "Logam & Besi": 2.0,
  "Kaca & Botol": 0.3,
  Elektronik: 3.5,
  "Minyak Jelantah": 2.8,
  Organik: 0.8,
  Lainnya: 1.0,
};

// Nilai default konversi poin terhadap rupiah (dapat dikonfigurasi per transaksi / setting bisnis)
// 1.0 = Rp 1 menghasilkan 1 Poin GEOVERSE.
// Jika client menyepakati Rp 1.000 = 10 Poin, rate menjadi 0.01 (10 / 1000).
const RECYCLE_POINT_CONFIG = {
  pointToRupiahRate: 1.0, // Default 1 Poin = Rp 1 (Dapat dikonfigurasi tanpa hardcode)
  defaultPriceSource: "Pengepul Rekanan Kamojang",
  isPendingClientFinalRatioConfirmation: true,
  description:
    "Rasio konversi fleksibel: 1 Point = Rp 1 (acuan awal), menunggu persetujuan rasio final dari client.",
};

/**
 * Calculates distance between two coordinates in kilometers using Haversine
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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
}

/**
 * Calculates environmental impact metrics based on categories and weights
 */
function computeEnvironmentalImpact(items) {
  let totalCo2Kg = 0;
  let totalWeightKg = 0;

  for (const item of items || []) {
    const weight = Number(item.actualWeightKg || item.estimatedWeightKg || 0);
    const factor = CATEGORY_CO2_FACTORS[item.category] || 1.0;
    totalCo2Kg += weight * factor;
    totalWeightKg += weight;
  }

  // 1 tree absorbs ~25kg CO2 per year
  const treesEquivalent = Math.round((totalCo2Kg / 25) * 100) / 100;
  const landfillDivertedKg = Math.round(totalWeightKg * 10) / 10;
  const co2ReductionKg = Math.round(totalCo2Kg * 10) / 10;

  return {
    co2ReductionKg,
    treesEquivalent,
    landfillDivertedKg,
  };
}

/**
 * Calculates points and rupiah for an item based on configurable rate
 * @param {number} weightKg - Berat sampah dalam kg
 * @param {number} pricePerKg - Harga pengepul per kg
 * @param {number} pointToRupiahRate - Rasio konversi rupiah ke poin (default 1.0)
 */
function calculateCategoryPointAndRupiah(
  weightKg,
  pricePerKg,
  pointToRupiahRate = RECYCLE_POINT_CONFIG.pointToRupiahRate
) {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  const safePrice = Math.max(0, Number(pricePerKg) || 0);
  const rate = Math.max(0, Number(pointToRupiahRate) || 1.0);

  const totalRupiah = Math.round(safeWeight * safePrice);
  const totalPoint = Math.round(totalRupiah * rate);

  return {
    totalRupiah,
    totalPoint,
    rateApplied: rate,
  };
}

/**
 * Buat snapshot harga kategori untuk disimpan dalam transaksi deposit
 */
function createCategoryPriceSnapshot(categoryItem, collectorInfo = {}) {
  const price = Math.max(0, Number(categoryItem.pricePerKg) || 0);
  return {
    category: categoryItem.category,
    subCategory: categoryItem.subCategory || "Standard",
    pricePerKg: price,
    priceSource: categoryItem.priceSource || collectorInfo.priceSource || RECYCLE_POINT_CONFIG.defaultPriceSource,
    collectorName: categoryItem.collectorName || collectorInfo.collectorName || "Pengepul Terverifikasi Kamojang",
    priceVersion: categoryItem.priceVersion || collectorInfo.priceVersion || "v1.0",
    effectiveFrom: categoryItem.effectiveFrom || new Date(),
    effectiveUntil: categoryItem.effectiveUntil || null,
    approvedBy: categoryItem.approvedBy || collectorInfo.approvedBy || "Admin Bank Sampah",
    snapshotAt: new Date(),
  };
}

module.exports = {
  CATEGORY_CO2_FACTORS,
  RECYCLE_POINT_CONFIG,
  calculateDistanceKm,
  computeEnvironmentalImpact,
  calculateCategoryPointAndRupiah,
  createCategoryPriceSnapshot,
};
