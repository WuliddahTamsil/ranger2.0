const mongoose = require('mongoose');
const WasteDeposit = require('../models/WasteDeposit');
const PointWallet = require('../models/PointWallet');
const PointLedger = require('../models/PointLedger');
const wasteDepositService = require('../services/wasteDepositService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ranger');
  console.log('Connected to DB');

  const dep = await WasteDeposit.findOne({ depositNumber: 'RNG-RCY-54484774' });
  if (dep) {
    console.log('Found deposit RNG-RCY-54484774, status:', dep.status);
    if (dep.status === 'ACCEPTED' || dep.status === 'DRIVER_ASSIGNED' || dep.status === 'AT_BANK') {
      console.log('Weighing deposit...');
      const weighed = await wasteDepositService.weighDeposit({
        depositId: dep._id,
        bankSampahUserId: '6aadbb8c5513afda4c34d999',
        items: [
          {
            category: 'PLASTIC',
            name: 'Botol Plastik PET Bersih',
            actualWeightKg: 10,
            ratePerKg: 2500,
            subtotalPoints: 25000,
          }
        ],
        notes: 'Penimbangan verifikasi di Bank Sampah Induk Kamojang Asri'
      });
      console.log('Weighed successfully, status:', weighed.status);

      console.log('Confirming deposit to issue points...');
      const confirmed = await wasteDepositService.confirmWeighing({
        depositId: dep._id,
        customerId: dep.userId.toString(),
        confirmed: true
      });
      console.log('Confirmed successfully, final status:', confirmed.status, 'points issued:', confirmed.pointsIssued);
    }
  } else {
    console.log('Deposit RNG-RCY-54484774 not found');
  }

  const wallet = await PointWallet.findOne({ userId: '6a85892d8d27c7d42a0d8ba8' });
  console.log('Customer Wallet:', wallet ? { balance: wallet.balance, totalEarned: wallet.totalEarned, tier: wallet.tier } : 'No wallet');

  const ledgers = await PointLedger.find({ userId: '6a85892d8d27c7d42a0d8ba8' }).sort({ createdAt: -1 }).limit(3);
  console.log('Customer Ledgers:', ledgers.map(l => ({ type: l.transactionType, amount: l.points, balanceAfter: l.balanceAfter, desc: l.description })));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
