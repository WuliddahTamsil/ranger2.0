import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteChatConversation,
  deleteMultipleChatConversations,
  clearAllChatConversations,
} from "../../services/api";

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
const DELETED_STORAGE_KEY = "ranger_customer_deleted_chat_threads_v1";

const defaultThreads: CustomerChatThread[] = [];

let threads: CustomerChatThread[] = [...defaultThreads];
let deletedThreadIds: Set<string> = new Set();
let hydrated = false;
const listeners = new Set<(threads: CustomerChatThread[]) => void>();

const notify = () => {
  const snapshot = threads.map((thread) => ({ ...thread, messages: [...(thread.messages || [])] }));
  listeners.forEach((listener) => listener(snapshot));
};

const persist = () => {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
};

const persistDeleted = () => {
  void AsyncStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(deletedThreadIds)));
};

export const isCustomerChatThreadDeleted = (threadId: string, orderId?: string): boolean => {
  if (!threadId && !orderId) return false;
  if (threadId && deletedThreadIds.has(threadId)) return true;
  if (orderId) {
    if (deletedThreadIds.has(orderId)) return true;
    if (deletedThreadIds.has(`driver_${orderId}`)) return true;
    if (deletedThreadIds.has(`merchant_${orderId}`)) return true;
  }
  return false;
};

export const getCustomerChatThreads = () =>
  threads
    .filter((thread) => !isCustomerChatThreadDeleted(thread.id, thread.orderId))
    .map((thread) => ({ ...thread, messages: [...(thread.messages || [])] }));

export const subscribeCustomerChatThreads = (listener: (threads: CustomerChatThread[]) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const hydrateCustomerChatThreads = async () => {
  if (hydrated) return getCustomerChatThreads();

  try {
    const [storedThreads, storedDeleted] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(DELETED_STORAGE_KEY),
    ]);

    if (storedDeleted) {
      const parsedDeleted = JSON.parse(storedDeleted);
      if (Array.isArray(parsedDeleted)) {
        deletedThreadIds = new Set(parsedDeleted.map(String));
      }
    }

    if (storedThreads) {
      const parsed = JSON.parse(storedThreads) as CustomerChatThread[];
      if (Array.isArray(parsed)) {
        threads = parsed
          .filter((t) => !isCustomerChatThreadDeleted(t.id, t.orderId))
          .map((thread) => ({ ...thread, messages: Array.isArray(thread.messages) ? thread.messages : [] }));
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
  if (isCustomerChatThreadDeleted(thread.id, thread.orderId)) {
    return undefined;
  }

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

export const syncCustomerChatThreads = (incomingThreads: CustomerChatThread[]) => {
  const validIncoming = incomingThreads.filter((t) => !isCustomerChatThreadDeleted(t.id, t.orderId));
  
  // Merge incoming with existing threads, prioritizing latest messages
  const existingMap = new Map(threads.map((t) => [t.id, t]));
  validIncoming.forEach((t) => {
    const prev = existingMap.get(t.id);
    if (!prev) {
      existingMap.set(t.id, t);
    } else {
      existingMap.set(t.id, {
        ...prev,
        ...t,
        messages: Array.isArray(t.messages) && t.messages.length > 0 ? t.messages : prev.messages,
        lastMessage: t.lastMessage || prev.lastMessage,
        updatedAt: t.updatedAt || prev.updatedAt,
      });
    }
  });

  threads = Array.from(existingMap.values()).filter((t) => !isCustomerChatThreadDeleted(t.id, t.orderId));
  persist();
  notify();
  return getCustomerChatThreads();
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

export const deleteCustomerChatThread = async (threadId: string, orderId?: string) => {
  if (threadId) deletedThreadIds.add(threadId);
  if (orderId) {
    deletedThreadIds.add(orderId);
    deletedThreadIds.add(`driver_${orderId}`);
    deletedThreadIds.add(`merchant_${orderId}`);
  }
  persistDeleted();

  threads = threads.filter((t) => t.id !== threadId && (!orderId || t.orderId !== orderId));
  persist();
  notify();

  // Async server deletion
  const targetOrderId = orderId || threadId.replace(/^(driver|merchant)_/, "");
  if (targetOrderId) {
    void deleteChatConversation(targetOrderId);
  }
};

export const deleteCustomerChatThreads = async (threadIds: string[], orderIds?: string[]) => {
  const idsToDelete = new Set(threadIds);
  const distinctOrders = new Set<string>(orderIds ? orderIds.filter(Boolean) : []);

  threadIds.forEach((id) => {
    deletedThreadIds.add(id);
    const extractedOrder = id.replace(/^(driver|merchant)_/, "");
    if (extractedOrder) distinctOrders.add(extractedOrder);
  });

  if (orderIds) {
    orderIds.forEach((oid) => {
      if (oid) {
        deletedThreadIds.add(oid);
        deletedThreadIds.add(`driver_${oid}`);
        deletedThreadIds.add(`merchant_${oid}`);
        distinctOrders.add(oid);
      }
    });
  }

  persistDeleted();

  threads = threads.filter(
    (t) => !idsToDelete.has(t.id) && (!t.orderId || !distinctOrders.has(t.orderId))
  );
  persist();
  notify();

  // Async server deletion
  const orderList = Array.from(distinctOrders);
  if (orderList.length > 0) {
    void deleteMultipleChatConversations(orderList);
  }
};

export const clearAllCustomerChatThreads = async () => {
  threads.forEach((t) => {
    deletedThreadIds.add(t.id);
    if (t.orderId) {
      deletedThreadIds.add(t.orderId);
      deletedThreadIds.add(`driver_${t.orderId}`);
      deletedThreadIds.add(`merchant_${t.orderId}`);
    }
  });

  persistDeleted();
  threads = [];
  persist();
  notify();

  void clearAllChatConversations();
};
