require("dotenv").config();
const mongoose = require("mongoose");

async function checkDb() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // Check RideOrders
  const rideOrders = await db.collection("rideorders").find({}).sort({ createdAt: -1 }).limit(5).toArray();
  console.log("\n=== LATEST 5 RIDE ORDERS ===");
  console.log(JSON.stringify(rideOrders.map(r => ({
    _id: r._id,
    orderCode: r.orderCode,
    orderType: r.orderType,
    serviceType: r.serviceType,
    status: r.status,
    driverId: r.driverId,
    customerId: r.customerId,
    declinedByDrivers: r.declinedByDrivers,
    createdAt: r.createdAt
  })), null, 2));

  // Check Users with role driver
  const drivers = await db.collection("users").find({ role: "driver" }).toArray();
  console.log("\n=== DRIVER USERS IN DB ===");
  console.log(JSON.stringify(drivers.map(d => ({
    _id: d._id,
    name: d.name,
    email: d.email,
    role: d.role,
    isOnline: d.isOnline,
    driverAvailability: d.driverAvailability,
  })), null, 2));

  // Check Marketplace Orders
  const mktOrders = await db.collection("marketplaceorders").find({}).sort({ createdAt: -1 }).limit(3).toArray();
  console.log("\n=== LATEST 3 MARKETPLACE ORDERS ===");
  console.log(JSON.stringify(mktOrders.map(m => ({
    _id: m._id,
    orderCode: m.orderCode,
    status: m.status,
    driverId: m.driverId,
    declinedByDrivers: m.declinedByDrivers,
  })), null, 2));

  await mongoose.disconnect();
}

checkDb().catch(console.error);
