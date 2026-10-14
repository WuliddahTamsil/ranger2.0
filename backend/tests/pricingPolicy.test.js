const assert = require("assert");
const {
  KAMOJANG_COORDINATES,
  MAX_SERVICE_RADIUS_KM,
  PRICING_POLICY,
  calculateDistanceFare,
  calculateWeightFare,
  validateKamojangRadius,
  validateServiceRoute,
  calculateDriverRevenueSplit,
  computeRideFare,
  computeGoodsAndPickupFare,
} = require("../services/pricingPolicyService");

async function runPricingPolicyTests() {
  console.log("==================================================");
  console.log("🧪 TESTING GEOVERSE DRIVER & SERVICE PRICING POLICY");
  console.log("==================================================");

  // 1. Antar Penumpang & Paket: Jarak <= 1 km (seperti 0.6 km) = Rp 2.500
  const subKmFare = calculateDistanceFare(0.6);
  assert.strictEqual(subKmFare, 2500, "Distance 0.6 km must be base distance fare Rp 2.500");

  const oneKmFare = calculateDistanceFare(1.0);
  assert.strictEqual(oneKmFare, 2500, "Distance 1.0 km must be base distance fare Rp 2.500");

  const twoKmFare = calculateDistanceFare(2.0);
  assert.strictEqual(twoKmFare, 5000, "Distance 2.0 km must be 2 * 2.500 = Rp 5.000");

  const edgeDistFare = calculateDistanceFare(4.0);
  assert.strictEqual(edgeDistFare, 10000, "Distance 4 km must be 4 * 2.500 = Rp 10.000");

  // 2. Di atas 4 km: Tarif dasar Rp 2.500/km
  // 6 km = 6 * 2500 = 15000
  const midDistFare = calculateDistanceFare(6.0);
  assert.strictEqual(midDistFare, 15000, "6 km fare must be 15.000");

  // 10 km = 10 * 2500 = 25000
  const longDistFare = calculateDistanceFare(10.0);
  assert.strictEqual(longDistFare, 25000, "10 km fare must be 25.000");
  console.log("✔ Test 1 Passed: Distance fare (<=1km Rp 2.500, per km Rp 2.500) verified");

  // 3. Tambahan Kiloan (Paket, Laundry, Sampah)
  // 0 - 20 kg: Rp 0 (Disamakan biaya penjemputan dasar)
  assert.strictEqual(calculateWeightFare(5), 0, "5 kg must have 0 extra weight fare");
  assert.strictEqual(calculateWeightFare(20), 0, "20 kg must have 0 extra weight fare");

  // > 20 kg: Rp 3.000 / kg
  // 22 kg: extra 2 kg * 3000 = 6000
  assert.strictEqual(calculateWeightFare(22), 6000, "22 kg must have 6.000 extra fare");
  // 30 kg: extra 10 kg * 3000 = 30000
  assert.strictEqual(calculateWeightFare(30), 30000, "30 kg must have 30.000 extra fare");
  console.log("✔ Test 2 Passed: Weight fare (0-20kg Rp 0, >20kg Rp 3.000/kg) verified");

  // 4. Ride Fare Breakdown (dengan Biaya Layanan Rp 2.000)
  // Perjalanan 0.6 km: tarif jarak Rp 2.500 + biaya layanan Rp 2.000 = Rp 4.500
  const ride06km = computeRideFare({ distanceKm: 0.6 });
  assert.strictEqual(ride06km.distanceFare, 2500);
  assert.strictEqual(ride06km.serviceFee, 2000);
  assert.strictEqual(ride06km.estimatedFare, 4500, "Total 0.6km ride = 2.500 + 2.000 = 4.500");

  const ride3km = computeRideFare({ distanceKm: 3 });
  assert.strictEqual(ride3km.distanceFare, 7500);
  assert.strictEqual(ride3km.serviceFee, 2000);
  assert.strictEqual(ride3km.estimatedFare, 9500, "Total 3km ride = 7.500 + 2.000 = 9.500");

  const ride7km = computeRideFare({ distanceKm: 7 });
  // 7 km: 7 * 2500 = 17500 + 2000 = 19500
  assert.strictEqual(ride7km.distanceFare, 17500);
  assert.strictEqual(ride7km.serviceFee, 2000);
  assert.strictEqual(ride7km.estimatedFare, 19500);
  console.log("✔ Test 3 Passed: Ride fare computation with Rp 2.000 service fee verified");

  // 5. Radius Batas Maksimal Layanan Kamojang (Maksimal 15 km)
  // Kamojang center: -7.1452, 107.7891
  // Point within 8 km (Samarang area): valid
  const withinKamojang = validateKamojangRadius({ latitude: -7.1852, longitude: 107.8191 }, 15);
  assert.strictEqual(withinKamojang.valid, true, "Location within 15 km of Kamojang must be valid");

  // Point far away (> 40 km, e.g. Bandung center): invalid
  const outsideKamojang = validateKamojangRadius({ latitude: -6.9175, longitude: 107.6191 }, 15);
  assert.strictEqual(outsideKamojang.valid, false, "Location beyond 15 km must be rejected");
  console.log("✔ Test 4 Passed: 15 km Kamojang service radius validation verified");

  // 6. Kebijakan Bagi Hasil / Komisi Driver
  // Driver Baru: 80% Driver, 20% Platform
  const newDriverSplit = calculateDriverRevenueSplit(14500, { email: "newdriver@geoverse.com" });
  assert.strictEqual(newDriverSplit.isKedaiTerpadu, false);
  assert.strictEqual(newDriverSplit.driverSharePercent, 80);
  assert.strictEqual(newDriverSplit.platformSharePercent, 20);
  assert.strictEqual(newDriverSplit.driverEarnings, Math.round(14500 * 0.8)); // 11600
  assert.strictEqual(newDriverSplit.platformCommission, 14500 - 11600); // 2900

  // 5 Mitra Driver Eksisting Kedai Terpadu: 100% Driver, 0% Potongan Komisi
  const existingDriverSplit = calculateDriverRevenueSplit(14500, { email: "wuliddah@gmail.com" });
  assert.strictEqual(existingDriverSplit.isKedaiTerpadu, true);
  assert.strictEqual(existingDriverSplit.driverSharePercent, 100);
  assert.strictEqual(existingDriverSplit.platformSharePercent, 0);
  assert.strictEqual(existingDriverSplit.driverEarnings, 14500, "Existing driver must get 100% of delivery fare");
  assert.strictEqual(existingDriverSplit.platformCommission, 0);
  console.log("✔ Test 5 Passed: Driver revenue sharing (80:20 new driver vs 100:0 Kedai Terpadu) verified");

  console.log("==================================================");
  console.log("🎉 ALL PRICING POLICY SPECIFICATIONS VERIFIED!");
  console.log("==================================================");
}

runPricingPolicyTests().catch((err) => {
  console.error("❌ Pricing Policy test failed:", err);
  process.exit(1);
});
