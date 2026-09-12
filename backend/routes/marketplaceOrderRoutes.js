const express = require("express");
const { getOrdersByOwner, getOrdersByCustomer, getOrdersByDriver, acceptDriverOrder, declineDriverOrder, assignDriver, updateOrderStatus } = require("../controllers/marketplaceOrderController");
const { createMarketplaceOrder } = require("../controllers/createMarketplaceOrderController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireCustomerOrderOwner } = require("../middleware/requireCustomerOrderOwner");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();
router.post("/", requireAuth, requireCustomerOrderOwner, createMarketplaceOrder);
router.get("/owner/:ownerId", requireAuth, requireRole("pemilik_marketplace"), getOrdersByOwner);
router.get("/customer/:customerId", requireAuth, requireCustomerOrderOwner, getOrdersByCustomer);
router.get("/driver", requireAuth, requireRole("driver"), getOrdersByDriver);
router.get("/driver/:driverId", requireAuth, requireRole("driver"), getOrdersByDriver);
router.post("/:id/accept", requireAuth, requireRole("driver"), acceptDriverOrder);
router.post("/:id/decline", requireAuth, requireRole("driver"), declineDriverOrder);
router.put("/:id/assign-driver", requireAuth, requireRole("pemilik_marketplace"), assignDriver);
router.put("/:id/status", requireAuth, updateOrderStatus);

module.exports = router;
