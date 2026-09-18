/**
 * recycleFareService.js
 * Business logic for GEOVERSE: Kanyaah Recycle
 * - Accurate point & rupiah calculations (1 Point = Rp 1)
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

/**
 * Calculates distance between two coordinates in kilometers using Haversine
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
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

  for (const item of items) {
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
 * Calculates points and rupiah for an item:
 * 1 Point = Rp 1
 */
function calculateCategoryPointAndRupiah(weightKg, pricePerKg) {
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  const safePrice = Math.max(0, Number(pricePerKg) || 0);
  const totalRupiah = Math.round(safeWeight * safePrice);
  const totalPoint = totalRupiah; // 1 Point = Rp 1
  return {
    totalRupiah,
    totalPoint,
  };
}

module.exports = {
  CATEGORY_CO2_FACTORS,
  calculateDistanceKm,
  computeEnvironmentalImpact,
  calculateCategoryPointAndRupiah,
};
