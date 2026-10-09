const express = require("express");
const {
  getProductsByOwner,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getWithdrawals,
  createWithdrawal,
} = require("../controllers/marketplaceController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

router.get("/withdrawals", requireAuth, requireRole("pemilik_marketplace"), getWithdrawals);
router.post("/withdrawals", requireAuth, requireRole("pemilik_marketplace"), createWithdrawal);

router.get("/", getAllProducts);
router.get("/owner/:ownerId", getProductsByOwner);
router.post("/", requireAuth, requireRole("pemilik_marketplace"), createProduct);
router.put("/:id", requireAuth, requireRole("pemilik_marketplace"), updateProduct);
router.delete("/:id", requireAuth, requireRole("pemilik_marketplace"), deleteProduct);

module.exports = router;
