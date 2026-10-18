const mongoose = require("mongoose");
require("dotenv").config();
const PgeInfoHubItem = require("../models/PgeInfoHubItem");

const INITIAL_PGE_INFO_HUB_ITEMS = [
  {
    itemId: "pge-cp-001",
    title: "Profil Resmi PT Pertamina Geothermal Energy Tbk (PGE) Area Kamojang",
    category: "Company Profile",
    description:
      "PGE Area Kamojang merupakan pelopor pemanfaatan energi panas bumi ramah lingkungan di Indonesia. Bersama masyarakat sekitar Kamojang, PGE menggerakkan inovasi ekonomi sirkular dan digitalisasi desa berkelanjutan melalui GEOVERSE.",
    body: "PT Pertamina Geothermal Energy Tbk (PGE) Area Kamojang berkomitmen untuk terus menghadirkan energi hijau yang berkelanjutan demi masa depan Indonesia. Sejak beroperasi pertama kali pada tahun 1982, Kamojang telah menjadi simbol kemandirian energi bersih berbasis panas bumi. Melalui sinergi erat dengan masyarakat dan pemerintah desa setempat, PGE terus mendukung transisi energi ramah lingkungan yang berkeadilan, inklusif, dan memberdayakan ekonomi warga sekitar.",
    imageUrl:
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241244/geoverse/home-hero/pge-kamojang-bahasa-final-16x9.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Corporate Communication & CSR PGE Kamojang",
    location: "Kamojang, Samarang, Kabupaten Garut",
    publishedAt: new Date("2026-03-01T08:00:00.000Z"),
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Energi Bersih", "Geotermal", "Kamojang"],
  },
  {
    itemId: "pge-csr-001",
    title: "Program Kanyaah Waste to Energy & Ekonomi Sirkular Kamojang",
    category: "CSR",
    description:
      "Inisiatif pemberdayaan bank sampah terpadu warga Kamojang. Setiap kilogram sampah anorganik yang disetor ditimbang secara transparan dan dikonversi menjadi saldo Geoverse Point untuk kebutuhan harian warga.",
    body: "Program CSR unggulan Kanyaah Waste to Energy mengintegrasikan pelestarian lingkungan dengan kesejahteraan ekonomi sirkular warga. Sampah pilahan anorganik seperti plastik, kardus, dan logam disetor ke Bank Sampah binaan PGE Kamojang untuk dikonversi menjadi saldo poin digital GEOVERSE yang dapat langsung dibelanjakan.",
    imageUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241225/geoverse/home-hero/pge-proper-2025-16x9.mp4",
    authorOrDept: "Tim Community Development PGE Kamojang",
    location: "Desa Laksana & Ibun, Kamojang",
    publishedAt: new Date("2026-03-10T09:30:00.000Z"),
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Kanyaah", "Recycle", "CSR"],
  },
  {
    itemId: "pge-event-001",
    title: "Festival Geothermal & Pameran UMKM Desa Kamojang 2026",
    category: "Acara",
    description:
      "Pameran tahunan produk lokal binaan PGE Kamojang: kopi Kamojang, kriya ramah lingkungan, madu hutan, dan pengenalan layanan digital ojek lokal GEOVERSE.",
    body: "Festival Geothermal Kamojang 2026 menghadirkan puluhan gerai UMKM lokal binaan CSR PGE Kamojang. Warga dan wisatawan dapat menikmati kopi khas lereng Kamojang, menyaksikan demo kerajinan bambu, dan mengikuti panggung hiburan rakyat serta seminar energi terbarukan.",
    imageUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241225/geoverse/home-hero/pge-proper-2025-16x9.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Panitia Bersama PGE & Komunitas Kamojang",
    location: "Pusat Edukasi Geotermal PGE Kamojang",
    eventDate: "25–27 April 2026",
    publishedAt: new Date("2026-03-15T10:00:00.000Z"),
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Festival", "UMKM", "Kamojang"],
  },
  {
    itemId: "pge-comm-001",
    title: "Pelatihan Standar Layanan & Keselamatan Mitra Driver GEOVERSE",
    category: "Kegiatan Komunitas",
    description:
      "Program penguatan kompetensi keselamatan berkendara, tata cara verifikasi dokumen mitra, serta sosialisasi skema komisi khusus 100% untuk mitra driver perintis Kedai Terpadu.",
    body: "PGE Area Kamojang bersama manajemen GEOVERSE menggelar pelatihan berkala bagi mitra pengemudi Kanyaah Ride dan Send. Fokus utama mencakup aspek defensive driving di rute pegunungan Kamojang, standar sanitasi helm & kendaraan, serta pemanfaatan aplikasi driver secara optimal.",
    imageUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "",
    authorOrDept: "Divisi Operasional Mitra GEOVERSE",
    location: "Kedai Terpadu PGE Kamojang",
    publishedAt: new Date("2026-03-18T14:00:00.000Z"),
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Driver", "Safety", "Komunitas"],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for PgeInfoHub seed");

  for (const item of INITIAL_PGE_INFO_HUB_ITEMS) {
    await PgeInfoHubItem.findOneAndUpdate(
      { itemId: item.itemId },
      { $set: item },
      { upsert: true, new: true }
    );
    console.log("Upserted:", item.itemId, item.title);
  }

  const count = await PgeInfoHubItem.countDocuments();
  console.log("Total PgeInfoHubItem in MongoDB now:", count);
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
