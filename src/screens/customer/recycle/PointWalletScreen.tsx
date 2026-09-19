import React from "react";
import { Nav } from "../../../types";
import { GeoversePointHomeScreen } from "../../../features/geoversePoint/screens/GeoversePointHomeScreen";

/**
 * Backward compatibility wrapper for legacy route 'c_recycle_wallet'
 */
export const PointWalletScreen: React.FC<Nav> = (props) => {
  return <GeoversePointHomeScreen {...props} />;
};

export default PointWalletScreen;
