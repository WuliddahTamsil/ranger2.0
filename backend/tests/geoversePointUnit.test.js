/**
 * geoversePointUnit.test.js
 * Comprehensive unit test suite for GEOVERSE Point (12 required scenarios)
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const PointWallet = require("../features/geoversePoint/models/PointWallet");
const PointLedger = require("../features/geoversePoint/models/PointLedger");
const PointRedemption = require("../features/geoversePoint/models/PointRedemption");
const Voucher = require("../models/Voucher");
const {
  getOrCreateWallet,
  creditPoints,
  debitPoints,
  reversePoints,
  adjustPoints,
} = require("../features/geoversePoint/services/pointWalletService");
const pointRedemptionService = require("../features/geoversePoint/services/pointRedemptionService");
const { enforceWalletOwner, enforceStaffOrAdmin } = require("../features/geoversePoint/policies/pointAccessPolicy");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb+srv://dhimas:4568521379@cluster0.p71hk.mongodb.net/rangers?retryWrites=true&w=majority&appName=Cluster0";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING GEOVERSE POINT 12 UNIT TESTS");
  console.log("==================================================\n");

  await mongoose.connect(MONGO_URI);

  const testUserId = new mongoose.Types.ObjectId();
  const unauthorizedUserId = new mongoose.Types.ObjectId();
  const testAdminId = new mongoose.Types.ObjectId();

  try {
    // ----------------------------------------------------
    // [Test 1] Credit point dari deposit hanya sekali (Idempotency & Double-credit prevention)
    // ----------------------------------------------------
    console.log("[Test 1] Credit point dari deposit hanya sekali");
    const depositId = `DEP-TEST-${Date.now()}`;
    const firstCredit = await creditPoints({
      userId: testUserId,
      points: 25000,
      sourceType: "WASTE_DEPOSIT",
      sourceId: depositId,
      notes: "Deposit sampah anorganik 10kg",
      kgDeposited: 10,
      co2ReductionKg: 18.5,
    });
    if (firstCredit.alreadyProcessed) {
      throw new Error("Credit pertama seharusnya belum processed.");
    }
    if (firstCredit.wallet.balancePoint !== 25000) {
      throw new Error(`Saldo salah: expected 25000, got ${firstCredit.wallet.balancePoint}`);
    }

    // Attempt second credit with same sourceId
    const secondCredit = await creditPoints({
      userId: testUserId,
      points: 25000,
      sourceType: "WASTE_DEPOSIT",
      sourceId: depositId,
      notes: "Duplicate attempt",
    });
    if (!secondCredit.alreadyProcessed) {
      throw new Error("Credit kedua seharusnya ditolak double-issuance.");
    }
    if (secondCredit.wallet.balancePoint !== 25000) {
      throw new Error(`Saldo terduplikasi! Got ${secondCredit.wallet.balancePoint}`);
    }
    console.log("  ✅ Test 1 PASSED: Double credit prevented successfully.\n");

    // ----------------------------------------------------
    // [Test 2] Duplicate request menggunakan idempotency key
    // ----------------------------------------------------
    console.log("[Test 2] Duplicate request menggunakan idempotency key");
    const idempotencyKey = `IDEMP-${Date.now()}`;
    const rdm1 = await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "CASH",
      points: 10000,
      idempotencyKey,
      payoutDestination: { channel: "BCA", accountNumber: "1234567890", accountName: "Tester" },
    });
    if (rdm1.alreadyProcessed) {
      throw new Error("Redemption 1 seharusnya belum processed.");
    }

    const rdm2 = await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "CASH",
      points: 10000,
      idempotencyKey,
      payoutDestination: { channel: "BCA", accountNumber: "1234567890", accountName: "Tester" },
    });
    if (!rdm2.alreadyProcessed) {
      throw new Error("Redemption 2 dengan idempotency key sama harus mengembalikan existing record.");
    }
    console.log("  ✅ Test 2 PASSED: Idempotency key protected duplicate requests.\n");

    // ----------------------------------------------------
    // [Test 3] Saldo tidak boleh negatif
    // ----------------------------------------------------
    console.log("[Test 3] Saldo tidak boleh negatif (Atomic balance guard)");
    const currentWallet = await getOrCreateWallet(testUserId);
    const excessivePoints = currentWallet.balancePoint + 50000;
    let negativeBlocked = false;
    try {
      await debitPoints({
        userId: testUserId,
        points: excessivePoints,
        sourceType: "KANYAAH_SHOP",
        sourceId: "TEST-OVERDRAW",
      });
    } catch (err) {
      negativeBlocked = true;
    }
    if (!negativeBlocked) {
      throw new Error("Debit melebihi saldo seharusnya gagal!");
    }
    const walletAfterAttempt = await getOrCreateWallet(testUserId);
    if (walletAfterAttempt.balancePoint < 0) {
      throw new Error("Saldo menjadi negatif!");
    }
    console.log("  ✅ Test 3 PASSED: Negative balance blocked successfully.\n");

    // ----------------------------------------------------
    // [Test 4] Ledger balanceBefore/balanceAfter benar
    // ----------------------------------------------------
    console.log("[Test 4] Ledger balanceBefore/balanceAfter benar");
    const startBal = walletAfterAttempt.balancePoint;
    const debit5k = await debitPoints({
      userId: testUserId,
      points: 5000,
      sourceType: "KANYAAH_SHOP",
      sourceId: "TEST-LEDGER-AUDIT",
    });
    if (debit5k.ledger.balanceBefore !== startBal) {
      throw new Error(`balanceBefore salah: expected ${startBal}, got ${debit5k.ledger.balanceBefore}`);
    }
    if (debit5k.ledger.balanceAfter !== startBal - 5000) {
      throw new Error(`balanceAfter salah: expected ${startBal - 5000}, got ${debit5k.ledger.balanceAfter}`);
    }
    console.log("  ✅ Test 4 PASSED: Ledger balanceBefore and balanceAfter are exact.\n");

    // ----------------------------------------------------
    // [Test 5] Voucher expired ditolak
    // ----------------------------------------------------
    console.log("[Test 5] Voucher expired ditolak");
    const expiredVoucher = await Voucher.create({
      code: `EXP-${Date.now()}`,
      voucherCode: `EXP-${Date.now()}`,
      title: "Expired Voucher Test",
      description: "Test",
      service: "ALL",
      discountType: "FIXED",
      discountValue: 10000,
      minTransaction: 20000,
      pointsCost: 2000,
      status: "ACTIVE",
      validUntil: new Date(Date.now() - 86400000), // Yesterday
    });

    let expiredBlocked = false;
    try {
      await pointRedemptionService.createRedemption({
        userId: testUserId,
        type: "VOUCHER",
        points: 2000,
        voucherId: expiredVoucher._id,
      });
    } catch (err) {
      expiredBlocked = true;
    }
    if (!expiredBlocked) {
      throw new Error("Penukaran voucher expired seharusnya gagal!");
    }
    console.log("  ✅ Test 5 PASSED: Expired voucher rejected.\n");

    // ----------------------------------------------------
    // [Test 6] Voucher satu kali tidak bisa diklaim ulang
    // ----------------------------------------------------
    console.log("[Test 6] Voucher satu kali tidak bisa diklaim ulang");
    const oneTimeVoucher = await Voucher.create({
      code: `ONCE-${Date.now()}`,
      voucherCode: `ONCE-${Date.now()}`,
      title: "One Time Voucher",
      description: "Test",
      service: "ALL",
      discountType: "FIXED",
      discountValue: 5000,
      minTransaction: 10000,
      pointsCost: 1000,
      status: "ACTIVE",
      usageLimitPerUser: 1,
      validUntil: new Date(Date.now() + 86400000),
    });

    // First claim: should succeed
    await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "VOUCHER",
      points: 1000,
      voucherId: oneTimeVoucher._id,
    });

    // Second claim: should fail
    let duplicateClaimBlocked = false;
    try {
      await pointRedemptionService.createRedemption({
        userId: testUserId,
        type: "VOUCHER",
        points: 1000,
        voucherId: oneTimeVoucher._id,
      });
    } catch (err) {
      duplicateClaimBlocked = true;
    }
    if (!duplicateClaimBlocked) {
      throw new Error("Voucher one-time berhasil diklaim dua kali!");
    }
    console.log("  ✅ Test 6 PASSED: One-time voucher duplicate claim prevented.\n");

    // ----------------------------------------------------
    // [Test 7] Debit point untuk checkout benar
    // ----------------------------------------------------
    console.log("[Test 7] Debit point untuk checkout benar (Kanyaah Shop/Ride/Send/Catering)");
    const checkoutDebit = await debitPoints({
      userId: testUserId,
      points: 3000,
      type: "PAYMENT",
      sourceType: "KANYAAH_SHOP",
      sourceId: "ORDER-SHOP-888",
      notes: "Potongan checkout Kanyaah Shop",
    });
    if (checkoutDebit.ledger.sourceType !== "KANYAAH_SHOP") {
      throw new Error(`sourceType salah: ${checkoutDebit.ledger.sourceType}`);
    }
    console.log("  ✅ Test 7 PASSED: Checkout point debit is accurate.\n");

    // ----------------------------------------------------
    // [Test 8] Reversal mengembalikan saldo
    // ----------------------------------------------------
    console.log("[Test 8] Reversal mengembalikan saldo");
    const balBeforeReversal = checkoutDebit.wallet.balancePoint;
    const reversal = await reversePoints({
      userId: testUserId,
      points: 3000,
      sourceType: "KANYAAH_SHOP",
      sourceId: "ORDER-SHOP-888",
      notes: "Pesanan dibatalkan customer",
    });
    if (reversal.wallet.balancePoint !== balBeforeReversal + 3000) {
      throw new Error("Reversal tidak mengembalikan saldo secara tepat!");
    }
    console.log("  ✅ Test 8 PASSED: Reversal credited points back to wallet.\n");

    // ----------------------------------------------------
    // [Test 9] Customer tidak dapat membaca wallet user lain
    // ----------------------------------------------------
    console.log("[Test 9] Customer tidak dapat membaca wallet user lain");
    let accessBlocked = false;
    const mockReq = {
      authUser: { _id: testUserId, role: "customer" },
      query: { userId: unauthorizedUserId.toString() },
      params: {},
      body: {},
    };
    const mockRes = {
      status(code) {
        if (code === 403) accessBlocked = true;
        return { json: () => {} };
      },
    };
    enforceWalletOwner(mockReq, mockRes, () => {});
    if (!accessBlocked) {
      throw new Error("Customer dapat mengakses wallet user lain!");
    }
    console.log("  ✅ Test 9 PASSED: Unauthorized wallet access denied with 403.\n");

    // ----------------------------------------------------
    // [Test 10] Customer tidak dapat approve atau pay redemption
    // ----------------------------------------------------
    console.log("[Test 10] Customer tidak dapat approve atau pay redemption");
    let staffOnlyBlocked = false;
    const mockCustReq = {
      authUser: { _id: testUserId, role: "customer" },
    };
    const mockStaffRes = {
      status(code) {
        if (code === 403) staffOnlyBlocked = true;
        return { json: () => {} };
      },
    };
    enforceStaffOrAdmin(mockCustReq, mockStaffRes, () => {});
    if (!staffOnlyBlocked) {
      throw new Error("Customer dapat mengakses endpoint staff/admin!");
    }
    console.log("  ✅ Test 10 PASSED: Customer cannot approve/pay redemption.\n");

    // ----------------------------------------------------
    // [Test 11] Admin dapat melakukan adjustment dengan alasan
    // ----------------------------------------------------
    console.log("[Test 11] Admin dapat melakukan adjustment dengan alasan");
    const adjResult = await adjustPoints({
      userId: testUserId,
      points: 7500,
      reason: "Bonus event hari bumi Kamojang",
      actorId: testAdminId,
    });
    if (adjResult.ledger.type !== "ADJUSTMENT") {
      throw new Error(`Tipe ledger bukan ADJUSTMENT: ${adjResult.ledger.type}`);
    }
    if (!adjResult.ledger.notes.includes("Bonus event hari bumi")) {
      throw new Error("Alasan tidak tersimpan di audit ledger!");
    }
    console.log("  ✅ Test 11 PASSED: Admin adjustment with mandatory reason recorded.\n");

    // ----------------------------------------------------
    // [Test 12] Transaction gagal melakukan rollback / error guard
    // ----------------------------------------------------
    console.log("[Test 12] Transaction gagal / error guard");
    let invalidPointsBlocked = false;
    try {
      await creditPoints({
        userId: testUserId,
        points: -500,
        sourceType: "WASTE_DEPOSIT",
        sourceId: "FAIL-TEST",
      });
    } catch (err) {
      invalidPointsBlocked = true;
    }
    if (!invalidPointsBlocked) {
      throw new Error("Credit poin negatif seharusnya dilempar error!");
    }
    console.log("  ✅ Test 12 PASSED: Invalid transaction safely guarded.\n");

    console.log("==================================================");
    console.log("🎉 ALL 12 GEOVERSE POINT UNIT TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    // Clean up test records
    await PointWallet.deleteMany({ userId: { $in: [testUserId, unauthorizedUserId] } });
    await PointLedger.deleteMany({ userId: { $in: [testUserId, unauthorizedUserId] } });
    await PointRedemption.deleteMany({ userId: { $in: [testUserId, unauthorizedUserId] } });
    await Voucher.deleteMany({ code: { $regex: /^(EXP-|ONCE-)/ } });
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ UNIT TEST FAILED:", err);
  process.exit(1);
});
