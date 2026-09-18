require("dotenv").config();
const mongoose = require("mongoose");
const assert = require("assert");
const User = require("../models/User");
const WasteBank = require("../models/WasteBank");
const WasteCategoryPrice = require("../models/WasteCategoryPrice");
const WasteDeposit = require("../models/WasteDeposit");
const PointWallet = require("../models/PointWallet");
const PointLedger = require("../models/PointLedger");
const PointRedemption = require("../models/PointRedemption");
const Voucher = require("../models/Voucher");
const { creditPoints, debitPoints, reversePoints, getOrCreateWallet } = require("../services/pointWalletService");

async function runIntegrationTest() {
  console.log("==================================================");
  console.log("🚀 RUNNING KANYAAH RECYCLE FULL INTEGRATION TEST");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Get or create test users
  let testCustomer = await User.findOne({ email: "recycle_cust_test@geoverse.com" });
  if (!testCustomer) {
    testCustomer = await User.create({
      role: "customer",
      name: "Rani Recycle Customer",
      email: "recycle_cust_test@geoverse.com",
      phone: "081299001122",
      address: "Jl. Dago No. 88, Bandung",
      status: "verified",
    });
  }

  let bank = await WasteBank.findOne({ name: "Bank Sampah Induk Kamojang Asri" });
  assert(bank, "Seed waste bank must exist");

  // Clean test wallet
  await PointWallet.deleteOne({ userId: testCustomer._id });
  await PointLedger.deleteMany({ userId: testCustomer._id });
  await PointRedemption.deleteMany({ userId: testCustomer._id });
  await WasteDeposit.deleteMany({ customerId: testCustomer._id });

  console.log(`[Flow 1] Test Customer ready: ${testCustomer.name} (${testCustomer._id})`);

  // 2. Customer creates deposit request
  const depositCode = `TEST-RCY-${Date.now()}`;
  const deposit = await WasteDeposit.create({
    depositCode,
    customerId: testCustomer._id,
    bankSampahId: bank._id,
    method: "PICKUP",
    pickupAddress: testCustomer.address,
    pickupLatitude: -6.8850,
    pickupLongitude: 107.6140,
    pickupSchedule: new Date(Date.now() + 24 * 60 * 60 * 1000),
    categories: [
      {
        category: "Plastik",
        subCategory: "Botol PET Bening",
        estimatedWeightKg: 5,
        actualWeightKg: 0,
        pricePerKg: 4500,
        totalRupiah: 22500,
        totalPoint: 22500,
      },
      {
        category: "Kertas & Kardus",
        subCategory: "Kardus Tebal",
        estimatedWeightKg: 10,
        actualWeightKg: 0,
        pricePerKg: 2500,
        totalRupiah: 25000,
        totalPoint: 25000,
      },
    ],
    estimatedTotalWeightKg: 15,
    estimatedPoint: 47500,
    estimatedRupiah: 47500,
    status: "REQUESTED",
  });
  console.log(`[Flow 2] Customer created pickup deposit #${deposit.depositCode} (Estimasi: 15 kg / 47.500 Pts)`);

  // 3. Bank accepts and officer weighs actual items
  deposit.status = "WAITING_CUSTOMER_CONFIRMATION";
  deposit.categories[0].actualWeightKg = 4.2; // 4.2 * 4500 = 18.900
  deposit.categories[0].totalRupiah = 18900;
  deposit.categories[0].totalPoint = 18900;

  deposit.categories[1].actualWeightKg = 8.5; // 8.5 * 2500 = 21.250
  deposit.categories[1].totalRupiah = 21250;
  deposit.categories[1].totalPoint = 21250;

  deposit.actualTotalWeightKg = 12.7; // 4.2 + 8.5
  deposit.finalRupiah = 40150;
  deposit.finalPoint = 40150;
  deposit.weighingProofPhotos = ["https://example.com/scale-proof.jpg"];
  await deposit.save();
  console.log(`[Flow 3] Officer weighed actual: 12.7 kg = Rp 40.150 = 40.150 Points with proof photo.`);

  // 4. Customer reviews and approves scale results -> Atomically issue points
  const creditRes = await creditPoints({
    userId: testCustomer._id,
    points: deposit.finalPoint,
    sourceType: "WASTE_DEPOSIT",
    sourceId: String(deposit._id),
    notes: `Setor sampah #${deposit.depositCode}`,
    kgDeposited: deposit.actualTotalWeightKg,
    co2ReductionKg: 15.6,
  });

  assert.strictEqual(creditRes.wallet.balancePoint, 40150, "Wallet balance must be 40.150");
  assert.strictEqual(creditRes.ledger.points, 40150, "Ledger entry points must be 40.150");
  assert.strictEqual(creditRes.ledger.balanceAfter, 40150, "Running balance must equal 40.150");
  console.log(`[Flow 4] Customer confirmed weighing. Wallet credited: ${creditRes.wallet.balancePoint} Points. Ledger confirmed.`);

  // 5. Double-issuance prevention check
  const duplicateCredit = await creditPoints({
    userId: testCustomer._id,
    points: deposit.finalPoint,
    sourceType: "WASTE_DEPOSIT",
    sourceId: String(deposit._id),
    notes: "Duplicate attempt",
  });
  assert.strictEqual(duplicateCredit.alreadyProcessed, true, "Must block duplicate point credit");
  assert.strictEqual(duplicateCredit.wallet.balancePoint, 40150, "Balance must not increase on duplicate credit");
  console.log("[Flow 5] Double-credit prevention verified: duplicate credit blocked successfully.");

  // 6. Customer redeems voucher (Cost: 5.000 Points)
  const voucherDebit = await debitPoints({
    userId: testCustomer._id,
    points: 5000,
    type: "REDEEM_VOUCHER",
    sourceType: "VOUCHER",
    sourceId: "RCY-MKT-5K",
    notes: "Tukar Voucher Diskon Rp 5.000 Marketplace",
  });
  assert.strictEqual(voucherDebit.wallet.balancePoint, 35150, "Balance must decrease to 35.150 (40.150 - 5.000)");
  assert.strictEqual(voucherDebit.ledger.points, -5000, "Debit ledger must be negative");
  assert.strictEqual(voucherDebit.ledger.balanceAfter, 35150, "Running ledger balance verified");
  console.log(`[Flow 6] Voucher redeemed: -5.000 Points. Remaining balance: ${voucherDebit.wallet.balancePoint} Points.`);

  // 7. Insufficient balance guard check
  let errorCaught = false;
  try {
    await debitPoints({
      userId: testCustomer._id,
      points: 100000, // exceeds 35.150
      type: "REDEEM_CASH",
      sourceType: "CASH_REDEMPTION",
      sourceId: "OVERDRAFT",
    });
  } catch (err) {
    errorCaught = true;
  }
  assert(errorCaught, "Overdraft must be blocked");
  console.log("[Flow 7] Insufficient balance guard verified: overdraft attempt blocked.");

  // 8. Reversal check (Redemption rejected -> points returned)
  // Debit 10.000 points for cash
  const cashDebit = await debitPoints({
    userId: testCustomer._id,
    points: 10000,
    type: "REDEEM_CASH",
    sourceType: "CASH_REDEMPTION",
    sourceId: "RED-10K",
  });
  assert.strictEqual(cashDebit.wallet.balancePoint, 25150, "Balance is now 25.150");

  // Admin rejects cash redemption -> points reversed
  const reversal = await reversePoints({
    userId: testCustomer._id,
    points: 10000,
    sourceType: "CASH_REDEMPTION",
    sourceId: "RED-10K",
    notes: "Tolak kas: syarat belum terpenuhi",
  });
  assert.strictEqual(reversal.wallet.balancePoint, 35150, "Points must be fully restored back to 35.150");
  assert.strictEqual(reversal.ledger.type, "REVERSAL", "Ledger type must be REVERSAL");
  console.log(`[Flow 8] Reversal verified: 10.000 points safely restored to wallet. Current balance: ${reversal.wallet.balancePoint} Points.`);

  console.log("==================================================");
  console.log("🎉 ALL INTEGRATION FLOW CHECKS COMPLETED WITH SUCCESS!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runIntegrationTest().catch((e) => {
  console.error("❌ Integration Test Failed:", e);
  process.exit(1);
});
