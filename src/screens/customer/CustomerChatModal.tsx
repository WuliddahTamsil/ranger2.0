import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
  Platform,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import {
  Bike,
  Send,
  Store,
  Building2,
  Hotel,
  Ticket,
  Phone,
  MessageSquare,
  X,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Camera,
  Trash2,
  Download,
  CheckCheck,
  ArrowLeft,
  Video,
  Play,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  appendCustomerChatMessage,
  ensureCustomerChatThread,
  subscribeCustomerChatThreads,
  CustomerChatMessage,
  CustomerChatParticipantType,
  CustomerChatThread,
  upsertCustomerChatThread,
} from "./customerInboxStore";
import { getChatConversation, getChatMessages, sendChatMessage, uploadFileToBackend } from "../../services/api";
import { subscribeToChatRealtime } from "../../services/chatRealtime";

interface CustomerChatModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  customerId?: string;
  participantName: string;
  participantType: CustomerChatParticipantType;
  initialMessage?: string;
}

interface AttachmentItem {
  type: "image" | "file" | "video";
  uri: string;
  name: string;
  size?: string;
}

export const CustomerChatModal: React.FC<CustomerChatModalProps> = ({
  visible,
  onClose,
  orderId,
  customerId,
  participantName,
  participantType,
  initialMessage,
}) => {
  const isDriver = participantType === "driver";
  const nameLower = (participantName || "").toLowerCase();
  const orderLower = (orderId || "").toLowerCase();
  const isKost = !isDriver && (
    nameLower.includes("kos") ||
    nameLower.includes("hotel") ||
    nameLower.includes("resort") ||
    nameLower.includes("villa") ||
    nameLower.includes("wisata") ||
    nameLower.includes("alam") ||
    orderLower.includes("kost") ||
    orderLower.includes("kst") ||
    orderLower.includes("htl") ||
    orderLower.includes("wst")
  );

  const threadId = `chat_${orderId}_${participantType}`;
  const [thread, setThread] = useState<CustomerChatThread | undefined>();
  const [typedMessage, setTypedMessage] = useState("");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentItem | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [canSend, setCanSend] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setConversationId(null);
    setCanSend(true);

    const defaultGreeting = isDriver
      ? "Halo Pak Kurir, saya customer pesanan ini."
      : isKost
      ? `Halo, saya ingin bertanya mengenai properti ${participantName}. Apakah masih tersedia?`
      : "Halo Toko, ada yang ingin saya tanyakan mengenai pesanan ini.";
    const activeInitialMsg = initialMessage || defaultGreeting;

    // Ensure local thread exists first
    const existing = ensureCustomerChatThread({
      id: threadId,
      orderId,
      participantType,
      participantName,
      lastMessage: activeInitialMsg,
      updatedAt: "Baru saja",
      unreadCount: 0,
      messages: [],
    });
    setThread(existing);

    const loadMessages = async () => {
      try {
        const conversation = await getChatConversation(orderId);
        if (conversation.success && conversation.data) {
          setConversationId(String(conversation.data._id || conversation.data.id));
          setCanSend(conversation.data.canSend !== false);
        }
        const res = await getChatMessages(orderId, isDriver ? "driver" : "owner");
        if (res.success && Array.isArray(res.data)) {
          const mapped: CustomerChatMessage[] = res.data.map((m: any) => ({
            id: m._id,
            sender: m.sender === "customer" ? "customer" : "other",
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            attachment: m.attachment,
          }));

          upsertCustomerChatThread({
            id: threadId,
            orderId,
            participantType,
            participantName,
            lastMessage: mapped.length > 0 ? mapped[mapped.length - 1].text : activeInitialMsg,
            updatedAt: mapped.length > 0 ? mapped[mapped.length - 1].time : "Baru saja",
            unreadCount: 0,
            messages: mapped,
          });
        }
      } catch (e) {
        // Handled silently
      }
    };

    void loadMessages();
    const interval = setInterval(loadMessages, 3000);
    let unsubscribeRealtime: () => void = () => undefined;
    void subscribeToChatRealtime(orderId, () => void loadMessages()).then((unsubscribe) => {
      unsubscribeRealtime = unsubscribe;
    });

    const unsubscribe = subscribeCustomerChatThreads((nextThreads) => {
      setThread(nextThreads.find((item) => item.id === threadId));
    });

    return () => {
      clearInterval(interval);
      unsubscribeRealtime();
      unsubscribe();
    };
  }, [initialMessage, isDriver, isKost, orderId, participantName, participantType, threadId, visible]);

  const handlePickImage = async () => {
    setIsAttachMenuOpen(false);
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Ditolak", "Mohon izinkan akses galeri untuk mengirim foto.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileSizeMb = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "Foto";
        setSelectedAttachment({
          type: "image",
          uri: asset.uri,
          name: asset.fileName || `foto_${Date.now()}.jpg`,
          size: fileSizeMb,
        });
      }
    } catch (err) {
      console.log("Pick image err:", err);
    }
  };

  const handlePickDocument = async () => {
    setIsAttachMenuOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isImage = asset.mimeType?.startsWith("image/");
        const fileSize = asset.size ? `${(asset.size / (1024 * 1024)).toFixed(2)} MB` : "Dokumen";
        setSelectedAttachment({
          type: isImage ? "image" : "file",
          uri: asset.uri,
          name: asset.name,
          size: fileSize,
        });
      }
    } catch (err) {
      console.log("Pick doc err:", err);
    }
  };

  const handlePickCamera = async () => {
    setIsAttachMenuOpen(false);
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Ditolak", "Mohon izinkan akses kamera untuk mengambil foto.");
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedAttachment({
          type: "image",
          uri: asset.uri,
          name: `camera_${Date.now()}.jpg`,
          size: "Foto Kamera",
        });
      }
    } catch (err) {
      console.log("Camera err:", err);
    }
  };

  const handlePickVideo = async () => {
    setIsAttachMenuOpen(false);
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Ditolak", "Mohon izinkan akses galeri untuk mengirim video.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileSizeMb = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "Video";
        setSelectedAttachment({
          type: "video",
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: fileSizeMb,
        });
      }
    } catch (err) {
      console.log("Pick video err:", err);
    }
  };

  const handleSend = async () => {
    const text = typedMessage.trim();
    if (!text && !selectedAttachment) return;

    let attachmentToSend = selectedAttachment;
    const nowTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const message: CustomerChatMessage = {
      id: `${threadId}_${Date.now()}`,
      sender: "customer",
      text: text || (selectedAttachment?.type === "image" ? "📷 Foto terkirim" : selectedAttachment?.type === "video" ? "🎥 Video terkirim" : "📎 File terlampir"),
      time: nowTime,
      attachment: attachmentToSend ? { ...attachmentToSend } : undefined,
    };

    // 1. Instant Optimistic UI Update (Immediate UI response!)
    appendCustomerChatMessage(threadId, message);
    setTypedMessage("");
    setSelectedAttachment(null);

    // 2. Upload attachment if present and local
    if (attachmentToSend && !/^https?:/i.test(attachmentToSend.uri)) {
      try {
        const uploaded = await uploadFileToBackend(
          attachmentToSend.uri,
          attachmentToSend.name,
          attachmentToSend.type === "image" ? "image/jpeg" : attachmentToSend.type === "video" ? "video/mp4" : "application/octet-stream"
        );
        if (uploaded?.success && uploaded.data?.url) {
          attachmentToSend = { ...attachmentToSend, uri: uploaded.data.url };
        }
      } catch (err) {
        console.warn("Upload attachment fallback:", err);
      }
    }

    // 3. Send to backend & Socket.io asynchronously
    sendChatMessage(
      orderId,
      "customer",
      text,
      attachmentToSend,
      customerId,
      isDriver ? "driver" : "owner",
      undefined,
      conversationId || undefined
    ).catch((err) => {
      console.warn("Backend chat send error (handled):", err);
    });
  };

  const Icon = isDriver ? Bike : isKost ? Building2 : Store;
  const suggestions = isDriver
    ? ["Saya tunggu di depan ya Pak", "Tolong titip di pos satpam", "Sudah dekat dengan lokasi?"]
    : isKost
    ? ["Apakah kamar masih tersedia?", "Bisa minta shareloc lokasi?", "Apakah harga sudah termasuk listrik & WiFi?", "Boleh tahu aturan jam malam?"]
    : ["Mohon pastikan pesanan sesuai", "Kira-kira siap berapa menit lagi?", "Terima kasih banyak!"];

  const handleOpenWhatsApp = () => {
    const waNumber = "6287805987309";
    const waText = encodeURIComponent(`Halo, saya tertarik dengan ${participantName}. Apakah kamar/layanan masih tersedia?`);
    Linking.openURL(`https://wa.me/${waNumber}?text=${waText}`).catch(() => {
      Alert.alert("WhatsApp", "Gagal membuka WhatsApp. Silakan hubungi 0878-0598-7309.");
    });
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <ResponsiveSafeAreaView style={styles.fullContainer}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={0.7}>
              <ArrowLeft size={22} color="#111827" />
            </TouchableOpacity>
            <View style={[
              styles.avatar,
              isDriver
                ? { backgroundColor: "#E8F5EE" }
                : isKost
                ? { backgroundColor: "#E8F5EE" }
                : { backgroundColor: "#FFF7ED" }
            ]}>
              <Icon size={20} color={isDriver ? "#1B7A4E" : isKost ? "#0D7A53" : "#EA580C"} />
            </View>
            <View style={styles.headerCopy}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.title} numberOfLines={1}>{participantName}</Text>
                <View style={[
                  styles.rolePill,
                  isDriver
                    ? { backgroundColor: "#DCFCE7" }
                    : isKost
                    ? { backgroundColor: "#DCFCE7" }
                    : { backgroundColor: "#FFEDD5" }
                ]}>
                  <Text style={[
                    styles.rolePillText,
                    isDriver
                      ? { color: "#166534" }
                      : isKost
                      ? { color: "#166534" }
                      : { color: "#9A3412" }
                  ]}>
                    {isDriver ? "KURIR" : isKost ? "PEMILIK KOS" : "TOKO"}
                  </Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                {isDriver
                  ? `Order #${orderId} • Siap Mengantar`
                  : isKost
                  ? `Properti & Homestay • Pemilik Aktif`
                  : `Order #${orderId} • Toko Aktif`}
              </Text>
            </View>

            {/* Direct WhatsApp Callout Button */}
            <TouchableOpacity
              style={styles.btnHeaderWa}
              onPress={handleOpenWhatsApp}
              activeOpacity={0.8}
            >
              <Phone size={15} color="#15803D" />
              <Text style={styles.btnHeaderWaText}>WA</Text>
            </TouchableOpacity>
          </View>

          {/* Channel Identification Banner */}
          <View style={[
            styles.channelBanner,
            isDriver
              ? styles.channelBannerDriver
              : isKost
              ? styles.channelBannerKost
              : styles.channelBannerStore
          ]}>
            {isDriver ? (
              <Bike size={14} color="#15803D" />
            ) : isKost ? (
              <Building2 size={14} color="#0D7A53" />
            ) : (
              <Store size={14} color="#C2410C" />
            )}
            <Text style={[
              styles.channelBannerText,
              isDriver
                ? styles.channelBannerTextDriver
                : isKost
                ? styles.channelBannerTextKost
                : styles.channelBannerTextStore
            ]}>
              {isDriver
                ? "Terhubung langsung dengan Kurir Pengantar Pesanan"
                : isKost
                ? "Terhubung langsung dengan Pemilik Properti / Homestay"
                : "Terhubung langsung dengan Mitra Toko / Penjual"}
            </Text>
          </View>

          {/* Messages FlatList */}
          <FlatList
            data={thread?.messages || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[
                  styles.emptyIconBg,
                  isDriver
                    ? { backgroundColor: "#E8F5EE" }
                    : isKost
                    ? { backgroundColor: "#E8F5EE" }
                    : { backgroundColor: "#FFF7ED" }
                ]}>
                  <Icon size={28} color={isDriver ? "#1B7A4E" : isKost ? "#0D7A53" : "#EA580C"} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isDriver
                    ? "Mulai Percakapan dengan Kurir"
                    : isKost
                    ? "Mulai Percakapan dengan Pemilik Kos"
                    : "Mulai Percakapan dengan Toko"}
                </Text>
                <Text style={styles.emptyText}>
                  {isDriver
                    ? "Tanyakan posisi driver atau koordinasi titik antar pesanan."
                    : isKost
                    ? "Tanyakan ketersediaan kamar, aturan kos, atau jadwalkan survei lokasi langsung ke pemilik."
                    : "Tanyakan rincian atau catatan khusus pesanan Anda langsung ke toko."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender === "customer";
              const hasAttachment = !!item.attachment;
              const isImg = item.attachment?.type === "image";

              return (
                <View style={[styles.messageWrap, isMe ? styles.messageRight : styles.messageLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {/* Attachment Render */}
                    {hasAttachment && (
                      <View style={styles.attachmentInBubble}>
                        {isImg ? (
                          <TouchableOpacity
                            onPress={() => setPreviewImageUri(item.attachment?.uri || null)}
                            activeOpacity={0.9}
                          >
                            <Image
                              source={{ uri: item.attachment?.uri }}
                              style={styles.bubbleImg}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.bubbleFileCard, isMe ? styles.bubbleFileMe : styles.bubbleFileOther]}>
                            <View style={styles.fileIconBox}>
                              <FileText size={20} color="#0D7A53" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.bubbleFileName, isMe && styles.bubbleFileNameMe]} numberOfLines={1}>
                                {item.attachment?.name || "Dokumen"}
                              </Text>
                              <Text style={[styles.bubbleFileSize, isMe && styles.bubbleFileSizeMe]}>
                                {item.attachment?.size || "PDF / File"}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Text Message */}
                    {item.text && (!hasAttachment || (item.text !== "📷 Foto terkirim" && item.text !== "📎 File terlampir")) ? (
                      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
                    ) : null}
                  </View>

                  <View style={styles.messageFooterRow}>
                    <Text style={styles.time}>{item.time}</Text>
                    {isMe && <CheckCheck size={12} color="#0D7A53" style={{ marginLeft: 3 }} />}
                  </View>
                </View>
              );
            }}
          />

          {/* Pending Attachment Preview Bar */}
          {selectedAttachment && (
            <View style={styles.pendingAttachmentBar}>
              <View style={styles.pendingAttachmentLeft}>
                {selectedAttachment.type === "image" ? (
                  <Image source={{ uri: selectedAttachment.uri }} style={styles.pendingThumb} />
                ) : (
                  <View style={styles.pendingDocIconBg}>
                    <FileText size={18} color="#0D7A53" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingFileName} numberOfLines={1}>
                    {selectedAttachment.name}
                  </Text>
                  <Text style={styles.pendingFileSize}>{selectedAttachment.size || "Siap dikirim"}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedAttachment(null)}
                style={styles.pendingRemoveBtn}
                activeOpacity={0.7}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick suggestions */}
          <View style={styles.quickChipsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsScroll}
            >
              {suggestions.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickChip}
                  onPress={() => setTypedMessage(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Row */}
          <View style={styles.inputRow}>
            {/* Add File / Paperclip Button */}
            <TouchableOpacity
              style={[styles.attachButton, isAttachMenuOpen && styles.attachButtonActive]}
              onPress={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
              disabled={!canSend}
              activeOpacity={0.75}
            >
              <Paperclip size={18} color={isAttachMenuOpen ? "#FFFFFF" : "#0D7A53"} />
            </TouchableOpacity>

            <TextInput
              value={typedMessage}
              onChangeText={setTypedMessage}
              editable={canSend}
              style={styles.input}
              placeholder={selectedAttachment ? "Tambah keterangan file..." : "Ketik pesan..."}
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!canSend || (!typedMessage.trim() && !selectedAttachment)) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!canSend || (!typedMessage.trim() && !selectedAttachment)}
              activeOpacity={0.8}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

        {/* Attachment Options Action Sheet */}
        <Modal visible={isAttachMenuOpen} transparent animationType="fade" onRequestClose={() => setIsAttachMenuOpen(false)}>
          <TouchableOpacity
            style={styles.attachBackdrop}
            activeOpacity={1}
            onPress={() => setIsAttachMenuOpen(false)}
          >
            <View style={styles.attachSheetCard}>
              <View style={styles.attachSheetHeader}>
                <Text style={styles.attachSheetTitle}>Kirim Berkas / Foto</Text>
                <TouchableOpacity onPress={() => setIsAttachMenuOpen(false)}>
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.attachOptionsGrid}>
                {/* Image / Gallery */}
                <TouchableOpacity style={styles.attachOptionItem} onPress={handlePickImage} activeOpacity={0.8}>
                  <View style={[styles.attachOptionIconSquare, { backgroundColor: "#E0F2FE" }]}>
                    <ImageIcon size={22} color="#0284C7" />
                  </View>
                  <Text style={styles.attachOptionLabel}>Galeri Foto</Text>
                  <Text style={styles.attachOptionSub}>Pilih gambar / foto</Text>
                </TouchableOpacity>

                {/* Document / File */}
                <TouchableOpacity style={styles.attachOptionItem} onPress={handlePickDocument} activeOpacity={0.8}>
                  <View style={[styles.attachOptionIconSquare, { backgroundColor: "#DCFCE7" }]}>
                    <FileText size={22} color="#0D7A53" />
                  </View>
                  <Text style={styles.attachOptionLabel}>Dokumen / PDF</Text>
                  <Text style={styles.attachOptionSub}>Kirim file / berkas</Text>
                </TouchableOpacity>

                {/* Camera */}
                <TouchableOpacity style={styles.attachOptionItem} onPress={handlePickCamera} activeOpacity={0.8}>
                  <View style={[styles.attachOptionIconSquare, { backgroundColor: "#FFEDD5" }]}>
                    <Camera size={22} color="#EA580C" />
                  </View>
                  <Text style={styles.attachOptionLabel}>Kamera</Text>
                  <Text style={styles.attachOptionSub}>Ambil foto langsung</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Full Image Preview Modal */}
        {previewImageUri && (
          <Modal visible={!!previewImageUri} transparent animationType="fade">
            <View style={styles.imagePreviewBackdrop}>
              <TouchableOpacity
                style={styles.closePreviewBtn}
                onPress={() => setPreviewImageUri(null)}
                activeOpacity={0.8}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Image source={{ uri: previewImageUri }} style={styles.fullPreviewImg} resizeMode="contain" />
            </View>
          </Modal>
        )}
        </KeyboardAvoidingView>
      </ResponsiveSafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#F3F4F6",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: "900",
  },
  btnHeaderWa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  btnHeaderWaText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#15803D",
  },
  channelBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  channelBannerDriver: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  channelBannerKost: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#C6F6D5",
  },
  channelBannerStore: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  channelBannerText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 8,
  },
  channelBannerTextDriver: {
    color: "#15803D",
  },
  channelBannerTextKost: {
    color: "#0D7A53",
  },
  channelBannerTextStore: {
    color: "#B45309",
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    flexGrow: 1,
    paddingVertical: 14,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  quickChipsWrapper: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  quickChipsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  quickChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickChipText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },
  messageWrap: {
    marginBottom: 12,
    maxWidth: "84%",
  },
  messageLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    overflow: "hidden",
  },
  bubbleMe: {
    backgroundColor: "#0D7A53",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: "#374151",
    fontSize: 12.5,
    lineHeight: 18,
  },
  messageTextMe: {
    color: "#FFFFFF",
  },
  messageFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  time: {
    color: "#9CA3AF",
    fontSize: 9,
  },

  // Attachments in bubble
  attachmentInBubble: {
    marginBottom: 6,
  },
  bubbleImg: {
    width: 210,
    height: 150,
    borderRadius: 12,
  },
  bubbleFileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    minWidth: 190,
  },
  bubbleFileMe: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  bubbleFileOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleFileName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  bubbleFileNameMe: {
    color: "#FFFFFF",
  },
  bubbleFileSize: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  bubbleFileSizeMe: {
    color: "#D1FAE5",
  },

  // Pending attachment bar
  pendingAttachmentBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
  },
  pendingAttachmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  pendingThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  pendingDocIconBg: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingFileName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  pendingFileSize: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  pendingRemoveBtn: {
    padding: 6,
  },

  // Input Row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonActive: {
    backgroundColor: "#0D7A53",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 90,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 13,
    color: "#111827",
    fontSize: 12.5,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A7D8BE",
  },

  // Attach Menu Modal
  attachBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 24,
  },
  attachSheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  attachSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  attachSheetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  attachOptionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  attachOptionItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  attachOptionIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  attachOptionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  attachOptionSub: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },

  // Full image preview
  imagePreviewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  closePreviewBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 20,
  },
  fullPreviewImg: {
    width: "100%",
    height: "80%",
  },
});
