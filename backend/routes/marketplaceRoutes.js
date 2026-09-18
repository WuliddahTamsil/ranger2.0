const express = require("express");
const {
  getProductsByOwner,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/marketplaceController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/owner/:ownerId", getProductsByOwner);
router.post("/", requireAuth, requireRole("pemilik_marketplace"), createProduct);
router.put("/:id", requireAuth, requireRole("pemilik_marketplace"), updateProduct);
router.delete("/:id", requireAuth, requireRole("pemilik_marketplace"), deleteProduct);

module.exports = router;

