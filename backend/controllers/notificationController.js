const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ success: false, message: "ID pengguna tidak valid" });
    }
    if (String(req.params.userId) !== String(req.authUser._id)) {
      return res.status(403).json({ success: false, message: "Notifikasi hanya dapat dilihat oleh pemilik akun." });
    }
    const notifications = await Notification.find({ userId: req.authUser._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil notifikasi" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.authUser._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan" });
    return res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(400).json({ success: false, message: "Gagal memperbarui notifikasi" });
  }
};

module.exports = { getNotifications, markNotificationRead };
