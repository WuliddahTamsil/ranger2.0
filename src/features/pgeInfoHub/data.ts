import { PgeInfoHubItem } from "./types";

/**
 * Data awal materi PGE Info Hub.
 * Mengandung materi resmi PT Pertamina Geothermal Energy Tbk Area Kamojang
 * dan menjadi fallback offline yang handal saat perangkat offline.
 */
export const INITIAL_PGE_INFO_HUB_ITEMS: PgeInfoHubItem[] = [
  {
    id: "PGE-737880",
    itemId: "PGE-737880",
    title: "Company Profile PGE Kamojang",
    category: "Company Profile",
    description:
      "PGE Kamojang merupakan salah satu wilayah operasi PT Pertamina Geothermal Energy Tbk yang mengembangkan dan memanfaatkan energi panas bumi sebagai sumber energi terbarukan untuk mendukung ketahanan energi nasional dan keberlanjutan lingkungan.",
    body:
      "PT Pertamina Geothermal Energy Tbk (PGE) Area Kamojang merupakan salah satu wilayah operasi panas bumi PT Pertamina Geothermal Energy Tbk yang berperan dalam mendukung penyediaan energi bersih dan berkelanjutan di Indonesia. Berlokasi di kawasan Kamojang, Kabupaten Bandung, Jawa Barat, PGE Area Kamojang memanfaatkan potensi energi panas bumi sebagai sumber energi terbarukan untuk menghasilkan listrik dengan emisi karbon yang relatif rendah.\n\nSebagai salah satu pelopor pengembangan energi panas bumi di Indonesia, PGE Kamojang memiliki peran strategis dalam mendukung transisi energi nasional melalui pengelolaan sumber daya panas bumi, penerapan teknologi, serta pengembangan operasional yang mengedepankan aspek keselamatan, efisiensi, dan keberlanjutan lingkungan.\n\nSelain berfokus pada produksi energi, PGE Area Kamojang juga berkomitmen untuk menciptakan nilai tambah bagi masyarakat dan lingkungan melalui program tanggung jawab sosial dan lingkungan (TJSL), pemberdayaan masyarakat, serta inovasi berkelanjutan. Melalui berbagai upaya tersebut, PGE Kamojang terus berkontribusi dalam mewujudkan ketahanan energi nasional sekaligus mendukung pencapaian target Net Zero Emission Indonesia.",
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXNzSjieyFsAKuYquZuVjruVv36P5OzyH6IhY9-olC8Q&s=10",
    videoUrl: "https://drive.google.com/file/d/1bdeMpSZx3x2A7jA4fLaU0s0yl7Y7FU6b/view?usp=sharing",
    posterUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXNzSjieyFsAKuYquZuVjruVv36P5OzyH6IhY9-olC8Q&s=10",
    authorOrDept: "Corporate Communication & CSR PGE Kamojang",
    location: "Kamojang, Samarang, Kabupaten Garut",
    eventDate: "28/10/2026",
    tags: ["Acara", "Komunitas", "Kamojang"],
    status: "PUBLISHED",
    isPublished: true,
    publishedAt: "2026-10-28T03:22:17.880Z",
  },
  {
    id: "pge-csr-001",
    itemId: "pge-csr-001",
    title: "Program Kanyaah Waste to Energy & Ekonomi Sirkular Kamojang",
    category: "CSR",
    description:
      "Inisiatif pemberdayaan bank sampah terpadu warga Kamojang. Setiap kilogram sampah anorganik yang disetor ditimbang secara transparan dan dikonversi menjadi saldo Geoverse Point untuk kebutuhan harian warga.",
    body:
      "Program tanggung jawab sosial dan lingkungan (TJSL) PGE Area Kamojang menghadirkan integrasi bank sampah modern dan aplikasi digital GEOVERSE. Melalui inisiatif ini, warga sekitar area operasi dapat menyetorkan sampah plastik, kertas, logam, dan minyak jelantah untuk dikonversi langsung menjadi saldo Geoverse Point. Program ini tidak hanya menjaga kelestarian ekosistem dataran tinggi Kamojang, tetapi juga memperkuat kemandirian ekonomi keluarga binaan di sekitar area operasional pembangkit panas bumi.",
    imageUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Tim Community Development PGE Kamojang",
    location: "Desa Laksana & Ibun, Kamojang",
    publishedAt: "2026-10-20T09:30:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Recycle", "Geopoint", "CSR", "Kamojang"],
  },
  {
    id: "pge-event-001",
    itemId: "pge-event-001",
    title: "Festival Geothermal & Pameran UMKM Desa Kamojang 2026",
    category: "Acara",
    description:
      "Pameran tahunan produk lokal binaan PGE Kamojang: kopi Kamojang, kriya ramah lingkungan, madu hutan, dan pengenalan layanan digital warga GEOVERSE.",
    body:
      "Festival Geothermal Kamojang 2026 merupakan ajang temu kumpul pelaku UMKM desa binaan PGE Kamojang bersama komunitas lokal. Pengunjung dapat menikmati seduhan kopi khas lereng Kamojang, pameran produk kerajinan daur ulang, workshop edukasi energi panas bumi, serta demo kemudahan pemesanan Georide dan Geomart bagi wisatawan kawasan Kamojang.",
    imageUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://drive.google.com/file/d/1bdeMpSZx3x2A7jA4fLaU0s0yl7Y7FU6b/view?usp=sharing",
    posterUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Panitia Bersama PGE & Komunitas Kamojang",
    location: "Pusat Edukasi Geotermal PGE Kamojang",
    eventDate: "25–27 November 2026",
    publishedAt: "2026-10-25T10:00:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Festival", "UMKM", "Kamojang", "Acara"],
  },
  {
    id: "pge-comm-001",
    itemId: "pge-comm-001",
    title: "Standar Keselamatan & Layanan Prima Mitra Komunitas Kamojang",
    category: "Kegiatan Komunitas",
    description:
      "Sosialisasi keselamatan berkendara, tata tertib operasional ramah lingkungan, dan standar pelayanan prima bagi seluruh mitra lokal GEOVERSE di kawasan Kamojang.",
    body:
      "Dalam rangka memastikan keamanan bersama di jalur perbukitan Kamojang, PGE Area Kamojang bersama pengelola komunitas menyelenggarakan briefing berkala mengenai keselamatan operasional. Seluruh mitra dibekali pemahaman respon cepat tanggap darurat, panduan berkendara aman saat kabut tebal, serta pemeliharaan kendaraan yang ramah lingkungan.",
    imageUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Divisi HSSE PGE Kamojang",
    location: "Kedai Terpadu PGE Kamojang",
    publishedAt: "2026-10-29T14:00:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["HSSE", "Safety", "Driver", "Komunitas"],
  },
];
