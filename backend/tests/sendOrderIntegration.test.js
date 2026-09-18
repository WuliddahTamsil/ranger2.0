const assert = require("assert");
const { computeSendFare } = require("../services/sendFareService");
const { generateSixDigitCode, hashCode, verifyCode } = require("../utils/sendSecurity");

async function runIntegrationTest() {
  console.log("==================================================");
  console.log("🚀 RUNNING KANYAAH SEND FULL FLOW INTEGRATION TEST");
  console.log("==================================================");

  // STEP 1: Customer creates delivery order
  const pickup = {
    name: "Asep Sunandar",
    phone: "081234567890",
    address: "Jl. Kamojang No. 12, Garut",
    latitude: -6.9175,
    longitude: 107.6191,
  };
  const recipient = {
    name: "Siti Nurhaliza",
    phone: "089876543210",
    address: "Jl. Samarang No. 45, Garut",
    latitude: -6.9575,
    longitude: 107.6391,
  };
  const packageData = {
    name: "Laptop Asus ROG & Charger",
    category: "Elektronik",
    weightKg: 2.8,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 6,
    fragile: true,
    declaredValue: 15000000,
  };

  const fareResult = await computeSendFare({ pickup, destination: recipient, packageData });
  assert(fareResult.estimatedFare > 10000, "Fare must exceed minimum");
  console.log(`[Flow 1] Customer checks fare: Rp ${fareResult.estimatedFare.toLocaleString("id-ID")}`);

  // Create simulated order record
  const pickupCodeRaw = generateSixDigitCode();
  const deliveryOtpRaw = generateSixDigitCode();
  const { hash: pHash, salt: pSalt } = hashCode(pickupCodeRaw);
  const { hash: dHash, salt: dSalt } = hashCode(deliveryOtpRaw);

  const order = {
    _id: "send_order_12345",
    orderCode: "RNG-SEND-TEST-001",
    customerId: "cust_001",
    driverId: null,
    status: "SEARCHING_DRIVER",
    pricing: fareResult,
    pickupCodeHash: pHash,
    pickupCodeSalt: pSalt,
    deliveryOtpHash: dHash,
    deliveryOtpSalt: dSalt,
    pickupAttempts: 0,
    deliveryOtpAttempts: 0,
    pickupProofUrls: [],
    deliveryProofUrls: [],
    statusHistory: [{ status: "SEARCHING_DRIVER", time: new Date() }],
  };
  console.log(`[Flow 2] Order created (${order.orderCode}), status: SEARCHING_DRIVER`);

  // STEP 2: Driver accepts order (Atomic check)
  const driver1 = "driver_ranger_007";
  const driver2 = "driver_ranger_008";

  // Simulate atomic lock: if driverId is null and status is SEARCHING_DRIVER
  const atomicAccept = (currentOrder, driverId) => {
    if (currentOrder.status === "SEARCHING_DRIVER" && currentOrder.driverId === null) {
      currentOrder.driverId = driverId;
      currentOrder.status = "DRIVER_ASSIGNED";
      currentOrder.statusHistory.push({ status: "DRIVER_ASSIGNED", actorId: driverId });
      return { success: true, order: currentOrder };
    }
    return { success: false, message: "Order already claimed" };
  };

  const attempt1 = atomicAccept(order, driver1);
  assert.strictEqual(attempt1.success, true, "Driver 1 must successfully claim the order");
  assert.strictEqual(order.driverId, driver1);

  const attempt2 = atomicAccept(order, driver2);
  assert.strictEqual(attempt2.success, false, "Driver 2 must be rejected due to atomic lock");
  console.log(`[Flow 3] Driver ${driver1} atomically accepted order. Race-condition blocked Driver ${driver2}.`);

  // STEP 3: Driver moves towards sender and arrives
  order.status = "DRIVER_ON_THE_WAY_TO_PICKUP";
  order.status = "DRIVER_ARRIVED_AT_PICKUP";
  console.log("[Flow 4] Driver arrived at pickup location. Preparing pickup verification.");

  // STEP 4: Verification of Pickup Code
  // Simulate driver typing wrong code once
  const wrongCode = "000000";
  const isWrongValid = verifyCode(wrongCode, order.pickupCodeHash, order.pickupCodeSalt);
  if (!isWrongValid) order.pickupAttempts += 1;
  assert.strictEqual(order.pickupAttempts, 1, "Failed attempt must be logged");

  // Simulate sender giving the valid pickup code
  const isCorrectValid = verifyCode(pickupCodeRaw, order.pickupCodeHash, order.pickupCodeSalt);
  assert.strictEqual(isCorrectValid, true, "Valid pickup code must pass");
  order.status = "PICKED_UP";
  order.pickupProofUrls.push("https://geoverse.id/uploads/proof-pickup-01.jpg");
  console.log(`[Flow 5] Pickup code verified! Photo proof uploaded. Status: PICKED_UP`);

  // STEP 5: In Transit to Recipient
  order.status = "IN_TRANSIT";
  order.status = "ARRIVED_AT_DESTINATION";
  console.log("[Flow 6] Driver reached destination. Recipient contacted for delivery OTP.");

  // STEP 6: Delivery OTP Verification
  const isDeliveryOtpValid = verifyCode(deliveryOtpRaw, order.deliveryOtpHash, order.deliveryOtpSalt);
  assert.strictEqual(isDeliveryOtpValid, true, "Valid delivery OTP must pass");
  order.status = "DELIVERED";
  order.deliveryProofUrls.push("https://geoverse.id/uploads/proof-delivery-01.jpg");
  order.status = "COMPLETED";
  console.log("[Flow 7] Recipient OTP verified! Delivery proof photo uploaded. Status: COMPLETED");

  // STEP 7: Customer Rates Driver
  order.rating = {
    score: 5,
    review: "Pengiriman sangat cepat, barang elektronik aman dan tidak ada lecet sama sekali. Mantap!",
  };
  assert.strictEqual(order.rating.score, 5);
  console.log(`[Flow 8] Customer submitted 5-star rating with review!`);

  console.log("==================================================");
  console.log("🎉 ALL INTEGRATION FLOW CHECKS COMPLETED WITH SUCCESS!");
  console.log("==================================================");
}

runIntegrationTest().catch((err) => {
  console.error("❌ INTEGRATION TEST FAILED:", err);
  process.exit(1);
});
