const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Kost = require("../models/Kost");

// Get transactions by owner (ID or Email)
const getTransactionsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    let query = {};

    if (ownerId && ownerId.match(/^[0-9a-fA-F]{24}$/)) {
      query = {
        $or: [
          { ownerId: ownerId },
          { ownerEmail: ownerId.toLowerCase().trim() },
        ],
      };
    } else if (ownerId) {
      const cleanEmail = ownerId.toLowerCase().trim();
      const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } });
      if (user) {
        query = {
          $or: [
            { ownerId: user._id },
            { ownerEmail: { $regex: new RegExp(`^${cleanEmail}$`, "i") } },
          ],
        };
      } else {
        query = { ownerEmail: { $regex: new RegExp(`^${cleanEmail}$`, "i") } };
      }
    }

    const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("❌ getTransactionsByOwner error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil transaksi", error: error.message });
  }
};

// Create a new transaction (Expense or Income)
const createTransaction = async (req, res) => {
  try {
    const { title, category, amount, type, date, notes, receiptImage, ownerId, ownerEmail } = req.body;

    if (!title || amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: "Judul dan nominal transaksi wajib diisi" });
    }

    let finalOwnerId = undefined;
    let finalOwnerEmail = ownerEmail ? ownerEmail.toLowerCase().trim() : "";

    if (ownerId && ownerId.match(/^[0-9a-fA-F]{24}$/)) {
      finalOwnerId = ownerId;
      const user = await User.findById(ownerId);
      if (user && user.email) {
        finalOwnerEmail = user.email.toLowerCase().trim();
      }
    } else if (ownerEmail) {
      const cleanEmail = ownerEmail.toLowerCase().trim();
      const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } });
      if (user) {
        finalOwnerId = user._id;
        finalOwnerEmail = user.email.toLowerCase().trim();
      }
    }

    const newTx = await Transaction.create({
      ownerId: finalOwnerId,
      ownerEmail: finalOwnerEmail,
      title: title.trim(),
      category: category ? category.trim() : "Operasional",
      amount: Math.abs(Number(amount)),
      type: type === "income" ? "income" : "expense",
      date: date ? new Date(date) : new Date(),
      notes: notes ? notes.trim() : undefined,
      receiptImage: receiptImage || undefined,
    });

    return res.status(201).json({
      success: true,
      message: `${type === "income" ? "Pemasukan" : "Pengeluaran"} berhasil dicatat di database`,
      data: newTx,
    });
  } catch (error) {
    console.error("❌ createTransaction error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan transaksi", error: error.message });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Transaction.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });
    }

    return res.status(200).json({
      success: true,
      message: "Transaksi berhasil dihapus",
      data: deleted,
    });
  } catch (error) {
    console.error("❌ deleteTransaction error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus transaksi", error: error.message });
  }
};

module.exports = {
  getTransactionsByOwner,
  createTransaction,
  deleteTransaction,
};
