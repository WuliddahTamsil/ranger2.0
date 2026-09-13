const test = require("node:test");
const assert = require("node:assert/strict");
const { getMarketplaceOrderActorRole, getMarketplaceTransition, getMarketplaceStatusNotification, isValidDeliveryProofUrl } = require("../utils/marketplaceOrderLifecycle");
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

test("marketplace delivery proof must be a non-empty HTTP URL", () => {
  assert.equal(isValidDeliveryProofUrl("https://res.cloudinary.com/example/proof.jpg"), true);
  assert.equal(isValidDeliveryProofUrl("http://localhost:5000/uploads/proof.jpg"), true);
  assert.equal(isValidDeliveryProofUrl(""), false);
  assert.equal(isValidDeliveryProofUrl("file:///proof.jpg"), false);
});

test("marketplace owner may progress preparation but not driver delivery states", () => {
  assert.equal(getMarketplaceTransition("pemilik_marketplace", "Menunggu", "Diproses"), true);
  assert.equal(getMarketplaceTransition("pemilik_marketplace", "Diproses", "Siap"), true);
  assert.equal(getMarketplaceTransition("pemilik_marketplace", "Sampai Pickup", "Mengantar"), false);
});

test("marketplace status access follows the order's assigned driver or owning shop", () => {
  const order = { ownerId: "owner-1", driverId: "driver-1" };
  assert.equal(getMarketplaceOrderActorRole("owner-1", order), "pemilik_marketplace");
  assert.equal(getMarketplaceOrderActorRole("driver-1", order), "driver");
  assert.equal(getMarketplaceOrderActorRole("customer-1", order), null);
  assert.equal(getMarketplaceOrderActorRole("driver-1", null), null);
});

test("driver journey notifications have required recipients and honest copy", () => {
  assert.deepEqual(getMarketplaceStatusNotification("Sampai Pickup", "MKT-123", "Rina").recipients, ["owner"]);
  assert.deepEqual(getMarketplaceStatusNotification("Mengantar", "MKT-123").recipients, ["owner", "customer"]);
  assert.match(getMarketplaceStatusNotification("Mengantar", "MKT-123").message, /telah diambil driver dan sedang diantar/);
  assert.deepEqual(getMarketplaceStatusNotification("Selesai", "MKT-123").recipients, ["owner", "customer"]);
});
