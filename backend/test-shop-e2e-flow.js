const fetch = require("node-fetch");

const BASE_URL = process.env.TEST_API_URL || "https://ranger20-production.up.railway.app/api";

const CUSTOMER_CREDENTIALS = {
  email: "wuliddahtamsilbarokah19@gmail.com",
  password: "12345678",
};

const MERCHANT_CREDENTIALS = {
  email: "dyaskaaa@gmail.com",
  password: "19012005Wu!",
};

const DRIVER_CREDENTIALS = {
  email: "barokah@gmail.com",
  password: "12345678",
};

async function login(email, password, label) {
  console.log(`\n🔑 [${label}] Logging in with ${email}...`);
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${label}: ${data.message || res.statusText}`);
  }
  console.log(`✅ [${label}] Login success! User ID: ${data.data?.user?._id || data.data?._id}, Role: ${data.data?.user?.role || data.data?.role}`);
  return {
    token: data.data?.token || data.token,
    user: data.data?.user || data.data,
  };
}

async function runE2ETest() {
  console.log("==========================================================");
  console.log("🚀 STARTING E2E TEST: KANYAAH SHOP FULL ORDER & DELIVERY FLOW");
  console.log("==========================================================");

  // 1. Authenticate all three actors
  const customerAuth = await login(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password, "CUSTOMER");
  const merchantAuth = await login(MERCHANT_CREDENTIALS.email, MERCHANT_CREDENTIALS.password, "MERCHANT");
  const driverAuth = await login(DRIVER_CREDENTIALS.email, DRIVER_CREDENTIALS.password, "DRIVER");

  // 2. Fetch Merchant Store and Products
  console.log("\n📦 [CUSTOMER] Fetching store and products for Dyaska's shop...");
  const merchantStoreRes = await fetch(`${BASE_URL}/shop/merchant/store`, {
    headers: { Authorization: `Bearer ${merchantAuth.token}` },
  });
  const merchantStoreData = await merchantStoreRes.json();
  if (!merchantStoreData.success || !merchantStoreData.data) {
    throw new Error(`Could not find merchant store: ${merchantStoreData.message}`);
  }
  const store = merchantStoreData.data;
  console.log(`🏬 Merchant Store: "${store.name}" (ID: ${store._id}, Status: ${store.status})`);

  // Fetch products
  const productsRes = await fetch(`${BASE_URL}/shop/stores/${store._id}/products?limit=5`);
  const productsData = await productsRes.json();
  if (!productsData.success || !productsData.data || productsData.data.length === 0) {
    throw new Error("No products found in store to purchase");
  }

  const selectedProduct = productsData.data.find((p) => p.stock > 0 && !p.requiresPrescription) || productsData.data[0];
  console.log(`🛒 Selected Product: "${selectedProduct.name}" (Price: Rp ${selectedProduct.price.toLocaleString()}, Stock: ${selectedProduct.stock})`);

  // Ensure stock is at least 5 for testing
  if (selectedProduct.stock < 1) {
    console.log("⚠️ Stock low, restocking 10 units...");
    await fetch(`${BASE_URL}/shop/products/${selectedProduct._id}/stock`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${merchantAuth.token}`,
      },
      body: JSON.stringify({ quantity: 10, type: "RESTOCK", note: "Restock for E2E testing" }),
    });
  }

  // 3. Customer creates order
  console.log("\n🛍️ [CUSTOMER] Creating order for product...");
  const orderPayload = {
    storeId: store._id,
    items: [
      {
        productId: selectedProduct._id,
        quantity: 1,
        notes: "Tolong pilihkan yang masa kadaluarsa masih lama ya kak",
      },
    ],
    deliveryAddress: "Jl. Dipati Ukur No. 45, Coblong, Bandung",
    deliveryLatitude: -6.8925,
    deliveryLongitude: 107.6174,
    deliveryNotes: "Pagar hitam, tolong titip di pos satpam jika tidak ada orang",
    deliverySlot: { type: "INSTANT" },
    substitutionPolicy: "CONTACT_ME",
    paymentMethod: "CASH",
  };

  const createOrderRes = await fetch(`${BASE_URL}/shop/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerAuth.token}`,
    },
    body: JSON.stringify(orderPayload),
  });

  const createOrderData = await createOrderRes.json();
  if (!createOrderRes.ok || !createOrderData.success) {
    throw new Error(`Failed to create order: ${createOrderData.message}`);
  }

  const order = createOrderData.data;
  console.log(`✅ [CUSTOMER] Order created successfully!`);
  console.log(`   Order ID: ${order._id}`);
  console.log(`   Order Code: ${order.orderCode}`);
  console.log(`   Initial Status: ${order.orderStatus}`);
  console.log(`   Total Amount: Rp ${order.totalAmount.toLocaleString()}`);
  console.log(`   Payment Method: ${order.paymentMethod}`);
  console.log(`   Payment Status: ${order.paymentStatus}`);

  if (order.orderStatus !== "WAITING_STORE_CONFIRMATION") {
    throw new Error(`Expected orderStatus to be WAITING_STORE_CONFIRMATION, got ${order.orderStatus}`);
  }

  // 4. Merchant fetches incoming orders and verifies order is present
  console.log("\n🏪 [MERCHANT] Checking incoming orders list...");
  const merchantOrdersRes = await fetch(`${BASE_URL}/shop/merchant/orders`, {
    headers: { Authorization: `Bearer ${merchantAuth.token}` },
  });
  const merchantOrdersData = await merchantOrdersRes.json();
  if (!merchantOrdersData.success) {
    throw new Error(`Failed to fetch merchant orders: ${merchantOrdersData.message}`);
  }
  const foundInMerchant = merchantOrdersData.data.find((o) => String(o._id) === String(order._id));
  if (!foundInMerchant) {
    throw new Error("Created order not found in merchant's incoming orders!");
  }
  console.log(`✅ [MERCHANT] Order #${order.orderCode} detected in merchant incoming list!`);

  // 5. Merchant accepts order -> STORE_ACCEPTED
  console.log("\n🏪 [MERCHANT] Accepting order...");
  const acceptOrderRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${merchantAuth.token}` },
  });
  const acceptOrderData = await acceptOrderRes.json();
  if (!acceptOrderRes.ok || !acceptOrderData.success) {
    throw new Error(`Merchant failed to accept order: ${acceptOrderData.message}`);
  }
  console.log(`✅ [MERCHANT] Order accepted! Status: ${acceptOrderData.data.orderStatus}`);
  if (acceptOrderData.data.orderStatus !== "STORE_ACCEPTED") {
    throw new Error(`Expected STORE_ACCEPTED, got ${acceptOrderData.data.orderStatus}`);
  }

  // 6. Merchant updates status -> PREPARING
  console.log("\n🏪 [MERCHANT] Updating status to PREPARING...");
  const prepRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantAuth.token}`,
    },
    body: JSON.stringify({ status: "PREPARING", note: "Barang sedang diambil dari rak dan dikemas" }),
  });
  const prepData = await prepRes.json();
  if (!prepRes.ok || !prepData.success) {
    throw new Error(`Merchant failed to set PREPARING: ${prepData.message}`);
  }
  console.log(`✅ [MERCHANT] Status updated to: ${prepData.data.orderStatus}`);

  // 7. Merchant updates status -> READY_FOR_PICKUP
  console.log("\n🏪 [MERCHANT] Updating status to READY_FOR_PICKUP (Ready for Driver)...");
  const readyRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantAuth.token}`,
    },
    body: JSON.stringify({ status: "READY_FOR_PICKUP", note: "Kemasan sudah siap di kasir untuk kurir" }),
  });
  const readyData = await readyRes.json();
  if (!readyRes.ok || !readyData.success) {
    throw new Error(`Merchant failed to set READY_FOR_PICKUP: ${readyData.message}`);
  }
  console.log(`✅ [MERCHANT] Status updated to: ${readyData.data.orderStatus}`);

  // 8. Driver checks available orders
  console.log("\n🛵 [DRIVER] Checking available pickup orders...");
  const driverOrdersRes = await fetch(`${BASE_URL}/shop/driver/orders`, {
    headers: {
      Authorization: `Bearer ${driverAuth.token}`,
      "x-driver-id": String(driverAuth.user._id),
    },
  });
  const driverOrdersData = await driverOrdersRes.json();
  if (!driverOrdersData.success) {
    throw new Error(`Driver failed to get orders: ${driverOrdersData.message}`);
  }
  const availableOrders = driverOrdersData.data.availableOrders || [];
  const targetAvailable = availableOrders.find((o) => String(o._id) === String(order._id));
  if (!targetAvailable) {
    throw new Error(`Order #${order.orderCode} not found in driver's available orders! (Total available: ${availableOrders.length})`);
  }
  console.log(`✅ [DRIVER] Order #${order.orderCode} is available for pickup! Store: ${targetAvailable.storeId?.name}`);

  // 9. Driver accepts the order -> DRIVER_ASSIGNED
  console.log("\n🛵 [DRIVER] Accepting order for delivery...");
  const driverAcceptRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/accept-driver`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${driverAuth.token}`,
    },
  });
  const driverAcceptData = await driverAcceptRes.json();
  if (!driverAcceptRes.ok || !driverAcceptData.success) {
    throw new Error(`Driver failed to accept order: ${driverAcceptData.message}`);
  }
  console.log(`✅ [DRIVER] Order accepted by driver! Status: ${driverAcceptData.data.orderStatus}`);
  console.log(`   Driver Name: ${driverAcceptData.data.driverName}`);
  console.log(`   Driver Plate: ${driverAcceptData.data.driverPlateNumber}`);
  if (driverAcceptData.data.orderStatus !== "DRIVER_ASSIGNED") {
    throw new Error(`Expected DRIVER_ASSIGNED, got ${driverAcceptData.data.orderStatus}`);
  }

  // 9b. Driver starts journey to store -> DRIVER_HEADING_TO_STORE (OTW ke Toko)
  console.log("\n🛵 [DRIVER] Updating status: On the way to store (DRIVER_HEADING_TO_STORE)...");
  const headingToStoreRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/driver-status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${driverAuth.token}`,
    },
    body: JSON.stringify({ status: "DRIVER_HEADING_TO_STORE", note: "Driver sedang dalam perjalanan menuju toko (OTW ke toko)" }),
  });
  const headingData = await headingToStoreRes.json();
  if (!headingToStoreRes.ok || !headingData.success) {
    throw new Error(`Driver failed to update to DRIVER_HEADING_TO_STORE: ${headingData.message}`);
  }
  console.log(`✅ [DRIVER] Status updated to: ${headingData.data.orderStatus} (OTW ke Toko Berhasil!)`);
  if (headingData.data.orderStatus !== "DRIVER_HEADING_TO_STORE") {
    throw new Error(`Expected DRIVER_HEADING_TO_STORE, got ${headingData.data.orderStatus}`);
  }

  // 10. Driver arrives at store -> DRIVER_AT_STORE
  console.log("\n🛵 [DRIVER] Updating status: Arrived at store (DRIVER_AT_STORE)...");
  const atStoreRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/driver-status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${driverAuth.token}`,
    },
    body: JSON.stringify({ status: "DRIVER_AT_STORE", note: "Driver sudah sampai di toko dan mengambil barang" }),
  });
  const atStoreData = await atStoreRes.json();
  if (!atStoreRes.ok || !atStoreData.success) {
    throw new Error(`Driver failed to update to DRIVER_AT_STORE: ${atStoreData.message}`);
  }
  console.log(`✅ [DRIVER] Status updated to: ${atStoreData.data.orderStatus}`);

  // 11. Driver starts delivering -> DELIVERING
  console.log("\n🛵 [DRIVER] Updating status: Delivering to customer (DELIVERING)...");
  const deliveringRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/driver-status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${driverAuth.token}`,
    },
    body: JSON.stringify({ status: "DELIVERING", note: "Driver sedang dalam perjalanan menuju alamat customer" }),
  });
  const deliveringData = await deliveringRes.json();
  if (!deliveringRes.ok || !deliveringData.success) {
    throw new Error(`Driver failed to update to DELIVERING: ${deliveringData.message}`);
  }
  console.log(`✅ [DRIVER] Status updated to: ${deliveringData.data.orderStatus}`);

  // 12. Driver completes delivery -> COMPLETED
  console.log("\n🛵 [DRIVER] Updating status: Order Completed (COMPLETED)...");
  const completeRes = await fetch(`${BASE_URL}/shop/orders/${order._id}/driver-status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${driverAuth.token}`,
    },
    body: JSON.stringify({ status: "COMPLETED", note: "Barang telah diterima oleh customer. Pembayaran tunai diterima." }),
  });
  const completeData = await completeRes.json();
  if (!completeRes.ok || !completeData.success) {
    throw new Error(`Driver failed to complete order: ${completeData.message}`);
  }
  console.log(`✅ [DRIVER] Order completed!`);
  console.log(`   Final Order Status: ${completeData.data.orderStatus}`);
  console.log(`   Final Payment Status: ${completeData.data.paymentStatus}`);
  if (completeData.data.orderStatus !== "COMPLETED") {
    throw new Error(`Expected COMPLETED, got ${completeData.data.orderStatus}`);
  }
  if (completeData.data.paymentStatus !== "PAID") {
    throw new Error(`Expected paymentStatus PAID, got ${completeData.data.paymentStatus}`);
  }

  // 13. Customer verifies final order details
  console.log("\n📱 [CUSTOMER] Fetching final order details...");
  const customerDetailRes = await fetch(`${BASE_URL}/shop/orders/${order._id}`, {
    headers: { Authorization: `Bearer ${customerAuth.token}` },
  });
  const customerDetailData = await customerDetailRes.json();
  if (!customerDetailData.success || !customerDetailData.data) {
    throw new Error(`Customer failed to view order: ${customerDetailData.message}`);
  }

  const finalOrder = customerDetailData.data;
  console.log("==========================================================");
  console.log("🎉 VERIFICATION SUMMARY");
  console.log("==========================================================");
  console.log(`• Order Code        : ${finalOrder.orderCode}`);
  console.log(`• Customer Name     : ${finalOrder.customerName}`);
  console.log(`• Store Name        : ${finalOrder.storeName || finalOrder.storeId?.name}`);
  console.log(`• Driver Name       : ${finalOrder.driverName}`);
  console.log(`• Driver Plate      : ${finalOrder.driverPlateNumber}`);
  console.log(`• Order Status      : ${finalOrder.orderStatus} (SUCCESS)`);
  console.log(`• Payment Status    : ${finalOrder.paymentStatus} (SUCCESS)`);
  console.log(`• Total Timeline    : ${finalOrder.statusHistory?.length} events recorded`);

  console.log("\nTimeline History:");
  finalOrder.statusHistory.forEach((hist, i) => {
    console.log(`  ${i + 1}. [${hist.status}] (${hist.actorRole}) - ${hist.note}`);
  });

  console.log("\n==========================================================");
  console.log("✅ ALL FLOW CHECKS & TESTS PASSED WITH 100% SUCCESS!");
  console.log("==========================================================");
}

runE2ETest().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
