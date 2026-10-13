require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function fixDriverBarokah() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const user = await User.findOne({ email: "barokah@gmail.com" });
  if (!user) {
    console.log("User barokah@gmail.com not found!");
    process.exit(1);
  }

  user.role = "driver";
  user.status = "verified";
  user.roleData = {
    vehicleType: "Motor",
    vehicleBrand: "Honda Beat",
    vehicleYear: "2024",
    plateNumber: "Z 1234 BK",
    isOnline: true,
  };
  await user.save();

  console.log("✅ barokah@gmail.com successfully updated to driver with verified status and vehicle details!");
  process.exit(0);
}

fixDriverBarokah().catch((err) => {
  console.error(err);
  process.exit(1);
});
