require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const CateringProduct = require("./models/CateringProduct");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const users = await User.find({});
  console.log(`\n=== ALL USERS IN DB (${users.length}) ===`);
  users.forEach((u) => {
    console.log(`- ID: ${u._id} | Role: ${u.role} | Email: ${u.email} | Name: ${u.name}`);
    console.log(`  roleData:`, JSON.stringify(u.roleData));
  });

  const products = await CateringProduct.find({});
  console.log(`\n=== ALL PRODUCTS IN DB (${products.length}) ===`);
  products.forEach((p) => {
    console.log(`- ID: ${p._id} | OwnerId: ${p.ownerId} | Name: ${p.name} | Price: ${p.price}`);
  });

  process.exit(0);
}

run();
