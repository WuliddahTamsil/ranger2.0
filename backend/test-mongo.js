require("dotenv").config();
const mongoose = require("mongoose");

console.log("URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then((conn) => {
    console.log("✅ MongoDB Atlas Connected:", conn.connection.host);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ MongoDB Atlas Error:", err.message);
    process.exit(1);
  });
