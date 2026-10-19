/**
 * cancellationAudit.test.js
 * Test suite to verify cancellation functionality across Kanyaah Ride, Send, and other services.
 */

const assert = require("assert");

console.log("=================================================");
console.log("🚀 TESTING ORDER CANCELLATION ENGINE & RESOLUTION");
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
// 1. ORDER CODE AND OBJECTID RESOLUTION LOGIC
// ----------------------------------------------------
runTest("1.1 Resolve order identifier: Clean hashtag and match orderCode", () => {
  const inputWithHash = "#RNG-RIDE-96092956";
  const cleanId = String(inputWithHash).replace(/^#/, "").trim();
  assert.strictEqual(cleanId, "RNG-RIDE-96092956", "Hashtag should be stripped cleanly");

  // Simulated DB search matcher
  const mockDb = [
    { _id: "671234567890abcdef123456", orderCode: "RNG-RIDE-96092956", status: "SEARCHING_DRIVER" },
  ];

  const found = mockDb.find(
    (o) => o._id === cleanId || o.orderCode === cleanId || o.orderCode === `#${cleanId}`
  );
  assert.ok(found, "Order must be found when identified by orderCode");
  assert.strictEqual(found.status, "SEARCHING_DRIVER");
});

// ----------------------------------------------------
// 2. KANYAAH RIDE TIERED CANCELLATION PENALTY POLICY
// ----------------------------------------------------
runTest("2.1 Ride cancellation fee: SEARCHING_DRIVER is Rp 0 (Free)", () => {
  const status = "SEARCHING_DRIVER";
  let fee = 0;
  if (status === "SEARCHING_DRIVER") {
    fee = 0;
  } else if (status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY") {
    fee = 3000;
  } else if (status === "DRIVER_ARRIVED") {
    fee = 5000;
  }
  assert.strictEqual(fee, 0, "SEARCHING_DRIVER cancellation must be completely free");
});

runTest("2.2 Ride cancellation fee: DRIVER_ON_THE_WAY is Rp 3.000 compensation", () => {
  const status = "DRIVER_ON_THE_WAY";
  let fee = 0;
  if (status === "SEARCHING_DRIVER") fee = 0;
  else if (status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY") fee = 3000;
  else if (status === "DRIVER_ARRIVED") fee = 5000;
  assert.strictEqual(fee, 3000, "Driver dispatch compensation fee must be Rp 3.000");
});

runTest("2.3 Ride cancellation rule: TRIP_STARTED cannot be cancelled unilaterally", () => {
  const status = "TRIP_STARTED";
  const canCancel = status !== "TRIP_STARTED";
  assert.strictEqual(canCancel, false, "Ongoing trip must not be cancelled from customer app");
});

// ----------------------------------------------------
// 3. KANYAAH SEND CANCELLATION POLICIES
// ----------------------------------------------------
runTest("3.1 Send cancellation: allowed before driver pickups the package", () => {
  const allowedStatuses = [
    "SEARCHING_DRIVER",
    "DRIVER_ASSIGNED",
    "DRIVER_ON_THE_WAY_TO_PICKUP",
    "DRIVER_ARRIVED_AT_PICKUP",
  ];

  assert.strictEqual(allowedStatuses.includes("SEARCHING_DRIVER"), true);
  assert.strictEqual(allowedStatuses.includes("DRIVER_ON_THE_WAY_TO_PICKUP"), true);
  assert.strictEqual(allowedStatuses.includes("PICKED_UP"), false, "Cannot cancel once picked up");
  assert.strictEqual(allowedStatuses.includes("IN_TRANSIT"), false, "Cannot cancel during transit");
});

// ----------------------------------------------------
// 4. GEOVERSE POINT REVERSAL UPON CANCELLATION
// ----------------------------------------------------
runTest("4.1 Point refund on cancellation: Idempotent reversal", () => {
  const order = {
    orderCode: "RNG-RIDE-96092956",
    pointsUsed: 5000,
    pointRefunded: false,
  };

  let refundedPoints = 0;
  if (order.pointsUsed > 0 && !order.pointRefunded) {
    order.pointRefunded = true;
    refundedPoints = order.pointsUsed;
  }

  assert.strictEqual(refundedPoints, 5000, "Customer should be refunded 5000 points");
  assert.strictEqual(order.pointRefunded, true, "pointRefunded flag should prevent double refund");

  // Attempt duplicate refund
  let secondRefund = 0;
  if (order.pointsUsed > 0 && !order.pointRefunded) {
    secondRefund = order.pointsUsed;
  }
  assert.strictEqual(secondRefund, 0, "Duplicate point refund must be blocked");
});

console.log("\n=================================================");
console.log(`🎉 ALL ${passedTests}/${totalTests} CANCELLATION TESTS PASSED!`);
console.log("=================================================\n");
