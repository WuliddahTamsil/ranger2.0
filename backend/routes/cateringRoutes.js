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
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { requireCustomerOrderOwner } = require("../middleware/requireCustomerOrderOwner");
const { submitCateringPayment, verifyCateringPayment, sendCateringPaymentReminder } = require("../controllers/cateringPaymentController");

const router = express.Router();

const cateringOwnerGuard = [requireAuth, requireRole("pemilik_catering", "admin")];
const driverGuard = [requireAuth, requireRole("driver", "admin")];

// Customer Endpoints
router.get("/", getAllCateringShops);
router.get("/products/active", getAllActiveProducts);
router.get("/:ownerId/products", getProductsByShop);
router.post("/orders", requireAuth, requireCustomerOrderOwner, createCateringOrder);
router.get("/orders/customer/:customerId", requireAuth, requireCustomerOrderOwner, getCateringOrdersByCustomer);
router.post("/orders/:id/payments", requireAuth, requireRole("customer", "pelanggan", "admin"), submitCateringPayment);
router.put("/orders/:id/payments/:paymentId", ...cateringOwnerGuard, verifyCateringPayment);
router.post("/orders/:id/payment-reminder", ...cateringOwnerGuard, sendCateringPaymentReminder);

// Driver Endpoints
router.get("/orders/driver/:driverId", ...driverGuard, getOrdersByDriver);
router.get("/orders/driver", ...driverGuard, getOrdersByDriver);
router.put("/orders/:id/assign-driver", ...driverGuard, assignDriver);
router.put("/orders/:id/decline-driver", ...driverGuard, declineDriver);

// Partner Endpoints
router.get("/products/owner/:ownerId", getProductsByOwner);
router.post("/products", ...cateringOwnerGuard, createProduct);
router.put("/products/:id", ...cateringOwnerGuard, updateProduct);
router.delete("/products/:id", ...cateringOwnerGuard, deleteProduct);
router.get("/orders/owner/:ownerId", ...cateringOwnerGuard, getCateringOrdersByOwner);
router.put("/orders/:id/status", requireAuth, updateCateringOrderStatus);

module.exports = router;
