require("dotenv").config();
const mongoose = require("mongoose");
const Kost = require("./models/Kost");
const User = require("./models/User");

async function checkDb() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const users = await User.find({ role: "pemilik_kos" });
  console.log(`Found ${users.length} Pemilik Kos users:`, users.map((u) => ({ name: u.name, email: u.email })));

  const kosts = await Kost.find({}).populate("ownerId", "name email");
  console.log(`Found ${kosts.length} Kost properties:`);
  kosts.forEach((k, i) => {
    console.log(`\n[${i + 1}] Kost: ${k.name} (Owner: ${k.ownerId?.email || k.ownerId})`);
    console.log(`    Total Rooms: ${k.rooms.length}`);
    k.rooms.forEach((r) => {
      console.log(`    - Kamar ${r.roomNumber} (${r.roomType}) | Rp ${r.priceMonthly.toLocaleString("id-ID")} | Tenant: ${r.currentTenant ? r.currentTenant.name : "KOSONG"}`);
    });
  });

  process.exit(0);
}

checkDb();
