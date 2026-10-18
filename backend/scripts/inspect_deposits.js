require('dotenv').config();
const mongoose = require('mongoose');
const WasteDeposit = require('../models/WasteDeposit');
const PointWallet = require('../models/PointWallet');
const PointLedger = require('../models/PointLedger');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const deps = await WasteDeposit.find({}).sort({ createdAt: -1 }).limit(5).lean();
  console.log('Recent Deposits:');
  deps.forEach(d => {
    console.log(`- ID: ${d._id}, Code: ${d.depositCode}, Status: ${d.status}, Customer: ${d.customerId}, Bank: ${d.bankSampahId}, FinalPoints: ${d.finalPoint}`);
  });

  const wallet = await PointWallet.findOne({ userId: '6a85892d8d27c7d42a0d8ba8' }).lean();
  console.log('\nWuwu Customer Wallet:', wallet);

  const ledgers = await PointLedger.find({ userId: '6a85892d8d27c7d42a0d8ba8' }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\nWuwu Customer Ledgers count:', ledgers.length);
  ledgers.forEach(l => {
    console.log(`  * ${l.transactionType} | Pts: ${l.points} | BalAfter: ${l.balanceAfter} | Desc: ${l.description}`);
  });

  await mongoose.disconnect();
  console.log('Disconnected');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
