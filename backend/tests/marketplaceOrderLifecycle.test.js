const test = require("node:test");
const assert = require("node:assert/strict");
const { getMarketplaceTransition, getMarketplaceStatusNotification } = require("../utils/marketplaceOrderLifecycle");
const { requireRole } = require("../middleware/requireRole");

test("role middleware distinguishes unauthenticated and unauthorized callers", () => {
  const driverOnly = requireRole("driver");
  const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

  const unauthenticatedResponse = response();
  driverOnly({ authUser: null }, unauthenticatedResponse, () => assert.fail("next must not run"));
  assert.equal(unauthenticatedResponse.statusCode, 401);

  const customerResponse = response();
  driverOnly({ authUser: { role: "customer" } }, customerResponse, () => assert.fail("next must not run"));
  assert.equal(customerResponse.statusCode, 403);

  let nextCalled = false;
  driverOnly({ authUser: { role: "driver" } }, response(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("driver can only move through the marketplace delivery lifecycle", () => {
  assert.equal(getMarketplaceTransition("driver", "Menuju Pickup", "Sampai Pickup"), true);
  assert.equal(getMarketplaceTransition("driver", "Sampai Pickup", "Mengantar"), true);
  assert.equal(getMarketplaceTransition("driver", "Mengantar", "Selesai"), true);
  assert.equal(getMarketplaceTransition("driver", "Siap", "Selesai"), false);
  assert.equal(getMarketplaceTransition("driver", "Mengantar", "Menuju Pickup"), false);
});

test("marketplace owner may progress preparation but not driver delivery states", () => {
  assert.equal(getMarketplaceTransition("pemilik_marketplace", "Menunggu", "Diproses"), true);
  assert.equal(getMarketplaceTransition("pemilik_marketplace", "Diproses", "Siap"), true);
  assert.equal(getMarketplaceTransition("pemilik_marketplace", "Sampai Pickup", "Mengantar"), false);
});

test("driver journey notifications have required recipients and honest copy", () => {
  assert.deepEqual(getMarketplaceStatusNotification("Sampai Pickup", "MKT-123", "Rina").recipients, ["owner"]);
  assert.match(getMarketplaceStatusNotification("Mengantar", "MKT-123").message, /telah diambil driver dan sedang diantar/);
  assert.deepEqual(getMarketplaceStatusNotification("Selesai", "MKT-123").recipients, ["owner", "customer"]);
});
