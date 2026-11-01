const express = require("express");
const {
  getStores,
  getStoreById,
  getStoreProducts,
  getCategories,
  searchGlobal,
  getProductById,
  getMerchantStore,
  updateMerchantStore,
  getMerchantProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  bulkImportProducts,
} = require("../controllers/shopController");

const {
  createShopOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  submitComplaint,
  submitRating,
  simulateShopPayment,
  getMerchantOrders,
  merchantAcceptOrder,
  merchantUpdateStatus,
  merchantProposeSubstitution,
  customerRespondSubstitution,
  getDriverOrders,
  acceptDriverOrder,
  updateDriverStatus,
  uploadPickupProof,
  uploadDeliveryProof,
  updateDriverLocation,
  submitPrescription,
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
} = require("../controllers/shopOrderController");

const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const shopOwnerGuard = [requireAuth, requireRole("pemilik_shop", "pemilik_marketplace", "admin")];
const driverGuard = [requireAuth, requireRole("driver", "admin")];

// ==================== STORE & CATALOG (PUBLIC / USER) ====================
router.get("/stores", getStores);
router.get("/stores/:id", getStoreById);
router.get("/stores/:id/products", getStoreProducts);
router.get("/categories", getCategories);
router.get("/search", searchGlobal);
router.get("/products/:id", getProductById);

// Authenticated Kanyaah Shop owner catalog
router.get("/merchant/store", ...shopOwnerGuard, getMerchantStore);
router.put("/merchant/store", ...shopOwnerGuard, updateMerchantStore);
router.get("/merchant/products", ...shopOwnerGuard, getMerchantProducts);

// Store owner product management
router.post("/products", ...shopOwnerGuard, createProduct);
router.put("/products/:id", ...shopOwnerGuard, updateProduct);
router.delete("/products/:id", ...shopOwnerGuard, deleteProduct);
router.put("/products/:id/stock", ...shopOwnerGuard, updateProductStock);
router.post("/merchant/products/bulk", ...shopOwnerGuard, bulkImportProducts);

// ==================== CUSTOMER ORDER ====================
router.post("/orders", requireAuth, createShopOrder);
router.get("/orders/customer/:customerId", requireAuth, getCustomerOrders);
router.get("/orders/:id", requireAuth, getOrderById);
router.post("/orders/:id/cancel", requireAuth, cancelOrder);
router.post("/orders/:id/complaint", requireAuth, submitComplaint);
router.post("/orders/:id/rating", requireAuth, submitRating);
router.post("/orders/:id/simulate-payment", requireAuth, simulateShopPayment);
router.post("/orders/:id/substitution-response", requireAuth, customerRespondSubstitution);

// ==================== MERCHANT / PICKER ====================
router.get("/merchant/orders", ...shopOwnerGuard, getMerchantOrders);
router.post("/orders/:id/accept", ...shopOwnerGuard, merchantAcceptOrder);
router.put("/orders/:id/status", ...shopOwnerGuard, merchantUpdateStatus);
router.post("/orders/:id/substitution", ...shopOwnerGuard, merchantProposeSubstitution);
router.post("/orders/:id/reject", ...shopOwnerGuard, cancelOrder);

// ==================== DRIVER (Require authenticated driver) ====================
router.get("/driver/orders", ...driverGuard, getDriverOrders);
router.get("/driver/orders/:driverId", ...driverGuard, getDriverOrders);
router.get("/driver", ...driverGuard, getDriverOrders);
router.post("/orders/:id/accept-driver", ...driverGuard, acceptDriverOrder);
router.put("/orders/:id/driver-status", ...driverGuard, updateDriverStatus);
router.put("/orders/:id/status-driver", ...driverGuard, updateDriverStatus);
router.post("/orders/:id/pickup-proof", ...driverGuard, uploadPickupProof);
router.post("/orders/:id/delivery-proof", ...driverGuard, uploadDeliveryProof);
router.put("/orders/:id/location", ...driverGuard, updateDriverLocation);

// ==================== PHARMACY ====================
router.post("/orders/:id/prescription", requireAuth, submitPrescription);
router.post("/prescriptions", requireAuth, submitPrescription);
router.get("/pharmacy/prescriptions", ...shopOwnerGuard, getPendingPrescriptions);
router.post("/prescriptions/:id/approve", ...shopOwnerGuard, approvePrescription);
router.post("/prescriptions/:id/reject", ...shopOwnerGuard, rejectPrescription);

module.exports = router;
