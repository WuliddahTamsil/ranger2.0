const fs = require('fs');
const path = require('path');

const privacyHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kebijakan Privasi (Privacy Policy) - GEOVERSE</title>
  <meta name="description" content="Kebijakan Privasi resmi aplikasi GEOVERSE oleh PT Pertamina Geothermal Energy (PGE) Kamojang. Informasi pengumpulan data, izin lokasi, kamera, dan penghapusan akun.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0D7A53;
      --primary-dark: #09573B;
      --primary-light: #E8F5EF;
      --primary-border: #A7DCBE;
      --slate-50: #F8FAFC;
      --slate-100: #F1F5F9;
      --slate-200: #E2E8F0;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-800: #1E293B;
      --slate-900: #0F172A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--slate-50);
      color: var(--slate-800);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--slate-200);
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(8px);
    }
    .nav-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }
    .logo-badge {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #0D7A53 0%, #15A06F 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 1.25rem;
      box-shadow: 0 4px 10px rgba(13, 122, 83, 0.25);
    }
    .logo-text h1 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--primary);
      margin: 0;
      line-height: 1.2;
    }
    .logo-text span {
      font-size: 0.75rem;
      color: var(--slate-600);
      font-weight: 500;
    }
    .nav-links {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .nav-links a {
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-700);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .nav-links a:hover {
      background: var(--primary-light);
      color: var(--primary);
    }
    .nav-links a.active {
      background: var(--primary);
      color: #FFFFFF;
    }
    .hero {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F8F4 100%);
      border-bottom: 1px solid var(--slate-200);
      padding: 3.5rem 1.5rem 3rem;
      text-align: center;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      color: var(--primary-dark);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .hero h1 {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }
    .hero p {
      max-width: 680px;
      margin: 0 auto;
      color: var(--slate-600);
      font-size: 1rem;
    }
    .meta-box {
      margin-top: 1.5rem;
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: var(--slate-600);
      background: white;
      padding: 0.6rem 1.25rem;
      border-radius: 9999px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid var(--slate-200);
    }
    .container {
      max-width: 900px;
      margin: 2.5rem auto 5rem;
      padding: 0 1.5rem;
    }
    .card {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid var(--slate-200);
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);
      padding: 2.5rem;
      margin-bottom: 2rem;
    }
    .card h2 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-top: 2rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      border-bottom: 1px solid var(--slate-100);
      padding-bottom: 0.6rem;
    }
    .card h2:first-of-type {
      margin-top: 0;
    }
    .card h3 {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--slate-800);
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .card p, .card ul {
      color: var(--slate-700);
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }
    .card ul {
      padding-left: 1.5rem;
    }
    .card li {
      margin-bottom: 0.4rem;
    }
    .permission-box {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-left: 4px solid var(--primary);
      padding: 1.25rem;
      border-radius: 8px;
      margin: 1.25rem 0;
    }
    .permission-box strong {
      color: var(--primary-dark);
      display: block;
      margin-bottom: 0.25rem;
      font-size: 0.95rem;
    }
    .alert-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #2563EB;
      padding: 1.25rem;
      border-radius: 8px;
      margin: 1.5rem 0;
      color: #1E3A8A;
      font-size: 0.95rem;
    }
    .highlight-card {
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    .highlight-card h4 {
      color: var(--primary-dark);
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    footer {
      background: #FFFFFF;
      border-top: 1px solid var(--slate-200);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--slate-600);
      font-size: 0.85rem;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }
    .footer-links a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .footer-links a:hover {
      text-decoration: underline;
    }
    @media (max-width: 640px) {
      .hero h1 { font-size: 1.75rem; }
      .card { padding: 1.5rem; }
      .nav-links a { padding: 0.4rem 0.75rem; }
    }
  </style>
</head>
<body>

  <header>
    <div class="nav-container">
      <a href="/" class="logo-area">
        <div class="logo-badge">G</div>
        <div class="logo-text">
          <h1>GEOVERSE</h1>
          <span>PGE Kamojang Community App</span>
        </div>
      </a>
      <nav class="nav-links">
        <a href="/" class="nav-item">Beranda</a>
        <a href="/privacy" class="active">Privacy Policy</a>
        <a href="/support" class="nav-item">Support & Bantuan</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="hero-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Apple App Store Standard Compliance
    </div>
    <h1>Kebijakan Privasi (Privacy Policy)</h1>
    <p>Komitmen perlindungan data pribadi dan transparansi penggunaan informasi pada aplikasi mobile GEOVERSE.</p>
    <div class="meta-box">
      <span><strong>Aplikasi:</strong> GEOVERSE</span>
      <span><strong>Pengembang:</strong> PT Pertamina Geothermal Energy (PGE) Kamojang</span>
      <span><strong>Berlaku Sejak:</strong> 27 Oktober 2026</span>
    </div>
  </section>

  <main class="container">
    <article class="card">
      <div class="alert-box">
        <strong>English Summary for iOS App Review:</strong><br>
        GEOVERSE ("We", "Our", or "App") is committed to protecting your privacy. This policy outlines how we handle user data including account credentials, foreground location (for driver dispatch & live order tracking), camera & photo library access (for profile pictures, partner registration verification, and proof-of-delivery receipts), transaction records, and how users can request permanent deletion of their account and associated personal data at any time.
      </div>

      <h2>1. Pendahuluan</h2>
      <p>
        Selamat datang di <strong>GEOVERSE</strong>, super app komunitas terintegrasi yang dikembangkan dengan dukungan <strong>PT Pertamina Geothermal Energy (PGE) Area Kamojang</strong>. GEOVERSE melayani ekosistem lokal yang mencakup pemesanan katering, marketplace produk UMKM lokal (Kanyaah Mart), layanan antar-jemput laundry, direktori dan pemesanan kamar kos, jasa transportasi armada driver GEOVERSE, serta program tabungan/setor sampah daur ulang ramah lingkungan.
      </p>
      <p>
        Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi yang Anda berikan kepada kami sesuai dengan regulasi perlindungan data yang berlaku di Republik Indonesia serta panduan standar <em>Apple App Store Review Guidelines</em>.
      </p>

      <h2>2. Informasi yang Kami Kumpulkan</h2>
      <p>Kami hanya mengumpulkan informasi yang secara langsung diperlukan untuk menjalankan fungsi dan layanan aplikasi:</p>
      
      <h3>A. Informasi Akun dan Identitas</h3>
      <ul>
        <li><strong>Nama Lengkap & Informasi Kontak:</strong> Nama, alamat email, dan nomor telepon/WhatsApp untuk registrasi akun, verifikasi keamanan, dan komunikasi pengiriman.</li>
        <li><strong>Alamat Pengiriman / Domisili:</strong> Titik alamat tujuan pengantaran makanan, barang belanjaan, atau penjemputan cucian laundry.</li>
        <li><strong>Dokumen Verifikasi Mitra (Khusus Driver, Pemilik Toko, Kos, dan Laundry):</strong> Foto identitas (KTP), SIM/STNK (untuk mitra driver), dan surat verifikasi terkait untuk keperluan otentikasi legal dan keselamatan komunitas.</li>
      </ul>

      <h3>B. Informasi Izin Akses Perangkat</h3>
      
      <div class="permission-box">
        <strong>1. Izin Lokasi Perangkat</strong>
        GEOVERSE meminta izin lokasi ketika aplikasi digunakan untuk:
        <ul style="margin-top: 0.5rem; margin-bottom: 0;">
          <li>Menentukan titik penjemputan dan pengantaran armada driver secara presisi.</li>
          <li>Pelacakan rute pengantaran pesanan secara langsung (real-time tracking).</li>
          <li>Menampilkan rekomendasi merchant, warung katering, kos, dan laundry terdekat dari posisi Anda di sekitar Kamojang.</li>
        </ul>
        <em>Catatan: Kami tidak melacak lokasi Anda saat aplikasi ditutup (background location tidak aktif).</em>
      </div>

      <div class="permission-box">
        <strong>2. Izin Kamera</strong>
        Digunakan secara langsung saat Anda ingin:
        <ul style="margin-top: 0.5rem; margin-bottom: 0;">
          <li>Mengambil foto profil pengguna.</li>
          <li>Memfoto dokumen pendaftaran mitra (KTP/SIM/STNK).</li>
          <li>Memfoto bukti serah terima pesanan atau bukti setoran sampah terpilah.</li>
        </ul>
      </div>

      <div class="permission-box">
        <strong>3. Izin Galeri Foto</strong>
        Digunakan untuk memilih gambar dokumen atau foto produk dari galeri ponsel Anda, serta izin opsional untuk menyimpan struk digital dan bukti transaksi serah terima ke galeri foto Anda.
      </div>

      <h3>C. Data Transaksi & Pembayaran</h3>
      <p>
        Data yang disimpan mencakup riwayat pesanan, nominal belanja, dan status pembayaran. Seluruh transaksi pembayaran non-tunai (QRIS & Virtual Account) diproses secara terenkripsi oleh Payment Gateway berizin resmi Bank Indonesia (<strong>Midtrans</strong>). <strong>GEOVERSE tidak pernah menyimpan nomor kartu kredit/debit atau PIN otorisasi perbankan Anda.</strong>
      </p>

      <h2>3. Penggunaan Informasi</h2>
      <p>Informasi yang kami kumpulkan digunakan untuk tujuan-tujuan berikut:</p>
      <ul>
        <li>Memproses dan menyelesaikan pesanan layanan (marketplace, katering, laundry, kos, dan penjemputan armada).</li>
        <li>Menghitung saldo dan akumulasi poin program penukaran sampah daur ulang (100 Pts = Rp 1).</li>
        <li>Menghubungi pengguna perihal pembaruan status pesanan, verifikasi akun, atau penanganan komplain.</li>
        <li>Menjaga keamanan ekosistem GEOVERSE dari tindakan penipuan atau penyalahgunaan akun.</li>
        <li>Menganalisis dan meningkatkan performa serta kenyamanan penggunaan aplikasi GEOVERSE.</li>
      </ul>

      <h2>4. Berbagi Informasi dengan Pihak Ketiga</h2>
      <p>
        Kami <strong>TIDAK PERNAH MENJUAL, MENYEWAKAN, ATAU MEMPERDAGANGKAN</strong> data pribadi Anda kepada pihak mana pun untuk kepentingan periklanan pihak ketiga. Data hanya dibagikan secara terbatas untuk operasional berikut:
      </p>
      <ul>
        <li><strong>Mitra Layanan Terkait:</strong> Driver yang mengantarkan pesanan Anda atau merchant yang menyiapkan pesanan Anda akan menerima nama, alamat tujuan, dan nomor telepon kontak Anda.</li>
        <li><strong>Penyedia Layanan Pembayaran:</strong> Midtrans untuk pemrosesan pembayaran elektronik yang aman dan terenkripsi.</li>
        <li><strong>Penyedia Infrastruktur Cloud:</strong> Server penyimpanan data dan media terenkripsi (Cloudinary dan penyedia hosting tersertifikasi) dengan standar keamanan industri.</li>
        <li><strong>Kepatuhan Hukum:</strong> Jika diwajibkan oleh undang-undang atau perintah otoritas penegak hukum resmi di Republik Indonesia.</li>
      </ul>

      <h2>5. Keamanan dan Penyimpanan Data</h2>
      <p>
        Keamanan data Anda adalah prioritas utama kami. Kami menerapkan standar enkripsi industri (SSL/TLS HTTPS) pada setiap pengiriman data antara aplikasi mobile dan server kami. Seluruh kata sandi dienkripsi menggunakan algoritma hashing satu arah yang aman.
      </p>

      <h2>6. Hak Pengguna & Prosedur Penghapusan Akun (Account Deletion)</h2>
      <div class="highlight-card">
        <h4>Hak Penghapusan Akun</h4>
        <p>
          Setiap pengguna GEOVERSE memiliki hak penuh untuk meminta penghapusan akun serta seluruh data pribadi yang tersimpan pada server kami secara permanen kapan saja tanpa dikenakan biaya.
        </p>
        <p><strong>Cara mengajukan penghapusan akun:</strong></p>
        <ol style="padding-left: 1.5rem; margin-top: 0.5rem;">
          <li><strong>Melalui Aplikasi:</strong> Masuk ke tab <em>Profil</em> &rarr; Pilih menu <em>Pengaturan Akun</em> &rarr; Ketuk <em>Hapus Akun Saya</em>, lalu konfirmasi permintaan Anda.</li>
          <li><strong>Melalui Email Layanan Pengguna:</strong> Kirim email resmi ke <a href="mailto:geoverse.pge@gmail.com" style="color: var(--primary); font-weight:700;">geoverse.pge@gmail.com</a> dengan subjek <code>Permohonan Hapus Akun GEOVERSE</code>, cantumkan alamat email dan nomor telepon terdaftar Anda. Tim kami akan memverifikasi dan memproses penghapusan dalam waktu maksimal 3x24 jam kerja.</li>
        </ol>
      </div>

      <h2>7. Privasi Anak-Anak</h2>
      <p>
        Layanan GEOVERSE tidak ditujukan untuk anak-anak di bawah usia 13 tahun. Kami tidak secara sengaja mengumpulkan informasi pribadi dari anak-anak di bawah 13 tahun. Jika Anda adalah orang tua atau wali yang mengetahui anak Anda memberikan informasi kepada kami, silakan hubungi kami untuk penghapusan segera.
      </p>

      <h2>8. Perubahan pada Kebijakan Privasi</h2>
      <p>
        Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu agar selaras dengan pembaruan fitur aplikasi dan regulasi hukum. Setiap perubahan substansial akan diumumkan melalui notifikasi di dalam aplikasi atau melalui pembaruan tanggal "Berlaku Sejak" di bagian atas halaman ini.
      </p>

      <h2>9. Kontak dan Layanan Bantuan</h2>
      <p>
        Jika Anda memiliki pertanyaan, saran, atau kekhawatiran terkait Kebijakan Privasi ini atau pengelolaan data pribadi Anda, silakan hubungi Petugas Perlindungan Data kami melalui:
      </p>
      <ul>
        <li><strong>Email Resmi:</strong> <a href="mailto:geoverse.pge@gmail.com" style="color:var(--primary); font-weight: 600;">geoverse.pge@gmail.com</a></li>
        <li><strong>Layanan WhatsApp:</strong> +62 815-1122-6089</li>
        <li><strong>Alamat Kantor:</strong> Kp Kamojang, Desa Laksana, Kec. Ibun, Kab. Bandung, Jawa Barat (PGE Kamojang).</li>
      </ul>
    </article>
  </main>

  <footer>
    <div class="footer-links">
      <a href="/">Beranda</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/support">Pusat Bantuan & Support</a>
    </div>
    <p>&copy; 2026 GEOVERSE - Inisiatif Berdaya Bersama PT Pertamina Geothermal Energy (PGE) Kamojang. Hak Cipta Dilindungi.</p>
  </footer>

</body>
</html>
`;

const supportHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pusat Bantuan & Layanan Dukungan (Support Center) - GEOVERSE</title>
  <meta name="description" content="Pusat Bantuan Resmi GEOVERSE oleh PGE Kamojang. Kontak layanan pelanggan, FAQ cara pemesanan, setor sampah, sewa kos, laundry, dan tiket bantuan teknis.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0D7A53;
      --primary-dark: #09573B;
      --primary-light: #E8F5EF;
      --primary-border: #A7DCBE;
      --slate-50: #F8FAFC;
      --slate-100: #F1F5F9;
      --slate-200: #E2E8F0;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-800: #1E293B;
      --slate-900: #0F172A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--slate-50);
      color: var(--slate-800);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    header {
      background: #FFFFFF;
      border-bottom: 1px solid var(--slate-200);
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(8px);
    }
    .nav-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }
    .logo-badge {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #0D7A53 0%, #15A06F 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 1.25rem;
      box-shadow: 0 4px 10px rgba(13, 122, 83, 0.25);
    }
    .logo-text h1 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--primary);
      margin: 0;
      line-height: 1.2;
    }
    .logo-text span {
      font-size: 0.75rem;
      color: var(--slate-600);
      font-weight: 500;
    }
    .nav-links {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .nav-links a {
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-700);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .nav-links a:hover {
      background: var(--primary-light);
      color: var(--primary);
    }
    .nav-links a.active {
      background: var(--primary);
      color: #FFFFFF;
    }
    .hero {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F8F4 100%);
      border-bottom: 1px solid var(--slate-200);
      padding: 3.5rem 1.5rem 3rem;
      text-align: center;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      color: var(--primary-dark);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .hero h1 {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.03em;
      margin-bottom: 0.75rem;
    }
    .hero p {
      max-width: 680px;
      margin: 0 auto;
      color: var(--slate-600);
      font-size: 1rem;
    }
    .container {
      max-width: 1050px;
      margin: 2.5rem auto 5rem;
      padding: 0 1.5rem;
    }
    .contact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .contact-card {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid var(--slate-200);
      padding: 1.75rem;
      box-shadow: 0 4px 15px -2px rgba(0,0,0,0.04);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .contact-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -4px rgba(0,0,0,0.08);
    }
    .contact-card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .contact-card h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 0.35rem;
    }
    .contact-card p {
      font-size: 0.9rem;
      color: var(--slate-600);
      margin-bottom: 1.25rem;
      flex-grow: 1;
    }
    .contact-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: var(--primary);
      color: #FFFFFF;
    }
    .btn-primary:hover {
      background: var(--primary-dark);
    }
    .btn-secondary {
      background: var(--slate-100);
      color: var(--slate-800);
      border: 1px solid var(--slate-200);
    }
    .btn-secondary:hover {
      background: var(--slate-200);
    }
    .section-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--slate-900);
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .section-desc {
      color: var(--slate-600);
      margin-bottom: 1.75rem;
      font-size: 0.95rem;
    }
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 3.5rem;
    }
    .faq-item {
      background: #FFFFFF;
      border: 1px solid var(--slate-200);
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .faq-item:hover {
      border-color: var(--primary-border);
    }
    .faq-header {
      padding: 1.25rem 1.5rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      color: var(--slate-800);
      user-select: none;
    }
    .faq-header span {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .faq-icon-chevron {
      transition: transform 0.2s;
    }
    .faq-item.open .faq-icon-chevron {
      transform: rotate(180deg);
    }
    .faq-body {
      display: none;
      padding: 0 1.5rem 1.25rem;
      color: var(--slate-700);
      font-size: 0.95rem;
      border-top: 1px solid var(--slate-100);
      margin-top: 0.25rem;
      padding-top: 1rem;
    }
    .faq-item.open .faq-body {
      display: block;
    }
    .form-card {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid var(--slate-200);
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);
      padding: 2.5rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--slate-700);
      margin-bottom: 0.4rem;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
      background: var(--slate-50);
    }
    .form-control:focus {
      border-color: var(--primary);
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(13, 122, 83, 0.15);
    }
    textarea.form-control {
      resize: vertical;
      min-height: 120px;
    }
    .form-success {
      display: none;
      background: var(--primary-light);
      border: 1px solid var(--primary-border);
      color: var(--primary-dark);
      padding: 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #15803D;
      background: #DCFCE7;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.5rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 0 2px #86EFAC;
    }
    footer {
      background: #FFFFFF;
      border-top: 1px solid var(--slate-200);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--slate-600);
      font-size: 0.85rem;
    }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }
    .footer-links a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .footer-links a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>

  <header>
    <div class="nav-container">
      <a href="/" class="logo-area">
        <div class="logo-badge">G</div>
        <div class="logo-text">
          <h1>GEOVERSE</h1>
          <span>PGE Kamojang Community App</span>
        </div>
      </a>
      <nav class="nav-links">
        <a href="/" class="nav-item">Beranda</a>
        <a href="/privacy" class="nav-item">Privacy Policy</a>
        <a href="/support" class="active">Support & Bantuan</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="hero-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Apple App Store Support Guideline 1.5
    </div>
    <h1>Pusat Bantuan & Layanan Dukungan</h1>
    <p>Kami siap membantu Anda kapan saja. Temukan jawaban seputar layanan GEOVERSE atau hubungi tim customer service kami secara langsung.</p>
  </section>

  <main class="container">
    <div style="text-align: center;">
      <div class="status-badge">
        <span class="status-dot"></span>
        Semua Sistem Layanan Beroperasi Normal (All Systems Operational)
      </div>
    </div>

    <!-- Contact Cards Grid -->
    <div class="contact-grid">
      <!-- WhatsApp Support -->
      <div class="contact-card">
        <div>
          <div class="contact-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <h3>WhatsApp Support</h3>
          <p>Respons cepat langsung dengan tim bantuan operasional GEOVERSE PGE Kamojang.</p>
        </div>
        <div>
          <p style="font-size:0.85rem; font-weight:700; color:var(--primary); margin-bottom:0.25rem;">+62 815-1122-6089</p>
          <p style="font-size:0.8rem; color:var(--slate-600); margin-bottom:0.75rem;">Setiap Hari: 07.00 - 21.00 WIB</p>
          <a href="https://wa.me/6281511226089?text=Halo%20Tim%20Support%20GEOVERSE,%20saya%20membutuhkan%20bantuan%20terkait%20aplikasi." target="_blank" rel="noopener" class="contact-btn btn-primary" style="width:100%;">
            Chat WhatsApp (+62 815-1122-6089)
          </a>
        </div>
      </div>

      <!-- Email Support -->
      <div class="contact-card">
        <div>
          <div class="contact-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h3>Email Resmi Bantuan</h3>
          <p>Untuk pertanyaan teknis, verifikasi mitra, permintaan hapus akun, atau pengajuan kerjasama.</p>
        </div>
        <div>
          <p style="font-size:0.8rem; color:var(--slate-600); margin-bottom:0.75rem;">Estimasi Balas: &le; 1x24 Jam Kerja</p>
          <a href="mailto:geoverse.pge@gmail.com?subject=Permintaan%20Bantuan%20GEOVERSE" class="contact-btn btn-secondary" style="width:100%;">
            geoverse.pge@gmail.com
          </a>
        </div>
      </div>

      <!-- Kantor Operasional -->
      <div class="contact-card">
        <div>
          <div class="contact-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <h3>Kantor Operasional</h3>
          <p>Kantor Operasional GEOVERSE & PT Pertamina Geothermal Energy (PGE) Area Kamojang.</p>
        </div>
        <div>
          <p style="font-size:0.8rem; color:var(--slate-600); margin-bottom:0.75rem;">Kp Kamojang, Desa Laksana, Kec. Ibun, Kab. Bandung, Jawa Barat (PGE Kamojang)</p>
          <a href="https://maps.google.com/?q=PT.+PGE+Area+Kamojang" target="_blank" rel="noopener" class="contact-btn btn-secondary" style="width:100%;">
            Buka Petunjuk Arah
          </a>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <h2 class="section-title">Pertanyaan yang Sering Diajukan (FAQ)</h2>
    <p class="section-desc">Jawaban praktis untuk kendala dan panduan penggunaan aplikasi GEOVERSE.</p>

    <div class="faq-list">
      <div class="faq-item open">
        <div class="faq-header" onclick="toggleFaq(this)">
          <span>Bagaimana cara memesan katering atau produk UMKM di GEOVERSE?</span>
          <svg class="faq-icon-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-body">
          Buka aplikasi GEOVERSE, pilih menu <strong>Katering</strong> atau <strong>Marketplace</strong> di beranda. Telusuri katalog merchant di sekitar Kamojang, pilih menu atau produk yang diinginkan, tentukan jumlah pesanan, dan lanjut ke halaman pembayaran. Pesanan Anda akan langsung diproses oleh merchant dan diantar oleh armada kurir GEOVERSE.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-header" onclick="toggleFaq(this)">
          <span>Bagaimana cara kerja setor sampah daur ulang dan konversi poin?</span>
          <svg class="faq-icon-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-body">
          Kumpulkan sampah anorganik terpilah (plastik, kardus, kaleng, minyak jelantah). Bawa ke Bank Sampah binaan PGE Kamojang atau pesan jemputan melalui aplikasi. Petugas akan menimbang dan mencatat jumlah setoran Anda. Setiap kilogram sampah bernilai poin yang langsung masuk ke akun GEOVERSE Anda (standar konversi: <strong>100 Poin = Rp 1</strong>). Poin ini dapat digunakan untuk berbelanja produk di Kanyaah Mart atau dicairkan.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-header" onclick="toggleFaq(this)">
          <span>Metode pembayaran apa saja yang didukung?</span>
          <svg class="faq-icon-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-body">
          GEOVERSE terintegrasi dengan Payment Gateway berlisensi Bank Indonesia (Midtrans). Anda dapat membayar menggunakan <strong>QRIS</strong> (GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, dan seluruh aplikasi m-banking), Virtual Account bank nasional, serta saldo poin tabungan sampah Anda.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-header" onclick="toggleFaq(this)">
          <span>Bagaimana jika pesanan saya bermasalah atau makanan belum tiba?</span>
          <svg class="faq-icon-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-body">
          Anda dapat memantau posisi pengantaran driver secara real-time pada halaman Lacak Pesanan. Jika mengalami kendala keterlambatan atau ketidaksesuaian barang, Anda dapat langsung menghubungi driver melalui fitur chat di aplikasi atau menghubungi WhatsApp Customer Service kami di +62 815-1122-6089 dengan menyertakan Nomor ID Pesanan.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-header" onclick="toggleFaq(this)">
          <span>Bagaimana cara mendaftar sebagai Mitra Toko, Laundry, Kos, atau Driver?</span>
          <svg class="faq-icon-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-body">
          Pada layar login aplikasi, ketuk opsi <strong>"Daftar Sebagai Mitra"</strong>, lalu pilih kategori kemitraan Anda (Mitra Toko UMKM, Katering, Laundry, Kos-Kosan, atau Mitra Driver). Lengkapi data usaha dan unggah foto dokumen identitas untuk diverifikasi oleh tim admin PGE Kamojang.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-header" onclick="toggleFaq(this)">
          <span>Bagaimana cara mengajukan penghapusan akun dan data pribadi?</span>
          <svg class="faq-icon-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-body">
          Anda dapat mengajukan penghapusan akun kapan saja melalui menu <em>Profil &rarr; Pengaturan &rarr; Hapus Akun</em> di aplikasi, atau mengirim email ke <strong>geoverse.pge@gmail.com</strong> dengan subjek "Permohonan Penghapusan Akun". Seluruh data akun Anda akan dihapus secara permanen dari server dalam 3x24 jam kerja.
        </div>
      </div>
    </div>

    <!-- Direct Support Form -->
    <div class="form-card">
      <h2 class="section-title" style="margin-bottom:0.25rem;">Kirim Pesan / Pengaduan</h2>
      <p class="section-desc">Punya pertanyaan khusus yang belum terjawab? Kirim formulir ini dan pesan Anda akan langsung terhubung ke WhatsApp Admin kami.</p>
      
      <div id="formSuccess" class="form-success">
        Membuka WhatsApp untuk mengirimkan pesan pengaduan Anda ke Admin (+62 878-0598-7309)... Jika tidak otomatis terbuka, silakan klik tombol kirim kembali.
      </div>

      <form id="supportForm" onsubmit="handleSupportSubmit(event)">
        <div class="form-group">
          <label class="form-label">Nama Lengkap</label>
          <input type="text" required class="form-control" placeholder="Contoh: Budi Santoso" id="inputName">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Alamat Email</label>
            <input type="email" required class="form-control" placeholder="nama@email.com" id="inputEmail">
          </div>
          <div class="form-group">
            <label class="form-label">Nomor WhatsApp (Opsional)</label>
            <input type="tel" class="form-control" placeholder="081234567890" id="inputPhone">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Kategori Bantuan</label>
          <select class="form-control" id="inputCategory" required>
            <option value="">-- Pilih Kategori --</option>
            <option value="Masalah Pemesanan / Pengantaran">Masalah Pemesanan / Pengantaran</option>
            <option value="Pembayaran & Midtrans / QRIS">Pembayaran & Midtrans / QRIS</option>
            <option value="Program Setor Sampah & Poin">Program Setor Sampah & Poin</option>
            <option value="Pendaftaran / Verifikasi Mitra">Pendaftaran / Verifikasi Mitra</option>
            <option value="Kendala Akun / Hapus Akun">Kendala Akun / Hapus Akun</option>
            <option value="Pertanyaan Umum Lainnya">Pertanyaan Umum Lainnya</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Pesan / Detail Kendala</label>
          <textarea required class="form-control" placeholder="Tuliskan detail pertanyaan atau keluhan Anda di sini (sertakan ID Pesanan jika ada)..." id="inputMessage"></textarea>
        </div>
        <button type="submit" class="contact-btn btn-primary" style="padding: 0.85rem 2rem; font-size:1rem; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:0.5rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          Kirim Pesan ke WhatsApp Admin
        </button>
      </form>
    </div>
  </main>

  <footer>
    <div class="footer-links">
      <a href="/">Beranda</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/support">Pusat Bantuan & Support</a>
    </div>
    <p>&copy; 2026 GEOVERSE - Inisiatif Berdaya Bersama PT Pertamina Geothermal Energy (PGE) Kamojang. Hak Cipta Dilindungi.</p>
  </footer>

  <script>
    function toggleFaq(elem) {
      const parent = elem.closest('.faq-item');
      parent.classList.toggle('open');
    }

    function handleSupportSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('inputName').value.trim();
      const email = document.getElementById('inputEmail').value.trim();
      const phone = document.getElementById('inputPhone').value.trim() || '-';
      const category = document.getElementById('inputCategory').value;
      const message = document.getElementById('inputMessage').value.trim();

      const waText = 
        "Halo Admin GEOVERSE, saya ingin menyampaikan pengaduan / bantuan:%0A%0A" +
        "*Nama:* " + encodeURIComponent(name) + "%0A" +
        "*Email:* " + encodeURIComponent(email) + "%0A" +
        "*Nomor Kontak:* " + encodeURIComponent(phone) + "%0A" +
        "*Kategori:* " + encodeURIComponent(category) + "%0A%0A" +
        "*Detail Pesan:*%0A" + encodeURIComponent(message);

      const targetWaUrl = "https://wa.me/6287805987309?text=" + waText;

      const success = document.getElementById('formSuccess');
      success.style.display = 'block';

      // Open WhatsApp directly
      window.open(targetWaUrl, '_blank');
    }
  </script>

</body>
</html>
`;

// Paths in Design The Rangers App 2.0
const webRepoRoot = 'C:/Users/ASUS/Downloads/Design The Rangers App 2.0';
const currentRepoRoot = 'c:/Users/ASUS/Documents/Development/ranger2.0';

// 1. Write to Design The Rangers App 2.0 (public and public subfolders)
fs.writeFileSync(path.join(webRepoRoot, 'public', 'privacy.html'), privacyHtml, 'utf8');
fs.writeFileSync(path.join(webRepoRoot, 'public', 'privacy', 'index.html'), privacyHtml, 'utf8');
fs.writeFileSync(path.join(webRepoRoot, 'public', 'support.html'), supportHtml, 'utf8');
fs.writeFileSync(path.join(webRepoRoot, 'public', 'support', 'index.html'), supportHtml, 'utf8');

// 2. Also write vercel.json in webRepoRoot
const vercelConfig = {
  "cleanUrls": true,
  "rewrites": [
    { "source": "/privacy", "destination": "/privacy.html" },
    { "source": "/support", "destination": "/support.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
};
fs.writeFileSync(path.join(webRepoRoot, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf8');

// 3. Also write to ranger2.0 for completeness
if (!fs.existsSync(path.join(currentRepoRoot, 'public', 'privacy'))) {
  fs.mkdirSync(path.join(currentRepoRoot, 'public', 'privacy'), { recursive: true });
}
if (!fs.existsSync(path.join(currentRepoRoot, 'public', 'support'))) {
  fs.mkdirSync(path.join(currentRepoRoot, 'public', 'support'), { recursive: true });
}
fs.writeFileSync(path.join(currentRepoRoot, 'public', 'privacy.html'), privacyHtml, 'utf8');
fs.writeFileSync(path.join(currentRepoRoot, 'public', 'privacy', 'index.html'), privacyHtml, 'utf8');
fs.writeFileSync(path.join(currentRepoRoot, 'public', 'support.html'), supportHtml, 'utf8');
fs.writeFileSync(path.join(currentRepoRoot, 'public', 'support', 'index.html'), supportHtml, 'utf8');
fs.writeFileSync(path.join(currentRepoRoot, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf8');

console.log('Successfully generated Privacy Policy and Support pages in both repos!');
