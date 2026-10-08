import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
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
  Home,
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
  Hotel,
  Ticket,
  Clock,
  Sparkles,
  Users,
  Compass,
  MapPin,
  Camera,
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
  pricePerNight?: number;
  image: string;
  images?: string[];
  description?: string;
  isNonaktif?: boolean;
  isAvailable?: boolean;
  categoryType?: "kost" | "hotel" | "wisata";
  roomName?: string;
  bedType?: string;
  capacity?: number;
  breakfastIncluded?: boolean;
  ticketName?: string;
  ticketType?: string;
}

interface ManajemenKamarProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const ManajemenKamarScreen: React.FC<ManajemenKamarProps> = ({ navigate, authAccount }) => {
  const [activeNavTab, setActiveNavTab] = useState<"beranda" | "kamar" | "penghuni" | "keuangan" | "profil">("kamar");

  // Category Detection: "kost" | "hotel" | "wisata"
  const rawRoleCat =
    authAccount?.roleData?.businessCategory ||
    (authAccount?.roleData?.propertyType?.toLowerCase().includes("wisata")
      ? "wisata"
      : authAccount?.roleData?.propertyType?.toLowerCase().includes("hotel") ||
        authAccount?.roleData?.propertyType?.toLowerCase().includes("villa")
      ? "hotel"
      : "kost");

  const [categoryType, setCategoryType] = useState<"kost" | "hotel" | "wisata">(
    (rawRoleCat as any) || "kost"
  );
  const [propertyName, setPropertyName] = useState<string>("Properti Mitra");

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

  // Form states for Kost / Hotel / Wisata
  // Kost
  const [nomorKamar, setNomorKamar] = useState("1A");
  const [tipeKamar, setTipeKamar] = useState("Tipe AC");

  // Hotel & Villa
  const [namaTipeKamar, setNamaTipeKamar] = useState("Deluxe Villa Room");
  const [tipeKasur, setTipeKasur] = useState("1 King Bed");
  const [kapasitasTamu, setKapasitasTamu] = useState("2");
  const [termasukSarapan, setTermasukSarapan] = useState(true);

  // Wisata & Tiket
  const [namaTiket, setNamaTiket] = useState("Tiket Masuk Reguler");
  const [kategoriTiket, setKategoriTiket] = useState<"reguler" | "vip" | "terusan" | "anak" | "rombongan">("reguler");

  // Shared Form Fields
  const [hargaSewa, setHargaSewa] = useState("Rp 1.200.000");
  const [deskripsi, setDeskripsi] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [kamarStatus, setKamarStatus] = useState<"tersedia" | "tidak_tersedia">("tersedia");
  const [roomPhotos, setRoomPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingRoomId(null);
    setAddStep(1);
    setRoomPhotos([]);
    setKamarStatus("tersedia");

    if (categoryType === "hotel") {
      setNamaTipeKamar(`Deluxe Room ${rooms.length + 1}`);
      setTipeKasur("1 King Bed");
      setKapasitasTamu("2");
      setTermasukSarapan(true);
      setHargaSewa("Rp 450.000");
      setDeskripsi("Kamar hotel/villa berfasilitas premium, nyaman dan berstandar bintang.");
      setSelectedFacilities(["AC", "WiFi", "Smart TV", "Bathtub", "Sarapan Gratis", "Water Heater"]);
    } else if (categoryType === "wisata") {
      setNamaTiket(`Tiket Masuk Kategori ${rooms.length + 1}`);
      setKategoriTiket("reguler");
      setHargaSewa("Rp 25.000");
      setDeskripsi("Akses seluruh wahana air, spot foto selfie, dan area istirahat gazebo.");
      setSelectedFacilities(["Spot Foto", "Gazebo", "Kolam Renang", "Toilet & Bilas"]);
    } else {
      setNomorKamar(`10${rooms.length + 1}`);
      setTipeKamar("Tipe AC");
      setHargaSewa("Rp 1.200.000");
      setDeskripsi("Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja.");
      setSelectedFacilities(["AC", "WiFi", "KM Dalam", "Kasur", "Lemari"]);
    }

    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (room: RoomData) => {
    setModalMode("edit");
    setEditingRoomId(room.id);
    setHargaSewa(room.price);
    setDeskripsi(room.description || "");
    setSelectedFacilities(Array.isArray(room.facilities) ? [...room.facilities] : []);
    setKamarStatus(room.status === "kosong" || room.isAvailable ? "tersedia" : "tidak_tersedia");
    setRoomPhotos(room.images && room.images.length > 0 ? room.images : room.image ? [room.image] : []);

    if (categoryType === "hotel") {
      setNamaTipeKamar(room.roomName || room.name || "Deluxe Room");
      setTipeKasur(room.bedType || "1 King Bed");
      setKapasitasTamu(String(room.capacity || 2));
      setTermasukSarapan(room.breakfastIncluded !== false);
    } else if (categoryType === "wisata") {
      setNamaTiket(room.ticketName || room.name || "Tiket Reguler");
      setKategoriTiket((room.ticketType as any) || "reguler");
    } else {
      setNomorKamar((room.name || "101").replace(/^(Kamar\s*)+/gi, "").trim());
      setTipeKamar(room.type || "Tipe AC");
    }

    setSelectedRoomForOptions(null);
    setAddStep(1);
    setIsAddModalOpen(true);
  };

  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<RoomData[]>([]);

  // Property (Fasilitas Bersama & Peraturan Kos/Hotel/Wisata) State
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [sharedFacilities, setSharedFacilities] = useState<string[]>([]);
  const [propertyRules, setPropertyRules] = useState<string[]>([]);
  const [propertyDescription, setPropertyDescription] = useState<string>("");
  const [customFacilityInput, setCustomFacilityInput] = useState<string>("");
  const [customRuleInput, setCustomRuleInput] = useState<string>("");
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [propertyActiveTab, setPropertyActiveTab] = useState<"fasilitas" | "peraturan" | "deskripsi">("fasilitas");

  const ownerEmail = authAccount?.email || authAccount?.id || "";

  const loadRoomsFromBackend = async () => {
    if (!ownerEmail) {
      setRooms([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRoomsByOwner(ownerEmail);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Gagal memuat kamar:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyDetails = async () => {
    try {
      const data = await fetchKostProperty(ownerEmail);
      if (data) {
        if (data.name) setPropertyName(data.name);
        if (data.categoryType) setCategoryType(data.categoryType);
        if (Array.isArray(data.facilities) && data.facilities.length > 0) {
          setSharedFacilities(data.facilities);
        } else {
          // Default fallbacks by category
          if (data.categoryType === "hotel") {
            setSharedFacilities(["Kolam Renang Utama", "Restoran & Kafe", "Resepsionis 24 Jam", "WiFi Publik", "Parkir Mobil Luas", "CCTV 24 Jam"]);
          } else if (data.categoryType === "wisata") {
            setSharedFacilities(["Area Parkir Luas", "Musholla", "Toilet & Kamar Bilas", "Gazebo Istirahat", "Spot Foto Instagramable", "Foodcourt"]);
          } else {
            setSharedFacilities(["WiFi", "KM Dalam", "Kasur", "Lemari", "Dapur Bersama", "Termasuk Listrik & Air"]);
          }
        }

        if (Array.isArray(data.rules) && data.rules.length > 0) {
          let cleanedRules = data.rules;
          if (data.categoryType === "wisata") {
            cleanedRules = data.rules.filter(
              (r: string) =>
                !r.toLowerCase().includes("kamar") &&
                !r.toLowerCase().includes("lawan jenis") &&
                !r.toLowerCase().includes("akses 24 jam") &&
                !r.toLowerCase().includes("jam malam") &&
                !r.toLowerCase().includes("check-in") &&
                !r.toLowerCase().includes("check-out")
            );
          } else if (data.categoryType === "hotel") {
            cleanedRules = data.rules.filter(
              (r: string) =>
                !r.toLowerCase().includes("lawan jenis") &&
                !r.toLowerCase().includes("jam malam") &&
                !r.toLowerCase().includes("tiket") &&
                !r.toLowerCase().includes("wahana")
            );
          } else {
            cleanedRules = data.rules.filter(
              (r: string) =>
                !r.toLowerCase().includes("tiket") &&
                !r.toLowerCase().includes("wahana") &&
                !r.toLowerCase().includes("kunjungan")
            );
          }

          if (cleanedRules.length > 0) {
            setPropertyRules(cleanedRules);
          } else {
            if (data.categoryType === "hotel") {
              setPropertyRules(["Check-in Mulai Pukul 14.00 WIB", "Check-out Maksimal Pukul 12.00 WIB", "Dilarang Merokok di Dalam Kamar", "Bebas Hewan Peliharaan"]);
            } else if (data.categoryType === "wisata") {
              setPropertyRules(["Jam Buka: 08.00 - 17.00 WIB", "Tiket Berlaku untuk 1 Orang / Kunjungan", "Anak di Bawah 2 Tahun Gratis", "Dilarang Membuang Sampah Sembarangan"]);
            } else {
              setPropertyRules(["Akses 24 Jam", "Dilarang Merokok di Kamar", "Tamu Lawan Jenis Maks Pukul 21.00"]);
            }
          }
        } else {
          if (data.categoryType === "hotel") {
            setPropertyRules(["Check-in Mulai Pukul 14.00 WIB", "Check-out Maksimal Pukul 12.00 WIB", "Dilarang Merokok di Dalam Kamar", "Bebas Hewan Peliharaan"]);
          } else if (data.categoryType === "wisata") {
            setPropertyRules(["Jam Buka: 08.00 - 17.00 WIB", "Tiket Berlaku untuk 1 Orang / Kunjungan", "Anak di Bawah 2 Tahun Gratis", "Dilarang Membuang Sampah Sembarangan"]);
          } else {
            setPropertyRules(["Akses 24 Jam", "Dilarang Merokok di Kamar", "Tamu Lawan Jenis Maks Pukul 21.00"]);
          }
        }

        if (data.description) {
          setPropertyDescription(data.description);
        } else {
          if (data.categoryType === "hotel") {
            setPropertyDescription("Resort & hotel berfasilitas bintang, nyaman, asri, dengan pemandangan alam memukau.");
          } else if (data.categoryType === "wisata") {
            setPropertyDescription("Destinasi wisata favorit keluarga dengan beragam wahana air, rekreasi seru, dan spot foto terbaik.");
          } else {
            setPropertyDescription("Kos eksklusif nyaman, bersih, aman, dan berfasilitas lengkap untuk mahasiswa & pekerja.");
          }
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
        categoryType: categoryType,
      });
      Alert.alert(
        "Berhasil Disimpan! 🎉",
        `Pengaturan fasilitas & tata tertib ${
          categoryType === "hotel" ? "hotel" : categoryType === "wisata" ? "wisata" : "kos"
        } berhasil diperbarui!`
      );
      setIsPropertyModalOpen(false);
    } catch (e: any) {
      Alert.alert("Gagal Menyimpan", e.message || "Gagal memperbarui properti");
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
  const totalItemCount = rooms.length;
  const activeCount = rooms.filter((r) => r.status === "kosong" || r.isAvailable).length;
  const occupiedCount = rooms.filter((r) => r.status === "terisi").length;

  // Filtered Rooms
  const filteredRooms = rooms.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.type && r.type.toLowerCase().includes(q)) ||
      (r.roomName && r.roomName.toLowerCase().includes(q)) ||
      (r.ticketName && r.ticketName.toLowerCase().includes(q))
    );
  });

  const toggleFacility = (facility: string) => {
    if (selectedFacilities.includes(facility)) {
      setSelectedFacilities(selectedFacilities.filter((f) => f !== facility));
    } else {
      setSelectedFacilities([...selectedFacilities, facility]);
    }
  };

  const handlePickRoomPhotos = async () => {
    if (roomPhotos.length >= 5) {
      Alert.alert("Batas Maksimal", "Anda hanya dapat mengunggah maksimal 5 foto.");
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
                asset.name || `item_${Date.now()}.jpg`,
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
        Alert.alert("Izin Ditolak", "Izin akses galeri diperlukan untuk memilih foto.");
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
              asset.fileName || `item_${Date.now()}.jpg`,
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
    setIsSavingRoom(true);
    const numPrice =
      parseInt(hargaSewa.replace(/[^0-9]/g, "")) ||
      (categoryType === "wisata" ? 25000 : categoryType === "hotel" ? 450000 : 1200000);
    const primaryImage =
      roomPhotos[0] ||
      (categoryType === "wisata"
        ? "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=500&auto=format&fit=crop&q=80"
        : categoryType === "hotel"
        ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=500&auto=format&fit=crop&q=80");

    let payload: any = {};

    if (categoryType === "hotel") {
      payload = {
        roomName: namaTipeKamar || `Deluxe Room ${rooms.length + 1}`,
        bedType: tipeKasur,
        capacity: parseInt(kapasitasTamu) || 2,
        pricePerNight: numPrice,
        priceMonthly: numPrice,
        isAvailable: kamarStatus === "tersedia",
        facilities: selectedFacilities,
        images: roomPhotos,
        image: primaryImage,
        breakfastIncluded: termasukSarapan,
      };
    } else if (categoryType === "wisata") {
      payload = {
        ticketName: namaTiket || `Tiket Masuk ${rooms.length + 1}`,
        ticketType: kategoriTiket,
        price: numPrice,
        priceMonthly: numPrice,
        pricePerNight: numPrice,
        isAvailable: kamarStatus === "tersedia",
        facilities: selectedFacilities,
        includedFacilities: selectedFacilities,
        images: roomPhotos,
        image: primaryImage,
        description: deskripsi || "Akses wahana wisata dan spot foto.",
      };
    } else {
      const cleanNum = (nomorKamar || `10${rooms.length + 1}`).replace(/^(Kamar\s*)+/gi, "").trim();
      payload = {
        roomNumber: cleanNum,
        roomType: tipeKamar,
        priceMonthly: numPrice,
        isAvailable: kamarStatus === "tersedia",
        facilities: selectedFacilities,
        images: roomPhotos,
        image: primaryImage,
      };
    }

    try {
      if (modalMode === "edit" && editingRoomId) {
        await updateRoomInKost(ownerEmail, editingRoomId, payload);
      } else {
        await addRoomToKost(ownerEmail, payload);
      }
      await loadRoomsFromBackend();
      setIsAddModalOpen(false);
      setAddStep(1);
    } catch (e: any) {
      console.error("Save item error:", e);
      Alert.alert(
        `Gagal Menyimpan ${categoryType === "hotel" ? "Kamar" : categoryType === "wisata" ? "Tiket" : "Kamar"}`,
        e?.message || "Terjadi kesalahan saat menyimpan data."
      );
    } finally {
      setIsSavingRoom(false);
    }
  };

  // Facility Options Presets
  const kostFacilityOptions = [
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

  const hotelFacilityOptions = [
    { label: "AC Dingin", icon: Snowflake },
    { label: "WiFi Cepat", icon: Wifi },
    { label: "Smart TV", icon: Tv },
    { label: "Bathtub Mewah", icon: Bath },
    { label: "Water Heater", icon: Droplets },
    { label: "Balkon Privat", icon: Building2 },
    { label: "Sarapan Gratis", icon: Utensils },
    { label: "Kulkas Mini", icon: CupSoda },
    { label: "King Bed", icon: Bed },
    { label: "Sofa Santai", icon: Armchair },
    { label: "Room Service", icon: User },
    { label: "Area Parkir", icon: Car },
  ];

  const wisataFacilityOptions = [
    { label: "Spot Foto", icon: Camera },
    { label: "Gazebo", icon: Home },
    { label: "Kolam Renang", icon: Droplets },
    { label: "Wahana Air", icon: Compass },
    { label: "Perahu Angsa", icon: Compass },
    { label: "Flying Fox", icon: Sparkles },
    { label: "Toilet & Bilas", icon: ShowerHead },
    { label: "Loker Barang", icon: DoorClosed },
    { label: "Welcome Drink", icon: CupSoda },
    { label: "Parkir Luas", icon: Car },
    { label: "Musholla", icon: Building2 },
  ];

  const currentFacilityOptions =
    categoryType === "hotel"
      ? hotelFacilityOptions
      : categoryType === "wisata"
      ? wisataFacilityOptions
      : kostFacilityOptions;

  // Preset Shared Facilities & Rules
  const presetSharedFacilities =
    categoryType === "hotel"
      ? [
          { label: "Kolam Renang Utama", icon: Droplets },
          { label: "Restoran & Kafe", icon: Utensils },
          { label: "Resepsionis 24 Jam", icon: User },
          { label: "Spa & Onsen", icon: Sparkles },
          { label: "Parkir Mobil & Bus Luas", icon: Car },
          { label: "CCTV & Keamanan 24 Jam", icon: ShieldCheck },
          { label: "Ruang Rapat / Aula", icon: Building2 },
          { label: "Taman Asri & Gazebo", icon: Home },
        ]
      : categoryType === "wisata"
      ? [
          { label: "Area Parkir Luas", icon: Car },
          { label: "Musholla Bersih", icon: Building2 },
          { label: "Toilet & Kamar Bilas", icon: ShowerHead },
          { label: "Gazebo & Saung Santai", icon: Home },
          { label: "Foodcourt & Resto", icon: Utensils },
          { label: "Spot Foto Instagramable", icon: Camera },
          { label: "Penyewaan Pelampung", icon: Droplets },
          { label: "Pos Medis & Keamanan", icon: ShieldCheck },
        ]
      : [
          { label: "Dapur Bersama", icon: Utensils },
          { label: "Parkir Motor & Mobil", icon: Car },
          { label: "Ruang Jemur", icon: Shirt },
          { label: "Ruang Tamu Bersama", icon: Building2 },
          { label: "WiFi Bersama", icon: Wifi },
          { label: "Kulkas Bersama", icon: Utensils },
          { label: "Mesin Cuci", icon: Shirt },
          { label: "CCTV 24 Jam", icon: ShieldCheck },
          { label: "Termasuk Listrik & Air", icon: CheckCircle },
        ];

  const presetRules =
    categoryType === "hotel"
      ? [
          "Check-in Mulai Pukul 14.00 WIB",
          "Check-out Maksimal Pukul 12.00 WIB",
          "Dilarang Merokok di Dalam Kamar",
          "Bebas Hewan Peliharaan",
          "Dilarang Membawa Narkoba / Minuman Keras",
          "Menjaga Ketenangan Tamu Sekitar",
        ]
      : categoryType === "wisata"
      ? [
          "Jam Buka: 08.00 - 17.00 WIB",
          "Tiket Berlaku untuk 1 Orang / Kunjungan",
          "Anak di Bawah 2 Tahun Gratis",
          "Dilarang Membuang Sampah Sembarangan",
          "Harap Mengawasi Anak Saat di Dekat Air / Wahana",
          "Dilarang Membawa Senjata Tajam / Miras",
        ]
      : [
          "Akses 24 Jam",
          "Dilarang Merokok di Kamar",
          "Tamu Lawan Jenis Dilarang Menginap",
          "Jam Malam Pukul 23.00 WIB",
          "Menjaga Ketenangan & Kebersihan",
          "Dilarang Membawa Hewan Peliharaan",
        ];

  // Theme styling based on category
  const themeColor = categoryType === "hotel" ? "#0284C7" : categoryType === "wisata" ? "#D97706" : "#0D7A53";
  const themeBgLight = categoryType === "hotel" ? "#F0F9FF" : categoryType === "wisata" ? "#FEF3C7" : "#E8F5EE";
  const themeBorderLight = categoryType === "hotel" ? "#BAE6FD" : categoryType === "wisata" ? "#FDE68A" : "#BBF7D0";

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Scroll Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Text style={styles.headerTitle}>
                {categoryType === "hotel"
                  ? "Manajemen Kamar & Villa"
                  : categoryType === "wisata"
                  ? "Manajemen Tiket & Kuota"
                  : "Manajemen Kamar Kos"}
              </Text>
              <View style={[styles.categoryPillBadge, { backgroundColor: themeBgLight, borderColor: themeBorderLight }]}>
                {categoryType === "hotel" ? (
                  <Hotel size={12} color={themeColor} />
                ) : categoryType === "wisata" ? (
                  <Ticket size={12} color={themeColor} />
                ) : (
                  <Building2 size={12} color={themeColor} />
                )}
                <Text style={[styles.categoryPillText, { color: themeColor }]}>
                  {categoryType === "hotel" ? "Hotel & Villa" : categoryType === "wisata" ? "Wisata" : "Kost"}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {categoryType === "hotel"
                ? `Kelola tipe kamar hotel & villa untuk ${propertyName}`
                : categoryType === "wisata"
                ? `Kelola kategori tiket & wahana untuk ${propertyName}`
                : `Kelola kamar kos dan penyewa untuk ${propertyName}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconCircleBtn, isSearchVisible && { backgroundColor: themeBgLight }]}
              onPress={() => setIsSearchVisible(!isSearchVisible)}
              activeOpacity={0.7}
            >
              <Search size={20} color={isSearchVisible ? themeColor : "#374151"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addCircleBtn, { backgroundColor: themeColor }]}
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
              placeholder={
                categoryType === "hotel"
                  ? "Cari tipe kamar hotel (Deluxe, Suite, dll)..."
                  : categoryType === "wisata"
                  ? "Cari kategori tiket wisata..."
                  : "Cari nomor kamar atau tipe..."
              }
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* 3 Summary Cards */}
        <View style={styles.summaryRow}>
          {/* Card 1 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              {categoryType === "hotel" ? "Tipe Kamar" : categoryType === "wisata" ? "Kategori Tiket" : "Total Kamar"}
            </Text>
            <Text style={styles.summaryVal}>{totalItemCount}</Text>
            <Text style={styles.summarySubtext}>
              {categoryType === "hotel" ? "Unit tersedia" : categoryType === "wisata" ? "Paket aktif" : "Semua kamar"}
            </Text>
          </View>

          {/* Card 2 */}
          <View style={styles.summaryCard}>
            <View style={styles.labelWithDot}>
              <Text style={styles.summaryLabel}>
                {categoryType === "hotel" ? "Tersedia" : categoryType === "wisata" ? "Tiket Aktif" : "Terisi"}
              </Text>
              <View style={[styles.greenDot, { backgroundColor: themeColor }]} />
            </View>
            <Text style={styles.summaryVal}>{categoryType === "kost" ? occupiedCount : activeCount}</Text>
            <Text style={styles.summarySubtext}>
              {totalItemCount > 0
                ? `${Math.round(((categoryType === "kost" ? occupiedCount : activeCount) / totalItemCount) * 100)}%`
                : "0%"}
            </Text>
          </View>

          {/* Card 3 */}
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: "#EA580C" }]}>
              {categoryType === "hotel" ? "Penuh" : categoryType === "wisata" ? "Operasional" : "Kosong"}
            </Text>
            <Text style={[styles.summaryVal, { color: "#EA580C" }]}>
              {categoryType === "wisata" ? "08-17 WIB" : categoryType === "hotel" ? occupiedCount : totalItemCount - occupiedCount}
            </Text>
            <Text style={[styles.summarySubtext, { color: "#EA580C" }]}>
              {categoryType === "wisata" ? "Setiap hari" : "Siap dipesan"}
            </Text>
          </View>
        </View>

        {/* Quick Action Card (Fasilitas & Tata Tertib) */}
        <TouchableOpacity
          style={[styles.propertyConfigCard, { backgroundColor: themeBgLight, borderColor: themeBorderLight }]}
          onPress={() => {
            if (categoryType === "wisata") {
              setPropertyActiveTab("peraturan");
            }
            setIsPropertyModalOpen(true);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.propertyConfigLeft}>
            <View style={[styles.propertyConfigIconBg, { backgroundColor: "#FFFFFF" }]}>
              {categoryType === "wisata" ? (
                <Clock size={20} color={themeColor} />
              ) : (
                <SlidersHorizontal size={20} color={themeColor} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <Text style={[styles.propertyConfigTitle, { color: themeColor }]}>
                  {categoryType === "hotel"
                    ? "Fasilitas Hotel & Kebijakan Reservasi"
                    : categoryType === "wisata"
                    ? "Jam Operasional & Tata Tertib Wisata"
                    : "Fasilitas Bersama & Peraturan Kos"}
                </Text>
                <View style={[styles.propertyBadgeAll, { backgroundColor: themeColor }]}>
                  <Text style={styles.propertyBadgeAllText}>Semua Unit</Text>
                </View>
              </View>
              <Text style={[styles.propertyConfigSub, { color: "#4B5563" }]} numberOfLines={1}>
                {categoryType === "wisata"
                  ? `${propertyRules.length} Tata Tertib & Jam Buka`
                  : `${sharedFacilities.length} Fasilitas • ${propertyRules.length} Peraturan`}
              </Text>
            </View>
          </View>
          <View style={[styles.propertyConfigArrow, { backgroundColor: "#FFFFFF" }]}>
            <ChevronRight size={18} color={themeColor} />
          </View>
        </TouchableOpacity>

        {/* Active Tab Indicator Bar */}
        <View style={[styles.activeTabIndicator, { backgroundColor: themeColor }]} />

        {/* Room List or Empty State */}
        {rooms.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={[styles.emptyIconCircle, { backgroundColor: themeBgLight }]}>
              {categoryType === "hotel" ? (
                <Hotel size={32} color={themeColor} />
              ) : categoryType === "wisata" ? (
                <Ticket size={32} color={themeColor} />
              ) : (
                <Home size={32} color={themeColor} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {categoryType === "hotel"
                ? "Belum Ada Tipe Kamar Hotel"
                : categoryType === "wisata"
                ? "Belum Ada Kategori Tiket Wisata"
                : "Belum Ada Kamar Terdaftar"}
            </Text>
            <Text style={styles.emptySub}>
              {categoryType === "hotel"
                ? "Tambahkan tipe kamar (Deluxe, Suite, Villa) beserta harga per malam dan fasilitas kamar agar tamu bisa melakukan reservasi online."
                : categoryType === "wisata"
                ? "Tambahkan kategori tiket masuk (Reguler, VIP, Terusan) beserta harga dan wahana yang termasuk agar pengunjung bisa beli tiket online."
                : "Mulai tambahkan kamar kos Anda (nomor kamar, harga bulanan, fasilitas, dan foto) agar calon penyewa bisa memesan."}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: themeColor }]}
              onPress={handleOpenAddModal}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>
                {categoryType === "hotel"
                  ? "Tambah Tipe Kamar Pertama"
                  : categoryType === "wisata"
                  ? "Tambah Tiket Pertama"
                  : "Tambah Kamar Pertama"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.roomList}>
            {filteredRooms.map((room) => {
              const displayName = room.roomName || room.ticketName || room.name || "Unit";
              const rawFacs = Array.isArray(room.facilities) ? room.facilities : [];
              const mainFacs = rawFacs.slice(0, 3);
              const extraCount = rawFacs.length - 3;

              return (
                <View
                  key={room.id}
                  style={[styles.roomCard, (room.isNonaktif || room.status === "nonaktif") && styles.roomCardNonaktif]}
                >
                  {/* Image with Badge */}
                  <View style={styles.roomImgContainer}>
                    <Image source={{ uri: room.image }} style={styles.roomImg} resizeMode="cover" />
                    <View
                      style={[
                        styles.statusBadge,
                        room.status === "terisi"
                          ? styles.statusBadgeOrange
                          : room.status === "nonaktif" || room.isNonaktif
                          ? styles.statusBadgeGray
                          : styles.statusBadgeGreen,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          room.status === "terisi"
                            ? styles.statusTextOrange
                            : room.status === "nonaktif" || room.isNonaktif
                            ? styles.statusTextGray
                            : styles.statusTextGreen,
                        ]}
                      >
                        {categoryType === "hotel"
                          ? room.status === "terisi"
                            ? "Penuh"
                            : "Tersedia"
                          : categoryType === "wisata"
                          ? "Aktif"
                          : room.status === "terisi"
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
                        <Text style={styles.roomTitle} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <View style={[styles.typeBadge, { backgroundColor: themeBgLight }]}>
                          <Text style={[styles.typeBadgeText, { color: themeColor }]}>
                            {categoryType === "hotel"
                              ? room.bedType || "King Bed"
                              : categoryType === "wisata"
                              ? (room.ticketType || "Reguler").toUpperCase()
                              : room.type}
                          </Text>
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

                    {/* Breakfast / Capacity Badge (Hotel) */}
                    {categoryType === "hotel" && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 2 }}>
                        <View style={styles.miniMetaChip}>
                          <Users size={11} color="#4B5563" />
                          <Text style={styles.miniMetaText}>{room.capacity || 2} Tamu</Text>
                        </View>
                        {room.breakfastIncluded !== false && (
                          <View style={[styles.miniMetaChip, { backgroundColor: "#FEF3C7" }]}>
                            <Utensils size={11} color="#D97706" />
                            <Text style={[styles.miniMetaText, { color: "#B45309", fontWeight: "700" }]}>
                              Sarapan Gratis
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Facilities Chips Row */}
                    <View style={styles.facilitiesRow}>
                      {mainFacs.map((fac, idx) => (
                        <View key={idx} style={styles.facChip}>
                          {fac.includes("AC") ? (
                            <Snowflake size={11} color={themeColor} />
                          ) : fac.includes("WiFi") ? (
                            <Wifi size={11} color={themeColor} />
                          ) : fac.includes("KM") || fac.includes("Bath") ? (
                            <ShowerHead size={11} color={themeColor} />
                          ) : fac.includes("Sarapan") ? (
                            <Utensils size={11} color={themeColor} />
                          ) : fac.includes("Foto") ? (
                            <Camera size={11} color={themeColor} />
                          ) : (
                            <Check size={11} color={themeColor} />
                          )}
                          <Text style={styles.facText}>{fac}</Text>
                        </View>
                      ))}
                      {extraCount > 0 && (
                        <View style={styles.facChipMore}>
                          <Text style={styles.facTextMore}>+{extraCount}</Text>
                        </View>
                      )}
                    </View>

                    {/* Tenant / Available & Price Footer Row */}
                    <View style={styles.roomFooterRow}>
                      {categoryType === "kost" && room.status === "terisi" && room.tenant ? (
                        <View style={styles.tenantRow}>
                          <Image source={{ uri: room.tenant.avatar }} style={styles.tenantAvatar} />
                          <View style={{ maxWidth: 75 }}>
                            <Text style={styles.tenantName} numberOfLines={1}>
                              {room.tenant.name}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.availableRow}>
                          {categoryType === "hotel" ? (
                            <Hotel size={13} color={themeColor} />
                          ) : categoryType === "wisata" ? (
                            <Ticket size={13} color={themeColor} />
                          ) : (
                            <Building2 size={13} color={themeColor} />
                          )}
                          <Text style={[styles.availableText, { color: themeColor }]}>
                            {categoryType === "hotel"
                              ? "Siap Huni"
                              : categoryType === "wisata"
                              ? "E-Ticket Ready"
                              : "Siap Huni"}
                          </Text>
                        </View>
                      )}

                      <View style={styles.priceRow}>
                        <Text style={[styles.priceVal, { color: themeColor }]}>{room.price}</Text>
                        <Text style={styles.priceUnit}>
                          {categoryType === "hotel" ? "/mlm" : categoryType === "wisata" ? "/org" : "/bln"}
                        </Text>
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
        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_kos_home")} activeOpacity={0.7}>
          <Home size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => setActiveNavTab("kamar")} activeOpacity={0.7}>
          {categoryType === "hotel" ? (
            <Hotel size={22} color={themeColor} />
          ) : categoryType === "wisata" ? (
            <Ticket size={22} color={themeColor} />
          ) : (
            <Building2 size={22} color={themeColor} />
          )}
          <Text style={[styles.navText, { color: themeColor, fontWeight: "700" }]}>
            {categoryType === "hotel" ? "Kamar" : categoryType === "wisata" ? "Tiket" : "Kamar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_manajemen_penghuni")}
          activeOpacity={0.7}
        >
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>
            {categoryType === "hotel" ? "Tamu" : categoryType === "wisata" ? "Pengunjung" : "Penghuni"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigate("pemilik_kos_laporan_keuangan")}
          activeOpacity={0.7}
        >
          <Wallet size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Keuangan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => navigate("pemilik_kos_profil")} activeOpacity={0.7}>
          <User size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Tambah / Edit Room Modal (3-Step Flow) */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "edit"
                  ? `Edit ${categoryType === "hotel" ? "Tipe Kamar" : categoryType === "wisata" ? "Tiket" : "Kamar"}`
                  : `Tambah ${
                      categoryType === "hotel"
                        ? "Tipe Kamar Hotel"
                        : categoryType === "wisata"
                        ? "Kategori Tiket Wisata"
                        : "Kamar Baru"
                    }`}
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
              <View style={[styles.stepCircle, addStep >= 1 && { backgroundColor: themeColor }]}>
                <Text style={[styles.stepNum, addStep >= 1 && styles.stepNumActive]}>1</Text>
              </View>
              <View style={[styles.stepLine, addStep >= 2 && { backgroundColor: themeColor }]} />

              <View style={[styles.stepCircle, addStep >= 2 && { backgroundColor: themeColor }]}>
                <Text style={[styles.stepNum, addStep >= 2 && styles.stepNumActive]}>2</Text>
              </View>
              <View style={[styles.stepLine, addStep >= 3 && { backgroundColor: themeColor }]} />

              <View style={[styles.stepCircle, addStep >= 3 && { backgroundColor: themeColor }]}>
                <Text style={[styles.stepNum, addStep >= 3 && styles.stepNumActive]}>3</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* STEP 1: Informasi Dasar */}
              {addStep === 1 && (
                <View>
                  <Text style={styles.stepTitle}>Informasi Dasar</Text>

                  {categoryType === "hotel" ? (
                    <>
                      <Text style={styles.label}>
                        Nama Tipe Kamar / Villa <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={namaTipeKamar}
                        onChangeText={setNamaTipeKamar}
                        placeholder="Contoh: Deluxe Double Room / Executive Villa"
                        placeholderTextColor="#9CA3AF"
                      />

                      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>
                            Tipe Kasur <Text style={styles.redAsterisk}>*</Text>
                          </Text>
                          <TextInput
                            style={styles.input}
                            value={tipeKasur}
                            onChangeText={setTipeKasur}
                            placeholder="1 King Bed / 2 Twin Bed"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>
                            Kapasitas Tamu <Text style={styles.redAsterisk}>*</Text>
                          </Text>
                          <TextInput
                            style={styles.input}
                            value={kapasitasTamu}
                            onChangeText={setKapasitasTamu}
                            keyboardType="numeric"
                            placeholder="2"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>

                      {/* Breakfast Toggle */}
                      <TouchableOpacity
                        style={[
                          styles.toggleOptionCard,
                          termasukSarapan && { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
                        ]}
                        onPress={() => setTermasukSarapan(!termasukSarapan)}
                        activeOpacity={0.8}
                      >
                        <Utensils size={18} color={termasukSarapan ? "#D97706" : "#6B7280"} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.toggleOptionTitle, termasukSarapan && { color: "#92400E" }]}>
                            {termasukSarapan ? "Termasuk Sarapan Gratis" : "Tanpa Sarapan (Room Only)"}
                          </Text>
                          <Text style={styles.toggleOptionSub}>Klik untuk mengubah paket sarapan</Text>
                        </View>
                        <View style={[styles.checkCircleSmall, termasukSarapan && { backgroundColor: "#D97706" }]}>
                          {termasukSarapan && <Check size={12} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>

                      <Text style={styles.label}>
                        Harga Sewa / Malam <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={hargaSewa}
                        onChangeText={setHargaSewa}
                        placeholder="Rp 450.000"
                        placeholderTextColor="#9CA3AF"
                      />
                    </>
                  ) : categoryType === "wisata" ? (
                    <>
                      <Text style={styles.label}>
                        Nama Tiket / Paket Wisata <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={namaTiket}
                        onChangeText={setNamaTiket}
                        placeholder="Contoh: Tiket Masuk Reguler / Paket All-In Waterpark"
                        placeholderTextColor="#9CA3AF"
                      />

                      <Text style={styles.label}>
                        Kategori Tiket <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <View style={styles.ticketTypeGrid}>
                        {(["reguler", "vip", "terusan", "anak", "rombongan"] as const).map((tier) => (
                          <TouchableOpacity
                            key={tier}
                            style={[
                              styles.ticketTypeChip,
                              kategoriTiket === tier && {
                                backgroundColor: themeBgLight,
                                borderColor: themeColor,
                              },
                            ]}
                            onPress={() => setKategoriTiket(tier)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.ticketTypeChipText,
                                kategoriTiket === tier && { color: themeColor, fontWeight: "800" },
                              ]}
                            >
                              {tier.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.label}>
                        Harga Tiket / Orang <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={hargaSewa}
                        onChangeText={setHargaSewa}
                        placeholder="Rp 25.000"
                        placeholderTextColor="#9CA3AF"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>
                        Nomor Kamar <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={nomorKamar}
                        onChangeText={setNomorKamar}
                        placeholder="1A / 101"
                        placeholderTextColor="#9CA3AF"
                      />

                      <Text style={styles.label}>
                        Tipe Kamar <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={tipeKamar}
                        onChangeText={setTipeKamar}
                        placeholder="Tipe AC / Standard"
                        placeholderTextColor="#9CA3AF"
                      />

                      <Text style={styles.label}>
                        Harga Sewa / Bulan <Text style={styles.redAsterisk}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={hargaSewa}
                        onChangeText={setHargaSewa}
                        placeholder="Rp 1.200.000"
                        placeholderTextColor="#9CA3AF"
                      />
                    </>
                  )}

                  <Text style={styles.label}>Deskripsi (Opsional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={deskripsi}
                    onChangeText={setDeskripsi}
                    placeholder={
                      categoryType === "hotel"
                        ? "Deskripsikan keunggulan kamar, pemandangan, dan kenyamanan tempat tidur..."
                        : categoryType === "wisata"
                        ? "Deskripsikan wahana dan fasilitas yang termasuk dalam tiket ini..."
                        : "Kamar nyaman dan bersih, cocok untuk mahasiswa atau pekerja."
                    }
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />

                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: themeColor }]}
                    onPress={() => setAddStep(2)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>Lanjut ke Fasilitas & Foto</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: Fasilitas & Foto */}
              {addStep === 2 && (
                <View>
                  <Text style={styles.stepTitle}>
                    {categoryType === "wisata" ? "Wahana & Akses Termasuk" : "Fasilitas Kamar"}
                  </Text>
                  <Text style={styles.stepSubtitle}>
                    {categoryType === "wisata"
                      ? "Pilih wahana dan akses fasilitas yang didapat dari tiket ini"
                      : "Pilih fasilitas kamar yang tersedia untuk tipe ini"}
                  </Text>

                  {/* Multi-select Chips */}
                  <View style={styles.facilityChipsGrid}>
                    {currentFacilityOptions.map((item, idx) => {
                      const IconComp = item.icon;
                      const isSelected = selectedFacilities.includes(item.label);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.facilityChip,
                            isSelected && { borderColor: themeColor, backgroundColor: themeBgLight },
                          ]}
                          onPress={() => toggleFacility(item.label)}
                          activeOpacity={0.7}
                        >
                          <IconComp size={14} color={isSelected ? themeColor : "#4B5563"} />
                          <Text style={[styles.facilityChipText, isSelected && { color: themeColor, fontWeight: "700" }]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 24,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={styles.stepTitle}>
                      {categoryType === "wisata" ? "Foto Wahana / Tiket" : "Foto Kamar"}
                    </Text>
                    <View style={[styles.countBadge, roomPhotos.length >= 5 && { backgroundColor: "#FEE2E2" }]}>
                      <Text style={[styles.countBadgeText, roomPhotos.length >= 5 && { color: "#DC2626" }]}>
                        {roomPhotos.length}/5 Foto
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stepSubtitle}>Tambahkan foto terbaik (Maksimal 5 foto)</Text>

                  {/* Uploaded Photos Grid */}
                  {roomPhotos.length > 0 && (
                    <View style={styles.photoGridContainer}>
                      {roomPhotos.map((photoUri, index) => (
                        <View key={index} style={styles.photoThumbWrapper}>
                          <Image source={{ uri: photoUri }} style={styles.photoThumbImg} />
                          {index === 0 && (
                            <View style={[styles.photoMainBadge, { backgroundColor: themeColor }]}>
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
                          <ActivityIndicator size="small" color={themeColor} />
                          <Text style={[styles.uploadPhotoText, { color: themeColor }]}>Mengunggah foto...</Text>
                        </View>
                      ) : (
                        <View style={{ alignItems: "center", gap: 4, paddingVertical: 4 }}>
                          <Plus size={24} color={themeColor} />
                          <Text style={[styles.uploadPhotoText, { color: themeColor }]}>
                            Tambah Foto ({5 - roomPhotos.length} tersisa)
                          </Text>
                          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Format JPG, PNG (Maks 10MB)</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.maxPhotoReachedBanner, { backgroundColor: themeBgLight, borderColor: themeBorderLight }]}>
                      <CheckCircle size={16} color={themeColor} />
                      <Text style={[styles.maxPhotoReachedText, { color: themeColor }]}>
                        Maksimal 5 foto telah dipilih
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: themeColor, marginTop: 28 }]}
                    onPress={() => setAddStep(3)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>Lanjut ke Ringkasan</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Ringkasan & Status */}
              {addStep === 3 && (
                <View>
                  <Text style={styles.stepTitle}>Ringkasan</Text>
                  <Text style={styles.stepSubtitle}>Periksa kembali informasi sebelum disimpan</Text>

                  {/* Summary Card Box */}
                  <View style={styles.summaryPreviewBox}>
                    <View style={styles.previewHeaderRow}>
                      <View style={styles.previewImgBox}>
                        {roomPhotos.length > 0 ? (
                          <Image
                            source={{ uri: roomPhotos[0] }}
                            style={{ width: "100%", height: "100%", borderRadius: 12 }}
                          />
                        ) : categoryType === "hotel" ? (
                          <Hotel size={24} color="#9CA3AF" />
                        ) : categoryType === "wisata" ? (
                          <Ticket size={24} color="#9CA3AF" />
                        ) : (
                          <Building2 size={24} color="#9CA3AF" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.previewRoomTitle} numberOfLines={1}>
                            {categoryType === "hotel"
                              ? namaTipeKamar
                              : categoryType === "wisata"
                              ? namaTiket
                              : nomorKamar}
                          </Text>
                          <View style={[styles.typeBadge, { backgroundColor: themeBgLight }]}>
                            <Text style={[styles.typeBadgeText, { color: themeColor }]}>
                              {categoryType === "hotel"
                                ? tipeKasur
                                : categoryType === "wisata"
                                ? kategoriTiket.toUpperCase()
                                : tipeKamar}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.previewPriceText, { color: themeColor }]}>
                          {hargaSewa}{" "}
                          <Text style={{ fontSize: 11, color: "#6B7280" }}>
                            {categoryType === "hotel" ? "/ malam" : categoryType === "wisata" ? "/ org" : "/ bulan"}
                          </Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.previewDivider} />

                    <View style={styles.previewDetailRow}>
                      <Text style={styles.previewDetailLabel}>
                        {categoryType === "wisata" ? "Wahana Termasuk" : "Fasilitas"}
                      </Text>
                      <Text style={styles.previewDetailVal}>{selectedFacilities.join(", ") || "-"}</Text>
                    </View>
                    <View style={styles.previewDetailRow}>
                      <Text style={styles.previewDetailLabel}>Foto Galeri</Text>
                      <Text style={styles.previewDetailVal}>{roomPhotos.length} foto terpilih</Text>
                    </View>
                    {categoryType === "hotel" && (
                      <View style={styles.previewDetailRow}>
                        <Text style={styles.previewDetailLabel}>Kapasitas & Sarapan</Text>
                        <Text style={styles.previewDetailVal}>
                          {kapasitasTamu} Tamu • {termasukSarapan ? "Termasuk Sarapan" : "Tanpa Sarapan"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.stepTitle, { marginTop: 24 }]}>Status Ketersediaan</Text>

                  {/* Status 1: Tersedia */}
                  <TouchableOpacity
                    style={[
                      styles.statusSelectCard,
                      kamarStatus === "tersedia" && { borderColor: themeColor, backgroundColor: themeBgLight },
                    ]}
                    onPress={() => setKamarStatus("tersedia")}
                    activeOpacity={0.8}
                  >
                    <CheckCircle size={20} color={kamarStatus === "tersedia" ? themeColor : "#D1D5DB"} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.statusSelectTitle, kamarStatus === "tersedia" && { color: themeColor }]}>
                        {categoryType === "wisata" ? "Aktif & Dijual Online" : "Tersedia untuk Dipesan"}
                      </Text>
                      <Text style={styles.statusSelectSub}>
                        {categoryType === "wisata"
                          ? "Tiket tampil di katalog dan bisa dibeli langsung"
                          : "Tampil di katalog dan siap dipesan calon tamu"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Status 2: Tidak Tersedia */}
                  <TouchableOpacity
                    style={[
                      styles.statusSelectCard,
                      kamarStatus === "tidak_tersedia" && { borderColor: "#6B7280", backgroundColor: "#F3F4F6" },
                    ]}
                    onPress={() => setKamarStatus("tidak_tersedia")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.radioOuter}>
                      {kamarStatus === "tidak_tersedia" && (
                        <View style={[styles.radioInner, { backgroundColor: "#6B7280" }]} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.statusSelectTitle}>
                        {categoryType === "wisata" ? "Nonaktif / Habis" : "Tidak Tersedia / Penuh"}
                      </Text>
                      <Text style={styles.statusSelectSub}>Sembunyikan sementara dari pencarian</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: themeColor, marginTop: 28 },
                      isSavingRoom && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveRoom}
                    disabled={isSavingRoom}
                    activeOpacity={0.85}
                  >
                    {isSavingRoom ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>
                        {modalMode === "edit"
                          ? "Simpan Perubahan"
                          : `Simpan ${
                              categoryType === "hotel" ? "Kamar" : categoryType === "wisata" ? "Tiket" : "Kamar"
                            }`}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Options Menu (Bottom Sheet) */}
      <Modal visible={selectedRoomForOptions !== null} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setSelectedRoomForOptions(null)}
        >
          <View style={styles.bottomSheetCard} onStartShouldSetResponder={() => true}>
            <View style={styles.dragHandle} />

            <Text style={styles.optionsTitle}>
              Opsi{" "}
              {selectedRoomForOptions?.roomName ||
                selectedRoomForOptions?.ticketName ||
                selectedRoomForOptions?.name}
            </Text>
            <Text style={styles.optionsSubtitle}>
              {selectedRoomForOptions?.type} • {selectedRoomForOptions?.price}
            </Text>

            <View style={styles.optionsList}>
              {/* 1. Edit */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) handleOpenEditModal(selectedRoomForOptions);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: themeBgLight }]}>
                  <Pencil size={18} color={themeColor} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Edit Data</Text>
                  <Text style={styles.optionItemSub}>Ubah harga, fasilitas, atau status ketersediaan</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 2. Duplikat */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) handleDuplicateRoom(selectedRoomForOptions);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: themeBgLight }]}>
                  <Copy size={18} color={themeColor} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Duplikat</Text>
                  <Text style={styles.optionItemSub}>Salin sebagai unit/tiket baru</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 3. Nonaktifkan */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) handleToggleNonaktifRoom(selectedRoomForOptions);
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
                    {selectedRoomForOptions?.isNonaktif ? "Aktifkan Kembali" : "Sembunyikan / Nonaktifkan"}
                  </Text>
                  <Text style={styles.optionItemSub}>
                    {selectedRoomForOptions?.isNonaktif
                      ? "Tampilkan kembali di pencarian customer"
                      : "Sembunyikan dari katalog sementara"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 4. Hapus */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (selectedRoomForOptions) handleDeleteRoom(selectedRoomForOptions);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBg, { backgroundColor: "#FEE2E2" }]}>
                  <Trash2 size={18} color="#EF4444" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionItemTitle}>Hapus Permanen</Text>
                  <Text style={styles.optionItemSub}>Hapus data dari database</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnCancel} onPress={() => setSelectedRoomForOptions(null)} activeOpacity={0.8}>
              <Text style={styles.btnCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 3: Property Configuration Modal (Fasilitas Properti & Tata Tertib) */}
      <Modal visible={isPropertyModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.propertyModalSheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <Text style={styles.sheetTitle}>
                    {categoryType === "hotel"
                      ? "Fasilitas Hotel & Kebijakan"
                      : categoryType === "wisata"
                      ? "Jam Buka & Tata Tertib Wisata"
                      : "Fasilitas Bersama & Peraturan Kos"}
                  </Text>
                  <View style={[styles.propertyBadgeAll, { backgroundColor: themeColor }]}>
                    <Text style={styles.propertyBadgeAllText}>Semua Unit</Text>
                  </View>
                </View>
                <Text style={styles.sheetSub}>
                  {categoryType === "hotel"
                    ? "Atur fasilitas umum resort/hotel serta kebijakan check-in/out."
                    : categoryType === "wisata"
                    ? "Atur jam buka operasional, tata tertib pengunjung, dan deskripsi kawasan wisata."
                    : "Atur fasilitas bersama dan peraturan kos yang berlaku untuk seluruh kamar."}
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
              {categoryType !== "wisata" && (
                <TouchableOpacity
                  style={[
                    styles.propSegmentBtn,
                    propertyActiveTab === "fasilitas" && { backgroundColor: themeColor },
                  ]}
                  onPress={() => setPropertyActiveTab("fasilitas")}
                  activeOpacity={0.8}
                >
                  <SlidersHorizontal
                    size={13}
                    color={propertyActiveTab === "fasilitas" ? "#FFFFFF" : themeColor}
                  />
                  <Text
                    style={[
                      styles.propSegmentText,
                      propertyActiveTab === "fasilitas" && styles.propSegmentTextActive,
                    ]}
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
              )}

              <TouchableOpacity
                style={[
                  styles.propSegmentBtn,
                  propertyActiveTab === "peraturan" && { backgroundColor: themeColor },
                ]}
                onPress={() => setPropertyActiveTab("peraturan")}
                activeOpacity={0.8}
              >
                <ShieldCheck
                  size={13}
                  color={propertyActiveTab === "peraturan" ? "#FFFFFF" : themeColor}
                />
                <Text
                  style={[
                    styles.propSegmentText,
                    propertyActiveTab === "peraturan" && styles.propSegmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {categoryType === "wisata" ? "Tata Tertib & Jam Buka" : "Kebijakan"}
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
                style={[
                  styles.propSegmentBtn,
                  propertyActiveTab === "deskripsi" && { backgroundColor: themeColor },
                ]}
                onPress={() => setPropertyActiveTab("deskripsi")}
                activeOpacity={0.8}
              >
                <FileText
                  size={13}
                  color={propertyActiveTab === "deskripsi" ? "#FFFFFF" : themeColor}
                />
                <Text
                  style={[
                    styles.propSegmentText,
                    propertyActiveTab === "deskripsi" && styles.propSegmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Deskripsi
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
            >
              {propertyActiveTab === "fasilitas" && (
                <View style={{ gap: 14 }}>
                  <Text style={styles.propSectionHint}>
                    {categoryType === "hotel"
                      ? "Pilih fasilitas umum hotel/resort yang dapat dinikmati seluruh tamu:"
                      : categoryType === "wisata"
                      ? "Pilih fasilitas yang tersedia di area kawasan rekreasi:"
                      : "Pilih fasilitas umum yang dapat digunakan bersama oleh semua penghuni kos:"}
                  </Text>

                  {/* Preset Facilities Grid */}
                  <View style={styles.propChipGrid}>
                    {presetSharedFacilities.map((fac, idx) => {
                      const isSelected = sharedFacilities.includes(fac.label);
                      const IconComp = fac.icon;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.propChip,
                            isSelected && { backgroundColor: themeBgLight, borderColor: themeColor },
                          ]}
                          onPress={() => handleToggleSharedFacility(fac.label)}
                          activeOpacity={0.8}
                        >
                          <IconComp size={16} color={isSelected ? themeColor : "#6B7280"} />
                          <Text style={[styles.propChipText, isSelected && { color: themeColor, fontWeight: "700" }]}>
                            {fac.label}
                          </Text>
                          {isSelected && <Check size={14} color={themeColor} />}
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
                      placeholder="Tambah fasilitas lainnya..."
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={[styles.customAddBtn, { backgroundColor: themeColor }]}
                      onPress={handleAddCustomFacility}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.customAddBtnText}>Tambah</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {propertyActiveTab === "peraturan" && (
                <View style={{ gap: 14 }}>
                  <Text style={styles.propSectionHint}>
                    {categoryType === "hotel"
                      ? "Pilih kebijakan reservasi dan kenyamanan tamu hotel:"
                      : categoryType === "wisata"
                      ? "Pilih jam buka dan tata tertib pengunjung wisata:"
                      : "Pilih peraturan kos yang berlaku untuk menjaga ketertiban bersama:"}
                  </Text>

                  {/* Preset Rules Grid */}
                  <View style={{ gap: 8 }}>
                    {presetRules.map((rule, idx) => {
                      const isSelected = propertyRules.includes(rule);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.rulePresetChip,
                            isSelected && { backgroundColor: themeBgLight, borderColor: themeColor },
                          ]}
                          onPress={() => handleToggleRule(rule)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                            <CheckCircle size={16} color={isSelected ? themeColor : "#D1D5DB"} />
                            <Text
                              style={[
                                styles.rulePresetChipText,
                                isSelected && { color: themeColor, fontWeight: "700" },
                              ]}
                            >
                              {rule}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Rule Input */}
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customInputBox}
                      value={customRuleInput}
                      onChangeText={setCustomRuleInput}
                      placeholder="Tambah tata tertib lainnya..."
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={[styles.customAddBtn, { backgroundColor: themeColor }]}
                      onPress={handleAddCustomRule}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.customAddBtnText}>Tambah</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {propertyActiveTab === "deskripsi" && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.propSectionHint}>
                    Deskripsi keseluruhan properti yang tampil di halaman detail customer:
                  </Text>
                  <TextInput
                    style={styles.descInputBox}
                    value={propertyDescription}
                    onChangeText={setPropertyDescription}
                    placeholder="Tulis deskripsi keunggulan, kenyamanan, dan daya tarik lokasi Anda..."
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
                style={[styles.btnSaveProperty, { backgroundColor: themeColor }]}
                onPress={handleSavePropertyDetails}
                disabled={isSavingProperty}
                activeOpacity={0.85}
              >
                {isSavingProperty ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={styles.btnSavePropertyText}>Simpan Pengaturan Properti</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
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
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  categoryPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 4,
    textAlign: "center",
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
  },
  summaryVal: {
    fontSize: 20,
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
    width: 80,
    borderRadius: 2,
    marginBottom: 20,
  },
  propertyConfigCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
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
    alignItems: "center",
    justifyContent: "center",
  },
  propertyConfigTitle: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  propertyBadgeAll: {
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
    fontWeight: "500",
  },
  propertyConfigArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyStateCard: {
    alignItems: "center",
    paddingVertical: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  emptyAddBtn: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
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
  roomCardNonaktif: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "center",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  miniMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniMetaText: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "600",
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
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: "900",
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
  toggleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
  },
  toggleOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  toggleOptionSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  checkCircleSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ticketTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  ticketTypeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  btnPrimary: {
    height: 50,
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
  facilityChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
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
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  previewPriceText: {
    fontSize: 14,
    fontWeight: "800",
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  maxPhotoReachedText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // Property Sheet Modal
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
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
  propChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
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
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
  },
  customAddBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rulePresetChip: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rulePresetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    lineHeight: 18,
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
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  btnSavePropertyText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
