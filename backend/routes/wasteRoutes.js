const express = require("express");
const {
  getWasteBanks,
  getWasteBankById,
  createWasteBank,
  getCategoryPrices,
  updateCategoryPrice,
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
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// -------------------------------------------------------------
// WASTE BANKS
// -------------------------------------------------------------
router.get("/banks", getWasteBanks);
router.get("/banks/:id", getWasteBankById);
router.post("/banks", requireAuth, createWasteBank);
router.get("/banks/:id/prices", getCategoryPrices);
router.post("/banks/:id/prices", requireAuth, updateCategoryPrice);

// -------------------------------------------------------------
// WASTE DEPOSITS
// -------------------------------------------------------------
router.post("/deposits", requireAuth, createDeposit);
router.get("/deposits/customer/:customerId", requireAuth, getCustomerDeposits);
router.get("/deposits/bank/:bankSampahId", requireAuth, getBankDeposits);
router.get("/deposits/:id", requireAuth, getDepositById);

router.post("/deposits/:id/accept", requireAuth, acceptDeposit);
router.post("/deposits/:id/assign-driver", requireAuth, assignDriver);
router.post("/deposits/:id/weigh", requireAuth, weighDeposit);
router.post("/deposits/:id/confirm", requireAuth, confirmWeighing);
router.post("/deposits/:id/complaint", requireAuth, disputeWeighing);

module.exports = router;
