export type Screen =
  | "splash" | "onboarding" | "login" | "role"
  | "daftar_mitra_step1" | "daftar_mitra_step2" | "daftar_mitra_step3"
  | "auth_register_role" | "auth_register" | "auth_register_success" | "auth_forgot_password"
  | "c_home" | "c_addresses" | "c_marketplace" | "c_catering" | "c_laundry" | "c_laundry_detail" | "c_kos" | "c_product_detail"
  | "c_checkout" | "c_order_success" | "c_tracking"
  | "c_catering_detail" | "c_catering_payment" | "c_catering_qris"
  | "c_catering_tracking"
  | "c_kos_detail" | "c_laundry_tracking"
  | "c_ride" | "c_ride_tracking"
  | "c_send" | "c_send_location" | "c_send_recipient" | "c_send_package" | "c_send_fare"
  | "c_send_payment" | "c_send_confirm" | "c_send_searching" | "c_send_tracking" | "c_send_delivery_detail"
  | "c_recycle_home" | "c_recycle_banks" | "c_recycle_bank_detail" | "c_recycle_deposit_form"
  | "c_recycle_pickup_schedule" | "c_recycle_tracking" | "c_recycle_weighing_result"
  | "c_recycle_wallet" | "c_recycle_ledger" | "c_recycle_redemption"
  | "c_point_home" | "c_point_ledger" | "c_point_vouchers" | "c_point_redeem_cash" | "c_point_redemption_detail" | "c_point_how_it_works"
  | "c_shop_home" | "c_shop_discovery" | "c_shop_store" | "c_shop_cart" | "c_shop_checkout" | "c_shop_order_detail"
  | "shop_merchant_orders"
  | "bank_sampah_dashboard" | "bank_sampah_weighing"
  | "d_home"
  | "pemilik_catering_home"
  | "pemilik_marketplace_home"
  | "pemilik_laundry_home"
  | "pemilik_laundry_order"
  | "pemilik_laundry_user"
  | "pemilik_laundry_riwayat"
  | "pemilik_laundry_pendapatan"
  | "pemilik_laundry_profil"
  | "pemilik_kos_home"
  | "pemilik_kos_manajemen_kamar"
  | "pemilik_kos_manajemen_penghuni"
  | "pemilik_kos_laporan_keuangan"
  | "pemilik_kos_profil"
  | "pemilik_kos_verifikasi_dp"
  | "pemilik_kos_kirim_pengingat"
  | "waiting_approval"
  | "admin_home";

export type Role =
  | "customer"
  | "driver"
  | "pemilik_catering"
  | "pemilik_marketplace"
  | "pemilik_laundry"
  | "pemilik_kos"
  | "bank_sampah"
  | "admin_sampah"
  | "admin";

export type Nav = {
  navigate: (s: Screen, params?: Record<string, any>) => void;
};

export type AddressLabel = "Rumah" | "Kos" | "Kantor" | "Lainnya";
export type AddressAccessType =
  | "Gang sempit"
  | "Bisa dilalui mobil"
  | "Hanya bisa dilalui motor"
  | "Jalan utama"
  | "Perlu masuk gang"
  | "Hanya kendaraan tertentu";

export interface CustomerAddress {
  id: string;
  label: AddressLabel;
  receiverName: string;
  phoneNumber: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  postalCode?: string;
  street?: string;
  houseNumber?: string;
  rt?: string;
  rw?: string;
  fullAddress: string;
  notes: string;
  accessType?: AddressAccessType;
  latitude?: number;
  longitude?: number;
  detectedAddress?: string;
  isMain: boolean;
  updatedAt?: string;
}

export interface Product {
  id: number | string;
  name: string;
  store: string;
  price: number;
  rating: number;
  sold: number;
  img: string;
  images?: string[];
  liked: boolean;
  cat: string;
  description?: string;
  stock?: number;
  isActive?: boolean;
  ownerId?: string;
}

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  rating: number;
  distance: number;
  minOrder: number;
  img: string;
  tags: string[];
  open: boolean;
  priceStarts: number;
}

export interface Laundry {
  id: number;
  name: string;
  address: string;
  price: number;
  rating: number;
  open: boolean;
  distance: string;
  type: string;
  img: string;
}

export interface KosItem {
  id: number;
  name: string;
  address: string;
  price: number;
  type: string;
  facilities: string[];
  available: boolean;
  img: string;
}

export type CateringPaymentOption = "lunas" | "dp30" | "dp50";

export interface OrderItem {
  id: string;
  orderCode?: string;
  createdAt?: string;
  type: string;
  iconName: string;
  color: string;
  item: string;
  detail: string;
  status: string;
  statusColor: string;
  date: string;
  total: number;
  deliveryFee?: number;
  serviceFee?: number;
  discount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentOption?: CateringPaymentOption;
  paidAmount?: number;
  remainingAmount?: number;
  paymentDueDate?: string;
  paymentReminder?: string;
  paymentBankName?: string;
  paymentAccountNumber?: string;
  paymentAccountHolder?: string;
  paymentQrisImageUrl?: string;
  paymentReference?: string;
  paymentHistory?: any[];
  deliveryProofUrl?: string;
  cateringDate?: string;
  cateringPortions?: number;
  cateringTime?: string;
  notes?: string;
  address?: any;
  items?: any[];
  // Ride specific
  pickup?: { address: string; latitude?: number; longitude?: number; placeName?: string };
  destination?: { address: string; latitude?: number; longitude?: number; placeName?: string };
  customerNote?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  driverRating?: number;
  driverVehicle?: string;
  driverPlate?: string;
  estimatedDistance?: number;
  estimatedDuration?: number;
  estimatedFare?: number;
}

export interface NotifItem {
  id: number;
  type: string;
  title: string;
  msg: string;
  time: string;
  read: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  cat: string;
  date: string;
  img: string;
}

export interface DriverOrder {
  id: string;
  type: string;
  from: string;
  to: string;
  dist: string;
  pay: number;
  time: string;
}

export type SendPackageCategory =
  | "Dokumen"
  | "Makanan"
  | "Pakaian"
  | "Elektronik"
  | "Barang rumah tangga"
  | "Paket kecil"
  | "Paket besar"
  | "Barang mudah pecah"
  | "Lainnya";

export interface SendPartyData {
  name: string;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  locationInstruction?: string;
  preferredDeliveryTime?: string;
}

export interface SendPackageData {
  name: string;
  category: SendPackageCategory;
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fragile: boolean;
  specialHandling?: boolean;
  declaredValue: number;
  photoUrls: string[];
  notes?: string;
}

export interface SendFareBreakdown {
  distanceKm: number;
  estimatedDurationMinutes: number;
  baseFare: number;
  distanceFare: number;
  weightFare: number;
  sizeFare: number;
  fragileFee: number;
  insuranceFee: number;
  serviceFee: number;
  discount: number;
  minimumFare: number;
  estimatedFare: number;
  finalFare?: number;
  driverEarnings?: number;
  currency?: string;
  breakdownNote?: string;
}

export interface SendOrderUI {
  _id: string;
  orderCode: string;
  serviceType: string;
  customerId: string | any;
  driverId?: string | any;
  sender: SendPartyData;
  recipient: SendPartyData;
  package: SendPackageData;
  pricing: SendFareBreakdown;
  distanceKm: number;
  estimatedDurationMinutes: number;
  paymentMethod: string;
  paymentStatus: string;
  pickupCodeRaw?: string;
  deliveryOtpRaw?: string;
  pickupProofUrls?: string[];
  deliveryProofUrls?: string[];
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  };
  status:
    | "CREATED"
    | "PAYMENT_PENDING"
    | "SEARCHING_DRIVER"
    | "DRIVER_ASSIGNED"
    | "DRIVER_ON_THE_WAY_TO_PICKUP"
    | "DRIVER_ARRIVED_AT_PICKUP"
    | "PICKUP_VERIFICATION"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "ARRIVED_AT_DESTINATION"
    | "DELIVERY_VERIFICATION"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "RETURN_REQUESTED"
    | "DISPUTED";
  statusHistory?: {
    status: string;
    note?: string;
    createdAt?: string;
  }[];
  rating?: {
    score: number;
    review: string;
  };
  cancellation?: {
    fee: number;
    reason: string;
    refundAmount: number;
  };
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

