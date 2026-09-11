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
  status: "Selesai" | "Dibatalkan";
  rawOrder?: any;
}

interface RiwayatProps {
  orders: any[]; // dynamic orders from parent
}

export const Riwayat: React.FC<RiwayatProps> = ({ orders }) => {
  const [filter, setFilter] = useState<"Semua" | "Selesai" | "Dibatalkan">("Semua");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  // Fallback mock history
  const mockHistory: HistoryItem[] = [
    {
      id: "MKT-8841",
      customerName: "Budi Santoso",
      itemSummary: "Buku Tulis A5 (5x) & Pulpen Gel (10x)",
      total: 75000,
      time: "Hari ini, 10:15",
      status: "Selesai",
      rawOrder: {
        id: "MKT-8841",
        customer: "Budi Santoso",
        customerPhone: "0813-2244-6688",
        address: "Asrama Mahasiswa UTM Gedung B, Kamal",
        storeName: "Toko ATK & Fotokopi UTM",
        storeAddress: "Jl. Raya Telang No. 12, Kamal, Bangkalan",
        driver: { name: "Wuwu", vehicle: "Motor", plateNumber: "M 4128 AA" },
        items: [
          { name: "Buku Tulis A5 Campus", quantity: 5, price: 7000, total: 35000 },
          { name: "Pulpen Gel 0.5 Black", quantity: 10, price: 4000, total: 40000 },
        ],
        subtotal: 75000,
        deliveryFee: 5000,
        serviceFee: 1000,
        total: 75000,
        paymentMethod: "QRIS / Saldo Dompet GEOVERSE",
        paymentStatus: "Lunas",
        time: "10:15 WIB",
      },
    },
    {
      id: "MKT-8835",
      customerName: "Siti Rahma",
      itemSummary: "Kaos Polo GEOVERSE M (1x)",
      total: 85000,
      time: "Kemarin, 15:40",
      status: "Selesai",
      rawOrder: {
        id: "MKT-8835",
        customer: "Siti Rahma",
        customerPhone: "0856-1133-5577",
        address: "Kost Putri Melati No. 4, Telang",
        storeName: "GEOVERSE Official Store",
        storeAddress: "Jl. Raya Telang No. 01, Kamal, Bangkalan",
        driver: { name: "Wuwu", vehicle: "Motor", plateNumber: "M 4128 AA" },
        items: [{ name: "Kaos Polo GEOVERSE Hijau Size M", quantity: 1, price: 85000, total: 85000 }],
        subtotal: 85000,
        deliveryFee: 5000,
        serviceFee: 1000,
        total: 85000,
        paymentMethod: "Transfer Bank BCA",
        paymentStatus: "Lunas",
        time: "15:40 WIB",
      },
    },
  ];

  // Convert parent orders that are completed or cancelled to history format
  const dynamicHistory: HistoryItem[] = orders
    .filter((o) => o.status === "Selesai" || o.status === "Dibatalkan")
    .map((o) => ({
      id: o.id,
      customerName: o.customer,
      itemSummary: o.items ? o.items.map((i: any) => `${i.name} (${i.quantity}x)`).join(", ") : "Produk Marketplace",
      total: o.total,
      time: `Hari ini, ${o.time}`,
      status: o.status as "Selesai" | "Dibatalkan",
      rawOrder: o,
    }));

  // Combine both, avoiding duplicates (if any ID matches)
  const combinedHistory = [...dynamicHistory, ...mockHistory];

  const visibleHistory = combinedHistory.filter(
    (item) => filter === "Semua" || item.status === filter
  );

  const handleOpenInvoice = (item: HistoryItem) => {
    const raw = item.rawOrder || item;
    const cleanId = (item.id || "").replace(/^#/, "");
    const formattedId = cleanId.length >= 8 ? cleanId.slice(-8).toUpperCase() : cleanId.toUpperCase();

    let parsedItems: InvoiceItemDetail[] = [];
    if (raw.items && Array.isArray(raw.items) && raw.items.length > 0) {
      parsedItems = raw.items.map((i: any) => ({
        name: i.name || "Produk Marketplace",
        quantity: Number(i.quantity) || 1,
        price: Number(i.price) || 0,
        total: (Number(i.quantity) || 1) * (Number(i.price) || 0),
      }));
    } else {
      parsedItems = [
        {
          name: item.itemSummary || "Produk Marketplace",
          quantity: 1,
          price: item.total,
          total: item.total,
        },
      ];
    }

    const invoiceData: InvoiceData = {
      id: item.id,
      invoiceNumber: `INV/20260909/RNG-${formattedId}`,
      date: item.time?.includes(",") ? item.time.split(",")[0].trim() : "09 Sep 2026",
      time: item.time?.includes(",") ? item.time.split(",")[1].trim() : "14:45 WIB",
      status: item.status,
      orderType: "Marketplace",
      storeName: raw.storeName || "Toko Marketplace GEOVERSE",
      storeAddress: raw.storeAddress || "Jl. Raya Telang No. 01, Kamal, Bangkalan",
      customerName: item.customerName || raw.customer || "Pemesan",
      customerPhone: raw.customerPhone || "0812-3456-7890",
      customerAddress: raw.address || "Area Kampus UTM, Bangkalan",
      driverName: raw.driver?.name || "Wuwu (Kurir GEOVERSE)",
      driverVehicle: raw.driver?.vehicle || "Motor",
      driverPlate: raw.driver?.plateNumber || "M 4128 AA",
      items: parsedItems,
      subtotal: raw.subtotal || item.total,
      deliveryFee: raw.deliveryFee ?? 5000,
      serviceFee: raw.serviceFee ?? 1000,
      discount: raw.discount || 0,
      total: item.total,
      paymentMethod: raw.paymentMethod || "QRIS / Transfer Bank BCA",
      paymentStatus: item.status === "Dibatalkan" ? "Dibatalkan" : "Lunas",
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
          {visibleHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Tidak ada riwayat untuk filter ini</Text>
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
});
