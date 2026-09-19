import React from "react";
import { Nav } from "../../../types";
import { GeoversePointLedgerScreen } from "../../../features/geoversePoint/screens/GeoversePointLedgerScreen";

/**
 * Backward compatibility wrapper for legacy route 'c_recycle_ledger'
 */
export const PointLedgerScreen: React.FC<Nav> = (props) => {
  return <GeoversePointLedgerScreen {...props} />;
};

export default PointLedgerScreen;
