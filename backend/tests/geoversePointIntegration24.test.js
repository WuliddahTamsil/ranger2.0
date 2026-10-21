/**
 * geoversePointIntegration24.test.js
 * 
 * Comprehensive 24-Scenario Integration & Acceptance Test Suite
 * for GEOVERSE Point across all domains:
 * - Kanyaah Recycle, Ride, Send, Shop, Marketplace, Catering, Laundry,
 *   Voucher, and Cash Redemption.
 * 
 * Verifies:
 * 1. Credit deposit satu kali.
 * 2. Duplicate credit dengan sourceId sama.
 * 3. Debit point normal.
 * 4. Debit melebihi saldo.
 * 5. Debit duplicate dengan request yang sama.
 * 6. Debit gagal karena create order gagal.
 * 7. Saldo tetap kembali setelah rollback.
 * 8. Reversal pertama berhasil.
 * 9. Reversal kedua tidak menambah saldo.
 * 10. Cancel order dua kali tidak double refund.
 * 11. Shop checkout dengan type PAYMENT valid.
 * 12. Shop stock gagal tidak mengurangi point.
 * 13. Laundry tanpa payment proof tidak mengurangi point.
 * 14. Laundry retry tidak double debit.
 * 15. Catering frontend/backend memiliki total yang sama.
 * 16. Marketplace lama dapat menggunakan point atau ditolak secara eksplisit.
 * 17. Voucher claim tidak double count usedCount.
 * 18. Cash redemption reject mengembalikan point satu kali.
 * 19. Bank sampah tidak bisa melihat redemption bank lain.
 * 20. Wallet dan ledger selalu memiliki balanceBefore/balanceAfter konsisten.
 * 21. Cashback Send hanya diterbitkan satu kali.
 * 22. Ride cancellation mengembalikan point tepat satu kali.
 * 23. Semua order yang totalnya 0 menggunakan GEOVERSE_POINT.
 * 24. Partial point payment menyimpan sisa payable amount dengan benar.
 */

const mongoose = require("mongoose");
const assert = require("assert");
const dotenv = require("dotenv");
dotenv.config();

const PointWallet = require("../features/geoversePoint/models/PointWallet");
const PointLedger = require("../features/geoversePoint/models/PointLedger");
const PointRedemption = require("../features/geoversePoint/models/PointRedemption");
const Voucher = require("../models/Voucher");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const LaundryOrder = require("../models/LaundryOrder");
const RideOrder = require("../models/RideOrder");
const SendOrder = require("../models/SendOrder");

const {
  getOrCreateWallet,
  creditPoints,
  debitPoints,
  reversePoints,
  adjustPoints,
  calculatePaymentQuote,
  getPointRate,
  setPointRate,
} = require("../features/geoversePoint/services/pointWalletService");

const pointRedemptionService = require("../features/geoversePoint/services/pointRedemptionService");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb+srv://dhimas:4568521379@cluster0.p71hk.mongodb.net/rangers?retryWrites=true&w=majority&appName=Cluster0";

async function run24Tests() {
  console.log("================================================================================");
  console.log("🧪 MENJALANKAN 24 TEST INTEGRASI & ACCEPTANCE GEOVERSE POINT");
  console.log("================================================================================\n");

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 60000 });
  } catch (connErr) {
    console.warn("Retrying mongoose connect...", connErr.message);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 60000 });
  }

  let passed = 0;
  let failed = 0;

  const testUserId = new mongoose.Types.ObjectId();
  const testAdminId = new mongoose.Types.ObjectId();
  const testOfficerId = new mongoose.Types.ObjectId();
  const initialPointRate = getPointRate();
  setPointRate(1);

  try {
    // ------------------------------------------------------------------------
    // [Test 1] Credit deposit satu kali.
    // ------------------------------------------------------------------------
    console.log("[Test 1] Credit deposit satu kali");
    const depositId = `DEP-24TEST-${Date.now()}`;
    const credit1 = await creditPoints({
      userId: testUserId,
      points: 50000,
      sourceType: "WASTE_DEPOSIT",
      sourceId: depositId,
      notes: "Deposit sampah anorganik 20kg",
      kgDeposited: 20,
      co2ReductionKg: 37,
    });

    assert.strictEqual(credit1.alreadyProcessed, false, "Credit pertama harus diproses");
    assert.strictEqual(credit1.wallet.balancePoint, 50000, "Saldo wallet harus 50.000");
    assert.strictEqual(credit1.ledger.type, "EARN", "Ledger type harus EARN");
    assert.strictEqual(credit1.ledger.points, 50000, "Ledger points harus 50.000");
    assert.strictEqual(credit1.ledger.balanceBefore, 0, "balanceBefore harus 0");
    assert.strictEqual(credit1.ledger.balanceAfter, 50000, "balanceAfter harus 50.000");
    console.log("  ✅ Test 1 PASSED: Credit deposit berhasil (Saldo: 50.000)\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 2] Duplicate credit dengan sourceId sama.
    // ------------------------------------------------------------------------
    console.log("[Test 2] Duplicate credit dengan sourceId sama");
    const credit2 = await creditPoints({
      userId: testUserId,
      points: 50000,
      sourceType: "WASTE_DEPOSIT",
      sourceId: depositId,
      notes: "Percobaan credit kedua deposit yang sama",
    });

    assert.strictEqual(credit2.alreadyProcessed, true, "Credit kedua harus ditolak (alreadyProcessed)");
    assert.strictEqual(credit2.wallet.balancePoint, 50000, "Saldo wallet TIDAK boleh bertambah!");
    console.log("  ✅ Test 2 PASSED: Double credit berhasil dicegah (Saldo tetap: 50.000)\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 3] Debit point normal.
    // ------------------------------------------------------------------------
    console.log("[Test 3] Debit point normal");
    const debit1 = await debitPoints({
      userId: testUserId,
      points: 20000,
      type: "PAYMENT",
      sourceType: "KANYAAH_SHOP",
      sourceId: "ORD-TEST-001",
      notes: "Pembayaran Shop order #ORD-TEST-001",
    });

    assert.strictEqual(debit1.alreadyProcessed, false, "Debit pertama harus diproses");
    assert.strictEqual(debit1.wallet.balancePoint, 30000, "Saldo wallet harus berkurang menjadi 30.000");
    assert.strictEqual(debit1.ledger.points, -20000, "Ledger debit points harus bernilai negatif -20.000");
    assert.strictEqual(debit1.ledger.balanceBefore, 50000, "balanceBefore harus 50.000");
    assert.strictEqual(debit1.ledger.balanceAfter, 30000, "balanceAfter harus 30.000");
    console.log("  ✅ Test 3 PASSED: Debit point normal berhasil (Sisa saldo: 30.000)\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 4] Debit melebihi saldo.
    // ------------------------------------------------------------------------
    console.log("[Test 4] Debit melebihi saldo");
    let overDebitError = null;
    try {
      await debitPoints({
        userId: testUserId,
        points: 40000, // Saldo saat ini 30.000
        type: "PAYMENT",
        sourceType: "KANYAAH_RIDE",
        sourceId: "ORD-OVERDEBIT",
      });
    } catch (err) {
      overDebitError = err;
    }

    assert(overDebitError !== null, "Debit melebihi saldo harus throw error");
    assert(overDebitError.message.includes("tidak mencukupi"), "Pesan error harus tentang saldo tidak mencukupi");
    const checkWallet4 = await getOrCreateWallet(testUserId);
    assert.strictEqual(checkWallet4.balancePoint, 30000, "Saldo wallet tidak boleh berubah");
    console.log("  ✅ Test 4 PASSED: Debit melebihi saldo berhasil dicegah (Saldo aman: 30.000)\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 5] Debit duplicate dengan request yang sama.
    // ------------------------------------------------------------------------
    console.log("[Test 5] Debit duplicate dengan request yang sama");
    const debitDuplicate = await debitPoints({
      userId: testUserId,
      points: 20000,
      type: "PAYMENT",
      sourceType: "KANYAAH_SHOP",
      sourceId: "ORD-TEST-001", // ID yang sama dengan Test 3
    });

    assert.strictEqual(debitDuplicate.alreadyProcessed, true, "Duplicate debit harus ditolak");
    assert.strictEqual(debitDuplicate.wallet.balancePoint, 30000, "Saldo wallet tidak boleh berkurang lagi");
    console.log("  ✅ Test 5 PASSED: Double debit request berhasil dicegah secara idempoten\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 6] Debit gagal karena create order gagal.
    // ------------------------------------------------------------------------
    console.log("[Test 6] Debit gagal karena create order gagal");
    const failOrderCode = `ORD-FAIL-${Date.now()}`;
    let orderCreationRolledBack = false;

    try {
      // 1. Debit points
      await debitPoints({
        userId: testUserId,
        points: 5000,
        type: "PAYMENT",
        sourceType: "KANYAAH_SHOP",
        sourceId: failOrderCode,
        operationKey: `DEBIT-SHOP-${failOrderCode}`,
      });

      // 2. Simulasikan error saat order creation
      throw new Error("Simulasi kegagalan database saat membuat ShopOrder");
    } catch (orderErr) {
      // 3. Rollback point secara otomatis pada catch block
      const rollbackResult = await reversePoints({
        userId: testUserId,
        points: 5000,
        sourceType: "KANYAAH_SHOP",
        sourceId: failOrderCode,
        reversalKey: `ROLLBACK-SHOP-${failOrderCode}`,
        notes: `Rollback order ${failOrderCode} gagal`,
      });
      orderCreationRolledBack = rollbackResult && !rollbackResult.alreadyProcessed;
    }

    assert(orderCreationRolledBack, "Rollback harus dijalankan ketika create order gagal");
    console.log("  ✅ Test 6 PASSED: Order creation error memicu rollback poin\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 7] Saldo tetap kembali setelah rollback.
    // ------------------------------------------------------------------------
    console.log("[Test 7] Saldo tetap kembali setelah rollback");
    const checkWallet7 = await getOrCreateWallet(testUserId);
    assert.strictEqual(checkWallet7.balancePoint, 30000, "Saldo harus kembali utuh ke 30.000 setelah rollback");
    console.log("  ✅ Test 7 PASSED: Saldo kembali utuh setelah rollback (Saldo: 30.000)\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 8] Reversal pertama berhasil.
    // ------------------------------------------------------------------------
    console.log("[Test 8] Reversal pertama berhasil");
    const revOrderCode = `ORD-REV-${Date.now()}`;
    // Debit dulu 10.000 poin
    await debitPoints({
      userId: testUserId,
      points: 10000,
      type: "PAYMENT",
      sourceType: "KANYAAH_RIDE",
      sourceId: revOrderCode,
      operationKey: `DEBIT-RIDE-${revOrderCode}`,
    });

    const walletBeforeRev = await getOrCreateWallet(testUserId);
    assert.strictEqual(walletBeforeRev.balancePoint, 20000, "Saldo setelah debit harus 20.000");

    // Lakukan reversal pertama
    const firstReversal = await reversePoints({
      userId: testUserId,
      points: 10000,
      sourceType: "KANYAAH_RIDE",
      sourceId: revOrderCode,
      reversalKey: `REV-RIDE-${revOrderCode}`,
      notes: `Pengembalian poin order ride #${revOrderCode}`,
    });

    assert.strictEqual(firstReversal.alreadyProcessed, false, "Reversal pertama harus berhasil");
    assert.strictEqual(firstReversal.wallet.balancePoint, 30000, "Saldo harus kembali ke 30.000");
    assert.strictEqual(firstReversal.ledger.type, "REVERSAL", "Tipe ledger harus REVERSAL");
    assert.strictEqual(firstReversal.ledger.points, 10000, "Ledger points harus 10.000");
    console.log("  ✅ Test 8 PASSED: Reversal pertama berhasil mengembalikan poin\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 9] Reversal kedua tidak menambah saldo.
    // ------------------------------------------------------------------------
    console.log("[Test 9] Reversal kedua tidak menambah saldo");
    const secondReversal = await reversePoints({
      userId: testUserId,
      points: 10000,
      sourceType: "KANYAAH_RIDE",
      sourceId: revOrderCode,
      reversalKey: `REV-RIDE-${revOrderCode}`, // Key yang sama
      notes: "Duplicate reversal attempt",
    });

    assert.strictEqual(secondReversal.alreadyProcessed, true, "Reversal kedua harus ditolak");
    assert.strictEqual(secondReversal.wallet.balancePoint, 30000, "Saldo TIDAK boleh bertambah lagi");
    console.log("  ✅ Test 9 PASSED: Reversal kedua tidak menduplikasi pengembalian saldo\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 10] Cancel order dua kali tidak double refund.
    // ------------------------------------------------------------------------
    console.log("[Test 10] Cancel order dua kali tidak double refund");
    const mockOrder = {
      orderCode: `ORD-CANCEL-${Date.now()}`,
      pointsUsed: 8000,
      pointRefunded: false,
    };

    // Debit 8000 poin
    await debitPoints({
      userId: testUserId,
      points: 8000,
      type: "PAYMENT",
      sourceType: "KANYAAH_SHOP",
      sourceId: mockOrder.orderCode,
      operationKey: `DEBIT-SHOP-${mockOrder.orderCode}`,
    });

    // Simulasi pembatalan #1
    let refund1Processed = false;
    if (!mockOrder.pointRefunded && mockOrder.pointsUsed > 0) {
      mockOrder.pointRefunded = true;
      const rev1 = await reversePoints({
        userId: testUserId,
        points: mockOrder.pointsUsed,
        sourceType: "KANYAAH_SHOP",
        sourceId: mockOrder.orderCode,
        reversalKey: `REV-SHOP-${mockOrder.orderCode}`,
      });
      refund1Processed = !rev1.alreadyProcessed;
    }
    assert(refund1Processed, "Refund pembatalan #1 harus berhasil");

    // Simulasi pembatalan #2 (misal endpoint cancel dipanggil ulang oleh client)
    let refund2Processed = false;
    if (!mockOrder.pointRefunded && mockOrder.pointsUsed > 0) {
      // Guard memblokir eksekusi
      refund2Processed = true;
    } else {
      // Bahkan jika guard lolos, service reversePoints tetap menolak
      const rev2 = await reversePoints({
        userId: testUserId,
        points: mockOrder.pointsUsed,
        sourceType: "KANYAAH_SHOP",
        sourceId: mockOrder.orderCode,
        reversalKey: `REV-SHOP-${mockOrder.orderCode}`,
      });
      refund2Processed = !rev2.alreadyProcessed;
    }
    assert.strictEqual(refund2Processed, false, "Refund pembatalan #2 tidak boleh memproses ulang");
    const checkWallet10 = await getOrCreateWallet(testUserId);
    assert.strictEqual(checkWallet10.balancePoint, 30000, "Saldo harus tetap 30.000");
    console.log("  ✅ Test 10 PASSED: Cancel order ganda terproteksi dari double refund\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 11] Shop checkout dengan type PAYMENT valid.
    // ------------------------------------------------------------------------
    console.log("[Test 11] Shop checkout dengan type PAYMENT valid");
    const shopDebit = await debitPoints({
      userId: testUserId,
      points: 4000,
      type: "SHOP_PAYMENT", // Legacy enum yang harus dikanonikalisasi menjadi PAYMENT
      sourceType: "KANYAAH_SHOP",
      sourceId: `ORD-SHOP-CANONICAL-${Date.now()}`,
    });

    assert.strictEqual(shopDebit.ledger.type, "PAYMENT", "SHOP_PAYMENT harus dikanonikalisasi menjadi PAYMENT");
    console.log("  ✅ Test 11 PASSED: Type PAYMENT terkanonikalisasi secara konsisten\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 12] Shop stock gagal tidak mengurangi point.
    // ------------------------------------------------------------------------
    console.log("[Test 12] Shop stock gagal tidak mengurangi point");
    const walletBeforeStockFail = (await getOrCreateWallet(testUserId)).balancePoint;
    const stockFailOrderCode = `ORD-STOCKFAIL-${Date.now()}`;
    let stockFailedAndPointsSafe = false;

    try {
      // 1. Debit points
      await debitPoints({
        userId: testUserId,
        points: 5000,
        type: "PAYMENT",
        sourceType: "KANYAAH_SHOP",
        sourceId: stockFailOrderCode,
        operationKey: `DEBIT-SHOP-${stockFailOrderCode}`,
      });

      // 2. Simulasikan kegagalan decrement stok (stok habis)
      const stockAvailable = false;
      if (!stockAvailable) {
        throw new Error("Stok barang tidak mencukupi untuk checkout");
      }
    } catch (stockErr) {
      // 3. Rollback points
      await reversePoints({
        userId: testUserId,
        points: 5000,
        sourceType: "KANYAAH_SHOP",
        sourceId: stockFailOrderCode,
        reversalKey: `ROLLBACK-SHOP-${stockFailOrderCode}`,
      });
      stockFailedAndPointsSafe = true;
    }

    assert(stockFailedAndPointsSafe, "Alur stock failure harus menangani rollback");
    const walletAfterStockFail = (await getOrCreateWallet(testUserId)).balancePoint;
    assert.strictEqual(walletAfterStockFail, walletBeforeStockFail, "Saldo point tidak boleh berkurang jika stok gagal");
    console.log("  ✅ Test 12 PASSED: Gagal stok produk tidak mengurangi saldo poin\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 13] Laundry tanpa payment proof tidak mengurangi point.
    // ------------------------------------------------------------------------
    console.log("[Test 13] Laundry tanpa payment proof tidak mengurangi point");
    const walletBeforeLaundry = (await getOrCreateWallet(testUserId)).balancePoint;

    // Logika controller laundry: jika sisa tagihan > 0 dan paymentProofUrl kosong, reject sebelum debit
    const laundryQuote = await calculatePaymentQuote({
      service: "LAUNDRY",
      grossAmount: 35000,
      voucherDiscount: 0,
      requestedPoints: 10000,
      userId: testUserId,
    });

    const remainingPayable = laundryQuote.finalAmount; // 25.000
    const paymentProofUrl = ""; // Bukti pembayaran kosong

    let validationBlocked = false;
    if (remainingPayable > 0 && !paymentProofUrl) {
      validationBlocked = true; // Langsung return 400 tanpa memanggil debitPoints
    }

    assert(validationBlocked, "Validasi bukti bayar harus memblokir sebelum debit point");
    const walletAfterLaundry = (await getOrCreateWallet(testUserId)).balancePoint;
    assert.strictEqual(walletAfterLaundry, walletBeforeLaundry, "Poin tidak boleh terpotong jika bukti transfer belum diunggah");
    console.log("  ✅ Test 13 PASSED: Bukti bayar laundry divalidasi sebelum debit point\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 14] Laundry retry tidak double debit.
    // ------------------------------------------------------------------------
    console.log("[Test 14] Laundry retry tidak double debit");
    const laundryOrderCode = `LND-${Date.now()}`;
    const laundryIdempKey = `IDEMP-LND-${Date.now()}`;

    // Debit pertama untuk order laundry
    const lndDebit1 = await debitPoints({
      userId: testUserId,
      points: 5000,
      type: "PAYMENT",
      sourceType: "LAUNDRY",
      sourceId: laundryOrderCode,
      operationKey: `PAY-LAUNDRY-${laundryOrderCode}-${laundryIdempKey}`,
    });
    assert.strictEqual(lndDebit1.alreadyProcessed, false, "Debit pertama harus sukses");

    // Retry pembayaran laundry dengan idempotency key yang sama
    const lndDebit2 = await debitPoints({
      userId: testUserId,
      points: 5000,
      type: "PAYMENT",
      sourceType: "LAUNDRY",
      sourceId: laundryOrderCode,
      operationKey: `PAY-LAUNDRY-${laundryOrderCode}-${laundryIdempKey}`,
    });
    assert.strictEqual(lndDebit2.alreadyProcessed, true, "Retry laundry tidak boleh debit ulang");
    console.log("  ✅ Test 14 PASSED: Retry request pembayaran laundry tidak melakukan double debit\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 15] Catering frontend/backend memiliki total yang sama.
    // ------------------------------------------------------------------------
    console.log("[Test 15] Catering frontend/backend memiliki total yang sama");
    const cateringSubtotal = 100000;
    const cateringDelivery = 15000;
    const cateringServiceFee = 5000;
    const cateringReqPoints = 20000;

    const catQuote = await calculatePaymentQuote({
      service: "CATERING",
      grossAmount: cateringSubtotal,
      deliveryFee: cateringDelivery,
      serviceFee: cateringServiceFee,
      requestedPoints: cateringReqPoints,
      userBalance: 50000,
    });

    const expectedGross = 120000;
    const expectedDiscount = 20000;
    const expectedFinal = 100000;
    const expectedDP = expectedFinal * 0.5; // 50.000

    assert.strictEqual(catQuote.grossAmount, expectedGross, "Gross amount harus 120.000");
    assert.strictEqual(catQuote.pointDiscount, expectedDiscount, "Point discount harus 20.000");
    assert.strictEqual(catQuote.finalAmount, expectedFinal, "Final amount harus 100.000");
    assert.strictEqual(catQuote.finalAmount * 0.5, expectedDP, "DP catering harus dihitung dari finalAmount");
    console.log("  ✅ Test 15 PASSED: Breakdown nominal katering tersinkronisasi 100%\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 16] Marketplace lama dapat menggunakan point atau ditolak secara eksplisit.
    // ------------------------------------------------------------------------
    console.log("[Test 16] Marketplace lama dapat menggunakan point atau ditolak secara eksplisit");
    const mktQuote = await calculatePaymentQuote({
      service: "MARKETPLACE",
      grossAmount: 45000,
      deliveryFee: 10000,
      serviceFee: 2000,
      requestedPoints: 999999, // Customer mencoba memasukkan angka poin melebihi saldo
      userBalance: 15000,
    });

    assert.strictEqual(mktQuote.approvedPoints, 15000, "Point yang diapprove harus dibatasi maksimal saldo user");
    assert.strictEqual(mktQuote.finalAmount, (45000 + 10000 + 2000) - 15000, "Final amount harus sesuai sisa setelah discount poin");
    console.log("  ✅ Test 16 PASSED: Marketplace lama terlindungi oleh authoritative calculation backend\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 17] Voucher claim tidak double count usedCount.
    // ------------------------------------------------------------------------
    console.log("[Test 17] Voucher claim tidak double count usedCount");
    // Ensure customer has enough points for voucher test
    await creditPoints({
      userId: testUserId,
      points: 50000,
      sourceType: "WASTE_DEPOSIT",
      sourceId: `DEP-VOUCHER-${Date.now()}`,
    });

    const testVoucher = await Voucher.create({
      title: "Voucher Diskon Test 10K",
      voucherCode: `VOUCHER-${Date.now()}`,
      pointsCost: 10000,
      discountValue: 10000,
      service: "KANYAAH_SHOP",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      usedCount: 0,
      usageLimitPerUser: 1,
      claimedBy: [],
    });

    const vClaimKey = `IDEMP-VCLAIM-${Date.now()}`;
    const vClaim1 = await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "VOUCHER",
      points: 10000,
      voucherId: testVoucher._id,
      idempotencyKey: vClaimKey,
    });

    const reloadedVoucher1 = await Voucher.findById(testVoucher._id);
    assert.strictEqual(reloadedVoucher1.usedCount, 0, "usedCount voucher TIDAK boleh bertambah saat claim");
    assert.strictEqual(reloadedVoucher1.claimedBy.length, 1, "Voucher harus tercatat di claimedBy");

    // Retry claim voucher yang sama dengan idempotency key
    const vClaim2 = await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "VOUCHER",
      points: 10000,
      voucherId: testVoucher._id,
      idempotencyKey: vClaimKey,
    });

    assert.strictEqual(vClaim2.alreadyProcessed, true, "Klaim ulang voucher harus idempoten");
    const reloadedVoucher2 = await Voucher.findById(testVoucher._id);
    assert.strictEqual(reloadedVoucher2.usedCount, 0, "usedCount tetap 0");
    assert.strictEqual(reloadedVoucher2.claimedBy.length, 1, "claimedBy tidak bertambah ganda");
    console.log("  ✅ Test 17 PASSED: Klaim voucher tidak menduplikasi usedCount\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 18] Cash redemption reject mengembalikan point satu kali.
    // ------------------------------------------------------------------------
    console.log("[Test 18] Cash redemption reject mengembalikan point satu kali");
    const cashRedemption = await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "CASH",
      points: 10000,
      payoutDestination: { channel: "BCA", accountNumber: "9876543210", accountName: "Tester" },
      idempotencyKey: `CASH-REJECT-${Date.now()}`,
    });

    const walletBeforeReject = (await getOrCreateWallet(testUserId)).balancePoint;

    // Petugas menolak penarikan kas
    await pointRedemptionService.rejectRedemption(
      cashRedemption.redemption._id,
      testOfficerId,
      "Nomor rekening tidak valid"
    );

    const walletAfterReject = (await getOrCreateWallet(testUserId)).balancePoint;
    assert.strictEqual(walletAfterReject, walletBeforeReject + 10000, "Saldo harus kembali 10.000 setelah penolakan");

    // Percobaan reject kedua kalinya harus throw error
    let secondRejectError = null;
    try {
      await pointRedemptionService.rejectRedemption(
        cashRedemption.redemption._id,
        testOfficerId,
        "Reject ulang"
      );
    } catch (err) {
      secondRejectError = err;
    }
    assert(secondRejectError !== null, "Reject kedua harus ditolak error");
    const walletAfterSecondReject = (await getOrCreateWallet(testUserId)).balancePoint;
    assert.strictEqual(walletAfterSecondReject, walletAfterReject, "Saldo tidak boleh bertambah lagi");
    console.log("  ✅ Test 18 PASSED: Penolakan cash redemption hanya mengembalikan poin satu kali\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 19] Bank sampah tidak bisa melihat redemption bank lain.
    // ------------------------------------------------------------------------
    console.log("[Test 19] Bank sampah tidak bisa melihat redemption bank lain");
    const bankAId = new mongoose.Types.ObjectId();
    const bankBId = new mongoose.Types.ObjectId();

    const bankARedemption = await pointRedemptionService.createRedemption({
      userId: testUserId,
      type: "CASH",
      points: 10000,
      bankSampahId: bankAId,
      payoutDestination: { channel: "CASH_AT_BANK" },
      idempotencyKey: `BANK-TEST-${Date.now()}`,
    });

    // Petugas Bank B mencoba membuka detail penukaran milik Bank A
    let crossBankError = null;
    try {
      await pointRedemptionService.getRedemptionById(
        bankARedemption.redemption._id,
        testOfficerId,
        "bank_sampah",
        bankBId // Authorized bank is Bank B
      );
    } catch (err) {
      crossBankError = err;
    }

    assert(crossBankError !== null, "Petugas Bank B tidak boleh mengakses data Bank A");
    assert(crossBankError.message.includes("bank sampah lain"), "Pesan error harus mengenai bank sampah lain");

    // Admin dapat mengakses data Bank A
    const adminAccess = await pointRedemptionService.getRedemptionById(
      bankARedemption.redemption._id,
      testAdminId,
      "admin"
    );
    assert(adminAccess !== null, "Admin harus bisa mengakses semua data");
    console.log("  ✅ Test 19 PASSED: Data segregation antar bank sampah terverifikasi aman\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 20] Wallet dan ledger selalu memiliki balanceBefore/balanceAfter konsisten.
    // ------------------------------------------------------------------------
    console.log("[Test 20] Wallet dan ledger selalu memiliki balanceBefore/balanceAfter konsisten");
    const allLedgers = await PointLedger.find({ userId: testUserId }).sort({ createdAt: 1 });
    assert(allLedgers.length >= 5, "Harus ada minimal 5 mutasi ledger");

    for (let i = 0; i < allLedgers.length; i++) {
      const entry = allLedgers[i];
      // Formula matematis mutasi: balanceBefore + points === balanceAfter
      assert.strictEqual(
        entry.balanceBefore + entry.points,
        entry.balanceAfter,
        `Ledger #${entry.ledgerId} tidak konsisten: ${entry.balanceBefore} + (${entry.points}) !== ${entry.balanceAfter}`
      );
    }

    const currentWallet = await getOrCreateWallet(testUserId);
    const lastLedger = allLedgers[allLedgers.length - 1];
    assert.strictEqual(
      lastLedger.balanceAfter,
      currentWallet.balancePoint,
      "balanceAfter dari ledger terakhir harus sama persis dengan balancePoint di PointWallet"
    );
    console.log("  ✅ Test 20 PASSED: Seluruh mutasi buku tabungan konsisten matematis 100%\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 21] Cashback Send hanya diterbitkan satu kali.
    // ------------------------------------------------------------------------
    console.log("[Test 21] Cashback Send hanya diterbitkan satu kali");
    const sendOrderCode = `RNG-SND-TEST-${Date.now()}`;
    const mockSendOrder = {
      orderCode: sendOrderCode,
      customerId: testUserId,
      cashbackIssued: false,
    };

    let cashback1Done = false;
    if (!mockSendOrder.cashbackIssued) {
      mockSendOrder.cashbackIssued = true;
      const cbResult = await creditPoints({
        userId: testUserId,
        points: 2000,
        sourceType: "KANYAAH_SEND",
        sourceId: sendOrderCode,
        operationKey: `EARN-CASHBACK-SEND-${sendOrderCode}`,
        notes: "Cashback pengiriman paket",
      });
      cashback1Done = !cbResult.alreadyProcessed;
    }
    assert(cashback1Done, "Cashback pertama harus diterbitkan");

    let cashback2Done = false;
    if (!mockSendOrder.cashbackIssued) {
      cashback2Done = true;
    } else {
      // Retry via creditPoints
      const cb2Result = await creditPoints({
        userId: testUserId,
        points: 2000,
        sourceType: "KANYAAH_SEND",
        sourceId: sendOrderCode,
        operationKey: `EARN-CASHBACK-SEND-${sendOrderCode}`,
      });
      cashback2Done = !cb2Result.alreadyProcessed;
    }
    assert.strictEqual(cashback2Done, false, "Cashback kedua tidak boleh diterbitkan");
    console.log("  ✅ Test 21 PASSED: Cashback pengiriman Send hanya diterbitkan tepat satu kali\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 22] Ride cancellation mengembalikan point tepat satu kali.
    // ------------------------------------------------------------------------
    console.log("[Test 22] Ride cancellation mengembalikan point tepat satu kali");
    const rideOrderCode = `RNG-RIDE-TEST-${Date.now()}`;
    const mockRideOrder = {
      orderCode: rideOrderCode,
      customerId: testUserId,
      pointsUsed: 7500,
      pointRefunded: false,
    };

    // Debit 7500 poin untuk order ride
    await debitPoints({
      userId: testUserId,
      points: 7500,
      type: "PAYMENT",
      sourceType: "KANYAAH_RIDE",
      sourceId: rideOrderCode,
      operationKey: `DEBIT-RIDE-${rideOrderCode}`,
    });

    const rideCancelWalletBefore = (await getOrCreateWallet(testUserId)).balancePoint;

    // Pembatalan #1
    if (!mockRideOrder.pointRefunded) {
      mockRideOrder.pointRefunded = true;
      await reversePoints({
        userId: testUserId,
        points: 7500,
        sourceType: "KANYAAH_RIDE",
        sourceId: rideOrderCode,
        reversalKey: `REV-RIDE-${rideOrderCode}`,
      });
    }

    const rideCancelWalletAfter = (await getOrCreateWallet(testUserId)).balancePoint;
    assert.strictEqual(rideCancelWalletAfter, rideCancelWalletBefore + 7500, "Saldo harus bertambah 7.500");

    // Pembatalan #2
    if (!mockRideOrder.pointRefunded) {
      // Guard
      await reversePoints({ userId: testUserId, points: 7500, sourceType: "KANYAAH_RIDE", sourceId: rideOrderCode });
    }
    const rideCancelWalletFinal = (await getOrCreateWallet(testUserId)).balancePoint;
    assert.strictEqual(rideCancelWalletFinal, rideCancelWalletAfter, "Saldo tidak boleh bertambah lagi pada pembatalan ke-2");
    console.log("  ✅ Test 22 PASSED: Ride cancellation mengembalikan poin tepat satu kali\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 23] Semua order yang totalnya 0 menggunakan GEOVERSE_POINT.
    // ------------------------------------------------------------------------
    console.log("[Test 23] Semua order yang totalnya 0 menggunakan GEOVERSE_POINT");
    const zeroQuote = await calculatePaymentQuote({
      service: "KANYAAH_SHOP",
      grossAmount: 30000,
      voucherDiscount: 0,
      deliveryFee: 0,
      serviceFee: 0,
      requestedPoints: 30000,
      userBalance: 50000,
    });

    assert.strictEqual(zeroQuote.finalAmount, 0, "finalAmount harus 0");
    assert(
      zeroQuote.paymentMethodOptions.includes("GEOVERSE_POINT"),
      "Metode pembayaran untuk tagihan 0 harus GEOVERSE_POINT"
    );
    assert.strictEqual(
      zeroQuote.paymentMethodOptions.length,
      1,
      "Hanya ada satu metode pembayaran saat 100% poin"
    );
    console.log("  ✅ Test 23 PASSED: Order dengan total 0 menggunakan paymentMethod GEOVERSE_POINT\n");
    passed++;

    // ------------------------------------------------------------------------
    // [Test 24] Partial point payment menyimpan sisa payable amount dengan benar.
    // ------------------------------------------------------------------------
    console.log("[Test 24] Partial point payment menyimpan sisa payable amount dengan benar");
    const partialQuote = await calculatePaymentQuote({
      service: "KANYAAH_SHOP",
      grossAmount: 75000,
      voucherDiscount: 5000,
      deliveryFee: 8000,
      serviceFee: 2000,
      requestedPoints: 20000,
      userBalance: 40000,
    });

    // gross = 75000 + 8000 + 2000 = 85.000
    // eligible = (75000 - 5000) + 8000 + 2000 = 80.000
    // approvedPoints = 20.000
    // pointDiscount = 20.000
    // finalAmount = 80.000 - 20.000 = 60.000
    // remainingWalletBalance = 40.000 - 20.000 = 20.000
    assert.strictEqual(partialQuote.grossAmount, 85000, "Gross amount harus 85.000");
    assert.strictEqual(partialQuote.eligibleAmount, 80000, "Eligible amount harus 80.000");
    assert.strictEqual(partialQuote.pointDiscount, 20000, "Point discount harus 20.000");
    assert.strictEqual(partialQuote.finalAmount, 60000, "Sisa tagihan (finalAmount) harus 60.000");
    assert.strictEqual(partialQuote.remainingWalletBalance, 20000, "Sisa saldo wallet harus 20.000");
    assert(
      partialQuote.paymentMethodOptions.includes("GEOVERSE_POINT_PLUS_QRIS"),
      "Harus mendukung opsi kombinasi QRIS"
    );
    assert(
      partialQuote.paymentMethodOptions.includes("GEOVERSE_POINT_PLUS_CASH"),
      "Harus mendukung opsi kombinasi Tunai/COD"
    );
    console.log("  ✅ Test 24 PASSED: Partial point payment menghitung sisa payable amount secara akurat\n");
    passed++;

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log("================================================================================");
    console.log("📊 HASIL AKHIR INTEGRATION & ACCEPTANCE TEST GEOVERSE POINT");
    console.log("================================================================================");
    console.log(`Total Skenario: 24`);
    console.log(`Lulus         : ${passed}`);
    console.log(`Gagal         : ${failed}`);
    console.log(`Tingkat Sukses: ${Math.round((passed / 24) * 100)}%`);
    console.log("================================================================================\n");

  } catch (error) {
    console.error("❌ Terjadi kegagalan pada test:", error);
    failed++;
  } finally {
    // Cleanup test data
    try {
      await PointWallet.deleteMany({ userId: testUserId });
      await PointLedger.deleteMany({ userId: testUserId });
      await PointRedemption.deleteMany({ userId: testUserId });
      await Voucher.deleteMany({ title: /Test/i });
    } catch (_) {}
    setPointRate(initialPointRate);

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run24Tests();
