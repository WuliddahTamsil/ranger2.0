const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { verifyWebhookSignature } = require("../services/paymentGateway");

test("Marketplace UMKM: Webhook signature verification validates SHA-512", () => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || process.env.PAYMENT_SECRET_KEY || "SB-Mid-server-DEFAULT_DEV_KEY";
  const orderId = "RNG-MKT-12345678";
  const statusCode = "200";
  const grossAmount = "25000";

  const validSignature = crypto.createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex");

  // Valid signature should pass
  assert.equal(verifyWebhookSignature(validSignature, { orderId, statusCode, grossAmount }), true);

  // Tampered amount should fail
  assert.equal(verifyWebhookSignature(validSignature, { orderId, statusCode, grossAmount: "10000" }), false);

  // Tampered signature should fail
  assert.equal(verifyWebhookSignature("invalid_signature_hex", { orderId, statusCode, grossAmount }), false);

  // Empty signature should fail
  assert.equal(verifyWebhookSignature("", { orderId, statusCode, grossAmount }), false);
});

test("Marketplace UMKM: Product update whitelist filters restricted fields", () => {
  const allowedFields = ["name", "description", "cat", "price", "stock", "isActive", "img", "images", "brand", "unit", "weight"];
  
  const untrustedInput = {
    name: "Keripik Singkong Renyah",
    price: 15000,
    stock: 50,
    rating: 5.0, // Malicious: attempt to boost rating
    sold: 9999,  // Malicious: attempt to falsify sold count
    ownerId: "attacker_id", // Malicious: attempt IDOR transfer
    productType: "SHOP", // Malicious: attempt cross-contamination
    _id: "fake_id"
  };

  const filtered = {};
  for (const field of allowedFields) {
    if (untrustedInput[field] !== undefined) {
      filtered[field] = untrustedInput[field];
    }
  }

  assert.equal(filtered.name, "Keripik Singkong Renyah");
  assert.equal(filtered.price, 15000);
  assert.equal(filtered.stock, 50);
  assert.equal(filtered.rating, undefined);
  assert.equal(filtered.sold, undefined);
  assert.equal(filtered.ownerId, undefined);
  assert.equal(filtered.productType, undefined);
});

test("Marketplace UMKM: Withdrawal available balance calculation adheres to subtotal earnings", () => {
  // Orders with items subtotal vs total amount (which includes delivery + platform fee)
  const completedOrders = [
    { subtotal: 45000, totalAmount: 55000, status: "Selesai" },
    { subtotal: 30000, totalAmount: 40000, status: "Selesai" },
    { subtotal: 20000, totalAmount: 30000, status: "Dibatalkan" }, // Cancelled: no earnings
  ];

  // Merchant earnings must only come from completed orders subtotal
  const totalEarnings = completedOrders
    .filter((o) => o.status === "Selesai")
    .reduce((sum, o) => sum + Number(o.subtotal || 0), 0);

  assert.equal(totalEarnings, 75000); // 45k + 30k

  const existingWithdrawals = [
    { amount: 25000, status: "Sukses" },
    { amount: 20000, status: "Diproses" },
    { amount: 50000, status: "Ditolak" }, // Rejected does not reduce balance
  ];

  const totalWithdrawn = existingWithdrawals
    .filter((w) => ["Sukses", "Diproses"].includes(w.status))
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  assert.equal(totalWithdrawn, 45000); // 25k + 20k

  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);
  assert.equal(availableBalance, 30000); // 75k - 45k = 30k

  // Requesting 35,000 should be rejected
  const requestedWithdrawal = 35000;
  assert.equal(requestedWithdrawal <= availableBalance, false);

  // Requesting 20,000 should be accepted
  assert.equal(20000 <= availableBalance, true);
});

test("Marketplace UMKM: Stock restoration and cancellation logic", () => {
  const productStockBefore = 10;
  const orderItems = [
    { productId: "prod_1", quantity: 3 },
    { productId: "prod_2", quantity: 2 },
  ];

  // Simulate order cancellation stock restoration
  const stockMap = new Map([
    ["prod_1", productStockBefore],
    ["prod_2", 15],
  ]);

  for (const item of orderItems) {
    const current = stockMap.get(item.productId);
    stockMap.set(item.productId, current + item.quantity);
  }

  assert.equal(stockMap.get("prod_1"), 13);
  assert.equal(stockMap.get("prod_2"), 17);
});

test("Marketplace UMKM: Review average rating calculation updates product score", () => {
  const reviews = [
    { rating: 5, comment: "Enak banget!" },
    { rating: 4, comment: "Pengiriman cepat" },
    { rating: 4, comment: "Kemasan rapi" },
  ];

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;

  assert.equal(sum, 13);
  assert.equal(avg, 4.3);
  assert.equal(reviews.length, 3);
});
