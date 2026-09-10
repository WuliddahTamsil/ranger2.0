require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const targets = ["dyaska@gmail.com", "dyva123@gmail.com", "wuliddah@gmail.com"];
  const users = await User.find({ email: { $in: targets } });
  for (const u of users) {
    console.log("-----------------------------------------");
    console.log("Email:", u.email);
    console.log("Role:", u.role);
    console.log("Status:", u.status);
    console.log("Has passwordHash:", !!u.passwordHash);
    console.log("Hash:", u.passwordHash);
    console.log("Match '12345678':", await u.matchPassword("12345678"));
    console.log("Match 'password':", await u.matchPassword("password"));
    console.log("Match 'password123':", await u.matchPassword("password123"));
  }
  process.exit(0);
}

run().catch(console.error);
