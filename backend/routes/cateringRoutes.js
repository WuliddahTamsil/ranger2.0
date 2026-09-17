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
  declineDriver,
} = require("../controllers/cateringController");
const { createCateringOrder } = require("../controllers/createCateringOrderController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireCustomerOrderOwner } = require("../middleware/requireCustomerOrderOwner");
const { requireRole } = require("../middleware/requireRole");
const { submitCateringPayment, verifyCateringPayment, sendCateringPaymentReminder } = require("../controllers/cateringPaymentController");

const router = express.Router();

// Customer Endpoints
router.get("/", getAllCateringShops);
router.get("/products/active", getAllActiveProducts);
router.get("/:ownerId/products", getProductsByShop);
router.post("/orders", requireAuth, requireCustomerOrderOwner, createCateringOrder);
router.get("/orders/customer/:customerId", requireAuth, requireCustomerOrderOwner, getCateringOrdersByCustomer);
router.post("/orders/:id/payments", requireAuth, requireRole("customer", "pelanggan"), submitCateringPayment);
router.put("/orders/:id/payments/:paymentId", requireAuth, requireRole("pemilik_catering"), verifyCateringPayment);
router.post("/orders/:id/payment-reminder", requireAuth, requireRole("pemilik_catering"), sendCateringPaymentReminder);

// Driver Endpoints
router.get("/orders/driver/:driverId", requireAuth, requireRole("driver"), getOrdersByDriver);
router.put("/orders/:id/assign-driver", requireAuth, requireRole("driver"), assignDriver);
router.put("/orders/:id/decline-driver", requireAuth, requireRole("driver"), declineDriver);

// Partner Endpoints
router.get("/products/owner/:ownerId", getProductsByOwner);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/orders/owner/:ownerId", requireAuth, requireRole("pemilik_catering"), getCateringOrdersByOwner);
router.put("/orders/:id/status", requireAuth, updateCateringOrderStatus);

module.exports = router;
