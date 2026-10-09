import React, { useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
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
  type?: "danger" | "warning" | "success" | "info";
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  type = "danger",
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const isDanger = type === "danger";
  const isWarning = type === "warning";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={dialogStyles.overlay}>
        <View style={dialogStyles.card}>
          <View
            style={[
              dialogStyles.iconCircle,
              {
                backgroundColor: isDanger
                  ? "#FEE2E2"
                  : isWarning
                  ? "#FEF3C7"
                  : "#DCFCE7",
              },
            ]}
          >
            {isDanger ? (
              <Trash2 size={24} color="#DC2626" />
            ) : isWarning ? (
              <AlertTriangle size={24} color="#D97706" />
            ) : (
              <CheckCircle2 size={24} color="#16A34A" />
            )}
          </View>

          <Text style={dialogStyles.title}>{title}</Text>
          <Text style={dialogStyles.message}>{message}</Text>

          <View style={dialogStyles.actions}>
            <TouchableOpacity
              style={dialogStyles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={dialogStyles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                dialogStyles.confirmBtn,
                {
                  backgroundColor: isDanger
                    ? "#DC2626"
                    : isWarning
                    ? "#D97706"
                    : "#1B7A4E",
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={dialogStyles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const dialogStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    zIndex: 999998,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  confirmBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
