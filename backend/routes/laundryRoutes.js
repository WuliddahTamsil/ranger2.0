const express = require("express");
const router = express.Router();
const laundryController = require("../controllers/laundryController");

// Toko & Layanan
router.get("/stores", laundryController.getStores);
router.get("/stores/:id", laundryController.getStoreById);
router.get("/store/my-store", laundryController.getMyStore);
router.post("/store/my-store", laundryController.saveMyStore);

// Orders Lifecycle
router.post("/orders", laundryController.createOrder);
router.get("/orders/customer/:customerId", laundryController.getCustomerOrders);
router.get("/orders/store/:ownerId", laundryController.getStoreOrders);
router.get("/orders/driver", laundryController.getDriverOrders);
router.put("/orders/:id/weigh-and-bill", laundryController.weighAndBillOrder);
router.post("/orders/:id/pay", laundryController.payOrder);
router.put("/orders/:id/verify-payment", laundryController.verifyPayment);
router.put("/orders/:id/update-status", laundryController.updateOrderStatus);

module.exports = router;
