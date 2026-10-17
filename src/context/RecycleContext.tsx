import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  WasteBankUI,
  WasteDepositUI,
  PointWalletUI,
  WasteCategory,
} from "../types/recycleTypes";
import { getPointWallet } from "../services/recycleService";

import { useGeoversePoint } from "../features/geoversePoint/context/GeoversePointContext";

export interface DraftDepositState {
  bankSampahId?: string;
  bankSampahName?: string;
  method: "DROP_OFF" | "PICKUP";
  categories: Array<{
    category: WasteCategory;
    subCategory?: string;
    estimatedWeightKg: number;
    pricePerKg: number;
  }>;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupSchedule: string;
  pickupNotes: string;
  customerPhotos: string[];
}

interface RecycleContextType {
  wallet: PointWalletUI | null;
  walletLoading: boolean;
  refreshWallet: () => Promise<void>;
  selectedBank: WasteBankUI | null;
  setSelectedBank: (bank: WasteBankUI | null) => void;
  selectedDeposit: WasteDepositUI | null;
  setSelectedDeposit: (deposit: WasteDepositUI | null) => void;
  draftDeposit: DraftDepositState;
  updateDraftDeposit: (partial: Partial<DraftDepositState>) => void;
  resetDraftDeposit: () => void;
}

const initialDraft: DraftDepositState = {
  method: "DROP_OFF",
  categories: [],
  pickupAddress: "",
  pickupLatitude: null,
  pickupLongitude: null,
  pickupSchedule: "",
  pickupNotes: "",
  customerPhotos: [],
};

const RecycleContext = createContext<RecycleContextType | undefined>(undefined);

export const RecycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let geoPointContext: any = null;
  try {
    geoPointContext = useGeoversePoint();
  } catch {
    // If mounted outside GeoversePointProvider, use fallback state
  }

  const [fallbackWallet, setFallbackWallet] = useState<PointWalletUI | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState<WasteBankUI | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<WasteDepositUI | null>(null);
  const [draftDeposit, setDraftDeposit] = useState<DraftDepositState>(initialDraft);

  const refreshFallbackWallet = useCallback(async () => {
    setFallbackLoading(true);
    try {
      const res = await getPointWallet();
      if (res.success && res.data) {
        setFallbackWallet(res.data);
      }
    } catch (err) {
      console.error("Failed to load point wallet in context:", err);
    } finally {
      setFallbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!geoPointContext) {
      refreshFallbackWallet();
    }
  }, [geoPointContext, refreshFallbackWallet]);

  const wallet = (geoPointContext?.wallet as unknown as PointWalletUI) ?? fallbackWallet;
  const walletLoading = geoPointContext ? geoPointContext.walletLoading : fallbackLoading;
  const refreshWallet = geoPointContext ? geoPointContext.refreshWallet : refreshFallbackWallet;

  const updateDraftDeposit = useCallback((partial: Partial<DraftDepositState>) => {
    setDraftDeposit((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetDraftDeposit = useCallback(() => {
    setDraftDeposit(initialDraft);
  }, []);

  return (
    <RecycleContext.Provider
      value={{
        wallet,
        walletLoading,
        refreshWallet,
        selectedBank,
        setSelectedBank,
        selectedDeposit,
        setSelectedDeposit,
        draftDeposit,
        updateDraftDeposit,
        resetDraftDeposit,
      }}
    >
      {children}
    </RecycleContext.Provider>
  );
};

export const useRecycle = () => {
  const context = useContext(RecycleContext);
  if (!context) {
    throw new Error("useRecycle must be used within a RecycleProvider");
  }
  return context;
};
