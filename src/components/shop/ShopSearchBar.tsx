import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Search, X, SlidersHorizontal } from "lucide-react-native";

interface ShopSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  onPressFilter?: () => void;
  showFilterBtn?: boolean;
  autoFocus?: boolean;
}

export const ShopSearchBar: React.FC<ShopSearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Cari produk, toko, atau apotek...",
  onPressFilter,
  showFilterBtn = false,
  autoFocus = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoFocus={autoFocus}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChangeText("")}
            activeOpacity={0.7}
          >
            <X size={15} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {showFilterBtn && (
        <TouchableOpacity style={styles.filterBtn} onPress={onPressFilter} activeOpacity={0.7}>
          <SlidersHorizontal size={18} color="#15803D" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
});
