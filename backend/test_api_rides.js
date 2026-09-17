require("dotenv").config();
const jwt = require("jsonwebtoken");
const http = require("http");

const JWT_SECRET = process.env.JWT_SECRET || "rangers_app_secret";
const driverId = "6a9c2f97c0998813eb04450c";
const token = jwt.sign({ id: driverId, role: "driver" }, JWT_SECRET, { expiresIn: "7d" });

function request(path, headers = {}) {
  return new Promise((resolve) => {
    http.get({ hostname: "localhost", port: 5000, path, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
  });
}

async function testDriverRides() {
  console.log("=== TEST 1: Calling WITH valid Bearer Token ===");
  const res1 = await request(`/api/rides/driver/${driverId}`, {
    Authorization: `Bearer ${token}`,
  });
  console.log("Status:", res1.status);
  console.log("Data count:", res1.body?.data?.length);
  console.log("Data:", JSON.stringify(res1.body?.data, null, 2));

  console.log("\n=== TEST 2: Calling WITHOUT Bearer Token ===");
  const res2 = await request(`/api/rides/driver/${driverId}`);
  console.log("Status:", res2.status, res2.body);

  console.log("\n=== TEST 3: Calling /api/rides/driver WITH Bearer Token ===");
  const res3 = await request("/api/rides/driver", {
    Authorization: `Bearer ${token}`,
  });
  console.log("Status:", res3.status);
  console.log("Data count:", res3.body?.data?.length);

  console.log("\n=== TEST 4: Calling /api/marketplace/orders/driver WITH Bearer Token ===");
  const res4 = await request("/api/marketplace/orders/driver", {
    Authorization: `Bearer ${token}`,
  });
  console.log("Status:", res4.status);
  console.log("Mkt Orders count:", res4.body?.data?.length);
  console.log("Mkt Orders:", JSON.stringify(res4.body?.data?.map(o => ({ id: o._id, status: o.status })), null, 2));
}

testDriverRides().catch(console.error);
