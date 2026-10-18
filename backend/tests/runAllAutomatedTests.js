/**
 * MASTER AUTOMATED TEST SUITE RUNNER
 * GEOVERSE PGE KAMOJANG
 * 
 * Menjalankan seluruh test suite otomatis:
 * 1. 16 Acceptance Tests Kebijakan Bisnis Client
 * 2. Unit Test Pricing Engine & Radius 15 km Kamojang
 * 3. Unit Test Kanyaah Recycle & Geoverse Point
 * 4. Lifecycle Test Kanyaah Send & State Machine
 * 5. Lifecycle Test Kanyaah Ride
 * 6. Atomic Ledger & Double-Credit Protection Geoverse Point
 * 7. E2E Automated Business Workflow Test
 */
const { execSync } = require("child_process");
const path = require("path");

const testSuites = [
  {
    name: "16 Acceptance Tests Kebijakan Bisnis Client",
    file: "backend/tests/pricingAcceptance16.test.js",
  },
  {
    name: "Pricing Policy Engine & Kamojang Radius Validation",
    file: "backend/tests/pricingPolicy.test.js",
  },
  {
    name: "Kanyaah Recycle & Environmental Formula",
    file: "backend/tests/recycleUnit.test.js",
  },
  {
    name: "Kanyaah Send Lifecycle, Security PIN & Overweight Fare",
    file: "backend/tests/sendOrderLifecycle.test.js",
  },
  {
    name: "Kanyaah Ride Fare Engine & State Machine",
    file: "backend/tests/rideLifecycle.test.js",
  },
  {
    name: "Geoverse Point Atomic Ledger & Idempotency",
    file: "backend/tests/geoversePointUnit.test.js",
  },
  {
    name: "24 Skenario Integrasi & Akseptansi Geoverse Point",
    file: "backend/tests/geoversePointIntegration24.test.js",
  },
  {
    name: "E2E Automated Business Workflow (Ride, Send, Driver, Recycle, Info Hub)",
    file: "backend/tests/automatedBusinessWorkflow.test.js",
  },
  {
    name: "20 Test Akseptansi CMS Homepage Hero Banner (Customer & Admin)",
    file: "backend/tests/homeHeroBanner.test.js",
  },
  {
    name: "Audit Implementasi Kebutuhan Klien (Pricing, SIM, Matriks Dokumen, PGE Hub, Point)",
    file: "backend/tests/clientRequirementsAuditImplementation.test.js",
  },
  {
    name: "Jangkauan Nasional Seluruh Indonesia & Penyesuaian Tarif Driver",
    file: "backend/tests/nationwideCoverageAndPricing.test.js",
  },
];

console.log("================================================================================");
console.log("🚀 MENJALANKAN MASTER TEST RUNNER OTOMATIS - GEOVERSE PGE KAMOJANG");
console.log(`🕒 Waktu Eksekusi: ${new Date().toISOString()}`);
console.log(`📋 Total Test Suite: ${testSuites.length}`);
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;
const results = [];

for (const suite of testSuites) {
  process.stdout.write(`⏳ Menjalankan [${suite.name}]... `);
  const startTime = Date.now();
  try {
    execSync(`node ${suite.file}`, {
      cwd: path.resolve(__dirname, "../../"),
      stdio: "pipe",
      timeout: 60000,
    });
    const durationMs = Date.now() - startTime;
    console.log(`✅ LULUS (${durationMs}ms)`);
    passedCount++;
    results.push({ name: suite.name, status: "PASSED", durationMs });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.log(`❌ GAGAL (${durationMs}ms)`);
    console.error(error.stdout?.toString() || error.message);
    failedCount++;
    results.push({ name: suite.name, status: "FAILED", durationMs, error: error.message });
  }
}

console.log("\n================================================================================");
console.log("📊 RINGKASAN HASIL TEST OTOMATIS");
console.log("================================================================================");
console.log(`Total Suite : ${testSuites.length}`);
console.log(`Lulus       : ${passedCount}`);
console.log(`Gagal       : ${failedCount}`);
console.log(`Success Rate: ${Math.round((passedCount / testSuites.length) * 100)}%`);

if (failedCount > 0) {
  console.error("\n❌ Terdapat test yang gagal. Silakan periksa log di atas.");
  process.exit(1);
} else {
  console.log("\n🎉 SELURUH TEST OTOMATIS BERHASIL LULUS 100%!");
  console.log("Aplikasi GEOVERSE siap digunakan dan terverifikasi stabil.");
  process.exit(0);
}
