require('../backend/node_modules/dotenv').config({ path: '../backend/.env' });
const mongoose = require('../backend/node_modules/mongoose');
const User = require('../backend/models/User');
const CateringProduct = require('../backend/models/CateringProduct');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const customers = await User.find({ role: 'customer' }).select('name phone email role').lean();
  const caterings = await User.find({ role: 'pemilik_catering' }).select('name phone email role roleData').lean();
  const products = await CateringProduct.find({ isActive: true }).select('name price stock ownerId').lean();
  console.log('Customers count:', customers.length, 'sample:', customers[0]);
  console.log('Caterings count:', caterings.length, 'sample:', caterings[0]);
  console.log('Active Products count:', products.length, 'sample:', products[0]);
  process.exit(0);
}
main().catch(console.error);
