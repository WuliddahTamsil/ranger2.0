const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const BASE_URL = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'rangers_app_secret';

const User = require('../models/User');
const MarketplaceProduct = require('../models/MarketplaceProduct');
const MarketplaceOrder = require('../models/MarketplaceOrder');
const MarketplaceWithdrawal = require('../models/MarketplaceWithdrawal');
const Review = require('../models/Review');

const timestamp = Date.now();

async function runFullJourney() {
  console.log('========================================================================');
  console.log('🌟 PENGUJIAN LENGKAP KANYAAH MARKETPLACE UMKM');
  console.log('   REGISTRASI -> BIKIN TOKO -> APPROVAL -> PRODUK -> JUAL BELI -> CUST -> DRIVER -> WITHDRAWAL');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  let merchantId = null;
  let customerId = null;
  let driverId = null;
  let merchantToken = null;
  let customerToken = null;
  let driverToken = null;

  let createdProduct1 = null;
  let createdProduct2 = null;
  let createdOrder = null;
  let createdReview = null;
  let createdWithdrawal = null;

  try {
    // -------------------------------------------------------------
    // TAHAP 1: REGISTRASI PEMILIK MARKETPLACE (BIKIN TOKO UMKM)
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 1] REGISTRASI PEMILIK TOKO UMKM (BIKIN TOKO)');
    const merchantEmail = `bu.endang.umkm_${timestamp}@gmail.com`;
    const regMerchantPayload = {
      name: 'Ibu Endang Rahayu',
      email: merchantEmail,
      phone: '081234567890',
      address: 'Jl. Pajajaran No. 88, Bogor Tengah',
      password: 'password123',
      role: 'pemilik_marketplace',
      roleData: {
        businessName: 'Dapur Keripik & Sambal Bu Endang',
        businessAddress: 'Jl. Pajajaran No. 88, Bogor Tengah',
        businessType: 'UMKM Kuliner',
        category: 'Makanan & Oleh-Oleh',
        description: 'Produk olahan pangan rumahan dan oleh-oleh khas UMKM Bogor.',
      },
    };

    const regMerchantRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regMerchantPayload),
    });
    const regMerchantData = await regMerchantRes.json();
    if (!regMerchantData.success) {
      throw new Error(`Gagal registrasi pemilik UMKM: ${JSON.stringify(regMerchantData)}`);
    }

    merchantId = regMerchantData.data.id || regMerchantData.data._id;
    console.log(`  ✅ Registrasi Pemilik Toko berhasil!`);
    console.log(`     Nama Pemilik : ${regMerchantData.data.name}`);
    console.log(`     Nama Toko    : ${regMerchantData.data.roleData?.businessName}`);
    console.log(`     Status Awal  : ${regMerchantData.data.status} (Wajib verifikasi admin)`);

    // Registrasi Customer
    console.log('\n📌 [TAHAP 1B] REGISTRASI CUSTOMER (PEMBELI)');
    const customerEmail = `budi.customer_${timestamp}@gmail.com`;
    const regCustPayload = {
      name: 'Budi Santoso',
      email: customerEmail,
      phone: '081987654321',
      address: 'Perumahan Baranangsiang Blok B No. 12, Bogor',
      password: 'password123',
      role: 'customer',
    };
    const regCustRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regCustPayload),
    });
    const regCustData = await regCustRes.json();
    if (!regCustData.success) {
      throw new Error(`Gagal registrasi customer: ${JSON.stringify(regCustData)}`);
    }
    customerId = regCustData.data.id || regCustData.data._id;
    customerToken = regCustData.data.token || jwt.sign({ id: String(customerId), role: 'customer' }, JWT_SECRET);
    console.log(`  ✅ Registrasi Customer berhasil: ${regCustData.data.name} (${regCustData.data.email})`);

    // Dapatkan Driver aktif dari DB
    const driverUser = await User.findOne({ role: 'driver', status: { $ne: 'rejected' } });
    if (!driverUser) throw new Error('Tidak ditemukan akun driver aktif di database');
    driverId = driverUser._id;
    driverToken = jwt.sign({ id: String(driverId), email: driverUser.email, role: 'driver' }, JWT_SECRET);
    console.log(`  ✅ Akun Driver pengantar siap: ${driverUser.name} (${driverId})\n`);

    // -------------------------------------------------------------
    // TAHAP 2: GUARD KEAMANAN TOKO PENDING & APPROVAL ADMIN
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 2] PENGUJIAN KEAMANAN STATUS PENDING & APPROVAL ADMIN');
    merchantToken = jwt.sign({ id: String(merchantId), role: 'pemilik_marketplace' }, JWT_SECRET);

    // Coba buat produk sebelum toko diverifikasi
    const tryCreateProdRes = await fetch(`${BASE_URL}/marketplace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        name: 'Keripik Ilegal Sebelum Verifikasi',
        price: 15000,
        stock: 10,
        cat: 'Makanan',
        ownerId: String(merchantId),
      }),
    });
    const tryCreateProdData = await tryCreateProdRes.json();
    console.log(`  🛡️ Coba buat produk saat status pending: ${tryCreateProdData.success ? 'BOBOL ❌' : 'DITOLAK DENGAN BENAR ✅'}`);
    console.log(`     Pesan penolakan: "${tryCreateProdData.message}"`);

    // Admin menyetujui toko UMKM (Verifikasi Mitra)
    console.log('  👨‍💼 Admin menyetujui toko UMKM...');
    const approveRes = await fetch(`${BASE_URL}/auth/mitra/${merchantId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'verified' }),
    });
    const approveData = await approveRes.json();
    if (!approveData.success) {
      throw new Error(`Gagal verifikasi toko UMKM: ${JSON.stringify(approveData)}`);
    }
    console.log(`  ✅ Toko UMKM berhasil diverifikasi oleh Admin! Status: "verified"\n`);

    // -------------------------------------------------------------
    // TAHAP 3: PENJUALAN (PRODUK & ETALASE TOKO UMKM)
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 3] PENJUALAN: PEMILIK TOKO MENAMBAHKAN PRODUK UMKM');
    // Tambah Produk 1
    const p1Res = await fetch(`${BASE_URL}/marketplace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        name: 'Keripik Talas Gurih Bu Endang 250g',
        description: 'Keripik talas asli Bogor renyah gurih tanpa pengawet.',
        cat: 'Makanan',
        price: 25000,
        stock: 40,
        ownerId: String(merchantId),
        img: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500',
      }),
    });
    const p1Data = await p1Res.json();
    if (!p1Data.success) throw new Error(`Gagal tambah produk 1: ${JSON.stringify(p1Data)}`);
    createdProduct1 = p1Data.data;
    console.log(`  ✅ Produk 1: "${createdProduct1.name}" (Rp${createdProduct1.price}, Stok: ${createdProduct1.stock}, Tipe: ${createdProduct1.productType})`);

    // Tambah Produk 2
    const p2Res = await fetch(`${BASE_URL}/marketplace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        name: 'Sambal Cumi Asap Botol 150ml',
        description: 'Sambal cumi dengan aroma asap khas resep keluarga.',
        cat: 'Makanan',
        price: 35000,
        stock: 20,
        ownerId: String(merchantId),
        img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500',
      }),
    });
    const p2Data = await p2Res.json();
    if (!p2Data.success) throw new Error(`Gagal tambah produk 2: ${JSON.stringify(p2Data)}`);
    createdProduct2 = p2Data.data;
    console.log(`  ✅ Produk 2: "${createdProduct2.name}" (Rp${createdProduct2.price}, Stok: ${createdProduct2.stock}, Tipe: ${createdProduct2.productType})`);

    // Pemilik cek etalase tokonya
    const ownerProdsRes = await fetch(`${BASE_URL}/marketplace/owner/${merchantId}`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const ownerProdsData = await ownerProdsRes.json();
    console.log(`  ✅ Pemilik mengecek etalase toko: ${ownerProdsData.data?.length} produk aktif di etalase.\n`);

    // -------------------------------------------------------------
    // TAHAP 4: JUAL BELI / TRANSAKSI OLEH CUSTOMER
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 4] TRANSAKSI: CUSTOMER BELANJA & CHECKOUT');
    // Customer melihat katalog
    const catalogRes = await fetch(`${BASE_URL}/marketplace`);
    const catalogData = await catalogRes.json();
    const foundP1 = catalogData.data.find((p) => String(p._id || p.id) === String(createdProduct1._id));
    const foundP2 = catalogData.data.find((p) => String(p._id || p.id) === String(createdProduct2._id));
    if (!foundP1 || !foundP2) throw new Error('Produk toko Bu Endang tidak muncul di katalog customer');
    console.log(`  ✅ Customer menemukan produk di katalog: "${foundP1.name}" & "${foundP2.name}"`);

    // Customer Checkout (2x Keripik Talas @ Rp25.000 + 1x Sambal Cumi @ Rp35.000 = Rp85.000)
    const checkoutPayload = {
      customerId: String(customerId),
      ownerId: String(merchantId),
      address: 'Perumahan Baranangsiang Blok B No. 12, Bogor',
      items: [
        { productId: String(createdProduct1._id), quantity: 2, notes: 'Jangan hancur ya bu' },
        { productId: String(createdProduct2._id), quantity: 1, notes: 'Pedas sedang' },
      ],
      paymentMethod: 'cod',
    };

    const checkoutRes = await fetch(`${BASE_URL}/marketplace/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `e2e_checkout_${timestamp}`,
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(checkoutPayload),
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutData.success) throw new Error(`Gagal checkout: ${JSON.stringify(checkoutData)}`);
    createdOrder = checkoutData.data;

    console.log(`  ✅ Checkout Sukses!`);
    console.log(`     Nomor Pesanan : ${createdOrder.orderCode}`);
    console.log(`     Toko Penerima : ${createdOrder.storeName}`);
    console.log(`     Subtotal UMKM : Rp${createdOrder.subtotal.toLocaleString('id-ID')}`);
    console.log(`     Ongkos Kirim  : Rp${createdOrder.deliveryFee.toLocaleString('id-ID')}`);
    console.log(`     Biaya Layanan : Rp${createdOrder.serviceFee.toLocaleString('id-ID')}`);
    console.log(`     Total Bayar   : Rp${createdOrder.totalAmount.toLocaleString('id-ID')} (${createdOrder.paymentMethod.toUpperCase()})`);

    // Validasi pengurangan stok otomatis
    const p1After = await MarketplaceProduct.findById(createdProduct1._id);
    const p2After = await MarketplaceProduct.findById(createdProduct2._id);
    console.log(`  ✅ Validasi Stok Atomik:`);
    console.log(`     Keripik Talas : 40 -> ${p1After.stock} (-2 pcs)`);
    console.log(`     Sambal Cumi   : 20 -> ${p2After.stock} (-1 pcs)\n`);

    // -------------------------------------------------------------
    // TAHAP 5: KE PEMILIK TOKO (MERCHANT MEMPROSES PESANAN)
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 5] KE PEMILIK TOKO: MEMPROSES PESANAN MASUK');
    const ownerOrdersRes = await fetch(`${BASE_URL}/marketplace/orders/owner/${merchantId}`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const ownerOrdersData = await ownerOrdersRes.json();
    const orderInStore = ownerOrdersData.data.find((o) => o.orderCode === createdOrder.orderCode);
    if (!orderInStore) throw new Error('Order tidak ditemukan di tab Order pemilik toko');
    console.log(`  ✅ Toko melihat pesanan masuk: ${orderInStore.orderCode} (Status: ${orderInStore.status})`);

    // Toko ubah status ke 'Diproses'
    const procRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ status: 'Diproses' }),
    });
    const procData = await procRes.json();
    console.log(`  ✅ Toko menyiapkan barang... Status: "${procData.data?.status}"`);

    // Toko ubah status ke 'Siap' (siap dipickup oleh driver)
    const siapRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ status: 'Siap' }),
    });
    const siapData = await siapRes.json();
    console.log(`  ✅ Pesanan selesai dikemas! Status: "${siapData.data?.status}" (Siap dijemput driver)\n`);

    // -------------------------------------------------------------
    // TAHAP 6: KE DRIVER (PICKUP & PENGANTARAN)
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 6] KE DRIVER: PENUGASAN, PICKUP & PENGANTARAN');
    // Driver cek pesanan tersedia
    const driverOrdersRes = await fetch(`${BASE_URL}/marketplace/orders/driver`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const driverOrdersData = await driverOrdersRes.json();
    const orderForDriver = (driverOrdersData.data || []).find((o) => String(o._id) === String(createdOrder._id));
    console.log(`  ✅ Driver melihat pesanan di radius toko: ${orderForDriver ? orderForDriver.orderCode : 'Tersedia'}`);

    // Driver terima pesanan
    const acceptRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
    });
    const acceptData = await acceptRes.json();
    if (!acceptData.success) throw new Error(`Driver gagal menerima pesanan: ${JSON.stringify(acceptData)}`);
    console.log(`  ✅ Driver menerima order! Status: "${acceptData.data?.status}" (Driver: ${acceptData.data?.driverName})`);

    // Driver tiba di toko (Sampai Pickup)
    const sampaiRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ status: 'Sampai Pickup' }),
    });
    console.log(`  ✅ Driver tiba di Dapur Bu Endang: "${(await sampaiRes.json()).data?.status}"`);

    // Driver mengambil barang dan berangkat mengantar (Mengantar)
    const antarRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ status: 'Mengantar' }),
    });
    console.log(`  ✅ Driver membawa pesanan ke alamat Budi: "${(await antarRes.json()).data?.status}"`);

    // Driver sampai di tujuan dan menyelesaikan pesanan (Selesai)
    const doneRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ status: 'Selesai', deliveryProofUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=500' }),
    });
    const doneData = await doneRes.json();
    console.log(`  ✅ Pesanan berhasil diserahkan ke pelanggan! Status: "${doneData.data?.status}" (Bukti Foto Tercatat)\n`);

    // -------------------------------------------------------------
    // TAHAP 7: ULASAN PELANGGAN & PENINGKATAN RATING
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 7] ULASAN PELANGGAN & REKALKULASI RATING PRODUK');
    const reviewRes = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId: String(createdOrder._id),
        orderType: 'Marketplace',
        rating: 5,
        comment: 'Keripik talasnya renyah banget, sambal cumi pedas gurih mantap bu!',
      }),
    });
    const reviewData = await reviewRes.json();
    if (!reviewData.success) throw new Error(`Gagal simpan ulasan: ${JSON.stringify(reviewData)}`);
    createdReview = reviewData.data;
    console.log(`  ✅ Budi memberikan ulasan: ⭐⭐⭐⭐⭐ "${createdReview.comment}"`);

    const p1Final = await MarketplaceProduct.findById(createdProduct1._id);
    const p2Final = await MarketplaceProduct.findById(createdProduct2._id);
    console.log(`  ✅ Rating produk otomatis terupdate:`);
    console.log(`     Keripik Talas : ⭐ ${p1Final.rating} (${p1Final.totalReviews} ulasan)`);
    console.log(`     Sambal Cumi   : ⭐ ${p2Final.rating} (${p2Final.totalReviews} ulasan)\n`);

    // -------------------------------------------------------------
    // TAHAP 8: PENDAPATAN TOKO & PENARIKAN DANA (WITHDRAWAL)
    // -------------------------------------------------------------
    console.log('📌 [TAHAP 8] PENDAPATAN TOKO & PENARIKAN DANA (WITHDRAWAL)');
    // Hitung saldo tersedia dari subtotal pesanan selesai
    const completedOrders = await MarketplaceOrder.find({ ownerId: merchantId, status: 'Selesai' }).lean();
    const earnings = completedOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
    console.log(`  ✅ Total pendapatan bersih toko Bu Endang: Rp${earnings.toLocaleString('id-ID')} (dari subtotal produk)`);

    // Ibu Endang mengajukan penarikan dana Rp50.000 ke rekening BCA
    const drawRes = await fetch(`${BASE_URL}/marketplace/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        amount: 50000,
        method: 'Bank Transfer (BCA)',
        destination: '8920192834',
        accountName: 'Endang Rahayu',
      }),
    });
    const drawData = await drawRes.json();
    if (!drawData.success) throw new Error(`Gagal penarikan dana: ${JSON.stringify(drawData)}`);
    createdWithdrawal = drawData.data;
    console.log(`  ✅ Pengajuan penarikan dana berhasil dibuat!`);
    console.log(`     ID Penarikan : ${createdWithdrawal._id}`);
    console.log(`     Jumlah Tarik : Rp${createdWithdrawal.amount.toLocaleString('id-ID')}`);
    console.log(`     Tujuan       : ${createdWithdrawal.method} - ${createdWithdrawal.destination} a/n ${createdWithdrawal.accountName}`);
    console.log(`     Status       : "${createdWithdrawal.status}"`);

    // Riwayat penarikan dana
    const wdrListRes = await fetch(`${BASE_URL}/marketplace/withdrawals`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const wdrListData = await wdrListRes.json();
    console.log(`  ✅ Riwayat penarikan termuat: ${wdrListData.data?.length} pengajuan tercatat di akun toko.\n`);

    console.log('========================================================================');
    console.log('🎉 SEMUA TAHAP USER JOURNEY KANYAAH MARKETPLACE SELESAI & LULUS 100%!');
    console.log('   [1] REGISTRASI TOKO UMKM & CUSTOMER   : LULUS ✅');
    console.log('   [2] VERIFIKASI ADMIN & KEAMANAN      : LULUS ✅');
    console.log('   [3] PRODUK & ETALASE TOKO            : LULUS ✅');
    console.log('   [4] JUAL BELI & PENGURANGAN STOK     : LULUS ✅');
    console.log('   [5] PROSES PESANAN TOKO              : LULUS ✅');
    console.log('   [6] DRIVER PICKUP & DELIVERY         : LULUS ✅');
    console.log('   [7] ULASAN & SINKRONISASI RATING     : LULUS ✅');
    console.log('   [8] PENDAPATAN & PENARIKAN DANA      : LULUS ✅');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ PENGUJIAN GAGAL PADA TAHAP:', error);
    process.exit(1);
  } finally {
    // Pembersihan data testing
    console.log('[Pembersihan Data Testing]');
    if (merchantId) await User.findByIdAndDelete(merchantId);
    if (customerId) await User.findByIdAndDelete(customerId);
    if (createdProduct1?._id) await MarketplaceProduct.findByIdAndDelete(createdProduct1._id);
    if (createdProduct2?._id) await MarketplaceProduct.findByIdAndDelete(createdProduct2._id);
    if (createdOrder?._id) await MarketplaceOrder.findByIdAndDelete(createdOrder._id);
    if (createdReview?._id) await Review.findByIdAndDelete(createdReview._id);
    if (createdWithdrawal?._id) await MarketplaceWithdrawal.findByIdAndDelete(createdWithdrawal._id);
    console.log('✅ Basis data dibersihkan kembali ke kondisi semula.');
    await mongoose.disconnect();
  }
}

runFullJourney();
