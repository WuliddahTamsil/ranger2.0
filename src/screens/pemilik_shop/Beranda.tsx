import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
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
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ShieldCheck,
  X,
  Download,
  Sparkles,
  Trash2,
  LayoutGrid,
  List,
  Home,
  ShoppingBag,
  TrendingUp,
  Wallet,
  User,
  Tag,
  ChevronRight,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { FullPageProductForm, ProductFormData } from "../../components/FullPageProductForm";
import { RoleHeader } from "../../components/RoleHeader";
import {
  ShopProduct,
  fetchMerchantShopProducts,
  fetchMerchantShopStore,
  fetchMerchantShopOrders,
  createShopProduct,
  updateShopProduct,
  deleteShopProduct,
  updateShopProductStock,
  bulkImportShopProducts,
} from "../../services/shopService";
import { rp, normalizeImageUrl } from "../../utils/formatters";
import { ShopOrderTab } from "./ShopOrderTab";
import { ShopPendapatanTab } from "./ShopPendapatanTab";
import { ShopKeuanganTab } from "./ShopKeuanganTab";
import { ShopProfilTab } from "./ShopProfilTab";
import { MerchantVoucherManagementModal } from "../../components/MerchantVoucherManagementModal";

interface Props extends Nav {
  authAccount?: AuthAccount | null;
  onUpdateAccount?: (account: AuthAccount) => void;
}

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") alert(`${title}: ${message}`);
  else Alert.alert(title, message);
};

export const Beranda: React.FC<Props> = ({ navigate, authAccount, onUpdateAccount }) => {
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [orders, setOrders] = useState<any[]>([]);

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);

  // Layout view mode: "grid" vs "list"
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    AsyncStorage.getItem("shop_catalog_view_mode")
      .then((val) => {
        if (val === "grid" || val === "list") setViewMode(val);
      })
      .catch(() => {});
  }, []);

  const handleChangeViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    AsyncStorage.setItem("shop_catalog_view_mode", mode).catch(() => {});
  };

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
    const [storeResult, productsResult, ordersResult] = await Promise.all([
      fetchMerchantShopStore(),
      fetchMerchantShopProducts(),
      fetchMerchantShopOrders().catch(() => ({ success: false, data: [] })),
    ]);
    if (storeResult.success) setStore(storeResult.data);
    if (productsResult.success) setProducts(productsResult.data || []);
    if (ordersResult.success && ordersResult.data) setOrders(ordersResult.data);
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
    const doDelete = async () => {
      const result = await deleteShopProduct(product._id);
      if (!result.success) {
        showMessage("Gagal", result.message || "Produk belum terhapus.");
      } else {
        showMessage("Berhasil", `${product.name} telah dihapus dari katalog.`);
        await load();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Hapus permanen ${product.name} dari katalog toko?`)) {
        void doDelete();
      }
    } else {
      Alert.alert(
        "Hapus Produk?",
        `Yakin ingin menghapus ${product.name} secara permanen dari katalog etalase?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Hapus Permanen", style: "destructive", onPress: () => void doDelete() },
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

  const SAMPLE_CSV_DATA = `Nama, Kategori, Harga, Stok, Satuan, Brand, Barcode, Gambar
Beras Ramos Premium 5kg, Sembako, 74000, 30, karung, Sania, 8992772010012, https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80
Minyak Goreng Pouch 2L, Sembako, 38500, 40, pouch, Bimoli, 8991002100021, https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80
Gula Pasir Putih 1kg, Sembako, 17500, 50, kg, Gulaku, 8993175100033, https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=400&q=80
Tepung Terigu Segitiga Biru 1kg, Sembako, 13000, 25, bungkus, Bogasari, 8992741100045, https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80
Telur Ayam Negeri 1kg, Sembako, 29000, 20, tray, Fresh Farm, 8990001100056, https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80
Garam Beryodium 250g, Sembako, 4500, 60, bungkus, Dolphin, 8993331100067, https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=80
Kecap Manis Pouch 520ml, Sembako, 24000, 35, pouch, Bango, 8999999100078, https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80
Saus Sambal Asli 335ml, Sembako, 16500, 30, botol, ABC, 8998888100089, https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80
Indomie Goreng Spesial 85g, Sembako, 3500, 200, bungkus, Indofood, 8998866200111, https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&q=80
Indomie Kuah Kari Ayam 72g, Sembako, 3500, 150, bungkus, Indofood, 8998866200222, https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80
Aqua Air Mineral 600ml, Minuman, 3500, 120, botol, Danone, 8992753210011, https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80
Le Minerale 600ml, Minuman, 3500, 100, botol, Mayora, 8996001210022, https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400&q=80
Pocari Sweat 500ml, Minuman, 8500, 48, botol, Otsuka, 8996001210033, https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80
Teh Botol Sosro Kotak 250ml, Minuman, 4000, 72, kotak, Sosro, 8991001210044, https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80
Ultra Milk Full Cream 250ml, Minuman, 7000, 60, kotak, Ultrajaya, 8992745210055, https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80
Good Day Tiramisu Bliss 250ml, Minuman, 7500, 36, botol, Kapal Api, 8998001210066, https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80
Coca-Cola Rasa Asli 390ml, Minuman, 6500, 48, botol, Coca-Cola, 8999001210077, https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80
Buavita Jambu 250ml, Minuman, 8000, 30, kotak, Unilever, 8997001210088, https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80
Chitato Sapi Panggang 68g, Snack, 12000, 40, bungkus, Indofood, 8992775300011, https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80
Qtela Keripik Singkong Balado 180g, Snack, 16500, 35, bungkus, Indofood, 8992775300022, https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400&q=80
Oreo Vanilla 119g, Snack, 9500, 50, bungkus, Mondelez, 8992761300033, https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80
Roma Kelapa Biskuit 300g, Snack, 11500, 45, bungkus, Mayora, 8996001300044, https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80
Beng Beng Cokelat 20g, Snack, 2500, 100, pcs, Mayora, 8996001300055, https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&q=80
SilverQueen Cashew 58g, Snack, 17500, 30, pcs, Petra, 8991001300066, https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80
Lifebuoy Sabun Total 10 400ml, Personal Care, 23000, 30, pouch, Unilever, 8999999400011, https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&q=80
Pepsodent Pasta Gigi Complete 190g, Personal Care, 15500, 40, pcs, Unilever, 8999999400022, https://images.unsplash.com/photo-1559671089-98284725d259?w=400&q=80
Sunsilk Shampoo Black Shine 160ml, Personal Care, 24500, 25, botol, Unilever, 8999999400033, https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&q=80
Biore Mens Facial Foam 100g, Personal Care, 31000, 20, pcs, Kao, 8992742400044, https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80
Sunlight Jeruk Nipis 650ml, Rumah Tangga, 14500, 50, pouch, Unilever, 8999999500011, https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80
Rinso Antinoda Deterjen Cair 700ml, Rumah Tangga, 21500, 40, pouch, Unilever, 8999999500022, https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&q=80
So Klin Pembersih Lantai 780ml, Rumah Tangga, 12000, 35, pouch, Wings, 8998888500033, https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&q=80
Baygon Aerosol Citrus 600ml, Rumah Tangga, 42000, 15, kaleng, SC Johnson, 8991111500044, https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=400&q=80
Paseo Tissue Wajah 250s, Rumah Tangga, 16000, 40, pack, APP, 8992222500055, https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&q=80
Tolak Angin Cair Box 5s, Kesehatan, 21000, 30, box, Sido Muncul, 8993001600011, https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80
Panadol Ekstra Merah 10 Kaplet, Kesehatan, 14500, 40, strip, Haleon, 8994001600022, https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80
Betadine Antiseptic Solution 30ml, Kesehatan, 28000, 20, botol, Mundipharma, 8995001600033, https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80
Hansaplast Kain Elastis 10s, Kesehatan, 7500, 50, amplop, Beiersdorf, 8996001600044, https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80
Madu TJ Murni 150g, Kesehatan, 23500, 25, botol, Tresno Joyo, 8997001600055, https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80`;

  const handleDownloadTemplate = () => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([SAMPLE_CSV_DATA], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "template_produk_kanyaah_shop.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showMessage("Download Berhasil", "Berkas template_produk_kanyaah_shop.csv berhasil diunduh.");
      } else {
        setBulkText(SAMPLE_CSV_DATA);
        showMessage("Template Tersalin", "Teks template produk telah otomatis disalin ke kolom input.");
      }
    } catch {
      setBulkText(SAMPLE_CSV_DATA);
      showMessage("Info", "Teks template telah dimasukkan ke kotak input.");
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/*", "text/csv", "application/vnd.ms-excel", "*/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        let content = "";
        if ((fileAsset as any).file && typeof (fileAsset as any).file.text === "function") {
          content = await (fileAsset as any).file.text();
        } else if (fileAsset.uri) {
          const resp = await fetch(fileAsset.uri);
          content = await resp.text();
        }

        if (content.trim()) {
          setBulkText(content);
          setBulkModalVisible(true);
          const lineCount = content.trim().split("\n").filter((l) => l.trim().length > 0).length;
          showMessage("File CSV Terbuka", `Berhasil memuat file: ${fileAsset.name || "CSV"} (${lineCount} baris). Klik 'Import Sekarang' untuk memproses.`);
        } else {
          showMessage("File Kosong", "Berkas yang dipilih tidak berisi teks data produk.");
        }
      }
    } catch (err: any) {
      showMessage("Gagal Baca File", err?.message || "Gagal membaca berkas CSV.");
    }
  };

  const handleFillSample = () => {
    setBulkText(SAMPLE_CSV_DATA);
    showMessage("Data Contoh Dimuat", "38 produk contoh telah ditempel. Anda dapat langsung klik 'Import Sekarang'.");
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
      if (parts.length < 3) continue;

      const col0 = parts[0].toLowerCase().replace(/^["']|["']$/g, "").trim();
      const col2 = parts[2].toLowerCase().replace(/^["']|["']$/g, "").trim();

      // Abaikan baris header bila pengguna menyertakan judul kolom
      if (
        col0 === "nama" ||
        col0 === "nama produk" ||
        col0 === "name" ||
        col2 === "harga" ||
        col2 === "price"
      ) {
        continue;
      }

      const rawPrice = parts[2].replace(/[^\d]/g, "");
      const cleanPrice = parseInt(rawPrice, 10);
      if (isNaN(cleanPrice)) continue;

      const rawStock = (parts[3] || "10").replace(/[^\d]/g, "");
      const cleanStock = parseInt(rawStock, 10);

      // Kolom ke-8 (Gambar / Google Drive / URL) bersifat opsional
      const rawImg = parts[7] ? parts[7].replace(/^["']|["']$/g, "").trim() : "";
      const normalizedImg = normalizeImageUrl(rawImg);

      items.push({
        name: parts[0].replace(/^["']|["']$/g, "").trim(),
        category: (parts[1] || "Umum").replace(/^["']|["']$/g, "").trim(),
        price: cleanPrice || 10000,
        stock: isNaN(cleanStock) ? 10 : cleanStock,
        unit: (parts[4] || "pcs").replace(/^["']|["']$/g, "").trim(),
        brand: (parts[5] || "").replace(/^["']|["']$/g, "").trim(),
        barcode: (parts[6] || "").replace(/^["']|["']$/g, "").trim(),
        img: normalizedImg,
        images: normalizedImg ? [normalizedImg] : [],
      });
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

  const navTabs = [
    { key: "beranda", label: "Beranda", icon: Home },
    { key: "order", label: "Order", icon: ShoppingBag },
    { key: "pendapatan", label: "Pendapatan", icon: TrendingUp },
    { key: "keuangan", label: "Keuangan", icon: Wallet },
    { key: "profil", label: "Profil", icon: User },
  ];

  const renderTabContent = () => {
    switch (currentTab) {
      case 1:
        return (
          <ShopOrderTab
            authAccount={authAccount}
            onNavigateToCatalog={() => setCurrentTab(0)}
          />
        );
      case 2:
        return (
          <ShopPendapatanTab
            orders={orders}
            products={products}
            storeName={store?.outletName || store?.name}
            onNavigateToOrders={() => setCurrentTab(1)}
          />
        );
      case 3:
        return (
          <ShopKeuanganTab
            orders={orders}
            storeName={store?.outletName || store?.name}
            ownerId={authAccount?.id}
          />
        );
      case 4:
        return (
          <ShopProfilTab
            store={store}
            setStore={setStore}
            authAccount={authAccount}
            navigate={navigate}
            onUpdateAccount={onUpdateAccount}
          />
        );
      case 0:
      default:
        return renderCatalogContent();
    }
  };

  const renderCatalogContent = () => {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <RoleHeader
            name={authAccount?.name || "Mitra Shop"}
            role="PEMILIK KANYAAH SHOP"
            icon={Store}
            fullBleed={false}
            includeTopInset={true}
            onRolePress={() => navigate("role")}
          />

          <View style={styles.catalogBody}>
            {/* Outlet Header Card */}
            <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Store size={22} color="#0D7A53" />
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.storeTitleRow}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {store?.outletName || store?.name || authAccount?.roleData?.outletName || "Outlet Kanyaah Shop"}
              </Text>
              {store?.isOfficialBrandPartner && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={11} color="#15803D" />
                  <Text style={styles.verifiedBadgeText}>Official</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroSub} numberOfLines={1}>
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
            <AlertTriangle size={16} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBannerTitle}>Menunggu Persetujuan Admin</Text>
              <Text style={styles.warningBannerText}>
                Outlet dan katalog Anda belum aktif untuk customer sampai dokumen diverifikasi oleh admin.
              </Text>
            </View>
          </View>
        )}

        {/* 4 Stats Grid (Clean 2x2 with ample breathing room) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "#F1F5F9" }]}>
              <Package size={14} color="#0F172A" />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: "#0F172A" }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Produk</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "#DCFCE7" }]}>
              <CheckCircle2 size={14} color="#15803D" />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: "#15803D" }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Produk Aktif</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "#FEF3C7" }]}>
              <AlertTriangle size={14} color="#D97706" />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: "#D97706" }]}>{stats.lowStock}</Text>
              <Text style={styles.statLabel}>Stok Menipis</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: "#FEE2E2" }]}>
              <X size={14} color="#DC2626" />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: "#DC2626" }]}>{stats.outOfStock}</Text>
              <Text style={styles.statLabel}>Stok Habis</Text>
            </View>
          </View>
        </View>

        {/* Banner Promo & Voucher Toko */}
        <TouchableOpacity
          style={styles.voucherPromoBanner}
          onPress={() => setVoucherModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.voucherPromoIcon}>
            <Tag size={20} color="#0D7A53" />
          </View>
          <View style={styles.voucherPromoTextCol}>
            <Text style={styles.voucherPromoTitle}>Promo & Voucher Toko</Text>
            <Text style={styles.voucherPromoSub}>
              Kelola voucher gratis ongkir & diskon harga khusus pembeli Anda
            </Text>
          </View>
          <ChevronRight size={18} color="#0D7A53" />
        </TouchableOpacity>

        {/* Action Header: Search & Buttons */}
        <View style={styles.actionToolbar}>
          <View style={styles.searchBarContainer}>
            <Search size={15} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama, brand, SKU..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonActionRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEditing(null);
                setFormVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addText} numberOfLines={1}>Tambah Produk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bulkBtn}
              onPress={handlePickFile}
              activeOpacity={0.8}
            >
              <UploadCloud size={14} color="#0D7A53" />
              <Text style={styles.bulkBtnText} numberOfLines={1}>Upload CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bulkSecondaryBtn}
              onPress={() => setBulkModalVisible(true)}
              activeOpacity={0.8}
            >
              <Upload size={14} color="#475569" />
              <Text style={styles.bulkSecondaryBtnText} numberOfLines={1}>Impor Teks</Text>
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
          <View style={styles.catalogHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.catalogTitle}>
                Daftar Produk ({filteredProducts.length})
              </Text>
              <Text style={styles.catalogSubtitle}>
                Katalog aktif langsung tampil di etalase Kanyaah Shop
              </Text>
            </View>

            {/* Layout Toggle: Grid vs List */}
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  viewMode === "grid" && styles.viewToggleBtnActive,
                ]}
                onPress={() => handleChangeViewMode("grid")}
                activeOpacity={0.8}
                accessibilityLabel="Tampilan Grid"
              >
                <LayoutGrid
                  size={15}
                  color={viewMode === "grid" ? "#FFFFFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === "grid" && styles.viewToggleTextActive,
                  ]}
                >
                  Grid
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  viewMode === "list" && styles.viewToggleBtnActive,
                ]}
                onPress={() => handleChangeViewMode("list")}
                activeOpacity={0.8}
                accessibilityLabel="Tampilan List"
              >
                <List
                  size={15}
                  color={viewMode === "list" ? "#FFFFFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === "list" && styles.viewToggleTextActive,
                  ]}
                >
                  List
                </Text>
              </TouchableOpacity>
            </View>
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
          ) : viewMode === "grid" ? (
            /* --- GRID VIEW (2 Kolom Kartu Cantik) --- */
            <View style={styles.gridContainer}>
              {filteredProducts.map((product) => {
                const isLow = product.stock > 0 && product.stock <= (product.minimumStock || 5);
                const isOut = product.stock === 0;

                return (
                  <View key={product._id} style={styles.gridCard}>
                    {/* Top Image Banner with Floating Badges */}
                    <View style={styles.gridImageWrapper}>
                      {product.img || (product.images && product.images.length > 0) ? (
                        <Image
                          source={{
                            uri: normalizeImageUrl(
                              product.img || (product.images ? product.images[0] : "")
                            ),
                          }}
                          style={styles.gridImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.gridImagePlaceholder}>
                          <Package size={32} color="#94A3B8" />
                        </View>
                      )}

                      {/* Floating Stock Badge */}
                      <TouchableOpacity
                        style={[
                          styles.floatingStockBadge,
                          isOut
                            ? styles.stockBadgeOut
                            : isLow
                            ? styles.stockBadgeLow
                            : styles.stockBadgeOk,
                        ]}
                        onPress={() => openStockModal(product)}
                        activeOpacity={0.85}
                        accessibilityLabel="Ubah Stok"
                      >
                        <Boxes
                          size={11}
                          color={isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D"}
                        />
                        <Text
                          style={[
                            styles.floatingStockText,
                            { color: isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D" },
                          ]}
                        >
                          {isOut ? "Habis (0)" : `Stok: ${product.stock}`}
                        </Text>
                      </TouchableOpacity>

                      {/* Floating Visibility Badge */}
                      <TouchableOpacity
                        style={[
                          styles.floatingVisibilityBadge,
                          product.isActive
                            ? styles.floatingVisibilityActive
                            : styles.floatingVisibilityInactive,
                        ]}
                        onPress={() => void toggleActive(product)}
                        activeOpacity={0.85}
                        accessibilityLabel="Ubah Visibilitas"
                      >
                        {product.isActive ? (
                          <Eye size={11} color="#15803D" />
                        ) : (
                          <EyeOff size={11} color="#64748B" />
                        )}
                        <Text
                          style={[
                            styles.floatingVisibilityText,
                            { color: product.isActive ? "#15803D" : "#64748B" },
                          ]}
                        >
                          {product.isActive ? "Tampil" : "Nonaktif"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Grid Card Body */}
                    <View style={styles.gridCardBody}>
                      <View style={styles.gridMetaRow}>
                        {product.brand ? (
                          <View style={styles.brandTag}>
                            <Text style={styles.brandTagText} numberOfLines={1}>
                              {product.brand}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.gridCategoryText} numberOfLines={1}>
                          {product.category || "Umum"}
                        </Text>
                      </View>

                      <Text style={styles.gridProductName} numberOfLines={2}>
                        {product.name}
                      </Text>

                      <View style={styles.gridPriceRow}>
                        <Text style={styles.gridPriceText}>{rp(product.price)}</Text>
                        {product.promoPrice ? (
                          <Text style={styles.gridPromoText}>
                            Promo: {rp(product.promoPrice)}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={styles.gridUnitText}>
                        {product.unit || "pcs"}
                        {product.weight ? ` • ${product.weight}g` : ""}
                      </Text>
                    </View>

                    {/* Grid Card Action Footer */}
                    <View style={styles.gridActionFooter}>
                      <TouchableOpacity
                        style={styles.gridStockBtn}
                        onPress={() => openStockModal(product)}
                        activeOpacity={0.7}
                        accessibilityLabel="Ubah Stok"
                      >
                        <Boxes size={12} color="#2563EB" />
                        <Text style={styles.gridStockBtnText}>Atur Stok</Text>
                      </TouchableOpacity>

                      <View style={styles.gridSecondaryActions}>
                        <TouchableOpacity
                          style={styles.gridSmallIconBtn}
                          onPress={() => {
                            setEditing(product);
                            setFormVisible(true);
                          }}
                          activeOpacity={0.7}
                          accessibilityLabel="Edit Produk"
                        >
                          <Edit3 size={13} color="#2563EB" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.gridSmallIconBtn, styles.deleteButtonOutline]}
                          onPress={() => void removeProduct(product)}
                          activeOpacity={0.7}
                          accessibilityLabel="Hapus Produk"
                        >
                          <Trash2 size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            /* --- LIST VIEW (Kartu Bersih, Luas & Rapi) --- */
            <View style={styles.listContainer}>
              {filteredProducts.map((product) => {
                const isLow = product.stock > 0 && product.stock <= (product.minimumStock || 5);
                const isOut = product.stock === 0;

                return (
                  <View key={product._id} style={styles.listCard}>
                    {/* Top Row: Thumbnail + Product Info */}
                    <View style={styles.listCardTopRow}>
                      <View style={styles.listThumbContainer}>
                        {product.img || (product.images && product.images.length > 0) ? (
                          <Image
                            source={{
                              uri: normalizeImageUrl(
                                product.img || (product.images ? product.images[0] : "")
                              ),
                            }}
                            style={styles.listThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.listThumbPlaceholder}>
                            <Package size={24} color="#94A3B8" />
                          </View>
                        )}
                      </View>

                      <View style={styles.listCopy}>
                        <View style={styles.listMetaRow}>
                          {product.brand ? (
                            <View style={styles.brandTag}>
                              <Text style={styles.brandTagText} numberOfLines={1}>
                                {product.brand}
                              </Text>
                            </View>
                          ) : null}
                          <Text style={styles.listMetaText} numberOfLines={1}>
                            {product.category || "Umum"}
                            {product.unit ? ` • ${product.unit}` : ""}
                            {product.weight ? ` • ${product.weight}g` : ""}
                          </Text>
                        </View>

                        <Text style={styles.listProductName} numberOfLines={2}>
                          {product.name}
                        </Text>

                        <View style={styles.listPriceRow}>
                          <Text style={styles.listPriceText}>{rp(product.price)}</Text>
                          {product.promoPrice ? (
                            <Text style={styles.listPromoText}>
                              Promo: {rp(product.promoPrice)}
                            </Text>
                          ) : null}
                          <View style={{ flex: 1 }} />
                          <View
                            style={[
                              styles.activeChip,
                              product.isActive ? styles.activeChipOn : styles.activeChipOff,
                            ]}
                          >
                            <Text
                              style={[
                                styles.activeChipText,
                                product.isActive ? styles.activeChipTextOn : styles.activeChipTextOff,
                              ]}
                            >
                              {product.isActive ? "● Tampil" : "○ Nonaktif"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Action Strip: Stock Quick Action on Left, Edit/Visibility/Delete on Right */}
                    <View style={styles.listCardBottomStrip}>
                      <TouchableOpacity
                        style={[
                          styles.listStockActionBtn,
                          isOut
                            ? styles.stockBadgeOut
                            : isLow
                            ? styles.stockBadgeLow
                            : styles.stockBadgeOk,
                        ]}
                        onPress={() => openStockModal(product)}
                        activeOpacity={0.8}
                        accessibilityLabel="Ubah Stok"
                      >
                        <Boxes
                          size={12}
                          color={isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D"}
                        />
                        <Text
                          style={[
                            styles.listStockActionBtnText,
                            {
                              color: isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D",
                            },
                          ]}
                        >
                          Stok: {product.stock} {product.unit || "pcs"}{" "}
                          {isOut ? "(Habis)" : isLow ? "(Menipis)" : ""}
                        </Text>
                        <Edit3
                          size={10}
                          color={isOut ? "#DC2626" : isLow ? "#D97706" : "#15803D"}
                          style={{ marginLeft: 3 }}
                        />
                      </TouchableOpacity>

                      <View style={styles.listActionIconRow}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditing(product);
                            setFormVisible(true);
                          }}
                          style={styles.listIconBtn}
                          accessibilityLabel="Edit Produk"
                          activeOpacity={0.7}
                        >
                          <Edit3 size={13} color="#0D7A53" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => void toggleActive(product)}
                          style={styles.listIconBtn}
                          accessibilityLabel="Sembunyikan/Tampilkan"
                          activeOpacity={0.7}
                        >
                          {product.isActive ? (
                            <EyeOff size={13} color="#64748B" />
                          ) : (
                            <Eye size={13} color="#15803D" />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => void removeProduct(product)}
                          style={[styles.listIconBtn, styles.deleteButtonOutline]}
                          accessibilityLabel="Hapus Produk"
                          activeOpacity={0.7}
                        >
                          <Trash2 size={13} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Order & Prescription Management Action */}
        <TouchableOpacity
          style={styles.orderButton}
          onPress={() => setCurrentTab(1)}
          activeOpacity={0.85}
        >
          <ClipboardList size={18} color="#1D4ED8" />
          <Text style={styles.orderText}>Buka Manajemen Pesanan & Resep Apotek</Text>
        </TouchableOpacity>
          </View>
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
              Upload file .csv langsung atau tempel baris data:
            </Text>

            {/* Big file picker button */}
            <TouchableOpacity
              style={styles.bigFilePickerBtn}
              onPress={handlePickFile}
              activeOpacity={0.85}
            >
              <UploadCloud size={22} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bigFilePickerTitle}>Pilih Berkas .CSV dari Perangkat</Text>
                <Text style={styles.bigFilePickerSub}>Klik untuk mencari file .csv dari folder HP atau Laptop</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.codeSnippet}>
              <Text style={styles.codeSnippetText}>
                Nama, Kategori, Harga, Stok, Satuan, Brand, Barcode, Gambar
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>
              * Kolom ke-8 (Gambar) opsional: bisa link Google Drive atau link web.
            </Text>

            {/* Quick Action Buttons: Download Template & Autofill Sample */}
            <View style={styles.bulkActionButtonsRow}>
              <TouchableOpacity
                style={styles.bulkSecondaryActionBtn}
                onPress={handleDownloadTemplate}
              >
                <Download size={13} color="#2563EB" />
                <Text style={styles.bulkSecondaryActionBtnText}>Unduh CSV Template</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkSecondaryActionBtn}
                onPress={handleFillSample}
              >
                <Sparkles size={13} color="#D97706" />
                <Text style={[styles.bulkSecondaryActionBtnText, { color: "#D97706" }]}>Isi Contoh Data</Text>
              </TouchableOpacity>
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
    </View>
  );
};

  return (
    <ResponsiveSafeAreaView
      style={[
        styles.safe,
        currentTab === 0 && { backgroundColor: "#0E6641" },
      ]}
      edges={currentTab === 0 ? [] : ["top"]}
    >
      <StatusBar
        barStyle={currentTab === 0 ? "light-content" : "dark-content"}
        backgroundColor={currentTab === 0 ? "#0E6641" : "#F8FAFC"}
      />
      {/* Dynamic Tab Body */}
      <View style={styles.mainTabBody}>{renderTabContent()}</View>

      {/* 5-Tab Bottom Navigation Bar (Sleek, Clean, and Elegant UI/UX) */}
      <View
        style={[
          styles.bottomNavContainer,
          { paddingBottom: Math.max(insets.bottom, 6) },
        ]}
      >
        {navTabs.map((tab, idx) => {
          const active = currentTab === idx;
          const IconComp = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => setCurrentTab(idx)}
              activeOpacity={0.7}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.navIconBg, active && styles.navIconBgActive]}>
                <IconComp size={20} color={active ? "#0D7A53" : "#94A3B8"} />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <MerchantVoucherManagementModal
        visible={voucherModalVisible}
        onClose={() => setVoucherModalVisible(false)}
        merchantId={store?._id || authAccount?.id}
        merchantName={store?.outletName || store?.name || authAccount?.name || "Kanyaah Shop"}
        service="SHOP"
      />
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
  voucherPromoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  voucherPromoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  voucherPromoTextCol: {
    flex: 1,
  },
  voucherPromoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D7A53",
  },
  voucherPromoSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
    lineHeight: 15,
  },
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  mainTabBody: { flex: 1 },
  scrollContent: { paddingBottom: 36 },
  content: { paddingBottom: 36 },
  catalogBody: { paddingHorizontal: 14, paddingTop: 4 },
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  heroCopy: { flex: 1 },
  storeTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
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
  heroSub: { color: "#64748B", fontSize: 11, marginTop: 2, fontWeight: "600" },
  heroAddress: { color: "#94A3B8", fontSize: 11, marginTop: 1 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 8,
  },
  warningBannerTitle: { color: "#92400E", fontWeight: "800", fontSize: 11 },
  warningBannerText: { color: "#B45309", fontSize: 10, marginTop: 1, lineHeight: 14 },

  // Stats Grid (Clean 2x2 with plenty of room)
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginTop: 10,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statValue: { fontSize: 17, fontWeight: "900", lineHeight: 20 },
  statLabel: { color: "#64748B", fontSize: 10, fontWeight: "700", marginTop: 1 },

  // Action Toolbar
  actionToolbar: { marginTop: 12, gap: 8 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: "#0F172A", padding: 0 },
  buttonActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    gap: 5,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  addText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 4,
  },
  bulkBtnText: { color: "#0D7A53", fontWeight: "700", fontSize: 11 },
  bulkSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  bulkSecondaryBtnText: { color: "#475569", fontWeight: "700", fontSize: 11 },

  // Category Filter Pills
  filterPillsContainer: { paddingVertical: 8, gap: 6 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  filterPillSelected: {
    backgroundColor: "#0D7A53",
    borderColor: "#0D7A53",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  filterPillText: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  filterPillTextSelected: { color: "#FFFFFF", fontWeight: "800" },

  // Catalog Section
  catalogSection: { marginTop: 8 },
  catalogHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  catalogTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  catalogSubtitle: { fontSize: 11, color: "#64748B", marginTop: 1 },
  viewToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  viewToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  viewToggleBtnActive: {
    backgroundColor: "#0D7A53",
    shadowColor: "#0D7A53",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  viewToggleTextActive: { color: "#FFFFFF", fontWeight: "800" },

  // Grid Styles
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  gridCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  gridImageWrapper: {
    width: "100%",
    height: 115,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  floatingStockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  floatingStockText: {
    fontSize: 9,
    fontWeight: "800",
  },
  floatingVisibilityBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  floatingVisibilityActive: {
    backgroundColor: "rgba(220, 252, 231, 0.95)",
  },
  floatingVisibilityInactive: {
    backgroundColor: "rgba(241, 245, 249, 0.95)",
  },
  floatingVisibilityText: {
    fontSize: 9,
    fontWeight: "800",
  },
  gridCardBody: {
    padding: 8,
    paddingBottom: 6,
  },
  gridMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  gridCategoryText: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
  },
  gridProductName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 16,
    minHeight: 32,
  },
  gridPriceRow: {
    marginTop: 3,
  },
  gridPriceText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
  },
  gridPromoText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#DC2626",
  },
  gridUnitText: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 1,
  },
  gridActionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FAFAFA",
    gap: 4,
  },
  gridStockBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 4,
    borderRadius: 6,
  },
  gridStockBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  gridSecondaryActions: {
    flexDirection: "row",
    gap: 3,
  },
  gridSmallIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // List Styles (Spacious, Clean & Overflow-Free)
  listContainer: {
    gap: 10,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  listCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  listThumbContainer: {
    width: 66,
    height: 66,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  listThumb: {
    width: "100%",
    height: "100%",
  },
  listThumbPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  listCopy: {
    flex: 1,
    marginLeft: 10,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  brandTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 90,
  },
  brandTagText: { fontSize: 9, fontWeight: "800", color: "#475569" },
  listMetaText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
  },
  listProductName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 17,
  },
  listPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  listPriceText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
  },
  listPromoText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  activeChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeChipOn: { backgroundColor: "#DCFCE7" },
  activeChipOff: { backgroundColor: "#F1F5F9" },
  activeChipText: { fontSize: 9, fontWeight: "800" },
  activeChipTextOn: { color: "#15803D" },
  activeChipTextOff: { color: "#64748B" },

  // Bottom action strip for list card
  listCardBottomStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  listStockActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  listStockActionBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  listActionIconRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  listIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  stockBadgeOk: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  stockBadgeLow: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  stockBadgeOut: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },

  empty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  emptyTitle: { color: "#334155", fontWeight: "800", marginTop: 8, fontSize: 13 },
  emptyText: { color: "#64748B", fontSize: 11, textAlign: "center", marginTop: 3 },
  orderButton: {
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#E8F5EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  orderText: { color: "#0D7A53", fontWeight: "800", fontSize: 12 },

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
  productThumbContainer: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  productThumb: {
    width: "100%",
    height: "100%",
  },
  productThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonOutline: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  bigFilePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  bigFilePickerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  bigFilePickerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  bulkActionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  bulkSecondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bulkSecondaryActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
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

  // Bottom Navigation Bar
  bottomNavContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  navIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  navIconBgActive: {
    backgroundColor: "#E8F5EE",
  },
  navLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },
});
