import AsyncStorage from "@react-native-async-storage/async-storage";

export type CustomerChatParticipantType = "driver" | "merchant" | "pemilik_kos" | "customer";

export interface CustomerChatMessage {
  id: string;
  sender: "customer" | "other";
  senderName?: string;
  senderPhoto?: string;
  text: string;
  time: string;
  createdAt?: string;
  attachment?: {
    type: "image" | "file" | "video";
    uri: string;
    name: string;
    size?: string;
    duration?: number;
    thumbnailUrl?: string;
  };
}

export interface CustomerChatThread {
  id: string;
  orderId: string;
  participantType: CustomerChatParticipantType;
  participantName: string;
  participantPhoto?: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  messages?: CustomerChatMessage[];
}

const STORAGE_KEY = "ranger_customer_inbox_threads_v2";

const defaultThreads: CustomerChatThread[] = [];

let threads: CustomerChatThread[] = [...defaultThreads];
let hydrated = false;
const listeners = new Set<(threads: CustomerChatThread[]) => void>();

const notify = () => {
  const snapshot = threads.map((thread) => ({ ...thread, messages: [...(thread.messages || [])] }));
  listeners.forEach((listener) => listener(snapshot));
};

const persist = () => {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
};

export const getCustomerChatThreads = () => threads.map((thread) => ({ ...thread, messages: [...(thread.messages || [])] }));

export const subscribeCustomerChatThreads = (listener: (threads: CustomerChatThread[]) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const hydrateCustomerChatThreads = async () => {
  if (hydrated) return getCustomerChatThreads();

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CustomerChatThread[];
      if (Array.isArray(parsed)) {
        threads = parsed.map((thread) => ({ ...thread, messages: Array.isArray(thread.messages) ? thread.messages : [] }));
      }
    }
  } catch {
    threads = [...defaultThreads];
  } finally {
    hydrated = true;
    notify();
  }

  return getCustomerChatThreads();
};

export const upsertCustomerChatThread = (thread: CustomerChatThread) => {
  const existingIndex = threads.findIndex((item) => item.id === thread.id);
  if (existingIndex >= 0) {
    const existingThread = threads[existingIndex];
    const incomingMessages = Array.isArray(thread.messages) ? thread.messages : (existingThread.messages || []);

    // Seamlessly preserve any optimistic/pending messages not yet in incoming server messages
    const pendingMessages = (existingThread.messages || []).filter((existingMsg) => {
      const isOptimistic = existingMsg.id.startsWith("local_") || existingMsg.id.startsWith("chat_");
      if (!isOptimistic) return false;
      const alreadyConfirmed = incomingMessages.some(
        (inc) => inc.id === existingMsg.id || (inc.text === existingMsg.text && inc.sender === existingMsg.sender)
      );
      return !alreadyConfirmed;
    });

    const mergedMessages = [...incomingMessages, ...pendingMessages];

    threads = threads.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            ...thread,
            messages: mergedMessages,
            lastMessage: mergedMessages.length > 0 ? mergedMessages[mergedMessages.length - 1].text : thread.lastMessage,
            updatedAt: mergedMessages.length > 0 ? mergedMessages[mergedMessages.length - 1].time : thread.updatedAt,
          }
        : item
    );
  } else {
    threads = [thread, ...threads];
  }
  persist();
  notify();
  return threads.find((item) => item.id === thread.id);
};

export const updateCustomerChatThread = (threadId: string, updates: Partial<CustomerChatThread>) => {
  threads = threads.map((thread) => (thread.id === threadId ? { ...thread, ...updates } : thread));
  persist();
  notify();
};

export const appendCustomerChatMessage = (threadId: string, message: CustomerChatMessage) => {
  threads = threads.map((thread) =>
    thread.id === threadId
      ? {
          ...thread,
          messages: [...(thread.messages || []), message],
          lastMessage: message.text || (message.attachment?.type === "image" ? "📷 Foto" : message.attachment?.type === "video" ? "🎥 Video" : "📎 Dokumen"),
          updatedAt: message.time,
        }
      : thread
  );
  persist();
  notify();
};

export const markCustomerChatThreadRead = (threadId: string) => {
  updateCustomerChatThread(threadId, { unreadCount: 0 });
};

export const ensureCustomerChatThread = (input: Omit<CustomerChatThread, "messages"> & { messages?: CustomerChatMessage[] }) => {
  const existing = threads.find((thread) => thread.id === input.id);
  if (existing) return existing;
  return upsertCustomerChatThread({ ...input, messages: input.messages || [] });
};
