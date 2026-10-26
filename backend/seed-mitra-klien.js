require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const LaundryStore = require("./models/LaundryStore");

async function seedMitraKlien() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is not defined in .env");

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB!");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("12345678", salt);

    // 1. Siti Nurazizah - Kanyaah Laundry
    const laundryEmail = "sitinurazizah.laundry@gmail.com";
    const laundryPhone = "+628139461204";
    const laundryStoreName = "Kanyaah Laundry";
    const laundryAddress = "Jl. Raya Kamojang, Samarang, Garut";

    let user = await User.findOne({ email: laundryEmail });
    if (user) {
      user.name = "Siti Nurazizah";
      user.role = "pemilik_laundry";
      user.phone = laundryPhone;
      user.address = laundryAddress;
      user.passwordHash = passwordHash;
      user.status = "verified";
      user.roleData = {
        businessName: laundryStoreName,
        businessAddress: laundryAddress,
        serviceType: "express",
        operatingHours: "08.00 - 21.00",
        phone: laundryPhone,
      };
      await user.save();
      console.log(`✅ User ${laundryEmail} updated.`);
    } else {
      user = await User.create({
        name: "Siti Nurazizah",
        email: laundryEmail,
        phone: laundryPhone,
        address: laundryAddress,
        role: "pemilik_laundry",
        passwordHash,
        status: "verified",
        roleData: {
          businessName: laundryStoreName,
          businessAddress: laundryAddress,
          serviceType: "express",
          operatingHours: "08.00 - 21.00",
          phone: laundryPhone,
        },
      });
      console.log(`✅ User ${laundryEmail} created.`);
    }

    // Laundry Store Data
    let store = await LaundryStore.findOne({ ownerId: user._id });
    const storePayload = {
      ownerId: user._id,
      storeName: laundryStoreName,
      description: "The Ultimate Laundry Solution - Layanan cuci, setrika, dry cleaning, dan antar jemput terpercaya Kamojang.",
      address: laundryAddress,
      phone: laundryPhone,
      openingHours: "08.00 - 21.00",
      openingDays: "Buka Setiap Hari",
      openingTime: "08:00",
      closingTime: "21:00",
      isOpen: true,
      rating: 4.9,
      totalReviews: 32,
      distanceText: "0.5 km",
      imageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80",
      badges: ["Antar Jemput", "Wash and Fold", "Dry Cleaning", "Bergaransi Bersih"],
      bankName: "BRI",
      bankAccountNumber: "412301029384501",
      bankAccountHolder: "Siti Nurazizah",
      services: [
        {
          name: "Wash and Fold (Cuci Lipat)",
          desc: "Cuci bersih higienis dan lipat rapi",
          price: 6000,
          unit: "kg",
          durationHours: 24,
          category: "biasa",
          isActive: true,
        },
        {
          name: "Ironing and Pressing (Setrika Rapi)",
          desc: "Setrika uap licin dan wangi tahan lama",
          price: 4000,
          unit: "kg",
          durationHours: 12,
          category: "biasa",
          isActive: true,
        },
        {
          name: "Cuci Komplit (Wash, Iron & Fold)",
          desc: "Cuci, kering, setrika uap & pewangi premium",
          price: 8000,
          unit: "kg",
          durationHours: 24,
          category: "biasa",
          isActive: true,
        },
        {
          name: "Dry Cleaning Spesial",
          desc: "Perawatan khusus jas, gamis, kebaya & pakaian berharga",
          price: 15000,
          unit: "pcs",
          durationHours: 48,
          category: "satuan",
          isActive: true,
        },
        {
          name: "Cuci Bed Cover / Selimut",
          desc: "Pembersihan higienis bed cover & selimut tebal",
          price: 25000,
          unit: "pcs",
          durationHours: 48,
          category: "satuan",
          isActive: true,
        },
        {
          name: "Express Kilat (3-4 Jam)",
          desc: "Layanan kilat prioritas selesai dalam 3-4 jam",
          price: 12000,
          unit: "kg",
          durationHours: 4,
          category: "ekspres",
          isActive: true,
        },
      ],
    };

    if (store) {
      Object.assign(store, storePayload);
      await store.save();
      console.log(`✅ LaundryStore ${laundryStoreName} updated.`);
    } else {
      store = await LaundryStore.create(storePayload);
      console.log(`✅ LaundryStore ${laundryStoreName} created.`);
    }

    console.log("=========================================");
    console.log("🎉 Berhasil menambahkan Mitra Laundry:");
    console.log("👤 Nama:", user.name);
    console.log("📧 Email:", user.email);
    console.log("🔑 Password:", "12345678");
    console.log("📱 No Telp:", user.phone);
    console.log("🏪 Nama Toko:", store.storeName);
    console.log("✅ Status:", user.status);
    console.log("=========================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed mitra error:", error);
    process.exit(1);
  }
}

seedMitraKlien();
