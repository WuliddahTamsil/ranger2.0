const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ success: false, message: "ID pengguna tidak valid" });
    }
    const notifications = await Notification.find({ userId: req.params.userId })
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
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
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
