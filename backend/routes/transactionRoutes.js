const express = require("express");
const router = express.Router();
const {
  getTransactionsByOwner,
  createTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");
const { requireAuth } = require("../middleware/authMiddleware");

// Routes protected by authentication
router.get("/owner/:ownerId", requireAuth, getTransactionsByOwner);
router.post("/", requireAuth, createTransaction);
router.delete("/:id", requireAuth, deleteTransaction);

module.exports = router;
