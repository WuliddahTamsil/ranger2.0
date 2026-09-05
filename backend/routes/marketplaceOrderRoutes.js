const express = require("express");
const { createOrder, getOrdersByOwner, getOrdersByCustomer, updateOrderStatus } = require("../controllers/marketplaceOrderController");

const router = express.Router();
router.post("/", createOrder);
router.get("/owner/:ownerId", getOrdersByOwner);
router.get("/customer/:customerId", getOrdersByCustomer);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
