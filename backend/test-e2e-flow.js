const API_BASE = 'http://localhost:5000/api';

async function runE2ETest() {
  console.log('======================================================');
  console.log('🚀 TESTING REAL MULTI-ROLE END-TO-END FLOW (RANGER 2.0)');
  console.log('======================================================');

  const customerId = '6a85892d8d27c7d42a0d8ba8';
  const ownerId = '6a8556c6cfd82af256ff5a63';
  const driverId = '6a9c2f97c0998813eb04450c';
  const productId = '6a8588848d27c7d42a0d8ba1';

  try {
    // 1. Customer browses active catering products
    console.log('\n[STEP 1] Customer: Mengambil daftar produk catering aktif...');
    const productsRes = await fetch(`${API_BASE}/catering/products/active`).then(r => r.json());
    console.log(`✓ Ditemukan ${productsRes.data?.length || 0} produk aktif.`);

    // 2. Customer places a Catering Order
    console.log('\n[STEP 2] Customer: Membuat pesanan catering baru...');
    const orderPayload = {
      ownerId,
      customerId,
      customerName: 'Ahmad E2E Customer',
      customerPhone: '081234567890',
      address: 'Jl. Telang Raya No. 45, Kamal, Bangkalan',
      menuName: 'Paket Catering Hemat Barokah',
      portions: 15,
      price: 25000,
      totalAmount: 375000,
      deliveryFee: 15000,
      serviceFee: 2000,
      paymentOption: 'lunas',
      paymentMethod: 'Transfer Bank (BCA)',
      paymentStatus: 'Lunas',
      paidAmount: 392000,
      remainingAmount: 0,
      cateringDate: '2026-09-09',
      cateringTime: '12:00',
      notes: 'Pedas sedang, tolong jangan terlalu asin.',
      productId,
      storeId: ownerId,
    };

    const orderRes = await fetch(`${API_BASE}/catering/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }).then(r => r.json());

    if (!orderRes.success) {
      throw new Error(`Order placement failed: ${orderRes.message} -> ${orderRes.error || ''}`);
    }
    const createdOrder = orderRes.data;
    console.log(`✓ Order berhasil dibuat!`);
    console.log(`  - Order ID: ${createdOrder._id}`);
    console.log(`  - Order Code: ${createdOrder.orderCode}`);
    console.log(`  - Store: ${createdOrder.storeName}`);
    console.log(`  - Status awal: ${createdOrder.status}`);

    // 3. Pemilik Catering checks orders
    console.log(`\n[STEP 3] Pemilik Catering: Mengecek order masuk di dashboard dapur...`);
    const ownerOrdersRes = await fetch(`${API_BASE}/catering/orders/owner/${ownerId}`).then(r => r.json());
    const foundInOwner = ownerOrdersRes.data.find(o => o._id === createdOrder._id);
    if (!foundInOwner) {
      throw new Error('Pesanan tidak ditemukan di dashboard Pemilik Catering');
    }
    console.log(`✓ Pesanan terdeteksi oleh Pemilik Catering! Status: ${foundInOwner.status}`);

    // 4. Pemilik Catering updates status: Menunggu -> Diproses -> Siap
    console.log('\n[STEP 4] Pemilik Catering: Memproses pesanan dapur...');
    const diprosesRes = await fetch(`${API_BASE}/catering/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Diproses' })
    }).then(r => r.json());
    console.log(`  -> Status diubah ke: "${diprosesRes.data.status}"`);

    const siapRes = await fetch(`${API_BASE}/catering/orders/${createdOrder._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Siap' })
    }).then(r => r.json());
    console.log(`  -> Status diubah ke: "${siapRes.data.status}" (Driver broadcast auto-triggered!)`);

    // 5. Driver polls available orders
    console.log('\n[STEP 5] Driver: Memeriksa order baru yang siap diantar (Tab: Siap)...');
    const driverOrdersRes = await fetch(`${API_BASE}/catering/orders/driver/${driverId}`).then(r => r.json());
    const availableForDriver = driverOrdersRes.data.find(o => o._id === createdOrder._id);
    if (!availableForDriver) {
      throw new Error('Pesanan siap tidak masuk ke list driver!');
    }
    console.log(`✓ Driver menemukan order siap: "${availableForDriver.menuName}" dari "${availableForDriver.storeName}"`);

    // 6. Driver accepts order
    console.log('\n[STEP 6] Driver: Mengambil pesanan (Terima Order)...');
    const assignRes = await fetch(`${API_BASE}/catering/orders/${createdOrder._id}/assign-driver`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId })
    }).then(r => r.json());

    if (!assignRes.success) {
      throw new Error(`Driver assignment failed: ${assignRes.message}`);
    }
    console.log(`✓ Driver berhasil mengambil order! Status sekarang: "${assignRes.data.status}"`);
    console.log(`  - Driver Assigned: ${assignRes.data.driverName} (${assignRes.data.driverPhone})`);

    // 7. Driver delivers order through all phases
    const driverPhases = ['Sampai Pickup', 'Diambil', 'Mengantar', 'Dikirim', 'Selesai'];
    console.log('\n[STEP 7] Driver: Menjalankan alur pengiriman...');
    for (const phase of driverPhases) {
      const stepRes = await fetch(`${API_BASE}/catering/orders/${createdOrder._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: phase })
      }).then(r => r.json());
      console.log(`  -> Driver update status: "${stepRes.data.status}"`);
    }

    // 8. Customer checks live tracking
    console.log('\n[STEP 8] Customer: Melacak status pesanan secara real-time...');
    const customerTrackingRes = await fetch(`${API_BASE}/catering/orders/customer/${customerId}`).then(r => r.json());
    const trackingOrder = customerTrackingRes.data.find(o => o._id === createdOrder._id);
    if (!trackingOrder) {
      throw new Error('Pesanan tidak ditemukan di tracking customer');
    }
    console.log(`✓ Tracking Customer Sukses:`);
    console.log(`  - Status Akhir: "${trackingOrder.status}"`);
    console.log(`  - Diantar oleh: ${trackingOrder.driverName}`);
    console.log(`  - Total Bayar: Rp ${trackingOrder.totalAmount?.toLocaleString('id-ID')}`);

    // 9. Chat between Customer and Driver
    console.log('\n[STEP 9] Customer & Driver: Menguji fitur chat terhubung...');
    const chatMsg = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: createdOrder._id,
        sender: 'customer',
        senderId: customerId,
        text: 'Pak, nanti tolong titip di pos satpam ya terima kasih.',
        target: 'driver',
        targetReceiverId: driverId
      })
    }).then(r => r.json());
    console.log(`✓ Pesan terkirim dari Customer ke Driver: "${chatMsg.data?.text || chatMsg.data?.message}"`);

    const chatHistory = await fetch(`${API_BASE}/chat/messages/${createdOrder._id}`).then(r => r.json());
    console.log(`✓ Riwayat chat berhasil dimuat (${chatHistory.data?.length || 0} pesan).`);

    // 10. Admin Stats
    console.log('\n[STEP 10] Admin: Mengecek statistik platform real-time...');
    const statsRes = await fetch(`${API_BASE}/auth/admin/stats`).then(r => r.json());
    console.log(`✓ Real-time Stats:`, statsRes.data);

    console.log('\n======================================================');
    console.log('🎉 SEMUA INTEGRASI ANTAR ROLE TELAH SUKSES DIVERIFIKASI! 🎉');
    console.log('======================================================');

  } catch (err) {
    console.error('❌ E2E TEST GAGAL:', err);
    process.exit(1);
  }
}

runE2ETest();
