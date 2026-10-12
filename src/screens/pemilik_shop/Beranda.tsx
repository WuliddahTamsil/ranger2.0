import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  Package,
  Plus,
  Store,
  Edit3,
  EyeOff,
  Eye,
  Search,
  Filter,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ShieldCheck,
  X,
} from "lucide-react-native";
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
  updateShopProductStock,
  bulkImportShopProducts,
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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  // Quick Stock Adjustment Modal State
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockTargetProduct, setStockTargetProduct] = useState<ShopProduct | null>(null);
  const [stockAdjustQty, setStockAdjustQty] = useState("");
  const [stockAdjustType, setStockAdjustType] = useState<"RESTOCK" | "ADJUSTMENT">("RESTOCK");
  const [stockAdjustNote, setStockAdjustNote] = useState("");
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Bulk Import Modal State
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [storeResult, productsResult] = await Promise.all([
      fetchMerchantShopStore(),
      fetchMerchantShopProducts(),
    ]);
    if (storeResult.success) setStore(storeResult.data);
    if (productsResult.success) setProducts(productsResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Filtered Products Memo
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "Semua" ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.includes(query);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isActive && p.stock > 0).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter(
      (p) => p.stock > 0 && p.stock <= (p.minimumStock || 5)
    ).length;
    return { total, active, outOfStock, lowStock };
  }, [products]);

  const saveProduct = async (form: ProductFormData) => {
    if (!store?._id) {
      showMessage("Toko belum siap", "Profil outlet belum tersedia. Pastikan akun disetujui admin.");
      return;
    }
    const primaryImage = form.img || form.images[0] || "";
    const payload = {
      storeId: store._id,
      name: form.name,
      brand: form.brand || "",
      category: form.cat,
      description: form.description,
      price: form.price,
      promoPrice: form.promoPrice || null,
      stock: form.stock,
      minimumStock: form.minimumStock || 5,
      sku: form.sku || "",
      barcode: form.barcode || "",
      unit: form.unit || "pcs",
      weight: form.weight || 250,
      requiresPrescription: Boolean(form.requiresPrescription),
      requiresAgeVerification: Boolean(form.requiresAgeVerification),
      isActive: form.isActive,
      img: primaryImage,
      images: form.images,
    };

    const result = editing
      ? await updateShopProduct(String(editing._id), payload)
      : await createShopProduct(payload);

    if (!result.success) {
      showMessage("Gagal", result.message || "Produk belum tersimpan.");
      return;
    }

    showMessage(
      "Berhasil",
      editing ? "Produk Kanyaah Shop berhasil diperbarui." : "Produk baru berhasil ditambahkan."
    );
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
    const confirm = () =>
      void deleteShopProduct(product._id).then(async (result) => {
        if (!result.success) showMessage("Gagal", result.message || "Produk belum dinonaktifkan.");
        else await load();
      });

    if (Platform.OS === "web") {
      if (window.confirm(`Nonaktifkan ${product.name}?`)) confirm();
    } else {
      Alert.alert(
        "Nonaktifkan produk?",
        `${product.name} tidak akan tampil untuk customer.`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Nonaktifkan", style: "destructive", onPress: confirm },
        ]
      );
    }
  };

  // Quick Stock Adjustment Handler (creates InventoryLog)
  const openStockModal = (product: ShopProduct) => {
    setStockTargetProduct(product);
    setStockAdjustQty("10");
    setStockAdjustType("RESTOCK");
    setStockAdjustNote("Restock barang dari supplier");
    setStockModalVisible(true);
  };

  const handleStockSubmit = async () => {
    if (!stockTargetProduct) return;
    const qty = parseInt(stockAdjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showMessage("Jumlah Tidak Valid", "Masukkan angka perubahan stok yang valid (lebih dari 0).");
      return;
    }

    setIsSubmittingStock(true);
    const res = await updateShopProductStock(stockTargetProduct._id, {
      quantity: qty,
      type: stockAdjustType,
      note: stockAdjustNote.trim() || undefined,
    });
    setIsSubmittingStock(false);

    if (res.success) {
      showMessage("Stok Diperbarui", `Stok ${stockTargetProduct.name} berhasil disesuaikan dengan audit log.`);
      setStockModalVisible(false);
      setStockTargetProduct(null);
      await load();
    } else {
      showMessage("Gagal", res.message || "Gagal memperbarui stok.");
    }
  };

  // Bulk Import Handler
  const handleBulkImportSubmit = async () => {
    if (!store?._id) return;
    const lines = bulkText.trim().split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      showMessage("Data Kosong", "Masukkan data produk CSV atau teks berformat.");
      return;
    }

    const items: any[] = [];
    for (const line of lines) {
      // format: Name, Category, Price, Stock, Unit, Brand, Barcode
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        items.push({
          name: parts[0],
          category: parts[1] || "Umum",
          price: parseInt(parts[2], 10) || 10000,
          stock: parseInt(parts[3] || "10", 10) || 10,
          unit: parts[4] || "pcs",
          brand: parts[5] || "",
          barcode: parts[6] || "",
        });
      }
    }

    if (items.length === 0) {
      showMessage("Format Tidak Cocok", "Gunakan format: Nama, Kategori, Harga, Stok, Satuan, Brand, Barcode");
      return;
    }

    setIsImporting(true);
    const res = await bulkImportShopProducts(store._id, items);
    setIsImporting(false);

    if (res.success) {
      showMessage("Import Berhasil", `${res.data?.length || items.length} produk berhasil diimport ke katalog.`);
      setBulkModalVisible(false);
      setBulkText("");
      await load();
    } else {
      showMessage("Gagal Import", res.message || "Gagal memproses import data produk.");
    }
  };

  if (formVisible) {
    return (
      <FullPageProductForm
        title={editing ? "Edit Produk Kanyaah Shop" : "Tambah Produk Kanyaah Shop"}
        subtitle="Kelola barang retail, brand, harga promo, stok, barcode, foto, dan sertifikasi."
        isEdit={Boolean(editing)}
        initialData={
          editing
            ? {
                id: editing._id,
                name: editing.name,
                brand: editing.brand || "",
                description: editing.description || "",
                cat: editing.category,
                price: editing.price,
                promoPrice: editing.promoPrice || undefined,
                stock: editing.stock,
                minimumStock: editing.minimumStock || 5,
                sku: editing.sku || "",
                barcode: editing.barcode || "",
                unit: editing.unit || "pcs",
                weight: editing.weight || 250,
                requiresPrescription: editing.requiresPrescription || false,
                requiresAgeVerification: editing.requiresAgeVerification || false,
                isActive: editing.isActive,
                img: editing.img,
                images: editing.images || [],
              }
            : undefined
        }
        categories={[
          "Sembako",
          "Minuman",
          "Snack",
          "Kesehatan",
          "Ibu & Bayi",
          "Personal Care",
          "Rumah Tangga",
          "Kosmetik",
          "Obat Resep",
          "Lainnya",
        ]}
        priceLabel="Harga Jual Normal (Rp)"
        pricePlaceholder="Contoh: 12500"
        stockLabel="Stok Barang Fisik"
        stockPlaceholder="Contoh: 30"
        themeColor="#2563EB"
        onCancel={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSave={saveProduct}
        onDelete={
          editing
            ? () => {
                void removeProduct(editing);
                setFormVisible(false);
                setEditing(null);
              }
            : undefined
        }
      />
    );
  }

  const categoryPills = [
    "Semua",
    "Sembako",
    "Minuman",
    "Snack",
    "Kesehatan",
    "Ibu & Bayi",
    "Personal Care",
    "Rumah Tangga",
    "Kosmetik",
    "Obat Resep",
    "Lainnya",
  ];

  return (
    <ResponsiveSafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RoleHeader
          name={authAccount?.name || "Mitra Shop"}
          role="PEMILIK KANYAAH SHOP"
          icon={Store}
          onRolePress={() => navigate("role")}
        />

        {/* Outlet Header Card */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Store size={26} color="#2563EB" />
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.heroTitle}>
                {store?.outletName || store?.name || authAccount?.roleData?.outletName || "Outlet Kanyaah Shop"}
              </Text>
              {store?.isOfficialBrandPartner && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={13} color="#15803D" />
                  <Text style={styles.verifiedBadgeText}>Official</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroSub}>
              {store?.brandType || "INDEPENDENT"} • {store?.businessCategory || store?.storeType || "MINIMARKET"}
            </Text>
            <Text style={styles.heroAddress} numberOfLines={1}>
              {store?.address || "Alamat outlet operasional"}
            </Text>
          </View>
        </View>

        {/* Outlet Operational Alert */}
        {store?.status === "PENDING_REVIEW" && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={18} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBannerTitle}>Menunggu Persetujuan Admin</Text>
              <Text style={styles.warningBannerText}>
                Outlet dan katalog Anda belum aktif untuk customer sampai dokumen diverifikasi oleh admin.
              </Text>
            </View>
          </View>
        )}

        {/* 4 Stats Grid */}
        <View style={styles.statsGrid}>
          <Stat label="Total Produk" value={String(stats.total)} color="#0F172A" />
          <Stat label="Produk Aktif" value={String(stats.active)} color="#15803D" />
          <Stat label="Stok Menipis" value={String(stats.lowStock)} color="#D97706" />
          <Stat label="Stok Habis" value={String(stats.outOfStock)} color="#DC2626" />
        </View>

        {/* Action Header: Search & Buttons */}
        <View style={styles.actionToolbar}>
          <View style={styles.searchBarContainer}>
            <Search size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama, brand, SKU, barcode..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonActionRow}>
            <TouchableOpacity
              style={styles.bulkBtn}
              onPress={() => setBulkModalVisible(true)}
              activeOpacity={0.8}
            >
              <Upload size={14} color="#2563EB" />
              <Text style={styles.bulkBtnText}>Import CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEditing(null);
                setFormVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addText}>Tambah Produk</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Pills Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          {categoryPills.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Product Catalog List */}
        <View style={styles.catalogSection}>
          <View style={styles.catalogHeader}>
            <Text style={styles.catalogTitle}>
              Daftar Produk ({filteredProducts.length})
            </Text>
            <Text style={styles.catalogSubtitle}>
              Katalog aktif langsung tampil di etalase Kanyaah Shop
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#2563EB" style={{ marginTop: 30 }} />
          ) : filteredProducts.length === 0 ? (
            <View style={styles.empty}>
              <Package size={34} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedCategory !== "Semua"
                  ? "Tidak ada produk yang cocok"
                  : "Belum ada produk di katalog"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory !== "Semua"
                  ? "Coba ubah kata kunci pencarian atau filter kategori."
                  : "Mulai tambahkan produk eceran atau barang retail outlet Anda."}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const isLow = product.stock > 0 && product.stock <= (product.minimumStock || 5);
              const isOut = product.stock === 0;

              return (
                <View key={product._id} style={styles.productCard}>
                  <View style={styles.productCopy}>
                    <View style={styles.nameRow}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      {product.brand ? (
                        <View style={styles.brandTag}>
                          <Text style={styles.brandTagText}>{product.brand}</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.productMeta}>
                      {product.category} • {product.unit || "pcs"} • {product.weight || 250}g
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>{rp(product.price)}</Text>
                      {product.promoPrice ? (
                        <Text style={styles.promoText}>Promo: {rp(product.promoPrice)}</Text>
                      ) : null}
                    </View>

                    <View style={styles.stockStatusRow}>
                      <TouchableOpacity
                        style={[
                          styles.stockBadge,
                          isOut
                            ? styles.stockBadgeOut
                            : isLow
                            ? styles.stockBadgeLow
                            : styles.stockBadgeOk,
                        ]}
                        onPress={() => openStockModal(product)}
                        activeOpacity={0.8}
                      >
                        <Boxes size={12} color={isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D"} />
                        <Text
                          style={[
                            styles.stockBadgeText,
                            { color: isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D" },
                          ]}
                        >
                          Stok: {product.stock} {isOut ? "(Habis)" : isLow ? "(Menipis)" : ""}
                        </Text>
                      </TouchableOpacity>

                      <Text
                        style={[
                          styles.activeStatusText,
                          { color: product.isActive ? "#15803D" : "#64748B" },
                        ]}
                      >
                        {product.isActive ? "• Tampil" : "• Nonaktif"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => openStockModal(product)}
                      style={styles.stockButton}
                    >
                      <Boxes size={16} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setEditing(product);
                        setFormVisible(true);
                      }}
                      style={styles.iconButton}
                    >
                      <Edit3 size={16} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => void toggleActive(product)}
                      style={styles.iconButton}
                    >
                      {product.isActive ? (
                        <EyeOff size={16} color="#64748B" />
                      ) : (
                        <Eye size={16} color="#15803D" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Order & Prescription Management Action */}
        <TouchableOpacity
          style={styles.orderButton}
          onPress={() => navigate("shop_merchant_orders")}
          activeOpacity={0.85}
        >
          <ClipboardList size={18} color="#1D4ED8" />
          <Text style={styles.orderText}>Buka Manajemen Pesanan & Resep Apotek</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quick Stock Modal */}
      <Modal
        visible={stockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Stok Produk</Text>
              <TouchableOpacity onPress={() => setStockModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTargetName}>{stockTargetProduct?.name}</Text>
            <Text style={styles.modalTargetMeta}>
              Stok saat ini: {stockTargetProduct?.stock} {stockTargetProduct?.unit || "pcs"}
            </Text>

            {/* Type selector: RESTOCK vs ADJUSTMENT */}
            <View style={styles.modalTypeRow}>
              <TouchableOpacity
                style={[
                  styles.modalTypeTab,
                  stockAdjustType === "RESTOCK" && styles.modalTypeTabActive,
                ]}
                onPress={() => setStockAdjustType("RESTOCK")}
              >
                <Text
                  style={[
                    styles.modalTypeText,
                    stockAdjustType === "RESTOCK" && styles.modalTypeTextActive,
                  ]}
                >
                  Restock (+Tambah)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTypeTab,
                  stockAdjustType === "ADJUSTMENT" && styles.modalTypeTabActive,
                ]}
                onPress={() => setStockAdjustType("ADJUSTMENT")}
              >
                <Text
                  style={[
                    styles.modalTypeText,
                    stockAdjustType === "ADJUSTMENT" && styles.modalTypeTextActive,
                  ]}
                >
                  Koreksi Stok
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>
                {stockAdjustType === "RESTOCK" ? "Jumlah Tambahan Stok" : "Jumlah Stok Baru"}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Contoh: 20"
                placeholderTextColor="#94A3B8"
                value={stockAdjustQty}
                onChangeText={setStockAdjustQty}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Catatan Audit (InventoryLog)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Cth: Kiriman baru dari supplier / Stock opname"
                placeholderTextColor="#94A3B8"
                value={stockAdjustNote}
                onChangeText={setStockAdjustNote}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStockModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleStockSubmit}
                disabled={isSubmittingStock}
              >
                {isSubmittingStock ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Simpan Log Stok</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Import CSV Modal */}
      <Modal
        visible={bulkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Import Produk CSV</Text>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Tempel data produk per baris dengan format:
            </Text>
            <View style={styles.codeSnippet}>
              <Text style={styles.codeSnippetText}>
                Nama, Kategori, Harga, Stok, Satuan, Brand, Barcode
              </Text>
            </View>

            <TextInput
              style={[styles.modalInput, styles.bulkTextArea]}
              placeholder={`Contoh:\nIndomie Goreng, Sembako, 3500, 50, pcs, Indofood, 899123456\nPocari Sweat 500ml, Minuman, 8000, 24, botol, Otsuka, 899654321`}
              placeholderTextColor="#94A3B8"
              value={bulkText}
              onChangeText={setBulkText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBulkModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleBulkImportSubmit}
                disabled={isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Import Sekarang</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const Stat = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 18, paddingBottom: 40 },
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginTop: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroCopy: { flex: 1 },
  storeTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedBadgeText: { color: "#15803D", fontSize: 10, fontWeight: "800" },
  heroSub: { color: "#64748B", fontSize: 12, marginTop: 3, fontWeight: "600" },
  heroAddress: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },
  warningBannerTitle: { color: "#92400E", fontWeight: "800", fontSize: 12 },
  warningBannerText: { color: "#B45309", fontSize: 11, marginTop: 2, lineHeight: 15 },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  statValue: { fontSize: 19, fontWeight: "900" },
  statLabel: { color: "#64748B", fontSize: 10, fontWeight: "600", marginTop: 2, textAlign: "center" },
  actionToolbar: { marginTop: 18, gap: 10 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A" },
  buttonActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 6,
  },
  bulkBtnText: { color: "#2563EB", fontWeight: "700", fontSize: 12 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    gap: 6,
  },
  addText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  filterPillsContainer: { paddingVertical: 10, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  filterPillSelected: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  filterPillText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  filterPillTextSelected: { color: "#FFFFFF", fontWeight: "800" },
  catalogSection: { marginTop: 10 },
  catalogHeader: { marginBottom: 12 },
  catalogTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  catalogSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "center",
  },
  productCopy: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  productName: { color: "#0F172A", fontWeight: "800", fontSize: 14, flexShrink: 1 },
  brandTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandTagText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  productMeta: { color: "#64748B", fontSize: 11, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  priceText: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  promoText: { color: "#DC2626", fontSize: 11, fontWeight: "700" },
  stockStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  stockBadgeOk: { backgroundColor: "#DCFCE7" },
  stockBadgeLow: { backgroundColor: "#FEF3C7" },
  stockBadgeOut: { backgroundColor: "#FEE2E2" },
  stockBadgeText: { fontSize: 10, fontWeight: "800" },
  activeStatusText: { fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 6, alignItems: "center", marginLeft: 10 },
  stockButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  emptyTitle: { color: "#334155", fontWeight: "800", marginTop: 10, fontSize: 14 },
  emptyText: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 4 },
  orderButton: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  orderText: { color: "#1D4ED8", fontWeight: "800", fontSize: 12 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  modalTargetName: { fontSize: 14, fontWeight: "800", color: "#1E293B" },
  modalTargetMeta: { fontSize: 12, color: "#64748B", marginTop: 2, marginBottom: 12 },
  modalTypeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  modalTypeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalTypeTabActive: { backgroundColor: "#2563EB" },
  modalTypeText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  modalTypeTextActive: { color: "#FFFFFF" },
  modalInputGroup: { marginBottom: 12 },
  modalInputLabel: { fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 5 },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  modalDesc: { fontSize: 12, color: "#64748B", marginBottom: 6 },
  codeSnippet: {
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  codeSnippetText: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: "#0F172A" },
  bulkTextArea: { minHeight: 110 },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalCancelBtnText: { color: "#64748B", fontWeight: "700", fontSize: 12 },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  modalSubmitBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});
