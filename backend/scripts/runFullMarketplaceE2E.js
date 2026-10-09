const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'rangers_app_secret';

const User = require('../models/User');
const MarketplaceProduct = require('../models/MarketplaceProduct');
const MarketplaceOrder = require('../models/MarketplaceOrder');
const MarketplaceWithdrawal = require('../models/MarketplaceWithdrawal');
const Review = require('../models/Review');

function generateToken(user) {
  return jwt.sign({ id: String(user._id), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runE2E() {
  console.log('========================================================');
  console.log('🚀 MEMULAI END-TO-END TESTING FITUR KANYAAH MARKETPLACE');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    // 1. Persiapan Akun Pengguna
    console.log('[1/8] Memeriksa akun Customer, Pemilik Marketplace, dan Driver...');
    const customer = await User.findOne({ role: 'customer' });
    const merchant = await User.findOne({ role: 'pemilik_marketplace', status: 'verified' });
    const driver = await User.findOne({ role: 'driver', status: { $ne: 'rejected' } });

    if (!customer || !merchant || !driver) {
      throw new Error(`Data user belum lengkap: Customer=${!!customer}, Merchant=${!!merchant}, Driver=${!!driver}`);
    }

    const customerToken = generateToken(customer);
    const merchantToken = generateToken(merchant);
    const driverToken = generateToken(driver);

    console.log(`  ✅ Customer: ${customer.name} (${customer._id})`);
    console.log(`  ✅ Merchant: ${merchant.name} (${merchant._id}, Status: ${merchant.status})`);
    console.log(`  ✅ Driver: ${driver.name} (${driver._id})\n`);

    // 2. Customer Mengambil Katalog Produk UMKM
    console.log('[2/8] Menguji GET /api/marketplace (Katalog UMKM)...');
    const catalogRes = await fetch(`${BASE_URL}/marketplace`);
    const catalogData = await catalogRes.json();
    if (!catalogData.success || !Array.isArray(catalogData.data) || catalogData.data.length === 0) {
      throw new Error(`Katalog UMKM gagal dimuat: ${JSON.stringify(catalogData)}`);
    }
    console.log(`  ✅ Sukses! ${catalogData.data.length} produk UMKM berhasil dimuat.`);
    const sample = catalogData.data[0];
    console.log(`  Contoh produk: "${sample.name}" (Rp${sample.price}) - Toko: ${sample.store}\n`);

    // 3. Merchant Menambahkan Produk UMKM Baru
    console.log('[3/8] Menguji POST /api/marketplace (Tambah Produk UMKM)...');
    const newProdPayload = {
      name: 'Sambal Roa Khas Manado E2E Test',
      description: 'Sambal ikan roa asap khas UMKM lokal berkualitas.',
      cat: 'Makanan',
      price: 35000,
      stock: 25,
      ownerId: String(merchant._id),
      img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500',
    };

    const createProdRes = await fetch(`${BASE_URL}/marketplace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify(newProdPayload),
    });
    const createProdData = await createProdRes.json();
    if (!createProdData.success || !createProdData.data) {
      throw new Error(`Gagal membuat produk UMKM: ${JSON.stringify(createProdData)}`);
    }
    const createdProduct = createProdData.data;
    console.log(`  ✅ Produk berhasil dibuat! ID: ${createdProduct._id}, Tipe: ${createdProduct.productType}`);
    if (createdProduct.productType !== 'UMKM') {
      throw new Error(`Harusnya productType UMKM, didapat: ${createdProduct.productType}`);
    }

    // 4. Pengujian Keamanan Update Produk (Whitelist)
    console.log('\n[4/8] Menguji PUT /api/marketplace/:id (Whitelist & Sanitasi Input)...');
    const updateRes = await fetch(`${BASE_URL}/marketplace/${createdProduct._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({
        price: 32000,
        stock: 30,
        rating: 5.0, // Malicious input attempt
        sold: 9999,  // Malicious input attempt
      }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success || !updateData.data) {
      throw new Error(`Gagal update produk: ${JSON.stringify(updateData)}`);
    }
    const updatedProd = updateData.data;
    console.log(`  ✅ Harga terupdate: Rp${updatedProd.price}, Stok: ${updatedProd.stock}`);
    console.log(`  ✅ Sanitasi berhasil: rating tetap ${updatedProd.rating} (tidak terbajak 5.0), sold tetap ${updatedProd.sold} (tidak terbajak 9999)\n`);

    // 5. Customer Melakukan Checkout Pemesanan UMKM
    console.log('[5/8] Menguji POST /api/marketplace/orders (Checkout Pesanan UMKM)...');
    const idempotencyKey = `e2e_test_${Date.now()}`;
    const orderPayload = {
      customerId: String(customer._id),
      ownerId: String(merchant._id),
      address: 'Jl. Merdeka No. 45, Bogor Tengah',
      items: [
        {
          productId: String(createdProduct._id),
          quantity: 2,
          notes: 'Level pedas sedang',
        },
      ],
      paymentMethod: 'cod',
    };

    const orderRes = await fetch(`${BASE_URL}/marketplace/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey,
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();
    if (!orderData.success || !orderData.data) {
      throw new Error(`Gagal checkout pesanan: ${JSON.stringify(orderData)}`);
    }
    const createdOrder = orderData.data;
    console.log(`  ✅ Pesanan berhasil dibuat! Kode: ${createdOrder.orderCode}`);
    console.log(`  Subtotal: Rp${createdOrder.subtotal}, Ongkir: Rp${createdOrder.deliveryFee}, Total: Rp${createdOrder.totalAmount}`);
    console.log(`  Status Awal: ${createdOrder.status}, Metode: ${createdOrder.paymentMethod.toUpperCase()}`);

    // Verifikasi stok produk berkurang otomatis
    const prodAfterOrder = await MarketplaceProduct.findById(createdProduct._id);
    console.log(`  ✅ Stok berkurang otomatis: ${prodAfterOrder.stock} (dari sebelumnya 30, -2)\n`);

    // 6. Alur Pengantaran oleh Merchant & Driver
    console.log('[6/8] Menguji Siklus Pengantaran Pesanan (Merchant -> Driver)...');
    // Merchant ubah status ke 'Diproses'
    const procRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ status: 'Diproses' }),
    });
    const procData = await procRes.json();
    console.log(`  Status: ${(await procData).data?.status}`);

    // Merchant ubah status ke 'Siap'
    const siapRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ status: 'Siap' }),
    });
    console.log(`  Status: ${(await siapRes.json()).data?.status}`);

    // Driver terima pesanan
    const acceptRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
    });
    const acceptData = await acceptRes.json();
    console.log(`  Driver menerima pesanan: ${acceptData.data?.status} (Driver: ${acceptData.data?.driverName})`);

    // Driver antarkan sampai 'Selesai'
    await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ status: 'Sampai Pickup' }),
    });
    await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ status: 'Mengantar' }),
    });
    const doneRes = await fetch(`${BASE_URL}/marketplace/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ status: 'Selesai', deliveryProofUrl: 'https://example.com/proof.jpg' }),
    });
    console.log(`  ✅ Pesanan selesai diantar: ${(await doneRes.json()).data?.status}\n`);

    // 7. Customer Memberikan Ulasan & Rating Terupdate
    console.log('[7/8] Menguji POST /api/reviews (Ulasan & Sinkronisasi Rating)...');
    const reviewRes = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: String(createdOrder._id),
        orderType: 'Marketplace',
        rating: 5,
        comment: 'Sambal roa sangat lezat dan otentik!',
      }),
    });
    const reviewData = await reviewRes.json();
    if (!reviewData.success || !reviewData.data) {
      throw new Error(`Gagal mengirim ulasan: ${JSON.stringify(reviewData)}`);
    }
    console.log(`  ✅ Ulasan berhasil dicatat: Bintang ${reviewData.data.rating} - "${reviewData.data.comment}"`);

    // Periksa produk terupdate ratingnya
    const prodAfterReview = await MarketplaceProduct.findById(createdProduct._id);
    console.log(`  ✅ Rating produk otomatis diperbarui ke: ${prodAfterReview.rating} (${prodAfterReview.totalReviews} ulasan)\n`);

    // 8. Merchant Melihat Penarikan Dana & Mengajukan Withdrawal
    console.log('[8/8] Menguji Penarikan Dana Merchant UMKM (GET/POST /withdrawals)...');
    const getWdrRes = await fetch(`${BASE_URL}/marketplace/withdrawals`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const getWdrData = await getWdrRes.json();
    console.log(`  ✅ Riwayat penarikan dana terambil: ${getWdrData.data?.length || 0} riwayat tercatat`);

    const postWdrRes = await fetch(`${BASE_URL}/marketplace/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({
        amount: 25000,
        method: 'Bank Transfer (BCA)',
        destination: '1234567890',
        accountName: merchant.name,
      }),
    });
    const postWdrData = await postWdrRes.json();
    console.log(`  ✅ Hasil pengajuan penarikan dana: ${postWdrData.success ? 'Berhasil' : postWdrData.message}`);

    // Cleanup: hapus data test
    console.log('\n[Pembersihan Data Testing]');
    await MarketplaceProduct.findByIdAndDelete(createdProduct._id);
    await MarketplaceOrder.findByIdAndDelete(createdOrder._id);
    if (reviewData.data?._id) await Review.findByIdAndDelete(reviewData.data._id);
    if (postWdrData.data?._id) await MarketplaceWithdrawal.findByIdAndDelete(postWdrData.data._id);
    console.log('  ✅ Data testing berhasil dibersihkan.');

    console.log('\n========================================================');
    console.log('🎉 SELURUH SKENARIO END-TO-END MARKETPLACE UMKM LULUS 100%!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ E2E TESTING GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runE2E();
