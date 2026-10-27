const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const logoPath = path.join(rootDir, 'assets', 'geoverse-logo.png');
const logoBuffer = fs.readFileSync(logoPath);
const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Catatan Pendukung Operasional Sistem GEOVERSE – PGE Kamojang</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 8.5mm 12.5mm 8.5mm 12.5mm;
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
      font-size: 8.4pt;
      line-height: 1.34;
      color: #0f172a;
      background-color: #ffffff;
    }

    .page {
      height: 280mm;
      max-height: 280mm;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .page-content {
      flex: 1;
    }

    /* Formal Corporate Header */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      border-bottom: 2.5px solid #047857;
      margin-bottom: 7px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 50%;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
    }

    .doc-main-title {
      font-size: 10.2pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .doc-sub-title {
      font-size: 7.1pt;
      color: #047857;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .meta-box {
      text-align: right;
      font-size: 6.7pt;
      color: #475569;
      line-height: 1.35;
      white-space: nowrap;
    }

    /* Headings */
    h2 {
      font-size: 9.1pt;
      font-weight: 700;
      color: #065f46;
      margin-top: 6px;
      margin-bottom: 3.5px;
      display: flex;
      align-items: center;
      gap: 5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    h3 {
      font-size: 8.3pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 3px;
      margin-bottom: 1px;
    }

    p {
      margin-bottom: 3px;
      color: #334155;
      text-align: justify;
    }

    /* Formal Statement Box */
    .formal-intro {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 3.5px solid #047857;
      border-radius: 5px;
      padding: 5.5px 9px;
      margin-bottom: 6px;
      font-size: 7.7pt;
      line-height: 1.34;
      color: #14532d;
    }

    /* Grid & Cards */
    .card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-bottom: 5px;
    }

    .card-download {
      background: #ffffff;
      border: 1.2px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 8.5px;
    }

    .card-download.android {
      border-left: 3.5px solid #10b981;
    }

    .card-download.ios {
      border-left: 3.5px solid #0284c7;
    }

    .badge-pill {
      display: inline-block;
      font-size: 6.3pt;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .pill-green { background: #dcfce7; color: #15803d; }
    .pill-blue { background: #e0f2fe; color: #0369a1; }
    .pill-amber { background: #fef3c7; color: #b45309; }
    .pill-teal { background: #ccfbf1; color: #0f766e; }
    .pill-purple { background: #f3e8ff; color: #7e22ce; }
    .pill-rose { background: #ffe4e6; color: #be123c; }

    .link-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2.5px 5.5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.6pt;
      word-break: break-all;
      color: #0f172a;
      margin: 1.5px 0 3px 0;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0 5px 0;
      font-size: 7.35pt;
    }

    table.data-table th {
      background: #065f46;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 3.2px 6px;
      border: 1px solid #047857;
      font-size: 6.9pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    table.data-table td {
      padding: 2.8px 6px;
      border: 1px solid #cbd5e1;
      color: #334155;
      vertical-align: middle;
    }

    table.data-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .code-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.7pt;
      color: #0f172a;
      font-weight: 600;
      background: #f1f5f9;
      padding: 1px 3.5px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    .code-alert {
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.7pt;
      color: #991b1b;
      font-weight: 700;
      background: #fef2f2;
      padding: 1px 3.5px;
      border-radius: 3px;
      border: 1px solid #fecaca;
    }

    /* Note Box */
    .note-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3.5px solid #047857;
      border-radius: 5px;
      padding: 5px 8.5px;
      margin: 4px 0;
      font-size: 7.4pt;
      line-height: 1.33;
      color: #334155;
    }

    .step-list {
      margin-left: 14px;
      margin-bottom: 2px;
    }

    .step-list li {
      font-size: 7.1pt;
      margin-bottom: 1.2px;
      color: #334155;
    }

    /* Feature Grid */
    .grid-feature {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5px;
      margin-bottom: 5px;
    }

    .feature-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4.5px 6.5px;
      border-left: 3px solid #047857;
    }

    .feature-item h4 {
      font-size: 7.8pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .feature-item p {
      font-size: 7pt;
      color: #475569;
      margin-bottom: 0;
      line-height: 1.26;
      text-align: left;
    }

    /* Footer */
    .footer-note {
      border-top: 1px solid #cbd5e1;
      padding-top: 3.5px;
      margin-top: 3.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.7pt;
      color: #64748b;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .footer-logo {
      width: 13px;
      height: 13px;
      object-fit: contain;
    }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1 ==================== -->
  <div class="page">
    <div class="page-content">
      <div class="header-bar">
        <div class="brand-group">
          <img src="${logoBase64}" class="logo-img" alt="Logo GEOVERSE" />
          <div class="header-titles">
            <div class="doc-main-title">CATATAN PENDUKUNG OPERASIONAL SISTEM GEOVERSE</div>
            <div class="doc-sub-title">PT PERTAMINA GEOTHERMAL ENERGY TBK (PGE) AREA KAMOJANG</div>
          </div>
        </div>
        <div class="meta-box">
          <div>Klasifikasi: Dokumen Resmi Operasional</div>
          <div>Edisi: Oktober 2026 / Versi 2.0</div>
        </div>
      </div>

      <div class="formal-intro">
        <strong>Pengantar Dokumen:</strong><br>
        Dokumen ini memuat catatan teknis dan operasional komprehensif sistem <strong>GEOVERSE</strong> untuk mendukung tim <strong>PT Pertamina Geothermal Energy Tbk (PGE) Area Kamojang</strong>. Catatan ini mencakup akses instalasi build internal, daftar kredensial akun operasional per peran, spesifikasi logika layanan, alur tata kelola transaksi, serta panduan pengawasan pada Dashboard Admin PGE.
      </div>

      <h2>1. Kanal Distribusi & Akses Aplikasi (Build Internal Terverifikasi)</h2>
      <p style="font-size: 7.3pt; margin-bottom: 3.5px;">
        <em>Catatan Rilis Toko Aplikasi: Versi produksi di Google Play Store dan Apple App Store saat ini sedang dalam proses review resmi bertahap oleh pihak store. Untuk keperluan peninjauan dan operasional langsung oleh tim PGE Kamojang, distribusi menggunakan build internal resmi berikut:</em>
      </p>

      <div class="card-grid">
        <div class="card-download android">
          <span class="badge-pill pill-green">Sistem Operasi Android (APK)</span>
          <h3 style="color: #15803d; margin-top: 1px;">Expo Standalone Build Release</h3>
          <div class="link-box">
            https://expo.dev/accounts/wuliddah_tamsil/projects/the_ranger_react_native/builds/f09b2ac2-cf07-4061-8b0c-1c16de57c293
          </div>
          <p style="font-size: 6.8pt; margin-bottom: 2px;"><strong>Instruksi Pemasangan Android:</strong></p>
          <ol class="step-list">
            <li>Buka tautan melalui peramban (Chrome) pada perangkat Android.</li>
            <li>Unduh paket berkas aplikasi (.apk).</li>
            <li>Pilih opsi <em>"Tetap Download / Izinkan Pemasangan dari Sumber Ini"</em> jika muncul dialog keamanan.</li>
            <li>Buka paket instalasi dan jalankan aplikasi GEOVERSE.</li>
          </ol>
        </div>

        <div class="card-download ios">
          <span class="badge-pill pill-blue">Sistem Operasi Apple iOS (iPhone/iPad)</span>
          <h3 style="color: #0369a1; margin-top: 1px;">Apple TestFlight Verified Invitation</h3>
          <div class="link-box">
            https://testflight.apple.com/join/rdzzQgax
          </div>
          <p style="font-size: 6.8pt; margin-bottom: 2px;"><strong>Instruksi Pemasangan iOS:</strong></p>
          <ol class="step-list">
            <li>Unduh aplikasi resmi <strong>Apple TestFlight</strong> dari App Store.</li>
            <li>Buka tautan undangan di atas melalui peramban Safari di iPhone.</li>
            <li>Ketuk tombol <strong>"Start Testing"</strong> atau <strong>"Accept"</strong>.</li>
            <li>Ketuk <strong>"Install / Update"</strong> untuk memasang aplikasi GEOVERSE.</li>
          </ol>
        </div>
      </div>

      <h2>2. Matriks Akun Operasional Siap Pakai (Master Seed Credentials)</h2>
      <p style="font-size: 7.3pt; margin-bottom: 3px;">
        Seluruh akun telah terkonfigurasi dengan profil data operasional riil yang aktif digunakan pada sistem:
      </p>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 20%;">Role / Entitas</th>
            <th style="width: 32%;">Email Login</th>
            <th style="width: 15%;">Password</th>
            <th style="width: 33%;">Nama Akun & Kegunaan Operasional</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge-pill pill-teal">Super Admin PGE</span></td>
            <td><span class="code-text">geoverse.pge@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Admin PGE GEOVERSE</strong> (Kendali Utama, Audit KYC, & CMS)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-green">Customer / Warga</span></td>
            <td><span class="code-text">wuliddahtamsilbarokah19@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Wuwu Customer</strong> (Order Ride, Send, Food, Mart, Kos, Point)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-amber">Mitra Driver</span></td>
            <td><span class="code-text">wuliddah@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Wuwu Driver</strong> (Motor Honda BeAT Plat E 3305 YAM)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-purple">Bank Sampah Pakuan</span></td>
            <td><span class="code-text">agalagan@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Bank Sampah Pakuan</strong> (Penimbangan Sampah & Reduksi CO2)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-blue">Mitra Laundry</span></td>
            <td><span class="code-text">aisl@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Ais Laundry</strong> (Layanan Cuci Kiloan & Pelacakan Progres)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-blue">Mitra Kost-an</span></td>
            <td><span class="code-text">aisk@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Ais Kos Exclusive & Homestay</strong> (Hunian Tamu 10 Kamar)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-rose">Wisata & Penginapan</span></td>
            <td><span class="code-text">adamshalishazahra@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Adam (ADAM HO)</strong> (Objek Wisata & Penginapan Garut)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-teal">Kanyaah Catering</span></td>
            <td><span class="code-text">cateringsehat@gmail.com</span></td>
            <td><span class="code-alert">password123</span></td>
            <td><strong>Catering Sehat</strong> (Konsumsi Acara, Sistem DP 30%, QRIS)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-blue">Kanyaah Shop</span></td>
            <td><span class="code-text">dyaskaaa@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Dyaska Shop</strong> (Toko Retail & Kebutuhan Harian / Supermarket)</td>
          </tr>
          <tr>
            <td><span class="badge-pill pill-amber">Kanyaah Mart</span></td>
            <td><span class="code-text">dyaska@gmail.com</span></td>
            <td><span class="code-text">12345678</span></td>
            <td><strong>Dyas Mart & Cafe</strong> (Katalog UMKM & Produk Komunitas)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer-note">
      <div class="footer-brand">
        <img src="${logoBase64}" class="footer-logo" alt="GEOVERSE" />
        <span>Catatan Pendukung Operasional Sistem GEOVERSE – PT Pertamina Geothermal Energy Tbk</span>
      </div>
      <div>Halaman 1 dari 2</div>
    </div>
  </div>

  <!-- ==================== HALAMAN 2 ==================== -->
  <div class="page">
    <div class="page-content">
      <div class="header-bar">
        <div class="brand-group">
          <img src="${logoBase64}" class="logo-img" alt="Logo GEOVERSE" />
          <div class="header-titles">
            <div class="doc-main-title">SPESIFIKASI OPERASIONAL & TATA KELOLA ADMIN</div>
            <div class="doc-sub-title">PT PERTAMINA GEOTHERMAL ENERGY TBK (PGE) AREA KAMOJANG</div>
          </div>
        </div>
        <div class="meta-box">
          <div>Bagian II: Alur & SOP Operasional</div>
          <div>Edisi: Oktober 2026 / Versi 2.0</div>
        </div>
      </div>

      <h2>3. Spesifikasi Fungsional Per Modul Layanan</h2>

      <div class="grid-feature">
        <div class="feature-item">
          <h4>🛵 Kanyaah Ride <span class="badge-pill pill-green">Transportasi</span></h4>
          <p>Layanan mobilitas roda dua bagi tenaga kerja lapangan PGE dan warga lingkar Kamojang. Penghitungan tarif otomatis berbasis jarak tempuh (kilometer) yang transparan dan terstandarisasi.</p>
        </div>

        <div class="feature-item">
          <h4>📦 Kanyaah Send <span class="badge-pill pill-amber">Proteksi PIN</span></h4>
          <p>Layanan kurir berkas teknis dan logistik ringan dengan <strong>Security PIN 4-digit</strong>: driver hanya dapat menyelesaikan pengantaran setelah memvalidasi PIN rahasia dari pihak penerima.</p>
        </div>

        <div class="feature-item">
          <h4>🍲 Kanyaah Food & Catering <span class="badge-pill pill-teal">QRIS & DP</span></h4>
          <p>Penyediaan makan harian dan konsumsi agenda resmi kantor PGE via <strong>Catering Sehat</strong>. Mendukung sistem Down Payment (DP 30%) dan pelunasan dengan verifikasi QRIS terpadu.</p>
        </div>

        <div class="feature-item">
          <h4>🧺 Kanyaah Laundry (Ais Laundry) <span class="badge-pill pill-blue">Live Tracking</span></h4>
          <p>Layanan cuci pakaian kerja dan umum. Status pengerjaan terpantau secara realtime melalui 4 tahapan (*Diterima di Gerai &rarr; Proses Cuci &rarr; Setrika &rarr; Siap Diambil/Diantar*).</p>
        </div>

        <div class="feature-item">
          <h4>🏡 Kanyaah Kos & Wisata (ADAM HO / Ais Kos) <span class="badge-pill pill-purple">Hunian & Wisata</span></h4>
          <p>Direktori hunian kos dan reservasi destinasi wisata/homestay bagi kontraktor dan tamu PGE. Memudahkan pengecekan okupansi kamar serta pencatatan pendapatan mitra pengelola.</p>
        </div>

        <div class="feature-item">
          <h4>🛍️ Kanyaah Shop & Mart (Dyas Shop / Mart) <span class="badge-pill pill-amber">Retail & UMKM</span></h4>
          <p>Pusat belanja retail kebutuhan harian (Kanyaah Shop) dan etalase produk UMKM komunitas lokal (Kanyaah Mart) yang terintegrasi pengantaran kurir langsung ke pemesan.</p>
        </div>

        <div class="feature-item" style="grid-column: span 2; border-left-color: #047857; background: #f0fdf4;">
          <h4>🌱 Kanyaah Recycle (Bank Sampah Pakuan) & Geoverse Point <span class="badge-pill pill-green">Pilar Utama Program Keberlanjutan (ESG)</span></h4>
          <p>
            Warga menyetorkan sampah terpilah (plastik, kertas, minyak jelantah, logam) ke Bank Sampah. Petugas menimbang melalui aplikasi, sistem secara saintifik menghitung <strong>Indikator Reduksi Emisi Karbon (Kg CO₂ Equivalent)</strong> yang dicegah, dan menerbitkan insentif <strong>Geoverse Point (100 Pts = Rp 1)</strong>. Poin tersimpan di dompet digital pelanggan dan dapat ditarik tunai atau dibelanjakan kembali.
          </p>
        </div>
      </div>

      <h2>4. Alur Kerja Sistem Terintegrasi (End-to-End Governance)</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">Tahapan</th>
            <th style="width: 25%;">Aksi Pengguna (Customer)</th>
            <th style="width: 30%;">Aksi Mitra Lapangan / Driver</th>
            <th style="width: 30%;">Pengawasan Admin PGE Kamojang</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Inisiasi & Order</strong></td>
            <td>Memilih layanan, menentukan titik lokasi penjemputan dan pengantaran.</td>
            <td>Notifikasi pesanan baru masuk secara instan pada terminal mitra kerja.</td>
            <td>Transaksi tercatat secara realtime pada log aktivitas sistem pusat.</td>
          </tr>
          <tr>
            <td><strong>2. Eksekusi Lapangan</strong></td>
            <td>Melacak pergerakan driver, memegang Security PIN untuk serah terima paket.</td>
            <td>Melaksanakan layanan, memverifikasi dokumen atau menimbang sampah di lokasi.</td>
            <td>Admin mengawasi radius pelayanan dan kepatuhan standar operasional.</td>
          </tr>
          <tr>
            <td><strong>3. Verifikasi & Poin</strong></td>
            <td>Menerima barang/jasa, memberikan PIN, dan memperoleh reward Geoverse Point.</td>
            <td>Menginput PIN penerima, menyelesaikan order, menerima pendapatan bersih.</td>
            <td>Metrik reduksi emisi CO2 dan volume sampah terakumulasi ke laporan berkala CSR.</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Pusat Kendali Manajemen: Dashboard Admin PGE Kamojang</h2>
      <div class="note-box">
        Melalui akun administrator resmi <span class="code-text">geoverse.pge@gmail.com</span>, jajaran manajemen PGE Kamojang memegang kendali atas:
        <ul class="step-list" style="margin-top: 2px;">
          <li><strong>Audit Dokumen & KYC Mitra:</strong> Memvalidasi berkas identitas KTP, SIM kendaraan operasional, NIB, dan foto kelayakan dapur/tempat usaha sebelum izin operasional mitra diaktifkan.</li>
          <li><strong>CMS Hero Banner Terpadu:</strong> Menayangkan pengumuman resmi perusahaan, edukasi keselamatan kerja (K3), agenda CSR, serta informasi strategis energi panas bumi ke seluruh beranda pengguna.</li>
          <li><strong>Monitoring Kinerja ESG & Dompet Poin:</strong> Memantau agregat reduksi emisi karbon (CO2), volume daur ulang sampah terkelola, serta perputaran saldo reward komunitas warga lingkar Kamojang.</li>
        </ul>
      </div>

      <h2>6. Prosedur Operasional Standar (SOP) Manajemen PGE</h2>
      <p style="font-size: 7.2pt; margin-bottom: 2.5px;">
        Panduan alur operasional rutin bagi personil administrator PT Pertamina Geothermal Energy Tbk Area Kamojang:
      </p>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Aktivitas Tata Kelola</th>
            <th style="width: 45%;">Tindakan Operasional yang Dilakukan</th>
            <th style="width: 30%;">Frekuensi / PIC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Verifikasi Mitra Baru</strong></td>
            <td>Memeriksa kelengkapan KTP, SIM, STNK, dan foto tempat usaha pada menu Registrasi Mitra.</td>
            <td>Harian / Tim Admin PGE</td>
          </tr>
          <tr>
            <td><strong>Pembaruan Konten CMS</strong></td>
            <td>Mengunggah materi edukasi K3, kegiatan sosial, atau pengumuman operasional PGE.</td>
            <td>Berkala / Humas & CSR PGE</td>
          </tr>
          <tr>
            <td><strong>Rekonsiliasi Bank Sampah</strong></td>
            <td>Memverifikasi data setoran sampah dan konversi reduksi emisi karbon di modul Bank Sampah Pakuan.</td>
            <td>Mingguan / Pendamping CSR</td>
          </tr>
          <tr>
            <td><strong>Audit Saldo & Poin</strong></td>
            <td>Memantau rasio pencairan poin warga ke saldo tunai (100 Pts = Rp 1) demi akuntabilitas program.</td>
            <td>Bulanan / Keuangan & CSR</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer-note">
      <div class="footer-brand">
        <img src="${logoBase64}" class="footer-logo" alt="GEOVERSE" />
        <span>Catatan Pendukung Operasional Sistem GEOVERSE – PT Pertamina Geothermal Energy Tbk</span>
      </div>
      <div>Halaman 2 dari 2 • Dokumen Resmi Operasional</div>
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(rootDir, 'PANDUAN_DEMO_GEOVERSE_PGE_KAMOJANG.html');
const pdfFilePath = path.join(rootDir, 'PANDUAN_DEMO_GEOVERSE_PGE_KAMOJANG.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log('HTML written successfully!');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${htmlFilePath}"`;
console.log('Executing:', cmd);
execSync(cmd, { stdio: 'inherit' });
console.log('PDF compiled successfully!');
