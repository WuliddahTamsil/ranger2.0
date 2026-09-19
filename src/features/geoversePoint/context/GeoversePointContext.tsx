import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  PointWalletUI,
  PointLedgerUI,
  PointRedemptionUI,
  PointVoucherUI,
  PointConfigUI,
  PointLedgerQueryParams,
} from "../types/pointTypes";
import {
  fetchPointWallet,
  fetchPointConfig,
  fetchPointLedger,
  fetchAvailableVouchers,
  fetchMyRedemptions,
} from "../services/geoversePointService";
import { subscribeToUserRealtime } from "../../../services/userRealtime";

interface GeoversePointContextType {
  wallet: PointWalletUI | null;
  walletLoading: boolean;
  walletError: string | null;
  refreshWallet: () => Promise<void>;

  ledger: PointLedgerUI[];
  ledgerLoading: boolean;
  refreshLedger: (params?: PointLedgerQueryParams) => Promise<void>;

  availableVouchers: PointVoucherUI[];
  vouchersLoading: boolean;
  refreshVouchers: (service?: string) => Promise<void>;

  myRedemptions: PointRedemptionUI[];
  redemptionsLoading: boolean;
  refreshRedemptions: () => Promise<void>;

  config: PointConfigUI;
  formatPoint: (pts?: number | null) => string;
  formatRupiah: (amt?: number | null) => string;
  pointToRupiah: (pts?: number | null) => number;
}

const DEFAULT_CONFIG: PointConfigUI = {
  pointToRupiahRate: 1,
  minCashRedemptionPoints: 5000,
  features: {
    allowCashRedemption: true,
    allowVoucherRedemption: true,
    allowServicePayment: true,
  },
};

const GeoversePointContext = createContext<GeoversePointContextType | undefined>(undefined);

export const GeoversePointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<PointWalletUI | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [ledger, setLedger] = useState<PointLedgerUI[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);

  const [availableVouchers, setAvailableVouchers] = useState<PointVoucherUI[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState<boolean>(false);

  const [myRedemptions, setMyRedemptions] = useState<PointRedemptionUI[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState<boolean>(false);

  const [config, setConfig] = useState<PointConfigUI>(DEFAULT_CONFIG);

  // Load config on mount
  useEffect(() => {
    fetchPointConfig().then((res) => {
      if (res.success && res.data) {
        setConfig(res.data);
      }
    });
  }, []);

  const refreshWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const res = await fetchPointWallet();
      if (res.success && res.data) {
        setWallet(res.data);
      } else {
        setWalletError(res.message || "Gagal memuat saldo poin.");
      }
    } catch (err: any) {
      setWalletError(err?.message || "Terjadi kesalahan pada jaringan.");
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const refreshLedger = useCallback(async (params?: PointLedgerQueryParams) => {
    setLedgerLoading(true);
    try {
      const res = await fetchPointLedger(params);
      if (res.success && res.data?.ledger) {
        setLedger(res.data.ledger);
      }
    } catch (err) {
      console.error("refreshLedger error:", err);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  const refreshVouchers = useCallback(async (service?: string) => {
    setVouchersLoading(true);
    try {
      const res = await fetchAvailableVouchers(service);
      if (res.success && res.data) {
        setAvailableVouchers(res.data);
      }
    } catch (err) {
      console.error("refreshVouchers error:", err);
    } finally {
      setVouchersLoading(false);
    }
  }, []);

  const refreshRedemptions = useCallback(async () => {
    setRedemptionsLoading(true);
    try {
      const res = await fetchMyRedemptions();
      if (res.success && res.data) {
        setMyRedemptions(res.data);
      }
    } catch (err) {
      console.error("refreshRedemptions error:", err);
    } finally {
      setRedemptionsLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    subscribeToUserRealtime(() => {
      refreshWallet();
      refreshLedger();
      refreshRedemptions();
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [refreshWallet, refreshLedger, refreshRedemptions]);

  // Initial load
  useEffect(() => {
    refreshWallet();
    refreshLedger({ limit: 10 });
    refreshVouchers();
    refreshRedemptions();
  }, [refreshWallet, refreshLedger, refreshVouchers, refreshRedemptions]);

  // Formatters & helpers
  const formatPoint = useCallback((pts?: number | null): string => {
    const val = pts != null ? Math.floor(pts) : 0;
    return `${val.toLocaleString("id-ID")} Pts`;
  }, []);

  const formatRupiah = useCallback((amt?: number | null): string => {
    const val = amt != null ? Math.floor(amt) : 0;
    return `Rp ${val.toLocaleString("id-ID")}`;
  }, []);

  const pointToRupiah = useCallback(
    (pts?: number | null): number => {
      const val = pts != null ? pts : 0;
      return val * (config.pointToRupiahRate || 1);
    },
    [config.pointToRupiahRate]
  );

  const value = useMemo<GeoversePointContextType>(
    () => ({
      wallet,
      walletLoading,
      walletError,
      refreshWallet,
      ledger,
      ledgerLoading,
      refreshLedger,
      availableVouchers,
      vouchersLoading,
      refreshVouchers,
      myRedemptions,
      redemptionsLoading,
      refreshRedemptions,
      config,
      formatPoint,
      formatRupiah,
      pointToRupiah,
    }),
    [
      wallet,
      walletLoading,
      walletError,
      refreshWallet,
      ledger,
      ledgerLoading,
      refreshLedger,
      availableVouchers,
      vouchersLoading,
      refreshVouchers,
      myRedemptions,
      redemptionsLoading,
      refreshRedemptions,
      config,
      formatPoint,
      formatRupiah,
      pointToRupiah,
    ]
  );

  return (
    <GeoversePointContext.Provider value={value}>
      {children}
    </GeoversePointContext.Provider>
  );
};

export const useGeoversePoint = (): GeoversePointContextType => {
  const context = useContext(GeoversePointContext);
  if (!context) {
    throw new Error("useGeoversePoint must be used within a GeoversePointProvider");
  }
  return context;
};
