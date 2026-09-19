const mongoose = require("mongoose");

if (mongoose.models.PointWallet) {
  module.exports = mongoose.models.PointWallet;
} else {
  const pointWalletSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },
      balancePoint: {
        type: Number,
        default: 0,
        min: 0,
      },
      lifetimeEarned: {
        type: Number,
        default: 0,
        min: 0,
      },
      lifetimeRedeemed: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalKgDeposited: {
        type: Number,
        default: 0,
        min: 0,
      },
      depositCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalCo2ReductionKg: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

  module.exports = mongoose.model("PointWallet", pointWalletSchema);
}
