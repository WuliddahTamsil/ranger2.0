import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { uploadFileToBackend } from "../../services/api";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import {
  fetchRoomsByOwner,
  addRoomToKost,
  updateRoomInKost,
  deleteRoomFromKost,
  fetchKostProperty,
  updateKostProperty,
} from "../../services/kostService";
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
  ImagePlus,
  Camera,
  SlidersHorizontal,
  ShieldCheck,
  Utensils,
  Shirt,
  Check,
  FileText,
  Zap,
  Droplets,
  Snowflake,
  Fan,
  Bed,
  DoorClosed,
  Table,
  Armchair,
  Bath,
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
    phone?: string;
    entryDate?: string;
  };
  price: string;
  image: string;
  images?: string[];
  description?: string;
  isNonaktif?: boolean;
}

interface ManajemenKamarProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const ManajemenKamarScreen: React.FC<ManajemenKamarProps> = ({ navigate, authAccount }) => {
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
  const [roomPhotos, setRoomPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingRoomId(null);
    setNomorKamar("");
    setTipeKamar("Tipe AC");
    setHargaSewa("Rp 1.200.000");
    setDeskripsi("Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja.");
    setSelectedFacilities(["AC", "WiFi", "KM Dalam", "Kasur", "Lemari"]);
    setKamarStatus("tersedia");
    setRoomPhotos([]);
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
    setSelectedFacilities(Array.isArray(room.facilities) ? [...room.facilities] : []);
    setKamarStatus(room.status === "kosong" ? "tersedia" : "tidak_tersedia");
    setRoomPhotos(room.images && room.images.length > 0 ? room.images : (room.image ? [room.image] : []));
    setSelectedRoomForOptions(null);
    setAddStep(1);
    setIsAddModalOpen(true);
  };

  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<RoomData[]>([]);

  // Property (Fasilitas Bersama & Peraturan Kos) State
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [sharedFacilities, setSharedFacilities] = useState<string[]>([
    "WiFi",
    "KM Dalam",
    "Kasur",
    "Lemari",
    "Meja",
    "Kursi",
    "Termasuk Listrik & Air",
  ]);
  const [propertyRules, setPropertyRules] = useState<string[]>([
    "Akses 24 Jam",
    "Dilarang Merokok di Kamar",
    "Tamu Lawan Jenis Maks Pukul 21.00",
  ]);
  const [propertyDescription, setPropertyDescription] = useState<string>(
    "Kos eksklusif nyaman, bersih, aman, dan berfasilitas lengkap untuk mahasiswa & pekerja."
  );
  const [customFacilityInput, setCustomFacilityInput] = useState<string>("");
  const [customRuleInput, setCustomRuleInput] = useState<string>("");
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [propertyActiveTab, setPropertyActiveTab] = useState<"fasilitas" | "peraturan" | "deskripsi">("fasilitas");

  const ownerEmail = authAccount?.email || authAccount?.id || "aisk@gmail.com";

  const loadRoomsFromBackend = async () => {
    setLoading(true);
    try {
      const data = await fetchRoomsByOwner(ownerEmail);
      setRooms(data || []);
    } catch (err) {
      console.warn("Using offline rooms:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyDetails = async () => {
    try {
      const data = await fetchKostProperty(ownerEmail);
      if (data) {
        if (Array.isArray(data.facilities) && data.facilities.length > 0) {
          setSharedFacilities(data.facilities);
        }
        if (Array.isArray(data.rules) && data.rules.length > 0) {
          setPropertyRules(data.rules);
        }
        if (data.description) {
          setPropertyDescription(data.description);
        }
      }
    } catch (err) {
      console.warn("Using local property details:", err);
    }
  };

  useEffect(() => {
    loadRoomsFromBackend();
    loadPropertyDetails();
  }, [authAccount]);

  const handleToggleSharedFacility = (facName: string) => {
    if (sharedFacilities.includes(facName)) {
      setSharedFacilities(sharedFacilities.filter((f) => f !== facName));
    } else {
      setSharedFacilities([...sharedFacilities, facName]);
    }
  };

  const handleAddCustomFacility = () => {
    const trimmed = customFacilityInput.trim();
    if (!trimmed) return;
    if (!sharedFacilities.includes(trimmed)) {
      setSharedFacilities([...sharedFacilities, trimmed]);
    }
    setCustomFacilityInput("");
  };

  const handleRemoveFacility = (facName: string) => {
    setSharedFacilities(sharedFacilities.filter((f) => f !== facName));
  };

  const handleToggleRule = (ruleText: string) => {
    if (propertyRules.includes(ruleText)) {
      setPropertyRules(propertyRules.filter((r) => r !== ruleText));
    } else {
      setPropertyRules([...propertyRules, ruleText]);
    }
  };

  const handleAddCustomRule = () => {
    const trimmed = customRuleInput.trim();
    if (!trimmed) return;
    if (!propertyRules.includes(trimmed)) {
      setPropertyRules([...propertyRules, trimmed]);
    }
    setCustomRuleInput("");
  };

  const handleRemoveRule = (ruleText: string) => {
    setPropertyRules(propertyRules.filter((r) => r !== ruleText));
  };

  const handleSavePropertyDetails = async () => {
    setIsSavingProperty(true);
    try {
      await updateKostProperty(ownerEmail, {
        facilities: sharedFacilities,
        rules: propertyRules,
        description: propertyDescription,
      });
      Alert.alert(
        "Berhasil Disimpan! 🎉",
        "Fasilitas bersama & peraturan kos berhasil diperbarui secara real-time untuk seluruh kamar!"
      );
      setIsPropertyModalOpen(false);
    } catch (e: any) {
      Alert.alert("Gagal Menyimpan", e.message || "Gagal memperbarui properti kos");
    } finally {
      setIsSavingProperty(false);
    }
  };

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

  const handleToggleNonaktifRoom = async (room: RoomData) => {
    const newStatus = !room.isNonaktif ? "nonaktif" : "kosong";
    setRooms(
      rooms.map((r) =>
        r.id === room.id
          ? {
              ...r,
              isNonaktif: !r.isNonaktif,
              status: newStatus,
            }
          : r
      )
    );
    setSelectedRoomForOptions(null);
    try {
      await updateRoomInKost(ownerEmail, room.id, { isAvailable: newStatus === "kosong" });
    } catch (e) {
      console.log("Offline update:", e);
    }
  };

  const handleDeleteRoom = async (room: RoomData) => {
    setRooms(rooms.filter((r) => r.id !== room.id));
    setSelectedRoomForOptions(null);
    try {
      await deleteRoomFromKost(ownerEmail, room.id);
    } catch (e) {
      console.log("Offline delete:", e);
    }
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

  const handlePickRoomPhotos = async () => {
    if (roomPhotos.length >= 5) {
      Alert.alert("Batas Maksimal", "Anda hanya dapat mengunggah maksimal 5 foto per kamar.");
      return;
    }

    try {
      setIsUploadingPhoto(true);

      if (Platform.OS === "web") {
        const docRes = await DocumentPicker.getDocumentAsync({
          type: ["image/*"],
          multiple: true,
        });

        if (!docRes.canceled && docRes.assets) {
          const remainingSlots = 5 - roomPhotos.length;
          const selectedAssets = docRes.assets.slice(0, remainingSlots);

          for (const asset of selectedAssets) {
            try {
              const uploadRes = await uploadFileToBackend(
                asset.uri,
                asset.name || `kamar_${Date.now()}.jpg`,
                asset.mimeType || "image/jpeg"
              );
              if (uploadRes?.success && uploadRes?.data?.url) {
                setRoomPhotos((prev) => {
                  if (prev.length < 5) return [...prev, uploadRes.data.url];
                  return prev;
                });
              } else if (asset.uri) {
                setRoomPhotos((prev) => (prev.length < 5 ? [...prev, asset.uri] : prev));
              }
            } catch (uploadErr) {
              console.warn("Upload error:", uploadErr);
              if (asset.uri) {
                setRoomPhotos((prev) => (prev.length < 5 ? [...prev, asset.uri] : prev));
              }
            }
          }
        }
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Izin akses galeri diperlukan untuk memilih foto kamar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5 - roomPhotos.length,
        quality: 0.85,
      });

      if (!result.canceled && result.assets) {
        const remainingSlots = 5 - roomPhotos.length;
        const selectedAssets = result.assets.slice(0, remainingSlots);

        for (const asset of selectedAssets) {
          try {
            const uploadRes = await uploadFileToBackend(
              asset.uri,
              asset.fileName || `kamar_${Date.now()}.jpg`,
              asset.mimeType || "image/jpeg"
            );
            if (uploadRes?.success && uploadRes?.data?.url) {
              setRoomPhotos((prev) => {
                if (prev.length < 5) return [...prev, uploadRes.data.url];
                return prev;
              });
            } else if (asset.uri) {
              setRoomPhotos((prev) => (prev.length < 5 ? [...prev, asset.uri] : prev));
            }
          } catch (uploadErr) {
            console.warn("Upload error:", uploadErr);
            if (asset.uri) {
              setRoomPhotos((prev) => (prev.length < 5 ? [...prev, asset.uri] : prev));
            }
          }
        }
      }
    } catch (err) {
      console.error("Pick photos error:", err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setRoomPhotos(roomPhotos.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveRoom = async () => {
    const numPrice = parseInt(hargaSewa.replace(/[^0-9]/g, "")) || 1200000;
    const primaryImage = roomPhotos[0] || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=500&auto=format&fit=crop&q=80";

    const cleanNum = (nomorKamar || `10${rooms.length + 1}`).replace(/^(Kamar\s*)+/gi, "").trim();

    if (modalMode === "edit" && editingRoomId) {
      try {
        await updateRoomInKost(ownerEmail, editingRoomId, {
          roomNumber: cleanNum,
          roomType: tipeKamar,
          priceMonthly: numPrice,
          isAvailable: kamarStatus === "tersedia",
          facilities: selectedFacilities,
          images: roomPhotos,
          image: primaryImage,
        });
      } catch (e) {
        console.log("Edit room error:", e);
      }
    } else {
      try {
        await addRoomToKost(ownerEmail, {
          roomNumber: cleanNum,
          roomType: tipeKamar,
          priceMonthly: numPrice,
          isAvailable: kamarStatus === "tersedia",
          facilities: selectedFacilities,
          images: roomPhotos,
          image: primaryImage,
        });
      } catch (e) {
        console.log("Add room error:", e);
      }
    }
    await loadRoomsFromBackend();
    setIsAddModalOpen(false);
    setAddStep(1);
  };

  const allFacilityOptions = [
    { label: "AC", icon: Snowflake },
    { label: "Kipas", icon: Fan },
    { label: "WiFi", icon: Wifi },
    { label: "KM Dalam", icon: ShowerHead },
    { label: "KM Luar", icon: Bath },
    { label: "Kasur", icon: Bed },
    { label: "Lemari", icon: DoorClosed },
    { label: "Meja", icon: Table },
    { label: "Kursi", icon: Armchair },
    { label: "TV", icon: Tv },
    { label: "Dispenser", icon: CupSoda },
    { label: "Parkir", icon: Car },
    { label: "Termasuk Listrik", icon: Zap },
    { label: "Termasuk Air", icon: Droplets },
  ];

  const presetSharedFacilities = [
    { label: "Dapur Bersama", icon: Utensils },
    { label: "Parkir Motor & Mobil", icon: Car },
    { label: "Ruang Jemur", icon: Shirt },
    { label: "Ruang Tamu Bersama", icon: Building2 },
    { label: "WiFi Bersama", icon: Wifi },
    { label: "Kulkas Bersama", icon: Utensils },
    { label: "Mesin Cuci", icon: Shirt },
    { label: "Dispenser Air Minum", icon: CupSoda },
    { label: "CCTV 24 Jam", icon: ShieldCheck },
    { label: "Penjaga Kos", icon: User },
    { label: "Termasuk Listrik & Air", icon: CheckCircle },
  ];

  const presetRules = [
    "Akses 24 Jam",
    "Dilarang Merokok di Kamar",
    "Tamu Lawan Jenis Dilarang Menginap",
    "Jam Malam / Gerbang Ditutup Pukul 23.00 WIB",
    "Menjaga Ketenangan & Kebersihan Bersama",
    "Dilarang Membawa Hewan Peliharaan",
    "Dilarang Membawa Minuman Keras / Narkoba",
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

        {/* Fasilitas Bersama & Peraturan Kos Quick Action Card (1 Untuk Semua Kamar) */}
        <TouchableOpacity
          style={styles.propertyConfigCard}
          onPress={() => setIsPropertyModalOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.propertyConfigLeft}>
            <View style={styles.propertyConfigIconBg}>
              <SlidersHorizontal size={20} color="#0D7A53" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <Text style={styles.propertyConfigTitle}>Fasilitas Bersama & Peraturan</Text>
                <View style={styles.propertyBadgeAll}>
                  <Text style={styles.propertyBadgeAllText}>Semua Kamar</Text>
                </View>
              </View>
              <Text style={styles.propertyConfigSub} numberOfLines={1}>
                {sharedFacilities.length} Fasilitas Bersama • {propertyRules.length} Peraturan Kos
              </Text>
            </View>
          </View>
          <View style={styles.propertyConfigArrow}>
            <ChevronRight size={18} color="#0D7A53" />
          </View>
        </TouchableOpacity>

        {/* Active Tab Indicator Bar */}
        <View style={styles.activeTabIndicator} />

        {/* Room List or Empty State */}
        {rooms.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 44, backgroundColor: "#FFFFFF", borderRadius: 16, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#E8F5EE", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
              <Home size={32} color="#0D7A53" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 }}>
              Belum Ada Kamar Terdaftar
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", paddingHorizontal: 16, lineHeight: 20 }}>
              Mulai tambahkan tipe kamar kos Anda (nomor kamar, harga sewa, fasilitas, dan foto) agar calon penyewa bisa melihat dan memesan.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0D7A53", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 }}
              onPress={handleOpenAddModal}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Tambah Kamar Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.roomList}>
            {filteredRooms.map((room) => {
              const cleanName = (room.name || "101").replace(/^(Kamar\s*)+/gi, "").trim() || "101";
              const rawFacs = Array.isArray(room.facilities) ? room.facilities : [];
              const uniqueFacs = Array.from(new Set(rawFacs.filter((f) => !f.toLowerCase().includes("listrik") && !f.toLowerCase().includes("air"))));
              const mainFacs = uniqueFacs.slice(0, 3);
              const extraCount = uniqueFacs.length - 3;

              return (
                <View
                  key={room.id}
                  style={[styles.roomCard, (room.isNonaktif || room.status === "nonaktif") && styles.roomCardNonaktif]}
                >
                  {/* Room Image with Badge */}
                  <View style={styles.roomImgContainer}>
                    <Image source={{ uri: room.image }} style={styles.roomImg} resizeMode="cover" />
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
                    {/* Header Row: Title & Type & More Options */}
                    <View style={styles.roomHeaderRow}>
                      <View style={styles.roomTitleWrap}>
                        <Text style={styles.roomTitle} numberOfLines={1}>Kamar {cleanName}</Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{room.type}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.moreBtn}
                        onPress={() => setSelectedRoomForOptions(room)}
                        activeOpacity={0.7}
                      >
                        <MoreHorizontal size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    {/* Facilities Chips Row (Clean, max 3 + counter) */}
                    <View style={styles.facilitiesRow}>
                      {mainFacs.map((fac, idx) => (
                        <View key={idx} style={styles.facChip}>
                          {fac.includes("AC") ? <Laptop size={11} color="#0D7A53" /> :
                           fac.includes("WiFi") ? <Wifi size={11} color="#0D7A53" /> :
                           fac.includes("KM") ? <ShowerHead size={11} color="#0D7A53" /> :
                           <Home size={11} color="#0D7A53" />}
                          <Text style={styles.facText}>{fac}</Text>
                        </View>
                      ))}
                      {extraCount > 0 && (
                        <View style={styles.facChipMore}>
                          <Text style={styles.facTextMore}>+{extraCount}</Text>
                        </View>
                      )}
                    </View>

                    {/* Inclusions Row (Only if owner selected Termasuk Listrik / Air) */}
                    {Array.isArray(room.facilities) && room.facilities.some((f: string) => f.toLowerCase().includes("listrik") || f.toLowerCase().includes("air")) && (
                      <View style={styles.inclusionBadgeRow}>
                        <Text style={styles.inclusionBadgeText}>
                          {room.facilities.filter((f: string) => f.toLowerCase().includes("listrik") || f.toLowerCase().includes("air")).join(" • ")}
                        </Text>
                      </View>
                    )}

                    {/* Tenant / Available & Price Footer Row */}
                    <View style={styles.roomFooterRow}>
                      {room.isNonaktif || room.status === "nonaktif" ? (
                        <View style={styles.availableRow}>
                          <EyeOff size={14} color="#6B7280" />
                          <Text style={[styles.availableText, { color: "#6B7280" }]}>Disembunyikan</Text>
                        </View>
                      ) : room.status === "terisi" && room.tenant ? (
                        <View style={styles.tenantRow}>
                          <Image source={{ uri: room.tenant.avatar }} style={styles.tenantAvatar} />
                          <View style={{ maxWidth: 75 }}>
                            <Text style={styles.tenantName} numberOfLines={1}>{room.tenant.name}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.availableRow}>
                          <Building2 size={14} color="#EA580C" />
                          <Text style={styles.availableText}>Siap Huni</Text>
                        </View>
                      )}

                      <View style={styles.priceRow}>
                        <Text style={styles.priceVal}>{room.price}</Text>
                        <Text style={styles.priceUnit}>/bln</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 4 }}>
                    <Text style={styles.stepTitle}>Foto Kamar</Text>
                    <View style={[styles.countBadge, roomPhotos.length >= 5 && { backgroundColor: "#FEE2E2" }]}>
                      <Text style={[styles.countBadgeText, roomPhotos.length >= 5 && { color: "#DC2626" }]}>
                        {roomPhotos.length}/5 Foto
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stepSubtitle}>Tambahkan foto kamar kos Anda (Maksimal 5 foto)</Text>

                  {/* Uploaded Photos Grid */}
                  {roomPhotos.length > 0 && (
                    <View style={styles.photoGridContainer}>
                      {roomPhotos.map((photoUri, index) => (
                        <View key={index} style={styles.photoThumbWrapper}>
                          <Image source={{ uri: photoUri }} style={styles.photoThumbImg} />
                          {index === 0 && (
                            <View style={styles.photoMainBadge}>
                              <Text style={styles.photoMainBadgeText}>Utama</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.photoDeleteBtn}
                            onPress={() => handleRemovePhoto(index)}
                            activeOpacity={0.8}
                          >
                            <X size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add Photo Dashed Box */}
                  {roomPhotos.length < 5 ? (
                    <TouchableOpacity
                      style={[styles.uploadPhotoBox, isUploadingPhoto && { opacity: 0.6 }]}
                      onPress={handlePickRoomPhotos}
                      disabled={isUploadingPhoto}
                      activeOpacity={0.7}
                    >
                      {isUploadingPhoto ? (
                        <View style={{ alignItems: "center", gap: 6, paddingVertical: 6 }}>
                          <ActivityIndicator size="small" color="#0D7A53" />
                          <Text style={styles.uploadPhotoText}>Mengunggah foto ke Cloudinary...</Text>
                        </View>
                      ) : (
                        <View style={{ alignItems: "center", gap: 4, paddingVertical: 4 }}>
                          <Plus size={24} color="#0D7A53" />
                          <Text style={styles.uploadPhotoText}>Tambah Foto ({5 - roomPhotos.length} tersisa)</Text>
                          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Format JPG, PNG (Maks 10MB)</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.maxPhotoReachedBanner}>
                      <CheckCircle size={16} color="#0D7A53" />
                      <Text style={styles.maxPhotoReachedText}>Maksimal 5 foto telah dipilih</Text>
                    </View>
                  )}

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
                        {roomPhotos.length > 0 ? (
                          <Image source={{ uri: roomPhotos[0] }} style={{ width: "100%", height: "100%", borderRadius: 12 }} />
                        ) : (
                          <Building2 size={24} color="#9CA3AF" />
                        )}
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
                      <Text style={styles.previewDetailVal}>{selectedFacilities.join(", ") || "-"}</Text>
                    </View>
                    <View style={styles.previewDetailRow}>
                      <Text style={styles.previewDetailLabel}>Foto Kamar</Text>
                      <Text style={styles.previewDetailVal}>{roomPhotos.length} foto terpilih</Text>
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

      {/* Property Configuration Modal (Fasilitas Bersama & Peraturan Kos - 1 Untuk Seluruh Kos) */}
      <Modal visible={isPropertyModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.propertyModalSheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <Text style={styles.sheetTitle}>Pengaturan Properti Kos</Text>
                  <View style={styles.propertyBadgeAll}>
                    <Text style={styles.propertyBadgeAllText}>Semua Kamar</Text>
                  </View>
                </View>
                <Text style={styles.sheetSub}>
                  Atur fasilitas bersama dan peraturan kos yang berlaku untuk seluruh kamar.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPropertyModalOpen(false)}
                style={styles.sheetCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Segmented Tab Bar */}
            <View style={styles.propSegmentWrap}>
              <TouchableOpacity
                style={[styles.propSegmentBtn, propertyActiveTab === "fasilitas" && styles.propSegmentBtnActive]}
                onPress={() => setPropertyActiveTab("fasilitas")}
                activeOpacity={0.8}
              >
                <SlidersHorizontal size={13} color={propertyActiveTab === "fasilitas" ? "#FFFFFF" : "#0D7A53"} />
                <Text
                  style={[styles.propSegmentText, propertyActiveTab === "fasilitas" && styles.propSegmentTextActive]}
                  numberOfLines={1}
                >
                  Fasilitas
                </Text>
                <View
                  style={[
                    styles.tabCountPill,
                    propertyActiveTab === "fasilitas" ? styles.tabCountPillActive : styles.tabCountPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountPillText,
                      propertyActiveTab === "fasilitas" && styles.tabCountPillTextActive,
                    ]}
                  >
                    {sharedFacilities.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.propSegmentBtn, propertyActiveTab === "peraturan" && styles.propSegmentBtnActive]}
                onPress={() => setPropertyActiveTab("peraturan")}
                activeOpacity={0.8}
              >
                <ShieldCheck size={13} color={propertyActiveTab === "peraturan" ? "#FFFFFF" : "#0D7A53"} />
                <Text
                  style={[styles.propSegmentText, propertyActiveTab === "peraturan" && styles.propSegmentTextActive]}
                  numberOfLines={1}
                >
                  Peraturan
                </Text>
                <View
                  style={[
                    styles.tabCountPill,
                    propertyActiveTab === "peraturan" ? styles.tabCountPillActive : styles.tabCountPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountPillText,
                      propertyActiveTab === "peraturan" && styles.tabCountPillTextActive,
                    ]}
                  >
                    {propertyRules.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.propSegmentBtn, propertyActiveTab === "deskripsi" && styles.propSegmentBtnActive]}
                onPress={() => setPropertyActiveTab("deskripsi")}
                activeOpacity={0.8}
              >
                <FileText size={13} color={propertyActiveTab === "deskripsi" ? "#FFFFFF" : "#0D7A53"} />
                <Text
                  style={[styles.propSegmentText, propertyActiveTab === "deskripsi" && styles.propSegmentTextActive]}
                  numberOfLines={1}
                >
                  Deskripsi
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
              {propertyActiveTab === "fasilitas" && (
                <View style={{ gap: 14 }}>
                  <Text style={styles.propSectionHint}>
                    Pilih fasilitas umum yang dapat digunakan bersama oleh semua penghuni kos:
                  </Text>

                  {/* Preset Facilities Grid */}
                  <View style={styles.propChipGrid}>
                    {presetSharedFacilities.map((fac, idx) => {
                      const isSelected = sharedFacilities.includes(fac.label);
                      const IconComp = fac.icon;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.propChip, isSelected && styles.propChipActive]}
                          onPress={() => handleToggleSharedFacility(fac.label)}
                          activeOpacity={0.8}
                        >
                          <IconComp size={16} color={isSelected ? "#0D7A53" : "#6B7280"} />
                          <Text style={[styles.propChipText, isSelected && styles.propChipTextActive]}>
                            {fac.label}
                          </Text>
                          {isSelected && <Check size={14} color="#0D7A53" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Facility Input */}
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customInputBox}
                      value={customFacilityInput}
                      onChangeText={setCustomFacilityInput}
                      placeholder="Tambah fasilitas bersama lainnya..."
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={styles.customAddBtn}
                      onPress={handleAddCustomFacility}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.customAddBtnText}>Tambah</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active Facilities Tag Cloud with delete */}
                  <View style={styles.activeTagCloud}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 }}>
                      Fasilitas Bersama Aktif ({sharedFacilities.length}):
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {sharedFacilities.map((fac, idx) => (
                        <View key={idx} style={styles.activeTagItem}>
                          <Text style={styles.activeTagItemText}>{fac}</Text>
                          <TouchableOpacity onPress={() => handleRemoveFacility(fac)} activeOpacity={0.7}>
                            <X size={13} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {propertyActiveTab === "peraturan" && (
                <View style={{ gap: 14 }}>
                  <Text style={styles.propSectionHint}>
                    Tetapkan peraturan kos yang wajib ditaati oleh semua penghuni:
                  </Text>

                  {/* Quick Preset Rules */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>Pilihan Cepat:</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {presetRules.map((rule, idx) => {
                        const isSelected = propertyRules.includes(rule);
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.rulePresetChip, isSelected && styles.rulePresetChipActive]}
                            onPress={() => handleToggleRule(rule)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.rulePresetChipText, isSelected && styles.rulePresetChipTextActive]}>
                              {isSelected ? "✓ " : "+ "}
                              {rule}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Custom Rule Input */}
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customInputBox}
                      value={customRuleInput}
                      onChangeText={setCustomRuleInput}
                      placeholder="Tulis peraturan khusus lainnya..."
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={styles.customAddBtn}
                      onPress={handleAddCustomRule}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.customAddBtnText}>Tambah</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active Rules List */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>
                      Daftar Peraturan Kos Aktif ({propertyRules.length}):
                    </Text>
                    {propertyRules.length === 0 ? (
                      <Text style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
                        Belum ada peraturan yang ditambahkan.
                      </Text>
                    ) : (
                      propertyRules.map((rule, idx) => (
                        <View key={idx} style={styles.activeRuleCard}>
                          <Text style={styles.activeRuleIdx}>{idx + 1}.</Text>
                          <Text style={styles.activeRuleText}>{rule}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveRule(rule)}
                            style={styles.activeRuleDeleteBtn}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={15} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {propertyActiveTab === "deskripsi" && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.propSectionHint}>
                    Deskripsi keseluruhan kos yang akan tampil di halaman detail customer:
                  </Text>
                  <TextInput
                    style={styles.descInputBox}
                    value={propertyDescription}
                    onChangeText={setPropertyDescription}
                    placeholder="Tulis deskripsi keunggulan, kenyamanan, dan lokasi kos Anda..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </ScrollView>

            {/* Bottom Sticky Action Button */}
            <View style={styles.propModalFooter}>
              <TouchableOpacity
                style={styles.btnSaveProperty}
                onPress={handleSavePropertyDetails}
                disabled={isSavingProperty}
                activeOpacity={0.85}
              >
                {isSavingProperty ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={styles.btnSavePropertyText}>Simpan ke Seluruh Kos</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingVertical: 2,
  },
  roomHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  roomTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    flexShrink: 1,
  },
  typeBadge: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "center",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  moreBtn: {
    padding: 3,
  },
  facilitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginVertical: 4,
  },
  facChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  facText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
  },
  facChipMore: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  facTextMore: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
  },
  inclusionBadgeRow: {
    marginTop: 1,
    marginBottom: 4,
  },
  inclusionBadgeText: {
    fontSize: 10,
    color: "#0D7A53",
    fontWeight: "600",
  },
  roomFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 6,
    marginTop: 2,
  },
  tenantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tenantAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  tenantLabel: {
    fontSize: 8,
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
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
  },
  priceUnit: {
    fontSize: 9.5,
    fontWeight: "600",
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
  countBadge: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  photoGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  photoThumbWrapper: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  photoThumbImg: {
    width: "100%",
    height: "100%",
  },
  photoMainBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoMainBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  photoDeleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  maxPhotoReachedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  maxPhotoReachedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  // Property Configuration Quick Action Card
  propertyConfigCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  propertyConfigLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  propertyConfigIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  propertyConfigTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
  },
  propertyBadgeAll: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  propertyBadgeAllText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  propertyConfigSub: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "500",
  },
  propertyConfigArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  // Property Configuration Modal Bottom Sheet
  propertyModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    width: "100%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  sheetSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  propSegmentWrap: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    marginHorizontal: 20,
    marginVertical: 14,
    padding: 4,
    gap: 4,
  },
  propSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 11,
  },
  propSegmentBtnActive: {
    backgroundColor: "#0D7A53",
    shadowColor: "#0D7A53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  propSegmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  propSegmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  tabCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
  tabCountPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  tabCountPillInactive: {
    backgroundColor: "#E5E7EB",
  },
  tabCountPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4B5563",
  },
  tabCountPillTextActive: {
    color: "#FFFFFF",
  },
  propSectionHint: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontWeight: "500",
  },
  propChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  propChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  propChipActive: {
    backgroundColor: "#E8F5EE",
    borderColor: "#0D7A53",
  },
  propChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  propChipTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  customInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  customInputBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: "#111827",
  },
  customAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
  },
  customAddBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activeTagCloud: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 14,
    padding: 12,
  },
  activeTagItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeTagItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  rulePresetChip: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rulePresetChipActive: {
    backgroundColor: "#E8F5EE",
    borderColor: "#0D7A53",
  },
  rulePresetChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  rulePresetChipTextActive: {
    color: "#0D7A53",
    fontWeight: "700",
  },
  activeRuleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  activeRuleIdx: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },
  activeRuleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    lineHeight: 18,
  },
  activeRuleDeleteBtn: {
    padding: 4,
  },
  descInputBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    color: "#111827",
    minHeight: 120,
    lineHeight: 20,
  },
  propModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  btnSaveProperty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D7A53",
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  btnSavePropertyText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
});
