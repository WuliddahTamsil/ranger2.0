/**
 * scripts/generate_formal_handover_report.js
 * Generates the formal PDF report:
 * "LAPORAN PROGRES PENGEMBANGAN SISTEM, SERAH TERIMA TAHAP I (DRAFT HANDOVER 1.0), & PENGAJUAN INVOICE TERMIN III"
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_HTML = path.join(ROOT, "LAPORAN_PROGRES_DAN_INVOICE_TERMIN3_PGE_KAMOJANG.html");
const OUTPUT_PDF = path.join(ROOT, "LAPORAN_PROGRES_DAN_INVOICE_TERMIN3_PGE_KAMOJANG.pdf");

// Screenshots
const imgAppStorePath = "C:/Users/ASUS/.gemini/antigravity/brain/f06fc11b-fadd-4a89-9aa5-932effe4ddfd/.user_uploaded/media_1794275737714_bd8c540b.jpg";
const imgPlayStorePath = "C:/Users/ASUS/.gemini/antigravity/brain/f06fc11b-fadd-4a89-9aa5-932effe4ddfd/.user_uploaded/media_1794275775328_675b4b5d.jpg";
const logoPath = path.join(ROOT, "assets/geoverse-pge-official.png");

let b64AppStore = "";
let b64PlayStore = "";
let b64Logo = "";

if (fs.existsSync(imgAppStorePath)) {
  b64AppStore = "data:image/jpeg;base64," + fs.readFileSync(imgAppStorePath).toString("base64");
}
if (fs.existsSync(imgPlayStorePath)) {
  b64PlayStore = "data:image/jpeg;base64," + fs.readFileSync(imgPlayStorePath).toString("base64");
}
if (fs.existsSync(logoPath)) {
  b64Logo = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
}

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Progres, Draft Handover 1.0 & Tagihan Termin III - GEOVERSE PGE Kamojang</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 8mm 11mm 8mm 11mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 8.2pt;
      line-height: 1.32;
      color: #0f172a;
      background-color: #ffffff;
    }

    .page {
      width: 100%;
      min-height: 279mm;
      max-height: 279mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 2mm 0;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .page-content {
      flex: 1;
    }

    /* Corporate Header */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 5px;
      border-bottom: 2.5px solid #0D7A53;
      margin-bottom: 6px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
      border-radius: 6px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
    }

    .doc-main-title {
      font-size: 9.8pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .doc-sub-title {
      font-size: 7.2pt;
      color: #0D7A53;
      font-weight: 700;
      letter-spacing: 0.4px;
    }

    .meta-box {
      text-align: right;
      font-size: 6.8pt;
      color: #475569;
      line-height: 1.35;
      white-space: nowrap;
    }

    /* Section Headings */
    h2 {
      font-size: 8.8pt;
      font-weight: 800;
      color: #065F46;
      border-left: 3px solid #0D7A53;
      padding-left: 6px;
      margin: 6px 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    h3 {
      font-size: 8pt;
      font-weight: 700;
      color: #1e293b;
      margin: 4px 0 2px 0;
    }

    p {
      margin-bottom: 4px;
      color: #334155;
      text-align: justify;
    }

    /* Badges & Pills */
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
    .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0 6px 0;
      font-size: 7.2pt;
    }

    table.data-table th {
      background: #065F46;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 3.5px 6px;
      border: 1px solid #047857;
      font-size: 6.8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    table.data-table td {
      padding: 3px 6px;
      border: 1px solid #cbd5e1;
      color: #334155;
      vertical-align: middle;
    }

    table.data-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .table-total-row td {
      background-color: #e2e8f0 !important;
      font-weight: 800;
      color: #0f172a;
    }

    .code-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8pt;
      color: #0f172a;
      font-weight: 600;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    /* Cards & Boxes */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      margin-bottom: 5px;
    }

    .alert-success-box {
      background: #f0fdf4;
      border-left: 3px solid #16a34a;
      padding: 5px 8px;
      margin: 4px 0 6px 0;
      border-radius: 0 4px 4px 0;
      font-size: 7.4pt;
    }

    .alert-amber-box {
      background: #fffbeb;
      border-left: 3px solid #d97706;
      padding: 5px 8px;
      margin: 4px 0 6px 0;
      border-radius: 0 4px 4px 0;
      font-size: 7.4pt;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 4px 0;
    }

    .store-proof-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .store-proof-img {
      width: 100%;
      height: 120px;
      object-fit: contain;
      border-radius: 4px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      margin-bottom: 4px;
    }

    .bank-box {
      background: #f0fdf4;
      border: 1px dashed #0D7A53;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 5px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Signature Area */
    .sign-table {
      width: 100%;
      margin-top: 8px;
      border-collapse: collapse;
    }

    .sign-table td {
      width: 50%;
      vertical-align: top;
      text-align: center;
      padding: 4px 10px;
    }

    .sign-space {
      height: 52px;
    }

    .sign-name {
      font-weight: 800;
      color: #0f172a;
      text-decoration: underline;
      font-size: 8pt;
    }

    .sign-title {
      font-size: 7pt;
      color: #475569;
    }

    /* Footer */
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 4px;
      border-top: 1px solid #cbd5e1;
      font-size: 6.6pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- ================= PAGE 1 ================= -->
  <div class="page">
    <div class="page-content">
      <!-- Formal Header -->
      <div class="header-bar">
        <div class="brand-group">
          ${b64Logo ? `<img src="${b64Logo}" class="logo-img" alt="PGE Logo">` : ""}
          <div class="header-titles">
            <div class="doc-main-title">GEOVERSE – PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
            <div class="doc-sub-title">AREA KAMOJANG • LAPORAN RESMI PENGEMBANGAN SISTEM & PENAGIHAN TERMIN III</div>
          </div>
        </div>
        <div class="meta-box">
          <strong>No. Dok:</strong> 003/DEV-GEO/PGE-KMJ/XI/2026<br>
          <strong>Tanggal:</strong> 10 November 2026<br>
          <strong>Status Dokumen:</strong> <span class="badge badge-green">Resmi / Handover 1.0</span>
        </div>
      </div>

      <!-- Surat Pengantar Resmi -->
      <div class="info-card" style="margin-bottom: 6px;">
        <table style="width: 100%; font-size: 7.5pt; border-collapse: collapse;">
          <tr>
            <td style="width: 12%; font-weight: 700; color: #475569;">Kepada Yth.</td>
            <td style="width: 50%;">: <strong>Manajemen & Tim CSR / Pengelola GEOVERSE</strong></td>
            <td style="width: 14%; font-weight: 700; color: #475569;">Dari</td>
            <td style="width: 24%;">: <strong>Tim Pengembang GEOVERSE</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #475569;">Instansi</td>
            <td>: PT Pertamina Geothermal Energy Tbk Area Kamojang</td>
            <td style="font-weight: 700; color: #475569;">Lead Developer</td>
            <td>: Rangga Hadi Putra</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #475569;">Perihal</td>
            <td colspan="3">: <strong>Laporan Progres Pengembangan, Serah Terima Aplikasi Tahap I (Draft Handover 1.0), & Penagihan Termin III</strong></td>
          </tr>
        </table>
      </div>

      <h2>1. Ringkasan Eksekutif & Status Publikasi Toko Aplikasi (App Store & Play Store)</h2>
      <p>
        Dengan rasa syukur, Tim Pengembang menyampaikan bahwa proyek pengembangan platform mobile <strong>GEOVERSE by PGE Kamojang (Core Scope)</strong> telah mencapai penyelesaian <strong>100%</strong> dan berhasil didistribusikan ke toko aplikasi global:
      </p>

      <div class="grid-2">
        <!-- iOS App Store Proof -->
        <div class="store-proof-box">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: #0f172a; font-size: 7.5pt;">1. Apple App Store (iOS)</strong>
            <span class="badge badge-green">LIVE & AKTIF DI STORE</span>
          </div>
          ${b64AppStore ? `<img src="${b64AppStore}" class="store-proof-img" alt="App Store Proof">` : ""}
          <div style="font-size: 6.8pt; color: #475569; text-align: left; width: 100%;">
            • <strong>Nama Aplikasi:</strong> GEOVERSE by PGE Kamojang<br>
            • <strong>ID Developer:</strong> Rangga Hadi Putra | <strong>Rating:</strong> 4+ Years<br>
            • <strong>Kategori:</strong> Lifestyle | <strong>Status:</strong> Terpublikasi (Siap Unduh)
          </div>
        </div>

        <!-- Android Google Play Store Proof -->
        <div class="store-proof-box">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: #0f172a; font-size: 7.5pt;">2. Google Play Store (Android)</strong>
            <span class="badge badge-blue">STAGE: CLOSED TESTING</span>
          </div>
          ${b64PlayStore ? `<img src="${b64PlayStore}" class="store-proof-img" alt="Play Store Proof">` : ""}
          <div style="font-size: 6.8pt; color: #475569; text-align: left; width: 100%;">
            • <strong>Package:</strong> com.geoverse.app (PGE Kamojang)<br>
            • <strong>Tahapan Google:</strong> Closed Testing (Kebijakan Google Play 2024-2026)<br>
            • <strong>Syarat Rilis Produksi:</strong> Menjalankan pengujian 12 tester internal min. 14 hari
          </div>
        </div>
      </div>

      <div class="alert-success-box">
        <strong>Pencapaian Kunci:</strong> Seluruh modul ruang lingkup awal (84 sub-pekerjaan) telah selesai, lulus 14 automated test suite (100% pass), teruji keamanan JWT & sanitasi input, serta telah mengudara di Apple App Store. Hal ini memenuhi ketentuan penyelesaian pekerjaan untuk penyerahan <strong>Draft Handover 1.0</strong>.
      </div>

      <h2>2. Ruang Lingkup Inti yang Telah Selesai (Core Scope 100%)</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 25%;">Modul Layanan</th>
            <th style="width: 55%;">Deskripsi Implementasi Teknis & Alur Bisnis</th>
            <th style="width: 15%;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><strong>Autentikasi & Profil</strong></td>
            <td>Login/Registrasi, JWT Auth, Google OAuth (Mobile & Web Resilience), Verifikasi Dokumen Mitra (KTP, SIM, NIB).</td>
            <td><span class="badge badge-green">100% Selesai</span></td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td><strong>Kanyaah Ride & Send</strong></td>
            <td>Pemesanan ojek & kurir kilat, algoritma tarif Kamojang & nasional, Security PIN paket, pelacakan realtime driver.</td>
            <td><span class="badge badge-green">100% Selesai</span></td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td><strong>Marketplace & Katering</strong></td>
            <td>Katalog UMKM kuliner & kerajinan Kamojang, checkout multi-merchant, sistem porsi katering harian/mingguan.</td>
            <td><span class="badge badge-green">100% Selesai</span></td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td><strong>Laundry & Kanyaah Kos</strong></td>
            <td>Antar jemput cucian kiloan/satuan, penimbangan akurat, direktori kamar kos & reservasi geohomestay.</td>
            <td><span class="badge badge-green">100% Selesai</span></td>
          </tr>
          <tr>
            <td style="text-align: center;">5</td>
            <td><strong>Kanyaah Bank Sampah</strong></td>
            <td>Penyetoran anorganik, formula reduksi emisi karbon (kg CO2e), konversi saldo poin warga lingkar Kamojang.</td>
            <td><span class="badge badge-green">100% Selesai</span></td>
          </tr>
          <tr>
            <td style="text-align: center;">6</td>
            <td><strong>Admin Dashboard PGE</strong></td>
            <td>Manajemen KYC mitra, validasi izin usaha, audit trail, CMS Hero Banner terpusat, pengawasan ESG CSR.</td>
            <td><span class="badge badge-green">100% Selesai</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <span>Dokumen Resmi Progres & Serah Terima • GEOVERSE by PT Pertamina Geothermal Energy Tbk Area Kamojang</span>
      <span>Halaman 1 dari 4</span>
    </div>
  </div>

  <!-- ================= PAGE 2 ================= -->
  <div class="page">
    <div class="page-content">
      <!-- Header -->
      <div class="header-bar">
        <div class="brand-group">
          ${b64Logo ? `<img src="${b64Logo}" class="logo-img" alt="PGE Logo">` : ""}
          <div class="header-titles">
            <div class="doc-main-title">BERITA ACARA DELIVERABLES CORE SCOPE (100%)</div>
            <div class="doc-sub-title">GEOVERSE MOBILE PLATFORM – PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
          </div>
        </div>
        <div class="meta-box">
          <strong>Lampiran:</strong> Matriks Pekerjaan Selesai<br>
          <strong>Halaman:</strong> 2 dari 4
        </div>
      </div>

      <h2>3. Rincian Pemenuhan Deliverables Sesuai Kontrak Awal (RAB 84 Sub-Pekerjaan)</h2>
      <p style="font-size: 7.2pt; margin-bottom: 3px;">
        Berikut adalah ringkasan pembagian 84 item sub-pekerjaan yang tertuang dalam Rencana Anggaran Biaya (RAB) Project Awal yang telah diselesaikan secara tuntas oleh tim developer:
      </p>

      <table class="data-table" style="font-size: 7.1pt;">
        <thead>
          <tr>
            <th style="width: 25%;">Fase Pengembangan</th>
            <th style="width: 50%;">Cakupan Sub-Pekerjaan yang Diselesaikan</th>
            <th style="width: 10%;">PIC</th>
            <th style="width: 15%;">Hasil / Output</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Requirement & Analisis</strong> (8 Sub-Pekerjaan)</td>
            <td>Kickoff meeting, requirement gathering, business process analysis, user flow diagram, scope definition, timeline roadmap, technical architecture, & risk assessment.</td>
            <td>Dev 1+2</td>
            <td><span class="badge badge-green">100% Lengkap</span></td>
          </tr>
          <tr>
            <td><strong>2. UI/UX Design System</strong> (24 Sub-Pekerjaan)</td>
            <td>Research, Information Architecture, Wireframing, Design System, Splash, Onboarding, Login/Register, OTP, Home, Marketplace, Laundry, Catering, Kost, Checkout, Tracking, Driver UI, Owner UI, Admin UI, & Prototype.</td>
            <td>Dev 1</td>
            <td><span class="badge badge-green">Figma & Assets</span></td>
          </tr>
          <tr>
            <td><strong>3. Frontend Development</strong> (15 Sub-Pekerjaan)</td>
            <td>React Native / Expo v57 setup, React Navigation, Autentikasi, Modul Customer, Marketplace, Laundry, Catering, Kos, Driver Terminal, Owner Terminal, Admin Dashboard, Chat, Notifikasi, Responsif & Optimasi memori.</td>
            <td>Dev 1</td>
            <td><span class="badge badge-green">Mobile iOS & Web</span></td>
          </tr>
          <tr>
            <td><strong>4. Backend Development</strong> (16 Sub-Pekerjaan)</td>
            <td>Node.js & Express server, JWT Authentication, User API, Marketplace API, Laundry API, Catering API, Kost API, Driver API, Owner API, Admin API, Cloudinary / Local Upload API, Middleware, Validation, & Logging.</td>
            <td>Dev 2</td>
            <td><span class="badge badge-green">RESTful API Live</span></td>
          </tr>
          <tr>
            <td><strong>5. Database Architecture</strong> (7 Sub-Pekerjaan)</td>
            <td>MongoDB Schema Design, Entity Relationship Diagram (ERD), Data Migration Script, Seeder data awal Kamojang, Indexing optimasi query, & Automatic Backup structure.</td>
            <td>Dev 2</td>
            <td><span class="badge badge-green">MongoDB Atlas</span></td>
          </tr>
          <tr>
            <td><strong>6. Testing & Quality Assurance</strong> (6 Sub-Pekerjaan)</td>
            <td>Automated Unit Testing, Integration Testing, Radius Fare Engine Testing, Bug Fixing, UAT skenario internal, & Final Release QA (14 Suite Master Runner 100% Pass).</td>
            <td>Dev 1+2</td>
            <td><span class="badge badge-green">14 Suite Lulus</span></td>
          </tr>
          <tr>
            <td><strong>7. Dokumentasi Sistem</strong> (4 Sub-Pekerjaan)</td>
            <td>README repositori proyek, Dokumentasi Endpoint API, Installation & Build Guide, serta Berita Acara Serah Terima (Handover 1.0).</td>
            <td>Dev 1+2</td>
            <td><span class="badge badge-green">Dokumen PDF/MD</span></td>
          </tr>
          <tr>
            <td><strong>8. Deployment & App Store</strong> (4 Sub-Pekerjaan)</td>
            <td>Pendaftaran Apple Developer Program, penyusunan metadata, compliance privacy manifest, rilis iOS App Store (Live), & Google Play Console Closed Testing.</td>
            <td>Dev 1+2</td>
            <td><span class="badge badge-green">Toko Aplikasi</span></td>
          </tr>
        </tbody>
      </table>

      <h2>4. Arsitektur Teknis & Standar Kepatuhan Sistem</h2>
      <div class="grid-2">
        <div class="info-card">
          <strong style="color: #065F46; font-size: 7.4pt;">Keamanan & Enkripsi Data:</strong>
          <ul style="margin-left: 14px; font-size: 6.9pt; color: #334155; margin-top: 2px;">
            <li>Autentikasi menggunakan JSON Web Token (JWT) dengan expiry dan token refresh.</li>
            <li>Enkripsi kata sandi menggunakan salted bcrypt hash.</li>
            <li>Sanitasi input MongoDB untuk mencegah serangan NoSQL injection & XSS.</li>
            <li>Pencegahan spoofing header identitas mitra dan admin pada middleware API.</li>
          </ul>
        </div>
        <div class="info-card">
          <strong style="color: #065F46; font-size: 7.4pt;">Integritas Operasional & ESG:</strong>
          <ul style="margin-left: 14px; font-size: 6.9pt; color: #334155; margin-top: 2px;">
            <li>Sistem Geoverse Point terproteksi Idempotency Key (mencegah double-claim saldo).</li>
            <li>Validasi geofencing radius Kamojang (lingkar operasional PGE).</li>
            <li>Pencatatan audit log komprehensif pada setiap perubahan status transaksi.</li>
            <li>Kalkulasi reduksi jejak karbon otomatis untuk pelaporan tahunan CSR PGE.</li>
          </ul>
        </div>
      </div>

      <div class="alert-amber-box">
        <strong>Pernyataan Kesiapan Handover 1.0:</strong> Berdasarkan pemenuhan 84 sub-pekerjaan di atas, aplikasi GEOVERSE versi 1.0 telah memenuhi seluruh kriteria teknis, fungsional, dan administratif untuk dinyatakan <strong>SELESAI</strong> untuk ruang lingkup proyek awal.
      </div>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <span>Dokumen Resmi Progres & Serah Terima • GEOVERSE by PT Pertamina Geothermal Energy Tbk Area Kamojang</span>
      <span>Halaman 2 dari 4</span>
    </div>
  </div>

  <!-- ================= PAGE 3 ================= -->
  <div class="page">
    <div class="page-content">
      <!-- Header -->
      <div class="header-bar">
        <div class="brand-group">
          ${b64Logo ? `<img src="${b64Logo}" class="logo-img" alt="PGE Logo">` : ""}
          <div class="header-titles">
            <div class="doc-main-title">REKAPITULASI KEUANGAN & INVOICE TERMIN III</div>
            <div class="doc-sub-title">GEOVERSE MOBILE PLATFORM – PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
          </div>
        </div>
        <div class="meta-box">
          <strong>Lampiran:</strong> Tagihan Pembayaran<br>
          <strong>Halaman:</strong> 3 dari 4
        </div>
      </div>

      <h2>5. Rekapitulasi Pembayaran Project Awal (Nilai Deal: Rp8.000.000)</h2>
      <p style="font-size: 7.2pt;">
        Merujuk pada kesepakatan kerja sama awal (Nilai Deal Rp8.000.000 yang mencakup seluruh ruang lingkup awal dan biaya registrasi/upload App Store & Google Play tahun pertama), berikut adalah rincian histori pembayaran dan tagihan jatuh tempo saat ini:
      </p>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 18%;">Tahap Pembayaran</th>
            <th style="width: 14%;">Persentase</th>
            <th style="width: 20%;">Jumlah (Rp)</th>
            <th style="width: 32%;">Ketentuan / Syarat Prestasi</th>
            <th style="width: 16%;">Status Saat Ini</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Termin I</strong></td>
            <td style="text-align: center;">30%</td>
            <td style="font-weight: 700;">Rp 2.400.000</td>
            <td>Pembayaran uang muka setelah penawaran/SPK disetujui pihak PGE.</td>
            <td><span class="badge badge-green">LUNAS (PAID)</span></td>
          </tr>
          <tr>
            <td><strong>Termin II</strong></td>
            <td style="text-align: center;">40%</td>
            <td style="font-weight: 700;">Rp 3.200.000</td>
            <td>Pencapaian progres pengembangan sekitar 70% dan penyampaian laporan.</td>
            <td><span class="badge badge-green">LUNAS (PAID)</span></td>
          </tr>
          <tr style="background-color: #fefce8;">
            <td><strong style="color: #b45309;">Termin III (Final)</strong></td>
            <td style="text-align: center; font-weight: 700; color: #b45309;">30%</td>
            <td style="font-weight: 800; color: #b45309; font-size: 8pt;">Rp 2.400.000</td>
            <td>Seluruh pekerjaan 100% selesai, penyerahan Draft Handover 1.0, & aplikasi LIVE di Store.</td>
            <td><span class="badge badge-amber">DITAGIHKAN (HARI INI)</span></td>
          </tr>
          <tr class="table-total-row">
            <td colspan="2"><strong>TOTAL NILAI PROYEK AWAL</strong></td>
            <td><strong>Rp 8.000.000</strong></td>
            <td colspan="2"><strong>Total Terbayar: Rp 5.600.000 | Sisa Tagihan Pokok: Rp 2.400.000</strong></td>
          </tr>
        </tbody>
      </table>

      <h2>6. Penawaran Biaya Fitur Baru (Additional Scope: Geo Direct Use PGE Kamojang)</h2>
      <div class="info-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          <strong style="color: #065F46; font-size: 7.8pt;">Pengembangan Modul: Geo Direct Use (PGE Center of Excellence)</strong>
          <span class="badge badge-blue">PROGRES SAAT INI: 80%</span>
        </div>
        <p style="font-size: 7.1pt; color: #334155; margin-bottom: 4px;">
          Modul digitalisasi penyewaan 4 peralatan direct use pemanfaatan langsung energi panas bumi Kamojang (EQ-01 s/d EQ-04) bagi petani dan pelaku usaha pangan lokal. Memiliki arsitektur alur mirip <em>Kanyaah Homestay</em> (Customer → Admin PGE), mencakup katalog alat, kalender pemilihan tanggal interaktif, validasi kapasitas kg/hari, skema Down Payment (DP) 30%, unggah bukti bayar, review admin PGE, dan nota sewa PDF resmi.
        </p>

        <table class="data-table" style="margin-bottom: 3px;">
          <thead>
            <tr>
              <th style="width: 30%;">Item Penawaran Scope Baru</th>
              <th style="width: 45%;">Ruang Lingkup Pengembangan</th>
              <th style="width: 25%;">Biaya Penawaran (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Geo Direct Use Module</strong></td>
              <td>UI/UX, Frontend Mobile/Web, Backend API, Model DB, Down Payment Engine, Nota Invoice PDF, & Dashboard Admin PGE.</td>
              <td style="font-weight: 800; color: #0D7A53; font-size: 8.2pt;">Rp 450.000</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size: 6.8pt; color: #64748b; font-style: italic;">
          *Patokan harga mengacu pada benchmark RAB Additional Scope (Kanyaah Homestay = Rp450.000). Konsisten dan terjangkau untuk kebutuhan pengadaan PGE Kamojang.
        </div>
      </div>

      <div class="alert-amber-box" style="margin-top: 3px;">
        <strong>Ketentuan Pengembangan Fitur Baru:</strong>
        <ul style="margin-left: 14px; font-size: 7pt; color: #78350f; margin-top: 2px;">
          <li>Pihak PGE melakukan review dan persetujuan atas penawaran biaya fitur baru sebesar <strong>Rp 450.000</strong>.</li>
          <li>Setelah pembayaran fitur baru diterima, developer melanjutkan tahap finalisasi <strong>80% → 100%</strong>.</li>
          <li>Developer akan menyerahkan <strong>Video Demo Walkthrough Fitur Baru maksimal pada 12 November 2026</strong> untuk proses review/revisi sebelum di-bundle dan di-reupload ke store bersama integrasi Midtrans.</li>
        </ul>
      </div>

      <h2>7. Instruksi & Rekening Pembayaran Resmi Developer</h2>
      <p style="font-size: 7.1pt;">
        Pembayaran Termin III (sebesar <strong>Rp 2.400.000</strong>) serta biaya penawaran fitur baru (bila disetujui sebesar <strong>Rp 450.000</strong>) dapat disalurkan melalui transfer ke rekening perwakilan tim developer berikut:
      </p>

      <div class="bank-box">
        <div>
          <div style="font-size: 7pt; color: #475569; text-transform: uppercase; font-weight: 700;">Rekening Pembayaran Bank:</div>
          <div style="font-size: 11pt; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">BANK MANDIRI / BCA</div>
          <div style="font-size: 8pt; font-weight: 700; color: #0D7A53;">Atas Nama: RANGGA HADI PUTRA (Lead Developer)</div>
          <div style="font-size: 7pt; color: #64748b;">No. Rekening: <span class="code-text" style="font-size: 7.8pt;">[Dapat Diisi / Konfirmasi Tim Pengembang]</span></div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 7pt; color: #475569;">Total Tagihan Pokok (Termin 3):</div>
          <div style="font-size: 12pt; font-weight: 900; color: #b45309;">Rp 2.400.000</div>
          <div style="font-size: 6.8pt; color: #64748b;">Berita Transfer: <em>Termin 3 GEOVERSE PGE</em></div>
        </div>
      </div>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <span>Dokumen Resmi Progres & Serah Terima • GEOVERSE by PT Pertamina Geothermal Energy Tbk Area Kamojang</span>
      <span>Halaman 3 dari 4</span>
    </div>
  </div>

  <!-- ================= PAGE 4 ================= -->
  <div class="page">
    <div class="page-content">
      <!-- Header -->
      <div class="header-bar">
        <div class="brand-group">
          ${b64Logo ? `<img src="${b64Logo}" class="logo-img" alt="PGE Logo">` : ""}
          <div class="header-titles">
            <div class="doc-main-title">ROADMAP, KEBUTUHAN MIDTRANS & LEMBAR PENGESAHAN</div>
            <div class="doc-sub-title">GEOVERSE MOBILE PLATFORM – PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
          </div>
        </div>
        <div class="meta-box">
          <strong>Lampiran:</strong> Rencana Tindak Lanjut & Validasi<br>
          <strong>Halaman:</strong> 4 dari 4
        </div>
      </div>

      <h2>8. Roadmap Timeline Implementasi & Rilis Pembaruan (Store Re-Upload)</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 18%;">Tanggal Target</th>
            <th style="width: 42%;">Aktivitas / Milestone</th>
            <th style="width: 22%;">Pelaksana / PIC</th>
            <th style="width: 18%;">Output Deliverable</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>10 November 2026</strong></td>
            <td>Penyampaian Laporan Progres, Draft Handover 1.0, & Penagihan Termin III.</td>
            <td>Developer & PGE</td>
            <td><span class="badge badge-green">Dokumen Resmi</span></td>
          </tr>
          <tr>
            <td><strong>10–11 Nov 2026</strong></td>
            <td>Proses Pembayaran Termin III & Review Penawaran Fitur Geo Direct Use.</td>
            <td>Manajemen PGE</td>
            <td><span class="badge badge-amber">Approval & Bayar</span></td>
          </tr>
          <tr>
            <td><strong>12 November 2026</strong></td>
            <td>Pengiriman Video Demo & Walkthrough Fitur Geo Direct Use (Maksimal 12 Nov).</td>
            <td>Tim Developer</td>
            <td><span class="badge badge-blue">Video Walkthrough</span></td>
          </tr>
          <tr>
            <td><strong>13–15 Nov 2026</strong></td>
            <td>Penyerahan Akun/Kredensial Midtrans PGE & Integrasi Payment Gateway.</td>
            <td>PGE & Developer</td>
            <td><span class="badge badge-blue">Integrasi Gateway</span></td>
          </tr>
          <tr>
            <td><strong>16–18 Nov 2026</strong></td>
            <td>Penyelesaian Revisi PGE, Finalisasi UAT, dan Pembuatan Build Update v1.1.0.</td>
            <td>Tim Developer</td>
            <td><span class="badge badge-green">Production Build</span></td>
          </tr>
          <tr>
            <td><strong>19–24 Nov 2026</strong></td>
            <td>Re-upload Versi Update ke App Store & Pelaksanaan 14 Hari Closed Testing Play Store.</td>
            <td>Developer & 12 Tester</td>
            <td><span class="badge badge-green">Full Store Release</span></td>
          </tr>
        </tbody>
      </table>

      <h2>9. Ketergantungan Eksternal & Bantuan yang Dibutuhkan dari Pihak PGE</h2>
      <div class="grid-2">
        <div class="info-card">
          <strong style="color: #065F46; font-size: 7.4pt;">1. Merchant ID & Kredensial Midtrans PGE:</strong>
          <p style="font-size: 6.9pt; color: #334155; margin-top: 2px;">
            Untuk mengaktifkan pembayaran otomatis QRIS dan Virtual Account tanpa unggah bukti manual, pengembang membutuhkan penyerahan kredensial resmi akun Midtrans berbadan hukum PGE Kamojang (Server Key, Client Key, & Merchant ID).
          </p>
        </div>
        <div class="info-card">
          <strong style="color: #065F46; font-size: 7.4pt;">2. Dukungan 12 Akun Tester Play Store:</strong>
          <p style="font-size: 6.9pt; color: #334155; margin-top: 2px;">
            Sesuai regulasi terbaru Google Play Console, tim pengembang memohon bantuan penunjukan 12 personil/karyawan internal PGE Kamojang sebagai tester tertutup selama minimal 14 hari agar akses rilis produksi publik dapat dibuka oleh Google.
          </p>
        </div>
      </div>

      <h2>10. Lembar Pengesahan Serah Terima Tahap I (Draft Handover 1.0)</h2>
      <p style="font-size: 7.1pt;">
        Dokumen laporan dan serah terima ini disusun dengan sebenar-benarnya sebagai bukti pemenuhan prestasi pekerjaan scope utama platform GEOVERSE. Dengan ditandatanganinya lembar ini, para pihak menyatakan menerima hasil pekerjaan dan menyetujui pemrosesan pembayaran Termin III sesuai ketentuan.
      </p>

      <table class="sign-table">
        <tr>
          <td>
            <div style="font-size: 7pt; color: #475569;">Dibuat dan Diajukan Oleh:</div>
            <div style="font-weight: 700; font-size: 7.5pt; color: #0f172a; margin-top: 2px;">TIM PENGEMBANG APLIKASI GEOVERSE</div>
            <div class="sign-space"></div>
            <div class="sign-name">RANGGA HADI PUTRA</div>
            <div class="sign-title">Lead Developer / PIC Proyek GEOVERSE</div>
            <div style="font-size: 6.6pt; color: #64748b; margin-top: 1px;">Tanggal: 10 November 2026</div>
          </td>
          <td>
            <div style="font-size: 7pt; color: #475569;">Diterima dan Disetujui Oleh:</div>
            <div style="font-weight: 700; font-size: 7.5pt; color: #0f172a; margin-top: 2px;">PT PERTAMINA GEOTHERMAL ENERGY TBK</div>
            <div class="sign-space"></div>
            <div class="sign-name">( ............................................................ )</div>
            <div class="sign-title">Manajemen / Pengelola Program CSR Area Kamojang</div>
            <div style="font-size: 6.6pt; color: #64748b; margin-top: 1px;">Tanggal: ....................................................</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <span>Dokumen Resmi Progres & Serah Terima • GEOVERSE by PT Pertamina Geothermal Energy Tbk Area Kamojang</span>
      <span>Halaman 4 dari 4</span>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(OUTPUT_HTML, htmlContent, "utf-8");
console.log("✅ HTML generated:", OUTPUT_HTML);

// Generate PDF via Chrome headless
try {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const cmd = `powershell -Command "Start-Process -FilePath '${chromePath}' -ArgumentList '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf=\\"${OUTPUT_PDF}\\"', '\\"${OUTPUT_HTML}\\"' -Wait"`;
  console.log("⏳ Compiling PDF via Chrome headless...");
  execSync(cmd);
  if (fs.existsSync(OUTPUT_PDF)) {
    console.log("🎉 PDF successfully generated:", OUTPUT_PDF, "Size:", fs.statSync(OUTPUT_PDF).size, "bytes");
  } else {
    console.error("❌ PDF file was not generated.");
  }
} catch (err) {
  console.error("❌ Error compiling PDF:", err.message);
}
