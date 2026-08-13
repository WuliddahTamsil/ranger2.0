import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Truck,
  UserRound,
  WalletCards,
  X,
  MessageCircle,
} from "lucide-react-native";
import { BackHeader } from "../../components/BackHeader";
import { Stars } from "../../components/Stars";
import { PRODUCTS } from "../../constants/mockData";
import { Nav, Product } from "../../types";
import { rp } from "../../utils/formatters";
import { addCustomerOrder } from "./customerOrderStore";
import { CustomerChatModal } from "./CustomerChatModal";

type MarketplaceView = "catalog" | "cart" | "checkout" | "success";
type MarketplaceTab = "menu" | "profile" | "reviews";
type PaymentMethod = "qris" | "gopay" | "bca_va" | "cod";

interface CartLine {
  product: Product;
  qty: number;
}

const paymentMethods: Array<{
  id: PaymentMethod;
  name: string;
  subtitle: string;
  color: string;
}> = [
  { id: "qris", name: "QRIS", subtitle: "Scan dengan aplikasi pembayaran", color: "#0D7A53" },
  { id: "gopay", name: "GoPay", subtitle: "Bayar instan dengan GoPay", color: "#00AED6" },
  { id: "bca_va", name: "BCA Virtual Account", subtitle: "Transfer otomatis", color: "#003C93" },
  { id: "cod", name: "Bayar di Tempat", subtitle: "Bayar saat pesanan diterima", color: "#D97706" },
];

const reviewItems = [
  { name: "Aisyah P.", rating: 5, date: "2 hari lalu", text: "Produk sesuai foto, packing rapi, dan dikirim cepat." },
  { name: "Rahman H.", rating: 5, date: "5 hari lalu", text: "Harga terjangkau. Admin tokonya responsif saat ditanya." },
  { name: "Siti Nur.", rating: 4, date: "1 minggu lalu", text: "Barang bagus dan aman sampai rumah." },
];

export const MarketplaceScreen: React.FC<Nav> = ({ navigate }) => {
  const [view, setView] = useState<MarketplaceView>("catalog");
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("menu");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [address, setAddress] = useState("Rumah - Jl. Raya Kamojang No. 12");
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("qris");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const categories = ["Semua", "Makanan", "Fashion", "Minuman", "Kesehatan", "Kerajinan"];
  const filteredProducts = category === "Semua" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === category);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const deliveryFee = cart.length > 0 ? 8000 : 0;
  const serviceFee = cart.length > 0 ? 2000 : 0;
  const discount = promoApplied ? 5000 : 0;
  const total = Math.max(0, subtotal + deliveryFee + serviceFee - discount);
  const selectedPaymentLabel = paymentMethods.find((method) => method.id === selectedPayment)?.name || "QRIS";

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...current, { product, qty: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId ? { ...line, qty: line.qty + delta } : line
        )
        .filter((line) => line.qty > 0)
    );
  };

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "LOKAL20") {
      setPromoApplied(true);
      return;
    }
    setPromoApplied(false);
  };

  const handleBack = () => {
    if (view === "catalog") {
      navigate("c_home");
    } else if (view === "cart") {
      setView("catalog");
    } else if (view === "checkout") {
      setView("cart");
    } else {
      setView("catalog");
    }
  };

  const completeMarketplaceOrder = () => {
    const orderId = `RNG-MKT-${Date.now().toString().slice(-6)}`;
    const firstLine = cart[0];
    addCustomerOrder({
      id: orderId,
      type: "Marketplace",
      iconName: "Store",
      color: "#1B7A4E",
      item: firstLine?.product.name || "Pesanan Marketplace",
      detail: firstLine ? `${firstLine.product.store} • ${itemCount} item` : "Marketplace UMKM",
      status: "Diproses",
      statusColor: "orange",
      date: "Hari ini",
      total,
      deliveryFee,
      serviceFee,
      discount: discount || undefined,
      paymentMethod: selectedPaymentLabel,
      paymentStatus: selectedPayment === "cod" ? "Bayar di tempat" : "Lunas",
      paidAmount: selectedPayment === "cod" ? 0 : total,
      remainingAmount: selectedPayment === "cod" ? total : 0,
      paymentReminder: selectedPayment === "cod" ? "Pembayaran dilakukan saat pesanan diterima." : "Pembayaran sudah lunas.",
      paymentReference: `PAY-${Date.now().toString().slice(-8)}`,
      paymentHistory: [{ type: selectedPaymentLabel, amount: selectedPayment === "cod" ? 0 : total, date: "Hari ini" }],
      address,
    });
    setPaymentModalVisible(false);
    setView("success");
  };

  const headerTitle = useMemo(() => {
    if (view === "cart") return "Keranjang Belanja";
    if (view === "checkout") return "Checkout Marketplace";
    if (view === "success") return "Pesanan Berhasil";
    return "Marketplace UMKM";
  }, [view]);

  const renderStoreHeader = () => (
    <View style={styles.storeHeader}>
      <View style={styles.storeLogo}>
        <Store size={25} color="#1B7A4E" />
      </View>
      <View style={styles.storeHeaderText}>
        <Text style={styles.storeName}>Marketplace UMKM</Text>
        <View style={styles.storeMetaRow}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.storeMetaText}>4.8</Text>
          <Text style={styles.storeMetaDot}>•</Text>
          <Text style={styles.storeMetaText}>1.2k terjual</Text>
          <Text style={styles.storeMetaDot}>•</Text>
          <Text style={styles.storeOpenText}>Buka</Text>
        </View>
      </View>
      <View style={styles.storeHeaderActions}>
        <TouchableOpacity style={styles.storeInfoButton} onPress={() => setChatVisible(true)}>
          <MessageCircle size={17} color="#1B7A4E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.storeInfoButton} onPress={() => setActiveTab("profile")}>
          <ChevronRight size={18} color="#1B7A4E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMenu = () => (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.categoryPill, category === item && styles.categoryPillActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionTitle}>Menu Pilihan</Text>
          <Text style={styles.sectionSubtitle}>Produk UMKM pilihan untuk kebutuhanmu</Text>
        </View>
        <Text style={styles.productCount}>{filteredProducts.length} produk</Text>
      </View>

      <View style={styles.productGrid}>
        {filteredProducts.map((product) => {
          const line = cart.find((item) => item.product.id === product.id);
          return (
            <View key={product.id} style={styles.productCard}>
              <Image source={{ uri: product.img }} style={styles.productImage} />
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productStore} numberOfLines={1}>{product.store}</Text>
                <View style={styles.productRatingRow}>
                  <Stars rating={product.rating} />
                  <Text style={styles.soldText}>{product.sold} terjual</Text>
                </View>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>{rp(product.price)}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={() => addToCart(product)} activeOpacity={0.8}>
                    <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
                {line && <Text style={styles.addedText}>{line.qty} di keranjang</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );

  const renderProfile = () => (
    <View style={styles.profileContent}>
      <View style={styles.profileHero}>
        <View style={styles.profileLogoLarge}><Store size={38} color="#1B7A4E" /></View>
        <Text style={styles.profileStoreName}>Marketplace UMKM</Text>
        <Text style={styles.profileTagline}>Belanja produk lokal, dukung UMKM</Text>
        <View style={styles.profileRatingRow}>
          <Stars rating={4.8} />
          <Text style={styles.profileRatingText}>4.8 dari 5 • 248 ulasan</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}><MapPin size={18} color="#1B7A4E" /><Text style={styles.infoText}>Ring 1 Kamojang, Kabupaten Bandung</Text></View>
        <View style={styles.infoRow}><Clock3 size={18} color="#1B7A4E" /><Text style={styles.infoText}>Buka setiap hari, 08.00 - 21.00</Text></View>
        <View style={styles.infoRow}><Truck size={18} color="#1B7A4E" /><Text style={styles.infoText}>Pengiriman mulai Rp8.000</Text></View>
      </View>

      <Text style={styles.contentTitle}>Tentang Toko</Text>
      <Text style={styles.descriptionText}>
        Marketplace UMKM menghubungkan kamu dengan produk makanan, minuman, kerajinan, dan kebutuhan harian dari pelaku UMKM lokal Kamojang.
      </Text>
      <View style={styles.ownerCard}>
        <View style={styles.ownerAvatar}><UserRound size={20} color="#1B7A4E" /></View>
        <View style={{ flex: 1 }}><Text style={styles.ownerName}>Mitra UMKM Kamojang</Text><Text style={styles.ownerSub}>Aktif membalas pesan dalam 5 menit</Text></View>
        <ShieldCheck size={20} color="#1B7A4E" />
      </View>
    </View>
  );

  const renderReviews = () => (
    <View style={styles.profileContent}>
      <View style={styles.reviewSummary}>
        <Text style={styles.reviewScore}>4.8</Text>
        <View><Stars rating={4.8} /><Text style={styles.reviewSummaryText}>248 ulasan pelanggan</Text></View>
      </View>
      {reviewItems.map((review) => (
        <View key={review.name} style={styles.reviewCard}>
          <View style={styles.reviewTopRow}>
            <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>{review.name.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.reviewerName}>{review.name}</Text><Stars rating={review.rating} /></View>
            <Text style={styles.reviewDate}>{review.date}</Text>
          </View>
          <Text style={styles.reviewText}>{review.text}</Text>
        </View>
      ))}
    </View>
  );

  const renderCatalog = () => (
    <View style={styles.flexOne}>
      <ScrollView contentContainerStyle={styles.catalogContent} showsVerticalScrollIndicator={false}>
        {renderStoreHeader()}
        <View style={styles.tabRow}>
          {[
            { id: "menu" as MarketplaceTab, label: "Menu" },
            { id: "profile" as MarketplaceTab, label: "Profil Toko" },
            { id: "reviews" as MarketplaceTab, label: "Ulasan" },
          ].map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === "menu" ? renderMenu() : activeTab === "profile" ? renderProfile() : renderReviews()}
      </ScrollView>
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <View><Text style={styles.cartBarLabel}>{itemCount} item di keranjang</Text><Text style={styles.cartBarTotal}>{rp(subtotal)}</Text></View>
          <TouchableOpacity style={styles.cartBarButton} onPress={() => setView("cart")}><ShoppingBag size={17} color="#FFFFFF" /><Text style={styles.cartBarButtonText}>Lihat Keranjang</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCart = () => (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.storeMiniCard}><View style={styles.storeMiniIcon}><Store size={19} color="#1B7A4E" /></View><View style={{ flex: 1 }}><Text style={styles.storeMiniName}>Marketplace UMKM</Text><Text style={styles.storeMiniSub}>Pesanan dari satu toko</Text></View><CheckCircle2 size={19} color="#1B7A4E" /></View>
      {cart.map((line) => (
        <View key={line.product.id} style={styles.cartLine}>
          <Image source={{ uri: line.product.img }} style={styles.cartImage} />
          <View style={styles.cartLineBody}><Text style={styles.cartProductName} numberOfLines={2}>{line.product.name}</Text><Text style={styles.cartProductStore}>{line.product.store}</Text><Text style={styles.cartProductPrice}>{rp(line.product.price)}</Text></View>
          <View style={styles.quantityControl}><TouchableOpacity onPress={() => updateQuantity(line.product.id, -1)} style={styles.quantityButton}><Minus size={14} color="#374151" /></TouchableOpacity><Text style={styles.quantityText}>{line.qty}</Text><TouchableOpacity onPress={() => updateQuantity(line.product.id, 1)} style={styles.quantityButton}><Plus size={14} color="#374151" /></TouchableOpacity></View>
        </View>
      ))}
      <View style={styles.summaryCard}><Text style={styles.summaryTitle}>Ringkasan Belanja</Text><SummaryRow label="Subtotal produk" value={rp(subtotal)} /><SummaryRow label="Ongkir" value={rp(deliveryFee)} /><SummaryRow label="Biaya layanan" value={rp(serviceFee)} /><View style={styles.summaryDivider} /><SummaryRow label="Total" value={rp(total)} strong /></View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setView("checkout")}><Text style={styles.primaryButtonText}>Lanjut ke Checkout</Text><ChevronRight size={18} color="#FFFFFF" /></TouchableOpacity>
    </ScrollView>
  );

  const renderCheckout = () => (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.checkoutSectionTitle}>Alamat Pengiriman</Text>
      <View style={styles.addressCard}><MapPin size={20} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.addressLabel}>Alamat utama</Text><TextInput value={address} onChangeText={setAddress} style={styles.addressInput} multiline /></View><ChevronRight size={18} color="#9CA3AF" /></View>

      <Text style={styles.checkoutSectionTitle}>Promo</Text>
      <View style={styles.promoRow}><Tag size={18} color="#1B7A4E" /><TextInput placeholder="Masukkan kode promo" value={promo} onChangeText={setPromo} style={styles.promoInput} autoCapitalize="characters" /><TouchableOpacity onPress={applyPromo} style={styles.promoButton}><Text style={styles.promoButtonText}>{promoApplied ? "Terpasang" : "Pakai"}</Text></TouchableOpacity></View>
      {promoApplied && <Text style={styles.promoSuccess}>Promo LOKAL20 berhasil digunakan, hemat Rp5.000.</Text>}

      <Text style={styles.checkoutSectionTitle}>Metode Pembayaran</Text>
      <TouchableOpacity style={styles.paymentSelectedCard} onPress={() => setPaymentModalVisible(true)}><View style={styles.paymentIcon}><WalletCards size={20} color="#1B7A4E" /></View><View style={{ flex: 1 }}><Text style={styles.paymentName}>{selectedPaymentLabel}</Text><Text style={styles.paymentSub}>Tap untuk mengganti metode pembayaran</Text></View><ChevronRight size={18} color="#6B7280" /></TouchableOpacity>

      <Text style={styles.checkoutSectionTitle}>Detail Pesanan</Text>
      <View style={styles.summaryCard}><SummaryRow label="Subtotal produk" value={rp(subtotal)} /><SummaryRow label="Ongkir" value={rp(deliveryFee)} /><SummaryRow label="Biaya layanan" value={rp(serviceFee)} />{promoApplied && <SummaryRow label="Diskon promo" value={`- ${rp(discount)}`} green />}<View style={styles.summaryDivider} /><SummaryRow label="Total pembayaran" value={rp(total)} strong /></View>
      <View style={styles.secureNote}><ShieldCheck size={17} color="#1B7A4E" /><Text style={styles.secureNoteText}>Pembayaran kamu dilindungi dan diproses secara aman.</Text></View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setPaymentModalVisible(true)}><Text style={styles.primaryButtonText}>Bayar {rp(total)}</Text><ChevronRight size={18} color="#FFFFFF" /></TouchableOpacity>
    </ScrollView>
  );

  const renderSuccess = () => (
    <ScrollView contentContainerStyle={styles.successContent}>
      <View style={styles.successIcon}><Check size={36} color="#FFFFFF" strokeWidth={3} /></View>
      <Text style={styles.successTitle}>Pesanan Berhasil!</Text>
      <Text style={styles.successSubtitle}>Pesanan kamu sedang diproses oleh Marketplace UMKM.</Text>
      <View style={styles.invoiceCard}><View style={styles.invoiceHeader}><View><Text style={styles.invoiceLabel}>NOMOR PESANAN</Text><Text style={styles.invoiceNumber}>INV-MKT-240813</Text></View><ReceiptText size={24} color="#1B7A4E" /></View><View style={styles.summaryDivider} /><SummaryRow label="Status pembayaran" value={selectedPayment === "cod" ? "Bayar di tempat" : "Berhasil"} green /><SummaryRow label="Metode" value={selectedPaymentLabel} /><SummaryRow label="Total" value={rp(total)} strong /></View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => { setCart([]); setView("catalog"); }}><Text style={styles.primaryButtonText}>Belanja Lagi</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigate("c_home")}><Text style={styles.secondaryButtonText}>Kembali ke Beranda</Text></TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <BackHeader
        title={headerTitle}
        onBack={handleBack}
        right={view === "catalog" ? <TouchableOpacity style={styles.headerCartButton} onPress={() => setView("cart")}><ShoppingBag size={19} color="#1B7A4E" />{itemCount > 0 && <View style={styles.headerCartBadge}><Text style={styles.headerCartBadgeText}>{itemCount}</Text></View>}</TouchableOpacity> : undefined}
      />
      {view === "catalog" ? renderCatalog() : view === "cart" ? renderCart() : view === "checkout" ? renderCheckout() : renderSuccess()}

      <Modal visible={paymentModalVisible} transparent animationType="slide" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.paymentSheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Pilih Pembayaran</Text><TouchableOpacity onPress={() => setPaymentModalVisible(false)}><X size={20} color="#111827" /></TouchableOpacity></View>{paymentMethods.map((method) => { const selected = selectedPayment === method.id; return <TouchableOpacity key={method.id} style={[styles.paymentOption, selected && styles.paymentOptionSelected]} onPress={() => setSelectedPayment(method.id)}><View style={[styles.paymentIcon, { backgroundColor: `${method.color}15` }]}><WalletCards size={20} color={method.color} /></View><View style={{ flex: 1 }}><Text style={styles.paymentName}>{method.name}</Text><Text style={styles.paymentSub}>{method.subtitle}</Text></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}</View></TouchableOpacity>; })}<TouchableOpacity style={styles.primaryButton} onPress={completeMarketplaceOrder}><Text style={styles.primaryButtonText}>Konfirmasi Pembayaran</Text><ChevronRight size={18} color="#FFFFFF" /></TouchableOpacity></View></View>
      </Modal>
      <CustomerChatModal visible={chatVisible} onClose={() => setChatVisible(false)} orderId="MARKETPLACE" participantName="Pemilik Marketplace UMKM" participantType="merchant" initialMessage="Halo Kak, ada yang bisa kami bantu dari Marketplace?" />
    </SafeAreaView>
  );
};

const SummaryRow: React.FC<{ label: string; value: string; strong?: boolean; green?: boolean }> = ({ label, value, strong, green }) => (
  <View style={styles.summaryRow}><Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text><Text style={[styles.summaryValue, strong && styles.summaryStrong, green && styles.greenText]}>{value}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  flexOne: { flex: 1 },
  catalogContent: { padding: 16, paddingBottom: 28 },
  pageContent: { padding: 16, paddingBottom: 32 },
  storeHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  storeLogo: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center", marginRight: 12 },
  storeHeaderText: { flex: 1 },
  storeName: { color: "#111827", fontSize: 17, fontWeight: "800" },
  storeMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 5 },
  storeMetaText: { color: "#6B7280", fontSize: 11 },
  storeMetaDot: { color: "#CBD5E1", fontSize: 12 },
  storeOpenText: { color: "#1B7A4E", fontSize: 11, fontWeight: "700" },
  storeHeaderActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  storeInfoButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 4, marginTop: 16, marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tabButtonActive: { backgroundColor: "#E8F5EE" },
  tabText: { color: "#6B7280", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#1B7A4E" },
  categoryScroll: { gap: 8, paddingBottom: 16 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  categoryPillActive: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  categoryText: { color: "#4B5563", fontSize: 12, fontWeight: "700" },
  categoryTextActive: { color: "#FFFFFF" },
  sectionHeadingRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800" },
  sectionSubtitle: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  productCount: { color: "#6B7280", fontSize: 11 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  productCard: { width: "48.5%", backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" },
  productImage: { width: "100%", height: 130, backgroundColor: "#F3F4F6" },
  productBody: { padding: 10 },
  productName: { color: "#111827", fontSize: 13, fontWeight: "800", lineHeight: 18, minHeight: 36 },
  productStore: { color: "#6B7280", fontSize: 10, marginTop: 3 },
  productRatingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  soldText: { color: "#9CA3AF", fontSize: 9 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  productPrice: { color: "#1B7A4E", fontSize: 14, fontWeight: "900" },
  addButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center" },
  addedText: { color: "#1B7A4E", fontSize: 10, fontWeight: "700", marginTop: 5 },
  profileContent: { paddingBottom: 20 },
  profileHero: { alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 18, padding: 22 },
  profileLogoLarge: { width: 76, height: 76, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  profileStoreName: { color: "#111827", fontSize: 20, fontWeight: "900", marginTop: 12 },
  profileTagline: { color: "#4B5563", fontSize: 12, marginTop: 4 },
  profileRatingRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  profileRatingText: { color: "#4B5563", fontSize: 11 },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { flex: 1, color: "#374151", fontSize: 12 },
  contentTitle: { color: "#111827", fontSize: 16, fontWeight: "800", marginTop: 22, marginBottom: 8 },
  descriptionText: { color: "#6B7280", fontSize: 13, lineHeight: 20 },
  ownerCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 13, marginTop: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  ownerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  ownerName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  ownerSub: { color: "#6B7280", fontSize: 10, marginTop: 3 },
  reviewSummary: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#FFFFFF", padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 },
  reviewScore: { color: "#111827", fontSize: 32, fontWeight: "900" },
  reviewSummaryText: { color: "#6B7280", fontSize: 11, marginTop: 5 },
  reviewCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
  reviewTopRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { color: "#166534", fontWeight: "800" },
  reviewerName: { color: "#111827", fontSize: 12, fontWeight: "800", marginBottom: 3 },
  reviewDate: { color: "#9CA3AF", fontSize: 10 },
  reviewText: { color: "#4B5563", fontSize: 12, lineHeight: 18, marginTop: 12 },
  cartBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingHorizontal: 16, paddingVertical: 12 },
  cartBarLabel: { color: "#6B7280", fontSize: 11 },
  cartBarTotal: { color: "#111827", fontSize: 15, fontWeight: "900", marginTop: 2 },
  cartBarButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#1B7A4E", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  cartBarButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  headerCartButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", position: "relative" },
  headerCartBadge: { position: "absolute", right: -2, top: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  headerCartBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  storeMiniCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 14 },
  storeMiniIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  storeMiniName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  storeMiniSub: { color: "#6B7280", fontSize: 10, marginTop: 3 },
  cartLine: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  cartImage: { width: 66, height: 66, borderRadius: 12, backgroundColor: "#F3F4F6" },
  cartLineBody: { flex: 1, paddingHorizontal: 10 },
  cartProductName: { color: "#111827", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  cartProductStore: { color: "#6B7280", fontSize: 10, marginTop: 3 },
  cartProductPrice: { color: "#1B7A4E", fontSize: 12, fontWeight: "800", marginTop: 6 },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 7 },
  quantityButton: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  quantityText: { color: "#111827", fontSize: 12, fontWeight: "800" },
  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  summaryTitle: { color: "#111827", fontSize: 14, fontWeight: "800", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 5 },
  summaryLabel: { color: "#6B7280", fontSize: 12 },
  summaryValue: { color: "#374151", fontSize: 12, fontWeight: "700" },
  summaryStrong: { color: "#111827", fontSize: 15, fontWeight: "900" },
  greenText: { color: "#1B7A4E" },
  summaryDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1B7A4E", borderRadius: 13, minHeight: 48, paddingHorizontal: 16, marginTop: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  secondaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 8 },
  secondaryButtonText: { color: "#1B7A4E", fontSize: 13, fontWeight: "800" },
  checkoutSectionTitle: { color: "#111827", fontSize: 14, fontWeight: "800", marginTop: 8, marginBottom: 9 },
  addressCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#E5E7EB" },
  addressLabel: { color: "#111827", fontSize: 12, fontWeight: "800" },
  addressInput: { color: "#4B5563", fontSize: 12, padding: 0, marginTop: 5, minHeight: 34 },
  promoRow: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFFFFF", borderRadius: 13, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  promoInput: { flex: 1, color: "#111827", fontSize: 12, minHeight: 45 },
  promoButton: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#E8F5EE", borderRadius: 8 },
  promoButtonText: { color: "#1B7A4E", fontSize: 11, fontWeight: "800" },
  promoSuccess: { color: "#1B7A4E", fontSize: 11, marginTop: 6 },
  paymentSelectedCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#E5E7EB" },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  paymentName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  paymentSub: { color: "#6B7280", fontSize: 10, marginTop: 3 },
  secureNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 16 },
  secureNoteText: { color: "#6B7280", fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  paymentSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28 },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", marginBottom: 15 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sheetTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, marginBottom: 9 },
  paymentOptionSelected: { borderColor: "#1B7A4E", backgroundColor: "#F0FDF4" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  radioSelected: { backgroundColor: "#1B7A4E", borderColor: "#1B7A4E" },
  successContent: { flexGrow: 1, alignItems: "center", padding: 22, paddingTop: 54 },
  successIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center" },
  successTitle: { color: "#111827", fontSize: 23, fontWeight: "900", marginTop: 18 },
  successSubtitle: { color: "#6B7280", fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 7 },
  invoiceCard: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 17, padding: 16, marginTop: 24, borderWidth: 1, borderColor: "#E5E7EB" },
  invoiceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  invoiceLabel: { color: "#9CA3AF", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  invoiceNumber: { color: "#111827", fontSize: 15, fontWeight: "900", marginTop: 4 },
});
