const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const WasteBank = require("../models/WasteBank");
const WasteCategoryPrice = require("../models/WasteCategoryPrice");

const DEFAULT_PASSWORD = "Aisyah16!";

const BANK_ACCOUNTS = [
  {
    name: "Bank Sampah Induk Kamojang Asri",
    emails: ["banksampah@geoverse.com", "banksampah.kamojang@geoverse.com"],
    phone: "081234567888",
    address: "Jl. Kamojang No. 8, Samarang, Garut",
    latitude: -7.1452,
    longitude: 107.7891,
    photoUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
    openingHours: "Senin - Sabtu, 08:00 - 16:00",
    acceptsPickup: true,
  },
  {
    name: "Bank Sampah Berkah Mandiri Garut",
    emails: ["banksampah.garutkota@geoverse.com", "banksampah.cimanuk@geoverse.com"],
    phone: "085223344556",
    address: "Jl. Cimanuk No. 42, Garut Kota",
    latitude: -7.2185,
    longitude: 107.9022,
    photoUrl: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=600",
    openingHours: "Senin - Minggu, 08:30 - 17:00",
    acceptsPickup: true,
  },
  {
    name: "Bank Sampah Hijau Lestari Bandung",
    emails: ["banksampah.bandung@geoverse.com", "banksampah.dago@geoverse.com"],
    phone: "082112233445",
    address: "Jl. Dago No. 120, Coblong, Bandung",
    latitude: -6.885,
    longitude: 107.614,
    photoUrl: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=600",
    openingHours: "Senin - Jumat, 08:00 - 15:30",
    acceptsPickup: true,
  },
  {
    name: "Bank Sampah Merdeka Bersih",
    emails: ["banksampah.merdeka@geoverse.com", "banksampah.sumurbandung@geoverse.com"],
    phone: "081399887766",
    address: "Jl. Merdeka No. 64, Sumur Bandung",
    latitude: -6.912,
    longitude: 107.6105,
    photoUrl: "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=600",
    openingHours: "Setiap Hari, 07:30 - 16:30",
    acceptsPickup: false,
  },
];

const STANDARD_PRICES = [
  { category: "Plastik", subCategory: "Botol PET Bening / Bersih", pricePerKg: 4500, minWeightKg: 0.1 },
  { category: "Plastik", subCategory: "Plastik Campur / Kresek", pricePerKg: 2000, minWeightKg: 0.5 },
  { category: "Kertas & Kardus", subCategory: "Kardus Tebal / Box", pricePerKg: 2500, minWeightKg: 0.5 },
  { category: "Kertas & Kardus", subCategory: "Kertas HVS Putih / Buku", pricePerKg: 3000, minWeightKg: 0.2 },
  { category: "Logam & Besi", subCategory: "Kaleng Minuman Aluminium", pricePerKg: 12000, minWeightKg: 0.1 },
  { category: "Logam & Besi", subCategory: "Besi Tua / Pipa Padat", pricePerKg: 6000, minWeightKg: 1.0 },
  { category: "Kaca & Botol", subCategory: "Botol Kaca Sirup / Kecap", pricePerKg: 1200, minWeightKg: 0.5 },
  { category: "Elektronik", subCategory: "Perangkat Elektronik Rusak", pricePerKg: 8000, minWeightKg: 0.5 },
  { category: "Minyak Jelantah", subCategory: "Minyak Goreng Bekas Saring", pricePerKg: 7500, minWeightKg: 1.0 },
  { category: "Organik", subCategory: "Sisa Makanan & Sayur", pricePerKg: 1000, minWeightKg: 1.0 },
];

async function seedWasteBankAccounts() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB!");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    for (const bankInfo of BANK_ACCOUNTS) {
      const primaryEmail = bankInfo.emails[0];
      let user = await User.findOne({ email: primaryEmail });

      if (!user) {
        user = await User.create({
          role: "bank_sampah",
          name: bankInfo.name,
          email: primaryEmail,
          phone: bankInfo.phone,
          address: bankInfo.address,
          passwordHash: passwordHash,
          status: "verified",
          roleData: {
            nama_unit: bankInfo.name,
            alamat_unit: bankInfo.address,
            jam_operasional: bankInfo.openingHours,
          },
        });
        console.log(`✅ Created Bank Sampah User: ${primaryEmail}`);
      } else {
        user.role = "bank_sampah";
        user.name = bankInfo.name;
        user.phone = bankInfo.phone;
        user.address = bankInfo.address;
        user.passwordHash = passwordHash;
        user.status = "verified";
        await user.save();
        console.log(`🔄 Updated Bank Sampah User: ${primaryEmail}`);
      }

      const allOfficerIds = [user._id];
      const allOfficerEmails = [...bankInfo.emails.map(e => e.toLowerCase())];

      // Also create alias emails if needed for user convenience
      for (let i = 1; i < bankInfo.emails.length; i++) {
        const aliasEmail = bankInfo.emails[i];
        let aliasUser = await User.findOne({ email: aliasEmail });
        if (!aliasUser) {
          aliasUser = await User.create({
            role: "bank_sampah",
            name: `${bankInfo.name}`,
            email: aliasEmail,
            phone: bankInfo.phone,
            address: bankInfo.address,
            passwordHash: passwordHash,
            status: "verified",
            roleData: {
              nama_unit: bankInfo.name,
              alamat_unit: bankInfo.address,
              jam_operasional: bankInfo.openingHours,
            },
          });
          console.log(`✅ Created Alias Bank Sampah User: ${aliasEmail}`);
        } else {
          aliasUser.role = "bank_sampah";
          aliasUser.name = `${bankInfo.name}`;
          aliasUser.passwordHash = passwordHash;
          aliasUser.status = "verified";
          aliasUser.roleData = {
            nama_unit: bankInfo.name,
            alamat_unit: bankInfo.address,
            jam_operasional: bankInfo.openingHours,
          };
          await aliasUser.save();
          console.log(`🔄 Updated Alias Bank Sampah User: ${aliasEmail}`);
        }
        allOfficerIds.push(aliasUser._id);
      }

      // Upsert WasteBank document linked to this owner and officers
      let bankDoc = await WasteBank.findOne({ name: bankInfo.name });
      if (!bankDoc) {
        bankDoc = await WasteBank.create({
          name: bankInfo.name,
          ownerId: user._id,
          officerIds: allOfficerIds,
          officerEmails: allOfficerEmails,
          address: bankInfo.address,
          latitude: bankInfo.latitude,
          longitude: bankInfo.longitude,
          phone: bankInfo.phone,
          photoUrl: bankInfo.photoUrl,
          openingHours: bankInfo.openingHours,
          acceptsPickup: bankInfo.acceptsPickup,
          status: "ACTIVE",
        });
        console.log(`✅ Created WasteBank entity: ${bankInfo.name}`);
      } else {
        bankDoc.ownerId = user._id;
        bankDoc.officerIds = allOfficerIds;
        bankDoc.officerEmails = allOfficerEmails;
        bankDoc.address = bankInfo.address;
        bankDoc.latitude = bankInfo.latitude;
        bankDoc.longitude = bankInfo.longitude;
        bankDoc.phone = bankInfo.phone;
        bankDoc.photoUrl = bankInfo.photoUrl;
        bankDoc.openingHours = bankInfo.openingHours;
        bankDoc.acceptsPickup = bankInfo.acceptsPickup;
        bankDoc.status = "ACTIVE";
        await bankDoc.save();
        console.log(`🔄 Updated WasteBank entity: ${bankInfo.name}`);
      }

      // Price catalog
      for (const p of STANDARD_PRICES) {
        await WasteCategoryPrice.findOneAndUpdate(
          { bankSampahId: bankDoc._id, category: p.category, subCategory: p.subCategory },
          { ...p, bankSampahId: bankDoc._id, isActive: true, updatedBy: user._id },
          { upsert: true }
        );
      }
      console.log(`  📦 Synced prices for ${bankInfo.name}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL BANK SAMPAH LOGIN ACCOUNTS SUCCESSFULLY CREATED!");
    console.log("Password for all accounts:", DEFAULT_PASSWORD);
    console.log("=======================================================\n");

    const users = await User.find({ role: "bank_sampah" }).select("name email phone status");
    console.table(users.map((u) => ({ Name: u.name, Email: u.email, Phone: u.phone, Status: u.status })));

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("❌ Error seeding accounts:", err);
    process.exit(1);
  }
}

seedWasteBankAccounts();
