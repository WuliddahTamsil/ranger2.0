import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { FileText, ChevronRight, Receipt } from "lucide-react-native";
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

  // 1. Mock fallback history data with rich invoice details
  const mockHistory: HistoryItem[] = [
    {
      id: "CAT-2401",
      customerName: "Deni Kurniawan",
      itemSummary: "Box Nasi Timbel Komplit (10x)",
      total: 250000,
      time: "Hari ini, 08:30",
      status: "Selesai",
      rawOrder: {
        id: "CAT-2401",
        customer: "Deni Kurniawan",
        customerPhone: "0812-3456-7890",
        address: "Perum Telang Indah Blok C No. 14, Kamal, Bangkalan",
        storeName: "Dapur Barokah Catering Bangkalan",
        storeAddress: "Jl. Raya Telang No. 45, Kamal, Bangkalan",
        driver: { name: "Wuwu", vehicle: "Motor", plateNumber: "M 4128 AA" },
        items: [{ name: "Box Nasi Timbel Komplit", quantity: 10, price: 25000, total: 250000 }],
        subtotal: 235000,
        deliveryFee: 12000,
        serviceFee: 3000,
        total: 250000,
        paymentMethod: "QRIS / Transfer Bank BCA",
        paymentStatus: "Lunas",
        time: "08:30 WIB",
      },
    },
    {
      id: "CAT-2399",
      customerName: "Ayu Lestari",
      itemSummary: "Nasi Tumpeng Mini (2x) & Es Jeruk (20x)",
      total: 460000,
      time: "Kemarin, 16:10",
      status: "Selesai",
      rawOrder: {
        id: "CAT-2399",
        customer: "Ayu Lestari",
        customerPhone: "0857-9876-1122",
        address: "Gedung Pertemuan Rato Ebu, Bangkalan",
        storeName: "Dapur Barokah Catering Bangkalan",
        storeAddress: "Jl. Raya Telang No. 45, Kamal, Bangkalan",
        driver: { name: "Wuwu", vehicle: "Motor", plateNumber: "M 4128 AA" },
        items: [
          { name: "Nasi Tumpeng Mini", quantity: 2, price: 150000, total: 300000 },
          { name: "Es Jeruk Segar", quantity: 20, price: 8000, total: 160000 },
        ],
        subtotal: 445000,
        deliveryFee: 12000,
        serviceFee: 3000,
        total: 460000,
        paymentMethod: "Transfer Bank Mandiri",
        paymentStatus: "Lunas",
        time: "16:10 WIB",
      },
    },
    {
      id: "CAT-2394",
      customerName: "Rizky Maulana",
      itemSummary: "Box Ayam Bakar Madu (30x)",
      total: 840000,
      time: "05 Agu, 11:30",
      status: "Dibatalkan",
      rawOrder: {
        id: "CAT-2394",
        customer: "Rizky Maulana",
        customerPhone: "0877-2233-4455",
        address: "Jl. Soekarno Hatta No. 88, Bangkalan",
        storeName: "Dapur Barokah Catering Bangkalan",
        storeAddress: "Jl. Raya Telang No. 45, Kamal, Bangkalan",
        items: [{ name: "Box Ayam Bakar Madu", quantity: 30, price: 28000, total: 840000 }],
        subtotal: 825000,
        deliveryFee: 12000,
        serviceFee: 3000,
        total: 840000,
        paymentMethod: "Saldo Dompet Ranger",
        paymentStatus: "Dibatalkan",
        time: "11:30 WIB",
      },
    },
  ];

  // 2. Parse completed/cancelled orders from parent
  const completedOrCancelledOrders: HistoryItem[] = orders
    .filter((o) => o.status === "Selesai" || o.status === "Dibatalkan")
    .map((o) => {
      const itemSummary = o.items
        ? o.items.map((item: any) => `${item.name} (${item.quantity}x)`).join(" & ")
        : "Menu Catering";
      return {
        id: o.id,
        customerName: o.customer,
        itemSummary: itemSummary || "Menu Catering",
        total: o.total,
        time: `Hari ini, ${o.time}`,
        status: o.status as "Selesai" | "Dibatalkan",
        rawOrder: o,
      };
    });

  // Combine both sets of data
  const combinedHistory = [...completedOrCancelledOrders, ...mockHistory];

  // Filter based on active filter tab
  const visibleHistory = combinedHistory.filter(
    (item) => filter === "Semua" || item.status === filter
  );

  const handleOpenInvoice = (item: HistoryItem) => {
    const raw = item.rawOrder || item;
    const cleanId = (item.id || "").replace(/^#/, "");
    const formattedId = cleanId.length >= 8 ? cleanId.slice(-8).toUpperCase() : cleanId.toUpperCase();

    // Map items
    let parsedItems: InvoiceItemDetail[] = [];
    if (raw.items && Array.isArray(raw.items) && raw.items.length > 0) {
      parsedItems = raw.items.map((i: any) => ({
        name: i.name || "Menu Catering",
        quantity: Number(i.quantity) || 1,
        price: Number(i.price) || 0,
        total: (Number(i.quantity) || 1) * (Number(i.price) || 0),
      }));
    } else {
      parsedItems = [
        {
          name: item.itemSummary || "Menu Catering",
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
      orderType: "Catering",
      storeName: raw.storeName || "Dapur Barokah Catering Bangkalan",
      storeAddress: raw.storeAddress || "Jl. Raya Telang No. 45, Kamal, Bangkalan",
      customerName: item.customerName || raw.customer || "Pemesan",
      customerPhone: raw.customerPhone || "0812-3456-7890",
      customerAddress: raw.address || "Area Kampus UTM, Bangkalan",
      driverName: raw.driver?.name || "Wuwu (Kurir The Ranger)",
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Riwayat Transaksi</Text>
        <Text style={styles.subtitle}>Temukan pesanan catering selesai dan dibatalkan.</Text>

        {/* Filter Tab Row */}
        <View style={styles.filterRow}>
          {(["Semua", "Selesai", "Dibatalkan"] as const).map((tab) => {
            const isSelected = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterChip,
                  isSelected ? styles.filterChipSelected : styles.filterChipUnselected,
                ]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextSelected : styles.filterChipTextUnselected,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* History List */}
        <View style={styles.listContainer}>
          {visibleHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Tidak ada riwayat</Text>
              <Text style={styles.emptySubtitle}>Belum ada transaksi dengan status ini.</Text>
            </View>
          ) : (
            visibleHistory.map((item) => {
              const isCanceled = item.status === "Dibatalkan";
              const statusBg = isCanceled ? "#FEE2E2" : "#E8F5EE";
              const statusColor = isCanceled ? "#B91C1C" : "#1B7A4E";

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => handleOpenInvoice(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardId}>#{item.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.itemSummary}>{item.itemSummary}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.totalPrice}>{rp(item.total)}</Text>
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
    </SafeAreaView>
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
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  filterChipUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
  },
  filterChipTextUnselected: {
    color: "#374151",
  },
  listContainer: {
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  itemSummary: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  timeText: {
    fontSize: 11,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 14,
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
