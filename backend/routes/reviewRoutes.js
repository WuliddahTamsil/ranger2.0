const express = require("express");
const { createReview, getReviewsByProduct, getReviewsByCustomer } = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, createReview);
router.get("/product/:productId", getReviewsByProduct);
router.get("/customer/:customerId", getReviewsByCustomer);

module.exports = router;
