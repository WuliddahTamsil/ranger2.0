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
  User,
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
  const isOwnerView = participantType === "customer";
  const isDriver = !isOwnerView && participantType === "driver";
  const nameLower = (participantName || "").toLowerCase();
  const orderLower = (orderId || "").toLowerCase();
  const isKost = isOwnerView || (!isDriver && (
    nameLower.includes("kos") ||
    nameLower.includes("hotel") ||
    nameLower.includes("resort") ||
    nameLower.includes("villa") ||
    nameLower.includes("wisata") ||
    nameLower.includes("alam") ||
    orderLower.includes("kost") ||
    orderLower.includes("kst") ||
    orderLower.includes("htl") ||
    orderLower.includes("wst") ||
    orderLower.includes("unit-")
  ));

  const threadId = `chat_${orderId}`;
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

    const defaultGreeting = isOwnerView
      ? "Halo kak, ada yang bisa kami bantu mengenai ketersediaan kamar / unit properti kami?"
      : isDriver
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
        const res = await getChatMessages(orderId, isOwnerView ? "owner" : (isDriver ? "driver" : "owner"));
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
      sender: isOwnerView ? "other" : "customer",
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
      isOwnerView ? "owner" : "customer",
      text,
      attachmentToSend,
      customerId,
      isOwnerView ? "customer" : (isDriver ? "driver" : "owner"),
      undefined,
      conversationId || undefined
    ).catch((err) => {
      console.warn("Backend chat send error (handled):", err);
    });
  };

  const Icon = isOwnerView ? User : isDriver ? Bike : isKost ? Building2 : Store;
  const suggestions = isOwnerView
    ? ["Kamar masih tersedia ya kak 👍", "Bisa langsung survei hari ini", "Lokasi kami share ya kak", "Harga sudah include WiFi & Listrik"]
    : isDriver
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
              <ArrowLeft size={20} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
              <View style={[
                styles.avatar,
                isOwnerView
                  ? { backgroundColor: "#DCFCE7" }
                  : isDriver
                  ? { backgroundColor: "#DCFCE7" }
                  : isKost
                  ? { backgroundColor: "#DCFCE7" }
                  : { backgroundColor: "#FFEDD5" }
              ]}>
                <Icon size={20} color={isOwnerView ? "#0D7A53" : isDriver ? "#15803D" : isKost ? "#0D7A53" : "#C2410C"} />
              </View>
              <View style={styles.onlineBadgeDot} />
            </View>

            <View style={styles.headerCopy}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.title} numberOfLines={1}>{participantName}</Text>
                <View style={[
                  styles.rolePill,
                  isOwnerView
                    ? { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }
                    : isDriver
                    ? { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }
                    : isKost
                    ? { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }
                    : { backgroundColor: "#FFEDD5", borderColor: "#FDBA74" }
                ]}>
                  <Text style={[
                    styles.rolePillText,
                    isOwnerView
                      ? { color: "#15803D" }
                      : isDriver
                      ? { color: "#15803D" }
                      : isKost
                      ? { color: "#15803D" }
                      : { color: "#C2410C" }
                  ]}>
                    {isOwnerView ? "PELANGGAN" : isDriver ? "KURIR" : isKost ? "PEMILIK KOS" : "TOKO"}
                  </Text>
                </View>
              </View>
              <View style={styles.headerSubtitleRow}>
                <View style={styles.onlineIndicatorMini} />
                <Text style={styles.subtitle} numberOfLines={1}>
                  {isOwnerView
                    ? "Calon Tamu / Penghuni • Aktif"
                    : isDriver
                    ? `Order #${orderId} • Siap Antar`
                    : isKost
                    ? `Properti & Homestay • Online`
                    : `Order #${orderId} • Toko Aktif`}
                </Text>
              </View>
            </View>

            {/* Direct WhatsApp Callout Button */}
            <TouchableOpacity
              style={styles.btnHeaderWa}
              onPress={handleOpenWhatsApp}
              activeOpacity={0.85}
            >
              <Phone size={13} color="#FFFFFF" />
              <Text style={styles.btnHeaderWaText}>WA</Text>
            </TouchableOpacity>
          </View>

          {/* Channel Identification Banner */}
          <View style={[
            styles.channelBanner,
            isOwnerView
              ? styles.channelBannerKost
              : isDriver
              ? styles.channelBannerDriver
              : isKost
              ? styles.channelBannerKost
              : styles.channelBannerStore
          ]}>
            {isOwnerView ? (
              <User size={13} color="#0D7A53" />
            ) : isDriver ? (
              <Bike size={13} color="#15803D" />
            ) : isKost ? (
              <Building2 size={13} color="#0D7A53" />
            ) : (
              <Store size={13} color="#C2410C" />
            )}
            <Text style={[
              styles.channelBannerText,
              isOwnerView
                ? styles.channelBannerTextKost
                : isDriver
                ? styles.channelBannerTextDriver
                : isKost
                ? styles.channelBannerTextKost
                : styles.channelBannerTextStore
            ]} numberOfLines={1}>
              {isOwnerView
                ? "Terhubung langsung dengan Pelanggan / Calon Penghuni"
                : isDriver
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
            ListHeaderComponent={
              (thread?.messages && thread.messages.length > 0) ? (
                <View style={styles.dateSeparatorRow}>
                  <View style={styles.dateSeparatorPill}>
                    <Text style={styles.dateSeparatorText}>Hari Ini</Text>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[
                  styles.emptyIconBg,
                  isOwnerView
                    ? { backgroundColor: "#DCFCE7" }
                    : isDriver
                    ? { backgroundColor: "#DCFCE7" }
                    : isKost
                    ? { backgroundColor: "#DCFCE7" }
                    : { backgroundColor: "#FFEDD5" }
                ]}>
                  <Icon size={28} color={isOwnerView ? "#0D7A53" : isDriver ? "#15803D" : isKost ? "#0D7A53" : "#EA580C"} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isOwnerView
                    ? "Percakapan dengan Pelanggan"
                    : isDriver
                    ? "Mulai Percakapan dengan Kurir"
                    : isKost
                    ? "Mulai Percakapan dengan Pemilik Kos"
                    : "Mulai Percakapan dengan Toko"}
                </Text>
                <Text style={styles.emptyText}>
                  {isOwnerView
                    ? "Jawab pertanyaan calon penyewa, kirim foto kamar, atau konfirmasi survei properti secara real-time."
                    : isDriver
                    ? "Tanyakan posisi driver atau koordinasi titik antar pesanan."
                    : isKost
                    ? "Tanyakan ketersediaan kamar, aturan kos, atau jadwalkan survei lokasi langsung ke pemilik."
                    : "Tanyakan rincian atau catatan khusus pesanan Anda langsung ke toko."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = isOwnerView ? (item.sender === "other") : (item.sender === "customer");
              const hasAttachment = !!item.attachment;
              const isImg = item.attachment?.type === "image";

              return (
                <View style={[styles.messageWrap, isMe ? styles.messageRight : styles.messageLeft]}>
                  {!isMe && (
                    <Text style={styles.senderNameLabel}>
                      {isOwnerView ? "👤 Pelanggan" : isKost ? "🏠 Pemilik Kos" : "📦 Toko"}
                    </Text>
                  )}
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
                            <View style={[styles.fileIconBox, isMe && { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                              <FileText size={20} color={isMe ? "#FFFFFF" : "#0D7A53"} />
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

                    <View style={[styles.messageFooterRow, isMe ? styles.footerRowRight : styles.footerRowLeft]}>
                      <Text style={[styles.time, isMe && styles.timeMe]}>{item.time}</Text>
                      {isMe && <CheckCheck size={13} color="#A7F3D0" style={{ marginLeft: 4 }} />}
                    </View>
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
              <Paperclip size={19} color={isAttachMenuOpen ? "#FFFFFF" : "#0D7A53"} />
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <TextInput
                value={typedMessage}
                onChangeText={setTypedMessage}
                editable={canSend}
                style={styles.input}
                placeholder={selectedAttachment ? "Tambah keterangan..." : "Ketik pesan..."}
                placeholderTextColor="#94A3B8"
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!canSend || (!typedMessage.trim() && !selectedAttachment)) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!canSend || (!typedMessage.trim() && !selectedAttachment)}
              activeOpacity={0.85}
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
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    backgroundColor: "#F1F5F9",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  onlineBadgeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerCopy: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
    maxWidth: 140,
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineIndicatorMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 10.5,
    fontWeight: "600",
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  btnHeaderWa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#25D366",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnHeaderWaText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  channelBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginHorizontal: 12,
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
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  channelBannerStore: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  channelBannerText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
    flex: 1,
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
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateSeparatorRow: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  dateSeparatorPill: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  quickChipsWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickChipsScroll: {
    gap: 8,
  },
  quickChip: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  quickChipText: {
    fontSize: 11.5,
    color: "#065F46",
    fontWeight: "700",
  },
  messageWrap: {
    marginBottom: 10,
    maxWidth: "82%",
  },
  messageLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  senderNameLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D7A53",
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    overflow: "hidden",
  },
  bubbleMe: {
    backgroundColor: "#0D7A53",
    borderBottomRightRadius: 4,
    elevation: 2,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  messageText: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  messageTextMe: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  messageFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  footerRowLeft: {
    justifyContent: "flex-start",
  },
  footerRowRight: {
    justifyContent: "flex-end",
  },
  time: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "600",
  },
  timeMe: {
    color: "#D1FAE5",
  },

  // Attachments in bubble
  attachmentInBubble: {
    marginBottom: 6,
  },
  bubbleImg: {
    width: 220,
    height: 155,
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleFileName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  bubbleFileNameMe: {
    color: "#FFFFFF",
  },
  bubbleFileSize: {
    fontSize: 10,
    color: "#64748B",
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
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 8,
    marginHorizontal: 12,
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
    fontWeight: "800",
    color: "#0D7A53",
  },
  pendingFileSize: {
    fontSize: 10,
    color: "#64748B",
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
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonActive: {
    backgroundColor: "#0D7A53",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  input: {
    minHeight: 40,
    maxHeight: 90,
    color: "#0F172A",
    fontSize: 13,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
    elevation: 0,
    shadowOpacity: 0,
  },

  // Attach Menu Modal
  attachBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
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
    fontWeight: "900",
    color: "#0F172A",
  },
  attachOptionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  attachOptionItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachOptionIconSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  attachOptionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  attachOptionSub: {
    fontSize: 9.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },

  // Full image preview
  imagePreviewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
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
