const express = require("express");
const {
  getProductsByOwner,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/marketplaceController");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/owner/:ownerId", getProductsByOwner);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
