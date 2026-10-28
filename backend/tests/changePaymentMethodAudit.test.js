const assert = require("assert");
const mongoose = require("mongoose");
require("dotenv").config({ path: "backend/.env" });

const Payment = require("../models/Payment");
const RideOrder = require("../models/RideOrder");
const {
  updateOrderPaymentMethod,
  createPayment,
} = require("../controllers/paymentController");

// Mock express req/res
const createMockReqRes = (params = {}, body = {}, authUser = null) => {
  const req = {
    params,
    body,
    authUser,
  };
  let responseData = null;
  let statusCode = 200;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };
  return { req, res };
};

const runAuditTests = async () => {
  console.log("================================================================");
  console.log("   AUDIT ALUR GANTI METODE PEMBAYARAN & PEMBUATAN PEMBAYARAN   ");
  console.log("================================================================");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rangers";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  const testCustomerId = new mongoose.Types.ObjectId().toString();
  const testOrderId = new mongoose.Types.ObjectId().toString();
  const testOrderCode = `RNG-RIDE-TEST-${Date.now().toString().slice(-6)}`;
  const expectedFare = 9500;

  try {
    // 0. Setup a clean pending RideOrder
    const orderDoc = await RideOrder.create({
      _id: testOrderId,
      orderCode: testOrderCode,
      customerId: testCustomerId,
      customerName: "Audit Test Customer",
      customerPhone: "081234567890",
      vehicleType: "MOTOR",
      pickup: { address: "Jl. Kamojang No. 1", latitude: -7.14, longitude: 107.79 },
      destination: { address: "Jl. Kamojang No. 2", latitude: -7.15, longitude: 107.80 },
      estimatedFare: expectedFare,
      totalAmount: expectedFare,
      grossAmount: expectedFare,
      paymentMethod: "QRIS",
      paymentStatus: "Menunggu Pembayaran",
      status: "SEARCHING_DRIVER",
    });

    console.log(`[SETUP] Created test RideOrder #${testOrderCode} with total Rp ${expectedFare}`);

    // SKENARIO 1 & 2: Memilih metode baru (e.g. GOPAY) dan memanggil updateOrderPaymentMethod
    // Harus memperbarui metode pada tagihan yang sama
    console.log("\n[SKENARIO 1 & 2] Verifikasi Lanjutkan Ubah Metode Pembayaran");
    const { req: updateReq, res: updateRes } = createMockReqRes(
      { orderId: testOrderId },
      { orderType: "RIDE", paymentMethod: "GOPAY" }
    );
    await updateOrderPaymentMethod(updateReq, updateRes);

    assert.strictEqual(updateRes.getStatusCode(), 200, "Update method harus menghasilkan HTTP 200");
    const updateBody = updateRes.getData();
    assert.strictEqual(updateBody.success, true, "Response harus success: true");
    assert.strictEqual(updateBody.data.paymentMethod, "GOPAY", "Metode baru harus tersimpan sebagai GOPAY");
    assert.strictEqual(updateBody.data.orderAmount, expectedFare, `Nominal harus konsisten Rp ${expectedFare}`);
    console.log("✔ Skenario 1 & 2 LULUS: Metode berhasil diubah ke GOPAY pada tagihan yang sama tanpa memicu transaksi baru.");

    // SKENARIO 3: Status pembayaran TIDAK boleh berubah menjadi lunas saat metode disimpan
    console.log("\n[SKENARIO 3] Verifikasi status tagihan tidak lunas saat metode diubah");
    const refreshedOrder = await RideOrder.findById(testOrderId).lean();
    assert.strictEqual(refreshedOrder.paymentMethod, "GOPAY", "Payment method di database harus GOPAY");
    assert.strictEqual(
      refreshedOrder.paymentStatus,
      "Menunggu Pembayaran",
      "Payment status tidak boleh berubah menjadi Lunas/PAID saat ganti metode"
    );
    console.log("✔ Skenario 3 LULUS: Status tagihan tetap 'Menunggu Pembayaran' dan tidak berubah menjadi lunas.");

    // SKENARIO 4: Tidak ada QR Code atau Payment gateway session yang tercipta saat ganti metode
    console.log("\n[SKENARIO 4] Verifikasi tidak ada sesi pembayaran / QR yang tercipta saat ganti metode");
    const paymentRecordsBefore = await Payment.find({ orderId: testOrderId, status: "PENDING" }).lean();
    assert.strictEqual(
      paymentRecordsBefore.length,
      0,
      "Tidak boleh ada sesi pembayaran PENDING yang dibuat saat ganti metode"
    );
    console.log("✔ Skenario 4 LULUS: Tidak ada QR Code atau sesi pembayaran yang dibuat saat ganti metode.");

    // SKENARIO 5: Sesi pembayaran baru hanya tercipta setelah "Lakukan Pembayaran" ditekan
    console.log("\n[SKENARIO 5] Verifikasi tombol Lakukan Pembayaran memulai sesi pembayaran dengan metode terpilih");
    const { req: payReq, res: payRes } = createMockReqRes(
      {},
      {
        orderId: testOrderId,
        orderCode: testOrderCode,
        orderType: "RIDE",
        orderCategory: "RIDE",
        amount: expectedFare,
        paymentMethod: "GOPAY",
      },
      { _id: testCustomerId, name: "Audit Test Customer", phone: "081234567890", email: "customer@test.com" }
    );
    await createPayment(payReq, payRes);

    assert.strictEqual(payRes.getStatusCode(), 201, "createPayment harus menghasilkan HTTP 201");
    const payBody = payRes.getData();
    assert.strictEqual(payBody.success, true);
    assert.strictEqual(payBody.data.paymentMethod, "GOPAY", "Payment method sesi harus GOPAY");
    assert.strictEqual(payBody.data.amount, expectedFare, `Nominal sesi harus Rp ${expectedFare}`);
    assert.strictEqual(payBody.data.status, "PENDING", "Status sesi baru harus PENDING");
    console.log("✔ Skenario 5 LULUS: Sesi pembayaran GOPAY aktif dengan nominal Rp 9.500 berhasil dibuat.");

    // SKENARIO 8: Jika pengguna kemudian mengganti metode lagi (misal ke QRIS) lalu bayar,
    // sesi pembayaran lama harus otomatis berstatus CANCELLED sehingga tidak ada beberapa sesi aktif
    console.log("\n[SKENARIO 8] Verifikasi pembatalan sesi lama agar tidak ada beberapa sesi aktif");
    const { req: updateReq2, res: updateRes2 } = createMockReqRes(
      { orderId: testOrderId },
      { orderType: "RIDE", paymentMethod: "QRIS" }
    );
    await updateOrderPaymentMethod(updateReq2, updateRes2);

    const oldSessionCancelled = await Payment.findOne({ orderId: testOrderId, paymentMethod: "GOPAY" }).lean();
    assert.strictEqual(
      oldSessionCancelled.status,
      "CANCELLED",
      "Sesi pembayaran lama harus di-CANCELLED saat metode diubah"
    );
    console.log("✔ Skenario 8 LULUS: Sesi lama berhasil dibatalkan (CANCELLED) sehingga tidak ada instruksi ganda aktif.");

    // SKENARIO 6: Kegagalan saat mengganti metode (ID salah)
    console.log("\n[SKENARIO 6] Verifikasi penanganan kegagalan jika orderId tidak valid");
    const fakeOrderId = new mongoose.Types.ObjectId().toString();
    const { req: failReq, res: failRes } = createMockReqRes(
      { orderId: fakeOrderId },
      { orderType: "RIDE", paymentMethod: "BCA_VA" }
    );
    await updateOrderPaymentMethod(failReq, failRes);

    assert.strictEqual(failRes.getStatusCode(), 404, "Order tidak ditemukan harus menghasilkan HTTP 404");
    assert.strictEqual(failRes.getData().success, false, "Response harus success: false");
    console.log("✔ Skenario 6 LULUS: Server menolak dengan 404 jika orderId tidak ditemukan.");

    // SKENARIO 7: Verifikasi konsistensi nominal (tidak pernah menjadi Rp0)
    console.log("\n[SKENARIO 7] Verifikasi konsistensi nominal tagihan tetap Rp 9.500 (bukan Rp 0)");
    const finalOrder = await RideOrder.findById(testOrderId).lean();
    assert.strictEqual(finalOrder.totalAmount, expectedFare, "totalAmount harus Rp 9.500");
    assert.strictEqual(finalOrder.estimatedFare, expectedFare, "estimatedFare harus Rp 9.500");
    assert.notStrictEqual(finalOrder.totalAmount, 0, "Nominal tidak boleh 0");
    console.log("✔ Skenario 7 LULUS: Nominal konsisten Rp 9.500 dan tidak pernah menjadi Rp 0.");

    console.log("\n================================================================");
    console.log("   SEMUA 8 SKENARIO AUDIT GANTI METODE PEMBAYARAN LULUS 100%   ");
    console.log("================================================================");
  } finally {
    // Cleanup
    await RideOrder.deleteOne({ _id: testOrderId });
    await Payment.deleteMany({ orderId: testOrderId });
    await mongoose.disconnect();
  }
};

runAuditTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  });
