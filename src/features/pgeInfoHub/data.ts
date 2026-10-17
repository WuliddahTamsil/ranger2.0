import { PgeInfoHubItem } from "./types";

/**
 * STRUKTUR KONFIGURASI SEMENTARA KONTEN PGE INFO HUB (NON-PRODUCTION / CONTENT PREVIEW)
 * 
 * Catatan penting:
 * - Data di bawah ini adalah konfigurasi draft/preview awal untuk materi branding client PGE Kamojang.
 * - Ini BUKAN data transaksi production.
 * - Admin dan content manager dapat memperbarui atau menghubungkan endpoint CMS di backend tanpa mengubah komponen UI.
 */
export const INITIAL_PGE_INFO_HUB_ITEMS: PgeInfoHubItem[] = [
  {
    id: "pge-cp-001",
    title: "Profil Resmi PT Pertamina Geothermal Energy Tbk (PGE) Area Kamojang",
    category: "Company Profile",
    description:
      "PGE Area Kamojang merupakan pelopor pemanfaatan energi panas bumi ramah lingkungan di Indonesia. Bersama masyarakat sekitar Kamojang, PGE menggerakkan inovasi ekonomi sirkular dan digitalisasi desa berkelanjutan melalui GEOVERSE.",
    imageUrl:
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Safe sample video link or official Pertamina Geothermal Energy profile video
    posterUrl:
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Corporate Communication & CSR PGE Kamojang",
    location: "Kamojang, Samarang, Kabupaten Garut",
    publishedAt: "2026-03-01T08:00:00.000Z",
    isPublished: true,
    tags: ["Energi Bersih", "Geotermal", "Kamojang"],
  },
  {
    id: "pge-csr-001",
    title: "Program Kanyaah Waste to Energy & Ekonomi Sirkular Kamojang",
    category: "CSR",
    description:
      "Inisiatif pemberdayaan bank sampah terpadu warga Kamojang. Setiap kilogram sampah anorganik yang disetor ditimbang secara transparan dan dikonversi menjadi saldo Geoverse Point untuk kebutuhan harian warga.",
    imageUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Tim Community Development PGE Kamojang",
    location: "Desa Laksana & Ibun, Kamojang",
    publishedAt: "2026-03-10T09:30:00.000Z",
    isPublished: true,
    tags: ["Kanyaah", "Recycle", "CSR"],
  },
  {
    id: "pge-event-001",
    title: "Festival Geothermal & Pameran UMKM Desa Kamojang 2026",
    category: "Acara",
    description:
      "Pameran tahunan produk lokal binaan PGE Kamojang: kopi Kamojang, kriya ramah lingkungan, madu hutan, dan pengenalan layanan digital ojek lokal GEOVERSE.",
    imageUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    posterUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Panitia Bersama PGE & Komunitas Kamojang",
    location: "Pusat Edukasi Geotermal PGE Kamojang",
    eventDate: "25–27 April 2026",
    publishedAt: "2026-03-15T10:00:00.000Z",
    isPublished: true,
    tags: ["Festival", "UMKM", "Kamojang"],
  },
  {
    id: "pge-comm-001",
    title: "Pelatihan Standar Layanan & Keselamatan Mitra Driver GEOVERSE",
    category: "Kegiatan Komunitas",
    description:
      "Program penguatan kompetensi keselamatan berkendara, tata cara verifikasi dokumen mitra, serta sosialisasi skema komisi khusus 100% untuk mitra driver perintis Kedai Terpadu.",
    imageUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Divisi Operasional Mitra GEOVERSE",
    location: "Kedai Terpadu PGE Kamojang",
    publishedAt: "2026-03-18T14:00:00.000Z",
    isPublished: true,
    tags: ["Driver", "Safety", "Komunitas"],
  },
];
