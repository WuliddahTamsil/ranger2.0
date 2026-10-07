export interface DriverOrderBasic {
  id: string;
  status: string;
  rawStatus?: string;
  driverId?: string | null;
  createdAt?: string;
  acceptedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  [key: string]: any;
}

/**
 * Extracts when the order was accepted by the driver from the raw order object.
 */
export const extractOrderAcceptedAt = (order: any): string | undefined => {
  if (!order) return undefined;

  // 1. Explicit acceptedAt field if available
  if (order.acceptedAt) return String(order.acceptedAt);

  // 2. Check statusHistory array (available on RideOrder, SendOrder, ShopOrder, WasteDeposit)
  if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
    const assignedHistory = [...order.statusHistory].reverse().find((h: any) =>
      h?.status === "DRIVER_ASSIGNED" ||
      h?.status === "DRIVER_ON_THE_WAY" ||
      h?.status === "DRIVER_ON_THE_WAY_TO_PICKUP" ||
      h?.status === "PICKUP_ON_THE_WAY" ||
      h?.status === "DRIVER_MENUJU_CUSTOMER" ||
      h?.status === "Menuju Pickup" ||
      h?.status === "TAKEN_BY_DRIVER" ||
      h?.actorRole === "driver" ||
      h?.actor === "driver"
    );
    if (assignedHistory?.createdAt) return String(assignedHistory.createdAt);
    if (assignedHistory?.time) return String(assignedHistory.time);
  }

  // 3. If driver is already assigned or order is in-progress / completed
  const hasDriverAssigned =
    Boolean(order.driverId) ||
    Boolean(order.driverPickupId) ||
    Boolean(order.driverDeliveryId);

  const isProgressOrDoneStatus = [
    "DRIVER_ASSIGNED",
    "DRIVER_ON_THE_WAY",
    "DRIVER_ON_THE_WAY_TO_PICKUP",
    "DRIVER_ARRIVED",
    "DRIVER_ARRIVED_AT_PICKUP",
    "TRIP_STARTED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERING",
    "ARRIVED",
    "Menuju Pickup",
    "Sampai Pickup",
    "Mengantar",
    "Selesai",
    "COMPLETED",
  ].includes(order.status || order.rawStatus || "");

  if (hasDriverAssigned || isProgressOrDoneStatus) {
    return String(order.updatedAt || order.createdAt || "");
  }

  return undefined;
};

/**
 * Resolves the numeric timestamp for sorting driver orders.
 * Orders that were accepted recently or have recent activity will have a higher timestamp.
 */
export const getDriverOrderSortTime = (order: DriverOrderBasic): number => {
  const isDone =
    order.status === "Selesai" ||
    order.status === "Dibatalkan" ||
    order.rawStatus === "COMPLETED" ||
    order.rawStatus === "CANCELLED";

  if (isDone) {
    // For completed/cancelled orders: newest completed, updated, or accepted at the top
    if (order.completedAt) {
      const t = new Date(order.completedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (order.updatedAt) {
      const t = new Date(order.updatedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (order.acceptedAt) {
      const t = new Date(order.acceptedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (order.createdAt) {
      const t = new Date(order.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
  } else {
    // For active or pending orders:
    // Priority 1: acceptedAt (when driver accepted this order)
    if (order.acceptedAt) {
      const t = new Date(order.acceptedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    // Priority 2: updatedAt (latest progress)
    if (order.updatedAt) {
      const t = new Date(order.updatedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    // Priority 3: createdAt
    if (order.createdAt) {
      const t = new Date(order.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
  }

  // Priority 4: Fallback to MongoDB ObjectId 4-byte unix timestamp
  if (order.id && typeof order.id === "string" && order.id.length >= 8) {
    const hex = order.id.slice(0, 8);
    const sec = parseInt(hex, 16);
    if (!isNaN(sec) && sec > 1500000000 && sec < 2500000000) {
      return sec * 1000;
    }
  }

  return 0;
};

/**
 * Returns true if the order is currently active (being handled by the driver).
 */
export const isDriverOrderActive = (order: DriverOrderBasic): boolean => {
  if (["Menuju Pickup", "Sampai Pickup", "Mengantar"].includes(order.status)) {
    return true;
  }
  // When driver has accepted an order that is in "Siap" status (e.g. Marketplace, Send, Catering)
  if (order.status === "Siap" && Boolean(order.driverId)) {
    return true;
  }
  return false;
};

/**
 * Returns true if the order is available/pending acceptance by the driver.
 */
export const isDriverOrderPending = (order: DriverOrderBasic): boolean => {
  if (order.status === "Menunggu") {
    return true;
  }
  if (order.status === "Siap" && (!order.driverId || order.driverId === "")) {
    return true;
  }
  return false;
};

/**
 * Sorts driver orders so that:
 * 1. Active orders (newly accepted by driver) appear at the very top, sorted newest accepted first.
 * 2. Pending available orders waiting to be accepted appear next (newest first).
 * 3. Completed orders appear next, sorted newest accepted/completed first.
 *
 * This ensures "yg paling teratas berarti orderan terbaru yg baru saja di accapted oleh driver".
 */
export const sortDriverOrders = <T extends DriverOrderBasic>(orders: T[]): T[] => {
  return [...orders].sort((a, b) => {
    const aActive = isDriverOrderActive(a);
    const bActive = isDriverOrderActive(b);

    // Active orders (just accepted / ongoing) ALWAYS take precedence at the very top
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aActive && bActive) {
      // Both active: the one accepted most recently is at the very top!
      return getDriverOrderSortTime(b) - getDriverOrderSortTime(a);
    }

    const aPending = isDriverOrderPending(a);
    const bPending = isDriverOrderPending(b);

    // Pending incoming orders take precedence over completed history
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    if (aPending && bPending) {
      return getDriverOrderSortTime(b) - getDriverOrderSortTime(a);
    }

    // Both are completed or finished: newest accepted/completed at the top
    return getDriverOrderSortTime(b) - getDriverOrderSortTime(a);
  });
};

/**
 * Safely maps any service's rating object or score into DriverOrder.rating
 */
export const mapDriverOrderRating = (
  rawRating: any
): { score: number; review?: string; createdAt?: string } | undefined => {
  if (!rawRating) return undefined;
  const rawScore =
    rawRating.score != null
      ? rawRating.score
      : rawRating.stars != null
      ? rawRating.stars
      : rawRating;
  const numScore = Number(rawScore);
  if (!numScore || isNaN(numScore) || numScore < 1) return undefined;
  return {
    score: Math.min(5, Math.max(1, Math.round(numScore))),
    review: typeof rawRating.review === "string" ? rawRating.review : "",
    createdAt:
      rawRating.createdAt || rawRating.ratedAt
        ? String(rawRating.createdAt || rawRating.ratedAt)
        : undefined,
  };
};
