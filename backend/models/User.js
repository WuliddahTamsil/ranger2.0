const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const documentSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  uri: { type: String, required: true }, // Google Drive URL / local URL
  fileId: { type: String }, // Google Drive file ID
  name: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  progress: { type: Number, default: 100 },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: [
        "admin",
        "customer",
        "driver",
        "pemilik_kos",
        "pemilik_laundry",
        "pemilik_marketplace",
        "pemilik_catering",
      ],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
    },
    passwordHash: {
      type: String,
    },
    googleLinked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: function () {
        return this.role === "customer" || this.role === "admin" ? "verified" : "pending";
      },
    },
    rejectionReason: {
      type: String,
    },
    roleData: {
      type: Map,
      of: String,
      default: {},
    },
    documents: {
      type: Map,
      of: documentSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
