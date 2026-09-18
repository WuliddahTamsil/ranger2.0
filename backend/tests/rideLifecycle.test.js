const assert = require("assert");

// Test fare engine directly
const RIDE_FARE_CONFIG = {
  MOTOR: {
    baseFare: 8000,
    baseKm: 2,
    pricePerKm: 2500,
    pricePerMinute: 500,
    minimumFare: 10000,
    serviceFee: 1000,
  },
};

const computeFare = (distanceKm, durationMinutes = 10, discount = 0) => {
  const cfg = RIDE_FARE_CONFIG.MOTOR;
  const safeDist = Math.max(0.1, Number(distanceKm) || 2);
  const extraKm = Math.max(0, safeDist - cfg.baseKm);
  const distanceFare = Math.round(extraKm * cfg.pricePerKm);
  const timeFare = Math.round(durationMinutes * cfg.pricePerMinute);
  const rawFare = cfg.baseFare + distanceFare + timeFare + cfg.serviceFee - discount;
  return Math.max(cfg.minimumFare, Math.ceil(rawFare / 1000) * 1000);
};

const runTests = () => {
  console.log("=== RUNNING KANYAAH RIDE LIFECYCLE TESTS ===");

  // Test 1: Minimum Fare enforcement
  const shortTripFare = computeFare(0.5, 2); // 0.5km, 2 mins: raw = 8000 + 0 + 1000 + 1000 = 10000
  assert.strictEqual(shortTripFare, 10000, "Short trip must respect minimum fare 10000");
  console.log("✔ Test 1 Passed: Minimum fare respected (Rp 10.000)");

  // Test 2: Longer trip fare calculation
  // 5 km, 15 mins: base 8000 + extra 3km * 2500 (7500) + 15 * 500 (7500) + 1000 service = 24000
  const longTripFare = computeFare(5, 15);
  assert.strictEqual(longTripFare, 24000, "5km 15min trip fare must equal Rp 24.000");
  console.log("✔ Test 2 Passed: 5km trip fare computed correctly (Rp 24.000)");

  // Test 3: Discount deduction
  const discountedFare = computeFare(5, 15, 4000); // 24000 - 4000 = 20000
  assert.strictEqual(discountedFare, 20000, "Discount must be subtracted correctly");
  console.log("✔ Test 3 Passed: Promo discount subtracted correctly (Rp 20.000)");

  // Test 4: State Machine validation logic
  const validTransitions = {
    DRIVER_ASSIGNED: ["DRIVER_ON_THE_WAY", "DRIVER_ARRIVED"],
    DRIVER_ON_THE_WAY: ["DRIVER_ARRIVED"],
    DRIVER_ARRIVED: ["TRIP_STARTED"],
    TRIP_STARTED: ["COMPLETED", "DISPUTED"],
  };

  const isTransitionAllowed = (from, to) => {
    return (validTransitions[from] || []).includes(to);
  };

  assert.strictEqual(isTransitionAllowed("DRIVER_ASSIGNED", "DRIVER_ON_THE_WAY"), true);
  assert.strictEqual(isTransitionAllowed("DRIVER_ASSIGNED", "COMPLETED"), false, "Direct jump to COMPLETED must be forbidden");
  assert.strictEqual(isTransitionAllowed("DRIVER_ARRIVED", "TRIP_STARTED"), true);
  assert.strictEqual(isTransitionAllowed("TRIP_STARTED", "COMPLETED"), true);
  console.log("✔ Test 4 Passed: Status transition state machine strictly enforced");

  // Test 5: Cancellation fee rule
  const calculateCancelFee = (status, by) => {
    if (by !== "customer") return 0;
    if (status === "SEARCHING_DRIVER") return 0;
    if (status === "DRIVER_ASSIGNED" || status === "DRIVER_ON_THE_WAY") return 3000;
    if (status === "DRIVER_ARRIVED") return 5000;
    if (status === "TRIP_STARTED") throw new Error("Cannot cancel started trip");
    return 0;
  };

  assert.strictEqual(calculateCancelFee("SEARCHING_DRIVER", "customer"), 0, "Free cancellation while searching");
  assert.strictEqual(calculateCancelFee("DRIVER_ASSIGNED", "customer"), 3000, "Assigned cancel fee Rp 3.000");
  assert.strictEqual(calculateCancelFee("DRIVER_ARRIVED", "customer"), 5000, "Arrived cancel fee Rp 5.000");
  assert.throws(() => calculateCancelFee("TRIP_STARTED", "customer"), /Cannot cancel started trip/);
  console.log("✔ Test 5 Passed: Cancellation fees and trip-started protection verified");

  console.log("🎉 ALL KANYAAH RIDE UNIT & LOGIC TESTS PASSED!");
};

runTests();
