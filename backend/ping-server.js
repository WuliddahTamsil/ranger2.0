const http = require("http");

console.log("Pinging http://127.0.0.1:5000/api/health...");

const req = http.get("http://127.0.0.1:5000/api/health", (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("RESPONSE:", data);
    process.exit(0);
  });
});

req.on("error", (e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

req.end();
