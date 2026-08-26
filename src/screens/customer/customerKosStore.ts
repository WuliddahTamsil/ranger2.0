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

let selectedKost: SelectedKost | null = null;

export const setSelectedKost = (kost: SelectedKost | null) => {
  selectedKost = kost;
};

export const getSelectedKost = () => {
  return selectedKost;
};
