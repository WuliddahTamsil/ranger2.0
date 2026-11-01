const express = require("express");
const router = express.Router();
const laundryController = require("../controllers/laundryController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const ownerGuard = [requireAuth, requireRole("pemilik_laundry", "admin")];
const driverGuard = [requireAuth, requireRole("driver", "admin")];
const adminGuard = [requireAuth, requireRole("admin")];

// Toko & Layanan (Public catalog)
router.get("/stores", laundryController.getStores);
router.get("/stores/:id", laundryController.getStoreById);
router.get("/store/my-store", ...ownerGuard, laundryController.getMyStore);
router.post("/store/my-store", ...ownerGuard, laundryController.saveMyStore);

// Orders Lifecycle
router.post("/orders", requireAuth, laundryController.createOrder);
router.get("/orders/customer/:customerId", requireAuth, laundryController.getCustomerOrders);
router.get("/orders/store/:ownerId", ...ownerGuard, laundryController.getStoreOrders);
router.get("/customers/store/:ownerId", ...ownerGuard, laundryController.getStoreCustomers);
router.get("/driver/jobs", ...driverGuard, laundryController.getDriverOrders);
router.get("/orders/driver", ...driverGuard, laundryController.getDriverOrders);

// Stage 1: Owner ACC
router.put("/orders/:id/accept", ...ownerGuard, laundryController.acceptOrder);

// Stage 2: Driver Pickup
router.put("/orders/:id/take-pickup", ...driverGuard, laundryController.takePickupJob);
router.put("/orders/:id/picked-up", ...driverGuard, laundryController.pickedUpByDriver);
router.put("/orders/:id/arrived-at-laundry", ...driverGuard, laundryController.arrivedAtLaundry);

// Stage 3: Weighing & Payment Gate
router.put("/orders/:id/weigh-and-bill", ...ownerGuard, laundryController.weighAndBillOrder);
router.post("/orders/:id/pay", requireAuth, laundryController.payOrder);
router.put("/orders/:id/verify-payment", ...ownerGuard, laundryController.verifyPayment);

// Stage 4: Ready for Delivery & Return Drop
router.put("/orders/:id/ready-for-delivery", ...ownerGuard, laundryController.markReadyForDelivery);
router.put("/orders/:id/take-delivery", ...driverGuard, laundryController.takeDeliveryJob);
router.put("/orders/:id/complete-delivery", ...driverGuard, laundryController.completeDelivery);

// Reset / Clear Data (Strict Admin Only)
router.delete("/orders/all", ...adminGuard, laundryController.clearAllOrders);

// Live Location & Status Update
router.put("/orders/:id/driver-location", ...driverGuard, laundryController.updateDriverLocation);
router.put("/orders/:id/update-status", requireAuth, laundryController.updateOrderStatus);

module.exports = router;
