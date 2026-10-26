require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const LaundryStore = require("./models/LaundryStore");
const Kost = require("./models/Kost");

const DEFAULT_PW = "12345678";

const KOST_DATA = [
  {
    ownerName: "Bu Nenti",
    ownerEmail: "bunenti.kost@gmail.com",
    ownerPhone: "+6281234567011",
    kostName: "Kost Bu Nenti",
    categoryType: "kost",
    address: "Masuk gang mesjid Al-Kausar RT 002 RW 007 Desa Laksana Kec. Ibun Kab. Bandung",
    roomCount: 9,
    minPrice: 500000,
    facilities: [
      "Kamar Mandi Dalam",
      "Water Heater",
      "Kasur, Bantal & Selimut",
      "Rice Cooker per Kamar",
      "Air Galon",
      "Lemari Pakaian",
      "Dapur Bersama Lengkap",
      "Kulkas & Kompor Gas",
      "Tempat Jemuran",
      "Rak Sepatu",
      "Garasi Motor Luas",
    ],
    rooms: [
      { roomNumber: "Kamar 1", roomType: "Water Heater", floor: 1, priceMonthly: 650000, isAvailable: true },
      { roomNumber: "Kamar 2", roomType: "Standard", floor: 1, priceMonthly: 500000, isAvailable: true },
      { roomNumber: "Kamar 3", roomType: "Standard", floor: 1, priceMonthly: 500000, isAvailable: true },
      { roomNumber: "Kamar 4", roomType: "Water Heater", floor: 1, priceMonthly: 650000, isAvailable: true },
      { roomNumber: "Kamar 5", roomType: "Standard", floor: 1, priceMonthly: 500000, isAvailable: true },
      { roomNumber: "Kamar 6", roomType: "Standard", floor: 2, priceMonthly: 500000, isAvailable: true },
      { roomNumber: "Kamar 7", roomType: "Water Heater", floor: 2, priceMonthly: 650000, isAvailable: true },
      { roomNumber: "Kamar 8", roomType: "Standard", floor: 2, priceMonthly: 500000, isAvailable: true },
      { roomNumber: "Kamar 9", roomType: "Water Heater", floor: 2, priceMonthly: 650000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ibu Iput",
    ownerEmail: "ibuiput.kost@gmail.com",
    ownerPhone: "+6281234567012",
    kostName: "Kost Ibu Iput",
    categoryType: "kost",
    address: "Kahuripan Kamojang Rt 001 Rw 007 Desa Laksana Kec. Ibun Kabupaten Bandung",
    roomCount: 4,
    minPrice: 750000,
    facilities: [
      "2 Kamar Mandi Luar + Free Water Heater",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian per Kamar",
      "Dapur Bersama Lengkap",
      "Kulkas & Kompor Gas",
      "Rice Cooker & Alat Masak",
      "Garasi Motor",
      "Tempat Jemuran",
      "Termasuk Listrik, Air & Gas",
    ],
    rooms: [
      { roomNumber: "Kamar 01", roomType: "Standard Reguler", floor: 1, priceMonthly: 750000, isAvailable: true },
      { roomNumber: "Kamar 02", roomType: "Standard Reguler", floor: 1, priceMonthly: 750000, isAvailable: true },
      { roomNumber: "Kamar 03", roomType: "Standard Reguler", floor: 1, priceMonthly: 750000, isAvailable: true },
      { roomNumber: "Kamar 04", roomType: "Standard Reguler", floor: 1, priceMonthly: 750000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ibu Iput",
    ownerEmail: "ibuiput.kost@gmail.com", // same owner as Kost Ibu Iput
    ownerPhone: "+6281234567012",
    kostName: "HomeStay Ibu Iput",
    categoryType: "hotel",
    address: "Kahuripan Kamojang Rt 001 Rw 007 Desa Laksana Kec. Ibun Kabupaten Bandung",
    roomCount: 3,
    minPrice: 800000,
    facilities: [
      "1 Rumah (3 Kamar + 1 Extra Bed)",
      "2 Kamar Mandi Luar + Free Water Heater",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian per Kamar",
      "Dapur Bersama (Kulkas, Kompor, Rice Cooker, Meja Makan)",
      "Ruang Tamu Bersama (Sofa, Lemari)",
      "Garasi Motor Luas",
      "Tempat Jemuran Luas",
      "Paket Mahasiswa & Proyek Tersedia",
    ],
    rooms: [
      { roomNumber: "Kamar Extra Bed (4 Orang)", roomType: "Family Extra Bed", floor: 1, priceMonthly: 2000000, isAvailable: true },
      { roomNumber: "Kamar Reguler A", roomType: "Reguler", floor: 1, priceMonthly: 800000, isAvailable: true },
      { roomNumber: "Kamar Reguler B", roomType: "Reguler", floor: 1, priceMonthly: 1000000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ibu Mey",
    ownerEmail: "ibumey.kost@gmail.com",
    ownerPhone: "+6281234567014",
    kostName: "Kost Ibu Mey",
    categoryType: "kost",
    address: "Jalan Kamojang - Samarang Garut No.74, Desa Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 7,
    minPrice: 750000,
    facilities: [
      "Kamar Mandi Dalam & Luar + Water Heater",
      "Free WiFi Super Cepat",
      "Free Laundry Sprei Tiap Bulan",
      "Rice Cooker & Kasur Lengkap",
      "Ruang Tamu Bersama + TV",
      "Dapur Bersama Lengkap",
      "Sudah Termasuk Listrik, Air & Gas",
    ],
    rooms: [
      { roomNumber: "Kamar Atas 01 (KM Dalam + WH)", roomType: "VIP Atas", floor: 2, priceMonthly: 1200000, isAvailable: true },
      { roomNumber: "Kamar Atas 02 (KM Dalam + WH)", roomType: "VIP Atas", floor: 2, priceMonthly: 1000000, isAvailable: true },
      { roomNumber: "Kamar Bawah 01", roomType: "Reguler Bawah", floor: 1, priceMonthly: 750000, isAvailable: true },
      { roomNumber: "Kamar Bawah 02", roomType: "Reguler Bawah", floor: 1, priceMonthly: 750000, isAvailable: true },
      { roomNumber: "Kamar Bawah 03", roomType: "Reguler Bawah", floor: 1, priceMonthly: 850000, isAvailable: true },
      { roomNumber: "Kamar Bawah 04", roomType: "Reguler Bawah", floor: 1, priceMonthly: 800000, isAvailable: true },
      { roomNumber: "Kamar Bawah 05", roomType: "Reguler Bawah", floor: 1, priceMonthly: 750000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ibu Umara",
    ownerEmail: "ibuumara.kost@gmail.com",
    ownerPhone: "+6281234567015",
    kostName: "HomeStay Umara",
    categoryType: "hotel",
    address: "Jl. Raya Kamojang No.17 RT 002 RW 007, Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 3,
    minPrice: 600000,
    facilities: [
      "1 Rumah 3 Kamar",
      "2 Kamar Mandi Luar",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian",
      "Ruang Tamu Bersama",
      "Dapur Bersama Lengkap",
      "Tempat Jemuran",
      "Halaman Luas",
      "Bisa Sewa Harian (Rp 200rb) / Bulanan",
    ],
    rooms: [
      { roomNumber: "Kamar Umara 1", roomType: "Standard", floor: 1, priceMonthly: 600000, isAvailable: true },
      { roomNumber: "Kamar Umara 2", roomType: "Standard", floor: 1, priceMonthly: 600000, isAvailable: true },
      { roomNumber: "Kamar Umara 3", roomType: "Standard", floor: 1, priceMonthly: 600000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ani Apriyani",
    ownerEmail: "aniapriyani.kost@gmail.com",
    ownerPhone: "+6281312512358",
    kostName: "Kost Ibu Ani 1",
    categoryType: "kost",
    address: "Laksana, Kec. Ibun, Kabupaten Bandung, Jawa Barat (Toko Raisa)",
    roomCount: 12,
    minPrice: 1500000,
    facilities: [
      "Kamar Mandi Dalam + Water Heater",
      "Kasur + Sprei + Bantal + Selimut",
      "Lemari Pakaian",
      "Dispenser & Tempat Jemuran",
      "Halaman Luas",
      "Bisa Harian (Rp 50rb) / Bulanan",
    ],
    rooms: Array.from({ length: 12 }, (_, i) => ({
      roomNumber: `Kamar ${i + 1}`,
      roomType: "KM Dalam + Water Heater",
      floor: i < 6 ? 1 : 2,
      priceMonthly: 1500000,
      isAvailable: true,
    })),
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Pak Ong",
    ownerEmail: "pakong.kost@gmail.com",
    ownerPhone: "+6281234567017",
    kostName: "Kost Pak Ong",
    categoryType: "kost",
    address: "Jl. Kamojang-Samarang Garut No.72, Laksana, Kec. Ibun, Kabupaten Bandung 40384",
    roomCount: 13,
    minPrice: 400000,
    facilities: [
      "Sudah Termasuk Listrik & Air",
      "Kamar Mandi Sharing + Water Heater",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian",
      "Dapur Bersama & Dispenser",
      "Tempat Jemuran & Garasi",
    ],
    rooms: Array.from({ length: 13 }, (_, i) => ({
      roomNumber: `Kamar ${i + 1}`,
      roomType: "Standard",
      floor: i < 7 ? 1 : 2,
      priceMonthly: i % 2 === 0 ? 400000 : 500000,
      isAvailable: true,
    })),
    images: [
      "https://images.unsplash.com/photo-1540518614846-7ede433c4570?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ani Apriyani",
    ownerEmail: "aniapriyani.kost@gmail.com",
    ownerPhone: "+6281312512358",
    kostName: "Kost Ibu Ani 2",
    categoryType: "kost",
    address: "Jl. Raya Kamojang RT 02 RW 07, Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 6,
    minPrice: 600000,
    facilities: [
      "Kamar Mandi Sharing + Water Heater",
      "Kasur, Sprei, Bantal, Selimut",
      "Lemari Pakaian & Dispenser",
      "Tempat Jemuran",
      "Include Listrik",
    ],
    rooms: Array.from({ length: 6 }, (_, i) => ({
      roomNumber: `Kamar 0${i + 1}`,
      roomType: "Reguler",
      floor: 1,
      priceMonthly: 650000,
      isAvailable: true,
    })),
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ani Apriyani",
    ownerEmail: "aniapriyani.kost@gmail.com",
    ownerPhone: "+6281312512358",
    kostName: "Kost Ibu Ani 3",
    categoryType: "kost",
    address: "Jl. Raya Kamojang RT 02 RW 07, Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 6,
    minPrice: 400000,
    facilities: [
      "Kamar Mandi Sharing + Water Heater",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian & Dispenser",
      "Dapur Luar & Jemuran",
      "Include Listrik",
    ],
    rooms: Array.from({ length: 6 }, (_, i) => ({
      roomNumber: `Kamar 0${i + 1}`,
      roomType: "Ekonomis",
      floor: 1,
      priceMonthly: 400000,
      isAvailable: true,
    })),
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ibu Lisna",
    ownerEmail: "ibulisna.kost@gmail.com",
    ownerPhone: "+6285324506073",
    kostName: "Kost Ibu Lisna",
    categoryType: "kost",
    address: "Kp. Kamojang, RT 02 / RW 06, Laksana, Kec. Ibun, Kab. Bandung 40384",
    roomCount: 13,
    minPrice: 800000,
    facilities: [
      "Kamar Mandi Dalam + Water Heater",
      "Smart TV & Kulkas",
      "Kasur (Bisa Double), Sprei & Selimut",
      "Lemari Pakaian",
      "Dispenser & Galon",
      "Dapur Dalam & Luar",
      "Rice Cooker & Alat Makan",
      "Include Listrik",
    ],
    rooms: [
      ...Array.from({ length: 5 }, (_, i) => ({ roomNumber: `Kamar Tipe A-${i + 1}`, roomType: "Standard", floor: 1, priceMonthly: 800000, isAvailable: true })),
      ...Array.from({ length: 4 }, (_, i) => ({ roomNumber: `Kamar Tipe B-${i + 1}`, roomType: "Medium", floor: 2, priceMonthly: 1000000, isAvailable: true })),
      ...Array.from({ length: 4 }, (_, i) => ({ roomNumber: `Kamar VIP-${i + 1}`, roomType: "VIP Smart TV", floor: 2, priceMonthly: 1700000, isAvailable: true })),
    ],
    images: [
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Pak Nono",
    ownerEmail: "paknono.kost@gmail.com",
    ownerPhone: "+6281234567020",
    kostName: "Kost Pak Nono",
    categoryType: "kost",
    address: "Jl. Raya Kamojang, Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 8,
    minPrice: 500000,
    facilities: [
      "Lantai Bawah: Kamar Mandi Dalam",
      "Lantai Atas: 2 Kamar Mandi Luar",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian per Kamar",
      "Ruang Tamu Bersama + Sofa & Tempat Nyetrika",
      "Dapur Bersama Lengkap (Kulkas, Kompor, Rice Cooker)",
      "Garasi Motor",
    ],
    rooms: [
      ...Array.from({ length: 4 }, (_, i) => ({ roomNumber: `Kamar Bawah 0${i + 1}`, roomType: "KM Dalam", floor: 1, priceMonthly: 500000, isAvailable: true })),
      ...Array.from({ length: 4 }, (_, i) => ({ roomNumber: `Kamar Atas 0${i + 1}`, roomType: "KM Luar", floor: 2, priceMonthly: 650000, isAvailable: true })),
    ],
    images: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Ibu Siti Cabby",
    ownerEmail: "chabby.homestay@gmail.com",
    ownerPhone: "+6281234567021",
    kostName: "Home Stay Cabby",
    categoryType: "hotel",
    address: "Kp. Kamojang RT 02/07, Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 1,
    minPrice: 500000,
    facilities: [
      "Kamar Mandi Dalam + Water Heater",
      "Kasur, Sprei, Bantal & Selimut",
      "Lemari Pakaian",
      "Dispenser & Tempat Jemuran",
      "Halaman Luas",
    ],
    rooms: [
      { roomNumber: "Kamar Homestay Cabby", roomType: "Homestay Privat", floor: 1, priceMonthly: 500000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    ownerName: "Pak Irsyadi",
    ownerEmail: "pakirsyadi.kost@gmail.com",
    ownerPhone: "+6281234567022",
    kostName: "Kost Irsyadi",
    categoryType: "kost",
    address: "Jl. Raya Kamojang, Laksana, Kec. Ibun, Kabupaten Bandung",
    roomCount: 2,
    minPrice: 600000,
    facilities: [
      "Toilet + Pemanas Air (Water Heater)",
      "Kasur, Bantal, Guling & Sprei",
      "Meja Belajar & Lemari Baju",
      "Ruang Tamu Bersama",
    ],
    rooms: [
      { roomNumber: "Kamar 1 (Pemanas Air + Meja Belajar + Ruang Tamu)", roomType: "Deluxe", floor: 1, priceMonthly: 800000, isAvailable: true },
      { roomNumber: "Kamar 2 (Toilet + Lemari)", roomType: "Standard", floor: 1, priceMonthly: 600000, isAvailable: true },
    ],
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
    ],
  },
];

async function seedAllMitra() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is not defined");

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB!");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PW, salt);

    // 1. Gusni Santiana - Laundry
    console.log("\n--- Menambahkan Gusni Santiana (Laundry) ---");
    const gusniEmail = "gusnisantiana.laundry@gmail.com";
    const gusniPhone = "+6281234567030";
    const gusniStoreName = "Gusni Santiana Laundry";
    const gusniAddress = "Jl. Raya Kamojang, Samarang, Garut";

    let gusniUser = await User.findOne({ email: gusniEmail });
    if (!gusniUser) {
      gusniUser = await User.create({
        name: "Gusni Santiana",
        email: gusniEmail,
        phone: gusniPhone,
        address: gusniAddress,
        role: "pemilik_laundry",
        passwordHash,
        status: "verified",
        roleData: {
          businessName: gusniStoreName,
          businessAddress: gusniAddress,
          serviceType: "express",
          operatingHours: "08.00 - 21.00",
          phone: gusniPhone,
        },
      });
      console.log(`✅ User Laundry Gusni Santiana created (${gusniEmail})`);
    } else {
      gusniUser.status = "verified";
      gusniUser.passwordHash = passwordHash;
      await gusniUser.save();
      console.log(`✅ User Laundry Gusni Santiana updated (${gusniEmail})`);
    }

    let gusniStore = await LaundryStore.findOne({ ownerId: gusniUser._id });
    const gusniStorePayload = {
      ownerId: gusniUser._id,
      storeName: gusniStoreName,
      description: "Layanan cuci bersih, higienis, rapi dan cepat wangi tahan lama mitra terpercaya Kamojang.",
      address: gusniAddress,
      phone: gusniPhone,
      openingHours: "08.00 - 21.00",
      openingDays: "Buka Setiap Hari",
      openingTime: "08:00",
      closingTime: "21:00",
      isOpen: true,
      rating: 4.8,
      totalReviews: 24,
      distanceText: "0.7 km",
      imageUrl: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
      badges: ["Antar Jemput", "Ekspres 3 Jam", "Garansi Bersih"],
      bankName: "Mandiri",
      bankAccountNumber: "1330098765432",
      bankAccountHolder: "Gusni Santiana",
      services: [
        { name: "Cuci Komplit (Wash & Iron)", desc: "Cuci, kering, setrika uap, pewangi & packing", price: 7000, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
        { name: "Cuci Kering Lipat", desc: "Cuci higienis & lipat rapi tanpa setrika", price: 5000, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
        { name: "Setrika Uap Saja", desc: "Setrika rapi licin & wangi tahan lama", price: 4000, unit: "kg", durationHours: 12, category: "biasa", isActive: true },
        { name: "Express Kilat 3 Jam", desc: "Layanan prioritas cepat selesai 3 jam", price: 12000, unit: "kg", durationHours: 3, category: "ekspres", isActive: true },
        { name: "Cuci Bedcover Besar", desc: "Pembersihan menyeluruh selimut / bedcover", price: 25000, unit: "pcs", durationHours: 48, category: "satuan", isActive: true },
      ],
    };

    if (gusniStore) {
      Object.assign(gusniStore, gusniStorePayload);
      await gusniStore.save();
    } else {
      await LaundryStore.create(gusniStorePayload);
    }
    console.log(`✅ LaundryStore ${gusniStoreName} ready.`);

    // 2. Seed All 13 Kost & Homestays
    console.log("\n--- Menambahkan 13 Kost & Homestay Kamojang ---");
    for (const item of KOST_DATA) {
      let owner = await User.findOne({ email: item.ownerEmail });
      if (!owner) {
        owner = await User.create({
          name: item.ownerName,
          email: item.ownerEmail,
          phone: item.ownerPhone,
          address: item.address,
          role: "pemilik_kos",
          passwordHash,
          status: "verified",
          roleData: {
            businessName: item.kostName,
            businessAddress: item.address,
            kostType: "Campur",
            roomCount: String(item.roomCount),
            phone: item.ownerPhone,
          },
        });
        console.log(`✅ Owner created: ${item.ownerName} (${item.ownerEmail})`);
      } else {
        owner.status = "verified";
        owner.passwordHash = passwordHash;
        await owner.save();
      }

      let existingKost = await Kost.findOne({ name: item.kostName });
      const kostPayload = {
        ownerId: owner._id,
        name: item.kostName,
        categoryType: item.categoryType,
        type: "Campur",
        address: item.address,
        city: "Garut / Bandung",
        district: "Ibun / Kamojang",
        price: item.minPrice,
        facilities: item.facilities,
        rules: ["Jaga ketertiban & kebersihan bersama", "Dilarang membawa barang berbahaya", "Tamu menginap harap konfirmasi"],
        images: item.images,
        rooms: item.rooms,
        bankAccount: {
          paymentType: "bank",
          bankName: "BRI",
          accountNumber: "012301987654321",
          accountHolder: item.ownerName,
        },
        rating: 4.8 + Math.round(Math.random() * 2) / 10,
        reviewCount: 15 + Math.floor(Math.random() * 30),
        isActive: true,
      };

      if (existingKost) {
        Object.assign(existingKost, kostPayload);
        await existingKost.save();
        console.log(`   🏡 Kost updated: ${item.kostName}`);
      } else {
        await Kost.create(kostPayload);
        console.log(`   🏡 Kost created: ${item.kostName}`);
      }
    }

    console.log("\n=========================================");
    console.log("🎉 SEMUA MITRA REAL KAMOJANG BERHASIL DI-INJECT!");
    console.log("🔑 Password Serentak: 12345678");
    console.log("=========================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seedAllMitra();
