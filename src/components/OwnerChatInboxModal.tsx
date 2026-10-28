import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  MessageSquare,
  Search,
  X,
  User,
  Store,
  Building2,
  Bike,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from "lucide-react-native";
import { getChatConversations } from "../services/api";
import { CustomerChatModal } from "../screens/customer/CustomerChatModal";

export interface OwnerConversationItem {
  id: string;
  orderId: string;
  orderCode: string;
  orderType: string;
  customerId?: string;
  customerName: string;
  customerPhoto?: string;
  driverId?: string;
  driverName?: string;
  driverPhoto?: string;
  ownerId?: string;
  ownerPhoto?: string;
  participantPhoto?: string;
  status: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDate?: string | Date;
  unreadCount?: number;
}

interface OwnerChatInboxModalProps {
  visible: boolean;
  onClose: () => void;
  serviceType?: "kos" | "laundry" | "catering" | "marketplace" | "shop" | "waste";
  businessName?: string;
  initialOrderId?: string;
  initialCustomerName?: string;
  knownOrderIds?: string[];
}

export const OwnerChatInboxModal: React.FC<OwnerChatInboxModalProps> = ({
  visible,
  onClose,
  serviceType = "kos",
  businessName = "Dashboard Usaha",
  initialOrderId,
  initialCustomerName,
  knownOrderIds = [],
}) => {
  const [conversations, setConversations] = useState<OwnerConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"Semua" | "Pelanggan" | "Driver">("Semua");
  const [selectedChat, setSelectedChat] = useState<OwnerConversationItem | null>(null);

  const effectiveOrderIds = useMemo(() => {
    return Array.from(new Set([initialOrderId, ...knownOrderIds].filter(Boolean))) as string[];
  }, [initialOrderId, knownOrderIds]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await getChatConversations(effectiveOrderIds);
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void fetchList();
      const interval = setInterval(() => {
        void getChatConversations(effectiveOrderIds).then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setConversations(res.data);
          }
        });
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setSelectedChat(null);
      setSearchQuery("");
    }
  }, [visible, effectiveOrderIds]);

  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.customerName?.toLowerCase().includes(q) ||
          item.orderCode?.toLowerCase().includes(q) ||
          item.lastMessage?.toLowerCase().includes(q)
      );
    }

    if (filterTab === "Driver") {
      list = list.filter((item) => Boolean(item.driverId));
    }

    return list;
  }, [conversations, searchQuery, filterTab]);

  const getServiceBadgeInfo = (type: string) => {
    switch (type?.toLowerCase()) {
      case "kos":
      case "homestay":
        return { label: "Homestay / Kos", bg: "#DCFCE7", text: "#15803D", icon: Building2 };
      case "catering":
        return { label: "Catering", bg: "#FEF3C7", text: "#B45309", icon: Store };
      case "laundry":
        return { label: "Laundry", bg: "#E0F2FE", text: "#0369A1", icon: Store };
      case "shop":
      case "marketplace":
        return { label: "Toko / Shop", bg: "#FFEDD5", text: "#C2410C", icon: Store };
      case "waste":
        return { label: "Bank Sampah", bg: "#E0E7FF", text: "#4338CA", icon: Store };
      default:
        return { label: "Layanan Kanyaah", bg: "#F1F5F9", text: "#475569", icon: MessageSquare };
    }
  };

  // If a chat room is opened, render the full chat room with a Back button to return to this list
  if (selectedChat) {
    return (
      <CustomerChatModal
        visible={visible && Boolean(selectedChat)}
        onClose={onClose}
        onBack={() => {
          setSelectedChat(null);
          void fetchList();
        }}
        orderId={selectedChat.orderId}
        participantName={selectedChat.customerName || "Pelanggan"}
        participantPhoto={selectedChat.customerPhoto || selectedChat.participantPhoto}
        participantType="customer"
        orderType={selectedChat.orderType}
        currentUserRole="owner"
        initialMessage="Halo, ada yang bisa kami bantu?"
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <ResponsiveSafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconBox}>
              <MessageSquare size={20} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.headerTitle}>Pesan Masuk</Text>
                {conversations.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{conversations.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {businessName} • Daftar Pelanggan yang Menghubungi
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama pelanggan, order #..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.tabsRow}>
          {(["Semua", "Pelanggan", "Driver"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, filterTab === tab && styles.tabChipActive]}
              onPress={() => setFilterTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabChipText, filterTab === tab && styles.tabChipTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchList}
            activeOpacity={0.7}
          >
            <RefreshCw size={15} color="#0D7A53" />
          </TouchableOpacity>
        </View>

        {/* Content List */}
        {loading && conversations.length === 0 ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0D7A53" />
            <Text style={styles.loadingText}>Memuat percakapan pelanggan...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyStateWrap}>
            <View style={styles.emptyIconCircle}>
              <MessageSquare size={36} color="#0D7A53" />
            </View>
            <Text style={styles.emptyStateTitle}>Belum Ada Percakapan</Text>
            <Text style={styles.emptyStateDesc}>
              {searchQuery
                ? `Tidak ditemukan pesan dengan kata kunci "${searchQuery}".`
                : "Ketika ada calon pelanggan atau kurir mengirim pesan, daftar obrolan akan muncul di sini secara real-time."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id || item.orderId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const badge = getServiceBadgeInfo(item.orderType);
              const BadgeIcon = badge.icon;
              return (
                <TouchableOpacity
                  style={styles.cardItem}
                  onPress={() => setSelectedChat(item)}
                  activeOpacity={0.85}
                >
                  {/* Left Avatar */}
                  {item.customerPhoto || item.participantPhoto ? (
                    <Image
                      source={{ uri: item.customerPhoto || item.participantPhoto }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarCircle}>
                      <User size={22} color="#0D7A53" />
                    </View>
                  )}

                  {/* Center Details */}
                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {item.customerName || "Pelanggan"}
                      </Text>
                      <Text style={styles.messageTime}>
                        {item.lastMessageTime || "Baru saja"}
                      </Text>
                    </View>

                    <View style={styles.badgeRow}>
                      <View style={[styles.servicePill, { backgroundColor: badge.bg }]}>
                        <BadgeIcon size={11} color={badge.text} />
                        <Text style={[styles.servicePillText, { color: badge.text }]}>
                          {badge.label} • #{item.orderCode ? item.orderCode.replace(/^#/, "").slice(-8).toUpperCase() : item.orderId.slice(-6).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.lastMessagePreview} numberOfLines={1}>
                      {item.lastMessage || "Mulai obrolan"}
                    </Text>
                  </View>

                  {/* Right Arrow */}
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </ResponsiveSafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabChipActive: {
    backgroundColor: "#0D7A53",
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
  },
  refreshBtn: {
    marginLeft: "auto",
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  messageTime: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  servicePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  lastMessagePreview: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  emptyStateDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
