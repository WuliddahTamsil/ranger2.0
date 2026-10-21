require('../backend/node_modules/dotenv').config({ path: 'backend/.env' });
const mongoose = require('../backend/node_modules/mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('../backend/models/User');
  const users = await User.find({}).lean();
  console.log('--- ALL USERS WITH ROLES & NAMES ---');
  for (const u of users) {
    console.log(`[${u.role}] Name: "${u.name}" | Email: "${u.email}" | Phone: "${u.phone}"`);
    if (u.roleData) {
      console.log('   roleData:', JSON.stringify(u.roleData));
    }
  }

  // Also check if there are store models
  try {
    const MarketplaceStore = require('../backend/models/MarketplaceStore');
    const stores = await MarketplaceStore.find({}).lean();
    console.log('--- MARKETPLACE STORES ---');
    for (const s of stores) {
      console.log(`Store Name: "${s.name}" | ownerId: ${s.ownerId} | outletName: "${s.outletName}"`);
    }
  } catch (e) {
    console.log('No MarketplaceStore or error:', e.message);
  }

  process.exit(0);
}

main().catch(console.error);
