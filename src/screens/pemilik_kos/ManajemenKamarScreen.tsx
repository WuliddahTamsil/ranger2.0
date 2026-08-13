import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { Nav } from "../../types";
import {
  Search,
  Plus,
  MoreHorizontal,
  Wifi,
  ShowerHead,
  Laptop,
  Wind,
  Home,
  Package,
  Clock,
  Wallet,
  User,
  X,
  ArrowRight,
  Tv,
  CupSoda,
  Car,
  Pencil,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  CheckCircle,
  Building2,
} from "lucide-react-native";

interface RoomData {
  id: string;
  name: string;
  type: string;
  status: "terisi" | "kosong" | "nonaktif";
  facilities: string[];
  inclusions: string[];
  tenant?: {
    name: string;
    avatar: string;
  };
  price: string;
  image: string;
  description?: string;
  isNonaktif?: boolean;
}

export const ManajemenKamarScreen: React.FC<Nav> = ({ navigate }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("kamar");

  // State for Options Modal (Bottom Sheet when clicking 3-dots)
  const [selectedRoomForOptions, setSelectedRoomForOptions] = useState<RoomData | null>(null);

  // State for Search Bar
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // State for Add/Edit Room Modal (3 steps)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1);

  // Form states for Add/Edit Room
  const [nomorKamar, setNomorKamar] = useState("1A");
  const [tipeKamar, setTipeKamar] = useState("Tipe AC");
  const [hargaSewa, setHargaSewa] = useState("Rp 1.200.000");
  const [deskripsi, setDeskripsi] = useState("Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja.");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    "AC",
    "WiFi",
    "KM Dalam",
    "Kasur",
    "Lemari",
    "Meja",
  ]);
  const [kamarStatus, setKamarStatus] = useState<"tersedia" | "tidak_tersedia">("tersedia");

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingRoomId(null);
    setNomorKamar("");
    setTipeKamar("Tipe AC");
    setHargaSewa("Rp 1.200.000");
    setDeskripsi("Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja.");
    setSelectedFacilities(["AC", "WiFi", "KM Dalam", "Kasur", "Lemari"]);
    setKamarStatus("tersedia");
    setAddStep(1);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (room: RoomData) => {
    setModalMode("edit");
    setEditingRoomId(room.id);
    setNomorKamar(room.name);
    setTipeKamar(room.type);
    setHargaSewa(room.price);
    setDeskripsi(room.description || "Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja.");
    setSelectedFacilities([...room.facilities, ...room.inclusions]);
    setKamarStatus(room.status === "kosong" ? "tersedia" : "tidak_tersedia");
    setSelectedRoomForOptions(null);
    setAddStep(1);
    setIsAddModalOpen(true);
  };

  // Sample Room List matching Image 1
  const [rooms, setRooms] = useState<RoomData[]>([
    {
      id: "1",
      name: "1A",
      type: "Tipe AC",
      status: "terisi",
      facilities: ["AC", "WiFi", "KM Dalam"],
      inclusions: ["Kasur", "Lemari", "Meja"],
      tenant: {
        name: "Budi Santoso",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      },
      price: "Rp 1.200.000",
      image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=500&auto=format&fit=crop&q=80",
    },
    {
      id: "2",
      name: "2B",
      type: "Tipe Standar",
      status: "kosong",
      facilities: ["Kipas", "WiFi", "KM Luar"],
      inclusions: ["Kasur", "Lemari"],
      price: "Rp 950.000",
      image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500&auto=format&fit=crop&q=80",
    },
    {
      id: "3",
      name: "2C",
      type: "Tipe AC",
      status: "terisi",
      facilities: ["AC", "WiFi", "KM Dalam"],
      inclusions: ["Kasur", "Lemari", "Meja", "Meja Belajar"],
      tenant: {
        name: "Ahmad Yani",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      },
      price: "Rp 1.200.000",
      image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80",
    },
  ]);

  // Action Handlers
  const handleDuplicateRoom = (room: RoomData) => {
    const duplicatedRoom: RoomData = {
      ...room,
      id: Date.now().toString(),
      name: `${room.name} (Salinan)`,
      status: "kosong",
      tenant: undefined,
    };
    setRooms([duplicatedRoom, ...rooms]);
    setSelectedRoomForOptions(null);
  };

  const handleToggleNonaktifRoom = (room: RoomData) => {
    setRooms(
      rooms.map((r) =>
        r.id === room.id
          ? {
              ...r,
              isNonaktif: !r.isNonaktif,
              status: !r.isNonaktif ? "nonaktif" : "kosong",
            }
          : r
      )
    );
    setSelectedRoomForOptions(null);
  };

  const handleDeleteRoom = (room: RoomData) => {
    setRooms(rooms.filter((r) => r.id !== room.id));
    setSelectedRoomForOptions(null);
  };

  // Dynamic Counters
  const totalKamarCount = rooms.length;
  const terisiCount = rooms.filter((r) => r.status === "terisi").length;
  const kosongCount = rooms.filter((r) => r.status === "kosong").length;
  const terisiPercentage = totalKamarCount > 0 ? Math.round((terisiCount / totalKamarCount) * 100) : 0;
  const kosongPercentage = totalKamarCount > 0 ? Math.round((kosongCount / totalKamarCount) * 100) : 0;

  // Filtered Rooms
  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFacility = (facility: string) => {
    if (selectedFacilities.includes(facility)) {
      setSelectedFacilities(selectedFacilities.filter((f) => f !== facility));
    } else {
      setSelectedFacilities([...selectedFacilities, facility]);
    }
  };

  const handleSaveRoom = () => {
    if (modalMode === "edit" && editingRoomId) {
      setRooms(
        rooms.map((r) =>
          r.id === editingRoomId
            ? {
                ...r,
                name: nomorKamar || r.name,
                type: tipeKamar,
                price: hargaSewa,
                description: deskripsi,
                status: kamarStatus === "tersedia" ? "kosong" : "terisi",
                facilities: selectedFacilities.slice(0, 3),
                inclusions: selectedFacilities.slice(3),
              }
            : r
        )
      );
    } else {
      const newRoom: RoomData = {
        id: Date.now().toString(),
        name: nomorKamar || "1B",
        type: tipeKamar,
        status: kamarStatus === "tersedia" ? "kosong" : "terisi",
        facilities: selectedFacilities.slice(0, 3),
        inclusions: selectedFacilities.slice(3),
        price: hargaSewa,
        image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=500&auto=format&fit=crop&q=80",
        description: deskripsi,
      };
      setRooms([newRoom, ...rooms]);
    }
    setIsAddModalOpen(false);
    setAddStep(1);
  };

  const allFacilityOptions = [
    { label: "AC", icon: Laptop },
    { label: "Kipas", icon: Wind },
    { label: "WiFi", icon: Wifi },
    { label: "KM Dalam", icon: ShowerHead },
    { label: "KM Luar", icon: ShowerHead },
    { label: "Kasur", icon: Home },
    { label: "Lemari", icon: Home },
    { label: "Meja", icon: Home },
    { label: "Kursi", icon: Home },
    { label: "TV", icon: Tv },
    { label: "Dispenser", icon: CupSoda },
    { label: "Parkir", icon: Car },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Scroll Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Manajemen Kamar</Text>
            <Text style={styles.headerSubtitle}>Kelola semua kamar kos Anda</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconCircleBtn, isSearchVisible && { backgroundColor: "#E8F5EE" }]}
              onPress={() => setIsSearchVisible(!isSearchVisible)}
              activeOpacity={0.7}
            >
              <Search size={20} color={isSearchVisible ? "#0D7A53" : "#374151"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addCircleBtn}
              onPress={handleOpenAddModal}
              activeOpacity={0.8}
            >
              <Plus size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input Bar */}
        {isSearchVisible && (
          <View style={{ marginBottom: 16 }}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari nomor kamar atau tipe..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* 3 Summary Cards */}
        <View style={styles.summaryRow}>
          {/* Card 1: Total Kamar */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Kamar</Text>
            <Text style={styles.summaryVal}>{totalKamarCount}</Text>
            <Text style={styles.summarySubtext}>Semua kamar</Text>
          </View>

          {/* Card 2: Terisi */}
          <View style={styles.summaryCard}>
            <View style={styles.labelWithDot}>
              <Text style={styles.summaryLabel}>Terisi</Text>
              <View style={styles.greenDot} />
            </View>
            <Text style={styles.summaryVal}>{terisiCount}</Text>
            <Text style={styles.summarySubtext}>{terisiPercentage}%</Text>
          </View>

          {/* Card 3: Kosong */}
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: "#EA580C" }]}>Kosong</Text>
            <Text style={[styles.summaryVal, { color: "#EA580C" }]}>{kosongCount}</Text>
            <Text style={[styles.summarySubtext, { color: "#EA580C" }]}>{kosongPercentage}%</Text>
          </View>
        </View>

        {/* Active Tab Indicator Bar */}
        <View style={styles.activeTabIndicator} />

        {/* Room List Cards */}
        <View style={styles.roomList}>
          {filteredRooms.map((room) => (
            <View
              key={room.id}
              style={[styles.roomCard, (room.isNonaktif || room.status === "nonaktif") && styles.roomCardNonaktif]}
            >
              {/* Room Image with Badge */}
              <View style={styles.roomImgContainer}>
                <Image source={{ uri: room.image }} style={styles.roomImg} />
                <View
                  style={[
                    styles.statusBadge,
                    room.status === "terisi"
                      ? styles.statusBadgeGreen
                      : room.status === "nonaktif" || room.isNonaktif
                      ? styles.statusBadgeGray
                      : styles.statusBadgeOrange,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      room.status === "terisi"
                        ? styles.statusTextGreen
                        : room.status === "nonaktif" || room.isNonaktif
                        ? styles.statusTextGray
                        : styles.statusTextOrange,
                    ]}
                  >
                    {room.status === "terisi"
                      ? "Terisi"
                      : room.status === "nonaktif" || room.isNonaktif
                      ? "Nonaktif"
                      : "Kosong"}
                  </Text>
                </View>
              </View>

              {/* Room Details */}
              <View style={styles.roomDetailsCol}>
                {/* Title & Type & Options Button */}
                <View style={styles.roomHeaderRow}>
                  <View style={styles.roomTitleWrap}>
                    <Text style={styles.roomTitle}>{room.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{room.type}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => setSelectedRoomForOptions(room)}
                    activeOpacity={0.7}
                  >
                    <MoreHorizontal size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Facilities Icons Row */}
                <View style={styles.facilitiesRow}>
                  {room.facilities.map((fac, idx) => (
                    <View key={idx} style={styles.facChip}>
                      {fac.includes("AC") && <Laptop size={12} color="#6B7280" />}
                      {fac.includes("WiFi") && <Wifi size={12} color="#6B7280" />}
                      {fac.includes("KM") && <ShowerHead size={12} color="#6B7280" />}
                      {fac.includes("Kipas") && <Wind size={12} color="#6B7280" />}
                      <Text style={styles.facText}>{fac}</Text>
                    </View>
                  ))}
                </View>

                {/* Inclusions Text Row */}
                <Text style={styles.inclusionsText}>
                  🏠 {room.inclusions.join(", ")}
                </Text>

                {/* Tenant / Available & Price Footer Row */}
                <View style={styles.roomFooterRow}>
                  {room.isNonaktif || room.status === "nonaktif" ? (
                    <View style={styles.availableRow}>
                      <EyeOff size={16} color="#6B7280" />
                      <Text style={[styles.availableText, { color: "#6B7280" }]}>Disembunyikan</Text>
                    </View>
                  ) : room.status === "terisi" && room.tenant ? (
                    <View style={styles.tenantRow}>
                      <Image source={{ uri: room.tenant.avatar }} style={styles.tenantAvatar} />
                      <View>
                        <Text style={styles.tenantLabel}>Penghuni</Text>
                        <Text style={styles.tenantName}>{room.tenant.name}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.availableRow}>
                      <Building2 size={16} color="#EA580C" />
                      <Text style={styles.availableText}>Tersedia</Text>
                    </View>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.priceVal}>{room.price}</Text>
                    <Text style={styles.priceUnit}>/bln</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_home")}
          activeOpacity={0.7}
        >
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => setActiveNavTab("kamar")}
          activeOpacity={0.7}
        >
          <Building2 size={22} color="#0D7A53" />
          <Text style={[styles.navText, styles.navTextActive]}>Kamar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_penghuni")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Penghuni</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_laporan_keuangan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_profil")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Tambah Kamar Baru (3-Step Flow) */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "edit" ? `Edit Kamar ${nomorKamar}` : "Tambah Kamar Baru"}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsAddModalOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Stepper Bar (1 - 2 - 3) */}
            <View style={styles.stepperRow}>
              <View style={[styles.stepCircle, addStep >= 1 && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, addStep >= 1 && styles.stepNumActive]}>1</Text>
              </View>
              <View style={[styles.stepLine, addStep >= 2 && styles.stepLineActive]} />

              <View style={[styles.stepCircle, addStep >= 2 && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, addStep >= 2 && styles.stepNumActive]}>2</Text>
              </View>
              <View style={[styles.stepLine, addStep >= 3 && styles.stepLineActive]} />

              <View style={[styles.stepCircle, addStep >= 3 && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, addStep >= 3 && styles.stepNumActive]}>3</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* STEP 1: Informasi Dasar */}
              {addStep === 1 && (
                <View>
                  <Text style={styles.stepTitle}>Informasi Dasar</Text>

                  <Text style={styles.label}>Nomor Kamar <Text style={styles.redAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={nomorKamar}
                    onChangeText={setNomorKamar}
                    placeholder="1A"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.label}>Tipe Kamar <Text style={styles.redAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={tipeKamar}
                    onChangeText={setTipeKamar}
                    placeholder="Tipe AC"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.label}>Harga Sewa / bulan <Text style={styles.redAsterisk}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={hargaSewa}
                    onChangeText={setHargaSewa}
                    placeholder="Rp 1.200.000"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.label}>Deskripsi (Opsional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={deskripsi}
                    onChangeText={setDeskripsi}
                    placeholder="Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />

                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => setAddStep(2)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>Lanjut</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: Fasilitas Kamar & Foto */}
              {addStep === 2 && (
                <View>
                  <Text style={styles.stepTitle}>Fasilitas Kamar</Text>
                  <Text style={styles.stepSubtitle}>Pilih fasilitas yang tersedia</Text>

                  {/* Multi-select Chips */}
                  <View style={styles.facilityChipsGrid}>
                    {allFacilityOptions.map((item, idx) => {
                      const IconComp = item.icon;
                      const isSelected = selectedFacilities.includes(item.label);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.facilityChip, isSelected && styles.facilityChipSelected]}
                          onPress={() => toggleFacility(item.label)}
                          activeOpacity={0.7}
                        >
                          <IconComp size={14} color={isSelected ? "#0D7A53" : "#4B5563"} />
                          <Text style={[styles.facilityChipText, isSelected && styles.facilityChipTextSelected]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.stepTitle, { marginTop: 24 }]}>Foto Kamar</Text>
                  <Text style={styles.stepSubtitle}>Tambahkan foto kamar (Maks. 5 foto)</Text>

                  {/* Add Photo Dashed Box */}
                  <TouchableOpacity style={styles.uploadPhotoBox} activeOpacity={0.7}>
                    <Plus size={24} color="#0D7A53" />
                    <Text style={styles.uploadPhotoText}>Tambah Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnPrimary, { marginTop: 28 }]}
                    onPress={() => setAddStep(3)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>Lanjut</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Ringkasan & Status */}
              {addStep === 3 && (
                <View>
                  <Text style={styles.stepTitle}>Ringkasan</Text>
                  <Text style={styles.stepSubtitle}>Periksa kembali informasi kamar Anda</Text>

                  {/* Summary Card Box */}
                  <View style={styles.summaryPreviewBox}>
                    <View style={styles.previewHeaderRow}>
                      <View style={styles.previewImgBox}>
                        <Building2 size={24} color="#9CA3AF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.previewRoomTitle}>{nomorKamar}</Text>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{tipeKamar}</Text>
                          </View>
                        </View>
                        <Text style={styles.previewPriceText}>{hargaSewa} <Text style={{ fontSize: 11, color: "#6B7280" }}>/ bulan</Text></Text>
                      </View>
                    </View>

                    <View style={styles.previewDivider} />

                    <View style={styles.previewDetailRow}>
                      <Text style={styles.previewDetailLabel}>Fasilitas</Text>
                      <Text style={styles.previewDetailVal}>{selectedFacilities.join(", ")}</Text>
                    </View>
                    <View style={styles.previewDetailRow}>
                      <Text style={styles.previewDetailLabel}>Deskripsi</Text>
                      <Text style={styles.previewDetailVal}>{deskripsi}</Text>
                    </View>
                  </View>

                  <Text style={[styles.stepTitle, { marginTop: 24 }]}>Status Kamar</Text>

                  {/* Selectable Status 1: Tersedia */}
                  <TouchableOpacity
                    style={[styles.statusSelectCard, kamarStatus === "tersedia" && styles.statusSelectCardActive]}
                    onPress={() => setKamarStatus("tersedia")}
                    activeOpacity={0.8}
                  >
                    <CheckCircle
                      size={20}
                      color={kamarStatus === "tersedia" ? "#0D7A53" : "#D1D5DB"}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.statusSelectTitle, kamarStatus === "tersedia" && { color: "#0D7A53" }]}>
                        Tersedia
                      </Text>
                      <Text style={styles.statusSelectSub}>Kamar siap disewakan</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Selectable Status 2: Tidak Tersedia */}
                  <TouchableOpacity
                    style={[styles.statusSelectCard, kamarStatus === "tidak_tersedia" && styles.statusSelectCardActive]}
                    onPress={() => setKamarStatus("tidak_tersedia")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.radioOuter}>
                      {kamarStatus === "tidak_tersedia" && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.statusSelectTitle}>Tidak Tersedia</Text>
                      <Text style={styles.statusSelectSub}>Sembunyikan kamar sementara</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnPrimary, { marginTop: 28 }]}
                    onPress={handleSaveRoom}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>
                      {modalMode === "edit" ? "Simpan Perubahan" : "Simpan Kamar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Opsi Kamar 1A (Bottom Sheet Action Menu) */}
      <Modal visible={selectedRoomForOptions !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setSelectedRoomForOptions(null)}
        >
          <View style={styles.bottomSheetCard} onStartShouldSetResponder={() => true}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <Text style={styles.optionsTitle}>
              Opsi Kamar {selectedRoomForOptions?.name}
            </Text>
            <Text style={styles.optionsSubtitle}>
              Tipe: {selectedRoomForOptions?.type} • Status:{" "}
              {selectedRoomForOptions?.status === "terisi" ? "Terisi" : "Kosong"}
            </Text>

            {/* Options List */}
            <View style={styles.optionsList}>
              {/* 1. Edit Kamar */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) {
                    handleOpenEditModal(selectedRoomForOptions);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#F0FDF4" }]}>
                  <Pencil size={18} color="#0D7A53" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Edit Kamar</Text>
                  <Text style={styles.optionItemSub}>Ubah informasi kamar yang sudah ada</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 2. Duplikat Kamar */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) {
                    handleDuplicateRoom(selectedRoomForOptions);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#F0FDF4" }]}>
                  <Copy size={18} color="#0D7A53" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Duplikat Kamar</Text>
                  <Text style={styles.optionItemSub}>Salin data kamar untuk kamar baru</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 3. Nonaktifkan Kamar */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) {
                    handleToggleNonaktifRoom(selectedRoomForOptions);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.optionIconBg,
                    { backgroundColor: selectedRoomForOptions?.isNonaktif ? "#E0F2FE" : "#FFF7ED" },
                  ]}
                >
                  {selectedRoomForOptions?.isNonaktif ? (
                    <Eye size={18} color="#0284C7" />
                  ) : (
                    <EyeOff size={18} color="#EA580C" />
                  )}
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>
                    {selectedRoomForOptions?.isNonaktif ? "Aktifkan Kamar" : "Nonaktifkan Kamar"}
                  </Text>
                  <Text style={styles.optionItemSub}>
                    {selectedRoomForOptions?.isNonaktif
                      ? "Tampilkan kamar kembali dalam pencarian"
                      : "Sembunyikan atau tampilkan kamar dari pencarian"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 4. Hapus Kamar */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) {
                    handleDeleteRoom(selectedRoomForOptions);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#FEE2E2" }]}>
                  <Trash2 size={18} color="#EF4444" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Hapus Kamar</Text>
                  <Text style={styles.optionItemSub}>Hapus kamar secara permanen</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setSelectedRoomForOptions(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 4,
  },
  labelWithDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0D7A53",
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  summarySubtext: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  activeTabIndicator: {
    height: 3,
    backgroundColor: "#0D7A53",
    width: 80,
    borderRadius: 2,
    marginBottom: 20,
  },
  roomList: {
    gap: 16,
  },
  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 14,
    flexDirection: "row",
    gap: 14,
  },
  roomImgContainer: {
    position: "relative",
    width: 100,
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
  },
  roomImg: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeGreen: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeOrange: {
    backgroundColor: "#FFEDD5",
  },
  statusBadgeGray: {
    backgroundColor: "#F3F4F6",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusTextGreen: {
    color: "#0D7A53",
  },
  statusTextOrange: {
    color: "#EA580C",
  },
  statusTextGray: {
    color: "#6B7280",
  },
  roomCardNonaktif: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  roomDetailsCol: {
    flex: 1,
    justifyContent: "space-between",
  },
  roomHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  typeBadge: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  moreBtn: {
    padding: 4,
  },
  facilitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  facChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  facText: {
    fontSize: 11,
    color: "#4B5563",
  },
  inclusionsText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  roomFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F9FAFB",
    paddingTop: 6,
  },
  tenantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tenantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tenantLabel: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  tenantName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  availableText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
  },
  priceUnit: {
    fontSize: 10,
    color: "#6B7280",
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    elevation: 8,
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  navTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  addModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#0D7A53",
  },
  stepNum: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  stepNumActive: {
    color: "#FFFFFF",
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#0D7A53",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  redAsterisk: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: "#111827",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  btnPrimary: {
    height: 50,
    backgroundColor: "#0D7A53",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  facilityChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  facilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  facilityChipSelected: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  facilityChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  facilityChipTextSelected: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  uploadPhotoBox: {
    height: 100,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadPhotoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  summaryPreviewBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewImgBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  previewRoomTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  previewPriceText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D7A53",
    marginTop: 2,
  },
  previewDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  previewDetailRow: {
    marginBottom: 8,
  },
  previewDetailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 2,
  },
  previewDetailVal: {
    fontSize: 12,
    color: "#374151",
  },
  statusSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  statusSelectCardActive: {
    borderColor: "#0D7A53",
    backgroundColor: "#F0FDF4",
  },
  statusSelectTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  statusSelectSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0D7A53",
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  optionsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  optionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextCol: {
    flex: 1,
  },
  optionItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  optionItemSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  btnCancel: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  searchInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: "#111827",
  },
});
