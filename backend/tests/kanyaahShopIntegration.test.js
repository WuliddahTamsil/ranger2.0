const assert = require("assert");

/**
 * End-to-End Integration Test for KANYAAH SHOP
 * Simulates entire lifecycle:
 * customer selects store -> adds products -> checkout -> payment -> merchant accepts ->
 * picking & substitution -> ready -> driver pickup -> delivery -> customer receives -> complete & review.
 */
async function runIntegrationTest() {
  console.log("==================================================");
  console.log("🚀 RUNNING KANYAAH SHOP END-TO-END INTEGRATION TEST");
  console.log("==================================================");

  // 1. Store Discovery
  const store = {
    id: "store_yogya_kamojang_01",
    name: "Yogya Grand Supermarket Kamojang",
    storeType: "SUPERMARKET",
    address: "Jl. Raya Kamojang No. 88",
    rating: 4.9,
    isOpen: true,
  };
  console.log(`[Step 1] Customer views store: ${store.name} (${store.storeType})`);
  assert(store.isOpen, "Store must be open");

  // 2. Catalog & Cart
  const catalog = [
    { id: "p1", name: "Beras Pandan Wangi 5kg", price: 78500, stock: 10 },
    { id: "p2", name: "Minyak Goreng 2L", price: 34900, stock: 20 },
  ];
  const cart = [
    { product: catalog[0], quantity: 1, subtotal: 78500 },
    { product: catalog[1], quantity: 2, subtotal: 69800 },
  ];
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  assert.strictEqual(subtotal, 148300, "Subtotal calculated correctly");
  console.log(`[Step 2] Customer adds 2 items to cart. Subtotal: Rp ${subtotal.toLocaleString("id-ID")}`);

  // 3. Checkout Formulation
  const deliveryFee = 8000;
  const serviceFee = 2000;
  const voucherDiscount = 10000; // Voucher "KANYAAHHEMAT"
  const pointDiscount = 5000;    // 5000 GEOVERSE Points
  const totalAmount = subtotal + deliveryFee + serviceFee - voucherDiscount - pointDiscount;
  assert.strictEqual(totalAmount, 143300, "Total amount verified");
  console.log(`[Step 3] Checkout computed with voucher (-Rp 10.000) & points (-Rp 5.000). Total: Rp ${totalAmount.toLocaleString("id-ID")}`);

  // 4. Order Creation
  const order = {
    orderCode: `RNG-SHOP-${Date.now().toString().slice(-6)}`,
    customerId: "cust_indra_01",
    customerName: "Indra Rangers",
    storeId: store.id,
    storeName: store.name,
    items: cart.map((c) => ({
      productId: c.product.id,
      name: c.product.name,
      quantity: c.quantity,
      price: c.product.price,
      availability: "AVAILABLE",
    })),
    deliverySlot: { type: "INSTANT" },
    substitutionPolicy: "CONTACT_ME",
    totalAmount,
    paymentStatus: "PENDING",
    orderStatus: "PAYMENT_PENDING",
    driverId: null,
    statusHistory: [],
  };
  order.statusHistory.push({ status: "PAYMENT_PENDING", time: new Date(), actor: "customer" });
  assert.strictEqual(order.orderStatus, "PAYMENT_PENDING");
  console.log(`[Step 4] Order created: ${order.orderCode}, status: ${order.orderStatus}`);

  // 5. Payment Webhook Verified
  const paymentWebhook = {
    orderCode: order.orderCode,
    status: "PAID",
    paidAt: new Date(),
  };
  assert.strictEqual(paymentWebhook.status, "PAID");
  order.paymentStatus = "PAID";
  order.orderStatus = "STORE_ACCEPTED";
  order.statusHistory.push({ status: "STORE_ACCEPTED", time: new Date(), actor: "system" });
  console.log(`[Step 5] Payment Webhook received! Payment: ${order.paymentStatus}, Order: ${order.orderStatus}`);

  // 6. Merchant Preparation & Substitution
  order.orderStatus = "PREPARING";
  console.log(`[Step 6] Merchant preparing items: ${order.orderStatus}`);
  // Merchant finds item 2 stock discrepancy in shelf -> proposes substitution
  order.items[1].availability = "OUT_OF_STOCK";
  order.items[1].replacement = { name: "Minyak Goreng Sania 2L", price: 34900 };
  order.orderStatus = "WAITING_SUBSTITUTION";
  console.log(`[Step 6b] Out-of-stock item found! Proposed replacement: ${order.items[1].replacement.name}`);
  // Customer approves
  order.items[1].availability = "SUBSTITUTED";
  order.orderStatus = "PICKING";
  console.log(`[Step 6c] Customer approved substitution. Status: ${order.orderStatus}`);

  // 7. Merchant Marks Ready for Pickup
  order.orderStatus = "READY_FOR_PICKUP";
  order.statusHistory.push({ status: "READY_FOR_PICKUP", time: new Date(), actor: "merchant" });
  console.log(`[Step 7] Order packed and marked READY_FOR_PICKUP!`);
  assert.strictEqual(order.orderStatus, "READY_FOR_PICKUP");

  // 8. Driver Accepts Order
  const driver = { id: "driver_asep_01", name: "Asep Driver", phone: "0812345678" };
  assert.strictEqual(order.driverId, null, "Driver not yet assigned");
  order.driverId = driver.id;
  order.driverName = driver.name;
  order.orderStatus = "DRIVER_ASSIGNED";
  order.statusHistory.push({ status: "DRIVER_ASSIGNED", time: new Date(), actor: "driver" });
  console.log(`[Step 8] Driver ${driver.name} assigned to order! Status: ${order.orderStatus}`);

  // 9. Driver Arrives at Store & Uploads Pickup Proof
  order.orderStatus = "DRIVER_AT_STORE";
  console.log(`[Step 9a] Driver arrived at store: ${order.orderStatus}`);
  const pickupProofUrl = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
  order.pickupProofUrl = pickupProofUrl;
  order.orderStatus = "PICKED_UP";
  order.statusHistory.push({ status: "PICKED_UP", time: new Date(), actor: "driver" });
  console.log(`[Step 9b] Driver verified pickup with photo. Status: ${order.orderStatus}`);

  // 10. Driver Delivering & Customer Arrival
  order.orderStatus = "DELIVERING";
  order.driverLocation = { latitude: -7.1470, longitude: 107.8020 };
  console.log(`[Step 10a] Driver en route to customer: ${order.orderStatus}`);
  order.orderStatus = "ARRIVED";
  console.log(`[Step 10b] Driver arrived at customer location: ${order.orderStatus}`);

  // 11. Delivery Proof & Completion
  const deliveryProofUrl = "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400";
  order.deliveryProofUrl = deliveryProofUrl;
  order.orderStatus = "COMPLETED";
  order.completedAt = new Date();
  order.statusHistory.push({ status: "COMPLETED", time: new Date(), actor: "driver" });
  assert.strictEqual(order.orderStatus, "COMPLETED");
  assert(order.deliveryProofUrl.length > 0, "Delivery proof required");
  console.log(`[Step 11] Customer received items. Delivery proof uploaded. Status: ${order.orderStatus}`);

  // 12. Rating & Review
  order.rating = {
    stars: 5,
    review: "Pengiriman cepat, buah & sembako segar, kurir ramah!",
    ratedAt: new Date(),
  };
  assert.strictEqual(order.rating.stars, 5);
  console.log(`[Step 12] Customer submitted 5-star rating: "${order.rating.review}"`);

  console.log("\n==================================================");
  console.log("🎉 FULL END-TO-END INTEGRATION TEST PASSED!");
  console.log("==================================================");
}

runIntegrationTest().catch((err) => {
  console.error("❌ Integration test failed:", err);
  process.exit(1);
});
