import React, { useEffect, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Bike, Send, Store, X } from "lucide-react-native";
import {
  appendCustomerChatMessage,
  ensureCustomerChatThread,
  subscribeCustomerChatThreads,
  CustomerChatMessage,
  CustomerChatParticipantType,
  CustomerChatThread,
} from "./customerInboxStore";

interface CustomerChatModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  participantName: string;
  participantType: CustomerChatParticipantType;
  initialMessage?: string;
}

export const CustomerChatModal: React.FC<CustomerChatModalProps> = ({
  visible,
  onClose,
  orderId,
  participantName,
  participantType,
  initialMessage,
}) => {
  const threadId = `chat_${orderId}`;
  const [thread, setThread] = useState<CustomerChatThread | undefined>();
  const [typedMessage, setTypedMessage] = useState("");

  useEffect(() => {
    if (!visible) return;
    const existing = ensureCustomerChatThread({
      id: threadId,
      orderId,
      participantType,
      participantName,
      lastMessage: initialMessage || "Percakapan baru",
      updatedAt: "Baru saja",
      unreadCount: 0,
      messages: initialMessage
        ? [{ id: `${threadId}_welcome`, sender: "other", text: initialMessage, time: "Baru saja" }]
        : [],
    });
    setThread(existing);
    return subscribeCustomerChatThreads((nextThreads) => {
      setThread(nextThreads.find((item) => item.id === threadId));
    });
  }, [initialMessage, orderId, participantName, participantType, threadId, visible]);

  const handleSend = () => {
    const text = typedMessage.trim();
    if (!text) return;

    const message: CustomerChatMessage = {
      id: `${threadId}_${Date.now()}`,
      sender: "customer",
      text,
      time: "Baru saja",
    };
    appendCustomerChatMessage(threadId, message);
    setTypedMessage("");

    setTimeout(() => {
      appendCustomerChatMessage(threadId, {
        id: `${threadId}_${Date.now()}_reply`,
        sender: "other",
        text: participantType === "driver" ? "Siap Kak, saya segera menuju lokasi." : "Siap Kak, pesanannya kami bantu cek dulu ya.",
        time: "Baru saja",
      });
    }, 1200);
  };

  const isDriver = participantType === "driver";
  const Icon = isDriver ? Bike : Store;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: isDriver ? "#E8F5EE" : "#FFF3E0" }]}>
              <Icon size={20} color={isDriver ? "#1B7A4E" : "#D97706"} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{participantName}</Text>
              <Text style={styles.subtitle}>Order #{orderId} • {isDriver ? "Driver" : "Pemilik/Merchant"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={20} color="#111827" /></TouchableOpacity>
          </View>

          <FlatList
            data={thread?.messages || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={<Text style={styles.emptyText}>Mulai percakapan dengan {isDriver ? "driver" : "pemilik layanan"}.</Text>}
            renderItem={({ item }) => {
              const isMe = item.sender === "customer";
              return <View style={[styles.messageWrap, isMe ? styles.messageRight : styles.messageLeft]}><View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}><Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text></View><Text style={styles.time}>{item.time}</Text></View>;
            }}
          />

          <View style={styles.inputRow}>
            <TextInput value={typedMessage} onChangeText={setTypedMessage} style={styles.input} placeholder="Ketik pesan..." onSubmitEditing={handleSend} returnKeyType="send" />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}><Send size={16} color="#FFFFFF" /></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { height: "75%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 13 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, marginLeft: 10 },
  title: { color: "#111827", fontSize: 14, fontWeight: "900" },
  subtitle: { color: "#6B7280", fontSize: 10, marginTop: 4 },
  closeButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  messageList: { flexGrow: 1, paddingVertical: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 12, textAlign: "center", marginTop: 28 },
  messageWrap: { marginBottom: 10, maxWidth: "82%" },
  messageLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  messageRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMe: { backgroundColor: "#1B7A4E", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#F3F4F6", borderBottomLeftRadius: 4 },
  messageText: { color: "#374151", fontSize: 12, lineHeight: 17 },
  messageTextMe: { color: "#FFFFFF" },
  time: { color: "#9CA3AF", fontSize: 9, marginTop: 3 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12 },
  input: { flex: 1, minHeight: 42, maxHeight: 90, backgroundColor: "#F3F4F6", borderRadius: 14, paddingHorizontal: 13, color: "#111827", fontSize: 12 },
  sendButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center" },
});
