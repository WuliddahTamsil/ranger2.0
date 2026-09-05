const express = require("express");
const { createOrder, getOrdersByOwner, getOrdersByCustomer, getOrdersByDriver, assignDriver, updateOrderStatus } = require("../controllers/marketplaceOrderController");

const router = express.Router();
router.post("/", createOrder);
router.get("/owner/:ownerId", getOrdersByOwner);
router.get("/customer/:customerId", getOrdersByCustomer);
router.get("/driver/:driverId", getOrdersByDriver);
router.put("/:id/assign-driver", assignDriver);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
