const express = require("express");
const {
  getWasteBanks,
  getWasteBankById,
  createWasteBank,
  getCategoryPrices,
  updateCategoryPrice,
  updateWasteBankOperational,
} = require("../controllers/wasteBankController");
const {
  createDeposit,
  getCustomerDeposits,
  getDepositById,
  getBankDeposits,
  acceptDeposit,
  assignDriver,
  weighDeposit,
  confirmWeighing,
  disputeWeighing,
} = require("../controllers/wasteDepositController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// -------------------------------------------------------------
// WASTE BANKS
// -------------------------------------------------------------
router.get("/", getWasteBanks);
router.get("/banks", getWasteBanks);
router.get("/banks/:id", getWasteBankById);
router.get("/:id", (req, res, next) => {
  // Prevent catching deposits routes if called on /api/waste/:id
  if (req.params.id === "deposits" || req.params.id === "banks") return next();
  return getWasteBankById(req, res, next);
});
router.post("/", requireAuth, createWasteBank);
router.post("/banks", requireAuth, createWasteBank);
router.get("/:id/prices", getCategoryPrices);
router.get("/banks/:id/prices", getCategoryPrices);
router.post("/:id/prices", requireAuth, updateCategoryPrice);
router.post("/banks/:id/prices", requireAuth, updateCategoryPrice);
router.post("/:id/operational", optionalAuth, updateWasteBankOperational);
router.post("/banks/:id/operational", optionalAuth, updateWasteBankOperational);
router.put("/:id/operational", optionalAuth, updateWasteBankOperational);
router.put("/banks/:id/operational", optionalAuth, updateWasteBankOperational);

// -------------------------------------------------------------
// WASTE DEPOSITS
// -------------------------------------------------------------
router.post("/deposits", optionalAuth, createDeposit);
router.get("/deposits/customer/:customerId", optionalAuth, getCustomerDeposits);
router.get("/deposits/bank/:bankSampahId", optionalAuth, getBankDeposits);
router.get("/deposits/:id", optionalAuth, getDepositById);

router.post("/deposits/:id/accept", optionalAuth, acceptDeposit);
router.post("/deposits/:id/assign-driver", optionalAuth, assignDriver);
router.post("/deposits/:id/weigh", optionalAuth, weighDeposit);
router.post("/deposits/:id/confirm", optionalAuth, confirmWeighing);
router.post("/deposits/:id/complaint", optionalAuth, disputeWeighing);

module.exports = router;
