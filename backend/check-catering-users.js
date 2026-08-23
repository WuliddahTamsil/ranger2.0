require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function checkCatering() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const users = await User.find({ role: "pemilik_catering" });
  console.log(`Found ${users.length} Pemilik Catering users:`);
  users.forEach((u) => {
    console.log(`- ID: ${u._id}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Status: ${u.status}`);
    console.log(`  roleData:`, JSON.stringify(u.roleData));
  });

  process.exit(0);
}

checkCatering();
