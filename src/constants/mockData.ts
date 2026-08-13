import { Product, Restaurant, Laundry, KosItem, OrderItem, NotifItem, NewsItem, DriverOrder } from "../types";
import { uImg } from "../utils/formatters";

export const PRODUCTS: Product[] = [
  { id: 1, name: "Nasi Timbel Komplit", store: "Warung Bu Siti", price: 25000, rating: 4.8, sold: 234, img: uImg("1565299624946-b28f40a0ae38", 300, 300), liked: false, cat: "Makanan" },
  { id: 2, name: "Batik Kawung Premium", store: "Batik Kamojang", price: 185000, rating: 4.9, sold: 87, img: uImg("1558618666-fcd25c85cd64", 300, 300), liked: true, cat: "Fashion" },
  { id: 3, name: "Keripik Singkong Pedas", store: "Cemilan Bu Eni", price: 15000, rating: 4.7, sold: 412, img: uImg("1551782450-a2132b4ba21d", 300, 300), liked: false, cat: "Makanan" },
  { id: 4, name: "Kopi Arabika Gunung", store: "Kopi Nusantara", price: 55000, rating: 4.9, sold: 156, img: uImg("1509042239860-f550ce710b93", 300, 300), liked: false, cat: "Minuman" },
  { id: 5, name: "Sabun Herbal Alami", store: "Herbalis Lokal", price: 22000, rating: 4.6, sold: 89, img: uImg("1607006483224-33f25b2f7fd7", 300, 300), liked: true, cat: "Kesehatan" },
  { id: 6, name: "Tas Anyaman Rotan", store: "Kerajinan Asep", price: 75000, rating: 4.8, sold: 63, img: uImg("1547949003-9792a18a2601", 300, 300), liked: false, cat: "Kerajinan" },
];

export const RESTAURANTS: Restaurant[] = [
  { id: 1, name: "Saung Sunda Asli", cuisine: "Masakan Sunda", rating: 4.9, distance: 0.3, minOrder: 25000, img: uImg("1555939594-58d7cb561ad1", 400, 220), tags: ["Halal", "Populer"], open: true, priceStarts: 25000 },
  { id: 2, name: "Catering Bu Haji Nani", cuisine: "Prasmanan & Nasi Box", rating: 4.7, distance: 1.2, minOrder: 50000, img: uImg("1563245372-f21724e3856d", 400, 220), tags: ["Halal", "Min. 10 Pax"], open: true, priceStarts: 22000 },
  { id: 3, name: "Dapur Asri Kamojang", cuisine: "Masakan Rumahan", rating: 4.8, distance: 0.8, minOrder: 20000, img: uImg("1512621776951-a57141f2eefd", 400, 220), tags: ["Halal", "Sehat"], open: true, priceStarts: 27500 },
  { id: 4, name: "Bento Box & Snack Kamojang", cuisine: "Jepang & Snack Box", rating: 4.6, distance: 1.5, minOrder: 30000, img: uImg("1546069901-ba9599a7e63c", 400, 220), tags: ["Halal", "Bento"], open: true, priceStarts: 18000 },
  { id: 5, name: "Warung Prasmanan Bu Edi", cuisine: "Aneka Nasi Box & Lauk", rating: 4.5, distance: 2.1, minOrder: 40000, img: uImg("1565299624946-b28f40a0ae38", 400, 220), tags: ["Promo", "Murah"], open: true, priceStarts: 15000 },
  { id: 6, name: "Tumpeng Premium Kamojang", cuisine: "Tumpeng & Prasmanan", rating: 4.9, distance: 0.5, minOrder: 150000, img: uImg("1563245372-f21724e3856d", 400, 220), tags: ["Best Seller", "Premium"], open: true, priceStarts: 450000 },
  { id: 7, name: "Healthy Diet Catering", cuisine: "Healthy Clean Eating", rating: 4.8, distance: 1.9, minOrder: 35000, img: uImg("1512621776951-a57141f2eefd", 400, 220), tags: ["Organik", "Diet"], open: true, priceStarts: 32000 },
  { id: 8, name: "Snack Box & Jajanan Bu Tini", cuisine: "Snack & Jajanan Pasar", rating: 4.7, distance: 0.4, minOrder: 15000, img: uImg("1509042239860-f550ce710b93", 400, 220), tags: ["Murah", "Lengkap"], open: true, priceStarts: 10000 },
  { id: 9, name: "Dapur Mini Nasi Box", cuisine: "Nasi Box Nusantara", rating: 4.4, distance: 2.5, minOrder: 25000, img: uImg("1555939594-58d7cb561ad1", 400, 220), tags: ["Halal"], open: true, priceStarts: 20000 },
  { id: 10, name: "Catering Nasi Liwet Sunda", cuisine: "Nasi Liwet Sunda", rating: 4.9, distance: 0.9, minOrder: 60000, img: uImg("1563245372-f21724e3856d", 400, 220), tags: ["Tradisional", "Lengkap"], open: true, priceStarts: 35000 },
  { id: 11, name: "Dapur Selera Kita", cuisine: "Prasmanan & Catering", rating: 4.2, distance: 3.2, minOrder: 50000, img: uImg("1512621776951-a57141f2eefd", 400, 220), tags: ["Halal"], open: false, priceStarts: 25000 }
];

export const LAUNDRIES: Laundry[] = [
  { id: 1, name: "Laundry Express Pak Dedi", address: "Jl. Raya Kamojang No. 12", price: 6000, rating: 4.8, open: true, distance: "0.5 km", type: "Ekspres", img: uImg("1517677208171-0bc6725a3e60", 400, 300) },
  { id: 2, name: "Bersih Kilat Laundry", address: "Jl. Geothermal No. 5", price: 7000, rating: 4.6, open: true, distance: "1.1 km", type: "Ekspres", img: uImg("1582734651339-b9a3db27f8a7", 400, 300) },
  { id: 3, name: "Laundry Ibu Rohani", address: "Gg. Mawar No. 3", price: 5500, rating: 4.9, open: true, distance: "0.2 km", type: "Biasa", img: uImg("1545173168988-24b2a5976b91", 400, 300) },
  { id: 4, name: "KlinKlin Laundry", address: "Jl. Puncak No. 9", price: 5000, rating: 4.7, open: true, distance: "1.5 km", type: "Biasa", img: uImg("1583845943265-f938c5fbf967", 400, 300) },
];

export const KOS_LIST: KosItem[] = [
  { id: 1, name: "Kos Putri Melati", address: "Jl. Aster No. 7, Kamojang", price: 750000, type: "Putri", facilities: ["WiFi", "AC", "KM Dalam", "Parkir"], available: true, img: uImg("1631049307264-da0ec9d70304", 400, 220) },
  { id: 2, name: "Kos Putra Garuda", address: "Jl. Raya Kamojang No. 20", price: 600000, type: "Putra", facilities: ["WiFi", "KM Dalam", "Dapur"], available: true, img: uImg("1555854877-bab0e564b8d5", 400, 220) },
  { id: 3, name: "Kos Campur Harmoni", address: "Jl. Mawar No. 15", price: 900000, type: "Campur", facilities: ["WiFi", "AC", "KM Dalam", "Laundry"], available: false, img: uImg("1502672260266-1c1ef2d93688", 400, 220) },
];

export const ORDERS: OrderItem[] = [
  { id: "RNG001", type: "Marketplace", iconName: "Store", color: "#1B7A4E", item: "Nasi Timbel Komplit", detail: "Warung Bu Siti", status: "Dikirim", statusColor: "blue", date: "15 Jan 2024", total: 25000 },
  { id: "RNG002", type: "Laundry", iconName: "Wind", color: "#2196F3", item: "Laundry Express Pak Dedi", detail: "2.5 kg pakaian", status: "Selesai", statusColor: "green", date: "14 Jan 2024", total: 15000 },
  { id: "RNG003", type: "Catering", iconName: "Coffee", color: "#FF7043", item: "Nasi Box 20 Pax", detail: "Catering Bu Haji Nani", status: "Diproses", statusColor: "orange", date: "13 Jan 2024", total: 500000 },
  { id: "RNG004", type: "Kos", iconName: "Building2", color: "#9C27B0", item: "Kos Putri Melati", detail: "Jan – Mar 2024", status: "Aktif", statusColor: "green", date: "01 Jan 2024", total: 2250000 },
];

export const NOTIFS: NotifItem[] = [
  { id: 1, type: "order", title: "Pesanan Dikirim 🚴", msg: "Pesanan #RNG001 sedang dalam perjalanan ke lokasi Anda", time: "5 mnt lalu", read: false },
  { id: 2, type: "promo", title: "🎉 Promo Spesial Hari Ini!", msg: "Diskon 20% untuk semua laundry. Gunakan kode BERSIH20", time: "1 jam lalu", read: false },
  { id: 3, type: "info", title: "Fitur Baru: Kos Online", msg: "Temukan kos-kosan di sekitar Kamojang dengan mudah di Rangers App", time: "2 jam lalu", read: true },
  { id: 4, type: "system", title: "Selamat Datang di Rangers 2.0!", msg: "Terima kasih telah bergabung. Nikmati layanan komunitas Kamojang", time: "Kemarin", read: true },
];

export const NEWS: NewsItem[] = [
  { id: 1, title: "PGE Kamojang Dukung 120 UMKM Lokal lewat Dana CSR 2024", cat: "Berita", date: "15 Jan 2024", img: uImg("1560179707-f14e90ef3623", 400, 220) },
  { id: 2, title: "Festival Kuliner Ring 1 Sukses Digelar di Alun-Alun Kamojang", cat: "Komunitas", date: "12 Jan 2024", img: uImg("1555939594-58d7cb561ad1", 400, 220) },
];

export const EARNINGS_DATA = [
  { day: "Sen", v: 75000 }, { day: "Sel", v: 92000 }, { day: "Rab", v: 58000 },
  { day: "Kam", v: 110000 }, { day: "Jum", v: 85000 }, { day: "Sab", v: 130000 }, { day: "Min", v: 45000 },
];

export const DRIVER_ORDERS: DriverOrder[] = [
  { id: "ORD-001", type: "Marketplace", from: "Warung Bu Siti", to: "Jl. Aster No. 7", dist: "1.2 km", pay: 12000, time: "5 mnt lalu" },
  { id: "ORD-002", type: "Laundry Pickup", from: "Kos Putri Melati", to: "Laundry Bersih Kilat", dist: "0.8 km", pay: 8000, time: "12 mnt lalu" },
];
