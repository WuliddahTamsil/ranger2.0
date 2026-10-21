const assert = require("assert");
const {
  getPointRate,
  setPointRate,
  convertPointsToRupiah,
  convertRupiahToPoints,
  ALLOWED_PAYMENT_SERVICES,
} = require("../features/geoversePoint/constants/pointConstants");
const {
  calculatePaymentQuote,
} = require("../features/geoversePoint/services/pointWalletService");

async function runAudit() {
  console.log("=== AUDIT KONVERSI 100 POIN = RP 1 DI SEMUA FITUR ===");

  // 1. Verify Rate
  const rate = getPointRate();
  console.log(`[1] Current Point Rate: ${rate}`);
  assert.strictEqual(rate, 0.01, "Point rate harus 0.01 (100 Poin = Rp 1)");

  // 2. Conversion helper math
  assert.strictEqual(convertPointsToRupiah(100), 1, "100 Poin harus setara Rp 1");
  assert.strictEqual(convertPointsToRupiah(50000), 500, "50.000 Poin harus setara Rp 500");
  assert.strictEqual(convertPointsToRupiah(1000000), 10000, "1.000.000 Poin harus setara Rp 10.000");

  assert.strictEqual(convertRupiahToPoints(1), 100, "Rp 1 harus menghasilkan 100 Poin");
  assert.strictEqual(convertRupiahToPoints(500), 50000, "Rp 500 harus menghasilkan 50.000 Poin");
  assert.strictEqual(convertRupiahToPoints(15000), 1500000, "Rp 15.000 harus menghasilkan 1.500.000 Poin");
  console.log("✓ Helper convertPointsToRupiah & convertRupiahToPoints PASSED!");

  // 3. Test calculatePaymentQuote for each allowed service
  for (const service of ALLOWED_PAYMENT_SERVICES) {
    // Partial point usage
    const quotePartial = await calculatePaymentQuote({
      service,
      grossAmount: 20000, // Rp 20.000
      voucherDiscount: 0,
      requestedPoints: 50000, // 50,000 pts = Rp 500
      userBalance: 200000, // user has 200,000 pts
    });

    assert.strictEqual(quotePartial.pointRate, 0.01);
    assert.strictEqual(quotePartial.approvedPoints, 50000);
    assert.strictEqual(quotePartial.pointDiscount, 500);
    assert.strictEqual(quotePartial.finalAmount, 19500);
    assert.strictEqual(quotePartial.remainingWalletBalance, 150000);

    // Full 100% point coverage
    const quoteFull = await calculatePaymentQuote({
      service,
      grossAmount: 10000, // Rp 10.000
      voucherDiscount: 0,
      requestedPoints: 1000000, // 1,000,000 pts = Rp 10.000
      userBalance: 1500000,
    });

    assert.strictEqual(quoteFull.approvedPoints, 1000000);
    assert.strictEqual(quoteFull.pointDiscount, 10000);
    assert.strictEqual(quoteFull.finalAmount, 0);
    assert.strictEqual(quoteFull.remainingWalletBalance, 500000);
    assert(quoteFull.paymentMethodOptions.includes("GEOVERSE_POINT"));

    console.log(`✓ Service '${service}' payment quote PASSED!`);
  }

  console.log("\n>>> SEMUA PENGECEKAN 100 POIN = RP 1 SUKSES 100% <<<");
}

runAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("AUDIT FAILED:", err);
    process.exit(1);
  });
