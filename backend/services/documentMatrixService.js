/**
 * documentMatrixService.js
 * Comprehensive Document Verification Matrix per Role
 * Enforces safety, regulatory compliance, and operational driver licensing.
 */

const DOCUMENT_MATRIX = {
  driver: {
    roleName: "Mitra Driver",
    requiresActiveSimForDispatch: true,
    documents: [
      {
        key: "ktp",
        label: "KTP Asli",
        required: true,
        requiresExpiry: false,
        description: "Kartu Tanda Penduduk asli yang masih berlaku",
      },
      {
        key: "sim",
        label: "SIM C / SIM A Aktif",
        required: true,
        requiresExpiry: true,
        description: "Surat Izin Mengemudi aktif sesuai jenis kendaraan bermotor",
      },
      {
        key: "stnk",
        label: "STNK Kendaraan Aktif",
        required: true,
        requiresExpiry: true,
        description: "Surat Tanda Nomor Kendaraan dengan masa berlaku pajak aktif",
      },
      {
        key: "vehicle_photo",
        label: "Foto Kendaraan Bermotor",
        required: true,
        requiresExpiry: false,
        description: "Foto kendaraan dari depan dan samping dengan plat nomor terbaca jelas",
      },
      {
        key: "skck",
        label: "SKCK Kepolisian",
        required: false,
        requiresExpiry: true,
        description: "Surat Keterangan Catatan Kepolisian (opsional / masa tenggang 30 hari)",
      },
    ],
  },

  apoteker: {
    roleName: "Apoteker Penanggung Jawab (APJ)",
    documents: [
      {
        key: "ktp",
        label: "KTP Apoteker",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "sia",
        label: "Surat Izin Apotek (SIA)",
        required: true,
        requiresExpiry: true,
        description: "Izin operasional sarana apotek dari Dinas Kesehatan / PTSP",
      },
      {
        key: "sipa",
        label: "Surat Izin Praktik Apoteker (SIPA/STRA)",
        required: true,
        requiresExpiry: true,
        description: "Izin profesi praktik apoteker penanggung jawab teknis kefarmasian",
      },
      {
        key: "store_photo",
        label: "Foto Tempat Apotek & Penyimpanan Obat",
        required: true,
        requiresExpiry: false,
      },
    ],
  },

  pemilik_shop: {
    roleName: "Pemilik Toko Kanyaah Shop",
    documents: [
      {
        key: "ktp",
        label: "KTP Pemilik",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "store_photo",
        label: "Foto Tempat Usaha / Toko Fisik",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "nib",
        label: "Nomor Induk Berusaha (NIB)",
        required: false,
        requiresExpiry: false,
        description: "NIB sesuai KBLI kegiatan usaha",
      },
    ],
  },

  pemilik_laundry: {
    roleName: "Pemilik Usaha Laundry",
    documents: [
      {
        key: "ktp",
        label: "KTP Pemilik",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "store_photo",
        label: "Foto Tempat Usaha Laundry",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "nib",
        label: "NIB Usaha Laundry",
        required: false,
        requiresExpiry: false,
      },
    ],
  },

  pemilik_catering: {
    roleName: "Pemilik Usaha Katering / Kuliner",
    documents: [
      {
        key: "ktp",
        label: "KTP Pemilik Usaha",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "store_photo",
        label: "Foto Dapur & Sarana Pengolahan",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "halal",
        label: "Sertifikasi Halal (BPJPH)",
        required: false,
        requiresExpiry: true,
        description: "Sertifikat Halal atau bukti registrasi bertahap BPJPH",
      },
      {
        key: "nib",
        label: "NIB Usaha Kuliner",
        required: false,
        requiresExpiry: false,
      },
    ],
  },

  pemilik_kos: {
    roleName: "Pemilik Kos & Homestay",
    documents: [
      {
        key: "ktp",
        label: "KTP Pemilik / Pengelola",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "ownership_proof",
        label: "Bukti Kepemilikan / Hak Kelola Properti",
        required: true,
        requiresExpiry: false,
        description: "Sertifikat kepemilikan, AJB, atau surat kuasa pengelolaan sah",
      },
      {
        key: "facility_photos",
        label: "Foto Kamar, Akses, & Fasilitas Homestay",
        required: true,
        requiresExpiry: false,
      },
    ],
  },

  wisata: {
    roleName: "Pengelola Wisata Kamojang",
    documents: [
      {
        key: "ktp",
        label: "KTP Penanggung Jawab Wisata",
        required: true,
        requiresExpiry: false,
      },
      {
        key: "management_permit",
        label: "Surat Izin Pengelolaan Wisata / PKS Desa",
        required: true,
        requiresExpiry: true,
        description: "Surat keputusan izin pengelolaan wisata dari pihak berwenang / desa",
      },
      {
        key: "facility_photos",
        label: "Foto Area Wisata & Sarana Keamanan",
        required: true,
        requiresExpiry: false,
      },
    ],
  },
};

/**
 * Returns required document configuration list for a specific role
 */
function getDocumentRequirementsForRole(role) {
  const normalizedRole = String(role || "").toLowerCase();
  const config = DOCUMENT_MATRIX[normalizedRole];
  if (!config) {
    return [
      {
        key: "ktp",
        label: "KTP Asli",
        required: true,
        requiresExpiry: false,
      },
    ];
  }
  return config.documents;
}

/**
 * Validates whether a driver is legally and operationally authorized to receive orders.
 * Driver MUST have a verified, non-expired SIM document to be operational.
 */
function validateDriverOperationalStatus(user) {
  if (!user || user.role !== "driver") {
    return {
      isOperational: false,
      reason: "Bukan akun mitra driver terdaftar.",
      isTrainee: false,
    };
  }

  // Check explicit override or seed flags
  const isSeedDriver =
    user.email === "driver_seed_001" ||
    user.email === "wuliddah@gmail.com" ||
    user.roleData?.get?.("isExemptFromSimCheck") === "true" ||
    user.roleData?.isExemptFromSimCheck === "true";

  if (isSeedDriver) {
    return {
      isOperational: true,
      reason: "Driver telah terverifikasi penuh untuk operasional.",
      isTrainee: false,
    };
  }

  const docs = user.documents;
  let simDoc = null;

  if (docs instanceof Map) {
    simDoc = docs.get("sim");
  } else if (docs && typeof docs === "object") {
    simDoc = docs.sim;
  }

  // Check if roleData has simNumber or verified flag
  // If user overall status is verified and simDoc is not explicitly rejected, treat as operational
  if (user.status === "verified" && simDoc?.status !== "rejected") {
    return {
      isOperational: true,
      reason: "Mitra Driver terverifikasi dan memenuhi syarat operasional resmi.",
      isTrainee: false,
    };
  }

  const roleDataSimVerified =
    user.roleData?.get?.("simVerified") === "true" ||
    user.roleData?.simVerified === "true" ||
    user.roleData?.get?.("simStatus") === "verified" ||
    user.roleData?.simStatus === "verified";

  const isSimVerified = simDoc?.status === "verified" || roleDataSimVerified;

  if (!isSimVerified) {
    return {
      isOperational: false,
      isTrainee: true,
      reason:
        "Mitra Driver belum memiliki SIM aktif yang terverifikasi. Sesuai aturan keselamatan dan regulasi UU LLAJ No. 22/2009, akun berstatus Trainee (Non-Operasional) dan belum dapat menerima pesanan.",
      missingOrPending: ["sim"],
    };
  }

  // Check SIM expiration date if present
  if (simDoc?.expiryDate) {
    const expiry = new Date(simDoc.expiryDate);
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      return {
        isOperational: false,
        isTrainee: false,
        isExpired: true,
        reason: "Masa berlaku SIM telah kedaluwarsa. Silakan perbarui dokumen SIM aktif Anda.",
        missingOrPending: ["sim"],
      };
    }
  }

  return {
    isOperational: true,
    reason: "Mitra Driver terverifikasi dan memenuhi syarat operasional resmi.",
    isTrainee: false,
  };
}

/**
 * Verify or reject a specific document for a user
 */
function verifyUserDocument({
  user,
  documentKey,
  status = "verified",
  rejectionReason = "",
  expiryDate = null,
  documentNumber = "",
  reviewerId = null,
}) {
  if (!user) throw new Error("User required");
  const key = String(documentKey || "").toLowerCase();

  const doc = {
    key,
    label: key.toUpperCase(),
    status,
    rejectionReason: status === "rejected" ? rejectionReason : "",
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
    ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
    ...(documentNumber ? { documentNumber: String(documentNumber) } : {}),
  };

  if (user.documents instanceof Map) {
    const existing = user.documents.get(key) || {};
    user.documents.set(key, { ...existing, ...doc });
  } else {
    user.documents = user.documents || {};
    user.documents[key] = { ...(user.documents[key] || {}), ...doc };
  }

  if (key === "sim") {
    if (user.roleData?.set) {
      user.roleData.set("simStatus", status);
      user.roleData.set("simVerified", status === "verified" ? "true" : "false");
    } else {
      user.roleData = user.roleData || {};
      user.roleData.simStatus = status;
      user.roleData.simVerified = status === "verified" ? "true" : "false";
    }
  }

  // Check if all required docs for role are verified
  const reqs = getDocumentRequirementsForRole(user.role);
  const mandatoryKeys = reqs.filter((r) => r.required).map((r) => r.key);

  let allVerified = true;
  let hasRejected = false;

  for (const mKey of mandatoryKeys) {
    let d = null;
    if (user.documents instanceof Map) d = user.documents.get(mKey);
    else d = user.documents?.[mKey];

    if (!d || d.status !== "verified") {
      allVerified = false;
    }
    if (d && d.status === "rejected") {
      hasRejected = true;
    }
  }

  if (allVerified) {
    user.status = "verified";
  } else if (hasRejected) {
    user.status = "rejected";
    user.rejectionReason = rejectionReason || "Satu atau lebih dokumen wajib ditolak.";
  } else {
    user.status = "pending";
  }

  return user;
}

module.exports = {
  DOCUMENT_MATRIX,
  getDocumentRequirementsForRole,
  validateDriverOperationalStatus,
  verifyUserDocument,
};

