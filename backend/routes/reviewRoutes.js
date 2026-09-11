const express = require("express");
const { createReview, getReviewsByProduct, getReviewsByCustomer } = require("../controllers/reviewController");

const router = express.Router();

router.post("/", createReview);
router.get("/product/:productId", getReviewsByProduct);
router.get("/customer/:customerId", getReviewsByCustomer);

module.exports = router;
