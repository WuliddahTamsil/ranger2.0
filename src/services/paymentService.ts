import { API_BASE_URL, getApiUrl } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";

export type PaymentMethodType =
  | "QRIS"
  | "GOPAY"
  | "OVO"
  | "DANA"
  | "SHOPEEPAY"
  | "BCA_VA"
  | "BNI_VA"
  | "BRI_VA"
  | "MANDIRI_VA"
  | "PERMATA_VA"
  | "CASH";

export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";

export interface CreatePaymentParams {
  orderId: string;
  orderModel?: "RideOrder" | "Order";
  paymentMethod: PaymentMethodType;
  amount: number;
  customerPhone?: string;
  customerEmail?: string;
}

export interface PaymentDetails {
  _id: string;
  paymentId: string;
  orderId: string;
  orderModel: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  status: PaymentStatus;
  qrisString?: string;
  qrString?: string;
  vaNumber?: string;
  bankName?: string;
  deepLink?: string;
  deepLinkUrl?: string;
  qrCodeUrl?: string;
  virtualAccount?: {
    bank?: string;
    vaNumber?: string;
    accountName?: string;
    expiryTime?: string;
  };
  expiresAt?: string;
  paidAt?: string;
  createdAt?: string;
}

const getAuthHeaders = async (accountId?: string): Promise<Record<string, string>> => {
  try {
    const [accountsRaw, sessionRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_ACCOUNTS_KEY),
      AsyncStorage.getItem(AUTH_SESSION_KEY),
    ]);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const requestedAccountId = accountId || session?.accountId;
    const account = Array.isArray(accounts)
      ? accounts.find((item: any) => String(item.id) === String(requestedAccountId))
      : null;
    return account?.token ? { Authorization: `Bearer ${account.token}` } : {};
  } catch {
    return {};
  }
};

const readJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Permintaan gagal (HTTP ${res.status}): ${text.slice(0, 100)}`);
  }
};

export const createPayment = async (
  params: CreatePaymentParams,
  accountId?: string
): Promise<PaymentDetails> => {
  const headers = await getAuthHeaders(accountId);
  const res = await fetch(getApiUrl("/payments"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(params),
  });

  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(data.message || "Gagal membuat transaksi pembayaran");
  }
  return data.data;
};

export const getPaymentStatus = async (
  paymentId: string,
  accountId?: string
): Promise<PaymentDetails> => {
  const headers = await getAuthHeaders(accountId);
  const res = await fetch(getApiUrl(`/payments/${paymentId}`), {
    headers: {
      ...headers,
    },
  });

  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(data.message || "Gagal memuat status pembayaran");
  }
  return data.data;
};

export const getOrderPayments = async (
  orderId: string,
  accountId?: string
): Promise<PaymentDetails[]> => {
  const headers = await getAuthHeaders(accountId);
  const res = await fetch(getApiUrl(`/payments/order/${orderId}`), {
    headers: {
      ...headers,
    },
  });

  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(data.message || "Gagal memuat pembayaran order");
  }
  return data.data || [];
};

export const simulatePaymentSuccess = async (
  paymentId: string,
  accountId?: string
): Promise<PaymentDetails> => {
  const headers = await getAuthHeaders(accountId);
  const res = await fetch(getApiUrl("/payments/simulate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ paymentId, status: "PAID" }),
  });

  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(data.message || "Gagal simulasi pembayaran");
  }
  return data.data;
};
