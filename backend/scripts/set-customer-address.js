const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const addr = [{
    id: 'addr_kamojang_1',
    label: 'Rumah',
    receiverName: 'Wuwu Customer',
    phoneNumber: '081234567895',
    street: 'Jl. Raya Kamojang No. 12',
    district: 'Samarang',
    city: 'Garut',
    province: 'Jawa Barat',
    fullAddress: 'Jl. Raya Kamojang No. 12, Samarang, Garut',
    isMain: true
  }];
  await User.findByIdAndUpdate('6a85892d8d27c7d42a0d8ba8', {
    $set: {
      address: 'Jl. Raya Kamojang No. 12, Samarang, Garut',
      'roleData.customerAddresses': JSON.stringify(addr)
    }
  });
  console.log('Successfully updated Wuwu Customer address in DB');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
