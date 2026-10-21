const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DRIVER_TRANSITIONS,
  OWNER_TRANSITIONS,
  getPaymentPlan,
  getPaymentStatusLabel,
  isCateringPaymentComplete,
} = require("../utils/cateringOrderLifecycle");

test("catering payment plan calculates DP and remaining amount from the server total", () => {
  assert.deepEqual(getPaymentPlan(1000000, "dp30"), { percent: 30, depositAmount: 300000, remainingAfterDeposit: 700000 });
  assert.deepEqual(getPaymentPlan(1000001, "dp50"), { percent: 50, depositAmount: 500001, remainingAfterDeposit: 500000 });
  assert.deepEqual(getPaymentPlan(1000000, "lunas"), { percent: 100, depositAmount: 1000000, remainingAfterDeposit: 0 });
});

test("catering payment status is derived from verified money, not selected option", () => {
  assert.equal(getPaymentStatusLabel({ totalAmount: 1000000, status: "Menunggu" }, 0), "Menunggu Pembayaran");
  assert.equal(getPaymentStatusLabel({ totalAmount: 1000000, status: "Menunggu" }, 300000), "Menunggu Pelunasan");
  assert.equal(getPaymentStatusLabel({ totalAmount: 1000000, status: "Menunggu" }, 1000000), "Lunas");
  assert.equal(isCateringPaymentComplete({ totalAmount: 1000000, remainingAmount: 0, paymentStatus: "Lunas", paidAmount: 1000000 }), true);
  assert.equal(isCateringPaymentComplete({ totalAmount: 1000000, remainingAmount: 700000, paidAmount: 300000, paymentOption: "dp30", paymentStatus: "DP Terbayar" }), false);
  assert.equal(isCateringPaymentComplete({ totalAmount: 1000000, remainingAmount: 500000, paidAmount: 500000, paymentOption: "dp50", paymentStatus: "DP Terbayar" }), false);
});

test("catering DP verification validates minimum threshold per payment plan", () => {
  const { isCateringDpVerified } = require("../utils/cateringOrderLifecycle");
  assert.equal(isCateringDpVerified({ totalAmount: 1000000, paidAmount: 300000, paymentOption: "dp30" }), true);
  assert.equal(isCateringDpVerified({ totalAmount: 1000000, paidAmount: 250000, paymentOption: "dp30" }), false);
  assert.equal(isCateringDpVerified({ totalAmount: 1000000, paidAmount: 500000, paymentOption: "dp50" }), true);
  assert.equal(isCateringDpVerified({ totalAmount: 1000000, paidAmount: 490000, paymentOption: "dp50" }), false);
});

test("catering lifecycle separates owner preparation and driver delivery transitions", () => {
  assert.deepEqual(OWNER_TRANSITIONS.Menunggu, ["Diproses", "Dibatalkan"]);
  assert.equal(DRIVER_TRANSITIONS["Menuju Pickup"], "Sampai Pickup");
  assert.equal(DRIVER_TRANSITIONS["Sampai Pickup"], "Mengantar");
  assert.equal(DRIVER_TRANSITIONS.Mengantar, "Selesai");
  assert.equal(DRIVER_TRANSITIONS.Menunggu, undefined);
});
