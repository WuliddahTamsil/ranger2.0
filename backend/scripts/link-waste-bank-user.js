const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const res = await db.collection('wastebanks').updateOne(
    { _id: new mongoose.Types.ObjectId('6aadbb8c5513afda4c34d9a0') },
    { $set: { userId: new mongoose.Types.ObjectId('6aadbb8c5513afda4c34d999') } }
  );
  console.log('UPDATED WASTE BANK USERID:', res.modifiedCount);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
