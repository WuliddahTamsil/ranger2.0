require("dotenv").config();
const mongoose = require("mongoose");
const LaundryOrder = require("./models/LaundryOrder");
const User = require("./models/User");

async function linkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const aisyah = await User.findOne({ name: "aisyahphr" });
    if (!aisyah) {
      console.log("User aisyahphr not found");
      process.exit(0);
    }

    const res = await LaundryOrder.updateMany(
      {
        $or: [
          { customerId: "cust_demo" },
          { customerName: "Pelanggan Rangers" },
          { customerName: "aisyahphr" },
        ],
      },
      {
        $set: {
          customerId: aisyah._id.toString(),
          customerName: "aisyahphr",
          customerPhone: aisyah.phone || "+6287805987309",
        },
      }
    );

    console.log(`✅ Berhasil menyinkronkan ${res.modifiedCount} pesanan ke akun customer: aisyahphr`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

linkOrders();
