import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  Sparkles,
  Ticket,
  ShieldCheck,
  Check,
  QrCode,
  CreditCard,
  Wallet,
  Banknote,
  AlertTriangle,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useShopCart } from "../../../context/ShopCartContext";
import { useRecycle } from "../../../context/RecycleContext";
import { createShopOrder } from "../../../services/shopService";
import { getPrimaryCustomerAddress } from "../../../services/customerAddressService";
import { DeliverySlotSelector, DeliverySlotState } from "../../../components/shop/DeliverySlotSelector";
import { PrescriptionUploadCard } from "../../../components/shop/PrescriptionUploadCard";
import { MarketplaceDigitalPaymentModal } from "../../../components/MarketplaceDigitalPaymentModal";
import { rp } from "../../../utils/formatters";

interface ShopCheckoutScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

type PaymentMethodType = "QRIS" | "BCA_VA" | "MANDIRI_VA" | "GOPAY" | "OVO" | "DANA" | "CASH";

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethodType;
  title: string;
  sub: string;
  icon: any;
}> = [
  { id: "QRIS", title: "QRIS Instan", sub: "Scan via BCA, Livin, GoPay, OVO, ShopeePay", icon: QrCode },
  { id: "BCA_VA", title: "BCA Virtual Account", sub: "Transfer otomatis via BCA Mobile / ATM", icon: CreditCard },
  { id: "MANDIRI_VA", title: "Mandiri Virtual Account", sub: "Transfer via Livin' by Mandiri", icon: CreditCard },
  { id: "GOPAY", title: "GoPay / E-Wallet", sub: "Buka aplikasi GoPay langsung", icon: Wallet },
  { id: "CASH", title: "Bayar di Tempat (COD)", sub: "Bayar tunai ke kurir saat barang sampai", icon: Banknote },
];

export const ShopCheckoutScreen: React.FC<ShopCheckoutScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const {
    activeStore,
    items,
    substitutionPolicy,
    storeNotes,
    subtotal,
    estimatedDeliveryFee,
    serviceFee,
    clearCart,
  } = useShopCart();

  const { wallet } = useRecycle();
  const userPoints = wallet?.balancePoint || 0;

  const primaryAddress = getPrimaryCustomerAddress(authAccount);

  const [deliverySlot, setDeliverySlot] = useState<DeliverySlotState>({ type: "INSTANT" });
  const [driverNotes, setDriverNotes] = useState("");
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>("QRIS");

  const [prescriptionData, setPrescriptionData] = useState<{
    imageUrls: string[];
    doctorName: string;
    customerNotes: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  const hasPrescriptionItem = items.some((it) => it.product.requiresPrescription);

  // Voucher discount calculation
  const voucherDiscount = appliedVoucher?.discount || 0;

  // Max points usable is capped by remaining total and user balance
  const rawTotalBeforePoints = subtotal + estimatedDeliveryFee + serviceFee - voucherDiscount;
  const maxPointsUsable = Math.min(userPoints, Math.max(0, rawTotalBeforePoints));
  const pointDiscount = usePoints ? maxPointsUsable : 0;

  const finalTotalAmount = Math.max(0, rawTotalBeforePoints - pointDiscount);

  const handleApplyVoucher = () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (code === "KANYAAHHEMAT" || code === "LOKAL20") {
      setAppliedVoucher({ code, discount: 10000 });
      Alert.alert("Voucher Berhasil", "Potongan diskon Rp10.000 berhasil diterapkan!");
    } else {
      Alert.alert("Voucher Tidak Valid", "Kode voucher tidak ditemukan atau sudah habis masa berlakunya.");
    }
  };

  const handlePlaceOrder = async () => {
    if (!activeStore || items.length === 0) {
      Alert.alert("Perhatian", "Keranjang belanja kosong.");
      return;
    }

    if (!primaryAddress?.fullAddress) {
      Alert.alert("Perhatian", "Silakan pilih alamat pengiriman terlebih dahulu.");
      return;
    }

    if (hasPrescriptionItem && (!prescriptionData || prescriptionData.imageUrls.length === 0)) {
      Alert.alert(
        "Wajib Resep Dokter",
        "Pesanan ini memuat obat yang memerlukan resep dokter. Silakan unggah foto resep terlebih dahulu."
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        storeId: activeStore._id,
        items: items.map((it) => ({
          productId: it.product._id,
          quantity: it.quantity,
          notes: it.notes || "",
          requestedSubstitution: it.substitutionPreference || substitutionPolicy,
        })),
        deliveryAddress: primaryAddress.fullAddress,
        deliveryLatitude: primaryAddress.latitude,
        deliveryLongitude: primaryAddress.longitude,
        deliveryNotes: `${driverNotes} ${storeNotes ? `(Catatan toko: ${storeNotes})` : ""}`.trim(),
        deliverySlot,
        substitutionPolicy,
        voucherCode: appliedVoucher?.code || "",
        usePoints,
        pointsToUse: pointDiscount,
        paymentMethod: selectedPayment,
      };

      const res = await createShopOrder(payload);

      if (res.success && res.data) {
        clearCart();
        const orderData = res.data;
        setCreatedOrder(orderData);

        if (selectedPayment === "CASH" || orderData.totalAmount === 0) {
          // Direct to order detail / tracking
          Alert.alert("Pesanan Berhasil", "Pesanan telah diteruskan ke toko untuk diproses.", [
            {
              text: "Lihat Pesanan",
              onPress: () => (navigate as any)("c_shop_order_detail", { orderId: orderData._id }),
            },
          ]);
        } else {
          // Open digital payment modal (QRIS / VA / E-Wallet)
          setPaymentModalVisible(true);
        }
      } else {
        Alert.alert("Gagal Membuat Pesanan", res.message || "Silakan periksa kembali keranjang Anda.");
      }
    } catch (e: any) {
      console.warn("handlePlaceOrder error:", e);
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate("c_shop_cart")} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Checkout Pesanan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isLarge && { maxWidth: 880, alignSelf: "center", width: "100%" }]}
      >
        {/* 1. Delivery Address Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <MapPin size={16} color="#15803D" />
              <Text style={styles.cardTitle}>Alamat Pengantaran</Text>
            </View>
            <TouchableOpacity onPress={() => navigate("c_addresses")} activeOpacity={0.7}>
              <Text style={styles.actionLink}>Ganti Alamat</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addressBody}>
            <Text style={styles.receiverName}>{primaryAddress?.receiverName || authAccount?.name || "Pelanggan GEOVERSE"}</Text>
            <Text style={styles.phoneNumber}>{primaryAddress?.phoneNumber || authAccount?.phone || "-"}</Text>
            <Text style={styles.fullAddressText}>{primaryAddress?.fullAddress || "Belum ada alamat tersimpan"}</Text>
            {primaryAddress?.accessType ? (
              <View style={styles.accessChip}>
                <Text style={styles.accessChipText}>{primaryAddress.accessType}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 2. Delivery Option & Slot Selector */}
        <DeliverySlotSelector
          value={deliverySlot}
          onChange={setDeliverySlot}
          instantEtaMinutes={activeStore?.estimatedDeliveryMinutes || 25}
        />

        {/* 3. Driver Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Catatan untuk Driver / Kurir</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Contoh: Titipkan di satpam, pagar hitam, bel pintu bunyi..."
            placeholderTextColor="#9CA3AF"
            value={driverNotes}
            onChangeText={setDriverNotes}
            maxLength={150}
          />
        </View>

        {/* 4. Pharmacy Prescription Upload if applicable */}
        {hasPrescriptionItem && (
          <PrescriptionUploadCard onUploaded={(data) => setPrescriptionData(data)} />
        )}

        {/* 5. Voucher Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ticket size={16} color="#15803D" />
              <Text style={styles.cardTitle}>Voucher Promo</Text>
            </View>
          </View>

          <View style={styles.voucherRow}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Masukkan kode voucher..."
              placeholderTextColor="#9CA3AF"
              value={voucherCodeInput}
              onChangeText={setVoucherCodeInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.applyVoucherBtn}
              onPress={handleApplyVoucher}
              activeOpacity={0.8}
            >
              <Text style={styles.applyVoucherText}>Terapkan</Text>
            </TouchableOpacity>
          </View>

          {appliedVoucher && (
            <View style={styles.appliedVoucherBadge}>
              <Check size={14} color="#15803D" />
              <Text style={styles.appliedVoucherText}>
                Voucher {appliedVoucher.code} aktif (-{rp(appliedVoucher.discount)})
              </Text>
            </View>
          )}
        </View>

        {/* 6. GEOVERSE Points Card */}
        <View style={styles.sectionCard}>
          <View style={styles.pointRow}>
            <View style={styles.pointLeft}>
              <View style={styles.pointIconCircle}>
                <Sparkles size={16} color="#FBBF24" />
              </View>
              <View>
                <Text style={styles.pointTitle}>Tukar GEOVERSE Point</Text>
                <Text style={styles.pointSub}>
                  Saldo: {userPoints.toLocaleString("id-ID")} Pts (Hemat {rp(maxPointsUsable)})
                </Text>
              </View>
            </View>

            <Switch
              value={usePoints}
              onValueChange={(val) => {
                if (val && userPoints <= 0) {
                  Alert.alert("Point Kosong", "Setor sampah di Kanyaah Recycle untuk mengumpulkan Point!");
                  return;
                }
                setUsePoints(val);
              }}
              trackColor={{ false: "#E5E7EB", true: "#DCFCE7" }}
              thumbColor={usePoints ? "#15803D" : "#9CA3AF"}
            />
          </View>
        </View>

        {/* 7. Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Metode Pembayaran</Text>

          <View style={styles.paymentList}>
            {PAYMENT_OPTIONS.map((opt) => {
              const isSelected = selectedPayment === opt.id;
              const IconComp = opt.icon;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.paymentItem, isSelected && styles.selectedPaymentItem]}
                  onPress={() => setSelectedPayment(opt.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.paymentIconBg, isSelected && styles.selectedPaymentIconBg]}>
                    <IconComp size={18} color={isSelected ? "#15803D" : "#4B5563"} />
                  </View>
                  <View style={styles.paymentTextCol}>
                    <Text style={[styles.paymentTitle, isSelected && styles.selectedPaymentTitle]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.paymentSub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.paymentRadio, isSelected && styles.selectedPaymentRadio]}>
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 8. Order Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Rincian Pembayaran</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Produk ({items.length} item)</Text>
            <Text style={styles.summaryVal}>{rp(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Pengiriman</Text>
            <Text style={styles.summaryVal}>{rp(estimatedDeliveryFee)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan</Text>
            <Text style={styles.summaryVal}>{rp(serviceFee)}</Text>
          </View>

          {voucherDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#15803D" }]}>Diskon Voucher</Text>
              <Text style={[styles.summaryVal, { color: "#15803D" }]}>-{rp(voucherDiscount)}</Text>
            </View>
          )}

          {pointDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#F59E0B" }]}>Diskon GEOVERSE Point</Text>
              <Text style={[styles.summaryVal, { color: "#F59E0B" }]}>-{rp(pointDiscount)}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalVal}>{rp(finalTotalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalCol}>
          <Text style={styles.bottomTotalLabel}>Total Bayar</Text>
          <Text style={styles.bottomTotalVal}>{rp(finalTotalAmount)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, submitting && styles.payButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Bayar & Pesan Sekarang</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Digital Payment Modal */}
      {createdOrder && (
        <MarketplaceDigitalPaymentModal
          visible={paymentModalVisible}
          order={createdOrder}
          onClose={() => {
            setPaymentModalVisible(false);
            (navigate as any)("c_shop_order_detail", { orderId: createdOrder._id });
          }}
          onPaymentSuccess={() => {
            setPaymentModalVisible(false);
            (navigate as any)("c_shop_order_detail", { orderId: createdOrder._id });
          }}
        />
      )}
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  actionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  addressBody: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  receiverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  phoneNumber: {
    fontSize: 12,
    color: "#6B7280",
    marginVertical: 2,
  },
  fullAddressText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    marginTop: 4,
  },
  accessChip: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  accessChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  inputField: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
    marginTop: 8,
  },
  voucherRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#1F2937",
  },
  applyVoucherBtn: {
    backgroundColor: "#15803D",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  applyVoucherText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  appliedVoucherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  appliedVoucherText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pointIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  pointSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  paymentList: {
    gap: 8,
    marginTop: 10,
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  selectedPaymentItem: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  paymentIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  selectedPaymentIconBg: {
    backgroundColor: "#DCFCE7",
  },
  paymentTextCol: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectedPaymentTitle: {
    color: "#15803D",
  },
  paymentSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedPaymentRadio: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomTotalCol: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  bottomTotalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  payButton: {
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  payButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
