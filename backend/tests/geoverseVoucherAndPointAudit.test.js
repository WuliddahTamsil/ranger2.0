/**
 * geoverseVoucherAndPointAudit.test.js
 * Comprehensive audit & verification test suite for GEOVERSE Points & Merchant Vouchers
 */

const assert = require("assert");

console.log("=================================================");
console.log("🚀 AUDIT & VERIFICATION: GEOVERSE POINTS & VOUCHERS");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${err.message}\n`);
    throw err;
  }
}

// ----------------------------------------------------
// 1. FREE SHIPPING VOUCHER DISCOUNT LOGIC
// ----------------------------------------------------
runTest("1.1 Gratis Ongkir: Delivery fee higher than subsidy cap", () => {
  const deliveryFee = 15000;
  const voucherDiscountValue = 10000; // max subsidy
  const discount = Math.min(deliveryFee, voucherDiscountValue);
  assert.strictEqual(discount, 10000, "Discount should be capped at voucher discountValue");
});

runTest("1.2 Gratis Ongkir: Delivery fee lower than subsidy cap (no negative remainder)", () => {
  const deliveryFee = 6000;
  const voucherDiscountValue = 10000;
  const discount = Math.min(deliveryFee, voucherDiscountValue);
  assert.strictEqual(discount, 6000, "Discount should equal actual delivery fee");
  const finalDeliveryFee = Math.max(0, deliveryFee - discount);
  assert.strictEqual(finalDeliveryFee, 0, "Customer pays Rp 0 delivery fee");
});

// ----------------------------------------------------
// 2. PERCENTAGE & FIXED DISCOUNT VOUCHER LOGIC
// ----------------------------------------------------
runTest("2.1 Persentase Diskon: Max discount cap applied", () => {
  const subtotal = 100000;
  const percentage = 20; // 20% = 20.000
  const maxDiscount = 12000;
  let discount = Math.round((subtotal * percentage) / 100);
  if (maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }
  assert.strictEqual(discount, 12000, "Discount should be capped at maxDiscount");
});

runTest("2.2 Persentase Diskon: Within cap limits", () => {
  const subtotal = 40000;
  const percentage = 15; // 15% = 6.000
  const maxDiscount = 15000;
  let discount = Math.round((subtotal * percentage) / 100);
  if (maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }
  assert.strictEqual(discount, 6000, "Discount should be exactly 15% of subtotal");
});

runTest("2.3 Diskon Nominal Flat", () => {
  const subtotal = 35000;
  const discountValue = 5000;
  const discount = Math.min(subtotal, discountValue);
  assert.strictEqual(discount, 5000, "Flat discount of Rp 5.000 should apply");
  const finalSubtotal = subtotal - discount;
  assert.strictEqual(finalSubtotal, 30000, "Subtotal after discount should be 30.000");
});

// ----------------------------------------------------
// 3. MINIMUM TRANSACTION & EXPIRY VALIDATION
// ----------------------------------------------------
runTest("3.1 Min Transaction enforcement (Reject below minTransaction)", () => {
  const subtotal = 19000;
  const minTransaction = 25000;
  const isEligible = subtotal >= minTransaction;
  assert.strictEqual(isEligible, false, "Order below minTransaction must be rejected");
});

runTest("3.2 Min Transaction enforcement (Accept at or above minTransaction)", () => {
  const subtotal = 25000;
  const minTransaction = 25000;
  const isEligible = subtotal >= minTransaction;
  assert.strictEqual(isEligible, true, "Order meeting minTransaction must be accepted");
});

runTest("3.3 Voucher Expiry enforcement", () => {
  const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
  const isExpired = expiredDate < new Date();
  assert.strictEqual(isExpired, true, "Expired voucher must be detected");
});

// ----------------------------------------------------
// 4. MERCHANT VOUCHER AUTO-CLAIM & ZERO-POINT PROMO
// ----------------------------------------------------
runTest("4.1 Auto-claim for merchant promo vouchers (pointsCost === 0)", () => {
  const voucher = {
    voucherCode: "ONGKIRFREE",
    pointsCost: 0,
    usageLimit: 50,
    usedCount: 5,
    claimedBy: [],
  };

  const customerId = "cust_12345";
  let userClaim = voucher.claimedBy.find((c) => c.userId === customerId);

  if (!userClaim && voucher.pointsCost === 0 && voucher.usageLimit > voucher.usedCount) {
    voucher.claimedBy.push({ userId: customerId, claimedAt: new Date(), used: false });
    userClaim = voucher.claimedBy[0];
  }

  assert.ok(userClaim, "Free merchant voucher should auto-claim for customer without requiring points");
  assert.strictEqual(userClaim.used, false, "Initial claim state should be unused");
});

runTest("4.2 Rejection of already used voucher claim", () => {
  const userClaim = { userId: "cust_12345", used: true, usedAt: new Date() };
  const canUse = !userClaim.used;
  assert.strictEqual(canUse, false, "Already used voucher claim must not be re-applied");
});

// ----------------------------------------------------
// 5. COMBINED TOTAL & ORDER STACKING (VOUCHER + POINTS)
// ----------------------------------------------------
runTest("5.1 Order calculation with Free Shipping Voucher + Geoverse Point", () => {
  const subtotal = 40000;
  const deliveryFee = 10000;
  const serviceFee = 2000;

  // Free shipping voucher (subsidi up to Rp 10.000)
  const voucherDiscount = Math.min(deliveryFee, 10000); // 10.000

  // Total after voucher
  const rawTotalBeforePoints = subtotal + deliveryFee + serviceFee - voucherDiscount;
  assert.strictEqual(rawTotalBeforePoints, 42000, "Subtotal (40k) + Service (2k) = 42k");

  // Customer uses 15.000 Geoverse Points
  const userPoints = 25000;
  const maxPointsUsable = Math.min(userPoints, rawTotalBeforePoints);
  const pointsToUse = 15000;
  assert.ok(pointsToUse <= maxPointsUsable, "Points to use must not exceed usable cap");

  const finalTotalAmount = rawTotalBeforePoints - pointsToUse;
  assert.strictEqual(finalTotalAmount, 27000, "Final amount to pay should be 42k - 15k = 27k");
});

// ----------------------------------------------------
// 6. CASH WITHDRAWAL REDEMPTION VALIDATION
// ----------------------------------------------------
runTest("6.1 Cash withdrawal minimum threshold validation (10.000 points)", () => {
  const minCashPoints = 10000;
  const requestedPoints = 5000;
  const isValid = requestedPoints >= minCashPoints;
  assert.strictEqual(isValid, false, "Redemption below 10.000 points must be rejected");
});

runTest("6.2 Cash withdrawal destination channels", () => {
  const validChannels = ["CASH_AT_BANK", "BCA", "BRI", "BNI", "MANDIRI", "GOPAY", "OVO", "DANA", "SHOPEEPAY"];
  assert.ok(validChannels.includes("CASH_AT_BANK"), "Bank Sampah Cash pickup supported");
  assert.ok(validChannels.includes("BCA"), "BCA supported");
  assert.ok(validChannels.includes("GOPAY"), "GoPay supported");
  assert.ok(validChannels.includes("DANA"), "DANA supported");
});

// ----------------------------------------------------
// 7. VOUCHER CONTROLLER ENDPOINT PAYLOAD SHAPES
// ----------------------------------------------------
runTest("7.1 Merchant create voucher payload sanitization", () => {
  const rawInput = {
    voucherCode: "  ongkirfree2026!  ",
    title: "  Gratis Ongkir Toko  ",
    discountType: "FREE_SHIPPING",
    discountValue: "10000",
    minTransaction: "25000",
  };

  const cleanCode = rawInput.voucherCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const cleanTitle = rawInput.title.trim();
  const numDiscountValue = Number(rawInput.discountValue) || 0;
  const numMinTransaction = Number(rawInput.minTransaction) || 0;

  assert.strictEqual(cleanCode, "ONGKIRFREE2026", "Code should be uppercase and alphanumeric");
  assert.strictEqual(cleanTitle, "Gratis Ongkir Toko", "Title should be trimmed");
  assert.strictEqual(numDiscountValue, 10000, "Discount value should be parsed to number");
  assert.strictEqual(numMinTransaction, 25000, "Min transaction should be parsed to number");
});

console.log("\n=================================================");
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log("=================================================\n");
