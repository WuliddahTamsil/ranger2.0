import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check, PhoneCall, RefreshCw, XCircle, DollarSign } from "lucide-react-native";

export type SubstitutionOption = "DONT_SUBSTITUTE" | "SAME_CATEGORY" | "CONTACT_ME" | "AUTO_PRICE_LIMIT";

interface SubstitutionSelectorProps {
  selectedPolicy: SubstitutionOption;
  onSelectPolicy: (policy: SubstitutionOption) => void;
}

const OPTIONS: Array<{
  id: SubstitutionOption;
  title: string;
  desc: string;
  icon: any;
}> = [
  {
    id: "CONTACT_ME",
    title: "Hubungi Saya Dulu",
    desc: "Shopper/toko akan chat/telepon jika stok di rak habis.",
    icon: PhoneCall,
  },
  {
    id: "SAME_CATEGORY",
    title: "Ganti dengan Produk Sejenis",
    desc: "Otomatis diganti dengan merek lain yang setara di kategori yang sama.",
    icon: RefreshCw,
  },
  {
    id: "DONT_SUBSTITUTE",
    title: "Jangan Ganti",
    desc: "Lewati produk jika habis dan kurangi total tagihan secara otomatis.",
    icon: XCircle,
  },
  {
    id: "AUTO_PRICE_LIMIT",
    title: "Ganti Otomatis (Maks. Harga Serupa)",
    desc: "Ganti produk tanpa kenaikan harga melebihi 10%.",
    icon: DollarSign,
  },
];

export const SubstitutionSelector: React.FC<SubstitutionSelectorProps> = ({
  selectedPolicy,
  onSelectPolicy,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Jika Produk Kosong di Toko</Text>
      <Text style={styles.headerSub}>Pilih preferensi Anda saat staf/shopper menyiapkan pesanan:</Text>

      <View style={styles.optionsList}>
        {OPTIONS.map((opt) => {
          const isSelected = selectedPolicy === opt.id;
          const IconComp = opt.icon;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, isSelected && styles.selectedCard]}
              onPress={() => onSelectPolicy(opt.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrapper, isSelected && styles.selectedIconWrapper]}>
                <IconComp size={16} color={isSelected ? "#15803D" : "#6B7280"} />
              </View>

              <View style={styles.textCol}>
                <Text style={[styles.optionTitle, isSelected && styles.selectedOptionTitle]}>
                  {opt.title}
                </Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>

              <View style={[styles.radioCircle, isSelected && styles.selectedRadioCircle]}>
                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
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
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 16,
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  selectedCard: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  selectedIconWrapper: {
    backgroundColor: "#DCFCE7",
  },
  textCol: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  selectedOptionTitle: {
    color: "#15803D",
    fontWeight: "700",
  },
  optionDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedRadioCircle: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
});
