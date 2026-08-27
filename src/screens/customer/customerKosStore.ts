export interface SelectedKost {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  address: string;
  city?: string;
  price: number;
  dpAmount?: number;
  description?: string;
  facilities: string[];
  rules?: string[];
  images: string[];
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrisImage?: string;
  };
  rooms?: Array<{
    _id?: string;
    roomNumber: string;
    roomType: string;
    floor: number;
    priceMonthly: number;
    priceYearly?: number;
    isAvailable: boolean;
    facilities?: string[];
    images?: string[];
  }>;
  ownerId?: any;
}

export interface ActiveCustomerBooking {
  _id?: string;
  bookingCode: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  kostId: string;
  kostName: string;
  kostAddress?: string;
  kostImage?: string;
  roomId?: string;
  roomNumber: string;
  roomType?: string;
  entryDate: string;
  durationMonths: number;
  monthlyPrice: number;
  totalAmount: number;
  dpAmount: number;
  dpProofImage?: string;
  status: "pending_dp" | "dp_submitted" | "dp_verified" | "rejected" | "active" | "completed" | "cancelled";
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
  ownerPhone?: string;
  ownerName?: string;
}

let selectedKost: SelectedKost | null = null;
let activeCustomerBooking: ActiveCustomerBooking | null = null;
const listeners = new Set<() => void>();

export const setSelectedKost = (kost: SelectedKost | null) => {
  selectedKost = kost;
};

export const getSelectedKost = () => {
  return selectedKost;
};

export const getActiveCustomerBooking = (): ActiveCustomerBooking | null => {
  return activeCustomerBooking;
};

export const setActiveCustomerBooking = (booking: ActiveCustomerBooking | null) => {
  activeCustomerBooking = booking;
  listeners.forEach((l) => l());
};

export const subscribeCustomerBooking = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
