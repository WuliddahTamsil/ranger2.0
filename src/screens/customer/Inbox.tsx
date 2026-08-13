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
} from "lucide-react-native";
import {
  appendCustomerChatMessage,
  markCustomerChatThreadRead,
  updateCustomerChatThread,
  CustomerChatMessage,
  CustomerChatThread,
} from "./customerInboxStore";

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
}

type Message = CustomerChatMessage;

export const Inbox: React.FC<InboxProps> = ({
  notifications,
  setNotifications,
  chatThreads,
  setChatThreads,
  setCustomerTab,
}) => {
  const [activeTab, setActiveTab] = useState<"Notifikasi" | "Chat">("Notifikasi");
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState<CustomerChatThread | null>(null);

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

  const handleMarkNotificationRead = (id: number) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    setCustomerTab(2); // Redirect to orders tab
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
  };

  const openChatThread = (thread: CustomerChatThread) => {
    setSelectedThread(thread);
    setChatModalVisible(true);

    // Reset unread count for this thread
    const updatedThreads = chatThreads.map((t) =>
      t.id === thread.id ? { ...t, unreadCount: 0 } : t
    );
    setChatThreads(updatedThreads);
    markCustomerChatThreadRead(thread.id);
  };

  const handleSendMessage = () => {
    if (typedMessage.trim() === "" || !selectedThread) return;

    const threadKey = selectedThread.id;
    const newMsg: Message = {
      id: `${threadKey}_${Date.now()}`,
      sender: "customer",
      text: typedMessage.trim(),
      time: "Baru saja",
    };

    const currentHistory = messagesHistory[threadKey] || [];
    const updatedHistory = [...currentHistory, newMsg];

    setMessagesHistory({
      ...messagesHistory,
      [threadKey]: updatedHistory,
    });
    appendCustomerChatMessage(threadKey, newMsg);

    // Update last message in thread list
    const updatedThreads = chatThreads.map((t) =>
      t.id === selectedThread.id ? { ...t, lastMessage: typedMessage.trim(), updatedAt: "Baru saja", messages: updatedHistory } : t
    );
    setChatThreads(updatedThreads);

    setTypedMessage("");

    // Simulate merchant/driver automatic reply
    setTimeout(() => {
      const replyMsg: Message = {
        id: `${threadKey}_${Date.now()}_reply`,
        sender: "other",
        text: "Siap Kak, terima kasih konfirmasinya.",
        time: "Baru saja",
      };
      setMessagesHistory((prev) => ({
        ...prev,
        [threadKey]: [...updatedHistory, replyMsg],
      }));
      appendCustomerChatMessage(threadKey, replyMsg);

      // Update thread last message again
      updateCustomerChatThread(selectedThread.id, {
        lastMessage: "Siap Kak, terima kasih konfirmasinya.",
        updatedAt: "Baru saja",
        messages: [...updatedHistory, replyMsg],
      });
    }, 2000);
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifikasi & Inbox</Text>
        {activeTab === "Notifikasi" && unreadNotifs > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markReadBtnText}>Tandai dibaca</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs list switch */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "Notifikasi" && styles.tabBtnActive]}
          onPress={() => setActiveTab("Notifikasi")}
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isDriver = item.participantType === "driver";
            const IconComp = isDriver ? Bike : Store;

            return (
              <TouchableOpacity
                style={[styles.chatRow, item.unreadCount > 0 && styles.chatRowUnread]}
                onPress={() => openChatThread(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.chatAvatar, { backgroundColor: isDriver ? "#E8F5EE" : "#FFF3E0" }]}>
                  <IconComp size={20} color={isDriver ? "#1B7A4E" : "#D97706"} />
                </View>

                <View style={styles.chatBody}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.chatName}>{item.participantName}</Text>
                    <Text style={styles.chatTimeText}>{item.updatedAt}</Text>
                  </View>

                  <Text style={styles.chatLastMsg} numberOfLines={1}>
                    {item.lastMessage || "Percakapan baru"}
                  </Text>

                  <Text style={styles.chatFooterTag}>
                    Order #{item.orderId} · {isDriver ? "Driver" : "Merchant"}
                  </Text>
                </View>

                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
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

      {/* Chat Room Dialog Modal */}
      {selectedThread && (
        <Modal visible={chatModalVisible} transparent animationType="slide">
          <View style={styles.modalBgBottom}>
            <View style={styles.chatSheetContainer}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{selectedThread.participantName}</Text>
                  <Text style={styles.sheetSubtitle}>Order #{selectedThread.orderId}</Text>
                </View>
                <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                  <X size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Chat messages stream */}
              <FlatList
                data={messagesHistory[selectedThread.id] || []}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.chatListContent}
                renderItem={({ item }) => {
                  const isMe = item.sender === "customer";
                  return (
                    <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                          {item.text}
                        </Text>
                      </View>
                      <Text style={styles.chatBubbleTime}>{item.time}</Text>
                    </View>
                  );
                }}
              />

              {/* Chat Input field */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatTextInput}
                  value={typedMessage}
                  onChangeText={setTypedMessage}
                  placeholder="Ketik pesan..."
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
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
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  chatSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    height: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sheetSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  chatListContent: {
    paddingVertical: 12,
    gap: 10,
  },
  bubbleContainer: {
    maxWidth: "80%",
    marginBottom: 2,
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubbleRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#1B7A4E",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextMe: {
    color: "#FFFFFF",
  },
  bubbleTextOther: {
    color: "#111827",
  },
  chatBubbleTime: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 13,
    color: "#111827",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
  },
});
