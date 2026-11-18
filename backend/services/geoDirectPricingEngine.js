/**
 * geoDirectPricingEngine.js
 * Dynamic, configurable pricing engine for PGE Geo Direct Use equipment rentals.
 * Validates inputs, handles snapshot generation, and supports Dryhouse Tiered Occupancy
 * and DP Credit calculation.
 */

// Indicative Operational Cost (HPP) per kg
const INDICATIVE_DRYHOUSE_HPP_PER_KG = 377;
const DRYHOUSE_BASE_RATE_PER_KG = 1000;
const DRYHOUSE_TOTAL_CAPACITY_KG = 6000;
const DRYHOUSE_MIN_VOLUME_KG = 100;
const DRYHOUSE_DEFAULT_VOLUME_KG = 500;

function getDryhouseTierInfo(occupancyPercent) {
  const occ = Math.max(0, Math.min(100, Number(occupancyPercent) || 0));
  if (occ <= 30) {
    return {
      tierKey: "TIER_0_30",
      tierLabel: "0–30%",
      discountPercent: 50,
      ratePerKg: 500,
    };
  } else if (occ <= 60) {
    return {
      tierKey: "TIER_30_60",
      tierLabel: "Di atas 30% sampai 60%",
      discountPercent: 30,
      ratePerKg: 700,
    };
  } else if (occ <= 80) {
    return {
      tierKey: "TIER_60_80",
      tierLabel: "Di atas 60% sampai 80%",
      discountPercent: 10,
      ratePerKg: 900,
    };
  } else {
    return {
      tierKey: "TIER_80_PLUS",
      tierLabel: "Di atas 80%",
      discountPercent: 0,
      ratePerKg: 1000,
    };
  }
}

function calculateDryhouseTieredPrice(options = {}) {
  const rawVol = options.volumeKg !== undefined ? options.volumeKg : options.rawMaterialKg;
  const volumeKg = Math.max(
    DRYHOUSE_MIN_VOLUME_KG,
    Math.min(DRYHOUSE_TOTAL_CAPACITY_KG, Number(rawVol) || DRYHOUSE_DEFAULT_VOLUME_KG)
  );
  const dpPercentage = Math.min(100, Math.max(0, Number(options.dpPercentage) || 30));
  const customerDpBalance = Math.max(0, Number(options.customerDpBalance) || 0);

  let tierInfo;
  if (options.occupancyTier) {
    switch (String(options.occupancyTier).toUpperCase()) {
      case "TIER_0_30":
      case "0-30":
      case "0-30%":
      case "0–30%":
        tierInfo = { tierKey: "TIER_0_30", tierLabel: "0–30%", discountPercent: 50, ratePerKg: 500 };
        break;
      case "TIER_30_60":
      case "30-60":
      case "30-60%":
      case "30–60%":
        tierInfo = { tierKey: "TIER_30_60", tierLabel: "Di atas 30% sampai 60%", discountPercent: 30, ratePerKg: 700 };
        break;
      case "TIER_60_80":
      case "60-80":
      case "60-80%":
      case "60–80%":
        tierInfo = { tierKey: "TIER_60_80", tierLabel: "Di atas 60% sampai 80%", discountPercent: 10, ratePerKg: 900 };
        break;
      default:
        tierInfo = { tierKey: "TIER_80_PLUS", tierLabel: "Di atas 80%", discountPercent: 0, ratePerKg: 1000 };
        break;
    }
  } else {
    const occ = Number(options.occupancyPercent !== undefined ? options.occupancyPercent : 25);
    tierInfo = getDryhouseTierInfo(occ);
  }

  const effectiveRatePerKg = Math.round(DRYHOUSE_BASE_RATE_PER_KG * (1 - tierInfo.discountPercent / 100));
  const totalRentalCost = volumeKg * effectiveRatePerKg;
  const operationalCost = volumeKg * INDICATIVE_DRYHOUSE_HPP_PER_KG;
  const estimatedSurplus = totalRentalCost - operationalCost;

  const requiredDpAmount = Math.round((totalRentalCost * dpPercentage) / 100);
  const dpCreditApplied = Math.min(customerDpBalance, requiredDpAmount);
  const netDpDue = Math.max(0, requiredDpAmount - dpCreditApplied);
  const remainingBalance = Math.max(0, totalRentalCost - requiredDpAmount);

  return {
    isConfigured: true,
    formulaApplied: "DRYHOUSE_TIERED",
    basePrice: DRYHOUSE_BASE_RATE_PER_KG,
    pricingUnit: "per_kg",
    durationDays: Math.max(1, parseInt(options.durationDays, 10) || 3),
    volumeKg,
    rawMaterialKg: volumeKg,
    occupancyPercent: options.occupancyPercent !== undefined ? Number(options.occupancyPercent) : 25,
    occupancyTier: tierInfo.tierKey,
    occupancyTierLabel: tierInfo.tierLabel,
    discountPercent: tierInfo.discountPercent,
    ratePerKg: effectiveRatePerKg,
    effectiveRatePerKg,
    subtotalBase: totalRentalCost,
    productionAddonRate: 0,
    productionAddonTotal: 0,
    totalRentalCost,
    totalUserPayment: totalRentalCost,
    operationalCost,
    estimatedOperationalCost: operationalCost,
    hppPerKg: INDICATIVE_DRYHOUSE_HPP_PER_KG,
    estimatedSurplus,
    disclaimer:
      "Simulasi menggunakan HPP indikatif Rp377/kg. Surplus bukan laba bersih dan belum memperhitungkan pajak serta biaya lain yang belum teridentifikasi.",
    dpPercentage,
    requiredDpAmount,
    customerDpBalance,
    dpCreditApplied,
    netDpDue,
    remainingBalance,
  };
}

function calculateRentalCost(equipment = {}, options = {}) {
  // If formula is DRYHOUSE_TIERED or options request dryhouse tiered pricing
  if (
    equipment.pricingFormulaType === "DRYHOUSE_TIERED" ||
    options.formulaType === "DRYHOUSE_TIERED" ||
    options.isDryhouse === true
  ) {
    return calculateDryhouseTieredPrice({
      ...options,
      dpPercentage: equipment.dpPercentage || options.dpPercentage || 30,
    });
  }

  const durationDays = Math.max(1, parseInt(options.durationDays, 10) || 1);
  const basePrice = Math.max(0, Number(equipment.basePrice) || 0);
  const dpPercentage = Math.min(100, Math.max(0, Number(equipment.dpPercentage) || 30));
  const productionNeeds = options.productionNeeds || {};
  const customerDpBalance = Math.max(0, Number(options.customerDpBalance) || 0);

  // 1. Base cost calculation
  const subtotalBase = basePrice * durationDays;

  // 2. Production parameter add-on calculation
  let productionAddonRate = 0;
  let productionAddonTotal = 0;

  if (Array.isArray(equipment.productionParameters)) {
    for (const param of equipment.productionParameters) {
      if (param.ratePerUnit && param.ratePerUnit > 0) {
        const val = Number(
          productionNeeds[param.paramKey] ||
            productionNeeds.rawMaterialKg ||
            productionNeeds.rawMaterialTons ||
            0
        );
        if (!isNaN(val) && val > 0) {
          productionAddonRate += param.ratePerUnit;
          productionAddonTotal += val * param.ratePerUnit;
        }
      }
    }
  }

  // Fallback if equipment has formula type DAILY_PLUS_CAPACITY with direct capacity fee
  if (
    equipment.pricingFormulaType === "DAILY_PLUS_CAPACITY" &&
    (productionNeeds.rawMaterialKg || productionNeeds.rawMaterialTons) &&
    productionAddonTotal === 0
  ) {
    const qty = Number(productionNeeds.rawMaterialKg || productionNeeds.rawMaterialTons) || 0;
    const capacityRate = Number(equipment.capacityRate) || 0;
    productionAddonRate = capacityRate;
    productionAddonTotal = qty * capacityRate;
  }

  // 3. Total calculation
  const totalRentalCost = subtotalBase + productionAddonTotal;

  // 4. Down Payment calculation
  const requiredDpAmount = Math.round((totalRentalCost * dpPercentage) / 100);

  // 5. Credit from existing DP Balance (if resubmitted)
  const dpCreditApplied = Math.min(customerDpBalance, requiredDpAmount);
  const netDpDue = Math.max(0, requiredDpAmount - dpCreditApplied);

  // 6. Remaining balance (Pelunasan)
  const remainingBalance = Math.max(0, totalRentalCost - requiredDpAmount);

  return {
    isConfigured: basePrice > 0,
    basePrice,
    pricingUnit: equipment.pricingUnit || "per_hari",
    durationDays,
    subtotalBase,
    productionAddonRate,
    productionAddonTotal,
    totalRentalCost,
    dpPercentage,
    requiredDpAmount,
    customerDpBalance,
    dpCreditApplied,
    netDpDue,
    remainingBalance,
    formulaApplied: equipment.pricingFormulaType || "STANDARD_DAILY",
  };
}

module.exports = {
  INDICATIVE_DRYHOUSE_HPP_PER_KG,
  DRYHOUSE_BASE_RATE_PER_KG,
  DRYHOUSE_TOTAL_CAPACITY_KG,
  DRYHOUSE_MIN_VOLUME_KG,
  DRYHOUSE_DEFAULT_VOLUME_KG,
  getDryhouseTierInfo,
  calculateDryhouseTieredPrice,
  calculateRentalCost,
};

