import { io, Socket } from "socket.io-client";
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
    autoConnect: true,
  });

  socket.on("connect", () => {
    socket.emit("join_conversation", { orderId, token });
  });
  socket.on("chat:message", onMessage);

  return () => {
    socket.off("chat:message", onMessage);
    socket.disconnect();
  };
};
