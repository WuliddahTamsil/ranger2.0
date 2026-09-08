const express = require("express");
const router = express.Router();
const {
  getTransactionsByOwner,
  createTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

// Routes
router.get("/owner/:ownerId", getTransactionsByOwner);
router.post("/", createTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
