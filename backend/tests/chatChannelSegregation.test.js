const { test } = require("node:test");
const assert = require("node:assert");
const { resolveChatChannel, normalizeRole, resolveReceiverId } = require("../utils/chatAccess");
const ChatMessage = require("../models/ChatMessage");

test("Chat Channel Resolution: maps roles to discrete mutually exclusive channels", () => {
  // Customer <-> Driver channel
  assert.strictEqual(resolveChatChannel("customer", "driver"), "customer_driver");
  assert.strictEqual(resolveChatChannel("driver", "customer"), "customer_driver");

  // Driver <-> Owner / Store channel
  assert.strictEqual(resolveChatChannel("driver", "owner"), "driver_owner");
  assert.strictEqual(resolveChatChannel("owner", "driver"), "driver_owner");
  assert.strictEqual(resolveChatChannel("driver", "store"), "driver_owner");
  assert.strictEqual(resolveChatChannel("driver", "pemilik_marketplace"), "driver_owner");
  assert.strictEqual(resolveChatChannel("driver", "pemilik_catering"), "driver_owner");
  assert.strictEqual(resolveChatChannel("driver", "pemilik_laundry"), "driver_owner");
  assert.strictEqual(resolveChatChannel("pemilik_marketplace", "driver"), "driver_owner");

  // Customer <-> Owner / Store channel
  assert.strictEqual(resolveChatChannel("customer", "owner"), "customer_owner");
  assert.strictEqual(resolveChatChannel("owner", "customer"), "customer_owner");
  assert.strictEqual(resolveChatChannel("customer", "store"), "customer_owner");
  assert.strictEqual(resolveChatChannel("customer", "pemilik_kos"), "customer_owner");
  assert.strictEqual(resolveChatChannel("pemilik_kos", "customer"), "customer_owner");

  // General fallback
  assert.strictEqual(resolveChatChannel("admin", "admin"), "general");
});

test("Role Normalization: normalizes merchant and owner role variants", () => {
  assert.strictEqual(normalizeRole("pemilik_marketplace"), "owner");
  assert.strictEqual(normalizeRole("pemilik_shop"), "owner");
  assert.strictEqual(normalizeRole("pemilik_catering"), "owner");
  assert.strictEqual(normalizeRole("pemilik_laundry"), "owner");
  assert.strictEqual(normalizeRole("pemilik_kos"), "owner");
  assert.strictEqual(normalizeRole("bank_sampah"), "owner");
  assert.strictEqual(normalizeRole("store"), "owner");
  assert.strictEqual(normalizeRole("merchant"), "owner");
  assert.strictEqual(normalizeRole("customer"), "customer");
  assert.strictEqual(normalizeRole("driver"), "driver");
});

test("Receiver ID Resolution: targets appropriate party without leak", () => {
  const participant = {
    role: "driver",
    customerId: "cust_123",
    ownerId: "owner_456",
    driverId: "driver_789",
  };

  assert.strictEqual(resolveReceiverId(participant, "customer"), "cust_123");
  assert.strictEqual(resolveReceiverId(participant, "owner"), "owner_456");
  assert.strictEqual(resolveReceiverId(participant, "store"), "owner_456");
});

test("ChatMessage Schema: includes channel enum field", () => {
  const channelPath = ChatMessage.schema.path("channel");
  assert.ok(channelPath, "channel field must exist in ChatMessage schema");
  assert.deepStrictEqual(channelPath.enumValues, [
    "customer_driver",
    "driver_owner",
    "customer_owner",
    "general",
  ]);
});

test("Channel Segregation: Customer-Driver message does not appear in Toko/Outlet room", () => {
  const sampleMessages = [
    {
      _id: "msg_1",
      orderId: "order_test",
      channel: "customer_driver",
      sender: "customer",
      target: "driver",
      text: "terimakasih pak",
    },
    {
      _id: "msg_2",
      orderId: "order_test",
      channel: "customer_driver",
      sender: "customer",
      target: "driver",
      text: "foto kartu",
      attachment: { type: "image", uri: "https://example.com/card.jpg" },
    },
    {
      _id: "msg_3",
      orderId: "order_test",
      channel: "driver_owner",
      sender: "driver",
      target: "owner",
      text: "Saya sudah sampai di toko",
    },
  ];

  // Driver on "Toko / Outlet" tab requests driver_owner
  const driverOwnerChannel = resolveChatChannel("driver", "owner");
  const tokoMessages = sampleMessages.filter((m) => m.channel === driverOwnerChannel);

  assert.strictEqual(tokoMessages.length, 1);
  assert.strictEqual(tokoMessages[0].text, "Saya sudah sampai di toko");
  assert.ok(!tokoMessages.some((m) => m.text === "terimakasih pak"));
  assert.ok(!tokoMessages.some((m) => m.attachment));

  // Driver on "Customer" tab requests customer_driver
  const driverCustomerChannel = resolveChatChannel("driver", "customer");
  const customerMessages = sampleMessages.filter((m) => m.channel === driverCustomerChannel);

  assert.strictEqual(customerMessages.length, 2);
  assert.strictEqual(customerMessages[0].text, "terimakasih pak");
  assert.strictEqual(customerMessages[1].attachment?.type, "image");
  assert.ok(!customerMessages.some((m) => m.text === "Saya sudah sampai di toko"));
});
