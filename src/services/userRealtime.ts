import type { Socket } from "socket.io-client";
// @ts-ignore
import { io } from "socket.io-client/dist/socket.io.js";
import { API_BASE_URL, getStoredAuthToken } from "./api";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const subscribeToUserRealtime = async (
  onNotification: () => void,
  onOrderUpdate?: () => void
): Promise<() => void> => {
  const token = await getStoredAuthToken();
  if (!token) return () => undefined;

  const socket: Socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
  const refresh = () => onNotification();
  const update = () => onOrderUpdate?.();
  socket.on("connect", () => socket.emit("join_user_room", { token }));
  socket.on("notification:new", refresh);
  socket.on("order_status_updated", update);
  socket.on("order_created", update);
  return () => {
    socket.off("notification:new", refresh);
    socket.off("order_status_updated", update);
    socket.off("order_created", update);
    socket.disconnect();
  };
};
