export interface SelectedCateringShop {
  id: string;
  name: string; // Business name
  ownerId: string;
  isOpen: boolean;
  address: string;
  phone: string;
  profilePhoto?: string;
  coverImage?: string;
  topMenuName?: string;
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

let activeCateringPaymentOrder: any = null;

export const setActiveCateringPaymentOrder = (order: any) => {
  activeCateringPaymentOrder = order;
};

export const getActiveCateringPaymentOrder = () => {
  return activeCateringPaymentOrder;
};

let activeCateringTrackingOrderId: string | null = null;

export const setActiveCateringTrackingOrderId = (orderId: string | null) => {
  activeCateringTrackingOrderId = orderId;
};

export const getActiveCateringTrackingOrderId = () => {
  return activeCateringTrackingOrderId;
};

