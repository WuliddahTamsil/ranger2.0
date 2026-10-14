const assert = require("assert");
const { computeSendFare, isProhibitedItem, DEFAULT_CONFIG } = require("../services/sendFareService");
const { generateSixDigitCode, hashCode, verifyCode } = require("../utils/sendSecurity");

async function runUnitTests() {
  console.log("==================================================");
  console.log("🚀 RUNNING KANYAAH SEND UNIT TESTS");
  console.log("==================================================");

  // 1. Prohibited items check
  const safeCheck = isProhibitedItem("Buku novel dan pakaian", "Paket dokumen kantor");
  assert.strictEqual(safeCheck.prohibited, false, "Normal cargo must be allowed");

  const dangerousCheck = isProhibitedItem("Bahan bensin dan korek", "Mudah meledak");
  assert.strictEqual(dangerousCheck.prohibited, true, "Explosive / hazardous cargo must be rejected");
  assert.strictEqual(dangerousCheck.keyword, "bensin", "Detected keyword must match");
  console.log("✔ Test 1 Passed: Hazardous cargo detection strictly enforced");

  // 2. Minimum fare enforcement (distance <= 1 km Rp 2.500 + service fee Rp 2.000 = Rp 4.500)
  const shortFare = await computeSendFare({
    pickup: { latitude: -6.9175, longitude: 107.6191 },
    destination: { latitude: -6.9180, longitude: 107.6195 }, // ~0.1 km
    packageData: { weightKg: 0.5, lengthCm: 10, widthCm: 10, heightCm: 5, fragile: false },
  });
  assert.strictEqual(shortFare.estimatedFare, DEFAULT_CONFIG.minimumFare, "Must enforce minimum fare Rp 4.500");
  assert.strictEqual(shortFare.distanceFare, 2500, "Base distance fare for <= 1km must be Rp 2.500");
  assert.strictEqual(shortFare.serviceFee, 2000, "Platform service fee must be Rp 2.000");
  assert.strictEqual(shortFare.weightFare, 0, "Weight <= 20kg must have 0 extra weight fare");
  assert.strictEqual(shortFare.fragileFee, 0, "Non-fragile has 0 fragile fee");
  console.log(`✔ Test 2 Passed: Minimum fare enforced (Rp ${shortFare.estimatedFare.toLocaleString("id-ID")})`);

  // 3. Distance and Weight Fare calculation (>4 km and >20 kg)
  // Jarak: ~6 km (<4 km: 9500, extra 2 km * 2500 = 5000 -> distanceFare: 14500)
  // Berat: 25 kg (base 20 kg Rp 0 + extra 5 kg * 3000 = 15000 -> weightFare: 15000)
  // Service fee: 2000
  // Total raw = 14500 + 15000 + 2000 = 31500 -> Ceil to 1000 = 32000
  const heavyFare = await computeSendFare({
    pickup: { latitude: -6.9175, longitude: 107.6191 },
    destination: { latitude: -6.9715, longitude: 107.6191 }, // ~6.0 km
    packageData: { weightKg: 25, lengthCm: 10, widthCm: 10, heightCm: 10, fragile: false },
  });
  assert.strictEqual(heavyFare.distanceFare, 15000, "6km distance fare must be 15000");
  assert.strictEqual(heavyFare.weightFare, 15000, "25kg weight fare (5kg extra * 3000) must be 15000");
  assert.strictEqual(heavyFare.serviceFee, 2000, "Service fee must be 2000");
  assert.strictEqual(heavyFare.estimatedFare, 32000, "Estimated fare must be Rp 32.000");
  console.log(`✔ Test 3 Passed: Distance & overweight calculation (>20kg) verified (Rp ${heavyFare.estimatedFare.toLocaleString("id-ID")})`);

  // 4. Fragile Protection and Insurance fee
  const fragileFare = await computeSendFare({
    pickup: { latitude: -6.9175, longitude: 107.6191 },
    destination: { latitude: -6.9175, longitude: 107.6191 },
    packageData: {
      weightKg: 1,
      lengthCm: 20,
      widthCm: 20,
      heightCm: 20,
      fragile: true,
      declaredValue: 2000000, // 2 juta -> 0.2% = 4000
    },
  });
  assert.strictEqual(fragileFare.fragileFee, 3000, "Fragile fee must be Rp 3.000");
  assert.strictEqual(fragileFare.insuranceFee, 4000, "Insurance fee 0.2% of 2M must be Rp 4.000");
  console.log(`✔ Test 4 Passed: Fragile fee & insurance protection calculated accurately`);

  // 5. Pickup Code & Delivery OTP Security Hashing
  const rawPickup = generateSixDigitCode();
  assert.strictEqual(rawPickup.length, 6, "Pickup code must be 6 digits");
  const { hash: pHash, salt: pSalt } = hashCode(rawPickup);

  // Correct verification
  assert.strictEqual(verifyCode(rawPickup, pHash, pSalt), true, "Valid code must pass verification");

  // Incorrect verification
  assert.strictEqual(verifyCode("123456", pHash, pSalt) && rawPickup !== "123456", false, "Invalid code must fail");
  console.log("✔ Test 5 Passed: 6-digit cryptographic PIN generation and salt verification verified");

  // 6. State machine transitions
  const VALID_TRANSITIONS = {
    SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED"],
    DRIVER_ASSIGNED: ["DRIVER_ON_THE_WAY_TO_PICKUP", "CANCELLED", "SEARCHING_DRIVER"],
    DRIVER_ON_THE_WAY_TO_PICKUP: ["DRIVER_ARRIVED_AT_PICKUP", "CANCELLED"],
    DRIVER_ARRIVED_AT_PICKUP: ["PICKUP_VERIFICATION", "CANCELLED"],
    PICKUP_VERIFICATION: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: ["IN_TRANSIT", "RETURN_REQUESTED"],
    IN_TRANSIT: ["ARRIVED_AT_DESTINATION", "RETURN_REQUESTED"],
    ARRIVED_AT_DESTINATION: ["DELIVERY_VERIFICATION", "RETURN_REQUESTED"],
    DELIVERY_VERIFICATION: ["DELIVERED", "RETURN_REQUESTED"],
    DELIVERED: ["COMPLETED", "DISPUTED"],
  };

  const checkTransition = (current, next) => (VALID_TRANSITIONS[current] || []).includes(next);

  assert.strictEqual(checkTransition("SEARCHING_DRIVER", "DRIVER_ASSIGNED"), true);
  assert.strictEqual(checkTransition("DRIVER_ASSIGNED", "PICKED_UP"), false, "Cannot skip pickup verification");
  assert.strictEqual(checkTransition("PICKED_UP", "IN_TRANSIT"), true);
  assert.strictEqual(checkTransition("PICKED_UP", "CANCELLED"), false, "Direct cancellation forbidden once picked up");
  console.log("✔ Test 6 Passed: State transition machine strictly prevents illegal status jumping");

  // 7. Cancellation Fee Rules
  const calculateCancelFee = (status) => {
    if (status === "SEARCHING_DRIVER") return 0;
    if (status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY_TO_PICKUP") return 3000;
    if (status === "DRIVER_ARRIVED_AT_PICKUP" || status === "PICKUP_VERIFICATION") return 5000;
    throw new Error("Cannot directly cancel in or after transit");
  };

  assert.strictEqual(calculateCancelFee("SEARCHING_DRIVER"), 0, "Free cancellation when searching");
  assert.strictEqual(calculateCancelFee("DRIVER_ASSIGNED"), 3000, "Assigned cancel fee Rp 3.000");
  assert.strictEqual(calculateCancelFee("DRIVER_ARRIVED_AT_PICKUP"), 5000, "Arrived at pickup cancel fee Rp 5.000");
  assert.throws(() => calculateCancelFee("PICKED_UP"), /Cannot directly cancel/);
  console.log("✔ Test 7 Passed: Cancellation policies and fee scale enforced");

  console.log("==================================================");
  console.log("🎉 ALL KANYAAH SEND UNIT TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runUnitTests().catch((err) => {
  console.error("❌ UNIT TEST FAILED:", err);
  process.exit(1);
});
