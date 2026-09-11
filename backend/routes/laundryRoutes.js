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
router.get("/customers/store/:ownerId", laundryController.getStoreCustomers);
router.get("/driver/jobs", laundryController.getDriverOrders);
router.get("/orders/driver", laundryController.getDriverOrders);

// Stage 1: Owner ACC
router.put("/orders/:id/accept", laundryController.acceptOrder);

// Stage 2: Driver Pickup
router.put("/orders/:id/take-pickup", laundryController.takePickupJob);
router.put("/orders/:id/picked-up", laundryController.pickedUpByDriver);
router.put("/orders/:id/arrived-at-laundry", laundryController.arrivedAtLaundry);

// Stage 3: Weighing & Payment Gate
router.put("/orders/:id/weigh-and-bill", laundryController.weighAndBillOrder);
router.post("/orders/:id/pay", laundryController.payOrder);
router.put("/orders/:id/verify-payment", laundryController.verifyPayment);

// Stage 4: Ready for Delivery & Return Drop
router.put("/orders/:id/ready-for-delivery", laundryController.markReadyForDelivery);
router.put("/orders/:id/take-delivery", laundryController.takeDeliveryJob);
router.put("/orders/:id/complete-delivery", laundryController.completeDelivery);

// Live Location & Status Update
router.put("/orders/:id/driver-location", laundryController.updateDriverLocation);
router.put("/orders/:id/update-status", laundryController.updateOrderStatus);

module.exports = router;
