import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from "react-native";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
  Utensils,
  ShieldCheck,
} from "lucide-react-native";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastConfig {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastBannerProps {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  duration = 3200,
}) => {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case "success":
        return {
          bg: "#F0FDF4",
          border: "#86EFAC",
          iconColor: "#16A34A",
          titleColor: "#14532D",
          textColor: "#166534",
          Icon: CheckCircle2,
        };
      case "error":
        return {
          bg: "#FEF2F2",
          border: "#FECACA",
          iconColor: "#DC2626",
          titleColor: "#991B1B",
          textColor: "#B91C1C",
          Icon: AlertCircle,
        };
      case "warning":
        return {
          bg: "#FFFBEB",
          border: "#FDE68A",
          iconColor: "#D97706",
          titleColor: "#92400E",
          textColor: "#B45309",
          Icon: AlertTriangle,
        };
      case "info":
      default:
        return {
          bg: "#F0F9FF",
          border: "#BAE6FD",
          iconColor: "#0284C7",
          titleColor: "#075985",
          textColor: "#0369A1",
          Icon: Info,
        };
    }
  };

  const theme = getTheme();
  const IconComp = theme.Icon;

  return (
    <View style={toastStyles.wrapper} pointerEvents="box-none">
      <View
        style={[
          toastStyles.container,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={toastStyles.iconWrap}>
          <IconComp size={22} color={theme.iconColor} />
        </View>

        <View style={toastStyles.textCol}>
          {Boolean(title) && (
            <Text style={[toastStyles.title, { color: theme.titleColor }]}>
              {title}
            </Text>
          )}
          {Boolean(message) && (
            <Text style={[toastStyles.message, { color: theme.textColor }]}>
              {message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={toastStyles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={theme.titleColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const toastStyles = StyleSheet.create({
  wrapper: {
    position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
    top: Platform.OS === "web" ? 20 : 54,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    gap: 10,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 10,
  },
});

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  badgeText?: string;
  type?: "danger" | "warning" | "success" | "info" | "primary" | "cooking";
  confirmText?: string;
  cancelText?: string | null;
  icon?: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  badgeText,
  type = "warning",
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  icon: CustomIcon,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const isCooking = type === "cooking";
  const isDanger = type === "danger";
  const isWarning = type === "warning";
  const isSuccess = type === "success" || isCooking;
  const hasCancel = cancelText !== null && cancelText !== undefined && Boolean(cancelText.trim());

  // Determine palette & badge
  let defaultBadge = "KONFIRMASI SISTEM";
  let themeColor = "#2563EB";
  let ringBg = "#EFF6FF";
  let innerBg = "#DBEAFE";
  let badgeBg = "#EFF6FF";
  let badgeBorder = "#BFDBFE";
  let badgeColor = "#1D4ED8";

  if (isCooking) {
    defaultBadge = "STATUS DAPUR & CATERING";
    themeColor = "#059669";
    ringBg = "#ECFDF5";
    innerBg = "#D1FAE5";
    badgeBg = "#ECFDF5";
    badgeBorder = "#A7F3D0";
    badgeColor = "#047857";
  } else if (isDanger) {
    defaultBadge = "PERINGATAN SISTEM";
    themeColor = "#DC2626";
    ringBg = "#FEF2F2";
    innerBg = "#FEE2E2";
    badgeBg = "#FEF2F2";
    badgeBorder = "#FECACA";
    badgeColor = "#B91C1C";
  } else if (isWarning) {
    defaultBadge = "PERHATIAN";
    themeColor = "#D97706";
    ringBg = "#FFFBEB";
    innerBg = "#FEF3C7";
    badgeBg = "#FFFBEB";
    badgeBorder = "#FDE68A";
    badgeColor = "#B45309";
  } else if (type === "success") {
    defaultBadge = "BERHASIL";
    themeColor = "#059669";
    ringBg = "#ECFDF5";
    innerBg = "#D1FAE5";
    badgeBg = "#ECFDF5";
    badgeBorder = "#A7F3D0";
    badgeColor = "#047857";
  }

  const activeBadge = badgeText || defaultBadge;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
    >
      <View style={dialogStyles.overlay}>
        <View style={dialogStyles.card}>
          {/* Top subtle close button */}
          {hasCancel && (
            <TouchableOpacity
              style={dialogStyles.cardCloseBtn}
              onPress={onCancel}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* Badge */}
          <View
            style={[
              dialogStyles.badge,
              {
                backgroundColor: badgeBg,
                borderColor: badgeBorder,
              },
            ]}
          >
            <Text style={[dialogStyles.badgeText, { color: badgeColor }]}>
              {activeBadge}
            </Text>
          </View>

          {/* Centered Icon with outer & inner glowing rings */}
          <View style={[dialogStyles.iconOuterRing, { backgroundColor: ringBg, borderColor: badgeBorder }]}>
            <View style={[dialogStyles.iconInnerRing, { backgroundColor: innerBg }]}>
              {CustomIcon ? (
                <CustomIcon size={28} color={themeColor} strokeWidth={2.3} />
              ) : isCooking ? (
                <Utensils size={28} color={themeColor} strokeWidth={2.3} />
              ) : isDanger ? (
                <Trash2 size={26} color={themeColor} strokeWidth={2.3} />
              ) : isWarning ? (
                <AlertTriangle size={26} color={themeColor} strokeWidth={2.3} />
              ) : isSuccess ? (
                <CheckCircle2 size={28} color={themeColor} strokeWidth={2.3} />
              ) : (
                <ShieldCheck size={28} color={themeColor} strokeWidth={2.3} />
              )}
            </View>
          </View>

          {/* Title */}
          <Text style={dialogStyles.title}>{title}</Text>

          {/* Message */}
          {Boolean(message) && (
            <Text style={dialogStyles.message}>{message}</Text>
          )}

          {/* Action Buttons */}
          <View style={dialogStyles.actions}>
            {hasCancel && (
              <TouchableOpacity
                style={dialogStyles.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={dialogStyles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                dialogStyles.confirmBtn,
                !hasCancel && { flex: 1 },
                {
                  backgroundColor: themeColor,
                  shadowColor: themeColor,
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={dialogStyles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Global Dialog Management & Web Polyfills
// ---------------------------------------------------------------------------

type DialogListener = (config: ConfirmDialogProps) => void;
const listeners = new Set<DialogListener>();

let currentDialogConfig: ConfirmDialogProps = {
  visible: false,
  title: "",
  message: "",
  onConfirm: () => {},
};

export const showGeoverseConfirm = ({
  title,
  message,
  badgeText,
  type,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  icon,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  badgeText?: string;
  type?: ConfirmDialogProps["type"];
  confirmText?: string;
  cancelText?: string | null;
  icon?: ConfirmDialogProps["icon"];
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}) => {
  let detectedType = type;
  if (!detectedType) {
    const combined = `${title} ${message}`.toLowerCase();
    if (combined.includes("masak") || combined.includes("dapur")) {
      detectedType = "cooking";
    } else if (
      combined.includes("hapus") ||
      combined.includes("tolak") ||
      combined.includes("batal") ||
      combined.includes("delete")
    ) {
      detectedType = "danger";
    } else if (
      combined.includes("sukses") ||
      combined.includes("berhasil") ||
      combined.includes("terima")
    ) {
      detectedType = "success";
    } else if (combined.includes("perhatian") || combined.includes("yakin")) {
      detectedType = "warning";
    } else {
      detectedType = "info";
    }
  }

  currentDialogConfig = {
    visible: true,
    title,
    message,
    badgeText,
    type: detectedType,
    confirmText,
    cancelText,
    icon,
    onConfirm: async () => {
      closeGeoverseDialog();
      await onConfirm?.();
    },
    onCancel: () => {
      closeGeoverseDialog();
      onCancel?.();
    },
  };
  listeners.forEach((l) => l(currentDialogConfig));
};

export const showGeoverseAlert = ({
  title,
  message,
  badgeText,
  type,
  confirmText = "Mengerti",
  icon,
  onConfirm,
}: {
  title: string;
  message: string;
  badgeText?: string;
  type?: ConfirmDialogProps["type"];
  confirmText?: string;
  icon?: ConfirmDialogProps["icon"];
  onConfirm?: () => void | Promise<void>;
}) => {
  showGeoverseConfirm({
    title,
    message,
    badgeText,
    type,
    confirmText,
    cancelText: null,
    icon,
    onConfirm: onConfirm || (() => {}),
  });
};

export const closeGeoverseDialog = () => {
  currentDialogConfig = { ...currentDialogConfig, visible: false };
  listeners.forEach((l) => l(currentDialogConfig));
};

/**
 * Hook for local component dialog control if preferred
 */
export const useCustomDialog = () => {
  const [config, setConfig] = useState<ConfirmDialogProps>({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = useCallback(
    ({
      title,
      message,
      badgeText,
      type,
      confirmText = "Ya, Lanjutkan",
      cancelText = "Batal",
      icon,
      onConfirm,
    }: {
      title: string;
      message: string;
      badgeText?: string;
      type?: ConfirmDialogProps["type"];
      confirmText?: string;
      cancelText?: string | null;
      icon?: ConfirmDialogProps["icon"];
      onConfirm: () => void | Promise<void>;
    }) => {
      let detectedType = type;
      if (!detectedType) {
        const combined = `${title} ${message}`.toLowerCase();
        if (combined.includes("masak") || combined.includes("dapur")) {
          detectedType = "cooking";
        } else if (
          combined.includes("hapus") ||
          combined.includes("tolak") ||
          combined.includes("batal")
        ) {
          detectedType = "danger";
        } else if (
          combined.includes("sukses") ||
          combined.includes("berhasil") ||
          combined.includes("terima")
        ) {
          detectedType = "success";
        } else {
          detectedType = "warning";
        }
      }

      setConfig({
        visible: true,
        title,
        message,
        badgeText,
        type: detectedType,
        confirmText,
        cancelText,
        icon,
        onConfirm: async () => {
          setConfig((prev) => ({ ...prev, visible: false }));
          await onConfirm();
        },
        onCancel: () => {
          setConfig((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    []
  );

  const showAlert = useCallback(
    ({
      title,
      message,
      badgeText,
      type = "info",
      confirmText = "Mengerti",
      icon,
      onConfirm,
    }: {
      title: string;
      message: string;
      badgeText?: string;
      type?: ConfirmDialogProps["type"];
      confirmText?: string;
      icon?: ConfirmDialogProps["icon"];
      onConfirm?: () => void;
    }) => {
      setConfig({
        visible: true,
        title,
        message,
        badgeText,
        type,
        confirmText,
        cancelText: null,
        icon,
        onConfirm: () => {
          setConfig((prev) => ({ ...prev, visible: false }));
          if (onConfirm) onConfirm();
        },
        onCancel: () => {
          setConfig((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    dialogProps: config,
    showConfirm,
    showAlert,
    closeDialog,
  };
};

/**
 * Global Dialog Container to render once in App.tsx
 */
export const GeoverseGlobalDialog: React.FC = () => {
  const [config, setConfig] = useState<ConfirmDialogProps>(currentDialogConfig);

  useEffect(() => {
    const listener = (newConfig: ConfirmDialogProps) => setConfig({ ...newConfig });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return <ConfirmDialog {...config} />;
};

/**
 * Initializes automatic redirection of Alert.alert & window.alert on Web
 * so that no browser default dialogs (like "localhost:xxxx menyatakan") ever appear.
 */
export const initGeoverseWebDialogs = () => {
  if (Platform.OS !== "web" && typeof window === "undefined") return;

  try {
    const alertImpl = (
      title?: string,
      message?: string,
      buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>,
      _options?: any
    ) => {
      const cleanTitle = title || "Pemberitahuan";
      const cleanMessage = message || "";

      if (!buttons || buttons.length === 0) {
        showGeoverseAlert({
          title: cleanTitle,
          message: cleanMessage,
        });
        return;
      }

      if (buttons.length === 1) {
        const btn = buttons[0];
        showGeoverseAlert({
          title: cleanTitle,
          message: cleanMessage,
          confirmText: btn.text || "Mengerti",
          type: btn.style === "destructive" ? "danger" : undefined,
          onConfirm: btn.onPress,
        });
        return;
      }

      // 2 or more buttons -> Confirmation
      const cancelBtn = buttons.find((b) => b.style === "cancel") || buttons[0];
      const confirmBtn =
        buttons.find((b) => b !== cancelBtn) || buttons[1] || buttons[0];

      showGeoverseConfirm({
        title: cleanTitle,
        message: cleanMessage,
        cancelText: cancelBtn?.text || "Batal",
        confirmText: confirmBtn?.text || "Lanjutkan",
        type: confirmBtn?.style === "destructive" ? "danger" : undefined,
        onConfirm: () => confirmBtn?.onPress?.(),
        onCancel: () => cancelBtn?.onPress?.(),
      });
    };

    // Replace Alert.alert
    (Alert as any).alert = alertImpl;
  } catch (e) {
    console.warn("Could not polyfill Alert.alert for Web", e);
  }

  try {
    if (typeof window !== "undefined") {
      window.alert = (msg?: any) => {
        showGeoverseAlert({
          title: "Pemberitahuan Sistem",
          message: String(msg ?? ""),
          type: "info",
        });
      };
    }
  } catch (e) {
    console.warn("Could not polyfill window.alert for Web", e);
  }
};

// Auto-run on module load on web
if (Platform.OS === "web" || typeof window !== "undefined") {
  initGeoverseWebDialogs();
}

const dialogStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    ...(Platform.OS === "web" ? { backdropFilter: "blur(8px)" } : {}),
    zIndex: 9999999,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.9)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 12,
    position: "relative",
  },
  cardCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  iconOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconInnerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#0F172A",
    fontSize: 18.5,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  message: {
    color: "#475569",
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  confirmBtn: {
    flex: 1.35,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  cancelText: {
    color: "#475569",
    fontSize: 13.5,
    fontWeight: "700",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
