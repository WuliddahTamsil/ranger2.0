import React, { useCallback, useEffect, useState } from "react";
import { Alert, ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import { ClipboardList, Package, Plus, Store, Edit3, EyeOff, Eye } from "lucide-react-native";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { FullPageProductForm, ProductFormData } from "../../components/FullPageProductForm";
import { RoleHeader } from "../../components/RoleHeader";
import {
  ShopProduct,
  fetchMerchantShopProducts,
  fetchMerchantShopStore,
  createShopProduct,
  updateShopProduct,
  deleteShopProduct,
} from "../../services/shopService";
import { rp } from "../../utils/formatters";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
}

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") alert(`${title}: ${message}`);
  else Alert.alert(title, message);
};

export const Beranda: React.FC<Props> = ({ navigate, authAccount }) => {
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<ShopProduct | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [storeResult, productsResult] = await Promise.all([fetchMerchantShopStore(), fetchMerchantShopProducts()]);
    if (storeResult.success) setStore(storeResult.data);
    if (productsResult.success) setProducts(productsResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveProduct = async (form: ProductFormData) => {
    if (!store?._id) {
      showMessage("Toko belum siap", "Profil toko belum tersedia. Pastikan pendaftaran sudah disetujui admin.");
      return;
    }
    const primaryImage = form.img || form.images[0] || "";
    const payload = {
      storeId: store._id,
      name: form.name,
      category: form.cat,
      description: form.description,
      price: form.price,
      stock: form.stock,
      isActive: form.isActive,
      img: primaryImage,
      images: form.images,
      unit: "pcs",
    };
    const result = editing ? await updateShopProduct(String(editing._id), payload) : await createShopProduct(payload);
    if (!result.success) {
      showMessage("Gagal", result.message || "Produk belum tersimpan.");
      return;
    }
    showMessage("Berhasil", editing ? "Produk Kanyaah Shop diperbarui." : "Produk baru sudah masuk ke katalog.");
    setFormVisible(false);
    setEditing(null);
    await load();
  };

  const toggleActive = async (product: ShopProduct) => {
    const result = await updateShopProduct(product._id, { isActive: !product.isActive });
    if (!result.success) showMessage("Gagal", result.message || "Status produk belum berubah.");
    else await load();
  };

  const removeProduct = async (product: ShopProduct) => {
    const confirm = () => void deleteShopProduct(product._id).then(async (result) => {
      if (!result.success) showMessage("Gagal", result.message || "Produk belum dinonaktifkan.");
      else await load();
    });
    if (Platform.OS === "web") {
      if (window.confirm(`Nonaktifkan ${product.name}?`)) confirm();
    } else {
      Alert.alert("Nonaktifkan produk?", `${product.name} tidak akan tampil untuk customer.`, [{ text: "Batal", style: "cancel" }, { text: "Nonaktifkan", style: "destructive", onPress: confirm }]);
    }
  };

  if (formVisible) {
    return <FullPageProductForm
      title={editing ? "Edit Produk Kanyaah Shop" : "Tambah Produk Kanyaah Shop"}
      subtitle="Kelola barang retail, harga, stok, foto, dan status tampil di katalog customer."
      isEdit={Boolean(editing)}
      initialData={editing ? { id: editing._id, name: editing.name, description: editing.description || "", cat: editing.category, price: editing.price, stock: editing.stock, isActive: editing.isActive, img: editing.img, images: editing.images || [] } : undefined}
      categories={["Sembako", "Minuman", "Snack", "Kesehatan", "Ibu & Bayi", "Personal Care", "Rumah Tangga", "Kosmetik", "Obat Resep", "Lainnya"]}
      priceLabel="Harga Jual (Rp)"
      pricePlaceholder="Contoh: 12500"
      stockLabel="Stok Barang"
      stockPlaceholder="Contoh: 30"
      themeColor="#2563EB"
      onCancel={() => { setFormVisible(false); setEditing(null); }}
      onSave={saveProduct}
      onDelete={editing ? () => { void removeProduct(editing); setFormVisible(false); setEditing(null); } : undefined}
    />;
  }

  return (
    <ResponsiveSafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RoleHeader name={authAccount?.name || "Mitra Shop"} role="PEMILIK KANYAAH SHOP" icon={Store} onRolePress={() => navigate("role")} />
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Store size={25} color="#2563EB" /></View>
          <View style={styles.heroCopy}><Text style={styles.heroTitle}>{store?.name || authAccount?.roleData.businessName || "Toko Kanyaah Shop"}</Text><Text style={styles.heroSub}>{store?.storeType || "Retail"} • {store?.address || authAccount?.address || "Alamat belum diatur"}</Text></View>
        </View>
        <View style={styles.infoBanner}><Text style={styles.infoTitle}>Katalog Kanyaah Shop</Text><Text style={styles.infoText}>Tambahkan barang yang tersedia di outlet. Customer akan melihat harga dan stok terbaru dari toko ini.</Text></View>
        <View style={styles.statsRow}><Stat label="Total produk" value={String(products.length)} /><Stat label="Aktif" value={String(products.filter((p) => p.isActive && p.stock > 0).length)} /><Stat label="Stok menipis" value={String(products.filter((p) => p.stock > 0 && p.stock <= 5).length)} /></View>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Kelola katalog</Text><Text style={styles.sectionSub}>Barang jualan outlet kamu</Text></View><TouchableOpacity style={styles.addButton} onPress={() => { setEditing(null); setFormVisible(true); }}><Plus size={17} color="#FFFFFF" /><Text style={styles.addText}>Tambah</Text></TouchableOpacity></View>
        {loading ? <ActivityIndicator color="#2563EB" style={{ marginTop: 30 }} /> : products.length === 0 ? <View style={styles.empty}><Package size={28} color="#94A3B8" /><Text style={styles.emptyTitle}>Belum ada produk</Text><Text style={styles.emptyText}>Mulai dengan menambahkan barang pertama untuk toko ini.</Text></View> : products.map((product) => (
          <View key={product._id} style={styles.productCard}><View style={styles.productCopy}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{product.category} • {rp(product.price)} • stok {product.stock}</Text><Text style={[styles.status, { color: product.isActive && product.stock > 0 ? "#15803D" : "#B45309" }]}>{product.isActive && product.stock > 0 ? "Aktif di katalog" : "Tidak tampil / stok habis"}</Text></View><View style={styles.actions}><TouchableOpacity onPress={() => { setEditing(product); setFormVisible(true); }} style={styles.iconButton}><Edit3 size={17} color="#2563EB" /></TouchableOpacity><TouchableOpacity onPress={() => void toggleActive(product)} style={styles.iconButton}>{product.isActive ? <EyeOff size={17} color="#64748B" /> : <Eye size={17} color="#15803D" />}</TouchableOpacity></View></View>
        ))}
        <TouchableOpacity style={styles.orderButton} onPress={() => navigate("shop_merchant_orders")}><ClipboardList size={18} color="#1D4ED8" /><Text style={styles.orderText}>Buka manajemen pesanan & resep</Text></TouchableOpacity>
      </ScrollView>
    </ResponsiveSafeAreaView>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 40 },
  hero: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DBEAFE", marginTop: 16 },
  heroIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroCopy: { flex: 1 }, heroTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900" }, heroSub: { color: "#64748B", fontSize: 12, lineHeight: 17, marginTop: 4 },
  infoBanner: { backgroundColor: "#EFF6FF", borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: "#BFDBFE" }, infoTitle: { color: "#1E3A8A", fontWeight: "800", fontSize: 13 }, infoText: { color: "#1E40AF", fontSize: 12, lineHeight: 17, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 }, stat: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: "#E2E8F0" }, statValue: { color: "#0F172A", fontSize: 20, fontWeight: "900" }, statLabel: { color: "#64748B", fontSize: 11, marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 10 }, sectionTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" }, sectionSub: { color: "#64748B", fontSize: 12, marginTop: 3 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#2563EB", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 }, addText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  productCard: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", marginBottom: 10 }, productCopy: { flex: 1 }, productName: { color: "#0F172A", fontWeight: "800", fontSize: 14 }, productMeta: { color: "#475569", fontSize: 12, marginTop: 5 }, status: { fontSize: 11, fontWeight: "700", marginTop: 6 }, actions: { flexDirection: "row", gap: 8, alignItems: "center", marginLeft: 10 }, iconButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  empty: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 25, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }, emptyTitle: { color: "#334155", fontWeight: "800", marginTop: 10 }, emptyText: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 5 },
  orderButton: { marginTop: 18, borderRadius: 14, padding: 14, backgroundColor: "#DBEAFE", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, orderText: { color: "#1D4ED8", fontWeight: "800", fontSize: 12 },
});
