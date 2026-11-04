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
  driverPickupWaste,
  driverDeliverToBank,
  getDriverAvailableWastePickups,
  weighDeposit,
  confirmWeighing,
  disputeWeighing,
  cancelDeposit,
} = require("../controllers/wasteDepositController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const bankGuard = [requireAuth, requireRole("bank_sampah", "admin_sampah", "admin")];
const driverGuard = [requireAuth, requireRole("driver", "admin")];

// -------------------------------------------------------------
// WASTE BANKS (Public discovery + Bank admin management)
// -------------------------------------------------------------
router.get("/", getWasteBanks);
router.get("/banks", getWasteBanks);
router.get("/banks/:id", getWasteBankById);
router.get("/:id", (req, res, next) => {
  if (req.params.id === "deposits" || req.params.id === "banks") return next();
  return getWasteBankById(req, res, next);
});
router.post("/", ...bankGuard, createWasteBank);
router.post("/banks", ...bankGuard, createWasteBank);
router.get("/:id/prices", getCategoryPrices);
router.get("/banks/:id/prices", getCategoryPrices);
router.post("/:id/prices", ...bankGuard, updateCategoryPrice);
router.post("/banks/:id/prices", ...bankGuard, updateCategoryPrice);
router.post("/:id/operational", ...bankGuard, updateWasteBankOperational);
router.post("/banks/:id/operational", ...bankGuard, updateWasteBankOperational);
router.put("/:id/operational", ...bankGuard, updateWasteBankOperational);
router.put("/banks/:id/operational", ...bankGuard, updateWasteBankOperational);

// -------------------------------------------------------------
// WASTE DEPOSITS (Strictly Authenticated)
// -------------------------------------------------------------
router.post("/deposits", requireAuth, createDeposit);
router.get("/deposits/customer/:customerId", requireAuth, getCustomerDeposits);
router.get("/deposits/bank/:bankSampahId", ...bankGuard, getBankDeposits);
router.get("/deposits/driver/available", ...driverGuard, getDriverAvailableWastePickups);
router.get("/deposits/:id", requireAuth, getDepositById);

router.post("/deposits/:id/accept", ...bankGuard, acceptDeposit);
router.post("/deposits/:id/assign-driver", ...driverGuard, assignDriver);
router.post("/deposits/:id/pickup", ...driverGuard, driverPickupWaste);
router.post("/deposits/:id/deliver-to-bank", ...driverGuard, driverDeliverToBank);
router.post("/deposits/:id/weigh", ...bankGuard, weighDeposit);
router.post("/deposits/:id/confirm", requireAuth, confirmWeighing);
router.post("/deposits/:id/complaint", requireAuth, disputeWeighing);
router.post("/deposits/:id/dispute", requireAuth, disputeWeighing);
router.post("/deposits/:id/cancel", requireAuth, cancelDeposit);

module.exports = router;
