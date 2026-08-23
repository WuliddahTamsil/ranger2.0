require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function testUpdate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Find a pemilik_catering user
  let user = await User.findOne({ role: "pemilik_catering" });
  if (!user) {
    console.log("No pemilik_catering user found in database.");
    process.exit(0);
  }

  console.log("Found user ID:", user._id);
  console.log("Original roleData:", JSON.stringify(user.roleData));

  // Try updating roleData isDapurOpen
  try {
    user.roleData.set("isDapurOpen", "false");
    await user.save();
    console.log("✅ Successfully set isDapurOpen to 'false'!");

    // Set it back to true
    user.roleData.set("isDapurOpen", "true");
    await user.save();
    console.log("✅ Successfully set isDapurOpen back to 'true'!");
  } catch (err) {
    console.error("❌ Save failed:", err);
  }

  process.exit(0);
}

testUpdate();
