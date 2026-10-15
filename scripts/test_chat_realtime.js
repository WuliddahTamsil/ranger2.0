const { io } = require("socket.io-client");

const BACKEND_URL = process.env.TEST_BACKEND_URL || "http://localhost:5000";
console.log(`🧪 Testing Full Bidirectional Realtime Chat on: ${BACKEND_URL}`);

async function runTest() {
  const customerToken = "seed_token_customer_seed_001";
  const driverToken = "seed_token_driver_seed_001";
  const ownerToken = "seed_token_catering_seed_001";
  const orderId = "catering_realtime_matrix_test";

  console.log("1. Connecting Sockets for Customer, Driver, and Owner...");
  const driverSocket = io(BACKEND_URL, { transports: ["websocket", "polling"], forceNew: true });
  const customerSocket = io(BACKEND_URL, { transports: ["websocket", "polling"], forceNew: true });
  const ownerSocket = io(BACKEND_URL, { transports: ["websocket", "polling"], forceNew: true });

  await new Promise((res) => {
    let count = 0;
    const check = () => {
      count++;
      if (count === 3) res();
    };
    driverSocket.on("connect", () => {
      driverSocket.emit("join_conversation", { orderId, token: driverToken });
      check();
    });
    customerSocket.on("connect", () => {
      customerSocket.emit("join_conversation", { orderId, token: customerToken });
      check();
    });
    ownerSocket.on("connect", () => {
      ownerSocket.emit("join_conversation", { orderId, token: ownerToken });
      check();
    });
  });

  console.log("✅ All 3 sockets connected and joined conversation:", orderId);
  await new Promise((r) => setTimeout(r, 1000));

  // TEST 1: Driver -> Customer
  console.log("\n--- TEST 1: Driver -> Customer ---");
  const t1Promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for T1 message")), 8000);
    customerSocket.once("chat:message", (msg) => {
      clearTimeout(timeout);
      resolve(msg);
    });
  });

  const t1Text = `Driver to Customer @ ${Date.now()}`;
  const t1Res = await fetch(`${BACKEND_URL}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({ orderId, text: t1Text, target: "customer" }),
  }).then((r) => r.json());

  if (!t1Res.success) throw new Error(`T1 send failed: ${JSON.stringify(t1Res)}`);
  const t1Received = await t1Promise;
  if (t1Received.text !== t1Text) throw new Error("T1 text mismatch");
  console.log("✅ TEST 1 PASSED: Customer received message in realtime!");

  // TEST 2: Customer -> Driver
  console.log("\n--- TEST 2: Customer -> Driver ---");
  const t2Promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for T2 message")), 8000);
    driverSocket.once("chat:message", (msg) => {
      clearTimeout(timeout);
      resolve(msg);
    });
  });

  const t2Text = `Customer to Driver @ ${Date.now()}`;
  const t2Res = await fetch(`${BACKEND_URL}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ orderId, text: t2Text, target: "driver" }),
  }).then((r) => r.json());

  if (!t2Res.success) throw new Error(`T2 send failed: ${JSON.stringify(t2Res)}`);
  const t2Received = await t2Promise;
  if (t2Received.text !== t2Text) throw new Error("T2 text mismatch");
  console.log("✅ TEST 2 PASSED: Driver received message in realtime!");

  // TEST 3: Owner -> Customer
  console.log("\n--- TEST 3: Owner -> Customer ---");
  const t3Promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for T3 message")), 8000);
    customerSocket.once("chat:message", (msg) => {
      clearTimeout(timeout);
      resolve(msg);
    });
  });

  const t3Text = `Owner to Customer @ ${Date.now()}`;
  const t3Res = await fetch(`${BACKEND_URL}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ orderId, text: t3Text, target: "customer" }),
  }).then((r) => r.json());

  if (!t3Res.success) throw new Error(`T3 send failed: ${JSON.stringify(t3Res)}`);
  const t3Received = await t3Promise;
  if (t3Received.text !== t3Text) throw new Error("T3 text mismatch");
  console.log("✅ TEST 3 PASSED: Customer received Owner message in realtime!");

  // TEST 4: Real MongoDB Ride Order (OrderCode vs ObjectId room join)
  console.log("\n--- TEST 4: Real DB Ride Order (Cross-identifier room sync) ---");
  const dbOrderCode = "RNG-RIDE-22671375";
  const dbOrderId = "6aab798fcd520144e4846c56";

  // Customer joins via Mongo ObjectId
  customerSocket.emit("join_conversation", { orderId: dbOrderId, token: customerToken });
  // Driver joins via human-readable Order Code
  driverSocket.emit("join_conversation", { orderId: dbOrderCode, token: driverToken });
  await new Promise((r) => setTimeout(r, 1000));

  const t4Promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for T4 message")), 8000);
    customerSocket.once("chat:message", (msg) => {
      clearTimeout(timeout);
      resolve(msg);
    });
  });

  const t4Text = `Driver to Customer on Ride Order @ ${Date.now()}`;
  const t4Res = await fetch(`${BACKEND_URL}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({ orderId: dbOrderCode, text: t4Text, target: "customer" }),
  }).then((r) => r.json());

  if (!t4Res.success) throw new Error(`T4 send failed: ${JSON.stringify(t4Res)}`);
  const t4Received = await t4Promise;
  if (t4Received.text !== t4Text) throw new Error("T4 text mismatch");
  console.log("✅ TEST 4 PASSED: Real DB Order cross-identifier chat delivered in realtime!");

  console.log("\n🎊 ALL REALTIME BIDIRECTIONAL CHAT TESTS PASSED WITH 100% SUCCESS!");

  driverSocket.disconnect();
  customerSocket.disconnect();
  ownerSocket.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
