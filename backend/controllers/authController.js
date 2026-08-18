const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "rangers_app_secret", {
    expiresIn: "30d",
  });
};

// Register
const registerUser = async (req, res) => {
  try {
    const { role, name, email, phone, address, profilePhoto, password, googleProfile, roleData, documents } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ success: false, message: "Nama, email, dan role wajib diisi" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar. Silakan login." });
    }

    let passwordHash = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const user = await User.create({
      role,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      profilePhoto: profilePhoto || googleProfile?.photo || "",
      passwordHash,
      googleLinked: Boolean(googleProfile),
      status: role === "customer" || role === "admin" ? "verified" : "pending",
      roleData: roleData || {},
      documents: documents || {},
    });

    return res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil",
      data: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
        status: user.status,
        roleData: user.roleData,
        documents: user.documents,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    return res.status(500).json({ success: false, message: "Gagal mendaftarkan akun", error: error.message });
  }
};

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password, googleProfile } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "Akun dengan email tersebut tidak ditemukan." });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: user.rejectionReason || "Pendaftaran akun Anda ditolak oleh Admin.",
      });
    }

    // Google Login check
    if (googleProfile) {
      return res.status(200).json({
        success: true,
        message: "Login berhasil dengan Google",
        data: {
          id: user._id,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          profilePhoto: user.profilePhoto,
          status: user.status,
          roleData: user.roleData,
          documents: user.documents,
          token: generateToken(user._id),
        },
      });
    }

    // Password check
    if (!password) {
      return res.status(400).json({ success: false, message: "Password wajib diisi." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Password salah. Silakan coba lagi." });
    }

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
        status: user.status,
        roleData: user.roleData,
        documents: user.documents,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ success: false, message: "Gagal login", error: error.message });
  }
};

// Admin: Get all mitra accounts
const getMitraAccounts = async (req, res) => {
  try {
    const { role, status } = req.query;
    const filter = { role: { $ne: "customer" } };

    if (role) filter.role = role;
    if (status) filter.status = status;

    const mitras = await User.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: mitras.length, data: mitras });
  } catch (error) {
    console.error("❌ Get mitra error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data mitra", error: error.message });
  }
};

// Admin: Update mitra status (verified/rejected)
const updateMitraStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Mitra tidak ditemukan." });
    }

    user.status = status;
    if (status === "rejected") {
      user.rejectionReason = rejectionReason || "Dokumen tidak memenuhi persyaratan.";
    } else {
      user.rejectionReason = undefined;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Status mitra berhasil diubah menjadi ${status}`,
      data: user,
    });
  } catch (error) {
    console.error("❌ Update mitra status error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengupdate status mitra", error: error.message });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil profil", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMitraAccounts,
  updateMitraStatus,
  getUserProfile,
};
