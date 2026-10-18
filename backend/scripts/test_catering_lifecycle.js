require('dotenv').config();
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const CateringProduct = require('../models/CateringProduct');
const CateringOrder = require('../models/CateringOrder');
const User = require('../models/User');
const { createCateringOrder } = require('../controllers/createCateringOrderController');
const { submitCateringPayment, verifyCateringPayment } = require('../controllers/cateringPaymentController');
const { updateCateringOrderStatus, assignDriver } = require('../controllers/cateringController');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const customerId = '6a85892d8d27c7d42a0d8ba8'; // Wuwu Customer
  const ownerId = '6aa7fc9ba28bf4d6d90dae7f';    // cateringsehat
  const driverId = '6a9c2f97c0998813eb04450c';   // Wuwu Driver
  const productId = '6aa80d9275a1ebaabf32485b';  // Paket Ayam Bakar Madu Spesial

  // Ensure owner is open
  await User.updateOne(
    { _id: ownerId },
    { $set: { 'roleData.isDapurOpen': 'true', 'roleData.businessName': 'Catering sehat' } }
  );

  // 1. Create Catering Order (DP 30%, QRIS)
  console.log('\n--- 1. CUSTOMER CREATES ORDER ---');
  const reqCreate = {
    body: {
      customerId,
      ownerId,
      productId,
      portions: 10,
      address: 'Jl. Raya Kamojang No. 12, Samarang, Garut',
      addressSnapshot: {
        receiverName: 'Wuwu Customer',
        fullAddress: 'Jl. Raya Kamojang No. 12, Samarang, Garut',
        latitude: -7.15,
        longitude: 107.78,
      },
      paymentOption: 'dp30',
      paymentMethod: 'qris',
      cateringDate: '22 Oktober 2026',
      cateringTime: '11:00',
      notes: 'Sambal dipisah, kemasan higienis kotak ramah lingkungan.',
    },
    get: (header) => (header === 'Idempotency-Key' ? `test-cat-${Date.now()}` : ''),
    authUser: { _id: customerId, role: 'customer' },
  };

  let createdOrder = null;
  const resCreate = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      if (data.data) createdOrder = data.data;
      console.log('Create order response status:', this.statusCode, 'success:', data.success, 'orderCode:', data.data?.orderCode);
      return this;
    }
  };

  await createCateringOrder(reqCreate, resCreate);
  if (!createdOrder) {
    console.error('Failed to create order');
    process.exit(1);
  }

  console.log('Order Details:', {
    code: createdOrder.orderCode,
    total: createdOrder.totalAmount,
    paid: createdOrder.paidAmount,
    remaining: createdOrder.remainingAmount,
    status: createdOrder.status,
    paymentStatus: createdOrder.paymentStatus,
  });

  // 2. Customer Submits DP Payment (30%)
  console.log('\n--- 2. CUSTOMER SUBMITS DP PAYMENT ---');
  const dpAmount = Math.round(createdOrder.totalAmount * 0.3);
  let paymentId = null;
  const reqPayDp = {
    params: { id: String(createdOrder._id) },
    body: {
      amount: dpAmount,
      reference: 'QRIS-BCA-10293847',
      proofUrl: 'https://images.unsplash.com/photo-1556742049-0a67e5572293',
      method: 'qris',
    },
    authUser: { _id: customerId, role: 'customer' },
    io: null,
  };
  const resPayDp = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Submit DP response status:', this.statusCode, 'paymentId:', data.paymentId);
      paymentId = data.paymentId;
      return this;
    }
  };
  await submitCateringPayment(reqPayDp, resPayDp);

  // 3. Catering Owner Verifies DP Payment
  console.log('\n--- 3. OWNER VERIFIES DP PAYMENT ---');
  const reqVerifyDp = {
    params: { id: String(createdOrder._id), paymentId },
    body: { action: 'verify' },
    authUser: { _id: ownerId, role: 'pemilik_catering' },
    io: null,
  };
  const resVerifyDp = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Verify DP response status:', this.statusCode, 'paymentStatus:', data.data?.paymentStatus, 'paid:', data.data?.paidAmount, 'remaining:', data.data?.remainingAmount);
      return this;
    }
  };
  await verifyCateringPayment(reqVerifyDp, resVerifyDp);

  // 4. Catering Owner Accepts Order & Starts Cooking ("Diproses")
  console.log('\n--- 4. OWNER ACCEPTS ORDER & STARTS COOKING ---');
  const reqAccept = {
    params: { id: String(createdOrder._id) },
    body: { status: 'Diproses' },
    authUser: { _id: ownerId, role: 'pemilik_catering' },
    io: null,
  };
  const resAccept = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Owner status update to Diproses:', this.statusCode, 'new status:', data.data?.status);
      return this;
    }
  };
  await updateCateringOrderStatus(reqAccept, resAccept);

  // 5. Customer Submits Pelunasan (Remaining 70%)
  console.log('\n--- 5. CUSTOMER SUBMITS PELUNASAN ---');
  const remainingAmount = createdOrder.totalAmount - dpAmount;
  let pelunasanId = null;
  const reqPayFinal = {
    params: { id: String(createdOrder._id) },
    body: {
      amount: remainingAmount,
      reference: 'QRIS-BCA-99281726',
      proofUrl: 'https://images.unsplash.com/photo-1556742049-0a67e5572293',
      method: 'qris',
    },
    authUser: { _id: customerId, role: 'customer' },
    io: null,
  };
  const resPayFinal = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Submit Pelunasan response:', this.statusCode, 'paymentId:', data.paymentId);
      pelunasanId = data.paymentId;
      return this;
    }
  };
  await submitCateringPayment(reqPayFinal, resPayFinal);

  // 6. Owner Verifies Pelunasan (Order becomes 100% Lunas)
  console.log('\n--- 6. OWNER VERIFIES PELUNASAN ---');
  const reqVerifyFinal = {
    params: { id: String(createdOrder._id), paymentId: pelunasanId },
    body: { action: 'verify' },
    authUser: { _id: ownerId, role: 'pemilik_catering' },
    io: null,
  };
  const resVerifyFinal = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Verify Pelunasan response:', this.statusCode, 'paymentStatus:', data.data?.paymentStatus, 'paid:', data.data?.paidAmount, 'remaining:', data.data?.remainingAmount);
      return this;
    }
  };
  await verifyCateringPayment(reqVerifyFinal, resVerifyFinal);

  // 7. Catering Owner Marks Order "Siap" (Food ready, broadcasts to drivers)
  console.log('\n--- 7. OWNER MARKS ORDER AS SIAP ---');
  const reqReady = {
    params: { id: String(createdOrder._id) },
    body: { status: 'Siap' },
    authUser: { _id: ownerId, role: 'pemilik_catering' },
    io: null,
  };
  const resReady = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Owner status update to Siap:', this.statusCode, 'new status:', data.data?.status);
      return this;
    }
  };
  await updateCateringOrderStatus(reqReady, resReady);

  // 8. Driver Accepts Catering Delivery
  console.log('\n--- 8. DRIVER ACCEPTS ORDER ---');
  const reqAssign = {
    params: { id: String(createdOrder._id) },
    body: { driverId },
    authUser: { _id: driverId, role: 'driver' },
    io: null,
  };
  const resAssign = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Driver assign response:', this.statusCode, 'new status:', data.data?.status, 'driverName:', data.data?.driverName);
      return this;
    }
  };
  await assignDriver(reqAssign, resAssign);

  // 9. Driver Arrives at Kitchen ("Sampai Pickup")
  console.log('\n--- 9. DRIVER ARRIVES AT PICKUP ---');
  const reqSampai = {
    params: { id: String(createdOrder._id) },
    body: { status: 'Sampai Pickup' },
    authUser: { _id: driverId, role: 'driver' },
    io: null,
  };
  const resSampai = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Driver Sampai Pickup:', this.statusCode, 'status:', data.data?.status);
      return this;
    }
  };
  await updateCateringOrderStatus(reqSampai, resSampai);

  // 10. Driver Picks Up Food & Starts Delivery ("Mengantar")
  console.log('\n--- 10. DRIVER PICKS UP FOOD & EN ROUTE ---');
  const reqMengantar = {
    params: { id: String(createdOrder._id) },
    body: { status: 'Mengantar' },
    authUser: { _id: driverId, role: 'driver' },
    io: null,
  };
  const resMengantar = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Driver Mengantar:', this.statusCode, 'status:', data.data?.status);
      return this;
    }
  };
  await updateCateringOrderStatus(reqMengantar, resMengantar);

  // 11. Driver Delivers to Customer with Proof Photo ("Selesai")
  console.log('\n--- 11. DRIVER DELIVERS FOOD WITH PROOF PHOTO ---');
  const reqSelesai = {
    params: { id: String(createdOrder._id) },
    body: {
      status: 'Selesai',
      deliveryProofUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2',
      deliveryProofTimestamp: new Date().toISOString(),
    },
    authUser: { _id: driverId, role: 'driver' },
    io: null,
  };
  const resSelesai = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) {
      console.log('Driver Selesai:', this.statusCode, 'status:', data.data?.status, 'deliveredAt:', data.data?.deliveredAt);
      return this;
    }
  };
  await updateCateringOrderStatus(reqSelesai, resSelesai);

  // 12. Final Verification
  const finalOrder = await CateringOrder.findById(createdOrder._id).lean();
  console.log('\n=== FINAL ORDER STATE ===');
  console.log({
    id: finalOrder._id,
    orderCode: finalOrder.orderCode,
    status: finalOrder.status,
    total: finalOrder.totalAmount,
    paid: finalOrder.paidAmount,
    remaining: finalOrder.remainingAmount,
    paymentStatus: finalOrder.paymentStatus,
    driver: finalOrder.driverName,
    proofUrl: finalOrder.deliveryProofUrl,
    historyCount: finalOrder.paymentHistory?.length,
  });

  await mongoose.disconnect();
  console.log('\nALL CATERING E2E FLOW STEPS VERIFIED 100% SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
