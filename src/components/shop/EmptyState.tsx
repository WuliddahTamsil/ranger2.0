import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { ShoppingBag, RefreshCw, AlertCircle, SearchX } from "lucide-react-native";

interface EmptyStateProps {
  title: string;
  description: string;
  buttonLabel?: string;
  onPressButton?: () => void;
  iconType?: "cart" | "search" | "error";
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  buttonLabel,
  onPressButton,
  iconType = "cart",
}) => {
  const renderIcon = () => {
    switch (iconType) {
      case "search":
        return <SearchX size={36} color="#9CA3AF" />;
      case "error":
        return <AlertCircle size={36} color="#DC2626" />;
      default:
        return <ShoppingBag size={36} color="#15803D" />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>{renderIcon()}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {buttonLabel && onPressButton && (
        <TouchableOpacity style={styles.button} onPress={onPressButton} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = "Memuat data Kanyaah Shop...",
}) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#15803D" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = "Terjadi kesalahan saat memuat data.", onRetry }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: "#FEF2F2" }]}>
        <AlertCircle size={36} color="#DC2626" />
      </View>
      <Text style={styles.title}>Gagal Memuat Data</Text>
      <Text style={styles.description}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
          <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15803D",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 12,
  },
});
