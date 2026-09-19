import React from "react";
import { Nav } from "../../../types";
import { GeoversePointRedeemCashScreen } from "../../../features/geoversePoint/screens/GeoversePointRedeemCashScreen";

/**
 * Backward compatibility wrapper for legacy route 'c_recycle_redemption'
 */
export const PointRedemptionScreen: React.FC<Nav> = (props) => {
  return <GeoversePointRedeemCashScreen {...props} />;
};

export default PointRedemptionScreen;
