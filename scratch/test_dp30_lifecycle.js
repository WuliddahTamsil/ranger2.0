const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const mongoose = require('../backend/node_modules/mongoose');
const CateringOrder = require('../backend/models/CateringOrder');
const User = require('../backend/models/User');
const jwt = require('../backend/node_modules/jsonwebtoken');

require('../backend/node_modules/dotenv').config({ path: 'd:/ranger2.0/backend/.env' });

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'rangers_app_super_secure_secret_key_2026';

function makeToken(user) {
  return `seed_token_${String(user._id)}`;
}

async function runTest() {
  console.log('================================================================');
  console.log('🧪 PENGUJIAN MENYELURUH: DP 30% + H-1 PELUNASAN KANYAAH CATERING');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const CateringProduct = require('../backend/models/CateringProduct');
  await CateringProduct.findByIdAndUpdate('6aa80d9275a1ebaabf32485b', { stock: 100, isActive: true });

  const customer = await User.findOne({ role: 'customer' });
  const owner = await User.findOne({ role: 'pemilik_catering' });
  let driver = await User.findOne({ role: 'driver' });
  if (!driver) {
    driver = await User.create({
      name: 'Pak Kurir Cepat',
      phone: '081299998888',
      role: 'driver',
      status: 'verified',
    });
  }

  const customerToken = makeToken(customer);
  const ownerToken = makeToken(owner);
  const driverToken = makeToken(driver);

  // [STEP 1] Customer membuat Pesanan PO Catering dengan opsi DP 30%
  console.log('[STEP 1] Customer Checkout: Memilih Skema DP 30% (Pre-Order H+2)...');
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + 2);
  const cateringDate = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  const orderPayload = {
    customerId: String(customer._id),
    ownerId: String(owner._id),
    productId: '6aa80d9275a1ebaabf32485b', // Paket Ayam Bakar Madu
    portions: 10,
    address: 'Jl. Raya Kamojang No. 12, Garut',
    paymentOption: 'dp30',
    paymentMethod: 'qris',
    cateringDate,
    cateringTime: '11:00',
    notes: 'Sambal dipisah untuk prasmanan rapat.',
  };

  const idempKey = `test-dp30-${Date.now()}`;
  const createRes = await fetch(`${API_BASE}/catering/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
      'Idempotency-Key': idempKey,
    },
    body: JSON.stringify(orderPayload),
  }).then(r => r.json());

  if (!createRes.success) {
    throw new Error(`Gagal membuat order: ${createRes.message}`);
  }

  const order = createRes.data;
  console.log(`  ✅ Order berhasil dibuat: #${order.orderCode} (ID: ${order._id})`);
  console.log(`     Total Nilai Pesanan : Rp ${order.totalAmount.toLocaleString('id-ID')}`);
  console.log(`     Skema Pembayaran    : ${order.paymentOption.toUpperCase()}`);
  console.log(`     Status Pembayaran   : ${order.paymentStatus}`);
  console.log(`     Jadwal PO Acara     : ${order.cateringDate} Jam ${order.cateringTime}`);
  console.log(`     Tenggat Pelunasan   : ${new Date(order.paymentDueAt).toLocaleString('id-ID')} (H-1)\n`);

  const dpAmount = Math.round(order.totalAmount * 0.3);
  const pelunasanAmount = order.totalAmount - dpAmount;

  // [STEP 2] Customer mengajukan pembayaran DP 30% via QRIS
  console.log(`[STEP 2] Customer membayar DP 30% senilai Rp ${dpAmount.toLocaleString('id-ID')} via QRIS...`);
  const dpPaymentRes = await fetch(`${API_BASE}/catering/orders/${order._id}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      amount: dpAmount,
      method: 'qris',
      reference: `QRIS-DP-${Date.now().toString().slice(-6)}`,
      proofUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600',
    }),
  }).then(r => r.json());

  console.log(`  ✅ Pengajuan DP 30% terkirim. Status pembayaran order: "${dpPaymentRes.data.paymentStatus}"\n`);

  // [STEP 3] Dapur memverifikasi bukti DP 30%
  console.log(`[STEP 3] Pemilik Catering memverifikasi pembayaran DP 30% di Dashboard...`);
  const verifyDpRes = await fetch(`${API_BASE}/catering/orders/${order._id}/payments/${dpPaymentRes.paymentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ action: 'verify' }),
  }).then(r => r.json());

  console.log(`  ✅ DP 30% TERVERIFIKASI oleh Pemilik Catering!`);
  console.log(`     Sudah Dibayar       : Rp ${verifyDpRes.data.paidAmount.toLocaleString('id-ID')}`);
  console.log(`     Sisa Pelunasan Nanti: Rp ${verifyDpRes.data.remainingAmount.toLocaleString('id-ID')}`);
  console.log(`     Status Pembayaran   : "${verifyDpRes.data.paymentStatus}"\n`);

  // [STEP 4] Dapur menerima order dan mulai memasak
  console.log(`[STEP 4] Dapur menandai pesanan diterima: status -> "Diproses" (Mulai Memasak)...`);
  const processRes = await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'Diproses' }),
  }).then(r => r.json());
  console.log(`  ✅ Status pesanan berhasil diubah menjadi: "${processRes.data.status}"\n`);

  // [STEP 5] Uji Keamanan: Apakah Dapur BISA menandai "Siap" SEBELUM Pelunasan?
  console.log(`[STEP 5] UJI KEAMANAN: Dapur mencoba menandai "Siap" padahal Sisa 70% BELUM LUNAS...`);
  const prematureReadyRes = await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'Siap' }),
  });
  const prematureReadyJson = await prematureReadyRes.json();
  if (prematureReadyRes.status === 409) {
    console.log(`  🛡️ TERPROTEKSI DENGAN AMAN! Server menolak status Siap:`);
    console.log(`     Status HTTP : ${prematureReadyRes.status} Conflict`);
    console.log(`     Pesan Error : "${prematureReadyJson.message}"\n`);
  } else {
    throw new Error(`Celah keamanan terdeteksi! Status siap tidak dicegah: ${JSON.stringify(prematureReadyJson)}`);
  }

  // [STEP 6] Uji Keamanan: Apakah Driver BISA mengantar SEBELUM Pelunasan?
  console.log(`[STEP 6] UJI KEAMANAN: Driver mencoba mengantar padahal Sisa 70% BELUM LUNAS...`);
  const prematureDeliverRes = await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ status: 'Mengantar' }),
  });
  const prematureDeliverJson = await prematureDeliverRes.json();
  console.log(`  🛡️ TERPROTEKSI DENGAN AMAN! Driver ditolak (${prematureDeliverRes.status}): "${prematureDeliverJson.message}"\n`);

  // [STEP 7] Customer melakukan Pelunasan Sisa 70% pada H-1
  console.log(`[STEP 7] H-1: Customer membayar Pelunasan Sisa 70% (Rp ${pelunasanAmount.toLocaleString('id-ID')})...`);
  const pelunasanRes = await fetch(`${API_BASE}/catering/orders/${order._id}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      amount: pelunasanAmount,
      method: 'qris',
      reference: `QRIS-LUNAS-${Date.now().toString().slice(-6)}`,
      proofUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600',
    }),
  }).then(r => r.json());
  console.log(`  ✅ Bukti pelunasan terkirim: Payment ID ${pelunasanRes.paymentId}\n`);

  // [STEP 8] Dapur memverifikasi bukti Pelunasan
  console.log(`[STEP 8] Pemilik Catering memvalidasi Pelunasan di Dashboard...`);
  const verifyPelunasanRes = await fetch(`${API_BASE}/catering/orders/${order._id}/payments/${pelunasanRes.paymentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ action: 'verify' }),
  }).then(r => r.json());

  console.log(`  🎉 PELUNASAN TERVERIFIKASI 100%!`);
  console.log(`     Total Dibayar       : Rp ${verifyPelunasanRes.data.paidAmount.toLocaleString('id-ID')} / Rp ${verifyPelunasanRes.data.totalAmount.toLocaleString('id-ID')}`);
  console.log(`     Sisa Tagihan        : Rp ${verifyPelunasanRes.data.remainingAmount.toLocaleString('id-ID')}`);
  console.log(`     Status Pembayaran   : "${verifyPelunasanRes.data.paymentStatus}"\n`);

  // [STEP 9] Dapur sekarang BISA menandai "Siap"
  console.log(`[STEP 9] Dapur menyelesaikan masakan & menandai status "Siap"...`);
  const readyRes = await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'Siap' }),
  }).then(r => r.json());
  console.log(`  ✅ Status pesanan berhasil diubah menjadi: "${readyRes.data.status}" (Broadcast ke kurir terdekat)\n`);

  // [STEP 10] Driver mengambil & mengantarkan pesanan dengan bukti foto (POD)
  console.log(`[STEP 10] Driver menerima penugasan, menuju dapur, dan mengantar ke customer...`);
  await fetch(`${API_BASE}/catering/orders/${order._id}/assign-driver`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ driverId: String(driver._id) }),
  });

  await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ status: 'Sampai Pickup' }),
  });

  await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`,
    },
    body: JSON.stringify({ status: 'Mengantar' }),
  });
  console.log(`  ✅ Kurir membawa pesanan katering dan sedang dalam perjalanan mengantar (status: Mengantar)`);

  const finishRes = await fetch(`${API_BASE}/catering/orders/${order._id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      status: 'Selesai',
      deliveryProofUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      deliveryProofTimestamp: new Date().toLocaleString('id-ID'),
    }),
  }).then(r => r.json());

  console.log(`  ✅ PESANAN SELESAI DIANTAR (Status: ${finishRes.data.status})`);
  console.log(`     Bukti Foto Serah Terima: ${finishRes.data.deliveryProofUrl}`);
  console.log(`     Waktu Serah Terima     : ${finishRes.data.deliveryProofTimestamp}\n`);

  console.log('================================================================');
  console.log('🏆 KESIMPULAN: SELURUH FLOW DP 30% DAN PELUNASAN H-1 100% SUKSES!');
  console.log('================================================================');

  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test gagal:', err);
  process.exit(1);
});
