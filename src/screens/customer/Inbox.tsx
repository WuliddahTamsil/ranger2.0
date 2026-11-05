import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  Image,
  Alert,
} from "react-native";
import {
  Bell,
  MessageSquare,
  ShoppingBag,
  Star,
  Inbox as InboxIcon,
  Bike,
  Store,
  X,
  Send,
  Trash2,
  Check,
} from "lucide-react-native";
import {
  appendCustomerChatMessage,
  markCustomerChatThreadRead,
  updateCustomerChatThread,
  deleteCustomerChatThread,
  deleteCustomerChatThreads,
  clearAllCustomerChatThreads,
  CustomerChatMessage,
  CustomerChatThread,
} from "./customerInboxStore";
import { CustomerChatModal } from "./CustomerChatModal";
import { getChatMessages, sendChatMessage } from "../../services/api";
import { AuthAccount } from "../auth/authTypes";

export type { CustomerChatThread } from "./customerInboxStore";

export interface CustomerNotification {
  id: number;
  type: string;
  title: string;
  msg: string;
  time: string;
  read: boolean;
}

interface InboxProps {
  notifications: CustomerNotification[];
  setNotifications: (notifs: CustomerNotification[]) => void;
  chatThreads: CustomerChatThread[];
  setChatThreads: (threads: CustomerChatThread[]) => void;
  setCustomerTab: (tabIndex: number) => void;
  authAccount?: AuthAccount | null;
  navigate?: (screen: any, params?: any) => void;
}

type Message = CustomerChatMessage;

export const Inbox: React.FC<InboxProps> = ({
  notifications,
  setNotifications,
  chatThreads,
  setChatThreads,
  setCustomerTab,
  authAccount,
  navigate,
}) => {
  const [activeTab, setActiveTab] = useState<"Notifikasi" | "Chat">("Notifikasi");
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState<CustomerChatThread | null>(null);

  // Chat selection mode state (for selecting one by one & deleting)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());

  // Chat message simulator lists
  const [typedMessage, setTypedMessage] = useState("");
  const [messagesHistory, setMessagesHistory] = useState<Record<string, Message[]>>({
    "ch_001": [
      { id: "ch_001_1", sender: "other", text: "Halo Kak, saya driver yang antar pesanan Nasi Timbel Anda. Sudah dekat ya.", time: "11:02" },
      { id: "ch_001_2", sender: "customer", text: "Baik Pak, ditunggu di depan teras.", time: "11:03" },
      { id: "ch_001_3", sender: "other", text: "Pak, saya sudah di depan pagar ya.", time: "11:05" },
    ],
    "ch_002": [
      { id: "ch_002_1", sender: "other", text: "Nasi Box 20 pax sedang disiapkan ya kak.", time: "10:30" },
    ],
  });

  useEffect(() => {
    setMessagesHistory((current) => {
      const next = { ...current };
      chatThreads.forEach((thread) => {
        if (thread.messages) next[thread.id] = thread.messages;
      });
      return next;
    });
  }, [chatThreads]);

  // Clean up selected threads if active threads list changes
  useEffect(() => {
    setSelectedThreadIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(chatThreads.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [chatThreads]);

  // Fetch live chat messages when thread modal opens
  useEffect(() => {
    if (!chatModalVisible || !selectedThread) return;

    const fetchThreadMessages = async () => {
      const res = await getChatMessages(
        selectedThread.orderId,
        selectedThread.participantType === "driver" ? "driver" : "owner",
        "customer"
      );
      if (res.success && Array.isArray(res.data)) {
        const mapped: Message[] = res.data.map((m: any) => ({
          id: m._id,
          sender: m.sender === "customer" ? "customer" : "other",
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          attachment: m.attachment,
        }));
        setMessagesHistory((prev) => ({
          ...prev,
          [selectedThread.id]: mapped,
        }));
      }
    };

    void fetchThreadMessages();
    const interval = setInterval(() => void fetchThreadMessages(), 2500);
    return () => clearInterval(interval);
  }, [chatModalVisible, selectedThread]);

  const handleMarkNotificationRead = (id: number) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    setCustomerTab(2); // Redirect to orders tab
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
  };

  const toggleSelectThread = (id: string) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedThreadIds.size === chatThreads.length) {
      setSelectedThreadIds(new Set());
    } else {
      setSelectedThreadIds(new Set(chatThreads.map((t) => t.id)));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedThreadIds(new Set());
  };

  const handleDeleteSingle = (thread: CustomerChatThread) => {
    Alert.alert(
      "Hapus Chat",
      `Hapus percakapan dengan ${thread.participantName}? Pesan ini tidak akan ditampilkan lagi.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            const nextThreads = chatThreads.filter((t) => t.id !== thread.id);
            setChatThreads(nextThreads);
            await deleteCustomerChatThread(thread.id, thread.orderId);
          },
        },
      ]
    );
  };

  const handleDeleteSelected = () => {
    const count = selectedThreadIds.size;
    if (count === 0) return;

    Alert.alert(
      "Hapus Chat Terpilih",
      `Apakah Anda yakin ingin menghapus ${count} percakapan yang dipilih?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: `Hapus (${count})`,
          style: "destructive",
          onPress: async () => {
            const idsToDelete = Array.from(selectedThreadIds);
            const targetThreads = chatThreads.filter((t) => selectedThreadIds.has(t.id));
            const orderIds = targetThreads.map((t) => t.orderId).filter(Boolean);
            const nextThreads = chatThreads.filter((t) => !selectedThreadIds.has(t.id));
            setChatThreads(nextThreads);
            exitSelectionMode();
            await deleteCustomerChatThreads(idsToDelete, orderIds);
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    if (chatThreads.length === 0) return;

    Alert.alert(
      "Hapus Semua Chat",
      "Apakah Anda yakin ingin menghapus seluruh riwayat chat? Tindakan ini tidak dapat dibatalkan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Semua",
          style: "destructive",
          onPress: async () => {
            setChatThreads([]);
            exitSelectionMode();
            await clearAllCustomerChatThreads();
          },
        },
      ]
    );
  };

  const openChatThread = async (thread: CustomerChatThread) => {
    setSelectedThread(thread);
    setChatModalVisible(true);

    // Reset unread count for this thread
    const updatedThreads = chatThreads.map((t) =>
      t.id === thread.id ? { ...t, unreadCount: 0 } : t
    );
    setChatThreads(updatedThreads);
    markCustomerChatThreadRead(thread.id);

    // Pre-fetch messages
    const res = await getChatMessages(
      thread.orderId,
      thread.participantType === "driver" ? "driver" : "owner",
      "customer"
    );
    if (res.success && Array.isArray(res.data)) {
      const mapped: Message[] = res.data.map((m: any) => ({
        id: m._id,
        sender: m.sender === "customer" ? "customer" : "other",
        text: m.text,
        time: new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        attachment: m.attachment,
      }));
      setMessagesHistory((prev) => ({
        ...prev,
        [thread.id]: mapped,
      }));
    }
  };

  const handleSendMessage = async () => {
    if (typedMessage.trim() === "" || !selectedThread) return;

    const threadKey = selectedThread.id;
    const textToSend = typedMessage.trim();
    setTypedMessage("");

    const newMsg: Message = {
      id: `${threadKey}_${Date.now()}`,
      sender: "customer",
      text: textToSend,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    const currentHistory = messagesHistory[threadKey] || [];
    const updatedHistory = [...currentHistory, newMsg];

    setMessagesHistory((prev) => ({
      ...prev,
      [threadKey]: updatedHistory,
    }));
    appendCustomerChatMessage(threadKey, newMsg);

    // Update last message in thread list
    const updatedThreads = chatThreads.map((t) =>
      t.id === selectedThread.id ? { ...t, lastMessage: textToSend, updatedAt: "Baru saja", messages: updatedHistory } : t
    );
    setChatThreads(updatedThreads);

    // Send real message to backend
    await sendChatMessage(
      selectedThread.orderId,
      "customer",
      textToSend,
      undefined,
      authAccount?.id,
      selectedThread.participantType === "driver" ? "driver" : "owner"
    );
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  if (!authAccount?.id) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifikasi & Inbox</Text>
        </View>

        <View style={styles.guestInboxContainer}>
          <View style={styles.guestInboxIconCircle}>
            <Bell size={42} color="#0D7A53" />
          </View>
          <Text style={styles.guestInboxTitle}>Masuk untuk Notifikasi & Chat</Text>
          <Text style={styles.guestInboxSub}>
            Dapatkan pembaruan langsung mengenai pesanan, promo eksklusif, dan pesan dari driver atau merchant mitra kami.
          </Text>

          <TouchableOpacity
            style={styles.guestInboxLoginBtn}
            onPress={() =>
              navigate?.("login", {
                targetScreen: "c_home",
                targetParams: { tab: 3 },
                reason: "Masuk ke akun GEOVERSE untuk melihat notifikasi dan chat Anda.",
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.guestInboxLoginBtnText}>Masuk ke Akun</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifikasi & Inbox</Text>
        {activeTab === "Notifikasi" && unreadNotifs > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markReadBtnText}>Tandai dibaca</Text>
          </TouchableOpacity>
        )}
        {activeTab === "Chat" && chatThreads.length > 0 && !isSelectionMode && (
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => setIsSelectionMode(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.manageBtnText}>Pilih</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteAllHeaderBtn}
              onPress={handleDeleteAll}
              activeOpacity={0.7}
            >
              <Trash2 size={13} color="#EF4444" style={{ marginRight: 3 }} />
              <Text style={styles.deleteAllHeaderText}>Hapus Semua</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs list switch */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "Notifikasi" && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab("Notifikasi");
            exitSelectionMode();
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === "Notifikasi" && styles.tabBtnTextActive]}>
            Notifikasi {unreadNotifs > 0 ? `(${unreadNotifs})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "Chat" && styles.tabBtnActive]}
          onPress={() => setActiveTab("Chat")}
        >
          <Text style={[styles.tabBtnText, activeTab === "Chat" && styles.tabBtnTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selection Control Bar (Active when in selection mode) */}
      {activeTab === "Chat" && isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={exitSelectionMode} style={styles.selectionCancelBtn}>
            <Text style={styles.selectionCancelText}>Batal</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCountText}>
            {selectedThreadIds.size} dipilih
          </Text>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectionSelectAllBtn}>
            <Text style={styles.selectionSelectAllText}>
              {selectedThreadIds.size === chatThreads.length ? "Batalkan Semua" : "Pilih Semua"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Panels */}
      {activeTab === "Notifikasi" ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isReview = item.type === "promo";
            const IconComp = isReview ? Star : ShoppingBag;
            const iconColor = isReview ? "#D97706" : "#1B7A4E";
            const iconBg = isReview ? "#FEF3C7" : "#E8F5EE";

            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => handleMarkNotificationRead(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <IconComp size={20} color={iconColor} />
                </View>

                <View style={styles.notifBody}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifDesc}>{item.msg}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>

                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <InboxIcon size={42} color="#9CA3AF" />
              <Text style={styles.emptyText}>Belum ada notifikasi</Text>
              <Text style={styles.emptySub}>Notifikasi pesanan atau promo dari server akan muncul di sini.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={chatThreads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, isSelectionMode && selectedThreadIds.size > 0 && { paddingBottom: 90 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isDriver = item.participantType === "driver";
            const IconComp = isDriver ? Bike : Store;
            const isSelected = selectedThreadIds.has(item.id);

            return (
              <TouchableOpacity
                style={[
                  styles.chatRow,
                  item.unreadCount > 0 && styles.chatRowUnread,
                  isSelected && styles.chatRowSelected,
                ]}
                onPress={() => {
                  if (isSelectionMode) {
                    toggleSelectThread(item.id);
                  } else {
                    openChatThread(item);
                  }
                }}
                onLongPress={() => {
                  if (!isSelectionMode) {
                    setIsSelectionMode(true);
                    setSelectedThreadIds(new Set([item.id]));
                  }
                }}
                activeOpacity={0.8}
              >
                {isSelectionMode && (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleSelectThread(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View
                      style={[
                        styles.checkboxCircle,
                        isSelected && styles.checkboxCircleSelected,
                      ]}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                )}

                {item.participantPhoto ? (
                  <Image source={{ uri: item.participantPhoto }} style={styles.chatAvatarImage} />
                ) : (
                  <View style={[styles.chatAvatar, { backgroundColor: isDriver ? "#E8F5EE" : "#FFF3E0" }]}>
                    <IconComp size={20} color={isDriver ? "#1B7A4E" : "#D97706"} />
                  </View>
                )}

                <View style={styles.chatBody}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.chatName} numberOfLines={1}>{item.participantName}</Text>
                    <Text style={styles.chatTimeText}>{item.updatedAt}</Text>
                  </View>

                  <Text style={styles.chatLastMsg} numberOfLines={1}>
                    {item.lastMessage || "Percakapan baru"}
                  </Text>

                  <Text style={styles.chatFooterTag}>
                    Order #{item.orderId} · {isDriver ? "Driver" : "Merchant"}
                  </Text>
                </View>

                {!isSelectionMode && (
                  <View style={styles.chatRowRightActions}>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.trashRowBtn}
                      onPress={() => handleDeleteSingle(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Hapus chat"
                    >
                      <Trash2 size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={42} color="#9CA3AF" />
              <Text style={styles.emptyText}>Belum ada chat aktif</Text>
              <Text style={styles.emptySub}>Hubungi toko atau driver dari detail pesanan Anda.</Text>
            </View>
          }
        />
      )}

      {/* Floating Bottom Bar for Bulk Delete in Selection Mode */}
      {activeTab === "Chat" && isSelectionMode && selectedThreadIds.size > 0 && (
        <View style={styles.floatingDeleteBar}>
          <TouchableOpacity
            style={styles.deleteSelectedBtn}
            onPress={handleDeleteSelected}
            activeOpacity={0.85}
          >
            <Trash2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.deleteSelectedBtnText}>
              Hapus ({selectedThreadIds.size}) Chat Terpilih
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Unified Full-Featured Customer Chat Modal */}
      {selectedThread && (
        <CustomerChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          orderId={selectedThread.orderId}
          participantName={selectedThread.participantName}
          participantPhoto={selectedThread.participantPhoto}
          participantType={selectedThread.participantType}
          currentUserRole="customer"
        />
      )}
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  markReadBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  chatHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#E8F5EE",
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  deleteAllHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  deleteAllHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  selectionCancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectionCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  selectionCountText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  selectionSelectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectionSelectAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#1B7A4E",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabBtnTextActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    alignItems: "flex-start",
  },
  notifCardUnread: {
    backgroundColor: "#E8F5EE",
    borderColor: "#A7F3D0",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  notifDesc: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    alignSelf: "center",
    marginLeft: 8,
  },
  chatRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    alignItems: "center",
  },
  chatRowUnread: {
    backgroundColor: "#E8F5EE",
    borderColor: "#A7F3D0",
  },
  chatRowSelected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircleSelected: {
    borderColor: "#1B7A4E",
    backgroundColor: "#1B7A4E",
  },
  chatRowRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  trashRowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  chatBody: {
    flex: 1,
    gap: 2,
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  chatTimeText: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  chatLastMsg: {
    fontSize: 11,
    color: "#4B5563",
  },
  chatFooterTag: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 2,
  },
  unreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  emptySub: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 36,
    lineHeight: 18,
  },
  floatingDeleteBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  deleteSelectedBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  deleteSelectedBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  guestInboxContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  guestInboxIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#86EFAC",
  },
  guestInboxTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  guestInboxSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  guestInboxLoginBtn: {
    backgroundColor: "#0D7A53",
    width: "100%",
    maxWidth: 280,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  guestInboxLoginBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
  },
});
