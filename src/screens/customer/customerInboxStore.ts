import AsyncStorage from "@react-native-async-storage/async-storage";

export type CustomerChatParticipantType = "driver" | "merchant";

export interface CustomerChatMessage {
  id: string;
  sender: "customer" | "other";
  text: string;
  time: string;
  attachment?: {
    type: "image" | "file";
    uri: string;
    name: string;
    size?: string;
  };
}

export interface CustomerChatThread {
  id: string;
  orderId: string;
  participantType: CustomerChatParticipantType;
  participantName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  messages?: CustomerChatMessage[];
}

const STORAGE_KEY = "ranger_customer_inbox_threads_v1";

const defaultThreads: CustomerChatThread[] = [
  {
    id: "ch_001",
    orderId: "RNG001",
    participantType: "driver",
    participantName: "Pak Asep (Driver)",
    lastMessage: "Pak, saya sudah di depan pagar ya.",
    updatedAt: "11:05",
    unreadCount: 1,
    messages: [
      { id: "ch_001_1", sender: "other", text: "Halo Kak, saya driver yang antar pesanan Nasi Timbel Anda. Sudah dekat ya.", time: "11:02" },
      { id: "ch_001_2", sender: "customer", text: "Baik Pak, ditunggu di depan teras.", time: "11:03" },
      { id: "ch_001_3", sender: "other", text: "Pak, saya sudah di depan pagar ya.", time: "11:05" },
    ],
  },
  {
    id: "ch_002",
    orderId: "RNG003",
    participantType: "merchant",
    participantName: "Catering Bu Haji Nani",
    lastMessage: "Nasi Box 20 pax sedang disiapkan ya kak.",
    updatedAt: "10:30",
    unreadCount: 0,
    messages: [
      { id: "ch_002_1", sender: "other", text: "Nasi Box 20 pax sedang disiapkan ya kak.", time: "10:30" },
    ],
  },
];

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
    // Gunakan thread bawaan jika data storage tidak dapat dibaca.
  }

  hydrated = true;
  notify();
  return getCustomerChatThreads();
};

export const upsertCustomerChatThread = (thread: CustomerChatThread) => {
  const existingIndex = threads.findIndex((item) => item.id === thread.id);
  if (existingIndex >= 0) {
    threads = threads.map((item, index) => (index === existingIndex ? { ...item, ...thread, messages: thread.messages || item.messages || [] } : item));
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
      ? { ...thread, messages: [...(thread.messages || []), message], lastMessage: message.text, updatedAt: message.time }
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
