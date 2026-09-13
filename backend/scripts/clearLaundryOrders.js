require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const LaundryOrder = require("../models/LaundryOrder");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");

async function clearLaundryData() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ranger2";
  console.log("Connecting to Mongo:", mongoUri);
  await mongoose.connect(mongoUri);

  const deletedOrders = await LaundryOrder.deleteMany({});
  console.log(`✅ Cleared ${deletedOrders.deletedCount} laundry orders.`);

  // Also clear laundry-related notifications
  const deletedNotifs = await Notification.deleteMany({
    $or: [
      { type: { $regex: /laundry/i } },
      { title: { $regex: /laundry/i } },
      { message: { $regex: /laundry/i } },
      { message: { $regex: /LND-/i } },
    ]
  });
  console.log(`✅ Cleared ${deletedNotifs.deletedCount} laundry notifications.`);

  await mongoose.disconnect();
  console.log("Done!");
}

clearLaundryData().catch(console.error);
