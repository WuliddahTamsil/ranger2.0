/**
 * geoDirectPricingEngine.js
 * Dynamic, configurable pricing engine for PGE Geo Direct Use equipment rentals.
 * Validates inputs, handles snapshot generation, and supports DP Credit calculation.
 */

function calculateRentalCost(equipment, options = {}) {
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
        const val = Number(productionNeeds[param.paramKey] || productionNeeds.rawMaterialTons || 0);
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
    productionNeeds.rawMaterialTons &&
    productionAddonTotal === 0
  ) {
    const tons = Number(productionNeeds.rawMaterialTons) || 0;
    // Only if rate is explicitly configured on the equipment
    const capacityRate = Number(equipment.capacityRate) || 0;
    productionAddonRate = capacityRate;
    productionAddonTotal = tons * capacityRate;
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
  calculateRentalCost,
};

