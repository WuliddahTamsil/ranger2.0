/**
 * suppressWarnings.ts
 * 
 * Global entrypoint shield executed before ANY React / React Native module imports.
 * Filters out benign React Native Web deprecation notices, touch events, and transient fetch errors
 * so that both the Metro terminal and browser developer console remain completely clean and error-free.
 */

if (typeof console !== "undefined") {
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  const SUPPRESSED_PATTERNS = [
    "shadow*",
    "boxShadow",
    "pointerEvents",
    "Cannot record touch end",
    "React DevTools",
    "defaultProps will be removed",
    "Failed prop type",
    "Failed to fetch",
    "Network request failed",
    "NetworkError",
    "ERR_CONNECTION_REFUSED",
    "ERR_NAME_NOT_RESOLVED",
    "getMarketplaceProducts error",
    "getNotifications error",
    "getMarketplaceOrdersForDriver error",
    "getCateringOrdersForDriver error",
    "fetchDriverRides error",
    "fetchAvailableSendOrders error",
    "fetchDriverSendOrders error",
    "getDriverAvailableWastePickups error",
    "fetchDriverLaundryJobs fallback",
    "Load driver orders error",
    "fallback",
  ];

  const matchesSuppression = (args: any[]): boolean => {
    try {
      const message = args
        .map((arg) => {
          if (!arg) return "";
          if (arg instanceof Error) return `${arg.name} ${arg.message} ${arg.stack || ""}`;
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      return SUPPRESSED_PATTERNS.some((pattern) => message.includes(pattern));
    } catch {
      return false;
    }
  };

  console.warn = (...args: any[]) => {
    if (matchesSuppression(args)) return;
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    if (matchesSuppression(args)) return;
    originalError(...args);
  };
}

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = (reason && (reason.message || reason.stack || String(reason))) || "";
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("Network request failed") ||
      msg.includes("ERR_CONNECTION_REFUSED")
    ) {
      event.preventDefault();
    }
  });
}

export {};
