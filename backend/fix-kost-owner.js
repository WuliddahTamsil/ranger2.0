require("dotenv").config();
const mongoose = require("mongoose");
const Kost = require("./models/Kost");
const User = require("./models/User");

async function fixKostOwner() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const aisUser = await User.findOne({ email: "aisk@gmail.com" });
  if (!aisUser) {
    console.log("aisk@gmail.com user not found!");
    process.exit(1);
  }

  // Remove any legacy duplicate Kost that belongs to aisl@gmail.com or other ais email
  const legacyKost = await Kost.deleteMany({
    name: "Ais Kost Exclusive",
    ownerId: { $ne: aisUser._id },
  });
  console.log(`Deleted ${legacyKost.deletedCount} legacy duplicate Kosts.`);

  // Make sure aisUser's Kost has all rooms correctly defined
  const kost = await Kost.findOne({ ownerId: aisUser._id });
  if (kost) {
    console.log(`Ais Kost found: ${kost.name} (Rooms: ${kost.rooms.length})`);
    kost.rooms.forEach((r) => {
      console.log(`- Kamar ${r.roomNumber} (${r.roomType}) | Available: ${r.isAvailable} | Tenant: ${r.currentTenant?.name || "KOSONG"}`);
    });
  }

  process.exit(0);
}

fixKostOwner();
