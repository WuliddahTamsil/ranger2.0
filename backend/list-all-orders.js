require("dotenv").config();
const mongoose = require("mongoose");
const CateringOrder = require("./models/CateringOrder");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const orders = await CateringOrder.find({});
  console.log(`\n=== ALL CATERING ORDERS IN DB (${orders.length}) ===`);
  orders.forEach((o) => {
    console.log(`- Code: ${o.orderCode} | CustomerId: ${o.customerId} | OwnerId: ${o.ownerId} | Menu: ${o.menuName} | Status: ${o.status}`);
  });

  process.exit(0);
}

run();
