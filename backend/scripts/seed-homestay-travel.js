const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Kost = require("../models/Kost");

async function seedHomestayTravelData() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB for Homestay & Travel Seeding...");

    const defaultPassword = await bcrypt.hash("password123", 10);

    // 1. Create or Find Real Partner/Owner Accounts
    const partners = [
      {
        name: "General Manager - Santika Hotel",
        email: "santika.hotel@geoverse.com",
        phone: "081223344551",
        address: "Jl. Cipanas Baru No.88, Tarogong Kaler, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Pengelola Kamojang Green Resort",
        email: "kamojang.resort@geoverse.com",
        phone: "081223344552",
        address: "Jl. Raya Kamojang KM.3, Samarang, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Host Villa Rancabango Onsen",
        email: "rancabango.villa@geoverse.com",
        phone: "081223344553",
        address: "Jl. Rancabango No.12, Tarogong Kaler, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Direktur PT Sabda Alam Garut",
        email: "sabdaalam.waterpark@geoverse.com",
        phone: "081223344554",
        address: "Jl. Raya Cipanas No.3, Tarogong Kaler, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Manajemen Situ Bagendit",
        email: "situ.bagendit@geoverse.com",
        phone: "081223344555",
        address: "Jl. KH. Hasan Arif, Banyuresmi, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Pengelola Kamojang Ecopark",
        email: "kamojang.ecopark@geoverse.com",
        phone: "081223344556",
        address: "Jl. Raya Kamojang, Cisarua, Samarang, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Manager Dago Highland Bandung",
        email: "dago.highland@geoverse.com",
        phone: "081223344557",
        address: "Jl. Bukit Pakar Timur IV No.88, Dago Atas, Bandung",
        role: "pemilik_kos",
        status: "verified",
      },
      {
        name: "Ibu Aisyah (Ais Kos)",
        email: "aisk@gmail.com",
        phone: "087805987309",
        address: "Jl. Raya Tarogong Kaler, Garut",
        role: "pemilik_kos",
        status: "verified",
      },
    ];

    const ownerMap = {};
    for (const p of partners) {
      let user = await User.findOne({ email: p.email });
      if (!user) {
        user = await User.create({
          ...p,
          password: defaultPassword,
        });
        console.log(`👤 Created Owner: ${p.name} (${p.email})`);
      } else {
        user.name = p.name;
        user.role = "pemilik_kos";
        user.status = "verified";
        await user.save();
        console.log(`🔄 Updated Owner: ${p.name} (${p.email})`);
      }
      ownerMap[p.email] = user._id;
    }

    // 2. Prepare Real Listing Data for Database
    const listings = [
      // -------------------------------------------------------------
      // HOTEL & VILLA
      // -------------------------------------------------------------
      {
        ownerId: ownerMap["santika.hotel@geoverse.com"],
        name: "Santika Hotel & Convention Garut",
        categoryType: "hotel",
        type: "Hotel Bintang 4",
        stars: 4,
        price: 685000,
        address: "Jl. Cipanas Baru No.88, Panawuan, Tarogong Kaler, Garut",
        city: "Garut",
        district: "Tarogong Kaler",
        latitude: -7.1852,
        longitude: 107.8764,
        description:
          "Hotel bintang 4 mewah dengan pemandangan Gunung Guntur langsung, kolam renang air panas alami, restoran khas Sunda, dan ruang konvensi modern.",
        facilities: [
          "Kolam Renang Air Panas",
          "Sarapan Gratis",
          "WiFi Cepat",
          "Restoran",
          "Fitness Center",
          "Parkir Luas",
        ],
        images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomName: "Superior Twin Bed (View Kolam)",
            bedType: "2 Single Bed",
            capacity: 2,
            pricePerNight: 685000,
            isAvailable: true,
            facilities: ["AC", "TV 43 inch", "Kulkas Mini", "Kamar Mandi Panas/Dingin", "Balkon"],
            images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
          {
            roomName: "Deluxe King Bed (View Gunung Guntur)",
            bedType: "1 King Bed",
            capacity: 2,
            pricePerNight: 850000,
            isAvailable: true,
            facilities: ["AC", "Bathtub Air Panas", "Smart TV", "Coffee Maker", "Balkon View Gunung"],
            images: ["https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
          {
            roomName: "Executive Family Suite",
            bedType: "2 Queen Bed",
            capacity: 4,
            pricePerNight: 1450000,
            isAvailable: true,
            facilities: ["Ruang Tamu Terpisah", "2 Kamar Mandi", "Bathtub Air Panas", "Balkon Panoramik"],
            images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BCA",
          accountNumber: "8472910394",
          accountHolder: "PT Santika Garut Utama",
        },
        isActive: true,
      },
      {
        ownerId: ownerMap["kamojang.resort@geoverse.com"],
        name: "Kamojang Green Hotel & Resort",
        categoryType: "hotel",
        type: "Resort & Bungalow",
        stars: 4,
        price: 790000,
        address: "Jl. Raya Kamojang KM.3, Samarang, Garut",
        city: "Garut",
        district: "Samarang",
        latitude: -7.1512,
        longitude: 107.8012,
        description:
          "Resort alam berkonsep ramah lingkungan di atas danau buatan dengan udara sejuk pegunungan Kamojang. Cocok untuk liburan keluarga dan relaksasi.",
        facilities: [
          "Danau Dayung",
          "Kolam Air Panas Belerang",
          "Outbound & Camp",
          "Resto Terapung",
          "Spa Alami",
        ],
        images: [
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomName: "Wooden Bungalow Lake View",
            bedType: "1 King Bed",
            capacity: 2,
            pricePerNight: 790000,
            isAvailable: true,
            facilities: ["Teras Danau", "Water Heater Alami", "Mini Bar", "Wifi"],
            images: ["https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
          {
            roomName: "Villa 2 Kamar Pasundan Suite",
            bedType: "2 Queen Bed",
            capacity: 5,
            pricePerNight: 1650000,
            isAvailable: true,
            facilities: ["Kolam Rendam Pribadi", "Dapur Lengkap", "Teras Danau", "BBQ Area"],
            images: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "Mandiri",
          accountNumber: "1310088920192",
          accountHolder: "Kamojang Green Resort",
        },
        isActive: true,
      },
      {
        ownerId: ownerMap["rancabango.villa@geoverse.com"],
        name: "Rancabango Private Villa & Onsen",
        categoryType: "hotel",
        type: "Villa Private",
        stars: 5,
        price: 1250000,
        address: "Jl. Rancabango No.12, Tarogong Kaler, Garut",
        city: "Garut",
        district: "Tarogong Kaler",
        latitude: -7.1723,
        longitude: 107.8912,
        description:
          "Villa eksklusif dengan private onsen (kolam air panas belerang pribadi) di dalam villa, pemandangan sawah dan Gunung Guntur yang asri.",
        facilities: [
          "Private Onsen",
          "Dapur Modern",
          "Smart Home",
          "Gazebo & Garden",
          "Free WiFi 100Mbps",
        ],
        images: [
          "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomName: "Villa Sakura 1 Bedroom + Onsen",
            bedType: "1 King Bed + 1 Sofa Bed",
            capacity: 3,
            pricePerNight: 1250000,
            isAvailable: true,
            facilities: ["Private Onsen", "Dapur", "Living Room", "Smart TV 55 inch"],
            images: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BCA",
          accountNumber: "0248819201",
          accountHolder: "PT Rancabango Villa Asri",
        },
        isActive: true,
      },
      {
        ownerId: ownerMap["dago.highland@geoverse.com"],
        name: "Dago Highland Resort & Heritage",
        categoryType: "hotel",
        type: "Hotel Bintang 3",
        stars: 3,
        price: 495000,
        address: "Jl. Bukit Pakar Timur IV No.88, Dago Atas, Bandung",
        city: "Bandung",
        district: "Cimenyan",
        latitude: -6.8532,
        longitude: 107.6321,
        description:
          "Terletak di ketinggian Dago Atas Bandung dengan pemandangan gemerlap lampu kota di malam hari, udara sejuk dan suasana romantis.",
        facilities: [
          "Infinity Pool",
          "Sky Lounge Cafe",
          "Free Shuttle ke Dago Plaza",
          "Meeting Room",
        ],
        images: [
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomName: "Deluxe Mountain View",
            bedType: "1 Queen Bed",
            capacity: 2,
            pricePerNight: 495000,
            isAvailable: true,
            facilities: ["AC", "Balkon View Kota", "Water Heater", "Tea/Coffee Maker"],
            images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80"],
            breakfastIncluded: true,
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BCA",
          accountNumber: "0098765432",
          accountHolder: "Dago Highland Resort",
        },
        isActive: true,
      },

      // -------------------------------------------------------------
      // WISATA & ATRAKSI
      // -------------------------------------------------------------
      {
        ownerId: ownerMap["sabdaalam.waterpark@geoverse.com"],
        name: "Taman Air Sabda Alam Cipanas",
        categoryType: "wisata",
        type: "Waterpark & Rekreasi Air Panas",
        price: 45000,
        address: "Jl. Raya Cipanas No.3, Rancabango, Tarogong Kaler, Garut",
        city: "Garut",
        district: "Tarogong Kaler",
        latitude: -7.1895,
        longitude: 107.8721,
        openHours: "07:00 - 18:00 WIB (Buka Setiap Hari)",
        description:
          "Wahana taman air panas alami terlengkap di Garut dengan kolam ombak, seluncuran spiral raksasa, ember tumpah, dan terapi air belerang yang menyehatkan.",
        facilities: [
          "Kolam Ombak",
          "Waterboom Spiral",
          "Kolam Terapi Ikan",
          "Foodcourt & Gazebo",
          "Loker & Ruang Ganti",
          "Musholla",
        ],
        images: [
          "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80",
        ],
        wisataTickets: [
          {
            ticketName: "Tiket Masuk Reguler (Weekday)",
            ticketType: "reguler",
            price: 45000,
            description: "Akses ke seluruh kolam air panas, kolam anak, dan kolam renang olympic.",
            includedFacilities: ["Kolam Air Panas Alami", "Kolam Anak", "Ruang Bilas Standar"],
          },
          {
            ticketName: "Tiket Terusan Wahana Lengkap (All-Access)",
            ticketType: "terusan",
            price: 75000,
            description: "Akses bebas ke kolam ombak tsunami, waterboom spiral, kolam terapi ikan, dan flying fox.",
            includedFacilities: ["Kolam Ombak Tsunami", "Waterboom Raksasa", "Terapi Ikan Garra Rufa", "Gazebo Free 1 Jam"],
          },
          {
            ticketName: "Paket Keluarga (4 Orang) + Gazebo",
            ticketType: "vip",
            price: 240000,
            description: "Tiket untuk 4 orang dewasa/anak + sewa gazebo seharian penuh + voucher makan Rp 50.000.",
            includedFacilities: ["Tiket 4 Orang", "Gazebo Seharian", "Voucher Makan Rp 50k"],
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BCA",
          accountNumber: "0248819201",
          accountHolder: "PT Sabda Alam Garut",
        },
        isActive: true,
      },
      {
        ownerId: ownerMap["kamojang.ecopark@geoverse.com"],
        name: "Kamojang Ecopark & Pine Forest",
        categoryType: "wisata",
        type: "Wisata Alam & Pinus",
        price: 20000,
        address: "Jl. Raya Kamojang, Cisarua, Samarang, Garut",
        city: "Garut",
        district: "Samarang",
        latitude: -7.1423,
        longitude: 107.7954,
        openHours: "08:00 - 17:00 WIB (Buka Setiap Hari)",
        description:
          "Hutan pinus asri di perbatasan Garut-Bandung dengan spot foto estetik, jembatan gantung, flying fox, dan area camping ground berhawa dingin.",
        facilities: [
          "Spot Foto Instagramable",
          "Jembatan Gantung",
          "Camping Ground",
          "Cafe Hutan Pinus",
          "Flying Fox",
        ],
        images: [
          "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
        ],
        wisataTickets: [
          {
            ticketName: "Tiket Masuk Reguler",
            ticketType: "reguler",
            price: 20000,
            description: "Akses jalan-jalan di area hutan pinus dan spot foto gardu pandang.",
            includedFacilities: ["Akses Hutan Pinus", "Spot Selfie Standar"],
          },
          {
            ticketName: "Tiket Terusan Adventure (Flying Fox + Sky Bridge)",
            ticketType: "terusan",
            price: 45000,
            description: "Termasuk tiket masuk, 1x wahana flying fox 150m, dan sky bridge jembatan gantung.",
            includedFacilities: ["Flying Fox 150M", "Sky Bridge Jembatan Gantung", "Spot Ayunan Langit"],
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BRI",
          accountNumber: "010901928374829",
          accountHolder: "Koperasi Wana Lestari Kamojang",
        },
        isActive: true,
      },
      {
        ownerId: ownerMap["situ.bagendit@geoverse.com"],
        name: "Situ Bagendit New Revitalized Park",
        categoryType: "wisata",
        type: "Wisata Danau & Rekreasi",
        price: 15000,
        address: "Jl. KH. Hasan Arif, Sukamukti, Banyuresmi, Garut",
        city: "Garut",
        district: "Banyuresmi",
        latitude: -7.1567,
        longitude: 107.9345,
        openHours: "07:30 - 17:30 WIB",
        description:
          "Danau alami bersejarah yang baru direvitalisasi dengan amphitheater terapung, perahu naga, sepeda air angsa, dan taman bermain anak.",
        facilities: [
          "Perahu Naga Danau",
          "Sepeda Air Angsa",
          "Amphitheater Terapung",
          "Taman Kuliner Rakyat",
          "Dermaga Kaca",
        ],
        images: [
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        ],
        wisataTickets: [
          {
            ticketName: "Tiket Masuk Kawasan Situ Bagendit",
            ticketType: "reguler",
            price: 15000,
            description: "Akses masuk gerbang utama, taman dermaga kaca, dan plaza danau.",
            includedFacilities: ["Akses Plaza Danau", "Spot Dermaga Kaca"],
          },
          {
            ticketName: "Tiket Bundling Danau + Perahu Naga",
            ticketType: "terusan",
            price: 35000,
            description: "Tiket masuk + naik perahu naga keliling danau selama 25 menit.",
            includedFacilities: ["Perahu Naga Keliling Danau", "Pelampung Keselamatan"],
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BJB",
          accountNumber: "001928374619",
          accountHolder: "BUMDes Sukamukti Bagendit",
        },
        isActive: true,
      },

      // -------------------------------------------------------------
      // KOST & HOMESTAY
      // -------------------------------------------------------------
      {
        ownerId: ownerMap["aisk@gmail.com"],
        name: "Ais Kos Exclusive & Homestay",
        categoryType: "kost",
        type: "Campur",
        price: 1200000,
        address: "Jl. Patriot No. 18, Tarogong Kaler, Garut",
        city: "Garut",
        district: "Tarogong Kaler",
        latitude: -7.2145,
        longitude: 107.8976,
        description:
          "Kos eksekutif dekat kampus UNIGA & ITG Garut dengan fasilitas kamar mandi dalam, AC, WiFi kencang, dapur bersama, dan keamanan CCTV 24 jam.",
        facilities: [
          "AC",
          "Kamar Mandi Dalam",
          "WiFi 50Mbps",
          "Kasur Springbed",
          "Lemari & Meja Belajar",
          "Dapur Bersama",
          "Parkir Motor & Mobil",
        ],
        images: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80",
        ],
        rooms: [
          {
            roomNumber: "101",
            roomType: "Tipe A (AC + KM Dalam)",
            floor: 1,
            priceMonthly: 1200000,
            isAvailable: true,
            facilities: ["AC", "KM Dalam", "WiFi", "Kasur"],
            images: ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"],
          },
          {
            roomNumber: "102",
            roomType: "Tipe A (AC + KM Dalam)",
            floor: 1,
            priceMonthly: 1200000,
            isAvailable: false,
            currentTenant: {
              name: "Reza Pratama",
              phone: "081234567890",
              entryDate: new Date(),
              durationMonths: 6,
              extensionStatus: "lunas",
            },
            facilities: ["AC", "KM Dalam", "WiFi", "Kasur"],
            images: ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"],
          },
          {
            roomNumber: "201",
            roomType: "Tipe B (Non-AC + KM Luar)",
            floor: 2,
            priceMonthly: 750000,
            isAvailable: true,
            facilities: ["Kipas Angin", "KM Luar", "WiFi", "Kasur"],
            images: ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80"],
          },
        ],
        bankAccount: {
          paymentType: "bank",
          bankName: "BCA",
          accountNumber: "1480928374",
          accountHolder: "Aisyah Putri",
        },
        isActive: true,
      },
    ];

    // 3. Upsert listings to MongoDB
    for (const item of listings) {
      let doc = await Kost.findOne({ name: item.name });
      if (!doc) {
        doc = await Kost.create(item);
        console.log(`🏨 Created Listing [${item.categoryType}]: ${item.name}`);
      } else {
        Object.assign(doc, item);
        await doc.save();
        console.log(`🔄 Updated Listing [${item.categoryType}]: ${item.name}`);
      }
    }

    console.log("\n🎉 Seeding Homestay, Hotel, Villa & Wisata completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

seedHomestayTravelData();
