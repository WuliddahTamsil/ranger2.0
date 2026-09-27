require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Kost = require("./models/Kost");
const Booking = require("./models/Booking");

async function seedLodgingTravel() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas for lodging & travel seeding...");

    // 1. Ensure Ais Owner exists
    let aisUser = await User.findOne({ email: "aisk@gmail.com" });
    if (!aisUser) {
      aisUser = await User.findOne({ role: "pemilik_kos" });
    }

    const ownerId = aisUser ? aisUser._id : new mongoose.Types.ObjectId();

    // 2. Data for Hotels & Villas
    const hotelData = [
      {
        name: "Kamojang Green Resort & Villa",
        categoryType: "hotel",
        type: "Campur",
        stars: 4.8,
        description: "Resort alam eksklusif di atas danau buatan dengan nuansa pedesaan Sunda modern, kolam renang air hangat alami, dan pemandangan Gunung Guntur.",
        address: "Jl. Raya Kamojang KM.3, Samarang",
        city: "Garut",
        district: "Samarang",
        coordinates: { latitude: -7.1856, longitude: 107.8105 },
        facilities: ["Kolam Renang Air Hangat", "Resto Sunda", "WiFi Cepat", "Balkon Danau", "Spa & Sauna", "Parkir Luas", "Meeting Room"],
        rules: ["Check-in: 14:00 WIB", "Check-out: 12:00 WIB", "Dilarang Merokok di Kamar", "Bebas Jam Malam"],
        cashbackPoints: 50000,
        images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomId: "hr-1",
            roomName: "Superior Twin Room",
            pricePerNight: 650000,
            capacity: 2,
            bedType: "2 Single Bed",
            includesBreakfast: true,
            isAvailable: true,
            roomFacilities: ["AC", "Smart TV", "Hot Water Shower", "Balkon", "Free WiFi"],
          },
          {
            roomId: "hr-2",
            roomName: "Deluxe King Water Bungalow",
            pricePerNight: 950000,
            capacity: 2,
            bedType: "1 King Bed",
            includesBreakfast: true,
            isAvailable: true,
            roomFacilities: ["AC", "Bathtub", "Direct Lake View", "Mini Bar", "Coffee Maker"],
          },
          {
            roomId: "hr-3",
            roomName: "Family Suite Villa (2 Bedroom)",
            pricePerNight: 1650000,
            capacity: 4,
            bedType: "2 King Bed",
            includesBreakfast: true,
            isAvailable: true,
            roomFacilities: ["Living Room", "Private Gazebo", "Kitchenette", "2 Bathroom", "Free Minibar"],
          },
        ],
        price: 650000,
        rooms: [],
        ownerId: ownerId,
        isActive: true,
      },
      {
        name: "Santika Premiere Garut Hotel",
        categoryType: "hotel",
        type: "Campur",
        stars: 4.7,
        description: "Hotel bintang 4 mewah dengan pemandangan langsung Gunung Guntur, kolam renang outdoor semi-olympic, dan fasilitas gym lengkap.",
        address: "Jl. Cipanas Baru No.395, Tarogong Kaler",
        city: "Garut",
        district: "Tarogong Kaler",
        coordinates: { latitude: -7.1994, longitude: 107.8761 },
        facilities: ["Kolam Renang Gunung", "Fitness Center", "Restoran Buffet", "Ballroom", "WiFi 100Mbps", "Valet Parking"],
        rules: ["Check-in: 14:00 WIB", "Check-out: 12:00 WIB", "Deposit Rp 200.000 saat check-in"],
        cashbackPoints: 40000,
        images: [
          "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomId: "hr-santika-1",
            roomName: "Deluxe Mountain View",
            pricePerNight: 780000,
            capacity: 2,
            bedType: "1 King Bed / 2 Twin",
            includesBreakfast: true,
            isAvailable: true,
            roomFacilities: ["AC", "Smart TV 43 inch", "Mountain View", "Work Desk", "Safe Deposit Box"],
          },
          {
            roomId: "hr-santika-2",
            roomName: "Premiere Suite Balcony",
            pricePerNight: 1350000,
            capacity: 2,
            bedType: "1 Super King Bed",
            includesBreakfast: true,
            isAvailable: true,
            roomFacilities: ["Bathtub View", "Espresso Machine", "Living Area", "Balcony to Mountain"],
          },
        ],
        price: 780000,
        rooms: [],
        ownerId: ownerId,
        isActive: true,
      },
      {
        name: "Dago Highland Resort & Spa",
        categoryType: "hotel",
        type: "Campur",
        stars: 4.6,
        description: "Resort sejuk di perbukitan Dago Atas Bandung dengan pemandangan city light spektakuler dan infinity pool berlatar lembah hijau.",
        address: "Jl. Bukit Pakar Barat No.53, Dago",
        city: "Bandung",
        district: "Cimenyan",
        coordinates: { latitude: -6.8611, longitude: 107.6293 },
        facilities: ["Infinity Pool", "City Light View", "Spa & Wellness", "Cafe & Lounge", "Free High-Speed WiFi"],
        rules: ["Check-in: 14:00 WIB", "Check-out: 12:00 WIB"],
        cashbackPoints: 45000,
        images: [
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
        ],
        hotelRooms: [
          {
            roomId: "hr-dago-1",
            roomName: "Superior Valley View",
            pricePerNight: 550000,
            capacity: 2,
            bedType: "1 Queen Bed",
            includesBreakfast: true,
            isAvailable: true,
            roomFacilities: ["AC", "Valley View", "Hot Shower", "Tea Maker"],
          },
        ],
        price: 550000,
        rooms: [],
        ownerId: ownerId,
        isActive: true,
      },
    ];

    // 3. Data for Tourist Attractions (Wisata)
    const wisataData = [
      {
        name: "Taman Wisata & Air Sabda Alam",
        categoryType: "wisata",
        type: "Campur",
        stars: 4.8,
        openHours: "07:00 - 18:00 WIB",
        description: "Waterpark air panas alami terbesar di Cipanas Garut dengan wahana Kolam Ombak, Water Boom, Lazy River, dan Kolam Terapi Busa.",
        address: "Jl. Raya Cipanas No.3, Tarogong Kaler",
        city: "Garut",
        district: "Tarogong Kaler",
        coordinates: { latitude: -7.1925, longitude: 107.8682 },
        facilities: ["Kolam Ombak Tsunami", "Waterboom Spiral", "Kolam Air Panas Alami", "Gazebo Santai", "Foodcourt Lengkap", "Loker & Bilas", "Musholla & Parkir VIP"],
        rules: ["Wajib Menggunakan Pakaian Renang", "Dilarang Membawa Makanan Berat ke Area Kolam", "Anak di Bawah 80cm Gratis"],
        cashbackPoints: 15000,
        images: [
          "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        ],
        wisataTickets: [
          {
            ticketId: "tkt-sabda-1",
            ticketTitle: "Tiket Reguler Masuk Waterpark",
            price: 45000,
            description: "Akses ke seluruh kolam renang air panas, mandi busa, dan fasilitas bilas.",
            validDays: "Setiap Hari (Weekday & Weekend)",
            includes: ["Semua Kolam Renang", "Kolam Anak & Busa", "Asuransi Pengunjung"],
          },
          {
            ticketId: "tkt-sabda-2",
            ticketTitle: "Paket Terusan + Wahana Ombak & Boom",
            price: 65000,
            description: "Tiket terusan bebas akses semua wahana atraksi air adrenalin tanpa batas antre.",
            validDays: "Setiap Hari Termasuk Hari Libur",
            includes: ["Tiket Masuk", "Semua Waterboom", "Kolam Ombak", "Free Minuman Dingin"],
          },
          {
            ticketId: "tkt-sabda-3",
            ticketTitle: "VIP Family Pass (4 Orang + Gazebo)",
            price: 240000,
            description: "Paket hemat keluarga 4 tiket terusan plus sewa gazebo VIP seharian penuh.",
            validDays: "Setiap Hari",
            includes: ["4 Tiket Terusan", "1 Unit Gazebo VIP 1 Hari", "4 Welcome Drink", "Free Loker"],
          },
        ],
        price: 45000,
        rooms: [],
        ownerId: ownerId,
        isActive: true,
      },
      {
        name: "Kawah Kamojang Geothermal & Hutan Pinus",
        categoryType: "wisata",
        type: "Campur",
        stars: 4.7,
        openHours: "06:30 - 17:00 WIB",
        description: "Wisata alam uap bumi legendaris dengan Kawah Hujan terapi uap alami, Kawah Kereta Api, dan jalur trekking hutan pinus pegunungan yang sejuk.",
        address: "Kawasan Geothermal Kamojang, Samarang",
        city: "Garut",
        district: "Samarang",
        coordinates: { latitude: -7.1472, longitude: 107.7981 },
        facilities: ["Terapi Uap Kawah Hujan", "Spot Foto Kawah Kereta", "Trekking Hutan Pinus", "Warung Kuliner Khas", "Musholla & Toilet"],
        rules: ["Dilarang melompat pagar pembatas kawah", "Jaga kebersihan dan dilarang membuang puntung rokok sembarangan"],
        cashbackPoints: 10000,
        images: [
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        ],
        wisataTickets: [
          {
            ticketId: "tkt-kamojang-1",
            ticketTitle: "Tiket Masuk Wisatawan Nusantara",
            price: 20000,
            description: "Akses masuk kawasan kawah, terapi uap alami, dan jalur tracking pinus.",
            validDays: "Setiap Hari",
            includes: ["Akses Semua Titik Kawah", "Terapi Uap Kawah Hujan", "Asuransi"],
          },
        ],
        price: 20000,
        rooms: [],
        ownerId: ownerId,
        isActive: true,
      },
      {
        name: "Wisata Danau Situ Bagendit",
        categoryType: "wisata",
        type: "Campur",
        stars: 4.6,
        openHours: "07:00 - 17:30 WIB",
        description: "Danau alami legendaris yang telah direvitalisasi modern dengan jembatan apung melingkar, perahu naga, rakit bambu, dan taman sunset.",
        address: "Jl. KH. Hasan Arif, Banyuresmi",
        city: "Garut",
        district: "Banyuresmi",
        coordinates: { latitude: -7.1593, longitude: 107.9419 },
        facilities: ["Jembatan Apung Melingkar", "Sewa Rakit & Bebek Air", "Jogging Track Tepi Danau", "Plaza Kuliner Ikan Bakar", "Taman Bermain Anak"],
        rules: ["Wajib memakai pelampung saat naik perahu/rakit", "Dilarang memancing di zona jembatan apung"],
        cashbackPoints: 8000,
        images: [
          "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80",
        ],
        wisataTickets: [
          {
            ticketId: "tkt-bagendit-1",
            ticketTitle: "Tiket Masuk Kawasan Situ Bagendit",
            price: 15000,
            description: "Akses jembatan apung, taman rekreasi, dan spot foto panorama danau.",
            validDays: "Setiap Hari",
            includes: ["Tiket Masuk", "Akses Jembatan Apung"],
          },
          {
            ticketId: "tkt-bagendit-2",
            ticketTitle: "Paket Rekreasi + Naik Rakit Danau",
            price: 40000,
            description: "Tiket masuk plus pengalaman keliling danau naik rakit bambu khas Bagendit.",
            validDays: "Setiap Hari",
            includes: ["Tiket Masuk", "Rakit Bambu 30 Menit", "Pelampung Keselamatan"],
          },
        ],
        price: 15000,
        rooms: [],
        ownerId: ownerId,
        isActive: true,
      },
    ];

    // 4. Upsert Hotel & Wisata into MongoDB
    const allItems = [...hotelData, ...wisataData];
    for (const item of allItems) {
      const existing = await Kost.findOne({ name: item.name });
      if (existing) {
        Object.assign(existing, item);
        await existing.save();
        console.log(`✅ Updated existing ${item.categoryType}: "${item.name}"`);
      } else {
        await Kost.create(item);
        console.log(`✅ Created new ${item.categoryType}: "${item.name}"`);
      }
    }

    console.log("\n🎉 Seeding of Hotel, Villa, & Wisata into MongoDB Atlas successfully completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

seedLodgingTravel();
