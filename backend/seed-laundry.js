require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const LaundryStore = require("./models/LaundryStore");

const seedLaundry = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MONGODB_URI not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB for Laundry Seeding");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    // 1. Akun Pemilik Laundry 1: Pak Dedi
    let dediUser = await User.findOne({ email: "dedi.laundry@gmail.com" });
    if (!dediUser) {
      dediUser = await User.create({
        name: "Pak Dedi Kurniawan",
        email: "dedi.laundry@gmail.com",
        phone: "081234567001",
        password: hashedPassword,
        role: "pemilik_laundry",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80",
      });
      console.log(" Created user:", dediUser.name);
    }

    // 2. Akun Pemilik Laundry 2: Mas Rendy (Bersih Kilat)
    let rendyUser = await User.findOne({ email: "rendy.laundry@gmail.com" });
    if (!rendyUser) {
      rendyUser = await User.create({
        name: "Rendy Pratama",
        email: "rendy.laundry@gmail.com",
        phone: "081234567002",
        password: hashedPassword,
        role: "pemilik_laundry",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
      });
      console.log(" Created user:", rendyUser.name);
    }

    // 3. Akun Pemilik Laundry 3: Ibu Rohani
    let rohaniUser = await User.findOne({ email: "rohani.laundry@gmail.com" });
    if (!rohaniUser) {
      rohaniUser = await User.create({
        name: "Ibu Rohani",
        email: "rohani.laundry@gmail.com",
        phone: "081234567003",
        password: hashedPassword,
        role: "pemilik_laundry",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
      });
      console.log(" Created user:", rohaniUser.name);
    }

    // Seed Stores
    const storesData = [
      {
        ownerId: dediUser._id,
        storeName: "Laundry Express Pak Dedi",
        description: "Layanan cuci kilat, bersih higienis dengan pewangi premium aroma segar tahan 7 hari.",
        address: "Jl. Kamojang No. 45, Desa Laksana, Ibun",
        phone: dediUser.phone,
        openingHours: "Buka • Tutup 21.00",
        isOpen: true,
        rating: 4.8,
        totalReviews: 124,
        distanceText: "0.5 km",
        imageUrl: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
        badges: ["Antar Jemput", "Ekspres 3 Jam", "Garansi Wangi"],
        services: [
          {
            name: "Cuci Komplit (Cuci + Setrika)",
            desc: "Pakaian dicuci bersih, dikeringkan, disetrika uap rapi, dan dikemas rapi.",
            price: 6000,
            unit: "kg",
            durationHours: 24,
            category: "biasa",
            isActive: true,
          },
          {
            name: "Express 3 Jam (Siap Pakai)",
            desc: "Prioritas khusus pencucian kilat dan langsung diantar dalam 3 jam.",
            price: 10000,
            unit: "kg",
            durationHours: 3,
            category: "ekspres",
            isActive: true,
          },
          {
            name: "Cuci Kering Lipat",
            desc: "Cuci bersih, higienis & lipat rapi tanpa disetrika.",
            price: 4500,
            unit: "kg",
            durationHours: 24,
            category: "biasa",
            isActive: true,
          },
          {
            name: "Setrika Uap Saja",
            desc: "Setrika uap licin dan wangi tanpa kusut untuk pakaian harian/kerja.",
            price: 3500,
            unit: "kg",
            durationHours: 12,
            category: "biasa",
            isActive: true,
          },
          {
            name: "Cuci Bedcover Besar",
            desc: "Pembersihan menyeluruh bedcover/selimut besar dengan mesin cuci kapasitas berat.",
            price: 25000,
            unit: "pcs",
            durationHours: 48,
            category: "satuan",
            isActive: true,
          },
          {
            name: "Cuci Sepatu Premium",
            desc: "Deep clean sepatu sneakers, canvas, atau kulit.",
            price: 30000,
            unit: "pasang",
            durationHours: 48,
            category: "satuan",
            isActive: true,
          },
        ],
      },
      {
        ownerId: rendyUser._id,
        storeName: "Bersih Kilat Laundry",
        description: "Solusi laundry modern serba cepat dengan teknologi ozon anti kuman.",
        address: "Jl. Raya Kamojang No. 12, Garut",
        phone: rendyUser.phone,
        openingHours: "Buka • Tutup 21.00",
        isOpen: true,
        rating: 4.6,
        totalReviews: 89,
        distanceText: "1.1 km",
        imageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80",
        badges: ["Antar Jemput", "Ekspres 3 Jam"],
        services: [
          {
            name: "Cuci Komplit Kilat",
            desc: "Cuci dan setrika wangi dengan teknologi detergen ramah lingkungan.",
            price: 7000,
            unit: "kg",
            durationHours: 24,
            category: "biasa",
            isActive: true,
          },
          {
            name: "Super Express 2 Jam",
            desc: "Cucian selesai dalam 2 jam.",
            price: 12000,
            unit: "kg",
            durationHours: 2,
            category: "ekspres",
            isActive: true,
          },
          {
            name: "Cuci Selimut & Sprei",
            desc: "Pembersihan sprei kasur nomor 1/2/3.",
            price: 15000,
            unit: "pcs",
            durationHours: 24,
            category: "satuan",
            isActive: true,
          },
        ],
      },
      {
        ownerId: rohaniUser._id,
        storeName: "Laundry Ibu Rohani",
        description: "Laundry keluarga terpercaya, rapi, wangi khas melati tahan lama.",
        address: "Jl. Lapang Panas Bumi, Kawah Kamojang",
        phone: rohaniUser.phone,
        openingHours: "Buka • Tutup 20.00",
        isOpen: true,
        rating: 4.9,
        totalReviews: 210,
        distanceText: "0.2 km",
        imageUrl: "https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=600&q=80",
        badges: ["Antar Jemput", "Harga Hemat"],
        services: [
          {
            name: "Cuci Komplit Murah",
            desc: "Paket hemat cuci setrika harum khas Ibu Rohani.",
            price: 5000,
            unit: "kg",
            durationHours: 24,
            category: "biasa",
            isActive: true,
          },
          {
            name: "Cuci Lipat Saja",
            desc: "Cuci kering langsung lipat rapi.",
            price: 3500,
            unit: "kg",
            durationHours: 24,
            category: "biasa",
            isActive: true,
          },
          {
            name: "Gordyn & Karpet Ringan",
            desc: "Cuci gordyn dan karpet per meter/lembar.",
            price: 15000,
            unit: "meter",
            durationHours: 48,
            category: "satuan",
            isActive: true,
          },
        ],
      },
    ];

    for (const st of storesData) {
      await LaundryStore.findOneAndUpdate(
        { ownerId: st.ownerId },
        st,
        { upsert: true, new: true }
      );
      console.log(` Seeded store: ${st.storeName}`);
    }

    console.log(" Laundry Seeding Completed Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Laundry Seeding Failed:", error);
    process.exit(1);
  }
};

seedLaundry();
