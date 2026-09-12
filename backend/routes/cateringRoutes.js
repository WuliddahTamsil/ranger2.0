const express = require("express");
const {
  createProduct,
  getProductsByOwner,
  updateProduct,
  deleteProduct,
  getAllCateringShops,
  getProductsByShop,
  getAllActiveProducts,
  getCateringOrdersByOwner,
  getCateringOrdersByCustomer,
  updateCateringOrderStatus,
  getOrdersByDriver,
  assignDriver,
} = require("../controllers/cateringController");
const { createCateringOrder } = require("../controllers/createCateringOrderController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireCustomerOrderOwner } = require("../middleware/requireCustomerOrderOwner");

const router = express.Router();

// Customer Endpoints
router.get("/", getAllCateringShops);
router.get("/products/active", getAllActiveProducts);
router.get("/:ownerId/products", getProductsByShop);
router.post("/orders", requireAuth, requireCustomerOrderOwner, createCateringOrder);
router.get("/orders/customer/:customerId", requireAuth, requireCustomerOrderOwner, getCateringOrdersByCustomer);

// Driver Endpoints
router.get("/orders/driver/:driverId", getOrdersByDriver);
router.put("/orders/:id/assign-driver", assignDriver);

// Partner Endpoints
router.get("/products/owner/:ownerId", getProductsByOwner);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/orders/owner/:ownerId", getCateringOrdersByOwner);
router.put("/orders/:id/status", updateCateringOrderStatus);

module.exports = router;
