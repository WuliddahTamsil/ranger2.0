export type Screen =
  | "splash" | "onboarding" | "login" | "role"
  | "daftar_mitra_step1" | "daftar_mitra_step2" | "daftar_mitra_step3"
  | "auth_register_role" | "auth_register" | "auth_register_success" | "auth_forgot_password"
  | "c_home" | "c_marketplace" | "c_catering" | "c_laundry" | "c_laundry_detail" | "c_kos" | "c_product_detail"
  | "c_checkout" | "c_order_success" | "c_tracking"
  | "c_catering_detail" | "c_catering_payment" | "c_catering_qris"
  | "c_catering_tracking"
  | "c_kos_detail" | "c_laundry_tracking"
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
  | "admin_home";

export type Role =
  | "customer"
  | "driver"
  | "pemilik_catering"
  | "pemilik_marketplace"
  | "pemilik_laundry"
  | "pemilik_kos"
  | "admin";

export type Nav = {
  navigate: (s: Screen) => void;
};

export interface CustomerAddress {
  id: string;
  label: string;
  receiverName: string;
  phoneNumber: string;
  fullAddress: string;
  notes: string;
  isMain: boolean;
}

export interface Product {
  id: number | string;
  name: string;
  store: string;
  price: number;
  rating: number;
  sold: number;
  img: string;
  liked: boolean;
  cat: string;
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
  paymentReference?: string;
  paymentHistory?: any[];
  cateringDate?: string;
  cateringPortions?: number;
  cateringTime?: string;
  notes?: string;
  address?: any;
  items?: any[];
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
