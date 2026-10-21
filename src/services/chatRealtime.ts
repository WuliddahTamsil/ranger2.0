import type { Socket } from "socket.io-client";
// @ts-ignore
import { io } from "socket.io-client/dist/socket.io.js";
import { API_BASE_URL, getStoredAuthToken } from "./api";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const subscribeToChatRealtime = async (
  orderId: string,
  onMessage: (message: any) => void
): Promise<() => void> => {
  const token = await getStoredAuthToken();
  if (!token || !orderId) return () => undefined;

  const socket: Socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 8000,
    autoConnect: true,
  });

  const handleJoin = () => {
    try {
      socket.emit("join_conversation", { orderId, token });
    } catch {}
  };

  socket.on("connect", handleJoin);
  if (socket.connected) {
    handleJoin();
  }

  socket.on("connect_error", () => {});
  socket.on("error", () => {});
  socket.on("chat:message", onMessage);

  return () => {
    socket.off("chat:message", onMessage);
    socket.disconnect();
  };
};
