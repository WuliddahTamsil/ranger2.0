import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MapPin, Navigation, User, Phone, ChevronRight } from "lucide-react-native";
import { SendPartyData } from "../../types";

interface SenderReceiverCardProps {
  sender: SendPartyData;
  recipient: SendPartyData;
  onPressSender?: () => void;
  onPressRecipient?: () => void;
  editable?: boolean;
}

export const SenderReceiverCard: React.FC<SenderReceiverCardProps> = ({
  sender,
  recipient,
  onPressSender,
  onPressRecipient,
  editable = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Sender Section */}
      <TouchableOpacity
        style={styles.partyRow}
        onPress={onPressSender}
        disabled={!editable}
        activeOpacity={0.7}
      >
        <View style={styles.iconCol}>
          <View style={[styles.dotIcon, { backgroundColor: "#15803D" }]}>
            <MapPin size={14} color="#FFFFFF" />
          </View>
          <View style={styles.dashLine} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.headerRow}>
            <Text style={styles.partyLabel}>LOKASI PENGIRIM (PICKUP)</Text>
            {editable && <ChevronRight size={16} color="#94A3B8" />}
          </View>

          <Text style={styles.addressText} numberOfLines={2}>
            {sender.address || "Pilih titik penjemputan barang..."}
          </Text>

          {(sender.name || sender.phone) ? (
            <View style={styles.contactRow}>
              <User size={12} color="#64748B" />
              <Text style={styles.contactText}>
                {sender.name || "Nama Pengirim"} • {sender.phone || "-"}
              </Text>
            </View>
          ) : null}

          {sender.notes ? (
            <Text style={styles.notesText}>Catatan: {sender.notes}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Recipient Section */}
      <TouchableOpacity
        style={styles.partyRow}
        onPress={onPressRecipient}
        disabled={!editable}
        activeOpacity={0.7}
      >
        <View style={styles.iconCol}>
          <View style={[styles.dotIcon, { backgroundColor: "#DC2626" }]}>
            <Navigation size={14} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoCol}>
          <View style={styles.headerRow}>
            <Text style={[styles.partyLabel, { color: "#DC2626" }]}>LOKASI TUJUAN (PENERIMA)</Text>
            {editable && <ChevronRight size={16} color="#94A3B8" />}
          </View>

          <Text style={styles.addressText} numberOfLines={2}>
            {recipient.address || "Pilih titik alamat tujuan barang..."}
          </Text>

          {(recipient.name || recipient.phone) ? (
            <View style={styles.contactRow}>
              <Phone size={12} color="#64748B" />
              <Text style={styles.contactText}>
                {recipient.name || "Nama Penerima"} • {recipient.phone || "-"}
              </Text>
            </View>
          ) : null}

          {recipient.notes ? (
            <Text style={styles.notesText}>Catatan: {recipient.notes}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginVertical: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  partyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCol: {
    width: 28,
    alignItems: "center",
    marginRight: 12,
  },
  dotIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dashLine: {
    width: 2,
    height: 48,
    backgroundColor: "#CBD5E1",
    marginVertical: 4,
  },
  infoCol: {
    flex: 1,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: "#64748B",
  },
  notesText: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 3,
  },
});
