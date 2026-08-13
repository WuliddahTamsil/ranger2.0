import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Nav } from "../../types";
import { ArrowLeft, Bike, Check, MessageCircle, Play, RotateCcw } from "lucide-react-native";
import { CustomerChatModal } from "./CustomerChatModal";
import { getLatestOrderByType } from "./customerOrderStore";

export const CustomerLaundryTrackingScreen: React.FC<Nav> = ({ navigate }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(true);
  const [chatVisible, setChatVisible] = useState(false);
  const latestOrder = getLatestOrderByType("Laundry");

  // Auto step simulation timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoSimulating) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev < 5 ? prev + 1 : 1));
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAutoSimulating]);

  const steps = [
    {
      stepNum: 1,
      title: "Menunggu Driver",
      subtitle: "Driver sedang menuju ke lokasi Anda",
      activeText: "Status Aktif",
      activeSub: "Pembaruan otomatis...",
    },
    {
      stepNum: 2,
      title: "Proses Pencucian",
      subtitle: "Pakaian Anda sedang dicuci dengan sepenuh hati",
      activeText: "Sedang Dicuci",
      activeSub: "Mitra sedang memproses pakaian...",
    },
    {
      stepNum: 3,
      title: "Selesai Dicuci",
      subtitle: "Menunggu kurir untuk pengantaran",
      activeText: "Siap Diantar",
      activeSub: "Pakaian sudah rapi & wangi...",
    },
    {
      stepNum: 4,
      title: "Pengantaran",
      subtitle: "Driver sedang menuju ke lokasi Anda",
      activeText: "Dalam Perjalanan",
      activeSub: "Driver membawa pakaian ke rumah Anda...",
    },
    {
      stepNum: 5,
      title: "Pesanan Selesai",
      subtitle: "Pakaian bersih siap digunakan!",
      activeText: "Selesai",
      activeSub: "Terima kasih telah menggunakan Rangers!",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigate("c_home")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tracking Pesanan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main White Tracking Card */}
        <View style={styles.trackingCard}>
          {/* Merchant Title & Estimated Completion */}
          <Text style={styles.merchantTitle}>Pesanan Laundry Express Pak Dedi</Text>
          <Text style={styles.estimatedText}>Estimasi Selesai: Besok, 10:00</Text>

          {/* Stepper Timeline */}
          <View style={styles.timelineContainer}>
            {steps.map((item, index) => {
              const isActive = item.stepNum === currentStep;
              const isCompleted = item.stepNum < currentStep;
              const isLast = index === steps.length - 1;

              return (
                <View key={item.stepNum} style={styles.stepItemRow}>
                  {/* Left Circle & Connecting Line Column */}
                  <View style={styles.leftCol}>
                    <TouchableOpacity
                      style={[
                        styles.circleBadge,
                        isActive && styles.circleBadgeActive,
                        isCompleted && styles.circleBadgeCompleted,
                      ]}
                      onPress={() => {
                        setIsAutoSimulating(false);
                        setCurrentStep(item.stepNum);
                      }}
                      activeOpacity={0.8}
                    >
                      {isCompleted ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Text
                          style={[
                            styles.circleText,
                            (isActive || isCompleted) && styles.circleTextActive,
                          ]}
                        >
                          {item.stepNum}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {!isLast && (
                      <View
                        style={[
                          styles.connectingLine,
                          isCompleted && styles.connectingLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Step Details Column */}
                  <View style={styles.rightCol}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isActive && styles.stepTitleActive,
                        isCompleted && styles.stepTitleCompleted,
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.stepSubtitle}>{item.subtitle}</Text>

                    {/* Active Status Highlight Card */}
                    {isActive && (
                      <View style={styles.activeStatusCard}>
                        <View style={styles.bikeIconBg}>
                          <Bike size={20} color="#0D7A53" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activeStatusTitle}>{item.activeText}</Text>
                          <Text style={styles.activeStatusSub}>{item.activeSub}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Live Demo Simulation Control Panel */}
        <View style={styles.simControlCard}>
          <Text style={styles.simTitle}>⚡ Live Demo Tracking Simulator</Text>
          <Text style={styles.simSub}>
            Status berubah otomatis setiap 4 detik. Anda juga dapat mengetuk langkah di atas.
          </Text>

          <View style={styles.simBtnRow}>
            <TouchableOpacity
              style={[styles.simBtn, isAutoSimulating && styles.simBtnActive]}
              onPress={() => setIsAutoSimulating(!isAutoSimulating)}
              activeOpacity={0.8}
            >
              <Play size={14} color={isAutoSimulating ? "#FFFFFF" : "#0D7A53"} />
              <Text style={[styles.simBtnText, isAutoSimulating && styles.simBtnTextActive]}>
                {isAutoSimulating ? "Jeda Simulasi" : "Mulai Auto Demo"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtnOutline}
              onPress={() => {
                setIsAutoSimulating(false);
                setCurrentStep(1);
              }}
              activeOpacity={0.8}
            >
              <RotateCcw size={14} color="#374151" />
              <Text style={styles.simBtnOutlineText}>Reset Step 1</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <TouchableOpacity style={styles.chatFloatingButton} onPress={() => setChatVisible(true)}><MessageCircle size={17} color="#1B7A4E" /><Text style={styles.chatFloatingText}>Chat Driver Laundry</Text></TouchableOpacity>
      <CustomerChatModal visible={chatVisible} onClose={() => setChatVisible(false)} orderId={latestOrder?.id || "LAUNDRY-TRACKING"} participantName="Driver Laundry" participantType="driver" initialMessage="Halo Kak, saya driver laundry. Ada yang bisa dibantu?" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatFloatingButton: { position: "absolute", right: 20, bottom: 20, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5EE", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 10, elevation: 3 },
  chatFloatingText: { color: "#1B7A4E", fontSize: 11, fontWeight: "900" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Main Tracking Card
  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    marginBottom: 20,
  },
  merchantTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  estimatedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
  },

  // Stepper Timeline
  timelineContainer: {
    paddingLeft: 4,
  },
  stepItemRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  leftCol: {
    alignItems: "center",
    width: 40,
    marginRight: 12,
  },
  circleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  circleBadgeActive: {
    backgroundColor: "#0D7A53",
  },
  circleBadgeCompleted: {
    backgroundColor: "#0D7A53",
  },
  circleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9CA3AF",
  },
  circleTextActive: {
    color: "#FFFFFF",
  },
  connectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  connectingLineCompleted: {
    backgroundColor: "#0D7A53",
  },

  rightCol: {
    flex: 1,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  stepTitleActive: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D7A53",
  },
  stepTitleCompleted: {
    color: "#111827",
  },
  stepSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // Active Status Banner
  activeStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 12,
  },
  bikeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  activeStatusTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
  },
  activeStatusSub: {
    fontSize: 11,
    color: "#0D7A53",
    marginTop: 2,
    opacity: 0.9,
  },

  // Live Demo Controls
  simControlCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  simTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  simSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  simBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  simBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0D7A53",
    backgroundColor: "#FFFFFF",
  },
  simBtnActive: {
    backgroundColor: "#0D7A53",
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  simBtnTextActive: {
    color: "#FFFFFF",
  },
  simBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  simBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
});
