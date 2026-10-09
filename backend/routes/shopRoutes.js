const express = require("express");
const {
  getStores,
  getStoreById,
  getStoreProducts,
  getCategories,
  searchGlobal,
  getProductById,
  getMerchantStore,
  getMerchantProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
} = require("../controllers/shopController");

const {
  createShopOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  submitComplaint,
  submitRating,
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

const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// ==================== STORE & CATALOG (PUBLIC / USER) ====================
router.get("/stores", getStores);
router.get("/stores/:id", getStoreById);
router.get("/stores/:id/products", getStoreProducts);
router.get("/categories", getCategories);
router.get("/search", searchGlobal);
router.get("/products/:id", getProductById);

// Authenticated Kanyaah Shop owner catalog
router.get("/merchant/store", requireAuth, getMerchantStore);
router.get("/merchant/products", requireAuth, getMerchantProducts);

// Store owner product management
router.post("/products", requireAuth, createProduct);
router.put("/products/:id", requireAuth, updateProduct);
router.delete("/products/:id", requireAuth, deleteProduct);
router.put("/products/:id/stock", requireAuth, updateProductStock);

// ==================== CUSTOMER ORDER ====================
router.post("/orders", requireAuth, createShopOrder);
router.get("/orders/customer/:customerId", requireAuth, getCustomerOrders);
router.get("/orders/:id", requireAuth, getOrderById);
router.post("/orders/:id/cancel", requireAuth, cancelOrder);
router.post("/orders/:id/complaint", requireAuth, submitComplaint);
router.post("/orders/:id/rating", requireAuth, submitRating);
router.post("/orders/:id/substitution-response", requireAuth, customerRespondSubstitution);

// ==================== MERCHANT / PICKER ====================
router.get("/merchant/orders", requireAuth, getMerchantOrders);
router.post("/orders/:id/accept", requireAuth, merchantAcceptOrder);
router.put("/orders/:id/status", requireAuth, merchantUpdateStatus);
router.post("/orders/:id/substitution", requireAuth, merchantProposeSubstitution);
router.post("/orders/:id/reject", requireAuth, cancelOrder);

// ==================== DRIVER ====================
router.get("/driver/orders", optionalAuth, getDriverOrders);
router.get("/driver/orders/:driverId", optionalAuth, getDriverOrders);
router.get("/driver", optionalAuth, getDriverOrders);
router.post("/orders/:id/accept-driver", optionalAuth, acceptDriverOrder);
router.put("/orders/:id/driver-status", optionalAuth, updateDriverStatus);
router.put("/orders/:id/status-driver", optionalAuth, updateDriverStatus);
router.post("/orders/:id/pickup-proof", optionalAuth, uploadPickupProof);
router.post("/orders/:id/delivery-proof", optionalAuth, uploadDeliveryProof);
router.put("/orders/:id/location", optionalAuth, updateDriverLocation);

// ==================== PHARMACY ====================
router.post("/orders/:id/prescription", requireAuth, submitPrescription);
router.post("/prescriptions", requireAuth, submitPrescription);
router.get("/pharmacy/prescriptions", requireAuth, getPendingPrescriptions);
router.post("/prescriptions/:id/approve", requireAuth, approvePrescription);
router.post("/prescriptions/:id/reject", requireAuth, rejectPrescription);

module.exports = router;
