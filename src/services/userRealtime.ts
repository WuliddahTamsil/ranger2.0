import type { Socket } from "socket.io-client";
// @ts-ignore
import { io } from "socket.io-client/dist/socket.io.js";
import { API_BASE_URL, getStoredAuthToken } from "./api";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const subscribeToUserRealtime = async (
  onNotification: () => void,
  onOrderUpdate?: (order?: { _id?: string; id?: string; status?: string; deliveryProofUrl?: string; driverName?: string; driverPhone?: string; driverVehicle?: string }) => void
): Promise<() => void> => {
  const token = await getStoredAuthToken();
  if (!token) return () => undefined;

  const socket: Socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
  const refresh = () => onNotification();
  const update = (order?: Parameters<NonNullable<typeof onOrderUpdate>>[0]) => onOrderUpdate?.(order);
  socket.on("connect", () => socket.emit("join_user_room", { token }));
  socket.on("notification:new", refresh);
  socket.on("order_status_updated", update);
  socket.on("order_created", update);
  socket.on("ride:new_available", update);
  socket.on("ride:status_changed", update);
  socket.on("ride_driver_assigned", update);
  socket.on("ride:driver_assigned", update);
  socket.on("ride_status_updated", update);
  socket.on("ride:driver_location_updated", update);
  socket.on("recycle:status_updated", update);
  socket.on("recycle:completed", update);
  socket.on("recycle:new_deposit", update);
  socket.on("send:order_available", update);
  socket.on("send:driver_assigned", update);
  socket.on("send:status_updated", update);
  socket.on("send:order_completed", update);
  socket.on("send:delivery_verified", update);
  socket.on("send:pickup_verified", update);
  return () => {
    socket.off("notification:new", refresh);
    socket.off("order_status_updated", update);
    socket.off("order_created", update);
    socket.off("ride:new_available", update);
    socket.off("ride:status_changed", update);
    socket.off("ride_driver_assigned", update);
    socket.off("ride:driver_assigned", update);
    socket.off("ride_status_updated", update);
    socket.off("ride:driver_location_updated", update);
    socket.off("recycle:status_updated", update);
    socket.off("recycle:completed", update);
    socket.off("recycle:new_deposit", update);
    socket.off("send:order_available", update);
    socket.off("send:driver_assigned", update);
    socket.off("send:status_updated", update);
    socket.off("send:order_completed", update);
    socket.off("send:delivery_verified", update);
    socket.off("send:pickup_verified", update);
    socket.disconnect();
  };
};
