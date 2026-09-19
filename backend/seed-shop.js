require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const MarketplaceStore = require("./models/MarketplaceStore");
const MarketplaceProduct = require("./models/MarketplaceProduct");
const InventoryLog = require("./models/InventoryLog");
const User = require("./models/User");

const SEED_STORES = [
  {
    name: "Yogya Grand Supermarket Kamojang",
    storeType: "SUPERMARKET",
    logo: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300",
    coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    description: "Pusat belanja supermarket terlengkap di Kamojang. Sayur segar, buah import/lokal, daging segar, susu & olahan, sembako berkualitas.",
    address: "Jl. Raya Kamojang No. 88, Samarang, Garut",
    latitude: -7.1465,
    longitude: 107.8025,
    rating: 4.9,
    reviewCount: 342,
    minimumOrder: 15000,
    deliveryRadiusKm: 20,
    isVerified: true,
    openingHours: {
      openTime: "07:00",
      closeTime: "22:00",
      daysOpen: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      isOpenNow: true,
    },
  },
  {
    name: "Apotek Kimia Farma Kamojang Sehat",
    storeType: "PHARMACY",
    logo: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300",
    coverImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800",
    description: "Apotek resmi berlisensi SIPA. Melayani penebusan resep dokter, obat bebas, vitamin, suplemen daya tahan tubuh, dan alat kesehatan.",
    address: "Jl. Kawah Kamojang No. 15, Ibun, Garut",
    latitude: -7.1420,
    longitude: 107.7980,
    rating: 4.95,
    reviewCount: 218,
    minimumOrder: 10000,
    deliveryRadiusKm: 15,
    isVerified: true,
    isOfficialPharmacy: true,
    pharmacistName: "apt. Nurul Aisyah, S.Farm",
    pharmacistSipa: "SIPA.1994.0815/GARUT/2023",
    openingHours: {
      openTime: "08:00",
      closeTime: "23:00",
      daysOpen: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      isOpenNow: true,
    },
  },
  {
    name: "Indomaret Fresh Kamojang Asri",
    storeType: "MINIMARKET",
    logo: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=300",
    coverImage: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800",
    description: "Minimarket 24 jam dengan fasilitas produk fresh, roti hangat, minuman dingin siap saji, dan snack favorit keluarga.",
    address: "Jl. Geothermal No. 3, Kamojang",
    latitude: -7.1490,
    longitude: 107.8050,
    rating: 4.8,
    reviewCount: 165,
    minimumOrder: 10000,
    deliveryRadiusKm: 10,
    isVerified: true,
    openingHours: {
      openTime: "06:00",
      closeTime: "23:59",
      daysOpen: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      isOpenNow: true,
    },
  },
  {
    name: "Kanyaah Baby & Kids Store",
    storeType: "BABY",
    logo: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300",
    coverImage: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
    description: "Perlengkapan bayi dan balita terpercaya: popok higienis, susu formula berbagai tahap, sabun & sampo bayi hypoallergenic, dan botol steril.",
    address: "Jl. Raya Samarang No. 42, Garut",
    latitude: -7.1510,
    longitude: 107.8070,
    rating: 4.9,
    reviewCount: 94,
    minimumOrder: 20000,
    deliveryRadiusKm: 18,
    isVerified: true,
    openingHours: {
      openTime: "08:30",
      closeTime: "20:30",
      daysOpen: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      isOpenNow: true,
    },
  },
  {
    name: "Warung Sayur & Buah Organik Bu Hj. Popon",
    storeType: "UMKM",
    logo: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300",
    coverImage: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    description: "Sayuran segar organik langsung petik dari petani lereng Kamojang. Segar, tanpa pestisida kimia berbahaya, dan harga ramah UMKM.",
    address: "Kampung Cisarua RT 02/RW 04, Kamojang",
    latitude: -7.1440,
    longitude: 107.7995,
    rating: 4.92,
    reviewCount: 180,
    minimumOrder: 10000,
    deliveryRadiusKm: 12,
    isVerified: true,
    openingHours: {
      openTime: "06:00",
      closeTime: "18:00",
      daysOpen: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      isOpenNow: true,
    },
  },
];

const SEED_PRODUCTS = [
  // Supermarket Yogya Grand
  {
    storeIndex: 0,
    name: "Beras Pandan Wangi Premium 5 kg",
    brand: "Rojolele Delanggu",
    category: "Sembako",
    description: "Beras pulen beraroma pandan alami, bersih tanpa pemutih, kualitas super untuk nasi keluarga lezat.",
    price: 82000,
    promoPrice: 78500,
    stock: 45,
    unit: "sak (5kg)",
    weight: 5000,
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    isEcoProduct: true,
  },
  {
    storeIndex: 0,
    name: "Minyak Goreng Sawit Pouch 2 Liter",
    brand: "Bimoli Klasik",
    category: "Sembako",
    description: "Minyak goreng jernih 2 kali penyaringan, kaya vitamin E & omega 9, menghasilkan gorengan renyah sempurna.",
    price: 38500,
    promoPrice: 34900,
    stock: 80,
    unit: "pouch (2L)",
    weight: 1900,
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
  },
  {
    storeIndex: 0,
    name: "Telur Ayam Negeri Fresh Curah 1 kg",
    brand: "Peternakan Lokal Kamojang",
    category: "Sembako",
    description: "Telur ayam negeri segar pilihan, kuning telur kental kaya protein, isi 15-16 butir per kg.",
    price: 29000,
    promoPrice: null,
    stock: 60,
    unit: "kg",
    weight: 1000,
    img: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400",
  },
  {
    storeIndex: 0,
    name: "Apel Fuji Super Manis Segar 1 kg",
    brand: "Sun Fresh",
    category: "Supermarket",
    description: "Apel fuji berair, tekstur renyah garing dengan rasa manis menyegarkan, isi 4-5 buah per kg.",
    price: 45000,
    promoPrice: 39500,
    stock: 35,
    unit: "kg",
    weight: 1000,
    img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
  },
  {
    storeIndex: 0,
    name: "Susu UHT Full Cream 1000 ml",
    brand: "Ultra Milk",
    category: "Minuman",
    description: "Susu sapi segar alami dengan kalsium dan fosfor seimbang, cocok untuk konsumsi harian dan campuran kopi.",
    price: 21500,
    promoPrice: 19800,
    stock: 55,
    unit: "karton (1L)",
    weight: 1050,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
  },

  // Apotek Kimia Farma
  {
    storeIndex: 1,
    name: "Vitamin C 500mg Strip 10 Kaplet",
    brand: "Enervon-C",
    category: "Kesehatan",
    description: "Suplemen multivitamin kombinasi Vitamin C dan Vitamin B Kompleks untuk menjaga daya tahan tubuh dan stamina aktif.",
    price: 15500,
    promoPrice: 13900,
    stock: 120,
    unit: "strip (10 kaplet)",
    weight: 100,
    img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400",
  },
  {
    storeIndex: 1,
    name: "Paracetamol 500mg Strip 10 Tablet",
    brand: "Sanmol",
    category: "Kesehatan",
    description: "Meredakan demam dan sakit kepala ringan hingga sedang. Aman dikonsumsi sesuai petunjuk dosis kemasan.",
    price: 5500,
    promoPrice: null,
    stock: 200,
    unit: "strip (10 tab)",
    weight: 80,
    img: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400",
  },
  {
    storeIndex: 1,
    name: "Madu Murni Alami Habbatussauda 250 g",
    brand: "TJ Murni",
    category: "Kesehatan",
    description: "Madu lebah alami diperkaya ekstrak habbatussauda untuk memelihara kesehatan tubuh dan mempercepat pemulihan.",
    price: 32000,
    promoPrice: 28500,
    stock: 40,
    unit: "botol (250g)",
    weight: 350,
    img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400",
    isEcoProduct: true,
  },
  {
    storeIndex: 1,
    name: "Antibiotik Amoxicillin 500mg (Resep Dokter)",
    brand: "Kimia Farma Generik",
    category: "Apotek",
    description: "Antibiotik golongan penisilin untuk mengobati infeksi bakteri tertentu. Wajib mengunggah foto resep dokter yang masih berlaku.",
    price: 18000,
    promoPrice: null,
    stock: 50,
    unit: "strip (10 kaplet)",
    weight: 100,
    requiresPrescription: true,
    img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400",
  },
  {
    storeIndex: 1,
    name: "Masker Medis 3 Ply Box Isi 50",
    brand: "Sensi Mask",
    category: "Kesehatan",
    description: "Masker bedah 3 lapis dengan efisiensi filtrasi bakteri 98%, tali telinga elastis nyaman digunakan seharian.",
    price: 35000,
    promoPrice: 29900,
    stock: 65,
    unit: "box (50 pcs)",
    weight: 250,
    img: "https://images.unsplash.com/photo-1586942593568-29361efcd571?w=400",
  },

  // Minimarket Indomaret Fresh
  {
    storeIndex: 2,
    name: "Kopi Susu Gula Aren Botol 240 ml",
    brand: "Kopiko Lucky Day",
    category: "Minuman",
    description: "Kopi susu creamy dengan rasa bold kopi asli dipadu manis legit gula aren, nikmat disajikan dingin.",
    price: 9500,
    promoPrice: 8500,
    stock: 90,
    unit: "botol (240ml)",
    weight: 270,
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400",
  },
  {
    storeIndex: 2,
    name: "Keripik Kentang Rumput Laut 68 g",
    brand: "Lay's / Chitato",
    category: "Snack & Makanan Ringan",
    description: "Keripik kentang bergelombang dengan taburan bumbu rumput laut gurih lezat dan kerenyahan maksimal.",
    price: 12500,
    promoPrice: 11000,
    stock: 75,
    unit: "bungkus",
    weight: 85,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400",
  },
  {
    storeIndex: 2,
    name: "Roti Tawar Gandum Kupas 1 Pack",
    brand: "Sari Roti",
    category: "Minimarket",
    description: "Roti tawar gandum lembut tinggi serat, cocok untuk menu sarapan sehat bergizi bersama selai atau telur.",
    price: 18000,
    promoPrice: null,
    stock: 30,
    unit: "pack (10 slice)",
    weight: 350,
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
  },

  // Baby Store
  {
    storeIndex: 3,
    name: "Popok Bayi Celana Ukuran M Isi 34",
    brand: "MamyPoko Pants Ekstra Kering",
    category: "Ibu & Bayi",
    description: "Popok celana dengan bantalan X-tra Kering menyerap pipis hingga 12 jam, menjaga kulit bayi bebas ruam dan tetap kering.",
    price: 68000,
    promoPrice: 62500,
    stock: 40,
    unit: "bag (34 pcs)",
    weight: 1200,
    img: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400",
  },
  {
    storeIndex: 3,
    name: "Sabun & Sampo Bayi 2in1 Botol 400 ml",
    brand: "Zwitsal Natural Baby Bath",
    category: "Ibu & Bayi",
    description: "Formula lembut pH seimbang tidak pedih di mata dengan ekstrak lidah buaya dan minyak kemiri.",
    price: 36000,
    promoPrice: 32000,
    stock: 35,
    unit: "botol (400ml)",
    weight: 450,
    img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400",
  },

  // Warung UMKM Bu Popon
  {
    storeIndex: 4,
    name: "Sayur Bayam Hijau Organik Segar 1 Ikat",
    brand: "Kebun Sayur Kamojang",
    category: "UMKM Lokal",
    description: "Bayam hijau segar langsung petik pagi hari, bebas pestisida kimia, daun hijau segar kaya zat besi.",
    price: 4500,
    promoPrice: 3500,
    stock: 50,
    unit: "ikat (300g)",
    weight: 300,
    img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
    isEcoProduct: true,
  },
  {
    storeIndex: 4,
    name: "Wortel Manis Brastagi Lokal 500 g",
    brand: "Petani Samarang",
    category: "UMKM Lokal",
    description: "Wortel oranye cerah kaya vitamin A, tekstur renyah manis alami, cocok untuk sop atau jus sehat.",
    price: 8000,
    promoPrice: null,
    stock: 45,
    unit: "pack (500g)",
    weight: 500,
    img: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
    isEcoProduct: true,
  },
];

async function seedKanyaahShop() {
  try {
    await connectDB();
    console.log("🌱 SEEDING KANYAAH SHOP STORES & PRODUCTS...");

    // Find or pick a verified merchant user as owner
    let merchantUser = await User.findOne({ role: { $in: ["pemilik_marketplace", "pemilik_toko", "admin"] } });
    if (!merchantUser) {
      merchantUser = await User.create({
        name: "Mitra Resmi Kanyaah Shop",
        email: "kanyaahshop@geoverse.id",
        phone: "081223344556",
        address: "Jl. Kamojang Raya No. 1",
        role: "pemilik_marketplace",
        status: "verified",
      });
    }

    const createdStores = [];

    for (const sData of SEED_STORES) {
      let store = await MarketplaceStore.findOne({ name: sData.name });
      if (!store) {
        store = await MarketplaceStore.create({
          ...sData,
          ownerId: merchantUser._id,
        });
        console.log(`✅ Created store: ${store.name}`);
      } else {
        console.log(`ℹ️ Store exists: ${store.name}`);
      }
      createdStores.push(store);
    }

    // Seed products
    for (const pData of SEED_PRODUCTS) {
      const store = createdStores[pData.storeIndex] || createdStores[0];
      const existingProduct = await MarketplaceProduct.findOne({
        name: pData.name,
        storeId: store._id,
      });

      if (!existingProduct) {
        const prod = await MarketplaceProduct.create({
          storeId: store._id,
          ownerId: merchantUser._id,
          name: pData.name,
          brand: pData.brand || "",
          category: pData.category || "General",
          cat: pData.category || "General",
          description: pData.description || "",
          price: pData.price,
          promoPrice: pData.promoPrice || null,
          stock: pData.stock,
          unit: pData.unit || "pcs",
          weight: pData.weight || 250,
          requiresPrescription: Boolean(pData.requiresPrescription),
          isEcoProduct: Boolean(pData.isEcoProduct),
          img: pData.img,
          images: [pData.img],
          imageUrls: [pData.img],
          isActive: true,
          rating: 4.9,
          sold: 12,
        });

        await InventoryLog.create({
          productId: prod._id,
          storeId: store._id,
          type: "RESTOCK",
          quantity: prod.stock,
          beforeStock: 0,
          afterStock: prod.stock,
          createdBy: merchantUser._id,
          note: "Initial seed stock Kanyaah Shop",
        });

        console.log(`  🛒 Seeded product: ${prod.name} (${store.name})`);
      }
    }

    console.log("🎉 KANYAAH SHOP SEEDING COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Kanyaah Shop error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedKanyaahShop();
}

module.exports = { SEED_STORES, SEED_PRODUCTS };
