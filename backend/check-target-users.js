require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const MarketplaceStore = require("./models/MarketplaceStore");
const MarketplaceProduct = require("./models/MarketplaceProduct");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const emails = [
    "wuliddahtamsilbarokah19@gmail.com",
    "dyaskaaa@gmail.com",
    "barokah@gmail.com"
  ];

  for (const email of emails) {
    const user = await User.findOne({ email });
    console.log("=========================================");
    console.log("Target Email:", email);
    if (!user) {
      console.log("-> USER NOT FOUND IN DB!");
    } else {
      console.log("ID:", user._id);
      console.log("Name:", user.name);
      console.log("Role:", user.role);
      console.log("Status:", user.status);
      console.log("Match '12345678':", await user.matchPassword("12345678"));
      console.log("Match '19012005Wu!':", await user.matchPassword("19012005Wu!"));

      if (user.role === "pemilik_shop" || user.role === "pemilik_marketplace") {
        const store = await MarketplaceStore.findOne({ ownerId: user._id });
        console.log("Store found:", store ? {
          _id: store._id,
          name: store.name,
          category: store.category,
          isActive: store.isActive,
          status: store.status
        } : "NO STORE FOUND");
        if (store) {
          const products = await MarketplaceProduct.find({ storeId: store._id });
          console.log("Store Products Count:", products.length);
          if (products.length > 0) {
            console.log("Sample product:", {
              _id: products[0]._id,
              name: products[0].name,
              price: products[0].price,
              stock: products[0].stock,
              isAvailable: products[0].isAvailable
            });
          }
        }
      }
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
