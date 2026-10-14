import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, RefreshCw, Home } from "lucide-react-native";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color="#DC2626" />
            </View>

            <Text style={styles.title}>Terjadi Kendala Teknis</Text>
            <Text style={styles.subtitle}>
              Halaman ini mengalami kendala saat memproses data. Akun dan saldo Anda tetap aman.
            </Text>

            {this.state.error?.message ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>Muat Ulang Halaman</Text>
              </TouchableOpacity>

              {this.props.onReset ? (
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={this.handleReset}
                  activeOpacity={0.8}
                >
                  <Home size={16} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={styles.btnSecondaryText}>Kembali ke Beranda</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
  },
  errorBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  errorText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "monospace",
  },
  buttonRow: {
    width: "100%",
    maxWidth: 320,
    gap: 10,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#15803D",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
  },
  btnSecondaryText: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "700",
  },
});
