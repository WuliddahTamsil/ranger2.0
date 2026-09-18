const assert = require("assert");
const {
  calculateCategoryPointAndRupiah,
  computeEnvironmentalImpact,
  calculateDistanceKm,
} = require("../services/recycleFareService");

async function runRecycleUnitTests() {
  console.log("==================================================");
  console.log("🚀 RUNNING KANYAAH RECYCLE UNIT TESTS");
  console.log("==================================================");

  // 1. Point Formula: 1 Point = Rp 1
  const botolPlastik = calculateCategoryPointAndRupiah(2.5, 4000);
  assert.strictEqual(botolPlastik.totalRupiah, 10000, "2.5kg @ 4000 must equal Rp 10.000");
  assert.strictEqual(botolPlastik.totalPoint, 10000, "1 Point = Rp 1 -> 10.000 Points");
  console.log("✔ Test 1 Passed: 1 Point = Rp 1 exact formula verified (2.5kg @ Rp4.000 = 10.000 Pts)");

  // 2. High Value Item Point Formula
  const tembaga = calculateCategoryPointAndRupiah(1.8, 45000);
  assert.strictEqual(tembaga.totalRupiah, 81000, "1.8kg @ 45000 = Rp 81.000");
  assert.strictEqual(tembaga.totalPoint, 81000, "Must yield 81.000 Points");
  console.log("✔ Test 2 Passed: High-value metals point conversion verified (1.8kg @ Rp45.000 = 81.000 Pts)");

  // 3. Negative & Zero Weight Safety
  const zeroWeight = calculateCategoryPointAndRupiah(-5, 3000);
  assert.strictEqual(zeroWeight.totalRupiah, 0, "Negative weights must clamp to 0");
  assert.strictEqual(zeroWeight.totalPoint, 0, "Negative weights must yield 0 points");
  console.log("✔ Test 3 Passed: Non-negative weight clamping enforced");

  // 4. Environmental Impact Metrics
  const sampleItems = [
    { category: "Plastik", actualWeightKg: 4.0 }, // 4 * 1.5 = 6.0 kg CO2
    { category: "Kertas & Kardus", actualWeightKg: 10.0 }, // 10 * 1.1 = 11.0 kg CO2
    { category: "Minyak Jelantah", actualWeightKg: 2.0 }, // 2 * 2.8 = 5.6 kg CO2
  ];
  const impact = computeEnvironmentalImpact(sampleItems);
  // Total CO2 = 6.0 + 11.0 + 5.6 = 22.6 kg
  assert.strictEqual(impact.co2ReductionKg, 22.6, "CO2 reduction calculation must equal 22.6 kg");
  assert.strictEqual(impact.landfillDivertedKg, 16.0, "Landfill diverted must equal total weight 16 kg");
  assert(impact.treesEquivalent > 0.8, "Trees equivalent must be calculated (> 0.8 trees)");
  console.log(`✔ Test 4 Passed: Environmental metrics verified (CO2: ${impact.co2ReductionKg}kg, Trees: ${impact.treesEquivalent})`);

  // 5. Haversine Distance Calculation
  // Coordinates in Bandung: Dago (-6.8850, 107.6140) to Merdeka (-6.9120, 107.6105) ~3.0 km
  const dist = calculateDistanceKm(-6.8850, 107.6140, -6.9120, 107.6105);
  assert(dist >= 2.8 && dist <= 3.3, `Distance should be ~3.0 km, got: ${dist} km`);
  console.log(`✔ Test 5 Passed: Distance calculation verified (${dist} km)`);

  console.log("==================================================");
  console.log("🎉 ALL KANYAAH RECYCLE UNIT TESTS PASSED!");
  console.log("==================================================");
}

runRecycleUnitTests().catch((e) => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});
