require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { verifyAccessToken } = require("./middleware/authMiddleware");
const { findOrderByIdentifier, resolveParticipant } = require("./utils/chatAccess");

// Initialize Express & HTTP Server (GEOVERSE 2.0 Live)
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Middleware
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Attach Socket.io & Host URL to req
app.use((req, res, next) => {
  req.io = io;
  const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : req.protocol) || "https";
  req.hostUrl = `${proto}://${req.get("host")}`;
  next();
});

// Routes
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const kostRoutes = require("./routes/kostRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const cateringRoutes = require("./routes/cateringRoutes");
const chatRoutes = require("./routes/chatRoutes");
const laundryRoutes = require("./routes/laundryRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const marketplaceOrderRoutes = require("./routes/marketplaceOrderRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const rideRoutes = require("./routes/rideRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const sendRoutes = require("./routes/sendRoutes");
const wasteRoutes = require("./routes/wasteRoutes");
const pointRoutes = require("./routes/pointRoutes");
const geoversePointRoutes = require("./features/geoversePoint/routes/geoversePointRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const shopRoutes = require("./routes/shopRoutes");
const homeHeroRoutes = require("./routes/homeHeroRoutes");
const pgeInfoHubRoutes = require("./features/pgeInfoHub/pgeInfoHubRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/kosts", kostRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/catering", cateringRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/laundry", laundryRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/marketplace/orders", marketplaceOrderRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/send", sendRoutes);
app.use("/api/waste-banks", wasteRoutes);
app.use("/api/waste", wasteRoutes);
app.use("/api/geoverse-points", geoversePointRoutes);
app.use("/api/points", pointRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/home-hero", homeHeroRoutes);
app.use("/api/admin/home-hero", homeHeroRoutes);
app.use("/api/pge-info-hub", pgeInfoHubRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "GEOVERSE Backend API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.send("🚀 GEOVERSE Backend API is running smoothly!");
});

// App Store Review Guideline 5.1.1 & 2.1 Compliant Privacy Policy Page
app.get("/privacy", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kebijakan Privasi - GEOVERSE</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #0d7a53; margin-top: 24px; }
    p, li { font-size: 15px; color: #334155; }
    .footer { margin-top: 36px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Kebijakan Privasi GEOVERSE</h1>
    <p>Terakhir Diperbarui: 22 Oktober 2026</p>
    <p>GEOVERSE ("kami") berkomitmen untuk melindungi dan menghormati privasi pengguna aplikasi kami. Dokumen Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.</p>

    <h2>1. Informasi yang Kami Kumpulkan</h2>
    <ul>
      <li><strong>Informasi Akun:</strong> Nama lengkap, alamat email, nomor telepon, dan peran akun pengguna (Pelanggan, Mitra Pengemudi, Pemilik Kos/Hotel/Wisata).</li>
      <li><strong>Data Lokasi (GPS):</strong> Digunakan untuk menentukan titik penjemputan ojek (Kanyaah Ride), pengiriman barang (Kanyaah Send), dan menampilkan mitra terdekat di sekitar kawasan Kamojang & Garut.</li>
      <li><strong>Akses Kamera & Galeri Foto:</strong> Digunakan untuk mengunggah foto profil, dokumen verifikasi mitra (KTP/SIM/STNK), serta bukti foto serah terima pengantaran barang secara real-time.</li>
    </ul>

    <h2>2. Penggunaan Informasi</h2>
    <p>Informasi yang dikumpulkan digunakan semata-mata untuk memproses transaksi, memastikan akurasi penjemputan armada, verifikasi keaslian mitra, dan meningkatkan kualitas pengalaman layanan pengguna.</p>

    <h2>3. Penghapusan Akun & Data (Account Deletion)</h2>
    <p>Pengguna memiliki hak penuh untuk menghapus akun dan data pribadinya secara permanen kapan saja langsung melalui menu <strong>Profil > Pengaturan > Hapus Akun</strong> di dalam aplikasi GEOVERSE, atau dengan menghubungi kami melalui email di <code>support@geoverse.id</code>.</p>

    <h2>4. Kontak Dukungan</h2>
    <p>Jika Anda memiliki pertanyaan mengenai privasi atau penggunaan data, silakan hubungi tim dukungan kami di email: <code>support@geoverse.id</code> atau WhatsApp: <code>+62 878-0598-7309</code>.</p>

    <div class="footer">
      &copy; 2026 GEOVERSE Kamojang. Seluruh hak cipta dilindungi undang-undang.
    </div>
  </div>
</body>
</html>`);
});

// App Store Review Guideline 2.1 Compliant Support URL Page
app.get("/support", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bantuan & Dukungan Pelanggan - GEOVERSE</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #0d7a53; margin-top: 24px; }
    .contact-card { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .contact-item { font-size: 15px; margin: 8px 0; font-weight: 600; color: #166534; }
    .footer { margin-top: 36px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pusat Bantuan & Customer Care GEOVERSE</h1>
    <p>Selamat datang di Pusat Bantuan Resmi GEOVERSE. Kami siap membantu Anda terkait kendala pesanan, layanan penginapan, pengiriman kurir, dan kemitraan.</p>

    <div class="contact-card">
      <h2>Hubungi Tim Dukungan Kami:</h2>
      <div class="contact-item">📧 Email: support@geoverse.id</div>
      <div class="contact-item">💬 WhatsApp / Call Center: +62 878-0598-7309</div>
      <div class="contact-item">📍 Lokasi Layanan: Kawasan Geothermal Kamojang & Garut, Jawa Barat</div>
      <div class="contact-item">⏰ Jam Operasional: Setiap Hari (06.00 - 22.00 WIB)</div>
    </div>

    <h2>Bantuan Cepat Layanan:</h2>
    <ul>
      <li><strong>Kanyaah Ride:</strong> Transportasi motor lokal dengan verifikasi PIN penumpang aman.</li>
      <li><strong>Kanyaah Send:</strong> Pengiriman dokumen & paket kilat dengan konfirmasi foto serah terima.</li>
      <li><strong>Kos & Hotel:</strong> Reservasi kamar harian/bulanan dengan kwitansi digital resmi.</li>
      <li><strong>Wisata Kamojang:</strong> E-ticket wahana dengan fitur scan rombongan wisata.</li>
    </ul>

    <div class="footer">
      &copy; 2026 GEOVERSE Kamojang. Customer Care & Technical Support.
    </div>
  </div>
</body>
</html>`);
});

// Socket.io Realtime Connection
io.on("connection", (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on("join_conversation", async ({ orderId, token } = {}) => {
    if (!orderId) return;
    try {
      const user = token ? await verifyAccessToken(token) : null;
      const record = await findOrderByIdentifier(orderId);
      const participant = user && record ? await resolveParticipant(user._id, record) : null;

      const orderRoomId = record?.order?._id ? String(record.order._id) : String(orderId);
      const roomsToJoin = new Set([
        `conversation:${orderRoomId}`,
        `conversation:${String(orderId)}`,
      ]);
      if (participant?.orderCode || record?.order?.orderCode) {
        const code = String(participant?.orderCode || record?.order?.orderCode);
        roomsToJoin.add(`conversation:${code}`);
        roomsToJoin.add(`conversation:#${code.replace(/^#/, "")}`);
      }
      roomsToJoin.forEach((r) => socket.join(r));
      socket.emit("chat:joined", { orderId: orderRoomId, roomName: `conversation:${orderRoomId}` });
      console.log(`Socket ${socket.id} joined chat room(s): ${Array.from(roomsToJoin).join(", ")}`);
    } catch (err) {
      console.warn("Socket join_conversation error:", err.message);
      socket.join(`conversation:${String(orderId)}`);
    }
  });

  socket.on("join_user_room", async ({ token } = {}) => {
    const user = await verifyAccessToken(token);
    if (!user?._id) {
      socket.emit("user:join_denied", { message: "Sesi login tidak valid." });
      return;
    }
    const roomName = `user:${String(user._id)}`;
    socket.join(roomName);
    socket.emit("user:joined", { userId: String(user._id) });
  });

  socket.on("join_send_room", async ({ orderId, token } = {}) => {
    if (!orderId) return;
    try {
      const SendOrder = require("./models/SendOrder");
      let order = null;
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await SendOrder.findById(orderId).select("customerId driverId orderCode").lean().catch(() => null);
      }
      if (!order) {
        order = await SendOrder.findOne({ orderCode: orderId }).select("customerId driverId orderCode").lean().catch(() => null);
      }
      if (!order && String(orderId).startsWith("#")) {
        order = await SendOrder.findOne({ orderCode: String(orderId).replace(/^#/, "") }).select("customerId driverId orderCode").lean().catch(() => null);
      }

      const rooms = new Set([`send:${String(orderId)}`]);
      if (order) {
        rooms.add(`send:${String(order._id)}`);
        if (order.orderCode) {
          rooms.add(`send:${String(order.orderCode)}`);
          rooms.add(`send:#${String(order.orderCode).replace(/^#/, "")}`);
        }
      }

      rooms.forEach((r) => socket.join(r));
      socket.emit("send:room_joined", { orderId, rooms: Array.from(rooms) });
      console.log(`📡 Socket ${socket.id} joined authorized send room(s): ${Array.from(rooms).join(", ")}`);
    } catch (err) {
      console.warn("Socket send room join error:", err.message);
      socket.join(`send:${String(orderId)}`);
    }
  });

  socket.on("join_shop_room", async ({ orderId } = {}) => {
    if (!orderId) return;
    const roomName = `shop:${String(orderId)}`;
    socket.join(roomName);
    socket.emit("shop:room_joined", { orderId, roomName });
    console.log(`🛒 Socket ${socket.id} joined shop room: ${roomName}`);
  });

  socket.on("join_driver_room", async ({ token } = {}) => {
    const user = await verifyAccessToken(token);
    if (user?._id) {
      const roomName = `driver:${String(user._id)}`;
      socket.join(roomName);
      socket.emit("driver:joined", { driverId: String(user._id) });
      console.log(`🚗 Driver ${user._id} joined driver room: ${roomName}`);
    }
  });

  socket.on("join_room_legacy_disabled", (roomName) => {
    // Kept as a no-op for clients that still emit the old event.
    console.log(`📡 Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Serve PWA & Web Build if available
const webBuildPath = path.join(__dirname, "..", "web-build");
app.use(express.static(webBuildPath));
app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/uploads") ||
    req.path.startsWith("/socket.io")
  ) {
    return next();
  }
  const indexPath = path.join(webBuildPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Start Server & Connect Database
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`=========================================`);
      console.log(`🚀 GEOVERSE Backend Server running on port ${PORT}`);
      console.log(`📡 Local API URL: http://localhost:${PORT}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught Exception thrown:", error);
});

startServer();

