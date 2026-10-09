const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('marketplaceproducts');

  // 1. Mark all products with storeId or shop categories as productType: "SHOP"
  const shopResult = await collection.updateMany(
    {
      $or: [
        { storeId: { $exists: true, $ne: null } },
        { cat: { $in: ['Kesehatan', 'Apotek', 'Supermarket', 'Sembako', 'Ibu & Bayi', 'Minimarket'] } }
      ]
    },
    {
      $set: { productType: 'SHOP' }
    }
  );
  console.log('Updated shop products count:', shopResult.modifiedCount);

  // 2. Mark verified UMKM products as productType: "UMKM"
  const umkmResult = await collection.updateMany(
    {
      productType: { $ne: 'SHOP' },
      $or: [{ storeId: null }, { storeId: { $exists: false } }]
    },
    {
      $set: { productType: 'UMKM' }
    }
  );
  console.log('Updated UMKM products count:', umkmResult.modifiedCount);

  // 3. Normalize categories of UMKM products to only "Makanan" or "UMKM Lokal"
  const nonShopProducts = await collection.find({ productType: 'UMKM' }).toArray();
  for (const prod of nonShopProducts) {
    let targetCat = prod.cat;
    if (targetCat !== 'Makanan' && targetCat !== 'UMKM Lokal') {
      if (['Snack', 'Minuman', 'Catering', 'Makanan Ringan'].some(k => (prod.cat || '').includes(k))) {
        targetCat = 'Makanan';
      } else {
        targetCat = 'UMKM Lokal';
      }
      await collection.updateOne({ _id: prod._id }, { $set: { cat: targetCat } });
      console.log(`Updated product "${prod.name}" category from "${prod.cat}" to "${targetCat}"`);
    }
  }

  // 4. Ensure we have at least 1-2 nice products under "UMKM Lokal"
  const umkmLokalCount = await collection.countDocuments({ productType: 'UMKM', cat: 'UMKM Lokal', isActive: true });
  console.log('Current active UMKM Lokal products count:', umkmLokalCount);

  if (umkmLokalCount === 0) {
    // Find a verified pemilik_marketplace
    const owner = await mongoose.connection.collection('users').findOne({
      role: 'pemilik_marketplace',
      status: 'verified'
    });
    if (owner) {
      await collection.insertOne({
        ownerId: owner._id,
        name: 'Kerajinan Tas Rajut Etnik Kamojang',
        description: 'Kerajinan tas rajut buatan tangan khas UMKM pengrajin lokal Kamojang, bahan benang katun ramah lingkungan.',
        cat: 'UMKM Lokal',
        price: 45000,
        stock: 12,
        productType: 'UMKM',
        isActive: true,
        img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60',
        images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60'],
        rating: 4.9,
        sold: 18,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created sample UMKM Lokal product: Kerajinan Tas Rajut Etnik Kamojang');
    }
  }

  const allActiveMarketplace = await collection.find({ productType: 'UMKM', isActive: true }).toArray();
  console.log('\nFinal active Marketplace products:');
  allActiveMarketplace.forEach(p => console.log(`- [${p.cat}] ${p.name} (Rp${p.price})`));

  process.exit(0);
}

run().catch(err => {
  console.error('Error running fix:', err);
  process.exit(1);
});
