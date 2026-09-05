const express = require("express");
const {
  createProduct,
  getProductsByOwner,
  updateProduct,
  deleteProduct,
  getAllCateringShops,
  getProductsByShop,
  getAllActiveProducts,
  createCateringOrder,
  getCateringOrdersByOwner,
  getCateringOrdersByCustomer,
  updateCateringOrderStatus,
} = require("../controllers/cateringController");

const router = express.Router();

// Customer Endpoints
router.get("/", getAllCateringShops);
router.get("/products/active", getAllActiveProducts);
router.get("/:ownerId/products", getProductsByShop);
router.post("/orders", createCateringOrder);

// Partner Endpoints
router.get("/products/owner/:ownerId", getProductsByOwner);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/orders/owner/:ownerId", getCateringOrdersByOwner);
router.get("/orders/customer/:customerId", getCateringOrdersByCustomer);
router.put("/orders/:id/status", updateCateringOrderStatus);

module.exports = router;
