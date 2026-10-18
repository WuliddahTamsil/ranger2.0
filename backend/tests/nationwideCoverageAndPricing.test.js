const assert = require("assert");
const {
  PRICING_POLICY,
  validateServiceCoverage,
  validateServiceRoute,
  computeRideFare,
  computeGoodsAndPickupFare,
} = require("../services/pricingPolicyService");

async function testNationwideCoverageAndPricing() {
  console.log("==================================================");
  console.log("🧪 TESTING GEOVERSE NATIONWIDE INDONESIA COVERAGE & PRICING");
  console.log("==================================================");

  // 1. Validasi Lokasi Bogor (seperti screenshot user: 124.6 km dari Kamojang)
  const bogorPickup = { latitude: -6.5976, longitude: 106.8062, address: "Jalan Sancang Dalam, Bogor Tengah" };
  const bogorDest = { latitude: -6.6015, longitude: 106.8090, address: "Gang I Jalan Lodaya, Bogor Tengah" };

  const bogorPickupCheck = validateServiceCoverage(bogorPickup);
  assert.strictEqual(bogorPickupCheck.valid, true, "Lokasi Bogor harus valid dalam cakupan seluruh Indonesia");
  assert.strictEqual(bogorPickupCheck.isWithinIndonesia, true);

  const bogorDestCheck = validateServiceCoverage(bogorDest);
  assert.strictEqual(bogorDestCheck.valid, true, "Tujuan Bogor harus valid dalam cakupan seluruh Indonesia");

  // Rute 0.6 km di Bogor
  const routeCheck = validateServiceRoute(bogorPickup, bogorDest, 50);
  assert.strictEqual(routeCheck.allowed, true, "Rute 0.6 km harus diizinkan");

  // Hitung tarif Kanyaah Ride untuk 0.6 km di Bogor
  const ride06 = computeRideFare({
    distanceKm: 0.6,
    durationMinutes: 2,
    fareMode: "flat_total_under_threshold",
  });

  assert.strictEqual(ride06.distanceFare, 7500, "Tarif jarak < 4 km = Rp 7.500");
  assert.strictEqual(ride06.serviceFee, 2000, "Biaya layanan platform = Rp 2.000");
  assert.strictEqual(ride06.estimatedFare, 9500, "Total tarif minimal (< 4 km) = Rp 9.500");
  console.log("✔ Skenario 1 LULUS: Pengguna di Bogor (0.6 km) berhasil dihitung tarif Rp 9.500 tanpa blokir Kamojang");

  // 2. Lokasi kota-kota lain di seluruh Indonesia
  const kotaIndonesia = [
    { nama: "Jakarta", lat: -6.2088, lon: 106.8456 },
    { nama: "Bandung", lat: -6.9175, lon: 107.6191 },
    { nama: "Surabaya", lat: -7.2575, lon: 112.7521 },
    { nama: "Medan", lat: 3.5952, lon: 98.6722 },
    { nama: "Makassar", lat: -5.1477, lon: 119.4327 },
    { nama: "Jayapura", lat: -2.5337, lon: 140.7181 },
    { nama: "Garut (Kamojang)", lat: -7.1452, lon: 107.7891 },
  ];

  for (const kota of kotaIndonesia) {
    const res = validateServiceCoverage({ latitude: kota.lat, longitude: kota.lon });
    assert.strictEqual(res.valid, true, `Kota ${kota.nama} harus valid dalam jangkauan nasional Indonesia`);
  }
  console.log("✔ Skenario 2 LULUS: Semua kota besar di Indonesia (Sabang s/d Merauke) terverifikasi valid");

  // 3. Lokasi luar negeri (harus ditolak karena di luar Indonesia)
  const luarNegeri = [
    { nama: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { nama: "London", lat: 51.5074, lon: -0.1278 },
  ];
  for (const luar of luarNegeri) {
    const res = validateServiceCoverage({ latitude: luar.lat, longitude: luar.lon });
    assert.strictEqual(res.valid, false, `Lokasi ${luar.nama} harus ditolak karena di luar Indonesia`);
  }
  console.log("✔ Skenario 3 LULUS: Koordinat luar negeri ditolak dengan pesan informatif");

  // 4. Skema Paket, Laundry, Sampah (beban kiloan)
  // 5 kg paket jarak 2 km -> Rp 9.500 (beban <= 20 kg gratis biaya tambahan beban)
  const paketRingan = computeGoodsAndPickupFare({
    serviceType: "KANYAAH_SEND",
    distanceKm: 2,
    weightKg: 5,
    fareMode: "flat_total_under_threshold",
  });
  assert.strictEqual(paketRingan.distanceFare, 7500);
  assert.strictEqual(paketRingan.weightFare, 0, "Berat 5 kg <= 20 kg biaya beban Rp 0");
  assert.strictEqual(paketRingan.serviceFee, 2000);
  assert.strictEqual(paketRingan.estimatedFare, 9500);

  // 25 kg paket jarak 6 km -> extra 5 kg * 3000 = 15.000 + 6km * 2500 = 15.000 + 2000 = 32.000
  const paketBerat = computeGoodsAndPickupFare({
    serviceType: "KANYAAH_SEND",
    distanceKm: 6,
    weightKg: 25,
    fareMode: "flat_total_under_threshold",
  });
  assert.strictEqual(paketBerat.distanceFare, 15000);
  assert.strictEqual(paketBerat.weightFare, 15000);
  assert.strictEqual(paketBerat.serviceFee, 2000);
  assert.strictEqual(paketBerat.estimatedFare, 32000);
  console.log("✔ Skenario 4 LULUS: Skema kiloan (0-20kg Rp0, >20kg Rp3.000/kg) terverifikasi");

  console.log("==================================================");
  console.log("🎉 SELURUH PENGUJIAN JANGKAUAN NASIONAL & TARIF BERHASIL 100%!");
  console.log("==================================================");
}

testNationwideCoverageAndPricing().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
