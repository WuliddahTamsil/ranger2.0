export interface SelectedCateringShop {
  id: string;
  name: string; // Business name
  ownerId: string;
  isOpen: boolean;
  address: string;
  phone: string;
  profilePhoto?: string;
  description?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  qrisImageUrl?: string;
  bankTransferEnabled?: boolean;
  qrisEnabled?: boolean;
}

let selectedCateringShop: SelectedCateringShop | null = null;

export const setSelectedCateringShop = (shop: SelectedCateringShop | null) => {
  selectedCateringShop = shop;
};

export const getSelectedCateringShop = () => {
  return selectedCateringShop;
};
