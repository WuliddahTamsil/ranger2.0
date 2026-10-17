# Audit Kebutuhan Klien GEOVERSE / Kanyaah

## 1. Ringkasan eksekutif

Kebutuhan klien sudah cukup untuk menjadi bahan discovery, tetapi belum cukup aman untuk langsung dijadikan spesifikasi final. Ada beberapa keputusan bisnis yang masih ambigu dan dapat menghasilkan perilaku aplikasi berbeda:

1. **Tarif minimum Rp9.500** belum jelas apakah sudah termasuk biaya layanan Rp2.000 atau biaya layanan ditambahkan sehingga minimum pelanggan menjadi Rp11.500.
2. **Batas berat 20 kg** bertentangan dengan aturan tambahan Rp3.000/kg di atas 20 kg. Harus diputuskan apakah lebih dari 20 kg ditolak atau tetap diterima dengan surcharge.
3. **Bagi hasil** belum menjelaskan dasar perhitungan 80/20, perlakuan biaya layanan, biaya tambahan, pembatalan, tol, dan pembagian dengan merchant.
4. Klien menyebut **5 orang existing**, sedangkan konfigurasi legacy di project saat ini memiliki **6 identifier driver**. Daftar resmi harus dikonfirmasi.
5. Dokumen mitra belum memiliki matriks per role, masa berlaku, status verifikasi, alasan penolakan, dan aturan perlindungan data.
6. **PGE Info Hub** sudah memiliki draft/static content di project, tetapi belum dapat dianggap sebagai CMS produksi untuk upload video, poster, approval, dan publikasi.
7. **Kanyaah Recycle** sudah memiliki mekanisme pencatatan berat, harga pengepul, snapshot harga, rupiah, dan poin, tetapi rasio poin final masih belum diputuskan.

Kesimpulan: project sudah memiliki fondasi teknis untuk pricing, verification, PGE Hub, dan recycle, tetapi policy bisnis harus dibekukan dulu melalui decision register agar frontend, backend, admin, dan laporan keuangan memakai aturan yang sama.

## 2. Pemisahan sumber informasi

### Yang berasal dari klien

- Logo resmi PNG transparan resolusi tinggi.
- Konten PGE Info Hub: acara, company profile, CSR, video, dan poster kegiatan.
- Tarif dasar Rp2.500/km, minimum Rp9.500 untuk jarak kurang dari 4 km, biaya layanan Rp2.000.
- Paket/laundry/sampah memakai tarif yang sama dan mempunyai aturan berat.
- Radius makanan sekitar 15 km.
- Driver baru 80% dan platform/admin 20%.
- Lima driver existing diteruskan dengan integrasi Kedai Terpadu.
- Dokumen driver, kos/homestay, laundry/catering, shop/apotek, dan wisata.
- Harga recycle mengikuti harga pengepul dan nominal masuk ke saldo aplikasi.

### Yang bukan keputusan final dan harus dikonfirmasi

- Apakah SKCK wajib.
- Apakah NIB dan sertifikat halal wajib untuk semua laundry/catering.
- Apakah SIPA merupakan dokumen yang tepat untuk toko/apotek.
- Apakah pelanggan membayar biaya layanan di luar Rp9.500.
- Apakah barang di atas 20 kg diterima.
- Rasio rupiah ke poin.
- Nama/ID lima driver existing.
- Siapa yang memperoleh poin dan kapan saldo dikreditkan.

## 3. Audit terhadap kondisi project

### 3.1 PGE Info Hub

Yang sudah tersedia:

- `src/features/pgeInfoHub/PgeInfoHubModal.tsx`
- `src/features/pgeInfoHub/data.ts`
- Model konten draft untuk company profile, CSR, acara, image, video, poster, lokasi, tanggal, tag, dan status publikasi.
- Asset `assets/geoverse-pge-official.png` sudah dipakai oleh UI.

Gap produksi:

- Konten masih bersifat static/draft preview.
- Belum ada alur admin upload video/poster, preview, submit, approve, reject, publish, unpublish, dan scheduling.
- Belum ada kepastian asset tersebut resmi dan boleh dipakai.
- Belum ada spesifikasi media: ukuran maksimum, format, rasio poster, resolusi video, thumbnail, caption, dan hak publikasi.
- Belum ada owner/approver konten dari pihak PGE.

Model konten minimal yang disarankan:

`contentType`, `title`, `summary`, `body`, `mediaType`, `mediaUrl`, `thumbnailUrl`, `posterUrl`, `eventStart`, `eventEnd`, `location`, `authorOrDepartment`, `tags`, `status`, `scheduledAt`, `publishedAt`, `createdBy`, `approvedBy`, `createdAt`, `updatedAt`.

### 3.2 Tarif

Yang sudah tersedia di project:

- `backend/services/pricingPolicyService.js` sudah memiliki radius Kamojang 15 km, tarif Rp2.500/km, biaya layanan Rp2.000, minimum Rp9.500, aturan berat 20 kg, surcharge Rp3.000/kg, dan konfigurasi pembagian 80/20.
- `backend/services/sendFareService.js` sudah menghitung jarak, berat, biaya layanan, pembulatan, dan minimum fare.

Gap/kekhawatiran:

- Implementasi saat ini berpotensi menghasilkan minimum pelanggan **Rp11.500** karena Rp9.500 dan biaya layanan Rp2.000 dijumlahkan. Ini valid hanya jika klien menganggap Rp9.500 sebagai tarif perjalanan sebelum biaya layanan.
- Implementasi dapat menerima berat di atas 20 kg dan menambahkan surcharge, sedangkan kata “Maksimal 20 kg” dapat berarti harus ditolak.
- Ada biaya tambahan size, fragile, insurance, waiting, cancellation, atau tol yang harus diputuskan apakah benar bagian dari policy.
- Jarak harus dipastikan memakai jarak rute jalan atau jarak garis lurus. Keduanya dapat menghasilkan harga berbeda.
- Radius 15 km belum jelas dihitung dari titik Kamojang ke pickup, ke tujuan, sepanjang rute, atau semua sekaligus.
- Konfigurasi legacy memiliki enam identifier driver existing, bukan lima.

Contoh perhitungan yang wajib dikonfirmasi:

| Skenario | Jika Rp9.500 belum termasuk layanan | Jika Rp9.500 sudah termasuk layanan |
|---|---:|---:|
| Jarak 3 km | Rp11.500 | Rp9.500 |
| Jarak 5 km | Rp14.500 | Rp14.500 atau perlu aturan minimum lain |
| Berat 23 kg | biaya dasar + Rp9.000 | biaya dasar + Rp9.000 |

Formula kandidat yang paling mudah diuji:

```text
distanceFare = max(minimumDistanceFare, ceil(routeDistanceKm * 2.500))
weightFare = max(0, weightKg - 20) * 3.000
subtotal = distanceFare + weightFare + optionalFees
customerTotal = max(subtotal, minimumCustomerFare) + serviceFee
```

---

# Prompt AI untuk GUI/DOM Testing di Chrome

```text
Anda adalah QA Automation Engineer yang harus melakukan pengujian end-to-end pada versi web aplikasi GEOVERSE/Kanyaah melalui GUI dan DOM pada jendela Google Chrome.

## Batasan pengujian

- Gunakan Chrome GUI dan inspeksi DOM sebagai metode utama.
- Interaksikan aplikasi seperti pengguna sungguhan: klik, ketik, scroll, pilih menu, upload file dummy bila aman, dan ubah viewport ke ukuran mobile.
- Jangan menggunakan direct API call sebagai bukti utama keberhasilan UI.
- Jangan menghapus data, mengirim order nyata, melakukan pembayaran nyata, atau mengubah data produksi.
- Jika hanya tersedia APK/Expo Go native di HP, jelaskan bahwa DOM Chrome tidak dapat menginspeksi UI native. Dalam kondisi itu gunakan emulator/device automation yang tersedia dan pisahkan hasil native testing dari web DOM testing.
- Jangan menebak URL, akun, OTP, atau password. Gunakan placeholder dan berhenti pada blocker yang membutuhkan data akses.
- Jangan menganggap data dummy sebagai data produksi.

## Input yang harus diminta atau gunakan sebagai placeholder

- URL aplikasi: [ISI_URL_WEB]
- Environment: development/staging/local
- Akun customer: [ISI_AKUN_CUSTOMER]
- Akun driver: [ISI_AKUN_DRIVER]
- Akun merchant: [ISI_AKUN_MERCHANT]
- Akun admin: [ISI_AKUN_ADMIN]
- Data lokasi Kamojang: pickup dan tujuan yang aman untuk testing
- File dummy logo/poster/video untuk pengujian upload

Jika input wajib belum tersedia, buat daftar blocker sebelum testing. Jangan mengarang hasil.

## Tujuan utama

Validasi bahwa web app berjalan dari sisi pengguna, terutama:

1. Halaman dapat dibuka tanpa blank screen atau error fatal.
2. Login, register, logout, dan role-based navigation berjalan.
3. Peta tampil di Chrome, tile peta tidak blank, marker dapat tampil, dan user dapat memilih lokasi.
4. Pencarian lokasi, pin tujuan, lokasi saat ini, dan konfirmasi lokasi bekerja.
5. Perhitungan tarif Ride/Send sesuai policy yang aktif.
6. Verifikasi dokumen mitra dan status admin bekerja.
7. PGE Info Hub menampilkan konten acara, company profile, CSR, poster, dan video dengan status yang benar.
8. Recycle dapat mencatat kategori sampah, berat, harga, nominal rupiah, dan poin.
9. Tampilan responsive pada desktop dan mobile viewport.
10. Error, loading, empty state, permission, dan offline state ditangani dengan jelas.

## Prosedur testing

### A. Smoke test

- Buka URL aplikasi di Chrome.
- Tunggu sampai network idle atau loading selesai.
- Catat URL, title, halaman awal, dan error fatal.
- Ambil screenshot halaman awal.
- Periksa DOM untuk heading, tombol utama, input, navigasi, dan elemen yang terlihat oleh user.
- Catat error console dan request yang gagal jika tooling tersedia.

### B. Test peta

- Buka flow pilih lokasi tujuan.
- Pastikan container peta memiliki ukuran lebih besar dari 0x0 dan tidak tertutup overlay.
- Pastikan tile peta berhasil dimuat dan bukan hanya background kosong.
- Pastikan marker pickup/tujuan dapat terlihat.
- Uji pencarian tempat.
- Uji klik atau tap pada peta.
- Uji tombol lokasi saya. Jika browser meminta permission lokasi, jelaskan apakah permission diberikan atau ditolak.
- Uji tombol konfirmasi lokasi.
- Uji kondisi jaringan lambat dan error tile jika dapat disimulasikan dengan aman.
- Validasi bahwa koordinat yang ditampilkan sesuai lokasi yang dipilih dan bukan nilai default yang diam-diam salah.

Catatan: bila peta menggunakan OpenStreetMap/Leaflet, cek juga apakah request tile gagal karena internet, CORS, mixed content, atau rate limit. Jangan menyimpulkan masalah API key Google jika implementasinya bukan Google Maps.

### C. Test tarif

Uji dan catat breakdown harga untuk skenario berikut:

- 0,5 km.
- 1 km.
- 3 km.
- 4 km.
- 5 km.
- 15 km.
- Di luar radius layanan.
- Berat 20 kg.
- Berat 20,1 kg.
- Berat 23 kg.

Untuk setiap skenario, catat:

- Jarak yang dipakai.
- Tarif jarak.
- Biaya berat.
- Biaya layanan.
- Biaya tambahan.
- Diskon jika ada.
- Total pelanggan.
- Estimasi bagian driver.
- Estimasi bagian platform.
- Apakah hasil sesuai policy atau terdapat ambiguity.

Jika hasil minimum dapat menjadi Rp9.500 atau Rp11.500, tandai sebagai BUSINESS RULE BLOCKER dan jangan mengubah policy sendiri.

### D. Test dokumen dan role

- Login sebagai customer, driver, merchant, dan admin jika akun tersedia.
- Pastikan setiap role hanya melihat menu dan aksi yang diizinkan.
- Uji upload dokumen dengan file dummy yang valid.
- Uji format file salah, ukuran terlalu besar, dan dokumen kosong.
- Uji status pending, verified, dan rejected.
- Uji rejection reason.
- Uji dokumen expired bila fitur tersedia.
- Pastikan data KTP, SIM, STNK, dan dokumen sensitif tidak tampil ke role yang tidak berwenang.

### E. Test PGE Info Hub

- Buka menu PGE Info Hub.
- Filter atau buka kategori acara, company profile, dan CSR.
- Pastikan judul, deskripsi, poster, thumbnail, video, tanggal, lokasi, dan tag tampil benar.
- Uji konten draft agar tidak tampil ke public.
- Uji publish/unpublish bila akun admin tersedia.
- Uji video gagal dimuat dan poster fallback.
- Uji tampilan mobile.

### F. Test Kanyaah Recycle

- Buat data dummy beberapa kategori sampah.
- Masukkan berat desimal dan berat nol/negatif.
- Pastikan harga per kg, sumber harga, total rupiah, rasio poin, dan total poin terlihat.
- Uji pembulatan.
- Uji status pending/approved/rejected jika tersedia.
- Pastikan transaksi lama tidak berubah ketika policy harga atau rasio poin diubah.

### G. Responsive dan accessibility smoke test

- Uji viewport desktop, tablet, dan mobile.
- Pastikan tidak ada horizontal overflow yang tidak diharapkan.
- Pastikan tombol utama dapat diklik dan tidak tertutup elemen lain.
- Pastikan input memiliki label atau placeholder yang jelas.
- Uji keyboard Tab pada form utama.
- Periksa kontras teks, fokus keyboard, alt text gambar, dan aria-label untuk tombol icon.

## Format hasil wajib

Buat laporan dengan format berikut:

### 1. Environment

- URL
- Browser dan versi
- Viewport
- Environment
- Akun/role yang dipakai
- Commit/build jika terlihat

### 2. Executive result

- PASS / PASS WITH ISSUES / BLOCKED / FAIL
- Fitur yang berhasil
- Fitur yang gagal
- Blocker yang memerlukan input manusia

### 3. Test case table

| ID | Modul | Langkah singkat | Expected | Actual | Status | Severity | Evidence |
|---|---|---|---|---|---|---|---|

Gunakan severity:

- P0: aplikasi tidak dapat digunakan, crash, data/security fatal.
- P1: fitur utama gagal, peta/tarif/login/order tidak berjalan.
- P2: fungsi alternatif atau edge case bermasalah.
- P3: visual minor, copywriting, atau improvement.

### 4. Bug report

Untuk setiap bug tulis:

- Judul singkat.
- Severity.
- URL/route.
- Role.
- Precondition.
- Langkah reproduksi bernomor.
- Expected result.
- Actual result.
- Screenshot atau video evidence.
- DOM selector atau accessible name yang relevan.
- Console error/network error jika tersedia.
- Dugaan root cause hanya jika ada bukti; jika tidak, tulis “belum diketahui”.

### 5. Requirement mismatch

Pisahkan masalah teknis dari keputusan bisnis. Contoh:

- “Peta blank karena tile request gagal” = technical bug.
- “Minimum tarif Rp9.500 atau Rp11.500 belum diputuskan” = business decision blocker.
- “Driver tanpa SIM tetap bisa menerima order” = compliance/product bug.

### 6. Final recommendation

- Apakah build layak didemokan.
- Apakah layak staging/UAT.
- Apakah layak produksi.
- P0/P1 yang wajib diperbaiki.
- Pertanyaan yang harus dijawab klien.
- Evidence yang belum tersedia.

Jangan menyatakan testing berhasil jika hanya halaman terbuka. Keberhasilan harus berdasarkan interaksi UI, hasil DOM, output yang terlihat, dan evidence.
```

Namun formula di atas belum boleh dianggap final sebelum keputusan Rp9.500 dikunci.

### 3.3 Verifikasi mitra

Model user/document di backend sudah mendukung status pending, verified, rejected, file metadata, progress, reviewedAt, dan rejectionReason. Akan tetapi modelnya masih generic dan belum menjadi kebijakan per role.

Yang perlu ditambahkan secara bisnis/produk:

- Matriks dokumen wajib per role.
- Masa berlaku dan tanggal kedaluwarsa.
- Jenis dokumen yang diterima dan validasi mime/ukuran.
- Status per dokumen, bukan hanya status user.
- Catatan reviewer dan riwayat perubahan.
- Persetujuan privacy/consent.
- Retensi dan penghapusan dokumen sensitif.
- Masking akses KTP, SIM, STNK, dan rekening.
- Aturan re-verifikasi ketika dokumen expired.

Catatan penting: “baru ada 1 yang punya SIM” berarti hanya orang yang memenuhi syarat SIM dan dokumen lain yang boleh diaktifkan sebagai driver operasional. Yang lain harus berstatus pending/trainee atau tidak boleh menerima order sampai dokumennya lengkap.

### 3.4 Kanyaah Recycle

Yang sudah tersedia:

- Pencatatan berat aktual, harga per kilogram, total rupiah, total poin, sumber harga, nama pengepul, versi harga, dan snapshot policy.
- Rasio poin sudah configurable, tetapi konfigurasi saat ini masih default 1 rupiah = 1 poin dan ditandai menunggu konfirmasi klien.

Gap/kebutuhan keputusan:

- Rasio final: contoh Rp1.000 = 10 poin berarti `1 poin = Rp100` atau `1 rupiah = 0,01 poin`.
- Harga harus per kategori material, bukan satu “harga campuran” jika harga plastik, kardus, logam, dan material lain berbeda.
- Siapa yang menetapkan dan menyetujui harga pengepul.
- Kapan harga berlaku dan kapan snapshot dibuat.
- Siapa yang melakukan penimbangan dan proses koreksi.
- Kapan poin/saldo dikreditkan: saat dijemput, ditimbang, diverifikasi, atau setelah dibayar pengepul.
- Apakah biaya pickup mengurangi hasil recycle.
- Apakah poin milik pelanggan, driver, komunitas, atau dibagi.
- Minimum penukaran, pembulatan, pembatalan, dan audit transaksi.

## 4. Checklist dokumen yang disarankan

### Driver

Minimum:

- KTP.
- SIM C atau SIM A yang aktif dan sesuai kendaraan.
- STNK aktif.
- Foto kendaraan: depan, belakang, samping, plat nomor.
- Nomor rekening/e-wallet untuk settlement.
- Persetujuan perjanjian kemitraan dan safety policy.

SKCK sebaiknya dijadikan keputusan compliance terpisah: `wajib`, `opsional`, atau `wajib untuk kategori/area tertentu`. Jangan menganggap SKCK wajib tanpa keputusan legal/operasional.

### Homestay/kos

- KTP pemilik/pengelola.
- Bukti kepemilikan atau surat kuasa/pengelolaan.
- Foto kamar, kamar mandi, area umum, akses, dan fasilitas.
- Alamat dan titik lokasi.
- Harga, kapasitas, aturan penginapan, dan kontak darurat.

### Laundry/catering

- KTP pemilik.
- Foto tempat usaha dan area operasional.
- NIB/status legal usaha sesuai KBLI.
- Status sertifikasi halal atau status kewajiban/penahapannya.
- Untuk catering: menu, informasi alergi, packaging, dan standar keamanan pangan bila relevan.
- Rekening/e-wallet dan data settlement.

NIB dan halal tidak boleh dibuat sebagai checkbox universal tanpa memeriksa KBLI, jenis produk, skala/risk level, dan ketentuan yang berlaku. OSS menyediakan klasifikasi berbasis kegiatan/risk, sedangkan kewajiban halal bergantung pada kategori produk dan tahap regulasinya. Validasi akhir sebaiknya dilakukan terhadap OSS dan BPJPH.

### Kanyaah Shop/apotek

- KTP pemilik.
- Foto toko dan area penyimpanan.
- NIB dan izin usaha sesuai kategori.
- Untuk apotek, verifikasi **SIA (Surat Izin Apotek)**.
- Untuk tenaga kefarmasian, verifikasi dokumen profesi/praktik yang relevan, termasuk SIPA bila memang berlaku untuk apotekernya.

SIPA bukan pengganti izin pendirian/operasional apotek. Dokumen Kemenkes membedakan SIA sebagai izin apotek dan SIPA sebagai Surat Izin Praktik Apoteker. Karena itu requirement “SIPA untuk toko/apotek” perlu diperbaiki menjadi matriks izin usaha dan izin profesi.

### Wisata

- KTP pemilik/pengelola.
- Bukti kepemilikan atau pengelolaan.
- Foto area dan fasilitas.
- Alamat/titik lokasi, jam operasional, harga, kapasitas, kontak darurat.
- Izin tambahan bila jenis wisata dan wilayahnya mensyaratkan.

## 5. Decision register untuk klien

Klien perlu memberikan jawaban eksplisit untuk item berikut sebelum policy dikunci:

| ID | Keputusan | Pilihan yang harus dipilih |
|---|---|---|
| D01 | Minimum Rp9.500 | sudah termasuk biaya layanan / belum termasuk biaya layanan |
| D02 | Berat | maksimal 20 kg dan di atasnya ditolak / di atas 20 kg diterima dengan Rp3.000/kg |
| D03 | Jarak | route distance / straight-line distance |
| D04 | Radius | pickup saja / tujuan saja / kedua titik / seluruh rute |
| D05 | Layanan radius | semua layanan 15 km / makanan 15 km dan layanan lain berbeda |
| D06 | Driver existing | kirim lima nama/ID resmi dan aturan bagi hasilnya |
| D07 | Bagi hasil | 80/20 dihitung dari delivery fare saja / subtotal / setelah biaya tertentu |
| D08 | Biaya layanan | seluruhnya platform / dibagi / ada pengecualian partner existing |
| D09 | SIM | driver tanpa SIM tidak boleh aktif / status trainee/non-operasional |
| D10 | SKCK | wajib / opsional / berdasarkan kategori atau area |
| D11 | Legal merchant | NIB, halal, SIA, SIPA/STRA berdasarkan role dan KBLI |
| D12 | Poin recycle | rasio final, pembulatan, minimum redeem, dan pemilik poin |
| D13 | Harga recycle | per kategori material / satu harga campuran |
| D14 | PGE content | siapa uploader, reviewer, approver, dan pemilik hak media |
| D15 | Logo | file master, variant, ukuran, background, dan approval branding |

## 6. Acceptance criteria minimum

- Semua tarif dihitung oleh satu policy service yang dipakai frontend, backend, admin, dan laporan.
- Policy memiliki versi, tanggal efektif, pembuat, approver, dan audit log.
- Perubahan tarif tidak perlu mengubah source code.
- Sistem menampilkan breakdown: jarak, berat, biaya layanan, biaya tambahan, diskon, total, dan estimasi bagi hasil.
- Order di luar radius mendapat alasan penolakan yang jelas.
- Berat di atas 20 kg memiliki perilaku yang sama di UI, API, dan admin.
- Driver yang tidak memiliki SIM aktif tidak dapat menerima order.
- Admin dapat meng-ACC/menolak setiap dokumen dengan alasan dan tanggal review.
- Dokumen expired memicu re-verifikasi.
- Asset PGE hanya dapat dipublikasi setelah approval dan memiliki status publikasi.
- Harga recycle menyimpan snapshot harga yang digunakan saat transaksi.
- Rasio poin dan nilai rupiah transaksi dapat diaudit tanpa mengubah transaksi lama.

## 7. Urutan pekerjaan yang disarankan

1. Minta klien menjawab D01–D15.
2. Buat satu dokumen `Business Policy v1` untuk tarif, komisi, radius, dokumen, PGE, dan recycle.
3. Konfirmasi daftar lima driver existing dan hapus/arsipkan identifier legacy yang tidak disahkan.
4. Ubah hard-coded policy menjadi konfigurasi admin berversi.
5. Implementasikan document matrix dan review workflow.
6. Implementasikan PGE CMS/upload/approval.
7. Finalisasi ledger recycle dan point conversion.
8. Jalankan test scenario harga, verifikasi role, media publish, dan recycle settlement.

## 8. Sumber aturan yang perlu divalidasi

- [OSS Indonesia](https://oss.go.id/) untuk NIB, KBLI, dan tingkat risiko usaha.
- [BPJPH - Literasi Sertifikasi Halal](https://bpjph.halal.go.id/read/literasi-1) untuk cakupan dan tahapan kewajiban halal.
- [JDIH Kemenkes - Permenkes terkait apotek](https://jdih.kemkes.go.id/pdfjs/web/viewer.html?file=https%3A%2F%2Fjdih.kemkes.go.id%2Fstorage%2Fdocuments%2Fpdfs%2F2017permenkes009.pdf) untuk pembedaan SIA dan SIPA.

Catatan: ini adalah audit product/business requirement, bukan opini hukum. Requirement legal harus dikonfirmasi berdasarkan KBLI, wilayah, jenis produk, dan penasihat/compliance yang berwenang.

---

# Prompt siap upload ke AI

Salin seluruh prompt di bawah ini ke AI lain.

```text
Anda bertindak sebagai Business Analyst senior, Product Manager, Solution Architect, dan QA Lead untuk aplikasi GEOVERSE dengan produk Kanyaah Ride, Kanyaah Send, Kanyaah Recycle, Kanyaah Shop, homestay/kos, wisata, serta PGE Info Hub.

Tujuan Anda adalah mengaudit kebutuhan klien secara kritis lalu mengubahnya menjadi spesifikasi yang bisa diimplementasikan. Jangan mengarang keputusan klien. Jika ada data yang ambigu, bertentangan, atau belum ada, tandai dengan label NEEDS CLIENT DECISION.

## Konteks kebutuhan klien

### A. Branding dan PGE Info Hub

- Klien menyediakan logo resmi aplikasi dalam PNG transparan resolusi tinggi untuk splash screen, nota digital, dan header.
- PGE Info Hub harus memuat acara, company profile, CSR, video company profile, dan poster kegiatan.
- Harus ada kemampuan mengelola judul, deskripsi, kategori, gambar/video/poster, thumbnail, tanggal acara, lokasi, tag, status draft/review/published/archived, author/department, dan approval.
- Asset dan konten harus dianggap belum resmi sampai hak penggunaan dan approval dari pihak PGE dikonfirmasi.

### B. Tarif Kanyaah Ride dan Kanyaah Send

- Tarif dasar: Rp2.500/km.
- Minimum untuk jarak kurang dari 4 km: Rp9.500.
- Biaya layanan: Rp2.000.
- Paket, laundry, dan sampah memakai tarif dasar yang sama dengan tambahan berat.
- Pernyataan klien: maksimal 20 kg.
- Pernyataan lain: jika lebih dari 20 kg, 0–20 kg mengikuti biaya penjemputan dan setiap kg tambahan Rp3.000/kg.
- Radius layanan dari wilayah Kamojang sekitar 15 km.
- Makanan disebut sekitar 15 km.
- Driver baru: 80% driver dan 20% platform/admin.
- Lima driver existing dilanjutkan dengan integrasi Kedai Terpadu.
- Saat ini baru satu orang yang memiliki SIM.

### C. Dokumen mitra

Driver:
- KTP.
- SIM C/A aktif.
- Foto STNK.
- Foto kendaraan.
- Klien bertanya apakah SKCK wajib.

Homestay/kos:
- KTP pemilik.
- Bukti kepemilikan atau pengelolaan properti.
- Foto kamar dan fasilitas.

Laundry/catering:
- KTP pemilik.
- Foto tempat usaha.
- Klien bertanya apakah NIB dan sertifikat halal wajib.
- Data awal: Siti Nurazizah - Laundry, Gusni Santiana - Laundry, Aisyah - Catering, dengan referensi folder Google Drive.

Kanyaah Shop/toko/apotek:
- KTP pemilik.
- Foto toko.
- SIPA disebut untuk kategori obat/kesehatan.

Wisata:
- KTP pemilik.
- Bukti kepemilikan/pengelolaan.

### D. Kanyaah Recycle

- Sampah anorganik dipisahkan, ditimbang, dan dihargai.
- Harga mengikuti harga pengepul.
- Nominal berdasarkan harga pengepul masuk ke saldo aplikasi.
- Klien belum memutuskan rasio rupiah ke poin. Contoh yang diberikan: Rp1.000 = 10 poin GEOVERSE.

## Ringkasan kondisi project yang harus diaudit

- Ada PGE Info Hub draft/static di `src/features/pgeInfoHub/PgeInfoHubModal.tsx` dan `src/features/pgeInfoHub/data.ts`.
- Ada konfigurasi pricing di `backend/services/pricingPolicyService.js` dan `backend/services/sendFareService.js` yang sudah memuat 15 km, Rp2.500/km, Rp2.000 service fee, minimum Rp9.500, aturan berat, dan bagi hasil 80/20.
- Implementasi saat ini berpotensi menghasilkan minimum Rp11.500 karena minimum Rp9.500 ditambah service fee Rp2.000. Verifikasi apakah ini sesuai keputusan klien.
- Implementasi saat ini dapat menerima berat di atas 20 kg dengan surcharge. Verifikasi apakah harus ditolak karena kata “maksimal 20 kg”.
- Legacy configuration saat ini memiliki enam identifier driver existing, sedangkan klien menyebut lima. Minta daftar resmi lima orang.
- Model user/document sudah mendukung pending, verified, rejected, URI, metadata file, progress, reviewedAt, dan rejectionReason, tetapi belum menjadi document matrix per role dengan expiry dan privacy policy.
- Recycle service/model sudah mendukung actual weight, price per kg, total rupiah, total poin, sumber harga, collector, price version, dan snapshot. Rasio poin default masih menunggu konfirmasi klien.

## Tugas audit

1. Buat executive summary dengan status keseluruhan: ready, partially ready, atau blocked.
2. Pisahkan setiap requirement menjadi:
   - CONFIRMED
   - AMBIGUOUS
   - CONFLICTING
   - MISSING
   - ASSUMPTION
   - ALREADY IMPLEMENTED
   - NEEDS CHANGE
3. Buat tabel gap analysis per modul: Branding/PGE, Ride, Send, laundry/sampah, driver commission, verification, Shop/apotek, wisata, dan Recycle.
4. Buat decision register berisi pertanyaan yang harus dijawab klien. Minimal mencakup:
   - apakah Rp9.500 termasuk atau belum termasuk biaya layanan;
   - apakah >20 kg ditolak atau dikenakan Rp3.000/kg;
   - route distance atau straight-line distance;
   - definisi radius 15 km;
   - daftar lima driver existing;
   - dasar perhitungan 80/20;
   - perlakuan biaya layanan, tol, waiting, cancellation, fragile, insurance, dan size fee;
   - SKCK;
   - NIB/halal berdasarkan role dan KBLI;
   - perbedaan izin SIA, SIPA, dan dokumen profesi;
   - rasio poin, pembulatan, minimum redeem, pemilik poin, dan waktu kredit;
   - kategori harga recycle dan approver harga;
   - owner/approver konten PGE dan hak penggunaan asset.
5. Normalisasi policy tarif menjadi formula yang jelas. Tampilkan minimal 10 contoh test case, termasuk jarak 0.5 km, 1 km, 3 km, 4 km, 5 km, 15 km, di luar radius, berat 20 kg, 20.1 kg, dan 23 kg. Untuk kasus ambigu, tampilkan dua hasil dan jelaskan keputusan yang dibutuhkan.
6. Rancang document matrix per role dengan kolom: role, dokumen, wajib/opsional, format, masa berlaku, status, reviewer, alasan rejection, dan aturan re-verifikasi.
7. Jelaskan aturan operasional bahwa driver tanpa SIM aktif tidak boleh diaktifkan sebagai driver operasional.
8. Rancang content model dan workflow PGE Info Hub: draft, review, approved, scheduled, published, unpublished, archived; termasuk upload video/poster, thumbnail, hak akses, dan audit trail.
9. Rancang model Recycle: material category, weight, price snapshot, collector/source, total rupiah, point rate, total points, approval, settlement, correction, dan audit.
10. Buat rekomendasi arsitektur agar policy tidak hard-coded dan dapat diubah admin dengan versioning serta effective date.
11. Buat acceptance criteria frontend, backend, admin, database, dan QA.
12. Buat daftar risiko dan prioritas P0/P1/P2.
13. Buat implementation plan berurutan yang tidak mengubah keputusan bisnis secara diam-diam.

## Aturan output

- Gunakan Bahasa Indonesia.
- Jangan menyatakan requirement legal sebagai kepastian jika tergantung KBLI, jenis produk, atau wilayah.
- Jangan menganggap link Google Drive dapat dibaca tanpa permission.
- Jangan menyetujui dokumen SIPA sebagai satu-satunya izin apotek; bedakan izin usaha apotek dan izin praktik tenaga kefarmasian.
- Jangan mengarang nama lima driver existing.
- Semua keputusan yang belum dikonfirmasi harus diberi label NEEDS CLIENT DECISION.
- Berikan output dengan urutan:
  1. Executive summary
  2. Tabel confirmed/ambiguous/conflicting/missing
  3. Gap analysis project
  4. Decision register
  5. Tarif dan contoh kalkulasi
  6. Document matrix
  7. PGE Info Hub specification
  8. Recycle/point specification
  9. Acceptance criteria
  10. Risiko dan implementation plan
  11. Daftar pertanyaan final yang harus dikirim ke klien
```
