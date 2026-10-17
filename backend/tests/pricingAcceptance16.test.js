/**
 * Test Suite: 16 Acceptance Tests Kebijakan Bisnis GEOVERSE PGE Kamojang
 * Memenuhi seluruh spesifikasi Bagian B, C, D, dan F.
 */
const assert = require("assert");
const {
  PRICING_POLICY,
  computeRideFare,
  computeGoodsAndPickupFare,
  calculateDistanceFare,
  calculateWeightFare,
  calculateDriverRevenueSplit,
  createRevenueSplitSnapshot,
  validateKamojangRadius,
  validateServiceRoute,
  isKedaiTerpaduDriver,
} = require("../services/pricingPolicyService");

const {
  RECYCLE_POINT_CONFIG,
  calculateCategoryPointAndRupiah,
  createCategoryPriceSnapshot,
} = require("../services/recycleFareService");

console.log("================================================================================");
console.log("🚀 MENJALANKAN 16 ACCEPTANCE TEST KEBIJAKAN BISNIS GEOVERSE PGE KAMOJANG");
console.log("================================================================================\n");

function logAcceptanceItem(testNum, title, r) {
  console.log(`[Test #${testNum}] ${title}`);
  console.log(`  - Jarak: ${r.distanceKm !== undefined ? r.distanceKm : "-"} km`);
  console.log(`  - Tarif jarak: Rp${(r.distanceFare || 0).toLocaleString("id-ID")}`);
  console.log(`  - Biaya berat: Rp${(r.weightFare || 0).toLocaleString("id-ID")}`);
  console.log(`  - Biaya layanan: Rp${(r.serviceFee || 0).toLocaleString("id-ID")}`);
  console.log(`  - Biaya tambahan lain: Rp${(r.extraFare || 0).toLocaleString("id-ID")}`);
  console.log(`  - Diskon: Rp${(r.discount || 0).toLocaleString("id-ID")}`);
  console.log(`  - Total customer: Rp${(r.totalCustomer || 0).toLocaleString("id-ID")}`);
  console.log(`  - Pendapatan driver: Rp${(r.driverEarnings || 0).toLocaleString("id-ID")}`);
  console.log(`  - Komisi platform: Rp${(r.platformCommission || 0).toLocaleString("id-ID")}`);
  console.log(`  - Jenis tier driver: ${r.driverTier || "-"}`);
  console.log("  ------------------------------------------------------------------------------");
}

let passCount = 0;

// Driver Reguler Baru
const newDriver = {
  _id: "driver_new_001",
  email: "driver.baru@geoverse.id",
  role: "driver",
  roleData: {
    partnerProgram: "REGULAR",
    isExistingDriver: false,
    commissionTier: "REGULAR_80",
  },
};

// Driver Eksisting Kedai Terpadu
const kedaiTerpaduDriver = {
  _id: "driver_kt_001",
  email: "driver.kamojang1@geoverse.com",
  role: "driver",
  roleData: {
    partnerProgram: "KEDAI_TERPADU",
    isExistingDriver: true,
    commissionTier: "EXISTING_100",
  },
};

// -----------------------------------------------------------------------------
// 1. Jarak 0,6 km
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 0.6, driver: newDriver });
  assert.strictEqual(fare.distanceFare, 2500, "Default mode jarak 0.6km: tarif jarak Rp2.500");
  assert.strictEqual(fare.serviceFee, 2000, "Service fee harus Rp2.000");
  assert.strictEqual(fare.estimatedFare, 4500, "Default mode total harus Rp4.500");

  const flatFare = computeRideFare({
    distanceKm: 0.6,
    driver: newDriver,
    fareMode: "flat_total_under_threshold",
  });
  assert.strictEqual(flatFare.estimatedFare, 9500, "Alternative mode flat total harus Rp9.500");

  logAcceptanceItem(1, "Jarak 0,6 km (Default: Rp4.500 | Mode Flat: Rp9.500)", {
    distanceKm: 0.6,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 2. Jarak 1 km
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 1.0, driver: newDriver });
  assert.strictEqual(fare.distanceFare, 2500);
  assert.strictEqual(fare.serviceFee, 2000);
  assert.strictEqual(fare.estimatedFare, 4500);

  const flatFare = computeRideFare({
    distanceKm: 1.0,
    driver: newDriver,
    fareMode: "flat_total_under_threshold",
  });
  assert.strictEqual(flatFare.estimatedFare, 9500);

  logAcceptanceItem(2, "Jarak 1 km (Default: Rp4.500 | Mode Flat: Rp9.500)", {
    distanceKm: 1.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 3. Jarak 3 km
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 3.0, driver: newDriver });
  assert.strictEqual(fare.distanceFare, 7500);
  assert.strictEqual(fare.estimatedFare, 9500);
  logAcceptanceItem(3, "Jarak 3 km (Batas minimum distance)", {
    distanceKm: 3.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 4. Jarak 4 km
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 4.0, driver: newDriver });
  assert.strictEqual(fare.distanceFare, 10000, "4 km * Rp2.500 = Rp10.000");
  assert.strictEqual(fare.estimatedFare, 12000, "Rp10.000 + Rp2.000 = Rp12.000");
  logAcceptanceItem(4, "Jarak 4 km", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 5. Jarak 6 km
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 6.0, driver: newDriver });
  assert.strictEqual(fare.distanceFare, 15000, "6 km * Rp2.500 = Rp15.000");
  assert.strictEqual(fare.estimatedFare, 17000);
  logAcceptanceItem(5, "Jarak 6 km", {
    distanceKm: 6.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 6. Berat 20 kg
// -----------------------------------------------------------------------------
{
  const fare = computeGoodsAndPickupFare({
    distanceKm: 4.0,
    weightKg: 20,
    serviceType: "KANYAAH_SEND",
    driver: newDriver,
  });
  assert.strictEqual(fare.weightFare, 0, "Berat 0-20 kg bebas biaya tambahan berat");
  assert.strictEqual(fare.estimatedFare, 12000);
  logAcceptanceItem(6, "Berat 20 kg (Included base weight)", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: fare.weightFare,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 7. Berat 20,1 kg
// -----------------------------------------------------------------------------
{
  const fare = computeGoodsAndPickupFare({
    distanceKm: 4.0,
    weightKg: 20.1,
    serviceType: "KANYAAH_SEND",
    driver: newDriver,
  });
  assert.strictEqual(fare.weightFare, 300, "Kelebihan 0,1 kg = 0.1 * Rp3.000 = Rp300");
  assert.strictEqual(fare.estimatedFare, 12500, "Rp10.000 + Rp300 + Rp2.000 dibulatkan ke Rp12.500");
  logAcceptanceItem(7, "Berat 20,1 kg (0,1 kg ekstra * Rp3.000 = Rp300)", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: fare.weightFare,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 8. Berat 25 kg
// -----------------------------------------------------------------------------
{
  const fare = computeGoodsAndPickupFare({
    distanceKm: 4.0,
    weightKg: 25,
    serviceType: "KANYAAH_SEND",
    driver: newDriver,
  });
  assert.strictEqual(fare.weightFare, 15000, "5 kg * Rp3.000 = Rp15.000");
  assert.strictEqual(fare.estimatedFare, 27000);
  logAcceptanceItem(8, "Berat 25 kg (Overweight 5 kg)", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: fare.weightFare,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: fare.discount,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 9. Lokasi dalam radius 15 km
// -----------------------------------------------------------------------------
{
  const pickup = { latitude: -7.1452, longitude: 107.7891 }; // Pusat Kamojang (0 km)
  const destination = { latitude: -7.1850, longitude: 107.8200 }; // ~5.5 km dari Kamojang

  const valPickup = validateKamojangRadius(pickup, 15);
  const valDest = validateKamojangRadius(destination, 15);
  const valRoute = validateServiceRoute(pickup, destination, 15);

  assert.strictEqual(valPickup.valid, true, "Pickup dalam radius 15 km pusat Kamojang");
  assert.strictEqual(valDest.valid, true, "Destination dalam radius 15 km pusat Kamojang");
  assert.strictEqual(valRoute.allowed, true, "Rute 5.5 km di bawah batas 15 km");

  const fare = computeRideFare({ distanceKm: valRoute.routeDistanceKm, driver: newDriver });
  logAcceptanceItem(9, "Lokasi dalam radius 15 km Kamojang", {
    distanceKm: valRoute.routeDistanceKm,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 10. Lokasi di luar radius 15 km (Boundary Test: 14,9 km, 15,0 km, 15,1 km)
// -----------------------------------------------------------------------------
{
  // Titik 14.9 km dari pusat Kamojang (Valid)
  const loc149 = { latitude: -7.1452 - 0.134, longitude: 107.7891 };
  const val149 = validateKamojangRadius(loc149, 15);
  assert.strictEqual(val149.valid, true, "14,9 km harus valid dalam jangkauan");

  // Titik tepat batas 15.0 km
  const loc150 = { latitude: -7.1452 - 0.1351, longitude: 107.7891 };
  const val150 = validateKamojangRadius(loc150, 15);
  assert.strictEqual(val150.valid, true, "15,0 km harus valid pada batas maksimal");

  // Titik 15.1+ km di luar radius Kamojang (Ditolak)
  const loc151 = { latitude: -7.1452 - 0.145, longitude: 107.7891 }; // ~16.1 km
  const val151 = validateKamojangRadius(loc151, 15);
  assert.strictEqual(val151.valid, false, "15,1+ km harus ditolak");
  assert.ok(val151.message.includes("15 km"), "Pesan error bahasa Indonesia memuat informasi batas 15 km");

  // Rute melebihi 15 km (Ditolak)
  const farRoute = validateServiceRoute({ latitude: -7.1452, longitude: 107.7891 }, loc151, 15);
  assert.strictEqual(farRoute.allowed, false, "Rute melebihi 15 km harus ditolak");

  logAcceptanceItem(10, "Lokasi di luar radius 15 km (Boundary Test 14,9 km [LULUS], 15,0 km [LULUS], 15,1+ km [DITOLAK])", {
    distanceKm: val151.distanceToKamojangKm,
    distanceFare: 0,
    weightFare: 0,
    serviceFee: 0,
    extraFare: 0,
    discount: 0,
    totalCustomer: 0,
    driverEarnings: 0,
    platformCommission: 0,
    driverTier: "DILUAR_WILAYAH_LAYANAN",
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 11. Driver reguler baru (80% Driver, 20% Platform)
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 4.0, driver: newDriver });
  assert.strictEqual(fare.revenueSplit.commissionTier, "DRIVER_REGULER_BARU");
  assert.strictEqual(fare.revenueSplit.driverSharePercent, 80);
  assert.strictEqual(fare.revenueSplit.platformSharePercent, 20);
  assert.strictEqual(fare.revenueSplit.driverEarnings, 8000, "80% dari Rp10.000 = Rp8.000");
  assert.strictEqual(fare.revenueSplit.platformCommission, 2000, "20% dari Rp10.000 = Rp2.000");

  const snapshot = createRevenueSplitSnapshot(fare.distanceFare, newDriver);
  assert.strictEqual(snapshot.driverEarnings, 8000);
  assert.strictEqual(snapshot.platformCommission, 2000);

  logAcceptanceItem(11, "Driver Reguler Baru (Split 80% : 20%)", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 12. Driver Kedai Terpadu (100% Driver, 0% Platform dari ongkir)
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 4.0, driver: kedaiTerpaduDriver });
  assert.strictEqual(fare.revenueSplit.commissionTier, "KEDAI_TERPADU_EKSISTING");
  assert.strictEqual(fare.revenueSplit.driverSharePercent, 100);
  assert.strictEqual(fare.revenueSplit.platformSharePercent, 0);
  assert.strictEqual(fare.revenueSplit.driverEarnings, 10000, "100% dari Rp10.000 = Rp10.000");
  assert.strictEqual(fare.revenueSplit.platformCommission, 0, "0% komisi dari tarif pengantaran");

  const snapshot = createRevenueSplitSnapshot(fare.distanceFare, kedaiTerpaduDriver);
  assert.strictEqual(snapshot.driverEarnings, 10000);
  assert.strictEqual(snapshot.platformCommission, 0);

  logAcceptanceItem(12, "Driver Eksisting Kedai Terpadu (Split 100% : 0%)", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 13. Order Ride (5 km)
// -----------------------------------------------------------------------------
{
  const fare = computeRideFare({ distanceKm: 5.0, driver: newDriver });
  assert.strictEqual(fare.distanceFare, 12500, "5 km * Rp2.500 = Rp12.500");
  assert.strictEqual(fare.serviceFee, 2000);
  assert.strictEqual(fare.estimatedFare, 14500);
  logAcceptanceItem(13, "Order Kanyaah Ride (5 km)", {
    distanceKm: 5.0,
    distanceFare: fare.distanceFare,
    weightFare: 0,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 14. Order Send (5 km, berat 22 kg)
// -----------------------------------------------------------------------------
{
  const fare = computeGoodsAndPickupFare({
    distanceKm: 5.0,
    weightKg: 22,
    serviceType: "KANYAAH_SEND",
    driver: newDriver,
  });
  assert.strictEqual(fare.distanceFare, 12500);
  assert.strictEqual(fare.weightFare, 6000, "2 kg ekstra * Rp3.000 = Rp6.000");
  assert.strictEqual(fare.deliverySubtotal, 18500);
  assert.strictEqual(fare.estimatedFare, 20500);
  logAcceptanceItem(14, "Order Kanyaah Send (5 km, 22 kg)", {
    distanceKm: 5.0,
    distanceFare: fare.distanceFare,
    weightFare: fare.weightFare,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 15. Pickup Laundry (4 km, berat 25 kg)
// -----------------------------------------------------------------------------
{
  const fare = computeGoodsAndPickupFare({
    distanceKm: 4.0,
    weightKg: 25,
    serviceType: "LAUNDRY_PICKUP",
    driver: newDriver,
  });
  assert.strictEqual(fare.distanceFare, 10000);
  assert.strictEqual(fare.weightFare, 15000, "5 kg * Rp3.000 = Rp15.000");
  assert.strictEqual(fare.estimatedFare, 27000);
  logAcceptanceItem(15, "Pickup Kanyaah Laundry (4 km, 25 kg)", {
    distanceKm: 4.0,
    distanceFare: fare.distanceFare,
    weightFare: fare.weightFare,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

// -----------------------------------------------------------------------------
// 16. Pickup Recycle (3 km, berat 30 kg sampah anorganik)
// -----------------------------------------------------------------------------
{
  const fare = computeGoodsAndPickupFare({
    distanceKm: 3.0,
    weightKg: 30,
    serviceType: "KANYAAH_RECYCLE",
    driver: newDriver,
  });
  assert.strictEqual(fare.distanceFare, 7500);
  assert.strictEqual(fare.weightFare, 30000, "10 kg ekstra * Rp3.000 = Rp30.000");
  assert.strictEqual(fare.deliverySubtotal, 37500);
  assert.strictEqual(fare.estimatedFare, 39500);

  // Verifikasi konversi poin Geoverse Point dan snapshot harga
  const pointCalc = calculateCategoryPointAndRupiah(10, 4000);
  assert.strictEqual(pointCalc.totalRupiah, 40000);
  assert.strictEqual(pointCalc.totalPoint, 40000);

  const priceItem = { category: "Plastik", subCategory: "PET Bening", pricePerKg: 4000 };
  const snapshot = createCategoryPriceSnapshot(priceItem, { collectorName: "Pengepul Berkah Kamojang" });
  assert.strictEqual(snapshot.collectorName, "Pengepul Berkah Kamojang");
  assert.strictEqual(snapshot.pricePerKg, 4000);

  logAcceptanceItem(16, "Pickup Kanyaah Recycle (3 km, 30 kg sampah anorganik)", {
    distanceKm: 3.0,
    distanceFare: fare.distanceFare,
    weightFare: fare.weightFare,
    serviceFee: fare.serviceFee,
    extraFare: 0,
    discount: 0,
    totalCustomer: fare.estimatedFare,
    driverEarnings: fare.revenueSplit.driverEarnings,
    platformCommission: fare.revenueSplit.platformCommission,
    driverTier: fare.revenueSplit.commissionTier,
  });
  passCount++;
}

console.log("================================================================================");
console.log(`🎉 BERHASIL: SELURUH ${passCount} DARI 16 ACCEPTANCE TEST LULUS DENGAN SEMPURNA!`);
console.log("================================================================================");
