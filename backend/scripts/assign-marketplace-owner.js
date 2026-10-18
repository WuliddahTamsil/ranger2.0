const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.model('MarketplaceProduct', new mongoose.Schema({}, { strict: false }), 'marketplaceproducts');
  const count = await Product.countDocuments();
  console.log('Total products:', count);
  const updated = await Product.updateMany({}, {
    $set: {
      ownerId: new mongoose.Types.ObjectId('6ac8bab40244f6bb3bc61bec'),
      stock: 50
    }
  });
  console.log('Updated products to Titing Sriyanti:', updated.modifiedCount);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
