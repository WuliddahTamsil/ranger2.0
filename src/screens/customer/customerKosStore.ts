export type LodgingCategoryType = "kost" | "hotel" | "wisata";

export interface HotelRoomOption {
  _id?: string;
  id?: string;
  roomId?: string;
  roomName: string;
  bedType: string;
  capacity: number;
  pricePerNight: number;
  isAvailable: boolean;
  facilities: string[];
  images: string[];
  breakfastIncluded?: boolean;
}

export interface WisataTicketOption {
  _id?: string;
  id?: string;
  ticketId?: string;
  ticketName: string;
  ticketType: "reguler" | "terusan" | "vip" | "weekend";
  price: number;
  description: string;
  includedFacilities: string[];
}

export interface SelectedKost {
  _id?: string;
  id?: string;
  categoryType?: LodgingCategoryType; // "kost" | "hotel" | "wisata"
  name: string;
  type: string; // e.g., "Putra" | "Putri" | "Campur" | "Hotel Bintang 4" | "Villa" | "Wisata Alam" | "Waterpark"
  address: string;
  city?: string;
  price: number; // For kost: price/mo; for hotel: price/night; for wisata: price/ticket
  dpAmount?: number;
  description?: string;
  facilities: string[];
  rules?: string[];
  images: string[];
  rating?: number;
  reviewCount?: number;
  stars?: number; // For hotel (1-5)
  openHours?: string; // For wisata (e.g. "08:00 - 17:00")
  highlights?: string[]; // For wisata & hotel
  locationMapUrl?: string;

  // Kost rooms
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

  // Hotel rooms
  hotelRooms?: HotelRoomOption[];

  // Wisata tickets
  wisataTickets?: WisataTicketOption[];

  bankAccount?: {
    paymentType?: "bank" | "qris";
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrisImage?: string;
  };
  ownerId?: any;
}

export interface ActiveCustomerBooking {
  _id?: string;
  bookingCode: string;
  categoryType?: LodgingCategoryType; // "kost" | "hotel" | "wisata"
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  kostId: string;
  kostName: string;
  kostAddress?: string;
  kostImage?: string;
  roomId?: string;
  roomNumber?: string;
  roomType?: string;
  entryDate: string; // Or check-in date or visit date
  checkOutDate?: string; // For hotel
  durationMonths?: number; // For kost
  durationNights?: number; // For hotel
  ticketCount?: number; // For wisata
  monthlyPrice?: number;
  pricePerItem?: number;
  totalAmount: number;
  dpAmount: number;
  dpProofImage?: string;
  status: "pending_dp" | "dp_submitted" | "dp_verified" | "rejected" | "active" | "completed" | "cancelled";
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
  ownerPhone?: string;
  ownerName?: string;
  eTicketBarcode?: string; // For wisata & hotel instant voucher
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
