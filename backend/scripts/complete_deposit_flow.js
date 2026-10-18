require('dotenv').config();
const mongoose = require('mongoose');
const WasteDeposit = require('../models/WasteDeposit');
const { weighDeposit, confirmWeighing } = require('../controllers/wasteDepositController');
const PointWallet = require('../models/PointWallet');
const PointLedger = require('../models/PointLedger');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const depositId = '6ad094d47c5f48d3c93b847a';
  const dep = await WasteDeposit.findById(depositId);
  if (!dep) {
    console.error('Deposit not found');
    process.exit(1);
  }

  console.log(`Initial deposit status: ${dep.status}, code: ${dep.depositCode}`);

  // 1. Weigh Deposit (as Bank Sampah officer)
  const mockReqWeigh = {
    params: { id: depositId },
    body: {
      actualCategories: [
        {
          category: 'Plastik',
          subCategory: 'Botol PET Bersih',
          actualWeightKg: 10,
          pricePerKg: 2500,
        }
      ],
      weighingProofPhotos: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b'],
      weighingNotes: 'Verifikasi penimbangan riil di timbangan digital Bank Sampah Kamojang Asri. Bersih & kering.',
    },
    authUser: {
      _id: '6aadbb8c5513afda4c34d999',
      role: 'bank_sampah',
    },
    io: null,
  };

  const mockResWeigh = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('Weigh response code:', this.statusCode, 'message:', data.message);
      if (data.data) {
        console.log('Weighed categories:', data.data.categories);
        console.log('Actual total weight:', data.data.actualTotalWeightKg, 'kg');
        console.log('Final points:', data.data.finalPoint, 'Pts');
        console.log('New status:', data.data.status);
      }
      return this;
    }
  };

  await weighDeposit(mockReqWeigh, mockResWeigh);

  // 2. Customer confirms scale result -> issues points atomically
  const mockReqConfirm = {
    params: { id: depositId },
    authUser: {
      _id: dep.customerId.toString(),
      role: 'customer',
    },
    io: null,
  };

  const mockResConfirm = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('Confirm response code:', this.statusCode, 'message:', data.message);
      if (data.data) {
        console.log('Final status:', data.data.status);
      }
      return this;
    }
  };

  await confirmWeighing(mockReqConfirm, mockResConfirm);

  // 3. Inspect PointWallet & PointLedger for customer
  const wallet = await PointWallet.findOne({ userId: dep.customerId }).lean();
  console.log('\nUpdated Customer Wallet:');
  console.log(`- Balance: ${wallet?.balancePoint} Pts`);
  console.log(`- Lifetime Earned: ${wallet?.lifetimeEarned} Pts`);
  console.log(`- Total Kg Deposited: ${wallet?.totalKgDeposited} kg`);

  const ledgers = await PointLedger.find({ userId: dep.customerId }).sort({ createdAt: -1 }).limit(3).lean();
  console.log('\nLatest Ledger Entries:');
  ledgers.forEach(l => {
    console.log(`- [${l.entryType || l.type || 'CREDIT'}] ${l.points} Pts | Balance After: ${l.balanceAfter} Pts | Notes: ${l.notes || l.description}`);
  });

  await mongoose.disconnect();
  console.log('Flow completed successfully');
}

main().catch(err => {
  console.error('Error running flow:', err);
  process.exit(1);
});
