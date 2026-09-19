import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Zap, Calendar, Clock, Check } from "lucide-react-native";

export interface DeliverySlotState {
  type: "INSTANT" | "SCHEDULED";
  scheduledDate?: string;
  timeSlot?: string;
}

interface DeliverySlotSelectorProps {
  value: DeliverySlotState;
  onChange: (value: DeliverySlotState) => void;
  instantEtaMinutes?: number;
}

const DATE_OPTIONS = [
  { label: "Hari Ini", value: "TODAY" },
  { label: "Besok", value: "TOMORROW" },
  { label: "Lusa", value: "DAY_AFTER" },
];

const TIME_SLOTS = [
  "08:00 - 10:00 (Pagi)",
  "10:30 - 12:30 (Siang)",
  "13:30 - 15:30 (Siang)",
  "16:00 - 18:00 (Sore)",
  "18:30 - 20:30 (Malam)",
];

export const DeliverySlotSelector: React.FC<DeliverySlotSelectorProps> = ({
  value,
  onChange,
  instantEtaMinutes = 25,
}) => {
  const isInstant = value.type === "INSTANT";

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Waktu Pengiriman</Text>

      {/* Toggle Tab */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, isInstant && styles.activeTabBtn]}
          onPress={() => onChange({ type: "INSTANT" })}
          activeOpacity={0.8}
        >
          <Zap size={16} color={isInstant ? "#15803D" : "#6B7280"} />
          <Text style={[styles.tabText, isInstant && styles.activeTabText]}>Antar Sekarang</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, !isInstant && styles.activeTabBtn]}
          onPress={() =>
            onChange({
              type: "SCHEDULED",
              scheduledDate: value.scheduledDate || "TODAY",
              timeSlot: value.timeSlot || TIME_SLOTS[0],
            })
          }
          activeOpacity={0.8}
        >
          <Calendar size={16} color={!isInstant ? "#15803D" : "#6B7280"} />
          <Text style={[styles.tabText, !isInstant && styles.activeTabText]}>Jadwalkan</Text>
        </TouchableOpacity>
      </View>

      {isInstant ? (
        <View style={styles.instantBox}>
          <Clock size={16} color="#15803D" />
          <View style={styles.instantTextCol}>
            <Text style={styles.instantTitle}>Estimasi Tiba: {instantEtaMinutes} - {instantEtaMinutes + 15} Menit</Text>
            <Text style={styles.instantSub}>Kurir segera menuju toko begitu pesanan selesai dikemas.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.scheduledBox}>
          {/* Date Options */}
          <Text style={styles.subHeading}>Pilih Tanggal:</Text>
          <View style={styles.dateRow}>
            {DATE_OPTIONS.map((d) => {
              const isDateSelected = (value.scheduledDate || "TODAY") === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateChip, isDateSelected && styles.activeDateChip]}
                  onPress={() => onChange({ ...value, scheduledDate: d.value })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateChipText, isDateSelected && styles.activeDateChipText]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Slot Options */}
          <Text style={[styles.subHeading, { marginTop: 12 }]}>Pilih Slot Waktu Tiba:</Text>
          <View style={styles.slotList}>
            {TIME_SLOTS.map((slot) => {
              const isSlotSelected = (value.timeSlot || TIME_SLOTS[0]) === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotItem, isSlotSelected && styles.activeSlotItem]}
                  onPress={() => onChange({ ...value, timeSlot: slot })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.slotText, isSlotSelected && styles.activeSlotText]}>{slot}</Text>
                  {isSlotSelected && <Check size={14} color="#15803D" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  activeTabBtn: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#15803D",
    fontWeight: "700",
  },
  instantBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  instantTextCol: {
    flex: 1,
  },
  instantTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
  instantSub: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
  },
  scheduledBox: {
    marginTop: 14,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  activeDateChip: {
    borderColor: "#15803D",
    backgroundColor: "#DCFCE7",
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  activeDateChipText: {
    color: "#15803D",
    fontWeight: "700",
  },
  slotList: {
    gap: 6,
  },
  slotItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  activeSlotItem: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  slotText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  activeSlotText: {
    color: "#15803D",
    fontWeight: "700",
  },
});
