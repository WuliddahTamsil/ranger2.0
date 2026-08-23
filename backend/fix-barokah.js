require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function fixBarokah() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Find barokah@gmail.com
  const user = await User.findOne({ email: "barokah@gmail.com" });
  if (!user) {
    console.log("User barokah@gmail.com not found!");
    process.exit(0);
  }

  user.status = "verified";
  user.roleData.set("isDapurOpen", "true");
  await user.save();

  console.log("✅ Successfully updated barokah@gmail.com to verified and isDapurOpen to 'true'!");
  process.exit(0);
}

fixBarokah();
