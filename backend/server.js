require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// Initialize Express & HTTP Server
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
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Attach Socket.io & Host URL to req
app.use((req, res, next) => {
  req.io = io;
  req.hostUrl = `${req.protocol}://${req.get("host")}`;
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

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Rangers App Backend API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.send("🚀 Rangers App Backend API is running smoothly!");
});

// Socket.io Realtime Connection
io.on("connection", (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on("join_room", (roomName) => {
    socket.join(roomName);
    console.log(`📡 Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Start Server & Connect Database
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 Rangers Backend Server running on port ${PORT}`);
      console.log(`📡 Local API URL: http://localhost:${PORT}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

startServer();
