import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { FileText } from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { FormalInvoiceModal, InvoiceData, InvoiceItemDetail } from "../../components/FormalInvoiceModal";

export interface HistoryItem {
  id: string;
  customerName: string;
  itemSummary: string;
  total: number;
  time: string;
  createdAt?: string | Date;
  status: "Selesai" | "Dibatalkan";
  rawOrder?: any;
}

interface RiwayatProps {
  orders: any[]; // dynamic orders from parent
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export const Riwayat: React.FC<RiwayatProps> = ({ orders, loading = false, error = "", onRetry }) => {
  const [filter, setFilter] = useState<"Semua" | "Selesai" | "Dibatalkan">("Semua");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  // History is derived only from persistent Marketplace orders supplied by the owner screen.
  const dynamicHistory: HistoryItem[] = orders
    .filter((o) => o.status === "Selesai" || o.status === "Dibatalkan")
    .map((o) => ({
      id: String(o.id || o._id),
      customerName: o.customer || o.customerName || "Pelanggan",
      itemSummary: Array.isArray(o.items) ? o.items.map((i: any) => `${i.name || "Produk"} (${i.quantity || 1}x)`).join(", ") : "Rincian produk tidak tersedia",
      total: Number(o.total ?? o.totalAmount ?? 0),
      createdAt: o.createdAt,
      time: o.createdAt && !Number.isNaN(new Date(o.createdAt).getTime())
        ? new Date(o.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
        : "Waktu belum tersedia",
      status: o.status as "Selesai" | "Dibatalkan",
      rawOrder: o,
    }));

  const visibleHistory = dynamicHistory.filter(
    (item) => filter === "Semua" || item.status === filter
  );

  const handleOpenInvoice = (item: HistoryItem) => {
    const raw = item.rawOrder || item;
    const cleanId = (item.id || "").replace(/^#/, "");
    const formattedId = cleanId.length >= 8 ? cleanId.slice(-8).toUpperCase() : cleanId.toUpperCase();

    const parsedItems: InvoiceItemDetail[] = Array.isArray(raw.items)
      ? raw.items.map((i: any) => ({
        name: i.name || "Produk Marketplace",
        quantity: Number(i.quantity) || 1,
        price: Number(i.price) || 0,
        total: (Number(i.quantity) || 1) * (Number(i.price) || 0),
      }))
      : [];

    const invoiceData: InvoiceData = {
      id: item.id,
      invoiceNumber: `INV/RNG-${formattedId}`,
      date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : undefined,
      time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : undefined,
      status: item.status,
      orderType: "Marketplace",
      storeName: raw.storeName,
      storeAddress: raw.storeAddress,
      customerName: item.customerName || raw.customer || "Pelanggan",
      customerPhone: raw.customerPhone || undefined,
      customerAddress: raw.address || undefined,
      driverName: raw.driver?.name || undefined,
      driverVehicle: raw.driver?.vehicle || undefined,
      driverPlate: raw.driver?.plateNumber || undefined,
      items: parsedItems,
      subtotal: Number(raw.subtotal ?? item.total),
      deliveryFee: Number(raw.deliveryFee ?? 0),
      serviceFee: Number(raw.serviceFee ?? 0),
      discount: Number(raw.discount ?? 0),
      total: item.total,
      paymentMethod: raw.paymentMethod || undefined,
      paymentStatus: raw.paymentStatus || (item.status === "Dibatalkan" ? "Dibatalkan" : undefined),
    };

    setSelectedInvoice(invoiceData);
    setInvoiceModalVisible(true);
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Riwayat Transaksi</Text>
        <Text style={styles.subtitle}>Temukan pesanan selesai dan dibatalkan.</Text>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {(["Semua", "Selesai", "Dibatalkan"] as const).map((opt) => {
            const selected = filter === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipUnselected,
                ]}
                onPress={() => setFilter(opt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected ? styles.chipTextSelected : styles.chipTextUnselected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* History Cards */}
        <View style={styles.listContainer}>
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{orders.length ? "Riwayat belum berhasil diperbarui. Data yang sudah dimuat tetap ditampilkan." : error}</Text>
              {onRetry ? (
                <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
                  <Text style={styles.retryText}>Coba lagi</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {visibleHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{loading ? "Memuat riwayat pesanan…" : "Belum ada pesanan selesai atau dibatalkan untuk filter ini."}</Text>
            </View>
          ) : (
            visibleHistory.map((item) => {
              const isCanceled = item.status === "Dibatalkan";
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => handleOpenInvoice(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardId}>#{item.id}</Text>
                    <Text
                      style={[
                        styles.statusText,
                        isCanceled ? styles.statusCanceled : styles.statusSuccess,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.itemSummary}>{item.itemSummary}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.totalText}>{rp(item.total)}</Text>
                    <View style={styles.cardFooterRight}>
                      <Text style={styles.timeText}>{item.time}</Text>
                      <View style={styles.invoiceHintPill}>
                        <FileText size={11} color="#0D7A53" />
                        <Text style={styles.invoiceHintText}>Lihat Faktur</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Formal Invoice Modal */}
      <FormalInvoiceModal
        visible={invoiceModalVisible}
        onClose={() => setInvoiceModalVisible(false)}
        data={selectedInvoice}
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  chipUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  chipTextUnselected: {
    color: "#111827",
  },
  listContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  cardId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusSuccess: {
    color: "#15803D",
  },
  statusCanceled: {
    color: "#B91C1C",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  itemSummary: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  timeText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  cardFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invoiceHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  invoiceHintText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  errorText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#C2410C",
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
