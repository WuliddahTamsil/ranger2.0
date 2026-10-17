const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../backend/.env' });

async function activate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Banner = mongoose.connection.collection('homeherobanners');
  const res = await Banner.updateMany(
    { title: { $in: ['260126 Proper PGE 2025', 'PGE Kamojang Bahasa Final'] } },
    {
      $set: {
        isActive: true,
        overlayEnabled: false,
        overlayOpacity: 0,
        overlayColor: 'transparent',
      },
    }
  );
  console.log('Update result:', res);
  const all = await Banner.find({}).toArray();
  console.log('Active banners now:', all.filter(b => b.isActive).map(b => ({ title: b.title, isActive: b.isActive })));
  await mongoose.disconnect();
}

activate().catch(console.error);
