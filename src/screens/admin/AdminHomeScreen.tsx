import React, { useEffect, useState } from "react";
import { Alert, View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Nav } from "../../types";
import { ShieldCheck, Users, CheckCircle, AlertCircle, LogOut } from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { AuthAccount, ROLE_LABELS } from "../auth/authTypes";
import { loadMitraAccounts, updateAccountStatus } from "../auth/authService";

export const AdminHomeScreen: React.FC<Nav> = ({ navigate }) => {
  const [mitraAccounts, setMitraAccounts] = useState<AuthAccount[]>([]);

  const refresh = async () => setMitraAccounts(await loadMitraAccounts());
  useEffect(() => { void refresh(); }, []);

  const approve = async (account: AuthAccount) => {
    await updateAccountStatus(account.id, "verified");
    await refresh();
    Alert.alert("Mitra disetujui", `${account.name} sekarang bisa masuk sebagai ${ROLE_LABELS[account.role as keyof typeof ROLE_LABELS] || "mitra"}.`);
  };

  const reject = (account: AuthAccount) => Alert.alert(
    "Tolak pendaftaran",
    "Dokumen belum memenuhi persyaratan. Status akan dikembalikan ke pendaftar untuk diperbaiki.",
    [
      { text: "Batal", style: "cancel" },
      { text: "Tolak", style: "destructive", onPress: () => void (async () => {
      await updateAccountStatus(account.id, "rejected", "Dokumen belum memenuhi persyaratan.");
      await refresh();
      Alert.alert("Pendaftaran ditolak", "Status akun sudah diperbarui.");
      })() },
    ],
  );

  const pendingAccounts = mitraAccounts.filter((account) => account.status === "pending");
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.adminInfo}>
          <View style={styles.avatar}>
            <ShieldCheck size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.adminName}>Administrator PGE</Text>
            <Text style={styles.adminStatus}>Pengelola Komunitas Ring 1–3 🛡️</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.roleSwitchBtn} onPress={() => navigate("login")} activeOpacity={0.7}>
          <LogOut size={14} color="#DC2626" />
          <Text style={styles.roleSwitchText}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* System Summary */}
        <View style={styles.systemCard}>
          <Text style={styles.systemLabel}>Total Transaksi Komunitas (Bulan Ini)</Text>
          <Text style={styles.systemVal}>{rp(48500000)}</Text>
          <View style={styles.systemStats}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>128 Mitra</Text>
              <Text style={styles.statLbl}>UMKM & Layanan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>34 Driver</Text>
              <Text style={styles.statLbl}>Rangers Aktif</Text>
            </View>
          </View>
        </View>

        {/* Verifikasi Pendaftaran Mitra */}
        <Text style={styles.sectionTitle}>Pendaftaran Mitra Baru (Menunggu Verifikasi)</Text>

        {pendingAccounts.length === 0 ? <View style={styles.emptyCard}><CheckCircle size={22} color="#1B7A4E" /><Text style={styles.emptyText}>Belum ada pendaftaran mitra yang menunggu.</Text></View> : pendingAccounts.map((account) => <View key={account.id} style={styles.verifyCard}>
          <View style={styles.verifyHeader}>
            <Text style={styles.mitraType}>{ROLE_LABELS[account.role as keyof typeof ROLE_LABELS] || "Mitra"}</Text>
            <View style={styles.pendingBadge}><AlertCircle size={12} color="#B45309" /><Text style={[styles.pendingBadgeText, styles.pendingText]}>Pending Verifikasi</Text></View>
          </View>
          <Text style={styles.mitraName}>{account.name}</Text>
          <Text style={styles.mitraAddress}>{account.email} · {account.address}</Text>
          <Text style={styles.mitraAddress}>{Object.keys(account.documents).length} dokumen terunggah</Text>
          <View style={styles.verifyFooter}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(account)}><Text style={styles.rejectBtnText}>Tolak</Text></TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={() => void approve(account)}><CheckCircle size={14} color="#FFFFFF" /><Text style={styles.approveBtnText}>Setujui Mitra</Text></TouchableOpacity>
          </View>
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  adminInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  adminName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  adminStatus: {
    fontSize: 11,
    color: "#6B7280",
  },
  roleSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
  },
  roleSwitchText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  systemCard: {
    backgroundColor: "#7F1D1D",
    borderRadius: 20,
    padding: 20,
  },
  systemLabel: {
    fontSize: 12,
    color: "#FCA5A5",
  },
  systemVal: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  systemStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#991B1B",
  },
  statItem: {
    flex: 1,
  },
  statVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F87171",
  },
  statLbl: {
    fontSize: 11,
    color: "#FCA5A5",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#991B1B",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  verifyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 6,
  },
  verifyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mitraType: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  pendingText: {
    color: "#B45309",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  mitraName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  mitraAddress: {
    fontSize: 12,
    color: "#6B7280",
  },
  verifyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
